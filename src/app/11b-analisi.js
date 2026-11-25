/* ════ RENDER: ANALISI (dieta × allenamento nel tempo) ════
   Tab introdotto in v1.0.68 (richiesta Marco): incrocia i PERIODI alimentari registrati
   (Alimentazione → "Periodi") con le serie settimanali già esistenti — TL esterno
   (storico), peso/metabolismo (storico_io) — su un asse temporale comune (codici
   settimana YYYYWW). Tutti i valori sono DERIVATI al volo, mai salvati. */

const FASE_COL={bulk:'rgba(47,125,79,.16)', mant:'rgba(201,154,52,.18)', cut:'rgba(193,70,56,.16)'};
const FASE_DOT={bulk:'var(--ok)', mant:'var(--gold-2)', cut:'var(--danger)'};

function kcalPiano(righe,ricette){ let k=0; (righe||[]).forEach(r=>{ k+=foodVal(r.alimento,r.grammi,'kcal',ricette); }); return k; }   /* ricette = copia salvata nel periodo */

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
    const kc=kcalPiano(p.righe,p.ricette);
    settimaneTra(p.dal,periodoFine(p)).forEach(c=>{ m[c]={fase:p.fase, kcal:kc}; });   /* in corso = fino a oggi */
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
function timelineChart(sett,opts){
  opts=opts||{}; const W=opts.w||560,H=opts.h||240,FS=opts.fs||9,P={l:48,r:48,t:14,b:26};
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
    const kc=sett[i].kcal, nome=t(FASE_LAB[f]||f), pieno=nome+(kc?` · ${nf(kc,0)} kcal/g`:'');
    /* il nome del periodo con le kcal non sempre ci sta nella sua fascia (periodo breve, grafico
       stretto): allora resta il solo nome e le kcal si leggono passandoci col mouse */
    const sta=pieno.length*FS*0.6<=x2-x1-6;
    g+=`<text class="lbl" x="${((x1+x2)/2).toFixed(1)}" y="${P.t+FS+2}" text-anchor="middle" style="font-weight:700">${esc(sta?pieno:nome)}<title>${esc(pieno)}</title></text>`;
    i=j+1; }
  /* griglia + assi sinistro (TL) e destro (peso) */
  for(let k=0;k<=4;k++){ const y=P.t+(H-P.t-P.b)*k/4;
    g+=`<line class="grid" x1="${P.l}" y1="${y.toFixed(1)}" x2="${W-P.r}" y2="${y.toFixed(1)}"/>`;
    if(stl) g+=`<text class="lbl" x="${P.l-5}" y="${(y+3).toFixed(1)}" text-anchor="end" style="fill:var(--orange-b)">${nfk(stl.mx-(stl.mx-stl.mn)*k/4)}</text>`;
    if(sp) g+=`<text class="lbl" x="${W-P.r+5}" y="${(y+3).toFixed(1)}" style="fill:var(--violet)">${nf(sp.mx-(sp.mx-sp.mn)*k/4,1)}</text>`; }
  /* come in lineChart: l'ultima data si mostra sempre, ma se cadrebbe addosso alla
     precedente quella precedente si salta (le due date finali si sovrapponevano) */
  const labels=sett.map(s=>schedaLabel(s.scheda));
  g+=grafEtichX(labels,X,W,FS,Math.ceil(n/grafNEtich(opts,W-P.l-P.r,labels,FS)),H-8);
  /* linee, coi valori di ogni settimana al passaggio del mouse (grafInterattivo, 05-grafici.js):
     carico, peso e, in fondo al riquadro, il periodo alimentare di quella settimana */
  const serieInt=[];
  if(stl) serieInt.push({n:t('Training Load'), c:'var(--orange-b)', y:sett.map(s=>s.tl!=null? Ytl(s.tl) : null), v:sett.map(s=>s.tl!=null? nfk(s.tl) : null)});
  if(sp) serieInt.push({n:t('Peso'), c:'var(--violet)', y:sett.map(s=>s.peso!=null? Yp(s.peso) : null), v:sett.map(s=>s.peso!=null? nf(s.peso,1)+' kg' : null)});
  const gi=grafInterattivo({W,H,P, xs:sett.map((s,k)=>X(k)), labels, serie:serieInt,
    extra:sett.map(s=>s.fase? t(FASE_LAB[s.fase]||s.fase)+(s.kcal?` · ${nf(s.kcal,0)} kcal/g`:'') : '')});
  const linea=(get,Yf,col)=>{ let p='',dots=''; sett.forEach((s,k)=>{ const v=get(s); if(v==null)return; const x=X(k),y=Yf(v);
      p+=(p?' L':'M')+x.toFixed(1)+' '+y.toFixed(1); dots+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="${col}"/>`; });
    return `<path class="ln" d="${p}" stroke="${col}"/>${dots}`; };
  g+=`<g class="g-serie"${gi.clip}>`;
  if(stl) g+=linea(s=>s.tl,Ytl,'var(--orange-b)');
  if(sp) g+=linea(s=>s.peso,Yp,'var(--violet)');
  g+=`</g>`;
  const leg=`<div style="${grafLeg(opts)}">`+
    (stl?`<span class="mono" style="color:var(--orange-b)">${t('━ Training Load (asse sx)')}</span>`:'')+
    (sp?`<span class="mono" style="color:var(--violet)">${t('━ Peso kg (asse dx)')}</span>`:'')+
    Object.keys(FASE_COL).map(f=>`<span class="mono"><span style="display:inline-block;width:10px;height:10px;background:${FASE_COL[f]};border:1px solid var(--border);vertical-align:-1px"></span> ${esc(t(FASE_LAB[f]||f))}</span>`).join(' ')+`</div>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet"${grafFs(opts)}${gi.attr}>${gi.defs}<line class="axis" x1="${P.l}" y1="${P.t}" x2="${P.l}" y2="${H-P.b}"/><line class="axis" x1="${W-P.r}" y1="${P.t}" x2="${W-P.r}" y2="${H-P.b}"/><line class="axis" x1="${P.l}" y1="${H-P.b}" x2="${W-P.r}" y2="${H-P.b}"/>${g}${gi.hover}</svg>${leg}`;
}

/* ── DIETA SEGUITA E PESO (25/11/2026, richiesta di Marco): i giorni che il cliente segna ogni sera sul
      telefono (sì / no, DOC.alimentazione.aderenza) sotto l'andamento del peso, la percentuale di ogni
      settimana e il confronto fra le settimane in cui la dieta è stata seguita (almeno l'80 % dei giorni
      segnati) e le altre: di quanto è cambiato il peso, in media, nella settimana dopo. Ultime 12 settimane.
      Non servono i periodi alimentari. Derivato al volo, come il resto del tab. ── */
const ADER_SOGLIA=80;
function aderenzaDati(){
  const ad=((DOC.alimentazione||{}).aderenza)||{};
  const segnati=Object.keys(ad).filter(d=>ad[d] && (ad[d].v==='si'||ad[d].v==='no')).sort();
  if(!segnati.length) return null;
  const oggi=dataOggi(), lim=(()=>{ const d=new Date(oggi+'T12:00:00'); d.setDate(d.getDate()-83); return dataLocale(d); })();
  const d0=new Date((segnati[0]>lim? segnati[0] : lim)+'T12:00:00'); d0.setDate(d0.getDate()-((d0.getDay()+6)%7));   /* dal lunedì */
  const date=[]; for(const d=new Date(d0); dataLocale(d)<=oggi; d.setDate(d.getDate()+1)) date.push(dataLocale(d));
  /* il peso: una pesata al giorno (bilancia); senza pesate, la misura settimanale dello Storico misure */
  let pesi=pesateContate(DOC.pesate||[]).filter(p=>p.data>=date[0] && p.data<=oggi && +p.peso>0).map(p=>({data:p.data, peso:+p.peso}));
  if(!pesi.length) pesi=(DOC.storico_io||[]).filter(r=>+r.peso>0 && +r.scheda>0).map(r=>{ const m=isoWeekMonday(Math.floor(+r.scheda/100), +r.scheda%100);
    return {data:m.toISOString().slice(0,10), peso:+r.peso}; }).filter(p=>p.data>=date[0] && p.data<=oggi).sort((a,b)=>a.data.localeCompare(b.data));
  const settimane=[];
  for(let i=0;i<date.length;i+=7){ const g=date.slice(i,i+7), si=g.filter(x=>(ad[x]||{}).v==='si').length, no=g.filter(x=>(ad[x]||{}).v==='no').length;
    const pw=pesi.filter(p=>p.data>=g[0] && p.data<=g[g.length-1]);
    settimane.push({dal:g[0], si, no, pct:(si+no)? si/(si+no)*100 : null, peso:pw.length? pw.reduce((a,p)=>a+p.peso,0)/pw.length : null}); }
  /* la dieta della settimana N contro il peso dalla N alla N+1 */
  const seguite=[], no=[];
  for(let k=0;k<settimane.length-1;k++){ const s=settimane[k], nx=settimane[k+1];
    if(s.pct==null || s.peso==null || nx.peso==null) continue;
    (s.pct>=ADER_SOGLIA? seguite : no).push(nx.peso-s.peso); }
  const media=a=>a.length? a.reduce((x,y)=>x+y,0)/a.length : null;
  const tot=segnati.filter(d=>d>=date[0]), siTot=tot.filter(d=>ad[d].v==='si').length;
  return {ad, date, pesi, settimane, pct:tot.length? siTot/tot.length*100 : null, giorni:tot.length,
    conf:{seguite:media(seguite), nSeguite:seguite.length, no:media(no), nNo:no.length}};
}
function aderenzaChart(D, opts){
  const W=opts.w||560, H=opts.h||250, P={l:44, r:12, t:12, b:58}, n=D.date.length, cw=(W-P.l-P.r)/n;
  const X=i=>P.l+cw*(i+0.5), yb=H-P.b+8;
  let g='';
  const vs=D.pesi.map(p=>p.peso);
  if(vs.length){
    let mn=Math.min(...vs), mx=Math.max(...vs); if(mx-mn<1){ const c=(mx+mn)/2; mn=c-.5; mx=c+.5; } const pad=(mx-mn)*.12; mn-=pad; mx+=pad;
    const Y=v=>P.t+(yb-14-P.t)*(1-(v-mn)/(mx-mn));
    for(let k=0;k<=3;k++){ const v=mx-(mx-mn)*k/3, y=Y(v);
      g+=`<line class="grid" x1="${P.l}" y1="${y.toFixed(1)}" x2="${W-P.r}" y2="${y.toFixed(1)}"/><text class="lbl" x="${P.l-5}" y="${(y+3).toFixed(1)}" text-anchor="end" style="fill:var(--violet)">${nf(v,1)}</text>`; }
    let p='', dots='';
    D.pesi.forEach(q=>{ const i=D.date.indexOf(q.data); if(i<0) return; const x=X(i), y=Y(q.peso);
      p+=(p?' L':'M')+x.toFixed(1)+' '+y.toFixed(1); dots+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="var(--violet)"><title>${esc(q.data)} · ${nf(q.peso,1)} kg</title></circle>`; });
    g+=`<path class="ln" d="${p}" stroke="var(--violet)"/>${dots}`;
  } else g+=`<text class="lbl" x="${(W/2).toFixed(1)}" y="${((yb+P.t)/2).toFixed(1)}" text-anchor="middle">${esc(t('Nessuna pesata in queste settimane'))}</text>`;
  /* la striscia dei giorni: verde sì, rosso no, chiaro non segnato */
  D.date.forEach((d,i)=>{ const v=(D.ad[d]||{}).v, col=v==='si'? 'var(--ok)' : v==='no'? 'var(--danger)' : 'var(--border)';
    g+=`<rect class="ader-giorno${v?' '+v:''}" x="${(P.l+cw*i+.6).toFixed(1)}" y="${yb}" width="${Math.max(cw-1.2,1).toFixed(1)}" height="11" rx="1.5" fill="${col}"${v?'':' opacity=".55"'}><title>${esc(d)}${v==='si'?' · '+esc(t('dieta seguita')):v==='no'?' · '+esc(t('dieta non seguita')):''}</title></rect>`; });
  /* la percentuale di ogni settimana e il suo lunedì */
  const passo=(W-P.l-P.r)/D.settimane.length<46? 2 : 1;
  D.settimane.forEach((s,k)=>{ const xm=P.l+cw*(k*7+3.5);
    g+=`<line class="grid" x1="${(P.l+cw*k*7).toFixed(1)}" y1="${P.t}" x2="${(P.l+cw*k*7).toFixed(1)}" y2="${yb+11}" style="opacity:.5"/>`;
    if(s.pct!=null) g+=`<text class="lbl ader-pct" x="${xm.toFixed(1)}" y="${yb+25}" text-anchor="middle" style="font-weight:700;fill:${s.pct>=ADER_SOGLIA?'var(--ok)':s.pct>=50?'var(--gold-2)':'var(--danger)'}">${nf(s.pct,0)}%</text>`;
    if(k%passo===0){ const dd=new Date(s.dal+'T12:00:00'); g+=`<text class="lbl" x="${xm.toFixed(1)}" y="${yb+39}" text-anchor="middle">${dd.getDate()}/${dd.getMonth()+1}</text>`; } });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet"${grafFs(opts)} class="ader-graf"><line class="axis" x1="${P.l}" y1="${P.t}" x2="${P.l}" y2="${yb-14}"/>${g}</svg>`;
}
function aderenzaSezione(){
  const D=aderenzaDati(); if(!D) return '';
  const c=D.conf, kg=v=>(v>0?'+':v<0?'−':'')+nf(Math.abs(v),2)+' kg';
  const conf=(c.nSeguite||c.nNo)? `<div class="graf-nota ader-conf">${t('Peso nella settimana dopo')}: `+
      (c.nSeguite? `<b style="color:var(--ok)">${t('dieta seguita')}</b> (≥ ${ADER_SOGLIA} %) ${kg(c.seguite)} ${t('in media')} <span class="muted">(${c.nSeguite} ${t(c.nSeguite===1?'settimana':'settimane')})</span>` : '')+
      (c.nSeguite && c.nNo? ' · ' : '')+
      (c.nNo? `<b style="color:var(--danger)">${t('non seguita')}</b> ${kg(c.no)} ${t('in media')} <span class="muted">(${c.nNo} ${t(c.nNo===1?'settimana':'settimane')})</span>` : '')+'</div>'
    : `<div class="graf-nota">${t('Il confronto fra settimane con la dieta seguita e non seguita compare quando ci sono pesate di due settimane di fila.')}</div>`;
  return `<div class="sec">${t('Dieta seguita e peso')}</div>
   <div class="chart-grid chart-grid--compatta" id="ader-analisi">
     <div class="chart-box chart-box--largo"><h4>${t('Peso e giorni di dieta seguita')} ${D.pct!=null?`<span class="pill">${nf(D.pct,0)} % ${t('dei giorni segnati')}</span>`:''}</h4>
       ${grafVarianti(aderenzaChart(D,{w:900,h:250,fs:11}), aderenzaChart(D,{w:440,h:250,fs:11}))}
       <div class="graf-nota">${t('Sotto il peso, un quadratino per giorno: verde se il cliente ha segnato la dieta seguita, rosso se no, chiaro se non l’ha segnato. Sotto, la percentuale di ogni settimana.')}</div>
       ${conf}</div>
   </div>`;
}
function renderAnalisi(){
  const sett=serieSettimanali();
  const periodi=((DOC.alimentazione||{}).periodi)||[];
  const ader=aderenzaSezione();
  const intro=`<div class="callout callout--info"><div>${t('<b>Dieta × allenamento nel tempo.</b> Le analisi incrociano i <b>periodi alimentari</b> registrati (tab Alimentazione → "Periodi") con carico (TL), peso e metabolismo settimanali. Tutto è calcolato al volo dai tuoi dati.')}</div></div>`;
  if(!periodi.length){
    document.getElementById('panel-analisi').innerHTML=intro+(ader? `<div class="graf-pagina">${ader}</div>` : '')+
      `<div class="empty" style="padding:28px">${t('Nessun periodo alimentare registrato.<br><br>Vai in <b>Alimentazione → Periodi</b> e registra il piano attuale con le sue date (es. "bulk dal 1/3 al 30/4"): da lì in poi questi grafici si accendono.')}<br><br><button class="btn btn--ember" onclick="showTab('alimentazione')">${t('Vai all\'Alimentazione')}</button></div>`;
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

  const perLat=`<div class="lat"><h4>${t('Periodi')} <span class="muted">${periodi.length}</span></h4>${periodi.slice().reverse().map(p=>`<div class="lat-num"><span><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${FASE_DOT[p.fase]||'var(--orange)'};margin-right:5px"></i>${esc(t(FASE_LAB[p.fase]||p.fase))} <span class="muted">${esc(p.dal)} → ${esc(p.al||t('in corso'))}</span></span><b>${nf(kcalPiano(p.righe),0)} kcal</b></div>`).join('')}
      <div class="lat-num" style="border-top:1px solid var(--border);margin-top:6px;padding-top:6px"><span>${t('Settimane con dati')}</span><b>${sett.length}</b></div>
      <div class="lat-num"><span>${t('Settimane utili per il bilancio')}</span><b>${punti.length}</b></div></div>`;
  /* VISTA COMPATTA (2026-11-16): tre sezioni per argomento su una griglia fitta — il quadro nel
     tempo, la dieta col peso, il carico con le correlazioni — invece di un grafico per riga a tutta
     larghezza. Calcoli invariati. */
  const GA={w:480,h:215,fs:11};
  document.getElementById('panel-analisi').innerHTML=intro+`<div class="pag"><div class="pag__main"><div class="graf-pagina">
   <div class="sec">${t('Quadro nel tempo')}</div>
   <div class="chart-grid chart-grid--compatta">
     <div class="chart-box chart-box--largo graf-tl graf-cont"><h4>${t('Timeline — periodi alimentari, carico e peso')}${spiegaBtn('timeline')}</h4>${grafVarianti(timelineChart(sett,{w:900,h:230,fs:11}),timelineChart(sett,{w:440,h:230,fs:11}))}</div>
   </div>
   <div class="sec">${t('Dieta e peso')}</div>
   <div class="chart-grid chart-grid--compatta">
     <div class="chart-box"><h4>${t('Δpeso vs bilancio calorico')} ${rPB!=null?`<span class="pill" title="${t('correlazione di Pearson')}">r = ${nf(rPB,2)}</span>`:''}${spiegaBtn('bilancio-peso')}</h4>
       ${scatterChart(punti,Object.assign({trend:true,xl:t('bilancio kcal/giorno (piano − metabolismo)'),yl:t('Δpeso kg →sett. dopo')},GA))}
       ${regr?`<div class="graf-nota">${t('Retta: ogni 100 kcal/g di surplus ≈')} ${nf(regr.b*100,2)} ${t('kg/settimana')}${rPB!=null&&Math.abs(rPB)<0.3?' · '+t('correlazione debole: servono più settimane'):''}</div>`:''}</div>
     <div class="chart-box"><h4>${t('Confronto fasi — Δ peso kg a settimana')}${spiegaBtn('confronto-fasi')}</h4>${boxChart(boxPeso,Object.assign({fmt:x=>nf(x,2)},GA))}</div>
   </div>
   ${ader}
   <div class="sec">${t('Carico e correlazioni')}</div>
   <div class="chart-grid chart-grid--compatta">
     <div class="chart-box"><h4>${t('Confronto fasi — Δ Training Load % a settimana')}${spiegaBtn('confronto-fasi')}</h4>${boxChart(boxTL,Object.assign({fmt:x=>nf(x,0)+'%'},GA))}</div>
     <div class="chart-box"><h4>${t('Correlazione con ritardo — TL → Δpeso')} ${lagValidi.length?`<span class="pill">${lagBars[0].n} ${t('settimane')}</span>`:''}${spiegaBtn('ritardo')}</h4>
       ${lagValidi.length? barChart(lagBars.filter(b=>b.y!=null),Object.assign({fmt:x=>nf(x,2)},GA,{h:195})) : `<div class="empty">${t('Servono più settimane con TL e peso.')}</div>`}
       <div class="graf-nota">${t('r di Pearson fra il carico della settimana N e la variazione di peso 1–5 settimane dopo: il picco indica con quanto ritardo l\'allenamento "si vede" sulla bilancia.')}</div></div>
   </div>
   </div>
   </div><aside class="pag__side">${perLat}
   <div class="callout"><div>${t('<b>Come leggere.</b> Timeline: le fasce colorate sono i periodi (con le kcal/giorno del piano); se il TL regge mentre il peso scende, il cut sta funzionando. Scatter: ogni punto è una settimana — la pendenza della retta dice quanto il surplus/deficit si traduce in peso. Boxplot: barra spessa = mediana, scatola = 50% centrale delle settimane.')}</div></div></aside></div>`;
}
