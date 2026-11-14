package io.github.e1caro.scorebook.core.transcribe

/** The transcription network. On the phone: Basic Pitch on LiteRT (app module). In tests: recorded outputs. */
interface FrameModel {
    /**
     * Runs one window of [BasicPitchStream.WINDOW] samples at 22 050 Hz and writes
     * [BasicPitchStream.WINDOW_FRAMES] × 88 onset and note probabilities (frame-major).
     */
    fun run(window: FloatArray, onsetOut: FloatArray, noteOut: FloatArray)
}

/**
 * Feeds a continuous 22.05 kHz stream through the model in overlapping windows and stitches the output into a
 * [ProbabilityGrid]. Windows advance by 142 frames; the 15 frames at each edge of a window are dropped, and the
 * stream starts with 15 frames of silence, so global frame j is exactly at j × 256 / 22050 seconds.
 */
class BasicPitchStream(private val model: FrameModel, val grid: ProbabilityGrid = ProbabilityGrid()) {
    companion object {
        const val SAMPLE_RATE = 22050
        const val HOP = 256
        const val WINDOW = 43844
        const val WINDOW_FRAMES = 172
        const val EDGE = 15
        const val STRIDE_FRAMES = WINDOW_FRAMES - 2 * EDGE // 142
        const val STRIDE = STRIDE_FRAMES * HOP // 36 352 samples
        const val LEAD = EDGE * HOP // 3 840 samples of silence in front
        const val FPS = SAMPLE_RATE.toDouble() / HOP
    }

    private var buf = FloatArray(WINDOW * 2)
    private var bufLen = LEAD // the lead silence is already in the buffer (zeros)
    private var samplesIn = 0L
    private val window = FloatArray(WINDOW)
    private val onsetOut = FloatArray(WINDOW_FRAMES * ProbabilityGrid.KEYS)
    private val noteOut = FloatArray(WINDOW_FRAMES * ProbabilityGrid.KEYS)

    /** Total audio pushed, in seconds. */
    val seconds: Double get() = samplesIn.toDouble() / SAMPLE_RATE

    /** Adds audio; runs the model for every window that is complete. Returns the number of new frames. */
    fun push(samples: FloatArray, offset: Int = 0, length: Int = samples.size): Int {
        if (bufLen + length > buf.size) buf = buf.copyOf(maxOf(buf.size * 2, bufLen + length))
        System.arraycopy(samples, offset, buf, bufLen, length)
        bufLen += length
        samplesIn += length
        val before = grid.frames
        while (bufLen >= WINDOW) runWindow()
        return grid.frames - before
    }

    /** Pads the end with silence so every pushed sample has its frames, then trims the grid to the audio length. */
    fun flush(): Int {
        val before = grid.frames
        val needed = ((samplesIn + HOP - 1) / HOP).toInt()
        while (grid.frames < needed) {
            if (bufLen < WINDOW) {
                java.util.Arrays.fill(buf, bufLen, WINDOW, 0f)
                bufLen = WINDOW
            }
            runWindow()
        }
        grid.truncate(needed)
        return grid.frames - before
    }

    private fun runWindow() {
        System.arraycopy(buf, 0, window, 0, WINDOW)
        model.run(window, onsetOut, noteOut)
        grid.append(onsetOut, noteOut, STRIDE_FRAMES, EDGE)
        // keep what the next window needs
        System.arraycopy(buf, STRIDE, buf, 0, bufLen - STRIDE)
        bufLen -= STRIDE
    }
}
