package com.trainingmonitorsystem.scheda;

/* ════ TMS Scheda (APK) — plugin nativo «TmsFile» ════
   Fa dal lato Android le poche cose che dentro un'app non funzionano come nel browser:
   · file in arrivo con «Apri con» / «Condividi» (WhatsApp, email, File…): li copia nella
     cache dell'app e avvisa la pagina con l'evento «fileRicevuto» ({nome, percorso});
     la pagina li legge da lì (Capacitor.convertFileSrc) e li carica come se li avesse scelti;
   · il rientro per il coach: condividi (pannello di Android), scegli la cartella
     (ACTION_CREATE_DOCUMENT), salva nei Download (MediaStore, da Android 10);
   · il tasto INDIETRO del telefono: chiede alla pagina (window.tmsIndietro) di risalire di un
     livello; se la pagina è già al menu, Android fa quello che fa di solito (chiude l'app).
   Niente rete, niente permessi speciali: i file passano solo per le cartelle che sceglie il cliente.
   Il sorgente vero sta in app-android/nativo/: scripts/patch-android.js lo copia nel progetto
   Android generato. */

import android.app.Activity;
import android.content.ClipData;
import android.content.ComponentName;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.OpenableColumns;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

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

    /* ── file in arrivo: all'avvio (BridgeActivity passa l'intent di lancio di qui) e ad app aperta ── */
    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (intent == null) return;
        /* riaperta dalle app recenti: è il vecchio intent, il file l'abbiamo già preso */
        if ((intent.getFlags() & Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0) return;
        final Uri uri = uriDaIntent(intent);
        if (uri == null) return;
        /* non rileggerlo se l'attività viene ricreata con lo stesso intent */
        intent.setAction(Intent.ACTION_MAIN);
        intent.setData(null);
        intent.removeExtra(Intent.EXTRA_STREAM);
        /* il permesso di lettura dato da WhatsApp/email vale finché l'attività è viva:
           si copia SUBITO, in un thread a parte (con i video il file può pesare decine di MB) */
        new Thread(() -> {
            JSObject dati;
            try {
                dati = copiaInCache(uri, "in");
            } catch (Exception e) {
                dati = new JSObject();
                dati.put("errore", String.valueOf(e.getMessage()));
            }
            notifyListeners("fileRicevuto", dati, true);
        }).start();
    }

    @SuppressWarnings("deprecation")
    private Uri uriDaIntent(Intent intent) {
        String azione = intent.getAction();
        if (Intent.ACTION_VIEW.equals(azione)) return intent.getData();
        if (Intent.ACTION_SEND.equals(azione)) {
            Uri u = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            ClipData clip = intent.getClipData();
            if (u == null && clip != null && clip.getItemCount() > 0) u = clip.getItemAt(0).getUri();
            return u;
        }
        return null;
    }

    private JSObject copiaInCache(Uri uri, String sottocartella) throws IOException {
        String nome = nomeDi(uri, "Scheda.json");
        File dir = new File(getContext().getCacheDir(), sottocartella);
        svuota(dir);
        if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("cartella temporanea non disponibile");
        File dest = new File(dir, nomePulito(nome));
        try (InputStream in = getContext().getContentResolver().openInputStream(uri);
             OutputStream out = new FileOutputStream(dest)) {
            if (in == null) throw new IOException("file non leggibile");
            byte[] buf = new byte[65536];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        }
        JSObject r = new JSObject();
        r.put("nome", nome);
        r.put("percorso", dest.getAbsolutePath());
        r.put("byte", dest.length());
        return r;
    }

    /* ── informazioni per la pagina: quali strade di salvataggio ha questo telefono ── */
    @PluginMethod
    public void info(PluginCall call) {
        JSObject r = new JSObject();
        r.put("sdk", Build.VERSION.SDK_INT);
        /* i Download senza permessi si scrivono solo da Android 10 (MediaStore) */
        r.put("download", Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q);
        try {
            PackageInfo pi = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            r.put("versione", pi.versionName);
        } catch (Exception e) {
            r.put("versione", "");
        }
        call.resolve(r);
    }

    /* ── 📤 condividi: WhatsApp, email, Drive, File… li sceglie il cliente ── */
    @PluginMethod
    public void condividi(PluginCall call) {
        String nome = nomePulito(call.getString("nome", "Rientro.json"));
        String testo = call.getString("testo");
        if (testo == null) { call.reject("manca il contenuto del file"); return; }
        try {
            File dir = new File(getContext().getCacheDir(), "out");
            svuota(dir);
            if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("cartella temporanea non disponibile");
            File f = new File(dir, nome);
            try (OutputStream out = new FileOutputStream(f)) {
                out.write(testo.getBytes(StandardCharsets.UTF_8));
            }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            Intent invio = new Intent(Intent.ACTION_SEND);
            invio.setType("application/json");
            invio.putExtra(Intent.EXTRA_STREAM, uri);
            invio.putExtra(Intent.EXTRA_SUBJECT, nome);
            invio.setClipData(ClipData.newRawUri(nome, uri));
            invio.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent scelta = Intent.createChooser(invio, call.getString("titolo", nome));
            /* il rientro va al coach: TMS Scheda stessa non deve comparire fra le app proposte */
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                scelta.putExtra(Intent.EXTRA_EXCLUDE_COMPONENTS, new ComponentName[] { new ComponentName(getContext(), MainActivity.class) });
            }
            getActivity().startActivity(scelta);
            call.resolve();
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    /* ── 📁 scegli la cartella: cartella e nome li decide il cliente ── */
    @PluginMethod
    public void salvaInCartella(PluginCall call) {
        if (call.getString("testo") == null) { call.reject("manca il contenuto del file"); return; }
        Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType("application/json");
        i.putExtra(Intent.EXTRA_TITLE, nomePulito(call.getString("nome", "Rientro.json")));
        startActivityForResult(call, i, "dopoSceltaCartella");
    }

    @ActivityCallback
    private void dopoSceltaCartella(PluginCall call, ActivityResult risultato) {
        if (call == null) return;
        Intent dati = risultato.getData();
        if (risultato.getResultCode() != Activity.RESULT_OK || dati == null || dati.getData() == null) {
            call.reject("annullato", "ANNULLATO");
            return;
        }
        Uri uri = dati.getData();
        try {
            scrivi(uri, call.getString("testo", ""));
            JSObject r = new JSObject();
            r.put("nome", nomeDi(uri, call.getString("nome", "")));
            call.resolve(r);
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    /* ── ⬇ Download: la cartella predefinita del telefono (Android 10 e successivi) ── */
    @PluginMethod
    public void salvaInDownload(PluginCall call) {
        String testo = call.getString("testo");
        if (testo == null) { call.reject("manca il contenuto del file"); return; }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) { call.reject("non disponibile su questo telefono", "NON_DISPONIBILE"); return; }
        String nome = nomePulito(call.getString("nome", "Rientro.json"));
        ContentResolver cr = getContext().getContentResolver();
        Uri uri = null;
        try {
            ContentValues v = new ContentValues();
            v.put(MediaStore.MediaColumns.DISPLAY_NAME, nome);
            v.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
            v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
            v.put(MediaStore.MediaColumns.IS_PENDING, 1);
            uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            if (uri == null) throw new IOException("la cartella Download non accetta il file");
            scrivi(uri, testo);
            ContentValues fine = new ContentValues();
            fine.put(MediaStore.MediaColumns.IS_PENDING, 0);
            cr.update(uri, fine, null, null);
            JSObject r = new JSObject();
            r.put("nome", nomeDi(uri, nome));
            call.resolve(r);
        } catch (Exception e) {
            if (uri != null) {
                try { cr.delete(uri, null, null); } catch (Exception ignorata) { /* niente file a metà */ }
            }
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    /* ── utilità ── */
    private void scrivi(Uri uri, String testo) throws IOException {
        ContentResolver cr = getContext().getContentResolver();
        OutputStream out;
        try {
            out = cr.openOutputStream(uri, "wt");      /* sovrascrive se il file c'era già */
        } catch (Exception e) {
            out = cr.openOutputStream(uri, "w");       /* alcuni fornitori (es. Drive) non conoscono "wt" */
        }
        if (out == null) throw new IOException("non riesco a scrivere il file");
        try {
            out.write(testo.getBytes(StandardCharsets.UTF_8));
            out.flush();
        } finally {
            out.close();
        }
    }

    private String nomeDi(Uri uri, String riserva) {
        String nome = null;
        try (Cursor c = getContext().getContentResolver().query(uri, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
            if (c != null && c.moveToFirst()) nome = c.getString(0);
        } catch (Exception ignorata) {
            /* alcuni fornitori non rispondono alla domanda: si usa il resto dell'indirizzo */
        }
        if (nome == null || nome.trim().isEmpty()) nome = uri.getLastPathSegment();
        if (nome == null || nome.trim().isEmpty()) nome = riserva;
        int barra = nome.lastIndexOf('/');
        if (barra >= 0) nome = nome.substring(barra + 1);
        return nome;
    }

    private static String nomePulito(String nome) {
        String n = String.valueOf(nome == null ? "" : nome).replaceAll("[\\\\/:*?\"<>|\\x00-\\x1f]", "_").trim();
        return n.isEmpty() ? "file.json" : n;
    }

    private static void svuota(File dir) {
        File[] dentro = dir.listFiles();
        if (dentro == null) return;
        for (File f : dentro) {
            if (f.isFile()) //noinspection ResultOfMethodCallIgnored
                f.delete();
        }
    }
}
