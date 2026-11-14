package io.github.e1caro.scorebook.ui

import androidx.compose.foundation.background
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

@Composable
fun LibraryScreen(vm: ScorebookViewModel) {
    val lib by vm.library.collectAsState()
    var query by remember { mutableStateOf("") }
    var favorites by remember { mutableStateOf(false) }
    val songs = lib.search(query, favorites)
    val total = lib.search("", false).size
    Column(Modifier.fillMaxSize()) {
        ScreenTitle("Library", if (total == 0) "Your scores will appear here" else "$total ${if (total == 1) "song" else "songs"}")
        OutlinedTextField(
            value = query, onValueChange = { query = it }, singleLine = true,
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null, tint = InkDim) },
            placeholder = { Text("Search titles, tags or keys (e.g. D minor)") },
            shape = RoundedCornerShape(16.dp),
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Gold, unfocusedBorderColor = StageHigh, focusedContainerColor = StageRaised, unfocusedContainerColor = StageRaised),
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        )
        Row(Modifier.padding(horizontal = 16.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            FilterChip(
                selected = favorites, onClick = { favorites = !favorites }, label = { Text("Favourites") },
                leadingIcon = { Icon(Icons.Filled.Favorite, contentDescription = null, tint = if (favorites) Stage else Gold) },
                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Gold, selectedLabelColor = Stage),
            )
            Spacer(Modifier.weight(1f))
            if (lib.takes.any { it.trashedAt != null }) TextButton(onClick = { vm.restoreTrash() }) { Text("Restore deleted", color = Gold) }
        }
        if (songs.isEmpty()) {
            Column(Modifier.padding(16.dp).fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(StageRaised).padding(22.dp)) {
                Text(if (total == 0) "Nothing here yet" else "No songs match", color = Ink, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(6.dp))
                Text(
                    if (total == 0) "Go to Listen and play something: every take is saved here with its key, tempo and sheet music."
                    else "Try another word, or clear the favourites filter.",
                    color = InkDim, fontSize = 14.sp, lineHeight = 20.sp,
                )
            }
        }
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(songs, key = { it.id }) { s ->
                val takes = lib.takesOf(s.id)
                val last = takes.last()
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(StageRaised).clickable { vm.openTake(last.id) }.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    KeyBadge(last.key, 46)
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text(s.title, color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        Text("♩ ${last.bpm} · ${last.meter} · ${vm.durationText(last.seconds)}", color = InkDim, fontSize = 13.sp)
                        Text(
                            DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(last.created)) +
                                (if (takes.size > 1) " · ${takes.size} takes" else "") + (if (last.source == "midi") " · MIDI" else ""),
                            color = InkDim, fontSize = 12.sp,
                        )
                    }
                    IconButton(onClick = { vm.toggleFavoriteSong(s.id) }) {
                        Icon(if (s.favorite) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder, contentDescription = "Favourite", tint = Gold)
                    }
                }
            }
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
    var musical by remember { mutableFloatStateOf(prefs.musical) }
    var strict by remember { mutableFloatStateOf(prefs.strictness) }
    var corrections by remember { mutableIntStateOf(vm.corrections()) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        ScreenTitle("Settings", "Everything runs on this phone, offline")
        Section("LISTENING") {
            Text("End a take after ${silence.toInt()} s of silence", color = Ink, fontSize = 16.sp)
            Slider(
                value = silence, onValueChange = { silence = it; vm.setSilence(it) }, valueRange = 3f..10f, steps = 6,
                colors = SliderDefaults.colors(thumbColor = Gold, activeTrackColor = Gold, inactiveTrackColor = StageHigh),
            )
        }
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
