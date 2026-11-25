// TMS — Training Monitor System · wrapper Electron (HANDOFF.md §4.3)
// Serve renderer/ da uno scheme privilegiato e SICURO (app://tms) così che:
//  - window.showDirectoryPicker (File System Access API) sia disponibile (secure context)
//  - IndexedDB abbia origine stabile -> l'handle cartella persiste tra i riavvii
const { app, BrowserWindow, protocol, net, session, dialog, ipcMain, shell, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const { pathToFileURL } = require('node:url');
const { autoUpdater } = require('electron-updater');

// ── Ponte dati locali (window.tmsFS, via preload.js) ─────────────────────────
// SCRITTURE: sempre in userData/TMS (sopravvive ad aggiornamenti e reinstallazioni).
// LETTURE: prima userData/TMS, poi il seed di sola lettura portato dall'installer
// (resources/TMS = TMS_Dati + database); in sviluppo il seed è la cartella TMS reale (padre).
const WRITE_ROOT = () => path.join(app.getPath('userData'), 'TMS');
const SEED_ROOT  = () => app.isPackaged ? path.join(process.resourcesPath, 'TMS')
                                        : path.join(__dirname, '..');
function safeJoin(root, rel){
  const p = path.normalize(path.join(root, String(rel||'')));
  if (p !== root && !p.startsWith(root + path.sep)) throw new Error('percorso non consentito: ' + rel);
  return p;
}
const fileExists = (p) => fs.access(p).then(() => true, () => false);
// Scritture ancora in corso: alla chiusura dell'ultima finestra si aspettano PRIMA di
// uscire. Il renderer, chiudendosi, spedisce le modifiche non ancora salvate; senza
// questa attesa il processo poteva terminare con la scrittura a metà strada.
const scrittureInCorso = new Set();
let contaTmp = 0;

protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
}]);

// stato del download aggiornamento (vedi blocco auto-update): finché è in corso,
// la chiusura della finestra viene trattenuta con un avviso — altrimenti l'utente
// chiude a download a metà e "non si aggiorna mai" (segnalato da Marco, v1.0.62→63)
const aggiornamento = { inCorso: false, percento: 0 };

// ── Stato della finestra (2026-11): posizione, dimensione, massimizzata / schermo intero.
// L'app si riapre com'era stata chiusa. Vive in userData/finestra.json, fuori dai dati
// dell'utente (non è un dato da backup). Lettura sincrona: serve PRIMA di creare la finestra.
const FILE_FINESTRA = () => path.join(app.getPath('userData'), 'finestra.json');
function leggiStatoFinestra () {
  try {
    const s = JSON.parse(fsSync.readFileSync(FILE_FINESTRA(), 'utf8'));
    if (!s || typeof s !== 'object') return null;
    const b = s.bounds;
    if (b && [b.x, b.y, b.width, b.height].every(Number.isFinite) && b.width >= 600 && b.height >= 400) {
      // la finestra deve cadere su uno schermo che esiste ancora (monitor staccato, risoluzione cambiata)
      const visibile = screen.getAllDisplays().some(d => {
        const a = d.workArea;
        return b.x < a.x + a.width - 80 && b.x + b.width > a.x + 80 && b.y < a.y + a.height - 80 && b.y + 40 > a.y;
      });
      if (!visibile) s.bounds = null;
    } else s.bounds = null;
    return s;
  } catch (e) { return null; }
}
function salvaStatoFinestra (win) {
  try {
    if (!win || win.isDestroyed()) return;
    const stato = {
      bounds: win.getNormalBounds(),            // dimensione «normale», anche se ora è massimizzata
      massimizzata: win.isMaximized(),
      schermoIntero: win.isFullScreen()
    };
    fsSync.writeFileSync(FILE_FINESTRA(), JSON.stringify(stato));
  } catch (e) {}
}

function createWindow () {
  // Finestra iniziale più larga: con 1280 i pulsanti fissi «Guida» e «Segnala» finivano
  // sopra la scheda. Si prende quasi tutto lo schermo disponibile ma con un tetto, così
  // su un monitor grande la finestra non diventa smisurata; su portatili piccoli
  // (1366×768) il minimo garantisce comunque una finestra che ci sta.
  const area = screen.getPrimaryDisplay().workAreaSize;
  const larghezza = Math.max(1100, Math.min(1560, area.width - 80));
  const altezza   = Math.max(700,  Math.min(980,  area.height - 80));
  const stato = leggiStatoFinestra();
  const dove = (stato && stato.bounds) ? stato.bounds : { width: larghezza, height: altezza };
  const win = new BrowserWindow({
    ...dove, minWidth: 900, minHeight: 600, show: false,
    title: 'Training Monitor System',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.removeMenu(); // niente menu Electron (app pulita)
  // si riapre com'era: massimizzata o a schermo intero. La finestra compare solo dopo,
  // così non si vede il salto da «normale» a «grande».
  if (stato && stato.massimizzata) win.maximize();
  if (stato && stato.schermoIntero) win.setFullScreen(true);
  win.once('ready-to-show', () => win.show());
  setTimeout(() => { try { if (!win.isDestroyed() && !win.isVisible()) win.show(); } catch (e) {} }, 4000); // rete di sicurezza
  // F11 = schermo intero (il menu è stato tolto, quindi la scorciatoia va rimessa a mano)
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  let tStato = null;
  const ricorda = () => { clearTimeout(tStato); tStato = setTimeout(() => salvaStatoFinestra(win), 400); };
  ['resize', 'move', 'maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen'].forEach(ev => win.on(ev, ricorda));
  // Link esterni (GitHub, Instagram, YouTube, segnalazioni) → browser di SISTEMA.
  // Senza questo Electron apriva una sua finestra spoglia, senza barra indirizzi né
  // pulsante indietro: l'utente ci restava dentro. Si aprono solo http/https.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });
  // stessa regola per una navigazione fuori da app://tms (es. click su <a> senza target)
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('app://tms')) {
      e.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url).catch(() => {});
    }
  });
  win.on('close', (e) => {
    clearTimeout(tStato); salvaStatoFinestra(win);
    if (!aggiornamento.inCorso) return;
    e.preventDefault();
    const r = dialog.showMessageBoxSync(win, {
      type: 'warning',
      title: 'Aggiornamento in corso',
      message: `Sto ancora scaricando l'aggiornamento (${aggiornamento.percento}%).`,
      detail: 'Se chiudi ora il download si interrompe e l\'app non si aggiorna.\nLascia la finestra aperta ancora qualche istante: a download finito ti propongo io il riavvio.',
      buttons: ['Continua il download', 'Chiudi comunque'],
      defaultId: 0, cancelId: 0, noLink: true
    });
    if (r === 1) { aggiornamento.inCorso = false; win.destroy(); }
  });
  win.loadURL('app://tms/index.html');
}

app.whenReady().then(() => {
  // ── Handler IPC del ponte dati locali ──
  ipcMain.handle('tmsfs:exists', async (e, rel) =>
    (await fileExists(safeJoin(WRITE_ROOT(), rel))) || (await fileExists(safeJoin(SEED_ROOT(), rel))));
  ipcMain.handle('tmsfs:readFile', async (e, rel) => {
    const w = safeJoin(WRITE_ROOT(), rel);
    if (await fileExists(w)) return fs.readFile(w);
    return fs.readFile(safeJoin(SEED_ROOT(), rel));
  });
  ipcMain.handle('tmsfs:writeFile', (e, rel, text) => {
    const lavoro = scriviFile(rel, text);
    scrittureInCorso.add(lavoro);
    const fine = () => scrittureInCorso.delete(lavoro);
    lavoro.then(fine, fine);
    return lavoro;
  });
  const scriviFile = async (rel, text) => {
    const p = safeJoin(WRITE_ROOT(), rel);
    await fs.mkdir(path.dirname(p), { recursive: true });
    // Scrittura atomica (temp + rename): un crash a metà scrittura non corrompe il
    // file esistente — gli storici sono insostituibili. Se il rename fallisce
    // (file momentaneamente bloccato da antivirus/sync) fallback alla scrittura diretta.
    // il contatore distingue due scritture dello stesso file partite nello stesso millisecondo
    const tmp = p + '.tmp-' + process.pid + '-' + Date.now() + '-' + (contaTmp++);
    try {
      await fs.writeFile(tmp, text, 'utf8');
      await fs.rename(tmp, p);
    } catch (err) {
      try { await fs.rm(tmp, { force: true }); } catch (e2) {}
      await fs.writeFile(p, text, 'utf8');
    }
  };
  ipcMain.handle('tmsfs:mkdir', (e, rel) => fs.mkdir(safeJoin(WRITE_ROOT(), rel), { recursive: true }));
  ipcMain.handle('tmsfs:remove', async (e, rel) => {  // mai sul seed: solo userData
    try { await fs.rm(safeJoin(WRITE_ROOT(), rel)); } catch (err) {}
  });
  // Cestino interno: sposta una cartella (es. un profilo eliminato) in
  // <cartella-madre>/_eliminati/<nome>-<data-ora>. Non distrugge nulla — i dati dei
  // clienti si recuperano a mano da lì — e libera il nome: senza, un profilo nuovo con
  // lo stesso nome ereditava i file di quello eliminato (fs.rm non toglie cartelle piene).
  // Solo dentro userData, mai la radice, mai il seed.
  ipcMain.handle('tmsfs:cestina', async (e, rel) => {
    const root = WRITE_ROOT();
    const da = safeJoin(root, rel);
    if (da === root) throw new Error('percorso non consentito: radice');
    if (!(await fileExists(da))) return null;   // esisteva solo nel seed: niente da spostare
    const cestino = path.join(path.dirname(da), '_eliminati');
    await fs.mkdir(cestino, { recursive: true });
    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const a = safeJoin(root, path.relative(root, path.join(cestino, path.basename(da) + '-' + marca)));
    await fs.rename(da, a);
    return path.relative(root, a).split(path.sep).join('/');
  });
  ipcMain.handle('tmsfs:dataRoot', () => WRITE_ROOT());

  // ── Cartella scelta dall'utente (window.tmsScambio) ──
  // Nata il 2026-11-17 come cartella di Google Drive condivisa col telefono; dal 2026-11-25 (il telefono
  // passa dall'hub del TMS) serve alla COPIA DEI BACKUP fuori dal PC: una cartella dentro OneDrive, Google
  // Drive, MEGA o una chiavetta (src/app/14-backup.js, bkEstCopia). La sceglie l'utente con il selettore
  // di sistema; il percorso resta qui, in userData/scambio.json, e la pagina non lo
  // passa mai: chiede solo file RELATIVI a quella cartella. Stesse protezioni dei dati: niente
  // uscite dalla cartella (safeJoin), solo file .json, scrittura atomica (temp + rename).
  // «Illeggibile» e «assente» si distinguono, così la pagina non scambia un file a metà per uno
  // che non c'è. I dati dentro sono cifrati dalla pagina (il codice di collegamento non passa di qui).
  const FILE_SCAMBIO = () => path.join(app.getPath('userData'), 'scambio.json');
  const cartellaScambio = () => {
    try {
      const s = JSON.parse(fsSync.readFileSync(FILE_SCAMBIO(), 'utf8'));
      return (s && typeof s.cartella === 'string' && path.isAbsolute(s.cartella)) ? path.normalize(s.cartella) : '';
    } catch (e) { return ''; }
  };
  const radiceScambio = () => {
    const c = cartellaScambio();
    if (!c) throw new Error('cartella condivisa non scelta');
    return c.replace(/[\\/]+$/, '');
  };
  const soloJson = (rel) => { if (!/\.json$/i.test(String(rel || ''))) throw new Error('nella cartella condivisa solo file .json: ' + rel); };
  ipcMain.handle('scambio:cartella', () => cartellaScambio());
  ipcMain.handle('scambio:scegli', async (e) => {
    const prima = cartellaScambio();
    const casa = require('node:os').homedir(), od = process.env.OneDrive || process.env.OneDriveConsumer || '';
    const suggerita = prima || (od && fsSync.existsSync(od) ? od : casa);
    const r = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
      title: 'Cartella per la copia dei backup del TMS', defaultPath: suggerita,
      properties: ['openDirectory', 'createDirectory'] });
    if (r.canceled || !r.filePaths || !r.filePaths[0]) return prima;
    const scelta = path.normalize(r.filePaths[0]);
    // mai la cartella dei dati (o una che la contiene): lì scrive solo il ponte dei dati
    const dati = path.normalize(WRITE_ROOT());
    if (scelta === dati || dati.startsWith(scelta.replace(/[\\/]+$/, '') + path.sep) || scelta.startsWith(dati + path.sep) || path.parse(scelta).root === scelta)
      throw new Error('questa cartella non si può usare (è la cartella dei dati, la contiene o è un disco intero): ' + scelta);
    fsSync.writeFileSync(FILE_SCAMBIO(), JSON.stringify({ cartella: scelta }));
    return scelta;
  });
  ipcMain.handle('scambio:scollega', async () => { try { await fs.rm(FILE_SCAMBIO(), { force: true }); } catch (e) {} return ''; });
  ipcMain.handle('scambio:leggi', async (e, rel) => {
    const p = safeJoin(radiceScambio(), rel);
    try { return { stato: 'ok', testo: await fs.readFile(p, 'utf8') }; }
    catch (err) { return (err && err.code === 'ENOENT') ? { stato: 'assente' } : { stato: 'illeggibile', errore: String((err && err.message) || err) }; }
  });
  ipcMain.handle('scambio:elenca', async (e, rel) => {
    const p = safeJoin(radiceScambio(), rel);
    try { return (await fs.readdir(p, { withFileTypes: true })).filter(d => d.isFile() && /\.json$/i.test(d.name)).map(d => d.name); }
    catch (err) { if (err && err.code === 'ENOENT') return []; throw err; }
  });
  ipcMain.handle('scambio:scrivi', (e, rel, text) => {
    const lavoro = (async () => {
      soloJson(rel);
      const p = safeJoin(radiceScambio(), rel);
      await fs.mkdir(path.dirname(p), { recursive: true });
      const tmp = p + '.tmp-' + process.pid + '-' + Date.now() + '-' + (contaTmp++);
      try { await fs.writeFile(tmp, String(text), 'utf8'); await fs.rename(tmp, p); }
      catch (err) { try { await fs.rm(tmp, { force: true }); } catch (e2) {} await fs.writeFile(p, String(text), 'utf8'); }
    })();
    scrittureInCorso.add(lavoro);
    const fine = () => scrittureInCorso.delete(lavoro);
    lavoro.then(fine, fine);
    return lavoro;
  });
  ipcMain.handle('scambio:togli', async (e, rel) => {
    soloJson(rel);
    const root = radiceScambio(), p = safeJoin(root, rel);
    if (p === root) throw new Error('percorso non consentito: radice');
    await fs.rm(p, { force: true });
  });

  // Permessi File System Access: Electron non ha la UI permessi di Chrome, quindi
  // queryPermission() sull'handle ripristinato da IndexedDB risponderebbe sempre 'prompt'
  // e l'app si fermerebbe al gate ad ogni avvio. Auto-concediamo il permesso 'fileSystem'
  // SOLO alla nostra origine app://tms -> riconnessione automatica come nel browser.
  const isTms = (origin) => typeof origin === 'string' && origin.startsWith('app://tms');
  // whitelist esplicita: oltre a fileSystem (solo origine app://tms) servono soltanto
  // fullscreen (player video) e clipboard-sanitized-write (copia testo); il resto è negato
  const PERMESSI_OK = ['fullscreen', 'clipboard-sanitized-write'];
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    if (permission === 'fileSystem') return callback(isTms(details.requestingUrl || wc.getURL()));
    callback(PERMESSI_OK.includes(permission));
  });
  session.defaultSession.setPermissionCheckHandler((wc, permission, requestingOrigin) => {
    if (permission === 'fileSystem') return isTms(requestingOrigin);
    return PERMESSI_OK.includes(permission);
  });

  // Aggiornamento dalle RELEASE GITHUB (electron-updater + target NSIS, github.com/marcomartinellione-create/TMS).
  // Dal 12 al 18/11/2026 l'app guardava la cartella release/ del PC (TMS solo locale); il 18/11/2026 Marco ha
  // chiesto di «rimettere online su git il tutto»: si torna al flusso usato fino alla v1.1.17.
  // Solo nell'app installata (non in `npm start`):
  //  1. all'avvio controlla l'ultima release; se è più nuova CHIEDE prima di scaricare, con le novità
  //     (corpo della release) e l'avviso di AGGIORNAMENTO MAGGIORE se sale la prima o la seconda cifra;
  //  2. durante il download: percentuale nel titolo + barra sulla taskbar, chiusura trattenuta (vedi
  //     createWindow), errori a video solo se il download l'aveva chiesto l'utente;
  //  3. a download finito propone il riavvio (oppure installa alla prossima chiusura). L'impronta sha512
  //     dell'installer la controlla electron-updater contro il latest.yml della release.
  // L'ultimo avviso resta in memoria: la pagina, appena pronta, lo richiede con l'azione 'chiedi' (un
  // controllo arrivato prima che si mettesse in ascolto andava perso). Eventi in TMS/update.log.
  if (app.isPackaged) {
    autoUpdater.autoDownload = false;

    const updLog = (...m) => { fs.appendFile(path.join(WRITE_ROOT(), 'update.log'),
      new Date().toISOString() + '  ' + m.join(' ') + '\n').catch(() => {}); };
    const setProgress = (frazione, titolo) => {
      for (const w of BrowserWindow.getAllWindows()) {
        try { w.setProgressBar(frazione); w.setTitle(titolo || 'Training Monitor System'); } catch (e) {}
      }
    };
    const versioni = v => String(v || '').split('.').map(n => parseInt(n, 10) || 0);
    const isMaggiore = (attuale, nuova) => {
      const [aM, am] = versioni(attuale), [nM, nm] = versioni(nuova);
      return nM > aM || (nM === aM && nm > am);
    };
    const anteprimaNote = (rn) => {
      let s = Array.isArray(rn) ? rn.map(n => (n && n.note) || '').join('\n') : String(rn || '');
      s = s.replace(/<[^>]+>/g, '').replace(/^#+\s*/gm, '').replace(/\*\*?|__|`/g, '')
           .replace(/^>\s?/gm, '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
      if (s.length > 900) s = s.slice(0, 900).trimEnd() + '\n…';
      return s || 'Nessuna nota di rilascio disponibile.';
    };

    /* i dialoghi dell'updater li disegna l'app (modali in stile pergamena): il main manda l'evento
       al renderer e riceve la decisione via 'tms-update-azione' */
    let ultimoAvviso = null;
    const inviaUpdate = (dati) => {
      ultimoAvviso = dati;
      const manda = () => { const w = BrowserWindow.getAllWindows()[0]; if (w) try { w.webContents.send('tms-update', dati); } catch (e) {} };
      const w = BrowserWindow.getAllWindows()[0];
      if (!w) { setTimeout(manda, 1500); return; }
      if (w.webContents.isLoading()) w.webContents.once('did-finish-load', manda); else manda();
    };
    let infoDisponibile = null, scaricatoPronto = false;

    autoUpdater.on('update-available', (info) => {
      const attuale = app.getVersion();
      const maggiore = isMaggiore(attuale, info.version);
      infoDisponibile = info;
      updLog('disponibile', info.version, '(attuale ' + attuale + (maggiore ? ', MAGGIORE' : '') + ')');
      inviaUpdate({ tipo: 'disponibile', versione: info.version, attuale: attuale,
        maggiore: maggiore, note: anteprimaNote(info.releaseNotes) });
    });
    autoUpdater.on('update-not-available', (info) => {
      updLog('nessuna versione nuova (GitHub: v' + ((info && info.version) || '?') + ', installata: v' + app.getVersion() + ')');
    });

    ipcMain.on('tms-update-azione', (e, azione) => {
      if (azione === 'chiedi') {
        if (ultimoAvviso && !aggiornamento.inCorso) { try { e.sender.send('tms-update', ultimoAvviso); updLog('avviso rimandato alla pagina'); } catch (err) {} }
        return;
      }
      if ((azione === 'scarica' || azione === 'installa') && infoDisponibile && !aggiornamento.inCorso && !scaricatoPronto) {
        aggiornamento.inCorso = true; aggiornamento.percento = 0;
        setProgress(0, 'Training Monitor System — scarico l\'aggiornamento… 0%');
        updLog('download avviato', infoDisponibile.version);
        autoUpdater.downloadUpdate().catch(() => { /* gestito da on(error) */ });
      } else if (azione === 'dopo') {
        updLog('rimandato dall\'utente');
      } else if (azione === 'riavvia' && scaricatoPronto) {
        updLog('riavvio per installare');
        autoUpdater.quitAndInstall();
      }
    });

    autoUpdater.on('download-progress', (p) => {
      aggiornamento.percento = Math.round(p.percent || 0);
      setProgress((p.percent || 0) / 100,
        `Training Monitor System — scarico l'aggiornamento… ${aggiornamento.percento}%`);
    });

    autoUpdater.on('update-downloaded', (info) => {
      aggiornamento.inCorso = false;
      scaricatoPronto = true;
      setProgress(-1);
      updLog('scaricato', info.version);
      inviaUpdate({ tipo: 'pronto', versione: info.version });
    });

    autoUpdater.on('error', (err) => {
      updLog('ERRORE', (err && err.message) || String(err));
      const eraInCorso = aggiornamento.inCorso;
      aggiornamento.inCorso = false;
      setProgress(-1);
      /* silenzio per i controlli all'avvio (offline ecc.); a video solo se l'utente aveva avviato il download */
      if (eraInCorso) dialog.showMessageBox({
        type: 'error',
        title: 'Aggiornamento TMS',
        message: 'Il download dell\'aggiornamento non è riuscito.',
        detail: 'Controlla la connessione: riproverò al prossimo avvio (il download riprende da dove si era fermato).\n\nDettaglio tecnico: ' + ((err && err.message) || err),
        buttons: ['OK']
      }).catch(() => {});
    });
    autoUpdater.checkForUpdates().catch(() => {});
  }

  // serve i file della cartella renderer/ sotto app://tms/...
  protocol.handle('app', (request) => {
    const url = new URL(request.url);            // es. app://tms/index.html
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const rendererDir = path.join(__dirname, 'renderer');
    const file = path.join(rendererDir, path.normalize(rel));
    // protezione path traversal: il percorso risolto deve restare DENTRO renderer/
    // (path.relative copre anche i casi limite che startsWith non vede, es. "renderer-x")
    const fuori = path.relative(rendererDir, file);
    if (fuori.startsWith('..') || path.isAbsolute(fuori)) {
      return new Response('Forbidden', { status: 403 });
    }
    return net.fetch(pathToFileURL(file).toString());
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', async () => {
  if (process.platform === 'darwin') return;
  // un giro di attesa perché arrivino gli ultimi messaggi del renderer, poi le scritture
  try { await new Promise(r => setTimeout(r, 50)); await Promise.allSettled([...scrittureInCorso]); } catch (e) {}
  app.quit();
});
