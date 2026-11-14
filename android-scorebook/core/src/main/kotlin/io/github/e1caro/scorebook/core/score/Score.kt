package io.github.e1caro.scorebook.core.score

import io.github.e1caro.scorebook.core.analysis.Ticks
import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.music.SpelledPitch

/** Note values the engraver can draw. */
enum class NoteType(val ticks: Int) {
    WHOLE(192), HALF(96), QUARTER(48), EIGHTH(24), SIXTEENTH(12), THIRTY_SECOND(6);

    val flags: Int get() = when (this) { EIGHTH -> 1; SIXTEENTH -> 2; THIRTY_SECOND -> 3; else -> 0 }
    val musicXml: String get() = when (this) { WHOLE -> "whole"; HALF -> "half"; QUARTER -> "quarter"; EIGHTH -> "eighth"; SIXTEENTH -> "16th"; THIRTY_SECOND -> "32nd" }
}

/** A written duration: type, dots, and whether it is part of a triplet (3 in the time of 2). */
data class WrittenDuration(val type: NoteType, val dots: Int = 0, val triplet: Boolean = false) {
    val ticks: Int
        get() {
            var t = type.ticks
            var add = type.ticks / 2
            repeat(dots) { t += add; add /= 2 }
            return if (triplet) t * 2 / 3 else t
        }

    companion object {
        /** Values a duration can be cut into, longest first. */
        val ALL: List<WrittenDuration> = buildList {
            for (t in NoteType.entries) {
                add(WrittenDuration(t))
                if (t != NoteType.THIRTY_SECOND) add(WrittenDuration(t, 1))
                if (t == NoteType.QUARTER || t == NoteType.EIGHTH || t == NoteType.SIXTEENTH) add(WrittenDuration(t, 0, true))
            }
        }.sortedByDescending { it.ticks }
    }
}

/** A note head in a chord. [accidental] = alteration to print (0 = natural sign), or null for none. */
data class ScoreNote(
    val midi: Int,
    val pitch: SpelledPitch,
    val eventId: Int,
    val light: Boolean,
    val tieToNext: Boolean = false,
    val tieFromPrev: Boolean = false,
    val accidental: Int? = null,
)

sealed interface Element {
    val tick: Int // from the start of the measure
    val duration: WrittenDuration
}

data class ChordElement(override val tick: Int, override val duration: WrittenDuration, val notes: List<ScoreNote>) : Element
data class RestElement(override val tick: Int, override val duration: WrittenDuration, val wholeMeasure: Boolean = false) : Element

data class ChordSymbol(val tick: Int, val label: String)

data class Measure(
    val number: Int,
    val startTick: Int,
    val ticks: Int,
    val key: Key,
    val keyChange: Boolean,
    val staves: List<List<Element>>, // 0 = treble (right hand), 1 = bass (left hand)
    val chords: List<ChordSymbol>,
)

data class Score(
    val title: String,
    val subtitle: String,
    val beatsPerBar: Int,
    val numerator: Int,
    val denominator: Int,
    val compound: Boolean,
    val bpm: Int,
    val measures: List<Measure>,
) {
    val beatTicks: Int get() = if (compound) Ticks.QUARTER * 3 / 2 else Ticks.QUARTER
    val barTicks: Int get() = beatTicks * beatsPerBar
}
