package io.github.e1caro.scorebook.core.library

import io.github.e1caro.scorebook.core.correct.AnalysisSettings
import io.github.e1caro.scorebook.core.correct.NoteOverride
import io.github.e1caro.scorebook.core.correct.PersonalModel
import io.github.e1caro.scorebook.core.transcribe.NoteEvent
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Serializable
data class Album(val id: String, val name: String, val created: Long)

@Serializable
data class Song(
    val id: String,
    val albumId: String,
    val title: String,
    val autoTitle: Boolean = true,
    val created: Long,
    val favorite: Boolean = false,
    val tags: List<String> = emptyList(),
)

/** What the library list shows about a take, without loading it. */
@Serializable
data class TakeMeta(
    val id: String,
    val songId: String,
    val created: Long,
    val seconds: Double,
    val key: String,
    val bpm: Int,
    val meter: String,
    val source: String, // "mic" or "midi"
    val notes: Int,
    val trashedAt: Long? = null,
)

@Serializable
data class Library(
    val albums: List<Album> = listOf(Album(INBOX, "Ideas", 0)),
    val songs: List<Song> = emptyList(),
    val takes: List<TakeMeta> = emptyList(),
) {
    /** The most recently saved song that is not in the trash. */
    fun lastSong(): Song? = takes.filter { it.trashedAt == null }.maxByOrNull { it.created }?.let { song(it.songId) }

    fun takesOf(songId: String) = takes.filter { it.songId == songId && it.trashedAt == null }.sortedBy { it.created }
    fun song(id: String) = songs.firstOrNull { it.id == id }

    /** Songs whose takes are all in the trash, most recently deleted first. */
    fun trashedSongs(): List<Song> = songs.filter { s ->
        val all = takes.filter { it.songId == s.id }
        all.isNotEmpty() && all.all { it.trashedAt != null }
    }.sortedByDescending { s -> takes.filter { it.songId == s.id }.maxOf { it.trashedAt ?: 0L } }

    /** Moves the songs' takes to the trash (recoverable for 30 days). */
    fun trash(songIds: Set<String>, now: Long): Library =
        copy(takes = takes.map { if (it.songId in songIds && it.trashedAt == null) it.copy(trashedAt = now) else it })

    fun restore(songIds: Set<String>): Library = copy(takes = takes.map { if (it.songId in songIds) it.copy(trashedAt = null) else it })

    /** Removes the songs and their takes for good; returns the new library and the take ids whose files can go. */
    fun purge(songIds: Set<String>): Pair<Library, List<String>> {
        val gone = takes.filter { it.songId in songIds }.map { it.id }
        return copy(songs = songs.filter { it.id !in songIds }, takes = takes.filter { it.songId !in songIds }) to gone
    }

    /** Songs matching a search (title, tags, key) newest first; [favoritesOnly] narrows to favourites. */
    fun search(query: String = "", favoritesOnly: Boolean = false): List<Song> {
        val q = query.trim().lowercase()
        return songs.filter { s ->
            (!favoritesOnly || s.favorite) && takesOf(s.id).isNotEmpty() && (q.isEmpty() || s.title.lowercase().contains(q) ||
                s.tags.any { it.lowercase().contains(q) } || takesOf(s.id).any { it.key.lowercase().contains(q) })
        }.sortedByDescending { s -> takesOf(s.id).maxOfOrNull { it.created } ?: s.created }
    }

    companion object {
        const val INBOX = "ideas"
    }
}

/** Everything needed to re-analyze a take: the decoder's events (with all alternatives) and the player's choices. */
@Serializable
data class TakeData(
    val id: String,
    val events: List<NoteEvent>,
    val overrides: Map<Int, NoteOverride> = emptyMap(),
    val settings: AnalysisSettings = AnalysisSettings(),
    val hasAudio: Boolean = false,
    /** Cuts, applied in order on top of [events] (and the recording). */
    val edits: List<Edit> = emptyList(),
) {
    /** The notes as they are after the edits. */
    fun editedEvents(): List<NoteEvent> = Edits.apply(events, edits)
}

object Codec {
    val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    fun encode(l: Library): String = json.encodeToString(l)
    fun library(s: String): Library = json.decodeFromString(s)
    fun encode(t: TakeData): String = json.encodeToString(t)
    fun take(s: String): TakeData = json.decodeFromString(s)
    fun encode(p: PersonalModel): String = json.encodeToString(p)
    fun personal(s: String): PersonalModel = json.decodeFromString(s)
    fun encode(c: io.github.e1caro.scorebook.core.commands.CommandConfig): String = json.encodeToString(c)
    fun commands(s: String): io.github.e1caro.scorebook.core.commands.CommandConfig = json.decodeFromString(s)
    fun encode(l: io.github.e1caro.scorebook.core.practice.PracticeLog): String = json.encodeToString(l)
    fun practice(s: String): io.github.e1caro.scorebook.core.practice.PracticeLog = json.decodeFromString(s)
}
