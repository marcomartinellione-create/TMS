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
      if(opts.lang) window.localStorage.setItem('tms-lang', opts.lang);
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
  ok(gai.includes('Istruzioni per te, assistente AI') && gai.includes('Bug noti e limitazioni') && gai.includes('Le due app: TMS (principale) e TMS Scheda (taccuino)') && gai.includes('taccuino digitale da palestra') && gai.includes('Formule e concetti'), 'guida AI: sezioni chiave presenti (incl. concetto principale/taccuino)');
  w.eval('showTab("guida")');
  const gbtn = d.getElementById('g-ai');
  ok(gbtn !== null && gbtn.textContent.includes('Scarica documentazione per AI'), 'bottone "Scarica documentazione per AI" accanto a Rapida/Completa');
  const nomeAI = w.eval('(()=>{ let cap=null; const oc=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ cap=this.download; }; try{ scaricaGuidaAI(); } finally { HTMLAnchorElement.prototype.click=oc; } return cap; })()');
  ok(nomeAI === 'TMS-guida-AI-v' + VERSIONE + '.md', 'download guida AI col nome versionato (' + nomeAI + ')');
  /* v1.0.85: l'export scheda è un JSON per l'app cliente (PWA), non più una pagina HTML */
  const schedaJs = w.eval('costruisciSchedaJSON({})');
  ok(schedaJs && schedaJs.tipo === 'tms-scheda' && schedaJs.versione === 1 && Array.isArray(schedaJs.righe) && typeof schedaJs.video === 'object', 'export scheda: JSON tms-scheda (righe + mappa video)');
  ok(typeof w.eval('APP_CLIENTE_URL') === 'string' && schedaJs.appCliente === w.eval('APP_CLIENTE_URL') && /github\.io\/TMS\/app/.test(schedaJs.appCliente), 'export scheda: URL dell\'app cliente incluso nel file');
  ok(w.eval('typeof costruisciSchedaCliente') === 'undefined', 'export HTML rimosso (sostituito dall\'app cliente)');
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
  ok(snapFix.profiles['template'].fotoFiles === undefined, 'backup normale: nessuna immagine allegata (file leggero, come prima)');
  /* 2026-08-19 — ▦ COLONNE della scheda Pesi: 12 colonne sono troppe su schermi
     piccoli. Si nascondono solo visivamente: i valori restano calcolati e salvati. */
  w.eval('showTab("allenamento")');
  ok(d.getElementById('btn-colonne') !== null, 'Pesi: bottone ▦ Colonne nella barra');
  { const tab = () => d.querySelector('#panel-allenamento table');
    ok(tab().querySelectorAll('th.col-rm').length === 2 && tab().querySelector('th.col-dtl') !== null, 'Pesi: 1RM/%1RM e Δ TL set marcate come colonne facoltative');
    ok(!/hide-rm/.test(tab().className) && !/hide-note/.test(tab().className), 'Pesi: di default si vedono tutte le colonne (come prima)');
    w.eval('colonnePesi().rm=false; colonnePesi().dtl=false; renderAllenamento();');
    ok(/hide-rm/.test(tab().className) && /hide-dtl/.test(tab().className), 'Pesi: le colonne deselezionate spariscono dalla tabella');
    ok(w.getComputedStyle(tab().querySelector('th.col-rm')).display === 'none', 'Pesi: 1RM davvero non visibile (regola CSS applicata)');
    /* il dato NON si perde: la cella c'è ancora e il TL resta calcolato */
    ok(tab().querySelector('td.col-rm') !== null && tab().querySelector('td.col-tl').textContent.trim() !== '', 'Pesi: nascondere è solo visivo — i valori restano nella tabella e nei calcoli');
    ok(w.eval('JSON.parse(JSON.stringify(docProfileData())).dati_utente.colonnePesi.rm') === false, 'Pesi: la scelta delle colonne si salva nel profilo (ogni atleta la sua)');
    w.eval('COLONNE_PESI.forEach(c=>colonnePesi()[c.k]=true); renderAllenamento();');
    ok(!/hide-/.test(tab().className.replace('hide-rir', '')), 'Pesi: «Mostra tutte» riporta la tabella completa'); }
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
  /* v1.1.4: selettore «Dati da analizzare» — tutto il percorso oppure un singolo Training Set */
  { const stoPre = w.eval('DOC.storico.length');
    ok(w.eval('schedeAggr("__tutti__").length') === w.eval('schedeAggr().length'), 'Progressi/filtro: «tutto il percorso» equivale a nessun filtro (chiamanti esistenti invariati)');
    /* due settimane etichettate con Training Set diversi */
    w.eval('DOC.storico.push({scheda:202701,esercizio:"Panca piana con bilanciere - presa media",seduta:1,macro:"Pettorali",serie:3,rip:8,peso:60,rir:null,test:false,set:"Palestra"});');
    w.eval('DOC.storico.push({scheda:202702,esercizio:"Piegamenti sulle braccia",seduta:1,macro:"Pettorali",serie:3,rip:20,peso:0,rir:null,test:false,set:"Casa"});');
    ok(w.eval('setDiStorico().indexOf("Palestra")>=0 && setDiStorico().indexOf("Casa")>=0', 'setDiStorico'), 'Progressi/filtro: i Training Set presenti nello storico compaiono tra le scelte');
    ok(w.eval('schedeAggr("Palestra").length') === 1 && w.eval('schedeAggr("Palestra")[0].scheda') === 202701, 'Progressi/filtro: scegliendo «Palestra» resta solo la sua settimana');
    ok(w.eval('schedeAggr("Casa").length') === 1 && w.eval('schedeAggr("Casa")[0].scheda') === 202702, 'Progressi/filtro: scegliendo «Casa» resta solo la sua settimana');
    ok(w.eval('senzaEtichetta()') === true, 'Progressi/filtro: rileva le settimane vecchie senza etichetta (avviso all\'utente)');
    w.eval('progSet="Palestra"; showTab("progressi");');
    ok(d.getElementById('prog-set') !== null && d.getElementById('prog-set').value === 'Palestra', 'Progressi/filtro: selettore in pagina con il set attivo selezionato');
    ok(d.getElementById('panel-progressi').textContent.includes('Tutto il percorso'), 'Progressi/filtro: tra le opzioni c\'è «Tutto il percorso»');
    /* i MASSIMALI non seguono il filtro: un record è un record (richiesta di Marco) */
    { const valori=[...d.querySelectorAll('#panel-progressi .pr-card .pr-val')].map(e=>e.textContent.trim());
      const conDati=valori.filter(v=>v && !v.startsWith('—')).length;
      ok(valori.length>0 && conDati===valori.length, 'Progressi/record: i massimali restano tutti valorizzati anche filtrando un Training Set ('+conDati+'/'+valori.length+')');
      ok(d.getElementById('panel-progressi').textContent.includes('su tutto il percorso'), 'Progressi/record: avvisa che i record sono su tutto il percorso');
      /* confronto diretto: card = massimo di TUTTO lo storico, non del solo set filtrato */
      const attesoPrimo=w.eval('(function(){var r=realMax(MAINLIFTS[0].nome);return r?nf(r.peso,0):"—";})()');
      ok(valori[0].indexOf(attesoPrimo)===0, 'Progressi/record: il valore mostrato è il massimo di tutto lo storico ('+attesoPrimo+')'); }
    w.eval('progSet="__tutti__"; showTab("progressi");');
    w.eval('progSet="__tutti__"; DOC.storico.length=' + stoPre + '; showTab("progressi");'); }
  w.eval('showTab("esercizi")');
  /* v1.0.66: il tab Profilo mostra il nome del profilo attivo */
  ok(d.querySelector('.tab[data-tab="profilo"]').textContent.includes('Atleta Template'), 'tab Profilo = nome del profilo attivo');
  /* v1.0.85: scambio scheda trainer ↔ cliente via APP CLIENTE (PWA in docs/app/) + file JSON */
  const vfileCli = w.eval('(costruisciSchedaJSON({}).righe.find(r => r.video) || {}).video || ""');
  ok(vfileCli !== '', 'export scheda JSON: almeno un esercizio del template ha il video associato');
  const mapCli = {}; if (vfileCli) mapCli[vfileCli] = 'data:video/mp4;base64,AAAA';
  /* v2.0: il riscaldamento del Training Set attivo viaggia nella scheda (sola lettura per il cliente) */
  { const g1 = w.eval('costruisciSchedaJSON({}).righe[0].giorno');
    w.eval('ensureSets(); DOC.scheda.riscaldamento={settimanale:['
      + '{giorno:' + JSON.stringify(g1) + ',esercizio:"Allungamento dei flessori dell\'anca",serie:2,rip:30,min:0,note:"per lato"},'
      + '{giorno:' + JSON.stringify(g1) + ',esercizio:"Cyclette",serie:0,rip:0,min:10,note:""}'
      + '],mensile:[]};');
    /* l'export reale incorpora anche i video del riscaldamento: li aggiungo alla mappa */
    w.eval('collectRiscaldamentoVideos().map(function(v){return v.file;})').forEach(f=>{ if(f) mapCli[f]='data:video/mp4;base64,AAAA'; }); }
  const schedaCli = w.eval('costruisciSchedaJSON(' + JSON.stringify(mapCli) + ', true)');
  ok(schedaCli.tipo === 'tms-scheda' && schedaCli.profilo.slug === 'template' && schedaCli.profilo.nome === 'Atleta Template' && schedaCli.righe.length > 0, 'export scheda JSON: meta profilo + righe della scheda del template');
  ok(schedaCli.modificabile === true && w.eval('costruisciSchedaJSON({}).modificabile') === false && w.eval('costruisciSchedaJSON({}, true).modificabile') === true, 'export scheda JSON: flag modificabile (default false = scheda fissa)');
  /* v1.5: popup all'export che chiede Fissa o Modificabile */
  w.eval('window.__mp = chiediModalitaScheda();');
  ok(d.getElementById('ms-fissa') !== null && d.getElementById('ms-mod') !== null && d.getElementById('ms-cancel') !== null, 'export: popup con scelta Fissa / Modificabile');
  d.getElementById('ms-mod').click();
  ok((await w.eval('window.__mp')) === 'modificabile', 'export: la scelta «Modificabile» risolve la Promise');
  ok(schedaCli.righe.every(r => r.giorno && r.esercizio && typeof r.serie === 'number') && schedaCli.video[vfileCli].startsWith('data:video/'), 'export scheda JSON: righe complete + video come data-URI');
  ok(schedaCli.righe.every(r => typeof r.test === 'boolean'), 'export scheda JSON: ogni riga porta il flag test (★ 1RM), default false');
  /* v2.0: riscaldamento (sola lettura) + «l'ultima volta» dallo Storico nel file per il cliente */
  ok(Array.isArray(schedaCli.riscaldamento) && schedaCli.riscaldamento.length === 2
     && schedaCli.riscaldamento[0].esercizio.startsWith('Allungamento') && schedaCli.riscaldamento[0].serie === 2 && schedaCli.riscaldamento[0].rip === 30,
     'export scheda JSON: riscaldamento del Training Set incluso (esercizio/serie/rip/note)');
  { const c = schedaCli.riscaldamento[1];
    ok(c.esercizio === 'Cyclette' && c.min === 10 && c.serie === 0 && c.video, 'export scheda JSON: riscaldamento cardio a tempo (10 min, col video)'); }
  ok(schedaCli.riscaldamento[0].note === 'per lato' && typeof schedaCli.riscaldamento[0].video === 'string', 'export scheda JSON: il riscaldamento porta note e (se c\'è) il video');
  ok(typeof schedaCli.riscaldamento[0].min === 'number', 'export scheda JSON: il riscaldamento porta i minuti (cardio a tempo)');
  /* v1.1.7: l'export dice se il profilo usa il Session-RPE (se no, il telefono mostra solo la casella «giorno completato») */
  ok(schedaCli.rpe === w.eval('useRpeActive()'), 'export scheda JSON: porta il flag rpe del profilo (' + schedaCli.rpe + ')');
  { const senzaRpe = w.eval('(function(){var o=DOC.dati_utente.useRpe; DOC.dati_utente.useRpe=false; var s=costruisciSchedaJSON({},true); DOC.dati_utente.useRpe=o; return s.rpe;})()');
    ok(senzaRpe === false, 'export scheda JSON: con Session-RPE disattivato il flag è false'); }
  { const u = schedaCli.ultima || {}, nomi = Object.keys(u);
    ok(nomi.length > 0 && typeof u[nomi[0]].peso === 'number' && typeof u[nomi[0]].rip === 'number',
       'export scheda JSON: «ultima volta» per esercizio dallo Storico (' + nomi.length + ' esercizi)'); }
  w.eval('DOC.scheda.riscaldamento={settimanale:[],mensile:[]};');  /* ripulisce il seed: i test desktop del riscaldamento partono da vuoto */
  /* dieta della fase attiva inclusa nell'export (valori precalcolati: il cliente non ha la banca USAV) */
  ok(schedaCli.dieta && schedaCli.dieta.fase === 'bulk' && Array.isArray(schedaCli.dieta.righe) && schedaCli.dieta.righe.length > 0, 'export scheda JSON: piano alimentare della fase attiva incluso (' + (schedaCli.dieta ? schedaCli.dieta.righe.length : 0) + ' righe)');
  ok(schedaCli.dieta.tot.kcal > 1000 && schedaCli.dieta.righe.every(r => r.alimento && typeof r.kcal === 'number' && typeof r.grammi === 'number'), 'export scheda JSON: kcal/macro precalcolate per riga + totale giornaliero (' + schedaCli.dieta.tot.kcal + ' kcal)');
  /* l'app cliente (PWA) viene caricata in un jsdom dedicato come farebbe il telefono del cliente */
  const PWA = path.join(ROOT, 'docs', 'app', 'index.html');
  ok(fs.existsSync(PWA) && fs.existsSync(path.join(ROOT, 'docs', 'app', 'manifest.webmanifest')) && fs.existsSync(path.join(ROOT, 'docs', 'app', 'sw.js')), 'app cliente: index.html + manifest + service worker presenti in docs/app/');
  const giorniCli = [...new Set(schedaCli.righe.map(r => r.giorno))];
  const bozzaKey = 'tms-bozza-template-' + schedaCli.esportata;
  let rientroApp = null;
  {
    const sub = await JSDOM.fromFile(PWA, { runScripts: 'dangerously', url: 'https://tms.test/app/index.html',
      beforeParse(win){ win.localStorage.setItem('tms-scheda-lang','it'); win.localStorage.setItem('tms-scheda-corrente', JSON.stringify(schedaCli)); } });
    await settle(400);
    const sd = sub.window.document;
    ok(sd.getElementById('benvenuto').hidden === true && sd.getElementById('menu').hidden === false && sd.getElementById('home').hidden === true, 'app cliente: scheda memorizzata → parte dal MENU (Scheda + Alimentazione)');
    ok(sd.getElementById('vai-scheda') !== null && sd.getElementById('vai-alim') !== null, 'app cliente: due macro-sezioni nel menu');
    /* pulsante QR in alto a destra + pannello «By Wander» (Instagram/YouTube/GitHub), come nel desktop */
    ok(sd.getElementById('qr-btn') !== null && sd.getElementById('qrov') !== null, 'app cliente: pulsante QR in alto a destra + pannello');
    sd.getElementById('qr-btn').click();
    ok(sd.getElementById('qrov').style.display === 'flex' && sd.querySelectorAll('#qrov .qr-item').length === 3 && /instagram\.com/.test(sd.getElementById('qrov').innerHTML) && /youtube\.com/.test(sd.getElementById('qrov').innerHTML) && /github\.com/.test(sd.getElementById('qrov').innerHTML), 'app cliente: pannello QR coi tre riquadri (Instagram, YouTube, GitHub)');
    sd.getElementById('qrclose').click();
    ok(sd.getElementById('qrov').style.display === 'none', 'app cliente: il pannello QR si chiude');
    /* alimentazione: card attiva, pagina con pasti e totale */
    ok(sd.getElementById('vai-alim').disabled === false && sd.getElementById('meta-alim').textContent.includes('kcal/giorno'), 'app cliente: card Alimentazione attiva col riassunto kcal');
    sd.getElementById('vai-alim').click();
    ok(sd.getElementById('alim').hidden === false && sd.querySelectorAll('#alim-body .al-row').length === schedaCli.dieta.righe.length, 'app cliente: pagina Alimentazione con tutte le righe del piano');
    ok(sd.querySelector('#alim [data-menu]') !== null, 'app cliente: bottone «Torna al menu» nella pagina Alimentazione');
    sd.querySelector('#alim [data-menu]').click();
    /* scheda: menu → giorni → giorno, con bottoni di ritorno evidenti */
    sd.getElementById('vai-scheda').click();
    ok(sd.getElementById('home').hidden === false && sd.querySelectorAll('.day-card').length === giorniCli.length && sd.querySelectorAll('.day-page').length === giorniCli.length, 'app cliente: menu → Scheda: una card e una pagina per ogni giorno');
    ok(sd.getElementById('s-0') !== null && +sd.getElementById('s-0').value === schedaCli.righe[0].serie, 'app cliente: campi precompilati col previsto del coach');
    ok(sd.getElementById('rir-0') !== null && sd.getElementById('rir-0').value === '', 'app cliente: RIR NON precompilato (si inserisce dopo l\'allenamento)');
    ok(sd.querySelector('.day-page .back-btn') !== null && sd.querySelector('.day-page .back-btn').textContent.includes('Torna ai giorni'), 'app cliente: bottone «Torna ai giorni» evidente nella pagina giorno');
    ok(sd.querySelector('.vbtn') !== null, 'app cliente: bottone ▶ video presente (video nel file)');
    /* v2.0: la giornata è una SEDUTA in fasi (🔥 riscaldamento · 🏋 esercizi · ✅ fine) */
    { const pag0 = sd.getElementById('day-0');
      ok(pag0.querySelector('.fasi') !== null && pag0.querySelectorAll('.fase').length === 3, 'app cliente v2: la pagina-giorno ha le 3 fasi (riscaldamento, esercizi, fine)');
      ok(pag0.querySelector('[data-fase="w"] .w-row') !== null && /Allungamento/.test(pag0.querySelector('[data-fase="w"]').textContent), 'app cliente v2: fase Riscaldamento con l\'esercizio del coach');
      ok(pag0.querySelector('[data-fase="w"] input') === null, 'app cliente v2: il riscaldamento è SOLA LETTURA (nessun campo da compilare)');
      { const w0=pag0.querySelector('[data-fase="w"]');
        ok(/2×30/.test(w0.textContent), 'app cliente v2: riscaldamento stretching mostrato come serie×ripetizioni');
        ok(/Cyclette/.test(w0.textContent) && /10 min/.test(w0.textContent), 'app cliente v2: riscaldamento cardio mostrato coi MINUTI (Cyclette 10 min)');
        ok(w0.querySelectorAll('.vbtn').length >= 1, 'app cliente v2: video ▶ disponibile nel riscaldamento'); }
      /* il giorno senza riscaldamento non mostra la fase (niente spazi vuoti) */
      const senzaW = [...sd.querySelectorAll('.day-page')].find(p => p.id !== 'day-0');
      ok(!senzaW || senzaW.querySelector('[data-fase="w"]') === null, 'app cliente v2: i giorni senza riscaldamento non mostrano la fase');
      /* i tab cambiano fase */
      pag0.querySelector('.fasi [data-f="f"]').click();
      ok(pag0.querySelector('[data-fase="f"]').hidden === false && pag0.querySelector('[data-fase="e"]').hidden === true, 'app cliente v2: il tab ✅ Fine mostra RPE e durata');
      pag0.querySelector('.fasi [data-f="e"]').click();
      ok(pag0.querySelector('[data-fase="e"]').hidden === false, 'app cliente v2: si torna al tab 🏋 Esercizi'); }
    /* «l'ultima volta» dallo Storico, sotto il previsto */
    ok(sd.querySelector('#ex-0 .ex-last') !== null && /kg/.test(sd.querySelector('#ex-0 .ex-last').textContent), 'app cliente v2: «ultima volta» mostrata sotto l\'esercizio');
    /* v2.2 (richiesta Marco): NIENTE sotto-menù — i campi di ogni esercizio sono già tutti
       visibili nella lista, senza tocchi per aprire e senza barra avanti/indietro */
    ok(sub.window.eval('document.querySelectorAll("#s-0").length') === 1, 'app cliente v2: un solo campo Serie per esercizio nel DOM (nessun doppione)');
    { const corpi = [...sd.querySelectorAll('#day-0 [data-fase="e"] .ex-body')];
      const attesi = schedaCli.righe.filter(r => r.giorno === giorniCli[0]).length;
      ok(corpi.length === attesi && corpi.every(c => sub.window.getComputedStyle(c).display !== 'none'),
         'app cliente v2.2: i campi di TUTTI gli esercizi sono visibili insieme (' + corpi.length + ' esercizi, nessun click per aprirli)');
      ok(sd.getElementById('exnav') === null && sub.window.eval('typeof apriEx') === 'undefined', 'app cliente v2.2: via la vista a schermo pieno e la barra avanti/indietro');
      ok(sd.querySelector('#ex-0 .chev') === null, 'app cliente v2.2: via la freccia ›  dalla riga (non c\'è più nulla da aprire)'); }
    /* compila un campo → bozza autosalvata */
    sd.getElementById('n-0').value = 'fatto tutto';
    sd.getElementById('s-0').value = '5';
    sd.getElementById('s-0').dispatchEvent(new sub.window.Event('input', { bubbles: true }));
    const salvata = JSON.parse(sub.window.localStorage.getItem(bozzaKey) || '{}');
    ok(salvata['s-0'] === '5' && salvata['n-0'] === 'fatto tutto', 'app cliente: bozza autosalvata in localStorage al primo input');
    /* rientro nel formato di sempre */
    rientroApp = sub.window.eval('costruisciRientro()');
    ok(rientroApp && rientroApp.tipo === 'tms-rientro' && rientroApp.versione === 1 && rientroApp.profilo.slug === 'template', 'app cliente: rientro nel formato tms-rientro (import TMS invariato)');
    ok(rientroApp.righe.length === schedaCli.righe.length && rientroApp.righe[0].serie === 5 && rientroApp.righe[0].note === 'fatto tutto', 'app cliente: il rientro riflette ciò che il cliente ha compilato');
    ok(rientroApp.righe[0].rir === null, 'app cliente: RIR non toccato → null nel rientro (niente valore ereditato dal coach)');
    /* il riscaldamento NON torna al coach (solo informativo) */
    ok(rientroApp.riscaldamento === undefined && !rientroApp.righe.some(r => /Allungamento/.test(r.esercizio)), 'app cliente v2: il riscaldamento NON entra nel rientro (solo informativo)');
    /* avanzamento della seduta + spunta sull'esercizio compilato */
    ok(sd.getElementById('ck-0').textContent === '✔' && /1\//.test(sd.getElementById('plab-0').textContent), 'app cliente v2: spunta ✔ sull\'esercizio e avanzamento «1/n fatti»');
    ok(sd.getElementById('prog-0').style.width !== '' && sd.getElementById('prog-0').style.width !== '0%', 'app cliente v2: la barra di avanzamento si riempie');
    /* riepilogo prima dell'invio */
    sd.getElementById('invia').click();
    ok(sd.getElementById('riepilogo').hidden === false && sd.querySelectorAll('#riep-body .riep-row').length === giorniCli.length, 'app cliente v2: «Crea il file» apre prima il RIEPILOGO (una riga per giorno)');
    ok(/esercizi segnati/.test(sd.getElementById('riep-body').textContent) && sd.getElementById('invia-ok') !== null, 'app cliente v2: il riepilogo conta gli esercizi segnati e ha il bottone di invio');
    /* i bottoni «torna» passano dalla cronologia (così il tasto indietro del telefono fa lo
       stesso percorso): la navigazione avviene al popstate, quindi si attende un istante */
    sd.querySelector('#riepilogo [data-home]').click();
    await settle(60);
    ok(sd.getElementById('home').hidden === false, 'app cliente v2: dal riepilogo si torna ai giorni');
    /* v2.2: il tasto INDIETRO del telefono risale nell'app invece di chiuderla */
    sd.querySelector('.day-card').click();                       /* entra nel giorno */
    ok(sd.getElementById('day-0').hidden === false, 'app cliente v2.2: si entra nel giorno');
    sub.window.history.back();                                    /* = tasto indietro del telefono */
    await settle(60);
    ok(sd.getElementById('home').hidden === false && sd.getElementById('day-0').hidden === true, 'app cliente v2.2: il tasto indietro torna alla lista dei giorni (non chiude l\'app)');
    sub.window.history.back();
    await settle(60);
    ok(sd.getElementById('menu').hidden === false, 'app cliente v2.2: un altro indietro torna al menu');
    ok(sub.window.eval('risali()') === false, 'app cliente v2.2: al menu non c\'è più nulla sopra (da lì l\'app può chiudersi)');
    /* v2.2: sezione FOTO — tre riquadri (fronte/lato/retro) che entrano nel rientro */
    ok(sd.getElementById('vai-foto') !== null && sd.getElementById('foto') !== null, 'app cliente foto: card nel menu + schermata dedicata');
    sd.getElementById('vai-foto').click();
    await settle(30);
    ok(sd.getElementById('foto').hidden === false && sd.querySelectorAll('#foto-grid .foto-box').length === 3, 'app cliente foto: tre riquadri (fronte/lato/retro)');
    ok([...sd.querySelectorAll('#foto-grid .foto-box')].map(b=>b.dataset.foto).join(',') === 'fronte,lato,retro', 'app cliente foto: i tag sono quelli che il TMS si aspetta');
    ok(sd.getElementById('foto-file') !== null && sd.getElementById('foto-file').accept === 'image/*' && !sd.getElementById('foto-file').hasAttribute('capture'),
       'app cliente foto: il selettore accetta immagini e lascia scegliere fotocamera o galleria');
    /* simula due scatti già ridimensionati e verifica che finiscano nel rientro */
    sub.window.eval('FOTO={fronte:{img:"data:image/jpeg;base64,AAAA",data:"2026-08-17"},retro:{img:"data:image/jpeg;base64,BBBB",data:"2026-08-17"}}; renderFoto();');
    ok(sd.querySelectorAll('#foto-grid .foto-box.pieno').length === 2 && sd.querySelectorAll('#foto-grid .foto-x').length === 2, 'app cliente foto: i riquadri pieni mostrano l\'anteprima e il tasto per togliere');
    ok(/2 /.test(sd.getElementById('meta-foto').textContent), 'app cliente foto: il menu conta le foto scattate');
    { const rr = sub.window.eval('costruisciRientro()');
      ok(Array.isArray(rr.foto) && rr.foto.length === 2 && rr.foto[0].tag === 'fronte' && rr.foto[0].img.startsWith('data:image/'),
         'app cliente foto: le foto entrano nel rientro con tag e immagine'); }
    sub.window.close();
  }
  {
    /* riapertura dell'app: scheda ritrovata + bozza ricaricata (persistenza sul telefono) */
    const sub = await JSDOM.fromFile(PWA, { runScripts: 'dangerously', url: 'https://tms.test/app/index.html',
      beforeParse(win){ win.localStorage.setItem('tms-scheda-lang','it'); win.localStorage.setItem('tms-scheda-corrente', JSON.stringify(schedaCli));
        win.localStorage.setItem(bozzaKey, JSON.stringify({ 'n-0': 'ripresa', 's-0': '7' })); } });
    await settle(400);
    const sd = sub.window.document;
    ok(sd.getElementById('n-0').value === 'ripresa' && sd.getElementById('s-0').value === '7', 'app cliente: bozza ricaricata alla riapertura dell\'app');
    /* REGRESSIONE (2026-08-18): aver solo compilato gli esercizi NON marca il giorno come
       «completato» — la spunta ✔ arriva solo con la fine-seduta esplicita (fatica+durata,
       o la casella «Giorno completato» in modalità senza RPE). */
    ok(sd.getElementById('stato-0').textContent === '', 'app cliente: modificare gli esercizi NON marca il giorno completato');
    sd.getElementById('rpe-0').value = '7'; sd.getElementById('rpe-0').dispatchEvent(new sub.window.Event('input', { bubbles: true }));
    sd.getElementById('min-0').value = '55'; sd.getElementById('min-0').dispatchEvent(new sub.window.Event('input', { bubbles: true }));
    ok(sd.getElementById('stato-0').textContent === '✔', 'app cliente: la spunta ✔ appare a seduta conclusa (fatica + durata)');
    sub.window.close();
  }
  {
    /* app appena installata, senza scheda: schermata di benvenuto con carica file */
    const sub = await JSDOM.fromFile(PWA, { runScripts: 'dangerously', url: 'https://tms.test/app/index.html' });
    await settle(300);
    const sd = sub.window.document;
    ok(sd.getElementById('benvenuto').hidden === false && sd.getElementById('file-scheda') !== null, 'app cliente: senza scheda mostra il benvenuto con «Carica la scheda»');
    ok(sub.window.eval('LANGP') === 'en' && (sd.querySelector('#benvenuto [data-i18n]')||{}).textContent === '👋 Welcome', 'app cliente EN: lingua auto-rilevata + benvenuto tradotto');
    ok(sub.window.eval('validaScheda({tipo:"x"})') === false && sub.window.eval('validaScheda(' + JSON.stringify(schedaCli) + ')') === true, 'app cliente: validazione del file scheda (tipo tms-scheda)');
    sub.window.close();
  }
  {
    /* modalità SENZA Session-RPE: la fase Fine mostra solo la casella «Giorno completato».
       REGRESSIONE bug 1 (2026-08-18): spuntare e poi TOGLIERE la spunta deve riportare il
       giorno a «non completato» (prima restava segnato per sempre). */
    const sNoRpe = JSON.parse(JSON.stringify(schedaCli)); sNoRpe.rpe = false;
    const sub = await JSDOM.fromFile(PWA, { runScripts: 'dangerously', url: 'https://tms.test/app/index.html',
      beforeParse(win){ win.localStorage.setItem('tms-scheda-lang','it'); win.localStorage.setItem('tms-scheda-corrente', JSON.stringify(sNoRpe)); } });
    await settle(400);
    const sd = sub.window.document;
    ok(sd.getElementById('rpe-0') === null && sd.getElementById('fatto-0') !== null, 'app cliente senza RPE: la fase Fine ha la casella «Giorno completato», non RPE/durata');
    const box = sd.getElementById('fatto-0');
    box.checked = true; box.dispatchEvent(new sub.window.Event('input', { bubbles: true }));
    ok(sd.getElementById('stato-0').textContent === '✔', 'app cliente senza RPE: la spunta marca il giorno ✔');
    ok(sub.window.eval('costruisciRientro().sedute').some(s => s.fatto === true), 'app cliente senza RPE: la spunta entra nel rientro come {fatto:true}');
    box.checked = false; box.dispatchEvent(new sub.window.Event('input', { bubbles: true }));
    ok(sd.getElementById('stato-0').textContent === '', 'app cliente senza RPE: TOGLIERE la spunta rimuove il completato (bug corretto)');
    ok(!sub.window.eval('costruisciRientro().sedute').some(s => s.fatto === true), 'app cliente senza RPE: tolta la spunta, niente {fatto:true} nel rientro');
    sub.window.close();
  }
  /* v1.5: la PWA può aggiungere / eliminare / modificare esercizi + segnare i test 1RM + timer di recupero */
  {
    const sub = await JSDOM.fromFile(PWA, { runScripts: 'dangerously', url: 'https://tms.test/app/index.html',
      beforeParse(win){ win.localStorage.setItem('tms-scheda-lang','it'); win.localStorage.setItem('tms-scheda-corrente', JSON.stringify(schedaCli)); } });
    await settle(400);
    const sd = sub.window.document, sw = sub.window;
    /* timer di recupero: parser del Rest + barra fissa in basso */
    ok(sw.eval('restSec("1:30")') === 90 && sw.eval('restSec("90")') === 90 && sw.eval('restSec("2min")') === 120 && sw.eval('restSec("")') === 0, 'app cliente/timer: restSec legge m:ss, secondi puri e «2min»');
    ok(sw.eval('fmtSec(90)') === '1:30' && sw.eval('fmtSec(5)') === '0:05', 'app cliente/timer: fmtSec formatta mm:ss');
    sw.eval('startTimer("Test", 90)');
    ok(sd.getElementById('tbar').classList.contains('show') && sd.getElementById('t-time').textContent === '1:30', 'app cliente/timer: startTimer mostra la barra col tempo del Rest (1:30)');
    sd.getElementById('t-x').click();
    ok(!sd.getElementById('tbar').classList.contains('show'), 'app cliente/timer: ✕ chiude la barra');
    sd.getElementById('vai-scheda').click();
    /* ★ test 1RM sul primo esercizio */
    const star0 = sd.querySelector('[data-star]');
    ok(star0 !== null, 'app cliente/1RM: bottone ★ Test presente su ogni esercizio');
    star0.click();
    ok(star0.classList.contains('on'), 'app cliente/1RM: il ★ si accende al tocco');
    /* aggiungi un esercizio nel primo giorno */
    const before = sw.eval('WROWS.length');
    sd.querySelector('[data-add="0"]').click();
    const newRid = sw.eval('WROWS[WROWS.length-1].rid');
    ok(sw.eval('WROWS.length') === before + 1 && sw.eval('WROWS[WROWS.length-1].custom') === true, 'app cliente/esercizi: ➕ aggiunge una riga custom nel giorno scelto');
    ok(sd.getElementById('ename-' + newRid) !== null, 'app cliente/esercizi: il nuovo esercizio apre subito il pannello Modifica per il nome');
    sd.getElementById('ename-' + newRid).value = 'Plank';
    sd.getElementById('savedit-' + newRid).click();
    ok(sw.eval('WROWS.find(r=>r.rid===' + newRid + ').esercizio') === 'Plank', 'app cliente/esercizi: la Modifica salva il nome del nuovo esercizio');
    sd.getElementById('s-' + newRid).value = '3';
    sd.getElementById('s-' + newRid).dispatchEvent(new sub.window.Event('input', { bubbles: true }));
    const rientro2 = sw.eval('costruisciRientro()');
    ok(rientro2.righe.length === before + 1 && rientro2.righe.some(r => r.esercizio === 'Plank'), 'app cliente/esercizi: l\'esercizio aggiunto entra nel rientro');
    ok(rientro2.righe[0].test === true, 'app cliente/1RM: il flag test torna nel rientro (★ sul 1° esercizio)');
    /* il recupero (rest) prescritto dal coach torna nel rientro → all'import non va perso */
    sw.eval('WROWS[0].rest="2:15";');
    ok(sw.eval('costruisciRientro().righe[0].rest') === '2:15', 'app cliente/timer: il recupero (rest) torna al coach nel rientro');
    const bozza2 = JSON.parse(sw.localStorage.getItem(bozzaKey) || '{}');
    ok(Array.isArray(bozza2._wrows) && bozza2._wrows.some(r => r.esercizio === 'Plank') && bozza2._wrows[0].test === true, 'app cliente: la bozza salva la STRUTTURA (_wrows: esercizio aggiunto + ★) → sopravvive al riavvio');
    /* elimina il primo esercizio (confirm stubbato) */
    sw.confirm = () => true;
    const firstRid = sw.eval('WROWS[0].rid');
    sd.querySelector('[data-del="' + firstRid + '"]').click();
    ok(sw.eval('WROWS.some(r=>r.rid===' + firstRid + ')') === false && sw.eval('WROWS.length') === before, 'app cliente/esercizi: 🗑 elimina la riga (dopo +1/−1 il totale torna all\'originale)');
    sub.window.close();
  }
  /* v1.5: scheda FISSA (modificabile:false) → niente aggiungi/modifica/elimina/★, ma il timer resta */
  {
    const schedaFissa = JSON.parse(JSON.stringify(schedaCli)); schedaFissa.modificabile = false; schedaFissa.righe[0].rest = '1:30';
    const sub = await JSDOM.fromFile(PWA, { runScripts: 'dangerously', url: 'https://tms.test/app/index.html',
      beforeParse(win){ win.localStorage.setItem('tms-scheda-lang','it'); win.localStorage.setItem('tms-scheda-corrente', JSON.stringify(schedaFissa)); } });
    await settle(400);
    const sd = sub.window.document;
    sd.getElementById('vai-scheda').click();
    ok(sub.window.eval('canEdit()') === false, 'app cliente/fissa: canEdit() = false');
    ok(sd.querySelector('[data-add]') === null && sd.querySelector('[data-del]') === null && sd.querySelector('[data-edit]') === null && sd.querySelector('[data-star]') === null, 'app cliente/fissa: nessun comando di modifica (➕ 🗑 ✎ ★)');
    ok(sd.querySelector('[data-rec]') !== null, 'app cliente/fissa: il timer di recupero resta disponibile');
    ok(sd.getElementById('s-0') !== null && +sd.getElementById('s-0').value === schedaFissa.righe[0].serie, 'app cliente/fissa: i campi da compilare restano (sola compilazione, come prima)');
    sub.window.close();
  }
  /* GIRO COMPLETO: il rientro generato dall'app entra nella scheda Pesi del TMS */
  {
    w.eval('window.__rientro = ' + JSON.stringify(rientroApp));
    const ris = w.eval('caricaRientroInScheda(window.__rientro)');
    ok(ris.righe === rientroApp.righe.filter(r => r.esercizio).length && w.eval('DOC.scheda.settimanale[0].serie') === 5 && w.eval('DOC.scheda.settimanale[0].note') === 'fatto tutto', 'giro completo: export TMS → app cliente → rientro → scheda Pesi del coach');
  }
  /* Δ TL per SET (richiesta Marco): ogni set incrementale ha il suo Δ vs il set di pari posizione */
  ok(Array.isArray(w.eval('lastBlockSets("__inesistente__",1)')) && w.eval('lastBlockSets("__inesistente__",1)').length === 0, 'lastBlockSets: array vuoto se l\'esercizio non è nello storico');
  w.eval('DOC.storico.push({scheda:202699,esercizio:"Squat con bilanciere",seduta:1,serie:1,rip:5,peso:100,test:false,macro:"Gambe"},{scheda:202699,esercizio:"Squat con bilanciere",seduta:1,serie:1,rip:5,peso:110,test:false,macro:"Gambe"});');
  { const s = w.eval('lastBlockSets("Squat con bilanciere",1)'); ok(Array.isArray(s) && s.length === 2 && s[1] > s[0], 'lastBlockSets: TL dei due set in ordine (110 kg > 100 kg)'); }
  w.eval('schedaMode="settimanale"; DOC.scheda.settimanale=[{giorno:"Lunedì",esercizio:"Squat con bilanciere",serie:1,rip:5,peso:105,rir:""},{giorno:"Lunedì",esercizio:"Squat con bilanciere",serie:1,rip:5,peso:115,rir:""}]; showTab("allenamento");');
  { const trs = [...d.querySelectorAll('#panel-allenamento tbody tr[data-i]')];
    ok(trs.length === 2 && /%/.test(trs[0].children[10].textContent) && /%/.test(trs[1].children[10].textContent), 'Δ TL per set: ENTRAMBI i set incrementali mostrano il proprio Δ (non solo il primo)');
    ok(trs[0].children[10].textContent.includes('▲') && trs[1].children[10].textContent.includes('▲'), 'Δ TL per set: set 1 (105 vs 100) e set 2 (115 vs 110) entrambi in crescita'); }
  /* Co-pilota LED passivo (richiesta Marco): pallino accanto al Peso, solo visivo, zero scrittura */
  ok(Array.isArray(w.eval('lastBlockPesi("Squat con bilanciere",1)')) && w.eval('lastBlockPesi("Squat con bilanciere",1)').join(',') === '100,110', 'LED: lastBlockPesi = pesi dei set della scorsa scheda');
  { const tr0 = d.querySelector('#panel-allenamento tbody tr[data-i="0"]');
    const led0 = tr0.children[0].querySelector('.carico-led');  /* nella cella esercizio, accanto alle frecce ▲▼ */
    ok(led0 !== null && led0.style.display !== 'none', 'LED: pallino visibile accanto alle frecce ▲▼ (con storico del set)'); }
  ok(w.eval('caricoLED(130,100,null,null).level') === 'danger', 'LED soglie: +30% → 🔴 (salto troppo grande)');
  ok(w.eval('caricoLED(115,100,null,null).level') === 'warn', 'LED soglie: +15% → 🟡 (aumento deciso)');
  ok(w.eval('caricoLED(105,100,null,null).level') === 'ok', 'LED soglie: +5% → 🟢 (progressione sensata)');
  ok(w.eval('caricoLED(80,100,null,null).level') === 'warn', 'LED soglie: calo marcato −20% → 🟡 (scarico?)');
  ok(w.eval('caricoLED(106,100,1,null).level') === 'warn', 'LED soglie: aumento ma scorsa al limite (RIR≤1) → 🟡');
  ok(w.eval('caricoLED(105,100,null,{sovraccarico:true,acwr:1.7}).level') === 'danger', 'LED soglie: aumento con ACWR>1.5 → 🔴 (meglio scaricare)');
  ok(w.eval('caricoLED(0,100,null,null)') === null && w.eval('caricoLED(105,0,null,null)') === null, 'LED: niente pallino senza peso o senza storico del set');
  w.eval('DOC.storico.pop(); DOC.storico.pop();');
  /* riordino esercizi nel giorno (▲▼) — la scheda ha 2 Squat (105, 115) su Lunedì */
  d.querySelector('#panel-allenamento tbody tr[data-i="0"] [data-mvdn]').click();
  ok(w.eval('DOC.scheda.settimanale[0].peso') === 115 && w.eval('DOC.scheda.settimanale[1].peso') === 105, 'Pesi: ▼ sposta l\'esercizio giù nel giorno (riordino)');
  /* ＋ Esercizio con scelta del giorno */
  { const nPrima = w.eval('DOC.scheda.settimanale.length'); w.eval('aggiungiEsercizioModal()');
    ok(d.getElementById('m-day') !== null, 'Pesi: ＋ Esercizio apre la scelta del giorno');
    w.eval('document.getElementById("m-day").value="Mercoledì";'); d.getElementById('m-ok').click();
    ok(w.eval('DOC.scheda.settimanale.length') === nPrima + 1 && w.eval('DOC.scheda.settimanale.some(r=>r.giorno==="Mercoledì"&&!r.esercizio)'), 'Pesi: l\'esercizio viene aggiunto nel giorno scelto (Mercoledì)'); }
  /* Training Set — loadout della scheda Pesi (crea/cambia/rinomina/elimina), piano attivo canonico */
  w.eval('schedaMode="settimanale"; DOC.scheda.settimanale=[{giorno:"Lunedì",esercizio:"Panca",serie:3,rip:8,peso:60}]; DOC.scheda.mensile=[]; delete DOC.scheda.setAttivo; delete DOC.scheda.setsSalvati; delete DOC.scheda.setsOrdine; ensureSets();');
  ok(w.eval('DOC.scheda.setAttivo') === 'Base' && w.eval('JSON.stringify(DOC.scheda.setsOrdine)') === '["Base"]', 'Training Set: migrazione idempotente → set «Base» attivo, ordine ["Base"]');
  w.eval('creaTrainingSet("Casa","Base")');
  ok(w.eval('DOC.scheda.setAttivo') === 'Casa' && w.eval('DOC.scheda.setsOrdine.indexOf("Casa")>=0') && w.eval('!!DOC.scheda.setsSalvati["Base"]') === true, 'Training Set: crea «Casa» copiando «Base» (Casa attivo, Base tra i salvati)');
  ok(w.eval('DOC.scheda.settimanale.length') === 1 && w.eval('DOC.scheda.settimanale[0].esercizio') === 'Panca', 'Training Set: la copia riporta gli esercizi dell\'origine');
  w.eval('DOC.scheda.settimanale[0].peso=50; DOC.scheda.settimanale.push({giorno:"Lunedì",esercizio:"Piegamenti",serie:3,rip:15,peso:0});');
  w.eval('switchTrainingSet("Base")');
  ok(w.eval('DOC.scheda.setAttivo') === 'Base' && w.eval('DOC.scheda.settimanale.length') === 1 && w.eval('DOC.scheda.settimanale[0].peso') === 60, 'Training Set: cambiare set carica il piano giusto (Base = Panca 60)');
  ok(w.eval('DOC.scheda.setsSalvati["Casa"].settimanale.length') === 2 && w.eval('DOC.scheda.setsSalvati["Casa"].settimanale[0].peso') === 50, 'Training Set: al cambio l\'altro set viene salvato (Casa = 2 esercizi, peso 50)');
  ok(w.eval('!!DOC.scheda.setsSalvati["Base"]') === false, 'Training Set: il set attivo non resta duplicato tra i salvati');
  w.eval('window.__ct=chiediTesto; chiediTesto=function(tit,val,cb){ cb("Palestra"); };');
  w.eval('rinominaTrainingSet()');
  w.eval('chiediTesto=window.__ct;');
  ok(w.eval('DOC.scheda.setAttivo') === 'Palestra' && w.eval('DOC.scheda.setsOrdine.indexOf("Base")<0') && w.eval('DOC.scheda.setsOrdine.indexOf("Palestra")>=0'), 'Training Set: rinomina il set attivo (Base → Palestra)');
  w.eval('window.__oc3=window.confirm; window.confirm=function(){return true;};');
  w.eval('eliminaTrainingSet()');
  w.eval('window.confirm=window.__oc3;');
  ok(w.eval('DOC.scheda.setAttivo') === 'Casa' && w.eval('DOC.scheda.setsOrdine.indexOf("Palestra")<0'), 'Training Set: elimina il set attivo → ne attiva un altro (Casa)');
  ok(w.eval('DOC.scheda.settimanale.length') === 2 && w.eval('DOC.scheda.settimanale[0].peso') === 50, 'Training Set: dopo l\'eliminazione la scheda attiva è quella di Casa (2 esercizi, peso 50)');
  w.eval('creaTrainingSet("Vuota","__vuota__")');
  ok(w.eval('DOC.scheda.setAttivo') === 'Vuota' && w.eval('DOC.scheda.settimanale.length') === 0, 'Training Set: «Scheda vuota» crea un set senza esercizi');
  ok(w.eval('DOC.scheda.setsOrdine.length') === 2 && w.eval('!!DOC.scheda.setsSalvati["Casa"]') === true, 'Training Set: due set totali (Casa salvato, Vuota attivo)');
  /* la barra Pesi mostra il selettore Training Set con le AZIONI dentro il menù (niente bottoni separati) */
  w.eval('showTab("allenamento")');
  ok(d.getElementById('training-set') !== null && d.getElementById('ts-new') === null && d.getElementById('ts-del') === null, 'Training Set: solo il selettore nella barra (niente bottoni separati)');
  { const opts = [...d.getElementById('training-set').options].map(o=>o.value);
    ok(opts.includes('Casa') && opts.includes('__new__') && opts.includes('__rename__') && opts.includes('__delete__'), 'Training Set: le azioni (Nuovo/Rinomina/Elimina) sono opzioni dentro il menù a tendina');
    ok(d.querySelector('#training-set optgroup') !== null, 'Training Set: le azioni sono in un gruppo «Azioni» separato'); }
  ok(d.getElementById('training-set').value === 'Vuota', 'Training Set: il selettore ha l\'attivo selezionato (Vuota)');
  /* scegliere «➕ Nuovo…» dal menù apre il modale, e la voce Azione non resta selezionata */
  w.eval('var _sel=document.getElementById("training-set"); _sel.value="__new__"; _sel.onchange({target:_sel});');
  ok(d.getElementById('ts-nome') !== null && w.eval('document.getElementById("training-set").value') === 'Vuota', 'Training Set: «➕ Nuovo…» apre il modale e il selettore torna sull\'attivo');
  w.eval('closeModal();');
  /* scegliere un set dal menù lo attiva */
  w.eval('var _s2=document.getElementById("training-set"); _s2.value="Casa"; _s2.onchange({target:_s2});');
  ok(w.eval('DOC.scheda.setAttivo') === 'Casa', 'Training Set: scegliere un set dal menù lo attiva');
  /* Riscaldamento — vista alternativa per Training Set (giorni dalla scheda), fuori dai calcoli */
  w.eval('pesiView="scheda"; showTab("allenamento");');
  ok(d.getElementById('btn-warm') !== null && /btn--ember/.test(d.getElementById('btn-warm').className), 'Riscaldamento: pulsante 🔥 arancione (btn--ember) accanto ai selettori');
  /* ── 2026-08-19 — ESERCIZI A CORPO LIBERO (trazioni, dip) ────────────────────
     Il carico vero è peso del corpo + zavorra: prima una trazione pulita (peso 0)
     valeva TL zero, cioè "non allenamento". Solo per i movimenti a pieno carico
     corporeo: cavo, macchina e assistite con elastico restano fuori. */
  { const pc = w.eval('pesoCorpoScheda(0)');
    ok(pc > 0, 'corpo libero: l\'app conosce il peso corporeo attuale (' + pc + ' kg)');
    ok(w.eval('isCorpoLibero("Trazioni alla sbarra (pull-up)")') === true && w.eval('isCorpoLibero("Dip alle parallele")') === true,
       'corpo libero: trazioni alla sbarra e dip alle parallele riconosciute');
    ok(w.eval('isCorpoLibero("Pull-up corda al cavo basso")') === false && w.eval('isCorpoLibero("Dip alla macchina")') === false && w.eval('isCorpoLibero("Trazioni Assistite con Elastico")') === false,
       'corpo libero: cavo, macchina e assistite con elastico ESCLUSE (lì il peso non si somma)');
    /* cernita 2026-09-07: dentro solo chi solleva il 100% del proprio peso */
    ok(w.eval('isCorpoLibero("Trazione dietro il collo presa larga")') === true && w.eval('isCorpoLibero("Trazione con maniglia a V")') === true
       && w.eval('isCorpoLibero("Rocky pull-up / pulldown")') === true && w.eval('isCorpoLibero("Gorilla chin/crunch")') === true
       && w.eval('isCorpoLibero("Salita alla corda")') === true,
       'corpo libero: dentro le altre trazioni da appeso e la salita alla corda (100% del peso)');
    ok(w.eval('isCorpoLibero("Dip alla panca")') === false && w.eval('isCorpoLibero("Bench dip con peso")') === false
       && w.eval('isCorpoLibero("Piegamenti sulle braccia")') === false && w.eval('isCorpoLibero("Squat a corpo libero")') === false
       && w.eval('isCorpoLibero("Rematore a corpo libero alla sbarra")') === false && w.eval('isCorpoLibero("Tricipiti al corpo libero alla sbarra")') === false,
       'corpo libero: FUORI chi carica solo una frazione del peso (panca, piegamenti, squat, rematore)');
    ok(w.eval('isCorpoLibero("Leg raise da appeso")') === false && w.eval('isCorpoLibero("Pike da appeso")') === false
       && w.eval('isCorpoLibero("Sollevamento ginocchia/anche alle parallele")') === false && w.eval('isCorpoLibero("Wind sprint (alla sbarra)")') === false,
       'corpo libero: FUORI chi sta appeso ma solleva le sole gambe (leg raise, pike, ginocchia)');
    /* ogni nome dell'elenco deve esistere davvero nel catalogo: un refuso lo renderebbe muto */
    ok(w.eval('CORPO_LIBERO.filter(function(n){ return !esLookup(n); }).length') === 0,
       'corpo libero: tutti i ' + w.eval('CORPO_LIBERO.length') + ' nomi dell\'elenco esistono nel catalogo');
    ok(w.eval('isCorpoLibero("Panca piana con bilanciere - presa media")') === false, 'corpo libero: i bilancieri restano come prima');
    /* la variante di seduta (-N2) non deve far perdere il riconoscimento */
    ok(w.eval('isCorpoLibero("Trazioni alla sbarra (pull-up) -N2")') === true, 'corpo libero: riconosciuto anche con il suffisso di seduta');
    /* carico effettivo: zavorra + corpo */
    const rTraz = { esercizio:'Trazioni alla sbarra (pull-up)', serie:3, rip:6, peso:10, rir:'' };
    ok(Math.abs(w.eval('caricoEff(' + JSON.stringify(rTraz) + ')') - (pc + 10)) < 0.01, 'corpo libero: carico effettivo = zavorra + corpo (10 + ' + pc + ')');
    const rCorpo = { esercizio:'Trazioni alla sbarra (pull-up)', serie:3, rip:8, peso:0, rir:'' };
    ok(Math.abs(w.eval('caricoEff(' + JSON.stringify(rCorpo) + ')') - pc) < 0.01, 'corpo libero: con zavorra 0 il carico è il peso del corpo');
    ok(w.eval('sTL(' + JSON.stringify(rCorpo) + ')') > 0, 'corpo libero: una serie a corpo libero ora produce TL (prima era zero)');
    /* 1RM espresso come ZAVORRA massima (richiesta Marco 2026-09-07): si stima il
       massimale del sistema completo e si toglie il corpo. %1RM resta invece sul carico
       totale, altrimenti la fascia di allenamento risulterebbe sbagliata. */
    { const rTz = '{esercizio:"Trazioni alla sbarra (pull-up)",serie:3,rip:6,peso:10,rir:""}';
      const rmTot = w.eval('sRM(' + rTz + ')'), rmVis = w.eval('rmMostrato(' + rTz + ')');
      /* il CALCOLO resta sul carico reale; la sottrazione è solo ciò che si legge */
      ok(Math.abs(rmTot - w.eval('rm1(' + (pc + 10) + ', 6)')) < 0.01, 'corpo libero/1RM: il calcolo resta sul carico reale (' + rmTot.toFixed(1) + ' kg)');
      ok(Math.abs(rmVis - (rmTot - pc)) < 0.01, 'corpo libero/1RM: nella cella si MOSTRA la zavorra (' + rmVis.toFixed(1) + ' invece di ' + rmTot.toFixed(1) + ')');
      ok(rmVis >= 10, 'corpo libero/1RM: la zavorra mostrata non è mai inferiore a quella già sollevata');
      ok(w.eval('rmMostrato({esercizio:"Trazioni alla sbarra (pull-up)",serie:3,rip:1,peso:0,rir:""})') >= 0,
         'corpo libero/1RM: a corpo libero puro non diventa negativo');
      /* la fascia non deve cambiare: dipende dalle ripetizioni, non dal come esprimiamo il carico */
      const pctTraz = w.eval('sPct({esercizio:"Trazioni alla sbarra (pull-up)",serie:3,rip:6,peso:10,rir:""})');
      const pctPanca = w.eval('sPct({esercizio:"Panca piana con bilanciere - presa media",serie:3,rip:6,peso:70,rir:""})');
      ok(Math.abs(pctTraz - pctPanca) < 0.01, 'corpo libero/%1RM: resta sul carico totale — stessa intensità di una serie equivalente coi pesi');
      ok(w.eval('fascia(' + pctTraz + ')[0]') === w.eval('fascia(' + pctPanca + ')[0]'), 'corpo libero: la fascia di allenamento non viene falsata (' + w.eval('fascia(' + pctTraz + ')[0]') + ')');
      /* gli altri esercizi non cambiano di una virgola */
      ok(Math.abs(w.eval('rmMostrato({esercizio:"Panca piana con bilanciere - presa media",serie:3,rip:6,peso:70,rir:""})') - w.eval('rm1(70,6)')) < 0.01,
         'corpo libero/1RM: per bilancieri e manubri non si sottrae nulla, resta come sempre'); }
    /* un esercizio col bilanciere non cambia di una virgola */
    const rPanca = { esercizio:'Panca piana con bilanciere - presa media', serie:3, rip:8, peso:70, rir:'' };
    ok(w.eval('caricoEff(' + JSON.stringify(rPanca) + ')') === 70, 'corpo libero: gli altri esercizi restano col peso digitato');
    /* peso corporeo DELL'EPOCA per le righe storiche, non quello di oggi */
    { const io = w.eval('JSON.parse(JSON.stringify((DOC.storico_io||[]).map(function(x){return {scheda:+x.scheda,peso:+x.peso};})))');
      if (io.length > 1) {
        const vecchia = io[0];
        ok(Math.abs(w.eval('pesoCorpoScheda(' + vecchia.scheda + ')') - vecchia.peso) < 0.01,
           'corpo libero: per una riga vecchia si usa il peso di ALLORA (' + vecchia.peso + ' kg alla scheda ' + vecchia.scheda + ')');
        ok(w.eval('pesoCorpoScheda(999999)') === w.eval('pesoCorpoScheda(' + io[io.length-1].scheda + ')'),
           'corpo libero: per una scheda successiva all\'ultima misura si usa l\'ultima nota'); } }
    /* il salvataggio nello Storico conserva la ZAVORRA digitata, non il totale */
    ok(w.eval('(function(){var r={esercizio:"Trazioni alla sbarra (pull-up)",serie:3,rip:6,peso:10};return (+r.peso||0);})()') === 10,
       'corpo libero: nello Storico si salva la zavorra digitata (il corpo si somma al volo, mai salvato)');
    /* nella scheda si DEVE vedere che il corpo viene sommato: «Peso 0» con un TL alto,
       senza spiegazione, sembrerebbe un errore dell'app */
    w.eval('showTab("allenamento"); schedaRows()[0].esercizio="Trazioni alla sbarra (pull-up)"; schedaRows()[0].peso=0; renderAllenamento();');
    { /* la prima riga della tabella è il separatore del giorno: serve quella con i campi */
      const riga = [...d.querySelectorAll('#panel-allenamento tbody tr')].find(tr => tr.querySelector('[data-f="peso"]'));
      const pill = riga.querySelector('.pill');
      ok(pill !== null && /🧍/.test(pill.textContent) && new RegExp(String(Math.round(pc))).test(pill.textContent),
         'corpo libero: la riga mostra quanto corpo viene sommato (' + (pill ? pill.textContent.trim() : '—') + ')');
      const inPeso = riga.querySelector('[data-f="peso"]');
      ok(/zavorra/i.test(inPeso.getAttribute('title') || ''), 'corpo libero: il campo Peso spiega che lì va solo la zavorra');
      /* e il TL della riga non è più zero pur avendo Peso 0 */
      ok(w.eval('sTL(schedaRows()[0])') > 0, 'corpo libero: in scheda una riga a corpo libero produce TL'); }
    w.eval('renderAllenamento();'); }
  ok(/Riscaldamento/.test(d.getElementById('btn-warm').textContent), 'Riscaldamento: in vista scheda il pulsante dice «Riscaldamento»');
  d.getElementById('btn-warm').click();
  ok(w.eval('pesiView') === 'riscaldamento' && /Scheda/.test(d.getElementById('btn-warm').textContent), 'Riscaldamento: il pulsante apre la vista e diventa «Scheda» (per tornare)');
  ok(d.querySelector('#panel-allenamento [data-waddday="Lunedì"]') !== null, 'Riscaldamento: il giorno «Lunedì» è ripreso dalla scheda');
  const tlPrima = w.eval('schedaRows().reduce(function(a,r){return a+sTL(r);},0)');
  d.querySelector('#panel-allenamento [data-waddday="Lunedì"]').click();
  ok(w.eval('riscaldaRows().length') === 1 && w.eval('riscaldaRows()[0].giorno') === 'Lunedì', 'Riscaldamento: ＋ aggiunge una riga di riscaldamento nel giorno');
  { const sIn = d.querySelector('#panel-allenamento tr[data-wi="0"] [data-wf="serie"]'); sIn.value = '1'; sIn.oninput(); }
  /* divisione per categoria del database: stretching vs allenamento */
  ok(w.eval('isStretching({categoria:"stretching"})') === true && w.eval('isStretching({categoria:"forza"})') === false, 'filtro: isStretching riconosce la categoria del database');
  /* il selettore del riscaldamento mostra stretching + cardio di base, MAI esercizi coi pesi */
  d.querySelector('#panel-allenamento .warm-pick').click();
  ok(d.getElementById('exp-q') !== null, 'Riscaldamento: la cella esercizio apre il selettore esercizi');
  { const names = [...d.querySelectorAll('.exp-it')].map(x=>x.dataset.nome);
    const cat = n => w.eval('(function(){var e=esLookup(' + JSON.stringify(n) + ');return e?String(e.categoria||"").toLowerCase():"";})()');
    const soloAmmessi = names.length>0 && w.eval('('+JSON.stringify(names)+').every(function(n){var e=esLookup(n);var c=String((e&&e.categoria)||"").toLowerCase();return c==="stretching"||c==="cardio";})');
    ok(names.length>40 && soloAmmessi, 'Riscaldamento: il selettore mostra solo stretching + cardio, nessun esercizio coi pesi ('+names.length+' voci)');
    ok(names.some(n=>cat(n)==='cardio') && names.some(n=>cat(n)==='stretching'), 'Riscaldamento: nel selettore ci sono sia stretching sia cardio (tapis roulant, cyclette…)'); }
  w.eval('closeModal();');
  /* cardio nel riscaldamento: solo minuti, niente serie/ripetizioni */
  w.eval('riscaldaRows()[0].esercizio="Cyclette"; riscaldaRows()[0].serie=0; riscaldaRows()[0].rip=0; riscaldaRows()[0].min=10; persist("scheda"); renderRiscaldamento(ensureSets());');
  { const tr = d.querySelector('#panel-allenamento tr[data-wi="0"]');
    ok(tr.querySelector('[data-wf="min"]') !== null && +tr.querySelector('[data-wf="min"]').value === 10, 'Riscaldamento cardio: campo Min compilato (10)');
    ok(tr.querySelector('[data-wf="serie"]') === null && tr.querySelector('[data-wf="rip"]') === null, 'Riscaldamento cardio: serie e ripetizioni non si compilano (solo tempo)');
    ok(tr.querySelector('[data-vid]') !== null, 'Riscaldamento: bottone ▶ video sulla riga (come nella scheda)'); }
  w.eval('riscaldaRows()[0].esercizio=""; riscaldaRows()[0].serie=1; riscaldaRows()[0].rip=10; riscaldaRows()[0].min=0; persist("scheda"); renderRiscaldamento(ensureSets());');
  w.eval('riscaldaRows()[0].esercizio="Stretch test"; persist("scheda");');  /* simula la scelta dal picker */
  ok(w.eval('riscaldaRows()[0].esercizio') === 'Stretch test' && w.eval('riscaldaRows()[0].serie') === 1, 'Riscaldamento: esercizio (dal selettore) + serie salvati');
  ok(w.eval('schedaRows().reduce(function(a,r){return a+sTL(r);},0)') === tlPrima && w.eval('schedaRows().length') === 2, 'Riscaldamento: NON conta nel TL né tocca la scheda Pesi');
  /* v1.1.6: il cardio del riscaldamento conta SOLO nel radar Volume/Equilibrio (scelta di Marco) */
  { const code = 202699;
    w.eval('DOC.storico_risc=[{scheda:' + code + ',giorno:"Lunedì",esercizio:"Cyclette",min:20,set:"Base"},{scheda:' + code + ',giorno:"Mercoledì",esercizio:"Ellittica",min:10,set:"Base"}];');
    ok(w.eval('riscEquivSets(' + code + ')') === 3, 'Radar/riscaldamento: 30 min di cardio → 3 serie equivalenti (min÷10)');
    ok(w.eval('riscEquivSets(' + code + ',"Casa")') === 0 && w.eval('riscEquivSets(' + code + ',"Base")') === 3, 'Radar/riscaldamento: rispetta il filtro Training Set');
    ok(w.eval('riscEquivSets(202600)') === 0, 'Radar/riscaldamento: nessun contributo per settimane senza riscaldamento cardio');
    /* la garanzia che conta: NON entra nelle metriche di carico */
    const tlPre = w.eval('JSON.stringify(schedeAggr().map(function(a){return [a.scheda,Math.round(a.tl)];}))');
    const rpePre = w.eval('JSON.stringify(rpeByWeek())');
    w.eval('DOC.storico_risc.push({scheda:' + code + ',giorno:"Venerdì",esercizio:"Vogatore",min:60,set:"Base"});');
    ok(w.eval('JSON.stringify(schedeAggr().map(function(a){return [a.scheda,Math.round(a.tl)];}))') === tlPre, 'Radar/riscaldamento: aggiungerne NON cambia il TL (metriche di carico intatte)');
    ok(w.eval('JSON.stringify(rpeByWeek())') === rpePre, 'Radar/riscaldamento: NON entra nel carico interno sRPE/monotonia');
    /* persistenza: viaggia nel profilo e nel backup */
    ok(w.eval('Object.keys(docProfileData()).indexOf("storico_risc")>=0'), 'Radar/riscaldamento: storico_risc incluso nei dati del profilo (persistenza)');
    w.eval('DOC.storico_risc=[];');
  }
  w.eval('creaTrainingSet("Vuota2","__vuota__");');
  ok(w.eval('riscaldaRows().length') === 0, 'Riscaldamento: un nuovo set (vuoto) parte senza riscaldamenti');
  w.eval('switchTrainingSet("Casa");');
  ok(w.eval('riscaldaRows().length') === 1 && w.eval('riscaldaRows()[0].esercizio') === 'Stretch test', 'Riscaldamento: appartiene al Training Set (tornando a «Casa» è ancora lì)');
  w.eval('pesiView="riscaldamento"; renderAllenamento();');
  d.querySelector('#panel-allenamento [data-wdel="0"]').click();
  ok(w.eval('riscaldaRows().length') === 0, 'Riscaldamento: ✕ elimina la riga');
  w.eval('pesiView="scheda"; showTab("allenamento");');
  /* il selettore della scheda Pesi ESCLUDE lo stretching (solo esercizi di allenamento) */
  d.querySelector('#panel-allenamento .ex-pick').click();
  { const names = [...d.querySelectorAll('.exp-it')].map(x=>x.dataset.nome);
    const nessunoStretch = names.length>0 && w.eval('('+JSON.stringify(names)+').every(function(n){var e=esLookup(n);return e&&String(e.categoria||"").toLowerCase()!=="stretching";})');
    ok(nessunoStretch, 'Scheda Pesi: il selettore esercizi ESCLUDE lo stretching ('+names.length+' voci)'); }
  w.eval('closeModal();');
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
  /* REGRESSIONE (2026-08-18): il tempo di recupero (rest) NON va perso all'import — il timer
     sul telefono lo legge da lì. Se il rientro non lo porta (app già in giro), si conserva
     quello della scheda del coach; se lo porta (app recente), vince quello del rientro. */
  w.eval('DOC.scheda.settimanale=[{giorno:"Lunedì",esercizio:"Panca piana con bilanciere - presa media",serie:3,rip:8,peso:70,rest:"2:00"}];');
  w.eval('caricaRientroInScheda(' + JSON.stringify({ tipo:'tms-rientro', versione:1, profilo:{slug:'template'},
    righe:[ {giorno:'Lunedì',esercizio:'Panca piana con bilanciere - presa media',serie:3,rip:8,peso:72,rir:2} ], sedute:[] }) + ')');
  ok(w.eval('DOC.scheda.settimanale[0].rest') === '2:00', 'rientro: il recupero NON si perde se il rientro non lo porta (conservato dalla scheda del coach → il timer resta)');
  w.eval('caricaRientroInScheda(' + JSON.stringify({ tipo:'tms-rientro', versione:1, profilo:{slug:'template'},
    righe:[ {giorno:'Lunedì',esercizio:'Panca piana con bilanciere - presa media',serie:3,rip:8,peso:72,rir:2,rest:'1:45'} ], sedute:[] }) + ')');
  ok(w.eval('DOC.scheda.settimanale[0].rest') === '1:45', 'rientro: se il cliente rimanda il recupero (app recente), vince quello del rientro');
  /* v1.5: il flag test (★ massimale) del cliente arriva nella scheda Pesi all'import */
  const rientroTest = { tipo:'tms-rientro', versione:1, profilo:{slug:'template',nome:'Atleta Template'},
    righe:[ {giorno:'Lunedì',esercizio:'Stacco da terra con bilanciere',serie:1,rip:3,peso:150,rir:0,note:'test max',test:true} ], sedute:[] };
  await w.eval('caricaRientroInScheda(' + JSON.stringify(rientroTest) + ')');
  ok(w.eval('DOC.scheda.settimanale[0].test') === true, 'rientro: il flag test (★ 1RM) del cliente arriva nella scheda Pesi del coach');
  /* v1.1.7: giorni «completati» (cliente senza Session-RPE) e FOTO dal telefono */
  { const rf = { tipo:'tms-rientro', versione:1, profilo:{slug:'template',nome:'Atleta Template'},
      righe:[{giorno:'Lunedì',esercizio:'Squat con bilanciere',serie:3,rip:5,peso:100,rir:null}],
      sedute:[{giorno:'Lunedì',fatto:true},{giorno:'Mercoledì',fatto:true}] };
    const r2 = await w.eval('caricaRientroInScheda(' + JSON.stringify(rf) + ')');
    ok(r2.fatti === 2 && r2.sedute === 0, 'rientro senza RPE: conta i giorni spuntati come completati (2) senza inventare sedute');
    /* foto: dal data-URI al file binario in foto/ + metadati in DOC.foto */
    const nFotoPre = w.eval('(DOC.foto||[]).length');
    const imgUri = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT,'docs','img','logo.png')).toString('base64');
    const nSalvate = await w.eval('importaFotoRientro(' + JSON.stringify([{tag:'fronte',data:'2026-08-17',img:imgUri},{tag:'retro',data:'2026-08-17',img:imgUri}]) + ')');
    ok(nSalvate === 2 && w.eval('(DOC.foto||[]).length') === nFotoPre + 2, 'rientro foto: le due immagini vengono salvate (metadati in DOC.foto)');
    { const ff = w.eval('DOC.foto[DOC.foto.length-2]');
      ok(ff.tag === 'fronte' && ff.data === '2026-08-17' && /^f\d+-[a-z0-9]+\.png$/.test(ff.file), 'rientro foto: tag, data e nome file nel formato del tab Corpo (' + ff.file + ')');
      ok(w.eval('(function(){var n=DOC.foto[DOC.foto.length-2].file; return !!(dirHandle||window.tmsFS);})()'), 'rientro foto: scritte tramite lo stesso canale binario delle altre foto'); }
    /* l'ordinamento delle viste ora riconosce i tag veri (fronte/lato/retro) */
    ok(w.eval('fotoViewOrder("fronte")') === 0 && w.eval('fotoViewOrder("lato")') === 1 && w.eval('fotoViewOrder("retro")') === 2, 'foto: ordine viste fronte→lato→retro (prima non combaciava coi tag usati)');
    ok(w.eval('fotoViewOrder("anteriore")') === 0 && w.eval('fotoViewOrder("posteriore")') === 2, 'foto: riconosciuti anche i sinonimi lunghi (anteriore/posteriore)');
    w.eval('DOC.foto.length=' + nFotoPre + ';');   /* ripulisce: i test foto successivi partono dallo stato del template */
  }
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
  ok(guida.includes('Scheda ↔ cliente') && guida.includes('gc-scambio') && guida.includes('Crea il file per il coach') && guida.includes('TMS Scheda'), 'Guida completa: sezione 10 Scheda ↔ cliente (app TMS Scheda)');
  ok(guida.includes('14 · Licenza'), 'Guida completa: sezioni rinumerate (Licenza = 14)');
  ok(!/class="sec[^"]*"[^>]*>▌/.test(guida), 'Guida: nessun glifo ▌ nelle intestazioni (la barra è quella del CSS, non doppia)');
  w.eval('guidaMode = "rapida"; renderGuida()');
  const rapida = d.getElementById('panel-guida').innerHTML;
  ok(rapida.includes('Coach ↔ cliente') && rapida.includes('📤 Esporta scheda'), 'Guida rapida: passo coach ↔ cliente');
  ok(!d.body.innerHTML.includes('Tarnished'), 'nessuna istanza di «Rise, Tarnished»');
  const nomeBk = await w.eval('(async()=>{ let cap=null; const oc=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ cap=this.download; }; try{ await backupData(); } finally { HTMLAnchorElement.prototype.click=oc; } return cap; })()');
  ok(typeof nomeBk === 'string' && nomeBk.startsWith('TMS-backup-atleta-template-'), 'backup col nome del profilo attivo (' + nomeBk + ')');
  /* v1.0.75: il bottone 📤 nella riga di un profilo NON attivo lo attiva e ne esporta la scheda */
  w.eval('showTab("profilo")');
  ok(d.querySelector('#panel-profilo [data-pexs="wander"]') !== null, 'bottone 📤 nella riga del profilo non attivo, senza aprire la tendina');
  /* l'export ora apre il popup Fissa/Modificabile: avvio, aspetto il popup, scelgo «Modificabile» */
  w.eval('window.__oc2=window.confirm; window.confirm=function(){return false;}; window.__cap=null; window.__oa=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ window.__cap=this.download; }; window.__pexp=document.querySelector(\'#panel-profilo [data-pexs="wander"]\').onclick();');
  for (let i = 0; i < 40 && !d.getElementById('ms-mod'); i++) { await settle(20); }
  d.getElementById('ms-mod').click();
  await w.eval('(async()=>{ try{ await window.__pexp; } finally { HTMLAnchorElement.prototype.click=window.__oa; window.confirm=window.__oc2; } })()');
  const nomeEx = w.eval('window.__cap');
  ok(w.eval('activeProfile') === 'wander', 'export dalla riga: profilo attivato da solo');
  ok(typeof nomeEx === 'string' && nomeEx.startsWith('Scheda_wander_') && nomeEx.endsWith('.json'), 'export dalla riga: file JSON del profilo giusto (' + nomeEx + ')');
  const apertoPrima = w.eval('profOpen');
  d.querySelector('#panel-profilo [data-prin="wander"]').closest('label').dispatchEvent(new w.MouseEvent('click', {bubbles:true}));
  ok(w.eval('profOpen') === apertoPrima, 'click sui bottoni della riga: la tendina non si apre/chiude');
  /* ── Semaforo clienti: triage integrato in ogni riga profilo, SOLA LETTURA ── */
  w.eval('profOpen = null; showTab("profilo")');
  ok(d.getElementById('cr-led-template') !== null && d.getElementById('cr-led-wander') !== null, 'semaforo: pallino in ogni riga profilo (niente box separato che duplica)');
  ok(d.getElementById('cruscotto-box') === null, 'semaforo: nessuna sezione cruscotto separata (unificata nella lista profili)');
  ok(d.querySelectorAll('#panel-profilo [data-pexs]').length === 2 && d.querySelector('#cr-sum-template') !== null, 'semaforo: la riga conserva 📤 Esporta + la sintesi sotto il nome');
  /* soglie del semaforo (funzione pura, deterministica) */
  ok(w.eval('cruscottoLivello({hasData:true, acwr:1.7, stale:1})') === 'danger', 'semaforo: ACWR > 1.5 → 🔴');
  ok(w.eval('cruscottoLivello({hasData:true, acwr:1.0, stale:3})') === 'danger', 'semaforo: scheda ferma ≥3 settimane → 🔴');
  ok(w.eval('cruscottoLivello({hasData:true, acwr:1.4, stale:0, monoHigh:true})') === 'danger', 'semaforo: monotonia alta + ACWR>1.3 → 🔴');
  ok(w.eval('cruscottoLivello({hasData:true, acwr:1.4, stale:0})') === 'warn', 'semaforo: ACWR 1.3–1.5 → 🟡');
  ok(w.eval('cruscottoLivello({hasData:true, acwr:1.0, stale:2})') === 'warn', 'semaforo: ferma 2 settimane → 🟡');
  ok(w.eval('cruscottoLivello({hasData:true, acwr:1.0, stale:0, monoHigh:true})') === 'warn', 'semaforo: monotonia alta → 🟡');
  ok(w.eval('cruscottoLivello({hasData:true, acwr:1.0, stale:1})') === 'ok', 'semaforo: tutto in zona → 🟢');
  ok(w.eval('cruscottoLivello({hasData:false})') === 'none', 'semaforo: nessun dato → ⚪');
  /* settimaneFa e PR (su DOC sintetico, ripristinando lo stato) */
  const codeCur = w.eval('(function(){var w=isoWeek(new Date());return schedaCode(w.anno,w.sett);})()');
  ok(w.eval('settimaneFa(' + codeCur + ')') === 0 && w.eval('settimaneFa(0)') === null, 'settimaneFa: settimana corrente → 0, nessuna registrazione → null');
  ok(w.eval('(function(){var s=DOC.storico; DOC.storico=[{esercizio:"X",peso:100,scheda:202601},{esercizio:"X",peso:110,scheda:202602}]; var r=prUltimaSettimana(); DOC.storico=s; return r.length===1 && r[0].nome==="X" && r[0].peso===110;})()') === true, 'PR: peso che batte le settimane precedenti rilevato');
  ok(w.eval('(function(){var s=DOC.storico; DOC.storico=[{esercizio:"X",peso:100,scheda:202601}]; var r=prUltimaSettimana(); DOC.storico=s; return r.length===0;})()') === true, 'PR: primo carico in assoluto non conta come PR recente');
  /* dati del cruscotto: un triage per profilo, calcoli reali, NESSUNA scrittura, DOC intatto */
  const apActive = w.eval('activeProfile'), stLen = w.eval('DOC.storico.length'), fcPrima = fsmem._files.size;
  const crum = await w.eval('cruscottoDati()');
  ok(Array.isArray(crum) && crum.length === 2, 'cruscotto: un triage per ogni profilo (2)');
  ok(crum.every(t => ['danger', 'warn', 'ok', 'none'].includes(t.level)), 'cruscotto: ogni cliente ha un livello semaforo valido');
  const tT = crum.find(t => t.slug === 'template');
  ok(tT && typeof tT.acwr === 'number' && tT.acwr > 0, 'cruscotto: ACWR calcolato per il template (' + (tT ? tT.acwr.toFixed(2) : '—') + ')');
  ok(tT && tT.hasRpe === true && typeof tT.mono === 'number', 'cruscotto: monotonia calcolata (il template ha gli RPE attivi)');
  ok(w.eval('activeProfile') === apActive && w.eval('DOC.storico.length') === stLen, 'cruscotto: profilo attivo e DOC intatti dopo il calcolo (sola lettura)');
  ok(fsmem._files.size === fcPrima, 'cruscotto: nessun file scritto (read-only)');
  /* render: il pallino e la sintesi vengono dipinti nella riga di ogni profilo */
  await w.eval('aggiornaSemafori(true)');
  await settle(60);
  ok(['🟢','🟡','🔴','⚪'].includes(d.getElementById('cr-led-template').textContent), 'semaforo: pallino dipinto sulla riga del template');
  ok(d.getElementById('cr-sum-template').innerHTML.includes('ACWR'), 'semaforo: sintesi (ACWR · aggiornamento · monotonia) sotto il nome');
  ok(d.getElementById('panel-profilo').innerHTML.includes('🟢 ok') && d.getElementById('panel-profilo').innerHTML.includes('🔴 a rischio'), 'semaforo: legenda dei colori nel pannello');
  /* ── Foto progressi: template demo → player «tutti» a gruppi + confronto a calendario ── */
  w.eval('switchProfile("template")'); await settle(300);
  w.eval('showTab("corpo")');
  ok(w.eval('(DOC.foto||[]).length') >= 18, 'foto: template con le foto demo caricate (≥18)');
  ok(w.eval('fotoDates().length') === 6, 'foto: 6 date distinte (fotoDates)');
  ok(w.eval('fotoTag="", fotoSteps().length') === 6 && w.eval('fotoSteps()[0].foto.length') === 3, 'foto: vista «tutti» = un passo per data con 3 viste affiancate');
  ok(w.eval('fotoTag="anteriore", fotoSteps().length') === 6 && w.eval('fotoSteps()[0].foto.length') === 1, 'foto: vista specifica = una foto per passo');
  ok(w.eval('fotoSnapDate("2026-03-15")') === '2026-03-02', 'foto: il calendario aggancia alla sessione foto più vicina');
  w.eval('fotoTag=""; fotoMode="confronto"; renderFotoSezione();'); await settle(40);
  ok(d.getElementById('foto-cmp-a') && d.getElementById('foto-cmp-a').type === 'date', 'foto: confronto con selettore a calendario (input date)');
  ok(d.getElementById('foto-cmp-imgs-a') !== null && d.getElementById('foto-cmp-imgs-b') !== null, 'foto: confronto con contenitori viste affiancate (prima/dopo)');
  w.eval('fotoTag=""; fotoMode="riproduzione"; renderFotoSezione();');
  /* ── Foto progressi (tab Corpo): scrittura binaria locale + metadati in corpo.json ── */
  w.eval('switchProfile("wander")'); await settle(300);
  w.eval('showTab("corpo")');
  ok(d.getElementById('foto-box') !== null, 'foto: sezione 📸 Foto progressi nel tab Corpo');
  const nFotoPrima = w.eval('(DOC.foto||[]).length');
  await w.eval('(async()=>{ const file=new File([new Uint8Array([255,216,255,224])],"test.jpg",{type:"image/jpeg"}); await salvaFoto(file,"2026-03-01","fronte"); })()');
  await settle(500);  /* attende la scrittura binaria + il persist debounced di corpo.json */
  ok(w.eval('(DOC.foto||[]).length') === nFotoPrima + 1, 'foto: metadato aggiunto a DOC.foto');
  const fmeta = w.eval('DOC.foto[DOC.foto.length-1]');
  ok(fmeta && fmeta.data === '2026-03-01' && fmeta.tag === 'fronte' && /^f\d+/.test(fmeta.file), 'foto: data/tag/nome file registrati');
  const fbytes = fsmem._files.get('TMS_Dati/wander/foto/' + fmeta.file);
  ok(fbytes && fbytes.constructor && fbytes.constructor.name === 'Uint8Array' && fbytes.length === 4 && fbytes[0] === 255 && fbytes[1] === 216, 'foto: file BINARIO in TMS_Dati/wander/foto/ (4 byte JPEG verificati)');
  let corpoJson = null; try { corpoJson = JSON.parse(fsmem._files.get('TMS_Dati/wander/corpo.json')); } catch(e){}
  ok(corpoJson && Array.isArray(corpoJson.foto) && corpoJson.foto.some(x => x.file === fmeta.file), 'foto: metadati persistiti in corpo.json');
  const snapFoto = await w.eval('costruisciSnapshot()');
  ok(Array.isArray(snapFoto.profiles['wander'].foto) && snapFoto.profiles['wander'].foto.length >= 1, 'foto: metadati nel backup (le immagini restano file, come i video)');
  /* 2026-08-19 — BACKUP COMPLETO: prima il backup portava solo i riferimenti alle foto,
     quindi ripristinandolo su un altro PC le immagini mancavano. Ora, su richiesta,
     viaggiano dentro il file e il ripristino le riscrive su disco. */
  { const snapFull = await w.eval('costruisciSnapshot(true)');
    const ff = snapFull.profiles['wander'].fotoFiles || {};
    ok(Object.keys(ff).length >= 1 && ff[fmeta.file] && /^data:image\/[a-z]+;base64,.+/.test(ff[fmeta.file]),
       'backup completo: l\'immagine entra nel file come data-URI');
    /* il ripristino rimette il file al suo posto: lo cancello dal disco e lo riscrivo */
    const via = 'TMS_Dati/wander/foto/' + fmeta.file;
    fsmem._files.delete(via);
    ok(!fsmem._files.has(via), 'prova: immagine rimossa dal disco');
    ok(await w.eval('fotoScriviDataUri(profileDir,' + JSON.stringify(fmeta.file) + ',' + JSON.stringify(ff[fmeta.file]) + ')') === true,
       'ripristino: l\'immagine viene riscritta nella cartella foto/');
    const tornati = fsmem._files.get(via);
    ok(tornati && tornati.length === fbytes.length && tornati[0] === 255 && tornati[1] === 216,
       'ripristino: i byte tornano IDENTICI all\'originale (andata e ritorno base64 senza perdite)'); }
  /* modalità Confronto: due viste con immagini caricate dal disco */
  w.eval('fotoMode="confronto"; renderFotoSezione();'); await settle(80);
  ok(d.getElementById('foto-cmp-a') !== null && d.getElementById('foto-cmp-b') !== null, 'foto: modalità Confronto con selettori prima/dopo');
  w.eval('fotoMode="riproduzione"; renderFotoSezione();'); await settle(40);
  ok(d.getElementById('foto-pl-range') !== null && d.getElementById('foto-pl-play') !== null, 'foto: modalità Riproduzione con cursore e play');
  /* ── Report: sezione foto prima/dopo con embedding base64 (PDF + digitale) ── */
  w.eval('showTab("report")');
  ok(d.querySelector('#panel-report [data-rep="foto"]') !== null, 'report: casella sezione «Foto progressi» nei toggle');
  ok(d.getElementById('rep-foto-a') !== null && d.getElementById('rep-foto-b') !== null, 'report: selettori foto prima/dopo presenti');
  w.eval('DOC.dati_utente.report.foto=true; DOC.dati_utente.report.fotoPrima=DOC.foto[0].file; DOC.dati_utente.report.fotoDopo=DOC.foto[DOC.foto.length-1].file;');
  await w.eval('ensureReportFoto()');
  w.eval('renderReport()');
  const repFotoHtml = d.querySelector('#panel-report .rep-doc').innerHTML;
  ok(repFotoHtml.includes('Foto progressi — prima / dopo'), 'report: sezione foto presente quando attiva');
  ok(repFotoHtml.includes('data:image/'), 'report: foto incorporata come data URI (entra in PDF e report digitale)');
  w.eval('DOC.dati_utente.report.foto=false; renderReport();');
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

console.log('--- T6: bilingue IT/EN (interruttore lingua, traduzione markup statico) ---');
{
  /* default IT: il markup statico resta italiano */
  const { dom: domIt, errors: errIt } = await load({ idb: makeIDB(null), tmsFS: makeTmsFS(), fsa: true });
  await settle();
  const wIt = domIt.window, dIt = wIt.document;
  ok(errIt.length === 0, 'IT: nessun errore runtime' + (errIt.length ? ' -> ' + errIt.join(' | ') : ''));
  ok(wIt.eval("t('Ho capito')") === 'Ho capito', 'IT: t() restituisce la stringa italiana invariata');
  ok(dIt.querySelector('[data-tab="allenamento"] [data-i18n]').textContent === 'Pesi', 'IT: tab «Pesi» in italiano');
  ok(dIt.getElementById('btn-lang').textContent === 'EN', 'IT: il pulsante lingua propone «EN»');
  domIt.window.close();

  /* lingua EN salvata: il markup statico è tradotto in inglese */
  const { dom: domEn, errors: errEn } = await load({ idb: makeIDB(null), tmsFS: makeTmsFS(), fsa: true, lang: 'en' });
  await settle();
  const wEn = domEn.window, dEn = wEn.document;
  ok(errEn.length === 0, 'EN: nessun errore runtime' + (errEn.length ? ' -> ' + errEn.join(' | ') : ''));
  ok(wEn.eval("LANG") === 'en', 'EN: lingua letta da localStorage');
  ok(wEn.eval("t('Ho capito')") === 'Got it', 'EN: t() traduce dal dizionario');
  ok(wEn.eval("t('stringa non tradotta xyz')") === 'stringa non tradotta xyz', 'EN: fallback all\'italiano se manca la voce');
  ok(dEn.querySelector('[data-tab="allenamento"] [data-i18n]').textContent === 'Weights', 'EN: tab «Pesi» → «Weights»');
  ok(dEn.querySelector('[data-tab="alimentazione"] [data-i18n]').textContent === 'Nutrition', 'EN: tab «Alimentazione» → «Nutrition»');
  ok(dEn.getElementById('disc-ok').textContent === 'Got it', 'EN: disclaimer «Ho capito» → «Got it»');
  ok(dEn.getElementById('lnk-storico').textContent === 'History', 'EN: footer «Storico» → «History»');
  ok(/select the <strong>TMS<\/strong> folder/i.test(dEn.getElementById('overlay-sub').innerHTML), 'EN: overlay-sub (data-i18n-html) tradotto');
  ok(dEn.getElementById('btn-lang').textContent === 'IT', 'EN: il pulsante lingua propone «IT»');
  ok(wEn.eval("renderProfilo(); document.getElementById('prof-new').textContent") === '＋ New profile', 'EN: tab Profilo «＋ Nuovo profilo» → «＋ New profile»');
  ok(wEn.eval("renderProfilo(); (document.querySelector('#panel-profilo .sec')||{}).textContent||''").includes('Backup (all profiles together)'), 'EN: tab Profilo sezione Backup tradotta');
  ok(wEn.eval("renderAllenamento(); document.getElementById('btn-save-sched').textContent") === '💾 Save to History', 'EN: tab Pesi «Salva nello Storico» tradotto');
  ok(wEn.eval("exName('Squat con bilanciere')") === 'Barbell Squat', 'EN: nome esercizio dall\'inglese originale (ESEN per nome)');
  ok(wEn.eval("exName('Panca piana con bilanciere - presa media')") === 'Barbell Bench Press - Medium Grip', 'EN: nome esercizio composto tradotto');
  domEn.window.close();
}

console.log('');
console.log('RISULTATO: ' + pass + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERRORE TEST:', e); process.exit(2); });
