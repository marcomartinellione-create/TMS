package com.trainingmonitorsystem.scheda;

/* ════ TMS Scheda (APK) — plugin nativo «TmsFile» ════
   Fa dal lato Android le poche cose che dentro un'app non funzionano come nel browser:
   · il tasto INDIETRO del telefono: chiede alla pagina (window.tmsIndietro) di risalire di un
     livello; se la pagina è già al menu, Android fa quello che fa di solito (chiude l'app);
   · info(): la versione di Android e dell'app (la bilancia ne ha bisogno: fino ad Android 11
     Android pretende la posizione accesa per cercare dispositivi Bluetooth).
   Dal 17/11/2026 la scheda non arriva più come file («Apri con», «Condividi») e il rientro per il
   coach non si salva più: PC e telefono si scambiano tutto dalla cartella condivisa (TmsCartella).
   Il sorgente vero sta in app-android/nativo/: scripts/patch-android.js lo copia nel progetto
   Android generato. */

import android.content.pm.PackageInfo;
import android.os.Build;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TmsFile")
public class TmsFilePlugin extends Plugin {

    private OnBackPressedCallback indietro;

    @Override
    public void load() {
        indietro = new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                tastoIndietro();
            }
        };
        getActivity().getOnBackPressedDispatcher().addCallback(getActivity(), indietro);
    }

    /* ── tasto indietro: decide la pagina ── */
    private void tastoIndietro() {
        String js = "(function(){try{return !!(window.tmsIndietro&&window.tmsIndietro());}catch(e){return false;}})()";
        getBridge().getWebView().evaluateJavascript(js, valore -> {
            if (!"true".equals(valore)) {
                /* la pagina è al livello più alto: comportamento normale di Android */
                indietro.setEnabled(false);
                getActivity().getOnBackPressedDispatcher().onBackPressed();
                indietro.setEnabled(true);
            }
        });
    }

    /* ── informazioni per la pagina: versione di Android e dell'app ── */
    @PluginMethod
    public void info(PluginCall call) {
        JSObject r = new JSObject();
        r.put("sdk", Build.VERSION.SDK_INT);
        try {
            PackageInfo pi = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            r.put("versione", pi.versionName);
        } catch (Exception e) {
            r.put("versione", "");
        }
        call.resolve(r);
    }
}
