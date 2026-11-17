package io.github.e1caro.scorebook.core

import io.github.e1caro.scorebook.core.analysis.Pedal
import io.github.e1caro.scorebook.core.correct.AnalysisSettings
import io.github.e1caro.scorebook.core.correct.Decision
import io.github.e1caro.scorebook.core.correct.Hand
import io.github.e1caro.scorebook.core.correct.TNote
import io.github.e1caro.scorebook.core.correct.Transcriber
import io.github.e1caro.scorebook.core.export.MidiWriter
import io.github.e1caro.scorebook.core.library.Edit
import io.github.e1caro.scorebook.core.library.Edits
import io.github.e1caro.scorebook.core.live.MidiNoteTracker
import io.github.e1caro.scorebook.core.play.PianoSynth
import io.github.e1caro.scorebook.core.transcribe.NoteEvent
import org.junit.Test
import kotlin.math.abs
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class PedalTest {
    private fun note(id: Int, pitch: Int, on: Double, off: Double, hand: Hand = Hand.RIGHT) = TNote(id, pitch, on, off, 70, hand, 0, 0, Decision.CLEAR)

    /** Control-change 64 events (value) in a MIDI file's bytes. */
    private fun pedalEvents(midi: ByteArray): List<Int> =
        (0 until midi.size - 2).filter { (midi[it].toInt() and 0xF0) == 0xB0 && midi[it + 1].toInt() == 64 }.map { midi[it + 2].toInt() }

    @Test
    fun aMidiKeyboardKeepsBothTheKeyReleaseAndThePedal() {
        val k = MidiNoteTracker()
        k.noteOn(60, 80, 0.0)
        k.sustain(true, 0.2)
        k.noteOff(60, 0.5) // the key goes up, the pedal keeps it sounding
        k.noteOn(64, 80, 1.0)
        k.noteOff(64, 1.3)
        k.sustain(false, 2.0)
        k.noteOn(67, 80, 2.5) // no pedal: ends with the key
        k.noteOff(67, 3.0)
        val ev = k.finish(3.5)
        assertEquals(listOf(60, 64, 67), ev.map { it.pitch })
        assertEquals(listOf(2.0, 2.0, 3.0), ev.map { it.offset })
        assertEquals(listOf(0.5, 1.3, -1.0), ev.map { it.keyOff })
        // cutting the take keeps them in step
        val cut = Edits.apply(ev, listOf(Edit.Cut(0.0, 0.9)))
        assertEquals(64, cut[0].pitch)
        assertTrue(abs(cut[0].onset - 0.1) < 1e-9 && abs(cut[0].keyOff - 0.4) < 1e-9 && abs(cut[0].offset - 1.1) < 1e-9)
        // the pedal is down exactly where notes sounded after their keys
        val spans = Pedal.spans(ev.map { TNote(it.id, it.pitch, it.onset, it.offset, it.velocity, Hand.RIGHT, 0, 0, Decision.MIDI, it.keyOff) })
        assertEquals(1, spans.size)
        assertTrue(abs(spans[0].from - 0.5) < 1e-9 && abs(spans[0].to - 2.0) < 1e-9)
    }

    @Test
    fun fromTheMicrophoneThePedalIsReadFromNotesNoHandCouldHold() {
        // a low C that rings for three seconds while the same hand plays two octaves higher: only the pedal does that
        val pedalled = listOf(note(0, 48, 0.0, 3.0, Hand.LEFT), note(1, 72, 1.0, 1.4, Hand.LEFT), note(2, 76, 1.5, 1.9, Hand.LEFT), note(3, 60, 4.0, 4.4, Hand.LEFT))
        val spans = Pedal.spans(pedalled)
        assertEquals(1, spans.size)
        assertTrue(abs(spans[0].from - 1.0) < 1e-9 && abs(spans[0].to - 3.0) < 1e-9, "$spans")
        assertTrue(Pedal.share(pedalled) in 0.4..0.5)
        // the same without pedal: every note ends when its key does
        val dry = listOf(note(0, 48, 0.0, 0.9, Hand.LEFT), note(1, 72, 1.0, 1.4, Hand.LEFT), note(2, 76, 1.5, 1.9, Hand.LEFT), note(3, 60, 4.0, 4.4, Hand.LEFT))
        assertTrue(Pedal.spans(dry).isEmpty())
        assertEquals(0.0, Pedal.share(dry))
        // a chord held by the fingers, a held bass under a melody within reach, and legato overlaps are not pedal
        val held = listOf(note(0, 60, 0.0, 2.0), note(1, 64, 0.0, 2.0), note(2, 67, 0.0, 2.0), note(3, 72, 0.5, 1.0), note(4, 71, 1.0, 1.5), note(5, 69, 1.45, 2.0))
        assertTrue(Pedal.spans(held).isEmpty(), "${Pedal.spans(held)}")
        // the other hand playing far away proves nothing
        val twoHands = listOf(note(0, 40, 0.0, 3.0, Hand.LEFT), note(1, 84, 1.0, 1.5, Hand.RIGHT), note(2, 86, 1.5, 2.0, Hand.RIGHT))
        assertTrue(Pedal.spans(twoHands).isEmpty())
        // six notes ringing in one hand is more than it has fingers
        val wash = (0 until 7).map { note(it, 60 + 2 * it, it * 0.3, 4.0) }
        assertEquals(1, Pedal.spans(wash).size)
    }

    @Test
    fun theMidiFileKeepsTrueLengthsAndThePedal() {
        // played on a MIDI keyboard: an arpeggio under the pedal, then the same notes without it
        val k = MidiNoteTracker()
        var t = 0.0
        k.sustain(true, 0.05)
        for (p in listOf(48, 55, 60, 64, 67, 72, 76, 79)) { k.noteOn(p, 70, t); k.noteOff(p, t + 0.2); t += 0.5 }
        k.sustain(false, 4.2)
        t = 5.0
        for (p in listOf(48, 55, 60, 64, 67, 72, 76, 79)) { k.noteOn(p, 70, t); k.noteOff(p, t + 0.2); t += 0.5 }
        val events = k.finish(t + 1)
        val tr = Transcriber().analyze(events, AnalysisSettings())
        // the notes of the first half ring until the pedal goes up; their keys were down for a fifth of a second
        val first = tr.notes.filter { it.onset < 4.0 }
        assertTrue(first.all { abs(it.offset - 4.2) < 1e-6 && abs(it.keyOff - it.onset - 0.2) < 1e-6 })
        assertTrue(tr.notes.filter { it.onset >= 5.0 }.all { it.keyOff < 0 && abs(it.offset - it.onset - 0.2) < 1e-6 })
        val midi = MidiWriter.write(tr, "x")
        // pedal down and up once, on both hands' channels
        assertEquals(listOf(127, 0, 127, 0), pedalEvents(midi))
        // without any pedal there is no pedal event
        val dryEvents = events.map { NoteEvent.midi(it.id, it.pitch, it.onset, it.onset + 0.2, it.velocity) }
        assertTrue(pedalEvents(MidiWriter.write(Transcriber().analyze(dryEvents, AnalysisSettings()), "x")).isEmpty())
    }

    @Test
    fun thePianoSoundIsTheSameHoweverManyThreadsMakeIt() {
        val voices = (0 until 240).map { PianoSynth.Voice(40 + (it * 7) % 45, it * 0.11, 0.3 + (it % 5) * 0.2, 50 + (it * 13) % 60) }
        val one = PianoSynth.render(voices, threads = 1)
        val four = PianoSynth.render(voices, threads = 4)
        assertEquals(one.size, four.size)
        assertTrue(one.indices.all { abs(one[it] - four[it]) <= 2 })
        assertTrue(one.maxOf { abs(it.toInt()) } > 20000)
    }
}
