package io.github.e1caro.scorebook.data

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import io.github.e1caro.scorebook.core.correct.Transcription
import io.github.e1caro.scorebook.core.engrave.EngraveStyle
import io.github.e1caro.scorebook.core.engrave.Engraver
import io.github.e1caro.scorebook.core.export.MidiWriter
import io.github.e1caro.scorebook.core.export.MusicXmlWriter
import io.github.e1caro.scorebook.core.score.Score
import io.github.e1caro.scorebook.render.PageRenderer
import io.github.e1caro.scorebook.render.Palette
import java.io.ByteArrayOutputStream
import java.io.File

/** PDF (A4, black on white), MIDI and MusicXML files; sharing and saving to Downloads/Scorebook. */
class Exporter(private val context: Context, private val music: Typeface) {
    enum class Kind(val ext: String, val mime: String) { PDF("pdf", "application/pdf"), MIDI("mid", "audio/midi"), MUSICXML("musicxml", "application/vnd.recordare.musicxml+xml") }

    fun pdf(score: Score): ByteArray {
        val doc = PdfDocument()
        val renderer = PageRenderer(music, Palette.PAPER)
        val pages = Engraver(EngraveStyle(staffSpace = 6.6, margin = 42.0)).pages(score, A4_W.toDouble(), A4_H.toDouble())
        pages.forEachIndexed { i, p ->
            val page = doc.startPage(PdfDocument.PageInfo.Builder(A4_W, A4_H, i + 1).create())
            renderer.draw(page.canvas, p)
            doc.finishPage(page)
        }
        val out = ByteArrayOutputStream()
        doc.writeTo(out)
        doc.close()
        return out.toByteArray()
    }

    fun bytes(kind: Kind, score: Score, t: Transcription): ByteArray = when (kind) {
        Kind.PDF -> pdf(score)
        Kind.MIDI -> MidiWriter.write(t, score.title)
        Kind.MUSICXML -> MusicXmlWriter.write(score).toByteArray()
    }

    /** A share sheet for the file. */
    fun share(kind: Kind, name: String, bytes: ByteArray) {
        val dir = File(context.cacheDir, "exports").apply { mkdirs() }
        val f = File(dir, "${safe(name)}.${kind.ext}")
        f.writeBytes(bytes)
        val uri: Uri = FileProvider.getUriForFile(context, context.packageName + ".files", f)
        val send = Intent(Intent.ACTION_SEND).apply {
            type = kind.mime
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, name)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(send, name).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    /** Saves into Downloads/Scorebook (Android 10+), or the app's Documents folder on older phones. Returns where. */
    fun saveToDownloads(kind: Kind, name: String, bytes: ByteArray): String {
        val file = "${safe(name)}.${kind.ext}"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, file)
                put(MediaStore.MediaColumns.MIME_TYPE, kind.mime)
                put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Scorebook")
            }
            val uri = context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: return "not saved"
            context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
            return "Downloads/Scorebook/$file"
        }
        val dir = File(context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS), "Scorebook").apply { mkdirs() }
        File(dir, file).writeBytes(bytes)
        return dir.absolutePath + "/" + file
    }

    private fun safe(s: String) = s.replace(Regex("[\\\\/:*?\"<>|]"), "-").take(80)

    companion object {
        const val A4_W = 595
        const val A4_H = 842
    }
}
