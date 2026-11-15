package io.github.e1caro.scorebook.core.live

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

/**
 * Streaming sample-rate conversion (48 kHz or 44.1 kHz from the microphone → the model's 16 kHz) with a
 * windowed-sinc polyphase filter: everything above the new Nyquist frequency is removed first, so high notes
 * do not fold back as false ones. Output sample n is at the same instant as input sample n × in / out.
 */
class Resampler(val inRate: Int, val outRate: Int) {
    private val g = gcd(inRate, outRate)
    private val up = outRate / g // phases
    private val down = inRate / g
    private val half = (16 * max(1.0, down.toDouble() / up)).roundToInt() // filter half-width, in input samples
    private val table: Array<FloatArray> = run {
        val fc = 0.5 * min(1.0, up.toDouble() / down) * 0.92 // cut-off, cycles per input sample
        Array(up) { ph ->
            val taps = DoubleArray(2 * half) { j ->
                val t = (j - half + 1) - ph.toDouble() / up
                val sinc = if (kotlin.math.abs(t) < 1e-9) 2 * fc else sin(2 * PI * fc * t) / (PI * t)
                val w = 0.5 + 0.5 * cos(PI * t / half) // Hann over [-half, half]
                if (kotlin.math.abs(t) >= half) 0.0 else sinc * w
            }
            val sum = taps.sum()
            FloatArray(2 * half) { (taps[it] / sum).toFloat() }
        }
    }
    private var buf = FloatArray(8192 + 2 * half) // buf[0] is input sample `base`
    private var len = half // the stream starts with silence before sample 0
    private var base = -half.toLong()
    private var n = 0L // next output sample

    fun process(input: FloatArray, count: Int = input.size): FloatArray {
        if (len + count > buf.size) buf = buf.copyOf(max(buf.size * 2, len + count))
        System.arraycopy(input, 0, buf, len, count)
        len += count
        val out = FloatArray(((count.toLong() * up) / down).toInt() + 2)
        var o = 0
        while (true) {
            val pos = n * down
            val i = pos / up // input sample at or before the output instant
            val start = i - half + 1 - base
            if (start + 2 * half > len) break
            val taps = table[(pos % up).toInt()]
            var acc = 0f
            val s0 = start.toInt()
            for (j in taps.indices) acc += buf[s0 + j] * taps[j]
            if (o == out.size) break
            out[o++] = acc
            n++
        }
        // drop the input that no later output needs
        val keepFrom = ((n * down) / up - half + 1 - base).toInt().coerceIn(0, len)
        if (keepFrom > 0) {
            System.arraycopy(buf, keepFrom, buf, 0, len - keepFrom)
            len -= keepFrom
            base += keepFrom
        }
        return if (o == out.size) out else out.copyOf(o)
    }

    private fun gcd(a: Int, b: Int): Int = if (b == 0) a else gcd(b, a % b)
}
