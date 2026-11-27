package com.trainingmonitorsystem.scheda;

/* ════ TMS Scheda (APK) — riavvio del «sempre collegato» (APK 1.8.1) ════
   All'accensione del telefono (BOOT_COMPLETED, e QUICKBOOT_POWERON di alcuni produttori) e dopo un aggiornamento
   dell'app (MY_PACKAGE_REPLACED), se il collegamento col bracciale o la fascia era acceso, riavvia il servizio
   TmsSedutaService. Queste trasmissioni sono fra le eccezioni con cui Android permette di avviare un servizio in
   primo piano dal sottofondo; il divieto di Android 15 sull'avvio da BOOT_COMPLETED riguarda altri tipi di servizio
   (dataSync, camera, media, telefono, microfono), non connectedDevice. Se Android rifiuta lo stesso, il servizio
   lascia la notifica «Tocca per ricollegarlo», che apre l'app (avvio dal primo piano, sempre permesso).
   Il sorgente vero sta in app-android/nativo/: scripts/patch-android.js lo copia nel progetto Android. */

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class TmsAvvioReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String a = i != null ? i.getAction() : null;
        if (!Intent.ACTION_BOOT_COMPLETED.equals(a) && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)
            && !"android.intent.action.QUICKBOOT_POWERON".equals(a)) return;
        if (!TmsSedutaService.sempreVoluto(c)) return;
        TmsSedutaService.avviaDaFuori(c);
    }
}
