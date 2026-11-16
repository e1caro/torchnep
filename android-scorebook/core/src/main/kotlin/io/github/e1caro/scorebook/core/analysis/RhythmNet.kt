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
import kotlin.math.sqrt

/**
 * The rhythm network: a small convolutional network over the sequence of notes. Every layer lets a note look at
 * notes further away (about 300 on each side in all), and for each note it says what a musician reading the
 * score would know: whether it is on a beat and on a bar line, how long the beat is there, how many beats the
 * bar has and whether they divide in three, the key signature, the hand, the place inside the beat and the
 * written length.
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

    private val hidden = w.getValue("inp.weight").shape[0]
    private val blocks = generateSequence(0) { it + 1 }.takeWhile { w.containsKey("blocks.$it.pw.weight") }.count()
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
        pitchClasses(notes, x, e + 5 + 2 * LAG_BINS + 2 * CLOCKS)
        // into the network's width, then the layers; each adds what it found to what was there (a residual)
        var h = Array(n) { linear("inp", x[it]) }
        for (b in 0 until blocks) h = block(b, h)
        x = Array(n) { layerNorm("norm", h[it]) }
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

    /**
     * The note's pitch class, and how much of each pitch class sounds within [PC_WINDOW] seconds of it: the
     * harmony and the key are in there.
     */
    private fun pitchClasses(notes: List<In>, x: Array<FloatArray>, at: Int) {
        val n = notes.size
        val cs = Array(n + 1) { DoubleArray(12) }
        for (i in 0 until n) {
            System.arraycopy(cs[i], 0, cs[i + 1], 0, 12)
            cs[i + 1][Math.floorMod(notes[i].pitch, 12)] += min(notes[i].duration, 2.0) + 0.1
        }
        var lo = 0
        var hi = 0
        for (i in 0 until n) {
            val t = notes[i].onset
            while (notes[lo].onset < t - PC_WINDOW) lo++
            while (hi < n && notes[hi].onset <= t + PC_WINDOW) hi++
            x[i][at + Math.floorMod(notes[i].pitch, 12)] = 1f
            var sum = 0.0
            for (k in 0 until 12) sum += cs[hi][k] - cs[lo][k]
            for (k in 0 until 12) x[i][at + 12 + k] = ((cs[hi][k] - cs[lo][k]) / maxOf(sum, 1e-9)).toFloat()
        }
    }

    /**
     * One layer: normalise each note's vector, let every channel look at the notes [DILATIONS] apart (a dilated
     * depthwise convolution over five positions; beyond the ends there is nothing), then mix the channels.
     */
    private fun block(index: Int, x: Array<FloatArray>): Array<FloatArray> {
        val n = x.size
        val c = hidden
        val dw = w.getValue("blocks.$index.dw.weight")
        val kernel = dw.shape[2]
        val dwW = dw.data
        val dwB = w.getValue("blocks.$index.dw.bias").data
        val dilation = DILATIONS[index % DILATIONS.size]
        val normed = Array(n) { layerNorm("blocks.$index.norm", x[it]) }
        val out = Array(n) { FloatArray(0) }
        val half = kernel / 2
        // the notes are independent of each other inside a layer: split them between the processor's cores
        val threads = if (n < 256) 1 else minOf(4, Runtime.getRuntime().availableProcessors())
        val work = (0 until threads).map { t ->
            Thread {
                val conv = FloatArray(c)
                var i = t
                while (i < n) {
                    for (ch in 0 until c) {
                        var a = dwB[ch]
                        for (k in 0 until kernel) {
                            val j = i + (k - half) * dilation
                            if (j in 0 until n) a += dwW[ch * kernel + k] * normed[j][ch]
                        }
                        conv[ch] = if (a > 0f) a else 0f
                    }
                    val mixed = linear("blocks.$index.pw", conv)
                    val xi = x[i]
                    for (ch in 0 until c) mixed[ch] += xi[ch]
                    out[i] = mixed
                    i += threads
                }
            }.also { it.start() }
        }
        work.forEach { it.join() }
        return out
    }

    private fun layerNorm(name: String, x: FloatArray): FloatArray {
        val weight = w.getValue("$name.weight").data
        val bias = w.getValue("$name.bias").data
        var mean = 0.0
        for (v in x) mean += v
        mean /= x.size
        var variance = 0.0
        for (v in x) variance += (v - mean) * (v - mean)
        variance /= x.size
        val inv = 1.0 / sqrt(variance + 1e-5)
        return FloatArray(x.size) { (((x[it] - mean) * inv) * weight[it] + bias[it]).toFloat() }
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
        /** How far apart the notes each layer looks at are. */
        val DILATIONS = intArrayOf(1, 2, 4, 8, 16, 32, 64, 1, 2, 4, 8, 16)
        const val LAG_BINS = 32
        const val LAG_LO = 0.1
        const val LAG_HI = 4.0
        const val CLOCKS = 16
        const val PC_WINDOW = 8.0
        const val FEATURES = 5 + 2 * LAG_BINS + 2 * CLOCKS + 12 + 12
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
