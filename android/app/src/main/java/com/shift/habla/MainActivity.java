package com.shift.habla;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin propio: elegir por dónde se escucha y se habla (auriculares o teléfono).
        registerPlugin(AudioRoutePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
