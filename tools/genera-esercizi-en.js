#!/usr/bin/env node
'use strict';
/*
 * genera-esercizi-en.js — inserisce la mappa `nome italiano → nome inglese` degli
 * esercizi (free-exercise-db di yuhonas, Unlicense) nel blocco marcato di
 * src/app/00b-esercizi-en.js.
 *
 * Fonte dati: tools/esercizi-en.json (mappa {nomeIT: nomeEN}, filtrata sul catalogo,
 * esclusi i nomi già identici). Per rigenerare la fonte dall'upstream: scaricare
 * dist/exercises.json della repo e incrociarlo per `id` col catalogo (TMS_Dati/esercizi.json).
 *
 * Uso:  node tools/genera-esercizi-en.js          (scrive il blocco)
 *       node tools/genera-esercizi-en.js --verifica (esce 1 se il blocco è disallineato)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'tools', 'esercizi-en.json');
const PART = path.join(ROOT, 'src', 'app', '00b-esercizi-en.js');
const RE = /(\/\*__ESEN_JSON__\*\/)([\s\S]*?)(\/\*__EOJ__\*\/)/;

const mappa = JSON.parse(fs.readFileSync(SRC, 'utf8'));
// ordina per id per un diff stabile
const ordinata = {};
Object.keys(mappa).sort().forEach(k => { ordinata[k] = mappa[k]; });
const blob = JSON.stringify(ordinata);

const testo = fs.readFileSync(PART, 'utf8');
if (!RE.test(testo)) { console.error('ERRORE: marker /*__ESEN_JSON__*/ … /*__EOJ__*/ non trovati in', PART); process.exit(2); }
const nuovo = testo.replace(RE, (_m, a, _cur, b) => a + blob + b);

const verifica = process.argv.includes('--verifica');
if (verifica) {
  if (nuovo !== testo) { console.error('ESEN disallineato: esegui `node tools/genera-esercizi-en.js`'); process.exit(1); }
  console.log('ESEN OK (' + Object.keys(ordinata).length + ' esercizi).');
  process.exit(0);
}
fs.writeFileSync(PART, nuovo, 'utf8');
console.log('ESEN scritto in src/app/00b-esercizi-en.js (' + Object.keys(ordinata).length + ' esercizi).');
