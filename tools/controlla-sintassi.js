#!/usr/bin/env node
'use strict';
/*
 * controlla-sintassi.js — compila (senza eseguire) tutti i blocchi <script> dell'artefatto
 * riassemblato dal manifest, come `node --check`. Necessario ma non sufficiente:
 * gli errori runtime si vedono solo con la suite jsdom (npm test).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'manifest.json'), 'utf8'));
const html = Buffer.concat(manifest.parti.map(p => fs.readFileSync(path.join(ROOT, 'src', p)))).toString('utf8');

const blocchi = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
if (!blocchi.length) { console.error('ERRORE: nessun blocco <script> trovato'); process.exit(1); }

let errori = 0;
blocchi.forEach((m, i) => {
  try {
    new vm.Script(m[1], { filename: 'script-' + (i + 1) + '.js' });
    console.log('  OK   script ' + (i + 1) + ' (' + m[1].length + ' caratteri)');
  } catch (e) {
    errori++;
    console.error('  FAIL script ' + (i + 1) + ': ' + e.message);
  }
});
console.log(errori ? 'Sintassi: ERRORI' : 'Sintassi: OK');
process.exit(errori ? 1 : 0);
