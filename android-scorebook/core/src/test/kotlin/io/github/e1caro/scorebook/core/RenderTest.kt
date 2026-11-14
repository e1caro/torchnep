package io.github.e1caro.scorebook.core

import io.github.e1caro.scorebook.core.correct.AnalysisSettings
import io.github.e1caro.scorebook.core.correct.AutoTitle
import io.github.e1caro.scorebook.core.correct.Transcriber
import io.github.e1caro.scorebook.core.engrave.Engraver
import io.github.e1caro.scorebook.core.engrave.SvgRenderer
import io.github.e1caro.scorebook.core.export.MidiWriter
import io.github.e1caro.scorebook.core.export.MusicXmlWriter
import io.github.e1caro.scorebook.core.score.ScoreBuilder
import io.github.e1caro.scorebook.core.transcribe.NoteDecoder
import org.junit.Test
import java.io.File

/** Writes SVG pages, MusicXML and MIDI for every fixture into $SCOREBOOK_RENDER_DIR (when set), for eyeballing. */
class RenderTest {
    @Test
    fun render() {
        val dir = System.getenv("SCOREBOOK_RENDER_DIR")?.let { File(it) } ?: return
        dir.mkdirs()
        for (name in Fixture.ALL) {
            val fx = Fixture(name)
            val events = NoteDecoder().decode(fx.grid())
            val t = Transcriber().analyze(events, AnalysisSettings(musical = 0.6))
            val title = AutoTitle.make(t.mainKey, 14, 11)
            val score = ScoreBuilder().build(t, title, "${t.mainKey} · ${t.grid.numerator}/${t.grid.denominator} · ${t.bpm} BPM")
            val pages = Engraver().pages(score, 595.0, 842.0)
            pages.forEachIndexed { i, p -> File(dir, "$name-p${i + 1}.svg").writeText(SvgRenderer.render(p, "Bravura.otf")) }
            File(dir, "$name.musicxml").writeText(MusicXmlWriter.write(score))
            File(dir, "$name.mid").writeBytes(MidiWriter.write(t, title))
            // the live staff halfway through, in the app's stage colours
            val now = t.notes.map { it.onset }.sorted().let { it[it.size / 2] }
            val live = t.notes.filter { it.onset <= now }.map {
                io.github.e1caro.scorebook.core.engrave.LiveNote(it.eventId, it.pitch, it.onset, it.offset, it.hand, it.decision.name == "CONTEXT")
            }
            val lp = io.github.e1caro.scorebook.core.engrave.LiveStaff(10.0).layout(live, t.keyAtTick(t.grid.tickOf(t.grid.position(now)).toInt()), now, 800.0)
            File(dir, "$name-live.svg").writeText(SvgRenderer.render(lp, "Bravura.otf", light = "#6FA8DC", ink = "#F3EBDD", background = "#0E0F12", faint = "#8C8577", selected = "#E0A458"))
            println("$name: ${score.measures.size} measures, ${pages.size} pages")
        }
    }
}
