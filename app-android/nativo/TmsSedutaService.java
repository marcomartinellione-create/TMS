package com.trainingmonitorsystem.scheda;

/* ════ TMS Scheda (APK) — servizio in primo piano della SEDUTA ════
   Richiesta di Marco (27/11/2026): «quando parte una sessione di allenamento l'app non si chiude mai davvero,
   resta attiva costantemente in background, così da prendere costantemente i dati dal bracciale».
   Parte con «Inizia» (seduta coi pesi) o «Avvia registrazione» (Cardio) e si ferma a «Fine» o «Annulla»
   (lo comanda la pagina con il plugin TmsSeduta). Mentre gira:
   · tiene la NOTIFICA FISSA obbligatoria per i servizi in primo piano: titolo della seduta, battito e tempo
     trascorso, aggiornati ogni 5 secondi; un tocco riapre l'app;
   · apre un SUO collegamento Bluetooth alla fascia o al bracciale (profilo standard Heart Rate: servizio
     0x180D, misura 0x2A37, la stessa della pagina, senza chiave) e mette ogni battito con la sua ora in un
     BUFFER in memoria. Con lo schermo spento Android può fermare la pagina (WebView in pausa, Doze): il
     servizio no. Quando la pagina torna attiva chiede i campioni (TmsSeduta.campioni) e riempie la traccia
     dove le mancano dati;
   · tiene un wake lock PARZIALE (la CPU, non lo schermo) per non perdere i battiti col telefono in tasca;
     al massimo 6 ore, poi Android lo rilascia da sé.
   Tipo di servizio: connectedDevice (Android 14 lo vuole dichiarato, col permesso
   FOREGROUND_SERVICE_CONNECTED_DEVICE: li aggiunge scripts/patch-android.js).
   Il sorgente vero sta in app-android/nativo/: scripts/patch-android.js lo copia nel progetto Android. */

import android.annotation.SuppressLint;
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
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class TmsSedutaService extends Service {

    static final String AZIONE_AVVIA = "com.trainingmonitorsystem.scheda.SEDUTA_AVVIA";
    static final String AZIONE_FERMA = "com.trainingmonitorsystem.scheda.SEDUTA_FERMA";
    static final int ID_NOTIFICA = 7400;
    static final String CANALE = "seduta";
    static final long MAX_CAMPIONI = 6L * 3600L;                 /* 6 ore a un battito al secondo */

    private static final UUID SERV_HR = UUID.fromString("0000180d-0000-1000-8000-00805f9b34fb");
    private static final UUID CAR_HR = UUID.fromString("00002a37-0000-1000-8000-00805f9b34fb");
    private static final UUID CCCD = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");

    /* buffer dei battiti: [ora in ms, bpm]. Statico: la pagina lo legge col plugin anche dopo una pausa */
    private static final List<long[]> CAMPIONI = new ArrayList<>();
    static volatile boolean attivo = false;
    static volatile int ultimoBpm = 0;
    static volatile long ultimoT = 0;

    private String titolo = "";
    private long inizio = 0;
    private String dispositivo = "";
    private BluetoothGatt gatt = null;
    private PowerManager.WakeLock wl = null;
    private final Handler mano = new Handler(Looper.getMainLooper());
    private final Runnable giro = new Runnable() {
        @Override public void run() { aggiornaNotifica(); if (attivo) mano.postDelayed(this, 5000); }
    };

    /* ── i campioni dopo un'ora (la pagina li chiede quando torna attiva) ── */
    static List<long[]> campioniDopo(long da) {
        List<long[]> out = new ArrayList<>();
        synchronized (CAMPIONI) { for (long[] c : CAMPIONI) if (c[0] > da) out.add(new long[]{c[0], c[1]}); }
        return out;
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String azione = intent != null ? intent.getAction() : null;
        if (AZIONE_FERMA.equals(azione)) { ferma(); return START_NOT_STICKY; }
        if (intent != null) {
            String t = intent.getStringExtra("titolo"); if (t != null) titolo = t;
            long i = intent.getLongExtra("inizio", 0); if (i > 0) inizio = i;
            String d = intent.getStringExtra("dispositivo");
            if (d == null) d = "";
            if (!d.equals(dispositivo)) { chiudiGatt(); dispositivo = d; }
        }
        if (!attivo) {
            attivo = true;
            synchronized (CAMPIONI) { CAMPIONI.clear(); }
            ultimoBpm = 0; ultimoT = 0;
            creaCanale();
            Notification n = notifica();
            if (Build.VERSION.SDK_INT >= 29) startForeground(ID_NOTIFICA, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
            else startForeground(ID_NOTIFICA, n);
            try {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "tms:seduta");
                wl.acquire(6L * 3600L * 1000L);
            } catch (Exception e) { wl = null; }
            mano.postDelayed(giro, 5000);
        } else {
            aggiornaNotifica();
        }
        if (gatt == null && !dispositivo.isEmpty()) collega();
        /* se Android chiude il processo muore anche la pagina: niente servizio orfano che riparte da solo */
        return START_NOT_STICKY;
    }

    private void ferma() {
        attivo = false;
        mano.removeCallbacks(giro);
        chiudiGatt();
        try { if (wl != null && wl.isHeld()) wl.release(); } catch (Exception e) { }
        wl = null;
        if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE); else stopForeground(true);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        attivo = false;
        mano.removeCallbacks(giro);
        chiudiGatt();
        try { if (wl != null && wl.isHeld()) wl.release(); } catch (Exception e) { }
        super.onDestroy();
    }

    /* ── notifica fissa ── */
    private void creaCanale() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationChannel c = new NotificationChannel(CANALE, "Seduta in corso", NotificationManager.IMPORTANCE_LOW);
        c.setDescription("Battito e tempo della seduta, mentre l'allenamento è aperto");
        c.setShowBadge(false);
        ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).createNotificationChannel(c);
    }

    private Notification notifica() {
        Intent apri = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (apri == null) apri = new Intent(this, MainActivity.class);
        apri.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        int pf = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent pi = PendingIntent.getActivity(this, 0, apri, pf);
        long sec = inizio > 0 ? Math.max(0, (System.currentTimeMillis() - inizio) / 1000) : 0;
        String tempo = (sec >= 3600 ? (sec / 3600) + ":" + due((sec % 3600) / 60) : String.valueOf((sec % 3600) / 60)) + ":" + due(sec % 60);
        boolean fresco = ultimoBpm > 0 && System.currentTimeMillis() - ultimoT < 15000;
        String testo = (fresco ? "♥ " + ultimoBpm + " bpm · " : "") + tempo;
        int icona = getResources().getIdentifier("ic_stat_tms", "drawable", getPackageName());
        if (icona == 0) icona = android.R.drawable.ic_dialog_info;
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CANALE) : new Notification.Builder(this);
        b.setContentTitle(titolo.isEmpty() ? "TMS Scheda" : titolo)
         .setContentText(testo)
         .setSmallIcon(icona)
         .setContentIntent(pi)
         .setOngoing(true)
         .setOnlyAlertOnce(true)
         .setShowWhen(false)
         .setCategory(Notification.CATEGORY_WORKOUT);
        if (Build.VERSION.SDK_INT >= 21) b.setColor(0xFF9A5B1F);
        if (Build.VERSION.SDK_INT >= 31) b.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        return b.build();
    }

    private static String due(long n) { return n < 10 ? "0" + n : String.valueOf(n); }

    private void aggiornaNotifica() {
        if (!attivo) return;
        try { ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).notify(ID_NOTIFICA, notifica()); } catch (Exception e) { }
    }

    /* ── Bluetooth: profilo Heart Rate della fascia o del bracciale ── */
    @SuppressLint("MissingPermission")
    private void collega() {
        try {
            BluetoothManager bm = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
            BluetoothAdapter ad = bm != null ? bm.getAdapter() : null;
            if (ad == null || !BluetoothAdapter.checkBluetoothAddress(dispositivo)) return;
            BluetoothDevice dev = ad.getRemoteDevice(dispositivo);
            /* autoConnect: Android lo ricollega da sé quando torna a portata */
            gatt = Build.VERSION.SDK_INT >= 23 ? dev.connectGatt(this, true, cb, BluetoothDevice.TRANSPORT_LE) : dev.connectGatt(this, true, cb);
        } catch (SecurityException e) { gatt = null; }
        catch (Exception e) { gatt = null; }
    }

    @SuppressLint("MissingPermission")
    private void chiudiGatt() {
        BluetoothGatt g = gatt; gatt = null;
        if (g == null) return;
        try { g.disconnect(); } catch (Exception e) { }
        try { g.close(); } catch (Exception e) { }
    }

    private final BluetoothGattCallback cb = new BluetoothGattCallback() {
        @SuppressLint("MissingPermission")
        @Override
        public void onConnectionStateChange(BluetoothGatt g, int status, int nuovo) {
            if (nuovo == BluetoothProfile.STATE_CONNECTED) { try { g.discoverServices(); } catch (Exception e) { } }
        }

        @SuppressLint("MissingPermission")
        @Override
        public void onServicesDiscovered(BluetoothGatt g, int status) {
            try {
                BluetoothGattService s = g.getService(SERV_HR);
                if (s == null) return;
                BluetoothGattCharacteristic c = s.getCharacteristic(CAR_HR);
                if (c == null) return;
                g.setCharacteristicNotification(c, true);
                BluetoothGattDescriptor d = c.getDescriptor(CCCD);
                if (d == null) return;
                if (Build.VERSION.SDK_INT >= 33) g.writeDescriptor(d, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
                else { d.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE); g.writeDescriptor(d); }
            } catch (Exception e) { }
        }

        @Override
        public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic c) {
            if (Build.VERSION.SDK_INT < 33) battito(c.getValue());
        }

        @Override
        public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic c, byte[] valore) {
            battito(valore);
        }
    };

    /* misura Heart Rate (Bluetooth SIG): byte 0 = flags, bit0 battito su 2 byte; bit1/bit2 contatto */
    private void battito(byte[] v) {
        if (v == null || v.length < 2) return;
        int f = v[0] & 0xFF;
        int bpm = (f & 1) != 0 ? (v.length >= 3 ? ((v[1] & 0xFF) | ((v[2] & 0xFF) << 8)) : 0) : (v[1] & 0xFF);
        boolean senzaContatto = (f & 4) != 0 && (f & 2) == 0;
        if (bpm < 25 || bpm > 250 || senzaContatto) return;
        long ora = System.currentTimeMillis();
        ultimoBpm = bpm; ultimoT = ora;
        synchronized (CAMPIONI) {
            CAMPIONI.add(new long[]{ora, bpm});
            while (CAMPIONI.size() > MAX_CAMPIONI) CAMPIONI.remove(0);
        }
    }
}
