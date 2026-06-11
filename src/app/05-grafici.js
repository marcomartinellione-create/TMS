/* ════════════════ CHART HELPERS (SVG, no librerie) ════════════════ */
function lineChart(series,opts){
  opts=opts||{}; const W=opts.w||560,H=opts.h||200,P={l:42,r:12,t:10,b:24};
  const all=[].concat(...series.map(s=>s.data.map(d=>d.y))).filter(v=>v!=null&&!isNaN(v));
  if(!all.length) return '<div class="empty">Nessun dato</div>';
  let mn=Math.min(...all),mx=Math.max(...all); if(mn===mx){mx+=1;mn-=1;} const pad=(mx-mn)*.08; mn-=pad; mx+=pad;
  const n=Math.max(...series.map(s=>s.data.length));
  const X=i=>P.l+(n<=1?0:(W-P.l-P.r)*i/(n-1));
  const Y=v=>P.t+(H-P.t-P.b)*(1-(v-mn)/(mx-mn));
  let g='';
  for(let k=0;k<=4;k++){const v=mn+(mx-mn)*k/4,y=Y(v);
    g+=`<line class="grid" x1="${P.l}" y1="${y.toFixed(1)}" x2="${W-P.r}" y2="${y.toFixed(1)}"/>`+
       `<text class="lbl" x="${P.l-5}" y="${(y+3).toFixed(1)}" text-anchor="end">${(opts.fmt||(x=>nf(x,Math.abs(mx)<10?1:0)))(v)}</text>`;}
  if(opts.band){ const yl=Y(opts.band[0]), yh=Y(opts.band[1]); g+=`<rect x="${P.l}" y="${Math.min(yl,yh).toFixed(1)}" width="${(W-P.l-P.r).toFixed(1)}" height="${Math.abs(yl-yh).toFixed(1)}" fill="${opts.band[2]||'rgba(47,125,79,.12)'}"/>`; }
  const labels=opts.labels||series[0].data.map(d=>d.x);
  const step=Math.ceil(n/8);
  labels.forEach((lb,i)=>{ if(i%step===0||i===n-1){ g+=`<text class="lbl" x="${X(i).toFixed(1)}" y="${H-8}" text-anchor="middle">${esc(lb)}</text>`; }});
  series.forEach(s=>{
    let dpath='',pts='';
    s.data.forEach((d,i)=>{ if(d.y==null||isNaN(d.y))return; const x=X(i),y=Y(d.y);
      dpath+=(dpath?' L':'M')+x.toFixed(1)+' '+y.toFixed(1);
      pts+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="${s.color}"/>`;});
    g+=`<path class="ln" d="${dpath}" stroke="${s.color}"/>${pts}`;
  });
  const leg=series.length>1? `<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:11px;margin-top:6px">`+
    series.map(s=>`<span class="mono" style="color:${s.color}">━ ${esc(s.name)}</span>`).join('')+`</div>`:'';
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet"><line class="axis" x1="${P.l}" y1="${P.t}" x2="${P.l}" y2="${H-P.b}"/><line class="axis" x1="${P.l}" y1="${H-P.b}" x2="${W-P.r}" y2="${H-P.b}"/>${g}</svg>${leg}`;
}
function scatterChart(pts,opts){ /* pts: [{x,y,color,label}] · opts: xl/yl etichette assi, trend:true per retta di regressione */
  opts=opts||{}; const W=opts.w||560,H=opts.h||230,P={l:50,r:14,t:12,b:34};
  const valid=pts.filter(p=>p.x!=null&&p.y!=null&&!isNaN(p.x)&&!isNaN(p.y));
  if(valid.length<3) return '<div class="empty">Servono almeno 3 punti (settimane con dati completi).</div>';
  let xmn=Math.min(...valid.map(p=>p.x)),xmx=Math.max(...valid.map(p=>p.x)),ymn=Math.min(...valid.map(p=>p.y)),ymx=Math.max(...valid.map(p=>p.y));
  if(xmn===xmx){xmx+=1;xmn-=1;} if(ymn===ymx){ymx+=1;ymn-=1;}
  const padx=(xmx-xmn)*.08,pady=(ymx-ymn)*.1; xmn-=padx;xmx+=padx;ymn-=pady;ymx+=pady;
  const X=v=>P.l+(W-P.l-P.r)*(v-xmn)/(xmx-xmn), Y=v=>P.t+(H-P.t-P.b)*(1-(v-ymn)/(ymx-ymn));
  let g='';
  for(let k=0;k<=4;k++){ const v=ymn+(ymx-ymn)*k/4,y=Y(v);
    g+=`<line class="grid" x1="${P.l}" y1="${y.toFixed(1)}" x2="${W-P.r}" y2="${y.toFixed(1)}"/><text class="lbl" x="${P.l-5}" y="${(y+3).toFixed(1)}" text-anchor="end">${nf(v,Math.abs(ymx)<10?2:1)}</text>`; }
  for(let k=0;k<=4;k++){ const v=xmn+(xmx-xmn)*k/4,x=X(v);
    g+=`<text class="lbl" x="${x.toFixed(1)}" y="${H-18}" text-anchor="middle">${nf(v,Math.abs(xmx)<10?1:0)}</text>`; }
  /* zero-assi se nel range */
  if(0>xmn&&0<xmx) g+=`<line x1="${X(0).toFixed(1)}" y1="${P.t}" x2="${X(0).toFixed(1)}" y2="${H-P.b}" stroke="var(--ink-4)" stroke-width="1" stroke-dasharray="3 3"/>`;
  if(0>ymn&&0<ymx) g+=`<line x1="${P.l}" y1="${Y(0).toFixed(1)}" x2="${W-P.r}" y2="${Y(0).toFixed(1)}" stroke="var(--ink-4)" stroke-width="1" stroke-dasharray="3 3"/>`;
  if(opts.trend){ const reg=regressione(valid.map(p=>p.x),valid.map(p=>p.y));
    if(reg){ const x1=xmn+padx,x2=xmx-padx;
      g+=`<line x1="${X(x1).toFixed(1)}" y1="${Y(reg.a+reg.b*x1).toFixed(1)}" x2="${X(x2).toFixed(1)}" y2="${Y(reg.a+reg.b*x2).toFixed(1)}" stroke="var(--ember-2)" stroke-width="1.6" stroke-dasharray="6 4"/>`; } }
  valid.forEach(p=>{ g+=`<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="4" fill="${p.color||'var(--orange)'}" opacity=".85">${p.label?`<title>${esc(p.label)}</title>`:''}</circle>`; });
  if(opts.xl) g+=`<text class="lbl" x="${(P.l+(W-P.l-P.r)/2).toFixed(1)}" y="${H-4}" text-anchor="middle" style="font-weight:700">${esc(opts.xl)}</text>`;
  if(opts.yl) g+=`<text class="lbl" x="12" y="${P.t+8}" style="font-weight:700">${esc(opts.yl)}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet"><line class="axis" x1="${P.l}" y1="${P.t}" x2="${P.l}" y2="${H-P.b}"/><line class="axis" x1="${P.l}" y1="${H-P.b}" x2="${W-P.r}" y2="${H-P.b}"/>${g}</svg>`;
}
function boxChart(groups,opts){ /* groups: [{x,values:[..],color}] — box min/Q1/mediana/Q3/max */
  opts=opts||{}; const W=opts.w||560,H=opts.h||230,P={l:50,r:14,t:12,b:30};
  const gs=groups.filter(b=>b.values&&b.values.length>=3);
  if(!gs.length) return '<div class="empty">Servono almeno 3 settimane per fase.</div>';
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
       `<text class="lbl" x="${cx.toFixed(1)}" y="${H-14}" text-anchor="middle">${esc(b.x)} <tspan style="opacity:.65">(${b.values.length})</tspan></text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet"><line class="axis" x1="${P.l}" y1="${P.t}" x2="${P.l}" y2="${H-P.b}"/><line class="axis" x1="${P.l}" y1="${H-P.b}" x2="${W-P.r}" y2="${H-P.b}"/>${g}</svg>`;
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
  opts=opts||{}; const W=opts.w||560,H=opts.h||200,P={l:42,r:12,t:10,b:34};
  const vals=data.map(d=>d.y).filter(v=>v!=null&&!isNaN(v)); if(!vals.length)return '<div class="empty">Nessun dato</div>';
  const mx=Math.max(...vals,0), mn=Math.min(...vals,0);
  const Y=v=>P.t+(H-P.t-P.b)*(1-(v-mn)/((mx-mn)||1));
  const bw=(W-P.l-P.r)/data.length*.62, gap=(W-P.l-P.r)/data.length;
  let g='';
  for(let k=0;k<=4;k++){const v=mn+(mx-mn)*k/4,y=Y(v);
    g+=`<line class="grid" x1="${P.l}" y1="${y.toFixed(1)}" x2="${W-P.r}" y2="${y.toFixed(1)}"/><text class="lbl" x="${P.l-5}" y="${(y+3).toFixed(1)}" text-anchor="end">${(opts.fmt||(x=>nf(x,0)))(v)}</text>`;}
  (opts.refs||[]).forEach(rf=>{ const yy=Y(rf.y); g+=`<line x1="${P.l}" y1="${yy.toFixed(1)}" x2="${W-P.r}" y2="${yy.toFixed(1)}" stroke="${rf.color||'var(--ok)'}" stroke-width="1.3" stroke-dasharray="4 3"/><text class="lbl" x="${W-P.r}" y="${(yy-2).toFixed(1)}" text-anchor="end" style="fill:${rf.color||'var(--ok)'}">${esc(rf.label!=null?rf.label:rf.y)}</text>`; });
  data.forEach((d,i)=>{ const x=P.l+gap*i+gap*.19, y0=Y(0), y=Y(d.y);
    g+=`<rect x="${x.toFixed(1)}" y="${Math.min(y,y0).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.abs(y-y0).toFixed(1)}" fill="${d.color||'var(--orange)'}" rx="2"/>`+
       `<text class="lbl" x="${(x+bw/2).toFixed(1)}" y="${H-20}" text-anchor="middle">${esc(d.x)}</text>`+
       `<text class="lbl" x="${(x+bw/2).toFixed(1)}" y="${(Math.min(y,y0)-3).toFixed(1)}" text-anchor="middle" style="font-size:9px">${(opts.fmt||(x=>nf(x,0)))(d.y)}</text>`;});
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet"><line class="axis" x1="${P.l}" y1="${Y(0).toFixed(1)}" x2="${W-P.r}" y2="${Y(0).toFixed(1)}"/>${g}</svg>`;
}

