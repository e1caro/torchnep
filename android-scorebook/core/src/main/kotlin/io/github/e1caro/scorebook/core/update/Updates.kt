package io.github.e1caro.scorebook.core.update

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull

/** A published version of the app: [version] is the number after "1." (and the APK's version code). */
data class Update(val version: Int, val name: String, val notes: String, val apkUrl: String, val size: Long) {
    /** "127 MB". */
    val sizeText: String get() = "${(size + 500_000) / 1_000_000} MB"
}

/**
 * Finding a newer version of the app in the project's list of releases on GitHub (the same page the APK links
 * come from). The app only reads that public list and downloads the APK; nothing is sent.
 */
object Updates {
    const val RELEASES_URL = "https://api.github.com/repos/e1caro/torchnep/releases?per_page=40"

    /** APKs are only ever taken from the project's own release downloads. */
    const val DOWNLOAD_PREFIX = "https://github.com/e1caro/torchnep/releases/download/"

    private val TAG = Regex("^scorebook-(\\d+)$")
    private val json = Json { ignoreUnknownKeys = true }

    /** The published Scorebook releases in GitHub's answer, newest first. The repository holds other apps too. */
    fun releases(releasesJson: String): List<Update> {
        val out = ArrayList<Update>()
        for (el in json.parseToJsonElement(releasesJson).jsonArray) {
            val r = el as? JsonObject ?: continue
            if (r["draft"]?.jsonPrimitive?.booleanOrNull == true || r["prerelease"]?.jsonPrimitive?.booleanOrNull == true) continue
            val version = TAG.find(r["tag_name"]?.jsonPrimitive?.content ?: "")?.groupValues?.get(1)?.toIntOrNull() ?: continue
            val apk = r["assets"]?.jsonArray?.map { it.jsonObject }?.firstOrNull {
                val url = it["browser_download_url"]?.jsonPrimitive?.content ?: ""
                url.startsWith(DOWNLOAD_PREFIX) && url.endsWith(".apk")
            } ?: continue
            val body = (r["body"]?.jsonPrimitive?.content ?: "").substringBefore("**Install on Android").trim()
            out.add(Update(version, r["name"]?.jsonPrimitive?.content ?: "Scorebook 1.$version", body,
                apk["browser_download_url"]!!.jsonPrimitive.content, apk["size"]?.jsonPrimitive?.longOrNull ?: 0))
        }
        return out.sortedByDescending { it.version }
    }

    /** The newest release, if it is newer than the installed [current] version. */
    fun newer(releasesJson: String, current: Int): Update? = releases(releasesJson).firstOrNull()?.takeIf { it.version > current }
}
