package io.github.e1caro.scorebook.core

import io.github.e1caro.scorebook.core.analysis.BeatGrid
import io.github.e1caro.scorebook.core.analysis.KeyTracker
import io.github.e1caro.scorebook.core.correct.AnalysisSettings
import io.github.e1caro.scorebook.core.correct.AutoTitle
import io.github.e1caro.scorebook.core.correct.Context
import io.github.e1caro.scorebook.core.correct.CorrectionExample
import io.github.e1caro.scorebook.core.correct.Decision
import io.github.e1caro.scorebook.core.correct.NoteCorrector
import io.github.e1caro.scorebook.core.correct.OptionFeatures
import io.github.e1caro.scorebook.core.correct.PersonalModel
import io.github.e1caro.scorebook.core.correct.Transcriber
import io.github.e1caro.scorebook.core.engrave.Engraver
import io.github.e1caro.scorebook.core.export.MidiWriter
import io.github.e1caro.scorebook.core.export.MusicXmlWriter
import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.music.Mode
import io.github.e1caro.scorebook.core.music.Spelling
import io.github.e1caro.scorebook.core.score.ScoreBuilder
import io.github.e1caro.scorebook.core.transcribe.BasicPitchStream
import io.github.e1caro.scorebook.core.transcribe.FrameModel
import io.github.e1caro.scorebook.core.transcribe.NoteEvent
import io.github.e1caro.scorebook.core.transcribe.PitchOption
import org.junit.Test
import javax.xml.parsers.DocumentBuilderFactory
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class UnitTest {
    @Test
    fun keysAndSpelling() {
        assertEquals(-1, Key.parse("D minor").fifths)
        assertEquals(1, Key.parse("E minor").fifths)
        assertEquals(-5, Key.parse("Db major").fifths)
        assertEquals("Bb major", Key.parse("Bb").displayName)
        assertEquals("G#4", Spelling.noteName(68, Key.parse("A minor")))
        assertEquals("C#5", Spelling.noteName(73, Key.parse("D minor")))
        assertEquals("Bb4", Spelling.noteName(70, Key.parse("F major")))
        assertEquals("F#4", Spelling.noteName(66, Key.parse("C major")))
        assertEquals("Eb4", Spelling.noteName(63, Key.parse("C major")))
        assertEquals("C#5", Spelling.spell(73, Key.parse("C major"), direction = 1).name)
        assertEquals("Db5", Spelling.spell(73, Key.parse("C major"), direction = -1).name)
        assertEquals("E#4", Spelling.noteName(65, Key.parse("F# major")))
        assertEquals("Cb5", Spelling.noteName(71, Key.parse("Db major")))
    }

    @Test
    fun streamFramesLineUpWithTime() {
        // a fake model that marks, in each output frame, the window's sample offset of the frame centre
        var calls = 0
        val model = object : FrameModel {
            override fun run(window: FloatArray, onsetOut: FloatArray, noteOut: FloatArray) {
                calls++
                for (f in 0 until BasicPitchStream.WINDOW_FRAMES) {
                    val s = (f * BasicPitchStream.HOP).coerceAtMost(window.size - 1)
                    onsetOut[f * 88] = window[s]
                }
            }
        }
        val stream = BasicPitchStream(model)
        val n = BasicPitchStream.SAMPLE_RATE * 5
        val audio = FloatArray(n) { (it / BasicPitchStream.HOP).toFloat() } // value = frame index of the sample
        var i = 0
        while (i < n) { stream.push(audio, i, minOf(1000, n - i)); i += 1000 }
        stream.flush()
        val g = stream.grid
        assertEquals((n + 255) / 256, g.frames)
        for (f in listOf(0, 1, 100, 141, 142, 143, 300, g.frames - 2)) assertEquals(f.toFloat(), g.onset(f, 0), "frame $f")
        assertTrue(calls >= g.frames / BasicPitchStream.STRIDE_FRAMES)
    }

    private fun event(id: Int, t: Double, vararg opts: Pair<Int, Double>, presence: Double = 0.95) =
        NoteEvent(id, t, t + 0.4, 80, presence, opts.map { PitchOption(it.first, it.second) })

    @Test
    fun clearAudioAlwaysWins() {
        // a C major context, then a clearly heard F# and a torn F/F#
        val events = ArrayList<NoteEvent>()
        val scale = listOf(60, 62, 64, 65, 67, 69, 71, 72, 67, 64, 60, 62, 64, 65, 67, 60)
        scale.forEachIndexed { i, p -> events.add(event(i, i * 0.5, p to 0.98, p + 1 to 0.02)) }
        events.add(event(100, 8.0, 66 to 0.9, 65 to 0.1)) // clear F#: keep
        events.add(event(101, 8.5, 66 to 0.52, 65 to 0.48)) // torn: context decides (F in C major)
        for (m in listOf(0.0, 0.5, 1.0)) {
            val t = Transcriber().analyze(events, AnalysisSettings(musical = m))
            assertEquals(66, t.decision(100)!!.pitch, "clear F# at musical=$m")
            assertEquals(Decision.CLEAR, t.decision(100)!!.decision)
        }
        assertEquals(66, Transcriber().analyze(events, AnalysisSettings(musical = 0.0)).decision(101)!!.pitch)
        val musical = Transcriber().analyze(events, AnalysisSettings(musical = 1.0)).decision(101)!!
        assertEquals(65, musical.pitch)
        assertEquals(Decision.CONTEXT, musical.decision)
        assertTrue(musical.reasons.any { "C major" in it }, musical.reasons.toString())
        assertTrue(musical.options.first().finalP > 0.5)
    }

    @Test
    fun overridesAndMidiAreRespected() {
        val events = listOf(event(0, 0.0, 60 to 0.6, 61 to 0.4), NoteEvent.midi(1, 66, 0.5, 1.0, 90))
        val t = Transcriber().analyze(events, AnalysisSettings(musical = 1.0), mapOf(0 to io.github.e1caro.scorebook.core.correct.NoteOverride(pitch = 61)))
        assertEquals(61, t.decision(0)!!.pitch)
        assertEquals(Decision.USER, t.decision(0)!!.decision)
        assertEquals(Decision.MIDI, t.decision(1)!!.decision)
        assertEquals(66, t.decision(1)!!.pitch)
    }

    @Test
    fun learningMovesTowardsThePlayersChoice() {
        val ex = CorrectionExample(
            options = listOf(OptionFeatures(65, kotlin.math.ln(0.55), listOf(-0.5, -0.6, -0.7, -0.7)), OptionFeatures(66, kotlin.math.ln(0.45), listOf(-1.5, -1.4, -0.7, -0.7))),
            gate = 0.8, musical = 0.6, chosenPitch = 66, register = 4,
        )
        var pm = PersonalModel()
        repeat(5) { pm = pm.learn(ex) }
        assertTrue(pm.weights.key < 1.0, "key weight should drop: ${pm.weights}")
        assertTrue(pm.bias(66) > pm.bias(65))
        assertEquals(5, pm.corrections)
        val deleted = pm.learn(ex.copy(chosenPitch = -1))
        assertTrue(deleted.calibration.registerBias[4] < 0)
    }

    @Test
    fun durationsSplitOnTheBeat() {
        val s = ScoreBuilder.split(24, 72, 192, 48, false).map { it.first to it.second.ticks }
        assertEquals(listOf(24 to 24, 48 to 48), s) // eighth + quarter, not a dotted quarter across the beat
        val half = ScoreBuilder.split(48, 96, 192, 48, false).map { it.second.ticks }
        assertEquals(listOf(48, 48), half) // no half note across the middle of a 4/4 bar
        val waltz = ScoreBuilder.split(48, 96, 144, 48, false).map { it.second.ticks }
        assertEquals(listOf(96), waltz) // but fine in 3/4
        val triplets = ScoreBuilder.split(0, 16, 192, 48, false).single().second
        assertTrue(triplets.triplet)
    }

    @Test
    fun exportsAreWellFormed() {
        val events = (0 until 16).map { i -> event(i, i * 0.5, listOf(60, 64, 67, 72)[i % 4] to 0.97, 61 to 0.03) } +
            (0 until 4).map { i -> event(100 + i, i * 2.0, 48 to 0.97, 49 to 0.03) }
        val t = Transcriber().analyze(events)
        val score = ScoreBuilder().build(t, AutoTitle.make(t.mainKey, 14, 11), "test")
        assertEquals("Idea in C major, 14 Nov", score.title)
        val xml = MusicXmlWriter.write(score)
        val doc = DocumentBuilderFactory.newInstance().apply { isValidating = false; setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false) }
            .newDocumentBuilder().parse(xml.byteInputStream())
        assertTrue(doc.getElementsByTagName("note").length >= 20)
        assertEquals(score.measures.size, doc.getElementsByTagName("measure").length)
        val mid = MidiWriter.write(t, "test")
        assertEquals("MThd", String(mid, 0, 4))
        assertEquals(3, mid[11].toInt()) // tempo track + two hands
        val pages = Engraver().pages(score, 595.0, 842.0)
        assertTrue(pages.isNotEmpty() && pages[0].hits.size >= 16)
        val hit = pages[0].hits.first()
        assertEquals(hit.eventId, pages[0].hitAt(hit.x + hit.w / 2, hit.y + hit.h / 2))
    }

    @Test
    fun keyTrackerFollowsAModulation() {
        val notes = ArrayList<io.github.e1caro.scorebook.core.analysis.VotingNote>()
        val c = listOf(60, 64, 67, 65, 62, 59, 60, 64)
        val g = listOf(67, 71, 74, 72, 66, 69, 67, 71)
        for (i in 0 until 48) notes.add(io.github.e1caro.scorebook.core.analysis.VotingNote(c[i % 8], i * 0.5, i * 0.5 + 0.5, 1.0))
        for (i in 48 until 96) notes.add(io.github.e1caro.scorebook.core.analysis.VotingNote(g[i % 8], i * 0.5, i * 0.5 + 0.5, 1.0))
        val kt = KeyTracker()
        val r = kt.track(kt.chroma(notes, (0..96).map { it * 0.5 }))
        assertEquals(listOf(Key(0, Mode.MAJOR), Key(7, Mode.MAJOR)), r.regions.map { it.key })
        assertTrue(r.regions[1].fromStep in 44..56)
    }
}
