package io.github.e1caro.scorebook.core

import io.github.e1caro.scorebook.core.correct.AnalysisSettings
import io.github.e1caro.scorebook.core.correct.Transcriber
import io.github.e1caro.scorebook.core.transcribe.Decoder
import io.github.e1caro.scorebook.core.transcribe.ModelSpec
import io.github.e1caro.scorebook.core.transcribe.ProbabilityGrid
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.double
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Test
import java.io.File
import kotlin.math.abs

/**
 * Evaluation on real piano recordings (not part of the normal test run): set SCOREBOOK_EVAL_DIR to a folder of
 * `<name>.json` + `<name>.probs.gz` pairs (model output and the notes really played). Prints note precision,
 * recall and F1 (same pitch, onset within 50 ms), and the recall on notes that are part of a chord of 3 or more.
 */
class RealPianoEvalTest {
    private class Case(val name: String, val grid: ProbabilityGrid, val spec: ModelSpec, val truth: List<Pair<Int, Double>>)

    private fun load(dir: File): List<Case> = dir.listFiles()!!.filter { it.name.endsWith(".json") }.sortedBy { it.name }.map { f ->
        val meta = Json.parseToJsonElement(f.readText()).jsonObject
        val frames = meta["frames"]!!.jsonPrimitive.int
        val spec = if (meta["model"]?.jsonPrimitive?.content == "basic_pitch") ModelSpec.BASIC_PITCH else ModelSpec.ONSETS_FRAMES
        val grid = ProbabilityGrid.readBytes(File(dir, f.name.replace(".json", ".probs.gz")).inputStream(), frames, spec.fps)
        Case(f.name.removeSuffix(".json"), grid, spec, meta["notes"]!!.jsonArray.map { it.jsonObject["pitch"]!!.jsonPrimitive.int to it.jsonObject["on"]!!.jsonPrimitive.double })
    }

    private data class R(val p: Double, val r: Double, val f1: Double, val chordRecall: Double, val chordNotes: Int)

    private fun rate(det: List<Pair<Int, Double>>, truth: List<Pair<Int, Double>>): R {
        val used = BooleanArray(truth.size)
        var tp = 0
        for ((p, t) in det.sortedBy { it.second }) {
            val i = truth.indices.filter { !used[it] && truth[it].first == p && abs(truth[it].second - t) <= 0.05 }.minByOrNull { abs(truth[it].second - t) }
            if (i != null) { used[i] = true; tp++ }
        }
        val times = truth.map { it.second }.sorted()
        fun inChord(t: Double): Boolean {
            var lo = times.binarySearch(t - 0.03).let { if (it < 0) -it - 1 else it }
            var n = 0
            while (lo < times.size && times[lo] <= t + 0.03) { n++; lo++ }
            return n >= 3
        }
        val chord = truth.indices.filter { inChord(truth[it].second) }
        val pr = tp.toDouble() / maxOf(1, det.size)
        val rc = tp.toDouble() / maxOf(1, truth.size)
        return R(pr, rc, 2 * pr * rc / maxOf(1e-9, pr + rc), chord.count { used[it] }.toDouble() / maxOf(1, chord.size), chord.size)
    }

    @Test
    fun evaluate() {
        val dir = System.getenv("SCOREBOOK_EVAL_DIR")?.let { File(it) } ?: return
        val cases = load(dir)
        for ((kind, group) in cases.groupBy { "${it.spec.name} ${it.name.substringAfter('_')}" }) {
            val rows = group.map { c ->
                val events = Decoder.forModel(c.spec).decode(c.grid)
                val t = Transcriber().analyze(events, AnalysisSettings(musical = System.getenv("SCOREBOOK_EVAL_MUSICAL")?.toDouble() ?: 0.6))
                rate(t.notes.map { it.pitch to it.onset }, c.truth)
            }
            val chordNotes = rows.sumOf { it.chordNotes }
            println("[%s] P %.3f  R %.3f  F1 %.3f   chord-note recall %.3f   per piece F1: %s".format(
                kind, rows.map { it.p }.average(), rows.map { it.r }.average(), rows.map { it.f1 }.average(),
                rows.sumOf { it.chordRecall * it.chordNotes } / maxOf(1, chordNotes), rows.joinToString(" ") { "%.2f".format(it.f1) },
            ))
        }
    }
}
