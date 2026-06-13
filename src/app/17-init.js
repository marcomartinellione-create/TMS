/* ════════════════ TABS / INIT ════════════════ */
let curTab='allenamento';
const RENDERERS={profilo:renderProfilo,allenamento:renderAllenamento,cardio:renderCardio,storico:renderStorico,progressi:renderProgressi,corpo:renderCorpo,storicocorpo:renderStoricoCorpo,alimentazione:renderAlimentazione,analisi:renderAnalisi,esercizi:renderEsercizi,report:renderReport,guida:renderGuida};
function showTab(t){
  curTab=t;
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('is-active',b.dataset.tab===t));
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
  await migrateLegacyStore();
  loadCache();
  if(!profili.length){ profili=[{slug:'wander',nome:'Wander',creato:new Date().toISOString().slice(0,10)}]; activeProfile='wander'; }
  if(!Array.isArray(DOC.esercizi)||!DOC.esercizi.length)
    DOC.esercizi=REF.esercizi.filter(e=>!isVariante(e.nome)).map(e=>Object.assign({},e,{nome:String(e.nome).trim()}));
  rebuildEs();
  fillDatalists();
  migrateStorico(); migrateScheda(); migrateExNames();  /* normalizza dati embedded/cache (idempotente) */
  normalizeAlim();
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
  document.getElementById('btn-connect').onclick=()=>gateShow('first');
  document.getElementById('overlay-btn').onclick=pickDirectory;
  document.getElementById('lnk-storico').onclick=e=>{e.preventDefault(); showTab('storico');};
  document.getElementById('lnk-misure').onclick=e=>{e.preventDefault(); showTab('storicocorpo');};
  { const av=document.getElementById('app-ver');
    if(av){ av.textContent='v'+APP_VERSION;
      let nClick=0, tClick=0;  /* 5 click ravvicinati sulla versione = log errori interni */
      av.onclick=()=>{ const ora=Date.now(); if(ora-tClick>3000) nClick=0; tClick=ora; if(++nClick>=5){ nClick=0; mostraLogErrori(); } }; } }
  { const bt=document.getElementById('btn-theme');
    const applyTheme=(t)=>{ document.documentElement.setAttribute('data-theme',t); if(bt){ bt.textContent=t==='notte'?'☀':'🌙'; bt.title=t==='notte'?'Modalità giorno':'Modalità notte'; } };
    let th='giorno'; try{ let _t=localStorage.getItem('tms-theme'); if(_t==='erdtree')_t='giorno'; th=_t||'giorno'; }catch(e){} applyTheme(th);
    if(bt) bt.onclick=()=>{ const cur=document.documentElement.getAttribute('data-theme')==='notte'?'giorno':'notte'; try{localStorage.setItem('tms-theme',cur);}catch(e){} applyTheme(cur); }; }
  { let read=false; try{ read=!!localStorage.getItem('tms-disc-read'); }catch(e){}
    const disc=document.getElementById('disclaimer');
    if(disc){ if(!read) disc.classList.remove('hidden');
      const ok=document.getElementById('disc-ok'); if(ok) ok.onclick=()=>{ if(document.getElementById('disc-read').checked){ try{localStorage.setItem('tms-disc-read','1');}catch(e){} } disc.classList.add('hidden'); }; } }
  const fab=document.getElementById('fab-guida'); if(fab) fab.onclick=()=>showTab('guida');
  const qr=document.getElementById('qr-ig');
  if(qr) qr.onclick=()=>{ modal(`<h3>By Wander</h3><div style="display:flex;gap:18px;flex-wrap:wrap;justify-content:center;align-items:flex-start"><div style="text-align:center;flex:0 1 auto"><div class="muted mono" style="font-size:11px;margin-bottom:5px">Instagram</div><img src="${qr.src}" alt="QR Instagram" style="width:200px;height:200px;max-width:40vw;border-radius:10px;border:1px solid var(--border)"><div><a class="btn btn--gold" href="https://instagram.com/marco_the_wander" target="_blank" rel="noopener" style="margin-top:8px">Apri Instagram ↗</a></div></div><div style="text-align:center;flex:0 1 auto"><div class="muted mono" style="font-size:11px;margin-bottom:5px">GitHub · TMS</div><img src="${QR_GH_SRC}" alt="QR GitHub TMS" style="width:200px;height:200px;max-width:40vw;border-radius:10px;border:1px solid var(--border)"><div><a class="btn btn--gold" href="${GH_REPO_URL}" target="_blank" rel="noopener" style="margin-top:8px">Apri GitHub ↗</a></div></div>${YT_URL?`<div style="text-align:center;flex:0 1 auto"><div class="muted mono" style="font-size:11px;margin-bottom:5px">Tutorial · YouTube</div><img src="${QR_YT_SRC}" alt="QR Tutorial YouTube" style="width:200px;height:200px;max-width:40vw;border-radius:10px;border:1px solid var(--border)"><div><a class="btn btn--gold" href="${YT_URL}" target="_blank" rel="noopener" style="margin-top:8px">Apri i Tutorial ↗</a></div></div>`:''}</div><div class="modal__actions"><button class="btn" onclick="closeModal()">Chiudi</button></div>`); { const _m=document.getElementById('modal'); if(_m) _m.style.maxWidth=YT_URL?'840px':'560px'; } };
  /* aggiornamenti dal wrapper desktop: modali in stile app (v1.0.73) */
  if(window.tmsUpdate && window.tmsUpdate.onEvento){
    window.tmsUpdate.onEvento(d=>{ try{
      if(d && d.tipo==='disponibile') modalAggiornamento(d);
      else if(d && d.tipo==='pronto') modalRiavvio(d);
    }catch(e){ logErrore('modalUpdate', e); } });
  }
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
window.addEventListener('beforeunload',()=>{ saveCache(); });
init();
