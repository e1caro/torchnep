package io.github.e1caro.scorebook.audio

import android.content.Context
import io.github.e1caro.scorebook.core.transcribe.BasicPitchStream
import io.github.e1caro.scorebook.core.transcribe.FrameModel
import org.tensorflow.lite.Interpreter
import java.io.Closeable
import java.nio.ByteBuffer
import java.nio.ByteOrder

/** Basic Pitch (Spotify, Apache-2.0) on LiteRT: one 2-second window in, onset and note probabilities out. */
class TfliteModel(context: Context) : FrameModel, Closeable {
    private val interpreter: Interpreter
    private val input = direct(BasicPitchStream.WINDOW)
    private val onset = direct(BasicPitchStream.WINDOW_FRAMES * 88)
    private val note = direct(BasicPitchStream.WINDOW_FRAMES * 88)
    private val contour = direct(BasicPitchStream.WINDOW_FRAMES * 264)

    init {
        val bytes = context.assets.open("basic_pitch.tflite").use { it.readBytes() }
        val model = ByteBuffer.allocateDirect(bytes.size).order(ByteOrder.nativeOrder())
        model.put(bytes)
        model.rewind()
        interpreter = Interpreter(model, Interpreter.Options().setNumThreads(2))
    }

    override fun run(window: FloatArray, onsetOut: FloatArray, noteOut: FloatArray) {
        input.rewind()
        input.asFloatBuffer().put(window)
        onset.rewind(); note.rewind(); contour.rewind()
        interpreter.runSignature(mapOf<String, Any>("input_2" to input), mapOf<String, Any>("onset" to onset, "note" to note, "contour" to contour))
        onset.rewind(); note.rewind()
        onset.asFloatBuffer().get(onsetOut)
        note.asFloatBuffer().get(noteOut)
    }

    override fun close() = interpreter.close()

    private fun direct(floats: Int): ByteBuffer = ByteBuffer.allocateDirect(floats * 4).order(ByteOrder.nativeOrder())
}
