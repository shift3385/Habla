package com.shift.habla;

import android.util.Log;
import android.webkit.PermissionRequest;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;

import java.util.Arrays;

/**
 * Red de seguridad nativa del micrófono (v5.8.1, AUD-MIC-308).
 *
 * Capacitor concede el audio del WebView en BridgeWebChromeClient.onPermissionRequest: cada getUserMedia pide
 * RESOURCE_AUDIO_CAPTURE y, si RECORD_AUDIO ya está concedido, se concede. Aquí se añade una regla que no
 * depende del JavaScript: con la app en segundo plano (después de onStop) se DENIEGA cualquier petición nueva
 * de micrófono. Así, una apertura retrasada (p. ej. código JS que se reanuda tras pauseTimers, como en
 * AUD-MIC-301) no puede volver a abrir el micro con la app oculta.
 *
 * Lo que NO puede hacer: Android no ofrece ninguna API pública para cortar desde Java una captura que el
 * WebView ya tiene abierta (PermissionRequest no se puede revocar una vez concedido y WebView.onPause() no la
 * para, medido por B8). Esa parte la cierra el JavaScript (releaseAllMics), al que MainActivity.onStop avisa
 * directamente; y Android silencia por su cuenta la captura en segundo plano a los ~5 s.
 *
 * No se deniegan peticiones pendientes al pasar a segundo plano: si el diálogo de permiso de Android sigue
 * abierto, Capacitor llamaría después a grant() sobre una petición ya resuelta y la app fallaría.
 */
public class HablaChromeClient extends BridgeWebChromeClient {

    private volatile boolean background = false;

    public HablaChromeClient(Bridge bridge) {
        super(bridge);
    }

    /** Lo llama MainActivity en onStop (true) y onStart (false). */
    void setBackground(boolean value) {
        background = value;
    }

    @Override
    public void onPermissionRequest(final PermissionRequest request) {
        boolean audio = Arrays.asList(request.getResources()).contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
        if (audio && background) {
            Log.w("HablaMic", "Petición de micrófono con la app en segundo plano: denegada");
            request.deny();
            return;
        }
        super.onPermissionRequest(request);
    }
}
