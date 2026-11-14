package io.github.e1caro.scorebook.audio

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Process

/**
 * Microphone capture at 44.1 kHz (the one rate every Android device supports), mono float, in 20 ms blocks.
 * VOICE_RECOGNITION is used because it is tuned for analysis: no automatic gain control or noise suppression
 * on most devices, which would otherwise squash piano dynamics and decays.
 */
class AudioEngine(private val onBlock: (FloatArray, Int) -> Unit) {
    @Volatile private var running = false
    private var thread: Thread? = null

    val isRunning: Boolean get() = running

    @SuppressLint("MissingPermission")
    fun start(): Boolean {
        if (running) return true
        val minBuf = AudioRecord.getMinBufferSize(SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_FLOAT)
        if (minBuf <= 0) return false
        val record = try {
            AudioRecord(MediaRecorder.AudioSource.VOICE_RECOGNITION, SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_FLOAT, maxOf(minBuf, SAMPLE_RATE / 2 * 4))
        } catch (e: Exception) {
            return false
        }
        if (record.state != AudioRecord.STATE_INITIALIZED) { record.release(); return false }
        running = true
        thread = Thread({
            Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO)
            val buf = FloatArray(BLOCK)
            try {
                record.startRecording()
                while (running) {
                    val n = record.read(buf, 0, buf.size, AudioRecord.READ_BLOCKING)
                    if (n > 0) onBlock(buf, n)
                }
            } catch (_: Exception) {
            } finally {
                try { record.stop() } catch (_: Exception) {}
                record.release()
                running = false
            }
        }, "scorebook-audio").apply { start() }
        return true
    }

    fun stop() {
        running = false
        thread?.join(1000)
        thread = null
    }

    companion object {
        const val SAMPLE_RATE = 44100
        const val BLOCK = 882 // 20 ms
    }
}
