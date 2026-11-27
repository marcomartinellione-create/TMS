package com.trainingmonitorsystem.scheda;

/* ════ TMS Scheda (APK 1.10.0) — WIDGET DELLA GIORNATA sulla schermata Home ════
   27/11/2026, Marco: «creiamo un widget per il telefono dove sintetizza la giornata: battito, passi, calorie, sonno
   (pensavo un numero, punteggio, con attorno un cerchio che è il grafico a torta delle fasi)».
   · A sinistra l'ANELLO DEL SONNO: al centro il punteggio del bracciale della notte finita oggi, intorno le fasi
     (profondo, REM, leggero, sveglio) in proporzione, coi colori della Salute dell'app; sotto le ore dormite.
   · A destra il BATTITO (con l'ora della misura), i PASSI di oggi con la barretta dell'obiettivo (colori della Salute:
     arancio sotto il 70 %, ocra fino al 99 %, verde raggiunto) e le CALORIE di oggi (stima della pagina, kcalGiorno).
   I numeri li prepara la PAGINA (widgetAggiorna in web/index.html) e arrivano qui con TmsSeduta.widget (pagina dell'app)
   o TmsServizio.widget (pagina invisibile del servizio, ogni 30 minuti ad app chiusa); il servizio del «sempre
   collegato» aggiorna da sé il battito, al più una volta al minuto. Tutto resta sul telefono (SharedPreferences
   «tms_widget»). Passato il giorno, passi e calorie tornano «—» finché la pagina non manda quelli nuovi.
   Toccandolo si apre l'app sulla Salute (azione WIDGET: MainActivity → TmsSedutaPlugin.daWidget).
   Grafica: carta chiara, bordo a filo, caratteri serif per i numeri (l'app è sempre chiara, scelta di Marco).
   Layout e risorse li scrive scripts/patch-android.js (layout tms_widget, xml tms_widget_info, icone tms_w_*). */

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
import android.graphics.Typeface;
import android.os.Build;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.Locale;

public class TmsWidget extends AppWidgetProvider {

    static final String PREF = "tms_widget";
    static final String AZIONE = "com.trainingmonitorsystem.scheda.WIDGET";
    /* colori dell'app (web/index.html, :root e Salute) */
    static final int CARTA_3 = 0xFFEDE4D2, INK = 0xFF1C1208, INK_3 = 0xFF6B5A40, INK_4 = 0xFFA08D6E;
    static final int PROFONDO = 0xFF7A3EA8, REM = 0xFF9A6B08, LEGGERO = 0xFF2B7A9A, SVEGLIO = 0xFF991B1B;
    static final int OK = 0xFF2F7D4F, OCRA = 0xFF9A6B08, ACC = 0xFFB4470D;
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
            for (int id : ids) m.updateAppWidget(id, vista(c));
        } catch (Exception e) { }
    }

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) { try { m.updateAppWidget(id, vista(c)); } catch (Exception e) { } }
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

    static RemoteViews vista(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), id(c, "layout", "tms_widget"));
        JSONObject d = new JSONObject();
        try { d = new JSONObject(pref(c).getString("dati", "{}")); } catch (Exception e) { }
        JSONObject L = d.optJSONObject("L"); if (L == null) L = new JSONObject();
        boolean en = "steps".equals(L.optString("passi"));
        boolean diOggi = oggi().equals(d.optString("g"));

        /* battito: il più recente fra quello della pagina e quello del servizio */
        int bpm = d.optInt("bpm", 0); long bpmT = d.optLong("bpmT", 0);
        SharedPreferences p = pref(c);
        if (p.getLong("bpmT", 0) > bpmT) { bpm = p.getInt("bpm", 0); bpmT = p.getLong("bpmT", 0); }
        boolean bpmOk = bpm > 0 && System.currentTimeMillis() - bpmT < 12 * 3600000L;
        v.setTextViewText(id(c, "id", "tms_w_bpm"), bpmOk ? String.valueOf(bpm) : "—");
        v.setTextViewText(id(c, "id", "tms_w_bpm_u"), bpmOk ? "bpm · " + ora(bpmT) : "bpm");

        /* passi e barretta dell'obiettivo */
        long passi = diOggi && !d.isNull("passi") ? d.optLong("passi", -1) : -1;
        int obi = d.optInt("obi", 8000); if (obi < 1000) obi = 8000;
        v.setTextViewText(id(c, "id", "tms_w_passi"), passi >= 0 ? numero(passi, en) : "—");
        v.setTextViewText(id(c, "id", "tms_w_passi_u"), L.optString("di", "di") + " " + numero(obi, en));
        v.setImageViewBitmap(id(c, "id", "tms_w_barra"), barra(passi >= 0 ? (double) passi / obi : 0));

        /* calorie (stima) */
        long kcal = diOggi && !d.isNull("kcal") ? d.optLong("kcal", -1) : -1;
        v.setTextViewText(id(c, "id", "tms_w_kcal"), kcal >= 0 ? numero(kcal, en) : "—");
        v.setTextViewText(id(c, "id", "tms_w_kcal_u"), "kcal · " + L.optString("stima", "stima"));

        /* sonno: anello a torta delle fasi col punteggio al centro */
        JSONObject s = diOggi ? d.optJSONObject("sonno") : null;
        int[] fasi = new int[4]; int punt = -1, min = 0;
        if (s != null) {
            JSONArray f = s.optJSONArray("f");
            for (int i = 0; f != null && i < 4 && i < f.length(); i++) fasi[i] = Math.max(0, f.optInt(i, 0));
            punt = s.isNull("p") ? -1 : s.optInt("p", -1);
            min = s.optInt("min", 0);
        }
        String centro = punt >= 0 ? String.valueOf(punt) : (min > 0 ? (min / 60) + "h" : "—");
        v.setImageViewBitmap(id(c, "id", "tms_w_anello"), anello(fasi, centro));
        String sotto = L.optString("sonno", "sonno");
        if (min > 0) sotto += " · " + (min / 60) + " h " + String.format(Locale.ROOT, "%02d", min % 60);
        v.setTextViewText(id(c, "id", "tms_w_sonno"), sotto);

        long t = d.optLong("t", 0);
        v.setTextViewText(id(c, "id", "tms_w_agg"), t > 0 ? L.optString("agg", "aggiornato alle") + " " + ora(t) : "TMS Scheda");
        v.setViewVisibility(id(c, "id", "tms_w_agg"), View.VISIBLE);

        /* tocco: l'app, sulla Salute */
        Intent apri = new Intent(c, MainActivity.class).setAction(AZIONE);
        apri.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_NEW_TASK);
        int pf = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        v.setOnClickPendingIntent(id(c, "id", "tms_w_radice"), PendingIntent.getActivity(c, 11, apri, pf));
        return v;
    }

    /* l'anello: fondo color carta, le quattro fasi in proporzione (da mezzogiorno, in senso orario), il numero al centro */
    static Bitmap anello(int[] fasi, String centro) {
        final int L = 240; final float sp = 26f;
        Bitmap b = Bitmap.createBitmap(L, L, Bitmap.Config.ARGB_8888);
        Canvas k = new Canvas(b);
        RectF r = new RectF(sp / 2 + 4, sp / 2 + 4, L - sp / 2 - 4, L - sp / 2 - 4);
        Paint a = new Paint(Paint.ANTI_ALIAS_FLAG); a.setStyle(Paint.Style.STROKE); a.setStrokeWidth(sp); a.setStrokeCap(Paint.Cap.BUTT);
        a.setColor(CARTA_3); k.drawArc(r, 0, 360, false, a);
        int tot = 0; for (int x : fasi) tot += x;
        if (tot > 0) {
            int[] col = {PROFONDO, REM, LEGGERO, SVEGLIO};
            int n = 0; for (int x : fasi) if (x > 0) n++;
            float gap = n > 1 ? 2.5f : 0f, ang = -90f;
            for (int i = 0; i < 4; i++) {
                if (fasi[i] <= 0) continue;
                float g = 360f * fasi[i] / tot;
                a.setColor(col[i]);
                if (g - gap > 0.5f) k.drawArc(r, ang + gap / 2, g - gap, false, a);
                ang += g;
            }
        }
        Paint t = new Paint(Paint.ANTI_ALIAS_FLAG); t.setColor(INK); t.setTextAlign(Paint.Align.CENTER);
        t.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        t.setTextSize(centro.length() > 2 ? 64f : 78f);
        Paint.FontMetrics fm = t.getFontMetrics();
        k.drawText(centro, L / 2f, L / 2f - (fm.ascent + fm.descent) / 2f, t);
        return b;
    }

    /* la barretta dei passi: fondo color carta, pieno nei colori della Salute */
    static Bitmap barra(double f) {
        final int W = 400, H = 14;
        Bitmap b = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888);
        Canvas k = new Canvas(b);
        Paint a = new Paint(Paint.ANTI_ALIAS_FLAG);
        a.setColor(CARTA_3); k.drawRoundRect(new RectF(0, 0, W, H), H / 2f, H / 2f, a);
        double q = Math.max(0, Math.min(1, f));
        if (q > 0) {
            a.setColor(f >= 1 ? OK : f >= 0.7 ? OCRA : ACC);
            k.drawRoundRect(new RectF(0, 0, (float) Math.max(H, W * q), H), H / 2f, H / 2f, a);
        }
        return b;
    }
}
