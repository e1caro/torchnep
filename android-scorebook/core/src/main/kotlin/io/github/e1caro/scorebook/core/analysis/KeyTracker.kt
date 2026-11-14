package io.github.e1caro.scorebook.core.analysis

import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.music.pc
import kotlinx.serialization.Serializable
import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min

/** A note as key and chord analysis see it: pitch, time span and how much it may vote (audio confidence). */
data class VotingNote(val pitch: Int, val onset: Double, val offset: Double, val weight: Double)

/** A stretch of the piece in one key, in time steps of the tracker (beats). */
@Serializable
data class KeyRegion(val key: Key, val fromStep: Int, val toStep: Int)

/**
 * Key and mode over time: a hidden Markov model over the 24 major and minor keys.
 * Each time step's evidence is the pitch-class content of the notes sounding in it, weighted by the notes'
 * confidence, scored against the Temperley key profiles. Keys tend to stay (stay probability per step) and,
 * when they change, prefer neighbours on the circle of fifths. Modulations played with clear notes move the
 * posterior to the new key within a few beats.
 */
class KeyTracker(
    val stay: Double = 0.97,
    val temperature: Double = 1.0,
    val minRegionSteps: Int = 8,
) {
    private val logA: Array<DoubleArray> = run {
        val n = Key.ALL.size
        Array(n) { i ->
            val w = DoubleArray(n) { j ->
                if (i == j) 0.0 else {
                    val a = Key.ALL[i]; val b = Key.ALL[j]
                    val d = a.signatureDistance(b) + (if (a.mode != b.mode) 0.5 else 0.0)
                    exp(-d / 1.2)
                }
            }
            val s = w.sum()
            DoubleArray(n) { j -> ln(if (i == j) stay else (1 - stay) * w[j] / s) }
        }
    }
    private val logProfile: Array<DoubleArray> = Array(24) { k -> DoubleArray(12) { p -> ln(Key.ALL[k].profile(p)) } }

    /** Pitch-class weights per step; steps are the intervals [bounds[i], bounds[i+1]). */
    fun chroma(notes: List<VotingNote>, bounds: List<Double>): Array<DoubleArray> {
        val steps = max(0, bounds.size - 1)
        val v = Array(steps) { DoubleArray(12) }
        if (steps == 0) return v
        for (n in notes) {
            if (n.weight <= 0) continue
            var i = stepOf(bounds, n.onset).coerceIn(0, steps - 1)
            val end = min(n.offset, n.onset + 1.5) // long notes count, but not forever
            while (i < steps && bounds[i] < end) {
                val len = bounds[i + 1] - bounds[i]
                val overlap = (min(end, bounds[i + 1]) - max(n.onset, bounds[i])).coerceAtLeast(0.0) / len
                val onsetBonus = if (n.onset >= bounds[i] && n.onset < bounds[i + 1]) 0.5 else 0.0
                v[i][pc(n.pitch)] += n.weight * (overlap + onsetBonus)
                i++
            }
        }
        return v
    }

    private fun emissions(chroma: Array<DoubleArray>): Array<DoubleArray> = Array(chroma.size) { s ->
        DoubleArray(24) { k -> var e = 0.0; for (p in 0 until 12) e += chroma[s][p] * logProfile[k][p]; temperature * e }
    }

    /** Live: the probability of each key now, given everything so far. One row per step. */
    fun filter(chroma: Array<DoubleArray>): Array<DoubleArray> {
        val e = emissions(chroma)
        val out = Array(e.size) { DoubleArray(24) }
        var prev = DoubleArray(24) { ln(1.0 / 24) }
        for (s in e.indices) {
            val cur = DoubleArray(24) { j -> logSumExp(DoubleArray(24) { i -> prev[i] + logA[i][j] }) + e[s][j] }
            normalizeLog(cur)
            out[s] = DoubleArray(24) { exp(cur[it]) }
            prev = cur
        }
        return out
    }

    data class Result(val posterior: Array<DoubleArray>, val regions: List<KeyRegion>) {
        fun keyAt(step: Int): Key = regions.firstOrNull { step in it.fromStep until it.toStep }?.key
            ?: regions.lastOrNull()?.key ?: Key(0, io.github.e1caro.scorebook.core.music.Mode.MAJOR)

        /** P(pitch class | step) = Σ_k P(k | step) · profile_k(pc). */
        fun pitchClassPrior(step: Int): DoubleArray {
            val s = step.coerceIn(0, max(0, posterior.size - 1))
            val out = DoubleArray(12)
            if (posterior.isEmpty()) { for (p in 0 until 12) out[p] = Key(0, io.github.e1caro.scorebook.core.music.Mode.MAJOR).profile(p); return out }
            for (k in 0 until 24) { val w = posterior[s][k]; if (w < 1e-4) continue; for (p in 0 until 12) out[p] += w * Key.ALL[k].profile(p) }
            return out
        }
    }

    /** Whole take: smoothed posteriors (forward–backward) and key regions (Viterbi, short regions merged). */
    fun track(chroma: Array<DoubleArray>): Result {
        val e = emissions(chroma)
        val n = e.size
        if (n == 0) return Result(emptyArray(), listOf(KeyRegion(Key(0, io.github.e1caro.scorebook.core.music.Mode.MAJOR), 0, 0)))
        val fw = Array(n) { DoubleArray(24) }
        for (s in 0 until n) {
            for (j in 0 until 24) {
                fw[s][j] = e[s][j] + if (s == 0) ln(1.0 / 24) else logSumExp(DoubleArray(24) { i -> fw[s - 1][i] + logA[i][j] })
            }
            normalizeLog(fw[s])
        }
        val bw = Array(n) { DoubleArray(24) }
        for (s in n - 2 downTo 0) {
            for (i in 0 until 24) bw[s][i] = logSumExp(DoubleArray(24) { j -> logA[i][j] + e[s + 1][j] + bw[s + 1][j] })
            normalizeLog(bw[s])
        }
        val post = Array(n) { s -> val l = DoubleArray(24) { fw[s][it] + bw[s][it] }; normalizeLog(l); DoubleArray(24) { exp(l[it]) } }
        // Viterbi
        val delta = Array(n) { DoubleArray(24) }
        val psi = Array(n) { IntArray(24) }
        for (j in 0 until 24) delta[0][j] = ln(1.0 / 24) + e[0][j]
        for (s in 1 until n) for (j in 0 until 24) {
            var bi = 0; var bv = Double.NEGATIVE_INFINITY
            for (i in 0 until 24) { val v = delta[s - 1][i] + logA[i][j]; if (v > bv) { bv = v; bi = i } }
            delta[s][j] = bv + e[s][j]; psi[s][j] = bi
        }
        val path = IntArray(n)
        path[n - 1] = (0 until 24).maxByOrNull { delta[n - 1][it] }!!
        for (s in n - 1 downTo 1) path[s - 1] = psi[s][path[s]]
        return Result(post, regions(path, chroma))
    }

    private fun regions(path: IntArray, chroma: Array<DoubleArray>): List<KeyRegion> {
        val out = ArrayList<KeyRegion>()
        var start = 0
        for (s in 1..path.size) {
            if (s == path.size || path[s] != path[start]) { out.add(KeyRegion(Key.fromIndex(path[start]), start, s)); start = s }
        }
        // merge regions that are too short into the neighbour that explains their notes better
        var changed = true
        while (changed && out.size > 1) {
            changed = false
            val i = out.indices.filter { out[it].toStep - out[it].fromStep < minRegionSteps }.minByOrNull { out[it].toStep - out[it].fromStep } ?: break
            val r = out[i]
            val cands = listOfNotNull(out.getOrNull(i - 1), out.getOrNull(i + 1))
            val target = cands.maxByOrNull { c -> (r.fromStep until r.toStep).sumOf { s -> (0 until 12).sumOf { p -> chroma[s][p] * logProfile[c.key.index][p] } } }!!
            val ti = out.indexOf(target)
            out[ti] = KeyRegion(target.key, min(target.fromStep, r.fromStep), max(target.toStep, r.toStep))
            out.removeAt(i)
            // fuse equal neighbours
            var j = 0
            while (j < out.size - 1) { if (out[j].key == out[j + 1].key) { out[j] = KeyRegion(out[j].key, out[j].fromStep, out[j + 1].toStep); out.removeAt(j + 1) } else j++ }
            changed = true
        }
        return out
    }

    companion object {
        fun stepOf(bounds: List<Double>, t: Double): Int {
            var lo = 0; var hi = bounds.size - 1
            if (t < bounds[0]) return 0
            while (hi - lo > 1) { val m = (lo + hi) / 2; if (bounds[m] <= t) lo = m else hi = m }
            return lo
        }

        fun logSumExp(a: DoubleArray): Double {
            var m = Double.NEGATIVE_INFINITY
            for (x in a) if (x > m) m = x
            if (m == Double.NEGATIVE_INFINITY) return m
            var s = 0.0
            for (x in a) s += exp(x - m)
            return m + ln(s)
        }

        fun normalizeLog(a: DoubleArray) { val z = logSumExp(a); for (i in a.indices) a[i] -= z }
    }
}
