/* ════════════════ PERSISTENZA (FSA + IndexedDB, concetto todo.html) ════════════════ */
const SUBDIR='TMS_Dati';
const EXPECTED_DIR='TMS';  /* nome cartella suggerita nei testi del gate di connessione (browser) */
const FILES={scheda:'scheda.json',storico:'storico.json',corpo:'corpo.json',alimentazione:'alimentazione.json',esercizi:'esercizi.json',profili:'profili.json'};
const IDB_NAME='tms-store', IDB_STORE='handles', IDB_KEY='dirHandle';
const CACHE_KEY='tms-doc';
const HAS_FSA=typeof window.showDirectoryPicker==='function';
let dirHandle=null, dataDir=null, profileDir=null, saveTimer=null, suppressSave=false, pendingSaves=new Set();
let profili=[], activeProfile='';
/* Profilo creato quando non ne esiste nessuno (primo avvio su una cartella vuota): è il
   profilo DIMOSTRATIVO, coi dati di esempio incorporati nell'app (SEED = «Atleta Template»,
   lo stesso dell'installer). Fino alla v1.1.15 si chiamava «Wander» e portava lo storico
   personale dell'autore. */
const PROFILO_DEMO={slug:'template', nome:'Atleta Template'};
/* vero finché l'elenco profili è solo il ripiego messo all'avvio (nessun profilo vero
   letto da cache o disco): in quel caso connectFlow può ancora decidere chi è il primo profilo */
let profiliDiRipiego=false;
function profiloDemo(){ return {slug:PROFILO_DEMO.slug, nome:PROFILO_DEMO.nome, creato:new Date().toISOString().slice(0,10)}; }
function pslug(n){ return String(n||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,32)||'profilo'; }
function profNome(){ const p=profili.find(x=>x.slug===activeProfile); return p?p.nome:''; }
/* il tab "Profilo" mostra il nome del profilo attivo (richiesta Marco, v1.0.66) */
function aggiornaTabProfilo(){ const b=document.querySelector('.tab[data-tab="profilo"]'); if(b) b.innerHTML='<span class="ico">👤</span> '+esc(profNome()||t('Profilo')); }

function idbOpen(){return new Promise((res,rej)=>{const r=indexedDB.open(IDB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(IDB_STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});}
async function idbSet(k,v){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).put(v,k);tx.oncomplete=()=>{db.close();res()};tx.onerror=()=>{db.close();rej(tx.error)}});}
async function idbGet(k){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,'readonly');const rq=tx.objectStore(IDB_STORE).get(k);rq.onsuccess=()=>{db.close();res(rq.result)};rq.onerror=()=>{db.close();rej(rq.error)}});}
async function idbDel(k){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).delete(k);tx.oncomplete=()=>{db.close();res()};tx.onerror=()=>{db.close();rej(tx.error)}});}

function setConn(state,txt){
  const el=document.getElementById('conn'); el.className='conn'+(state?(' is-'+state):'');
  el.style.display=(state==='on')?'none':'';  /* connesso = nessun indicatore; visibile solo per gli stati utili (busy/errore/non connesso) */
  document.getElementById('conn-txt').textContent=txt;
}

/* dati del profilo attivo (scheda/storico/corpo/alimentazione); esercizi è condiviso */
function docProfileData(){ return {scheda:DOC.scheda,storico:DOC.storico,storico_io:DOC.storico_io,storico_rpe:DOC.storico_rpe,storico_risc:DOC.storico_risc,cardio:DOC.cardio,foto:DOC.foto,dati_utente:DOC.dati_utente,alimentazione:DOC.alimentazione}; }
function applyProfileData(d){ d=d||{}; DOC.scheda=d.scheda||{settimanale:[],mensile:[]}; DOC.storico=d.storico||[]; DOC.storico_io=d.storico_io||[]; DOC.storico_rpe=d.storico_rpe||[]; DOC.storico_risc=d.storico_risc||[]; DOC.cardio=d.cardio||[]; DOC.foto=d.foto||[]; DOC.dati_utente=d.dati_utente||{}; DOC.alimentazione=d.alimentazione||{bulk:[],mant:[],cut:[]}; }
function blankDOC(){ return {scheda:{settimanale:[],mensile:[]},storico:[],storico_io:[],storico_rpe:[],storico_risc:[],cardio:[],foto:[],dati_utente:{},alimentazione:{bulk:[],mant:[],cut:[]}}; }

function saveCache(){ try{
  const all=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}'); const data=all.data||{};
  if(activeProfile) data[activeProfile]=docProfileData();
  localStorage.setItem(CACHE_KEY,JSON.stringify({esercizi:DOC.esercizi,profili:profili,active:activeProfile,data:data}));
}catch(e){} }
function loadCache(){ try{
  let _raw=localStorage.getItem(CACHE_KEY);
  if(_raw==null){ try{ const _legacy=localStorage.getItem('tms-erdtree-doc'); if(_legacy!=null){ _raw=_legacy; localStorage.setItem(CACHE_KEY,_legacy); } }catch(e){} }
  const r=JSON.parse(_raw||'null'); if(!r)return false;
  if(r.esercizi&&r.esercizi.length) DOC.esercizi=r.esercizi;
  if(r.profili&&r.profili.length){ profili=r.profili; activeProfile=r.active||r.profili[0].slug; if(r.data&&r.data[activeProfile]) applyProfileData(r.data[activeProfile]); }
  else if(r.scheda||r.storico){ applyProfileData(r); }  /* retro-compat vecchia cache piatta */
  return true;
}catch(e){ return false; } }

async function readJson(dh,f){try{const fh=await dh.getFileHandle(f);return JSON.parse(await(await fh.getFile()).text());}catch(e){return null;}}
/* ── LETTURA RIGOROSA (2026-11-11) ───────────────────────────────────────────────
   readJson risponde null sia quando il file NON C'È sia quando c'è ma non si legge
   (JSON rovinato, file vuoto, disco o antivirus che lo tengono bloccato). Per i file
   che contano la differenza è tutto: «non c'è» vuol dire profilo nuovo, «non si legge»
   vuol dire che i dati ESISTONO e vanno lasciati stare. Prima i due casi finivano nello
   stesso ramo, e al primo salvataggio uno storico illeggibile veniva riscritto vuoto.
   Qui si distingue: stato 'ok' | 'assente' | 'illeggibile'. */
async function leggiJson(dh,f){
  let fh; try{ fh=await dh.getFileHandle(f); }
  catch(e){ return {dati:null, stato:(e&&e.name==='NotFoundError')?'assente':'illeggibile', errore:e}; }
  let testo=''; try{ testo=await(await fh.getFile()).text(); }
  catch(e){ return {dati:null, stato:'illeggibile', errore:e}; }
  try{ return {dati:JSON.parse(testo), stato:'ok'}; }
  catch(e){ return {dati:null, stato:'illeggibile', errore:e}; }
}
/* errore «dati illeggibili»: chi lo riceve NON deve scrivere nulla */
function erroreIlleggibile(dove, r){
  const e=new Error((r&&r.errore&&r.errore.message)||'illeggibile'); e.name='DatiIlleggibili'; e.file=dove; return e; }
/* i dati di un profilo letti in modo rigoroso; lancia DatiIlleggibili al primo file rotto */
async function leggiProfiloRigoroso(pd, etichetta){
  const out={}; let assenti=0;
  for(const k of ['scheda','storico','corpo','alimentazione']){
    const r=await leggiJson(pd,FILES[k]);
    if(r.stato==='illeggibile') throw erroreIlleggibile((etichetta?etichetta+'/':'')+FILES[k], r);
    if(r.stato==='assente') assenti++;
    out[k]=r.dati;
  }
  out.assenti=assenti; return out;
}
/* ── BLOCCO DELLE SCRITTURE ──────────────────────────────────────────────────────
   Quando un file dei dati non si legge l'app smette di salvare finché la cosa non è
   risolta: qualunque scrittura partirebbe da uno stato incompleto e lo renderebbe
   definitivo. Si esce dal blocco riavviando (se il file torna leggibile) o ripristinando
   un backup. Il file rotto non viene mai toccato. */
let scrittureBloccate=null;   /* null = tutto regolare; altrimenti {file, msg} */
function bloccaScritture(e){
  scrittureBloccate={file:(e&&e.file)||'?', msg:(e&&e.message)||''};
  clearTimeout(saveTimer); pendingSaves.clear();
  setConn('err', t('dati illeggibili — salvataggio sospeso'));
  logErrore('datiIlleggibili:'+scrittureBloccate.file, e);
  try{ mostraBloccoScritture(); }catch(_){}
}
function sbloccaScritture(){ scrittureBloccate=null; }
function mostraBloccoScritture(){
  if(!scrittureBloccate) return;
  modal(`<h3>⚠ ${t('Un file dei dati non si legge')}</h3>
   <div class="callout callout--ember" style="margin-top:6px"><div>${t('Non riesco a leggere')} <b class="mono">${esc(scrittureBloccate.file)}</b>. ${t('Per non rovinare nulla ho <b>sospeso il salvataggio</b>: quello che vedi ora può essere incompleto e le modifiche di questa sessione non vengono scritte.')}</div></div>
   <div style="font-size:13px;line-height:1.55;margin-top:8px">${t('Cosa fare, in ordine:')}<br>1. ${t('<b>Chiudi e riapri</b> l’app: se il file era solo occupato da un altro programma (antivirus, sincronizzazione) torna tutto a posto da solo.')}<br>2. ${t('Se succede di nuovo, dal tab <b>Profilo</b> ripristina un <b>backup automatico</b>: il file rotto resta dov’è, non viene cancellato.')}</div>
   <div class="modal__actions"><button class="btn btn--ember" onclick="closeModal()">${t('Ho capito')}</button></div>`);
  const m=document.getElementById('modal'); if(m) m.style.maxWidth='560px';
}
async function writeJson(dh,f,obj){const fh=await dh.getFileHandle(f,{create:true});const w=await fh.createWritable();await w.write(JSON.stringify(obj,null,2));await w.close();}

/* ── Desktop (Electron): dati locali via ponte window.tmsFS ──
   Stessa interfaccia degli handle File System Access usata dall'app: tutto il
   resto del codice (connectFlow, readJson/writeJson, video, persistAll) resta identico. */
/* MIME dal nome file: senza, i video letti dal ponte diventavano File senza tipo e i
   data-URI/blob risultavano NON riproducibili (segnalato da Marco sulla scheda cliente) */
function mimeDi(n){ n=String(n||'').toLowerCase();
  if(n.endsWith('.mp4')) return 'video/mp4';
  if(n.endsWith('.webm')) return 'video/webm';
  if(n.endsWith('.json')) return 'application/json';
  if(n.endsWith('.png')) return 'image/png';
  if(n.endsWith('.jpg')||n.endsWith('.jpeg')) return 'image/jpeg';
  if(n.endsWith('.webp')) return 'image/webp';
  if(n.endsWith('.gif')) return 'image/gif';
  return ''; }
function localDirHandle(rel){
  const P=nm=>(rel?rel+'/':'')+nm;
  return {
    _local:true, name:(rel? rel.split('/').pop() : 'TMS (dati locali)'),
    queryPermission:async()=>'granted',
    requestPermission:async()=>'granted',
    getDirectoryHandle:async(nm,opt)=>{ const p=P(nm);
      if(!(await window.tmsFS.exists(p))){
        if(opt&&opt.create){ await window.tmsFS.mkdir(p); }
        else { const e=new Error('NotFoundError: '+p); e.name='NotFoundError'; throw e; } }
      return localDirHandle(p); },
    getFileHandle:async(nm,opt)=>{ const p=P(nm);
      if(!(await window.tmsFS.exists(p)) && !(opt&&opt.create)){ const e=new Error('NotFoundError: '+p); e.name='NotFoundError'; throw e; }
      return {
        getFile:async()=>new File([await window.tmsFS.readFile(p)],nm,{type:mimeDi(nm)}),
        createWritable:async()=>{ const chunks=[]; return {
          write:async d=>{chunks.push(d);},
          close:async()=>{
            if(!chunks.some(c=>typeof c!=='string')){ await window.tmsFS.writeFile(p,chunks.join('')); return; }
            /* contenuto binario (es. video personali): normalizza a Uint8Array e concatena */
            const enc=s=>{ if(typeof TextEncoder!=='undefined') return new TextEncoder().encode(s); const a=new Uint8Array(s.length); for(let i=0;i<s.length;i++) a[i]=s.charCodeAt(i)&255; return a; };
            const parts=[];
            for(const c of chunks){
              if(typeof c==='string') parts.push(enc(c));
              else if(typeof Blob!=='undefined' && c instanceof Blob) parts.push(new Uint8Array(await c.arrayBuffer()));
              else if(c instanceof ArrayBuffer) parts.push(new Uint8Array(c));
              else parts.push(new Uint8Array(c.buffer||c));
            }
            const buf=new Uint8Array(parts.reduce((a,b)=>a+b.length,0));
            let off=0; for(const b of parts){ buf.set(b,off); off+=b.length; }
            await window.tmsFS.writeFile(p,buf);
          } }; } }; },
    removeEntry:async(nm)=>{ await window.tmsFS.remove(P(nm)); },
    /* sposta una sottocartella dentro _eliminati/ (solo desktop): niente viene distrutto */
    cestina:async(nm)=>{ if(typeof window.tmsFS.cestina!=='function') throw new Error('cestino non disponibile'); return await window.tmsFS.cestina(P(nm)); }
  };
}

async function pickDirectory(){
  if(!HAS_FSA){ gateShow('unsupported'); return; }
  try{
    const dh=await window.showDirectoryPicker({mode:'readwrite',startIn:'documents'});
    dirHandle=dh; await idbSet(IDB_KEY,dh);
    gateHide();
    await connectFlow();
  }catch(e){ if(e.name==='AbortError'){ if(window.tmsFS && dirHandle) gateHide(); } else gateErr('Errore: '+e.message); }
}
async function loadProfile(){
  /* lettura rigorosa: un file illeggibile interrompe il caricamento PRIMA di qualunque
     scrittura (l'errore risale a connectFlow/switchProfile, che bloccano il salvataggio) */
  const L=await leggiProfiloRigoroso(profileDir, activeProfile);
  const sc=L.scheda, st=L.storico, co=L.corpo, al=L.alimentazione;
  applyProfileData({scheda:sc, storico:st, storico_io:co&&co.storico_io, storico_rpe:co&&co.storico_rpe, storico_risc:co&&co.storico_risc, cardio:co&&co.cardio, foto:co&&co.foto, dati_utente:co&&co.dati_utente, alimentazione:al});
  const preMig=JSON.stringify(DOC.storico);
  const preMigScheda=JSON.stringify(DOC.scheda);
  const migged=!!(migrateStorico()|migrateScheda()|migrateExNames()|migrateCardio()); normalizeAlim();
  if(migged){ try{ await writeJson(profileDir,'storico.backup.json',{_backup:new Date().toISOString(),storico:JSON.parse(preMig),scheda:JSON.parse(preMigScheda)}); }catch(e){} }
  if(!sc||!st||!co||!al||migged) await persistAll();
}

async function connectFlow(){
  setConn('busy',t('connessione…'));
  try{
    const perm=await dirHandle.requestPermission({mode:'readwrite'});
    if(perm!=='granted'){ setConn('err',t('permesso negato')); return; }
    dataDir=await dirHandle.getDirectoryHandle(SUBDIR,{create:true});
    /* catalogo esercizi (condiviso tra i profili) */
    sbloccaScritture();
    const exR=await leggiJson(dataDir,FILES.esercizi);
    if(exR.stato==='illeggibile') throw erroreIlleggibile(FILES.esercizi, exR);
    const ex=exR.dati;
    if(ex&&ex.length) DOC.esercizi=ex;
    if(!Array.isArray(DOC.esercizi)||!DOC.esercizi.length)
      DOC.esercizi=REF.esercizi.filter(e=>!isVariante(e.nome)).map(e=>Object.assign({},e,{nome:String(e.nome).trim()}));
    rebuildEs();
    /* profili */
    const pjR=await leggiJson(dataDir,FILES.profili);
    if(pjR.stato==='illeggibile') throw erroreIlleggibile(FILES.profili, pjR);
    const pj=pjR.dati;
    if(pj&&pj.list&&pj.list.length){
      profili=pj.list; activeProfile=pj.active||pj.list[0].slug; profiliDiRipiego=false;
      profileDir=await dataDir.getDirectoryHandle(activeProfile,{create:true});
      await loadProfile();
      /* cleanup: rimuovi eventuali file flat legacy rimasti nella root TMS_Dati */
      for(const fn of [FILES.scheda,FILES.storico,FILES.corpo,FILES.alimentazione]){ try{ await dataDir.removeEntry(fn); }catch(e){} }
    } else {
      /* nessun profili.json: profilo dimostrativo (dati di esempio incorporati), oppure —
         cartelle di versioni molto vecchie — i file «piatti» nella radice, che sono dati
         VERI di qualcuno: quelli diventano un profilo col nome della loro anagrafica, non
         il dimostrativo */
      const LL=await leggiProfiloRigoroso(dataDir, '');
      const lsc=LL.scheda, lst=LL.storico, lco=LL.corpo, lal=LL.alimentazione;
      if(!profili.length||profiliDiRipiego){
        if(lsc||lst||lco||lal){ const nm=String((lco&&lco.dati_utente&&lco.dati_utente.nome)||'').trim()||'Profilo';
          profili=[{slug:pslug(nm), nome:nm, creato:new Date().toISOString().slice(0,10)}]; }
        else profili=[profiloDemo()];
      }
      profiliDiRipiego=false;
      activeProfile=(profili[0]&&profili[0].slug)||PROFILO_DEMO.slug;
      if(lsc||lst||lco||lal){ applyProfileData({scheda:lsc,storico:lst,storico_io:lco&&lco.storico_io,storico_rpe:lco&&lco.storico_rpe,storico_risc:lco&&lco.storico_risc,cardio:lco&&lco.cardio,foto:lco&&lco.foto,dati_utente:lco&&lco.dati_utente,alimentazione:lal}); }
      migrateStorico(); migrateScheda(); migrateExNames(); normalizeAlim();
      profileDir=await dataDir.getDirectoryHandle(activeProfile,{create:true});
      /* manca solo l'elenco dei profili ma la cartella del profilo ha già i suoi file:
         si CARICANO quelli, non ci si scrive sopra con ciò che c'è in memoria */
      const giaLi=await leggiProfiloRigoroso(profileDir, activeProfile);
      if(giaLi.assenti<4 && !(lsc||lst||lco||lal)){ await loadProfile(); await writeJson(dataDir,FILES.profili,{list:profili,active:activeProfile}); }
      else await persistAll();
      for(const fn of [FILES.scheda,FILES.storico,FILES.corpo,FILES.alimentazione]){ try{ await dataDir.removeEntry(fn); }catch(e){} }
    }
    saveCache();
    setConn('on', '');
    document.getElementById('btn-connect').style.display='none';
    aggiornaTabProfilo();
    renderAll();
    backupAutomaticoSeServe();  /* fire-and-forget: uno snapshot a settimana, non blocca l'avvio */
  }catch(e){
    if(e&&e.name==='DatiIlleggibili'){ bloccaScritture(e); aggiornaTabProfilo(); try{ renderAll(); }catch(_){} return; }
    setConn('err',t('errore: ')+e.message); logErrore('connectFlow', e); }
}

async function persistAll(){
  if(!dataDir||scrittureBloccate)return;
  if(profileDir){
    await writeJson(profileDir,FILES.scheda,DOC.scheda);
    await writeJson(profileDir,FILES.storico,DOC.storico);
    await writeJson(profileDir,FILES.corpo,{dati_utente:DOC.dati_utente,storico_io:DOC.storico_io,storico_rpe:DOC.storico_rpe,storico_risc:DOC.storico_risc,cardio:DOC.cardio,foto:DOC.foto});
    await writeJson(profileDir,FILES.alimentazione,DOC.alimentazione);
  }
  await writeJson(dataDir,FILES.esercizi,DOC.esercizi);
  await writeJson(dataDir,FILES.profili,{list:profili,active:activeProfile});
}
async function flushSaves(){
  const keys=[...pendingSaves]; pendingSaves.clear();
  if(scrittureBloccate) return;
  if(keys.includes('*')) { await persistAll(); return; }
  for(const which of keys){
    if(which==='scheda'&&profileDir) await writeJson(profileDir,FILES.scheda,DOC.scheda);
    else if(which==='storico'&&profileDir) await writeJson(profileDir,FILES.storico,DOC.storico);
    else if(which==='corpo'&&profileDir) await writeJson(profileDir,FILES.corpo,{dati_utente:DOC.dati_utente,storico_io:DOC.storico_io,storico_rpe:DOC.storico_rpe,storico_risc:DOC.storico_risc,cardio:DOC.cardio,foto:DOC.foto});
    else if(which==='alimentazione'&&profileDir) await writeJson(profileDir,FILES.alimentazione,DOC.alimentazione);
    else if(which==='esercizi') await writeJson(dataDir,FILES.esercizi,DOC.esercizi);
    else if(which==='profili') await writeJson(dataDir,FILES.profili,{list:profili,active:activeProfile});
    else await persistAll();
  }
}
/* ── CHIUSURA DELLA FINESTRA (desktop) ───────────────────────────────────────────
   Il salvataggio aspetta 350 ms dall'ultimo tasto: chiudendo l'app in quell'istante
   l'ultima modifica restava solo nella cache e al riavvio veniva coperta dal disco.
   Qui le scritture in attesa partono SUBITO, senza await: il messaggio al processo
   principale viene spedito prima che la pagina muoia, ed è lui a completare la scrittura
   (atomica). Solo desktop: nel browser una scrittura su cartella non parte in chiusura. */
function scaricaSubito(){
  try{
    if(!window.tmsFS||!dataDir||!dataDir._local||scrittureBloccate||!pendingSaves.size) return 0;
    clearTimeout(saveTimer); const keys=[...pendingSaves]; pendingSaves.clear();
    const tutto=keys.some(k=>['scheda','storico','corpo','alimentazione','esercizi','profili'].indexOf(k)<0);
    const vuole=k=>tutto||keys.indexOf(k)>=0;
    const W=(rel,obj)=>{ try{ const p=window.tmsFS.writeFile(rel, JSON.stringify(obj,null,2)); if(p&&p.catch) p.catch(()=>{}); n++; }catch(e){} };
    let n=0; const base=SUBDIR+'/', pb=base+activeProfile+'/';
    if(profileDir&&activeProfile){
      if(vuole('scheda')) W(pb+FILES.scheda, DOC.scheda);
      if(vuole('storico')) W(pb+FILES.storico, DOC.storico);
      if(vuole('corpo')) W(pb+FILES.corpo, {dati_utente:DOC.dati_utente,storico_io:DOC.storico_io,storico_rpe:DOC.storico_rpe,storico_risc:DOC.storico_risc,cardio:DOC.cardio,foto:DOC.foto});
      if(vuole('alimentazione')) W(pb+FILES.alimentazione, DOC.alimentazione);
    }
    if(vuole('esercizi')) W(base+FILES.esercizi, DOC.esercizi);
    if(vuole('profili')) W(base+FILES.profili, {list:profili,active:activeProfile});
    return n;
  }catch(e){ return 0; }
}
function persist(which){
  if(scrittureBloccate) return;   /* niente cache né disco: lo stato in memoria può essere incompleto */
  saveCache();
  if(suppressSave) return;
  if(!dataDir) return;
  pendingSaves.add(which);
  clearTimeout(saveTimer);
  saveTimer=setTimeout(async()=>{
    try{ await flushSaves(); setConn('on', ''); }
    catch(e){ setConn('err',t('errore scrittura')); logErrore('salvataggio', e); }
  },350);
}

/* ── PROFILI (ops) ── */
async function switchProfile(slug){
  if(!profili.some(p=>p.slug===slug)) return;
  cruscottoInvalida();  /* il set di dati per-profilo è cambiato: il cruscotto va ricalcolato */
  if(slug!==activeProfile){
    if(scrittureBloccate){ mostraBloccoScritture(); return; }
    /* un salvataggio ancora in attesa (debounce) scatterebbe DURANTE il cambio, quando la
       cartella è già quella nuova ma i dati in memoria sono ancora del profilo vecchio:
       si chiude tutto prima, con una scrittura completa, e si azzera la coda */
    clearTimeout(saveTimer); pendingSaves.clear();
    if(dataDir&&profileDir){ try{ await persistAll(); }catch(e){ logErrore('switchProfile/salva', e); } }
    saveCache();
    if(dataDir){
      /* si legge il profilo di arrivo PRIMA di toccare lo stato: se un suo file non si
         legge si resta sul profilo corrente, senza scrivere nulla */
      const nuovaDir=await dataDir.getDirectoryHandle(slug,{create:true});
      let L; try{ L=await leggiProfiloRigoroso(nuovaDir, slug); }
      catch(e){ if(e&&e.name==='DatiIlleggibili'){
          logErrore('switchProfile:'+e.file, e);
          avvisa(t('Profilo non apribile'), t('Non riesco a leggere')+' <b class="mono">'+esc(e.file)+'</b>. '+t('Resto sul profilo attuale e non tocco nulla. Riprova fra poco; se continua, ripristina un backup automatico dal tab Profilo.'));
          return; }
        throw e; }
      activeProfile=slug; profileDir=nuovaDir;
      if(L.assenti<4){ await loadProfile(); } else { applyProfileData(blankDOC()); await persistAll(); }
      try{ await writeJson(dataDir,FILES.profili,{list:profili,active:activeProfile}); }catch(e){}
    } else {
      activeProfile=slug;
      const all=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}'); applyProfileData((all.data&&all.data[slug])||blankDOC());
    }
    saveCache();
    setConn(dataDir?'on':'', dataDir?'':t('non connesso'));
  }
  aggiornaTabProfilo();
  renderAll(); showTab('profilo');
}
async function createProfile(nome){
  let s=pslug(nome), base=s, i=2; while(profili.some(p=>p.slug===s)) s=base+'-'+(i++);
  profili.push({slug:s,nome:nome,creato:new Date().toISOString().slice(0,10)});
  if(dataDir){ try{ await writeJson(dataDir,FILES.profili,{list:profili,active:activeProfile}); }catch(e){} }
  saveCache();
  await switchProfile(s);
}
async function deleteProfile(slug){
  if(profili.length<=1){ alert(t('Deve restare almeno un profilo.')); return; }
  const p=profili.find(x=>x.slug===slug); if(!p) return;
  if(!confirm(t('Eliminare il profilo «')+p.nome+t('» e TUTTI i suoi dati? Operazione irreversibile.'))) return;
  if(scrittureBloccate){ mostraBloccoScritture(); return; }
  profili=profili.filter(x=>x.slug!==slug);
  if(dataDir){
    /* La cartella del profilo deve sparire davvero: se resta, un profilo nuovo con lo
       stesso nome ne eredita i dati (succedeva su desktop, dove la rimozione di una
       cartella non vuota falliva in silenzio). Su desktop non si distrugge nulla: la
       cartella passa in TMS_Dati/_eliminati/, da dove si può recuperare a mano. Nel
       browser, dove lo spostamento non esiste, si elimina come prima. */
    let tolta=false;
    if(typeof dataDir.cestina==='function'){ try{ await dataDir.cestina(slug); tolta=true; }catch(e){ logErrore('eliminaProfilo/cestino', e); } }
    if(!tolta){ try{ await dataDir.removeEntry(slug,{recursive:true}); }catch(e){ logErrore('eliminaProfilo', e); } }
    try{ await writeJson(dataDir,FILES.profili,{list:profili,active:activeProfile}); }catch(e){} }
  try{ const all=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}'); if(all.data){ delete all.data[slug]; localStorage.setItem(CACHE_KEY,JSON.stringify(all)); } }catch(e){}
  if(activeProfile===slug){ await switchProfile(profili[0].slug); } else { saveCache(); renderProfilo(); }
}
/* dati_utente di un profilo qualsiasi (per il pannello Profilo): mancava — bug trovato
   dal lint v1.0.72, espandere un profilo non attivo restava su "Caricamento parametri…" */
async function getProfileData(slug){
  if(slug===activeProfile) return {dati_utente:DOC.dati_utente||{}};
  if(dataDir){
    const pd=await dataDir.getDirectoryHandle(slug,{create:false});
    const co=await readJson(pd,FILES.corpo);
    return {dati_utente:(co&&co.dati_utente)||{}};
  }
  let all={}; try{ all=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}'); }catch(e){}
  return {dati_utente:(((all.data||{})[slug])||{}).dati_utente||{}};
}
function renameProfile(slug){
  const p=profili.find(x=>x.slug===slug); if(!p) return;
  chiediTesto(t('Rinomina profilo'), p.nome, v=>{
    const n=(v||'').trim(); if(!n) return;
    p.nome=n; persist('profili'); saveCache(); aggiornaTabProfilo(); renderProfilo(); });
}


