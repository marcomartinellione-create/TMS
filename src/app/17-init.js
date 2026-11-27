/* ════════════════ TABS / INIT ════════════════ */
let curTab='allenamento';
const RENDERERS={profilo:renderProfilo,allenamento:renderAllenamento,cardio:renderCardio,storico:renderStorico,progressi:renderProgressi,corpo:renderCorpo,storicocorpo:renderStoricoCorpo,alimentazione:renderAlimentazione,analisi:renderAnalisi,esercizi:renderEsercizi,report:renderReport,guida:renderGuida};
function showTab(t){
  curTab=t;
  /* Storico e Misure si aprono dal Profilo: mentre li guardi resta acceso quel tab */
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('is-active',b.dataset.tab===t||(b.dataset.tab==='profilo'&&(t==='storico'||t==='storicocorpo'))));
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('is-active',p.id==='panel-'+t));
  RENDERERS[t](); updateStatusDots();
}
function renderAll(){ RENDERERS[curTab](); }
function fillDatalists(){
  document.getElementById('dl-esercizi').innerHTML=EX_BASE.map(e=>`<option value="${esc(e.nome)}">`).join('');
  document.getElementById('dl-alimenti').innerHTML=FOOD.map(f=>`<option value="${esc(f.nome)}">`).join('');
}
async function migrateLegacyStore(){
  /* porta l'handle cartella dal vecchio DB IndexedDB 'tms-erdtree' al nuovo, senza riconnessione */
  try{
    if(typeof indexedDB==='undefined') return;
    const cur=await idbGet(IDB_KEY); if(cur) return;
    const old=await new Promise(res=>{ let r; try{ r=indexedDB.open('tms-erdtree',1); }catch(e){ return res(null); }
      r.onupgradeneeded=()=>{ try{ if(!r.result.objectStoreNames.contains('handles')) r.result.createObjectStore('handles'); }catch(e){} };
      r.onsuccess=()=>res(r.result); r.onerror=()=>res(null); r.onblocked=()=>res(null); });
    if(!old) return;
    try{ if(old.objectStoreNames.contains('handles')){
      const h=await new Promise((res,rej)=>{ const tx=old.transaction('handles','readonly'); const rq=tx.objectStore('handles').get('dirHandle'); rq.onsuccess=()=>res(rq.result); rq.onerror=()=>rej(rq.error); });
      if(h) await idbSet(IDB_KEY,h);
    } }catch(e){}
    try{ old.close(); }catch(e){}
  }catch(e){}
}
async function init(){
  /* aggiornamenti dal wrapper desktop (modali in stile app). In ascolto PER PRIMA COSA, poi si
     chiede al processo principale di ripetere l'avviso: il controllo nella cartella release è
     così rapido che, ascoltando più tardi, l'avviso andava perso. */
  if(window.tmsUpdate && window.tmsUpdate.onEvento){
    window.tmsUpdate.onEvento(d=>{ try{
      if(d && d.tipo==='disponibile') modalAggiornamento(d);
      else if(d && d.tipo==='pronto') modalRiavvio(d);
      else if(d && d.tipo==='progresso') barraProgresso(d.frazione);
    }catch(e){ logErrore('modalUpdate', e); } });
    try{ window.tmsUpdate.rispondi('chiedi'); }catch(e){}
  }
  /* un file .tms aperto col doppio clic (app per PC): si importa appena i dati sono pronti */
  if(window.tmsFile && window.tmsFile.onApri){ window.tmsFile.onApri(f=>{ pacchettoDaFile(f).catch(e=>logErrore('pacchetto/doppio-clic', e)); }); try{ window.tmsFile.chiedi(); }catch(e){} }
  /* ogni render di pagina passa da conColonne (scorrimento delle colonne conservato, altezza
     riadattata). Si sostituisce anche il nome globale, perché i render si chiamano fra loro per nome. */
  Object.keys(RENDERERS).forEach(k=>{ const orig=RENDERERS[k], nome=orig.name, col=conColonne(k, orig);
    /* dopo ogni disegno: le sedute col grezzo che non hanno ancora i valori li calcolano (06c-sedute-grezze.js) */
    const avv=function(){
      /* prima: i valori calcolati del corpo attaccati in memoria (regola dei dati grezzi, 09c-pesate.js / 09-corpo.js) */
      try{ ioAttacca(DOC); corpoProfiloAttacca(); }catch(e){ logErrore('attacca', e); }
      const r=col.apply(this, arguments); try{ sgDopoDisegno(); }catch(e){} return r; };
    RENDERERS[k]=avv; try{ if(nome && window[nome]===orig) window[nome]=avv; }catch(e){} });
  window.addEventListener('resize', adattaPag);
  await migrateLegacyStore();
  loadCache();
  if(!profili.length){ profili=[profiloDemo()]; activeProfile=PROFILO_DEMO.slug; profiliDiRipiego=true; }
  if(!Array.isArray(DOC.esercizi)||!DOC.esercizi.length)
    DOC.esercizi=REF.esercizi.filter(e=>!isVariante(e.nome)).map(e=>Object.assign({},e,{nome:String(e.nome).trim()}));
  rebuildEs();
  fillDatalists();
  migrateStorico(); migrateScheda(); migrateGiorniScheda(); migrateExNames();  /* normalizza dati embedded/cache (idempotente) */
  normalizeAlim();
  undoAzzera(); document.addEventListener('keydown', undoTasti);   /* Ctrl+Z / Ctrl+Y */
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
  document.getElementById('btn-connect').onclick=()=>gateShow('first');
  document.getElementById('overlay-btn').onclick=pickDirectory;
  { const av=document.getElementById('app-ver');
    if(av){ av.parentNode.title='Training Monitor System · v'+APP_VERSION;   /* la versione si legge passando su «TMS» */
      let nClick=0, tClick=0;  /* 5 click ravvicinati sulla scritta «TMS» = log errori interni */
      av.onclick=()=>{ const ora=Date.now(); if(ora-tClick>3000) nClick=0; tClick=ora; if(++nClick>=5){ nClick=0; mostraLogErrori(); } }; } }
  /* 5 click ravvicinati sul ✦ accanto a «TMS» (barra in alto) = TACCUINO dell'autore.
     Gesto gemello di quello sulla scritta «TMS», ma su un elemento diverso: così non si pestano. */
  { const sg=document.querySelector('.topbar__mark .sigil');
    if(sg){ sg.style.cursor='default'; let n=0, tt=0;
      sg.onclick=async()=>{ const ora=Date.now(); if(ora-tt>3000) n=0; tt=ora;
        if(++n>=5){ n=0; await taccLeggi(); taccModal(); } }; } }
  translateStatic();  /* traduce il markup statico (barra, tab, overlay, disclaimer) in EN */
  { const bl=document.getElementById('btn-lang');
    if(bl){ bl.textContent=LANG==='it'?'EN':'IT'; bl.title=LANG==='it'?'Switch to English':'Torna all\'italiano';
      bl.onclick=()=>setLang(LANG==='it'?'en':'it'); } }
  /* tema: giorno/notte e stile della notte (13e-impostazioni.js); 🌙/☀ passa dall'uno all'altro,
     ⚙ apre le impostazioni generali dell'app */
  if(window.tmsFinestra && window.tmsFinestra.barra) document.documentElement.classList.add('barra-finestra');   /* la barra fa da barra del titolo */
  { applicaTema(temaGet(), notteGet());
    const bt=document.getElementById('btn-theme');
    if(bt) bt.onclick=()=>temaSalva(document.documentElement.getAttribute('data-theme')==='notte'? 'giorno' : 'notte');
    const bi=document.getElementById('btn-impost'); if(bi) bi.onclick=()=>impostazioniModal(); }
  { let read=false; try{ read=!!localStorage.getItem('tms-disc-read'); }catch(e){}
    const disc=document.getElementById('disclaimer');
    if(disc){ if(!read) disc.classList.remove('hidden');
      const ok=document.getElementById('disc-ok'); if(ok) ok.onclick=()=>{ if(document.getElementById('disc-read').checked){ try{localStorage.setItem('tms-disc-read','1');}catch(e){} } disc.classList.add('hidden'); }; } }
  /* 📕 Guida e 🐞 Segnala stanno in ⚙ Impostazioni (13e-impostazioni.js) */
  { const dc=document.getElementById('dieta-ov-chiudi'); if(dc) dc.onclick=chiudiStampaDieta; }
  aggiornaTabProfilo();
  showTab('allenamento');
  const HAS_LOCAL=!!window.tmsFS;
  if(!HAS_FSA && !HAS_LOCAL){ setConn('err','browser senza accesso cartelle'); gateShow('unsupported'); return; }
  try{
    if(HAS_LOCAL){
      /* desktop: avvio sempre in modalita' dati locali (TMS_Dati). La riconnessione
         automatica alla cartella collegata e' dismessa: un handle FSA residuo in
         IndexedDB viene ignorato e rimosso, niente piu' gate "Ricollega la cartella". */
      try{ await idbDel(IDB_KEY); }catch(e){}
      dirHandle=localDirHandle(''); await connectFlow();
      telAvvia();   /* telefono collegato: giro sull'hub (solo da personal attivo e per il profilo collegato) */
    } else {
      const saved=await idbGet(IDB_KEY);
      if(saved){ dirHandle=saved; const perm=await saved.queryPermission({mode:'readwrite'});
        if(perm==='granted'){ await connectFlow(); }
        else { try{ const rp=await saved.requestPermission({mode:'readwrite'});
            if(rp==='granted'){ await connectFlow(); } else { setConn('busy','riconnetti la cartella'); gateShow('reconnect'); }
          }catch(e){ setConn('busy','riconnetti la cartella'); gateShow('reconnect'); } }
      } else { setConn('','non connesso'); gateShow('first'); }
    }
  }catch(e){
    if(HAS_LOCAL && !(dirHandle&&dirHandle._local)){ try{ dirHandle=localDirHandle(''); await connectFlow(); return; }catch(e2){} }
    setConn('','non connesso'); gateShow('first');
  }
}
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden'&&dataDir){ clearTimeout(saveTimer); persistAll().catch(()=>{}); }});
window.addEventListener('beforeunload',e=>{ if(!scrittureBloccate) saveCache(); scaricaSubito();
  if(typeof telChiusura==='function') telChiusura(e); });   /* telefono collegato: ultimo giro con l'hub prima di chiudere */
init();
