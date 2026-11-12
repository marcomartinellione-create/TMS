// TMS — Training Monitor System · wrapper Electron (HANDOFF.md §4.3)
// Serve renderer/ da uno scheme privilegiato e SICURO (app://tms) così che:
//  - window.showDirectoryPicker (File System Access API) sia disponibile (secure context)
//  - IndexedDB abbia origine stabile -> l'handle cartella persiste tra i riavvii
const { app, BrowserWindow, protocol, net, session, dialog, ipcMain, shell, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const { pathToFileURL } = require('node:url');

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

  // Aggiornamento dalla CARTELLA RELEASE LOCALE (dal 2026-11-12, su indicazione di Marco:
  // l'app per ora vive solo sul suo PC, niente più release su GitHub).
  // Solo nell'app installata (non in `npm start`). All'avvio guarda in
  //   <home>\OneDrive\Personale\Claude\TMS\Training Monitor System\release\v<x.y.z>\
  // (o nella cartella scritta in userData\cartella-release.txt, se c'è) la versione più alta
  // che abbia il suo TMS-Setup-<x.y.z>.exe. Se è più nuova di quella installata lo chiede
  // con il modale dell'app; confermando controlla l'impronta sha512 dell'installer contro il
  // latest.yml accanto (un file a metà, per esempio non ancora sincronizzato da OneDrive, non
  // parte), lo copia nella cartella temporanea, chiude l'app (i dati in sospeso si salvano
  // come in ogni chiusura) e lo lancia in modalità silenziosa: a fine installazione l'app si
  // riapre da sola. Eventi in TMS/update.log.
  if (app.isPackaged) {
    const updLog = (...m) => { fs.appendFile(path.join(WRITE_ROOT(), 'update.log'),
      new Date().toISOString() + '  ' + m.join(' ') + '\n').catch(() => {}); };
    const versioni = v => String(v || '').split('.').map(n => parseInt(n, 10) || 0);
    const confronta = (a, b) => { const x = versioni(a), y = versioni(b);
      for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; };
    const isMaggiore = (attuale, nuova) => {
      const [aM, am] = versioni(attuale), [nM, nm] = versioni(nuova);
      return nM > aM || (nM === aM && nm > am);
    };
    const anteprimaNote = (s) => {
      s = String(s || '').replace(/<[^>]+>/g, '').replace(/^#+\s*/gm, '').replace(/\*\*?|__|`/g, '')
        .replace(/^>\s?/gm, '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
      if (s.length > 900) s = s.slice(0, 900).trimEnd() + '\n…';
      return s || 'Nessuna nota di rilascio disponibile.';
    };
    const cartellaRelease = () => {
      try { const p = fsSync.readFileSync(path.join(app.getPath('userData'), 'cartella-release.txt'), 'utf8').trim(); if (p) return p; } catch (e) {}
      return path.join(require('node:os').homedir(), 'OneDrive', 'Personale', 'Claude', 'TMS', 'Training Monitor System', 'release');
    };
    // la versione più alta presente nella cartella, con il suo installer
    const cercaRelease = async () => {
      const dir = cartellaRelease();
      let voci = [];
      try { voci = await fs.readdir(dir, { withFileTypes: true }); } catch (e) { updLog('cartella release non leggibile:', dir); return null; }
      const trovate = [];
      for (const v of voci) {
        const m = v.isDirectory() && /^v(\d+\.\d+\.\d+)$/.exec(v.name);
        if (!m) continue;
        const exe = path.join(dir, v.name, 'TMS-Setup-' + m[1] + '.exe');
        if (await fileExists(exe)) trovate.push({ versione: m[1], exe, cartella: path.join(dir, v.name) });
      }
      trovate.sort((a, b) => confronta(b.versione, a.versione));
      return trovate[0] || null;
    };
    const inviaUpdate = (dati) => {
      const manda = () => { const w = BrowserWindow.getAllWindows()[0]; if (w) try { w.webContents.send('tms-update', dati); } catch (e) {} };
      const w = BrowserWindow.getAllWindows()[0];
      if (!w) { setTimeout(manda, 1500); return; }
      if (w.webContents.isLoading()) w.webContents.once('did-finish-load', manda); else manda();
    };
    let disponibile = null, installerPronto = null;

    // impronta dell'installer contro latest.yml (se c'è): niente installazioni di file a metà
    const verificaInstaller = async (r) => {
      let atteso = null;
      try { const yml = await fs.readFile(path.join(r.cartella, 'latest.yml'), 'utf8');
            const m = /^sha512:\s*(\S+)/m.exec(yml); if (m) atteso = m[1]; } catch (e) {}
      if (!atteso) { updLog('latest.yml assente: installer non verificato', r.exe); return true; }
      const hash = require('node:crypto').createHash('sha512');
      await new Promise((ok, ko) => fsSync.createReadStream(r.exe).on('data', d => hash.update(d)).on('end', ok).on('error', ko));
      return hash.digest('base64') === atteso;
    };

    ipcMain.on('tms-update-azione', async (e, azione) => {
      if (azione === 'dopo') { updLog('rimandato dall\'utente'); return; }
      if ((azione !== 'scarica' && azione !== 'installa') || !disponibile || installerPronto) return;
      updLog('installazione richiesta', disponibile.versione, disponibile.exe);
      try {
        if (!(await verificaInstaller(disponibile))) throw new Error('l\'impronta dell\'installer non corrisponde a latest.yml (file incompleto o ancora in sincronizzazione)');
        const copia = path.join(app.getPath('temp'), 'TMS-Setup-' + disponibile.versione + '.exe');
        await fs.copyFile(disponibile.exe, copia);
        installerPronto = copia;
        updLog('installer pronto', copia, '— chiudo l\'app e installo');
        for (const w of BrowserWindow.getAllWindows()) { try { w.close(); } catch (err) {} }
      } catch (err) {
        updLog('ERRORE', (err && err.message) || String(err));
        dialog.showMessageBox({
          type: 'error', title: 'Aggiornamento TMS',
          message: 'Non riesco a installare la versione ' + disponibile.versione + '.',
          detail: 'Controlla che il file sia completo in ' + disponibile.cartella + ' (OneDrive deve averlo scaricato del tutto) e riavvia l\'app per riprovare.\n\nDettaglio tecnico: ' + ((err && err.message) || err),
          buttons: ['OK']
        }).catch(() => {});
      }
    });
    // l'installer parte quando l'app è già chiusa e ha salvato tutto (vedi window-all-closed)
    app.on('will-quit', () => {
      if (!installerPronto) return;
      try {
        require('node:child_process').spawn(installerPronto, ['--updated', '/S', '--force-run'], { detached: true, stdio: 'ignore' }).unref();
        updLog('installer avviato', installerPronto);
      } catch (err) { updLog('ERRORE avvio installer', (err && err.message) || String(err)); }
    });

    cercaRelease().then(async (r) => {
      const attuale = app.getVersion();
      if (!r) return;
      if (confronta(r.versione, attuale) <= 0) { updLog('nessuna versione nuova (cartella: v' + r.versione + ', installata: v' + attuale + ')'); return; }
      let note = '';
      try { note = await fs.readFile(path.join(r.cartella, 'RELEASE_NOTES.md'), 'utf8'); } catch (e) {}
      disponibile = r;
      const maggiore = isMaggiore(attuale, r.versione);
      updLog('disponibile', r.versione, '(attuale ' + attuale + (maggiore ? ', MAGGIORE' : '') + ')', r.exe);
      inviaUpdate({ tipo: 'disponibile', locale: true, versione: r.versione, attuale, maggiore, note: anteprimaNote(note) });
    }).catch(err => updLog('ERRORE controllo', (err && err.message) || String(err)));
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
