package io.github.e1caro.scorebook.core

import io.github.e1caro.scorebook.core.accompany.Daily
import io.github.e1caro.scorebook.core.accompany.Meter
import io.github.e1caro.scorebook.core.accompany.MotifPick
import io.github.e1caro.scorebook.core.accompany.Motifs
import io.github.e1caro.scorebook.core.accompany.Patterns
import io.github.e1caro.scorebook.core.accompany.Studies
import io.github.e1caro.scorebook.core.accompany.Study
import io.github.e1caro.scorebook.core.correct.Hand
import io.github.e1caro.scorebook.core.engrave.Engraver
import io.github.e1caro.scorebook.core.library.Codec
import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.music.Mode
import io.github.e1caro.scorebook.core.music.pc
import io.github.e1caro.scorebook.core.play.PianoSynth
import io.github.e1caro.scorebook.core.practice.PlayAlong
import io.github.e1caro.scorebook.core.practice.PracticeLog
import io.github.e1caro.scorebook.core.score.ScoreBuilder
import org.junit.Test
import java.util.Random
import kotlin.math.abs
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class PlayAlongTest {
    @Test
    fun everyMotifIsWellFormedInEveryKey() {
        assertTrue(Motifs.ALL.size >= 12)
        assertEquals(Motifs.ALL.size, Motifs.ALL.map { it.id }.toSet().size)
        for (mo in Motifs.ALL) {
            // every bar of each hand is full, and both hands have as many bars as there are chords
            for (hand in listOf(mo.left, mo.right)) {
                val lengths = Motifs.barLengths(hand)
                if (hand.isBlank()) continue
                assertEquals(mo.bars, lengths.size, "${mo.id}: bars")
                assertTrue(lengths.all { it == mo.meter.barTicks }, "${mo.id}: bar lengths $lengths")
            }
            assertTrue(mo.about.length > 60 && mo.tip.length > 30, mo.id)
            for (tonic in 0 until 12) {
                val pick = MotifPick(mo, Key(tonic, mo.mode), mo.bpm)
                val t = pick.transcription()
                assertTrue(t.notes.all { it.pitch in 36..88 }, "${mo.id} on $tonic: ${t.notes.minOf { it.pitch }}..${t.notes.maxOf { it.pitch }}")
                // the hands do not cross
                val lowRight = t.notes.filter { it.hand == Hand.RIGHT }.minOfOrNull { it.pitch } ?: 200
                val highLeft = t.notes.filter { it.hand == Hand.LEFT }.maxOf { it.pitch }
                assertTrue(highLeft <= lowRight + 7, "${mo.id} on $tonic: hands cross ($highLeft over $lowRight)")
                assertEquals(mo.bars, pick.chords.size)
                if (tonic % 5 == 0) {
                    val score = ScoreBuilder().build(t, pick.name, pick.harmony)
                    assertEquals(mo.bars, score.measures.size, "${mo.id} on $tonic")
                    assertEquals(mo.meter.label, "${score.numerator}/${score.denominator}")
                    assertTrue(Engraver().continuous(score, 400.0).hits.isNotEmpty())
                    assertTrue(PianoSynth.render(PianoSynth.voices(pick.transcription(Studies.repeats(pick)))).size > 22050)
                }
            }
            // most of what is written belongs to the chord of its bar (passing and approach notes aside)
            val pick = MotifPick(mo, Key(if (mo.mode == Mode.MINOR) 9 else 0, mo.mode), mo.bpm)
            val notes = Motifs.notes(mo, pick.key)
            val inChord = notes.count { pc(it.pitch) in pick.chords[it.bar].pitchClasses }
            assertTrue(inChord >= notes.size * 0.55, "${mo.id}: $inChord of ${notes.size} notes on the chord")
            // the bass starts on the tonic
            assertEquals(pick.key.tonic, pc(notes.filter { it.bar == 0 && it.tick == 0 }.minOf { it.pitch }), mo.id)
        }
        // the notation
        val parsed = Motifs.parse("q0 e7 er h0,4,7 | h.r q-5", 48, Hand.LEFT)
        assertEquals(listOf(48, 55, 48, 52, 55, 43), parsed.map { it.pitch })
        assertEquals(listOf(0, 48, 96, 96, 96, 144), parsed.map { it.tick })
        assertEquals(listOf(0, 0, 0, 0, 0, 1), parsed.map { it.bar })
    }

    @Test
    fun theMotifOfTheDayIsStableVariedAndInThePlayersKeys() {
        val mine = listOf(Key.parse("D minor"), Key.parse("G major"))
        assertEquals(Daily.motif(20000, mine), Daily.motif(20000, mine))
        val weeks = (20000L until 20000L + Motifs.ALL.size).map { Daily.motif(it, mine) }
        assertEquals(Motifs.ALL.size, weeks.map { it.motif.id }.toSet().size)
        // the key is in the motif's mode; the player's keys, or their relatives (D minor ~ F major, G major ~ E minor)
        assertTrue(weeks.all { it.key.mode == it.motif.mode })
        val own = setOf("D minor", "E minor", "G major", "F major").map { Key.parse(it) }.toSet()
        assertTrue(weeks.count { it.key in own } >= weeks.size / 2, "${weeks.map { it.key }}")
        // never the same pair of pattern and motif two days running, and transposing keeps the mode
        assertTrue((20000L until 20040L).map { Daily.pick(it).pattern.id to Daily.motif(it).motif.id }.toSet().size >= 39)
        // "another one" (the app steps 4 days for patterns, 5 for motifs): everything comes round before one repeats
        assertEquals(Patterns.ALL.size, (0 until Patterns.ALL.size).map { Daily.pick(20000 + 4L * it, mine).pattern.id }.toSet().size)
        assertEquals(Motifs.ALL.size, (0 until Motifs.ALL.size).map { Daily.motif(20000 + 5L * it, mine).motif.id }.toSet().size)
        val m = Daily.motif(20001)
        assertEquals(m.motif.mode, m.transposed(5).key.mode)
        assertEquals(Math.floorMod(m.key.tonic + 5, 12), m.transposed(5).key.tonic)
        assertEquals(m.bpm - 8, m.withTempo(-8).bpm)
        assertTrue(m.id.startsWith("motif:") && Daily.pick(20001).id.startsWith("pattern:"))
    }

    private fun play(study: Study, tempo: Double = 1.0, start: Double = 2.0, jitter: Double = 0.01, seed: Long = 1): List<PlayAlong.Played> {
        val r = Random(seed)
        return study.transcription().notes.map { PlayAlong.Played(it.pitch, start + it.onset / tempo + r.nextGaussian() * jitter) }
    }

    @Test
    fun playingWhatIsWrittenGetsThreeStarsAtAnyTempo() {
        val studies: List<Study> = Patterns.ALL.map { Daily.withPattern(it, Key.parse("D minor")) } + Motifs.ALL.map { Daily.withMotif(it) }
        for (s in studies) {
            val targets = PlayAlong.targets(s.transcription())
            for (tempo in listOf(1.0, 0.7, 1.2)) {
                val r = PlayAlong.check(targets, play(s, tempo))
                assertEquals(3, r.stars, "${s.id} at $tempo: $r")
                assertEquals(r.expected, r.hit, s.id)
                assertTrue(r.missed.isEmpty() && r.extra == 0 && r.octaveShift == 0)
                assertTrue(abs(r.bpm!! - s.bpm * tempo) <= 2, "${s.id}: ${r.bpm} vs ${s.bpm * tempo}")
                assertTrue(r.rhythm > 0.9, "${s.id}: rhythm ${r.rhythm}")
            }
        }
    }

    @Test
    fun mistakesAreFoundAndExplained() {
        val s = Daily.withPattern(Patterns.byId("alberti"), Key.parse("C major"))
        val t = s.transcription()
        val targets = PlayAlong.targets(t)
        val good = play(s)

        // one bar left out: those notes are the missed ones
        val bar2 = t.notes.filter { it.tick / Meter.FOUR_FOUR.barTicks == 1 }.map { it.eventId }.toSet()
        val skipped = good.filterIndexed { i, _ -> t.notes[i].eventId !in bar2 }
        val r1 = PlayAlong.check(targets, skipped)
        assertEquals(bar2, r1.missed)
        assertEquals(32 - 8, r1.hit)
        assertTrue(r1.stars in 1..2, "$r1")
        assertTrue(r1.advice(s.bpm).contains("24 of 32"), r1.advice(s.bpm))

        // wrong notes: a third of them a step off
        val wrong = good.mapIndexed { i, p -> if (i % 3 == 0) p.copy(pitch = p.pitch + 1) else p }
        val r2 = PlayAlong.check(targets, wrong)
        assertTrue(r2.hit in 19..23 && r2.extra >= 9, "$r2")
        assertTrue(r2.stars <= 1, "$r2")

        // right notes, limping rhythm: every other note late by a third of a beat
        val beat = 60.0 / s.bpm
        val limping = good.mapIndexed { i, p -> if (i % 2 == 1) p.copy(time = p.time + beat * 0.33) else p }
        val r3 = PlayAlong.check(targets, limping)
        assertEquals(32, r3.hit)
        assertTrue(r3.rhythm < 0.75, "rhythm ${r3.rhythm}")
        assertTrue(r3.stars == 2, "$r3")
        assertTrue(r3.advice(s.bpm).contains("count the beats"), r3.advice(s.bpm))

        // an octave lower is still the pattern; slower is said, not punished
        val low = play(s, tempo = 0.6).map { it.copy(pitch = it.pitch - 12) }
        val r4 = PlayAlong.check(targets, low)
        assertEquals(3, r4.stars)
        assertEquals(-12, r4.octaveShift)
        assertTrue(r4.advice(s.bpm).contains("slower than written") && r4.advice(s.bpm).contains("octave lower"), r4.advice(s.bpm))

        // something else entirely, and nothing at all
        val rnd = Random(3)
        val noise = List(40) { PlayAlong.Played(40 + rnd.nextInt(30), it * 0.3) }
        assertEquals(0, PlayAlong.check(targets, noise).stars)
        val none = PlayAlong.check(targets, emptyList())
        assertEquals(0, none.stars)
        assertEquals("I did not hear it", none.headline)
        assertFalse(none.passed)

        // a few stray extra notes (a harmonic the model heard, a brushed key) do not cost a star
        val stray = good + List(3) { PlayAlong.Played(84 + it, 3.0 + it) }
        assertEquals(3, PlayAlong.check(targets, stray).stars)

        // a chord struck not quite together still matches from the bottom up
        val chordal = Daily.withPattern(Patterns.byId("pulse"), Key.parse("C major"))
        val rolled = play(chordal, jitter = 0.012, seed = 7)
        assertEquals(3, PlayAlong.check(PlayAlong.targets(chordal.transcription()), rolled).stars)

        // swung eighths (long, short) are a way of playing, not a mistake
        val boogie = Daily.withPattern(Patterns.byId("boogie"), Key.parse("C major"))
        val eighth = 60.0 / boogie.bpm / 2
        val swung = play(boogie).mapIndexed { i, p -> if (i % 2 == 1) p.copy(time = p.time + eighth / 3) else p }
        assertEquals(3, PlayAlong.check(PlayAlong.targets(boogie.transcription()), swung).stars)
    }

    @Test
    fun theStreakCountsDaysInARow() {
        var log = PracticeLog()
        assertEquals(0, log.streak(100))
        log = log.record(98, "pattern:alberti", 2).record(99, "motif:lament", 1).record(99, "pattern:alberti", 1)
        assertEquals(2, log.streak(99))
        assertEquals(2, log.streak(100)) // not practised yet today: the streak is still alive
        assertEquals(0, log.streak(101)) // a day was missed
        assertEquals(3, log.record(100, "pattern:alberti", 3).streak(100))
        assertEquals(2, log.stars("pattern:alberti")) // the best try is kept
        assertEquals(3, log.record(100, "pattern:alberti", 3).stars("pattern:alberti"))
        assertEquals(0, log.stars("motif:folia"))
        assertTrue(log.practisedOn(99) && !log.practisedOn(100))
        // a failed try does not count
        assertEquals(log, log.record(100, "motif:folia", 0))
        assertEquals(log, assertNotNull(Codec.practice(Codec.encode(log))))
    }
}
