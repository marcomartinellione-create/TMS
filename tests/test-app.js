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
const { pathToFileURL } = require('url');

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
    remove: async p => { files.delete(p); },   /* come fs.rm senza recursive: una cartella resta dov'è */
    cestina: async p => {
      const parti = p.split('/'), nome = parti.pop(), madre = parti.join('/');
      const dest = (madre ? madre + '/' : '') + '_eliminati/' + nome + '-' + Date.now();
      let n = 0;
      for (const k of [...files.keys()]) if (k.startsWith(p + '/')) { files.set(dest + k.slice(p.length), files.get(k)); files.delete(k); n++; }
      for (const k of [...dirs]) if (k === p || k.startsWith(p + '/')) dirs.delete(k);
      dirs.add((madre ? madre + '/' : '') + '_eliminati'); dirs.add(dest);
      return n || true ? dest : null;
    }
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

/* jsdom non ha crypto.subtle (cifratura dello scambio col telefono): si presta quella di Node */
function conCrypto(win){
  try{ Object.defineProperty(win, 'crypto', { value: require('crypto').webcrypto, configurable: true }); }catch(e){}
  if(!win.TextEncoder) win.TextEncoder = require('util').TextEncoder;
  if(!win.TextDecoder) win.TextDecoder = require('util').TextDecoder;
}
/* l'hub del TMS (hub/worker.js) su un database D1 finto (hub/d1-finto.cjs, node:sqlite): il PC e il telefono
   delle prove lo chiamano con fetch come farebbero con quello vero su Cloudflare. */
async function makeHub(){
  const W = (await import(pathToFileURL(path.join(ROOT, 'hub', 'worker.js')).href)).default;
  const { nuovoD1 } = require('../hub/d1-finto.cjs');
  const env = { DB: nuovoD1() }, sql = env.DB._sql;
  sql.prepare('INSERT INTO inviti (codice, creato) VALUES (?, ?)').run('INVITOPROVA1', 1);
  const H = { env, sql, URL: 'https://hub.test', chiamate: 0, installati: [] };
  H.fetch = async (url, init) => { H.chiamate++; init = init || {};
    return W.fetch(new Request(String(url), { method: init.method || 'GET', headers: init.headers || {}, body: init.body }), env); };
  H.fetchSolo = (url, init) => String(url).startsWith(H.URL) ? H.fetch(url, init) : Promise.reject(new Error('offline'));
  H.file = (lid, percorso) => { const r = sql.prepare('SELECT testo FROM file WHERE lid = ? AND percorso = ? ORDER BY parte').all(lid, percorso); return r.length ? r.map(x => x.testo).join('') : null; };
  H.nomi = (lid, pre) => sql.prepare('SELECT DISTINCT percorso FROM file WHERE lid = ? AND substr(percorso, 1, ?) = ? ORDER BY percorso').all(lid, pre.length, pre).map(x => x.percorso);
  H.metti = (lid, percorso, testo) => { sql.prepare('DELETE FROM file WHERE lid = ? AND percorso = ?').run(lid, percorso);
    sql.prepare('INSERT INTO file (lid, percorso, parte, testo, ora) VALUES (?, ?, ?, ?, ?)').run(lid, percorso, 0, testo, Date.now()); };
  H.agg = { scarica: async (url, sha) => { H.installati.push([url, sha]); return { permesso: true, avviato: true }; } };
  return H;
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
      window.fetch = opts.fetch || (() => Promise.reject(new Error('offline')));
      if(opts.hub) window.TMS_HUB = opts.hub;   /* l'hub del TMS (finto, vedi makeHub) */
      if(!window.matchMedia) window.matchMedia = ()=>({matches:false,addListener(){},removeListener(){}});
      if(opts.idb) window.indexedDB = opts.idb;
      if(opts.tmsFS) window.tmsFS = opts.tmsFS;
      conCrypto(window);
      if(opts.fsa) window.showDirectoryPicker = async ()=>{ const e = new Error('abort'); e.name='AbortError'; throw e; };
      if(!window.URL.createObjectURL){ window.URL.createObjectURL = ()=>'blob:test'; window.URL.revokeObjectURL = ()=>{}; }
      /* stub del canale aggiornamenti del wrapper (v1.0.73) */
      window.__upd = { cb: null, risposte: [] };
      window.tmsUpdate = { onEvento: cb => { window.__upd.cb = cb; }, rispondi: a => { window.__upd.risposte.push(a); } };
      window.addEventListener('error', ev => errors.push(String(ev.message)));
    }
  }).then(dom => {
    /* avvisi e conferme sono riquadri dell'app (asincroni). Per gli scenari che non li
       stanno provando, li si riporta a window.alert / window.confirm, che ogni test
       sostituisce a piacere; opts.dialoghiVeri lascia quelli veri. */
    if (!opts.dialoghiVeri) dom.window.eval('avviso=function(x){ try{ window.alert(x); }catch(e){} return Promise.resolve(); }; conferma=function(x){ var r=false; try{ r=!!window.confirm(x); }catch(e){} return Promise.resolve(r); };');
    return { dom, errors };
  });
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
  /* il QR in alto è stato tolto (2026-11-13): l'app è solo sul PC */
  ok(d.getElementById('qr-ig') === null && d.querySelector('.topbar__qr') === null, 'barra in alto: niente QR');
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
  /* 16/11/2026: l'app del cliente è solo l'APK Android: il file non porta più il link alla PWA */
  ok(w.eval('typeof APP_CLIENTE_URL') === 'undefined' && !('appCliente' in schedaJs), 'export scheda: niente più link alla PWA nel file (solo APK)');
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
  /* ── 2026-09-07 — SEGNALAZIONI (🐞): modulo bug/idee con scheda tecnica allegata ── */
  w.eval('closeModal()');
  /* barra in alto simmetrica (Marco, 16/11/2026): lingua, giorno/notte e ⚙ in un blocco di tre;
     📕 Guida e 🐞 Segnala stanno dentro ⚙ Impostazioni */
  { const bar = d.querySelector('.topbar'), com = bar.querySelector('.gruppo.topbar__comandi');
    ok(com && [...com.querySelectorAll(':scope > button')].map(b => b.id).join(',') === 'btn-lang,btn-theme,btn-impost' && bar.querySelectorAll('.gruppo').length === 1,
      'barra in alto: un solo blocco di tre comandi uguali — lingua, giorno/notte, ⚙');
    ok(!bar.querySelector('#fab-guida') && !bar.querySelector('#fab-segnala') && d.getElementById('fab-segnala') === null, 'barra in alto: 📕 e 🐞 non ci sono più, stanno nelle Impostazioni');
    d.getElementById('btn-impost').click();
    ok(d.querySelector('#modal #fab-guida') && d.querySelector('#modal #fab-segnala') && d.querySelector('#fab-guida use[href="#i-libro"]') && /Guida/.test(d.getElementById('fab-guida').textContent) && /Segnala/.test(d.getElementById('fab-segnala').textContent) && /guida/i.test(d.getElementById('fab-guida').title),
      'Impostazioni: nella sezione «Aiuto» ci sono Guida e Segnala (con le icone disegnate)');
    d.getElementById('fab-segnala').click();
    ok(!d.querySelector('#modal #fab-guida') && /Segnala|scheda tecnica/i.test(d.getElementById('modal').textContent), 'Impostazioni: 🐞 Segnala apre il modulo delle segnalazioni');
    w.eval('closeModal()');
    d.getElementById('btn-impost').click(); d.getElementById('fab-guida').click();
    ok(w.eval('curTab') === 'guida' && w.eval('document.getElementById("modal-bk").classList.contains("hidden")'), 'Impostazioni: 📕 Guida chiude la finestra e apre la guida');
    ok(!d.querySelector('.footer') && !/dati locali, nessun cloud/.test(d.body.textContent), 'niente fascia in fondo alle pagine');
    ok(d.getElementById('app-ver').closest('.topbar__mark') && d.querySelector('.topbar__mark').title.includes('v' + w.eval('APP_VERSION')), 'la versione si legge passando su «TMS» in alto');
    for (let k = 0; k < 5; k++) d.getElementById('app-ver').click();
    ok(d.getElementById('modal').innerHTML.includes('boom di prova'), '5 click su «TMS» aprono il log errori');
    w.eval('closeModal()');
    w.eval('showTab("profilo")');
    ok(d.querySelector('#panel-profilo .prof-item #lnk-storico') && d.querySelector('#panel-profilo .prof-item #lnk-misure') && d.getElementById('dot-storico') && d.getElementById('dot-storico').title !== '' && !d.querySelector('.prof-archivio'),
      'Profilo: Storico e Misure nella riga del profilo attivo, coi pallini di stato');
    ok(d.querySelectorAll('#panel-profilo .prof-item').length === d.querySelectorAll('#panel-profilo .prof-item [data-parch="storico"]').length, 'Profilo: ogni profilo ha i suoi pulsanti Storico e Misure');
    { const g = [...d.querySelectorAll('#panel-profilo .prof-item:first-child .gruppo')];
      ok(g.length === 1 && !d.querySelector('#panel-profilo [data-pexs]') && !d.querySelector('#panel-profilo [data-prin]'), 'Profilo: niente più Esporta scheda / Importa rientro (la scheda è collegata al telefono)'); }
    ok(!/Il <b>pallino<\/b> accanto al nome/.test(d.getElementById('panel-profilo').innerHTML), 'Profilo: niente guida in cima alla pagina');
    ok(d.getElementById('prof-autobk') !== null && d.querySelector('.topbar .gruppo #btn-impost') && d.querySelector('.topbar .gruppo #btn-lang'), 'barra in alto: ⚙ e la lingua nello stesso blocco');
    d.getElementById('lnk-storico').click();
    ok(w.eval('curTab') === 'storico' && d.querySelector('.tab[data-tab="profilo"]').classList.contains('is-active'), 'Profilo → 📜 Storico apre lo Storico (resta acceso il tab Profilo)');
    w.eval('showTab("profilo")'); d.getElementById('lnk-misure').click();
    ok(w.eval('curTab') === 'storicocorpo', 'Profilo → 📏 Misure apre le Misure');
    w.eval('showTab("profilo")'); }
  /* ── Ctrl+Z / Ctrl+Y: annulla e rifà le modifiche ai dati ── */
  { const tasto = (k, o) => d.dispatchEvent(new w.KeyboardEvent('keydown', Object.assign({ key: k, ctrlKey: true, bubbles: true, cancelable: true }, o || {})));
    const schedaOrig = w.eval('JSON.stringify(DOC.scheda)');
    w.eval('DOC.scheda.settimanale=[{giorno:"Lunedì",esercizio:"Squat con bilanciere",serie:3,rip:5,peso:100}]; undoAzzera(); showTab("allenamento")');
    const prima = w.eval('JSON.stringify(DOC.scheda)');
    w.eval('DOC.scheda.settimanale[0].serie=99; persist("scheda")');
    ok(w.eval('undoPila.length') === 1, 'annulla: una modifica salvata finisce nella pila');
    w.eval('DOC.scheda.settimanale[0].serie=98; persist("scheda")');
    ok(w.eval('undoPila.length') === 1, 'annulla: due modifiche ravvicinate alla stessa parte sono un passo solo');
    tasto('z');
    ok(w.eval('JSON.stringify(DOC.scheda)') === prima, 'Ctrl+Z: la scheda torna com\'era');
    ok(d.getElementById('undo-avviso') && d.getElementById('undo-avviso').classList.contains('on') && /Annullata/.test(d.getElementById('undo-avviso').textContent), 'Ctrl+Z: avviso in basso con cosa è stato annullato');
    tasto('y');
    ok(w.eval('DOC.scheda.settimanale[0].serie') === 98, 'Ctrl+Y: la modifica torna');
    tasto('z', { shiftKey: false }); tasto('z', { shiftKey: true });
    ok(w.eval('DOC.scheda.settimanale[0].serie') === 98, 'Ctrl+Maiusc+Z rifà come Ctrl+Y');
    tasto('z');
    w.eval('DOC.storico_io.push({scheda:202601,peso:80}); persist("corpo")');
    w.eval('undoUltimo.ora=0; DOC.dati_utente.altezza=181; persist("corpo")');
    ok(w.eval('undoPila.length') === 2 && w.eval('redoPila.length') === 0, 'annulla: una modifica nuova svuota il «rifai»');
    tasto('z'); tasto('z');
    ok(w.eval('DOC.storico_io.some(function(r){return r.scheda===202601&&r.peso===80;})') === false, 'Ctrl+Z due volte: tolte anche le misure aggiunte');
    w.eval('modal("<input id=x>")'); w.eval('DOC.scheda.settimanale[0].serie=77; persist("scheda")'); tasto('z');
    ok(w.eval('DOC.scheda.settimanale[0].serie') === 77, 'Ctrl+Z non tocca i dati mentre è aperta una finestra');
    w.eval('closeModal()'); tasto('z');
    ok(w.eval('JSON.stringify(DOC.scheda)') === prima, 'Ctrl+Z dopo aver chiuso la finestra annulla');
    w.eval('applyProfileData(docProfileData())');
    ok(w.eval('undoPila.length') === 0, 'annulla: caricando i dati di un profilo la pila si svuota');
    w.eval('DOC.scheda=' + schedaOrig + '; persist("scheda"); undoAzzera(); showTab("profilo")'); await settle(400); }
  { const st = w.eval('segnSchedaTecnica()');
    ok(st.includes('TMS v') && /Modalità|Mode/.test(st) && /Tab/.test(st), 'segnalazioni: la scheda tecnica porta versione, modalità e tab aperto');
    ok(st.includes('boom di prova'), 'segnalazioni: allega gli ULTIMI ERRORI interni — è ciò che rende la segnalazione diagnosticabile');
    const testo = w.eval('segnTesto({tipo:"bug",cosa:"il TL resta a zero",passi:"salvo la scheda",gravita:"blocca"})');
    ok(testo.includes('il TL resta a zero') && testo.includes('salvo la scheda') && testo.includes('TMS v'),
       'segnalazioni: il testo unisce racconto dell\'utente e scheda tecnica');
    /* l\'indirizzo GitHub non deve superare il limite pratico: oltre, i browser troncano in silenzio */
    const url = w.eval('segnUrlGitHub("[bug] prova", ' + JSON.stringify('x'.repeat(20000)) + ')');
    ok(url.startsWith(w.eval('GH_REPO_URL') + '/issues/new') && url.length <= 6000,
       'segnalazioni: la issue GitHub viene accorciata sotto il limite (' + url.length + ' caratteri) invece di essere troncata dal browser');
    ok(w.eval('segnUrlGitHub("t","corto")').includes('body=corto'), 'segnalazioni: un testo breve passa intero nell\'indirizzo');
    /* il modulo si apre e mostra l\'anteprima già compilata */
    w.eval('segnalaModal()');
    ok(d.getElementById('sg-testo') !== null && d.getElementById('sg-testo').value.includes('TMS v'),
       'segnalazioni: il modulo mostra in anteprima il testo completo prima di mandarlo');
    ok(d.getElementById('sg-github') !== null && d.getElementById('sg-copia') !== null && d.getElementById('sg-file') !== null,
       'segnalazioni: tre strade — GitHub, copia, salva su file (chi non ha GitHub non resta a piedi)');
    ok(d.getElementById('sg-ig') !== null, 'segnalazioni: GitHub e Instagram come scelta paritaria (dove preferisce contattare)');
    w.eval('closeModal()'); }
  /* ── TACCUINO dell'autore: 5 click sul ✦ del titolo (gesto gemello del log errori,
     che sta invece sulla versione nel footer). Note locali + specchio delle issue. ── */
  { const sigil = d.querySelector('.topbar__mark .sigil');
    ok(sigil !== null, 'taccuino: il ✦ accanto a «TMS» è il punto del gesto');
    ok(d.querySelector('.hero') === null && d.querySelector('.topbar .topbar__mark') !== null, 'intestazione: niente fascia del titolo, «TMS» nella barra in alto');
    for (let i = 0; i < 5; i++) sigil.click();
    await settle(120);
    ok(d.getElementById('tacc-testo') !== null, 'taccuino: 5 click sul ✦ lo aprono');
    ok(d.getElementById('tacc-note') !== null && d.getElementById('tacc-iss') !== null,
       'taccuino: due elenchi separati — le mie note e quelle da GitHub');
    /* una nota scritta a mano deve sopravvivere su disco */
    d.getElementById('tacc-testo').value = 'ACWR non si aggiorna cambiando Training Set';
    await w.eval('(function(){ document.getElementById("tacc-add").click(); })()');
    await settle(150);
    ok(w.eval('TACC.note.length') === 1 && w.eval('TACC.note[0].testo').startsWith('ACWR'), 'taccuino: la nota entra nell\'elenco');
    { let salvato = null; try { salvato = JSON.parse(fsmem._files.get('TMS_Dati/taccuino.json')); } catch(e){}
      ok(salvato && Array.isArray(salvato.note) && salvato.note.length === 1,
         'taccuino: le note vivono nella cartella dati (taccuino.json), quindi funzionano offline'); }
    /* lo specchio GitHub: nessuna rete nei test, si simula la risposta */
    w.fetch = async () => ({ ok:true, json: async () => ([
      { number:12, title:'Il TL resta a zero', html_url:'https://x/12', labels:[{name:'bug'}], created_at:'2026-09-01T10:00:00Z' },
      { number:13, title:'Non è una issue', html_url:'https://x/13', labels:[], created_at:'2026-09-02T10:00:00Z', pull_request:{} }
    ]) });
    const n = await w.eval('taccScaricaIssues()');
    ok(n === 1, 'taccuino: le pull request vengono scartate, restano le issue vere (' + n + ')');
    ok(w.eval('TACC.github.issues[0].n') === 12 && w.eval('TACC.github.issues[0].etichette[0]') === 'bug',
       'taccuino: numero, titolo ed etichette rispecchiati da GitHub');
    ok(w.eval('!!TACC.github.aggiornato'), 'taccuino: l\'ultima lettura resta salvata, così l\'elenco si vede anche senza rete');
    /* errore di rete: deve dirlo, non sparire in silenzio */
    w.fetch = async () => ({ ok:false, status:403 });
    let messaggio = '';
    try { await w.eval('taccScaricaIssues()'); } catch(e){ messaggio = String(e && e.message || e); }
    ok(/403/.test(messaggio), 'taccuino: se GitHub rifiuta la lettura lo dice invece di fallire in silenzio');
    w.eval('closeModal()'); }
  w.eval('closeModal()');
  /* v1.0.73: dialoghi di aggiornamento in stile app (via canale tmsUpdate) */
  w.eval('window.__upd.cb({tipo:"disponibile", versione:"9.9.9", attuale:APP_VERSION, maggiore:true, note:"Novita di prova"})');
  const updHtml = d.getElementById('modal').innerHTML;
  ok(!d.getElementById('modal-bk').classList.contains('hidden') && updHtml.includes('MAGGIORE') && updHtml.includes('v9.9.9') && updHtml.includes('Novita di prova'), 'annuncio aggiornamento in stile app (maggiore + note)');
  d.getElementById('upd-vai').click();
  ok(w.eval('window.__upd.risposte[0]') === 'chiedi', 'aggiornamenti: appena in ascolto la pagina richiede l\'avviso al wrapper (non va perso se arriva prima)');
  ok(w.eval('window.__upd.risposte.filter(function(x){return x!=="chiedi";}).join(",")') === 'scarica' && d.getElementById('modal-bk').classList.contains('hidden'), 'Scarica e installa -> risposta al wrapper, modale chiuso');
  w.eval('window.__upd.cb({tipo:"pronto", versione:"9.9.9"})');
  ok(d.getElementById('modal').innerHTML.includes('Aggiornamento pronto'), 'modale "pronto, riavviare?" in stile app');
  d.getElementById('upd-riavvia').click();
  ok(w.eval('window.__upd.risposte.filter(function(x){return x!=="chiedi";}).join(",")') === 'scarica,riavvia', 'Riavvia ora -> risposta al wrapper');
  /* ── 2026-11-13 — Report a blocchi: anteprima in fogli A4 a sinistra, strumenti a destra ── */
  w.eval('closeModal(); repEdit={profilo:null, blocchi:{}}; repSel={blocco:null, el:null}; repInModifica=null; showTab("report")'); await settle(30);
  ok(d.querySelector('#panel-report .pag--report #rep-pagine .pg') && d.getElementById('rep-strumenti') && d.querySelector('#rep-sorgente.rep-doc'), 'report: fogli A4 dell\'anteprima a sinistra, strumenti a destra');
  ok(d.querySelector('#rep-pagine .u[data-blocco="copertina"]') && d.querySelector('#rep-pagine .u[data-blocco="piede"]') && d.querySelectorAll('#rep-lista [data-selblocco]').length >= 13, 'report: copertina, blocchi e piè di pagina, tutti nell\'elenco');
  ok(d.querySelector('#rep-pagine .u[data-blocco="profilo"] .rep-maniglia[draggable="true"]') && !d.querySelector('#rep-pagine .u[data-blocco="copertina"] .rep-maniglia') && !d.querySelector('#rep-sorgente .rep-maniglia'), 'report: manico ⠿ per trascinare i blocchi spostabili, solo nell\'anteprima');
  /* scelta di un blocco dall'anteprima → impostazioni */
  d.querySelector('#rep-pagine .u[data-blocco="profilo"] .cards').click(); await settle(10);
  ok(w.eval('repSel.blocco') === 'profilo' && w.eval('repSel.el') === '0' && d.querySelector('#rep-imp h4').textContent.includes('Profilo') && d.querySelector('#rep-el') && d.querySelector('#rep-pagine .u[data-blocco="profilo"].is-sel'), 'report: un clic nel foglio sceglie blocco ed elemento, con le loro impostazioni');
  d.querySelector('[data-imp-testo="g"]').click(); await settle(10);
  d.querySelector('[data-imp-colore="ok"]').click(); await settle(10);
  d.querySelector('[data-imp="nuovaPagina"]').click(); await settle(10);
  d.querySelector('[data-imp="mostraDescr"]').click(); await settle(10);
  { const b = w.eval('JSON.stringify(DOC.dati_utente.report.blocchi.profilo)');
    ok(b === JSON.stringify({ mostraDescr: false, nuovaPagina: true, testo: 'g', colore: 'ok' }), 'report: le impostazioni del blocco si salvano per profilo (solo quelle cambiate)');
    const s = d.querySelector('#rep-sorgente [data-blocco="profilo"]');
    ok(s.classList.contains('t-g') && s.classList.contains('col-ok') && s.classList.contains('rep-no-descr') && s.getAttribute('data-nuovapagina') === '1', 'report: le impostazioni diventano classi del blocco (valgono per fogli, PDF e digitale)');
    const u = w.eval('buildReportUnits(document, document.getElementById("rep-sorgente")).filter(function(x){return x.getAttribute("data-blocco")==="profilo";}).map(function(x){return x.className+"|"+(x.getAttribute("data-nuovapagina")||"");})');
    ok(u.length >= 1 && u[0].includes('t-g') && u[0].endsWith('|1'), 'report: i pezzi del PDF portano le impostazioni e il salto pagina'); }
  d.getElementById('rep-imp-reset').click(); await settle(10);
  ok(!w.eval('DOC.dati_utente.report.blocchi.profilo'), 'report: «Impostazioni iniziali» toglie le impostazioni del blocco');
  /* titolo personalizzato */
  w.eval('repSalvaImp(DOC.dati_utente.report,"record",Object.assign({},REP_DEF_IMP,{titolo:"I miei record"})); renderReport();');
  ok(d.querySelector('#rep-sorgente [data-blocco="record"] .rep-tit').textContent === 'I miei record', 'report: titolo del blocco cambiato dalle impostazioni');
  w.eval('repSalvaImp(DOC.dati_utente.report,"record",Object.assign({},REP_DEF_IMP)); renderReport();');
  /* elementi: togliere e spostare valgono solo per il documento */
  d.querySelector('#rep-pagine .u[data-blocco="profilo"] .rep-descr').click(); await settle(10);
  d.querySelector('[data-elop="su"]').click(); await settle(10);
  ok(d.querySelector('#rep-sorgente [data-blocco="profilo"]').firstElementChild.nextElementSibling.classList.contains('rep-descr') && d.querySelector('#rep-lista [data-selblocco="profilo"] .pill--avviso'), 'report: «▲ Su» sposta l\'elemento dentro il blocco (blocco segnato come ritoccato)');
  w.eval('repSel={blocco:"profilo", el:document.querySelector("#rep-sorgente [data-blocco=profilo] .rep-descr").getAttribute("data-el")}'); w.eval('repElemento("via")');
  ok(!d.querySelector('#rep-sorgente [data-blocco="profilo"] .rep-descr'), 'report: «✕ Togli elemento» lo toglie dal documento');
  ok(!JSON.stringify(w.eval('DOC.dati_utente.report')).includes('rep-descr'), 'report: i ritocchi agli elementi non finiscono nei dati salvati');
  /* riordino: frecce e trascinamento portano allo stesso risultato */
  w.eval('repSposta(DOC.dati_utente.report,"record","profilo",false)');
  ok(w.eval('DOC.dati_utente.report.ordine[0]') === 'record' && d.querySelector('#rep-sorgente').children[1].getAttribute('data-blocco') === 'record', 'report: trascinare un blocco sopra un altro lo sposta lì (anche nei fogli)');
  w.eval('repSposta(DOC.dati_utente.report,"record","copertina",false)');
  ok(d.querySelector('#rep-sorgente').firstElementChild.getAttribute('data-blocco') === 'copertina', 'report: la copertina resta sempre in cima');
  w.eval('delete DOC.dati_utente.report.ordine; renderReport();');
  /* modifica sul posto: doppio clic, si scrive nel foglio, il blocco si ricompone (anche le tabelle divise) */
  d.querySelector('#rep-pagine .u[data-blocco="copertina"]').dispatchEvent(new w.MouseEvent('dblclick', { bubbles: true })); await settle(10);
  ok(w.eval('repInModifica') === 'copertina' && d.querySelector('#rep-pagine .u[data-blocco="copertina"][contenteditable="true"]') && d.getElementById('rep-fine'), 'report: doppio clic su un blocco → si scrive nel foglio');
  d.querySelector('#rep-pagine .u[data-blocco="copertina"] h1').textContent = 'Report di prova';
  d.getElementById('rep-fine').click(); await settle(10);
  ok(d.querySelector('#rep-pagine h1').textContent === 'Report di prova' && !d.querySelector('#rep-pagine [contenteditable="true"]') && !d.querySelector('#rep-sorgente [contenteditable], #rep-sorgente .rep-maniglia'), 'report: «Fine modifica» tiene il testo nuovo, il documento resta pulito');
  ok(w.eval('buildReportUnits(document, document.getElementById("rep-sorgente")).some(function(u){ return u.textContent.indexOf("Report di prova")>=0; })'), 'report: il PDF prende il testo modificato');
  w.eval('repSel={blocco:"record", el:null}; repInModifica="record"; renderReport();');
  { const righe0 = d.querySelectorAll('#rep-pagine .u[data-blocco="record"] tbody tr').length;
    const td = d.querySelector('#rep-pagine .u[data-blocco="record"] tbody tr:not(.day-sep) td');
    const rg = d.createRange(); rg.selectNodeContents(td); rg.collapse(true); const sel = w.getSelection(); sel.removeAllRanges(); sel.addRange(rg);
    d.querySelector('[data-repop="riga-sotto"]').click(); await settle(10);
    ok(d.querySelectorAll('#rep-sorgente [data-blocco="record"] tbody tr').length === righe0 + 1 && d.querySelectorAll('#rep-sorgente [data-blocco="record"] .tbl-wrap').length === 1, 'report in modifica: «Riga sotto» aggiunge una riga, la tabella resta una sola'); }
  w.eval('repInModifica=null; renderReport();');
  w.eval('window.__cfOrig=conferma; conferma=function(){ return Promise.resolve(true); }');
  w.eval('repSel={blocco:"copertina", el:null}; renderReport();'); d.getElementById('rep-rifai').click(); await settle(30);
  w.eval('conferma=window.__cfOrig');
  ok(d.querySelector('#rep-pagine h1').textContent !== 'Report di prova' && !w.eval('repEdits().copertina'), 'report: «↺ Rifai dai dati» riporta il blocco ai dati');
  /* ── 2026-11-13 — scorrimento conservato e aggiornamento in tempo reale ── */
  w.eval('repSel={blocco:"profilo", el:null}; renderReport();'); await settle(10);
  { const side=d.getElementById('rep-strumenti'); side.scrollTop=123;
    d.querySelector('#rep-lista [data-selblocco="record"]').click(); await settle(10);
    ok(w.eval('repSel.blocco')==='record' && side.scrollTop===123, 'report: scegliere un altro blocco non fa saltare in cima il pannello degli strumenti'); }
  { const goal=d.getElementById('rep-goal'); goal.value='ricomposizione corporea'; goal.dispatchEvent(new w.Event('input',{bubbles:true}));
    ok(d.querySelector('#rep-pagine [data-blocco="copertina"] .rep-obiettivo-txt').textContent==='ricomposizione corporea'
      && d.querySelector('#rep-sorgente [data-blocco="copertina"] .rep-obiettivo-txt').textContent==='ricomposizione corporea'
      && !d.querySelector('#rep-pagine [data-blocco="copertina"] .rep-obiettivo').classList.contains('rep-obiettivo--vuoto'),
      'report: scrivendo l\'obiettivo il foglio si aggiorna SUBITO, senza aspettare il ridisegno');
    goal.value=''; goal.dispatchEvent(new w.Event('input',{bubbles:true}));
    ok(d.querySelector('#rep-pagine [data-blocco="copertina"] .rep-obiettivo').classList.contains('rep-obiettivo--vuoto'), 'report: obiettivo svuotato → la riga sparisce subito'); }
  { const nota=d.getElementById('rep-nota'); nota.value='Bel lavoro questa settimana'; nota.dispatchEvent(new w.Event('input',{bubbles:true}));
    ok(d.querySelector('#rep-pagine [data-blocco="note"] .rep-nota').textContent==='Bel lavoro questa settimana'
      && d.querySelector('#rep-sorgente [data-blocco="note"] .rep-nota').textContent==='Bel lavoro questa settimana',
      'report: le note si aggiornano subito nel foglio, mentre si scrive'); }
  w.eval('repSel={blocco:"record", el:null}; renderReport();'); await settle(10);
  { const ti=d.getElementById('rep-imp-titolo'); const tit0=d.querySelector('#rep-pagine [data-blocco="record"] .rep-tit').textContent;
    ti.value='I miei record'; ti.dispatchEvent(new w.Event('input',{bubbles:true}));
    ok(d.querySelector('#rep-pagine [data-blocco="record"] .rep-tit').textContent==='I miei record', 'report: il titolo del blocco cambia subito nel foglio, senza aspettare');
    ti.value=''; ti.dispatchEvent(new w.Event('input',{bubbles:true}));
    ok(d.querySelector('#rep-pagine [data-blocco="record"] .rep-tit').textContent===tit0, 'report: titolo svuotato → torna subito al titolo predefinito'); }
  w.eval('DOC.dati_utente.report.obiettivo=""; DOC.dati_utente.report.nota=""; delete DOC.dati_utente.report.blocchi.record; repEdit={profilo:null, blocchi:{}}; repSel={blocco:null, el:null}; renderReport();');
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
  /* profilo dimostrativo del 18/11/2026 (tools/genera-profilo-template.py): 62 settimane, cinque Training Set */
  ok(w.eval('DOC.scheda.settimanale.length') === 24, 'scheda template caricata (24 righe, Training Set «Ipertrofia B»)');
  ok(w.eval('DOC.storico.length') === 1134, 'storico template caricato (1134 righe)');
  ok(w.eval('DOC.storico_rpe.length') === 257, 'storico_rpe popolato (257 sedute durata+intensità)');
  ok(w.eval('Array.isArray(DOC.cardio) && DOC.cardio.length') === 75, 'template: 75 sedute cardio demo caricate (Corsa/Bici/HIIT)');
  ok(w.eval('ensureSets().setsOrdine.join("|")') === 'Ipertrofia A|Forza|Powerlifting|Casa · manubri|Ipertrofia B' &&
     w.eval('Object.keys(DOC.scheda.setsSalvati).map(function(n){ return DOC.scheda.setsSalvati[n].tipoAllenamento; }).concat(DOC.scheda.tipoAllenamento).join(",")') === 'ipertrofia,forza,powerlifting,generale,ipertrofia',
     'template: cinque Training Set, ognuno col suo tipo di allenamento');
  ok(w.eval('DOC.pesate.length') === 56 && w.eval('DOC.storico_io.filter(rigaIoDaPesate).length') === 8 && w.eval('DOC.foto.length') === 45,
     'template: 56 pesate della bilancia (8 settimane nello Storico misure) e 45 foto segnaposto');
  ok(TD && JSON.parse(fs.readFileSync(path.join(TD, 'template', 'corpo.json'), 'utf8')).foto.every(f => fs.existsSync(path.join(TD, 'template', 'foto', f.file))),
     'template: ogni foto elencata in corpo.json ha il suo file');
  ok(w.eval('DOC.dati_utente.useRpe') === true && w.eval('DOC.dati_utente.altezza') === 178, 'dati utente template (useRpe, 178 cm)');
  const tabs = ['profilo','allenamento','cardio','progressi','corpo','storicocorpo','alimentazione','analisi','report'];
  let tabErr = null;
  for(const t of tabs){ try { w.eval('showTab(' + JSON.stringify(t) + ')'); } catch(e){ tabErr = t + ': ' + e.message; break; } }
  ok(!tabErr, 'tab sul profilo template senza eccezioni' + (tabErr ? ' -> ' + tabErr : ''));
  /* v1.0.68: periodi alimentari + tab Analisi */
  ok(w.eval('DOC.alimentazione.periodi.map(function(p){ return p.fase; }).join(",")') === 'bulk,cut,mant,cut,bulk' &&
     w.eval('DOC.alimentazione.periodi.filter(periodoInCorso).length') === 1 && w.eval('periodoInCorso(DOC.alimentazione.periodi[4])'),
     'template con 5 periodi alimentari (bulk/cut/mant/cut/bulk), l\'ultimo in corso');
  ok(w.eval('plateauList("").map(function(p){ return p.nome; }).sort().join("|")') === 'Alzate laterali|French press',
     'template: «In stallo» segnala solo i due stalli voluti (Alzate laterali, French press)');
  { const ip = JSON.parse(w.eval('JSON.stringify(indiceProgresso(""))'));
    ok(ip && ip.salti.length === 3 && ip.var.forza > 5 && ip.var.forza < 40, 'template: «Progresso reale» salta 3 cambi scheda e la forza cresce in modo credibile (+' + (ip ? ip.var.forza.toFixed(0) : '?') + ' %)'); }
  ok(w.eval('settimaneTra("2025-11-03","2025-11-17").join(",")') === '202545,202546,202547', 'settimaneTra: intervallo date -> settimane ISO');
  ok(w.eval('settConsecutive(202552,202601)') === true && w.eval('settConsecutive(202545,202547)') === false, 'settConsecutive: cambio anno e buchi gestiti');
  ok(Math.abs(w.eval('pearson([1,2,3,4],[2,4,6,8])') - 1) < 1e-9, 'pearson: correlazione perfetta = 1');
  ok(w.eval('kcalPiano(DOC.alimentazione.periodi[0].righe)') > 1000, 'kcal/giorno del periodo calcolate dal piano');
  w.eval('showTab("analisi")');
  const pan = d.getElementById('panel-analisi').innerHTML;
  ok(pan.includes('Timeline') && pan.includes('bilancio calorico') && pan.includes('ritardo') && pan.includes('Confronto fasi'), 'tab Analisi: 4 grafici presenti');
  ok((pan.match(/<svg/g) || []).length >= 4, 'tab Analisi: SVG renderizzati (' + (pan.match(/<svg/g) || []).length + ')');
  ok(!d.getElementById('ader-analisi'), 'tab Analisi: senza giorni di dieta segnati niente sezione «Dieta seguita e peso»');
  /* dieta seguita e peso (25/11/2026): giorni segnati dal cliente sotto il peso, % per settimana, confronto */
  { const salva = w.eval('JSON.stringify({a:DOC.alimentazione.aderenza||null, p:DOC.pesate||[]})');
    w.eval(`(function(){ var g=function(k){ var x=new Date(); x.setDate(x.getDate()-k); return dataLocale(x); };
      DOC.alimentazione.aderenza={}; DOC.pesate=[]; var peso=80;
      for(var k=27;k>=0;k--){ var buona=Math.floor(k/7)%2===0, v=buona? 'si' : (k%2? 'si':'no'); DOC.alimentazione.aderenza[g(k)]={v:v, t:g(k)+'T20:00:00Z'};
        peso+= buona? -0.1 : 0.08; DOC.pesate.push({id:g(k)+'T07:00:00|'+peso.toFixed(2), data:g(k), ora:'07:00:00', peso:+peso.toFixed(2)}); }
      showTab("analisi"); })()`);
    const sez = d.getElementById('ader-analisi');
    ok(sez && sez.querySelectorAll('svg')[0].querySelectorAll('rect.ader-giorno.si').length > 10 && sez.querySelectorAll('svg')[0].querySelectorAll('rect.ader-giorno.no').length > 0 && sez.querySelector('.ader-pct'),
       'tab Analisi: sezione «Dieta seguita e peso» con la striscia dei giorni (verde sì, rosso no) e la % di ogni settimana');
    ok(/% dei giorni segnati/.test(sez.textContent) && /dieta seguita.*kg in media.*non seguita.*kg in media/.test(sez.querySelector('.ader-conf').textContent.replace(/\s+/g, ' ')),
       'tab Analisi: percentuale dei giorni segnati e confronto del peso fra settimane con e senza dieta seguita');
    const D = JSON.parse(w.eval('JSON.stringify(aderenzaDati().conf)'));
    ok(D.seguite < 0 && D.no > 0, 'tab Analisi: nelle settimane con la dieta seguita il peso scende, nelle altre sale (dati di prova)');
    w.eval('(function(){ var s=' + JSON.stringify(salva) + '; s=JSON.parse(s); if(s.a) DOC.alimentazione.aderenza=s.a; else delete DOC.alimentazione.aderenza; DOC.pesate=s.p; })()'); }
  w.eval('showTab("alimentazione")');
  ok(d.getElementById('panel-alimentazione').innerHTML.includes('Periodi') && d.getElementById('per-add') !== null, 'sezione Periodi nel tab Alimentazione');
  /* periodi IN CORSO (Marco, 15/11/2026): si avviano senza data di fine e si terminano dopo */
  { const salvaPer = w.eval('JSON.stringify(DOC.alimentazione.periodi)');
    w.eval('DOC.alimentazione.periodi=[]; DOC.dati_utente.faseAlim="mant"; renderAlimentazione();');
    const oggi = w.eval('dataOggi()'), dueSett = w.eval('(function(){ var x=new Date(); x.setDate(x.getDate()-14); return dataLocale(x); })()');
    ok(/^\d{4}-\d{2}-\d{2}$/.test(oggi) && w.eval('giornoPrima("2026-03-01")') === '2026-02-28' && w.eval('periodoFine({dal:"2026-01-05",al:""})') === oggi,
       'periodi in corso: data di oggi in ora locale, giorno prima, fine = oggi se manca la data di fine');
    ok(d.getElementById('per-start') !== null, 'periodi in corso: pulsante «▶ Avvia un periodo…» nel tab Alimentazione');
    /* avvio con una data nel futuro: rifiutato */
    w.eval('avviaPeriodo()'); d.getElementById('per-dal').value = '2999-01-01'; d.getElementById('per-avvia').click();
    ok(w.eval('DOC.alimentazione.periodi.length') === 0, 'periodi in corso: una data d\'inizio nel futuro non avvia nulla');
    w.eval('closeModal()');
    /* avvio due settimane fa */
    w.eval('avviaPeriodo()'); d.getElementById('per-fase').value = 'mant'; d.getElementById('per-dal').value = dueSett; d.getElementById('per-avvia').click();
    w.eval('closeModal()');
    const p1 = JSON.parse(w.eval('JSON.stringify(DOC.alimentazione.periodi[0]||null)'));
    ok(p1 && p1.fase === 'mant' && p1.dal === dueSett && p1.al === '' && p1.righe.length > 0 && w.eval('!!periodoAperto()'),
       'periodi in corso: avviato senza data di fine, con la fotografia del piano');
    const pan2 = d.getElementById('panel-alimentazione').innerHTML;
    ok(/per-live/.test(pan2) && /in corso/.test(pan2) && d.querySelector('[data-perstop="0"]') !== null,
       'periodi in corso: la riga dice «in corso» e ha il pulsante ⏹ Termina');
    ok(w.eval('(function(){ var w0=isoWeek(new Date()); return !!periodiPerSettimana()[schedaCode(w0.anno,w0.sett)]; })()'),
       'periodi in corso: nell\'Analisi il periodo arriva fino alla settimana di oggi');
    /* un secondo avvio chiude il primo il giorno prima */
    w.eval('avviaPeriodo()'); d.getElementById('per-fase').value = 'cut'; d.getElementById('per-dal').value = oggi; d.getElementById('per-avvia').click();
    w.eval('closeModal()');
    const P2 = JSON.parse(w.eval('JSON.stringify(DOC.alimentazione.periodi)'));
    ok(P2.length === 2 && P2[0].al === w.eval('giornoPrima(dataOggi())') && P2[1].fase === 'cut' && P2[1].al === '' && P2.filter(p => !p.al).length === 1,
       'periodi in corso: avviandone un altro, quello in corso si chiude il giorno prima (uno solo in corso)');
    /* termina, con la fotografia aggiornata perché il piano è cambiato */
    w.eval('DOC.alimentazione.cut.push({pasto:"Prova",alimento:DOC.alimentazione.cut.find(function(r){return r.alimento;}).alimento,grammi:50});');
    w.eval('terminaPeriodo(1)');
    ok(d.getElementById('per-foto') !== null, 'periodi in corso: terminando, se il piano è cambiato si può aggiornare la fotografia');
    d.getElementById('per-al').value = '2000-01-01'; d.getElementById('per-stop').click();
    ok(w.eval('DOC.alimentazione.periodi[1].al') === '', 'periodi in corso: una data di fine prima dell\'inizio non termina il periodo');
    w.eval('closeModal(); terminaPeriodo(1)');
    d.getElementById('per-al').value = oggi; d.getElementById('per-foto').checked = true; d.getElementById('per-stop').click();
    w.eval('closeModal()');
    ok(w.eval('DOC.alimentazione.periodi[1].al') === oggi && w.eval('DOC.alimentazione.periodi[1].righe.length') === w.eval('fotografiaPiano("cut").righe.length') && !w.eval('periodoAperto()'),
       'periodi in corso: terminato con la data scelta e la fotografia aggiornata; nessun periodo resta in corso');
    w.eval('DOC.alimentazione.cut.pop(); DOC.alimentazione.periodi=' + salvaPer + '; renderAlimentazione();'); }
  /* alimentazione (richieste Marco): selettore fase nel tab, riordino pasti, preferiti/recenti + ricerca a parole sugli alimenti */
  ok(d.querySelector('#panel-alimentazione [data-fasesel]') !== null, 'alimentazione: selettore fase nel tab (non più nel Profilo)');
  w.eval('DOC.dati_utente.faseAlim="bulk"; renderAlimentazione();');
  d.querySelector('#panel-alimentazione [data-fasesel="cut"]').click();
  ok(w.eval('DOC.dati_utente.faseAlim')==='cut', 'alimentazione: il selettore imposta la fase attiva (cut)');
  w.eval('DOC.dati_utente.faseAlim="bulk"; renderAlimentazione();');
  ok(w.eval('foodMatch({nome:"Riso integrale, secco",categoria:"Cereali"},"riso secco")')===true && w.eval('foodMatch({nome:"Riso integrale, secco",categoria:"Cereali"},"riso pollo")')===false, 'alimenti: ricerca «a parole» (tutte le parole presenti)');
  { const ord=w.eval('(function(){var s=[];(DOC.alimentazione.bulk||[]).forEach(function(r){var m=((r.pasto||"").trim())||"Senza pasto";if(s.indexOf(m)<0)s.push(m);});return s;})()');
    ok(ord.length>=2, 'alimentazione: la fase bulk ha più pasti');
    /* nuova banca alimenti: due fonti, due macro categorie, nomi storici intatti */
    ok(w.eval('FOOD.length')>4000 && w.eval('FOOD.every(function(f){return (f.tipo==="S"||f.tipo==="R"||f.tipo==="I")&&(f.fonte==="CH"||f.fonte==="FR"||f.fonte==="IN")&&f.nome&&f.per100&&f.per100.kcal!=null;})'), 'banca alimenti: oltre 4000 voci, ognuna con tipo (semplice/ricetta), fonte ed energia');
    ok(w.eval('new Set(FOOD.map(function(f){return f.nome;})).size===FOOD.length'), 'banca alimenti: nessun nome doppio (il nome è la chiave dei piani salvati)');
    ok(['Fiocchi di avena','Banana, cruda','Acciuga sott\'olio, sgocciolata','Tacchino, petto, scaloppina o sminuzzato, crudo','Burro di arachidi'].every(n=>w.eval('!!FOODBYNAME['+JSON.stringify(n)+'] && FOODBYNAME['+JSON.stringify(n)+'].fonte==="CH"')), 'banca alimenti: i nomi della banca precedente ci sono ancora, identici (sono le chiavi dei piani salvati)');
    ok(w.eval('FOODBYNAME["Banana, cruda"].tipo')==='S' && w.eval('FOODBYNAME["Pollo, petto senza pelle, crudo"].tipo')==='S' && w.eval('FOODBYNAME["Lenticchie, intere, secche"].tipo')==='S'
       && w.eval('FOOD.filter(function(f){return /^(Pollo|Lenticchie|Riso|Patat).*\\bcott[oae]\\b/.test(f.nome);}).length')>5 && w.eval('FOOD.filter(function(f){return /^(Pollo|Lenticchie|Riso|Patat).*\\bcott[oae]\\b/.test(f.nome);}).every(function(f){return f.tipo==="R";})'), 'banca alimenti: il crudo è «semplice»; pollo, riso, patate e lenticchie cotti sono «ricette»');
    ok(w.eval('FOODBYNAME["Prosciutto cotto di coscia"].tipo')==='S', 'banca alimenti: un salume che si compra già cotto resta «semplice»');
    { const wp=w.eval('(function(){var f=FOODBYNAME["Whey Protein PBN"];return f?{c:f.categoria,t:f.tipo,k:f.per100.kcal,p:f.per100.proteine,g:f.per100.grassi,s:f.per100.saturi,z:f.per100.zuccheri,zz:f.per100.zucch,fi:f.per100.fibre,na:f.per100.sodio}:null;})()');
      ok(wp && wp.c==='Integratori/Proteine in polvere' && wp.t==='I' && wp.k===396 && wp.p===78 && wp.g===5.9 && wp.s===3.6 && wp.z===7.3 && wp.zz===6 && wp.fi===1 && wp.na===160,
        'banca alimenti: Whey Protein PBN nella categoria Integratori, valori per 100 g dall\'etichetta (sale 0,4 g = sodio 160 mg)');
      ok(w.eval('FOOD.filter(function(f){return foodMatch(f,"integratori");}).some(function(f){return f.nome==="Whey Protein PBN";})'), 'banca alimenti: cercando «integratori» si trova la whey'); }
    { w.eval('openFoodPicker("bulk",0)');
      const nTutti=d.querySelector('#modal h3 .pill').textContent;
      d.querySelector('#modal [data-fptipo="R"]').click();
      ok(d.querySelector('#modal h3 .pill').textContent!==nTutti && w.eval('fpTipo')==='R' && [...d.querySelectorAll('#modal .fp-row')].every(tr=>w.eval('FOODBYNAME['+JSON.stringify(tr.dataset.nome)+'].tipo')==='R'), 'selettore alimenti: il filtro «Ricette» mostra solo ricette');
      d.querySelector('#modal [data-fptipo="S"]').click();
      ok([...d.querySelectorAll('#modal .fp-row')].length>0 && [...d.querySelectorAll('#modal .fp-row')].every(tr=>w.eval('FOODBYNAME['+JSON.stringify(tr.dataset.nome)+'].tipo')==='S'), 'selettore alimenti: il filtro «Alimenti semplici» mostra solo quelli');
      d.querySelector('#modal [data-fptipo="I"]').click();
      ok([...new Set([...d.querySelectorAll('#modal .fp-row')].map(tr=>tr.dataset.nome))].join('|')==='Whey Protein PBN' && d.querySelector('#modal .fp-row .fp-ric') && w.eval('foodTipo(FOODBYNAME["Whey Protein PBN"])')==='I', 'selettore alimenti: terza macro categoria «Integratori» con la whey (e il bollino «integratore»; la whey del piano compare anche fra i recenti)');
      w.eval('fpTipo=""; closeModal(); showTab("alimentazione")');
      ok(d.querySelector('#panel-alimentazione .pag__main').getAttribute('data-titolo') === 'Piano alimentare' && d.querySelector('#panel-alimentazione .pag__side').getAttribute('data-titolo') === 'Sintesi del piano',
        'colonne: ogni colonna ha il suo titolo fisso in cima');
      ok(w.eval('Object.keys(TITOLI_PAG).every(function(k){ return RENDERERS[k]; })'), 'colonne: titoli definiti solo per tab che esistono');
      w.eval('fpTipo=""; closeModal(); renderAlimentazione();'); }
    ok(d.querySelector('#panel-alimentazione [data-mealup]')===null && d.querySelectorAll('#panel-alimentazione tr[data-mealrow] .drag-h').length===ord.length, 'alimentazione: niente frecce ▲▼, ogni pasto ha il manico per trascinarlo');
    ok(w.eval('trascinaPasto("bulk", '+JSON.stringify(ord[0])+', '+JSON.stringify(ord[1])+', true)')===true, 'alimentazione: trascina il primo pasto sotto il secondo');
    const ord2=w.eval('(function(){var s=[];(DOC.alimentazione.bulk||[]).forEach(function(r){var m=((r.pasto||"").trim())||"Senza pasto";if(s.indexOf(m)<0)s.push(m);});return s;})()');
    ok(ord2[0]===ord[1] && ord2[1]===ord[0], 'alimentazione: riordino pasti per trascinamento (il primo va sotto il secondo, coi suoi alimenti)');
    ok(w.eval('trascinaPasto("bulk", '+JSON.stringify(ord[0])+', '+JSON.stringify(ord[0])+', true)')===false, 'alimentazione: rilasciare un pasto su sé stesso non cambia nulla');
    w.eval('trascinaPasto("bulk", '+JSON.stringify(ord[0])+', '+JSON.stringify(ord[1])+', false);');
    const ordine = () => w.eval('(function(){var s=[];DOC.alimentazione.bulk.forEach(function(r){var m=((r.pasto||"").trim())||"Senza pasto";if(s.indexOf(m)<0)s.push(m);});return s.join("|");})()');
    ok(ordine()===ord.join('|'), 'alimentazione: riportato sopra, l\'ordine torna quello di partenza');
    { const n=w.eval('DOC.alimentazione.bulk.length');
      w.eval('window.__P0='+JSON.stringify(ord[0])+'; window.__P1='+JSON.stringify(ord[1])+'; window.__i0=DOC.alimentazione.bulk.findIndex(function(r){return (r.pasto||"")===window.__P0;}); window.__el=DOC.alimentazione.bulk[window.__i0];');
      ok(w.eval('trascinaAlimento("bulk", window.__i0, window.__P1, true)')===true && w.eval('DOC.alimentazione.bulk.length')===n && w.eval('window.__el.pasto===window.__P1'), 'alimentazione: un alimento trascinato sulla barra di un altro pasto cambia pasto (nessuna riga persa)');
      w.eval('trascinaAlimento("bulk", DOC.alimentazione.bulk.indexOf(window.__el), DOC.alimentazione.bulk.findIndex(function(r){return (r.pasto||"")===window.__P0;}), false)');
      ok(w.eval('window.__el.pasto===window.__P0 && DOC.alimentazione.bulk.find(function(r){return (r.pasto||"")===window.__P0;})===window.__el') && w.eval('DOC.alimentazione.bulk.length')===n && ordine()===ord.join('|'), 'alimentazione: trascinato sopra un alimento del pasto di partenza torna al suo posto'); } }
  { const nome=w.eval('(DOC.alimentazione.bulk.find(function(r){return r.alimento;})||{}).alimento');
    ok(typeof nome==='string' && nome.length>0, 'alimentazione: un alimento del piano per testare i preferiti');
    w.eval('foodToggleFav('+JSON.stringify(nome)+');');
    ok(w.eval('foodIsFav('+JSON.stringify(nome)+')')===true && w.eval('DOC.alimentazione.fav.indexOf('+JSON.stringify(nome)+')>=0'), 'alimenti preferiti: la stellina aggiunge (DOC.alimentazione.fav)');
    w.eval('openFoodPicker("bulk", 0);');
    ok(d.getElementById('modal').innerHTML.includes('Preferiti') && d.getElementById('modal').innerHTML.includes('Recenti'), 'food picker: gruppi Preferiti e Recenti in cima');
    { const fq=d.getElementById('fp-q'); fq.value='riso secco'; fq.dispatchEvent(new w.Event('input',{bubbles:true})); }
    ok([...d.querySelectorAll('#modal .fp-row')].length>0, 'food picker: ricerca a parole trova risultati');
    w.eval('closeModal(); foodToggleFav('+JSON.stringify(nome)+');'); }
  /* ── 2026-11-13 — Stampa dieta: STESSO motore a blocchi del Report, a schermo intero ── */
  w.eval('DOC.dati_utente.faseAlim="bulk"; renderAlimentazione();');
  ok(d.querySelector('#panel-alimentazione #dieta-pdf-btn') && d.getElementById('dieta-pdf-btn').getAttribute('onclick')==='apriStampaDieta()', 'alimentazione: bottone «Stampa dieta» apre l\'editor');
  d.getElementById('dieta-pdf-btn').click();
  ok(!d.getElementById('dieta-overlay').classList.contains('hidden') && w.eval('repCtx.pre')==='dre', 'stampa dieta: si apre a schermo intero (dre = contesto della dieta)');
  { const sorg=d.getElementById('dre-sorgente');
    ok(sorg.firstElementChild.getAttribute('data-blocco')==='intro' && sorg.lastElementChild.getAttribute('data-blocco')==='totale', 'stampa dieta: blocco intro fisso in cima, totale fisso in fondo');
    ok(sorg.querySelectorAll('[data-blocco]').length>2, 'stampa dieta: un blocco per ogni pasto del piano');
    const pasto=d.querySelector('#dre-sorgente [data-blocco]:not([data-blocco="intro"]):not([data-blocco="totale"])');
    ok(pasto.querySelector('.sec .pill').textContent.includes('kcal'), 'stampa dieta: ogni pasto mostra le sue kcal nel titolo');
    ok(sorg.querySelector('[data-blocco="totale"] .cards'), 'stampa dieta: il totale giornaliero è una scheda di valori, non più una riga di tabella'); }
  ok(d.querySelector('#dre-pagine .pg') && d.querySelector('#dre-pagine').classList.contains('orizzontale'), 'stampa dieta: fogli dell\'anteprima in A4 orizzontale');
  { const pastoK=w.eval('DOC.alimentazione.stampa.bulk.ordine[0]');
    w.eval('document.querySelector(\'#dre-lista [data-selblocco="'+pastoK+'"] [data-rep]\').click()');
    ok(w.eval('DOC.alimentazione.stampa.bulk['+JSON.stringify(pastoK)+']')===false && !d.querySelector('#dre-sorgente [data-blocco="'+pastoK+'"]'), 'stampa dieta: nascondere un pasto lo toglie dal documento (si salva per fase)');
    w.eval('document.querySelector(\'#dre-lista [data-selblocco="'+pastoK+'"] [data-rep]\').click()'); }
  { const ordinePrima=w.eval('DOC.alimentazione.stampa.bulk.ordine.slice()');
    w.eval('repSposta(DOC.alimentazione.stampa.bulk, repUltimo.ordine[1], repUltimo.ordine[0], false)');
    ok(w.eval('DOC.alimentazione.stampa.bulk.ordine[0]')===ordinePrima[1], 'stampa dieta: i pasti si trascinano per riordinarli (stesso meccanismo del Report)');
    ok(w.eval('repCtx.pre')==='dre', 'stampa dieta: dopo aver trascinato un pasto il motore resta sulla dieta (non scivola sul Report)'); }
  /* ── 2026-11-13 — regressione: «✕ Togli riga» (dentro «✎ Modifica testo») chiamava renderReport()
     invece di repCtx.render(), facendo scivolare il motore condiviso sul Report: dopo un solo uso
     qualunque altra interazione nell'editor della dieta (scegliere un blocco, trascinare…) andava
     a vuoto, perché repCtx restava puntato sul Report. Bug segnalato da Marco. ── */
  { const k=w.eval('DOC.alimentazione.stampa.bulk.ordine[0]');
    w.eval('document.querySelector(\'#dre-pagine [data-blocco="'+k+'"]\').click()');
    w.eval('document.getElementById("dre-modifica").click()');
    const righePrima=d.querySelectorAll('#dre-pagine [data-blocco="'+k+'"] tbody tr').length;
    w.eval(`(function(){
      var tr=document.querySelector('#dre-pagine [data-blocco="${k}"] tbody tr');
      var range=document.createRange(); range.selectNodeContents(tr.querySelector('td'));
      var sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    })()`);
    w.eval('document.querySelector(\'[data-repop="riga-via"]\').click()');
    ok(w.eval('repCtx.pre')==='dre', 'stampa dieta: «✕ Togli riga» non fa più scivolare il motore sul Report');
    ok(d.querySelectorAll('#dre-pagine [data-blocco="'+k+'"] tbody tr').length===righePrima-1, 'stampa dieta: «✕ Togli riga» toglie davvero la riga dall\'anteprima');
    w.eval('document.getElementById("dre-fine").click()');
    const pastoAltro=w.eval('DOC.alimentazione.stampa.bulk.ordine[1]');
    w.eval('document.querySelector(\'#dre-pagine [data-blocco="'+pastoAltro+'"]\').click()');
    ok(w.eval('repSel.blocco')===pastoAltro, 'stampa dieta: dopo «✕ Togli riga» l\'editor resta vivo (si può ancora scegliere un altro blocco)'); }
  d.getElementById('dieta-ov-chiudi').click();
  ok(d.getElementById('dieta-overlay').classList.contains('hidden') && d.getElementById('panel-dieta').innerHTML==='', 'stampa dieta: «← Chiudi» nasconde l\'editor e libera la pagina');
  /* ── 2026-11-13 — regressione: nome pasto con spazio (es. «Primo Spuntino») non deve mandare in crash
     l'anteprima (DOMTokenList.add() rifiuta gli spazi in una classe CSS: bug segnalato da Marco) ── */
  { const primaRiga=w.eval('DOC.alimentazione.bulk.find(function(r){return r.alimento;})');
    const pastoOriginale=primaRiga.pasto;
    w.eval('DOC.alimentazione.bulk.find(function(r){return r.alimento;}).pasto="Primo Spuntino";');
    let crashato=false;
    try{ w.eval('renderAlimentazione(); document.getElementById("dieta-pdf-btn").click();'); }
    catch(e){ crashato=true; }
    ok(!crashato && !d.getElementById('dieta-overlay').classList.contains('hidden'), 'stampa dieta: un pasto chiamato «Primo Spuntino» (con spazio) non manda in crash l\'anteprima');
    ok(d.querySelector('#dre-sorgente [data-blocco="Primo Spuntino"]')!==null, 'stampa dieta: il blocco del pasto con lo spazio nel nome resta identificabile (data-blocco)');
    d.getElementById('dieta-ov-chiudi').click();
    w.eval('DOC.alimentazione.bulk.find(function(r){return r.alimento && r.pasto==="Primo Spuntino";}).pasto='+JSON.stringify(pastoOriginale)+'; renderAlimentazione();'); }
  { const land=w.eval('(function(){var p=imagesToPdf([{bytes:new Uint8Array([0,1,2]),w:8,h:8}], true); return Array.from(p).map(function(c){return String.fromCharCode(c);}).join("");})()');
    const port=w.eval('(function(){var p=imagesToPdf([{bytes:new Uint8Array([0,1,2]),w:8,h:8}]); return Array.from(p).map(function(c){return String.fromCharCode(c);}).join("");})()');
    ok(land.includes('841.8898 595.2756'), 'imagesToPdf(landscape): MediaBox A4 orizzontale (841.8898 × 595.2756)');
    ok(port.includes('595.2756 841.8898'), 'imagesToPdf(default): MediaBox A4 verticale invariato (Report)'); }
  w.eval('showTab("report")');
  ok(d.getElementById('panel-report').innerHTML.includes('Dieta × allenamento'), 'report con la sezione Dieta × allenamento');
  /* il Report include la sezione Cardio (il template ha 75 sedute) + la casella sezione */
  ok(d.querySelector('#panel-report .rep-doc').innerHTML.includes('Cardio · attività e carico interno'), 'report: sezione Cardio (attività + sRPE) presente');
  ok(d.querySelector('#panel-report [data-rep="cardio"]') !== null, 'report: casella sezione Cardio nei toggle');
  /* riordino sezioni del report (richiesta Marco): ordine di default + frecce + applicazione + handler */
  let repDoc = d.querySelector('#panel-report .rep-doc').innerHTML;
  ok(repDoc.indexOf('composizione corporea') > 0 && repDoc.indexOf('Note del coach') > repDoc.indexOf('composizione corporea'), 'report: ordine di default (Profilo prima di Note)');
  ok(d.querySelector('#panel-report [data-repmove]') !== null, 'report: frecce di riordino ▲▼ presenti');
  w.eval('DOC.dati_utente.report.ordine=["note","profilo","riepilogo","scheda","andamento","progressione","record","alimentazione","analisi"]; renderReport();');
  repDoc = d.querySelector('#panel-report .rep-doc').innerHTML;
  ok(repDoc.indexOf('Note del coach') < repDoc.indexOf('composizione corporea'), 'report: ordine personalizzato applicato (Note prima di Profilo)');
  d.querySelector('#panel-report [data-repmove="profilo"][data-dir="-1"]').click(); await settle(10);  /* il riordino è asincrono: prima controlla se il report era ritoccato a mano */
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
  ok(d.querySelectorAll('#panel-profilo [data-pexs]').length === 0 && d.querySelectorAll('#panel-profilo [data-prin]').length === 0, 'niente più pulsanti di scambio della scheda nella riga dei profili (la scheda è collegata al telefono)');
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
  ok(d.querySelector('#panel-esercizi .pag__main').innerHTML.indexOf('Panca piana con bilanciere - presa media') < 0, 'tendine chiuse di default (esercizi nascosti nella tabella del catalogo)');
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
  /* ricerca anche col nome INGLESE: capita di ricordare un esercizio in inglese.
     I risultati restano in italiano — l'inglese serve solo a trovarli. */
  { const trovaPanca = q => w.eval('DOC.esercizi.some(function(e){return e.nome==="Panca piana con bilanciere - presa media" && exMatch(e,' + JSON.stringify(q) + ');})');
    ok(trovaPanca('bench press'), 'ricerca EN: «bench press» trova la panca piana col bilanciere');
    ok(trovaPanca('barbell bench'), 'ricerca EN: «barbell bench» la trova (nome inglese del catalogo)');
    ok(trovaPanca('flat bench'), 'ricerca EN: «flat bench» la trova via sinonimo flat→piana (il catalogo inglese non dice «flat»)');
    ok(w.eval('DOC.esercizi.some(function(e){return e.nome==="Stacco rumeno" && exMatch(e,"romanian deadlift");})'),
       'ricerca EN: «romanian deadlift» trova «Stacco rumeno»');
    ok(!trovaPanca('bench squat'), 'ricerca EN: servono TUTTE le parole (bench squat non la trova)');
    /* nessuna regressione sull\'italiano: stesso numero di risultati di prima */
    ok(w.eval('DOC.esercizi.filter(function(e){return exMatch(e,"panca piana bilanciere");}).length') === 3,
       'ricerca IT: «panca piana bilanciere» resta sui suoi 3 risultati (i sinonimi non allargano l\'italiano)');
    w.eval('exFilt="bench press"; renderEsercizi();');
    const h = d.getElementById('panel-esercizi').innerHTML;
    ok(h.includes('Panca piana con bilanciere') && !h.includes('Barbell Bench Press'),
       'ricerca EN: in elenco compare il nome ITALIANO, non quello inglese'); }
  w.eval('exFilt=""; renderEsercizi();');
  /* ── editor esercizio: aggiorna invece di sostituire, muscoli a chip, tipo da elenco,
        fattore con limiti, duplica ── */
  { const N = 'Panca piana con bilanciere - presa media';
    const prima = JSON.parse(w.eval('JSON.stringify(esLookup(' + JSON.stringify(N) + '))'));
    w.eval('exEdit(' + JSON.stringify(N) + ')');
    ok(d.getElementById('ex-tipo') && d.getElementById('ex-tipo').tagName === 'SELECT' &&
       [...d.querySelectorAll('#ex-tipo option')].some(o => o.value === 'Multi-articolare') && d.getElementById('ex-tipo').value === 'Multi-articolare',
       'editor: Tipo è un elenco, con il valore attuale selezionato');
    ok(d.querySelectorAll('#ex-muscoli .mchip').length === 17 && d.querySelector('#ex-muscoli .mchip.is-p[data-m="pettorali"]') !== null &&
       d.querySelector('#ex-muscoli .mchip.is-s[data-m="tricipiti"]') !== null,
       'editor: 17 chip dei muscoli, con primari e secondari dell\'esercizio già segnati');
    ok(d.getElementById('ex-target') === null && d.getElementById('ex-target-anteprima').textContent.includes('Pettorali'),
       'editor: via il target a testo libero, al suo posto l\'anteprima derivata dai muscoli');
    ok(d.getElementById('ex-sotto').getAttribute('list') === 'ex-sotto-list' && d.querySelectorAll('#ex-sotto-list option').length > 5,
       'editor: la sottocategoria propone quelle esistenti mentre si digita');
    ok(d.getElementById('ex-dup') !== null, 'editor: c\'è il pulsante ⧉ Duplica');
    /* Salva senza toccare nulla: NON deve perdere i campi che il form non mostra */
    d.getElementById('ex-ok').click();
    const dopo = JSON.parse(w.eval('JSON.stringify(esLookup(' + JSON.stringify(N) + '))'));
    const persi = Object.keys(prima).filter(k => !(k in dopo));
    ok(persi.length === 0, 'editor: Salva senza modifiche NON perde nessun campo (prima si perdevano: ' + ['istruzioni', 'livello', 'categoria', 'muscoli…'].join(', ') + ')');
    ok(JSON.stringify(dopo.muscoli_primari) === JSON.stringify(prima.muscoli_primari) && JSON.stringify(dopo.muscoli_secondari) === JSON.stringify(prima.muscoli_secondari) &&
       JSON.stringify(dopo.istruzioni) === JSON.stringify(prima.istruzioni),
       'editor: muscoli e istruzioni identici a prima del salvataggio');
    ok(w.eval('JSON.stringify(quoteGruppi(' + JSON.stringify(N) + '))') === '{"Pettorali":1,"Spalle":0.5,"Braccia":0.5}',
       'editor: il conteggio del Bilanciamento resta intatto dopo un salvataggio');
    /* chip a tre stati: primario → secondario → nessuno */
    w.eval('exEdit(' + JSON.stringify(N) + ')');
    const chip = d.querySelector('#ex-muscoli .mchip[data-m="pettorali"]');
    chip.click(); ok(chip.classList.contains('is-s') && !chip.classList.contains('is-p'), 'chip muscolo: primario → secondario');
    chip.click(); ok(!chip.classList.contains('is-s') && !chip.classList.contains('is-p'), 'chip muscolo: secondario → nessuno');
    chip.click(); ok(chip.classList.contains('is-p'), 'chip muscolo: nessuno → primario');
    w.eval('closeModal()');
    /* validazioni: niente primario, fattore fuori limite */
    w.eval('exEdit("")');
    d.getElementById('ex-nome').value = 'Prova senza muscoli';
    d.getElementById('ex-ok').click();
    ok(!d.getElementById('ex-err').hidden && d.getElementById('ex-err').textContent.includes('primario') &&
       !w.eval('DOC.esercizi.some(function(e){return e.nome==="Prova senza muscoli";})'),
       'editor: senza un muscolo primario NON salva e lo dice nel form (niente alert)');
    d.querySelector('#ex-muscoli .mchip[data-m="bicipiti"]').click();
    d.getElementById('ex-fatt').value = '15';
    d.getElementById('ex-ok').click();
    ok(!d.getElementById('ex-err').hidden && d.getElementById('ex-err').textContent.includes('Fattore') &&
       !w.eval('DOC.esercizi.some(function(e){return e.nome==="Prova senza muscoli";})'),
       'editor: fattore 15 rifiutato (limite 0–2): un errore di battitura non gonfia il TL per sempre');
    d.getElementById('ex-fatt').value = '0.7';
    d.getElementById('ex-ok').click();
    const nuovo = JSON.parse(w.eval('JSON.stringify(esLookup("Prova senza muscoli")||null)'));
    ok(nuovo && nuovo.custom === true && JSON.stringify(nuovo.muscoli_primari) === '["bicipiti"]' && nuovo.target === 'Bicipiti' && nuovo.fattore === 0.7,
       'editor: esercizio nuovo salvato con muscoli, target derivato, fattore e custom:true');
    /* duplica: copia integrale, originale intatto */
    const nPrima = w.eval('DOC.esercizi.length');
    w.eval('exEdit(' + JSON.stringify(N) + ',{duplica:true})');
    ok(d.querySelector('#modal h3').textContent.includes('Duplica') && d.getElementById('ex-nome').value === N + ' (copia)' &&
       d.querySelector('#ex-muscoli .mchip.is-p[data-m="pettorali"]') !== null,
       'duplica: editor in modalità nuovo, nome «… (copia)», muscoli già copiati');
    d.getElementById('ex-nome').value = 'Panca piana con bilanciere - presa mediissima';
    d.getElementById('ex-ok').click();
    const copia = JSON.parse(w.eval('JSON.stringify(esLookup("Panca piana con bilanciere - presa mediissima")||null)'));
    ok(copia && copia.custom === true && JSON.stringify(copia.muscoli_secondari) === JSON.stringify(prima.muscoli_secondari) &&
       JSON.stringify(copia.istruzioni) === JSON.stringify(prima.istruzioni) && w.eval('DOC.esercizi.length') === nPrima + 1,
       'duplica: la copia porta con sé muscoli e istruzioni ed è un esercizio in più');
    ok(JSON.stringify(w.eval('JSON.stringify(esLookup(' + JSON.stringify(N) + '))')) === JSON.stringify(JSON.stringify(dopo)),
       'duplica: l\'originale è rimasto identico');
    /* eliminazione con conferma in stile app */
    w.eval('exEdit("Prova senza muscoli")');
    d.getElementById('ex-del').click();
    ok(d.getElementById('cc-si') !== null && d.getElementById('cc-no') !== null, 'editor: Elimina chiede conferma in stile app (niente confirm() di sistema)');
    d.getElementById('cc-si').click();
    ok(!w.eval('DOC.esercizi.some(function(e){return e.nome==="Prova senza muscoli";})'), 'editor: dopo la conferma l\'esercizio è eliminato');
    w.eval('DOC.esercizi=DOC.esercizi.filter(function(e){return e.nome!=="Panca piana con bilanciere - presa mediissima";}); rebuildEs(); renderEsercizi();');
  }
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
  ok(d.getElementById('exp-list').innerHTML.includes('Recenti'), 'picker: gruppo «Recenti» a query vuota (dallo storico)');
  { const star=d.querySelector('#exp-list .exp-star'), nome=star.dataset.fav; star.click();
    ok(w.eval('!!(esLookup('+JSON.stringify(nome)+')||{}).fav'), 'picker: la stellina aggiunge l\'esercizio ai preferiti (su catalogo)');
    ok(d.getElementById('exp-list').innerHTML.includes('Preferiti'), 'picker: l\'esercizio compare nel gruppo «Preferiti»');
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
  { const p=w.eval('parseAttivitaCardio(window.__tcx)'); ok(p&&p.tipo==='Corsa'&&p.durata===30&&p.fcMedia===160&&p.fcPicco===170&&p.fcMax===''&&p.distanza===5&&p.quota===60, 'import TCX: tipo/durata/FC media/FC max/distanza/D+ estratti'); }
  const gpx='<?xml version="1.0"?><gpx><trk><type>cycling</type><trkseg><trkpt lat="45.00" lon="9.00"><time>2026-06-13T08:00:00Z</time><extensions><gpxtpx:hr xmlns:gpxtpx="u">120</gpxtpx:hr></extensions></trkpt><trkpt lat="45.00" lon="9.00"><time>2026-06-13T08:20:00Z</time><extensions><gpxtpx:hr xmlns:gpxtpx="u">140</gpxtpx:hr></extensions></trkpt></trkseg></trk></gpx>';
  w.eval('window.__gpx='+JSON.stringify(gpx));
  { const g=w.eval('parseAttivitaCardio(window.__gpx)'); ok(g&&g.tipo==='Bici'&&g.durata===20&&g.fcMedia===130&&g.fcPicco===140&&g.fcMax==='', 'import GPX: tipo/durata/FC dalla traccia hr'); }
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
    ok(p && p.tipo==='Corsa' && p.durata===40 && p.distanza===8 && p.fcMedia===150 && p.fcPicco===170 && p.fcMax==='' && p.quota===60 && p.data==='2026-06-12', 'import FIT: messaggio session estratto (durata/distanza/FC/D+/sport/data)');
  }
  ok(w.eval('parseFIT(new Uint8Array([1,2,3]))')===null, 'import FIT: file non valido → null');
  w.eval('showTab("cardio")');
  ok(d.getElementById('cardio-imp')!==null, 'tab Cardio: input per importare .tcx/.gpx');
  w.eval('cardioModal(-1, parseAttivitaCardio(window.__tcx))');
  ok(d.getElementById('c-tipo').value==='Corsa' && +d.getElementById('c-min').value===30 && +d.getElementById('c-fc').value===160 && d.getElementById('c-fcmax').value==='' && d.getElementById('modal').textContent.includes('170'), 'import: modale precompilato coi dati del file (RPE da aggiungere; il picco è mostrato, non usato come FC max)');
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
    /* il profilo dimostrativo ha ogni settimana etichettata: per la prova se ne aggiunge una vecchia senza set */
    ok(w.eval('senzaEtichetta()') === false && (w.eval('DOC.storico.push({scheda:202703,esercizio:"Panca piana con bilanciere - presa media",seduta:1,macro:"Pettorali",serie:3,rip:8,peso:60,rir:null,test:false}); 1'), w.eval('senzaEtichetta()')) === true,
       'Progressi/filtro: rileva le settimane vecchie senza etichetta (avviso all\'utente)');
    w.eval('DOC.storico.pop()');
    w.eval('progSetSet("Palestra"); showTab("progressi");');
    ok(d.getElementById('prog-set') !== null && d.getElementById('prog-set').value === 'Palestra', 'Progressi/filtro: selettore in pagina con il set attivo selezionato');
    d.getElementById('prog-set').click();
    ok(d.querySelector('#tnd-pop .tnd-testa[data-tnd-v="__tutti__"]') !== null && d.getElementById('tnd-pop').textContent.includes('Tutto il percorso'), 'Progressi/filtro: tra le scelte del menù c\'è «Tutto il percorso»');
    w.eval('tendinaChiudi(false)');
    /* i MASSIMALI non seguono il filtro: un record è un record (richiesta di Marco) */
    { const valori=[...d.querySelectorAll('#panel-progressi .pr-card .pr-val')].map(e=>e.textContent.trim());
      const conDati=valori.filter(v=>v && !v.startsWith('—')).length;
      ok(valori.length>0 && conDati===valori.length, 'Progressi/record: i massimali restano tutti valorizzati anche filtrando un Training Set ('+conDati+'/'+valori.length+')');
      ok(d.getElementById('panel-progressi').textContent.includes('su tutto il percorso'), 'Progressi/record: avvisa che i record sono su tutto il percorso');
      /* confronto diretto: card = massimo di TUTTO lo storico, non del solo set filtrato */
      const attesoPrimo=w.eval('(function(){var r=realMax(MAINLIFTS[0].nome);return r?nf(r.peso,0):"—";})()');
      ok(valori[0].indexOf(attesoPrimo)===0, 'Progressi/record: il valore mostrato è il massimo di tutto lo storico ('+attesoPrimo+')'); }
    /* il filtro scelto si ricorda: vive nel profilo, non solo in memoria */
    w.eval('progSetSet("Casa");');
    ok(w.eval('DOC.dati_utente.progSet') === 'Casa', 'Progressi/filtro: la scelta finisce nel profilo (dati_utente)');
    ok(w.eval('progSetGet()') === 'Casa', 'Progressi/filtro: al rientro riparte dall\'ultimo scelto, non da «Tutto il percorso»');
    ok(w.eval('typeof _progSet') === 'undefined', 'Progressi/filtro: nessuna copia in memoria (si legge sempre dal profilo attivo)');
    /* bug 2026-09-29: cambiando profilo si vedeva il filtro dell'ULTIMO profilo aperto */
    { const salvato = w.eval('JSON.stringify(DOC.dati_utente)');
      w.eval('DOC.dati_utente=JSON.parse(JSON.stringify(DOC.dati_utente)); DOC.dati_utente.progSet=undefined;');   /* simula un altro profilo, senza scelta */
      ok(w.eval('progSetGet()') === '__tutti__', 'Progressi/filtro: un profilo che non ha scelto nulla parte da «Tutto il percorso», non dal filtro del profilo precedente');
      w.eval('DOC.dati_utente=' + salvato + ';');
      ok(w.eval('progSetGet()') === 'Casa', 'Progressi/filtro: tornando al profilo di prima ritrova la SUA scelta'); }
    w.eval('DOC.dati_utente.progSet="SetSparito";');
    ok(w.eval('progSetGet()') === '__tutti__', 'Progressi/filtro: se il Training Set salvato non esiste più si torna a «Tutto il percorso»');
    w.eval('progSetSet("__tutti__"); showTab("progressi");');
    w.eval('progSetSet("__tutti__"); DOC.storico.length=' + stoPre + '; showTab("progressi");'); }
  w.eval('showTab("esercizi")');
  /* v1.0.66: il tab Profilo mostra il nome del profilo attivo */
  ok(d.querySelector('.tab[data-tab="profilo"]').textContent.includes('Atleta Template'), 'tab Profilo = nome del profilo attivo');
  /* v1.0.85: scambio scheda trainer ↔ cliente via APP CLIENTE (pagina in app-android/web/, impacchettata nell'APK) + file JSON */
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
  ok(w.eval('typeof chiediModalitaScheda') === 'undefined' && w.eval('typeof esportaSchedaCliente') === 'undefined' && w.eval('typeof importaRientroFile') === 'undefined', 'niente più export della scheda né import del rientro come file');
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
  const PWA = path.join(ROOT, 'app-android', 'web', 'index.html');
  ok(fs.existsSync(PWA) && fs.existsSync(path.join(ROOT, 'app-android', 'web', 'manifest.webmanifest')) && fs.existsSync(path.join(ROOT, 'app-android', 'web', 'sw.js')), 'app cliente: index.html + manifest + service worker presenti in docs/app/');
  const giorniCli = [...new Set(schedaCli.righe.map(r => r.giorno))];
  const bozzaKey = 'tms-bozza-template-' + schedaCli.esportata;
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
    await settle(20);
    ok(sd.getElementById('barra-ind').hidden === false && sd.getElementById('barra-ind-t').textContent === 'Menu' && sd.getElementById('barra-titolo').textContent === 'Alimentazione' && sd.getElementById('barra-marchio').hidden === true,
       'app cliente: barra in alto con «‹ Menu» e il titolo della pagina Alimentazione');
    sd.getElementById('barra-ind').click();
    /* scheda: menu → giorni → giorno, con bottoni di ritorno evidenti */
    sd.getElementById('vai-scheda').click();
    ok(sd.getElementById('home').hidden === false && sd.querySelectorAll('.day-card').length === giorniCli.length && sd.querySelectorAll('.day-page').length === giorniCli.length, 'app cliente: menu → Scheda: una card e una pagina per ogni giorno');
    ok(sd.getElementById('s-0') !== null && +sd.getElementById('s-0').value === schedaCli.righe[0].serie, 'app cliente: campi precompilati col previsto del coach');
    ok(sd.getElementById('rir-0') !== null && sd.getElementById('rir-0').value === '', 'app cliente: RIR NON precompilato (si inserisce dopo l\'allenamento)');
    await settle(20);
    ok(sd.getElementById('barra-titolo').textContent === 'Scheda allenamento' && sd.getElementById('barra-ind-t').textContent === 'Menu', 'app cliente: nella lista dei giorni la barra in alto riporta al menu');
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
    /* quello che il telefono manda al PC (scheda collegata): i campi così come sono */
    { const loc = JSON.parse(sub.window.eval('JSON.stringify(colLocale())'));
      ok(loc.righe.length === schedaCli.righe.length && loc.righe[0].serie === 5 && loc.righe[0].note === 'fatto tutto' && loc.righe[0].rir === null && loc.righe[0].uid,
         'app cliente: la scheda vista dal telefono riflette ciò che è stato scritto (ogni riga con un id suo)');
      ok(!loc.righe.some(r => /Allungamento/.test(r.esercizio)), 'app cliente v2: il riscaldamento non entra (solo informativo)'); }
    /* avanzamento della seduta + spunta sull'esercizio compilato */
    ok(sd.getElementById('ck-0').textContent === '✔' && /1\//.test(sd.getElementById('plab-0').textContent), 'app cliente v2: spunta ✔ sull\'esercizio e avanzamento «1/n fatti»');
    ok(sd.getElementById('prog-0').style.width !== '' && sd.getElementById('prog-0').style.width !== '0%', 'app cliente v2: la barra di avanzamento si riempie');
    ok(!sd.getElementById('invia') && !sd.getElementById('riepilogo'), 'app cliente: niente più «Crea il file per il coach» né riepilogo per il file');
    sd.getElementById('barra-ind').click(); await settle(60); sd.getElementById('vai-scheda').click();
    /* v2.2: il tasto INDIETRO del telefono risale nell'app invece di chiuderla */
    sd.querySelector('.day-card').click();                       /* entra nel giorno */
    ok(sd.getElementById('day-0').hidden === false, 'app cliente v2.2: si entra nel giorno');
    await settle(20);
    ok(sd.getElementById('barra-ind-t').textContent === 'Giorni' && sd.getElementById('barra-titolo').textContent === sd.querySelector('.day-card .day-name').textContent && sd.body.dataset.schermo === 'giorno',
       'app cliente: nel giorno la barra in alto ha «‹ Giorni» e il nome del giorno');
    sub.window.history.back();                                    /* = tasto indietro del telefono */
    await settle(60);
    ok(sd.getElementById('home').hidden === false && sd.getElementById('day-0').hidden === true, 'app cliente v2.2: il tasto indietro torna alla lista dei giorni (non chiude l\'app)');
    sub.window.history.back();
    await settle(60);
    ok(sd.getElementById('menu').hidden === false, 'app cliente v2.2: un altro indietro torna al menu');
    ok(sub.window.eval('risali()') === false, 'app cliente v2.2: al menu non c\'è più nulla sopra (da lì l\'app può chiudersi)');
    /* v2.2: sezione FOTO — tre riquadri (fronte/lato/retro) che vanno al PC */
    ok(sd.getElementById('vai-foto') !== null && sd.getElementById('foto') !== null, 'app cliente foto: card nel menu + schermata dedicata');
    sd.getElementById('vai-foto').click();
    await settle(30);
    ok(sd.getElementById('foto').hidden === false && sd.querySelectorAll('#foto-grid .foto-box').length === 3, 'app cliente foto: tre riquadri (fronte/lato/retro)');
    ok([...sd.querySelectorAll('#foto-grid .foto-box')].map(b=>b.dataset.foto).join(',') === 'fronte,lato,retro', 'app cliente foto: i tag sono quelli che il TMS si aspetta');
    ok(sd.getElementById('foto-file') !== null && sd.getElementById('foto-file').accept === 'image/*' && !sd.getElementById('foto-file').hasAttribute('capture'),
       'app cliente foto: il selettore accetta immagini e lascia scegliere fotocamera o galleria');
    /* simula due scatti già ridimensionati */
    sub.window.eval('FOTO={fronte:{img:"data:image/jpeg;base64,AAAA",data:"2026-08-17"},retro:{img:"data:image/jpeg;base64,BBBB",data:"2026-08-17"}}; renderFoto();');
    ok(sd.querySelectorAll('#foto-grid .foto-box.pieno').length === 2 && sd.querySelectorAll('#foto-grid .foto-x').length === 2, 'app cliente foto: i riquadri pieni mostrano l\'anteprima e il tasto per togliere');
    ok(/2 /.test(sd.getElementById('meta-foto').textContent), 'app cliente foto: il menu conta le foto scattate');
    ok(/arrivano da sole sul PC/.test(sd.getElementById('foto').textContent), 'app cliente foto: le foto vanno da sole al PC (niente file)');
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
    /* app appena installata, senza scheda: schermata di benvenuto che porta al collegamento col PC */
    const sub = await JSDOM.fromFile(PWA, { runScripts: 'dangerously', url: 'https://tms.test/app/index.html' });
    await settle(300);
    const sd = sub.window.document;
    ok(sd.getElementById('benvenuto').hidden === false && sd.getElementById('file-scheda') === null && sd.getElementById('ben-solo-apk').hidden === false, 'app cliente: senza scheda mostra il benvenuto (nel browser: il collegamento c\'è nell\'app Android)');
    ok(sub.window.eval('LANGP') === 'en' && (sd.querySelector('#benvenuto [data-i18n]')||{}).textContent === 'Welcome', 'app cliente EN: lingua auto-rilevata + benvenuto tradotto');
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
    ok(sub.window.eval('colLocale().sedute[GIORNI[0]].fatto') === true, 'app cliente senza RPE: la spunta parte verso il PC come «giorno fatto»');
    box.checked = false; box.dispatchEvent(new sub.window.Event('input', { bubbles: true }));
    ok(sd.getElementById('stato-0').textContent === '', 'app cliente senza RPE: TOGLIERE la spunta rimuove il completato (bug corretto)');
    ok(sub.window.eval('colLocale().sedute[GIORNI[0]].fatto') === false, 'app cliente senza RPE: tolta la spunta, il giorno non è più «fatto»');
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
    /* ── validazione sul catalogo del coach (v2.5): gli esercizi aggiunti devono esistere nel suo TMS ── */
    ok(Array.isArray(schedaCli.catalogo) && schedaCli.catalogo.length > 500 && schedaCli.catalogo.every(e => e.n && 'g' in e),
       'export modificabile: il file porta il catalogo del coach (' + (schedaCli.catalogo || []).length + ' esercizi, nome + gruppo)');
    ok(!schedaCli.catalogo.some(e => /^(Corsa|Cyclette|Ellittica)/.test(e.n)) && !schedaCli.catalogo.some(e => /^Allungamento/.test(e.n)),
       'export modificabile: nel catalogo allegato niente cardio né stretching (non vanno nella scheda)');
    ok(w.eval('costruisciSchedaJSON({}).catalogo') === undefined, 'export FISSA: nessun catalogo allegato (il cliente non può aggiungere esercizi)');
    { sd.querySelector('[data-add="0"]').click();
      const rid2 = sw.eval('WROWS[WROWS.length-1].rid');
      const inp = sd.getElementById('ename-' + rid2);
      ok(sd.getElementById('sugg-' + rid2) !== null && /catalogo del coach/.test(sd.getElementById('sugg-' + rid2).textContent),
         'app cliente/catalogo: sotto il nome c\'è la ricerca sul catalogo del coach');
      inp.value = 'panca pia'; inp.dispatchEvent(new sub.window.Event('input', { bubbles: true }));
      const picks = [...sd.querySelectorAll('#sugg-' + rid2 + ' [data-pick]')].map(b => b.getAttribute('data-pick'));
      ok(picks.includes('Panca piana con bilanciere - presa media') && picks.length <= 14,
         'app cliente/catalogo: «panca pia» propone la panca piana col bilanciere (max 14 voci)');
      /* nome inventato → rifiutato, con messaggio, e la riga non cambia */
      inp.value = 'Esercizio inventato'; inp.dispatchEvent(new sub.window.Event('input', { bubbles: true }));
      sd.getElementById('savedit-' + rid2).click();
      ok(sw.eval('WROWS.find(r=>r.rid===' + rid2 + ').esercizio') === '' && sd.getElementById('eerr-' + rid2) !== null && sd.getElementById('eerr-' + rid2).hidden === false,
         'app cliente/catalogo: un nome che il coach NON ha viene rifiutato, con avviso nel pannello');
      /* tocco su un suggerimento → il nome entra esatto */
      inp.value = 'stacco rume'; inp.dispatchEvent(new sub.window.Event('input', { bubbles: true }));
      const b = sd.querySelector('#sugg-' + rid2 + ' [data-pick="Stacco rumeno"]');
      ok(b !== null, 'app cliente/catalogo: «stacco rume» propone «Stacco rumeno»');
      b.click();
      ok(inp.value === 'Stacco rumeno', 'app cliente/catalogo: il tocco sul suggerimento compila il nome');
      /* maiuscole diverse → si salva il nome ESATTO del catalogo (è la chiave dei dati del coach) */
      inp.value = 'stacco RUMENO';
      sd.getElementById('savedit-' + rid2).click();
      ok(sw.eval('WROWS.find(r=>r.rid===' + rid2 + ').esercizio') === 'Stacco rumeno', 'app cliente/catalogo: salvato col nome esatto del catalogo anche se scritto diverso');
      sw.confirm = () => true; sd.querySelector('[data-del="' + rid2 + '"]').click(); }
    sd.getElementById('s-' + newRid).value = '3';
    sd.getElementById('s-' + newRid).dispatchEvent(new sub.window.Event('input', { bubbles: true }));
    const loc2 = JSON.parse(sw.eval('JSON.stringify(colLocale())'));
    ok(loc2.righe.length === before + 1 && loc2.righe.some(r => r.esercizio === 'Plank'), 'app cliente/esercizi: l\'esercizio aggiunto parte verso il PC');
    ok(loc2.righe[0].test === true, 'app cliente/1RM: il flag test parte verso il PC (★ sul 1° esercizio)');
    sw.eval('WROWS[0].rest="2:15";');
    ok(JSON.parse(sw.eval('JSON.stringify(colLocale())')).righe[0].rest === '2:15', 'app cliente/timer: il recupero (rest) parte verso il PC');
    const bozza2 = JSON.parse(sw.localStorage.getItem(bozzaKey) || '{}');
    ok(Array.isArray(bozza2._wrows) && bozza2._wrows.some(r => r.esercizio === 'Plank') && bozza2._wrows[0].test === true, 'app cliente: la bozza salva la STRUTTURA (_wrows: esercizio aggiunto + ★) → sopravvive al riavvio');
    /* elimina il primo esercizio (confirm stubbato) */
    sw.confirm = () => true;
    const firstRid = sw.eval('WROWS[0].rid');
    sd.querySelector('[data-del="' + firstRid + '"]').click();
    ok(sw.eval('WROWS.some(r=>r.rid===' + firstRid + ')') === false && sw.eval('WROWS.length') === before, 'app cliente/esercizi: 🗑 elimina la riga (dopo +1/−1 il totale torna all\'originale)');
    sub.window.close();
  }
  /* 25/11/2026 (richieste di Marco per l'APK): in alto solo «Ciao Nome», timer contato dall'ora di fine,
     andamento delle pesate come in borsa, dieta seguita con la domanda della sera e il calendario */
  {
    const sub = await JSDOM.fromFile(PWA, { runScripts: 'dangerously', url: 'https://tms.test/app/index.html', pretendToBeVisual: true,
      beforeParse(win){ win.localStorage.setItem('tms-scheda-lang','it'); win.localStorage.setItem('tms-scheda-corrente', JSON.stringify(schedaCli)); } });
    await settle(400);
    const sd = sub.window.document, sw = sub.window;
    ok(sd.getElementById('ciao-t').textContent === 'Ciao Atleta Template' && sd.getElementById('sub').hidden === true, 'app cliente: in alto solo «Ciao Nome», senza la riga del taccuino');
    ok(!sd.getElementById('col-home'), 'app cliente: nella scheda niente spiegazione su come si salva (lo fa il coach sul PC)');
    /* timer: il tempo viene dall'ora di fine, anche se la pagina è rimasta ferma (app in secondo piano) */
    sw.eval('startTimer("Panca", 90); timerFine -= 61000; timerTick();');
    ok(sd.getElementById('t-time').textContent === '0:29', 'app cliente/timer: dopo un minuto «fermo» in secondo piano segna il tempo giusto (0:29), non quello dei tic');
    sw.eval('timerToggle(); timerFine = 0;');
    ok(sw.eval('timerPaused') === true && sw.eval('timerResta()') === 29, 'app cliente/timer: in pausa il tempo resta fermo');
    sw.eval('timerToggle(); timerAdjust(15);');
    ok(sd.getElementById('t-time').textContent === '0:44' && Math.abs(sw.eval('timerFine - Date.now()') - 44000) < 1500, 'app cliente/timer: ripreso e +15 s, l\'ora di fine si sposta (0:44)');
    sw.eval('timerFine = Date.now() - 1; timerTick();');
    ok(sd.getElementById('tbar').classList.contains('done') && sd.getElementById('t-time').textContent === '0:00' && sw.eval('timerId') === null, 'app cliente/timer: passata l\'ora di fine il recupero è finito');
    sw.eval('timerClose()');
    /* andamento delle pesate: una al giorno, variazione in kg e %, verde/rosso secondo la fase */
    sw.eval(`(function(){ const d=k=>{ const x=new Date(); x.setDate(x.getDate()-k); return dataLoc(x); };
      PESATE=[[9,80.0],[6,80.6],[3,80.2],[1,80.0],[0,80.4]].map(([k,p])=>({id:d(k)+'T07:00:00|'+p, data:d(k), ora:'07:00:00', peso:p}));
      PESATE.push({id:d(0)+'T20:00:00|81', data:d(0), ora:'20:00:00', peso:81}); renderBil(); })()`);
    const and = () => sd.getElementById('bil-and');
    ok(/Andamento del peso/.test(and().textContent) && and().querySelector('.and-peso').textContent === '80,4 kg', 'app cliente/bilancia: andamento del peso con l\'ultima pesata che conta (la prima del giorno)');
    { const pill = and().querySelector('.and-pill');
      ok(pill.textContent === '▲ +0,4 kg · +0,5 %' && /rgba\(47, ?125, ?79/.test(pill.getAttribute('style')), 'app cliente/bilancia: variazione dal giorno prima in kg e % (in massa la salita è verde)'); }
    ok(and().querySelectorAll('.and-sf i').length === 4 && and().querySelector('svg.bil-graf path') !== null, 'app cliente/bilancia: grafico ad area e una sfumatura per ogni variazione (4 nel mese)');
    ok(/Dal .*: ▲ \+0,4 kg · \+0,5 %/.test(and().querySelector('.and-somma').textContent), 'app cliente/bilancia: variazione dell\'intero periodo, come in borsa');
    and().querySelector('[data-bp="7"]').click();
    ok(and().querySelector('[data-bp="7"]').classList.contains('on') && and().querySelectorAll('.and-sf i').length === 3, 'app cliente/bilancia: «7 g» restringe il grafico all\'ultima settimana');
    ok([...sd.querySelectorAll('#bil-lista .and-mini')].map(e => e.textContent).join('|') === '+0,4|−0,2|−0,4|+0,6', 'app cliente/bilancia: nella lista ogni pesata che conta ha la variazione dal giorno prima');
    sw.eval('SCHEDA.dieta.fase="cut"; renderBil();');
    ok(/rgba\(176, ?32, ?32/.test(and().querySelector('.and-pill').getAttribute('style')) && /definizione/.test(and().textContent), 'app cliente/bilancia: in definizione la stessa salita è rossa');
    sw.eval('SCHEDA.dieta.fase="bulk"; PESATE=PESATE.slice(-1); renderBil();');
    ok(and().innerHTML === '', 'app cliente/bilancia: con un giorno solo di pesate niente andamento');
    /* dieta seguita: la domanda arriva dall'ora dei promemoria, il giorno prima del primo piano non si chiede */
    sw.eval('localStorage.removeItem("tms-dieta-template"); localStorage.removeItem("tms-avvisi");');
    ok(sw.eval('dietaDaChiedere(new Date(2026,10,25,20,0))') === null, 'dieta: prima delle 21 del primo giorno non si chiede niente (ieri non c\'era il piano)');
    ok(sw.eval('dietaDaChiedere(new Date(2026,10,25,21,5))') === '2026-11-25', 'dieta: dalle 21 chiede di oggi');
    sw.eval('dietaSegna("2026-11-25","si")');
    ok(sw.eval('dietaDaChiedere(new Date(2026,10,25,22,0))') === null && sw.eval('dietaDaChiedere(new Date(2026,10,26,10,0))') === null, 'dieta: segnata, non la chiede più (né la mattina dopo)');
    ok(sw.eval('dietaDaChiedere(new Date(2026,10,27,10,0))') === '2026-11-26', 'dieta: la mattina chiede di ieri, se è rimasto in sospeso');
    sw.eval('DIETA_MESE="2026-11"');
    { const cal = sw.eval('dietaCalendario(new Date(2026,10,27,10,0))');
      ok(/class="cal-g si" data-dg="2026-11-25"/.test(cal) && /data-dg="2026-11-28" disabled/.test(cal) && /seguita <b>1<\/b>/.test(cal) && /da segnare <b>1<\/b>/.test(cal),
         'dieta: calendario del mese (25 verde, 26 da segnare, i giorni a venire non si toccano)'); }
    ok(sw.eval('avvLista(new Date(2030,0,10,12,0)).map(x=>x.id).join(",")') === Array.from({ length: 28 }, (_, k) => 7050 + k).join(','), 'dieta: coi promemoria della pesata spenti restano le 28 domande della sera sulla dieta');
    sw.eval('localStorage.setItem("tms-avvisi", JSON.stringify({on:true, dieta:true, ora:"21:00"}))');
    ok(sw.eval('avvLista(new Date(2030,0,10,12,0)).length') === 56 && sw.eval('avvLista(new Date(2030,0,10,12,0))[1].pagina') === 'alim', 'dieta: coi promemoria accesi pesata e dieta, ogni sera');
    sw.eval('localStorage.setItem("tms-avvisi", JSON.stringify({on:false, dieta:false, ora:"21:00"}))');
    ok(sw.eval('avvLista(new Date(2030,0,10,12,0)).length') === 0, 'dieta: con la casella spenta niente domanda della sera');
    /* l'Alimentazione: domanda in cima (qui con l'ora dei promemoria a mezzanotte, così vale sempre) e calendario in fondo */
    sw.eval('localStorage.setItem("tms-avvisi", JSON.stringify({on:false, dieta:true, ora:"00:00"})); localStorage.removeItem("tms-dieta-template"); DIETA_MESE="";');
    sd.getElementById('vai-alim').click();
    const oggi = sw.eval('dataLoc(new Date())');
    ok(sd.getElementById('alim').hidden === false && /Oggi hai seguito la dieta\?/.test((sd.querySelector('#alim-body .dieta-q') || {}).textContent || '') && sd.getElementById('dieta-cal') !== null,
       'dieta: nell\'Alimentazione la domanda di oggi in cima e il calendario');
    sw.eval('alimMeta()');
    ok(/segna la dieta di oggi/.test(sd.getElementById('meta-alim').textContent), 'dieta: nel menu la riga Alimentazione ricorda di segnarla');
    sd.querySelector('#alim-body [data-dq="si"]').click();
    ok(sw.eval('dietaLeggi().giorni[' + JSON.stringify(oggi) + ']') === 'si' && !sd.querySelector('#alim-body .dieta-q') && sd.querySelector('#dieta-cal [data-dg="' + oggi + '"]').classList.contains('si') && !/segna/.test(sd.getElementById('meta-alim').textContent),
       'dieta: «Sì» la segna, la domanda sparisce e il giorno diventa verde');
    /* tocco su un giorno: niente cambi a ripetizione, si apre la modifica con le due scelte */
    sd.querySelector('#dieta-cal [data-dg="' + oggi + '"]').click();
    { const cella = sd.querySelector('#dieta-cal [data-dg="' + oggi + '"]'), mod = sd.getElementById('dieta-mod');
      ok(sw.eval('dietaLeggi().giorni[' + JSON.stringify(oggi) + ']') === 'si' && cella.classList.contains('sel') && cella.querySelector('.cal-mat') && mod
         && mod.querySelector('[data-dv="si"]').classList.contains('scelto') && mod.querySelector('[data-dv="no"]') && mod.querySelector('[data-dv=""]'),
         'dieta: toccando un giorno non cambia niente: compare la matita e sotto la modifica con «Seguita» / «Non seguita» (e «Togli la scelta»)'); }
    sd.querySelector('#dieta-mod [data-dv="no"]').click();
    ok(sw.eval('dietaLeggi().giorni[' + JSON.stringify(oggi) + ']') === 'no' && sd.querySelector('#dieta-cal [data-dg="' + oggi + '"]').classList.contains('no') && !sd.getElementById('dieta-mod'),
       'dieta: «Non seguita» segna il giorno in rosso e chiude la modifica');
    sd.querySelector('#dieta-cal [data-dg="' + oggi + '"]').click(); sd.querySelector('#dieta-mod [data-dx]').click();
    ok(!sd.getElementById('dieta-mod') && sw.eval('dietaLeggi().giorni[' + JSON.stringify(oggi) + ']') === 'no', 'dieta: la ✕ chiude la modifica senza cambiare niente');
    sd.querySelector('#dieta-cal [data-dg="' + oggi + '"]').click(); sd.querySelector('#dieta-mod [data-dv=""]').click();
    ok(sw.eval('dietaLeggi().giorni[' + JSON.stringify(oggi) + ']') === undefined && sd.querySelector('#alim-body .dieta-q') !== null, 'dieta: «Togli la scelta» lo lascia vuoto, e la domanda torna');
    ok(!sd.getElementById('foto-nota') && !/rimpicciolite/.test(sd.body.textContent), 'foto progressi: niente più scritta sulle foto rimpicciolite');
    sd.querySelector('#dieta-cal [data-dm="-1"]').click();
    ok(sw.eval('DIETA_MESE') !== '' && sd.querySelector('#dieta-cal [data-dm="1"]').disabled === false, 'dieta: il calendario va al mese prima e torna avanti');
    ok(sw.eval('["Andamento del peso","Calendario della dieta","Oggi hai seguito la dieta?","⏱ Recupero finito","🍽 Com’è andata la dieta?","Scansione corporea","Analisi completata"].every(k=>TT.en[k])'), 'app cliente EN: i testi nuovi hanno la traduzione');
    /* schermata d'analisi della pesata (animazione da videogioco, grafica dell'app) */
    sw.HTMLMediaElement.prototype.play = function(){ sw.__suona = this.src; return Promise.resolve(); };
    sw.HTMLMediaElement.prototype.pause = function(){ sw.__suona = ''; };
    sw.eval('mostra("bil"); BIL.live=80.4; BIL.liveStato=1; bilStato("misura");');
    ok(sd.getElementById('scan').hidden === false && sw.eval('SCAN.fase') === 1 && /80,4/.test(sd.getElementById('scan-peso').textContent) && /musica-pesata\.mp3$/.test(sw.__suona || ''),
       'bilancia/analisi: col primo peso in diretta si apre la schermata d\'analisi e parte la traccia della pesata');
    sw.eval('BIL.liveStato=2; bilStato("misura"); for(let i=0;i<40;i++) scanPasso();');
    ok(sw.eval('SCAN.fase') === 2 && sw.eval('SCAN.prog') > 50 && /Peso stabile/.test(sd.getElementById('scan-log').textContent) && sd.querySelector('#scan .zona.att') !== null,
       'bilancia/analisi: peso fermo → analisi della composizione, un pezzo del corpo alla volta');
    { const p1 = sw.eval('SCAN.prog'); sw.eval('BIL.liveStato=1; bilStato("misura"); scanPasso();');
      ok(sw.eval('SCAN.prog') >= p1 && sw.eval('SCAN.fase') === 2, 'bilancia/analisi: la percentuale non torna mai indietro'); }
    sw.eval('BIL.ultima={peso:80.4, grasso:16.6, muscolo:62.1}; bilStato("fatto"); for(let i=0;i<30;i++) scanPasso();');
    ok(sw.eval('SCAN.fine') === true && sw.eval('SCAN.prog') === 100 && sd.getElementById('scan').classList.contains('fine') && /Analisi completata/.test(sd.getElementById('scan-tit').textContent)
       && /16,6 %/.test(sd.getElementById('scan-ris').textContent) && sw.__suona === '' && !sw.eval('SCAN.audio') && !sw.eval('SCAN.synth'),
       'bilancia/analisi: al risultato «Analisi completata», i valori, la musica si ferma');
    sd.getElementById('scan').click();
    ok(sd.getElementById('scan').hidden === true && sw.eval('SCAN.on') === false, 'bilancia/analisi: un tocco la chiude');
    sw.eval('BIL.liveStato=1; bilStato("misura"); bilStato("errore","spento");');
    ok(sd.getElementById('scan').hidden === true && sw.__suona === '', 'bilancia/analisi: se la bilancia si perde, la schermata si chiude e la musica si ferma');
    ok(!/#2ee9ff|Courier|scanlines|text-transform:uppercase/.test(sd.querySelector('style').textContent.slice(sd.querySelector('style').textContent.indexOf('#scan{'), sd.querySelector('style').textContent.indexOf('barra del timer di recupero'))),
       'bilancia/analisi: la schermata usa la grafica dell\'app (niente colori, caratteri o maiuscole da videogioco)');
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
  /* 2026-09-08: via le frecce ▲▼ di riordino (Marco: «non servono») — la riga sotto il
     nome era affollata e con l'etichetta del corpo libero andava a capo */
  ok(d.querySelector('#panel-allenamento [data-mvup]') === null && d.querySelector('#panel-allenamento [data-mvdn]') === null,
     'Pesi: via le frecce ▲▼ dalla cella esercizio');
  /* ＋set: il nuovo set deve finire SUBITO SOTTO quello da cui nasce, non in fondo */
  { w.eval('DOC.scheda.settimanale=[{giorno:"Lunedì",esercizio:"Squat con bilanciere",serie:3,rip:5,peso:100},{giorno:"Lunedì",esercizio:"Panca piana con bilanciere - presa media",serie:3,rip:8,peso:70},{giorno:"Martedì",esercizio:"Stacco da terra con bilanciere",serie:3,rip:5,peso:120}]; renderAllenamento();');
    d.querySelector('#panel-allenamento tbody tr[data-i="0"] [data-set]').click();
    const ordine = w.eval('DOC.scheda.settimanale.map(r=>r.esercizio+"|"+r.giorno).join(" / ")');
    ok(w.eval('DOC.scheda.settimanale.length') === 4 && w.eval('DOC.scheda.settimanale[1].esercizio') === 'Squat con bilanciere',
       'Pesi/＋set: il set nuovo si infila subito sotto il suo (' + ordine.slice(0, 90) + '…)');
    ok(w.eval('DOC.scheda.settimanale[3].giorno') === 'Martedì', 'Pesi/＋set: non finisce in fondo alla scheda'); }
  /* ── 2026-09-08 — ELIMINA per settimana, al posto di «Annulla ultimo» ── */
  ok(d.getElementById('btn-undo-sched') === null && w.eval('typeof undoScheda') === 'undefined',
     'Storico: via «Annulla ultimo» (sapeva togliere solo l\'ultima scheda)');
  { w.eval('DOC.storico=[{scheda:202601,esercizio:"Squat con bilanciere",macro:"Gambe",serie:3,rip:5,peso:100},{scheda:202602,esercizio:"Panca piana con bilanciere - presa media",macro:"Pettorali",serie:3,rip:8,peso:70}]; stFilt={esercizio:"",macro:"",scheda:""}; showTab("storico");');
    const bottoni = [...d.querySelectorAll('#panel-storico [data-delsched]')];
    ok(bottoni.length === 2, 'Storico: un tasto ELIMINA nella barra nera di OGNI settimana (' + bottoni.length + ')');
    /* la conferma è un modale DELL'APP, non più la finestra grigia di sistema */
    bottoni.find(b => b.dataset.delsched === '202601').click();
    ok(d.getElementById('cc-si') !== null && d.getElementById('cc-no') !== null,
       'Storico: la conferma è un modale in stile app (non il confirm di Windows)');
    ok(w.eval('DOC.storico.length') === 2, 'Storico: finché non confermi non viene tolto nulla');
    d.getElementById('cc-si').click();
    ok(w.eval('DOC.storico.length') === 1 && w.eval('DOC.storico[0].scheda') === 202602,
       'Storico: elimina la settimana scelta, non l\'ultima (resta la 202602)');
    /* si può togliere una settimana in mezzo: era proprio il limite del vecchio Annulla */
    ok(w.eval('typeof eliminaScheda') === 'function', 'Storico: eliminaScheda disponibile'); }
  /* stesso approccio per le misure */
  { w.eval('DOC.storico_io=[{scheda:202601,peso:70},{scheda:202602,peso:71}]; showTab("storicocorpo");');
    const bm = [...d.querySelectorAll('#panel-storicocorpo [data-delmis]')];
    ok(bm.length === 2, 'Misure: un tasto ELIMINA per ogni rilevazione (' + bm.length + ')');
    bm.find(b => b.dataset.delmis === '202601').click();
    d.getElementById('cc-si').click();
    ok(w.eval('DOC.storico_io.length') === 1 && w.eval('DOC.storico_io[0].scheda') === 202602,
       'Misure: elimina la rilevazione scelta'); }
  w.eval('showTab("allenamento")');
  /* ── manici di trascinamento al posto delle frecce ▲▼ ── */
  { w.eval('DOC.scheda.settimanale=[{giorno:"Lunedì",esercizio:"Squat con bilanciere",serie:3,rip:5,peso:100},{giorno:"Lunedì",esercizio:"Curl con bilanciere",serie:3,rip:10,peso:30}]; renderAllenamento();');
    const manici = d.querySelectorAll('#panel-allenamento tr[data-i] .drag-h');
    ok(manici.length === 2, 'Riordino: un manico di trascinamento per ogni riga della scheda (' + manici.length + ')');
    ok(d.querySelector('#panel-allenamento tr[data-i]').ondragstart !== null &&
       d.querySelector('#panel-allenamento tr[data-i]').ondrop !== null,
       'Riordino: le righe rispondono a trascinamento e rilascio');
    ok(d.querySelectorAll('#panel-allenamento [data-up],#panel-allenamento [data-down]').length === 0,
       'Riordino: nessuna freccia ▲▼ rimasta in giro'); }
  /* ── ⚖ Bilanciamento della settimana in costruzione (cardio escluso) ── */
  { w.eval('DOC.scheda.settimanale=[{giorno:"Lunedì",esercizio:"Squat con bilanciere",serie:4,rip:5,peso:100},{giorno:"Lunedì",esercizio:"Panca piana con bilanciere - presa media",serie:3,rip:8,peso:70}]; renderAllenamento();');
    ok(d.getElementById('btn-bilanc') === null && d.getElementById('btn-colonne') !== null, 'Pesi: niente più pulsante Bilanciamento (la ragnatela è nel pannello accanto alla scheda), resta Colonne');
    const bil = JSON.parse(w.eval('JSON.stringify(bilanciamentoSerie())'));
    const o = bil.per;
    ok(o['Gambe'] === 4 && o['Pettorali'] === 3, 'Bilanciamento: serie piene sui muscoli primari (Gambe 4, Pettorali 3)');
    ok(o['Spalle'] === 1.5 && o['Braccia'] === 1.5, 'Bilanciamento: mezza serie ai secondari (3 di panca → Spalle e Braccia 1,5)');
    ok(o['Schiena'] === 2, 'Bilanciamento: i secondari contano anche fuori dal macro (squat → lombari → Schiena 2)');
    ok(bil.tot === 7, 'Bilanciamento: «serie in scheda» resta il conteggio reale (7), non la somma delle quote');
    ok(!('Cardio' in o), 'Bilanciamento: il Cardio è ESCLUSO da questo grafico (richiesta di Marco)');
    ok(w.eval('quoteGruppi("Girata e spinta (clean and press)").Spalle') === 1,
       'quoteGruppi: un muscolo sia primario sia secondario vale 1, non 1,5');
    ok(bil.dir.spinta === 3 && bil.dir.trazione === 0,
       'Bilanciamento: Spinta·Trazione conta solo la parte alta (panca = spinta, squat senza direzione)');
    ok(w.eval('direzioneOf("Trazioni presa supina (chin-up)")') === 'trazione',
       'direzioneOf: il gran dorsale come primario dà trazione');
    ok(w.eval('direzioneOf("Curl con bilanciere")') === '' && w.eval('direzioneOf("Alzate laterali")') === '',
       'direzioneOf: gli ISOLAMENTI restano fuori (un curl non è una trazione, le alzate laterali non una spinta)');
    ok(w.eval('RIF_GRUPPO.Braccia.max > RIF_GRUPPO.Pettorali.max') && w.eval('RIF_GRUPPO.Core.sotto') === 0,
       'Fasce: una per gruppo (Braccia più larga dei Pettorali), e il Core non viene mai segnalato come scarso');
    /* riordino per trascinamento: il gesto non è provabile in jsdom, l'aritmetica sì */
    { const abc = () => w.eval('JSON.stringify(spostaRiga([{n:"a",giorno:"Lun"},{n:"b",giorno:"Lun"},{n:"c",giorno:"Lun"}],0,2,true).map(function(x){return x.n;}))');
      ok(abc() === '["b","c","a"]', 'spostaRiga: trascinata in fondo (rilascio sotto) → a va per ultima');
      ok(w.eval('JSON.stringify(spostaRiga([{n:"a"},{n:"b"},{n:"c"}],2,0,false).map(function(x){return x.n;}))') === '["c","a","b"]',
         'spostaRiga: trascinata in cima (rilascio sopra) → c va per prima');
      ok(w.eval('JSON.stringify(spostaRiga([{n:"a"},{n:"b"},{n:"c"}],0,1,false).map(function(x){return x.n;}))') === '["a","b","c"]',
         'spostaRiga: rilascio sopra la riga seguente non cambia nulla (niente scarti di indice)');
      ok(w.eval('spostaRiga([{n:"a",giorno:"Lunedì"},{n:"b",giorno:"Venerdì"}],0,1,true)[1].giorno') === 'Venerdì',
         'spostaRiga: portando una riga in un altro giorno le cambia anche il giorno');
      ok(w.eval('JSON.stringify(spostaRiga([{n:"a"},{n:"b"}],0,5,true).map(function(x){return x.n;}))') === '["a","b"]',
         'spostaRiga: indice fuori portata → array intatto'); }
    w.eval('bilanciamentoModal()');
    const hb = d.getElementById('modal').innerHTML;
    ok(/Bilanciamento|Balance/.test(hb) && d.querySelector('#modal svg') !== null,
       'Bilanciamento: si apre col radar delle serie per gruppo');
    ok(/fill-rule="evenodd"/.test(hb), 'Bilanciamento: il radar disegna la fascia di riferimento 10-20 serie');
    ok(/lbl-fuori/.test(hb), 'Bilanciamento: i gruppi fuori fascia hanno l\'etichetta in rosso');
    /* 18/11/2026: giorni che partono dal 6 (set copiato, giorni aggiunti dopo e vecchi tolti) → «Rinumera da 1» */
    { const salva = w.eval('JSON.stringify({s:DOC.scheda.settimanale, r:DOC.scheda.rpe, w:DOC.scheda.riscaldamento})');
      w.eval('closeModal(); schedaMode="settimanale"; DOC.scheda.settimanale=[' +
        '{giorno:"Giorno 6",esercizio:"Squat con bilanciere",serie:3,rip:5,peso:80},{giorno:"Giorno 6",esercizio:"Panca piana con bilanciere - presa media",serie:3,rip:8,peso:60},' +
        '{giorno:"Giorno 8",esercizio:"Stacco da terra con bilanciere",serie:3,rip:5,peso:100},{giorno:"Giorno 9",esercizio:"Military press in piedi",serie:3,rip:8,peso:40}];' +
        'DOC.scheda.rpe=DOC.scheda.rpe||{}; DOC.scheda.rpe.settimanale={"Giorno 6":{rpe:7,min:60},"Giorno 8":{rpe:8,min:55},"Giorno 1":{rpe:9,min:10}};' +
        'DOC.scheda.riscaldamento=DOC.scheda.riscaldamento||{}; DOC.scheda.riscaldamento.settimanale=[{giorno:"Giorno 9",esercizio:"Cyclette",serie:1,rip:5}];' +
        'renderAllenamento();');
      ok(d.getElementById('giorni-avviso') !== null && /6, 8, 9/.test(d.getElementById('giorni-avviso').textContent),
         'giorni che non partono da 1: nei Pesi l\'avviso li elenca (6, 8, 9) con «Rinumera da 1»');
      d.getElementById('btn-rinumera').click(); await settle(20);
      const sc = JSON.parse(w.eval('JSON.stringify({g:DOC.scheda.settimanale.map(function(r){return r.giorno;}), r:DOC.scheda.rpe.settimanale, w:DOC.scheda.riscaldamento.settimanale[0].giorno})'));
      ok(sc.g.join(',') === 'Giorno 1,Giorno 1,Giorno 2,Giorno 3' && sc.w === 'Giorno 3',
         'Rinumera da 1: i giorni diventano 1, 2, 3 nello stesso ordine, riscaldamento compreso');
      ok(sc.r['Giorno 1'] && sc.r['Giorno 1'].rpe === 7 && sc.r['Giorno 2'].rpe === 8 && !sc.r['Giorno 6'] && !sc.r['Giorno 8'],
         'Rinumera da 1: la fatica delle sedute segue il suo giorno (e un vecchio «Giorno 1» rimasto senza righe non la copre)');
      ok(d.getElementById('giorni-avviso') === null && w.eval('giorniDaRinumerare()') === null, 'Rinumera da 1: poi l\'avviso sparisce');
      w.eval('(function(o){ DOC.scheda.settimanale=o.s; DOC.scheda.rpe=o.r; DOC.scheda.riscaldamento=o.w; renderAllenamento(); })(' + salva + ')'); }
    ok(!/fill-rule="evenodd"/.test(w.eval('radarChart([{label:"A",value:3},{label:"B",value:9}])')),
       'radarChart: senza opts.rif nessuna fascia, il radar di Progressi resta com\'è');
    /* ── ragnatela = DISTRIBUZIONE, non quantità (Marco 2026-09-29: «forma e proporzione») ── */
    { const q = JSON.parse(w.eval('JSON.stringify(distribuzione(bilanciamentoSerie().per))'));
      const somma = Object.values(q).reduce((a, b) => a + b, 0);
      ok(Math.abs(somma - 100) < 1e-9, 'distribuzione: le quote dei gruppi dei pesi fanno 100%');
      ok(!('Cardio' in q), 'distribuzione: il Cardio non entra (cambierebbe la quota di tutti gli altri)');
      const per = '{"Gambe":20,"Pettorali":9,"Schiena":22,"Spalle":18,"Braccia":22,"Core":3}';
      const doppio = '{"Gambe":40,"Pettorali":18,"Schiena":44,"Spalle":36,"Braccia":44,"Core":6}';
      ok(w.eval('radarChart(vociDistribuzione(' + per + '))') === w.eval('radarChart(vociDistribuzione(' + doppio + '))'),
         'distribuzione: stessa distribuzione con volume DOPPIO → identico disegno (conta la forma, non il totale)');
      ok(w.eval('JSON.stringify(distribuzione({}))') === '{"Gambe":0,"Pettorali":0,"Schiena":0,"Spalle":0,"Braccia":0,"Core":0}',
         'distribuzione: senza lavoro tutto a zero (niente divisioni per zero)');
      /* scheda sbilanciata come quella di Marco: poche gambe → etichetta rossa sulle Gambe */
      const marco = '{"Gambe":19.5,"Pettorali":19,"Schiena":28.5,"Spalle":33.5,"Braccia":40,"Core":10}';
      const svg = w.eval('radarChart(vociDistribuzione(' + marco + ',null,{fasce:RIF_QUOTA}))');
      ok(/class="lbl lbl-fuori"[^>]*>Gambe 13%</.test(svg), 'distribuzione: gambe al 13% (fascia storica 19–33) → etichetta «Gambe 13%» in rosso');
      ok(/>Schiena 19%</.test(svg) && !/lbl-fuori[^>]*>Schiena/.test(svg), 'distribuzione: schiena al 19%, dentro fascia → etichetta normale'); }
    ok(/>Gambe \d+%</.test(hb), 'Bilanciamento: la ragnatela etichetta ogni gruppo con la sua quota in %');
    w.eval('closeModal()'); }
  /* ── riferimenti della ragnatela (2026-11-13): esperienza × tipo, fonti, dirette/indirette ── */
  { const GR6 = ['Gambe', 'Pettorali', 'Schiena', 'Spalle', 'Braccia', 'Core'];
    const J = s => JSON.parse(w.eval('JSON.stringify(' + s + ')'));
    w.eval('delete DOC.dati_utente.rifDistr; delete DOC.dati_utente.esperienza; delete DOC.scheda.tipoAllenamento;');
    const nR = J('{sch:RIF_DISTR.voci.filter(function(v){return v.raccolta==="schede"}).length, stu:RIF_DISTR.voci.filter(function(v){return v.raccolta==="studi"}).length}');
    ok(nR.sch > 60 && nR.stu > 0, 'Riferimenti: due raccolte che non si mescolano (schede ' + nR.sch + ', protocolli di studio ' + nR.stu + ')');
    ok(w.eval('RIF_DISTR.voci.every(function(v){ return v.id && v.fonte && v.D.length===6 && v.I.length===6 && v.eD.length===6 && v.eI.length===6; })'),
       'Riferimenti: ogni voce ha id, fonte e serie dirette e indirette per i 6 gruppi, nei due conteggi');
    ok(w.eval('RIF_DISTR.fonti.every(function(f){ return !!f.licenza; }) && RIF_DISTR.voci.every(function(v){ return RIF_DISTR.fonti.some(function(f){ return f.id===v.fonte; }); })'),
       'Riferimenti: ogni fonte dichiara la licenza e ogni voce rimanda a una fonte registrata');
    ok(w.eval('RIF_DISTR.raccolte.studi.record_corpus') === 359 && w.eval('RIF_DISTR.raccolte.studi.esclusi["nessun elenco di esercizi (solo numero, serie per esercizio e test di forza)"]') === 250,
       'Riferimenti: dei 359 record del corpus si dice quanti non reggono la distribuzione e perché (250 senza elenco esercizi)');
    const rc0 = J('rifCalcola()');
    ok(rc0.stato === 'solido' && rc0.n >= 61 && rc0.o.raccolta === 'schede' && rc0.esp === '' && rc0.tipo === '',
       'Riferimento predefinito: schede equilibrate, tutte le esperienze e tutti i tipi (' + rc0.n + ' schede, ' + rc0.fonti.length + ' fonti)');
    const RQ = J('RIF_QUOTA');
    /* 14/11/2026: con Liftosaur e il riconoscimento dei nomi migliorato le schede sono 216 (109
       equilibrate) e la fascia predefinita si allarga fino a 4 punti (Gambe 16–37 invece di 19–33) */
    ok(GR6.every(g => Math.abs(rc0.fasce[g].min - RQ[g].min) <= 4 && Math.abs(rc0.fasce[g].max - RQ[g].max) <= 4),
       'Riferimento predefinito: fasce entro 4 punti da quelle storiche (RIF_QUOTA) · ' + GR6.map(g => g + ' ' + rc0.fasce[g].min + '–' + rc0.fasce[g].max).join(', '));
    /* l'esperienza viene dall'anagrafica, il tipo dal Training Set */
    w.eval('DOC.dati_utente.esperienza="principiante"; DOC.scheda.tipoAllenamento="ipertrofia";');
    const rc1 = J('rifCalcola()');
    ok(rc1.esp === 'principiante' && rc1.tipo === 'ipertrofia' && rc1.voci.every(v => v.esperienza === 'principiante' && v.tipi.includes('ipertrofia')),
       'Riferimento: esperienza dall\'anagrafica, tipo dal Training Set, e solo voci di quel profilo (' + rc1.n + ')');
    ok(rc1.n < rc0.n && rc1.fonti.length >= 1, 'Riferimento: filtrando, le voci calano e le fonti restano contate');
    /* il tipo viaggia col suo Training Set */
    w.eval('ensureSets(); var _b=DOC.scheda.setAttivo; creaTrainingSet("ProvaForza","__vuota__");');
    ok(!w.eval('DOC.scheda.tipoAllenamento'), 'Training Set nuovo e vuoto: senza tipo di allenamento');
    w.eval('DOC.scheda.tipoAllenamento="forza"; switchTrainingSet(_b);');
    ok(w.eval('DOC.scheda.tipoAllenamento') === 'ipertrofia' && w.eval('DOC.scheda.setsSalvati.ProvaForza.tipoAllenamento') === 'forza',
       'Training Set: ognuno tiene il suo tipo di allenamento (Base ipertrofia, ProvaForza forza)');
    ok(w.eval('tipoScheda("ProvaForza")') === 'forza' && J('rifCalcola(null,{set:"ProvaForza"})').tipo === 'forza',
       'Riferimento: in Progressi, filtrando un Training Set, vale il tipo di quel set');
    w.eval('delete DOC.scheda.setsSalvati.ProvaForza; DOC.scheda.setsOrdine=DOC.scheda.setsOrdine.filter(function(n){return n!=="ProvaForza";}); renderAllenamento();');
    /* dati insufficienti: niente fascia, e lo si scrive (nessuna scheda pubblicata di resistenza muscolare) */
    const POCO = '{raccolta:"schede", esperienza:"", tipo:"resistenza"}';
    const rcPoco = J('rifCalcola(' + POCO + ')');
    ok(rcPoco.stato === 'insufficiente' && rcPoco.fasce === null, 'Riferimento: con meno di 5 voci i dati sono INSUFFICIENTI e la fascia non c\'è');
    const per = '{"Gambe":20,"Pettorali":9,"Schiena":22,"Spalle":18,"Braccia":22,"Core":3}';
    ok(!/fill-rule="evenodd"/.test(w.eval('radarChart(vociDistribuzione(' + per + ',null,rifCalcola(' + POCO + ')))')),
       'Ragnatela: con dati insufficienti non disegna nessuna fascia');
    ok(/Dati insufficienti/.test(w.eval('rifDidascalia(rifCalcola(' + POCO + '))')),
       'Didascalia: dice «Dati insufficienti» con voci e fonti contate');
    /* fonti aggiunte il 14/11/2026: Liftosaur (schede) e studi ad accesso aperto fuori dal corpus */
    const lif = J('RIF_DISTR.voci.filter(function(v){ return v.fonte==="liftosaur"; })');
    ok(lif.length >= 30 && lif.every(v => v.raccolta === 'schede' && /^https:\/\/www\.liftosaur\.com\/programs\//.test(v.url) && v.stato && v.origine_esperienza),
       'Riferimenti: i programmi Liftosaur sono schede, ognuna con indirizzo, stato e origine del livello (' + lif.length + ')');
    ok(/AGPL/.test(w.eval('RIF_DISTR.fonti.find(function(f){ return f.id==="liftosaur"; }).licenza')),
       'Riferimenti: la fonte Liftosaur dichiara la licenza del repository');
    const agg = J('RIF_DISTR.voci.filter(function(v){ return v.raccolta==="studi" && !(v.record_ids||[]).length; })');
    /* 15/11/2026: due articoli del J Sports Sci Med (2016, 2018) non hanno DOI: vale l'indirizzo PMC */
    ok(agg.length >= 10 && agg.every(v => v.url && v.stato === 'trascrizione TMS da verificare' &&
         (J('RIF_DISTR.fonti.find(function(f){ return f.id==="' + v.fonte + '"; })').doi || /pmc\.ncbi\.nlm\.nih\.gov\/articles\/PMC\d+/.test(v.url))),
       'Riferimenti: gli studi aggiunti fuori dal corpus hanno DOI (o indirizzo PMC), indirizzo e stato «da verificare» (' + agg.length + ')');
    /* 15/11/2026: schede trascritte dal web da agenti di ricerca e riviste una per una */
    const web = J('RIF_DISTR.voci.filter(function(v){ return v.id.indexOf("web:")===0; })');
    ok(web.length >= 40 && web.every(v => v.raccolta === 'schede' && /^https?:\/\//.test(v.url) && /rivista da Claude|aggiunta da Claude/.test(v.stato) &&
         J('RIF_DISTR.fonti.find(function(f){ return f.id==="' + v.fonte + '"; })').licenza),
       'Riferimenti: le schede trovate sul web hanno indirizzo, stato della revisione e fonte con licenza (' + web.length + ')');
    ok(J('RIF_DISTR.voci.filter(function(v){ return v.raccolta==="schede" && v.tipi.indexOf("powerlifting")>=0; }).length') >= 15 &&
       J('RIF_DISTR.voci.filter(function(v){ return v.raccolta==="schede" && v.sesso==="F"; }).length') >= 25,
       'Riferimenti: con le schede dal web il powerlifting e le schede per donne hanno abbastanza voci');
    /* schede generate da Fable (Marco, 15/11/2026): solo come ripiego dove le voci reali sono meno di 5,
       con l'interruttore acceso (spento di serie) e sempre con l'avvertimento */
    const fab = J('RIF_DISTR.voci.filter(function(v){ return v.generata; })');
    ok(fab.length >= 150 && fab.every(v => v.fonte === 'fable' && v.raccolta === 'schede' && /^Fable · /.test(v.titolo) && /non è una scheda reale/.test(v.stato)) &&
       /NON sono schede reali/.test(w.eval('RIF_DISTR.fonti.find(function(f){ return f.id==="fable"; }).licenza')),
       'Fable: le schede generate sono marcate (generata, fonte «fable», titolo «Fable ·», stato e licenza lo dicono) (' + fab.length + ')');
    ok(w.eval('rifImpost({}).fable') === false && !J('rifCalcola()').fable && !J('rifCalcola(' + POCO + ')').fable,
       'Fable: spento di serie, anche dove i dati reali mancano');
    ok(w.eval('rifVociContesto(rifImpost({fable:true})).every(function(v){ return !v.generata; })'),
       'Fable: le voci reali (tabella, conteggi) non contano mai le schede generate');
    ok(w.eval('rifVociFable(rifImpost({fable:true})).every(function(v){ return v.equilibrata; })') &&
       w.eval('rifVociFable(rifImpost({fable:true, soloEquilibrate:false})).some(function(v){ return !v.equilibrata; })'),
       'Fable: anche le schede generate passano dal filtro «solo equilibrate» (Marco, 15/11/2026)');
    const POCOF = '{raccolta:"schede", esperienza:"", tipo:"resistenza", fable:true}';
    const rcF = J('rifCalcola(' + POCOF + ')');
    ok(rcF.fable && rcF.nReali < 5 && rcF.n >= 5 && rcF.voci.every(v => v.generata) && GR6.every(g => rcF.fasce[g].generata && rcF.fasce[g].indicativa),
       'Fable: acceso, dove le voci reali sono meno di 5 la fascia viene SOLO dalle schede generate, tratteggiata (' + rcF.nReali + ' reali, ' + rcF.n + ' Fable)');
    ok(/Fascia ipotizzata da Fable: schede generate, non reali/.test(w.eval('rifDidascalia(rifCalcola(' + POCOF + '))')) &&
       /var\(--violet\)/.test(w.eval('radarChart(vociDistribuzione(' + per + ',null,rifCalcola(' + POCOF + ')))')),
       'Fable: la didascalia avverte che le schede sono generate e la fascia della ragnatela è viola');
    const rcPieno = J('rifCalcola({raccolta:"schede", esperienza:"", tipo:"ipertrofia", fable:true})');
    ok(!rcPieno.fable && rcPieno.n >= 5 && rcPieno.voci.every(v => !v.generata) && !/Fable/.test(w.eval('rifDidascalia(rifCalcola({raccolta:"schede", esperienza:"", tipo:"ipertrofia", fable:true}))')),
       'Fable: acceso, dove le voci reali bastano non entra e non si mescola (' + rcPieno.n + ' reali)');
    ok(J('rifCalcola({raccolta:"studi", esperienza:"", tipo:"potenza", fable:true})').voci.every(v => !v.generata),
       'Fable: nei protocolli di studio non entra mai');
    /* riquadro: interruttore, caselle «+F», salvato nel profilo solo se acceso */
    w.eval('rifDistrModal("tab")');
    const chk = w.document.querySelector('#rif-corpo [data-k="fable"]');
    ok(chk && !chk.checked && !w.document.querySelector('#rif-corpo .rif-f'), 'Fable: nel riquadro c\'è l\'interruttore, spento, e nessuna casella coperta da Fable');
    chk.checked = true; chk.onchange();
    ok(w.document.querySelectorAll('#rif-corpo .rif-cella.is-fable .rif-f').length >= 3 && /coperta da schede generate da Fable/.test(w.document.querySelector('#rif-corpo .rif-leg').textContent),
       'Fable: acceso, le caselle con meno di 5 voci reali mostrano «+F» e la legenda lo spiega');
    w.document.querySelector('#rif-corpo .rif-cella[data-e=""][data-x="resistenza"]').onclick();
    ok(/Schede generate da Fable, non reali/.test(w.document.querySelector('#rif-corpo .rif-fable-box').textContent) &&
       w.document.querySelectorAll('#rif-corpo .rif-voci .pill.rif-fable').length >= 5,
       'Fable: scelta una casella coperta da Fable, il riepilogo avverte e ogni voce porta «generata da Fable»');
    w.document.getElementById('rif-ok').onclick();
    ok(w.eval('DOC.dati_utente.rifDistr && DOC.dati_utente.rifDistr.fable===true'), 'Fable: l\'interruttore si salva nel profilo');
    w.eval('delete DOC.dati_utente.rifDistr; closeModal();');
    ok(w.eval('RIF_DISTR.voci.every(function(v){ return !!v.stato; })'), 'Riferimenti: ogni voce dice come è stata letta (stato)');
    const rcAv = J('rifCalcola({raccolta:"studi", esperienza:"avanzato", tipo:""})');
    ok(rcAv.n >= w.eval('RIF_MIN_VOCI') && rcAv.fasce !== null, 'Riferimento: i protocolli di studio su avanzati reggono una fascia (' + rcAv.n + ' protocolli)');
    /* i protocolli presi da articoli aperti non sono «record del corpus»: si contano a parte */
    const rcSt = J('rifCalcola({raccolta:"studi", esperienza:"", tipo:""})');
    const recCorpus = w.eval('RIF_DISTR.voci.filter(function(v){ return v.raccolta==="studi"; }).reduce(function(a,v){ return a+(v.record_ids||[]).length; },0)');
    ok(rcSt.record === recCorpus && rcSt.aggiunti === agg.length && rcSt.n === rcSt.aggiunti + w.eval('RIF_DISTR.voci.filter(function(v){ return v.raccolta==="studi" && (v.record_ids||[]).length; }).length'),
       'Riferimento: negli studi si contano a parte i record del corpus (' + rcSt.record + ') e i protocolli da articoli aperti (' + rcSt.aggiunti + ')');
    const didSt = w.eval('rifDidascalia(rifCalcola({raccolta:"studi", esperienza:"", tipo:""}))');
    ok(didSt.includes(rcSt.record + ' record del corpus + ' + rcSt.aggiunti + ' da articoli ad accesso aperto'),
       'Didascalia: dice da dove vengono i protocolli (record del corpus + articoli ad accesso aperto)');
    ok(!/record del corpus/.test(w.eval('rifDidascalia(rifCalcola({raccolta:"studi", esperienza:"avanzato", tipo:"potenza"}))')),
       'Didascalia: senza protocolli del corpus non parla di record del corpus');
    ok(w.eval('EN["da articoli ad accesso aperto"]') === 'from open-access articles', 'EN: «da articoli ad accesso aperto» è tradotto');
    /* pochi dati: fascia tratteggiata */
    const indic = w.eval('(function(){ var E=["","principiante","intermedio","avanzato"], T=["","forza","ipertrofia","generale","resistenza"]; for(var i=0;i<E.length;i++) for(var j=0;j<T.length;j++){ var s={esperienza:E[i],tipo:T[j]}; var r=rifCalcola(s); if(r.stato==="indicativo") return JSON.stringify(s); } return ""; })()');
    if (indic) ok(/stroke-dasharray/.test(w.eval('radarChart(vociDistribuzione(' + per + ',null,rifCalcola(' + indic + ')))')),
       'Ragnatela: con 5-9 voci la fascia è tratteggiata (indicativa)');
    /* pesi delle serie: espliciti, modificabili, e il riferimento si ricalcola con gli stessi */
    const panca = 'Panca piana con bilanciere - presa media';
    w.eval('DOC.dati_utente.rifDistr={indiretta:0.25};');
    ok(J('quoteGruppi(' + JSON.stringify(panca) + ')').Spalle === 0.25, 'Pesi: la serie indiretta vale quanto scritto nel profilo (0,25)');
    const rcP = J('rifCalcola()');
    ok(GR6.some(g => rcP.fasce[g].max !== J('rifCalcola({tipo:"ipertrofia",esperienza:"principiante"})').fasce[g].max),
       'Pesi: cambiando il peso delle indirette cambiano anche le fasce del riferimento (stesso conteggio)');
    ok(/provvisori/.test(w.eval('rifDidascalia(rifCalcola())')), 'Didascalia: con pesi non predefiniti li mostra, marcati come provvisori');
    w.eval('DOC.dati_utente.rifDistr={metodo:"esterna"};');
    ok(w.eval('JSON.stringify(quoteGruppi(' + JSON.stringify(panca) + '))') === '{"Pettorali":1,"Spalle":1,"Braccia":1}',
       'Mappa esterna: la panca è diretta su petto, spalle e braccia (1,0 a tutti i motori primi)');
    ok(w.eval('(function(){ var M=RIF_DISTR.mappa_esterna.esercizi; var n=(DOC.esercizi||[]).map(function(e){return e.nome;}).find(function(x){ return !M[x] && (esLookup(x).muscoli_primari||[]).length; }); return !n || JSON.stringify(gruppiDI(n,"esterna"))===JSON.stringify(gruppiDI(n,"tms")); })()'),
       'Mappa esterna: un esercizio senza aggancio si conta col catalogo TMS');
    ok(w.eval('Object.values(RIF_DISTR.mappa_esterna.esercizi).every(function(m){ return m.st && m.e; })'), 'Mappa esterna: ogni aggancio porta id esterno e stato di convalida');
    w.eval('delete DOC.dati_utente.rifDistr;');
    ok(w.eval('JSON.stringify(quoteGruppi(' + JSON.stringify(panca) + '))') === '{"Pettorali":1,"Spalle":0.5,"Braccia":0.5}', 'Pesi: tolte le scelte, si torna a 1,0 / 0,5 col catalogo TMS');
    /* dirette e indirette distinte nell'elenco */
    w.eval('DOC.scheda.settimanale=[{giorno:"Lunedì",esercizio:"Squat con bilanciere",serie:4,rip:5,peso:100},{giorno:"Lunedì",esercizio:' + JSON.stringify(panca) + ',serie:3,rip:8,peso:70}]; renderAllenamento();');
    const bilDI = J('bilanciamentoSerie()');
    ok(bilDI.D.Pettorali === 3 && bilDI.I.Spalle === 3 && bilDI.per.Spalle === 1.5, 'Bilanciamento: serie dirette e indirette tenute a parte (Spalle: 3 indirette → 1,5)');
    ok(/bil-ind/.test(w.eval('bilRigheHTML(bilanciamentoSerie().per,bilanciamentoSerie())')) && /dirette/.test(d.getElementById('pesi-side').textContent),
       'Serie per gruppo: barra divisa fra dirette e indirette, con la legenda dei pesi');
    /* selettore del tipo nella barra Pesi */
    const ta = d.getElementById('tipo-allen');
    ok(ta && ta.value === 'ipertrofia', 'Pesi: il selettore «Tipo di allenamento» mostra il tipo del Training Set attivo');
    ta.value = 'forza'; ta.dispatchEvent(new w.Event('change'));
    ok(w.eval('DOC.scheda.tipoAllenamento') === 'forza', 'Pesi: cambiare il tipo lo salva nel Training Set');
    /* riquadro ⚙ Riferimento */
    d.querySelector('#pesi-side [data-rif-apri]').click();
    ok(d.querySelectorAll('#modal .rif-cella[data-e]').length === 4 * 7, 'Riferimento: tabella esperienza × tipo con il numero di voci in ogni casella');
    ok(/Come la scheda/.test(d.getElementById('modal').textContent) && /Come il profilo/.test(d.getElementById('modal').textContent),
       'Riferimento: esperienza «come il profilo», tipo «come la scheda»');
    d.querySelector('#modal .rif-cella[data-e="intermedio"][data-x="ipertrofia"]').click();
    ok(/Il confronto si regge su|Dati insufficienti/.test(d.getElementById('modal').textContent), 'Riferimento: il riquadro dice su quante voci e fonti si regge la scelta');
    d.getElementById('rif-ok').click();
    ok(w.eval('JSON.stringify(DOC.dati_utente.rifDistr)') === '{"esperienza":"intermedio","tipo":"ipertrofia"}', 'Riferimento: «Applica» salva nel profilo solo ciò che differisce dal predefinito');
    d.querySelector('#pesi-side [data-rif-apri]').click(); d.getElementById('rif-def').click(); d.getElementById('rif-ok').click();
    ok(w.eval('DOC.dati_utente.rifDistr') === undefined, 'Riferimento: «Ripristina predefiniti» toglie le scelte dal profilo');
    /* esperienza nell'anagrafica, il tipo no */
    w.eval('var _nomi=[DOC.dati_utente.nome, (profili.find(function(p){return p.slug===activeProfile;})||{}).nome]; anagraficaModal()');
    ok(d.getElementById('m-esperienza') !== null && d.getElementById('m-tipoall') === null, 'Anagrafica: c\'è l\'esperienza di allenamento, il tipo no (sta nel Training Set)');
    d.getElementById('m-esperienza').value = 'avanzato'; d.getElementById('m-ok').click();
    ok(w.eval('DOC.dati_utente.esperienza') === 'avanzato', 'Anagrafica: l\'esperienza si salva nel profilo');
    /* il salvataggio dell'anagrafica riscrive anche il nome: lo si rimette com'era per le prove che seguono */
    w.eval('if(_nomi[0]===undefined) delete DOC.dati_utente.nome; else DOC.dati_utente.nome=_nomi[0]; var _p=profili.find(function(p){return p.slug===activeProfile;}); if(_p) _p.nome=_nomi[1];');
    ok(w.eval('EN["Riferimento della distribuzione"]') === 'Distribution reference' && w.eval('EN["Tipo di allenamento"]') === 'Training type', 'EN: i testi nuovi del riferimento sono tradotti');
    w.eval('delete DOC.dati_utente.esperienza; delete DOC.scheda.tipoAllenamento; delete DOC.dati_utente.rifDistr; closeModal(); showTab("allenamento");'); }
  /* ── «?» sui grafici (2026-11-13): ogni grafico ha la sua nota metodologica ── */
  { const voci = JSON.parse(w.eval('JSON.stringify(Object.keys(SPIEG))'));
    ok(voci.length >= 30, 'Note dei grafici: una nota per ogni grafico (' + voci.length + ')');
    ok(w.eval('Object.values(SPIEG).every(function(v){ return v.t && v.a && v.dove && v.s.length>=5 && v.b.length>=1 && v.s.some(function(x){ return /spf/.test(x[1]); }); })'),
       'Note dei grafici: ognuna ha titolo, sommario, almeno 5 sezioni, una formula e la bibliografia');
    const copertura = {};
    ['allenamento', 'storico', 'progressi', 'corpo', 'cardio', 'alimentazione', 'analisi'].forEach(tab => {
      w.eval('showTab("' + tab + '")');
      const pan = d.getElementById('panel-' + tab); if (!pan) return;
      const box = [...pan.querySelectorAll('.chart-box, .lat')].filter(b => b.querySelector('svg, .lat-barra, .bil-riga, .lat-giorni') && !b.closest('.rep-doc'));
      const senza = box.filter(b => !b.querySelector('.spieg-btn'));
      copertura[tab] = box.length + '/' + senza.length;
      ok(senza.length === 0, 'Note dei grafici: in «' + tab + '» ogni grafico ha il suo «?» (' + box.length + ' grafici)' + (senza.length ? ' — senza: ' + senza.map(b => (b.querySelector('h4') || b).textContent.slice(0, 30)).join(' | ') : ''));
    });
    const ids = [...d.querySelectorAll('[data-spieg]')].map(b => b.dataset.spieg);
    w.eval('showTab("progressi")');
    const tutti = [...d.querySelectorAll('[data-spieg]')].map(b => b.dataset.spieg).concat(ids);
    ok(tutti.length > 0 && tutti.every(id => voci.includes(id)), 'Note dei grafici: ogni «?» punta a una nota che esiste');
    d.querySelector('#panel-progressi [data-spieg="acwr"]').click();
    const md = d.getElementById('modal');
    ok(md.querySelector('.spieg-doc') && /ACWR/.test(md.querySelector('h3').textContent) && md.querySelectorAll('.spieg-doc section').length >= 6,
       'Note dei grafici: il «?» dell\'ACWR apre la sua nota, divisa in sezioni con la bibliografia');
    d.getElementById('spieg-ok').click();
    ok(w.eval('document.getElementById("modal-bk").classList.contains("hidden")'), 'Note dei grafici: «Chiudi» chiude la nota');
    w.eval('showTab("allenamento"); bilanciamentoModal();');
    d.querySelector('#modal .bil-radar [data-spieg]').click(); d.getElementById('spieg-ok').click();
    ok(/Bilanciamento|Balance/.test(d.getElementById('modal').textContent), 'Note dei grafici: dal ⚖ Bilanciamento la nota riporta al Bilanciamento');
    w.eval('closeModal()');
    ok(w.eval('typeof SPIEG_EN==="object" && Object.keys(SPIEG_EN).every(function(k){ return SPIEG[k] && SPIEG_EN[k].s.length===SPIEG[k].s.length && SPIEG_EN[k].b.length===SPIEG[k].b.length; })'),
       'Note dei grafici: la versione inglese ha le stesse voci e la stessa struttura'); }
  /* ── Alimentazione (2026-11-13): ricette personali e suggerimenti di alimenti ── */
  { const J = s => JSON.parse(w.eval('JSON.stringify(' + s + ')'));
    const avena = 'Fiocchi di avena', banana = 'Banana, cruda';
    ok(w.eval('!!FOODBYNAME[' + JSON.stringify(avena) + '] && !!FOODBYNAME[' + JSON.stringify(banana) + ']'), 'Ricette: gli ingredienti di prova esistono nella banca dati');
    w.eval('var _alimPrima=JSON.stringify(DOC.alimentazione), _ricPrima=JSON.stringify(DOC.ricette||[]); DOC.ricette=[{id:"r1",nome:"Porridge di prova",porzioni:2,pesoFinale:"",ingredienti:[{alimento:' + JSON.stringify(avena) + ',grammi:80},{alimento:' + JSON.stringify(banana) + ',grammi:120}]}];');
    const atteso = J('(function(){ var a=FOODBYNAME[' + JSON.stringify(avena) + '].per100, b=FOODBYNAME[' + JSON.stringify(banana) + '].per100; return {kcal:(a.kcal*0.8+b.kcal*1.2)/200*100, prot:(a.proteine*0.8+b.proteine*1.2)/200*100}; })()');
    const fo = J('foodLookup("Porridge di prova")');
    ok(fo && fo.tipo === 'M' && Math.abs(fo.per100.kcal - atteso.kcal) < 1e-9 && Math.abs(fo.per100.proteine - atteso.prot) < 1e-9,
       'Ricette: i valori per 100 g sono la somma degli ingredienti divisa per il peso (' + Math.round(fo.per100.kcal) + ' kcal/100 g)');
    ok(Math.abs(w.eval('foodVal("Porridge di prova",200,"kcal")') - atteso.kcal * 2) < 1e-9, 'Ricette: nel piano la ricetta si conta come un alimento (200 g = ricetta intera)');
    w.eval('DOC.ricette[0].pesoFinale=100');
    ok(Math.abs(J('foodLookup("Porridge di prova")').per100.kcal - atteso.kcal * 2) < 1e-9, 'Ricette: col peso finale da cotto (100 g su 200 crudi) i valori per 100 g raddoppiano');
    w.eval('DOC.ricette[0].pesoFinale=""; DOC.ricette[0].ingredienti.push({alimento:"Ingrediente inventato",grammi:50});');
    ok(Math.abs(J('ricettaTotali(DOC.ricette[0])').kcal - atteso.kcal * 2) < 1e-9, 'Ricette: un ingrediente fuori banca dati non aggiunge valori (e non rompe la somma)');
    w.eval('DOC.ricette[0].ingredienti.pop()');
    /* rinomina: il piano e i preferiti seguono il nome */
    w.eval('DOC.alimentazione.bulk=[{pasto:"Colazione",alimento:"Porridge di prova",grammi:150}]; DOC.alimentazione.fav=["Porridge di prova"]; DOC.dati_utente.faseAlim="bulk";');
    w.eval('apriRicetta("Porridge di prova")');
    ok(d.getElementById('ric-nome') && d.querySelectorAll('#modal [data-ring]').length === 2 && /Totale ricetta|Whole recipe/.test(d.getElementById('modal').textContent),
       'Ricette: l\'editor mostra ingredienti e totale della ricetta');
    d.getElementById('ric-nome').value = 'Porridge rinominato'; d.getElementById('ric-ok').click();
    ok(w.eval('DOC.alimentazione.bulk[0].alimento') === 'Porridge rinominato' && w.eval('DOC.alimentazione.fav[0]') === 'Porridge rinominato',
       'Ricette: rinominando, le righe del piano e i preferiti seguono il nuovo nome');
    w.eval('apriRicetta("Porridge rinominato")'); d.getElementById('ric-nome').value = avena;
    let msg = ''; w.alert = x => { msg = String(x); }; d.getElementById('ric-ok').click();
    ok(/banca dati|database/.test(msg) && w.eval('DOC.ricette[0].nome') === 'Porridge rinominato', 'Ricette: non si può dare a una ricetta il nome di un alimento della banca dati');
    w.eval('closeModal()');
    /* selettore: la categoria «Le mie ricette» c'è nel piano, non fra gli ingredienti */
    w.eval('openFoodPicker("bulk",0)');
    ok(d.querySelector('#modal [data-fptipo="M"]') !== null, 'Selettore: c\'è la categoria «👨‍🍳 Le mie ricette»');
    w.eval('apriSelettoreAlimenti({senzaMie:true, scegli:function(){}, chiudi:closeModal})');
    ok(d.querySelector('#modal [data-fptipo="M"]') === null && !/Porridge rinominato/.test(d.getElementById('modal').textContent),
       'Selettore degli ingredienti: niente ricette personali (niente ricette dentro ricette)');
    w.eval('closeModal()');
    /* periodi: fotografia anche della ricetta */
    /* senza altri periodi: il periodo dimostrativo in corso arriva fino a oggi e si sovrapporrebbe */
    const perPrima = w.eval('JSON.stringify(DOC.alimentazione.periodi)'); w.eval('DOC.alimentazione.periodi=[]');
    w.eval('registraPeriodo()'); d.getElementById('per-fase').value = 'bulk'; d.getElementById('per-ok').click();
    await new Promise(r => setTimeout(r, 30));
    const kPer = w.eval('kcalPiano(DOC.alimentazione.periodi[DOC.alimentazione.periodi.length-1].righe, DOC.alimentazione.periodi[DOC.alimentazione.periodi.length-1].ricette)');
    w.eval('DOC.ricette[0].ingredienti[0].grammi=300');
    ok(w.eval('(DOC.alimentazione.periodi[DOC.alimentazione.periodi.length-1].ricette||[]).length') === 1 &&
       Math.abs(w.eval('kcalPiano(DOC.alimentazione.periodi[DOC.alimentazione.periodi.length-1].righe, DOC.alimentazione.periodi[DOC.alimentazione.periodi.length-1].ricette)') - kPer) < 1e-9,
       'Periodi: conservano la ricetta di allora, cambiarla dopo non cambia le kcal del periodo');
    w.eval('closeModal(); DOC.alimentazione.periodi=' + perPrima);
    /* suggerimenti */
    const sf = J('suggerimenti("ferro",{ordine:"g"}).map(function(x){ return {n:x.f.nome,c:x.f.categoria||"",v:x.v}; })');
    ok(sf.length === 20 && sf.every((x, i) => i === 0 || sf[i - 1].v >= x.v), 'Suggerimenti: i 20 alimenti più ricchi, in ordine decrescente');
    ok(!sf.some(x => /Erbe aromatiche|Ingredienti e aiuti|Spezie|Diversi/.test(x.c) || /rosmarino|timo|alghe|nori/i.test(x.n)),
       'Suggerimenti: niente spezie, erbe o alghe secche (si mangiano in quantità minime)');
    ok(J('suggerimenti("vitC",{ordine:"kcal"}).every(function(x){ return x.f.per100.kcal>=20; })'), 'Suggerimenti: «per 100 kcal» ignora gli alimenti quasi senza calorie');
    w.eval('DOC.alimentazione.bulk=[{pasto:"Colazione",alimento:' + JSON.stringify(banana) + ',grammi:100}]; showTab("alimentazione");');
    const sugg = [...d.querySelectorAll('#alim-side [data-sugg]')].map(b => b.dataset.sugg);
    ok(sugg.length > 0 && !sugg.includes('kcal') && !sugg.includes('sodio') && !sugg.includes('grassi'), 'Suggerimenti: il 💡 compare solo sugli obiettivi sotto il riferimento, non sui limiti né sull\'energia');
    d.querySelector('#alim-side [data-sugg]').click();
    ok(/Alimenti ricchi di|Foods rich in/.test(d.getElementById('modal').textContent) && d.querySelectorAll('#modal [data-sadd]').length > 0, 'Suggerimenti: il 💡 apre l\'elenco con il pulsante per aggiungerli al pasto');
    const nPrima = w.eval('DOC.alimentazione.bulk.length'); d.querySelector('#modal [data-sadd]').click();
    ok(w.eval('DOC.alimentazione.bulk.length') === nPrima + 1 && w.eval('DOC.alimentazione.bulk[DOC.alimentazione.bulk.length-1].grammi') === 100, 'Suggerimenti: «＋» aggiunge 100 g dell\'alimento al pasto scelto');
    w.eval('DOC.alimentazione=JSON.parse(_alimPrima); DOC.ricette=JSON.parse(_ricPrima); closeModal(); showTab("allenamento");'); }
  /* ── ricerca esercizi: i preferiti che corrispondono vanno in cima ── */
  { w.eval('(DOC.esercizi||[]).forEach(function(e){ e.fav=false; }); var t2=esLookup("Trazioni presa supina (chin-up)"); if(t2) t2.fav=true;');
    w.eval('pickExercise("", function(){}, null); document.getElementById("exp-q").value="trazioni"; document.getElementById("exp-q").oninput();');
    const primo = d.querySelector('#exp-list .exp-it');
    ok(d.querySelector('#exp-list .exp-grp') !== null && /Preferiti|Favourites|Favorites/.test(d.querySelector('#exp-list .exp-grp').textContent),
       'Ricerca: i preferiti corrispondenti aprono l\'elenco');
    ok(primo && primo.dataset.nome === 'Trazioni presa supina (chin-up)',
       'Ricerca: il preferito è il PRIMO risultato (Invio sceglie quello che usi davvero)');
    w.eval('closeModal(); (DOC.esercizi||[]).forEach(function(e){ e.fav=false; });') }
  /* ＋ Esercizio con scelta del giorno */
  { const nPrima = w.eval('DOC.scheda.settimanale.length'); w.eval('aggiungiEsercizioModal()');
    ok(d.getElementById('m-day') !== null, 'Pesi: ＋ Esercizio apre la scelta del giorno');
    const opz = [...d.querySelectorAll('#m-day option')].map(o => o.value), nuovo = opz[opz.length - 1];
    ok(/^Giorno \d+$/.test(nuovo) && /nuovo|new/.test(d.querySelector('#m-day option:last-child').textContent), 'Pesi: fra i giorni c\'è il successivo, segnato «nuovo» (' + nuovo + ')');
    w.eval('document.getElementById("m-day").value=' + JSON.stringify(nuovo) + ';'); d.getElementById('m-ok').click();
    ok(w.eval('DOC.scheda.settimanale.length') === nPrima + 1 && w.eval('DOC.scheda.settimanale.some(r=>r.giorno===' + JSON.stringify(nuovo) + '&&!r.esercizio)'), 'Pesi: l\'esercizio viene aggiunto nel giorno scelto (' + nuovo + ')'); }
  /* ── giorni numerati (2026-11-14): «Giorno 1, 2, 3» al posto dei nomi della settimana ── */
  { w.eval('var _schPrima=JSON.stringify(DOC.scheda); DOC.scheda={settimanale:[{giorno:"Mercoledì",esercizio:"Panca piana con bilanciere - presa media",serie:3,rip:8,peso:70},{giorno:"Lunedì",esercizio:"Squat con bilanciere",serie:4,rip:5,peso:100},{giorno:"Venerdì",esercizio:"Squat con bilanciere",serie:3,rip:5,peso:90}], mensile:[], riscaldamento:{settimanale:[{giorno:"Venerdì",esercizio:"Cyclette",min:10}]}, rpe:{settimanale:{"Lunedì":{rpe:7,min:60}}}, setAttivo:"Base", setsSalvati:{Casa:{settimanale:[{giorno:"Martedì",esercizio:"Squat con bilanciere",serie:3,rip:5,peso:60}],mensile:[]}}, setsOrdine:["Base","Casa"]};');
    ok(w.eval('migrateGiorniScheda()') === true, 'Giorni numerati: la scheda coi nomi della settimana viene rinumerata');
    ok(w.eval('JSON.stringify(DOC.scheda.settimanale.map(r=>r.giorno))') === '["Giorno 2","Giorno 1","Giorno 3"]', 'Giorni numerati: Lunedì → Giorno 1, Mercoledì → 2, Venerdì → 3 (nell\'ordine della settimana)');
    ok(w.eval('DOC.scheda.riscaldamento.settimanale[0].giorno') === 'Giorno 3' && w.eval('!!DOC.scheda.rpe.settimanale["Giorno 1"] && !DOC.scheda.rpe.settimanale["Lunedì"]'),
       'Giorni numerati: riscaldamenti e RPE del giorno seguono la stessa numerazione');
    ok(w.eval('DOC.scheda.setsSalvati.Casa.settimanale[0].giorno') === 'Giorno 1', 'Giorni numerati: anche i Training Set salvati');
    ok(w.eval('migrateGiorniScheda()') === false, 'Giorni numerati: la migrazione è idempotente');
    ok(w.eval('rowSeduta(sedutaMap(DOC.scheda.settimanale),DOC.scheda.settimanale[2])') === 2, 'Giorni numerati: lo squat del Giorno 3 è la 2ª seduta (S2), dopo quella del Giorno 1');
    w.eval('renderAllenamento()');
    ok([...d.querySelectorAll('#panel-allenamento tr.day-sep')].some(x=>/Giorno 1/.test(x.textContent)) && ![...d.querySelectorAll('#panel-allenamento tr.day-sep')].some(x=>/Luned|Mercoled|Venerd/.test(x.textContent)), 'Giorni numerati: nella scheda si legge «Giorno 1», non più i nomi della settimana');
    w.eval('addDay()'); ok(d.getElementById('m-day').value === 'Giorno 4', 'Aggiungi giorno: propone il successivo (Giorno 4)');
    w.eval('document.getElementById("m-day").value="Giorno 4"; closeModal();');
    w.eval('inserisciGiorno(DOC.scheda.settimanale,{giorno:"Giorno 2",esercizio:"",serie:1,rip:1,peso:0}); inserisciGiorno(DOC.scheda.settimanale,{giorno:"Giorno 9",esercizio:"",serie:1,rip:1,peso:0});');
    ok(w.eval('DOC.scheda.settimanale[DOC.scheda.settimanale.length-1].giorno') === 'Giorno 9', 'Giorni numerati: un giorno nuovo va al suo posto nella sequenza');
    ok(Math.abs(w.eval('fosterWeek({"Giorno 1":420,"Giorno 2":560,"Giorno 3":300}).monotony') - w.eval('fosterWeek({"Lunedì":420,"Mercoledì":560,"Venerdì":300}).monotony')) < 1e-12 &&
       Math.abs(w.eval('fosterWeek({"Giorno 1":420,"Giorno 2":560,"Giorno 3":300}).monotony') - 0.8227) < 1e-3,
       'Monotonia: coi giorni numerati è la stessa (i giorni senza seduta valgono 0 su 7)');
    w.eval('DOC.scheda=JSON.parse(_schPrima); renderAllenamento();'); }
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
  await w.eval('eliminaTrainingSet()');
  w.eval('window.confirm=window.__oc3;');
  ok(w.eval('DOC.scheda.setAttivo') === 'Casa' && w.eval('DOC.scheda.setsOrdine.indexOf("Palestra")<0'), 'Training Set: elimina il set attivo → ne attiva un altro (Casa)');
  ok(w.eval('DOC.scheda.settimanale.length') === 2 && w.eval('DOC.scheda.settimanale[0].peso') === 50, 'Training Set: dopo l\'eliminazione la scheda attiva è quella di Casa (2 esercizi, peso 50)');
  w.eval('creaTrainingSet("Vuota","__vuota__")');
  ok(w.eval('DOC.scheda.setAttivo') === 'Vuota' && w.eval('DOC.scheda.settimanale.length') === 0, 'Training Set: «Scheda vuota» crea un set senza esercizi');
  ok(w.eval('DOC.scheda.setsOrdine.length') === 2 && w.eval('!!DOC.scheda.setsSalvati["Casa"]') === true, 'Training Set: due set totali (Casa salvato, Vuota attivo)');
  /* la barra Pesi mostra il menù Training Set (in stile app) con le AZIONI dentro il riquadro (niente bottoni separati) */
  w.eval('showTab("allenamento")');
  ok(d.getElementById('training-set') !== null && d.getElementById('training-set').tagName === 'BUTTON' && d.getElementById('ts-new') === null && d.getElementById('ts-del') === null, 'Training Set: solo il menù nella barra (niente bottoni separati)');
  ok(d.getElementById('training-set').value === 'Vuota' && d.querySelector('#training-set .tnd__val').textContent === 'Vuota', 'Training Set: il menù mostra il set attivo (Vuota)');
  d.getElementById('training-set').click();
  { const voci = [...d.querySelectorAll('#tnd-pop .tnd-lista [data-tnd-v]')].map(b => b.dataset.tndV), az = [...d.querySelectorAll('#tnd-pop .tnd-azioni [data-tnd-v]')].map(b => b.dataset.tndV);
    ok(voci.join('|') === 'Casa|Vuota' && d.querySelector('#tnd-pop .tnd-voce.is-sel').dataset.tndV === 'Vuota', 'Training Set: al clic il riquadro elenca i set, con la spunta su quello attivo');
    ok(['__new__', '__cerca__', '__rename__', '__delete__'].every(v => az.includes(v)) && !voci.some(v => v.startsWith('__')), 'Training Set: le azioni (Nuovo, Gestisci i gruppi, Rinomina, Elimina) stanno in fondo, separate dai set'); }
  /* scegliere «Nuovo…» dal menù apre il modale e chiude il riquadro */
  d.querySelector('#tnd-pop [data-tnd-v="__new__"]').click();
  ok(d.getElementById('ts-nome') !== null && d.getElementById('tnd-pop') === null && w.eval('DOC.scheda.setAttivo') === 'Vuota', 'Training Set: «Nuovo…» apre il modale e chiude il menù');
  w.eval('closeModal();');
  /* scegliere un set dal menù lo attiva */
  d.getElementById('training-set').click(); d.querySelector('#tnd-pop [data-tnd-v="Casa"]').click();
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
    ok(w.eval('isCorpoLibero("Pike da appeso")') === false && w.eval('isCorpoLibero("Wind sprint (alla sbarra)")') === false,
       'corpo libero: FUORI pike e wind sprint (nessuna quota assegnata)');
    /* quote PARZIALI (2026-09-14): i leg raise sollevano le sole gambe — massa delle due
       gambe secondo de Leva 1996 (M 0,40 / F 0,42), a ginocchia piegate 0,25 per la leva */
    w.eval('DOC.dati_utente=DOC.dati_utente||{}; DOC.dati_utente.sesso="M";');
    ok(w.eval('quotaCorpo("Trazioni alla sbarra (pull-up)")') === 1 && w.eval('quotaCorpo("Panca piana con bilanciere - presa media")') === 0,
       'quotaCorpo: 1 per le trazioni, 0 per un bilanciere');
    ok(w.eval('quotaCorpo("Leg raise da appeso")') === 0.40 && w.eval('quotaCorpo("Sollevamento ginocchia/anche alle parallele")') === 0.40,
       'quotaCorpo: leg raise a gambe TESE = 0,40 (uomo) — anche il «sollevamento ginocchia» alle parallele, che per istruzioni è a gambe distese');
    ok(w.eval('quotaCorpo("Leg pull-in")') === 0.25 && w.eval('quotaCorpo("Sollevamento delle anche a ginocchia piegate")') === 0.25,
       'quotaCorpo: a ginocchia PIEGATE = 0,25 (stessa massa, leva ridotta)');
    w.eval('DOC.dati_utente.sesso="F";');
    ok(w.eval('quotaCorpo("Leg raise da appeso")') === 0.42 && w.eval('quotaCorpo("Leg pull-in")') === 0.25,
       'quotaCorpo: donna → gambe tese 0,42 (de Leva), ginocchia piegate invariate');
    w.eval('DOC.dati_utente.sesso="M";');
    ok(w.eval('isCorpoLibero("Leg raise da appeso")') === true && w.eval('isCorpoLibero("Leg raise da appeso -N2")') === true,
       'corpo libero: i leg raise ora contano (anche col suffisso di seduta)');
    { const rLeg = { esercizio:'Leg raise da appeso', serie:3, rip:10, peso:0, rir:'' };
      ok(Math.abs(w.eval('caricoEff(' + JSON.stringify(rLeg) + ')') - pc * 0.40) < 0.01,
         'leg raise: carico effettivo = 40% del corpo (' + Math.round(pc * 0.4) + ' kg su ' + pc + ')');
      const rLegZ = { esercizio:'Leg raise da appeso', serie:3, rip:10, peso:5, rir:'' };
      ok(Math.abs(w.eval('caricoEff(' + JSON.stringify(rLegZ) + ')') - (pc * 0.40 + 5)) < 0.01, 'leg raise: la zavorra alle caviglie si somma alla quota');
      ok(w.eval('rmMostrato(' + JSON.stringify(rLegZ) + ')') < w.eval('sRM(' + JSON.stringify(rLegZ) + ')'),
         'leg raise: il 1RM mostrato toglie solo la quota di corpo, non tutto il peso');
      ok(w.eval('sTL(' + JSON.stringify(rLeg) + ')') > 0 && w.eval('sTL(' + JSON.stringify(rLeg) + ')') < w.eval('sTL(' + JSON.stringify({ esercizio:'Trazioni alla sbarra (pull-up)', serie:3, rip:10, peso:0, rir:'' }) + ')'),
         'leg raise: produce TL, ma meno di una trazione a pari serie e ripetizioni'); }
    /* ogni nome delle quote parziali deve esistere nel catalogo, come per l'elenco al 100% */
    ok(w.eval('Object.keys(CORPO_LIBERO_PARZIALE).filter(function(n){ return !esLookup(n); }).length') === 0,
       'quote parziali: tutti i ' + w.eval('Object.keys(CORPO_LIBERO_PARZIALE).length') + ' nomi esistono nel catalogo');
    /* la pillola nella scheda dice quanto corpo entra davvero e in che proporzione */
    const schedaPre = w.eval('JSON.stringify(DOC.scheda.settimanale)');
    w.eval('DOC.scheda.settimanale=[{giorno:"Lunedì",esercizio:"Leg raise da appeso",serie:3,rip:10,peso:0}]; renderAllenamento();');
    { const pill = [...d.querySelectorAll('#panel-allenamento .pill')].map(e => e.textContent).find(x => x.includes('kg') && x.includes('40%'));
      ok(!!pill && pill.includes('+' + Math.round(pc * 0.4)), 'leg raise: la pillola mostra «+' + Math.round(pc * 0.4) + ' kg (40%)», non il corpo intero'); }
    w.eval('DOC.scheda.settimanale=' + schedaPre + '; renderAllenamento();');   /* la scheda torna com’era: i test dopo ci contano */
    /* ── kg MOSTRATI per il corpo libero: sempre la zavorra, mai il totale (2026-09-29) ──
       Prima la card dei Record e il grafico di progressione davano il totale (corpo +
       zavorra), mentre la colonna 1RM dava la zavorra: due numeri diversi per la stessa cosa. */
    { const T = 'Trazioni alla sbarra (pull-up)', pre = w.eval('DOC.storico.length');
      w.eval('DOC.storico.push({scheda:209801,esercizio:' + JSON.stringify(T) + ',serie:3,rip:6,peso:12,set:""},' +
             '{scheda:209802,esercizio:' + JSON.stringify(T) + ',serie:3,rip:9,peso:12,set:""},' +
             '{scheda:209803,esercizio:' + JSON.stringify(T) + ',serie:3,rip:15,peso:10,set:""});');
      const rec = JSON.parse(w.eval('JSON.stringify(realMax(' + JSON.stringify(T) + '))'));
      ok(rec.peso === 12, 'record trazioni: la card mostra la ZAVORRA massima (12), non il totale (' + Math.round(12 + pc) + ')');
      ok(rec.rip === 9, 'record trazioni: a parità di zavorra vince chi ha fatto più ripetizioni (12 kg ×9 batte 12 kg ×6)');
      const pl = JSON.parse(w.eval('JSON.stringify(prList().find(function(p){return p.nome===' + JSON.stringify(T) + ';}))'));
      ok(pl && pl.peso === 12, 'record trazioni: anche l\'elenco record del Report usa la zavorra');
      const pg = JSON.parse(w.eval('JSON.stringify(exProgression(' + JSON.stringify(T) + ').find(function(p){return p.scheda===209802;}))'));
      ok(pg.peso === 12 && pg.rm < 12 + pc, 'progressione trazioni: «Peso max» e «1RM» sono entrambi in zavorra, coerenti nello stesso grafico');
      /* solo a corpo libero (zavorra 0) è comunque un record, non «nessun dato» */
      w.eval('DOC.storico=DOC.storico.filter(function(r){return r.esercizio!==' + JSON.stringify(T) + ';});');
      w.eval('DOC.storico.push({scheda:209804,esercizio:' + JSON.stringify(T) + ',serie:3,rip:11,peso:0,set:""});');
      const solo = JSON.parse(w.eval('JSON.stringify(realMax(' + JSON.stringify(T) + '))'));
      ok(solo && solo.peso === 0 && solo.rip === 11, 'record trazioni: con sole serie a corpo libero il record è «0 kg ×11», non vuoto');
      /* i bilancieri non cambiano: lì peso scritto e carico coincidono */
      ok(w.eval('pesoMostrato({esercizio:"Squat con bilanciere",peso:120})') === w.eval('caricoEff({esercizio:"Squat con bilanciere",peso:120})'),
         'record bilanciere: kg mostrati = carico, invariati');
      w.eval('DOC.storico.length=' + pre + ';'); }
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
      ok(pill !== null && pill.querySelector('use[href="#i-corpo"]') && new RegExp(String(Math.round(pc))).test(pill.textContent),
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
  /* ── Progressi: stesso conteggio del ⚖ Bilanciamento (unificato) ── */
  { const code = 202698;
    const pre = w.eval('DOC.storico.length');
    w.eval('DOC.storico.push({scheda:' + code + ',giorno:"Lunedì",esercizio:"Panca piana con bilanciere - presa media",macro:"Pettorali",serie:4,rip:6,peso:80,set:"Base"});');
    const a = JSON.parse(w.eval('JSON.stringify(schedeAggr().filter(function(x){return x.scheda===' + code + ';})[0].sets)'));
    ok(a['Pettorali'] === 4 && a['Spalle'] === 2 && a['Braccia'] === 2,
       'Progressi: le serie salvate si spalmano come nel Bilanciamento (panca → Spalle e Braccia a metà)');
    const tlPre = w.eval('schedeAggr().filter(function(x){return x.scheda===' + code + ';})[0].tl');
    ok(typeof tlPre === 'number' && tlPre > 0, 'Progressi: il TL resta il suo (il nuovo conteggio tocca solo le serie)');
    w.eval('showTab("progressi")');
    const hp = d.getElementById('panel-progressi').innerHTML;
    ok(/fill-rule="evenodd"/.test(hp), 'Progressi: il radar mostra la fascia di riferimento come il Bilanciamento');
    { const box = [...d.querySelectorAll('#panel-progressi .chart-box')].find(b => /Equilibrio · distribuzione/.test(b.textContent));
      ok(!!box && box.querySelectorAll('svg text.lbl').length === 6 && !/Cardio/.test(box.querySelector('svg').textContent),
         'Progressi: la ragnatela «Equilibrio · distribuzione» ha i 6 gruppi dei pesi, senza Cardio');
      const barre = [...d.querySelectorAll('#panel-progressi .chart-box')].find(b => /Serie per gruppo/.test(b.textContent));
      ok(!!barre && /Cardio/.test(barre.textContent), 'Progressi: il Cardio resta visibile nelle barre «Serie per gruppo» (quantità)'); }
    ok(!/>10<\/text>/.test(hp) || !/>20<\/text>/.test(hp),
       'Progressi: via le vecchie soglie fisse 10/20 dal grafico a barre (ogni gruppo ha la sua zona)');
    w.eval('DOC.storico.length=' + pre + '; showTab("allenamento");');
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
  /* FOTO dal telefono collegato: dal data-URI al file binario in foto/ + metadati in DOC.foto */
  { const nFotoPre = w.eval('(DOC.foto||[]).length');
    const imgUri = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT,'docs','img','logo.png')).toString('base64');
    const nSalvate = await w.eval('importaFotoRientro(' + JSON.stringify([{tag:'fronte',data:'2026-08-17',img:imgUri},{tag:'retro',data:'2026-08-17',img:imgUri}]) + ')');
    ok(nSalvate === 2 && w.eval('(DOC.foto||[]).length') === nFotoPre + 2, 'foto dal telefono: le due immagini vengono salvate (metadati in DOC.foto)');
    { const ff = w.eval('DOC.foto[DOC.foto.length-2]');
      ok(ff.tag === 'fronte' && ff.data === '2026-08-17' && /^f\d+-[a-z0-9]+\.png$/.test(ff.file), 'foto dal telefono: tag, data e nome file nel formato del tab Corpo (' + ff.file + ')');
      ok(w.eval('(function(){var n=DOC.foto[DOC.foto.length-2].file; return !!(dirHandle||window.tmsFS);})()'), 'foto dal telefono: scritte tramite lo stesso canale binario delle altre foto'); }
    /* l'ordinamento delle viste riconosce i tag veri (fronte/lato/retro) */
    ok(w.eval('fotoViewOrder("fronte")') === 0 && w.eval('fotoViewOrder("lato")') === 1 && w.eval('fotoViewOrder("retro")') === 2, 'foto: ordine viste fronte→lato→retro');
    ok(w.eval('fotoViewOrder("anteriore")') === 0 && w.eval('fotoViewOrder("posteriore")') === 2, 'foto: riconosciuti anche i sinonimi lunghi (anteriore/posteriore)');
    w.eval('DOC.foto.length=' + nFotoPre + ';');   /* ripulisce: i test foto successivi partono dallo stato del template */
  }
  /* v1.0.67: guida senza link ai PDF locali, footer senza motto, backup col nome del profilo */
  w.eval('showTab("guida")');
  w.eval('guidaMode = "completa"; renderGuida()');
  const guida = d.getElementById('panel-guida').innerHTML;
  ok(!guida.includes('Documentazione/') && guida.includes('doi.org'), 'Guida §12 (completa): niente link locali, restano DOI/Scholar');
  /* la guida spiega il telefono collegato (rapida e completa) */
  ok(guida.includes('gc-scambio') && guida.includes('Una scheda sola, due schermi') && guida.includes('TMS Scheda') && !guida.includes('Crea il file per il coach'), 'Guida completa: sezione 10 Scheda ↔ cliente (app TMS Scheda)');
  ok(guida.includes('14 · Licenza'), 'Guida completa: sezioni rinumerate (Licenza = 14)');
  ok(!/class="sec[^"]*"[^>]*>▌/.test(guida), 'Guida: nessun glifo ▌ nelle intestazioni (la barra è quella del CSS, non doppia)');
  w.eval('guidaMode = "rapida"; renderGuida()');
  const rapida = d.getElementById('panel-guida').innerHTML;
  ok(rapida.includes('Telefono collegato') && !rapida.includes('📲 Esporta scheda') && !rapida.includes('Importa rientro'), 'Guida rapida: passo del telefono collegato, niente più file');
  ok(!d.body.innerHTML.includes('Tarnished'), 'nessuna istanza di «Rise, Tarnished»');
  const nomeBk = await w.eval('(async()=>{ let cap=null; const oc=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ cap=this.download; }; try{ await backupData(); } finally { HTMLAnchorElement.prototype.click=oc; } return cap; })()');
  ok(typeof nomeBk === 'string' && nomeBk.startsWith('TMS-backup-atleta-template-'), 'backup col nome del profilo attivo (' + nomeBk + ')');
  /* ── Semaforo clienti: triage integrato in ogni riga profilo, SOLA LETTURA ── */
  w.eval('profOpen = null; showTab("profilo")');
  ok(d.getElementById('cr-led-template') !== null && d.getElementById('cr-led-wander') !== null, 'semaforo: pallino in ogni riga profilo (niente box separato che duplica)');
  ok(d.getElementById('cruscotto-box') === null, 'semaforo: nessuna sezione cruscotto separata (unificata nella lista profili)');
  ok(d.querySelector('#cr-sum-template') !== null, 'semaforo: la riga del profilo porta la sintesi sotto il nome');
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
  ok(d.getElementById('cr-led-template').textContent === '●' && d.getElementById('cr-led-template').style.color !== '', 'semaforo: pallino dipinto (col suo colore) sulla riga del template');
  ok(d.getElementById('cr-sum-template').innerHTML.includes('ACWR'), 'semaforo: sintesi (ACWR · aggiornamento · monotonia) sotto il nome');
  ok(d.getElementById('cr-led-template').title.length > 10 && d.getElementById('cr-led-template').title !== 'Stato in calcolo…', 'semaforo: il significato del pallino sta nel suo suggerimento');
  /* ── Foto progressi: template demo → player «tutti» a gruppi + confronto a calendario ── */
  w.eval('switchProfile("template")'); await settle(300);
  w.eval('showTab("corpo")');
  ok(w.eval('(DOC.foto||[]).length') === 45, 'foto: template con le foto demo caricate (45: 15 date × 3 viste)');
  ok(w.eval('fotoDates().length') === 15, 'foto: 15 date distinte (fotoDates), una al mese');
  ok(w.eval('fotoTag="", fotoSteps().length') === 15 && w.eval('fotoSteps()[0].foto.length') === 3, 'foto: vista «tutti» = un passo per data con 3 viste affiancate');
  ok(w.eval('fotoTag="anteriore", fotoSteps().length') === 15 && w.eval('fotoSteps()[0].foto.length') === 1, 'foto: vista specifica = una foto per passo');
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
  ok(wEn.eval("renderProfilo(); document.getElementById('lnk-storico').textContent").includes('History') , 'EN: riga del profilo «Storico» → «History»');
  ok(dEn.getElementById('btn-impost').title === 'Settings, guide and reports', 'EN: suggerimento di ⚙ tradotto');
  ok(/select the <strong>TMS<\/strong> folder/i.test(dEn.getElementById('overlay-sub').innerHTML), 'EN: overlay-sub (data-i18n-html) tradotto');
  ok(dEn.getElementById('btn-lang').textContent === 'IT', 'EN: il pulsante lingua propone «IT»');
  ok(wEn.eval("renderProfilo(); document.getElementById('prof-new').textContent") === '＋ New profile', 'EN: tab Profilo «＋ Nuovo profilo» → «＋ New profile»');
  ok(wEn.eval("renderProfilo(); (document.querySelector('#panel-profilo .sec')||{}).textContent||''").includes('Backup (all profiles together)'), 'EN: tab Profilo sezione Backup tradotta');
  ok(wEn.eval("renderAllenamento(); document.getElementById('btn-save-sched').textContent") === 'Save to History', 'EN: tab Pesi «Salva nello Storico» tradotto');
  ok(wEn.eval("exName('Squat con bilanciere')") === 'Barbell Squat', 'EN: nome esercizio dall\'inglese originale (ESEN per nome)');
  ok(wEn.eval("exName('Panca piana con bilanciere - presa media')") === 'Barbell Bench Press - Medium Grip', 'EN: nome esercizio composto tradotto');
  await settle(400);   /* lascia finire il semaforo del tab Profilo (asincrono) prima di chiudere la finestra */
  domEn.window.close();
}

console.log('--- T7: revisione 2026-11 — protezione dei dati ---');
{
  /* ricette CONDIVISE (2026-11-13): file proprio accanto al catalogo esercizi, migrazione
     delle ricette nate nei profili, rinomina seguita dagli altri profili, scarico in chiusura */
  const fsmem = makeTmsFS(); const J = o => JSON.stringify(o);
  const ing = g => [{ alimento: 'Fiocchi di avena', grammi: g }, { alimento: 'Banana, cruda', grammi: 100 }];
  await fsmem.writeFile('TMS_Dati/profili.json', J({ list: [{ slug: 'anna', nome: 'Anna', creato: '2026-01-01' }, { slug: 'bruno', nome: 'Bruno', creato: '2026-01-02' }], active: 'anna' }));
  for (const sl of ['anna', 'bruno']) {
    await fsmem.writeFile('TMS_Dati/' + sl + '/scheda.json', J({ settimanale: [], mensile: [] }));
    await fsmem.writeFile('TMS_Dati/' + sl + '/storico.json', '[]');
    await fsmem.writeFile('TMS_Dati/' + sl + '/corpo.json', J({ dati_utente: {}, storico_io: [] }));
    await fsmem.writeFile('TMS_Dati/' + sl + '/alimentazione.json', J({ bulk: [{ pasto: 'Colazione', alimento: 'Porridge', grammi: 200 }], mant: [], cut: [],
      ricette: [{ nome: 'Porridge', porzioni: 1, ingredienti: ing(sl === 'anna' ? 80 : 50) }] }));
  }
  const { dom, errors } = await load({ idb: makeIDB(), tmsFS: fsmem, fsa: true });
  await settleConnect(dom, fsmem); await settle(500);
  const w = dom.window, d = w.document; w.alert = () => {}; w.confirm = () => true;
  const ricFile = () => { try { return JSON.parse(fsmem._files.get('TMS_Dati/ricette.json')); } catch (e) { return null; } };
  ok(errors.length === 0 && !w.eval('scrittureBloccate'), 'ricette condivise: avvio senza errori');
  ok(w.eval('DOC.ricette.length') === 1 && (ricFile() || []).length === 1 && ricFile()[0].nome === 'Porridge',
     'ricette condivise: la ricetta nata nel profilo passa nel catalogo comune (TMS_Dati/ricette.json)');
  ok(!('ricette' in JSON.parse(fsmem._files.get('TMS_Dati/anna/alimentazione.json'))), 'ricette condivise: il file del profilo non la tiene più');
  await w.eval('switchProfile("bruno")'); await settle(500);
  ok(w.eval('DOC.ricette.length') === 2 && w.eval('DOC.ricette.some(r=>r.nome==="Porridge (bruno)")') && w.eval('DOC.alimentazione.bulk[0].alimento') === 'Porridge (bruno)',
     'ricette condivise: stesso nome con ingredienti diversi → «Porridge (bruno)», e il piano di Bruno segue');
  ok((ricFile() || []).length === 2, 'ricette condivise: il catalogo comune su disco ha le due ricette');
  w.eval('apriRicetta("Porridge")'); d.getElementById('ric-nome').value = 'Porridge classico'; d.getElementById('ric-ok').click(); await settle(500);
  ok(JSON.stringify(w.eval('DOC.ricette.find(r=>r.nome==="Porridge classico").alias')) === '["Porridge"]' && w.eval('!!foodLookup("Porridge")'),
     'ricette condivise: rinominata ricorda il vecchio nome, e chi usa ancora quello la ritrova');
  await w.eval('switchProfile("anna")'); await settle(600);
  ok(w.eval('DOC.alimentazione.bulk[0].alimento') === 'Porridge classico' && JSON.parse(fsmem._files.get('TMS_Dati/anna/alimentazione.json')).bulk[0].alimento === 'Porridge classico',
     'ricette condivise: aprendo Anna, il suo piano passa al nome nuovo (anche su disco)');
  ok(w.eval('foodVal("Porridge classico",180,"kcal")') > 0, 'ricette condivise: nel piano di Anna la ricetta conta le sue kcal');
  const snap = JSON.parse(await w.eval('costruisciSnapshot().then(s=>JSON.stringify(s))'));
  ok(Array.isArray(snap.ricette) && snap.ricette.length === 2, 'ricette condivise: il backup le comprende');
  w.eval('DOC.ricette.push({nome:"Chiusura",ingredienti:[{alimento:"Banana, cruda",grammi:100}]}); persist("ricette");');
  ok(w.eval('scaricaSubito()') >= 1 && (ricFile() || []).some(r => r.nome === 'Chiusura'), 'ricette condivise: alla chiusura la modifica in attesa parte subito');
  w.eval('annulla()'); await settle(500);
  ok(!w.eval('DOC.ricette.some(r=>r.nome==="Chiusura")'), 'ricette condivise: Ctrl+Z annulla anche le ricette');
  dom.window.close();
}
{
  /* ricette.json che c'è ma non si legge: non si riscrive vuoto, si bloccano le scritture */
  const fsmem = makeTmsFS(); const J = o => JSON.stringify(o);
  await fsmem.writeFile('TMS_Dati/profili.json', J({ list: [{ slug: 'anna', nome: 'Anna', creato: '2026-01-01' }], active: 'anna' }));
  for (const f of ['scheda', 'storico', 'corpo', 'alimentazione']) await fsmem.writeFile('TMS_Dati/anna/' + f + '.json', J(f === 'scheda' ? { settimanale: [], mensile: [] } : f === 'storico' ? [] : f === 'corpo' ? { dati_utente: {} } : { bulk: [], mant: [], cut: [] }));
  await fsmem.writeFile('TMS_Dati/ricette.json', '[{"nome":"Porridge","ingre');
  const { dom } = await load({ idb: makeIDB(), tmsFS: fsmem, fsa: true });
  await settleConnect(dom, fsmem); await settle(400);
  const w = dom.window; w.alert = () => {}; w.confirm = () => true;
  ok(!!w.eval('scrittureBloccate') && /ricette\.json/.test(w.eval('scrittureBloccate.file')), 'ricette.json illeggibile → salvataggio sospeso, col nome del file');
  ok(fsmem._files.get('TMS_Dati/ricette.json') === '[{"nome":"Porridge","ingre', 'ricette.json illeggibile: il file resta intatto');
  dom.window.close();
}
{
  /* profilo esistente su disco con lo STORICO illeggibile: l'app non deve riscriverlo */
  const fsmem = makeTmsFS();
  const J = o => JSON.stringify(o);
  await fsmem.writeFile('TMS_Dati/profili.json', J({ list:[{slug:'anna',nome:'Anna',creato:'2026-01-01'},{slug:'bruno',nome:'Bruno',creato:'2026-01-02'}], active:'anna' }));
  await fsmem.writeFile('TMS_Dati/anna/scheda.json', J({ settimanale:[{giorno:'Lunedì',esercizio:'Squat con bilanciere',serie:3,rip:5,peso:100}], mensile:[] }));
  await fsmem.writeFile('TMS_Dati/anna/storico.json', '[{"scheda":202640,"esercizio":"Squat con bil');   /* troncato */
  await fsmem.writeFile('TMS_Dati/anna/corpo.json', J({ dati_utente:{sesso:'F'}, storico_io:[] }));
  await fsmem.writeFile('TMS_Dati/anna/alimentazione.json', J({ bulk:[], mant:[], cut:[] }));
  const { dom, errors } = await load({ idb: makeIDB(), tmsFS: fsmem, fsa: true });
  await settleConnect(dom, fsmem); await settle(400);
  const w = dom.window, d = w.document;
  w.alert = () => {}; w.confirm = () => true;
  ok(errors.length === 0, 'storico rotto: nessun errore runtime' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  ok(!!w.eval('scrittureBloccate') && /storico\.json/.test(w.eval('scrittureBloccate.file')), 'storico illeggibile → salvataggio sospeso, col nome del file');
  ok(fsmem._files.get('TMS_Dati/anna/storico.json').startsWith('[{"scheda":202640,"esercizio":"Squat con bil') && fsmem._files.get('TMS_Dati/anna/storico.json').length < 60, 'il file rotto NON viene riscritto all\'avvio');
  ok(d.getElementById('conn').className.includes('is-err'), 'indicatore di connessione in errore (visibile)');
  ok(!d.getElementById('modal-bk').classList.contains('hidden') && d.getElementById('modal').textContent.includes('storico.json'), 'modale che spiega quale file non si legge');
  w.eval('closeModal(); DOC.storico.push({scheda:202641,esercizio:"X",serie:1,rip:1,peso:1}); persist("storico"); persist("*");');
  await settle(700);
  ok(fsmem._files.get('TMS_Dati/anna/storico.json').length < 60, 'col blocco attivo persist() non scrive (lo storico rotto resta intatto)');
  ok(w.eval('scaricaSubito()') === 0, 'col blocco attivo nemmeno lo scarico in chiusura scrive');
  dom.window.close();
}
{
  /* cambio profilo verso un profilo con un file rotto: si resta dove si è */
  const fsmem = makeTmsFS(); const J = o => JSON.stringify(o);
  await fsmem.writeFile('TMS_Dati/profili.json', J({ list:[{slug:'anna',nome:'Anna',creato:'2026-01-01'},{slug:'bruno',nome:'Bruno',creato:'2026-01-02'}], active:'anna' }));
  for (const f of ['scheda','storico','corpo','alimentazione']) await fsmem.writeFile('TMS_Dati/anna/'+f+'.json', J(f==='scheda'?{settimanale:[],mensile:[]}:f==='storico'?[{scheda:202640,esercizio:'Squat con bilanciere',seduta:1,macro:'Gambe',serie:3,rip:5,peso:100}]:f==='corpo'?{dati_utente:{}}:{bulk:[],mant:[],cut:[]}));
  await fsmem.writeFile('TMS_Dati/bruno/scheda.json', J({ settimanale:[], mensile:[] }));
  await fsmem.writeFile('TMS_Dati/bruno/storico.json', '');                    /* file vuoto = illeggibile, non «assente» */
  await fsmem.writeFile('TMS_Dati/bruno/corpo.json', J({ dati_utente:{}, storico_io:[{scheda:202640,peso:80}] }));
  const { dom, errors } = await load({ idb: makeIDB(), tmsFS: fsmem, fsa: true });
  await settleConnect(dom, fsmem); await settle(300);
  const w = dom.window, d = w.document; w.alert = () => {}; w.confirm = () => true;
  ok(w.eval('activeProfile') === 'anna' && !w.eval('scrittureBloccate') && w.eval('DOC.storico.length') === 1, 'profilo sano: caricato regolarmente');
  await w.eval('switchProfile("bruno")'); await settle(300);
  ok(w.eval('activeProfile') === 'anna' && w.eval('DOC.storico.length') === 1, 'cambio verso un profilo con file rotto: si resta sul profilo attuale');
  ok(fsmem._files.get('TMS_Dati/bruno/storico.json') === '' && JSON.parse(fsmem._files.get('TMS_Dati/bruno/corpo.json')).storico_io.length === 1, 'i file del profilo rotto non vengono toccati');
  ok(d.getElementById('modal').textContent.includes('bruno/storico.json'), 'avviso col file che non si legge');
  w.eval('closeModal()');

  /* salvataggio in attesa + cambio profilo: i dati del vecchio non finiscono nel nuovo */
  await fsmem.writeFile('TMS_Dati/bruno/storico.json', '[]');
  w.eval('DOC.scheda.settimanale.push({giorno:"Lunedì",esercizio:"Squat con bilanciere",serie:9,rip:9,peso:99}); persist("scheda");');
  await w.eval('switchProfile("bruno")'); await settle(700);
  ok(w.eval('activeProfile') === 'bruno', 'cambio profilo riuscito dopo aver sistemato il file');
  ok(JSON.parse(fsmem._files.get('TMS_Dati/anna/scheda.json')).settimanale.length === 1, 'la modifica in attesa è stata scritta nel profilo GIUSTO prima del cambio');
  ok(JSON.parse(fsmem._files.get('TMS_Dati/bruno/scheda.json')).settimanale.length === 0, 'la scheda del profilo di arrivo non riceve i dati del precedente');

  /* eliminare un profilo: la cartella va nel cestino interno, un omonimo nasce vuoto */
  await w.eval('deleteProfile("anna")'); await settle(400);
  ok(!fsmem._files.has('TMS_Dati/anna/storico.json'), 'profilo eliminato: la sua cartella non resta al suo posto');
  ok([...fsmem._files.keys()].some(k => /^TMS_Dati\/_eliminati\/anna-[^/]+\/storico\.json$/.test(k)), 'profilo eliminato: i dati passano in TMS_Dati/_eliminati/ (recuperabili)');
  await w.eval('createProfile("Anna")'); await settle(500);
  ok(w.eval('activeProfile') === 'anna' && w.eval('DOC.storico.length') === 0, 'profilo nuovo con lo stesso nome: parte VUOTO, non eredita i dati dell\'eliminato');
  /* eliminare il profilo ATTIVO: il cambio profilo non deve riscrivere la cartella appena tolta */
  w.eval('DOC.storico.push({scheda:202650,esercizio:"Squat con bilanciere",seduta:1,macro:"Gambe",serie:1,rip:1,peso:77}); persist("storico");'); await settle(500);
  await w.eval('deleteProfile("anna")'); await settle(500);
  ok(w.eval('activeProfile') === 'bruno' && !w.eval('profili.some(p=>p.slug==="anna")'), 'elimina il profilo ATTIVO: si passa a un altro profilo');
  ok(![...fsmem._files.keys()].some(k => k.startsWith('TMS_Dati/anna/')), 'elimina il profilo ATTIVO: la sua cartella non viene riscritta dal cambio profilo');
  ok([...fsmem._files.keys()].filter(k => /^TMS_Dati\/_eliminati\/anna-[^/]+\/storico\.json$/.test(k)).some(k => fsmem._files.get(k).includes('77')), 'elimina il profilo ATTIVO: i suoi ultimi dati sono nel cestino');
  await w.eval('createProfile("Anna")'); await settle(500);
  ok(w.eval('activeProfile') === 'anna' && w.eval('DOC.storico.length') === 0, 'profilo attivo eliminato e ricreato: parte vuoto');

  /* scarico immediato alla chiusura */
  w.eval('DOC.scheda.settimanale.push({giorno:"Martedì",esercizio:"Squat con bilanciere",note:"ULTIMO TASTO",serie:1,rip:1,peso:1}); persist("scheda");');
  ok(w.eval('scaricaSubito()') >= 1 && fsmem._files.get('TMS_Dati/anna/scheda.json').includes('ULTIMO TASTO'), 'chiusura: la modifica in attesa parte subito, senza aspettare i 350 ms');
  ok(w.eval('pendingSaves.size') === 0, 'chiusura: coda dei salvataggi svuotata');

  /* copia di sicurezza prima del ripristino */
  const snap = await w.eval('costruisciSnapshot().then(s=>JSON.stringify(s))');
  w.eval('DOC.storico.push({scheda:202644,esercizio:"Squat con bilanciere",seduta:1,macro:"Gambe",serie:1,rip:1,peso:150}); persist("storico");'); await settle(500);
  w.eval('window.__snap=' + JSON.stringify(snap) + ';');
  await w.eval('restoreData({text:async()=>window.__snap})'); await settle(400);
  let ind = null; try { ind = JSON.parse(fsmem._files.get('TMS_Dati/backup_automatici/indice.json')); } catch (e) {}
  ok(ind && Array.isArray(ind.sicurezza) && ind.sicurezza.length === 1 && fsmem._files.has('TMS_Dati/backup_automatici/' + ind.sicurezza[0].file), 'ripristino: prima viene salvata una copia di sicurezza dello stato attuale');
  { const cs = JSON.parse(fsmem._files.get('TMS_Dati/backup_automatici/' + ind.sicurezza[0].file));
    ok(cs.profiles.anna.storico.some(r => +r.peso === 150), 'la copia di sicurezza contiene i dati di PRIMA del ripristino'); }
  ok(w.eval('DOC.storico.length') === 0, 'ripristino applicato (lo storico torna quello del backup)');
  ok((await w.eval('listaCopieDiSicurezza()')).length === 1, 'la copia di sicurezza compare fra quelle ripristinabili');
  ok(errors.length === 0, 'nessun errore runtime' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  dom.window.close();
}

console.log('--- T8: revisione 2026-11 — calcoli e scheda ---');
{
  /* scenario autosufficiente (gira anche in CI, senza TMS_Dati): catalogo minimo + un profilo */
  const fsmem = makeTmsFS(); const J = o => JSON.stringify(o);
  const ES = (nome, macro, prim, sec) => ({ nome, macro, gruppo: macro, tipo: 'Multi-articolare', fattore: 1, muscoli_primari: prim, muscoli_secondari: sec, target: prim.concat(sec).join(', ') });
  await fsmem.writeFile('TMS_Dati/profili.json', J({ list: [{ slug: 'wander', nome: 'Wander', creato: '2026-01-01' }], active: 'wander' }));
  await fsmem.writeFile('TMS_Dati/esercizi.json', J([
    ES('Squat con bilanciere', 'Gambe', ['quadricipiti'], ['glutei']),
    ES('Trazioni alla sbarra (pull-up)', 'Schiena', ['gran dorsale'], ['bicipiti']),
    ES('Panca piana con bilanciere - presa media', 'Pettorali', ['pettorali'], ['tricipiti', 'spalle'])]));
  await fsmem.writeFile('TMS_Dati/wander/scheda.json', J({ settimanale: [{ giorno: 'Lunedì', esercizio: 'Squat con bilanciere', note: '', serie: 3, rip: 5, peso: 100, rest: '2:00' }], mensile: [], setAttivo: 'Base',
    setsSalvati: { Casa: { settimanale: [{ giorno: 'Lunedì', esercizio: 'Squat con bilanciere', note: '', serie: 3, rip: 10, peso: 40 }], mensile: [], riscaldamento: {} } }, setsOrdine: ['Base', 'Casa'] }));
  await fsmem.writeFile('TMS_Dati/wander/storico.json', J([202640, 202641].map(s => ({ scheda: s, esercizio: 'Squat con bilanciere', seduta: 1, test: false, macro: 'Gambe', serie: 3, rip: 5, peso: 100, rest: '2:00', rir: null, set: 'Base' }))));
  await fsmem.writeFile('TMS_Dati/wander/corpo.json', J({ dati_utente: { sesso: 'M', nascita: '1990-01-01', peso: 70, altezza: 175 }, storico_io: [] }));
  await fsmem.writeFile('TMS_Dati/wander/alimentazione.json', J({ bulk: [], mant: [], cut: [] }));
  const { dom, errors } = await load({ idb: makeIDB(), tmsFS: fsmem, fsa: true });
  await settleConnect(dom, fsmem);
  const w = dom.window, d = w.document; w.alert = () => {}; w.confirm = () => true;

  /* note della scheda Pesi */
  w.eval('showTab("allenamento")');
  { const ta = d.querySelector('#panel-allenamento textarea.note-area'); const i = +ta.closest('tr').dataset.i;
    ta.value = 'gomiti stretti'; ta.dispatchEvent(new w.Event('input', { bubbles: true }));
    ok(w.eval('schedaRows()[' + i + '].note') === 'gomiti stretti', 'scheda Pesi: la nota digitata arriva ai dati (la textarea non era ascoltata)');
    await settle(600);
    ok(fsmem._files.get('TMS_Dati/wander/scheda.json').includes('gomiti stretti'), 'scheda Pesi: la nota finisce su disco'); }
  { w.eval('renderAllenamento(); renderAllenamento(); renderAllenamento(); window.__n=0; var _p=document.getElementById("panel-allenamento"); var _o=_p.oninput; _p.oninput=function(e){ window.__n++; return _o&&_o(e); };');
    const ta = d.querySelector('#panel-allenamento textarea.note-area'); ta.dispatchEvent(new w.Event('input', { bubbles: true }));
    ok(w.eval('window.__n') === 1, 'scheda Pesi: un solo ascoltatore sul pannello anche dopo più ridisegni'); }

  /* settimana precedente con anni ISO da 53 settimane */
  ok(w.eval('weekPrev(202701)') === 202653, 'weekPrev: prima della 2027-01 c\'è la 2026-53 (anno ISO da 53 settimane)');
  ok(w.eval('weekPrev(202601)') === 202552 && w.eval('weekPrev(202610)') === 202609, 'weekPrev: cambio d\'anno normale e settimana qualsiasi');

  /* ACWR su settimane di calendario */
  const ag = a => 'caricoCronico(' + JSON.stringify(a.map(([s, tl]) => ({ scheda: s, tl }))) + ')';
  { const c = w.eval(ag([[202601,100],[202602,100],[202603,100],[202604,100]]));
    ok(Math.abs(c[3].acwr - 1) < 1e-9 && Math.abs(c[0].acwr - 1) < 1e-9, 'ACWR: settimane consecutive a carico costante = 1 (anche la prima)'); }
  { const c = w.eval(ag([[202601,100],[202602,100],[202603,100],[202604,100],[202608,100]]));
    ok(c[4].acwr > 3.9, 'ACWR: dopo tre settimane di stop il rientro a pieno carico risulta alto (prima: 1,00)'); }
  { const c = w.eval(ag([[202601,100],[202603,100],[202605,100],[202607,100]]));
    ok(Math.abs(c[3].acwr - 1) < 1e-9, 'ACWR: chi salva ogni due settimane non ha «buchi» (ritmo diverso, conteggio sulle registrazioni)'); }
  { const c = w.eval('caricoCronico(' + JSON.stringify([[202601,100],[202602,100],[202606,100]].map(([s, tl]) => ({ scheda: s, tl }))) + ', false)');
    ok(Math.abs(c[2].acwr - 1) < 1e-9, 'ACWR: vista filtrata per Training Set → sulle ultime registrazioni'); }
  ok(w.eval('settimaneFra(202652,202701)') === 2 && w.eval('settimaneFra(202653,202701)') === 1, 'settimaneFra: attraversa il cambio d\'anno con la settimana 53');

  /* «ultima volta» per esercizio */
  w.eval('DOC.storico.push({scheda:209901,esercizio:"Esercizio Raro",seduta:1,macro:"Gambe",serie:3,rip:8,peso:50},{scheda:209902,esercizio:"Altro",seduta:1,macro:"Gambe",serie:3,rip:8,peso:50});');
  ok(w.eval('lastBlockPesi("Esercizio Raro",1).length') === 1 && w.eval('lastBlockSets("Esercizio Raro",1).length') === 1, 'Δ TL / pallino: confronto con l\'ultima settimana in cui l\'esercizio è stato fatto, non con l\'ultima salvata');

  /* eliminare una settimana toglie anche RPE e riscaldamento salvati con lei */
  w.eval('DOC.storico_rpe=(DOC.storico_rpe||[]).concat([{scheda:209902,giorno:"Lunedì",rpe:7,min:60}]); DOC.storico_risc=(DOC.storico_risc||[]).concat([{scheda:209902,giorno:"Lunedì",esercizio:"Cyclette",min:10}]); eliminaScheda(209902);');
  d.getElementById('cc-si').click();
  ok(w.eval('DOC.storico.filter(r=>+r.scheda===209902).length') === 0 && w.eval('DOC.storico_rpe.filter(r=>+r.scheda===209902).length') === 0 && w.eval('DOC.storico_risc.filter(r=>+r.scheda===209902).length') === 0, 'elimina settimana: via anche il suo carico interno (RPE) e il cardio del riscaldamento');
  w.eval('DOC.storico=DOC.storico.filter(r=>+r.scheda<209900);');

  /* rinomina di un esercizio: i dati lo seguono */
  { const nome = w.eval('DOC.storico.find(r=>esLookup(r.esercizio)).esercizio'); const n0 = w.eval('DOC.storico.filter(r=>r.esercizio===' + JSON.stringify(nome) + ').length');
    w.eval('showTab("esercizi"); exEdit(' + JSON.stringify(nome) + ')');
    d.getElementById('ex-nome').value = 'Nome Nuovo di Prova'; d.getElementById('ex-ok').click();
    ok(n0 > 0 && w.eval('DOC.storico.filter(r=>r.esercizio==="Nome Nuovo di Prova").length') === n0 && w.eval('DOC.storico.filter(r=>r.esercizio===' + JSON.stringify(nome) + ').length') === 0, 'rinomina esercizio: lo storico passa al nome nuovo (' + n0 + ' righe)');
    ok(w.eval('esLookup(' + JSON.stringify(nome) + ').nome') === 'Nome Nuovo di Prova' && w.eval('nomeAttuale(' + JSON.stringify(nome) + ')') === 'Nome Nuovo di Prova', 'rinomina esercizio: il vecchio nome resta riconosciuto (alias)');
    ok(w.eval('elenchiScheda().every(el=>el.every(r=>r.esercizio!==' + JSON.stringify(nome) + '))'), 'rinomina esercizio: aggiornate anche le schede e i Training Set salvati');
    await settle(600);
    ok(fsmem._files.get('TMS_Dati/wander/storico.json').includes('Nome Nuovo di Prova') && JSON.parse(fsmem._files.get('TMS_Dati/esercizi.json')).some(e => e.nome === 'Nome Nuovo di Prova' && (e.alias || []).includes(nome)), 'rinomina esercizio: storico e catalogo (con alias) scritti su disco'); }
  { w.eval('exEdit("Trazioni alla sbarra (pull-up)")'); d.getElementById('ex-nome').value = 'Pull-up'; d.getElementById('ex-ok').click();
    ok(w.eval('quotaCorpo("Pull-up")') === 1 && w.eval('isCorpoLibero("Pull-up")') === true, 'rinomina di un esercizio a corpo libero: resta a corpo libero');
    ok(w.eval('nomeAttuale(MAINLIFTS[4].nome)') === 'Pull-up', 'rinomina di un fondamentale: la card dei record lo segue'); }

  /* misure: una per settimana, massa grassa in percento */
  w.eval('showTab("corpo")');
  { const inp = d.querySelector('#panel-corpo [data-u="massa_grassa"]'); inp.value = '14.5'; inp.dispatchEvent(new w.Event('input', { bubbles: true }));
    ok(Math.abs(w.eval('DOC.dati_utente.massa_grassa') - 0.145) < 1e-9, 'Corpo: massa grassa scritta in percento (14.5) salvata come frazione (0,145)'); }
  { const n0 = w.eval('DOC.storico_io.length');
    w.eval('saveIoModal()'); d.getElementById('m-anno').value = '2031'; d.getElementById('m-sett').value = '7'; d.getElementById('m-ok').click(); await settle(30);
    w.eval('DOC.dati_utente.peso=71.2; saveIoModal()'); d.getElementById('m-anno').value = '2031'; d.getElementById('m-sett').value = '7'; d.getElementById('m-ok').click(); await settle(30);
    ok(w.eval('DOC.storico_io.length') === n0 + 1 && w.eval('DOC.storico_io.filter(r=>+r.scheda===203107)[0].peso') === 71.2, 'Corpo: salvare due volte la stessa settimana sostituisce la misura (non la duplica)');
    w.eval('saveIoModal()'); d.getElementById('m-sett').value = '0'; d.getElementById('m-ok').click(); await settle(30);
    ok(w.eval('DOC.storico_io.length') === n0 + 1, 'Corpo: settimana non valida rifiutata');
    w.eval('closeModal()'); }

  /* TRIMP: il picco della seduta non è la FC max dell'atleta */
  { const s = 'var u=DOC.dati_utente; u.fcMax=190; u.fcRiposo=60; u.sesso="M";';
    const a = w.eval('(function(){' + s + ' return trimpCardio({durata:60,fcMedia:140,fcPicco:150}); })()');
    const b = w.eval('(function(){' + s + ' return trimpCardio({durata:60,fcMedia:140,fcMax:150}); })()');
    const c = w.eval('(function(){' + s + ' return trimpCardio({durata:60,fcMedia:140}); })()');
    ok(a === c && b > a, 'TRIMP: il picco della seduta (150) non sostituisce la FC max del profilo (190)');
    ok(w.eval('(function(){' + s + ' return fcMaxPerSeduta({fcPicco:197}); })()') === 197, 'TRIMP: un picco oltre la FC max nota la alza (la massima vera è almeno quella)');
    ok(w.eval('(function(){ DOC.cardio=[{data:"2026-01-01",tipo:"Corsa",durata:30,fcMedia:150,fcMax:171,note:"importata da file"},{data:"2026-01-02",tipo:"Corsa",durata:30,fcMedia:150,fcMax:185,note:"mia"}]; var ch=migrateCardio(); return ch && DOC.cardio[0].fcPicco===171 && DOC.cardio[0].fcMax==="" && DOC.cardio[1].fcMax===185 && !migrateCardio(); })()'), 'cardio importato in passato: il picco esce dal campo FC max (una volta sola), le sedute scritte a mano no');
    w.eval('DOC.cardio=[]; DOC.dati_utente.fcMax=""; DOC.dati_utente.fcRiposo="";'); }

  /* grafici: valore al passaggio del mouse */
  { const svg = w.eval('lineChart([{name:"TL",color:"red",data:[{x:"a",y:1200},{x:"b",y:1500}]}],{labels:["01/01/26","08/01/26"],fmt:nfk})');
    const dg = JSON.parse(new w.DOMParser().parseFromString(svg, 'text/html').querySelector('svg').getAttribute('data-g'));
    ok(dg.l[1] === '08/01/26' && dg.s[0].n === 'TL' && dg.s[0].v[1] === '1,5k' && dg.x.length === 2 && dg.s[0].y.every(v => typeof v === 'number'),
       'grafico a linee: ogni settimana porta data e valore per il riquadro al passaggio del mouse'); }
  ok(w.eval('showTab("storico"); document.querySelector("#panel-storico .day-sep").textContent').match(/\d{2}\/\d{2}\/\d{2}/) !== null, 'Storico: la settimana è indicata anche come data');
  /* ridisegno senza perdere il punto di scrittura */
  { const s = d.getElementById('st-es'); s.focus(); s.value = 'sq'; s.setSelectionRange(2, 2); s.dispatchEvent(new w.Event('input', { bubbles: true }));
    const s2 = d.getElementById('st-es');
    ok(s2 !== s && d.activeElement === s2 && s2.selectionStart === 2 && s2.value === 'sq', 'Storico: cercando, il cursore resta dove si stava scrivendo (prima tornava all\'inizio: «squat» → «tauqs»)');
    w.eval('stFilt.esercizio=""; renderStorico(); showTab("corpo")'); }
  { const p = d.querySelector('#panel-corpo [data-u="peso"]'); p.focus(); p.value = '70.5'; p.dispatchEvent(new w.Event('input', { bubbles: true }));
    await settle(800);
    const a = d.activeElement;
    ok(a && a !== p && a.dataset && a.dataset.u === 'peso' && a.type === 'number' && a.value === '70.5', 'Corpo: dopo il ridisegno automatico la casella in cui si scriveva ha ancora il fuoco'); }
  ok(w.eval('showTab("allenamento"); document.querySelector("#panel-allenamento .callout").textContent').match(/\d{6} · \d{2}\/\d{2}\/\d{2}/) !== null, 'avviso «storico aggiornato/da aggiornare»: la settimana ha anche la data');
  ok(errors.length === 0, 'nessun errore runtime' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  dom.window.close();
}

console.log('--- T9: dati incorporati dimostrativi, correzione di una riga, Brzycki ---');
{
  /* l'artefatto non porta più i dati personali dell'autore */
  const html = fs.readFileSync(ARTEFATTO, 'utf8');
  const iSeed = html.indexOf('/*__SEED_JSON__*/'), seedTxt = html.slice(iSeed, html.indexOf('\n', iSeed));
  ok(iSeed > 0 && !/2000-11-18/.test(seedTxt) && !/"nome":"Wander"/.test(seedTxt) && !/H 80 - S 50/.test(seedTxt), 'dati incorporati: nessuna traccia dei dati personali (nascita, nome, note di setup)');
  ok(/"nome":"Atleta","cognome":"Template"/.test(seedTxt), 'dati incorporati: sono quelli del profilo dimostrativo «Atleta Template»');

  /* primo avvio su una cartella vuota → profilo dimostrativo */
  const fsmem = makeTmsFS();
  const { dom, errors } = await load({ idb: makeIDB(), tmsFS: fsmem, fsa: true });
  await settleConnect(dom, fsmem);
  const w = dom.window, d = w.document; w.alert = () => {}; w.confirm = () => true;
  ok(w.eval('activeProfile') === 'template' && w.eval('profNome()') === 'Atleta Template', 'primo avvio: il profilo creato è «Atleta Template» (non più «Wander»)');
  ok(fsmem._files.has('TMS_Dati/template/storico.json') && ![...fsmem._files.keys()].some(k => /wander/i.test(k)), 'primo avvio: dati scritti in TMS_Dati/template/, nessuna cartella «wander»');
  ok(w.eval('DOC.dati_utente.nome') === 'Atleta' && w.eval('DOC.storico.length') > 100 && w.eval('cardioList().length') > 0, 'primo avvio: storico, anagrafica e cardio dimostrativi caricati');
  /* 18/11/2026: profilo dimostrativo più ricco — Training Set col loro tipo, esperienza, periodo in corso, pesate */
  { const ts = JSON.parse(w.eval('JSON.stringify((function(){ var s=ensureSets(); return {att:s.setAttivo, tipo:s.tipoAllenamento, ord:s.setsOrdine, tipi:Object.keys(s.setsSalvati).map(function(n){ return s.setsSalvati[n].tipoAllenamento; })}; })())'));
    ok(ts.ord.length === 5 && ts.att === 'Ipertrofia B' && ts.tipo === 'ipertrofia' && ts.tipi.length === 4 && ts.tipi.every(x => ['forza','ipertrofia','powerlifting','generale'].includes(x)),
       'primo avvio: cinque Training Set dimostrativi, ognuno col suo tipo di allenamento');
    ok(w.eval('DOC.dati_utente.esperienza') === 'intermedio' && w.eval('new Set(DOC.storico.map(function(r){ return r.set; })).size') === 5,
       'primo avvio: esperienza nell\'anagrafica e ogni settimana dello Storico col suo Training Set');
    ok(w.eval('DOC.alimentazione.periodi.length') >= 5 && w.eval('DOC.alimentazione.periodi.filter(periodoInCorso).length') === 1 && w.eval('["bulk","mant","cut"].every(function(f){ return DOC.alimentazione[f].length >= 12; })'),
       'primo avvio: tre piani alimentari completi e periodi registrati, uno in corso');
    ok(w.eval('(DOC.pesate||[]).length') > 30 && w.eval('DOC.storico_io.filter(rigaIoDaPesate).length') >= 4 && w.eval('DOC.storico_risc.length') > 0,
       'primo avvio: pesate della bilancia (con le loro medie nello Storico misure) e minuti di riscaldamento');
    ok(w.eval('DOC.storico.filter(function(r){ return r.test; }).length') >= 6, 'primo avvio: qualche test del massimale nello Storico');
    w.eval('showTab("corpo")');
    ok(/Pesate della bilancia/.test(d.getElementById('panel-corpo').textContent), 'primo avvio: nel tab Corpo c\'è il riquadro delle pesate');
    await settle(600);
    ok(/"pesate":\s*\[\s*\{/.test(fsmem._files.get('TMS_Dati/template/corpo.json') || ''), 'primo avvio: le pesate dimostrative finiscono in corpo.json'); }
  /* 18/11/2026: una foto scelta per il report che manca dal disco faceva ridisegnare il report senza fine */
  { const salva = w.eval('JSON.stringify({f:DOC.foto, r:DOC.dati_utente.report})');
    w.eval('DOC.foto=[{file:"manca-prima.jpg",data:"2026-01-05",tag:"fronte"},{file:"manca-dopo.jpg",data:"2026-06-01",tag:"fronte"}];' +
      'DOC.dati_utente.report=Object.assign({},DOC.dati_utente.report,{foto:true,fotoPrima:"manca-prima.jpg",fotoDopo:"manca-dopo.jpg"});' +
      'window.__nRep=0; window.__rr=renderReport; renderReport=function(){ window.__nRep++; return window.__rr.apply(this,arguments); }; showTab("report");');
    await settle(400);
    const n = w.eval('window.__nRep');
    ok(n <= 3 && /foto non trovata/.test(d.getElementById('panel-report').textContent), 'report: una foto assente dal disco dice «foto non trovata» e non fa ridisegnare il report all\'infinito (' + n + ' disegni)');
    w.eval('renderReport=window.__rr; (function(o){ DOC.foto=o.f; DOC.dati_utente.report=o.r; })(' + salva + '); showTab("profilo");'); }
  /* 18/11/2026: «Progressione esercizi» cercava i fondamentali coi nomi vecchi e restava sempre «senza dati» */
  { ok(w.eval('fondamentaliReport().join("|")') === 'Panca piana con bilanciere - presa media|Squat con bilanciere|Stacco da terra con bilanciere|Military press in piedi|Trazioni alla sbarra (pull-up)',
       'report: i fondamentali della «Progressione esercizi» si trovano coi nomi del catalogo di oggi');
    w.eval('showTab("report")');
    const li = [...d.querySelectorAll('#panel-report .rep-li__nome')].find(e => /Progressione esercizi/.test(e.textContent));
    ok(/Progressione di forza \(1RM stimato\)/.test(d.getElementById('panel-report').textContent) && li && !/senza dati/.test(li.textContent),
       'report: il blocco «Progressione esercizi» ha il suo grafico (non più «senza dati»)');
    const sto = w.eval('JSON.stringify(DOC.storico)');
    w.eval('DOC.storico=[{scheda:202401,esercizio:"Squat bilanciere",seduta:1,test:false,macro:"Gambe",serie:3,rip:5,peso:100},{scheda:202402,esercizio:"Squat bilanciere",seduta:1,test:false,macro:"Gambe",serie:3,rip:5,peso:102.5}]');
    ok(w.eval('fondamentaliReport().join("|")') === 'Squat bilanciere', 'report: uno Storico vecchio coi nomi di una volta trova ancora i suoi fondamentali');
    w.eval('DOC.storico=' + sto + '; showTab("profilo");'); }

  /* correzione di una riga dello Storico */
  w.eval('showTab("storico")');
  const n0 = w.eval('DOC.storico.length');
  const btn = d.querySelector('#panel-storico [data-edrow]'); const i = +btn.dataset.edrow;
  ok(d.querySelectorAll('#panel-storico [data-edrow]').length === n0, 'Storico: ogni riga ha la sua matita ✎');
  const prima = JSON.parse(w.eval('JSON.stringify(DOC.storico[' + i + '])'));
  btn.click();
  ok(+d.getElementById('rs-peso').value === +prima.peso && +d.getElementById('rs-rip').value === +prima.rip && d.getElementById('modal').textContent.includes(String(prima.scheda)), 'correzione: il riquadro si apre coi valori della riga e la sua settimana');
  d.getElementById('rs-peso').value = '-5'; d.getElementById('rs-ok').click();
  ok(w.eval('DOC.storico[' + i + '].peso') === prima.peso && !d.getElementById('rs-err').hidden, 'correzione: un valore negativo viene rifiutato (riga invariata)');
  d.getElementById('rs-peso').value = '123.5'; d.getElementById('rs-rip').value = '4'; d.getElementById('rs-rir').value = ''; d.getElementById('rs-test').checked = true;
  d.getElementById('rs-ok').click();
  { const r = JSON.parse(w.eval('JSON.stringify(DOC.storico[' + i + '])'));
    ok(r.peso === 123.5 && r.rip === 4 && r.rir === null && r.test === true && r.esercizio === prima.esercizio && r.scheda === prima.scheda && w.eval('DOC.storico.length') === n0, 'correzione: cambiano solo serie/rip/peso/RIR/★ di QUELLA riga');
    ok(!('rm1' in r) && !('tl' in r), 'correzione: nessun valore calcolato viene salvato nella riga'); }
  await settle(600);
  ok(JSON.parse(fsmem._files.get('TMS_Dati/template/storico.json'))[i].peso === 123.5, 'correzione: scritta su disco');
  /* eliminare una riga sola; se era l'ultima della settimana se ne va anche il suo carico interno */
  w.eval('DOC.storico.push({scheda:209950,esercizio:' + JSON.stringify(prima.esercizio) + ',seduta:1,test:false,macro:"Gambe",serie:1,rip:1,peso:1}); DOC.storico_rpe.push({scheda:209950,giorno:"Lunedì",rpe:5,min:30}); renderStorico();');
  const iNuova = w.eval('DOC.storico.length-1');
  d.querySelector('#panel-storico [data-edrow="' + iNuova + '"]').click();
  d.getElementById('rs-del').click();
  ok(w.eval('DOC.storico.length') === n0 + 1, 'elimina riga: finché non confermi non viene tolto nulla');
  d.getElementById('cc-si').click();
  ok(w.eval('DOC.storico.length') === n0 && w.eval('DOC.storico.filter(r=>+r.scheda===209950).length') === 0, 'elimina riga: tolta solo quella');
  ok(w.eval('DOC.storico_rpe.filter(r=>+r.scheda===209950).length') === 0, 'elimina riga: se era l\'ultima della settimana se ne va anche l\'RPE di quella settimana');
  { const rpePrima = w.eval('DOC.storico_rpe.length'); const cod = w.eval('DOC.storico[0].scheda');
    d.querySelector('#panel-storico [data-edrow="0"]').click(); d.getElementById('rs-del').click(); d.getElementById('cc-si').click();
    ok(w.eval('DOC.storico.filter(r=>+r.scheda===' + cod + ').length') > 0 && w.eval('DOC.storico_rpe.length') === rpePrima, 'elimina riga: se la settimana ha altre righe il suo RPE resta'); }

  /* Brzycki: fino a 10 ripetizioni, poi Epley (coincidono a 10) */
  const rm = (f, p, r) => w.eval('(function(){ var u=DOC.dati_utente, o=u.e1rm; u.e1rm=' + JSON.stringify(f) + '; var v=rm1(' + p + ',' + r + '); u.e1rm=o; return v; })()');
  ok(Math.abs(rm('brzycki', 100, 5) - 112.5) < 1e-9 && Math.abs(rm('brzycki', 100, 8) - 100 * 36 / 29) < 1e-9, 'Brzycki: invariata sulle basse ripetizioni (100×5 → 112,5)');
  ok(Math.abs(rm('brzycki', 100, 10) - rm('epley', 100, 10)) < 1e-9 && Math.abs(rm('brzycki', 100, 11) - rm('epley', 100, 11)) < 1e-9, 'Brzycki: a 10 ripetizioni coincide con Epley e da lì la segue (nessun gradino)');
  ok(rm('brzycki', 100, 30) === 200 && rm('brzycki', 100, 36) < 230, 'Brzycki: a 30 ripetizioni stima 200, non più 514 (a 36 non esplode)');
  ok(rm('media', 100, 30) < 185, 'Media delle 3: non più trascinata in alto da Brzycki sulle alte ripetizioni');
  ok(errors.length === 0, 'nessun errore runtime' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  dom.window.close();
}
{
  /* cartella di una versione molto vecchia: file «piatti» nella radice = dati veri di qualcuno */
  const fsmem = makeTmsFS(); const J = o => JSON.stringify(o);
  await fsmem.writeFile('TMS_Dati/scheda.json', J({ settimanale: [], mensile: [] }));
  await fsmem.writeFile('TMS_Dati/storico.json', J([{ scheda: 202501, esercizio: 'Squat con bilanciere', seduta: 1, macro: 'Gambe', serie: 3, rip: 5, peso: 90 }]));
  await fsmem.writeFile('TMS_Dati/corpo.json', J({ dati_utente: { nome: 'Luca', sesso: 'M' }, storico_io: [] }));
  await fsmem.writeFile('TMS_Dati/alimentazione.json', J({ bulk: [], mant: [], cut: [] }));
  const { dom, errors } = await load({ idb: makeIDB(), tmsFS: fsmem, fsa: true });
  await settleConnect(dom, fsmem); await settle(300);
  const w = dom.window;
  ok(w.eval('activeProfile') === 'luca' && w.eval('profNome()') === 'Luca' && w.eval('DOC.storico.length') === 1 && w.eval('DOC.storico[0].peso') === 90, 'file piatti di una versione vecchia: diventano un profilo col nome della loro anagrafica, coi LORO dati');
  ok(fsmem._files.has('TMS_Dati/luca/storico.json') && !fsmem._files.has('TMS_Dati/storico.json'), 'file piatti: spostati nella cartella del profilo');
  ok(errors.length === 0, 'nessun errore runtime' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  dom.window.close();
}

console.log('--- T10: avvisi e conferme in stile app, pannelli laterali ---');
{
  const src = fs.readdirSync(path.join(ROOT, 'src', 'app')).filter(f => f.endsWith('.js') && !/^(13a-guida|00-i18n|04-modal)/.test(f))
    .map(f => fs.readFileSync(path.join(ROOT, 'src', 'app', f), 'utf8')).join('\n');
  ok(!/(?<![\w.])(alert|confirm)\(/.test(src), 'nel sorgente non restano alert() o confirm() di sistema');

  const fsmem = makeTmsFS();
  const { dom, errors } = await load({ idb: makeIDB(), tmsFS: fsmem, fsa: true, dialoghiVeri: true });
  await settleConnect(dom, fsmem);
  const w = dom.window, d = w.document;
  let nativi = 0; w.alert = () => { nativi++; }; w.confirm = () => { nativi++; return true; };
  const bk = () => d.getElementById('dlg-bk'), aperto = () => !bk().classList.contains('hidden');

  /* conferma: Promise, fuoco su Annulla, Esc annulla */
  w.eval('window.__r1="?"; conferma("Riga uno\\nRiga <b>due</b>").then(function(v){ window.__r1=v; });'); await settle(30);
  ok(aperto() && d.getElementById('dlg').innerHTML.includes('Riga uno<br>Riga &lt;b&gt;due&lt;/b&gt;'), 'conferma: riquadro dell\'app, testo protetto e a capo rispettati');
  ok(d.activeElement === d.getElementById('dlg-no'), 'conferma: il fuoco parte da Annulla (un Invio distratto non conferma)');
  d.getElementById('dlg-si').click(); await settle(10);
  ok(w.eval('window.__r1') === true && !aperto(), 'conferma: «Conferma» risolve true e chiude');
  w.eval('window.__r2="?"; conferma("x").then(function(v){ window.__r2=v; });'); await settle(30);
  bk().dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await settle(10);
  ok(w.eval('window.__r2') === false && !aperto(), 'conferma: Esc annulla');

  /* due avvisi ravvicinati si mettono in fila; il riquadro sotto resta com'è */
  w.eval('modal("<h3>Riquadro sotto</h3><input id=\\"sotto\\" value=\\"abc\\">"); avviso("primo"); avviso("secondo");'); await settle(30);
  ok(aperto() && d.getElementById('dlg').textContent.includes('primo') && !d.getElementById('dlg').textContent.includes('secondo'), 'avvisi: uno alla volta, in fila');
  ok(!d.getElementById('modal-bk').classList.contains('hidden') && d.getElementById('sotto').value === 'abc', 'avviso sopra un riquadro aperto: quello sotto resta intatto');
  d.getElementById('dlg-ok').click(); await settle(30);
  ok(aperto() && d.getElementById('dlg').textContent.includes('secondo'), 'avvisi: chiuso il primo compare il secondo');
  d.getElementById('dlg-ok').click(); await settle(10);
  ok(!aperto() && d.getElementById('sotto') !== null, 'avvisi: chiusi tutti, il riquadro sotto è ancora lì');
  w.eval('closeModal()');

  /* un flusso vero: eliminare un Training Set chiede conferma con il riquadro dell'app */
  w.eval('showTab("allenamento"); creaTrainingSet("Di prova","__vuota__");');
  const nSet = w.eval('DOC.scheda.setsOrdine.length');
  w.eval('eliminaTrainingSet()'); await settle(30);
  ok(aperto() && d.getElementById('dlg').textContent.includes('Di prova'), 'elimina Training Set: la conferma è il riquadro dell\'app');
  d.getElementById('dlg-no').click(); await settle(20);
  ok(w.eval('DOC.scheda.setsOrdine.length') === nSet && w.eval('DOC.scheda.setAttivo') === 'Di prova', 'elimina Training Set: Annulla non elimina nulla');
  w.eval('eliminaTrainingSet()'); await settle(30); d.getElementById('dlg-si').click(); await settle(30);
  ok(w.eval('DOC.scheda.setsOrdine.length') === nSet - 1 && w.eval('DOC.scheda.setAttivo') !== 'Di prova', 'elimina Training Set: confermando viene eliminato');
  ok(nativi === 0, 'nessuna finestra di sistema è stata aperta');

  /* pannelli laterali */
  w.eval('renderAllenamento()');
  { const side = d.getElementById('pesi-side'); const prima = side.textContent;
    ok(side !== null && side.closest('.pag') !== null && side.querySelectorAll('.lat').length >= 3 && side.querySelectorAll('.bil-riga').length === 6, 'Pesi: pannello laterale accanto alla scheda, con le serie dei sei gruppi');
    const inp = d.querySelector('#panel-allenamento tr[data-i] input[data-f="serie"]'); inp.value = String((+inp.value || 0) + 7); inp.dispatchEvent(new w.Event('input', { bubbles: true }));
    ok(d.getElementById('pesi-side').textContent !== prima, 'Pesi: il pannello laterale si aggiorna mentre si digita');
    ok(d.activeElement === inp || d.contains(inp), 'Pesi: aggiornando il pannello la casella in cui si scrive non viene ricreata'); }
  w.eval('showTab("alimentazione")');
  { const side = d.getElementById('alim-side');
    ok(side !== null && /kcal/.test(side.textContent) && side.querySelectorAll('.lat').length === 4, 'Alimentazione: pannello laterale con energia, macronutrienti, pasti e riferimenti'); }
  /* ── VISTA COMPATTA dei grafici (Marco, 16/11/2026): sezioni per argomento, griglia fitta ── */
  w.eval('showTab("progressi")');
  { const pp = d.getElementById('panel-progressi');
    /* la griglia che segue il titolo di sezione */
    const grigliaDi = (pan, tit) => { const sec = [...pan.querySelectorAll('.graf-pagina > .sec')].find(x => x.textContent.trim().startsWith(tit));
      let el = sec && sec.nextElementSibling; while (el && !el.classList.contains('chart-grid') && !el.classList.contains('sec')) el = el.nextElementSibling;
      return el && el.classList.contains('chart-grid') ? el : null; };
    const griglie = pp.querySelectorAll('.chart-grid--compatta');
    ok(griglie.length >= 3 && griglie[0].children.length === 4 && !pp.querySelector('.chart-grid--fluida'),
       'Progressi: i grafici di ogni sezione stanno in una griglia compatta che si adatta alla larghezza (' + griglie.length + ' sezioni)');
    const titoli = [...pp.querySelectorAll('.graf-pagina > .sec')].map(x => x.textContent.trim());
    const pos = ['Segnali', 'Carico e volume', 'Forza e record', 'Equilibrio e distribuzione'].map(x => titoli.findIndex(y => y.startsWith(x)));
    ok(pos.every((v, i) => v >= 0 && (i === 0 || v > pos[i - 1])), 'Progressi: sezioni per argomento, in ordine (' + titoli.join(' · ') + ')');
    const carico = grigliaDi(pp, 'Carico e volume');
    ok(carico && /TL totale/.test(carico.textContent) && /ACWR/.test(carico.textContent) && /Tonnellaggio/.test(carico.textContent) && /Variazione TL/.test(carico.textContent),
       'Progressi: «Carico e volume» raccoglie TL, ACWR, tonnellaggio e variazione del TL');
    const forza = grigliaDi(pp, 'Forza e record');
    ok(forza && forza.classList.contains('chart-grid--forza') && forza.children.length === 3 && forza.children[0].classList.contains('prog-reale') &&
       forza.children[1].classList.contains('rec-box') && forza.children[2].classList.contains('graf-prog-ex') &&
       forza.querySelectorAll('.rec-box .pr-card').length === w.eval('MAINLIFTS.length') && forza.querySelector('.graf-prog-ex #prog-ex'),
       'Progressi: «Forza e record» ha il Progresso reale grande, le card dei record e sotto la progressione per esercizio (con la sua scelta)');
    { const css = [...d.querySelectorAll('style')].map(s => s.textContent).join('\n');
      ok(/\.chart-grid--forza\{grid-template-columns:minmax\(0,3fr\) minmax\(0,2fr\); grid-template-areas:"reale rec" "reale prog"\}/.test(css) &&
         /@container \(max-width:979px\)\{\s*\.chart-grid\.chart-grid--compatta\.chart-grid--forza\{grid-template-columns:minmax\(0,1fr\); grid-template-areas:"reale" "rec" "prog"\}/.test(css),
         'Progressi: Progresso reale a sinistra su due righe, record e progressione a destra; su pagina stretta tutto in colonna'); }
    { const pr = forza && forza.querySelector('.prog-reale');
      const nums = pr ? [...pr.querySelectorAll('.pr-nums > .pr-num')] : [];
      ok(nums.length === 3 && nums.map(n => n.querySelector('.pr-num__et').textContent).join('|') === 'TL totale (grezzo)|TL a parità di esercizi|Forza a parità di esercizi' &&
         nums.every(n => /^[+−]?[\d.,]+ %$/.test(n.querySelector('.pr-num__val').textContent)) && nums[2].classList.contains('pr-num--forza'),
         'Progresso reale: sopra il grafico i tre numeri in percentuale, la forza evidenziata (' + nums.map(n => n.querySelector('.pr-num__val').textContent).join(' · ') + ')');
      ok(pr && pr.querySelector('[data-spieg="progresso-reale"]') && pr.querySelector('.graf-v--largo svg') && pr.querySelector('.graf-v--stretto svg') &&
         pr.querySelector('.graf-v--largo svg').querySelectorAll('path.ln').length === 3 && /viewBox="0 0 900 340"/.test(pr.querySelector('.graf-v--largo').innerHTML),
         'Progresso reale: riquadro grande (900×340, e la versione stretta) con tre linee e il suo «?»');
      ok(pr && /settimane confrontate/.test(pr.querySelector('.pr-nota').textContent) && /fuori misura/.test(pr.querySelector('.pr-nota').textContent),
         'Progresso reale: sotto il grafico quante settimane sono confrontate, i cambi scheda saltati e i confronti esclusi'); }
    ok(carico && /Variazione TL/.test(carico.textContent) && carico.children.length === 4,
       'Progresso reale: il grafico «Δ Variazione TL %» resta dov\'era, in «Carico e volume»');
    ok(forza && forza.querySelector('.graf-v--largo svg') && forza.querySelector('.graf-v--stretto svg'),
       'Progressi: la progressione per esercizio ha la versione larga e quella per la colonna unica');
    /* un clic sulla card di un record porta quell'esercizio nel grafico della progressione (Marco, 16/11/2026) */
    { const card = [...pp.querySelectorAll('.rec-box [data-rec-ex]')].find(c => c.dataset.recEx !== w.eval('progEx'));
      ok(!!card && card.getAttribute('role') === 'button' && card.getAttribute('tabindex') === '0', 'Progressi: le card dei record con dati sono cliccabili (anche da tastiera)');
      const nome = card.dataset.recEx;
      card.click();
      const sel = d.getElementById('prog-ex'), ora = d.querySelector('#panel-progressi .rec-box .pr-card.is-sel');
      ok(w.eval('progEx') === nome && sel.value === nome && ora && ora.dataset.recEx === nome && d.querySelectorAll('#panel-progressi .rec-box .pr-card.is-sel').length === 1,
         'Progressi: cliccando la card di un record il grafico accanto passa a quell\'esercizio e la card resta evidenziata (' + nome + ')');
      const altra = [...d.querySelectorAll('#panel-progressi .rec-box [data-rec-ex]')].find(c => c.dataset.recEx !== nome);
      if (altra) { const n2 = altra.dataset.recEx; altra.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        ok(w.eval('progEx') === n2 && d.activeElement && d.activeElement.dataset.recEx === n2, 'Progressi: anche con Invio dalla tastiera, e il fuoco resta sulla card'); }
      /* il menu dell'esercizio continua a funzionare e aggiorna la card evidenziata */
      const s2 = d.getElementById('prog-ex'); s2.value = nome; s2.dispatchEvent(new w.Event('change'));
      ok(d.querySelector('#panel-progressi .rec-box .pr-card.is-sel').dataset.recEx === nome, 'Progressi: scegliendo dal menu, la card evidenziata segue'); }
    const equi = grigliaDi(pp, 'Equilibrio e distribuzione');
    const radarBox = equi && equi.querySelector('.chart-box--radar');
    ok(equi && equi.children.length === 4 && radarBox && /Equilibrio · distribuzione/.test(radarBox.textContent) && radarBox.querySelector('.rif-nota') && radarBox.querySelector('[data-rif-apri]') && radarBox.querySelector('[data-spieg="distribuzione"]'),
       'Progressi: in «Equilibrio e distribuzione» la ragnatela tiene la didascalia del riferimento, «⚙ Riferimento» e il «?»');
    ok(/Serie per gruppo/.test(equi.textContent) && /Distribuzione intensità/.test(equi.textContent) && /Andamento TL per gruppo/.test(equi.textContent),
       'Progressi: in «Equilibrio e distribuzione» anche serie per gruppo, intensità e TL per gruppo');
    ok([...pp.querySelectorAll('.chart-grid--compatta svg:not(.ic)')].every(x => /--graf-fs/.test(x.getAttribute('style') || '')),
       'Progressi: tutti i grafici della griglia sono disegnati per la vista compatta');
    /* schede Fable nella ragnatela dei Progressi: fascia viola e avvertimento sempre presenti */
    w.eval('DOC.dati_utente.rifDistr={raccolta:"schede", esperienza:"", tipo:"resistenza", fable:true}; renderProgressi();');
    { const rb = d.querySelector('#panel-progressi .chart-box--radar');
      ok(rb && rb.querySelector('.rif-nota.is-fable') && /Fascia ipotizzata da Fable/.test(rb.textContent) && /var\(--violet\)/.test(rb.querySelector('svg').innerHTML),
         'Progressi: con le schede Fable la ragnatela compatta resta viola e con l\'avvertimento sotto'); }
    w.eval('delete DOC.dati_utente.rifDistr; renderProgressi();');
  }
  /* ── PROGRESSO REALE a parità di esercizi (Marco, 16/11/2026): indici a catena ── */
  { const IP = (rows, sf) => JSON.parse(w.eval('(function(){ var s=DOC.storico; DOC.storico=' + JSON.stringify(rows) + '; try{ return JSON.stringify(indiceProgresso(' + JSON.stringify(sf || '__tutti__') + ')); } finally { DOC.storico=s; } })()'));
    const R = (sch, es, serie, rip, peso, extra) => Object.assign({ scheda: sch, esercizio: es, macro: 'Altro', serie: serie, rip: rip, peso: peso }, extra || {});
    const sett = (sch, pA, pB, pC) => [R(sch, 'Es A', 3, 5, pA), R(sch, 'Es B', 3, 8, pB), R(sch, 'Es C', 3, 10, pC)];
    const vicino = (a, b, tol) => Math.abs(a - b) < (tol || 1e-9);
    ok(IP(sett(202601, 100, 60, 40)) === null, 'Progresso reale: con una sola settimana non c\'è nulla da confrontare');
    /* il passo è la media GEOMETRICA dei rapporti del 1RM, pesata sul TL medio dell'esercizio */
    const w1 = sett(202601, 100, 60, 40), w2 = sett(202602, 105, 62, 40);
    const atteso = w.eval('(function(){ function m(rows){ var o={}; rows.forEach(function(r){ var x=o[r.esercizio]=o[r.esercizio]||{tl:0,rm:0}; x.tl+=sTL(r); x.rm=Math.max(x.rm,sRM(r)); }); return o; } var a=m(' + JSON.stringify(w1) + '), b=m(' + JSON.stringify(w2) + '); var sp=0, sl=0; Object.keys(b).forEach(function(e){ var p=(a[e].tl+b[e].tl)/2; sp+=p; sl+=p*Math.log(b[e].rm/a[e].rm); }); return 100*Math.exp(sl/sp); })()');
    const base = IP(w1.concat(w2));
    ok(base && base.forza[0] === 100 && vicino(base.forza[1], atteso) && base.salti.length === 0 && base.confrontate === 1,
       'Progresso reale: indice di forza = media geometrica dei rapporti del 1RM pesata sul TL (' + base.forza[1].toFixed(3) + ')');
    /* un esercizio nuovo non sposta gli indici, il TL totale sì */
    const nuovo = IP(w1.concat(w2, [R(202602, 'Es D', 4, 10, 80)]));
    ok(vicino(nuovo.forza[1], base.forza[1]) && vicino(nuovo.tl[1], base.tl[1]) && nuovo.tot[1] > base.tot[1] + 20,
       'Progresso reale: un esercizio aggiunto fa saltare il TL totale (' + nuovo.tot[1].toFixed(0) + ') ma non gli indici a parità di esercizi');
    /* più serie sullo stesso esercizio: il TL per serie e la forza non cambiano */
    const serie = IP(w1.concat([R(202602, 'Es A', 3, 5, 100), R(202602, 'Es B', 5, 8, 60), R(202602, 'Es C', 3, 10, 40)]));
    ok(serie.forza[1] === 100 && vicino(serie.tl[1], 100) && serie.tot[1] > 110,
       'Progresso reale: aggiungere serie sale nel TL totale (' + serie.tot[1].toFixed(0) + '), non negli indici (si conta il TL per serie)');
    /* esercizio fuori misura (×3 in una settimana: altra macchina o errore): in quel passo non conta */
    const q1 = w1.concat([R(202601, 'Es D', 3, 12, 30)]);
    const fuori = IP(q1.concat([R(202602, 'Es A', 3, 5, 105), R(202602, 'Es B', 3, 8, 62), R(202602, 'Es C', 3, 10, 120), R(202602, 'Es D', 3, 12, 30)]));
    const senzaC = IP(q1.concat([R(202602, 'Es A', 3, 5, 105), R(202602, 'Es B', 3, 8, 62), R(202602, 'Es D', 3, 12, 30)]));
    ok(vicino(fuori.forza[1], senzaC.forza[1]) && fuori.forza[1] > 100 && senzaC.salti.length === 0 && fuori.esclusiForza === 1 && fuori.esclusiTL === 1 && senzaC.esclusiForza === 0,
       'Progresso reale: un esercizio che cambia oltre ×1,2 in una settimana è escluso da quel passo');
    ok(IP(w1.concat(sett(202602, 119, 60, 40))).esclusiForza === 0 && IP(w1.concat(sett(202602, 121, 60, 40))).esclusiForza === 1,
       'Progresso reale: la soglia è ×1,2 sul massimale stimato');
    /* cambio scheda: meno di 3 esercizi in comune → il passo si salta e l'indice riparte da lì */
    const w3 = [R(202603, 'Es A', 3, 5, 107), R(202603, 'Es E', 4, 8, 90), R(202603, 'Es F', 4, 8, 70), R(202603, 'Es G', 4, 10, 50)];
    const w4 = [R(202604, 'Es A', 3, 5, 110), R(202604, 'Es E', 4, 8, 92), R(202604, 'Es F', 4, 8, 70), R(202604, 'Es G', 4, 10, 50)];
    const cambio = IP(w1.concat(w2, w3, w4));
    ok(cambio.salti.join() === '2' && cambio.forza[2] === cambio.forza[1] && cambio.tl[2] === cambio.tl[1] && cambio.forza[3] > cambio.forza[2] && cambio.confrontate === 2,
       'Progresso reale: al cambio scheda il passo si salta e l\'indice riparte da lì');
    /* in comune 3 esercizi ma meno di metà del TL: è comunque un cambio scheda */
    const w3b = sett(202603, 105, 62, 40).concat([R(202603, 'Es H', 6, 8, 200), R(202603, 'Es I', 6, 8, 200)]);
    ok(IP(w1.concat(w2, w3b)).salti.join() === '2', 'Progresso reale: in comune meno di metà del TL = cambio scheda, anche con 3 esercizi uguali');
    /* le righe di test del massimale non contano */
    const conTest = IP(w1.concat(w2, [R(202602, 'Es A', 1, 1, 150, { test: true })]));
    ok(vicino(conTest.forza[1], base.forza[1]) && vicino(conTest.tot[1], base.tot[1]), 'Progresso reale: le righe di test del massimale (★) non contano');
    /* le pause contano: il calo dopo uno stop resta nell'indice */
    const pausa = IP(w1.concat(sett(202607, 92, 56, 38)));
    ok(pausa.salti.length === 0 && pausa.forza[1] < 100 && pausa.tl[1] < 100, 'Progresso reale: la settimana dopo una pausa si confronta lo stesso e il calo resta (' + pausa.forza[1].toFixed(1) + ')');
    /* % al mese: 1 % a settimana per 8 settimane = 1,01^(30,44/7) − 1 */
    const otto = []; for (let i = 0; i < 8; i++) otto.push(...sett(202601 + i, 100 * Math.pow(1.01, i), 60 * Math.pow(1.01, i), 40 * Math.pow(1.01, i)));
    const m8 = IP(otto), atteso8 = (Math.pow(1.01, 30.44 / 7) - 1) * 100;
    ok(vicino(m8.mese.forza, atteso8, 1e-6) && m8.mese.tutto === true && vicino(m8.var.forza, (Math.pow(1.01, 7) - 1) * 100, 1e-6),
       'Progresso reale: +1 % a settimana = ' + m8.mese.forza.toFixed(2) + ' % al mese, e +' + m8.var.forza.toFixed(1) + ' % in 8 settimane');
    ok(IP(w1.concat(w2)).mese.forza === null, 'Progresso reale: con due sole settimane non si calcola la % al mese');
    /* segue il filtro del Training Set */
    const set = IP(sett(202601, 100, 60, 40).map(r => Object.assign(r, { set: 'X' })).concat(sett(202602, 130, 60, 40).map(r => Object.assign(r, { set: 'Y' })), sett(202603, 105, 62, 40).map(r => Object.assign(r, { set: 'X' }))), 'X');
    ok(set && set.sett.join() === '202601,202603' && vicino(set.forza[1], atteso), 'Progresso reale: col filtro del Training Set conta solo quel set');
    ok(w.eval('pctSegno(-1.54,1)') === '−1,5 %' && w.eval('pctSegno(64.2)') === '+64 %' && w.eval('pctSegno(0)') === '0 %' && w.eval('pctSegno(null)') === '—',
       'Progresso reale: percentuali col segno e il meno tipografico');
    /* nel riquadro: cerchietto sui cambi scheda, nota, e nulla viene salvato */
    w.eval('var _st=DOC.storico, _ps=DOC.dati_utente.progSet; DOC.dati_utente.progSet="__tutti__"; DOC.storico=' + JSON.stringify(w1.concat(w2, w3, w4)) + '; showTab("progressi");');
    { const pr = d.querySelector('#panel-progressi .prog-reale');
      ok(pr && pr.querySelectorAll('.graf-v--largo .pt-segno').length === 1 && /1 cambio scheda saltato \(12\/01\/26\)/.test(pr.querySelector('.pr-nota').textContent) &&
         /cambio scheda: l'indice riparte da qui/.test(pr.querySelector('.graf-v--largo').innerHTML),
         'Progresso reale: il cambio scheda saltato ha il cerchietto vuoto e la data nella nota'); }
    w.eval('DOC.storico=' + JSON.stringify(w1) + '; renderProgressi();');
    ok(/Servono almeno due settimane salvate/.test(d.querySelector('#panel-progressi .prog-reale').textContent) && d.querySelector('#panel-progressi .rec-box'),
       'Progresso reale: con una settimana sola il riquadro lo dice e il resto della pagina c\'è');
    w.eval('DOC.storico=_st; if(_ps===undefined) delete DOC.dati_utente.progSet; else DOC.dati_utente.progSet=_ps;');
    const primaSt = w.eval('JSON.stringify(DOC.storico)'), primaU = w.eval('JSON.stringify(DOC.dati_utente)');
    w.eval('renderProgressi()');
    ok(w.eval('JSON.stringify(DOC.storico)') === primaSt && w.eval('JSON.stringify(DOC.dati_utente)') === primaU,
       'Progresso reale: calcolato al volo, nello Storico e nel profilo non si salva nulla');
    ok(w.eval('EN["Progresso reale · a parità di esercizi"]') === 'Real progress · like-for-like exercises' && w.eval('EN["Mostra la progressione di questo esercizio nel grafico qui sotto"]') &&
       w.eval('SPIEG_EN["progresso-reale"].s.length===SPIEG["progresso-reale"].s.length') && /qui sotto/.test(d.querySelector('#panel-progressi [data-rec-ex]').getAttribute('title')),
       'Progresso reale: testi, spiegazione e card dei record tradotti in inglese');
    /* le opzioni nuove del grafico a linee non cambiano i grafici di sempre */
    const sempl = w.eval('lineChart([{name:"A",color:"red",data:[{x:"a",y:1},{x:"b",y:2}]}])');
    const conOpz = w.eval('lineChart([{name:"A",color:"red",dash:"2 3",spess:3,punti:false,data:[{x:"a",y:90},{x:"b",y:110,segno:true,nota:"n"}]}],{rif:100,senzaLeg:true})');
    ok(!/stroke-dasharray|pt-segno|rif-base|stroke-width:/.test(sempl) && /r="2.6"/.test(sempl) &&
       /stroke-dasharray="2 3"/.test(conOpz) && /pt-segno/.test(conOpz) && /rif-base/.test(conOpz) && /stroke-width:3/.test(conOpz) && !/r="2.6"/.test(conOpz) && /&quot;e&quot;:\[&quot;&quot;,&quot;n&quot;\]/.test(conOpz) && !/· n/.test(conOpz),
       'grafici: tratteggio, spessore, cerchietti e linea di base solo se chiesti'); }
  /* ── GRAFICI A LINEE INTERATTIVI (Marco, 16/11/2026): valori puntuali col mouse, animazioni ── */
  { const parse = html => new w.DOMParser().parseFromString('<div>' + html + '</div>', 'text/html').querySelector('svg');
    const src = 'lineChart([{name:"TL",color:"red",data:[{x:"a",y:1000},{x:"b",y:1500},{x:"c",y:null},{x:"d",y:1800}]},{name:"Media <4>",color:"blue",data:[{x:"a",y:900},{x:"b",y:1100},{x:"c",y:1200},{x:"d",y:1400}]}],{labels:["01/01/26","08/01/26","15/01/26","22/01/26"],fmt:nfk})';
    const sv = parse(w.eval(src)), sv2 = parse(w.eval(src));
    ok(sv.classList.contains('graf-lin') && sv.querySelectorAll('.g-hover .g-punto').length === 2 && sv.querySelector('.g-hover .g-guida') &&
       sv.querySelector('.g-serie[clip-path]') && sv.querySelector('clipPath rect.g-clip') && !sv.querySelector('.pt-hit, circle title'),
       'grafici a linee: linea guida e un punto per linea pronti per il mouse, linee dentro un ritaglio per l\'entrata, niente più suggerimenti sui singoli punti');
    ok(sv.getAttribute('data-firma') === sv2.getAttribute('data-firma') && sv.querySelector('clipPath').id !== sv2.querySelector('clipPath').id,
       'grafici a linee: stesso grafico, stessa firma (per non rifare l\'animazione) ma ritaglio con nome suo');
    const g = JSON.parse(sv.getAttribute('data-g')), G = JSON.stringify(g);
    ok(w.eval('grafIndice(' + G + ',' + (g.x[1] + 3) + ')') === 1 && w.eval('grafIndice(' + G + ',' + (g.x[0] - 50) + ')') === 0 && w.eval('grafIndice(' + G + ',' + (g.x[3] + 99) + ')') === 3,
       'grafici a linee: col mouse si prende la settimana più vicina, anche fuori dalle linee');
    const tip = w.eval('grafTipHtml(' + G + ',2)');
    ok(/15\/01\/26/.test(tip) && !/>TL</.test(tip) && /Media &lt;4&gt;/.test(tip) && /1,2k/.test(tip),
       'grafici a linee: il riquadro dice data e valori, salta la linea senza dato in quella settimana e non legge i nomi come codice');
    /* la nota di un punto (es. il cambio scheda) sta su una riga sua, non attaccata al valore: lo
       allungava fino a schiacciare il nome e le scritte si accavallavano (Marco, 16/11/2026) */
    { const gn = JSON.parse(parse(w.eval('lineChart([{name:"Forza a parità di esercizi",color:"red",data:[{x:"a",y:100},{x:"b",y:150,nota:"○ cambio scheda: l\'indice riparte da qui"}]}],{labels:["01/01/26","08/01/26"]})')).getAttribute('data-g'));
      const th = w.eval('grafTipHtml(' + JSON.stringify(gn) + ',1)');
      const css = [...d.querySelectorAll('style')].map(s => s.textContent).join('\n');
      ok(gn.s[0].v[1] === '150' && /<b>150<\/b>/.test(th) && /graf-tip__e">○ cambio scheda/.test(th) &&
         /\.graf-tip__r\{display:grid; grid-template-columns:9px minmax\(6em,1fr\) auto;/.test(css) && /\.graf-tip\{[^}]*width:max-content; min-width:150px; max-width:min\(340px, calc\(100vw - 16px\)\)/.test(css),
         'grafici a linee: la nota del cambio scheda va su una riga sua e nome e valore hanno ognuno la sua colonna (niente scritte accavallate)'); }
    /* passaggio del mouse vero, sul primo grafico dei Progressi (jsdom non ha la geometria: la si finge 1:1) */
    w.eval('showTab("progressi")');
    const svgP = d.querySelector('#panel-progressi svg.graf-lin');
    svgP.getScreenCTM = () => ({ a: 1, d: 1, e: 0, f: 0 });
    const gp = JSON.parse(svgP.getAttribute('data-g')), ix = gp.x.length - 1;
    svgP.dispatchEvent(new w.MouseEvent('pointermove', { bubbles: true, clientX: gp.x[ix] - 2, clientY: (gp.t + gp.b) / 2 }));
    const tipEl = d.querySelector('.graf-tip');
    ok(svgP.classList.contains('g-on') && tipEl && tipEl.classList.contains('is-on') && tipEl.textContent.includes(gp.l[ix]) &&
       svgP.querySelector('.g-guida').style.transform === 'translate(' + gp.x[ix] + 'px,0)' && tipEl.querySelectorAll('.graf-tip__r').length === gp.s.filter(s => s.y[ix] != null).length,
       'grafici a linee: col mouse sopra compaiono la linea guida sulla settimana e il riquadro con data e valori di ogni linea (' + gp.l[ix] + ')');
    d.getElementById('panel-progressi').dispatchEvent(new w.MouseEvent('pointermove', { bubbles: true, clientX: 2, clientY: 2 }));
    ok(!svgP.classList.contains('g-on') && !tipEl.classList.contains('is-on'), 'grafici a linee: uscendo dal grafico guida e riquadro spariscono');
    /* entrata animata: si finge che i grafici compaiano a schermo (IntersectionObserver) */
    w.eval('window.__io=null; window.IntersectionObserver=function(cb){ this.cb=cb; this.obs=[]; window.__io=this; }; window.IntersectionObserver.prototype.observe=function(e){ this.obs.push(e); }; window.IntersectionObserver.prototype.unobserve=function(e){ this.obs=this.obs.filter(function(x){ return x!==e; }); }; grafIO=null; GRAF_VISTI.clear(); renderProgressi();');
    await settle(40);
    const att = [...d.querySelectorAll('#panel-progressi svg.graf-lin')];
    ok(att.length >= 5 && att.every(s => s.classList.contains('g-attesa')), 'entrata: i grafici nuovi aspettano di comparire a schermo (' + att.length + ')');
    w.eval('window.__io.cb(window.__io.obs.slice().map(function(t){ return {isIntersecting:true, target:t}; }))');
    ok(att.every(s => s.classList.contains('g-entra') && !s.classList.contains('g-attesa')), 'entrata: quando compaiono, le linee si disegnano da sinistra a destra');
    w.eval('renderProgressi()'); await settle(40);
    ok([...d.querySelectorAll('#panel-progressi svg.graf-lin')].every(s => !s.classList.contains('g-attesa') && !s.classList.contains('g-entra')),
       'entrata: ridisegnato con gli stessi dati (un clic, il ritorno sul tab) non si rianima');
    const altro = w.eval('exerciseList(progSetGet()).find(function(e){ return e!==progEx; })');
    if (altro) { const s = d.getElementById('prog-ex'); s.value = altro; s.dispatchEvent(new w.Event('change')); await settle(40);
      ok(d.querySelector('#panel-progressi .graf-prog-ex svg.graf-lin').classList.contains('g-attesa') && !d.querySelector('#panel-progressi .prog-reale svg.graf-lin').classList.contains('g-attesa'),
         'entrata: cambiando esercizio si anima solo il grafico che ha dati nuovi'); }
    w.eval('showTab("report")'); await settle(60);
    const rep = [...d.querySelectorAll('#panel-report svg.graf-lin')];
    ok(rep.length > 0 && rep.every(s => !s.classList.contains('g-attesa') && !s.classList.contains('g-entra')), 'entrata: nel Report (e quindi nel PDF) i grafici restano interi, senza animazione (' + rep.length + ')');
    w.eval('delete window.IntersectionObserver; grafIO=null; showTab("progressi");');
    { const css = [...d.querySelectorAll('style')].map(s => s.textContent).join('\n');
      ok(/@media print\{\s*svg\.graf-lin \.g-clip\{animation:none !important; transform:none !important\}\s*svg\.graf-lin \.g-hover, \.graf-tip\{display:none !important\}/.test(css) &&
         /@media \(prefers-reduced-motion:reduce\)\{\s*svg\.graf-lin \.g-clip\{animation:none !important; transform:none !important\}/.test(css),
         'grafici a linee: in stampa e con «riduci movimento» il grafico è sempre intero e senza riquadri'); } }
  /* ── FILTRI «PERIODO» E «ALIMENTAZIONE» dei Progressi, con lo stacco (Marco, 16/11/2026) ── */
  { const J = s => JSON.parse(w.eval('JSON.stringify(' + s + ')'));
    const dg = sel => { const e = d.querySelector(sel); return e ? JSON.parse(e.getAttribute('data-g')) : null; };
    const boxDi = tit => [...d.querySelectorAll('#panel-progressi .chart-box')].find(b => (b.querySelector('h4') || {}).textContent && b.querySelector('h4').textContent.indexOf(tit) >= 0);
    /* 12 settimane di fila (dal 29/12/2025): Bulk 4 settimane, Cut 4, di nuovo Bulk 4 */
    const righe = []; for (let i = 0; i < 12; i++) ['Es A', 'Es B', 'Es C'].forEach((e, k) => righe.push({ scheda: 202601 + i, esercizio: e, macro: 'Altro', serie: 3, rip: 8, peso: Math.round((60 + k * 20) * (1 + 0.02 * i) * 10) / 10 }));
    w.eval('var _fSt=DOC.storico, _fAl=JSON.stringify(DOC.alimentazione), _fU=JSON.stringify(DOC.dati_utente), _fOggi=dataOggi;' +
      'DOC.storico=' + JSON.stringify(righe) + ';' +
      'DOC.alimentazione.periodi=[{id:"b1",fase:"bulk",dal:"2025-12-29",al:"2026-01-25",righe:[]},{id:"c1",fase:"cut",dal:"2026-01-26",al:"2026-02-22",righe:[]},{id:"b2",fase:"bulk",dal:"2026-02-23",al:"2026-03-22",righe:[]}];' +
      'DOC.dati_utente.progSet="__tutti__"; delete DOC.dati_utente.progPer; delete DOC.dati_utente.progPerDa; delete DOC.dati_utente.progPerA; delete DOC.dati_utente.progAlim;' +
      'dataOggi=function(){ return "2026-03-22"; }; showTab("progressi");');
    ok(w.eval('progFiltro()') === null && !d.querySelector('#panel-progressi .g-stacco') && d.getElementById('prog-per') && d.getElementById('prog-alim'),
       'Filtri: senza scelta nessun filtro e nessuno stacco; in cima ci sono i menu Periodo e Alimentazione');
    ok(d.getElementById('prog-per').options.length === 6 && [...d.getElementById('prog-alim').querySelectorAll('optgroup')].map(g => g.children.length).join() === '2,3',
       'Filtri: periodo (tutto, 4 settimane, 3 e 6 mesi, anno, da… a…) e alimentazione per fase (Bulk, Cut) o singolo periodo (3)');
    /* tutti i Bulk: due blocchi separati dal Cut */
    { const s = d.getElementById('prog-alim'); s.value = 'bulk'; s.dispatchEvent(new w.Event('change')); }
    ok(w.eval('DOC.dati_utente.progAlim') === 'bulk' && w.eval('progFiltro().passa(202603) && !progFiltro().passa(202606) && progFiltro().passa(202610)'),
       'Filtri: «Bulk» si ricorda nel profilo e tiene le settimane dei due Bulk, non quelle del Cut');
    { const tl = boxDi('TL totale + media mobile'), st = tl && tl.querySelectorAll('.g-stacco');
      const g = dg('#panel-progressi .chart-grid--compatta .chart-box svg.graf-lin');
      const path = tl && tl.querySelector('path.ln').getAttribute('d');
      ok(st && st.length === 1 && /Cut/.test(st[0].textContent) && /4 sett\./.test(st[0].textContent) && st[0].querySelectorAll('line[stroke-dasharray]').length === 2 &&
         g.l.length === 8 && (path.match(/M/g) || []).length === 2,
         'Filtri: fra i due Bulk uno stacco fra due linee tratteggiate con scritto «Cut · 4 sett.», la linea si interrompe e riprende'); }
    { const dl = dg('#panel-progressi .chart-grid--compatta .chart-box:nth-child(4) svg.graf-lin');
      ok(dl && dl.s[0].y[4] === null && dl.s[0].y[3] !== null && dl.s[0].y[5] !== null, 'Filtri: alla ripresa la Δ TL % non si confronta con la settimana prima dello stacco'); }
    { const atteso = w.eval('nf(caricoCronico(schedeAggr("__tutti__"),true)[8].acwr,2)'), ac = dg('#panel-progressi .chart-grid--compatta .chart-box:nth-child(2) svg.graf-lin');
      ok(ac && ac.s[0].v[4] === atteso, 'Filtri: l\'ACWR della ripresa resta quello calcolato su tutta la storia (' + atteso + ')'); }
    { const ip = J('indiceProgresso("__tutti__",progFiltro())');
      ok(ip.sett.length === 8 && ip.stacchi.length === 1 && ip.stacchi[0].i === 4 && ip.forza[4] === ip.forza[3] && ip.confrontate === 6 && ip.salti.length === 0 &&
         d.querySelector('#panel-progressi .prog-reale .graf-v--largo .g-stacco'),
         'Filtri: il Progresso reale riparte dal livello raggiunto dopo lo stacco, senza contarlo come cambio scheda'); }
    ok(d.querySelector('#panel-progressi .graf-prog-ex .graf-v--largo .g-stacco') !== null, 'Filtri: anche la progressione per esercizio mostra lo stacco');
    ok(/situazione attuale/.test(d.getElementById('panel-progressi').textContent) && /su tutto il percorso/.test(d.querySelector('#panel-progressi .rec-box h4').textContent) &&
       /ultima settimana scelta: 16\/03\/26/.test(d.getElementById('panel-progressi').textContent),
       'Filtri: Segnali e Record restano su tutto il percorso (e lo dicono), l\'«ultima settimana» è l\'ultima scelta');
    /* un solo periodo: il Cut, quattro settimane di fila, nessuno stacco */
    w.eval('DOC.dati_utente.progAlim="p:c1"; renderProgressi();');
    ok(J('schedeAggr("__tutti__").filter(function(a){ return progFiltro().passa(a.scheda); }).map(function(a){ return a.scheda; })').join() === '202605,202606,202607,202608' && !d.querySelector('#panel-progressi .g-stacco'),
       'Filtri: un solo periodo (il Cut) mostra le sue quattro settimane, senza stacchi');
    /* periodo fra due date: le settimane che toccano l'intervallo */
    w.eval('delete DOC.dati_utente.progAlim; DOC.dati_utente.progPer="date"; DOC.dati_utente.progPerDa="2026-02-01"; DOC.dati_utente.progPerA="2026-02-28"; renderProgressi();');
    ok(J('schedeAggr("__tutti__").filter(function(a){ return progFiltro().passa(a.scheda); }).map(function(a){ return a.scheda; })').join() === '202605,202606,202607,202608,202609' &&
       d.getElementById('prog-per-da') && d.getElementById('prog-per-da').value === '2026-02-01' && !d.querySelector('#panel-progressi .g-stacco'),
       'Filtri: «Da… a…» tiene le settimane che toccano le due date (01/02–28/02/26), con le due caselle delle date');
    /* ultime 4 settimane da oggi (22/03/26), e insieme a «Bulk» */
    w.eval('DOC.dati_utente.progPer="4s"; renderProgressi();');
    ok(J('schedeAggr("__tutti__").filter(function(a){ return progFiltro().passa(a.scheda); }).map(function(a){ return a.scheda; })').join() === '202609,202610,202611,202612',
       'Filtri: «Ultime 4 settimane» conta da oggi');
    w.eval('DOC.dati_utente.progAlim="p:c1"; renderProgressi();');
    ok(/Nessuna settimana salvata nel periodo o nella fase alimentare scelti/.test(d.getElementById('panel-progressi').textContent) && d.getElementById('prog-per') && d.getElementById('prog-alim'),
       'Filtri: se la scelta non trova settimane lo si dice, e i menu restano per cambiarla');
    w.eval('DOC.dati_utente.progAlim="p:sparito"; DOC.dati_utente.progPer="boh";');
    ok(w.eval('progAlimGet()') === 'tutte' && w.eval('progPerGet()') === 'tutto', 'Filtri: un periodo eliminato o una scelta sconosciuta tornano a «tutto»');
    ok(w.eval('cardioProgressBlock({passa:function(){ return false; }})') === '', 'Filtri: il blocco Cardio segue il filtro (nessuna seduta scelta, niente blocco)');
    { const svg = new w.DOMParser().parseFromString('<div>' + w.eval('lineChart([{name:"A",color:"red",data:[1,2,3,4].map(function(v,i){ return {x:"s"+i,y:v}; })}],{w:400,h:200,stacchi:[{i:2,testo:"Cut",sotto:"3 sett."}]})') + '</div>', 'text/html').querySelector('svg');
      const x = JSON.parse(svg.getAttribute('data-g')).x;
      ok(x[2] - x[1] > 2 * (x[1] - x[0]) && svg.querySelectorAll('.g-stacco').length === 1, 'grafici a linee: lo stacco allarga lo spazio fra i due blocchi'); }
    w.eval('DOC.storico=_fSt; DOC.alimentazione=JSON.parse(_fAl); DOC.dati_utente=JSON.parse(_fU); dataOggi=_fOggi; renderProgressi();'); }
  w.eval('showTab("analisi")');
  { const pa = d.getElementById('panel-analisi');
    if (w.eval('((DOC.alimentazione||{}).periodi||[]).length') > 0) {
      const titoli = [...pa.querySelectorAll('.graf-pagina > .sec')].map(x => x.textContent.trim());
      ok(titoli.join('|') === 'Quadro nel tempo|Dieta e peso|Carico e correlazioni', 'Analisi: tre sezioni per argomento (' + titoli.join(' · ') + ')');
      const tl = pa.querySelector('.chart-box--largo');
      ok(tl && /Timeline/.test(tl.textContent) && tl.querySelector('.graf-v--largo svg') && tl.querySelector('.graf-v--stretto svg') && tl.querySelector('[data-spieg="timeline"]'),
         'Analisi: la Timeline prende tutta la riga, in versione larga e stretta, col suo «?»');
      { const gt = JSON.parse(tl.querySelector('.graf-v--largo svg.graf-lin').getAttribute('data-g'));
        ok(gt.s.length >= 1 && gt.s.some(s => s.n === 'Training Load') && Array.isArray(gt.e) && gt.e.some(x => /Bulk|Mantenimento|Cut/.test(x)),
           'Analisi: anche la Timeline dà col mouse carico, peso e il periodo alimentare di quella settimana'); }
      ok(pa.querySelectorAll('.chart-grid--compatta > .chart-box').length === 5 && pa.querySelector('.pag__side') && /Periodi/.test(pa.querySelector('.pag__side').textContent),
         'Analisi: i cinque grafici sulla griglia compatta, il pannello dei periodi resta di lato');
    } else ok(false, 'Analisi: servono i periodi del profilo dimostrativo per provare la vista compatta');
  }
  /* i grafici senza le misure compatte restano quelli di prima (Report, Corpo, Cardio) */
  ok(!/--graf-fs/.test(w.eval('lineChart([{name:"A",color:"red",data:[{x:"a",y:1},{x:"b",y:2}]},{name:"B",color:"blue",data:[{x:"a",y:2},{x:"b",y:3}]}])')) &&
     w.eval('lineChart([{name:"A",color:"red",data:[{x:"a",y:1},{x:"b",y:2}]},{name:"B",color:"blue",data:[{x:"a",y:2},{x:"b",y:3}]}])').includes('display:flex;gap:14px;flex-wrap:wrap;font-size:11px;margin-top:6px') &&
     /viewBox="0 0 560 240"/.test(w.eval('timelineChart(serieSettimanali())')) && !/--graf-fs/.test(w.eval('timelineChart(serieSettimanali())')),
     'grafici: senza opts.fs misure, scritte e legenda restano quelle di sempre (il Report li usa così)');
  /* etichette delle date: nella vista compatta non si accavallano e non escono dal disegno */
  { const W = 380, FS = 11;
    const svg = w.eval('(function(){ var L=[]; for(var i=0;i<27;i++){ var x=new Date(2025,10,3+7*i); L.push(("0"+x.getDate()).slice(-2)+"/"+("0"+(x.getMonth()+1)).slice(-2)+"/"+String(x.getFullYear()).slice(2)); } return lineChart([{name:"TL",color:"red",data:L.map(function(l,i){ return {x:l,y:100+i}; })}],{labels:L,w:' + W + ',h:170,fs:' + FS + '}); })()');
    const et = [...svg.matchAll(/<text class="lbl" x="([\d.]+)" y="162" text-anchor="(\w+)">([^<]+)<\/text>/g)].map(m => { const lw = m[3].length * FS * 0.6, x = +m[1];
      return m[2] === 'end' ? [x - lw, x] : [x - lw / 2, x + lw / 2]; });
    ok(et.length >= 3 && et.length <= 6 && et.every((r, i) => r[0] >= 0 && r[1] <= W && (i === 0 || r[0] > et[i - 1][1])),
       'grafici compatti: le date sull\'asse si diradano, non si accavallano e l\'ultima resta dentro il disegno (' + et.length + ' etichette)'); }
  { const svg = w.eval('barChart(["Gambe","Pettorali","Schiena","Spalle","Braccia","Core","Cardio"].map(function(g,i){ return {x:g,y:10+i}; }),{w:380,h:215,fs:11})');
    const ys = [...svg.matchAll(/<text class="lbl" x="[\d.]+" y="([\d.]+)" text-anchor="middle">(Gambe|Pettorali|Schiena|Spalle|Braccia|Core|Cardio)<\/text>/g)].map(m => +m[1]);
    ok(ys.length === 7 && ys[0] !== ys[1] && ys[0] === ys[2] && ys[1] === ys[3], 'grafici compatti: i nomi lunghi sotto le barre strette si sfalsano su due righe invece di accavallarsi'); }
  { const svg = w.eval('lineChart([{name:"M",color:"red",data:[1.38,1.53,1.41,1.5,1.45].map(function(v,i){ return {x:"s"+i,y:v}; })}])');
    const tacche = [...svg.matchAll(/text-anchor="end">([^<]+)<\/text>/g)].map(m => m[1]);
    ok(tacche.length === 5 && new Set(tacche).size === 5, 'grafici: la scala verticale non ripete lo stesso numero (Monotonia: ' + tacche.join(' ') + ')'); }
  /* il Report non usa la vista compatta: i suoi grafici restano alle loro misure */
  w.eval('showTab("report")'); await settle(30);
  { const svgR = [...d.querySelectorAll('#rep-sorgente svg')];
    ok(svgR.length > 0 && svgR.every(x => !/--graf-fs/.test(x.getAttribute('style') || '')), 'Report: i grafici restano quelli di prima, senza le misure compatte (' + svgR.length + ' grafici)'); }
  /* ── ⚙ Impostazioni e stili della notte (Marco, 16/11/2026) ── */
  { const bi = d.getElementById('btn-impost');
    ok(bi && bi.closest('.topbar') && bi.parentElement.querySelector('#btn-theme'), 'Impostazioni: l\'ingranaggio ⚙ sta nella barra in alto, accanto a 🌙/☀');
    w.eval('temaSalva("giorno")');
    bi.click();
    let m = d.getElementById('modal');
    ok(m.querySelectorAll('[data-imp-notte] .imp-ant').length === 3 && m.querySelectorAll('[data-imp-tema]').length === 2 && /Stile della modalità notte/.test(m.textContent),
       'Impostazioni: tema giorno/notte e i tre stili della notte, ognuno con la sua anteprima');
    m.querySelector('[data-imp-notte="grafite"]').click();
    const h = d.documentElement;
    ok(h.getAttribute('data-theme') === 'notte' && h.getAttribute('data-notte') === 'grafite' && w.localStorage.getItem('tms-notte') === 'grafite' && w.localStorage.getItem('tms-theme') === 'notte',
       'Impostazioni: scelto «Grafite» si passa subito alla notte con quello stile, e la scelta si ricorda');
    m = d.getElementById('modal');
    ok(m.querySelector('[data-imp-notte="grafite"].is-on') && m.querySelector('[data-imp-tema="notte"].is-on'), 'Impostazioni: lo stile e il tema scelti risultano selezionati');
    d.getElementById('imp-ok').click();
    ok(w.eval('document.getElementById("modal-bk").classList.contains("hidden")'), 'Impostazioni: «Chiudi» chiude la finestra');
    d.getElementById('btn-theme').click();
    ok(h.getAttribute('data-theme') === 'giorno' && w.localStorage.getItem('tms-theme') === 'giorno' && w.localStorage.getItem('tms-notte') === 'grafite',
       'Impostazioni: 🌙/☀ torna al giorno e lo stile della notte resta quello scelto');
    d.getElementById('btn-theme').click();
    ok(h.getAttribute('data-theme') === 'notte' && h.getAttribute('data-notte') === 'grafite', 'Impostazioni: ripassando alla notte torna lo stile scelto');
    w.localStorage.setItem('tms-notte', 'boh'); w.localStorage.setItem('tms-theme', 'erdtree');
    ok(w.eval('notteGet()') === 'calda' && w.eval('temaGet()') === 'giorno', 'Impostazioni: valori sconosciuti o vecchi ricadono su giorno e «Notte calda»');
    const css = [...d.querySelectorAll('style')].map(x => x.textContent).join('');
    ok(/\[data-theme="notte"\]\[data-notte="grafite"\]\{/.test(css) && /\[data-theme="notte"\]\[data-notte="blu"\]\{/.test(css) && /\[data-theme="notte"\] \.ex-pick\{/.test(css),
       'Tema notte: ci sono le palette Grafite e Blu notte e la nuova casella dell\'esercizio');
    ok(/\.rep-pagine \.pg\{[^}]*--c-rosso:#991b1b[^}]*--n-testa:/.test(css), 'Tema notte: i fogli del Report restano carta, anche coi colori dei grafici e le intestazioni delle tabelle');
    w.eval('temaSalva("giorno","calda")');
  }
  /* colori dei gruppi e delle fasce nei grafici: passano dalle variabili del tema */
  w.eval('showTab("progressi")');
  { const hp = d.getElementById('panel-progressi').innerHTML;
    ok(/var\(--c-rosso\)/.test(hp) && /var\(--c-viola\)/.test(hp) && !/#991b1b|#7a3ea8/.test(hp), 'Progressi: i colori dei gruppi e delle fasce vengono dal tema (di notte si schiariscono)'); }
  /* due colonne a scorrimento indipendente in tutte le pagine che le hanno */
  for (const tab of ['allenamento', 'cardio', 'storico', 'corpo', 'alimentazione', 'esercizi', 'profilo']) {
    w.eval('showTab(' + JSON.stringify(tab) + ')');
    const p = d.querySelector('#panel-' + tab + ' .pag');
    ok(p !== null && p.querySelector('.pag__main') !== null && p.querySelector('.pag__side') !== null && p.querySelector('.pag__side').children.length > 0, 'due colonne: ' + tab + ' ha colonna principale e pannello laterale');
  }
  w.innerWidth = 1920; w.innerHeight = 1040; w.eval('showTab("allenamento")');
  ok(d.querySelector('#panel-allenamento .pag').style.height !== '', 'schermo largo: la coppia di colonne riceve un\'altezza (ogni colonna scorre per conto suo)');
  { d.querySelector('#panel-allenamento .pag__main').scrollTop = 137; d.querySelector('#panel-allenamento .pag__side').scrollTop = 41;
    w.eval('schedaRows().push({giorno:"Lunedì",esercizio:"",note:"",serie:3,rip:10,peso:0,rest:"1:30"}); renderAllenamento();');
    ok(d.querySelector('#panel-allenamento .pag__main').scrollTop === 137 && d.querySelector('#panel-allenamento .pag__side').scrollTop === 41, 'ridisegnando la pagina le due colonne restano dov\'erano (non tornano in cima)');
    w.eval('schedaRows().pop(); renderAllenamento();'); }
  w.innerWidth = 1100; w.eval('adattaPag()');
  ok(d.querySelector('#panel-allenamento .pag').style.height === '', 'schermo stretto: nessuna altezza forzata, il pannello sta sotto e scorre la pagina');
  const css = fs.readFileSync(ARTEFATTO, 'utf8');
  ok(/html\{scrollbar-width:none\}/.test(css) && /\.pag__main::-webkit-scrollbar, \.pag__side::-webkit-scrollbar, \.pag__terza::-webkit-scrollbar\{display:none\}/.test(css), 'la barra di scorrimento non viene mostrata, né sulla pagina né sulle colonne');
  ok(/\.pag\.pag--tre\{grid-template-columns:minmax\(0,1fr\) [^}]+\) [^}]+\)\}/.test(css) && (w.eval('showTab("alimentazione")'), d.querySelector('#panel-alimentazione .pag--tre > .pag__terza .tbl-wrap')) !== null,
    'Alimentazione su tre colonne: piano, sintesi, indice nutrienti OMS/FAO');
  /* scheda dell'esercizio nel catalogo */
  w.eval('DOC.esercizi.push({nome:"Esercizio di prova",macro:"Gambe",gruppo:"Gambe",tipo:"Multi-articolare",fattore:1,muscoli_primari:["quadricipiti"],muscoli_secondari:["glutei"],istruzioni:["Primo passo.","Secondo passo."]}); rebuildEs(); DOC.storico.push({scheda:202640,esercizio:"Esercizio di prova",seduta:1,macro:"Gambe",serie:3,rip:5,peso:80},{scheda:202641,esercizio:"Esercizio di prova",seduta:1,macro:"Gambe",serie:3,rip:5,peso:85}); exFilt="prova"; showTab("esercizi");');
  { const tr = d.querySelector('#panel-esercizi tr[data-exrow="Esercizio di prova"]'); tr.click();
    const s = d.getElementById('ex-side').textContent;
    ok(tr.classList.contains('is-sel') && s.includes('Esercizio di prova') && s.includes('Primo passo.') && s.includes('85') && d.querySelectorAll('#ex-side .mchip').length === 2 && d.querySelector('#ex-side svg') !== null, 'catalogo: cliccando una riga il pannello mostra muscoli, istruzioni, ultima volta, record e progressione');
    d.querySelector('#ex-side [data-exmod]').click();
    ok(d.getElementById('ex-nome') !== null && d.getElementById('ex-nome').value === 'Esercizio di prova', 'catalogo: dal pannello si apre la modifica dell\'esercizio');
    w.eval('closeModal(); exFilt=""; exSel=""; DOC.storico=DOC.storico.filter(function(r){return r.esercizio!=="Esercizio di prova";}); DOC.esercizi=DOC.esercizi.filter(function(e){return e.nome!=="Esercizio di prova";}); rebuildEs();'); }
  ok(errors.length === 0, 'nessun errore runtime' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  await settle(300);
  dom.window.close();
}

console.log('--- T11: pesate della bilancia (dal telefono collegato) ---');
{
  /* 2026-11-15: la bilancia parla con l'app del telefono; le pesate arrivano da sole e la
     media di ogni settimana va da sola nello Storico misure (una domanda solo se c'è già una
     misura scritta a mano). Settimane ISO 2026: 45 = 2–8 nov, 46 = 9–15 nov, 47 = 16–22 nov. */
  const fsmem = makeTmsFS(); const J = o => JSON.stringify(o);
  await fsmem.writeFile('TMS_Dati/profili.json', J({ list: [{ slug: 'anna', nome: 'Anna', creato: '2026-01-01' }], active: 'anna' }));
  await fsmem.writeFile('TMS_Dati/anna/scheda.json', J({ settimanale: [{ giorno: 'Lunedì', esercizio: 'Squat con bilanciere', serie: 3, rip: 5, peso: 100 }], mensile: [] }));
  await fsmem.writeFile('TMS_Dati/anna/storico.json', '[]');
  await fsmem.writeFile('TMS_Dati/anna/corpo.json', J({ dati_utente: { nome: 'Anna', sesso: 'F', altezza: 170, nascita: '1990-05-01', livello_attivita: 1.5, peso: 66, massa_grassa: 0.25 },
    storico_io: [{ scheda: 202645, eta: 36, livello: 1.5, peso: 66.5, metabolismo: 2100, bmi: 23, massa_grassa: 0.26, massa_magra: 49.2, massa_muscolare: 45, massa_ossea: 2.4, metab_basale: 1400, grasso_viscerale: 5 }] }));
  await fsmem.writeFile('TMS_Dati/anna/alimentazione.json', J({ bulk: [], mant: [], cut: [] }));
  const { dom, errors } = await load({ idb: makeIDB(), tmsFS: fsmem, fsa: true });
  await settleConnect(dom, fsmem); await settle(400);
  const w = dom.window, d = w.document;
  let domande = [], risposte = [];
  w.alert = () => {}; w.confirm = m => { domande.push(String(m)); return risposte.length ? risposte.shift() : true; };
  const corpoDisco = () => JSON.parse(fsmem._files.get('TMS_Dati/anna/corpo.json'));
  const riga = c => w.eval('JSON.stringify((DOC.storico_io||[]).find(function(r){return +r.scheda===' + c + ';})||null)');
  const R = c => JSON.parse(riga(c));
  const importa = async obj => { await w.eval('importaPesate(' + J(obj.pesate || []) + ')'); await settle(150); };
  const P = (data, ora, peso, x) => Object.assign({ id: data + 'T' + ora + '|' + peso, data: data, ora: ora, peso: peso }, x || {});
  const comp = (g, ac, mu, bmr) => ({ grasso: g, acqua: ac, muscolo: mu, ossa: 2.5, proteine: 17, visc: 5, bmr: bmr, imp: [500, 480, 300, 310, 20, 450, 430, 280, 290, 18] });
  ok(errors.length === 0 && !w.eval('scrittureBloccate'), 'pesate: avvio senza errori');

  /* pulizia e scelta della pesata del giorno */
  ok(w.eval('pulisciPesata({data:"2026-13-40",peso:70})') === null && w.eval('pulisciPesata({data:"2026-11-09",peso:"abc"})') === null && w.eval('pulisciPesata({data:"2026-11-09",peso:5})') === null,
     'pesate: data o peso non validi → scartata');
  { const p = JSON.parse(w.eval('JSON.stringify(pulisciPesata({data:"2026-11-09",ora:"7:5",peso:70.123,grasso:99,acqua:55,imp:[1,2,"x"]}))'));
    ok(p.peso === 70.12 && p.ora === '' && !('grasso' in p) && p.acqua === 55 && !('imp' in p) && /^2026-11-09T00:00\|70/.test(p.id),
       'pesate: valori fuori intervallo o malformati tolti, la pesata resta (id ricostruito se manca)'); }
  ok(w.eval('pesateContate([{id:"a",data:"2026-11-09",ora:"07:00",peso:70},{id:"b",data:"2026-11-09",ora:"07:01",peso:70.2,grasso:20},{id:"c",data:"2026-11-09",ora:"19:00",peso:71,grasso:21},{id:"d",data:"2026-11-10",ora:"08:00",peso:69}]).map(function(p){return p.id;}).join()') === 'b,d',
     'pesate: una al giorno, la prima completa (la prima, se nessuna ha la composizione)');

  /* la scheda per il telefono porta altezza, sesso ed età */
  { const c = JSON.parse(w.eval('JSON.stringify(costruisciSchedaJSON({}).corpo)'));
    ok(c.altezza === 170 && c.sesso === 'F' && c.eta === w.eval('etaOf(DOC.dati_utente)') && c.eta > 30, 'scheda per il telefono: porta altezza, sesso ed età per la bilancia (e nient\'altro del corpo)'); }

  /* pesate arrivate dal telefono */
  const pesate1 = [
    P('2026-11-09', '07:00', 65.0, comp(24, 52, 46, 1400)),
    P('2026-11-09', '19:00', 66.0, comp(26, 50, 46, 1390)),
    P('2026-11-11', '07:10', 64.6, comp(23.6, 52.4, 46.2, 1404)),
    P('2026-11-16', '07:05', 64.8, comp(23.8, 52.2, 46.1, 1402)),
    P('2026-11-05', '07:00', 65.5, comp(25, 51, 45.5, 1395)),
    { id: 'rotta', data: '2026-11-10', peso: 'abc' }];
  const rientroPesate = { tipo: 'tms-rientro', versione: 1, profilo: { slug: 'anna', nome: 'Anna' }, righe: [], sedute: [], pesate: pesate1 };
  const schedaPrima = w.eval('JSON.stringify(DOC.scheda)');
  domande = []; risposte = [false];   /* «Tienili»: la settimana 45 scritta a mano resta com'è */
  await importa(rientroPesate);
  ok(domande.length === 1 && /scritti a mano/.test(domande[0]) && /02\/11\/26/.test(domande[0]), 'pesate: UNA domanda, solo per la settimana con la misura scritta a mano');
  ok(w.eval('DOC.pesate.length') === 5 && w.eval('DOC.scheda && JSON.stringify(DOC.scheda)') === schedaPrima, 'pesate: 5 salvate (1 illeggibile saltata), scheda Pesi intatta');
  { const r = R(202646);
    ok(r && r.n_pesate === 2 && r.peso === 64.8 && r.massa_grassa === 0.238 && r.acqua === 52.2 && r.metab_basale === 1402,
       'settimana 46: media di 2 pesate (la seconda del lunedì non conta) → peso 64,8, grasso 23,8 %, acqua 52,2 %');
    ok(Math.abs(r.bmi - 64.8 / (1.7 * 1.7)) < 0.01 && r.metabolismo === 1402 * 1.5 && Math.abs(r.massa_magra - 64.8 * (1 - 0.238)) < 0.01 && r.massa_muscolare === 46.1,
       'settimana 46: BMI dall\'altezza del profilo, fabbisogno = basale × livello, massa magra = peso − grasso'); }
  ok(R(202647) && R(202647).n_pesate === 1 && R(202647).peso === 64.8, 'settimana 47 (ancora in corso): riga con la sola pesata arrivata');
  ok(R(202645).peso === 66.5 && !R(202645).n_pesate, 'settimana 45 scritta a mano: «Tienili» la lascia com\'era');
  ok(w.eval('DOC.dati_utente.peso') === 64.8 && w.eval('DOC.dati_utente.massa_grassa') === 0.238 && w.eval('DOC.dati_utente.acqua') === 52.2 && w.eval('DOC.dati_utente.metab_basale') === 1402,
     'campi del tab Corpo all\'ultima pesata (16/11)');
  await settle(500);
  { const c = corpoDisco();
    ok(Array.isArray(c.pesate) && c.pesate.length === 5 && c.storico_io.some(r => r.scheda === 202646 && r.n_pesate === 2) && Array.isArray(c.pesate_scartate),
       'corpo.json su disco: pesate e medie salvate'); }

  /* le stesse pesate di nuovo: niente doppioni, nessuna domanda */
  const ioPrima = w.eval('JSON.stringify(DOC.storico_io)');
  domande = [];
  await importa(rientroPesate);
  ok(w.eval('DOC.pesate.length') === 5 && w.eval('JSON.stringify(DOC.storico_io)') === ioPrima && domande.length === 0,
     'stesse pesate due volte: quelle già arrivate non si doppiano e lo Storico non cambia');
  { const r = JSON.parse(await w.eval('(async function(){ return JSON.stringify(await importaPesate(' + J(pesate1) + ')); })()'));
    ok(r.nuove === 0 && r.gia === 5 && r.nonValide === 1, 'riepilogo: 0 nuove, 5 già arrivate, 1 illeggibile'); }

  /* pesata nuova nella settimana 45, risposta «Sostituisci» */
  domande = []; risposte = [true];
  await importa({ tipo: 'tms-rientro', versione: 1, profilo: { slug: 'anna', nome: 'Anna' }, righe: [], pesate: pesate1.concat([P('2026-11-06', '07:02', 65.1, comp(24.6, 51.4, 45.7, 1398))]) });
  ok(domande.length === 1 && R(202645).n_pesate === 2 && R(202645).peso === 65.3, 'settimana 45: «Sostituisci» mette la media delle pesate (2) al posto della misura a mano');
  ok(w.eval('DOC.pesate.length') === 6 && w.eval('DOC.dati_utente.peso') === 64.8, 'una pesata vecchia non cambia i campi del tab Corpo (restano all\'ultima)');

  /* riquadro nel tab Corpo e colonne dello Storico misure */
  w.eval('showTab("corpo")');
  { const box = d.getElementById('pesate-box');
    ok(box && box.querySelectorAll('[data-delpes]').length === 6 && box.querySelectorAll('tr.pesata-fuori').length === 1 && /Settimana del/.test(box.textContent),
       'tab Corpo: riquadro «Pesate della bilancia» per settimana, la seconda pesata del giorno in grigio'); }
  w.eval('showTab("storicocorpo")');
  { const p = d.getElementById('panel-storicocorpo');
    ok(/N\. pesate/.test(p.textContent) && /Acqua %/.test(p.textContent) && [...p.querySelectorAll('td.num')].some(td => td.textContent.trim() === '2'), 'Storico misure: colonne Acqua % e N. pesate'); }

  /* togliere una pesata: la media si ricalcola e la pesata non torna; Ctrl+Z la rimette */
  await settle(1300);   /* passo di annullamento separato dall'import */
  w.eval('showTab("corpo")');
  const id11 = '2026-11-11T07:10|64.6';
  domande = []; risposte = [true];
  d.querySelector('#pesate-box [data-delpes="' + id11 + '"]').click(); await settle(80);
  ok(w.eval('DOC.pesate.length') === 5 && w.eval('DOC.pesate_scartate.indexOf(' + J(id11) + ')') >= 0 && R(202646).n_pesate === 1 && R(202646).peso === 65,
     'tolta una pesata: la settimana 46 si ricalcola (resta il lunedì)');
  await importa(rientroPesate);
  ok(w.eval('DOC.pesate.length') === 5 && R(202646).n_pesate === 1, 'la pesata tolta non torna se arriva di nuovo dal telefono');
  await settle(1300);
  w.eval('annulla()'); await settle(100);
  ok(w.eval('DOC.pesate.length') === 6 && w.eval('DOC.pesate_scartate.indexOf(' + J(id11) + ')') < 0 && R(202646).n_pesate === 2, 'Ctrl+Z rimette la pesata tolta e la media di prima');

  /* una settimana di sole pesate tolte del tutto: la riga dello Storico sparisce */
  w.eval('DOC.pesate=DOC.pesate.filter(function(p){return settimanaPesata(p)!==202647;}); ricalcolaSettimanaPesate(202647);');
  ok(R(202647) === null, 'settimana senza più pesate: la sua riga (fatta dalle pesate) esce dallo Storico');
  ok(w.eval('(function(){ var n=DOC.storico_io.length; DOC.storico_io.push({scheda:203001,peso:70}); ricalcolaSettimanaPesate(203001); var ok=DOC.storico_io.length===n+1; DOC.storico_io.pop(); return ok; })()'),
     'una misura scritta a mano non viene mai tolta dal ricalcolo');

  /* una pesata nuova della settimana in corso */
  domande = []; risposte = [];
  await importa({ pesate: [P('2026-11-17', '07:00', 64.5, comp(23.5, 52.5, 46.2, 1405))] });
  ok(R(202647) && R(202647).n_pesate === 1 && R(202647).peso === 64.5 && domande.length === 0, 'pesata nuova: la media della settimana va da sola nello Storico misure, senza domande');
  const nPes = w.eval('DOC.pesate.length');
  await importa({ pesate: [] });
  ok(w.eval('DOC.pesate.length') === nPes, 'nessuna pesata: niente cambia');

  /* backup e file: le pesate non si perdono */
  ok(w.eval('corpoFile({pesate:[1],pesate_scartate:["x"]}).pesate.length') === 1 && w.eval('corpoFile(corpoDaFile(null)).pesate.length') === 0, 'corpoFile/corpoDaFile: le pesate passano, file assente = elenchi vuoti');
  { const snap = JSON.parse(await w.eval('costruisciSnapshot().then(s=>JSON.stringify(s))'));
    ok(snap.profiles.anna && snap.profiles.anna.pesate.length === nPes && Array.isArray(snap.profiles.anna.pesate_scartate), 'backup: comprende le pesate del profilo'); }
  w.eval('DOC.pesate.push({id:"chiusura",data:"2026-11-19",ora:"07:00",peso:64}); persist("corpo");');
  ok(w.eval('scaricaSubito()') >= 1 && JSON.parse(fsmem._files.get('TMS_Dati/anna/corpo.json')).pesate.some(p => p.id === 'chiusura'), 'chiusura dell\'app: le pesate in attesa partono subito');
  ok(errors.length === 0, 'pesate: nessun errore runtime' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  await settle(300);
  dom.window.close();
}

console.log('--- T12: bilancia nell\'app del telefono (PWA + trasporto finto) ---');
{
  /* Messaggi COSTRUITI qui (valori inventati, nel formato della famiglia FitDays/iComon a 8
     elettrodi): 72,40 kg e 10 impedenze; a 180 cm la formula WLA25 deve dare 15,8 % di grasso e,
     per una donna di 31 anni, età metabolica 28 — gli stessi numeri attesi da openScale. */
  const PWA = path.join(ROOT, 'app-android', 'web', 'index.html');
  const fr = (seq, len, b2, tipo, dati) => { const b = new Array(20).fill(0); b[0] = seq; b[1] = len; b[2] = b2;
    let i = 3; if (tipo != null) b[i++] = tipo; dati.forEach(x => { b[i++] = x & 255; });
    let s = 0; for (let k = 3; k <= 18; k++) s += b[k]; b[19] = s & 0x1F; return b; };
  const u16 = v => [(v >> 8) & 255, v & 255], u24 = v => [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  const IMP = [24.0, 340.0, 350.0, 280.0, 285.0, 19.0, 300.0, 310.0, 250.0, 255.0];
  const decimi = a => a.flatMap(x => u16(Math.round(x * 10)));
  const A1 = fr(0x00, 0x0a, 0, 0xA1, [0x33, 0x31, 0x02, 0x23, 0x00, 0x19, 0x01, 0x0a, 0x19]);
  const A2 = (seq, stato, g) => fr(seq, 0x07, 0, 0xA2, [stato, 0x19].concat(u24(g)));
  const P1 = fr(0x05, 0x1a, 0, 0xA3, [0x19].concat(u24(72400), [0], decimi(IMP.slice(0, 5))));
  const P2 = fr(0x05, 0x1a, 1, null, decimi(IMP.slice(5)));
  const scheda = { tipo: 'tms-scheda', versione: 1, app: '1.1.24', modificabile: false, rpe: true,
    profilo: { slug: 'prova', nome: 'Cliente Prova' }, esportata: '2026-11-16', corpo: { altezza: 180, sesso: 'F', eta: 31 },
    righe: [{ giorno: 'Lunedì', esercizio: 'Squat con bilanciere', serie: 3, rip: 5, peso: 80, rest: '2:00', rir: null, test: false, note: '', video: '' }],
    riscaldamento: [], ultima: {}, video: {}, dieta: null };
  /* senza trasporto Bluetooth (app vecchia, browser) la voce Bilancia non c'è */
  { const sub = await JSDOM.fromFile(PWA, { runScripts: 'dangerously', url: 'https://tms.test/app/index.html',
      beforeParse(win){ win.localStorage.setItem('tms-scheda-lang','it'); win.localStorage.setItem('tms-scheda-corrente', JSON.stringify(scheda)); win.scrollTo = () => {}; } });
    await settle(300);
    ok(sub.window.document.getElementById('menu').hidden === false && sub.window.document.getElementById('vai-bil').hidden === true, 'telefono: senza Bluetooth (fuori dall\'APK) la voce «⚖ Bilancia» non compare');
    sub.window.close(); }
  const sub = await JSDOM.fromFile(PWA, { runScripts: 'dangerously', url: 'https://tms.test/app/index.html',
    beforeParse(win){ win.localStorage.setItem('tms-scheda-lang','it'); win.localStorage.setItem('tms-scheda-corrente', JSON.stringify(scheda)); win.scrollTo = () => {};
      const B = win.__ble = { scritti: [], collegati: [], staccati: 0, cercato: 0 };
      win.tmsBLE = { prepara: async () => ({ ok: true }),
        cerca: async (filtro, trovato) => { B.cercato++; B.filtro = filtro; B.trovato = trovato; },
        fermaRicerca: async () => {}, collega: async (id, cb) => { B.collegati.push(id); B.cb = cb; },
        scrivi: async (id, c, b) => { B.scritti.push([c, b.slice()]); }, stacca: async () => { B.staccati++; } }; } });
  await settle(300);
  const sw = sub.window, sd = sw.document, B = sw.__ble;
  const dati = (c, b) => B.cb.onDati(c, b.slice());
  ok(sd.getElementById('vai-bil').hidden === false, 'telefono: nell\'APK (Bluetooth disponibile) il menu ha «⚖ Bilancia»');
  /* formula e arrotondamenti come la libreria originale */
  ok(Math.abs(sw.eval('r1(26.35)') - 26.4) < 1e-5 && Math.abs(sw.eval('r1(1.95)') - 1.9) < 1e-5 && Math.abs(sw.eval('r1(70.4)') - 70.4) < 1e-5,
     'WLA25: arrotondamento al decimo come la libreria (26,35 → 26,4; 1,95 → 1,9 per la virgola mobile a 32 bit)');
  { const w = JSON.parse(sw.eval('JSON.stringify(wla25(180,72.4,' + JSON.stringify(IMP) + '))'));
    ok(Math.abs(w.grasso - 15.8) < 1e-5 && w.visc >= 1 && w.visc <= 20 && w.bmr > 1500 && w.bmr < 1800,
       'WLA25: 180 cm, 72,4 kg e le 10 impedenze di prova → grasso 15,8 % (come openScale)');
    ok(sw.eval('etaMetabolica(31,"F",15.8)') === 28 && sw.eval('etaMetabolica(31,"M",15.8)') === 29, 'età metabolica: donna 31 anni al 15,8 % → 28; uomo → 29');
    ok(sw.eval('wla25(180,72.4,[0,0,0,0,0,0,0,0,0,0])') === null && sw.eval('wla25(0,72.4,' + JSON.stringify(IMP) + ')') === null, 'WLA25: impedenze non valide (maniglie non tenute) o altezza mancante → niente composizione'); }
  ok(sw.eval('bilChkOk(' + JSON.stringify(P1) + ')') === true && sw.eval('bilChkOk(' + JSON.stringify(P1.slice(0, 19).concat([(P1[19] + 1) & 0x1F])) + ')') === false,
     'messaggi: controllo di somma (5 bit bassi della somma dei byte 3–18)');
  ok(JSON.stringify(sw.eval('JSON.stringify(bilImpedenze(' + JSON.stringify(P1) + ',' + JSON.stringify(P2) + '))')) === JSON.stringify(JSON.stringify(IMP)),
     'messaggi: le 10 impedenze dalle due parti del risultato, in decimi di ohm');

  /* pagina Bilancia: ricerca, collegamento, peso in diretta, risultato */
  sd.getElementById('vai-bil').click(); await settle(50);
  ok(sd.getElementById('bil').hidden === false && /Cliente Prova/.test(sd.getElementById('bil-chi').textContent) && /180 cm/.test(sd.getElementById('bil-chi').textContent),
     'pagina Bilancia: dice per chi è la pesata (nome, altezza, età)');
  ok(B.cercato === 1 && B.filtro({ id: 'X', nome: 'HEALTHKEEP' }) === true && B.filtro({ id: 'Y', nome: 'Mi Band 7' }) === false,
     'ricerca: la prima volta riconosce la bilancia dal nome, non altri dispositivi');
  B.trovato({ id: 'AA:BB:CC:DD:EE:FF', nome: 'HEALTHKEEP' }); await settle(30);
  ok(B.collegati[0] === 'AA:BB:CC:DD:EE:FF' && sw.localStorage.getItem('tms-bilancia-id') === 'AA:BB:CC:DD:EE:FF', 'collegamento: la bilancia trovata viene ricordata');
  ok(sw.eval('bilIdNoto()') === 'AA:BB:CC:DD:EE:FF', 'ricerca successiva: per indirizzo (la bilancia ricordata)');
  dati('ffb3', A1); await settle(10);
  { const a = B.scritti[0] || ['', []];
    ok(a[0] === 'ffb1' && a[1][3] === 0xB0 && a[1][4] === 0x00 && a[1][1] === 0x03 && sw.eval('bilChkOk(' + JSON.stringify(a[1]) + ')'), 'messaggio informativo A1: confermato con B0 (sul canale di scrittura FFB1)'); }
  dati('ffb3', P1); dati('ffb3', P2); await settle(30);
  ok(sw.eval('PESATE.length') === 0, 'un risultato arrivato prima del peso in diretta (ripetuto al collegamento) NON diventa una pesata');
  dati('ffb2', A2(1, 1, 35000)); dati('ffb2', A2(2, 1, 72400)); await settle(10);
  ok(/72,4/.test(sd.getElementById('bil-peso').textContent) && /Peso in misura/.test(sd.getElementById('bil-stato').textContent), 'peso in diretta: 72,4 kg mentre si misura');
  dati('ffb2', A2(3, 3, 72400)); await settle(10);
  ok(/maniglie/.test(sd.getElementById('bil-stato').textContent), 'peso fermo: chiede di tenere le maniglie mentre misura la composizione');
  dati('ffb2', fr(4, 0x07, 0, 0xA2, [1, 0x19].concat(u24(99000))).map((x, i) => i === 19 ? (x + 3) & 0x1F : x)); await settle(10);
  ok(/72,4/.test(sd.getElementById('bil-peso').textContent), 'un messaggio col controllo di somma sbagliato viene ignorato');
  dati('ffb3', P1); dati('ffb3', P2); await settle(60);
  { const p = JSON.parse(sw.eval('JSON.stringify(PESATE[0]||null)'));
    ok(p && p.peso === 72.4 && p.grasso === 15.8 && p.eta_met === 28 && JSON.stringify(p.imp) === JSON.stringify(IMP) && /^\d{4}-\d{2}-\d{2}$/.test(p.data) && /^\d{2}:\d{2}:\d{2}$/.test(p.ora) && p.id === p.data + 'T' + p.ora + '|72.4',
       'risultato: pesata salvata con peso, composizione (grasso 15,8 %, età metabolica 28), impedenze grezze, data e ora');
    ok(p && p.muscolo > 40 && p.acqua > 40 && p.bmr > 1000 && p.ossa > 2 && p.proteine > 10 && p.bmi > 20, 'risultato: anche muscolo, acqua, metabolismo, ossa, proteine e BMI'); }
  { const ack = B.scritti.find(x => x[1][3] === 0xB0 && x[1][4] === 0x05);
    ok(!!ack && ack[1][0] === 1, 'risultato confermato alla bilancia (B0 col suo numero di messaggio, il nostro contatore va avanti)'); }
  ok(/Pesata salvata/.test(sd.getElementById('bil-stato').textContent) && sd.querySelectorAll('#bil-lista .bil-row').length === 1 && /15,8/.test(sd.getElementById('bil-ris').textContent),
     'pagina: «Pesata salvata», ultima pesata coi valori e l\'elenco');
  dati('ffb3', P1); dati('ffb3', P2); dati('ffb2', A2(5, 3, 72400)); await settle(40);
  ok(sw.eval('PESATE.length') === 1 && /Pesata salvata/.test(sd.getElementById('bil-stato').textContent), 'la bilancia che ripete il risultato non crea doppioni (e il messaggio resta)');
  ok(JSON.parse(sw.localStorage.getItem('tms-pesate-prova') || '[]').length === 1, 'pesata salvata sul telefono, nella memoria del profilo');
  ok(/1 pesata questa settimana/.test(sd.getElementById('meta-bil').textContent), 'menu: «1 pesata questa settimana»');
  /* il file per il coach porta le pesate; «Manda solo le pesate» = rientro senza esercizi */
  const soloPes = { pesate: JSON.parse(sw.eval('JSON.stringify(PESATE)')) };
  ok(soloPes.pesate.length === 1 && !sd.getElementById('bil-invia'), 'pesata salvata sul telefono, niente più «📤 Manda solo le pesate» (vanno da sole al PC collegato)');
  /* composizione recuperata: scheda senza altezza → solo peso e misure grezze; poi arriva la scheda giusta */
  { const r = JSON.parse(sw.eval('(function(){ var c=SCHEDA.corpo; SCHEDA.corpo=null; var p=pesComponi({peso:72.4, imp:' + JSON.stringify(IMP) + '}); var a=JSON.stringify(p); SCHEDA.corpo=c; pesComponi(p); return JSON.stringify([JSON.parse(a), p]); })()'));
    ok(!('grasso' in r[0]) && r[1].grasso === 15.8, 'senza altezza ed età si tiene la pesata grezza; con la scheda giusta la composizione si completa'); }
  /* togliere una pesata: conferma sulla riga, niente finestre di sistema */
  sd.querySelector('#bil-lista [data-pesx]').click(); await settle(10);
  ok(sd.querySelector('#bil-lista [data-pesok]') !== null && sw.eval('PESATE.length') === 1, '🗑: chiede conferma sulla riga');
  sd.querySelector('#bil-lista [data-pesno]').click(); await settle(10);
  ok(sd.querySelector('#bil-lista [data-pesok]') === null && sw.eval('PESATE.length') === 1, '🗑 → «No»: la pesata resta');
  /* uscendo dalla pagina il Bluetooth si ferma */
  sd.getElementById('barra-ind').click(); await settle(30);
  ok(sd.getElementById('menu').hidden === false && B.staccati >= 1 && sw.eval('BIL.attivo') === false, 'uscendo dalla pagina Bilancia il collegamento si chiude');
  sw.close();

  /* andata e ritorno: le pesate del telefono entrano nel TMS sul PC (media nello Storico misure) */
  { const fsmem = makeTmsFS(); const J = o => JSON.stringify(o);
    await fsmem.writeFile('TMS_Dati/profili.json', J({ list: [{ slug: 'prova', nome: 'Cliente Prova', creato: '2026-01-01' }], active: 'prova' }));
    await fsmem.writeFile('TMS_Dati/prova/scheda.json', J({ settimanale: [], mensile: [] }));
    await fsmem.writeFile('TMS_Dati/prova/storico.json', '[]');
    await fsmem.writeFile('TMS_Dati/prova/corpo.json', J({ dati_utente: { nome: 'Cliente Prova', sesso: 'F', altezza: 180, livello_attivita: 1.4 }, storico_io: [] }));
    await fsmem.writeFile('TMS_Dati/prova/alimentazione.json', J({ bulk: [], mant: [], cut: [] }));
    const { dom, errors } = await load({ idb: makeIDB(), tmsFS: fsmem, fsa: true });
    await settleConnect(dom, fsmem); await settle(300);
    const w = dom.window; w.alert = () => {}; w.confirm = () => true;
    await w.eval('importaPesate(' + J(soloPes.pesate) + ')'); await settle(150);
    const p0 = soloPes.pesate[0], code = w.eval('settimanaPesata(' + J(p0) + ')');
    const riga = JSON.parse(w.eval('JSON.stringify(DOC.storico_io.find(function(r){return +r.scheda===' + code + ';})||null)'));
    ok(riga && riga.n_pesate === 1 && riga.peso === 72.4 && riga.massa_grassa === 0.158 && riga.metab_basale === p0.bmr && Math.abs(riga.metabolismo - p0.bmr * 1.4) < 1e-6,
       'andata e ritorno: la pesata del telefono finisce nello Storico misure del PC (media della settimana)');
    ok(w.eval('DOC.pesate[0].imp.length') === 10 && errors.length === 0, 'andata e ritorno: le impedenze grezze arrivano intatte, nessun errore');
    dom.window.close(); }
}

console.log('--- T13: rapporto di composizione corporea (PDF da una pesata) ---');
{
  const fsmem = makeTmsFS(); const J = o => JSON.stringify(o);
  await fsmem.writeFile('TMS_Dati/profili.json', J({ list: [{ slug: 'prova', nome: 'Cliente Prova', creato: '2026-01-01' }], active: 'prova' }));
  await fsmem.writeFile('TMS_Dati/prova/scheda.json', J({ settimanale: [], mensile: [] }));
  await fsmem.writeFile('TMS_Dati/prova/storico.json', '[]');
  await fsmem.writeFile('TMS_Dati/prova/corpo.json', J({ dati_utente: { nome: 'Cliente Prova', sesso: 'M', altezza: 180, nascita: '1995-03-01', livello_attivita: 1.5 }, storico_io: [] }));
  await fsmem.writeFile('TMS_Dati/prova/alimentazione.json', J({ bulk: [], mant: [], cut: [] }));
  const { dom, errors } = await load({ idb: makeIDB(), tmsFS: fsmem, fsa: true });
  await settleConnect(dom, fsmem); await settle(300);
  const w = dom.window, d = w.document; w.alert = () => {}; w.confirm = () => true;
  /* valori inventati */
  const IMP = [24.0, 340.0, 350.0, 280.0, 285.0, 19.0, 300.0, 310.0, 250.0, 255.0];
  const P = (data, ora, peso, x) => Object.assign({ id: data + 'T' + ora + '|' + peso, data: data, ora: ora, peso: peso }, x || {});
  const pes = [P('2026-11-09', '07:00', 72.9, { grasso: 16.2, acqua: 61.4, muscolo: 57.0, ossa: 4.1, proteine: 16.7, visc: 3, bmr: 1690, eta_met: 29, imp: IMP }),
    P('2026-11-16', '07:00', 72.4, { grasso: 15.8, acqua: 61.7, muscolo: 56.8, ossa: 4.1, proteine: 16.8, visc: 3, bmr: 1685, eta_met: 28, imp: IMP }),
    P('2026-11-17', '07:00', 72.2)];
  await w.eval('importaPesate(' + J(pes) + ')'); await settle(100);
  ok(J(w.eval('fasceGrasso("M",26)')) === '[8,20,25]' && J(w.eval('fasceGrasso("F",45)')) === '[23,34,40]' && J(w.eval('fasceGrasso("M",70)')) === '[13,25,30]',
     'fasce del grasso (Gallagher 2000) per sesso ed età');
  { const c = JSON.parse(w.eval('JSON.stringify(compDaPesata(' + J(pes[1]) + ', DOC.dati_utente))'));
    const magra = 72.4 - 72.4 * 0.158, acqua = 0.617 * 72.4;
    ok(Math.abs(c.magra - magra) < 1e-9 && Math.abs(c.scheletrico - (acqua * 0.834 - 2.627)) < 1e-9 && Math.abs(c.sottocutaneo - (15.8 * -0.0002 + 0.72) * 15.8) < 1e-9 && Math.abs(c.fabbisogno - 1685 * 1.5) < 1e-9,
       'valori derivati come FitDays: massa magra, muscolo scheletrico, sottocutaneo; fabbisogno = basale × attività'); }
  { const h = w.eval('htmlRapportoCorpo(DOC.pesate.find(function(p){return p.data==="2026-11-16";}))');
    const box = d.createElement('div'); box.innerHTML = h;
    const on = [...box.querySelectorAll('.comp-griglia div')].map((x, i) => x.classList.contains('on') ? i : -1).filter(i => i >= 0);
    ok(/Cliente Prova/.test(box.textContent) && /15,8/.test(box.textContent) && /72,4/.test(box.textContent) && on.length === 1 && on[0] === 4 && /Equilibrato/.test(box.querySelector('.comp-griglia div.on').textContent),
       'rapporto: anagrafica, valori, tipo di corpo (BMI 22,3 e grasso nella norma → «Equilibrato»)');
    ok(box.querySelectorAll('.comp-imp tbody tr').length === 2 && /−0,5/.test(box.querySelector('.comp-tab').textContent) && box.querySelectorAll('.comp-sett tbody tr').length === 2,
       'rapporto: misure grezze (20 e 100 kHz), differenza dalla pesata prima, medie settimanali dello Storico misure');
    ok(!/punteggio/i.test(box.textContent) && box.querySelectorAll('.comp-linea').length === 2, 'rapporto: andamento di peso e grasso; niente punteggio inventato');
    { const fig = box.querySelector('.comp-figura');
      ok(fig && fig.querySelectorAll('circle[fill="#d4a017"]').length === 8 && fig.querySelectorAll('polyline').length === 8 && /72,4 kg/.test(fig.textContent) && /BMI 22,3/.test(fig.textContent) && /Muscolo scheletrico/.test(fig.textContent),
         'rapporto: figura del corpo con gli 8 elettrodi e otto valori collegati da linee (peso, BMI, grasso, muscolo…)');
      /* impaginazione (18/11/2026): la nota sotto la figura sta fuori dal disegno (nel PDF usciva tagliata),
         la freccetta del valore è sotto il numero, la nota a piè di pagina segue il contenuto */
      ok(!/elettrodi/.test(fig.textContent) && /elettrodi/.test(box.querySelector('.comp-hero .comp-fig-nota').textContent) &&
         [...box.querySelectorAll('.comp-segno')].every(s => s.querySelector('i') && !/▾/.test(s.textContent)) && box.querySelector('.comp-pg > .comp-nota') !== null,
         'rapporto: nota della figura fuori dal disegno, freccetta del valore sotto il numero, nota a piè di pagina in fondo al contenuto');
      /* figura maschile o femminile secondo il sesso del profilo (25/11/2026), la stessa dell'app del telefono */
      const conSesso = s => w.eval('(function(){ var o=DOC.dati_utente.sesso; DOC.dati_utente.sesso=' + JSON.stringify(s) + '; var h=figuraCorpo({peso:70,bmi:22}, "", true); DOC.dati_utente.sesso=o; return h; })()');
      const figM = conSesso('M'), figF = conSesso('F');
      ok(figM !== figF && (figF.match(/<path d="M50 2\.6/g) || []).length === 1 && !/M50 2\.6/.test(figM) && (figM.match(/fill="#d4a017"/g) || []).length === 8 && (figF.match(/fill="#d4a017"/g) || []).length === 8,
         'rapporto: figura maschile o femminile (capelli, spalle, vita, fianchi) secondo il sesso del profilo, sempre con gli 8 elettrodi');
      { const apk = fs.readFileSync(path.join(ROOT, 'app-android', 'web', 'index.html'), 'utf8'), pc = fs.readFileSync(path.join(ROOT, 'src', 'app', '09d-rapporto-corpo.js'), 'utf8');
        const blocco = t => { const i = t.indexOf('const SAGOME={'), j = t.indexOf('el:S.el}; }'); return i >= 0 && j > i ? t.slice(i, j) : ''; };
        ok(blocco(pc) !== '' && blocco(pc) === blocco(apk), 'figure del corpo: le sagome (uomo e donna) sono le stesse nel TMS sul PC e nell\'app del telefono'); } } }
  { const h = w.eval('htmlRapportoCorpo(DOC.pesate.find(function(p){return p.data==="2026-11-17";}))');
    ok(/solo il peso/.test(h) && /72,2/.test(h), 'rapporto di una pesata col solo peso: lo dice, senza errori'); }
  /* dal tab Corpo: 📄 sulla riga → anteprima → PDF */
  w.eval('showTab("corpo")');
  ok(d.querySelectorAll('#pesate-box [data-reppes]').length === 4, 'tab Corpo: 📄 su ogni pesata e «Rapporto dell\'ultima»');
  /* 18/11/2026: il tipo di corpo del rapporto anche nel tab Corpo, grande, a destra dei quattro grafici */
  { w.eval('DOC.dati_utente.peso=80; DOC.dati_utente.massa_grassa=0.15; DOC.dati_utente.massa_muscolare=64; renderCorpo();');
    const tc = d.querySelector('#panel-corpo .corpo-graf > .tipo-corpo');
    const on = tc && tc.querySelector('.comp-griglia div.on'), nome = tc && tc.querySelector('.tipo-corpo__nome');
    ok(tc && d.querySelector('#panel-corpo .corpo-graf > .chart-grid--corpo') && tc.querySelector('svg.comp-figura') && on && nome && on.textContent === nome.textContent && /80,0 kg/.test(tc.textContent),
       'tab Corpo: riquadro «Tipo di corpo» accanto ai 4 grafici, con la figura coi valori di oggi e la casella giusta (' + (on ? on.textContent : '—') + ')');
    ok(/style="fill:var\(--ink\)"/.test(tc.querySelector('svg.comp-figura').outerHTML) && tc.querySelector('[data-spieg="tipocorpo"]'),
       'tab Corpo: la figura prende i colori del tema (leggibile anche di notte) e ha il suo «?»'); }
  d.querySelector('#pesate-box [data-reppes="2026-11-16T07:00|72.4"]').click(); await settle(30);
  ok(d.querySelector('#modal .comp-anteprima .comp-pg') !== null && d.getElementById('comp-pdf') !== null, '📄: anteprima del rapporto con «Scarica PDF»');
  w.eval('window.html2canvas=function(){ return Promise.resolve({width:16,height:22,toDataURL:function(){ return "data:image/jpeg;base64,/9j/AAAA"; }}); };' +
    'window.__dl=null; window.__oc=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ if(this.download){ window.__dl=this.download; return; } return window.__oc.call(this); };');
  await w.eval('pdfRapportoCorpo("2026-11-16T07:00|72.4")'); await settle(30);
  ok(w.eval('window.__dl') === 'Composizione_Cliente_Prova_2026-11-16.pdf' && d.getElementById('pdf-stage') === null, 'Scarica PDF: file «Composizione_<nome>_<data>.pdf», la pagina di lavoro viene tolta');
  w.eval('HTMLAnchorElement.prototype.click=window.__oc; closeModal();');
  ok(errors.length === 0, 'rapporto: nessun errore runtime' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  dom.window.close();
}

console.log('--- T14: personal (TMS) ↔ cliente (app del telefono) attraverso l\'hub: scheda collegata cifrata, pesate e foto, codici, promemoria, APK nuovo ---');
{
  const PWA = path.join(ROOT, 'app-android', 'web', 'index.html');
  const J = o => JSON.stringify(o);
  const H = await makeHub();
  const fsmem = makeTmsFS();
  await fsmem.writeFile('TMS_Dati/profili.json', J({ list: [{ slug: 'prova', nome: 'Cliente Prova', creato: '2026-01-01' }], active: 'prova' }));
  await fsmem.writeFile('TMS_Dati/prova/scheda.json', J({ settimanale: [
    { giorno: 'Lunedì', esercizio: 'Squat con bilanciere', serie: 3, rip: 5, peso: 80, rest: '2:00', rir: 2, note: 'fermo in basso', test: false },
    { giorno: 'Lunedì', esercizio: 'Panca piana con bilanciere', serie: 3, rip: 8, peso: 60, rest: '1:30', rir: 2, note: '', test: false }], mensile: [] }));
  await fsmem.writeFile('TMS_Dati/prova/storico.json', '[]');
  await fsmem.writeFile('TMS_Dati/prova/corpo.json', J({ dati_utente: { nome: 'Cliente Prova', sesso: 'M', altezza: 180, nascita: '1995-03-01', useRpe: true }, storico_io: [] }));
  await fsmem.writeFile('TMS_Dati/prova/alimentazione.json', J({ bulk: [], mant: [], cut: [] }));
  const { dom, errors } = await load({ idb: makeIDB(), tmsFS: fsmem, fsa: true, hub: H.URL, fetch: H.fetchSolo });
  await settleConnect(dom, fsmem); await settle(200);
  const w = dom.window, d = w.document, avvisiPC = []; w.alert = x => { avvisiPC.push(String(x)); }; w.confirm = () => true;
  const giroPC = () => w.eval('(async function(){ clearTimeout(_telModT); while(_telGiroIn) await new Promise(function(r){ setTimeout(r,20); }); await telGiro(); })()');
  const righePC = () => JSON.parse(w.eval('JSON.stringify(DOC.scheda.settimanale)'));
  const clic = async (id, ms) => { d.getElementById(id).click(); await settle(ms || 300); };
  /* codici e cifratura */
  { const c = await w.eval('telCifra({a:"Squat 80 kg"}, "K7QM3XRPA9TB4WZCHN5D")');
    ok(!/Squat/.test(c) && JSON.parse(c).tms === 'hub', 'cifratura: nel file non si legge niente (solo busta «hub» + dati cifrati)');
    ok(J(await w.eval('telDecifra(' + J(c) + ', "K7QM3XRPA9TB4WZCHN5D")')) === J({ a: 'Squat 80 kg' }), 'cifratura: si rilegge col codice giusto');
    let rotta = false; try { await w.eval('telDecifra(' + J(c.slice(0, c.length - 12) + '"}') + ', "K7QM3XRPA9TB4WZCHN5D")'); } catch (e) { rotta = true; }
    let altro = false; try { await w.eval('telDecifra(' + J(c) + ', "ZZZZZZZZZZZZZZZZZZZZ")'); } catch (e) { altro = true; }
    ok(rotta && altro, 'cifratura: un file rovinato o il codice di un altro cliente vengono rifiutati (sigillo)');
    ok(/^[A-HJ-NP-Z2-9]{20}$/.test(w.eval('telNuovoCodice()')) && /^[A-HJ-NP-Z2-9]{24}$/.test(w.eval('telNuovoCodice(24)')) && w.eval('telCodiceBello("k7qm3xrpa9tb4wzchn5d")') === 'K7QM-3XRP-A9TB-4WZC-HN5D',
       'codici: 20 segni per il cliente, 24 per il recupero del personal, senza I, O, 0, 1, mostrati a gruppi di quattro');
    const a = JSON.parse(await w.eval('telIdentita("K7QM3XRPA9TB4WZCHN5D").then(function(x){ return JSON.stringify({id:x.id, g:x.gettone}); })'));
    const b = JSON.parse(await w.eval('telIdentita("ZZZZZZZZZZZZZZZZZZZZ").then(function(x){ return JSON.stringify({id:x.id, g:x.gettone}); })'));
    ok(/^[0-9a-f]{16}$/.test(a.id) && /^[A-Za-z0-9_-]{43}$/.test(a.g) && a.id !== b.id && a.g !== b.g && !a.g.includes('K7QM'),
       'dal codice si ricavano id del legame e gettone d\'accesso (diversi per ogni codice, senza ripeterlo)'); }
  /* unione campo per campo (funzioni pure) */
  { const r = JSON.parse(w.eval('JSON.stringify(telUnisci(' +
      'telTimbra([{uid:"a",giorno:"L",esercizio:"X",serie:3,rip:5,peso:80}], {}, {righe:[{uid:"a",giorno:"L",esercizio:"X",serie:3,rip:5,peso:70,rir:null,note:"",rest:"",test:false,pos:0,del:0,t:{giorno:1,esercizio:1,serie:1,rip:1,peso:1,rir:1,note:1,rest:1,test:1,pos:1,del:1}}],sedute:{}}, 100),' +
      '{righe:[{uid:"a",giorno:"L",esercizio:"X",serie:3,rip:8,peso:70,rir:null,note:"",rest:"",test:false,pos:0,del:0,t:{giorno:1,esercizio:1,serie:1,rip:50,peso:1,rir:1,note:1,rest:1,test:1,pos:1,del:1}},' +
      '{uid:"b",giorno:"L",esercizio:"Y",serie:1,rip:1,peso:1,rir:null,note:"",rest:"",test:false,pos:1,del:0,t:{}}],sedute:{}}))'));
    ok(r.righe.length === 2 && r.righe[0].peso === 80 && r.righe[0].rip === 8 && r.righe[1].uid === 'b',
       'unione: campo per campo vince l\'ultima modifica (peso cambiato qui, ripetizioni là: restano tutti e due) e le righe nuove dell\'altro entrano'); }
  /* il vecchio collegamento con la cartella di Drive: settimana e ombra restano, il codice unico sparisce */
  w.eval('localStorage.setItem("tms-telefono", ' + J(J({ codice: 'K7QM3XRPA9TB4WZC', profili: { prova: { settimana: 3, ricevute: ['x1'] } } })) + '); TEL=null;');
  ok(w.eval('telStato().v') === 2 && !w.eval('telStato().codice') && w.eval('telStato().profili.prova.settimana') === 3 && !w.eval('telCollegato(telProf("prova"))'),
     'dal collegamento con Google Drive: il codice unico sparisce, la settimana del profilo resta, va ricollegato');
  w.eval('localStorage.removeItem("tms-telefono"); TEL=null;');
  /* attivazione come personal */
  w.eval('showTab("allenamento")');
  ok(!d.getElementById('tel-riga'), 'tab Pesi: finché il profilo non è collegato, nessuna riga del telefono');
  await w.eval('impostazioniModal()'); await settle(30);
  ok(d.getElementById('imp-tel-invito') && d.getElementById('imp-tel-attiva') && d.getElementById('imp-tel-recupero') && !d.getElementById('imp-tel-prof') && !/Google Drive|cartella/i.test(d.getElementById('imp-tel').textContent),
     '⚙ Impostazioni: prima si attiva il TMS come personal (codice d\'invito, oppure codice di recupero); niente più cartella');
  d.getElementById('imp-tel-invito').value = 'sbagliato'; await clic('imp-tel-attiva');
  ok(!w.eval('telPersonal()') && avvisiPC.some(x => /invito/.test(x)), 'attivazione: con un codice d\'invito sbagliato non si attiva e lo dice');
  d.getElementById('imp-tel-invito').value = 'invi-topr-ova1'; await clic('imp-tel-attiva');
  const REC = w.eval('telPersonal() && telPersonal().codice');
  ok(/^[A-HJ-NP-Z2-9]{24}$/.test(REC || '') && H.sql.prepare('SELECT COUNT(*) AS n FROM personal').get().n === 1 && H.sql.prepare("SELECT usato FROM inviti WHERE codice='INVITOPROVA1'").get().usato > 0,
     'attivazione: col codice d\'invito il TMS diventa personal sull\'hub (invito consumato)');
  ok(d.getElementById('imp-tel-rec') && d.getElementById('imp-tel-rec').textContent === w.eval('telCodiceBello(' + J(REC) + ')') && /PC nuovo/.test(d.getElementById('imp-tel').textContent),
     'attivazione: compare il codice di recupero, da conservare per passare a un PC nuovo');
  ok(!JSON.stringify(H.sql.prepare('SELECT * FROM personal').all()).includes(REC), 'hub: del personal ha solo un numero e l\'impronta del gettone, mai il codice di recupero');
  /* collega il profilo */
  ok(d.getElementById('imp-tel-prof'), '⚙ Impostazioni: «Collega un telefono» per il profilo attivo');
  await clic('imp-tel-prof', 400);
  const P = JSON.parse(w.eval('JSON.stringify(telProf("prova"))')), LID = P.lid, CODICE = P.codice;
  for (let k = 0; k < 40 && !H.file(LID, 'dal-pc/scheda.json'); k++) await settle(100);
  ok(/^[A-HJ-NP-Z2-9]{20}$/.test(CODICE) && /^[0-9a-f]{16}$/.test(LID) && d.getElementById('imp-tel-codice') && d.getElementById('imp-tel-codice').textContent === w.eval('telCodiceBello(' + J(CODICE) + ')'),
     'collega: il profilo prende il SUO codice (20 segni) da scrivere sul telefono del cliente');
  { const l = H.sql.prepare('SELECT * FROM legami').get();
    ok(l && l.lid === LID && !String(l.etichetta).includes('Cliente Prova') && !String(l.etichetta).includes(CODICE), 'hub: il legame ha l\'etichetta cifrata (né nome né codice in chiaro)'); }
  w.eval('closeModal(); showTab("allenamento")');
  ok(H.file(LID, 'dal-pc/scheda.json') && H.file(LID, 'dal-pc/stato.json') && !/Squat/.test(H.file(LID, 'dal-pc/scheda.json')),
     'collega: la scheda dei Pesi va sull\'hub nel legame del profilo, cifrata');
  { const r = righePC(); ok(r.length === 2 && r[0].uid && r[1].uid && r[0].uid !== r[1].uid, 'collega: ogni riga della scheda Pesi prende un id suo'); }
  ok(d.getElementById('tel-riga') && /collegata/.test(d.getElementById('tel-riga').textContent) && !d.getElementById('tel-manda'), 'tab Pesi: riga «Scheda collegata al telefono», nessun pulsante da premere');
  { const cod = d.getElementById('imp-tel-codice');
    ok(cod && cod.parentElement.classList.contains('imp-codice') && !cod.closest('.gruppo') && cod.parentElement.querySelector('.gruppo #imp-tel-copia'),
       'impostazioni: il codice del telefono sta fuori dal gruppo dei pulsanti (la riga va a capo invece di uscire dalla finestra)'); }
  /* Impostazioni › Informazioni: la versione dell'app */
  await w.eval('impostazioniModal()');
  ok(d.getElementById('imp-info') && d.getElementById('imp-info').textContent.includes('v' + w.eval('APP_VERSION')), 'impostazioni: fra le informazioni c\'è la versione dell\'app');
  /* copia dei backup fuori dal PC: cartella scelta col selettore (ponte tmsScambio, qui finto in memoria) */
  { const est = new Map(); let cartella = 'C:\\Users\\x\\OneDrive\\TMS backup';
    w.tmsScambio = { cartella: async () => cartella, scegli: async () => cartella, scollega: async () => { cartella = ''; },
      scrivi: async (n, tx) => { est.set(n, tx); }, elenca: async () => [...est.keys()], togli: async n => { est.delete(n); } };
    w.eval('localStorage.removeItem("tms-bk-esterno")');
    ok(await w.eval('bkEstCartella()') === '', 'backup fuori dal PC: una cartella rimasta dal vecchio scambio con Drive non si usa da sola');
    await w.eval('impostazioniModal()');
    ok(d.getElementById('imp-bk') && /nessuna/.test(d.getElementById('imp-bk-cartella').textContent) && d.getElementById('imp-bk-scegli'), 'impostazioni: sezione «Copia dei backup» con «Scegli…»');
    d.getElementById('imp-bk-scegli').click();
    for (let k = 0; k < 40 && !est.size; k++) await settle(50);
    await settle(100);
    const nomi = [...est.keys()];
    ok(nomi.length === 1 && /^TMS-backup-\d{4}-\d\d-\d\d\.json$/.test(nomi[0]) && JSON.parse(est.get(nomi[0]))._tms === 'backup', 'backup fuori dal PC: scelta la cartella, la prima copia (backup completo) parte subito');
    ok(/OneDrive/.test(d.getElementById('imp-bk-cartella').textContent) && /Ultima copia/.test(d.getElementById('imp-bk-stato').textContent), 'impostazioni: cartella scelta e ultima copia');
    ok(await w.eval('bkEstCopia()') === false, 'backup fuori dal PC: una a settimana (subito dopo non ne rifà un\'altra)');
    for (const g of ['2026-01-01', '2026-01-08', '2026-01-15', '2026-01-22', '2026-01-29']) est.set('TMS-backup-' + g + '.json', '{}');
    est.set('altro.json', '{}');
    ok(await w.eval('bkEstCopia(true)') === true && [...est.keys()].filter(n => /^TMS-backup-/.test(n)).length === 5 && est.has('altro.json') && !est.has('TMS-backup-2026-01-01.json'),
       'backup fuori dal PC: si tengono le ultime cinque copie, gli altri file della cartella non si toccano');
    w.tmsScambio.scrivi = async () => { throw new Error('disco non trovato'); };
    ok(await w.eval('bkEstCopia(true)') === false && /non è riuscita/.test(w.eval('bkEstTestoStato()')), 'backup fuori dal PC: se la cartella non si raggiunge lo dice, e riprova al prossimo avvio');
    w.eval('closeModal()'); delete w.tmsScambio; w.eval('localStorage.removeItem("tms-bk-esterno")'); }

  /* il telefono del cliente */
  H.versioneApk = null;
  const fetchTel = async (u, i) => { if (String(u).startsWith(H.URL)) return H.fetch(u, i); if (!H.versioneApk) throw new Error('offline'); return { ok: true, json: async () => H.versioneApk }; };
  const sub = await JSDOM.fromFile(PWA, { runScripts: 'dangerously', url: 'https://tms.test/app/index.html',
    beforeParse(win){ conCrypto(win); win.localStorage.setItem('tms-scheda-lang', 'it'); win.scrollTo = () => {}; win.confirm = () => true; win.alert = () => {};
      win.localStorage.setItem('tms-col', J({ codice: CODICE, lid: LID, slug: 'prova', nome: 'Cliente Prova' }));
      win.TMS_APK_VERSIONE = '1.2.0'; win.TMS_HUB = H.URL; win.tmsAggiorna = H.agg; win.fetch = fetchTel; } });
  const sw = sub.window, sd = sw.document;
  const giroTel = () => sw.eval('(async function(){ clearTimeout(COL.modT); while(COL.inCorso) await new Promise(function(r){ setTimeout(r,20); }); await colGiro(); })()');
  const scrivi = (id, v) => { const el = sd.getElementById(id); el.value = v; el.dispatchEvent(new sw.Event('input', { bubbles: true })); };
  for (let k = 0; k < 60 && !sw.eval('!!(SCHEDA&&SCHEDA.collegata)'); k++) await settle(100);
  ok(J(await sw.eval('colIdentita(' + J(CODICE) + ').then(function(x){ return [x.lid, x.gettone]; })')) === J(JSON.parse(await w.eval('telIdentita(' + J(CODICE) + ').then(function(x){ return JSON.stringify([x.id, x.gettone]); })'))),
     'telefono e PC ricavano dallo stesso codice lo stesso legame e lo stesso gettone');
  ok(sw.eval('!!(SCHEDA && SCHEDA.collegata)') && sd.getElementById('menu').hidden === false, 'telefono: senza scheda prende da solo quella collegata del PC, dall\'hub');
  ok(sd.getElementById('s-0').value === '3' && sd.getElementById('rir-0').value === '2' && sd.getElementById('n-0').value === 'fermo in basso' && !sd.querySelector('#ex-0 .ex-coach'),
     'telefono: i campi sono la scheda (anche RIR e note), senza «previsto» ripetuto');
  ok(/collegata/.test(sd.getElementById('scheda-info').textContent) && !sd.getElementById('invia') && !sd.getElementById('col-home'),
     'telefono: «Scheda collegata al TMS sul PC», niente file da mandare al coach né spiegazioni sul salvataggio');
  await giroTel();
  ok(H.file(LID, 'dal-telefono/scheda.json') && !/Squat/.test(H.file(LID, 'dal-telefono/scheda.json')), 'telefono: scrive la sua copia della scheda sull\'hub, cifrata');
  { const n0 = H.chiamate; await giroTel();
    ok(H.chiamate - n0 === 1, 'telefono: un giro senza novità è una chiamata sola all\'hub (stato e scheda insieme, il video no)'); }
  /* in palestra: 4 serie di squat */
  scrivi('s-0', '4'); await giroTel(); await giroPC();
  { const r = righePC(); ok(r[0].serie === 4 && r[0].note === 'fermo in basso' && r[0].rir === 2 && r[0].rest === '2:00' && r[1].peso === 60,
       'telefono → PC: le 4 serie arrivano da sole nella scheda Pesi; il resto non cambia'); }
  /* dal PC: panca a 62,5 */
  w.eval('DOC.scheda.settimanale[1].peso=62.5;'); await giroPC(); await giroTel(); await settle(50);
  ok(sd.getElementById('p-1').value === '62.5' && sd.getElementById('s-0').value === '4', 'PC → telefono: il peso nuovo della panca compare nel campo, le 4 serie restano');
  /* campi diversi della stessa riga cambiati sui due: restano tutti e due */
  w.eval('DOC.scheda.settimanale[0].rip=6;'); scrivi('p-0', '85');
  await giroPC(); await giroTel(); await giroPC(); await settle(50);
  ok(righePC()[0].rip === 6 && righePC()[0].peso === 85 && sd.getElementById('r-0').value === '6' && sd.getElementById('p-0').value === '85',
     'modifiche a campi diversi (ripetizioni sul PC, peso sul telefono): restano tutte e due, da tutte e due le parti');
  /* lo stesso campo cambiato sui due: vince l'ultima modifica */
  w.eval('DOC.scheda.settimanale[1].rip=10;'); await giroPC(); await settle(15);
  scrivi('r-1', '12'); await giroTel(); await giroPC(); await settle(50);
  ok(righePC()[1].rip === 12 && sd.getElementById('r-1').value === '12', 'stesso campo cambiato sui due: vince l\'ultima modifica (12 ripetizioni dal telefono)');
  /* mentre si scrive nella tabella dei Pesi il PC aspetta, poi unisce senza perdere niente */
  scrivi('r-0', '7'); await giroTel();
  { const inp = d.querySelector('#panel-allenamento input'); inp.focus();
    await giroPC(); const fermo = righePC()[0].rip === 6;
    inp.blur(); await giroPC();
    ok(fermo && righePC()[0].rip === 7, 'PC: con un campo dei Pesi sotto le dita aspetta il giro dopo, e poi la modifica del telefono entra lo stesso'); }
  ok(H.nomi(LID, 'dal-telefono/').filter(n => /scheda/.test(n)).length === 1, 'hub: una sola scheda del telefono, sempre sostituita (niente più «scheda (1).json»)');
  /* esercizio aggiunto sul telefono, panca tolta sul PC */
  { /* un secondo giorno (Mercoledì) dopo il Lunedì: il telefono metterà l'esercizio nuovo del Lunedì in fondo all'elenco */
    w.eval('DOC.scheda.settimanale.push({giorno:"Mercoledì", esercizio:"Hip thrust prova", serie:3, rip:10, peso:40, rest:"1:30", rir:2, note:"", test:false}); persist("scheda");');
    await giroPC(); await giroTel(); await settle(50);
    const nome = sw.eval('(SCHEDA.catalogo||[]).map(function(e){return e.n;}).filter(function(n){return !/Squat con bilanciere|Panca piana con bilanciere/.test(n);})[0]') || 'Rematore con bilanciere';
    sw.eval('navEntra(); mostra("home"); addEsercizio(0);'); await settle(30);
    const rid = sw.eval('WROWS[WROWS.length-1].rid');
    sd.getElementById('ename-' + rid).value = nome; sw.eval('saveEdit(' + rid + ')'); await settle(30);
    await giroTel(); await giroPC();
    ok(righePC().some(r => r.esercizio === nome && r.giorno === righePC()[0].giorno), 'esercizio aggiunto sul telefono: compare nella scheda Pesi del PC');
    const primo = righePC()[0].giorno;
    { const g = righePC().map(r => r.giorno), blocchi = g.filter((x, i) => i === 0 || g[i - 1] !== x);
      ok(blocchi.join('|') === primo + '|Mercoledì' && g.lastIndexOf(primo) < g.indexOf('Mercoledì') && g.filter(x => x === primo).length === 3,
         'esercizio aggiunto sul telefono a un giorno che non è l\'ultimo: sul PC entra in quel giorno, senza creare un secondo giorno con lo stesso nome in fondo'); }
    /* una scheda già spezzata (unita prima della correzione): il PC rimette insieme il giorno da solo */
    w.eval('var _r=DOC.scheda.settimanale; DOC.scheda.settimanale=_r.filter(function(r){ return r.esercizio!==' + J(nome) + '; }).concat(_r.filter(function(r){ return r.esercizio===' + J(nome) + '; }));');
    await giroPC(); await giroTel(); await settle(50);
    { const g = righePC().map(r => r.giorno), blocchi = g.filter((x, i) => i === 0 || g[i - 1] !== x);
      ok(blocchi.join('|') === primo + '|Mercoledì', 'scheda con un giorno spezzato in due blocchi: al giro dopo il PC lo rimette insieme'); }
    w.eval('DOC.scheda.settimanale=DOC.scheda.settimanale.filter(function(r){ return !/Panca|Hip thrust prova/.test(r.esercizio); });');
    await giroPC(); await giroTel(); await settle(50);
    ok(!sw.eval('WROWS.some(function(r){ return /Panca/.test(r.esercizio); })') && sw.eval('WROWS.some(function(r){ return r.esercizio===' + J(nome) + '; })') && righePC().length === 2,
       'esercizio tolto sul PC: sparisce anche dal telefono (e non torna indietro)'); }
  sw.eval('risali(); risali();'); await settle(30);
  /* pesata e foto dal telefono: sull'hub solo finché il PC non le ha salvate */
  sw.eval('PESATE.push({id:"2026-11-17T21:00:00|72.4", data:"2026-11-17", ora:"21:00:00", peso:72.4}); FOTO.fronte={id:"fprova1", img:"data:image/jpeg;base64,/9j/AAAA", data:"2026-11-17"};');
  await sw.eval('colEventi()');
  const ev = H.nomi(LID, 'dal-telefono/eventi/');
  ok(ev.length === 2 && ev.every(k => !/72\.4|AAAA/.test(H.file(LID, k))), 'telefono: una pesata e una foto diventano due file cifrati sull\'hub');
  H.metti(LID, 'dal-telefono/eventi/pesata-rotta.json', '{"tms":"hub","v":1,"iv":"AAAA');
  await giroPC(); await settle(450);
  ok(w.eval('DOC.pesate.length') === 1 && w.eval('DOC.pesate[0].peso') === 72.4 && w.eval('DOC.foto.some(function(f){ return f.id==="fprova1"; })'), 'PC: pesata (Storico misure) e foto (tab Corpo) importate da sole');
  ok(!H.file(LID, ev[0]) && !H.file(LID, ev[1]) && H.file(LID, 'dal-telefono/eventi/pesata-rotta.json'), 'PC: dopo il salvataggio su disco toglie subito pesata e foto dall\'hub; quella illeggibile resta lì');
  ok(await w.eval('importaFotoRientro([{id:"fprova1", tag:"fronte", data:"2026-11-17", img:"data:image/jpeg;base64,/9j/AAAA"}])') === 0, 'PC: la stessa foto arrivata di nuovo non si duplica');
  { const n = w.eval('DOC.foto.length'), file = w.eval('DOC.foto.find(function(f){ return f.id==="fprova1"; }).file');
    ok(await w.eval('importaFotoRientro([{id:"fprova2", sostituisce:"fprova1", tag:"fronte", data:"2026-11-17", img:"data:image/jpeg;base64,/9j/BBBB"}])') === 1 &&
       w.eval('DOC.foto.length') === n && w.eval('DOC.foto.some(function(f){ return f.id==="fprova2" && f.file!==' + J(file) + ' && f.tag==="fronte"; })') && !w.eval('DOC.foto.some(function(f){ return f.id==="fprova1"; })'),
       'PC: una foto ritagliata sul telefono prende il posto di quella già arrivata (non se ne aggiunge una)'); }
  await giroTel();
  ok(sw.eval('PESATE[0].pc===true && FOTO.fronte.pc===true'), 'telefono: pesata e foto segnate «✔ al PC»');
  sw.eval('navEntra(); mostra("bil"); renderBil();');
  ok(/al PC/.test(sd.getElementById('bil-lista').textContent), 'telefono: nell\'elenco delle pesate compare «✔ al PC»');
  sw.eval('risali();');
  /* dieta seguita: segnata sul telefono, arriva sul PC del personal (un file per cambio, tolto appena salvato) */
  sw.eval('dietaSegna("2026-11-20","si"); dietaSegna("2026-11-21","no");'); await sw.eval('colEventi()');
  { const evD = H.nomi(LID, 'dal-telefono/eventi/').filter(k => /dieta-/.test(k));
    ok(evD.length === 2 && evD.every(k => !/"si"|"no"/.test(H.file(LID, k))), 'telefono: ogni giorno della dieta segnato diventa un file cifrato sull\'hub');
    await giroPC(); await settle(450);
    ok(w.eval('DOC.alimentazione.aderenza["2026-11-20"].v') === 'si' && w.eval('DOC.alimentazione.aderenza["2026-11-21"].v') === 'no', 'PC: i giorni della dieta arrivano nel profilo del cliente (alimentazione.json)');
    ok(evD.every(k => !H.file(LID, k)) && /2026-11-21/.test(fsmem._files.get('TMS_Dati/prova/alimentazione.json') || ''), 'PC: salvati su disco, li toglie subito dall\'hub'); }
  await giroTel();
  ok(sw.eval('(function(){ var o=dietaLeggi(); return o.pc["2026-11-20"]===o.mod["2026-11-20"] && o.pc["2026-11-21"]===o.mod["2026-11-21"]; })()'), 'telefono: i giorni della dieta risultano «al PC»');
  /* un cambio sul telefono vince; uno più vecchio arrivato dopo non torna indietro */
  sw.eval('dietaSegna("2026-11-21","si")'); await sw.eval('colEventi()'); await giroPC(); await settle(450);
  ok(w.eval('DOC.alimentazione.aderenza["2026-11-21"].v') === 'si', 'PC: il giorno corretto sul telefono (no → sì) si aggiorna');
  ok(w.eval('telDietaApplica([{id:"x", data:"2026-11-21", valore:"no", ora:"2020-01-01T00:00:00.000Z"}])') === 0 && w.eval('DOC.alimentazione.aderenza["2026-11-21"].v') === 'si', 'PC: un cambio più vecchio arrivato in ritardo non torna indietro');
  sw.eval('dietaSegna("2026-11-20","")'); await sw.eval('colEventi()'); await giroPC(); await settle(450);
  ok(w.eval('DOC.alimentazione.aderenza["2026-11-20"].v') === '', 'PC: un giorno tolto sul telefono resta vuoto anche sul PC');
  /* il calendario nel tab Alimentazione del PC */
  w.eval('aderMese="2026-11"; showTab("alimentazione");'); await settle(30);
  { const cal = d.getElementById('ader-cal');
    ok(cal && cal.querySelectorAll('.ader-g.si').length === 1 && cal.querySelectorAll('.ader-g.no').length === 0 && /seguita 1/.test(cal.textContent.replace(/\s+/g, ' ')) && /100 %/.test(cal.textContent),
       'PC: nel tab Alimentazione il calendario «Dieta seguita» del cliente (verde sì, rosso no, % rispettata)'); }
  d.querySelector('#ader-cal [data-aderm="-1"]').click(); await settle(20);
  ok(w.eval('aderMese') === '2026-10' && d.getElementById('ader-cal').querySelectorAll('.ader-g.si').length === 0, 'PC: il calendario va al mese prima');
  w.eval('aderMese=""; showTab("allenamento");');
  /* clienti NON aperti (25/11/2026): il PC controlla anche i loro telefoni e salva nei file del profilo, senza aprirlo */
  { await fsmem.writeFile('TMS_Dati/giulia/scheda.json', J({ settimanale: [], mensile: [] }));
    await fsmem.writeFile('TMS_Dati/giulia/storico.json', '[]');
    const sett = w.eval('settimanaPesata({data:"2026-11-23"})');
    await fsmem.writeFile('TMS_Dati/giulia/corpo.json', J({ dati_utente: { nome: 'Giulia', sesso: 'F', altezza: 165 }, storico_io: [{ scheda: sett, peso: 60 }], pesate: [], foto: [] }));
    await fsmem.writeFile('TMS_Dati/giulia/alimentazione.json', J({ bulk: [], mant: [], cut: [] }));
    w.eval('profili.push({slug:"giulia", nome:"Giulia"})');
    const { lid: L2, codice: C2 } = JSON.parse(await w.eval('telCollega("giulia").then(function(p){ return JSON.stringify({lid:p.lid, codice:p.codice}); })'));
    const cifra = ev => w.eval('telCifra(' + J(ev) + ', ' + J(C2) + ')');
    H.metti(L2, 'dal-telefono/eventi/pesata-g1.json', await cifra({ tipo: 'tms-pesata', pesata: { id: '2026-11-23T07:00:00|61.2', data: '2026-11-23', ora: '07:00:00', peso: 61.2 } }));
    H.metti(L2, 'dal-telefono/eventi/foto-g1.json', await cifra({ tipo: 'tms-foto', foto: { id: 'fg1', tag: 'fronte', data: '2026-11-23', img: 'data:image/jpeg;base64,/9j/AAAA' } }));
    H.metti(L2, 'dal-telefono/eventi/dieta-g1.json', await cifra({ tipo: 'tms-dieta', id: 'dieta|2026-11-23|g1', data: '2026-11-23', valore: 'si', ora: '2026-11-23T20:00:00.000Z' }));
    const pesatePrima = w.eval('JSON.stringify(DOC.pesate)');
    await w.eval('telGiroAltri()');
    const co = JSON.parse(fsmem._files.get('TMS_Dati/giulia/corpo.json')), al = JSON.parse(fsmem._files.get('TMS_Dati/giulia/alimentazione.json'));
    ok(co.pesate.length === 1 && co.pesate[0].peso === 61.2 && co.foto.some(f => f.id === 'fg1' && fsmem._files.has('TMS_Dati/giulia/foto/' + f.file)) && al.aderenza['2026-11-23'].v === 'si',
       'clienti non aperti: pesata, foto e giorno della dieta salvati nei file di quel profilo, senza aprirlo');
    ok(co.storico_io.find(r => r.scheda === sett).peso === 60 && co.dati_utente.peso === 61.2, 'clienti non aperti: i valori scritti a mano nello Storico misure restano, il peso del profilo si aggiorna');
    ok(w.eval('JSON.stringify(DOC.pesate)') === pesatePrima && w.eval('activeProfile') === 'prova', 'clienti non aperti: il profilo aperto non cambia');
    ok(H.nomi(L2, 'dal-telefono/eventi/').length === 0 && ['2026-11-23T07:00:00|61.2', 'fg1', 'dieta|2026-11-23|g1'].every(id => w.eval('telProf("giulia").ricevute').indexOf(id) >= 0),
       'clienti non aperti: salvati su disco, tolti dall\'hub e segnati fra le ricevute (il telefono li vede «al PC»)');
    /* un file illeggibile non si riscrive mai: l'arrivo resta sull'hub */
    await fsmem.writeFile('TMS_Dati/giulia/alimentazione.json', '{rotto');
    H.metti(L2, 'dal-telefono/eventi/dieta-g2.json', await cifra({ tipo: 'tms-dieta', id: 'dieta|2026-11-24|g2', data: '2026-11-24', valore: 'no', ora: '2026-11-24T20:00:00.000Z' }));
    await w.eval('telGiroAltri()');
    ok(fsmem._files.get('TMS_Dati/giulia/alimentazione.json') === '{rotto' && H.nomi(L2, 'dal-telefono/eventi/').length === 1, 'clienti non aperti: con un file illeggibile non si scrive niente e l\'arrivo resta sull\'hub');
    /* aperto il profilo mentre si salva: niente conferme, al giro dopo arriva senza doppioni */
    await fsmem.writeFile('TMS_Dati/giulia/alimentazione.json', J({ bulk: [], mant: [], cut: [] }));
    w.eval('var _w=writeJson; writeJson=async function(a,b,c){ await _w(a,b,c); profiloCambi++; };');
    await w.eval('telGiroAltri()');
    w.eval('writeJson=_w;');
    ok(H.nomi(L2, 'dal-telefono/eventi/').length === 1, 'clienti non aperti: se intanto si cambia profilo non si toglie niente dall\'hub');
    await w.eval('telGiroAltri()');
    ok(H.nomi(L2, 'dal-telefono/eventi/').length === 0 && JSON.parse(fsmem._files.get('TMS_Dati/giulia/alimentazione.json')).aderenza['2026-11-24'].v === 'no', 'clienti non aperti: al giro dopo arriva');
    /* la panoramica nelle Impostazioni */
    await w.eval('impostazioniModal()');
    { const righe = [...d.querySelectorAll('#imp-tel .tel-cliente')];
      ok(righe.length === 2 && righe.some(r => /Giulia/.test(r.textContent) && r.querySelector('[data-tel-apri="giulia"]') && /arrivate/.test(r.textContent)) && righe.some(r => r.classList.contains('is-on')),
         'Impostazioni: panoramica dei clienti collegati (ultimo dal telefono, cosa è arrivato, «Apri»)'); }
    w.eval('closeModal()');
    await w.eval('telStacca("giulia")'); w.eval('profili=profili.filter(function(x){ return x.slug!=="giulia"; })'); }
  /* fine seduta sul telefono, poi «💾 Salva nello Storico» sul PC: la settimana si cristallizza */
  scrivi('rpe-0', '7'); scrivi('min-0', '60'); await giroTel(); await giroPC();
  ok(J(w.eval('JSON.stringify(DOC.scheda.rpe.settimanale)')) === J(J({ [righePC()[0].giorno]: { rpe: 7, min: 60 } })), 'fatica e durata della seduta scritte sul telefono arrivano sul PC');
  ok(sd.getElementById('ck-0').textContent === '✔', 'telefono: la riga dello squat è spuntata ✔ (toccata questa settimana)');
  w.eval('telSettimanaSalvata(202647)'); await settle(20); await giroPC(); await giroTel(); await settle(50);
  ok(w.eval('telProf().settimana') === 2 && sw.eval('SCHEDA.sync.settimana') === 2, 'Salva nello Storico: la settimana sale a 2 sul PC e sul telefono');
  ok(sd.getElementById('rpe-0').value === '' && sd.getElementById('min-0').value === '' && sd.getElementById('ck-0').textContent === '' && sd.getElementById('s-0').value === '4',
     'telefono: fatica, durata e spunte ripartono da zero; la scheda resta quella (4 serie) ed è ancora collegata');
  ok(/Settimana salvata/.test(sd.getElementById('col-avvisi').textContent), 'telefono: «✔ Settimana salvata nello Storico sul PC»');
  scrivi('s-0', '5'); await giroTel(); await giroPC();
  ok(righePC()[0].serie === 5, 'dopo il salvataggio la scheda resta collegata: la settimana dopo si modifica come prima');
  /* collegamento dal telefono: il codice si scrive come si vuole; sbagliato non collega */
  sw.eval('colStacca(); navEntra(); mostra("col"); colRender();');
  ok(sw.eval('SCHEDA.collegata') === false && sd.getElementById('col').hidden === false && sd.getElementById('col-codice-box').hidden === false && !sd.getElementById('col-cartella'),
     'telefono: «Scollega» lascia la scheda come scheda normale; schermata col solo campo del codice (niente cartella)');
  sd.getElementById('col-codice').value = 'zzzz-zzzz-zzzz-zzzz-zzzz'; await sw.eval('colCollega()');
  ok(!sw.eval('colConf().lid') && /Codice sconosciuto/.test(sd.getElementById('col-stato').textContent), 'telefono: con un codice sbagliato l\'hub non lo fa entrare, e lo dice');
  sd.getElementById('col-codice').value = w.eval('telCodiceBello(' + J(CODICE) + ')').toLowerCase(); await sw.eval('colCollega()');
  ok(sw.eval('colConf().lid') === LID && sw.eval('colConf().slug') === 'prova' && sw.eval('colConf().nome') === 'Cliente Prova', 'telefono: col codice giusto (anche minuscolo, coi trattini) trova il suo profilo e si collega');
  sw.eval('risali();'); await giroTel(); await settle(50);
  ok(sw.eval('!!SCHEDA.collegata'), 'telefono: ricollegato, con una scheda già sul telefono chiede e riprende quella del PC');
  /* 18/11/2026: «Rinumera da 1» sul PC col telefono collegato → anche il telefono passa ai nomi nuovi e la
     fatica della seduta segue il suo giorno, senza tornare indietro dal telefono */
  { w.eval('DOC.scheda.settimanale.forEach(function(r){ if(r.esercizio) r.giorno="Giorno 6"; }); DOC.scheda.rpe=DOC.scheda.rpe||{}; DOC.scheda.rpe.settimanale={"Giorno 6":{rpe:7,min:50}}; persist("scheda");');
    await giroPC(); await giroTel(); await giroPC(); await settle(50);
    const prima = sw.eval('WROWS.every(function(r){ return r.giorno==="Giorno 6"; })') && sw.eval('colLocale().sedute["Giorno 6"].rpe') === 7;
    w.eval('rinumeraGiorni(); persist("scheda");');
    await giroPC(); await giroTel(); await giroPC(); await giroTel(); await giroPC(); await settle(50);
    const rp = JSON.parse(w.eval('JSON.stringify(DOC.scheda.rpe.settimanale)'));
    ok(prima && righePC().every(r => r.giorno === 'Giorno 1') && sw.eval('WROWS.every(function(r){ return r.giorno==="Giorno 1"; })') &&
       rp['Giorno 1'] && rp['Giorno 1'].rpe === 7 && !rp['Giorno 6'] && sw.eval('colLocale().sedute["Giorno 1"].rpe') === 7,
       'Rinumera da 1 col telefono collegato: anche il telefono passa a «Giorno 1» e la fatica resta sulla seduta giusta, da tutte e due le parti'); }
  /* recupero su un PC nuovo: col solo codice di recupero tornano personal e collegamento del profilo */
  { await giroPC(); await giroTel(); await giroPC();
    const prima = JSON.parse(w.eval('JSON.stringify(telProf("prova"))')), serieHub = righePC()[0].serie;
    /* PC nuovo: impostazioni vuote e dati da un backup più vecchio (3 serie al posto dell'ultima scheda) */
    w.eval('localStorage.removeItem("tms-telefono"); TEL=null; _telId={}; DOC.scheda.settimanale[0].serie=3;');
    ok(!w.eval('telPersonal()') && !w.eval('telProf("prova")'), 'PC nuovo (impostazioni vuote): né personal né collegamenti');
    /* intanto, sul telefono, il cliente cambia il peso dello squat */
    scrivi('p-0', '90'); await giroTel();
    let errRec = ''; try { await w.eval('telRecupera("AAAA-BBBB-CCCC-DDDD-EEEE-FFFF")'); } catch (e) { errRec = String(e.message || e); }
    ok(/sconosciuto/.test(errRec) && !w.eval('telPersonal()'), 'recupero: un codice che l\'hub non conosce non attiva niente');
    const n = await w.eval('telRecupera(' + J(w.eval('telCodiceBello(' + J(REC) + ')')) + ')');
    const dopo = JSON.parse(w.eval('JSON.stringify(telProf("prova"))'));
    ok(n === 1 && w.eval('telPersonal().codice') === REC && dopo.codice === prima.codice && dopo.lid === prima.lid,
       'recupero: col codice di recupero tornano il personal e il collegamento del profilo (stesso codice del telefono)');
    ok(dopo.settimana === prima.settimana && prima.settimana === 2 && (prima.ricevute || []).every(x => dopo.ricevute.includes(x)) && dopo.ombra && dopo.riparti === true,
       'recupero: settimana (2) e pesate e foto già ricevute si riprendono dall\'hub, non ripartono da zero');
    await giroPC(); await giroTel(); await giroPC(); await settle(50);
    ok(serieHub === 5 && righePC()[0].serie === 5 && righePC()[0].peso === 90 && sd.getElementById('s-0').value === '5' && sd.getElementById('p-0').value === '90' && !w.eval('telProf("prova").riparti'),
       'recupero con un backup vecchio: la scheda riparte dall\'ultima unita (5 serie, non le 3 del backup) e la modifica fatta intanto sul telefono (90 kg) resta, da tutte e due le parti');
    ok(sw.eval('COL.stato') === 'ok' && sw.eval('SCHEDA.sync.settimana') === 2, 'dopo il recupero il telefono continua a funzionare senza toccarlo, sempre alla settimana 2'); }
  /* chiusura del TMS con una modifica non ancora mandata: ultimo giro con l'hub, poi la finestra si chiude da sola */
  { const chiudiVero = w.close; let chiuso = 0; w.close = () => { chiuso++; };
    w.eval('DOC.scheda.settimanale[0].rip=11; persist("scheda");'); await settle(30);
    const ev = new w.Event('beforeunload', { cancelable: true }); w.dispatchEvent(ev);
    const trattenuta = ev.defaultPrevented && chiuso === 0;
    for (let k = 0; k < 80 && !chiuso; k++) await settle(100);
    await giroTel(); await settle(50);
    ok(trattenuta && chiuso === 1 && sd.getElementById('r-0').value === '11' && !w.eval('_telSporco'),
       'chiusura del TMS con una modifica appena fatta: la finestra aspetta l\'ultimo giro con l\'hub, poi si chiude da sola; il telefono ha la modifica');
    w.eval('_telChiudi=false; _telChiusuraIn=false;');
    const ev2 = new w.Event('beforeunload', { cancelable: true }); w.dispatchEvent(ev2);
    ok(!ev2.defaultPrevented && chiuso === 1, 'chiusura senza niente in sospeso: la finestra si chiude subito');
    w.close = chiudiVero; }
  /* «Nuovo codice»: il telefono vecchio non entra più, il legame vecchio sparisce dall'hub */
  { w.eval('closeModal(); impostazioniModal()'); await settle(30);
    await clic('imp-tel-nuovo', 500);
    const P2 = JSON.parse(w.eval('JSON.stringify(telProf("prova"))'));
    await giroPC(); await giroTel();
    ok(P2.lid !== LID && P2.codice !== CODICE && H.sql.prepare('SELECT COUNT(*) AS n FROM file WHERE lid = ?').get(LID).n === 0 && H.file(P2.lid, 'dal-pc/scheda.json') && P2.settimana === 2,
       'Nuovo codice: nuovo legame con la scheda già sopra, quello vecchio tolto dall\'hub coi suoi file; la settimana resta');
    ok(sw.eval('COL.stato') === 'staccato' && /non vale più/.test(sd.getElementById('col-stato').textContent || sw.eval('COL.errore')), 'Nuovo codice: il telefono col codice vecchio lo dice («il collegamento non vale più»)');
    w.eval('closeModal()'); }
  /* promemoria */
  sw.eval('avvSalvaConf({on:true, ora:"21:00"}); PESATE=[];');
  { const l = JSON.parse(sw.eval('JSON.stringify(avvLista(new Date(2026,10,16,8,0)))'));
    ok(l.length === 28 && l[0].id === 7000 && new Date(l[0].at).getHours() === 21 && /foto/.test(l[0].titolo) && /Pesata/.test(l[0].titolo) && l[0].pagina === 'bil' && !/foto/.test(l[1].titolo),
       'promemoria: ogni sera alle 21 la pesata, il lunedì anche le foto (28 giorni)'); }
  sw.eval('PESATE=[{id:"x", data:"2026-11-16", ora:"07:00:00", peso:72}];');
  { const l = JSON.parse(sw.eval('JSON.stringify(avvLista(new Date(2026,10,16,8,0)))'));
    ok(l[0].pagina === 'foto' && !/Pesata/.test(l[0].titolo), 'promemoria: se ti sei già pesato oggi, stasera resta solo quello delle foto'); }
  { const l = JSON.parse(sw.eval('JSON.stringify(avvLista(new Date(2026,10,17,22,0)))'));
    ok(new Date(l[0].at).getDate() === 18, 'promemoria: passata l\'ora, si parte da domani'); }
  sw.eval('avvSalvaConf({on:false, ora:"21:00"})');
  ok(sw.eval('avvLista(new Date()).length') === 0, 'promemoria: spenti, nessuno');
  /* APK nuovo su GitHub (versione.json del sito) */
  H.versioneApk = { versione: '1.3.0', file: 'TMS-Scheda-1.3.0.apk', sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', url: 'https://github.com/marcomartinellione-create/TMS/releases/download/v1.1.29/TMS-Scheda-1.3.0.apk', pubblicata: '2026-11-18' };
  await sw.eval('colApk(true)');
  ok(H.installati.length === 1 && H.installati[0][0] === H.versioneApk.url && H.installati[0][1] === H.versioneApk.sha256, 'APK nuovo su GitHub: lo propone e lo scarica dalla release (con l\'impronta da controllare)');
  H.versioneApk = { versione: '1.2.0', file: 'TMS-Scheda-1.2.0.apk', sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', url: 'https://github.com/marcomartinellione-create/TMS/releases/download/v1.1.28/TMS-Scheda-1.2.0.apk' };
  await sw.eval('colApk(true)');
  ok(H.installati.length === 1 && sw.eval('COL.apk') === null, 'APK della stessa versione: niente da proporre');
  /* «Stacca» sul PC: l'hub cancella legame e file */
  { const lidOra = w.eval('telProf("prova").lid');
    await w.eval('impostazioniModal()'); await settle(30); await clic('imp-tel-togli', 400);
    ok(!w.eval('telProf("prova")') && H.sql.prepare('SELECT COUNT(*) AS n FROM legami').get().n === 0 && H.sql.prepare('SELECT COUNT(*) AS n FROM file WHERE lid = ?').get(lidOra).n === 0,
       'Stacca: il profilo non è più collegato e sull\'hub non resta niente di quel cliente');
    w.eval('closeModal()'); }
  /* chiusura pulita: niente giri del telefono a finestra chiusa */
  sw.eval('clearInterval(COL.timer); clearTimeout(COL.prestoT); clearTimeout(COL.modT); clearTimeout(COL.avvisoT); clearTimeout(_avvT);');
  for (let k = 0; k < 100 && sw.eval('COL.inCorso'); k++) await settle(30);
  sw.eval('clearTimeout(COL.prestoT); clearTimeout(COL.modT);');
  sub.window.close();
  /* senza APK (pagina nel browser) niente collegamento */
  { const s2 = await JSDOM.fromFile(PWA, { runScripts: 'dangerously', url: 'https://tms.test/app/index.html', beforeParse(win){ win.scrollTo = () => {}; win.TMS_HUB = H.URL; } });
    await settle(200);
    ok(s2.window.document.getElementById('col-da-ben').hidden === true, 'fuori dall\'APK: niente «Collega al PC»');
    s2.window.close(); }
  w.eval('clearInterval(_telTimer); clearTimeout(_telModT);');
  ok(errors.length === 0, 'telefono collegato: nessun errore runtime sul PC' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  dom.window.close();
}

console.log('--- T15: gruppi di Training Set (solo per ordinare, filtrare e cercare: nessun effetto sui calcoli) ---');
{
  /* A · profilo VECCHIO senza gruppi, da file (scenario autosufficiente: gira anche in CI, senza TMS_Dati) */
  const fsmem = makeTmsFS(); const J = o => JSON.stringify(o);
  /* confronto a chiavi ordinate: conta il contenuto, non l'ordine in cui le chiavi sono scritte */
  const canon = v => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : (v && typeof v === 'object') ? '{' + Object.keys(v).sort().map(k => J(k) + ':' + canon(v[k])).join(',') + '}' : J(v);
  const ES = (nome, macro, prim, sec) => ({ nome, macro, gruppo: macro, tipo: 'Multi-articolare', fattore: 1, muscoli_primari: prim, muscoli_secondari: sec, target: prim.concat(sec).join(', ') });
  const schedaVecchia = { settimanale: [{ giorno: 'Giorno 1', esercizio: 'Squat con bilanciere', note: '', serie: 3, rip: 5, peso: 100, rest: '2:00' }], mensile: [], riscaldamento: {},
    setAttivo: 'Palestra', tipoAllenamento: 'forza', setsOrdine: ['Palestra', 'Casa'],
    setsSalvati: { Casa: { settimanale: [{ giorno: 'Giorno 1', esercizio: 'Squat con bilanciere', note: '', serie: 3, rip: 10, peso: 40 }], mensile: [], riscaldamento: {}, tipoAllenamento: 'generale' } } };
  await fsmem.writeFile('TMS_Dati/profili.json', J({ list: [{ slug: 'anna', nome: 'Anna', creato: '2026-01-01' }], active: 'anna' }));
  await fsmem.writeFile('TMS_Dati/esercizi.json', J([ES('Squat con bilanciere', 'Gambe', ['quadricipiti'], ['glutei'])]));
  await fsmem.writeFile('TMS_Dati/anna/scheda.json', J(schedaVecchia));
  await fsmem.writeFile('TMS_Dati/anna/storico.json', J([202640, 202641].map(s => ({ scheda: s, esercizio: 'Squat con bilanciere', seduta: 1, test: false, macro: 'Gambe', serie: 3, rip: 5, peso: 100, rest: '2:00', rir: null, set: 'Palestra' }))));
  await fsmem.writeFile('TMS_Dati/anna/corpo.json', J({ dati_utente: { sesso: 'F', nascita: '1990-01-01', peso: 60, altezza: 165 }, storico_io: [] }));
  await fsmem.writeFile('TMS_Dati/anna/alimentazione.json', J({ bulk: [], mant: [], cut: [] }));
  const { dom, errors } = await load({ idb: makeIDB(), tmsFS: fsmem, fsa: true });
  await settleConnect(dom, fsmem);
  const w = dom.window, d = w.document; w.alert = () => {}; w.confirm = () => true;
  w.eval('showTab("allenamento"); showTab("progressi"); showTab("profilo"); showTab("allenamento"); persist("scheda");'); await settle(500);
  ok(canon(JSON.parse(w.eval('JSON.stringify(DOC.scheda)'))) === canon(schedaVecchia) && canon(JSON.parse(fsmem._files.get('TMS_Dati/anna/scheda.json'))) === canon(schedaVecchia),
     'gruppi/profilo vecchio: si apre identico (in memoria e su disco, nessun campo nuovo)');
  ok(w.eval('tsGruppi().length') === 0 && w.eval('JSON.stringify(tsPerGruppo(ensureSets().setsOrdine))') === J([{ gruppo: '', nomi: ['Palestra', 'Casa'] }]), 'gruppi/profilo vecchio: tutti i set stanno in «Senza gruppo»');
  d.getElementById('training-set').click();
  ok(d.querySelector('#tnd-pop .tnd-chips').hidden === true && d.querySelectorAll('#tnd-pop .tnd-gr').length === 0 && [...d.querySelectorAll('#tnd-pop .tnd-lista [data-tnd-v]')].map(b => b.dataset.tndV).join('|') === 'Palestra|Casa' &&
     d.querySelector('#training-set .tnd__nota') === null, 'gruppi/profilo vecchio: il menù Training Set mostra i set in fila, senza bottoni né intestazioni di gruppo');
  ok(d.querySelector('#tnd-pop .tnd-azioni [data-tnd-v="__cerca__"]') !== null, 'gruppi: «Gestisci i gruppi…» tra le azioni del menù Training Set');
  w.eval('tendinaChiudi(false); showTab("progressi")');
  d.getElementById('prog-set').click();
  ok(d.querySelector('#tnd-pop .tnd-chips').hidden === true && d.querySelectorAll('#tnd-pop .tnd-gr').length === 0 && [...d.querySelectorAll('#tnd-pop .tnd-lista [data-tnd-v]')].map(b => b.dataset.tndV).join('|') === '__tutti__|Casa|Palestra',
     'gruppi/profilo vecchio: nei Progressi «Tutto il percorso» e i set in fila, senza gruppi');
  w.eval('tendinaChiudi(false)');
  /* dati scritti a mano: elenco ripulito, gruppi usati ma non elencati aggiunti, idempotente */
  w.eval('DOC.scheda.setsGruppi=["  A ","A","",null]; DOC.scheda.setsSalvati.Casa.gruppo="  B  "; DOC.scheda.gruppo="   "; ensureSets();');
  ok(w.eval('JSON.stringify(DOC.scheda.setsGruppi)') === '["A","B"]' && w.eval('DOC.scheda.setsSalvati.Casa.gruppo') === 'B' && w.eval('"gruppo" in DOC.scheda') === false && w.eval('JSON.stringify(ensureSets().setsGruppi)') === '["A","B"]',
     'gruppi: elenco ripulito e idempotente (doppioni, nomi vuoti, gruppi usati ma non elencati)');
  w.eval('tsTogliGruppo("A"); tsTogliGruppo("B");');
  ok(canon(JSON.parse(w.eval('JSON.stringify(DOC.scheda)'))) === canon(schedaVecchia), 'gruppi: togliendo l\'ultimo gruppo la scheda torna senza campi dei gruppi');
  /* il filtro è legato al profilo: un altro profilo riparte da «Tutti» */
  w.eval('tsNuovoGruppo("Sala"); tsFiltroSet("pesi","Sala"); window.__ap=activeProfile;');
  ok(w.eval('tsFiltroGet("pesi")') === 'Sala' && w.eval('activeProfile="altro"; var _v=tsFiltroGet("pesi"); activeProfile=window.__ap; _v') === '__tutti__', 'gruppi/filtro: un altro profilo riparte da «Tutti»');
  w.eval('tsTogliGruppo("Sala")');
  ok(errors.length === 0, 'gruppi/profilo vecchio: nessun errore runtime' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  dom.window.close();
}
{
  /* B · profilo dimostrativo incorporato nell'HTML (cinque Training Set): assegnazione, filtro,
     ricerca, rinomina, rimozione, riquadro, nuovo set — e i numeri restano identici */
  const fsmem = makeTmsFS();
  const { dom, errors } = await load({ idb: makeIDB(), tmsFS: fsmem, fsa: true });
  await settleConnect(dom, fsmem);
  const w = dom.window, d = w.document, avvisi = []; w.alert = x => { avvisi.push(String(x)); }; w.confirm = () => true;
  const E = s => w.eval(s), J2 = o => JSON.stringify(o);
  ok(E('ensureSets().setsOrdine.join("|")') === 'Ipertrofia A|Forza|Powerlifting|Casa · manubri|Ipertrofia B' && E('DOC.scheda.setAttivo') === 'Ipertrofia B' && E('tsGruppi().length') === 0,
     'gruppi: il profilo dimostrativo parte con cinque set e nessun gruppo');
  const progSet0 = E('progSetGet()');
  /* fotografia dei calcoli: 1RM e TL delle righe, settimane aggregate (tutte e per set), riferimenti
     della ragnatela, distribuzione, carico cronico, Progresso reale, record, stalli */
  E('window.__calcoli=function(){ var s=ensureSets(), nomi=s.setsOrdine.slice(), ag=schedeAggr(), last=ag[ag.length-1], o={};' +
    ' o.ag=ag; o.agSet=nomi.map(function(n){ return schedeAggr(n); }); o.rif=rifCalcola(); o.rifSet=nomi.map(function(n){ return rifCalcola(null,{set:n}); });' +
    ' o.voci=vociDistribuzione(last.sets,{D:last.setsD,I:last.setsI},rifCalcola()); o.cron=caricoCronico(ag,true); o.tlUlt=tlUltimaScheda();' +
    ' o.ip=indiceProgresso("__tutti__",null); o.ipSet=nomi.map(function(n){ return indiceProgresso(n,null); }); o.ex=exerciseList("__tutti__",null);' +
    ' o.rec=MAINLIFTS.map(function(L){ return realMax(nomeAttuale(L.nome)); }); o.plat=plateauList();' +
    ' o.righe=schedaRows().map(function(r){ return [sTL(r),sPct(r),rmMostrato(r)]; }); return JSON.stringify(o); };');
  /* e di quello che si legge a video: Pesi, Progressi, Analisi senza le barre dei menù */
  const pannello = id => { const p = d.getElementById(id).cloneNode(true); p.querySelectorAll('.bar').forEach(b => b.remove()); return p.textContent.replace(/\s+/g, ' ').trim(); };
  const vedi = () => { E('showTab("allenamento")'); const a = pannello('panel-allenamento'); E('showTab("progressi")'); const b = pannello('panel-progressi'); E('showTab("analisi")'); const c = pannello('panel-analisi'); return a + '\n§\n' + b + '\n§\n' + c; };
  const calc0 = E('__calcoli()'), vista0 = vedi(), tel0 = E('JSON.stringify(costruisciSchedaJSON({},true))');
  ok(calc0.length > 1000 && vista0.length > 1000, 'gruppi/calcoli: fotografia dei numeri prima dei gruppi');
  /* 1 · creare i gruppi e metterci i set */
  ok(E('tsNuovoGruppo("Palestra")') === 'Palestra' && E('tsNuovoGruppo("  Corpo   libero ")') === 'Corpo libero' && E('tsNuovoGruppo("palestra")') === 'Palestra' && E('tsGruppi().join("|")') === 'Palestra|Corpo libero',
     'gruppi: si creano (spazi ripuliti); un nome già usato, anche con maiuscole diverse, non fa un doppione');
  E('["Ipertrofia A","Forza","Powerlifting","Ipertrofia B"].forEach(function(n){ tsAssegnaGruppo(n,"Palestra"); }); tsAssegnaGruppo("Casa · manubri","Corpo libero"); persist("scheda");');
  ok(E('tsGruppoDi("Forza")') === 'Palestra' && E('tsGruppoDi("Casa · manubri")') === 'Corpo libero' && E('DOC.scheda.gruppo') === 'Palestra' && E('DOC.scheda.setsSalvati.Forza.gruppo') === 'Palestra',
     'gruppi/assegnazione: il gruppo sta dentro ogni set, anche in quello aperto');
  ok(E('tsAssegnaGruppo("Forza","")') === true && E('tsGruppoDi("Forza")') === '' && E('tsAssegnaGruppo("Forza","PALESTRA")') === true && E('tsGruppoDi("Forza")') === 'Palestra' && E('tsAssegnaGruppo("Non esiste","Palestra")') === false,
     'gruppi/assegnazione: «Senza gruppo», gruppo scritto con maiuscole diverse, set inesistente');
  E('switchTrainingSet("Casa · manubri")');
  ok(E('DOC.scheda.gruppo') === 'Corpo libero' && E('DOC.scheda.setsSalvati["Ipertrofia B"].gruppo') === 'Palestra', 'gruppi: il gruppo viaggia col set quando si cambia Training Set');
  E('switchTrainingSet("Ipertrofia B")');
  await settle(500);
  { const sj = JSON.parse(fsmem._files.get('TMS_Dati/template/scheda.json'));
    ok(J2(sj.setsGruppi) === '["Palestra","Corpo libero"]' && sj.gruppo === 'Palestra' && sj.setsSalvati['Casa · manubri'].gruppo === 'Corpo libero', 'gruppi: salvati in scheda.json (elenco e gruppo dentro ogni set)'); }
  /* 2 · i numeri non cambiano: con i gruppi, e col filtro per gruppo acceso */
  ok(E('__calcoli()') === calc0, 'gruppi/calcoli: 1RM, TL, volumi, riferimenti della ragnatela, Progresso reale, record e stalli identici con i gruppi');
  ok(vedi() === vista0, 'gruppi/calcoli: Pesi, Progressi e Analisi mostrano gli stessi numeri con i gruppi');
  E('tsFiltroSet("pesi","Corpo libero"); tsFiltroSet("prog","Corpo libero");');
  ok(E('__calcoli()') === calc0 && vedi() === vista0, 'gruppi/calcoli: anche col filtro per gruppo acceso (Pesi e Progressi) i numeri non cambiano');
  ok(E('JSON.stringify(costruisciSchedaJSON({},true))') === tel0, 'gruppi/telefono: la scheda che va al telefono è identica (il gruppo non ci va)');
  /* 3 · il menù Training Set della barra Pesi (menù a tendina dell'app): gruppi a bottoni, set divisi
     per gruppo con la spunta su quello aperto, ricerca, tastiera, chiusura, azioni */
  const voci = () => [...d.querySelectorAll('#tnd-pop .tnd-lista [data-tnd-v]')].map(b => b.dataset.tndV).join('|');
  const grTit = () => [...d.querySelectorAll('#tnd-pop .tnd-gr__nome')].map(x => x.textContent).join('|');
  E('showTab("allenamento")');
  ok(d.getElementById('training-set').tagName === 'BUTTON' && d.querySelector('#training-set .tnd__val').textContent === 'Ipertrofia B' && d.querySelector('#training-set .tnd__nota').textContent === 'Palestra' && d.getElementById('ts-gruppo') === null,
     'menù Training Set: un pulsante col set aperto e il suo gruppo (niente menù Gruppo a parte)');
  d.getElementById('training-set').click();
  { const pop = d.getElementById('tnd-pop'), chips = [...pop.querySelectorAll('[data-tnd-gr]')];
    ok(pop !== null && d.getElementById('training-set').getAttribute('aria-expanded') === 'true', 'menù Training Set: al clic si apre il riquadro dell\'app');
    ok(chips.map(b => b.dataset.tndGr).join('|') === '__tutti__|Palestra|Corpo libero' && pop.querySelector('[data-tnd-gr].is-on').dataset.tndGr === 'Corpo libero' && chips[1].textContent === 'Palestra4',
       'menù Training Set: in cima i bottoni dei gruppi col numero di set (Senza gruppo, vuoto, non c\'è), acceso quello filtrato');
    ok(voci() === 'Casa · manubri' && grTit() === 'Corpo libero', 'menù Training Set: col filtro «Corpo libero» solo i suoi set, sotto il nome del gruppo');
    pop.querySelector('[data-tnd-gr="__tutti__"]').click(); }
  ok(E('tsFiltroGet("pesi")') === '__tutti__' && voci() === 'Ipertrofia A|Forza|Powerlifting|Ipertrofia B|Casa · manubri' && grTit() === 'Palestra|Corpo libero',
     'menù Training Set: con «Tutti» tornano tutti e cinque i set, divisi per gruppo');
  ok(d.querySelector('#tnd-pop .tnd-voce.is-sel').dataset.tndV === 'Ipertrofia B' && d.querySelector('#tnd-pop [data-tnd-v="Forza"] .tnd-info').textContent === 'Forza',
     'menù Training Set: spunta sul set aperto e tipo di allenamento accanto a ogni set');
  ok([...d.querySelectorAll('#tnd-pop .tnd-azioni [data-tnd-v]')].map(b => b.dataset.tndV).join('|') === '__new__|__cerca__|__rename__|__delete__' && d.querySelector('#tnd-pop [data-tnd-v="__delete__"]').classList.contains('tnd-az--pericolo'),
     'menù Training Set: in fondo le azioni, Elimina in rosso');
  { const ce = d.querySelector('#tnd-pop .tnd-cerca input');
    ok(d.activeElement === ce, 'menù Training Set: aperto, si può scrivere subito nella ricerca');
    ce.value = 'iper'; ce.dispatchEvent(new w.Event('input'));
    ok(voci() === 'Ipertrofia A|Ipertrofia B', 'menù Training Set: la ricerca restringe l\'elenco, in tutti i gruppi');
    d.querySelector('#tnd-pop [data-tnd-gr="Corpo libero"]').click();
    ok(voci() === '' && /Nessun Training Set con questo nome/.test(d.getElementById('tnd-pop').textContent) && d.activeElement === ce, 'menù Training Set: dentro un gruppo cerca solo lì (e la casella resta pronta)');
    ce.value = 'MANUBRI'; ce.dispatchEvent(new w.Event('input'));
    ok(voci() === 'Casa · manubri', 'menù Training Set: senza badare alle maiuscole');
    ce.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }
  ok(E('DOC.scheda.setAttivo') === 'Casa · manubri' && d.getElementById('tnd-pop') === null, 'menù Training Set: Invio apre il set trovato e chiude il riquadro');
  E('switchTrainingSet("Ipertrofia B"); tsFiltroSet("pesi","__tutti__"); renderAllenamento();');
  d.getElementById('training-set').click();
  { const k = key => d.querySelector('#tnd-pop .tnd-cerca input').dispatchEvent(new w.KeyboardEvent('keydown', { key, bubbles: true }));
    k('ArrowDown'); k('ArrowDown');
    ok(d.querySelector('#tnd-pop .is-att') !== null && d.querySelector('#tnd-pop .is-att').dataset.tndV === 'Forza', 'menù Training Set: le frecce scorrono le voci');
    k('Escape');
    ok(d.getElementById('tnd-pop') === null && d.activeElement === d.getElementById('training-set') && E('DOC.scheda.setAttivo') === 'Ipertrofia B', 'menù Training Set: Esc chiude senza cambiare e torna sul pulsante'); }
  d.getElementById('training-set').click();
  d.body.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true }));
  ok(d.getElementById('tnd-pop') === null, 'menù Training Set: un clic fuori lo chiude');
  d.getElementById('training-set').click(); d.getElementById('training-set').click();
  ok(d.getElementById('tnd-pop') === null && d.getElementById('training-set').getAttribute('aria-expanded') === 'false', 'menù Training Set: un secondo clic sul pulsante lo chiude');
  d.getElementById('training-set').click(); E('renderAllenamento()');
  ok(d.getElementById('tnd-pop') === null, 'menù Training Set: se la barra si ridisegna il riquadro non resta appeso');
  d.getElementById('training-set').click(); d.querySelector('#tnd-pop [data-tnd-v="__cerca__"]').click();
  ok(d.getElementById('tsm-lista') !== null && d.getElementById('tnd-pop') === null, 'menù Training Set: «Gestisci i gruppi…» apre il riquadro dei gruppi');
  E('closeModal()');
  ok(typeof E('EN[document.getElementById("training-set").title]') === 'string' && E('EN["Cerca un Training Set…"]') === 'Search a Training Set…' && E('EN["Senza gruppo"]') === 'No group',
     'EN: i testi del menù Training Set hanno la traduzione');
  ok(E('JSON.stringify(tsPerGruppo(ensureSets().setsOrdine,{cerca:"iper"}))') === J2([{ gruppo: 'Palestra', nomi: ['Ipertrofia A', 'Ipertrofia B'] }]), 'gruppi/ricerca: «iper» trova i set in tutti i gruppi');
  ok(E('tsPerGruppo(ensureSets().setsOrdine,{cerca:"iper",filtro:"Corpo libero"}).length') === 0 && E('tsPerGruppo(ensureSets().setsOrdine,{cerca:"MANUBRI",filtro:"Corpo libero"})[0].nomi.join()') === 'Casa · manubri',
     'gruppi/ricerca: dentro un gruppo cerca solo lì, senza badare alle maiuscole');
  ok(E('tsPerGruppo(ensureSets().setsOrdine,{cerca:"IPERTRÒFIA  b"})[0].nomi.join()') === 'Ipertrofia B', 'gruppi/ricerca: più parole, accenti e spazi doppi');
  ok(E('tsPerGruppo(ensureSets().setsOrdine,{filtro:"__senza__"}).length') === 0, 'gruppi/filtro «Senza gruppo»: vuoto quando ogni set ha il suo gruppo');
  /* 4 · Progressi: «Dati da analizzare» è lo stesso menù; i gruppi restringono l'elenco, i dati analizzati no */
  E('tsFiltroSet("prog","Corpo libero"); progSetSet("Forza"); showTab("progressi");');
  ok(d.getElementById('prog-set').tagName === 'BUTTON' && d.getElementById('prog-set').value === 'Forza' && d.querySelector('#prog-set .tnd__val').textContent === 'Forza' && d.getElementById('prog-gruppo') === null,
     'Progressi: «Dati da analizzare» è il menù dell\'app, col set scelto');
  d.getElementById('prog-set').click();
  { const pop = d.getElementById('tnd-pop');
    ok(voci() === '__tutti__|Casa · manubri' && pop.querySelector('[data-tnd-gr].is-on').dataset.tndGr === 'Corpo libero', 'Progressi: col gruppo «Corpo libero» l\'elenco mostra «Tutto il percorso» e i suoi set');
    const agPrima = E('JSON.stringify(schedeAggr(progSetGet()))');
    pop.querySelector('[data-tnd-gr="Palestra"]').click();
    ok(E('progSetGet()') === 'Forza' && E('JSON.stringify(schedeAggr(progSetGet()))') === agPrima && d.getElementById('tnd-pop') === pop, 'Progressi: cambiare gruppo non cambia i dati analizzati (e il menù resta aperto)');
    ok(/^\d+ sett\.$/.test(pop.querySelector('[data-tnd-v="Forza"] .tnd-info').textContent) && pop.querySelector('.tnd-voce.is-sel').dataset.tndV === 'Forza', 'Progressi: spunta sul set scelto e le sue settimane salvate accanto');
    pop.querySelector('[data-tnd-gr="__tutti__"]').click();
    ok(grTit() === 'Palestra|Corpo libero' && E('tsFiltroGet("prog")') === '__tutti__', 'Progressi: con «Tutti» i set sono divisi per gruppo');
    pop.querySelector('[data-tnd-v="Casa · manubri"]').click(); }
  ok(E('progSetGet()') === 'Casa · manubri' && d.getElementById('prog-set').value === 'Casa · manubri' && d.getElementById('tnd-pop') === null, 'Progressi: scegliere un set dal menù cambia i dati da analizzare');
  E('progSetSet(' + J2(progSet0) + ')');
  /* 5 · rinomina */
  E('tsFiltroSet("pesi","Palestra")');
  ok(E('tsRinominaGruppo("Palestra","Sala pesi")') === true && E('tsGruppi().join("|")') === 'Sala pesi|Corpo libero' && E('tsGruppoDi("Forza")') === 'Sala pesi' && E('DOC.scheda.gruppo') === 'Sala pesi',
     'gruppi/rinomina: i set seguono il gruppo');
  ok(E('tsFiltroGet("pesi")') === 'Sala pesi', 'gruppi/rinomina: il filtro acceso segue il nome nuovo');
  ok(E('tsRinominaGruppo("Sala pesi","corpo LIBERO")') === false && E('tsRinominaGruppo("Sala pesi","  ")') === false && E('tsGruppi().join("|")') === 'Sala pesi|Corpo libero',
     'gruppi/rinomina: un nome già usato da un altro gruppo (o vuoto) è rifiutato');
  ok(E('tsRinominaGruppo("Corpo libero","Corpo Libero")') === true && E('tsGruppoDi("Casa · manubri")') === 'Corpo Libero', 'gruppi/rinomina: si può cambiare anche solo una maiuscola');
  /* 6 · togli */
  E('tsFiltroSet("pesi","Corpo Libero")');
  ok(E('tsTogliGruppo("Corpo Libero")') === true && E('tsGruppi().join("|")') === 'Sala pesi' && E('tsGruppoDi("Casa · manubri")') === '' && E('ensureSets().setsOrdine.length') === 5,
     'gruppi/togli: il gruppo sparisce, i suoi set restano e passano a «Senza gruppo»');
  ok(E('"gruppo" in DOC.scheda.setsSalvati["Casa · manubri"]') === false && E('tsFiltroGet("pesi")') === '__tutti__', 'gruppi/togli: nessun gruppo rimasto appeso al set; il filtro torna a «Tutti»');
  ok(E('JSON.stringify(tsPerGruppo(ensureSets().setsOrdine,{filtro:"__senza__"}))') === J2([{ gruppo: '', nomi: ['Casa · manubri'] }]), 'gruppi/filtro «Senza gruppo»: mostra i set senza gruppo');
  ok(E('__calcoli()') === calc0, 'gruppi/calcoli: identici anche dopo rinomine e rimozioni');
  /* 7 · il riquadro «Training Set e gruppi» */
  E('showTab("allenamento")');
  d.getElementById('training-set').click(); d.querySelector('#tnd-pop [data-tnd-v="__cerca__"]').click();
  ok(d.getElementById('tsm-lista') !== null && d.getElementById('training-set').value === 'Ipertrofia B', '«Gestisci i gruppi…» apre il riquadro; il set aperto non cambia');
  ok([...d.querySelectorAll('#tsm-lista .tsm-gr__tit b')].map(b => b.textContent).join('|') === 'Sala pesi|Senza gruppo' && d.querySelectorAll('#tsm-lista .tsm-riga').length === 5 &&
     d.querySelector('#tsm-lista .tsm-riga.is-att [data-tsm-apri]').dataset.tsmApri === 'Ipertrofia B', 'riquadro gruppi: un blocco per gruppo, cinque set, quello aperto segnato');
  { const ce = d.getElementById('tsm-cerca'); ce.value = 'casa'; ce.oninput();
    ok([...d.querySelectorAll('#tsm-lista .tsm-nome')].map(b => b.textContent).join('|') === 'Casa · manubri', 'riquadro gruppi: la ricerca restringe l\'elenco');
    ce.value = 'zzz'; ce.oninput();
    ok(d.querySelectorAll('#tsm-lista .tsm-riga').length === 0 && /Nessun Training Set con questo nome/.test(d.getElementById('tsm-lista').textContent), 'riquadro gruppi: ricerca senza risultati');
    ce.value = ''; ce.oninput(); }
  d.getElementById('tsm-nuovo').click(); d.getElementById('tsm-in').value = 'Corpo libero'; d.querySelector('#tsm-lista [data-tsm-ok]').click();
  ok(E('tsGruppi().join("|")') === 'Sala pesi|Corpo libero' && /Nessun Training Set in questo gruppo/.test(d.getElementById('tsm-lista').textContent), 'riquadro gruppi: «Nuovo gruppo» crea il gruppo, anche vuoto');
  { const sel = d.querySelector('#tsm-lista [data-tsm-set="Casa · manubri"]'); sel.value = 'Corpo libero'; sel.onchange(); }
  ok(E('tsGruppoDi("Casa · manubri")') === 'Corpo libero', 'riquadro gruppi: il menù della riga mette il set in un gruppo');
  { const sel = d.querySelector('#tsm-lista [data-tsm-set="Casa · manubri"]'); sel.value = '__nuovo__'; sel.onchange(); }
  d.getElementById('tsm-in').value = 'Casa'; d.querySelector('#tsm-lista [data-tsm-ok]').click();
  ok(E('tsGruppoDi("Casa · manubri")') === 'Casa' && E('tsGruppi().join("|")') === 'Sala pesi|Corpo libero|Casa', 'riquadro gruppi: «Nuovo gruppo…» nella riga crea il gruppo e ci mette il set');
  d.querySelector('#tsm-lista [data-tsm-rin="Casa"]').click(); d.getElementById('tsm-in').value = 'corpo libero'; d.querySelector('#tsm-lista [data-tsm-ok]').click();
  ok(E('tsGruppi().join("|")') === 'Sala pesi|Corpo libero|Casa' && d.getElementById('tsm-in') !== null && avvisi.includes('Esiste già un gruppo con questo nome.'), 'riquadro gruppi: rinomina con un nome già usato → avviso, niente cambia');
  d.getElementById('tsm-in').value = 'A casa'; d.querySelector('#tsm-lista [data-tsm-ok]').click();
  ok(E('tsGruppi().join("|")') === 'Sala pesi|Corpo libero|A casa' && E('tsGruppoDi("Casa · manubri")') === 'A casa', 'riquadro gruppi: «Rinomina» nella riga del gruppo');
  w.confirm = () => false; await d.querySelector('#tsm-lista [data-tsm-togli="A casa"]').onclick(); w.confirm = () => true;
  ok(E('tsGruppi().join("|")') === 'Sala pesi|Corpo libero|A casa', 'riquadro gruppi: annullando la conferma il gruppo resta');
  await d.querySelector('#tsm-lista [data-tsm-togli="Corpo libero"]').onclick();
  ok(E('tsGruppi().join("|")') === 'Sala pesi|A casa', 'riquadro gruppi: «Togli il gruppo» dopo la conferma');
  d.querySelector('#tsm-lista [data-tsm-apri="Forza"]').click();
  ok(E('DOC.scheda.setAttivo') === 'Forza' && d.getElementById('modal-bk').classList.contains('hidden'), 'riquadro gruppi: un clic sul nome apre il set e chiude il riquadro');
  E('switchTrainingSet("Ipertrofia B")');
  /* 8 · nuovo Training Set col suo gruppo */
  E('tsFiltroSet("pesi","A casa"); nuovoTrainingSetModal();');
  ok(d.getElementById('ts-gr').value === 'A casa', 'nuovo Training Set: propone il gruppo filtrato nella barra');
  d.getElementById('ts-nome').value = 'Elastici'; d.getElementById('ts-src').value = '__vuota__'; d.getElementById('ts-src').onchange();
  d.getElementById('ts-gr').value = '__nuovo__'; d.getElementById('ts-gr').onchange();
  ok(d.getElementById('ts-gr-nuovo').hidden === false, 'nuovo Training Set: «Nuovo gruppo…» apre la casella del nome');
  d.getElementById('ts-gr-nuovo').value = 'Senza attrezzi'; d.getElementById('ts-ok').click();
  ok(E('DOC.scheda.setAttivo') === 'Elastici' && E('DOC.scheda.gruppo') === 'Senza attrezzi' && E('tsGruppi().join("|")') === 'Sala pesi|A casa|Senza attrezzi', 'nuovo Training Set: creato nel gruppo nuovo');
  E('tsFiltroSet("pesi","__tutti__"); nuovoTrainingSetModal();');
  d.getElementById('ts-nome').value = 'Forza 2'; d.getElementById('ts-src').value = 'Forza'; d.getElementById('ts-src').onchange();
  ok(d.getElementById('ts-gr').value === 'Sala pesi', 'nuovo Training Set: copiando un set propone il suo gruppo');
  d.getElementById('ts-ok').click();
  ok(E('DOC.scheda.setAttivo') === 'Forza 2' && E('DOC.scheda.gruppo') === 'Sala pesi' && E('DOC.scheda.setsSalvati.Elastici.gruppo') === 'Senza attrezzi', 'nuovo Training Set: la copia entra nel gruppo dell\'originale');
  E('creaTrainingSet("Vuoto","__vuota__")');
  ok(E('"gruppo" in DOC.scheda') === false, 'nuovo Training Set: senza indicazioni, una scheda vuota nasce «Senza gruppo»');
  /* 9 · riepilogo del profilo */
  E('showTab("profilo")');
  ok(/Sala pesi: Ipertrofia A, Forza, Powerlifting, Ipertrofia B, Forza 2/.test(d.getElementById('panel-profilo').textContent) && /Senza gruppo: Vuoto/.test(d.getElementById('panel-profilo').textContent),
     'riepilogo del profilo: i Training Set divisi per gruppo');
  ok(errors.length === 0, 'gruppi: nessun errore runtime' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  dom.window.close();
}

console.log('');
console.log('RISULTATO: ' + pass + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERRORE TEST:', e); process.exit(2); });
