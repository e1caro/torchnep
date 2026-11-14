package io.github.e1caro.scorebook.core.correct

import io.github.e1caro.scorebook.core.analysis.BeatGrid
import io.github.e1caro.scorebook.core.analysis.Chord
import io.github.e1caro.scorebook.core.analysis.KeyTracker
import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.music.Spelling
import io.github.e1caro.scorebook.core.music.pc
import io.github.e1caro.scorebook.core.transcribe.NoteEvent
import kotlinx.serialization.Serializable
import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.floor
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.roundToInt

@Serializable
enum class Decision {
    /** The audio was clear: context was not consulted. */
    CLEAR,

    /** The audio was ambiguous and the musical context helped decide (AI-decided, drawn lighter). */
    CONTEXT,

    /** Ambiguous audio with the slider at "Literal": the best audio guess, also drawn lighter. */
    UNSURE,

    /** The player chose this. */
    USER,

    /** From a MIDI keyboard: exact. */
    MIDI,
}

/** One alternative after fusion: its audio-only and final probability, and each context's log-probability. */
@Serializable
data class OptionResult(val pitch: Int, val audioP: Double, val finalP: Double, val context: List<Double>)

@Serializable
data class NoteDecision(
    val eventId: Int,
    val pitch: Int,
    val present: Boolean,
    val presenceP: Double,
    val decision: Decision,
    val options: List<OptionResult>,
    val gate: Double,
    val reasons: List<String> = emptyList(),
) {
    val isLight: Boolean get() = decision == Decision.CONTEXT || decision == Decision.UNSURE
}

/** The player's own choice for a note: another pitch, or no note at all. */
@Serializable
data class NoteOverride(val pitch: Int? = null, val deleted: Boolean = false)

/**
 * Musical context at one moment, as seen by the corrector. Built from what was heard clearly.
 */
class Context(
    val grid: BeatGrid,
    val keys: KeyTracker.Result,
    val chordPerStep: List<Chord?>,
    val hands: Map<Int, Hand>,
    val melody: Map<Int, Pair<Int?, Int?>>, // event id -> (previous, next) pitch on its outer line
    val repetition: RepetitionIndex?,
) {
    fun step(t: Double): Int = floor(grid.position(t) + 1e-6).toInt().coerceIn(0, max(0, chordPerStep.size - 1))
    fun keyAt(t: Double): Key = keys.keyAt(step(t))
}

/**
 * Combines the decoder's audio probabilities with the musical context:
 *
 *   score(c) = T·log P_audio(c) + bias(c) + λ·g·S·clamp(Σᵢ wᵢ·log Pᵢ(c))      i ∈ key, chord, melody, repetition
 *
 * λ is the Literal↔Musical slider, g the ambiguity gate (0 when the audio is clear: clear audio always wins),
 * S = [CONTEXT_SCALE]. Presence is fused the same way in logit space.
 */
class NoteCorrector(val personal: PersonalModel = PersonalModel()) {

    fun decide(e: NoteEvent, ctx: Context, musical: Double, override: NoteOverride? = null): NoteDecision {
        val lambda = musical.coerceIn(0.0, 1.0)
        if (e.fromMidi) {
            val p = override?.pitch ?: e.pitch
            return NoteDecision(e.id, p, override?.deleted != true, 1.0, if (override != null) Decision.USER else Decision.MIDI,
                listOf(OptionResult(p, 1.0, 1.0, List(4) { 0.0 })), 0.0)
        }
        val opts = e.options
        val t = e.onset
        val step = ctx.step(t)
        val pcPrior = ctx.keys.pitchClassPrior(step)
        val chord = ctx.chordPerStep.getOrNull(step)
        val (prev, next) = ctx.melody[e.id] ?: (null to null)
        val rep = ctx.repetition?.predict(e, ctx)

        // context distributions over the options, each normalized, as log-probabilities
        val keyP = normLog(opts.map { pcPrior[pc(it.pitch)] })
        val chordP = normLog(opts.map { o ->
            if (chord == null) 1.0 else if (pc(o.pitch) in chord.pitchClasses) 0.6 / chord.pitchClasses.size else 0.4 / (12 - chord.pitchClasses.size)
        })
        val melP = normLog(opts.map { o ->
            var f = 1.0
            if (prev != null) f *= intervalLikelihood(o.pitch - prev)
            if (next != null) f *= intervalLikelihood(next - o.pitch)
            f
        })
        val repP = normLog(opts.map { o -> if (rep == null) 1.0 else if (o.pitch == rep.pitch) 0.8 else 0.2 / max(1, opts.size - 1) })
        val components = opts.indices.map { listOf(keyP[it], chordP[it], melP[it], repP[it]) }

        // ambiguity gate: how torn the audio is between its two best pitches
        val sortedAudio = opts.map { it.audioP }.sortedDescending()
        val margin = if (sortedAudio.size < 2) 99.0 else ln(sortedAudio[0].coerceAtLeast(1e-9) / sortedAudio[1].coerceAtLeast(1e-9))
        val clearAt = ln(3.0) + lambda * (ln(12.0) - ln(3.0))
        val gate = max(0.0, 1 - margin / clearAt)

        val w = personal.weights.asArray()
        val ctxRaw = components.map { c -> c.indices.sumOf { i -> w[i] * c[i] } }
        val ctxMax = ctxRaw.max()
        val ctxTerm = ctxRaw.map { (it - ctxMax).coerceAtLeast(-CONTEXT_CAP) }
        val scores = opts.indices.map { i ->
            personal.audioTemperature * ln(opts[i].audioP.coerceAtLeast(1e-6)) + personal.bias(opts[i].pitch) +
                lambda * gate * CONTEXT_SCALE * ctxTerm[i]
        }
        val post = softmax(scores)
        val results = opts.indices.map { OptionResult(opts[it].pitch, opts[it].audioP, post[it], components[it]) }
            .sortedByDescending { it.finalP }
        val best = results.first()

        // presence: is there a note at all?
        val presLogit = lg(e.presence)
        val presGate = max(0.0, 1 - abs(presLogit) / lg(0.85))
        var bonus = 0.0
        val bestPc = pc(best.pitch)
        bonus += 0.5 * ln(pcPrior[bestPc] * 12).coerceIn(-2.0, 2.0)
        if (chord != null) bonus += if (bestPc in chord.pitchClasses) 0.4 else -0.2
        if (rep != null) bonus += if (rep.pitch == best.pitch) 0.5 else -0.2
        bonus = bonus.coerceIn(-1.0, 1.0)
        // likely an overtone of a louder note, or a flicker inside a held note: never rescued by context
        if (e.harmonicOf >= 0 || e.sustained) bonus = minOf(bonus, -0.5)
        val presence = sigmoid(presLogit + lambda * presGate * bonus * w[0].coerceAtLeast(0.5))

        // AI-decided: the context had a real say (or changed the answer). Unsure: the audio itself is torn
        // (worse than 75/25 between two pitches, or presence between 30 and 70 %) and context did not decide.
        val contextSpoke = lambda > 0.02 && (lambda * gate >= 0.15 || lambda * presGate >= 0.15 || best.pitch != e.pitch ||
            ((presence >= 0.5) != (e.presence >= 0.5)))
        val tornAudio = margin < ln(3.0) || e.presence in 0.3..0.7
        val ambiguous = contextSpoke || tornAudio
        var decision = when {
            contextSpoke -> Decision.CONTEXT
            tornAudio -> Decision.UNSURE
            else -> Decision.CLEAR
        }
        var pitch = best.pitch
        var present = presence >= 0.5
        if (override != null) {
            decision = Decision.USER
            if (override.pitch != null) pitch = override.pitch
            present = !override.deleted
        }
        val reasons = if (ambiguous || override != null) reasons(e, results, pitch, ctx, chord, rep, prev, lambda, gate) else emptyList()
        return NoteDecision(e.id, pitch, present, presence, decision, results, gate, reasons)
    }

    /** Features of a decision, for learning when the player corrects it. */
    fun example(e: NoteEvent, d: NoteDecision, musical: Double, chosen: Int): CorrectionExample = CorrectionExample(
        options = d.options.map { OptionFeatures(it.pitch, ln(it.audioP.coerceAtLeast(1e-6)), it.context) },
        gate = d.gate,
        musical = musical,
        chosenPitch = chosen,
        register = ((e.pitch - 12) / 12).coerceIn(0, 7),
    )

    private fun reasons(
        e: NoteEvent, results: List<OptionResult>, chosen: Int, ctx: Context, chord: Chord?, rep: RepetitionIndex.Prediction?,
        prev: Int?, lambda: Double, gate: Double,
    ): List<String> {
        val key = ctx.keyAt(e.onset)
        fun name(p: Int) = Spelling.spell(p, key).nameNoOctave
        val out = ArrayList<String>()
        val heard = e.options.take(3).joinToString(", ") { "${name(it.pitch)} ${(it.audioP * 100).roundToInt()}%" }
        out.add("Heard: $heard")
        val other = results.firstOrNull { it.pitch != chosen } ?: return out
        val mine = results.firstOrNull { it.pitch == chosen } ?: return out
        if (chosen != e.pitch && lambda * gate > 0) out.add("Musical context chose ${name(chosen)} over ${name(e.pitch)}")
        val w = personal.weights.asArray()
        val diff = DoubleArray(4) { w[it] * (mine.context[it] - other.context[it]) }
        if (diff[0] > 0.3) out.add("${name(chosen)} belongs to $key")
        if (diff[0] < -0.3) out.add("${name(chosen)} is outside $key")
        if (chord != null && diff[1] > 0.2) out.add("${name(chosen)} is in the chord ${chord.label(key)}")
        if (diff[2] > 0.2 && prev != null) out.add(if (abs(chosen - prev) <= 2) "Moves by step from ${name(prev)}" else "Smoother melodic line")
        if (rep != null && rep.pitch == chosen && diff[3] > 0.2) out.add("Same note as in bar ${rep.bar}")
        return out
    }

    companion object {
        const val CONTEXT_SCALE = 1.5
        const val CONTEXT_CAP = 3.0

        fun lg(p: Double): Double { val c = p.coerceIn(1e-4, 1 - 1e-4); return ln(c / (1 - c)) }
        fun sigmoid(x: Double) = 1 / (1 + exp(-x))

        fun softmax(s: List<Double>): List<Double> {
            val m = s.max()
            val e = s.map { exp(it - m) }
            val z = e.sum()
            return e.map { it / z }
        }

        private fun normLog(v: List<Double>): List<Double> {
            val z = v.sum().coerceAtLeast(1e-12)
            return v.map { ln((it / z).coerceAtLeast(1e-9)) }
        }

        /** Melodic interval likelihood: steps and consonant leaps are common, tritones, sevenths and huge leaps rare. */
        fun intervalLikelihood(i: Int): Double {
            val a = abs(i)
            val shape = when (a) {
                0 -> 1.3; 1, 2 -> 1.4; 3, 4 -> 1.15; 5 -> 1.1; 7 -> 1.2; 12 -> 1.3; 6 -> 0.5; 10, 11 -> 0.6
                else -> if (a > 12) 0.5 else 1.0
            }
            return exp(-a / 3.5) * shape
        }
    }
}

/**
 * Finds earlier passages that the music around a note repeats, and what was clearly heard there.
 * Notes are compared by pitch and beat position; at least [minMatches] context notes and [minFraction] of them
 * must match at the same shift.
 */
class RepetitionIndex(
    private val notes: List<Line>,
    private val grid: BeatGrid,
    private val window: Double = 4.0,
    private val minMatches: Int = 4,
    private val minFraction: Double = 0.75,
) {
    /** A clearly heard note on a hand's line, with its beat position. */
    data class Line(val id: Int, val pitch: Int, val beat: Double, val hand: Hand, val clear: Boolean)

    data class Prediction(val pitch: Int, val bar: Int)

    private val byHandPitch = notes.filter { it.clear }.groupBy { it.hand to it.pitch }
    private val byHand = notes.filter { it.clear }.groupBy { it.hand }.mapValues { (_, v) -> v.sortedBy { it.beat } }

    fun predict(e: NoteEvent, ctx: Context): Prediction? {
        val hand = ctx.hands[e.id] ?: return null
        val b = grid.position(e.onset)
        val line = byHand[hand] ?: return null
        val around = line.filter { it.id != e.id && abs(it.beat - b) <= window }
        if (around.size < minMatches) return null
        // vote for shifts that map context notes onto earlier notes of the same pitch
        val votes = HashMap<Int, Int>()
        for (n in around) {
            for (m in byHandPitch[hand to n.pitch] ?: emptyList()) {
                val shift = n.beat - m.beat
                if (shift < window + 1.0) continue // must be an earlier, separate passage
                val q = (shift * 4).roundToInt()
                votes[q] = (votes[q] ?: 0) + 1
            }
        }
        val best = votes.entries.filter { it.value >= minMatches }.sortedByDescending { it.value }.take(3)
        for ((q, _) in best) {
            val shift = q / 4.0
            val matched = around.count { n -> (byHandPitch[hand to n.pitch] ?: emptyList()).any { abs(it.beat - (n.beat - shift)) <= 0.15 } }
            if (matched < minMatches || matched < minFraction * around.size) continue
            val target = b - shift
            val there = line.filter { abs(it.beat - target) <= 0.15 }
            if (there.isEmpty()) continue
            // the note at the aligned place closest in pitch to what was heard now
            val cand = there.minByOrNull { abs(it.pitch - e.pitch) }!!
            if (abs(cand.pitch - e.pitch) > 2) continue
            val bar = floor((target - grid.firstBarBeat()) / grid.beatsPerBar).toInt() + 1
            return Prediction(cand.pitch, bar)
        }
        return null
    }
}
