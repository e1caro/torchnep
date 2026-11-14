package io.github.e1caro.scorebook.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.e1caro.scorebook.ScorebookApp
import java.text.DateFormat
import java.util.Date

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryScreen(vm: ScorebookViewModel, onBack: () -> Unit) {
    val lib by vm.library.collectAsState()
    var query by remember { mutableStateOf("") }
    var favorites by remember { mutableStateOf(false) }
    val songs = lib.search(query, favorites)
    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Stage, titleContentColor = Ink),
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = Ink) } },
            title = { Text("Library") },
        )
        OutlinedTextField(
            value = query, onValueChange = { query = it }, singleLine = true, leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
            placeholder = { Text("Search titles, tags or keys (e.g. D minor)") }, modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp),
        )
        Row(Modifier.padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            FilterChip(selected = favorites, onClick = { favorites = !favorites }, label = { Text("Favourites") })
            Spacer(Modifier.weight(1f))
            if (lib.takes.any { it.trashedAt != null }) TextButton(onClick = { vm.restoreTrash() }) { Text("Restore deleted", color = Gold) }
        }
        if (songs.isEmpty()) Text(if (lib.songs.isEmpty()) "Nothing yet. Play something on the Listen screen." else "No songs match.", color = InkDim, modifier = Modifier.padding(20.dp))
        LazyColumn(Modifier.fillMaxSize()) {
            items(songs, key = { it.id }) { s ->
                val takes = lib.takesOf(s.id)
                val last = takes.last()
                Row(
                    Modifier.fillMaxWidth().clickable { vm.openTake(last.id) }.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(s.title, color = Ink, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                        Text(
                            "${DateFormat.getDateInstance(DateFormat.MEDIUM).format(Date(last.created))} · ${last.key} · ♩ ${last.bpm} · ${vm.durationText(last.seconds)}" +
                                (if (takes.size > 1) " · ${takes.size} takes" else "") + (if (last.source == "midi") " · MIDI" else ""),
                            color = InkDim, fontSize = 13.sp,
                        )
                    }
                    if (s.favorite) Icon(Icons.Filled.Favorite, contentDescription = "Favourite", tint = Gold)
                    IconButton(onClick = { vm.trashSong(s.id) }) { Icon(Icons.Filled.Delete, contentDescription = "Move to trash", tint = InkDim) }
                }
                HorizontalDivider(color = StageRaised)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(vm: ScorebookViewModel, onBack: () -> Unit) {
    val prefs = (LocalContext.current.applicationContext as ScorebookApp).prefs
    var silence by remember { mutableFloatStateOf(prefs.silenceSeconds) }
    var autoPdf by remember { mutableStateOf(prefs.autoPdf) }
    var musical by remember { mutableFloatStateOf(prefs.musical) }
    var strict by remember { mutableFloatStateOf(prefs.strictness) }
    var corrections by remember { mutableIntStateOf(vm.corrections()) }
    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Stage, titleContentColor = Ink),
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = Ink) } },
            title = { Text("Settings") },
        )
        Column(Modifier.padding(horizontal = 20.dp)) {
            Text("End a take after ${silence.toInt()} s of silence", color = Ink, fontSize = 16.sp)
            Slider(value = silence, onValueChange = { silence = it; vm.setSilence(it) }, valueRange = 3f..10f, steps = 6, colors = SliderDefaults.colors(thumbColor = Gold, activeTrackColor = Gold))
            Spacer(Modifier.height(10.dp))
            Text("New takes start at", color = Ink, fontSize = 16.sp)
            LabeledSlider("Literal", "Musical", musical) { musical = it; prefs.musical = it }
            LabeledSlider("Loose rhythm", "Strict rhythm", strict) { strict = it; prefs.strictness = it }
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Save a PDF to Downloads after every take", color = Ink, fontSize = 16.sp, modifier = Modifier.weight(1f))
                Switch(checked = autoPdf, onCheckedChange = { autoPdf = it; prefs.autoPdf = it })
            }
            Spacer(Modifier.height(18.dp))
            Text("Scorebook has learned from $corrections of your corrections.", color = InkDim, fontSize = 14.sp)
            TextButton(onClick = { vm.resetLearning(); corrections = 0 }) { Text("Reset what Scorebook learned", color = Gold) }
            Spacer(Modifier.height(18.dp))
            Text(
                "Everything runs on this phone, offline.\nTranscription model: Basic Pitch by Spotify (Apache 2.0).\nMusic font: Bravura by Steinberg (SIL Open Font License).",
                color = InkDim, fontSize = 13.sp,
            )
        }
    }
}
