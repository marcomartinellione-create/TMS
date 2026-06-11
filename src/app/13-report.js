/* ════════════════ RENDER: REPORT ════════════════ */
function renderReport(){
  const u=DOC.dati_utente; const c=bodyCalc(u);
  const def={profilo:true,riepilogo:true,scheda:true,andamento:true,progressione:true,record:true,alimentazione:true,analisi:true,note:true,obiettivo:(u.obiettivo||''),nota:''};
  u.report=Object.assign({},def,u.report||{}); const R=u.report;
  const ag=schedeAggr(); const last=ag.length?ag[ag.length-1]:null, prev=ag.length>1?ag[ag.length-2]:null;
  const labels=ag.map(a=>schedaLabel(a.scheda));
  const dTL=(last&&prev&&prev.tl)?(last.tl/prev.tl-1)*100:0;
  const lastPct=last&&last.pctN?last.pctSum/last.pctN:0;
  const acwr=(()=>{ if(!ag.length)return null; const w=ag.slice(-4); const cc=w.reduce((s,x)=>s+x.tl,0)/w.length; return cc? last.tl/cc:null; })();
  const prog=DOC.scheda.settimanale||[]; const smap=sedutaMap(prog);
  let progTL=0; prog.forEach(r=>{ if(r.esercizio) progTL+=sTL(r); });
  let progBody='',lastDay=null; prog.forEach(r=>{ if(!r.esercizio)return; if(r.giorno&&r.giorno!==lastDay){lastDay=r.giorno; progBody+=`<tr class="day-sep"><td colspan="6">▌ ${esc(r.giorno)}</td></tr>`;} const p=sPct(r),fa=fascia(p),sd=rowSeduta(smap,r),tgt=(esLookup(r.esercizio)||{}).target||''; progBody+=`<tr><td class="l">${esc(r.esercizio)}${sd>1?` <span class="pill">S${sd}</span>`:''}</td><td class="l muted" style="font-size:11px">${esc(tgt)}</td><td class="num">${nf(r.serie,0)}×${nf(r.rip,0)}</td><td class="num">${nf(r.peso,1)}</td><td class="num">${esc(r.rest||'')}</td><td><span class="fascia ${fa[1]}">${fa[0]}</span></td></tr>`; });
  const A=DOC.alimentazione; const faseR=faseAlimActive(), tR=faseTot(A[faseR]||[]);
  const io=DOC.storico_io; const prs=prList().slice(0,8);
  const mainLifts=['Panca piana bilanciere','Squat bilanciere','Stacco da terra','Military press / Overhead press','Trazioni alla sbarra'].filter(n=>DOC.storico.some(r=>r.esercizio===n));
  const toggles=[['profilo','Profilo & corpo'],['riepilogo','Riepilogo allenamento'],['scheda','Scheda di allenamento'],['andamento','Grafici di andamento'],['progressione','Progressione esercizi'],['record','Record personali'],['alimentazione','Alimentazione'],['analisi','Dieta × allenamento'],['note','Note del coach']];
  const ctrl=`<div class="bar no-print" style="flex-wrap:wrap">
     <div class="field" style="flex:1;min-width:240px"><label>Obiettivo del cliente (in copertina)</label><input id="rep-goal" value="${esc(R.obiettivo||'')}" placeholder="es. ricomposizione corporea, +forza panca…" style="width:100%"></div>
     <button class="btn btn--gold" id="rep-pdf-btn" onclick="printReport()">⬇ Scarica PDF (A4)</button>
     <button class="btn" id="rep-html-btn" onclick="exportDigitalReport()" title="HTML per smartphone, con i video incorporati">📱 Report digitale</button>
     <label class="pill" style="cursor:pointer;align-self:center;display:inline-flex;align-items:center;gap:5px" title="Incorpora i video nel file (più pesante)"><input type="checkbox" id="rep-incl-vid" checked style="width:auto;flex:0 0 auto"> video</label></div>
   <div class="bar no-print" style="flex-wrap:wrap;gap:8px;align-items:center"><span class="muted mono" style="font-size:11px">Sezioni:</span>${toggles.map(([k,lab])=>`<label class="pill" style="cursor:pointer"><input type="checkbox" data-rep="${k}" ${R[k]?'checked':''} style="vertical-align:-1px;margin-right:4px">${lab}</label>`).join('')}</div>`;
  const S=[];
  S.push(`<div class="rep-sec" style="border-bottom:2px solid var(--gold-2);padding-bottom:10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:flex-start">
     <div><h1 style="font-size:26px;color:var(--ember-2);margin:0">Report di Allenamento</h1>
       <div class="muted mono" style="font-size:12px">${esc(u.nome||profNome()||'Atleta')}${u.cognome?' '+esc(u.cognome):''} · ${new Date().toLocaleDateString('it-IT')}${last?' · scheda '+last.scheda:''}</div>
       ${R.obiettivo?`<div style="margin-top:6px"><b>Obiettivo:</b> ${esc(R.obiettivo)}</div>`:''}</div>
     <div style="text-align:right;font-family:var(--font-disp);color:var(--gold-2);font-size:13px;white-space:nowrap">✦ Training Monitor System</div></div>`);
  if(R.profilo){ S.push(`<div class="rep-sec"><div class="sec">▌ Profilo & composizione corporea</div>
     <div class="cards">
       <div class="card"><div class="card__k">Età</div><div class="card__v">${nf(etaOf(u),0)}<small> anni</small></div></div>
       <div class="card"><div class="card__k">Altezza</div><div class="card__v">${nf(u.altezza,0)}<small> cm</small></div></div>
       <div class="card k--ember"><div class="card__k">Peso</div><div class="card__v">${io.length?nf(io[io.length-1].peso,1):nf(u.peso,1)}<small> kg</small></div></div>
       <div class="card"><div class="card__k">BMI</div><div class="card__v">${nf(c.bmi,1)}</div><div class="card__sub">${c.bmi<18.5?'sottopeso':c.bmi<25?'normopeso':c.bmi<30?'sovrappeso':'obesità'}</div></div>
       <div class="card k--ok"><div class="card__k">Massa magra</div><div class="card__v">${nf(c.magraKg,1)}<small> kg</small></div></div>
       <div class="card k--danger"><div class="card__k">Massa grassa</div><div class="card__v">${nf(c.grassaKg,1)}<small> kg</small></div><div class="card__sub">${nf((u.massa_grassa||0)*100,1)}%</div></div>
       <div class="card k--violet"><div class="card__k">Fabbisogno</div><div class="card__v">${nf(c.metab,0)}<small> kcal</small></div></div>
     </div>
     ${io.length>1?`<div class="chart-box" style="margin-top:10px"><h4>Andamento peso</h4>${lineChart([{name:'Peso',color:'var(--orange-b)',data:io.map(r=>({x:schedaLabel(r.scheda),y:+r.peso}))}],{h:140})}</div>`:''}
     <p class="muted" style="font-size:12px">Il <b>BMI</b> mette in rapporto peso e altezza; <b>massa magra/grassa</b> e <b>fabbisogno calorico</b> orientano l'alimentazione.</p></div>`); }
  if(R.riepilogo && last){ S.push(`<div class="rep-sec"><div class="sec">▌ Riepilogo allenamento</div>
     <div class="cards">
       <div class="card k--ember"><div class="card__k">Carico (TL) ultima scheda</div><div class="card__v">${nfk(last.tl)}</div></div>
       <div class="card ${dTL>=0?'k--ok':'k--danger'}"><div class="card__k">Variazione vs prec.</div><div class="card__v">${dTL>=0?'▲':'▼'} ${nf(Math.abs(dTL),1)}%</div></div>
       <div class="card"><div class="card__k">Intensità media</div><div class="card__v">${nf(lastPct,1)}%</div><div class="card__sub">${fascia(lastPct)[0]}</div></div>
       <div class="card ${acwr==null?'':(acwr>=0.8&&acwr<=1.3?'k--ok':'k--danger')}"><div class="card__k">Sicurezza carico</div><div class="card__v">${acwr==null?'—':nf(acwr,2)}</div><div class="card__sub">ACWR · ${acwr==null?'':(acwr<0.8?'scarico':acwr<=1.3?'ottimale':'alto')}</div></div>
     </div>
     <p class="muted" style="font-size:12px">Il <b>carico (TL)</b> riassume il lavoro svolto: più cresce nel tempo, più c'è progressione. La <b>sicurezza carico (ACWR)</b> indica se l'aumento è sostenibile (ideale 0.8–1.3).</p></div>`); }
  if(R.scheda && prog.some(r=>r.esercizio)){ S.push(`<div class="rep-sec big"><div class="sec">▌ Scheda di allenamento <span class="pill" style="margin-left:auto">carico piano ${nfk(progTL)}</span></div>
     <div class="tbl-wrap"><table style="table-layout:fixed;width:100%"><colgroup><col style="width:24%"><col style="width:32%"><col style="width:12%"><col style="width:10%"><col style="width:9%"><col style="width:13%"></colgroup><thead><tr><th class="l">Esercizio</th><th class="l">Target muscolare</th><th>Serie×Rip</th><th>Peso</th><th>Rec.</th><th>Zona</th></tr></thead><tbody>${progBody}</tbody></table></div></div>`); }
  if(R.andamento && ag.length){ S.push(`<div class="rep-sec"><div class="sec">▌ Andamento del carico</div>
     <div class="chart-grid">
       <div class="chart-box"><h4>Carico (TL) nel tempo</h4>${lineChart([{name:'TL',color:'var(--orange-b)',data:ag.map(a=>({x:schedaLabel(a.scheda),y:a.tl||null}))}],{labels,h:160,fmt:nfk})}</div>
       <div class="chart-box"><h4>Equilibrio volume (serie)</h4>${radarChart(GRUPPI.map(g=>({label:g,value:last.sets[g]||0})),{h:230})}</div>
     </div>
     <p class="muted" style="font-size:12px">A sinistra la crescita del carico settimana dopo settimana; a destra quanto è bilanciato il lavoro tra i gruppi muscolari.</p></div>`); }
  if(R.progressione && mainLifts.length){ const cols=['#c2500a','#d4a017','#2f7d4f','#7a3ea8','#991b1b'];
     const series=mainLifts.map((n,idx)=>({name:n.replace(' / Overhead press',''),color:cols[idx%cols.length],data:exProgression(n).map(p=>({x:schedaLabel(p.scheda),y:p.rm||null}))}));
     S.push(`<div class="rep-sec"><div class="sec">▌ Progressione di forza (1RM stimato)</div>
     <div class="chart-box">${lineChart(series,{h:210})}</div>
     <p class="muted" style="font-size:12px">Massimale stimato sui principali esercizi: una linea che sale significa aumento di forza.</p></div>`); }
  if(R.record){ S.push(`<div class="rep-sec big"><div class="sec">▌ Record personali (carico massimo)</div>
     <div class="tbl-wrap"><table><thead><tr><th class="l">Esercizio</th><th>Carico max</th><th>Rip.</th><th>Scheda</th></tr></thead><tbody>${prs.map(p=>`<tr><td class="l">${esc(p.nome)}</td><td class="num cell-out">${nf(p.peso,1)} kg</td><td class="num">${nf(p.rip,0)}</td><td class="num">${p.scheda}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">—</td></tr>'}</tbody></table></div></div>`); }
  if(R.alimentazione){ S.push(`<div class="rep-sec"><div class="sec">▌ Quadro alimentare · fase ${FASE_LAB[faseR]||faseR} (piano giornaliero)</div>
     <div class="tbl-wrap"><table><thead><tr><th class="l">Fase</th><th>Kcal</th><th>Proteine</th><th>Grassi</th><th>Carboidrati</th><th>Fibre</th></tr></thead><tbody>
       <tr><td class="l">${FASE_LAB[faseR]||faseR}</td><td class="num cell-out">${nf(tR.kcal,0)}</td><td class="num">${nf(tR.proteine,1)}</td><td class="num">${nf(tR.grassi,1)}</td><td class="num">${nf(tR.zuccheri,1)}</td><td class="num">${nf(tR.fibre,1)}</td></tr>
     </tbody></table></div></div>`); }
  if(R.analisi){
    const periodiR=((DOC.alimentazione||{}).periodi)||[];
    if(periodiR.length){ const settR=serieSettimanali();
      S.push(`<div class="rep-sec"><div class="sec">▌ Dieta × allenamento — periodi, carico e peso</div>
       ${timelineChart(settR)}
       <div class="muted" style="font-size:11px;margin-top:4px">Fasce colorate = periodi alimentari registrati (con le kcal/giorno del piano); linee = Training Load settimanale (asse sx) e peso corporeo (asse dx).</div></div>`); }
  }
  if(R.note){ S.push(`<div class="rep-sec"><div class="sec">▌ Note del coach</div>
     <textarea id="rep-nota" class="no-print" placeholder="Commento, indicazioni, prossimi step…" style="width:100%;min-height:90px">${esc(R.nota||'')}</textarea>
     <div class="rep-nota-print" style="white-space:pre-wrap;font-size:13px">${esc(R.nota||'')||'<span class="muted">—</span>'}</div></div>`); }
  S.push(`<p class="muted" style="font-size:11px;margin-top:14px;border-top:1px solid var(--border);padding-top:8px">Report generato dal Training Monitor System. Indici a scopo informativo, non sostituiscono un parere medico/professionale.</p>`);
  document.getElementById('panel-report').innerHTML=ctrl+`<div class="rep-doc" style="background:var(--paper);border:1px solid var(--border);border-radius:8px;padding:28px;box-shadow:var(--shadow)">${S.join('')}</div>`;
  const goal=document.getElementById('rep-goal'); if(goal) goal.oninput=e=>{ R.obiettivo=e.target.value; DOC.dati_utente.obiettivo=e.target.value; persist('corpo'); };
  document.querySelectorAll('#panel-report [data-rep]').forEach(cb=>cb.onchange=()=>{ R[cb.dataset.rep]=cb.checked; persist('corpo'); renderReport(); });
  const nota=document.getElementById('rep-nota'); if(nota) nota.oninput=e=>{ R.nota=e.target.value; const pv=document.querySelector('.rep-nota-print'); if(pv)pv.textContent=e.target.value; persist('corpo'); };
}
function splitTable(D, tblWrap, headingEl){
  const table=tblWrap.querySelector('table');
  const mkU=(content)=>{ const d=D.createElement('div'); d.className='u'; if(headingEl)d.appendChild(D.importNode(headingEl,true)); d.appendChild(D.importNode(content,true)); return d; };
  if(!table) return [mkU(tblWrap)];
  const thead=table.querySelector('thead'), tfoot=table.querySelector('tfoot'), colgroup=table.querySelector('colgroup');
  const fixed=/table-layout\s*:\s*fixed/.test(table.getAttribute('style')||'');
  const rows=[...table.querySelectorAll('tbody tr')];
  const PER=22;
  if(rows.length<=PER) return [mkU(tblWrap)];           // sta in una pagina: tabella unica con intestazione
  // raggruppa: per GIORNO se ci sono day-sep, altrimenti a blocchi di PER. (Intestazione colonne solo nel 1° blocco)
  const hasDays=rows.some(r=>r.classList&&r.classList.contains('day-sep'));
  let groups=[];
  if(hasDays){ let cur=null; rows.forEach(r=>{ const isDay=r.classList&&r.classList.contains('day-sep'); if(isDay||!cur){ cur=[]; groups.push(cur); } cur.push(r); });
    const sp=[]; groups.forEach(g=>{ if(g.length<=PER) sp.push(g); else for(let i=0;i<g.length;i+=PER) sp.push(g.slice(i,i+PER)); }); groups=sp;
  } else { for(let i=0;i<rows.length;i+=PER) groups.push(rows.slice(i,i+PER)); }
  if(groups.length<=1) return [mkU(tblWrap)];
  const out=[];
  groups.forEach((g,gi)=>{
    const d=D.createElement('div'); d.className='u';
    if(headingEl&&gi===0) d.appendChild(D.importNode(headingEl,true));
    const wrap=D.createElement('div'); wrap.className='tbl-wrap';
    const t=D.createElement('table'); if(fixed) t.style.cssText='table-layout:fixed;width:100%';
    if(colgroup) t.appendChild(D.importNode(colgroup,true));     // colonne allineate fra i blocchi
    if(thead&&gi===0) t.appendChild(D.importNode(thead,true));   // intestazione SOLO nel primo blocco
    const tb=D.createElement('tbody'); g.forEach(r=>tb.appendChild(D.importNode(r,true)));
    t.appendChild(tb);
    if(tfoot&&gi===groups.length-1) t.appendChild(D.importNode(tfoot,true));
    wrap.appendChild(t); d.appendChild(wrap); out.push(d);
  });
  return out;
}
function buildReportUnits(D, src){
  const units=[];
  const wrapHead=(h,c)=>{ const d=D.createElement('div'); d.className='u'; if(h)d.appendChild(D.importNode(h,true)); d.appendChild(D.importNode(c,true)); return d; };
  const isHead=el=>el.nodeType===1&&(el.tagName==='H1'||(el.classList&&el.classList.contains('sec')));
  [...src.children].forEach(sec=>{
    if(!(sec.classList&&sec.classList.contains('rep-sec'))){ const d=D.createElement('div'); d.className='u'; d.appendChild(D.importNode(sec,true)); units.push(d); return; }
    let pending=null;
    [...sec.children].forEach(ch=>{
      if(isHead(ch)){ pending=ch; return; }
      if(ch.classList&&ch.classList.contains('tbl-wrap')){ splitTable(D,ch,pending).forEach(u=>units.push(u)); pending=null; }
      else { units.push(wrapHead(pending,ch)); pending=null; }
    });
    if(pending){ const d=D.createElement('div'); d.className='u'; d.appendChild(D.importNode(pending,true)); units.push(d); }
  });
  return units;
}
function dataUrlToBytes(u){ const s=atob(u.slice(u.indexOf(',')+1)); const a=new Uint8Array(s.length); for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i)&255; return a; }
function imagesToPdf(images){
  const PT_W=595.2756, PT_H=841.8898;
  const enc=s=>{ const a=new Uint8Array(s.length); for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i)&255; return a; };
  const parts=[]; let off=0; const offsets=[];
  const push=u=>{ parts.push(u); off+=u.length; }; const pushS=s=>push(enc(s));
  pushS('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const N=images.length;
  const obj=(num,body)=>{ offsets[num]=off; pushS(num+' 0 obj\n'+body+'\nendobj\n'); };
  const kids=[]; for(let i=0;i<N;i++) kids.push((3+3*i)+' 0 R');
  obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  obj(2,'<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+N+' >>');
  for(let i=0;i<N;i++){
    const pageN=3+3*i, contN=4+3*i, imgN=5+3*i;
    const content='q\n'+PT_W.toFixed(4)+' 0 0 '+PT_H.toFixed(4)+' 0 0 cm\n/Im0 Do\nQ\n';
    obj(pageN,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+PT_W.toFixed(4)+' '+PT_H.toFixed(4)+'] /Resources << /XObject << /Im0 '+imgN+' 0 R >> >> /Contents '+contN+' 0 R >>');
    offsets[contN]=off; pushS(contN+' 0 obj\n<< /Length '+content.length+' >>\nstream\n'+content+'endstream\nendobj\n');
    const im=images[i]; offsets[imgN]=off;
    pushS(imgN+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+im.w+' /Height '+im.h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+im.bytes.length+' >>\nstream\n');
    push(im.bytes); pushS('\nendstream\nendobj\n');
  }
  const xrefOff=off, maxObj=2+3*N;
  let xref='xref\n0 '+(maxObj+1)+'\n0000000000 65535 f \n';
  for(let n=1;n<=maxObj;n++){ xref+=String(offsets[n]||0).padStart(10,'0')+' 00000 n \n'; }
  pushS(xref);
  pushS('trailer\n<< /Size '+(maxObj+1)+' /Root 1 0 R >>\nstartxref\n'+xrefOff+'\n%%EOF\n');
  let len=0; parts.forEach(p=>len+=p.length); const out=new Uint8Array(len); let p=0; parts.forEach(u=>{out.set(u,p);p+=u.length;});
  return out;
}
function buildVideoSection(items){
  if(!items || !items.length) return '';
  return '<div class="rep-sec"><div class="sec">▶ Video degli esercizi</div>'+
    items.map(it=>'<div class="vid-item"><div class="vid-name">▶ '+esc(it.nome)+'</div>'+
      '<video controls playsinline preload="none" style="width:100%;max-height:70vh;border-radius:8px;background:#000"><source src="'+it.dataUri+'"></video></div>').join('')+
    '<p class="muted" style="font-size:12px">Tocca un video per riprodurlo. Funziona offline, direttamente da questo file.</p></div>';
}
function collectSchedaVideos(){
  const seen={}, out=[];
  (DOC.scheda.settimanale||[]).forEach(r=>{ if(!r.esercizio)return; const file=videoOf(r.esercizio);
    if(file && !seen[file]){ seen[file]=1; out.push({file:file, nome:r.esercizio}); } });
  return out;
}
async function embedVideoFiles(files){
  const map={}; if(!dirHandle || !files.length) return map;
  for(const file of files){ if(map[file]) continue;
    try{ const s=await videoSorgente(file); const f=await s.fh.getFile();  /* personale se il toggle è attivo, altrimenti predefinito */
      let du=await new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=()=>rej(fr.error); fr.readAsDataURL(f); });
      /* senza un MIME video il tag <video> rifiuta il data-URI: normalizza dal nome file */
      if(!/^data:video\//.test(du)){ const tipo=String(file).toLowerCase().endsWith('.webm')?'video/webm':'video/mp4'; du=du.replace(/^data:[^;,]*/,'data:'+tipo); }
      map[file]=du;
    }catch(e){ /* file mancante: salta */ }
  }
  return map;
}
async function exportDigitalReport(){
  const src=document.querySelector('#panel-report .rep-doc');
  if(!src){ alert('Apri prima il Report.'); return; }
  const btn=document.getElementById('rep-html-btn'); const blab=btn?btn.innerHTML:''; if(btn){ btn.innerHTML='⏳ Genero…'; btn.disabled=true; }
  try{
    const inclEl=document.getElementById('rep-incl-vid'); const incl=inclEl?inclEl.checked:true;
    const vids=collectSchedaVideos();
    let map={};
    if(incl && vids.length){ if(!dirHandle){ alert('Per includere i video collega la cartella TMS (i video stanno in TMS/database/video/). Genero il report senza video.'); } else { map=await embedVideoFiles(vids.map(v=>v.file)); } }
    const items=vids.filter(v=>map[v.file]).map(v=>({nome:v.nome, dataUri:map[v.file]}));
    const vidSec=buildVideoSection(items);
    const styleCSS=(document.querySelector('style')||{}).textContent||'';
    const mobileCSS=[
      'html,body{ background:var(--paper); margin:0; padding:14px; color:var(--ink); -webkit-text-size-adjust:100% }',
      '.rep-doc{ max-width:820px; margin:0 auto; background:var(--paper); border:none; box-shadow:none; padding:0 }',
      '.tbl-wrap{ overflow-x:auto; -webkit-overflow-scrolling:touch }',
      '.cards{ display:flex; flex-wrap:wrap; gap:8px }', '.card{ flex:1 1 150px }',
      '.chart-grid{ display:block }', '.chart-box{ box-shadow:none }', '.chart-box svg{ width:100%; height:auto }',
      '.vid-item{ margin:14px 0 } .vid-name{ font-weight:700; margin-bottom:5px; color:var(--ember-2) }',
      '@media (max-width:560px){ .card{ flex-basis:100% } table{ font-size:12px } h1{ font-size:22px!important } }'
    ].join('');
    const nome=String((DOC.dati_utente&&DOC.dati_utente.nome)||profNome()||'TMS').replace(/[^\w\-]+/g,'_')||'TMS';
    const body='<div class="rep-doc">'+src.innerHTML+vidSec+'</div>';
    const html='<!DOCTYPE html><html lang="it" data-theme="giorno"><head><meta charset="utf-8">'+
      '<meta name="viewport" content="width=device-width, initial-scale=1">'+
      '<title>Report · '+esc(nome)+'</title><style>'+styleCSS+'</style><style>'+mobileCSS+'</style></head><body>'+body+'</body></html>';
    const blob=new Blob([html],{type:'text/html;charset=utf-8'}); const u=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=u; a.download='Report_'+nome+'.html'; document.body.appendChild(a); a.click();
    setTimeout(()=>{ try{ URL.revokeObjectURL(u); }catch(e){} a.remove(); },1500);
    const mb=(blob.size/1048576);
    if(mb>20) setTimeout(()=>alert('Report digitale generato ('+mb.toFixed(0)+' MB). È pesante per via dei video: per inviarlo via chat potresti volerne meno o più corti.'),300);
  }catch(e){ alert('Errore nel report digitale: '+e.message); }
  finally{ if(btn){ btn.innerHTML=blab; btn.disabled=false; } }
}
async function printReport(){
  /* Esporta un PDF A4 generato da noi: impagina le unità del report, rasterizza ogni pagina con html2canvas
     (tema chiaro forzato via onclone, niente flash) e assembla il PDF (imagesToPdf). Niente stampa del browser. */
  const src=document.querySelector('#panel-report .rep-doc');
  if(!src){ try{ window.print(); }catch(e){} return; }
  if(typeof html2canvas!=='function'){ alert('Generatore PDF non disponibile in questa copia: uso la stampa del browser.'); try{ window.print(); }catch(e){} return; }
  const btn=document.getElementById('rep-pdf-btn'); const blab=btn?btn.innerHTML:''; if(btn){ btn.innerHTML='⏳ Genero PDF…'; btn.disabled=true; }
  const stage=document.createElement('div'); stage.id='pdf-stage';
  try{
    document.body.appendChild(stage);
    const units=buildReportUnits(document, src);
    const probe=document.createElement('div'); probe.style.cssText='position:absolute;visibility:hidden;height:100mm'; stage.appendChild(probe);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const pxPerMm=(probe.getBoundingClientRect().height||377.95)/100; stage.removeChild(probe);
    const PAD=13, USABLE=297-PAD-PAD-4, contentPx=USABLE*pxPerMm, padTopPx=PAD*pxPerMm;
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
    const pdf=imagesToPdf(images);
    const nome=String((DOC.dati_utente&&DOC.dati_utente.nome)||profNome()||'TMS').replace(/[^\w\-]+/g,'_')||'TMS';
    const blob=new Blob([pdf],{type:'application/pdf'}); const u=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=u; a.download='Report_'+nome+'.pdf'; document.body.appendChild(a); a.click();
    setTimeout(()=>{ try{ URL.revokeObjectURL(u); }catch(e){} a.remove(); }, 1500);
  }catch(e){ alert('Errore nella generazione del PDF: '+e.message); }
  finally{ try{ if(stage.parentNode) document.body.removeChild(stage); }catch(e){} if(btn){ btn.innerHTML=blab; btn.disabled=false; } }
}
let guidaMode='rapida';
function renderGuida(){
  const tog=`<div class="bar no-print">
     <div style="font-family:var(--font-disp);font-size:18px;color:var(--ember-2)">📕 Guida</div>
     <div style="display:flex;gap:6px;margin-left:14px">
       <button class="btn btn--sm ${guidaMode==='rapida'?'btn--ember':''}" data-gmode="rapida">⚡ Rapida</button>
       <button class="btn btn--sm ${guidaMode==='completa'?'btn--ember':''}" data-gmode="completa">📖 Completa</button>
     </div>
     <div class="spacer"></div>
     <button class="btn" onclick="showTab('allenamento')">← Torna all'app</button></div>`;
  document.getElementById('panel-guida').innerHTML=tog+(guidaMode==='rapida'?guidaRapida():guidaCompleta());
  document.querySelectorAll('#panel-guida [data-gmode]').forEach(b=>b.onclick=()=>{ guidaMode=b.dataset.gmode; renderGuida(); try{window.scrollTo(0,0);}catch(e){} });
  document.querySelectorAll('#panel-guida [data-gjump]').forEach(b=>b.onclick=()=>{ const el=document.getElementById(b.dataset.gjump); if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'}); });
}
function guidaRapida(){
  return `
   <div class="callout callout--ember"><div>⚡ <b>Guida rapida</b> — il minimo per usarlo subito. Per formule e dettagli tecnici passa a <span data-gmode="completa" style="color:var(--ember-2);font-weight:700;text-decoration:underline;cursor:pointer" title="Apri la Guida completa">📖 Completa</span>.</div></div>
   <div class="sec">▌ In 4 passi</div>
   <ol style="margin:0 0 6px 18px;line-height:1.9">
     <li><b>Apri l'app: è già pronta.</b> Su desktop non serve collegare niente — i dati vivono in locale sul tuo PC (niente cloud, niente account) e sopravvivono agli aggiornamenti. Trovi il profilo dimostrativo <b>Atleta Template</b> già compilato per esplorare; il tuo lo crei dal tab <b>👤 Profilo → ＋ Nuovo profilo</b>.</li>
     <li><b>Compila la scheda.</b> In <b>⚔ Allenamento</b> aggiungi un Giorno e scegli gli esercizi dal menù. Inserisci serie, ripetizioni, peso (e <b>RIR</b> se vuoi): 1RM/%1RM/TL si calcolano da soli. Usa <b>＋set</b> per i set extra e <b>↧ Dalla scorsa</b> per ripartire dai valori dell'ultima volta. Il ▶ accanto all'esercizio mostra il video.</li>
     <li><b>Salva.</b> <b>💾 Salva nello Storico</b> (anno + settimana, di default quelli correnti) — con fatica (RPE) e durata della seduta, se le usi.</li>
     <li><b>Guarda i risultati.</b> <b>📈 Progressi</b> per grafici e record, <b>📊 Analisi</b> per incrociare dieta e allenamento, <b>🖨 Report</b> per il PDF da consegnare.</li>
   </ol>
   <div class="callout"><div>🔔 Un pallino/banner verde o rosso (in Allenamento, Corpo e nel footer) ti avvisa se non hai ancora registrato la settimana.</div></div>
   <div class="sec">▌ Le sezioni in breve</div>
   <div class="tbl-wrap"><table><tbody>
     <tr><td class="l"><b>👤 Profilo</b></td><td class="l">Atleta/cliente attivo e anagrafica (il tab mostra il nome del profilo attivo). Più profili = più clienti. Qui anche <b>Backup/Ripristino</b> e lo <b>scambio scheda col cliente</b> (esporta la scheda compilabile, importa il file di rientro).</td></tr>
     <tr><td class="l"><b>⚔ Allenamento</b></td><td class="l">Crei la scheda e la salvi nello storico; ▶ per i video degli esercizi.</td></tr>
     <tr><td class="l"><b>📈 Progressi</b></td><td class="l">Record, grafici e andamento del carico (TL, ACWR, monotonia).</td></tr>
     <tr><td class="l"><b>🜂 Corpo</b></td><td class="l">Peso e misure (BMI, masse) nel tempo.</td></tr>
     <tr><td class="l"><b>🍖 Alimentazione</b></td><td class="l">Pasti Bulk/Mantenimento/Cut, banca dati di 1190 alimenti, indice OMS. Qui registri i <b>Periodi</b> (piano + date) per le analisi.</td></tr>
     <tr><td class="l"><b>📊 Analisi</b></td><td class="l">Dieta × allenamento: timeline dei periodi con carico e peso, Δpeso vs bilancio calorico, correlazioni, confronto fasi.</td></tr>
     <tr><td class="l"><b>📖 Esercizi</b></td><td class="l">Catalogo modificabile, raggruppato per gruppo muscolare e sottocategoria (menù a tendina). Da ✎ puoi caricare <b>video personali</b> al posto degli integrati (toggle "Video personali").</td></tr>
     <tr><td class="l"><b>🖨 Report</b></td><td class="l">Documento stampabile (PDF A4) e <b>Report digitale</b> per smartphone con video.</td></tr>
     <tr><td class="l"><b>📜 Storico / Misure</b></td><td class="l">Archivi completi (link nel footer).</td></tr>
   </tbody></table></div>
   <div class="sec">▌ Indicatori in breve</div>
   <div class="tbl-wrap"><table><tbody>
     <tr><td class="l"><b>1RM</b></td><td class="l">Massimale stimato (forza).</td></tr>
     <tr><td class="l"><b>%1RM</b></td><td class="l">Intensità: quanto pesante lavori (dipende dalle ripetizioni).</td></tr>
     <tr><td class="l"><b>TL</b></td><td class="l">Carico allenante (volume·intensità): conta soprattutto la crescita nel tempo.</td></tr>
     <tr><td class="l"><b>ACWR</b></td><td class="l">Sicurezza del carico: zona ideale 0.8–1.3.</td></tr>
   </tbody></table></div>
   <div class="callout callout--info"><div>Vuoi sapere come si calcola tutto e come leggere ogni grafico? → <span data-gmode="completa" style="color:var(--ember-2);font-weight:700;text-decoration:underline;cursor:pointer" title="Apri la Guida completa">📖 Completa</span>.</div></div>`;
}
function guidaCompleta(){
  const bd=p=>{const fset=fascia(p);return '<span class="fascia '+fset[1]+'">'+fset[0]+'</span>';};
  const nav=[['gc-avvio','Avvio'],['gc-profili','Profili'],['gc-flusso','Flusso'],['gc-sezioni','Le sezioni'],['gc-ind','Indicatori & formule'],['gc-calc','Logica dei calcoli'],['gc-graf','Lettura grafici'],['gc-nutri','Alimentazione & OMS'],['gc-dati','Dati & backup'],['gc-faq','FAQ & problemi'],['gc-sci','Basi scientifiche'],['gc-doc','Documentazione'],['gc-lic','Licenza']];
  return `
   <div class="callout callout--ember"><div>📖 <b>Guida completa.</b> Manuale tecnico del Training Monitor System, erede dell'omonimo Excel/VBA «by Wander». <span class="pill">v${APP_VERSION} · ${APP_DATE}</span></div></div>
   <div class="bar" style="flex-wrap:wrap">${nav.map(n=>`<button class="btn btn--sm" data-gjump="${n[0]}">${n[1]}</button>`).join(' ')}</div>

   <div class="callout"><div>⚠️ <b>Progetto amatoriale.</b> Creato per uso personale e condiviso gratuitamente, da un appassionato di fitness e non da un professionista. Funziona ed è testato, ma usalo a tuo rischio e fai backup dei dati. Codice sviluppato con l'assistenza di Claude (Anthropic).</div></div>

   <div class="sec" id="gc-avvio">▌ 1 · Avvio e salvataggio</div>
   <p>L'app è un singolo file HTML: aprilo con doppio clic (consigliati <b>Chrome</b>, <b>Edge</b> o l'app <b>Obsidian</b>). Al primo avvio compare il <b>gate di connessione</b>:</p>
   <ol style="margin:0 0 6px 18px;line-height:1.7">
     <li><b>Connetti la cartella</b> (consigliata: una cartella chiamata <span class="mono">TMS</span>). L'app crea al suo interno <span class="mono">TMS_Dati/</span> con i JSON dei dati. <b>È obbligatorio</b>: senza cartella collegata l'app non si usa.</li>
     <li>Dalle volte successive si <b>riconnette da sola</b> (un clic di conferma se il browser lo richiede).</li>
   </ol>
   <div class="callout callout--info"><div>🔎 Se colleghi una cartella con nome diverso da <span class="mono">TMS</span> compare un avviso non bloccante: serve solo a ricordarti dove finiscono i dati. Per <b>aggiornare</b> l'app basta sostituire l'HTML: i dati nella cartella restano e vengono migrati in automatico.</div></div>

   <div class="sec" id="gc-profili">▌ 2 · Profili (multi-atleta)</div>
   <p>Nel tab <b>👤 Profilo</b> gestisci più atleti/clienti (crea, attiva, rinomina, elimina). Ogni profilo ha <b>scheda, storico, misure e alimentazione propri</b>; il <b>catalogo Esercizi è condiviso</b>. I dati per profilo stanno in <span class="mono">TMS_Dati/&lt;profilo&gt;/</span>. L'anagrafica invariante (sesso, data di nascita, altezza) si imposta qui col pulsante ✎: l'<b>età è calcolata</b> dalla data di nascita.</p>

   <div class="sec" id="gc-flusso">▌ 3 · Flusso d'uso</div>
   <p><b>1 · Compila la scheda.</b> In <b>Allenamento</b> scegli la modalità (Settimanale/Mensile), aggiungi un Giorno e gli Esercizi (menù dal catalogo). Per i set incrementali dello stesso esercizio usa <b>＋set</b> (ripetere l'esercizio è il modo corretto: niente più «+1/+2»). Se un esercizio compare in un secondo giorno della settimana viene marcato in automatico come <b>S2</b> (2ª seduta). Sotto ogni esercizio compare <b>«ult: …»</b> (l'ultima registrazione) e con <b>↧ Dalla scorsa</b> riporti peso/rip/RIR dall'ultima volta. Il campo <b>RIR</b> (ripetizioni in riserva) è opzionale.</p>
   <p><b>2 · Leggi i calcoli dal vivo.</b> Mentre digiti, 1RM/%1RM/TL/fascia e il Δ TL del blocco si aggiornano in tempo reale. Il pulsante <b>★</b> marca una riga come test del massimale (escluso dalla progressione del TL).</p>
   <p><b>3 · Salva nello Storico.</b> <b>💾 Salva nello Storico</b> → anno e settimana (default correnti). Il codice scheda è <span class="mono">AAAASS</span> (anno×100 + settimana). <b>↶ Annulla ultimo</b> rimuove l'ultima scheda (irreversibile).</p>
   <p><b>4 · Misure corpo (facoltativo).</b> In <b>Corpo</b> aggiorni peso e composizione e premi <b>💾 Salva misure</b>: utile per i grafici di ricomposizione.</p>

   <div class="sec" id="gc-sezioni">▌ 4 · Le sezioni in dettaglio</div>
   <div class="tbl-wrap"><table><thead><tr><th class="l">Sezione</th><th class="l">A cosa serve</th></tr></thead><tbody>
     <tr><td class="l"><b>👤 Profilo</b></td><td class="l">Atleta attivo, gestione profili, anagrafica invariante, Backup/Ripristino dati.</td></tr>
     <tr><td class="l"><b>⚔ Allenamento</b></td><td class="l">Scheda settimanale/mensile per giorno; calcoli automatici; salva/annulla nello storico.</td></tr>
     <tr><td class="l"><b>📜 Storico</b> <span class="muted">(nascosto)</span></td><td class="l">Archivio di tutte le schede salvate (link nel footer). Sola lettura.</td></tr>
     <tr><td class="l"><b>📈 Progressi</b></td><td class="l">Record reali, carico (TL), ACWR, volume per gruppo, intensità, progressione per esercizio.</td></tr>
     <tr><td class="l"><b>🜂 Corpo</b></td><td class="l">Misure variabili con BMI/fabbisogno e grafici; salva le rilevazioni.</td></tr>
     <tr><td class="l"><b>📜 Misure</b> <span class="muted">(nascosto)</span></td><td class="l">Storico rilevazioni corporee (link nel footer).</td></tr>
     <tr><td class="l"><b>🍖 Alimentazione</b></td><td class="l">Piano della fase attiva (Bulk/Mantenimento/Cut, scelta nel Profilo), banca dati 1190 alimenti con micro/macro e indice OMS.</td></tr>
     <tr><td class="l"><b>📖 Esercizi</b></td><td class="l">Catalogo modificabile (nome, gruppo, target, tipo, fattore TL).</td></tr>
     <tr><td class="l"><b>🖨 Report</b></td><td class="l">Documento per il cliente, a sezioni selezionabili, stampa A4 multipagina.</td></tr>
   </tbody></table></div>

   <div class="sec" id="gc-ind">▌ 5 · Indicatori & formule</div>
   <div class="tbl-wrap"><table><thead><tr><th class="l">Indicatore</th><th class="l">Formula</th><th class="l">Significato</th></tr></thead><tbody>
     <tr><td class="l"><b>1RM</b></td><td class="l mono">Peso · (1 + Rip/30)</td><td class="l">Massimale stimato; formula scegliibile nel Profilo (Epley default, Brzycki, Lombardi, Media), ±5%. Nei <b>record</b> mostriamo invece il <b>carico reale</b> più alto sollevato.</td></tr>
     <tr><td class="l"><b>%1RM</b></td><td class="l mono">Peso / 1RM · 100 = 100/(1+Rip/30)</td><td class="l">Intensità relativa. Dipende solo dalle ripetizioni: a parità di reps non cambia col peso.</td></tr>
     <tr><td class="l"><b>TL</b></td><td class="l mono">Serie · Rip · Peso · (%1RM/100) · Fattore</td><td class="l">Carico allenante. Conta la <b>crescita nel tempo</b>, non il valore assoluto.</td></tr>
     <tr><td class="l"><b>Δ TL %</b></td><td class="l mono">(TL attuale / TL prec. − 1)·100</td><td class="l">Variazione vs ultima scheda, per blocco esercizio (somma dei set della seduta).</td></tr>
     <tr><td class="l"><b>Tonnellaggio</b></td><td class="l mono">Σ Serie · Rip · Peso</td><td class="l">Volume grezzo in kg.</td></tr>
     <tr><td class="l"><b>Fattore</b></td><td class="l mono">0.45 – 1.10</td><td class="l">Peso dell'esercizio nel TL. È un valore <b>indicativo e soggettivo</b>, legato alla <b>fatica percepita</b> dell'esercizio (multiarticolare &gt; isolamento): quindi <b>individuale</b> — taralo nel catalogo sulla tua esperienza.</td></tr>
     <tr><td class="l"><b>RIR / RPE</b></td><td class="l mono">RPE = 10 − RIR</td><td class="l">Ripetizioni in riserva (Zourdos 2016): quanto vicino al cedimento. RIR 2 ≈ RPE 8. Campo opzionale; attivando «RIR nei calcoli» nel Profilo, entra in 1RM/%1RM/TL (reps efficaci = rip + RIR).</td></tr>
     <tr><td class="l"><b>Carico interno (sRPE)</b></td><td class="l mono">RPE · durata(min)</td><td class="l">Session-RPE (Foster 2001): carico <b>interno</b> della seduta in AU. Si abilita nel Profilo; RPE 0–10 + minuti per giorno. <b>Settimanale</b> = somma giorni.</td></tr>
     <tr><td class="l"><b>Monotonia / Strain</b></td><td class="l mono">media7÷SD7 · sett.×monotonia</td><td class="l">Monotonia = quanto è uniforme la settimana (riposi inclusi); >2 = poco variata. Strain = carico settimanale pesato per la monotonia (Foster).</td></tr>
   </tbody></table></div>
   <p style="margin-top:10px"><b>Fasce di %1RM</b> — stimolo prevalente:</p>
   <div class="tbl-wrap"><table><thead><tr><th>%1RM</th><th class="l">Stimolo</th><th>Etichetta</th></tr></thead><tbody>
     <tr><td class="num">≥ 90%</td><td class="l">Forza massimale</td><td>${bd(92)}</td></tr>
     <tr><td class="num">80–90%</td><td class="l">Forza + Ipertrofia</td><td>${bd(85)}</td></tr>
     <tr><td class="num">70–80%</td><td class="l">Ipertrofia</td><td>${bd(75)}</td></tr>
     <tr><td class="num">60–70%</td><td class="l">Resistenza</td><td>${bd(65)}</td></tr>
     <tr><td class="num">50–60%</td><td class="l">Metabolico</td><td>${bd(55)}</td></tr>
   </tbody></table></div>
   <div class="callout callout--info"><div>⚖️ <b>ACWR</b> (acuto:cronico): carico dell'ultima settimana ÷ media delle ultime 4. Zona produttiva e sicura ≈ <b>0.8–1.3</b>; sopra 1.5 cresce il rischio di sovraccarico/infortunio.</div></div>

   <div class="sec" id="gc-calc">▌ 6 · Logica dei calcoli (in dettaglio)</div>
   <p>Tutti i numeri derivati (1RM, %1RM, TL, Δ, ACWR, fasce) sono <b>ricalcolati dai dati grezzi</b> a ogni apertura: nello storico salviamo solo Serie/Rip/Peso/RIR e il Fattore dell'esercizio. Così, se cambi una formula o il Fattore, anche lo storico si allinea da solo.</p>

   <p><b>6.1 · Massimale stimato (1RM)</b> — quattro formule selezionabili nel Profilo. Con r = ripetizioni, w = peso:</p>
   <div class="tbl-wrap"><table><thead><tr><th class="l">Formula</th><th class="l">Espressione</th><th class="l">Nota</th></tr></thead><tbody>
     <tr><td class="l">Epley (default)</td><td class="l mono">w · (1 + r/30)</td><td class="l">La più usata; andamento lineare.</td></tr>
     <tr><td class="l">Brzycki</td><td class="l mono">w · 36 / (37 − r)</td><td class="l">Più conservativa ad alte reps; oltre 36 reps ripiega su Epley.</td></tr>
     <tr><td class="l">Lombardi</td><td class="l mono">w · r^0.10</td><td class="l">Curva di potenza.</td></tr>
     <tr><td class="l">Media</td><td class="l mono">(Epley + Brzycki + Lombardi)/3</td><td class="l">Compromesso fra le tre.</td></tr>
   </tbody></table></div>
   <p class="muted" style="font-size:13px">Esempio: 100 kg × 8 rip → Epley 126,7 · Brzycki 124,1 · Lombardi 125,9. Sono stime: oltre le ~10–12 reps l'errore cresce. Per questo nei <b>Record</b> mostriamo il <b>carico reale</b> più alto sollevato, non il 1RM stimato.</p>

   <p><b>6.2 · Intensità relativa (%1RM)</b></p>
   <p class="mono">%1RM = w / 1RM · 100 = 100 / (1 + r/30)   (con Epley)</p>
   <p>Dipende <b>solo dalle ripetizioni</b>: 8 reps ≈ 79% del massimale a prescindere dal peso. È ciò che colloca la serie in una <b>fascia</b> di stimolo.</p>

   <p><b>6.3 · RIR e calcoli «effort-aware»</b> — il RIR (Reps In Reserve, Zourdos 2016) misura quanto sei lontano dal cedimento; RPE = 10 − RIR. Di default è <b>solo informativo</b>. Attivando «<b>RIR nei calcoli</b>» nel Profilo, le ripetizioni efficaci diventano:</p>
   <p class="mono">rip_efficaci = rip + RIR</p>
   <p>e sostituiscono r in 1RM, %1RM e TL. Razionale: 8 reps con 2 in riserva equivalgono, come sforzo, a una serie portata a ~10. Disattivando il toggle, la colonna RIR sparisce dalla scheda e i calcoli tornano alle reps pure (comportamento di default, retro-compatibile).</p>

   <p><b>6.4 · Training Load (TL)</b> — il cuore del monitoraggio (Scott 2016: proxy del carico esterno pesato per intensità):</p>
   <p class="mono">TL = Serie · Rip · Peso · (%1RM/100) · Fattore</p>
   <p>Il <b>Fattore</b> (0.45–1.10, modificabile nel catalogo Esercizi) pesa il contributo dell'esercizio: i multiarticolari pesanti (Squat, Stacco) contano più degli isolamenti. È un valore <b>indicativo e soggettivo</b>: riflette la <b>fatica percepita</b> dell'esercizio (impegno sistemico e locale), perciò è <b>individuale</b> — puoi tararlo nel catalogo Esercizi sulla tua esperienza, non è una costante fisica. Esempio: 4×6×120 su Squat (Fattore 1.0, %1RM≈82%) → 4·6·120·0,82·1,0 ≈ <b>2.360</b>. Conta la <b>tendenza nel tempo</b>, non il valore assoluto. Il <b>Tonnellaggio</b> (Σ Serie·Rip·Peso) è invece il volume grezzo in kg, senza pesi di intensità o esercizio.</p>

   <p><b>6.5 · Δ TL di blocco e seduta automatica</b> — gli esercizi ripetuti nello stesso giorno (＋set) si sommano in un <b>blocco</b>; il Δ TL confronta il TL del blocco con quello della stessa seduta nell'ultima scheda salvata. Se un esercizio compare in un <b>secondo giorno</b> della settimana viene riconosciuto come <b>S2</b> (2ª seduta) in automatico dall'ordine dei giorni, così i confronti restano coerenti (S1 con S1, S2 con S2).</p>

   <p><b>6.6 · Stallo (plateau)</b> — un esercizio è segnalato in stallo quando il suo <b>TL non cresce per ≥3 schede consecutive</b>. Usiamo il TL (non il solo peso) perché cattura anche i progressi ottenuti aumentando ripetizioni o serie a parità di carico. I test del massimale (★) sono esclusi.</p>

   <p><b>6.7 · ACWR (Acute:Chronic Workload Ratio)</b></p>
   <p class="mono">ACWR = TL settimana corrente / media TL ultime 4 settimane</p>
   <p>Segnala se stai aumentando il carico troppo in fretta. Zona indicativa <b>0.8–1.3</b> (produttiva); &lt;0.8 = scarico, &gt;1.5 = rischio sovraccarico. <b>Da leggere come spia, non come verdetto</b>: dopo il 2016 l'indice è stato criticato (medie «accoppiate», soglie arbitrarie, scarsa riproducibilità — vedi §12). Utile come segnale, non come regola assoluta.</p>

   <p><b>6.8 · Fasce di %1RM</b> — la %1RM media della serie la colloca in una fascia di stimolo prevalente (forza ≥90%, forza+ipertrofia 80–90%, ipertrofia 70–80%, resistenza 60–70%, metabolico 50–60%); base in Schoenfeld 2010.</p>

   <p><b>6.9 · Corpo: BMI e fabbisogno</b> — BMI = peso / altezza², con le fasce OMS. Il fabbisogno energetico e proteico stimato (da sesso, età, altezza, peso e obiettivo Bulk/Cut) alimenta l'indice OMS in Alimentazione. Valori indicativi, non un piano medico.</p>

   <p><b>6.10 · Carico interno · session-RPE (Foster 2001)</b> — misura il carico <b>interno</b> (sforzo percepito), complementare al TL che stima il carico <b>esterno</b>. Si abilita dal <b>Profilo</b> (come il RIR). Per ogni giorno della scheda inserisci un <b>RPE 0–10</b> della seduta intera e la <b>durata in minuti</b>:</p>
   <p class="mono">carico seduta = RPE × durata(min)   ·   settimanale = Σ giorni   ·   monotonia = media7gg ÷ SD7gg (riposi inclusi)   ·   strain = settimanale × monotonia</p>
   <p>I valori RPE/durata sono una <b>bozza autosalvata</b> nella scheda: persistono mentre lavori e si <b>azzerano quando salvi la scheda nello Storico</b> (il carico interno dei giorni allenati viene archiviato per quella settimana). <b>Monotonia</b> alta (&gt;2) segnala una settimana poco variata; secondo Foster <b>monotonia e carico entrambi elevati</b> aumentano il rischio di sovraccarico/malattia. Riferimento in §12.</p>

   <div class="sec" id="gc-graf">▌ 7 · Lettura dei grafici (Progressi)</div>
   <p>Tutti i valori si <b>ricalcolano</b> dai dati grezzi; le settimane senza dati vengono saltate.</p>
   <div class="tbl-wrap"><table><thead><tr><th class="l">Grafico</th><th class="l">Cosa mostra e come si legge</th></tr></thead><tbody>
     <tr><td class="l"><b>Record (carico max)</b></td><td class="l">In cima: il <b>peso reale più alto</b> sollevato su Squat, Stacco, Panca, Military, Trazioni.</td></tr>
     <tr><td class="l"><b>TL + media mobile</b></td><td class="l">Carico per scheda; la linea grigia (media 4 sett.) ripulisce il rumore. Sale = progredisci.</td></tr>
     <tr><td class="l"><b>ACWR</b></td><td class="l">Zona verde 0.8–1.3 = progressione sicura; &lt;0.8 scarichi; &gt;1.3 troppo in fretta.</td></tr>
     <tr><td class="l"><b>Tonnellaggio</b></td><td class="l">Kg totali sollevati per scheda.</td></tr>
     <tr><td class="l"><b>Δ Variazione TL %</b></td><td class="l">Oscillazioni ~ −3%/+3% = carico/recupero equilibrati.</td></tr>
     <tr><td class="l"><b>Radar equilibrio (volume)</b></td><td class="l">Distribuzione delle <b>serie</b> per gruppo (non il TL, che è falsato dai grandi esercizi). Poligono regolare = bilanciato.</td></tr>
     <tr><td class="l"><b>Serie per gruppo</b></td><td class="l">Serie per gruppo nell'ultima settimana, con riferimento alla zona ipertrofia 10–20.</td></tr>
     <tr><td class="l"><b>Andamento TL per gruppo</b></td><td class="l">Carico di ciascun gruppo nel tempo: scopri i distretti trascurati.</td></tr>
     <tr><td class="l"><b>Distribuzione intensità</b></td><td class="l">Quante serie in ogni fascia di %1RM: l'enfasi dell'allenamento.</td></tr>
     <tr><td class="l"><b>Carico interno (sRPE)</b> <span class="muted">(se abilitato)</span></td><td class="l">Carico interno settimanale (RPE×min) accanto al TL esterno; l'indice base 100 confronta i due trend. Richiede il Session-RPE attivo nel Profilo.</td></tr>
     <tr><td class="l"><b>Monotonia / Strain</b> <span class="muted">(se abilitato)</span></td><td class="l">Monotonia in zona ≤2 = settimana variata; Strain alto = carico monotono e pesante. Segnali Foster, non verdetti.</td></tr>
     <tr><td class="l"><b>Progressione per esercizio</b></td><td class="l">Per l'esercizio scelto: 1RM stimato e peso massimo nel tempo.</td></tr>
     <tr><td class="l"><b>Segnali</b></td><td class="l">Avvisi automatici: 🎉 record al salvataggio, ⏸ esercizi in stallo (TL fermo da ≥3 schede), ⚠️ deload se ACWR alto, ⚠️ monotonia alta (Foster).</td></tr>
   </tbody></table></div>

   <div class="sec" id="gc-nutri">▌ 8 · Alimentazione & indice OMS</div>
   <p>L'alimentazione è divisa in tre <b>fasi</b> — <b>Bulk</b>, <b>Mantenimento</b>, <b>Cut</b> — ma ne vedi <b>solo quella attiva</b>, che scegli nel tab <b>Profilo</b> (le altre restano salvate, semplicemente non mostrate). Per ogni alimento premi <b>＋ scegli alimento…</b> e selezionalo dalla tabella (valori per 100 g, scalati sui grammi). Con <b>▸</b> vedi tutti i micro/macro. L'<b>indice settimanale OMS/FAO</b> confronta l'intake (piano × 7) coi riferimenti per adulto (energia e proteine personalizzate); i nutrienti <b>(max)</b> sono limiti da non superare. Valori indicativi, non un piano medico.</p>

   <p><b>Fonte dati alimenti:</b> Banca dati svizzera dei valori nutritivi (USAV/FSVO) — 1190 alimenti generici, valori per 100 g di parte edibile, usata con citazione della fonte come da licenza: <a href="https://naehrwertdaten.ch/it/" target="_blank">naehrwertdaten.ch</a>. Il campo <b>Carboidrati</b> sono i glucidi disponibili; <b>di cui zuccheri</b> sono gli zuccheri totali.</p>
   <p><b>Riferimenti OMS/FAO usati nell'indice</b> (adulto): grassi totali ≤30% E · grassi saturi ≤10% E · <b>zuccheri ≤10% E</b> (ideale &lt;5%) · sale &lt;5 g/die (≈ sodio &lt;2000 mg) · grassi <b>trans &lt;1% E</b> · carboidrati ~55% E · proteine 0,83 g/kg; micronutrienti sui valori di riferimento OMS/FAO. <span class="muted">L'indice usa gli <i>zuccheri totali</i> come proxy del limite OMS sugli zuccheri liberi; i grassi <i>trans</i> non sono nel dataset, quindi la soglia &lt;1% E è indicata ma non calcolata per alimento.</span></p>
   <p>Fonti OMS/FAO: <a href="https://www.who.int/news-room/fact-sheets/detail/healthy-diet" target="_blank">Healthy diet</a> · <a href="https://www.who.int/news/item/17-07-2023-who-updates-guidelines-on-fats-and-carbohydrates" target="_blank">Aggiornamento 2023 grassi/carboidrati</a> · <a href="https://www.fao.org/4/y5686e/y5686e00.htm" target="_blank">Fabbisogno energetico (FAO/WHO/UNU)</a> · <a href="https://www.fao.org/nutrition/requirements/archive/en/" target="_blank">Archivio fabbisogni FAO</a>.</p>

   <div class="sec" id="gc-dati">▌ 9 · Dati, profili e backup</div>
   <p>Tutto in locale, <b>nessun cloud</b>. Per profilo: <span class="mono">TMS_Dati/&lt;profilo&gt;/</span> con <span class="mono">scheda.json</span>, <span class="mono">storico.json</span>, <span class="mono">corpo.json</span>, <span class="mono">alimentazione.json</span>; condivisi alla root <span class="mono">profili.json</span> ed <span class="mono">esercizi.json</span>. Copia di sicurezza anche nel browser. Migrazioni automatiche con backup <span class="mono">storico.backup.json</span>. <b>Backup/Ripristino</b> (tab Profilo): <b>⭳ Backup</b> esporta tutti i dati in un file JSON, <b>⭱ Ripristina</b> li reimporta. In alternativa, backup manuale: copia la cartella <span class="mono">TMS_Dati</span>. <b>Cross-PC</b>: se la cartella è sincronizzata (es. cloud), i dati si spostano; connetti la cartella una volta per PC e non modificare in contemporanea su due dispositivi.</p>

   <div class="sec" id="gc-faq">▌ 10 · FAQ & risoluzione problemi</div>
   <p><b>Campi obbligatori?</b> Solo Esercizio, Serie, Ripetizioni, Peso. Note e recupero facoltativi.</p>
   <p><b>Nuovo esercizio?</b> Tab <b>Esercizi</b> → ＋ Nuovo (nome, gruppo, target, tipo, fattore). Compare subito nei menù.</p>
   <p><b>Dato sbagliato?</b> Nella scheda corrente correggi diretto; nello storico usa «↶ Annulla ultimo» e risalva.</p>
   <p><b>Mi alleno 4 giorni invece di 5?</b> Nessun problema: aggiungi/togli giorni a piacere.</p>
   <p><b>Non salva su cartella.</b> Usa Chrome/Edge/Obsidian (Firefox/Safari non supportano l'accesso alle cartelle).</p>
   <p><b>Grafici vuoti.</b> Servono almeno 2–3 schede salvate.</p>
   <p><b>La stampa taglia?</b> Usa il pulsante 🖨 (apre la finestra impaginata), poi nel dialogo: A4, Margini «Nessuno», Scala 100%, Grafica di sfondo attiva.</p>

   <div class="sec" id="gc-sci">▌ 11 · Basi scientifiche</div>
   <ol style="margin:0 0 4px 18px;line-height:1.7;font-size:13px">
     <li>Scott B.R. et al., <i>Training Monitoring for Resistance Exercise…</i>, Sports Medicine, 2016 — base del Training Load.</li>
     <li>Gabbett T.J., <i>The training-injury prevention paradox</i>, BJSM, 2016 — fondamento dell'ACWR.</li>
     <li>Schoenfeld B.J., <i>The mechanisms of muscle hypertrophy…</i>, JSCR, 2010 — range di %1RM e volume.</li>
     <li>Epley B., 1985 — massimale stimato.</li>
     <li>OMS/FAO — <i>Human energy requirements</i> e <i>Vitamin and mineral requirements</i>.</li>
   </ol>

   <div class="sec" id="gc-doc">▌ 12 · Documentazione di riferimento</div>
   <p>I modelli del TMS si basano sui paper elencati qui sotto. I paper <b>non vengono distribuiti</b> con l'app (sono soggetti a copyright): <b>DOI</b> porta alla pagina ufficiale dell'editore e <b>Scholar</b> alla ricerca — spesso si trovano copie open-access legali, preprint o la versione caricata dagli autori; molte università danno accesso istituzionale.</p>
   <div class="tbl-wrap"><table><thead><tr><th class="l">Paper</th><th>DOI</th><th>Scholar</th></tr></thead><tbody>
     <tr><td class="l">Scott 2016 — Training Load (base)</td><td><a href="https://doi.org/10.1007/s40279-015-0454-0" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Training+Monitoring+for+Resistance+Exercise+Theory+and+Applications" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Foster 2001 — Carico interno / session-RPE</td><td><a href="https://doi.org/10.1519/1533-4287(2001)015%3C0109:ANATME%3E2.0.CO;2" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=A+New+Approach+to+Monitoring+Exercise+Training+Foster" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Zourdos 2016 — Scala RIR/RPE</td><td><a href="https://doi.org/10.1519/JSC.0000000000001049" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Novel+Resistance+Training+Specific+Rating+of+Perceived+Exertion+Scale+Repetitions+in+Reserve" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Helms 2016 — RIR/RPE applicazione</td><td><a href="https://doi.org/10.1519/SSC.0000000000000218" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Application+of+the+Repetitions+in+Reserve+Based+RPE+Scale+for+Resistance+Training" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Schoenfeld 2010 — Meccanismi ipertrofia</td><td><a href="https://doi.org/10.1519/JSC.0b013e3181e840f3" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Mechanisms+of+Muscle+Hypertrophy+and+Their+Application+to+Resistance+Training" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Schoenfeld 2017 — Volume dose-response</td><td><a href="https://doi.org/10.1080/02640414.2016.1210197" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Dose-response+relationship+between+weekly+resistance+training+volume+and+increases+in+muscle+mass" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Hulin 2016 — ACWR (evidenza)</td><td><a href="https://doi.org/10.1136/bjsports-2015-094817" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=acute+chronic+workload+ratio+predicts+injury+rugby+league" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Gabbett 2016 — ACWR (paradosso)</td><td><a href="https://doi.org/10.1136/bjsports-2015-095788" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=training+injury+prevention+paradox+training+smarter+and+harder" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">González-Badillo 2010 — VBT (carico-velocità)</td><td><a href="https://doi.org/10.1055/s-0030-1248333" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Movement+Velocity+as+a+Measure+of+Loading+Intensity+in+Resistance+Training" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Sánchez-Medina 2011 — VBT (perdita velocità)</td><td><a href="https://doi.org/10.1249/MSS.0b013e318213f880" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Velocity+Loss+as+an+Indicator+of+Neuromuscular+Fatigue+during+Resistance+Training" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Weakley 2021 — VBT (sintesi pratica)</td><td><a href="https://doi.org/10.1519/SSC.0000000000000560" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Velocity-Based+Training+From+Theory+to+Application" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Plews 2013 — HRV / readiness</td><td><a href="https://doi.org/10.1007/s40279-013-0071-8" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Training+adaptation+and+heart+rate+variability+in+elite+endurance+athletes" target="_blank">Scholar</a></td></tr>
        </tbody></table></div>

   <div class="sec" id="gc-lic">▌ 13 · Licenza & crediti</div>
   <div class="callout callout--ember"><div>📢 <b>Progetto aperto e gratuito.</b> Liberi di usarlo, condividerlo e personalizzarlo. Si chiede solo di <b>mantenere i crediti</b> e di <b>non venderlo</b> a scopo di lucro. «Train hard, share knowledge.» 💪 — by Wander</div></div>`;
}

let profOpen=null, profParamCache={};
function renderProfilo(){
  profParamCache[activeProfile]=DOC.dati_utente;
  const FL={epley:'Epley',brzycki:'Brzycki',lombardi:'Lombardi',media:'Media'};
  const items=profili.map(p=>{
    const isAct=p.slug===activeProfile, open=profOpen===p.slug, u=profParamCache[p.slug];
    let body='';
    if(open){
      if(u){
        body=`<div class="cards" style="margin-top:8px">
          <div class="card"><div class="card__k">Sesso</div><div class="card__v">${esc(u.sesso||'—')}</div></div>
          <div class="card"><div class="card__k">Data di nascita</div><div class="card__v" style="font-size:17px">${u.nascita?new Date(u.nascita).toLocaleDateString('it-IT'):'—'}</div><div class="card__sub">${etaOf(u)?etaOf(u)+' anni':''}</div></div>
          <div class="card"><div class="card__k">Altezza</div><div class="card__v">${u.altezza?nf(u.altezza,0):'—'}<small> cm</small></div></div>
          <div class="card ${u.useRir?'k--ember':''}"><div class="card__k">RIR nei calcoli</div><div class="card__v" style="font-size:18px">${u.useRir?'Sì':'No'}</div></div>
          <div class="card ${u.useRpe?'k--ember':''}"><div class="card__k">Session-RPE</div><div class="card__v" style="font-size:18px">${u.useRpe?'Sì':'No'}</div></div>
          <div class="card"><div class="card__k">Formula 1RM</div><div class="card__v" style="font-size:17px">${FL[u.e1rm||'epley']}</div></div>
          <div class="card"><div class="card__k">Fase alimentare</div><div class="card__v" style="font-size:17px">${FASE_LAB[u.faseAlim]||'Bulk'}</div></div>
        </div>
        <div class="bar no-print" style="margin-top:8px">
          ${isAct?'<span class="muted" style="align-self:center">profilo attivo</span>':`<button class="btn btn--ember" data-pact="${esc(p.slug)}">Attiva</button>`}
          <button class="btn" data-pedit="${esc(p.slug)}">✎ Modifica parametri</button>
          ${profili.length>1?`<button class="btn btn--danger" data-pdel="${esc(p.slug)}">✕ Elimina</button>`:''}
        </div>`;
      } else { body='<div class="muted" style="padding:8px">Caricamento parametri…</div>'; }
    }
    return `<div class="prof-item" style="border:1px solid var(--border);border-radius:7px;margin-bottom:8px;background:${isAct?'var(--gold-t)':'var(--paper-2)'}">
      <div data-popen="${esc(p.slug)}" style="display:flex;align-items:center;gap:10px;padding:11px 13px;cursor:pointer">
        <span style="font-family:var(--font-mono)">${open?'▾':'▸'}</span>
        <span style="font-family:var(--font-disp);font-size:17px">👤 ${esc(p.nome)}</span>
        ${isAct?'<span class="pill">attivo</span>':''}
        <span style="flex:1"></span><span class="muted mono" style="font-size:11px">${esc(p.creato||'')}</span>
      </div>${open?`<div style="padding:0 13px 12px">${body}</div>`:''}</div>`;
  }).join('');
  document.getElementById('panel-profilo').innerHTML=`
   <div class="bar"><div class="field" style="flex:1"><label>Profili</label>
     <div style="font-family:var(--font-disp);font-size:20px;color:var(--ember-2)">👤 ${profili.length} profil${profili.length===1?'o':'i'}</div></div>
     <button class="btn btn--ember no-print" id="prof-new">＋ Nuovo profilo</button></div>
   <div class="callout callout--info"><div>Clicca un profilo per vederne i <b>parametri</b>; usa <b>✎ Modifica parametri</b> per cambiarli. ${dataDir?`Dati in <span class="mono">${esc(SUBDIR)}/&lt;profilo&gt;/</span>.`:'Connetti una cartella (in alto) per salvarli su disco.'}</div></div>
   ${items||'<div class="empty">Nessun profilo.</div>'}
   <div class="sec no-print" style="margin-top:14px">▌ Scheda ↔ cliente</div>
   <div class="callout callout--info no-print"><div>📤 Esporta la <b>scheda settimanale</b> come pagina HTML da mandare al cliente (video inclusi, se vuoi): la compila con ciò che ha fatto davvero e ti rimanda il <b>file di rientro</b>, che importi qui — l'allenamento finisce nello Storico del profilo. 📥</div></div>
   <div class="bar no-print"><button class="btn" id="prof-exscheda" title="Crea la pagina HTML da inviare al cliente">📤 Esporta scheda per il cliente</button>
     <label class="btn" style="cursor:pointer" title="Importa il file di rientro compilato dal cliente">📥 Importa allenamento dal cliente<input type="file" id="prof-rientro" accept="application/json,.json" style="display:none"></label></div>
   <div class="bar no-print" style="margin-top:12px"><button class="btn" id="prof-backup" title="Esporta tutti i dati in un file">⭳ Backup dati</button> <label class="btn" style="cursor:pointer" title="Importa un backup">⭱ Ripristina<input type="file" id="prof-restore" accept="application/json,.json" style="display:none"></label></div>`;
  { const pn=document.getElementById('prof-new'); if(pn) pn.onclick=()=>chiediTesto('Nuovo profilo (atleta/cliente)','',v=>{ const n=(v||'').trim(); if(!n)return; createProfile(n); }); }
  { const bk=document.getElementById('prof-backup'); if(bk) bk.onclick=backupData; }
  { const rs=document.getElementById('prof-restore'); if(rs) rs.onchange=e=>{ if(e.target.files&&e.target.files[0]){ restoreData(e.target.files[0]); e.target.value=''; } }; }
  { const ex=document.getElementById('prof-exscheda'); if(ex) ex.onclick=esportaSchedaCliente; }
  { const ri=document.getElementById('prof-rientro'); if(ri) ri.onchange=e=>{ if(e.target.files&&e.target.files[0]){ importaRientroFile(e.target.files[0]); e.target.value=''; } }; }
  document.querySelectorAll('#panel-profilo [data-popen]').forEach(h=>h.onclick=()=>{
    const slug=h.dataset.popen; profOpen = profOpen===slug ? null : slug; renderProfilo();
    if(profOpen && !profParamCache[profOpen]){ const want=profOpen;
      getProfileData(want).then(d=>{ profParamCache[want]=d.dati_utente||{}; if(profOpen===want) renderProfilo(); }).catch(()=>{ profParamCache[want]={}; if(profOpen===want) renderProfilo(); }); }
  });
  document.querySelectorAll('#panel-profilo [data-pact]').forEach(b=>b.onclick=()=>switchProfile(b.dataset.pact));
  document.querySelectorAll('#panel-profilo [data-pedit]').forEach(b=>b.onclick=async()=>{ const slug=b.dataset.pedit; if(slug!==activeProfile){ await switchProfile(slug); } anagraficaModal(); });
  document.querySelectorAll('#panel-profilo [data-pdel]').forEach(b=>b.onclick=()=>deleteProfile(b.dataset.pdel));
}

function anagraficaModal(){
  const u=DOC.dati_utente; const act=profili.find(p=>p.slug===activeProfile)||{};
  modal(`<h3>Modifica anagrafica</h3>
    <div class="field"><label>Nome</label><input id="m-nome" value="${esc(u.nome||act.nome||'')}"></div>
    <div class="row"><div class="field"><label>Sesso</label><select id="m-sesso"><option value="M"${(u.sesso||'')==='M'?' selected':''}>M</option><option value="F"${(u.sesso||'')==='F'?' selected':''}>F</option></select></div>
      <div class="field"><label>Altezza (cm)</label><input id="m-altezza" type="number" value="${u.altezza??''}"></div></div>
    <div class="field"><label>Data di nascita</label><input id="m-nascita" type="date" value="${esc(u.nascita||'')}"></div>
    <div class="field"><label>Calcoli</label>
    <label class="optchk" style="display:flex;align-items:flex-start;gap:8px;cursor:pointer"><input type="checkbox" id="m-userir" style="width:auto;flex:0 0 auto;margin-top:2px" ${u.useRir?'checked':''}> <span>Considera il <b>RIR</b> nei calcoli (1RM / %1RM / TL effort-aware)</span></label>
    <label class="optchk" style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;margin-top:7px"><input type="checkbox" id="m-userpe" style="width:auto;flex:0 0 auto;margin-top:2px" ${u.useRpe?'checked':''}> <span>Abilita il <b>Session-RPE</b> / carico interno (RPE × durata per giorno · Foster)</span></label></div>
    <div class="field"><label>Formula 1RM stimato</label><select id="m-e1rm"><option value="epley"${(u.e1rm||'epley')==='epley'?' selected':''}>Epley (default)</option><option value="brzycki"${u.e1rm==='brzycki'?' selected':''}>Brzycki</option><option value="lombardi"${u.e1rm==='lombardi'?' selected':''}>Lombardi</option><option value="media"${u.e1rm==='media'?' selected':''}>Media delle 3</option></select></div>
    <div class="field"><label>Fase alimentare</label><select id="m-fase"><option value="bulk"${(u.faseAlim||'bulk')==='bulk'?' selected':''}>Bulk</option><option value="mant"${u.faseAlim==='mant'?' selected':''}>Mantenimento</option><option value="cut"${u.faseAlim==='cut'?' selected':''}>Cut</option></select></div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">Annulla</button><button class="btn btn--ember" id="m-ok">Salva</button></div>`);
  document.getElementById('m-ok').onclick=()=>{ const nome=document.getElementById('m-nome').value.trim();
    u.nome=nome; u.sesso=document.getElementById('m-sesso').value;
    u.altezza=document.getElementById('m-altezza').value===''?'':+document.getElementById('m-altezza').value;
    u.nascita=document.getElementById('m-nascita').value;
    u.useRir=document.getElementById('m-userir').checked;
    u.useRpe=document.getElementById('m-userpe').checked;
    u.e1rm=document.getElementById('m-e1rm').value;
    u.faseAlim=document.getElementById('m-fase').value;
    const p=profili.find(x=>x.slug===activeProfile); if(p&&nome)p.nome=nome;
    persist('corpo'); persist('profili'); closeModal(); renderProfilo(); };
}

