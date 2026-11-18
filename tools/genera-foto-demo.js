/* genera-foto-demo.js — foto progressi DEMO per il profilo "Atleta Template".
 *
 * Disegna le immagini segnaposto elencate in template/corpo.json (voci `foto` coi file
 * «demo-…», scritte da tools/genera-profilo-template.py): una sagoma stilizzata che segue
 * peso e massa grassa dello Storico misure di quella settimana (vita più larga col grasso,
 * spalle più larghe con la massa magra), con data, vista e la scritta FOTO DEMO.
 * NON sono foto reali: servono a far vedere Riproduzione e Confronto del tab Corpo.
 * Toglie i vecchi file «demo-…» che l'elenco non contiene più.
 *
 * Uso (dalla root del progetto, DOPO genera-profilo-template.py):
 *   electron\node_modules\.bin\electron.cmd tools\genera-foto-demo.js [TMS_Dati ...]
 * Senza argomenti usa TMS_Dati del progetto. Si possono passare più cartelle TMS_Dati
 * (es. anche quella dell'app installata in %APPDATA%\Training Monitor System\TMS\TMS_Dati).
 */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

app.disableHardwareAcceleration();

const VISTE = { anteriore: 'Anteriore', laterale: 'Laterale', posteriore: 'Posteriore' };
const fmtIt = d => { const [y, m, g] = d.split('-'); return g + '/' + m + '/' + y; };
/* codice settimana ISO AAAASS di una data 'AAAA-MM-GG' */
function codiceSett(iso) {
  const d = new Date(iso + 'T12:00:00Z'); const g = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - g + 3);
  const anno = d.getUTCFullYear(), primo = new Date(Date.UTC(anno, 0, 4));
  const sett = 1 + Math.round(((d - primo) / 86400000 - 3 + ((primo.getUTCDay() + 6) % 7)) / 7);
  return anno * 100 + sett;
}

const targets = (process.argv.slice(2).filter(a => !a.startsWith('--')));
if (!targets.length) targets.push(path.join(__dirname, '..', 'TMS_Dati'));

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 360, height: 480, webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html,<body style="margin:0"><canvas id="c"></canvas></body>');

  async function disegna(o) {
    return await win.webContents.executeJavaScript(`(function(o){
      var W=540,H=720,c=document.getElementById('c'); c.width=W; c.height=H;
      var x=c.getContext('2d');
      var sf=x.createLinearGradient(0,0,0,H); sf.addColorStop(0,'#26211d'); sf.addColorStop(1,'#0e0c0b');
      x.fillStyle=sf; x.fillRect(0,0,W,H);
      x.strokeStyle='#3a332d'; x.lineWidth=4; x.strokeRect(14,14,W-28,H-28);
      /* proporzioni: spalle dalla massa magra, vita e fianchi dal grasso */
      var cx=W/2, sp=96+(o.magra-60)*2.6, vi=50+(o.mg-0.10)*300, fi=64+(o.mg-0.10)*170;
      var pelle=x.createLinearGradient(cx-sp-30,0,cx+sp+30,0);
      pelle.addColorStop(0,'#5f5750'); pelle.addColorStop(0.5,'#a49686'); pelle.addColorStop(1,'#5f5750');
      x.fillStyle=pelle;
      function ellisse(px,py,rx,ry){ x.beginPath(); x.ellipse(px,py,rx,ry,0,0,Math.PI*2); x.fill(); }
      function poli(p){ x.beginPath(); x.moveTo(p[0][0],p[0][1]); for(var i=1;i<p.length;i++){ var q=p[i];
        if(q.length===4) x.quadraticCurveTo(q[0],q[1],q[2],q[3]); else x.lineTo(q[0],q[1]); } x.closePath(); x.fill(); }
      if(o.tag==='laterale'){
        var pe=30+(o.magra-60)*0.9, pa=16+(o.mg-0.10)*260;      /* petto e pancia, di profilo */
        ellisse(cx+4,150,28,35);
        poli([[cx-8,180],[cx+12,180],[cx+14,210],[cx-12,210]]);
        poli([[cx-24,206],[cx+10,204, cx+pe,236],[cx+pe+2,262, cx+pe-6,300],[cx+pa+10,340, cx+pa,392],
              [cx+pa-6,430, cx+24,456],[cx-42,456],[cx-50,430, cx-36,392],[cx-30,330, cx-36,262],[cx-36,222, cx-24,206]]);
        poli([[cx-18,222],[cx+6,226, cx+4,300],[cx+6,380, cx+2,432],[cx-18,432],[cx-22,380, cx-22,300],[cx-26,240, cx-18,222]]);
        poli([[cx-42,450],[cx+24,450],[cx+18,560, cx+16,642],[cx-22,642],[cx-30,560, cx-42,450]]);
      } else {
        ellisse(cx,150,30,36);
        poli([[cx-13,180],[cx+13,180],[cx+15,212],[cx-15,212]]);
        poli([[cx-22,206],[cx-sp+8,206, cx-sp,228],[cx-sp+16,268],[cx-vi-6,330, cx-vi,392],[cx-fi,430, cx-fi,458],
              [cx+fi,458],[cx+fi,430, cx+vi,392],[cx+vi+6,330, cx+sp-16,268],[cx+sp,228],[cx+sp-8,206, cx+22,206]]);
        [-1,1].forEach(function(l){
          poli([[cx+l*sp,222],[cx+l*(sp+16),300, cx+l*(sp+12),430],[cx+l*(sp-8),432],[cx+l*(sp-4),330, cx+l*(sp-18),262]]);
          poli([[cx+l*3,474],[cx+l*fi,456],[cx+l*(fi+2),540, cx+l*(fi-14),642],[cx+l*12,642],[cx+l*10,560, cx+l*3,474]]);
        });
      }
      x.textAlign='center';
      x.fillStyle='#f3ead9'; x.font='bold 30px Georgia, serif'; x.fillText(o.data, W/2, 54);
      x.fillStyle='#d8c6a8'; x.font='20px sans-serif'; x.fillText(o.vista, W/2, 84);
      if(o.peso){ x.fillStyle='#bfb3a3'; x.font='20px sans-serif';
        x.fillText(o.peso.toFixed(1).replace('.',',')+' kg · grasso '+(o.mg*100).toFixed(1).replace('.',',')+' %', W/2, H-46); }
      x.fillStyle='#7d7268'; x.font='bold 16px sans-serif'; x.fillText('FOTO DEMO · Atleta Template', W/2, H-24);
      return c.toDataURL('image/jpeg', 0.82);
    })(${JSON.stringify(o)})`);
  }

  for (const td of targets) {
    const corpoP = path.join(td, 'template', 'corpo.json');
    if (!fs.existsSync(corpoP)) { console.log('  (salto, manca: ' + corpoP + ')'); continue; }
    const corpo = JSON.parse(fs.readFileSync(corpoP, 'utf8'));
    const elenco = (corpo.foto || []).filter(f => /^demo-/.test(String(f.file || '')));
    const io = (corpo.storico_io || []).slice().sort((a, b) => a.scheda - b.scheda);
    const dir = path.join(td, 'template', 'foto');
    fs.mkdirSync(dir, { recursive: true });
    for (const f of elenco) {
      const c = codiceSett(f.data);
      const m = io.filter(r => r.scheda <= c).pop() || io[0] || {};
      const peso = +m.peso || 0, mg = +m.massa_grassa || 0.15;
      const dataUrl = await disegna({ data: fmtIt(f.data), vista: VISTE[f.tag] || f.tag, tag: f.tag, peso, mg, magra: peso * (1 - mg) || 62 });
      fs.writeFileSync(path.join(dir, f.file), Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
    }
    const tenuti = new Set(elenco.map(f => f.file));
    const tolti = fs.readdirSync(dir).filter(n => /^demo-.*\.jpg$/i.test(n) && !tenuti.has(n));
    tolti.forEach(n => fs.unlinkSync(path.join(dir, n)));
    console.log('  OK  ' + dir + '  (' + elenco.length + ' foto disegnate, ' + tolti.length + ' vecchie tolte)');
  }
  app.quit();
}).catch(e => { console.error('ERRORE:', e); app.exit(1); });
