package io.github.e1caro.scorebook.core.commands

import kotlin.math.PI
import kotlin.math.min
import kotlin.math.sin

/** A short, distinct confirmation sound for each command (so you know it was understood without looking). */
object Beeps {
    private val TONES: Map<Command?, List<Double>> = mapOf(
        Command.START to listOf(880.0, 1320.0),
        Command.STOP to listOf(1320.0, 880.0),
        Command.DISCARD to listOf(392.0, 262.0),
        Command.RESTART to listOf(880.0, 880.0, 1320.0),
        Command.FAVORITE to listOf(1047.0, 1319.0, 1568.0),
        Command.UNDO to listOf(660.0, 440.0),
        null to listOf(220.0), // understood, but nothing to do
    )

    fun pcm(command: Command?, sampleRate: Int = 22050): ShortArray {
        val tones = TONES[command] ?: TONES[null]!!
        val each = (0.09 * sampleRate).toInt()
        val gap = (0.03 * sampleRate).toInt()
        val fade = (0.01 * sampleRate).toInt()
        val out = ShortArray(tones.size * (each + gap))
        tones.forEachIndexed { k, f ->
            for (i in 0 until each) {
                val env = min(1.0, min(i, each - 1 - i).toDouble() / fade)
                val v = 0.28 * env * (sin(2 * PI * f * i / sampleRate) + 0.25 * sin(4 * PI * f * i / sampleRate))
                out[k * (each + gap) + i] = (v * 32767).toInt().toShort()
            }
        }
        return out
    }
}
