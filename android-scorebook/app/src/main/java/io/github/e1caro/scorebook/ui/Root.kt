package io.github.e1caro.scorebook.ui

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.viewmodel.compose.viewModel
import io.github.e1caro.scorebook.R

val Stage = Color(0xFF0E0F12)
val StageRaised = Color(0xFF181A20)
val StageHigh = Color(0xFF22252D)
val Ink = Color(0xFFF3EBDD)
val InkDim = Color(0xFF9A9384)
val Gold = Color(0xFFE0A458)
val AiBlue = Color(0xFF6FA8DC)
val RecordRed = Color(0xFFE5484D)

@Composable
fun ScorebookTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Gold, onPrimary = Stage, secondary = AiBlue, background = Stage, surface = StageRaised,
            onBackground = Ink, onSurface = Ink, surfaceVariant = StageHigh, onSurfaceVariant = InkDim, error = RecordRed,
            secondaryContainer = StageHigh, onSecondaryContainer = Gold, surfaceContainer = StageRaised,
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
fun Chip(text: String, color: Color = Ink, background: Color = StageHigh) {
    Text(
        text, color = color, fontSize = 13.sp,
        modifier = Modifier.clip(RoundedCornerShape(50)).background(background).padding(horizontal = 12.dp, vertical = 6.dp),
    )
}

private enum class Tab(val label: String) { LISTEN("Listen"), LIBRARY("Library"), SETTINGS("Settings") }

@Composable
fun ScorebookRoot(vm: ScorebookViewModel = viewModel(), openTake: String? = null, startTab: String? = null) {
    var tab by rememberSaveable { mutableStateOf(Tab.entries.firstOrNull { it.name.equals(startTab, true) } ?: Tab.LISTEN) }
    val take by vm.take.collectAsState()
    val context = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    LaunchedEffect(openTake) { if (openTake != null) vm.openTake(openTake) }

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

    val current = take
    if (current != null) {
        BackHandler { vm.closeTake() }
        TakeScreen(vm, current, onBack = { vm.closeTake() })
        return
    }
    if (tab != Tab.LISTEN) BackHandler { tab = Tab.LISTEN }
    Scaffold(
        containerColor = Stage,
        bottomBar = {
            NavigationBar(containerColor = StageRaised) {
                for (t in Tab.entries) {
                    NavigationBarItem(
                        selected = tab == t,
                        onClick = { tab = t },
                        icon = {
                            when (t) {
                                Tab.LISTEN -> Icon(painterResource(R.drawable.ic_mic), contentDescription = null)
                                Tab.LIBRARY -> Icon(painterResource(R.drawable.ic_library), contentDescription = null)
                                Tab.SETTINGS -> Icon(Icons.Filled.Settings, contentDescription = null)
                            }
                        },
                        label = { Text(t.label) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Stage, selectedTextColor = Gold, indicatorColor = Gold,
                            unselectedIconColor = InkDim, unselectedTextColor = InkDim,
                        ),
                    )
                }
            }
        },
    ) { padding: PaddingValues ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (tab) {
                Tab.LISTEN -> ListenScreen(vm, onLibrary = { tab = Tab.LIBRARY })
                Tab.LIBRARY -> LibraryScreen(vm)
                Tab.SETTINGS -> SettingsScreen(vm)
            }
        }
    }
}
