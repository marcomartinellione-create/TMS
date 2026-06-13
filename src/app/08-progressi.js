/* ════════════════ RENDER: PROGRESSI ════════════════ */
/* ════ FOSTER 2001 — carico interno (session-RPE) ════
   loadGiorno = RPE × min (AU) · settimanale = somma · monotonia = media7 ÷ SD7 (riposi=0 inclusi) · strain = settimanale × monotonia */
function rpeByWeek(){ const m={}; (DOC.storico_rpe||[]).forEach(r=>{ const s=+r.scheda||0; const ld=(+r.rpe||0)*(+r.min||0);
  if(!m[s])m[s]={day:{},load:0}; m[s].day[r.giorno]=(m[s].day[r.giorno]||0)+ld; m[s].load+=ld; }); return m; }
function fosterWeek(dayMap){
  const vals=GIORNI.map(g=>+(dayMap&&dayMap[g])||0), n=vals.length;
  const load=vals.reduce((a,b)=>a+b,0); if(load<=0) return {load:0,monotony:null,strain:null};
  const mean=load/n, sd=Math.sqrt(vals.reduce((a,v)=>a+(v-mean)*(v-mean),0)/n);
  const monotony=sd>0? mean/sd : null, strain=monotony!=null? load*monotony : null;
  return {load,monotony,strain}; }
function schedeAggr(){
  const map={};
  DOC.storico.forEach(r=>{ if(r.test) return; const s=+r.scheda; if(!map[s])map[s]={scheda:s,tl:0,pctSum:0,pctN:0,grp:{},sets:{},band:{},tonn:0};
    const _t=sTL(r), _p=sPct(r), ser=+r.serie||0; map[s].tl+=_t; if(_p){map[s].pctSum+=_p; map[s].pctN++;}
    const g=r.macro||'Altro'; map[s].grp[g]=(map[s].grp[g]||0)+_t; map[s].sets[g]=(map[s].sets[g]||0)+ser;
    map[s].tonn+=ser*(+r.rip||0)*(+r.peso||0);
    if(_p){ const fb=fascia(_p)[0]; map[s].band[fb]=(map[s].band[fb]||0)+ser; }
  });
  return Object.values(map).sort((a,b)=>a.scheda-b.scheda);
}
function radarChart(items,opts){
  opts=opts||{}; const W=opts.w||380,H=opts.h||300, cx=W/2, cy=H/2+4, R=Math.min(W,H)/2-44, n=items.length;
  if(!n||!items.some(d=>d.value>0)) return '<div class="empty">Nessun dato</div>';
  const mx=Math.max(...items.map(d=>d.value),1);
  const ang=i=>(-Math.PI/2)+i*2*Math.PI/n, pt=(i,r)=>[cx+r*Math.cos(ang(i)), cy+r*Math.sin(ang(i))];
  let g='';
  for(let k=1;k<=4;k++){ const rr=R*k/4; let p=''; for(let i=0;i<n;i++){const a=pt(i,rr); p+=(i?'L':'M')+a[0].toFixed(1)+' '+a[1].toFixed(1);} g+=`<path d="${p}Z" fill="none" stroke="var(--paper-3)"/>`; }
  for(let i=0;i<n;i++){ const a=pt(i,R); g+=`<line x1="${cx}" y1="${cy}" x2="${a[0].toFixed(1)}" y2="${a[1].toFixed(1)}" stroke="var(--border)"/>`; const l=pt(i,R+15); g+=`<text class="lbl" x="${l[0].toFixed(1)}" y="${l[1].toFixed(1)}" text-anchor="middle">${esc(items[i].label)}</text>`; }
  let dp=''; for(let i=0;i<n;i++){ const a=pt(i,R*items[i].value/mx); dp+=(i?'L':'M')+a[0].toFixed(1)+' '+a[1].toFixed(1);} 
  g+=`<path d="${dp}Z" fill="rgba(194,80,10,.18)" stroke="var(--orange)" stroke-width="2"/>`;
  for(let i=0;i<n;i++){ const a=pt(i,R*items[i].value/mx); g+=`<circle cx="${a[0].toFixed(1)}" cy="${a[1].toFixed(1)}" r="2.6" fill="var(--orange)"/>`; }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%">${g}</svg>`;
}
function exerciseList(){ const s=new Set(); DOC.storico.forEach(r=>{ if(r.esercizio) s.add(r.esercizio); }); return [...s].sort((a,b)=>String(a).localeCompare(String(b))); }
function exProgression(nome){ const mm={}; DOC.storico.forEach(r=>{ if(r.esercizio!==nome)return; const s=+r.scheda; if(!mm[s])mm[s]={rm:0,peso:0,scheda:s}; mm[s].rm=Math.max(mm[s].rm,sRM(r)); mm[s].peso=Math.max(mm[s].peso,+r.peso||0); }); return Object.values(mm).sort((a,b)=>a.scheda-b.scheda); }
function realMax(nome){ let best=null; DOC.storico.forEach(r=>{ if(r.esercizio!==nome)return; const pe=+r.peso||0; if(pe>0&&(!best||pe>best.peso)) best={peso:pe,rip:+r.rip||0,scheda:+r.scheda}; }); return best; }
function prList(){ const m={}; DOC.storico.forEach(r=>{ if(!r.esercizio)return; const pe=+r.peso||0; if(pe<=0)return; if(!m[r.esercizio]||pe>m[r.esercizio].peso) m[r.esercizio]={peso:pe,rip:+r.rip||0,scheda:+r.scheda}; }); return Object.entries(m).map(([nome,v])=>({nome:nome,peso:v.peso,rip:v.rip,scheda:v.scheda})).sort((a,b)=>b.peso-a.peso); }
let progEx=null;
function plateauList(){
  const out=[];
  exerciseList().forEach(nome=>{
    const rows=DOC.storico.filter(r=>r.esercizio===nome && !r.test && (+r.peso||0)>0); if(!rows.length)return;
    const bySch={}; rows.forEach(r=>{ const s=+r.scheda; bySch[s]=(bySch[s]||0)+sTL(r); }); /* TL per scheda (carico+ripetizioni) */
    const schede=Object.keys(bySch).map(Number).sort((a,b)=>a-b); if(schede.length<4)return;
    const maxTL=Math.max(...schede.map(s=>bySch[s]));
    let lastMaxIdx=0; schede.forEach((s,i)=>{ if(bySch[s]>=maxTL-1e-6) lastMaxIdx=i; });
    const since=schede.length-1-lastMaxIdx;
    if(since>=3) out.push({nome:nome, since:since});
  });
  return out.sort((a,b)=>b.since-a.since);
}
function renderProgressi(){
  const ag=schedeAggr();
  if(!ag.length){ document.getElementById('panel-progressi').innerHTML='<div class="empty">Nessuna scheda salvata: salvane almeno una per vedere i progressi.</div>'; return; }
  const labels=ag.map(a=>schedaLabel(a.scheda));
  const last=ag[ag.length-1], prev=ag.length>1?ag[ag.length-2]:null;
  const dTL=prev&&prev.tl?(last.tl/prev.tl-1)*100:0;
  const lastPct=last.pctN?last.pctSum/last.pctN:0;
  const grpColors={Gambe:'#c2500a',Pettorali:'#d4a017',Schiena:'#2f7d4f',Spalle:'#7a3ea8',Braccia:'#b8860b',Core:'#991b1b',Altro:'#7a6a50'};
  const mavg=ag.map((a,i)=>{ const w=ag.slice(Math.max(0,i-3),i+1); return w.reduce((s,x)=>s+x.tl,0)/w.length; });
  const acwr=ag.map((a,i)=>{ const w=ag.slice(Math.max(0,i-3),i+1); const c=w.reduce((s,x)=>s+x.tl,0)/w.length; return c? a.tl/c:null; });
  const lastAcwr=acwr[acwr.length-1];
  const cards=`<div class="sec">▌ Record personali · carico massimo</div><div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">${MAINLIFTS.map(L=>{ const r=realMax(L.nome); return `<div class="card pr-card"><div class="pr-ex">${esc(L.label)}</div><div class="pr-val">${r?nf(r.peso,0):'—'}<span>kg</span></div><div class="pr-sub">${r?('record'+(r.rip?(' · ×'+nf(r.rip,0)):'')):'nessun dato'}</div></div>`; }).join('')}</div>`;
  const tlSeries=[{name:'TL',color:'var(--orange-b)',data:ag.map((a,i)=>({x:labels[i],y:a.tl||null}))},{name:'Media mobile 4',color:'var(--ink-3)',data:ag.map((a,i)=>({x:labels[i],y:mavg[i]}))}];
  const acwrSeries=[{name:'ACWR',color:'var(--violet)',data:ag.map((a,i)=>({x:labels[i],y:acwr[i]}))}];
  const dSeries=[{name:'Δ TL %',color:'var(--violet)',data:ag.map((a,i)=>({x:labels[i],y:i>0&&ag[i-1].tl?((a.tl/ag[i-1].tl)-1)*100:null}))}];
  const tonnSeries=[{name:'Tonnellaggio',color:'var(--gold-2)',data:ag.map((a,i)=>({x:labels[i],y:a.tonn||null}))}];
  const radarItems=GRUPPI.map(g=>({label:g,value:(last.sets[g]||0)+(g==='Cardio'?cardioEquivSets(last.scheda):0)}));
  const setsData=GRUPPI.map(g=>({x:g,y:last.sets[g]||0,color:grpColors[g]}));
  const grpSeries=GRUPPI.map(g=>({name:g,color:grpColors[g],data:ag.map((a,i)=>({x:labels[i],y:a.grp[g]||null}))}));
  const BANDS=['Forza','Forza+Iper','Ipertrofia','Resistenza','Metabolico'];
  const bcol={'Forza':'#991b1b','Forza+Iper':'#c2500a','Ipertrofia':'#d4a017','Resistenza':'#2f7d4f','Metabolico':'#7a3ea8'};
  const intData=BANDS.map(b=>({x:b.length>6?b.slice(0,5):b,y:last.band[b]||0,color:bcol[b]}));
  const exs=exerciseList(); if(progEx==null||!exs.includes(progEx)) progEx=exs[0]||'';
  const prog=exProgression(progEx); const plab=prog.map(p=>schedaLabel(p.scheda));
  const exSeries=[{name:'1RM stimato',color:'var(--orange-b)',data:prog.map((p,i)=>({x:plab[i],y:p.rm||null}))},{name:'Peso max',color:'var(--violet)',data:prog.map((p,i)=>({x:plab[i],y:p.peso||null}))}];
  const prs=prList().slice(0,15);
  const plats=plateauList();
  /* Foster — carico interno settimanale, allineato ai codici-settimana dello storico esterno */
  const rpw=rpeByWeek();
  const foster=ag.map(a=>fosterWeek(rpw[a.scheda]&&rpw[a.scheda].day));
  const hasRpe=useRpeActive() && foster.some(x=>x&&x.load>0);
  const sRpeSeries=[{name:'Carico interno (sRPE)',color:'var(--gold-2)',data:ag.map((a,i)=>({x:labels[i],y:foster[i].load||null}))}];
  const monoSeries=[{name:'Monotonia',color:'var(--violet)',data:ag.map((a,i)=>({x:labels[i],y:foster[i].monotony}))}];
  const strainSeries=[{name:'Strain',color:'var(--orange-b)',data:ag.map((a,i)=>({x:labels[i],y:foster[i].strain}))}];
  const lf=foster[foster.length-1];
  let fosterSignal='';
  if(hasRpe && lf){
    if(lf.monotony!=null && lf.monotony>2 && lf.load>0) fosterSignal=`<div class="callout" style="background:var(--danger-t);border-color:#e6b8b8;border-left-color:var(--danger)"><div>⚠️ <b>Monotonia alta</b> (${nf(lf.monotony,2)}): settimana poco variata. Foster associa <b>monotonia + carico elevati</b> a maggior rischio di sovraccarico/malattia — varia i carichi giornalieri o inserisci un riposo.</div></div>`;
    else fosterSignal=`<div class="callout callout--info"><div>Carico interno ultima settimana: <b>${nfk(lf.load)} AU</b>${lf.monotony!=null?` · monotonia <b>${nf(lf.monotony,2)}</b>`:''}${lf.strain!=null?` · strain <b>${nfk(lf.strain)}</b>`:''}.</div></div>`;
  }
  let segnali='';
  if(lastAcwr!=null && lastAcwr>1.5) segnali+=`<div class="callout" style="background:var(--danger-t);border-color:#e6b8b8;border-left-color:var(--danger)"><div>⚠️ <b>Carico molto alto</b> (ACWR ${nf(lastAcwr,2)}): valuta una <b>settimana di scarico (deload)</b>.</div></div>`;
  else if(lastAcwr!=null && lastAcwr<0.8) segnali+=`<div class="callout callout--info"><div>🛌 <b>Carico basso</b> (ACWR ${nf(lastAcwr,2)}): fase di scarico/ripresa. Se non voluto, aumenta gradualmente.</div></div>`;
  if(plats.length) segnali+=`<div class="callout"><div>⏸ <b>In stallo</b> (TL fermo da ≥3 schede): ${plats.slice(0,6).map(p=>esc(p.nome)+' <span class="muted">('+p.since+' sett.)</span>').join(' · ')}. Valuta variazione di carico, volume o esercizio.</div></div>`;
  if(!segnali) segnali=`<div class="callout" style="background:var(--ok-t);border-color:#bcdcc6;border-left-color:var(--ok)"><div>✓ Nessun segnale critico: carico e progressione regolari.</div></div>`;
  document.getElementById('panel-progressi').innerHTML=cards+`
   <div class="sec">▌ Segnali</div>${segnali}
   <div class="sec">▌ Carico allenante (Training Load)</div>
   <div class="chart-grid">
     <div class="chart-box"><h4>📈 TL totale + media mobile</h4>${lineChart(tlSeries,{labels,fmt:nfk})}</div>
     <div class="chart-box"><h4>⚖ ACWR (acuto:cronico) · zona 0.8–1.3</h4>${lineChart(acwrSeries,{labels,band:[0.8,1.3,'rgba(47,125,79,.13)']})}</div>
   </div>
   <div class="chart-grid">
     <div class="chart-box"><h4>🏋 Tonnellaggio per scheda (kg)</h4>${lineChart(tonnSeries,{labels,fmt:nfk})}</div>
     <div class="chart-box"><h4>Δ Variazione TL %</h4>${lineChart(dSeries,{labels})}</div>
   </div>
   ${hasRpe?`<div class="sec">▌ Carico interno · session-RPE (Foster 2001)</div>
   ${fosterSignal}
   <div class="chart-grid">
     <div class="chart-box"><h4>🔥 Carico interno settimanale <span class="muted" style="font-size:11px">(sRPE = RPE×min, AU)</span></h4>${lineChart(sRpeSeries,{labels,fmt:nfk})}</div>
     <div class="chart-box"><h4>📊 Monotonia <span class="muted" style="font-size:11px">(media7÷SD7 · zona ≤2)</span></h4>${lineChart(monoSeries,{labels,band:[0,2,'rgba(47,125,79,.10)']})}</div>
   </div>
   <div class="chart-grid">
     <div class="chart-box"><h4>⚡ Strain <span class="muted" style="font-size:11px">(settimanale × monotonia)</span></h4>${lineChart(strainSeries,{labels,fmt:nfk})}</div>
     <div class="chart-box"><h4>📈 Interno vs esterno <span class="muted" style="font-size:11px">(indice, base 100)</span></h4>${(()=>{const bI=(ag.map((a,i)=>foster[i].load).find(v=>v>0))||0,bE=(ag.map(a=>a.tl).find(v=>v>0))||0;return lineChart([{name:'sRPE',color:'var(--gold-2)',data:ag.map((a,i)=>({x:labels[i],y:bI&&foster[i].load?foster[i].load/bI*100:null}))},{name:'TL esterno',color:'var(--orange-b)',data:ag.map((a,i)=>({x:labels[i],y:bE&&a.tl?a.tl/bE*100:null}))}],{labels})})()}</div>
   </div>`:''}
   <div class="sec">▌ Volume & equilibrio per gruppo muscolare</div>
   <div class="chart-grid">
     <div class="chart-box"><h4>🕸 Equilibrio volume · serie per gruppo <span class="muted" style="font-size:11px">(Cardio: min÷10 dal tab Cardio · 2 h/sett ≈ 12)</span></h4>${radarChart(radarItems)}</div>
     <div class="chart-box"><h4>🔢 Serie per gruppo · ultima settimana <span class="muted" style="font-size:11px">(zona ipertrofia 10–20)</span></h4>${barChart(setsData,{refs:[{y:10,label:'10',color:'var(--ok)'},{y:20,label:'20',color:'var(--danger-b)'}]})}</div>
   </div>
   <div class="chart-grid">
     <div class="chart-box"><h4>Andamento TL per gruppo</h4>${lineChart(grpSeries,{labels,fmt:nfk})}</div>
     <div class="chart-box"><h4>🎯 Distribuzione intensità · ultima (serie per fascia)</h4>${barChart(intData)}</div>
   </div>
   <div class="sec">▌ Progressione per esercizio</div>
   <div class="chart-box">
     <div class="bar" style="margin:0 0 8px"><div class="field"><label>Esercizio</label><select id="prog-ex" style="min-width:220px">${exs.map(e=>`<option${e===progEx?' selected':''}>${esc(e)}</option>`).join('')}</select></div></div>
     ${prog.length?lineChart(exSeries,{labels:plab,h:230}):'<div class="empty">Nessun dato per questo esercizio.</div>'}
   </div>
   ${cardioProgressBlock()}
`;
  const sel=document.getElementById('prog-ex'); if(sel) sel.onchange=e=>{ progEx=e.target.value; renderProgressi(); };
  bindCardioProgress();
}
