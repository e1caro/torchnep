package io.github.e1caro.scorebook.render

import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import io.github.e1caro.scorebook.core.engrave.Align
import io.github.e1caro.scorebook.core.engrave.Glyph
import io.github.e1caro.scorebook.core.engrave.Ink
import io.github.e1caro.scorebook.core.engrave.Line
import io.github.e1caro.scorebook.core.engrave.Page
import io.github.e1caro.scorebook.core.engrave.Polygon
import io.github.e1caro.scorebook.core.engrave.Text
import io.github.e1caro.scorebook.core.engrave.TextStyle
import io.github.e1caro.scorebook.core.engrave.Tie
import kotlin.math.sign

/** Colours of a score: dark stage on screen, black on white in the PDF. */
data class Palette(val background: Int?, val ink: Int, val light: Int, val faint: Int, val selected: Int) {
    companion object {
        val STAGE = Palette(0xFF0E0F12.toInt(), 0xFFF3EBDD.toInt(), 0xFF6FA8DC.toInt(), 0xFF8C8577.toInt(), 0xFFE0A458.toInt())
        val PAPER = Palette(0xFFFFFFFF.toInt(), 0xFF111111.toInt(), 0xFF7D8590.toInt(), 0xFF444444.toInt(), 0xFFE0752D.toInt())
    }
}

/** Draws a core display-list [Page] on an Android canvas: the screen and PDF pages use the same code. */
class PageRenderer(private val music: Typeface, var palette: Palette) {
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeCap = Paint.Cap.BUTT }
    private val glyph = Paint(Paint.ANTI_ALIAS_FLAG).apply { typeface = music }
    private val text = Paint(Paint.ANTI_ALIAS_FLAG)
    private val path = Path()
    private val serifBold = Typeface.create(Typeface.SERIF, Typeface.BOLD)
    private val serifItalic = Typeface.create(Typeface.SERIF, Typeface.ITALIC)
    private val sansBold = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)

    private fun color(i: Ink) = when (i) { Ink.NORMAL -> palette.ink; Ink.LIGHT -> palette.light; Ink.SELECTED -> palette.selected; Ink.FAINT -> palette.faint }

    fun draw(canvas: Canvas, page: Page, selected: Int? = null, highlight: Set<Int> = emptySet()) {
        // only the page's own area: drawColor() would paint the whole window behind other UI
        palette.background?.let {
            fill.color = it
            canvas.drawRect(0f, 0f, page.width.toFloat(), page.height.toFloat(), fill)
        }
        // selection halo behind the tapped note
        for (h in page.hits) {
            if (h.eventId == selected || h.eventId in highlight) {
                fill.color = (palette.selected and 0x00FFFFFF) or (if (h.eventId == selected) 0x66000000 else 0x33000000)
                canvas.drawRoundRect(RectF(h.x.toFloat(), h.y.toFloat(), (h.x + h.w).toFloat(), (h.y + h.h).toFloat()), (h.h / 2).toFloat(), (h.h / 2).toFloat(), fill)
            }
        }
        for (it in page.items) {
            when (it) {
                is Line -> {
                    stroke.color = color(it.ink); stroke.strokeWidth = it.width.toFloat()
                    canvas.drawLine(it.x1.toFloat(), it.y1.toFloat(), it.x2.toFloat(), it.y2.toFloat(), stroke)
                }
                is Glyph -> {
                    glyph.color = color(it.ink); glyph.textSize = it.size.toFloat()
                    if (it.scaleY != 1.0) {
                        canvas.save(); canvas.scale(1f, it.scaleY.toFloat(), it.x.toFloat(), it.y.toFloat())
                        canvas.drawText(it.code.toString(), it.x.toFloat(), it.y.toFloat(), glyph)
                        canvas.restore()
                    } else canvas.drawText(it.code.toString(), it.x.toFloat(), it.y.toFloat(), glyph)
                }
                is Polygon -> {
                    path.reset()
                    val p = it.points
                    path.moveTo(p[0].toFloat(), p[1].toFloat())
                    var i = 2
                    while (i < p.size) { path.lineTo(p[i].toFloat(), p[i + 1].toFloat()); i += 2 }
                    path.close()
                    fill.color = color(it.ink)
                    canvas.drawPath(path, fill)
                }
                is Tie -> {
                    val mx = ((it.x1 + it.x2) / 2).toFloat()
                    val my = ((it.y1 + it.y2) / 2 + it.bulge).toFloat()
                    val inner = (my - sign(it.bulge) * it.thickness).toFloat()
                    path.reset()
                    path.moveTo(it.x1.toFloat(), it.y1.toFloat())
                    path.quadTo(mx, my + it.bulge.toFloat(), it.x2.toFloat(), it.y2.toFloat())
                    path.quadTo(mx, inner + it.bulge.toFloat(), it.x1.toFloat(), it.y1.toFloat())
                    path.close()
                    fill.color = color(it.ink)
                    canvas.drawPath(path, fill)
                }
                is Text -> {
                    text.color = color(it.ink)
                    text.textSize = it.size.toFloat()
                    text.typeface = when (it.style) {
                        TextStyle.TITLE -> serifBold
                        TextStyle.SUBTITLE, TextStyle.MEASURE_NUMBER, TextStyle.TUPLET -> serifItalic
                        TextStyle.CHORD -> sansBold
                        TextStyle.PLAIN -> Typeface.SANS_SERIF
                    }
                    text.textAlign = when (it.align) { Align.LEFT -> Paint.Align.LEFT; Align.CENTER -> Paint.Align.CENTER; Align.RIGHT -> Paint.Align.RIGHT }
                    canvas.drawText(it.text, it.x.toFloat(), it.y.toFloat(), text)
                }
            }
        }
    }
}
