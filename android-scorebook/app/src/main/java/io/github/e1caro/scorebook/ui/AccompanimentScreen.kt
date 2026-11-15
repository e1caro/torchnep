package io.github.e1caro.scorebook.ui

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.e1caro.scorebook.core.accompany.Accompaniment
import io.github.e1caro.scorebook.core.accompany.DailyPick
import io.github.e1caro.scorebook.core.accompany.Level
import io.github.e1caro.scorebook.core.accompany.MotifPick
import io.github.e1caro.scorebook.core.accompany.Motifs
import io.github.e1caro.scorebook.core.accompany.Patterns
import io.github.e1caro.scorebook.core.accompany.Studies
import io.github.e1caro.scorebook.core.accompany.Study
import io.github.e1caro.scorebook.core.practice.PracticeLog
import io.github.e1caro.scorebook.core.engrave.EngraveStyle
import io.github.e1caro.scorebook.core.engrave.Engraver
import io.github.e1caro.scorebook.core.play.PianoSynth
import io.github.e1caro.scorebook.render.PageRenderer
import io.github.e1caro.scorebook.render.Palette
import androidx.core.content.ContextCompat
import kotlinx.coroutines.delay
import kotlin.math.roundToInt

private fun levelColor(level: Level): Color = when (level) { Level.EASY -> Color(0xFF7BC47F); Level.MEDIUM -> Gold; Level.HARD -> RecordRed }

/** The card on the Listen screen: what to try today (a pattern and a motif), and the practice streak. */
@Composable
fun DailyCard(pick: DailyPick, motif: MotifPick, log: PracticeLog, today: Long, onPattern: () -> Unit, onMotif: () -> Unit, onAnother: (motif: Boolean) -> Unit) {
    Column(
        Modifier.padding(horizontal = 16.dp, vertical = 6.dp).fillMaxWidth().clip(RoundedCornerShape(20.dp))
            .background(Brush.horizontalGradient(listOf(Color(0xFF2B2416), StageRaised))).border(1.dp, Gold.copy(alpha = 0.35f), RoundedCornerShape(20.dp))
            .padding(vertical = 10.dp),
    ) {
        Row(Modifier.padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("TODAY", color = Gold, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            val streak = log.streak(today)
            if (streak > 0) Text(
                if (streak == 1) "1 day practised" else "$streak days in a row",
                color = if (log.practisedOn(today)) Gold else InkDim, fontSize = 12.sp, fontWeight = FontWeight.Bold,
            )
        }
        DailyRow("Accompaniment", pick, log.stars(pick.id), onPattern) { onAnother(false) }
        DailyRow("Motif", motif, log.stars(motif.id), onMotif) { onAnother(true) }
    }
}

@Composable
private fun DailyRow(kind: String, study: Study, stars: Int, onOpen: () -> Unit, onAnother: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onOpen).padding(horizontal = 16.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(kind.uppercase(), color = InkDim, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                if (stars > 0) Text("  " + "★".repeat(stars), color = Gold, fontSize = 11.sp)
            }
            Text(study.name, color = Ink, fontSize = 18.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text("${study.style} · ${study.level.label} · ${study.key.displayName}", color = InkDim, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        // not in the mood for this one: show a different one
        Text(
            "Another", color = InkDim, fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 1, softWrap = false,
            modifier = Modifier.clip(RoundedCornerShape(50)).clickable(onClickLabel = "Recommend another one", onClick = onAnother).padding(horizontal = 10.dp, vertical = 7.dp),
        )
        Box(Modifier.clip(RoundedCornerShape(50)).background(Gold).padding(horizontal = 14.dp, vertical = 7.dp)) {
            Text("Try it", color = Stage, fontWeight = FontWeight.Bold, fontSize = 13.sp, maxLines = 1, softWrap = false)
        }
    }
}

/**
 * A study written out on the grand staff: an accompaniment pattern (the right-hand staff is empty: that is for the
 * melody) or a motif. With playback, tempo and key controls, the play-along check, the other patterns and
 * motifs, and for patterns "use it on my last song".
 */
@Composable
fun AccompanimentScreen(vm: ScorebookViewModel, ui: AccompanyUi, onBack: () -> Unit) {
    val study = ui.study
    val pick = ui.pick
    val pb by vm.playback.collectAsState()
    val listen by vm.listen.collectAsState()
    val context = LocalContext.current
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { ok -> if (ok) vm.startCheck(true) }
    val onCheck = {
        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        if (granted || listen.midiDevice != null) vm.startCheck(granted) else launcher.launch(Manifest.permission.RECORD_AUDIO)
    }
    val check = ui.check
    if (check?.state == CheckState.LISTENING) KeepScreenOn()
    var playPos by remember { mutableDoubleStateOf(-1.0) }
    LaunchedEffect(pb.playing) {
        while (pb.playing) { playPos = vm.playbackPosition(); delay(40) }
        playPos = -1.0
    }
    // playback goes through it twice; the score shows it once
    val perPass = ui.transcription.notes.size
    val voices = remember(study) { PianoSynth.voices(study.transcription(Studies.repeats(study))) }
    val sounding: Set<Int> = remember(playPos, voices) {
        if (playPos < 0 || perPass == 0) emptySet()
        else voices.filter { playPos >= it.start && playPos < it.start + minOf(it.duration, 1.2) }.map { it.eventId % perPass }.toSet()
    }
    // after a check, the notes that were not played are the ones lit
    val missed: Set<Int> = check?.result?.missed ?: emptySet()
    val scroll = rememberScrollState()
    LaunchedEffect(study.id) { scroll.scrollTo(0) }

    Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = Ink) }
            Column(Modifier.weight(1f)) {
                val kind = if (pick != null) "ACCOMPANIMENT" else "MOTIF"
                Text(if (ui.today) "TODAY'S $kind" else kind, color = Gold, fontSize = 12.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(study.name, color = Ink, fontSize = 22.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            // not this one: a different recommendation of the same kind
            Text(
                "Another one", color = Gold, fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 1, softWrap = false,
                modifier = Modifier.padding(start = 6.dp, end = 10.dp).clip(RoundedCornerShape(50)).background(StageHigh).clickable { vm.anotherRecommendation(motif = pick == null) }
                    .padding(horizontal = 12.dp, vertical = 8.dp),
            )
        }
        BoxWithConstraints(Modifier.fillMaxWidth().weight(1f).clipToBounds()) {
            val w = constraints.maxWidth.toDouble()
            val viewport = constraints.maxHeight
            val density = LocalDensity.current
            val renderer = remember { PageRenderer(vm.music, Palette.STAGE) }
            val style = with(density) { EngraveStyle(staffSpace = 7.dp.toPx().toDouble(), margin = 14.dp.toPx().toDouble(), title = false) }
            val page = remember(ui.score, w) { Engraver(style).continuous(ui.score, w) }
            var scoreTop by remember { mutableFloatStateOf(0f) }
            val lit = if (sounding.isNotEmpty()) sounding else missed
            LaunchedEffect(lit) {
                val ys = page.hits.filter { it.eventId in lit }.map { it.y }
                if (ys.isNotEmpty()) {
                    val y = scoreTop + ys.min()
                    if (y < scroll.value + 40 || y > scroll.value + viewport * 0.7) scroll.animateScrollTo((y - viewport * 0.3).toInt().coerceAtLeast(0))
                }
            }
            Column(Modifier.fillMaxSize().verticalScroll(scroll)) {
                Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 14.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (ui.bestStars > 0) Chip("★".repeat(ui.bestStars) + "☆".repeat(3 - ui.bestStars) + "  your best", color = Gold)
                    Chip(study.style, color = Gold)
                    Chip(study.level.label, color = levelColor(study.level))
                    Chip(study.meter.label)
                    Chip(study.key.displayName)
                    Chip("♩ = ${study.bpm}")
                }
                // the harmony: chord names, and how they relate to the key
                Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp).fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(StageRaised).padding(14.dp)) {
                    val names = study.chords.map { it.label(study.key) }
                    val shown = if (names.size > 8) names.distinct() else names.filterIndexed { i, n -> i == 0 || names[i - 1] != n }
                    Text(shown.joinToString("   "), color = Ink, fontSize = 20.sp, fontWeight = FontWeight.Bold, lineHeight = 26.sp)
                    Spacer(Modifier.height(2.dp))
                    Text(study.roman, color = InkDim, fontSize = 13.sp)
                    if (pick != null && pick.pattern.progressions.size > 1) {
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Try other chords", color = Gold, fontSize = 14.sp, fontWeight = FontWeight.Bold,
                            modifier = Modifier.clip(RoundedCornerShape(50)).background(StageHigh).clickable { vm.accompanyNextChords() }.padding(horizontal = 14.dp, vertical = 7.dp),
                        )
                    }
                }
                Text(
                    if (pick != null) "Left hand, one chord per bar. The top staff is yours: play or sing the melody." else "A figure to learn in both hands and then make your own.",
                    color = InkDim, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 18.dp),
                )
                val h = with(density) { page.height.toFloat().toDp() }
                Canvas(Modifier.fillMaxWidth().height(h).clipToBounds().onGloballyPositioned { scoreTop = it.positionInParent().y }) {
                    drawIntoCanvas { renderer.draw(it.nativeCanvas, page, null, lit) }
                }
                Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp).fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(StageRaised).padding(16.dp)) {
                    Text("What it is", color = Ink, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    Text(study.about, color = InkDim, fontSize = 14.sp, lineHeight = 20.sp)
                    Spacer(Modifier.height(10.dp))
                    Text("Tip", color = Gold, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    Text(study.tip, color = InkDim, fontSize = 14.sp, lineHeight = 20.sp)
                }
                val log by vm.practice.collectAsState()
                Text("Accompaniment patterns", color = Ink, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 20.dp, top = 10.dp, bottom = 4.dp))
                for (p in Patterns.ALL) StudyRow(p.name, "${p.style} · ${p.level.label}", p.level, p.meter.label, log.stars("pattern:${p.id}"), selected = p.id == pick?.pattern?.id) { vm.accompanyPattern(p) }
                Text("Motifs", color = Ink, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 20.dp, top = 14.dp, bottom = 0.dp))
                Text("Bass lines, riffs, sequences and endings that musicians reuse.", color = InkDim, fontSize = 13.sp, modifier = Modifier.padding(start = 20.dp, end = 20.dp, bottom = 4.dp))
                for (mo in Motifs.ALL) StudyRow(mo.name, "${mo.style} · ${mo.level.label}", mo.level, mo.meter.label, log.stars("motif:${mo.id}"), selected = mo.id == (study as? MotifPick)?.motif?.id) { vm.accompanyMotif(mo) }
                Spacer(Modifier.height(16.dp))
            }
        }

        ui.message?.let { msg ->
            LaunchedEffect(msg) { delay(3500); vm.clearMessage() }
            Text(msg, color = Stage, fontSize = 14.sp, modifier = Modifier.fillMaxWidth().background(Gold).padding(12.dp))
        }

        if (check != null) {
            CheckPanel(vm, ui, check, onAgain = onCheck)
        } else {
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
                        Text("♩ = ${study.bpm}", color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 1, softWrap = false)
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
                        Text(study.key.shortName, color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 1, softWrap = false)
                        Text("Key", color = InkDim, fontSize = 11.sp, maxLines = 1, softWrap = false)
                    }
                    Icon(
                        Icons.Filled.KeyboardArrowUp, contentDescription = "Key up", tint = Ink,
                        modifier = Modifier.size(36.dp).clip(CircleShape).clickable { vm.accompanyTranspose(1) }.padding(6.dp),
                    )
                }
            }
            // check my playing; and, for a pattern, use it on the newest song
            Row(Modifier.fillMaxWidth().background(StageRaised).padding(start = 14.dp, end = 14.dp, bottom = 10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                WideButton("Check my playing", "Play it once: I listen and tell you how it went", filled = true, modifier = Modifier.weight(1f), onClick = onCheck)
                val lastId = ui.lastTakeId
                if (pick != null && lastId != null && ui.fitsLastSong) {
                    WideButton("Use on my last song", "“${ui.lastTitle ?: "Untitled"}” with this left hand, as a new song", filled = false, modifier = Modifier.weight(1f)) {
                        vm.accompanySong(lastId, pick.pattern)
                    }
                }
            }
        }
    }
}

@Composable
private fun WideButton(title: String, sub: String, filled: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Column(
        modifier.clip(RoundedCornerShape(14.dp)).background(if (filled) Gold else StageHigh)
            .border(1.dp, Gold.copy(alpha = if (filled) 0f else 0.5f), RoundedCornerShape(14.dp)).clickable(onClick = onClick).padding(horizontal = 12.dp, vertical = 9.dp),
    ) {
        Text(title, color = if (filled) Stage else Gold, fontSize = 15.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(sub, color = if (filled) Stage.copy(alpha = 0.75f) else InkDim, fontSize = 11.sp, lineHeight = 14.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
    }
}

/** The play-along check: listening, then stars and what to work on. */
@Composable
private fun CheckPanel(vm: ScorebookViewModel, ui: AccompanyUi, check: CheckUi, onAgain: () -> Unit) {
    Column(Modifier.fillMaxWidth().background(StageHigh).padding(horizontal = 16.dp, vertical = 12.dp)) {
        when (check.state) {
            CheckState.LISTENING -> {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(12.dp).clip(CircleShape).background(RecordRed))
                    Spacer(Modifier.width(8.dp))
                    Text(if (check.heard) "Listening…  ${vm.durationText(check.seconds)}" else "Play it now", color = Ink, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                    Text("Cancel", color = InkDim, fontSize = 14.sp, modifier = Modifier.clip(RoundedCornerShape(50)).clickable { vm.stopCheck() }.padding(horizontal = 10.dp, vertical = 6.dp))
                }
                Text("Once through, at your own tempo. I stop by myself when you finish. Nothing is recorded.", color = InkDim, fontSize = 13.sp, lineHeight = 18.sp)
                Spacer(Modifier.height(8.dp))
                val level = ((check.levelDb + 70) / 60).coerceIn(0.0, 1.0).toFloat()
                Box(Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)).background(Stage)) {
                    Box(Modifier.fillMaxWidth(level).height(8.dp).clip(RoundedCornerShape(4.dp)).background(Gold))
                }
                Spacer(Modifier.height(10.dp))
                Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Gold).clickable { vm.finishCheck() }.padding(vertical = 11.dp), contentAlignment = Alignment.Center) {
                    Text("I'm done", color = Stage, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                }
            }
            CheckState.ANALYZING -> Text("Checking…", color = Ink, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            CheckState.DONE -> check.result?.let { r ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("★".repeat(r.stars) + "☆".repeat(3 - r.stars), color = Gold, fontSize = 26.sp)
                    Spacer(Modifier.width(12.dp))
                    Text(r.headline, color = Ink, fontSize = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                }
                if (r.hit > 0) Text(
                    "Notes ${(r.notes * 100).roundToInt()}%" + (if (r.bpm != null) "  ·  Rhythm ${(r.rhythm * 100).roundToInt()}%" else ""),
                    color = Gold, fontSize = 14.sp, fontWeight = FontWeight.Bold,
                )
                Text(r.advice(ui.study.bpm), color = InkDim, fontSize = 14.sp, lineHeight = 19.sp)
                if (r.passed && ui.streak > 0) {
                    Spacer(Modifier.height(4.dp))
                    Text(if (ui.streak == 1) "Practised today. Come back tomorrow to start a streak." else "${ui.streak} days in a row.", color = Ink, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).background(Gold).clickable(onClick = onAgain).padding(vertical = 11.dp), contentAlignment = Alignment.Center) {
                        Text("Try again", color = Stage, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    }
                    Box(Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).background(Stage).clickable { vm.stopCheck() }.padding(vertical = 11.dp), contentAlignment = Alignment.Center) {
                        Text("Close", color = Ink, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    }
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
private fun StudyRow(name: String, sub: String, level: Level, meter: String, stars: Int, selected: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.padding(horizontal = 16.dp, vertical = 3.dp).fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(if (selected) StageHigh else StageRaised)
            .clickable(onClick = onClick).padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(10.dp).clip(CircleShape).background(levelColor(level)))
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(name, color = if (selected) Gold else Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(sub, color = InkDim, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        if (stars > 0) Text("★".repeat(stars), color = Gold, fontSize = 13.sp, modifier = Modifier.padding(end = 8.dp))
        Text(meter, color = InkDim, fontSize = 14.sp, fontWeight = FontWeight.Bold)
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
            for (p in patterns) StudyRow(p.name, "${p.style} · ${p.level.label}", p.level, p.meter.label, 0, selected = false) { onDismiss(); vm.accompanySong(ui.takeId, p) }
        }
    }
}
