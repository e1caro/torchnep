package io.github.e1caro.scorebook.core

import io.github.e1caro.scorebook.core.analysis.RhythmNet
import io.github.e1caro.scorebook.core.correct.AnalysisSettings
import io.github.e1caro.scorebook.core.correct.Hand
import io.github.e1caro.scorebook.core.correct.Transcriber
import io.github.e1caro.scorebook.core.correct.Transcription
import io.github.e1caro.scorebook.core.transcribe.NoteEvent
import org.junit.Test
import java.io.File
import kotlin.math.abs
import kotlin.math.min

/**
 * Scorebook against the sheet music of classical pieces: runs the musical analysis on the notes of real
 * performances (prepared by tools/asap_prepare.py from the ASAP dataset; nothing of it is in this repository) and
 * compares what would be written with what the score says.
 *
 * Runs only when SCOREBOOK_ASAP_DIR points to the prepared files. SCOREBOOK_ASAP_SPLIT = tune | held | all
 * (default held), SCOREBOOK_ASAP_LIMIT = number of performances, SCOREBOOK_ASAP_EVERY = take every n-th.
 */
object Asap {
    class Note(val on: Double, val off: Double, val pedalOff: Double, val pitch: Int, val vel: Int, val staff: Int, val bar: Int, val pos: Double, val dur: Double)
    class TimeSig(val time: Double, val num: Int, val den: Int, val beatsPerBar: Int) {
        val quarters: Double get() = num * 4.0 / den
        val compound: Boolean get() = num % 3 == 0 && num > 3 && beatsPerBar == num / 3
    }
    class KeySig(val time: Double, val fifths: Int)
    class Perf(val name: String, val composer: String, val title: String, val split: String) {
        val notes = ArrayList<Note>()
        val beats = ArrayList<Double>()
        val downbeats = ArrayList<Double>()
        val timeSigs = ArrayList<TimeSig>()
        val keySigs = ArrayList<KeySig>()
        val end: Double get() = notes.maxOf { it.on }
        fun timeSigAt(t: Double): TimeSig = timeSigs.lastOrNull { it.time <= t + 1e-6 } ?: timeSigs.first()
        /** The time signature (or key signature) most of the piece is in. */
        fun <T> main(items: List<T>, time: (T) -> Double, key: (T) -> Any): T {
            val span = HashMap<Any, Double>()
            for ((i, it) in items.withIndex()) span.merge(key(it), (items.getOrNull(i + 1)?.let(time) ?: end) - time(it), Double::plus)
            val best = span.maxByOrNull { it.value }!!.key
            return items.first { key(it) == best }
        }
    }

    fun load(dir: File, split: String, every: Int = 1, limit: Int = Int.MAX_VALUE): List<Perf> {
        val rows = File(dir, "index.tsv").readLines().drop(1).map { it.split('\t') }.filter { split == "all" || it[3] == split }
        return rows.filterIndexed { i, _ -> i % every == 0 }.take(limit).map { r ->
            val p = Perf(r[0], r[1], r[2], r[3])
            File(dir, r[0] + ".txt").forEachLine { line ->
                val f = line.split('\t')
                when (f[0]) {
                    "N" -> p.notes.add(Note(f[1].toDouble(), f[2].toDouble(), f[3].toDouble(), f[4].toInt(), f[5].toInt(), f[6].toInt(), f[7].toInt(), f[8].toDouble(), f[9].toDouble()))
                    "B" -> { p.beats.add(f[1].toDouble()); if (f[2] == "d") p.downbeats.add(f[1].toDouble()) }
                    "T" -> p.timeSigs.add(TimeSig(f[1].toDouble(), f[2].toInt(), f[3].toInt(), f[4].toInt()))
                    "K" -> p.keySigs.add(KeySig(f[1].toDouble(), f[2].toInt()))
                }
            }
            p
        }.filter { it.notes.size >= 30 && it.beats.size >= 8 && it.timeSigs.isNotEmpty() && it.keySigs.isNotEmpty() }
    }

    /** The network is shared between threads here; its one-entry memory is the only state, and it is locked. */
    fun copyOf(net: RhythmNet): RhythmNet = net

    /** The notes as Scorebook would get them from a MIDI keyboard. */
    fun events(p: Perf): List<NoteEvent> = p.notes.mapIndexed { i, n -> NoteEvent.midi(i, n.pitch, n.on, maxOf(n.off, n.on + 0.03), n.vel) }

    /** F-measure of [found] times against [truth] within [tol] seconds, one to one. */
    fun f1(found: List<Double>, truth: List<Double>, tol: Double = 0.07): Double {
        if (found.isEmpty() || truth.isEmpty()) return 0.0
        var i = 0
        var j = 0
        var hit = 0
        while (i < found.size && j < truth.size) {
            val d = found[i] - truth[j]
            when {
                abs(d) <= tol -> { hit++; i++; j++ }
                d < 0 -> i++
                else -> j++
            }
        }
        val p = hit.toDouble() / found.size
        val r = hit.toDouble() / truth.size
        return if (p + r == 0.0) 0.0 else 2 * p * r / (p + r)
    }

    class Score(val perf: Perf) {
        var beatF = 0.0
        var downbeatF = 0.0
        /** Found beat length over the true one: 1 = right, 0.5 = twice too fast, 2 = twice too slow. */
        var tempoRatio = 1.0
        var meterRight = false
        var keyRight = false
        var matched = 0
        var placed = 0
        var lengthRight = 0
        var handRight = 0
        var bars = 0
        var barsExact = 0
        var info = ""
        val tempoRight: Boolean get() = tempoRatio in 0.8..1.25
    }

    private fun median(xs: List<Double>): Double = xs.sorted().let { if (it.isEmpty()) 0.0 else it[it.size / 2] }

    fun score(p: Perf, t: Transcription): Score {
        val s = Score(p)
        val g = t.grid
        // beats inside the annotated span (annotations may stop before the last chord has faded)
        val lo = p.beats.first() - 0.1
        val hi = p.beats.last() + 0.1
        val found = g.beats.filter { it in lo..hi }
        s.beatF = f1(found, p.beats)
        val first = g.firstBarBeat()
        val foundDown = g.beats.filterIndexed { i, b -> Math.floorMod(i - first, g.beatsPerBar) == 0 && b in lo..hi }
        s.downbeatF = f1(foundDown, p.downbeats)
        val trueIbi = median(p.beats.zipWithNext { a, b -> b - a })
        s.tempoRatio = g.medianPeriod() / trueIbi
        val ts = p.main(p.timeSigs, { it.time }, { "${it.num}/${it.den}" })
        s.meterRight = g.beatsPerBar == ts.beatsPerBar && g.compound == ts.compound
        val ks = p.main(p.keySigs, { it.time }, { it.fifths })
        s.keyRight = Math.floorMod(t.mainKey.fifths - ks.fifths, 12) == 0
        s.info = "${g.numerator}/${g.denominator} vs ${ts.num}/${ts.den}, ${t.mainKey} vs ${ks.fifths}, tempo x${"%.2f".format(s.tempoRatio)}"
        // note by note, against the sheet
        val byId = t.notes.associateBy { it.eventId }
        val barOk = HashMap<Int, Boolean>()
        for ((i, n) in p.notes.withIndex()) {
            if (n.staff < 0 || n.bar < 0) continue
            val tn = byId[i] ?: continue
            s.matched++
            val sig = p.timeSigAt(n.on)
            val want = (n.pos / sig.quarters).let { it - Math.floor(it) }
            val got = Math.floorMod(tn.tick, g.barTicks).toDouble() / g.barTicks
            val d = abs(want - got)
            val placed = min(d, 1 - d) < 0.012
            val wantLen = n.dur / sig.quarters
            val gotLen = tn.duration.toDouble() / g.barTicks
            val length = abs(gotLen - wantLen) <= 0.13 * wantLen + 0.004
            val hand = (tn.hand == Hand.RIGHT) == (n.staff == 0)
            if (placed) s.placed++
            if (length) s.lengthRight++
            if (hand) s.handRight++
            barOk[n.bar] = (barOk[n.bar] ?: true) && placed && hand
        }
        s.bars = barOk.size
        s.barsExact = barOk.count { it.value }
        return s
    }

    fun table(title: String, scores: List<Score>): String {
        fun row(name: String, ss: List<Score>): String {
            val notes = ss.sumOf { it.matched }.coerceAtLeast(1)
            val bars = ss.sumOf { it.bars }.coerceAtLeast(1)
            fun pct(x: Double) = "%5.1f".format(100 * x)
            return "%-13s %4d | beats %s  tempo %s  bars %s  meter %s  key %s | placed %s  length %s  hand %s | exact bars %s".format(
                name, ss.size, pct(ss.map { it.beatF }.average()), pct(ss.count { it.tempoRight }.toDouble() / ss.size),
                pct(ss.map { it.downbeatF }.average()), pct(ss.count { it.meterRight }.toDouble() / ss.size), pct(ss.count { it.keyRight }.toDouble() / ss.size),
                pct(ss.sumOf { it.placed }.toDouble() / notes), pct(ss.sumOf { it.lengthRight }.toDouble() / notes), pct(ss.sumOf { it.handRight }.toDouble() / notes),
                pct(ss.sumOf { it.barsExact }.toDouble() / bars),
            )
        }
        val sb = StringBuilder("ASAP $title\n")
        for ((c, ss) in scores.groupBy { it.perf.composer }.toSortedMap()) sb.append(row(c, ss)).append('\n')
        sb.append(row("ALL", scores)).append('\n')
        // each piece counts once, however many times it was recorded
        val perPiece = scores.groupBy { it.perf.composer + "/" + it.perf.title }
        fun avg(f: (List<Score>) -> Double) = "%5.1f".format(100 * perPiece.values.map(f).average())
        sb.append("PER PIECE (${perPiece.size}) | beats ${avg { ss -> ss.map { it.beatF }.average() }}  tempo ${avg { ss -> ss.count { it.tempoRight }.toDouble() / ss.size }}" +
            "  bars ${avg { ss -> ss.map { it.downbeatF }.average() }}  meter ${avg { ss -> ss.count { it.meterRight }.toDouble() / ss.size }}  key ${avg { ss -> ss.count { it.keyRight }.toDouble() / ss.size }}" +
            " | placed ${avg { ss -> ss.sumOf { it.placed }.toDouble() / ss.sumOf { it.matched }.coerceAtLeast(1) }}  length ${avg { ss -> ss.sumOf { it.lengthRight }.toDouble() / ss.sumOf { it.matched }.coerceAtLeast(1) }}" +
            "  hand ${avg { ss -> ss.sumOf { it.handRight }.toDouble() / ss.sumOf { it.matched }.coerceAtLeast(1) }} | exact bars ${avg { ss -> ss.sumOf { it.barsExact }.toDouble() / ss.sumOf { it.bars }.coerceAtLeast(1) }}\n")
        val ratios = scores.groupingBy { s -> listOf(0.33, 0.5, 0.67, 1.0, 1.5, 2.0, 3.0).minByOrNull { abs(Math.log(s.tempoRatio / it)) }!! }.eachCount().toSortedMap()
        sb.append("beat length found / true: $ratios\n")
        return sb.toString()
    }
}

class AsapEvalTest {
    @Test
    fun againstTheSheetMusic() {
        val dir = System.getenv("SCOREBOOK_ASAP_DIR")?.let { File(it) } ?: return
        val split = System.getenv("SCOREBOOK_ASAP_SPLIT") ?: "held"
        val perfs = Asap.load(dir, split, System.getenv("SCOREBOOK_ASAP_EVERY")?.toInt() ?: 1, System.getenv("SCOREBOOK_ASAP_LIMIT")?.toInt() ?: Int.MAX_VALUE)
        val started = System.nanoTime()
        // with the rhythm network when SCOREBOOK_RHYTHM_NET names its weights file, otherwise the rule-based analysis
        val net = System.getenv("SCOREBOOK_RHYTHM_NET")?.let { RhythmNet.load(File(it).inputStream()) }
        val scores = perfs.parallelStream().map { p -> Asap.score(p, Transcriber(net = net?.let { Asap.copyOf(it) }).analyze(Asap.events(p), AnalysisSettings())) }.toList()
        println(Asap.table("$split: ${perfs.size} performances, ${perfs.sumOf { it.notes.size }} notes, ${(System.nanoTime() - started) / 1_000_000_000} s", scores))
        if (System.getenv("SCOREBOOK_ASAP_DETAIL") != null) for (s in scores.sortedBy { it.placed.toDouble() / it.matched.coerceAtLeast(1) }) {
            println("%-70s beats %.2f bars %.2f placed %.2f hand %.2f | %s".format(s.perf.name.take(70), s.beatF, s.downbeatF, s.placed.toDouble() / s.matched.coerceAtLeast(1), s.handRight.toDouble() / s.matched.coerceAtLeast(1), s.info))
        }
    }
}
