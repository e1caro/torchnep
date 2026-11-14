package io.github.e1caro.scorebook.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.e1caro.scorebook.R
import io.github.e1caro.scorebook.core.correct.Decision
import io.github.e1caro.scorebook.core.engrave.EngraveStyle
import io.github.e1caro.scorebook.core.engrave.Engraver
import io.github.e1caro.scorebook.core.music.Spelling
import io.github.e1caro.scorebook.data.Exporter
import io.github.e1caro.scorebook.render.PageRenderer
import io.github.e1caro.scorebook.render.Palette
import kotlinx.coroutines.delay
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TakeScreen(vm: ScorebookViewModel, ui: TakeUi, onBack: () -> Unit) {
    var menu by remember { mutableStateOf(false) }
    var share by remember { mutableStateOf(false) }
    var renaming by remember { mutableStateOf(false) }
    var adjusting by remember { mutableStateOf(false) }
    val t = ui.transcription
    Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding()) {
        // header: back, title, favourite, more
        Row(Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = Ink) }
            Column(Modifier.weight(1f).clickable { renaming = true }) {
                Text(ui.title, color = Ink, fontSize = 19.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("Tap to rename", color = InkDim, fontSize = 12.sp)
            }
            IconButton(onClick = { vm.toggleFavorite() }) {
                Icon(if (ui.favorite) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder, contentDescription = "Favourite", tint = Gold)
            }
            Box {
                IconButton(onClick = { menu = true }) { Icon(Icons.Filled.MoreVert, contentDescription = "More", tint = Ink) }
                DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                    DropdownMenuItem(text = { Text("Rename") }, onClick = { menu = false; renaming = true })
                    DropdownMenuItem(text = { Text("Move to trash") }, onClick = { menu = false; vm.trashSong(ui.songId) })
                }
            }
        }
        // what was found
        val ai = vm.aiDecidedCount(t)
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 14.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Chip(t.keyChanges().joinToString(" → ") { it.key.displayName }, color = Gold)
            Chip("♩ = ${t.bpm}")
            Chip("${t.grid.numerator}/${t.grid.denominator}")
            Chip("${t.notes.size} notes")
            if (ai > 0) Chip("$ai AI-decided", color = AiBlue)
        }
        if (ui.takes.size > 1) {
            Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 14.dp, vertical = 2.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                ui.takes.forEachIndexed { i, m ->
                    FilterChip(
                        selected = m.id == ui.takeId, onClick = { vm.openTake(m.id) }, label = { Text("Take ${i + 1}") },
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Gold, selectedLabelColor = Stage),
                    )
                }
            }
        }
        if (ai > 0) {
            Row(Modifier.padding(horizontal = 18.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(10.dp).clip(CircleShape).background(AiBlue))
                Spacer(Modifier.width(8.dp))
                Text("Blue notes were decided by the AI. Tap any note to see the alternatives.", color = InkDim, fontSize = 13.sp)
            }
        }

        // the score
        val renderer = remember { PageRenderer(vm.music, Palette.STAGE) }
        val density = LocalDensity.current
        BoxWithConstraints(Modifier.fillMaxWidth().weight(1f).clipToBounds()) {
            val w = constraints.maxWidth.toDouble()
            val style = with(density) { EngraveStyle(staffSpace = 8.dp.toPx().toDouble(), margin = 14.dp.toPx().toDouble(), title = false) }
            val page = remember(ui.score, w) { Engraver(style).continuous(ui.score, w) }
            val h = with(density) { page.height.toFloat().toDp() }
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                Canvas(
                    Modifier.fillMaxWidth().height(h).clipToBounds().pointerInput(page) {
                        detectTapGestures { o -> vm.select(page.hitAt(o.x.toDouble(), o.y.toDouble(), 10.0)) }
                    },
                ) { drawIntoCanvas { renderer.draw(it.nativeCanvas, page, ui.selected) } }
            }
            if (ui.busy) LinearProgressIndicator(Modifier.fillMaxWidth().height(2.dp).align(Alignment.TopCenter), color = Gold)
        }

        ui.message?.let { msg ->
            LaunchedEffect(msg) { delay(3500); vm.clearMessage() }
            Text(msg, color = Stage, fontSize = 14.sp, modifier = Modifier.fillMaxWidth().background(Gold).padding(12.dp))
        }

        // actions
        Row(
            Modifier.fillMaxWidth().background(StageRaised).padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            BarAction("Adjust", onClick = { adjusting = true }) { Icon(painterResource(R.drawable.ic_tune), contentDescription = null, tint = Ink) }
            Row(Modifier.weight(1f), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { vm.transpose(-1) }) { Icon(Icons.Filled.KeyboardArrowDown, contentDescription = "Transpose down", tint = Ink) }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    val tr = ui.data.settings.transpose
                    Text(t.mainKey.displayName, color = Ink, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    Text(if (tr == 0) "Transpose" else (if (tr > 0) "+$tr" else "$tr") + " semitones", color = InkDim, fontSize = 11.sp)
                }
                IconButton(onClick = { vm.transpose(1) }) { Icon(Icons.Filled.KeyboardArrowUp, contentDescription = "Transpose up", tint = Ink) }
            }
            Box {
                BarAction("Export", onClick = { share = true }) { Icon(Icons.Filled.Share, contentDescription = null, tint = Ink) }
                DropdownMenu(expanded = share, onDismissRequest = { share = false }) {
                    DropdownMenuItem(text = { Text("Share PDF") }, onClick = { share = false; vm.export(Exporter.Kind.PDF, true) })
                    DropdownMenuItem(text = { Text("Share MIDI") }, onClick = { share = false; vm.export(Exporter.Kind.MIDI, true) })
                    DropdownMenuItem(text = { Text("Share MusicXML") }, onClick = { share = false; vm.export(Exporter.Kind.MUSICXML, true) })
                    DropdownMenuItem(text = { Text("Save PDF to Downloads") }, onClick = { share = false; vm.export(Exporter.Kind.PDF, false) })
                    DropdownMenuItem(text = { Text("Save MIDI to Downloads") }, onClick = { share = false; vm.export(Exporter.Kind.MIDI, false) })
                    DropdownMenuItem(text = { Text("Save MusicXML to Downloads") }, onClick = { share = false; vm.export(Exporter.Kind.MUSICXML, false) })
                }
            }
        }
    }

    if (ui.selected != null) NoteSheet(vm, ui, ui.selected)
    if (adjusting) AdjustSheet(vm, ui, onDismiss = { adjusting = false })
    if (renaming) {
        var text by remember { mutableStateOf(ui.title) }
        AlertDialog(
            onDismissRequest = { renaming = false },
            title = { Text("Song title") },
            text = { OutlinedTextField(value = text, onValueChange = { text = it }, singleLine = true) },
            confirmButton = { TextButton(onClick = { vm.rename(text.trim().ifEmpty { ui.title }); renaming = false }) { Text("Save") } },
            dismissButton = { TextButton(onClick = { renaming = false }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun BarAction(label: String, onClick: () -> Unit, icon: @Composable () -> Unit) {
    Column(
        Modifier.clip(RoundedCornerShape(12.dp)).clickable(onClick = onClick).padding(horizontal = 14.dp, vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        icon()
        Text(label, color = InkDim, fontSize = 11.sp)
    }
}

@Composable
fun LabeledSlider(left: String, right: String, value: Float, onChange: (Float) -> Unit) {
    var v by remember(value) { mutableFloatStateOf(value) }
    Column {
        Slider(
            value = v, onValueChange = { v = it; onChange(it) },
            colors = SliderDefaults.colors(thumbColor = Gold, activeTrackColor = Gold, inactiveTrackColor = StageHigh),
        )
        Row {
            Text(left, color = InkDim, fontSize = 13.sp, modifier = Modifier.weight(1f))
            Text(right, color = InkDim, fontSize = 13.sp)
        }
    }
}

/** The two transcription controls, explained. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AdjustSheet(vm: ScorebookViewModel, ui: TakeUi, onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = StageRaised) {
        Column(Modifier.padding(horizontal = 22.dp).padding(bottom = 30.dp)) {
            Text("Adjust the transcription", color = Ink, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(18.dp))
            Text("Unclear notes", color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            Text(
                "Literal trusts only what was heard. Musical lets the key, the chords and the melody decide notes the microphone could not hear clearly. Clearly heard notes never change.",
                color = InkDim, fontSize = 14.sp, lineHeight = 20.sp,
            )
            LabeledSlider("Literal", "Musical", ui.data.settings.musical.toFloat()) { vm.setMusical(it) }
            Spacer(Modifier.height(18.dp))
            Text("Rhythm", color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            Text("Loose keeps sixteenths and triplets; strict rounds to simpler rhythms.", color = InkDim, fontSize = 14.sp, lineHeight = 20.sp)
            LabeledSlider("Loose", "Strict", ui.data.settings.strictness.toFloat()) { vm.setStrictness(it) }
            Spacer(Modifier.height(10.dp))
            Text("${vm.aiDecidedCount(ui.transcription)} of ${ui.transcription.notes.size} notes are AI-decided at this setting.", color = AiBlue, fontSize = 14.sp)
        }
    }
}

/** Tap on a note: its alternatives with probabilities, why the choice was made, and a one-tap switch. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NoteSheet(vm: ScorebookViewModel, ui: TakeUi, eventId: Int) {
    val t = ui.transcription
    val d = t.decision(eventId) ?: return
    val note = t.notes.firstOrNull { it.eventId == eventId }
    val key = note?.let { t.keyAtTick(it.tick) } ?: t.mainKey
    val tr = ui.data.settings.transpose
    fun name(p: Int) = Spelling.spell(p + tr, key).name
    val heard = d.options.maxByOrNull { it.audioP }
    val pitchTorn = (heard?.audioP ?: 1.0) < 0.75
    ModalBottomSheet(onDismissRequest = { vm.select(null) }, containerColor = StageRaised) {
        Column(Modifier.padding(horizontal = 22.dp).padding(bottom = 30.dp)) {
            val label = when (d.decision) {
                Decision.CONTEXT -> when {
                    heard != null && heard.pitch != d.pitch -> "AI-decided: the audio leaned to ${name(heard.pitch)}, the music around it says ${name(d.pitch)}"
                    pitchTorn -> "AI-decided: the audio was torn between pitches; the musical context chose this one"
                    else -> "AI-decided: it was unclear whether this note was played; it fits the music, so it was kept"
                }
                Decision.UNSURE -> "Unclear audio (Literal mode: the best audio guess)"
                Decision.USER -> "Your choice"
                Decision.MIDI -> "From the MIDI keyboard"
                Decision.CLEAR -> "Heard clearly"
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(name(d.pitch), fontSize = 32.sp, fontWeight = FontWeight.Bold, color = Ink)
                Spacer(Modifier.width(12.dp))
                Chip(
                    when (d.decision) { Decision.CONTEXT -> "AI-decided"; Decision.UNSURE -> "Unclear"; Decision.USER -> "Yours"; Decision.MIDI -> "MIDI"; Decision.CLEAR -> "Clear" },
                    color = if (d.decision == Decision.CONTEXT) AiBlue else Ink,
                )
            }
            Text(label, color = InkDim, fontSize = 14.sp, lineHeight = 20.sp)
            Spacer(Modifier.height(16.dp))
            Text("Alternatives — tap to switch", color = Ink, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            for (o in d.options.filter { it.finalP >= 0.005 || it.pitch == d.pitch }.take(5)) {
                val chosen = o.pitch == d.pitch
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(if (chosen) StageHigh else Color.Transparent)
                        .clickable { vm.choose(eventId, o.pitch) }.padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(name(o.pitch), color = if (chosen) Gold else Ink, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.width(64.dp))
                    Column(Modifier.weight(1f)) {
                        LinearProgressIndicator(
                            progress = { o.finalP.toFloat() }, modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)),
                            color = if (chosen) Gold else AiBlue, trackColor = Stage,
                        )
                        Text("${(o.finalP * 100).roundToInt()}%  ·  audio alone ${(o.audioP * 100).roundToInt()}%", color = InkDim, fontSize = 12.sp)
                    }
                }
                Spacer(Modifier.height(4.dp))
            }
            if (d.reasons.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                Text("Why", color = Ink, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                for (r in d.reasons) Text("• $r", color = InkDim, fontSize = 14.sp, lineHeight = 20.sp)
            }
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = { vm.choose(eventId, null) }) { Text("Remove this note", color = RecordRed) }
                if (eventId in ui.data.overrides) TextButton(onClick = { vm.resetNote(eventId) }) { Text("Let Scorebook decide", color = Gold) }
            }
        }
    }
}
