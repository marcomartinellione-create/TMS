# electron/ — app desktop del TMS (installer auto-aggiornante)

> Wrapper Electron del **Training Monitor System** (l'HTML nella cartella padre `Io/TMS/`).
> Aggiornato: 2026-06-10 — progetto spostato in `Io/TMS/electron/` (era `Io/TMS-Electron/`),
> **distribuzione solo desktop**: installer NSIS con **auto-update via GitHub Releases**.
> Specifiche storiche: `HANDOFF.md` (superato).

## Prerequisito (una volta sola)

Installare **Node.js LTS** da https://nodejs.org (include npm).

## Script — doppio click sui .bat

| Script | Cosa fa |
|---|---|
| `SYNC_HTML.bat` | Ricopia `..\Training Monitor System.html` → `renderer/index.html` |
| `START.bat` | Avvia l'app in sviluppo (auto-update disattivato in dev) |
| `BUILD.bat` | Genera `dist/TMS-Setup-<versione>.exe` + `dist/latest.yml` |

## Come funziona

- `main.js` serve l'HTML dallo scheme sicuro **`app://tms`** → `showDirectoryPicker` disponibile,
  origine stabile → handle cartella in IndexedDB persiste (**riconnessione automatica**;
  permesso `fileSystem` auto-concesso alla sola origine app://tms).
- Renderer sandboxato: `contextIsolation`, no `nodeIntegration`, `sandbox: true` + `preload.js`.
- **Dati inclusi (dalla v1.0.55)**: l'installer porta con sé `TMS_Dati/` + `database/`
  (`extraResources` → `resources/TMS`, ~200 MB). **Doppia modalità**:
  - nessuna cartella collegata (default) → **dati locali automatici**, niente gate:
    ponte `window.tmsFS` (preload+IPC) + shim `localDirHandle()` nell'HTML.
    Scritture in `%APPDATA%\Training Monitor System\TMS` (sopravvivono agli update);
    letture con fallback al seed read-only in `resources/TMS`;
  - cartella collegata (Marco, MEGA) → File System Access come sempre, ha priorità.
    "Scollega" su desktop torna ai dati locali.
- **Aggiornamenti**: `electron-updater` controlla le **GitHub Releases** del repo
  `marcomartinellione-create/TMS` all'avvio, scarica in background e propone il riavvio.
  Il vecchio banner `checkUpdate()` dell'HTML è neutralizzato dal wrapper.
- **Installer assistito** (v1.0.55): mostra il percorso di installazione
  (default `AppData\Local\Programs\Training Monitor System`) e permette di cambiarlo.

## Flusso release (nuova versione)

1. Modifica l'app HTML nella cartella padre, bump `APP_VERSION`+`RELEASE_NOTE`
2. `SYNC_HTML.bat`
3. In `package.json` allinea `"version"` alla `APP_VERSION`
4. `BUILD.bat` → in `dist/` trovi `TMS-Setup-<versione>.exe` e `latest.yml`
5. Su GitHub: **Releases → Draft a new release** → tag `v<versione>` (es. `v1.0.54`)
   → allega **entrambi i file** (`.exe` + `latest.yml`) → **Publish**
6. Le copie installate si aggiornano da sole al successivo avvio

⚠️ `latest.yml` è obbligatorio: senza, niente auto-update.
⚠️ Il tag deve essere `v` + versione esatta del package.json.

## Distribuzione agli amici

Link alla pagina Releases (`github.com/marcomartinellione-create/TMS/releases/latest`):
scaricano `TMS-Setup-<v>.exe` (~200 MB) e basta — **tutto incluso** (catalogo 883,
video, dati). Niente cartelle da passare, niente MEGA (quello resta solo per Marco).
⚠️ Il seed include i dati reali di Marco (scelta esplicita 2026-06-10): chi installa
parte dal suo profilo.

## Note

- **Escludere dalla sync MEGA**: `Io/TMS/electron/node_modules/` e `Io/TMS/electron/dist/`.
- Exe non firmato → primo avvio: SmartScreen "Ulteriori informazioni → Esegui comunque". Normale.
- Primo build su un PC nuovo: lanciare `BUILD.bat` come amministratore (o Modalità sviluppatore)
  per la cache di electron-builder; dalle volte successive, normale.
- Icona: `build/icon.ico` (✦ ember su sfondo notte), generata da Claude.
