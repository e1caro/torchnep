package io.github.e1caro.scorebook.core.analysis

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.ln
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

/** How far a piano is from concert pitch (A = 440 Hz), in cents: negative = flat. */
data class Tuning(val cents: Double, val confidence: Double)

/**
 * Finds a piano's tuning from a recording. Many home pianos are 10–40 cents flat as a whole; the transcription
 * model was trained on pianos at concert pitch and starts to miss notes (first of all inside chords) from about
 * 25 cents. The strongest spectral peaks between 180 and 1600 Hz (fundamentals and low partials) are compared
 * with the equal-tempered scale; the most common deviation is the tuning.
 */
object TuningEstimator {
    fun estimate(pcm: FloatArray, sampleRate: Int): Tuning? {
        var n = 4096
        while (n < sampleRate * 0.6) n *= 2 // about 0.7 s: 1–2 Hz per bin before interpolation
        if (pcm.size < n) return null
        val window = DoubleArray(n) { 0.5 - 0.5 * cos(2 * PI * it / n) }
        val re = DoubleArray(n)
        val im = DoubleArray(n)
        val hist = DoubleArray(100) // deviation in cents, −50 … +49, circular
        var total = 0.0
        val lo = (180.0 * n / sampleRate).toInt().coerceAtLeast(2)
        val hi = (1600.0 * n / sampleRate).toInt().coerceAtMost(n / 2 - 2)
        var rms = 0.0
        for (x in pcm) rms += x * x
        rms = sqrt(rms / pcm.size)
        var start = 0
        while (start + n <= pcm.size) {
            var e = 0.0
            for (i in 0 until n) { val v = pcm[start + i].toDouble(); re[i] = v * window[i]; im[i] = 0.0; e += v * v }
            if (sqrt(e / n) > 0.3 * rms) { // skip silence
                fft(re, im)
                val mag = DoubleArray(hi + 2) { if (it >= lo - 1) sqrt(re[it] * re[it] + im[it] * im[it]) else 0.0 }
                var top = 0.0
                for (k in lo..hi) if (mag[k] > top) top = mag[k]
                // the strongest local maxima of this frame
                val peaks = (lo..hi).filter { mag[it] > 0.08 * top && mag[it] > mag[it - 1] && mag[it] >= mag[it + 1] }.sortedByDescending { mag[it] }.take(10)
                for (k in peaks) {
                    val a = ln(mag[k - 1] + 1e-12); val b = ln(mag[k] + 1e-12); val c = ln(mag[k + 1] + 1e-12)
                    val delta = 0.5 * (a - c) / (a - 2 * b + c) // parabola through the log-magnitudes
                    val f = (k + delta) * sampleRate / n
                    val cents = 1200 * ln(f / 440.0) / ln(2.0)
                    val dev = cents - 100 * Math.round(cents / 100.0) // −50 … 50
                    val w = sqrt(mag[k] / top)
                    hist[Math.floorMod(dev.roundToInt() + 50, 100)] += w
                    total += w
                }
            }
            start += n / 2
        }
        if (total < 20) return null
        // smooth circularly (±4 cents) and take the mode, refined by the centroid around it
        val smooth = DoubleArray(100) { i -> (-4..4).sumOf { d -> hist[Math.floorMod(i + d, 100)] * (5 - abs(d)) } }
        val mode = smooth.indices.maxByOrNull { smooth[it] }!!
        var num = 0.0
        var den = 0.0
        for (d in -8..8) { val w = hist[Math.floorMod(mode + d, 100)]; num += w * d; den += w }
        val cents = mode - 50 + if (den > 0) num / den else 0.0
        val wrapped = if (cents > 50) cents - 100 else if (cents < -50) cents + 100 else cents
        return Tuning(wrapped, den / total)
    }

    /** In-place radix-2 FFT. */
    fun fft(re: DoubleArray, im: DoubleArray) {
        val n = re.size
        var j = 0
        for (i in 1 until n) {
            var bit = n shr 1
            while (j and bit != 0) { j = j xor bit; bit = bit shr 1 }
            j = j xor bit
            if (i < j) { val tr = re[i]; re[i] = re[j]; re[j] = tr; val ti = im[i]; im[i] = im[j]; im[j] = ti }
        }
        var len = 2
        while (len <= n) {
            val ang = -2 * PI / len
            val wr = cos(ang); val wi = sin(ang)
            var i = 0
            while (i < n) {
                var cr = 1.0; var ci = 0.0
                for (k in 0 until len / 2) {
                    val ur = re[i + k]; val ui = im[i + k]
                    val vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci
                    val vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr
                    re[i + k] = ur + vr; im[i + k] = ui + vi
                    re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi
                    val t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t
                }
                i += len
            }
            len = len shl 1
        }
    }
}

/**
 * Tuning compensation: the audio is fed to the model slightly faster (flat piano) or slower (sharp piano), so the
 * model hears it at concert pitch. Times the model reports are then scaled back by [timeScale].
 */
class TuningCompensation(val captureRate: Int, cents: Double) {
    /** The rate the captured audio is treated as having, for the resampler (a multiple of 20 Hz). */
    val effectiveRate: Int = if (abs(cents) < MIN_CENTS) captureRate else (captureRate * 2.0.pow(-cents.coerceIn(-MAX_CENTS, MAX_CENTS) / 1200.0) / 20).roundToInt() * 20

    /** Model seconds × this = real seconds. */
    val timeScale: Double get() = effectiveRate.toDouble() / captureRate

    companion object {
        /** Below this the piano counts as in tune (no compensation). */
        const val MIN_CENTS = 6.0
        const val MAX_CENTS = 60.0
    }
}
