package io.github.e1caro.scorebook.audio

import android.content.Context
import io.github.e1caro.scorebook.core.transcribe.FrameModel
import io.github.e1caro.scorebook.core.transcribe.ModelSpec
import org.tensorflow.lite.Interpreter
import java.io.Closeable
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.channels.FileChannel
import kotlin.math.exp

/**
 * The transcription network on LiteRT. Onsets and Frames (Magenta, Apache-2.0; piano only, 109 MB, fetched at
 * build time by tools/fetch_model.sh) when it is in the APK; otherwise Basic Pitch (Spotify, Apache-2.0), which
 * is much weaker on chords.
 */
class TfliteModel private constructor(override val spec: ModelSpec, private val interpreter: Interpreter) : FrameModel, Closeable {
    private val input = direct(spec.window)
    private val onset = direct(spec.windowFrames * 88)
    private val note = direct(spec.windowFrames * 88)
    private val velocity = direct(spec.windowFrames * 88)
    private val extra = direct(spec.windowFrames * 264) // Basic Pitch contour / Onsets and Frames offsets (unused)

    // Onsets and Frames: output tensors by name (frame_logits, onset_logits, offset_logits, velocity_values)
    private val outputIndex: Map<String, Int> = (0 until interpreter.outputTensorCount).associateBy { i ->
        val n = interpreter.getOutputTensor(i).name().lowercase()
        when { "onset" in n -> "onset"; "offset" in n -> "offset"; "frame" in n -> "frame"; "velocity" in n -> "velocity"; else -> "other$i" }
    }.let { byName -> if (listOf("onset", "frame", "velocity").all { it in byName }) byName else mapOf("frame" to 0, "onset" to 1, "offset" to 2, "velocity" to 3) }

    // one caller at a time: the model is shared by the whole app, and its buffers are too
    @Synchronized
    override fun run(window: FloatArray, onsetOut: FloatArray, noteOut: FloatArray, velocityOut: FloatArray): Boolean {
        input.rewind()
        input.asFloatBuffer().put(window)
        onset.rewind(); note.rewind(); velocity.rewind(); extra.rewind()
        if (spec.name == ModelSpec.ONSETS_FRAMES.name) {
            val outputs = HashMap<Int, Any>()
            outputs[outputIndex.getValue("onset")] = onset
            outputs[outputIndex.getValue("frame")] = note
            outputs[outputIndex.getValue("velocity")] = velocity
            outputIndex["offset"]?.let { if (it < interpreter.outputTensorCount && interpreter.getOutputTensor(it).numBytes() > 0) outputs[it] = extra }
            interpreter.runForMultipleInputsOutputs(arrayOf<Any>(input), outputs)
            onset.rewind(); note.rewind(); velocity.rewind()
            onset.asFloatBuffer().get(onsetOut)
            note.asFloatBuffer().get(noteOut)
            velocity.asFloatBuffer().get(velocityOut)
            for (i in onsetOut.indices) { onsetOut[i] = sigmoid(onsetOut[i]); noteOut[i] = sigmoid(noteOut[i]) } // logits
            return true
        }
        interpreter.runSignature(mapOf<String, Any>("input_2" to input), mapOf<String, Any>("onset" to onset, "note" to note, "contour" to extra))
        onset.rewind(); note.rewind()
        onset.asFloatBuffer().get(onsetOut)
        note.asFloatBuffer().get(noteOut)
        return false
    }

    override fun close() = interpreter.close()

    private fun sigmoid(x: Float): Float = (1.0 / (1.0 + exp(-x.toDouble()))).toFloat()
    private fun direct(floats: Int): ByteBuffer = ByteBuffer.allocateDirect(floats * 4).order(ByteOrder.nativeOrder())

    companion object {
        const val PIANO_MODEL = "onsets_frames.tflite"
        const val FALLBACK_MODEL = "basic_pitch.tflite"

        /** Loads the piano model if the APK has it, else the fallback. */
        fun load(context: Context): TfliteModel {
            val threads = Runtime.getRuntime().availableProcessors().coerceIn(2, 4)
            val hasPiano = try { context.assets.list("")?.contains(PIANO_MODEL) == true } catch (_: Exception) { false }
            if (hasPiano) {
                try {
                    return TfliteModel(ModelSpec.ONSETS_FRAMES, Interpreter(asset(context, PIANO_MODEL), Interpreter.Options().setNumThreads(threads)))
                } catch (_: Exception) {
                    // fall through to the small model
                }
            }
            return TfliteModel(ModelSpec.BASIC_PITCH, Interpreter(asset(context, FALLBACK_MODEL), Interpreter.Options().setNumThreads(2)))
        }

        /** Memory-maps the asset (stored uncompressed in the APK); copies it if it cannot be mapped. */
        private fun asset(context: Context, name: String): ByteBuffer {
            try {
                context.assets.openFd(name).use { fd ->
                    FileInputStream(fd.fileDescriptor).channel.use { ch ->
                        return ch.map(FileChannel.MapMode.READ_ONLY, fd.startOffset, fd.declaredLength)
                    }
                }
            } catch (_: Exception) {
                val bytes = context.assets.open(name).use { it.readBytes() }
                return ByteBuffer.allocateDirect(bytes.size).order(ByteOrder.nativeOrder()).apply { put(bytes); rewind() }
            }
        }
    }
}
