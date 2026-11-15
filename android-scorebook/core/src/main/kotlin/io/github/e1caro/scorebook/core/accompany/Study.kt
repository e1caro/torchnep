package io.github.e1caro.scorebook.core.accompany

import io.github.e1caro.scorebook.core.analysis.BeatGrid
import io.github.e1caro.scorebook.core.analysis.Chord
import io.github.e1caro.scorebook.core.correct.Decision
import io.github.e1caro.scorebook.core.correct.Hand
import io.github.e1caro.scorebook.core.correct.TNote
import io.github.e1caro.scorebook.core.correct.TimedChord
import io.github.e1caro.scorebook.core.correct.TimedKey
import io.github.e1caro.scorebook.core.correct.Transcription
import io.github.e1caro.scorebook.core.music.Key

/**
 * Something to practise that can be shown as a score, played by the piano sound and checked against what the
 * player plays: an accompaniment pattern over chords ([DailyPick]) or a motif ([MotifPick]).
 */
interface Study {
    /** Stable across keys and tempos ("pattern:alberti", "motif:lament"): practice results are kept under it. */
    val id: String
    val name: String
    val style: String
    val level: Level
    val meter: Meter
    val key: Key
    val bpm: Int
    val about: String
    val tip: String
    /** One chord per bar. */
    val chords: List<Chord>
    /** The harmony in roman numerals. */
    val roman: String

    /** "Pop · Easy · 4/4". */
    val tagline: String get() = "$style · ${level.label} · ${meter.label}"

    /** "in D minor · i – VI – III – VII". */
    val harmony: String get() = "in ${key.displayName} · $roman"

    /** Written out with a steady beat; [repeats]: how many times it is played through. */
    fun transcription(repeats: Int = 1): Transcription

    fun transposed(semitones: Int): Study

    fun withTempo(delta: Int): Study
}

/** A written note of a study: bar, position in the bar and length (ticks, 48 per quarter), pitch, hand. */
data class StudyNote(val bar: Int, val tick: Int, val duration: Int, val pitch: Int, val hand: Hand, val accent: Boolean)

object Studies {
    /** [notes] of one pass over [chords] (one per bar) as a transcription with steady beats at [bpm]. */
    fun transcription(meter: Meter, bpm: Int, key: Key, chords: List<Chord>, notes: List<StudyNote>, repeats: Int): Transcription {
        val bars = chords.size
        val beatSeconds = 60.0 / bpm
        val beats = List(bars * repeats * meter.beatsPerBar + 1) { it * beatSeconds }
        val grid = BeatGrid(beats, meter.beatsPerBar, meter.compound, 0)
        fun time(tick: Int) = tick.toDouble() / meter.beatTicks * beatSeconds
        val out = ArrayList<TNote>()
        for (pass in 0 until repeats) for (n in notes) {
            val tick = (pass * bars + n.bar) * meter.barTicks + n.tick
            out.add(TNote(out.size, n.pitch, time(tick), time(tick + n.duration) - 0.02, if (n.accent) 78 else 64, n.hand, tick, n.duration, Decision.MIDI))
        }
        val all = List(repeats) { chords }.flatten()
        val timedChords = all.mapIndexedNotNull { bar, c ->
            if (bar > 0 && all[bar - 1] == c) null else TimedChord(c, bar * meter.barTicks, time(bar * meter.barTicks))
        }
        return Transcription(out, emptyList(), grid, listOf(TimedKey(key, 0, 0.0)), timedChords)
    }

    /** How many times a study is played through when listening to it: twice, unless it is long. */
    fun repeats(study: Study): Int = if (study.chords.size > 8) 1 else 2
}
