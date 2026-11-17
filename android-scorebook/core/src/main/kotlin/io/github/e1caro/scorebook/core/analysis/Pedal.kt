package io.github.e1caro.scorebook.core.analysis

import io.github.e1caro.scorebook.core.correct.TNote
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

/** A stretch of time with the sustain pedal down (seconds of the take). */
data class PedalSpan(val from: Double, val to: Double)

/**
 * Where the sustain pedal was down.
 *
 * From a MIDI keyboard this is known: notes carry the moment their key was let go, and they kept sounding after it
 * only because of the pedal. From the microphone the pedal itself is not heard, only its effect: notes that ring
 * on while their hand has gone somewhere it could not be holding them from (more than an octave away), or more
 * notes ringing in one hand than it has fingers. Without the pedal a note ends when its key is released, so such
 * notes are the pedal's signature.
 */
object Pedal {
    fun spans(notes: List<TNote>): List<PedalSpan> {
        val raw = ArrayList<PedalSpan>()
        // 1. known: the key was released before the sound stopped
        for (n in notes) if (n.keyOff >= 0 && n.offset - n.keyOff > 0.05) raw.add(PedalSpan(n.keyOff, n.offset))
        // 2. inferred, hand by hand, for notes whose key release is not known
        for (hand in notes.map { it.hand }.distinct()) {
            val hs = notes.filter { it.hand == hand && it.keyOff < 0 }.sortedBy { it.onset }
            for ((i, n) in hs.withIndex()) {
                var others = 0
                for (j in i + 1 until hs.size) {
                    val m = hs[j]
                    if (m.onset >= n.offset - RING) break // n has to ring on clearly after m is struck
                    if (m.onset - n.onset < TOGETHER) continue // the same chord
                    others++
                    // out of reach of the hand that plays m, or more notes than fingers
                    if (abs(m.pitch - n.pitch) > REACH || others >= 5) { raw.add(PedalSpan(m.onset, n.offset)); break }
                }
            }
        }
        if (raw.isEmpty()) return emptyList()
        // merge what overlaps or nearly touches (the foot changes the pedal in a fraction of a second)
        raw.sortBy { it.from }
        val out = ArrayList<PedalSpan>()
        var cur = raw[0]
        for (s in raw.drop(1)) {
            if (s.from <= cur.to + GAP) cur = PedalSpan(cur.from, max(cur.to, s.to)) else { out.add(cur); cur = s }
        }
        out.add(cur)
        return out.filter { it.to - it.from >= MIN_SPAN }
    }

    /** Share of the playing time with the pedal down (0..1). */
    fun share(notes: List<TNote>): Double {
        if (notes.isEmpty()) return 0.0
        val start = notes.minOf { it.onset }
        val end = notes.maxOf { it.offset }
        if (end - start < 1.0) return 0.0
        return spans(notes).sumOf { min(it.to, end) - max(it.from, start) }.coerceAtLeast(0.0) / (end - start)
    }

    @JvmField var REACH = 12 // semitones one hand can hold together (an octave)
    @JvmField var RING = 0.25 // seconds a note must ring on after the hand has moved, to count
    @JvmField var TOGETHER = 0.08
    @JvmField var GAP = 0.3
    @JvmField var MIN_SPAN = 0.3
}
