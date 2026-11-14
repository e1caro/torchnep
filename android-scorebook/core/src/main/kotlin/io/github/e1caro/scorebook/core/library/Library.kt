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
    fun takesOf(songId: String) = takes.filter { it.songId == songId && it.trashedAt == null }.sortedBy { it.created }
    fun song(id: String) = songs.firstOrNull { it.id == id }

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
)

object Codec {
    val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    fun encode(l: Library): String = json.encodeToString(l)
    fun library(s: String): Library = json.decodeFromString(s)
    fun encode(t: TakeData): String = json.encodeToString(t)
    fun take(s: String): TakeData = json.decodeFromString(s)
    fun encode(p: PersonalModel): String = json.encodeToString(p)
    fun personal(s: String): PersonalModel = json.decodeFromString(s)
}
