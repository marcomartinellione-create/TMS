/* genera-icona-tms.js — icone dei file .tms (un cliente esportato) e .tmsb (backup di tutto), per Esplora risorse.
 *
 * Richiesta di Marco (2026-11-26): «diamo anche un'icona personalizzata ai file .tms». Un foglio color
 * pergamena con l'angolo piegato e la stella del logo del TMS (quattro bracci uguali, arancio col pallino
 * chiaro); dai 48 px in su anche una fascia scura con «TMS» in oro, come la barra dell'app. Nelle misure
 * piccole (16–32 px) solo foglio e stella, più grande, perché si riconosca.
 * Il .tmsb (2026-11-26, «diamo un'icona anche per i .tmsb») è lo stesso foglio con altri due fogli dietro, sfalsati:
 * una pila, cioè «tutto il TMS» invece di un cliente solo.
 * Scrive electron/build/tms.ico e tmsb.ico (PNG dentro l'ICO, misure 16–256), usate da fileAssociations
 * (electron/package.json). Con TMS_ANTEPRIMA=<file.png> salva anche le misure 256 e 32 per guardarle.
 *
 * Uso (dalla root del progetto):
 *   electron\node_modules\.bin\electron.cmd tools\genera-icona-tms.js
 */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

app.disableHardwareAcceleration();
const CARTELLA = path.join(__dirname, '..', 'electron', 'build');
const MISURE = [16, 24, 32, 48, 64, 128, 256];

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 600, height: 600, webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html,<body style="margin:0"><canvas id="c"></canvas></body>');
  async function disegna(S, pila) {
    return await win.webContents.executeJavaScript(`(function(){
      var S=${S}, pila=${pila ? 'true' : 'false'}, c=document.getElementById('c'); c.width=S; c.height=S;
      var x=c.getContext('2d'); x.clearRect(0,0,S,S);
      var piccola=S<=32, lw=Math.max(1, S/40);
      /* il foglio con l'angolo piegato (nel .tmsb un po' più stretto, in basso a sinistra, coi due fogli dietro) */
      var x0=S*(piccola?0.12:0.15), x1=S*(piccola?0.88:0.85), y0=S*0.05, y1=S*0.95, f=S*(piccola?0.24:0.22);
      x.lineJoin='round';
      if(pila){ var d=S*(piccola?0.09:0.075); x0=S*(piccola?0.04:0.07); x1=x0+S*(piccola?0.72:0.66); y0=S*0.05+2*d; y1=S*0.97;
        for(var k=2;k>=1;k--){ var ox=k*d, oy=-k*d;
          x.beginPath(); x.rect(x0+ox, y0+oy, x1-x0, y1-y0);
          x.fillStyle=k===2?'#d8c39b':'#e7d8bb'; x.fill(); x.lineWidth=lw; x.strokeStyle='#6b4a24'; x.stroke(); } }
      var mx=(x0+x1)/2;
      x.beginPath(); x.moveTo(x0,y0); x.lineTo(x1-f,y0); x.lineTo(x1,y0+f); x.lineTo(x1,y1); x.lineTo(x0,y1); x.closePath();
      x.fillStyle='#f4ead8'; x.fill(); x.lineWidth=lw; x.strokeStyle='#6b4a24'; x.stroke();
      x.beginPath(); x.moveTo(x1-f,y0); x.lineTo(x1-f,y0+f); x.lineTo(x1,y0+f); x.closePath();
      x.fillStyle='#ddc9a3'; x.fill(); x.stroke();
      /* la fascia scura con TMS (dai 48 px) */
      var conFascia=S>=48, H=y1-y0, cy=conFascia? y0+H*0.4 : y0+H*0.5667;
      if(conFascia){ var fy0=y0+H*0.678, fy1=y0+H*0.878;
        var g=x.createLinearGradient(0,fy0,0,fy1); g.addColorStop(0,'#241405'); g.addColorStop(1,'#160b03');
        x.fillStyle=g; x.fillRect(x0+lw/2, fy0, (x1-x0)-lw, fy1-fy0);
        x.fillStyle='#b8860b'; x.fillRect(x0+lw/2, fy1-Math.max(1,S/64), (x1-x0)-lw, Math.max(1,S/64));
        x.fillStyle='#e8c45a'; x.textAlign='center'; x.textBaseline='middle';
        x.font='700 '+Math.round(S*(pila?0.11:0.12))+'px Georgia, "Times New Roman", serif';
        x.fillText('TMS', mx, (fy0+fy1)/2+S*0.005); }
      /* la stella del logo: quattro bracci uguali e il pallino chiaro */
      var a=S*(piccola?(pila?0.22:0.25):(pila?0.18:0.2)), w=a*0.18;
      x.fillStyle='#e8a33d'; x.beginPath();
      x.moveTo(mx, cy-a); x.lineTo(mx+w, cy-w); x.lineTo(mx+a, cy); x.lineTo(mx+w, cy+w);
      x.lineTo(mx, cy+a); x.lineTo(mx-w, cy+w); x.lineTo(mx-a, cy); x.lineTo(mx-w, cy-w); x.closePath(); x.fill();
      if(S>=24){ x.lineWidth=Math.max(0.6, S/96); x.strokeStyle='#9a5b1f'; x.stroke(); }
      x.fillStyle='#f4e2c1'; x.beginPath(); x.arc(mx, cy, Math.max(1, a*0.12), 0, Math.PI*2); x.fill();
      return c.toDataURL('image/png');
    })()`);
  }
  for (const [nome, pila] of [['tms', false], ['tmsb', true]]) {
  const png = [];
  for (const S of MISURE) { const d = await disegna(S, pila); png.push(Buffer.from(d.slice(d.indexOf(',') + 1), 'base64')); }
  const OUT = path.join(CARTELLA, nome + '.ico');
  /* ICO con le immagini PNG dentro (Windows Vista e successivi) */
  const testa = Buffer.alloc(6 + 16 * MISURE.length);
  testa.writeUInt16LE(0, 0); testa.writeUInt16LE(1, 2); testa.writeUInt16LE(MISURE.length, 4);
  let off = testa.length;
  MISURE.forEach((S, i) => { const e = 6 + 16 * i;
    testa.writeUInt8(S >= 256 ? 0 : S, e); testa.writeUInt8(S >= 256 ? 0 : S, e + 1); testa.writeUInt8(0, e + 2); testa.writeUInt8(0, e + 3);
    testa.writeUInt16LE(1, e + 4); testa.writeUInt16LE(32, e + 6); testa.writeUInt32LE(png[i].length, e + 8); testa.writeUInt32LE(off, e + 12);
    off += png[i].length; });
  fs.writeFileSync(OUT, Buffer.concat([testa].concat(png)));
  console.log('  OK  ' + OUT + '  (' + MISURE.join(', ') + ' px)');
  if (process.env.TMS_ANTEPRIMA) { const a = process.env.TMS_ANTEPRIMA.replace(/\.png$/, '-' + nome);
    fs.writeFileSync(a + '.png', png[png.length - 1]); fs.writeFileSync(a + '-32.png', png[2]); fs.writeFileSync(a + '-16.png', png[0]); }
  }
  app.quit();
}).catch(e => { console.error('ERRORE:', e); app.exit(1); });
