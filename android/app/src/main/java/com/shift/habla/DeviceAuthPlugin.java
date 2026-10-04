package com.shift.habla;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.os.Build;
import android.os.CancellationSignal;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Confirmación con el bloqueo del teléfono (patrón, PIN, contraseña o huella) antes de ver o cambiar la clave de
 * Gemini (D-02). Android 11+: diálogo del sistema BiometricPrompt con huella o credencial del dispositivo.
 * Android 7–10: la pantalla de confirmación de credencial del sistema (KeyguardManager).
 * Si el teléfono no tiene bloqueo de pantalla, no hay nada que pedir: se devuelve ok con insecure = true.
 */
@CapacitorPlugin(name = "DeviceAuth")
public class DeviceAuthPlugin extends Plugin {

    private KeyguardManager keyguard() {
        return (KeyguardManager) getContext().getSystemService(Context.KEYGUARD_SERVICE);
    }

    @PluginMethod
    public void isSecure(PluginCall call) {
        KeyguardManager km = keyguard();
        JSObject r = new JSObject();
        r.put("secure", km != null && km.isDeviceSecure());
        call.resolve(r);
    }

    @PluginMethod
    public void confirm(PluginCall call) {
        String title = call.getString("title", "Confirma que eres tú");
        String subtitle = call.getString("subtitle", "");
        KeyguardManager km = keyguard();
        if (km == null || !km.isDeviceSecure()) {
            JSObject r = new JSObject();
            r.put("ok", true);
            r.put("insecure", true);
            call.resolve(r);
            return;
        }
        if (Build.VERSION.SDK_INT >= 30) {
            getActivity().runOnUiThread(() -> {
                BiometricPrompt prompt = new BiometricPrompt.Builder(getContext())
                    .setTitle(title)
                    .setSubtitle(subtitle)
                    .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL)
                    .build();
                prompt.authenticate(new CancellationSignal(), getContext().getMainExecutor(), new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                        JSObject r = new JSObject();
                        r.put("ok", true);
                        call.resolve(r);
                    }

                    @Override
                    public void onAuthenticationError(int errorCode, CharSequence errString) {
                        JSObject r = new JSObject();
                        r.put("ok", false);
                        r.put("error", String.valueOf(errString));
                        call.resolve(r);
                    }
                });
            });
            return;
        }
        Intent intent = km.createConfirmDeviceCredentialIntent(title, subtitle);
        if (intent == null) {
            JSObject r = new JSObject();
            r.put("ok", true);
            r.put("insecure", true);
            call.resolve(r);
            return;
        }
        startActivityForResult(call, intent, "credentialResult");
    }

    @ActivityCallback
    private void credentialResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject r = new JSObject();
        r.put("ok", result.getResultCode() == Activity.RESULT_OK);
        call.resolve(r);
    }
}
