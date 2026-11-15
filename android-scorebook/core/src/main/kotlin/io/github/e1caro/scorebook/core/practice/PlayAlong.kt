package io.github.e1caro.scorebook.core.practice

import io.github.e1caro.scorebook.core.correct.Transcription
import kotlinx.serialization.Serializable
import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * The play-along check: the player plays what is on the page, at any tempo, starting whenever they like, and this
 * says how much of it was right.
 *
 *  1. **Which notes.** What was played and what is written are lined up in order (longest common subsequence
 *     of pitches, chords sorted from the bottom). Playing the whole thing an octave or two away counts.
 *  2. **Rhythm.** One straight line is fitted through the matched notes (time played against beat written): its
 *     slope is the player's tempo, and how far each note lies from it is how uneven the rhythm was.
 */
object PlayAlong {
    /** A written note: [beat] is its position in beats from the start. */
    data class Target(val id: Int, val pitch: Int, val beat: Double)

    /** A played note, in seconds. */
    data class Played(val pitch: Int, val time: Double)

    data class Result(
        val expected: Int,
        val hit: Int,
        /** Played notes that are not on the page. */
        val extra: Int,
        /** 0..1: how even the rhythm was (1: every matched note within a twelfth of a beat of a steady pulse). */
        val rhythm: Double,
        /** The tempo it was played at; null when too little matched to tell. */
        val bpm: Int?,
        val score: Int,
        val stars: Int,
        /** Ids of the written notes that were not played. */
        val missed: Set<Int>,
        /** Played this many semitones away from where it is written (a multiple of 12). */
        val octaveShift: Int,
    ) {
        val notes: Double get() = if (expected == 0) 0.0 else hit.toDouble() / expected
        val passed: Boolean get() = stars >= 1

        val headline: String get() = when (stars) { 3 -> "Spot on"; 2 -> "Nearly there"; 1 -> "A good start"; else -> if (hit == 0) "I did not hear it" else "Not yet" }

        /** What to tell the player, in a few short sentences; [targetBpm] is the written tempo. */
        fun advice(targetBpm: Int): String {
            if (hit == 0) return "None of the written notes were heard. Play a little louder, closer to the phone, and start from the first bar."
            val parts = ArrayList<String>()
            parts.add(if (hit == expected) "Every note was there." else "You played $hit of $expected notes; the missing ones are highlighted.")
            if (extra > maxOf(2, expected / 8)) parts.add("There were $extra extra notes.")
            when {
                bpm == null -> {}
                rhythm >= 0.85 -> parts.add("Steady rhythm.")
                rhythm >= 0.6 -> parts.add("The rhythm wobbled a little: count the beats out loud.")
                else -> parts.add("The rhythm was uneven: try it slower, counting the beats out loud.")
            }
            if (bpm != null) {
                parts.add(when {
                    bpm < targetBpm * 0.85 -> "You played at ♩ = $bpm, slower than written ($targetBpm). Good for learning it."
                    bpm > targetBpm * 1.15 -> "You played at ♩ = $bpm, faster than written ($targetBpm)."
                    else -> "Tempo ♩ = $bpm."
                })
            }
            if (octaveShift != 0) parts.add("(Played ${abs(octaveShift) / 12} octave${if (abs(octaveShift) > 12) "s" else ""} ${if (octaveShift > 0) "higher" else "lower"} than written, which is fine.)")
            return parts.joinToString(" ")
        }
    }

    /** The written notes of a study (one pass). */
    fun targets(t: Transcription): List<Target> = t.notes.map { Target(it.eventId, it.pitch, it.tick.toDouble() / t.grid.beatTicks) }

    fun check(targets: List<Target>, played: List<Played>): Result {
        val want = targets.sortedWith(compareBy({ it.beat }, { it.pitch }))
        val got = chordsFromBottom(played)
        if (want.isEmpty()) return Result(0, 0, got.size, 0.0, null, 0, 0, emptySet(), 0)
        // the same notes in another octave are the same music
        var best: List<Pair<Int, Int>> = emptyList()
        var shift = 0
        for (s in listOf(0, -12, 12, -24, 24)) {
            val pairs = align(want, got, s)
            if (pairs.size > best.size) { best = pairs; shift = s }
        }
        val hit = best.size
        val missed = want.indices.filter { i -> best.none { it.first == i } }.map { want[it].id }.toSet()
        // A note heard an octave, a twelfth or two octaves above a note that was really played, at the same moment,
        // is that note's overtone (strong on bright or close-miked pianos), not something the player did.
        val matched = best.map { it.second }.toSet()
        val struck = matched.map { got[it] }
        val extra = got.indices.count { j ->
            j !in matched && struck.none { q -> kotlin.math.abs(q.time - got[j].time) < 0.08 && (got[j].pitch - q.pitch) in OVERTONES }
        }
        var rhythm = 0.0
        var bpm: Int? = null
        if (hit >= 4) {
            val xs = best.map { want[it.first].beat }
            val ys = best.map { got[it.second].time }
            fit(xs, ys)?.let { (a, b) ->
                if (a > 0.1 && a < 3.0) {
                    bpm = (60.0 / a).roundToInt()
                    // distance from the steady pulse, in beats: fine within 1/12 of a beat (so swung eighths, which
                    // sit a sixth of a beat late, cost nothing), worthless from 2/7 of a beat
                    rhythm = xs.indices.map { i ->
                        val off = abs(ys[i] - (a * xs[i] + b)) / a
                        (1.0 - (off - 0.085).coerceAtLeast(0.0) / 0.2).coerceIn(0.0, 1.0)
                    }.average()
                }
            }
        }
        val notes = hit.toDouble() / want.size
        val penalty = minOf(15.0, 50.0 * (extra - want.size / 10).coerceAtLeast(0) / want.size)
        val score = (100 * notes * (0.65 + 0.35 * rhythm) - penalty).roundToInt().coerceIn(0, 100)
        val stars = when { score >= 88 -> 3; score >= 70 -> 2; score >= 45 -> 1; else -> 0 }
        return Result(want.size, hit, extra, rhythm, bpm, score, stars, missed, shift)
    }

    /** Semitones above a struck note where its overtones lie: octave, twelfth, two octaves, and the next two. */
    private val OVERTONES = setOf(12, 19, 24, 28, 31)

    /** Played notes in order, with the notes of a chord (struck within 70 ms of each other) from the bottom up. */
    private fun chordsFromBottom(played: List<Played>): List<Played> {
        val sorted = played.sortedBy { it.time }
        val out = ArrayList<Played>()
        var i = 0
        while (i < sorted.size) {
            var j = i + 1
            while (j < sorted.size && sorted[j].time - sorted[j - 1].time < 0.07 && sorted[j].time - sorted[i].time < 0.12) j++
            out.addAll(sorted.subList(i, j).sortedBy { it.pitch })
            i = j
        }
        return out
    }

    /** Longest common subsequence of pitches: pairs (index in [want], index in [got]). */
    private fun align(want: List<Target>, got: List<Played>, shift: Int): List<Pair<Int, Int>> {
        val n = want.size
        val m = got.size
        val len = Array(n + 1) { IntArray(m + 1) }
        for (i in n - 1 downTo 0) for (j in m - 1 downTo 0) {
            len[i][j] = if (want[i].pitch + shift == got[j].pitch) len[i + 1][j + 1] + 1 else maxOf(len[i + 1][j], len[i][j + 1])
        }
        val pairs = ArrayList<Pair<Int, Int>>()
        var i = 0
        var j = 0
        while (i < n && j < m) {
            when {
                want[i].pitch + shift == got[j].pitch && len[i][j] == len[i + 1][j + 1] + 1 -> { pairs.add(i to j); i++; j++ }
                len[i + 1][j] >= len[i][j + 1] -> i++
                else -> j++
            }
        }
        return pairs
    }

    /** y = a·x + b by least squares, fitted twice: the second time without the notes farthest from the line. */
    private fun fit(xs: List<Double>, ys: List<Double>): Pair<Double, Double>? {
        fun line(idx: List<Int>): Pair<Double, Double>? {
            val mx = idx.map { xs[it] }.average()
            val my = idx.map { ys[it] }.average()
            val sxx = idx.sumOf { (xs[it] - mx) * (xs[it] - mx) }
            if (sxx < 1e-9) return null
            val a = idx.sumOf { (xs[it] - mx) * (ys[it] - my) } / sxx
            return a to (my - a * mx)
        }
        val all = xs.indices.toList()
        val (a, b) = line(all) ?: return null
        val res = all.map { abs(ys[it] - (a * xs[it] + b)) }
        val cut = res.sorted()[(res.size * 0.8).toInt().coerceAtMost(res.size - 1)]
        val kept = all.filter { res[it] <= cut }
        return if (kept.size >= 4) line(kept) ?: (a to b) else a to b
    }
}

/**
 * Which days something was practised with the play-along check (at least one star), and the best result of
 * each study. [days] are epoch days.
 */
@Serializable
data class PracticeLog(val days: List<Long> = emptyList(), val best: Map<String, Int> = emptyMap()) {
    fun record(day: Long, studyId: String, stars: Int): PracticeLog {
        if (stars < 1) return this
        return copy(days = (days + day).distinct().sorted().takeLast(400), best = best + (studyId to maxOf(stars, best[studyId] ?: 0)))
    }

    fun practisedOn(day: Long): Boolean = day in days

    /** Days in a row, counting today if practised today, otherwise up to yesterday (the streak is still alive). */
    fun streak(today: Long): Int {
        var d = if (today in days) today else today - 1
        var n = 0
        while (d in days) { n++; d-- }
        return n
    }

    /** Stars of the best try at a study (0: never passed). */
    fun stars(studyId: String): Int = best[studyId] ?: 0
}
