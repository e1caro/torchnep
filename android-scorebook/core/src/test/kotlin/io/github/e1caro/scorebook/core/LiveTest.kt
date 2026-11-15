package io.github.e1caro.scorebook.core

import io.github.e1caro.scorebook.core.live.AutoRecorder
import io.github.e1caro.scorebook.core.live.Decimator2
import io.github.e1caro.scorebook.core.live.LiveSession
import io.github.e1caro.scorebook.core.live.MidiNoteTracker
import io.github.e1caro.scorebook.core.live.MidiParser
import io.github.e1caro.scorebook.core.library.Codec
import io.github.e1caro.scorebook.core.library.TakeData
import io.github.e1caro.scorebook.core.live.Resampler
import io.github.e1caro.scorebook.core.transcribe.Decoder
import io.github.e1caro.scorebook.core.transcribe.FrameModel
import io.github.e1caro.scorebook.core.transcribe.ModelSpec
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
    private class ReplayModel(val g: ProbabilityGrid, override val spec: ModelSpec) : FrameModel {
        var window = 0
        override fun run(window: FloatArray, onsetOut: FloatArray, noteOut: FloatArray, velocityOut: FloatArray): Boolean {
            for (f in 0 until spec.windowFrames) {
                val gf = this.window * spec.strideFrames + f - spec.edge
                for (k in 0 until 88) {
                    val inside = gf in 0 until g.frames
                    onsetOut[f * 88 + k] = if (inside) g.onset(gf, k) else 0f
                    noteOut[f * 88 + k] = if (inside) g.note(gf, k) else 0f
                    velocityOut[f * 88 + k] = if (inside && g.hasVelocity) g.velocity(gf, k) else 0f
                }
            }
            this.window++
            return g.hasVelocity
        }
    }

    @Test
    fun liveSessionMatchesOfflineDecoding() {
      for (spec in listOf(ModelSpec.ONSETS_FRAMES, ModelSpec.BASIC_PITCH)) {
        val fx = Fixture("waltz_clean")
        val g = if (spec == ModelSpec.ONSETS_FRAMES) fx.ofGrid() else fx.grid()
        val session = LiveSession(ReplayModel(g, spec))
        val block = FloatArray(2048)
        var pushed = 0
        var heardLive = 0
        val total = g.frames * spec.hop
        while (pushed < total) {
            val n = minOf(block.size, total - pushed)
            heardLive += session.pushAudio(block, n).size
            pushed += n
        }
        val view = session.view(session.seconds)
        assertTrue(view.notes.size > 80, "live notes ${view.notes.size}")
        assertEquals("A minor", view.key.displayName)
        val final = session.finish(session.seconds)
        val offline = Decoder.forModel(spec).decode(g)
        assertEquals(offline.size, final.size)
        assertEquals(offline.map { it.pitch to it.onset }, final.map { it.pitch to it.onset })
        assertTrue(heardLive >= offline.size * 0.8, "${spec.name}: live $heardLive vs offline ${offline.size}")
        // a take survives a save/load round trip
        val back = Codec.take(Codec.encode(TakeData("t1", final)))
        assertEquals(final, back.events)
      }
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
    fun manualModeOnlyRecordsWhenAsked() {
        val sr = 44100
        val rec = AutoRecorder(sr).apply { autoStart = false; autoStop = false }
        val loud = FloatArray(882) { (0.3 * sin(2 * PI * 440.0 * it / sr)).toFloat() }
        val quiet = FloatArray(882)
        repeat(100) { assertEquals(null, rec.process(loud)) } // playing, but nobody pressed record
        assertEquals(AutoRecorder.State.LISTENING, rec.state)
        assertTrue(rec.forceStart() != null)
        repeat(600) { assertEquals(null, rec.process(quiet)) } // 12 s of silence: still recording
        assertEquals(AutoRecorder.State.RECORDING, rec.state)
        assertEquals(AutoRecorder.Event.Stopped, rec.forceStop())
        assertEquals(AutoRecorder.State.LISTENING, rec.state)
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
    fun resamplerKeepsMusicAndTimingAndRemovesAliases() {
        for ((inRate, outRate) in listOf(48000 to 16000, 44100 to 16000, 44100 to 22050)) {
            fun rmsAfter(freq: Double): Double {
                val r = Resampler(inRate, outRate)
                val x = FloatArray(inRate) { sin(2 * PI * freq * it / inRate).toFloat() }
                val out = ArrayList<Float>()
                var i = 0
                while (i < x.size) { val n = minOf(777, x.size - i); out.addAll(r.process(x.copyOfRange(i, i + n)).toList()); i += n }
                assertTrue(abs(out.size - outRate) <= 40, "$inRate->$outRate: ${out.size} samples for one second")
                return sqrt(out.drop(400).dropLast(50).sumOf { (it * it).toDouble() } / (out.size - 450))
            }
            assertTrue(abs(rmsAfter(1000.0) - 0.707) < 0.02, "$inRate->$outRate 1 kHz")
            assertTrue(abs(rmsAfter(5000.0) - 0.707) < 0.03, "$inRate->$outRate 5 kHz")
            assertTrue(rmsAfter(outRate / 2 + 1500.0) < 0.01, "$inRate->$outRate alias")
            // a click stays where it was
            val r = Resampler(inRate, outRate)
            val x = FloatArray(inRate / 2).also { it[inRate / 4] = 1f }
            val y = r.process(x) + r.process(FloatArray(2000))
            val peak = y.indices.maxByOrNull { abs(y[it]) }!!
            assertTrue(abs(peak - outRate / 4) <= 1, "$inRate->$outRate click at $peak, expected ${outRate / 4}")
        }
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
