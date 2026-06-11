/* ════════════════ PERSISTENZA (FSA + IndexedDB, concetto todo.html) ════════════════ */
const SUBDIR='TMS_Dati';
const EXPECTED_DIR='TMS';  /* nome cartella suggerita nei testi del gate di connessione (browser) */
const FILES={scheda:'scheda.json',storico:'storico.json',corpo:'corpo.json',alimentazione:'alimentazione.json',esercizi:'esercizi.json',profili:'profili.json'};
const IDB_NAME='tms-store', IDB_STORE='handles', IDB_KEY='dirHandle';
const CACHE_KEY='tms-doc';
const HAS_FSA=typeof window.showDirectoryPicker==='function';
let dirHandle=null, dataDir=null, profileDir=null, saveTimer=null, suppressSave=false, pendingSaves=new Set();
let profili=[], activeProfile='';
function pslug(n){ return String(n||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,32)||'profilo'; }
function profNome(){ const p=profili.find(x=>x.slug===activeProfile); return p?p.nome:''; }
/* il tab "Profilo" mostra il nome del profilo attivo (richiesta Marco, v1.0.66) */
function aggiornaTabProfilo(){ const b=document.querySelector('.tab[data-tab="profilo"]'); if(b) b.innerHTML='<span class="ico">👤</span> '+esc(profNome()||'Profilo'); }

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
function docProfileData(){ return {scheda:DOC.scheda,storico:DOC.storico,storico_io:DOC.storico_io,storico_rpe:DOC.storico_rpe,dati_utente:DOC.dati_utente,alimentazione:DOC.alimentazione}; }
function applyProfileData(d){ d=d||{}; DOC.scheda=d.scheda||{settimanale:[],mensile:[]}; DOC.storico=d.storico||[]; DOC.storico_io=d.storico_io||[]; DOC.storico_rpe=d.storico_rpe||[]; DOC.dati_utente=d.dati_utente||{}; DOC.alimentazione=d.alimentazione||{bulk:[],mant:[],cut:[]}; }
function blankDOC(){ return {scheda:{settimanale:[],mensile:[]},storico:[],storico_io:[],storico_rpe:[],dati_utente:{},alimentazione:{bulk:[],mant:[],cut:[]}}; }

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
    removeEntry:async(nm)=>{ await window.tmsFS.remove(P(nm)); }
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
  const sc=await readJson(profileDir,FILES.scheda), st=await readJson(profileDir,FILES.storico),
        co=await readJson(profileDir,FILES.corpo), al=await readJson(profileDir,FILES.alimentazione);
  applyProfileData({scheda:sc, storico:st, storico_io:co&&co.storico_io, storico_rpe:co&&co.storico_rpe, dati_utente:co&&co.dati_utente, alimentazione:al});
  const preMig=JSON.stringify(DOC.storico);
  const preMigScheda=JSON.stringify(DOC.scheda);
  const migged=!!(migrateStorico()|migrateScheda()|migrateExNames()); normalizeAlim();
  if(migged){ try{ await writeJson(profileDir,'storico.backup.json',{_backup:new Date().toISOString(),storico:JSON.parse(preMig),scheda:JSON.parse(preMigScheda)}); }catch(e){} }
  if(!sc||!st||!co||!al||migged) await persistAll();
}

async function connectFlow(){
  setConn('busy','connessione…');
  try{
    const perm=await dirHandle.requestPermission({mode:'readwrite'});
    if(perm!=='granted'){ setConn('err','permesso negato'); return; }
    dataDir=await dirHandle.getDirectoryHandle(SUBDIR,{create:true});
    /* catalogo esercizi (condiviso tra i profili) */
    const ex=await readJson(dataDir,FILES.esercizi);
    if(ex&&ex.length) DOC.esercizi=ex;
    if(!Array.isArray(DOC.esercizi)||!DOC.esercizi.length)
      DOC.esercizi=REF.esercizi.filter(e=>!isVariante(e.nome)).map(e=>Object.assign({},e,{nome:String(e.nome).trim()}));
    rebuildEs();
    /* profili */
    const pj=await readJson(dataDir,FILES.profili);
    if(pj&&pj.list&&pj.list.length){
      profili=pj.list; activeProfile=pj.active||pj.list[0].slug;
      profileDir=await dataDir.getDirectoryHandle(activeProfile,{create:true});
      await loadProfile();
      /* cleanup: rimuovi eventuali file flat legacy rimasti nella root TMS_Dati */
      for(const fn of [FILES.scheda,FILES.storico,FILES.corpo,FILES.alimentazione]){ try{ await dataDir.removeEntry(fn); }catch(e){} }
    } else {
      /* nessun profili.json: crea/usa Wander e migra i file flat legacy (o il seed corrente) */
      if(!profili.length){ profili=[{slug:'wander',nome:'Wander',creato:new Date().toISOString().slice(0,10)}]; }
      activeProfile=(profili[0]&&profili[0].slug)||'wander';
      const lsc=await readJson(dataDir,FILES.scheda), lst=await readJson(dataDir,FILES.storico),
            lco=await readJson(dataDir,FILES.corpo), lal=await readJson(dataDir,FILES.alimentazione);
      if(lsc||lst||lco||lal){ applyProfileData({scheda:lsc,storico:lst,storico_io:lco&&lco.storico_io,storico_rpe:lco&&lco.storico_rpe,dati_utente:lco&&lco.dati_utente,alimentazione:lal}); }
      migrateStorico(); migrateScheda(); migrateExNames(); normalizeAlim();
      profileDir=await dataDir.getDirectoryHandle(activeProfile,{create:true});
      await persistAll();
      for(const fn of [FILES.scheda,FILES.storico,FILES.corpo,FILES.alimentazione]){ try{ await dataDir.removeEntry(fn); }catch(e){} }
    }
    saveCache();
    setConn('on', '');
    document.getElementById('btn-connect').style.display='none';
    aggiornaTabProfilo();
    renderAll();
  }catch(e){ setConn('err','errore: '+e.message); }
}

async function persistAll(){
  if(!dataDir)return;
  if(profileDir){
    await writeJson(profileDir,FILES.scheda,DOC.scheda);
    await writeJson(profileDir,FILES.storico,DOC.storico);
    await writeJson(profileDir,FILES.corpo,{dati_utente:DOC.dati_utente,storico_io:DOC.storico_io,storico_rpe:DOC.storico_rpe});
    await writeJson(profileDir,FILES.alimentazione,DOC.alimentazione);
  }
  await writeJson(dataDir,FILES.esercizi,DOC.esercizi);
  await writeJson(dataDir,FILES.profili,{list:profili,active:activeProfile});
}
async function flushSaves(){
  const keys=[...pendingSaves]; pendingSaves.clear();
  if(keys.includes('*')) { await persistAll(); return; }
  for(const which of keys){
    if(which==='scheda'&&profileDir) await writeJson(profileDir,FILES.scheda,DOC.scheda);
    else if(which==='storico'&&profileDir) await writeJson(profileDir,FILES.storico,DOC.storico);
    else if(which==='corpo'&&profileDir) await writeJson(profileDir,FILES.corpo,{dati_utente:DOC.dati_utente,storico_io:DOC.storico_io,storico_rpe:DOC.storico_rpe});
    else if(which==='alimentazione'&&profileDir) await writeJson(profileDir,FILES.alimentazione,DOC.alimentazione);
    else if(which==='esercizi') await writeJson(dataDir,FILES.esercizi,DOC.esercizi);
    else if(which==='profili') await writeJson(dataDir,FILES.profili,{list:profili,active:activeProfile});
    else await persistAll();
  }
}
function persist(which){
  saveCache();
  if(suppressSave) return;
  if(!dataDir) return;
  pendingSaves.add(which);
  clearTimeout(saveTimer);
  saveTimer=setTimeout(async()=>{
    try{ await flushSaves(); setConn('on', ''); }
    catch(e){ setConn('err','errore scrittura'); }
  },350);
}

/* ── PROFILI (ops) ── */
async function switchProfile(slug){
  if(!profili.some(p=>p.slug===slug)) return;
  if(slug!==activeProfile){
    if(dataDir&&profileDir){ try{ await persistAll(); }catch(e){} }
    saveCache();
    activeProfile=slug;
    if(dataDir){
      profileDir=await dataDir.getDirectoryHandle(slug,{create:true});
      const sc=await readJson(profileDir,FILES.scheda);
      if(sc){ await loadProfile(); } else { applyProfileData(blankDOC()); await persistAll(); }
      try{ await writeJson(dataDir,FILES.profili,{list:profili,active:activeProfile}); }catch(e){}
    } else {
      const all=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}'); applyProfileData((all.data&&all.data[slug])||blankDOC());
    }
    saveCache();
    setConn(dataDir?'on':'', dataDir?'':'non connesso');
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
  if(profili.length<=1){ alert('Deve restare almeno un profilo.'); return; }
  const p=profili.find(x=>x.slug===slug); if(!p) return;
  if(!confirm('Eliminare il profilo «'+p.nome+'» e TUTTI i suoi dati? Operazione irreversibile.')) return;
  profili=profili.filter(x=>x.slug!==slug);
  if(dataDir){ try{ await dataDir.removeEntry(slug,{recursive:true}); }catch(e){} try{ await writeJson(dataDir,FILES.profili,{list:profili,active:activeProfile}); }catch(e){} }
  try{ const all=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}'); if(all.data){ delete all.data[slug]; localStorage.setItem(CACHE_KEY,JSON.stringify(all)); } }catch(e){}
  if(activeProfile===slug){ await switchProfile(profili[0].slug); } else { saveCache(); renderProfilo(); }
}
function renameProfile(slug){
  const p=profili.find(x=>x.slug===slug); if(!p) return;
  chiediTesto('Rinomina profilo', p.nome, v=>{
    const n=(v||'').trim(); if(!n) return;
    p.nome=n; persist('profili'); saveCache(); aggiornaTabProfilo(); renderProfilo(); });
}


