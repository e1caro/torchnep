package io.github.e1caro.scorebook.core.library

import io.github.e1caro.scorebook.core.transcribe.NoteEvent
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlin.math.max
import kotlin.math.min

/**
 * An edit to a take, kept as a list on top of the original recording so every edit can be undone.
 * Times are seconds of the take *after* the edits before it in the list.
 */
@Serializable
sealed class Edit {
    /** Removes [from, to) and closes the gap. */
    @Serializable
    @SerialName("cut")
    data class Cut(val from: Double, val to: Double) : Edit()

    /** Keeps only [from, to); it becomes the whole take. */
    @Serializable
    @SerialName("keep")
    data class Keep(val from: Double, val to: Double) : Edit()
}

object Edits {
    /** The take's notes after the edits (ids are kept, so the player's choices still apply). */
    fun apply(events: List<NoteEvent>, edits: List<Edit>): List<NoteEvent> = edits.fold(events) { ev, e -> apply(ev, e) }

    private fun apply(events: List<NoteEvent>, e: Edit): List<NoteEvent> = when (e) {
        is Edit.Cut -> {
            val gap = e.to - e.from
            events.mapNotNull { n ->
                when {
                    n.onset >= e.from && n.onset < e.to -> null
                    n.onset < e.from -> n.copy(offset = min(n.offset, e.from), keyOff = if (n.keyOff >= 0) min(n.keyOff, e.from) else n.keyOff)
                    else -> n.copy(onset = n.onset - gap, offset = n.offset - gap, keyOff = if (n.keyOff >= 0) n.keyOff - gap else n.keyOff)
                }
            }
        }
        is Edit.Keep -> events.filter { it.onset >= e.from && it.onset < e.to }
            .map { it.copy(onset = it.onset - e.from, offset = min(it.offset, e.to) - e.from, keyOff = if (it.keyOff >= 0) min(it.keyOff, e.to) - e.from else it.keyOff) }
    }

    /** The take's recording after the same edits. */
    fun apply(pcm: ShortArray, sampleRate: Int, edits: List<Edit>): ShortArray = edits.fold(pcm) { a, e ->
        val from = (max(0.0, when (e) { is Edit.Cut -> e.from; is Edit.Keep -> e.from }) * sampleRate).toInt().coerceIn(0, a.size)
        val to = (when (e) { is Edit.Cut -> e.to; is Edit.Keep -> e.to } * sampleRate).toInt().coerceIn(from, a.size)
        when (e) {
            is Edit.Cut -> a.copyOfRange(0, from) + a.copyOfRange(to, a.size)
            is Edit.Keep -> a.copyOfRange(from, to)
        }
    }
}
