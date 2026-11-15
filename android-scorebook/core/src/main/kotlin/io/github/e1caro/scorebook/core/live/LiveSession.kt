package io.github.e1caro.scorebook.core.live

import io.github.e1caro.scorebook.core.correct.AnalysisSettings
import io.github.e1caro.scorebook.core.correct.Decision
import io.github.e1caro.scorebook.core.correct.Hand
import io.github.e1caro.scorebook.core.correct.PersonalModel
import io.github.e1caro.scorebook.core.correct.Transcriber
import io.github.e1caro.scorebook.core.engrave.LiveNote
import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.music.Mode
import io.github.e1caro.scorebook.core.transcribe.Decoder
import io.github.e1caro.scorebook.core.transcribe.FrameModel
import io.github.e1caro.scorebook.core.transcribe.FrameStream
import io.github.e1caro.scorebook.core.transcribe.LiveDecoder
import io.github.e1caro.scorebook.core.transcribe.NoteDecoder
import io.github.e1caro.scorebook.core.transcribe.NoteEvent

/** What the live screen shows. */
data class LiveView(val notes: List<LiveNote>, val key: Key, val keyConfidence: Double, val seconds: Double, val bpm: Int = 0)

/**
 * One take being recorded: audio (at the model's sample rate) goes through the model and the live decoder; MIDI goes through the
 * note tracker. [view] runs the full analysis on what was played so far (call it a few times per second at most,
 * off the UI thread); [finish] returns the final note events for the take.
 */
class LiveSession(
    model: FrameModel?,
    private val personal: PersonalModel = PersonalModel(),
    private val settings: AnalysisSettings = AnalysisSettings(),
    /** Model seconds × this = real seconds (tuning compensation plays the audio to the model a little faster or slower). */
    private val timeScale: Double = 1.0,
) {
    private val stream = model?.let { FrameStream(it) }
    private val noteDecoder: Decoder = model?.let { Decoder.forModel(it.spec, personal.calibration) } ?: NoteDecoder(personal.calibration)
    private val decoder = LiveDecoder(noteDecoder)
    val midi = MidiNoteTracker()
    private var midiStart = -1.0

    val seconds: Double get() = (stream?.seconds ?: 0.0) * timeScale

    private fun scaled(events: List<NoteEvent>): List<NoteEvent> =
        if (timeScale == 1.0) events else events.map { it.copy(onset = it.onset * timeScale, offset = it.offset * timeScale) }

    /** Audio at the model's sample rate. Returns the notes newly heard (to keep the take alive). */
    fun pushAudio(samples: FloatArray, n: Int = samples.size): List<NoteEvent> {
        val s = stream ?: return emptyList()
        if (s.push(samples, 0, n) == 0) return emptyList()
        return scaled(decoder.update(s.grid))
    }

    fun midiTime(nowSeconds: Double): Double { if (midiStart < 0) midiStart = nowSeconds; return nowSeconds - midiStart }

    /** Up to when the notes are known (MIDI: now; audio: what the model has decoded). */
    fun knownUntil(now: Double): Double = if (midi.events.isNotEmpty() || stream == null) now else decoder.decodedSeconds * timeScale

    fun events(now: Double): List<NoteEvent> = if (midi.events.isNotEmpty() || stream == null) midi.snapshot(now) else scaled(decoder.events)

    fun view(now: Double): LiveView {
        val ev = events(now)
        if (ev.isEmpty()) return LiveView(emptyList(), Key(0, Mode.MAJOR), 0.0, now)
        val t = Transcriber(personal).analyze(ev, settings)
        val byId = t.notes.associateBy { it.eventId }
        val notes = ev.mapNotNull { e ->
            val d = t.decision(e.id) ?: return@mapNotNull null
            if (!d.present) return@mapNotNull null
            val hand = byId[e.id]?.hand ?: if (d.pitch >= 60) Hand.RIGHT else Hand.LEFT
            LiveNote(e.id, d.pitch, e.onset, e.offset, hand, d.decision == Decision.CONTEXT || d.decision == Decision.UNSURE)
        }
        val key = t.keys.lastOrNull()?.key ?: Key(0, Mode.MAJOR)
        return LiveView(notes, key, 1.0, now, if (notes.size >= 8) t.bpm else 0)
    }

    /** Ends the take: decodes the remaining audio. */
    fun finish(now: Double): List<NoteEvent> {
        if (midi.events.isNotEmpty() || stream == null) return midi.finish(now)
        stream.flush()
        decoder.update(stream.grid, final = true)
        // the whole take, decoded in one pass (better ends and merges than the incremental pieces)
        return scaled(noteDecoder.decode(stream.grid))
    }
}
