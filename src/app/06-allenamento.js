/* ════════════════ RENDER: ALLENAMENTO ════════════════ */
let schedaMode='settimanale';
function schedaRows(){ return DOC.scheda[schedaMode] || (DOC.scheda[schedaMode]=[]); }
/* Bozza RPE/durata per-giorno (Foster): vive in scheda.json (autosave), azzerata al salvataggio nello Storico */
function schedaRpe(){ const s=DOC.scheda; if(!s.rpe||typeof s.rpe!=='object')s.rpe={}; if(!s.rpe[schedaMode])s.rpe[schedaMode]={}; return s.rpe[schedaMode]; }
function dayRpe(g){ const d=schedaRpe()[g]; return d||{}; }
function dayLoad(g){ const d=dayRpe(g); const r=+d.rpe||0,m=+d.min||0; return r>0&&m>0? r*m:0; }
function schedaDays(rows){ const seen=[]; (rows||schedaRows()).forEach(r=>{ if(r.giorno&&!seen.includes(r.giorno))seen.push(r.giorno); }); return seen; }
function lastPerf(nome){ if(!nome)return null; const rows=DOC.storico.filter(r=>r.esercizio===nome); if(!rows.length)return null;
  const maxS=Math.max(...rows.map(r=>+r.scheda||0)); const last=rows.filter(r=>(+r.scheda)===maxS);
  let best=last[0]; last.forEach(r=>{ if((+r.peso||0)>(+best.peso||0)) best=r; });
  return {peso:+best.peso||0, rip:+best.rip||0, rir:(best.rir==null?'':best.rir), scheda:maxS}; }
function prefillFromLast(){ const rows=schedaRows(); let n=0;
  rows.forEach(r=>{ if(!r.esercizio)return; const lp=lastPerf(r.esercizio); if(lp){ r.peso=lp.peso; r.rip=lp.rip; if(lp.rir!==''&&lp.rir!=null) r.rir=lp.rir; n++; } });
  if(!n){ alert('Nessuno storico da cui precompilare.'); return; }
  persist('scheda'); renderAllenamento(); }
function rpeDayControls(g){ const d=dayRpe(g), ld=dayLoad(g);
  return `<span class="rpe-ctl no-print" style="float:right;display:inline-flex;gap:6px;align-items:center;font-weight:400">`+
    `<label style="font-size:11px;color:var(--ink-3)">RPE</label><input class="cell-in rpe-in" type="number" min="0" max="10" step="0.5" data-rpe-day="${esc(g)}" data-rpe-f="rpe" value="${d.rpe??''}" style="width:46px" placeholder="0–10" title="RPE della seduta intera (Foster) · 0–10">`+
    `<label style="font-size:11px;color:var(--ink-3)">min</label><input class="cell-in rpe-in" type="number" min="0" step="1" data-rpe-day="${esc(g)}" data-rpe-f="min" value="${d.min??''}" style="width:54px" placeholder="min" title="Durata della seduta in minuti">`+
    `<span class="pill" data-rpe-load="${esc(g)}" title="Carico interno seduta = RPE × min (AU)">${ld?nfk(ld)+' AU':'—'}</span></span>`; }
function renderAllenamento(){
  const rows=schedaRows();
  const smap=sedutaMap(rows);
  let totTL=0; rows.forEach(r=>{ totTL+=sTL(r); });
  let prevTotal=0; if(DOC.storico.length){ const mx=Math.max(...DOC.storico.map(r=>+r.scheda||0)); prevTotal=DOC.storico.filter(r=>(+r.scheda)===mx&&!r.test).reduce((a,r)=>a+sTL(r),0); }
  const deltaW=prevTotal>0? (totTL/prevTotal-1):null;
  let body='', lastDay=null; const blockSeen={}, setIdx={}, lastSetsCache={};
  rows.forEach((r,i)=>{
    if(r.giorno && r.giorno!==lastDay){ lastDay=r.giorno;
      body+=`<tr class="day-sep"><td colspan="12">▌ ${esc(r.giorno)}${useRpeActive()?rpeDayControls(r.giorno):''}</td></tr>`; }
    const sd=rowSeduta(smap,r), bk=r.esercizio+'|'+sd;
    const firstOfBlock=r.esercizio && !blockSeen[bk]; if(r.esercizio) blockSeen[bk]=true;
    const m=sRM(r), p=sPct(r), t=sTL(r);
    /* Δ TL per SET: questo set vs il set di pari posizione (stessa seduta) della scorsa scheda */
    let dperc=null;
    if(r.esercizio && !r.test){ const prevSets=lastSetsCache[bk]||(lastSetsCache[bk]=lastBlockSets(r.esercizio,sd));
      const ix=setIdx[bk]||0; setIdx[bk]=ix+1; const pv=prevSets[ix]||0; if(pv>0) dperc=t/pv-1; }
    const [fl,fc]=fascia(p);
    const sdBadge=(r.esercizio && sd>1 && firstOfBlock)? ` <span class="pill" style="padding:0 6px" title="Seduta ${sd} della settimana (auto)">S${sd}</span>`:'';
    body+=`<tr data-i="${i}"${r.test?' style="background:rgba(122,62,168,.07)"':''}>
      <td class="l"><button type="button" class="cell-in txt ex-pick" style="min-width:170px;width:100%;text-align:left;cursor:pointer">${r.esercizio?esc(r.esercizio):'<span class="muted">＋ scegli esercizio</span>'} <span style="opacity:.5">▾</span></button>${sdBadge}${videoOf(r.esercizio)?`<button class="vidbtn no-print" data-vid="${esc(r.esercizio)}" title="Guarda il video">▶</button>`:''}${(()=>{const lp=lastPerf(r.esercizio);return lp?`<div class="muted" style="font-size:10px;line-height:1.2" title="ultima registrazione (scheda ${lp.scheda})">ult: ${nf(lp.peso,1)}×${nf(lp.rip,0)}${(lp.rir!==''&&lp.rir!=null)?(' · RIR '+lp.rir):''}</div>`:'';})()}</td>
      <td class="l"><textarea class="cell-in txt note-area" data-f="note" placeholder="note" style="min-width:90px">${esc(r.note||'')}</textarea></td>
      <td><input class="cell-in" type="number" min="0" value="${r.serie??''}" data-f="serie" style="width:48px"></td>
      <td><input class="cell-in" type="number" min="0" value="${r.rip??''}" data-f="rip" style="width:52px"></td>
      <td><input class="cell-in" type="number" min="0" step="0.5" value="${r.peso??''}" data-f="peso" style="width:60px"></td>
      <td class="rir-col"><input class="cell-in" type="number" min="0" max="10" value="${r.rir??''}" data-f="rir" style="width:42px" placeholder="–" title="Reps In Reserve · RPE=10−RIR"></td>
      <td><input class="cell-in" value="${esc(r.rest||'')}" data-f="rest" style="width:54px" placeholder="m:ss"></td>
      <td class="cell-calc num">${m?nf(m,1):'—'}</td>
      <td class="cell-calc num">${p?nf(p,1):'—'}</td>
      <td class="cell-out num">${t?nfk(t):'—'}</td>
      <td class="num ${dperc==null?'muted':dperc>=0?'delta-up':'delta-dn'}" title="Δ TL del set vs il set di pari posizione della scorsa scheda">${dperc==null?'—':(dperc>=0?'▲':'▼')+' '+nf(Math.abs(dperc)*100,1)+'%'}</td>
      <td style="white-space:nowrap"><span class="fascia ${fc}">${fl}</span>
        <button class="btn btn--sm no-print" data-mvup="${i}" title="sposta su (nel giorno)"${(i>0&&rows[i-1]&&rows[i-1].giorno===r.giorno)?'':' disabled'}>▲</button><button class="btn btn--sm no-print" data-mvdn="${i}" title="sposta giù (nel giorno)"${(i<rows.length-1&&rows[i+1]&&rows[i+1].giorno===r.giorno)?'':' disabled'}>▼</button>
        <button class="btn btn--sm no-print" data-set="${i}" title="aggiungi un set a questo esercizio">＋set</button>
        <button class="btn btn--sm no-print" data-test="${i}" title="segna/togli test 1RM (escluso dalla progressione)" style="${r.test?'color:var(--violet);border-color:var(--violet)':''}">★</button>
        <button class="btn btn--sm btn--danger no-print" data-del="${i}" title="elimina">✕</button></td>
    </tr>`;
  });
  document.getElementById('panel-allenamento').innerHTML=`
   <div class="bar no-print">
     <div class="field"><label>Scheda</label>
       <select id="sched-mode">
         <option value="settimanale"${schedaMode==='settimanale'?' selected':''}>Settimanale</option>
         <option value="mensile"${schedaMode==='mensile'?' selected':''}>Mensile</option>
       </select></div>
     <div class="spacer"></div>
     <button class="btn" id="btn-addrow">＋ Esercizio</button>
     <button class="btn" id="btn-addday">＋ Giorno</button>
     <button class="btn" id="btn-prefill" title="Riprendi peso/rip/RIR dalla scorsa registrazione">↧ Dalla scorsa</button>
     <button class="btn btn--ember" id="btn-save-sched">💾 Salva nello Storico</button>
     <button class="btn btn--danger" id="btn-undo-sched">↶ Annulla ultimo</button>
   </div>
   ${statusBanner(DOC.storico,'Storico allenamento')}
   <div class="sec">▌ Scheda ${schedaMode} <span class="pill">${rows.length} righe-set</span><span class="pill" id="hdr-tottl" style="margin-left:6px">TL totale ${nfk(totTL)}</span><span id="hdr-delta">${deltaW==null?'':`<span class="pill" style="margin-left:6px;border-color:${deltaW>=0?'var(--ok)':'var(--danger)'};color:${deltaW>=0?'var(--ok)':'var(--danger)'}">Δ ${schedaMode==='mensile'?'mese':'settimana'} ${deltaW>=0?'▲':'▼'} ${nf(Math.abs(deltaW)*100,1)}%</span><span class="pill muted" style="margin-left:6px" title="TL totale ultima scheda salvata">ultima ${nfk(prevTotal)}</span>`}</span></div>
   <div class="tbl-wrap"><table class="${useRirActive()?'':'hide-rir'}">
     <thead><tr><th class="l">Esercizio</th><th class="l">Note</th><th>Serie</th><th>Rip.</th><th>Peso</th><th class="rir-col" title="Reps In Reserve (RPE=10−RIR)">RIR</th><th>Rest</th><th>1RM</th><th>%1RM</th><th>TL</th><th title="Δ del carico del set vs lo stesso set (pari posizione) della scorsa scheda">Δ TL set</th><th>Fascia / azioni</th></tr></thead>
     <tbody>${body||'<tr><td colspan="12" class="empty">Nessun esercizio. Aggiungine uno o un giorno.</td></tr>'}</tbody>
   </table></div>
   <div class="callout callout--info"><div>🧮 <b>1RM</b>=Peso·(1+Rip/30) · <b>%1RM</b>=Peso/1RM · <b>TL</b>=Serie·Rip·Peso·(%1RM/100)·Fattore · <b>ΔTL set</b>: ogni set confrontato col set di pari posizione (1° vs 1°, 2° vs 2°…) della stessa seduta nella scorsa scheda. Ripeti lo stesso esercizio con <b>＋set</b> per i set incrementali; se compare in un secondo giorno della settimana diventa automaticamente <b>S2</b>. <b>★</b>=test 1RM (escluso dalla progressione).</div></div>`;
  document.getElementById('sched-mode').onchange=e=>{schedaMode=e.target.value; renderAllenamento();};
  // auto-resize note textareas
  document.getElementById('panel-allenamento').addEventListener('input', e=>{
    if(e.target.classList.contains('note-area')){
      e.target.style.height='auto';
      e.target.style.height=e.target.scrollHeight+'px';
    }
  });
  // init height on existing note textareas
  document.querySelectorAll('.note-area').forEach(t=>{ t.style.height='auto'; t.style.height=t.scrollHeight+'px'; });
  document.getElementById('btn-addrow').onclick=aggiungiEsercizioModal;
  document.getElementById('btn-addday').onclick=addDay;
  { const pf=document.getElementById('btn-prefill'); if(pf) pf.onclick=()=>{ if(confirm('Precompilo peso/rip/RIR dalla scorsa registrazione di ogni esercizio? Sovrascrive i valori attuali della scheda.')) prefillFromLast(); }; }
  document.getElementById('btn-save-sched').onclick=saveSchedaModal;
  document.getElementById('btn-undo-sched').onclick=undoScheda;
  document.querySelectorAll('#panel-allenamento input').forEach(inp=>{
    inp.addEventListener('input',e=>{
      const tr=e.target.closest('tr'); if(!tr||tr.dataset.i==null)return; const i=+tr.dataset.i; const f=e.target.dataset.f;
      let v=e.target.value; if(['serie','rip','peso','rir'].includes(f)) v=v===''?'':+v;
      schedaRows()[i][f]=v; persist('scheda');
      if(['serie','rip','peso','rir'].includes(f)) refreshSchedaCalc();  /* aggiornamento dal vivo, mantiene il focus */
    });
  });
  document.querySelectorAll('#panel-allenamento [data-rpe-day]').forEach(inp=>inp.addEventListener('input',e=>{
    const g=e.target.dataset.rpeDay, fld=e.target.dataset.rpeF, m=schedaRpe();
    if(!m[g])m[g]={}; m[g][fld]=e.target.value===''?'':+e.target.value; persist('scheda');
    const badge=document.querySelector('#panel-allenamento [data-rpe-load="'+g+'"]'); if(badge){ const ld=dayLoad(g); badge.textContent=ld?nfk(ld)+' AU':'—'; }
  }));
  document.querySelectorAll('#panel-allenamento [data-vid]').forEach(b=>b.onclick=()=>playVideo(b.dataset.vid));
  document.querySelectorAll('#panel-allenamento .ex-pick').forEach(b=>b.onclick=()=>{
    const tr=b.closest('tr'); const i=+tr.dataset.i;
    pickExercise(schedaRows()[i].esercizio, nome=>{ schedaRows()[i].esercizio=nome; persist('scheda'); renderAllenamento(); }, e=>!isCardio(e)); });
  document.querySelectorAll('#panel-allenamento [data-set]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.set, r=schedaRows()[i];
    schedaRows().splice(i+1,0,{giorno:r.giorno,esercizio:r.esercizio,note:'',serie:r.serie,rip:r.rip,peso:r.peso,rest:r.rest}); persist('scheda'); renderAllenamento(); });
  document.querySelectorAll('#panel-allenamento [data-test]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.test; schedaRows()[i].test=!schedaRows()[i].test; persist('scheda'); renderAllenamento(); });
  document.querySelectorAll('#panel-allenamento [data-del]').forEach(b=>b.onclick=()=>{ schedaRows().splice(+b.dataset.del,1); persist('scheda'); renderAllenamento(); });
  /* riordino esercizi dentro il giorno (scambia con la riga adiacente dello stesso giorno) */
  document.querySelectorAll('#panel-allenamento [data-mvup]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.mvup, r=schedaRows(); if(i>0&&r[i-1].giorno===r[i].giorno){ const t=r[i-1]; r[i-1]=r[i]; r[i]=t; persist('scheda'); renderAllenamento(); } });
  document.querySelectorAll('#panel-allenamento [data-mvdn]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.mvdn, r=schedaRows(); if(i<r.length-1&&r[i+1].giorno===r[i].giorno){ const t=r[i+1]; r[i+1]=r[i]; r[i]=t; persist('scheda'); renderAllenamento(); } });
  updateStatusDots();
  document.querySelectorAll('.note-area').forEach(t=>{ t.style.height='auto'; t.style.height=t.scrollHeight+'px'; });
}
let rerenderT=null; function scheduleRerender(){ clearTimeout(rerenderT); rerenderT=setTimeout(renderAllenamento,500); }
function weekPrev(code){ let a=Math.floor(code/100), s=code%100; return s>1? a*100+(s-1) : (a-1)*100+52; }
function aggStatus(arr){ const codes=(arr||[]).map(r=>+r.scheda||0).filter(x=>x>0);
  const last=codes.length?Math.max(...codes):0; const w=isoWeek(new Date()); const cur=schedaCode(w.anno,w.sett); const prev=weekPrev(cur);
  return {ok:last>=prev, last, cur, prev}; }
function statusBanner(arr,label){ const s=aggStatus(arr);
  if(s.ok) return `<div class="callout no-print" style="margin:0 0 12px;background:var(--ok-t);border-color:#bcdcc6;border-left-color:var(--ok)"><div>✓ <b>${label} aggiornato</b> · ultima registrazione: settimana <b>${s.last}</b> (corrente ${s.cur}).</div></div>`;
  const what=s.last?`l'ultima è la settimana <b>${s.last}</b>`:'non ci sono ancora registrazioni';
  return `<div class="callout no-print" style="margin:0 0 12px;background:var(--danger-t);border-color:#e6b8b8;border-left-color:var(--danger)"><div>⚠ <b>${label} da aggiornare</b> · ${what}; manca almeno la settimana precedente (<b>${s.prev}</b>). Ricordati di salvare.</div></div>`;
}
function updateStatusDots(){ const so=aggStatus(DOC.storico), bo=aggStatus(DOC.storico_io);
  const ds=document.getElementById('dot-storico'), dm=document.getElementById('dot-misure');
  if(ds){ ds.style.color=so.ok?'var(--ok-b)':'var(--danger-b)'; ds.title=so.ok?('Storico aggiornato (ultima '+so.last+')'):('Storico da aggiornare — manca la settimana '+so.prev); }
  if(dm){ dm.style.color=bo.ok?'var(--ok-b)':'var(--danger-b)'; dm.title=bo.ok?('Misure aggiornate (ultima '+bo.last+')'):('Misure da aggiornare — manca la settimana '+bo.prev); }
}
function refreshSchedaCalc(){
  const rows=schedaRows(), smap=sedutaMap(rows);
  let totTL=0; const setIdx={}, lastSetsCache={};
  document.querySelectorAll('#panel-allenamento tbody tr[data-i]').forEach(tr=>{
    const i=+tr.dataset.i, r=rows[i]; if(!r)return; const c=tr.children;
    const m=sRM(r), p=sPct(r), t=sTL(r), fa=fascia(p);
    totTL+=t;
    if(c[7])c[7].textContent=m?nf(m,1):'—';
    if(c[8])c[8].textContent=p?nf(p,1):'—';
    if(c[9])c[9].textContent=t?nfk(t):'—';
    const fsp=c[11]&&c[11].querySelector('.fascia'); if(fsp){fsp.className='fascia '+fa[1]; fsp.textContent=fa[0];}
    const sd=rowSeduta(smap,r), bk=r.esercizio+'|'+sd;
    let dperc=null;
    if(r.esercizio && !r.test){ const prevSets=lastSetsCache[bk]||(lastSetsCache[bk]=lastBlockSets(r.esercizio,sd));
      const ix=setIdx[bk]||0; setIdx[bk]=ix+1; const pv=prevSets[ix]||0; if(pv>0) dperc=t/pv-1; }
    if(c[10]){ c[10].className='num '+(dperc==null?'muted':dperc>=0?'delta-up':'delta-dn'); c[10].textContent=dperc==null?'—':(dperc>=0?'▲':'▼')+' '+nf(Math.abs(dperc)*100,1)+'%'; }
  });
  let prevTotal=0; if(DOC.storico.length){ const mx=Math.max(...DOC.storico.map(r=>+r.scheda||0)); prevTotal=DOC.storico.filter(r=>(+r.scheda)===mx&&!r.test).reduce((a,r)=>a+sTL(r),0); }
  const deltaW=prevTotal>0?(totTL/prevTotal-1):null;
  const ht=document.getElementById('hdr-tottl'); if(ht)ht.textContent='TL totale '+nfk(totTL);
  const hd=document.getElementById('hdr-delta'); if(hd)hd.innerHTML=deltaW==null?'':`<span class="pill" style="margin-left:6px;border-color:${deltaW>=0?'var(--ok)':'var(--danger)'};color:${deltaW>=0?'var(--ok)':'var(--danger)'}">Δ ${schedaMode==='mensile'?'mese':'settimana'} ${deltaW>=0?'▲':'▼'} ${nf(Math.abs(deltaW)*100,1)}%</span><span class="pill muted" style="margin-left:6px">ultima ${nfk(prevTotal)}</span>`;
}
/* ＋ Esercizio: chiede in quale giorno aggiungerlo e lo inserisce in fondo a quel giorno
   (se il giorno non esiste ancora, crea la sezione). */
function aggiungiEsercizioModal(){
  const rows=schedaRows(); const def=(rows.length?rows[rows.length-1].giorno:'')||'Lunedì';
  modal(`<h3>Aggiungi esercizio</h3>
    <div class="field"><label>In quale giorno?</label><select id="m-day">${GIORNI.map(g=>`<option${g===def?' selected':''}>${g}</option>`).join('')}</select></div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">Annulla</button><button class="btn btn--ember" id="m-ok">Aggiungi</button></div>`);
  document.getElementById('m-ok').onclick=()=>{ const g=document.getElementById('m-day').value; closeModal();
    const r=schedaRows(), nuova={giorno:g,esercizio:'',note:'',serie:3,rip:10,peso:0,rest:'1:30'};
    let last=-1; r.forEach((x,i)=>{ if(x.giorno===g) last=i; });
    if(last>=0) r.splice(last+1,0,nuova); else r.push(nuova);
    persist('scheda'); renderAllenamento(); };
}
function addDay(){
  modal(`<h3>Aggiungi giorno</h3>
    <div class="field"><label>Giorno</label><select id="m-day">${GIORNI.map(g=>`<option>${g}</option>`).join('')}</select></div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">Annulla</button>
    <button class="btn btn--ember" id="m-ok">Aggiungi</button></div>`);
  document.getElementById('m-ok').onclick=()=>{ const g=document.getElementById('m-day').value;
    schedaRows().push({giorno:g,esercizio:'',note:'',serie:3,rip:10,peso:0,rest:'1:30'}); persist('scheda'); closeModal(); renderAllenamento(); };
}
function saveSchedaModal(){
  const w=isoWeek(new Date());
  const _pad=n=>String(n).padStart(2,'0'); const wk=w.anno+'-W'+_pad(w.sett);
  modal(`<h3>💾 Salva scheda nello Storico</h3>
    <p class="muted" style="font-size:13px;margin:0 0 8px">Scegli la <b>settimana</b> dal calendario (oppure regola Anno/Settimana). Codice = Anno·100 + Settimana.</p>
    <div class="field"><label>Settimana (calendario)</label><input id="m-week" type="week" value="${wk}" style="width:100%"></div>
    <div class="row"><div class="field"><label>Anno</label><input id="m-anno" type="number" value="${w.anno}"></div>
      <div class="field"><label>Settimana ISO</label><input id="m-sett" type="number" min="1" max="53" value="${w.sett}"></div></div>
    <p class="muted" style="font-size:13px;margin:6px 0 0">Codice scheda: <b id="m-codeprev">${schedaCode(w.anno,w.sett)}</b></p>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">Annulla</button>
      <button class="btn btn--ember" id="m-ok">Salva</button></div>`);
  const _upd=()=>{ const a=+document.getElementById('m-anno').value, st=+document.getElementById('m-sett').value; const cp=document.getElementById('m-codeprev'); if(cp&&a&&st>=1&&st<=53) cp.textContent=schedaCode(a,st); };
  { const wkEl=document.getElementById('m-week'); if(wkEl) wkEl.onchange=()=>{ const m=/^(\d{4})-W(\d{1,2})$/.exec(wkEl.value||''); if(m){ document.getElementById('m-anno').value=+m[1]; document.getElementById('m-sett').value=+m[2]; _upd(); } }; }
  ['m-anno','m-sett'].forEach(id=>{ const el=document.getElementById(id); if(el) el.oninput=()=>{ const a=+document.getElementById('m-anno').value, st=+document.getElementById('m-sett').value; const wkEl=document.getElementById('m-week'); if(wkEl&&a&&st>=1&&st<=53) wkEl.value=a+'-W'+_pad(st); _upd(); }; });
  document.getElementById('m-ok').onclick=()=>{
    const anno=+document.getElementById('m-anno').value, sett=+document.getElementById('m-sett').value;
    if(!anno||sett<1||sett>53){alert('Anno/settimana non validi');return;}
    const code=schedaCode(anno,sett);
    const exist=DOC.storico.filter(r=>(+r.scheda)===code).length;
    if(exist && !confirm(`Esiste già la scheda ${code} (${exist} righe). Le nuove righe verranno AGGIUNTE. Procedo?`)) return;
    const preMax={}; DOC.storico.forEach(r=>{ if(r.esercizio)preMax[r.esercizio]=Math.max(preMax[r.esercizio]||0,+r.peso||0); });
    let added=0; const smap=sedutaMap(schedaRows()); const prs={};
    schedaRows().forEach(r=>{ if(!r.esercizio||!String(r.esercizio).trim())return;
      const pe=+r.peso||0; if(pe>0 && pe>(preMax[r.esercizio]||0)) prs[r.esercizio]=Math.max(prs[r.esercizio]||0,pe);
      DOC.storico.push({scheda:code,esercizio:r.esercizio,seduta:rowSeduta(smap,r),test:!!r.test,
        macro:gruppoOf(r.esercizio),serie:+r.serie||0,rip:+r.rip||0,peso:+r.peso||0,rest:r.rest||'',rir:(r.rir===''||r.rir==null)?null:+r.rir}); added++; });
    /* Foster: committa il carico interno dei giorni allenati in storico_rpe e azzera la bozza RPE della modalità salvata */
    if(useRpeActive()){ const days=schedaDays(schedaRows()), draft=schedaRpe();
      if(!Array.isArray(DOC.storico_rpe)) DOC.storico_rpe=[];
      days.forEach(g=>{ const d=draft[g]||{}, rp=+d.rpe||0, mn=+d.min||0;
        DOC.storico_rpe=DOC.storico_rpe.filter(x=>!((+x.scheda)===code && x.giorno===g));
        if(rp>0&&mn>0) DOC.storico_rpe.push({scheda:code,giorno:g,rpe:rp,min:mn}); });
      DOC.scheda.rpe[schedaMode]={}; persist('corpo'); }
    persist('scheda'); persist('storico'); closeModal();
    const prk=Object.keys(prs);
    let _msg=`✔ Scheda ${code} salvata — ${added} esercizi aggiunti allo Storico.`;
    if(prk.length) _msg+='\n\n🎉 Nuovo record: '+prk.map(k=>k+' '+nf(prs[k],1)+' kg').join(', ');
    alert(_msg);
    if(curTab==='storico')renderStorico(); else renderAllenamento(); updateStatusDots();
  };
}
function undoScheda(){
  if(!DOC.storico.length){alert('Storico vuoto.');return;}
  const maxS=Math.max(...DOC.storico.map(r=>+r.scheda||0));
  const n=DOC.storico.filter(r=>(+r.scheda)===maxS).length;
  if(!confirm(`Elimino l'ultima scheda salvata (${maxS}, ${n} righe)? Operazione non annullabile.`))return;
  DOC.storico=DOC.storico.filter(r=>(+r.scheda)!==maxS); persist('storico');
  alert(`✔ Scheda ${maxS} eliminata (${n} righe).`); if(curTab==='storico')renderStorico(); else renderAllenamento(); updateStatusDots();
}

