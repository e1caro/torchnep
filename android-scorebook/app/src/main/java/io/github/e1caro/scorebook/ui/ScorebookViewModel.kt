package io.github.e1caro.scorebook.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import io.github.e1caro.scorebook.ScorebookApp
import io.github.e1caro.scorebook.audio.AudioEngine
import io.github.e1caro.scorebook.audio.MidiInput
import io.github.e1caro.scorebook.audio.TfliteModel
import io.github.e1caro.scorebook.audio.WavWriter
import io.github.e1caro.scorebook.core.commands.Command
import io.github.e1caro.scorebook.core.commands.CommandConfig
import io.github.e1caro.scorebook.core.commands.CommandSpotter
import io.github.e1caro.scorebook.core.commands.PhraseListener
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
import io.github.e1caro.scorebook.core.analysis.TuningCompensation
import io.github.e1caro.scorebook.core.analysis.TuningEstimator
import io.github.e1caro.scorebook.core.live.Decimator2
import io.github.e1caro.scorebook.core.live.Resampler
import io.github.e1caro.scorebook.core.transcribe.Decoder
import io.github.e1caro.scorebook.core.transcribe.FrameStream
import io.github.e1caro.scorebook.core.live.LiveSession
import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.music.Mode
import io.github.e1caro.scorebook.core.score.Score
import io.github.e1caro.scorebook.core.score.ScoreBuilder
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

/**
 * OFF: the app is in the background. READY: waiting for the record button, microphone off.
 * LISTENING: hands-free mode, microphone on, waiting for playing to start. RECORDING, SAVING: a take.
 */
enum class ListenStatus { OFF, READY, LISTENING, RECORDING, SAVING }

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
    val handsFree: Boolean = false,
    val commands: Boolean = false,
    val lastSaved: TakeMeta? = null,
    val lastSavedTitle: String? = null,
    val message: String? = null,
)

/** The confirmation shown after a piano command; [done] is false when there was nothing to do. */
data class CommandFlash(val command: Command, val text: String, val done: Boolean, val id: Long)

/** Teaching a motif: what was heard, and whether it can be used. */
data class TeachState(val command: Command, val heard: List<Int>? = null, val problem: String? = null, val warning: String? = null)

enum class PlaySource { SCORE, RECORDING }

/** Playback of the open take: the score with a piano sound, or the original recording. */
data class PlaybackUi(val source: PlaySource = PlaySource.SCORE, val speed: Float = 1f, val playing: Boolean = false, val preparing: Boolean = false, val length: Double = 0.0)

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
    /** Edit mode: tapping selects bars to cut. */
    val editing: Boolean = false,
    val selection: IntRange? = null,
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
    private val _playback = MutableStateFlow(PlaybackUi())
    val playback: StateFlow<PlaybackUi> = _playback
    private val player = io.github.e1caro.scorebook.audio.Player()
    private var pcmCache: Pair<String, Pair<ShortArray, Int>>? = null
    private var playJob: Job? = null
    private val _opening = MutableStateFlow(false)
    /** A take is being loaded and analyzed (shown as a spinner). */
    val opening: StateFlow<Boolean> = _opening

    // ------------------------------------------------------------------ listening
    private val worker = Executors.newSingleThreadExecutor { r -> Thread(r, "scorebook-worker") }
    private val workerDispatcher = worker.asCoroutineDispatcher()
    private val audio = AudioEngine { block, n -> val copy = block.copyOf(n); worker.execute { onAudio(copy) } }
    private val recorder = AutoRecorder(audio.sampleRate, silenceSeconds = prefs.silenceSeconds.toDouble()).apply {
        autoStart = prefs.handsFree
        autoStop = prefs.handsFree
    }
    @Volatile private var active = false
    @Volatile private var micAllowed = false
    private var wavDecimator = Decimator2() // the take's recording is kept at half the capture rate
    private var toModel: Resampler? = null // capture rate → the model's rate, with tuning compensation
    private var takeTuning = 0.0 // the compensation (cents) the current take is transcribed with
    private var model: TfliteModel? = null
    private var session: LiveSession? = null
    private var wav: WavWriter? = null
    private var takeId: String? = null
    private var takeStartNanos = 0L
    private var lastBlockNanos = 0L
    private var liveJob: Job? = null
    @Volatile private var midiName: String? = null

    // ------------------------------------------------------------------ piano commands
    private val _commands = MutableStateFlow(prefs.commands)
    /** The piano commands: on/off and the motif of each. */
    val commands: StateFlow<CommandConfig> = _commands
    private val _flash = MutableStateFlow<CommandFlash?>(null)
    /** The big on-screen confirmation of the last command. */
    val flash: StateFlow<CommandFlash?> = _flash
    private val _teach = MutableStateFlow<TeachState?>(null)
    /** Teaching a new motif for a command (Settings). */
    val teach: StateFlow<TeachState?> = _teach
    private val beeper = io.github.e1caro.scorebook.audio.Player()
    private var idleResampler: Resampler? = null
    private var idleTuning = Double.NaN
    private var phrases: PhraseListener? = null
    private val idleMidi = ArrayList<CommandSpotter.Note>()
    private var lastIdleMidiHit = Double.NEGATIVE_INFINITY
    private var lastTakeHit = Double.NEGATIVE_INFINITY
    @Volatile private var muteUntil = 0L
    private var undo: (() -> String)? = null

    private val midi = MidiInput(app,
        onNoteOn = { p, v -> worker.execute { midiNote(p, v) } },
        onNoteOff = { p -> worker.execute { session?.midi?.noteOff(p, midiNow()) } },
        onSustain = { d -> worker.execute { session?.midi?.sustain(d, midiNow()) } },
        onConnected = { name -> midiName = name; _listen.update { it.copy(midiDevice = name) } },
    )

    /** The microphone listens between takes: hands-free mode, piano commands, or teaching a motif. */
    private fun micListensWhenIdle(): Boolean = prefs.handsFree || _commands.value.enabled || _teach.value != null

    /**
     * The app came to the foreground. In the default (manual) mode nothing is recorded and the microphone stays
     * off until the record button is pressed; with hands-free or piano commands it listens between takes.
     */
    fun startListening(micAllowed: Boolean) {
        this.micAllowed = micAllowed
        if (_listen.value.status != ListenStatus.OFF) {
            worker.execute { updateIdleMic() }
            return
        }
        active = true
        midi.start()
        val handsFree = prefs.handsFree
        _listen.update { it.copy(status = idleStatus(), handsFree = handsFree, commands = _commands.value.enabled) }
        worker.execute { updateIdleMic(); ensureModel() }
        // keeps the take clock running when the microphone is off (MIDI takes), and checks MIDI motifs
        viewModelScope.launch {
            while (isActive && _listen.value.status != ListenStatus.OFF) {
                delay(200)
                worker.execute {
                    if (!audio.isRunning) onAudio(FloatArray(audio.sampleRate / 5))
                    checkIdleMidi()
                }
            }
        }
    }

    /** Opens or closes the microphone between takes, as the settings ask (worker thread). */
    private fun updateIdleMic() {
        if (!active || recorder.state == AutoRecorder.State.RECORDING) return
        if (micListensWhenIdle() && micAllowed && midiName == null) {
            if (!audio.isRunning) _listen.update { it.copy(micError = !audio.start()) }
        } else if (audio.isRunning) audio.stop()
        _listen.update { it.copy(status = if (it.status == ListenStatus.SAVING) it.status else idleStatus()) }
    }

    fun stopListening() {
        active = false
        if (_listen.value.status == ListenStatus.RECORDING) worker.execute { recorder.forceStop()?.let { finishTake() } }
        audio.stop()
        midi.stop()
        _listen.update { it.copy(status = ListenStatus.OFF) }
    }

    /** The record button: start a take (opening the microphone), or stop it and save. */
    fun toggleTake() = worker.execute {
        if (recorder.state == AutoRecorder.State.RECORDING) stopAndSave(null) else startRecordingNow()
    }

    private fun startRecordingNow() {
        if (recorder.state == AutoRecorder.State.RECORDING) return
        if (!audio.isRunning && micAllowed && midiName == null) {
            if (!audio.start()) _listen.update { it.copy(micError = true) }
        }
        recorder.forceStart()?.let { startTake(FloatArray(0)) }
    }

    /** Ends the take and saves it; [trimFrom]: drop the notes from there on (a stop motif). */
    private fun stopAndSave(trimFrom: Double?) {
        recorder.forceStop()
        finishTake(trimFrom)
        if (!micListensWhenIdle()) audio.stop()
        phrases?.reset()
    }

    /** Throws the take away without saving it. */
    private fun discardTake() {
        recorder.forceStop()
        session = null
        liveJob?.cancel()
        wav?.close()
        wav = null
        takeId?.let { repo.audioFile(it).delete() }
        takeId = null
        if (!micListensWhenIdle()) audio.stop()
        phrases?.reset()
        _listen.update { it.copy(status = idleStatus(), notes = emptyList(), levelDb = -90.0) }
    }

    /** Hands-free: start when playing begins, stop after silence (keeps the microphone on while the app is open). */
    fun setHandsFree(on: Boolean) {
        prefs.handsFree = on
        recorder.autoStart = on
        recorder.autoStop = on
        _listen.update { it.copy(handsFree = on) }
        worker.execute { updateIdleMic() }
    }

    val handsFree: Boolean get() = prefs.handsFree

    private fun idleStatus(): ListenStatus = when {
        !active -> ListenStatus.OFF
        micListensWhenIdle() && (audio.isRunning || midiName != null) -> ListenStatus.LISTENING
        else -> ListenStatus.READY
    }

    fun setSilence(seconds: Float) { prefs.silenceSeconds = seconds; recorder.silenceSeconds = seconds.toDouble() }

    val silenceSeconds: Int get() = prefs.silenceSeconds.toInt()

    private fun midiNow(): Double = (System.nanoTime() - takeStartNanos) / 1e9

    private fun midiNote(pitch: Int, velocity: Int) {
        if (recorder.state != AutoRecorder.State.RECORDING) {
            if (_commands.value.enabled || _teach.value != null) {
                val now = System.nanoTime() / 1e9
                idleMidi.add(CommandSpotter.Note(now, pitch))
                idleMidi.removeAll { now - it.time > 12 }
            }
            if (!prefs.handsFree) return // only the record button (or a start motif) starts a take
            recorder.forceStart()?.let { startTake(it.preRoll) }
        }
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
        if (!audio.isRunning && block.all { it == 0f } && recorder.state != AutoRecorder.State.RECORDING) return
        if (recorder.state == AutoRecorder.State.RECORDING) feed(block)
        else if (audio.isRunning && (_commands.value.enabled || _teach.value != null)) listenForMotif(block)
        _listen.update { it.copy(levelDb = recorder.levelDb, seconds = recorder.recordingSeconds) }
    }

    // ---- motifs between takes: phrases cut from the microphone, or MIDI notes

    private fun listenForMotif(block: FloatArray) {
        val m = ensureModel() ?: return
        val tuning = appliedTuning()
        if (idleResampler == null || idleTuning != tuning) {
            idleResampler = Resampler(TuningCompensation(audio.sampleRate, tuning).effectiveRate, m.spec.sampleRate)
            idleTuning = tuning
            phrases = PhraseListener({ a -> transcribePhrase(a) }, m.spec.sampleRate)
        }
        val listener = phrases ?: return
        val x = idleResampler!!.process(block)
        if (System.nanoTime() < muteUntil) { listener.reset(); return } // our own confirmation sound
        val notes = listener.push(x) ?: return
        onIdlePhrase(notes.map { it.pitch })
    }

    private fun checkIdleMidi() {
        if (recorder.state == AutoRecorder.State.RECORDING || idleMidi.isEmpty()) return
        val now = System.nanoTime() / 1e9
        if (_teach.value != null) {
            val last = idleMidi.last()
            if (now - last.time < CommandSpotter.POST_SILENCE) return
            var i = idleMidi.size - 1
            while (i > 0 && idleMidi[i].time - idleMidi[i - 1].time < CommandSpotter.PRE_SILENCE) i--
            val phrase = idleMidi.subList(i, idleMidi.size).map { it.pitch }
            idleMidi.clear()
            onIdlePhrase(phrase)
            return
        }
        val hit = CommandSpotter.spotTail(idleMidi, now, _commands.value.motifs, after = lastIdleMidiHit) ?: return
        lastIdleMidiHit = hit.start
        idleMidi.clear()
        execute(hit.command, null)
    }

    private fun onIdlePhrase(pitches: List<Int>) {
        val teaching = _teach.value
        if (teaching != null) {
            val cfg = _commands.value
            _teach.value = teaching.copy(
                heard = pitches,
                problem = CommandConfig.problem(pitches, teaching.command, cfg),
                warning = CommandConfig.warning(pitches),
            )
            return
        }
        if (!_commands.value.enabled) return
        CommandSpotter.match(pitches, _commands.value.motifs)?.let { execute(it, null) }
    }

    /** The model and decoder on one short phrase (worker thread). */
    private fun transcribePhrase(audio: FloatArray): List<io.github.e1caro.scorebook.core.transcribe.NoteEvent> {
        val m = ensureModel() ?: return emptyList()
        val st = FrameStream(m)
        st.push(audio)
        st.flush()
        return Decoder.forModel(m.spec, repo.personal().calibration).decode(st.grid)
    }

    /** The transcription model, loaded once (the piano model is 109 MB, memory-mapped). */
    private fun ensureModel(): TfliteModel? = model ?: (try { TfliteModel.load(getApplication()) } catch (e: Exception) { null })?.also { model = it }

    /** The tuning compensation in use: this piano's learned tuning, or none if it is close to concert pitch. */
    private fun appliedTuning(): Double = repo.personal().tuningCents.let { if (kotlin.math.abs(it) < TuningCompensation.MIN_CENTS) 0.0 else it }

    /** "32 cents flat", for Settings; null when in tune or not yet known. */
    fun tuningText(): String? {
        val t = appliedTuning()
        return if (t == 0.0) null else "${kotlin.math.abs(t).roundToInt()} cents ${if (t < 0) "flat" else "sharp"}"
    }

    /** Motifs inside a take (a stop motif after a pause, etc.): checked as the take goes on. */
    private fun spotInTake(s: LiveSession, now: Double) {
        if (!_commands.value.enabled) return
        val notes = CommandSpotter.notesOf(s.events(now))
        val hit = CommandSpotter.spotTail(notes, s.knownUntil(now), _commands.value.motifs, after = lastTakeHit) ?: return
        lastTakeHit = hit.start
        if (hit.command == Command.START) return // already recording
        execute(hit.command, hit)
    }

    /** Carries out a piano command (worker thread), with a sound and a big flash to confirm it. */
    private fun execute(c: Command, hit: CommandSpotter.Hit?) {
        val recording = recorder.state == AutoRecorder.State.RECORDING
        var effect: Command? = c
        val text: String = when (c) {
            Command.START -> if (recording) { effect = null; "Already recording" } else { startAfterBeep(); "Recording" }
            Command.STOP -> if (recording) { stopAndSave(hit?.start); "Saved" } else { effect = null; "Not recording" }
            Command.DISCARD -> if (recording) { discardTake(); "Take discarded" } else {
                val song = repo.library().lastSong()
                if (song == null) { effect = null; "Nothing to discard" } else {
                    trashSongs(setOf(song.id))
                    undo = { restoreSongs(setOf(song.id)); "“${song.title}” is back" }
                    "“${song.title}” moved to the trash"
                }
            }
            Command.RESTART -> { if (recording) discardTake(); startAfterBeep(); "Starting over" }
            Command.FAVORITE -> {
                val song = repo.library().lastSong()
                if (song == null) { effect = null; "No score yet" } else {
                    if (!song.favorite) toggleFavoriteSong(song.id)
                    undo = { if (repo.library().song(song.id)?.favorite == true) toggleFavoriteSong(song.id); "Favourite removed" }
                    "“${song.title}” is a favourite"
                }
            }
            Command.UNDO -> {
                val u = undo
                undo = null
                if (u == null) { effect = null; "Nothing to undo" } else u()
            }
        }
        muteUntil = System.nanoTime() + 900_000_000L
        beeper.play(io.github.e1caro.scorebook.core.commands.Beeps.pcm(effect), 22050, 0.0, 1f)
        _flash.value = CommandFlash(c, text, effect != null, System.nanoTime())
    }

    /** Starts a take once the confirmation sound is over (so it is not recorded). */
    private fun startAfterBeep() {
        viewModelScope.launch {
            delay(600)
            worker.execute { startRecordingNow() }
        }
    }

    fun setCommandsEnabled(on: Boolean) {
        val c = _commands.value.copy(enabled = on)
        _commands.value = c
        prefs.commands = c
        _listen.update { it.copy(commands = on) }
        worker.execute { updateIdleMic() }
    }

    /** Starts teaching a new motif for [c]: the next short phrase played is captured. */
    fun startTeaching(c: Command) {
        _teach.value = TeachState(c)
        idleMidi.clear()
        worker.execute { phrases?.reset(); updateIdleMic() }
    }

    fun keepTaught() {
        val t = _teach.value ?: return
        val heard = t.heard ?: return
        if (t.problem != null) return
        val c = _commands.value.with(t.command, heard)
        _commands.value = c
        prefs.commands = c
        cancelTeaching()
    }

    fun retryTeaching() { _teach.update { it?.copy(heard = null, problem = null, warning = null) } }

    fun cancelTeaching() {
        _teach.value = null
        worker.execute { updateIdleMic() }
    }

    fun resetMotifs() {
        val c = CommandConfig(enabled = _commands.value.enabled)
        _commands.value = c
        prefs.commands = c
    }

    private fun feed(block: FloatArray) {
        val s = session ?: return
        if (!audio.isRunning) return
        wav?.write(wavDecimator.process(block))
        if (midiName == null) {
            val r = toModel ?: return
            val heard = s.pushAudio(r.process(block))
            if (heard.isNotEmpty()) recorder.noteActivity()
        }
    }

    private fun startTake(preRoll: FloatArray) {
        val id = "t" + System.currentTimeMillis().toString(36) + UUID.randomUUID().toString().take(4)
        takeId = id
        takeStartNanos = System.nanoTime()
        wavDecimator = Decimator2()
        lastTakeHit = Double.NEGATIVE_INFINITY
        val useModel = midiName == null && audio.isRunning
        val m = if (useModel) ensureModel() else null
        // a piano that is flat or sharp as a whole is fed to the model a little faster or slower (see TuningCompensation)
        takeTuning = appliedTuning()
        val comp = TuningCompensation(audio.sampleRate, takeTuning)
        toModel = m?.let { Resampler(comp.effectiveRate, it.spec.sampleRate) }
        session = LiveSession(m, repo.personal(), currentSettings(), comp.timeScale)
        wav = if (audio.isRunning) WavWriter(repo.audioFile(id), audio.sampleRate / 2) else null
        if (preRoll.isNotEmpty()) feed(preRoll)
        _listen.update { it.copy(status = ListenStatus.RECORDING, notes = emptyList(), bpm = 0, now = 0.0, message = null) }
        liveJob?.cancel()
        liveJob = viewModelScope.launch {
            while (isActive && _listen.value.status == ListenStatus.RECORDING) {
                delay(500)
                val s = session ?: break
                val now = if (midiName != null) midiNow() else s.seconds
                val view = withContext(workerDispatcher) { s.view(now) }
                if (session !== s) break
                _listen.update { it.copy(notes = view.notes, key = view.key, now = now, bpm = view.bpm) }
                worker.execute { if (session === s) spotInTake(s, now) }
            }
        }
    }

    private fun finishTake(trimFrom: Double? = null) {
        val s = session ?: return
        val id = takeId ?: return
        session = null
        liveJob?.cancel()
        _listen.update { it.copy(status = ListenStatus.SAVING) }
        val now = if (midiName != null) midiNow() else s.seconds
        var heard = s.finish(now)
        wav?.close()
        val hasAudio = wav != null
        wav = null
        toModel = null
        var tuningNote = ""
        if (hasAudio && midiName == null) retune(id, heard)?.let { (again, note) -> heard = again; tuningNote = note }
        // the notes of a stop motif are not part of the music
        val events = heard.let { ev -> if (trimFrom != null) ev.filter { it.onset < trimFrom - 0.05 } else ev }
        if (events.size < 2) {
            repo.audioFile(id).delete()
            _listen.update { it.copy(status = idleStatus(), message = "Nothing was heard in that take") }
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
        var msg = "Saved “$title”$tuningNote"
        if (prefs.autoPdf) {
            try {
                val score = ScoreBuilder().build(t, title, subtitle(t))
                val where = exporter.saveToDownloads(Exporter.Kind.PDF, title, exporter.pdf(score))
                msg += " · PDF in $where"
            } catch (_: Exception) {}
        }
        _listen.update { it.copy(status = idleStatus(), lastSaved = meta, lastSavedTitle = title, message = msg, levelDb = -90.0) }
    }

    /**
     * Measures the piano's tuning from the take's recording and remembers it. If it differs from the compensation
     * the take was transcribed with, the take is transcribed again from the recording with the right one: returns
     * the new notes and a line for the "saved" message; null if nothing changes.
     */
    private fun retune(takeId: String, heard: List<io.github.e1caro.scorebook.core.transcribe.NoteEvent>): Pair<List<io.github.e1caro.scorebook.core.transcribe.NoteEvent>, String>? {
        val m = model ?: return null
        if (heard.size < 12) return null
        val (pcm, sr) = io.github.e1caro.scorebook.audio.Player.readWav(repo.audioFile(takeId)) ?: return null
        val n = minOf(pcm.size, sr * 90) // the first minute and a half is plenty to measure
        val est = TuningEstimator.estimate(FloatArray(n) { pcm[it] / 32768f }, sr) ?: return null
        if (est.confidence < 0.4) return null
        val personal = repo.personal().withTuning(est.cents)
        repo.save(personal)
        val target = if (kotlin.math.abs(personal.tuningCents) < TuningCompensation.MIN_CENTS) 0.0 else personal.tuningCents
        val note = if (target == 0.0) "" else " · piano ${kotlin.math.abs(target).roundToInt()} cents ${if (target < 0) "flat" else "sharp"}, compensated"
        if (kotlin.math.abs(target - takeTuning) < 8.0) return if (note.isEmpty()) null else heard to note
        val comp = TuningCompensation(sr, target)
        val r = Resampler(comp.effectiveRate, m.spec.sampleRate)
        val st = FrameStream(m)
        val block = FloatArray(4800)
        var i = 0
        while (i < pcm.size) {
            val k = minOf(block.size, pcm.size - i)
            for (j in 0 until k) block[j] = pcm[i + j] / 32768f
            st.push(r.process(block, k))
            i += k
        }
        st.flush()
        val again = Decoder.forModel(m.spec, personal.calibration).decode(st.grid)
            .map { it.copy(onset = it.onset * comp.timeScale, offset = it.offset * comp.timeScale) }
        return again to note
    }

    private fun currentSettings() = AnalysisSettings(musical = prefs.musical.toDouble(), strictness = prefs.strictness.toDouble())

    // ------------------------------------------------------------------ take review
    private var analysisJob: Job? = null

    fun openTake(takeId: String) {
        val lib = repo.library()
        val meta = lib.takes.firstOrNull { it.id == takeId } ?: return
        val song = lib.song(meta.songId) ?: return
        _opening.value = true
        viewModelScope.launch {
            try {
                val data = withContext(Dispatchers.IO) { repo.take(takeId) } ?: return@launch
                val (t, score) = withContext(Dispatchers.Default) { analyze(data, song.title) }
                _take.value = TakeUi(song.id, takeId, song.title, song.favorite, data, t, score, lib.takesOf(song.id))
            } finally {
                _opening.value = false
            }
        }
    }

    fun closeTake() { stopPlayback(); _take.value = null }

    // ------------------------------------------------------------------ playback

    /** Where playback is, in seconds of the take (for the score to follow), or -1 when stopped. */
    fun playbackPosition(): Double = if (player.isPlaying) player.position() else -1.0

    fun togglePlay() { if (_playback.value.playing || _playback.value.preparing) stopPlayback() else startPlayback(0.0) }

    fun setPlaySource(source: PlaySource) = restartWith { it.copy(source = source) }
    fun setPlaySpeed(speed: Float) = restartWith { it.copy(speed = speed) }

    private fun restartWith(change: (PlaybackUi) -> PlaybackUi) {
        val wasPlaying = _playback.value.playing
        val at = if (wasPlaying) player.position() else 0.0
        _playback.update(change)
        if (wasPlaying) startPlayback(at)
    }

    private fun startPlayback(from: Double) {
        val c = _take.value ?: return
        val pb = _playback.value
        playJob?.cancel()
        player.stop()
        _playback.update { it.copy(preparing = true, playing = false) }
        playJob = viewModelScope.launch {
            val audio = withContext(Dispatchers.Default) {
                val key = "${c.takeId}|${pb.source}|${c.data.settings}|${c.data.overrides}|${c.data.edits}"
                pcmCache?.takeIf { it.first == key }?.second ?: run {
                    val made = when (pb.source) {
                        PlaySource.SCORE -> io.github.e1caro.scorebook.core.play.PianoSynth.render(
                            io.github.e1caro.scorebook.core.play.PianoSynth.voices(c.transcription), 22050) to 22050
                        PlaySource.RECORDING -> io.github.e1caro.scorebook.audio.Player.readWav(repo.audioFile(c.takeId))
                            ?.let { (pcm, sr) -> io.github.e1caro.scorebook.core.library.Edits.apply(pcm, sr, c.data.edits) to sr }
                    }
                    if (made != null) pcmCache = key to made
                    made
                }
            }
            if (audio == null) {
                _playback.update { it.copy(preparing = false, playing = false) }
                _take.update { it?.copy(message = "This take has no recording (it came from a MIDI keyboard)") }
                return@launch
            }
            val ok = player.play(audio.first, audio.second, from, pb.speed)
            _playback.update { it.copy(preparing = false, playing = ok, length = audio.first.size.toDouble() / audio.second) }
            while (ok && player.isPlaying) delay(100)
            if (ok) _playback.update { it.copy(playing = false) }
        }
    }

    fun stopPlayback() {
        playJob?.cancel()
        player.stop()
        _playback.update { it.copy(playing = false, preparing = false) }
    }

    private fun analyze(data: TakeData, title: String): Pair<Transcription, Score> {
        val t = Transcriber(repo.personal()).analyze(data.editedEvents(), data.settings, data.overrides)
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
            withContext(Dispatchers.IO) {
                repo.save(data)
                // the library shows the take as it is now (length, key, tempo after edits)
                val lib = repo.library()
                val newLib = lib.copy(takes = lib.takes.map { m ->
                    if (m.id != data.id) m else m.copy(
                        seconds = t.notes.maxOfOrNull { it.offset } ?: m.seconds, key = t.mainKey.displayName, bpm = t.bpm,
                        meter = "${t.grid.numerator}/${t.grid.denominator}", notes = t.notes.size,
                    )
                })
                repo.save(newLib)
                _library.value = newLib
            }
            _take.update { it?.copy(transcription = t, score = score, busy = false, message = message ?: it.message) }
        }
    }

    fun setMusical(v: Float) { val c = _take.value ?: return; prefs.musical = v; reanalyze(c.data.copy(settings = c.data.settings.copy(musical = v.toDouble())), 150) }
    // ---- fixing what the analysis got wrong

    fun setTempoScale(x: Double) { val c = _take.value ?: return; reanalyze(c.data.copy(settings = c.data.settings.copy(tempoScale = x))) }

    /** [beatsPerBar] null: detect the time signature. */
    fun setMeter(beatsPerBar: Int?, compound: Boolean) {
        val c = _take.value ?: return
        reanalyze(c.data.copy(settings = c.data.settings.copy(beatsPerBar = beatsPerBar, compound = if (beatsPerBar == null) null else compound)))
    }

    /** [key] null: detect the key (and key changes). */
    fun setKey(key: io.github.e1caro.scorebook.core.music.Key?) { val c = _take.value ?: return; reanalyze(c.data.copy(settings = c.data.settings.copy(key = key))) }

    fun moveToHand(eventId: Int, hand: io.github.e1caro.scorebook.core.correct.Hand) {
        val c = _take.value ?: return
        val ov = c.data.overrides.toMutableMap()
        ov[eventId] = (ov[eventId] ?: NoteOverride()).copy(hand = hand)
        reanalyze(c.data.copy(overrides = ov))
        _take.update { it?.copy(selected = null) }
    }

    // ---- cutting bars

    fun setEditing(on: Boolean) { _take.update { it?.copy(editing = on, selection = null, selected = null) } }

    /** Tap a bar to select it; tap a second one to select everything in between. */
    fun tapBar(n: Int) {
        _take.update { u ->
            val sel = u?.selection
            u?.copy(selection = if (sel != null && sel.first == sel.last && n != sel.first) minOf(n, sel.first)..maxOf(n, sel.first) else n..n)
        }
    }

    fun selectAllBars() { _take.update { u -> u?.let { it.copy(selection = 1..it.score.measures.size) } } }

    /** Seconds where bar [n] (1-based) starts, a little before the bar line (notes played slightly early belong to it). */
    private fun barStart(t: Transcription, n: Int): Double {
        val g = t.grid
        return g.time(g.firstBarBeat() + (n - 1.0) * g.beatsPerBar) - 0.15 * g.medianPeriod()
    }

    private fun selectionTimes(c: TakeUi): Pair<Double, Double>? {
        val sel = c.selection ?: return null
        val last = c.score.measures.size
        val from = if (sel.first <= 1) 0.0 else barStart(c.transcription, sel.first)
        val to = if (sel.last >= last) (c.data.editedEvents().maxOfOrNull { it.offset } ?: 0.0) + 5.0 else barStart(c.transcription, sel.last + 1)
        return from.coerceAtLeast(0.0) to to
    }

    fun keepSelection() {
        val c = _take.value ?: return
        val (from, to) = selectionTimes(c) ?: return
        val sel = c.selection!!
        reanalyze(c.data.copy(edits = c.data.edits + io.github.e1caro.scorebook.core.library.Edit.Keep(from, to)), message = "Kept bars ${sel.first}–${sel.last}")
        _take.update { it?.copy(selection = null) }
    }

    fun deleteSelection() {
        val c = _take.value ?: return
        val (from, to) = selectionTimes(c) ?: return
        val sel = c.selection!!
        if (sel.first <= 1 && sel.last >= c.score.measures.size) { _take.update { it?.copy(message = "That is the whole score: use Move to trash instead") }; return }
        reanalyze(c.data.copy(edits = c.data.edits + io.github.e1caro.scorebook.core.library.Edit.Cut(from, to)), message = "Cut bars ${sel.first}–${sel.last}")
        _take.update { it?.copy(selection = null) }
    }

    /** Saves the selected bars as a new song (with their part of the recording); this score stays as it is. */
    fun copySelectionToNewSong() {
        val c = _take.value ?: return
        val (from, to) = selectionTimes(c) ?: return
        val sel = c.selection!!
        viewModelScope.launch {
            val title = "${c.title} (bars ${sel.first}–${sel.last})"
            val newId = withContext(Dispatchers.IO) {
                val keep = io.github.e1caro.scorebook.core.library.Edit.Keep(from, to)
                val events = io.github.e1caro.scorebook.core.library.Edits.apply(c.data.editedEvents(), listOf(keep))
                val id = "t" + System.currentTimeMillis().toString(36) + UUID.randomUUID().toString().take(4)
                var hasAudio = false
                if (c.data.hasAudio) io.github.e1caro.scorebook.audio.Player.readWav(repo.audioFile(c.takeId))?.let { (pcm, sr) ->
                    val part = io.github.e1caro.scorebook.core.library.Edits.apply(pcm, sr, c.data.edits + keep)
                    val w = WavWriter(repo.audioFile(id), sr)
                    w.write(FloatArray(part.size) { part[it] / 32768f })
                    w.close()
                    hasAudio = true
                }
                val data = TakeData(id, events, c.data.overrides.filterKeys { k -> events.any { it.id == k } }, c.data.settings, hasAudio)
                repo.save(data)
                val t = Transcriber(repo.personal()).analyze(events, data.settings, data.overrides)
                val created = System.currentTimeMillis()
                val meta = TakeMeta(id, "s$id", created, events.maxOfOrNull { it.offset } ?: 0.0, t.mainKey.displayName, t.bpm,
                    "${t.grid.numerator}/${t.grid.denominator}", c.takes.firstOrNull { it.id == c.takeId }?.source ?: "mic", t.notes.size)
                val lib = repo.library()
                val newLib = lib.copy(songs = lib.songs + Song("s$id", Library.INBOX, title, false, created), takes = lib.takes + meta)
                repo.save(newLib)
                _library.value = newLib
                id
            }
            _take.update { it?.copy(selection = null, message = "Copied to “$title” in the library") }
            newId
        }
    }

    fun undoEdit() {
        val c = _take.value ?: return
        if (c.data.edits.isEmpty()) return
        reanalyze(c.data.copy(edits = c.data.edits.dropLast(1)), message = "Last cut undone")
    }

    fun restoreOriginal() {
        val c = _take.value ?: return
        reanalyze(c.data.copy(edits = emptyList()), message = "Back to the full recording")
    }

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
        val learned = Transcriber(repo.personal()).learn(c.data.editedEvents(), c.transcription, eventId, pitch ?: -1, c.data.settings)
        repo.save(learned)
        val ov = c.data.overrides.toMutableMap()
        val old = ov[eventId] ?: NoteOverride()
        ov[eventId] = if (pitch == null) old.copy(deleted = true, pitch = null) else old.copy(pitch = pitch, deleted = false)
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

    /** Moves several songs to the trash at once (recoverable for 30 days). */
    fun trashSongs(ids: Set<String>) {
        if (ids.isEmpty()) return
        val newLib = repo.library().trash(ids, System.currentTimeMillis())
        repo.save(newLib); _library.value = newLib
        if (_take.value?.songId?.let { it in ids } == true) closeTake()
    }

    fun restoreSongs(ids: Set<String>) {
        val newLib = repo.library().restore(ids)
        repo.save(newLib); _library.value = newLib
    }

    /** Deletes songs for good: their scores, events and recordings. */
    fun deleteForever(ids: Set<String>) {
        val (newLib, files) = repo.library().purge(ids)
        repo.save(newLib); _library.value = newLib
        repo.deleteTakeFiles(files)
    }

    fun emptyTrash() = deleteForever(repo.library().trashedSongs().map { it.id }.toSet())

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
        player.stop()
        beeper.stop()
        audio.stop()
        midi.stop()
        worker.shutdown()
        model?.close()
    }
}
