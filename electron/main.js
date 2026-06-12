// TMS — Training Monitor System · wrapper Electron (HANDOFF.md §4.3)
// Serve renderer/ da uno scheme privilegiato e SICURO (app://tms) così che:
//  - window.showDirectoryPicker (File System Access API) sia disponibile (secure context)
//  - IndexedDB abbia origine stabile -> l'handle cartella persiste tra i riavvii
const { app, BrowserWindow, protocol, net, session, dialog, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
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

protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
}]);

// stato del download aggiornamento (vedi blocco auto-update): finché è in corso,
// la chiusura della finestra viene trattenuta con un avviso — altrimenti l'utente
// chiude a download a metà e "non si aggiorna mai" (segnalato da Marco, v1.0.62→63)
const aggiornamento = { inCorso: false, percento: 0 };

function createWindow () {
  const win = new BrowserWindow({
    width: 1280, height: 860,
    title: 'Training Monitor System',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.removeMenu(); // niente menu Electron (app pulita)
  win.on('close', (e) => {
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
  ipcMain.handle('tmsfs:writeFile', async (e, rel, text) => {
    const p = safeJoin(WRITE_ROOT(), rel);
    await fs.mkdir(path.dirname(p), { recursive: true });
    // Scrittura atomica (temp + rename): un crash a metà scrittura non corrompe il
    // file esistente — gli storici sono insostituibili. Se il rename fallisce
    // (file momentaneamente bloccato da antivirus/sync) fallback alla scrittura diretta.
    const tmp = p + '.tmp-' + process.pid + '-' + Date.now();
    try {
      await fs.writeFile(tmp, text, 'utf8');
      await fs.rename(tmp, p);
    } catch (err) {
      try { await fs.rm(tmp, { force: true }); } catch (e2) {}
      await fs.writeFile(p, text, 'utf8');
    }
  });
  ipcMain.handle('tmsfs:mkdir', (e, rel) => fs.mkdir(safeJoin(WRITE_ROOT(), rel), { recursive: true }));
  ipcMain.handle('tmsfs:remove', async (e, rel) => {  // mai sul seed: solo userData
    try { await fs.rm(safeJoin(WRITE_ROOT(), rel)); } catch (err) {}
  });
  ipcMain.handle('tmsfs:dataRoot', () => WRITE_ROOT());

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

  // Auto-update via GitHub Releases (electron-updater + target NSIS).
  // Solo nell'app installata (non in `npm start`). Flusso (dal v1.0.60, rifinito v1.0.64):
  //  1. all'avvio controlla le release; se ce n'è una nuova CHIEDE prima di scaricare,
  //     mostrando un'anteprima delle novità (corpo della release GitHub);
  //  2. se sale la versione "di mezzo" o la prima (es. 1.0.4 -> 1.1.4) il dialogo
  //     segnala che si tratta di un AGGIORNAMENTO MAGGIORE;
  //  3. durante il download: percentuale nel titolo + barra sulla taskbar, chiusura
  //     trattenuta (vedi createWindow), errori a video; eventi in TMS/update.log;
  //  4. a download completato propone il riavvio (o installa alla chiusura).
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
      s = s.replace(/<[^>]+>/g, '')        // eventuale HTML
           .replace(/^#+\s*/gm, '')        // titoli markdown
           .replace(/\*\*?|__|`/g, '')     // enfasi markdown
           .replace(/^>\s?/gm, '')         // citazioni
           .replace(/\r/g, '')
           .replace(/\n{3,}/g, '\n\n')
           .trim();
      if (s.length > 900) s = s.slice(0, 900).trimEnd() + '\n…';
      return s || 'Nessuna nota di rilascio disponibile.';
    };

    /* i dialoghi dell'updater sono renderizzati DALL'APP (stile pergamena, dal v1.0.73):
       il main manda l'evento al renderer e riceve la decisione via 'tms-update-azione' */
    const inviaUpdate = (dati) => {
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

    ipcMain.on('tms-update-azione', (e, azione) => {
      if (azione === 'scarica' && infoDisponibile) {
        aggiornamento.inCorso = true; aggiornamento.percento = 0;
        setProgress(0, 'Training Monitor System — scarico l\'aggiornamento… 0%');
        updLog('download avviato', infoDisponibile.version);
        autoUpdater.downloadUpdate().catch(() => { /* gestito da on(error) */ });
      } else if (azione === 'dopo') {
        updLog('rimandato dall\'utente');
      } else if (azione === 'riavvia' && scaricatoPronto) {
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

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
