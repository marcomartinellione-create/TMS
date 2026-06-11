# CHANGELOG — TMS (Training Monitor System)
> Registro cronologico delle modifiche all'app TMS (`Io/TMS/Training Monitor System.html`) e ai suoi dati/sistemi.
> Spostato qui dal changelog generale del vault (`Claude/CHANGELOG.md`) il 2026-06-10. Voci più recenti in cima.

---

### 2026-06-11 — TMS v1.0.66: scambio scheda trainer ↔ cliente · sottocategorie a tendina · tab Profilo col nome attivo

**Tipo**: Feature ×3 (richieste esplicite di Marco)
**File coinvolti**: **src/app/15-scambio.js (NUOVO)** · src/app/{03-persistenza.js, 12-esercizi.js, 13-report.js, 17-init.js, 01-costanti.js} · src/manifest.json (27 parti) · src/README.md · tests/test-app.js · package.json ×2 (1.0.66)
**1 · Scambio scheda trainer ↔ cliente** (Profilo → sezione "Scheda ↔ cliente"):
- **📤 Esporta scheda per il cliente**: genera `Scheda_<profilo>_<data>.html` — pagina autonoma stile pergamena con la scheda settimanale per giorno (previsto in chiaro), **input compilabili** (serie/rip/peso/RIR/note per esercizio, fatica sRPE+durata per seduta; gli esercizi NON sono modificabili) e **video incorporati** col player a overlay (riuso `collectSchedaVideos`/`embedVideoFiles` del Report digitale, su conferma).
- Il cliente compila e preme **"📩 Crea il file per il trainer"** → scarica `Rientro_<slug>_<data>.json` (formato `tms-rientro` v1: profilo, date, righe, sedute).
- **📥 Importa allenamento dal cliente**: legge il rientro con **safe check**: file non valido → errore; **profilo non corrispondente** → conferma; **esercizi fuori catalogo** → conferma con elenco; modale con **data di registrazione** (→ settimana ISO via `isoWeek`/`schedaCode`); **settimana già popolata** → conferma "verranno AGGIUNTE" (stesso pattern di Registra seduta). Il merge (`applicaRientro`, pura e testabile) numera le sedute continuando da quelle esistenti, compila `macro` dal catalogo e registra le sedute sRPE in `storico_rpe`.
**2 · Sottocategorie a tendina** (tab Esercizi): le famiglie (Affondi, Allungamento, Panca…) sono ora **chiuse di default** con conteggio `(n)`; click su ▸/▾ apre/chiude; la **ricerca apre tutto** automaticamente.
**3 · Tab Profilo = nome del profilo attivo**: "👤 Wander" invece di "Profilo" (`aggiornaTabProfilo()`, aggiornato a connessione, cambio profilo, rinomina, avvio).
**Test**: `npm test` **66/66** — export HTML (input+meta), conversione data→settimana (11/06/2026=202624), `applicaRientro` (sedute numerate, macro, sRPE), **import e2e** (file → modale data → righe nella settimana scelta), file non valido senza crash, tendine chiuse/aperte, tab col nome del profilo.
**Approvato da**: Marco (richiesta esplicita, con invito a safe check)

### 2026-06-11 — TMS: DOI dei 12 paper di riferimento nel README (sezione "Crediti e fonti")

**Tipo**: Documentazione (solo README; nessuna modifica all'app)
**File coinvolti**: README.md
**Descrizione**: richiesto da Marco: tabella "Basi scientifiche dei calcoli" nel README con i 12 riferimenti peer-reviewed e relativi DOI (Scott 2016, Foster 2001, Zourdos 2016, Helms 2016, Schoenfeld 2010/2017, Hulin 2016, Gabbett 2016, González-Badillo 2010, Sánchez-Medina 2011, Weakley 2021, Plews 2013) — estratti dalla Guida §12 dell'app (DOI già verificati). Nota sul non ridistribuire i paper (link agli editori).
**Approvato da**: Marco (richiesta esplicita)

### 2026-06-11 — TMS v1.0.65: QR "Tutorial · YouTube" nel pannello contatti

**Tipo**: Feature (collegamento al canale YouTube dei tutorial)
**File coinvolti**: src/app/{01-costanti.js, 17-init.js} · tools/genera-qr.py (nuovo) · README.md · tests/test-app.js · package.json ×2 (1.0.65)
**Descrizione**: Marco ha creato il canale YouTube dei video tutorial (https://www.youtube.com/@TrainingMonitorSystem). Nel pannello che si apre cliccando il QR in alto a destra c'è ora un terzo riquadro **"Tutorial · YouTube"** (QR + bottone "Apri i Tutorial ↗"), accanto a Instagram e GitHub.
- Costanti `YT_URL` + `QR_YT_SRC`: con URL vuoto il riquadro resta nascosto (feature dormiente); il QR (370×370, base64) si genera/aggiorna con **`tools/genera-qr.py <url>`** (string-replace asserito sulle costanti). Layout del pannello ora a 3 colonne con `flex-wrap` (840px, degrada su schermi stretti).
- Link al canale anche nel README del repo.
**Test**: `npm test` **56/56** (nuova verifica: click sul QR → pannello con riquadro Tutorial, link corretto e bottone) · `npm run verifica` OK.
**Approvato da**: Marco (richiesta esplicita; URL fornito da lui)

### 2026-06-11 — TMS v1.0.64: download aggiornamenti visibile e protetto + download differenziali (blockmap)

**Tipo**: Miglioramento flusso auto-update (solo wrapper; HTML invariato salvo bump)
**File coinvolti**: electron/main.js · tools/release.js (blockmap negli allegati) · src/app/01-costanti.js (bump) · package.json ×2
**Descrizione**: segnalato da Marco testando 1.0.62→1.0.63: dopo "Scarica e installa" sembrava non succedere nulla (diagnosi: il download c'era — 39,8/89,7 MB nella cache updater — ma senza alcun feedback; chiudendo l'app a metà, l'aggiornamento non si completa mai).
- **Percentuale visibile**: durante il download il titolo della finestra mostra "scarico l'aggiornamento… N%" e la taskbar la barra di avanzamento (`setProgressBar`); nota anche nel dialogo di consenso.
- **Chiusura trattenuta**: se si prova a chiudere col download in corso, avviso con la percentuale e default "Continua il download" ("Chiudi comunque" resta possibile: mai intrappolare l'utente se un download si incaglia). A download finito, proposta di riavvio come prima.
- **Errori a video**: se il download fallisce, dialogo con il dettaglio tecnico e promemoria che riprende da dove si era fermato (solo per download avviati dall'utente; i controlli all'avvio offline restano silenziosi).
- **Log diagnostico**: eventi update (disponibile/avviato/scaricato/ERRORE) in `userData/TMS/update.log`.
- **Download differenziali**: `release.js` ora include `TMS-Setup-<v>.exe.blockmap` tra gli allegati (caricato a posteriori anche sulla v1.0.63 pubblicata): dal secondo auto-update in poi si scarica solo ciò che è cambiato, non ~90 MB.
**Test**: `node --check` su main.js OK · `npm test` 55/55 (HTML invariato salvo versione) · flusso dialoghi non testabile in jsdom → verifica nel collaudo reale 1.0.63→1.0.64.
**Approvato da**: Marco (richiesta esplicita)

### 2026-06-11 — TMS v1.0.63: fix "Nuovo profilo" muto su desktop (via prompt()) + sottocategorie nel catalogo Esercizi

**Tipo**: Bugfix (desktop) + Feature catalogo
**File coinvolti**: src/app/{04-modal.js, 13-report.js, 11-alimentazione.js, 03-persistenza.js, 12-esercizi.js, 01-costanti.js} · package.json ×2 (1.0.63) · tests/test-app.js
**Bugfix — segnalato da Marco**: il bottone "＋ Nuovo profilo" non rispondeva nell'app desktop. Causa: usava `window.prompt()`, che **Electron non supporta** (a differenza di alert/confirm): il click moriva in un'eccezione. Stessa sorte per "aggiungi pasto" e "rinomina pasto" (Alimentazione) e per `renameProfile`. Nuovo helper **`chiediTesto(titolo, valore, cb)`** in 04-modal.js (input nel modale pergamena, OK/Annulla, Invio conferma) e sostituiti TUTTI e 4 gli usi di `prompt()` — ora zero `prompt()` nel codice app.
**Feature — richiesta da Marco**: oltre al macro gruppo muscolare, il catalogo Esercizi raggruppa ora per **sottocategoria** (famiglia di movimento: tutti gli affondi insieme, tutta la panca insieme…).
- **`sottoOf(e)`**: override manuale (campo `sotto`, editabile da ✎ → "Sottocategoria") → 21 regole sul nome (Squat, Affondi, Stacco, Panca/Distensioni, Curl, Tricipiti, Trazioni, Rematore, Alzate, Core…) → fallback dalla `categoria` del database (stretching→Allungamento, pliometria/olimpici→Olimpici/Esplosivi, strongman, cardio) → "Varie". Copertura sul catalogo reale: **742/883 classificati (84%)**, 24 famiglie, 141 in Varie.
- Tab Esercizi: ordinamento macro → sottocategoria → nome con **intestazioni di sottocategoria** dentro ogni gruppo; la ricerca filtra anche per sottocategoria; nessun dato del catalogo modificato (derivazione a runtime: vale anche per i cataloghi già salvati dagli utenti).
**Test**: `npm test` **55/55** — regressione e2e "Nuovo profilo" (click → modale → conferma → profilo creato), derivazione sottocategorie su nomi reali, override manuale, fallback categoria, intestazioni renderizzate; verifica copertura standalone su tutti gli 883.
**Approvato da**: Marco (segnalazione + richiesta esplicita)

### 2026-06-10 — TMS v1.0.62: video personali (override dei video integrati, con toggle)

**Tipo**: Feature (tab Esercizi + player + Report digitale + shim persistenza)
**File coinvolti**: src/app/{12-esercizi.js, 13-report.js, 03-persistenza.js, 01-costanti.js} · package.json ×2 (1.0.62) · tests/test-app.js (T1c + origine https per localStorage)
**Descrizione**: richiesto da Marco: i video di base restano integrati, ma l'utente può caricare i propri e scegliere quale set usare.
- **Video personali in `TMS_Dati/video/`** (stesso nome file del catalogo): su desktop finiscono nei dati locali dell'utente (sopravvivono ad aggiornamenti e reinstallazioni; il seed integrato resta intatto), nel browser nella cartella collegata.
- **Caricamento dall'app**: ✎ esercizio → sezione "Video personale" → "⭱ Carica video personale…" (file picker; usa il nome del campo Video) con stato presente/assente e "✕ Rimuovi personale". Al primo caricamento proposta di attivare il toggle.
- **Toggle "Video personali"** nel tab Esercizi (persistito in `localStorage`, `tms-video-pers`): OFF = sempre i predefiniti integrati; ON = il personale dove esiste, **fallback automatico** al predefinito dove no.
- **Risoluzione centralizzata** (`videoSorgente`): vale per il player ▶ (Allenamento + Esercizi, badge "video personale" nel titolo) e per i video incorporati nel **Report digitale**.
- **Shim `localDirHandle` ora supporta la scrittura BINARIA** (`createWritable` accetta Blob/ArrayBuffer/TypedArray, concatena e passa `Uint8Array` al ponte; `fs.writeFile` di Node ignora l'encoding per i buffer — verificato standalone). Nessuna modifica a main.js/preload.js.
**Test**: `npm test` **48/48** — nuovo scenario T1c: toggle OFF→predefinito, upload binario via ponte (7 byte verificati intatti in `TMS_Dati/video/`), toggle ON→personale, fallback se personale assente, rimozione→ritorno al predefinito; suite jsdom ora con origine https (localStorage reale nei test). NB jsdom: riproduzione video reale non testabile → verifica in app.
**Approvato da**: Marco (richiesta esplicita)

### 2026-06-10 — TMS v1.0.61: profilo dimostrativo "Atleta Template" nel seed (con diario sedute durata+intensità)

**Tipo**: Dati seed (nessuna modifica al codice dell'app; HTML invariato salvo bump versione)
**File coinvolti**: TMS_Dati/template/{scheda,storico,corpo,alimentazione}.json (nuovi) · TMS_Dati/profili.json (lista: wander + template, attivo wander) · tools/genera-profilo-template.py (nuovo, rigenerabile) · tests/test-app.js (nuovo scenario T1b) · src/app/01-costanti.js (bump) · package.json ×2
**Descrizione**: richiesto da Marco: profilo template con dati simili ai suoi ma leggermente diversi, completo della parte durata/intensità delle sedute.
- **"Atleta Template"** (slug `template`): atleta fittizio M, 1998, 178 cm, ~74,5 kg — stessa struttura e stessi esercizi di Wander, carichi ~90% arrotondati al mezzo kg, note personali di setup rimosse, obiettivo dimostrativo compilato. 40 righe scheda · 896 righe storico (25 settimane) · 15 misure corpo (trend con BMI ricalcolato sull'altezza) · **125 voci `storico_rpe`** (durata in minuti + sRPE per OGNI seduta, 5/settimana, con 2 settimane di scarico) → Training Load, monotonia e ACWR popolati da subito · alimentazione su TUTTE e tre le fasi (bulk/mant/cut), solo alimenti verificati nella banca USAV; `useRpe`+`useRir` attivi, fase attiva `mant`.
- Generato da **`tools/genera-profilo-template.py`** (deterministico, rigenerabile); il profilo attivo del seed resta `wander`.
- **Test**: nuovo scenario **T1b** nella suite: avvio desktop sul SEED REALE (stub tmsFS precaricato con i file veri di TMS_Dati), profili registrati, `switchProfile("template")`, conteggi esatti (40/896/125), `useRpe`/altezza, 7 tab renderizzati sul profilo template → **`npm test` 40/40**.
**Approvato da**: Marco (richiesta esplicita)

### 2026-06-10 — TMS v1.0.60: aggiornamenti con consenso, anteprima novità e avviso "aggiornamento maggiore"

**Tipo**: Feature wrapper (flusso auto-update) + release di collaudo
**File coinvolti**: electron/main.js · src/app/01-costanti.js (bump) · package.json ×2 (1.0.60) · tools/release.js (pulizia dist pre-build)
**Novità del flusso di aggiornamento** (richiesto da Marco): `autoDownload` disattivato — quando c'è una release nuova l'app **chiede prima di scaricare**, mostrando un'**anteprima delle novità** (corpo della release GitHub, ripulito da markdown/HTML e troncato a ~900 caratteri). Se la versione sale nella cifra di mezzo o nella prima (es. **1.0.4 → 1.1.4**) il dialogo diventa un avviso di **AGGIORNAMENTO MAGGIORE** (icona warning). Confermato il download, a fine scaricamento resta la proposta di riavvio (o installazione alla chiusura). Logica `isMaggiore`/`anteprimaNote` verificata con test standalone (6 casi versione + markdown/HTML/troncamento). NB: il nuovo dialogo appare aggiornando DA 1.0.60 in poi; chi ha la 1.0.59 vede ancora il vecchio flusso per quell'unico passaggio.
**Descrizione**: richiesto da Marco: versione successiva alla 1.0.59 per verificare il flusso di auto-update dell'app installata (electron-updater + GitHub Releases). Nessuna modifica al codice: solo `APP_VERSION`/`RELEASE_NOTE`. Procedura di collaudo: installare la 1.0.59 in locale, pubblicare su GitHub SOLO la v1.0.60 (exe + latest.yml), riaprire l'app installata → deve scaricare l'aggiornamento e proporre il riavvio.
- **Fix pipeline**: il primo build NSIS è fallito ("no files found" su un video) per residui della build precedente in `electron/dist/`; `tools/release.js` ora svuota `dist/` prima di electron-builder. Con staging pulito il build riesce.
- **Scoperta durante la diagnosi**: dei 883 mp4 in `database/video/`, **882 sono copie byte-identiche dello stesso clip da 121 KB** (es. `3_4_Sit-Up.mp4`); l'unico video distinto è `Barbell_Bench_Press_-_Medium_Grip.mp4` (14 MB). **Chiarito da Marco: sono template intenzionali** — registrerà i video reali nel tempo, sostituendo i file a parità di nome (P12 nel report). Per questo l'exe pesa ~90 MB e non ~200: l'archivio solido comprime i duplicati.
**Test**: `npm run release` (build + sintassi + jsdom 29/29 + installer da staging pulito).
**Approvato da**: Marco (richiesta esplicita)

### 2026-06-10 — TMS: pipeline ufficiale banca dati alimenti (Excel USAV → JSON dedicato → blob FOOD) — dati e artefatti INVARIATI

**Tipo**: Infrastruttura dati (nessuna modifica funzionale; blob FOOD riprodotto byte per byte)
**File coinvolti**: tools/genera-alimenti.py (nuovo) · src/dati/alimenti-usav.json (nuovo, JSON dedicato con metadati) · package.json (`npm run alimenti`) · src/README.md
**Descrizione**: richiesto da Marco: estrarre i dati alimentari da `Doc/Banca_dati_svizzera_dei_valori_nutritivi.xlsx` per i calcoli dell'Alimentazione, con JSON dedicato. L'analisi ha dimostrato che il blob `FOOD` (1190 alimenti) proveniva già da quell'Excel ma senza alcuno strumento nel progetto: ora la pipeline è ufficiale e riproducibile.
- **`tools/genera-alimenti.py`** (`npm run alimenti`): legge il foglio "Alimenti generici" (header riga 3, triplette valore/deduzione/fonte), mappa 27 nutrienti per chiave (`zuccheri` = glucidi disponibili cioè CARBOIDRATI, `zucch` = di cui zuccheri; vit. A = colonna **RAE**, verificato su 763/764 casi discriminanti), converte i valori speciali con le regole storiche (`tr.`/`nd` → 0, `<X` → X, vuoto → null) e scrive sia il JSON dedicato sia il blob `/*__FOOD_JSON__*/`.
- **Prova di fedeltà**: il blob rigenerato è **byte-identico** (md5 9db4e9f9…) a quello in produzione → zero modifiche a dati, artefatti e versione. Il foglio "Prodotti di marca" (30 alimenti) resta escluso come da scelta storica.
- **Scoperta**: "Zwieback" è duplicato nella banca dati svizzera (2 righe: sinonimi "Fette biscottate integrali" vs "Fette biscottate"); nell'app `FOODBYNAME` tiene l'ultimo → proposta P11 nel report di revisione (disambiguare i nomi).
**Test**: generatore eseguito → blob INVARIATO · `npm run verifica` OK · `npm test` 29/29.
**Approvato da**: Marco (richiesta esplicita)

### 2026-06-10 — TMS v1.0.59: rimossi il bottone "Disconnetti" e il tab Dev

**Tipo**: Rimozione feature (richiesta esplicita)
**File coinvolti**: src/pagina/03-corpo.html · src/app/{01-costanti.js, 03-persistenza.js, 17-init.js} · src/app/15-dev.js (ELIMINATO) · src/manifest.json (26 parti) · package.json ×2 (1.0.59) · tests/test-app.js · CLAUDE.md · src/README.md
**Descrizione**: richiesto da Marco.
- **Disconnetti**: rimossi il bottone in alto a destra, `disconnectDirectory()` e ogni riferimento. Con l'avvio sempre sui dati locali (v1.0.56) la disconnessione non aveva più senso; "⛓ Connetti cartella" resta (collegamento per la sessione corrente e modalità browser).
- **Tab Dev** (diario/TODO interno, solo master): rimossi bottone tab, pannello, `renderDev`/`loadDev`/`persistDev`, l'array `DEV`, la costante `SHARE_ENABLED` e l'intera parte `src/app/15-dev.js`. Le note salvate restano in `localStorage` (`tms-dev`) ma non sono più lette: nessuna perdita, solo orfane.
**Test**: `npm test` **29/29** (nuove verifiche: bottone+funzione Disconnetti assenti, tab/pannello/funzioni/costante Dev assenti, navigazione 10 tab invariata, regressioni desktop/browser invariate) · sintassi OK · `npm run verifica` OK.
**Approvato da**: Marco (richiesta esplicita)

### 2026-06-10 — TMS v1.0.58: rimosso l'indicatore del percorso in alto a destra

**Tipo**: Pulizia UI (richiesta esplicita) — prima release costruita dal sorgente decomposto `src/`
**File coinvolti**: src/app/{03-persistenza.js, 01-costanti.js} → artefatti rigenerati con `npm run build` (md5 ab775b46…, identici tra loro) · package.json + electron/package.json (1.0.58) · tests/test-app.js (estesa)
**Descrizione**: richiesto da Marco: via la scritta "TMS (dati locali)/TMS_Dati · wander" in alto a destra (residuo del check percorso). Rimossa `connOnTxt()`; `setConn` ora **nasconde l'intero indicatore quando la connessione è riuscita** e lo mostra solo per gli stati utili: "connessione…", "errore: …", "errore scrittura", "non connesso", "permesso negato". I bottoni Connetti/Disconnetti restano invariati.
**Test**: `npm test` **28/28** (nuove verifiche: indicatore nascosto a connessione riuscita su desktop; visibile con "non connesso" nel gate browser) · sintassi OK · `npm run verifica` OK (artefatti = sorgente).
**Approvato da**: Marco (richiesta esplicita)

### 2026-06-10 — TMS: fix packaging — preload.js mancante dai "files" di electron-builder

**Tipo**: Bugfix packaging (solo installer; nessuna modifica all'HTML)
**File coinvolti**: electron/package.json
**Descrizione**: scoperto durante la revisione critica: `build.files` elencava solo `main.js, renderer/**, build/**` — **`preload.js` non veniva impacchettato** nell'app installata. Senza preload niente ponte `window.tmsFS` → nell'installer la modalità dati locali automatici non poteva attivarsi (l'app ricadeva sul flusso browser/FSA: plausibile concausa dei gate visti all'avvio). In sviluppo (`npm start`) il problema non si manifesta perché Electron legge i file dalla cartella. Aggiunto `"preload.js"` ai `files`. **Da verificare al prossimo `BUILD.bat`**: l'app installata deve partire direttamente sui dati locali.
**Test**: JSON valido; la verifica vera richiede il build NSIS (non testabile in jsdom).
**Approvato da**: Marco (rientra nella revisione richiesta)

### 2026-06-10 — TMS: sorgente decomposto in src/ + build riproducibile + suite test (HTML invariato) · scrittura atomica nel ponte desktop

**Tipo**: Infrastruttura / qualità (revisione critica completa; nessuna modifica funzionale)
**File coinvolti**: **src/** (nuova, 27 parti + manifest + README) · **tools/**{build.js, controlla-sintassi.js} (nuovi) · **tests/**test-app.js (nuova) · package.json + .gitignore (nuovi, root) · electron/main.js (scrittura atomica) · CLAUDE.md (workflow nuovo) · Doc/REVISIONE_CODICE_2026-06-10.md (nuovo report; in origine in Documentazione/, cartella poi rimossa dal progetto)
**Descrizione**: richiesto da Marco ("analizza tutto il codice e ottimizza, le funzionalità non devono cambiare").
- **Sorgente decomposto**: l'HTML monolitico (~1,2 MB = ~800 KB dati FOOD/SEED + ~199 KB html2canvas + ~177 KB codice in 18 sezioni) ora vive in `src/` (pagina/, lib/, dati/, app/ — un file per sezione, righe normali). `tools/build.js` concatena byte per byte secondo `src/manifest.json` e scrive entrambi gli artefatti; `--verifica` controlla senza scrivere; avviso se le versioni (sorgente vs package.json) sono disallineate. **L'artefatto riassemblato è md5-identico (40888b96…) al v1.0.57 esistente: zero modifiche funzionali per costruzione, APP_VERSION invariata.**
- **Test formalizzati**: `tests/test-app.js` (jsdom, 26 verifiche su 5 scenari desktop/browser, versione letta dal sorgente) + `tools/controlla-sintassi.js`; `npm run build / verifica / test` dalla root.
- **Scrittura atomica** in `electron/main.js` (`tmsfs:writeFile`): temp + rename (semantica verificata su Windows) con fallback diretto — un crash a metà scrittura non può più corrompere i JSON dei dati. Unica modifica di codice attivo; solo wrapper, entrerà nel prossimo installer.
- **Revisione critica completa** in `Doc/REVISIONE_CODICE_2026-06-10.md`: punti di forza, 10 proposte prioritizzate in attesa di approvazione (tra cui: `renameProfile` codice morto vs Guida che promette la rinomina; `REF.esercizi` vuoto = fallback catalogo inerte; `checkUpdate` legacy; git init).
**Test**: build `--verifica` OK su entrambi gli artefatti (md5 invariato) · `npm test` 26/26 + sintassi OK · `node --check` su main.js OK · semantica temp+rename verificata standalone su Windows (rimpiazzo file esistente, nessun residuo).
**Approvato da**: Marco (richiesta esplicita)

### 2026-06-10 — TMS v1.0.57: rimosso il banner "Cartella inattesa" (check percorso dismesso)

**Tipo**: Rimozione feature (residuo della modalità cartella collegata)
**File coinvolti**: Training Monitor System.html · electron/renderer/index.html (copia, md5 verificato) · electron/package.json (version 1.0.57) · CLAUDE.md
**Descrizione**: segnalato da Marco: in modalità dati locali appariva il banner "⚠️ Cartella inattesa: hai collegato TMS (dati locali)…" — il check del nome cartella (`checkDir` vs `EXPECTED_DIR='TMS'`) era pensato per la modalità cartella collegata e in locale scattava sempre (lo shim si chiama "TMS (dati locali)"). Funzione dismessa: rimossa con tutti i riferimenti.
- Rimossi: funzioni `checkDir`/`showDirWarn`/`hideDirWarn`, div `#dir-warn` (testo + bottone "Ricollega"), blocco CSS `.dir-warn`, chiamata `checkDir(dirHandle)` in `connectFlow`, `hideDirWarn()` in `disconnectDirectory`, handler `dir-warn-fix` in `init`. `EXPECTED_DIR` **resta** (usata nei testi del gate di connessione browser; commento aggiornato).
- Bump `APP_VERSION` 1.0.57 + `RELEASE_NOTE`; allineato `electron/package.json`.
**Test**: `node --check` su script estratto OK · **jsdom 27/27** (stessa suite della v1.0.56 estesa): banner assente dal DOM, funzioni rimosse (`typeof === 'undefined'`), nessun riferimento residuo nel sorgente (assert Python), `connectFlow` e `disconnectDirectory` senza eccezioni, avvio desktop locale senza gate invariato, regressione gate browser (reconnect/first/unsupported) invariata, 10 tab ok. md5 root=renderer verificato.
**Approvato da**: Marco (richiesta esplicita)

### 2026-06-10 — TMS v1.0.56: avvio desktop sempre sui dati locali (rimosso il gate "Ricollega la cartella")

**Tipo**: Bugfix avvio / semplificazione modalità dati
**File coinvolti**: Training Monitor System.html · electron/renderer/index.html (copia, md5 verificato) · electron/package.json (version 1.0.56) · CLAUDE.md
**Descrizione**: segnalato da Marco: all'avvio dell'app desktop compariva il gate "Ricollega la cartella" — residuo della vecchia modalità "cartella collegata", ormai dismessa. Causa: in `init()` un handle FSA salvato in IndexedDB (collegamento cartella di versioni precedenti) aveva priorità sui dati locali; in Electron `requestPermission` senza gesto utente fallisce → gate, e il fallback `localDirHandle()` non scattava (era solo nel ramo "nessun handle salvato" e nel `catch`).
- **Fix in `init()`**: su desktop (`window.tmsFS` presente) l'avvio va **sempre** in modalità dati locali automatici (`localDirHandle('')` → `TMS_Dati`), senza alcun gate; un eventuale handle FSA residuo in IndexedDB viene ignorato e **rimosso** (`idbDel`). Il flusso FSA con riconnessione/gate resta **solo per il browser** (Chrome/Edge senza ponte). Nota: il collegamento manuale di una cartella dal Profilo resta possibile ma vale per la sessione corrente — al riavvio l'app desktop torna ai dati locali.
- Bump `APP_VERSION` 1.0.56 + `RELEASE_NOTE`; allineato `electron/package.json`; aggiornata la sezione architettura dati di CLAUDE.md.
**Test**: `node --check` su script estratto OK · **jsdom 24/24** (stub `tmsFS` + mock IndexedDB pre-popolato con handle stantio, `showDirectoryPicker` presente come in Electron): T1 bug-scenario → nessun gate, `dirHandle._local`, `requestPermission` del vecchio handle mai chiamata, handle rimosso da IndexedDB, persistAll via ponte (profili+esercizi JSON validi), 10 tab senza eccezioni · T2 desktop senza handle invariato · T3 browser FSA+handle → gate "Ricollega" invariato · T4 browser FSA senza handle → gate "Connetti" · T5 senza FSA/ponte → gate "non supportato". **Controprova**: stesso scenario T1 sull'HTML v1.0.55 originale riproduce il bug (gate "Ricollega la cartella" visibile). md5 root=renderer verificato.
**Approvato da**: Marco (richiesta esplicita di fix)

### 2026-06-10 — TMS v1.0.55: dati inclusi nell'app desktop (doppia modalità, niente cartella obbligatoria)

**Tipo**: Feature architetturale (Piano B HANDOFF §8) + distribuzione
**File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS/electron/{main.js, preload.js (nuovo), package.json, renderer/index.html} · Claude/TMS.md · Claude/INDEX.md
**Descrizione**: deciso da Marco: l'installer porta con sé **tutti i dati** (catalogo 883 + video 121 MB + TMS_Dati completo, ~200 MB) e l'app non richiede più di collegare una cartella.
- **Doppia modalità**: se una cartella è collegata (handle in IndexedDB) → File System Access come prima (Marco la usa con MEGA); altrimenti, su desktop, **dati locali automatici** senza gate. Nel browser senza FSA: gate invariato.
- **Ponte `window.tmsFS`** (preload + IPC, renderer sandboxato): exists/readFile/writeFile/mkdir/remove con percorsi relativi validati. **Scritture sempre in `userData/TMS`** (sopravvivono ad aggiornamenti/reinstallazioni); **letture overlay**: prima userData, poi il **seed di sola lettura** dell'installer (`resources/TMS` = TMS_Dati+database; in dev la cartella TMS reale). Niente copia al primo avvio.
- **Shim `localDirHandle()`** nell'HTML: imita l'interfaccia FSA usata dall'app (queryPermission/requestPermission/getDirectoryHandle/getFileHandle/getFile/createWritable/removeEntry) sopra il ponte → `connectFlow`, `readJson/writeJson`, `persistAll`, video e report **invariati**. Ritocchi: init (fallback locale al posto del gate), disconnectDirectory (su desktop torna ai dati locali con reload), pickDirectory (annullare il picker non blocca il gate in modalità locale).
- **Installer assistito**: NSIS `oneClick:false` + scelta del percorso di installazione (mostra dove installa, default `AppData\Local\Programs\Training Monitor System`); `extraResources` = TMS_Dati + database (escluso `exercises eng.zip`).
**Test**: `node --check` su script estratto, main.js, preload.js OK · **jsdom 23/23**: modalità locale con stub tmsFS (auto-connessione senza gate, dirHandle._local, catalogo dal seed, profilo wander, persistAll scrive via ponte, JSON validi) + regressione browser (senza ponte/FSA gate invariato, 9 tab ok, shim inerte). md5 vault=renderer verificato.
**Approvato da**: Marco

### 2026-06-10 — TMS v1.0.54: rimosso il Pacchetto condivisione + progetto Electron unito in Io/TMS/electron/

**Tipo**: Rimozione feature (distribuzione) + riorganizzazione cartelle
**File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS-Electron/ → **Io/TMS/electron/** (spostata) · Io/TMS/electron/{package.json, SYNC_HTML.bat, README.md, renderer/index.html} · Claude/TMS.md · Claude/INDEX.md
**Descrizione**: deciso da Marco: "d'ora in poi è un'app" — il Pacchetto condivisione non serve più, e senza di esso il progetto Electron può vivere dentro la cartella TMS.
- **HTML v1.0.54**: rimosso l'intero blocco "Pacchetto di condivisione" (~18 KB): funzioni `_crc32`, `zipStore`, `shareTemplate`, `cleanSource`, `addTmsTree`, `buildGitReadme`, `buildShareChangelog`, `makeSharePackage`; bottone "📦 Pacchetto condivisione" e sezione "▌ Condivisione" del tab Dev; handler `dev-share`; costanti `SHARE_HTML_NAME`, `SHARE_ZIP_NAME`, `RELEASE_LOG`. `SHARE_ENABLED` **resta** (gate del tab Dev). Aggiornati i testi: callout Dev, Guida (Doc/ non più "inclusa nel pacchetto"), commento RELEASE_NOTE. `checkUpdate`/`cmpVer` intatti (neutralizzati dal wrapper desktop).
- **Cartelle**: `Io/TMS-Electron/` spostata in `Io/TMS/electron/`; `SYNC_HTML.bat` aggiornato al nuovo percorso relativo; `renderer/index.html` = copia 1.0.54 (md5 verificato); `package.json` → 1.0.54; dist 1.0.53 (mai pubblicata) eliminata. Esclusioni MEGA da aggiornare: `Io/TMS/electron/node_modules/` e `dist/`.
**Test**: `node --check` sullo script estratto OK + **jsdom 26/26**: caricamento senza errori, APP_VERSION/RELEASE_NOTE nuove, funzioni e costanti share assenti, `SHARE_ENABLED`/tab Dev presenti e renderizzati senza errori, bottone pacchetto assente, diario Dev intatto, `checkUpdate`+`cmpVer` presenti, showTab su tutti i 9 tab senza eccezioni.
**Approvato da**: Marco

### 2026-06-10 — TMS Desktop: app Electron con installer auto-aggiornante (canale HTML dismesso)

**Tipo**: Infrastruttura / Distribuzione (nessuna modifica all'HTML dell'app)
**File coinvolti**: Io/TMS-Electron/ (nuovo progetto: main.js, package.json, renderer/index.html = copia v1.0.53, build/icon.ico, SYNC_HTML/START/BUILD.bat, README.md) · Io/TMS/version.json e README.md → spostati in zzz_superati/ · Claude/TMS.md · Claude/INDEX.md
**Descrizione**: il TMS diventa un'**app desktop Windows**.
- **Wrapper Electron**: l'HTML (copia identica, md5 verificato) è servito dallo scheme privilegiato sicuro `app://tms` → File System Access API attiva e origine stabile; renderer sandboxato (contextIsolation, no nodeIntegration). Permesso `fileSystem` auto-concesso alla sola origine app://tms → **riconnessione automatica** alla cartella come nel browser (Electron non ha la UI permessi di Chrome, senza handler l'app si fermava al gate ad ogni avvio).
- **Aggiornamenti**: installer NSIS 1-click (`TMS-Setup-<v>.exe`) + electron-updater su **GitHub Releases** (tag `v<versione>`, allegare exe + `latest.yml`); il vecchio banner `checkUpdate()` è neutralizzato dal wrapper bloccando il fetch di `version.json` (HTML intatto). Deciso in corso d'opera: si parte dal target portatile dell'handoff → **installer auto-aggiornante**, **canale unico desktop** (HTML/Pacchetto condivisione dismessi come flusso di distribuzione).
- **Pulizia**: `version.json`+`README.md` (mirror del canale HTML) da Io/TMS/ a `zzz_superati/`; dist/ portatile eliminata; HANDOFF.md marcato storico; da escludere `node_modules/`+`dist/` dalla sync MEGA (azione manuale Marco).
**Test**: npm start su PC Marco — gate connessione, collegamento cartella TMS, catalogo 883, salvataggio storico, video, Report PDF e digitale: **OK**. Riconnessione automatica: fix applicato, conferma test al riavvio successivo. Installer: build in corso al momento della voce. Sintassi main.js/package.json verificate.
**Approvato da**: Marco

### 2026-06-10 — TMS v1.0.53: pacchetto condivisione completo + rimossa la modalità "in locale"

**Tipo**: Feature (distribuzione) + UX
**File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS/version.json · Claude/CHANGELOG.md
**Descrizione**: due modifiche.
- **Pacchetto condivisione**: l'HTML non è più un file sciolto nel `<versione>.zip` esterno (sta già dentro `TMS.zip`). `TMS.zip` ora è costruito da `addTmsTree()` che zippa **l'intera cartella TMS dal disco** — app "pulita" (`cleanSource`) + dati reali + `database/` (json + video) — **escludendo** `Documentazione/`, `zzz_superati/` e `database/exercises eng.zip`. Alert riscritto.
- **Rimossa la modalità "in locale"**: tolto il pulsante "Continua in locale" dal gate, eliminata la funzione `useLocal()` e il suo handler, ripulito `gateShow` (niente più `skip`); i browser senza File System Access (Firefox/Safari) ora si fermano con messaggio (niente fallback). La copia distribuita non incorpora più il catalogo (`shareTemplate` → `ref.esercizi:[]`): richiede comunque la cartella, da cui carica `esercizi.json`. Testi di Guida, LEGGIMI e README aggiornati ("collegare la cartella è obbligatorio"). Resta solo qualche regola CSS inerte `.overlay__skip`.
**Nota operativa**: durante la sessione il file nel vault era stato modificato a mano (percorso video → `database/video`); le patch sono state applicate **direttamente sul file aggiornato** per non perdere quella modifica (il walk del pacchetto include comunque `database/video`). **Test jsdom NON eseguito**: il sandbox era irraggiungibile (VM non avviata); modifiche applicate su esplicita richiesta di Marco con possibilità di rollback. Da rifare `node --check` + jsdom appena il sandbox torna.
**Approvato da**: Marco

### 2026-06-10 — TMS v1.0.52: catalogo esercizi unificato sul database (883) + migrazione storico

**Tipo**: Feature (architetturale) + Dati + Migrazione
**File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS/TMS_Dati/esercizi.json (rigenerato, backup `esercizi.pre-database.bak.json`) · Io/TMS/database/ (873 arricchiti + 10 custom) · Io/TMS/version.json · Claude/CHANGELOG.md
**Descrizione**: il catalogo esercizi non è più hardcoded nell'HTML: ora l'app si riferisce **solo al database** `Io/TMS/database/`.
- **Database arricchito**: ai 873 esercizi tradotti aggiunti i due dati che servono al motore: **`macro`** (gruppo: Gambe/Pettorali/Schiena/Spalle/Braccia/Core/**Cardio**) e **`fattore`** (peso Training Load, scala 0–1,05, assegnato a regole per meccanica/categoria/attrezzatura, ritoccabile a mano). `target` e `tipo` restano **derivati** (da muscoli_primari/secondari e meccanica/categoria), niente ridondanza.
- **Esercizi custom importati**: i 10 esercizi del vecchio catalogo usati nello storico ma assenti dal DB (Dragon Flag, Bayesian Cable Curl, z-twists, Affondi/Split squat, Alzate a Y, Dumbbell Jump Squat, French press, Lat Pull Over, Pull-up corda al cavo basso, Shrug) aggiunti al database (`CUSTOM_*.json`) coi loro metadati. Totale **883**.
- **Build**: `esercizi.json` (in `TMS_Dati/`) ora è **generato** dal database (script `outputs/build_esercizi.py`, ri-eseguibile); 883 voci, ~983 KB.
- **HTML**: svuotato `REF` (catalogo interno rimosso); aggiunto gruppo **Cardio** a `GRUPPI`; senza cartella collegata il catalogo è **vuoto con avviso**; `MAINLIFTS` rimappati ai nomi del database; nuova migrazione **`migrateExNames()`** che rinomina lo storico e la scheda ai nuovi nomi (mappa di 19 voci) con **backup** (`storico.backup.json`, ora include anche la scheda). I 4 nomi già coincidenti e i 10 custom restano invariati.
- **Dati reali (profilo Wander)**: 608 record di storico su 896 verranno rinominati alla prima apertura (backup automatico); scheda settimanale (40 righe) idem.
**Test**: `node --check` ok + **jsdom 18/18**: REF vuoto, GRUPPI con Cardio, MAINLIFTS rimappati, EX_RENAME 19 voci, catalogo 883 caricato, lookup+fattore main lift, gruppo Cardio nel catalogo, migrazione storico+scheda (rinomina, custom preservati, macro aggiornato), **idempotenza** (2ª esecuzione = 0 modifiche), render tab Esercizi mostra 883 + gruppo Cardio. Backup `esercizi.pre-database.bak.json` creato.
**Approvato da**: Marco

### 2026-06-09 — TMS v1.0.51: risolto bug riproduzione video

**Tipo**: UX / Fix **File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS/version.json · Claude/TMS.md **Descrizione**: quando si chiudeva il video dal player non smetteva di essere riprodotto in back ground, risolto

### 2026-06-09 — TMS v1.0.50: campo Note in Allenamento multiriga (textarea auto-espandibile)

**Tipo**: UX / Fix **File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS/version.json · Claude/TMS.md **Descrizione**: il campo Note nella tabella scheda (tab Allenamento) era un `<input>` a singola riga che troncava il testo se superava la larghezza. Sostituito con un `<textarea class="note-area">` che:

- **va a capo automaticamente** quando il testo supera la larghezza della cella;
- **si espande in altezza** per mostrare tutto il contenuto senza scrollbar (resize:none, overflow:hidden);
- al **caricamento** (`renderAllenamento`) inizializza l'altezza di tutte le note esistenti;
- durante la **digitazione** (listener `input` delegato sul panel) adatta l'altezza in tempo reale;
- lo stile eredita font e dimensione della tabella, `vertical-align:top` per allineamento corretto con le altre celle; le note vuote restano alte una riga come prima. Il salvataggio (delegation handler `oninput` → `e.target.value`) funziona identico a prima perché `<textarea>` espone lo stesso `.value`. **Test**: `node --check` ok + jsdom: 40 `.note-area` TEXTAREA trovate nella scheda seed (tra cui `"H 80 - S 50"`, `"3" discesa 1" fermo"`); tab Allenamento renderizza senza errori; sintassi JS ok. **Approvato da**: Marco

### 2026-06-08 — TMS v1.0.49: export "Report digitale" HTML mobile con video (Fase 2)
**Tipo**: Feature
**File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS/version.json · Claude/TMS.md
**Descrizione**: seconda parte della feature video. Nuovo bottone **📱 Report digitale** nel tab Report (accanto a "⬇ Scarica PDF", che resta) + checkbox **video** (default ON). Genera un file **HTML standalone, mobile-friendly**, da inviare al cliente e aprire sullo smartphone:
- responsive (`<meta viewport>`, container max 820px, `.cards` flex, tabelle `overflow-x:auto`, grafici SVG a larghezza piena, breakpoint ≤560px), **tema chiaro forzato** (`data-theme="giorno"`);
- contenuto = lo stesso del report (`.rep-doc`, sezioni rispettano i toggle), più una sezione **"▶ Video degli esercizi"** con un `<video controls playsinline>` per ogni esercizio della scheda che ha un video;
- **video incorporati come data-URI** (`FileReader.readAsDataURL` sui file di `TMS/Video/` via `dirHandle`) → un unico file autonomo che funziona **offline** sul telefono, niente dipendenze esterne;
- avviso se il file supera ~20 MB (i video pesano); se i video sono disattivati o la cartella non è collegata, genera il report senza video.
Funzioni: `collectSchedaVideos`, `embedVideoFiles`, `buildVideoSection`, `exportDigitalReport`. Il **PDF è invariato**.
**Decisione di design**: video locali e portatili (no hosting online); per il cliente il "collegamento" avviene incorporando i video nel file HTML (l'unica via realmente offline+smartphone). Limite noto: con molti video il file diventa grande per la chat — da valutare insieme ("vediamo come viene").
**Test**: `node --check` ok + jsdom (11): `buildVideoSection` (player+data-URI), `collectSchedaVideos`, bottone+checkbox presenti, export no-video → HTML standalone valido (DOCTYPE, viewport, tema giorno, contiene report e scheda), download `Report_*.html`. Verificato a parte che `FileReader.readAsDataURL` produce il data-URI.
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.48: video tutorial per esercizio (Fase 1 — riproduzione in-app)
**Tipo**: Feature
**File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS/version.json · Claude/TMS.md
**Descrizione**: prima parte della feature video (concordata: video locali e portatili in `TMS/Video/`).
- **Modello dati**: campo opzionale `video` (nome file) per esercizio nel catalogo `esercizi.json`; helper `videoOf(nome)` (lookup `ESBYNAME`). Retrocompatibile.
- **Editor**: nel modale di modifica esercizio nuovo campo "Video — nome file in TMS/Video/ (es. squat.mp4)"; salvato nel catalogo.
- **Box ▶**: gli esercizi con video mostrano un box play (classe `.vidbtn`) sia nella **lista Esercizi** sia nella **scheda** (Allenamento); chi non ha video non mostra nulla.
- **Player**: `playVideo(nome)` legge il file da `TMS/Video/<nome>` via il `dirHandle` (File System Access), crea un object URL e apre un modale con `<video controls autoplay playsinline>` (modale allargato a 760px). Revoca dell'URL precedente per evitare leak. Se la cartella non è collegata (modalità "in locale") avvisa.
- **Pacchetto condivisione**: inclusa anche la cartella `Video/` nello zip (come `Doc/`), così i video viaggiano con il pacchetto.
**Da fare lato utente**: creare la cartella `Video/` dentro `TMS/` e metterci i file; impostare il nome file nel catalogo esercizi.
**Prossima fase (Fase 2)**: export "Report digitale" HTML mobile-friendly con i video incorporati, accanto al PDF (PDF mantenuto).
**Test**: `node --check` ok + jsdom (10): `videoOf` vuoto/valorizzato, box ▶ in lista e scheda, campo `ex-video` nel modale + salvataggio, `playVideo` senza cartella → avviso, esercizio senza video → niente ▶.
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.47: link "📖 Completa" cliccabile nella Guida rapida
**Tipo**: UX (minore)
**File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS/version.json · Claude/TMS.md
**Descrizione**: nella Guida rapida le due menzioni testuali "**📖 Completa**" (callout introduttivo + "Vuoi sapere come si calcola tutto e come leggere ogni grafico?") ora sono **cliccabili** e aprono la **Guida completa**. Implementazione pulita: sostituito `<b>📖 Completa</b>` con uno `<span data-gmode="completa">` stilizzato a link; l'handler già presente in `renderGuida` (`#panel-guida [data-gmode]` → `guidaMode=...; renderGuida(); scrollTo(0,0)`) lo aggancia in automatico, quindi nessun nuovo handler.
**Test**: `node --check` ok + jsdom (4): lo `span[data-gmode=completa]` è presente nei callout, il clic passa alla Guida completa (compare "Logica dei calcoli/Indicatori & formule"); changelog ≤10.
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.46: pulizia commenti interni (riferimenti ad altri progetti)
**Tipo**: Pulizia (commenti, nessun impatto funzionale)
**File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS/version.json · Claude/TMS.md
**Descrizione**: rimossi da **commenti** del sorgente i riferimenti ad altri progetti di Marco: "**SustEner**" e "**Mappa Lore**" (4 occorrenze in tutto, tutte in commenti CSS/HTML/JS — header dello `<style>` + le 3 note "(stile Mappa Lore)" sul gate di connessione). Verificato il contesto: erano solo attribuzioni di stile, zero codice funzionale. Le altre occorrenze di "lore" sono parole legittime ("valore", "Florentin") e restano intatte. Lasciato "Elden Ring" (tema reale dell'app, non richiesto).
**Nota operativa**: durante la sessione Marco aveva eliminato per errore l'HTML; ripristinato dalla copia di lavoro (v1.0.45→46). Il mount MEGA ha avuto un quirk di sync (file lockato/stale, versione vecchia ~1.0MB transitoria); risolto sovrascrivendo il canonico una volta liberato il lock. Rimasta una copia duplicata `Training Monitor System (v1.0.46).html` che il mount non lascia eliminare via bash → da cancellare a mano.
**Test**: `node --check` ok + jsdom (7): boot, tutti i tab renderizzano, changelog ≤10; 0 occorrenze SustEner/Mappa Lore, parole "valore"/"Florentin" intatte. Canonico verificato a 1.0.46 con html2canvas presente.
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.45: rifiniture Report PDF (scheda, grafici, asse tempo)
**Tipo**: Fix + miglioramenti (Report)
**File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS/version.json · Claude/TMS.md
**Descrizione**: tre richieste di Marco sul PDF del Report:
1. **Scheda che ripeteva l'intestazione** quando andava a capo (anche orfana a metà pagina, es. prima di "Dragon Flag"): ora la tabella scheda ha `table-layout:fixed` + `<colgroup>` (colonne sempre allineate) e `splitTable` la spezza **per giorno** (non più a blocchi ciechi di 22 righe) mettendo l'**intestazione colonne solo sul primo blocco**. I separatori di giorno fanno da contesto sulle pagine successive.
2. **Grafici "Equilibrio volume" (radar) e "Serie per gruppo" (barre)**: nomi dei gruppi muscolari **completi** (Gambe, Pettorali, Schiena, Spalle, Braccia, Core) invece delle sigle a 4 lettere.
3. **Asse X temporale**: invece del codice grezzo (es. "2619") ora mostra la **data del lunedì della settimana** in `gg/mm/aa` (helper `schedaLabel`/`isoWeekMonday`), anno civile reale. Applicato a tutti gli assi (Progressi, Corpo, Report).
**Test**: `node --check` ok + jsdom (11): `schedaLabel` combacia con `date.fromisocalendar` di Python (04/05/26, 29/12/25, 03/11/25); `splitTable` su tabella lunga con giorni → 1ª intestazione presente, successive assenti, `colgroup` e `table-layout:fixed` su tutti i blocchi; radar con nomi completi; assi con date. Pipeline PDF end-to-end ancora ok (10/10).
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.44: il Report genera un PDF A4 scaricabile (fuori dal motore di stampa)
**Tipo**: Feature (architetturale)
**File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS/version.json · Claude/TMS.md
**Descrizione**: cambio di paradigma sulla stampa. Invece di affidarsi a `window.print()` (Chrome tagliava), il bottone ora **genera e scarica un vero PDF A4**: l'impaginazione la decidiamo noi, quindi WYSIWYG e niente tagli. Pipeline (modulare, guidata dall'HTML del report → ogni modifica futura alle sezioni finisce nel PDF senza toccare l'export):
1. `buildReportUnits` costruisce le unità atomiche dal `.rep-doc` (titoli, tabelle spezzate a 22 righe, grafici interi);
2. impaginazione in uno `#pdf-stage` offscreen con pagine `.pg` A4 (misura px/mm con probe);
3. ogni pagina rasterizzata con **html2canvas 1.4.1** (incorporato inline, MIT, ~198KB) — tema chiaro forzato nel clone via `onclone` (niente flash anche in modalità notte), `scale:2`;
4. assemblatore PDF **scritto a mano** `imagesToPdf()`: ogni pagina = JPEG full-page (DCTDecode) in un PDF A4 multipagina (writer byte-accurato, nessuna libreria PDF esterna);
5. download `Report_<nome>.pdf`. Fallback a `window.print()` se html2canvas manca.
Aggiunto CSS `#pdf-stage`, bottone `#rep-pdf-btn` ("⬇ Scarica PDF (A4)") con stato "⏳ Genero PDF…". File app ~1.22MB (per l'inline di html2canvas — scelta condivisa: priorità a risultato e modularità).
**Test**: `imagesToPdf` validato in sandbox (pdfinfo: A4 2 pagine; pdfimages: JPEG RGB incorporati; render non vuoto). `node --check` ok + jsdom (10) con html2canvas stubbato: `printReport` impagina, chiama html2canvas (onclone→giorno), assembla un **PDF valido** (`%PDF-`, A4, 1 pagina via pdfinfo), scarica `Report_*.pdf`, pulisce lo stage. **NB**: la resa grafica reale di html2canvas è verificabile solo su Chrome vero (non in sandbox).
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.43: i due QR affiancati in orizzontale
**Tipo**: UI (minore)
**File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS/version.json · Claude/TMS.md
**Descrizione**: nel modale "By Wander" i due QR (Instagram + GitHub) ora sono **affiancati orizzontalmente** (`flex-wrap:nowrap`); il modale si allarga a `maxWidth 560px` per l'occasione (resettato da `closeModal`, che già azzera `maxWidth`). Immagini `max-width:40vw` per ridursi su schermi stretti restando in riga.
**Test**: `node --check` ok + jsdom — modale con 2 `<img>`, contenitore `nowrap`, `#modal` maxWidth 560px.
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.42: doppio QR (Instagram + GitHub) nel modale "By Wander"
**Tipo**: Feature (UI)
**File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS/version.json · Claude/TMS.md
**Descrizione**: cliccando il QR in alto, il modale ora mostra **due codici affiancati/impilati**: Instagram (come prima) e il **repo GitHub** `https://github.com/marcomartinellione-create/TMS`. Aggiunte costanti `QR_GH_SRC` (PNG del QR GitHub in **base64 inline**, generato con `qrcode` e verificato in decodifica → URL corretto, funziona offline) e `GH_REPO_URL`. Ogni QR ha etichetta e pulsante "Apri ↗". L'immagine Instagram resta la miniatura in topbar.
**Test**: `node --check` ok + jsdom (9) — il modale contiene 2 `<img>` QR (alt Instagram/GitHub), link al repo e a Instagram corretti, QR GitHub è `data:image/png;base64` inline; changelog coerente. QR decodificato con OpenCV → `https://github.com/marcomartinellione-create/TMS`.
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.41: stampa Report con impaginazione A4 custom (iframe)
**Tipo**: Refactor (stampa)
**File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS/version.json · Claude/TMS.md
**Descrizione**: la stampa nativa (1.0.40) lasciava a Chrome il taglio delle pagine, non soddisfacente. Reintrodotta un'**impaginazione custom controllata**, ma corretti i due bug che la rompevano in passato: (1) le altezze venivano misurate **prima** che font/SVG fossero renderizzati → ora si misura dentro `document.fonts.ready` + doppio `requestAnimationFrame`; (2) si assumeva 3.78 px/mm → ora si misura la **scala reale** con un probe alto 100mm. Render in un **iframe nascosto** (niente più permesso pop-up, a differenza del vecchio `window.open`). Pagine `.pg` ad **altezza fissa 296mm** + `overflow:hidden` + `@page margin:0` → Chrome non può ri-tagliare; area utile 265mm con 4mm di sicurezza. Tabelle lunghe spezzate per righe intere (`splitTable`, 22 righe/blocco) con header ripetuto; grafici `max-height:200mm`; card mai a metà. Cleanup iframe su `onafterprint` (+ fallback 60s).
**Test**: `node --check` ok + jsdom (10) — `printReport` crea l'iframe nascosto, costruisce `≥1` pagina `.pg` con le unità (19 distribuite), invoca `win.print`, **nessun** `window.open`; `splitTable` reinserita; changelog coerente. **NB**: il layout di stampa NON è misurabile in jsdom (offsetHeight=0) → la verifica della resa va fatta nell'anteprima reale.
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.40: stampa Report con impaginazione nativa (fix pagine tagliate)
**Tipo**: Refactor (stampa) + Bugfix
**File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS/version.json · Claude/TMS.md
**Descrizione**: la stampa del Report tagliava le pagine perché `printReport()` apriva un **popup con impaginazione manuale in JS** che misurava l'altezza in px a schermo (`297mm×3.78×0.95`) e la confrontava con pagine `.pg` ad altezza fissa: la conversione px↔mm non coincide col rendering di stampa → disallineamento e tagli. Esisteva già un blocco `@media print` corretto (chrome nascosta, grafici impilati, `thead{display:table-header-group}`, righe/card/grafici interi, `@page A4 12mm`) ma **non veniva usato**. Ora `printReport()` fa solo **`window.print()`** e affida l'impaginazione al browser. Rimosse `splitTable()` e tutto il popup (`window.open`). Niente più permesso pop-up. Rinforzi alle regole: `.cards` divisibile **tra** le card ma `.card` mai a metà; `max-height:240mm` ai grafici; `orphans/widows:2`.
**Test**: `node --check` ok + jsdom (12) — `printReport` chiama `window.print` una volta e **nessun** `window.open`; `splitTable` rimossa; bottone cablato; report renderizza; controlli `no-print`; regole CSS presenti (card unspittabile, orphans, max-height, header ripetuti). **NB**: la verifica visiva dell'impaginazione va fatta nell'anteprima di stampa reale (jsdom non fa layout di stampa).
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.39: rimossi i riferimenti residui "Erdtree"
**Tipo**: Pulizia (branding) + Refactor sicuro
**File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS/version.json · Claude/TMS.md
**Descrizione**: rimosse tutte le 12 occorrenze di "Erdtree", categorizzate e trattate per implicazione:
- **Cosmetiche (4)** — `<title>`, footer, gate card, Guida: tolto "· Erdtree" / "— Erdtree Edition" (resta "by Wander"). Nessun impatto funzionale.
- **Valore tema (5)** — `data-theme="erdtree"` → **`giorno`** ovunque (default HTML, clone di stampa, default JS, toggle). **CSS-safe**: l'unico selettore a tema è `[data-theme="notte"]`, il chiaro è il fallback `:root`, quindi il valore del giorno è solo un'etichetta. Aggiunta micro-migrazione del valore salvato in `tms-theme` (`erdtree`→`giorno`).
- **Chiavi di storage (2)** — `IDB_NAME 'tms-erdtree'`→`'tms-store'`, `CACHE_KEY 'tms-erdtree-doc'`→`'tms-doc'`. Per non perdere dati né forzare riconnessioni: `loadCache()` fa fallback alla vecchia chiave localStorage e la migra; nuova `migrateLegacyStore()` copia l'handle cartella dal vecchio DB IndexedDB al nuovo (best-effort, try/catch). Restano nel sorgente 4 stringhe "erdtree" **solo** nel codice di migrazione (leggono i vecchi identificatori): non sono branding e vanno tenute.
**Test**: `node --check` ok + jsdom (8) — `title`/Guida/footer senza Erdtree; tema migrato `erdtree`→`giorno`; **cache legacy migrata** (`tms-doc` popolata, profilo di prova caricato); `RELEASE_NOTE` senza Erdtree. (Migrazione handle IndexedDB non testabile in jsdom — manca IDB —: best-effort, peggior caso = una riconnessione cartella, dati su disco salvi.)
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.38: CHANGELOG.md con storico delle ultime ~10 versioni
**Tipo**: Feature (distribuzione)
**File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS/version.json · Claude/TMS.md
**Descrizione**: il `CHANGELOG.md` generato nel pacchetto ora contiene lo **storico delle ultime ~10 versioni**, non solo quella corrente. Aggiunta costante **`RELEASE_LOG`** (array `{v,d,n}` delle versioni precedenti, seed 1.0.37→1.0.29); `buildShareChangelog()` compone `[corrente] + RELEASE_LOG` (dedup sulla corrente) e taglia a 10 voci, corrente in cima. **Manutenzione**: a ogni bump si aggiunge in cima a `RELEASE_LOG` la versione precedente e si taglia in fondo. Aggiornato il mirror `Io/TMS/version.json` a 1.0.38.
**Nota update GitHub**: verificato che il `version.json` pubblicato sul repo era ancora **1.0.27** (con `url` segnaposto `UTENTE/REPO`) → nessuna copia poteva vedere aggiornamenti. Serve caricare su GitHub il `version.json` aggiornato (quello del pacchetto/mirror). Le copie pre-1.0.28 hanno `UPDATE_URL` vuoto e non controllano comunque.
**Test**: `node --check` ok + jsdom — `buildShareChangelog` produce 10 intestazioni `## vX`, corrente (1.0.38, nota dal prompt) in cima, voci storiche presenti fino a 1.0.29, nessun duplicato.
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.37: pacchetto condivisione come singolo `<versione>.zip`
**Tipo**: Modifica (distribuzione)
**File coinvolti**: Io/TMS/Training Monitor System.html · Claude/TMS.md
**Descrizione**: il Pacchetto condivisione ora scarica **un unico file `<versione>.zip`** (es. `1.0.37.zip`) invece di 5 download separati. Dentro lo zip i file hanno i **nomi fissi** (quelli da sovrascrivere su GitHub, **senza** riferimento alla versione nel nome): `Training Monitor System.html`, `version.json`, `README.md`, `CHANGELOG.md` e `TMS.zip` (pacchetto amici, annidato). Lo zip della release è costruito con `zipStore()` riusato (gestisce sia stringhe sia binario annidato). Alert riscritto di conseguenza.
**Test**: `node --check` ok + jsdom (intercettando il download): **un solo** download di nome `1.0.37.zip`, e lo zip contiene esattamente i 5 file ai nomi fissi, nessun nome con la versione.
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.36: fix render toggle nel modale Profilo
**Tipo**: Bugfix (UI)
**File coinvolti**: Io/TMS/Training Monitor System.html · Claude/TMS.md
**Descrizione**: i checkbox dei toggle ("Considera il RIR…", "Abilita il Session-RPE…") venivano allargati al **100%** dalla regola globale `.modal input,.modal select{width:100%}`, occupando l'intera riga e facendo **traboccare il testo** fuori dal modale (la v1.0.35 con flex aveva peggiorato l'effetto). Fix: `width:auto` sui checkbox del modale, sia via regola CSS dedicata (`.modal label.optchk input[type=checkbox]`) sia via **`style` inline** (che batte sempre il foglio CSS, a prescindere dalla specificità). Layout `optchk` confermato leggibile (font body, sentence case, `align-items:flex-start` + `<span>`).
**Test**: `node --check` ok + jsdom — checkbox presenti, `width:auto` inline su `m-userir`/`m-userpe`, dentro `label.optchk`, render senza eccezioni. (Verifica pixel non possibile in sandbox: nessun browser headless disponibile.)
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.35: pacchetto in cartella per versione + CHANGELOG.md + render toggle
**Tipo**: Feature + UI
**File coinvolti**: Io/TMS/Training Monitor System.html · Claude/TMS.md
**Descrizione**:
- **Render toggle Profilo**: i due checkbox del modale anagrafica ("Considera il RIR…", "Abilita il Session-RPE…") ereditavano lo stile `.field label` (maiuscolo, mono, 10.5px) e risultavano illeggibili/spezzati. Aggiunta classe **`.optchk`** che ripristina testo normale (font body, 13px, sentence case, niente letter-spacing); markup riscritto con `<span>` e `align-items:flex-start`.
- **Pacchetto condivisione**: i file generati vengono ora scaricati **dentro una cartella col numero di versione** (es. `1.0.35/`) anteponendo `APP_VERSION+'/'` al nome di ogni download (sottocartelle supportate da Chrome). Nomi file invariati → URL GitHub stabile.
- **Nuovo `CHANGELOG.md`** nel pacchetto (`buildShareChangelog()`): intestazione + `## v<versione> — <data>` + nota della release (la stessa del prompt/`version.json`). Quinto file della cartella.
- **Consistenza**: `corpo.json` del pacchetto amici e `getProfileData()` (lettura da disco) ora includono `storico_rpe`.
**Test**: `node --check` ok + jsdom — classe `optchk` nei toggle, `buildShareChangelog` contiene versione/nota e usa RELEASE_NOTE di default, checkbox presenti.
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.34: carico interno session-RPE (Foster 2001)
**Tipo**: Feature
**File coinvolti**: Io/TMS/Training Monitor System.html · Claude/TMS.md
**Descrizione**: implementata la **Fase 1.1** del piano (`ANALISI_E_PIANO.md`) — **session-RPE / carico interno** secondo Foster 2001.
- **Toggle Profilo** `dati_utente.useRpe` (gemello di `useRir`): opzionale, in `corpo.json`. Card nel Profilo + checkbox nel modale anagrafica.
- **Input per giorno**: nella riga "giorno" della scheda (tab Allenamento) compaiono, se il toggle è attivo, **RPE 0–10** della seduta intera + **durata (min)** + badge **carico = RPE×min (AU)**.
- **Bozza autosalvata**: i valori RPE/durata vivono in `scheda.json` (nuova chiave `scheda.rpe[modalità][giorno]`), persistono mentre lavori e si **azzerano al salvataggio della scheda nello Storico**; in quel momento il carico interno dei giorni allenati viene archiviato in `storico_rpe` (nuovo array in `corpo.json`).
- **Calcoli Foster**: `carico seduta = RPE×min`; settimanale = somma; **monotonia** = media7gg ÷ SD7gg (riposi inclusi, SD di popolazione); **strain** = settimanale × monotonia.
- **Grafici Progressi** (solo se toggle attivo): carico interno settimanale, monotonia (zona ≤2), strain, e confronto interno-vs-esterno a indice base 100. Callout di segnale se monotonia >2.
- **Guida**: nuova riga §5 (indicatori), voce §6.10 (formule + bozza/reset), 3 righe §7 (lettura grafici + segnale Foster). Foster già linkato in §12.
- DEV `d3` (Fase 1.1) → fatto.
**Test**: `node --check` ok + jsdom (20 verifiche): calcoli Foster (load/monotonia/strain), `dayLoad`, render Allenamento con input RPE, card/checkbox Profilo, **commit in storico_rpe + reset bozza** al salvataggio, `rpeByWeek`, sezione Progressi presente con toggle ON e **assente con toggle OFF** (regressione).
**Approvato da**: Marco

### 2026-06-08 — TMS: rimossi riferimenti residui a SustEner e "Mappa Lore"
**Tipo**: Pulizia (no bump versione)
**File coinvolti**: Io/TMS/Training Monitor System.html · Claude/TMS.md · memory tms-erdtree-app
**Descrizione**: rimossi i riferimenti residui a **SustEner** e **Mappa Lore** dal TMS. Erano solo in 4 commenti del codice (intestazione + 3 commenti gate/overlay), mai testo visibile all'utente; riformulati in modo neutro ("stile a manuale tecnico", "gate a tutto schermo"). Aggiornate anche le descrizioni in TMS.md e nella memoria. **NON toccati** (fuori scope e/o rischiosi): il tema `data-theme="erdtree"`, le diciture "Erdtree Edition", e le chiavi di storage `tms-erdtree`/`tms-erdtree-doc` (rinominarle cancellerebbe i dati esistenti). Verificato: zero residui SustEner/Mappa Lore, boot OK, 11 tab.
**Approvato da**: Marco

### 2026-06-08 — TMS: aggiornata lista miglioramenti (diario Dev) ai soli task aperti
**Tipo**: Manutenzione (interna, no bump versione)
**File coinvolti**: Io/TMS/Training Monitor System.html (array `DEV`)
**Descrizione**: ripulito il diario Dev tenendo solo i task non ancora fatti: (1) RIR avanzato target per fascia + segnalazione set [Helms2016]; (2) Session-RPE per giorno + monotonia/strain [Foster2001] — prossimo; (3) Volume landmarks [Schoenfeld2016]; (4) ACWR uncoupled + caveat [Impellizzeri2020]; (5) banner deload in Allenamento; (6) campo velocità VBT [Weakley2020]. Rimossi i completati (RIR effort-aware, e1RM multi-formula, fonti documentazione). Nessun bump versione (modifica interna master-only). NB: se in locale è già salvato `tms-dev`, ha la precedenza sul costante.
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.33: guida — Fattore TL come valore indicativo/individuale
**Tipo**: Documentazione
**File coinvolti**: Io/TMS/Training Monitor System.html (guida §5 e §6.4)
**Descrizione**: chiarito nella guida che il **Fattore** del TL è un valore **indicativo e soggettivo**, legato alla **fatica percepita** dell'esercizio, quindi **individuale** e tarabile nel catalogo. Nessun cambiamento di calcolo.
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.32: README distingue prima installazione (TMS.zip) vs aggiornamento (HTML)
**Tipo**: Documentazione
**File coinvolti**: Io/TMS/Training Monitor System.html (buildGitReadme) · Io/TMS/README.md · Io/TMS/version.json
**Descrizione**: sezione "Installazione e uso" del README riscritta: **prima installazione → scarica `TMS.zip`** (pacchetto completo con dati d'esempio e Doc); **aggiornamento → scarica solo `Training Monitor System.html`** e sostituisci. Aggiunti link relativi ai file del repo. `buildGitReadme()` rigenerato dal README aggiornato (versione tokenizzata su APP_VERSION). RELEASE_NOTE e version.json allineati.
**Test**: jsdom — buildGitReadme contiene v1.0.32, blocco "Prima installazione TMS.zip" e "Aggiornare HTML"; pacchetto genera i 4 file.
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.31: ZIP condivisione rinominato in `TMS.zip`
**Tipo**: Modifica minore
**File coinvolti**: Io/TMS/Training Monitor System.html · Claude/TMS.md
**Descrizione**: `SHARE_ZIP_NAME` da `TMS - condivisione.zip` a **`TMS.zip`**. Gli altri 3 file generati restano invariati. Doc allineata.
**Test**: jsdom — i 4 download sono `Training Monitor System.html`, `version.json`, `README.md`, `TMS.zip`.
**Approvato da**: Marco

### 2026-06-08 — Bootstrap: nuovo file `Claude/TMS.md` + INDEX aggiornato
**Tipo**: Documentazione
**File coinvolti**: Claude/TMS.md (nuovo) · Claude/INDEX.md
**Descrizione**: creato `TMS.md`, boot dedicato all'app TMS (il "punto 2" per i task TMS): cosa leggere in ordine, moduli, modello dati, costanti chiave, workflow patch/test-jsdom/deploy, regola bump `APP_VERSION`+`RELEASE_NOTE`, distribuzione GitHub, gotcha, stato attuale — self-contained per trasferire il contesto ad altre istanze Claude. `INDEX.md` aggiornato: riga mappa di lettura per TMS, tabella sistemi (HTML v1.0.30 attivo + xlsm archivio), file in cartella, snapshot ultima sessione, connessioni, data 2026-06-08.
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.30: fix sezione Dev vuota + nota release precompilata
**Tipo**: Bugfix + Feature
**File coinvolti**: Io/TMS/Training Monitor System.html
**Descrizione**:
- **Bugfix (regressione 1.0.29)**: la sezione **Dev** risultava vuota perché il refactor di `makeSharePackage` aveva inglobato e cancellato la dichiarazione `let DEV=[...]` (la regex di fine funzione era arrivata fino a `function loadDev`). `node --check` non l'aveva intercettato (errore solo a runtime: `DEV is not defined`). Array DEV ripristinato.
- **Feature**: la **nota** del `version.json` (mostrata nel banner aggiornamenti) è ora precompilata con una costante `RELEASE_NOTE` (mini-changelog della versione), proposta come default nel prompt e modificabile. Da aggiornare a ogni release insieme ad `APP_VERSION`.
**Test**: jsdom — Dev di nuovo popolato; prompt pacchetto precompilato con RELEASE_NOTE; version.json 1.0.30 con la nota corretta.
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.29: il "Pacchetto condivisione" pubblica anche per GitHub
**Tipo**: Feature
**File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS/version.json · Io/TMS/README.md
**Descrizione**: `makeSharePackage()` ora genera **4 file con nomi fissi** (così su GitHub si sovrascrivono senza cambiare URL): `Training Monitor System.html` (anche dentro lo ZIP), `version.json` (versione corrente + `url` download + **nota chiesta via prompt**, mostrata nel banner), `README.md` (generato da `buildGitReadme()`, allineato a `APP_VERSION`), e lo ZIP `TMS - condivisione.zip` per gli amici. Aggiunte costanti `REPO_DL_URL`, `SHARE_HTML_NAME`, `SHARE_ZIP_NAME`. Download multipli sfalsati + alert riepilogativo. Così il pulsante master diventa il "publish": carichi i 3 file su GitHub e invii lo ZIP.
**Test**: jsdom — 4 download con nomi corretti; version.json {version 1.0.29, nota dal prompt, url GitHub}; README generato (versione interpolata); ZIP ~1MB con HTML a nome fisso. node --check OK.
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.28: controllo aggiornamenti attivato (repo di Marco)
**Tipo**: Config
**File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS/version.json · Io/TMS/README.md
**Descrizione**: impostato `UPDATE_URL` sul repo reale `marcomartinellione-create/TMS` (raw version.json). Versione portata a 1.0.28; `version.json` aggiornato (version 1.0.28, `url` alla pagina di download GitHub del file). README aggiornato coi dati reali del repo. Da caricare su GitHub: l'HTML 1.0.28, version.json e README. NB: le copie già condivise (1.0.27 senza URL) non si auto-aggiornano; va ridistribuita una volta la 1.0.28 perché l'URL resti "baked-in".
**Approvato da**: Marco

### 2026-06-08 — TMS v1.0.27: controllo aggiornamenti in-app (GitHub raw)
**Tipo**: Feature
**File coinvolti**: Io/TMS/Training Monitor System.html · Io/TMS/version.json (template per GitHub)
**Descrizione**: aggiunto controllo aggiornamenti. Costante `UPDATE_URL` (URL raw di un `version.json` su GitHub; vuota = disattivato). All'avvio `checkUpdate()` fa fetch del JSON `{version,nota,url}`, confronta con `APP_VERSION` (`cmpVer`) e, se più recente, mostra un **banner** sotto la topbar con nota e link "⭳ Scarica vX" (a `url`). Banner ignorabile per versione (memorizzato in localStorage `tms-upd-dismiss`). Fallisce in silenzio se offline/non raggiungibile. Funziona anche da file locale perché i raw GitHub espongono CORS `*`. Creato `version.json` template (UTENTE/REPO da sostituire). `UPDATE_URL` lasciata vuota in attesa dell'URL del repo di Marco.
**Test**: jsdom (copia con URL valorizzato + fetch stubbato) — versione nuova → banner con testo e link; dismiss memorizzato e persistente; versione uguale/vecchia → nessun banner; offline → nessun errore. node --check OK.
**Approvato da**: Marco

### 2026-06-07 — TMS v1.0.26: calendario settimanale nel salvataggio scheda
**Tipo**: Feature
**File coinvolti**: Io/TMS/Training Monitor System.html
**Descrizione**: nel modale "💾 Salva scheda nello Storico" aggiunto un selettore **settimana a calendario** (`<input type="week">`) sincronizzato bidirezionalmente con i campi Anno/Settimana ISO, con anteprima live del codice scheda. La logica di salvataggio resta su Anno/Settimana (validati), quindi nessun rischio di regressione; il calendario è solo un modo più comodo per scegliere la settimana.
**Test**: jsdom — default settimana corrente (2026-W23 → 202623); cambiando il calendario si aggiornano anno/sett/codice e viceversa; salvataggio su codice scelto OK.
**Approvato da**: Marco

### 2026-06-07 — TMS v1.0.25: Backup/Ripristina di nuovo nel Profilo
**Tipo**: Refactor (UI)
**File coinvolti**: Io/TMS/Training Monitor System.html
**Descrizione**: spostati **⭳ Backup dati** e **⭱ Ripristina** dal tab Dev al **Profilo** (in fondo alla lista), perché servono anche agli utenti dei pacchetti condivisi mentre Dev è visibile solo al master. In Dev resta solo il **📦 Pacchetto condivisione** (sezione "Condivisione"). Rimossa la dicitura "Backup ed esportazione sono nel tab Dev" dal Profilo.
**Test**: jsdom — Profilo ha prof-backup/prof-restore; Dev non ha più backup/restore ma mantiene il pacchetto e il diario.
**Approvato da**: Marco

### 2026-06-07 — TMS v1.0.24: Profilo come lista espandibile + export spostato in Dev
**Tipo**: Refactor (UI)
**File coinvolti**: Io/TMS/Training Monitor System.html
**Descrizione**:
- Il tab Profilo è ora una **lista di profili**: di default ogni profilo mostra **solo il nome**; cliccandolo si apre a tendina coi **parametri impostati** (sesso, nascita/età, altezza, RIR, formula 1RM, fase alimentare). Azioni per profilo: **Attiva**, **✎ Modifica parametri** (apre il modale, attivando prima il profilo se serve), **✕ Elimina**. **＋ Nuovo profilo** in alto. I parametri dei profili non attivi sono letti via `getProfileData()` (lazy load all'espansione, cache `profParamCache`).
- Aggiunto **Fase alimentare** al modale di modifica (`m-fase`), così "Modifica parametri" copre anche la fase.
- **Box export spostato nel tab Dev** (Backup / Ripristina / Pacchetto condivisione), quindi master-only; rimosso dal Profilo. Dev ora ha sezioni "Esportazione & backup" e "Diario / TODO".
**Test**: jsdom — lista mostra solo nomi; espansione mostra i parametri (Brzycki/Cut/178); Modifica apre il modale con m-fase=cut; Dev contiene backup/ripristina/pacchetto; nessun pulsante export nel Profilo.
**Approvato da**: Marco

### 2026-06-07 — TMS v1.0.23: Profilo più pulito (gestione in sottomenu)
**Tipo**: Refactor (UI)
**File coinvolti**: Io/TMS/Training Monitor System.html
**Descrizione**: il tab Profilo ora mostra di default solo l'essenziale (profilo attivo, anagrafica, fase alimentare). La gestione (Nuovo profilo, Backup, Ripristina, Pacchetto condivisione, tabella profili con attiva/rinomina/elimina) è collassata dietro il toggle "▸ Gestione profili" (stato `profMgmt`, default chiuso). Rimosso un callout ridondante. Bugfix: aggiunto il null-guard mancante al handler `prof-new` (andava in errore quando il blocco è collassato, bloccando il toggle).
**Test**: jsdom — default collassato (gestione nascosta, anagrafica+fase visibili); toggle apre/chiude Nuovo/Backup/Pacchetto/tabella; nessun errore.
**Approvato da**: Marco

### 2026-06-07 — TMS v1.0.22: alimentazione a 3 fasi (Bulk/Mantenimento/Cut) con fase attiva dal Profilo
**Tipo**: Feature
**File coinvolti**: Io/TMS/Training Monitor System.html
**Descrizione**: l'alimentazione passa da Bulk/Cut a **tre fasi: Bulk, Mantenimento, Cut**. La fase attiva si sceglie nel **Profilo** (3 pulsanti) e in Alimentazione si vede **solo quella** (le altre restano salvate ma nascoste). Modifiche: modello dati `{bulk,mant,cut}` (default + normalizeAlim + applyProfileData/seed/share); helper `faseAlimActive()` e `FASE_LAB`; `dati_utente.faseAlim` (default bulk, persistito in corpo.json); renderAlimentazione mostra una sola tabella + indice OMS della fase attiva (rimosso il confronto Bulk vs Cut e il toggle OMS); selettore fase nel Profilo; Report "Quadro alimentare" ora riporta la fase attiva. Guida §8 e tabella sezioni aggiornate.
**Test**: jsdom — fase default Bulk mostrata da sola; click su Mantenimento nel Profilo → faseAlim='mant' e Alimentazione mostra solo Mantenimento (OMS incluso); confronto rimosso; applyProfileData crea l'array mant; Report riflette la fase attiva. node --check OK.
**Approvato da**: Marco

### 2026-06-07 — TMS v1.0.21: banca dati alimenti rigenerata (svizzera ufficiale) + valori OMS
**Tipo**: Bugfix + Feature (dati)
**File coinvolti**: Io/TMS/Training Monitor System.html · (fonte: Io/TMS/Doc/Banca_dati_svizzera_dei_valori_nutritivi.xlsx)
**Descrizione**:
- Banca dati alimenti **rigenerata dal file svizzero ufficiale** (USAV/FSVO) in `Doc/` → 1190 alimenti generici, valori per 100 g. Sostituisce l'array embedded.
- Corretti due **bug di estrazione** della versione precedente: il campo "Carboidrati" conteneva gli zuccheri (col44) invece dei glucidi disponibili (col41) — falsava pane/pasta (es. Pane alle noci 1,6 → 30,2 g); e il colesterolo era disallineato (es. Aceto balsamico 25,8 → 0; Acciuga 0,2 → 76 mg).
- Aggiunto campo **"di cui zuccheri"** (zuccheri totali, col44) ai nutrienti.
- **Indice OMS**: aggiunta riga **Zuccheri ≤10% E** (≈50 g/2000 kcal). Già presenti e coerenti con OMS: grassi ≤30% E, saturi ≤10% E, sale &lt;5 g (sodio &lt;2000 mg), carboidrati ~55% E, proteine 0,83 g/kg.
- **Guida §8**: credito fonte dati svizzera (richiesto dalla licenza, con link naehrwertdaten.ch), riepilogo valori OMS/FAO, nota su zuccheri totali come proxy e trans non calcolati, link OMS/FAO. Trans &lt;1% E indicato come soglia (non nel dataset). Aggiornato conteggio 1193→1190.
- Scelta utente: solo banca dati svizzera (la francese CIQUAL non inclusa).
- OMS: PDF non scaricabili con gli strumenti disponibili → inseriti i valori citati nel controllo + link alle pagine ufficiali nella guida.
**Test**: jsdom — FOOD 1190 con campi zuccheri(carbo)+zucch; Pane alle noci carbs 30,2; indice OMS mostra riga "Zuccheri (OMS)"; guida con link OMS/FAO e credito fonte; node --check OK.
**Approvato da**: Marco

### 2026-06-07 — TMS v1.0.20: §12 con DOI + Google Scholar per ogni paper
**Tipo**: Documentazione
**File coinvolti**: Io/TMS/Training Monitor System.html
**Descrizione**: la Guida §12 ora elenca, per ogni paper, un link **DOI** (doi.org) e un link **Google Scholar** (ricerca per titolo), oltre al PDF locale. DOI verificati via ricerca web. Scopo: rendere le fonti reperibili legalmente (open-access/preprint/accesso istituzionale) senza redistribuire i paper soggetti a copyright (che restano in `Documentazione/`, non condivisa). Aggiunta nota esplicativa e voce nel diario Dev (d8) che documenta la policy. NB: richiesta iniziale di un rimando a Sci-Hub declinata (facilita accesso non autorizzato a materiale protetto) e sostituita con questa soluzione legittima.
**Test**: jsdom — 12 link DOI + 12 Scholar + 13 PDF in §12; voce Dev d8 presente; nessun errore.
**Approvato da**: Marco

### 2026-06-07 — TMS v1.0.19: cartella Doc/ inclusa nel pacchetto di condivisione
**Tipo**: Feature
**File coinvolti**: Io/TMS/Training Monitor System.html
**Descrizione**: il pacchetto di condivisione (ZIP, solo master) ora include la cartella <span>Doc/</span> — documentazione liberamente condivisibile (es. linee guida OMS/FAO) — letta ricorsivamente dalla cartella connessa e zippata in binario (lo `zipStore` già supportava `Uint8Array`). La cartella `Documentazione/` (paper accademici con copyright) resta esclusa. Nuovo helper `addDirToZip()`. Aggiornati LEGGIMI.txt (voce cartella Doc/) e la Guida §12 (spiegazione delle due cartelle: Doc condivisa, Documentazione no).
**Test**: jsdom — stub di `dirHandle` con `Doc/` (file + sottocartella): il pacchetto include `Doc/OMS_linee_guida.pdf` e `Doc/sub/nota.txt` (ricorsione ok); le altre voci invariate.
**Approvato da**: Marco

### 2026-06-07 — TMS v1.0.18: audit completo compatibilità modalità notte
**Tipo**: Bugfix (tema scuro)
**File coinvolti**: Io/TMS/Training Monitor System.html
**Descrizione**: revisione di OGNI elemento per il tema notte. Corretti i casi di testo scuro su sfondo scuro:
- `--ember-2` era usato come colore-testo di titoli e valori (`.hero h1`, `.sec`, `.card__v`, `.pr-val`, `.cell-out`, `.chart-box h4`, titoli modali/overlay, e inline in Report/Guida/Profilo): restava scurissimo in notte → titoli/valori quasi invisibili. Reso chiaro in notte (`--ember-2:#efe6d4`); l'unico uso come sfondo (riga separatore-giorno) è stato fissato a dark esplicito.
- `.topbar` e `.btn--ghost`: testo `var(--paper)` → scuro su barra scura in notte. Override notte a colore chiaro.
- `thead th`: testo `var(--gold-t)` → scuro su header sempre-dark in notte. Override a oro chiaro.
- `.dir-warn`: rosso scuro hardcoded su sfondo danger scuro in notte → ora `var(--danger)`.
- Badge fascia (`.f-forza/.f-ipf/.f-iper/.f-res/.f-met`): in notte restavano chiari; aggiunti stili dedicati (fondo traslucido + testo chiaro), contrasto reale 6–8:1.
- 2 colori serie grafico (massa magra/musc.) da hex hardcoded a `var(--ok)`/`var(--orange)`.
**Test**: audit contrasto automatico (risolte le regole color+background reali; restanti = falsi positivi su alpha/override verificati a mano); jsdom: toggle notte + render di tutti i tab senza errori.
**Approvato da**: Marco

### 2026-06-07 — TMS v1.0.17: RIR ora effettivamente nei calcoli live
**Tipo**: Bugfix
**File coinvolti**: Io/TMS/Training Monitor System.html
**Descrizione**: il gestore `input` della scheda escludeva il campo `rir` sia dalla coercizione a numero sia dal `refreshSchedaCalc()`. Risultato: modificare il RIR non aggiornava 1RM/%1RM/TL (le funzioni `effRip`/`sRM`/`sPct`/`sTL` erano corrette ma non venivano richiamate, e il valore restava stringa). Aggiunto `'rir'` a entrambe le liste.
**Test**: jsdom — con toggle RIR attivo: RIR 0 → 1RM 126,7 / 78,9% ; RIR 3 → 1RM 136,7 / 73,2% ; valore salvato come number.
**Approvato da**: Marco

### 2026-06-07 — TMS v1.0.16: fix persistenza profilo + colonna RIR condizionale + guida "Logica dei calcoli"
**Tipo**: Bugfix + Feature + Documentazione
**File coinvolti**: Io/TMS/Training Monitor System.html
**Descrizione**:
- **Bugfix persistenza**: `persist()` ora accumula le chiavi in sospeso (`pendingSaves` Set + `flushSaves()`) invece di sovrascrivere il `saveTimer` con debounce condiviso. Prima, due `persist()` consecutivi (es. anagrafica: `corpo`+`profili`) facevano scrivere solo l'ultimo file → su cartella connessa il toggle RIR (e e1rm/sesso/altezza/nascita) non venivano mai salvati su disco e tornavano indietro al reload.
- **Colonna RIR condizionale**: se «RIR nei calcoli» è disattivo, la colonna RIR sparisce dalla tabella scheda (classe `hide-rir`/`rir-col` via CSS — celle mantenute in DOM per non rompere gli indici di `refreshSchedaCalc`).
- **Guida**: nuova sezione "▌ 6 · Logica dei calcoli (in dettaglio)" (1RM multi-formula, %1RM, RIR effort-aware, TL, ΔTL/seduta S2, stallo, ACWR, fasce, BMI/fabbisogno con esempi numerici) + nuova sezione "▌ 12 · Documentazione di riferimento (PDF)" con link relativi ai paper in `Documentazione/`. Rinumerate le sezioni (ora 13).
**Test**: node --check OK; jsdom OK (toggle salva in cache; tabella `hide-rir` on/off; guida 13 sezioni, link PDF e formule presenti).
**Approvato da**: Marco

---

## 2026-06-05 — Feature: TMS Erdtree — app HTML che sostituisce il Training Monitor System (Excel/VBA)

### 2026-06-07 — TMS: Fase 1.4 — e1RM multi-formula (v1.0.15)
**Tipo**: Feature
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**: `rm1` ora supporta **Epley (default), Brzycki, Lombardi, Media** delle tre, selezionabile per profilo (`dati_utente.e1rm`) dall'anagrafica; guard su Brzycki per rip≥37 (fallback Epley). La formula si propaga a 1RM/%1RM/TL (i record restano sul carico reale). Card "Formula 1RM" nel Profilo, nota in Guida. Report allineato (`sTL`/`sPct`). Verificato: Panca 8×100 → Epley 126,7/78,9% vs Brzycki 124,1/80,6%. Fase 1: fatte RIR (1.2) ed e1RM (1.4); saltate session-RPE (1.1, ridondante) e volume landmarks (1.3) su scelta di Marco. Versione → **1.0.15**.

### 2026-06-07 — TMS: Fase 1.2 — RIR nei calcoli con toggle profilo (v1.0.14)
**Tipo**: Feature
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**: integrazione **effort-aware del RIR** opzionale via toggle nelle impostazioni del profilo (anagrafica, accanto a sesso/nascita/altezza). Se attivo (`dati_utente.useRir`), le reps efficaci = rip + RIR → 1RM/%1RM/TL ricalcolati (`effRip`, `sRM`/`sPct`/`sTL` aggiornati; editor allenamento usa le funzioni per-riga). Retrocompatibile: RIR mancante = comportamento attuale. Esempio verificato: Panca 1×8×100 RIR2 → TL 600→570, %1RM 75%. Card "RIR nei calcoli" nel Profilo + nota in Guida. Versione → **1.0.14**.

### 2026-06-07 — TMS: stallo su TL, Wander nel pacchetto, sezione Dev, guida + analisi paper (v1.0.13)
**Tipo**: Feature/Documentazione
**File coinvolti**: `Io/TMS/Training Monitor System.html` · `Io/TMS/Documentazione/ANALISI_E_PIANO.md` (NUOVO)
**Descrizione**:
- **Stallo basato su TL**: `plateauList` ora usa il TL per scheda (carico+ripetizioni), non più solo il peso massimo (esclude i test). Testo segnale aggiornato.
- **Pacchetto con profilo d'esempio**: lo ZIP di condivisione include ora `TMS_Dati/profili.json`, `esercizi.json` e la cartella **`TMS_Dati/wander/`** (dati dimostrativi del profilo Wander) con nota nel LEGGIMI che è un esempio eliminabile; installazione README aggiornata (estrai lo ZIP nella cartella TMS).
- **Sezione Dev nascosta** (solo master, gated `SHARE_ENABLED`): tab 🛠 Dev con diario/TODO per priorità (aggiungi/priorità/fatto/elimina), salvato in localStorage, pre-popolato con la roadmap delle fasi. Nascosto e non incluso nei pacchetti condivisi (`cleanSource` forza il tab off).
- **Guida aggiornata**: RIR/RPE (riga indicatori), «ult:»/↧ Dalla scorsa, Backup/Ripristino, riga Segnali (record/stallo/deload), nelle viste Rapida e Completa.
- **Analisi scientifica**: nuovo `Documentazione/ANALISI_E_PIANO.md` — analisi dei 12 paper (validità, date, correzioni: ACWR contestato post-2016, Schoenfeld2016 aggiorna 2010, VBT hardware-dipendente) e piano a 3 fasi.
Versione → **1.0.13**. Test jsdom OK (Dev master/condivisa, ZIP con Wander, plateau TL, guida), 0 errori.

### 2026-06-07 — TMS: 5 migliorie prioritarie (v1.0.10)
**Tipo**: Feature
**File coinvolti**: `Io/TMS/Training Monitor System.html` · rif. `Io/TMS/Documentazione/zourdos2016.pdf`
**Descrizione**: implementati i 5 punti prioritari concordati.
1. **Ultima volta + precompila**: sotto ogni esercizio in scheda compare l'ultima registrazione (es. «ult: 80×8»); pulsante «↧ Dalla scorsa» precompila peso/rip/RIR dall'ultima volta (`lastPerf`, `prefillFromLast`).
2. **RIR per serie** (Zourdos 2016, RPE=10−RIR): nuova colonna RIR in scheda e Storico, salvata nei record.
3. **Backup / Ripristino**: in Profilo, esporta tutti i dati (profili+esercizi+per-profilo) in un JSON e reimporta (`backupData`/`restoreData`), folder o locale.
4. **Feedback azionabile**: notifica «🎉 Nuovo record» al salvataggio; sezione **Segnali** in Progressi con avviso **deload** (ACWR>1.5 / scarico <0.8) e **stalli** (`plateauList`, nessun nuovo carico max da ≥3 schede).
5. **Vista mobile**: CSS responsive — topbar/tabs adattivi, colonne secondarie nascoste su telefono nella scheda e nello storico.
Versione → **1.0.10**. Test jsdom OK (RIR, precompila+focus, backup/restore round-trip, record 999kg, Segnali, tutti i pannelli), 0 errori.

### 2026-06-06 — TMS: pacchetto senza "Erdtree" + nuovo schema versioni (v1.0.6)
**Tipo**: UX/Convenzione
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**: rimossa la dicitura «Erdtree» dal pacchetto di condivisione (ZIP «TMS v… - condivisione.zip» e titolo LEGGIMI «TRAINING MONITOR SYSTEM»). **Nuovo schema versioni**: ora `1.0.6`; d'ora in poi gli aggiornamenti di routine bumpano l'ultima cifra (1.0.7, 1.0.8…); la cifra decimale (1.1, 1.2…) solo su richiesta esplicita di Marco.

### 2026-06-06 — TMS Erdtree: il pacchetto condiviso non può ri-condividere (v1.6)
**Tipo**: Feature
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**: aggiunto flag `SHARE_ENABLED` (true solo nel master): il pulsante 📦 Pacchetto condivisione è visibile solo se true. In fase di generazione, `cleanSource` mette `SHARE_ENABLED=false` nella copia template → gli amici non vedono il pulsante (solo Marco può creare pacchetti). Versione → **1.6**. Test jsdom OK (master sì, copia condivisa no).

### 2026-06-06 — TMS Erdtree: pacchetto di condivisione ZIP (v1.5)
**Tipo**: Feature
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**: nel tab Profilo, pulsante **📦 Pacchetto condivisione** che genera in JS (senza librerie) uno **ZIP** (`zipStore`, store + `_crc32`) contenente **LEGGIMI.txt** (installazione + guida «cosa sostituire») e una **copia pulita dell'HTML** (`cleanSource`+`_replaceBlob`: rigenera il file con dati embeddati = template). Template (`shareTemplate`): scheda d'esempio + catalogo esercizi + alimentazione d'esempio; storico/misure/dati personali **azzerati** (privacy); profilo «Wander»; disclaimer che ricompare al nuovo utente. ZIP validato con python zipfile; template verificato (storico vuoto, scheda 40 righe, catalogo 66). Versione → **1.5**.

### 2026-06-06 — TMS Erdtree: TL formato k, modalità notte, testo disclaimer (v1.4)
**Tipo**: Feature/UX
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**:
- **TL in formato "k"**: nuovo `nfk()` (≥1000 → es. 29,8k) applicato a TL di scheda/storico/report e agli assi/valori dei grafici TL/tonnellaggio/andamento-gruppo (opzione `fmt` aggiunta a `lineChart`/`barChart`).
- **Modalità notte**: toggle 🌙/☀ nel topbar accanto a Disconnetti; tema `[data-theme="notte"]` (palette Elden Ring scura, oro su fondo notte) salvato in `localStorage` e riapplicato all'avvio.
- **Disclaimer "Prima di iniziare"**: testo aggiornato (centrato) con la nuova formulazione (scopo monitoraggio, fase sperimentale).
- Versione → **1.4**. Test jsdom OK (k, toggle tema, disclaimer), 0 errori.

### 2026-06-06 — TMS Erdtree: Guida con toggle Rapida/Completa (v1.3)
**Tipo**: Documentazione/UX
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**: Guida riorganizzata e divisa in due viste con toggle: **⚡ Rapida** (check d'uso veloce: 4 passi, sezioni in breve, indicatori in breve) e **📖 Completa** (manuale tecnico in 11 capitoli numerati con indice ad ancore: Avvio, Profili, Flusso, Sezioni, Indicatori & formule, Lettura grafici, Alimentazione & OMS, Dati & backup, FAQ & problemi, Basi scientifiche, Licenza). Default Rapida. Versione → **1.3**. Test jsdom OK (toggle, contenuti, jump-nav), 0 errori.

### 2026-06-06 — TMS Erdtree: anagrafica a menù, record reali big-number, disclaimer (v1.2)
**Tipo**: Feature
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**:
- **Anagrafica via menù**: in Profilo sesso/data di nascita/altezza non sono più sempre a vista — riepilogo in card + pulsante ✎ che apre un modale di modifica (`anagraficaModal`).
- **Record personali reali**: in cima a Progressi, al posto delle 5 card KPI (TL/ΔTL/%1RM/tonnellaggio/ACWR) ci sono **5 card big-number** col **carico massimo reale** (non più 1RM stimato) dei grandi esercizi: Squat, Stacco, Panca, Military, Trazioni (`MAINLIFTS`, `realMax`). Rimossa la vecchia tabella record stimata; `prList` e il report ora usano il carico reale.
- **Disclaimer all'apertura**: overlay con il testo «Progetto amatoriale…» + checkbox «Segna come letto» che, se spuntata, salva un flag (`tms-disc-read`) e non lo ripropone.
- Versione → **1.2**. Test jsdom OK (disclaimer+flag, PR Squat 130/Panca 100…, anagrafica modale), 0 errori.

### 2026-06-06 — TMS Erdtree: stampa più sicura + v1.1
**Tipo**: Bugfix
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**: rafforzata l'impaginazione di stampa per non tagliare grafici: soglia di pagina con **margine di sicurezza** (95% dell'A4, ~12mm di slack), tolto `overflow:hidden` dalle pagine (niente clipping accidentale), **tetto massimo all'altezza di grafici/immagini** (`.u svg{max-height:235mm}`). Versione app → **1.1**.

### 2026-06-06 — TMS Erdtree: stampa con impaginazione manuale (finestra dedicata)
**Tipo**: Bugfix/Feature
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**: poiché la stampa CSS nativa tagliava comunque grafici/tabelle (frammentazione SVG/grid inaffidabile in Chrome, specie da file://), aggiunto `printReport()` che apre una **finestra di stampa dedicata** e impagina manualmente in **pagine A4 fisse**: misura l'altezza di ogni blocco (card/grafico/tabella) e va a pagina nuova quando non ci sta; le **tabelle lunghe vengono spezzate per righe** (24/pagina) con intestazione ripetuta (`splitTable`). Copia il CSS del tema nella finestra + CSS `@page size:A4;margin:0` con `.pg` padding 13mm. Pulsante report → `printReport()`. Test (jsdom, finestra stub): 18 unità, tabella scheda spezzata, `print()` invocato, 0 errori.

### 2026-06-06 — TMS Erdtree: fix stampa A4 (grafici/pagine tagliate)
**Tipo**: Bugfix
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**: riscritte le regole `@media print`. Cause del taglio: i grafici erano in una CSS grid (`chart-grid`) che si frammenta male, `overflow:auto` su `.tbl-wrap`, `thead th` sticky, sezioni "avoid" troppo grandi. Fix: in stampa `chart-grid`→block (grafici impilati e `break-inside:avoid` per box), `tr`/`.day-sep` indivisibili, `thead` ripetuto e non-sticky, `overflow:visible`, sfondi/gradienti disattivati, `color-adjust:exact`. Margini @page 12mm.

### 2026-06-06 — TMS Erdtree: numero di versione (v1.0)
**Tipo**: Feature
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**: aggiunto `APP_VERSION`/`APP_DATE` mostrati nel footer (`v1.0`) e nella Guida (`v1.0 · 2026-06-06`), così chi condivide il file capisce chi ha l'ultima versione. Per gli aggiornamenti basta sostituire l'HTML: i dati restano in `TMS_Dati/` (separati dal programma) e vengono migrati automaticamente.

### 2026-06-05 — TMS Erdtree: anagrafica nel Profilo + equilibrio a serie + QR «By Wander»
**Tipo**: Feature/Fix
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**:
- **Anagrafica spostata nel Profilo**: nome, sesso, **data di nascita** e **altezza** (dati invariati) ora si modificano nel tab Profilo; l'**età è calcolata** dalla data di nascita (`etaOf`). Rimossi i campi altezza/età dal tab Corpo (che resta per le sole misure variabili) con rimando al Profilo. BMI/età nel resto dell'app usano i nuovi dati.
- **Equilibrio per gruppo a SERIE, non TL**: il radar (Progressi + Report) ora usa le **serie per gruppo** invece del TL, perché il TL è falsato dai grandi esercizi (gambe/schiena muovono molti più kg) → falso sbilanciamento. Etichette aggiornate («Equilibrio volume»). Guida aggiornata con la spiegazione.
- **QR**: titolo del popup «By Wander», rimossa la frase descrittiva; resta il pulsante «Apri Instagram ↗».
- Test jsdom OK (età 25 da 18/11/2000, Corpo senza altezza/età, radar a serie, QR), 0 errori.

### 2026-06-05 — TMS Erdtree: guida grafici + report a sezioni (cliente) + stampa A4
**Tipo**: Feature/Documentazione
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**:
- **Guida**: sezione «I grafici di Progressi» riscritta come tabella che spiega ogni grafico (TL+media mobile, ACWR, tonnellaggio, ΔTL%, radar, serie/gruppo, andamento per gruppo, distribuzione intensità, progressione esercizio, PR, composizione) — cosa mostra e come si legge.
- **Report ripensato per il cliente**: struttura a **sezioni con flag** (checkbox: profilo&corpo, riepilogo, scheda, grafici andamento, progressione esercizi, record, alimentazione, note coach) salvati per-profilo in `dati_utente.report`. Linguaggio divulgativo con didascalie sotto metriche/grafici, campo **Obiettivo** e **Note del coach** (textarea → testo stampato).
- **Stampa A4 multipagina**: `@page size:A4 margin:13mm`, `print-color-adjust:exact` (colori/sfondi), `break-inside:avoid` su card/grafici, tabelle lunghe con `thead` ripetuto su ogni pagina (classe `.big`), nasconde topbar/QR/fab in stampa.
- Test jsdom OK (toggle sezioni 9↔7, nota, guida), 0 errori.

### 2026-06-05 — TMS Erdtree: Progressi potenziato (ACWR, radar, progressione esercizio, intensità)
**Tipo**: Feature
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**: dashboard Progressi ampliata. Nuovi: **ACWR** (acuto:cronico con banda 0.8–1.3 + card), **progressione per esercizio** (selettore → 1RM stimato e peso max nel tempo), **serie settimanali per gruppo** (barre con riferimenti zona ipertrofia 10–20), **distribuzione intensità** per fasce %1RM, **tonnellaggio** per scheda + card, **record personali** (top 15 per 1RM stimato). Migliorati gli esistenti: **media mobile 4** sulla curva TL, **radar** per l'equilibrio del carico tra gruppi. Aggregati estesi in `schedeAggr` (sets/band/tonn). Nuovi helper `radarChart`, `exProgression`, `prList`; `lineChart` con banda orizzontale, `barChart` con linee di riferimento. Test jsdom OK (9 grafici, selettore 33 esercizi, PR 15 righe), 0 errori.

### 2026-06-05 — TMS Erdtree: sistema Profili (multi-atleta) + fix grafici su dati reali
**Tipo**: Feature
**File coinvolti**: `Io/TMS/Training Monitor System.html` · `Io/TMS/TMS_Dati/` (ristrutturata)
**Descrizione**:
- **Profili** (come concetto per-utente del todo): nuovo tab **👤 Profilo** per gestire più atleti/clienti (crea, attiva, rinomina, elimina). Ogni profilo ha scheda/storico/misure/alimentazione propri; il **catalogo Esercizi è condiviso**. Persistenza per-profilo in `TMS_Dati/<slug>/` (+ `profili.json` e `esercizi.json` condivisi alla root). Cache localStorage multi-profilo. Migrazione automatica dei vecchi file flat sotto il profilo **«Wander»** + cleanup dei file flat residui alla connessione.
- **Dati reali**: ristrutturata `TMS_Dati/` → `TMS_Dati/wander/` con i dati attuali; rimossi i 2 placeholder (storico 898→896) che falsavano i grafici anche sul file reale (i grafici prima leggevano dalla cartella, non dal seed).
- Test jsdom OK (default Wander, nuovo profilo vuoto, switch ripristina i dati, tutti i pannelli, 896 record), 0 errori.

### 2026-06-05 — TMS Erdtree: fix grafici (rimosse settimane-placeholder)
**Tipo**: Bugfix/Dati
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**: dopo il passaggio allo storico calcolato, le schede **202609** e **202610** (contenenti solo l'esercizio-segnaposto «Crunch Cavo Alto» con TL salvato = 0, retaggio del placeholder richiesto dal vecchio Excel) venivano ricalcolate a ~374 invece di 0, creando due tuffi anomali nei grafici (prima erano saltate perché 0→null). Rimosse le 2 righe-placeholder dal seed (storico 898→896). Causa diagnosticata confrontando i totali per scheda salvati vs ricalcolati (tutte le altre schede combaciano entro ~1%).

### 2026-06-05 — TMS Erdtree: pulizia vecchi record storico
**Tipo**: Refactor/Dati
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**: `migrateStorico()` ora rimuove dai record esistenti i campi calcolati salvati (`rm1`/`pct1rm`/`tl`/`fascia`) e completa `macro` se mancante, allineando i vecchi dati alla nuova logica (solo dati grezzi). Idempotente, con backup `storico.backup.json` alla connessione. Verificato: 898/898 record ripuliti.

### 2026-06-05 — TMS Erdtree: QR nero pulito + Storico con valori calcolati
**Tipo**: Feature/Refactor
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**:
- QR Instagram rigenerato in **nero, moduli quadrati classici** (più pulito/scansionabile), 420px inline (~2 KB), link cliccabile invariato.
- **Storico calcolato, non salvato**: 1RM/%1RM/TL (e fascia) non sono più numeri fissi nei record ma vengono **ricalcolati al volo** dalle formule correnti via `sRM`/`sPct`/`sTL` (usano `rm1`/`pct1rm`/`tl` + fattore del catalogo). Aggiornati tutti i consumatori (renderStorico, schedeAggr, lastBlockTL, prevTotal scheda/refresh, report topEx). I nuovi salvataggi memorizzano solo i dati grezzi (scheda, esercizio, seduta, test, macro, serie, rip, peso, rest). Effetto: cambiando una formula o il fattore di un esercizio, **tutto lo storico si aggiorna** (verificato: TL Panca 1211→2550 con fattore 2.0).
- Test jsdom OK, 0 errori.

### 2026-06-05 — TMS Erdtree: QR Instagram rigenerato + link cliccabile
**Tipo**: Feature
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**: QR nell'hero rigenerato da URL `https://instagram.com/marco_the_wander` (libreria qrcode, moduli arrotondati, gradiente arancio→viola stile Instagram, 300px inline base64). Clic sul QR → modale con QR ingrandito scansionabile + pulsante **«Apri Instagram ↗»** (link diretto). Sostituito il vecchio QR brandizzato (non leggibile via filesystem).

### 2026-06-05 — TMS Erdtree: Guida spostata in pulsante separato (basso a destra)
**Tipo**: UX
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**: tab Guida rimosso dalla barra principale (`display:none`) e sostituito da un **pulsante flottante «📕 Guida» fisso in basso a destra**, così è chiaro che è una sezione separata; in cima alla guida aggiunto «← Torna all'app». In sospeso: sostituzione del QR con la nuova immagine Instagram (in attesa del file da Marco — l'immagine incollata non è arrivata come file leggibile).

### 2026-06-05 — TMS Erdtree: Guida integrata + QR Instagram nell'hero
**Tipo**: Feature/Documentazione
**File coinvolti**: `Io/TMS/Training Monitor System.html` (fonte contenuti: `Guida_Training_Monitor_System.docx`)
**Descrizione**:
- Nuovo tab **📕 Guida** (`renderGuida`), struttura ispirata alle guide SustEner (indice ad ancore + sezioni ▌) ma col tema Elden Ring: premessa, come iniziare/connessione cartella, le sezioni, uso passo-passo, **indicatori & teoria** (Epley 1RM, %1RM, TL, ΔTL, fattore, tabella fasce %1RM, principio ACWR), lettura grafici, alimentazione & indice OMS, dati/backup, FAQ, risoluzione problemi, basi scientifiche (Scott/Gabbett/Schoenfeld/Epley/OMS-FAO), licenza. Contenuti riadattati dalla vecchia guida Word dell'Excel al funzionamento dell'app HTML.
- **QR Instagram** in alto a destra nell'hero (immagine stilizzata Elden Ring estratta dal docx, ridimensionata 300px e inline base64); clic → modale con QR ingrandito scansionabile. (URL diretto non ancora cablato: serve l'handle IG di Marco per il link cliccabile.)
- Test jsdom OK (tab Guida, sezioni, QR + modale, altri pannelli), 0 errori.

### 2026-06-05 — TMS Erdtree: calcoli scheda dal vivo + notifica storico non aggiornato
**Tipo**: Feature/UX
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**:
- **Aggiornamento dal vivo** (`refreshSchedaCalc`): digitando serie/rip/peso, 1RM/%1RM/TL/fascia/ΔTL-blocco e i totali di testata si aggiornano in tempo reale senza ridisegnare la tabella → niente più perdita del focus. (Nota: il %1RM dipende solo dalle ripetizioni, non dal peso — è corretto che non cambi cambiando il peso.)
- **Notifica storico non aggiornato** (`aggStatus`/`statusBanner`/`updateStatusDots`): banner verde/rosso in cima alle sezioni Allenamento e Corpo + pallino colorato accanto ai link Storico/Misure nel footer. Criterio: l'ultima registrazione deve coprire almeno la **settimana precedente** (codice ≥ settimana-1); altrimenti avviso «da aggiornare».
- Test jsdom OK (focus mantenuto, TL live, banner, pallini), 0 errori.

### 2026-06-05 — TMS Erdtree: sezione «Misure» nascosta (storico corpo & peso)
**Tipo**: Feature/UX
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**: come per lo Storico allenamento, la tabella dello storico misure è stata spostata dal tab Corpo a una **sezione nascosta «Misure»** (`renderStoricoCorpo`, panel `storicocorpo`, tab `display:none`) raggiungibile dal link «📜 Misure» nel footer. In Corpo restano dati, card e grafici + rimando alla sezione. Colonna Fabbisogno aggiunta. Test jsdom OK.

### 2026-06-05 — TMS Erdtree: indice nutrienti OMS + report professionale
**Tipo**: Feature
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**:
- **Alimentazione — indice settimanale OMS/FAO** (`omsRef`/`omsRenderSection`): per ogni macro e micro mostra valore settimanale (piano giornaliero ×7), riferimento OMS/FAO adulto, % e barra. Energia e proteine personalizzate su fabbisogno e peso; nutrienti «(max)» trattati come limiti (sodio, saturi, grassi, colesterolo). Toggle fase Bulk/Cut. Disclaimer non-medico.
- **Report professionale** (riscritto `renderReport`): intestazione atleta + obiettivo (campo editabile salvato in `dati_utente.obiettivo`), profilo (età/altezza/peso/BMI/fabbisogno), **scheda di allenamento settimanale completa** con target muscolare per esercizio + serie/rip/peso/rest/%1RM/fascia e TL del piano, volume per gruppo, andamento carico storico + esercizi a maggior carico, composizione corporea + trend peso, quadro alimentare Bulk/Cut. Stampabile in PDF.
- Test jsdom OK (indice OMS, toggle, tutte le sezioni report, programma popolato), 0 errori.

### 2026-06-05 — TMS Erdtree: Alimentazione — selettore alimenti da tabella + dettaglio micro/macro
**Tipo**: Feature
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**:
- L'alimento non si digita più: si sceglie da un **selettore-tabella ricercabile** (modale, `openFoodPicker`) con tutti i 1193 cibi e i loro macro per 100 g (cap 400 risultati + ricerca per nome/categoria). Bottone «＋ scegli alimento…» per riga.
- Aggiunto **dettaglio espandibile** per alimento (▸/▾, `foodDetail`): mostra tutti i micro e macro scalati sui grammi — Macronutrienti (energia, proteine, grassi/saturi/mono/poli, carboidrati, fibre, colesterolo), Vitamine (A, B1, B2, B6, B12, C, D, E, folati), Minerali (Ca, Fe, Mg, K, Zn, Na, I, P), con valore per la porzione e per 100 g.
- Indicatore «?» se un alimento non è in banca dati. Test jsdom OK (picker, ricerca, selezione, dettaglio Vitamine/Minerali), 0 errori.

### 2026-06-05 — TMS Erdtree: Alimentazione ristrutturata (pasti raggruppati, no dati ripetuti)
**Tipo**: Refactor/UX
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**:
- Rimossa la colonna "Pasto" ripetuta su ogni riga. Ora gli alimenti sono **raggruppati per pasto** con riga-header (stile `.day-sep` come i giorni della scheda) che mostra nome pasto + **subtotale kcal**, e per ogni pasto i pulsanti ✎ rinomina · ＋ aggiungi alimento · 🗑 elimina pasto. Pulsante ＋ Pasto per crearne di nuovi. Funzionalità e palette invariate.
- Corretto il **seed alimentazione**: nel vecchio Excel il nome pasto era solo sulla 1ª riga del blocco → forward-fill del pasto su tutti gli alimenti (0 orfani). Aggiunta `normalizeAlim()` one-shot (flag localStorage) per sistemare anche la cache dei test.
- Test jsdom OK: nessun gruppo "Senza pasto", pasti Colazione/Pranzo/Spuntino/Cena, 0 errori.

### 2026-06-05 — TMS Erdtree: grafici senza buchi, Storico nascosto, riassunto ΔTL in scheda
**Tipo**: Feature/UX
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**:
- **Grafici**: le settimane/gruppi senza dati non vengono più disegnati a 0 — i valori vuoti diventano `null` (la linea salta il punto e si raccorda) e le barre a 0 sono filtrate (Progressi + Report).
- **Storico nascosto**: il tab Storico è rimosso dalla barra principale (`display:none`) ma resta accessibile da un link discreto «📜 Storico» nel footer. Pannello e logica invariati (alimentano Progressi/Report).
- **Riassunto in scheda**: accanto a «▌ Scheda … / TL totale» ora compare un pill con il **ΔTL settimana/mese** (TL editor vs ultima scheda salvata, esclusi i test 1RM) + il TL dell'ultima scheda.
- Test jsdom OK, 0 errori.

### 2026-06-05 — TMS Erdtree: catalogo esercizi modificabile + scelta da tendina + pulizia UI
**Tipo**: Feature
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**:
- Rimosse le diciture "ERDTREE EDITION" (topbar) e la tagline descrittiva sotto il titolo (hero).
- **Catalogo esercizi editabile**: il tab Esercizi ora permette di aggiungere (＋ Nuovo esercizio), modificare (✎) ed eliminare esercizi (nome, gruppo, target, tipo, fattore TL). Persistito nel nuovo file `TMS_Dati/esercizi.json`; default seed = 66 esercizi base. Lookup (`ESBYNAME`/`EX_BASE`) ora ricostruiti da `DOC.esercizi` via `rebuildEs()`.
- **Scelta esercizio nella scheda da menu a tendina** (`<select>` con optgroup per gruppo muscolare) che pesca dal catalogo invece del testo libero: scheda completamente customizzabile e sempre coerente coi fattori. Il valore eventualmente fuori catalogo viene comunque mantenuto.
- Test jsdom OK: select 66 voci, add esercizio 66→67 e comparsa immediata nei menu scheda, 0 errori.

### 2026-06-05 — TMS Erdtree: modello "set multipli" + seduta automatica (addio suffissi +1/+2/-N2/-MAX)
**Tipo**: Feature/Refactor
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**: rimosso il vecchio workaround Excel (esercizi-variante "+1/+2/-N2/-MAX" creati per far funzionare i riferimenti delle formule). Ora:
- **Set multipli**: l'esercizio ha solo il nome base; i set incrementali sono righe ripetute dello stesso esercizio (pulsante **＋set**). Il **ΔTL è a livello blocco** (somma dei set della seduta) vs ultima scheda, non più per riga.
- **Seduta automatica**: se lo stesso esercizio compare in un 2º giorno della settimana, l'app lo marca **S2** automaticamente dall'ordine dei giorni (niente più "- N2"). Salvata nel campo `seduta` dello Storico.
- **Test 1RM**: il "- MAX" diventa un flag `test` (pulsante ★), escluso dalla progressione TL.
- **Migrazione con backup**: alla connessione `migrateStorico()/migrateScheda()` normalizzano i dati esistenti (verificato: 88 righe → seduta 2 = vecchi "- N2", 1 → test, nomi base 33), salvando prima `TMS_Dati/storico.backup.json`. Migrazione idempotente, gira anche sui dati embedded/cache.
- DB esercizi datalist/tab ridotto a 66 voci base (rimosse le 14 varianti). Aggiunta colonna **Sed.** nello Storico.
- Test jsdom OK: nessun suffisso residuo, ＋set/★ presenti, 0 errori.

### 2026-06-05 — TMS Erdtree: gate connessione a tutto schermo + check percorso
**Tipo**: Feature
**File coinvolti**: `Io/TMS/Training Monitor System.html`
**Descrizione**: aggiunto, sul modello di `Elden Ring - Mappa Lore.html`, un **gate a tutto schermo** mostrato all'avvio se non connesso, con 3 stati (primo accesso / riconnessione handle salvato / browser non supportato) + skip "Continua in locale". Aggiunto **check del percorso**: `EXPECTED_DIR='TMS'`, se il nome della cartella collegata è diverso compare un banner di avviso (`#dir-warn`) con pulsante Ricollega. Test jsdom OK (gate visibile, pannelli renderizzano, 0 errori).

### 2026-06-05 — Nuovo `Io/TMS/Training Monitor System.html`
**Tipo**: Feature
**File coinvolti**: `Io/TMS/Training Monitor System.html` (NUOVO) · sorgente dati: `Io/TMS/Training Monitor System.xlsm` (NON modificato)
**Descrizione**:

- Riscritto in **HTML standalone** l'intero TMS Excel/VBA, su richiesta di Marco. Stile strutturale SustEner (sezioni `▌`, zebratura, input evidenziati, callout) con **tema colori Elden Ring pergamena/ember** (palette di `Elden Ring - Mappa Lore.html`: crema `#fdfaf5`, inchiostro bruno, brace `#c2500a/#ea580c`, oro `#d4a017`).
- **Persistenza modello todo.html**: File System Access API + handle in IndexedDB (auto-reconnect), dati funzionali salvati come JSON nella **sottocartella `TMS_Dati/`** della cartella connessa (`scheda.json`, `storico.json`, `corpo.json`, `alimentazione.json`). Cache localStorage + flush su visibilitychange. Funziona anche offline (in memoria) senza connettere.
- **7 moduli (tab)**: Allenamento (editor scheda settimanale/mensile con calcoli live 1RM Epley, %1RM, TL, ΔTL vs ultima scheda; salva/annulla nello Storico), Storico (filtri esercizio/gruppo/scheda), Progressi (dashboard SVG: TL totale, ΔTL%, TL per gruppo muscolare), Corpo (dati utente + BMI/metabolismo/masse, salva misure in Storico Io, grafici peso/BMI/massa), Alimentazione (banca dati 1193 alimenti per-100g scalati sui grammi, Bulk/Cut + confronto), Esercizi (DB 80 esercizi sola lettura), Report (vista stampabile → PDF, sostituisce i report Word VBA).
- **Dati seed** importati dall'.xlsm: 80 esercizi (con Fattore TL), 1193 alimenti, scheda settimanale corrente, 898 righe Storico, 15 rilevazioni Storico Io, dati utente, pasti Bulk/Cut.
- **Verifica**: formule 1RM/%1RM/TL validate contro i valori calcolati da Excel (match esatto; 30/898 scarti = drift storico dei Fattori, valori storici preservati invariati). Test jsdom: tutti i 7 pannelli renderizzano senza errori, datalist 80/1193, `node --check` OK.
- Build assemblata via Python (iniezione JSON nel template) per evitare il quirk mount-stale dei file-tools; deploy verificato (file termina con `</html>`, 850 KB).
**Approvato da**: Marco (richiesta esplicita + scelte via domande: HTML, ambito completo, persistenza todo, tema pergamena/ember)

---

