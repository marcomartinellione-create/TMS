# TMS Scheda per Android (APK)

L'app del telefono del cliente, «TMS Scheda», come **app Android vera** da installare.
Ha le **stesse funzioni** della versione web (PWA in `docs/app/`), perché ne contiene una copia:
riscaldamento, esercizi coi video, timer di recupero, modifica della scheda col catalogo del
coach, test del massimale, alimentazione, foto progressi, riepilogo e rientro, italiano e inglese.
**Dal 16/11/2026 è l'unica app del telefono** (decisione di Marco): l'app desktop non indica più la
PWA ai clienti. `docs/app/` resta come **sorgente** dell'APK: si modifica lì e si rifà l'APK.

Cosa cambia rispetto alla PWA, solo dove un'app Android lavora diversamente da un browser:

- **Aprire la scheda**: col pulsante «📂 Carica la scheda» come prima, oppure toccando il file
  `Scheda_….json` in WhatsApp, nell'email o in File e scegliendo **«Apri con TMS Scheda»**.
- **Rientro per il coach**: lo stesso menu «Dove salvo il rientro?» (📤 invia con WhatsApp,
  email, Drive… · 📁 scegli la cartella · ⬇ Download). Il Download c'è da Android 10 in su.
- **Foto progressi**: prima di aprire la fotocamera chiede «Scatta una foto» o «Scegli dalla galleria».
- **Avvisi e conferme** in stile app, mai le finestre di sistema.
- **Tasto indietro** del telefono: risale di una schermata; dal menu chiude l'app.
- Niente invito a «installare l'app» (lo è già). I link del sito e dei QR si aprono nel browser.
- **⚖ Bilancia** (solo nell'APK, dalla 1.1.0): con una bilancia Bluetooth a 8 elettrodi della famiglia
  FitDays/iComon (Healthkeep FG2001B-A, Fitdays FG2202WB…) ci si pesa con la pagina aperta: peso in
  diretta, poi grasso, muscolo, acqua, viscerale, metabolismo, età metabolica. Le pesate restano sul
  telefono e partono col rientro (o da sole con «📤 Manda solo le pesate»); nel TMS sul PC la media di
  ogni settimana va da sola nello Storico misure. Android chiede una volta «Dispositivi nelle
  vicinanze» (fino ad Android 11 la Posizione: lo pretende Android per cercare dispositivi Bluetooth).
  FitDays sullo stesso telefono può prendersi la bilancia: va chiuso o disinstallato.
- **🔗 Collegamento col TMS sul PC** (dalla 1.2.0, «⚙ Collegamento e promemoria»): come Movienaitor, una
  cartella del telefono tenuta uguale alla cartella `My Drive\6 - TMS` di Google Drive da un'app di
  sincronizzazione bidirezionale (Autosync, FolderSync…). Si sceglie la cartella e si scrive il codice
  di collegamento che il PC mostra in ⚙ Impostazioni › 🔗 Telefono collegato. Da lì (dalla 1.2.1) la
  **scheda è collegata**: una sola, modificabile qui e sul PC (vince l'ultima modifica, campo per campo);
  «💾 Salva nello Storico» sul PC la cristallizza (fatica, durata e spunte ripartono da zero, la scheda
  resta collegata). Pesate e foto partono da sole e tornano con «✔ al PC». File
  **cifrati** (AES-GCM, chiave dal codice): Google vede solo file illeggibili. Plugin `TmsCartella`
  (`nativo/TmsCartellaPlugin.java`, selettore di cartelle di Android con permesso persistente).
- **⬆ Aggiornamento da solo** (dalla 1.2.0): `Crea APK.bat` mette l'APK in `6 - TMS\apk\` con
  `versione.json` (versione, nome, impronta SHA-256); il telefono collegato lo vede, lo propone, ne
  controlla l'impronta e lo passa all'installer di Android (la prima volta va consentito «Installa app
  sconosciute» per TMS Scheda). La 1.2.0 stessa va installata a mano, come prima.
- **🔔 Promemoria** (dalla 1.2.0, stessa schermata): ogni sera all'ora scelta (21:00) la pesata, il
  lunedì anche le foto; se quel giorno ci si è già pesati (o si sono fatte le foto) non suona. Plugin
  `@capacitor/local-notifications` (MIT); niente sveglie «esatte»: può suonare qualche minuto dopo.
- Le schede e il rientro sono **gli stessi file** di sempre: il TMS sul PC non vede differenze.

## Creare l'APK

Doppio clic su **`Crea APK.bat`** (in questa cartella). Dopo un minuto circa:

    app-android\dist\TMS-Scheda-<versione>.apk

Se c'è la cartella di Google Drive, l'APK va anche in `My Drive\6 - TMS\apk\` con `versione.json`: i
telefoni collegati lo propongono da soli. Un'altra cartella si scrive in `app-android\cartella-condivisa.txt`;
per crearlo senza pubblicarlo: `powershell -File scripts\build-apk.ps1 -SoloCrea`.

Serve solo ciò che c'è già sul PC (Node, Java 17, Android SDK in `D:\Android-SDK`). La
compilazione avviene in `D:\Android-build\TMS-Scheda`, fuori da OneDrive (dentro OneDrive i
file bloccati dalla sincronizzazione la fanno fallire).

L'APK prende la PWA **com'è in quel momento** in `docs/app/`: se la PWA cambia, basta rifare l'APK.

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

## Passare dalla PWA all'APK (per i clienti che la usavano)

L'APK e la PWA tengono i dati **separati**: la bozza scritta nella PWA non passa nell'APK.
Il momento giusto per cambiare è a **scheda nuova**: il cliente manda il rientro dalla PWA, poi
apre la scheda nuova nell'APK. Gli **iPhone** non installano APK: restano senza app del telefono.

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
| `scripts/prepara-www.js` | copia `docs/app/` in `www/` (senza `sw.js`) e applica 4 modifiche con **conteggio asserito**: via il service worker, `confirm(` → `await tmsConferma(` (3 punti), `delEsercizio` async, `nativo.js` dopo lo script. Se la PWA cambia lì, si ferma e lo dice. `--verifica` controlla senza scrivere |
| `nativo/nativo.js` | lo strato nativo della pagina: avvisi/conferme in stile app, file in arrivo, scelta foto, rientro via plugin, `window.tmsIndietro`, `window.tmsBLE` (trasporto Bluetooth della pagina Bilancia: plugin `@capacitor-community/bluetooth-le` 6.1, MIT, chiamato senza bundler; il protocollo e la formula stanno nella PWA). Sostituisce funzioni globali della PWA (`stradeSalvataggio`, `salvaRientroCome`, `isStandalone`, `alert`) e avvolge `avvia` |
| `nativo/TmsFilePlugin.java` | plugin Capacitor «TmsFile»: `info`, `condividi`, `salvaInCartella` (ACTION_CREATE_DOCUMENT), `salvaInDownload` (MediaStore, Android 10+), evento `fileRicevuto` (VIEW/SEND copiati nella cache), tasto indietro |
| `scripts/patch-android.js` | adatta il progetto generato da `cap add android`: sorgenti nativi, «Apri con» nel manifest, fotocamera visibile (`<queries>`), permesso di vibrare, Bluetooth della bilancia senza posizione (`BLUETOOTH_SCAN` con `neverForLocation`, posizione solo fino ad Android 11), stile, firma, versione, compilazione fuori da OneDrive |
| `scripts/immagini.ps1` | icona adattiva, icone e stella d'avvio da `docs/app/icon-512.png` |
| `test/prova-nativo.js` | prova in jsdom con un plugin finto (`npm run prova`, da questa cartella) |

Generati, fuori da git: `node_modules/`, `www/`, `android/` (si rigenera cancellandolo: utile se
si aggiorna Capacitor), `dist/`, `firma/`. Capacitor resta alla **6** perché la 7 vuole Java 21.

Cambi alla PWA: se toccano i punti modificati da `prepara-www.js` (service worker, `confirm`,
`delEsercizio`, `</body>`) o le funzioni sostituite da `nativo.js`, vanno aggiornati anche qui.
Lo dice subito `npm run verifica` dalla radice del progetto (comprende `prepara-www.js --verifica`);
`npm run prova` (da `app-android/`) rifà anche la prova in jsdom.

Due cose scoperte sull'emulatore, da non togliere: il manifest dichiara `<queries>` per
`IMAGE_CAPTURE` (senza, da Android 11 «Scatta una foto» apre la galleria invece della fotocamera)
e la condivisione esclude TMS Scheda stessa dalle app proposte (registra «Condividi» per i .json).

La bilancia NON si prova sull'emulatore (niente Bluetooth vero): si prova sul telefono con la bilancia.
Note sul protocollo, sulla formula e sul confronto con FitDays: `Doc/bilancia/NOTE_TECNICHE.md` (fuori da git).

Collaudo sull'emulatore (telefono virtuale `TMS_Prova`, Android 15, in `D:\Android-build\avd`):

    set ANDROID_AVD_HOME=D:\Android-build\avd
    D:\AndroidSdk\emulator\emulator.exe -avd TMS_Prova
    D:\AndroidSdk\platform-tools\adb.exe install -r dist\TMS-Scheda-<versione>.apk

Nella build di debug la pagina si ispeziona da Chrome sul PC (`chrome://inspect`).
