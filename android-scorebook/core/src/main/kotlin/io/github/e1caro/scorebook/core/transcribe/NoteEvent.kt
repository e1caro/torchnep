package io.github.e1caro.scorebook.core.transcribe

import kotlinx.serialization.Serializable

/** One candidate pitch for a note event and how strongly the audio alone supports it. */
@Serializable
data class PitchOption(val pitch: Int, val audioP: Double)

/**
 * A note as heard: when, how loud, how likely it is that a key was played at all ([presence]), and a probability
 * for every candidate pitch ([options], summing to 1, best first). Nothing is decided yet: the corrector combines
 * this audio evidence with the musical context.
 */
@Serializable
data class NoteEvent(
    val id: Int,
    val onset: Double,
    val offset: Double,
    val velocity: Int,
    val presence: Double,
    val options: List<PitchOption>,
    val fromMidi: Boolean = false,
    /** Id of a louder note struck at the same time an octave, twelfth or two octaves below (possible harmonic). */
    val harmonicOf: Int = -1,
    /** The same key was already sounding just before: possibly a flicker inside a held note, not a new strike. */
    val sustained: Boolean = false,
) {
    val pitch: Int get() = options.first().pitch
    val audioTop: Double get() = options.first().audioP
    val duration: Double get() = offset - onset

    fun audioP(pitch: Int): Double = options.firstOrNull { it.pitch == pitch }?.audioP ?: 0.0

    companion object {
        /** A note from a MIDI keyboard: certain, nothing to correct. */
        fun midi(id: Int, pitch: Int, onset: Double, offset: Double, velocity: Int) =
            NoteEvent(id, onset, offset, velocity, 1.0, listOf(PitchOption(pitch, 1.0)), fromMidi = true)
    }
}
