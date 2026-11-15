package io.github.e1caro.scorebook.core

import io.github.e1caro.scorebook.core.correct.AnalysisSettings
import io.github.e1caro.scorebook.core.correct.Decision
import io.github.e1caro.scorebook.core.correct.Transcriber
import io.github.e1caro.scorebook.core.correct.Transcription
import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.transcribe.NoteEvent
import io.github.e1caro.scorebook.core.transcribe.OnsetsFramesDecoder
import org.junit.Test
import kotlin.math.abs
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * The model the app ships with (Onsets and Frames) on the rendered test pieces, in tune and badly out of tune:
 * notes, the notes inside chords, tempo, meter, keys. (Results on real piano recordings: README.)
 */
class OnsetsFramesTest {
    private val cache = HashMap<String, List<NoteEvent>>()
    private fun events(name: String) = cache.getOrPut(name) { OnsetsFramesDecoder().decode(Fixture(name).ofGrid()) }
    private fun analyze(name: String, musical: Double = 0.6) = Transcriber().analyze(events(name), AnalysisSettings(musical = musical))
    private fun score(t: Transcription, fx: Fixture) = Score.of(t.notes.map { it.pitch to it.onset }, fx.truth)

    /** Share of the played notes that belong to a chord (3+ notes struck together) and were found. */
    private fun chordRecall(t: Transcription, fx: Fixture): Double {
        val chord = fx.truth.filter { n -> fx.truth.count { abs(it.on - n.on) < 0.03 } >= 3 }
        val found = chord.count { n -> t.notes.any { it.pitch == n.pitch && abs(it.onset - n.on) <= 0.05 } }
        return found.toDouble() / maxOf(1, chord.size)
    }

    @Test
    fun inTunePiecesAreTranscribedAlmostPerfectly() {
        val keys = mapOf("modulation_clean" to listOf("C major", "G major"), "waltz_clean" to listOf("A minor"), "nocturne_clean" to listOf("D minor"))
        for ((name, expectedKeys) in keys) {
            val fx = Fixture(name)
            val t = analyze(name)
            val s = score(t, fx)
            println("OF $name: $s | chords %.2f | %d BPM %d/%d | %s".format(chordRecall(t, fx), t.bpm, t.grid.numerator, t.grid.denominator, t.keyChanges().map { it.key }))
            assertTrue(s.f1 >= 0.95, "$name F1 ${s.f1}")
            assertTrue(s.recall >= 0.98, "$name recall ${s.recall}")
            assertTrue(chordRecall(t, fx) >= 0.98, "$name: notes inside chords ${chordRecall(t, fx)}")
            assertTrue(abs(t.grid.bpm - fx.bpm) / fx.bpm < 0.04, "$name tempo ${t.grid.bpm}")
            assertEquals(fx.meter, listOf(t.grid.numerator, t.grid.denominator), name)
            assertEquals(expectedKeys.map { Key.parse(it) }, t.keyChanges().map { it.key }, name)
        }
    }

    @Test
    fun aBadlyOutOfTunePianoStillGivesAUsableScore() {
        // a third of the notes 35–60 cents off, each differently: far worse than a real neglected piano
        for (name in listOf("modulation_detuned", "waltz_detuned", "nocturne_detuned")) {
            val fx = Fixture(name)
            val t = analyze(name)
            val s = score(t, fx)
            println("OF $name: $s | chords %.2f | %d BPM | %s".format(chordRecall(t, fx), t.bpm, t.keyChanges().map { it.key }))
            assertTrue(s.f1 >= 0.8, "$name F1 ${s.f1}")
            assertTrue(abs(t.grid.bpm - fx.bpm) / fx.bpm < 0.04, "$name tempo ${t.grid.bpm}")
        }
        // the key change is still found (the small model missed it)
        assertEquals(listOf(Key.parse("C major"), Key.parse("G major")), analyze("modulation_detuned").keyChanges().map { it.key })
    }

    @Test
    fun contextDoesNotSpoilWhatTheModelHeardClearly() {
        for (name in Fixture.ALL) {
            val fx = Fixture(name)
            val literal = score(analyze(name, 0.0), fx)
            val musical = score(analyze(name, 0.6), fx)
            val full = score(analyze(name, 1.0), fx)
            assertTrue(musical.f1 >= literal.f1 - 0.012, "$name: musical $musical vs literal $literal")
            assertTrue(full.f1 >= literal.f1 - 0.02, "$name: fully musical $full vs literal $literal")
            // with a good model few notes need the context at all
            val t = analyze(name)
            val ai = t.decisions.count { it.present && it.decision == Decision.CONTEXT }
            assertTrue(ai <= t.notes.size / 5, "$name: $ai of ${t.notes.size} notes AI-decided")
        }
    }

    @Test
    fun aTrillIsNotMistakenForAnUnclearNote() {
        // E5 and F5 alternating every 64 ms: each note's neighbour is about to sound, which must not count as doubt
        val frames = 60
        val on = FloatArray(frames * 88)
        val fr = FloatArray(frames * 88)
        for (i in 0 until 12) {
            val k = (if (i % 2 == 0) 76 else 77) - 21
            val t = 4 + i * 2
            on[t * 88 + k] = 0.95f
            if (t > 0) on[(t - 1) * 88 + k] = 0.45f // the onset probability rises a frame early
            for (d in 0..2) fr[(t + d) * 88 + k] = 0.9f
        }
        val ev = OnsetsFramesDecoder().decode(io.github.e1caro.scorebook.core.transcribe.ProbabilityGrid.of(on, fr, 31.25))
        assertEquals(12, ev.size)
        assertEquals(List(12) { if (it % 2 == 0) 76 else 77 }, ev.map { it.pitch })
        assertTrue(ev.all { it.audioTop > 0.9 }, ev.map { "%.2f".format(it.audioTop) }.toString())
    }

    @Test
    fun velocitiesAndTimingComeFromTheModel() {
        val fx = Fixture("nocturne_clean")
        val ev = events("nocturne_clean")
        // loud right hand, soft left hand in the rendering (88 vs 64): the model's velocities follow
        val right = fx.truth.filter { it.hand == "R" }.mapNotNull { t -> ev.firstOrNull { it.pitch == t.pitch && abs(it.onset - t.on) < 0.05 }?.velocity }
        val left = fx.truth.filter { it.hand == "L" }.mapNotNull { t -> ev.firstOrNull { it.pitch == t.pitch && abs(it.onset - t.on) < 0.05 }?.velocity }
        assertTrue(right.average() > left.average() + 5, "right ${right.average()} left ${left.average()}")
        // onsets within a few milliseconds on average, though a frame is 32 ms
        val errs = fx.truth.mapNotNull { t -> ev.filter { it.pitch == t.pitch && abs(it.onset - t.on) < 0.05 }.minByOrNull { abs(it.onset - t.on) }?.let { abs(it.onset - t.on) } }
        println("OF onset timing: mean |error| %.1f ms".format(errs.average() * 1000))
        assertTrue(errs.average() < 0.012, "mean onset error ${errs.average()}")
    }
}
