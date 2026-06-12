'use strict';
/*
 * test-app.js — suite jsdom del TMS (OBBLIGATORIA prima di ogni release, vedi CLAUDE.md).
 *
 * Carica l'artefatto `Training Monitor System.html` e verifica il comportamento reale
 * nelle tre modalità: desktop (stub window.tmsFS, come in Electron), browser con FSA,
 * browser senza FSA. La versione attesa è letta da src/app/01-costanti.js: il test non
 * va aggiornato ad ogni bump.
 *
 * Limiti noti (verificare in app): stampa PDF, riproduzione video, picker FSA reale.
 */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ARTEFATTO = path.join(ROOT, 'Training Monitor System.html');

const costanti = fs.readFileSync(path.join(ROOT, 'src', 'app', '01-costanti.js'), 'utf8');
const VERSIONE = (costanti.match(/APP_VERSION='([^']+)'/) || [])[1];
if (!VERSIONE) { console.error('ERRORE: APP_VERSION non trovata in src/app/01-costanti.js'); process.exit(2); }

let pass = 0, fail = 0;
function ok(cond, label){ if(cond){ pass++; console.log('  OK   ' + label); } else { fail++; console.log('  FAIL ' + label); } }

/* ── mock IndexedDB minimale (jsdom non la implementa) ── */
function makeIDB(seedHandle){
  const dbs = {};
  function getDb(name){ if(!dbs[name]) dbs[name] = { stores:{}, version:0 }; return dbs[name]; }
  if(seedHandle){ const d = getDb('tms-store'); d.stores['handles'] = new Map([['dirHandle', seedHandle]]); d.version = 1; }
  return {
    _dbs: dbs,
    open(name, ver){
      const req = {};
      setTimeout(()=>{
        const d = getDb(name);
        const db = {
          objectStoreNames: { contains: sn => !!d.stores[sn] },
          createObjectStore(sn){ d.stores[sn] = d.stores[sn] || new Map(); return {}; },
          close(){},
          transaction(sn){
            const tx = {}; const pending = [];
            tx.objectStore = n => ({
              get(k){ const rq = {}; pending.push(()=>{ rq.result = d.stores[n] ? d.stores[n].get(k) : undefined; rq.onsuccess && rq.onsuccess(); }); return rq; },
              put(v,k){ const rq = {}; pending.push(()=>{ (d.stores[n] = d.stores[n] || new Map()).set(k,v); rq.onsuccess && rq.onsuccess(); }); return rq; },
              delete(k){ const rq = {}; pending.push(()=>{ d.stores[n] && d.stores[n].delete(k); rq.onsuccess && rq.onsuccess(); }); return rq; }
            });
            setTimeout(()=>{ pending.forEach(f=>f()); tx.oncomplete && tx.oncomplete(); }, 0);
            return tx;
          }
        };
        if((ver||1) > d.version){ d.version = ver||1; req.result = db; req.onupgradeneeded && req.onupgradeneeded(); }
        req.result = db;
        req.onsuccess && req.onsuccess();
      }, 0);
      return req;
    }
  };
}

/* ── stub del ponte desktop window.tmsFS (filesystem in memoria) ── */
function makeTmsFS(){
  const files = new Map(); const dirs = new Set(['']);
  return {
    _files: files,
    exists: async p => files.has(p) || dirs.has(p),
    readFile: async p => { if(!files.has(p)) throw new Error('ENOENT '+p); return files.get(p); },
    writeFile: async (p,data)=>{ files.set(p, data); const parts = p.split('/'); parts.pop(); let acc=''; for(const part of parts){ acc = acc ? acc+'/'+part : part; dirs.add(acc); } },
    mkdir: async p => { dirs.add(p); },
    remove: async p => { files.delete(p); dirs.delete(p); }
  };
}

/* ── handle FSA "stantio" (vecchia modalità cartella collegata): permesso mai concedibile ── */
function makeStaleHandle(){
  const calls = { query:0, request:0 };
  return { calls, handle: {
    name: 'Quantum Moon',
    queryPermission: async ()=>{ calls.query++; return 'prompt'; },
    requestPermission: async ()=>{ calls.request++; const e = new Error('User activation is required'); e.name='SecurityError'; throw e; },
    getDirectoryHandle: async ()=>{ const e = new Error('stale'); e.name='NotFoundError'; throw e; }
  }};
}

function load(opts){
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if(!/not implemented/i.test(String(e.message))) errors.push(String(e.message)+' '+String(e.detail&&e.detail.message||'')); });
  return JSDOM.fromFile(ARTEFATTO, {
    runScripts: 'dangerously',
    url: 'https://tms.test/index.html',  /* origine non-opaca: serve a localStorage (toggle video, tema) */
    virtualConsole: vc,
    beforeParse(window){
      window.fetch = () => Promise.reject(new Error('offline'));
      if(!window.matchMedia) window.matchMedia = ()=>({matches:false,addListener(){},removeListener(){}});
      if(opts.idb) window.indexedDB = opts.idb;
      if(opts.tmsFS) window.tmsFS = opts.tmsFS;
      if(opts.fsa) window.showDirectoryPicker = async ()=>{ const e = new Error('abort'); e.name='AbortError'; throw e; };
      if(!window.URL.createObjectURL){ window.URL.createObjectURL = ()=>'blob:test'; window.URL.revokeObjectURL = ()=>{}; }
      /* stub del canale aggiornamenti del wrapper (v1.0.73) */
      window.__upd = { cb: null, risposte: [] };
      window.tmsUpdate = { onEvento: cb => { window.__upd.cb = cb; }, rispondi: a => { window.__upd.risposte.push(a); } };
      window.addEventListener('error', ev => errors.push(String(ev.message)));
    }
  }).then(dom => ({ dom, errors }));
}
const settle = ms => new Promise(r => setTimeout(r, ms||600));

(async () => {

console.log('Versione attesa (da src): ' + VERSIONE);

console.log('--- T1: desktop (tmsFS + FSA come in Electron) con handle stantio in IndexedDB ---');
{
  const stale = makeStaleHandle();
  const idb = makeIDB(stale.handle);
  const fsmem = makeTmsFS();
  const { dom, errors } = await load({ idb, tmsFS: fsmem, fsa: true });
  await settle();
  const w = dom.window, d = w.document;
  ok(errors.length === 0, 'nessun errore runtime' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  ok(w.eval('APP_VERSION') === VERSIONE, 'APP_VERSION coerente con il sorgente');
  ok(d.getElementById('overlay').classList.contains('hidden'), 'nessun gate all\'avvio');
  ok(w.eval('dirHandle && dirHandle._local === true'), 'connesso con lo shim dati locali');
  ok(stale.calls.request === 0, 'requestPermission del vecchio handle mai chiamata');
  ok(idb._dbs['tms-store'].stores['handles'].has('dirHandle') === false, 'handle stantio rimosso da IndexedDB');
  ok(fsmem._files.has('TMS_Dati/profili.json'), 'persistAll scrive via ponte (TMS_Dati/profili.json)');
  ok(fsmem._files.has('TMS_Dati/esercizi.json'), 'catalogo scritto (TMS_Dati/esercizi.json)');
  let pj = null; try { pj = JSON.parse(fsmem._files.get('TMS_Dati/profili.json')); } catch(e){}
  ok(pj && pj.list && pj.list.length >= 1, 'profili.json valido con profilo attivo ' + (pj && pj.active));
  ok(d.getElementById('dir-warn') === null, 'banner "cartella inattesa" assente (rimosso in v1.0.57)');
  ok(d.getElementById('conn').style.display === 'none', 'indicatore percorso nascosto a connessione riuscita (v1.0.58)');
  ok(d.getElementById('btn-disconnect') === null && w.eval('typeof disconnectDirectory') === 'undefined', 'bottone e funzione Disconnetti rimossi (v1.0.59)');
  ok(d.getElementById('tab-dev') === null && d.getElementById('panel-dev') === null, 'tab e pannello Dev rimossi (v1.0.59)');
  ok(w.eval('typeof renderDev') === 'undefined' && w.eval('typeof loadDev') === 'undefined' && w.eval('typeof SHARE_ENABLED') === 'undefined', 'funzioni e costante del tab Dev rimosse');
  const tabs = ['profilo','allenamento','storico','progressi','corpo','storicocorpo','alimentazione','analisi','esercizi','report','guida'];
  let tabErr = null;
  for(const t of tabs){ try { w.eval('showTab(' + JSON.stringify(t) + ')'); } catch(e){ tabErr = t + ': ' + e.message; break; } }
  ok(!tabErr, 'navigazione 11 tab senza eccezioni (incl. Analisi vuota)' + (tabErr ? ' -> ' + tabErr : ''));
  /* regressione v1.0.63: "Nuovo profilo" usava prompt(), che Electron non supporta */
  w.eval('showTab("profilo")');
  d.getElementById('prof-new').click();
  ok(!d.getElementById('modal-bk').classList.contains('hidden') && d.getElementById('ct-in') !== null, '"Nuovo profilo" apre il modale di input (niente prompt)');
  w.eval('document.getElementById("ct-in").value = "Cliente Prova"');
  d.getElementById('ct-ok').click();
  await settle(500);
  ok(w.eval('profili.length') === 2 && w.eval('profili[1].nome') === 'Cliente Prova', 'profilo creato dal bottone (bug risolto)');
  /* pannello QR con riquadro Tutorial · YouTube (v1.0.65) */
  d.getElementById('qr-ig').click();
  const qrHtml = d.getElementById('modal').innerHTML;
  ok(qrHtml.includes('Tutorial · YouTube') && qrHtml.includes('https://www.youtube.com/@TrainingMonitorSystem') && qrHtml.includes('Apri i Tutorial'), 'pannello QR con riquadro Tutorial · YouTube e link al canale');
  w.eval('closeModal()');
  /* v1.0.72: backup automatico settimanale + mini-log errori (P4) */
  ok([...fsmem._files.keys()].some(k => /^TMS_Dati\/backup_automatici\/TMS-auto-\d{4}-\d{2}-\d{2}\.json$/.test(k)) && fsmem._files.has('TMS_Dati/backup_automatici/indice.json'), 'backup automatico creato all\'avvio (snapshot + indice)');
  ok(await w.eval('backupAutomaticoSeServe()') === false, 'stesso giorno: nessun backup doppione');
  ok((await w.eval('listaBackupAutomatici()')).length === 1, 'lista backup automatici: 1 voce');
  const snapAuto = JSON.parse([...fsmem._files.entries()].find(([k]) => k.includes('TMS-auto-'))[1]);
  ok(snapAuto._tms === 'backup' && snapAuto.profiles && Object.keys(snapAuto.profiles).length >= 1, 'snapshot automatico valido (tutti i profili)');
  w.eval('showTab("profilo")');
  await settle(300);
  ok(d.getElementById('prof-autobk') !== null && d.getElementById('prof-autobk').innerHTML.includes('Backup automatici'), 'riga backup automatici nel pannello Profilo');
  w.eval('logErrore("test", new Error("boom di prova"))');
  ok(w.eval('LOG_ERRORI.length') >= 1 && w.eval('LOG_ERRORI[LOG_ERRORI.length-1].msg') === 'boom di prova', 'logErrore registra nel ring buffer');
  w.eval('mostraLogErrori()');
  ok(d.getElementById('modal').innerHTML.includes('boom di prova'), 'modale log errori (5 click sulla versione) con la voce');
  w.eval('closeModal()');
  /* v1.0.73: dialoghi di aggiornamento in stile app (via canale tmsUpdate) */
  w.eval('window.__upd.cb({tipo:"disponibile", versione:"9.9.9", attuale:APP_VERSION, maggiore:true, note:"Novita di prova"})');
  const updHtml = d.getElementById('modal').innerHTML;
  ok(!d.getElementById('modal-bk').classList.contains('hidden') && updHtml.includes('MAGGIORE') && updHtml.includes('v9.9.9') && updHtml.includes('Novita di prova'), 'annuncio aggiornamento in stile app (maggiore + note)');
  d.getElementById('upd-vai').click();
  ok(w.eval('window.__upd.risposte.join(",")') === 'scarica' && d.getElementById('modal-bk').classList.contains('hidden'), 'Scarica e installa -> risposta al wrapper, modale chiuso');
  w.eval('window.__upd.cb({tipo:"pronto", versione:"9.9.9"})');
  ok(d.getElementById('modal').innerHTML.includes('Aggiornamento pronto'), 'modale "pronto, riavviare?" in stile app');
  d.getElementById('upd-riavvia').click();
  ok(w.eval('window.__upd.risposte.join(",")') === 'scarica,riavvia', 'Riavvia ora -> risposta al wrapper');
  w.eval('closeModal()');
  dom.window.close();
}

console.log('--- T1b: desktop con il SEED REALE (TMS_Dati) e profilo template ---');
{
  const idb = makeIDB(null);
  const fsmem = makeTmsFS();
  // precarica lo stub con i file veri del seed distribuito
  const TD = path.join(ROOT, 'TMS_Dati');
  const metti = (rel, abs) => { fsmem._files.set(rel, fs.readFileSync(abs, 'utf8')); };
  metti('TMS_Dati/profili.json', path.join(TD, 'profili.json'));
  metti('TMS_Dati/esercizi.json', path.join(TD, 'esercizi.json'));
  for (const slug of ['wander', 'template'])
    for (const f of ['scheda.json', 'storico.json', 'corpo.json', 'alimentazione.json'])
      metti('TMS_Dati/' + slug + '/' + f, path.join(TD, slug, f));
  await fsmem.mkdir('TMS_Dati'); await fsmem.mkdir('TMS_Dati/wander'); await fsmem.mkdir('TMS_Dati/template');

  const { dom, errors } = await load({ idb, tmsFS: fsmem, fsa: true });
  await settle(900);
  const w = dom.window, d = w.document;
  ok(errors.length === 0, 'nessun errore runtime' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  ok(d.getElementById('overlay').classList.contains('hidden'), 'avvio senza gate sul seed reale');
  ok(w.eval('activeProfile') === 'wander', 'profilo attivo iniziale: wander');
  ok(w.eval('profili.length') === 2 && w.eval('profili[1].slug') === 'template', 'profilo "Atleta Template" registrato');
  let swErr = null;
  try { await w.eval('switchProfile("template")'); } catch(e){ swErr = e.message; }
  ok(!swErr, 'switchProfile("template") senza eccezioni' + (swErr ? ' -> ' + swErr : ''));
  ok(w.eval('activeProfile') === 'template', 'profilo attivo: template');
  ok(w.eval('DOC.scheda.settimanale.length') === 40, 'scheda template caricata (40 righe)');
  ok(w.eval('DOC.storico.length') === 896, 'storico template caricato (896 righe)');
  ok(w.eval('DOC.storico_rpe.length') === 125, 'storico_rpe popolato (125 sedute durata+intensità)');
  ok(w.eval('DOC.dati_utente.useRpe') === true && w.eval('DOC.dati_utente.altezza') === 178, 'dati utente template (useRpe, 178 cm)');
  const tabs = ['profilo','allenamento','progressi','corpo','storicocorpo','alimentazione','analisi','report'];
  let tabErr = null;
  for(const t of tabs){ try { w.eval('showTab(' + JSON.stringify(t) + ')'); } catch(e){ tabErr = t + ': ' + e.message; break; } }
  ok(!tabErr, 'tab sul profilo template senza eccezioni' + (tabErr ? ' -> ' + tabErr : ''));
  /* v1.0.68: periodi alimentari + tab Analisi */
  ok(w.eval('DOC.alimentazione.periodi.length') === 3, 'template con 3 periodi alimentari (bulk/cut/mant)');
  ok(w.eval('settimaneTra("2025-11-03","2025-11-17").join(",")') === '202545,202546,202547', 'settimaneTra: intervallo date -> settimane ISO');
  ok(w.eval('settConsecutive(202552,202601)') === true && w.eval('settConsecutive(202545,202547)') === false, 'settConsecutive: cambio anno e buchi gestiti');
  ok(Math.abs(w.eval('pearson([1,2,3,4],[2,4,6,8])') - 1) < 1e-9, 'pearson: correlazione perfetta = 1');
  ok(w.eval('kcalPiano(DOC.alimentazione.periodi[0].righe)') > 1000, 'kcal/giorno del periodo calcolate dal piano');
  w.eval('showTab("analisi")');
  const pan = d.getElementById('panel-analisi').innerHTML;
  ok(pan.includes('Timeline') && pan.includes('bilancio calorico') && pan.includes('ritardo') && pan.includes('Confronto fasi'), 'tab Analisi: 4 grafici presenti');
  ok((pan.match(/<svg/g) || []).length >= 4, 'tab Analisi: SVG renderizzati (' + (pan.match(/<svg/g) || []).length + ')');
  w.eval('showTab("alimentazione")');
  ok(d.getElementById('panel-alimentazione').innerHTML.includes('Periodi') && d.getElementById('per-add') !== null, 'sezione Periodi nel tab Alimentazione');
  w.eval('showTab("report")');
  ok(d.getElementById('panel-report').innerHTML.includes('Dieta × allenamento'), 'report con la sezione Dieta × allenamento');
  /* v1.0.72: lo snapshot include storico_rpe anche dei profili NON attivi (fix backup) + getProfileData (fix lint) */
  const snapFix = await w.eval('costruisciSnapshot()');
  ok(Array.isArray(snapFix.profiles['wander'].storico_rpe) && snapFix.profiles['wander'].storico_rpe.length === 1, 'snapshot: storico_rpe del profilo non attivo incluso (fix)');
  ok((await w.eval('getProfileData("wander")')).dati_utente.nome === 'Wander', 'getProfileData legge i parametri di un profilo non attivo (fix lint)');
  /* v1.0.70: bottone Rinomina profilo (P1) e Zwieback disambiguato (P11) */
  w.eval('showTab("profilo")');
  w.eval('profOpen = activeProfile; renderProfilo()');
  ok(d.querySelector('#panel-profilo [data-pren]') !== null, 'bottone "Rinomina" nel pannello profilo (P1)');
  /* v1.0.74: scambio scheda ↔ cliente dentro il riquadro di ogni profilo */
  ok(d.querySelector('#panel-profilo [data-pexs]') !== null && d.querySelector('#panel-profilo [data-prin]') !== null, 'scambio scheda (export+import) dentro il riquadro del profilo');
  ok(d.getElementById('prof-exscheda') === null && d.getElementById('prof-rientro') === null, 'bottoni scambio globali rimossi dal fondo pagina');
  ok(d.getElementById('prof-backup') !== null && d.getElementById('panel-profilo').innerHTML.includes('tutti i profili'), 'backup di tutti i profili resta in fondo pagina');
  ok(w.eval('!!FOODBYNAME["Zwieback"] && !!FOODBYNAME["Zwieback (Fette biscottate integrali)"]'), 'Zwieback disambiguato nella banca alimenti (P11)');
  /* v1.0.70: vecchio checkUpdate web rimosso (P3) */
  ok(w.eval('typeof checkUpdate') === 'undefined' && w.eval('typeof UPDATE_URL') === 'undefined' && d.getElementById('update-banner') === null, 'checkUpdate/UPDATE_URL/banner web rimossi (P3)');
  /* sottocategorie (v1.0.63) sul catalogo reale */
  ok(w.eval('sottoOf(esLookup("Panca piana con bilanciere - presa media"))') === 'Panca / Distensioni', 'sottocategoria derivata: Panca / Distensioni');
  ok(w.eval('sottoOf(esLookup("Affondi / Split squat"))') === 'Affondi', 'sottocategoria derivata: Affondi');
  ok(w.eval('sottoOf({nome:"X", sotto:" Mia categoria "})') === 'Mia categoria', 'override manuale della sottocategoria');
  ok(w.eval('sottoOf({nome:"Boh", categoria:"stretching"})') === 'Allungamento', 'fallback dalla categoria del database');
  w.eval('showTab("esercizi")');
  ok(d.getElementById('panel-esercizi').innerHTML.indexOf('▸') >= 0, 'catalogo raggruppato con intestazioni di sottocategoria');
  /* v1.0.66: sottocategorie a tendina (chiuse di default, click apre) */
  ok(d.getElementById('panel-esercizi').innerHTML.indexOf('Panca piana con bilanciere - presa media') < 0, 'tendine chiuse di default (esercizi nascosti)');
  w.eval('(function(){ const e=esLookup("Panca piana con bilanciere - presa media"); exSottoAperte[(e.macro||e.gruppo)+"::"+sottoOf(e)]=true; renderEsercizi(); })()');
  ok(d.getElementById('panel-esercizi').innerHTML.indexOf('Panca piana con bilanciere - presa media') >= 0, 'click sulla tendina mostra gli esercizi della famiglia');
  /* v1.0.66: il tab Profilo mostra il nome del profilo attivo */
  ok(d.querySelector('.tab[data-tab="profilo"]').textContent.includes('Atleta Template'), 'tab Profilo = nome del profilo attivo');
  /* v1.0.66: scambio scheda trainer ↔ cliente */
  const schedaHtml = w.eval('costruisciSchedaCliente({})');
  ok(schedaHtml.length > 5000 && schedaHtml.includes('Crea il file per il trainer') && schedaHtml.includes('tms-rientro') && schedaHtml.includes('id="s-0"') && schedaHtml.includes('Atleta Template'), 'export scheda cliente: HTML autonomo con input e meta profilo');
  ok(w.eval('schedaCode(isoWeek(new Date("2026-06-11T12:00:00")).anno, isoWeek(new Date("2026-06-11T12:00:00")).sett)') === 202624, 'conversione data -> settimana ISO (11/06/2026 = 202624)');
  const rientro = { tipo:'tms-rientro', versione:1, profilo:{slug:'template',nome:'Atleta Template'},
    righe:[ {giorno:'Lunedì',esercizio:'Panca piana con bilanciere - presa media',serie:3,rip:8,peso:70,rir:2,note:'ok'},
            {giorno:'Martedì',esercizio:'Squat con bilanciere',serie:4,rip:6,peso:100,rir:null} ],
    sedute:[ {giorno:'Lunedì',rpe:8,min:75} ] };
  const ris = await w.eval('applicaRientro(' + JSON.stringify(rientro) + ', 202630)');
  ok(ris.aggiunte === 2 && ris.sedute === 1, 'applicaRientro: 2 esercizi + 1 seduta RPE');
  ok(w.eval('DOC.storico.filter(r=>r.scheda===202630).length') === 2
     && w.eval('DOC.storico.filter(r=>r.scheda===202630&&r.seduta===1).length') === 1
     && w.eval('DOC.storico.filter(r=>r.scheda===202630&&r.seduta===2).length') === 1
     && w.eval('DOC.storico.find(r=>r.scheda===202630&&r.esercizio.startsWith("Panca")).macro') === 'Pettorali',
     'righe nello Storico con sedute numerate e macro dal catalogo');
  ok(w.eval('DOC.storico_rpe.some(x=>x.scheda===202630&&x.giorno==="Lunedì"&&x.rpe===8&&x.min===75)'), 'seduta RPE (fatica+durata) registrata');
  /* import e2e: file -> modale data -> conferma */
  await w.eval('importaRientroFile(' + JSON.stringify({}) + ')'); /* oggetto non-file: alert "non valido", nessun crash */
  const fakeFile = { text: async () => JSON.stringify(rientro) };
  dom.window.__file = fakeFile;
  await w.eval('importaRientroFile(window.__file)');
  ok(d.getElementById('imp-data') !== null, 'import: modale con scelta della data');
  w.eval('document.getElementById("imp-data").value = "2026-07-01"');
  d.getElementById('imp-ok').click();
  await settle(300);
  ok(w.eval('DOC.storico.filter(r=>r.scheda===202627).length') === 2, 'import e2e: righe registrate nella settimana della data scelta (202627)');
  /* v1.0.67: guida senza link ai PDF locali, footer senza motto, backup col nome del profilo */
  w.eval('showTab("guida")');
  w.eval('guidaMode = "completa"; renderGuida()');
  const guida = d.getElementById('panel-guida').innerHTML;
  ok(!guida.includes('Documentazione/') && guida.includes('doi.org'), 'Guida §12 (completa): niente link locali, restano DOI/Scholar');
  /* v1.0.71: passo coach ↔ cliente nella Guida (rapida e completa) */
  ok(guida.includes('Scheda ↔ cliente') && guida.includes('gc-scambio') && guida.includes('Crea il file per il trainer'), 'Guida completa: sezione 10 Scheda ↔ cliente');
  ok(guida.includes('▌ 14 · Licenza'), 'Guida completa: sezioni rinumerate (Licenza = 14)');
  w.eval('guidaMode = "rapida"; renderGuida()');
  const rapida = d.getElementById('panel-guida').innerHTML;
  ok(rapida.includes('Coach ↔ cliente') && rapida.includes('Esporta scheda per il cliente'), 'Guida rapida: passo coach ↔ cliente');
  ok(!d.body.innerHTML.includes('Tarnished'), 'nessuna istanza di «Rise, Tarnished»');
  const nomeBk = await w.eval('(async()=>{ let cap=null; const oc=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ cap=this.download; }; try{ await backupData(); } finally { HTMLAnchorElement.prototype.click=oc; } return cap; })()');
  ok(typeof nomeBk === 'string' && nomeBk.startsWith('TMS-backup-atleta-template-'), 'backup col nome del profilo attivo (' + nomeBk + ')');
  /* v1.0.74: il bottone 📤 nel riquadro di un profilo NON attivo lo attiva e ne esporta la scheda */
  w.eval('showTab("profilo")');
  const hdrW = d.querySelector('#panel-profilo [data-popen="wander"]');
  ok(hdrW !== null, 'riquadro del profilo non attivo presente in lista');
  hdrW.onclick();
  await settle(300); /* il click apre il riquadro e carica i parametri in cache */
  ok(d.querySelector('#panel-profilo [data-pexs="wander"]') !== null, 'riquadro aperto con i bottoni di scambio del profilo');
  const nomeEx = await w.eval('(async()=>{ let cap=null; const oc=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ cap=this.download; }; try{ await document.querySelector(\'#panel-profilo [data-pexs="wander"]\').onclick(); } finally { HTMLAnchorElement.prototype.click=oc; } return cap; })()');
  ok(w.eval('activeProfile') === 'wander', 'export dal riquadro: profilo attivato da solo');
  ok(typeof nomeEx === 'string' && nomeEx.startsWith('Scheda_wander_'), 'export dal riquadro: scheda del profilo giusto (' + nomeEx + ')');
  dom.window.close();
}

console.log('--- T1c: video predefiniti/personali (toggle, override, scrittura binaria) ---');
{
  const idb = makeIDB(null);
  const fsmem = makeTmsFS();
  await fsmem.mkdir('database'); await fsmem.mkdir('database/video');
  fsmem._files.set('database/video/demo.mp4', 'PREDEFINITO');
  fsmem._files.set('database/video/altro.mp4', 'PREDEFINITO2');
  const { dom, errors } = await load({ idb, tmsFS: fsmem, fsa: true });
  await settle();
  const w = dom.window;
  ok(errors.length === 0, 'nessun errore runtime' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  w.eval('localStorage.setItem("tms-video-pers","0")');
  ok(await w.eval('videoSorgente("demo.mp4").then(s=>s.fonte)') === 'predefinito', 'toggle OFF -> video predefinito');
  ok(await w.eval('videoSorgente("demo.mp4").then(s=>s.fh.getFile()).then(f=>f.type)') === 'video/mp4', 'File dal ponte con MIME video/mp4 (fix riproduzione, v1.0.67)');
  ok((await w.eval('embedVideoFiles(["demo.mp4"]).then(m=>m["demo.mp4"]||"")')).startsWith('data:video/mp4;base64,'), 'data-URI dei video incorporati con MIME corretto');
  let wrErr = null;
  try { await w.eval('(async()=>{ const fh=await videoCustomHandle("demo.mp4",true); const wr=await fh.createWritable(); await wr.write(new Uint8Array([77,80,52,0,255,128,1])); await wr.close(); })()'); } catch(e){ wrErr = e.message; }
  ok(!wrErr, 'caricamento video personale via ponte senza eccezioni' + (wrErr ? ' -> ' + wrErr : ''));
  const scritto = fsmem._files.get('TMS_Dati/video/demo.mp4');
  ok(scritto && scritto.constructor && scritto.constructor.name === 'Uint8Array' && scritto.length === 7 && scritto[0] === 77 && scritto[4] === 255, 'scrittura BINARIA intatta in TMS_Dati/video/ (7 byte verificati)');
  w.eval('localStorage.setItem("tms-video-pers","1")');
  ok(await w.eval('videoSorgente("demo.mp4").then(s=>s.fonte)') === 'personale', 'toggle ON + personale presente -> video personale');
  ok(await w.eval('videoSorgente("altro.mp4").then(s=>s.fonte)') === 'predefinito', 'toggle ON ma personale assente -> fallback al predefinito');
  let rmErr = null;
  try { await w.eval('(async()=>{ const vd=await videoCustomDir(false); await vd.removeEntry("demo.mp4"); })()'); } catch(e){ rmErr = e.message; }
  ok(!rmErr && !fsmem._files.has('TMS_Dati/video/demo.mp4'), 'rimozione del personale (il predefinito resta)');
  ok(await w.eval('videoSorgente("demo.mp4").then(s=>s.fonte)') === 'predefinito', 'dopo la rimozione si torna al predefinito');
  w.eval('localStorage.setItem("tms-video-pers","0")');
  dom.window.close();
}

console.log('--- T2: desktop, nessun handle salvato ---');
{
  const idb = makeIDB(null);
  const fsmem = makeTmsFS();
  const { dom, errors } = await load({ idb, tmsFS: fsmem, fsa: true });
  await settle();
  const w = dom.window, d = w.document;
  ok(errors.length === 0, 'nessun errore runtime' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  ok(d.getElementById('overlay').classList.contains('hidden'), 'auto-connessione senza gate');
  ok(w.eval('dirHandle && dirHandle._local === true'), 'connesso con lo shim dati locali');
  ok(fsmem._files.has('TMS_Dati/profili.json'), 'dati scritti via ponte');
  dom.window.close();
}

console.log('--- T3: browser con FSA + handle stantio -> gate riconnetti ---');
{
  const stale = makeStaleHandle();
  const idb = makeIDB(stale.handle);
  const { dom, errors } = await load({ idb, fsa: true });
  await settle();
  const d = dom.window.document;
  ok(errors.length === 0, 'nessun errore runtime' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  ok(!d.getElementById('overlay').classList.contains('hidden'), 'gate mostrato');
  ok(/Ricollega/i.test(d.getElementById('ov-title').textContent), 'titolo "Ricollega la cartella"');
  ok(stale.calls.query === 1 && stale.calls.request === 1, 'flusso permessi browser invariato (query+request)');
  dom.window.close();
}

console.log('--- T4: browser con FSA, nessun handle -> gate connetti ---');
{
  const idb = makeIDB(null);
  const { dom, errors } = await load({ idb, fsa: true });
  await settle();
  const d = dom.window.document;
  ok(errors.length === 0, 'nessun errore runtime' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  ok(!d.getElementById('overlay').classList.contains('hidden'), 'gate mostrato');
  ok(/Connetti la cartella/i.test(d.getElementById('ov-title').textContent), 'titolo "Connetti la cartella"');
  ok(d.getElementById('conn').style.display !== 'none' && d.getElementById('conn-txt').textContent === 'non connesso', 'indicatore visibile con "non connesso" quando serve');
  dom.window.close();
}

console.log('--- T5: browser senza FSA e senza ponte -> gate non supportato ---');
{
  const { dom, errors } = await load({});
  await settle();
  const d = dom.window.document;
  ok(errors.length === 0, 'nessun errore runtime' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  ok(/non supportato/i.test(d.getElementById('ov-title').textContent), 'titolo "Browser non supportato"');
  dom.window.close();
}

console.log('');
console.log('RISULTATO: ' + pass + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERRORE TEST:', e); process.exit(2); });
