package io.github.e1caro.scorebook.core.analysis

import java.io.InputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.floor
import kotlin.math.ln
import kotlin.math.ln1p
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.tanh

/**
 * The rhythm network: a small bidirectional recurrent network (two GRU layers) that reads the notes of a
 * performance in order and says for each note what a musician reading the score would know: whether it is on a
 * beat and on a bar line, how long the beat is there, how many beats the bar has and whether they divide in
 * three, the key signature, the hand, the place inside the beat and the written length.
 *
 * It was trained (tools/train_rhythm_net.py) on real classical performances aligned with their scores, with the
 * inputs made as noisy as notes heard through a microphone. This class only runs it: plain arithmetic on the
 * weights file, no library.
 */
class RhythmNet private constructor(private val w: Map<String, Tensor>) {
    class Tensor(val shape: IntArray, val data: FloatArray)

    /** A note as the network sees it. Notes must be given in order of onset, then pitch. */
    class In(val pitch: Int, val onset: Double, val duration: Double, val velocity: Int)

    /** What the network says about each note (probabilities; [period] in seconds). */
    class Out(
        val beat: FloatArray,
        val downbeat: FloatArray,
        /** The most likely length of the beat at each note, in seconds. */
        val period: DoubleArray,
        /** P(beats per bar = [BEATS_PER_BAR][j]). */
        val beatsPerBar: Array<FloatArray>,
        val compound: FloatArray,
        /** P(key signature), by the tonic of its major key (0 = C … 11 = B). */
        val key: Array<FloatArray>,
        val leftHand: FloatArray,
        /** log P(place in the beat = k/24). */
        val position: Array<FloatArray>,
        /** log P(written length = [DURATIONS][j] beats). */
        val length: Array<FloatArray>,
    )

    private val hidden = w.getValue("gru.weight_hh_l0").shape[1]
    private val layers = generateSequence(0) { it + 1 }.takeWhile { w.containsKey("gru.weight_ih_l$it") }.count()
    private var lastKey = 0L
    private var lastOut: Out? = null

    fun run(notes: List<In>): Out {
        // the same notes are analysed again and again while the player moves a slider: remember the last answer
        var key = notes.size.toLong()
        for (n in notes) key = key * 1_000_003L + n.pitch + (n.onset * 1000).toLong() * 31 + (n.duration * 1000).toLong() * 131 + n.velocity * 7L
        synchronized(this) { lastOut?.let { if (lastKey == key && it.beat.size == notes.size) return it } }
        val out = compute(notes)
        synchronized(this) { lastKey = key; lastOut = out }
        return out
    }

    private fun compute(notes: List<In>): Out {
        val n = notes.size
        val embed = w.getValue("embed.weight")
        val e = embed.shape[1]
        val inDim = e + FEATURES
        var x = Array(n) { FloatArray(inDim) }
        for (i in 0 until n) {
            val nt = notes[i]
            val p = (nt.pitch - 21).coerceIn(0, 87)
            System.arraycopy(embed.data, p * e, x[i], 0, e)
            val prev = if (i == 0) 0.0 else nt.onset - notes[i - 1].onset
            val next = if (i == n - 1) 0.0 else notes[i + 1].onset - nt.onset
            x[i][e] = (ln1p(min(prev, 4.0) * 8) / ln1p(32.0)).toFloat()
            x[i][e + 1] = (ln1p(min(next, 4.0) * 8) / ln1p(32.0)).toFloat()
            x[i][e + 2] = (ln1p(nt.duration.coerceIn(0.0, 4.0) * 4) / ln1p(16.0)).toFloat()
            x[i][e + 3] = nt.velocity / 127f
            x[i][e + 4] = if (i > 0 && prev < 0.03) 1f else 0f
        }
        neighbours(notes, x, e + 5)
        clocks(notes, x, e + 5 + 2 * LAG_BINS)
        for (l in 0 until layers) {
            val input = x
            val fwd = Array(n) { FloatArray(0) }
            val bwd = Array(n) { FloatArray(0) }
            // the two directions do not depend on each other: one thread each
            val t = Thread { gru(input, "_l${l}_reverse", true, bwd) }
            t.start()
            gru(input, "_l$l", false, fwd)
            t.join()
            x = Array(n) { i -> FloatArray(2 * hidden).also { System.arraycopy(fwd[i], 0, it, 0, hidden); System.arraycopy(bwd[i], 0, it, hidden, hidden) } }
        }
        val beat = FloatArray(n)
        val down = FloatArray(n)
        val period = DoubleArray(n)
        val bpb = Array(n) { FloatArray(BEATS_PER_BAR.size) }
        val comp = FloatArray(n)
        val key = Array(n) { FloatArray(12) }
        val left = FloatArray(n)
        val pos = Array(n) { FloatArray(POSITIONS) }
        val len = Array(n) { FloatArray(DURATIONS.size) }
        for (i in 0 until n) {
            val b = linear("beat", x[i])
            beat[i] = sigmoid(b[0]); down[i] = sigmoid(b[1])
            val pr = softmax(linear("period", x[i]))
            // the middle of the most likely stretch of three bins: steadier than the single best bin
            var bi = 1
            var bv = -1f
            for (k in 1 until pr.size - 1) { val v = pr[k - 1] + pr[k] + pr[k + 1]; if (v > bv) { bv = v; bi = k } }
            val centre = (pr[bi - 1] * (bi - 1) + pr[bi] * bi + pr[bi + 1] * (bi + 1)) / bv + 0.5
            period[i] = 2.0.pow(PERIOD_LO + centre / pr.size * (PERIOD_HI - PERIOD_LO))
            val m = linear("meter", x[i])
            val mp = softmax(m.copyOfRange(0, BEATS_PER_BAR.size))
            System.arraycopy(mp, 0, bpb[i], 0, mp.size)
            comp[i] = sigmoid(m[BEATS_PER_BAR.size])
            key[i] = softmax(linear("key", x[i]))
            left[i] = sigmoid(linear("hand", x[i])[0])
            pos[i] = logSoftmax(linear("pos", x[i]))
            len[i] = logSoftmax(linear("dur", x[i]))
        }
        return Out(beat, down, period, bpb, comp, key, left, pos, len)
    }

    /**
     * Each note's distances to the onsets around it (0.1 s to 4 s on a log scale, before and after): on a steady
     * pulse they pile up at the beat length and its multiples, so the network sees the tempo instead of counting.
     */
    private fun neighbours(notes: List<In>, x: Array<FloatArray>, at: Int) {
        val n = notes.size
        // notes struck together are one onset
        val group = IntArray(n)
        val times = ArrayList<Double>()
        for (i in 0 until n) {
            if (i == 0 || notes[i].onset - notes[i - 1].onset >= 0.03) times.add(notes[i].onset)
            group[i] = times.size - 1
        }
        val g = times.size
        val hist = Array(g) { IntArray(2 * LAG_BINS) }
        val scale = LAG_BINS / ln(LAG_HI / LAG_LO)
        var lo = 0
        for (a in 0 until g) {
            while (times[a] - times[lo] >= LAG_HI) lo++
            var c = lo
            while (c < g && times[c] - times[a] < LAG_HI) {
                val d = times[c] - times[a]
                val ad = kotlin.math.abs(d)
                if (ad >= LAG_LO && ad < LAG_HI) {
                    val b = floor(ln(ad / LAG_LO) * scale).toInt().coerceIn(0, LAG_BINS - 1)
                    hist[a][if (d > 0) b + LAG_BINS else b]++
                }
                c++
            }
        }
        for (i in 0 until n) {
            val h = hist[group[i]]
            for (k in 0 until 2 * LAG_BINS) x[i][at + k] = (ln1p(h[k].toDouble()) / 2.0).toFloat()
        }
    }

    /** A clock: where each onset falls in cycles of many lengths (0.1 s to 6.4 s), counted from the first note. */
    private fun clocks(notes: List<In>, x: Array<FloatArray>, at: Int) {
        val t0 = notes.firstOrNull()?.onset ?: return
        for (i in notes.indices) {
            val rel = notes[i].onset - t0
            for (k in 0 until CLOCKS) {
                val period = 0.1 * 2.0.pow(k * 6.0 / (CLOCKS - 1))
                val ph = 2 * Math.PI * rel / period
                x[i][at + k] = sin(ph).toFloat()
                x[i][at + CLOCKS + k] = cos(ph).toFloat()
            }
        }
    }

    /** One direction of one GRU layer (PyTorch's equations and gate order: reset, update, new). */
    private fun gru(x: Array<FloatArray>, suffix: String, reverse: Boolean, out: Array<FloatArray>) {
        val wih = w.getValue("gru.weight_ih$suffix")
        val whh = w.getValue("gru.weight_hh$suffix").data
        val bih = w.getValue("gru.bias_ih$suffix").data
        val bhh = w.getValue("gru.bias_hh$suffix").data
        val h = hidden
        val inDim = wih.shape[1]
        val wi = wih.data
        var state = FloatArray(h)
        val gi = FloatArray(3 * h)
        val gh = FloatArray(3 * h)
        val n = x.size
        for (step in 0 until n) {
            val t = if (reverse) n - 1 - step else step
            val xt = x[t]
            for (g in 0 until 3 * h) {
                var a = bih[g]
                var o = g * inDim
                for (k in 0 until inDim) a += wi[o++] * xt[k]
                gi[g] = a
                var b = bhh[g]
                o = g * h
                for (k in 0 until h) b += whh[o++] * state[k]
                gh[g] = b
            }
            val next = FloatArray(h)
            for (k in 0 until h) {
                val r = sigmoid(gi[k] + gh[k])
                val z = sigmoid(gi[h + k] + gh[h + k])
                val c = tanh(gi[2 * h + k] + r * gh[2 * h + k])
                next[k] = (1 - z) * c + z * state[k]
            }
            state = next
            out[t] = next
        }
    }

    private fun linear(name: String, x: FloatArray): FloatArray {
        val weight = w.getValue("$name.weight")
        val bias = w.getValue("$name.bias").data
        val rows = weight.shape[0]
        val cols = weight.shape[1]
        val d = weight.data
        return FloatArray(rows) { r ->
            var a = bias[r]
            var o = r * cols
            for (k in 0 until cols) a += d[o++] * x[k]
            a
        }
    }

    companion object {
        const val LAG_BINS = 32
        const val LAG_LO = 0.1
        const val LAG_HI = 4.0
        const val CLOCKS = 16
        const val FEATURES = 5 + 2 * LAG_BINS + 2 * CLOCKS
        const val POSITIONS = 24
        val BEATS_PER_BAR = intArrayOf(2, 3, 4, 5)
        val DURATIONS = doubleArrayOf(1.0 / 8, 1.0 / 6, 1.0 / 4, 1.0 / 3, 3.0 / 8, 1.0 / 2, 2.0 / 3, 3.0 / 4, 1.0, 1.5, 2.0, 3.0, 4.0, 6.0, 8.0)
        private val PERIOD_LO = ln(0.15) / ln(2.0)
        private val PERIOD_HI = ln(3.2) / ln(2.0)

        private fun sigmoid(x: Float): Float = (1.0 / (1.0 + exp(-x.toDouble()))).toFloat()

        private fun softmax(x: FloatArray): FloatArray {
            val m = x.max()
            var s = 0.0
            for (v in x) s += exp((v - m).toDouble())
            return FloatArray(x.size) { (exp((x[it] - m).toDouble()) / s).toFloat() }
        }

        private fun logSoftmax(x: FloatArray): FloatArray {
            val m = x.max()
            var s = 0.0
            for (v in x) s += exp((v - m).toDouble())
            val z = m + ln(s).toFloat()
            return FloatArray(x.size) { x[it] - z }
        }

        /** Reads the weights written by tools/train_rhythm_net.py. */
        fun load(input: InputStream): RhythmNet {
            val bytes = input.use { it.readBytes() }
            val bb = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
            require(bytes.size > 12 && String(bytes, 0, 4) == "SBRN") { "not a rhythm network file" }
            bb.position(4)
            require(bb.int == 1) { "unknown version of the rhythm network file" }
            val count = bb.int
            val tensors = HashMap<String, Tensor>()
            repeat(count) {
                val nameBytes = ByteArray(bb.int)
                bb.get(nameBytes)
                val shape = IntArray(bb.int) { bb.int }
                val size = shape.fold(1) { a, b -> a * b }
                val data = FloatArray(size)
                bb.asFloatBuffer().get(data)
                bb.position(bb.position() + 4 * size)
                tensors[String(nameBytes)] = Tensor(shape, data)
            }
            return RhythmNet(tensors)
        }
    }
}
