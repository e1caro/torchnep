package io.github.e1caro.scorebook.audio

import android.content.Context
import android.content.pm.PackageManager
import android.media.midi.MidiDevice
import android.media.midi.MidiDeviceInfo
import android.media.midi.MidiManager
import android.media.midi.MidiOutputPort
import android.media.midi.MidiReceiver
import android.os.Handler
import android.os.Looper
import io.github.e1caro.scorebook.core.live.MidiParser

/**
 * MIDI keyboards (USB, or Bluetooth devices already connected to the phone). The first keyboard that appears is
 * opened automatically; its notes are exact, so they skip the audio model and any correction.
 */
class MidiInput(
    context: Context,
    onNoteOn: (Int, Int) -> Unit,
    onNoteOff: (Int) -> Unit,
    onSustain: (Boolean) -> Unit,
    private val onConnected: (String?) -> Unit,
) {
    private val manager: MidiManager? =
        if (context.packageManager.hasSystemFeature(PackageManager.FEATURE_MIDI)) context.getSystemService(Context.MIDI_SERVICE) as? MidiManager else null
    private val handler = Handler(Looper.getMainLooper())
    private val parser = MidiParser(onNoteOn, onNoteOff, onSustain)
    private var device: MidiDevice? = null
    private var port: MidiOutputPort? = null

    private val receiver = object : MidiReceiver() {
        override fun onSend(msg: ByteArray, offset: Int, count: Int, timestamp: Long) = synchronized(parser) { parser.feed(msg, offset, count) }
    }

    private val callback = object : MidiManager.DeviceCallback() {
        override fun onDeviceAdded(info: MidiDeviceInfo) { if (device == null) open(info) }
        override fun onDeviceRemoved(info: MidiDeviceInfo) {
            if (device?.info?.id == info.id) { close(); onConnected(null); connectFirst() }
        }
    }

    val available: Boolean get() = manager != null

    fun start() {
        val m = manager ?: return
        @Suppress("DEPRECATION")
        m.registerDeviceCallback(callback, handler)
        connectFirst()
    }

    fun stop() {
        @Suppress("DEPRECATION")
        manager?.unregisterDeviceCallback(callback)
        close()
    }

    private fun connectFirst() {
        @Suppress("DEPRECATION")
        val info = manager?.devices?.firstOrNull { it.outputPortCount > 0 } ?: return
        open(info)
    }

    private fun open(info: MidiDeviceInfo) {
        if (info.outputPortCount == 0) return
        manager?.openDevice(info, { d ->
            if (d == null) return@openDevice
            device = d
            port = d.openOutputPort(0)?.also { it.connect(receiver) }
            val props = info.properties
            onConnected(props.getString(MidiDeviceInfo.PROPERTY_NAME) ?: props.getString(MidiDeviceInfo.PROPERTY_PRODUCT) ?: "MIDI keyboard")
        }, handler)
    }

    private fun close() {
        try { port?.disconnect(receiver); port?.close() } catch (_: Exception) {}
        try { device?.close() } catch (_: Exception) {}
        port = null
        device = null
    }
}
