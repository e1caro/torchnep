package io.github.e1caro.scorebook.core.engrave

/**
 * What the engraver produces: a flat list of drawing primitives in page units (points for PDF, pixels on
 * screen). Renderers for the screen, PDF and SVG only translate these.
 */
enum class Ink { NORMAL, LIGHT, SELECTED, FAINT }

enum class TextStyle { TITLE, SUBTITLE, CHORD, MEASURE_NUMBER, TUPLET, PLAIN }

enum class Align { LEFT, CENTER, RIGHT }

sealed interface Item { val ink: Ink }

/** A music-font glyph (SMuFL code point). [size] is the font size (= 4 staff spaces); y is the baseline. */
data class Glyph(val code: Char, val x: Double, val y: Double, val size: Double, override val ink: Ink = Ink.NORMAL, val scaleY: Double = 1.0) : Item

data class Line(val x1: Double, val y1: Double, val x2: Double, val y2: Double, val width: Double, override val ink: Ink = Ink.NORMAL) : Item

/** A filled polygon (beams). [points] = x0, y0, x1, y1, … */
data class Polygon(val points: List<Double>, override val ink: Ink = Ink.NORMAL) : Item

/** A tie: a filled crescent between two points, bulging by [bulge] (negative = upwards). */
data class Tie(val x1: Double, val y1: Double, val x2: Double, val y2: Double, val bulge: Double, val thickness: Double, override val ink: Ink = Ink.NORMAL) : Item

data class Text(val text: String, val x: Double, val y: Double, val size: Double, val style: TextStyle, val align: Align = Align.LEFT, override val ink: Ink = Ink.NORMAL) : Item

/** A rectangle that answers taps on a note. */
data class Hit(val eventId: Int, val x: Double, val y: Double, val w: Double, val h: Double)

class Page(val width: Double, val height: Double, val items: List<Item>, val hits: List<Hit>) {
    fun hitAt(x: Double, y: Double, slop: Double = 0.0): Int? =
        hits.filter { x >= it.x - slop && x <= it.x + it.w + slop && y >= it.y - slop && y <= it.y + it.h + slop }
            .minByOrNull { val cx = it.x + it.w / 2; val cy = it.y + it.h / 2; (cx - x) * (cx - x) + (cy - y) * (cy - y) }?.eventId
}

/** SMuFL code points used by the engraver (Bravura). */
object Smufl {
    const val BRACE = ''
    const val G_CLEF = ''
    const val F_CLEF = ''
    const val TIME_SIG_0 = ''
    const val NOTEHEAD_WHOLE = ''
    const val NOTEHEAD_HALF = ''
    const val NOTEHEAD_BLACK = ''
    const val DOT = ''
    const val FLAG_8_UP = ''
    const val FLAG_8_DOWN = ''
    const val FLAG_16_UP = ''
    const val FLAG_16_DOWN = ''
    const val FLAG_32_UP = ''
    const val FLAG_32_DOWN = ''
    const val FLAT = ''
    const val NATURAL = ''
    const val SHARP = ''
    const val DOUBLE_SHARP = ''
    const val DOUBLE_FLAT = ''
    const val REST_WHOLE = ''
    const val REST_HALF = ''
    const val REST_QUARTER = ''
    const val REST_8 = ''
    const val REST_16 = ''
    const val REST_32 = ''
    const val MET_QUARTER = ''
    const val TUPLET_3 = ''

    // widths in staff spaces (Bravura metadata)
    const val W_BLACK = 1.18
    const val W_WHOLE = 1.688
    const val W_SHARP = 0.996
    const val W_FLAT = 0.904
    const val W_NATURAL = 0.672
    const val W_G_CLEF = 2.684
    const val W_F_CLEF = 2.736
    const val W_TIME_DIGIT = 1.8

    fun accidental(alter: Int): Char = when (alter) { 2 -> DOUBLE_SHARP; 1 -> SHARP; -1 -> FLAT; -2 -> DOUBLE_FLAT; else -> NATURAL }
    fun accidentalWidth(alter: Int): Double = when (alter) { 1, 2 -> W_SHARP; -1, -2 -> W_FLAT * if (alter == -2) 1.7 else 1.0; else -> W_NATURAL }
}
