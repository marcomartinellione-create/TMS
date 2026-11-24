/* pubblica-hub.cjs — mette online il TMS Hub sul tuo account Cloudflare (piano gratuito).
   Uso, dalla cartella hub/:   node pubblica-hub.cjs
   La prima volta: accesso a Cloudflare nel browser, creazione del database D1 (in Europa occidentale),
   tabelle, pubblicazione e primo codice d'invito (il tuo, per attivarti come personal nel TMS).
   Le volte dopo: ripubblica worker.js e riapplica lo schema (senza toccare i dati). */
'use strict';
const fs = require('fs');
const { QUI, wrangler, creaInvito, bello, path } = require('./comune.cjs');
const TOML = path.join(QUI, 'wrangler.toml');

function ferma(msg) { console.error('\n✖ ' + msg + '\n'); process.exit(1); }

console.log('\n── 1/4 · accesso a Cloudflare ──');
let w = wrangler(['whoami'], { mostra: false });
if (!w.ok || /not authenticated|You are not/i.test(w.out)) {
  console.log('Si apre il browser: entra nel tuo account Cloudflare e consenti l\'accesso a Wrangler.');
  if (!wrangler(['login']).ok) ferma('accesso a Cloudflare non riuscito');
}

console.log('\n── 2/4 · database D1 ──');
let toml = fs.readFileSync(TOML, 'utf8');
let primaVolta = false;
if (/database_id = "DA-RIEMPIRE"/.test(toml)) {
  const r = wrangler(['d1', 'create', 'tms-hub', '--location', 'weur']);
  const m = /database_id\s*=\s*"([0-9a-f-]{36})"/i.exec(r.out) || /"database_id"\s*:\s*"([0-9a-f-]{36})"/i.exec(r.out);
  if (!m) ferma('non trovo il numero del database nella risposta di wrangler (se il database «tms-hub» esiste già, copia il suo database_id in wrangler.toml)');
  toml = toml.replace('database_id = "DA-RIEMPIRE"', 'database_id = "' + m[1] + '"');
  fs.writeFileSync(TOML, toml);
  primaVolta = true;
  console.log('Database creato: ' + m[1]);
} else console.log('Database già creato.');
if (!wrangler(['d1', 'execute', 'tms-hub', '--remote', '--file', 'schema.sql']).ok) ferma('tabelle non create');

console.log('\n── 3/4 · pubblicazione ──');
const dep = wrangler(['deploy']);
if (!dep.ok) ferma('pubblicazione non riuscita');
const url = (/https:\/\/tms-hub\.[a-z0-9-]+\.workers\.dev/i.exec(dep.out) || [])[0] || '';

console.log('\n── 4/4 · invito ──');
let invito = '';
if (primaVolta) { try { invito = creaInvito(); } catch (e) { console.error(e.message); } }

console.log('\n═══ TMS Hub online ═══');
if (url) console.log('Indirizzo: ' + url + '   (va scritto nel TMS e nell\'APK: dillo a Claude)');
if (invito) console.log('Il tuo codice d\'invito: ' + bello(invito) + '   (TMS › ⚙ Impostazioni › Telefono collegato › Attiva)');
else console.log('Per un codice d\'invito nuovo: node invito.cjs');
console.log('');
