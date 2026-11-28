#!/usr/bin/env node
/* Copia le spiegazioni dei valori del bracciale e del suggerimento della dieta dal PC all'app del telefono.
   Fonte: src/app/05d-spiegazioni-bracciale.js (italiano) e 05e-spiegazioni-bracciale-en.js (inglese).
   Destinazione: SAL_INFO in app-android/web/index.html, fra i segni «/* SAL_INFO:inizio *\/» e «/* SAL_INFO:fine *\/».
   (28/11/2026, Marco: «inseriamo dettagli che spiegano, sia nel pc che nel apk, i valori ricevuti dalla fascia».)
   Uso: node tools/copia-spiegazioni-telefono.js            → scrive
        node tools/copia-spiegazioni-telefono.js --verifica → esce con 1 se il telefono non è allineato (non scrive)
   Dopo una copia: bump di CVER in web/index.html e di CACHE in web/sw.js, e un APK nuovo. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const F_TEL = path.join(ROOT, 'app-android', 'web', 'index.html');
const INIZIO = '/* SAL_INFO:inizio */', FINE = '/* SAL_INFO:fine */';

function leggiSpiegazioni() {
  const ctx = { SPIEG: {}, SPIEG_EN: {} };
  vm.createContext(ctx);
  for (const f of ['05d-spiegazioni-bracciale.js', '05e-spiegazioni-bracciale-en.js'])
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', 'app', f), 'utf8'), ctx, { filename: f });
  const scegli = o => { const out = {}; Object.keys(o).forEach(k => { if (/^br-/.test(k) || k === 'dieta-suggerita') out[k] = o[k]; }); return out; };
  return { it: scegli(ctx.SPIEG), en: scegli(ctx.SPIEG_EN) };
}
function blocco() {
  const S = leggiSpiegazioni();
  if (!Object.keys(S.it).length || Object.keys(S.it).join() !== Object.keys(S.en).join())
    throw new Error('spiegazioni italiane e inglesi con chiavi diverse: ' + Object.keys(S.it).join() + ' / ' + Object.keys(S.en).join());
  return INIZIO + '\nconst SAL_INFO=' + JSON.stringify(S) + ';\n' + FINE;
}
const tel = fs.readFileSync(F_TEL, 'utf8');
const a = tel.indexOf(INIZIO), b = tel.indexOf(FINE);
if (a < 0 || b < a) { console.error('Non trovo i segni SAL_INFO in ' + F_TEL); process.exit(2); }
const nuovo = tel.slice(0, a) + blocco() + tel.slice(b + FINE.length);
if (process.argv.includes('--verifica')) {
  if (nuovo !== tel) { console.error('Spiegazioni del telefono NON allineate al PC: lancia node tools/copia-spiegazioni-telefono.js'); process.exit(1); }
  console.log('Spiegazioni del telefono: allineate al PC.');
} else if (nuovo === tel) console.log('Spiegazioni del telefono: già allineate, niente da scrivere.');
else { fs.writeFileSync(F_TEL, nuovo); console.log('Spiegazioni copiate nel telefono (' + Object.keys(leggiSpiegazioni().it).length + ' voci, IT e EN).'); }
