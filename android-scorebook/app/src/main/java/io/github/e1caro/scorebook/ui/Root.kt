package io.github.e1caro.scorebook.ui

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.platform.LocalView
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.viewmodel.compose.viewModel

val Stage = Color(0xFF0E0F12)
val StageRaised = Color(0xFF181A20)
val Ink = Color(0xFFF3EBDD)
val InkDim = Color(0xFF8C8577)
val Gold = Color(0xFFE0A458)
val AiBlue = Color(0xFF6FA8DC)
val RecordRed = Color(0xFFE5484D)

@Composable
fun ScorebookTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Gold, onPrimary = Stage, secondary = AiBlue, background = Stage, surface = StageRaised,
            onBackground = Ink, onSurface = Ink, surfaceVariant = StageRaised, onSurfaceVariant = InkDim, error = RecordRed,
        ),
    ) { Surface(Modifier.fillMaxSize(), color = Stage, content = content) }
}

/** Keeps the screen on while this is shown (listening on a music stand). */
@Composable
fun KeepScreenOn() {
    val view = LocalView.current
    DisposableEffect(Unit) {
        view.keepScreenOn = true
        onDispose { view.keepScreenOn = false }
    }
}

@Composable
fun ScorebookRoot(vm: ScorebookViewModel = viewModel()) {
    var screen by rememberSaveable { mutableStateOf("listen") }
    val take by vm.take.collectAsState()
    val context = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle

    // listen while the app is on screen; stop when it goes to the background
    DisposableEffect(lifecycle) {
        val obs = LifecycleEventObserver { _, e ->
            val mic = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
            when (e) {
                Lifecycle.Event.ON_START -> if (mic) vm.startListening(true)
                Lifecycle.Event.ON_STOP -> vm.stopListening()
                else -> {}
            }
        }
        lifecycle.addObserver(obs)
        onDispose { lifecycle.removeObserver(obs) }
    }

    Box(Modifier.fillMaxSize()) {
        val current = take
        if (current != null) {
            BackHandler { vm.closeTake() }
            TakeScreen(vm, current, onBack = { vm.closeTake() })
        } else when (screen) {
            "library" -> { BackHandler { screen = "listen" }; LibraryScreen(vm, onBack = { screen = "listen" }) }
            "settings" -> { BackHandler { screen = "listen" }; SettingsScreen(vm, onBack = { screen = "listen" }) }
            else -> ListenScreen(vm, onLibrary = { screen = "library" }, onSettings = { screen = "settings" })
        }
    }
}
