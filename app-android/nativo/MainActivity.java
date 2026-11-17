package com.trainingmonitorsystem.scheda;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

/* TMS Scheda (APK): l'attività di Capacitor + i plugin «TmsFile» (file, rientro, tasto indietro)
   e «TmsCartella» (cartella condivisa col PC, aggiornamento dell'APK).
   Sorgente in app-android/nativo/, copiato nel progetto Android da scripts/patch-android.js. */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TmsFilePlugin.class);
        registerPlugin(TmsCartellaPlugin.class);   /* cartella condivisa col TMS sul PC e APK nuovo */
        super.onCreate(savedInstanceState);
    }
}
