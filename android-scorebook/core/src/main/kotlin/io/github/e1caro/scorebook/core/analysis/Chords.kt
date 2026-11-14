package io.github.e1caro.scorebook.core.analysis

import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.music.Mode
import io.github.e1caro.scorebook.core.music.Spelling
import io.github.e1caro.scorebook.core.music.pc
import kotlinx.serialization.Serializable
import kotlin.math.ln

@Serializable
enum class ChordQuality(val intervals: List<Int>, val suffix: String, val musicXmlKind: String, val prior: Double) {
    MAJOR(listOf(0, 4, 7), "", "major", 0.0),
    MINOR(listOf(0, 3, 7), "m", "minor", 0.0),
    DIMINISHED(listOf(0, 3, 6), "dim", "diminished", -0.4),
    AUGMENTED(listOf(0, 4, 8), "aug", "augmented", -0.8),
    DOMINANT7(listOf(0, 4, 7, 10), "7", "dominant", -0.1),
    MAJOR7(listOf(0, 4, 7, 11), "maj7", "major-seventh", -0.3),
    MINOR7(listOf(0, 3, 7, 10), "m7", "minor-seventh", -0.3),
    HALF_DIM7(listOf(0, 3, 6, 10), "m7b5", "half-diminished", -0.5),
    DIM7(listOf(0, 3, 6, 9), "dim7", "diminished-seventh", -0.6),
    SUS4(listOf(0, 5, 7), "sus4", "suspended-fourth", -0.6),
    SUS2(listOf(0, 2, 7), "sus2", "suspended-second", -0.8),
}

@Serializable
data class Chord(val root: Int, val quality: ChordQuality) {
    val pitchClasses: Set<Int> get() = quality.intervals.map { (root + it) % 12 }.toSet()
    fun label(key: Key): String = Spelling.pcName(root, key) + quality.suffix
    fun transpose(semitones: Int) = Chord(Math.floorMod(root + semitones, 12), quality)
}

/** A chord over a span of beats. */
@Serializable
data class ChordSpan(val chord: Chord?, val fromStep: Int, val toStep: Int)

/**
 * Chord labels per beat: template matching of the weighted pitch classes (with the bass note), a prior for chords
 * of the current key, and a Viterbi pass that prefers changes on strong beats.
 */
class ChordTracker {
    private val chords = (0 until 12).flatMap { r -> ChordQuality.entries.map { Chord(r, it) } }

    /**
     * [chroma] per step, [bass] = lowest sounding pitch per step (or -1), [keys] = key per step,
     * [strong] = step starts a bar (or half bar).
     */
    fun track(chroma: Array<DoubleArray>, bass: IntArray, keys: List<Key>, strong: BooleanArray): List<ChordSpan> {
        val n = chroma.size
        if (n == 0) return emptyList()
        val m = chords.size
        val e = Array(n) { s ->
            val total = chroma[s].sum()
            DoubleArray(m) { c -> if (total < 1e-6) 0.0 else emission(chords[c], chroma[s], bass[s], keys[s]) }
        }
        val delta = Array(n) { DoubleArray(m) }
        val psi = Array(n) { IntArray(m) }
        for (c in 0 until m) delta[0][c] = e[0][c]
        for (s in 1 until n) {
            val stayP = if (strong[s]) 0.55 else 0.9
            val logStay = ln(stayP)
            val logMove = ln((1 - stayP) / (m - 1))
            var bestPrev = 0
            for (c in 1 until m) if (delta[s - 1][c] > delta[s - 1][bestPrev]) bestPrev = c
            for (c in 0 until m) {
                val stay = delta[s - 1][c] + logStay
                val move = delta[s - 1][bestPrev] + logMove
                if (stay >= move || bestPrev == c) { delta[s][c] = stay + e[s][c]; psi[s][c] = c } else { delta[s][c] = move + e[s][c]; psi[s][c] = bestPrev }
            }
        }
        val path = IntArray(n)
        path[n - 1] = (0 until m).maxByOrNull { delta[n - 1][it] }!!
        for (s in n - 1 downTo 1) path[s - 1] = psi[s][path[s]]
        val out = ArrayList<ChordSpan>()
        var start = 0
        val empty = BooleanArray(n) { chroma[it].sum() < 1e-6 }
        for (s in 1..n) {
            if (s == n || path[s] != path[start]) {
                val allEmpty = (start until s).all { empty[it] }
                out.add(ChordSpan(if (allEmpty) null else chords[path[start]], start, s))
                start = s
            }
        }
        return out
    }

    private fun emission(ch: Chord, v: DoubleArray, bass: Int, key: Key): Double {
        val tones = ch.pitchClasses
        val inP = ln(0.85 / tones.size)
        val outP = ln(0.15 / (12 - tones.size))
        var e = 0.0
        for (p in 0 until 12) if (v[p] > 0) e += v[p] * (if (p in tones) inP else outP)
        if (bass >= 0) {
            val b = pc(bass)
            e += when { b == ch.root -> 1.2; b in tones -> 0.3; else -> -0.4 }
        }
        return e + ch.quality.prior + keyPrior(ch, key)
    }

    /** Diatonic chords of the key are likely, secondary dominants fairly likely, the rest less so. */
    private fun keyPrior(ch: Chord, key: Key): Double {
        val scale = key.scale
        if (ch.pitchClasses.all { it in scale }) return 0.9
        // secondary dominant: a major or dominant-7 chord a fifth above a scale degree
        if ((ch.quality == ChordQuality.MAJOR || ch.quality == ChordQuality.DOMINANT7) && ((ch.root + 5) % 12) in scale) return 0.3
        if (key.mode == Mode.MAJOR && Key((key.tonic + 9) % 12, Mode.MINOR).scale.containsAll(ch.pitchClasses)) return 0.2
        return -0.5
    }
}
