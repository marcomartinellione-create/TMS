/* ════════════════ CALORIE BRUCIATE (27/11/2026) ════════════════
   Marco: «ragioniamo insieme su come inserire una stima delle calorie bruciate», «rifatti a paper scientifici», «sì,
   mandiamo al PC e analizziamo i dati». Si CALCOLANO ogni volta che si mostrano, mai salvate (regola dei dati grezzi):
   dai campioni del bracciale (09f-bracciale.js), dalle notti (DOC.recupero.notti), dalle sedute registrate col telefono
   e dalle misure del corpo DI QUEL GIORNO. Cambiando una formula qui, cambia tutto lo storico insieme.
   Stesso modello del telefono (app-android/web/index.html, kcGiorno), minuto per minuto da mezzanotte:
   · METABOLISMO A RIPOSO: con la massa grassa Cunningham 1980 (500 + 22 × massa magra), una delle cinque equazioni che negli
     sportivi non sbagliano in media (O'Neill et al., Sports Med 2023); senza, Mifflin-St Jeor 1990 (la più giusta nella
     popolazione generale: Frankenfield et al., J Am Diet Assoc 2005).
   · VITA QUOTIDIANA: multipli del metabolismo della FAO/WHO/UNU (Human energy requirements, 2004, tab. 5.1): dormire 1,0
     (fasi del bracciale; i minuti «sveglio» della notte no), sveglio senza camminare 1,4 («light leisure»).
   · PASSI al minuto: 100 = 3 MET, 130 = 6 MET (CADENCE-Adults, Tudor-Locke et al., IJBNPA 2019), in linea anche oltre
     (fino a 12); sotto i 100, la parte del minuto passata a camminare (passi/100) a 3 MET. kcal/min = MET × 3,5 × kg / 200.
   · BATTITO: dalla soglia dell'attività moderata (40 % della riserva cardiaca; 64 % della FC max senza il battito a riposo:
     ACSM, Garber et al., MSSE 2011; Keytel l'ha ricavata fra il 57 e il 90 % della FC max) l'equazione di Keytel et al.
     (J Sports Sci 2005, modello senza VO2max, verificata sull'articolo), quando dà più dei passi.
   · SEDUTE del telefono: cardio col battito della fascia minuto per minuto (Keytel), senza battito i MET della disciplina
     del Compendium 2024 (Herrmann et al.); PESI coi MET del Compendium (02054 3,5 · 02052 5,0 · 02050 6,0) scelti dalla
     fatica RPE della seduta (≤ 5 / 6–7 / ≥ 8; scelta nostra), mai dal battito: coi pesi il battito sale più del consumo e
     gli orologi sbagliano (Mitchell et al., Sports Med 2024; Lee et al., Sensors 2026).
   · DIGESTIONE: il 10 % del totale (FAO 2004 § 2.3: «circa il 10 %», parte del consumo misurato). Con questo una giornata
     tutta da seduti fa un livello di attività di ~1,41, l'inizio della fascia «sedentaria» della FAO (1,40–1,69).
   È una STIMA: anche i dispositivi migliori sbagliano molto (O'Driscoll et al., Br J Sports Med 2020). */
const KC_MET={'Corsa':8, 'Tapis roulant':8, 'Camminata veloce':3.5, 'Bici':7, 'Cyclette':6.8, 'Nuoto':5.8, 'Vogatore':5,
  'Ellittica':5, 'Sci di fondo':8.5, 'Salto della corda':11, 'HIIT':7.5};
const KC_SVEGLIO=1.4, KC_SONNO=1.0, KC_DIGESTIONE=0.10, KC_COPERTURA=0.8;
const kcDaMet=(met, P)=>met*3.5*P.peso/200;
function kcMetCadenza(p){ return p>=100? Math.min(12, 3+0.1*(p-100)) : 3; }
function kcMetPesi(rpe){ return !(rpe>=0 && rpe!=='' && rpe!=null)? 3.5 : rpe<=5? 3.5 : rpe<=7? 5 : 6; }
function kcMetCardio(s){ if(s && s.variante==='Mountain bike') return 8.5; return (s && KC_MET[s.tipo]) || null; }
/* Keytel 2005 senza VO2max: kJ al minuto → kcal (a sesso ignoto la media delle due) */
function kcKeytel(hr, P){
  const m=-55.0969+0.6309*hr+0.1988*P.peso+0.2017*P.eta, f=-20.4022+0.4472*hr-0.1263*P.peso+0.074*P.eta;
  return Math.max(0, (P.sesso==='M'? m : P.sesso==='F'? f : (m+f)/2)/4.184); }
function kcEtaAl(u, data){ const d=u&&u.nascita? new Date(u.nascita) : null; if(!d || isNaN(d)) return +(u&&u.eta)||0;
  const g=new Date(data+'T12:00:00'); let a=g.getFullYear()-d.getFullYear(); const m=g.getMonth()-d.getMonth();
  if(m<0 || (m===0 && g.getDate()<d.getDate())) a--; return a>0? a : 0; }
/* il corpo DI QUEL GIORNO, dalle misure (ultima pesata fino a quel giorno, se no l'ultima misura dello Storico, se no il
   profilo); altezza, sesso e data di nascita dal profilo */
function kcCorpoAl(data){
  const u=DOC.dati_utente||{}; let peso=0, gr=null, fonte='';
  const pes=(DOC.pesate||[]).filter(p=>p && String(p.data)<=data && +p.peso>0).sort(ordinePesate);
  if(pes.length){ peso=+pes[pes.length-1].peso; fonte='pesata';
    const cg=pes.filter(p=>p.grasso!=null && isFinite(+p.grasso)); if(cg.length) gr=+cg[cg.length-1].grasso; }
  else { const w=isoWeek(new Date(data+'T12:00:00')), c=schedaCode(w.anno,w.sett);
    const r=(DOC.storico_io||[]).filter(x=>(+x.scheda)<=c && +x.peso>0).sort((a,b)=>(+a.scheda)-(+b.scheda)).pop();
    if(r){ peso=+r.peso; if(+r.massa_grassa>0) gr=+r.massa_grassa*100; fonte='misura'; }
    else if(+u.peso>0){ peso=+u.peso; if(+u.massa_grassa>0) gr=+u.massa_grassa*100; fonte='profilo'; } }
  return {peso:peso, grasso:gr, altezza:+u.altezza||0, eta:kcEtaAl(u, data), sesso:(u.sesso==='M'||u.sesso==='F')? u.sesso : '', fonte:fonte,
    fcMax:+u.fcMax||0, fcRiposo:+u.fcRiposo||0}; }
/* peso, metabolismo a riposo e soglia del battito di quel giorno (null se manca il peso o un'equazione) */
function kcProfiloAl(data, fcRipBracciale){
  const C=kcCorpoAl(data); if(!(C.peso>=30 && C.peso<=300)) return null;
  let rmr=0, da='';
  if(C.grasso!=null && C.grasso>=3 && C.grasso<=70){ rmr=500+22*C.peso*(1-C.grasso/100); da='cunningham'; }
  else if(C.altezza>=120 && C.eta>=10 && C.sesso){ rmr=10*C.peso+6.25*C.altezza-5*C.eta+(C.sesso==='M'? 5 : -161); da='mifflin'; }
  if(!(rmr>=600 && rmr<=4500)) return null;
  const rip=+fcRipBracciale||C.fcRiposo, mx=C.fcMax || (C.eta>=10? Math.round(208-0.7*C.eta) : 0);
  const soglia=C.eta>=10? ((rip>=30 && mx>rip)? rip+0.4*(mx-rip) : (mx? 0.64*mx : 0)) : 0;
  return {peso:C.peso, grasso:C.grasso, rmr:rmr, da:da, eta:C.eta, sesso:C.sesso, soglia:Math.round(soglia), fonte:C.fonte}; }
/* le sedute col battito di quel giorno: [{a, b (ms), bpm per minuto, met senza battito, pesi}] */
function kcSedute(data){
  const out=[];
  const usa=(s, pesi)=>{ if(!s || s.data!==data || !s.ora) return;
    const a=new Date(s.data+'T'+String(s.ora).slice(0,5)+':00').getTime(), sec=pesi? +s.durataSec : (+s.durataSec || (+s.durata)*60);
    if(!isFinite(a) || !(sec>0)) return;
    const passo=+s.fcPasso||5, fc=Array.isArray(s.fc)? s.fc : [], perMin=Math.max(1, Math.round(60/passo)), bpm=[];
    for(let k=0;k*60<sec;k++){ const v=fc.slice(k*perMin, (k+1)*perMin).filter(x=>x>0); bpm.push(v.length? v.reduce((x,y)=>x+y,0)/v.length : null); }
    out.push({a:a, b:a+sec*1000, bpm:bpm, met:pesi? kcMetPesi(s.rpe) : kcMetCardio(s), pesi:pesi}); };
  (DOC.cardio||[]).forEach(s=>usa(s, false));
  const fcs=[].concat(DOC.storico_fc||[]); const fs=(DOC.scheda&&DOC.scheda.fcSedute)||{};
  Object.keys(fs).forEach(k=>{ const v=fs[k]; if(Array.isArray(v)) v.forEach(x=>fcs.push(x)); else if(v && typeof v==='object') fcs.push(v); });
  const visti=new Set(); fcs.forEach(s=>{ if(!s || visti.has(s.id)) return; visti.add(s.id); usa(s, true); });
  return out; }
/* minuti dormiti di quel giorno: 1 = sonno (notti e sonnellini, meno le fasi «sveglio») */
function kcSonno(d0, n){
  const dorme=new Uint8Array(n), M=t=>Math.floor((t-d0)/60000);
  const segna=(a, b, v)=>{ for(let k=Math.max(0, M(a));k<Math.min(n, M(b-1)+1);k++) dorme[k]=v; };
  (recuperoNorm(DOC.recupero).notti||[]).map(pulisciNotte).filter(Boolean).forEach(x=>{
    const a=new Date(x.inizio).getTime(), b=new Date(x.fine).getTime(); if(!(b>d0) || !(a<d0+n*60000)) return;
    segna(a, b, 1); (x.fasi||[]).forEach(f=>{ if(f[2]==='sveglio') segna(a+f[0]*60000, a+f[1]*60000, 0); });
    (x.sonnellini||[]).forEach(z=>{ const za=new Date(z.inizio).getTime(), zb=new Date(z.fine).getTime(); if(za<zb) segna(za, zb, 1); }); });
  return dorme; }
/* un giorno (fino ad adesso, se è oggi): kcal divise in metabolismo, vita quotidiana, movimento e digestione */
function kcGiorno(data){
  const mm=brMinuti(data), gv=brGiornoValori(data, (DOC.recupero||{}).notti), P=kcProfiloAl(data, gv && gv.fcRiposo);
  if(!P) return null;
  const d0=new Date(data+'T00:00:00').getTime(), n=mm? mm.n : Math.round((new Date(recPiuGiorni(data,1)+'T00:00:00')-d0)/60000);
  const fine=Math.min(d0+n*60000, Date.now()); if(!(fine>d0)) return null;
  const nm=Math.ceil((fine-d0)/60000), rMin=P.rmr/1440, dorme=kcSonno(d0, nm), sed=kcSedute(data);
  let bas=0, vit=0, mov=0, coperti=0;
  for(let k=0;k<nm;k++){
    const t=d0+k*60000, base=rMin*(dorme[k]? KC_SONNO : KC_SVEGLIO); let ee=base;
    const p=mm? mm.passi[k] : -1, hr=mm? mm.bpm[k] : 0; if(p>=0 || hr>0) coperti++;
    const s=sed.find(x=>t>=x.a && t<x.b);
    if(s){ const h=s.bpm[Math.floor((t-s.a)/60000)];
      if(s.pesi) ee=Math.max(base, kcDaMet(s.met, P));
      else if(h && P.soglia && h>=P.soglia) ee=Math.max(base, kcKeytel(h, P));
      else if(s.met) ee=Math.max(base, kcDaMet(s.met, P)); }
    else {
      if(p>0){ const q=Math.min(1, p/100); ee=Math.max(base, q*kcDaMet(kcMetCadenza(p), P)+(1-q)*base); }
      if(hr && P.soglia && hr>=P.soglia){ const k2=kcKeytel(hr, P); if(k2>ee) ee=k2; } }
    bas+=rMin; vit+=Math.max(0, base-rMin); mov+=Math.max(0, ee-base); }
  const dig=(bas+vit+mov)*KC_DIGESTIONE/(1-KC_DIGESTIONE), tot=bas+vit+mov+dig;
  return {data:data, tot:Math.round(tot), bas:Math.round(bas), vit:Math.round(vit), mov:Math.round(mov), dig:Math.round(dig),
    rmr:Math.round(P.rmr), da:P.da, peso:P.peso, completo:fine>=d0+n*60000, copertura:mm? coperti/nm : 0, pal:tot/(P.rmr*nm/1440)}; }

/* ── analisi nel Recupero del tab Corpo ── */
const KC_PARTI=[['bas','Metabolismo a riposo','var(--ink-4)'], ['vit','Vita quotidiana','var(--c-oro)'], ['mov','Movimento','var(--orange)'], ['dig','Digestione','var(--c-terra)']];
function kcBarre(righe){
  const W=560, H=200, FS=9, P={l:44,r:12,t:12,b:24}, n=righe.length;
  const tot=righe.map(r=>r.k? r.k.tot : 0); if(!tot.some(v=>v>0)) return `<div class="empty">${t('Nessun giorno con i dati del bracciale in questo periodo.')}</div>`;
  let mx=0; tot.forEach(v=>{ if(v>mx) mx=v; }); mx=Math.ceil(mx/500)*500||500;
  const Y=v=>P.t+(H-P.t-P.b)*(1-v/mx), gap=(W-P.l-P.r)/n, bw=Math.min(gap*0.68, 38), cx=i=>P.l+gap*i+gap/2;
  let g='';
  for(let v=0;v<=mx;v+=(mx>3000? 1000 : 500)){ const y=Y(v);
    g+=`<line class="grid" x1="${P.l}" y1="${y.toFixed(1)}" x2="${W-P.r}" y2="${y.toFixed(1)}"/><text class="lbl" x="${P.l-5}" y="${(y+3).toFixed(1)}" text-anchor="end">${nf(v,0)}</text>`; }
  righe.forEach((r,i)=>{ if(!r.k) return; let acc=0, s='';
    KC_PARTI.forEach(([k,,col])=>{ const v=r.k[k]; if(!(v>0)) return; const y1=Y(acc+v), y0=Y(acc);
      s+=`<rect x="${(cx(i)-bw/2).toFixed(1)}" y="${y1.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0,y0-y1).toFixed(1)}" fill="${col}"${r.k.copertura<KC_COPERTURA? ' opacity=".45"' : ''}/>`; acc+=v; });
    const tip=giornoPesata(r.d)+' · '+nf(r.k.tot,0)+' kcal'+KC_PARTI.map(([k,nome])=>' · '+t(nome)+' '+nf(r.k[k],0)).join('')+
      (r.k.completo? '' : ' · '+t('fino ad adesso'))+(r.k.copertura<KC_COPERTURA? ' · '+t('bracciale portato poco: stima più bassa del vero') : '');
    g+=`<g class="recu-barra"><title>${esc(tip)}</title>${s}</g>`; });
  g+=grafEtichX(righe.map(r=>recEtich(r.d)), cx, W, FS, Math.ceil(n/8), H-8);
  const leg=`<div class="lat-leg">${KC_PARTI.map(([,nome,col])=>`<span><i style="background:${col}"></i>${esc(t(nome))}</span>`).join('')}</div>`;
  return `<svg class="recu-barre" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet"><line class="axis" x1="${P.l}" y1="${Y(0).toFixed(1)}" x2="${W-P.r}" y2="${Y(0).toFixed(1)}"/>${g}</svg>${leg}`; }
/* il riquadro: barre del periodo, media, livello di attività misurato contro quello del profilo, confronto con la dieta */
function htmlCalorie(date){
  const righe=date.map(d=>({d:d, k:brMinuti(d)? kcGiorno(d) : null}));
  if(!righe.some(r=>r.k)) return '';
  const pieni=righe.filter(r=>r.k && r.k.completo && r.k.copertura>=KC_COPERTURA);
  const media=pieni.length? Math.round(pieni.reduce((a,r)=>a+r.k.tot,0)/pieni.length) : null;
  const pal=pieni.length? pieni.reduce((a,r)=>a+r.k.pal,0)/pieni.length : null;
  const palProf=+(DOC.dati_utente||{}).livello_attivita||0;
  const per=periodiPerSettimana(), w=isoWeek(new Date()), dieta=(per[schedaCode(w.anno,w.sett)]||{}).kcal||0;
  const ur=righe.filter(r=>r.k).pop(), ultimo=ur.k;
  const tess=(nome,val,unita,sub)=>`<div class="card"><div class="card__k">${nome}</div><div class="card__v">${val}${unita&&val!=='—'?`<small> ${unita}</small>`:''}</div><div class="card__sub">${sub||''}</div></div>`;
  const usaPal=(pal!=null && Math.abs(pal-palProf)>=0.05)? ` <button class="btn btn--sm no-print" id="kc-usa-pal" data-pal="${pal.toFixed(2)}">${t('Usa')} ${nf(pal,2)}</button>` : '';
  return `<div class="chart-box recu-kcal"><h4>${t('Calorie bruciate')} <span class="muted">${t('stima, kcal al giorno')}</span></h4>
    <div class="cards recu-cards">
      ${tess(t('Media al giorno'), media!=null? nf(media,0) : '—', 'kcal', pieni.length? `${pieni.length} ${t(pieni.length===1? 'giorno col bracciale portato' : 'giorni col bracciale portato')}` : t('servono giorni interi col bracciale'))}
      ${tess(t('Livello di attività misurato'), pal!=null? nf(pal,2) : '—', '', `${t('nel profilo')} ${palProf? nf(palProf,2) : '—'}${usaPal}`)}
      ${tess(t('Dieta del periodo'), dieta? nf(dieta,0) : '—', dieta? 'kcal' : '', (dieta && media!=null)? `${t('bilancio medio')} ${dieta-media>=0?'+':'−'}${nf(Math.abs(dieta-media),0)} kcal` : t('nessun periodo alimentare in corso'))}
      ${tess(t('Ultimo giorno'), nf(ultimo.tot,0), 'kcal', esc(giornoPesata(ur.d))+(ultimo.completo? '' : ' · '+t('fino ad adesso')))}
    </div>
    ${kcBarre(righe)}
    <div class="lat-nota">${t('Stima calcolata dal TMS dai campioni del bracciale, dal sonno, dalle sedute e dalle misure di ogni giorno: metabolismo a riposo (Cunningham con la massa magra, se no Mifflin-St Jeor), vita quotidiana coi fattori della FAO, passi al minuto (CADENCE-Adults), battito oltre l’attività moderata (Keytel), pesi coi MET del Compendium secondo la fatica, digestione 10 %. Il livello di attività misurato è il totale diviso il metabolismo a riposo, sui giorni interi col bracciale portato. Le barre chiare sono giorni col bracciale portato poco.')}</div>
  </div>`; }
function legaCalorie(){
  const b=document.getElementById('kc-usa-pal'); if(!b) return;
  b.onclick=()=>{ const v=+b.dataset.pal; if(!(v>=1 && v<=3)) return; DOC.dati_utente.livello_attivita=v; persist('corpo'); renderCorpo(); };
}
