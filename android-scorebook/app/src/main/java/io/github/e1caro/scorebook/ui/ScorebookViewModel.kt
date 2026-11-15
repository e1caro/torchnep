package io.github.e1caro.scorebook.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import io.github.e1caro.scorebook.ScorebookApp
import io.github.e1caro.scorebook.audio.AudioEngine
import io.github.e1caro.scorebook.audio.MidiInput
import io.github.e1caro.scorebook.audio.TfliteModel
import io.github.e1caro.scorebook.audio.WavWriter
import io.github.e1caro.scorebook.core.accompany.Accompaniment
import io.github.e1caro.scorebook.core.accompany.Daily
import io.github.e1caro.scorebook.core.accompany.DailyPick
import io.github.e1caro.scorebook.core.accompany.Pattern
import io.github.e1caro.scorebook.core.accompany.Motif
import io.github.e1caro.scorebook.core.accompany.MotifPick
import io.github.e1caro.scorebook.core.accompany.Progressions
import io.github.e1caro.scorebook.core.accompany.Studies
import io.github.e1caro.scorebook.core.accompany.Study
import io.github.e1caro.scorebook.core.practice.PlayAlong
import io.github.e1caro.scorebook.core.practice.PracticeLog
import io.github.e1caro.scorebook.core.update.Update
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

enum class UpdateState { IDLE, CHECKING, UP_TO_DATE, AVAILABLE, DOWNLOADING, INSTALLING, FAILED }

/** Updating the app from inside the app. [update]: the newer version, once one was found. */
data class UpdateUi(val state: UpdateState = UpdateState.IDLE, val update: Update? = null, val progress: Float = 0f, val message: String? = null)

enum class CheckState { LISTENING, ANALYZING, DONE }

/** The play-along check: listening to the player, then the result. */
data class CheckUi(
    val state: CheckState,
    val seconds: Double = 0.0,
    val levelDb: Double = -90.0,
    /** Something was heard since the check started. */
    val heard: Boolean = false,
    val result: PlayAlong.Result? = null,
)

/**
 * The accompaniment screen: a study (a left-hand pattern over chords, or a motif) written out in a key.
 * [lastTakeId]…: the newest song, which "Use it on my last song" would accompany when its meter fits a pattern.
 */
data class AccompanyUi(
    val study: Study,
    val today: Boolean,
    val transcription: Transcription,
    val score: Score,
    val lastTakeId: String? = null,
    val lastTitle: String? = null,
    val lastMeter: String? = null,
    val message: String? = null,
    val check: CheckUi? = null,
    /** Days in a row with a passed check, and the best stars so far on this study. */
    val streak: Int = 0,
    val bestStars: Int = 0,
) {
    /** The pattern, when the study is one (motifs cannot be laid under a song). */
    val pick: DailyPick? get() = study as? DailyPick
    val fitsLastSong: Boolean get() = pick != null && lastMeter == study.meter.label
}

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
    private var playbackHeardUntil = 0L
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
        autoCheckForUpdate()
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
        stopCheck()
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
        checkRun?.let { it.midi.add(PlayAlong.Played(pitch, it.seconds())); return }
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
        // a play-along check owns the microphone: nothing is recorded and no command is heard meanwhile
        checkRun?.let { feedCheck(it, block); return }
        // the app's own playback (a score, a recording, an accompaniment) is not the player playing: between takes
        // it neither starts a hands-free take nor counts as a command
        if (recorder.state != AutoRecorder.State.RECORDING) {
            if (player.isPlaying) playbackHeardUntil = lastBlockNanos + 700_000_000L
            if (lastBlockNanos < playbackHeardUntil) { phrases?.reset(); return }
        }
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

    fun openTake(takeId: String, message: String? = null) {
        val lib = repo.library()
        val meta = lib.takes.firstOrNull { it.id == takeId } ?: return
        val song = lib.song(meta.songId) ?: return
        _opening.value = true
        viewModelScope.launch {
            try {
                val data = withContext(Dispatchers.IO) { repo.take(takeId) } ?: return@launch
                val (t, score) = withContext(Dispatchers.Default) { analyze(data, song.title) }
                _take.value = TakeUi(song.id, takeId, song.title, song.favorite, data, t, score, lib.takesOf(song.id), message = message)
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
            if (!ok) _take.update { it?.copy(message = PLAY_PROBLEM) }
            while (ok && player.isPlaying) delay(100)
            if (ok) _playback.update { it.copy(playing = false) }
        }
    }

    private val PLAY_PROBLEM = "The phone would not play sound just now. Close other apps that are playing audio and try again."

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

    // ------------------------------------------------------------------ updates
    private val updater = sb.updater
    private val _update = MutableStateFlow(UpdateUi())
    /** Looking for, downloading and installing a newer version of the app. */
    val update: StateFlow<UpdateUi> = _update
    private var updateJob: Job? = null

    /** "Scorebook 1.40". */
    val versionText: String get() = "Scorebook ${updater.currentName}"
    var autoUpdate: Boolean
        get() = prefs.autoUpdate
        set(v) { prefs.autoUpdate = v }

    /** When the app opens: look for a newer version, at most every six hours, quietly. */
    private fun autoCheckForUpdate() {
        if (!prefs.autoUpdate || System.currentTimeMillis() - prefs.lastUpdateCheck < 6 * 3600_000L) return
        checkForUpdate(manual = false)
    }

    /** [manual]: asked for in Settings, so "you have the newest" and connection problems are said. */
    fun checkForUpdate(manual: Boolean) {
        val now = _update.value.state
        if (now == UpdateState.CHECKING || now == UpdateState.DOWNLOADING || now == UpdateState.INSTALLING) return
        if (manual) _update.update { it.copy(state = UpdateState.CHECKING, message = null) }
        updateJob = viewModelScope.launch {
            try {
                val found = withContext(Dispatchers.IO) { updater.check() }
                prefs.lastUpdateCheck = System.currentTimeMillis()
                _update.value = if (found != null) UpdateUi(UpdateState.AVAILABLE, found)
                else UpdateUi(if (manual) UpdateState.UP_TO_DATE else UpdateState.IDLE)
            } catch (e: Exception) {
                // no connection, or GitHub busy: when it was not asked for, nothing is said
                _update.update { if (manual) UpdateUi(UpdateState.FAILED, it.update, message = "Could not look for updates. Is the phone online?") else it }
            }
        }
    }

    /** Downloads the newer version and hands it to Android's installer (which replaces the app, keeping its data). */
    fun installUpdate() {
        val u = _update.value.update ?: return
        val now = _update.value.state
        if (now == UpdateState.DOWNLOADING || now == UpdateState.INSTALLING) return
        if (_listen.value.status == ListenStatus.RECORDING || _listen.value.status == ListenStatus.SAVING) {
            _update.update { it.copy(state = UpdateState.FAILED, message = "Finish the take first: updating restarts the app") }
            return
        }
        stopPlayback()
        io.github.e1caro.scorebook.data.Updater.installProblem.value = null
        _update.value = UpdateUi(UpdateState.DOWNLOADING, u)
        updateJob = viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    val apk = updater.download(u) { p -> _update.update { it.copy(progress = p) } }
                    _update.value = UpdateUi(UpdateState.INSTALLING, u, 1f)
                    updater.install(apk)
                }
            } catch (e: Exception) {
                _update.value = UpdateUi(UpdateState.FAILED, u, message = "The update could not be downloaded. Check the connection and free space, then try again.")
            }
        }
    }

    init {
        // the installer's own verdict (cancelled, no space, …) arrives separately
        viewModelScope.launch {
            io.github.e1caro.scorebook.data.Updater.installProblem.collect { problem ->
                if (problem != null) {
                    // only while an install is under way: an old verdict says nothing about now
                    _update.update { if (it.state == UpdateState.INSTALLING) UpdateUi(UpdateState.FAILED, it.update, message = problem) else it }
                    io.github.e1caro.scorebook.data.Updater.installProblem.value = null
                }
            }
        }
    }

    // ------------------------------------------------------------------ accompaniments and motifs
    private val _accompany = MutableStateFlow<AccompanyUi?>(null)
    /** The accompaniment screen, when it is open. */
    val accompany: StateFlow<AccompanyUi?> = _accompany
    private val _practice = MutableStateFlow(prefs.practice)
    /** Days practised with the play-along check, and the best result of each study. */
    val practice: StateFlow<PracticeLog> = _practice

    private fun today(): Long = java.time.LocalDate.now().toEpochDay()

    /** Days in a row with a passed play-along check. */
    fun streak(): Int = _practice.value.streak(today())

    /** The keys the player uses most (from the library), most used first. */
    private fun favoriteKeys(): List<Key> = _library.value.takes.filter { it.trashedAt == null }.groupingBy { it.key }.eachCount()
        .entries.sortedByDescending { it.value }.mapNotNull { e -> try { Key.parse(e.key) } catch (_: Exception) { null } }

    // "Another one": how many times today's pattern and today's motif were turned down (back to zero the next day)
    private val _skips = MutableStateFlow(prefs.skips.let { if (it.first == today()) it.second to it.third else 0 to 0 })
    /** Changes when the player asks for another recommendation. */
    val skips: StateFlow<Pair<Int, Int>> = _skips

    /** Today's accompaniment: the same all day (until another one is asked for), in one of the player's keys most days. */
    fun dailyPick(): DailyPick = Daily.pick(today() + 4L * _skips.value.first, favoriteKeys())

    /** Today's motif: a figure musicians reuse (a bass line, a riff, a sequence, an ending). */
    fun dailyMotif(): MotifPick = Daily.motif(today() + 5L * _skips.value.second, favoriteKeys())

    /**
     * "Another one": today's recommended pattern (or motif, with [motif]) is replaced by a different one. Every
     * pattern comes round before one repeats. If the accompaniment screen is open, it shows the new one.
     */
    fun anotherRecommendation(motif: Boolean) {
        val cur = _skips.value
        val next = if (motif) cur.first to cur.second + 1 else cur.first + 1 to cur.second
        _skips.value = next
        prefs.skips = Triple(today(), next.first, next.second)
        if (_accompany.value != null) { if (motif) openMotif() else openAccompaniment() }
    }

    private fun accompanyUi(study: Study): AccompanyUi {
        val t = study.transcription()
        val score = ScoreBuilder().build(t, study.name, study.harmony, exactLengths = true)
        val lib = _library.value
        val last = lib.takes.filter { it.trashedAt == null }.maxByOrNull { it.created }
        val log = _practice.value
        return AccompanyUi(study, study == dailyPick() || study == dailyMotif(), t, score, last?.id, last?.let { lib.song(it.songId)?.title }, last?.meter,
            streak = log.streak(today()), bestStars = log.stars(study.id))
    }

    /** Opens the accompaniment screen on today's pick, or on [pattern] (in today's key). */
    fun openAccompaniment(pattern: Pattern? = null) {
        stopPlayback()
        stopCheck()
        val today = dailyPick()
        _accompany.value = accompanyUi(if (pattern == null || pattern.id == today.pattern.id) today else Daily.withPattern(pattern, today.key))
    }

    /** Opens the same screen on today's motif, or on [motif] (in a key the player uses). */
    fun openMotif(motif: Motif? = null) {
        stopPlayback()
        stopCheck()
        val today = dailyMotif()
        _accompany.value = accompanyUi(if (motif == null || motif.id == today.motif.id) today else Daily.withMotif(motif, favoriteKeys(), today()))
    }

    fun closeAccompaniment() { stopPlayback(); stopCheck(); _accompany.value = null }

    private fun changeStudy(change: (Study) -> Study) {
        val a = _accompany.value ?: return
        stopPlayback()
        stopCheck()
        _accompany.value = accompanyUi(change(a.study))
    }

    /** Another pattern, in the key on screen. */
    fun accompanyPattern(pattern: Pattern) = changeStudy { cur ->
        val today = dailyPick()
        if (pattern.id == today.pattern.id && cur.key == today.key) today else Daily.withPattern(pattern, cur.key)
    }

    /** Another motif: in the key on screen when its mode fits, otherwise in one the player uses. */
    fun accompanyMotif(motif: Motif) = changeStudy { cur ->
        val today = dailyMotif()
        when {
            motif.id == today.motif.id -> today
            cur.key.mode == motif.mode -> MotifPick(motif, cur.key, motif.bpm)
            else -> Daily.withMotif(motif, favoriteKeys(), today())
        }
    }

    fun accompanyTranspose(semitones: Int) = changeStudy { it.transposed(semitones) }
    fun accompanyTempo(delta: Int) = changeStudy { it.withTempo(delta) }

    /** The next chord progression that suits the pattern. */
    fun accompanyNextChords() = changeStudy { st ->
        val p = st as? DailyPick ?: return@changeStudy st
        val ids = p.pattern.progressions
        p.copy(progression = Progressions.byId(ids[(ids.indexOf(p.progression.id) + 1) % ids.size]))
    }

    fun toggleAccompanyPlay() {
        if (_playback.value.playing || _playback.value.preparing) { stopPlayback(); return }
        val a = _accompany.value ?: return
        stopCheck()
        playJob?.cancel()
        player.stop()
        _playback.update { it.copy(preparing = true, playing = false) }
        playJob = viewModelScope.launch {
            val pcm = withContext(Dispatchers.Default) {
                val synth = io.github.e1caro.scorebook.core.play.PianoSynth
                synth.render(synth.voices(a.study.transcription(Studies.repeats(a.study))), 22050)
            }
            val ok = player.play(pcm, 22050, 0.0, 1f)
            _playback.update { it.copy(preparing = false, playing = ok, length = pcm.size / 22050.0) }
            if (!ok) _accompany.update { it?.copy(message = PLAY_PROBLEM) }
            while (ok && player.isPlaying) delay(100)
            if (ok) _playback.update { it.copy(playing = false) }
        }
    }

    // ---- the play-along check: the player plays what is on the page, the app says how it went

    /** One run of the check (worker thread): the audio so far through the model, or the MIDI notes. */
    private class CheckRun(val study: Study, val stream: FrameStream?, val resampler: Resampler?, val timeScale: Double, val maxSeconds: Double) {
        val startNanos = System.nanoTime()
        var samples = 0L
        var firstLoud = -1L
        var lastLoud = 0L
        val midi = ArrayList<PlayAlong.Played>()
        fun seconds() = (System.nanoTime() - startNanos) / 1e9
    }

    @Volatile private var checkRun: CheckRun? = null

    /**
     * Starts listening for the study on screen: play it once, at any tempo. It ends by itself 2.5 s after the
     * playing stops (or with [finishCheck]). Needs the microphone, or a connected MIDI keyboard.
     */
    fun startCheck(micAllowed: Boolean) {
        val a = _accompany.value ?: return
        stopPlayback()
        this.micAllowed = micAllowed || this.micAllowed
        _accompany.update { it?.copy(check = CheckUi(CheckState.LISTENING), message = null) }
        worker.execute {
            if (recorder.state == AutoRecorder.State.RECORDING) { _accompany.update { it?.copy(check = null) }; return@execute }
            // long enough to play it at half speed, with time to get the hands ready
            val written = a.transcription.notes.maxOfOrNull { it.offset } ?: 10.0
            val maxSeconds = (written * 2 + 15).coerceAtMost(180.0)
            if (midiName != null) {
                checkRun = CheckRun(a.study, null, null, 1.0, maxSeconds)
                return@execute
            }
            val m = ensureModel()
            if (m == null || !this.micAllowed || (!audio.isRunning && !audio.start())) {
                _accompany.update { it?.copy(check = null, message = "The microphone is not available") }
                return@execute
            }
            val comp = TuningCompensation(audio.sampleRate, appliedTuning())
            checkRun = CheckRun(a.study, FrameStream(m), Resampler(comp.effectiveRate, m.spec.sampleRate), comp.timeScale, maxSeconds)
        }
    }

    /** Audio (or the clock tick, with a MIDI keyboard) while a check is listening (worker thread). */
    private fun feedCheck(run: CheckRun, block: FloatArray) {
        val seconds = run.seconds()
        var level = -90.0
        if (run.stream != null) {
            var sum = 0.0
            for (x in block) sum += x * x
            level = 10 * kotlin.math.log10(maxOf(sum / maxOf(1, block.size), 1e-12))
            run.samples += block.size
            if (level > maxOf(recorder.noiseFloorDb + 10, -55.0)) {
                if (run.firstLoud < 0) run.firstLoud = run.samples
                run.lastLoud = run.samples
            }
            run.stream.push(run.resampler!!.process(block))
        }
        val heard = if (run.stream != null) run.firstLoud >= 0 else run.midi.isNotEmpty()
        val quiet = if (run.stream != null) (run.samples - run.lastLoud).toDouble() / audio.sampleRate else seconds - (run.midi.lastOrNull()?.time ?: seconds)
        _accompany.update { u -> u?.copy(check = u.check?.takeIf { it.state == CheckState.LISTENING }?.copy(seconds = seconds, levelDb = level, heard = heard) ?: u.check) }
        if ((heard && quiet >= 2.5) || seconds >= run.maxSeconds || (!heard && seconds >= 25)) finishCheckNow()
    }

    /** The "I'm done" button. */
    fun finishCheck() = worker.execute { finishCheckNow() }

    private fun finishCheckNow() {
        val run = checkRun ?: return
        checkRun = null
        _accompany.update { it?.copy(check = CheckUi(CheckState.ANALYZING)) }
        val played = if (run.stream != null) {
            run.stream.flush()
            val m = model
            if (m == null) emptyList() else Decoder.forModel(m.spec, repo.personal().calibration).decode(run.stream.grid)
                .filter { it.presence >= 0.5 }.map { PlayAlong.Played(it.pitch, it.onset * run.timeScale) }
        } else run.midi.toList()
        updateIdleMic()
        showCheckResult(run.study, played)
    }

    /** Compares [played] with [study], shows the result and keeps it in the practice log (also used by the on-device test). */
    fun showCheckResult(study: Study, played: List<PlayAlong.Played>) {
        val result = PlayAlong.check(PlayAlong.targets(study.transcription()), played)
        val log = _practice.value.record(today(), study.id, result.stars)
        if (log != _practice.value) { prefs.practice = log; _practice.value = log }
        _accompany.update { u ->
            if (u == null || u.study != study) u
            else u.copy(check = CheckUi(CheckState.DONE, result = result), streak = log.streak(today()), bestStars = log.stars(study.id))
        }
    }

    /** Stops listening without a result, or closes the result. */
    fun stopCheck() {
        if (_accompany.value?.check == null && checkRun == null) return
        _accompany.update { it?.copy(check = null) }
        worker.execute { if (checkRun != null) { checkRun = null; updateIdleMic() } }
    }

    /**
     * "Accompany my song": saves a new song with the take's right hand as it was played and [pattern] in the left
     * hand, following the chords of each bar on the take's own beats, and opens it.
     */
    fun accompanySong(takeId: String, pattern: Pattern) {
        val lib = _library.value
        val meta = lib.takes.firstOrNull { it.id == takeId } ?: return
        val song = lib.song(meta.songId) ?: return
        stopPlayback()
        _opening.value = true
        viewModelScope.launch {
            val title = "${song.title} + ${pattern.name}"
            val newId = try {
                withContext(Dispatchers.Default) {
                    val data = repo.take(takeId) ?: return@withContext null
                    val personal = repo.personal()
                    val source = data.editedEvents()
                    // in the key it was played in: transposition is applied again when the new song is shown
                    val t = Transcriber(personal).analyze(source, data.settings.copy(transpose = 0), data.overrides)
                    val events = Accompaniment.apply(pattern, t, source) ?: return@withContext null
                    val id = "t" + System.currentTimeMillis().toString(36) + UUID.randomUUID().toString().take(4)
                    val kept = events.map { it.id }.toSet()
                    val newData = TakeData(id, events, data.overrides.filterKeys { it in kept }, Accompaniment.settingsFor(t, data.settings), hasAudio = false)
                    repo.save(newData)
                    val t2 = Transcriber(personal).analyze(events, newData.settings, newData.overrides)
                    val created = System.currentTimeMillis()
                    val newMeta = TakeMeta(id, "s$id", created, events.maxOfOrNull { it.offset } ?: 0.0, t2.mainKey.displayName, t2.bpm,
                        "${t2.grid.numerator}/${t2.grid.denominator}", meta.source, t2.notes.size)
                    val now = repo.library()
                    val newLib = now.copy(songs = now.songs + Song("s$id", Library.INBOX, title, false, created), takes = now.takes + newMeta)
                    repo.save(newLib)
                    _library.value = newLib
                    id
                }
            } finally {
                _opening.value = false
            }
            if (newId != null) {
                _accompany.value = null
                openTake(newId, "Saved as “$title”: your right hand, with a new left hand")
            } else {
                val msg = "A ${pattern.meter.label} pattern does not fit this song (${meta.meter})"
                _accompany.update { it?.copy(message = msg) }
                _take.update { it?.copy(message = msg) }
            }
        }
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

    fun clearMessage() {
        _listen.update { it.copy(message = null) }
        _take.update { it?.copy(message = null) }
        _accompany.update { it?.copy(message = null) }
    }

    fun aiDecidedCount(t: Transcription): Int = t.notes.count { it.decision == Decision.CONTEXT || it.decision == Decision.UNSURE }

    fun durationText(seconds: Double): String { val s = seconds.roundToInt(); return "%d:%02d".format(s / 60, s % 60) }

    override fun onCleared() {
        player.stop()
        beeper.stop()
        audio.stop()
        midi.stop()
        // the model is released by the worker itself, after whatever it is doing: closing it under a running
        // inference crashes, and closing "nothing" while it is still loading would leak it
        worker.execute { model?.close(); model = null }
        worker.shutdown()
    }
}
