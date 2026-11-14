/* prepara-www.js — porta la PWA di docs/app/ dentro l'APK (cartella www/, che Capacitor impacchetta).

   L'APK NON riscrive la PWA: ne prende i file così come sono e fa solo poche modifiche,
   ognuna cercata con un conteggio ASSERITO (se la PWA cambia in quel punto, lo script si
   ferma e dice dove, invece di produrre un'app sbagliata in silenzio):
     1. via il service worker: i file sono già dentro l'app, e una copia in cache potrebbe
        mostrare la versione vecchia dopo un aggiornamento dell'APK;
     2. i confirm() di sistema diventano conferme in stile app (await tmsConferma, in nativo.js);
     3. delEsercizio diventa async (contiene una di quelle conferme);
     4. si carica nativo.js subito dopo lo script della PWA.
   Poi controlla che lo script modificato e nativo.js siano JavaScript valido.

   Uso (dalla cartella app-android/):
     node scripts/prepara-www.js             scrive www/
     node scripts/prepara-www.js --verifica  controlla soltanto, non scrive niente */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const QUI = path.join(__dirname, '..');
const PWA = path.join(QUI, '..', 'docs', 'app');
const WWW = path.join(QUI, 'www');
const NATIVO = path.join(QUI, 'nativo', 'nativo.js');
const VERIFICA = process.argv.includes('--verifica');
/* file della PWA che servono all'app (sw.js NO: vedi sopra) */
const FILE = ['index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'qr-ig.png', 'qr-yt.png', 'qr-gh.png'];

function ferma(msg) {
  console.error('\nprepara-www: ' + msg);
  console.error('La PWA (docs/app/index.html) è cambiata in un punto che l\'APK modifica:');
  console.error('aggiorna app-android/scripts/prepara-www.js (e se serve nativo/nativo.js), poi riprova.\n');
  process.exit(1);
}
function sostituisci(testo, cerca, metti, attesi, nome) {
  const n = typeof cerca === 'string' ? testo.split(cerca).length - 1 : (testo.match(cerca) || []).length;
  if (n !== attesi) ferma(nome + ': trovati ' + n + ' punti, attesi ' + attesi + '.');
  return typeof cerca === 'string' ? testo.split(cerca).join(metti) : testo.replace(cerca, metti);
}

function preparaIndex() {
  let html = fs.readFileSync(path.join(PWA, 'index.html'), 'utf8');
  html = sostituisci(html,
    "if('serviceWorker' in navigator){ try{ navigator.serviceWorker.register('sw.js'); }catch(e){} }",
    "/* APK: niente service worker, i file sono già dentro l'app (app-android/scripts/prepara-www.js) */",
    1, 'registrazione del service worker');
  html = sostituisci(html, /(^|[^.\w])confirm\(/g, '$1await tmsConferma(', 3, 'conferme di sistema confirm()');
  html = sostituisci(html, 'function delEsercizio(rid){', 'async function delEsercizio(rid){', 1, 'funzione delEsercizio');
  const versione = JSON.parse(fs.readFileSync(path.join(QUI, 'package.json'), 'utf8')).version;
  html = sostituisci(html, '</body>',
    '<script>window.TMS_APK_VERSIONE=' + JSON.stringify(versione) + ';</script>\n<script src="nativo.js"></script>\n</body>',
    1, 'chiusura </body>');
  /* JavaScript valido? (un await fuori da una funzione async qui diventa un errore) */
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  if (!script.length) ferma('nessuno script trovato in index.html');
  script.forEach((s, i) => {
    try { new vm.Script(s, { filename: 'www/index.html (script ' + (i + 1) + ')' }); }
    catch (e) { ferma('lo script modificato non è JavaScript valido: ' + e.message); }
  });
  if (/(^|[^.\w])confirm\(/.test(html)) ferma('è rimasto un confirm() di sistema');
  return { html, versione };
}

const { html, versione } = preparaIndex();
const js = fs.readFileSync(NATIVO, 'utf8');
try { new vm.Script(js, { filename: 'nativo.js' }); }
catch (e) { console.error('nativo.js non è JavaScript valido: ' + e.message); process.exit(1); }
for (const f of FILE) if (!fs.existsSync(path.join(PWA, f))) ferma('manca il file ' + f);

if (VERIFICA) {
  console.log('prepara-www: OK (verifica) — la PWA si impacchetta nell\'APK ' + versione + ' senza sorprese');
  process.exit(0);
}
fs.rmSync(WWW, { recursive: true, force: true });
fs.mkdirSync(WWW, { recursive: true });
for (const f of FILE) if (f !== 'index.html') fs.copyFileSync(path.join(PWA, f), path.join(WWW, f));
fs.writeFileSync(path.join(WWW, 'index.html'), html, 'utf8');
fs.writeFileSync(path.join(WWW, 'nativo.js'), js, 'utf8');
console.log('prepara-www: www/ pronta (PWA di docs/app/ + nativo.js, APK ' + versione + ')');
