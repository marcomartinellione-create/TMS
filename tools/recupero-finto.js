#!/usr/bin/env node
'use strict';
/*
 * recupero-finto.js — dati FINTI ma verosimili del bracciale (sonno e riassunti del giorno), SOLO
 * per la bozza della sezione Corpo › Recupero e per le prove. Mai nei dati veri, mai nell'HTML dell'app.
 *
 * Produce gli stessi oggetti che manderà l'app del telefono (eventi tms-sonno e tms-giorno, formati
 * in src/app/09e-recupero.js): {notti:[…], giorni:[…]}.
 *
 * Com'è fatto un cliente finto (valori scelti per sembrare veri, non presi da nessuno):
 *  - sonno 5,5–8,5 ore a letto, a cicli di ~90 minuti: il profondo sta nei primi cicli, il REM negli
 *    ultimi; qualche risveglio breve. In media profondo ~16 %, REM ~23 %, leggero ~55 %, sveglio ~5 %;
 *  - qualche notte storta (corta, con più risvegli) e due o tre sonnellini nel primo pomeriggio;
 *  - un CALO di quattro giorni che finisce una settimana prima dell'ultimo giorno (un raffreddore o un
 *    blocco di allenamento pesante): RMSSD giù di ~16 ms, battito a riposo su di ~5, pelle più calda,
 *    più stress, meno passi, sonno peggiore. Serve a vedere i valori uscire dal «solito» del cliente;
 *  - RMSSD 35–75 ms, FC a riposo 48–60, SpO2 93–99 %, stress 15–65, pelle ±0,6 °C dal solito,
 *    passi 3.000–15.000, respirazione 13–17 atti al minuto.
 * Con lo stesso seme esce sempre lo stesso cliente (le prove contano su questo).
 *
 * Uso:
 *   node tools/recupero-finto.js [--giorni 42] [--fine AAAA-MM-GG] [--seme 7] > recupero.json
 *   require('./tools/recupero-finto.js').generaRecuperoFinto({giorni, fine, seme})
 *   nel browser (anteprima): dopo averlo caricato c'è window.generaRecuperoFinto
 */
(function (radice) {
  /* numeri a caso ripetibili (mulberry32) */
  function caso(seme) {
    let a = (seme >>> 0) || 1;
    return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const due = n => String(n).padStart(2, '0');
  const dataStr = d => d.getUTCFullYear() + '-' + due(d.getUTCMonth() + 1) + '-' + due(d.getUTCDate());
  const giornoUTC = s => { const p = s.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); };
  const piuGiorni = (s, n) => { const d = giornoUTC(s); d.setUTCDate(d.getUTCDate() + n); return dataStr(d); };
  /* ora locale 'AAAA-MM-GGTHH:MM' di un Date; `orologio(s, min)` = l'ora che segna l'orologio `min` minuti dopo
     la mezzanotte del giorno `s` (anche prima o il giorno dopo). La fine della notte si conta invece in minuti
     davvero passati dall'inizio: la notte del cambio d'ora dura un'ora in più o in meno, come col bracciale. */
  const locStr = d => d.getFullYear() + '-' + due(d.getMonth() + 1) + '-' + due(d.getDate()) + 'T' + due(d.getHours()) + ':' + due(d.getMinutes());
  const orologio = (s, min) => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2], 0, min); };
  const oggi = () => { const d = new Date(); return d.getFullYear() + '-' + due(d.getMonth() + 1) + '-' + due(d.getDate()); };
  const lim = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;

  function generaRecuperoFinto(o) {
    o = o || {};
    const nG = Math.max(7, Math.min(120, +o.giorni || 42));
    const fine = /^\d{4}-\d{2}-\d{2}$/.test(String(o.fine || '')) ? o.fine : oggi();
    const R = caso(o.seme == null ? 7 : +o.seme);
    const tra = (a, b) => a + (b - a) * R();
    const gauss = () => { let s = 0; for (let i = 0; i < 6; i++) s += R(); return (s - 3) / Math.sqrt(0.5); };   /* ~N(0,1) */
    const notti = [], giorni = [];
    /* il calo: 4 giorni che finiscono 7 giorni prima dell'ultimo (indici dal primo giorno) */
    const caloDa = nG - 11, caloA = nG - 8;
    /* notti storte e sonnellini in giorni fissi per il seme, lontani dal calo */
    const scegli = (k, esclusi) => { const s = new Set(); let g = 0;
      while (s.size < k && g++ < 500) { const i = 2 + Math.floor(R() * (nG - 3)); if (!esclusi(i)) s.add(i); } return s; };
    const storte = scegli(3, i => i >= caloDa - 1 && i <= caloA + 1);
    const pisolini = scegli(3, i => storte.has(i));
    let hrvBase = 56, batteria = 88;

    for (let i = 0; i < nG; i++) {
      const data = piuGiorni(fine, i - (nG - 1));            /* giorno del risveglio */
      const dow = giornoUTC(data).getUTCDay();                 /* 0 = domenica */
      const weekend = dow === 0 || dow === 6;                  /* risveglio di sabato o domenica: venerdì e sabato sera si fa tardi */
      const calo = i >= caloDa && i <= caloA ? Math.sin(Math.PI * (i - caloDa + 1) / (caloA - caloDa + 2)) : 0;   /* 0 → 1 → 0 */
      const storta = storte.has(i);

      /* ── la notte ── */
      const coricarsi = (22 * 60 + 40) + tra(0, 90) + (weekend ? 40 : 0) + (storta ? 35 : 0) + calo * 20;   /* minuti dalla mezzanotte del giorno prima */
      let aLetto = storta ? tra(330, 370) : weekend ? tra(440, 510) : tra(395, 480);
      aLetto -= calo * 45;
      aLetto = Math.round(lim(aLetto, 330, 510));
      const inizioMin = Math.round(coricarsi) - 1440;          /* rispetto alla mezzanotte del giorno del risveglio */
      const fasi = []; let tm = 0;
      const metti = (len, tipo) => { len = Math.round(Math.min(len, aLetto - tm)); if (len <= 0) return;
        const u = fasi[fasi.length - 1]; if (u && u[2] === tipo) u[1] += len; else fasi.push([tm, tm + len, tipo]); tm += len; };
      metti(tra(4, 14) + (storta ? 6 : 0) + calo * 10, 'sveglio');    /* per addormentarsi */
      const qualita = storta ? 0.6 : 1 - calo * 0.35;
      for (let c = 0; tm < aLetto && c < 12; c++) {
        const lung = tra(82, 104);
        const pProf = [0.36, 0.26, 0.13, 0.05, 0.04][Math.min(c, 4)] * qualita;
        const pRem = [0.12, 0.20, 0.27, 0.33, 0.35][Math.min(c, 4)];
        const leg = lung * (1 - pProf - pRem);
        metti(leg * 0.6, 'leggero'); metti(lung * pProf, 'profondo'); metti(leg * 0.4, 'leggero'); metti(lung * pRem, 'rem');
        if (R() < (storta ? 0.85 : 0.3 + calo * 0.4)) metti(storta ? tra(4, 15) : tra(1, 6), 'sveglio');
      }
      const min = { profondo: 0, leggero: 0, rem: 0, sveglio: 0 };
      fasi.forEach(f => { min[f[2]] += f[1] - f[0]; });
      const dorme = min.profondo + min.leggero + min.rem;
      const pSveglio = 100 * min.sveglio / aLetto, pProfondo = 100 * min.profondo / Math.max(1, dorme);
      const punteggio = Math.round(lim(84 + (dorme / 60 - 7) * 7 - (pSveglio - 4) * 1.5 + (pProfondo - 15) * 0.6 + gauss() * 3, 38, 97));
      const dInizio = orologio(data, inizioMin);
      const notte = { id: data, inizio: locStr(dInizio), fine: locStr(new Date(dInizio.getTime() + aLetto * 60000)), fasi: fasi, punteggio: punteggio };
      if (pisolini.has(i)) { const da = Math.round(tra(13 * 60 + 40, 15 * 60)); notte.sonnellini = [{ inizio: locStr(orologio(data, da)), fine: locStr(orologio(data, da + Math.round(tra(18, 42)))) }]; }

      /* ── il riassunto del giorno (i valori della notte vanno al giorno del risveglio) ── */
      hrvBase += (56 - hrvBase) * 0.25 + gauss() * 2.2;               /* oscilla piano intorno al suo solito */
      const rmssd = Math.round(lim(hrvBase + gauss() * 4.5 - calo * 17 - (storta ? 6 : 0), 35, 75));
      const fcRiposo = Math.round(lim(53 + gauss() * 1.4 + calo * 5.5 + (storta ? 2 : 0), 48, 60));
      const spo2Med = Math.round(lim(96.4 + gauss() * 0.8 - calo * 1.2, 93, 99));
      const spo2Min = Math.round(lim(spo2Med - tra(2, 5), 86, spo2Med - 1));
      const stressMed = Math.round(lim(29 + gauss() * 7 + calo * 22 + (storta ? 8 : 0), 15, 65));
      const stressMax = Math.round(lim(stressMed + tra(22, 38), stressMed + 5, 100));
      const tempPelle = r2(33.62 + gauss() * 0.16 + calo * 0.5);
      const resp = r1(lim(14.3 + gauss() * 0.35 + calo * 1.1, 12, 18));
      const passi = Math.round(lim(weekend ? tra(3000, 15000) : tra(6200, 11800) * (1 - calo * 0.45), 3000, 15000) / 10) * 10;
      batteria -= Math.round(tra(6, 9)); if (batteria < 12) batteria = 100;
      giorni.push({ data: data, passi: passi, fcRiposo: fcRiposo, rmssd: rmssd, sdnn: Math.round(rmssd * tra(1.15, 1.4)),
        spo2Min: spo2Min, spo2Med: spo2Med, stressMed: stressMed, stressMax: stressMax, tempPelle: tempPelle, resp: resp,
        pai: Math.round(lim(55 + gauss() * 18 - calo * 20, 20, 140)), batteria: batteria });
      notte.spo2 = spo2Med; notte.resp = resp; notte.hrv = rmssd;
      notti.push(notte);
    }
    return { notti: notti, giorni: giorni };
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = { generaRecuperoFinto: generaRecuperoFinto };
    if (require.main === module) {
      const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
      process.stdout.write(JSON.stringify(generaRecuperoFinto({ giorni: arg('giorni'), fine: arg('fine'), seme: arg('seme') }), null, 1) + '\n');
    }
  } else radice.generaRecuperoFinto = generaRecuperoFinto;
})(this);
