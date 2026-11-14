package io.github.e1caro.scorebook.core.engrave

import java.util.Locale

/** Renders a [Page] as SVG (shareable image, and visual checks in tests). [musicFontUrl] points at Bravura. */
object SvgRenderer {
    fun render(
        page: Page, musicFontUrl: String = "Bravura.otf", light: String = "#8a8f98", ink: String = "#111",
        background: String = "#fff", faint: String = "#555", selected: String = "#e0752d",
    ): String {
        val sb = StringBuilder()
        fun f(v: Double) = String.format(Locale.ROOT, "%.2f", v)
        fun color(i: Ink) = when (i) { Ink.NORMAL -> ink; Ink.LIGHT -> light; Ink.SELECTED -> selected; Ink.FAINT -> faint }
        sb.append("""<svg xmlns="http://www.w3.org/2000/svg" width="${f(page.width)}" height="${f(page.height)}" viewBox="0 0 ${f(page.width)} ${f(page.height)}">""")
        sb.append("""<style>@font-face{font-family:Bravura;src:url('$musicFontUrl')}.m{font-family:Bravura}.t{font-family:Georgia,serif}.s{font-family:Helvetica,Arial,sans-serif}</style>""")
        sb.append("""<rect width="100%" height="100%" fill="$background"/>""")
        for (it in page.items) {
            when (it) {
                is Line -> sb.append("""<line x1="${f(it.x1)}" y1="${f(it.y1)}" x2="${f(it.x2)}" y2="${f(it.y2)}" stroke="${color(it.ink)}" stroke-width="${f(it.width)}"/>""")
                is Glyph -> {
                    val tr = if (it.scaleY != 1.0) """ transform="translate(${f(it.x)} ${f(it.y)}) scale(1 ${f(it.scaleY)}) translate(${f(-it.x)} ${f(-it.y)})"""" else ""
                    sb.append("""<text class="m" x="${f(it.x)}" y="${f(it.y)}" font-size="${f(it.size)}" fill="${color(it.ink)}"$tr>&#x${it.code.code.toString(16)};</text>""")
                }
                is Polygon -> sb.append("""<polygon points="${it.points.chunked(2).joinToString(" ") { p -> "${f(p[0])},${f(p[1])}" }}" fill="${color(it.ink)}"/>""")
                is Tie -> {
                    val mx = (it.x1 + it.x2) / 2
                    val my = (it.y1 + it.y2) / 2 + it.bulge
                    val my2 = my - Math.signum(it.bulge) * it.thickness
                    sb.append("""<path d="M${f(it.x1)} ${f(it.y1)} Q${f(mx)} ${f(my + it.bulge)} ${f(it.x2)} ${f(it.y2)} Q${f(mx)} ${f(my2 + it.bulge)} ${f(it.x1)} ${f(it.y1)}Z" fill="${color(it.ink)}"/>""")
                }
                is Text -> {
                    val anchor = when (it.align) { Align.LEFT -> "start"; Align.CENTER -> "middle"; Align.RIGHT -> "end" }
                    val (cls, weight, style) = when (it.style) {
                        TextStyle.TITLE -> Triple("t", "bold", "normal")
                        TextStyle.SUBTITLE -> Triple("t", "normal", "italic")
                        TextStyle.CHORD -> Triple("s", "bold", "normal")
                        TextStyle.MEASURE_NUMBER, TextStyle.TUPLET -> Triple("t", "normal", "italic")
                        TextStyle.PLAIN -> Triple("s", "normal", "normal")
                    }
                    sb.append("""<text class="$cls" x="${f(it.x)}" y="${f(it.y)}" font-size="${f(it.size)}" font-weight="$weight" font-style="$style" text-anchor="$anchor" fill="${color(it.ink)}">${escape(it.text)}</text>""")
                }
            }
        }
        sb.append("</svg>")
        return sb.toString()
    }

    private fun escape(s: String) = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
}
