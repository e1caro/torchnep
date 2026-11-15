package io.github.e1caro.scorebook.ui

import androidx.compose.foundation.background
import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.material3.LinearProgressIndicator
import androidx.core.content.ContextCompat
import androidx.compose.foundation.border
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.rememberCoroutineScope
import io.github.e1caro.scorebook.core.library.PracticeStats
import kotlinx.coroutines.launch
import kotlin.math.roundToInt
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.e1caro.scorebook.ScorebookApp
import java.text.DateFormat
import java.util.Date

@Composable
private fun ScreenTitle(title: String, subtitle: String) {
    Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 18.dp, bottom = 8.dp)) {
        Text(title, color = Ink, fontSize = 28.sp, fontWeight = FontWeight.Bold)
        Text(subtitle, color = InkDim, fontSize = 14.sp)
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun LibraryScreen(vm: ScorebookViewModel) {
    val lib by vm.library.collectAsState()
    var query by remember { mutableStateOf("") }
    var favorites by remember { mutableStateOf(false) }
    var showTrash by remember { mutableStateOf(false) }
    var selecting by remember { mutableStateOf(false) }
    var selected by remember { mutableStateOf(setOf<String>()) }
    var confirmEmpty by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val songs = if (showTrash) lib.trashedSongs() else lib.search(query, favorites)
    val total = lib.search("", false).size
    val trashCount = lib.trashedSongs().size

    fun trash(ids: Set<String>) {
        if (ids.isEmpty()) return
        vm.trashSongs(ids)
        selected = emptySet(); selecting = false
        scope.launch {
            snackbar.currentSnackbarData?.dismiss()
            val r = snackbar.showSnackbar(
                if (ids.size == 1) "Moved to trash" else "${ids.size} scores moved to trash", actionLabel = "Undo", duration = SnackbarDuration.Short,
            )
            if (r == SnackbarResult.ActionPerformed) vm.restoreSongs(ids)
        }
    }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            if (selecting) {
                // selection bar
                Row(Modifier.fillMaxWidth().background(StageHigh).padding(horizontal = 6.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { selecting = false; selected = emptySet() }) { Icon(Icons.Filled.Close, contentDescription = "Cancel", tint = Ink) }
                    Text("${selected.size} selected", color = Ink, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                    TextButton(onClick = { selected = if (selected.size == songs.size) emptySet() else songs.map { it.id }.toSet() }) {
                        Text(if (selected.size == songs.size && songs.isNotEmpty()) "None" else "All", color = Gold)
                    }
                    if (showTrash) {
                        IconButton(onClick = { vm.restoreSongs(selected); selected = emptySet(); selecting = false }, enabled = selected.isNotEmpty()) {
                            Icon(Icons.Filled.Refresh, contentDescription = "Restore", tint = if (selected.isEmpty()) InkDim else Gold)
                        }
                        IconButton(onClick = { vm.deleteForever(selected); selected = emptySet(); selecting = false }, enabled = selected.isNotEmpty()) {
                            Icon(Icons.Filled.Delete, contentDescription = "Delete forever", tint = if (selected.isEmpty()) InkDim else RecordRed)
                        }
                    } else {
                        IconButton(onClick = { trash(selected) }, enabled = selected.isNotEmpty()) {
                            Icon(Icons.Filled.Delete, contentDescription = "Move to trash", tint = if (selected.isEmpty()) InkDim else RecordRed)
                        }
                    }
                }
            } else {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.weight(1f)) {
                        ScreenTitle(
                            if (showTrash) "Trash" else "Library",
                            if (showTrash) "Deleted scores stay here for 30 days" else if (total == 0) "Your scores will appear here" else "$total ${if (total == 1) "score" else "scores"} · swipe left to delete",
                        )
                    }
                    if (songs.isNotEmpty()) TextButton(onClick = { selecting = true }, modifier = Modifier.padding(end = 8.dp)) { Text("Select", color = Gold) }
                }
            }
            if (!showTrash && !selecting && total > 0 && query.isEmpty()) StatsCard(lib)
            if (!showTrash) {
                OutlinedTextField(
                    value = query, onValueChange = { query = it }, singleLine = true,
                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null, tint = InkDim) },
                    placeholder = { Text("Search titles, tags or keys (e.g. D minor)") },
                    shape = RoundedCornerShape(16.dp),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Gold, unfocusedBorderColor = StageHigh, focusedContainerColor = StageRaised, unfocusedContainerColor = StageRaised),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                )
            }
            Row(Modifier.padding(horizontal = 16.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                if (!showTrash) FilterChip(
                    selected = favorites, onClick = { favorites = !favorites }, label = { Text("Favourites") },
                    leadingIcon = { Icon(Icons.Filled.Favorite, contentDescription = null, tint = if (favorites) Stage else Gold) },
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Gold, selectedLabelColor = Stage),
                )
                FilterChip(
                    selected = showTrash, onClick = { showTrash = !showTrash; selecting = false; selected = emptySet() },
                    label = { Text(if (showTrash) "Back to library" else "Trash ($trashCount)") },
                    leadingIcon = { Icon(Icons.Filled.Delete, contentDescription = null, tint = if (showTrash) Stage else InkDim) },
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Gold, selectedLabelColor = Stage),
                )
                if (showTrash && trashCount > 0) TextButton(onClick = { confirmEmpty = true }) { Text("Empty trash", color = RecordRed) }
            }
            if (songs.isEmpty()) {
                Column(Modifier.padding(16.dp).fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(StageRaised).padding(22.dp)) {
                    Text(
                        when { showTrash -> "The trash is empty"; total == 0 -> "Nothing here yet"; else -> "No scores match" },
                        color = Ink, fontSize = 18.sp, fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        when {
                            showTrash -> "Deleted scores come here first, so you can bring them back."
                            total == 0 -> "Go to Listen and record something: every take is saved here with its key, tempo and sheet music."
                            else -> "Try another word, or clear the favourites filter."
                        },
                        color = InkDim, fontSize = 14.sp, lineHeight = 20.sp,
                    )
                }
            }
            LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 6.dp, bottom = 80.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(songs, key = { it.id }) { s ->
                    val all = lib.takes.filter { it.songId == s.id }.sortedBy { it.created }
                    val last = all.lastOrNull() ?: return@items
                    val isSelected = s.id in selected
                    val row = @Composable {
                        Row(
                            Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(if (isSelected) StageHigh else StageRaised)
                                .border(2.dp, if (isSelected) Gold else androidx.compose.ui.graphics.Color.Transparent, RoundedCornerShape(18.dp))
                                .combinedClickable(
                                    onClick = {
                                        if (selecting) selected = if (isSelected) selected - s.id else selected + s.id
                                        else if (!showTrash) vm.openTake(last.id)
                                    },
                                    onLongClick = { selecting = true; selected = selected + s.id },
                                )
                                .padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            if (selecting) {
                                Box(
                                    Modifier.size(26.dp).clip(CircleShape).background(if (isSelected) Gold else StageHigh).border(2.dp, if (isSelected) Gold else InkDim, CircleShape),
                                    contentAlignment = Alignment.Center,
                                ) { if (isSelected) Icon(Icons.Filled.Check, contentDescription = null, tint = Stage, modifier = Modifier.size(18.dp)) }
                                Spacer(Modifier.width(12.dp))
                            }
                            KeyBadge(last.key, 46)
                            Spacer(Modifier.width(14.dp))
                            Column(Modifier.weight(1f)) {
                                Text(s.title, color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                Text("♩ ${last.bpm} · ${last.meter} · ${vm.durationText(last.seconds)}", color = InkDim, fontSize = 13.sp)
                                Text(
                                    DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(last.created)) +
                                        (if (all.size > 1) " · ${all.size} takes" else "") + (if (last.source == "midi") " · MIDI" else ""),
                                    color = InkDim, fontSize = 12.sp,
                                )
                            }
                            if (showTrash && !selecting) {
                                IconButton(onClick = { vm.restoreSongs(setOf(s.id)) }) { Icon(Icons.Filled.Refresh, contentDescription = "Restore", tint = Gold) }
                                IconButton(onClick = { vm.deleteForever(setOf(s.id)) }) { Icon(Icons.Filled.Delete, contentDescription = "Delete forever", tint = RecordRed) }
                            } else if (!selecting) {
                                IconButton(onClick = { vm.toggleFavoriteSong(s.id) }) {
                                    Icon(if (s.favorite) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder, contentDescription = "Favourite", tint = Gold)
                                }
                            }
                        }
                    }
                    if (showTrash || selecting) row() else {
                        var gone by remember { mutableStateOf(false) }
                        val swipe = rememberSwipeToDismissBoxState(confirmValueChange = { v ->
                            if (v == SwipeToDismissBoxValue.EndToStart && !gone) { gone = true; trash(setOf(s.id)); true } else false
                        })
                        SwipeToDismissBox(
                            state = swipe,
                            enableDismissFromStartToEnd = false,
                            backgroundContent = {
                                Row(
                                    Modifier.fillMaxSize().clip(RoundedCornerShape(18.dp)).background(RecordRed).padding(horizontal = 24.dp),
                                    horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text("Move to trash", color = Ink, fontWeight = FontWeight.Bold)
                                    Spacer(Modifier.width(10.dp))
                                    Icon(Icons.Filled.Delete, contentDescription = null, tint = Ink)
                                }
                            },
                        ) { row() }
                    }
                }
            }
        }
        SnackbarHost(snackbar, Modifier.align(Alignment.BottomCenter).padding(12.dp))
    }

    if (confirmEmpty) {
        AlertDialog(
            onDismissRequest = { confirmEmpty = false },
            title = { Text("Empty the trash?") },
            text = { Text("$trashCount ${if (trashCount == 1) "score" else "scores"} and their recordings will be deleted for good.") },
            confirmButton = { TextButton(onClick = { vm.emptyTrash(); confirmEmpty = false }) { Text("Delete for good", color = RecordRed) } },
            dismissButton = { TextButton(onClick = { confirmEmpty = false }) { Text("Cancel") } },
        )
    }
}

/** This week at the piano: minutes per day, streak, totals, favourite keys. */
@Composable
private fun StatsCard(lib: io.github.e1caro.scorebook.core.library.Library) {
    val st = remember(lib) { PracticeStats.of(lib, System.currentTimeMillis()) }
    val days = remember(lib) {
        val today = java.time.LocalDate.now()
        (6 downTo 0).map { today.minusDays(it.toLong()).dayOfWeek.getDisplayName(java.time.format.TextStyle.NARROW, java.util.Locale.getDefault()) }
    }
    fun minutes(m: Double): String = if (m < 1) "${(m * 60).roundToInt()} s" else if (m < 60) "${m.roundToInt()} min" else "${(m / 60).toInt()} h ${(m % 60).roundToInt()} min"
    Column(Modifier.padding(horizontal = 16.dp, vertical = 6.dp).fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(StageRaised).padding(16.dp)) {
        Row(verticalAlignment = Alignment.Bottom) {
            Column(Modifier.weight(1f)) {
                Text("THIS WEEK", color = Gold, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                Text(minutes(st.weekMinutes), color = Ink, fontSize = 26.sp, fontWeight = FontWeight.Bold)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(if (st.streakDays > 0) "🔥 ${st.streakDays}-day streak" else "Start a streak today", color = if (st.streakDays > 0) Gold else InkDim, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                Text("${st.takes} ${if (st.takes == 1) "take" else "takes"} · ${minutes(st.totalMinutes)} in all", color = InkDim, fontSize = 12.sp)
            }
        }
        Spacer(Modifier.height(12.dp))
        val max = (st.lastSevenDays.maxOrNull() ?: 0.0).coerceAtLeast(1.0)
        Row(Modifier.fillMaxWidth().height(64.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Bottom) {
            st.lastSevenDays.forEachIndexed { i, m ->
                Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        Modifier.fillMaxWidth().height((44 * (m / max)).coerceAtLeast(3.0).dp).clip(RoundedCornerShape(4.dp))
                            .background(if (i == 6) Gold else if (m > 0) AiBlue else StageHigh),
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(days[i], color = if (i == 6) Gold else InkDim, fontSize = 11.sp)
                }
            }
        }
        if (st.topKeys.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            Text("Most played: " + st.topKeys.joinToString(", ") { it.first } + if (st.averageBpm > 0) " · average ♩ ${st.averageBpm}" else "", color = InkDim, fontSize = 13.sp)
        }
    }
}

@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    Column(Modifier.padding(horizontal = 16.dp, vertical = 6.dp).fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(StageRaised).padding(18.dp)) {
        Text(title, color = Gold, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        content()
    }
}

@Composable
fun SettingsScreen(vm: ScorebookViewModel) {
    val prefs = (LocalContext.current.applicationContext as ScorebookApp).prefs
    var silence by remember { mutableFloatStateOf(prefs.silenceSeconds) }
    var autoPdf by remember { mutableStateOf(prefs.autoPdf) }
    var handsFree by remember { mutableStateOf(prefs.handsFree) }
    var musical by remember { mutableFloatStateOf(prefs.musical) }
    var strict by remember { mutableFloatStateOf(prefs.strictness) }
    var corrections by remember { mutableIntStateOf(vm.corrections()) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        ScreenTitle("Settings", "Everything runs on this phone, offline")
        Section("RECORDING") {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Hands-free", color = Ink, fontSize = 16.sp)
                    Text(
                        if (handsFree) "Starts when you play and stops after silence. The microphone listens while the app is open."
                        else "Off: you start and stop each take with the record button.",
                        color = InkDim, fontSize = 13.sp, lineHeight = 18.sp,
                    )
                }
                Switch(checked = handsFree, onCheckedChange = { handsFree = it; vm.setHandsFree(it) }, colors = SwitchDefaults.colors(checkedTrackColor = Gold, checkedThumbColor = Stage))
            }
            if (handsFree) {
                Spacer(Modifier.height(12.dp))
                Text("End a take after ${silence.toInt()} s of silence", color = Ink, fontSize = 16.sp)
                Slider(
                    value = silence, onValueChange = { silence = it; vm.setSilence(it) }, valueRange = 3f..10f, steps = 6,
                    colors = SliderDefaults.colors(thumbColor = Gold, activeTrackColor = Gold, inactiveTrackColor = StageHigh),
                )
            }
        }
        PianoCommandsSection(vm)
        Section("NEW TAKES START AT") {
            Text("Unclear notes", color = Ink, fontSize = 16.sp)
            LabeledSlider("Literal", "Musical", musical) { musical = it; prefs.musical = it }
            Spacer(Modifier.height(10.dp))
            Text("Rhythm", color = Ink, fontSize = 16.sp)
            LabeledSlider("Loose", "Strict", strict) { strict = it; prefs.strictness = it }
        }
        Section("SHEET MUSIC") {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Save a PDF after every take", color = Ink, fontSize = 16.sp)
                    Text("In Downloads/Scorebook", color = InkDim, fontSize = 13.sp)
                }
                Switch(checked = autoPdf, onCheckedChange = { autoPdf = it; prefs.autoPdf = it }, colors = SwitchDefaults.colors(checkedTrackColor = Gold, checkedThumbColor = Stage))
            }
        }
        Section("WHAT SCOREBOOK LEARNED") {
            Text("Scorebook adapts to your piano, room and playing from your corrections. So far: $corrections.", color = Ink, fontSize = 15.sp, lineHeight = 21.sp)
            TextButton(onClick = { vm.resetLearning(); corrections = 0 }) { Text("Reset what Scorebook learned", color = Gold) }
        }
        Section("ABOUT") {
            Text(
                "Transcription model: Basic Pitch by Spotify (Apache 2.0).\nMusic font: Bravura by Steinberg (SIL Open Font License).",
                color = InkDim, fontSize = 13.sp, lineHeight = 19.sp,
            )
        }
        Spacer(Modifier.height(16.dp))
    }
}

/** Piano commands: on/off, the notes of each command, and teaching new ones by playing them. */
@Composable
private fun PianoCommandsSection(vm: ScorebookViewModel) {
    val cfg by vm.commands.collectAsState()
    val teach by vm.teach.collectAsState()
    val context = LocalContext.current
    var pending by remember { mutableStateOf<(() -> Unit)?>(null) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        vm.startListening(ok)
        if (ok) pending?.invoke()
        pending = null
    }
    fun withMic(action: () -> Unit) {
        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        if (granted || vm.listen.value.midiDevice != null) { vm.startListening(granted); action() } else { pending = action; launcher.launch(Manifest.permission.RECORD_AUDIO) }
    }
    Section("PIANO COMMANDS") {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Control Scorebook from the piano", color = Ink, fontSize = 16.sp)
                Text(
                    if (cfg.enabled) "Pause for 2 seconds, then play a few notes on their own. The microphone listens while the app is open; nothing is saved until a take starts."
                    else "Off. Turn on to start, stop and manage takes by playing short note patterns.",
                    color = InkDim, fontSize = 13.sp, lineHeight = 18.sp,
                )
            }
            Switch(
                checked = cfg.enabled,
                onCheckedChange = { on -> if (on) withMic { vm.setCommandsEnabled(true) } else vm.setCommandsEnabled(false) },
                colors = SwitchDefaults.colors(checkedTrackColor = Gold, checkedThumbColor = Stage),
            )
        }
        Spacer(Modifier.height(10.dp))
        for (m in cfg.motifs.sortedBy { it.command.ordinal }) {
            Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(m.command.title, color = Ink, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    Text(m.command.help, color = InkDim, fontSize = 12.sp, lineHeight = 16.sp)
                }
                Spacer(Modifier.width(8.dp))
                Column(horizontalAlignment = Alignment.End) {
                    Text(m.names, color = Gold, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    TextButton(onClick = { withMic { vm.startTeaching(m.command) } }) { Text("Change", color = Ink) }
                }
            }
        }
        TextButton(onClick = { vm.resetMotifs() }) { Text("Back to the default notes", color = Gold) }
    }

    val t = teach ?: return
    AlertDialog(
        onDismissRequest = { vm.cancelTeaching() },
        title = { Text("New notes for “${t.command.title}”") },
        text = {
            Column {
                val heard = t.heard
                if (heard == null) {
                    Text("Wait two seconds in silence, then play 3 to 5 notes on their own.", fontSize = 15.sp, lineHeight = 21.sp)
                    Spacer(Modifier.height(8.dp))
                    Text("Tip: the top of the keyboard (C7, E7) and the low end (A1 to G2) are heard most reliably and rarely turn up alone in music.", color = InkDim, fontSize = 13.sp, lineHeight = 18.sp)
                    Spacer(Modifier.height(14.dp))
                    LinearProgressIndicator(Modifier.fillMaxWidth(), color = Gold)
                    Text("Listening…", color = InkDim, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
                } else {
                    Text("Heard:", color = InkDim, fontSize = 13.sp)
                    Text(if (heard.isEmpty()) "no clear notes" else io.github.e1caro.scorebook.core.commands.Motif(t.command, heard).names, color = Gold, fontSize = 26.sp, fontWeight = FontWeight.Bold)
                    t.problem?.let { Text(it, color = RecordRed, fontSize = 14.sp, modifier = Modifier.padding(top = 6.dp)) }
                    if (t.problem == null) t.warning?.let { Text(it, color = InkDim, fontSize = 13.sp, lineHeight = 18.sp, modifier = Modifier.padding(top = 6.dp)) }
                    TextButton(onClick = { vm.retryTeaching() }) { Text("Play them again", color = Ink) }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { vm.keepTaught() }, enabled = t.heard != null && t.problem == null) { Text("Use these notes", color = if (t.heard != null && t.problem == null) Gold else InkDim) }
        },
        dismissButton = { TextButton(onClick = { vm.cancelTeaching() }) { Text("Cancel") } },
    )
}
