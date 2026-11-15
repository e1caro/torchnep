package io.github.e1caro.scorebook.ui

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import io.github.e1caro.scorebook.R
import io.github.e1caro.scorebook.core.engrave.LiveStaff
import io.github.e1caro.scorebook.render.PageRenderer
import io.github.e1caro.scorebook.render.Palette
import kotlinx.coroutines.delay
import java.text.DateFormat
import java.util.Date

@Composable
fun ListenScreen(vm: ScorebookViewModel, onLibrary: () -> Unit) {
    val ui by vm.listen.collectAsState()
    val lib by vm.library.collectAsState()
    val context = LocalContext.current
    var granted by remember { mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) }
    // the microphone is asked for when you first press record (or turn on hands-free)
    var recordAfterGrant by remember { mutableStateOf(false) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        granted = ok
        vm.startListening(ok)
        if (ok && recordAfterGrant) vm.toggleTake()
        recordAfterGrant = false
    }
    LaunchedEffect(Unit) {
        vm.startListening(granted)
        if (!granted && ui.midiDevice == null && (vm.handsFree || vm.commands.value.enabled)) launcher.launch(Manifest.permission.RECORD_AUDIO)
    }
    val recording = ui.status == ListenStatus.RECORDING
    val micOn = recording || ui.status == ListenStatus.LISTENING
    if (micOn) KeepScreenOn()
    val onRecord = {
        if (!granted && ui.midiDevice == null && !recording) {
            recordAfterGrant = true
            launcher.launch(Manifest.permission.RECORD_AUDIO)
        } else vm.toggleTake()
    }

    // smooth scrolling of the live staff between analysis updates
    var shownNow by remember { mutableDoubleStateOf(0.0) }
    var stamp by remember { mutableLongStateOf(System.nanoTime()) }
    LaunchedEffect(ui.now) { stamp = System.nanoTime() }
    LaunchedEffect(ui.status) {
        while (ui.status == ListenStatus.RECORDING) {
            shownNow = ui.now + ((System.nanoTime() - stamp) / 1e9).coerceAtMost(0.7)
            delay(33)
        }
    }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        // header
        Row(Modifier.fillMaxWidth().padding(start = 20.dp, end = 16.dp, top = 14.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(34.dp).clip(RoundedCornerShape(10.dp)).background(Gold), contentAlignment = Alignment.Center) {
                Icon(painterResource(R.drawable.ic_note), contentDescription = null, tint = Stage, modifier = Modifier.size(22.dp))
            }
            Spacer(Modifier.width(10.dp))
            Text("Scorebook", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Ink, modifier = Modifier.weight(1f))
            StatusPill(ui.status)
        }

        // what is happening
        Column(
            Modifier.padding(horizontal = 16.dp, vertical = 8.dp).fillMaxWidth().clip(RoundedCornerShape(20.dp))
                .background(Brush.verticalGradient(listOf(StageHigh, StageRaised))).padding(horizontal = 18.dp, vertical = 14.dp),
        ) {
            val headline = when (ui.status) {
                ListenStatus.RECORDING -> "Recording  ${vm.durationText(ui.seconds)}"
                ListenStatus.SAVING -> "Writing your score…"
                ListenStatus.LISTENING -> if (ui.handsFree) "Just play." else "Listening for commands"
                else -> "Ready when you are."
            }
            val sub = when (ui.status) {
                ListenStatus.RECORDING -> if (ui.handsFree) "Keep playing. The take ends by itself after ${vm.silenceSeconds} s of silence."
                else "Play your piece, then tap the button again to stop and save."
                ListenStatus.SAVING -> "Finding the key, tempo and chords, and engraving the sheet music."
                ListenStatus.LISTENING -> if (ui.handsFree) "Hands-free: recording starts when you play and stops after ${vm.silenceSeconds} s of silence."
                else "Play your start motif (after a short silence), or tap the red button. Nothing is recorded until a take starts."
                else -> "Tap the red button to start recording. Nothing is recorded until you do."
            }
            Text(headline, fontSize = 24.sp, fontWeight = FontWeight.Bold, color = if (recording) RecordRed else Ink)
            Spacer(Modifier.height(4.dp))
            Text(sub, fontSize = 14.sp, color = InkDim, lineHeight = 19.sp)
            Spacer(Modifier.height(10.dp))
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Chip(if (ui.midiDevice != null) "MIDI · ${ui.midiDevice}" else if (micOn) "Microphone on" else "Microphone off", background = Stage)
                if (ui.handsFree) Chip("Hands-free", color = Gold, background = Stage)
                if (ui.commands) Chip("Piano commands", color = Gold, background = Stage)
                if (recording && ui.notes.isNotEmpty()) Chip("Key · ${ui.key.displayName}", color = Gold, background = Stage)
                if (recording && ui.bpm > 0) Chip("♩ ≈ ${ui.bpm}", background = Stage)
                if (recording && ui.notes.isNotEmpty()) Chip("${ui.notes.size} notes", background = Stage)
                if (ui.micError) Chip("Microphone unavailable", color = RecordRed, background = Stage)
            }
        }

        // live grand staff
        val renderer = remember { PageRenderer(vm.music, Palette.STAGE.copy(background = 0xFF14161B.toInt())) }
        val density = LocalDensity.current
        BoxWithConstraints(
            Modifier.padding(horizontal = 16.dp, vertical = 8.dp).fillMaxWidth().clip(RoundedCornerShape(20.dp))
                .background(androidx.compose.ui.graphics.Color(0xFF14161B)).border(1.dp, StageHigh, RoundedCornerShape(20.dp)),
        ) {
            val w = constraints.maxWidth.toDouble()
            val staffSpace = with(density) { 8.dp.toPx() }.toDouble()
            val page = remember(ui.notes, ui.key, shownNow, w) {
                LiveStaff(staffSpace).layout(ui.notes, ui.key, if (recording) shownNow else ui.now, w)
            }
            val h = with(density) { page.height.toFloat().toDp() }
            Canvas(Modifier.fillMaxWidth().height(h).clipToBounds()) { drawIntoCanvas { renderer.draw(it.nativeCanvas, page) } }
            if (ui.notes.isEmpty()) {
                Text(
                    if (recording) "Listening for the first notes…" else "Notes appear here while you record",
                    color = InkDim, fontSize = 14.sp, modifier = Modifier.align(Alignment.TopCenter).padding(top = 12.dp),
                )
            }
        }

        // the big button, with the input level next to it
        Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            val pulse = rememberInfiniteTransition(label = "pulse").animateFloat(
                initialValue = 0.35f, targetValue = 1f, animationSpec = infiniteRepeatable(tween(900), RepeatMode.Reverse), label = "ring",
            )
            Box(Modifier.size(96.dp), contentAlignment = Alignment.Center) {
                if (recording) Box(Modifier.size(96.dp).alpha(pulse.value * 0.5f).clip(CircleShape).background(RecordRed))
                Box(
                    Modifier.size(78.dp).clip(CircleShape).background(if (recording) RecordRed else StageHigh)
                        .border(3.dp, if (recording) Ink else RecordRed, CircleShape)
                        .clickable(enabled = ui.status == ListenStatus.READY || ui.status == ListenStatus.LISTENING || recording) { onRecord() },
                    contentAlignment = Alignment.Center,
                ) {
                    Box(Modifier.size(if (recording) 26.dp else 32.dp).clip(if (recording) RoundedCornerShape(5.dp) else CircleShape).background(if (recording) Ink else RecordRed))
                }
            }
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    when { recording -> "Tap to stop and save"; ui.status == ListenStatus.SAVING -> "Saving…"; else -> "Tap to start recording" },
                    color = Ink, fontSize = 17.sp, fontWeight = FontWeight.Bold,
                )
                Text(
                    when {
                        recording && ui.handsFree -> "or just stop playing"
                        recording -> "Recording ${vm.durationText(ui.seconds)}"
                        ui.handsFree -> "or just start playing"
                        else -> "The microphone is off until you do"
                    },
                    color = InkDim, fontSize = 13.sp,
                )
                if (micOn) {
                    Spacer(Modifier.height(10.dp))
                    val level = ((ui.levelDb + 70) / 60).coerceIn(0.0, 1.0).toFloat()
                    Box(Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)).background(StageHigh)) {
                        Box(Modifier.fillMaxWidth(level).height(8.dp).clip(RoundedCornerShape(4.dp)).background(Brush.horizontalGradient(listOf(Gold, if (recording) RecordRed else Gold))))
                    }
                    Text("Input level", color = InkDim, fontSize = 11.sp, modifier = Modifier.padding(top = 3.dp))
                }
            }
        }

        // saved take
        ui.message?.let { msg ->
            Row(
                Modifier.padding(horizontal = 16.dp, vertical = 6.dp).fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(StageHigh)
                    .clickable { ui.lastSaved?.let { vm.openTake(it.id) } }.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(msg, color = Ink, fontSize = 15.sp, modifier = Modifier.weight(1f))
                if (ui.lastSaved != null) Text("Open", color = Gold, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 10.dp))
            }
        }

        // what to try today (not while a take is being recorded)
        if (!recording && ui.status != ListenStatus.SAVING) {
            val skips by vm.skips.collectAsState()
            val pick = remember(lib, skips) { vm.dailyPick() }
            val motif = remember(lib, skips) { vm.dailyMotif() }
            val log by vm.practice.collectAsState()
            DailyCard(pick, motif, log, java.time.LocalDate.now().toEpochDay(), onPattern = { vm.openAccompaniment() }, onMotif = { vm.openMotif() },
                onAnother = { vm.anotherRecommendation(it) })
        }

        // the piano commands, as a cheat sheet
        val cmds by vm.commands.collectAsState()
        if (cmds.enabled) {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 6.dp).fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(StageRaised).padding(16.dp)) {
                Text("PIANO COMMANDS", color = Gold, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                Text("Pause for 2 seconds, then play the notes on their own.", color = InkDim, fontSize = 13.sp)
                Spacer(Modifier.height(8.dp))
                for (m in cmds.motifs.sortedBy { it.command.ordinal }) {
                    Row(Modifier.padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(m.command.title, color = Ink, fontSize = 14.sp, modifier = Modifier.weight(1f))
                        Text(m.names, color = Gold, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // recent takes, or how it works
        val recent = lib.search("", false).take(6)
        if (recent.isEmpty()) {
            Column(Modifier.padding(16.dp).fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(StageRaised).padding(18.dp)) {
                Text("How it works", color = Ink, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Spacer(Modifier.height(10.dp))
                Step("1", "Put the phone near the piano and tap the red button. A USB or Bluetooth MIDI keyboard works too.")
                Step("2", "Play. Notes appear on the staff as you go. Tap the button again when you finish: the take is saved.")
                Step("3", "Open the score: key, tempo and chords are filled in. Blue notes were decided by the AI — tap any note to change it.")
                Step("4", "Share it as PDF, MIDI or MusicXML. A PDF is also saved to Downloads/Scorebook.")
            }
        } else {
            Row(Modifier.padding(start = 20.dp, end = 8.dp, top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Recent", color = Ink, fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.weight(1f))
                TextButton(onClick = onLibrary) { Text("See all", color = Gold) }
            }
            Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                for (s in recent) {
                    val last = lib.takesOf(s.id).last()
                    Column(
                        Modifier.width(168.dp).clip(RoundedCornerShape(16.dp)).background(StageRaised).clickable { vm.openTake(last.id) }.padding(14.dp),
                    ) {
                        KeyBadge(last.key)
                        Spacer(Modifier.height(10.dp))
                        Text(s.title, color = Ink, fontWeight = FontWeight.Bold, fontSize = 15.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        Spacer(Modifier.height(4.dp))
                        Text("♩ ${last.bpm} · ${vm.durationText(last.seconds)}", color = InkDim, fontSize = 13.sp)
                        Text(DateFormat.getDateInstance(DateFormat.MEDIUM).format(Date(last.created)), color = InkDim, fontSize = 12.sp)
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun StatusPill(status: ListenStatus) {
    val (label, color) = when (status) {
        ListenStatus.RECORDING -> "Recording" to RecordRed
        ListenStatus.SAVING -> "Saving" to Gold
        ListenStatus.LISTENING -> "Listening" to Gold
        else -> "Ready" to InkDim
    }
    val pulse = rememberInfiniteTransition(label = "dot").animateFloat(0.3f, 1f, infiniteRepeatable(tween(700), RepeatMode.Reverse), label = "dot")
    Row(Modifier.clip(RoundedCornerShape(50)).background(StageRaised).padding(horizontal = 12.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(9.dp).alpha(if (status == ListenStatus.RECORDING || status == ListenStatus.LISTENING) pulse.value else 1f).clip(CircleShape).background(color))
        Spacer(Modifier.width(7.dp))
        Text(label, color = color, fontSize = 13.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun Step(n: String, text: String) {
    Row(Modifier.padding(vertical = 5.dp)) {
        Box(Modifier.size(24.dp).clip(CircleShape).background(StageHigh), contentAlignment = Alignment.Center) { Text(n, color = Gold, fontSize = 13.sp, fontWeight = FontWeight.Bold) }
        Spacer(Modifier.width(10.dp))
        Text(text, color = InkDim, fontSize = 14.sp, lineHeight = 20.sp)
    }
}

/** A round badge with a key's short name ("Dm", "F#"); minor keys in blue, major in gold. */
@Composable
fun KeyBadge(keyName: String, size: Int = 40) {
    val minor = keyName.endsWith("minor")
    val short = keyName.split(' ').first() + if (minor) "m" else ""
    Box(Modifier.size(size.dp).clip(CircleShape).background(if (minor) AiBlue else Gold), contentAlignment = Alignment.Center) {
        Text(short, color = Stage, fontWeight = FontWeight.Bold, fontSize = (size * 0.36).sp)
    }
}
