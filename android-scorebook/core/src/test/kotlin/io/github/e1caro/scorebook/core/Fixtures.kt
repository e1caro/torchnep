package io.github.e1caro.scorebook.core

import io.github.e1caro.scorebook.core.transcribe.ProbabilityGrid
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.double
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.math.abs

/** A rendered test piece: the real model's output on it, and what was actually played. */
class Fixture(val name: String) {
    data class Truth(val pitch: Int, val on: Double, val off: Double, val hand: String, val cents: Double)

    private val meta: JsonObject = Json.parseToJsonElement(
        Fixture::class.java.getResourceAsStream("/fixtures/$name.json")!!.bufferedReader().readText(),
    ).jsonObject

    val frames = meta["frames"]!!.jsonPrimitive.int
    val bpm = meta["bpm"]!!.jsonPrimitive.double
    val meter = meta["meter"]!!.jsonArray.map { it.jsonPrimitive.int }
    val keys = meta["keys"]!!.jsonArray.map { it.jsonObject["bar"]!!.jsonPrimitive.int to it.jsonObject["key"]!!.jsonPrimitive.content }
    val truth = meta["notes"]!!.jsonArray.map {
        val o = it.jsonObject
        Truth(o["pitch"]!!.jsonPrimitive.int, o["on"]!!.jsonPrimitive.double, o["off"]!!.jsonPrimitive.double,
            o["hand"]!!.jsonPrimitive.content, o["cents"]!!.jsonPrimitive.double)
    }

    fun grid(): ProbabilityGrid = ProbabilityGrid.readBytes(Fixture::class.java.getResourceAsStream("/fixtures/$name.probs.gz")!!, frames)

    companion object {
        val ALL = listOf("modulation", "waltz", "nocturne").flatMap { listOf("${it}_clean", "${it}_detuned") }
    }
}

/** Note-level scores: a detected note matches a played one with the same pitch within 50 ms. */
data class Score(val tp: Int, val fp: Int, val fn: Int) {
    val precision get() = tp.toDouble() / maxOf(1, tp + fp)
    val recall get() = tp.toDouble() / maxOf(1, tp + fn)
    val f1 get() = 2 * precision * recall / maxOf(1e-9, precision + recall)
    override fun toString() = "P=%.3f R=%.3f F1=%.3f (tp %d fp %d fn %d)".format(precision, recall, f1, tp, fp, fn)

    companion object {
        fun of(detected: List<Pair<Int, Double>>, truth: List<Fixture.Truth>, tol: Double = 0.05): Score {
            val used = BooleanArray(truth.size)
            var tp = 0
            for ((p, t) in detected.sortedBy { it.second }) {
                val i = truth.indices.filter { !used[it] && truth[it].pitch == p && abs(truth[it].on - t) <= tol }
                    .minByOrNull { abs(truth[it].on - t) }
                if (i != null) { used[i] = true; tp++ }
            }
            return Score(tp, detected.size - tp, truth.size - tp)
        }
    }
}
