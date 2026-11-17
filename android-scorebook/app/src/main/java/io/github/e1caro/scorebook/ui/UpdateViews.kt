package io.github.e1caro.scorebook.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.roundToInt

/** What is happening with an update, in one line. */
private fun statusLine(u: UpdateUi): String = when (u.state) {
    UpdateState.AVAILABLE -> u.update?.let { "${it.name} is available" } ?: ""
    UpdateState.DOWNLOADING -> "Downloading ${u.update?.name ?: "the update"}… ${(u.progress * 100).roundToInt()}%"
    UpdateState.READY -> "${u.update?.name ?: "The update"} is ready"
    UpdateState.INSTALLING -> "Installing… Android may ask you to confirm"
    UpdateState.FAILED -> u.message ?: "The update did not work"
    UpdateState.CHECKING -> "Looking for updates…"
    UpdateState.UP_TO_DATE -> "You have the newest version"
    UpdateState.IDLE -> ""
}

/** On the Listen screen when a newer version exists: one tap downloads and installs it. */
@Composable
fun UpdateBanner(vm: ScorebookViewModel) {
    val u by vm.update.collectAsState()
    val needsTap by vm.needsUpdateTap.collectAsState()
    val update = u.update ?: return
    if (u.state == UpdateState.IDLE || u.state == UpdateState.UP_TO_DATE || u.state == UpdateState.CHECKING) return
    Column(
        Modifier.padding(horizontal = 16.dp, vertical = 6.dp).fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(StageHigh)
            .border(1.dp, Gold.copy(alpha = 0.5f), RoundedCornerShape(16.dp)).padding(horizontal = 14.dp, vertical = 10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(statusLine(u), color = if (u.state == UpdateState.FAILED) RecordRed else Ink, fontSize = 15.sp, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                val detail = when {
                    (u.state == UpdateState.READY || u.state == UpdateState.AVAILABLE) && needsTap -> "Android needs your OK: tap Install and confirm. If it allows it, later updates install by themselves."
                    u.state == UpdateState.READY && vm.autoInstall -> "It installs by itself when you leave the app."
                    u.message != null && u.state != UpdateState.FAILED -> u.message
                    (u.state == UpdateState.AVAILABLE || u.state == UpdateState.READY) && update.notes.isNotBlank() -> update.notes.lineSequence().first()
                    else -> null
                }
                if (detail != null) Text(detail, color = InkDim, fontSize = 12.sp, lineHeight = 16.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            if (u.state == UpdateState.AVAILABLE || u.state == UpdateState.READY || u.state == UpdateState.FAILED) {
                Spacer(Modifier.width(10.dp))
                Box(Modifier.clip(RoundedCornerShape(50)).background(Gold).clickable { vm.installUpdate() }.padding(horizontal = 14.dp, vertical = 8.dp)) {
                    Text(
                        when { u.state == UpdateState.FAILED -> "Try again"; u.state == UpdateState.READY || needsTap -> "Install now"; else -> "Update · ${update.sizeText}" },
                        color = Stage, fontWeight = FontWeight.Bold, fontSize = 13.sp, maxLines = 1, softWrap = false,
                    )
                }
            }
        }
        if (u.state == UpdateState.DOWNLOADING) {
            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(progress = { u.progress }, modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)), color = Gold, trackColor = Stage)
        }
    }
}

/** In Settings: the installed version, what was found, and the buttons. */
@Composable
fun UpdateSettings(vm: ScorebookViewModel) {
    val u by vm.update.collectAsState()
    Text(vm.versionText, color = Ink, fontSize = 16.sp)
    val line = statusLine(u)
    if (line.isNotEmpty()) Text(line, color = if (u.state == UpdateState.FAILED) RecordRed else if (u.state == UpdateState.AVAILABLE) Gold else InkDim, fontSize = 14.sp, lineHeight = 19.sp)
    if (u.state == UpdateState.DOWNLOADING) {
        Spacer(Modifier.height(8.dp))
        LinearProgressIndicator(progress = { u.progress }, modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)), color = Gold, trackColor = Stage)
    }
    val update = u.update
    if (update != null && u.state == UpdateState.AVAILABLE && update.notes.isNotBlank()) {
        Spacer(Modifier.height(4.dp))
        Text(update.notes, color = InkDim, fontSize = 13.sp, lineHeight = 18.sp, maxLines = 8, overflow = TextOverflow.Ellipsis)
    }
    Spacer(Modifier.height(10.dp))
    val busy = u.state == UpdateState.CHECKING || u.state == UpdateState.DOWNLOADING || u.state == UpdateState.INSTALLING
    val canInstall = update != null && (u.state == UpdateState.AVAILABLE || u.state == UpdateState.READY || u.state == UpdateState.FAILED)
    if (!busy) {
        Box(
            Modifier.clip(RoundedCornerShape(50)).background(if (canInstall) Gold else StageHigh)
                .clickable { if (canInstall) vm.installUpdate() else vm.checkForUpdate(manual = true) }.padding(horizontal = 18.dp, vertical = 10.dp),
        ) {
            Text(
                if (!canInstall) "Check for updates" else if (u.state == UpdateState.READY) "Install now" else "Update now · ${update!!.sizeText}",
                color = if (canInstall) Stage else Gold, fontWeight = FontWeight.Bold, fontSize = 14.sp,
            )
        }
    }
}
