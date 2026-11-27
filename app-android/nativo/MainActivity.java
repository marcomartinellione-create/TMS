package com.trainingmonitorsystem.scheda;

import android.app.PictureInPictureParams;
import android.content.Context;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;

import com.getcapacitor.BridgeActivity;

/* TMS Scheda (APK): l'attività di Capacitor + i plugin «TmsFile» (tasto indietro, informazioni),
   «TmsCartella» (aggiornamento dell'APK) e «TmsSeduta» (servizio della seduta, finestra mobile, batteria).
   FINESTRA MOBILE (Picture-in-Picture, come YouTube; richiesta di Marco del 27/11/2026): con una seduta o una
   registrazione aperta (la pagina lo dice con TmsSeduta.pip), uscendo dall'app col tasto Home o col gesto
   l'attività entra da sola nella finestra mobile: da Android 12 con setAutoEnterEnabled, prima con
   onUserLeaveHint. La pagina riceve l'evento «pip» e mostra la vista compatta (battito, esercizio, recupero,
   tempo). Senza seduta aperta l'app si chiude come sempre; se il telefono non ha il PiP, resta la notifica.
   Sorgente in app-android/nativo/, copiato nel progetto Android da scripts/patch-android.js. */
public class MainActivity extends BridgeActivity {

    private boolean pipVoluto = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TmsFilePlugin.class);
        registerPlugin(TmsCartellaPlugin.class);   /* aggiornamento dell'APK */
        registerPlugin(TmsSedutaPlugin.class);     /* seduta in primo piano, finestra mobile, batteria */
        super.onCreate(savedInstanceState);
    }

    static boolean pipSupportato(Context c) {
        return Build.VERSION.SDK_INT >= 26 && c.getPackageManager().hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE);
    }

    private PictureInPictureParams parametri(boolean auto) {
        PictureInPictureParams.Builder b = new PictureInPictureParams.Builder().setAspectRatio(new Rational(4, 5));
        if (Build.VERSION.SDK_INT >= 31) b.setAutoEnterEnabled(auto).setSeamlessResizeEnabled(false);
        return b.build();
    }

    /* la pagina dice se c'è una seduta aperta (TmsSeduta.pip) */
    void impostaPip(boolean attivo) {
        pipVoluto = attivo;
        if (!pipSupportato(this)) return;
        try { setPictureInPictureParams(parametri(attivo)); } catch (Exception e) { }
    }

    /* fino ad Android 11: si entra nella finestra mobile quando l'utente esce dall'app */
    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (pipVoluto && pipSupportato(this) && Build.VERSION.SDK_INT < 31) {
            try { enterPictureInPictureMode(parametri(false)); } catch (Exception e) { }
        }
    }

    @Override
    public void onPictureInPictureModeChanged(boolean inPip, Configuration nuova) {
        super.onPictureInPictureModeChanged(inPip, nuova);
        TmsSedutaPlugin.pipCambiato(inPip);
    }
}
