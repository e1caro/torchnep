package io.github.e1caro.scorebook.core.analysis

import kotlinx.serialization.Serializable
import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.floor
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sqrt

/** A played note as rhythm analysis sees it. */
data class TimedNote(val pitch: Int, val onset: Double, val offset: Double, val velocity: Int, val weight: Double = 1.0)

/**
 * Beat times found in the performance plus the meter. Beat i is at [beats][i] seconds; bar lines fall on
 * beats downbeat, downbeat + beatsPerBar, … A compound meter (6/8, 9/8, 12/8) has dotted-quarter beats.
 */
@Serializable
data class BeatGrid(
    val beats: List<Double>,
    val beatsPerBar: Int,
    val compound: Boolean,
    val downbeat: Int,
) {
    val period: Double get() = if (beats.size < 2) 0.6 else (beats.last() - beats.first()) / (beats.size - 1)
    val bpm: Double get() = 60.0 / medianPeriod()

    /** Time signature as written: 4/4, 3/4, 6/8 … */
    val numerator: Int get() = if (compound) beatsPerBar * 3 else beatsPerBar
    val denominator: Int get() = if (compound) 8 else 4
    val beatTicks: Int get() = if (compound) Ticks.QUARTER * 3 / 2 else Ticks.QUARTER
    val barTicks: Int get() = beatTicks * beatsPerBar

    fun medianPeriod(): Double {
        if (beats.size < 2) return 0.6
        val d = beats.zipWithNext { a, b -> b - a }.sorted()
        return d[d.size / 2]
    }

    /** Fractional beat index of a time (linear between beats, extrapolated outside). */
    fun position(t: Double): Double {
        if (beats.size < 2) return t / 0.6
        if (t <= beats[0]) return (t - beats[0]) / (beats[1] - beats[0])
        if (t >= beats.last()) return beats.size - 1 + (t - beats.last()) / (beats.last() - beats[beats.size - 2])
        var lo = 0
        var hi = beats.size - 1
        while (hi - lo > 1) { val m = (lo + hi) / 2; if (beats[m] <= t) lo = m else hi = m }
        return lo + (t - beats[lo]) / (beats[hi] - beats[lo])
    }

    fun time(position: Double): Double {
        if (beats.size < 2) return position * 0.6
        val i = floor(position).toInt()
        return when {
            i < 0 -> beats[0] + position * (beats[1] - beats[0])
            i >= beats.size - 1 -> beats.last() + (position - (beats.size - 1)) * (beats.last() - beats[beats.size - 2])
            else -> beats[i] + (position - i) * (beats[i + 1] - beats[i])
        }
    }

    /** Score tick (from the first bar line, which may be before the first beat if the piece starts with a pickup). */
    fun tickOf(position: Double): Double = (position - firstBarBeat()) * beatTicks

    /** Beat index where bar 1 starts (≤ 0 when there is a pickup). */
    fun firstBarBeat(): Int = downbeat - (if (downbeat > 0) beatsPerBar * ((downbeat + beatsPerBar - 1) / beatsPerBar) else 0)
}

object Ticks {
    const val QUARTER = 48 // divisions per quarter: allows 32nds (6) and triplet 8ths (16) / 16ths (8)
    const val WHOLE = QUARTER * 4
}

/**
 * Tempo, beats, meter and quantization. The observed timing is the evidence; musical regularity (steady beat,
 * common subdivisions, common durations) is the prior, weighted by [strictness] (0 = keep detail, 1 = simplest).
 */
class RhythmAnalyzer(val strictness: Double = 0.5) {

    fun analyze(notes: List<TimedNote>, meterHint: Pair<Int, Boolean>? = null): BeatGrid {
        val sorted = notes.sortedBy { it.onset }
        if (sorted.size < 4) {
            val start = sorted.firstOrNull()?.onset ?: 0.0
            val end = max(start + 2.4, sorted.maxOfOrNull { it.offset } ?: 0.0)
            return BeatGrid(generateSequence(start) { it + 0.6 }.takeWhile { it <= end + 0.6 }.toList(), 4, false, 0)
        }
        val env = envelope(sorted)
        val period = tempoPeriod(env)
        var beats = trackBeats(env, period, sorted)
        val (bpb, phase) = meterHint?.let { it.first to bestPhase(beats, sorted, it.first) } ?: meter(beats, sorted)
        val compound = meterHint?.second ?: isCompound(beats, sorted)
        beats = extendToCover(beats, sorted)
        return BeatGrid(beats, bpb, compound, phase)
    }

    // --- onset strength envelope (100 Hz) built from note onsets ---------------------------------------------
    private class Envelope(val v: DoubleArray, val t0: Double) { fun time(i: Int) = t0 + i * DT }

    private fun envelope(notes: List<TimedNote>): Envelope {
        val t0 = notes.first().onset - 0.5
        val n = ((notes.maxOf { it.onset } - t0) / DT).toInt() + 100
        val raw = DoubleArray(n)
        for (nt in notes) {
            val i = ((nt.onset - t0) / DT).roundToInt()
            val bass = if (nt.pitch < 55) 1.3 else 1.0
            if (i in raw.indices) raw[i] += nt.weight * (0.5 + nt.velocity / 127.0) * bass
        }
        // smooth (σ = 20 ms) and compress chords: log(1 + x)
        val out = DoubleArray(n)
        for (i in 0 until n) {
            if (raw[i] == 0.0) continue
            for (d in -6..6) { val j = i + d; if (j in 0 until n) out[j] += ln(1 + raw[i]) * exp(-0.5 * (d / 2.0) * (d / 2.0)) }
        }
        return Envelope(out, t0)
    }

    /** Beat period in seconds: autocorrelation of the onset envelope with a log-normal tempo prior at 100 BPM. */
    private fun tempoPeriod(env: Envelope): Double {
        val v = env.v
        var best = 0.6
        var bestScore = Double.NEGATIVE_INFINITY
        val minLag = (60.0 / 220 / DT).toInt()
        val maxLag = min((60.0 / 40 / DT).toInt(), v.size - 1)
        val r = DoubleArray(maxLag + 1)
        for (lag in minLag..maxLag) {
            var s = 0.0
            for (i in 0 until v.size - lag) s += v[i] * v[i + lag]
            r[lag] = s / (v.size - lag)
        }
        for (lag in minLag..maxLag) {
            val bpm = 60.0 / (lag * DT)
            val prior = exp(-0.5 * sq(log2(bpm / 100.0) / 0.9))
            // a beat is also supported by its half (subdivisions) and its double (bar-level accents)
            val half = if (lag / 2 >= minLag / 2) r[lag / 2] else 0.0
            val dbl = if (lag * 2 <= maxLag) r[lag * 2] else 0.0
            val score = (r[lag] + 0.25 * half + 0.25 * dbl) * prior
            if (score > bestScore) { bestScore = score; best = lag * DT }
        }
        return best
    }

    /** Dynamic-programming beat tracking (Ellis 2007) on the envelope; follows gradual tempo changes. */
    private fun trackBeats(env: Envelope, period: Double, notes: List<TimedNote>): List<Double> {
        val v = env.v
        val n = v.size
        val p = period / DT
        val tight = 60.0 + 200.0 * strictness
        val mean = v.average()
        val sd = sqrt(v.sumOf { sq(it - mean) } / n).coerceAtLeast(1e-9)
        val local = DoubleArray(n) { (v[it] - mean) / sd }
        val score = DoubleArray(n)
        val back = IntArray(n) { -1 }
        val lo = (p * 0.5).roundToInt().coerceAtLeast(1)
        val hi = (p * 2.0).roundToInt()
        for (i in 0 until n) {
            var bestPrev = -1
            var best = 0.0
            for (tau in lo..hi) {
                val j = i - tau
                if (j < 0) break
                val s = score[j] - tight * sq(ln(tau / p))
                if (bestPrev < 0 || s > best) { best = s; bestPrev = j }
            }
            if (bestPrev >= 0 && best > 0) { score[i] = local[i] + best; back[i] = bestPrev } else score[i] = local[i]
        }
        // best end within the last period after the last onset
        val lastOnset = ((notes.last().onset - env.t0) / DT).roundToInt().coerceIn(0, n - 1)
        var end = lastOnset
        for (i in max(0, lastOnset - p.toInt())..min(n - 1, lastOnset + p.toInt())) if (score[i] > score[end]) end = i
        val idx = ArrayList<Int>()
        var i = end
        while (i >= 0) { idx.add(i); i = back[i] }
        idx.reverse()
        val beats = idx.map { env.time(it) }.toMutableList()
        // the first note should not be before the first beat: extend backwards at the local period
        val first = notes.first().onset
        while (beats.size >= 2 && beats[0] - first > 0.15 * (beats[1] - beats[0])) beats.add(0, beats[0] - (beats[1] - beats[0]))
        return beats
    }

    private fun extendToCover(beats: List<Double>, notes: List<TimedNote>): List<Double> {
        val out = beats.toMutableList()
        val end = notes.maxOf { it.offset }
        while (out.size >= 2 && out.last() < end) out.add(out.last() + (out.last() - out[out.size - 2]))
        return out
    }

    /**
     * Accent of each beat: the lowest notes, long notes and loud notes mark strong beats; the number of notes
     * counts only a little (a waltz's "pah-pah" chords have more notes than its "oom" bass).
     */
    private fun accents(beats: List<Double>, notes: List<TimedNote>): DoubleArray {
        val bass = DoubleArray(beats.size)
        val len = DoubleArray(beats.size)
        val loud = DoubleArray(beats.size)
        val count = DoubleArray(beats.size)
        val lowest = notes.minOf { it.pitch }
        for (nt in notes) {
            val pos = positionIn(beats, nt.onset)
            val b = pos.roundToInt()
            if (b !in bass.indices || abs(pos - b) > 0.2) continue
            bass[b] = max(bass[b], ((60 - nt.pitch) / 12.0).coerceIn(0.0, 2.5) + if (nt.pitch - lowest < 7) 0.8 else 0.0)
            len[b] = max(len[b], ln(1 + (nt.offset - nt.onset) / 0.5))
            loud[b] = max(loud[b], nt.velocity / 127.0)
            count[b] += nt.weight
        }
        return DoubleArray(beats.size) { 1.0 * bass[it] + 0.6 * len[it] + 0.4 * loud[it] + 0.3 * ln(1 + count[it]) }
    }

    private fun meter(beats: List<Double>, notes: List<TimedNote>): Pair<Int, Int> {
        val a = accents(beats, notes)
        val sd = sqrt(a.map { sq(it - a.average()) }.average()).coerceAtLeast(1e-9)
        var best = 4 to 0
        var bestScore = Double.NEGATIVE_INFINITY
        for (m in intArrayOf(4, 3, 2)) {
            for (phase in 0 until m) {
                val on = a.indices.filter { Math.floorMod(it - phase, m) == 0 }.map { a[it] }
                val off = a.indices.filter { Math.floorMod(it - phase, m) != 0 }.map { a[it] }
                if (on.isEmpty() || off.isEmpty()) continue
                val prior = when (m) { 4 -> 0.12; 3 -> 0.0; else -> -0.08 }
                val s = (on.average() - off.average()) / sd + prior
                if (s > bestScore + 1e-9) { bestScore = s; best = m to phase }
            }
        }
        return best
    }

    private fun bestPhase(beats: List<Double>, notes: List<TimedNote>, m: Int): Int {
        val a = accents(beats, notes)
        return (0 until m).maxByOrNull { ph -> a.indices.filter { Math.floorMod(it - ph, m) == 0 }.sumOf { a[it] } } ?: 0
    }

    /** True when beats are mostly divided in three (6/8 rather than 2/4 with triplets everywhere). */
    private fun isCompound(beats: List<Double>, notes: List<TimedNote>): Boolean {
        var duple = 0.0
        var triple = 0.0
        for (nt in notes) {
            val pos = positionIn(beats, nt.onset)
            val x = pos - floor(pos)
            if (x < 0.1 || x > 0.9) continue
            val e2 = minOf(abs(x - 0.25), abs(x - 0.5), abs(x - 0.75))
            val e3 = minOf(abs(x - 1.0 / 3), abs(x - 2.0 / 3))
            if (e3 + 0.02 < e2) triple += 1 else if (e2 + 0.02 < e3) duple += 1
        }
        return triple >= 8 && triple > 2.0 * duple
    }

    // --- quantization ----------------------------------------------------------------------------------------

    /** Quantized onset ticks and durations for [notes] on [grid]. */
    fun quantize(notes: List<TimedNote>, grid: BeatGrid): List<QuantizedTiming> {
        data class Item(val idx: Int, val beat: Int, val x: Double)
        val items = notes.mapIndexed { i, nt ->
            val pos = grid.position(nt.onset)
            var b = floor(pos).toInt()
            var x = pos - b
            if (x > 0.9) { b += 1; x = 0.0 }
            Item(i, b, x)
        }
        val divisions = if (grid.compound) COMPOUND_DIVISIONS else SIMPLE_DIVISIONS
        val penalty = 0.35 + 3.0 * strictness
        val onsetTick = DoubleArray(notes.size)
        for ((beat, group) in items.groupBy { it.beat }) {
            val xs = group.map { it.x }.filter { it > 1e-6 }
            val best = divisions.minByOrNull { (s, cost) ->
                xs.sumOf { x -> sq((x - (x * s).roundToInt().toDouble() / s) / 0.07) } + penalty * cost
            }!!.first
            for (it in group) {
                val g = (it.x * best).roundToInt().toDouble() / best
                onsetTick[it.idx] = grid.tickOf(beat + g)
            }
        }
        return notes.mapIndexed { i, nt ->
            val start = onsetTick[i].roundToInt()
            val obs = (grid.position(nt.offset) - grid.position(nt.onset)) * grid.beatTicks
            QuantizedTiming(start, snapDuration(obs, grid))
        }
    }

    /** Most likely written duration for an observed one (piano offsets are unreliable: wide likelihood, strong prior). */
    fun snapDuration(observedTicks: Double, grid: BeatGrid): Int {
        val obs = observedTicks.coerceAtLeast(3.0)
        val values = if (grid.compound) COMPOUND_DURATIONS else SIMPLE_DURATIONS
        val sigma = 0.30 + 0.25 * strictness
        return values.maxByOrNull { (d, prior) -> -sq(ln(d / obs)) / (2 * sigma * sigma) + ln(prior) }!!.first.toInt()
    }

    companion object {
        const val DT = 0.01
        private fun sq(x: Double) = x * x
        private fun log2(x: Double) = ln(x) / ln(2.0)

        private fun positionIn(beats: List<Double>, t: Double): Double = BeatGrid(beats, 4, false, 0).position(t)

        /** Subdivisions of a beat and their complexity. */
        val SIMPLE_DIVISIONS = listOf(1 to 0.0, 2 to 0.5, 4 to 1.6, 3 to 2.0, 8 to 4.0, 6 to 4.5)
        val COMPOUND_DIVISIONS = listOf(1 to 0.0, 3 to 0.5, 6 to 1.6, 2 to 3.0, 12 to 4.0)

        /** Written durations (ticks) with how common they are. */
        val SIMPLE_DURATIONS = listOf(
            6.0 to 0.02, 12.0 to 0.12, 18.0 to 0.01, 24.0 to 0.20, 36.0 to 0.04, 48.0 to 0.22, 72.0 to 0.07,
            96.0 to 0.15, 144.0 to 0.05, 192.0 to 0.06, 288.0 to 0.01, 384.0 to 0.01,
        )
        val COMPOUND_DURATIONS = listOf(
            12.0 to 0.08, 24.0 to 0.25, 36.0 to 0.04, 48.0 to 0.15, 72.0 to 0.2, 96.0 to 0.04, 144.0 to 0.12,
            216.0 to 0.04, 288.0 to 0.04,
        )
    }
}

@Serializable
data class QuantizedTiming(val tick: Int, val duration: Int)
