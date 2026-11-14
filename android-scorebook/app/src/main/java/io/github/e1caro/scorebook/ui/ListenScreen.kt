package io.github.e1caro.scorebook.ui

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import io.github.e1caro.scorebook.core.engrave.LiveStaff
import io.github.e1caro.scorebook.render.PageRenderer
import io.github.e1caro.scorebook.render.Palette
import kotlinx.coroutines.delay

@Composable
fun ListenScreen(vm: ScorebookViewModel, onLibrary: () -> Unit, onSettings: () -> Unit) {
    val ui by vm.listen.collectAsState()
    val context = LocalContext.current
    var granted by remember { mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        granted = ok
        vm.stopListening()
        vm.startListening(ok)
    }
    LaunchedEffect(Unit) { if (!granted) launcher.launch(Manifest.permission.RECORD_AUDIO) else vm.startListening(true) }
    KeepScreenOn()

    // smooth scrolling between analysis updates
    var shownNow by remember { mutableDoubleStateOf(0.0) }
    var stamp by remember { mutableLongStateOf(System.nanoTime()) }
    LaunchedEffect(ui.now) { stamp = System.nanoTime() }
    LaunchedEffect(ui.status) {
        while (ui.status == ListenStatus.RECORDING) {
            shownNow = ui.now + ((System.nanoTime() - stamp) / 1e9).coerceAtMost(0.7)
            delay(33)
        }
    }

    Column(Modifier.fillMaxSize().padding(horizontal = 12.dp)) {
        Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("Scorebook", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Gold, modifier = Modifier.weight(1f))
            IconButton(onClick = onLibrary) { Icon(Icons.Filled.List, contentDescription = "Library", tint = Ink) }
            IconButton(onClick = onSettings) { Icon(Icons.Filled.Settings, contentDescription = "Settings", tint = Ink) }
        }
        val status = when (ui.status) {
            ListenStatus.OFF -> if (!granted) "Microphone off — allow it to listen" else "Not listening"
            ListenStatus.LISTENING -> "Listening — just start playing"
            ListenStatus.RECORDING -> "Recording  ${vm.durationText(ui.seconds)}"
            ListenStatus.SAVING -> "Writing the score…"
        }
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 6.dp)) {
            Box(Modifier.size(12.dp).clip(CircleShape).background(if (ui.status == ListenStatus.RECORDING) RecordRed else if (ui.status == ListenStatus.LISTENING) Gold else InkDim))
            Spacer(Modifier.width(10.dp))
            Text(status, fontSize = 20.sp, color = Ink)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Chip(if (ui.midiDevice != null) "MIDI · ${ui.midiDevice}" else "Microphone")
            if (ui.status == ListenStatus.RECORDING && ui.notes.isNotEmpty()) Chip("Key · ${ui.key.displayName}")
            if (ui.micError) Chip("Microphone unavailable")
        }
        Spacer(Modifier.height(10.dp))

        // live grand staff
        val renderer = remember { PageRenderer(vm.music, Palette.STAGE) }
        val density = LocalDensity.current
        BoxWithConstraints(Modifier.fillMaxWidth().weight(1f)) {
            val w = constraints.maxWidth.toDouble()
            val staffSpace = with(density) { 10.dp.toPx() }.toDouble()
            val page = remember(ui.notes, ui.key, shownNow, w) {
                LiveStaff(staffSpace).layout(ui.notes, ui.key, if (ui.status == ListenStatus.RECORDING) shownNow else ui.now, w)
            }
            val h = with(density) { page.height.toFloat().toDp() }
            Canvas(Modifier.fillMaxWidth().height(h).align(Alignment.Center)) { drawIntoCanvas { renderer.draw(it.nativeCanvas, page) } }
            if (ui.status == ListenStatus.LISTENING && ui.notes.isEmpty())
                Text("Notes appear here as you play.\nThe take ends by itself after a few seconds of silence.",
                    color = InkDim, fontSize = 15.sp, modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 8.dp))
        }

        // level meter
        val level = ((ui.levelDb + 70) / 60).coerceIn(0.0, 1.0).toFloat()
        Box(Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)).background(StageRaised)) {
            Box(Modifier.fillMaxWidth(level).height(6.dp).background(if (ui.status == ListenStatus.RECORDING) RecordRed else Gold))
        }
        Spacer(Modifier.height(12.dp))

        ui.message?.let { msg ->
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(StageRaised)
                    .clickable { ui.lastSaved?.let { vm.openTake(it.id) } }.padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(msg, color = Ink, fontSize = 15.sp, modifier = Modifier.weight(1f))
                if (ui.lastSaved != null) Text("Open", color = Gold, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(10.dp))
        }

        Box(Modifier.fillMaxWidth().padding(bottom = 18.dp), contentAlignment = Alignment.Center) {
            val recording = ui.status == ListenStatus.RECORDING
            Box(
                Modifier.size(84.dp).clip(CircleShape).background(if (recording) RecordRed else StageRaised)
                    .clickable(enabled = ui.status == ListenStatus.LISTENING || recording) { vm.toggleTake() },
                contentAlignment = Alignment.Center,
            ) {
                Box(Modifier.size(if (recording) 28.dp else 34.dp).clip(if (recording) RoundedCornerShape(4.dp) else CircleShape).background(if (recording) Ink else RecordRed))
            }
        }
        if (!granted) TextButton(onClick = { launcher.launch(Manifest.permission.RECORD_AUDIO) }, modifier = Modifier.align(Alignment.CenterHorizontally)) { Text("Allow the microphone") }
    }
}

@Composable
fun Chip(text: String) {
    Text(text, color = Ink, fontSize = 13.sp, modifier = Modifier.clip(RoundedCornerShape(50)).background(StageRaised).padding(horizontal = 12.dp, vertical = 6.dp))
}
