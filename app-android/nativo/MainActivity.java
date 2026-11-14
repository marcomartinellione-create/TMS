package com.trainingmonitorsystem.scheda;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

/* TMS Scheda (APK): l'attività di Capacitor + il plugin «TmsFile» (file, rientro, tasto indietro).
   Sorgente in app-android/nativo/, copiato nel progetto Android da scripts/patch-android.js. */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TmsFilePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
