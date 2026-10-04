package com.shift.habla;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin propio: elegir por dónde se escucha y se habla (auriculares o teléfono).
        registerPlugin(AudioRoutePlugin.class);
        super.onCreate(savedInstanceState);
    }

    /**
     * Batería (NC-14): con la app en segundo plano, el WebView queda inactivo. onPause() detiene animaciones
     * (la mascota se dibuja en cada fotograma) y pauseTimers() congela los temporizadores de JavaScript.
     * Se hace en onStop (la app ya no se ve), no en onPause, para no congelarla con un simple diálogo del sistema.
     * Antes de esto, el JavaScript ya recibió el aviso de "pausa" y cerró el micrófono y la voz.
     */
    @Override
    public void onStop() {
        super.onStop();
        WebView wv = bridge != null ? bridge.getWebView() : null;
        if (wv != null) {
            wv.onPause();
            wv.pauseTimers();
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        WebView wv = bridge != null ? bridge.getWebView() : null;
        if (wv != null) {
            wv.resumeTimers();
            wv.onResume();
        }
    }
}
