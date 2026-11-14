package io.github.e1caro.scorebook.core.export

import io.github.e1caro.scorebook.core.analysis.Ticks
import io.github.e1caro.scorebook.core.music.Mode
import io.github.e1caro.scorebook.core.music.Spelling
import io.github.e1caro.scorebook.core.score.ChordElement
import io.github.e1caro.scorebook.core.score.Element
import io.github.e1caro.scorebook.core.score.RestElement
import io.github.e1caro.scorebook.core.score.Score

/** MusicXML 4.0 (partwise): one piano part, two staves, chord symbols, ties, triplets, key changes. */
object MusicXmlWriter {
    fun write(score: Score, composer: String = "Scorebook"): String {
        val sb = StringBuilder()
        sb.append("""<?xml version="1.0" encoding="UTF-8" standalone="no"?>""").append('\n')
        sb.append("""<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">""").append('\n')
        sb.append("""<score-partwise version="4.0">""").append('\n')
        sb.append("  <work><work-title>${esc(score.title)}</work-title></work>\n")
        sb.append("  <identification><creator type=\"composer\">${esc(composer)}</creator><encoding><software>Scorebook</software></encoding></identification>\n")
        sb.append("  <part-list><score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list>\n")
        sb.append("  <part id=\"P1\">\n")
        for (m in score.measures) {
            sb.append("    <measure number=\"${m.number}\">\n")
            if (m.number == 1 || m.keyChange) {
                sb.append("      <attributes>\n")
                if (m.number == 1) sb.append("        <divisions>${Ticks.QUARTER}</divisions>\n")
                sb.append("        <key><fifths>${m.key.fifths}</fifths><mode>${if (m.key.mode == Mode.MAJOR) "major" else "minor"}</mode></key>\n")
                if (m.number == 1) {
                    sb.append("        <time><beats>${score.numerator}</beats><beat-type>${score.denominator}</beat-type></time>\n")
                    sb.append("        <staves>2</staves>\n")
                    sb.append("        <clef number=\"1\"><sign>G</sign><line>2</line></clef>\n")
                    sb.append("        <clef number=\"2\"><sign>F</sign><line>4</line></clef>\n")
                }
                sb.append("      </attributes>\n")
            }
            if (m.number == 1) {
                sb.append("      <direction placement=\"above\"><direction-type><metronome><beat-unit>quarter</beat-unit>${if (score.compound) "<beat-unit-dot/>" else ""}<per-minute>${score.bpm}</per-minute></metronome></direction-type><staff>1</staff><sound tempo=\"${if (score.compound) score.bpm * 3 / 2 else score.bpm}\"/></direction>\n")
            }
            for ((staffIdx, elements) in m.staves.withIndex()) {
                if (staffIdx == 1) sb.append("      <backup><duration>${m.ticks}</duration></backup>\n")
                val voice = if (staffIdx == 0) 1 else 5
                for (e in elements) {
                    if (staffIdx == 0) for (c in m.chords.filter { it.tick == e.tick }) harmony(sb, c.label)
                    note(sb, e, staffIdx + 1, voice)
                }
            }
            sb.append("    </measure>\n")
        }
        sb.append("  </part>\n</score-partwise>\n")
        return sb.toString()
    }

    private fun harmony(sb: StringBuilder, label: String) {
        val m = Regex("^([A-G])([#b]?)(.*)$").find(label) ?: return
        val (step, acc, rest) = m.destructured
        val kind = when (rest) {
            "" -> "major"; "m" -> "minor"; "dim" -> "diminished"; "aug" -> "augmented"; "7" -> "dominant"; "maj7" -> "major-seventh"
            "m7" -> "minor-seventh"; "m7b5" -> "half-diminished"; "dim7" -> "diminished-seventh"; "sus4" -> "suspended-fourth"; "sus2" -> "suspended-second"
            else -> "major"
        }
        val alter = when (acc) { "#" -> "<root-alter>1</root-alter>"; "b" -> "<root-alter>-1</root-alter>"; else -> "" }
        sb.append("      <harmony><root><root-step>$step</root-step>$alter</root><kind text=\"${esc(rest)}\">$kind</kind><staff>1</staff></harmony>\n")
    }

    private fun note(sb: StringBuilder, e: Element, staff: Int, voice: Int) {
        val d = e.duration
        val common = buildString {
            append("<duration>${d.ticks}</duration>")
            if (e is ChordElement) {
                val n0 = e.notes.first()
                if (n0.tieFromPrev) append("<tie type=\"stop\"/>")
                if (n0.tieToNext) append("<tie type=\"start\"/>")
            }
            append("<voice>$voice</voice><type>${d.type.musicXml}</type>")
            repeat(d.dots) { append("<dot/>") }
        }
        val tm = if (d.triplet) "<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>" else ""
        when (e) {
            is RestElement -> sb.append("      <note><rest${if (e.wholeMeasure) " measure=\"yes\"" else ""}/>$common$tm<staff>$staff</staff></note>\n")
            is ChordElement -> e.notes.forEachIndexed { i, n ->
                val p = n.pitch
                val alter = if (p.alter != 0) "<alter>${p.alter}</alter>" else ""
                val ties = buildString {
                    if (n.tieFromPrev) append("<tie type=\"stop\"/>")
                    if (n.tieToNext) append("<tie type=\"start\"/>")
                }
                val rest = common.replace(Regex("<tie type=\"(start|stop)\"/>"), "").replace("<duration>${d.ticks}</duration>", "<duration>${d.ticks}</duration>$ties")
                val acc = n.accidental?.let { "<accidental>${when (it) { 1 -> "sharp"; -1 -> "flat"; 2 -> "double-sharp"; -2 -> "flat-flat"; else -> "natural" }}</accidental>" } ?: ""
                val notations = buildString {
                    if (n.tieFromPrev || n.tieToNext) {
                        append("<notations>")
                        if (n.tieFromPrev) append("<tied type=\"stop\"/>")
                        if (n.tieToNext) append("<tied type=\"start\"/>")
                        append("</notations>")
                    }
                }
                sb.append("      <note>${if (i > 0) "<chord/>" else ""}<pitch><step>${Spelling.LETTERS[p.step]}</step>$alter<octave>${p.octave}</octave></pitch>$rest$acc$tm<staff>$staff</staff>$notations</note>\n")
            }
        }
    }

    private fun esc(s: String) = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;")
}
