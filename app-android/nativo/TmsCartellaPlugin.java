package com.trainingmonitorsystem.scheda;

/* ════ TMS Scheda (APK) — plugin nativo «TmsCartella» (2026-11-17) ════
   La CARTELLA CONDIVISA col TMS sul PC, come in Movienaitor: una cartella del telefono scelta una
   volta col selettore di Android (permesso persistente), che un'app di sincronizzazione (Autosync,
   FolderSync…) tiene uguale alla cartella «6 - TMS» di Google Drive. Il plugin legge e scrive
   solo lì dentro, per percorsi relativi («marco/dal-pc/stato.json»); i dati li cifra la pagina.
   In più scarica da GitHub e installa l'APK nuovo (dal 18/11/2026; Android chiede sempre conferma).
     scegli()                          → { uri, nome }       (annullato: {})
     leggi({uri, percorso})            → { data | null }     (null = il file non c'è)
     scrivi({uri, percorso, data})     → {}                  (crea le sottocartelle)
     elenca({uri, cartella})           → { voci:[{nome, cartella}] }
     verifica({uri})                   → { ok, nome }        (il permesso c'è ancora?)
     scaricaApk({url, sha256})         → { permesso, avviato }
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
import java.net.HttpURLConnection;
import java.net.URL;
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

    /* ── ⬆ APK nuovo da GitHub (dal 18/11/2026; prima stava nella cartella condivisa) ──────────────────
       scaricaApk({url, sha256}): scarica l'APK allegato alla release del TMS, ne controlla l'impronta
       SHA-256 e lo passa all'installer di Android (che chiede sempre conferma). Protezioni:
         · solo da https://github.com/marcomartinellione-create/TMS/… ; i redirect (GitHub manda i file
           su objects.githubusercontent.com) si seguono a mano, al massimo 5 e solo verso https;
         · tempi massimi di collegamento e lettura, dimensione massima 100 MB;
         · l'impronta deve essere quella di versione.json e il file deve essere un pacchetto (zip «PK»):
           un file a metà o diverso si butta e non si installa;
         · Android installa sopra solo un APK firmato con la stessa chiave dell'app. */
    private static final String APK_ORIGINE = "https://github.com/marcomartinellione-create/TMS/";
    private static final long APK_MAX = 100L * 1024 * 1024;

    @PluginMethod
    public void scaricaApk(PluginCall call) {
        final String url = call.getString("url", "");
        final String atteso = call.getString("sha256", "").trim().toLowerCase(java.util.Locale.ROOT);
        if (url == null || !url.startsWith(APK_ORIGINE)) { call.reject("indirizzo dell'aggiornamento non valido"); return; }
        if (!atteso.matches("[0-9a-f]{64}")) { call.reject("manca l'impronta dell'aggiornamento"); return; }
        if (!permessoInstallazione(call)) return;
        new Thread(() -> {
            HttpURLConnection c = null;
            try {
                File apk = fileAggiornamento();
                URL u = new URL(url);
                int salti = 0;
                while (true) {
                    c = (HttpURLConnection) u.openConnection();
                    c.setInstanceFollowRedirects(false);
                    c.setConnectTimeout(15000);
                    c.setReadTimeout(30000);
                    c.setRequestProperty("User-Agent", "TMS-Scheda");
                    int codice = c.getResponseCode();
                    if (codice >= 300 && codice < 400) {
                        String dove = c.getHeaderField("Location");
                        c.disconnect(); c = null;
                        if (dove == null || ++salti > 5) throw new IOException("GitHub non dice dove sta il file");
                        u = new URL(u, dove);
                        if (!"https".equalsIgnoreCase(u.getProtocol())) throw new IOException("indirizzo non sicuro");
                        continue;
                    }
                    if (codice != 200) throw new IOException("GitHub ha risposto " + codice + ": il file della versione nuova non c'è ancora, riprova più tardi");
                    break;
                }
                if (c.getContentLengthLong() > APK_MAX) throw new IOException("file troppo grande");
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                byte[] testa = new byte[4];
                long letti = 0;
                try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(apk)) {
                    byte[] buf = new byte[65536];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        if (letti < 4) System.arraycopy(buf, 0, testa, (int) letti, (int) Math.min(n, 4 - letti));
                        letti += n;
                        if (letti > APK_MAX) throw new IOException("file troppo grande");
                        out.write(buf, 0, n);
                        md.update(buf, 0, n);
                    }
                }
                StringBuilder hex = new StringBuilder();
                for (byte b : md.digest()) hex.append(String.format("%02x", b));
                if (!hex.toString().equals(atteso)) {
                    //noinspection ResultOfMethodCallIgnored
                    apk.delete();
                    throw new IOException("il file scaricato non è quello giusto (impronta diversa): riprova più tardi");
                }
                if (testa[0] != 'P' || testa[1] != 'K') {
                    //noinspection ResultOfMethodCallIgnored
                    apk.delete();
                    throw new IOException("il file scaricato non è un APK");
                }
                avviaInstaller(apk);
                JSObject r = new JSObject();
                r.put("permesso", true);
                r.put("avviato", true);
                call.resolve(r);
            } catch (java.net.UnknownHostException | java.net.SocketTimeoutException | java.net.ConnectException e) {
                call.reject("niente rete o GitHub non risponde: riprova quando sei connesso");
            } catch (Exception e) {
                call.reject(String.valueOf(e.getMessage()));
            } finally {
                if (c != null) c.disconnect();
            }
        }).start();
    }

    /* Android 8+: serve il permesso «installa app sconosciute»; se manca si apre la sua schermata */
    private boolean permessoInstallazione(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent perm = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            perm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(perm);
            JSObject r = new JSObject();
            r.put("permesso", false);
            call.resolve(r);
            return false;
        }
        return true;
    }

    private File fileAggiornamento() throws IOException {
        File dir = new File(getContext().getCacheDir(), "aggiornamenti");
        if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("cache non scrivibile");
        File[] vecchi = dir.listFiles();
        if (vecchi != null) for (File v : vecchi) //noinspection ResultOfMethodCallIgnored
            v.delete();
        return new File(dir, "tms-scheda-aggiornamento.apk");
    }

    private void avviaInstaller(File apk) {
        Uri content = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(content, "application/vnd.android.package-archive");
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
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
