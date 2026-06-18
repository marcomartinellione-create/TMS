/* genera-foto-demo.js — foto progressi DEMO per il profilo "Atleta Template".
 *
 * Genera immagini placeholder (sfondo nero + data e vista in bianco) per provare la
 * sezione 📸 Foto progressi del tab Corpo, e aggiunge i metadati a template/corpo.json.
 * NON sono foto reali: solo segnaposto per il collaudo della funzione.
 *
 * Uso (dalla root del progetto):
 *   electron\node_modules\.bin\electron.cmd tools\genera-foto-demo.js [TMS_Dati ...]
 * Senza argomenti usa TMS_Dati del progetto. Si possono passare più cartelle TMS_Dati
 * (es. anche quella dell'app installata in %APPDATA%\Training Monitor System\TMS\TMS_Dati).
 */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

app.disableHardwareAcceleration();

const DATE = ['2026-01-05', '2026-02-02', '2026-03-02', '2026-04-06', '2026-05-04', '2026-06-01'];
const VISTE = [['anteriore', 'Anteriore'], ['laterale', 'Laterale'], ['posteriore', 'Posteriore']];
const fmtIt = d => { const [y, m, g] = d.split('-'); return g + '/' + m + '/' + y.slice(2); };

const targets = (process.argv.slice(2).filter(a => !a.startsWith('--')));
if (!targets.length) targets.push(path.join(__dirname, '..', 'TMS_Dati'));

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 360, height: 480, webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html,<body style="margin:0"><canvas id="c"></canvas></body>');

  async function disegna(dataIt, vista) {
    return await win.webContents.executeJavaScript(`(function(){
      var W=720,H=960,c=document.getElementById('c'); c.width=W; c.height=H;
      var x=c.getContext('2d');
      x.fillStyle='#000'; x.fillRect(0,0,W,H);
      x.strokeStyle='#3a3a3a'; x.lineWidth=6; x.strokeRect(24,24,W-48,H-48);
      x.fillStyle='#fff'; x.textAlign='center';
      x.font='bold 72px sans-serif'; x.fillText(${JSON.stringify(dataIt)}, W/2, H/2-18);
      x.font='44px sans-serif'; x.fillText(${JSON.stringify(vista)}, W/2, H/2+52);
      x.fillStyle='#8a8a8a'; x.font='28px sans-serif'; x.fillText('FOTO DEMO', W/2, H-70);
      return c.toDataURL('image/jpeg', 0.85);
    })()`);
  }

  let totImg = 0;
  const meta = [];
  for (const d of DATE) {
    for (const [tag, label] of VISTE) {
      const dataUrl = await disegna(fmtIt(d) + ' ·', label);
      const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
      const file = 'demo-' + d + '-' + tag + '.jpg';
      meta.push({ file, data: d, tag });
      for (const td of targets) {
        const dir = path.join(td, 'template', 'foto');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, file), bytes);
      }
      totImg++;
    }
  }

  for (const td of targets) {
    const corpoP = path.join(td, 'template', 'corpo.json');
    if (!fs.existsSync(corpoP)) { console.log('  (salto, manca: ' + corpoP + ')'); continue; }
    let obj; try { obj = JSON.parse(fs.readFileSync(corpoP, 'utf8')); } catch (e) { console.log('  ERRORE leggendo ' + corpoP + ': ' + e.message); continue; }
    obj.foto = (obj.foto || []).filter(f => !/^demo-/.test(String(f.file || ''))).concat(meta);
    fs.writeFileSync(corpoP, JSON.stringify(obj, null, 2), 'utf8');
    console.log('  OK  ' + corpoP + '  (foto: ' + obj.foto.length + ')');
  }

  console.log('Generate ' + totImg + ' immagini demo (' + DATE.length + ' date × ' + VISTE.length + ' viste) in ' + targets.length + ' cartella/e.');
  app.quit();
}).catch(e => { console.error('ERRORE:', e); app.exit(1); });
