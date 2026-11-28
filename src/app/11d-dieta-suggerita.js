/* ════════════════ SUGGERIMENTO DELLA DIETA (28/11/2026) ════════════════
   Marco: «inseriamo un suggerimento della dieta, in base a massa o cut rispetto alla quota calorica consumata»; scelto
   da lui: sul PC (Alimentazione, accanto a Piano e Fabbisogno) e sul telefono (Salute, sotto le calorie di oggi).
   Si CALCOLA ogni volta che si mostra, mai salvato (regola dei dati grezzi). STESSA FORMULA sul telefono (dsSuggerisci in
   app-android/web/index.html, lo controlla tests/test-app.js): se cambia qui, cambia anche là. Spiegazione completa con
   le fonti nella nota 'dieta-suggerita' (05d-spiegazioni-bracciale.js).
   · CONSUMO DI PARTENZA: la media delle calorie bruciate (kcGiorno, 09g-calorie.js) nei giorni interi col bracciale portato
     almeno l'80 % del tempo, fra gli ultimi 14 (oggi escluso); ne servono almeno 4. Se no il fabbisogno del profilo
     (metabolismo basale × livello di attività, bodyCalc del tab Corpo).
   · CUT: −0,5/−1 % del peso a settimana (Helms et al., JISSN 2014), al centro −0,7 % (Garthe et al., IJSNEM 2011: a quel
     ritmo la massa magra è cresciuta, all'1,4 % no). Deficit al giorno = peso × ritmo × 7700 ÷ 7. Proteine 2,3–3,1 g per kg
     di massa magra (senza la massa grassa 1,6–2,2 g per kg di peso), grassi 15–30 % delle calorie.
   · MASSA: +10/+20 % sopra il consumo (principiante e intermedio, +0,25/+0,5 % del peso a settimana), +5/+10 % per
     l'avanzato (~+0,25 %): Iraki et al., Sports 2019, tab. 1. Proteine 1,6–2,2 g/kg, grassi 0,5–1,5 g/kg.
   · MANTENIMENTO: il consumo; proteine 1,6–2,2 g/kg (Morton et al., BJSM 2018), grassi 0,5–1,5 g/kg. */
const DS_KCAL_KG=7700, DS_GIORNI=14, DS_MIN_GIORNI=4;
/* o: {fase, consumo, peso, grasso (%), esperienza, rmr} → null o il suggerimento (kcal arrotondate a 10) */
function dsSuggerisci(o){
  const f=o && o.fase, C=+(o && o.consumo), P=+(o && o.peso);
  if(!(f==='cut' || f==='bulk' || f==='mant') || !(C>=800 && C<=8000) || !(P>=30 && P<=300)) return null;
  const magra=(o.grasso!=null && o.grasso>=3 && o.grasso<=70)? P*(1-o.grasso/100) : null;
  const def=pct=>P*pct/100*DS_KCAL_KG/7, r={fase:f, consumo:Math.round(C)};
  if(f==='cut'){ r.kcal=C-def(0.7); r.min=C-def(1.0); r.max=C-def(0.5); r.ritmo=[-1.0, -0.7, -0.5];
    r.prot=magra? [2.3*magra, 3.1*magra] : [1.6*P, 2.2*P]; r.protMagra=!!magra; r.grassi=[0.15*r.kcal/9, 0.30*r.kcal/9]; }
  else if(f==='bulk'){ const av=o.esperienza==='avanzato', s=av? [0.05, 0.075, 0.10] : [0.10, 0.15, 0.20];
    r.kcal=C*(1+s[1]); r.min=C*(1+s[0]); r.max=C*(1+s[2]); r.ritmo=av? [0.25, 0.25, 0.25] : [0.25, 0.375, 0.5]; r.avanzato=av;
    r.prot=[1.6*P, 2.2*P]; r.grassi=[0.5*P, 1.5*P]; }
  else { r.kcal=C; r.min=C; r.max=C; r.ritmo=[0, 0, 0]; r.prot=[1.6*P, 2.2*P]; r.grassi=[0.5*P, 1.5*P]; }
  r.kcal=Math.round(r.kcal/10)*10; r.min=Math.round(r.min/10)*10; r.max=Math.round(r.max/10)*10;
  r.kgSett=r.ritmo.map(x=>P*x/100); r.prot=r.prot.map(Math.round); r.grassi=r.grassi.map(Math.round);
  r.sottoRmr=!!(o.rmr>0 && r.kcal<o.rmr);
  return r; }
/* il consumo di partenza: {kcal, giorni, fonte:'bracciale'|'profilo', nBracciale} o null */
function dsConsumo(){
  const oggi=recYmd(new Date()), vals=[];
  for(let i=1;i<=DS_GIORNI;i++){ const d=recPiuGiorni(oggi, -i); if(!brMinuti(d)) continue;
    const k=kcGiorno(d); if(k && k.completo && k.copertura>=KC_COPERTURA) vals.push(k.tot); }
  if(vals.length>=DS_MIN_GIORNI) return {kcal:vals.reduce((a,b)=>a+b, 0)/vals.length, giorni:vals.length, fonte:'bracciale', nBracciale:vals.length};
  const fabb=bodyCalc(DOC.dati_utente||{}).metab;
  return fabb>=800? {kcal:fabb, giorni:0, fonte:'profilo', nBracciale:vals.length} : null; }
/* il suggerimento del profilo aperto per una fase (quella del piano mostrato) */
function dsPerProfilo(fase){
  const c=dsConsumo(); if(!c) return null;
  const oggi=recYmd(new Date()), C=kcCorpoAl(oggi), P=kcProfiloAl(oggi);
  const s=dsSuggerisci({fase:fase, consumo:c.kcal, peso:C.peso, grasso:C.grasso, esperienza:(DOC.dati_utente||{}).esperienza, rmr:P? P.rmr : 0});
  if(s){ s.fonte=c.fonte; s.giorni=c.giorni; }
  return s; }
/* i campioni del bracciale delle ultime due settimane: si leggono in sottofondo, poi si ridisegna l'Alimentazione */
function dsCarica(){
  if(typeof brCarica!=='function') return;
  brCarica(brMesiRecenti(DS_GIORNI+1)).then(nuovo=>{ if(!nuovo) return;
    if(curTab==='alimentazione') renderAlimentazione(); })
    .catch(e=>logErrore('dieta/campioni', e)); }
const dsKg=x=>(x>0? '+' : x<0? '−' : '±')+nf(Math.abs(x), 1);
/* il riquadro accanto al piano: da mangiare, ritmo, proteine e grassi, e quanto si scosta il piano */
function pannelloSuggerimento(fase, kcPiano){
  const s=dsPerProfilo(fase), tit=`${t('Suggerimento per la fase')} <span class="muted">${esc(t(FASE_LAB[fase]||fase))}</span>${spiegaBtn('dieta-suggerita')}`;
  if(!s) return `<div class="lat ds-box"><h4>${tit}</h4><div class="lat-nota">${t('Servono il peso e le calorie bruciate dal bracciale (almeno 4 giorni interi) o, nel tab Corpo, metabolismo basale e livello di attività.')}</div></div>`;
  const r=s.kgSett, ritmo= s.fase==='mant'? t('peso stabile')
    : `${s.fase==='cut'? `${dsKg(r[2])} / ${dsKg(r[0])}` : (r[0]===r[2]? dsKg(r[1]) : `${dsKg(r[0])} / ${dsKg(r[2])}`)} kg ${t('a settimana')}`;
  let conf='';
  if(kcPiano>0){ const d=kcPiano-s.kcal, dentro=kcPiano>=s.min-25 && kcPiano<=s.max+25;
    conf=`<div class="lat-num ds-piano"><span>${t('Il piano')}</span><b style="color:${dentro? 'var(--ok)' : (d>0? 'var(--orange)' : 'var(--violet)')}">${dentro? t('dentro il suggerimento') : `${nf(Math.abs(d),0)} kcal ${d>0? t('sopra') : t('sotto')}`}</b></div>`; }
  return `<div class="lat ds-box"><h4>${tit}</h4>
    <div class="lat-num"><span>${t('Consumo')}</span><b>${nf(s.consumo,0)} kcal</b></div>
    <div class="lat-nota">${s.fonte==='bracciale'? `${t('media di')} ${s.giorni} ${t('giorni interi col bracciale')}` : t('dal fabbisogno del profilo (metabolismo basale × livello di attività)')}</div>
    <div class="lat-num ds-kcal"><span>${t('Da mangiare')}</span><b>≈ ${nf(s.kcal,0)} kcal</b></div>
    <div class="lat-nota">${s.min!==s.max? `${nf(s.min,0)}–${nf(s.max,0)} kcal · ` : ''}${ritmo}</div>
    <div class="lat-num"><span>${t('Proteine')}</span><b>${nf(s.prot[0],0)}–${nf(s.prot[1],0)} g</b></div>
    <div class="lat-nota">${s.fase==='cut' && s.protMagra? t('2,3–3,1 g per kg di massa magra') : t('1,6–2,2 g per kg di peso')}</div>
    <div class="lat-num"><span>${t('Grassi')}</span><b>${nf(s.grassi[0],0)}–${nf(s.grassi[1],0)} g</b></div>
    ${conf}
    ${s.sottoRmr? `<div class="lat-nota ds-avviso">${t('Sotto il metabolismo a riposo: meglio un ritmo più lento.')}</div>` : ''}</div>`; }
