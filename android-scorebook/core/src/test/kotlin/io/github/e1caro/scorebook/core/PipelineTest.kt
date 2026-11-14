package io.github.e1caro.scorebook.core

import io.github.e1caro.scorebook.core.correct.AnalysisSettings
import io.github.e1caro.scorebook.core.correct.Hand
import io.github.e1caro.scorebook.core.correct.Transcriber
import io.github.e1caro.scorebook.core.correct.Transcription
import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.transcribe.NoteDecoder
import io.github.e1caro.scorebook.core.transcribe.NoteEvent
import org.junit.Test
import kotlin.math.abs
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * End-to-end on the real model's output for rendered piano pieces (see tools/make_fixtures.py): transcription
 * quality, tempo, meter, key (with the modulation), and the core promise of the corrector — context fixes torn
 * notes, never changes clear ones, and does not undo a real key change.
 */
class PipelineTest {
    private val cache = HashMap<String, List<NoteEvent>>()
    private fun events(name: String) = cache.getOrPut(name) { NoteDecoder().decode(Fixture(name).grid()) }
    private fun analyze(name: String, musical: Double) = Transcriber().analyze(events(name), AnalysisSettings(musical = musical))
    private fun score(t: Transcription, fx: Fixture) = Score.of(t.notes.map { it.pitch to it.onset }, fx.truth)

    @Test
    fun cleanRecordingsTranscribeWell() {
        for (name in listOf("modulation_clean", "waltz_clean", "nocturne_clean")) {
            val fx = Fixture(name)
            val t = analyze(name, 0.6)
            val s = score(t, fx)
            println("$name: $s, ${t.bpm} BPM, ${t.grid.numerator}/${t.grid.denominator}, keys ${t.keyChanges().map { it.key }}")
            assertTrue(s.f1 >= 0.85, "$name F1 ${s.f1}")
            assertTrue(abs(t.grid.bpm - fx.bpm) / fx.bpm < 0.04, "$name tempo ${t.grid.bpm} vs ${fx.bpm}")
            assertEquals(fx.meter, listOf(t.grid.numerator, t.grid.denominator), name)
            assertTrue(abs(t.grid.time(t.grid.firstBarBeat().toDouble())) < 0.15, "$name: bar 1 should start with the first note")
        }
    }

    @Test
    fun keysAndModulation() {
        assertEquals(listOf(Key.parse("A minor")), analyze("waltz_clean", 0.6).keyChanges().map { it.key })
        assertEquals(listOf(Key.parse("D minor")), analyze("nocturne_clean", 0.6).keyChanges().map { it.key })
        val mod = analyze("modulation_clean", 0.6)
        assertEquals(listOf(Key.parse("C major"), Key.parse("G major")), mod.keyChanges().map { it.key })
        val change = mod.keyChanges()[1].time
        assertTrue(change in 17.0..21.0, "modulation at $change s (bar 9 starts at 20 s)")
        assertEquals(Key.parse("C major"), mod.mainKey)
    }

    @Test
    fun clearChromaticNotesSurviveEvenWhenFullyMusical() {
        // C#5 passing note (bar 7) in C major; G#4 / C#5 in D minor; G# leading tones in A minor
        val cases = mapOf("modulation_clean" to listOf(73), "nocturne_clean" to listOf(68, 73), "waltz_clean" to listOf(68, 80))
        for ((name, pitches) in cases) {
            val fx = Fixture(name)
            val t = analyze(name, 1.0)
            for (p in pitches) {
                val played = fx.truth.filter { it.pitch == p }
                val kept = played.count { tr -> t.notes.any { it.pitch == p && abs(it.onset - tr.on) < 0.05 } }
                val heard = played.count { tr -> analyze(name, 0.0).notes.any { it.pitch == p && abs(it.onset - tr.on) < 0.05 } }
                println("$name: pitch $p played ${played.size}, heard ${heard}, kept at Musical $kept")
                assertTrue(kept >= heard, "$name: a clearly heard $p was corrected away")
            }
        }
    }

    @Test
    fun contextFixesTornNotesAndNeverHarmsAtDefault() {
        var fixes = 0
        var harmsDefault = 0
        var harmsFull = 0
        for (name in Fixture.ALL) {
            val fx = Fixture(name)
            val ev = events(name)
            val literal = analyze(name, 0.0)
            val def = analyze(name, 0.6)
            val full = analyze(name, 1.0)
            for (tr in fx.truth) {
                val e = ev.filter { abs(it.onset - tr.on) <= 0.05 && abs(it.pitch - tr.pitch) <= 1 && it.options.any { o -> o.pitch == tr.pitch } }
                    .minByOrNull { abs(it.onset - tr.on) } ?: continue
                val l = literal.decision(e.id)!!.pitch
                val d = def.decision(e.id)!!.pitch
                val f = full.decision(e.id)!!.pitch
                if (l != tr.pitch && f == tr.pitch) fixes++
                if (l == tr.pitch && d != tr.pitch) harmsDefault++
                if (l == tr.pitch && f != tr.pitch) harmsFull++
            }
            // the musical setting must not make the transcription worse overall
            assertTrue(score(def, fx).f1 >= score(literal, fx).f1 - 0.01, "$name: musical ${score(def, fx)} vs literal ${score(literal, fx)}")
        }
        println("torn notes fixed at Musical: $fixes, harmed at default: $harmsDefault, harmed at Musical: $harmsFull")
        assertEquals(0, harmsDefault)
        assertTrue(fixes >= 8, "fixes $fixes")
        assertTrue(harmsFull * 4 <= fixes, "harms $harmsFull vs fixes $fixes")
    }

    @Test
    fun handsAreSplitSensibly() {
        for (name in listOf("modulation_clean", "waltz_clean", "nocturne_clean")) {
            val fx = Fixture(name)
            val t = analyze(name, 0.6)
            var ok = 0
            var n = 0
            for (note in t.notes) {
                val tr = fx.truth.firstOrNull { it.pitch == note.pitch && abs(it.on - note.onset) < 0.05 } ?: continue
                n++
                if ((tr.hand == "R") == (note.hand == Hand.RIGHT)) ok++
            }
            println("$name: hands $ok/$n")
            assertTrue(ok >= 0.9 * n, "$name hands $ok/$n")
        }
    }
}
