#!/usr/bin/env node
'use strict';
/*
 * build.js — riassembla gli artefatti del TMS dal sorgente decomposto in src/.
 *
 * Uso:
 *   node tools/build.js              riassembla e scrive gli artefatti (root + electron/renderer)
 *   node tools/build.js --verifica   solo controllo: confronta il riassemblato con gli artefatti
 *                                    esistenti senza scrivere nulla (exit 1 se differiscono)
 *
 * Il manifest (src/manifest.json) elenca le parti NELL'ORDINE di concatenazione e gli
 * artefatti di destinazione. La concatenazione è byte per byte: nessuna trasformazione,
 * quindi sorgente e artefatto sono sempre equivalenti per costruzione.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'manifest.json'), 'utf8'));
const soloVerifica = process.argv.includes('--verifica');

const md5 = buf => crypto.createHash('md5').update(buf).digest('hex');

const pezzi = manifest.parti.map(p => {
  const full = path.join(ROOT, 'src', p);
  if (!fs.existsSync(full)) { console.error('ERRORE: parte mancante: src/' + p); process.exit(1); }
  return fs.readFileSync(full);
});
const artefatto = Buffer.concat(pezzi);
const hash = md5(artefatto);

console.log('Riassemblato: ' + artefatto.length + ' byte, md5 ' + hash + ' (' + manifest.parti.length + ' parti)');

// coerenza versioni: APP_VERSION nel sorgente vs i due package.json (avviso, non blocca)
try {
  const costanti = fs.readFileSync(path.join(ROOT, 'src', 'app', '01-costanti.js'), 'utf8');
  const vApp = (costanti.match(/APP_VERSION='([^']+)'/) || [])[1];
  for (const pj of ['package.json', path.join('electron', 'package.json')]) {
    const v = JSON.parse(fs.readFileSync(path.join(ROOT, pj), 'utf8')).version;
    if (vApp && v !== vApp) console.warn('  ATTENZIONE: versione disallineata in ' + pj + ' (' + v + ' vs APP_VERSION ' + vApp + ')');
  }
} catch (e) { /* solo diagnostica */ }

let errori = 0;
for (const dest of manifest.artefatti) {
  const full = path.join(ROOT, dest);
  if (soloVerifica) {
    const esiste = fs.existsSync(full);
    const uguale = esiste && md5(fs.readFileSync(full)) === hash;
    console.log((uguale ? '  OK   ' : '  DIFF ') + dest + (esiste ? '' : ' (assente)'));
    if (!uguale) errori++;
  } else {
    fs.mkdirSync(path.dirname(full), { recursive: true }); // in un checkout fresco (CI) electron/renderer/ non esiste
    fs.writeFileSync(full, artefatto);
    console.log('  scritto ' + dest);
  }
}

if (!soloVerifica) {
  // controllo di coerenza post-scrittura
  for (const dest of manifest.artefatti) {
    if (md5(fs.readFileSync(path.join(ROOT, dest))) !== hash) {
      console.error('ERRORE: verifica post-scrittura fallita per ' + dest);
      process.exit(1);
    }
  }
  console.log('Verifica post-scrittura: md5 identici su tutti gli artefatti.');
}
process.exit(errori ? 1 : 0);
