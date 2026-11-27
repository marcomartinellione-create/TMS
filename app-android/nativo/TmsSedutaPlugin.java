package com.trainingmonitorsystem.scheda;

/* ════ TMS Scheda (APK) — plugin nativo «TmsSeduta» ════
   Il ponte fra la pagina e:
   · il SERVIZIO IN PRIMO PIANO della seduta (TmsSedutaService): avvia({titolo, inizio, dispositivo}),
     ferma(), campioni({da}) = i battiti presi dal servizio dopo quell'ora (ms), anche a schermo spento;
   · la FINESTRA MOBILE (Picture-in-Picture, come YouTube): pip({attivo}) dice alla MainActivity se, uscendo
     dall'app, deve entrare in PiP; quando entra o esce manda alla pagina l'evento «pip» {attivo};
   · l'OTTIMIZZAZIONE DELLA BATTERIA: batteria() → {esclusa}; chiediBatteria() apre la richiesta di Android
     di lasciare l'app libera (la pagina la chiede una volta sola, spiegandola prima).
   Il sorgente vero sta in app-android/nativo/: scripts/patch-android.js lo copia nel progetto Android. */

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;

@CapacitorPlugin(name = "TmsSeduta")
public class TmsSedutaPlugin extends Plugin {

    private static TmsSedutaPlugin istanza = null;

    @Override
    public void load() { istanza = this; }

    /* la MainActivity avvisa quando entra o esce dalla finestra mobile */
    static void pipCambiato(boolean attivo) {
        TmsSedutaPlugin p = istanza; if (p == null) return;
        JSObject r = new JSObject(); r.put("attivo", attivo);
        p.notifyListeners("pip", r, true);
    }

    @PluginMethod
    public void avvia(PluginCall call) {
        Intent i = new Intent(getContext(), TmsSedutaService.class);
        i.setAction(TmsSedutaService.AZIONE_AVVIA);
        i.putExtra("titolo", call.getString("titolo", ""));
        Double inizio = call.getDouble("inizio", 0.0);
        i.putExtra("inizio", inizio == null ? 0L : inizio.longValue());
        i.putExtra("dispositivo", call.getString("dispositivo", ""));
        try {
            if (Build.VERSION.SDK_INT >= 26) getContext().startForegroundService(i); else getContext().startService(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("servizio non avviato: " + e.getMessage());
        }
    }

    @PluginMethod
    public void ferma(PluginCall call) {
        if (TmsSedutaService.attivo) {
            Intent i = new Intent(getContext(), TmsSedutaService.class);
            i.setAction(TmsSedutaService.AZIONE_FERMA);
            try { getContext().startService(i); } catch (Exception e) { getContext().stopService(new Intent(getContext(), TmsSedutaService.class)); }
        }
        call.resolve();
    }

    @PluginMethod
    public void campioni(PluginCall call) {
        Double da = call.getDouble("da", 0.0);
        List<long[]> l = TmsSedutaService.campioniDopo(da == null ? 0L : da.longValue());
        JSArray a = new JSArray();
        for (long[] c : l) { JSArray x = new JSArray(); x.put(c[0]); x.put(c[1]); a.put(x); }
        JSObject r = new JSObject(); r.put("campioni", a); r.put("attivo", TmsSedutaService.attivo);
        call.resolve(r);
    }

    @PluginMethod
    public void pip(PluginCall call) {
        final boolean attivo = Boolean.TRUE.equals(call.getBoolean("attivo", false));
        getActivity().runOnUiThread(() -> {
            if (getActivity() instanceof MainActivity) ((MainActivity) getActivity()).impostaPip(attivo);
        });
        JSObject r = new JSObject(); r.put("supportato", MainActivity.pipSupportato(getContext()));
        call.resolve(r);
    }

    @PluginMethod
    public void batteria(PluginCall call) {
        boolean esclusa = true;
        if (Build.VERSION.SDK_INT >= 23) {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            esclusa = pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        }
        JSObject r = new JSObject(); r.put("esclusa", esclusa);
        call.resolve(r);
    }

    @PluginMethod
    public void chiediBatteria(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 23) {
            try {
                Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                i.setData(Uri.parse("package:" + getContext().getPackageName()));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
            } catch (Exception e) {
                try {
                    Intent j = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                    j.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(j);
                } catch (Exception e2) { }
            }
        }
        call.resolve();
    }
}
