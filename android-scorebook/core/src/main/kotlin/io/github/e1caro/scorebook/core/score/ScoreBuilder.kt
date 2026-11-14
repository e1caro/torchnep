package io.github.e1caro.scorebook.core.score

import io.github.e1caro.scorebook.core.correct.Hand
import io.github.e1caro.scorebook.core.correct.TNote
import io.github.e1caro.scorebook.core.correct.Transcription
import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.music.Mode
import io.github.e1caro.scorebook.core.music.Spelling
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

/**
 * Turns a transcription into measures: one voice per staff (right hand → treble, left hand → bass), chords for
 * notes struck together, legato durations cut at the next onset, ties across beats and bar lines, rests,
 * key signatures from the key regions (changes moved to bar lines), spelling in the local key, and accidentals
 * with per-bar memory.
 */
class ScoreBuilder {

    fun build(t: Transcription, title: String, subtitle: String = ""): Score {
        val grid = t.grid
        val barTicks = grid.barTicks
        val beatTicks = grid.beatTicks
        val notes = t.notes.map { if (it.tick < 0) it.copy(tick = 0) else it }
        val end = notes.maxOfOrNull { it.tick + max(it.duration, 6) } ?: barTicks
        val nMeasures = max(1, (end + barTicks - 1) / barTicks)
        val keys = measureKeys(t, nMeasures, barTicks)

        // per staff: groups of notes struck together, with their sounding length in the single voice
        val staffGroups = Hand.entries.map { hand -> groups(notes.filter { it.hand == hand }, nMeasures * barTicks, barTicks) }

        val measures = (0 until nMeasures).map { m ->
            val start = m * barTicks
            val staves = staffGroups.map { gs -> measureElements(gs, start, barTicks, beatTicks, keys[m], grid.compound) }
            val chords = t.chords.filter { it.chord != null && it.tick >= start && it.tick < start + barTicks }
                .map { ChordSymbol(snap(it.tick - start, beatTicks / 2), it.chord!!.label(keys[m])) }
            Measure(m + 1, start, barTicks, keys[m], m == 0 || keys[m] != keys[m - 1], staves, chords)
        }
        // drop repeated chord labels (same chord continuing into the next bar is not reprinted)
        var last: String? = null
        val cleaned = measures.map { ms ->
            val cs = ms.chords.filter { c -> (c.label != last).also { if (it) last = c.label } }
            ms.copy(chords = cs)
        }
        return Score(title, subtitle, grid.beatsPerBar, grid.numerator, grid.denominator, grid.compound, t.bpm, cleaned)
    }

    private fun snap(v: Int, q: Int) = (v + q / 2) / q * q

    /** Key per measure: each key region starts at the nearest sensible bar line. */
    private fun measureKeys(t: Transcription, n: Int, barTicks: Int): List<Key> {
        val changes = t.keyChanges()
        val out = MutableList(n) { changes.firstOrNull()?.key ?: Key(0, Mode.MAJOR) }
        for (c in changes.drop(1)) {
            val bar = c.tick / barTicks
            val within = c.tick - bar * barTicks
            val startBar = (if (within * 2 >= barTicks) bar + 1 else bar).coerceIn(0, n)
            for (m in startBar until n) out[m] = c.key
        }
        return out
    }

    private class Group(val tick: Int, var length: Int, val notes: List<TNote>)

    private fun groups(notes: List<TNote>, endTick: Int, barTicks: Int): List<Group> {
        val byTick = notes.groupBy { it.tick }.toSortedMap()
        val ticks = byTick.keys.toList()
        return ticks.mapIndexed { i, tk ->
            val ns = byTick[tk]!!.distinctBy { it.pitch }.sortedBy { it.pitch }
            val next = ticks.getOrNull(i + 1) ?: endTick
            var len = ns.maxOf { it.duration }.coerceAtLeast(6)
            // Legato: a note lasts until the next note of the same hand. Piano note endings heard by the model are
            // unreliable (high notes fade fast, the pedal blurs them), so a rest is only written when the next note
            // is more than a bar away; then the note keeps its own (snapped) length.
            if (next - tk <= barTicks || len >= next - tk) len = next - tk
            Group(tk, min(len, endTick - tk), ns)
        }
    }

    private fun measureElements(groups: List<Group>, start: Int, barTicks: Int, beatTicks: Int, key: Key, compound: Boolean): List<Element> {
        val end = start + barTicks
        val out = ArrayList<Element>()
        var pos = 0 // within the measure
        val alters = HashMap<Int, Int>() // diatonic index -> alteration in force in this bar
        fun sigAlter(step: Int): Int {
            val sharps = intArrayOf(3, 0, 4, 1, 5, 2, 6) // F C G D A E B
            val flats = intArrayOf(6, 2, 5, 1, 4, 0, 3) // B E A D G C F
            return when {
                key.fifths > 0 && sharps.take(key.fifths).contains(step) -> 1
                key.fifths < 0 && flats.take(-key.fifths).contains(step) -> -1
                else -> 0
            }
        }
        fun rest(from: Int, to: Int) {
            if (to <= from) return
            if (from == 0 && to == barTicks && out.isEmpty()) { out.add(RestElement(0, WrittenDuration(NoteType.WHOLE), wholeMeasure = true)); return }
            for ((p, d) in split(from, to - from, barTicks, beatTicks, compound)) out.add(RestElement(p, d))
        }
        val relevant = groups.filter { it.tick < end && it.tick + it.length > start }
        for ((gi, g) in relevant.withIndex()) {
            val gStart = max(g.tick, start) - start
            val gEnd = min(g.tick + g.length, end) - start
            if (gStart > pos) rest(pos, gStart)
            if (gEnd <= pos) continue
            val continuesFromPrevBar = g.tick < start
            val continuesToNextBar = g.tick + g.length > end
            // spelling direction from the melody: top note to the next group's top note
            val nextTop = relevant.getOrNull(gi + 1)?.notes?.maxOf { it.pitch }
            val top = g.notes.maxOf { it.pitch }
            val dir = if (nextTop != null && abs(nextTop - top) in 1..2) Integer.signum(nextTop - top) else 0
            val pieces = split(max(gStart, pos), gEnd - max(gStart, pos), barTicks, beatTicks, compound)
            pieces.forEachIndexed { pi, (p, d) ->
                val tieFrom = pi > 0 || continuesFromPrevBar
                val tieTo = pi < pieces.size - 1 || continuesToNextBar
                val sn = g.notes.map { n ->
                    val sp = Spelling.spell(n.pitch, key, if (n.pitch == top) dir else 0)
                    val current = alters[sp.diatonic] ?: sigAlter(sp.step)
                    val acc = if (!tieFrom && sp.alter != current) sp.alter else null
                    alters[sp.diatonic] = sp.alter
                    ScoreNote(n.pitch, sp, n.eventId, n.decision.name == "CONTEXT" || n.decision.name == "UNSURE", tieTo, tieFrom, acc)
                }
                out.add(ChordElement(p, d, sn))
            }
            pos = gEnd
        }
        rest(pos, barTicks)
        return out
    }

    companion object {
        /**
         * Cuts a duration at [pos] (ticks from the bar line) into drawable values that respect the beat:
         * values shorter than a beat stay inside it, longer ones start on a beat, and in 4/4 nothing but a
         * whole note crosses the middle of the bar.
         */
        fun split(pos: Int, length: Int, barTicks: Int, beatTicks: Int, compound: Boolean): List<Pair<Int, WrittenDuration>> {
            val out = ArrayList<Pair<Int, WrittenDuration>>()
            var p = pos
            var left = length
            var guard = 0
            while (left >= 6 && guard++ < 64) {
                val inBeat = p % beatTicks
                val choice = WrittenDuration.ALL.firstOrNull { d ->
                    val v = d.ticks
                    if (v > left || p + v > barTicks) return@firstOrNull false
                    if (d.triplet && (compound || (inBeat + v > beatTicks))) return@firstOrNull false
                    if (compound && d.dots == 0 && v >= beatTicks && v % beatTicks != 0) return@firstOrNull false
                    if (v < beatTicks) {
                        if (inBeat + v > beatTicks) return@firstOrNull false
                        val unit = if (d.dots > 0) v / 3 else if (d.triplet) v / 2 else v
                        inBeat % unit == 0
                    } else {
                        if (inBeat != 0) return@firstOrNull false
                        val halfBar = barTicks / 2
                        val fourFour = !compound && barTicks == beatTicks * 4
                        !(fourFour && v < barTicks && p < halfBar && p + v > halfBar)
                    }
                } ?: WrittenDuration.ALL.firstOrNull { it.ticks <= left && p + it.ticks <= barTicks } ?: break
                out.add(p to choice)
                p += choice.ticks
                left -= choice.ticks
            }
            return out
        }
    }
}
