package io.github.e1caro.scorebook.core.export

import io.github.e1caro.scorebook.core.analysis.Pedal
import io.github.e1caro.scorebook.core.correct.Hand
import io.github.e1caro.scorebook.core.correct.Transcription
import java.io.ByteArrayOutputStream
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * Standard MIDI file (type 1): a tempo track with one tempo event per detected beat, then one track per hand.
 * Notes keep the performance as it was: when each was struck and how long it really sounded (not the tidied
 * lengths of the score), placed on the beat grid so the file still lines up with bars in a DAW or notation
 * program. The sustain pedal is written too (controller 64): from a MIDI keyboard as it was used, with each
 * note ending where its key was released; from the microphone where the notes show it was down (see [Pedal]).
 */
object MidiWriter {
    const val PPQ = 480

    fun write(t: Transcription, title: String): ByteArray {
        val grid = t.grid
        val beatQuarters = if (grid.compound) 1.5 else 1.0
        fun tickOf(sec: Double): Int = ((grid.tickOf(grid.position(sec)) / 48.0) * PPQ).roundToInt().coerceAtLeast(0)
        // tempo track
        val tempo = ArrayList<Pair<Int, ByteArray>>()
        tempo.add(0 to meta(0x03, title.toByteArray(Charsets.UTF_8)))
        tempo.add(0 to meta(0x58, byteArrayOf(grid.numerator.toByte(), log2(grid.denominator).toByte(), 24, 8)))
        val key = t.keys.firstOrNull()?.key
        if (key != null) tempo.add(0 to meta(0x59, byteArrayOf(key.fifths.toByte(), if (key.mode.name == "MINOR") 1 else 0)))
        val first = grid.firstBarBeat()
        for (i in 0 until grid.beats.size - 1) {
            val secPerBeat = (grid.beats[i + 1] - grid.beats[i]).coerceIn(0.15, 3.0)
            val usPerQuarter = (secPerBeat / beatQuarters * 1_000_000).roundToInt()
            val tick = (((i - first) * grid.beatTicks / 48.0) * PPQ).roundToInt()
            if (tick < 0) continue
            tempo.add(tick to meta(0x51, byteArrayOf((usPerQuarter shr 16).toByte(), (usPerQuarter shr 8).toByte(), usPerQuarter.toByte())))
        }
        for (c in t.keyChanges().drop(1)) tempo.add(max(0, (c.tick / 48.0 * PPQ).roundToInt()) to meta(0x59, byteArrayOf(c.key.fifths.toByte(), if (c.key.mode.name == "MINOR") 1 else 0)))
        val tracks = mutableListOf(track(tempo))
        val pedal = Pedal.spans(t.notes)
        for ((ch, hand) in Hand.entries.withIndex()) {
            val ev = ArrayList<Pair<Int, ByteArray>>()
            ev.add(0 to meta(0x03, (if (hand == Hand.RIGHT) "Right hand" else "Left hand").toByteArray()))
            ev.add(0 to byteArrayOf((0xC0 or ch).toByte(), 0))
            // the pedal acts on the whole instrument: the same events on both hands' channels
            for (span in pedal) {
                val down = tickOf(span.from)
                ev.add(down to byteArrayOf((0xB0 or ch).toByte(), 64, 127))
                ev.add(max(down + 1, tickOf(span.to)) to byteArrayOf((0xB0 or ch).toByte(), 64, 0))
            }
            for (n in t.notes.filter { it.hand == hand }) {
                val on = tickOf(n.onset)
                // the key's own release when it is known (the pedal events above carry the rest of the sound)
                val off = max(on + 1, tickOf(if (n.keyOff >= 0) n.keyOff else n.offset))
                ev.add(on to byteArrayOf((0x90 or ch).toByte(), n.pitch.toByte(), n.velocity.coerceIn(1, 127).toByte()))
                ev.add(off to byteArrayOf((0x80 or ch).toByte(), n.pitch.toByte(), 0))
            }
            tracks.add(track(ev))
        }
        val out = ByteArrayOutputStream()
        out.write("MThd".toByteArray()); out.write(int32(6)); out.write(int16(1)); out.write(int16(tracks.size)); out.write(int16(PPQ))
        for (tr in tracks) out.write(tr)
        return out.toByteArray()
    }

    private fun log2(x: Int): Int { var v = x; var r = 0; while (v > 1) { v = v shr 1; r++ }; return r }

    private fun meta(type: Int, data: ByteArray): ByteArray = byteArrayOf(0xFF.toByte(), type.toByte()) + varLen(data.size) + data

    /** Events sorted by tick (note-offs before note-ons at the same tick), delta-encoded, end-of-track appended. */
    private fun track(events: List<Pair<Int, ByteArray>>): ByteArray {
        val body = ByteArrayOutputStream()
        var last = 0
        for ((tick, data) in events.sortedWith(compareBy({ it.first }, { if ((it.second[0].toInt() and 0xF0) == 0x80) 0 else 1 }))) {
            body.write(varLen(tick - last)); body.write(data); last = tick
        }
        body.write(varLen(0)); body.write(byteArrayOf(0xFF.toByte(), 0x2F, 0))
        val b = body.toByteArray()
        return "MTrk".toByteArray() + int32(b.size) + b
    }

    private fun varLen(v: Int): ByteArray {
        var value = v.coerceAtLeast(0)
        val bytes = ArrayList<Byte>()
        bytes.add((value and 0x7F).toByte())
        value = value shr 7
        while (value > 0) { bytes.add(0, ((value and 0x7F) or 0x80).toByte()); value = value shr 7 }
        return bytes.toByteArray()
    }

    private fun int32(v: Int) = byteArrayOf((v shr 24).toByte(), (v shr 16).toByte(), (v shr 8).toByte(), v.toByte())
    private fun int16(v: Int) = byteArrayOf((v shr 8).toByte(), v.toByte())
}
