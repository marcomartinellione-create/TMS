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
/* attende che l'avvio desktop completi davvero (connessione shim + prima scrittura),
   invece di un'attesa fissa: il runner CI è lento e l'app è grande, 600ms non bastano. */
async function settleConnect(dom, fsmem){
  const w = dom.window;
  const pronto = () => { try { return fsmem._files.has('TMS_Dati/profili.json') &&
    !!w.eval('typeof dirHandle!=="undefined" && dirHandle && dirHandle._local'); } catch(e){ return false; } };
  for (let k=0; k<100 && !pronto(); k++) await settle(100);  /* fino a ~10s */
  await settle(200);
}

(async () => {

console.log('Versione attesa (da src): ' + VERSIONE);

console.log('--- T1: desktop (tmsFS + FSA come in Electron) con handle stantio in IndexedDB ---');
{
  const stale = makeStaleHandle();
  const idb = makeIDB(stale.handle);
  const fsmem = makeTmsFS();
  const { dom, errors } = await load({ idb, tmsFS: fsmem, fsa: true });
  await settleConnect(dom, fsmem);
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
  const tabs = ['profilo','allenamento','cardio','storico','progressi','corpo','storicocorpo','alimentazione','analisi','esercizi','report','guida'];
  let tabErr = null;
  for(const t of tabs){ try { w.eval('showTab(' + JSON.stringify(t) + ')'); } catch(e){ tabErr = t + ': ' + e.message; break; } }
  ok(!tabErr, 'navigazione 12 tab senza eccezioni (incl. Cardio e Analisi vuote)' + (tabErr ? ' -> ' + tabErr : ''));
  /* v1.0.x: tab Allenamento rinominato "Pesi" + nuovo tab "Cardio" */
  ok(d.querySelector('.tab[data-tab="allenamento"]').textContent.includes('Pesi'), 'tab Allenamento rinominato "Pesi"');
  ok(d.querySelector('.tab[data-tab="cardio"]') !== null && d.getElementById('panel-cardio') !== null, 'nuovo tab e pannello "Cardio" presenti');
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
  /* v1.0.76: guida per AI — testo incorporato, bottone nel tab Guida, download .md versionato */
  const gai = w.eval('guidaAITesto()');
  ok(gai.startsWith('# Training Monitor System (TMS) — documentazione per assistenti AI') && gai.includes('Versione app: ' + VERSIONE) && gai.length > 8000, 'guida AI: testo completo con la versione corrente (' + gai.length + ' caratteri)');
  ok(gai.includes('Istruzioni per te, assistente AI') && gai.includes('Bug noti e limitazioni') && gai.includes('Scambio scheda coach') && gai.includes('Formule e concetti'), 'guida AI: sezioni chiave presenti');
  w.eval('showTab("guida")');
  const gbtn = d.getElementById('g-ai');
  ok(gbtn !== null && gbtn.textContent.includes('Scarica documentazione per AI'), 'bottone "Scarica documentazione per AI" accanto a Rapida/Completa');
  const nomeAI = w.eval('(()=>{ let cap=null; const oc=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ cap=this.download; }; try{ scaricaGuidaAI(); } finally { HTMLAnchorElement.prototype.click=oc; } return cap; })()');
  ok(nomeAI === 'TMS-guida-AI-v' + VERSIONE + '.md', 'download guida AI col nome versionato (' + nomeAI + ')');
  /* scheda cliente offline con bozza autosalvata (qui solo presenza nel markup: gira anche in CI) */
  const pagCli = w.eval('costruisciSchedaCliente({})');
  ok(pagCli.includes('tms-bozza-') && pagCli.includes('memoria del telefono') && pagCli.includes('bozza-stato'), 'scheda cliente: istruzioni telefono + autosalvataggio bozza nel markup');
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
/* T1b legge la TMS_Dati/ locale (dati vivi, volutamente NON nel repo): dove non esiste
   — ad es. in CI su GitHub — lo scenario si salta e restano gli altri (T1, T1c, T2–T5).
   La suite completa gira sempre in locale, dove partono le release. */
if (!fs.existsSync(path.join(ROOT, 'TMS_Dati', 'profili.json'))) {
  console.log('  SKIP scenario T1b: TMS_Dati/ assente (normale in CI; in locale è un problema!)');
} else {
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
  ok(w.eval('Array.isArray(DOC.cardio) && DOC.cardio.length') === 17, 'template: 17 sedute cardio demo caricate (Corsa/Bici/HIIT)');
  ok(w.eval('DOC.dati_utente.useRpe') === true && w.eval('DOC.dati_utente.altezza') === 178, 'dati utente template (useRpe, 178 cm)');
  const tabs = ['profilo','allenamento','cardio','progressi','corpo','storicocorpo','alimentazione','analisi','report'];
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
  /* alimentazione (richieste Marco): selettore fase nel tab, riordino pasti, preferiti/recenti + ricerca a parole sugli alimenti */
  ok(d.querySelector('#panel-alimentazione [data-fasesel]') !== null, 'alimentazione: selettore fase nel tab (non più nel Profilo)');
  w.eval('DOC.dati_utente.faseAlim="bulk"; renderAlimentazione();');
  d.querySelector('#panel-alimentazione [data-fasesel="cut"]').click();
  ok(w.eval('DOC.dati_utente.faseAlim')==='cut', 'alimentazione: il selettore imposta la fase attiva (cut)');
  w.eval('DOC.dati_utente.faseAlim="bulk"; renderAlimentazione();');
  ok(w.eval('foodMatch({nome:"Riso integrale, secco",categoria:"Cereali"},"riso secco")')===true && w.eval('foodMatch({nome:"Riso integrale, secco",categoria:"Cereali"},"riso pollo")')===false, 'alimenti: ricerca «a parole» (tutte le parole presenti)');
  { const ord=w.eval('(function(){var s=[];(DOC.alimentazione.bulk||[]).forEach(function(r){var m=((r.pasto||"").trim())||"Senza pasto";if(s.indexOf(m)<0)s.push(m);});return s;})()');
    ok(ord.length>=2, 'alimentazione: la fase bulk ha più pasti');
    w.eval('spostaPasto("bulk", '+JSON.stringify(ord[0])+', 1);');
    const ord2=w.eval('(function(){var s=[];(DOC.alimentazione.bulk||[]).forEach(function(r){var m=((r.pasto||"").trim())||"Senza pasto";if(s.indexOf(m)<0)s.push(m);});return s;})()');
    ok(ord2[0]===ord[1] && ord2[1]===ord[0], 'alimentazione: riordino pasti (sposta giù il primo)');
    w.eval('spostaPasto("bulk", '+JSON.stringify(ord[0])+', -1);'); }
  { const nome=w.eval('(DOC.alimentazione.bulk.find(function(r){return r.alimento;})||{}).alimento');
    ok(typeof nome==='string' && nome.length>0, 'alimentazione: un alimento del piano per testare i preferiti');
    w.eval('foodToggleFav('+JSON.stringify(nome)+');');
    ok(w.eval('foodIsFav('+JSON.stringify(nome)+')')===true && w.eval('DOC.alimentazione.fav.indexOf('+JSON.stringify(nome)+')>=0'), 'alimenti preferiti: la stellina aggiunge (DOC.alimentazione.fav)');
    w.eval('openFoodPicker("bulk", 0);');
    ok(d.getElementById('modal').innerHTML.includes('★ Preferiti') && d.getElementById('modal').innerHTML.includes('🕐 Recenti'), 'food picker: gruppi Preferiti e Recenti in cima');
    { const fq=d.getElementById('fp-q'); fq.value='riso secco'; fq.dispatchEvent(new w.Event('input',{bubbles:true})); }
    ok([...d.querySelectorAll('#modal .fp-row')].length>0, 'food picker: ricerca a parole trova risultati');
    w.eval('closeModal(); foodToggleFav('+JSON.stringify(nome)+');'); }
  /* stampa dieta in PDF A4 orizzontale (rendering reale non testabile in jsdom: verifico markup + PDF) */
  w.eval('DOC.dati_utente.faseAlim="bulk"; renderAlimentazione();');
  ok(d.querySelector('#panel-alimentazione #dieta-pdf-btn') && d.getElementById('dieta-pdf-btn').getAttribute('onclick')==='printDieta()', 'alimentazione: bottone «Stampa dieta (PDF A4)» presente');
  { const dh=w.eval('dietaPrintHTML()');
    ok(dh.includes('Piano alimentare') && dh.includes('Totale giornaliero') && dh.includes('day-sep') && dh.includes('rep-sec'), 'dietaPrintHTML: titolo, pasti (day-sep) e totale giornaliero'); }
  { const land=w.eval('(function(){var p=imagesToPdf([{bytes:new Uint8Array([0,1,2]),w:8,h:8}], true); return Array.from(p).map(function(c){return String.fromCharCode(c);}).join("");})()');
    const port=w.eval('(function(){var p=imagesToPdf([{bytes:new Uint8Array([0,1,2]),w:8,h:8}]); return Array.from(p).map(function(c){return String.fromCharCode(c);}).join("");})()');
    ok(land.includes('841.8898 595.2756'), 'imagesToPdf(landscape): MediaBox A4 orizzontale (841.8898 × 595.2756)');
    ok(port.includes('595.2756 841.8898'), 'imagesToPdf(default): MediaBox A4 verticale invariato (Report)'); }
  w.eval('showTab("report")');
  ok(d.getElementById('panel-report').innerHTML.includes('Dieta × allenamento'), 'report con la sezione Dieta × allenamento');
  /* il Report include la sezione Cardio (il template ha 17 sedute) + la casella sezione */
  ok(d.querySelector('#panel-report .rep-doc').innerHTML.includes('Cardio · attività e carico interno'), 'report: sezione Cardio (attività + sRPE) presente');
  ok(d.querySelector('#panel-report [data-rep="cardio"]') !== null, 'report: casella sezione Cardio nei toggle');
  /* riordino sezioni del report (richiesta Marco): ordine di default + frecce + applicazione + handler */
  let repDoc = d.querySelector('#panel-report .rep-doc').innerHTML;
  ok(repDoc.indexOf('composizione corporea') > 0 && repDoc.indexOf('Note del coach') > repDoc.indexOf('composizione corporea'), 'report: ordine di default (Profilo prima di Note)');
  ok(d.querySelector('#panel-report [data-repmove]') !== null, 'report: frecce di riordino ▲▼ presenti');
  w.eval('DOC.dati_utente.report.ordine=["note","profilo","riepilogo","scheda","andamento","progressione","record","alimentazione","analisi"]; renderReport();');
  repDoc = d.querySelector('#panel-report .rep-doc').innerHTML;
  ok(repDoc.indexOf('Note del coach') < repDoc.indexOf('composizione corporea'), 'report: ordine personalizzato applicato (Note prima di Profilo)');
  d.querySelector('#panel-report [data-repmove="profilo"][data-dir="-1"]').click();
  ok(w.eval('DOC.dati_utente.report.ordine[0]') === 'profilo', 'report: freccia ▲ riporta Profilo in cima (handler + persistenza)');
  repDoc = d.querySelector('#panel-report .rep-doc').innerHTML;
  ok(repDoc.indexOf('composizione corporea') < repDoc.indexOf('Note del coach'), 'report: render coerente dopo lo spostamento');
  w.eval('delete DOC.dati_utente.report.ordine; renderReport();'); /* ripristina il default per i test seguenti */
  /* v1.0.72: lo snapshot include storico_rpe anche dei profili NON attivi (fix backup) + getProfileData (fix lint) */
  const snapFix = await w.eval('costruisciSnapshot()');
  ok(Array.isArray(snapFix.profiles['wander'].storico_rpe) && snapFix.profiles['wander'].storico_rpe.length === 1, 'snapshot: storico_rpe del profilo non attivo incluso (fix)');
  ok((await w.eval('getProfileData("wander")')).dati_utente.nome === 'Wander', 'getProfileData legge i parametri di un profilo non attivo (fix lint)');
  /* v1.0.70: bottone Rinomina profilo (P1) e Zwieback disambiguato (P11) */
  w.eval('showTab("profilo")');
  /* v1.0.75: bottoni di scambio nella riga di ogni profilo, visibili a tendina chiusa */
  w.eval('profOpen = null; renderProfilo()');
  ok(d.querySelectorAll('#panel-profilo [data-pexs]').length === 2 && d.querySelectorAll('#panel-profilo [data-prin]').length === 2, 'bottoni scambio (export+import) nella riga di ogni profilo, a tendina chiusa');
  ok(d.getElementById('prof-exscheda') === null && d.getElementById('prof-rientro') === null, 'bottoni scambio globali rimossi dal fondo pagina');
  ok(d.getElementById('prof-backup') !== null && d.getElementById('panel-profilo').innerHTML.includes('tutti i profili'), 'backup di tutti i profili resta in fondo pagina');
  w.eval('profOpen = activeProfile; renderProfilo()');
  ok(d.querySelector('#panel-profilo [data-pren]') !== null, 'bottone "Rinomina" nel pannello profilo (P1)');
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
  /* fix ricerca Esercizi: la ricostruzione ad ogni tasto ripristina il cursore (niente testo «al contrario») */
  w.eval('exFilt=""; renderEsercizi();');
  { const s=d.getElementById('ex-s'); s.value='squat'; try{ s.setSelectionRange(5,5); }catch(e){} s.dispatchEvent(new w.Event('input',{bubbles:true})); }
  ok(w.eval('exFilt')==='squat', 'ricerca Esercizi: filtro aggiornato dall\'input');
  { const s=d.getElementById('ex-s'); ok(d.activeElement===s && s.selectionStart===5, 'ricerca Esercizi: cursore ripristinato in coda (no testo invertito)'); }
  /* ricerca «a parole»: tutte le parole presenti, anche non contigue */
  w.eval('exFilt="panca piana bilanciere"; renderEsercizi();');
  ok(d.getElementById('panel-esercizi').innerHTML.includes('Panca piana con bilanciere'), 'ricerca Esercizi: match a parole (panca piana bilanciere → Panca piana con bilanciere)');
  w.eval('exFilt=""; renderEsercizi();');
  /* enhancement: selettore esercizio in Allenamento = barra di ricerca + lista (niente più <select>) */
  w.eval('showTab("allenamento")');
  ok(d.querySelector('#panel-allenamento .ex-pick') !== null && d.querySelector('#panel-allenamento select.ex-sel') === null, 'Allenamento: cella esercizio è un pulsante picker (via il menù a tendina)');
  w.eval('window.__pick=null; pickExercise("", function(n){ window.__pick=n; });');
  ok(d.getElementById('exp-q') !== null && d.querySelectorAll('#exp-list .exp-it').length > 50, 'picker esercizi: barra di ricerca + lista per categoria popolata');
  const nTot = d.querySelectorAll('#exp-list .exp-it').length;
  { const q=d.getElementById('exp-q'); q.value='squat'; q.dispatchEvent(new w.Event('input',{bubbles:true})); }
  const nFilt = d.querySelectorAll('#exp-list .exp-it').length;
  ok(nFilt > 0 && nFilt < nTot, 'picker esercizi: la ricerca filtra la lista (' + nFilt + '/' + nTot + ')');
  { const q=d.getElementById('exp-q'); q.value='panca piana bilanciere'; q.dispatchEvent(new w.Event('input',{bubbles:true})); }
  ok([...d.querySelectorAll('#exp-list .exp-it')].some(b=>/Panca piana con bilanciere/i.test(b.dataset.nome)), 'picker esercizi: ricerca a parole trova «Panca piana con bilanciere» da «panca piana bilanciere»');
  d.querySelector('#exp-list .exp-it').click();
  ok(typeof w.eval('window.__pick')==='string' && w.eval('window.__pick').length>0 && d.getElementById('modal-bk').classList.contains('hidden'), 'picker esercizi: clic seleziona, richiama onPick e chiude il modale');
  /* picker: preferiti + recenti (a query vuota) e stellina che aggiunge/toglie dai preferiti */
  w.eval('pickExercise("", function(){});');
  ok(d.getElementById('exp-list').innerHTML.includes('🕐 Recenti'), 'picker: gruppo «Recenti» a query vuota (dallo storico)');
  { const star=d.querySelector('#exp-list .exp-star'), nome=star.dataset.fav; star.click();
    ok(w.eval('!!(esLookup('+JSON.stringify(nome)+')||{}).fav'), 'picker: la stellina aggiunge l\'esercizio ai preferiti (su catalogo)');
    ok(d.getElementById('exp-list').innerHTML.includes('★ Preferiti'), 'picker: l\'esercizio compare nel gruppo «Preferiti»');
    const on=d.querySelector('#exp-list .exp-star.on'); if(on) on.click();
    ok(!w.eval('!!(esLookup('+JSON.stringify(nome)+')||{}).fav'), 'picker: ri-cliccando la stellina si toglie dai preferiti'); }
  w.eval('closeModal()');
  /* il picker dei Pesi esclude le attività cardio (filtro e=>!isCardio(e)) */
  ok(w.eval('isCardio({macro:"Cardio"})')===true && w.eval('isCardio({categoria:"cardio"})')===true && w.eval('isCardio({macro:"Pettorali"})')===false, 'isCardio: riconosce gruppo/categoria cardio');
  w.eval('pickExercise("", function(){}, function(e){ return !isCardio(e); });');
  ok([...d.querySelectorAll('#exp-list .exp-it')].every(b=>!w.eval('isCardio(esLookup('+JSON.stringify(b.dataset.nome)+'))')), 'picker Pesi: nessuna attività cardio in lista');
  w.eval('closeModal()');
  /* ── Cardio: sRPE (Foster) + TRIMP (Banister), dati in DOC.cardio ── */
  ok(w.eval('srpeCardio({rpe:6,durata:40})')===240, 'Cardio: sRPE = RPE×min (240 AU)');
  ok(w.eval('trimpCardio({rpe:6,durata:40})')===null, 'Cardio: TRIMP nullo senza FC media');
  ok(typeof w.eval('trimpCardio({durata:40,fcMedia:140})')==='number' && w.eval('trimpCardio({durata:40,fcMedia:140})')>0, 'Cardio: TRIMP calcolato con FC media (FC max da età)');
  /* cardio più preciso: FC max/riposo dal Profilo (la max impostata ha la precedenza sulla stima) */
  ok(w.eval('(function(){ DOC.dati_utente.fcMax=190; var v=fcMaxStimata(); DOC.dati_utente.fcMax=""; return v; })()')===190, 'FC max: il valore del Profilo ha la precedenza sulla stima');
  ok(w.eval('fcMaxStimata()')===w.eval('Math.round(208-0.7*etaOf(DOC.dati_utente))'), 'FC max stimata = Tanaka(età) quando non impostata');
  { const a=w.eval('trimpCardio({durata:40,fcMedia:140})'); w.eval('DOC.dati_utente.fcRiposo=50;'); const b=w.eval('trimpCardio({durata:40,fcMedia:140})'); w.eval('DOC.dati_utente.fcRiposo="";');
    ok(typeof a==='number' && typeof b==='number' && a!==b, 'TRIMP cambia con la FC a riposo impostata nel Profilo'); }
  const _nomeProf = w.eval('(profili.find(p=>p.slug===activeProfile)||{}).nome');
  w.eval('showTab("profilo"); anagraficaModal();');
  ok(d.getElementById('m-fcrip')!==null && d.getElementById('m-fcmax')!==null, 'anagrafica: campi FC riposo e FC max presenti');
  ok(d.getElementById('m-fase')===null, 'anagrafica: fase alimentare rimossa dal Profilo (si sceglie in Alimentazione)');
  w.eval('document.getElementById("m-fcrip").value="55"; document.getElementById("m-fcmax").value="192";');
  d.getElementById('m-ok').click();
  ok(w.eval('DOC.dati_utente.fcRiposo')===55 && w.eval('DOC.dati_utente.fcMax')===192, 'anagrafica: FC riposo/max salvate nel profilo');
  /* ripristina lo stato toccato dal salvataggio anagrafica (FC + nome profilo) per i test seguenti */
  w.eval('DOC.dati_utente.fcRiposo=""; DOC.dati_utente.fcMax=""; var p=profili.find(x=>x.slug===activeProfile); if(p)p.nome='+JSON.stringify(_nomeProf)+';');
  w.eval('showTab("cardio")');
  ok(d.getElementById('panel-cardio').innerHTML.includes('sRPE') && d.getElementById('panel-cardio').innerHTML.includes('TRIMP') && d.getElementById('cardio-add')!==null, 'tab Cardio: colonne sRPE/TRIMP + bottone aggiungi');
  const nCard = w.eval('Array.isArray(DOC.cardio)?DOC.cardio.length:0');
  w.eval('cardioModal(-1)');
  w.eval('document.getElementById("c-data").value="2026-06-13"; document.getElementById("c-tipo").value="Corsa"; document.getElementById("c-min").value="40"; document.getElementById("c-rpe").value="6"; document.getElementById("c-fc").value="140";');
  d.getElementById('c-ok').click();
  ok(w.eval('DOC.cardio.length')===nCard+1, 'Cardio: nuova attività aggiunta a DOC.cardio');
  { const last=w.eval('DOC.cardio[DOC.cardio.length-1]'); ok(last.tipo==='Corsa' && last.durata===40 && last.rpe===6 && last.fcMedia===140, 'Cardio: dati attività salvati (tipo/min/rpe/FC)'); }
  ok(d.getElementById('panel-cardio').innerHTML.includes('Corsa') && d.getElementById('panel-cardio').innerHTML.includes('240'), 'Cardio: la tabella mostra l\'attività con sRPE');
  ok(Array.isArray((await w.eval('costruisciSnapshot()')).profiles['template'].cardio) && (await w.eval('costruisciSnapshot()')).profiles['template'].cardio.length>=1, 'Cardio: incluso nello snapshot di backup');
  /* cardio nel radar "Equilibrio volume": 2 h/sett (120 min) ≈ 12 serie-equivalenti (min÷10) */
  w.eval('DOC.cardio.push({data:"2025-01-15",tipo:"Bici",durata:120,rpe:5})');
  { const code=w.eval('(function(){var w=isoWeek(new Date("2025-01-15T12:00:00"));return schedaCode(w.anno,w.sett);})()');
    ok(w.eval('cardioMinByWeek()['+code+']')===120 && w.eval('cardioEquivSets('+code+')')===12, 'cardio nel radar: 120 min (2h) → 12 serie-equivalenti'); }
  ok(w.eval('cardioEquivSets(999999)')===0, 'cardio nel radar: settimana senza cardio → 0');
  /* import «avanzato»: file attività .TCX (namespaced) e .GPX → modale precompilato */
  const tcx='<?xml version="1.0"?><TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"><Activities><Activity Sport="Running"><Id>2026-06-13T08:00:00Z</Id><Lap><TotalTimeSeconds>1800</TotalTimeSeconds><DistanceMeters>5000</DistanceMeters><Track><Trackpoint><Time>2026-06-13T08:00:00Z</Time><AltitudeMeters>100</AltitudeMeters><HeartRateBpm><Value>150</Value></HeartRateBpm></Trackpoint><Trackpoint><Time>2026-06-13T08:30:00Z</Time><AltitudeMeters>160</AltitudeMeters><HeartRateBpm><Value>170</Value></HeartRateBpm></Trackpoint></Track></Lap></Activity></Activities></TrainingCenterDatabase>';
  w.eval('window.__tcx='+JSON.stringify(tcx));
  { const p=w.eval('parseAttivitaCardio(window.__tcx)'); ok(p&&p.tipo==='Corsa'&&p.durata===30&&p.fcMedia===160&&p.fcMax===170&&p.distanza===5&&p.quota===60, 'import TCX: tipo/durata/FC media/FC max/distanza/D+ estratti'); }
  const gpx='<?xml version="1.0"?><gpx><trk><type>cycling</type><trkseg><trkpt lat="45.00" lon="9.00"><time>2026-06-13T08:00:00Z</time><extensions><gpxtpx:hr xmlns:gpxtpx="u">120</gpxtpx:hr></extensions></trkpt><trkpt lat="45.00" lon="9.00"><time>2026-06-13T08:20:00Z</time><extensions><gpxtpx:hr xmlns:gpxtpx="u">140</gpxtpx:hr></extensions></trkpt></trkseg></trk></gpx>';
  w.eval('window.__gpx='+JSON.stringify(gpx));
  { const g=w.eval('parseAttivitaCardio(window.__gpx)'); ok(g&&g.tipo==='Bici'&&g.durata===20&&g.fcMedia===130&&g.fcMax===140, 'import GPX: tipo/durata/FC dalla traccia hr'); }
  ok(w.eval('parseAttivitaCardio("<x>non valido</x>")')===null, 'import: file non-attività → null (errore chiaro all\'utente)');
  /* import .FIT (binario Garmin): costruisco un mini file FIT con un messaggio «session» */
  {
    const u32=v=>[v&0xFF,(v>>>8)&0xFF,(v>>>16)&0xFF,(v>>>24)&0xFF], u16=v=>[v&0xFF,(v>>>8)&0xFF];
    const fitTs=Math.floor(Date.parse('2026-06-12T08:00:00Z')/1000)-631065600;
    const def=[0x40,0x00,0x00,0x12,0x00,0x07, 8,4,0x86, 9,4,0x86, 16,1,0x02, 17,1,0x02, 22,2,0x84, 5,1,0x00, 2,4,0x86];
    const data=[0x00].concat(u32(2400*1000)).concat(u32(8000*100)).concat([150,170]).concat(u16(60)).concat([1]).concat(u32(fitTs));
    const body=def.concat(data);
    const header=[12,0x10,0,0].concat(u32(body.length)).concat([0x2E,0x46,0x49,0x54]);
    dom.window.__fit=new Uint8Array(header.concat(body).concat([0,0]));
    const p=w.eval('parseFIT(window.__fit)');
    ok(p && p.tipo==='Corsa' && p.durata===40 && p.distanza===8 && p.fcMedia===150 && p.fcMax===170 && p.quota===60 && p.data==='2026-06-12', 'import FIT: messaggio session estratto (durata/distanza/FC/D+/sport/data)');
  }
  ok(w.eval('parseFIT(new Uint8Array([1,2,3]))')===null, 'import FIT: file non valido → null');
  w.eval('showTab("cardio")');
  ok(d.getElementById('cardio-imp')!==null, 'tab Cardio: input per importare .tcx/.gpx');
  w.eval('cardioModal(-1, parseAttivitaCardio(window.__tcx))');
  ok(d.getElementById('c-tipo').value==='Corsa' && +d.getElementById('c-min').value===30 && +d.getElementById('c-fc').value===160 && +d.getElementById('c-fcmax').value===170, 'import: modale precompilato coi dati del file (RPE da aggiungere)');
  w.eval('closeModal()');
  /* sport con metadati: guidano campi del modale e ritmo (passo/velocità) */
  ok(w.eval('sportInfo("Corsa").dist')===true && w.eval('sportInfo("Corsa").ritmo')==='passo' && w.eval('sportInfo("Corsa").quota')===true, 'sport Corsa: distanza + passo + dislivello');
  ok(w.eval('sportInfo("HIIT").dist')===false, 'sport HIIT: niente distanza');
  ok(w.eval('passoMinKm({durata:30,distanza:5})')===6 && w.eval('fmtPasso(6)')==='6:00', 'cardio: passo 30 min / 5 km = 6:00 /km');
  ok(w.eval('velocitaKmh({durata:60,distanza:30})')===30, 'cardio: velocità 60 min / 30 km = 30 km/h');
  ok(/\/km$/.test(w.eval('cardioRitmo({tipo:"Corsa",durata:30,distanza:5})')) && /km\/h$/.test(w.eval('cardioRitmo({tipo:"Bici",durata:60,distanza:30})')), 'cardio: la colonna Ritmo è passo per la corsa, velocità per la bici');
  /* modale: i campi compaiono in base allo sport */
  w.eval('showTab("cardio"); cardioModal(-1);');
  w.eval('var s=document.getElementById("c-tipo"); s.value="HIIT"; s.onchange();');
  ok(d.getElementById('c-dist-wrap').style.display==='none', 'modale cardio: HIIT nasconde la distanza');
  w.eval('var s=document.getElementById("c-tipo"); s.value="Corsa"; s.onchange();');
  ok(d.getElementById('c-dist-wrap').style.display!=='none' && d.getElementById('c-quota-wrap').style.display!=='none', 'modale cardio: Corsa mostra distanza e dislivello');
  w.eval('closeModal()');
  /* Progressi: grafici cardio per sport (Corsa con più sedute → passo/distanza/FC) */
  w.eval('DOC.cardio.push({data:"2025-01-08",tipo:"Corsa",durata:30,rpe:6,distanza:5,fcMedia:150}); DOC.cardio.push({data:"2025-01-15",tipo:"Corsa",durata:32,rpe:6,distanza:5.5,fcMedia:148});');
  w.eval('progCardioSport="Corsa"; showTab("progressi");');
  { const pr=d.getElementById('panel-progressi').innerHTML;
    ok(pr.includes('Cardio · progressione per sport') && d.getElementById('prog-cardio-sport')!==null, 'Progressi: sezione cardio per sport con selettore');
    ok(pr.includes('Passo') && pr.includes('Distanza') && pr.includes('FC media'), 'Progressi cardio: grafici passo/distanza/FC per la Corsa'); }
  w.eval('showTab("esercizi")');
  /* v1.0.66: il tab Profilo mostra il nome del profilo attivo */
  ok(d.querySelector('.tab[data-tab="profilo"]').textContent.includes('Atleta Template'), 'tab Profilo = nome del profilo attivo');
  /* v1.0.66: scambio scheda trainer ↔ cliente */
  const schedaHtml = w.eval('costruisciSchedaCliente({})');
  ok(schedaHtml.length > 5000 && schedaHtml.includes('Crea il file per il trainer') && schedaHtml.includes('tms-rientro') && schedaHtml.includes('id="s-0"') && schedaHtml.includes('Atleta Template'), 'export scheda cliente: HTML autonomo con input e meta profilo');
  /* ottimizzazione vista smartphone: media query + etichette dei campi (tabella→scheda per esercizio) */
  ok(schedaHtml.includes('@media (max-width:640px)') && schedaHtml.includes('data-label="Serie"') && schedaHtml.includes('data-label="Peso (kg)"') && schedaHtml.includes('inputmode='), 'export scheda cliente: ottimizzato per smartphone (responsive + etichette + tastiera numerica)');
  /* bozza autosalvata nella pagina del cliente (soluzione offline, richiesta Marco 2026-06-13):
     la pagina generata viene caricata in un jsdom dedicato come farebbe il cliente */
  const bozzaKey = 'tms-bozza-template-' + new Date().toISOString().slice(0, 10);
  {
    const sub = new JSDOM(schedaHtml, { runScripts: 'dangerously', url: 'https://cliente.test/scheda.html' });
    const sd = sub.window.document;
    sd.getElementById('n-0').value = 'bozza di prova';
    sd.getElementById('n-0').dispatchEvent(new sub.window.Event('input', { bubbles: true }));
    const salvata = JSON.parse(sub.window.localStorage.getItem(bozzaKey) || '{}');
    ok(salvata['n-0'] === 'bozza di prova', 'scheda cliente: bozza autosalvata in localStorage al primo input');
    sub.window.close();
  }
  {
    const sub = new JSDOM(schedaHtml, { runScripts: 'dangerously', url: 'https://cliente.test/scheda.html',
      beforeParse(win){ win.localStorage.setItem(bozzaKey, JSON.stringify({ 'n-0': 'ripresa', 's-0': '5' })); } });
    const sd = sub.window.document;
    ok(sd.getElementById('n-0').value === 'ripresa' && sd.getElementById('s-0').value === '5', 'scheda cliente: bozza ricaricata alla riapertura del file');
    ok(sd.getElementById('bozza-nota').textContent.includes('Bozza ritrovata'), 'scheda cliente: avviso "bozza ritrovata" alla riapertura');
    sub.window.close();
  }
  /* Δ TL per SET (richiesta Marco): ogni set incrementale ha il suo Δ vs il set di pari posizione */
  ok(Array.isArray(w.eval('lastBlockSets("__inesistente__",1)')) && w.eval('lastBlockSets("__inesistente__",1)').length === 0, 'lastBlockSets: array vuoto se l\'esercizio non è nello storico');
  w.eval('DOC.storico.push({scheda:202699,esercizio:"Squat con bilanciere",seduta:1,serie:1,rip:5,peso:100,test:false,macro:"Gambe"},{scheda:202699,esercizio:"Squat con bilanciere",seduta:1,serie:1,rip:5,peso:110,test:false,macro:"Gambe"});');
  { const s = w.eval('lastBlockSets("Squat con bilanciere",1)'); ok(Array.isArray(s) && s.length === 2 && s[1] > s[0], 'lastBlockSets: TL dei due set in ordine (110 kg > 100 kg)'); }
  w.eval('schedaMode="settimanale"; DOC.scheda.settimanale=[{giorno:"Lunedì",esercizio:"Squat con bilanciere",serie:1,rip:5,peso:105,rir:""},{giorno:"Lunedì",esercizio:"Squat con bilanciere",serie:1,rip:5,peso:115,rir:""}]; showTab("allenamento");');
  { const trs = [...d.querySelectorAll('#panel-allenamento tbody tr[data-i]')];
    ok(trs.length === 2 && /%/.test(trs[0].children[10].textContent) && /%/.test(trs[1].children[10].textContent), 'Δ TL per set: ENTRAMBI i set incrementali mostrano il proprio Δ (non solo il primo)');
    ok(trs[0].children[10].textContent.includes('▲') && trs[1].children[10].textContent.includes('▲'), 'Δ TL per set: set 1 (105 vs 100) e set 2 (115 vs 110) entrambi in crescita'); }
  w.eval('DOC.storico.pop(); DOC.storico.pop();');
  /* riordino esercizi nel giorno (▲▼) — la scheda ha 2 Squat (105, 115) su Lunedì */
  d.querySelector('#panel-allenamento tbody tr[data-i="0"] [data-mvdn]').click();
  ok(w.eval('DOC.scheda.settimanale[0].peso') === 115 && w.eval('DOC.scheda.settimanale[1].peso') === 105, 'Pesi: ▼ sposta l\'esercizio giù nel giorno (riordino)');
  /* ＋ Esercizio con scelta del giorno */
  { const nPrima = w.eval('DOC.scheda.settimanale.length'); w.eval('aggiungiEsercizioModal()');
    ok(d.getElementById('m-day') !== null, 'Pesi: ＋ Esercizio apre la scelta del giorno');
    w.eval('document.getElementById("m-day").value="Mercoledì";'); d.getElementById('m-ok').click();
    ok(w.eval('DOC.scheda.settimanale.length') === nPrima + 1 && w.eval('DOC.scheda.settimanale.some(r=>r.giorno==="Mercoledì"&&!r.esercizio)'), 'Pesi: l\'esercizio viene aggiunto nel giorno scelto (Mercoledì)'); }
  ok(w.eval('schedaCode(isoWeek(new Date("2026-06-11T12:00:00")).anno, isoWeek(new Date("2026-06-11T12:00:00")).sett)') === 202624, 'conversione data -> settimana ISO (11/06/2026 = 202624)');
  const rientro = { tipo:'tms-rientro', versione:1, profilo:{slug:'template',nome:'Atleta Template'},
    righe:[ {giorno:'Lunedì',esercizio:'Panca piana con bilanciere - presa media',serie:3,rip:8,peso:70,rir:2,note:'ok'},
            {giorno:'Martedì',esercizio:'Squat con bilanciere',serie:4,rip:6,peso:100,rir:null} ],
    sedute:[ {giorno:'Lunedì',rpe:8,min:75} ] };
  /* nuovo flusso (richiesta Marco): il rientro entra nella SCHEDA PESI per la revisione,
     non più diretto allo Storico; il coach controlla e salva a mano */
  const stoPrima = w.eval('DOC.storico.length');
  const ris = await w.eval('caricaRientroInScheda(' + JSON.stringify(rientro) + ')');
  ok(ris.righe === 2 && ris.sedute === 1, 'caricaRientroInScheda: 2 esercizi + 1 seduta nella scheda');
  ok(w.eval('DOC.scheda.settimanale.length') === 2
     && w.eval('DOC.scheda.settimanale[0].esercizio.startsWith("Panca")') === true
     && w.eval('DOC.scheda.settimanale[0].serie') === 3 && w.eval('DOC.scheda.settimanale[0].peso') === 70,
     'rientro caricato nella scheda Pesi (righe con serie/peso del cliente)');
  ok(w.eval('DOC.scheda.rpe.settimanale["Lunedì"].rpe') === 8 && w.eval('DOC.scheda.rpe.settimanale["Lunedì"].min') === 75, 'rientro: seduta RPE (fatica+durata) nella bozza della scheda');
  ok(w.eval('DOC.storico.length') === stoPrima, 'rientro: lo Storico NON cambia finché il coach non salva a mano');
  /* import e2e: file non valido + file valido -> carica in Pesi, niente scrittura automatica */
  await w.eval('importaRientroFile(' + JSON.stringify({}) + ')'); /* oggetto non-file: alert "non valido", nessun crash */
  const fakeFile = { text: async () => JSON.stringify(rientro) };
  dom.window.__file = fakeFile;
  w.eval('window.__oc=window.confirm; window.confirm=function(){return true;};');
  w.eval('showTab("profilo")');
  await w.eval('importaRientroFile(window.__file)');
  await settle(200);
  ok(w.eval('curTab') === 'allenamento', 'import e2e: porta al tab Pesi per la revisione');
  ok(w.eval('DOC.scheda.settimanale.length') === 2 && w.eval('DOC.storico.length') === stoPrima, 'import e2e: caricato in scheda, Storico invariato (si salva a mano)');
  w.eval('window.confirm=window.__oc;');
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
  ok(rapida.includes('Coach ↔ cliente') && rapida.includes('📤 Esporta scheda'), 'Guida rapida: passo coach ↔ cliente');
  ok(!d.body.innerHTML.includes('Tarnished'), 'nessuna istanza di «Rise, Tarnished»');
  const nomeBk = await w.eval('(async()=>{ let cap=null; const oc=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ cap=this.download; }; try{ await backupData(); } finally { HTMLAnchorElement.prototype.click=oc; } return cap; })()');
  ok(typeof nomeBk === 'string' && nomeBk.startsWith('TMS-backup-atleta-template-'), 'backup col nome del profilo attivo (' + nomeBk + ')');
  /* v1.0.75: il bottone 📤 nella riga di un profilo NON attivo lo attiva e ne esporta la scheda */
  w.eval('showTab("profilo")');
  ok(d.querySelector('#panel-profilo [data-pexs="wander"]') !== null, 'bottone 📤 nella riga del profilo non attivo, senza aprire la tendina');
  const nomeEx = await w.eval('(async()=>{ let cap=null; const oc=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ cap=this.download; }; try{ await document.querySelector(\'#panel-profilo [data-pexs="wander"]\').onclick(); } finally { HTMLAnchorElement.prototype.click=oc; } return cap; })()');
  ok(w.eval('activeProfile') === 'wander', 'export dalla riga: profilo attivato da solo');
  ok(typeof nomeEx === 'string' && nomeEx.startsWith('Scheda_wander_'), 'export dalla riga: scheda del profilo giusto (' + nomeEx + ')');
  const apertoPrima = w.eval('profOpen');
  d.querySelector('#panel-profilo [data-prin="wander"]').closest('label').dispatchEvent(new w.MouseEvent('click', {bubbles:true}));
  ok(w.eval('profOpen') === apertoPrima, 'click sui bottoni della riga: la tendina non si apre/chiude');
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
  await settleConnect(dom, fsmem);
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
  await settleConnect(dom, fsmem);
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
