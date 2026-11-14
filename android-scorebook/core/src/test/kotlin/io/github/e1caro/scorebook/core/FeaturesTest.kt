package io.github.e1caro.scorebook.core

import io.github.e1caro.scorebook.core.correct.Transcriber
import io.github.e1caro.scorebook.core.library.Library
import io.github.e1caro.scorebook.core.library.PracticeStats
import io.github.e1caro.scorebook.core.library.Song
import io.github.e1caro.scorebook.core.library.TakeMeta
import io.github.e1caro.scorebook.core.play.PianoSynth
import io.github.e1caro.scorebook.core.transcribe.NoteDecoder
import org.junit.Test
import java.time.LocalDate
import java.time.ZoneOffset
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class FeaturesTest {
    private fun goertzel(x: ShortArray, from: Int, n: Int, f: Double, sr: Int): Double {
        val w = 2 * PI * f / sr
        var re = 0.0
        var im = 0.0
        for (i in from until from + n) { re += x[i] * cos(w * i); im += x[i] * sin(w * i) }
        return sqrt(re * re + im * im) / n
    }

    @Test
    fun pianoSoundsAtThePitchPlayed() {
        val sr = 22050
        val pcm = PianoSynth.render(listOf(PianoSynth.Voice(69, 0.1, 1.0, 100)), sr)
        val at = (0.3 * sr).toInt()
        val a4 = goertzel(pcm, at, 4096, 440.0, sr)
        val off = goertzel(pcm, at, 4096, 466.16, sr)
        assertTrue(a4 > 10 * off, "440 Hz $a4 vs 466 Hz $off")
        assertTrue(pcm.take((0.09 * sr).toInt()).all { it.toInt() == 0 }, "silent before the note")
        // the damper: much quieter well after release than while held
        val held = goertzel(pcm, (0.8 * sr).toInt(), 2048, 440.0, sr)
        val released = goertzel(pcm, (1.42 * sr).toInt(), 2048, 440.0, sr)
        assertTrue(released < held / 10, "held $held, released $released")
    }

    @Test
    fun aWholeTakeRendersQuickly() {
        val t = Transcriber().analyze(NoteDecoder().decode(Fixture("modulation_clean").grid()))
        val voices = PianoSynth.voices(t)
        assertEquals(t.notes.size, voices.size)
        val t0 = System.nanoTime()
        val pcm = PianoSynth.render(voices)
        val ms = (System.nanoTime() - t0) / 1e6
        println("rendered ${pcm.size / 22050.0} s of piano in $ms ms")
        assertTrue(pcm.size / 22050.0 > 40.0)
        assertTrue(ms < 3000)
        assertTrue(pcm.maxOf { it.toInt() } > 3000)
    }

    @Test
    fun practiceStats() {
        val zone = ZoneOffset.UTC
        fun at(d: LocalDate, h: Int) = d.atTime(h, 0).toInstant(zone).toEpochMilli()
        val today = LocalDate.of(2026, 11, 14)
        val takes = listOf(
            TakeMeta("a", "s1", at(today, 10), 120.0, "D minor", 72, "4/4", "mic", 50),
            TakeMeta("b", "s1", at(today.minusDays(1), 10), 60.0, "D minor", 80, "4/4", "mic", 40),
            TakeMeta("c", "s2", at(today.minusDays(2), 10), 180.0, "C major", 100, "3/4", "mic", 90),
            TakeMeta("d", "s3", at(today.minusDays(5), 10), 60.0, "A minor", 120, "4/4", "mic", 30),
            TakeMeta("e", "s3", at(today, 11), 60.0, "A minor", 120, "4/4", "mic", 30, trashedAt = 1L),
        )
        val lib = Library(songs = listOf(Song("s1", "ideas", "x", true, 0), Song("s2", "ideas", "y", true, 0), Song("s3", "ideas", "z", true, 0)), takes = takes)
        val st = PracticeStats.of(lib, at(today, 20), zone)
        assertEquals(3, st.streakDays)
        assertEquals(4, st.takes)
        assertEquals(7.0, st.totalMinutes, 1e-9)
        assertEquals(listOf(1.0, 0.0, 0.0, 3.0, 1.0, 2.0), st.lastSevenDays.drop(1))
        assertEquals("D minor" to 2, st.topKeys.first())
    }

    @Test
    fun trashRestoreAndPurge() {
        val lib = Library(
            songs = listOf(Song("s1", "ideas", "one", true, 0), Song("s2", "ideas", "two", true, 0)),
            takes = listOf(TakeMeta("t1", "s1", 1, 10.0, "C major", 90, "4/4", "mic", 5), TakeMeta("t2", "s2", 2, 10.0, "C major", 90, "4/4", "mic", 5)),
        )
        val trashed = lib.trash(setOf("s1", "s2"), 100)
        assertTrue(trashed.search().isEmpty())
        assertEquals(listOf("s1", "s2").toSet(), trashed.trashedSongs().map { it.id }.toSet())
        val back = trashed.restore(setOf("s2"))
        assertEquals(listOf("s2"), back.search().map { it.id })
        val (purged, files) = back.purge(setOf("s1"))
        assertEquals(listOf("t1"), files)
        assertEquals(listOf("s2"), purged.songs.map { it.id })
        assertTrue(purged.trashedSongs().isEmpty())
    }
}
