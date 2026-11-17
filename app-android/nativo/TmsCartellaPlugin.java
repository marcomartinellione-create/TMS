package com.trainingmonitorsystem.scheda;

/* ════ TMS Scheda (APK) — plugin nativo «TmsCartella» (2026-11-17) ════
   La CARTELLA CONDIVISA col TMS sul PC, come in Movienaitor: una cartella del telefono scelta una
   volta col selettore di Android (permesso persistente), che un'app di sincronizzazione (Autosync,
   FolderSync…) tiene uguale alla cartella «6 - TMS» di Google Drive. Il plugin legge e scrive
   solo lì dentro, per percorsi relativi («marco/dal-pc/stato.json»); i dati li cifra la pagina.
   In più installa l'APK nuovo che «Crea APK» mette in apk/ (Android chiede sempre conferma).
     scegli()                          → { uri, nome }       (annullato: {})
     leggi({uri, percorso})            → { data | null }     (null = il file non c'è)
     scrivi({uri, percorso, data})     → {}                  (crea le sottocartelle)
     elenca({uri, cartella})           → { voci:[{nome, cartella}] }
     verifica({uri})                   → { ok, nome }        (il permesso c'è ancora?)
     installaApk({uri, percorso, sha256}) → { permesso, avviato }
   Il sorgente vero sta in app-android/nativo/: scripts/patch-android.js lo copia nel progetto. */

import android.app.Activity;
import android.content.Intent;
import android.content.UriPermission;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import androidx.documentfile.provider.DocumentFile;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@CapacitorPlugin(name = "TmsCartella")
public class TmsCartellaPlugin extends Plugin {

    /* ── scelta della cartella (una volta): permesso persistente di lettura e scrittura ── */
    @PluginMethod
    public void scegli(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, i, "dopoScelta");
    }

    @ActivityCallback
    private void dopoScelta(PluginCall call, ActivityResult risultato) {
        if (call == null) return;
        Intent dati = risultato.getData();
        if (risultato.getResultCode() != Activity.RESULT_OK || dati == null || dati.getData() == null) {
            call.resolve(new JSObject());
            return;
        }
        Uri uri = dati.getData();
        try {
            getContext().getContentResolver().takePersistableUriPermission(uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        } catch (Exception e) { /* alcuni fornitori non lo chiedono */ }
        JSObject r = new JSObject();
        r.put("uri", uri.toString());
        DocumentFile root = DocumentFile.fromTreeUri(getContext(), uri);
        r.put("nome", root != null && root.getName() != null ? root.getName() : "");
        call.resolve(r);
    }

    @PluginMethod
    public void verifica(PluginCall call) {
        JSObject r = new JSObject();
        try {
            Uri uri = Uri.parse(call.getString("uri", ""));
            boolean permesso = false;
            for (UriPermission p : getContext().getContentResolver().getPersistedUriPermissions()) {
                if (p.getUri().equals(uri) && p.isReadPermission() && p.isWritePermission()) { permesso = true; break; }
            }
            DocumentFile root = DocumentFile.fromTreeUri(getContext(), uri);
            r.put("ok", permesso && root != null && root.isDirectory());
            r.put("nome", root != null && root.getName() != null ? root.getName() : "");
        } catch (Exception e) {
            r.put("ok", false);
        }
        call.resolve(r);
    }

    @PluginMethod
    public void leggi(PluginCall call) {
        try {
            DocumentFile f = risolvi(radice(call), call.getString("percorso"), false);
            JSObject r = new JSObject();
            r.put("data", (f != null && f.isFile()) ? leggiTesto(f.getUri()) : null);
            call.resolve(r);
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    @PluginMethod
    public void scrivi(PluginCall call) {
        String data = call.getString("data");
        if (data == null) { call.reject("manca il contenuto del file"); return; }
        try {
            DocumentFile f = risolvi(radice(call), call.getString("percorso"), true);
            if (f == null) throw new IOException("non riesco a creare il file");
            scriviTesto(f.getUri(), data);
            call.resolve(new JSObject());
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    @PluginMethod
    public void elenca(PluginCall call) {
        try {
            DocumentFile root = radice(call);
            String cartella = call.getString("cartella", "");
            DocumentFile d = (cartella == null || cartella.isEmpty()) ? root : cammina(root, cartella);
            JSArray voci = new JSArray();
            if (d != null && d.isDirectory()) {
                for (DocumentFile f : d.listFiles()) {
                    String nome = f.getName();
                    if (nome == null || nome.startsWith(".")) continue;
                    JSObject v = new JSObject();
                    v.put("nome", nome);
                    v.put("cartella", f.isDirectory());
                    voci.put(v);
                }
            }
            JSObject r = new JSObject();
            r.put("voci", voci);
            call.resolve(r);
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    /* ── ⬆ APK nuovo dalla cartella: copia nella cache, controllo dell'impronta, installer di Android ── */
    @PluginMethod
    public void installaApk(PluginCall call) {
        final String atteso = call.getString("sha256", "");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent perm = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            perm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(perm);
            JSObject r = new JSObject();
            r.put("permesso", false);
            call.resolve(r);
            return;
        }
        final DocumentFile f;
        try {
            String percorso = call.getString("percorso", "");
            if (!percorso.toLowerCase().endsWith(".apk")) throw new IOException("non è un APK");
            f = risolvi(radice(call), percorso, false);
            if (f == null || !f.isFile()) throw new IOException("l'APK non c'è (ancora) nella cartella");
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
            return;
        }
        new Thread(() -> {
            try {
                File dir = new File(getContext().getCacheDir(), "aggiornamenti");
                if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("cache non scrivibile");
                File[] vecchi = dir.listFiles();
                if (vecchi != null) for (File v : vecchi) //noinspection ResultOfMethodCallIgnored
                    v.delete();
                File apk = new File(dir, "tms-scheda-aggiornamento.apk");
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                try (InputStream in = getContext().getContentResolver().openInputStream(f.getUri());
                     OutputStream out = new FileOutputStream(apk)) {
                    if (in == null) throw new IOException("APK non leggibile");
                    byte[] buf = new byte[65536];
                    int n;
                    while ((n = in.read(buf)) > 0) { out.write(buf, 0, n); md.update(buf, 0, n); }
                }
                /* un file a metà (la sincronizzazione non ha finito) non si installa */
                if (atteso != null && !atteso.isEmpty()) {
                    StringBuilder hex = new StringBuilder();
                    for (byte b : md.digest()) hex.append(String.format("%02x", b));
                    if (!hex.toString().equalsIgnoreCase(atteso.trim())) {
                        //noinspection ResultOfMethodCallIgnored
                        apk.delete();
                        throw new IOException("l'APK nella cartella non è completo: aspetta che la sincronizzazione finisca e riprova");
                    }
                }
                Uri content = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
                Intent i = new Intent(Intent.ACTION_VIEW);
                i.setDataAndType(content, "application/vnd.android.package-archive");
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
                JSObject r = new JSObject();
                r.put("permesso", true);
                r.put("avviato", true);
                call.resolve(r);
            } catch (Exception e) {
                call.reject(String.valueOf(e.getMessage()));
            }
        }).start();
    }

    /* ── utilità ── */
    private DocumentFile radice(PluginCall call) throws IOException {
        String u = call.getString("uri");
        if (u == null || u.isEmpty()) throw new IOException("cartella condivisa non scelta");
        DocumentFile root = DocumentFile.fromTreeUri(getContext(), Uri.parse(u));
        if (root == null || !root.isDirectory()) throw new IOException("la cartella condivisa non è più raggiungibile: sceglila di nuovo");
        return root;
    }

    private static String[] parti(String percorso) throws IOException {
        if (percorso == null || percorso.isEmpty()) throw new IOException("percorso mancante");
        String[] p = percorso.split("/");
        for (String x : p) if (x.equals("..") || x.equals(".")) throw new IOException("percorso non consentito: " + percorso);
        return p;
    }

    private DocumentFile figlio(DocumentFile d, String nome) {
        if (d == null) return null;
        for (DocumentFile f : d.listFiles()) if (nome.equals(f.getName())) return f;
        return null;
    }

    private DocumentFile cammina(DocumentFile root, String cartella) throws IOException {
        DocumentFile d = root;
        for (String x : parti(cartella)) {
            if (x.isEmpty()) continue;
            d = figlio(d, x);
            if (d == null || !d.isDirectory()) return null;
        }
        return d;
    }

    /* "a/b/c.json" → il file; con crea=true crea le cartelle e il file che mancano */
    private DocumentFile risolvi(DocumentFile root, String percorso, boolean crea) throws IOException {
        String[] p = parti(percorso);
        DocumentFile d = root;
        for (int i = 0; i < p.length - 1; i++) {
            if (p[i].isEmpty()) continue;
            DocumentFile n = figlio(d, p[i]);
            if (n == null && crea) n = d.createDirectory(p[i]);
            if (n == null || !n.isDirectory()) return null;
            d = n;
        }
        String nome = p[p.length - 1];
        DocumentFile f = figlio(d, nome);
        if (f == null && crea) f = d.createFile("application/json", nome);
        return f;
    }

    private void scriviTesto(Uri uri, String testo) throws IOException {
        OutputStream out;
        try {
            out = getContext().getContentResolver().openOutputStream(uri, "wt");   /* sovrascrive da capo */
        } catch (Exception e) {
            out = getContext().getContentResolver().openOutputStream(uri, "w");
        }
        if (out == null) throw new IOException("non riesco a scrivere il file");
        try {
            out.write(testo.getBytes(StandardCharsets.UTF_8));
            out.flush();
        } finally {
            out.close();
        }
    }

    private String leggiTesto(Uri uri) throws IOException {
        try (InputStream in = getContext().getContentResolver().openInputStream(uri)) {
            if (in == null) throw new IOException("file non leggibile");
            ByteArrayOutputStream b = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
            return new String(b.toByteArray(), StandardCharsets.UTF_8);
        }
    }
}
