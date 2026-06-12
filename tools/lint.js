#!/usr/bin/env node
'use strict';
/*
 * lint.js — ESLint sul sorgente CONCATENATO (P10 del report di revisione).
 *
 * Le parti JS di src/ condividono un unico scope (un solo <script> nell'artefatto):
 * lintare i file singoli darebbe migliaia di falsi `no-undef`. Qui si concatenano le
 * parti nell'ordine del manifest (esclusa la libreria terza html2canvas) e si linta
 * il risultato come un programma unico; i numeri di riga vengono rimappati alla
 * parte d'origine. Regole minime anti-infortunio: nomi inesistenti, chiavi/argomenti
 * duplicati, codice irraggiungibile.
 */
const fs = require('fs');
const path = require('path');
const { ESLint } = require('eslint');
const globals = require('globals');

const ROOT = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'manifest.json'), 'utf8'));

const parti = manifest.parti.filter(p => p.endsWith('.js') && p !== 'lib/html2canvas.min.js');
let codice = '';
const mappa = [];   // { parte, daRiga (1-based nel concatenato), righe }
for (const p of parti) {
  const testo = fs.readFileSync(path.join(ROOT, 'src', p), 'utf8');
  const righe = testo.split('\n').length;
  mappa.push({ parte: p, daRiga: codice.split('\n').length, righe });
  codice += testo;
  if (!codice.endsWith('\n')) codice += '\n';
}

function rimappa(riga) {
  for (let i = mappa.length - 1; i >= 0; i--) {
    if (riga >= mappa[i].daRiga) return { parte: mappa[i].parte, riga: riga - mappa[i].daRiga + 1 };
  }
  return { parte: '?', riga };
}

(async () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: {
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'script',
        globals: Object.assign({}, globals.browser, {
          html2canvas: 'readonly',   // definita dalla parte lib/ esclusa dal lint
        }),
      },
      rules: {
        'no-undef': 'error',
        'no-dupe-keys': 'error',
        'no-dupe-args': 'error',
        'no-unreachable': 'error',
      },
    },
  });
  const ris = await eslint.lintText(codice, { filePath: 'app-concatenata.js' });
  const messaggi = (ris[0] && ris[0].messages) || [];
  if (!messaggi.length) {
    console.log('Lint: OK (' + parti.length + ' parti, ' + codice.split('\n').length + ' righe concatenate)');
    process.exit(0);
  }
  for (const m of messaggi) {
    const dove = rimappa(m.line || 0);
    console.log('  ' + (m.severity === 2 ? 'ERRORE ' : 'avviso ') + 'src/' + dove.parte + ':' + dove.riga +
      '  [' + (m.ruleId || '?') + ']  ' + m.message);
  }
  console.log('Lint: ' + messaggi.length + ' segnalazioni');
  process.exit(messaggi.some(m => m.severity === 2) ? 1 : 0);
})().catch(e => { console.error('ERRORE LINT:', e.message); process.exit(2); });
