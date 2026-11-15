package io.github.e1caro.scorebook.core.accompany

import io.github.e1caro.scorebook.core.analysis.BeatGrid
import io.github.e1caro.scorebook.core.analysis.Chord
import io.github.e1caro.scorebook.core.analysis.ChordQuality
import io.github.e1caro.scorebook.core.analysis.ChordTracker
import io.github.e1caro.scorebook.core.correct.Decision
import io.github.e1caro.scorebook.core.correct.Hand
import io.github.e1caro.scorebook.core.correct.TNote
import io.github.e1caro.scorebook.core.correct.TimedChord
import io.github.e1caro.scorebook.core.correct.TimedKey
import io.github.e1caro.scorebook.core.correct.Transcription
import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.music.Mode
import io.github.e1caro.scorebook.core.music.pc
import io.github.e1caro.scorebook.core.transcribe.NoteEvent
import kotlin.math.roundToInt

/** What to practise today: a pattern, written in a key, over a progression. */
data class DailyPick(val pattern: Pattern, val key: Key, val progression: Progression, val bpm: Int) {
    val chords: List<Chord> get() = progression.chords(key)

    /** "Pop · Easy · 4/4". */
    val tagline: String get() = "${pattern.style} · ${pattern.level.label} · ${pattern.meter.label}"

    /** "in D minor · i – VI – III – VII". */
    val harmony: String get() = "in ${key.displayName} · ${progression.roman(key)}"
}

object Accompaniment {
    /** A played note of an accompaniment: bar, position in the bar, length (ticks, 48 per quarter), pitch. */
    data class Note(val bar: Int, val tick: Int, val duration: Int, val pitch: Int, val accent: Boolean)

    /** The bass register: roots from A1 to G#2, so chords sit around middle C and below. */
    fun bassRoot(chord: Chord): Int = if (chord.root <= 8) 36 + chord.root else 24 + chord.root

    /** The notes of [pattern] over one chord per bar. */
    fun notes(pattern: Pattern, chords: List<Chord>): List<Note> {
        val out = ArrayList<Note>()
        for ((bar, chord) in chords.withIndex()) {
            val root = bassRoot(chord)
            for (step in pattern.steps) {
                for (semis in Patterns.semitones(step.tones, chord)) {
                    var pitch = root + semis
                    if (pitch < 26) pitch += 12 // nothing below D1: too muddy on a real piano
                    out.add(Note(bar, step.tick, step.duration, pitch, step.tick == 0))
                }
            }
        }
        return out
    }

    /**
     * The pick written out as a transcription (steady beat, left hand only), ready for the score builder, the
     * engraver and the piano synthesizer. [repeats]: how many times the progression is played.
     */
    fun transcription(pick: DailyPick, repeats: Int = 1): Transcription {
        val meter = pick.pattern.meter
        val chords = List(repeats) { pick.chords }.flatten()
        val beatSeconds = 60.0 / pick.bpm
        val beats = List(chords.size * meter.beatsPerBar + 1) { it * beatSeconds }
        val grid = BeatGrid(beats, meter.beatsPerBar, meter.compound, 0)
        fun time(tick: Int) = tick.toDouble() / meter.beatTicks * beatSeconds
        val notes = notes(pick.pattern, chords).mapIndexed { i, n ->
            val tick = n.bar * meter.barTicks + n.tick
            TNote(i, n.pitch, time(tick), time(tick + n.duration) - 0.02, if (n.accent) 78 else 64, Hand.LEFT, tick, n.duration, Decision.MIDI)
        }
        val timedChords = chords.mapIndexedNotNull { bar, c ->
            if (bar > 0 && chords[bar - 1] == c) null else TimedChord(c, bar * meter.barTicks, time(bar * meter.barTicks))
        }
        return Transcription(notes, emptyList(), grid, listOf(TimedKey(pick.key, 0, 0.0)), timedChords)
    }

    /**
     * "Accompany my song": the right hand of a recorded take stays exactly as it was played; the left hand is
     * replaced by [pattern], following the chords detected in each bar, on the take's own beats (so it follows
     * the player's rubato). [t] must be the take analyzed without transposition. Returns the new note events,
     * or null if the pattern's meter is not the take's.
     */
    fun apply(pattern: Pattern, t: Transcription, events: List<NoteEvent>): List<NoteEvent>? {
        val grid = t.grid
        if (Meter.of(grid.beatsPerBar, grid.compound) != pattern.meter) return null
        val rightIds = t.notes.filter { it.hand == Hand.RIGHT }.map { it.eventId }.toSet()
        val right = events.filter { it.id in rightIds }
        val lastTick = t.notes.maxOfOrNull { it.tick } ?: return null
        val bars = lastTick / grid.barTicks + 1
        val key = t.mainKey
        val first = grid.firstBarBeat()
        // one chord per bar, from what was played in that bar (an empty bar keeps the chord before it; before
        // any chord is known, the tonic)
        var current = Chord(key.tonic, if (key.mode == Mode.MAJOR) ChordQuality.MAJOR else ChordQuality.MINOR)
        val tracker = ChordTracker()
        val lowOnsets = t.notes.filter { it.pitch < 60 }.map { it.onset }.sorted()
        val chords = (0 until bars).map { bar ->
            val from = grid.time((first + bar * grid.beatsPerBar).toDouble())
            val to = grid.time((first + (bar + 1) * grid.beatsPerBar).toDouble())
            val beat = (to - from) / grid.beatsPerBar
            val chroma = DoubleArray(12)
            var bass = -1
            for (n in t.notes) {
                // a low note is the harmony until the next low note, however short it was heard
                val off = if (n.pitch >= 60) n.offset else maxOf(n.offset, minOf(lowOnsets.firstOrNull { it > n.onset + 0.1 } ?: (n.onset + 2.5), n.onset + 2.5))
                val overlap = minOf(off, to) - maxOf(n.onset, from)
                if (overlap <= 0.03) continue
                chroma[pc(n.pitch)] += overlap / beat
                if (bass < 0 || n.pitch < bass) bass = n.pitch
            }
            val keyHere = t.keys.lastOrNull { it.time <= from + 0.01 }?.key ?: key
            tracker.best(chroma, bass, keyHere)?.let { current = it }
            current
        }
        var id = (events.maxOfOrNull { it.id } ?: 0) + 1
        fun time(bar: Int, tick: Int) = grid.time(first + bar * grid.beatsPerBar + tick.toDouble() / grid.beatTicks)
        val left = notes(pattern, chords).map { n ->
            val on = time(n.bar, n.tick)
            val off = time(n.bar, n.tick + n.duration)
            NoteEvent.midi(id++, n.pitch, on, on + (off - on) * 0.95, if (n.accent) 72 else 52)
        }
        return (right + left).sortedBy { it.onset }
    }

    /**
     * The analysis settings for a song made by [apply]: the time signature and the bar lines are the original's
     * (a steady pattern such as an Alberti bass could otherwise be read as 2/4, or shifted by half a bar).
     */
    fun settingsFor(t: Transcription, base: io.github.e1caro.scorebook.core.correct.AnalysisSettings) =
        base.copy(beatsPerBar = t.grid.beatsPerBar, compound = t.grid.compound, tempoScale = 1.0, barLineAt = t.grid.time(t.grid.firstBarBeat().toDouble()))

    /** Patterns that can accompany a take (its meter). */
    fun patternsFor(t: Transcription): List<Pattern> = Meter.of(t.grid.beatsPerBar, t.grid.compound)?.let { Patterns.forMeter(it) } ?: emptyList()
}

/**
 * The accompaniment of the day: the same all day, another one tomorrow. Patterns come in an order that mixes
 * levels and styles; the key is one the player uses a lot when there is a library to learn from, and the
 * progression rotates among those that suit the pattern.
 */
object Daily {
    // easy, medium, easy, hard …, never two of the same meter family in a row where avoidable
    private val ORDER = listOf("alberti", "pulse", "ballad", "waltz", "tresillo", "bass-chord", "stride", "octaves", "barcarolle", "walking",
        "whole", "habanera", "waltz-arpeggio", "boogie", "bossa")

    private val COMMON_KEYS = listOf("C major", "A minor", "G major", "D minor", "F major", "E minor", "D major", "Bb major").map { Key.parse(it) }

    fun pick(epochDay: Long, favoriteKeys: List<Key> = emptyList()): DailyPick {
        val n = ORDER.size
        val pattern = Patterns.byId(ORDER[Math.floorMod(epochDay, n.toLong()).toInt()])
        val round = Math.floorDiv(epochDay, n.toLong())
        val progression = Progressions.byId(pattern.progressions[Math.floorMod(round + epochDay, pattern.progressions.size.toLong()).toInt()])
        // two days out of three in one of the player's own keys, otherwise a common one for variety
        val own = favoriteKeys.distinct().take(3)
        val pool = if (own.isNotEmpty() && Math.floorMod(epochDay, 3L) != 2L) own else COMMON_KEYS
        val key = pool[Math.floorMod(epochDay * 7 + round, pool.size.toLong()).toInt()]
        return DailyPick(pattern, key, progression, pattern.bpm)
    }

    /** Any pattern, in the same day's key (for browsing). */
    fun withPattern(pattern: Pattern, key: Key, index: Int = 0): DailyPick =
        DailyPick(pattern, key, Progressions.byId(pattern.progressions[Math.floorMod(index, pattern.progressions.size)]), pattern.bpm)

    fun transpose(pick: DailyPick, semitones: Int): DailyPick = pick.copy(key = pick.key.transpose(semitones))

    fun tempo(pick: DailyPick, delta: Int): DailyPick = pick.copy(bpm = (pick.bpm + delta).coerceIn(40, 200))

    @Suppress("unused")
    private fun round(x: Double) = x.roundToInt()
}
