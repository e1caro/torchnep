package io.github.e1caro.scorebook.core.library

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/** Practice statistics from the takes in the library. */
data class PracticeStats(
    val totalMinutes: Double,
    val weekMinutes: Double,
    val takes: Int,
    val songs: Int,
    val streakDays: Int,
    val topKeys: List<Pair<String, Int>>,
    val averageBpm: Int,
    /** Minutes played on each of the last 7 days, oldest first (the last one is today). */
    val lastSevenDays: List<Double>,
) {
    companion object {
        fun of(lib: Library, nowMillis: Long, zone: ZoneId = ZoneId.systemDefault()): PracticeStats {
            val takes = lib.takes.filter { it.trashedAt == null }
            val today = Instant.ofEpochMilli(nowMillis).atZone(zone).toLocalDate()
            fun day(t: TakeMeta): LocalDate = Instant.ofEpochMilli(t.created).atZone(zone).toLocalDate()
            val perDay = takes.groupBy { day(it) }.mapValues { (_, ts) -> ts.sumOf { it.seconds } / 60.0 }
            val last7 = (6 downTo 0).map { perDay[today.minusDays(it.toLong())] ?: 0.0 }
            // a streak counts today, or ends yesterday if nothing was played yet today
            var d = if (perDay.containsKey(today)) today else today.minusDays(1)
            var streak = 0
            while (perDay.containsKey(d)) { streak++; d = d.minusDays(1) }
            val keys = takes.groupingBy { it.key }.eachCount().entries.sortedByDescending { it.value }.take(3).map { it.key to it.value }
            return PracticeStats(
                totalMinutes = takes.sumOf { it.seconds } / 60.0,
                weekMinutes = last7.sum(),
                takes = takes.size,
                songs = takes.map { it.songId }.distinct().size,
                streakDays = streak,
                topKeys = keys,
                averageBpm = if (takes.isEmpty()) 0 else takes.map { it.bpm }.average().toInt(),
                lastSevenDays = last7,
            )
        }
    }
}
