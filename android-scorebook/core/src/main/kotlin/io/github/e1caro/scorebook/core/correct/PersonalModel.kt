package io.github.e1caro.scorebook.core.correct

import io.github.e1caro.scorebook.core.transcribe.AudioCalibration
import kotlinx.serialization.Serializable
import kotlin.math.exp

/** How much each kind of musical context counts. */
@Serializable
data class FusionWeights(
    val key: Double = 1.0,
    val chord: Double = 0.8,
    val melody: Double = 0.5,
    val repetition: Double = 1.2,
) {
    fun asArray() = doubleArrayOf(key, chord, melody, repetition)

    companion object {
        fun of(a: DoubleArray) = FusionWeights(a[0], a[1], a[2], a[3])
    }
}

/** Everything the corrector knew about one option when it decided, so a correction can be learned from. */
@Serializable
data class OptionFeatures(val pitch: Int, val audioLog: Double, val context: List<Double>)

/** A note the player switched (or deleted / restored), with the features at decision time. */
@Serializable
data class CorrectionExample(
    val options: List<OptionFeatures>,
    val gate: Double,
    val musical: Double,
    val chosenPitch: Int, // what the player picked; -1 = "no note here" (deleted)
    val register: Int, // octave of the note (0..7)
)

/**
 * What Scorebook has learned from this player's corrections: the weight of each context, how sharp the audio
 * evidence is, systematic pitch confusions of this piano/room, and ghost-note tendencies per register.
 * It is a calibration on top of the network (no retraining), cheap and reversible.
 */
@Serializable
data class PersonalModel(
    val weights: FusionWeights = FusionWeights(),
    val audioTemperature: Double = 1.0,
    val pitchBias: Map<Int, Double> = emptyMap(),
    val calibration: AudioCalibration = AudioCalibration(),
    val corrections: Int = 0,
) {
    fun bias(pitch: Int): Double = pitchBias[pitch] ?: 0.0

    /** One gradient step on the soft-max cross-entropy of the decision the player corrected. */
    fun learn(ex: CorrectionExample, rate: Double = 0.15): PersonalModel {
        if (ex.chosenPitch < 0) {
            // a deleted note: this register produces ghosts here; be a little stricter about presence there
            val rb = calibration.registerBias.toMutableList()
            rb[ex.register] = (rb[ex.register] - 0.08).coerceIn(-1.5, 1.5)
            return copy(calibration = calibration.copy(registerBias = rb), corrections = corrections + 1)
        }
        if (ex.options.none { it.pitch == ex.chosenPitch }) return copy(corrections = corrections + 1)
        val w = weights.asArray()
        val scale = ex.musical * ex.gate * NoteCorrector.CONTEXT_SCALE
        val scores = ex.options.map { o ->
            audioTemperature * o.audioLog + bias(o.pitch) + scale * o.context.indices.sumOf { i -> w[i] * o.context[i] }
        }
        val m = scores.max()
        val z = scores.sumOf { exp(it - m) }
        val p = scores.map { exp(it - m) / z }
        val gw = DoubleArray(4)
        var gt = 0.0
        val newBias = pitchBias.toMutableMap()
        ex.options.forEachIndexed { c, o ->
            val err = p[c] - (if (o.pitch == ex.chosenPitch) 1.0 else 0.0)
            for (i in 0 until 4) gw[i] += err * scale * o.context.getOrElse(i) { 0.0 }
            gt += err * o.audioLog
            newBias[o.pitch] = (bias(o.pitch) - rate * err).coerceIn(-2.0, 2.0)
        }
        val nw = DoubleArray(4) { (w[it] - rate * gw[it]).coerceIn(0.0, 3.0) }
        return copy(
            weights = FusionWeights.of(nw),
            audioTemperature = (audioTemperature - rate * 0.5 * gt).coerceIn(0.3, 3.0),
            pitchBias = newBias,
            corrections = corrections + 1,
        )
    }

    /** A deleted note was restored: this register's ghosts were real notes after all. */
    fun restored(register: Int): PersonalModel {
        val rb = calibration.registerBias.toMutableList()
        rb[register] = (rb[register] + 0.08).coerceIn(-1.5, 1.5)
        return copy(calibration = calibration.copy(registerBias = rb), corrections = corrections + 1)
    }
}
