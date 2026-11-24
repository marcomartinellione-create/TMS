/* comune.cjs — quello che serve agli script dell'hub (pubblica-hub.cjs, invito.cjs): lanciare wrangler e
   creare codici d'invito. */
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');
const crypto = require('crypto');

const QUI = __dirname;
const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';     /* niente I, O, 0, 1: si scrivono senza sbagliare */
const WRANGLER = 'wrangler@4';

function wrangler(args, { mostra = true } = {}) {
  const r = spawnSync('npx', ['--yes', WRANGLER].concat(args), { cwd: QUI, shell: true, encoding: 'utf8', stdio: mostra ? ['inherit', 'pipe', 'pipe'] : 'pipe' });
  const out = (r.stdout || '') + (r.stderr || '');
  if (mostra) process.stdout.write(out);
  return { ok: r.status === 0, out };
}
function nuovoInvito() {
  const b = crypto.randomBytes(12); let s = '';
  for (let i = 0; i < 12; i++) s += ALFA[b[i] & 31];
  return s;
}
const bello = c => c.replace(/(.{4})(?=.)/g, '$1-');
function creaInvito() {
  const codice = nuovoInvito();
  const r = wrangler(['d1', 'execute', 'tms-hub', '--remote', '--command', '"INSERT INTO inviti (codice, creato) VALUES (\'' + codice + '\', ' + Date.now() + ')"'], { mostra: false });
  if (!r.ok) { console.error(r.out); throw new Error('non riesco a scrivere l\'invito nel database dell\'hub'); }
  return codice;
}
module.exports = { QUI, wrangler, creaInvito, bello, path };
