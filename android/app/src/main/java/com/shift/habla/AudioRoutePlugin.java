package com.shift.habla;

import android.Manifest;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.media.AudioAttributes;
import android.media.AudioDeviceCallback;
import android.media.AudioDeviceInfo;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
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
    // v5.10 (P2, uso real): foco de audio. Mientras habla el profe, la música de otras apps baja de volumen (duck); al
    // grabar, se pausa (para que no se cuele en el micro). Al terminar se devuelve el foco y la música sigue.
    private AudioFocusRequest focusReq;
    private final AudioManager.OnAudioFocusChangeListener focusListener = change -> { };

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

    /** APK debug (com.shift.habla.debug): solo ahí se escriben nombres de dispositivos en logcat (REG-A2-06). */
    private boolean isDebuggable() {
        return (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
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
                    // 5.10.1 (REG-M-01): si los auriculares ya son el dispositivo de comunicación, no se vuelve a pedir
                    // ni a esperar: la clase retiene la ruta y cada toque la consulta.
                    AudioDeviceInfo cur = am.getCommunicationDevice();
                    if (cur != null && cur.getId() == pick.getId()) {
                        r.put("ok", true);
                        r.put("ms", 0);
                        r.put("device", dev(pick));
                        r.put("state", describe());
                        call.resolve(r);
                        return;
                    }
                    final AudioDeviceInfo target = pick;
                    new Thread(() -> {
                        long t0 = System.currentTimeMillis();
                        boolean ok = waitRoute(target, 2000) || waitRoute(target, 2000);
                        AudioDeviceInfo now = am.getCommunicationDevice();
                        // 5.10.1 (REG-A2-06, FUG-405): el nombre de los auriculares solo sale en logcat en el APK debug.
                        boolean dbg = isDebuggable();
                        Log.i("HablaAudio", "ruta auriculares " + (ok ? "lista" : "NO lista") + " en " + (System.currentTimeMillis() - t0) + " ms · "
                            + (dbg ? target.getProductName() + " " : "") + "tipo " + target.getType() + " · ahora: "
                            + (now == null ? "ninguno" : (dbg ? now.getProductName() + " " : "") + "tipo " + now.getType()) + " · modo " + am.getMode());
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

    @PluginMethod
    public void requestFocus(PluginCall call) {
        boolean pause = "pause".equals(call.getString("kind", "duck"));
        try {
            releaseFocus();
            int gain = pause ? AudioManager.AUDIOFOCUS_GAIN_TRANSIENT : AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK;
            int res;
            if (Build.VERSION.SDK_INT >= 26) {
                AudioAttributes attrs = new AudioAttributes.Builder()
                    .setUsage(pause ? AudioAttributes.USAGE_VOICE_COMMUNICATION : AudioAttributes.USAGE_ASSISTANT)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build();
                focusReq = new AudioFocusRequest.Builder(gain).setAudioAttributes(attrs).setOnAudioFocusChangeListener(focusListener).build();
                res = am.requestAudioFocus(focusReq);
            } else {
                res = am.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, gain);
            }
            JSObject r = new JSObject();
            r.put("granted", res == AudioManager.AUDIOFOCUS_REQUEST_GRANTED);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("No se pudo pedir el foco de audio: " + e.getMessage());
        }
    }

    @PluginMethod
    public void abandonFocus(PluginCall call) {
        try {
            releaseFocus();
        } catch (Exception e) {
            Log.w("HablaAudio", "abandonFocus: " + e.getMessage());
        }
        call.resolve();
    }

    private void releaseFocus() {
        if (am == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            if (focusReq != null) am.abandonAudioFocusRequest(focusReq);
            focusReq = null;
        } else {
            am.abandonAudioFocus(focusListener);
        }
    }
}
