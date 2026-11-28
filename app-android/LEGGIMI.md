# TMS Scheda per Android (APK)

L'app del telefono, «TMS Scheda», come **app Android vera** da installare. La sua pagina (una PWA)
sta in `web/`: riscaldamento, esercizi coi video, timer di recupero, modifica della scheda col
catalogo del coach, test del massimale, alimentazione, foto progressi, bilancia, italiano e inglese.
**Dal 17/11/2026 niente più file Scheda/Rientro** (decisione di Marco): la scheda arriva solo
attraverso l'**hub del TMS** (vedi `hub/` e `Doc/hub-cloudflare/PROGETTO.md`) ed è collegata al TMS
sul PC (vedi sotto). Il cliente scrive il codice che gli dà il suo personal.
**Dal 16/11/2026 è l'unica app del telefono** (decisione di Marco): l'app desktop non indica più la
PWA ai clienti. Il **sorgente** dell'APK è `web/` (fino al 18/11/2026 era `docs/app/`, pubblicata su
GitHub Pages; spostata qui perché non torni online): si modifica lì e si rifà l'APK.

Cosa cambia rispetto alla PWA, solo dove un'app Android lavora diversamente da un browser:

- **Foto progressi**: chiede «Scatta una foto» o «Scegli dalla galleria». Dalla 1.2.3 lo scatto si fa nella
  **fotocamera dell'app con la sagoma** della vista (fronte, lato, retro; riquadro 3:4, testa sulla riga in
  alto, metà coscia su quella in basso), con la foto di prima in trasparenza e l'autoscatto da 3 o 10 s:
  così le foto sono sempre inquadrate uguali. Serve il permesso «Fotocamera» (Android lo chiede la prima
  volta); senza, si ripiega sulla fotocamera del telefono.
- **Avvisi e conferme** in stile app, mai le finestre di sistema.
- **Tasto indietro** del telefono: risale di una schermata; dal menu chiude l'app.
- Niente invito a «installare l'app» (lo è già). I link del sito e dei QR si aprono nel browser.
- **⚖ Bilancia** (solo nell'APK, dalla 1.1.0): con una bilancia Bluetooth a 8 elettrodi della famiglia
  FitDays/iComon (Healthkeep FG2001B-A, Fitdays FG2202WB…) ci si pesa con la pagina aperta: peso in
  diretta, poi grasso, muscolo, acqua, viscerale, metabolismo, età metabolica. Le pesate restano sul
  telefono e vanno da sole al TMS collegato, dove la media di ogni settimana va da sola nello Storico
  misure. Android chiede una volta «Dispositivi nelle
  vicinanze» (fino ad Android 11 la Posizione: lo pretende Android per cercare dispositivi Bluetooth).
  FitDays sullo stesso telefono può prendersi la bilancia: va chiuso o disinstallato.
- **♥ Cardio** (dalla 1.6.0 dentro **Allenamento**, la voce del menu che prima si chiamava «Scheda allenamento»: due
  linguette, Palestra e Cardio, `#home-fasi`; prima era la pagina «Fascia cardio», dalla 1.4.0):
  prima si sceglie lo sport (`FC_SPORT` + «Altro»), poi «Avvia registrazione»; battito grande con le zone, tempo,
  «Fine» (chiede solo la fatica) e «annulla registrazione» con conferma. La seduta (sport, minuti, RPE, FC media,
  picco, traccia ogni 5 s) va da sola al TMS collegato, nel tab Cardio (file cifrato `tms-cardio` sull'hub). Senza
  fascia registra solo il tempo; con una seduta coi pesi aperta non parte, e viceversa. La **fascia** (una fascia
  cardio Bluetooth standard, Polar, Garmin, Wahoo…, o un bracciale che condivide il battito, come l'Amazfit Helio
  Strap con «Heart Rate Push» acceso in Zepp) si sceglie e si collega in **Impostazioni** (`#fc-imp`); il battito si
  vede anche nella barra in alto, e durante una seduta coi pesi va con quella seduta (vedi sotto). Profilo
  standard Bluetooth SIG «Heart Rate»: servizio 0x180D, misura 0x2A37 (decodifica e logica nella pagina,
  `fcDecodifica` e seguenti). Durante la registrazione lo schermo resta acceso (Screen Wake Lock, se la
  WebView lo offre) e la bozza si salva ogni 15 s; con l'app in secondo piano Android può fermare la pagina e
  quei secondi restano vuoti (un servizio in primo piano è previsto con la fase successiva del bracciale,
  studio in `Doc/bracciale/PROPOSTA.md`).
- **⚙ Impostazioni** (dalla 1.6.0, al posto di «Collegamento e promemoria»; pagina `#col`, voce `#vai-col`): collegamento
  col TMS, promemoria e fascia cardio (`#fc-imp`; solo nell'APK), lingua (`#lang-btn`) e i QR del sito (`#qr-btn`), che prima stavano nella
  barra in alto. Nella barra restano solo indietro, titolo e il battito (`#fc-chip`, zona della seduta).
- **Seduta attiva anche con l'app chiusa** (dalla 1.7.0): con una seduta coi pesi o una registrazione Cardio aperta
  gira il servizio in primo piano `TmsSedutaService` (tipo `connectedDevice`): notifica fissa con battito e tempo
  (id 7400, canale «Seduta in corso»), un SUO collegamento Bluetooth alla fascia (0x180D/0x2A37) e un buffer dei
  battiti con l'ora, anche quando Android mette in pausa la WebView; wake lock parziale (max 6 h). La pagina
  (`natAggiorna`, `natRecupera`) lo avvia e lo ferma e, quando torna attiva, prende i battiti e riempie solo i
  secchielli vuoti. Ottimizzazione della batteria: chiesta una volta (`tms-batteria-chiesta`). **Finestra mobile**
  (PiP): la `MainActivity` entra da sola in PiP se c'è una seduta aperta (`setAutoEnterEnabled` da Android 12,
  `onUserLeaveHint` prima) e avvisa la pagina (evento «pip» → `window.tmsInPip`), che mostra `#pip-vista`.
- **Bracciale con la chiave** (dalla 1.7.0; Impostazioni › Sensori › Bracciale, `#zp-box`, funzioni `zp*`): chiave del
  bracciale Zepp OS (Amazfit Helio Strap) salvata SOLO in IndexedDB (`bracciale-chiave`, fuori dalle chiavi `tms-*`),
  mostrata mascherata. «Prova collegamento»: canale cifrato su FEE0 (pezzi v2 su 0016/0017, autenticazione ECDH
  sect163r2 + AES-128 sull'endpoint 0x0082, messaggi cifrati con chiave di sessione XOR sessione, contatore e CRC-32),
  firmware (180A/2A26, `tmsBLE.leggi`) e batteria (0x0029). Crittografia scritta da zero nella pagina (BigInt su
  GF(2^163), AES-ECB con WebCrypto). Protocollo studiato su Gadgetbridge (AGPL-3.0) e unstrap (MIT/Apache-2.0),
  niente codice copiato. Prove: T12d.
- **Sonno e dati del giorno dal bracciale** (dalla 1.8.0; tasto «Sincronizza» `#zp-sinc` e `zpSincAuto` all'apertura,
  al massimo ogni 30 min, mai con `FC.reg` o `SED.s`): `zpSincronizza` → `zpApri` (cerca, collega, autentica) →
  `zpScarica` (`zpTipiOfferti` chiede al bracciale quali tipi ha; per ogni tipo di `ZP_TIPI` = 72, 73, 78, 37, 38, 18,
  19, 46, 56, 58, 1, solo quelli che l'Helio Strap misura: `zpStorico` START/TRANSFER/ACK su 0x004B, con l'ora del primo
  record dalla risposta allo START, a pezzi finché il cursore avanza) → `zpDecodifica` → `zpMetti`. Stato in IndexedDB
  (`tms-zp-dati`, `ZPD`): cursori per tipo (regole di Zepp, `ZP_PASSO`; la prima volta 2 giorni, 7 per 72 e 19), serie
  (potate a 45 giorni, 10 per le serie al minuto, 3 per i passi al minuto; un campione con la stessa ora sostituisce
  quello di prima), passi per giorno (ricalcolati dai minuti), notti per giorno del risveglio, batteria,
  eventi. `zpPreparaEventi` fa una notte (`tms-sonno`) e un giorno (`tms-giorno`) per data degli ultimi 14 giorni nel
  formato di `src/app/09e-recupero.js`; id = chiave + impronta del contenuto, così un giorno cambiato si rimanda e
  il PC sostituisce quello vecchio. Partono con `colEventi` (file `sonno-AAAA-MM-GG.json`, `giorno-…`) e tornano
  «al PC» con `colRicevute`. Da verificare sul campo: i layout segnati «da verificare» in `Doc/bracciale/PROPOSTA.md`
  e se lo scarico toglie i dati dal bracciale (unstrap dice di no). Prove: T12d (bracciale finto con record veri per
  ogni tipo) e T14 (telefono → hub → PC → Corpo › Recupero).
- **Correzioni del collegamento col bracciale** (1.8.2, dopo la prova di Marco con la 1.8.1: «non risponde al
  collegamento cifrato»): avvio nell'ordine provato da unstrap sull'Helio Strap vero (versione del canale ASPETTATA,
  elenco degli endpoint senza conferma, `00` di autorizzazione, `04`, `05`); pezzi scritti «senza risposta»
  (`tmsBLE.scrivi(…, true)` → `writeWithoutResponse`; nel servizio WRITE_TYPE_NO_RESPONSE); cifratura SOLO degli
  endpoint che il bracciale segna nel suo elenco (`zpCifra`: batteria e storico in chiaro); conferme del bracciale su
  0016 lette; risposta al «ping» su 0x0015; ogni START dello storico chiuso con `03 codice` in ogni caso; 20 s senza
  dati (non in tutto); pacchetti numerati controllati; dati compressi aperti. **Diagnosi**: Impostazioni › Bracciale ›
  «Dettagli tecnici dell'ultimo collegamento» (`zpDiag*`, localStorage `bracciale-diag`, mai la chiave) con «Copia i
  dettagli». Dettagli in `Doc/bracciale/NOTE_TECNICHE.md` (sezione 1.8.2).
- **APK 1.9.0 (CVER 5.0, cache v38), 27/11/2026, richieste di Marco**:
  · **Cardio come la Palestra** (`FC_DISC`, `fcRenderCard`, `fcZonaRender`, `fcFasi`): Allenamento › Cardio elenca le
    DISCIPLINE (Corsa, Camminata, Bici, Nuoto, Vogatore, Ellittica, Sci di fondo, Salto della corda, HIIT, Altro); aperta una
    si sceglie solo fra le SUE sottocategorie (`#fc-var`, ricordata in `tms-fc-var`); ogni sottocategoria = [nome, sport del
    TMS che va al PC, GPS]. Comandi (Avvia, Fine, annulla, fatica 1–10, Salva, Butta via) nella fascia scura in alto
    (`#sed-zona`, come la seduta coi pesi); linguette «Attività | Le tue sedute» (`#fc-fasi`); scheda a riquadri
    (`#fc-card`, `.fc-riq`). La seduta ha in più `disc`, `variante` e, all'aperto, `distanza` km, `quota` (D+ m),
    `discesa`, `tempoMov` s, `parziali` s/km, `percorso` [[lat, lon, quota]] (≤ 400 punti, Douglas-Peucker).
  · **GPS** (`gps*`): il servizio `TmsSedutaService` (tipo connectedDevice|location) prende una posizione al secondo e il
    barometro (`TmsSeduta.posizioni({da})`, `permessoPosizione()`); la pagina filtra (precisione ≤ 25 m, spostamento ≥ 4 m,
    salti impossibili per lo sport), conta distanza, tempo in movimento (tratti ≤ 20 s), dislivello (barometro soglia 3 m,
    GPS soglia 8 m), parziali; disegna il percorso in SVG sopra le tessere di OpenStreetMap (`mapVista`, `mapTessere`: Web Mercator, zoom che fa stare
    tutto il percorso, tessere dello zoom dopo a mezza misura; attribuzione nella mappa), il profilo della quota e i parziali.
    Nel browser `navigator.geolocation`. Manifest: posizione anche da Android 12 (`patch-android.js`), FOREGROUND_SERVICE_LOCATION.
    Riferimento studiato: OpenTracks (Apache-2.0); niente codice copiato. Al PC: `pulisciCardioTel` accetta i campi nuovi,
    `graficoPercorso` nel modulo della seduta (`06b-cardio.js`).
  · **Salute professionale** (`renderSal` = tutto, `salVivo` = la parte di ogni secondo): anello dei passi contro l'obiettivo
    (`tms-passi-obiettivo`, di serie 8.000), passi IN DIRETTA dal bracciale con la pagina aperta (`salLiveAvvia`: 0x0016
    `03` → `04 01`+record, `05 01` → aggiornamenti `07`; record = flags, passi, [corsa], [camminata], [metri, kcal]),
    barre dei 7 giorni, sei riquadri del recupero colorati rispetto al solito (14 giorni prima, ≥ 4; `salStato`), ipnogramma
    a livelli, battito di oggi (dal byte 3 dell'attività al minuto, ora tenuto in `ZPD.s[1]` come [ora, passi, bpm]) e stress
    di oggi a mezz'ore.
  · **Misure compatte e uguali ovunque**: blocco «STESSE MISURE OVUNQUE» in fondo al foglio di stile (solo dimensioni, ~10 %
    in meno; colori, caratteri e raggi invariati).
- **APK 1.10.0 (CVER 5.1, cache v39), 27/11/2026, richieste di Marco** («ragioniamo insieme su come inserire una stima delle
  calorie bruciate», «rifatti a paper scientifici», «un widget per il telefono che sintetizza la giornata»):
  · **Calorie di oggi** (`kcProfilo`, `kcGiorno`, `salHtmlKcal`; riquadro `#sal-kcal` della Salute): STIMA minuto per minuto
    da mezzanotte ad adesso. Metabolismo a riposo: Cunningham 1980 (500 + 22 × massa magra; grasso dall'ultima pesata del
    telefono o `SCHEDA.corpo.massa_grassa` del PC), senza grasso Mifflin-St Jeor 1990; vita quotidiana coi multipli FAO/WHO/UNU
    2004 (dormire 1,0 dalle fasi del bracciale, sveglio 1,4); passi del tipo 1 (`ZPD.s[1]` = [ora, passi, bpm]) a MET dalla
    cadenza (CADENCE-Adults 2019: 100 = 3 MET, 130 = 6), kcal/min = MET × 3,5 × kg / 200; battito oltre il 40 % della
    riserva (ACSM 2011) con Keytel 2005; sedute del telefono (`SEDUTE_FC` con battito → Keytel, senza → MET del Compendium
    2024 `KC_MET`; `SEDUTE_PESI_FC` a 3,5 MET). PROPOSTA da rivedere con Marco: al PC non va. Il PC ora manda nella scheda
    anche `corpo.peso` e `corpo.massa_grassa` (`15-scambio.js`).
  · **Regola dei dati grezzi** (Marco, 27/11/2026): si salvano solo le misure. Bracciale: al PC l'evento `tms-bracciale`
    coi CAMPIONI del giorno (`zpGiornoGrezzo`: base64 al minuto per passi+battito, stress, pelle; elenchi con l'ora per
    HRV, SpO2, respirazione, battito a riposo), niente più `tms-giorno`; `tms-sonno` senza medie (`zpNotteEvento`). Sedute:
    battito al secondo (`r.hr`) e punti GPS grezzi (`r.fix`, `fcFix`) salvati in una voce per seduta (`fcGrezzoKey`); FC
    media e picco, traccia a 5 s, distanza, dislivello, parziali e percorso calcolati da `fcDaGrezzo` e attaccati NON
    enumerabili (`fcAttacca`): JSON.stringify non li vede. Pesi: `hr` (base64) nella voce. Pesate: peso, impedenze e
    contesto (altezza, età, sesso), composizione non enumerabile (`pesComponi`). Calorie: digestione 10 %, pesi coi MET
    del Compendium secondo l'RPE (`kcMetPesi`).
  · **Prova di Marco sul telefono (27/11/2026, sera)**: finestra mobile col SOLO battito, grande, a misura della
    finestra (unità vh/vw; PiP 3:2, `pipRender`); niente zoom (viewport `maximum-scale=1,user-scalable=no`); notifica
    «Allenamento in corso» (canale `allenamento`, importanza normale ma muta, visibile sullo schermo bloccato, tempo che
    scorre col cronometro; permesso delle notifiche chiesto alla prima seduta, `natPermessoNotifiche`); con un allenamento
    aperto i suoi dettagli restano in alto su ogni pagina (`sedZona` fuori dalla pagina, tasto «Torna all'allenamento»,
    `allenTorna`) e non se ne apre un altro (`allenBloccato` in `apriGiorno` e sulle discipline: avviso e ritorno).
  · **Widget della giornata** (`nativo/TmsWidget.java`, risorse e ricevitore da `scripts/patch-android.js` punto 4b): anello a
    torta delle fasi del sonno col punteggio al centro, battito con l'ora, passi con barretta dell'obiettivo, calorie. La
    pagina manda i numeri (`widgetAggiorna`: dopo ogni sincronizzazione, all'avvio, uscendo dall'app, Salute aperta una volta
    al minuto) con `TmsSeduta.widget` o, dalla pagina invisibile del servizio, `TmsServizio.widget`; il servizio aggiorna il
    battito (`TmsWidget.battito`, una volta al minuto). Toccandolo: azione `…WIDGET` → `MainActivity.onNewIntent` →
    `TmsSedutaPlugin.daWidget` → evento «widget» o, all'avvio, `widgetAperto()` → `salDaWidget` (non durante una seduta).
- **APK 1.11.0 (CVER 5.2, cache v40), 28/11/2026, richieste di Marco** («suggerimento della dieta in base a massa o cut
  rispetto alla quota calorica consumata», «dettagli che spiegano, sia nel pc che nel apk, i valori ricevuti dalla fascia»,
  «widget più chiaro, fasce una sopra all'altra che si completano, come la apple»):
  · **Widget a fasce** (`nativo/TmsWidget.java` riscritto; layout `tms_widget` alto 4 × 3 e `tms_widget_basso` due per due
    da `scripts/patch-android.js` 4b; icona nuova `tms_w_luna`): battito (barra dalla FC a riposo alla massima, colore della
    zona), passi contro l'obiettivo, calorie contro la «giornata tipica» (scelta di Marco: media dei giorni interi col
    bracciale degli ultimi 14 o fabbisogno; barra nelle quattro parti), sonno contro 8 ore (barra nelle fasi, punteggio
    accanto). Barre disegnate alla larghezza vera del widget (`getAppWidgetOptions`, `onAppWidgetOptionsChanged`). La
    pagina manda in più `kp` (parti delle calorie), `tipica`, `fcRip`, `fcMax` e i nomi delle fasce in `L`. Tutti gli id
    devono stare in ENTRAMBI i layout (RemoteViews non disegna un widget a cui manca una vista toccata dal codice).
  · **Spiegazioni** (tasto «i», `infoApri`, finestra `#infov` chiusa da indietro/`risali`): testi in `SAL_INFO`, COPIATI
    dal PC (`src/app/05d-spiegazioni-bracciale.js` e `05e-…-en.js`) con `node tools/copia-spiegazioni-telefono.js`;
    `npm run verifica` e `tests/test-app.js` controllano che siano uguali. Mai scriverli a mano qui.
  · **Suggerimento della dieta** (`dsSuggerisci` identico al PC, `dsConsumoTel`, `dsPerTel`, `salHtmlDieta` sotto le calorie
    di oggi): la fase, l'esperienza, metabolismo basale e livello di attività arrivano nella scheda (`SCHEDA.corpo`).
    `kcGiorno` dice ora `copertura` e `completo`; i minuti del tipo 1 si tengono 16 giorni (`zpPota`) per avere i 14
    giorni interi del consumo medio.
  · **Digestione dalla dieta** (Marco: «sì, dalla dieta»; CVER 5.3, cache v41): `kcDietaDi` (uguale al PC) usa i macronutrienti
    di `SCHEDA.dieta.tot` (proteine 25 %, carboidrati 7,5 %, grassi 1,5 % della loro energia, `KC_TEF`) nei giorni dal
    `dal` del piano non segnati «no»; per oggi la parte del giorno passata; se no il 10 %. `kcGiorno` dice `digDa`.
- **❤ Salute** (dalla 1.8.1; voce `#vai-sal` del menu, pagina `#sal`, funzioni `sal*`): battito adesso (`FC.bpm` della
  fascia collegata nella pagina, o `bpm` dello stato del servizio, aggiornato ogni 5 s), zona (`fcZona`), passi di oggi
  (`ZPD.passi`, ora dal cursore del tipo 1), batteria, ultimo campione di stress (19/18), SpO2 (37), pelle (46),
  respirazione (56) con l'ora; ultimo riposo (`salUltimoRiposo`: notte più recente o sonnellino più nuovo) con fasi,
  HRV (`zpNotteValori`) e battito a riposo (`zpGiornoValori`). «Aggiorna» = `zpSincronizza(true)`. Senza chiave:
  «Vai alle Impostazioni» apre Impostazioni › Bracciale. Nessun dato nuovo: legge `ZPD`. Prove: T12d.
- **Sempre collegato** (dalla 1.8.1; Impostazioni › Sensori, `#sempre-box`, interruttore `#sempre-on` acceso di serie,
  `localStorage['tms-sempre']='0'` se spento; funzioni `natSempre`, `natSempreAvvio`, `sempreRender`): la pagina passa
  al plugin `TmsSeduta.sempre({attivo, dispositivo, nome, tipo, chiave, lingua, batteria})` il bracciale (chiave +
  `tms-bracciale-id`) o la fascia salvata; il plugin lo scrive nelle SharedPreferences `tms-sempre` e avvia
  `TmsSedutaService` (azione SEMPRE). Il servizio: GATT con autoConnect (riconnessione passiva di Android), dopo un
  errore riapre con attese 5 s → 10 min, segue il Bluetooth spento/acceso; notifica discreta (canale «collegamento»,
  azione «Scollega» → `spentoDaNotifica`, letto da `stato()` all'apertura); battito 0x180D e batteria 0x180F solo per
  la notifica; `START_STICKY`; `TmsAvvioReceiver` (BOOT_COMPLETED, QUICKBOOT_POWERON, MY_PACKAGE_REPLACED; permesso
  RECEIVE_BOOT_COMPLETED, in `patch-android.js`). Se Android rifiuta l'avvio (eccezione di `startForeground`), la
  notifica 7401 «Tocca per ricollegarlo» apre l'app. Con la chiave, sveglia ogni 30 min (`setAndAllowWhileIdle`) →
  se la pagina è viva evento «sincronizza» (`window.tmsSincServizio` → `zpSincronizza` → `colGiro` → `sincFatta`),
  altrimenti **pagina invisibile**: una WebView del servizio carica la stessa `https://localhost/index.html` dagli asset
  (`public/`, stessa origine: stessa chiave, stessi dati, stesso collegamento con l'hub) con l'interfaccia Java
  `window.TmsServizio`; la pagina (`servizioGiro`) scarica, manda e chiama `TmsServizio.fine(esito)`; al massimo 4
  minuti. **Ponte** `window.tmsPonte` (in `nativo.js` col plugin, o nella pagina con `TmsServizio`): scrivi/leggi/
  notifiche sul collegamento del servizio; `zpBle()` lo sceglie quando il servizio tiene il bracciale (niente ricerca né
  secondo collegamento). Una sincronizzazione alla volta (`tms-zp-lock`, 5 min); `ZPD` si rilegge prima di scriverlo.
  Prove: T12d (ponte, pagina invisibile, blocco), `prova-nativo` (interruttore, eventi, ponte, manifest), javac.
- **Impostazioni ordinate** (dalla 1.8.0): in ogni sezione collegata e verde (TMS sul PC `#col-box`, fascia `#fc-imp`,
  bracciale `#zp-box`) i comandi stanno in `.imp-azioni`, nascosti finché non si tocca «Gestisci» (`.imp-apri`,
  classi `imp-ok` e `aperta`, funzione `impTendina`); senza collegamento si vedono subito.
- **Seduta in corso** (dalla 1.5.0; dalla 1.6.0 con la conferma): aprendo un giorno l'app chiede «Inizio la seduta di
  oggi?» («Inizia» / «Solo guardare»; «Solo guardare» si ricorda per quel giorno di calendario, `tms-sed-guardo`, e
  lascia «Inizia la seduta» nella zona). «annulla seduta», con conferma, toglie una seduta avviata per sbaglio senza
  salvare niente. Avviata la seduta (inizio salvato in IndexedDB,
  `tms-seduta-<slug>`: resiste a un'app chiusa; uscire e rientrare non la fa ripartire). La **zona della seduta** è
  una seconda riga della barra in alto sulle pagine dei giorni (`#sed-zona`, funzioni `sed*`): battito colorato per
  zona o «nessuna fascia», tempo, «Fine seduta», che compila la durata (`min-N`) e chiede la fatica (`rpe-N`).
  Il battito della seduta (con la fascia collegata si registra da solo) va al PC come evento cifrato
  `tms-seduta-fc`; sul PC sta col giorno della scheda e poi nello Storico (`storico_fc`), mai nel carico né nel
  Cardio. Dopo 3 ore senza attività la seduta è «dimenticata»: l'app propone di chiuderla fino all'ultima attività.
  Durante una seduta la fascia resta collegata anche con l'app in secondo piano (Android può comunque fermare la
  pagina: quei secondi restano vuoti).
- **🔗 Collegamento col TMS sul PC** («⚙ Impostazioni»): attraverso l'hub del TMS su
  Cloudflare (fino alla versione precedente all'hub passava da una cartella condivisa di Google Drive;
  ora niente cartella, niente app di sincronizzazione, niente account Google). Si scrive il codice
  del cliente che il personal ha creato sul PC in ⚙ Impostazioni › 🔗 Telefono collegato › «Collega
  un telefono» e si preme «Collega». Da lì (dalla 1.2.1) la
  **scheda è collegata**: una sola, modificabile qui e sul PC (vince l'ultima modifica, campo per campo);
  «💾 Salva nello Storico» sul PC la cristallizza (fatica, durata e spunte ripartono da zero, la scheda
  resta collegata). Pesate e foto partono da sole e tornano con «✔ al PC». File
  **cifrati** (AES-GCM, chiave dal codice di quel cliente): l'hub vede solo file illeggibili. Il
  plugin `TmsCartella` (`nativo/TmsCartellaPlugin.java`) serve ormai solo a scaricare e installare
  l'APK nuovo; i suoi metodi per la cartella restano nel Java ma la pagina non li usa più.
- **⬆ Aggiornamento da solo** (dalla 1.2.6): il telefono legge `docs/scheda/versione.json` sul sito
  (versione, nome, impronta SHA-256, url; lo scrive `tools/pubblica.js`), propone la versione nuova,
  scarica l'APK allegato alla release GitHub, ne controlla l'impronta e lo passa all'installer di
  Android (la prima volta va consentito «Installa app sconosciute» per TMS Scheda). Funziona anche
  senza collegamento.
- **🔔 Promemoria** (dalla 1.2.0, stessa schermata): ogni sera all'ora scelta (21:00) la pesata, il
  lunedì anche le foto e (dalla 1.2.8, casella a parte accesa di serie) la domanda sulla dieta; se quel
  giorno ci si è già pesati, si sono fatte le foto o si è segnata la dieta, non suona. Plugin
  `@capacitor/local-notifications` (MIT).
- **⏱ Fine del recupero** (dalla 1.2.8): il timer conta dall'ora di fine, quindi è giusto anche con
  l'app in secondo piano; quando l'app va in secondo piano si programma la notifica «Recupero finito»
  (id 7200, canale «Timer di recupero»), che si toglie tornando nell'app. Le sveglie sono **esatte**
  (`USE_EXACT_ALARM`, su Android 12 `SCHEDULE_EXACT_ALARM`: le aggiunge `scripts/patch-android.js`),
  così il recupero finisce al secondo giusto e i promemoria suonano all'ora scelta.
- **🎮 Schermata d'analisi della pesata** (dalla 1.2.8): a tutto schermo durante la misura, con la grafica
  dell'app e la figura del corpo del PC (maschile o femminile, `SAGOME`, uguale a quella di
  `src/app/09d-rapporto-corpo.js`), musica `web/musica-pesata.mp3` (data da Marco come libera da
  copyright), fanfara, vibrazione e notifica a fine misura (id 7300).
- **📷 Collegamento col QR** (dalla 1.3.0): nella schermata Collegamento «Inquadra il QR» legge il QR che il
  TMS mostra in ⚙ Impostazioni › Telefono collegato › QR (contenuto «TMS:» + il codice) col lettore di codici
  di Android (`BarcodeDetector`) e collega da solo; sui telefoni senza lettore si scrive il codice.
- **🍽 Dieta seguita** (dalla 1.2.8): domanda della sera e calendario nell'Alimentazione; ogni giorno
  segnato va al PC del personal come le pesate (file cifrato `tms-dieta` sull'hub).
- **Icona**: la stella del logo del PC (`logo.png`, bracci uguali), disegnata da
  `tools/genera-icone-app.js` in `web/icon-512.png`; `scripts/immagini.ps1` ne ricava icone e avvio.

## Creare l'APK

Doppio clic su **`Crea APK.bat`** (in questa cartella). Dopo un minuto circa:

    app-android\dist\TMS-Scheda-<versione>.apk

L'APK nuovo arriva ai telefoni con `PUBBLICA.bat`, che lo allega alla release GitHub e scrive
`docs/scheda/versione.json`. Lo script `scripts\build-apk.ps1` può ancora copiarlo in una cartella
`6 - TMS\apk\` se esiste (serve solo ai telefoni con la 1.2.5 o prima); per crearlo senza copiarlo:
`powershell -File scripts\build-apk.ps1 -SoloCrea`.

Serve solo ciò che c'è già sul PC (Node, Java 17, Android SDK in `D:\Android-SDK`). La
compilazione avviene in `D:\Android-build\TMS-Scheda`, fuori da OneDrive (dentro OneDrive i
file bloccati dalla sincronizzazione la fanno fallire).

L'APK prende la pagina **com'è in quel momento** in `web/`: se la PWA cambia, basta rifare l'APK.

## Installarlo sul telefono

1. Manda il file `TMS-Scheda-<versione>.apk` al telefono (WhatsApp, email, Drive o cavo USB).
2. Sul telefono toccalo. La prima volta Android chiede di **consentire l'installazione da
   questa fonte** (WhatsApp, Gmail, File…): consenti e torna indietro.
3. Se compare **Play Protect** («app non verificata» o «sviluppatore sconosciuto»), tocca
   **Altri dettagli → Installa comunque**. Succede perché l'app non viene dal Play Store.
4. Si apre come qualunque app, con l'icona nera con la stella.

Per gli **aggiornamenti**: si alza `version` in `app-android/package.json` (es. 1.0.0 → 1.0.1),
si rifà l'APK e il cliente lo installa **sopra** quello vecchio: la scheda, la bozza e le foto restano.
Funziona solo perché ogni versione è firmata con la **stessa chiave** (vedi sotto).

## Da non fare mai (si perderebbero i dati dei clienti)

- **Perdere la chiave di firma** `firma\tms-scheda.keystore`. Non è su GitHub (il repository è
  pubblico), la salva OneDrive: tienine anche una copia altrove (chiavetta). Senza di lei un APK
  nuovo non si installa sopra il vecchio, e disinstallare l'app cancella la bozza del cliente.
  `Crea APK.bat` si ferma se la chiave manca; `scripts\crea-firma.ps1` ne crea una nuova SOLO se
  l'app non è mai stata data a nessuno. Impronta della chiave giusta (creata il 14/11/2026), SHA-256
  `00:aa:e7:09:9c:65:67:e2:9f:11:26:ee:b2:ad:fa:96:d1:9f:e7:35:c0:63:ea:3c:f8:a7:95:b1:8e:01:9a:a1`
  (si controlla con `apksigner verify --print-certs` sull'APK).
- Cambiare `appId` o `server` in `capacitor.config.json`: per il telefono sarebbe un'altra app
  (o un altro «sito»), con i dati vuoti.

## Per chi mantiene il codice

| file | cosa |
|---|---|
| `scripts/prepara-www.js` | copia `web/` in `www/` (senza `sw.js`) e applica 4 modifiche con **conteggio asserito**: via il service worker, `confirm(` → `await tmsConferma(` (5 punti), `delEsercizio` async, `nativo.js` dopo lo script. Se la PWA cambia lì, si ferma e lo dice. `--verifica` controlla senza scrivere |
| `nativo/nativo.js` | lo strato nativo della pagina: avvisi/conferme in stile app, scelta foto, `window.tmsIndietro`, `window.tmsAggiorna` (aggiornamento dell'APK da GitHub: scarica e installa, plugin `TmsCartella`; `window.tmsCartella` non esiste più), `window.tmsAvvisi` (promemoria), `window.tmsBLE` (trasporto Bluetooth GENERICO delle pagine Bilancia e Fascia cardio: plugin `@capacitor-community/bluetooth-le` 6.1, MIT, chiamato senza bundler; servizio e caratteristiche li passa la pagina — `collega(id, cb, {servizio, notifiche})`, `scrivi(id, car, byte, servizio)`, senza parametri valgono quelli della bilancia — e gli ascolti sono tenuti per dispositivo, così bilancia e fascia possono stare collegate insieme; protocolli e formule stanno nella PWA). Sostituisce funzioni globali della PWA (`isStandalone`, `alert`) e avvolge `avvia` |
| `nativo/TmsFilePlugin.java` | plugin Capacitor «TmsFile»: `info` (versione di Android) e tasto indietro |
| `nativo/TmsSedutaPlugin.java` | plugin «TmsSeduta»: `avvia/ferma` del servizio della seduta, `campioni({da})` (i battiti presi a schermo spento), `pip({attivo})` (finestra mobile), `batteria/chiediBatteria`; evento «pip» verso la pagina |
| `nativo/TmsSedutaService.java` | servizio in primo piano della seduta: notifica fissa, collegamento Bluetooth Heart Rate proprio, buffer dei battiti, wake lock parziale |
| `nativo/TmsCartellaPlugin.java` | plugin «TmsCartella»: la pagina lo usa solo per scaricare e installare l'APK nuovo con controllo dell'impronta; i metodi per la cartella condivisa (scelta, lettura, scrittura, elenco) restano nel Java ma non sono più chiamati |
| `scripts/patch-android.js` | adatta il progetto generato da `cap add android`: sorgenti nativi, via «Apri con» dal manifest, fotocamera visibile (`<queries>`), permesso della fotocamera (sagoma), permesso di vibrare, Bluetooth della bilancia senza posizione (`BLUETOOTH_SCAN` con `neverForLocation`, posizione solo fino ad Android 11), servizio in primo piano della seduta (`FOREGROUND_SERVICE_CONNECTED_DEVICE`, `CHANGE_NETWORK_STATE`, `WAKE_LOCK`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, `<service>` di tipo `connectedDevice`), finestra mobile (`supportsPictureInPicture` sull'attività), stile, firma, versione, compilazione fuori da OneDrive |
| `scripts/immagini.ps1` | icona adattiva, icone e stella d'avvio da `web/icon-512.png` |
| `test/prova-nativo.js` | prova in jsdom con un plugin finto (`npm run prova`, da questa cartella) |

Generati, fuori da git: `node_modules/`, `www/`, `android/` (si rigenera cancellandolo: utile se
si aggiorna Capacitor), `dist/`, `firma/`. Capacitor resta alla **6** perché la 7 vuole Java 21.

Cambi alla PWA: se toccano i punti modificati da `prepara-www.js` (service worker, `confirm`,
`delEsercizio`, `</body>`) o le funzioni sostituite da `nativo.js`, vanno aggiornati anche qui.
Lo dice subito `npm run verifica` dalla radice del progetto (comprende `prepara-www.js --verifica`);
`npm run prova` (da `app-android/`) rifà anche la prova in jsdom.

Due cose scoperte sull'emulatore, da non togliere: il manifest dichiara `<queries>` per
`IMAGE_CAPTURE` (senza, da Android 11 «Scatta una foto» apre la galleria invece della fotocamera)
(la condivisione dei .json e «Apri con» non ci sono più dal 17/11/2026).

La bilancia NON si prova sull'emulatore (niente Bluetooth vero): si prova sul telefono con la bilancia.
Note sul protocollo, sulla formula e sul confronto con FitDays: `Doc/bilancia/NOTE_TECNICHE.md` (fuori da git).

Collaudo sull'emulatore (telefono virtuale `TMS_Prova`, Android 15, in `D:\Android-build\avd`):

    set ANDROID_AVD_HOME=D:\Android-build\avd
    D:\AndroidSdk\emulator\emulator.exe -avd TMS_Prova
    D:\AndroidSdk\platform-tools\adb.exe install -r dist\TMS-Scheda-<versione>.apk

Nella build di debug la pagina si ispeziona da Chrome sul PC (`chrome://inspect`).
