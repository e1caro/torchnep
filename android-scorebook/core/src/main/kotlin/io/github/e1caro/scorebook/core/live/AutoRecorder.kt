package io.github.e1caro.scorebook.core.live

import kotlin.math.log10
import kotlin.math.max
import kotlin.math.sqrt

/**
 * Hands-free start and stop. Listens to the input level: a take starts when the level rises well above the
 * room's noise floor (and keeps [preRollSeconds] of audio from before, so the first note is not cut), and ends
 * after [silenceSeconds] without sound and without new notes.
 */
class AutoRecorder(
    val sampleRate: Int,
    var silenceSeconds: Double = 5.0,
    val preRollSeconds: Double = 1.5,
    val startMarginDb: Double = 14.0,
    val silenceMarginDb: Double = 7.0,
) {
    enum class State { LISTENING, RECORDING }

    sealed interface Event {
        /** A take started; [preRoll] is the audio just before the trigger, to feed first. */
        class Started(val preRoll: FloatArray) : Event
        object Stopped : Event
    }

    var state = State.LISTENING
        private set
    var levelDb = -90.0
        private set
    var noiseFloorDb = -65.0
        private set

    private val ring = FloatArray((preRollSeconds * sampleRate).toInt())
    private var ringPos = 0
    private var ringFilled = 0
    private var loudBlocks = 0
    private var silentSamples = 0L
    private var lastNoteSample = 0L
    private var samples = 0L

    /** Seconds of the current take. */
    val recordingSeconds: Double get() = if (state == State.RECORDING) (samples - takeStart).toDouble() / sampleRate else 0.0
    private var takeStart = 0L

    /** Tell the recorder a note was heard (by the model or from MIDI): the take is not silent. */
    fun noteActivity() { lastNoteSample = samples; silentSamples = 0 }

    /** Starts a take now (a button, or a MIDI note). */
    fun forceStart(): Event.Started? {
        if (state == State.RECORDING) return null
        state = State.RECORDING
        takeStart = samples
        silentSamples = 0
        lastNoteSample = samples
        return Event.Started(drainRing())
    }

    fun forceStop(): Event? = if (state == State.RECORDING) { state = State.LISTENING; Event.Stopped } else null

    fun process(block: FloatArray, n: Int = block.size): Event? {
        var sum = 0.0
        for (i in 0 until n) sum += block[i] * block[i]
        levelDb = 10 * log10(max(sum / max(1, n), 1e-12))
        samples += n
        return when (state) {
            State.LISTENING -> {
                // the floor follows quiet levels quickly and loud ones very slowly
                noiseFloorDb = if (levelDb < noiseFloorDb) 0.8 * noiseFloorDb + 0.2 * levelDb else 0.998 * noiseFloorDb + 0.002 * levelDb
                noiseFloorDb = noiseFloorDb.coerceIn(-90.0, -30.0)
                val loud = levelDb > max(noiseFloorDb + startMarginDb, -55.0)
                loudBlocks = if (loud) loudBlocks + 1 else 0
                if (loudBlocks >= 3) {
                    loudBlocks = 0
                    val pre = drainRing()
                    state = State.RECORDING
                    takeStart = samples - n
                    silentSamples = 0
                    lastNoteSample = samples
                    // the current block is part of the take: pre-roll + this block
                    Event.Started(pre + block.copyOf(n))
                } else { push(block, n); null }
            }
            State.RECORDING -> {
                val quiet = levelDb < max(noiseFloorDb + silenceMarginDb, -60.0)
                silentSamples = if (quiet) silentSamples + n else 0
                val sinceNote = samples - lastNoteSample
                if (silentSamples >= silenceSeconds * sampleRate && sinceNote >= silenceSeconds * sampleRate) {
                    state = State.LISTENING
                    Event.Stopped
                } else null
            }
        }
    }

    private fun push(block: FloatArray, n: Int) {
        for (i in 0 until n) { ring[ringPos] = block[i]; ringPos = (ringPos + 1) % ring.size }
        ringFilled = minOf(ring.size, ringFilled + n)
    }

    private fun drainRing(): FloatArray {
        val out = FloatArray(ringFilled)
        val start = (ringPos - ringFilled + ring.size) % ring.size
        for (i in 0 until ringFilled) out[i] = ring[(start + i) % ring.size]
        ringFilled = 0
        return out
    }

    companion object {
        fun rms(block: FloatArray, n: Int): Double { var s = 0.0; for (i in 0 until n) s += block[i] * block[i]; return sqrt(s / max(1, n)) }
    }
}

/** Halves the sample rate (44.1 kHz → 22.05 kHz) with a windowed-sinc low-pass, streaming. */
class Decimator2 {
    private val taps: FloatArray = run {
        val n = 63
        val m = n / 2
        val h = FloatArray(n) { i ->
            val k = i - m
            val sinc = if (k == 0) 0.5 else kotlin.math.sin(Math.PI * 0.5 * k) / (Math.PI * k)
            val w = 0.42 - 0.5 * kotlin.math.cos(2 * Math.PI * i / (n - 1)) + 0.08 * kotlin.math.cos(4 * Math.PI * i / (n - 1))
            (sinc * w).toFloat()
        }
        val s = h.sum()
        FloatArray(n) { h[it] / s }
    }
    private val hist = FloatArray(taps.size)
    private var pos = 0
    private var phase = 0

    fun process(input: FloatArray, n: Int = input.size): FloatArray {
        val out = FloatArray((n + 1 - phase) / 2 + 1)
        var o = 0
        for (i in 0 until n) {
            hist[pos] = input[i]
            pos = (pos + 1) % hist.size
            if (phase == 0) {
                var acc = 0f
                var j = pos
                for (t in taps.indices) { acc += taps[t] * hist[j]; j = (j + 1) % hist.size }
                out[o++] = acc
            }
            phase = phase xor 1
        }
        return out.copyOf(o)
    }
}
