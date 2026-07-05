/* genera-icone-app.js — icone PWA (docs/app/icon-192.png, icon-512.png).
 *
 * Su richiesta di Marco (2026-07-05): icona TUTTA NERA con il simbolo ✦ del TMS,
 * senza cornice/margine pergamena. La stella a 4 punte (verticale più lunga, come
 * il logo) viene disegnata direttamente su fondo scuro pieno edge-to-edge; il
 * pallino centrale chiaro riprende il logo. Compatibile maskable (safe zone 80%).
 *
 * Uso (dalla root del progetto):
 *   electron\node_modules\.bin\electron.cmd tools\genera-icone-app.js
 */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

app.disableHardwareAcceleration();

const OUT = path.join(__dirname, '..', 'docs', 'app');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 600, height: 600, webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html,<body style="margin:0"><canvas id="c"></canvas></body>');

  async function icona(size) {
    return await win.webContents.executeJavaScript(`(function(){
      var S=${size}, c=document.getElementById('c'); c.width=S; c.height=S;
      var x=c.getContext('2d'), cx=S/2, cy=S/2;
      x.fillStyle='#0d0b08'; x.fillRect(0,0,S,S);            /* fondo nero caldo, pieno */
      var a=S*0.40,  /* punta verticale  */
          b=S*0.285, /* punta orizzontale */
          w=S*0.052; /* vita della stella */
      x.fillStyle='#e39230';
      x.beginPath();
      x.moveTo(cx, cy-a); x.lineTo(cx+w, cy-w); x.lineTo(cx+b, cy); x.lineTo(cx+w, cy+w);
      x.lineTo(cx, cy+a); x.lineTo(cx-w, cy+w); x.lineTo(cx-b, cy); x.lineTo(cx-w, cy-w);
      x.closePath(); x.fill();
      x.fillStyle='#f4ead8';                                  /* pallino centrale chiaro */
      x.beginPath(); x.arc(cx, cy, S*0.045, 0, Math.PI*2); x.fill();
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
