package com.shift.habla;

import android.content.pm.ActivityInfo;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Orientación de la app elegida en Ajustes → Apariencia. "landscape" y "reverseLandscape" fijan la pantalla en
 * horizontal sin depender del sensor del teléfono (útil si no gira o si una zona de la pantalla está dañada).
 * "auto" sigue al teléfono. La actividad maneja el cambio sin reiniciarse (configChanges en el manifiesto).
 */
@CapacitorPlugin(name = "Orientation")
public class OrientationPlugin extends Plugin {

    @PluginMethod
    public void set(PluginCall call) {
        String mode = call.getString("mode", "auto");
        int o;
        switch (mode) {
            case "portrait": o = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT; break;
            case "landscape": o = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE; break;
            case "reverseLandscape": o = ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE; break;
            default: o = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED;
        }
        final int target = o;
        getActivity().runOnUiThread(() -> {
            getActivity().setRequestedOrientation(target);
            call.resolve();
        });
    }

    /**
     * 5.10.1 (REG-M-05): la letra del sistema (Ajustes de Android → Tamaño de fuente). MainActivity fija el textZoom del
     * WebView a 100 % y la app la combina con su propio ajuste y sus topes (lib/fontScale.ts).
     */
    @PluginMethod
    public void getFontScale(PluginCall call) {
        JSObject r = new JSObject();
        r.put("scale", getContext().getResources().getConfiguration().fontScale);
        call.resolve(r);
    }
}
