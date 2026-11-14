package io.github.e1caro.scorebook.data

import android.content.Context
import io.github.e1caro.scorebook.core.correct.PersonalModel
import io.github.e1caro.scorebook.core.library.Codec
import io.github.e1caro.scorebook.core.library.Library
import io.github.e1caro.scorebook.core.library.TakeData
import java.io.File

/** Everything Scorebook keeps on the phone: the library index, each take (events + choices + audio), what it learned. */
class Repository(context: Context) {
    val root = File(context.filesDir, "scorebook").apply { mkdirs() }
    private val takesDir = File(root, "takes").apply { mkdirs() }
    private val libraryFile = File(root, "library.json")
    private val personalFile = File(root, "personal.json")

    @Synchronized
    fun library(): Library = try { if (libraryFile.exists()) Codec.library(libraryFile.readText()) else Library() } catch (_: Exception) { Library() }

    @Synchronized
    fun save(lib: Library) = atomicWrite(libraryFile, Codec.encode(lib))

    @Synchronized
    fun personal(): PersonalModel = try { if (personalFile.exists()) Codec.personal(personalFile.readText()) else PersonalModel() } catch (_: Exception) { PersonalModel() }

    @Synchronized
    fun save(p: PersonalModel) = atomicWrite(personalFile, Codec.encode(p))

    fun take(id: String): TakeData? = File(takesDir, "$id.json").takeIf { it.exists() }?.let { Codec.take(it.readText()) }

    fun save(t: TakeData) = atomicWrite(File(takesDir, "${t.id}.json"), Codec.encode(t))

    fun audioFile(id: String) = File(takesDir, "$id.wav")

    /** Removes takes that have been in the trash for more than 30 days. */
    @Synchronized
    fun purgeTrash(now: Long) {
        val lib = library()
        val old = lib.takes.filter { it.trashedAt != null && now - it.trashedAt!! > 30L * 24 * 3600 * 1000 }
        if (old.isEmpty()) return
        for (t in old) { File(takesDir, "${t.id}.json").delete(); audioFile(t.id).delete() }
        save(lib.copy(takes = lib.takes - old.toSet()))
    }

    private fun atomicWrite(f: File, s: String) {
        val tmp = File(f.parentFile, f.name + ".tmp")
        tmp.writeText(s)
        if (!tmp.renameTo(f)) { f.delete(); tmp.renameTo(f) }
    }
}

/** Small settings kept in SharedPreferences. */
class Prefs(context: Context) {
    private val sp = context.getSharedPreferences("scorebook", Context.MODE_PRIVATE)
    var silenceSeconds: Float
        get() = sp.getFloat("silence", 5f)
        set(v) = sp.edit().putFloat("silence", v).apply()
    var musical: Float
        get() = sp.getFloat("musical", 0.6f)
        set(v) = sp.edit().putFloat("musical", v).apply()
    var strictness: Float
        get() = sp.getFloat("strictness", 0.5f)
        set(v) = sp.edit().putFloat("strictness", v).apply()
    var autoPdf: Boolean
        get() = sp.getBoolean("autoPdf", true)
        set(v) = sp.edit().putBoolean("autoPdf", v).apply()
}
