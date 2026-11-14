plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

// versionCode and versionName come from the workflow (-PversionCode=12 -PversionName=1.12)
val vCode = (project.findProperty("versionCode") as String?)?.toInt() ?: 1
val vName = (project.findProperty("versionName") as String?) ?: "1.0"

android {
    namespace = "io.github.e1caro.scorebook"
    compileSdk = 36

    defaultConfig {
        applicationId = "io.github.e1caro.scorebook"
        minSdk = 26
        targetSdk = 36
        versionCode = vCode
        versionName = vName
    }

    // Signing: the key file and its password come from environment variables, never from git.
    // Every release must use the same key, so each APK installs over the previous one and keeps its data.
    signingConfigs {
        create("release") {
            storeFile = file(System.getenv("SCOREBOOK_KEYSTORE_FILE") ?: "../scorebook.jks")
            storePassword = System.getenv("SCOREBOOK_KEY_PASS")
            keyAlias = System.getenv("SCOREBOOK_KEY_ALIAS") ?: "fitquest"
            keyPassword = System.getenv("SCOREBOOK_KEY_PASS")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (System.getenv("SCOREBOOK_KEY_PASS") != null) signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    packaging {
        jniLibs { useLegacyPackaging = false }
    }
}

dependencies {
    implementation(project(":core"))

    val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-core")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")

    // LiteRT (TensorFlow Lite) runs the Basic Pitch transcription model on the phone
    implementation("com.google.ai.edge.litert:litert:1.2.0")
}
