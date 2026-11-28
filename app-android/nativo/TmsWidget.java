package com.trainingmonitorsystem.scheda;

/* ════ TMS Scheda (APK 1.11.0) — WIDGET DELLA GIORNATA sulla schermata Home, A FASCE ════
   27/11/2026, Marco: «creiamo un widget per il telefono dove sintetizza la giornata: battito, passi, calorie, sonno».
   28/11/2026, Marco: «miglioriamo il widget, rendiamo più chiare e ampie le aree in modo che sia specifico subito,
   ispiriamoci anche alla apple per le varie fasce una sopra all'altra che si completano»; per le calorie ha scelto
   come traguardo «la tua giornata tipica».
   Quattro FASCE una sopra l'altra (widget alto) o due per due (widget basso, come il 4×2 di prima): ognuna col suo nome,
   il numero grande e una barra che si riempie verso il suo traguardo, coi colori della Salute dell'app.
   · BATTITO: l'ultimo battito e a che ora; la barra è il punto fra il battito a riposo e il massimo (riserva cardiaca),
     nel colore della zona (zone del battito massimo come nell'app: 50/60/70/80/90 %).
   · PASSI: i passi di oggi contro il traguardo; arancio sotto il 70 %, ocra fino al 99 %, verde raggiunto.
   · CALORIE: la stima di oggi contro la GIORNATA TIPICA (media dei giorni interi col bracciale degli ultimi 14, o il
     fabbisogno del profilo); la barra è divisa nelle quattro parti della Salute (metabolismo, vita quotidiana, movimento,
     digestione) e si riempie man mano che passa la giornata.
   · SONNO: le ore dormite la notte finita oggi contro 8 ore (la National Sleep Foundation consiglia 7–9 ore agli adulti),
     la barra divisa nelle fasi (profondo, REM, leggero) coi loro colori; accanto il punteggio del bracciale.
   I numeri li prepara la PAGINA (widgetAggiorna in web/index.html) e arrivano con TmsSeduta.widget (pagina dell'app) o
   TmsServizio.widget (pagina invisibile del servizio, ogni 30 minuti ad app chiusa); il servizio del «sempre collegato»
   aggiorna da sé il battito, al più una volta al minuto. Tutto resta sul telefono (SharedPreferences «tms_widget»).
   Passato il giorno, passi, calorie e sonno tornano «—» finché la pagina non manda quelli nuovi.
   Toccandolo si apre l'app sulla Salute (azione WIDGET: MainActivity → TmsSedutaPlugin.daWidget).
   Le barre si disegnano alla larghezza vera del widget (opzioni del launcher), così gli angoli restano tondi.
   Layout e risorse li scrive scripts/patch-android.js (layout tms_widget e tms_widget_basso, icone tms_w_*). */

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.Locale;

public class TmsWidget extends AppWidgetProvider {

    static final String PREF = "tms_widget";
    static final String AZIONE = "com.trainingmonitorsystem.scheda.WIDGET";
    /* colori dell'app (web/index.html: :root, Salute, zone del battito, parti delle calorie, fasi del sonno) */
    static final int CARTA_3 = 0xFFEDE4D2;
    static final int PROFONDO = 0xFF7A3EA8, REM = 0xFF9A6B08, LEGGERO = 0xFF2B7A9A;
    static final int OK = 0xFF2F7D4F, OCRA = 0xFF9A6B08, ACC = 0xFFB4470D;
    static final int K_BAS = 0xFFA08D6E, K_VIT = 0xFFB8860B, K_MOV = 0xFFB4470D, K_DIG = 0xFF9A6B08;
    static final int[] ZONE = {0xFF5B6F86, 0xFF2B7A9A, 0xFF2F7D4F, 0xFFB4470D, 0xFF991B1B};
    static final double[] SOGLIE = {0.5, 0.6, 0.7, 0.8, 0.9};
    static final int SONNO_OBI = 480;   /* 8 ore */
    private static long ultimoBattito = 0;

    static SharedPreferences pref(Context c) { return c.getSharedPreferences(PREF, Context.MODE_PRIVATE); }

    /* la pagina manda i numeri del giorno */
    static void salva(Context c, String json) {
        if (c == null || json == null) return;
        try { new JSONObject(json); } catch (Exception e) { return; }
        pref(c).edit().putString("dati", json).apply();
        aggiorna(c);
    }

    /* il servizio manda il battito (al più una volta al minuto) */
    static void battito(Context c, int bpm) {
        long ora = System.currentTimeMillis();
        if (c == null || bpm < 25 || bpm > 250 || ora - ultimoBattito < 60000) return;
        ultimoBattito = ora;
        pref(c).edit().putInt("bpm", bpm).putLong("bpmT", ora).apply();
        aggiorna(c);
    }

    static void aggiorna(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, TmsWidget.class));
            if (ids == null || ids.length == 0) return;
            for (int id : ids) m.updateAppWidget(id, vista(c, m, id));
        } catch (Exception e) { }
    }

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) { try { m.updateAppWidget(id, vista(c, m, id)); } catch (Exception e) { } }
    }

    /* il widget ridimensionato: si ridisegna (fasce in colonna o due per due, barre alla nuova larghezza) */
    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle o) {
        try { m.updateAppWidget(id, vista(c, m, id)); } catch (Exception e) { }
    }

    private static int id(Context c, String tipo, String nome) { return c.getResources().getIdentifier(nome, tipo, c.getPackageName()); }

    static String oggi() {
        Calendar k = Calendar.getInstance();
        return String.format(Locale.ROOT, "%04d-%02d-%02d", k.get(Calendar.YEAR), k.get(Calendar.MONTH) + 1, k.get(Calendar.DAY_OF_MONTH));
    }
    static String ora(long ms) {
        Calendar k = Calendar.getInstance(); k.setTimeInMillis(ms);
        return String.format(Locale.ROOT, "%02d:%02d", k.get(Calendar.HOUR_OF_DAY), k.get(Calendar.MINUTE));
    }
    /* 8.000 alla maniera dell'app (in inglese 8,000) */
    static String numero(long n, boolean en) {
        String s = String.format(Locale.ROOT, "%,d", n);
        return en ? s : s.replace(',', '.');
    }
    static String durata(int min) { return (min / 60) + " h " + String.format(Locale.ROOT, "%02d", min % 60); }

    static RemoteViews vista(Context c, AppWidgetManager m, int wid) {
        /* misure vere del widget (dp): in verticale la larghezza è la minima e l'altezza la massima */
        int wDp = 250, hDp = 180;
        try {
            Bundle o = m.getAppWidgetOptions(wid);
            if (o != null) { wDp = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, wDp); hDp = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, hDp); }
        } catch (Exception e) { }
        if (wDp < 120) wDp = 250;
        boolean basso = hDp > 0 && hDp < 170;
        RemoteViews v = new RemoteViews(c.getPackageName(), id(c, "layout", basso ? "tms_widget_basso" : "tms_widget"));
        float dens = c.getResources().getDisplayMetrics().density;
        int barraW = Math.max(80, Math.round(((basso ? (wDp - 28 - 14) / 2f : wDp - 28)) * dens)), barraH = Math.max(6, Math.round((basso ? 7 : 9) * dens));

        JSONObject d = new JSONObject();
        try { d = new JSONObject(pref(c).getString("dati", "{}")); } catch (Exception e) { }
        JSONObject L = d.optJSONObject("L"); if (L == null) L = new JSONObject();
        boolean en = "steps".equals(L.optString("passi"));
        boolean diOggi = oggi().equals(d.optString("g"));

        /* ── BATTITO: il più recente fra quello della pagina e quello del servizio ── */
        int bpm = d.optInt("bpm", 0); long bpmT = d.optLong("bpmT", 0);
        SharedPreferences p = pref(c);
        if (p.getLong("bpmT", 0) > bpmT) { bpm = p.getInt("bpm", 0); bpmT = p.getLong("bpmT", 0); }
        boolean bpmOk = bpm > 0 && System.currentTimeMillis() - bpmT < 12 * 3600000L;
        int rip = d.optInt("fcRip", 0), max = d.optInt("fcMax", 0);
        v.setTextViewText(id(c, "id", "tms_w_bpm_l"), L.optString("battito", "battito"));
        v.setTextViewText(id(c, "id", "tms_w_bpm"), bpmOk ? String.valueOf(bpm) : "—");
        String bs = bpmOk ? "bpm · " + ora(bpmT) : "bpm";
        if (rip > 0 && !basso) bs += " · " + L.optString("riposo", "a riposo") + " " + rip;
        v.setTextViewText(id(c, "id", "tms_w_bpm_u"), bs);
        double fB = 0; int colB = ZONE[0];
        if (bpmOk && max > 0) {
            fB = (rip > 0 && max > rip) ? (double) (bpm - rip) / (max - rip) : (double) bpm / max;
            double q = (double) bpm / max; int z = -1; for (int i = 0; i < 5; i++) if (q >= SOGLIE[i]) z = i;
            colB = z >= 0 ? ZONE[z] : ZONE[0];
        }
        v.setImageViewBitmap(id(c, "id", "tms_w_bpm_b"), barra(barraW, barraH, new double[]{Math.max(0.04, fB)}, new int[]{colB}, bpmOk && max > 0));

        /* ── PASSI contro il traguardo ── */
        long passi = diOggi && !d.isNull("passi") ? d.optLong("passi", -1) : -1;
        int obi = d.optInt("obi", 8000); if (obi < 1000) obi = 8000;
        double fP = passi >= 0 ? (double) passi / obi : 0;
        v.setTextViewText(id(c, "id", "tms_w_passi_l"), L.optString("passi", "passi"));
        v.setTextViewText(id(c, "id", "tms_w_passi"), passi >= 0 ? numero(passi, en) : "—");
        v.setTextViewText(id(c, "id", "tms_w_passi_u"), L.optString("di", "di") + " " + numero(obi, en));
        v.setImageViewBitmap(id(c, "id", "tms_w_passi_b"), barra(barraW, barraH, new double[]{fP}, new int[]{fP >= 1 ? OK : fP >= 0.7 ? OCRA : ACC}, passi >= 0));

        /* ── CALORIE contro la giornata tipica, divise nelle quattro parti ── */
        long kcal = diOggi && !d.isNull("kcal") ? d.optLong("kcal", -1) : -1;
        long tip = d.optLong("tipica", 0);
        JSONArray kp = diOggi ? d.optJSONArray("kp") : null;
        v.setTextViewText(id(c, "id", "tms_w_kcal_l"), L.optString("kcalL", "calorie"));
        v.setTextViewText(id(c, "id", "tms_w_kcal"), kcal >= 0 ? numero(kcal, en) : "—");
        v.setTextViewText(id(c, "id", "tms_w_kcal_u"), tip > 0 ? L.optString("di", "di") + " " + numero(tip, en) : "kcal · " + L.optString("stima", "stima"));
        double[] fK = new double[4]; int[] colK = {K_BAS, K_VIT, K_MOV, K_DIG};
        if (kcal > 0) {
            double rif = tip > 0 ? tip : kcal;
            if (kp != null && kp.length() >= 4) { for (int i = 0; i < 4; i++) fK[i] = Math.max(0, kp.optDouble(i, 0)) / rif; }
            else { fK = new double[]{kcal / rif}; colK = new int[]{K_MOV}; }
        }
        v.setImageViewBitmap(id(c, "id", "tms_w_kcal_b"), barra(barraW, barraH, fK, colK, kcal > 0));

        /* ── SONNO: ore dormite contro 8 ore, divise nelle fasi; il punteggio del bracciale accanto ── */
        JSONObject s = diOggi ? d.optJSONObject("sonno") : null;
        int[] fasi = new int[4]; int punt = -1, min = 0;
        if (s != null) {
            JSONArray f = s.optJSONArray("f");
            for (int i = 0; f != null && i < 4 && i < f.length(); i++) fasi[i] = Math.max(0, f.optInt(i, 0));
            punt = s.isNull("p") ? -1 : s.optInt("p", -1);
            min = s.optInt("min", 0);
        }
        v.setTextViewText(id(c, "id", "tms_w_sonno_l"), L.optString("sonno", "sonno"));
        v.setTextViewText(id(c, "id", "tms_w_sonno"), min > 0 ? durata(min) : "—");
        v.setTextViewText(id(c, "id", "tms_w_sonno_u"), punt >= 0 ? L.optString("punt", "punteggio") + " " + punt : "");
        double[] fS; int[] colS;
        int sotto = fasi[0] + fasi[1] + fasi[2];
        if (sotto > 0) { fS = new double[]{(double) fasi[0] / SONNO_OBI, (double) fasi[1] / SONNO_OBI, (double) fasi[2] / SONNO_OBI}; colS = new int[]{PROFONDO, REM, LEGGERO}; }
        else { fS = new double[]{(double) min / SONNO_OBI}; colS = new int[]{PROFONDO}; }
        v.setImageViewBitmap(id(c, "id", "tms_w_sonno_b"), barra(barraW, barraH, fS, colS, min > 0));

        long t = d.optLong("t", 0);
        v.setTextViewText(id(c, "id", "tms_w_agg"), t > 0 ? L.optString("agg", "aggiornato alle") + " " + ora(t) : "TMS Scheda");
        v.setTextViewText(id(c, "id", "tms_w_titolo"), L.optString("oggi", "Oggi"));

        /* tocco: l'app, sulla Salute */
        Intent apri = new Intent(c, MainActivity.class).setAction(AZIONE);
        apri.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_NEW_TASK);
        int pf = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        v.setOnClickPendingIntent(id(c, "id", "tms_w_radice"), PendingIntent.getActivity(c, 11, apri, pf));
        v.setViewVisibility(id(c, "id", "tms_w_agg"), View.VISIBLE);
        return v;
    }

    /* una fascia: fondo color carta, poi i pezzi (frazioni del traguardo) uno dopo l'altro, coi loro colori; oltre il
       traguardo la barra resta piena. Angoli tondi alle due estremità del pieno. */
    static Bitmap barra(int W, int H, double[] parti, int[] colori, boolean conDati) {
        Bitmap b = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888);
        Canvas k = new Canvas(b);
        Paint a = new Paint(Paint.ANTI_ALIAS_FLAG);
        float r = H / 2f;
        a.setColor(CARTA_3); k.drawRoundRect(new RectF(0, 0, W, H), r, r, a);
        if (!conDati) return b;
        double tot = 0; for (double x : parti) tot += Math.max(0, x);
        if (tot <= 0) return b;
        float pieno = (float) Math.max(H, W * Math.min(1, tot));
        double scala = tot > 1 ? 1 / tot : 1;
        /* il pieno con gli angoli tondi, tagliato a pezzi: ogni pezzo è un rettangolo dentro la forma tonda */
        int salva = k.save();
        android.graphics.Path forma = new android.graphics.Path();
        forma.addRoundRect(new RectF(0, 0, pieno, H), r, r, android.graphics.Path.Direction.CW);
        k.clipPath(forma);
        float x = 0;
        for (int i = 0; i < parti.length; i++) {
            if (!(parti[i] > 0)) continue;
            float w = (float) (W * parti[i] * scala);
            a.setColor(colori[Math.min(i, colori.length - 1)]);
            k.drawRect(x, 0, Math.min(pieno, x + w + 0.5f), H, a);
            x += w;
        }
        if (x < pieno) { a.setColor(colori[colori.length - 1]); k.drawRect(x, 0, pieno, H, a); }
        k.restoreToCount(salva);
        return b;
    }
}
