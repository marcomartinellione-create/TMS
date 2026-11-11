#!/usr/bin/env node
'use strict';
/*
 * genera-seed-incorporato.js — costruisce src/dati/03-seed.js, cioè i dati che l'app porta
 * DENTRO l'HTML (costante SEED): ciò che vede chi apre il TMS per la prima volta in un
 * browser, su una cartella vuota.
 *
 * Fino alla v1.1.15 quel blocco conteneva lo storico personale di Marco (finiva quindi
 * nell'installer e nel repo pubblico). Dal 2026-11-11 è il profilo dimostrativo
 * «Atleta Template», lo stesso del seed dell'installer (tools/genera-seed.js): un atleta
 * fittizio, generato da tools/genera-profilo-template.py.
 *
 * Sorgente: TMS_Dati/template/ (cartella locale, non in git). Le foto dimostrative non
 * entrano: sono file, e in una cartella nuova non ci sarebbero.
 *
 *   node tools/genera-seed-incorporato.js              riscrive src/dati/03-seed.js
 *   node tools/genera-seed-incorporato.js --verifica   controlla che sia allineato (non scrive)
 *
 * Dopo la scrittura serve `npm run build`.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'TMS_Dati', 'template');
const OUT = path.join(ROOT, 'src', 'dati', '03-seed.js');
const verifica = process.argv.includes('--verifica');

if (!fs.existsSync(path.join(SRC, 'storico.json'))) {
  /* normale in CI e in un clone pulito: TMS_Dati/ non è nel repo */
  console.log('Seed incorporato: TMS_Dati/template assente, ' + (verifica ? 'verifica saltata.' : 'niente da generare.'));
  process.exit(verifica ? 0 : 1);
}
const J = f => JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
const corpo = J('corpo.json');
const seed = {
  scheda: J('scheda.json'),
  storico: J('storico.json'),
  storico_io: corpo.storico_io || [],
  storico_rpe: corpo.storico_rpe || [],
  cardio: corpo.cardio || [],
  dati_utente: corpo.dati_utente || {},
  alimentazione: J('alimentazione.json')
};
/* niente backtick né sequenze che chiudano lo <script> dentro l'HTML */
const json = JSON.stringify(seed).replace(/<\/(script)/gi, '<\\/$1');
const testo = 'const SEED = /*__SEED_JSON__*/' + json + ';\n';

if (verifica) {
  /* git su Windows può restituire il file coi fine riga CRLF: non è una differenza di contenuto */
  const attuale = (fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '').replace(/\r\n/g, '\n');
  if (attuale === testo) { console.log('Seed incorporato: OK (allineato a TMS_Dati/template, ' + seed.storico.length + ' righe di storico)'); process.exit(0); }
  console.error('Seed incorporato: NON allineato a TMS_Dati/template — esegui `node tools/genera-seed-incorporato.js` e poi `npm run build`.');
  process.exit(1);
}
fs.writeFileSync(OUT, testo);
console.log('Seed incorporato scritto: ' + path.relative(ROOT, OUT) + ' (' + testo.length + ' byte, ' + seed.storico.length + ' righe di storico, profilo «' + [seed.dati_utente.nome, seed.dati_utente.cognome].filter(Boolean).join(' ') + '»)');
