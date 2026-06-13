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
