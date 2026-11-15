package io.github.e1caro.scorebook.core

import io.github.e1caro.scorebook.core.analysis.TuningCompensation
import io.github.e1caro.scorebook.core.analysis.TuningEstimator
import io.github.e1caro.scorebook.core.correct.PersonalModel
import io.github.e1caro.scorebook.core.live.Resampler
import io.github.e1caro.scorebook.core.play.PianoSynth
import org.junit.Test
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.abs
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class TuningTest {
    /** A few bars with chords in both hands, played on the built-in piano at a given tuning. */
    private fun piece(cents: Double, sr: Int = 24000): FloatArray {
        val voices = ArrayList<PianoSynth.Voice>()
        val chords = listOf(listOf(48, 55, 64, 67, 72), listOf(45, 52, 60, 64, 69), listOf(41, 53, 57, 60, 65), listOf(43, 50, 59, 62, 67))
        for (bar in 0 until 8) {
            val c = chords[bar % 4]
            for (p in c) voices.add(PianoSynth.Voice(p, bar * 2.0, 1.8, 80))
            for (i in 0 until 4) voices.add(PianoSynth.Voice(c[2 + i % 3] + 12, bar * 2.0 + i * 0.5, 0.45, 90))
        }
        val pcm = PianoSynth.render(voices, sr, cents)
        return FloatArray(pcm.size) { pcm[it] / 32768f }
    }

    @Test
    fun findsHowFlatOrSharpThePianoIs() {
        for (cents in listOf(0.0, -12.0, -30.0, -45.0, 20.0, 38.0)) {
            val t = TuningEstimator.estimate(piece(cents), 24000)
            assertNotNull(t)
            println("tuning $cents -> %.1f (confidence %.2f)".format(t.cents, t.confidence))
            assertTrue(abs(t.cents - cents) <= 4.0, "piano at $cents cents estimated at ${t.cents}")
            assertTrue(t.confidence > 0.3)
        }
        assertEquals(null, TuningEstimator.estimate(FloatArray(48000), 24000)) // silence: no answer
    }

    @Test
    fun compensationPutsThePianoBackInTune() {
        val flat = piece(-35.0, 48000)
        val comp = TuningCompensation(48000, -35.0)
        assertTrue(comp.effectiveRate in 48900..49050, "rate ${comp.effectiveRate}")
        assertTrue(abs(comp.timeScale - 1.0204) < 0.001)
        val r = Resampler(comp.effectiveRate, 16000)
        val out = ArrayList<Float>()
        var i = 0
        while (i < flat.size) { val n = minOf(960, flat.size - i); out.addAll(r.process(flat.copyOfRange(i, i + n)).toList()); i += n }
        val t = TuningEstimator.estimate(out.toFloatArray(), 16000)!!
        assertTrue(abs(t.cents) <= 4.0, "after compensation: ${t.cents} cents")
        // in tune (or nearly): nothing is changed
        assertEquals(48000, TuningCompensation(48000, -4.0).effectiveRate)
        assertEquals(1.0, TuningCompensation(44100, 0.0).timeScale)
    }

    @Test
    fun thePianosTuningIsLearnedOverTakes() {
        var p = PersonalModel()
        p = p.withTuning(-30.0)
        assertEquals(-30.0, p.tuningCents, 1e-9) // the first measurement is taken as it is
        p = p.withTuning(-34.0)
        assertEquals(-32.0, p.tuningCents, 1e-9)
        repeat(8) { p = p.withTuning(-33.0) }
        assertTrue(abs(p.tuningCents + 33) < 1.0)
        p = p.withTuning(2.0) // the tuner came (or another piano): start again
        assertEquals(2.0, p.tuningCents, 1e-9)
    }

    /** Optional: real recordings named `<anything>_cents<N>.wav` (16-bit) in SCOREBOOK_TUNING_DIR. */
    @Test
    fun realRecordings() {
        val dir = System.getenv("SCOREBOOK_TUNING_DIR")?.let { File(it) } ?: return
        for (f in dir.listFiles()!!.filter { it.name.endsWith(".wav") }.sortedBy { it.name }) {
            val b = f.readBytes()
            val bb = ByteBuffer.wrap(b).order(ByteOrder.LITTLE_ENDIAN)
            val ch = bb.getShort(22).toInt(); val sr = bb.getInt(24)
            val n = (b.size - 44) / (2 * ch)
            val x = FloatArray(n) { i -> var s = 0f; for (c in 0 until ch) s += bb.getShort(44 + 2 * (i * ch + c)); s / ch / 32768f }
            val t = TuningEstimator.estimate(x, sr)
            println("TUNING ${f.name}: ${t?.let { "%.1f cents (confidence %.2f)".format(it.cents, it.confidence) }}")
        }
    }
}
