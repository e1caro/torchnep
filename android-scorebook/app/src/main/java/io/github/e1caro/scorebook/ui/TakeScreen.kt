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
import androidx.compose.material.icons.filled.PlayArrow
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
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.mutableDoubleStateOf
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
import io.github.e1caro.scorebook.core.play.PianoSynth
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
    var accompanying by remember { mutableStateOf(false) }
    val t = ui.transcription
    val pb by vm.playback.collectAsState()
    // the score follows playback: notes sounding now are lit, and the page scrolls to them
    var playPos by remember { mutableDoubleStateOf(-1.0) }
    LaunchedEffect(pb.playing) {
        while (pb.playing) { playPos = vm.playbackPosition(); delay(40) }
        playPos = -1.0
    }
    val voices = remember(t) { PianoSynth.voices(t) }
    val sounding: Set<Int> = remember(playPos, voices) {
        if (playPos < 0) emptySet() else voices.filter { playPos >= it.start && playPos < it.start + minOf(it.duration, 1.2) }.map { it.eventId }.toSet()
    }
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
                    DropdownMenuItem(text = { Text("Add an accompaniment…") }, onClick = { menu = false; vm.stopPlayback(); accompanying = true })
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
        if (ui.editing) {
            val sel = ui.selection
            Column(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 4.dp).clip(RoundedCornerShape(14.dp)).background(StageHigh).padding(12.dp)) {
                Text(
                    when { sel == null -> "Tap a bar to select it"; sel.first == sel.last -> "Bar ${sel.first} selected"; else -> "Bars ${sel.first}–${sel.last} selected" },
                    color = Gold, fontSize = 15.sp, fontWeight = FontWeight.Bold,
                )
                Text(
                    if (sel != null && sel.first == sel.last) "Tap another bar to select everything in between." else "Then keep only those bars, delete them, or copy them to a new song.",
                    color = InkDim, fontSize = 13.sp,
                )
            }
        } else if (ai > 0) {
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
            val viewport = constraints.maxHeight
            val style = with(density) { EngraveStyle(staffSpace = 8.dp.toPx().toDouble(), margin = 14.dp.toPx().toDouble(), title = false) }
            val page = remember(ui.score, w) { Engraver(style).continuous(ui.score, w) }
            val h = with(density) { page.height.toFloat().toDp() }
            val scroll = rememberScrollState()
            LaunchedEffect(sounding) {
                val ys = page.hits.filter { it.eventId in sounding }.map { it.y }
                if (ys.isNotEmpty()) {
                    val y = ys.min()
                    if (y < scroll.value + 40 || y > scroll.value + viewport * 0.7) scroll.animateScrollTo((y - viewport * 0.25).toInt().coerceAtLeast(0))
                }
            }
            Column(Modifier.fillMaxSize().verticalScroll(scroll)) {
                Canvas(
                    Modifier.fillMaxWidth().height(h).clipToBounds().pointerInput(page, ui.editing) {
                        detectTapGestures { o ->
                            if (ui.editing) page.barAt(o.x.toDouble(), o.y.toDouble())?.let { vm.tapBar(it) }
                            else vm.select(page.hitAt(o.x.toDouble(), o.y.toDouble(), 10.0))
                        }
                    },
                ) { drawIntoCanvas { renderer.draw(it.nativeCanvas, page, ui.selected, sounding, ui.selection) } }
            }
            if (ui.busy) LinearProgressIndicator(Modifier.fillMaxWidth().height(2.dp).align(Alignment.TopCenter), color = Gold)
        }

        ui.message?.let { msg ->
            LaunchedEffect(msg) { delay(3500); vm.clearMessage() }
            Text(msg, color = Stage, fontSize = 14.sp, modifier = Modifier.fillMaxWidth().background(Gold).padding(12.dp))
        }

        // playback: what plays, how fast, where it is
        if (pb.playing || pb.preparing) {
            Column(Modifier.fillMaxWidth().background(StageHigh).padding(horizontal = 14.dp, vertical = 8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        if (pb.preparing) "Getting the piano ready…"
                        else (if (pb.source == PlaySource.SCORE) "Playing the score" else "Playing your recording") +
                            "  ${vm.durationText(maxOf(0.0, playPos))} / ${vm.durationText(pb.length)}",
                        color = Ink, fontSize = 14.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f),
                    )
                }
                Spacer(Modifier.height(6.dp))
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    PlayChip("Score", pb.source == PlaySource.SCORE) { vm.setPlaySource(PlaySource.SCORE) }
                    if (ui.data.hasAudio) PlayChip("My recording", pb.source == PlaySource.RECORDING) { vm.setPlaySource(PlaySource.RECORDING) }
                    Spacer(Modifier.width(10.dp))
                    for (sp in listOf(0.5f, 0.75f, 1f)) PlayChip(if (sp == 1f) "1×" else "$sp×", pb.speed == sp) { vm.setPlaySpeed(sp) }
                }
            }
        }

        if (ui.editing) {
            EditBar(vm, ui)
        } else ActionBar(vm, ui, pb, onAdjust = { adjusting = true })
    }

    if (ui.selected != null) NoteSheet(vm, ui, ui.selected)
    if (adjusting) AdjustSheet(vm, ui, onDismiss = { adjusting = false })
    if (accompanying) AccompanySheet(vm, ui, onDismiss = { accompanying = false })
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

/** Cutting: what to do with the selected bars, and undo. */
@Composable
private fun EditBar(vm: ScorebookViewModel, ui: TakeUi) {
    val has = ui.selection != null
    Column(Modifier.fillMaxWidth().background(StageRaised).padding(horizontal = 8.dp, vertical = 6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Row(Modifier.weight(1f).horizontalScroll(rememberScrollState()), verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = { vm.selectAllBars() }) { Text("Select all", color = Ink, maxLines = 1, softWrap = false) }
                if (ui.data.edits.isNotEmpty()) {
                    TextButton(onClick = { vm.undoEdit() }) { Text("Undo cut", color = Gold, maxLines = 1, softWrap = false) }
                    TextButton(onClick = { vm.restoreOriginal() }) { Text("Restore original", color = Gold, maxLines = 1, softWrap = false) }
                }
            }
            Box(Modifier.clip(RoundedCornerShape(50)).background(Gold).clickable { vm.setEditing(false) }.padding(horizontal = 18.dp, vertical = 8.dp)) {
                Text("Done", color = Stage, fontWeight = FontWeight.Bold)
            }
        }
        // one line of actions, scrolling sideways on narrow screens (never wrapping into a tall column)
        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(bottom = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            EditAction("Keep only these", enabled = has, onClick = { vm.keepSelection() })
            EditAction("Delete bars", enabled = has, danger = true, onClick = { vm.deleteSelection() })
            EditAction("Copy to new song", enabled = has, onClick = { vm.copySelectionToNewSong() })
        }
    }
}

@Composable
private fun EditAction(label: String, enabled: Boolean, danger: Boolean = false, onClick: () -> Unit) {
    Text(
        label, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 1, softWrap = false,
        color = if (!enabled) InkDim else if (danger) RecordRed else Ink,
        modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(if (enabled) StageHigh else Color.Transparent)
            .clickable(enabled = enabled, onClick = onClick).padding(horizontal = 12.dp, vertical = 10.dp),
    )
}

/** Play, adjust, cut, transpose, export. */
@Composable
private fun ActionBar(vm: ScorebookViewModel, ui: TakeUi, pb: PlaybackUi, onAdjust: () -> Unit) {
    val t = ui.transcription
    var share by remember { mutableStateOf(false) }
    run {
        Row(
            Modifier.fillMaxWidth().background(StageRaised).padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            val active = pb.playing || pb.preparing
            Box(
                Modifier.padding(horizontal = 6.dp).size(48.dp).clip(CircleShape).background(Gold).clickable { vm.togglePlay() },
                contentAlignment = Alignment.Center,
            ) {
                if (active) Box(Modifier.size(16.dp).clip(RoundedCornerShape(3.dp)).background(Stage))
                else Icon(Icons.Filled.PlayArrow, contentDescription = "Play", tint = Stage, modifier = Modifier.size(30.dp))
            }
            BarAction("Adjust", onClick = onAdjust) { Icon(painterResource(R.drawable.ic_tune), contentDescription = null, tint = Ink) }
            BarAction("Cut", onClick = { vm.stopPlayback(); vm.setEditing(true) }) { Icon(painterResource(R.drawable.ic_cut), contentDescription = null, tint = Ink) }
            // transpose: compact, on one line, whatever the screen width
            Row(Modifier.weight(1f), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Filled.KeyboardArrowDown, contentDescription = "Transpose down", tint = Ink,
                    modifier = Modifier.size(36.dp).clip(CircleShape).clickable { vm.transpose(-1) }.padding(6.dp),
                )
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    val tr = ui.data.settings.transpose
                    Text(t.mainKey.shortName, color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 1, softWrap = false)
                    Text(if (tr == 0) "Key" else if (tr > 0) "+$tr" else "$tr", color = InkDim, fontSize = 11.sp, maxLines = 1, softWrap = false)
                }
                Icon(
                    Icons.Filled.KeyboardArrowUp, contentDescription = "Transpose up", tint = Ink,
                    modifier = Modifier.size(36.dp).clip(CircleShape).clickable { vm.transpose(1) }.padding(6.dp),
                )
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
}

@Composable
private fun PlayChip(label: String, selected: Boolean, onClick: () -> Unit) {
    FilterChip(
        selected = selected, onClick = onClick, label = { Text(label) },
        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Gold, selectedLabelColor = Stage, labelColor = Ink),
    )
}

@Composable
private fun BarAction(label: String, onClick: () -> Unit, icon: @Composable () -> Unit) {
    Column(
        Modifier.clip(RoundedCornerShape(12.dp)).clickable(onClick = onClick).padding(horizontal = 9.dp, vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        icon()
        Text(label, color = InkDim, fontSize = 11.sp, maxLines = 1, softWrap = false)
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
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 22.dp).padding(bottom = 30.dp)) {
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

            // fixing what the analysis got wrong
            val st = ui.data.settings
            Spacer(Modifier.height(20.dp))
            Text("Tempo  ♩ = ${ui.transcription.bpm}", color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            Text("If the beat was read twice too fast or too slow, fix it here.", color = InkDim, fontSize = 14.sp, lineHeight = 20.sp)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                PlayChip("Half speed", st.tempoScale < 0.75) { vm.setTempoScale(if (st.tempoScale < 0.75) 1.0 else 0.5) }
                PlayChip("As detected", st.tempoScale in 0.75..1.5) { vm.setTempoScale(1.0) }
                PlayChip("Double speed", st.tempoScale > 1.5) { vm.setTempoScale(if (st.tempoScale > 1.5) 1.0 else 2.0) }
            }
            Spacer(Modifier.height(16.dp))
            Text("Time signature", color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                PlayChip("Auto (${ui.transcription.grid.numerator}/${ui.transcription.grid.denominator})", st.beatsPerBar == null) { vm.setMeter(null, false) }
                for ((label, bpb, compound) in listOf(Triple("2/4", 2, false), Triple("3/4", 3, false), Triple("4/4", 4, false), Triple("6/8", 2, true))) {
                    PlayChip(label, st.beatsPerBar == bpb && (st.compound ?: false) == compound) { vm.setMeter(bpb, compound) }
                }
            }
            Spacer(Modifier.height(16.dp))
            Text("Key", color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            Text("Pick the key if you know it: spelling, key signature and chord names follow it, and unclear notes lean to it.", color = InkDim, fontSize = 14.sp, lineHeight = 20.sp)
            var keyMenu by remember { mutableStateOf(false) }
            Box {
                PlayChip(st.key?.displayName ?: "Auto (${ui.transcription.keyChanges().joinToString(" → ") { it.key.displayName }})", true) { keyMenu = true }
                DropdownMenu(expanded = keyMenu, onDismissRequest = { keyMenu = false }) {
                    DropdownMenuItem(text = { Text("Auto: detect it") }, onClick = { keyMenu = false; vm.setKey(null) })
                    for (k in io.github.e1caro.scorebook.core.music.Key.ALL.sortedWith(compareBy({ it.mode }, { it.fifths }))) {
                        DropdownMenuItem(text = { Text(k.displayName) }, onClick = { keyMenu = false; vm.setKey(k) })
                    }
                }
            }
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
            if (note != null) {
                val other = if (note.hand == io.github.e1caro.scorebook.core.correct.Hand.RIGHT) io.github.e1caro.scorebook.core.correct.Hand.LEFT else io.github.e1caro.scorebook.core.correct.Hand.RIGHT
                TextButton(onClick = { vm.moveToHand(eventId, other) }) {
                    Text(if (other == io.github.e1caro.scorebook.core.correct.Hand.LEFT) "Move to the left hand (bass staff)" else "Move to the right hand (treble staff)", color = Ink)
                }
            }
        }
    }
}
