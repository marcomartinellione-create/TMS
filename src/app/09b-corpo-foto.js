/* ════════════════ FOTO PROGRESSI (tab Corpo) ════════════════
   Foto datate del cliente salvate IN LOCALE come i video (scrittura binaria via ponte/FSA),
   in TMS_Dati/<profilo>/foto/. I metadati (file, data, tag) vivono in corpo.json (DOC.foto).
   Tutto offline: niente upload, niente cloud. Due modalità:
   ▶ Riproduzione (timelapse: una foto per volta, cursore tipo lettore video, play/pausa)
   ⚖ Confronto (due date a scelta: vecchia sopra, recente sotto, con data e peso).
   Le foto NON entrano nei backup JSON né nell'installer: solo i metadati. Per salvarle si
   copia la cartella TMS_Dati (come i video). */
let fotoMode='riproduzione', fotoTag='', fotoIdx=0, fotoPlay=null, fotoPrimaData='', fotoDopoData='';
const fotoUrlCache={};   /* file → object URL (creato una volta, liberato all'eliminazione) */

async function fotoDir(create){ if(!profileDir) throw new Error('dati non connessi'); return await profileDir.getDirectoryHandle('foto',{create:!!create}); }
async function fotoHandle(file,create){ const fd=await fotoDir(create); return await fd.getFileHandle(String(file),{create:!!create}); }
async function fotoObjUrl(file){
  if(fotoUrlCache[file]) return fotoUrlCache[file];
  const fh=await fotoHandle(file,false); const url=URL.createObjectURL(await fh.getFile());
  fotoUrlCache[file]=url; return url;
}
function fotoTagsPresenti(){ return [...new Set((DOC.foto||[]).map(f=>(f.tag||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b)); }
const FOTO_VISTE=['anteriore','laterale','posteriore'];
function fotoViewOrder(t){ const i=FOTO_VISTE.indexOf(String(t||'').toLowerCase()); return i<0?99:i; }
function fotoDates(){ return [...new Set((DOC.foto||[]).map(f=>f.data).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b))); }
function fotoOfDate(data){ return (DOC.foto||[]).filter(f=>f.data===data && (!fotoTag||(f.tag||'')===fotoTag))
  .sort((a,b)=>fotoViewOrder(a.tag)-fotoViewOrder(b.tag)); }
/* passi del player: con un tag specifico = una foto per passo; con «Tutti» = una DATA per
   passo, con tutte le viste di quel giorno affiancate */
function fotoSteps(){
  const all=DOC.foto||[];
  if(fotoTag) return all.filter(f=>(f.tag||'')===fotoTag).slice().sort((a,b)=>String(a.data).localeCompare(b.data)).map(f=>({data:f.data,foto:[f]}));
  return fotoDates().map(d=>({data:d, foto:(all.filter(f=>f.data===d).sort((a,b)=>fotoViewOrder(a.tag)-fotoViewOrder(b.tag)))}));
}
/* aggancia una data scelta nel calendario alla sessione-foto più vicina */
function fotoSnapDate(picked){ const ds=fotoDates(); if(!ds.length) return picked; if(ds.indexOf(picked)>=0) return picked;
  const pt=new Date(picked).getTime(); if(isNaN(pt)) return ds[0];
  let best=ds[0],bd=Infinity; ds.forEach(d=>{ const diff=Math.abs(new Date(d).getTime()-pt); if(diff<bd){bd=diff;best=d;} }); return best; }
function fotoDataIt(d){ const x=new Date(d); return isNaN(x)?(d||'—'):x.toLocaleDateString('it-IT'); }
/* peso registrato nella stessa settimana ISO della foto (se c'è nello storico misure) */
function fotoPeso(dataStr){ if(!dataStr) return null; const d=new Date(dataStr); if(isNaN(d)) return null;
  const w=isoWeek(d); const code=schedaCode(w.anno,w.sett);
  const r=(DOC.storico_io||[]).find(x=>(+x.scheda||0)===code); return r?(+r.peso||null):null; }
function fotoDataLabel(f){ if(!f) return '—'; const d=new Date(f.data); const dl=isNaN(d)?(f.data||'—'):d.toLocaleDateString('it-IT');
  return dl+(f.tag?' · '+esc(f.tag):''); }

function aggiungiFotoModal(file){
  const oggi=new Date().toISOString().slice(0,10);
  modal(`<h3>📸 Aggiungi foto</h3>
    <div class="row"><div class="field"><label>Data</label><input id="fm-data" type="date" value="${oggi}"></div>
      <div class="field"><label>Tag <span class="muted" style="text-transform:none">(fronte/lato/retro o libero)</span></label>
        <input id="fm-tag" list="fm-tags" placeholder="fronte" value="fronte">
        <datalist id="fm-tags"><option value="fronte"><option value="lato"><option value="retro"></datalist></div></div>
    <p class="muted" style="font-size:12px">La foto resta <b>sul tuo PC</b> (in <span class="mono">${esc(SUBDIR)}/&lt;profilo&gt;/foto/</span>): non viene caricata da nessuna parte.</p>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">Annulla</button><button class="btn btn--ember" id="fm-ok">Salva foto</button></div>`);
  document.getElementById('fm-ok').onclick=()=>{ const data=document.getElementById('fm-data').value||oggi, tag=document.getElementById('fm-tag').value.trim();
    closeModal(); salvaFoto(file, data, tag); };
}
async function salvaFoto(file, dataStr, tag){
  if(!profileDir){ alert('Connetti i dati prima di aggiungere foto.'); return; }
  const m=String(file.name||'').match(/\.(jpe?g|png|webp|gif)$/i);
  const ext=m? m[1].toLowerCase().replace('jpeg','jpg') : 'jpg';
  const fname='f'+Date.now()+'-'+Math.random().toString(36).slice(2,6)+'.'+ext;
  try{ const fh=await fotoHandle(fname,true); const wr=await fh.createWritable(); await wr.write(file); await wr.close(); }
  catch(e){ alert('Errore nel salvataggio della foto: '+e.message); logErrore('foto', e); return; }
  (DOC.foto=DOC.foto||[]).push({file:fname, data:dataStr||new Date().toISOString().slice(0,10), tag:tag||''});
  fotoIdx=Math.max(0,fotoSteps().length-1);  /* salta all'ultimo passo (foto più recente) */
  persist('corpo'); renderCorpo();
}
function modificaFotoModal(file){ const f=(DOC.foto||[]).find(x=>x.file===file); if(!f) return;
  modal(`<h3>Modifica foto</h3>
    <div class="row"><div class="field"><label>Data</label><input id="fm-data" type="date" value="${esc(f.data||'')}"></div>
      <div class="field"><label>Tag</label><input id="fm-tag" list="fm-tags" value="${esc(f.tag||'')}">
        <datalist id="fm-tags"><option value="fronte"><option value="lato"><option value="retro"></datalist></div></div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">Annulla</button><button class="btn btn--ember" id="fm-ok">Salva</button></div>`);
  document.getElementById('fm-ok').onclick=()=>{ f.data=document.getElementById('fm-data').value||f.data; f.tag=document.getElementById('fm-tag').value.trim();
    closeModal(); persist('corpo'); renderCorpo(); };
}
async function eliminaFoto(file){
  const f=(DOC.foto||[]).find(x=>x.file===file); if(!f) return;
  if(!confirm('Eliminare questa foto del '+fotoDataLabel(f)+'? Operazione irreversibile.')) return;
  try{ const fd=await fotoDir(false); await fd.removeEntry(String(file)); }catch(e){}
  if(fotoUrlCache[file]){ try{ URL.revokeObjectURL(fotoUrlCache[file]); }catch(e){} delete fotoUrlCache[file]; }
  DOC.foto=(DOC.foto||[]).filter(x=>x.file!==file); persist('corpo'); renderCorpo();
}
async function vediFoto(file){ const f=(DOC.foto||[]).find(x=>x.file===file);
  let url; try{ url=await fotoObjUrl(file); }catch(e){ alert('Foto non trovata sul disco.'); return; }
  modal(`<h3 style="margin-bottom:8px">📸 ${esc(fotoDataLabel(f))}</h3>
    <img src="${url}" alt="foto" style="width:100%;max-height:74vh;object-fit:contain;border-radius:8px;background:var(--paper-3)">
    <div class="modal__actions"><button class="btn" onclick="closeModal()">Chiudi</button></div>`);
  const mEl=document.getElementById('modal'); if(mEl) mEl.style.maxWidth='720px';
}

/* ── viste ── */
/* riempie un contenitore flex con una o più foto affiancate (e ne carica le immagini) */
function fotoMostraGruppo(boxId, fotos, maxH){
  const c=document.getElementById(boxId); if(!c) return;
  c.innerHTML=fotos.length? fotos.map((f,i)=>`<figure style="margin:0;flex:1 1 0;min-width:0;text-align:center"><img id="${boxId}-${i}" alt="${esc(f.tag||'foto')}" style="width:100%;max-height:${maxH};object-fit:contain;border-radius:8px;background:var(--paper-3)"><figcaption class="muted" style="font-size:11px;margin-top:2px">${esc(f.tag||'')}</figcaption></figure>`).join('')
    : '<div class="muted" style="padding:16px">nessuna foto per questa data/vista</div>';
  fotos.forEach((f,i)=>{ const img=document.getElementById(boxId+'-'+i); if(img) fotoObjUrl(f.file).then(u=>{ if(img.isConnected) img.src=u; }).catch(()=>{ if(img.isConnected) img.alt='foto non trovata'; }); });
}
function mostraFotoPlayer(){
  const steps=fotoSteps(); if(!steps.length) return;
  if(fotoIdx<0) fotoIdx=0; if(fotoIdx>steps.length-1) fotoIdx=steps.length-1;
  const st=steps[fotoIdx]; const peso=fotoPeso(st.data);
  const cap=document.getElementById('foto-pl-cap');
  if(cap) cap.innerHTML=`<b>${esc(fotoDataIt(st.data))}</b>${fotoTag?' · '+esc(fotoTag):''}${peso?` · ⚖ ${nf(peso,1)} kg`:''} <span class="muted">(${fotoIdx+1}/${steps.length})</span>`;
  const rng=document.getElementById('foto-pl-range'); if(rng && +rng.value!==fotoIdx) rng.value=fotoIdx;
  fotoMostraGruppo('foto-pl-imgs', st.foto, '46vh');
}
function fotoPlayPause(){
  const btn=document.getElementById('foto-pl-play');
  if(fotoPlay){ clearInterval(fotoPlay); fotoPlay=null; if(btn) btn.textContent='▶'; return; }
  if(fotoSteps().length<2) return;
  if(btn) btn.textContent='⏸';
  fotoPlay=setInterval(()=>{ const n=fotoSteps().length; if(n<2){ fotoStopPlay(); const b=document.getElementById('foto-pl-play'); if(b)b.textContent='▶'; return; }
    fotoIdx=(fotoIdx+1)%n; mostraFotoPlayer(); }, 1100);
}
function fotoStopPlay(){ if(fotoPlay){ clearInterval(fotoPlay); fotoPlay=null; } }
function mostraFotoConfronto(){
  const ds=fotoDates(); if(!ds.length) return;
  if(ds.indexOf(fotoPrimaData)<0) fotoPrimaData=ds[0];
  if(ds.indexOf(fotoDopoData)<0) fotoDopoData=ds[ds.length-1];
  [['a',fotoPrimaData],['b',fotoDopoData]].forEach(([k,data])=>{
    const peso=fotoPeso(data);
    const cap=document.getElementById('foto-cmp-cap-'+k); if(cap) cap.innerHTML=`<b>${esc(fotoDataIt(data))}</b>${peso?` · ⚖ ${nf(peso,1)} kg`:''}`;
    const inp=document.getElementById('foto-cmp-'+k); if(inp && inp.value!==data) inp.value=data;
    fotoMostraGruppo('foto-cmp-imgs-'+k, fotoOfDate(data), '40vh');
  });
}

function renderFotoSezione(){
  const box=document.getElementById('foto-box'); if(!box) return;
  fotoStopPlay();
  const all=DOC.foto||[]; const tags=fotoTagsPresenti();
  const addBtn=`<label class="btn btn--ember no-print" style="cursor:pointer" title="${profileDir?'Aggiungi una foto progressi (resta sul tuo PC)':'Connetti i dati per aggiungere foto'}"${profileDir?'':' aria-disabled="true"'}>⭱ Aggiungi foto<input type="file" id="foto-file" accept="image/jpeg,image/png,image/webp,image/*" style="display:none"${profileDir?'':' disabled'}></label>`;
  const tagChips=tags.length?`<span class="muted mono" style="font-size:11px;align-self:center">vista:</span>`+
    [['','tutti']].concat(tags.map(t=>[t,t])).map(([v,lab])=>`<button class="pill no-print" data-ftag="${esc(v)}" style="cursor:pointer;${fotoTag===v?'background:var(--gold-t);border-color:var(--gold-2)':''}">${esc(lab)}</button>`).join(''):'';
  const head=`<div class="sec" style="margin-top:16px">▌ 📸 Foto progressi</div>
    <div class="bar no-print" style="flex-wrap:wrap;gap:6px;align-items:center">${addBtn}<div class="spacer"></div>${tagChips}</div>`;
  if(!all.length){
    box.innerHTML=head+`<div class="callout callout--info"><div>Nessuna foto. ${profileDir?'Aggiungi le prime foto (es. <b>anteriore</b>, <b>laterale</b>, <b>posteriore</b>) per vedere i progressi nel tempo.':'Connetti i dati (in alto) per salvare le foto.'} Restano <b>sul tuo PC</b>, nessun upload.</div></div>`;
    wireFoto(box); return;
  }
  const tabs=`<div class="bar no-print" style="gap:6px;margin-top:4px">
    <button class="btn${fotoMode==='riproduzione'?' btn--ember':''}" data-fmode="riproduzione">▶ Riproduzione</button>
    <button class="btn${fotoMode==='confronto'?' btn--ember':''}" data-fmode="confronto">⚖ Confronto</button></div>`;
  let view='';
  if(fotoMode==='riproduzione'){
    const nSteps=fotoSteps().length; const maxI=Math.max(0,nSteps-1);
    view=`<div style="text-align:center;margin-top:8px">
      <div id="foto-pl-imgs" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;align-items:flex-start;min-height:120px"></div>
      <div class="bar no-print" style="justify-content:center;gap:10px;margin-top:8px">
        <button class="btn" id="foto-pl-play" title="Riproduci / pausa" style="min-width:42px">▶</button>
        <input type="range" id="foto-pl-range" min="0" max="${maxI}" value="${Math.min(fotoIdx,maxI)}" style="flex:1;max-width:520px"${nSteps<2?' disabled':''}>
      </div>
      <div class="muted" id="foto-pl-cap" style="font-size:13px;margin-top:2px">…</div>
      ${!fotoTag?'<div class="muted no-print" style="font-size:11px;margin-top:2px">Vista «tutti»: ogni passo mostra le viste della stessa data affiancate. Scegli una vista per scorrere una foto per volta.</div>':''}</div>`;
  } else {
    const ds=fotoDates(); const dmin=ds[0], dmax=ds[ds.length-1];
    if(ds.indexOf(fotoPrimaData)<0) fotoPrimaData=ds[0];
    if(ds.indexOf(fotoDopoData)<0) fotoDopoData=ds[ds.length-1];
    view=`<div style="margin-top:8px">
      <div class="row no-print" style="gap:10px">
        <div class="field"><label>📅 Prima (vecchia)</label><input type="date" id="foto-cmp-a" min="${dmin}" max="${dmax}" value="${fotoPrimaData}"></div>
        <div class="field"><label>📅 Dopo (recente)</label><input type="date" id="foto-cmp-b" min="${dmin}" max="${dmax}" value="${fotoDopoData}"></div></div>
      <div class="muted no-print" style="font-size:11px;margin:-2px 0 6px">Scegli due date dal calendario (si aggancia alla sessione più vicina). Con la vista «tutti» vedi le viste affiancate.</div>
      <div style="text-align:center"><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin:6px 0 2px">Prima</div>
        <div id="foto-cmp-imgs-a" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;align-items:flex-start"></div>
        <div class="muted" id="foto-cmp-cap-a" style="font-size:12.5px;margin-top:3px">…</div>
        <div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin:12px 0 2px">Dopo</div>
        <div id="foto-cmp-imgs-b" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;align-items:flex-start"></div>
        <div class="muted" id="foto-cmp-cap-b" style="font-size:12.5px;margin-top:3px">…</div></div></div>`;
  }
  /* gestione: raggruppata per data (stile calendario), azioni per foto */
  const datesDesc=fotoDates().slice().reverse();
  const gestRows=datesDesc.map(d=>{
    const fotos=(DOC.foto||[]).filter(f=>f.data===d).sort((a,b)=>fotoViewOrder(a.tag)-fotoViewOrder(b.tag));
    return `<tr class="day-sep"><td colspan="2">📅 ${esc(fotoDataIt(d))} <span class="muted" style="font-weight:400">· ${fotos.length} foto</span></td></tr>`+
      fotos.map(f=>`<tr><td class="l">${esc(f.tag||'—')}</td><td class="no-print" style="white-space:nowrap;text-align:right"><button class="btn btn--sm" data-fsee="${esc(f.file)}" title="Vedi">👁</button> <button class="btn btn--sm" data-fedit="${esc(f.file)}" title="Modifica data/vista">✎</button> <button class="btn btn--sm btn--danger" data-fdel="${esc(f.file)}" title="Elimina">✕</button></td></tr>`).join('');
  }).join('');
  const gest=`<div class="sec no-print" style="margin-top:14px;font-size:12px">▌ Gestione foto (${all.length})</div>
    <div class="tbl-wrap no-print"><table><tbody>${gestRows}</tbody></table></div>`;
  box.innerHTML=head+tabs+view+gest;
  wireFoto(box);
  if(fotoMode==='riproduzione') mostraFotoPlayer(); else mostraFotoConfronto();
}
function wireFoto(box){
  const fIn=box.querySelector('#foto-file'); if(fIn) fIn.onchange=e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; if(f) aggiungiFotoModal(f); };
  box.querySelectorAll('[data-ftag]').forEach(b=>b.onclick=()=>{ fotoTag=b.dataset.ftag; fotoIdx=0; renderFotoSezione(); });
  box.querySelectorAll('[data-fmode]').forEach(b=>b.onclick=()=>{ fotoMode=b.dataset.fmode; renderFotoSezione(); });
  const rng=box.querySelector('#foto-pl-range'); if(rng) rng.oninput=e=>{ fotoStopPlay(); const btn=document.getElementById('foto-pl-play'); if(btn) btn.textContent='▶'; fotoIdx=+e.target.value; mostraFotoPlayer(); };
  const pl=box.querySelector('#foto-pl-play'); if(pl) pl.onclick=fotoPlayPause;
  const ca=box.querySelector('#foto-cmp-a'); if(ca) ca.onchange=e=>{ fotoPrimaData=fotoSnapDate(e.target.value); mostraFotoConfronto(); };
  const cb=box.querySelector('#foto-cmp-b'); if(cb) cb.onchange=e=>{ fotoDopoData=fotoSnapDate(e.target.value); mostraFotoConfronto(); };
  box.querySelectorAll('[data-fsee]').forEach(b=>b.onclick=()=>vediFoto(b.dataset.fsee));
  box.querySelectorAll('[data-fedit]').forEach(b=>b.onclick=()=>modificaFotoModal(b.dataset.fedit));
  box.querySelectorAll('[data-fdel]').forEach(b=>b.onclick=()=>eliminaFoto(b.dataset.fdel));
}
