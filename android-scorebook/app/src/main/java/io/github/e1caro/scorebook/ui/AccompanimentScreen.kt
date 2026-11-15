package io.github.e1caro.scorebook.ui

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
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInParent
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.e1caro.scorebook.core.accompany.Accompaniment
import io.github.e1caro.scorebook.core.accompany.DailyPick
import io.github.e1caro.scorebook.core.accompany.Level
import io.github.e1caro.scorebook.core.accompany.Pattern
import io.github.e1caro.scorebook.core.accompany.Patterns
import io.github.e1caro.scorebook.core.engrave.EngraveStyle
import io.github.e1caro.scorebook.core.engrave.Engraver
import io.github.e1caro.scorebook.core.play.PianoSynth
import io.github.e1caro.scorebook.render.PageRenderer
import io.github.e1caro.scorebook.render.Palette
import kotlinx.coroutines.delay

private fun levelColor(level: Level): Color = when (level) { Level.EASY -> Color(0xFF7BC47F); Level.MEDIUM -> Gold; Level.HARD -> RecordRed }

/** The card on the Listen screen: what to try today. */
@Composable
fun DailyAccompanimentCard(pick: DailyPick, onOpen: () -> Unit) {
    Row(
        Modifier.padding(horizontal = 16.dp, vertical = 6.dp).fillMaxWidth().clip(RoundedCornerShape(20.dp))
            .background(Brush.horizontalGradient(listOf(Color(0xFF2B2416), StageRaised))).border(1.dp, Gold.copy(alpha = 0.35f), RoundedCornerShape(20.dp))
            .clickable(onClick = onOpen).padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text("TODAY'S ACCOMPANIMENT", color = Gold, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(2.dp))
            Text(pick.pattern.name, color = Ink, fontSize = 20.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text("${pick.tagline} · ${pick.key.displayName}", color = InkDim, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(pick.chords.take(4).joinToString("  ") { it.label(pick.key) }, color = Ink, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 1)
        }
        Spacer(Modifier.width(10.dp))
        Box(Modifier.clip(RoundedCornerShape(50)).background(Gold).padding(horizontal = 16.dp, vertical = 9.dp)) {
            Text("Try it", color = Stage, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        }
    }
}

/**
 * A left-hand pattern written out on the grand staff (the right-hand staff is empty: that is for the melody),
 * with playback, tempo and key controls, the other patterns, and "use it on my last song".
 */
@Composable
fun AccompanimentScreen(vm: ScorebookViewModel, ui: AccompanyUi, onBack: () -> Unit) {
    val pick = ui.pick
    val pattern = pick.pattern
    val pb by vm.playback.collectAsState()
    var playPos by remember { mutableDoubleStateOf(-1.0) }
    LaunchedEffect(pb.playing) {
        while (pb.playing) { playPos = vm.playbackPosition(); delay(40) }
        playPos = -1.0
    }
    // playback goes through the progression twice; the score shows it once
    val perPass = ui.transcription.notes.size
    val voices = remember(pick) { PianoSynth.voices(Accompaniment.transcription(pick, vm.accompanyRepeats(pick))) }
    val sounding: Set<Int> = remember(playPos, voices) {
        if (playPos < 0 || perPass == 0) emptySet()
        else voices.filter { playPos >= it.start && playPos < it.start + minOf(it.duration, 1.2) }.map { it.eventId % perPass }.toSet()
    }
    val scroll = rememberScrollState()
    LaunchedEffect(pattern.id) { scroll.scrollTo(0) }

    Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = Ink) }
            Column(Modifier.weight(1f)) {
                Text(if (ui.today) "TODAY'S ACCOMPANIMENT" else "ACCOMPANIMENT", color = Gold, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                Text(pattern.name, color = Ink, fontSize = 22.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
        BoxWithConstraints(Modifier.fillMaxWidth().weight(1f).clipToBounds()) {
            val w = constraints.maxWidth.toDouble()
            val viewport = constraints.maxHeight
            val density = LocalDensity.current
            val renderer = remember { PageRenderer(vm.music, Palette.STAGE) }
            val style = with(density) { EngraveStyle(staffSpace = 7.dp.toPx().toDouble(), margin = 14.dp.toPx().toDouble(), title = false) }
            val page = remember(ui.score, w) { Engraver(style).continuous(ui.score, w) }
            var scoreTop by remember { mutableFloatStateOf(0f) }
            LaunchedEffect(sounding) {
                val ys = page.hits.filter { it.eventId in sounding }.map { it.y }
                if (ys.isNotEmpty()) {
                    val y = scoreTop + ys.min()
                    if (y < scroll.value + 40 || y > scroll.value + viewport * 0.7) scroll.animateScrollTo((y - viewport * 0.3).toInt().coerceAtLeast(0))
                }
            }
            Column(Modifier.fillMaxSize().verticalScroll(scroll)) {
                Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 14.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Chip(pattern.style, color = Gold)
                    Chip(pattern.level.label, color = levelColor(pattern.level))
                    Chip(pattern.meter.label)
                    Chip(pick.key.displayName)
                    Chip("♩ = ${pick.bpm}")
                }
                // the harmony: chord names, and how they relate to the key
                Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp).fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(StageRaised).padding(14.dp)) {
                    val names = pick.chords.map { it.label(pick.key) }
                    Text(
                        if (names.size > 8) names.distinct().joinToString("   ") else names.joinToString("   "),
                        color = Ink, fontSize = 20.sp, fontWeight = FontWeight.Bold, lineHeight = 26.sp,
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(pick.progression.roman(pick.key), color = InkDim, fontSize = 13.sp)
                    if (pattern.progressions.size > 1) {
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Try other chords", color = Gold, fontSize = 14.sp, fontWeight = FontWeight.Bold,
                            modifier = Modifier.clip(RoundedCornerShape(50)).background(StageHigh).clickable { vm.accompanyNextChords() }.padding(horizontal = 14.dp, vertical = 7.dp),
                        )
                    }
                }
                Text("Left hand, one chord per bar. The top staff is yours: play or sing the melody.", color = InkDim, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 18.dp))
                val h = with(density) { page.height.toFloat().toDp() }
                Canvas(Modifier.fillMaxWidth().height(h).clipToBounds().onGloballyPositioned { scoreTop = it.positionInParent().y }) {
                    drawIntoCanvas { renderer.draw(it.nativeCanvas, page, null, sounding) }
                }
                Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp).fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(StageRaised).padding(16.dp)) {
                    Text("What it is", color = Ink, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    Text(pattern.about, color = InkDim, fontSize = 14.sp, lineHeight = 20.sp)
                    Spacer(Modifier.height(10.dp))
                    Text("Tip", color = Gold, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    Text(pattern.tip, color = InkDim, fontSize = 14.sp, lineHeight = 20.sp)
                }
                Text("All patterns", color = Ink, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 20.dp, top = 10.dp, bottom = 4.dp))
                for (p in Patterns.ALL) PatternRow(p, selected = p.id == pattern.id) { vm.accompanyPattern(p) }
                Spacer(Modifier.height(16.dp))
            }
        }

        ui.message?.let { msg ->
            LaunchedEffect(msg) { delay(3500); vm.clearMessage() }
            Text(msg, color = Stage, fontSize = 14.sp, modifier = Modifier.fillMaxWidth().background(Gold).padding(12.dp))
        }

        // play, tempo, key
        Row(Modifier.fillMaxWidth().background(StageRaised).padding(horizontal = 8.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            val active = pb.playing || pb.preparing
            Box(
                Modifier.padding(horizontal = 6.dp).size(48.dp).clip(CircleShape).background(Gold).clickable { vm.toggleAccompanyPlay() },
                contentAlignment = Alignment.Center,
            ) {
                if (active) Box(Modifier.size(16.dp).clip(RoundedCornerShape(3.dp)).background(Stage))
                else Icon(Icons.Filled.PlayArrow, contentDescription = "Play", tint = Stage, modifier = Modifier.size(30.dp))
            }
            Row(Modifier.weight(1f), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                StepButton("−", "Slower") { vm.accompanyTempo(-4) }
                Column(Modifier.width(64.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("♩ = ${pick.bpm}", color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 1, softWrap = false)
                    Text("Tempo", color = InkDim, fontSize = 11.sp, maxLines = 1, softWrap = false)
                }
                StepButton("+", "Faster") { vm.accompanyTempo(4) }
            }
            Row(Modifier.weight(1f), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Filled.KeyboardArrowDown, contentDescription = "Key down", tint = Ink,
                    modifier = Modifier.size(36.dp).clip(CircleShape).clickable { vm.accompanyTranspose(-1) }.padding(6.dp),
                )
                Column(Modifier.width(44.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(pick.key.shortName, color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 1, softWrap = false)
                    Text("Key", color = InkDim, fontSize = 11.sp, maxLines = 1, softWrap = false)
                }
                Icon(
                    Icons.Filled.KeyboardArrowUp, contentDescription = "Key up", tint = Ink,
                    modifier = Modifier.size(36.dp).clip(CircleShape).clickable { vm.accompanyTranspose(1) }.padding(6.dp),
                )
            }
        }
        // use it on the newest song
        val lastId = ui.lastTakeId
        if (lastId != null) {
            Box(Modifier.fillMaxWidth().background(StageRaised).padding(start = 14.dp, end = 14.dp, bottom = 10.dp)) {
                if (ui.fitsLastSong) {
                    Column(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(StageHigh).border(1.dp, Gold.copy(alpha = 0.5f), RoundedCornerShape(14.dp))
                            .clickable { vm.accompanySong(lastId, pattern) }.padding(horizontal = 14.dp, vertical = 10.dp),
                    ) {
                        Text("Use it on my last song", color = Gold, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                        Text(
                            "“${ui.lastTitle ?: "Untitled"}”: your right hand stays, this becomes the left hand. Saved as a new song.",
                            color = InkDim, fontSize = 12.sp, lineHeight = 16.sp, maxLines = 2, overflow = TextOverflow.Ellipsis,
                        )
                    }
                } else {
                    Text(
                        "Your last song is in ${ui.lastMeter}: pick a ${ui.lastMeter} pattern to use on it.",
                        color = InkDim, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun StepButton(label: String, description: String, onClick: () -> Unit) {
    Box(Modifier.size(36.dp).clip(CircleShape).background(StageHigh).clickable(onClickLabel = description, onClick = onClick), contentAlignment = Alignment.Center) {
        Text(label, color = Ink, fontSize = 20.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun PatternRow(p: Pattern, selected: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.padding(horizontal = 16.dp, vertical = 3.dp).fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(if (selected) StageHigh else StageRaised)
            .clickable(onClick = onClick).padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(10.dp).clip(CircleShape).background(levelColor(p.level)))
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(p.name, color = if (selected) Gold else Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text("${p.style} · ${p.level.label}", color = InkDim, fontSize = 13.sp, maxLines = 1)
        }
        Text(p.meter.label, color = InkDim, fontSize = 14.sp, fontWeight = FontWeight.Bold)
    }
}

/** From a song's menu: the patterns that fit its meter; tapping one saves the song with that left hand. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccompanySheet(vm: ScorebookViewModel, ui: TakeUi, onDismiss: () -> Unit) {
    val patterns = remember(ui.transcription) { Accompaniment.patternsFor(ui.transcription) }
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = StageRaised) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(bottom = 30.dp)) {
            Text("Add an accompaniment", color = Ink, fontSize = 22.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 22.dp))
            Text(
                if (patterns.isEmpty()) "Accompaniments come in 4/4, 3/4 and 6/8, and this song reads as ${ui.transcription.grid.numerator}/${ui.transcription.grid.denominator}. " +
                    "If that is wrong, fix the time signature in Adjust."
                else "Your right hand stays exactly as you played it. The left hand is replaced by the pattern, following the chords of each bar. " +
                    "It is saved as a new song; this one does not change.",
                color = InkDim, fontSize = 14.sp, lineHeight = 20.sp, modifier = Modifier.padding(horizontal = 22.dp, vertical = 8.dp),
            )
            for (p in patterns) PatternRow(p, selected = false) { onDismiss(); vm.accompanySong(ui.takeId, p) }
        }
    }
}
