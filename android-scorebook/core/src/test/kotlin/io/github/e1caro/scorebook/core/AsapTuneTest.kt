package io.github.e1caro.scorebook.core

import io.github.e1caro.scorebook.core.analysis.RhythmAnalyzer
import io.github.e1caro.scorebook.core.analysis.TimedNote
import org.junit.Test
import java.io.File

/**
 * Fits the settings of the rule-based beat tracker to real performances (the tuning set prepared by
 * tools/asap_prepare.py): one setting at a time, each value tried with the others at their best so far.
 *
 * SCOREBOOK_ASAP_DIR as for AsapEvalTest; SCOREBOOK_TUNE = "CURVE_SPAN=6,8,12;TIGHT_BASE=20,40,60" (names of the
 * settings in RhythmAnalyzer's companion); SCOREBOOK_TUNE_SPLIT (default tune), SCOREBOOK_ASAP_EVERY,
 * SCOREBOOK_TUNE_GOAL = beats | bars | pulse (what to maximise, default beats).
 */
class AsapTuneTest {
    private class R(val beat: Double, val pulse: Double, val down: Double, val tempo: Double, val meter: Double)

    private fun run(perfs: List<Asap.Perf>): R {
        val scores = perfs.parallelStream().map { p ->
            val grid = RhythmAnalyzer().analyze(p.notes.map { TimedNote(it.pitch, it.on, maxOf(it.off, it.on + 0.03), it.vel) })
            Asap.scoreGrid(p, grid)
        }.toList()
        return R(scores.map { it.beatF }.average(), scores.map { it.pulseF }.average(), scores.map { it.downbeatF }.average(),
            scores.count { it.tempoRight }.toDouble() / scores.size, scores.count { it.meterRight }.toDouble() / scores.size)
    }

    @Test
    fun fit() {
        val dir = System.getenv("SCOREBOOK_ASAP_DIR")?.let { File(it) } ?: return
        val spec = System.getenv("SCOREBOOK_TUNE") ?: return
        val perfs = Asap.load(dir, System.getenv("SCOREBOOK_TUNE_SPLIT") ?: "tune", System.getenv("SCOREBOOK_ASAP_EVERY")?.toInt() ?: 3)
        if (System.getenv("SCOREBOOK_ASAP_ORACLE") == "period") {
            val truth = perfs.associate { p -> p.notes.minOf { it.on } to p.beats.zipWithNext { a, b -> b - a }.sorted().let { it[it.size / 2] } }
            RhythmAnalyzer.periodForExperiments = { notes -> truth[notes.first().onset] ?: 0.6 }
        }
        val goal = System.getenv("SCOREBOOK_TUNE_GOAL") ?: "beats"
        fun value(r: R) = when (goal) { "bars" -> r.down; "pulse" -> r.pulse; "meter" -> r.meter + r.down; "tempo" -> r.tempo + r.beat; else -> r.beat }
        fun show(r: R) = "beats %.1f  pulse %.1f  bars %.1f  tempo %.1f  meter %.1f".format(100 * r.beat, 100 * r.pulse, 100 * r.down, 100 * r.tempo, 100 * r.meter)
        val base = run(perfs)
        println("TUNE ${perfs.size} performances; as it is: ${show(base)}")
        var best = value(base)
        for (part in spec.split(';').filter { it.isNotBlank() }) {
            val (name, values) = part.split('=')
            val field = RhythmAnalyzer::class.java.getField(name.trim())
            val start = field.getDouble(null)
            var bestValue = start
            for (v in values.split(',').map { it.trim().toDouble() }) {
                field.setDouble(null, v)
                val r = run(perfs)
                println("TUNE   $name = $v: ${show(r)}")
                if (value(r) > best + 1e-4) { best = value(r); bestValue = v }
            }
            field.setDouble(null, bestValue)
            println("TUNE $name -> $bestValue")
        }
        RhythmAnalyzer.periodForExperiments = null
    }
}
