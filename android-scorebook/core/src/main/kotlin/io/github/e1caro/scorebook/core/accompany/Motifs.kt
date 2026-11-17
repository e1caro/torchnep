package io.github.e1caro.scorebook.core.accompany

import io.github.e1caro.scorebook.core.analysis.Chord
import io.github.e1caro.scorebook.core.analysis.ChordQuality
import io.github.e1caro.scorebook.core.correct.Hand
import io.github.e1caro.scorebook.core.correct.Transcription
import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.music.Mode

/**
 * A figure musicians reuse: a bass line, a riff, a sequence, an ending. Unlike a [Pattern] (one bar that is
 * repeated over any chord), a motif is a phrase of several bars with its own notes and its own harmony.
 *
 * [left] and [right] are written in a small notation: bars separated by `|`, notes in order, each a length
 * (`w` whole, `h` half, `q` quarter, `e` eighth, `s` sixteenth, with `.` for dotted) followed by the semitones
 * above the tonic (several joined by `,` for a chord, `r` for a rest): `q0 q7 h0,3,7`. The left hand's tonic is
 * the one between A2 and G♯3, the right hand's an octave higher. An empty hand rests.
 * [chords]: one per bar, as (semitones above the tonic, quality).
 */
data class Motif(
    val id: String,
    val name: String,
    val style: String,
    val level: Level,
    val meter: Meter,
    val mode: Mode,
    val bpm: Int,
    val about: String,
    val tip: String,
    val left: String,
    val right: String,
    val chords: List<Pair<Int, ChordQuality>>,
    val roman: String,
) {
    val bars: Int get() = chords.size
}

/** A motif written in a key, at a tempo. */
data class MotifPick(val motif: Motif, override val key: Key, override val bpm: Int) : Study {
    override val id: String get() = "motif:${motif.id}"
    override val name: String get() = motif.name
    override val style: String get() = motif.style
    override val level: Level get() = motif.level
    override val meter: Meter get() = motif.meter
    override val about: String get() = motif.about
    override val tip: String get() = motif.tip
    override val chords: List<Chord> get() = motif.chords.map { (deg, q) -> Chord((key.tonic + deg) % 12, q) }
    override val roman: String get() = motif.roman
    override fun transcription(repeats: Int): Transcription =
        Studies.transcription(meter, bpm, key, chords, Motifs.notes(motif, key), repeats)
    // a motif keeps its mode: transposing moves the tonic
    override fun transposed(semitones: Int): MotifPick = copy(key = Key(Math.floorMod(key.tonic + semitones, 12), motif.mode))
    override fun withTempo(delta: Int): MotifPick = copy(bpm = (bpm + delta).coerceIn(40, 200))
}

object Motifs {
    private val M = ChordQuality.MAJOR
    private val m = ChordQuality.MINOR
    private val D7 = ChordQuality.DOMINANT7
    private val M7 = ChordQuality.MAJOR7
    private val m7 = ChordQuality.MINOR7
    private val dim = ChordQuality.DIMINISHED
    private val hd7 = ChordQuality.HALF_DIM7

    val ALL: List<Motif> = listOf(
        Motif("lament", "Lament bass", "Baroque · pop", Level.EASY, Meter.FOUR_FOUR, Mode.MINOR, 66,
            "The bass walks down by step from the tonic to the dominant. Four notes that have meant sorrow since Monteverdi and Purcell, " +
                "and that still carry flamenco, film music and many rock and pop songs.",
            "Let the bass sing: play it a little louder than the chords and connect its four notes as one line.",
            left = "w0 | w-2 | w-4 | w-5",
            right = "h0,3,7 h0,3,7 | h2,7,10 h2,7,10 | h0,5,8 h0,5,8 | h-1,2,7 h-1,2,7",
            chords = listOf(0 to m, 7 to m, 5 to m, 7 to M), roman = "i – v6 – iv6 – V"),
        Motif("line-cliche", "Line cliché", "Film · jazz · pop", Level.MEDIUM, Meter.FOUR_FOUR, Mode.MINOR, 76,
            "The chord stays where it is while one voice slides down by half steps: octave, major seventh, minor seventh, sixth. " +
                "A sound of spy films, jazz standards and big ballads.",
            "Bring out the top note that moves and keep everything else quiet and still.",
            left = "h0 h7 | h0 h7 | h0 h7 | h0 h7",
            right = "w3,7,12 | w3,7,11 | w3,7,10 | w3,7,9",
            chords = listOf(0 to m, 0 to m, 0 to m7, 9 to hd7), roman = "i – i(maj7) – i7 – i6"),
        Motif("walking-turnaround", "Walking-bass turnaround", "Jazz", Level.HARD, Meter.FOUR_FOUR, Mode.MAJOR, 100,
            "I – VI – II – V with a bass that walks one note per beat and reaches every new chord by a half step. " +
                "The four bars that send a jazz tune back to its beginning.",
            "The last note of each bar leans into the next root: feel it pulling, and play the right hand very lightly.",
            left = "q0 q4 q7 q8 | q9 q7 q4 q3 | q2 q5 q9 q8 | q7 q5 q2 q-1",
            right = "w4,11 | w7,13 | w5,12 | w5,11",
            chords = listOf(0 to M7, 9 to D7, 2 to m7, 7 to D7), roman = "Imaj7 – VI7 – ii7 – V7"),
        Motif("turnaround", "Blues turnaround", "Blues", Level.MEDIUM, Meter.FOUR_FOUR, Mode.MAJOR, 88,
            "The tonic stays on top while a second voice falls by half steps under it, and the bass climbs to the dominant. " +
                "The last two bars of thousands of blues choruses.",
            "Play the falling line legato with the lower fingers and keep the top note ringing.",
            left = "q0 q4 q5 q6 | q7 qr h-5",
            right = "q10,12 q9,12 q8,12 q7,12 | q5,7,11 qr h5,7,11",
            chords = listOf(0 to D7, 7 to D7), roman = "I7 – V7"),
        Motif("montuno", "Montuno", "Salsa · son", Level.HARD, Meter.FOUR_FOUR, Mode.MAJOR, 96,
            "The piano riff of Cuban son and salsa: octaves and chord tones that land between the beats, " +
                "over a bass (the tumbao) that arrives early at every new chord.",
            "Clap the right-hand rhythm first. Then play it alone, slowly, until the off-beats feel as steady as beats.",
            left = "q0 er e7 qr q5 | q.r e0 qr q7 | q.r e2 qr q5 | q.r e0 qr q0",
            right = "e0,12 er e4,7 e0,12 er e4,7 er e0,12 | er e5,9 er e0,12 er e5,9 er e0,12 | " +
                "e2,14 er e7,11 e2,14 er e7,11 er e2,14 | er e5,9 er e0,12 er e5,9 er e0,12",
            chords = listOf(0 to M, 5 to M, 7 to M, 5 to M), roman = "I – IV – V – IV"),
        Motif("folia", "La Folia", "Baroque", Level.MEDIUM, Meter.THREE_FOUR, Mode.MINOR, 80,
            "One of the oldest grounds in European music: eight bars that Corelli, Vivaldi, Bach, Liszt and Rachmaninov all wrote " +
                "variations on. The second beat is the heavy one, as in a sarabande.",
            "Short first beat, long second beat. Once it is in your hands, improvise a melody over it.",
            left = "h.0 | h.-5 | h.0 | h.-2 | h.3 | h.-2 | h.0 | h.-5",
            right = "q0,3,7 h0,3,7 | q-1,2,7 h-1,2,7 | q0,3,7 h0,3,7 | q-2,2,5 h-2,2,5 | q-2,3,7 h-2,3,7 | q-2,2,5 h-2,2,5 | q0,3,7 h0,3,7 | q-1,2,7 h-1,2,7",
            chords = listOf(0 to m, 7 to M, 0 to m, 10 to M, 3 to M, 10 to M, 0 to m, 7 to M), roman = "i – V – i – VII – III – VII – i – V"),
        Motif("pedal", "Pedal point", "Film · rock · organ", Level.EASY, Meter.FOUR_FOUR, Mode.MAJOR, 84,
            "The bass refuses to move while the chords change above it. Tension builds with every bar until the harmony comes home. " +
                "From Bach's organ works to stadium rock intros.",
            "Keep the repeated bass even and quiet, like a heartbeat, and make the chord changes smooth.",
            left = "q0 q0 q0 q0 | q0 q0 q0 q0 | q0 q0 q0 q0 | q0 q0 q0 q0",
            right = "w4,7,12 | w5,9,12 | w7,11,14 | w4,7,12",
            chords = listOf(0 to M, 5 to M, 7 to M, 0 to M), roman = "I – IV/I – V/I – I"),
        Motif("country", "Alternating bass with walk-ups", "Country · folk", Level.MEDIUM, Meter.FOUR_FOUR, Mode.MAJOR, 100,
            "Boom-chick: the left hand alternates root and fifth, the right answers with the chord, and three bass notes " +
                "walk up into each new chord. The way to accompany a song with nothing but a piano.",
            "The walk-up is the event: play those three notes a bit louder and land firmly on the new chord.",
            left = "q0 qr q-5 qr | q0 qr q2 q4 | q5 qr q0 qr | q7 qr q9 q11",
            right = "qr q4,7,12 qr q4,7,12 | qr q4,7,12 hr | qr q5,9,12 qr q5,9,12 | qr q7,11,14 hr",
            chords = listOf(0 to M, 0 to M, 5 to M, 7 to M), roman = "I – I – IV – V"),
        Motif("sequence", "Falling-fifths sequence", "Baroque", Level.MEDIUM, Meter.FOUR_FOUR, Mode.MINOR, 72,
            "One small figure repeated a step lower each time, while the bass falls by fifths through the whole key. " +
                "The engine of Vivaldi and Bach, and of the song \"Autumn Leaves\".",
            "Learn the first two bars; the rest is the same shape moved down. Listen for the pattern rather than reading every note.",
            left = "w0 | w5 | w-2 | w3 | w-4 | w2 | w-5 | w0",
            right = "e3 e7 e12 e7 h3 | e0 e5 e8 e5 h0 | e2 e5 e10 e5 h2 | e-2 e3 e7 e3 h-2 | " +
                "e0 e3 e8 e3 h0 | e-4 e2 e5 e2 h-4 | e-1 e2 e7 e2 h-1 | e0 e3 e7 e3 h0",
            chords = listOf(0 to m, 5 to m, 10 to M, 3 to M, 8 to M, 2 to dim, 7 to M, 0 to m), roman = "i – iv – VII – III – VI – ii° – V – i"),
        Motif("ostinato", "Minimal ostinato", "Film · minimal", Level.EASY, Meter.FOUR_FOUR, Mode.MINOR, 108,
            "The right hand repeats one small figure without changing a note while the bass moves under it, " +
                "so the same notes change colour with every chord. The sound of a great deal of film music.",
            "Play the figure so evenly that it becomes a texture, and let the bass notes be the melody.",
            left = "w0,7 | w-4,3 | w3,10 | w-2,5",
            right = "e7 e12 e15 e12 e7 e12 e15 e12 | e7 e12 e15 e12 e7 e12 e15 e12 | e7 e12 e15 e12 e7 e12 e15 e12 | e5 e10 e14 e10 e5 e10 e14 e10",
            chords = listOf(0 to m, 8 to M, 3 to M, 10 to M), roman = "i – VI – III – VII"),
        Motif("shuffle", "Shuffle riff", "Blues · rock and roll", Level.MEDIUM, Meter.FOUR_FOUR, Mode.MAJOR, 104,
            "Root and fifth, with the fifth stepping up to the sixth and back. The left hand of rock and roll and of electric blues, " +
                "and it leaves the right hand free.",
            "Swing the eighths (long, short) and accent the beats. Keep the thumb doing the moving.",
            left = "e0,7 e0,7 e0,9 e0,7 e0,7 e0,7 e0,9 e0,7 | e5,12 e5,12 e5,14 e5,12 e5,12 e5,12 e5,14 e5,12 | " +
                "e0,7 e0,7 e0,9 e0,7 e0,7 e0,7 e0,9 e0,7 | e-5,2 e-5,2 e-5,4 e-5,2 e-5,2 e-5,2 e-5,4 e-5,2",
            right = "",
            chords = listOf(0 to D7, 5 to D7, 0 to D7, 7 to D7), roman = "I7 – IV7 – I7 – V7"),
        Motif("tango", "Tango marcato and síncopa", "Tango", Level.MEDIUM, Meter.FOUR_FOUR, Mode.MINOR, 112,
            "Marcato: a chord on each of the four beats, heavy and dry. Síncopa: short, long, short, as if the bar tripped. " +
                "Tango accompaniment alternates the two.",
            "Play the marcato chords short and detached, and lean on the long note of the síncopa.",
            left = "h0 h-5 | h5 h0 | h7 h2 | q.0 e0 h0",
            right = "q3,7,12 q3,7,12 q3,7,12 q3,7,12 | e5,8,12 q5,8,12 e5,8,12 q5,8,12 q5,8,12 | q-1,2,7 q-1,2,7 q-1,2,7 q-1,2,7 | e0,3,7 q0,3,7 e0,3,7 h0,3,7",
            chords = listOf(0 to m, 5 to m, 7 to M, 0 to m), roman = "i – iv – V – i"),
        Motif("blues-lick", "Blues lick: call and answer", "Blues", Level.MEDIUM, Meter.FOUR_FOUR, Mode.MAJOR, 92,
            "A question and its answer: the minor third bends into the major third and climbs, then the answer falls back to the tonic. " +
                "Blues phrases come in pairs like this one.",
            "Slide from the minor third to the major third with one finger where you can, and leave space after each phrase.",
            left = "w0,10 | w0,10",
            right = "e3 e4 e7 e9 q10 q7 | e12 e10 e7 e3 h0",
            chords = listOf(0 to D7, 0 to D7), roman = "I7"),
    )

    fun byId(id: String): Motif = ALL.first { it.id == id }

    /** The left hand's tonic: between A2 and G♯3. */
    fun leftTonic(key: Key): Int = if (key.tonic <= 8) 48 + key.tonic else 36 + key.tonic

    private val LENGTHS = mapOf('w' to 192, 'h' to 96, 'q' to 48, 'e' to 24, 's' to 12)

    /** One hand's notation as notes; throws on notation that is not understood. */
    fun parse(text: String, base: Int, hand: Hand): List<StudyNote> {
        val out = ArrayList<StudyNote>()
        if (text.isBlank()) return out
        for ((bar, part) in text.split('|').withIndex()) {
            var tick = 0
            for (token in part.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }) {
                var length = LENGTHS[token[0]] ?: error("length in '$token'")
                var rest = token.substring(1)
                if (rest.startsWith(".")) { length = length * 3 / 2; rest = rest.substring(1) }
                if (rest != "r") for (semis in rest.split(',')) out.add(StudyNote(bar, tick, length, base + semis.toInt(), hand, tick == 0))
                tick += length
            }
        }
        return out
    }

    /** Ticks each bar of one hand's notation fills (for checking the library). */
    fun barLengths(text: String): List<Int> = if (text.isBlank()) emptyList() else text.split('|').map { part ->
        part.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }.sumOf { t -> (LENGTHS[t[0]] ?: 0) * (if (t.getOrNull(1) == '.') 3 else 2) / 2 }
    }

    /** The notes of [motif] in [key] (its tonic; the mode is the motif's). */
    fun notes(motif: Motif, key: Key): List<StudyNote> {
        val left = leftTonic(key)
        return parse(motif.left, left, Hand.LEFT) + parse(motif.right, left + 12, Hand.RIGHT)
    }
}
