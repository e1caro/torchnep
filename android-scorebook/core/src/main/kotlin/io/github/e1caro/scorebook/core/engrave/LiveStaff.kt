package io.github.e1caro.scorebook.core.engrave

import io.github.e1caro.scorebook.core.correct.Hand
import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.music.Spelling
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

/** A note on the live staff: where it is in time, and how sure we are of it. */
data class LiveNote(val eventId: Int, val pitch: Int, val onset: Double, val offset: Double, val hand: Hand, val light: Boolean)

/**
 * The grand staff shown while playing: notes appear on the right as they are heard and scroll left, placed by
 * time (no bars yet — tempo and meter are decided when the take ends), spelled in the current key, with a faint
 * bar showing how long each note sounds.
 */
class LiveStaff(val staffSpace: Double = 10.0) {
    private val sp = staffSpace
    private val font = 4 * sp

    fun layout(notes: List<LiveNote>, key: Key, now: Double, width: Double, windowSeconds: Double = 8.0): Page {
        val items = ArrayList<Item>()
        val hits = ArrayList<Hit>()
        val trebleTop = 4.5 * sp
        val bassTop = trebleTop + 10 * sp
        val tops = listOf(trebleTop, bassTop)
        val x0 = 1.6 * sp
        for (t in tops) for (l in 0..4) items.add(Line(x0, t + l * sp, width, t + l * sp, 0.13 * sp, Ink.FAINT))
        items.add(Line(x0, trebleTop, x0, bassTop + 4 * sp, 0.16 * sp))
        val h = bassTop + 4 * sp - trebleTop
        items.add(Glyph(Smufl.BRACE, x0 - 0.33 * h / 4 - 0.35 * sp, bassTop + 4 * sp, h))
        items.add(Glyph(Smufl.G_CLEF, x0 + 0.6 * sp, trebleTop + 3 * sp, font))
        items.add(Glyph(Smufl.F_CLEF, x0 + 0.6 * sp, bassTop + 1 * sp, font))
        var x = x0 + 0.6 * sp + Smufl.W_F_CLEF * sp + 0.8 * sp
        val sharps = intArrayOf(38, 35, 39, 36, 33, 37, 34)
        val flats = intArrayOf(34, 37, 33, 36, 32, 35, 31)
        for (i in 0 until abs(key.fifths)) {
            for ((s, t) in tops.withIndex()) {
                val d = (if (key.fifths > 0) sharps[i] else flats[i]) - 14 * s
                items.add(Glyph(if (key.fifths > 0) Smufl.SHARP else Smufl.FLAT, x, y(t, s, d), font))
            }
            x += 1.05 * sp
        }
        val left = x + 1.5 * sp
        val right = width - 2.5 * sp
        val pxPerSec = (right - left) / windowSeconds
        val sigAlter = { step: Int ->
            val order = if (key.fifths > 0) intArrayOf(3, 0, 4, 1, 5, 2, 6) else intArrayOf(6, 2, 5, 1, 4, 0, 3)
            if (order.take(abs(key.fifths)).contains(step)) (if (key.fifths > 0) 1 else -1) else 0
        }
        for (n in notes) {
            if (n.offset < now - windowSeconds - 1) continue
            val staff = if (n.hand == Hand.RIGHT) 0 else 1
            val sp0 = Spelling.spell(n.pitch, key)
            val d = sp0.diatonic
            val nx = right - (now - n.onset) * pxPerSec
            if (nx < left - 2 * sp) continue
            val ny = y(tops[staff], staff, d)
            val ink = if (n.light) Ink.LIGHT else Ink.NORMAL
            // how long it sounds
            val endX = min(right + sp, right - (now - n.offset) * pxPerSec)
            if (endX > nx + Smufl.W_BLACK * sp) items.add(Polygon(listOf(nx + sp, ny - 0.18 * sp, endX, ny - 0.18 * sp, endX, ny + 0.18 * sp, nx + sp, ny + 0.18 * sp), Ink.FAINT))
            // ledger lines
            val topLine = if (staff == 0) 38 else 26
            var l = topLine + 2
            while (l <= d) { val yy = y(tops[staff], staff, l); items.add(Line(nx - 0.4 * sp, yy, nx + (Smufl.W_BLACK + 0.4) * sp, yy, 0.16 * sp)); l += 2 }
            l = topLine - 10
            while (l >= d) { val yy = y(tops[staff], staff, l); items.add(Line(nx - 0.4 * sp, yy, nx + (Smufl.W_BLACK + 0.4) * sp, yy, 0.16 * sp)); l -= 2 }
            if (sp0.alter != sigAlter(sp0.step)) items.add(Glyph(Smufl.accidental(sp0.alter), nx - 1.4 * sp, ny, font, ink))
            items.add(Glyph(Smufl.NOTEHEAD_BLACK, nx, ny, font, ink))
            hits.add(Hit(n.eventId, nx - 0.3 * sp, ny - 0.8 * sp, (Smufl.W_BLACK + 0.6) * sp, 1.6 * sp))
        }
        // "now" line
        items.add(Line(right + 1.2 * sp, trebleTop - 2 * sp, right + 1.2 * sp, bassTop + 6 * sp, 0.1 * sp, Ink.SELECTED))
        return Page(width, bassTop + 4 * sp + 4.0 * sp, items, hits)
    }

    private fun y(top: Double, staff: Int, d: Int) = top + ((if (staff == 0) 38 else 26) - d) * sp / 2

    companion object {
        /** Simple live hand split: right hand from middle C up, with the score's real split coming at the end. */
        fun handOf(pitch: Int): Hand = if (pitch >= 60) Hand.RIGHT else Hand.LEFT

        fun maxOf(a: Double, b: Double) = max(a, b)
    }
}
