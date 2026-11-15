package io.github.e1caro.scorebook.audio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.media.PlaybackParams
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder

/** Plays 16-bit mono PCM (the synthesized score or a take's recording) and reports where it is, for the score to follow. */
class Player {
    private var track: AudioTrack? = null
    private var thread: Thread? = null
    @Volatile private var running = false
    private var rate = 22050
    private var startFrame = 0
    private var frames = 0

    /** Seconds into the audio (source time, whatever the speed). */
    fun position(): Double {
        val t = track ?: return 0.0
        return (startFrame + t.playbackHeadPosition.coerceAtMost(frames)).toDouble() / rate
    }

    val isPlaying: Boolean get() = running && (track?.playbackHeadPosition ?: frames) < frames

    fun play(pcm: ShortArray, sampleRate: Int, fromSeconds: Double, speed: Float): Boolean {
        stop()
        val start = (fromSeconds * sampleRate).toInt().coerceIn(0, maxOf(0, pcm.size - 1))
        if (pcm.size - start <= 0) return false
        val min = AudioTrack.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT)
        val t = try {
            AudioTrack.Builder()
                .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
                .setAudioFormat(AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(sampleRate).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
                .setTransferMode(AudioTrack.MODE_STREAM)
                .setBufferSizeInBytes(maxOf(min * 4, sampleRate / 2))
                .build()
        } catch (e: Exception) {
            return false
        }
        if (t.state != AudioTrack.STATE_INITIALIZED) { t.release(); return false }
        // normal speed plays straight; only the practice speeds go through the phone's time-stretcher
        if (speed != 1f) try { t.playbackParams = PlaybackParams().setSpeed(speed).setPitch(1f) } catch (_: Exception) {}
        try { t.setVolume(1f) } catch (_: Exception) {}
        rate = sampleRate
        startFrame = start
        frames = pcm.size - start
        track = t
        running = true
        try { t.play() } catch (e: Exception) { running = false; track = null; t.release(); return false }
        thread = Thread({
            var i = start
            while (running && i < pcm.size) {
                val n = minOf(4096, pcm.size - i)
                val w = t.write(pcm, i, n)
                if (w <= 0) break
                i += w
            }
        }, "scorebook-player").apply { start() }
        return true
    }

    fun stop() {
        running = false
        track?.let { t -> try { t.pause(); t.flush(); t.stop() } catch (_: Exception) {}; t.release() }
        thread?.join(500)
        thread = null
        track = null
    }

    companion object {
        /** 16-bit mono WAV → samples (the takes' own recordings, written by [WavWriter]). */
        fun readWav(f: File): Pair<ShortArray, Int>? {
            if (!f.exists() || f.length() < 46) return null
            val bytes = f.readBytes()
            val bb = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
            val sr = bb.getInt(24)
            var pos = 12
            while (pos + 8 <= bytes.size) {
                val id = String(bytes, pos, 4)
                val len = bb.getInt(pos + 4)
                if (id == "data") {
                    val n = minOf(len, bytes.size - pos - 8) / 2
                    return ShortArray(n) { bb.getShort(pos + 8 + 2 * it) } to sr
                }
                pos += 8 + len
            }
            return null
        }
    }
}
