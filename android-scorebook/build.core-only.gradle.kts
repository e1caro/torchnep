// Root build used when there is no Android SDK (see settings.gradle.kts): only the core module is built.
plugins {
    id("org.jetbrains.kotlin.jvm") version "2.1.21" apply false
    id("org.jetbrains.kotlin.plugin.serialization") version "2.1.21" apply false
}
