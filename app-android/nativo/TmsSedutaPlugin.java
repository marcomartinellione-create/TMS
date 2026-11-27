package com.trainingmonitorsystem.scheda;

/* ════ TMS Scheda (APK) — plugin nativo «TmsSeduta» ════
   Il ponte fra la pagina e:
   · il SERVIZIO IN PRIMO PIANO della seduta (TmsSedutaService): avvia({titolo, inizio, dispositivo}),
     ferma(), campioni({da}) = i battiti presi dal servizio dopo quell'ora (ms), anche a schermo spento;
   · la FINESTRA MOBILE (Picture-in-Picture, come YouTube): pip({attivo}) dice alla MainActivity se, uscendo
     dall'app, deve entrare in PiP; quando entra o esce manda alla pagina l'evento «pip» {attivo};
   · l'OTTIMIZZAZIONE DELLA BATTERIA: batteria() → {esclusa}; chiediBatteria() apre la richiesta di Android
     di lasciare l'app libera (la pagina la chiede una volta sola, spiegandola prima);
   · il SEMPRE COLLEGATO (APK 1.8.1): sempre({attivo, dispositivo, nome, tipo, chiave, lingua, batteria}) salva le
     preferenze (le rilegge anche l'accensione del telefono) e avvia o ferma il servizio; stato() → collegamento,
     battito, batteria, ultima sincronizzazione e spentoDaNotifica (letto una volta: «Scollega» nella notifica);
     eventi «sempre» (stato cambiato) e «sincronizza» (sono passati 30 minuti: la pagina scarica il bracciale e
     risponde con sincFatta({ok}));
   · il PONTE verso il bracciale tenuto dal servizio: bleStato(), bleNotifiche({servizio, caratteristiche, on}),
     bleScrivi({servizio, caratteristica, valore}), bleLeggi({servizio, caratteristica}) → {valore}, evento «bleDati»
     {car, valore} (valori in esadecimale «00 a2 …», come il plugin Bluetooth);
   · il GPS delle attività all'aperto (APK 1.9.0): avvia({…, gps:true}) accende il GPS nel servizio;
     posizioni({da}) → {punti:[[ora ms, lat, lon, quota, precisione, velocità, pressione]…], gps, acceso, barometro};
     permessoPosizione() chiede «Posizione» ad Android (una volta) → {concesso, acceso, barometro}.
   Il sorgente vero sta in app-android/nativo/: scripts/patch-android.js lo copia nel progetto Android. */

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONObject;

import java.util.List;

@CapacitorPlugin(name = "TmsSeduta", permissions = {
    @Permission(alias = "posizione", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION })
})
public class TmsSedutaPlugin extends Plugin {

    private static TmsSedutaPlugin istanza = null;

    @Override
    public void load() { istanza = this; }

    /* l'attività si chiude (app tolta dalle recenti): niente più pagina viva a cui mandare gli eventi */
    @Override
    protected void handleOnDestroy() { if (istanza == this) istanza = null; super.handleOnDestroy(); }

    static boolean paginaViva() { TmsSedutaPlugin p = istanza; return p != null && p.getBridge() != null && p.hasListeners("sincronizza"); }

    /* il servizio chiede la sincronizzazione dei 30 minuti alla pagina viva; false = nessuna pagina */
    static boolean chiediSinc() {
        TmsSedutaPlugin p = istanza; if (!paginaViva()) return false;
        p.notifyListeners("sincronizza", new JSObject(), true);
        return true;
    }

    static void statoCambiato(JSONObject o) {
        TmsSedutaPlugin p = istanza; if (p == null) return;
        try { p.notifyListeners("sempre", JSObject.fromJSONObject(o), true); } catch (Exception e) { }
    }

    static void sempreCambiato() { TmsSedutaService s = TmsSedutaService.istanza; if (s != null) statoCambiato(s.stato()); }

    static void datiPonte(String car, String valore) {
        TmsSedutaPlugin p = istanza; if (p == null) return;
        JSObject r = new JSObject(); r.put("car", car); r.put("valore", valore);
        p.notifyListeners("bleDati", r, false);
    }

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
        i.putExtra("gps", Boolean.TRUE.equals(call.getBoolean("gps", false)));
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

    /* ── GPS delle attività all'aperto ── */
    private JSObject statoGps() {
        JSObject r = new JSObject();
        r.put("concesso", TmsSedutaService.permessoPosizione(getContext()));
        r.put("acceso", TmsSedutaService.posizioneAccesa(getContext()));
        r.put("barometro", TmsSedutaService.haBarometro(getContext()));
        r.put("gps", TmsSedutaService.gpsAvviato);
        return r;
    }

    @PluginMethod
    public void posizioni(PluginCall call) {
        Double da = call.getDouble("da", 0.0);
        List<double[]> l = TmsSedutaService.puntiDopo(da == null ? 0L : da.longValue());
        JSArray a = new JSArray();
        for (double[] p : l) {
            JSArray x = new JSArray();
            try { x.put((long) p[0]); for (int k = 1; k < p.length; k++) x.put(Double.isNaN(p[k]) ? JSONObject.NULL : p[k]); } catch (Exception e) { continue; }
            a.put(x);
        }
        JSObject r = statoGps(); r.put("punti", a); r.put("attivo", TmsSedutaService.attivo);
        call.resolve(r);
    }

    @PluginMethod
    public void permessoPosizione(PluginCall call) {
        if (getPermissionState("posizione") == PermissionState.GRANTED) { call.resolve(statoGps()); return; }
        requestPermissionForAlias("posizione", call, "posizioneCb");
    }

    @PermissionCallback
    private void posizioneCb(PluginCall call) { call.resolve(statoGps()); }

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

    /* ── SEMPRE COLLEGATO ── */
    @PluginMethod
    public void sempre(PluginCall call) {
        Context c = getContext();
        boolean on = Boolean.TRUE.equals(call.getBoolean("attivo", false));
        String disp = call.getString("dispositivo", "");
        boolean voluto = on && disp != null && !disp.isEmpty();
        android.content.SharedPreferences.Editor e = TmsSedutaService.pref(c).edit();
        e.putBoolean("attivo", voluto);
        if (voluto) {
            e.putString("dispositivo", disp).putString("nome", call.getString("nome", "")).putString("tipo", call.getString("tipo", "bracciale"))
             .putBoolean("chiave", Boolean.TRUE.equals(call.getBoolean("chiave", false))).putString("lingua", call.getString("lingua", "it"));
            Integer b = call.getInt("batteria", -1); e.putInt("batteria", b == null ? -1 : b);
        }
        e.apply();
        boolean gira = TmsSedutaService.istanza != null;
        if (voluto || gira) {
            Intent i = new Intent(c, TmsSedutaService.class); i.setAction(TmsSedutaService.AZIONE_SEMPRE);
            try { if (Build.VERSION.SDK_INT >= 26 && voluto) c.startForegroundService(i); else c.startService(i); }
            catch (Exception ex) { call.reject("servizio non avviato: " + ex.getMessage()); return; }
        }
        call.resolve();
    }

    @PluginMethod
    public void stato(PluginCall call) {
        TmsSedutaService s = TmsSedutaService.istanza;
        JSObject r;
        try { r = s != null ? JSObject.fromJSONObject(s.stato()) : new JSObject(); } catch (Exception e) { r = new JSObject(); }
        android.content.SharedPreferences p = TmsSedutaService.pref(getContext());
        boolean spento = p.getBoolean("spentoDaNotifica", false);
        r.put("voluto", p.getBoolean("attivo", false));
        r.put("spentoDaNotifica", spento);
        if (spento) p.edit().putBoolean("spentoDaNotifica", false).apply();
        if (!r.has("ultimaSinc")) r.put("ultimaSinc", p.getLong("ultimaSinc", 0));
        call.resolve(r);
    }

    @PluginMethod
    public void sincFatta(PluginCall call) {
        final TmsSedutaService s = TmsSedutaService.istanza;
        final boolean ok = Boolean.TRUE.equals(call.getBoolean("ok", false));
        Integer b = call.getInt("batteria", -1);
        final int bb = b == null ? -1 : b;
        if (s != null) new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> { s.impostaBatteria(bb); s.sincFatta(ok); });
        call.resolve();
    }

    /* ── PONTE verso il bracciale del servizio ── */
    @PluginMethod
    public void bleStato(PluginCall call) {
        TmsSedutaService s = TmsSedutaService.istanza;
        try { call.resolve(s != null ? JSObject.fromJSONObject(s.stato()) : new JSObject()); } catch (Exception e) { call.resolve(new JSObject()); }
    }

    private void ponte(final PluginCall call, JSONObject o) {
        TmsSedutaService.ponteDaFuori(o.toString(), (ok, valore, err) -> {
            if (!ok) { call.reject(err == null ? "errore" : err); return; }
            JSObject r = new JSObject(); r.put("valore", TmsSedutaService.hex(valore)); call.resolve(r);
        });
    }

    @PluginMethod
    public void bleNotifiche(PluginCall call) {
        try {
            JSONObject o = new JSONObject(); o.put("op", "notifiche"); o.put("servizio", call.getString("servizio", ""));
            o.put("caratteristiche", call.getArray("caratteristiche", new JSArray())); o.put("on", Boolean.TRUE.equals(call.getBoolean("on", true)));
            ponte(call, o);
        } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
    }

    @PluginMethod
    public void bleScrivi(PluginCall call) {
        try {
            JSONObject o = new JSONObject(); o.put("op", "scrivi"); o.put("servizio", call.getString("servizio", ""));
            o.put("caratteristica", call.getString("caratteristica", "")); o.put("valore", call.getString("valore", ""));
            ponte(call, o);
        } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
    }

    @PluginMethod
    public void bleLeggi(PluginCall call) {
        try {
            JSONObject o = new JSONObject(); o.put("op", "leggi"); o.put("servizio", call.getString("servizio", ""));
            o.put("caratteristica", call.getString("caratteristica", ""));
            ponte(call, o);
        } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
    }
}
