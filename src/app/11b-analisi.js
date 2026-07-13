/* ════ RENDER: ANALISI (dieta × allenamento nel tempo) ════
   Tab introdotto in v1.0.68 (richiesta Marco): incrocia i PERIODI alimentari registrati
   (Alimentazione → "Periodi") con le serie settimanali già esistenti — TL esterno
   (storico), peso/metabolismo (storico_io) — su un asse temporale comune (codici
   settimana YYYYWW). Tutti i valori sono DERIVATI al volo, mai salvati. */

const FASE_COL={bulk:'rgba(47,125,79,.16)', mant:'rgba(201,154,52,.18)', cut:'rgba(193,70,56,.16)'};
const FASE_DOT={bulk:'var(--ok)', mant:'var(--gold-2)', cut:'var(--danger)'};

function kcalPiano(righe){ let k=0; (righe||[]).forEach(r=>{ k+=foodVal(r.alimento,r.grammi,'kcal'); }); return k; }

/* vero se c2 è esattamente la settimana dopo c1 (gestisce il cambio anno: 202552→202601) */
function settConsecutive(c1,c2){
  try{ const d1=isoWeekMonday(Math.floor(c1/100),c1%100), d2=isoWeekMonday(Math.floor(c2/100),c2%100);
    return Math.round((d2-d1)/86400000)===7; }catch(e){ return false; }
}

/* codici settimana ISO coperti dall'intervallo di date (estremi inclusi) */
function settimaneTra(dal,al){
  const out=[]; const d=new Date(String(dal)+'T12:00:00'), fine=new Date(String(al)+'T12:00:00');
  if(isNaN(d)||isNaN(fine)||d>fine) return out;
  const cur=new Date(d);
  while(cur<=fine){ const w=isoWeek(cur), c=schedaCode(w.anno,w.sett); if(!out.includes(c)) out.push(c); cur.setDate(cur.getDate()+7); }
  const wf=isoWeek(fine), cf=schedaCode(wf.anno,wf.sett); if(!out.includes(cf)) out.push(cf);
  return out;
}

/* {codice settimana: {fase, kcal}} dai periodi registrati (in caso di sovrapposizione vince l'ultimo) */
function periodiPerSettimana(){
  const m={};
  (((DOC.alimentazione||{}).periodi)||[]).forEach(p=>{
    const kc=kcalPiano(p.righe);
    settimaneTra(p.dal,p.al).forEach(c=>{ m[c]={fase:p.fase, kcal:kc}; });
  });
  return m;
}

/* serie unificata per settimana: tl, peso, metabolismo, fase/kcal del periodo attivo */
function serieSettimanali(){
  const ag=schedeAggr();
  const io={}; (DOC.storico_io||[]).forEach(r=>{ const c=+r.scheda; if(c) io[c]={peso:(+r.peso||null), metab:(+r.metabolismo||null)}; });
  const per=periodiPerSettimana();
  const codes=[...new Set([].concat(ag.map(a=>a.scheda), Object.keys(io).map(Number), Object.keys(per).map(Number)))].sort((a,b)=>a-b);
  return codes.map(c=>{ const a=ag.find(x=>x.scheda===c);
    return {scheda:c, tl:(a?a.tl:0)||null, peso:(io[c]||{}).peso||null, metab:(io[c]||{}).metab||null,
      fase:(per[c]||{}).fase||null, kcal:(per[c]&&per[c].kcal!=null)?per[c].kcal:null}; });
}

/* grafico 1 — timeline: fasce colorate per fase + TL (asse sx) + peso (asse dx) */
function timelineChart(sett){
  const W=560,H=240,P={l:48,r:48,t:14,b:26};
  if(sett.length<2) return `<div class="empty">${t('Servono almeno 2 settimane di dati (storico o misure).')}</div>`;
  const n=sett.length, X=i=>P.l+(W-P.l-P.r)*i/(n-1);
  const half=(W-P.l-P.r)/(n-1)/2;
  const tlv=sett.map(s=>s.tl).filter(v=>v!=null), pv=sett.map(s=>s.peso).filter(v=>v!=null);
  if(!tlv.length&&!pv.length) return `<div class="empty">${t('Nessun dato di carico o peso.')}</div>`;
  const sc=vs=>{ let mn=Math.min(...vs),mx=Math.max(...vs); if(mn===mx){mx+=1;mn-=1;} const pad=(mx-mn)*.1; return {mn:mn-pad,mx:mx+pad}; };
  const stl=tlv.length?sc(tlv):null, sp=pv.length?sc(pv):null;
  const Ytl=v=>P.t+(H-P.t-P.b)*(1-(v-stl.mn)/(stl.mx-stl.mn));
  const Yp=v=>P.t+(H-P.t-P.b)*(1-(v-sp.mn)/(sp.mx-sp.mn));
  let g='';
  /* fasce dei periodi (tratti contigui con stessa fase) */
  let i=0; while(i<n){ const f=sett[i].fase;
    if(!f){ i++; continue; }
    let j=i; while(j+1<n && sett[j+1].fase===f) j++;
    const x1=Math.max(P.l,X(i)-half), x2=Math.min(W-P.r,X(j)+half);
    g+=`<rect x="${x1.toFixed(1)}" y="${P.t}" width="${(x2-x1).toFixed(1)}" height="${H-P.t-P.b}" fill="${FASE_COL[f]||'rgba(120,120,120,.12)'}"/>`;
    const kc=sett[i].kcal;
    g+=`<text class="lbl" x="${((x1+x2)/2).toFixed(1)}" y="${P.t+11}" text-anchor="middle" style="font-weight:700">${esc(t(FASE_LAB[f]||f))}${kc?` · ${nf(kc,0)} kcal/g`:''}</text>`;
    i=j+1; }
  /* griglia + assi sinistro (TL) e destro (peso) */
  for(let k=0;k<=4;k++){ const y=P.t+(H-P.t-P.b)*k/4;
    g+=`<line class="grid" x1="${P.l}" y1="${y.toFixed(1)}" x2="${W-P.r}" y2="${y.toFixed(1)}"/>`;
    if(stl) g+=`<text class="lbl" x="${P.l-5}" y="${(y+3).toFixed(1)}" text-anchor="end" style="fill:var(--orange-b)">${nfk(stl.mx-(stl.mx-stl.mn)*k/4)}</text>`;
    if(sp) g+=`<text class="lbl" x="${W-P.r+5}" y="${(y+3).toFixed(1)}" style="fill:var(--violet)">${nf(sp.mx-(sp.mx-sp.mn)*k/4,1)}</text>`; }
  const labels=sett.map(s=>schedaLabel(s.scheda)); const step=Math.ceil(n/8);
  labels.forEach((lb,k)=>{ if(k%step===0||k===n-1) g+=`<text class="lbl" x="${X(k).toFixed(1)}" y="${H-8}" text-anchor="middle">${esc(lb)}</text>`; });
  /* linee */
  const linea=(get,Yf,col)=>{ let p='',dots=''; sett.forEach((s,k)=>{ const v=get(s); if(v==null)return; const x=X(k),y=Yf(v);
      p+=(p?' L':'M')+x.toFixed(1)+' '+y.toFixed(1); dots+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="${col}"/>`; });
    return `<path class="ln" d="${p}" stroke="${col}"/>${dots}`; };
  if(stl) g+=linea(s=>s.tl,Ytl,'var(--orange-b)');
  if(sp) g+=linea(s=>s.peso,Yp,'var(--violet)');
  const leg=`<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:11px;margin-top:6px">`+
    (stl?`<span class="mono" style="color:var(--orange-b)">${t('━ Training Load (asse sx)')}</span>`:'')+
    (sp?`<span class="mono" style="color:var(--violet)">${t('━ Peso kg (asse dx)')}</span>`:'')+
    Object.keys(FASE_COL).map(f=>`<span class="mono"><span style="display:inline-block;width:10px;height:10px;background:${FASE_COL[f]};border:1px solid var(--border);vertical-align:-1px"></span> ${esc(t(FASE_LAB[f]||f))}</span>`).join(' ')+`</div>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet"><line class="axis" x1="${P.l}" y1="${P.t}" x2="${P.l}" y2="${H-P.b}"/><line class="axis" x1="${W-P.r}" y1="${P.t}" x2="${W-P.r}" y2="${H-P.b}"/><line class="axis" x1="${P.l}" y1="${H-P.b}" x2="${W-P.r}" y2="${H-P.b}"/>${g}</svg>${leg}`;
}

function renderAnalisi(){
  const sett=serieSettimanali();
  const periodi=((DOC.alimentazione||{}).periodi)||[];
  const intro=`<div class="callout callout--info"><div>${t('📊 <b>Dieta × allenamento nel tempo.</b> Le analisi incrociano i <b>periodi alimentari</b> registrati (tab 🍖 Alimentazione → "Periodi") con carico (TL), peso e metabolismo settimanali. Tutto è calcolato al volo dai tuoi dati.')}</div></div>`;
  if(!periodi.length){
    document.getElementById('panel-analisi').innerHTML=intro+
      `<div class="empty" style="padding:28px">${t('Nessun periodo alimentare registrato.<br><br>Vai in <b>🍖 Alimentazione → ▌ Periodi</b> e registra il piano attuale con le sue date (es. "bulk dal 1/3 al 30/4"): da lì in poi questi grafici si accendono.')}<br><br><button class="btn btn--ember" onclick="showTab('alimentazione')">${t('🍖 Vai all\'Alimentazione')}</button></div>`;
    return;
  }
  /* 2 — Δpeso settimana successiva vs bilancio calorico (kcal piano − metabolismo) */
  const punti=[];
  for(let i=0;i<sett.length-1;i++){ const s=sett[i], nx=sett[i+1];
    if(!settConsecutive(s.scheda,nx.scheda)) continue;  /* niente Δ attraverso i buchi */
    if(s.kcal!=null&&s.metab!=null&&s.peso!=null&&nx.peso!=null)
      punti.push({x:s.kcal-s.metab, y:+(nx.peso-s.peso).toFixed(2), color:FASE_DOT[s.fase]||'var(--orange)', label:schedaLabel(s.scheda)});
  }
  const regr=punti.length>=3? regressione(punti.map(p=>p.x),punti.map(p=>p.y)) : null;
  const rPB=punti.length>=3? pearson(punti.map(p=>p.x),punti.map(p=>p.y)) : null;
  /* 3 — correlazione con ritardo: TL settimana N vs Δpeso settimana N+lag */
  const dpeso=[]; for(let i=1;i<sett.length;i++) dpeso.push(settConsecutive(sett[i-1].scheda,sett[i].scheda)&&sett[i].peso!=null&&sett[i-1].peso!=null? sett[i].peso-sett[i-1].peso : null);
  const lagBars=[];
  for(let lag=0;lag<=4;lag++){
    const xs=[],ys=[];
    for(let i=0;i<sett.length-1-lag;i++){ const tl=sett[i].tl, dp=dpeso[i+lag]; /* dpeso[k] = peso[k+1]-peso[k] */
      if(tl!=null&&dp!=null){ xs.push(tl); ys.push(dp); } }
    const r=pearson(xs,ys);
    lagBars.push({x:'+'+(lag+1)+' '+t('sett.'), y:r==null?null:+r.toFixed(2), color: r==null?'var(--ink-4)':(r>=0?'var(--ok)':'var(--danger)'), n:xs.length});
  }
  const lagValidi=lagBars.filter(b=>b.y!=null);
  /* 4 — boxplot ΔTL% e Δpeso per fase */
  const perFaseTL={bulk:[],mant:[],cut:[]}, perFasePeso={bulk:[],mant:[],cut:[]};
  for(let i=1;i<sett.length;i++){ const s=sett[i], pr=sett[i-1];
    if(!s.fase || !settConsecutive(pr.scheda,s.scheda)) continue;
    if(s.tl&&pr.tl) perFaseTL[s.fase]&&perFaseTL[s.fase].push(((s.tl/pr.tl)-1)*100);
    if(s.peso!=null&&pr.peso!=null) perFasePeso[s.fase]&&perFasePeso[s.fase].push(+(s.peso-pr.peso).toFixed(2)); }
  const boxTL=Object.keys(perFaseTL).map(f=>({x:t(FASE_LAB[f]||f), values:perFaseTL[f], color:FASE_DOT[f]}));
  const boxPeso=Object.keys(perFasePeso).map(f=>({x:t(FASE_LAB[f]||f), values:perFasePeso[f], color:FASE_DOT[f]}));

  document.getElementById('panel-analisi').innerHTML=intro+`
   <div class="chart-box"><h4>${t('🗓 Timeline — periodi alimentari, carico e peso')}</h4>${timelineChart(sett)}</div>
   <div class="grid2">
     <div class="chart-box"><h4>${t('⚖ Δpeso vs bilancio calorico')} ${rPB!=null?`<span class="pill" title="${t('correlazione di Pearson')}">r = ${nf(rPB,2)}</span>`:''}</h4>
       ${scatterChart(punti,{trend:true,xl:t('bilancio kcal/giorno (piano − metabolismo)'),yl:t('Δpeso kg →sett. dopo')})}
       ${regr?`<div class="muted" style="font-size:11px;margin-top:4px">${t('Retta: ogni 100 kcal/g di surplus ≈')} ${nf(regr.b*100,2)} ${t('kg/settimana')}${rPB!=null&&Math.abs(rPB)<0.3?' · '+t('correlazione debole: servono più settimane'):''}</div>`:''}</div>
     <div class="chart-box"><h4>${t('⏳ Correlazione con ritardo — TL → Δpeso')} ${lagValidi.length?`<span class="pill">${lagBars[0].n} ${t('settimane')}</span>`:''}</h4>
       ${lagValidi.length? barChart(lagBars.filter(b=>b.y!=null),{fmt:x=>nf(x,2)}) : `<div class="empty">${t('Servono più settimane con TL e peso.')}</div>`}
       <div class="muted" style="font-size:11px;margin-top:4px">${t('r di Pearson fra il carico della settimana N e la variazione di peso 1–5 settimane dopo: il picco indica con quanto ritardo l\'allenamento "si vede" sulla bilancia.')}</div></div>
   </div>
   <div class="grid2">
     <div class="chart-box"><h4>${t('📦 Confronto fasi — Δ Training Load % a settimana')}</h4>${boxChart(boxTL,{fmt:x=>nf(x,0)+'%'})}</div>
     <div class="chart-box"><h4>${t('📦 Confronto fasi — Δ peso kg a settimana')}</h4>${boxChart(boxPeso,{fmt:x=>nf(x,2)})}</div>
   </div>
   <div class="callout"><div>${t('📐 <b>Come leggere.</b> Timeline: le fasce colorate sono i periodi (con le kcal/giorno del piano); se il TL regge mentre il peso scende, il cut sta funzionando. Scatter: ogni punto è una settimana — la pendenza della retta dice quanto il surplus/deficit si traduce in peso. Boxplot: barra spessa = mediana, scatola = 50% centrale delle settimane.')}</div></div>`;
}
