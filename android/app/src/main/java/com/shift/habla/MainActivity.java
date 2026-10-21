package com.shift.habla;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /** Cliente del WebView con la red de seguridad del micrófono (AUD-MIC-308). */
    private HablaChromeClient chrome;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin propio: elegir por dónde se escucha y se habla (auriculares o teléfono).
        registerPlugin(AudioRoutePlugin.class);
        // Plugin propio: confirmar con el bloqueo del teléfono antes de ver o cambiar la clave de Gemini.
        registerPlugin(DeviceAuthPlugin.class);
        // Plugin propio: orientación forzada (vertical u horizontal) elegida en Ajustes.
        registerPlugin(OrientationPlugin.class);
        super.onCreate(savedInstanceState);
        // Sustituye al BridgeWebChromeClient de Capacitor por uno que hereda todo (permisos, selector de archivos…)
        // y deniega el micrófono en segundo plano. Se crea aquí, antes de onStart, porque registra un
        // ActivityResultLauncher para el diálogo de permisos.
        WebView wv = bridge != null ? bridge.getWebView() : null;
        if (wv != null) {
            chrome = new HablaChromeClient(bridge);
            wv.setWebChromeClient(chrome);
            applyTextZoom(wv);
        }
    }

    /**
     * 5.10.1 (REG-M-05): el WebView heredaba la letra del sistema SIN tope (POCO con font_scale 0,86 → un texto de
     * 100 px se pinta a 90 px; con «Grande» en el Galaxy A11, 1,3, el micro de la clase se sale de la pantalla en
     * horizontal). Ahora el WebView no escala nada (textZoom 100 %) y la app escala SOLO el texto con su ajuste
     * «Tamaño de letra» × la letra del sistema (que lee con OrientationPlugin.getFontScale), con topes: 1,3 en vertical
     * y 1,15 en horizontal (lib/fontScale.ts). Al cambiar la letra en Android, la actividad se recrea y se vuelve a leer.
     */
    private void applyTextZoom(WebView wv) {
        if (wv.getSettings().getTextZoom() != 100) wv.getSettings().setTextZoom(100);
    }

    /**
     * Batería (NC-14): con la app en segundo plano, el WebView queda inactivo. onPause() detiene animaciones
     * (la mascota se dibuja en cada fotograma) y pauseTimers() congela los temporizadores de JavaScript.
     * Se hace en onStop (la app ya no se ve), no en onPause, para no congelarla con un simple diálogo del sistema.
     *
     * Micrófono (AUD-MIC-308): el aviso de Capacitor al JavaScript es asíncrono y puede no llegar a ejecutarse
     * (hilo JS ocupado). Por eso, además: 1) desde aquí se deniega cualquier micrófono nuevo (HablaChromeClient);
     * 2) se llama directamente a window.__hablaBackground() (lifecycle.ts: cierra micros y voz, guarda la clase),
     * sin pasar por los avisos de los plugins. Cortar una captura ya abierta solo lo puede hacer el JavaScript:
     * Android no tiene API para ello (WebView.onPause() no la detiene).
     */
    @Override
    public void onStop() {
        super.onStop();
        if (chrome != null) chrome.setBackground(true);
        WebView wv = bridge != null ? bridge.getWebView() : null;
        if (wv != null) {
            wv.evaluateJavascript("window.__hablaBackground && window.__hablaBackground()", null);
            wv.onPause();
            wv.pauseTimers();
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        if (chrome != null) chrome.setBackground(false);
        WebView wv = bridge != null ? bridge.getWebView() : null;
        if (wv != null) {
            wv.resumeTimers();
            wv.onResume();
            // REG-M-05: el WebView no escala el texto por su cuenta (lo hace la app, con topes).
            applyTextZoom(wv);
        }
    }
}
