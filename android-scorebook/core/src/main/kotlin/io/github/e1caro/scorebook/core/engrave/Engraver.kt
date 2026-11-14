package io.github.e1caro.scorebook.core.engrave

import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.score.ChordElement
import io.github.e1caro.scorebook.core.score.Element
import io.github.e1caro.scorebook.core.score.Measure
import io.github.e1caro.scorebook.core.score.NoteType
import io.github.e1caro.scorebook.core.score.RestElement
import io.github.e1caro.scorebook.core.score.Score
import io.github.e1caro.scorebook.core.score.ScoreNote
import kotlin.math.abs
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min

data class EngraveStyle(
    /** Distance between two staff lines, in page units (points in a PDF). 7 pt is a large, readable score. */
    val staffSpace: Double = 7.0,
    val margin: Double = 40.0,
    /** Extra space between systems, in staff spaces. */
    val systemGap: Double = 3.0,
    val title: Boolean = true,
)

/**
 * Lays out a [Score] as a grand staff: spacing proportional to log-duration with columns shared by both hands,
 * greedy line breaking with justification, then glyphs, stems, beams, flags, ledger lines, accidentals, dots,
 * ties, rests, clefs, key and time signatures, chord symbols and measure numbers.
 */
class Engraver(val style: EngraveStyle = EngraveStyle()) {
    private val sp = style.staffSpace
    private val font = 4 * sp

    /** Pages of the given size (PDF). */
    fun pages(score: Score, width: Double, height: Double): List<Page> = render(score, width, height)

    /** One page as tall as needed (screen). */
    fun continuous(score: Score, width: Double): Page = render(score, width, null).first()

    // ---------------------------------------------------------------- measure geometry

    private class Column(val tick: Int, val width: Double, val pad: Double) { var x = 0.0 }

    private inner class MeasureBox(val m: Measure, val keyPrefix: Double, val columns: List<Column>) {
        val leftPad = 1.3 * sp
        val natural: Double get() = keyPrefix + leftPad + columns.sumOf { it.width + it.pad } + 0.4 * sp
        var x = 0.0
        var width = 0.0
        fun place(stretch: Double) {
            var cx = keyPrefix + leftPad
            for (c in columns) { cx += c.pad; c.x = cx; cx += c.width * stretch }
            width = cx + 0.4 * sp
        }
        fun xOfTick(tick: Int): Double {
            val c = columns.lastOrNull { it.tick <= tick } ?: return x + keyPrefix + leftPad
            val next = columns.firstOrNull { it.tick > tick }
            val nx = next?.x ?: (width - 0.4 * sp)
            val ntick = next?.tick ?: m.ticks
            return x + c.x + (nx - c.x) * (tick - c.tick).toDouble() / max(1, ntick - c.tick)
        }
    }

    private fun measureBox(m: Measure, prevKey: Key?, atSystemStart: Boolean): MeasureBox {
        val ticks = (m.staves.flatMap { s -> s.map { it.tick } } + 0).distinct().sorted()
        val columns = ticks.mapIndexed { i, t ->
            val next = ticks.getOrNull(i + 1) ?: m.ticks
            val d = (next - t).coerceAtLeast(6)
            var w = sp * (1.25 + 1.05 * ln(d / 12.0 + 1) / ln(2.0))
            var pad = 0.0
            for (st in m.staves) for (e in st) if (e.tick == t && e is ChordElement) {
                val accs = e.notes.count { it.accidental != null }
                if (accs > 0) pad = max(pad, (if (accs > 1) 2.4 else 1.35) * sp)
                if (e.duration.dots > 0) w += 0.7 * sp
                if (hasSecond(e.notes)) w += 1.1 * sp
            }
            Column(t, w, pad)
        }
        val prefix = if (m.keyChange && !atSystemStart && prevKey != null) keySigWidth(m.key, prevKey) + 1.0 * sp else 0.0
        return MeasureBox(m, prefix, columns)
    }

    private fun hasSecond(notes: List<ScoreNote>): Boolean {
        val d = notes.map { it.pitch.diatonic }.sorted()
        return d.zipWithNext().any { (a, b) -> b - a == 1 }
    }

    private fun keySigWidth(key: Key, cancel: Key? = null): Double {
        val n = abs(key.fifths)
        val cancelN = if (cancel != null && key.fifths == 0) abs(cancel.fifths) else 0
        return (n + cancelN) * 1.05 * sp + if (n + cancelN > 0) 0.6 * sp else 0.0
    }

    private fun headerWidth(key: Key, withTime: Boolean, score: Score): Double =
        0.6 * sp + Smufl.W_F_CLEF * sp + 0.8 * sp + keySigWidth(key) +
            (if (withTime) (max(score.numerator.toString().length, score.denominator.toString().length) * Smufl.W_TIME_DIGIT + 1.0) * sp else 0.0)

    // ---------------------------------------------------------------- systems and pages

    private class SystemPlan(val boxes: List<MeasureBox>, val header: Double, val first: Boolean)

    private fun render(score: Score, width: Double, pageHeight: Double?): List<Page> {
        val x0 = style.margin + 1.6 * sp
        val avail = width - style.margin - x0
        // line breaking
        val systems = ArrayList<SystemPlan>()
        var i = 0
        while (i < score.measures.size) {
            val first = systems.isEmpty()
            val key = score.measures[i].key
            val header = headerWidth(key, first, score)
            val boxes = ArrayList<MeasureBox>()
            var used = header
            while (i < score.measures.size) {
                val b = measureBox(score.measures[i], score.measures.getOrNull(i - 1)?.key, boxes.isEmpty())
                if (boxes.isNotEmpty() && used + b.natural > avail) break
                boxes.add(b); used += b.natural; i++
            }
            systems.add(SystemPlan(boxes, header, first))
        }
        // vertical extents per system (in staff spaces)
        data class VBox(val above: Double, val gap: Double, val below: Double) { val total get() = above + 4 + gap + 4 + below }
        val vboxes = systems.map { sys ->
            val treble = sys.boxes.flatMap { b -> b.m.staves[0].filterIsInstance<ChordElement>().flatMap { e -> e.notes.map { it.pitch.diatonic } } }
            val bass = sys.boxes.flatMap { b -> b.m.staves[1].filterIsInstance<ChordElement>().flatMap { e -> e.notes.map { it.pitch.diatonic } } }
            val chords = sys.boxes.any { it.m.chords.isNotEmpty() }
            val above = max(4.0, ((treble.maxOrNull() ?: 38) - 38) / 2.0 + 3.0) + if (chords) 2.6 else 0.0
            val gap = max(6.5, max(0.0, (30 - (treble.minOrNull() ?: 30)) / 2.0) + max(0.0, ((bass.maxOrNull() ?: 26) - 26) / 2.0) + 3.5)
            val below = max(3.5, ((18 - (bass.minOrNull() ?: 18)) / 2.0) + 3.0)
            VBox(above, gap, below)
        }
        // pagination
        val titleH = if (style.title) 9.0 * sp else 0.0
        val pages = ArrayList<MutableList<Int>>()
        var y = style.margin + titleH
        var cur = ArrayList<Int>()
        for ((si, vb) in vboxes.withIndex()) {
            val h = (vb.total + style.systemGap) * sp
            if (pageHeight != null && cur.isNotEmpty() && y + h > pageHeight - style.margin) { pages.add(cur); cur = ArrayList(); y = style.margin }
            cur.add(si); y += h
        }
        pages.add(cur)
        val out = ArrayList<Page>()
        val ties = TieState()
        for ((pi, sysIdx) in pages.withIndex()) {
            val items = ArrayList<Item>()
            val hits = ArrayList<Hit>()
            var yy = style.margin
            if (pi == 0 && style.title) { drawTitle(score, width, items); yy += titleH }
            for (si in sysIdx) {
                val vb = vboxes[si]
                val sys = systems[si]
                val last = si == systems.size - 1
                val natural = sys.header + sys.boxes.sumOf { it.natural }
                val fillable = sys.boxes.sumOf { b -> b.columns.sumOf { it.width } }
                val extra = avail - natural
                val stretch = if (last && natural < 0.75 * avail) 1.0 else 1.0 + extra / max(1.0, fillable)
                var x = x0 + sys.header
                for (b in sys.boxes) { b.place(stretch); b.x = x; x += b.width }
                val top = yy + vb.above * sp
                drawSystem(score, sys, x0, x, top, top + (4 + vb.gap) * sp, si == 0, last, items, hits, ties)
                yy += (vb.total + style.systemGap) * sp
            }
            out.add(Page(width, pageHeight ?: (yy + style.margin), items, hits))
        }
        return out
    }

    private fun drawTitle(score: Score, width: Double, items: MutableList<Item>) {
        items.add(Text(score.title, width / 2, style.margin + 3.6 * sp, 3.4 * sp, TextStyle.TITLE, Align.CENTER))
        if (score.subtitle.isNotEmpty()) items.add(Text(score.subtitle, width / 2, style.margin + 6.0 * sp, 1.7 * sp, TextStyle.SUBTITLE, Align.CENTER, Ink.FAINT))
    }

    // ---------------------------------------------------------------- drawing

    private class PendingTie(val x: Double, val y: Double, val below: Boolean, val light: Boolean)

    private class TieState { val pending = HashMap<Pair<Int, Int>, PendingTie>() } // (staff, midi) -> start

    private fun staffY(top: Double, staff: Int, d: Int): Double = top + ((if (staff == 0) 38 else 26) - d) * sp / 2

    private fun drawSystem(
        score: Score, sys: SystemPlan, x0: Double, xEnd: Double, trebleTop: Double, bassTop: Double, first: Boolean, last: Boolean,
        items: MutableList<Item>, hits: MutableList<Hit>, ties: TieState,
    ) {
        val tops = listOf(trebleTop, bassTop)
        val lineW = 0.13 * sp
        for (t in tops) for (l in 0..4) items.add(Line(x0, t + l * sp, xEnd, t + l * sp, lineW, Ink.FAINT))
        val bottom = bassTop + 4 * sp
        items.add(Line(x0, trebleTop, x0, bottom, 0.16 * sp))
        // brace
        val h = bottom - trebleTop
        items.add(Glyph(Smufl.BRACE, x0 - 0.33 * h / 4 - 0.35 * sp, bottom, h))
        // clefs, key, time
        var x = x0 + 0.6 * sp
        items.add(Glyph(Smufl.G_CLEF, x, trebleTop + 3 * sp, font))
        items.add(Glyph(Smufl.F_CLEF, x, bassTop + 1 * sp, font))
        x += Smufl.W_F_CLEF * sp + 0.8 * sp
        val key = sys.boxes.first().m.key
        x = drawKeySig(key, null, x, tops, items)
        if (sys.first) {
            val digits = listOf(score.numerator.toString(), score.denominator.toString())
            val w = digits.maxOf { it.length } * Smufl.W_TIME_DIGIT * sp
            for (t in tops) {
                for ((row, s) in digits.withIndex()) {
                    var dx = x + (w - s.length * Smufl.W_TIME_DIGIT * sp) / 2
                    for (ch in s) { items.add(Glyph((Smufl.TIME_SIG_0.code + (ch - '0')).toChar(), dx, t + (if (row == 0) 1 else 3) * sp, font)); dx += Smufl.W_TIME_DIGIT * sp }
                }
            }
        }
        // measure number
        val firstNo = sys.boxes.first().m.number
        if (firstNo > 1) items.add(Text("$firstNo", x0, trebleTop - 1.6 * sp, 1.3 * sp, TextStyle.MEASURE_NUMBER))
        // half-ties continuing from the previous system
        val continuing = ties.pending.toMap()
        ties.pending.clear()
        for ((bi, b) in sys.boxes.withIndex()) {
            val m = b.m
            if (b.keyPrefix > 0) {
                val prevKey = sys.boxes.getOrNull(bi - 1)?.m?.key ?: key
                drawKeySig(m.key, prevKey, b.x + 0.6 * sp, tops, items)
            }
            for (staff in 0..1) drawStaff(score, m, b, staff, tops[staff], items, hits, ties, continuing, x0 + sys.header)
            // chord symbols
            for (c in m.chords) items.add(Text(c.label, b.xOfTick(c.tick), trebleTop - (if (chordLift(m) > 0) chordLift(m) else 0.0) - 2.4 * sp, 1.75 * sp, TextStyle.CHORD))
            // bar line (double before a key change, final at the end)
            val bx = b.x + b.width
            val nextKeyChange = sys.boxes.getOrNull(bi + 1)?.m?.keyChange == true
            if (last && bi == sys.boxes.size - 1) {
                items.add(Line(bx - 0.9 * sp, trebleTop, bx - 0.9 * sp, bottom, 0.16 * sp))
                items.add(Line(bx - 0.25 * sp, trebleTop, bx - 0.25 * sp, bottom, 0.5 * sp))
            } else {
                items.add(Line(bx, trebleTop, bx, bottom, 0.16 * sp))
                if (nextKeyChange) items.add(Line(bx - 0.4 * sp, trebleTop, bx - 0.4 * sp, bottom, 0.16 * sp))
            }
        }
        // ties that go on into the next system: draw to the end of this one
        for ((_, p) in ties.pending) {
            items.add(Tie(p.x, p.y, xEnd - 0.2 * sp, p.y, (if (p.below) 1 else -1) * 0.6 * sp, 0.18 * sp, if (p.light) Ink.LIGHT else Ink.NORMAL))
        }
    }

    /** How far chord symbols must be lifted above the default position, for high notes in the measure. */
    private fun chordLift(m: Measure): Double {
        val top = m.staves[0].filterIsInstance<ChordElement>().flatMap { e -> e.notes.map { it.pitch.diatonic } }.maxOrNull() ?: return 0.0
        return max(0.0, (top - 38) / 2.0 + 1.5) * sp
    }

    private val SHARP_POS = intArrayOf(38, 35, 39, 36, 33, 37, 34) // treble: F5 C5 G5 D5 A4 E5 B4
    private val FLAT_POS = intArrayOf(34, 37, 33, 36, 32, 35, 31) // treble: B4 E5 A4 D5 G4 C5 F4

    /** Draws a key signature (with naturals when cancelling to C major / A minor); returns the x after it. */
    private fun drawKeySig(key: Key, cancel: Key?, xStart: Double, tops: List<Double>, items: MutableList<Item>): Double {
        var x = xStart
        val n = key.fifths
        if (n == 0 && cancel != null && cancel.fifths != 0) {
            val pos = if (cancel.fifths > 0) SHARP_POS else FLAT_POS
            for (i in 0 until abs(cancel.fifths)) {
                for ((s, t) in tops.withIndex()) items.add(Glyph(Smufl.NATURAL, x, staffY(t, s, pos[i] - 14 * s), font))
                x += 1.05 * sp
            }
        }
        val pos = if (n > 0) SHARP_POS else FLAT_POS
        for (i in 0 until abs(n)) {
            for ((s, t) in tops.withIndex()) items.add(Glyph(if (n > 0) Smufl.SHARP else Smufl.FLAT, x, staffY(t, s, pos[i] - 14 * s), font))
            x += 1.05 * sp
        }
        return x + if (n != 0) 0.6 * sp else 0.0
    }

    private fun drawStaff(
        score: Score, m: Measure, b: MeasureBox, staff: Int, top: Double, items: MutableList<Item>, hits: MutableList<Hit>,
        ties: TieState, continuing: Map<Pair<Int, Int>, PendingTie>, systemStartX: Double,
    ) {
        val elements = m.staves[staff]
        val mid = if (staff == 0) 34 else 22
        // beam groups: consecutive flagged chords within one beat
        val groups = ArrayList<List<ChordElement>>()
        var cur = ArrayList<ChordElement>()
        fun flush() { if (cur.size >= 2) groups.add(cur); cur = ArrayList() }
        for (e in elements) {
            if (e is ChordElement && e.duration.type.flags > 0 && (cur.isEmpty() || cur.first().tick / score.beatTicks == e.tick / score.beatTicks)) cur.add(e)
            else { flush(); if (e is ChordElement && e.duration.type.flags > 0) cur.add(e) }
        }
        flush()
        val beamOf = HashMap<ChordElement, List<ChordElement>>()
        for (g in groups) for (e in g) beamOf[e] = g

        val stemUp = HashMap<ChordElement, Boolean>()
        for (e in elements.filterIsInstance<ChordElement>()) {
            val group = beamOf[e] ?: listOf(e)
            val ds = group.flatMap { c -> c.notes.map { it.pitch.diatonic } }
            stemUp[e] = (ds.max() - mid) <= (mid - ds.min())
        }
        // beam lines: y = c + s * (x - x0) for each group
        val beamLine = HashMap<List<ChordElement>, Pair<Double, Double>>() // (c at first x, slope)
        val headX = { e: Element -> b.x + (b.columns.first { it.tick == e.tick }.x) }
        for (g in groups) {
            val up = stemUp[g.first()]!!
            val xs = g.map { headX(it) + if (up) Smufl.W_BLACK * sp else 0.0 }
            val ends = g.map { c -> c.notes.map { staffY(top, staff, it.pitch.diatonic) }.let { if (up) it.min() else it.max() } }
            val dx = (xs.last() - xs.first()).coerceAtLeast(1.0)
            val slope = ((ends.last() - ends.first()) / dx * 0.5).coerceIn(-0.25, 0.25)
            val minLen = 3.25 * sp + (g.maxOf { it.duration.type.flags } - 1) * 0.75 * sp
            val c = if (up) g.indices.minOf { ends[it] - minLen - slope * (xs[it] - xs.first()) }
            else g.indices.maxOf { ends[it] + minLen - slope * (xs[it] - xs.first()) }
            beamLine[g] = c to slope
        }

        for (e in elements) {
            val x = headX(e)
            when (e) {
                is RestElement -> drawRest(e, b, x, top, staff, items)
                is ChordElement -> {
                    val up = stemUp[e]!!
                    val group = beamOf[e]
                    val beamY = group?.let { g ->
                        val (c, s) = beamLine[g]!!
                        val gx0 = headX(g.first()) + if (up) Smufl.W_BLACK * sp else 0.0
                        val sx = x + if (up) Smufl.W_BLACK * sp else 0.0
                        c + s * (sx - gx0)
                    }
                    drawChord(e, x, top, staff, up, beamY, items, hits, ties, continuing, systemStartX)
                }
            }
        }
        // beams
        for (g in groups) {
            val up = stemUp[g.first()]!!
            val (c, s) = beamLine[g]!!
            val ink = if (g.all { e -> e.notes.all { it.light } }) Ink.LIGHT else Ink.NORMAL
            val xs = g.map { headX(it) + if (up) Smufl.W_BLACK * sp - 0.06 * sp else 0.06 * sp }
            val gx0 = headX(g.first()) + if (up) Smufl.W_BLACK * sp else 0.0
            fun yAt(xx: Double) = c + s * (xx - gx0)
            val th = 0.5 * sp
            val step = 0.75 * sp * (if (up) 1 else -1)
            val maxLevel = g.maxOf { it.duration.type.flags }
            for (level in 1..maxLevel) {
                val off = (level - 1) * step
                var i = 0
                while (i < g.size) {
                    if (g[i].duration.type.flags < level) { i++; continue }
                    var j = i
                    while (j + 1 < g.size && g[j + 1].duration.type.flags >= level) j++
                    var xa = xs[i]; var xb = xs[j]
                    if (i == j) { // partial beam towards the neighbour
                        if (level == 1) { i++; continue }
                        if (i > 0) { xb = xa; xa -= 1.1 * sp } else xb = xa + 1.1 * sp
                    }
                    val ya = yAt(xa) + off; val yb = yAt(xb) + off
                    val t = if (up) th else -th
                    items.add(Polygon(listOf(xa, ya, xb, yb, xb, yb + t, xa, ya + t), ink))
                    i = j + 1
                }
            }
        }
        // triplet marks: one "3" per beat that holds triplet values
        val triplets = elements.filter { it.duration.triplet }.groupBy { it.tick / score.beatTicks }
        for ((_, es) in triplets) {
            val chords = es.filterIsInstance<ChordElement>()
            val up = chords.firstOrNull()?.let { stemUp[it] } ?: true
            val xa = headX(es.first()); val xb = headX(es.last()) + Smufl.W_BLACK * sp
            val ys = chords.flatMap { c -> c.notes.map { staffY(top, staff, it.pitch.diatonic) } }
            val y = if (up) (ys.minOrNull() ?: top) - 4.6 * sp else (ys.maxOrNull() ?: (top + 4 * sp)) + 5.4 * sp
            items.add(Text("3", (xa + xb) / 2, y, 1.4 * sp, TextStyle.TUPLET, Align.CENTER))
        }
    }

    private fun drawRest(e: RestElement, b: MeasureBox, x: Double, top: Double, staff: Int, items: MutableList<Item>) {
        val mid = if (staff == 0) 34 else 22
        if (e.wholeMeasure) {
            val cx = b.x + b.keyPrefix + (b.width - b.keyPrefix) / 2 - 0.56 * sp
            items.add(Glyph(Smufl.REST_WHOLE, cx, staffY(top, staff, mid + 2), font, Ink.NORMAL))
            return
        }
        val (glyph, d) = when (e.duration.type) {
            NoteType.WHOLE -> Smufl.REST_WHOLE to mid + 2
            NoteType.HALF -> Smufl.REST_HALF to mid
            NoteType.QUARTER -> Smufl.REST_QUARTER to mid
            NoteType.EIGHTH -> Smufl.REST_8 to mid
            NoteType.SIXTEENTH -> Smufl.REST_16 to mid
            NoteType.THIRTY_SECOND -> Smufl.REST_32 to mid
        }
        items.add(Glyph(glyph, x, staffY(top, staff, d), font))
        if (e.duration.dots > 0) items.add(Glyph(Smufl.DOT, x + 1.5 * sp, staffY(top, staff, d) - 0.5 * sp, font))
    }

    private fun drawChord(
        e: ChordElement, x: Double, top: Double, staff: Int, up: Boolean, beamY: Double?, items: MutableList<Item>, hits: MutableList<Hit>,
        ties: TieState, continuing: Map<Pair<Int, Int>, PendingTie>, systemStartX: Double,
    ) {
        val type = e.duration.type
        val head = when (type) { NoteType.WHOLE -> Smufl.NOTEHEAD_WHOLE; NoteType.HALF -> Smufl.NOTEHEAD_HALF; else -> Smufl.NOTEHEAD_BLACK }
        val w = (if (type == NoteType.WHOLE) Smufl.W_WHOLE else Smufl.W_BLACK) * sp
        val notes = e.notes.sortedBy { it.pitch.diatonic }
        // seconds: alternate heads to the other side of the stem
        val shift = DoubleArray(notes.size)
        if (up) {
            for (i in 1 until notes.size) if (notes[i].pitch.diatonic - notes[i - 1].pitch.diatonic == 1 && shift[i - 1] == 0.0) shift[i] = w - 0.06 * sp
        } else {
            for (i in notes.size - 2 downTo 0) if (notes[i + 1].pitch.diatonic - notes[i].pitch.diatonic == 1 && shift[i + 1] == 0.0) shift[i] = -(w - 0.06 * sp)
        }
        val ys = notes.map { staffY(top, staff, it.pitch.diatonic) }
        val allLight = notes.all { it.light }
        val stemInk = if (allLight) Ink.LIGHT else Ink.NORMAL
        // ledger lines
        val topLine = if (staff == 0) 38 else 26
        val bottomLine = topLine - 8
        val ledgerX1 = x - 0.4 * sp + min(0.0, shift.minOrNull() ?: 0.0)
        val ledgerX2 = x + w + 0.4 * sp + max(0.0, shift.maxOrNull() ?: 0.0)
        val dMax = notes.last().pitch.diatonic
        val dMin = notes.first().pitch.diatonic
        var d = topLine + 2
        while (d <= dMax) { val y = staffY(top, staff, d); items.add(Line(ledgerX1, y, ledgerX2, y, 0.16 * sp)); d += 2 }
        d = bottomLine - 2
        while (d >= dMin) { val y = staffY(top, staff, d); items.add(Line(ledgerX1, y, ledgerX2, y, 0.16 * sp)); d -= 2 }
        // accidentals, stacked in columns when close
        val accCols = ArrayList<MutableList<Int>>()
        val leftmost = x + min(0.0, shift.minOrNull() ?: 0.0)
        for (i in notes.indices.reversed()) {
            val n = notes[i]
            val alter = n.accidental ?: continue
            var col = 0
            while (col < accCols.size && accCols[col].any { abs(it - n.pitch.diatonic) < 6 }) col++
            if (col == accCols.size) accCols.add(ArrayList())
            accCols[col].add(n.pitch.diatonic)
            val ax = leftmost - 0.2 * sp - (col + 1) * 1.15 * sp + (1.15 * sp - Smufl.accidentalWidth(alter) * sp)
            items.add(Glyph(Smufl.accidental(alter), ax, ys[i], font, if (n.light) Ink.LIGHT else Ink.NORMAL))
        }
        // heads, dots, hit boxes, ties
        for ((i, n) in notes.withIndex()) {
            val hx = x + shift[i]
            val ink = if (n.light) Ink.LIGHT else Ink.NORMAL
            items.add(Glyph(head, hx, ys[i], font, ink))
            hits.add(Hit(n.eventId, hx - 0.3 * sp, ys[i] - 0.8 * sp, w + 0.6 * sp, 1.6 * sp))
            if (e.duration.dots > 0) {
                val onLine = Math.floorMod(n.pitch.diatonic - bottomLine, 2) == 0
                val dx = x + w + max(0.0, shift.maxOrNull() ?: 0.0) + 0.45 * sp
                for (k in 0 until e.duration.dots) items.add(Glyph(Smufl.DOT, dx + k * 0.6 * sp, ys[i] - if (onLine) 0.5 * sp else 0.0, font, ink))
            }
            val tieBelow = if (notes.size == 1) up else i < notes.size / 2
            val key = staff to n.midi
            if (n.tieFromPrev) {
                val p = ties.pending.remove(key)
                if (p != null) items.add(Tie(p.x, p.y, hx - 0.15 * sp, ys[i], (if (p.below) 1 else -1) * 0.6 * sp, 0.18 * sp, ink))
                else continuing[key]?.let { items.add(Tie(systemStartX - 1.2 * sp, ys[i], hx - 0.15 * sp, ys[i], (if (it.below) 1 else -1) * 0.6 * sp, 0.18 * sp, ink)) }
            }
            if (n.tieToNext) ties.pending[key] = PendingTie(hx + w + 0.15 * sp, ys[i], tieBelow, n.light)
        }
        if (type == NoteType.WHOLE) return
        // stem
        val stemX = if (up) x + Smufl.W_BLACK * sp - 0.06 * sp else x + 0.06 * sp
        val midY = staffY(top, staff, if (staff == 0) 34 else 22)
        val yStart = if (up) ys.max() - 0.168 * sp else ys.min() + 0.168 * sp
        var yEnd = beamY ?: if (up) min(ys.min() - 3.5 * sp, midY) else max(ys.max() + 3.5 * sp, midY)
        if (beamY == null && type.flags >= 2) yEnd += (if (up) -1 else 1) * (type.flags - 1) * 0.5 * sp
        items.add(Line(stemX, yStart, stemX, yEnd, 0.12 * sp, stemInk))
        if (beamY == null && type.flags > 0) {
            val flag = when (type.flags) { 1 -> if (up) Smufl.FLAG_8_UP else Smufl.FLAG_8_DOWN; 2 -> if (up) Smufl.FLAG_16_UP else Smufl.FLAG_16_DOWN; else -> if (up) Smufl.FLAG_32_UP else Smufl.FLAG_32_DOWN }
            items.add(Glyph(flag, stemX - 0.06 * sp, yEnd + (if (up) -0.04 else 0.13) * sp, font, stemInk))
        }
    }
}
