/* genera-screenshot.js — screenshot automatici dell'app per README e sito (docs/img/).
 *
 * Avvia l'app Electron in sviluppo con una userData TEMPORANEA (i dati reali in
 * %APPDATA%\Training Monitor System NON vengono toccati), attiva il profilo
 * dimostrativo "Atleta Template" e fotografa i tab più rappresentativi.
 *
 * Uso (dalla root del progetto, dopo `npm install` in electron/):
 *   electron\node_modules\.bin\electron.cmd tools\genera-screenshot.js
 *
 * Nota: la finestra dell'app compare per qualche secondo, è normale.
 */
const { app, BrowserWindow, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const OUT = path.join(__dirname, '..', 'docs', 'img');
const tmpData = fs.mkdtempSync(path.join(os.tmpdir(), 'tms-screenshot-'));
app.setPath('userData', tmpData); // PRIMA di caricare il main: scritture solo qui

require(path.join(__dirname, '..', 'electron', 'main.js'));

const attendi = ms => new Promise(r => setTimeout(r, ms));

const SCATTI = [
  { tab: 'allenamento',   file: 'allenamento.png' },
  { tab: 'progressi',     file: 'progressi.png' },
  { tab: 'alimentazione', file: 'alimentazione.png' },
  { tab: 'analisi',       file: 'analisi.png' }
];

app.whenReady().then(async () => {
  try {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) throw new Error('finestra non creata');
    win.setContentSize(1280, 840);

    /* il mouse vero non deve stare sopra la finestra (lascerebbe effetti hover
       negli scatti): la sposto nell'angolo dello schermo più lontano dal cursore */
    const cur = screen.getCursorScreenPoint();
    const area = screen.getDisplayNearestPoint(cur).workArea;
    const [lw, lh] = win.getSize();
    win.setPosition(
      cur.x > area.x + area.width / 2 ? area.x : Math.max(area.x, area.x + area.width - lw),
      cur.y > area.y + area.height / 2 ? area.y : Math.max(area.y, area.y + area.height - lh)
    );

    /* aspetta che il renderer si sia connesso ai dati (shim locale + profili) */
    let pronto = false;
    for (let i = 0; i < 60 && !pronto; i++) {
      pronto = await win.webContents.executeJavaScript(
        'typeof dirHandle!=="undefined" && !!dirHandle && typeof profili!=="undefined" && profili.length>0'
      ).catch(() => false);
      if (!pronto) await attendi(500);
    }
    if (!pronto) throw new Error('app non inizializzata entro 30 s');

    /* userData vergine = disclaimer del primo avvio aperto: va chiuso prima degli scatti */
    await win.webContents.executeJavaScript(
      '(function(){ var d=document.getElementById("disclaimer"); if(d) d.classList.add("hidden"); })()'
    );
    await win.webContents.executeJavaScript('switchProfile("template")');
    await attendi(800);

    fs.mkdirSync(OUT, { recursive: true });
    for (const s of SCATTI) {
      await win.webContents.executeJavaScript('showTab(' + JSON.stringify(s.tab) + ')');
      await attendi(900);
      /* niente promemoria "da aggiornare" negli scatti: è rumore, non una feature */
      await win.webContents.executeJavaScript(
        'document.querySelectorAll(".callout").forEach(function(c){ if(/da aggiornare/.test(c.textContent)) c.remove(); })'
      );
      /* azzera eventuali stati hover residui: puntatore sintetico in un punto neutro */
      win.webContents.sendInputEvent({ type: 'mouseMove', x: 2, y: 2 });
      await attendi(150);
      const img = await win.webContents.capturePage();
      fs.writeFileSync(path.join(OUT, s.file), img.toPNG());
      console.log('  scritto docs/img/' + s.file);
    }
    console.log('Screenshot pronti in docs/img/ (userData temporanea: ' + tmpData + ')');
    app.exit(0);
  } catch (e) {
    console.error('ERRORE screenshot: ' + (e && e.message || e));
    app.exit(1);
  }
});
