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
- **♥ Fascia cardio** (solo nell'APK, dalla 1.4.0): con una fascia cardio Bluetooth standard (Polar, Garmin,
  Wahoo…) o un bracciale che condivide il battito (Amazfit Helio Strap con «Heart Rate Push» acceso in Zepp)
  si vede il battito in diretta, colorato per zona (FC max del Profilo o stimata dall'età), anche nella barra in
  alto. Durante una seduta coi pesi il battito va con quella seduta (vedi sotto) e «Registra» non c'è: serve alle
  sedute di solo cardio. «Registra» e «Fine» salvano una seduta (sport, minuti, RPE, FC media, picco,
  traccia ogni 5 s) che va da sola al TMS collegato, nel tab Cardio (file cifrato `tms-cardio` sull'hub). Profilo
  standard Bluetooth SIG «Heart Rate»: servizio 0x180D, misura 0x2A37 (decodifica e logica nella pagina,
  `fcDecodifica` e seguenti). Durante la registrazione lo schermo resta acceso (Screen Wake Lock, se la
  WebView lo offre) e la bozza si salva ogni 15 s; con l'app in secondo piano Android può fermare la pagina e
  quei secondi restano vuoti (un servizio in primo piano è previsto con la fase successiva del bracciale,
  studio in `Doc/bracciale/PROPOSTA.md`).
- **⚙ Impostazioni** (dalla 1.6.0, al posto di «Collegamento e promemoria»; pagina `#col`, voce `#vai-col`): collegamento
  col TMS e promemoria (solo nell'APK), lingua (`#lang-btn`) e i QR del sito (`#qr-btn`), che prima stavano nella
  barra in alto. Nella barra restano solo indietro, titolo e il battito (`#fc-chip`, zona della seduta).
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
| `nativo/TmsCartellaPlugin.java` | plugin «TmsCartella»: la pagina lo usa solo per scaricare e installare l'APK nuovo con controllo dell'impronta; i metodi per la cartella condivisa (scelta, lettura, scrittura, elenco) restano nel Java ma non sono più chiamati |
| `scripts/patch-android.js` | adatta il progetto generato da `cap add android`: sorgenti nativi, via «Apri con» dal manifest, fotocamera visibile (`<queries>`), permesso della fotocamera (sagoma), permesso di vibrare, Bluetooth della bilancia senza posizione (`BLUETOOTH_SCAN` con `neverForLocation`, posizione solo fino ad Android 11), stile, firma, versione, compilazione fuori da OneDrive |
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
