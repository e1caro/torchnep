package io.github.e1caro.scorebook.core.correct

import kotlinx.serialization.Serializable
import kotlin.math.abs

@Serializable
enum class Hand { RIGHT, LEFT }

/**
 * Splits notes between the hands. Notes struck together form a group; each group is cut where the cost is
 * lowest given each hand's moving centre and a maximum span per hand, so the split point follows the music
 * instead of sitting at middle C.
 */
object HandSplitter {
    data class In(val id: Int, val pitch: Int, val onset: Double)

    fun split(notes: List<In>, together: Double = 0.05): Map<Int, Hand> {
        val out = HashMap<Int, Hand>()
        var right = 67.0
        var left = 48.0
        val sorted = notes.sortedBy { it.onset }
        var i = 0
        while (i < sorted.size) {
            var j = i + 1
            while (j < sorted.size && sorted[j].onset - sorted[i].onset <= together) j++
            val group = sorted.subList(i, j).sortedBy { it.pitch }
            var bestCut = 0
            var bestCost = Double.MAX_VALUE
            for (cut in 0..group.size) { // group[0 until cut] -> left, group[cut until] -> right
                val l = group.subList(0, cut)
                val r = group.subList(cut, group.size)
                var cost = 0.0
                for (n in l) cost += abs(n.pitch - left) / 6.0 + if (n.pitch > 72) 1.5 else 0.0
                for (n in r) cost += abs(n.pitch - right) / 6.0 + if (n.pitch < 48) 1.5 else 0.0
                if (l.isNotEmpty() && l.last().pitch - l.first().pitch > 14) cost += 10.0
                if (r.isNotEmpty() && r.last().pitch - r.first().pitch > 14) cost += 10.0
                if (cost < bestCost) { bestCost = cost; bestCut = cut }
            }
            group.forEachIndexed { idx, n -> out[n.id] = if (idx < bestCut) Hand.LEFT else Hand.RIGHT }
            val l = group.subList(0, bestCut)
            val r = group.subList(bestCut, group.size)
            if (l.isNotEmpty()) left = 0.65 * left + 0.35 * l.map { it.pitch }.average()
            if (r.isNotEmpty()) right = 0.65 * right + 0.35 * r.map { it.pitch }.average()
            if (right - left < 7) { val mid = (right + left) / 2; right = mid + 3.5; left = mid - 3.5 }
            i = j
        }
        return out
    }
}
