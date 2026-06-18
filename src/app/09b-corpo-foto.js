/* ════════════════ FOTO PROGRESSI (tab Corpo) ════════════════
   Foto datate del cliente salvate IN LOCALE come i video (scrittura binaria via ponte/FSA),
   in TMS_Dati/<profilo>/foto/. I metadati (file, data, tag) vivono in corpo.json (DOC.foto).
   Tutto offline: niente upload, niente cloud. Due modalità:
   ▶ Riproduzione (timelapse: una foto per volta, cursore tipo lettore video, play/pausa)
   ⚖ Confronto (due date a scelta: vecchia sopra, recente sotto, con data e peso).
   Le foto NON entrano nei backup JSON né nell'installer: solo i metadati. Per salvarle si
   copia la cartella TMS_Dati (come i video). */
let fotoMode='riproduzione', fotoTag='', fotoIdx=0, fotoPlay=null, fotoPrimaSel='', fotoDopoSel='';
const fotoUrlCache={};   /* file → object URL (creato una volta, liberato all'eliminazione) */

async function fotoDir(create){ if(!profileDir) throw new Error('dati non connessi'); return await profileDir.getDirectoryHandle('foto',{create:!!create}); }
async function fotoHandle(file,create){ const fd=await fotoDir(create); return await fd.getFileHandle(String(file),{create:!!create}); }
async function fotoObjUrl(file){
  if(fotoUrlCache[file]) return fotoUrlCache[file];
  const fh=await fotoHandle(file,false); const url=URL.createObjectURL(await fh.getFile());
  fotoUrlCache[file]=url; return url;
}
function fotoList(){ return (DOC.foto||[]).filter(f=>!fotoTag||(f.tag||'')===fotoTag)
  .slice().sort((a,b)=>String(a.data||'').localeCompare(String(b.data||''))); }
function fotoTagsPresenti(){ return [...new Set((DOC.foto||[]).map(f=>(f.tag||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b)); }
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
  fotoIdx=fotoList().length-1;  /* mostra l'ultima aggiunta */
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
function mostraFotoPlayer(){
  const list=fotoList(); if(!list.length) return;
  if(fotoIdx<0) fotoIdx=0; if(fotoIdx>list.length-1) fotoIdx=list.length-1;
  const f=list[fotoIdx];
  const cap=document.getElementById('foto-pl-cap'); const peso=fotoPeso(f.data);
  if(cap) cap.innerHTML=`<b>${esc(fotoDataLabel(f))}</b>${peso?` · ⚖ ${nf(peso,1)} kg`:''} <span class="muted">(${fotoIdx+1}/${list.length})</span>`;
  const rng=document.getElementById('foto-pl-range'); if(rng && +rng.value!==fotoIdx) rng.value=fotoIdx;
  const img=document.getElementById('foto-pl-img');
  if(img) fotoObjUrl(f.file).then(u=>{ if(img.isConnected) img.src=u; }).catch(()=>{ if(img.isConnected){ img.removeAttribute('src'); img.alt='foto non trovata'; } });
}
function fotoPlayPause(){
  const btn=document.getElementById('foto-pl-play'); const list=fotoList();
  if(fotoPlay){ clearInterval(fotoPlay); fotoPlay=null; if(btn) btn.textContent='▶'; return; }
  if(list.length<2) return;
  if(btn) btn.textContent='⏸';
  fotoPlay=setInterval(()=>{ const n=fotoList().length; if(n<2){ fotoPlayPause(); return; }
    fotoIdx=(fotoIdx+1)%n; mostraFotoPlayer(); }, 950);
}
function fotoStopPlay(){ if(fotoPlay){ clearInterval(fotoPlay); fotoPlay=null; } }
function mostraFotoConfronto(){
  const list=fotoList(); if(!list.length) return;
  if(!list.some(f=>f.file===fotoPrimaSel)) fotoPrimaSel=list[0].file;
  if(!list.some(f=>f.file===fotoDopoSel)) fotoDopoSel=list[list.length-1].file;
  [['a',fotoPrimaSel],['b',fotoDopoSel]].forEach(([k,file])=>{
    const f=(DOC.foto||[]).find(x=>x.file===file); const peso=f?fotoPeso(f.data):null;
    const cap=document.getElementById('foto-cmp-cap-'+k); if(cap) cap.innerHTML=`<b>${esc(fotoDataLabel(f))}</b>${peso?` · ⚖ ${nf(peso,1)} kg`:''}`;
    const sel=document.getElementById('foto-cmp-'+k); if(sel && sel.value!==file) sel.value=file;
    const img=document.getElementById('foto-cmp-img-'+k);
    if(img && file) fotoObjUrl(file).then(u=>{ if(img.isConnected) img.src=u; }).catch(()=>{});
  });
}

function renderFotoSezione(){
  const box=document.getElementById('foto-box'); if(!box) return;
  fotoStopPlay();
  const all=DOC.foto||[]; const tags=fotoTagsPresenti(); const list=fotoList();
  const addBtn=`<label class="btn btn--ember no-print" style="cursor:pointer" title="${profileDir?'Aggiungi una foto progressi (resta sul tuo PC)':'Connetti i dati per aggiungere foto'}"${profileDir?'':' aria-disabled="true"'}>⭱ Aggiungi foto<input type="file" id="foto-file" accept="image/jpeg,image/png,image/webp,image/*" style="display:none"${profileDir?'':' disabled'}></label>`;
  const tagChips=tags.length?`<span class="muted mono" style="font-size:11px;align-self:center">tag:</span>`+
    [['','tutti']].concat(tags.map(t=>[t,t])).map(([v,lab])=>`<button class="pill no-print" data-ftag="${esc(v)}" style="cursor:pointer;${fotoTag===v?'background:var(--gold-t);border-color:var(--gold-2)':''}">${esc(lab)}</button>`).join(''):'';
  const head=`<div class="sec" style="margin-top:16px">▌ 📸 Foto progressi</div>
    <div class="bar no-print" style="flex-wrap:wrap;gap:6px;align-items:center">${addBtn}<div class="spacer"></div>${tagChips}</div>`;
  if(!all.length){
    box.innerHTML=head+`<div class="callout callout--info"><div>Nessuna foto. ${profileDir?'Aggiungi le prime foto (es. <b>fronte</b> e <b>lato</b>) per vedere i progressi nel tempo.':'Connetti i dati (in alto) per salvare le foto.'} Restano <b>sul tuo PC</b>, nessun upload.</div></div>`;
    wireFoto(box); return;
  }
  const tabs=`<div class="bar no-print" style="gap:6px;margin-top:4px">
    <button class="btn${fotoMode==='riproduzione'?' btn--ember':''}" data-fmode="riproduzione">▶ Riproduzione</button>
    <button class="btn${fotoMode==='confronto'?' btn--ember':''}" data-fmode="confronto">⚖ Confronto</button></div>`;
  let view='';
  if(fotoMode==='riproduzione'){
    view=`<div style="text-align:center;margin-top:8px">
      <img id="foto-pl-img" alt="foto" style="max-width:100%;max-height:46vh;border-radius:8px;background:var(--paper-3);display:block;margin:0 auto">
      <div class="bar no-print" style="justify-content:center;gap:10px;margin-top:8px">
        <button class="btn" id="foto-pl-play" title="Riproduci / pausa" style="min-width:42px">▶</button>
        <input type="range" id="foto-pl-range" min="0" max="${list.length-1}" value="${Math.min(fotoIdx,list.length-1)}" style="flex:1;max-width:520px"${list.length<2?' disabled':''}>
      </div>
      <div class="muted" id="foto-pl-cap" style="font-size:13px;margin-top:2px">…</div></div>`;
  } else {
    const opts=sel=>list.map(f=>`<option value="${esc(f.file)}"${f.file===sel?' selected':''}>${esc(fotoDataLabel(f))}</option>`).join('');
    if(!list.some(f=>f.file===fotoPrimaSel)) fotoPrimaSel=list[0].file;
    if(!list.some(f=>f.file===fotoDopoSel)) fotoDopoSel=list[list.length-1].file;
    view=`<div style="margin-top:8px">
      <div class="row no-print" style="gap:10px">
        <div class="field"><label>Prima (vecchia)</label><select id="foto-cmp-a">${opts(fotoPrimaSel)}</select></div>
        <div class="field"><label>Dopo (recente)</label><select id="foto-cmp-b">${opts(fotoDopoSel)}</select></div></div>
      <div style="text-align:center"><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin:6px 0 2px">Prima</div>
        <img id="foto-cmp-img-a" alt="prima" style="max-width:100%;max-height:38vh;border-radius:8px;background:var(--paper-3);display:block;margin:0 auto">
        <div class="muted" id="foto-cmp-cap-a" style="font-size:12.5px;margin-top:3px">…</div>
        <div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin:12px 0 2px">Dopo</div>
        <img id="foto-cmp-img-b" alt="dopo" style="max-width:100%;max-height:38vh;border-radius:8px;background:var(--paper-3);display:block;margin:0 auto">
        <div class="muted" id="foto-cmp-cap-b" style="font-size:12.5px;margin-top:3px">…</div></div></div>`;
  }
  /* gestione: elenco compatto (niente miniature di massa: si apre 👁 su richiesta) */
  const gest=`<div class="sec no-print" style="margin-top:14px;font-size:12px">▌ Gestione foto (${all.length})</div>
    <div class="tbl-wrap no-print"><table><thead><tr><th class="l">Data</th><th class="l">Tag</th><th></th></tr></thead><tbody>${
      all.slice().sort((a,b)=>String(b.data||'').localeCompare(String(a.data||''))).map(f=>`<tr><td class="l">${esc((new Date(f.data)).toLocaleDateString&&!isNaN(new Date(f.data))?new Date(f.data).toLocaleDateString('it-IT'):(f.data||'—'))}</td><td class="l">${esc(f.tag||'—')}</td><td class="no-print" style="white-space:nowrap"><button class="btn btn--sm" data-fsee="${esc(f.file)}" title="Vedi">👁</button> <button class="btn btn--sm" data-fedit="${esc(f.file)}" title="Modifica data/tag">✎</button> <button class="btn btn--sm btn--danger" data-fdel="${esc(f.file)}" title="Elimina">✕</button></td></tr>`).join('')
    }</tbody></table></div>`;
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
  const ca=box.querySelector('#foto-cmp-a'); if(ca) ca.onchange=e=>{ fotoPrimaSel=e.target.value; mostraFotoConfronto(); };
  const cb=box.querySelector('#foto-cmp-b'); if(cb) cb.onchange=e=>{ fotoDopoSel=e.target.value; mostraFotoConfronto(); };
  box.querySelectorAll('[data-fsee]').forEach(b=>b.onclick=()=>vediFoto(b.dataset.fsee));
  box.querySelectorAll('[data-fedit]').forEach(b=>b.onclick=()=>modificaFotoModal(b.dataset.fedit));
  box.querySelectorAll('[data-fdel]').forEach(b=>b.onclick=()=>eliminaFoto(b.dataset.fdel));
}
