package io.github.e1caro.scorebook.core

import io.github.e1caro.scorebook.core.live.AutoRecorder
import io.github.e1caro.scorebook.core.live.Decimator2
import io.github.e1caro.scorebook.core.live.LiveSession
import io.github.e1caro.scorebook.core.live.MidiNoteTracker
import io.github.e1caro.scorebook.core.live.MidiParser
import io.github.e1caro.scorebook.core.library.Codec
import io.github.e1caro.scorebook.core.library.TakeData
import io.github.e1caro.scorebook.core.transcribe.BasicPitchStream
import io.github.e1caro.scorebook.core.transcribe.FrameModel
import io.github.e1caro.scorebook.core.transcribe.NoteDecoder
import io.github.e1caro.scorebook.core.transcribe.ProbabilityGrid
import org.junit.Test
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class LiveTest {
    /** Plays back recorded model output window by window, as the real model would produce it. */
    private class ReplayModel(val g: ProbabilityGrid) : FrameModel {
        var window = 0
        override fun run(window: FloatArray, onsetOut: FloatArray, noteOut: FloatArray) {
            for (f in 0 until BasicPitchStream.WINDOW_FRAMES) {
                val gf = this.window * BasicPitchStream.STRIDE_FRAMES + f - BasicPitchStream.EDGE
                for (k in 0 until 88) {
                    onsetOut[f * 88 + k] = if (gf in 0 until g.frames) g.onset(gf, k) else 0f
                    noteOut[f * 88 + k] = if (gf in 0 until g.frames) g.note(gf, k) else 0f
                }
            }
            this.window++
        }
    }

    @Test
    fun liveSessionMatchesOfflineDecoding() {
        val fx = Fixture("waltz_clean")
        val g = fx.grid()
        val session = LiveSession(ReplayModel(g))
        val block = FloatArray(2048)
        var pushed = 0
        var heardLive = 0
        val total = g.frames * 256
        while (pushed < total) {
            val n = minOf(block.size, total - pushed)
            heardLive += session.pushAudio(block, n).size
            pushed += n
        }
        val view = session.view(session.seconds)
        assertTrue(view.notes.size > 80, "live notes ${view.notes.size}")
        assertEquals("A minor", view.key.displayName)
        val final = session.finish(session.seconds)
        val offline = NoteDecoder().decode(g)
        assertEquals(offline.size, final.size)
        assertTrue(heardLive >= offline.size * 0.8, "live $heardLive vs offline ${offline.size}")
        // a take survives a save/load round trip
        val back = Codec.take(Codec.encode(TakeData("t1", final)))
        assertEquals(final, back.events)
    }

    @Test
    fun autoStartAndStop() {
        val sr = 44100
        val rec = AutoRecorder(sr)
        val block = FloatArray(882)
        val noise = java.util.Random(1)
        var started = false
        var stopped = false
        var t = 0
        fun step(amp: Double, freq: Double = 440.0) {
            for (i in block.indices) block[i] = (amp * sin(2 * PI * freq * (t + i) / sr) + 0.0005 * noise.nextGaussian()).toFloat()
            t += block.size
            when (val e = rec.process(block)) {
                is AutoRecorder.Event.Started -> { started = true; assertTrue(e.preRoll.size > sr) }
                AutoRecorder.Event.Stopped -> stopped = true
                null -> {}
            }
        }
        repeat(100) { step(0.0) } // 2 s of room noise
        assertEquals(AutoRecorder.State.LISTENING, rec.state)
        repeat(50) { step(0.3) } // playing
        assertTrue(started)
        repeat(150) { step(0.0) } // 3 s of silence: still recording
        assertTrue(!stopped)
        repeat(150) { step(0.0) } // past 5 s: stop
        assertTrue(stopped)
    }

    @Test
    fun decimatorKeepsMusicAndRemovesAliases() {
        fun rmsAfter(freq: Double): Double {
            val d = Decimator2()
            val x = FloatArray(44100) { sin(2 * PI * freq * it / 44100).toFloat() }
            val y = d.process(x)
            return sqrt(y.drop(200).sumOf { (it * it).toDouble() } / (y.size - 200))
        }
        assertTrue(abs(rmsAfter(1000.0) - 0.707) < 0.02)
        assertTrue(rmsAfter(16000.0) < 0.01)
    }

    @Test
    fun midiParsingAndPedal() {
        val tracker = MidiNoteTracker()
        var now = 0.0
        val parser = MidiParser({ p, v -> tracker.noteOn(p, v, now) }, { p -> tracker.noteOff(p, now) }, { tracker.sustain(it, now) })
        parser.feed(byteArrayOf(0x90.toByte(), 60, 100, 64, 90)) // running status: two note-ons
        now = 0.5
        parser.feed(byteArrayOf(0xB0.toByte(), 64, 127)) // pedal down
        parser.feed(byteArrayOf(0x80.toByte(), 60, 0, 0x90.toByte(), 64, 0)) // both released (velocity-0 note-on)
        now = 1.0
        parser.feed(byteArrayOf(0xFE.toByte(), 0xB0.toByte(), 64, 0)) // active sensing, pedal up
        val ev = tracker.finish(2.0)
        assertEquals(listOf(60, 64), ev.map { it.pitch }.sorted())
        assertTrue(ev.all { abs(it.offset - 1.0) < 1e-9 && it.fromMidi })
    }
}
