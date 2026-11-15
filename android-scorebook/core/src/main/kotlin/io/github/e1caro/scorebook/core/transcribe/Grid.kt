package io.github.e1caro.scorebook.core.transcribe

import java.io.InputStream
import java.util.zip.GZIPInputStream

/**
 * The transcription model's output for a whole take: for every frame and every piano key (0 = A0 … 87 = C8), the
 * probability that a note starts there ([onset]) and that a note sounds there ([note]), and, when the model
 * gives it, how hard the key was struck ([velocity], 0..1). Frames are appended as the model produces them and
 * never change afterwards. Frame j starts at j / [fps] seconds.
 */
class ProbabilityGrid(val fps: Double = ModelSpec.BASIC_PITCH.fps) {
    private var onsets = FloatArray(KEYS * 1024)
    private var notes = FloatArray(KEYS * 1024)
    private var velocities: FloatArray? = null
    var frames = 0
        private set

    val hasVelocity: Boolean get() = velocities != null

    fun onset(t: Int, k: Int): Float = onsets[t * KEYS + k]
    fun note(t: Int, k: Int): Float = notes[t * KEYS + k]
    fun velocity(t: Int, k: Int): Float = velocities?.get(t * KEYS + k) ?: -1f
    fun time(frame: Int): Double = frame / fps
    fun frameAt(seconds: Double): Int = Math.round(seconds * fps).toInt()

    /** Appends [n] frames; the arrays hold them row by row (frame-major, 88 values per frame), from row [offset]. */
    fun append(onset: FloatArray, note: FloatArray, n: Int, offset: Int = 0, velocity: FloatArray? = null) {
        ensure(frames + n)
        System.arraycopy(onset, offset * KEYS, onsets, frames * KEYS, n * KEYS)
        System.arraycopy(note, offset * KEYS, notes, frames * KEYS, n * KEYS)
        if (velocity != null) {
            val v = velocities ?: FloatArray(onsets.size).also { velocities = it }
            System.arraycopy(velocity, offset * KEYS, v, frames * KEYS, n * KEYS)
        }
        frames += n
    }

    fun truncate(n: Int) { if (n < frames) frames = maxOf(0, n) }

    private fun ensure(n: Int) {
        if (n * KEYS <= onsets.size) return
        var cap = onsets.size
        while (cap < n * KEYS) cap *= 2
        onsets = onsets.copyOf(cap)
        notes = notes.copyOf(cap)
        velocities = velocities?.copyOf(cap)
    }

    companion object {
        const val KEYS = 88
        const val LOWEST = 21 // MIDI number of key 0 (A0)

        /**
         * Reads the fixture format: gzip of frames×88 onset bytes, then note bytes, then (optionally) velocity
         * bytes; value = byte / 255.
         */
        fun readBytes(input: InputStream, frames: Int, fps: Double = ModelSpec.BASIC_PITCH.fps): ProbabilityGrid {
            val bytes = GZIPInputStream(input).use { it.readBytes() }
            val plane = frames * KEYS
            require(bytes.size == plane * 2 || bytes.size == plane * 3) { "expected ${plane * 2} or ${plane * 3} bytes, got ${bytes.size}" }
            fun read(p: Int) = FloatArray(plane) { (bytes[p * plane + it].toInt() and 0xff) / 255f }
            return ProbabilityGrid(fps).also { it.append(read(0), read(1), frames, 0, if (bytes.size == plane * 3) read(2) else null) }
        }

        fun of(onset: FloatArray, note: FloatArray, fps: Double = ModelSpec.BASIC_PITCH.fps): ProbabilityGrid =
            ProbabilityGrid(fps).also { it.append(onset, note, onset.size / KEYS) }
    }
}
