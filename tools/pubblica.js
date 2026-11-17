#!/usr/bin/env node
'use strict';
/*
 * pubblica.js — la pubblicazione che Marco lancia da solo con PUBBLICA.bat (dal 2026-11-12).
 *
 * «Pubblicare» oggi vuol dire: mettere l'installer nuovo in release/v<x.y.z>/. L'app installata
 * sul PC, al prossimo avvio, lo trova e propone «↻ Installa e riavvia» (electron/main.js).
 * Niente GitHub.
 *
 * Cosa fa:
 *   1. legge APP_VERSION. Se l'installer di quella versione c'è GIÀ in release/, alza la terza
 *      cifra (1.1.18 → 1.1.19): versione, data, nota di rilascio, i due package.json e una voce
 *      in Changelog/CHANGELOG.md (se non c'è già).
 *      Se l'installer di quella versione NON c'è ancora (la versione l'ha già alzata Claude),
 *      la costruisce così com'è.
 *   2. Le novità vengono dai commit fatti dopo l'ultima pubblicazione; se esiste il file
 *      Changelog/PROSSIMA_NOTA.txt (scritto da Claude durante il lavoro) la nota di rilascio è
 *      quella, e il file viene consumato. Se non c'è nulla di nuovo si ferma senza toccare niente.
 *   3. node tools/release.js: build, test, installer. Se fallisce, rimette i file com'erano.
 *   4. commit locale «Pubblicazione v<x.y.z>» (nessun push).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const P = (...a) => path.join(ROOT, ...a);
const git = (args) => { try { return execSync('git ' + args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { return ''; } };
const leggi = (rel) => fs.readFileSync(P(rel), 'utf8');
const scrivi = (rel, s) => fs.writeFileSync(P(rel), s, 'utf8');
function ferma(msg, codice) { console.log('\n' + msg); process.exit(codice == null ? 1 : codice); }

const F_COST = 'src/app/01-costanti.js', F_CHANGE = 'Changelog/CHANGELOG.md', F_NOTA = 'Changelog/PROSSIMA_NOTA.txt';
const FILE_TOCCATI = [F_COST, 'package.json', 'electron/package.json', F_CHANGE];

const costanti = leggi(F_COST);
const VER = (costanti.match(/APP_VERSION='(\d+\.\d+\.\d+)'/) || [])[1];
if (!VER) ferma('Non trovo APP_VERSION in ' + F_COST + '.');
const exeDi = (v) => P('release', 'v' + v, 'TMS-Setup-' + v + '.exe');
const oggi = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

console.log('═══ Pubblicazione TMS ═══');
console.log('Versione nel sorgente: v' + VER);

const sporchi = git('status --porcelain').trim();
if (sporchi) console.log('\nCi sono modifiche non ancora registrate in git: entrano in questa pubblicazione.');

// commit dopo l'ultima pubblicazione (il commit che porta «v<VER>» in testa al messaggio)
const storia = git('log --format=%H%x09%s').split('\n').filter(Boolean).map(r => { const i = r.indexOf('\t'); return { h: r.slice(0, i), s: r.slice(i + 1) }; });
const reUltima = new RegExp('^(Pubblicazione )?v' + VER.replace(/\./g, '\\.') + '\\b');
const iUltima = storia.findIndex(c => reUltima.test(c.s));
const nuovi = (iUltima < 0 ? [] : storia.slice(0, iUltima)).map(c => c.s).filter(s => !/^Pubblicazione v/.test(s));

let NUOVA = VER, alzata = false;
const originali = {};
if (fs.existsSync(exeDi(VER))) {
  const nota = fs.existsSync(P(F_NOTA)) ? leggi(F_NOTA).trim() : '';
  if (!nuovi.length && !sporchi && !nota) ferma('Niente di nuovo dopo la v' + VER + ' (già in release/): non pubblico nulla.\nL\'app installata ha già tutto quello che c\'è.', 0);
  const [a, b, c] = VER.split('.').map(Number);
  NUOVA = a + '.' + b + '.' + (c + 1); alzata = true;
  console.log('La v' + VER + ' è già in release/: preparo la v' + NUOVA + '.');
  for (const f of FILE_TOCCATI) originali[f] = leggi(f);

  // nota di rilascio (dentro l'app: niente apice semplice, backtick né dollaro+graffa; la barra
  // rovesciata si raddoppia — «My Drive\6 - TMS» in un commit diventava un carattere non valido, 17/11/2026)
  const pulisci = s => String(s).replace(/\\/g, '\\\\').replace(/[`]/g, '').replace(/\$\{/g, '$ {').replace(/'/g, '’').replace(/\s+/g, ' ').trim();
  const elenco = nuovi.length ? nuovi : ['modifiche varie'];
  const testoNota = pulisci(nota || ('Novità: ' + elenco.join('; ') + '.'));
  let cost = originali[F_COST]
    .replace(/APP_VERSION='[^']+'/, "APP_VERSION='" + NUOVA + "'")
    .replace(/APP_DATE='[^']+'/, "APP_DATE='" + oggi + "'")
    .replace(/const RELEASE_NOTE='[^\n]*?';/, () => "const RELEASE_NOTE='" + testoNota + "';");
  scrivi(F_COST, cost);
  for (const pj of ['package.json', 'electron/package.json'])
    scrivi(pj, originali[pj].replace(/"version":\s*"[^"]+"/, '"version": "' + NUOVA + '"'));

  // voce di changelog, se Claude non l'ha già preparata
  const ch = originali[F_CHANGE];
  if (!new RegExp('^### .*v' + NUOVA.replace(/\./g, '\\.') + '\\b', 'm').test(ch)) {
    const nl = ch.includes('\r\n') ? '\r\n' : '\n';
    const voce = ['### ' + oggi + ' — TMS v' + NUOVA + ': pubblicata con PUBBLICA.bat', '',
      '**Tipo**: pubblicazione delle modifiche accumulate dopo la v' + VER,
      '**Descrizione**:', ...(nota ? ['- ' + nota.replace(/\r?\n+/g, ' ')] : []), ...elenco.map(s => '- ' + s), '',
      '**Test**: suite completa passata dentro `npm run release`.',
      '**Approvato da**: Marco (PUBBLICA.bat — ' + oggi + ')', '', '---', '', ''].join(nl);
    const i = ch.indexOf('### ');
    scrivi(F_CHANGE, i < 0 ? ch + nl + voce : ch.slice(0, i) + voce + ch.slice(i));
  }
} else {
  console.log('L\'installer della v' + VER + ' non c\'è ancora: lo costruisco.');
}

// --prova: mostra cosa farebbe, rimette tutto com'era e si ferma (per i collaudi)
if (process.argv.includes('--prova')) {
  if (alzata) {
    console.log('\n[prova] APP_VERSION:', (leggi(F_COST).match(/APP_VERSION='([^']+)'/) || [])[1]);
    console.log('[prova] RELEASE_NOTE:', (leggi(F_COST).match(/RELEASE_NOTE='([^\n]*?)';/) || [])[1]);
    console.log('[prova] changelog:\n' + leggi(F_CHANGE).slice(leggi(F_CHANGE).indexOf('### ')).split('---')[0]);
    for (const f of FILE_TOCCATI) scrivi(f, originali[f]);
  }
  ferma('[prova] nessun file cambiato, nessun build.', 0);
}

// build + test + installer
try {
  execSync('node tools/release.js', { cwd: ROOT, stdio: 'inherit' });
} catch (e) {
  if (alzata) { for (const f of FILE_TOCCATI) scrivi(f, originali[f]); console.log('\n(ho rimesso la versione a v' + VER + ')'); }
  ferma('PUBBLICAZIONE NON RIUSCITA: guarda il messaggio qui sopra. Nella cartella release/ non è cambiato nulla di usabile.\nSe non sai cosa fare, copia questa finestra a Claude.');
}
for (const f of ['TMS-Setup-' + NUOVA + '.exe', 'latest.yml'])
  if (!fs.existsSync(P('release', 'v' + NUOVA, f))) ferma('Manca release/v' + NUOVA + '/' + f + ' dopo il build.');

if (alzata && fs.existsSync(P(F_NOTA))) fs.rmSync(P(F_NOTA));
git('add -A');
git('commit -q -m "Pubblicazione v' + NUOVA + '" -m "Installer in release/v' + NUOVA + ' (PUBBLICA.bat)."');

const mb = (fs.statSync(exeDi(NUOVA)).size / 1048576).toFixed(1);
console.log('\n═══ Fatto: TMS v' + NUOVA + ' pubblicata ═══');
console.log('Installer: release\\v' + NUOVA + '\\TMS-Setup-' + NUOVA + '.exe (' + mb + ' MB)');
console.log('Chiudi e riapri l\'app: ti proporrà «↻ Installa e riavvia».');
