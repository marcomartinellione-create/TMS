#!/usr/bin/env node
'use strict';
/*
 * release.js — prepara una release COMPLETA del TMS pronta per GitHub.
 *
 * Uso:
 *   npm run release                pipeline completa (build + test + note + installer)
 *   npm run release -- --senza-exe salta electron-builder (solo artefatti + note)
 *
 * Pipeline:
 *   1. legge APP_VERSION dal sorgente e verifica l'allineamento dei due package.json
 *   2. npm run build   (riassembla gli artefatti da src/)
 *   3. npm test        (sintassi + suite jsdom) — se fallisce, la release si ferma
 *   4. genera release/v<versione>/RELEASE_NOTES.md dal CHANGELOG (voci della versione)
 *      e vi copia README.md + CHANGELOG.md
 *   5. electron-builder (NSIS) e copia TMS-Setup-<versione>.exe + latest.yml
 *   6. stampa la checklist per pubblicare su GitHub (tag v<versione>, exe + latest.yml)
 *
 * La pubblicazione su GitHub resta un gesto manuale (o `gh release create`, comando
 * suggerito a fine corsa): lo script prepara tutto ma non pubblica nulla da solo.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const senzaExe = process.argv.includes('--senza-exe');
const run = (cmd, cwd) => execSync(cmd, { cwd: cwd || ROOT, stdio: 'inherit' });

function fallisci(msg){ console.error('\nRELEASE INTERROTTA: ' + msg); process.exit(1); }

/* 1 ── versione e allineamento */
const costanti = fs.readFileSync(path.join(ROOT, 'src', 'app', '01-costanti.js'), 'utf8');
const VER  = (costanti.match(/APP_VERSION='([^']+)'/) || [])[1];
const DATA = (costanti.match(/APP_DATE='([^']+)'/) || [])[1];
const NOTA = (costanti.match(/RELEASE_NOTE='([^']*)'/) || [])[1];
if (!VER) fallisci('APP_VERSION non trovata nel sorgente');
for (const pj of ['package.json', path.join('electron', 'package.json')]) {
  const v = JSON.parse(fs.readFileSync(path.join(ROOT, pj), 'utf8')).version;
  if (v !== VER) fallisci('versione disallineata in ' + pj + ' (' + v + ' vs APP_VERSION ' + VER + ')');
}
console.log('═══ Release TMS v' + VER + ' (' + DATA + ') ═══\n');

/* 2-3 ── build + test */
console.log('── 1/4 · build degli artefatti');
run('node tools/build.js');
console.log('\n── 2/4 · test (sintassi + jsdom)');
try { run('node tools/controlla-sintassi.js'); run('node tests/test-app.js'); }
catch (e) { fallisci('i test non passano — niente release con test rossi.'); }

/* 4 ── note di rilascio dal changelog */
console.log('\n── 3/4 · note di rilascio e documenti');
const OUT = path.join(ROOT, 'release', 'v' + VER);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const changelog = fs.readFileSync(path.join(ROOT, 'Changelog', 'CHANGELOG.md'), 'utf8');
const blocchi = changelog.split(/\n(?=### )/).filter(b => b.startsWith('### ') && b.split('\n')[0].includes('v' + VER));
const vociChangelog = blocchi.length ? blocchi.join('\n\n').trim()
  : '_(nessuna voce per v' + VER + ' nel CHANGELOG — aggiungila prima di pubblicare!)_';
if (!blocchi.length) console.warn('  ATTENZIONE: nessuna voce v' + VER + ' trovata nel CHANGELOG.');

const note = `# Training Monitor System v${VER} (${DATA})

> ${NOTA}

## Novità in questa versione

${vociChangelog}

## Installazione

1. Scarica **TMS-Setup-${VER}.exe** qui sotto ed eseguilo (installer assistito, percorso modificabile).
2. Windows SmartScreen può avvisare al primo avvio (eseguibile non firmato): scegli **Ulteriori informazioni → Esegui comunque**.
3. L'app si aggiorna da sola alle release successive (controllo all'avvio, installazione alla chiusura).

I dati restano **solo sul tuo PC** (\`%APPDATA%\\Training Monitor System\\TMS\`): nessun cloud, nessun account.
`;
fs.writeFileSync(path.join(OUT, 'RELEASE_NOTES.md'), note);
fs.copyFileSync(path.join(ROOT, 'README.md'), path.join(OUT, 'README.md'));
fs.copyFileSync(path.join(ROOT, 'Changelog', 'CHANGELOG.md'), path.join(OUT, 'CHANGELOG.md'));
console.log('  scritti RELEASE_NOTES.md, README.md, CHANGELOG.md in release/v' + VER + '/');

/* 5 ── installer */
if (senzaExe) {
  console.log('\n── 4/4 · installer SALTATO (--senza-exe)');
} else {
  console.log('\n── 4/4 · installer (electron-builder, qualche minuto)');
  // build sempre da staging pulito: residui di build precedenti in dist/ possono far
  // fallire makensis con "no files found" (visto il 2026-06-10 sulla v1.0.60)
  fs.rmSync(path.join(ROOT, 'electron', 'dist'), { recursive: true, force: true });
  run('npm run dist', path.join(ROOT, 'electron'));
  const dist = path.join(ROOT, 'electron', 'dist');
  let copiati = 0;
  for (const f of ['TMS-Setup-' + VER + '.exe', 'TMS-Setup-' + VER + '.exe.blockmap', 'latest.yml']) {
    const da = path.join(dist, f);
    if (!fs.existsSync(da)) fallisci('file atteso non prodotto dal build: ' + f);
    fs.copyFileSync(da, path.join(OUT, f));
    console.log('  copiato ' + f + ' (' + (fs.statSync(da).size / 1048576).toFixed(1) + ' MB)');
    copiati++;
  }
}

/* 6 ── checklist */
console.log(`
═══ Release pronta in release/v${VER}/ ═══

Per pubblicare su GitHub (repo marcomartinellione-create/TMS):
  1. Releases → "Draft a new release" → tag  v${VER}
  2. Titolo:  TMS v${VER}
  3. Descrizione: incolla il contenuto di RELEASE_NOTES.md
  4. Allega TUTTI E TRE i file: TMS-Setup-${VER}.exe, TMS-Setup-${VER}.exe.blockmap, latest.yml
     (senza latest.yml niente auto-update; senza blockmap niente download differenziali)
  5. Publish.

Oppure, con GitHub CLI:
  gh release create v${VER} "release/v${VER}/TMS-Setup-${VER}.exe" "release/v${VER}/TMS-Setup-${VER}.exe.blockmap" "release/v${VER}/latest.yml" --title "TMS v${VER}" --notes-file "release/v${VER}/RELEASE_NOTES.md" -R marcomartinellione-create/TMS
`);
