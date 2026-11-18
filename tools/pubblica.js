#!/usr/bin/env node
'use strict';
/*
 * pubblica.js — la pubblicazione che Marco lancia da solo con PUBBLICA.bat (dal 2026-11-12).
 *
 * «Pubblicare» vuol dire: costruire l'installer nuovo in release/v<x.y.z>/ e, dal 18/11/2026 (Marco:
 * «rimettere online su git il tutto»), mandarlo su GitHub: push di main (sito su GitHub Pages compreso)
 * e release v<x.y.z> con installer, blockmap e latest.yml. L'app installata la trova da sola all'avvio
 * (electron-updater, electron/main.js). Se in app-android/dist c'è un APK di TMS Scheda più nuovo di
 * quello pubblicato, va nella stessa release e docs/scheda/versione.json lo annuncia ai telefoni.
 * Con --senza-github si ferma al commit locale (come dal 12 al 18/11/2026).
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
 *   4. APK: se app-android/dist ha un TMS-Scheda-<a.b.c>.apk più nuovo di docs/scheda/versione.json,
 *      ne calcola lo SHA-256 e riscrive versione.json (versione, file, sha256, url della release).
 *   5. commit locale «Pubblicazione v<x.y.z>».
 *   6. GitHub (salvo --senza-github): git push origin main, poi gh release create v<x.y.z> con
 *      installer, blockmap, latest.yml e l'APK nuovo. Se qualcosa non va, la pubblicazione locale resta
 *      valida e il messaggio dice cosa rifare.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

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

// APK di TMS Scheda: il più nuovo in app-android/dist, se è più nuovo di quello già annunciato
const REPO = 'marcomartinellione-create/TMS', F_APK_JSON = 'docs/scheda/versione.json';
const verNum = v => String(v || '').split('.').map(n => parseInt(n, 10) || 0);
const verMaggiore = (a, b) => { const x = verNum(a), y = verNum(b); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
let apkNuovo = null;
{ const dist = P('app-android', 'dist');
  const apk = (fs.existsSync(dist) ? fs.readdirSync(dist) : []).map(f => /^TMS-Scheda-(\d+\.\d+\.\d+)\.apk$/.exec(f)).filter(Boolean)
    .sort((a, b) => verMaggiore(a[1], b[1]) ? -1 : verMaggiore(b[1], a[1]) ? 1 : 0)[0];
  let annunciata = '';
  try { annunciata = JSON.parse(leggi(F_APK_JSON)).versione || ''; } catch (e) {}
  if (apk && (!annunciata || verMaggiore(apk[1], annunciata))) {
    const file = path.join(dist, apk[0]);
    const sha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    apkNuovo = { versione: apk[1], file: apk[0], percorso: file, sha256 };
    fs.mkdirSync(path.dirname(P(F_APK_JSON)), { recursive: true });
    scrivi(F_APK_JSON, JSON.stringify({ versione: apk[1], file: apk[0], sha256,
      url: 'https://github.com/' + REPO + '/releases/download/v' + NUOVA + '/' + apk[0], pubblicata: oggi }, null, 1) + '\n');
    console.log('APK di TMS Scheda ' + apk[1] + ' (' + (fs.statSync(file).size / 1048576).toFixed(1) + ' MB): lo pubblico con questa versione.');
  }
}

git('add -A');
git('commit -q -m "Pubblicazione v' + NUOVA + '" -m "Installer in release/v' + NUOVA + ' (PUBBLICA.bat)."');

const mb = (fs.statSync(exeDi(NUOVA)).size / 1048576).toFixed(1);
console.log('\nInstaller: release\\v' + NUOVA + '\\TMS-Setup-' + NUOVA + '.exe (' + mb + ' MB)');

if (process.argv.includes('--senza-github')) {
  console.log('\n═══ Fatto: TMS v' + NUOVA + ' pronta in locale (--senza-github: niente GitHub) ═══');
  process.exit(0);
}
// GitHub: prima il push (sito e versione.json dell'APK), poi la release con gli allegati
const esegui = (cmd) => execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
try {
  esegui('git push origin main');
} catch (e) {
  ferma('Pubblicata in locale, ma il push su GitHub non è riuscito (rete? accesso?).\nPer riprovare: git push origin main, poi rilancia PUBBLICA.bat (non rifà la build).');
}
const DIR = 'release/v' + NUOVA + '/';
const allegati = [DIR + 'TMS-Setup-' + NUOVA + '.exe', DIR + 'TMS-Setup-' + NUOVA + '.exe.blockmap', DIR + 'latest.yml']
  .concat(apkNuovo ? [path.relative(ROOT, apkNuovo.percorso).replace(/\\/g, '/')] : []);
try {
  esegui('gh release create v' + NUOVA + ' ' + allegati.map(a => '"' + a + '"').join(' ') +
    ' --title "TMS v' + NUOVA + '" --notes-file "' + DIR + 'RELEASE_NOTES.md" -R ' + REPO);
} catch (e) {
  ferma('Il push è fatto, ma la release v' + NUOVA + ' su GitHub non è riuscita.\nPer riprovare: gh release create v' + NUOVA + ' ' + allegati.map(a => '"' + a + '"').join(' ') + ' --title "TMS v' + NUOVA + '" --notes-file "' + DIR + 'RELEASE_NOTES.md" -R ' + REPO);
}
console.log('\n═══ Fatto: TMS v' + NUOVA + ' pubblicata su GitHub ═══');
console.log('Release: https://github.com/' + REPO + '/releases/tag/v' + NUOVA);
if (apkNuovo) console.log('TMS Scheda ' + apkNuovo.versione + ': i telefoni la trovano da soli (docs/scheda/versione.json).');
console.log('L\'app installata, al prossimo avvio, propone di scaricare e installare la v' + NUOVA + '.');
