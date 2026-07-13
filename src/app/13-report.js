/* ════════════════ RENDER: REPORT ════════════════ */
function renderReport(){
  const u=DOC.dati_utente; const c=bodyCalc(u);
  const def={profilo:true,foto:false,riepilogo:true,scheda:true,andamento:true,progressione:true,record:true,cardio:true,alimentazione:true,analisi:true,note:true,obiettivo:(u.obiettivo||''),nota:'',fotoPrima:'',fotoDopo:''};
  u.report=Object.assign({},def,u.report||{}); const R=u.report;
  const ag=schedeAggr(); const last=ag.length?ag[ag.length-1]:null, prev=ag.length>1?ag[ag.length-2]:null;
  const labels=ag.map(a=>schedaLabel(a.scheda));
  const dTL=(last&&prev&&prev.tl)?(last.tl/prev.tl-1)*100:0;
  const lastPct=last&&last.pctN?last.pctSum/last.pctN:0;
  const acwr=(()=>{ if(!ag.length)return null; const w=ag.slice(-4); const cc=w.reduce((s,x)=>s+x.tl,0)/w.length; return cc? last.tl/cc:null; })();
  const prog=DOC.scheda.settimanale||[]; const smap=sedutaMap(prog);
  let progTL=0; prog.forEach(r=>{ if(r.esercizio) progTL+=sTL(r); });
  let progBody='',lastDay=null; prog.forEach(r=>{ if(!r.esercizio)return; if(r.giorno&&r.giorno!==lastDay){lastDay=r.giorno; progBody+=`<tr class="day-sep"><td colspan="6">▌ ${esc(t(r.giorno))}</td></tr>`;} const p=sPct(r),fa=fascia(p),sd=rowSeduta(smap,r),tgt=(esLookup(r.esercizio)||{}).target||''; progBody+=`<tr><td class="l">${esc(exName(r.esercizio))}${sd>1?` <span class="pill">S${sd}</span>`:''}</td><td class="l muted" style="font-size:11px">${esc(tgt)}</td><td class="num">${nf(r.serie,0)}×${nf(r.rip,0)}</td><td class="num">${nf(r.peso,1)}</td><td class="num">${esc(r.rest||'')}</td><td><span class="fascia ${fa[1]}">${t(fa[0])}</span></td></tr>`; });
  const A=DOC.alimentazione; const faseR=faseAlimActive(), tR=faseTot(A[faseR]||[]);
  const io=DOC.storico_io; const prs=prList().slice(0,8);
  const mainLifts=['Panca piana bilanciere','Squat bilanciere','Stacco da terra','Military press / Overhead press','Trazioni alla sbarra'].filter(n=>DOC.storico.some(r=>r.esercizio===n));
  const toggles=[['profilo','Profilo & corpo'],['foto','Foto progressi (prima/dopo)'],['riepilogo','Riepilogo allenamento'],['scheda','Scheda di allenamento'],['andamento','Grafici di andamento'],['progressione','Progressione esercizi'],['record','Record personali'],['cardio','Cardio (attività)'],['alimentazione','Alimentazione'],['analisi','Dieta × allenamento'],['note','Note del coach']].map(x=>[x[0],t(x[1])]);
  /* ordine personalizzabile delle sezioni (per profilo): parte dal default, completa con eventuali sezioni nuove */
  const KEYS=toggles.map(t=>t[0]);
  let ordine=(Array.isArray(R.ordine)?R.ordine:[]).filter(k=>KEYS.indexOf(k)>=0);
  KEYS.forEach(k=>{ if(ordine.indexOf(k)<0) ordine.push(k); });
  R.ordine=ordine;
  /* foto report: default prima=più vecchia, dopo=più recente (se ci sono foto) */
  const _fl=(DOC.foto||[]).slice().sort((a,b)=>String(a.data||'').localeCompare(String(b.data||'')));
  if(_fl.length){ if(!_fl.some(f=>f.file===R.fotoPrima)) R.fotoPrima=_fl[0].file; if(!_fl.some(f=>f.file===R.fotoDopo)) R.fotoDopo=_fl[_fl.length-1].file; }
  const mvStyle='border:1px solid var(--border);background:var(--paper-2);border-radius:4px;cursor:pointer;font-size:10px;line-height:1;padding:2px 4px;color:var(--ink-2)';
  const ctrl=`<div class="bar no-print" style="flex-wrap:wrap">
     <div class="field" style="flex:1;min-width:240px"><label>${t('Obiettivo del cliente (in copertina)')}</label><input id="rep-goal" value="${esc(R.obiettivo||'')}" placeholder="${t('es. ricomposizione corporea, +forza panca…')}" style="width:100%"></div>
     <button class="btn btn--gold" id="rep-pdf-btn" onclick="printReport()">${t('⬇ Scarica PDF (A4)')}</button>
     <button class="btn" id="rep-html-btn" onclick="exportDigitalReport()" title="${t('HTML per smartphone, con i video incorporati')}">${t('📱 Report digitale')}</button>
     <label class="pill" style="cursor:pointer;align-self:center;display:inline-flex;align-items:center;gap:5px" title="${t('Incorpora i video nel file (più pesante)')}"><input type="checkbox" id="rep-incl-vid" checked style="width:auto;flex:0 0 auto"> ${t('video')}</label></div>
   <div class="bar no-print" style="flex-wrap:wrap;gap:8px;align-items:center"><span class="muted mono" style="font-size:11px">${t('Sezioni (spunta per includere · ▲▼ per l\'ordine):')}</span>${ordine.map((k,i)=>{const lab=(toggles.find(x=>x[0]===k)||[])[1]||k;return `<span class="pill" style="display:inline-flex;align-items:center;gap:3px"><label style="cursor:pointer;display:inline-flex;align-items:center;gap:4px"><input type="checkbox" data-rep="${k}" ${R[k]?'checked':''} style="vertical-align:-1px">${lab}</label><button data-repmove="${k}" data-dir="-1" title="${t('Sposta su')}" style="${mvStyle}"${i===0?' disabled':''}>▲</button><button data-repmove="${k}" data-dir="1" title="${t('Sposta giù')}" style="${mvStyle}"${i===ordine.length-1?' disabled':''}>▼</button></span>`;}).join('')}</div>`;
  const B={};
  if(R.profilo){ B.profilo=`<div class="rep-sec"><div class="sec">▌ ${t('Profilo & composizione corporea')}</div>
     <div class="cards">
       <div class="card"><div class="card__k">${t('Età')}</div><div class="card__v">${nf(etaOf(u),0)}<small> ${t('anni')}</small></div></div>
       <div class="card"><div class="card__k">${t('Altezza')}</div><div class="card__v">${nf(u.altezza,0)}<small> cm</small></div></div>
       <div class="card k--ember"><div class="card__k">${t('Peso')}</div><div class="card__v">${io.length?nf(io[io.length-1].peso,1):nf(u.peso,1)}<small> kg</small></div></div>
       <div class="card"><div class="card__k">BMI</div><div class="card__v">${nf(c.bmi,1)}</div><div class="card__sub">${c.bmi<18.5?t('sottopeso'):c.bmi<25?t('normopeso'):c.bmi<30?t('sovrappeso'):t('obesità')}</div></div>
       <div class="card k--ok"><div class="card__k">${t('Massa magra')}</div><div class="card__v">${nf(c.magraKg,1)}<small> kg</small></div></div>
       <div class="card k--danger"><div class="card__k">${t('Massa grassa')}</div><div class="card__v">${nf(c.grassaKg,1)}<small> kg</small></div><div class="card__sub">${nf((u.massa_grassa||0)*100,1)}%</div></div>
       <div class="card k--violet"><div class="card__k">${t('Fabbisogno')}</div><div class="card__v">${nf(c.metab,0)}<small> kcal</small></div></div>
     </div>
     ${io.length>1?`<div class="chart-box" style="margin-top:10px"><h4>${t('Andamento peso')}</h4>${lineChart([{name:t('Peso'),color:'var(--orange-b)',data:io.map(r=>({x:schedaLabel(r.scheda),y:+r.peso}))}],{h:140})}</div>`:''}
     <p class="muted" style="font-size:12px">${t('Il <b>BMI</b> mette in rapporto peso e altezza; <b>massa magra/grassa</b> e <b>fabbisogno calorico</b> orientano l\'alimentazione.')}</p></div>`; }
  if(R.foto){ const fp=(DOC.foto||[]).find(x=>x.file===R.fotoPrima), fd=(DOC.foto||[]).find(x=>x.file===R.fotoDopo);
    if(fp||fd){ const cell=(f,lab)=>{ if(!f) return `<div style="flex:1;text-align:center"><div style="font-weight:700;color:var(--ember-2)">${lab}</div><div class="muted" style="padding:16px">—</div></div>`;
        const du=fotoReportUri[f.file], pz=fotoPeso(f.data);
        return `<div style="flex:1;text-align:center;min-width:0"><div style="font-weight:700;color:var(--ember-2)">${lab}</div>${du?`<img src="${du}" alt="${lab}" style="max-width:100%;max-height:340px;border-radius:8px;border:1px solid var(--border)">`:`<div class="muted" style="padding:16px">${t('(caricamento foto…)')}</div>`}<div class="muted" style="font-size:12px;margin-top:3px">${esc(fotoDataLabel(f))}${pz?' · '+nf(pz,1)+' kg':''}</div></div>`; };
      B.foto=`<div class="rep-sec"><div class="sec">▌ ${t('Foto progressi — prima / dopo')}</div>
       <div style="display:flex;gap:14px;align-items:flex-start">${cell(fp,t('Prima'))}${cell(fd,t('Dopo'))}</div></div>`; } }
  if(R.riepilogo && last){ B.riepilogo=`<div class="rep-sec"><div class="sec">▌ ${t('Riepilogo allenamento')}</div>
     <div class="cards">
       <div class="card k--ember"><div class="card__k">${t('Carico (TL) ultima scheda')}</div><div class="card__v">${nfk(last.tl)}</div></div>
       <div class="card ${dTL>=0?'k--ok':'k--danger'}"><div class="card__k">${t('Variazione vs prec.')}</div><div class="card__v">${dTL>=0?'▲':'▼'} ${nf(Math.abs(dTL),1)}%</div></div>
       <div class="card"><div class="card__k">${t('Intensità media')}</div><div class="card__v">${nf(lastPct,1)}%</div><div class="card__sub">${t(fascia(lastPct)[0])}</div></div>
       <div class="card ${acwr==null?'':(acwr>=0.8&&acwr<=1.3?'k--ok':'k--danger')}"><div class="card__k">${t('Sicurezza carico')}</div><div class="card__v">${acwr==null?'—':nf(acwr,2)}</div><div class="card__sub">ACWR · ${acwr==null?'':(acwr<0.8?t('scarico'):acwr<=1.3?t('ottimale'):t('alto'))}</div></div>
     </div>
     <p class="muted" style="font-size:12px">${t('Il <b>carico (TL)</b> riassume il lavoro svolto: più cresce nel tempo, più c\'è progressione. La <b>sicurezza carico (ACWR)</b> indica se l\'aumento è sostenibile (ideale 0.8–1.3).')}</p></div>`; }
  if(R.scheda && prog.some(r=>r.esercizio)){ B.scheda=`<div class="rep-sec big"><div class="sec">▌ ${t('Scheda di allenamento')} <span class="pill" style="margin-left:auto">${t('carico piano')} ${nfk(progTL)}</span></div>
     <div class="tbl-wrap"><table style="table-layout:fixed;width:100%"><colgroup><col style="width:24%"><col style="width:32%"><col style="width:12%"><col style="width:10%"><col style="width:9%"><col style="width:13%"></colgroup><thead><tr><th class="l">${t('Esercizio')}</th><th class="l">${t('Target muscolare')}</th><th>${t('Serie×Rip')}</th><th>${t('Peso')}</th><th>${t('Rec.')}</th><th>${t('Zona')}</th></tr></thead><tbody>${progBody}</tbody></table></div></div>`; }
  if(R.andamento && ag.length){ B.andamento=`<div class="rep-sec"><div class="sec">▌ ${t('Andamento del carico')}</div>
     <div class="chart-grid">
       <div class="chart-box"><h4>${t('Carico (TL) nel tempo')}</h4>${lineChart([{name:'TL',color:'var(--orange-b)',data:ag.map(a=>({x:schedaLabel(a.scheda),y:a.tl||null}))}],{labels,h:160,fmt:nfk})}</div>
       <div class="chart-box"><h4>${t('Equilibrio volume (serie)')}</h4>${radarChart(GRUPPI.map(g=>({label:t(g),value:(last.sets[g]||0)+(g==='Cardio'?cardioEquivSets(last.scheda):0)})),{h:230})}</div>
     </div>
     <p class="muted" style="font-size:12px">${t('A sinistra la crescita del carico settimana dopo settimana; a destra quanto è bilanciato il lavoro tra i gruppi muscolari.')}</p></div>`; }
  if(R.progressione && mainLifts.length){ const cols=['#c2500a','#d4a017','#2f7d4f','#7a3ea8','#991b1b'];
     const series=mainLifts.map((n,idx)=>({name:exName(n.replace(' / Overhead press','')),color:cols[idx%cols.length],data:exProgression(n).map(p=>({x:schedaLabel(p.scheda),y:p.rm||null}))}));
     B.progressione=`<div class="rep-sec"><div class="sec">▌ ${t('Progressione di forza (1RM stimato)')}</div>
     <div class="chart-box">${lineChart(series,{h:210})}</div>
     <p class="muted" style="font-size:12px">${t('Massimale stimato sui principali esercizi: una linea che sale significa aumento di forza.')}</p></div>`; }
  if(R.record){ B.record=`<div class="rep-sec big"><div class="sec">▌ ${t('Record personali (carico massimo)')}</div>
     <div class="tbl-wrap"><table><thead><tr><th class="l">${t('Esercizio')}</th><th>${t('Carico max')}</th><th>${t('Rip.')}</th><th>${t('Scheda')}</th></tr></thead><tbody>${prs.map(p=>`<tr><td class="l">${esc(exName(p.nome))}</td><td class="num cell-out">${nf(p.peso,1)} kg</td><td class="num">${nf(p.rip,0)}</td><td class="num">${p.scheda}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">—</td></tr>'}</tbody></table></div></div>`; }
  if(R.cardio){ B.cardio=cardioReportBlock(); }
  if(R.alimentazione){ B.alimentazione=`<div class="rep-sec"><div class="sec">▌ ${t('Quadro alimentare · fase')} ${t(FASE_LAB[faseR]||faseR)} ${t('(piano giornaliero)')}</div>
     <div class="tbl-wrap"><table><thead><tr><th class="l">${t('Fase')}</th><th>Kcal</th><th>${t('Proteine')}</th><th>${t('Grassi')}</th><th>${t('Carboidrati')}</th><th>${t('Fibre')}</th></tr></thead><tbody>
       <tr><td class="l">${t(FASE_LAB[faseR]||faseR)}</td><td class="num cell-out">${nf(tR.kcal,0)}</td><td class="num">${nf(tR.proteine,1)}</td><td class="num">${nf(tR.grassi,1)}</td><td class="num">${nf(tR.zuccheri,1)}</td><td class="num">${nf(tR.fibre,1)}</td></tr>
     </tbody></table></div></div>`; }
  if(R.analisi){
    const periodiR=((DOC.alimentazione||{}).periodi)||[];
    if(periodiR.length){ const settR=serieSettimanali();
      B.analisi=`<div class="rep-sec"><div class="sec">▌ ${t('Dieta × allenamento — periodi, carico e peso')}</div>
       ${timelineChart(settR)}
       <div class="muted" style="font-size:11px;margin-top:4px">${t('Fasce colorate = periodi alimentari registrati (con le kcal/giorno del piano); linee = Training Load settimanale (asse sx) e peso corporeo (asse dx).')}</div></div>`; }
  }
  if(R.note){ B.note=`<div class="rep-sec"><div class="sec">▌ ${t('Note del coach')}</div>
     <textarea id="rep-nota" class="no-print" placeholder="${t('Commento, indicazioni, prossimi step…')}" style="width:100%;min-height:90px">${esc(R.nota||'')}</textarea>
     <div class="rep-nota-print" style="white-space:pre-wrap;font-size:13px">${esc(R.nota||'')||'<span class="muted">—</span>'}</div></div>`; }
  const S=[`<div class="rep-sec" style="border-bottom:2px solid var(--gold-2);padding-bottom:10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:flex-start">
     <div><h1 style="font-size:26px;color:var(--ember-2);margin:0">${t('Report di Allenamento')}</h1>
       <div class="muted mono" style="font-size:12px">${esc(u.nome||profNome()||t('Atleta'))}${u.cognome?' '+esc(u.cognome):''} · ${new Date().toLocaleDateString(LANG==='en'?'en-GB':'it-IT')}${last?' · '+t('scheda')+' '+last.scheda:''}</div>
       ${R.obiettivo?`<div style="margin-top:6px"><b>${t('Obiettivo:')}</b> ${esc(R.obiettivo)}</div>`:''}</div>
     <div style="text-align:right;font-family:var(--font-disp);color:var(--gold-2);font-size:13px;white-space:nowrap">✦ Training Monitor System</div></div>`];
  ordine.forEach(k=>{ if(B[k]) S.push(B[k]); });
  S.push(`<p class="muted" style="font-size:11px;margin-top:14px;border-top:1px solid var(--border);padding-top:8px">${t('Report generato dal Training Monitor System. Indici a scopo informativo, non sostituiscono un parere medico/professionale.')}</p>`);
  document.getElementById('panel-report').innerHTML=ctrl+fotoReportCtrl(R)+`<div class="rep-doc" style="background:var(--paper);border:1px solid var(--border);border-radius:8px;padding:28px;box-shadow:var(--shadow)">${S.join('')}</div>`;
  const goal=document.getElementById('rep-goal'); if(goal) goal.oninput=e=>{ R.obiettivo=e.target.value; DOC.dati_utente.obiettivo=e.target.value; persist('corpo'); };
  document.querySelectorAll('#panel-report [data-rep]').forEach(cb=>cb.onchange=()=>{ R[cb.dataset.rep]=cb.checked; persist('corpo'); renderReport(); });
  document.querySelectorAll('#panel-report [data-repmove]').forEach(b=>b.onclick=()=>{
    const ord=R.ordine.slice(), i=ord.indexOf(b.dataset.repmove), j=i+(+b.dataset.dir);
    if(i<0||j<0||j>=ord.length) return; const t=ord[i]; ord[i]=ord[j]; ord[j]=t; R.ordine=ord; persist('corpo'); renderReport(); });
  const nota=document.getElementById('rep-nota'); if(nota) nota.oninput=e=>{ R.nota=e.target.value; const pv=document.querySelector('.rep-nota-print'); if(pv)pv.textContent=e.target.value; persist('corpo'); };
  const fa=document.getElementById('rep-foto-a'); if(fa) fa.onchange=e=>{ R.fotoPrima=e.target.value; persist('corpo'); ensureReportFoto().then(()=>{ if(curTab==='report') renderReport(); }); };
  const fb=document.getElementById('rep-foto-b'); if(fb) fb.onchange=e=>{ R.fotoDopo=e.target.value; persist('corpo'); ensureReportFoto().then(()=>{ if(curTab==='report') renderReport(); }); };
  if(R.foto && [R.fotoPrima,R.fotoDopo].some(f=>f && !fotoReportUri[f])) ensureReportFoto().then(()=>{ if(curTab==='report') renderReport(); });
}
/* pickers prima/dopo per la sezione foto del report (vuoto se non ci sono foto) */
function fotoReportCtrl(R){
  const fl=(DOC.foto||[]).slice().sort((a,b)=>String(a.data||'').localeCompare(String(b.data||''))); if(!fl.length) return '';
  const opts=sel=>fl.map(f=>`<option value="${esc(f.file)}"${f.file===sel?' selected':''}>${esc(fotoDataLabel(f))}</option>`).join('');
  return `<div class="bar no-print" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><span class="muted mono" style="font-size:11px;align-self:center">${t('📸 Foto report:')}</span>
     <div class="field"><label>${t('Prima')}</label><select id="rep-foto-a">${opts(R.fotoPrima)}</select></div>
     <div class="field"><label>${t('Dopo')}</label><select id="rep-foto-b">${opts(R.fotoDopo)}</select></div>
     <span class="muted" style="font-size:11px;align-self:center">${t('spunta «Foto progressi» tra le sezioni per inserirle')}</span></div>`;
}
/* embedding base64 delle due foto del report (così entrano sia nel PDF sia nel report digitale) */
let fotoReportUri={};
async function fotoReportDataUri(file){
  if(fotoReportUri[file]) return fotoReportUri[file];
  const fh=await fotoHandle(file,false); const f=await fh.getFile();
  let du=await new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=()=>rej(fr.error); fr.readAsDataURL(f); });
  if(!/^data:image\//.test(du)){ const e=String(file).toLowerCase(); const t=e.endsWith('.png')?'image/png':e.endsWith('.webp')?'image/webp':e.endsWith('.gif')?'image/gif':'image/jpeg'; du=du.replace(/^data:[^;,]*/,'data:'+t); }
  fotoReportUri[file]=du; return du;
}
async function ensureReportFoto(){
  const R=(DOC.dati_utente&&DOC.dati_utente.report)||{};
  for(const file of [R.fotoPrima,R.fotoDopo]){ if(file && !fotoReportUri[file]){ try{ await fotoReportDataUri(file); }catch(e){} } }
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
function imagesToPdf(images, landscape){
  /* A4 in punti: 595.2756 × 841.8898. landscape=true scambia larghezza/altezza (297×210mm). */
  const PT_W=landscape?841.8898:595.2756, PT_H=landscape?595.2756:841.8898;
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
  return '<div class="rep-sec"><div class="sec">▶ '+t('Video degli esercizi')+'</div>'+
    items.map(it=>'<div class="vid-item"><div class="vid-name">▶ '+esc(exName(it.nome))+'</div>'+
      '<video controls playsinline preload="none" style="width:100%;max-height:70vh;border-radius:8px;background:#000"><source src="'+it.dataUri+'"></video></div>').join('')+
    '<p class="muted" style="font-size:12px">'+t('Tocca un video per riprodurlo. Funziona offline, direttamente da questo file.')+'</p></div>';
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
  if(DOC.dati_utente&&DOC.dati_utente.report&&DOC.dati_utente.report.foto){ try{ await ensureReportFoto(); }catch(e){} renderReport(); }
  const src=document.querySelector('#panel-report .rep-doc');
  if(!src){ alert(t('Apri prima il Report.')); return; }
  const btn=document.getElementById('rep-html-btn'); const blab=btn?btn.innerHTML:''; if(btn){ btn.innerHTML=t('⏳ Genero…'); btn.disabled=true; }
  try{
    const inclEl=document.getElementById('rep-incl-vid'); const incl=inclEl?inclEl.checked:true;
    const vids=collectSchedaVideos();
    let map={};
    if(incl && vids.length){ if(!dirHandle){ alert(t('Per includere i video collega la cartella TMS (i video stanno in TMS/database/video/). Genero il report senza video.')); } else { map=await embedVideoFiles(vids.map(v=>v.file)); } }
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
    const html='<!DOCTYPE html><html lang="'+(LANG==='en'?'en':'it')+'" data-theme="giorno"><head><meta charset="utf-8">'+
      '<meta name="viewport" content="width=device-width, initial-scale=1">'+
      '<title>'+t('Report')+' · '+esc(nome)+'</title><style>'+styleCSS+'</style><style>'+mobileCSS+'</style></head><body>'+body+'</body></html>';
    const blob=new Blob([html],{type:'text/html;charset=utf-8'}); const u=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=u; a.download='Report_'+nome+'.html'; document.body.appendChild(a); a.click();
    setTimeout(()=>{ try{ URL.revokeObjectURL(u); }catch(e){} a.remove(); },1500);
    const mb=(blob.size/1048576);
    if(mb>20) setTimeout(()=>alert(t('Report digitale generato (')+mb.toFixed(0)+t(' MB). È pesante per via dei video: per inviarlo via chat potresti volerne meno o più corti.')),300);
  }catch(e){ alert(t('Errore nel report digitale:')+' '+e.message); }
  finally{ if(btn){ btn.innerHTML=blab; btn.disabled=false; } }
}
async function printReport(){
  /* Esporta un PDF A4 generato da noi: impagina le unità del report, rasterizza ogni pagina con html2canvas
     (tema chiaro forzato via onclone, niente flash) e assembla il PDF (imagesToPdf). Niente stampa del browser. */
  if(DOC.dati_utente&&DOC.dati_utente.report&&DOC.dati_utente.report.foto){ try{ await ensureReportFoto(); }catch(e){} renderReport(); }
  const src=document.querySelector('#panel-report .rep-doc');
  if(!src){ try{ window.print(); }catch(e){} return; }
  if(typeof html2canvas!=='function'){ alert(t('Generatore PDF non disponibile in questa copia: uso la stampa del browser.')); try{ window.print(); }catch(e){} return; }
  const btn=document.getElementById('rep-pdf-btn'); const blab=btn?btn.innerHTML:''; if(btn){ btn.innerHTML=t('⏳ Genero PDF…'); btn.disabled=true; }
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
  }catch(e){ alert(t('Errore nella generazione del PDF:')+' '+e.message); }
  finally{ try{ if(stage.parentNode) document.body.removeChild(stage); }catch(e){} if(btn){ btn.innerHTML=blab; btn.disabled=false; } }
}
