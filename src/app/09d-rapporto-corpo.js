/* ════════════════ RAPPORTO DI COMPOSIZIONE CORPOREA (da una pesata della bilancia) ════════════════
   2026-11-16, richiesta di Marco: «l'export che fa FitDays, nel nostro stile, con gli stessi dati».
   Una pagina A4 per una pesata: anagrafica, composizione in kg e in % del peso (con la differenza
   dalla pesata precedente), BMI e grasso su fasce di riferimento pubblicate, tipo di corpo, altri
   indicatori, andamento delle ultime pesate e misure grezze della bilancia.
   I valori che FitDays deriva dalla massa magra si ricavano qui allo stesso modo (verificato su un
   suo rapporto: acqua = magra × 0,733, proteine × 0,2, muscolo scheletrico = acqua × 0,834 − 2,627,
   sottocutaneo = (−0,0002 × grasso + 0,72) × grasso). NON ci sono, perché sono calcoli interni di
   FitDays non pubblici: punteggio, intervalli «standard» e valutazioni, peso obiettivo, grasso e
   muscolo per segmento, WHR. Fasce: BMI dell'OMS; grasso di Gallagher e coll., Am J Clin Nutr 2000;
   72:694–701 (per sesso e fascia d'età). Il PDF si fa come quello del Report: html2canvas → imagesToPdf. */

/* fasce del grasso (Gallagher 2000): [sotto = basso, da = sovrappeso, da = obesità] */
const GRASSO_FASCE={M:[[39,[8,20,25]],[59,[11,22,28]],[999,[13,25,30]]], F:[[39,[21,33,39]],[59,[23,34,40]],[999,[24,36,42]]]};
function fasceGrasso(sesso, eta){ const tab=GRASSO_FASCE[sesso==='F'?'F':'M']; return (tab.find(x=>(+eta||30)<=x[0])||tab[tab.length-1])[1]; }
/* tutti i valori del rapporto da una pesata (+ anagrafica del profilo) */
function compDaPesata(p, u){
  u=u||{}; const peso=+p.peso||0, alt=+u.altezza||0, ha=p.grasso!=null;
  const grKg=ha? peso*p.grasso/100 : null, magra=ha? peso-grKg : null;
  const acquaKg=p.acqua!=null? p.acqua/100*peso : (magra!=null? magra*0.733 : null);
  const protKg=p.proteine!=null? p.proteine/100*peso : (magra!=null? magra*0.2 : null);
  const schelKg=acquaKg!=null? acquaKg*0.834-2.627 : null;
  const pal=+u.livello_attivita||0;
  return {peso:peso, grasso:ha?+p.grasso:null, grassoKg:grKg, magra:magra, muscolo:p.muscolo!=null?+p.muscolo:null,
    scheletrico:schelKg, acquaKg:acquaKg, acqua:p.acqua!=null?+p.acqua:(acquaKg!=null&&peso?acquaKg/peso*100:null),
    proteineKg:protKg, proteine:p.proteine!=null?+p.proteine:(protKg!=null&&peso?protKg/peso*100:null), ossa:p.ossa!=null?+p.ossa:null,
    sottocutaneo:ha? (p.grasso*-0.0002+0.72)*p.grasso : null,
    bmi:alt>0? peso/Math.pow(alt/100,2) : (p.bmi!=null?+p.bmi:null),
    visc:p.visc!=null?+p.visc:null, bmr:p.bmr!=null?+p.bmr:null, fabbisogno:(p.bmr!=null&&pal)? p.bmr*pal : null,
    etaMet:p.eta_met!=null?+p.eta_met:null, bpm:p.bpm!=null?+p.bpm:null, imp:Array.isArray(p.imp)?p.imp:null};
}
function pesataPrima(p){
  const prima=(DOC.pesate||[]).filter(x=>x&&x.id!==p.id&&ordinePesate(x,p)<0);
  return prima.filter(x=>x.grasso!=null).pop() || prima.pop() || null; }
/* barra a fasce con il segno del valore: fasce=[[da,a,colore,etichetta]…] su una scala [min,max].
   Il numero sta sopra e la freccetta sotto, centrati tutti e due sul punto (18/11/2026: «25,2 ▾» su una
   riga metteva la freccetta a destra del valore vero) */
function barraFasce(valore, min, max, fasce, dec){
  const pos=x=>Math.max(0,Math.min(100,(x-min)/(max-min)*100));
  return `<div class="comp-barra-w">${valore!=null?`<span class="comp-segno" style="left:${pos(valore).toFixed(1)}%">${nf(valore,dec)}<i></i></span>`:''}
    <div class="comp-barra">${fasce.map(f=>`<span style="width:${(pos(f[1])-pos(f[0])).toFixed(2)}%;background:${f[2]}"></span>`).join('')}</div>
    <div class="comp-leg">${fasce.map(f=>`<span style="width:${(pos(f[1])-pos(f[0])).toFixed(2)}%">${esc(t(f[3]))}</span>`).join('')}</div></div>`;
}
/* andamento: una linea semplice e ferma (va bene anche nel PDF) */
function lineaFerma(punti, dec, colore){
  if(punti.length<2) return `<div class="muted" style="font-size:10px">${t('Servono almeno due giorni di pesate.')}</div>`;
  const W=300, H=46, P=6, ys=punti.map(x=>x.y), mn=Math.min(...ys), mx=Math.max(...ys), sp=(mx-mn)||1;
  const X=i=>P+i*(W-2*P)/(punti.length-1), Y=v=>H-P-(v-mn)/sp*(H-2*P-10);
  return `<svg viewBox="0 0 ${W} ${H+14}" class="comp-linea"><polyline fill="none" stroke="${colore}" stroke-width="2" points="${punti.map((x,i)=>X(i).toFixed(1)+','+Y(x.y).toFixed(1)).join(' ')}"/>
    ${punti.map((x,i)=>`<circle cx="${X(i).toFixed(1)}" cy="${Y(x.y).toFixed(1)}" r="2.4" fill="${colore}"/>`).join('')}
    <text x="${P}" y="${H+11}" font-size="9" fill="#7a6a50">${esc(giornoPesata(punti[0].data))} · ${nf(punti[0].y,dec)}</text>
    <text x="${W-P}" y="${H+11}" font-size="9" fill="#7a6a50" text-anchor="end">${esc(giornoPesata(punti[punti.length-1].data))} · ${nf(punti[punti.length-1].y,dec)}</text></svg>`;
}
/* figura del corpo (disegno nostro, nello spirito di quella di FitDays): sagoma morbida sfumata dal
   turchese del tronco al giallo di testa, mani e piedi, gli 8 elettrodi su mani e piedi, e intorno
   i valori con le linee verso il corpo. Valori per singolo braccio o gamba NON ce ne sono (FitDays li
   calcola con una formula non pubblica): le linee indicano i valori del corpo intero. La sagoma è una
   curva liscia (Catmull-Rom) per i punti del lato destro, specchiati per il sinistro. */
let figuraSeq=0;
const SAGOMA_DX=[[54.5,26],[55,32],[60,35],[66,37.5],[70.5,41],[72.5,47],[73,56],[73.8,66],[74.6,76],[75.6,88],[76.3,100],[76.8,108],
  [78.3,114],[77.6,120],[74.8,122],[72.6,118],[72.2,110],[71,100],[69.6,88],[68.2,77],[66.6,66],[64.6,57],[63.2,52],[62.6,62],[61.2,74],
  [60.6,84],[62.2,93],[64.2,102],[64.6,114],[63.6,128],[62,142],[60.4,152],[61,164],[60.6,178],[58.6,192],[57.6,199],[60,204],[59.2,208],
  [53.5,208],[52.2,203],[52.4,196],[52.2,182],[52.6,168],[52.4,154],[51.6,138],[51,124]];
function pathLiscio(P){
  const n=P.length, q=i=>P[(i+n)%n], r=v=>(+v.toFixed(2)); let d='M'+P[0][0]+' '+P[0][1];
  for(let i=0;i<n;i++){ const p0=q(i-1), p1=q(i), p2=q(i+1), p3=q(i+2);
    d+=' C'+r(p1[0]+(p2[0]-p0[0])/6)+' '+r(p1[1]+(p2[1]-p0[1])/6)+' '+r(p2[0]-(p3[0]-p1[0])/6)+' '+r(p2[1]-(p3[1]-p1[1])/6)+' '+p2[0]+' '+p2[1]; }
  return d+'Z'; }
/* tema=true (tab Corpo): i testi prendono i colori del tema (giorno e notte); senza (rapporto e PDF) i
   colori restano scritti nel disegno, l'unico modo che html2canvas riporta fedelmente */
function figuraCorpo(c, dPeso, tema){
  const g='comp-fig-'+(++figuraSeq), S=0.44, X=v=>150+(v-50)*S, Y=v=>3+v*S, N=(v,dec)=>v!=null? nf(v,dec) : '—';
  const colV=tema? ' style="fill:var(--ink)"' : ' fill="#1c1208"', colE=tema? ' style="fill:var(--ink-3)"' : ' fill="#7a6a50"', colP=tema? ' style="fill:var(--ink-2)"' : ' fill="#3d2e1a"';
  const L=SAGOMA_DX.slice().reverse().map(p=>[100-p[0],p[1]]), corpo=pathLiscio(SAGOMA_DX.concat([[50,114]],L));
  const el=[[76.5,116],[74.5,120.5],[23.5,116],[25.5,120.5],[55,206],[58.5,206],[45,206],[41.5,206]]
    .map(q=>`<circle cx="${q[0]}" cy="${q[1]}" r="1.9" fill="#d4a017" stroke="#fff" stroke-width=".6"/>`).join('');
  const tipoBmi=c.bmi==null?'' : c.bmi<18.5?t('sottopeso') : c.bmi<25?t('normopeso') : c.bmi<30?t('sovrappeso') : t('obesità');
  const voci=[['s',12,N(c.peso,1)+' kg',t('Peso')+(dPeso?' · '+dPeso+' kg':''),[43,10]],
    ['s',34,N(c.grasso,1)+' %',t('Grasso')+' · '+N(c.grassoKg,1)+' kg',[41,86]],
    ['s',56,N(c.visc,0),t('Grasso viscerale'),[46,95]],
    ['s',78,N(c.acqua,1)+' %',t('Acqua'),[40,140]],
    ['d',12,'BMI '+N(c.bmi,1),tipoBmi,[57,8]],
    ['d',34,N(c.muscolo,1)+' kg',t('Massa muscolare'),[72,62]],
    ['d',56,N(c.scheletrico,1)+' kg',t('Muscolo scheletrico'),[60,138]],
    ['d',78,N(c.ossa,1)+' kg',t('Massa ossea'),[57,182]]];
  const testi=voci.map(v=>{ const sx=v[0]==='s', xt=sx?116:184, xl=sx?119:181, xg=sx?127:173, px=X(v[4][0]).toFixed(1), py=Y(v[4][1]).toFixed(1);
    return `<polyline points="${xl},${v[1]-2.4} ${xg},${v[1]-2.4} ${px},${py}" fill="none" stroke="#9b8a6e" stroke-width=".45"/><circle cx="${px}" cy="${py}" r="1.1"${colP}/>
      <text x="${xt}" y="${v[1]}" text-anchor="${sx?'end':'start'}" font-size="7.2" font-weight="bold"${colV}>${esc(v[2])}</text>
      <text x="${xt}" y="${v[1]+6}" text-anchor="${sx?'end':'start'}" font-size="4.6"${colE}>${esc(v[3])}</text>`; }).join('');
  return `<svg viewBox="0 0 300 96" class="comp-figura" role="img" aria-label="${esc(t('Composizione corporea'))}"><defs>
    <radialGradient id="${g}" gradientUnits="userSpaceOnUse" cx="50" cy="82" r="112"><stop offset="0" stop-color="#1f9e96"/><stop offset=".42" stop-color="#7cc79a"/><stop offset=".86" stop-color="#f0cf63"/></radialGradient>
    <radialGradient id="${g}-l" gradientUnits="userSpaceOnUse" cx="44" cy="58" r="46"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="150" cy="94.2" rx="19" ry="1.7" fill="#000" opacity=".09"/>
    <g transform="translate(${(150-50*S).toFixed(2)} 3) scale(${S})">
      <path d="${corpo}" fill="url(#${g})" stroke="#2f7d74" stroke-width="1.1" stroke-linejoin="round"/>
      <ellipse cx="50" cy="15" rx="9" ry="11.5" fill="url(#${g})" stroke="#2f7d74" stroke-width="1.1"/>
      <path d="${corpo}" fill="url(#${g}-l)"/>${el}</g>${testi}</svg>`;
}
/* la nota sotto la figura sta FUORI dal disegno: nel PDF il disegno usa un carattere più largo e la scritta
   allineata al bordo destro usciva tagliata («… non per singolo bra») */
function notaFigura(){ return `<div class="comp-fig-nota">${t('gli 8 elettrodi · valori del corpo intero, non per singolo braccio o gamba')}</div>`; }
/* tipo di corpo: righe BMI (alto → basso), colonne grasso (basso, nella norma, alto); torna anche il nome */
const TIPI_CORPO=[['Muscoloso','Robusto','Sovrappeso'],['Atletico','Equilibrato','Grasso nascosto'],['Sottopeso','Esile','Esile con grasso alto']];
function tipoCorpo(c, sesso, eta){
  const fg=fasceGrasso(sesso,eta);
  const rB=c.bmi==null?-1 : c.bmi>=25?0 : c.bmi>=18.5?1 : 2, cG=c.grasso==null?-1 : c.grasso<fg[0]?0 : c.grasso<fg[1]?1 : 2;
  return {riga:rB, col:cG, nome:(rB>=0&&cG>=0)? TIPI_CORPO[rB][cG] : ''};
}
function grigliaTipoCorpo(c, sesso, eta){
  const tc=tipoCorpo(c, sesso, eta);
  return `<div class="comp-griglia">${TIPI_CORPO.map((r,i)=>`<span class="comp-asse">BMI ${['≥ 25','18,5–25','&lt; 18,5'][i]}</span>`+r.map((x,j)=>`<div class="${i===tc.riga&&j===tc.col?'on':''}">${esc(t(x))}</div>`).join('')).join('')}
      <span></span><span class="comp-asse2">${t('grasso basso')}</span><span class="comp-asse2">${t('nella norma')}</span><span class="comp-asse2">${t('alto')}</span></div>`;
}
/* RIQUADRO «TIPO DI CORPO» DEL TAB CORPO (Marco, 18/11/2026: «il grafico del tipo di corpo che compare nel
   pdf voglio che compaia anche nel tab Corpo, grande, alla destra dei quattro grafici»): la figura coi
   valori di oggi (i campi «Dati corporei», come le schede in alto) e la griglia del tipo di corpo. */
function tipoCorpoLat(u){
  u=u||{}; const num=v=>(v===''||v==null||!isFinite(+v))? null : +v;
  const p={peso:num(u.peso)||0, grasso:num(u.massa_grassa)!=null&&+u.massa_grassa>0? +u.massa_grassa*100 : null,
    muscolo:num(u.massa_muscolare), ossa:num(u.massa_ossea), visc:num(u.grasso_viscerale), acqua:num(u.acqua), bmr:num(u.metab_basale)};
  const c=compDaPesata(p,u), sesso=u.sesso==='F'?'F':'M', eta=etaOf(u), tc=tipoCorpo(c, sesso, eta);
  return `<div class="chart-box tipo-corpo"><h4>${t('Tipo di corpo')}${tc.nome?` <span class="pill tipo-corpo__nome">${esc(t(tc.nome))}</span>`:''}${spiegaBtn('tipocorpo')}</h4>
    ${p.peso? figuraCorpo(c, '', true)+notaFigura() : `<div class="empty">${t('Scrivi il peso nei «Dati corporei» per vedere la figura.')}</div>`}
    <div class="tipo-corpo__griglia">${grigliaTipoCorpo(c, sesso, eta)}</div>
    <div class="muted tipo-corpo__nota">${c.grasso==null? t('Senza la massa grassa la colonna del grasso resta vuota.') : t('Fasce del grasso per')+' '+(sesso==='F'?t('donne'):t('uomini'))+' '+(eta<40?'20–39':eta<60?'40–59':'60–79')+' '+t('anni')+' · '+t('valori dei «Dati corporei»')}</div></div>`;
}
function htmlRapportoCorpo(p){
  const u=DOC.dati_utente||{}, c=compDaPesata(p,u), sesso=u.sesso==='F'?'F':'M', eta=etaOf(u), alt=+u.altezza||0;
  const pr=pesataPrima(p), cp=pr? compDaPesata(pr,u) : null;
  const D=(k,dec)=>{ if(!cp||c[k]==null||cp[k]==null) return ''; const d=c[k]-cp[k], s=Math.abs(d)<Math.pow(10,-dec)/2? '±' : (d>0?'+':'−'); return s+nf(Math.abs(d),dec); };
  const pct=v=>(v!=null&&c.peso)? nf(v/c.peso*100,1) : '—', N=(v,dec)=>v!=null? nf(v,dec) : '—';
  const righe=[['Peso',c.peso,'100,0','peso'],['Massa grassa',c.grassoKg,c.grasso!=null?nf(c.grasso,1):'—','grassoKg'],['Massa magra',c.magra,pct(c.magra),'magra'],
    ['Massa muscolare',c.muscolo,pct(c.muscolo),'muscolo'],['Muscolo scheletrico',c.scheletrico,pct(c.scheletrico),'scheletrico'],
    ['Acqua',c.acquaKg,c.acqua!=null?nf(c.acqua,1):'—','acquaKg'],['Proteine',c.proteineKg,c.proteine!=null?nf(c.proteine,1):'—','proteineKg'],['Massa ossea',c.ossa,pct(c.ossa),'ossa']];
  const fg=fasceGrasso(sesso,eta);
  /* andamento: la pesata del giorno (come nella media) degli ultimi 10 giorni con pesate, fino a questa */
  const fino=(DOC.pesate||[]).filter(x=>ordinePesate(x,p)<=0), giorni=pesateContate(fino).slice(-10);
  const imp=c.imp, okImp=imp&&imp.length===10;
  /* le ultime 6 settimane dello Storico misure fino a quella della pesata (medie fatte dal TMS) */
  const codeP=settimanaPesata(p), sett=(DOC.storico_io||[]).filter(r=>r&&(+r.scheda)<=codeP).slice(-3).reverse();
  const ind=[['Grasso viscerale',N(c.visc,0),t('indice')],['Metabolismo basale',N(c.bmr,0),'kcal'],['Fabbisogno (basale × attività)',N(c.fabbisogno,0),'kcal'],
    ['Grasso sottocutaneo',N(c.sottocutaneo,1),'%'],['Età metabolica',N(c.etaMet,0),eta?t('anni')+' ('+t('anagrafica')+' '+eta+')':t('anni')],['Battito',N(c.bpm,0),'bpm']]
    .filter(x=>x[1]!=='—');
  const dataStr=(()=>{ try{ return new Date(p.data+'T12:00:00').toLocaleDateString(LANG==='en'?'en-GB':'it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}); }catch(e){ return p.data; } })();
  return `<div class="comp-pg">
  <div class="comp-tit"><h1>${t('Composizione corporea')}</h1><div class="comp-brand">TRAINING MONITOR SYSTEM<br><span>${t('pesata del')} ${esc(dataStr)}${p.ora?' · '+esc(String(p.ora).slice(0,5)):''}</span></div></div>
  <div class="comp-chi"><span><b>${esc(u.nome||profNome()||'')}</b></span><span>${t('Sesso')}: ${sesso==='F'?t('donna'):t('uomo')}</span>${eta?`<span>${t('Età')}: ${eta} ${t('anni')}</span>`:''}${alt?`<span>${t('Altezza')}: ${alt} cm</span>`:''}<span>${t('Bilancia a 8 elettrodi')}</span></div>
  <div class="comp-hero">${figuraCorpo(c, D('peso',1))}${notaFigura()}</div>
  <div class="comp-col"><div>
    <div class="sec">${t('Composizione')}</div>
    <table class="comp-tab"><thead><tr><th></th><th>kg</th><th>${t('% del peso')}</th><th>${pr?t('dal')+' '+esc(giornoPesata(pr.data)):''}</th></tr></thead>
      <tbody>${righe.map(r=>`<tr><td>${t(r[0])}</td><td class="num"><b>${N(r[1],1)}</b></td><td class="num">${r[2]}</td><td class="num muted">${D(r[3],1)}</td></tr>`).join('')}</tbody></table>
    <div class="sec">${t('Peso e grasso')}</div>
    <div class="comp-voce">BMI</div>
    ${barraFasce(c.bmi,15,40,[[15,18.5,'#d9c58a','Sottopeso'],[18.5,25,'#7fb38f','Normopeso'],[25,30,'#e0b25a','Sovrappeso'],[30,40,'#d0776a','Obesità']],1)}
    ${alt?`<div class="comp-nota-r">${t('Peso nella norma per')} ${alt} cm: ${nf(18.5*Math.pow(alt/100,2),1)}–${nf(24.9*Math.pow(alt/100,2),1)} kg</div>`:''}
    <div class="comp-voce">${t('Grasso')} (%)</div>
    ${barraFasce(c.grasso,0,50,[[0,fg[0],'#d9c58a','Basso'],[fg[0],fg[1],'#7fb38f','Nella norma'],[fg[1],fg[2],'#e0b25a','Alto'],[fg[2],50,'#d0776a','Molto alto']],1)}
    <div class="comp-nota-r">${t('Fasce per')} ${sesso==='F'?t('donne'):t('uomini')} ${eta<40?'20–39':eta<60?'40–59':'60–79'} ${t('anni')}</div>
    <div class="sec">${t('Tipo di corpo')}</div>
    ${grigliaTipoCorpo(c, sesso, eta)}
  </div><div>
    <div class="sec">${t('Altri indicatori')}</div>
    ${ind.map(x=>`<div class="comp-ind"><span>${t(x[0])}</span><b>${x[1]} <small>${esc(x[2])}</small></b></div>`).join('')}
    <div class="sec">${t('Andamento')}</div>
    <div class="comp-voce">${t('Peso')} (kg)</div>${lineaFerma(giorni.map(x=>({data:x.data,y:+x.peso})),1,'#c2500a')}
    <div class="comp-voce">${t('Grasso')} (%)</div>${lineaFerma(giorni.filter(x=>x.grasso!=null).map(x=>({data:x.data,y:+x.grasso})),1,'#991b1b')}
    ${okImp?`<div class="sec">${t('Misure della bilancia (Ω)')}</div>
    <table class="comp-tab comp-imp"><thead><tr><th></th><th>${t('Tronco')}</th><th>1</th><th>2</th><th>3</th><th>4</th></tr></thead><tbody>
      <tr><td>20 kHz</td>${[0,1,2,3,4].map(i=>`<td class="num">${nf(imp[i],1)}</td>`).join('')}</tr>
      <tr><td>100 kHz</td>${[5,6,7,8,9].map(i=>`<td class="num">${nf(imp[i],1)}</td>`).join('')}</tr></tbody></table>
    <div class="comp-nota-r">${t('1–4: braccia e gambe, nell\'ordine in cui le manda la bilancia.')}</div>`:''}
  </div></div>
  ${sett.length?`<div class="sec">${t('Medie settimanali nello Storico misure')}</div>
  <table class="comp-tab comp-sett"><thead><tr><th>${t('Settimana del')}</th><th>${t('Peso')} kg</th><th>${t('Grasso')} %</th><th>${t('Massa muscolare')} kg</th><th>${t('Acqua')} %</th><th>${t('Metabolismo basale')}</th><th>${t('N. pesate')}</th></tr></thead>
    <tbody>${sett.map(r=>`<tr${(+r.scheda)===codeP?' class="comp-qui"':''}><td>${esc(schedaLabel(r.scheda))}</td><td class="num">${N(+r.peso||null,1)}</td><td class="num">${(+r.massa_grassa)?nf(r.massa_grassa*100,1):'—'}</td><td class="num">${N(+r.massa_muscolare||null,1)}</td><td class="num">${r.acqua!==''&&r.acqua!=null?nf(r.acqua,1):'—'}</td><td class="num">${N(+r.metab_basale||null,0)}</td><td class="num">${+r.n_pesate>0?r.n_pesate:t('a mano')}</td></tr>`).join('')}</tbody></table>`:''}
  ${c.grasso==null?`<div class="callout callout--info" style="margin-top:3mm"><div>${t('In questa pesata la bilancia ha misurato solo il peso (maniglie non tenute o scheda senza altezza ed età): la composizione non c\'è.')}</div></div>`:''}
  <div class="comp-nota">${t('Stima per bioimpedenza con bilancia a 8 elettrodi, formula WLA25 come ricostruita dal progetto openScale: utile per l\'andamento più che come misura assoluta, cambia con l\'acqua bevuta, i pasti e l\'ora. Fasce: BMI dell\'OMS; grasso di Gallagher e coll., Am J Clin Nutr 2000;72:694–701.')} · TMS ${esc(APP_VERSION)}</div>
</div>`;
}
/* anteprima in un riquadro, con «Scarica PDF» */
function apriRapportoCorpo(id){
  const p=(DOC.pesate||[]).find(x=>x.id===id); if(!p){ avviso(t('Pesata non trovata.')); return; }
  modal(`<h3>${t('Rapporto di composizione corporea')}</h3>
    <div class="comp-anteprima">${htmlRapportoCorpo(p)}</div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">${t('Chiudi')}</button><button class="btn btn--ember" id="comp-pdf">${ico('documento')}${t('Scarica PDF')}</button></div>`);
  const m=document.getElementById('modal'); if(m) m.style.maxWidth='880px';
  document.getElementById('comp-pdf').onclick=()=>pdfRapportoCorpo(id);
}
async function pdfRapportoCorpo(id){
  const p=(DOC.pesate||[]).find(x=>x.id===id); if(!p) return;
  if(typeof html2canvas!=='function'){ avviso(t('Generatore PDF non disponibile in questa copia.')); return; }
  const btn=document.getElementById('comp-pdf'), lab=btn?btn.innerHTML:''; if(btn){ btn.innerHTML=t('Genero PDF…'); btn.disabled=true; }
  const stage=document.createElement('div'); stage.id='pdf-stage';
  try{
    stage.innerHTML=htmlRapportoCorpo(p); document.body.appendChild(stage);
    const fotogramma=()=>new Promise(r=>(typeof requestAnimationFrame==='function'? requestAnimationFrame : setTimeout)(()=>r()));
    await fotogramma(); await fotogramma();   /* lascia impaginare il foglio prima di fotografarlo */
    const canvas=await html2canvas(stage.firstElementChild,{scale:2,backgroundColor:'#ffffff',logging:false,useCORS:true,
      onclone:(doc)=>{ try{ doc.documentElement.setAttribute('data-theme','giorno'); }catch(e){} }});
    const url=canvas.toDataURL('image/jpeg',0.92);
    const pdf=imagesToPdf([{bytes:dataUrlToBytes(url), w:canvas.width, h:canvas.height}]);
    const nome=String((DOC.dati_utente&&DOC.dati_utente.nome)||profNome()||'TMS').replace(/[^\w\-]+/g,'_')||'TMS';
    const blob=new Blob([pdf],{type:'application/pdf'}), u=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=u; a.download='Composizione_'+nome+'_'+p.data+'.pdf'; document.body.appendChild(a); a.click();
    setTimeout(()=>{ try{ URL.revokeObjectURL(u); }catch(e){} a.remove(); }, 1500);
  }catch(e){ logErrore('pdfRapportoCorpo', e); avviso(t('Errore nella generazione del PDF:')+' '+e.message); }
  finally{ try{ if(stage.parentNode) stage.parentNode.removeChild(stage); }catch(e){} if(btn){ btn.innerHTML=lab; btn.disabled=false; } }
}
