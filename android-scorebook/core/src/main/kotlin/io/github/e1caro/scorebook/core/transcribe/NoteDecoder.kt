package io.github.e1caro.scorebook.core.transcribe

import kotlinx.serialization.Serializable
import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min

/**
 * Maps features of an onset candidate to P(a key was really played here). A logistic regression fitted on rendered
 * piano recordings (tools/make_fixtures.py: in-tune and out-of-tune pianos; leave-one-piece-out precision 0.86–0.92,
 * recall 0.87–0.99 on the in-tune ones), on top of the network's raw sigmoid outputs:
 * the network says "energy at this pitch", the calibration says "a pianist pressed this key".
 * Neighbour-key evidence matters for out-of-tune notes, whose energy is split between two keys.
 * [registerBias] is learned per user from deleted and added notes (PersonalModel), one value per octave.
 */
@Serializable
data class AudioCalibration(
    val wOnset: Double = 1.871,
    val wNote: Double = 1.495,
    val wNoteMax: Double = 0.593,
    val wLogDur: Double = -0.057,
    val wPre: Double = -6.479,
    val wHarmNote: Double = -3.35,
    val wHarmOnset: Double = 1.795,
    val wNeighbourOnset: Double = 3.346,
    val wNeighbourNote: Double = 1.414,
    val bias: Double = -0.445,
    val registerBias: List<Double> = List(8) { 0.0 },
) {
    fun logit(f: CandidateFeatures, key: Int): Double =
        wOnset * lg(f.onset) + wNote * lg(f.noteMean) + wNoteMax * lg(f.noteMax) + wLogDur * ln(1.0 + f.frames) +
            wPre * f.pre + wHarmNote * f.harmNote + wHarmOnset * f.harmOnset +
            wNeighbourOnset * f.neighbourOnset + wNeighbourNote * f.neighbourNote + bias +
            registerBias.getOrElse(((key + 9) / 12).coerceIn(0, 7)) { 0.0 }

    fun probability(f: CandidateFeatures, key: Int): Double = sigmoid(logit(f, key))

    companion object {
        fun lg(x: Double): Double { val c = x.coerceIn(1e-3, 1 - 1e-3); return ln(c / (1 - c)) }
        fun sigmoid(x: Double) = 1.0 / (1.0 + exp(-x))
    }
}

/** What the calibration looks at for one candidate (key, onset frame). */
data class CandidateFeatures(
    val onset: Double, // onset probability at the peak
    val noteMean: Double, // mean note probability over the first 15 frames (or the note, if shorter)
    val noteMax: Double, // max note probability over the first 15 frames
    val frames: Int, // length of the note in frames
    val pre: Double, // note probability just before the onset (high = flicker inside a held note)
    val harmNote: Double, // note probability an octave / twelfth / two octaves below (is this a harmonic?)
    val harmOnset: Double, // onset probability there
    val neighbourOnset: Double, // best onset probability one key up or down, same instant
    val neighbourNote: Double, // their mean note probability
)

data class DecoderParams(
    val peakThreshold: Float = 0.25f,
    val noteThreshold: Float = 0.25f,
    val gapTolerance: Int = 8,
    val minPresence: Double = 0.12,
    /** Two neighbouring keys this close in time are one event with two alternatives, unless both are clear. */
    val mergeFrames: Int = 3,
    val bothClear: Double = 0.6,
)

/**
 * Turns the probability grid into [NoteEvent]s that keep their uncertainty: presence, and a probability for the
 * heard pitch, its semitone neighbours (F vs F#) and its octaves.
 */
class NoteDecoder(
    val calibration: AudioCalibration = AudioCalibration(),
    val params: DecoderParams = DecoderParams(),
) {
    private class Cand(val t: Int, val k: Int, var end: Int, val f: CandidateFeatures, val q: Double) {
        val merged = HashMap<Int, Double>() // neighbour key -> its q, when merged into this event
        var presence = q
        var harmonicOf: Cand? = null
    }

    /**
     * Decodes onsets in frames [from, to). Features look up to 30 frames further, so for live use [to] should
     * stay that far behind the end of the grid (see [LiveDecoder]).
     */
    fun decode(grid: ProbabilityGrid, from: Int = 0, to: Int = grid.frames, firstId: Int = 0): List<NoteEvent> {
        val F = grid.frames
        val hi = min(to, F - 1)
        // 1. onset peaks on every key, with provisional ends (cut at the next peak on the same key)
        val peaksByKey = Array(ProbabilityGrid.KEYS) { ArrayList<Int>() }
        for (k in 0 until ProbabilityGrid.KEYS) {
            for (t in max(0, from) until hi) {
                val o = grid.onset(t, k)
                if (o >= params.peakThreshold && (t == 0 || o >= grid.onset(t - 1, k)) && o > grid.onset(t + 1, k)) peaksByKey[k].add(t)
            }
        }
        val cands = ArrayList<Cand>()
        for (k in 0 until ProbabilityGrid.KEYS) {
            val ts = peaksByKey[k]
            for (j in ts.indices) {
                val t = ts[j]
                val next = if (j + 1 < ts.size) ts[j + 1] else F
                val end = noteEnd(grid, t, k, next)
                val f = features(grid, t, k, end)
                val q = calibration.probability(f, k)
                if (q >= params.minPresence) cands.add(Cand(t, k, end, f, q))
            }
        }
        // 2. neighbouring keys at the same instant: one event with alternatives, unless both are clearly there
        cands.sortByDescending { it.q }
        val events = ArrayList<Cand>()
        val byKey = Array(ProbabilityGrid.KEYS) { ArrayList<Cand>() }
        for (c in cands) {
            val same = byKey[c.k].firstOrNull { kotlin.math.abs(it.t - c.t) <= 2 }
            if (same != null) continue // double peak of the same note
            val neighbour = sequenceOf(c.k - 1, c.k + 1).filter { it in 0 until ProbabilityGrid.KEYS }
                .flatMap { byKey[it].asSequence() }
                .firstOrNull { kotlin.math.abs(it.t - c.t) <= params.mergeFrames && !(c.q >= params.bothClear && it.q >= params.bothClear) }
            if (neighbour != null) {
                neighbour.merged[c.k] = max(neighbour.merged[c.k] ?: 0.0, c.q)
                neighbour.presence = 1 - (1 - neighbour.presence) * (1 - c.q * 0.5)
                continue
            }
            events.add(c)
            byKey[c.k].add(c)
        }
        // 3. final ends: a note stops where the next real onset of the same key starts
        for (k in 0 until ProbabilityGrid.KEYS) {
            val list = byKey[k].filter { it.presence >= 0.35 }.sortedBy { it.t }
            for (c in byKey[k]) {
                val next = list.firstOrNull { it.t > c.t + 2 }?.t ?: F
                c.end = max(c.t + 1, noteEnd(grid, c.t, k, next))
            }
        }
        // 4. possible harmonics: a weaker event an octave / twelfth / two octaves above a louder simultaneous one
        for (c in events) {
            for (iv in intArrayOf(12, 19, 24)) {
                val low = byKey.getOrNull(c.k - iv)?.firstOrNull { kotlin.math.abs(it.t - c.t) <= 2 && it.q > c.q } ?: continue
                c.harmonicOf = low
                break
            }
        }
        // 5. events with their alternatives
        events.sortWith(compareBy({ it.t }, { it.k }))
        val ids = HashMap<Cand, Int>()
        events.forEachIndexed { i, c -> ids[c] = firstId + i }
        return events.map { c ->
            val weights = LinkedHashMap<Int, Double>()
            weights[c.k] = c.q
            for (d in intArrayOf(-1, 1, -12, 12)) {
                val k2 = c.k + d
                if (k2 !in 0 until ProbabilityGrid.KEYS) continue
                // a neighbour that is its own clear event is not an alternative identity for this one
                if (byKey[k2].any { kotlin.math.abs(it.t - c.t) <= params.mergeFrames }) continue
                val q2 = c.merged[k2] ?: calibration.probability(featuresNear(grid, c.t, k2), k2)
                weights[k2] = q2 * (if (kotlin.math.abs(d) == 12) 0.25 else 1.0)
            }
            val sum = weights.values.sum()
            val options = weights.entries.map { PitchOption(it.key + ProbabilityGrid.LOWEST, it.value / sum) }
                .sortedByDescending { it.audioP }
            NoteEvent(
                id = ids[c]!!,
                onset = grid.time(c.t),
                offset = grid.time(c.end),
                velocity = (30 + 90 * c.f.onset).toInt().coerceIn(1, 127),
                presence = min(0.995, c.presence),
                options = options,
                harmonicOf = c.harmonicOf?.let { ids[it] } ?: -1,
                sustained = c.f.pre >= 0.3,
            )
        }
    }

    private fun noteEnd(grid: ProbabilityGrid, t: Int, k: Int, next: Int): Int {
        var i = t + 1
        var low = 0
        while (i < next && low < params.gapTolerance) {
            low = if (grid.note(i, k) < params.noteThreshold) low + 1 else 0
            i++
        }
        return if (low >= params.gapTolerance) i - low else i
    }

    private fun features(grid: ProbabilityGrid, t: Int, k: Int, end: Int): CandidateFeatures {
        val F = grid.frames
        val segEnd = if (end > t) min(end, t + 15) else t + 1
        var sum = 0.0
        for (i in t until min(segEnd, F)) sum += grid.note(i, k)
        val noteMean = sum / max(1, min(segEnd, F) - t)
        var noteMax = 0.0
        for (i in t until min(t + 15, F)) noteMax = max(noteMax, grid.note(i, k).toDouble())
        val preFrom = max(0, t - 4)
        val preTo = max(1, t - 1)
        var pre = 0.0
        for (i in preFrom until preTo) pre += grid.note(i, k)
        pre /= max(1, preTo - preFrom)
        var harmNote = 0.0
        var harmOnset = 0.0
        for (iv in intArrayOf(12, 19, 24)) {
            val kk = k - iv
            if (kk < 0) continue
            var s = 0.0
            val e = min(t + 10, F)
            for (i in t until e) s += grid.note(i, kk)
            harmNote = max(harmNote, s / max(1, e - t))
            for (i in max(0, t - 2) until min(t + 3, F)) harmOnset = max(harmOnset, grid.onset(i, kk).toDouble())
        }
        var nbOnset = 0.0
        var nbNote = 0.0
        for (kk in intArrayOf(k - 1, k + 1)) {
            if (kk !in 0 until ProbabilityGrid.KEYS) continue
            for (i in max(0, t - 2) until min(t + 3, F)) nbOnset = max(nbOnset, grid.onset(i, kk).toDouble())
            var s = 0.0
            val e = min(t + 15, F)
            for (i in t until e) s += grid.note(i, kk)
            nbNote = max(nbNote, s / max(1, e - t))
        }
        return CandidateFeatures(grid.onset(t, k).toDouble(), noteMean, noteMax, end - t, pre, harmNote, harmOnset, nbOnset, nbNote)
    }

    /** Features of key [k] around frame [t] even without a peak there: the best onset within ±2 frames. */
    private fun featuresNear(grid: ProbabilityGrid, t: Int, k: Int): CandidateFeatures {
        var bt = t
        for (i in max(0, t - 2)..min(grid.frames - 1, t + 2)) if (grid.onset(i, k) > grid.onset(bt, k)) bt = i
        val end = noteEnd(grid, bt, k, grid.frames)
        return features(grid, bt, k, end)
    }
}

/**
 * Incremental decoding while recording: re-decodes the recent part of the grid and reports events once they are
 * far enough from the end that their features are complete. Final transcription re-decodes the whole take.
 */
class LiveDecoder(private val decoder: NoteDecoder = NoteDecoder()) {
    private val emitted = ArrayList<NoteEvent>()
    private var nextId = 0
    private var doneUntil = 0 // onset frames below this are final

    val events: List<NoteEvent> get() = emitted

    /** Returns the new events. [final] = the take ended: decode up to the last frame. */
    fun update(grid: ProbabilityGrid, final: Boolean = false): List<NoteEvent> {
        val safeTo = if (final) grid.frames else grid.frames - LOOKAHEAD
        if (safeTo <= doneUntil) return emptyList()
        val from = max(0, doneUntil - BACKTRACK)
        val all = decoder.decode(grid, from, safeTo, nextId)
        nextId += all.size // ids stay unique; events before doneUntil were reported by an earlier update
        val out = all.filter { it.onset >= grid.time(doneUntil) - 1e-9 }
        emitted.addAll(out)
        doneUntil = safeTo
        return out
    }

    companion object {
        const val LOOKAHEAD = 32
        const val BACKTRACK = 40
    }
}
