pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
    }
}
rootProject.name = "Scorebook"

// core: the music engine (transcription decoding, key/tempo/chords, note correction, engraving, exports).
// Plain Kotlin, so it builds and is tested anywhere with a JDK.
include(":core")

// app: the Android app. Needs the Android SDK (ANDROID_HOME or local.properties). On a machine without it,
// `gradle :core:test` still works because the app module is left out.
val hasAndroidSdk = System.getenv("ANDROID_HOME") != null || System.getenv("ANDROID_SDK_ROOT") != null ||
    file("local.properties").let { it.exists() && it.readText().contains("sdk.dir") }
if (hasAndroidSdk) {
    include(":app")
} else {
    // Without the SDK the Android Gradle plugin cannot even be downloaded, so use a root build file without it.
    rootProject.buildFileName = "build.core-only.gradle.kts"
}
