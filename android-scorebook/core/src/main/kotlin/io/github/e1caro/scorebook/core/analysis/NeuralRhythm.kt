package io.github.e1caro.scorebook.core.analysis

import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.floor
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Beats, bars, places and lengths from what the [RhythmNet] says about each note.
 *
 * The network judges notes; music also has beats where nothing is played, and a page needs one consistent grid.
 * So its answers are evidence, and the grid is found here:
 *  - **beats**: dynamic programming over time, as in the classic tracker, but the evidence is the network's
 *    "this note is on a beat" and the expected beat length follows the network's local tempo, so the tracker
 *    knows the tempo level (quarter or eighth?) and follows rubato;
 *  - **bars**: the number of beats per bar and the bar-line phase that agree best with "this note is on a bar
 *    line" over the whole piece;
 *  - **places and lengths**: for each note, the network's opinion of where in the beat it is written, weighed
 *    against where it was actually played.
 */
class NeuralRhythm(private val p: Params = Params()) {
    data class Params(
        /** How strongly beats keep the expected length (higher = stiffer). */
        val tightness: Double = 30.0,
        /** A note needs this much "on the beat" to pull a beat towards it. */
        val beatThreshold: Double = 0.35,
        /** Cost of a beat where no note is played. */
        val emptyBeat: Double = 0.15,
        /** Weight of the network's "beats per bar" against the bar-line pattern. */
        val meterPrior: Double = 0.6,
        /** How far (in beats) a note is usually played from where it is written. */
        val placeSigma: Double = 0.07,
        /** How unreliable heard lengths are (in log units). */
        val lengthSigma: Double = 0.55,
    )

    class Result(val grid: BeatGrid, val ticks: IntArray, val durations: IntArray, val leftHand: BooleanArray)

    /**
     * [notes] in order of onset then pitch, with the network's [out] for them. [meterHint], [tempoScale] and
     * [barLineAt] are the player's corrections (Adjust), as in [RhythmAnalyzer.analyze].
     */
    fun analyze(notes: List<RhythmNet.In>, out: RhythmNet.Out, meterHint: Pair<Int, Boolean>? = null, tempoScale: Double = 1.0, barLineAt: Double? = null): Result {
        var beats = trackBeats(notes, out)
        if (tempoScale < 0.75) beats = beats.filterIndexed { i, _ -> i % 2 == 0 } else if (tempoScale > 1.5) beats = double(beats)
        val end = notes.maxOf { it.onset + it.duration }
        val all = beats.toMutableList()
        while (all.size >= 2 && all.last() < end) all.add(all.last() + (all.last() - all[all.size - 2]))
        val (bpb, phase) = meter(all, notes, out, meterHint?.first, barLineAt)
        val compound = meterHint?.second ?: (weightedMean(out.compound, out) > 0.5)
        val grid = BeatGrid(all, bpb, compound, phase)
        val ticks = places(notes, out, grid)
        val durations = lengths(notes, out, grid, ticks)
        return Result(grid, ticks, durations, hands(notes, out))
    }

    private fun weightedMean(x: FloatArray, out: RhythmNet.Out): Double = if (x.isEmpty()) 0.0 else x.sumOf { it.toDouble() } / x.size

    // ---- beats ----------------------------------------------------------------------------------------------
    private fun trackBeats(notes: List<RhythmNet.In>, out: RhythmNet.Out): List<Double> {
        val t0 = notes.first().onset - 0.5
        val last = notes.last().onset
        val n = ((last - t0) / DT).toInt() + 100
        // evidence at each moment: the most beat-like note struck there (above the threshold: for, below: against)
        val local = DoubleArray(n) { -p.emptyBeat }
        val has = BooleanArray(n)
        // the expected beat length at each moment: the network's local tempo, smoothed over a few seconds
        val per = DoubleArray(n)
        val perW = DoubleArray(n)
        for ((i, nt) in notes.withIndex()) {
            val f = ((nt.onset - t0) / DT).roundToInt().coerceIn(0, n - 1)
            val v = (out.beat[i] - p.beatThreshold) / (1 - p.beatThreshold)
            local[f] = if (has[f]) max(local[f], v) else v
            has[f] = true
            per[f] += ln(out.period[i])
            perW[f] += 1.0
        }
        // spread the evidence over ±20 ms (a chord is never struck exactly together)
        val ev = DoubleArray(n) { i ->
            var best = local[i]
            if (!has[i]) for (d in -2..2) { val j = i + d; if (j in 0 until n && has[j] && local[j] > 0) best = max(best, local[j] * (1 - 0.25 * abs(d))) }
            best
        }
        val period = smoothPeriod(per, perW)
        val score = DoubleArray(n)
        val back = IntArray(n) { -1 }
        for (i in 0 until n) {
            val pf = period[i] / DT
            val lo = max(1, (pf * 0.55).roundToInt())
            val hi = (pf * 1.8).roundToInt()
            var bestPrev = -1
            var best = 0.0
            for (tau in lo..hi) {
                val j = i - tau
                if (j < 0) break
                val l = ln(tau / pf)
                val s = score[j] - p.tightness * l * l
                if (bestPrev < 0 || s > best) { best = s; bestPrev = j }
            }
            if (bestPrev >= 0 && best > -p.tightness * 0.3) { score[i] = ev[i] + best; back[i] = bestPrev } else score[i] = ev[i]
        }
        val lastF = ((last - t0) / DT).roundToInt().coerceIn(0, n - 1)
        val span = (period[lastF] / DT).toInt()
        var endF = lastF
        for (i in max(0, lastF - span)..min(n - 1, lastF + span)) if (score[i] > score[endF]) endF = i
        val idx = ArrayList<Int>()
        var i = endF
        while (i >= 0) { idx.add(i); i = back[i] }
        idx.reverse()
        val beats = idx.map { t0 + it * DT }.toMutableList()
        val first = notes.first().onset
        while (beats.size >= 2 && beats[0] - first > 0.15 * (beats[1] - beats[0])) beats.add(0, beats[0] - (beats[1] - beats[0]))
        if (beats.size < 2) {
            val per0 = period[lastF]
            return generateSequence(first) { it + per0 }.takeWhile { it <= last + per0 }.toList()
        }
        return beats
    }

    /** exp of the running mean of the log beat length over about ±2.5 s; frames without notes take their neighbours'. */
    private fun smoothPeriod(logSum: DoubleArray, w: DoubleArray): DoubleArray {
        val n = logSum.size
        val half = (2.5 / DT).toInt()
        val cs = DoubleArray(n + 1)
        val cw = DoubleArray(n + 1)
        for (i in 0 until n) { cs[i + 1] = cs[i] + logSum[i]; cw[i + 1] = cw[i] + w[i] }
        val total = if (cw[n] > 0) cs[n] / cw[n] else ln(0.6)
        return DoubleArray(n) { i ->
            val a = max(0, i - half)
            val b = min(n, i + half + 1)
            val ww = cw[b] - cw[a]
            exp(if (ww >= 3) (cs[b] - cs[a]) / ww else total).coerceIn(0.12, 4.0)
        }
    }

    private fun double(beats: List<Double>): List<Double> {
        if (beats.size < 2) return beats
        val out = ArrayList<Double>()
        for (i in 0 until beats.size - 1) { out.add(beats[i]); out.add((beats[i] + beats[i + 1]) / 2) }
        out.add(beats.last())
        return out
    }

    // ---- bars -----------------------------------------------------------------------------------------------
    private fun meter(beats: List<Double>, notes: List<RhythmNet.In>, out: RhythmNet.Out, forced: Int?, barLineAt: Double?): Pair<Int, Int> {
        // per beat: the strongest "bar line" among the notes on it (unknown where the beat is silent)
        val down = DoubleArray(beats.size) { Double.NaN }
        val grid = BeatGrid(beats, 4, false, 0)
        for ((i, nt) in notes.withIndex()) {
            val pos = grid.position(nt.onset)
            val b = pos.roundToInt()
            if (b !in down.indices || abs(pos - b) > 0.2) continue
            down[b] = if (down[b].isNaN()) out.downbeat[i].toDouble() else max(down[b], out.downbeat[i].toDouble())
        }
        val prior = DoubleArray(RhythmNet.BEATS_PER_BAR.size) { j -> out.beatsPerBar.sumOf { it[j].toDouble() } / max(1, out.beatsPerBar.size) }
        var best = (forced ?: 4) to 0
        var bestScore = Double.NEGATIVE_INFINITY
        for ((j, m) in RhythmNet.BEATS_PER_BAR.withIndex()) {
            if (forced != null && m != forced) continue
            for (phase in 0 until m) {
                var on = 0.0; var onN = 0; var off = 0.0; var offN = 0
                for (b in down.indices) {
                    if (down[b].isNaN()) continue
                    if (Math.floorMod(b - phase, m) == 0) { on += down[b]; onN++ } else { off += down[b]; offN++ }
                }
                if (onN == 0) continue
                val s = on / onN - (if (offN > 0) off / offN else 0.0) + p.meterPrior * ln(prior[j] + 1e-3)
                if (s > bestScore) { bestScore = s; best = m to phase }
            }
        }
        if (forced != null && barLineAt != null) {
            val k = beats.indices.minByOrNull { abs(beats[it] - barLineAt) }!!
            return forced to Math.floorMod(k, forced)
        }
        return best
    }

    // ---- places in the beat -----------------------------------------------------------------------------------
    private fun places(notes: List<RhythmNet.In>, out: RhythmNet.Out, grid: BeatGrid): IntArray {
        val ticks = IntArray(notes.size)
        val k = RhythmNet.POSITIONS
        var i = 0
        var prevTick = Int.MIN_VALUE
        while (i < notes.size) {
            // notes struck together are written together
            var j = i + 1
            while (j < notes.size && notes[j].onset - notes[i].onset < 0.03) j++
            val pos = (i until j).map { grid.position(notes[it].onset) }.average()
            val beat = floor(pos).toInt()
            val x = pos - beat
            var bestTick = prevTick
            var bestScore = Double.NEGATIVE_INFINITY
            // the places of this beat and the first of the next
            for (c in 0..k) {
                val d = x - c.toDouble() / k
                var s = -d * d / (2 * p.placeSigma * p.placeSigma)
                for (q in i until j) s += out.position[q][c % k] / (j - i)
                val tick = grid.tickOf(beat + c.toDouble() / k).roundToInt()
                if (tick < prevTick) continue // never before what was played before it
                if (s > bestScore) { bestScore = s; bestTick = tick }
            }
            if (bestScore == Double.NEGATIVE_INFINITY) bestTick = max(prevTick, grid.tickOf(pos).roundToInt())
            for (q in i until j) ticks[q] = bestTick
            prevTick = bestTick
            i = j
        }
        return ticks
    }

    // ---- written lengths ------------------------------------------------------------------------------------
    private fun lengths(notes: List<RhythmNet.In>, out: RhythmNet.Out, grid: BeatGrid, ticks: IntArray): IntArray = IntArray(notes.size) { i ->
        val nt = notes[i]
        val obs = ((grid.position(nt.onset + nt.duration) - grid.position(nt.onset))).coerceAtLeast(0.05)
        var best = 0
        var bestScore = Double.NEGATIVE_INFINITY
        for ((j, d) in RhythmNet.DURATIONS.withIndex()) {
            val l = ln(d / obs)
            val s = out.length[i][j] - l * l / (2 * p.lengthSigma * p.lengthSigma)
            if (s > bestScore) { bestScore = s; best = j }
        }
        (RhythmNet.DURATIONS[best] * grid.beatTicks).roundToInt().coerceAtLeast(3)
    }

    // ---- hands ----------------------------------------------------------------------------------------------
    /** Notes struck together are cut once between the hands: everything below the cut is the left hand's. */
    private fun hands(notes: List<RhythmNet.In>, out: RhythmNet.Out): BooleanArray {
        val left = BooleanArray(notes.size)
        var i = 0
        while (i < notes.size) {
            var j = i + 1
            while (j < notes.size && notes[j].onset - notes[i].onset < 0.03) j++
            val order = (i until j).sortedBy { notes[it].pitch }
            var bestCut = 0
            var bestScore = Double.NEGATIVE_INFINITY
            for (cut in 0..order.size) {
                var s = 0.0
                for ((r, q) in order.withIndex()) {
                    val pl = out.leftHand[q].toDouble().coerceIn(1e-4, 1 - 1e-4)
                    s += ln(if (r < cut) pl else 1 - pl)
                }
                if (s > bestScore) { bestScore = s; bestCut = cut }
            }
            for ((r, q) in order.withIndex()) left[q] = r < bestCut
            i = j
        }
        return left
    }

    companion object {
        const val DT = 0.01
    }
}
