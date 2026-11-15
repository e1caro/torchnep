package io.github.e1caro.scorebook.core.play

import io.github.e1caro.scorebook.core.correct.Transcription
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.math.tanh

/**
 * A small piano synthesizer for playback: each note is a sum of slightly stretched partials (piano strings are
 * inharmonic) with a soft hammer attack, a pitch-dependent decay (low strings ring longer, high partials die
 * first) and a damper when the key is released. No samples to ship; a minute of music renders in well under a
 * second.
 */
object PianoSynth {
    data class Voice(val pitch: Int, val start: Double, val duration: Double, val velocity: Int, val eventId: Int = -1)

    /** Notes of a transcription with the score's (legato) durations, in seconds. */
    fun voices(t: Transcription): List<Voice> {
        val g = t.grid
        val first = g.firstBarBeat()
        return t.notes.map { n ->
            val writtenEnd = g.time((n.tick + n.duration).toDouble() / g.beatTicks + first)
            val dur = max(max(n.offset - n.onset, writtenEnd - n.onset), 0.25).coerceAtMost(4.0)
            Voice(n.pitch, n.onset, dur, n.velocity, n.eventId)
        }
    }

    /** [tuningCents]: the whole piano flat (negative) or sharp, for testing the tuning estimator. */
    fun render(voices: List<Voice>, sampleRate: Int = 22050, tuningCents: Double = 0.0): ShortArray {
        if (voices.isEmpty()) return ShortArray(0)
        val release = 0.15
        val end = voices.maxOf { it.start + it.duration } + release + 0.3
        val out = FloatArray((end * sampleRate).toInt() + 1)
        for (v in voices) addVoice(out, v, sampleRate, release, tuningCents)
        // Always use the full level, with the peaks rounded off: a phone speaker is small, and music played softly
        // (or low on the keyboard) would otherwise be close to inaudible.
        var peak = 0f
        for (x in out) peak = max(peak, kotlin.math.abs(x))
        val gain = if (peak > 1e-4f) 1f / peak else 1f
        return ShortArray(out.size) { (tanh((out[it] * gain).toDouble() * DRIVE) / tanh(DRIVE) * 30000).toInt().toShort() }
    }

    private fun addVoice(out: FloatArray, v: Voice, sr: Int, release: Double, tuningCents: Double) {
        val f0 = 440.0 * 2.0.pow((v.pitch - 69) / 12.0 + tuningCents / 1200.0)
        val vel = (v.velocity.coerceIn(1, 127) / 127.0)
        val amp = 0.16 * vel.pow(1.4)
        val tau = 4.5 * 2.0.pow(-(v.pitch - 21) / 26.0) // seconds: ~4.5 s low A, ~0.45 s top C
        val b = 0.00012 * 2.0.pow((v.pitch - 21) / 20.0) // inharmonicity grows towards the treble
        val startI = (v.start * sr).toInt().coerceAtLeast(0)
        val offI = startI + (v.duration * sr).toInt()
        val lastI = min(out.size, offI + (release * 6 * sr).toInt())
        val attack = (0.004 * sr).toInt().coerceAtLeast(1)
        // Low strings: the fundamental is weak and the sound is in the upper partials (as on a real piano). That is
        // also all that a phone speaker, which reproduces little below 300 Hz, lets through of a bass note.
        val low = ((60 - v.pitch) / 30.0).coerceIn(0.0, 1.0)
        val nPartials = min(if (v.pitch < 55) 22 else 12, (sr * 0.45 / f0).toInt()).coerceAtLeast(1)
        val releaseK = exp(-1.0 / (release * sr))
        for (n in 1..nPartials) {
            val fn = n * f0 * sqrt(1 + b * n * n)
            if (fn >= sr * 0.48) break
            // brighter when played louder; upper partials decay faster
            val an = amp * (1.0 / n.toDouble().pow(1.15 - 0.5 * low + 0.6 * (1 - vel))) * (if (n == 1) 1 - 0.5 * low else 1.0)
            val tn = tau / (1 + 0.45 * (n - 1))
            val decay = exp(-1.0 / (tn * sr))
            val w = 2 * PI * fn / sr
            val cw = cos(w)
            val sw = sin(w)
            var c = 1.0
            var s = 0.0
            var env = an
            for (i in startI until lastI) {
                val k = i - startI
                val a = if (k < attack) env * k / attack else env
                out[i] += (a * s).toFloat()
                val ns = s * cw + c * sw
                c = c * cw - s * sw
                s = ns
                env *= if (i < offI) decay else decay * releaseK
                if (env < 1e-5) break
            }
        }
    }

    /** How hard the mix is pushed into the soft limiter: louder on average, peaks rounded off. */
    private const val DRIVE = 1.5

    /** Seconds of audio the voices need (for progress bars). */
    fun length(voices: List<Voice>): Double = (voices.maxOfOrNull { it.start + it.duration } ?: 0.0) + 0.5

    @Suppress("unused")
    private fun db(x: Double) = 20 * ln(x) / ln(10.0)
}
