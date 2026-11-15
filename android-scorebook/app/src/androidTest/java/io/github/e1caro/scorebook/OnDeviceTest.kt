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
import io.github.e1caro.scorebook.core.commands.Command
import io.github.e1caro.scorebook.core.commands.CommandConfig
import io.github.e1caro.scorebook.core.commands.CommandSpotter
import io.github.e1caro.scorebook.core.commands.PhraseListener
import io.github.e1caro.scorebook.core.accompany.Daily
import io.github.e1caro.scorebook.core.accompany.Motifs
import io.github.e1caro.scorebook.core.accompany.Patterns
import io.github.e1caro.scorebook.core.accompany.Study
import io.github.e1caro.scorebook.core.analysis.TuningEstimator
import io.github.e1caro.scorebook.core.play.PianoSynth
import io.github.e1caro.scorebook.core.practice.PlayAlong
import io.github.e1caro.scorebook.core.live.Resampler
import io.github.e1caro.scorebook.core.transcribe.Decoder
import io.github.e1caro.scorebook.core.transcribe.FrameStream
import io.github.e1caro.scorebook.core.transcribe.ModelSpec
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
        val pcm = readWav(instrumentation.context.assets.open("modulation_clean.wav")) // 22.05 kHz
        val model = sharedModel(ctx)
        // the APK must carry the piano model (tools/fetch_model.sh), not just the small fallback
        assertEquals(ModelSpec.ONSETS_FRAMES.name, model.spec.name)
        val session = LiveSession(model)
        val toModel = Resampler(22050, model.spec.sampleRate)
        val started = System.nanoTime()
        var i = 0
        val block = FloatArray(2048)
        while (i < pcm.size) {
            val n = minOf(block.size, pcm.size - i)
            System.arraycopy(pcm, i, block, 0, n)
            session.pushAudio(toModel.process(block, n))
            i += n
        }
        val events = session.finish(session.seconds)
        val ms = (System.nanoTime() - started) / 1_000_000
        val t = Transcriber().analyze(events, AnalysisSettings(musical = 0.6))
        val tuning = TuningEstimator.estimate(pcm, 22050)
        val report = "model ${model.spec.name}; tuning ${tuning?.cents?.let { "%.1f".format(it) }} cents; " +
            "audio ${"%.1f".format(pcm.size / 22050.0)} s transcribed in $ms ms; ${events.size} events, ${t.notes.size} notes, " +
            "${t.bpm} BPM, ${t.grid.numerator}/${t.grid.denominator}, keys ${t.keyChanges().map { it.key.displayName }}"
        File(out, "report.txt").writeText(report + "\n")
        println(report)
        assertEquals(listOf(Key.parse("C major"), Key.parse("G major")), t.keyChanges().map { it.key })
        assertEquals(4, t.grid.numerator)
        assertTrue("tempo ${t.bpm}", t.bpm in 92..100)
        assertTrue("notes ${t.notes.size}", t.notes.size in 104..124) // 110 were played
        assertTrue("tuning $tuning", tuning != null && kotlin.math.abs(tuning.cents) < 6)
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
                    File(out, "6-pdf-page1.png").outputStream().use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
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
            var loaded = false
            for (k in 0 until 60) {
                scenario.onActivity { loaded = ViewModelProvider(it)[ScorebookViewModel::class.java].take.value != null }
                if (loaded) break
                Thread.sleep(500)
            }
            assertTrue("the take opens", loaded)
            Thread.sleep(1500)
            shot("1-take.png")
            val ai = t.notes.firstOrNull { it.decision == Decision.CONTEXT }?.eventId ?: t.notes[t.notes.size / 2].eventId
            scenario.onActivity { ViewModelProvider(it)[ScorebookViewModel::class.java].select(ai) }
            Thread.sleep(2500)
            shot("2-note-sheet.png")
            scenario.onActivity { ViewModelProvider(it)[ScorebookViewModel::class.java].select(null) }
            Thread.sleep(1500)
            // cut mode with bars 2 to 4 selected
            scenario.onActivity { val vm = ViewModelProvider(it)[ScorebookViewModel::class.java]; vm.setEditing(true); vm.tapBar(2); vm.tapBar(4) }
            Thread.sleep(1500)
            shot("7-cut.png")
            scenario.onActivity { val vm = ViewModelProvider(it)[ScorebookViewModel::class.java]; vm.deleteSelection() }
            Thread.sleep(4000)
            var bars = 0
            scenario.onActivity { bars = ViewModelProvider(it)[ScorebookViewModel::class.java].take.value!!.score.measures.size }
            File(out, "cut.txt").writeText("bars after cutting 2-4: $bars\n")
            assertTrue("bars after cut: $bars", bars in 12..14)
            scenario.onActivity { val vm = ViewModelProvider(it)[ScorebookViewModel::class.java]; vm.setEditing(false) }
            Thread.sleep(1000)
            scenario.onActivity { ViewModelProvider(it)[ScorebookViewModel::class.java].closeTake() }
            Thread.sleep(2500)
            shot("3-listen.png")
        }
        // today's accompaniment, then "use it on my last song": a new song with the same right hand
        val i3 = Intent(ctx, MainActivity::class.java).putExtra(MainActivity.EXTRA_ACCOMPANIMENT, true).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        ActivityScenario.launch<MainActivity>(i3).use { scenario ->
            Thread.sleep(3000)
            shot("8-accompaniment.png")
            var info = ""
            scenario.onActivity {
                val vm = ViewModelProvider(it)[ScorebookViewModel::class.java]
                val a = vm.accompany.value!!
                info = "today: ${a.study.name}, ${a.study.harmony}, last song ${a.lastTitle} (${a.lastMeter})"
                vm.accompanyPattern(io.github.e1caro.scorebook.core.accompany.Patterns.byId("alberti"))
                vm.accompanySong(a.lastTakeId!!, io.github.e1caro.scorebook.core.accompany.Patterns.byId("alberti"))
            }
            var made: io.github.e1caro.scorebook.ui.TakeUi? = null
            for (k in 0 until 60) {
                scenario.onActivity { made = ViewModelProvider(it)[ScorebookViewModel::class.java].take.value }
                if (made != null) break
                Thread.sleep(500)
            }
            val m = made
            assertTrue("the accompanied song opens", m != null && m.takeId != id)
            val left = m!!.transcription.notes.count { it.hand == io.github.e1caro.scorebook.core.correct.Hand.LEFT && it.decision == Decision.MIDI }
            File(out, "accompaniment.txt").writeText("$info\naccompanied: ${m.title}, ${m.score.measures.size} bars, $left left-hand notes, ${m.transcription.bpm} BPM\n")
            assertTrue("title ${m.title}", m.title.endsWith("+ Alberti bass"))
            assertTrue("left-hand notes $left", left >= 70)
            assertTrue("bars ${m.score.measures.size}", m.score.measures.size in 11..15)
            Thread.sleep(2000)
            shot("9-accompanied.png")
        }
        // a motif, "another one", and the result of a play-along check with one bar left out
        val i4 = Intent(ctx, MainActivity::class.java).putExtra(MainActivity.EXTRA_ACCOMPANIMENT, true).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        ActivityScenario.launch<MainActivity>(i4).use { scenario ->
            Thread.sleep(2500)
            var before = ""
            var after = ""
            scenario.onActivity {
                val vm = ViewModelProvider(it)[ScorebookViewModel::class.java]
                before = vm.accompany.value!!.study.id
                vm.anotherRecommendation(motif = false)
                after = vm.accompany.value!!.study.id
                vm.openMotif(io.github.e1caro.scorebook.core.accompany.Motifs.byId("montuno"))
            }
            assertTrue("another one: $before then $after", before != after && after.startsWith("pattern:"))
            Thread.sleep(2000)
            shot("10-motif.png")
            scenario.onActivity {
                val vm = ViewModelProvider(it)[ScorebookViewModel::class.java]
                val study = vm.accompany.value!!.study
                val tr = study.transcription()
                val played = tr.notes.filter { n -> n.tick / tr.grid.barTicks != 1 }.map { n -> PlayAlong.Played(n.pitch, 1.5 + n.onset / 0.8) }
                vm.showCheckResult(study, played)
            }
            Thread.sleep(2000)
            shot("11-check.png")
            var stars = -1
            scenario.onActivity { stars = ViewModelProvider(it)[ScorebookViewModel::class.java].accompany.value!!.check!!.result!!.stars }
            assertTrue("stars for a bar left out: $stars", stars in 1..2)
        }
        for ((tab, file) in listOf("library" to "4-library.png", "settings" to "5-settings.png")) {
            val i2 = Intent(ctx, MainActivity::class.java).putExtra(MainActivity.EXTRA_TAB, tab).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            ActivityScenario.launch<MainActivity>(i2).use { Thread.sleep(3000); shot(file) }
        }
    }

    /** The start motif (E7 C7 E7, a real piano recording) through the phrase listener and the real model. */
    @Test
    fun aPlayedStartMotifStartsRecording() {
        val pcm = readWav(instrumentation.context.assets.open("motif_start.wav"))
        val model = sharedModel(ctx)
        val listener = PhraseListener({ audio ->
            val st = FrameStream(model)
            st.push(audio)
            st.flush()
            Decoder.forModel(model.spec).decode(st.grid)
        }, model.spec.sampleRate)
        val toModel = Resampler(22050, model.spec.sampleRate)
        var heard: List<Int>? = null
        var i = 0
        val block = FloatArray(441)
        while (i + block.size <= pcm.size) {
            System.arraycopy(pcm, i, block, 0, block.size)
            listener.push(toModel.process(block))?.let { heard = it.map { n -> n.pitch } }
            i += block.size
        }
        File(out, "motif.txt").writeText("heard $heard\n")
        println("start motif heard as $heard")
        assertEquals(Command.START, CommandSpotter.match(heard ?: emptyList(), CommandConfig.DEFAULTS))
    }

    /**
     * The play-along check end to end: a pattern and a motif played by the piano sound go through the real model,
     * and what it hears is compared with what is written.
     */
    @Test
    fun thePlayAlongCheckHearsWhatIsPlayed() {
        val model = sharedModel(ctx)
        val studies: List<Study> = listOf(
            Daily.withPattern(Patterns.byId("alberti"), Key.parse("C major")),
            Daily.withPattern(Patterns.byId("waltz"), Key.parse("A minor")),
            Daily.withMotif(Motifs.byId("lament")),
            Daily.withMotif(Motifs.byId("walking-turnaround")),
        )
        val lines = StringBuilder()
        for (study in studies) {
            val t = study.transcription()
            val pcm = PianoSynth.render(PianoSynth.voices(t), 22050)
            val toModel = Resampler(22050, model.spec.sampleRate)
            val st = FrameStream(model)
            val block = FloatArray(2048)
            var i = 0
            while (i < pcm.size) {
                val n = minOf(block.size, pcm.size - i)
                for (j in 0 until n) block[j] = pcm[i + j] / 32768f
                st.push(toModel.process(block, n))
                i += n
            }
            st.flush()
            val played = Decoder.forModel(model.spec).decode(st.grid).filter { it.presence >= 0.5 }.map { PlayAlong.Played(it.pitch, it.onset) }
            val r = PlayAlong.check(PlayAlong.targets(t), played)
            val line = "play-along ${study.id}: ${r.hit}/${r.expected} notes, ${r.extra} extra, rhythm ${"%.2f".format(r.rhythm)}, ♩ = ${r.bpm} (written ${study.bpm}), ${r.stars} stars"
            println(line)
            lines.append(line).append('\n')
            File(out, "playalong.txt").writeText(lines.toString())
            assertTrue(line, r.stars >= 2)
            assertTrue(line, r.bpm != null && kotlin.math.abs(r.bpm!! - study.bpm) <= 3)
        }
    }

    companion object {
        private var shared: TfliteModel? = null

        /** One model for all the tests: it is 109 MB, and each instance has its own working memory. */
        @Synchronized
        fun sharedModel(ctx: android.content.Context): TfliteModel = shared ?: TfliteModel.load(ctx).also { shared = it }
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
