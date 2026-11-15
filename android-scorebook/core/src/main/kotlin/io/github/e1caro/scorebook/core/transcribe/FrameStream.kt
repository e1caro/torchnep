package io.github.e1caro.scorebook.core.transcribe

/**
 * What a transcription network expects and returns: mono audio at [sampleRate] in windows of [window] samples,
 * and [windowFrames] × 88 probabilities per window, one frame every [hop] samples. The [edge] frames at each end
 * of a window are dropped when windows are stitched (they have the least context).
 */
data class ModelSpec(val name: String, val sampleRate: Int, val hop: Int, val window: Int, val windowFrames: Int, val edge: Int) {
    val fps: Double get() = sampleRate.toDouble() / hop
    val strideFrames: Int get() = windowFrames - 2 * edge
    val stride: Int get() = strideFrames * hop
    val lead: Int get() = edge * hop

    companion object {
        /**
         * Onsets and Frames (Magenta, Apache-2.0), trained on piano only (MAESTRO). The model the app ships with:
         * on real piano recordings it finds 93 % of the notes inside chords, Basic Pitch 55 % (see README).
         */
        val ONSETS_FRAMES = ModelSpec("onsets_frames", 16000, 512, 17920, 32, 4)

        /** Basic Pitch (Spotify, Apache-2.0): tiny, any instrument. Kept as a fallback when the piano model is absent. */
        val BASIC_PITCH = ModelSpec("basic_pitch", 22050, 256, 43844, 172, 15)
    }
}

/** The transcription network. On the phone: a LiteRT model (app module). In tests: recorded outputs. */
interface FrameModel {
    val spec: ModelSpec

    /**
     * Runs one window of [ModelSpec.window] samples and writes [ModelSpec.windowFrames] × 88 onset and note
     * probabilities (frame-major), and key velocities in 0..1 into [velocityOut] if the model has them.
     * Returns true if velocities were written.
     */
    fun run(window: FloatArray, onsetOut: FloatArray, noteOut: FloatArray, velocityOut: FloatArray): Boolean
}

/**
 * Feeds a continuous audio stream through the model in overlapping windows and stitches the output into a
 * [ProbabilityGrid]. Windows advance by the frames kept from each one; the stream starts with [ModelSpec.edge]
 * frames of silence, so global frame j always starts at j × hop / sampleRate seconds.
 */
class FrameStream(private val model: FrameModel, val grid: ProbabilityGrid = ProbabilityGrid(model.spec.fps)) {
    private val spec = model.spec
    private var buf = FloatArray(spec.window * 2)
    private var bufLen = spec.lead // the lead silence is already in the buffer (zeros)
    private var samplesIn = 0L
    private val window = FloatArray(spec.window)
    private val onsetOut = FloatArray(spec.windowFrames * ProbabilityGrid.KEYS)
    private val noteOut = FloatArray(spec.windowFrames * ProbabilityGrid.KEYS)
    private val velocityOut = FloatArray(spec.windowFrames * ProbabilityGrid.KEYS)

    /** Total audio pushed, in seconds. */
    val seconds: Double get() = samplesIn.toDouble() / spec.sampleRate

    /** Adds audio; runs the model for every window that is complete. Returns the number of new frames. */
    fun push(samples: FloatArray, offset: Int = 0, length: Int = samples.size): Int {
        if (bufLen + length > buf.size) buf = buf.copyOf(maxOf(buf.size * 2, bufLen + length))
        System.arraycopy(samples, offset, buf, bufLen, length)
        bufLen += length
        samplesIn += length
        val before = grid.frames
        while (bufLen >= spec.window) runWindow()
        return grid.frames - before
    }

    /** Pads the end with silence so every pushed sample has its frames, then trims the grid to the audio length. */
    fun flush(): Int {
        val before = grid.frames
        val needed = ((samplesIn + spec.hop - 1) / spec.hop).toInt()
        while (grid.frames < needed) {
            if (bufLen < spec.window) {
                java.util.Arrays.fill(buf, bufLen, spec.window, 0f)
                bufLen = spec.window
            }
            runWindow()
        }
        grid.truncate(needed)
        return grid.frames - before
    }

    private fun runWindow() {
        System.arraycopy(buf, 0, window, 0, spec.window)
        val hasVelocity = model.run(window, onsetOut, noteOut, velocityOut)
        grid.append(onsetOut, noteOut, spec.strideFrames, spec.edge, if (hasVelocity) velocityOut else null)
        // keep what the next window needs
        System.arraycopy(buf, spec.stride, buf, 0, bufLen - spec.stride)
        bufLen -= spec.stride
    }
}
