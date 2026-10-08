package com.shift.habla;

import android.Manifest;
import android.content.Context;
import android.media.AudioDeviceCallback;
import android.media.AudioDeviceInfo;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.List;

/**
 * Elegir por dónde se escucha y se habla (auriculares o teléfono).
 *
 * El WebView no puede activar por sí solo el micrófono de unos auriculares Bluetooth: necesita el permiso
 * BLUETOOTH_CONNECT y que alguien le diga a Android que use ese dispositivo para la "comunicación" (micro de
 * voz + salida de voz). Sin eso, getUserMedia recibe un "Bluetooth headset" mudo (todo ceros).
 *
 *   - route "headset": modo comunicación + dispositivo de comunicación = auriculares (BT, BLE, cable o USB).
 *   - route "phone":   se suelta el dispositivo de comunicación y se vuelve al modo normal.
 *
 * Evento "devicesChanged" cuando se conecta o desconecta un dispositivo de audio.
 */
@CapacitorPlugin(
    name = "AudioRoute",
    permissions = { @Permission(alias = "bluetooth", strings = { Manifest.permission.BLUETOOTH_CONNECT }) }
)
public class AudioRoutePlugin extends Plugin {

    private AudioManager am;
    private final Handler main = new Handler(Looper.getMainLooper());

    private final AudioDeviceCallback callback = new AudioDeviceCallback() {
        @Override
        public void onAudioDevicesAdded(AudioDeviceInfo[] added) {
            notifyListeners("devicesChanged", describe());
        }

        @Override
        public void onAudioDevicesRemoved(AudioDeviceInfo[] removed) {
            notifyListeners("devicesChanged", describe());
        }
    };

    @Override
    public void load() {
        am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        am.registerAudioDeviceCallback(callback, main);
    }

    /**
     * En segundo plano no se retiene el "modo llamada" ni el Bluetooth SCO: mantenerlos impide que el audio del
     * teléfono se duerma y gasta mucha batería (NC-14). Se hace aquí, en nativo, para que ocurra aunque el
     * JavaScript del WebView no llegue a ejecutarse. Al volver, la app reaplica la ruta elegida.
     */
    @Override
    protected void handleOnStop() {
        releaseRoute();
    }

    private void releaseRoute() {
        if (am == null) return;
        try {
            if (Build.VERSION.SDK_INT >= 31) am.clearCommunicationDevice();
            else {
                am.setBluetoothScoOn(false);
                am.stopBluetoothSco();
            }
            if (am.getMode() != AudioManager.MODE_NORMAL) am.setMode(AudioManager.MODE_NORMAL);
        } catch (Exception e) {
            Log.w("HablaAudio", "releaseRoute: " + e.getMessage());
        }
    }

    @Override
    protected void handleOnDestroy() {
        releaseRoute();
        if (am != null) am.unregisterAudioDeviceCallback(callback);
    }

    // ------------------------------------------------------------------------------------------------

    private static boolean isHeadset(int type) {
        return type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
            || type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP
            || type == AudioDeviceInfo.TYPE_WIRED_HEADSET
            || type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES
            || type == AudioDeviceInfo.TYPE_USB_HEADSET
            || (Build.VERSION.SDK_INT >= 31 && (type == AudioDeviceInfo.TYPE_BLE_HEADSET || type == AudioDeviceInfo.TYPE_BLE_SPEAKER));
    }

    private static boolean isBluetooth(int type) {
        return type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
            || type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP
            || (Build.VERSION.SDK_INT >= 31 && (type == AudioDeviceInfo.TYPE_BLE_HEADSET || type == AudioDeviceInfo.TYPE_BLE_SPEAKER));
    }

    private static String kind(int type) {
        if (isBluetooth(type)) return "bluetooth";
        if (type == AudioDeviceInfo.TYPE_WIRED_HEADSET || type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES) return "wired";
        if (type == AudioDeviceInfo.TYPE_USB_HEADSET || type == AudioDeviceInfo.TYPE_USB_DEVICE) return "usb";
        if (type == AudioDeviceInfo.TYPE_BUILTIN_MIC || type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER || type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE) return "phone";
        return "other";
    }

    private JSObject dev(AudioDeviceInfo d) {
        JSObject o = new JSObject();
        o.put("id", d.getId());
        o.put("type", d.getType());
        o.put("kind", kind(d.getType()));
        o.put("name", String.valueOf(d.getProductName()));
        o.put("headset", isHeadset(d.getType()));
        return o;
    }

    private boolean hasBtPermission() {
        return Build.VERSION.SDK_INT < 31 || getPermissionState("bluetooth") == PermissionState.GRANTED;
    }

    /** Estado actual: entradas, salidas, auriculares disponibles y ruta de comunicación activa. */
    private JSObject describe() {
        JSObject r = new JSObject();
        JSArray inputs = new JSArray();
        JSArray outputs = new JSArray();
        String headsetName = null;
        boolean headsetMic = false;
        for (AudioDeviceInfo d : am.getDevices(AudioManager.GET_DEVICES_INPUTS)) {
            inputs.put(dev(d));
            if (isHeadset(d.getType())) {
                headsetMic = true;
                if (headsetName == null) headsetName = String.valueOf(d.getProductName());
            }
        }
        for (AudioDeviceInfo d : am.getDevices(AudioManager.GET_DEVICES_OUTPUTS)) {
            outputs.put(dev(d));
            if (isHeadset(d.getType()) && headsetName == null) headsetName = String.valueOf(d.getProductName());
        }
        r.put("inputs", inputs);
        r.put("outputs", outputs);
        r.put("headset", headsetName != null);
        r.put("headsetName", headsetName == null ? "" : headsetName);
        // Los auriculares Bluetooth solo exponen micrófono como dispositivo de comunicación (SCO/BLE),
        // que no aparece en las entradas hasta que se activa: se mira también la lista de comunicación.
        boolean commHeadset = false;
        if (Build.VERSION.SDK_INT >= 31) {
            JSArray comm = new JSArray();
            for (AudioDeviceInfo d : am.getAvailableCommunicationDevices()) {
                comm.put(dev(d));
                if (isHeadset(d.getType())) commHeadset = true;
            }
            r.put("communication", comm);
            AudioDeviceInfo cur = am.getCommunicationDevice();
            r.put("current", cur == null ? null : dev(cur));
        }
        r.put("headsetMic", headsetMic || commHeadset);
        r.put("mode", am.getMode());
        r.put("btPermission", hasBtPermission());
        return r;
    }

    @PluginMethod
    public void getDevices(PluginCall call) {
        call.resolve(describe());
    }

    /** Pide BLUETOOTH_CONNECT (Android 12+). Sin él no se puede usar el micrófono de unos auriculares BT. */
    @PluginMethod
    public void requestBluetooth(PluginCall call) {
        if (hasBtPermission()) {
            JSObject r = new JSObject();
            r.put("granted", true);
            call.resolve(r);
            return;
        }
        requestPermissionForAlias("bluetooth", call, "btPermissionCallback");
    }

    @PermissionCallback
    private void btPermissionCallback(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", hasBtPermission());
        call.resolve(r);
    }

    /** Pide `target` como dispositivo de comunicación y espera hasta `ms` a que Android lo haga efectivo. */
    private boolean waitRoute(AudioDeviceInfo target, long ms) {
        if (Build.VERSION.SDK_INT < 31) return false;
        try {
            am.setCommunicationDevice(target);
            long end = System.currentTimeMillis() + ms;
            while (System.currentTimeMillis() < end) {
                AudioDeviceInfo now = am.getCommunicationDevice();
                if (now != null && now.getId() == target.getId()) return true;
                Thread.sleep(50);
            }
        } catch (Exception e) {
            Log.w("HablaAudio", "waitRoute: " + e.getMessage());
        }
        return false;
    }

    /** route: "headset" (hablar y escuchar por los auriculares) o "phone" (todo por el teléfono / normal). */
    @PluginMethod
    public void setRoute(PluginCall call) {
        String route = call.getString("route", "phone");
        JSObject r = new JSObject();
        try {
            if ("headset".equals(route)) {
                if (!hasBtPermission()) {
                    call.reject("Falta el permiso de Bluetooth");
                    return;
                }
                am.setMode(AudioManager.MODE_IN_COMMUNICATION);
                if (Build.VERSION.SDK_INT >= 31) {
                    AudioDeviceInfo pick = null;
                    List<AudioDeviceInfo> list = am.getAvailableCommunicationDevices();
                    // Preferencia: Bluetooth/BLE, luego cable o USB.
                    for (AudioDeviceInfo d : list) if (isBluetooth(d.getType())) { pick = d; break; }
                    if (pick == null) for (AudioDeviceInfo d : list) if (isHeadset(d.getType())) { pick = d; break; }
                    if (pick == null) {
                        call.reject("No hay auriculares con micrófono disponibles");
                        return;
                    }
                    // MOV-4: setCommunicationDevice es ASÍNCRONO (antes se comprobaba al instante y daba «falló» aunque
                    // la ruta llegaba ~0,3 s después). Se espera a que sea efectiva, como el WebRTC de Google
                    // (AppRTCBluetoothManager: 4 s y 2 intentos). Fuera del hilo de los plugins para no bloquearlos.
                    final AudioDeviceInfo target = pick;
                    new Thread(() -> {
                        long t0 = System.currentTimeMillis();
                        boolean ok = waitRoute(target, 2000) || waitRoute(target, 2000);
                        AudioDeviceInfo now = am.getCommunicationDevice();
                        Log.i("HablaAudio", "ruta auriculares " + (ok ? "lista" : "NO lista") + " en " + (System.currentTimeMillis() - t0) + " ms · "
                            + target.getProductName() + " tipo " + target.getType() + " · ahora: "
                            + (now == null ? "ninguno" : now.getProductName() + " tipo " + now.getType()) + " · modo " + am.getMode());
                        r.put("ok", ok);
                        r.put("ms", System.currentTimeMillis() - t0);
                        r.put("device", dev(target));
                        r.put("state", describe());
                        call.resolve(r);
                    }).start();
                    return;
                } else {
                    am.startBluetoothSco();
                    am.setBluetoothScoOn(true);
                    am.setSpeakerphoneOn(false);
                    r.put("ok", true);
                }
            } else {
                if (Build.VERSION.SDK_INT >= 31) am.clearCommunicationDevice();
                else {
                    am.setBluetoothScoOn(false);
                    am.stopBluetoothSco();
                }
                am.setMode(AudioManager.MODE_NORMAL);
                r.put("ok", true);
            }
            r.put("state", describe());
            call.resolve(r);
        } catch (Exception e) {
            call.reject("No se pudo cambiar el audio: " + e.getMessage());
        }
    }

    /**
     * MOV-4 · ¿llega audio del micro de los auriculares? Lee `ms` milisegundos con AudioRecord (VOICE_COMMUNICATION,
     * 16 kHz, como una app de llamadas) desde el micro pedido ("bt" o "phone") SIN bloquear, y cuenta las muestras
     * que entrega Android. Un micro vivo entrega ~16 000 muestras por segundo aunque sea silencio (los auriculares con
     * cancelación de ruido mandan ceros exactos si no hablas: por eso no basta con mirar el volumen). Un micro
     * Bluetooth muerto no entrega NADA (medido con unos soundcore Liberty 4 Pro en el POCO, 2026-10-08).
     * Solo cuenta muestras y picos: el audio no se guarda ni sale de aquí.
     */
    @PluginMethod
    public void checkMic(PluginCall call) {
        final String which = call.getString("device", "bt");
        final int ms = Math.max(500, Math.min(15000, call.getInt("ms", 1200)));
        new Thread(() -> {
            AudioRecord rec = null;
            try {
                int rate = 16000;
                int min = AudioRecord.getMinBufferSize(rate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
                rec = new AudioRecord(MediaRecorder.AudioSource.VOICE_COMMUNICATION, rate, AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT, Math.max(min, rate));
                AudioDeviceInfo want = null;
                for (AudioDeviceInfo d : am.getDevices(AudioManager.GET_DEVICES_INPUTS)) {
                    boolean bt = d.getType() == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
                        || (Build.VERSION.SDK_INT >= 31 && d.getType() == AudioDeviceInfo.TYPE_BLE_HEADSET);
                    if ("bt".equals(which) ? bt : d.getType() == AudioDeviceInfo.TYPE_BUILTIN_MIC) { want = d; break; }
                }
                if (want != null) rec.setPreferredDevice(want);
                rec.startRecording();
                short[] buf = new short[rate / 20];
                JSArray peaks = new JSArray();
                long t0 = System.currentTimeMillis();
                long end = t0 + ms;
                long slot = t0 + 500;
                int peak = 0;
                int maxPeak = 0;
                long frames = 0;
                while (System.currentTimeMillis() < end) {
                    int n = rec.read(buf, 0, buf.length, AudioRecord.READ_NON_BLOCKING);
                    if (n > 0) {
                        frames += n;
                        for (int i = 0; i < n; i++) peak = Math.max(peak, Math.abs((int) buf[i]));
                    } else Thread.sleep(20);
                    if (System.currentTimeMillis() >= slot) {
                        peaks.put(Math.round(peak / 32.768) / 1000.0);
                        maxPeak = Math.max(maxPeak, peak);
                        peak = 0;
                        slot += 500;
                    }
                }
                maxPeak = Math.max(maxPeak, peak);
                long expected = (long) rate * (System.currentTimeMillis() - t0) / 1000;
                AudioDeviceInfo routed = rec.getRoutedDevice();
                JSObject r = new JSObject();
                r.put("frames", frames);
                r.put("expected", expected);
                // Vivo: entrega al menos un tercio de lo esperado (el micro tarda unos cientos de ms en arrancar) o da voz.
                r.put("alive", frames * 3 >= expected || maxPeak > 0);
                r.put("peak", Math.round(maxPeak / 32.768) / 1000.0);
                r.put("asked", want == null ? "ninguno" : want.getProductName() + " tipo " + want.getType());
                r.put("routed", routed == null ? "ninguno" : routed.getProductName() + " tipo " + routed.getType());
                r.put("peaks", peaks);
                call.resolve(r);
            } catch (Exception e) {
                call.reject("checkMic: " + e.getMessage());
            } finally {
                if (rec != null) {
                    try { rec.stop(); } catch (Exception ignored) { }
                    rec.release();
                }
            }
        }).start();
    }
}
