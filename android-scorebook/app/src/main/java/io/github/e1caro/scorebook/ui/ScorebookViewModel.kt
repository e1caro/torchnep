package io.github.e1caro.scorebook.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import io.github.e1caro.scorebook.ScorebookApp
import io.github.e1caro.scorebook.audio.AudioEngine
import io.github.e1caro.scorebook.audio.MidiInput
import io.github.e1caro.scorebook.audio.TfliteModel
import io.github.e1caro.scorebook.audio.WavWriter
import io.github.e1caro.scorebook.core.correct.AnalysisSettings
import io.github.e1caro.scorebook.core.correct.AutoTitle
import io.github.e1caro.scorebook.core.correct.Decision
import io.github.e1caro.scorebook.core.correct.NoteOverride
import io.github.e1caro.scorebook.core.correct.Transcriber
import io.github.e1caro.scorebook.core.correct.Transcription
import io.github.e1caro.scorebook.core.engrave.LiveNote
import io.github.e1caro.scorebook.core.library.Library
import io.github.e1caro.scorebook.core.library.Song
import io.github.e1caro.scorebook.core.library.TakeData
import io.github.e1caro.scorebook.core.library.TakeMeta
import io.github.e1caro.scorebook.core.live.AutoRecorder
import io.github.e1caro.scorebook.core.live.Decimator2
import io.github.e1caro.scorebook.core.live.LiveSession
import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.music.Mode
import io.github.e1caro.scorebook.core.score.Score
import io.github.e1caro.scorebook.core.score.ScoreBuilder
import io.github.e1caro.scorebook.core.transcribe.BasicPitchStream
import io.github.e1caro.scorebook.data.Exporter
import kotlinx.coroutines.Job
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers
import java.util.Calendar
import java.util.UUID
import java.util.concurrent.Executors
import kotlin.math.roundToInt

enum class ListenStatus { OFF, LISTENING, RECORDING, SAVING }

data class ListenUi(
    val status: ListenStatus = ListenStatus.OFF,
    val levelDb: Double = -90.0,
    val seconds: Double = 0.0,
    val notes: List<LiveNote> = emptyList(),
    val now: Double = 0.0,
    val key: Key = Key(0, Mode.MAJOR),
    val bpm: Int = 0,
    val midiDevice: String? = null,
    val micError: Boolean = false,
    val lastSaved: TakeMeta? = null,
    val lastSavedTitle: String? = null,
    val message: String? = null,
)

data class TakeUi(
    val songId: String,
    val takeId: String,
    val title: String,
    val favorite: Boolean,
    val data: TakeData,
    val transcription: Transcription,
    val score: Score,
    val takes: List<TakeMeta>,
    val selected: Int? = null,
    val busy: Boolean = false,
    val message: String? = null,
)

class ScorebookViewModel(app: Application) : AndroidViewModel(app) {
    private val sb = app as ScorebookApp
    private val repo = sb.repository
    private val prefs = sb.prefs
    val music = sb.music
    private val exporter: Exporter = sb.exporter

    private val _listen = MutableStateFlow(ListenUi())
    val listen: StateFlow<ListenUi> = _listen
    private val _library = MutableStateFlow(repo.library())
    val library: StateFlow<Library> = _library
    private val _take = MutableStateFlow<TakeUi?>(null)
    val take: StateFlow<TakeUi?> = _take

    // ------------------------------------------------------------------ listening
    private val worker = Executors.newSingleThreadExecutor { r -> Thread(r, "scorebook-worker") }
    private val workerDispatcher = worker.asCoroutineDispatcher()
    private val audio = AudioEngine { block, n -> val copy = block.copyOf(n); worker.execute { onAudio(copy) } }
    private val recorder = AutoRecorder(AudioEngine.SAMPLE_RATE, silenceSeconds = prefs.silenceSeconds.toDouble())
    private var decimator = Decimator2()
    private var model: TfliteModel? = null
    private var session: LiveSession? = null
    private var wav: WavWriter? = null
    private var takeId: String? = null
    private var takeStartNanos = 0L
    private var lastBlockNanos = 0L
    private var liveJob: Job? = null
    @Volatile private var midiName: String? = null

    private val midi = MidiInput(app,
        onNoteOn = { p, v -> worker.execute { midiNote(p, v) } },
        onNoteOff = { p -> worker.execute { session?.midi?.noteOff(p, midiNow()) } },
        onSustain = { d -> worker.execute { session?.midi?.sustain(d, midiNow()) } },
        onConnected = { name -> midiName = name; _listen.update { it.copy(midiDevice = name) } },
    )

    fun startListening(micAllowed: Boolean) {
        if (_listen.value.status != ListenStatus.OFF) return
        midi.start()
        val ok = micAllowed && audio.start()
        _listen.update { it.copy(status = ListenStatus.LISTENING, micError = micAllowed && !ok) }
        // keeps the take clock running when there is no microphone (MIDI only)
        viewModelScope.launch {
            while (isActive && _listen.value.status != ListenStatus.OFF) {
                delay(200)
                if (!audio.isRunning) worker.execute { onAudio(FloatArray(AudioEngine.SAMPLE_RATE / 5)) }
            }
        }
    }

    fun stopListening() {
        if (_listen.value.status == ListenStatus.RECORDING) worker.execute { recorder.forceStop()?.let { finishTake() } }
        audio.stop()
        midi.stop()
        _listen.update { it.copy(status = ListenStatus.OFF) }
    }

    /** The big button: start a take now, or end it now. */
    fun toggleTake() = worker.execute {
        if (recorder.state == AutoRecorder.State.RECORDING) { recorder.forceStop(); finishTake() } else recorder.forceStart()?.let { startTake(it.preRoll) }
    }

    fun setSilence(seconds: Float) { prefs.silenceSeconds = seconds; recorder.silenceSeconds = seconds.toDouble() }

    val silenceSeconds: Int get() = prefs.silenceSeconds.toInt()

    private fun midiNow(): Double = (System.nanoTime() - takeStartNanos) / 1e9

    private fun midiNote(pitch: Int, velocity: Int) {
        if (recorder.state != AutoRecorder.State.RECORDING) recorder.forceStart()?.let { startTake(it.preRoll) }
        recorder.noteActivity()
        session?.midi?.noteOn(pitch, velocity, midiNow())
    }

    private fun onAudio(block: FloatArray) {
        lastBlockNanos = System.nanoTime()
        when (val e = recorder.process(block, block.size)) {
            is AutoRecorder.Event.Started -> { startTake(e.preRoll); return }
            AutoRecorder.Event.Stopped -> { finishTake(); return }
            null -> {}
        }
        if (recorder.state == AutoRecorder.State.RECORDING) feed(block)
        _listen.update { it.copy(levelDb = recorder.levelDb, seconds = recorder.recordingSeconds) }
    }

    private fun feed(block44k: FloatArray) {
        val s = session ?: return
        if (!audio.isRunning) return
        val x = decimator.process(block44k)
        wav?.write(x)
        if (midiName == null) {
            val heard = s.pushAudio(x)
            if (heard.isNotEmpty()) recorder.noteActivity()
        }
    }

    private fun startTake(preRoll: FloatArray) {
        val id = "t" + System.currentTimeMillis().toString(36) + UUID.randomUUID().toString().take(4)
        takeId = id
        takeStartNanos = System.nanoTime()
        decimator = Decimator2()
        val useModel = midiName == null && audio.isRunning
        if (useModel && model == null) model = try { TfliteModel(getApplication()) } catch (e: Exception) { null }
        session = LiveSession(if (useModel) model else null, repo.personal(), currentSettings())
        wav = if (audio.isRunning) WavWriter(repo.audioFile(id), BasicPitchStream.SAMPLE_RATE) else null
        if (preRoll.isNotEmpty()) feed(preRoll)
        _listen.update { it.copy(status = ListenStatus.RECORDING, notes = emptyList(), bpm = 0, now = 0.0, message = null) }
        liveJob?.cancel()
        liveJob = viewModelScope.launch {
            while (isActive && _listen.value.status == ListenStatus.RECORDING) {
                delay(500)
                val s = session ?: break
                val now = if (midiName != null) midiNow() else s.seconds
                val view = withContext(workerDispatcher) { s.view(now) }
                _listen.update { it.copy(notes = view.notes, key = view.key, now = now, bpm = view.bpm) }
            }
        }
    }

    private fun finishTake() {
        val s = session ?: return
        val id = takeId ?: return
        session = null
        liveJob?.cancel()
        _listen.update { it.copy(status = ListenStatus.SAVING) }
        val now = if (midiName != null) midiNow() else s.seconds
        val events = s.finish(now)
        wav?.close()
        val hasAudio = wav != null
        wav = null
        if (events.size < 2) {
            repo.audioFile(id).delete()
            _listen.update { it.copy(status = if (audio.isRunning || midiName != null) ListenStatus.LISTENING else ListenStatus.OFF, message = "Nothing to transcribe in that take") }
            return
        }
        val settings = currentSettings()
        val data = TakeData(id, events, settings = settings, hasAudio = hasAudio)
        repo.save(data)
        val t = Transcriber(repo.personal()).analyze(events, settings)
        val cal = Calendar.getInstance()
        val title = AutoTitle.make(t.mainKey, cal.get(Calendar.DAY_OF_MONTH), cal.get(Calendar.MONTH) + 1)
        val created = System.currentTimeMillis()
        val songId = "s$id"
        val meta = TakeMeta(id, songId, created, events.maxOf { it.offset }, t.mainKey.displayName, t.bpm, "${t.grid.numerator}/${t.grid.denominator}",
            if (midiName != null) "midi" else "mic", t.notes.size)
        val lib = repo.library()
        val newLib = lib.copy(songs = lib.songs + Song(songId, Library.INBOX, title, true, created), takes = lib.takes + meta)
        repo.save(newLib)
        _library.value = newLib
        var msg = "Saved “$title”"
        if (prefs.autoPdf) {
            try {
                val score = ScoreBuilder().build(t, title, subtitle(t))
                val where = exporter.saveToDownloads(Exporter.Kind.PDF, title, exporter.pdf(score))
                msg += " · PDF in $where"
            } catch (_: Exception) {}
        }
        _listen.update { it.copy(status = if (audio.isRunning || midiName != null) ListenStatus.LISTENING else ListenStatus.OFF, lastSaved = meta, lastSavedTitle = title, message = msg) }
    }

    private fun currentSettings() = AnalysisSettings(musical = prefs.musical.toDouble(), strictness = prefs.strictness.toDouble())

    // ------------------------------------------------------------------ take review
    private var analysisJob: Job? = null

    fun openTake(takeId: String) {
        val lib = repo.library()
        val meta = lib.takes.firstOrNull { it.id == takeId } ?: return
        val song = lib.song(meta.songId) ?: return
        viewModelScope.launch {
            val data = withContext(Dispatchers.IO) { repo.take(takeId) } ?: return@launch
            val (t, score) = withContext(Dispatchers.Default) { analyze(data, song.title) }
            _take.value = TakeUi(song.id, takeId, song.title, song.favorite, data, t, score, lib.takesOf(song.id))
        }
    }

    fun closeTake() { _take.value = null }

    private fun analyze(data: TakeData, title: String): Pair<Transcription, Score> {
        val t = Transcriber(repo.personal()).analyze(data.events, data.settings, data.overrides)
        return t to ScoreBuilder().build(t, title, subtitle(t))
    }

    private fun subtitle(t: Transcription): String {
        val keys = t.keyChanges().joinToString(" → ") { it.key.displayName }
        return "$keys · ${t.grid.numerator}/${t.grid.denominator} · ♩ = ${t.bpm}"
    }

    /** Re-analyze with new settings or choices (debounced while a slider moves). */
    private fun reanalyze(data: TakeData, debounce: Long = 0, message: String? = null) {
        val cur = _take.value ?: return
        _take.value = cur.copy(data = data, busy = true)
        analysisJob?.cancel()
        analysisJob = viewModelScope.launch {
            if (debounce > 0) delay(debounce)
            val (t, score) = withContext(Dispatchers.Default) { analyze(data, cur.title) }
            withContext(Dispatchers.IO) { repo.save(data) }
            _take.update { it?.copy(transcription = t, score = score, busy = false, message = message ?: it.message) }
        }
    }

    fun setMusical(v: Float) { val c = _take.value ?: return; prefs.musical = v; reanalyze(c.data.copy(settings = c.data.settings.copy(musical = v.toDouble())), 150) }
    fun setStrictness(v: Float) { val c = _take.value ?: return; prefs.strictness = v; reanalyze(c.data.copy(settings = c.data.settings.copy(strictness = v.toDouble())), 150) }
    fun transpose(semitones: Int) {
        val c = _take.value ?: return
        val tr = (c.data.settings.transpose + semitones).coerceIn(-12, 12)
        reanalyze(c.data.copy(settings = c.data.settings.copy(transpose = tr)))
    }

    fun select(eventId: Int?) { _take.update { it?.copy(selected = eventId) } }

    /** The player switches a note: remember the choice, and learn from it. */
    fun choose(eventId: Int, pitch: Int?) {
        val c = _take.value ?: return
        val learned = Transcriber(repo.personal()).learn(c.data.events, c.transcription, eventId, pitch ?: -1, c.data.settings)
        repo.save(learned)
        val ov = c.data.overrides.toMutableMap()
        ov[eventId] = if (pitch == null) NoteOverride(deleted = true) else NoteOverride(pitch = pitch)
        reanalyze(c.data.copy(overrides = ov), message = "Noted — Scorebook learns from your corrections")
        _take.update { it?.copy(selected = null) }
    }

    fun resetNote(eventId: Int) {
        val c = _take.value ?: return
        reanalyze(c.data.copy(overrides = c.data.overrides - eventId))
        _take.update { it?.copy(selected = null) }
    }

    fun toggleFavorite() {
        val c = _take.value ?: return
        val lib = repo.library()
        val songs = lib.songs.map { if (it.id == c.songId) it.copy(favorite = !it.favorite) else it }
        val newLib = lib.copy(songs = songs)
        repo.save(newLib); _library.value = newLib
        _take.update { it?.copy(favorite = !c.favorite) }
    }

    fun toggleFavoriteSong(songId: String) {
        val lib = repo.library()
        val newLib = lib.copy(songs = lib.songs.map { if (it.id == songId) it.copy(favorite = !it.favorite) else it })
        repo.save(newLib); _library.value = newLib
        if (_take.value?.songId == songId) _take.update { it?.copy(favorite = !it.favorite) }
    }

    fun rename(title: String) {
        val c = _take.value ?: return
        val lib = repo.library()
        val newLib = lib.copy(songs = lib.songs.map { if (it.id == c.songId) it.copy(title = title, autoTitle = false) else it })
        repo.save(newLib); _library.value = newLib
        _take.update { it?.copy(title = title, score = it.score.copy(title = title)) }
    }

    fun export(kind: Exporter.Kind, share: Boolean) {
        val c = _take.value ?: return
        viewModelScope.launch {
            val bytes = withContext(Dispatchers.Default) { exporter.bytes(kind, c.score, c.transcription) }
            if (share) exporter.share(kind, c.title, bytes)
            else {
                val where = withContext(Dispatchers.IO) { exporter.saveToDownloads(kind, c.title, bytes) }
                _take.update { it?.copy(message = "Saved to $where") }
            }
        }
    }

    /** Moves a song's takes to the trash (recoverable for 30 days). */
    fun trashSong(songId: String) {
        val lib = repo.library()
        val now = System.currentTimeMillis()
        val newLib = lib.copy(takes = lib.takes.map { if (it.songId == songId && it.trashedAt == null) it.copy(trashedAt = now) else it })
        repo.save(newLib); _library.value = newLib
        if (_take.value?.songId == songId) _take.value = null
    }

    fun restoreTrash() {
        val lib = repo.library()
        val newLib = lib.copy(takes = lib.takes.map { it.copy(trashedAt = null) })
        repo.save(newLib); _library.value = newLib
    }

    fun resetLearning() { repo.save(io.github.e1caro.scorebook.core.correct.PersonalModel()) }
    fun corrections(): Int = repo.personal().corrections

    fun clearMessage() { _listen.update { it.copy(message = null) }; _take.update { it?.copy(message = null) } }

    fun aiDecidedCount(t: Transcription): Int = t.notes.count { it.decision == Decision.CONTEXT || it.decision == Decision.UNSURE }

    fun durationText(seconds: Double): String { val s = seconds.roundToInt(); return "%d:%02d".format(s / 60, s % 60) }

    override fun onCleared() {
        audio.stop()
        midi.stop()
        worker.shutdown()
        model?.close()
    }
}
