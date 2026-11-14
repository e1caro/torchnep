package io.github.e1caro.scorebook.core.live

import io.github.e1caro.scorebook.core.correct.AnalysisSettings
import io.github.e1caro.scorebook.core.correct.Decision
import io.github.e1caro.scorebook.core.correct.Hand
import io.github.e1caro.scorebook.core.correct.PersonalModel
import io.github.e1caro.scorebook.core.correct.Transcriber
import io.github.e1caro.scorebook.core.engrave.LiveNote
import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.music.Mode
import io.github.e1caro.scorebook.core.transcribe.BasicPitchStream
import io.github.e1caro.scorebook.core.transcribe.FrameModel
import io.github.e1caro.scorebook.core.transcribe.LiveDecoder
import io.github.e1caro.scorebook.core.transcribe.NoteDecoder
import io.github.e1caro.scorebook.core.transcribe.NoteEvent

/** What the live screen shows. */
data class LiveView(val notes: List<LiveNote>, val key: Key, val keyConfidence: Double, val seconds: Double)

/**
 * One take being recorded: audio (22.05 kHz) goes through the model and the live decoder; MIDI goes through the
 * note tracker. [view] runs the full analysis on what was played so far (call it a few times per second at most,
 * off the UI thread); [finish] returns the final note events for the take.
 */
class LiveSession(model: FrameModel?, private val personal: PersonalModel = PersonalModel(), private val settings: AnalysisSettings = AnalysisSettings()) {
    private val stream = model?.let { BasicPitchStream(it) }
    private val decoder = LiveDecoder(NoteDecoder(personal.calibration))
    val midi = MidiNoteTracker()
    private var midiStart = -1.0

    val seconds: Double get() = stream?.seconds ?: 0.0

    /** Audio at 22.05 kHz. Returns the notes newly heard (to keep the take alive). */
    fun pushAudio(samples: FloatArray, n: Int = samples.size): List<NoteEvent> {
        val s = stream ?: return emptyList()
        if (s.push(samples, 0, n) == 0) return emptyList()
        return decoder.update(s.grid)
    }

    fun midiTime(nowSeconds: Double): Double { if (midiStart < 0) midiStart = nowSeconds; return nowSeconds - midiStart }

    fun events(now: Double): List<NoteEvent> = if (midi.events.isNotEmpty() || stream == null) midi.snapshot(now) else decoder.events

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
        return LiveView(notes, key, 1.0, now)
    }

    /** Ends the take: decodes the remaining audio. */
    fun finish(now: Double): List<NoteEvent> {
        if (midi.events.isNotEmpty() || stream == null) return midi.finish(now)
        stream.flush()
        decoder.update(stream.grid, final = true)
        // the whole take, decoded in one pass (better ends and merges than the incremental pieces)
        return NoteDecoder(personal.calibration).decode(stream.grid)
    }
}
