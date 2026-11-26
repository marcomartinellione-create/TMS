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
/* ── GRAFICI A LINEE INTERATTIVI (2026-11-16) ──────────────────────────────────────────────────
   Marco: «tutti i grafici cartesiani con più linee con la stessa interattività di quello su Claude:
   a seconda di dove vado col mouse mi dà i dati puntuali, con animazioni belle e curate». Come il
   modo «index» di Chart.js: in qualunque punto del disegno si prende la settimana più vicina, una
   linea verticale la segna, i punti di tutte le linee si accendono e un riquadro accanto al mouse
   dice la data e il valore di ogni linea. Tutto scorre morbido da una settimana all'altra.
   I dati del riquadro viaggiano nel disegno (data-g, valori già scritti come nel grafico): un solo
   ascoltatore sul documento serve tutti i grafici, anche quelli appena ridisegnati.
   All'ENTRATA le linee si disegnano da sinistra a destra, una volta per dato: ridisegnare lo stesso
   grafico (un clic altrove, il ritorno sul tab) non rifà l'animazione; se i dati cambiano sì.
   Niente animazioni nel Report e nel PDF (html2canvas fotograferebbe il disegno a metà), in stampa
   e con «riduci movimento» del sistema: lì il grafico è sempre intero. */
let grafIdN=0;
function grafFirma(s){ let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return (h>>>0).toString(36); }
/* o = {W,H,P, xs:[x di ogni settimana], labels:[data], serie:[{n:nome,c:colore,y:[y nel disegno|null],v:[valore scritto|null]}], extra:[nota|''] } */
function grafInterattivo(o){
  const id='gclip'+(++grafIdN), r1=v=>v==null? null : Math.round(v*10)/10;
  const dati={x:o.xs.map(r1), l:o.labels.map(l=>String(l==null?'':l)), t:o.P.t, b:o.H-o.P.b, sx:o.P.l, dx:o.W-o.P.r,
    s:o.serie.map(s=>({n:String(s.n==null?'':s.n), c:s.c, y:s.y.map(r1), v:s.v})), e:o.extra||null};
  const js=JSON.stringify(dati);
  return { attr:` class="graf-lin" data-firma="${grafFirma(o.W+'x'+o.H+js)}" data-g="${esc(js)}"`,
    defs:`<defs><clipPath id="${id}"><rect class="g-clip" x="0" y="0" width="${o.W}" height="${o.H}"/></clipPath></defs>`,
    clip:` clip-path="url(#${id})"`,
    hover:`<g class="g-hover" aria-hidden="true"><line class="g-guida" x1="0" y1="${o.P.t}" x2="0" y2="${o.H-o.P.b}"/>`+
      o.serie.map(s=>`<circle class="g-punto" cx="0" cy="0" r="4.6" fill="${s.c}"/>`).join('')+`</g>` };
}
/* settimana più vicina a x (unità del disegno), fra quelle con almeno un valore */
function grafIndice(g,x){ let best=-1, dist=Infinity;
  g.x.forEach((xi,i)=>{ if(!g.s.some(s=>s.y[i]!=null)) return; const d=Math.abs(xi-x); if(d<dist){ dist=d; best=i; } }); return best; }
function grafTipHtml(g,i){
  return `<div class="graf-tip__t">${esc(g.l[i])}</div>`+
    g.s.filter(s=>s.y[i]!=null).map(s=>`<div class="graf-tip__r"><span class="graf-tip__c" style="background:${s.c}"></span><span class="graf-tip__n">${esc(s.n)}</span><b>${esc(s.v[i])}</b></div>`).join('')+
    (g.e&&g.e[i]? `<div class="graf-tip__e">${esc(g.e[i])}</div>` : '');
}
const GRAF_TIP={el:null, svg:null, i:-1};
function grafTipEl(){ if(!GRAF_TIP.el || !GRAF_TIP.el.isConnected){ const d=document.createElement('div'); d.className='graf-tip'; d.setAttribute('role','tooltip'); document.body.appendChild(d); GRAF_TIP.el=d; } return GRAF_TIP.el; }
function grafDati(svg){ if(svg._g===undefined){ try{ svg._g=JSON.parse(svg.getAttribute('data-g')); }catch(e){ svg._g=null; } } return svg._g; }
function grafSpegni(){
  if(GRAF_TIP.svg) GRAF_TIP.svg.classList.remove('g-on');
  if(GRAF_TIP.el) GRAF_TIP.el.classList.remove('is-on');
  GRAF_TIP.svg=null; GRAF_TIP.i=-1;
}
/* un passaggio del mouse (o un tocco) su un grafico a linee */
function grafMostra(svg,e){
  const g=grafDati(svg), m=g && svg.getScreenCTM && svg.getScreenCTM(); if(!m || !m.a){ grafSpegni(); return; }
  const x=(e.clientX-m.e)/m.a, y=(e.clientY-m.f)/m.d;
  if(x<g.sx-14 || x>g.dx+14 || y<g.t-14 || y>g.b+14){ grafSpegni(); return; }
  const i=grafIndice(g,x); if(i<0){ grafSpegni(); return; }
  const tip=grafTipEl(), nuovo=GRAF_TIP.svg!==svg;
  if(nuovo){ grafSpegni(); svg.classList.add('g-salto'); tip.classList.add('g-salto'); }
  if(nuovo || GRAF_TIP.i!==i){
    const h=svg.querySelector('.g-hover');
    if(h){ h.querySelector('.g-guida').style.transform=`translate(${g.x[i]}px,0)`;
      h.querySelectorAll('.g-punto').forEach((c,k)=>{ const s=g.s[k], yy=s&&s.y[i];
        if(yy==null){ c.style.opacity='0'; return; } c.style.opacity=''; c.style.transform=`translate(${g.x[i]}px,${yy}px)`; }); }
    tip.innerHTML=grafTipHtml(g,i); GRAF_TIP.svg=svg; GRAF_TIP.i=i;
  }
  /* il riquadro sta accanto alla linea verticale, a destra; se non ci sta, a sinistra */
  const sx=m.a*g.x[i]+m.e, tw=tip.offsetWidth, th=tip.offsetHeight;
  let left=sx+16; if(left+tw>window.innerWidth-8) left=sx-16-tw; left=Math.max(8,left);
  const top=Math.max(8,Math.min(window.innerHeight-th-8, e.clientY-th/2));
  tip.style.transform=`translate(${Math.round(left)}px,${Math.round(top)}px)`;
  svg.classList.add('g-on'); tip.classList.add('is-on');
  if(nuovo){ void tip.offsetWidth; (window.requestAnimationFrame||setTimeout)(()=>{ svg.classList.remove('g-salto'); tip.classList.remove('g-salto'); }); }
}
/* entrata: si anima solo un grafico mai visto con questi dati, quando compare davvero a schermo */
const GRAF_VISTI=new Set(); let grafIO=null;
function grafMovimentoRidotto(){ try{ return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }catch(e){ return false; } }
function grafAnimaNuovi(){
  if(GRAF_TIP.svg && !GRAF_TIP.svg.isConnected) grafSpegni();
  const nuovi=document.querySelectorAll('svg.graf-lin:not(.g-visto)'); if(!nuovi.length) return;
  const anima=typeof IntersectionObserver!=='undefined' && !grafMovimentoRidotto();
  if(anima && !grafIO) grafIO=new IntersectionObserver(voci=>voci.forEach(v=>{ if(!v.isIntersecting) return;
    const svg=v.target; grafIO.unobserve(svg);
    if(GRAF_VISTI.size>600) GRAF_VISTI.clear(); GRAF_VISTI.add(svg.getAttribute('data-firma'));
    svg.classList.remove('g-attesa'); svg.classList.add('g-entra'); }),{threshold:0.2});
  nuovi.forEach(svg=>{ svg.classList.add('g-visto');
    if(!anima || svg.closest('#panel-report, #pdf-stage, .rep-doc, .rep-pagine') || GRAF_VISTI.has(svg.getAttribute('data-firma'))) return;
    svg.classList.add('g-attesa'); grafIO.observe(svg); });
}
function grafAvvia(){
  if(grafAvvia.fatto || !document.body) return; grafAvvia.fatto=true;
  const muovi=e=>{ const svg=e.target && e.target.closest ? e.target.closest('svg.graf-lin') : null;
    if(svg) grafMostra(svg,e); else if(GRAF_TIP.svg) grafSpegni(); };
  document.addEventListener('pointermove',muovi,{passive:true});
  document.addEventListener('pointerdown',muovi,{passive:true});
  document.addEventListener('mouseout',e=>{ if(!e.relatedTarget) grafSpegni(); });
  window.addEventListener('scroll',()=>{ if(GRAF_TIP.svg) grafSpegni(); },{capture:true,passive:true});
  window.addEventListener('blur',grafSpegni);
  if(typeof MutationObserver!=='undefined') new MutationObserver(grafAnimaNuovi).observe(document.body,{childList:true,subtree:true});
  grafAnimaNuovi();
}
if(typeof document!=='undefined'){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',grafAvvia); else grafAvvia(); }
function lineChart(series,opts){
  opts=opts||{}; const W=opts.w||560,H=opts.h||200,FS=opts.fs||9,P={l:42,r:12,t:10,b:24};
  const all=[].concat(...series.map(s=>s.data.map(d=>d.y))).filter(v=>v!=null&&!isNaN(v));
  if(!all.length) return `<div class="empty">${t('Nessun dato')}</div>`;
  let mn=Math.min(...all),mx=Math.max(...all);
  /* opts.scala = [min, max] (facoltativo, 26/11/2026, Corpo › Recupero): la scala verticale arriva ALMENO
     da min a max anche se i dati stanno più stretti (la fascia «il suo solito» si vede intera anche negli
     ultimi 7 giorni). Allarga soltanto, non taglia i dati. Senza, la scala è quella dei dati, come sempre. */
  if(opts.scala){ const sa=opts.scala[0], sb=opts.scala[1];
    if(sa!=null&&sa!==''&&isFinite(sa)) mn=Math.min(mn,+sa); if(sb!=null&&sb!==''&&isFinite(sb)) mx=Math.max(mx,+sb); }
  if(mn===mx){mx+=1;mn-=1;} const pad=(mx-mn)*.08; mn-=pad; mx+=pad;
  const n=Math.max(...series.map(s=>s.data.length));
  /* STACCHI (filtri dei Progressi, 16/11/2026): opts.stacchi = [{i, testo, sotto}] dove le settimane
     scelte riprendono dopo un tratto escluso dal filtro. Fra il blocco prima e quello dopo si lascia
     uno spazio (STACCO_LARGO settimane) chiuso da due linee tratteggiate, con scritto cosa manca;
     le linee si interrompono e riprendono. Senza stacchi le posizioni sono quelle di sempre. */
  /* lo spazio di uno stacco (in più rispetto a una settimana) è di 1,6 settimane, ma almeno quanto
     serve alla sua scritta («Cut · 13 sett.»): nei grafici piccoli con tante settimane sarebbe
     troppo stretto. Al massimo il 40 % del disegno per tutti gli stacchi insieme. */
  const st=(opts.stacchi||[]).filter(s=>s && s.i>0 && s.i<n).sort((a,b)=>a.i-b.i), nSt=st.length, Wp=W-P.l-P.r;
  const larghezzaScritta=nSt? Math.max(...st.map(s=>Math.max(String(s.testo).length,String(s.sotto).length)))*FS*0.6+10 : 0;
  let passo=n>1? Wp/(n-1+1.6*nSt) : 0, extra=1.6*passo;
  if(nSt && n>1 && extra+0.1*passo<larghezzaScritta){ extra=Math.min(larghezzaScritta,0.4*Wp/nSt); passo=(Wp-nSt*extra)/(n-1); }
  const blocco=i=>st.filter(s=>s.i<=i).length;
  const X=nSt? (i=>P.l+(n<=1?0:i*passo+blocco(i)*extra)) : (i=>P.l+(n<=1?0:(W-P.l-P.r)*i/(n-1)));
  const Y=v=>P.t+(H-P.t-P.b)*(1-(v-mn)/(mx-mn));
  let g='';
  if(nSt){
    st.forEach(s=>{ const xa=X(s.i-1)+passo*0.45, xb=X(s.i)-passo*0.45, lg=xb-xa, xm=(xa+xb)/2, ym=P.t+(H-P.t-P.b)/2;
      const ci=str=>String(str).length*FS*0.6<=lg-4;
      g+=`<g class="g-stacco"><rect x="${xa.toFixed(1)}" y="${P.t}" width="${Math.max(0,lg).toFixed(1)}" height="${H-P.t-P.b}" fill="var(--ink-4)" fill-opacity=".09"/>`+
        `<line x1="${xa.toFixed(1)}" y1="${P.t}" x2="${xa.toFixed(1)}" y2="${H-P.b}" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="4 4"/>`+
        `<line x1="${xb.toFixed(1)}" y1="${P.t}" x2="${xb.toFixed(1)}" y2="${H-P.b}" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="4 4"/>`+
        (ci(s.testo)? `<text class="lbl" x="${xm.toFixed(1)}" y="${(ym-2).toFixed(1)}" text-anchor="middle" style="font-weight:700">${esc(s.testo)}</text>` : '')+
        (ci(s.sotto)? `<text class="lbl" x="${xm.toFixed(1)}" y="${(ym+FS+1).toFixed(1)}" text-anchor="middle">${esc(s.sotto)}</text>` : '')+`</g>`; }); }
  for(let k=0;k<=4;k++){const v=mn+(mx-mn)*k/4,y=Y(v);
    g+=`<line class="grid" x1="${P.l}" y1="${y.toFixed(1)}" x2="${W-P.r}" y2="${y.toFixed(1)}"/>`+
       `<text class="lbl" x="${P.l-5}" y="${(y+3).toFixed(1)}" text-anchor="end">${(opts.fmt||(x=>nf(x,grafDec(mn,mx,Math.abs(mx)<10?1:0))))(v)}</text>`;}
  if(opts.band){ const yl=Y(opts.band[0]), yh=Y(opts.band[1]); g+=`<rect x="${P.l}" y="${Math.min(yl,yh).toFixed(1)}" width="${(W-P.l-P.r).toFixed(1)}" height="${Math.abs(yl-yh).toFixed(1)}" fill="${opts.band[2]||'rgba(47,125,79,.12)'}"/>`; }
  const labels=opts.labels||series[0].data.map(d=>d.x);
  const fmtV=opts.fmtTip||opts.fmt||(x=>nf(x,Math.abs(x)<10?2:(Math.abs(x)<100?1:0)));
  g+=grafEtichX(labels.slice(0,n),X,W,FS,Math.ceil(n/grafNEtich(opts,W-P.l-P.r,labels,FS)),H-8);
  /* opzioni facoltative (Progresso reale): opts.rif = linea tratteggiata a quel valore (la base
     100); per serie s.dash (tratteggio), s.spess (spessore), s.punti===false (niente pallini,
     restano i valori al passaggio del mouse); per punto d.segno (cerchietto vuoto) e d.nota
     (aggiunta al valore). Senza, il disegno è quello di sempre. */
  if(opts.rif!=null && opts.rif>mn && opts.rif<mx){ const yr=Y(opts.rif).toFixed(1); g+=`<line class="rif-base" x1="${P.l}" y1="${yr}" x2="${W-P.r}" y2="${yr}" stroke="var(--ink-4)" stroke-width="1" stroke-dasharray="3 3"/>`; }
  /* i valori si leggono col mouse in qualunque punto del disegno (grafInterattivo, sopra):
     data e valore di ogni linea nella settimana più vicina */
  const vale=d=>d && d.y!=null && !isNaN(d.y);
  /* le note dei punti (d.nota, es. «cambio scheda») vanno su una riga loro in fondo al riquadro:
     attaccate al valore lo allungavano fino a schiacciare il nome della linea, e le scritte si
     accavallavano (Marco, 16/11/2026) */
  const note=Array.from({length:n},(_,i)=>[...new Set(series.map(s=>vale(s.data[i])&&s.data[i].nota? String(s.data[i].nota) : '').filter(Boolean))].join(' · '));
  const gi=grafInterattivo({W,H,P, xs:Array.from({length:n},(_,i)=>X(i)),
    labels:Array.from({length:n},(_,i)=>{ if(labels[i]!=null) return labels[i]; const s=series.find(z=>z.data[i]); return s? s.data[i].x : ''; }),
    serie:series.map(s=>({n:s.name, c:s.color,
      y:Array.from({length:n},(_,i)=>vale(s.data[i])? Y(s.data[i].y) : null),
      v:Array.from({length:n},(_,i)=>vale(s.data[i])? fmtV(s.data[i].y) : null)})),
    extra:note.some(Boolean)? note : null});
  g+=`<g class="g-serie"${gi.clip}>`;
  series.forEach(s=>{
    let dpath='',pts='',bl=-1;
    s.data.forEach((d,i)=>{ if(d.y==null||isNaN(d.y))return; const x=X(i),y=Y(d.y), b=blocco(i);
      dpath+=(dpath && b===bl?' L':(dpath?' M':'M'))+x.toFixed(1)+' '+y.toFixed(1); bl=b;
      if(d.segno) pts+=`<circle class="pt-segno" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.6" fill="var(--paper)" stroke="${s.color}" stroke-width="2"/>`;
      else if(s.punti!==false) pts+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="${s.color}"/>`; });
    g+=`<path class="ln" d="${dpath}" stroke="${s.color}"${s.dash?` stroke-dasharray="${s.dash}"`:''}${s.spess?` style="stroke-width:${s.spess}"`:''}/>${pts}`;
  });
  g+=`</g>`;
  const leg=series.length>1 && !opts.senzaLeg? `<div style="${grafLeg(opts)}">`+
    series.map(s=>`<span class="mono" style="color:${s.color}">━ ${esc(s.name)}</span>`).join('')+`</div>`:'';
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet"${grafFs(opts)}${gi.attr}>${gi.defs}<line class="axis" x1="${P.l}" y1="${P.t}" x2="${P.l}" y2="${H-P.b}"/><line class="axis" x1="${P.l}" y1="${H-P.b}" x2="${W-P.r}" y2="${H-P.b}"/>${g}${gi.hover}</svg>${leg}`;
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

