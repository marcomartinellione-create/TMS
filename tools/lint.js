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
// `no-unused-vars` non "vede" i simboli usati SOLO da stringhe (handler onclick="..."
// nel markup) o dagli strumenti di release: li dichiariamo esportati così la regola può
// restare un ERRORE che blocca il codice morto VERO senza falsi positivi.
//  - RELEASE_NOTE        → usata dal rituale di release / README (non dal runtime JS)
//  - printReport         → richiamata da onclick="printReport()" nel markup del Report
//  - exportDigitalReport → richiamata da onclick="exportDigitalReport()" nel markup del Report
// (la riga della direttiva conta come riga 1 del concatenato: la mappa righe ne tiene conto)
let codice = '/* exported RELEASE_NOTE, printReport, exportDigitalReport */\n';
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
        // blocca il codice morto futuro: variabili/funzioni dichiarate e mai usate.
        //  args:'none'         → molti parametri di callback sono volutamente inusati
        //  caughtErrors:'none' → i catch(e){} che ignorano l'errore di proposito
        //  varsIgnorePattern   → scarti volutamente inusati con nome che inizia per _
        'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
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
