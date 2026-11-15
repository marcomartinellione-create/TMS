/* Confronto delle schede Fable (generate alla cieca) con i dati noti — criterio fissato PRIMA di vedere
   i risultati (Doc/riferimenti-distribuzione/fable-2026-11-15/CRITERIO.md, 15/11/2026).
   Legge RIF_DISTR da src/dati/05-riferimenti-distribuzione.js e conta come l'app col riferimento
   predefinito: catalogo TMS, dirette 1,0, indirette 0,5, quota di ogni gruppo sul totale.

   Uso: node tools/riferimenti/confronta-fable.js [--md PERCORSO]   (--md: scrive anche il resoconto) */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const src = fs.readFileSync(path.join(ROOT, 'src', 'dati', '05-riferimenti-distribuzione.js'), 'utf8');
const R = JSON.parse(src.slice(src.indexOf('{"versione"'), src.lastIndexOf('};') + 1));
const GR = ['Gambe', 'Pettorali', 'Schiena', 'Spalle', 'Braccia', 'Core'];
const ESP = ['principiante', 'intermedio', 'avanzato'];
const TIPI = ['forza', 'ipertrofia', 'powerlifting', 'resistenza', 'potenza', 'generale'];
const MIN = 5, IN_FASCIA = 0.80, SCARTO_MEDIO = 4, SCARTO_MAX = 10;

const quote = v => { const per = GR.map((g, j) => (+v.D[j] || 0) + 0.5 * (+v.I[j] || 0)), tot = per.reduce((a, b) => a + b, 0);
  return tot > 0 ? per.map(x => 100 * x / tot) : null; };
function percentile(a, p) { a = a.slice().sort((x, y) => x - y); if (!a.length) return 0;
  const i = (a.length - 1) * p / 100, lo = Math.floor(i), hi = Math.min(lo + 1, a.length - 1); return a[lo] + (a[hi] - a[lo]) * (i - lo); }
const nel = (v, e, t) => (!e || v.esperienza === e) && (!t || (v.tipi || []).includes(t));

/* le voci Fable stanno in RIF_DISTR solo se accese nell'app; altrimenti nel file di lavoro scritto dall'importatore */
const DOC_FABLE = path.join(ROOT, 'Doc', 'riferimenti-distribuzione', 'fable-2026-11-15', 'voci-fable.json');
let fable = R.voci.filter(v => v.generata);
if (!fable.length && fs.existsSync(DOC_FABLE)) fable = JSON.parse(fs.readFileSync(DOC_FABLE, 'utf8')).voci;
const schede = R.voci.filter(v => v.raccolta === 'schede' && !v.generata);
const studi = R.voci.filter(v => v.raccolta === 'studi');
if (!fable.length) { console.log('Nessuna scheda Fable in RIF_DISTR: rigenera con npm run riferimenti.'); process.exit(1); }

/* una casella: mediana Fable contro fascia (10°–90°, arrotondata verso l'esterno) e mediana reali */
function confronta(F, V) {
  const qF = F.map(quote).filter(Boolean), qV = V.map(quote).filter(Boolean);
  return GR.map((g, j) => {
    const cf = qF.map(q => q[j]), cv = qV.map(q => q[j]);
    const fm = percentile(cf, 50), rm = percentile(cv, 50), lo = Math.floor(percentile(cv, 10)), hi = Math.ceil(percentile(cv, 90));
    return { g, fm, rm, lo, hi, dentro: fm >= lo && fm <= hi, scarto: Math.abs(fm - rm) };
  });
}
const r1 = x => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',');
const righe = [];
const out = s => { righe.push(s); console.log(s); };

function prova(nome, caselle, principale) {
  const coppie = [];
  out('\n## ' + nome + '\n');
  out('| casella | voci reali | Fable | ' + GR.join(' | ') + ' |');
  out('|---|---|---|' + GR.map(() => '---').join('|') + '|');
  caselle.forEach(c => {
    if (c.V.length < MIN || !c.F.length) { out('| ' + c.nome + ' | ' + c.V.length + ' | ' + c.F.length + ' | ' + GR.map(() => '—').join(' | ') + ' |'); return; }
    const r = confronta(c.F, c.V);
    r.forEach(x => coppie.push(Object.assign({ casella: c.nome }, x)));
    out('| ' + c.nome + ' | ' + c.V.length + ' | ' + c.F.length + ' | ' + r.map(x => (x.dentro ? '' : '**') + r1(x.fm) + ' vs ' + r1(x.rm) + ' [' + x.lo + '–' + x.hi + ']' + (x.dentro ? '' : '**')).join(' | ') + ' |');
  });
  if (!coppie.length) { out('\nNessuna casella confrontabile (servono almeno ' + MIN + ' voci reali).'); return null; }
  const dentro = coppie.filter(x => x.dentro).length / coppie.length;
  const medio = coppie.reduce((a, x) => a + x.scarto, 0) / coppie.length;
  const peggio = coppie.slice().sort((a, b) => b.scarto - a.scarto)[0];
  const ok1 = dentro >= IN_FASCIA, ok2 = medio <= SCARTO_MEDIO, ok3 = peggio.scarto <= SCARTO_MAX;
  out('\nCoppie casella × gruppo: ' + coppie.length + ' · mediana Fable nella fascia reale: **' + Math.round(dentro * 100) + '%** (soglia ' + IN_FASCIA * 100 + '%) ' + (ok1 ? '✔' : '✘'));
  out('Scarto medio fra le mediane: **' + r1(medio) + ' punti** (soglia ' + SCARTO_MEDIO + ') ' + (ok2 ? '✔' : '✘'));
  out('Scarto più grande: **' + r1(peggio.scarto) + ' punti** (' + peggio.casella + ' · ' + peggio.g + '; soglia ' + SCARTO_MAX + ') ' + (ok3 ? '✔' : '✘'));
  const fuori = coppie.filter(x => x.scarto > SCARTO_MAX || !x.dentro).sort((a, b) => b.scarto - a.scarto);
  if (fuori.length) out('Fuori fascia o oltre ' + SCARTO_MAX + ' punti: ' + fuori.map(x => x.casella + ' · ' + x.g + ' (Fable ' + r1(x.fm) + ', reali ' + r1(x.rm) + ')').join('; '));
  if (principale) out('\n**Esito della prova principale: ' + (ok1 && ok2 && ok3 ? 'COINCIDONO' : 'NON COINCIDONO') + '**');
  return ok1 && ok2 && ok3;
}

out('# Confronto schede Fable / dati noti (' + new Date().toISOString().slice(0, 10) + ')');
out('\nSchede Fable intere: ' + fable.length + ' · schede reali: ' + schede.length + ' (equilibrate ' + schede.filter(v => v.equilibrata).length + ') · protocolli di studio: ' + studi.length);
const caselle = (V, filtroF) => [].concat(...ESP.map(e => TIPI.map(t => ({ nome: e + ' · ' + t, F: fable.filter(v => nel(v, e, t) && (!filtroF || filtroF(v))), V: V.filter(v => nel(v, e, t)) }))));
const esito = prova('Prova principale: schede pubblicate (tutte), casella esperienza × tipo', caselle(schede), true);
prova('Controllo: schede pubblicate solo equilibrate', caselle(schede.filter(v => v.equilibrata)));
prova('Controllo: protocolli di studio', caselle(studi));
prova('Controllo: donne (schede reali per donne contro Fable donne), per tipo', TIPI.map(t => ({ nome: 'donne · ' + t, F: fable.filter(v => v.sesso === 'F' && nel(v, '', t)), V: schede.filter(v => v.sesso === 'F' && nel(v, '', t)) })));
prova('Controllo: per tipo (tutte le esperienze)', TIPI.map(t => ({ nome: 'tutte · ' + t, F: fable.filter(v => nel(v, '', t)), V: schede.filter(v => nel(v, '', t)) })));
prova('Controllo: tutto insieme (Fable tutte contro schede reali tutte)', [{ nome: 'tutte · tutti', F: fable, V: schede }]);
const senza = caselle(schede).filter(c => c.V.length < MIN).map(c => c.nome + ' (' + c.V.length + ')');
out('\nCaselle senza dati noti sufficienti (le copre solo Fable): ' + (senza.join(', ') || 'nessuna'));

const i = process.argv.indexOf('--md');
if (i > 0 && process.argv[i + 1]) { fs.writeFileSync(process.argv[i + 1], righe.join('\n') + '\n', 'utf8'); console.log('\nscritto ' + process.argv[i + 1]); }
process.exitCode = esito ? 0 : 2;
