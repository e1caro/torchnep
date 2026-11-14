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

    override fun onCreate() {
        super.onCreate()
        repository = Repository(this)
        prefs = Prefs(this)
        music = Typeface.createFromAsset(assets, "Bravura.otf")
        exporter = Exporter(this, music)
        Thread { repository.purgeTrash(System.currentTimeMillis()) }.start()
    }
}
