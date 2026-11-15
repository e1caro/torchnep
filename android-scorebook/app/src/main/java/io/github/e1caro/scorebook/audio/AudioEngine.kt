package io.github.e1caro.scorebook.audio

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Process

/**
 * Microphone capture, mono float, in 20 ms blocks, at 48 kHz (what phone microphones run at natively) or
 * 44.1 kHz (the one rate every Android device must support). VOICE_RECOGNITION is the source Android defines
 * for analysis: no automatic gain control and no noise suppression, which would squash piano dynamics and decays.
 */
class AudioEngine(private val onBlock: (FloatArray, Int) -> Unit) {
    @Volatile private var running = false
    private var thread: Thread? = null

    /** The capture rate, fixed when the engine is created. */
    val sampleRate: Int = RATES.firstOrNull { AudioRecord.getMinBufferSize(it, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_FLOAT) > 0 } ?: 44100

    val isRunning: Boolean get() = running

    @SuppressLint("MissingPermission")
    private fun open(source: Int): AudioRecord? {
        val minBuf = AudioRecord.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_FLOAT)
        if (minBuf <= 0) return null
        val record = try {
            AudioRecord(source, sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_FLOAT, maxOf(minBuf, sampleRate / 2 * 4))
        } catch (e: Exception) {
            return null
        }
        if (record.state != AudioRecord.STATE_INITIALIZED) { record.release(); return null }
        return record
    }

    fun start(): Boolean {
        if (running) return true
        val record = open(MediaRecorder.AudioSource.VOICE_RECOGNITION) ?: open(MediaRecorder.AudioSource.MIC) ?: return false
        running = true
        thread = Thread({
            Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO)
            val buf = FloatArray(sampleRate / 50)
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
        private val RATES = intArrayOf(48000, 44100)
    }
}
