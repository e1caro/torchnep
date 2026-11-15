package io.github.e1caro.scorebook.core.accompany

import io.github.e1caro.scorebook.core.analysis.Chord
import io.github.e1caro.scorebook.core.analysis.ChordQuality
import io.github.e1caro.scorebook.core.analysis.Ticks
import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.music.Mode

enum class Level(val label: String) { EASY("Easy"), MEDIUM("Medium"), HARD("Hard") }

/** The meters accompaniments are written in. [beatTicks]: a quarter, or a dotted quarter in 6/8. */
enum class Meter(val label: String, val beatsPerBar: Int, val compound: Boolean) {
    FOUR_FOUR("4/4", 4, false), THREE_FOUR("3/4", 3, false), SIX_EIGHT("6/8", 2, true);

    val beatTicks: Int get() = if (compound) Ticks.QUARTER * 3 / 2 else Ticks.QUARTER
    val barTicks: Int get() = beatTicks * beatsPerBar

    companion object {
        fun of(beatsPerBar: Int, compound: Boolean): Meter? = entries.firstOrNull { it.beatsPerBar == beatsPerBar && it.compound == compound }
    }
}

/**
 * One note (or chord) of a pattern inside a bar: when ([tick], 48 per quarter), how long, and which chord tones.
 * Tones: "R" root, "3" third, "5" fifth, "7" seventh (the octave when the chord has none), "8" octave,
 * "10" third an octave up, "12" fifth an octave up, "6" major sixth, "b7" minor seventh, "TRIAD" the chord in
 * close position an octave above the bass, "LOW" / "LOW5" root and fifth an octave below the bass (stride).
 */
data class Step(val tick: Int, val duration: Int, val tones: String)

data class Pattern(
    val id: String,
    val name: String,
    val style: String,
    val level: Level,
    val meter: Meter,
    /** Beats per minute (dotted quarters in 6/8). */
    val bpm: Int,
    val about: String,
    val tip: String,
    val steps: List<Step>,
    /** Chord progressions (ids in [Progressions]) this pattern sounds good over. */
    val progressions: List<String>,
)

/** A chord progression, one chord per bar, as (semitones above the tonic, quality), for major and for minor keys. */
data class Progression(val id: String, val major: List<Pair<Int, ChordQuality>>, val minor: List<Pair<Int, ChordQuality>>, val romanMajor: String, val romanMinor: String) {
    fun chords(key: Key): List<Chord> = (if (key.mode == Mode.MAJOR) major else minor).map { (deg, q) -> Chord((key.tonic + deg) % 12, q) }
    fun roman(key: Key): String = if (key.mode == Mode.MAJOR) romanMajor else romanMinor
}

object Progressions {
    private val M = ChordQuality.MAJOR
    private val m = ChordQuality.MINOR
    private val D7 = ChordQuality.DOMINANT7
    private val M7 = ChordQuality.MAJOR7
    private val m7 = ChordQuality.MINOR7

    val ALL: List<Progression> = listOf(
        Progression("pop", listOf(0 to M, 7 to M, 9 to m, 5 to M), listOf(0 to m, 8 to M, 3 to M, 10 to M), "I – V – vi – IV", "i – VI – III – VII"),
        Progression("fifties", listOf(0 to M, 9 to m, 5 to M, 7 to M), listOf(0 to m, 8 to M, 5 to m, 7 to M), "I – vi – IV – V", "i – VI – iv – V"),
        Progression("cadence", listOf(0 to M, 5 to M, 7 to M, 0 to M), listOf(0 to m, 5 to m, 7 to M, 0 to m), "I – IV – V – I", "i – iv – V – i"),
        Progression("jazz", listOf(2 to m7, 7 to D7, 0 to M7, 9 to m7), listOf(5 to m7, 10 to D7, 3 to M7, 0 to m7), "ii7 – V7 – Imaj7 – vi7", "iv7 – VII7 – IIImaj7 – i7"),
        Progression("andalusian", listOf(9 to m, 7 to M, 5 to M, 4 to M), listOf(0 to m, 10 to M, 8 to M, 7 to M), "vi – V – IV – III", "i – VII – VI – V"),
        Progression("canon", listOf(0 to M, 7 to M, 9 to m, 4 to m, 5 to M, 0 to M, 5 to M, 7 to M), listOf(0 to m, 7 to m, 8 to M, 3 to M, 5 to m, 0 to m, 5 to m, 7 to M),
            "I – V – vi – iii – IV – I – IV – V", "i – v – VI – III – iv – i – iv – V"),
        Progression("blues", listOf(0 to D7, 0 to D7, 0 to D7, 0 to D7, 5 to D7, 5 to D7, 0 to D7, 0 to D7, 7 to D7, 5 to D7, 0 to D7, 7 to D7),
            listOf(0 to m7, 0 to m7, 0 to m7, 0 to m7, 5 to m7, 5 to m7, 0 to m7, 0 to m7, 7 to D7, 5 to m7, 0 to m7, 7 to D7),
            "12-bar blues: I7 – IV7 – V7", "12-bar minor blues: i7 – iv7 – V7"),
    )

    fun byId(id: String): Progression = ALL.first { it.id == id }
}

object Patterns {
    private const val Q = 48 // quarter
    private const val E = 24 // eighth
    private fun eighths(vararg tones: String) = tones.mapIndexed { i, t -> Step(i * E, E, t) }
    private fun quarters(vararg tones: String) = tones.mapIndexed { i, t -> Step(i * Q, Q, t) }

    val ALL: List<Pattern> = listOf(
        Pattern("whole", "Whole-note chords", "Any style", Level.EASY, Meter.FOUR_FOUR, 80,
            "One chord per bar, held. The simplest support there is: it leaves all the room to the melody.",
            "Change chords without lifting the hand: look for the notes two neighbouring chords share and keep them down.",
            listOf(Step(0, 4 * Q, "TRIAD")), listOf("pop", "cadence", "fifties")),
        Pattern("pulse", "Pulsing chords", "Pop", Level.EASY, Meter.FOUR_FOUR, 96,
            "The chord repeated on every beat, with the bass note on the first. The motor of countless pop ballads.",
            "Keep the wrist loose and play the three repeats softer than the first beat.",
            listOf(Step(0, Q, "R"), Step(0, Q, "TRIAD"), Step(Q, Q, "TRIAD"), Step(2 * Q, Q, "TRIAD"), Step(3 * Q, Q, "TRIAD")), listOf("pop", "fifties", "andalusian")),
        Pattern("bass-chord", "Bass and chord", "March · folk", Level.EASY, Meter.FOUR_FOUR, 100,
            "Bass note, chord, the fifth in the bass, chord. The \"oom-pah\" of marches, polkas and folk songs.",
            "Aim for the bass note with the little finger and let the chord land lightly.",
            listOf(Step(0, Q, "R"), Step(Q, Q, "TRIAD"), Step(2 * Q, Q, "5"), Step(3 * Q, Q, "TRIAD")), listOf("cadence", "fifties", "pop")),
        Pattern("alberti", "Alberti bass", "Classical", Level.MEDIUM, Meter.FOUR_FOUR, 92,
            "Low, high, middle, high: the broken chord of Mozart and Haydn sonatas. It keeps the harmony moving without getting in the melody's way.",
            "Rotate the forearm slightly instead of lifting the fingers, and keep the thumb light.",
            eighths("8", "12", "10", "12", "8", "12", "10", "12"), listOf("cadence", "canon", "fifties")),
        Pattern("ballad", "Ballad arpeggio", "Pop ballad", Level.MEDIUM, Meter.FOUR_FOUR, 76,
            "Root, fifth, octave, tenth and back: an open arpeggio that fills the bar like a harp.",
            "Hold the pedal for the whole bar and change it exactly with the new bass note.",
            eighths("R", "5", "8", "10", "12", "10", "8", "5"), listOf("pop", "canon", "andalusian")),
        Pattern("octaves", "Octave pulse", "Rock", Level.EASY, Meter.FOUR_FOUR, 112,
            "Low note and its octave in steady eighths. Drive and energy with only two keys.",
            "Rock the hand between little finger and thumb; do not press each note separately.",
            eighths("R", "8", "R", "8", "R", "8", "R", "8"), listOf("pop", "andalusian", "cadence")),
        Pattern("stride", "Stride", "Ragtime · jazz", Level.HARD, Meter.FOUR_FOUR, 96,
            "The left hand leaps between a low bass note and a chord in the middle of the keyboard: a whole rhythm section in one hand.",
            "Practise the leap slowly without looking at the keys: the hand learns the distance.",
            listOf(Step(0, Q, "LOW"), Step(Q, Q, "TRIAD"), Step(2 * Q, Q, "LOW5"), Step(3 * Q, Q, "TRIAD")), listOf("fifties", "jazz", "cadence")),
        Pattern("habanera", "Habanera", "Latin · tango", Level.MEDIUM, Meter.FOUR_FOUR, 84,
            "Long, short, long, long: the rhythm of Carmen's habanera and of the tango.",
            "Lean on the first note and make the short one after it very light.",
            listOf(Step(0, Q + E, "R"), Step(Q + E, E, "5"), Step(2 * Q, Q, "8"), Step(3 * Q, Q, "5")), listOf("andalusian", "cadence", "fifties")),
        Pattern("tresillo", "Tresillo (3+3+2)", "Pop · latin", Level.MEDIUM, Meter.FOUR_FOUR, 100,
            "Eight eighths grouped 3+3+2. The syncopation behind much of today's pop and of Caribbean music.",
            "Count \"1-2-3, 1-2-3, 1-2\" aloud until the accents fall by themselves.",
            listOf(Step(0, Q + E, "R"), Step(Q + E, Q + E, "5"), Step(3 * Q, Q, "8")), listOf("pop", "andalusian", "fifties")),
        Pattern("bossa", "Bossa nova", "Latin jazz", Level.HARD, Meter.FOUR_FOUR, 120,
            "Root and fifth in the bass with the chord placed off the beat: the gentle sway of bossa nova.",
            "Play it very softly. The off-beat chords should feel like breathing, not like accents.",
            listOf(Step(0, Q + E, "R"), Step(Q + E, E, "TRIAD"), Step(2 * Q, Q + E, "5"), Step(3 * Q + E, E, "TRIAD")), listOf("jazz", "fifties")),
        Pattern("walking", "Walking bass", "Jazz · blues", Level.MEDIUM, Meter.FOUR_FOUR, 108,
            "One note per beat, walking through the chord: root, third, fifth, sixth.",
            "Give every quarter note its full length; the walk should never limp.",
            quarters("R", "3", "5", "6"), listOf("blues", "jazz")),
        Pattern("boogie", "Boogie-woogie", "Blues", Level.HARD, Meter.FOUR_FOUR, 132,
            "Root, third, fifth, sixth, seventh and back down in eighths: the rolling left hand of boogie-woogie.",
            "Swing the eighths (long-short) and start at half speed: evenness matters more than tempo.",
            eighths("R", "3", "5", "6", "b7", "6", "5", "3"), listOf("blues")),
        Pattern("waltz", "Waltz", "Waltz", Level.EASY, Meter.THREE_FOUR, 132,
            "Bass note on one, chord on two and three: oom-pah-pah.",
            "A strong first beat and two light chords; let the hand bounce off the bass note.",
            listOf(Step(0, Q, "R"), Step(Q, Q, "TRIAD"), Step(2 * Q, Q, "TRIAD")), listOf("cadence", "fifties", "andalusian")),
        Pattern("waltz-arpeggio", "Flowing 3/4 arpeggio", "Romantic", Level.MEDIUM, Meter.THREE_FOUR, 96,
            "Six eighths rising and falling through the chord, as in many Chopin nocturnes and film themes.",
            "Think of one wave per bar, not six notes.",
            eighths("R", "5", "8", "10", "8", "5"), listOf("pop", "canon", "andalusian")),
        Pattern("barcarolle", "Barcarolle", "6/8 ballad", Level.MEDIUM, Meter.SIX_EIGHT, 60,
            "Two gentle swings per bar, like a boat rocking: the 6/8 of barcarolles and folk ballads.",
            "Feel two beats in the bar, not six, and lean a little on each.",
            eighths("R", "5", "10", "8", "5", "10"), listOf("fifties", "andalusian", "pop")),
    )

    fun byId(id: String): Pattern = ALL.first { it.id == id }
    fun forMeter(meter: Meter): List<Pattern> = ALL.filter { it.meter == meter }

    /** Semitones above the bass root for a tone name in a chord. */
    fun semitones(tone: String, chord: Chord): List<Int> {
        val iv = chord.quality.intervals
        val third = iv[1]
        val fifth = iv[2]
        return when (tone) {
            "R" -> listOf(0)
            "3" -> listOf(third)
            "5" -> listOf(fifth)
            "7" -> listOf(iv.getOrNull(3) ?: 12)
            "8" -> listOf(12)
            "10" -> listOf(third + 12)
            "12" -> listOf(fifth + 12)
            "6" -> listOf(9)
            "b7" -> listOf(10)
            "TRIAD" -> listOf(12, third + 12, fifth + 12)
            "LOW" -> listOf(-12)
            "LOW5" -> listOf(fifth - 12)
            else -> error("unknown tone $tone")
        }
    }
}
