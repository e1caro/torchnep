package io.github.e1caro.scorebook

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import androidx.lifecycle.ViewModelProvider
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import io.github.e1caro.scorebook.audio.TfliteModel
import io.github.e1caro.scorebook.core.correct.AnalysisSettings
import io.github.e1caro.scorebook.core.correct.AutoTitle
import io.github.e1caro.scorebook.core.correct.Decision
import io.github.e1caro.scorebook.core.correct.Transcriber
import io.github.e1caro.scorebook.core.engrave.Smufl
import io.github.e1caro.scorebook.core.library.Library
import io.github.e1caro.scorebook.core.library.Song
import io.github.e1caro.scorebook.core.library.TakeData
import io.github.e1caro.scorebook.core.library.TakeMeta
import io.github.e1caro.scorebook.core.live.LiveSession
import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.score.ScoreBuilder
import io.github.e1caro.scorebook.ui.ScorebookViewModel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.io.InputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Runs on a phone or emulator: a rendered piano recording (C major → G major, 96 BPM, 4/4, tools/make_fixtures.py)
 * goes through the real LiteRT model and the live session exactly as microphone audio would; the take is saved,
 * exported to PDF, opened in the app, and screenshots are written to the app's external files folder.
 */
@RunWith(AndroidJUnit4::class)
class OnDeviceTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val ctx = instrumentation.targetContext
    private val out: File = ctx.getExternalFilesDir(null)!!.also { it.mkdirs() }

    @Test
    fun transcribeSaveExportAndShow() {
        val pcm = readWav(instrumentation.context.assets.open("modulation_clean.wav"))
        val model = TfliteModel(ctx)
        val session = LiveSession(model)
        val started = System.nanoTime()
        var i = 0
        val block = FloatArray(2048)
        while (i < pcm.size) {
            val n = minOf(block.size, pcm.size - i)
            System.arraycopy(pcm, i, block, 0, n)
            session.pushAudio(block, n)
            i += n
        }
        val events = session.finish(session.seconds)
        val ms = (System.nanoTime() - started) / 1_000_000
        val t = Transcriber().analyze(events, AnalysisSettings(musical = 0.6))
        val report = "audio ${"%.1f".format(pcm.size / 22050.0)} s transcribed in $ms ms; ${events.size} events, ${t.notes.size} notes, " +
            "${t.bpm} BPM, ${t.grid.numerator}/${t.grid.denominator}, keys ${t.keyChanges().map { it.key.displayName }}"
        File(out, "report.txt").writeText(report + "\n")
        println(report)
        assertEquals(listOf(Key.parse("C major"), Key.parse("G major")), t.keyChanges().map { it.key })
        assertEquals(4, t.grid.numerator)
        assertTrue("tempo ${t.bpm}", t.bpm in 92..100)
        assertTrue("notes ${t.notes.size}", t.notes.size in 90..130)
        // the C#5 passing note in bar 7 is kept
        assertTrue(t.notes.any { it.pitch == 73 })

        // the music font really provides every glyph the engraver uses (no empty boxes on screen or in the PDF)
        val app = ctx.applicationContext as ScorebookApp
        val paint = Paint().apply { typeface = app.music }
        for (c in listOf(Smufl.G_CLEF, Smufl.F_CLEF, Smufl.BRACE, Smufl.NOTEHEAD_BLACK, Smufl.NOTEHEAD_HALF, Smufl.NOTEHEAD_WHOLE, Smufl.SHARP,
            Smufl.FLAT, Smufl.NATURAL, Smufl.REST_QUARTER, Smufl.REST_8, Smufl.FLAG_8_UP, Smufl.TIME_SIG_0, Smufl.DOT)) {
            assertTrue("glyph U+%04X".format(c.code), paint.hasGlyph(c.toString()))
        }

        // save it as the app does, export the PDF
        val id = "devicetest"
        app.repository.save(TakeData(id, events, settings = AnalysisSettings(musical = 0.6), hasAudio = false))
        val title = AutoTitle.make(t.mainKey, 14, 11)
        val lib = Library()
        app.repository.save(
            lib.copy(
                songs = listOf(Song("s$id", Library.INBOX, title, true, System.currentTimeMillis())),
                takes = listOf(TakeMeta(id, "s$id", System.currentTimeMillis(), pcm.size / 22050.0, t.mainKey.displayName, t.bpm, "4/4", "mic", t.notes.size)),
            ),
        )
        val score = ScoreBuilder().build(t, title, "${t.mainKey.displayName} · 4/4 · ♩ = ${t.bpm}")
        val pdf = app.exporter.pdf(score)
        val pdfFile = File(out, "score.pdf").also { it.writeBytes(pdf) }
        assertTrue(pdf.size > 5000)
        assertEquals("%PDF", String(pdf, 0, 4))
        // page 1 as the system's PDF viewer draws it
        ParcelFileDescriptor.open(pdfFile, ParcelFileDescriptor.MODE_READ_ONLY).use { fd ->
            PdfRenderer(fd).use { r ->
                assertTrue(r.pageCount >= 1)
                r.openPage(0).use { page ->
                    val bmp = Bitmap.createBitmap(page.width * 2, page.height * 2, Bitmap.Config.ARGB_8888)
                    bmp.eraseColor(Color.WHITE)
                    page.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                    File(out, "4-pdf-page1.png").outputStream().use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
                    // ink on the page (title, staves, notes): not blank
                    val px = IntArray(bmp.width * bmp.height).also { bmp.getPixels(it, 0, bmp.width, 0, 0, bmp.width, bmp.height) }
                    val dark = px.count { Color.red(it) < 128 }
                    assertTrue("dark pixels on PDF page 1: $dark", dark > px.size / 200)
                    // a small crop of the first system, for a quick look in the CI log
                    small(Bitmap.createBitmap(bmp, 0, (bmp.height * 0.06).toInt(), bmp.width, (bmp.height * 0.3).toInt()), 520, "pdf-crop.jpg")
                }
            }
        }

        // the app: take screen, a tapped AI-decided note, the listening screen
        val intent = Intent(ctx, MainActivity::class.java).putExtra(MainActivity.EXTRA_TAKE, id).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        ActivityScenario.launch<MainActivity>(intent).use { scenario ->
            Thread.sleep(5000)
            shot("1-take.png")
            val ai = t.notes.firstOrNull { it.decision == Decision.CONTEXT }?.eventId ?: t.notes[t.notes.size / 2].eventId
            scenario.onActivity { ViewModelProvider(it)[ScorebookViewModel::class.java].select(ai) }
            Thread.sleep(2500)
            shot("2-note-sheet.png")
            scenario.onActivity { ViewModelProvider(it)[ScorebookViewModel::class.java].select(null) }
            Thread.sleep(1500)
            scenario.onActivity { ViewModelProvider(it)[ScorebookViewModel::class.java].closeTake() }
            Thread.sleep(2500)
            shot("3-listen.png")
        }
    }

    private fun shot(name: String) {
        val bmp: Bitmap = instrumentation.uiAutomation.takeScreenshot() ?: return
        File(out, name).outputStream().use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
        small(bmp, 300, name.replace(".png", "-small.jpg"))
    }

    /** A low-resolution JPEG copy (printed into the CI log). */
    private fun small(src: Bitmap, width: Int, name: String) {
        val h = (src.height.toLong() * width / src.width).toInt()
        val b = Bitmap.createScaledBitmap(src, width, h, true)
        File(out, name).outputStream().use { b.compress(Bitmap.CompressFormat.JPEG, 45, it) }
    }

    /** 16-bit mono WAV → floats. */
    private fun readWav(input: InputStream): FloatArray {
        val bytes = input.use { it.readBytes() }
        val bb = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
        var pos = 12
        while (pos + 8 <= bytes.size) {
            val id = String(bytes, pos, 4)
            val len = bb.getInt(pos + 4)
            if (id == "data") {
                val n = len / 2
                return FloatArray(n) { bb.getShort(pos + 8 + 2 * it) / 32768f }
            }
            pos += 8 + len
        }
        error("no data chunk")
    }
}
