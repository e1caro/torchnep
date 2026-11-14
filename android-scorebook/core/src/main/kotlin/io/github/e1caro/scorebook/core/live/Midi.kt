package io.github.e1caro.scorebook.core.live

import io.github.e1caro.scorebook.core.transcribe.NoteEvent

/** Turns MIDI note-on/off (and the sustain pedal) into note events. */
class MidiNoteTracker {
    private val open = HashMap<Int, Pair<Double, Int>>()
    private val held = HashMap<Int, Pair<Double, Int>>() // released while the pedal is down
    private var pedal = false
    private val done = ArrayList<NoteEvent>()
    private var nextId = 0

    val events: List<NoteEvent> get() = done

    fun noteOn(pitch: Int, velocity: Int, t: Double) {
        if (velocity == 0) { noteOff(pitch, t); return }
        close(pitch, t)
        open[pitch] = t to velocity
    }

    fun noteOff(pitch: Int, t: Double) {
        val o = open.remove(pitch) ?: return
        if (pedal) held[pitch] = o else done.add(NoteEvent.midi(nextId++, pitch, o.first, t, o.second))
    }

    fun sustain(down: Boolean, t: Double) {
        pedal = down
        if (!down) { for ((p, o) in held) done.add(NoteEvent.midi(nextId++, p, o.first, t, o.second)); held.clear() }
    }

    private fun close(pitch: Int, t: Double) {
        (open.remove(pitch) ?: held.remove(pitch))?.let { done.add(NoteEvent.midi(nextId++, pitch, it.first, t, it.second)) }
    }

    /** All notes so far, the ones still sounding ending at [now]. */
    fun snapshot(now: Double): List<NoteEvent> {
        var id = nextId
        return (done + (open + held).map { (p, o) -> NoteEvent.midi(id++, p, o.first, now, o.second) }).sortedBy { it.onset }
    }

    fun finish(now: Double): List<NoteEvent> {
        for (p in open.keys.toList()) close(p, now)
        for (p in held.keys.toList()) close(p, now)
        return done.sortedBy { it.onset }
    }

    fun reset() { open.clear(); held.clear(); done.clear(); pedal = false; nextId = 0 }
}

/** Parses raw MIDI bytes (running status included) into note and pedal messages. */
class MidiParser(private val onNoteOn: (Int, Int) -> Unit, private val onNoteOff: (Int) -> Unit, private val onSustain: (Boolean) -> Unit = {}) {
    private var status = 0
    private val data = IntArray(2)
    private var count = 0

    fun feed(bytes: ByteArray, offset: Int = 0, length: Int = bytes.size) {
        for (i in offset until offset + length) {
            val b = bytes[i].toInt() and 0xFF
            if (b >= 0xF8) continue // real-time messages do not interrupt
            if (b >= 0x80) { status = if (b < 0xF0) b else 0; count = 0; continue }
            if (status == 0) continue
            data[count++] = b
            val type = status and 0xF0
            val needed = if (type == 0xC0 || type == 0xD0) 1 else 2
            if (count < needed) continue
            count = 0
            when (type) {
                0x90 -> if (data[1] == 0) onNoteOff(data[0]) else onNoteOn(data[0], data[1])
                0x80 -> onNoteOff(data[0])
                0xB0 -> if (data[0] == 64) onSustain(data[1] >= 64)
            }
        }
    }
}
