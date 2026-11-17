package io.github.e1caro.scorebook.data

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.net.ConnectivityManager
import android.os.Build
import io.github.e1caro.scorebook.core.update.Update
import io.github.e1caro.scorebook.core.update.Updates
import kotlinx.coroutines.flow.MutableStateFlow
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/**
 * Updating the app from inside the app: looks at the project's public list of releases on GitHub, downloads the
 * newer APK and hands it to Android's installer, which replaces the app and keeps its data (every APK is signed
 * with the same key; Android refuses anything else). This is the only thing Scorebook uses the internet for, and
 * nothing is sent.
 */
class Updater(private val context: Context) {
    private val info = context.packageManager.getPackageInfo(context.packageName, 0)

    /** The installed version: the N of "1.N". */
    val currentVersion: Int = if (Build.VERSION.SDK_INT >= 28) info.longVersionCode.toInt() else @Suppress("DEPRECATION") info.versionCode
    val currentName: String = info.versionName ?: "1.$currentVersion"

    private fun open(url: String): HttpURLConnection = (URL(url).openConnection() as HttpURLConnection).apply {
        connectTimeout = 15_000
        readTimeout = 30_000
        setRequestProperty("User-Agent", "Scorebook-Android")
        setRequestProperty("Accept", "application/vnd.github+json")
    }

    /** The newer version, or null when this one is the newest. Throws [IOException] without a connection. */
    fun check(): Update? {
        val c = open(Updates.RELEASES_URL)
        try {
            if (c.responseCode != 200) throw IOException("GitHub answered ${c.responseCode}")
            return Updates.newer(c.inputStream.bufferedReader().use { it.readText() }, currentVersion)
        } finally {
            c.disconnect()
        }
    }

    /** Downloads the APK (or finds it already downloaded). [onProgress]: 0..1. */
    fun download(update: Update, onProgress: (Float) -> Unit): File {
        if (!update.apkUrl.startsWith(Updates.DOWNLOAD_PREFIX)) throw IOException("Unexpected download address")
        val dir = File(context.cacheDir, "update").apply { mkdirs() }
        val apk = File(dir, "Scorebook-1.${update.version}.apk")
        if (apk.exists() && update.size > 0 && apk.length() == update.size) { onProgress(1f); return apk }
        dir.listFiles()?.forEach { it.delete() } // older downloads
        val part = File(dir, apk.name + ".part")
        val c = open(update.apkUrl).apply { setRequestProperty("Accept", "application/octet-stream") }
        try {
            if (c.responseCode != 200) throw IOException("The download answered ${c.responseCode}")
            val total = if (update.size > 0) update.size else c.contentLengthLong
            var done = 0L
            var shown = -1
            c.inputStream.use { input ->
                part.outputStream().use { out ->
                    val buf = ByteArray(1 shl 16)
                    while (true) {
                        val n = input.read(buf)
                        if (n < 0) break
                        out.write(buf, 0, n)
                        done += n
                        val pct = if (total > 0) (done * 100 / total).toInt() else 0
                        if (pct != shown) { shown = pct; onProgress(pct / 100f) }
                    }
                }
            }
            if (update.size > 0 && done != update.size) throw IOException("The download was cut short")
            if (!part.renameTo(apk)) throw IOException("Could not save the download")
            return apk
        } finally {
            c.disconnect()
            if (part.exists()) part.delete()
        }
    }

    /** True on Wi-Fi or another connection that is not billed by the megabyte: fine for a 130 MB download. */
    fun unmetered(): Boolean = try {
        !(context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager).isActiveNetworkMetered
    } catch (e: Exception) { false }

    /**
     * Gets the APK ready inside Android's installer (the slow part: copying 130 MB) without installing it yet.
     * Returns the installer session to [commit] later; earlier unfinished sessions of ours are dropped.
     */
    fun prepare(apk: File): Int {
        val installer = context.packageManager.packageInstaller
        for (old in installer.mySessions) try { installer.abandonSession(old.sessionId) } catch (_: Exception) {}
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
        params.setAppPackageName(context.packageName)
        params.setSize(apk.length())
        // an app updating itself may be allowed to do it without asking (Android 12+, once the user has let it install)
        if (Build.VERSION.SDK_INT >= 31) params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
        val id = installer.createSession(params)
        installer.openSession(id).use { session ->
            session.openWrite("scorebook.apk", 0, apk.length()).use { out ->
                apk.inputStream().use { it.copyTo(out, 1 shl 16) }
                session.fsync(out)
            }
        }
        return id
    }

    /**
     * Installs a prepared session: Android replaces the app and keeps its data. If Android wants the user to
     * confirm, [UpdateReceiver] shows its screen when the app is on screen; otherwise the session is dropped and
     * [needsConfirmation] is set, so the app can ask for one tap next time.
     */
    fun commit(sessionId: Int) {
        val installer = context.packageManager.packageInstaller
        installer.openSession(sessionId).use { session ->
            val intent = Intent(context, UpdateReceiver::class.java).setAction(UpdateReceiver.ACTION)
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
            session.commit(PendingIntent.getBroadcast(context, sessionId, intent, flags).intentSender)
        }
    }

    /** Prepares and installs in one go (the player asked for it and is looking at the app). */
    fun install(apk: File) = commit(prepare(apk))

    companion object {
        /** What the installer said last (a failure message), for the screen to show. */
        val installProblem = MutableStateFlow<String?>(null)

        /** Android asked for the user's confirmation while the app was not on screen: ask for a tap next time. */
        val needsConfirmation = MutableStateFlow(false)

        /** Whether the app is on screen (set by the UI): Android's confirmation can only be shown then. */
        @Volatile var onScreen = false
    }
}

/** Android's installer reports here: it wants the user to confirm, it is done, or it failed. */
class UpdateReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                @Suppress("DEPRECATION")
                val confirm = intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT) ?: return
                if (!Updater.onScreen) {
                    // an automatic install while the app is closed, and Android wants a yes: not now
                    val id = intent.getIntExtra(PackageInstaller.EXTRA_SESSION_ID, -1)
                    if (id >= 0) try { context.packageManager.packageInstaller.abandonSession(id) } catch (_: Exception) {}
                    // remembered across restarts of the app, so the request for a tap is not lost
                    context.getSharedPreferences("scorebook", Context.MODE_PRIVATE).edit().putBoolean("updateNeedsTap", true).apply()
                    Updater.needsConfirmation.value = true
                    return
                }
                try {
                    context.startActivity(confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                } catch (e: Exception) {
                    Updater.installProblem.value = "Android could not show the install screen"
                }
            }
            PackageInstaller.STATUS_SUCCESS -> {} // the app is replaced and restarted by the system
            PackageInstaller.STATUS_FAILURE_ABORTED -> Updater.installProblem.value = "The update was cancelled"
            PackageInstaller.STATUS_FAILURE_STORAGE -> Updater.installProblem.value = "Not enough free space to install the update"
            else -> Updater.installProblem.value = "Android could not install the update" +
                (intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)?.let { " ($it)" } ?: "")
        }
    }

    companion object {
        const val ACTION = "io.github.e1caro.scorebook.UPDATE_STATUS"
    }
}
