/* genera-guida-ai.js — estrae la Guida per AI dal sorgente dell'app e scrive
 * docs/guida-ai.md (la copia pubblica linkata da README e sito).
 *
 * FONTE DI VERITÀ: src/app/13b-guida-ai.js (costante GUIDA_AI_CORPO).
 * L'intestazione qui replicata DEVE restare identica a guidaAITesto() nell'app.
 *
 * Uso:  node tools/genera-guida-ai.js            scrive docs/guida-ai.md
 *       node tools/genera-guida-ai.js --verifica controlla senza scrivere (exit 1 se diverso)
 * Integrato negli script npm "build" e "verifica".
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'app', '13c-guida-ai.js');
const OUT = path.join(ROOT, 'docs', 'guida-ai.md');

const costanti = fs.readFileSync(path.join(ROOT, 'src', 'app', '01-costanti.js'), 'utf8');
const VER = (costanti.match(/APP_VERSION='([^']+)'/) || [])[1];
const DATA = (costanti.match(/APP_DATE='([^']+)'/) || [])[1];
if (!VER || !DATA) { console.error('genera-guida-ai: APP_VERSION/APP_DATE non trovate'); process.exit(2); }

const src = fs.readFileSync(SRC, 'utf8');
const m = src.match(/const GUIDA_AI_CORPO=`([\s\S]*?)`;/);
if (!m) { console.error('genera-guida-ai: GUIDA_AI_CORPO non trovata in ' + SRC); process.exit(2); }

/* stessa intestazione di guidaAITesto() nell'app */
const testo = '# Training Monitor System (TMS) — documentazione per assistenti AI\n\n' +
  '_Versione app: ' + VER + ' (' + DATA + '). File generato dall\'app (tab Guida) — ' +
  'la copia online vive nel repo: docs/guida-ai.md. Caricalo nella chat di un assistente AI ' +
  'per farti aiutare a usare il TMS._\n' + m[1];

if (process.argv.includes('--verifica')) {
  const attuale = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
  if (attuale === testo) { console.log('Guida AI: OK (docs/guida-ai.md allineata al sorgente, v' + VER + ')'); }
  else { console.error('Guida AI: docs/guida-ai.md NON allineata al sorgente — rilancia npm run build'); process.exit(1); }
} else {
  fs.writeFileSync(OUT, testo);
  console.log('Guida AI: scritta docs/guida-ai.md (v' + VER + ', ' + testo.length + ' caratteri)');
}
