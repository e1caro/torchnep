package io.github.e1caro.scorebook

import android.app.Application
import android.graphics.Typeface
import io.github.e1caro.scorebook.data.Exporter
import io.github.e1caro.scorebook.data.Prefs
import io.github.e1caro.scorebook.data.Repository

class ScorebookApp : Application() {
    lateinit var repository: Repository
        private set
    lateinit var prefs: Prefs
        private set
    lateinit var music: Typeface
        private set
    lateinit var exporter: Exporter
        private set
    lateinit var updater: io.github.e1caro.scorebook.data.Updater
        private set

    private var model: io.github.e1caro.scorebook.audio.TfliteModel? = null

    /**
     * The transcription model, loaded on first use and kept for as long as the app's process lives. It is 109 MB
     * with as much working memory again, so there is exactly one, whoever asks (a second copy per screen session
     * got the process killed for memory on small devices). Null if it cannot be loaded.
     */
    @Synchronized
    fun model(): io.github.e1caro.scorebook.audio.TfliteModel? =
        model ?: (try { io.github.e1caro.scorebook.audio.TfliteModel.load(this) } catch (e: Exception) { null })?.also { model = it }

    override fun onCreate() {
        super.onCreate()
        repository = Repository(this)
        prefs = Prefs(this)
        music = Typeface.createFromAsset(assets, "Bravura.otf")
        exporter = Exporter(this, music)
        updater = io.github.e1caro.scorebook.data.Updater(this)
        Thread { repository.purgeTrash(System.currentTimeMillis()) }.start()
    }
}
