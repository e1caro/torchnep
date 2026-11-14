package io.github.e1caro.scorebook.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
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
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
    var renaming by remember { mutableStateOf(false) }
    val t = ui.transcription
    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Stage, titleContentColor = Ink),
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = Ink) } },
            title = { Text(ui.title, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.clickable { renaming = true }) },
            actions = {
                IconButton(onClick = { vm.toggleFavorite() }) {
                    Icon(if (ui.favorite) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder, contentDescription = "Favourite", tint = Gold)
                }
                IconButton(onClick = { menu = true }) { Icon(Icons.Filled.Share, contentDescription = "Export", tint = Ink) }
                DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                    DropdownMenuItem(text = { Text("Share PDF") }, onClick = { menu = false; vm.export(Exporter.Kind.PDF, true) })
                    DropdownMenuItem(text = { Text("Share MIDI") }, onClick = { menu = false; vm.export(Exporter.Kind.MIDI, true) })
                    DropdownMenuItem(text = { Text("Share MusicXML") }, onClick = { menu = false; vm.export(Exporter.Kind.MUSICXML, true) })
                    DropdownMenuItem(text = { Text("Save PDF to Downloads") }, onClick = { menu = false; vm.export(Exporter.Kind.PDF, false) })
                    DropdownMenuItem(text = { Text("Save MIDI to Downloads") }, onClick = { menu = false; vm.export(Exporter.Kind.MIDI, false) })
                    DropdownMenuItem(text = { Text("Save MusicXML to Downloads") }, onClick = { menu = false; vm.export(Exporter.Kind.MUSICXML, false) })
                    DropdownMenuItem(text = { Text("Move to trash") }, onClick = { menu = false; vm.trashSong(ui.songId) })
                }
            },
        )
        // what was found
        val ai = vm.aiDecidedCount(t)
        val keys = t.keyChanges().joinToString(" → ") { it.key.displayName }
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Chip(keys)
            Chip("♩ = ${t.bpm}")
            Chip("${t.grid.numerator}/${t.grid.denominator}")
            Chip("${t.notes.size} notes")
            if (ai > 0) Chip("$ai AI-decided")
        }
        if (ui.takes.size > 1) {
            Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                ui.takes.forEachIndexed { i, m -> FilterChip(selected = m.id == ui.takeId, onClick = { vm.openTake(m.id) }, label = { Text("Take ${i + 1}") }) }
            }
        }
        Spacer(Modifier.height(6.dp))

        // the score
        val renderer = remember { PageRenderer(vm.music, Palette.STAGE) }
        val density = LocalDensity.current
        BoxWithConstraints(Modifier.fillMaxWidth().weight(1f)) {
            val w = constraints.maxWidth.toDouble()
            val style = with(density) { EngraveStyle(staffSpace = 8.5.dp.toPx().toDouble(), margin = 14.dp.toPx().toDouble()) }
            val page = remember(ui.score, w) { Engraver(style).continuous(ui.score, w) }
            val h = with(density) { page.height.toFloat().toDp() }
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                Canvas(
                    Modifier.fillMaxWidth().height(h).pointerInput(page) {
                        detectTapGestures { o -> vm.select(page.hitAt(o.x.toDouble(), o.y.toDouble(), 10.0)) }
                    },
                ) { drawIntoCanvas { renderer.draw(it.nativeCanvas, page, ui.selected) } }
            }
            if (ui.busy) LinearProgressIndicator(Modifier.fillMaxWidth().height(2.dp).align(Alignment.TopCenter), color = Gold)
        }

        // controls
        Column(Modifier.fillMaxWidth().background(StageRaised).padding(horizontal = 16.dp, vertical = 8.dp)) {
            LabeledSlider("Literal", "Musical", ui.data.settings.musical.toFloat()) { vm.setMusical(it) }
            LabeledSlider("Loose rhythm", "Strict rhythm", ui.data.settings.strictness.toFloat()) { vm.setStrictness(it) }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Transpose", color = InkDim, fontSize = 14.sp, modifier = Modifier.weight(1f))
                IconButton(onClick = { vm.transpose(-1) }) { Icon(Icons.Filled.KeyboardArrowDown, contentDescription = "Down a semitone", tint = Ink) }
                val tr = ui.data.settings.transpose
                Text((if (tr > 0) "+$tr" else "$tr") + "  ·  " + t.mainKey.displayName, color = Ink, fontSize = 15.sp)
                IconButton(onClick = { vm.transpose(1) }) { Icon(Icons.Filled.KeyboardArrowUp, contentDescription = "Up a semitone", tint = Ink) }
            }
        }
        ui.message?.let { msg ->
            LaunchedEffect(msg) { delay(3500); vm.clearMessage() }
            Text(msg, color = Stage, fontSize = 14.sp, modifier = Modifier.fillMaxWidth().background(Gold).padding(10.dp))
        }
    }

    if (ui.selected != null) NoteSheet(vm, ui, ui.selected)
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
fun LabeledSlider(left: String, right: String, value: Float, onChange: (Float) -> Unit) {
    var v by remember(value) { mutableFloatStateOf(value) }
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(left, color = InkDim, fontSize = 13.sp, modifier = Modifier.width(92.dp))
        Slider(
            value = v, onValueChange = { v = it; onChange(it) }, modifier = Modifier.weight(1f),
            colors = SliderDefaults.colors(thumbColor = Gold, activeTrackColor = Gold),
        )
        Text(right, color = InkDim, fontSize = 13.sp, modifier = Modifier.width(92.dp).padding(start = 8.dp))
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
    ModalBottomSheet(onDismissRequest = { vm.select(null) }, containerColor = StageRaised) {
        Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
            val label = when (d.decision) {
                Decision.CONTEXT -> "AI-decided: the audio was unclear, musical context chose"
                Decision.UNSURE -> "Unclear audio (Literal mode: best audio guess)"
                Decision.USER -> "Your choice"
                Decision.MIDI -> "From the MIDI keyboard"
                Decision.CLEAR -> "Heard clearly"
            }
            Text(name(d.pitch), fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Ink)
            Text(label, color = if (d.decision == Decision.CONTEXT) AiBlue else InkDim, fontSize = 14.sp)
            Spacer(Modifier.height(14.dp))
            for (o in d.options.filter { it.finalP >= 0.005 || it.pitch == d.pitch }.take(5)) {
                val chosen = o.pitch == d.pitch
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(if (chosen) Stage else StageRaised)
                        .clickable { vm.choose(eventId, o.pitch) }.padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(name(o.pitch), color = if (chosen) Gold else Ink, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.width(64.dp))
                    Column(Modifier.weight(1f)) {
                        LinearProgressIndicator(progress = { o.finalP.toFloat() }, modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)), color = if (chosen) Gold else AiBlue, trackColor = Stage)
                        Text("${(o.finalP * 100).roundToInt()}%  ·  audio alone ${(o.audioP * 100).roundToInt()}%", color = InkDim, fontSize = 12.sp)
                    }
                }
                Spacer(Modifier.height(6.dp))
            }
            if (d.reasons.isNotEmpty()) {
                Spacer(Modifier.height(6.dp))
                for (r in d.reasons) Text("• $r", color = InkDim, fontSize = 14.sp)
            }
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = { vm.choose(eventId, null) }) { Text("Remove this note", color = RecordRed) }
                if (eventId in ui.data.overrides) TextButton(onClick = { vm.resetNote(eventId) }) { Text("Let Scorebook decide", color = Gold) }
            }
        }
    }
}
