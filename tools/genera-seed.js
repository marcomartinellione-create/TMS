#!/usr/bin/env node
'use strict';
/*
 * genera-seed.js — costruisce il SEED DELL'INSTALLER in seed/TMS_Dati/.
 *
 * Dal v1.0.69 l'installer NON include più i dati personali di Marco: il seed
 * pubblico contiene SOLO il profilo dimostrativo "Atleta Template" (+ catalogo
 * esercizi condiviso). La cartella TMS_Dati/ del progetto resta intatta (dati
 * vivi di Marco + sorgente del template) e in sviluppo (`npm start`) il seed
 * resta la root del progetto: nessun dato viene perso o spostato.
 *
 * Eseguito automaticamente da electron-builder ("predist" in electron/package.json)
 * e dalla pipeline di release.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'TMS_Dati');
const OUT = path.join(ROOT, 'seed', 'TMS_Dati');

fs.rmSync(path.join(ROOT, 'seed'), { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'template'), { recursive: true });

// catalogo condiviso
fs.copyFileSync(path.join(SRC, 'esercizi.json'), path.join(OUT, 'esercizi.json'));

// profilo dimostrativo
const FILES = ['scheda.json', 'storico.json', 'corpo.json', 'alimentazione.json'];
for (const f of FILES) {
  const da = path.join(SRC, 'template', f);
  if (!fs.existsSync(da)) { console.error('ERRORE: manca ' + da + ' — esegui prima tools/genera-profilo-template.py'); process.exit(1); }
  fs.copyFileSync(da, path.join(OUT, 'template', f));
}
// foto dimostrative: corpo.json le elenca, quindi i file devono esserci (altrimenti «foto non trovata»)
const FOTO = path.join(SRC, 'template', 'foto');
const foto = fs.existsSync(FOTO) ? fs.readdirSync(FOTO).filter(n => /^demo-.*\.jpg$/i.test(n)) : [];
if (foto.length) {
  fs.mkdirSync(path.join(OUT, 'template', 'foto'), { recursive: true });
  foto.forEach(n => fs.copyFileSync(path.join(FOTO, n), path.join(OUT, 'template', 'foto', n)));
}
const elencate = (JSON.parse(fs.readFileSync(path.join(SRC, 'template', 'corpo.json'), 'utf8')).foto || []).map(f => f.file);
const mancanti = elencate.filter(n => !foto.includes(n));
if (mancanti.length) { console.error('ERRORE: corpo.json elenca ' + mancanti.length + ' foto che non ci sono (es. ' + mancanti[0] + ') — esegui tools/genera-foto-demo.js'); process.exit(1); }

// anagrafica profili: SOLO il template, attivo
const profiliSrc = JSON.parse(fs.readFileSync(path.join(SRC, 'profili.json'), 'utf8'));
const tpl = (profiliSrc.list || []).find(p => p.slug === 'template') || { slug: 'template', nome: 'Atleta Template', creato: '2026-06-10' };
fs.writeFileSync(path.join(OUT, 'profili.json'), JSON.stringify({ list: [tpl], active: 'template' }, null, 2) + '\n');

console.log('Seed installer pronto in seed/TMS_Dati: profilo "' + tpl.nome + '" (' + FILES.length + ' file, ' + foto.length + ' foto dimostrative) + esercizi.json — nessun dato personale.');
