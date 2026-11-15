package io.github.e1caro.scorebook.core.transcribe

import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min

data class OnsetsFramesParams(
    /** Onset probability above which a local maximum is a candidate note (low: unclear notes stay candidates). */
    val candidate: Float = 0.08f,
    /** A note sounds while its frame probability stays above this. */
    val frame: Float = 0.4f,
    val minPresence: Double = 0.12,
    /** Calibration: logit P(struck) = wOnset·logit(onset) + wAfter·logit(frame prob after) + bias. */
    val wOnset: Double = 0.702,
    val wAfter: Double = 0.212,
    val bias: Double = 0.02,
    /**
     * Two neighbouring keys within this many frames are one event with two alternatives (F or F#?) only when
     * neither was clearly struck: energy split between two keys is the sign of an out-of-tune string. A clear
     * strike keeps its pitch, and a weak neighbour next to it stays a separate, doubtful note (a grace note, a
     * cluster, or a ghost).
     */
    val mergeFrames: Int = 1,
    val clearStrike: Double = 0.8,
)

/**
 * The decoder for Onsets and Frames. A candidate note is a local maximum of the onset probability; how likely it
 * is that the key was really struck comes from the onset peak and the frame probability right after it
 * (a logistic calibration fitted on real piano recordings: candidates rated 0.5–0.65 are real 56 % of the time,
 * above 0.8, 99 %). The onset time is refined inside the 32 ms frame from the peak's neighbours (5 ms mean
 * error). Each event also carries its semitone and octave neighbours as alternatives, with their own evidence.
 */
class OnsetsFramesDecoder(
    private val registerBias: List<Double> = List(8) { 0.0 },
    val params: OnsetsFramesParams = OnsetsFramesParams(),
) : Decoder {
    override val lookahead: Int get() = 6
    override val backtrack: Int get() = 10

    private class Cand(val t: Int, val k: Int, val peak: Double, var presence: Double, val shift: Double) {
        var end = t + 1
        val merged = HashMap<Int, Double>()
    }

    private fun presence(grid: ProbabilityGrid, t: Int, k: Int): Double {
        val F = grid.frames
        var after = 0.0
        var n = 0
        for (i in t until min(t + 3, F)) { after += grid.note(i, k); n++ }
        after /= max(1, n)
        val z = params.wOnset * lg(grid.onset(t, k).toDouble()) + params.wAfter * lg(after) + params.bias +
            registerBias.getOrElse(((k + 9) / 12).coerceIn(0, 7)) { 0.0 }
        return 1 / (1 + exp(-z))
    }

    override fun decode(grid: ProbabilityGrid, from: Int, to: Int, firstId: Int): List<NoteEvent> {
        val F = grid.frames
        val hi = min(to, F)
        // 1. candidates: local maxima of the onset probability on every key
        val byKey = Array(ProbabilityGrid.KEYS) { ArrayList<Cand>() }
        for (k in 0 until ProbabilityGrid.KEYS) {
            for (t in max(0, from) until hi) {
                val o = grid.onset(t, k)
                if (o < params.candidate) continue
                val prev = if (t > 0) grid.onset(t - 1, k) else 0f
                val next = if (t + 1 < F) grid.onset(t + 1, k) else 0f
                if (o <= prev && t > 0 || o < next) continue
                val p = presence(grid, t, k)
                if (p < params.minPresence) continue
                // where inside the frame: towards the stronger neighbour
                val shift = 0.5 * (next - prev) / max(1e-6, (o + max(next, prev)).toDouble())
                val last = byKey[k].lastOrNull()
                if (last != null && t - last.t <= 2) { // one strike seen as two peaks: keep the stronger
                    if (p > last.presence) { byKey[k].removeAt(byKey[k].size - 1); byKey[k].add(Cand(t, k, o.toDouble(), p, shift)) }
                } else byKey[k].add(Cand(t, k, o.toDouble(), p, shift))
            }
        }
        // 2. neighbouring keys at the same instant: one event with alternatives, unless both are clearly there
        val all = byKey.flatMap { it }.sortedByDescending { it.presence }
        val kept = Array(ProbabilityGrid.KEYS) { ArrayList<Cand>() }
        val events = ArrayList<Cand>()
        for (c in all) {
            val neighbour = sequenceOf(c.k - 1, c.k + 1).filter { it in 0 until ProbabilityGrid.KEYS }.flatMap { kept[it].asSequence() }
                .firstOrNull { abs(it.t - c.t) <= params.mergeFrames && it.presence < params.clearStrike }
            if (neighbour != null) {
                neighbour.merged[c.k] = max(neighbour.merged[c.k] ?: 0.0, c.presence)
                neighbour.presence = 1 - (1 - neighbour.presence) * (1 - c.presence * 0.5)
                continue
            }
            events.add(c)
            kept[c.k].add(c)
        }
        // 3. ends: while the frame probability holds, or until the same key is struck again
        for (k in 0 until ProbabilityGrid.KEYS) {
            val strikes = kept[k].filter { it.presence >= 0.35 }.sortedBy { it.t }
            for (c in kept[k]) {
                val next = strikes.firstOrNull { it.t > c.t + 1 }?.t ?: F
                var e = c.t + 1
                while (e < next && grid.note(e, k) >= params.frame) e++
                c.end = max(c.t + 1, e)
            }
        }
        events.sortWith(compareBy({ it.t }, { it.k }))
        return events.mapIndexed { i, c ->
            val weights = LinkedHashMap<Int, Double>()
            weights[c.k] = c.presence
            for (d in intArrayOf(-1, 1, -12, 12)) {
                val k2 = c.k + d
                if (k2 !in 0 until ProbabilityGrid.KEYS) continue
                // a note of its own just before or after (a trill, a run, a grace note) is not an alternative:
                // its rising onset probability must not count as evidence against this pitch
                if (byKey[k2].any { abs(it.t - c.t) <= 4 }) continue
                var bt = c.t
                for (j in max(0, c.t - 1)..min(F - 1, c.t + 1)) if (grid.onset(j, k2) > grid.onset(bt, k2)) bt = j
                val q2 = c.merged[k2] ?: presence(grid, bt, k2)
                weights[k2] = q2 * (if (abs(d) == 12) 0.25 else 1.0)
            }
            val sum = weights.values.sum()
            val v = grid.velocity(c.t, c.k)
            NoteEvent(
                id = firstId + i,
                onset = max(0.0, (c.t + c.shift) / grid.fps),
                offset = c.end / grid.fps,
                velocity = if (v >= 0f) (v.coerceIn(0f, 1f) * 80 + 10).toInt() else (30 + 90 * c.peak).toInt().coerceIn(1, 127),
                presence = min(0.995, c.presence),
                options = weights.entries.map { PitchOption(it.key + ProbabilityGrid.LOWEST, it.value / sum) }.sortedByDescending { it.audioP },
            )
        }
    }

    private fun lg(p: Double): Double { val c = p.coerceIn(1e-4, 1 - 1e-4); return ln(c / (1 - c)) }
}
