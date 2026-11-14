package io.github.e1caro.scorebook.core.transcribe

import java.io.InputStream
import java.util.zip.GZIPInputStream

/**
 * The transcription model's output for a whole take: for every frame (86.13 per second) and every piano key
 * (0 = A0 … 87 = C8), the probability that a note starts there ([onset]) and that a note sounds there ([note]).
 * Frames are appended as the model produces them and never change afterwards.
 */
class ProbabilityGrid(val fps: Double = BasicPitchStream.FPS) {
    private var onsets = FloatArray(KEYS * 1024)
    private var notes = FloatArray(KEYS * 1024)
    var frames = 0
        private set

    fun onset(t: Int, k: Int): Float = onsets[t * KEYS + k]
    fun note(t: Int, k: Int): Float = notes[t * KEYS + k]
    fun time(frame: Int): Double = frame / fps
    fun frameAt(seconds: Double): Int = Math.round(seconds * fps).toInt()

    /** Appends [n] frames; [onset] and [note] hold them row by row (frame-major, 88 values per frame). */
    fun append(onset: FloatArray, note: FloatArray, n: Int, offset: Int = 0) {
        ensure(frames + n)
        System.arraycopy(onset, offset * KEYS, onsets, frames * KEYS, n * KEYS)
        System.arraycopy(note, offset * KEYS, notes, frames * KEYS, n * KEYS)
        frames += n
    }

    fun truncate(n: Int) { if (n < frames) frames = maxOf(0, n) }

    private fun ensure(n: Int) {
        if (n * KEYS <= onsets.size) return
        var cap = onsets.size
        while (cap < n * KEYS) cap *= 2
        onsets = onsets.copyOf(cap)
        notes = notes.copyOf(cap)
    }

    /** Row-major copies, for saving a take. */
    fun onsetArray(): FloatArray = onsets.copyOf(frames * KEYS)
    fun noteArray(): FloatArray = notes.copyOf(frames * KEYS)

    companion object {
        const val KEYS = 88
        const val LOWEST = 21 // MIDI number of key 0 (A0)

        /** Reads the fixture format: gzip of frames×88 onset bytes then frames×88 note bytes (p = byte / 255). */
        fun readBytes(input: InputStream, frames: Int): ProbabilityGrid {
            val bytes = GZIPInputStream(input).use { it.readBytes() }
            require(bytes.size == frames * KEYS * 2) { "expected ${frames * KEYS * 2} bytes, got ${bytes.size}" }
            val on = FloatArray(frames * KEYS) { (bytes[it].toInt() and 0xff) / 255f }
            val no = FloatArray(frames * KEYS) { (bytes[frames * KEYS + it].toInt() and 0xff) / 255f }
            return ProbabilityGrid().also { it.append(on, no, frames) }
        }

        fun of(onset: FloatArray, note: FloatArray): ProbabilityGrid =
            ProbabilityGrid().also { it.append(onset, note, onset.size / KEYS) }
    }
}
