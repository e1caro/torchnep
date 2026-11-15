package io.github.e1caro.scorebook.core

import io.github.e1caro.scorebook.core.update.Updates
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class UpdatesTest {
    private fun release(tag: String, apk: String?, draft: Boolean = false, body: String = "New things.\n\n**Install on Android:** download it.", size: Long = 132_929_292) = """
        {"tag_name": "$tag", "name": "Release $tag", "draft": $draft, "prerelease": false, "body": ${kotlinx.serialization.json.JsonPrimitive(body)},
         "assets": [${if (apk == null) "" else """{"name": "x.apk", "size": $size, "browser_download_url": "$apk"}"""}], "extra": {"ignored": 1}}"""

    private val base = Updates.DOWNLOAD_PREFIX

    @Test
    fun theNewestScorebookReleaseIsFoundAmongTheOtherApps() {
        val list = "[" + listOf(
            release("app-12", "${base}app-12/FitQuest-1.12.apk"),
            release("scorebook-34", "${base}scorebook-34/Scorebook-1.34.apk"),
            release("scorebook-40", "${base}scorebook-40/Scorebook-1.40.apk", body = "Motifs.\nPlay-along check.\n\n**Install on Android:** …"),
            release("scorebook-9", "${base}scorebook-9/Scorebook-1.9.apk"),
            release("bizsim-2", "${base}bizsim-2/BizSim-1.2.apk"),
            release("scorebook-45", "${base}scorebook-45/Scorebook-1.45.apk", draft = true), // not published yet
            release("scorebook-44", null), // published without its APK
            release("scorebook-43", "https://example.org/Scorebook-1.43.apk"), // not from the project's downloads
            release("v2.0", "${base}v2.0/whatever.apk"),
        ).joinToString(",") + "]"
        assertEquals(listOf(40, 34, 9), Updates.releases(list).map { it.version })
        val u = Updates.newer(list, 34)!!
        assertEquals(40, u.version)
        assertEquals("${base}scorebook-40/Scorebook-1.40.apk", u.apkUrl)
        assertEquals("Motifs.\nPlay-along check.", u.notes) // without the install instructions
        assertEquals("133 MB", u.sizeText)
        assertNull(Updates.newer(list, 40)) // up to date
        assertNull(Updates.newer(list, 41)) // a build newer than any release
        assertEquals(40, Updates.newer(list, 1)!!.version)
        assertNull(Updates.newer("[]", 1))
        assertTrue(Updates.RELEASES_URL.startsWith("https://api.github.com/repos/"))
    }
}
