package io.github.e1caro.scorebook.core.music

import kotlinx.serialization.Serializable
import kotlin.math.abs
import kotlin.math.floor

/** Pitch class (0 = C … 11 = B) of a MIDI note number. */
fun pc(midi: Int): Int = Math.floorMod(midi, 12)

enum class Mode { MAJOR, MINOR }

/**
 * A key: tonic pitch class and mode. [index] runs 0..23 (12 major keys, then 12 minor keys).
 * [fifths] is the key signature (-7 … 7, negative = flats), as in MusicXML.
 */
@Serializable
data class Key(val tonic: Int, val mode: Mode) {
    val index: Int get() = tonic + if (mode == Mode.MINOR) 12 else 0

    val fifths: Int
        get() = if (mode == Mode.MAJOR) MAJOR_FIFTHS[tonic] else MAJOR_FIFTHS[(tonic + 3) % 12]

    /** Line-of-fifths position of the tonic (C = 0, G = 1, F = -1 …). */
    val tonicFifth: Int get() = if (mode == Mode.MAJOR) fifths else fifths + 3

    /** Pitch classes of the scale (natural minor plus the raised 7th for minor). */
    val scale: Set<Int>
        get() {
            val steps = if (mode == Mode.MAJOR) intArrayOf(0, 2, 4, 5, 7, 9, 11) else intArrayOf(0, 2, 3, 5, 7, 8, 10, 11)
            return steps.map { (tonic + it) % 12 }.toSet()
        }

    val tonicName: String get() = Spelling.nameOfFifth(tonicFifth)

    /** "D minor", "F# major". */
    val displayName: String get() = "$tonicName ${if (mode == Mode.MAJOR) "major" else "minor"}"

    /** "Dm", "F#". */
    val shortName: String get() = tonicName + if (mode == Mode.MINOR) "m" else ""

    fun transpose(semitones: Int): Key = Key(Math.floorMod(tonic + semitones, 12), mode)

    override fun toString() = displayName

    companion object {
        // key signature of the major key on each tonic pitch class (Db rather than C#, F# rather than Gb, …)
        private val MAJOR_FIFTHS = intArrayOf(0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5)

        val ALL: List<Key> = List(24) { fromIndex(it) }

        fun fromIndex(i: Int) = Key(i % 12, if (i < 12) Mode.MAJOR else Mode.MINOR)

        /** Parses "C major", "A minor", "F# major", "Bb minor", "Dm", "G". */
        fun parse(s: String): Key {
            val t = s.trim()
            val minor = t.endsWith("minor", true) || (t.endsWith("m") && !t.endsWith("major", true))
            val name = t.split(' ')[0].removeSuffix("m").ifEmpty { t.split(' ')[0] }
            return Key(Spelling.pcOfName(name), if (minor) Mode.MINOR else Mode.MAJOR)
        }

        /**
         * Key profiles: how typical each pitch class (relative to the tonic) is in a major or minor key.
         * Temperley's Kostka–Payne profiles ("Music and Probability", 2007), normalized to sum to 1.
         */
        val MAJOR_PROFILE: DoubleArray = normalize(doubleArrayOf(0.748, 0.060, 0.488, 0.082, 0.670, 0.460, 0.096, 0.715, 0.104, 0.366, 0.057, 0.400))
        val MINOR_PROFILE: DoubleArray = normalize(doubleArrayOf(0.712, 0.084, 0.474, 0.618, 0.049, 0.460, 0.105, 0.747, 0.404, 0.067, 0.133, 0.330))

        private fun normalize(a: DoubleArray): DoubleArray { val s = a.sum(); return DoubleArray(a.size) { a[it] / s } }
    }

    /** P(pitch class | this key). */
    fun profile(pitchClass: Int): Double {
        val rel = Math.floorMod(pitchClass - tonic, 12)
        return if (mode == Mode.MAJOR) MAJOR_PROFILE[rel] else MINOR_PROFILE[rel]
    }

    /** Steps on the circle of fifths between two keys' signatures (relative keys = 0). */
    fun signatureDistance(other: Key): Int {
        val d = abs(fifths - other.fifths) % 12
        return minOf(d, 12 - d)
    }
}

/** A written pitch: step (0 = C … 6 = B), alteration (-2 … 2) and octave (4 = the octave of middle C). */
@Serializable
data class SpelledPitch(val step: Int, val alter: Int, val octave: Int) {
    val midi: Int get() = 12 * (octave + 1) + Spelling.STEP_PC[step] + alter

    /** Diatonic index: 7 × octave + step. Middle C (C4) = 28; each staff line/space is one step. */
    val diatonic: Int get() = 7 * octave + step

    val name: String get() = "${Spelling.LETTERS[step]}${Spelling.alterText(alter)}$octave"
    val nameNoOctave: String get() = "${Spelling.LETTERS[step]}${Spelling.alterText(alter)}"
}

object Spelling {
    val LETTERS = charArrayOf('C', 'D', 'E', 'F', 'G', 'A', 'B')
    val STEP_PC = intArrayOf(0, 2, 4, 5, 7, 9, 11)
    private const val FIFTHS_ORDER = "FCGDAEB" // line of fifths, F = -1

    fun alterText(alter: Int) = when (alter) { -2 -> "bb"; -1 -> "b"; 1 -> "#"; 2 -> "##"; else -> "" }

    /** Letter step (0..6) and alteration of a line-of-fifths position (C = 0, G = 1, F = -1, Bb = -2 …). */
    fun stepAlterOfFifth(q: Int): Pair<Int, Int> {
        val letter = FIFTHS_ORDER[Math.floorMod(q + 1, 7)]
        val alter = floor((q + 1) / 7.0).toInt()
        return LETTERS.indexOf(letter) to alter
    }

    fun nameOfFifth(q: Int): String {
        val (step, alter) = stepAlterOfFifth(q)
        return "${LETTERS[step]}${alterText(alter)}"
    }

    fun pcOfName(name: String): Int {
        val letter = name.first().uppercaseChar()
        var p = STEP_PC[LETTERS.indexOf(letter)]
        for (c in name.drop(1)) p += when (c) { '#', '♯' -> 1; 'b', '♭' -> -1; else -> 0 }
        return Math.floorMod(p, 12)
    }

    /**
     * Line-of-fifths position for a pitch class in a key. Notes are spelled as close as possible to the key's
     * centre on the line of fifths, so sharp keys get sharps, flat keys get flats and minor keys get their raised
     * leading tone (G# in A minor). [direction] > 0 (the melody goes up next) leans to sharps, < 0 to flats:
     * C–C#–D but D–Db–C.
     */
    fun fifthFor(pitchClass: Int, key: Key, direction: Int = 0): Int {
        val center = key.fifths + (if (key.mode == Mode.MAJOR) 1.9 else 3.1) + direction.coerceIn(-1, 1) * 1.0
        val q0 = Math.floorMod(pitchClass * 7, 12)
        var best = q0
        var bestD = Double.MAX_VALUE
        for (q in intArrayOf(q0 - 24, q0 - 12, q0, q0 + 12)) {
            val d = abs(q - center)
            if (d < bestD) { bestD = d; best = q }
        }
        return best
    }

    fun spell(midi: Int, key: Key, direction: Int = 0): SpelledPitch {
        val (step, alter) = stepAlterOfFifth(fifthFor(pc(midi), key, direction))
        val octave = Math.floorDiv(midi - STEP_PC[step] - alter, 12) - 1
        return SpelledPitch(step, alter, octave)
    }

    /** Name of a pitch class in a key without octave ("F#", "Bb"). */
    fun pcName(pitchClass: Int, key: Key): String = nameOfFifth(fifthFor(pitchClass, key))

    /** Name with octave of a MIDI note, spelled in [key]: "C#5". */
    fun noteName(midi: Int, key: Key = Key(0, Mode.MAJOR)): String = spell(midi, key).name
}
