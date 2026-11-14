package io.github.e1caro.scorebook.audio

import java.io.File
import java.io.RandomAccessFile

/** Streams mono 16-bit PCM to a WAV file; the header is completed on [close]. */
class WavWriter(file: File, private val sampleRate: Int) {
    private val raf = RandomAccessFile(file, "rw").apply { setLength(0); write(ByteArray(44)) }
    private var bytes = 0L
    private var buf = ByteArray(8192)

    fun write(samples: FloatArray, n: Int = samples.size) {
        if (buf.size < n * 2) buf = ByteArray(n * 2)
        for (i in 0 until n) {
            val v = (samples[i].coerceIn(-1f, 1f) * 32767).toInt()
            buf[2 * i] = v.toByte(); buf[2 * i + 1] = (v shr 8).toByte()
        }
        raf.write(buf, 0, n * 2)
        bytes += n * 2
    }

    fun close() {
        raf.seek(0)
        val h = java.nio.ByteBuffer.allocate(44).order(java.nio.ByteOrder.LITTLE_ENDIAN)
        h.put("RIFF".toByteArray()).putInt((36 + bytes).toInt()).put("WAVE".toByteArray())
        h.put("fmt ".toByteArray()).putInt(16).putShort(1).putShort(1).putInt(sampleRate).putInt(sampleRate * 2).putShort(2).putShort(16)
        h.put("data".toByteArray()).putInt(bytes.toInt())
        raf.write(h.array())
        raf.close()
    }
}
