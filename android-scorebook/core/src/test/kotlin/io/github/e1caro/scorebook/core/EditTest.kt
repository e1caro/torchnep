package io.github.e1caro.scorebook.core

import io.github.e1caro.scorebook.core.correct.AnalysisSettings
import io.github.e1caro.scorebook.core.correct.Hand
import io.github.e1caro.scorebook.core.correct.NoteOverride
import io.github.e1caro.scorebook.core.correct.Transcriber
import io.github.e1caro.scorebook.core.engrave.Engraver
import io.github.e1caro.scorebook.core.library.Edit
import io.github.e1caro.scorebook.core.library.Edits
import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.score.ScoreBuilder
import io.github.e1caro.scorebook.core.transcribe.NoteDecoder
import io.github.e1caro.scorebook.core.transcribe.NoteEvent
import org.junit.Test
import kotlin.math.abs
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class EditTest {
    private val events by lazy { NoteDecoder().decode(Fixture("modulation_clean").grid()) }

    /** Start of bar [n] (1-based) in seconds. */
    private fun barTime(t: io.github.e1caro.scorebook.core.correct.Transcription, n: Int) = t.grid.time(t.grid.firstBarBeat() + (n - 1.0) * t.grid.beatsPerBar)

    @Test
    fun cuttingBarsOutClosesTheGap() {
        val t = Transcriber().analyze(events)
        val (a, b) = barTime(t, 5) to barTime(t, 9) // remove bars 5-8
        val cut = Edits.apply(events, listOf(Edit.Cut(a, b)))
        val original = events.associateBy { it.id }
        assertTrue(cut.none { original[it.id]!!.onset >= a && original[it.id]!!.onset < b }, "nothing from the cut bars is left")
        assertTrue(cut.size < events.size)
        val t2 = Transcriber().analyze(cut)
        val s1 = ScoreBuilder().build(t, "x")
        val s2 = ScoreBuilder().build(t2, "x")
        println("bars before ${s1.measures.size}, after ${s2.measures.size}; keys ${t2.keyChanges().map { it.key }}")
        assertTrue(abs(s1.measures.size - 4 - s2.measures.size) <= 1)
        // what was bar 9 now starts at bar 5 (G major part follows the C major start)
        assertEquals(listOf(Key.parse("C major"), Key.parse("G major")), t2.keyChanges().map { it.key })
    }

    @Test
    fun keepingOnlySomeBars() {
        val t = Transcriber().analyze(events)
        val (a, b) = barTime(t, 9) to barTime(t, 17) // the G major half
        val kept = Edits.apply(events, listOf(Edit.Keep(a, b)))
        assertTrue(kept.all { it.onset >= 0 && it.onset < b - a })
        val t2 = Transcriber().analyze(kept)
        assertEquals(Key.parse("G major"), t2.mainKey)
        val bars = ScoreBuilder().build(t2, "x").measures.size
        assertTrue(bars in 7..9, "bars $bars")
        // and the same edit on the recording
        val pcm = ShortArray(22050 * 45) { (it % 100).toShort() }
        val cutPcm = Edits.apply(pcm, 22050, listOf(Edit.Keep(a, b)))
        assertTrue(abs(((b - a) * 22050).toInt() - cutPcm.size) <= 2)
    }

    @Test
    fun editsStack() {
        val e = listOf(NoteEvent.midi(1, 60, 0.0, 0.5, 80), NoteEvent.midi(2, 62, 1.0, 1.5, 80), NoteEvent.midi(3, 64, 2.0, 2.5, 80), NoteEvent.midi(4, 65, 3.0, 3.5, 80))
        val out = Edits.apply(e, listOf(Edit.Cut(0.9, 1.9), Edit.Keep(0.5, 3.0)))
        // after the cut: 60@0, 64@1.0, 65@2.0; keep [0.5, 3.0): 64@0.5, 65@1.5
        assertEquals(listOf(64 to 0.5, 65 to 1.5), out.map { it.pitch to it.onset })
    }

    @Test
    fun fixingTempoKeyAndHands() {
        val det = NoteDecoder().decode(Fixture("nocturne_detuned").grid())
        val t = Transcriber().analyze(det)
        assertTrue(t.bpm > 120, "the known double-speed reading: ${t.bpm}")
        val fixed = Transcriber().analyze(det, AnalysisSettings(tempoScale = 0.5))
        assertTrue(abs(fixed.bpm - 72) <= 4, "halved: ${fixed.bpm}")
        val forced = Transcriber().analyze(events, AnalysisSettings(key = Key.parse("A minor")))
        assertEquals(listOf(Key.parse("A minor")), forced.keyChanges().map { it.key })
        val n = t.notes.first { it.hand == Hand.RIGHT }
        val moved = Transcriber().analyze(det, AnalysisSettings(), mapOf(n.eventId to NoteOverride(hand = Hand.LEFT)))
        assertEquals(Hand.LEFT, moved.notes.first { it.eventId == n.eventId }.hand)
        assertEquals(t.decision(n.eventId)!!.decision, moved.decision(n.eventId)!!.decision) // a hand move is not a pitch choice
    }

    @Test
    fun barsCanBeTapped() {
        val t = Transcriber().analyze(events)
        val page = Engraver().continuous(ScoreBuilder().build(t, "x"), 400.0)
        assertTrue(page.bars.size >= 16)
        val b5 = page.bars.first { it.number == 5 }
        assertEquals(5, page.barAt(b5.x + b5.w / 2, b5.y + b5.h / 2))
    }
}
