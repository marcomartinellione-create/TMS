# src/ — sorgente decomposto del TMS

L'app resta **un file HTML singolo**: `Training Monitor System.html` (e la sua copia
`electron/renderer/index.html`) sono **artefatti generati**. Da qui in poi si modifica
SOLO questo sorgente e si ricostruisce con la build.

```
npm run build      # riassembla e scrive i due artefatti (md5 sempre identici tra loro)
npm run verifica   # controlla che gli artefatti corrispondano al sorgente, senza scrivere
npm test           # controllo sintassi + suite jsdom (OBBLIGATORIA prima di ogni release)
```

## Come funziona

`manifest.json` elenca le parti **nell'ordine di concatenazione**. `tools/build.js` le
concatena byte per byte, senza alcuna trasformazione: il sorgente e l'artefatto sono
equivalenti per costruzione. Tutte le parti JS vivono nello **stesso scope** (un unico
`<script>`): l'ordine nel manifest è significativo, una funzione può essere usata da
qualunque parte successiva (e per hoisting anche precedente).

## Mappa delle parti

| Parte | Contenuto |
|---|---|
| `pagina/01-intestazione.html` | doctype, `<head>`, apertura `<style>` |
| `pagina/02-stili.css` | tutto il CSS (tema pergamena/ember, `data-theme="notte"`, stampa) |
| `pagina/03-corpo.html` | markup statico: hero, tab, overlay/gate, modal, disclaimer (i pannelli sono generati via JS) |
| `lib/html2canvas.min.js` | libreria terza, html2canvas 1.4.1 (MIT) — usata dal Report; NON modificare |
| `pagina/04-script-apertura.html` | chiusura script vendor + apertura script applicativo |
| `dati/01-intro.js` | `'use strict'` + `REF` (marker `/*__REF_JSON__*/`) |
| `dati/02-alimenti-usav.js` | `FOOD`: banca dati alimenti USAV (marker `/*__FOOD_JSON__*/`, ~580 KB) — **GENERATO** da `npm run alimenti` (tools/genera-alimenti.py ← `Doc/Banca_dati_svizzera_dei_valori_nutritivi.xlsx`); il JSON dedicato con metadati è `dati/alimenti-usav.json` |
| `dati/03-seed.js` | `SEED`: dati iniziali del profilo (marker `/*__SEED_JSON__*/`, ~200 KB) |
| `dati/04-riferimenti.js` | `DOC` = stato persistito, inizializzato dal SEED |
| `app/01-costanti.js` | `APP_VERSION`/`APP_DATE`/`RELEASE_NOTE` (bump SEMPRE insieme), costanti, lookup, util (`esc`, `fmt`…) |
| `app/02-calcoli.js` | 1RM, Training Load, ACWR, monotonia… (derivati: MAI salvati) |
| `app/03-persistenza.js` | FSA + IndexedDB, shim `localDirHandle()`/`window.tmsFS`, `connectFlow`, `persistAll`, migrazioni |
| `app/04-modal.js` | helper modale |
| `app/05-grafici.js` | grafici SVG, senza librerie |
| `app/06-allenamento.js` … `app/13-report.js` | un file per tab (render + handler) |
| `app/11b-analisi.js` | tab 📊 Analisi: periodi alimentari × carico/peso (timeline, scatter, lag, boxplot) |
| `app/14-backup.js` | esporta/importa backup JSON |
| `app/15-scambio.js` | scambio scheda trainer ↔ cliente (export HTML compilabile, import rientro) |
| `app/16-gate.js` | overlay di connessione cartella (solo browser) |
| `app/17-init.js` | tabs, `init()`, avvio |
| `pagina/99-coda.html` | chiusura script e documento |

## Regole

1. **Mai modificare gli artefatti a mano**: ogni modifica va fatta qui e ricostruita
   (`npm run verifica` deve risultare OK prima di un commit/release).
2. I marker `/*__REF_JSON__*/`, `/*__FOOD_JSON__*/`, `/*__SEED_JSON__*/` vanno
   conservati: identificano i blocchi dati rigenerabili. Il blocco FOOD non si modifica
   a mano: si rigenera dall'Excel USAV con `npm run alimenti` (poi `npm run build`).
   Semantica chiavi: `zuccheri` = carboidrati disponibili, `zucch` = di cui zuccheri;
   vit. A = RAE; `tr.`/`nd` → 0; `<X` → X.
3. Bump `APP_VERSION` + `RELEASE_NOTE` (in `app/01-costanti.js`) insieme ad ogni
   modifica, poi `npm run build` e `npm test`, e voce in `Changelog/CHANGELOG.md`.
4. I valori derivati (1RM, TL, ACWR…) non si salvano mai: si ricalcolano al volo.
