> ⚠️ **DOCUMENTO STORICO (superato il 2026-06-10)** — il task descritto qui è stato completato e
> poi evoluto: il target non è più il **portatile** ma l'**installer NSIS con auto-update via
> GitHub Releases** (decisione di Marco, canale HTML dismesso). La fonte di verità attuale è
> **`README.md`** in questa cartella. Conservato come riferimento per le specifiche originali.

# HAND-OFF DI PROGETTO — TMS come app desktop portatile (Electron)

> Documento di consegna per chi (agente AI o sviluppatore) realizzerà l'eseguibile.
> Autore consegna: assistente di Marco · Data: 2026-06-10 · App attuale: **TMS v1.0.53**

---

## 0. Obiettivo (in una riga)

Trasformare l'app **Training Monitor System** (oggi un singolo file HTML) in un
**eseguibile Windows portatile** (un solo `.exe` autoestraente, nessuna installazione),
**senza cambiare la logica dell'app** e **mantenendo intatta** la funzione "collega la cartella".

Tecnologia scelta da Marco: **Electron** (runtime Chromium incorporato). Target: **Windows x64**.

---

## 1. Contesto

Il TMS è un'app di allenamento + nutrizione **a file singolo**:
`Io/TMS/Training Monitor System.html` (~1,2 MB, tutto inline: HTML+CSS+JS).

Architettura dati (NON modificarla):
- L'app usa la **File System Access API** del browser (`showDirectoryPicker`) per collegare
  una cartella chiamata **`TMS`** e ci legge/scrive dentro `TMS_Dati/` (profili, scheda, storico,
  corpo, alimentazione) e legge il catalogo da `TMS_Dati/esercizi.json` (generato dalla cartella
  `Io/TMS/database/`, 883 esercizi). L'handle della cartella è persistito in **IndexedDB**
  (riconnessione automatica all'avvio).
- **Importante (v1.0.53)**: è stata **rimossa la modalità "in locale"**. L'app **richiede** una
  cartella collegata: senza, mostra solo il gate di connessione. Quindi nell'app desktop la
  selezione cartella DEVE funzionare.
- I **video** degli esercizi vengono letti dalla cartella collegata via l'handle (`dirHandle`).
- All'avvio c'è `checkUpdate()` che fa fetch di un `version.json` su GitHub (raw) per il banner
  aggiornamenti. In versione desktop si può lasciare (innocuo) o disattivare.

---

## 2. Documentazione da leggere PRIMA di toccare qualcosa (in ordine)

Tutti i percorsi sono relativi alla root del vault `1 - Quantum Moon/`:

1. `Claude/INDEX.md` — boot del vault: regole operative, struttura, "non modificare senza approvazione".
2. `Claude/TMS.md` — **boot dedicato al TMS**: modello dati, persistenza (FSA + IndexedDB),
   costanti chiave (`APP_VERSION`, `SHARE_ENABLED`, ecc.), workflow di modifica, **gotcha**.
3. `Io/TMS/Changelog/CHANGELOG.md` — storia dell'app. Leggi almeno le voci **v1.0.53** (rimozione
   offline + pacchetto) e **v1.0.52** (catalogo unificato sul database): spiegano perché serve la cartella.
4. `Io/TMS/Training Monitor System.html` — il sorgente da incapsulare. In particolare cerca:
   `HAS_FSA`, `showDirectoryPicker`, `pickDirectory()`, `idbGet/idbSet`, `connectFlow()`, `init()`,
   `gateShow()`. Sono i punti che dipendono dal contesto Chromium.
5. (Facoltativo) `Io/TMS/Documentazione/ANALISI_E_PIANO.md` — basi scientifiche/feature.

NON è necessario leggere `Io/TMS/database/` (883 JSON) né `Documentazione/` (paper) per questo task.

---

## 3. Vincoli tecnici CRITICI (leggere con attenzione)

1. **`showDirectoryPicker` richiede un "secure context".** In Electron, caricare il renderer da
   `file://` **NON** è sempre considerato secure context → la File System Access API potrebbe
   risultare **non disponibile**. È il rischio numero uno.
   **Soluzione consigliata**: registrare uno **scheme privilegiato sicuro** (es. `app://`) e servire
   l'HTML da lì (`protocol.handle('app', …)`), poi `win.loadURL('app://tms/index.html')`.
   In alternativa, servire l'HTML da un piccolo server **http su 127.0.0.1** (loopback è secure context).
   Verificare a runtime che `window.showDirectoryPicker` esista e che `pickDirectory()` apra il dialog.
2. **Persistenza dell'handle cartella** (IndexedDB) deve sopravvivere tra i riavvii: con scheme/origine
   **stabile** (sempre `app://tms` o sempre `http://127.0.0.1:<porta-fissa>`) IndexedDB persiste e la
   **riconnessione automatica** funziona come nel browser. Se l'origine cambia ad ogni avvio, l'utente
   dovrebbe ri-selezionare la cartella ogni volta → da evitare (porta/scheme fissi).
3. **Sicurezza renderer**: l'app è puro web, non le serve Node. Usare
   `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. Non esporre `require`.
4. **Niente modifiche alla logica dell'app** se non strettamente necessarie. Se la FSA non si attiva
   in nessun modo, vedi il **Piano B** (§8) prima di riscrivere mezza app.
5. **Pacchetto condivisione del TMS**: il bottone "Pacchetto" dell'app zippa l'intera cartella `TMS`
   (funzione `addTmsTree`). Per questo il progetto Electron va tenuto **FUORI** dalla cartella dati
   `Io/TMS/` (qui è in `Io/TMS-Electron/`), così `node_modules` e i build NON finiscono nel pacchetto.

---

## 4. Cosa fare — passi operativi

Lavora in questa cartella: `Io/TMS-Electron/` (sibling della cartella dati TMS).

### 4.1 Struttura progetto
```
Io/TMS-Electron/
  package.json
  main.js
  build/icon.ico            (icona app, opzionale ma consigliata)
  renderer/index.html       (COPIA di "Training Monitor System.html")
  HANDOFF.md                (questo file)
```
La renderer è una **copia** dell'HTML attuale rinominata `index.html`. (Tieni uno script che
ricopia l'HTML aggiornato dalla cartella TMS quando esce una nuova versione.)

### 4.2 package.json (base)
```json
{
  "name": "tms",
  "productName": "Training Monitor System",
  "version": "1.0.53",
  "description": "Training Monitor System - by Wander",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "dist": "electron-builder --win portable"
  },
  "devDependencies": {
    "electron": "^31.0.0",
    "electron-builder": "^24.13.3"
  },
  "build": {
    "appId": "wander.tms",
    "productName": "Training Monitor System",
    "directories": { "output": "dist" },
    "files": ["main.js", "renderer/**", "build/**"],
    "win": { "target": "portable", "icon": "build/icon.ico" },
    "portable": { "artifactName": "TMS-${version}-portable.exe" },
    "asar": true
  }
}
```

### 4.3 main.js (scheme sicuro per far funzionare la File System Access API)
```js
const { app, BrowserWindow, protocol, net } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// 'app' come scheme privilegiato e SICURO -> abilita showDirectoryPicker, IndexedDB stabile
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
}]);

function createWindow () {
  const win = new BrowserWindow({
    width: 1280, height: 860,
    title: 'Training Monitor System',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.removeMenu(); // niente menu Electron (app pulita)
  win.loadURL('app://tms/index.html');
}

app.whenReady().then(() => {
  // serve i file della cartella renderer/ sotto app://tms/...
  protocol.handle('app', (request) => {
    const url = new URL(request.url);            // es. app://tms/index.html
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.join(__dirname, 'renderer', rel);
    return net.fetch(pathToFileURL(file).toString());
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
```
> Nota: l'origine è stabile `app://tms` → IndexedDB (handle cartella) persiste tra i riavvii e la
> riconnessione automatica dell'app funziona. Verificare che `showDirectoryPicker` sia definito.

### 4.4 Comandi
```
cd Io\TMS-Electron
npm install
npm start          # prova in sviluppo: deve aprirsi l'app e il gate "Connetti la cartella"
npm run dist       # genera dist\TMS-1.0.53-portable.exe  (un solo file, portatile)
```

### 4.5 Icona (opzionale)
Crea `build/icon.ico` (256x256). Si può ricavare dal logo/emoji ✦ del TMS.

---

## 5. Gestione dati e portabilità

- Il `.exe` portatile NON contiene i dati: l'utente, al primo avvio, **collega la cartella TMS**
  (quella con `TMS_Dati/`, `database/`, eventuali `Video/`), esattamente come nel browser.
- Idea opzionale (NON obbligatoria) per una vera portabilità "una cartella sola": tenere il `.exe`
  dentro la cartella `TMS` e far sì che l'app proponga di default quella posizione. Si può fare
  passando un percorso di default al picker, ma **richiede una piccola modifica all'app**: valutarla
  solo dopo che la versione base funziona.

---

## 6. Criteri di accettazione (obiettivi — da spuntare)

- [ ] `npm start` apre l'app in finestra (senza menu Electron) e mostra il gate "Connetti la cartella".
- [ ] `window.showDirectoryPicker` è **disponibile**; il pulsante "Seleziona cartella…" apre il dialog nativo.
- [ ] Collegando la cartella `TMS`, l'app carica profilo/scheda/storico e il catalogo (883 esercizi).
- [ ] Salvataggi: aggiungo una riga in Allenamento e "Salva nello Storico" → il file su disco si aggiorna.
- [ ] **Riavvio l'exe**: l'app **si riconnette da sola** alla cartella (handle IndexedDB persistito).
- [ ] I **video** degli esercizi si riproducono (se presenti nella cartella).
- [ ] Il **Report PDF** e il **Report digitale** si generano/scaricano.
- [ ] `npm run dist` produce **un singolo `.exe` portatile** (~90-150 MB) che gira su un PC Windows
      pulito (senza Chrome/Edge necessari) e supera i punti sopra.
- [ ] Dimensione e avvio accettabili; nessun errore in console (DevTools).

---

## 7. Gotcha / note varie

- **checkUpdate()**: fa fetch a GitHub. In desktop è innocuo ma inutile; si può lasciare. Se dà fastidio
  in console offline, si può neutralizzare (ma è "fail-silent", non blocca).
- **Aggiornamenti dell'app desktop**: la versione .exe non si auto-aggiorna come il file HTML. Per una
  nuova versione: ricopia l'HTML aggiornato in `renderer/index.html`, bump `version`, `npm run dist`.
  (Eventuale auto-update Electron è fuori scope per ora.)
- **Antivirus/SmartScreen**: un `.exe` non firmato può far comparire l'avviso SmartScreen di Windows
  ("Esegui comunque"). Per distribuzione seria servirebbe la **firma del codice** (a pagamento) — fuori scope.
- **Dimensione**: Electron è grande per natura. Se diventa un problema, l'alternativa è Tauri/WebView2,
  ma richiede di verificare/adattare la File System Access API (più lavoro) — vedi le opzioni discusse con Marco.
- **Non committare** `node_modules/` e `dist/` nel vault sincronizzato (MEGA): aggiungi un `.gitignore`/
  escludili dalla sincronizzazione se serve. Questa cartella è già **fuori** da `Io/TMS/` per non finire
  nel pacchetto condivisione.

---

## 8. Piano B (solo se la File System Access API non si attiva in Electron)

Se, nonostante lo scheme sicuro, `showDirectoryPicker` resta non disponibile:
1. Esporre via **preload + IPC** un piccolo ponte (`window.tmsFS`) con: scegli-cartella
   (`dialog.showOpenDialog({properties:['openDirectory']})`) e read/write file con `node:fs/promises`.
2. Nell'app, dietro un check `if(!window.showDirectoryPicker && window.tmsFS)`, sostituire SOLO
   le 4-5 funzioni di I/O (`pickDirectory`, `readJson`, `writeJson`, lettura video) con il ponte IPC,
   mantenendo identico tutto il resto della logica.
È più invasivo: tentarlo **solo** dopo aver verificato che la via §4.3 non basta.

---

## 9. Risorse

- Electron — Process model, BrowserWindow, `protocol.handle`, `registerSchemesAsPrivileged`.
- electron-builder — target **portable** per Windows (`win.target: "portable"`).
- File System Access API — requisiti di **secure context** e **user gesture**.
- (Per Piano B) Electron `dialog`, `ipcMain/ipcRenderer`, `contextBridge`, `node:fs/promises`.

---

## 10. Regole del vault (rispettarle)

- Lavora nella cartella `Io/TMS-Electron/`. **Non modificare** `Io/TMS/Training Monitor System.html`
  né i dati in `Io/TMS/TMS_Dati/` senza approvazione di Marco (vedi `Claude/INDEX.md`).
- Se devi cambiare l'app (Piano B), proponi prima, poi applica, e aggiorna
  `Io/TMS/Changelog/CHANGELOG.md` con la voce della modifica.
- Test prima di consegnare: avvio reale + i criteri del §6.
