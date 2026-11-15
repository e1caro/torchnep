package io.github.e1caro.scorebook.core

import io.github.e1caro.scorebook.core.accompany.Accompaniment
import io.github.e1caro.scorebook.core.accompany.Daily
import io.github.e1caro.scorebook.core.accompany.Meter
import io.github.e1caro.scorebook.core.accompany.Patterns
import io.github.e1caro.scorebook.core.accompany.Progressions
import io.github.e1caro.scorebook.core.correct.AnalysisSettings
import io.github.e1caro.scorebook.core.correct.Hand
import io.github.e1caro.scorebook.core.correct.Transcriber
import io.github.e1caro.scorebook.core.engrave.Engraver
import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.music.pc
import io.github.e1caro.scorebook.core.play.PianoSynth
import io.github.e1caro.scorebook.core.score.ChordElement
import io.github.e1caro.scorebook.core.score.ScoreBuilder
import io.github.e1caro.scorebook.core.transcribe.OnsetsFramesDecoder
import org.junit.Test
import kotlin.math.abs
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class AccompanimentTest {
    @Test
    fun everyPatternFillsItsBarsAndCanBeEngravedAndPlayed() {
        assertTrue(Patterns.ALL.size >= 15)
        assertEquals(Patterns.ALL.size, Patterns.ALL.map { it.id }.toSet().size)
        for (p in Patterns.ALL) {
            // steps stay inside the bar and the bar is covered from its first beat to its end
            assertTrue(p.steps.all { it.tick >= 0 && it.tick + it.duration <= p.meter.barTicks }, p.id)
            assertEquals(0, p.steps.minOf { it.tick }, p.id)
            assertEquals(p.meter.barTicks, p.steps.maxOf { it.tick + it.duration }, p.id)
            assertTrue(p.progressions.isNotEmpty() && p.about.length > 30 && p.tip.length > 20, p.id)
            for (key in listOf(Key.parse("C major"), Key.parse("F# minor"), Key.parse("Bb major"))) {
                val pick = Daily.withPattern(p, key)
                val t = Accompaniment.transcription(pick, repeats = 2)
                val bars = pick.chords.size * 2
                val score = ScoreBuilder().build(t, p.name, pick.harmony)
                assertEquals(bars, score.measures.size, "${p.id} in $key")
                assertEquals(p.meter.label, "${score.numerator}/${score.denominator}")
                // left hand only, in a playable register, and the first chord symbol is the first chord
                assertTrue(t.notes.all { it.hand == Hand.LEFT && it.pitch in 26..68 }, "${p.id} in $key: ${t.notes.minOf { it.pitch }}..${t.notes.maxOf { it.pitch }}")
                assertTrue(score.measures.all { m -> m.staves[1].any { it is ChordElement } }, "${p.id}: every bar has notes")
                assertEquals(pick.chords.first().label(key), score.measures.first().chords.first().label)
                assertTrue(Engraver().continuous(score, 400.0).hits.size >= bars)
                assertTrue(PianoSynth.render(PianoSynth.voices(t)).size > 22050)
            }
        }
    }

    @Test
    fun patternsStayOnTheChord() {
        val key = Key.parse("D minor")
        for (p in Patterns.ALL.filter { it.id !in setOf("walking", "boogie") }) { // those two use passing tones on purpose
            val pick = Daily.withPattern(p, key)
            val notes = Accompaniment.notes(p, pick.chords)
            for (n in notes) assertTrue(pc(n.pitch) in pick.chords[n.bar].pitchClasses, "${p.id}: ${n.pitch} in bar ${n.bar} over ${pick.chords[n.bar].label(key)}")
            // the bar starts on the root
            for (bar in pick.chords.indices) assertEquals(pick.chords[bar].root, pc(notes.filter { it.bar == bar && it.tick == 0 }.minOf { it.pitch }), "${p.id} bar $bar")
        }
    }

    @Test
    fun theDailyPickIsStableVariedAndPersonal() {
        val mine = listOf(Key.parse("D minor"), Key.parse("Eb major"))
        assertEquals(Daily.pick(20000, mine), Daily.pick(20000, mine))
        val month = (20000L until 20030L).map { Daily.pick(it, mine) }
        assertEquals(Patterns.ALL.size, month.map { it.pattern.id }.toSet().size, "a month shows every pattern")
        assertTrue(month.zipWithNext().all { (a, b) -> a.pattern.id != b.pattern.id })
        assertTrue(month.count { it.key in mine } >= 15, "most days in the player's keys: ${month.count { it.key in mine }}")
        assertTrue(month.map { it.key }.toSet().size >= 4, "but not always the same")
        assertTrue(month.map { it.progression.id }.toSet().size >= 4)
        // without a library: common keys
        assertTrue((20000L until 20010L).map { Daily.pick(it).key }.toSet().size >= 4)
        // roman numerals follow the mode
        assertEquals("i – VI – III – VII", Progressions.byId("pop").roman(Key.parse("A minor")))
        assertEquals(listOf("Am", "F", "C", "G"), Progressions.byId("pop").chords(Key.parse("A minor")).map { it.label(Key.parse("A minor")) })
        // tempo and key controls
        val p = Daily.pick(20000)
        assertEquals(p.key.transpose(2), Daily.transpose(p, 2).key)
        assertEquals(p.bpm + 8, Daily.tempo(p, 8).bpm)
    }

    @Test
    fun accompanyMySongKeepsTheRightHandAndFollowsTheChords() {
        val events = OnsetsFramesDecoder().decode(Fixture("modulation_clean").ofGrid())
        val t = Transcriber().analyze(events, AnalysisSettings())
        assertEquals(Meter.FOUR_FOUR, Meter.of(t.grid.beatsPerBar, t.grid.compound))
        assertTrue(Accompaniment.patternsFor(t).isNotEmpty() && Accompaniment.patternsFor(t).all { it.meter == Meter.FOUR_FOUR })
        assertNull(Accompaniment.apply(Patterns.byId("waltz"), t, events)) // a waltz does not fit a 4/4 song

        val alberti = Patterns.byId("alberti")
        val out = assertNotNull(Accompaniment.apply(alberti, t, events))
        val right = t.notes.filter { it.hand == Hand.RIGHT }
        // the right hand is untouched
        for (n in right) assertTrue(out.any { it.id == n.eventId && !it.fromMidi }, "right-hand note ${n.pitch} kept")
        val added = out.filter { it.fromMidi }
        assertEquals(16 * 8, added.size) // 16 bars of eighths
        // and the original left hand is gone
        val leftIds = t.notes.filter { it.hand == Hand.LEFT }.map { it.eventId }.toSet()
        assertTrue(out.none { it.id in leftIds })

        // analysed again: same tempo, meter and keys, and the new left hand follows the harmony
        val t2 = Transcriber().analyze(out, Accompaniment.settingsFor(t, AnalysisSettings()))
        assertTrue(abs(t2.bpm - t.bpm) <= 2, "tempo ${t2.bpm} vs ${t.bpm}")
        assertEquals(t.grid.numerator, t2.grid.numerator)
        assertEquals(t.keyChanges().map { it.key }, t2.keyChanges().map { it.key })
        val left2 = t2.notes.filter { it.hand == Hand.LEFT }
        assertTrue(left2.size >= 120, "left hand ${left2.size}")
        // bar 1 is C major (C E G), bar 2 A minor (A C E): the accompaniment's notes say so
        fun pcsOfBar(bar: Int) = left2.filter { it.tick / t2.grid.barTicks == bar }.map { pc(it.pitch) }.toSet()
        assertEquals(setOf(0, 4, 7), pcsOfBar(0))
        assertEquals(setOf(9, 0, 4), pcsOfBar(1))
        // on the take's own beats: every added note starts within 30 ms of an eighth of the detected grid
        for (e in added) {
            val pos = t.grid.position(e.onset) * 2
            assertTrue(abs(pos - Math.round(pos)) < 0.06, "note at ${e.onset}")
        }
        val score = ScoreBuilder().build(t2, "x")
        assertTrue(abs(score.measures.size - 16) <= 1)
    }
}
