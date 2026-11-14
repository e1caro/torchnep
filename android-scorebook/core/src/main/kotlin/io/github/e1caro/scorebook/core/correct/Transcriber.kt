package io.github.e1caro.scorebook.core.correct

import io.github.e1caro.scorebook.core.analysis.BeatGrid
import io.github.e1caro.scorebook.core.analysis.Chord
import io.github.e1caro.scorebook.core.analysis.ChordTracker
import io.github.e1caro.scorebook.core.analysis.KeyTracker
import io.github.e1caro.scorebook.core.analysis.RhythmAnalyzer
import io.github.e1caro.scorebook.core.analysis.TimedNote
import io.github.e1caro.scorebook.core.analysis.VotingNote
import io.github.e1caro.scorebook.core.music.Key
import io.github.e1caro.scorebook.core.music.Mode
import io.github.e1caro.scorebook.core.transcribe.NoteEvent
import kotlinx.serialization.Serializable
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.min
import kotlin.math.roundToInt

@Serializable
data class AnalysisSettings(
    /** Literal (0) … Musical (1): how much the musical context may decide unclear notes. */
    val musical: Double = 0.6,
    /** Loose (0) … strict (1) rhythm quantization. */
    val strictness: Double = 0.5,
    /** Forced meter (beats per bar, compound) or null to detect it. */
    val beatsPerBar: Int? = null,
    val compound: Boolean? = null,
    /** Semitones to transpose the written score by. */
    val transpose: Int = 0,
)

/** A final note of the score. */
@Serializable
data class TNote(
    val eventId: Int,
    val pitch: Int,
    val onset: Double,
    val offset: Double,
    val velocity: Int,
    val hand: Hand,
    val tick: Int,
    val duration: Int,
    val decision: Decision,
)

@Serializable
data class TimedKey(val key: Key, val tick: Int, val time: Double)

@Serializable
data class TimedChord(val chord: Chord?, val tick: Int, val time: Double)

/** Everything a take's analysis produces: notes, decisions (with alternatives), beats, keys, chords. */
@Serializable
data class Transcription(
    val notes: List<TNote>,
    val decisions: List<NoteDecision>,
    val grid: BeatGrid,
    val keys: List<TimedKey>,
    val chords: List<TimedChord>,
    val transpose: Int = 0,
) {
    /** The key a musician would name the piece by: the opening key, unless it is only a short introduction. */
    val mainKey: Key
        get() {
            if (keys.isEmpty()) return Key(0, Mode.MAJOR)
            val end = notes.maxOfOrNull { it.offset } ?: keys.last().time
            fun span(i: Int) = (keys.getOrNull(i + 1)?.time ?: end) - keys[i].time
            val total = (end - keys.first().time).coerceAtLeast(1e-6)
            return if (span(0) >= 0.3 * total) keys[0].key else keys.indices.maxByOrNull { span(it) }!!.let { keys[it].key }
        }

    val bpm: Int get() = grid.bpm.roundToInt()

    fun keyAtTick(tick: Int): Key = keys.lastOrNull { it.tick <= tick }?.key ?: keys.firstOrNull()?.key ?: Key(0, Mode.MAJOR)

    fun decision(eventId: Int): NoteDecision? = decisions.firstOrNull { it.eventId == eventId }

    fun keyChanges(): List<TimedKey> = keys.filterIndexed { i, k -> i == 0 || keys[i - 1].key != k.key }
}

/**
 * The whole analysis of a take, from note events (audio or MIDI) to a transcription:
 *  1. provisional notes from audio alone → beats, tempo, meter
 *  2. key (HMM) and chords from clearly heard notes
 *  3. correction pass 1 (audio × context), re-estimate key and chords, correction pass 2
 *  4. quantization and hand split of the final notes
 */
class Transcriber(val personal: PersonalModel = PersonalModel()) {
    private val corrector = NoteCorrector(personal)
    private val keyTracker = KeyTracker()
    private val chordTracker = ChordTracker()

    fun analyze(
        events: List<NoteEvent>,
        settings: AnalysisSettings = AnalysisSettings(),
        overrides: Map<Int, NoteOverride> = emptyMap(),
    ): Transcription {
        val rhythm = RhythmAnalyzer(settings.strictness)
        // 1. provisional: audio alone
        var provisional = events.associate { e ->
            val ov = overrides[e.id]
            e.id to Provisional(ov?.pitch ?: e.pitch, if (ov != null) !ov.deleted else e.presence >= 0.5, confidence(e, e.pitch))
        }
        val present = events.filter { provisional[it.id]!!.present }
        val meterHint = settings.beatsPerBar?.let { it to (settings.compound ?: false) }
        val grid = rhythm.analyze(present.map { TimedNote(provisional[it.id]!!.pitch, it.onset, it.offset, it.velocity) }, meterHint)

        // 2..3. context from clear notes, two correction passes
        var decisions: Map<Int, NoteDecision> = emptyMap()
        var keys: KeyTracker.Result? = null
        var chordSteps: List<Chord?> = emptyList()
        repeat(2) {
            val voters = events.mapNotNull { e ->
                val p = provisional[e.id]!!
                if (!p.present) null else VotingNote(p.pitch, e.onset, e.offset, p.confidence * p.confidence)
            }
            val bounds = stepBounds(grid, events)
            val chroma = keyTracker.chroma(voters, bounds)
            keys = keyTracker.track(chroma)
            chordSteps = chordsPerStep(chroma, voters, bounds, keys!!, grid)
            val hands = hands(events, provisional)
            val melody = melodyNeighbours(events, provisional, hands)
            val repetition = RepetitionIndex(
                events.filter { provisional[it.id]!!.present }.map { e ->
                    val p = provisional[e.id]!!
                    RepetitionIndex.Line(e.id, p.pitch, grid.position(e.onset), hands[e.id] ?: Hand.RIGHT, p.confidence >= 0.7)
                },
                grid,
            )
            val ctx = Context(grid, keys!!, chordSteps, hands, melody, repetition)
            decisions = events.associate { it.id to corrector.decide(it, ctx, settings.musical, overrides[it.id]) }
            // next pass votes with the corrected notes, weighted by how well the audio supports the chosen pitch
            provisional = events.associate { e ->
                val d = decisions[e.id]!!
                e.id to Provisional(d.pitch, d.present, if (d.decision == Decision.USER) 1.0 else confidence(e, d.pitch))
            }
        }

        // 4. final notes: quantize, split hands
        val finals = events.filter { decisions[it.id]!!.present }.sortedBy { it.onset }
        val timed = finals.map { TimedNote(decisions[it.id]!!.pitch, it.onset, it.offset, it.velocity) }
        val q = rhythm.quantize(timed, grid)
        val handMap = HandSplitter.split(finals.map { HandSplitter.In(it.id, decisions[it.id]!!.pitch, it.onset) })
        val notes = finals.mapIndexed { i, e ->
            val d = decisions[e.id]!!
            TNote(e.id, d.pitch + settings.transpose, e.onset, e.offset, e.velocity, handMap[e.id] ?: Hand.RIGHT, q[i].tick, q[i].duration, d.decision)
        }
        val k = keys!!
        val keyList = k.regions.map { r -> TimedKey(r.key.transpose(settings.transpose), grid.tickOf(r.fromStep.toDouble()).roundToInt(), grid.time(r.fromStep.toDouble())) }
            .ifEmpty { listOf(TimedKey(Key(0, Mode.MAJOR).transpose(settings.transpose), 0, 0.0)) }
        val chordList = ArrayList<TimedChord>()
        chordSteps.forEachIndexed { s, c ->
            if (s == 0 || c != chordSteps[s - 1]) chordList.add(TimedChord(c?.transpose(settings.transpose), grid.tickOf(s.toDouble()).roundToInt(), grid.time(s.toDouble())))
        }
        return Transcription(
            notes = notes,
            decisions = events.map { decisions[it.id]!! },
            grid = grid,
            keys = keyList,
            chords = chordList,
            transpose = settings.transpose,
        )
    }

    /** Learn from a switch the player made on the note [eventId] (to [newPitch], or -1 = deleted). */
    fun learn(events: List<NoteEvent>, t: Transcription, eventId: Int, newPitch: Int, settings: AnalysisSettings): PersonalModel {
        val e = events.firstOrNull { it.id == eventId } ?: return personal
        val d = t.decision(eventId) ?: return personal
        if (e.fromMidi) return personal
        return personal.learn(corrector.example(e, d, settings.musical, newPitch))
    }

    private data class Provisional(val pitch: Int, val present: Boolean, val confidence: Double)

    /** How much a note may vote in key and chord estimation: its audio support, so unclear notes barely count. */
    private fun confidence(e: NoteEvent, pitch: Int): Double = if (e.fromMidi) 1.0 else (e.presence * e.audioP(pitch)).coerceIn(0.0, 1.0)

    /** Time steps for key and chord analysis: the beats, covering every event. */
    private fun stepBounds(grid: BeatGrid, events: List<NoteEvent>): List<Double> {
        val end = (events.maxOfOrNull { it.offset } ?: 0.0) + 0.01
        val out = ArrayList<Double>()
        var i = 0
        while (true) {
            val t = grid.time(i.toDouble())
            out.add(t)
            if (t > end) break
            i++
        }
        if (out.size < 2) out.add(out.last() + grid.period)
        return out
    }

    private fun chordsPerStep(
        chroma: Array<DoubleArray>, voters: List<VotingNote>, bounds: List<Double>, keys: KeyTracker.Result, grid: BeatGrid,
    ): List<Chord?> {
        val steps = chroma.size
        val bass = IntArray(steps) { -1 }
        for (n in voters) {
            if (n.weight < 0.2) continue
            var s = KeyTracker.stepOf(bounds, n.onset).coerceIn(0, steps - 1)
            while (s < steps && bounds[s] < min(n.offset, n.onset + 2.0)) {
                if (bass[s] < 0 || n.pitch < bass[s]) bass[s] = n.pitch
                s++
            }
        }
        val first = grid.firstBarBeat()
        val strong = BooleanArray(steps) { s ->
            val inBar = Math.floorMod(s - first, grid.beatsPerBar)
            inBar == 0 || (grid.beatsPerBar == 4 && inBar == 2)
        }
        val keyPerStep = List(steps) { keys.keyAt(it) }
        val spans = chordTracker.track(chroma, bass, keyPerStep, strong)
        val out = arrayOfNulls<Chord>(steps)
        for (sp in spans) for (s in sp.fromStep until sp.toStep) out[s] = sp.chord
        return out.toList()
    }

    private fun hands(events: List<NoteEvent>, prov: Map<Int, Provisional>): Map<Int, Hand> {
        val presentEvents = events.filter { prov[it.id]!!.present }
        val split = HandSplitter.split(presentEvents.map { HandSplitter.In(it.id, prov[it.id]!!.pitch, it.onset) }).toMutableMap()
        for (e in events) {
            if (e.id in split) continue
            val near = presentEvents.filter { abs(it.onset - e.onset) < 0.25 }.minByOrNull { abs(prov[it.id]!!.pitch - e.pitch) }
            split[e.id] = near?.let { split[it.id] } ?: if (e.pitch >= 60) Hand.RIGHT else Hand.LEFT
        }
        return split
    }

    /** For outer-voice notes (top of the right hand, bottom of the left hand): previous and next pitch on that line. */
    private fun melodyNeighbours(events: List<NoteEvent>, prov: Map<Int, Provisional>, hands: Map<Int, Hand>): Map<Int, Pair<Int?, Int?>> {
        val out = HashMap<Int, Pair<Int?, Int?>>()
        for (hand in Hand.entries) {
            val mine = events.filter { hands[it.id] == hand }.sortedBy { it.onset }
            // groups of notes struck together
            val groups = ArrayList<MutableList<NoteEvent>>()
            for (e in mine) {
                if (groups.isNotEmpty() && e.onset - groups.last().first().onset <= 0.05) groups.last().add(e) else groups.add(mutableListOf(e))
            }
            fun outer(g: List<NoteEvent>): NoteEvent? {
                val pres = g.filter { prov[it.id]!!.present }
                if (pres.isEmpty()) return null
                return if (hand == Hand.RIGHT) pres.maxByOrNull { prov[it.id]!!.pitch } else pres.minByOrNull { prov[it.id]!!.pitch }
            }
            val outers = groups.map { outer(it) }
            for ((gi, g) in groups.withIndex()) {
                val o = outers[gi] ?: continue
                val prev = (gi - 1 downTo 0).asSequence().mapNotNull { outers[it] }.firstOrNull()?.takeIf { o.onset - it.onset < 2.5 }
                val next = (gi + 1 until groups.size).asSequence().mapNotNull { outers[it] }.firstOrNull()?.takeIf { it.onset - o.onset < 2.5 }
                // the outer note, and any note that is torn between pitches around it
                for (e in g) {
                    if (e.id != o.id && abs(prov[e.id]!!.pitch - prov[o.id]!!.pitch) > 1) continue
                    out[e.id] = prev?.let { prov[it.id]!!.pitch } to next?.let { prov[it.id]!!.pitch }
                }
            }
        }
        return out
    }
}

/** Musical title for an untitled song: "Idea in D minor, 14 Nov". */
object AutoTitle {
    private val MONTHS = listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")

    fun make(key: Key, day: Int, month: Int, kind: String = "Idea"): String = "$kind in ${key.displayName}, $day ${MONTHS[(month - 1).coerceIn(0, 11)]}"
}

/** Floor of a beat position as a bar number (1-based) on [grid]. */
fun BeatGrid.barOf(beatPosition: Double): Int = floor((beatPosition - firstBarBeat()) / beatsPerBar).toInt() + 1
