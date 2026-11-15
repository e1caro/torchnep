package io.github.e1caro.scorebook.core

import io.github.e1caro.scorebook.core.commands.Command
import io.github.e1caro.scorebook.core.commands.CommandConfig
import io.github.e1caro.scorebook.core.commands.CommandSpotter
import io.github.e1caro.scorebook.core.commands.CommandSpotter.Note
import io.github.e1caro.scorebook.core.commands.PhraseListener
import io.github.e1caro.scorebook.core.transcribe.NoteDecoder
import io.github.e1caro.scorebook.core.transcribe.NoteEvent
import io.github.e1caro.scorebook.core.transcribe.ProbabilityGrid
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Test
import kotlin.math.PI
import kotlin.math.sin
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class CommandsTest {
    private val motifs = CommandConfig.DEFAULTS

    private fun decode(name: String): List<NoteEvent> {
        val meta = Json.parseToJsonElement(CommandsTest::class.java.getResourceAsStream("/commands/$name.json")!!.bufferedReader().readText()).jsonObject
        val grid = ProbabilityGrid.readBytes(CommandsTest::class.java.getResourceAsStream("/commands/$name.probs.gz")!!, meta["frames"]!!.jsonPrimitive.int)
        return NoteDecoder().decode(grid)
    }

    @Test
    fun everyDefaultMotifIsRecognizedFromARealPianoRecording() {
        for (c in Command.entries) {
            val ev = decode("motif_${c.name.lowercase()}")
            val notes = CommandSpotter.notesOf(ev)
            val hit = CommandSpotter.spotTail(notes, ev.maxOf { it.offset } + 1.0, motifs)
            println("${c.name}: ${notes.map { it.pitch }} -> ${hit?.command}")
            assertNotNull(hit, "${c.name} not recognized from ${notes.map { it.pitch }}")
            assertEquals(c, hit.command)
        }
    }

    @Test
    fun theSameNotesInsideMusicDoNotTrigger() {
        val ev = decode("music_with_motif_notes")
        val notes = CommandSpotter.notesOf(ev)
        // at every moment of the piece, nothing fires
        for (t in 0 until 70) {
            val now = t * 0.1
            assertNull(CommandSpotter.spotTail(notes.filter { it.time <= now }, now, motifs), "fired at $now s")
        }
    }

    @Test
    fun aMotifNeedsSilenceBeforeAndAfter() {
        val music = (0 until 8).map { Note(it * 0.4, 60 + it) }
        val start = listOf(100, 96, 100)
        // right after the music: no
        val tight = music + start.mapIndexed { i, p -> Note(3.2 + 0.3 * i + 0.4, p) }
        assertNull(CommandSpotter.spotTail(tight, 6.0, motifs))
        // after 2.5 s of silence: yes, once the notes have stopped for a moment
        val spaced = music + start.mapIndexed { i, p -> Note(5.3 + 0.3 * i, p) }
        assertNull(CommandSpotter.spotTail(spaced, 6.1, motifs), "too early: more notes may follow")
        val hit = CommandSpotter.spotTail(spaced, 6.6, motifs)
        assertEquals(Command.START, hit?.command)
        assertEquals(5.3, hit!!.start, 1e-9)
        // fires once
        assertNull(CommandSpotter.spotTail(spaced, 7.0, motifs, after = hit.start))
        // a stray ghost note is tolerated, two are not
        assertEquals(Command.STOP, CommandSpotter.match(listOf(96, 108, 100, 96), motifs))
        assertNull(CommandSpotter.match(listOf(96, 108, 100, 84, 96), motifs))
    }

    @Test
    fun teachingChecksTheNewMotif() {
        val cfg = CommandConfig()
        assertNotNull(CommandConfig.problem(listOf(100, 96), Command.START, cfg)) // too short
        assertNotNull(CommandConfig.problem(listOf(96, 100, 96), Command.START, cfg)) // that is STOP
        assertNotNull(CommandConfig.problem(listOf(100, 96, 100, 98), Command.UNDO, cfg)) // contains START
        assertNull(CommandConfig.problem(listOf(98, 93, 98), Command.START, cfg))
        assertNotNull(CommandConfig.warning(listOf(60, 64, 67)))
        assertNull(CommandConfig.warning(listOf(98, 93, 98)))
        val changed = cfg.with(Command.START, listOf(98, 93, 98))
        assertEquals(listOf(98, 93, 98), changed.motif(Command.START)!!.pitches)
        assertEquals(Command.entries.size, changed.motifs.size)
    }

    @Test
    fun phrasesAreCutOutOfTheAudio() {
        val sr = 22050
        var calls = 0
        var lastLen = 0
        val fake = listOf(NoteEvent.midi(0, 100, 0.3, 0.5, 90), NoteEvent.midi(1, 96, 0.6, 0.8, 90), NoteEvent.midi(2, 100, 0.9, 1.1, 90))
        val pl = PhraseListener({ audio -> calls++; lastLen = audio.size; fake }, sr)
        val block = FloatArray(441)
        val rnd = java.util.Random(2)
        var t = 0
        fun feed(seconds: Double, amp: Double): List<Note>? {
            var out: List<Note>? = null
            repeat((seconds * sr / block.size).toInt()) {
                for (i in block.indices) block[i] = (amp * sin(2 * PI * 2093.0 * (t + i) / sr) + 0.0003 * rnd.nextGaussian()).toFloat()
                t += block.size
                pl.push(block)?.let { out = it }
            }
            return out
        }
        assertNull(feed(1.0, 0.0))
        assertNull(feed(0.5, 0.2)) // sound after only 1 s of quiet: not a phrase
        assertNull(feed(2.5, 0.0))
        assertNull(feed(1.0, 0.2)) // a phrase starts...
        val got = feed(1.2, 0.0) // ...and ends after 0.8 s of quiet
        assertEquals(1, calls)
        assertEquals(listOf(100, 96, 100), got?.map { it.pitch })
        assertTrue(lastLen in (1.7 * sr).toInt()..(2.2 * sr).toInt(), "phrase length ${lastLen.toDouble() / sr}")
        // a long stretch of music is never transcribed
        assertNull(feed(2.5, 0.0))
        assertNull(feed(8.0, 0.2))
        assertNull(feed(1.5, 0.0))
        assertEquals(1, calls)
    }
}
