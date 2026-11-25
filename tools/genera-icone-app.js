/* genera-icone-app.js — icone dell'app del telefono (app-android/web/icon-192.png, icon-512.png).
 *
 * Su richiesta di Marco (2026-07-05): icona TUTTA NERA con il simbolo ✦ del TMS,
 * senza cornice/margine pergamena, su fondo scuro pieno edge-to-edge.
 * Dal 25/11/2026 («il logo è stretchato, usa quello pc») la stella è quella del logo
 * del PC (logo.png, icona dell'installer): quattro bracci uguali, stessa vita, stessi
 * colori e stesso pallino centrale. Compatibile maskable (safe zone 80%).
 *
 * Uso (dalla root del progetto):
 *   electron\node_modules\.bin\electron.cmd tools\genera-icone-app.js
 */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

app.disableHardwareAcceleration();

const OUT = path.join(__dirname, '..', 'app-android', 'web');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 600, height: 600, webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html,<body style="margin:0"><canvas id="c"></canvas></body>');

  async function icona(size) {
    return await win.webContents.executeJavaScript(`(function(){
      var S=${size}, c=document.getElementById('c'); c.width=S; c.height=S;
      var x=c.getContext('2d'), cx=S/2, cy=S/2;
      x.fillStyle='#0d0b08'; x.fillRect(0,0,S,S);            /* fondo nero caldo, pieno */
      /* misure prese da logo.png (256 px): punte a 86 px dal centro, vita a 16, pallino di 21 */
      var a=S*0.336, /* punta verticale  */
          b=S*0.336, /* punta orizzontale: uguale, come nel logo del PC */
          w=S*0.062; /* vita della stella */
      x.fillStyle='#e8a33d';
      x.beginPath();
      x.moveTo(cx, cy-a); x.lineTo(cx+w, cy-w); x.lineTo(cx+b, cy); x.lineTo(cx+w, cy+w);
      x.lineTo(cx, cy+a); x.lineTo(cx-w, cy+w); x.lineTo(cx-b, cy); x.lineTo(cx-w, cy-w);
      x.closePath(); x.fill();
      x.fillStyle='#f4e2c1';                                  /* pallino centrale chiaro */
      x.beginPath(); x.arc(cx, cy, S*0.041, 0, Math.PI*2); x.fill();
      return c.toDataURL('image/png');
    })()`);
  }

  for (const size of [192, 512]) {
    const dataUrl = await icona(size);
    const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
    const f = path.join(OUT, 'icon-' + size + '.png');
    fs.writeFileSync(f, bytes);
    console.log('  OK  ' + f + '  (' + bytes.length + ' byte)');
  }
  app.quit();
}).catch(e => { console.error('ERRORE:', e); app.exit(1); });
