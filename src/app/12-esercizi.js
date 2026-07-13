/* ════════════════ RENDER: ESERCIZI (reference) ════════════════ */
let exFilt='';
/* ── Sottocategoria: famiglia di movimento (Panca, Affondi, Squat…) per raggruppare il
      catalogo DENTRO il macro gruppo. Derivata dal nome con le regole sotto (prima che
      combacia vince); override manuale per esercizio col campo `sotto` (✎ → Sottocategoria). ── */
const SOTTO_REGOLE=[
  ['Allungamento',          /allungament|stretch/],
  ['Affondi',               /affond|lunge|split squat|step.?up/],
  ['Squat',                 /squat|accosciat|pistol/],
  ['Stacco',                /stacco|deadlift|good morning/],
  ['Leg curl / extension',  /leg curl|leg extension/],
  ['Pressa',                /pressa|leg press/],
  ['Polpacci',              /\bcalf\b|polpacc/],
  ['Hip thrust / Glutei',   /hip thrust|hip lift|glute|\bponte\b/],
  ['Curl bicipiti',         /\bcurl\b/],
  ['Tricipiti',             /tricipit|french press|pushdown|push.?down|skull/],
  ['Panca / Distensioni',   /panca piana|panca inclinata|panca declinata|panca stretta|distension|chest press|floor press|\bbench\b/],
  ['Croci / Fly',           /croci|crossover|\bfly\b|pec deck/],
  ['Piegamenti / Dip',      /piegament|push.?up|\bdip\b/],
  ['Lento avanti / Military',/military|lento avanti|overhead|sopra la testa|arnold|shoulder press/],
  ['Alzate',                /alzat/],
  ['Trazioni',              /trazion|pull.?up|chin.?up/],
  ['Lat machine / Pulldown',/pulldown|lat machine|pull.?over|lat pull/],
  ['Rematore',              /rematore|\browing\b|\brow\b/],
  ['Shrug / Trapezi',       /shrug|scrollat/],
  ['Core / Addome',         /crunch|plank|sit.?up|twist|dragon|hollow|rollout|leg raise|addominal|russian|v.?up|bird dog|mountain climber|hyperextension/],
  ['Olimpici / Esplosivi',  /\bclean\b|snatch|jerk|swing|\bjump\b|\bbox\b|burpee|slam|sprint|sled/],
];
function sottoOf(e){
  if(!e) return 'Varie';
  const man=(e.sotto||'').trim(); if(man) return man;
  const n=String(e.nome||'').toLowerCase();
  for(const [lab,re] of SOTTO_REGOLE){ if(re.test(n)) return lab; }
  /* fallback: la natura dell'esercizio (campo `categoria` del database) */
  const cat=String(e.categoria||'').toLowerCase();
  if(cat==='stretching') return 'Allungamento';
  if(cat==='pliometria'||cat==='sollevamento pesi olimpico') return 'Olimpici / Esplosivi';
  if(cat==='strongman') return 'Strongman';
  if(cat==='cardio') return 'Cardio';
  return 'Varie';
}
function exEdit(name){
  name = name? String(name).trim() : '';
  const ex = name? (DOC.esercizi.find(e=>String(e.nome).trim()===name)||{}) : {};
  const isNew=!name;
  const opts=GRUPPI.map(g=>`<option value="${g}"${(ex.macro||ex.gruppo)===g?' selected':''}>${t(g)}</option>`).join('')
    + ((ex.macro&&!GRUPPI.includes(ex.macro))?`<option selected>${esc(ex.macro)}</option>`:'');
  modal(`<h3>${isNew?t('Nuovo esercizio'):t('Modifica esercizio')}</h3>
    <div class="field"><label>${t('Nome')}</label><input id="ex-nome" value="${esc(ex.nome||'')}"></div>
    <div class="row">
      <div class="field"><label>${t('Gruppo muscolare')}</label><select id="ex-macro">${opts}</select></div>
      <div class="field"><label>${t('Fattore TL')}</label><input id="ex-fatt" type="number" step="0.05" value="${ex.fattore??1}"></div>
    </div>
    <div class="field"><label>${t('Target muscolare')}</label><input id="ex-target" value="${esc(ex.target||'')}"></div>
    <div class="field"><label>${t('Tipo')}</label><input id="ex-tipo" value="${esc(ex.tipo||'')}"></div>
    <div class="field"><label>${t('Sottocategoria')} <span class="muted" style="text-transform:none;font-family:var(--font-body)">${t('— raggruppa nel catalogo (es. Panca, Affondi); vuota = automatica dal nome')}${isNew?'':(': «'+esc(t(sottoOf(Object.assign({},ex,{sotto:''}))))+'»')}</span></label><input id="ex-sotto" value="${esc(ex.sotto||'')}" placeholder="${t('automatica')}"></div>
    <div class="field"><label>Video <span class="muted" style="text-transform:none;font-family:var(--font-body)">${t('— nome file in')} <span class="mono">TMS/database/video/</span> ${t('(es. squat.mp4)')}</span></label><input id="ex-video" value="${esc(ex.video||'')}" placeholder="${t('es. squat.mp4')}"></div>
    ${isNew?'':`<div class="field"><label>${t('Video personale')} <span class="muted" style="text-transform:none;font-family:var(--font-body)">${t('— un tuo file al posto del predefinito (in')} <span class="mono">TMS_Dati/video/</span>${t('); si attiva col toggle "Video personali" del tab Esercizi')}</span></label>
      <div class="bar" style="margin:0;align-items:center">
        <span class="pill" id="exv-stato">…</span>
        <label class="btn btn--sm" style="cursor:pointer">${t('⭱ Carica video personale…')}<input type="file" id="exv-file" accept="video/mp4,video/webm,video/*" style="display:none"></label>
        <button class="btn btn--sm btn--danger" id="exv-del" style="display:none">${t('✕ Rimuovi personale')}</button>
      </div></div>`}
    <div class="modal__actions">
      ${isNew?'':`<button class="btn btn--danger" id="ex-del" style="margin-right:auto">${t('Elimina')}</button>`}
      <button class="btn" onclick="closeModal()">${t('Annulla')}</button>
      <button class="btn btn--ember" id="ex-ok">${t('Salva')}</button></div>`);
  document.getElementById('ex-ok').onclick=()=>{
    const nome=document.getElementById('ex-nome').value.trim();
    if(!nome){alert(t('Il nome è obbligatorio.'));return;}
    const macro=document.getElementById('ex-macro').value;
    const obj={nome:nome,macro:macro,gruppo:macro,target:document.getElementById('ex-target').value.trim(),
      tipo:document.getElementById('ex-tipo').value.trim(),fattore:+document.getElementById('ex-fatt').value||1,
      video:document.getElementById('ex-video').value.trim(),
      sotto:document.getElementById('ex-sotto').value.trim()};
    if(isNew){ if(DOC.esercizi.some(e=>String(e.nome).trim()===nome)){alert(t('Esiste già un esercizio con questo nome.'));return;} DOC.esercizi.push(obj); }
    else { const idx=DOC.esercizi.findIndex(e=>String(e.nome).trim()===name);
      if(nome!==name && DOC.esercizi.some(e=>String(e.nome).trim()===nome)){alert(t('Nome già in uso.'));return;}
      if(idx>=0) DOC.esercizi[idx]=obj; }
    rebuildEs(); persist('esercizi'); closeModal(); renderEsercizi();
  };
  const del=document.getElementById('ex-del');
  if(del) del.onclick=()=>{ if(!confirm(t('Eliminare «')+exName(name)+t('» dal catalogo?\nLo storico resta invariato.')))return;
    DOC.esercizi=DOC.esercizi.filter(e=>String(e.nome).trim()!==name); rebuildEs(); persist('esercizi'); closeModal(); renderEsercizi(); };
  if(!isNew){
    const stato=document.getElementById('exv-stato'), fIn=document.getElementById('exv-file'), bDel=document.getElementById('exv-del');
    const nomeFile=()=>document.getElementById('ex-video').value.trim();
    const aggiorna=async()=>{ if(!stato) return; const f=nomeFile();
      if(!f){ stato.textContent=t('imposta prima il campo Video'); if(bDel) bDel.style.display='none'; return; }
      if(!dataDir){ stato.textContent=t('dati non connessi'); if(bDel) bDel.style.display='none'; return; }
      let ce=false; try{ await videoCustomHandle(f,false); ce=true; }catch(e){}
      stato.textContent= ce? t('personale presente') : t('personale assente');
      if(bDel) bDel.style.display= ce? '' : 'none'; };
    aggiorna();
    if(fIn) fIn.onchange=async()=>{
      const file=fIn.files&&fIn.files[0]; if(!file) return;
      const f=nomeFile();
      if(!f){ alert(t('Imposta prima il campo Video (nome file, es. squat.mp4): il personale usa lo stesso nome.')); fIn.value=''; return; }
      if(!dataDir){ alert(t('Connetti i dati prima di caricare un video.')); fIn.value=''; return; }
      try{
        const fh=await videoCustomHandle(f,true);
        const wr=await fh.createWritable(); await wr.write(file); await wr.close();
        if(!videoPersonaliOn() && confirm(t('Video personale salvato. Vuoi attivare ora i "Video personali"? (Si cambia anche dal tab Esercizi.)'))) setVideoPersonali(true);
      }catch(e){ alert(t('Errore nel salvataggio del video:')+' '+e.message); logErrore('videoPersonale', e); }
      fIn.value=''; aggiorna(); };
    if(bDel) bDel.onclick=async()=>{
      const f=nomeFile(); if(!f) return;
      if(!confirm(t('Rimuovere il tuo video personale per questo esercizio? (Il predefinito resta.)'))) return;
      try{ const vd=await videoCustomDir(false); await vd.removeEntry(String(f).replace(/^video\//,'')); }catch(e){}
      aggiorna(); };
  }
}
/* ── Video personali: override dell'utente in TMS_Dati/video/ (stesso nome file del
      catalogo). Col toggle "Video personali" attivo si usa il file dell'utente dove
      esiste, altrimenti il predefinito integrato in database/video/. Su desktop i
      personali finiscono nei dati locali (sopravvivono agli aggiornamenti). ── */
function videoPersonaliOn(){ try{ return localStorage.getItem('tms-video-pers')==='1'; }catch(e){ return false; } }
function setVideoPersonali(on){ try{ localStorage.setItem('tms-video-pers', on?'1':'0'); }catch(e){} }
async function videoCustomDir(create){ if(!dataDir) throw new Error('dati non connessi'); return await dataDir.getDirectoryHandle('video',{create:!!create}); }
async function videoCustomHandle(file,create){ const vd=await videoCustomDir(create); return await vd.getFileHandle(String(file).replace(/^video\//,''),{create:!!create}); }
async function videoSorgente(file){
  const fname=String(file).replace(/^video\//,'');
  if(videoPersonaliOn()){
    try{ return {fh:await videoCustomHandle(fname,false), fonte:'personale'}; }catch(e){ /* nessun personale: predefinito */ }
  }
  const dbdir=await dirHandle.getDirectoryHandle('database',{create:false});
  const vdir=await dbdir.getDirectoryHandle('video',{create:false});
  return {fh:await vdir.getFileHandle(fname,{create:false}), fonte:'predefinito'};
}
let lastVideoUrl=null;
async function playVideo(nome){
  const file=videoOf(nome); if(!file) return;
  if(!dirHandle){ alert(t('Per vedere i video collega la cartella TMS (i video vanno in TMS/database/video/).')); return; }
  let url=null, fonte='predefinito';
  try{
    const s=await videoSorgente(file); fonte=s.fonte;
    url=URL.createObjectURL(await s.fh.getFile());
  }catch(e){ alert(t('Video non trovato: TMS/database/video/')+file); return; }
  if(lastVideoUrl){ try{ URL.revokeObjectURL(lastVideoUrl); }catch(e){} } lastVideoUrl=url;
  modal(`<h3 style="margin-bottom:8px">▶ ${esc(exName(nome))}${fonte==='personale'?` <span class="pill">${t('video personale')}</span>`:''}</h3>`+
    `<video src="${url}" controls autoplay playsinline style="width:100%;max-height:70vh;border-radius:8px;background:#000"></video>`+
    `<div class="modal__actions"><button class="btn" onclick="closeModal()">${t('Chiudi')}</button></div>`);
  const m=document.getElementById('modal'); if(m) m.style.maxWidth='760px';
}
/* ricerca «a parole»: trova se TUTTE le parole digitate compaiono (in qualunque ordine)
   in nome+target+gruppo+sottocategoria. Es. «panca piana bilanciere» trova «Panca piana
   con bilanciere - presa media». Usata sia qui sia nel picker di Allenamento. */
function exMatch(e,q){
  q=String(q||'').trim().toLowerCase(); if(!q) return true;
  const hay=(e.nome+' '+(e.target||'')+' '+(e.macro||e.gruppo||'')+' '+sottoOf(e)).toLowerCase();
  return q.split(/\s+/).every(tok=>hay.includes(tok));
}
/* un esercizio è "cardio" se sta nel gruppo Cardio o ha categoria cardio (database):
   serve a tenerlo FUORI dal selettore dei Pesi (le attività cardio vivono nel tab Cardio). */
function isCardio(e){ if(!e) return false;
  return String(e.macro||e.gruppo||'').toLowerCase()==='cardio' || String(e.categoria||'').toLowerCase()==='cardio'; }
let exSottoAperte={};  /* "macro::sotto" -> true se il menù a tendina è aperto */
function renderEsercizi(){
  const list=EX_BASE.filter(e=>exMatch(e,exFilt));
  const gi=g=>{const i=GRUPPI.indexOf(g); return i<0?99:i;};
  const so=s=>s==='Varie'?'zzz':s.toLowerCase();  /* "Varie" in coda al suo gruppo */
  const sorted=[...list].sort((a,b)=>{ const ga=a.macro||a.gruppo||'',gb=b.macro||b.gruppo||''; return gi(ga)-gi(gb)||ga.localeCompare(gb)||so(sottoOf(a)).localeCompare(so(sottoOf(b)))||String(a.nome).localeCompare(String(b.nome)); });
  /* conteggio esercizi per (gruppo, sottocategoria) */
  const conta={}; sorted.forEach(e=>{ const k=(e.macro||e.gruppo||'Altro')+'::'+sottoOf(e); conta[k]=(conta[k]||0)+1; });
  let body='',lastG=null,lastS=null;
  sorted.forEach(e=>{ const g=e.macro||e.gruppo||'Altro'; if(g!==lastG){lastG=g; lastS=null; body+=`<tr class="day-sep"><td colspan="6">▌ ${esc(t(g))}</td></tr>`;}
    const s=sottoOf(e), key=g+'::'+s, aperta=!!exFilt||!!exSottoAperte[key];  /* la ricerca apre tutto */
    if(s!==lastS){lastS=s; body+=`<tr data-sub="${esc(key)}" style="cursor:pointer" title="${aperta?t('Chiudi'):t('Apri')} ${esc(t(s))}"><td colspan="6" class="l" style="background:var(--paper-2);color:var(--ink-3);font-size:11px;letter-spacing:.4px;text-transform:uppercase;padding:5px 12px;user-select:none">${aperta?'▾':'▸'} ${esc(t(s))} <span style="opacity:.65;text-transform:none;letter-spacing:0">(${conta[key]})</span></td></tr>`;}
    if(!aperta) return;
    body+=`<tr><td class="l">${esc(exName(e.nome))}${videoOf(e.nome)?`<button class="vidbtn no-print" data-vid="${esc(e.nome)}" title="${t('Guarda il video')}">▶</button>`:''}</td><td class="l">${esc(e.target||'')}</td><td>${esc(t(g))}</td><td class="l">${esc(e.tipo||'')}</td><td class="num cell-out">${nf(e.fattore,2)}</td>
      <td class="no-print"><button class="btn btn--sm" data-edit="${esc(e.nome)}" title="${t('modifica')}">✎</button></td></tr>`;});
  document.getElementById('panel-esercizi').innerHTML=`
   <div class="bar"><div class="field"><label>${t('Cerca')}</label><input class="search" id="ex-s" value="${esc(exFilt)}" placeholder="${t('nome, muscolo, gruppo…')}"></div>
     <div class="spacer"></div><label class="pill no-print" style="cursor:pointer;display:inline-flex;align-items:center;gap:5px" title="${t('Se attivo, dove hai caricato un tuo video (TMS_Dati/video/) si usa quello al posto del predefinito; dove non c\'è, resta il predefinito')}"><input type="checkbox" id="ex-vid-pers" style="width:auto;flex:0 0 auto"${videoPersonaliOn()?' checked':''}> ${t('Video personali')}</label><button class="btn btn--ember no-print" id="ex-add">${t('＋ Nuovo esercizio')}</button><span class="pill">${list.length} / ${EX_BASE.length}</span></div>
   <div class="callout callout--info"><div>${t('📖 Catalogo esercizi <b>modificabile</b>, raggruppato per macro gruppo e <b>sottocategoria</b> (famiglia di movimento: Panca, Affondi, Squat… — automatica dal nome, personalizzabile da ✎ → Sottocategoria). Il <b>Fattore</b> pesa il contributo al Training Load. I video integrati si possono <b>sostituire coi tuoi</b>: carica il file da ✎ → "Video personale" e attiva il toggle <b>Video personali</b>.')}</div></div>
   <div class="tbl-wrap"><table><thead><tr><th class="l">${t('Esercizio')}</th><th class="l">${t('Target muscolare')}</th><th>${t('Gruppo')}</th><th class="l">${t('Tipo')}</th><th>${t('Fattore')}</th><th class="no-print"></th></tr></thead><tbody>${body||`<tr><td colspan="6" class="empty">${t('Catalogo vuoto. Collega la cartella TMS: gli esercizi vengono caricati dal database (esercizi.json).')}</td></tr>`}</tbody></table></div>`;
  document.getElementById('ex-s').oninput=e=>{ const pos=e.target.selectionStart; exFilt=e.target.value; renderEsercizi();
    const n=document.getElementById('ex-s'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(_){} } };
  { const tv=document.getElementById('ex-vid-pers'); if(tv) tv.onchange=e=>setVideoPersonali(e.target.checked); }
  document.querySelectorAll('#panel-esercizi [data-sub]').forEach(h=>h.onclick=()=>{ if(exFilt)return; const k=h.dataset.sub; exSottoAperte[k]=!exSottoAperte[k]; renderEsercizi(); });
  document.getElementById('ex-add').onclick=()=>exEdit('');
  document.querySelectorAll('#panel-esercizi [data-vid]').forEach(b=>b.onclick=()=>playVideo(b.dataset.vid));
  document.querySelectorAll('#panel-esercizi [data-edit]').forEach(b=>b.onclick=()=>exEdit(b.dataset.edit));
}

/* ── Selettore esercizio in sovraimpressione (usato in Allenamento al posto del menù a
      tendina): barra di ricerca + lista per categoria, come nel tab Esercizi. La ricerca
      aggiorna SOLO la lista (l'input resta vivo: niente cursore che salta). onPick riceve
      il nome scelto, oppure '' se si svuota. ── */
/* esercizi usati di recente: prima quelli della scheda corrente, poi lo storico dalle
   settimane più recenti (nomi distinti) — per i «Recenti» in cima al picker. */
function exRecentiNomi(){
  const seen=new Set(), out=[];
  ((DOC.scheda&&DOC.scheda.settimanale)||[]).forEach(r=>{ const n=String((r&&r.esercizio)||'').trim(); if(n&&!seen.has(n)){ seen.add(n); out.push(n); } });
  (DOC.storico||[]).slice().sort((a,b)=>(+b.scheda||0)-(+a.scheda||0)).forEach(r=>{ const n=String((r&&r.esercizio)||'').trim(); if(n&&!seen.has(n)){ seen.add(n); out.push(n); } });
  return out;
}
function pickExercise(current, onPick, filtro){
  current=String(current||'').trim();
  const gi=g=>{const i=GRUPPI.indexOf(g);return i<0?99:i;};
  const so=s=>s==='Varie'?'zzz':s.toLowerCase();
  const itemHtml=e=>{ const sel=String(e.nome).trim()===current, fav=!!e.fav;
    return '<div class="exp-it'+(sel?' sel':'')+'" data-nome="'+esc(e.nome)+'">'+
      '<button type="button" class="exp-star'+(fav?' on':'')+'" data-fav="'+esc(e.nome)+'" title="'+(fav?t('togli dai preferiti'):t('aggiungi ai preferiti'))+'">'+(fav?'★':'☆')+'</button>'+
      '<span style="flex:1">'+(sel?'✓ ':'')+esc(exName(e.nome))+(e.target?' <span class="muted">· '+esc(e.target)+'</span>':'')+'</span></div>'; };
  const catalogo=list=>{ const arr=list.slice().sort((a,b)=>{const ga=a.macro||a.gruppo||'',gb=b.macro||b.gruppo||'';return gi(ga)-gi(gb)||ga.localeCompare(gb)||so(sottoOf(a)).localeCompare(so(sottoOf(b)))||String(a.nome).localeCompare(String(b.nome));});
    let html='',lastG=null,lastS=null;
    arr.forEach(e=>{ const g=e.macro||e.gruppo||'Altro';
      if(g!==lastG){lastG=g;lastS=null; html+='<div class="exp-grp">▌ '+esc(t(g))+'</div>';}
      const s=sottoOf(e); if(s!==lastS){lastS=s; html+='<div class="exp-sub">'+esc(t(s))+'</div>';}
      html+=itemHtml(e); });
    return html; };
  function righe(q){
    q=(q||'').trim().toLowerCase();
    const all=(DOC.esercizi||[]).filter(e=>(!filtro||filtro(e)));
    if(q){ const list=all.filter(e=>exMatch(e,q));
      return list.length? catalogo(list) : '<div class="muted" style="padding:16px;text-align:center">'+t('Nessun esercizio per «')+esc(q)+'».</div>'; }
    /* query vuota: preferiti + recenti in cima, poi tutto il catalogo */
    let html=''; const favSet=new Set();
    const fav=all.filter(e=>e.fav).sort((a,b)=>String(a.nome).localeCompare(String(b.nome)));
    if(fav.length){ html+='<div class="exp-grp">'+t('★ Preferiti')+'</div>'; fav.forEach(e=>{ favSet.add(e.nome); html+=itemHtml(e); }); }
    const rec=[]; exRecentiNomi().forEach(n=>{ if(rec.length>=10)return; const e=esLookup(n); if(e&&(!filtro||filtro(e))&&!favSet.has(n)) rec.push(e); });
    if(rec.length){ html+='<div class="exp-grp">'+t('🕐 Recenti')+'</div>'; rec.forEach(e=>html+=itemHtml(e)); }
    return html+catalogo(all);
  }
  modal('<h3>'+t('Scegli esercizio')+'</h3>'+
    '<div class="field" style="margin:6px 0"><input id="exp-q" placeholder="'+t('cerca per nome, muscolo, gruppo…')+'" autocomplete="off" style="width:100%"></div>'+
    '<div id="exp-list" style="max-height:52vh;overflow:auto;border:1px solid var(--border);border-radius:7px;background:var(--paper-2)">'+righe('')+'</div>'+
    '<div class="modal__actions">'+(current?'<button class="btn btn--danger" id="exp-clear" style="margin-right:auto">'+t('Svuota')+'</button>':'')+'<button class="btn" onclick="closeModal()">'+t('Annulla')+'</button></div>');
  const m=document.getElementById('modal'); if(m) m.style.maxWidth='640px';
  const q=document.getElementById('exp-q'), listEl=document.getElementById('exp-list');
  const bind=()=>{
    listEl.querySelectorAll('.exp-it').forEach(b=>b.onclick=()=>{ closeModal(); onPick(b.dataset.nome); });
    listEl.querySelectorAll('.exp-star').forEach(s=>s.onclick=ev=>{ ev.stopPropagation(); const e=esLookup(s.dataset.fav); if(e){ e.fav=!e.fav; persist('esercizi'); const y=listEl.scrollTop; listEl.innerHTML=righe(q.value); bind(); listEl.scrollTop=y; } });
  };
  bind();
  q.oninput=()=>{ listEl.innerHTML=righe(q.value); bind(); };  /* solo la lista: l'input non si ricrea */
  q.onkeydown=e=>{ if(e.key==='Enter'){ const f=listEl.querySelector('.exp-it'); if(f){ e.preventDefault(); closeModal(); onPick(f.dataset.nome); } } };
  { const c=document.getElementById('exp-clear'); if(c) c.onclick=()=>{ closeModal(); onPick(''); }; }
  setTimeout(()=>{ try{ q.focus(); }catch(e){} },0);
}

