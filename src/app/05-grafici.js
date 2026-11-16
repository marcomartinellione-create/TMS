/* ════════════════ CHART HELPERS (SVG, no librerie) ════════════════ */
/* VISTA COMPATTA (Progressi e Analisi, 2026-11-16): opts.fs = grandezza delle scritte nelle unità
   del disegno. Serve perché il grafico si scala sulla larghezza della sua cella: in una griglia fitta
   il disegno è più stretto e le scritte vanno pensate per quella misura. Con opts.fs le etichette
   dell'asse orizzontale si diradano finché ci stanno, la legenda si stringe, le barre sfalsano i nomi
   lunghi. Senza opts.fs i grafici restano come prima (Report, Corpo, Cardio…). */
function grafFs(opts){ return (opts&&opts.fs)? ` style="--graf-fs:${opts.fs}px"` : ''; }
function grafLeg(opts){ return (opts&&opts.fs)? 'display:flex;gap:1px 10px;flex-wrap:wrap;font-size:10px;line-height:1.35;margin-top:2px' : 'display:flex;gap:14px;flex-wrap:wrap;font-size:11px;margin-top:6px'; }
/* un grafico largo (Timeline, Progressione per esercizio) disegnato in due misure: quella larga
   per la griglia a più colonne, quella stretta per la colonna unica. Il CSS mostra quella giusta
   secondo la larghezza della pagina (.graf-v, @container): un disegno largo ristretto in una
   colonna avrebbe scritte illeggibili. */
function grafVarianti(largo, stretto){
  return `<div class="graf-v graf-v--largo">${largo}</div><div class="graf-v graf-v--stretto">${stretto}</div>`;
}
/* quante etichette di date stanno sull'asse: al massimo 8 come sempre, meno se il disegno è stretto */
function grafNEtich(opts,larg,labels,fs){
  if(!(opts&&opts.fs)) return 8;
  const lung=Math.max(1,...labels.map(l=>String(l==null?'':l).length));
  return Math.max(2,Math.min(8,Math.floor(larg/(lung*fs*0.6+10))));
}
/* etichette dell'asse orizzontale: 1 ogni `step` più SEMPRE l'ultima (la più recente); se però
   l'ultima cadrebbe addosso alla precedente, quella precedente si salta: senza questo controllo le
   due date finali si sovrapponevano (es. «20/04/26» su «04/05/26»). L'ultima, centrata sul suo
   punto, usciva in parte dal disegno («04/05/2»): se non ci sta si allinea a destra sul bordo, e
   il controllo di sovrapposizione guarda dove finisce davvero. */
function grafEtichX(labels,X,W,FS,step,y){
  const ult=labels.length-1, lw=lb=>String(lb==null?'':lb).length*FS*0.6;
  const idx=[]; labels.forEach((lb,i)=>{ const suPasso=(i%step===0), ultima=(i===ult);
    if(!suPasso && !ultima) return; if(suPasso && !ultima && (ult-i)<step*0.6) return; idx.push(i); });
  const fuori=X(ult)+lw(labels[ult])/2>W-1, sinUlt=fuori? W-1-lw(labels[ult]) : X(ult)-lw(labels[ult])/2;
  if(idx.length>1){ const p=idx[idx.length-2]; if(X(p)+lw(labels[p])/2+4>sinUlt) idx.splice(idx.length-2,1); }
  return idx.map(i=>{ const e=(i===ult&&fuori);
    return `<text class="lbl" x="${(e?W-1:X(i)).toFixed(1)}" y="${y}" text-anchor="${e?'end':'middle'}">${esc(labels[i])}</text>`; }).join('');
}
/* decimali della scala verticale: abbastanza da non ripetere lo stesso numero su due righe
   (la Monotonia, fra 1,38 e 1,53, scriveva «1,5» cinque volte) */
function grafDec(mn,mx,base){ const passo=(mx-mn)/4; return passo>0? Math.min(2,Math.max(base,Math.ceil(-Math.log10(passo)))) : base; }
function lineChart(series,opts){
  opts=opts||{}; const W=opts.w||560,H=opts.h||200,FS=opts.fs||9,P={l:42,r:12,t:10,b:24};
  const all=[].concat(...series.map(s=>s.data.map(d=>d.y))).filter(v=>v!=null&&!isNaN(v));
  if(!all.length) return `<div class="empty">${t('Nessun dato')}</div>`;
  let mn=Math.min(...all),mx=Math.max(...all); if(mn===mx){mx+=1;mn-=1;} const pad=(mx-mn)*.08; mn-=pad; mx+=pad;
  const n=Math.max(...series.map(s=>s.data.length));
  const X=i=>P.l+(n<=1?0:(W-P.l-P.r)*i/(n-1));
  const Y=v=>P.t+(H-P.t-P.b)*(1-(v-mn)/(mx-mn));
  let g='';
  for(let k=0;k<=4;k++){const v=mn+(mx-mn)*k/4,y=Y(v);
    g+=`<line class="grid" x1="${P.l}" y1="${y.toFixed(1)}" x2="${W-P.r}" y2="${y.toFixed(1)}"/>`+
       `<text class="lbl" x="${P.l-5}" y="${(y+3).toFixed(1)}" text-anchor="end">${(opts.fmt||(x=>nf(x,grafDec(mn,mx,Math.abs(mx)<10?1:0))))(v)}</text>`;}
  if(opts.band){ const yl=Y(opts.band[0]), yh=Y(opts.band[1]); g+=`<rect x="${P.l}" y="${Math.min(yl,yh).toFixed(1)}" width="${(W-P.l-P.r).toFixed(1)}" height="${Math.abs(yl-yh).toFixed(1)}" fill="${opts.band[2]||'rgba(47,125,79,.12)'}"/>`; }
  const labels=opts.labels||series[0].data.map(d=>d.x);
  const fmtV=opts.fmt||(x=>nf(x,Math.abs(x)<10?2:(Math.abs(x)<100?1:0)));
  g+=grafEtichX(labels.slice(0,n),X,W,FS,Math.ceil(n/grafNEtich(opts,W-P.l-P.r,labels,FS)),H-8);
  series.forEach(s=>{
    let dpath='',pts='';
    s.data.forEach((d,i)=>{ if(d.y==null||isNaN(d.y))return; const x=X(i),y=Y(d.y);
      dpath+=(dpath?' L':'M')+x.toFixed(1)+' '+y.toFixed(1);
      /* cerchio largo e trasparente sopra il punto: passandoci col mouse si legge il valore
         esatto (prima il grafico diceva l'andamento ma non il numero) */
      const tip=esc((labels[i]!=null?labels[i]:d.x)+' · '+(series.length>1?s.name+' ':'')+fmtV(d.y));
      pts+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="${s.color}"/><circle class="pt-hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="transparent"><title>${tip}</title></circle>`;});
    g+=`<path class="ln" d="${dpath}" stroke="${s.color}"/>${pts}`;
  });
  const leg=series.length>1? `<div style="${grafLeg(opts)}">`+
    series.map(s=>`<span class="mono" style="color:${s.color}">━ ${esc(s.name)}</span>`).join('')+`</div>`:'';
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet"${grafFs(opts)}><line class="axis" x1="${P.l}" y1="${P.t}" x2="${P.l}" y2="${H-P.b}"/><line class="axis" x1="${P.l}" y1="${H-P.b}" x2="${W-P.r}" y2="${H-P.b}"/>${g}</svg>${leg}`;
}
function scatterChart(pts,opts){ /* pts: [{x,y,color,label}] · opts: xl/yl etichette assi, trend:true per retta di regressione */
  /* il titolo dell'asse verticale sta in una riga sua, sopra il disegno: dentro l'area
     finiva addosso all'etichetta più alta della scala («Δpeso kg» sopra «1,25») */
  opts=opts||{}; const W=opts.w||560,H=opts.h||230,FS=opts.fs||9,P={l:50,r:14,t:opts.yl?FS+13:12,b:FS>9?FS+28:34};
  const valid=pts.filter(p=>p.x!=null&&p.y!=null&&!isNaN(p.x)&&!isNaN(p.y));
  if(valid.length<3) return `<div class="empty">${t('Servono almeno 3 punti (settimane con dati completi).')}</div>`;
  let xmn=Math.min(...valid.map(p=>p.x)),xmx=Math.max(...valid.map(p=>p.x)),ymn=Math.min(...valid.map(p=>p.y)),ymx=Math.max(...valid.map(p=>p.y));
  if(xmn===xmx){xmx+=1;xmn-=1;} if(ymn===ymx){ymx+=1;ymn-=1;}
  const padx=(xmx-xmn)*.08,pady=(ymx-ymn)*.1; xmn-=padx;xmx+=padx;ymn-=pady;ymx+=pady;
  const X=v=>P.l+(W-P.l-P.r)*(v-xmn)/(xmx-xmn), Y=v=>P.t+(H-P.t-P.b)*(1-(v-ymn)/(ymx-ymn));
  let g='';
  for(let k=0;k<=4;k++){ const v=ymn+(ymx-ymn)*k/4,y=Y(v);
    g+=`<line class="grid" x1="${P.l}" y1="${y.toFixed(1)}" x2="${W-P.r}" y2="${y.toFixed(1)}"/><text class="lbl" x="${P.l-5}" y="${(y+3).toFixed(1)}" text-anchor="end">${nf(v,Math.abs(ymx)<10?2:1)}</text>`; }
  for(let k=0;k<=4;k++){ const v=xmn+(xmx-xmn)*k/4,x=X(v);
    g+=`<text class="lbl" x="${x.toFixed(1)}" y="${FS>9?(H-P.b+FS+5).toFixed(1):H-18}" text-anchor="middle">${nf(v,Math.abs(xmx)<10?1:0)}</text>`; }
  /* zero-assi se nel range */
  if(0>xmn&&0<xmx) g+=`<line x1="${X(0).toFixed(1)}" y1="${P.t}" x2="${X(0).toFixed(1)}" y2="${H-P.b}" stroke="var(--ink-4)" stroke-width="1" stroke-dasharray="3 3"/>`;
  if(0>ymn&&0<ymx) g+=`<line x1="${P.l}" y1="${Y(0).toFixed(1)}" x2="${W-P.r}" y2="${Y(0).toFixed(1)}" stroke="var(--ink-4)" stroke-width="1" stroke-dasharray="3 3"/>`;
  if(opts.trend){ const reg=regressione(valid.map(p=>p.x),valid.map(p=>p.y));
    if(reg){ const x1=xmn+padx,x2=xmx-padx;
      g+=`<line x1="${X(x1).toFixed(1)}" y1="${Y(reg.a+reg.b*x1).toFixed(1)}" x2="${X(x2).toFixed(1)}" y2="${Y(reg.a+reg.b*x2).toFixed(1)}" stroke="var(--ember-2)" stroke-width="1.6" stroke-dasharray="6 4"/>`; } }
  valid.forEach(p=>{ g+=`<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="4" fill="${p.color||'var(--orange)'}" opacity=".85">${p.label?`<title>${esc(p.label)}</title>`:''}</circle>`; });
  if(opts.xl) g+=`<text class="lbl" x="${(P.l+(W-P.l-P.r)/2).toFixed(1)}" y="${H-4}" text-anchor="middle" style="font-weight:700">${esc(opts.xl)}</text>`;
  if(opts.yl) g+=`<text class="lbl" x="4" y="${FS+3}" style="font-weight:700">${esc(opts.yl)}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet"${grafFs(opts)}><line class="axis" x1="${P.l}" y1="${P.t}" x2="${P.l}" y2="${H-P.b}"/><line class="axis" x1="${P.l}" y1="${H-P.b}" x2="${W-P.r}" y2="${H-P.b}"/>${g}</svg>`;
}
function boxChart(groups,opts){ /* groups: [{x,values:[..],color}] — box min/Q1/mediana/Q3/max */
  opts=opts||{}; const W=opts.w||560,H=opts.h||230,FS=opts.fs||9,P={l:50,r:14,t:12,b:FS>9?FS+16:30};
  const gs=groups.filter(b=>b.values&&b.values.length>=3);
  if(!gs.length) return `<div class="empty">${t('Servono almeno 3 settimane per fase.')}</div>`;
  const all=[].concat(...gs.map(b=>b.values));
  let mn=Math.min(...all),mx=Math.max(...all); if(mn===mx){mx+=1;mn-=1;} const pad=(mx-mn)*.1; mn-=pad;mx+=pad;
  const Y=v=>P.t+(H-P.t-P.b)*(1-(v-mn)/(mx-mn));
  let g='';
  for(let k=0;k<=4;k++){ const v=mn+(mx-mn)*k/4,y=Y(v);
    g+=`<line class="grid" x1="${P.l}" y1="${y.toFixed(1)}" x2="${W-P.r}" y2="${y.toFixed(1)}"/><text class="lbl" x="${P.l-5}" y="${(y+3).toFixed(1)}" text-anchor="end">${(opts.fmt||(x=>nf(x,1)))(v)}</text>`; }
  if(0>mn&&0<mx) g+=`<line x1="${P.l}" y1="${Y(0).toFixed(1)}" x2="${W-P.r}" y2="${Y(0).toFixed(1)}" stroke="var(--ink-4)" stroke-width="1" stroke-dasharray="3 3"/>`;
  const slot=(W-P.l-P.r)/gs.length, bw=Math.min(slot*.42,56);
  gs.forEach((b,i)=>{
    const v=[...b.values].sort((a,c)=>a-c);
    const q=p=>{ const t=(v.length-1)*p, lo=Math.floor(t), hi=Math.ceil(t); return v[lo]+(v[hi]-v[lo])*(t-lo); };
    const q1=q(.25),med=q(.5),q3=q(.75),lo=v[0],hi=v[v.length-1];
    const cx=P.l+slot*i+slot/2, col=b.color||'var(--orange)';
    g+=`<line x1="${cx.toFixed(1)}" y1="${Y(lo).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${Y(hi).toFixed(1)}" stroke="${col}" stroke-width="1.4"/>`+
       `<line x1="${(cx-bw/3).toFixed(1)}" y1="${Y(lo).toFixed(1)}" x2="${(cx+bw/3).toFixed(1)}" y2="${Y(lo).toFixed(1)}" stroke="${col}" stroke-width="1.4"/>`+
       `<line x1="${(cx-bw/3).toFixed(1)}" y1="${Y(hi).toFixed(1)}" x2="${(cx+bw/3).toFixed(1)}" y2="${Y(hi).toFixed(1)}" stroke="${col}" stroke-width="1.4"/>`+
       `<rect x="${(cx-bw/2).toFixed(1)}" y="${Y(q3).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1,Y(q1)-Y(q3)).toFixed(1)}" fill="${col}" opacity=".30" stroke="${col}" rx="3"/>`+
       `<line x1="${(cx-bw/2).toFixed(1)}" y1="${Y(med).toFixed(1)}" x2="${(cx+bw/2).toFixed(1)}" y2="${Y(med).toFixed(1)}" stroke="${col}" stroke-width="2.4"/>`+
       `<text class="lbl" x="${cx.toFixed(1)}" y="${FS>9?(H-P.b+FS+5).toFixed(1):H-14}" text-anchor="middle">${esc(b.x)} <tspan style="opacity:.65">(${b.values.length})</tspan></text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet"${grafFs(opts)}><line class="axis" x1="${P.l}" y1="${P.t}" x2="${P.l}" y2="${H-P.b}"/><line class="axis" x1="${P.l}" y1="${H-P.b}" x2="${W-P.r}" y2="${H-P.b}"/>${g}</svg>`;
}
function regressione(xs,ys){ const n=xs.length; if(n<2) return null;
  const mx=xs.reduce((a,b)=>a+b,0)/n, my=ys.reduce((a,b)=>a+b,0)/n;
  let num=0,den=0; for(let i=0;i<n;i++){ num+=(xs[i]-mx)*(ys[i]-my); den+=(xs[i]-mx)*(xs[i]-mx); }
  if(!den) return null; const b=num/den; return {a:my-b*mx, b:b};
}
function pearson(xs,ys){ const n=Math.min(xs.length,ys.length); if(n<3) return null;
  const mx=xs.reduce((a,b)=>a+b,0)/n, my=ys.reduce((a,b)=>a+b,0)/n;
  let num=0,dx=0,dy=0; for(let i=0;i<n;i++){ num+=(xs[i]-mx)*(ys[i]-my); dx+=(xs[i]-mx)**2; dy+=(ys[i]-my)**2; }
  const den=Math.sqrt(dx*dy); return den? num/den : null;
}
function barChart(data,opts){
  opts=opts||{}; const W=opts.w||560,H=opts.h||200,FS=opts.fs||9,P={l:42,r:12,t:10,b:34};
  const vals=data.map(d=>d.y).filter(v=>v!=null&&!isNaN(v)); if(!vals.length)return `<div class="empty">${t('Nessun dato')}</div>`;
  const mx=Math.max(...vals,0), mn=Math.min(...vals,0);
  const bw=(W-P.l-P.r)/data.length*.62, gap=(W-P.l-P.r)/data.length;
  /* vista compatta: se i nomi sotto le barre non ci stanno affiancati («Pettorali» in una barra
     stretta), uno sì e uno no scendono di una riga invece di accavallarsi */
  const sfalsa=!!opts.fs && data.some(d=>String(d.x).length*FS*0.6>gap*0.94);
  if(opts.fs) P.b=sfalsa? 2*FS+14 : FS+13;
  const yNome=i=>opts.fs? H-P.b+FS+4+(sfalsa&&i%2? FS+2 : 0) : H-20;
  const Y=v=>P.t+(H-P.t-P.b)*(1-(v-mn)/((mx-mn)||1));
  let g='';
  for(let k=0;k<=4;k++){const v=mn+(mx-mn)*k/4,y=Y(v);
    g+=`<line class="grid" x1="${P.l}" y1="${y.toFixed(1)}" x2="${W-P.r}" y2="${y.toFixed(1)}"/><text class="lbl" x="${P.l-5}" y="${(y+3).toFixed(1)}" text-anchor="end">${(opts.fmt||(x=>nf(x,0)))(v)}</text>`;}
  (opts.refs||[]).forEach(rf=>{ const yy=Y(rf.y); g+=`<line x1="${P.l}" y1="${yy.toFixed(1)}" x2="${W-P.r}" y2="${yy.toFixed(1)}" stroke="${rf.color||'var(--ok)'}" stroke-width="1.3" stroke-dasharray="4 3"/><text class="lbl" x="${W-P.r}" y="${(yy-2).toFixed(1)}" text-anchor="end" style="fill:${rf.color||'var(--ok)'}">${esc(rf.label!=null?rf.label:rf.y)}</text>`; });
  data.forEach((d,i)=>{ const x=P.l+gap*i+gap*.19, y0=Y(0), y=Y(d.y);
    g+=`<rect x="${x.toFixed(1)}" y="${Math.min(y,y0).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.abs(y-y0).toFixed(1)}" fill="${d.color||'var(--orange)'}" rx="2"><title>${esc(d.x+' · '+(opts.fmt||(x=>nf(x,1)))(d.y))}</title></rect>`+
       `<text class="lbl" x="${(x+bw/2).toFixed(1)}" y="${yNome(i).toFixed(1)}" text-anchor="middle">${esc(d.x)}</text>`+
       `<text class="lbl" x="${(x+bw/2).toFixed(1)}" y="${(Math.min(y,y0)-3).toFixed(1)}" text-anchor="middle" style="font-size:${opts.fs?FS-1:9}px">${(opts.fmt||(x=>nf(x,0)))(d.y)}</text>`;});
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet"${grafFs(opts)}><line class="axis" x1="${P.l}" y1="${Y(0).toFixed(1)}" x2="${W-P.r}" y2="${Y(0).toFixed(1)}"/>${g}</svg>`;
}

