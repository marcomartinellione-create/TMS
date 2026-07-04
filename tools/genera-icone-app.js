/* genera-icone-app.js — icone PWA (docs/app/icon-192.png, icon-512.png) dal logo del sito.
 *
 * Il logo (docs/img/logo.png, 256×256 pixel-art) viene riscalato SENZA smoothing
 * (nearest-neighbor, coerente con l'image-rendering:pixelated della landing) su uno
 * sfondo pergamena pieno (le icone maskable non possono avere trasparenze ai bordi).
 *
 * Uso (dalla root del progetto):
 *   electron\node_modules\.bin\electron.cmd tools\genera-icone-app.js
 */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

app.disableHardwareAcceleration();

const LOGO = path.join(__dirname, '..', 'docs', 'img', 'logo.png');
const OUT = path.join(__dirname, '..', 'docs', 'app');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 600, height: 600, webPreferences: { offscreen: true } });
  const logoUri = 'data:image/png;base64,' + fs.readFileSync(LOGO).toString('base64');
  await win.loadURL('data:text/html,<body style="margin:0"><canvas id="c"></canvas></body>');

  async function icona(size) {
    return await win.webContents.executeJavaScript(`(function(){
      return new Promise(function(res){
        var img=new Image();
        img.onload=function(){
          var c=document.getElementById('c'); c.width=${size}; c.height=${size};
          var x=c.getContext('2d');
          x.fillStyle='#f4ead8'; x.fillRect(0,0,${size},${size});           /* sfondo pergamena pieno */
          x.imageSmoothingEnabled=false;                                     /* pixel-art nitida */
          var m=Math.round(${size}*0.10);                                    /* margine per le icone maskable */
          x.drawImage(img, m, m, ${size}-2*m, ${size}-2*m);
          res(c.toDataURL('image/png'));
        };
        img.src=${JSON.stringify(logoUri)};
      });
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
