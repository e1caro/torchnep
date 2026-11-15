package io.github.e1caro.scorebook.core.commands

import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.music.Mode
import io.github.e1caro.scorebook.core.music.Spelling
import io.github.e1caro.scorebook.core.transcribe.NoteEvent
import kotlinx.serialization.Serializable
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.sqrt

/** What a piano command does. */
@Serializable
enum class Command(val title: String, val help: String) {
    START("Start recording", "Begins a new take."),
    STOP("Stop and save", "Ends the take and writes the score."),
    DISCARD("Discard", "Throws away the take being recorded; when nothing is recording, moves the last saved recording to the trash."),
    RESTART("Start over", "Throws away the take being recorded and starts a new one."),
    FAVORITE("Favourite", "Marks the last score as a favourite."),
    UNDO("Undo", "Undoes the last command (brings back a discarded recording, removes a favourite)."),
}

/** A short series of notes (MIDI numbers, in order) that triggers a command. */
@Serializable
data class Motif(val command: Command, val pitches: List<Int>) {
    val names: String get() = pitches.joinToString(" ") { Spelling.noteName(it, Key(0, Mode.MAJOR)) }
}

@Serializable
data class CommandConfig(val enabled: Boolean = false, val motifs: List<Motif> = DEFAULTS) {
    fun motif(c: Command): Motif? = motifs.firstOrNull { it.command == c }

    fun with(c: Command, pitches: List<Int>): CommandConfig = copy(motifs = motifs.filter { it.command != c } + Motif(c, pitches))

    companion object {
        /**
         * Defaults where the transcription model hears notes reliably and music rarely goes alone: the top of the
         * keyboard (C7, E7) for start and stop, the low end (A1 to G2) for the others. Checked on rendered piano
         * recordings (tools/make_command_fixtures.py, core CommandsTest). The very bottom (A0 to C1) and the very
         * top (G7, C8) are avoided: the model mistakes the lowest notes for their overtones and misses the highest.
         */
        val DEFAULTS = listOf(
            Motif(Command.START, listOf(100, 96, 100)), // E7 C7 E7
            Motif(Command.STOP, listOf(96, 100, 96)), // C7 E7 C7
            Motif(Command.RESTART, listOf(33, 36, 40)), // A1 C2 E2
            Motif(Command.FAVORITE, listOf(36, 40, 43)), // C2 E2 G2
            Motif(Command.DISCARD, listOf(36, 35, 36)), // C2 B1 C2
            Motif(Command.UNDO, listOf(43, 40, 36)), // G2 E2 C2
        )

        const val MIN_NOTES = 3
        const val MAX_NOTES = 5

        /** Why a new motif cannot be used, or null if it can. */
        fun problem(pitches: List<Int>, command: Command, config: CommandConfig): String? {
            if (pitches.size < MIN_NOTES) return "Play at least $MIN_NOTES notes."
            if (pitches.size > MAX_NOTES) return "Play at most $MAX_NOTES notes."
            val clash = config.motifs.firstOrNull { it.command != command && (it.pitches == pitches || isSubsequence(it.pitches, pitches) || isSubsequence(pitches, it.pitches)) }
            if (clash != null) return "Too close to “${clash.command.title}” (${clash.names})."
            return null
        }

        /** A friendly warning when a motif may be missed or trigger by accident. */
        fun warning(pitches: List<Int>): String? = when {
            pitches.any { it < 33 } -> "The lowest notes (below A1) are hard to hear for the transcription: this motif may be missed."
            pitches.any { it > 100 } -> "The highest notes (above E7) are hard to hear for the transcription: this motif may be missed."
            pitches.any { it in 48..84 } -> "Notes between C3 and C6 turn up in most music: a motif near the top or bottom of the keyboard is safer."
            else -> null
        }

        internal fun isSubsequence(small: List<Int>, big: List<Int>): Boolean {
            var i = 0
            for (p in big) if (i < small.size && small[i] == p) i++
            return i == small.size
        }
    }
}

/**
 * Finds command motifs in what was played. A motif counts only as a phrase of its own: after at least
 * [PRE_SILENCE] seconds without new notes, nothing else around it, and no more than [MAX_SPAN] seconds long,
 * so the same notes inside a piece never trigger anything.
 */
object CommandSpotter {
    const val PRE_SILENCE = 2.0
    const val POST_SILENCE = 0.7
    const val MAX_SPAN = 4.0

    data class Note(val time: Double, val pitch: Int)

    data class Hit(val command: Command, val start: Double, val end: Double)

    /** Notes that were really played: present, not an overtone of a louder note. */
    fun notesOf(events: List<NoteEvent>): List<Note> =
        events.filter { it.fromMidi || (it.presence >= 0.45 && it.harmonicOf < 0) }.map { Note(it.onset, it.pitch) }.sortedWith(compareBy({ it.time }, { it.pitch }))

    /** The command whose motif these pitches are (one stray extra note is tolerated). */
    fun match(pitches: List<Int>, motifs: List<Motif>): Command? {
        if (pitches.size < CommandConfig.MIN_NOTES) return null
        motifs.firstOrNull { it.pitches == pitches }?.let { return it.command }
        // a ghost note (an overtone, a sympathetic string) may slip in; never more than one
        return motifs.filter { pitches.size == it.pitches.size + 1 && CommandConfig.isSubsequence(it.pitches, pitches) }
            .maxByOrNull { it.pitches.size }?.command
    }

    /**
     * Looks at the end of a note stream (a take being recorded, or MIDI notes while idle). [knownUntil] is how
     * far the stream is known (later notes may still arrive before that time). [after]: only motifs starting
     * later than this (each motif fires once). [startIsSilence]: the stream began in silence (a take's start).
     */
    fun spotTail(notes: List<Note>, knownUntil: Double, motifs: List<Motif>, after: Double = Double.NEGATIVE_INFINITY, startIsSilence: Boolean = true): Hit? {
        if (notes.isEmpty()) return null
        val last = notes.last()
        if (knownUntil - last.time < POST_SILENCE) return null
        var i = notes.size - 1
        while (i > 0 && notes[i].time - notes[i - 1].time < PRE_SILENCE) i--
        if (i == 0 && !startIsSilence) return null
        val phrase = notes.subList(i, notes.size)
        val start = phrase.first().time
        if (start <= after || last.time - start > MAX_SPAN) return null
        val cmd = match(phrase.map { it.pitch }, motifs) ?: return null
        return Hit(cmd, start, last.time)
    }
}

/**
 * Listens for short phrases while nothing is being recorded. Audio comes in at the model's sample rate; a phrase begins when
 * the sound rises after at least [CommandSpotter.PRE_SILENCE] seconds of quiet and ends after [endSilence]
 * seconds of quiet. Only phrases shorter than [maxPhrase] are transcribed (by [transcribe], the model + decoder),
 * so playing music while idle costs almost nothing and never triggers a command.
 */
class PhraseListener(
    private val transcribe: (FloatArray) -> List<NoteEvent>,
    private val sampleRate: Int = 22050,
    private val endSilence: Double = 0.8,
    private val maxPhrase: Double = 6.0,
) {
    private var floorDb = -65.0
    private var quietFor = 0.0
    private var inPhrase = false
    private var phraseQuiet = 0.0
    private var phrase = FloatArray(sampleRate * 8)
    private var phraseLen = 0
    private val ring = FloatArray((0.3 * sampleRate).toInt())
    private var ringPos = 0
    private var ringFilled = 0

    /** Seconds of silence so far (the UI can show "ready" when this is past the pre-silence). */
    val silence: Double get() = if (inPhrase) 0.0 else quietFor

    fun reset() { inPhrase = false; quietFor = 0.0; phraseLen = 0; ringFilled = 0 }

    /** Feeds audio; returns the notes of a phrase that just ended (and qualified), or null. */
    fun push(x: FloatArray, n: Int = x.size): List<CommandSpotter.Note>? {
        var sum = 0.0
        for (i in 0 until n) sum += x[i] * x[i]
        val db = 10 * kotlin.math.log10(max(sum / max(1, n), 1e-12))
        val dt = n.toDouble() / sampleRate
        val loud = db > max(floorDb + 12.0, -58.0)
        if (!inPhrase) {
            if (!loud) floorDb = if (db < floorDb) 0.8 * floorDb + 0.2 * db else 0.998 * floorDb + 0.002 * db
            floorDb = floorDb.coerceIn(-90.0, -30.0)
            if (loud && quietFor >= CommandSpotter.PRE_SILENCE) {
                inPhrase = true
                phraseQuiet = 0.0
                phraseLen = 0
                // keep the attack: what was in the ring just before
                val start = (ringPos - ringFilled + ring.size) % ring.size
                for (i in 0 until ringFilled) append(ring[(start + i) % ring.size])
                for (i in 0 until n) append(x[i])
                return null
            }
            quietFor = if (loud) 0.0 else quietFor + dt
            for (i in 0 until n) { ring[ringPos] = x[i]; ringPos = (ringPos + 1) % ring.size }
            ringFilled = minOf(ring.size, ringFilled + n)
            return null
        }
        for (i in 0 until n) append(x[i])
        phraseQuiet = if (loud) 0.0 else phraseQuiet + dt
        if (phraseLen > maxPhrase * sampleRate) { // music, not a command: wait for silence again
            inPhrase = false
            quietFor = 0.0
            ringFilled = 0
            return null
        }
        if (phraseQuiet < endSilence) return null
        inPhrase = false
        quietFor = phraseQuiet
        ringFilled = 0
        return CommandSpotter.notesOf(transcribe(phrase.copyOf(phraseLen)))
    }

    private fun append(v: Float) {
        if (phraseLen == phrase.size) phrase = phrase.copyOf(phrase.size * 2)
        phrase[phraseLen++] = v
    }

    companion object {
        fun rms(x: FloatArray): Double = sqrt(x.sumOf { (it * it).toDouble() } / max(1, x.size))
        @Suppress("unused") private fun near(a: Double, b: Double) = abs(a - b) < 1e-9
    }
}
