package com.trainingmonitorsystem.scheda;

/* ════ TMS Scheda (APK) — servizio in primo piano: SEDUTA e BRACCIALE SEMPRE COLLEGATO ════
   SEDUTA (27/11/2026, Marco: «quando parte una sessione di allenamento l'app non si chiude mai davvero»):
   parte con «Inizia» (seduta coi pesi) o «Avvia registrazione» (Cardio), si ferma a «Fine» o «Annulla». Notifica
   fissa con titolo, battito e tempo; i battiti della fascia (profilo standard Heart Rate 0x180D/0x2A37) con la loro
   ora in un BUFFER, anche a schermo spento: la pagina li chiede quando torna attiva (TmsSeduta.campioni); wake lock
   parziale, al massimo 6 ore.
   SEMPRE COLLEGATO (APK 1.8.1, 27/11/2026, Marco: «quando chiudo l'app si scollega, deve rimanere SEMPRE
   connesso»): con l'interruttore «Tieni sempre collegato» (Impostazioni › Sensori, acceso di serie) e un
   bracciale o una fascia salvati, il servizio resta acceso anche fuori dalle sedute, ad app chiusa o tolta dalle
   app recenti; riparte all'accensione del telefono e dopo un aggiornamento dell'app (TmsAvvioReceiver) e, se
   Android lo chiude, START_STICKY. Intanto:
   · tiene il collegamento Bluetooth (connectGatt con autoConnect: Android lo ricollega da sé, con una ricerca
     passiva a basso consumo, quando il bracciale torna vicino); se il collegamento si chiude con un errore lo si
     riapre con attese crescenti (5 s, 15 s, 30 s, 1, 2, 5, 10 minuti); col Bluetooth spento aspetta che si riaccenda;
   · notifica discreta: «Bracciale collegato · ♥ 62 · batteria 80 %» o «Bracciale: in ricerca…», con «Scollega»;
     il battito solo se il bracciale lo condivide (0x180D), la batteria dal servizio standard 0x180F o dall'ultima
     sincronizzazione della pagina. Il battito 24 ore su 24 NON si registra: lo fa già il bracciale;
   · con la CHIAVE del bracciale, OGNI 30 MINUTI (sveglia di Android che vale anche in Doze) fa SINCRONIZZARE sonno
     e dati del giorno: se la pagina dell'app è viva (anche in secondo piano) glielo chiede (evento «sincronizza»);
     se l'app è chiusa apre la STESSA pagina in una WebView invisibile (PaginaServizio, stessa origine
     https://localhost, quindi stessa chiave, stessi dati e stesso collegamento col PC), che scarica, manda gli
     eventi cifrati all'hub e si chiude. La crittografia del bracciale e quella dell'hub restano così una sola,
     quella della pagina, già provata. In tutti e due i casi la pagina parla col bracciale ATTRAVERSO questo servizio
     (il «ponte»: scrivi, leggi, notifiche), sul collegamento che il servizio tiene già: un secondo collegamento
     non servirebbe e il bracciale, già collegato, di solito non si fa più trovare nelle ricerche.
   Tipo di servizio: connectedDevice (Android 14: permesso FOREGROUND_SERVICE_CONNECTED_DEVICE, prerequisito
   CHANGE_NETWORK_STATE; li aggiunge scripts/patch-android.js). Avvio dall'accensione: BOOT_COMPLETED e
   MY_PACKAGE_REPLACED sono fra le eccezioni di Android al divieto di avviare un servizio in primo piano dal
   sottofondo, e il divieto di Android 15 sull'avvio da BOOT_COMPLETED non riguarda connectedDevice. Se Android
   rifiuta lo stesso (produttori più severi, permesso Bluetooth tolto), una notifica «Tocca per ricollegare»
   apre l'app, che riavvia il servizio dal primo piano: nessun avvio vietato.
   Il sorgente vero sta in app-android/nativo/: scripts/patch-android.js lo copia nel progetto Android. */

import android.annotation.SuppressLint;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.webkit.JavascriptInterface;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public class TmsSedutaService extends Service {

    static final String AZIONE_AVVIA = "com.trainingmonitorsystem.scheda.SEDUTA_AVVIA";
    static final String AZIONE_FERMA = "com.trainingmonitorsystem.scheda.SEDUTA_FERMA";
    static final String AZIONE_SEMPRE = "com.trainingmonitorsystem.scheda.SEMPRE";       /* rilegge le preferenze */
    static final String AZIONE_SCOLLEGA = "com.trainingmonitorsystem.scheda.SCOLLEGA";   /* «Scollega» nella notifica */
    static final String AZIONE_SINC = "com.trainingmonitorsystem.scheda.SINC";           /* sveglia dei 30 minuti */
    static final int ID_NOTIFICA = 7400;
    static final int ID_AVVISO = 7401;
    static final String CANALE = "seduta";
    static final String CANALE_SEMPRE = "collegamento";
    static final String PREF = "tms-sempre";
    static final long MAX_CAMPIONI = 6L * 3600L;              /* 6 ore a un battito al secondo */
    static final long SINC_OGNI = 30L * 60L * 1000L;
    static final long PAGINA_MAX = 4L * 60L * 1000L;          /* la pagina invisibile vive al massimo 4 minuti */
    static final long[] ATTESE = {5000L, 15000L, 30000L, 60000L, 120000L, 300000L, 600000L};

    private static final UUID SERV_HR = UUID.fromString("0000180d-0000-1000-8000-00805f9b34fb");
    private static final UUID CAR_HR = UUID.fromString("00002a37-0000-1000-8000-00805f9b34fb");
    private static final UUID SERV_BATT = UUID.fromString("0000180f-0000-1000-8000-00805f9b34fb");
    private static final UUID CAR_BATT = UUID.fromString("00002a19-0000-1000-8000-00805f9b34fb");
    private static final UUID CCCD = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");

    /* buffer dei battiti della SEDUTA: [ora in ms, bpm]. Statico: la pagina lo legge col plugin anche dopo una pausa */
    private static final List<long[]> CAMPIONI = new ArrayList<>();
    static volatile boolean attivo = false;            /* seduta in corso */
    static volatile boolean sempreAttivo = false;      /* «sempre collegato» in funzione */
    static volatile int ultimoBpm = 0;
    static volatile long ultimoT = 0;
    static volatile TmsSedutaService istanza = null;

    private String titolo = "";
    private long inizio = 0;
    private String dispSeduta = "";
    private String dispSempre = "", nomeSempre = "", tipoSempre = "", lingua = "it";
    private boolean chiave = false;
    private int battPagina = -1, battLetta = -1;
    private long ultimaSinc = 0;
    private boolean bluetoothSpento = false;
    private final Map<String, Collegamento> link = new HashMap<>();
    private PowerManager.WakeLock wl = null, wlSinc = null;
    private final Handler mano = new Handler(Looper.getMainLooper());
    private final Runnable giro = new Runnable() {
        @Override public void run() { aggiornaNotifica(); if (attivo || sempreAttivo) mano.postDelayed(this, attivo ? 5000 : 30000); }
    };
    private BroadcastReceiver bt = null;

    interface Esito { void fatto(boolean ok, byte[] valore, String errore); }

    /* ── preferenze del «sempre collegato» (le scrive il plugin, le legge anche l'avvio del telefono) ── */
    static SharedPreferences pref(Context c) { return c.getSharedPreferences(PREF, Context.MODE_PRIVATE); }
    static boolean sempreVoluto(Context c) {
        SharedPreferences p = pref(c);
        return p.getBoolean("attivo", false) && !p.getString("dispositivo", "").isEmpty();
    }

    /* avvio da fuori dall'app (accensione, aggiornamento): se Android non lo permette, la notifica per ricollegare */
    static void avviaDaFuori(Context c) {
        Intent i = new Intent(c, TmsSedutaService.class); i.setAction(AZIONE_SEMPRE);
        try {
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i); else c.startService(i);
        } catch (Exception e) { avvisoRicollega(c); }
    }

    static void avvisoRicollega(Context c) {
        try {
            creaCanali(c);
            boolean en = "en".equals(pref(c).getString("lingua", "it"));
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CANALE_SEMPRE) : new Notification.Builder(c);
            b.setContentTitle(en ? "Band not connected" : "Bracciale non collegato")
             .setContentText(en ? "Tap to reconnect it" : "Tocca per ricollegarlo")
             .setSmallIcon(icona(c)).setContentIntent(apriApp(c)).setAutoCancel(true).setShowWhen(false);
            ((NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE)).notify(ID_AVVISO, b.build());
        } catch (Exception e) { }
    }

    /* ── i campioni della seduta dopo un'ora (la pagina li chiede quando torna attiva) ── */
    static List<long[]> campioniDopo(long da) {
        List<long[]> out = new ArrayList<>();
        synchronized (CAMPIONI) { for (long[] c : CAMPIONI) if (c[0] > da) out.add(new long[]{c[0], c[1]}); }
        return out;
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onCreate() {
        super.onCreate();
        istanza = this;
        bt = new BroadcastReceiver() {
            @Override public void onReceive(Context c, Intent i) {
                int s = i.getIntExtra(BluetoothAdapter.EXTRA_STATE, -1);
                if (s == BluetoothAdapter.STATE_OFF) { bluetoothSpento = true; for (Collegamento l : link.values()) l.chiudi(); aggiornaNotifica(); avvisaPagina(); }
                else if (s == BluetoothAdapter.STATE_ON) { bluetoothSpento = false; for (Collegamento l : link.values()) { l.tentativi = 0; l.apri(); } aggiornaNotifica(); }
            }
        };
        try { registerReceiver(bt, new IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED)); } catch (Exception e) { bt = null; }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String azione = intent != null ? intent.getAction() : null;
        leggiPref();
        if (AZIONE_FERMA.equals(azione)) {
            attivo = false; dispSeduta = "";
            try { if (wl != null && wl.isHeld()) wl.release(); } catch (Exception e) { }
            wl = null;
        } else if (AZIONE_AVVIA.equals(azione) && intent != null) {
            String t = intent.getStringExtra("titolo"); if (t != null) titolo = t;
            long i = intent.getLongExtra("inizio", 0); if (i > 0) inizio = i;
            String d = intent.getStringExtra("dispositivo"); dispSeduta = d == null ? "" : d;
            if (!attivo) {
                attivo = true;
                synchronized (CAMPIONI) { CAMPIONI.clear(); }
                ultimoBpm = 0; ultimoT = 0;
                try {
                    PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                    wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "tms:seduta");
                    wl.acquire(6L * 3600L * 1000L);
                } catch (Exception e) { wl = null; }
            }
        } else if (AZIONE_SCOLLEGA.equals(azione)) {
            pref(this).edit().putBoolean("attivo", false).putBoolean("spentoDaNotifica", true).apply();
            leggiPref();
            TmsSedutaPlugin.sempreCambiato();
        } else if (AZIONE_SINC.equals(azione)) {
            if (sempreAttivo) { programmaSinc(); mano.post(this::sincronizza); }
        }
        /* niente da fare: si chiude */
        if (!attivo && !sempreAttivo) { ferma(); return START_NOT_STICKY; }
        if (!primoPiano()) { avvisoRicollega(this); ferma(); return START_NOT_STICKY; }
        sistemaCollegamenti();
        if (sempreAttivo) programmaSinc(); else annullaSinc();
        mano.removeCallbacks(giro); mano.postDelayed(giro, attivo ? 5000 : 30000);
        /* sempre collegato: se Android chiude il servizio lo riapre (onStartCommand con intent nullo, preferenze) */
        return sempreAttivo ? START_STICKY : START_NOT_STICKY;
    }

    private void leggiPref() {
        SharedPreferences p = pref(this);
        sempreAttivo = sempreVoluto(this);
        dispSempre = sempreAttivo ? p.getString("dispositivo", "") : "";
        nomeSempre = p.getString("nome", ""); tipoSempre = p.getString("tipo", "bracciale");
        lingua = p.getString("lingua", "it"); chiave = p.getBoolean("chiave", false);
        battPagina = p.getInt("batteria", -1); ultimaSinc = p.getLong("ultimaSinc", 0);
    }

    private boolean primoPiano() {
        try {
            creaCanali(this);
            Notification n = notifica();
            if (Build.VERSION.SDK_INT >= 29) startForeground(ID_NOTIFICA, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
            else startForeground(ID_NOTIFICA, n);
            return true;
        } catch (Exception e) { return false; }   /* per esempio ForegroundServiceStartNotAllowedException (Android 12+) */
    }

    /* un collegamento per indirizzo: quello del «sempre collegato» e, se diverso, quello della seduta */
    private void sistemaCollegamenti() {
        Set<String> voluti = new HashSet<>();
        if (sempreAttivo && !dispSempre.isEmpty()) voluti.add(dispSempre);
        if (attivo && !dispSeduta.isEmpty()) voluti.add(dispSeduta);
        for (String a : new ArrayList<>(link.keySet())) if (!voluti.contains(a)) { link.get(a).chiudi(); link.remove(a); }
        for (String a : voluti) if (!link.containsKey(a)) { Collegamento l = new Collegamento(a); link.put(a, l); l.apri(); }
        aggiornaNotifica(); avvisaPagina();
    }

    private void ferma() {
        attivo = false; sempreAttivo = false;
        mano.removeCallbacks(giro);
        annullaSinc();
        chiudiPagina(null);
        for (Collegamento l : link.values()) l.chiudi();
        link.clear();
        try { if (wl != null && wl.isHeld()) wl.release(); } catch (Exception e) { }
        wl = null;
        if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE); else stopForeground(true);
        stopSelf();
        avvisaPagina();
    }

    @Override
    public void onDestroy() {
        attivo = false; sempreAttivo = false;
        mano.removeCallbacksAndMessages(null);
        chiudiPagina(null);
        for (Collegamento l : link.values()) l.chiudi();
        link.clear();
        try { if (bt != null) unregisterReceiver(bt); } catch (Exception e) { }
        try { if (wl != null && wl.isHeld()) wl.release(); } catch (Exception e) { }
        try { if (wlSinc != null && wlSinc.isHeld()) wlSinc.release(); } catch (Exception e) { }
        if (istanza == this) istanza = null;
        super.onDestroy();
    }

    /* tolta dalle app recenti: il servizio in primo piano resta (è proprio quello che vuole Marco) */
    @Override public void onTaskRemoved(Intent rootIntent) { super.onTaskRemoved(rootIntent); }

    /* ── stato per la pagina e per la notifica ── */
    Collegamento linkSempre() { return dispSempre.isEmpty() ? null : link.get(dispSempre); }
    boolean sempreCollegato() { Collegamento l = linkSempre(); return l != null && l.pronto; }
    int batteria() { return battLetta >= 0 ? battLetta : battPagina; }

    JSONObject stato() {
        JSONObject o = new JSONObject();
        try {
            Collegamento l = linkSempre();
            o.put("attivo", sempreAttivo); o.put("seduta", attivo);
            o.put("collegato", l != null && l.pronto); o.put("id", dispSempre); o.put("nome", nomeSempre); o.put("tipo", tipoSempre);
            boolean fresco = ultimoBpm > 0 && System.currentTimeMillis() - ultimoT < 60000;
            o.put("bpm", fresco ? ultimoBpm : 0); o.put("batteria", batteria()); o.put("ultimaSinc", ultimaSinc);
            o.put("bluetooth", !bluetoothSpento);
        } catch (Exception e) { }
        return o;
    }

    private void avvisaPagina() { TmsSedutaPlugin.statoCambiato(stato()); }

    /* ── notifiche ── */
    static void creaCanali(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel s = new NotificationChannel(CANALE, "Seduta in corso", NotificationManager.IMPORTANCE_LOW);
        s.setDescription("Battito e tempo della seduta, mentre l'allenamento è aperto");
        s.setShowBadge(false);
        nm.createNotificationChannel(s);
        NotificationChannel k = new NotificationChannel(CANALE_SEMPRE, "Bracciale collegato", NotificationManager.IMPORTANCE_LOW);
        k.setDescription("Il collegamento col bracciale o la fascia, anche ad app chiusa");
        k.setShowBadge(false); k.setSound(null, null); k.enableVibration(false);
        nm.createNotificationChannel(k);
    }

    static int icona(Context c) {
        int i = c.getResources().getIdentifier("ic_stat_tms", "drawable", c.getPackageName());
        return i == 0 ? android.R.drawable.ic_dialog_info : i;
    }

    static PendingIntent apriApp(Context c) {
        Intent apri = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        if (apri == null) apri = new Intent(c, MainActivity.class);
        apri.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_NEW_TASK);
        int pf = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        return PendingIntent.getActivity(c, 0, apri, pf);
    }

    private boolean en() { return "en".equals(lingua); }

    private Notification notifica() {
        boolean fresco = ultimoBpm > 0 && System.currentTimeMillis() - ultimoT < (attivo ? 15000 : 60000);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, attivo ? CANALE : CANALE_SEMPRE) : new Notification.Builder(this);
        if (attivo) {
            long sec = inizio > 0 ? Math.max(0, (System.currentTimeMillis() - inizio) / 1000) : 0;
            String tempo = (sec >= 3600 ? (sec / 3600) + ":" + due((sec % 3600) / 60) : String.valueOf((sec % 3600) / 60)) + ":" + due(sec % 60);
            b.setContentTitle(titolo.isEmpty() ? "TMS Scheda" : titolo).setContentText((fresco ? "♥ " + ultimoBpm + " bpm · " : "") + tempo)
             .setCategory(Notification.CATEGORY_WORKOUT);
        } else {
            String cosa = "fascia".equals(tipoSempre) ? (en() ? "Heart rate strap" : "Fascia") : (en() ? "Band" : "Bracciale");
            Collegamento l = linkSempre();
            String tit, testo;
            if (bluetoothSpento) { tit = cosa + (en() ? ": Bluetooth is off" : ": Bluetooth spento"); testo = en() ? "It reconnects when Bluetooth is back on" : "Si ricollega quando riaccendi il Bluetooth"; }
            else if (l != null && l.pronto) {
                tit = cosa + ("fascia".equals(tipoSempre) ? (en() ? " connected" : " collegata") : (en() ? " connected" : " collegato"));
                List<String> pz = new ArrayList<>();
                if (fresco) pz.add("♥ " + ultimoBpm);
                if (batteria() >= 0) pz.add((en() ? "battery " : "batteria ") + batteria() + " %");
                if (ultimaSinc > 0) pz.add((en() ? "synced " : "sincronizzato alle ") + String.format(Locale.ROOT, "%tR", ultimaSinc));
                StringBuilder sb = new StringBuilder(); for (String x : pz) { if (sb.length() > 0) sb.append(" · "); sb.append(x); }
                testo = pz.isEmpty() ? (nomeSempre.isEmpty() ? "TMS Scheda" : nomeSempre) : sb.toString();
            } else { tit = cosa + (en() ? ": searching…" : ": in ricerca…"); testo = en() ? "It reconnects by itself when it is close" : "Si ricollega da solo quando torna vicino"; }
            b.setContentTitle(tit).setContentText(testo).setCategory(Notification.CATEGORY_SERVICE);
            Intent sc = new Intent(this, TmsSedutaService.class); sc.setAction(AZIONE_SCOLLEGA);
            int pf = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
            PendingIntent ps = PendingIntent.getService(this, 2, sc, pf);
            if (Build.VERSION.SDK_INT >= 23) b.addAction(new Notification.Action.Builder(null, en() ? "Disconnect" : "Scollega", ps).build());
            else b.addAction(0, en() ? "Disconnect" : "Scollega", ps);
        }
        b.setSmallIcon(icona(this)).setContentIntent(apriApp(this)).setOngoing(true).setOnlyAlertOnce(true).setShowWhen(false);
        if (Build.VERSION.SDK_INT >= 21) b.setColor(0xFF9A5B1F);
        if (Build.VERSION.SDK_INT >= 31) b.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        return b.build();
    }

    private static String due(long n) { return n < 10 ? "0" + n : String.valueOf(n); }

    private void aggiornaNotifica() {
        if (!attivo && !sempreAttivo) return;
        try { ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).notify(ID_NOTIFICA, notifica()); } catch (Exception e) { }
    }

    /* ── sincronizzazione ogni 30 minuti (solo con la chiave del bracciale) ── */
    private PendingIntent piSinc() {
        Intent i = new Intent(this, TmsSedutaService.class); i.setAction(AZIONE_SINC);
        int pf = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        return Build.VERSION.SDK_INT >= 26 ? PendingIntent.getForegroundService(this, 3, i, pf) : PendingIntent.getService(this, 3, i, pf);
    }

    private void programmaSinc() {
        if (!chiave || !"bracciale".equals(tipoSempre)) { annullaSinc(); return; }
        try {
            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            long quando = SystemClock.elapsedRealtime() + SINC_OGNI;
            if (Build.VERSION.SDK_INT >= 23) am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, quando, piSinc());
            else am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, quando, piSinc());
        } catch (Exception e) { }
    }

    private void annullaSinc() { try { ((AlarmManager) getSystemService(Context.ALARM_SERVICE)).cancel(piSinc()); } catch (Exception e) { } }

    private void sincronizza() {
        if (!sempreAttivo || attivo || !chiave || !sempreCollegato() || pagina != null) return;   /* mai durante una seduta */
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (wlSinc == null) wlSinc = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "tms:sinc");
            if (!wlSinc.isHeld()) wlSinc.acquire(PAGINA_MAX + 30000L);
        } catch (Exception e) { }
        if (TmsSedutaPlugin.chiediSinc()) { mano.removeCallbacks(scadeSinc); mano.postDelayed(scadeSinc, PAGINA_MAX); }   /* la pagina dell'app è viva */
        else apriPagina();                                                                        /* app chiusa */
    }

    private final Runnable scadeSinc = () -> sincFatta(false);

    /* la pagina (viva o invisibile) ha finito */
    void sincFatta(boolean ok) {
        mano.removeCallbacks(scadeSinc);
        if (ok) { ultimaSinc = System.currentTimeMillis(); pref(this).edit().putLong("ultimaSinc", ultimaSinc).apply(); }
        try { if (wlSinc != null && wlSinc.isHeld()) wlSinc.release(); } catch (Exception e) { }
        aggiornaNotifica(); avvisaPagina();
    }

    /* la pagina passa l'ultima batteria letta (canale cifrato) per la notifica */
    void impostaBatteria(int b) { if (b >= 0 && b <= 100) { battPagina = b; aggiornaNotifica(); } }

    /* ── PAGINA INVISIBILE: la stessa pagina dell'app, senza finestra, solo per sincronizzare ── */
    private WebView pagina = null;
    private final Runnable scadePagina = () -> chiudiPagina(false);

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private void apriPagina() {
        if (pagina != null) return;
        try {
            WebView w = new WebView(getApplicationContext());
            WebSettings s = w.getSettings();
            s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setDatabaseEnabled(true);
            s.setAllowFileAccess(false); s.setAllowContentAccess(false);
            w.setWebViewClient(new WebViewClient() {
                @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) { return servi(r.getUrl()); }
            });
            if (Build.VERSION.SDK_INT >= 24) {
                try {
                    ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
                        @Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest r) { return servi(r.getUrl()); }
                    });
                } catch (Exception e) { }
            }
            w.addJavascriptInterface(new PonteServizio(), "TmsServizio");
            pagina = w;
            mano.postDelayed(scadePagina, PAGINA_MAX);
            w.loadUrl("https://localhost/index.html");
        } catch (Exception e) { pagina = null; sincFatta(false); }
    }

    private void chiudiPagina(Boolean ok) {
        mano.removeCallbacks(scadePagina);
        WebView w = pagina; pagina = null;
        Collegamento l = linkSempre(); if (l != null) l.ascoltate.clear();
        if (w != null) { try { w.stopLoading(); w.removeJavascriptInterface("TmsServizio"); w.destroy(); } catch (Exception e) { } }
        if (ok != null) sincFatta(ok);
    }

    /* i file della pagina dagli asset dell'APK (gli stessi che Capacitor serve su https://localhost) */
    private WebResourceResponse servi(Uri u) {
        if (u == null || !"localhost".equals(u.getHost())) return null;
        String p = u.getPath(); if (p == null || p.isEmpty() || "/".equals(p)) p = "/index.html";
        if (p.contains("..")) return null;
        try {
            InputStream in = getAssets().open("public" + p);
            String est = p.substring(p.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
            String mime = "html".equals(est) ? "text/html" : "js".equals(est) ? "application/javascript" : "json".equals(est) || "webmanifest".equals(est) ? "application/json"
                : "css".equals(est) ? "text/css" : "png".equals(est) ? "image/png" : "svg".equals(est) ? "image/svg+xml" : "mp3".equals(est) ? "audio/mpeg" : "application/octet-stream";
            boolean testo = mime.startsWith("text/") || mime.endsWith("javascript") || mime.endsWith("json") || mime.endsWith("xml");
            return new WebResourceResponse(mime, testo ? "utf-8" : null, in);
        } catch (Exception e) {
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<String, String>(), null);
        }
    }

    private void allaPagina(final String js) {
        mano.post(() -> { WebView w = pagina; if (w != null) { try { w.evaluateJavascript(js, null); } catch (Exception e) { } } });
    }

    /* ponte per la pagina invisibile (window.TmsServizio): le chiamate arrivano su un thread di WebView */
    private final class PonteServizio {
        @JavascriptInterface public String stato() { return TmsSedutaService.this.stato().toString(); }
        @JavascriptInterface public void richiesta(final int id, final String json) {
            mano.post(() -> ponte(json, (ok, valore, err) ->
                allaPagina("window.tmsPonteEsito&&window.tmsPonteEsito(" + id + "," + ok + "," + JSONObject.quote(ok ? hex(valore) : (err == null ? "errore" : err)) + ")")));
        }
        @JavascriptInterface public void fine(final String esito) {
            mano.post(() -> {
                boolean ok = false;
                try { ok = esito != null && !"null".equals(esito) && new JSONObject(esito).length() > 0; } catch (Exception e) { }
                chiudiPagina(ok);
            });
        }
    }

    /* ── il PONTE (pagina viva col plugin o pagina invisibile): {op:'scrivi'|'leggi'|'notifiche', servizio,
          caratteristica | caratteristiche, valore (esadecimale), on} sul collegamento «sempre» ── */
    static void ponteDaFuori(final String json, final Esito cb) {
        TmsSedutaService s = istanza;
        if (s == null) { cb.fatto(false, null, "staccato"); return; }
        s.mano.post(() -> s.ponte(json, cb));
    }

    void ponte(String json, Esito cb) {
        Collegamento l = linkSempre();
        if (l == null || !l.pronto) { cb.fatto(false, null, "staccato"); return; }
        try {
            JSONObject o = new JSONObject(json);
            String op = o.optString("op"), serv = o.optString("servizio");
            if ("scrivi".equals(op)) l.scrivi(uuid(serv), uuid(o.optString("caratteristica")), daHex(o.optString("valore")), cb);
            else if ("leggi".equals(op)) l.leggi(uuid(serv), uuid(o.optString("caratteristica")), cb);
            else if ("notifiche".equals(op)) {
                JSONArray a = o.optJSONArray("caratteristiche"); List<UUID> cs = new ArrayList<>();
                if (a != null) for (int i = 0; i < a.length(); i++) cs.add(uuid(a.optString(i)));
                l.notifiche(uuid(serv), cs, o.optBoolean("on", true), cb);
            } else cb.fatto(false, null, "operazione sconosciuta");
        } catch (Exception e) { cb.fatto(false, null, String.valueOf(e.getMessage())); }
    }

    /* dati arrivati su una caratteristica ascoltata dal ponte: alla pagina invisibile e alla pagina dell'app */
    private void datiPonte(UUID car, byte[] v) {
        String c = breve(car), h = hex(v);
        if (pagina != null) allaPagina("window.tmsPonteDati&&window.tmsPonteDati(" + JSONObject.quote(c) + "," + JSONObject.quote(h) + ")");
        TmsSedutaPlugin.datiPonte(c, h);
    }

    /* ── un collegamento Bluetooth con coda delle operazioni (una alla volta, come vuole Android) ── */
    private static final class Op {
        final int tipo; final UUID serv, car; final byte[] valore; final boolean on; final Esito cb;
        Op(int tipo, UUID serv, UUID car, byte[] valore, boolean on, Esito cb) { this.tipo = tipo; this.serv = serv; this.car = car; this.valore = valore; this.on = on; this.cb = cb; }
    }
    private static final int SCRIVI = 1, LEGGI = 2, DESCR = 3;

    final class Collegamento {
        final String indirizzo;
        BluetoothGatt gatt = null;
        boolean pronto = false, chiuso = false;
        int tentativi = 0;
        final Set<UUID> ascoltate = new HashSet<>();
        private final ArrayDeque<Op> coda = new ArrayDeque<>();
        private Op corrente = null;
        private final Runnable scade = () -> { Op o = corrente; corrente = null; if (o != null && o.cb != null) o.cb.fatto(false, null, "tempo scaduto"); prossima(); };
        private final Runnable riapri = this::apri;

        Collegamento(String a) { indirizzo = a; }

        @SuppressLint("MissingPermission")
        void apri() {
            chiuso = false; mano.removeCallbacks(riapri);
            if (gatt != null || bluetoothSpento) return;
            try {
                BluetoothManager bm = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
                BluetoothAdapter ad = bm != null ? bm.getAdapter() : null;
                if (ad == null || !BluetoothAdapter.checkBluetoothAddress(indirizzo)) return;
                if (!ad.isEnabled()) { bluetoothSpento = true; return; }
                BluetoothDevice dev = ad.getRemoteDevice(indirizzo);
                /* autoConnect: Android aspetta il dispositivo con una ricerca passiva a basso consumo e si ricollega da sé */
                gatt = Build.VERSION.SDK_INT >= 23 ? dev.connectGatt(TmsSedutaService.this, true, cb, BluetoothDevice.TRANSPORT_LE) : dev.connectGatt(TmsSedutaService.this, true, cb);
            } catch (SecurityException e) { gatt = null; }
            catch (Exception e) { gatt = null; riprovaDopo(); }
        }

        @SuppressLint("MissingPermission")
        void chiudi() {
            chiuso = true; pronto = false; mano.removeCallbacks(riapri); mano.removeCallbacks(scade);
            svuota("staccato");
            BluetoothGatt g = gatt; gatt = null;
            if (g == null) return;
            try { g.disconnect(); } catch (Exception e) { }
            try { g.close(); } catch (Exception e) { }
        }

        private void riprovaDopo() {
            if (chiuso) return;
            long dopo = ATTESE[Math.min(tentativi, ATTESE.length - 1)]; tentativi++;
            mano.removeCallbacks(riapri); mano.postDelayed(riapri, dopo);
        }

        private void svuota(String perche) {
            Op o = corrente; corrente = null; if (o != null && o.cb != null) o.cb.fatto(false, null, perche);
            while (!coda.isEmpty()) { Op x = coda.poll(); if (x.cb != null) x.cb.fatto(false, null, perche); }
        }

        void scrivi(UUID s, UUID c, byte[] v, Esito e) { metti(new Op(SCRIVI, s, c, v, true, e)); }
        void leggi(UUID s, UUID c, Esito e) { metti(new Op(LEGGI, s, c, null, true, e)); }
        void notifiche(UUID s, List<UUID> cs, boolean on, Esito fine) {
            if (cs.isEmpty()) { fine.fatto(true, new byte[0], null); return; }
            final int[] resto = {cs.size()}; final boolean[] errore = {false};
            for (UUID c : cs) metti(new Op(DESCR, s, c, null, on, (ok, v, err) -> {
                if (!ok) errore[0] = true;
                if (--resto[0] == 0) fine.fatto(!errore[0], new byte[0], errore[0] ? "notifiche" : null);
            }));
        }

        private void metti(Op o) {
            if (!pronto || gatt == null) { if (o.cb != null) o.cb.fatto(false, null, "staccato"); return; }
            coda.add(o); if (corrente == null) prossima();
        }

        @SuppressLint("MissingPermission")
        private void prossima() {
            mano.removeCallbacks(scade);
            if (corrente != null || coda.isEmpty() || gatt == null) return;
            Op o = corrente = coda.poll();
            boolean partita = false;
            try {
                BluetoothGattService s = gatt.getService(o.serv);
                BluetoothGattCharacteristic c = s == null ? null : s.getCharacteristic(o.car);
                if (c != null) {
                    if (o.tipo == SCRIVI) {
                        int tipo = (c.getProperties() & BluetoothGattCharacteristic.PROPERTY_WRITE) != 0 ? BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT : BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE;
                        if (Build.VERSION.SDK_INT >= 33) partita = gatt.writeCharacteristic(c, o.valore, tipo) == 0;
                        else { c.setWriteType(tipo); c.setValue(o.valore); partita = gatt.writeCharacteristic(c); }
                    } else if (o.tipo == LEGGI) partita = gatt.readCharacteristic(c);
                    else {
                        gatt.setCharacteristicNotification(c, o.on);
                        if (o.on) ascoltate.add(o.car); else ascoltate.remove(o.car);
                        BluetoothGattDescriptor d = c.getDescriptor(CCCD);
                        if (d == null) { partita = false; corrente = null; if (o.cb != null) o.cb.fatto(true, new byte[0], null); prossima(); return; }
                        byte[] val = !o.on ? BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE
                            : (c.getProperties() & BluetoothGattCharacteristic.PROPERTY_NOTIFY) != 0 ? BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE : BluetoothGattDescriptor.ENABLE_INDICATION_VALUE;
                        if (Build.VERSION.SDK_INT >= 33) partita = gatt.writeDescriptor(d, val) == 0;
                        else { d.setValue(val); partita = gatt.writeDescriptor(d); }
                    }
                }
            } catch (Exception e) { partita = false; }
            if (!partita) { corrente = null; if (o.cb != null) o.cb.fatto(false, null, "rifiutata"); prossima(); return; }
            mano.postDelayed(scade, 8000);
        }

        private void finita(boolean ok, byte[] v) {
            mano.removeCallbacks(scade);
            Op o = corrente; corrente = null;
            if (o != null && o.cb != null) o.cb.fatto(ok, v == null ? new byte[0] : v, ok ? null : "errore");
            prossima();
        }

        /* appena collegato: battito (se il bracciale lo condivide) e batteria standard (se c'è) */
        private void prepara() {
            pronto = true; tentativi = 0;
            try {
                BluetoothGattService hr = gatt.getService(SERV_HR);
                if (hr != null && hr.getCharacteristic(CAR_HR) != null) { List<UUID> l = new ArrayList<>(); l.add(CAR_HR); notifiche(SERV_HR, l, true, (ok, v, e) -> { }); }
                BluetoothGattService ba = gatt.getService(SERV_BATT);
                if (ba != null && ba.getCharacteristic(CAR_BATT) != null) leggi(SERV_BATT, CAR_BATT, (ok, v, e) -> { if (ok && v != null && v.length > 0) { battLetta = v[0] & 0xFF; aggiornaNotifica(); } });
            } catch (Exception e) { }
            aggiornaNotifica(); avvisaPagina();
        }

        private final BluetoothGattCallback cb = new BluetoothGattCallback() {
            @SuppressLint("MissingPermission")
            @Override public void onConnectionStateChange(BluetoothGatt g, int status, int nuovo) {
                mano.post(() -> {
                    if (g != gatt) return;
                    if (nuovo == BluetoothProfile.STATE_CONNECTED) { try { g.discoverServices(); } catch (Exception e) { } }
                    else if (nuovo == BluetoothProfile.STATE_DISCONNECTED) {
                        pronto = false; svuota("staccato"); aggiornaNotifica(); avvisaPagina();
                        /* con autoConnect Android lo riprende da sé quando torna vicino; dopo un errore si riapre da capo, con attese crescenti */
                        if (status != BluetoothGatt.GATT_SUCCESS && status != 8 /* fuori portata */) {
                            try { g.close(); } catch (Exception e) { }
                            gatt = null; riprovaDopo();
                        }
                    }
                });
            }
            @Override public void onServicesDiscovered(BluetoothGatt g, int status) {
                mano.post(() -> { if (g == gatt && status == BluetoothGatt.GATT_SUCCESS) prepara(); });
            }
            @Override public void onCharacteristicWrite(BluetoothGatt g, BluetoothGattCharacteristic c, int status) {
                mano.post(() -> finita(status == BluetoothGatt.GATT_SUCCESS, null));
            }
            @Override public void onCharacteristicRead(BluetoothGatt g, BluetoothGattCharacteristic c, int status) {
                if (Build.VERSION.SDK_INT < 33) { final byte[] v = c.getValue(); mano.post(() -> finita(status == BluetoothGatt.GATT_SUCCESS, v)); }
            }
            @Override public void onCharacteristicRead(BluetoothGatt g, BluetoothGattCharacteristic c, byte[] v, int status) {
                mano.post(() -> finita(status == BluetoothGatt.GATT_SUCCESS, v));
            }
            @Override public void onDescriptorWrite(BluetoothGatt g, BluetoothGattDescriptor d, int status) {
                mano.post(() -> finita(status == BluetoothGatt.GATT_SUCCESS, null));
            }
            @Override public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic c) {
                if (Build.VERSION.SDK_INT < 33) { final byte[] v = c.getValue(); final UUID u = c.getUuid(); mano.post(() -> arrivati(u, v)); }
            }
            @Override public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic c, byte[] v) {
                final UUID u = c.getUuid(); mano.post(() -> arrivati(u, v));
            }
        };

        private void arrivati(UUID car, byte[] v) {
            if (CAR_HR.equals(car)) battito(v, indirizzo);
            else if (ascoltate.contains(car) && indirizzo.equals(dispSempre)) datiPonte(car, v);
        }
    }

    /* misura Heart Rate (Bluetooth SIG): byte 0 = flags, bit0 battito su 2 byte; bit1/bit2 contatto.
       Nel buffer solo durante una seduta e solo dal dispositivo della seduta (niente doppioni) */
    private void battito(byte[] v, String da) {
        if (v == null || v.length < 2) return;
        int f = v[0] & 0xFF;
        int bpm = (f & 1) != 0 ? (v.length >= 3 ? ((v[1] & 0xFF) | ((v[2] & 0xFF) << 8)) : 0) : (v[1] & 0xFF);
        boolean senzaContatto = (f & 4) != 0 && (f & 2) == 0;
        if (bpm < 25 || bpm > 250 || senzaContatto) return;
        long ora = System.currentTimeMillis();
        ultimoBpm = bpm; ultimoT = ora;
        if (attivo && da.equals(dispSeduta)) {
            synchronized (CAMPIONI) {
                CAMPIONI.add(new long[]{ora, bpm});
                while (CAMPIONI.size() > MAX_CAMPIONI) CAMPIONI.remove(0);
            }
        }
    }

    /* ── UUID e testo esadecimale come li usa la pagina («fee0» o l'UUID intero; «00 a2 …») ── */
    static UUID uuid(String s) {
        String t = String.valueOf(s).trim().toLowerCase(Locale.ROOT);
        if (t.matches("[0-9a-f]{4}")) t = "0000" + t + "-0000-1000-8000-00805f9b34fb";
        return UUID.fromString(t);
    }
    static String breve(UUID u) {
        String s = u.toString().toLowerCase(Locale.ROOT);
        return s.matches("0000[0-9a-f]{4}-0000-1000-8000-00805f9b34fb") ? s.substring(4, 8) : s;
    }
    static String hex(byte[] b) {
        if (b == null) return "";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < b.length; i++) { if (i > 0) sb.append(' '); sb.append(String.format(Locale.ROOT, "%02x", b[i] & 0xFF)); }
        return sb.toString();
    }
    static byte[] daHex(String s) {
        String h = String.valueOf(s).replaceAll("[^0-9a-fA-F]", "");
        byte[] out = new byte[h.length() / 2];
        for (int i = 0; i < out.length; i++) out[i] = (byte) Integer.parseInt(h.substring(2 * i, 2 * i + 2), 16);
        return out;
    }
}
