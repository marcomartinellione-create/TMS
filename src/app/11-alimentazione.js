/* ════════════════ RENDER: ALIMENTAZIONE ════════════════ */
const NUTR=[['kcal','Kcal',0],['proteine','Prot.',1],['grassi','Grassi',1],['zuccheri','Carbo',1],['fibre','Fibre',1],['saturi','Saturi',1],['colesterolo','Colest.',0],['sodio','Sodio',0]];
function foodVal(nome,grammi,key){ const f=FOODBYNAME[String(nome==null?'':nome).trim()]; if(!f)return 0; const v=f.per100[key]; return v==null?0:v*(+grammi||0)/100; }
function faseTot(rows){ const t={}; NUTR.forEach(([k])=>t[k]=0); rows.forEach(r=>NUTR.forEach(([k])=>t[k]+=foodVal(r.alimento,r.grammi,k))); return t; }
const NUTR_FULL=[
 ['Macronutrienti',[['kcal','Energia','kcal',0],['proteine','Proteine','g',1],['grassi','Grassi','g',1],['saturi','di cui saturi','g',1],['monoinsaturi','monoinsaturi','g',1],['polinsaturi','polinsaturi','g',1],['zuccheri','Carboidrati','g',1],['zucch','di cui zuccheri','g',1],['fibre','Fibre','g',1],['colesterolo','Colesterolo','mg',0]]],
 ['Vitamine',[['vitA','Vit. A','µg',0],['vitB1','Vit. B1','mg',2],['vitB2','Vit. B2','mg',2],['vitB6','Vit. B6','mg',2],['vitB12','Vit. B12','µg',2],['vitC','Vit. C','mg',1],['vitD','Vit. D','µg',1],['vitE','Vit. E','mg',1],['folati','Folati','µg',0]]],
 ['Minerali',[['calcio','Calcio','mg',0],['ferro','Ferro','mg',1],['magnesio','Magnesio','mg',0],['potassio','Potassio','mg',0],['zinco','Zinco','mg',1],['sodio','Sodio','mg',0],['iodio','Iodio','µg',0],['fosforo','Fosforo','mg',0]]],
];
function foodDetail(nome,grammi){
  const fo=FOODBYNAME[String(nome||'').trim()];
  if(!fo) return `<span class="muted">«${esc(nome)}» non è nella banca dati: nessun dettaglio nutrienti.</span>`;
  const g=+grammi||0;
  let html=`<div style="font-size:12px;color:var(--ink-3);margin-bottom:7px">Valori per <b>${nf(g,0)} g</b> di <b>${esc(fo.nome)}</b>${fo.categoria?` · <span class="muted">${esc(fo.categoria)}</span>`:''} <span class="muted">(tra parentesi: per 100 g)</span></div>`;
  html+=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">`;
  NUTR_FULL.forEach(([grp,items])=>{
    html+=`<div><div class="mono" style="font-size:11px;color:var(--orange);border-bottom:1px solid var(--border);margin-bottom:4px;padding-bottom:2px">${grp}</div>`;
    items.forEach(([k,lab,unit,dec])=>{ const p100=fo.per100[k]; const val=p100==null?null:p100*g/100;
      html+=`<div style="display:flex;justify-content:space-between;font-size:12px;padding:1px 0"><span>${lab}</span><span class="mono">${val==null?'—':nf(val,dec)} ${unit} <span class="muted">(${p100==null?'—':nf(p100,dec)})</span></span></div>`; });
    html+=`</div>`;
  });
  return html+`</div>`;
}
let fpFilter='';
/* preferiti alimenti (nomi) per profilo, in DOC.alimentazione.fav */
function foodFavList(){ const A=DOC.alimentazione||{}; if(!Array.isArray(A.fav)) A.fav=[]; return A.fav; }
function foodIsFav(nome){ return foodFavList().indexOf(String(nome||'').trim())>=0; }
function foodToggleFav(nome){ nome=String(nome||'').trim(); if(!nome)return; const f=foodFavList(); const i=f.indexOf(nome); if(i>=0) f.splice(i,1); else f.push(nome); persist('alimentazione'); }
/* alimenti usati di recente: nomi distinti presenti nei pasti delle tre fasi */
function foodRecenti(){ const seen=new Set(), out=[]; ['bulk','mant','cut'].forEach(fa=>((DOC.alimentazione||{})[fa]||[]).forEach(r=>{ const n=String((r&&r.alimento)||'').trim(); if(n&&!seen.has(n)){ seen.add(n); out.push(n); } })); return out; }
/* ricerca «a parole»: tutte le parole digitate presenti in nome+categoria (in qualunque ordine) */
function foodMatch(fo,q){ q=String(q||'').trim().toLowerCase(); if(!q) return true; const hay=(fo.nome+' '+(fo.categoria||'')).toLowerCase(); return q.split(/\s+/).every(t=>hay.includes(t)); }
function openFoodPicker(fase,i){ fpFilter=''; renderFoodPicker(fase,i); }
function renderFoodPicker(fase,i){
  const q=fpFilter, cap=400;
  const rowHtml=fo=>{ const fav=foodIsFav(fo.nome);
    return `<tr class="fp-row" data-nome="${esc(fo.nome)}" style="cursor:pointer">
      <td class="no-print" style="text-align:center;padding:2px;width:24px"><button class="exp-star${fav?' on':''}" data-fav="${esc(fo.nome)}" title="${fav?'togli dai preferiti':'aggiungi ai preferiti'}">${fav?'★':'☆'}</button></td>
      <td class="l">${esc(fo.nome)}</td><td class="l muted" style="font-size:11px">${esc((fo.categoria||'').split('/')[0])}</td>
      <td class="num">${nf(fo.per100.kcal,0)}</td><td class="num">${nf(fo.per100.proteine,1)}</td>
      <td class="num">${nf(fo.per100.grassi,1)}</td><td class="num">${nf(fo.per100.zuccheri,1)}</td><td class="num">${nf(fo.per100.fibre,1)}</td></tr>`; };
  const grp=t=>`<tr class="fp-grp"><td colspan="8" style="background:var(--paper-3);color:var(--ember-2);font-family:var(--font-disp);font-size:12px;padding:5px 10px">${t}</td></tr>`;
  let body='', count;
  if(q){ const list=FOOD.filter(fo=>foodMatch(fo,q)); count=list.length; body=list.slice(0,cap).map(rowHtml).join(''); }
  else {
    const favSet=new Set(foodFavList());
    const favFoods=foodFavList().map(n=>FOODBYNAME[n]).filter(Boolean);
    const rec=[]; foodRecenti().forEach(n=>{ if(rec.length>=12)return; if(!favSet.has(n)){ const fo=FOODBYNAME[n]; if(fo) rec.push(fo); } });
    if(favFoods.length){ body+=grp('★ Preferiti')+favFoods.map(rowHtml).join(''); }
    if(rec.length){ body+=grp('🕐 Recenti')+rec.map(rowHtml).join(''); }
    if(favFoods.length||rec.length) body+=grp('Tutti gli alimenti');
    body+=FOOD.slice(0,cap).map(rowHtml).join(''); count=FOOD.length;
  }
  const m=document.getElementById('modal'); m.style.maxWidth='820px';
  m.innerHTML=`<h3>Scegli un alimento <span class="pill" style="font-weight:400">${count} risultati${count>cap?' · primi '+cap:''}</span></h3>
    <input id="fp-q" class="search" style="width:100%;margin-bottom:8px" placeholder="cerca a parole: nome o categoria…" value="${esc(fpFilter)}">
    <div style="max-height:52vh;overflow:auto;border:1px solid var(--border);border-radius:6px">
    <table><thead><tr><th class="no-print"></th><th class="l">Alimento</th><th class="l">Categoria</th><th>Kcal</th><th>Prot</th><th>Grassi</th><th>Carbo</th><th>Fibre</th></tr></thead>
    <tbody>${body||'<tr><td colspan="8" class="empty">Nessun alimento.</td></tr>'}</tbody></table></div>
    <div class="muted" style="font-size:11px;margin-top:6px">Valori per 100 g · clicca una riga per selezionare · ☆/★ per i preferiti</div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">Chiudi</button></div>`;
  document.getElementById('modal-bk').classList.remove('hidden');
  const qi=document.getElementById('fp-q');
  qi.oninput=e=>{ fpFilter=e.target.value; const pos=qi.selectionStart; renderFoodPicker(fase,i); const ni=document.getElementById('fp-q'); ni.focus(); try{ni.setSelectionRange(pos,pos);}catch(_){} };
  m.querySelectorAll('.exp-star').forEach(s=>s.onclick=ev=>{ ev.stopPropagation(); const sc=m.querySelector('div[style*="overflow:auto"]'); const y=sc?sc.scrollTop:0; foodToggleFav(s.dataset.fav); renderFoodPicker(fase,i); const sc2=document.getElementById('modal').querySelector('div[style*="overflow:auto"]'); if(sc2)sc2.scrollTop=y; });
  m.querySelectorAll('.fp-row').forEach(tr=>tr.onclick=()=>{
    DOC.alimentazione[fase][i].alimento=tr.dataset.nome; persist('alimentazione');
    m.style.maxWidth=''; closeModal(); renderAlimentazione(); });
}
let alimDet=null;
let omsFase='bulk';
const FASE_LAB={bulk:'Bulk',mant:'Mantenimento',cut:'Cut'};
function faseAlimActive(){ const f=DOC.dati_utente&&DOC.dati_utente.faseAlim; return (f==='bulk'||f==='mant'||f==='cut')?f:'bulk'; }
function omsRef(u){ const c=bodyCalc(u); const en=c.metab||2000, peso=+u.peso||70;
  return [
   ['Energia','kcal','target', en,'kcal'],
   ['Proteine','proteine','target', 0.83*peso,'g'],
   ['Grassi totali','grassi','limit', 0.30*en/9,'g'],
   ['di cui saturi','saturi','limit', 0.10*en/9,'g'],
   ['Carboidrati','zuccheri','target', 0.55*en/4,'g'],
   ['Zuccheri (OMS \u226410% E)','zucch','limit', 0.10*en/4,'g'],
   ['Fibre','fibre','target', 25,'g'],
   ['Colesterolo','colesterolo','limit', 300,'mg'],
   ['Sodio','sodio','limit', 2000,'mg'],
   ['Vit. A','vitA','target', 600,'µg'],
   ['Vit. B1','vitB1','target', 1.2,'mg'],
   ['Vit. B2','vitB2','target', 1.3,'mg'],
   ['Vit. B6','vitB6','target', 1.3,'mg'],
   ['Vit. B12','vitB12','target', 2.4,'µg'],
   ['Vit. C','vitC','target', 45,'mg'],
   ['Vit. D','vitD','target', 15,'µg'],
   ['Vit. E','vitE','target', 10,'mg'],
   ['Folati','folati','target', 400,'µg'],
   ['Calcio','calcio','target', 1000,'mg'],
   ['Ferro','ferro','target', 11,'mg'],
   ['Magnesio','magnesio','target', 350,'mg'],
   ['Potassio','potassio','target', 3500,'mg'],
   ['Zinco','zinco','target', 11,'mg'],
   ['Iodio','iodio','target', 150,'µg'],
   ['Fosforo','fosforo','target', 700,'mg'],
  ];
}
function omsRenderSection(){
  const u=DOC.dati_utente; const refs=omsRef(u); const fase=omsFase;
  const rows=DOC.alimentazione[fase]||[];
  let body='';
  refs.forEach(([lab,key,type,val,unit])=>{
    const day=rows.reduce((a,r)=>a+foodVal(r.alimento,r.grammi,key),0);
    const week=day*7, refw=val*7, pct=refw>0? week/refw*100:0;
    const ok = type==='limit'? pct<=100 : pct>=90;
    const col = ok? 'var(--ok)' : (type==='limit'? 'var(--danger)' : (pct<60?'var(--danger)':'var(--gold-2)'));
    const barw=Math.max(2,Math.min(pct,100)), dec=val<10?1:0;
    body+=`<tr><td class="l">${lab} ${type==='limit'?'<span class="muted" title="limite massimo da non superare">(max)</span>':''}</td>
      <td class="num">${nf(week,dec)} ${unit}</td><td class="num muted">${nf(refw,dec)} ${unit}</td>
      <td class="num" style="color:${col};font-weight:600">${nf(pct,0)}%</td>
      <td style="width:130px"><div style="background:var(--paper-3);border-radius:3px;height:9px;overflow:hidden"><div style="width:${barw}%;height:100%;background:${col}"></div></div></td></tr>`;
  });
  return `<div class="sec">▌ Indice nutrienti settimanale · riferimenti OMS/FAO <span class="pill no-print" style="margin-left:auto">fase ${FASE_LAB[fase]||fase}</span></div>
    <div class="tbl-wrap"><table><thead><tr><th class="l">Nutriente</th><th>Settimana</th><th>Riferimento</th><th>Indice</th><th>—</th></tr></thead><tbody>${body}</tbody></table></div>
    <div class="callout callout--info"><div>📐 Valori settimanali = piano giornaliero (fase ${fase}) × 7, (fase ${FASE_LAB[fase]||fase}) confrontati con i riferimenti <b>OMS/FAO</b> per adulto (energia e proteine personalizzati su fabbisogno e peso). I nutrienti <b>(max)</b> sono limiti da non superare. Riferimenti indicativi: non sostituiscono un parere medico/nutrizionale.</div></div>`;
}
function renderAlimentazione(){
  const A=DOC.alimentazione; A.bulk=A.bulk||[]; A.mant=A.mant||[]; A.cut=A.cut||[];
  const fase=faseAlimActive(); omsFase=fase; const tF=faseTot(A[fase]);
  function faseTable(fase,rows){
    const meals=[]; rows.forEach(r=>{ const p=((r.pasto||'').trim())||'Senza pasto'; if(!meals.includes(p))meals.push(p); });
    let body='';
    meals.forEach((meal,mi)=>{
      const idxs=rows.map((r,i)=>i).filter(i=>((((rows[i].pasto||'').trim())||'Senza pasto')===meal));
      let mk=0; idxs.forEach(i=>mk+=foodVal(rows[i].alimento,rows[i].grammi,'kcal'));
      body+=`<tr class="day-sep"><td colspan="7">▌ ${esc(meal)} <span style="opacity:.85;font-family:var(--font-mono);font-size:11px">· ${nf(mk,0)} kcal</span>
        <button class="btn btn--sm no-print" data-mealup data-fase="${fase}" data-meal="${esc(meal)}" title="sposta pasto su"${mi===0?' disabled':''} style="margin-left:8px">▲</button>
        <button class="btn btn--sm no-print" data-mealdn data-fase="${fase}" data-meal="${esc(meal)}" title="sposta pasto giù"${mi===meals.length-1?' disabled':''}>▼</button>
        <button class="btn btn--sm no-print" data-mealedit data-fase="${fase}" data-meal="${esc(meal)}" title="rinomina pasto">✎</button>
        <button class="btn btn--sm no-print" data-mealadd data-fase="${fase}" data-meal="${esc(meal)}" title="aggiungi alimento a questo pasto">＋</button>
        <button class="btn btn--sm btn--danger no-print" data-mealdel data-fase="${fase}" data-meal="${esc(meal)}" title="elimina pasto">🗑</button></td></tr>`;
      idxs.forEach(i=>{ const r=rows[i]; const known=!!FOODBYNAME[String(r.alimento||'').trim()];
        body+=`<tr data-fase="${fase}" data-i="${i}">
          <td class="l"><button class="btn btn--sm no-print food-pick" data-fase="${fase}" data-i="${i}" style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${r.alimento?'':'color:var(--ink-4)'}">${r.alimento?esc(r.alimento):'＋ scegli alimento…'}</button>${r.alimento&&!known?' <span class="pill" title="non nella banca dati">?</span>':''}</td>
          <td><input class="cell-in" type="number" min="0" data-f="grammi" value="${r.grammi??''}" style="width:62px"></td>
          <td class="num cell-out">${nf(foodVal(r.alimento,r.grammi,'kcal'),0)}</td>
          <td class="num cell-calc">${nf(foodVal(r.alimento,r.grammi,'proteine'),1)}</td>
          <td class="num cell-calc">${nf(foodVal(r.alimento,r.grammi,'grassi'),1)}</td>
          <td class="num cell-calc">${nf(foodVal(r.alimento,r.grammi,'zuccheri'),1)}</td>
          <td style="white-space:nowrap">${r.alimento?`<button class="btn btn--sm no-print food-det" data-fase="${fase}" data-i="${i}" title="micro e macro">${alimDet===fase+':'+i?'▾':'▸'}</button>`:''}<button class="btn btn--sm btn--danger no-print" data-del="${fase}:${i}" title="elimina alimento">✕</button></td></tr>`;
        if(alimDet===fase+':'+i && r.alimento){
          body+=`<tr><td colspan="7" style="background:var(--paper-2);padding:11px 14px">${foodDetail(r.alimento,r.grammi)}</td></tr>`;
        }
      });
    });
    const t=faseTot(rows);
    return `<div class="tbl-wrap"><table>
      <thead><tr><th class="l">Alimento</th><th>g</th><th>Kcal</th><th>Prot</th><th>Grassi</th><th>Carbo</th><th class="no-print"></th></tr></thead>
      <tbody>${body||'<tr><td colspan="7" class="empty">Nessun alimento. Aggiungi un pasto qui sotto.</td></tr>'}</tbody>
      <tfoot><tr style="background:var(--paper-3);font-weight:600"><td class="l grp-tot">Totale ${fase}</td><td></td>
        <td class="num grp-tot">${nf(t.kcal,0)}</td><td class="num">${nf(t.proteine,1)}</td><td class="num">${nf(t.grassi,1)}</td><td class="num">${nf(t.zuccheri,1)}</td><td class="no-print"></td></tr></tfoot>
      </table></div>
      <div class="row-add no-print"><button class="btn" data-add="${fase}">＋ Pasto</button></div>`;
  }
  const omsSection=omsRenderSection();
  /* periodi alimentari registrati (per il tab Analisi) */
  const periodi=A.periodi||[];
  const perRows=periodi.map((p,i)=>`<tr><td><span class="pill">${esc(FASE_LAB[p.fase]||p.fase)}</span></td>
     <td>${esc(p.dal||'')}</td><td>${esc(p.al||'')}</td><td class="num">${nf(kcalPiano(p.righe),0)}</td><td class="num">${(p.righe||[]).length}</td>
     <td class="no-print"><button class="btn btn--sm btn--danger" data-perdel="${i}" title="elimina periodo">✕</button></td></tr>`).join('');
  const perSection=`
   <div class="sec" style="margin-top:18px">▌ Periodi <span class="pill">${periodi.length}</span></div>
   <div class="callout callout--info no-print"><div>📅 Registra il piano con le sue <b>date</b> (dal → al): i periodi alimentano i grafici del tab <b>📊 Analisi</b> (timeline, bilancio calorico, confronto fasi). Ogni periodo salva una <b>fotografia</b> del piano: modificare il piano dopo non cambia i periodi già registrati.</div></div>
   <div class="tbl-wrap"><table><thead><tr><th>Fase</th><th>Dal</th><th>Al</th><th>kcal/giorno</th><th>alimenti</th><th class="no-print"></th></tr></thead>
     <tbody>${perRows||'<tr><td colspan="6" class="empty">Nessun periodo registrato.</td></tr>'}</tbody></table></div>
   <div class="bar no-print"><button class="btn btn--ember" id="per-add">📅 Registra il piano attuale come periodo…</button> <button class="btn" onclick="showTab('analisi')">📊 Vai all'Analisi</button></div>`;
  document.getElementById('panel-alimentazione').innerHTML=`
   <div class="callout"><div>🍖 Banca dati <b>${FOOD.length}</b> alimenti. Clicca <b>＋ scegli alimento…</b> per selezionare dalla tabella completa (con macro). Usa <b>▸</b> per i micro/macro. Scegli qui sotto la <b>fase</b> del piano: le fasi non attive restano salvate ma non mostrate.</div></div>
   <div class="bar no-print" style="margin-bottom:6px"><span class="muted mono" style="font-size:11px;align-self:center">Fase del piano:</span>${['bulk','mant','cut'].map(f=>`<button class="btn btn--sm ${f===fase?'btn--ember':''}" data-fasesel="${f}">${FASE_LAB[f]}</button>`).join('')}<button class="btn btn--gold btn--sm" id="dieta-pdf-btn" onclick="printDieta()" style="margin-left:auto" title="Stampa il piano della fase attiva in PDF A4 orizzontale (da dare al cliente)">⬇ Stampa dieta (PDF A4)</button></div>
   <div class="sec">▌ Fase ${FASE_LAB[fase]} <span class="pill">${nf(tF.kcal,0)} kcal · P ${nf(tF.proteine,0)} · G ${nf(tF.grassi,0)} · C ${nf(tF.zuccheri,0)}</span></div>
   ${faseTable(fase,A[fase])}${perSection}${omsSection}`;
  document.querySelectorAll('#panel-alimentazione input').forEach(inp=>inp.addEventListener('input',e=>{
    const tr=e.target.closest('tr'); const fase=tr.dataset.fase, i=+tr.dataset.i, f=e.target.dataset.f;
    let v=e.target.value; if(f==='grammi')v=v===''?'':+v;
    DOC.alimentazione[fase][i][f]=v; persist('alimentazione');
    /* non re-renderizzare mentre un modale è aperto (es. nome nuovo pasto): eviterebbe di
       ricostruire il pannello sotto la digitazione */
    clearTimeout(rerenderT); rerenderT=setTimeout(()=>{ if(document.getElementById('modal-bk').classList.contains('hidden')) renderAlimentazione(); },500);
  }));
  document.querySelectorAll('#panel-alimentazione [data-fasesel]').forEach(b=>b.onclick=()=>{ if(!DOC.dati_utente)DOC.dati_utente={}; DOC.dati_utente.faseAlim=b.dataset.fasesel; persist('corpo'); renderAlimentazione(); });
  document.querySelectorAll('#panel-alimentazione [data-mealup]').forEach(b=>b.onclick=()=>spostaPasto(b.dataset.fase,b.dataset.meal,-1));
  document.querySelectorAll('#panel-alimentazione [data-mealdn]').forEach(b=>b.onclick=()=>spostaPasto(b.dataset.fase,b.dataset.meal,1));
  document.querySelectorAll('#panel-alimentazione .food-pick').forEach(b=>b.onclick=()=>openFoodPicker(b.dataset.fase,+b.dataset.i));
  document.querySelectorAll('#panel-alimentazione .food-det').forEach(b=>b.onclick=()=>{ const k=b.dataset.fase+':'+b.dataset.i; alimDet=(alimDet===k?null:k); renderAlimentazione(); });
  document.querySelectorAll('#panel-alimentazione [data-add]').forEach(b=>b.onclick=()=>chiediTesto('Nome del pasto (es. Colazione, Pranzo, Spuntino)','',v=>{
    const name=(v||'').trim(); if(!name)return;
    DOC.alimentazione[b.dataset.add].push({pasto:name,alimento:'',grammi:100}); persist('alimentazione'); renderAlimentazione(); }));
  document.querySelectorAll('#panel-alimentazione [data-mealadd]').forEach(b=>b.onclick=()=>{
    const meal=b.dataset.meal==='Senza pasto'?'':b.dataset.meal;
    DOC.alimentazione[b.dataset.fase].push({pasto:meal,alimento:'',grammi:100}); persist('alimentazione'); renderAlimentazione(); });
  document.querySelectorAll('#panel-alimentazione [data-mealedit]').forEach(b=>b.onclick=()=>{
    const fase=b.dataset.fase, old=b.dataset.meal;
    chiediTesto('Rinomina pasto', old==='Senza pasto'?'':old, raw=>{
      const nn=String(raw==null?'':raw).trim();
      DOC.alimentazione[fase].forEach(r=>{ const cur=((r.pasto||'').trim())||'Senza pasto'; if(cur===old) r.pasto=nn; });
      persist('alimentazione'); renderAlimentazione(); }); });
  document.querySelectorAll('#panel-alimentazione [data-mealdel]').forEach(b=>b.onclick=()=>{
    const fase=b.dataset.fase, meal=b.dataset.meal;
    if(!confirm('Eliminare il pasto «'+meal+'» e tutti i suoi alimenti?'))return;
    DOC.alimentazione[fase]=DOC.alimentazione[fase].filter(r=>((((r.pasto||'').trim())||'Senza pasto')!==meal)); persist('alimentazione'); renderAlimentazione(); });
  { const pa=document.getElementById('per-add'); if(pa) pa.onclick=registraPeriodo; }
  document.querySelectorAll('#panel-alimentazione [data-perdel]').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.perdel; const p=(DOC.alimentazione.periodi||[])[i]; if(!p) return;
    if(!confirm('Eliminare il periodo '+(FASE_LAB[p.fase]||p.fase)+' '+p.dal+' → '+p.al+'?')) return;
    DOC.alimentazione.periodi.splice(i,1); persist('alimentazione'); renderAlimentazione(); });
  document.querySelectorAll('#panel-alimentazione [data-del]').forEach(b=>b.onclick=()=>{
    const [fase,i]=b.dataset.del.split(':'); DOC.alimentazione[fase].splice(+i,1); persist('alimentazione'); renderAlimentazione(); });
}


/* riordina un pasto su/giù nella fase: sposta in blocco tutte le sue righe (mantenendo
   l'ordine interno), scambiando la sua posizione con quella del pasto adiacente. */
function spostaPasto(fase, meal, dir){
  const rows=DOC.alimentazione[fase]||[]; const mealOf=r=>((((r.pasto||'').trim())||'Senza pasto'));
  const order=[]; rows.forEach(r=>{ const m=mealOf(r); if(!order.includes(m)) order.push(m); });
  const idx=order.indexOf(meal), j=idx+dir; if(idx<0||j<0||j>=order.length) return;
  const newOrder=order.slice(); const t=newOrder[idx]; newOrder[idx]=newOrder[j]; newOrder[j]=t;
  const byMeal={}; order.forEach(m=>byMeal[m]=[]); rows.forEach(r=>byMeal[mealOf(r)].push(r));
  const out=[]; newOrder.forEach(m=>byMeal[m].forEach(r=>out.push(r)));
  DOC.alimentazione[fase]=out; persist('alimentazione'); renderAlimentazione();
}
/* ── Stampa della dieta in PDF A4 ORIZZONTALE (landscape) ──────────────────────────────
   Riusa il generatore PDF del Report (buildReportUnits + splitTable + html2canvas +
   imagesToPdf in modalità landscape): impagina il piano della FASE ATTIVA, pasto per pasto,
   con i totali per pasto e il totale giornaliero. Una pagina da appendere/dare al cliente. */
function dietaPrintHTML(){
  const fase=faseAlimActive(); const rows=(DOC.alimentazione&&DOC.alimentazione[fase])||[];
  const meals=[]; rows.forEach(r=>{ const p=((r.pasto||'').trim())||'Senza pasto'; if(!meals.includes(p))meals.push(p); });
  let body='';
  meals.forEach(meal=>{
    const idxs=rows.map((r,i)=>i).filter(i=>((((rows[i].pasto||'').trim())||'Senza pasto')===meal));
    let mk=0; idxs.forEach(i=>mk+=foodVal(rows[i].alimento,rows[i].grammi,'kcal'));
    body+=`<tr class="day-sep"><td colspan="7">▌ ${esc(meal)} · ${nf(mk,0)} kcal</td></tr>`;
    idxs.forEach(i=>{ const r=rows[i];
      body+=`<tr><td class="l">${r.alimento?esc(r.alimento):'—'}</td>`+
        `<td class="num">${nf(r.grammi,0)}</td>`+
        `<td class="num">${nf(foodVal(r.alimento,r.grammi,'kcal'),0)}</td>`+
        `<td class="num">${nf(foodVal(r.alimento,r.grammi,'proteine'),1)}</td>`+
        `<td class="num">${nf(foodVal(r.alimento,r.grammi,'grassi'),1)}</td>`+
        `<td class="num">${nf(foodVal(r.alimento,r.grammi,'zuccheri'),1)}</td>`+
        `<td class="num">${nf(foodVal(r.alimento,r.grammi,'fibre'),1)}</td></tr>`;
    });
  });
  const t=faseTot(rows); const lab=esc(FASE_LAB[fase]||fase);
  const head=`<thead><tr><th class="l">Alimento</th><th>g</th><th>Kcal</th><th>Prot</th><th>Grassi</th><th>Carbo</th><th>Fibre</th></tr></thead>`;
  const foot=`<tfoot><tr style="font-weight:600;background:#efe6d2"><td class="l">Totale giornaliero</td><td></td><td class="num">${nf(t.kcal,0)}</td><td class="num">${nf(t.proteine,1)}</td><td class="num">${nf(t.grassi,1)}</td><td class="num">${nf(t.zuccheri,1)}</td><td class="num">${nf(t.fibre,1)}</td></tr></tfoot>`;
  return `<h1>Piano alimentare — ${esc(profNome()||'')}</h1>`+
    `<div class="muted" style="margin:-4px 0 10px">Fase ${lab} · ${esc(new Date().toLocaleDateString('it-IT'))}</div>`+
    `<div class="rep-sec"><div class="sec">▌ Piano della fase ${lab}</div>`+
    `<div class="tbl-wrap"><table>${head}<tbody>${body||'<tr><td colspan="7" class="empty">Nessun alimento nel piano.</td></tr>'}</tbody>${foot}</table></div></div>`;
}
async function printDieta(){
  const fase=faseAlimActive(); const rows=(DOC.alimentazione&&DOC.alimentazione[fase])||[];
  if(!rows.some(r=>r&&r.alimento&&String(r.alimento).trim())){ alert('Il piano della fase attiva è vuoto: niente da stampare.'); return; }
  if(typeof html2canvas!=='function'){ alert('Generatore PDF non disponibile in questa copia.'); return; }
  const btn=document.getElementById('dieta-pdf-btn'); const blab=btn?btn.innerHTML:''; if(btn){ btn.innerHTML='⏳ Genero PDF…'; btn.disabled=true; }
  const stage=document.createElement('div'); stage.id='pdf-stage'; stage.className='land';
  try{
    document.body.appendChild(stage);
    const src=document.createElement('div'); src.className='rep-doc'; src.innerHTML=dietaPrintHTML();
    const units=buildReportUnits(document, src);
    const probe=document.createElement('div'); probe.style.cssText='position:absolute;visibility:hidden;height:100mm'; stage.appendChild(probe);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const pxPerMm=(probe.getBoundingClientRect().height||377.95)/100; stage.removeChild(probe);
    const PAD=13, USABLE=210-PAD-PAD-4, contentPx=USABLE*pxPerMm, padTopPx=PAD*pxPerMm; /* altezza utile A4 orizzontale */
    const pages=[]; let pg=null; const newPage=()=>{ pg=document.createElement('div'); pg.className='pg'; stage.appendChild(pg); pages.push(pg); };
    newPage();
    units.forEach(node=>{ pg.appendChild(node);
      const used=node.getBoundingClientRect().bottom - pg.getBoundingClientRect().top - padTopPx;
      if(used>contentPx && pg.childElementCount>1){ pg.removeChild(node); newPage(); pg.appendChild(node); }
    });
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const images=[];
    for(const p of pages){
      const canvas=await html2canvas(p,{scale:2,backgroundColor:'#ffffff',logging:false,useCORS:true,
        onclone:(doc)=>{ try{ doc.documentElement.setAttribute('data-theme','giorno'); }catch(e){} }});
      const url=canvas.toDataURL('image/jpeg',0.92);
      images.push({bytes:dataUrlToBytes(url), w:canvas.width, h:canvas.height});
    }
    const pdf=imagesToPdf(images, true);  /* true = A4 orizzontale */
    const nome=String(profNome()||'TMS').replace(/[^\w\-]+/g,'_')||'TMS';
    const blob=new Blob([pdf],{type:'application/pdf'}); const u=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=u; a.download='Dieta_'+nome+'.pdf'; document.body.appendChild(a); a.click();
    setTimeout(()=>{ try{ URL.revokeObjectURL(u); }catch(e){} a.remove(); }, 1500);
  }catch(e){ alert('Errore nella generazione del PDF: '+e.message); }
  finally{ try{ if(stage.parentNode) document.body.removeChild(stage); }catch(e){} if(btn){ btn.innerHTML=blab; btn.disabled=false; } }
}
/* registra il piano della fase scelta come PERIODO datato (fotografia per il tab Analisi) */
function registraPeriodo(){
  const faseAtt=(DOC.dati_utente&&DOC.dati_utente.faseAlim)||'bulk';
  const fmt=d=>d.toISOString().slice(0,10);
  const oggi=new Date(), fa=new Date(); fa.setDate(fa.getDate()-28);
  modal(`<h3>Registra periodo alimentare</h3>
   <div class="callout callout--info"><div>📸 Salva una <b>fotografia</b> del piano della fase scelta con le date in cui lo segui. I periodi alimentano i grafici del tab <b>📊 Analisi</b>.</div></div>
   <div class="row">
    <div class="field"><label>Fase</label><select id="per-fase">${['bulk','mant','cut'].map(f=>`<option value="${f}"${f===faseAtt?' selected':''}>${FASE_LAB[f]||f}</option>`).join('')}</select></div>
    <div class="field"><label>Dal</label><input type="date" id="per-dal" value="${fmt(fa)}"></div>
    <div class="field"><label>Al</label><input type="date" id="per-al" value="${fmt(oggi)}"></div></div>
   <div class="modal__actions"><button class="btn" onclick="closeModal()">Annulla</button><button class="btn btn--ember" id="per-ok">Registra</button></div>`);
  document.getElementById('per-ok').onclick=()=>{
    const fase=document.getElementById('per-fase').value;
    const dal=document.getElementById('per-dal').value, al=document.getElementById('per-al').value;
    if(!dal||!al){ alert('Servono entrambe le date.'); return; }
    if(dal>al){ alert('La data di inizio è dopo quella di fine.'); return; }
    const righe=((DOC.alimentazione||{})[fase]||[]).filter(r=>r&&r.alimento&&String(r.alimento).trim())
      .map(r=>({alimento:String(r.alimento).trim(), grammi:+r.grammi||0}));
    if(!righe.length){ alert('Il piano della fase '+(FASE_LAB[fase]||fase)+' è vuoto: niente da registrare.'); return; }
    if(!Array.isArray(DOC.alimentazione.periodi)) DOC.alimentazione.periodi=[];
    /* safe check: sovrapposizione date con periodi già registrati */
    const overlap=DOC.alimentazione.periodi.filter(p=>!(al<p.dal || dal>p.al));
    if(overlap.length && !confirm('⚠ Le date si sovrappongono a '+overlap.length+' periodo/i già registrati (nelle settimane in comune vale l\'ultimo registrato). Continuo?')) return;
    DOC.alimentazione.periodi.push({id:Date.now().toString(36), fase:fase, dal:dal, al:al, righe:righe});
    DOC.alimentazione.periodi.sort((a,b)=>a.dal<b.dal?-1:1);
    persist('alimentazione'); closeModal(); renderAlimentazione();
    alert('✔ Periodo registrato: '+(FASE_LAB[fase]||fase)+' '+dal+' → '+al+' ('+righe.length+' alimenti, '+nf(kcalPiano(righe),0)+' kcal/giorno).');
  };
}
