/* ════════════════ RENDER: ALIMENTAZIONE ════════════════ */
const NUTR=[['kcal','Kcal',0],['proteine','Prot.',1],['grassi','Grassi',1],['zuccheri','Carbo',1],['fibre','Fibre',1],['saturi','Saturi',1],['colesterolo','Colest.',0],['sodio','Sodio',0]];
function foodVal(nome,grammi,key,ricette){ const f=foodLookup(nome,ricette); if(!f)return 0; const v=f.per100[key]; return v==null?0:v*(+grammi||0)/100; }
function faseTot(rows){ const t={}; NUTR.forEach(([k])=>t[k]=0); rows.forEach(r=>NUTR.forEach(([k])=>t[k]+=foodVal(r.alimento,r.grammi,k))); return t; }
const NUTR_FULL=[
 ['Macronutrienti',[['kcal','Energia','kcal',0],['proteine','Proteine','g',1],['grassi','Grassi','g',1],['saturi','di cui saturi','g',1],['monoinsaturi','monoinsaturi','g',1],['polinsaturi','polinsaturi','g',1],['zuccheri','Carboidrati','g',1],['zucch','di cui zuccheri','g',1],['fibre','Fibre','g',1],['colesterolo','Colesterolo','mg',0]]],
 ['Vitamine',[['vitA','Vit. A','µg',0],['vitB1','Vit. B1','mg',2],['vitB2','Vit. B2','mg',2],['vitB6','Vit. B6','mg',2],['vitB12','Vit. B12','µg',2],['vitC','Vit. C','mg',1],['vitD','Vit. D','µg',1],['vitE','Vit. E','mg',1],['folati','Folati','µg',0]]],
 ['Minerali',[['calcio','Calcio','mg',0],['ferro','Ferro','mg',1],['magnesio','Magnesio','mg',0],['potassio','Potassio','mg',0],['zinco','Zinco','mg',1],['sodio','Sodio','mg',0],['iodio','Iodio','µg',0],['fosforo','Fosforo','mg',0]]],
];
function foodDetail(nome,grammi){
  const fo=foodLookup(nome);
  if(!fo) return `<span class="muted">«${esc(nome)}» ${t('non è nella banca dati: nessun dettaglio nutrienti.')}</span>`;
  const g=+grammi||0;
  let html=(fo.ricetta? ricettaScheda(fo.ricetta) : '')+`<div style="font-size:12px;color:var(--ink-3);margin-bottom:7px">${t('Valori per')} <b>${nf(g,0)} g</b> ${t('di')} <b>${esc(fo.nome)}</b>${fo.categoria?` · <span class="muted">${esc(fo.categoria)}</span>`:''} <span class="muted">${t('(tra parentesi: per 100 g)')}</span></div>`;
  html+=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">`;
  NUTR_FULL.forEach(([grp,items])=>{
    html+=`<div><div class="mono" style="font-size:11px;color:var(--orange);border-bottom:1px solid var(--border);margin-bottom:4px;padding-bottom:2px">${t(grp)}</div>`;
    items.forEach(([k,lab,unit,dec])=>{ const p100=fo.per100[k]; const val=p100==null?null:p100*g/100;
      html+=`<div style="display:flex;justify-content:space-between;font-size:12px;padding:1px 0"><span>${t(lab)}</span><span class="mono">${val==null?'—':nf(val,dec)} ${unit} <span class="muted">(${p100==null?'—':nf(p100,dec)})</span></span></div>`; });
    html+=`</div>`;
  });
  return html+`</div>`;
}
let fpFilter='';
/* le macro categorie della banca alimenti (2026-11): '' = tutte, 'S' = alimenti semplici
   (come si comprano o crudi), 'R' = ricette (cucinato, condito o composto — anche «pollo cotto»),
   'I' = integratori (proteine in polvere e simili, valori dall'etichetta) */
let fpTipo='';
function foodTipo(fo){ const k=fo&&fo.tipo; return k==='R'||k==='I'||k==='M'? k : 'S'; }   /* M = ricetta personale (11c-ricette.js) */
/* preferiti alimenti (nomi) per profilo, in DOC.alimentazione.fav */
function foodFavList(){ const A=DOC.alimentazione||{}; if(!Array.isArray(A.fav)) A.fav=[]; return A.fav; }
function foodIsFav(nome){ return foodFavList().indexOf(String(nome||'').trim())>=0; }
function foodToggleFav(nome){ nome=String(nome||'').trim(); if(!nome)return; const f=foodFavList(); const i=f.indexOf(nome); if(i>=0) f.splice(i,1); else f.push(nome); persist('alimentazione'); }
/* alimenti usati di recente: nomi distinti presenti nei pasti delle tre fasi */
function foodRecenti(){ const seen=new Set(), out=[]; ['bulk','mant','cut'].forEach(fa=>((DOC.alimentazione||{})[fa]||[]).forEach(r=>{ const n=String((r&&r.alimento)||'').trim(); if(n&&!seen.has(n)){ seen.add(n); out.push(n); } })); return out; }
/* ricerca «a parole»: tutte le parole digitate presenti in nome+categoria (in qualunque ordine) */
function foodMatch(fo,q){ q=String(q||'').trim().toLowerCase(); if(!q) return true; const hay=(fo.nome+' '+(fo.categoria||'')).toLowerCase(); return q.split(/\s+/).every(t=>hay.includes(t)); }
/* il selettore serve a due cose: scegliere l'alimento di una riga del piano e scegliere un
   ingrediente di una ricetta. opz = {scegli(nome), chiudi(), senzaMie: niente ricette
   personali (ingredienti), titolo} */
let fpOpz=null;
function openFoodPicker(fase,i){ apriSelettoreAlimenti({ scegli:nome=>{ DOC.alimentazione[fase][i].alimento=nome; persist('alimentazione'); closeModal(); renderAlimentazione(); },
  chiudi:()=>closeModal() }); }
function apriSelettoreAlimenti(opz){ fpOpz=opz||{}; fpFilter=''; if(fpOpz.senzaMie && fpTipo==='M') fpTipo='';
  renderFoodPicker(); setTimeout(()=>{ try{ document.getElementById('fp-q').focus(); }catch(e){} },0); }
function renderFoodPicker(){
  const O=fpOpz||{}, q=fpFilter, cap=400;
  const rowHtml=fo=>{ const fav=foodIsFav(fo.nome), tp=foodTipo(fo);
    return `<tr class="fp-row" data-nome="${esc(fo.nome)}" style="cursor:pointer">
      <td class="no-print" style="text-align:center;padding:2px;width:24px"><button class="exp-star${fav?' on':''}" data-fav="${esc(fo.nome)}" title="${fav?t('togli dai preferiti'):t('aggiungi ai preferiti')}">${ico('stella',fav?'p pieno':'p')}</button></td>
      <td class="l">${esc(fo.nome)}${tp==='R'?` <span class="pill fp-ric" title="${t('Ricetta: cucinato, condito o composto')}">${t('ricetta')}</span>`:tp==='I'?` <span class="pill fp-ric" title="${t('Integratore: valori dall’etichetta')}">${t('integratore')}</span>`:tp==='M'?` <button class="btn btn--sm" data-fpedit="${esc(fo.nome)}" title="${t('modifica la ricetta')}">${ico('matita','p')}</button>`:''}</td>
      <td class="l muted" style="font-size:11.5px">${esc(tp==='M'?t(RIC_CATEGORIA):(fo.categoria||''))}</td>
      <td class="num">${fo.per100.kcal==null?'—':nf(fo.per100.kcal,0)}</td><td class="num">${fo.per100.proteine==null?'—':nf(fo.per100.proteine,1)}</td>
      <td class="num">${fo.per100.grassi==null?'—':nf(fo.per100.grassi,1)}</td><td class="num">${fo.per100.zuccheri==null?'—':nf(fo.per100.zuccheri,1)}</td><td class="num">${fo.per100.fibre==null?'—':nf(fo.per100.fibre,1)}</td></tr>`; };
  const grp=x=>`<tr class="fp-grp"><td colspan="8" style="background:var(--paper-3);color:var(--ember-2);font-family:var(--font-disp);font-size:12px;padding:5px 10px">${x}</td></tr>`;
  let body='', count;
  const mie=O.senzaMie? [] : ricetteComeAlimenti();
  const ammesso=fo=>!(O.senzaMie && foodTipo(fo)==='M');
  const delTipo=fo=>ammesso(fo) && (!fpTipo||foodTipo(fo)===fpTipo);
  const TUTTI= fpTipo==='M'? mie : (fpTipo? FOOD.filter(delTipo) : mie.concat(FOOD));
  if(q){ const list=TUTTI.filter(fo=>foodMatch(fo,q)); count=list.length; body=list.slice(0,cap).map(rowHtml).join(''); }
  else {
    const favSet=new Set(foodFavList());
    const favFoods=foodFavList().map(n=>foodLookup(n)).filter(Boolean).filter(delTipo);
    const rec=[]; foodRecenti().forEach(n=>{ if(rec.length>=12)return; if(!favSet.has(n)){ const fo=foodLookup(n); if(fo&&delTipo(fo)) rec.push(fo); } });
    if(fpTipo==='M') body+=`<tr><td colspan="8" style="padding:8px 10px"><button class="btn btn--ember btn--sm" id="fp-nuova-ric">${t('＋ Nuova ricetta')}</button> <span class="muted" style="font-size:11.5px">${t('gli ingredienti si scelgono dalla banca dati e i valori si sommano da soli')}</span></td></tr>`;
    if(favFoods.length){ body+=grp(t('Preferiti'))+favFoods.map(rowHtml).join(''); }
    if(rec.length){ body+=grp(t('Recenti'))+rec.map(rowHtml).join(''); }
    if(favFoods.length||rec.length) body+=grp(fpTipo==='M'?t('Le mie ricette'):t('Tutti gli alimenti'));
    body+=TUTTI.slice(0,cap).map(rowHtml).join(''); count=TUTTI.length;
  }
  const tipi=[['',t('Tutti')],['S',t('Alimenti semplici')],['R',t('Ricette')],['I',t('Integratori')]].concat(O.senzaMie?[]:[['M',t('Le mie ricette')]]);
  const m=document.getElementById('modal'); m.style.maxWidth='820px';
  m.innerHTML=`<h3>${esc(O.titolo||t('Scegli un alimento'))} <span class="pill" style="font-weight:400">${count} ${t('risultati')}${count>cap?' · '+t('primi')+' '+cap:''}</span></h3>
    <div class="fp-tipi no-print">${tipi.map(([k,l])=>`<button type="button" class="btn btn--sm${fpTipo===k?' btn--ember':''}" data-fptipo="${k}">${l}</button>`).join('')}
      <span class="muted" style="font-size:11px;margin-left:6px">${t('semplici = come si comprano o crudi · ricette = cucinati, conditi o composti · integratori = valori dall’etichetta')}</span></div>
    <input id="fp-q" class="search" style="width:100%;margin-bottom:8px" placeholder="${t('cerca a parole: nome o categoria…')}" value="${esc(fpFilter)}">
    <div style="max-height:52vh;overflow:auto;border:1px solid var(--border);border-radius:var(--r-sm)">
    <table><thead><tr><th class="no-print"></th><th class="l">${t('Alimento')}</th><th class="l">${t('Categoria')}</th><th>Kcal</th><th>Prot</th><th>${t('Grassi')}</th><th>Carbo</th><th>${t('Fibre')}</th></tr></thead>
    <tbody>${body||`<tr><td colspan="8" class="empty">${fpTipo==='M'?t('Nessuna ricetta: creane una con «＋ Nuova ricetta».'):t('Nessun alimento.')}</td></tr>`}</tbody></table></div>
    <div class="muted" style="font-size:11px;margin-top:6px">${t('Valori per 100 g · clicca una riga per selezionare · la stella per i preferiti')}</div>
    <div class="modal__actions"><button class="btn" id="fp-chiudi">${t('Chiudi')}</button></div>`;
  document.getElementById('modal-bk').classList.remove('hidden');
  document.getElementById('fp-chiudi').onclick=()=>{ m.style.maxWidth=''; if(O.chiudi) O.chiudi(); else closeModal(); };
  m.querySelectorAll('[data-fptipo]').forEach(b=>b.onclick=()=>{ fpTipo=b.dataset.fptipo; renderFoodPicker(); try{ document.getElementById('fp-q').focus(); }catch(e){} });
  const qi=document.getElementById('fp-q');
  qi.oninput=e=>{ fpFilter=e.target.value; const pos=qi.selectionStart; renderFoodPicker(); const ni=document.getElementById('fp-q'); ni.focus(); try{ni.setSelectionRange(pos,pos);}catch(_){} };
  m.querySelectorAll('.exp-star').forEach(s=>s.onclick=ev=>{ ev.stopPropagation(); const sc=m.querySelector('div[style*="overflow:auto"]'); const y=sc?sc.scrollTop:0; foodToggleFav(s.dataset.fav); renderFoodPicker(); const sc2=document.querySelector('#modal div[style*="overflow:auto"]'); if(sc2) sc2.scrollTop=y; });
  /* una ricetta si crea o si modifica dal selettore e poi si torna qui, con la stessa scelta */
  const torna=()=>{ apriSelettoreAlimenti(O); fpTipo='M'; renderFoodPicker(); };
  const nr=document.getElementById('fp-nuova-ric'); if(nr) nr.onclick=()=>apriRicetta('', torna);
  m.querySelectorAll('[data-fpedit]').forEach(b=>b.onclick=ev=>{ ev.stopPropagation(); apriRicetta(b.dataset.fpedit, torna); });
  m.querySelectorAll('.fp-row').forEach(tr=>tr.onclick=()=>{ m.style.maxWidth=''; if(O.scegli) O.scegli(tr.dataset.nome); });
}
let alimDet=null;
let omsFase='bulk';
const FASE_LAB={bulk:'Bulk',mant:'Mantenimento',cut:'Cut'};
function faseAlimActive(){ const f=DOC.dati_utente&&DOC.dati_utente.faseAlim; return (f==='bulk'||f==='mant'||f==='cut')?f:'bulk'; }
function omsRef(u){ const c=bodyCalc(u); const en=c.metab||2000, peso=+u.peso||70;
  return [
   ['Energia','kcal','target', en,'kcal'],
   ['Proteine','proteine','target', 0.83*peso,'g'],
   ['Grassi totali','grassi','limit', 0.30*en/9,'g'],
   ['di cui saturi','saturi','limit', 0.10*en/9,'g'],
   ['Carboidrati','zuccheri','target', 0.55*en/4,'g'],
   ['Zuccheri (OMS \u226410% E)','zucch','limit', 0.10*en/4,'g'],
   ['Fibre','fibre','target', 25,'g'],
   ['Colesterolo','colesterolo','limit', 300,'mg'],
   ['Sodio','sodio','limit', 2000,'mg'],
   ['Vit. A','vitA','target', 600,'µg'],
   ['Vit. B1','vitB1','target', 1.2,'mg'],
   ['Vit. B2','vitB2','target', 1.3,'mg'],
   ['Vit. B6','vitB6','target', 1.3,'mg'],
   ['Vit. B12','vitB12','target', 2.4,'µg'],
   ['Vit. C','vitC','target', 45,'mg'],
   ['Vit. D','vitD','target', 15,'µg'],
   ['Vit. E','vitE','target', 10,'mg'],
   ['Folati','folati','target', 400,'µg'],
   ['Calcio','calcio','target', 1000,'mg'],
   ['Ferro','ferro','target', 11,'mg'],
   ['Magnesio','magnesio','target', 350,'mg'],
   ['Potassio','potassio','target', 3500,'mg'],
   ['Zinco','zinco','target', 11,'mg'],
   ['Iodio','iodio','target', 150,'µg'],
   ['Fosforo','fosforo','target', 700,'mg'],
  ];
}
/* 💡 accanto a un nutriente sotto il riferimento: suggerisce gli alimenti che ne sono ricchi
   (11c-ricette.js). Solo per gli obiettivi, non per i limiti né per l'energia. */
function suggBtn(x){ return (x.type==='target' && x.key!=='kcal')? ` <button type="button" class="sugg-btn no-print" data-sugg="${esc(x.key)}" title="${esc(t('Alimenti ricchi di')+' '+t(x.lab))}" aria-label="${esc(t('Suggerisci alimenti'))}">${ico('lampadina','p')}</button>` : ''; }
function omsRenderSection(){
  const u=DOC.dati_utente; const refs=omsRef(u); const fase=omsFase;
  const rows=DOC.alimentazione[fase]||[];
  let body='';
  refs.forEach(([lab,key,type,val,unit])=>{
    const day=rows.reduce((a,r)=>a+foodVal(r.alimento,r.grammi,key),0);
    const week=day*7, refw=val*7, pct=refw>0? week/refw*100:0;
    const ok = type==='limit'? pct<=100 : pct>=90;
    const col = ok? 'var(--ok)' : (type==='limit'? 'var(--danger)' : (pct<60?'var(--danger)':'var(--gold-2)'));
    const barw=Math.max(2,Math.min(pct,100)), dec=val<10?1:0;
    body+=`<tr><td class="l">${t(lab)} ${type==='limit'?`<span class="muted" title="${t('limite massimo da non superare')}">${t('(max)')}</span>`:''}${ok?'':suggBtn({key:key,type:type,lab:lab})}</td>
      <td class="num">${nf(week,dec)} ${unit}</td><td class="num muted">${nf(refw,dec)} ${unit}</td>
      <td class="num" style="color:${col};font-weight:600">${nf(pct,0)}%</td>
      <td style="width:80px;min-width:60px"><div style="background:var(--paper-3);border-radius:var(--r-pill);height:9px;overflow:hidden"><div style="width:${barw}%;height:100%;background:${col}"></div></div></td></tr>`;
  });
  return `<div class="tbl-wrap"><table><thead><tr><th class="l">${t('Nutriente')}</th><th>${t('Settimana')}</th><th>${t('Riferimento')}</th><th>${t('Indice')}</th><th>—</th></tr></thead><tbody>${body}</tbody></table></div>
    <div class="callout callout--info"><div>${t('Valori settimanali = piano giornaliero × 7, confrontati con i riferimenti <b>OMS/FAO</b> per adulto (energia e proteine personalizzati su fabbisogno e peso). I nutrienti <b>(max)</b> sono limiti da non superare. Riferimenti indicativi: non sostituiscono un parere medico/nutrizionale.')}</div></div>`;
}
/* ── PANNELLO LATERALE DEL PIANO (2026-11, schermo intero) ────────────────────────
   Accanto alla tabella dei pasti: quanta energia porta il piano rispetto al fabbisogno,
   com'è ripartita fra i macronutrienti, quanto pesa ogni pasto e quali nutrienti sono
   fuori dai riferimenti. Tutto calcolato al volo dal piano della fase attiva. */
/* ── 🍽 DIETA SEGUITA: la segna il cliente sul telefono (TMS Scheda, ogni sera) e arriva dall'hub in
      DOC.alimentazione.aderenza (telDietaApplica, 15c-telefono.js). Qui il calendario del mese, in sola
      lettura: verde sì, rosso no, e quanti giorni su quelli segnati. ── */
let aderMese='';   /* 'AAAA-MM' in vista; vuoto = il mese in corso */
function aderenzaGiorni(){ const a=(DOC.alimentazione||{}).aderenza; return (a && typeof a==='object' && !Array.isArray(a))? a : {}; }
function pannelloAderenza(){
  const ad=aderenzaGiorni(), segnati=Object.keys(ad).filter(d=>ad[d] && (ad[d].v==='si'||ad[d].v==='no'));
  const coll=typeof telCollegato==='function' && typeof telProf==='function' && telCollegato(telProf());
  if(!segnati.length && !coll) return '';
  const loc=LANG==='en'?'en-GB':'it-IT', oggi=dataOggi(), mese=aderMese||oggi.slice(0,7), y=+mese.slice(0,4), m=+mese.slice(5,7)-1;
  const primo=new Date(y,m,1), quanti=new Date(y,m+1,0).getDate();
  let titolo=mese; try{ titolo=primo.toLocaleDateString(loc,{month:'long',year:'numeric'}); }catch(e){}
  let celle='';
  for(let i=0;i<7;i++){ let n=''; try{ n=new Date(2024,0,1+i).toLocaleDateString(loc,{weekday:'narrow'}); }catch(e){} celle+=`<span class="ader-n">${esc(n)}</span>`; }
  celle+='<span></span>'.repeat((primo.getDay()+6)%7);
  let si=0, no=0;
  for(let g=1; g<=quanti; g++){
    const d=mese+'-'+String(g).padStart(2,'0'), v=(ad[d]||{}).v||'';
    if(v==='si') si++; else if(v==='no') no++;
    celle+=`<span class="ader-g${v?' '+v:''}${d===oggi?' oggi':''}${d>oggi?' dopo':''}" title="${esc(d+(v==='si'?' · '+t('dieta seguita'):v==='no'?' · '+t('dieta non seguita'):''))}">${g}</span>`; }
  const pct=(si+no)? Math.round(si/(si+no)*100) : null;
  return `<div class="lat" id="ader-cal"><h4>${t('Dieta seguita')} <span class="muted">${t('la segna il cliente sul telefono')}</span></h4>
    <div class="ader-testa"><button class="btn btn--sm" data-aderm="-1" title="${t('Mese prima')}">${ico('indietro','p')}</button><b>${esc(titolo)}</b>
      <button class="btn btn--sm" data-aderm="1" title="${t('Mese dopo')}"${mese<oggi.slice(0,7)?'':' disabled'}>${ico('avanti','p')}</button></div>
    <div class="ader-cal">${celle}</div>
    <div class="ader-somma"><span><i class="ader-pt si"></i>${t('seguita')} <b>${si}</b></span><span><i class="ader-pt no"></i>${t('non seguita')} <b>${no}</b></span>${pct!=null?`<span>${t('rispettata')} <b>${pct} %</b></span>`:''}</div>
    ${segnati.length? '' : `<div class="empty">${t('Ancora nessun giorno: il cliente lo segna ogni sera nell’Alimentazione di TMS Scheda.')}</div>`}</div>`;
}
function pannelloPiano(fase){
  const rows=((DOC.alimentazione||{})[fase]||[]).filter(r=>r&&r.alimento);
  if(!rows.length) return `<div class="lat"><h4>${t('Il piano in sintesi')}</h4><div class="empty">${t('Aggiungi un pasto e i suoi alimenti: qui vedrai energia, macronutrienti e ripartizione fra i pasti.')}</div></div>`;
  const u=DOC.dati_utente||{}, tot=faseTot(rows), fabb=bodyCalc(u).metab||0, peso=+u.peso||0;
  const kP=tot.proteine*4, kC=tot.zuccheri*4, kG=tot.grassi*9, kM=(kP+kC+kG)||1;
  const pct=x=>Math.round(x/kM*100);
  const d=fabb? tot.kcal-fabb : 0, scala=Math.max(tot.kcal,fabb)||1;
  const pasti=[]; rows.forEach(r=>{ const p=_pastoDi(r); let o=pasti.find(x=>x.p===p); if(!o){ o={p:p,k:0}; pasti.push(o); } o.k+=foodVal(r.alimento,r.grammi,'kcal'); });
  const maxP=Math.max(1,...pasti.map(x=>x.k));
  const fuori=omsRef(u).map(([lab,key,type,val,unit])=>{ const day=rows.reduce((a,r)=>a+foodVal(r.alimento,r.grammi,key),0), q=val>0? day/val*100 : 0;
      return {lab:lab,key:key,type:type,q:q,ok: type==='limit'? q<=100 : q>=90}; }).filter(x=>!x.ok).sort((a,b)=>(a.type==='limit'?-a.q:a.q)-(b.type==='limit'?-b.q:b.q));
  const nRic=rows.filter(r=>{ const f=foodLookup(r.alimento); return f&&(f.tipo==='R'||f.tipo==='M'); }).length;
  return `<div class="lat"><h4>${t('Energia')} <span class="muted">${t('piano contro fabbisogno')}</span>${spiegaBtn('energia')}</h4>
      <div class="lat-num"><span>${t('Piano')}</span><b>${nf(tot.kcal,0)} kcal</b></div>
      <div class="lat-barra"><span style="width:${(tot.kcal/scala*100).toFixed(1)}%;background:var(--orange)"></span></div>
      ${fabb?`<div class="lat-num"><span>${t('Fabbisogno')}</span><b>${nf(fabb,0)} kcal</b></div>
      <div class="lat-barra"><span style="width:${(fabb/scala*100).toFixed(1)}%;background:var(--ink-4)"></span></div>
      <div class="lat-num" style="margin-top:4px"><span>${d>=0?t('Surplus'):t('Deficit')}</span><b style="color:${Math.abs(d)<50?'var(--ok)':(d>0?'var(--orange)':'var(--violet)')}">${d>=0?'+':'−'}${nf(Math.abs(d),0)} kcal/${t('giorno')}</b></div>`
      :`<div class="lat-nota">${t('Per il confronto col fabbisogno inserisci metabolismo basale e livello di attività nel tab Corpo.')}</div>`}</div>
    <div class="lat"><h4>${t('Macronutrienti')} <span class="muted">${t('quota dell’energia')}</span>${spiegaBtn('macro')}</h4>
      <div class="lat-barra"><span style="width:${pct(kP)}%;background:var(--danger)"></span><span style="width:${pct(kC)}%;background:var(--gold-2)"></span><span style="width:${pct(kG)}%;background:var(--violet)"></span></div>
      <div class="lat-num"><span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--danger);margin-right:5px"></i>${t('Proteine')}</span><span><b>${nf(tot.proteine,0)} g</b> · ${pct(kP)}%${peso?` · ${nf(tot.proteine/peso,1)} g/kg`:''}</span></div>
      <div class="lat-num"><span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--gold-2);margin-right:5px"></i>${t('Carboidrati')}</span><span><b>${nf(tot.zuccheri,0)} g</b> · ${pct(kC)}%${peso?` · ${nf(tot.zuccheri/peso,1)} g/kg`:''}</span></div>
      <div class="lat-num"><span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--violet);margin-right:5px"></i>${t('Grassi')}</span><span><b>${nf(tot.grassi,0)} g</b> · ${pct(kG)}%${peso?` · ${nf(tot.grassi/peso,1)} g/kg`:''}</span></div>
      <div class="lat-num"><span>${t('Fibre')}</span><span><b>${nf(tot.fibre,0)} g</b></span></div></div>
    <div class="lat"><h4>${t('Energia per pasto')}${spiegaBtn('energia-pasti')}</h4>
      <div class="lat-giorni">${pasti.map(x=>`<span>${esc(t(x.p))}</span><span class="lat-barra" style="margin:0"><span style="width:${(x.k/maxP*100).toFixed(1)}%;background:var(--orange)"></span></span><span class="mono">${nf(x.k,0)} kcal · ${tot.kcal?Math.round(x.k/tot.kcal*100):0}%</span>`).join('')}</div>
      <div class="lat-nota">${rows.length} ${t('alimenti')}${nRic?` · ${nRic} ${t('ricette')}`:''}</div></div>
    <div class="lat"><h4>${t('Fuori dai riferimenti')} <span class="muted">OMS/FAO</span>${spiegaBtn('nutrienti')}</h4>
      ${fuori.length? fuori.slice(0,8).map(x=>`<div class="lat-num"><span>${esc(t(x.lab))}${x.type==='limit'?` <span class="muted">${t('(max)')}</span>`:''}${suggBtn(x)}</span><b style="color:${x.type==='limit'||x.q<60?'var(--danger)':'var(--gold-2)'}">${nf(x.q,0)}%</b></div>`).join('')+(fuori.length>8?`<div class="lat-nota">+ ${fuori.length-8} ${t('altri nella tabella qui sotto')}</div>`:'')
        : `<div class="lat-num"><span style="color:var(--ok);display:inline-flex;align-items:center;gap:6px">${ico('check','p')}${t('Tutti i nutrienti nei riferimenti')}</span></div>`}</div>`;
}
function renderAlimentazione(){
  const A=DOC.alimentazione; A.bulk=A.bulk||[]; A.mant=A.mant||[]; A.cut=A.cut||[];
  const fase=faseAlimActive(); omsFase=fase;
  function faseTable(fase,rows){
    const meals=[]; rows.forEach(r=>{ const p=((r.pasto||'').trim())||'Senza pasto'; if(!meals.includes(p))meals.push(p); });
    let body='';
    meals.forEach((meal,mi)=>{
      const idxs=rows.map((r,i)=>i).filter(i=>((((rows[i].pasto||'').trim())||'Senza pasto')===meal));
      let mk=0; idxs.forEach(i=>mk+=foodVal(rows[i].alimento,rows[i].grammi,'kcal'));
      body+=`<tr class="day-sep" data-mealrow="${esc(meal)}" data-fase="${fase}"><td colspan="7"><span class="drag-h no-print" title="${t('trascina per spostare il pasto')}">⠿</span> ▌ ${esc(t(meal))} <span style="opacity:.85;font-family:var(--font-mono);font-size:11px">· ${nf(mk,0)} kcal</span>
        <button class="btn btn--sm no-print" data-mealedit data-fase="${fase}" data-meal="${esc(meal)}" title="${t('rinomina pasto')}" style="margin-left:8px">${ico('matita','p')}</button>
        <button class="btn btn--sm no-print" data-mealadd data-fase="${fase}" data-meal="${esc(meal)}" title="${t('aggiungi alimento a questo pasto')}">＋</button>
        <button class="btn btn--sm btn--danger no-print" data-mealdel data-fase="${fase}" data-meal="${esc(meal)}" title="${t('elimina pasto')}">${ico('cestino','p')}</button></td></tr>`;
      idxs.forEach(i=>{ const r=rows[i]; const fo=foodLookup(r.alimento), known=!!fo, mia=!!(fo&&fo.ricetta);
        body+=`<tr data-fase="${fase}" data-i="${i}">
          <td class="l"><span class="drag-h no-print" title="${t('trascina per spostare')}">⠿</span> <button class="btn btn--sm no-print food-pick" data-fase="${fase}" data-i="${i}" style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${r.alimento?'':'color:var(--ink-4)'}">${r.alimento?(mia?ico('libro','p')+' ':'')+esc(r.alimento):t('＋ scegli alimento…')}</button>${r.alimento&&!known?` <span class="pill" title="${t('non nella banca dati')}">?</span>`:''}</td>
          <td><input class="cell-in" type="number" min="0" data-f="grammi" value="${r.grammi??''}" style="width:62px"></td>
          <td class="num cell-out">${nf(foodVal(r.alimento,r.grammi,'kcal'),0)}</td>
          <td class="num cell-calc">${nf(foodVal(r.alimento,r.grammi,'proteine'),1)}</td>
          <td class="num cell-calc">${nf(foodVal(r.alimento,r.grammi,'grassi'),1)}</td>
          <td class="num cell-calc">${nf(foodVal(r.alimento,r.grammi,'zuccheri'),1)}</td>
          <td style="white-space:nowrap">${r.alimento?`<button class="btn btn--sm no-print food-det" data-fase="${fase}" data-i="${i}" title="${t('micro e macro')}">${ico(alimDet===fase+':'+i?'giu':'avanti','p')}</button>`:''}<button class="btn btn--sm btn--danger no-print" data-del="${fase}:${i}" title="${t('elimina alimento')}">${ico('x','p')}</button></td></tr>`;
        if(alimDet===fase+':'+i && r.alimento){
          body+=`<tr><td colspan="7" style="background:var(--paper-2);padding:11px 14px">${foodDetail(r.alimento,r.grammi)}</td></tr>`;
        }
      });
    });
    const tot=faseTot(rows);
    return `<div class="tbl-wrap"><table>
      <thead><tr><th class="l">${t('Alimento')}</th><th>g</th><th>Kcal</th><th>Prot</th><th>${t('Grassi')}</th><th>Carbo</th><th class="no-print"></th></tr></thead>
      <tbody>${body||`<tr><td colspan="7" class="empty">${t('Nessun alimento. Aggiungi un pasto qui sotto.')}</td></tr>`}</tbody>
      <tfoot><tr style="background:var(--paper-3);font-weight:600"><td class="l grp-tot">${t('Totale')} ${t(FASE_LAB[fase]||fase)}</td><td></td>
        <td class="num grp-tot">${nf(tot.kcal,0)}</td><td class="num">${nf(tot.proteine,1)}</td><td class="num">${nf(tot.grassi,1)}</td><td class="num">${nf(tot.zuccheri,1)}</td><td class="no-print"></td></tr></tfoot>
      </table></div>
      <div class="row-add no-print"><button class="btn" data-add="${fase}">${t('＋ Pasto')}</button></div>`;
  }
  const omsSection=omsRenderSection();
  /* periodi alimentari registrati (per il tab Analisi) */
  const periodi=A.periodi||[];
  const perRows=periodi.map((p,i)=>`<tr${periodoInCorso(p)?' class="per-riga-live"':''}><td><span class="pill">${esc(t(FASE_LAB[p.fase]||p.fase))}</span></td>
     <td>${esc(p.dal||'')}</td><td>${periodoInCorso(p)? `<span class="pill per-live">● ${t('in corso')}</span> <span class="muted">${esc(periodoDurata(p))}</span>` : esc(p.al||'')}</td><td class="num">${nf(kcalPiano(p.righe,p.ricette),0)}</td><td class="num">${(p.righe||[]).length}</td>
     <td class="no-print">${periodoInCorso(p)?`<button class="btn btn--sm btn--ember" data-perstop="${i}" title="${t('Metti la data di fine al periodo in corso')}">${ico('stop','p')}${t('Termina')}</button> `:''}<button class="btn btn--sm btn--danger" data-perdel="${i}" title="${t('elimina periodo')}">${ico('x','p')}</button></td></tr>`).join('');
  const aperto=periodoAperto();
  const perSection=`
   <div class="sec" style="margin-top:18px">${t('Periodi')} <span class="pill">${periodi.length}</span>${aperto?` <span class="pill per-live">● ${esc(t(FASE_LAB[aperto.fase]||aperto.fase))} ${t('in corso dal')} ${esc(aperto.dal)}</span>`:''}</div>
   <div class="callout callout--info no-print"><div>${t('Un periodo è il piano seguito per un certo tempo. Con <b>▶ Avvia un periodo</b> parte (da oggi o da una data passata) e resta <b>in corso</b> finché non premi <b>Termina</b>: non serve sapere prima quanto durerà. Se conosci già le date, registralo con <b>dal → al</b>. I periodi alimentano i grafici del tab <b>Analisi</b> (timeline, bilancio calorico, confronto fasi); quello in corso arriva fino a oggi. Ogni periodo salva una <b>fotografia</b> del piano: modificare il piano dopo non cambia i periodi già registrati (terminando un periodo in corso puoi aggiornarla).')}</div></div>
   <div class="tbl-wrap"><table><thead><tr><th>${t('Fase')}</th><th>${t('Dal')}</th><th>${t('Al')}</th><th>${t('kcal/giorno')}</th><th>${t('alimenti')}</th><th class="no-print"></th></tr></thead>
     <tbody>${perRows||`<tr><td colspan="6" class="empty">${t('Nessun periodo registrato.')}</td></tr>`}</tbody></table></div>
   <div class="bar no-print"><button class="btn btn--ember" id="per-start">${ico('play')}${t('Avvia un periodo…')}</button> <button class="btn" id="per-add">${t('Registra il piano attuale come periodo…')}</button> <button class="btn" onclick="showTab('analisi')">${t('Vai all\'Analisi')}</button></div>`;
  document.getElementById('panel-alimentazione').innerHTML=`
   <div class="bar no-print" style="margin-bottom:6px"><span class="bar__lab">${t('Fase del piano:')}</span>${['bulk','mant','cut'].map(f=>`<button class="btn btn--sm ${f===fase?'btn--ember':''}" data-fasesel="${f}">${t(FASE_LAB[f])}</button>`).join('')}<button class="btn btn--sm" id="ricette-btn" style="margin-left:auto" title="${t('Le ricette, comuni a tutti i profili: ingredienti, tempi, procedimento e valori sommati')}">${t('Ricette')}</button><button class="btn btn--gold btn--sm" id="dieta-pdf-btn" onclick="apriStampaDieta()" title="${t('Apri l\'anteprima per sistemare la stampa del piano della fase attiva (PDF A4 orizzontale, da dare al cliente)')}">${ico('stampa')}${t('Stampa dieta')}</button></div>
   <div class="pag pag--tre"><div class="pag__main">${faseTable(fase,A[fase])}${perSection}</div>
   <aside class="pag__side no-print" id="alim-side">${pannelloAderenza()}${pannelloPiano(fase)}</aside>
   <div class="pag__terza" id="alim-oms">${omsSection}</div></div>`;
  document.querySelectorAll('#panel-alimentazione input').forEach(inp=>inp.addEventListener('input',e=>{
    const tr=e.target.closest('tr'); const fase=tr.dataset.fase, i=+tr.dataset.i, f=e.target.dataset.f;
    let v=e.target.value; if(f==='grammi')v=v===''?'':+v;
    DOC.alimentazione[fase][i][f]=v; persist('alimentazione');
    /* non re-renderizzare mentre un modale è aperto (es. nome nuovo pasto): eviterebbe di
       ricostruire il pannello sotto la digitazione */
    clearTimeout(rerenderT); rerenderT=setTimeout(()=>{ if(document.getElementById('modal-bk').classList.contains('hidden')) ridisegnaConFuoco('panel-alimentazione', renderAlimentazione); },500);
  }));
  document.querySelectorAll('#panel-alimentazione [data-fasesel]').forEach(b=>b.onclick=()=>{ if(!DOC.dati_utente)DOC.dati_utente={}; DOC.dati_utente.faseAlim=b.dataset.fasesel; persist('corpo'); renderAlimentazione(); });
  abilitaRiordinoPasti();
  document.querySelectorAll('#panel-alimentazione .food-pick').forEach(b=>b.onclick=()=>openFoodPicker(b.dataset.fase,+b.dataset.i));
  document.querySelectorAll('#panel-alimentazione .food-det').forEach(b=>b.onclick=()=>{ const k=b.dataset.fase+':'+b.dataset.i; alimDet=(alimDet===k?null:k); renderAlimentazione(); });
  document.querySelectorAll('#panel-alimentazione [data-add]').forEach(b=>b.onclick=()=>chiediTesto(t('Nome del pasto (es. Colazione, Pranzo, Spuntino)'),'',v=>{
    const name=(v||'').trim(); if(!name)return;
    DOC.alimentazione[b.dataset.add].push({pasto:name,alimento:'',grammi:100}); persist('alimentazione'); renderAlimentazione(); }));
  document.querySelectorAll('#panel-alimentazione [data-mealadd]').forEach(b=>b.onclick=()=>{
    const meal=b.dataset.meal==='Senza pasto'?'':b.dataset.meal;
    DOC.alimentazione[b.dataset.fase].push({pasto:meal,alimento:'',grammi:100}); persist('alimentazione'); renderAlimentazione(); });
  document.querySelectorAll('#panel-alimentazione [data-mealedit]').forEach(b=>b.onclick=()=>{
    const fase=b.dataset.fase, old=b.dataset.meal;
    chiediTesto(t('Rinomina pasto'), old==='Senza pasto'?'':old, raw=>{
      const nn=String(raw==null?'':raw).trim();
      DOC.alimentazione[fase].forEach(r=>{ const cur=((r.pasto||'').trim())||'Senza pasto'; if(cur===old) r.pasto=nn; });
      persist('alimentazione'); renderAlimentazione(); }); });
  document.querySelectorAll('#panel-alimentazione [data-mealdel]').forEach(b=>b.onclick=async()=>{
    const fase=b.dataset.fase, meal=b.dataset.meal;
    if(!await conferma(t('Eliminare il pasto «')+t(meal)+t('» e tutti i suoi alimenti?')))return;
    DOC.alimentazione[fase]=DOC.alimentazione[fase].filter(r=>((((r.pasto||'').trim())||'Senza pasto')!==meal)); persist('alimentazione'); renderAlimentazione(); });
  { const pa=document.getElementById('per-add'); if(pa) pa.onclick=registraPeriodo; }
  { const ps=document.getElementById('per-start'); if(ps) ps.onclick=avviaPeriodo; }
  document.querySelectorAll('#panel-alimentazione [data-perstop]').forEach(b=>b.onclick=()=>terminaPeriodo(+b.dataset.perstop));
  { const rb=document.getElementById('ricette-btn'); if(rb) rb.onclick=ricetteModal; }
  document.querySelectorAll('#panel-alimentazione [data-aderm]').forEach(b=>b.onclick=()=>{
    const oggi=dataOggi().slice(0,7), m=aderMese||oggi, d=new Date(+m.slice(0,4), +m.slice(5,7)-1+(+b.dataset.aderm), 1), nuovo=dataLocale(d).slice(0,7);
    aderMese=nuovo>=oggi? '' : nuovo; renderAlimentazione(); });
  document.querySelectorAll('#panel-alimentazione [data-perdel]').forEach(b=>b.onclick=async()=>{
    const i=+b.dataset.perdel; const p=(DOC.alimentazione.periodi||[])[i]; if(!p) return;
    if(!await conferma(t('Eliminare il periodo')+' '+t(FASE_LAB[p.fase]||p.fase)+' '+p.dal+' → '+(p.al||t('in corso'))+'?')) return;
    DOC.alimentazione.periodi.splice(i,1); persist('alimentazione'); renderAlimentazione(); });
  document.querySelectorAll('#panel-alimentazione [data-del]').forEach(b=>b.onclick=()=>{
    const [fase,i]=b.dataset.del.split(':'); DOC.alimentazione[fase].splice(+i,1); persist('alimentazione'); renderAlimentazione(); });
}


/* ── RIORDINO PER TRASCINAMENTO (2026-11-11, al posto delle frecce ▲▼) ────────────
   Come nella scheda Pesi: si trascina dal manico ⠿. Un PASTO (la sua barra) si rilascia
   su un altro pasto e ne prende il posto, portandosi dietro tutti i suoi alimenti; un
   ALIMENTO si rilascia su un altro alimento (anche di un altro pasto, e allora cambia
   pasto) oppure sulla barra di un pasto (e va in fondo a quel pasto). Le due funzioni
   che fanno i conti sono pure, per poterle provare senza un trascinamento vero. */
function _pastoDi(r){ return ((((r&&r.pasto)||'').trim())||'Senza pasto'); }
function trascinaPasto(fase, da, a, sotto){
  const rows=DOC.alimentazione[fase]||[]; if(da===a) return false;
  const ord=[]; rows.forEach(r=>{ const m=_pastoDi(r); if(!ord.includes(m)) ord.push(m); });
  if(!ord.includes(da)||!ord.includes(a)) return false;
  const senza=ord.filter(m=>m!==da); senza.splice(senza.indexOf(a)+(sotto?1:0),0,da);
  if(senza.join('\u0001')===ord.join('\u0001')) return false;
  const out=[]; senza.forEach(m=>rows.forEach(r=>{ if(_pastoDi(r)===m) out.push(r); }));
  DOC.alimentazione[fase]=out; return true;
}
/* `a` è l'indice dell'alimento di arrivo, oppure il nome di un pasto (rilascio sulla sua barra) */
function trascinaAlimento(fase, da, a, sotto){
  const rows=DOC.alimentazione[fase]||[]; const el=rows[da]; if(!el) return false;
  if(typeof a==='string'){
    if(_pastoDi(el)===a) return false;
    el.pasto= a==='Senza pasto'? '' : a;
    rows.splice(da,1); let ult=-1; rows.forEach((r,i)=>{ if(r!==el && _pastoDi(r)===a) ult=i; });
    rows.splice(ult+1,0,el); return true;
  }
  const dest=rows[a]; if(!dest||da===a) return false;
  el.pasto=dest.pasto||'';
  rows.splice(da,1); let ins=rows.indexOf(dest)+(sotto?1:0);
  rows.splice(ins,0,el); return true;
}
let _dragAlim=null;   /* {tipo:'pasto'|'alimento', fase, chi} */
function abilitaRiordinoPasti(){
  const root=document.getElementById('panel-alimentazione'); if(!root) return;
  const pulisci=()=>{ root.querySelectorAll('.drop-t,.drop-b').forEach(x=>x.classList.remove('drop-t','drop-b')); root.querySelectorAll('.is-drag').forEach(x=>x.classList.remove('is-drag')); };
  root.querySelectorAll('tr[data-mealrow], tr[data-i][data-fase]').forEach(tr=>{
    const pasto=tr.dataset.mealrow!=null, h=tr.querySelector('.drag-h');
    if(h){ h.onmousedown=()=>{ tr.draggable=true; }; h.onmouseup=()=>{ tr.draggable=false; }; }
    tr.ondragstart=e=>{ _dragAlim= pasto? {tipo:'pasto',fase:tr.dataset.fase,chi:tr.dataset.mealrow} : {tipo:'alimento',fase:tr.dataset.fase,chi:+tr.dataset.i};
      tr.classList.add('is-drag'); try{ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain','tms'); }catch(_){} };
    tr.ondragend=()=>{ tr.draggable=false; _dragAlim=null; pulisci(); };
    const accetta=()=> _dragAlim && _dragAlim.fase===tr.dataset.fase && !(_dragAlim.tipo==='pasto' && !pasto);
    tr.ondragover=e=>{ if(!accetta()) return; e.preventDefault();
      const rc=tr.getBoundingClientRect(), sotto=(e.clientY-rc.top)>rc.height/2;
      /* un alimento rilasciato su una barra va DENTRO quel pasto: lo si mostra sempre sotto */
      const giu= (_dragAlim.tipo==='alimento' && pasto)? true : sotto;
      tr.classList.toggle('drop-b',giu); tr.classList.toggle('drop-t',!giu); };
    tr.ondragleave=()=>{ tr.classList.remove('drop-t','drop-b'); };
    tr.ondrop=e=>{ if(!accetta()) return; e.preventDefault();
      const rc=tr.getBoundingClientRect(), sotto=(e.clientY-rc.top)>rc.height/2, d=_dragAlim; _dragAlim=null;
      const fatto= d.tipo==='pasto'? trascinaPasto(d.fase, d.chi, tr.dataset.mealrow, sotto)
                 : trascinaAlimento(d.fase, d.chi, pasto? tr.dataset.mealrow : +tr.dataset.i, sotto);
      if(fatto){ alimDet=null; persist('alimentazione'); }
      renderAlimentazione(); };
  });
}
/* ── Stampa della dieta: STESSO motore a blocchi del Report (13-report.js), a schermo intero
   sopra l'app (#dieta-overlay). Un blocco fisso «intro» (titolo, fase, data), un blocco per
   ogni PASTO presente nel piano della fase attiva (trascinabile, nascondibile, con le stesse
   impostazioni dei blocchi del Report), un blocco fisso finale «totale» coi valori del giorno.
   L'ordine e le impostazioni si salvano per profilo+fase (DOC.alimentazione.stampa[fase]); i
   ritocchi a mano SOLO per il documento aperto. PDF in A4 ORIZZONTALE (297×210mm), stessa
   impaginazione dell'anteprima (repImpagina). */
const CTX_DIETA={pre:'dre', pannello:'panel-dieta', fissi:['intro','totale'], grandi:[], persist:'alimentazione',
  R:()=>DOC.alimentazione.stampa[faseAlimActive()], chiave:()=>'dieta:'+faseAlimActive(), render:()=>renderDietaCC(),
  documento(R){
    return `<div class="lat"><h4>${t('Documento')}</h4>
     <div class="muted" style="font-size:12px;margin-bottom:8px">${t('Fase')} <b>${esc(t(FASE_LAB[faseAlimActive()]||faseAlimActive()))}</b></div>
     <div class="bar" style="margin:0;gap:6px;flex-wrap:wrap"><button class="btn btn--gold" id="dre-pdf-btn" onclick="stampaDietaPDF()">${ico('scarica')}${t('Scarica PDF (A4 orizzontale)')}</button></div></div>`;
  },
  collegaDocumento(){ /* niente da collegare: il pulsante PDF basta da solo */ }};
function renderDieta(){
  repCtx=CTX_DIETA;
  const fase=faseAlimActive(); const rows=(DOC.alimentazione&&DOC.alimentazione[fase])||[];
  DOC.alimentazione.stampa=DOC.alimentazione.stampa||{};
  const R=DOC.alimentazione.stampa[fase]=Object.assign({ordine:[],blocchi:{}}, DOC.alimentazione.stampa[fase]||{});
  const meals=[]; rows.forEach(r=>{ const p=((r.pasto||'').trim())||t('Senza pasto'); if(!meals.includes(p)) meals.push(p); });
  meals.forEach(m=>{ if(R[m]===undefined) R[m]=true; });
  let ordine=(Array.isArray(R.ordine)?R.ordine:[]).filter(m=>meals.indexOf(m)>=0);
  meals.forEach(m=>{ if(ordine.indexOf(m)<0) ordine.push(m); });
  R.ordine=ordine;
  repNomi={intro:t('Intestazione'), totale:t('Totale giornaliero')}; ordine.forEach(m=>{ repNomi[m]=m; });
  const testa=`<thead><tr><th class="l">${t('Alimento')}</th><th>g</th><th>Kcal</th><th>Prot</th><th>${t('Grassi')}</th><th>Carbo</th><th>${t('Fibre')}</th></tr></thead>`;
  const colonneDieta='<colgroup><col style="width:40%">'+'<col style="width:10%">'.repeat(6)+'</colgroup>';
  const B={};
  ordine.forEach(m=>{
    const idxs=rows.map((r,i)=>i).filter(i=>((((rows[i].pasto||'').trim())||t('Senza pasto'))===m));
    let mk=0; idxs.forEach(i=>mk+=foodVal(rows[i].alimento,rows[i].grammi,'kcal'));
    const corpo=idxs.map(i=>{ const r=rows[i];
      return `<tr><td class="l">${r.alimento?esc(r.alimento):'—'}</td>`+
        `<td class="num" style="font-weight:700;font-size:11px;color:#5b3a14">${nf(r.grammi,0)}</td>`+
        `<td class="num">${nf(foodVal(r.alimento,r.grammi,'kcal'),0)}</td>`+
        `<td class="num">${nf(foodVal(r.alimento,r.grammi,'proteine'),1)}</td>`+
        `<td class="num">${nf(foodVal(r.alimento,r.grammi,'grassi'),1)}</td>`+
        `<td class="num">${nf(foodVal(r.alimento,r.grammi,'zuccheri'),1)}</td>`+
        `<td class="num">${nf(foodVal(r.alimento,r.grammi,'fibre'),1)}</td></tr>`; }).join('');
    /* sec--pasto / tab-pasto (sugli elementi: l'impaginazione spezza i blocchi in unità): barra del pasto bassa e colonne di larghezza fissa, uguali in tutti i pasti,
       cosi' grammi e valori stanno incolonnati da un pasto all'altro (richiesta di Marco) */
    B[m]=`<div class="rep-sec"><div class="sec sec--pasto">${esc(m)} <span class="pill" style="margin-left:auto">${nf(mk,0)} kcal</span></div>
      <div class="tbl-wrap"><table class="tab-pasto">${colonneDieta}${testa}<tbody>${corpo||`<tr><td colspan="7" class="empty">${t('Nessun alimento.')}</td></tr>`}</tbody></table></div></div>`;
  });
  const tot=faseTot(rows);
  B.totale=`<div class="rep-sec rep-piede"><div class="sec">${t('Totale giornaliero')}</div>
    <div class="cards">
      <div class="card k--ember"><div class="card__k">Kcal</div><div class="card__v">${nf(tot.kcal,0)}</div></div>
      <div class="card"><div class="card__k">${t('Proteine')}</div><div class="card__v">${nf(tot.proteine,1)}<small> g</small></div></div>
      <div class="card"><div class="card__k">${t('Grassi')}</div><div class="card__v">${nf(tot.grassi,1)}<small> g</small></div></div>
      <div class="card"><div class="card__k">Carbo</div><div class="card__v">${nf(tot.zuccheri,1)}<small> g</small></div></div>
      <div class="card"><div class="card__k">${t('Fibre')}</div><div class="card__v">${nf(tot.fibre,1)}<small> g</small></div></div>
    </div></div>`;
  B.intro=`<div class="rep-sec rep-copertina">
    <div><h1 style="font-size:20px;color:var(--ember-2);margin:0">${t('Piano alimentare —')} ${esc(profNome()||'')}</h1>
      <div class="muted mono" style="font-size:12px">${t('Fase')} ${esc(t(FASE_LAB[fase]||fase))} · ${esc(new Date().toLocaleDateString(LANG==='en'?'en-GB':'it-IT'))}</div></div>
    <div style="text-align:right;font-family:var(--font-disp);color:var(--gold-2);font-size:13px;white-space:nowrap">✦ Training Monitor System</div></div>`;
  repGenerati={};
  const visibili=['intro'].concat(ordine.filter(m=>R[m]!==false && B[m]),['totale']);
  const sorgente=visibili.map(k=>repBloccoHTML(R,k,B[k])).join('');
  if(repSel.blocco && visibili.indexOf(repSel.blocco)<0) repSel={blocco:null, el:null};
  if(repInModifica && visibili.indexOf(repInModifica)<0) repInModifica=null;
  document.getElementById('dieta-ov-tit').textContent=t('Stampa dieta')+' · '+esc(t(FASE_LAB[fase]||fase));
  document.getElementById(repCtx.pannello).innerHTML=`<div class="pag pag--report">
     <div class="pag__main" id="${ID('anteprima')}"><div class="rep-pagine orizzontale" id="${ID('pagine')}"></div></div>
     <aside class="pag__side no-print" id="${ID('strumenti')}">${repStrumenti(R, ordine, B)}</aside></div>
   <div class="rep-doc" id="${ID('sorgente')}" hidden>${sorgente}</div>`;
  repUltimo={ordine, B};
  repImpaginaAnteprima();
  repCollega(R);
}
const renderDietaCC=conColonne('dieta', renderDieta);
function apriStampaDieta(){
  const fase=faseAlimActive(); const rows=(DOC.alimentazione&&DOC.alimentazione[fase])||[];
  if(!rows.some(r=>r&&r.alimento&&String(r.alimento).trim())){ avviso(t('Il piano della fase attiva è vuoto: niente da stampare.')); return; }
  repSel={blocco:null, el:null}; repInModifica=null;
  document.getElementById('dieta-overlay').classList.remove('hidden');
  /* se qualcosa va storto non deve restare uno schermo vuoto senza spiegazione: si richiude e
     si avvisa (resta nel registro errori interni, 5 click sulla scritta «TMS») */
  try{ renderDietaCC(); }
  catch(e){ logErrore('apriStampaDieta', e); chiudiStampaDieta(); avviso(t('Non riesco ad aprire l\'anteprima della dieta.')+' '+e.message); }
}
function chiudiStampaDieta(){
  document.getElementById('dieta-overlay').classList.add('hidden');
  document.getElementById('panel-dieta').innerHTML='';
}
async function stampaDietaPDF(){
  if(typeof html2canvas!=='function'){ avviso(t('Generatore PDF non disponibile in questa copia.')); return; }
  const btn=document.getElementById('dre-pdf-btn'); const blab=btn?btn.innerHTML:''; if(btn){ btn.innerHTML=t('Genero PDF…'); btn.disabled=true; }
  const stage=document.createElement('div'); stage.id='pdf-stage'; stage.className='land';
  try{
    if(repInModifica){ repBloccoDaFogli(repInModifica); repInModifica=null; renderDietaCC(); }
    const src=document.getElementById(ID('sorgente'));
    if(!src){ avviso(t('Apri prima la Stampa dieta.')); return; }
    document.body.appendChild(stage);
    const units=buildReportUnits(document, src);
    const probe=document.createElement('div'); probe.style.cssText='position:absolute;visibility:hidden;height:100mm'; stage.appendChild(probe);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const pxPerMm=(probe.getBoundingClientRect().height||377.95)/100; stage.removeChild(probe);
    const pages=repImpagina(stage, units, pxPerMm, 210);  /* 210 = altezza A4 orizzontale */
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const images=[];
    for(const p of pages){
      const canvas=await html2canvas(p,{scale:2,backgroundColor:'#ffffff',logging:false,useCORS:true,
        onclone:(doc)=>{ try{ doc.documentElement.setAttribute('data-theme','giorno'); }catch(e){} }});
      const url=canvas.toDataURL('image/jpeg',0.92);
      images.push({bytes:dataUrlToBytes(url), w:canvas.width, h:canvas.height});
    }
    const pdf=imagesToPdf(images, true);  /* true = A4 orizzontale */
    const nome=String(profNome()||'TMS').replace(/[^\w\-]+/g,'_')||'TMS';
    const blob=new Blob([pdf],{type:'application/pdf'}); const u=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=u; a.download='Dieta_'+nome+'.pdf'; document.body.appendChild(a); a.click();
    setTimeout(()=>{ try{ URL.revokeObjectURL(u); }catch(e){} a.remove(); }, 1500);
  }catch(e){ avviso(t('Errore nella generazione del PDF:')+' '+e.message); }
  finally{ try{ if(stage.parentNode) document.body.removeChild(stage); }catch(e){} if(btn){ btn.innerHTML=blab; btn.disabled=false; } }
}
/* ── PERIODI IN CORSO (Marco, 15/11/2026) ─────────────────────────────────────────
   Un periodo si può AVVIARE senza sapere quando finirà e TERMINARE più avanti (fra un mese,
   due…). In corso = «al» vuoto: nei grafici dell'Analisi arriva fino a oggi (periodoFine).
   Uno solo alla volta: avviandone un altro, quello in corso si chiude il giorno prima.
   La fotografia del piano si prende all'avvio; terminando si può aggiornarla col piano di
   oggi, se nel frattempo è cambiato. Date in ora LOCALE (toISOString darebbe il giorno UTC). */
function dataLocale(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function dataOggi(){ return dataLocale(new Date()); }
function giornoPrima(s){ const d=new Date(String(s)+'T12:00:00'); d.setDate(d.getDate()-1); return dataLocale(d); }
function periodoInCorso(p){ return !!p && !p.al; }
function periodoFine(p){ return (p&&p.al) || dataOggi(); }
function periodoAperto(){ return (((DOC.alimentazione||{}).periodi)||[]).find(periodoInCorso)||null; }
/* da quanto è in corso: «da oggi», «1 giorno», «37 giorni» */
function periodoDurata(p){ const g=Math.max(0, Math.round((new Date(dataOggi()+'T12:00:00')-new Date(String(p.dal)+'T12:00:00'))/86400000));
  return g===0? t('da oggi') : g+' '+(g===1? t('giorno') : t('giorni')); }
/* fotografia del piano di una fase: righe con alimento e grammi, più la copia delle ricette usate */
function fotografiaPiano(fase){
  const righe=((DOC.alimentazione||{})[fase]||[]).filter(r=>r&&r.alimento&&String(r.alimento).trim())
    .map(r=>({alimento:String(r.alimento).trim(), grammi:+r.grammi||0}));
  return {righe:righe, ricette:ricetteUsateIn(righe)};
}
function opzioniFase(sel){ return ['bulk','mant','cut'].map(f=>`<option value="${f}"${f===sel?' selected':''}>${t(FASE_LAB[f]||f)}</option>`).join(''); }

/* ▶ avvia un periodo IN CORSO dalla data scelta (oggi o passata) */
function avviaPeriodo(){
  const faseAtt=(DOC.dati_utente&&DOC.dati_utente.faseAlim)||'bulk', oggi=dataOggi(), ap=periodoAperto();
  modal(`<h3>${t('Avvia un periodo')}</h3>
   <div class="callout callout--info"><div>${t('Il periodo parte e resta <b>in corso</b> finché non premi <b>Termina</b>: non serve sapere oggi quanto durerà. All’avvio si salva una <b>fotografia</b> del piano della fase scelta; nei grafici del tab <b>Analisi</b> il periodo arriva fino a oggi.')}</div></div>
   ${ap?`<div class="callout">${ico('attenzione','avv')}<div>${t('C’è già un periodo in corso:')} <b>${esc(t(FASE_LAB[ap.fase]||ap.fase))}</b> ${t('dal')} ${esc(ap.dal)}. ${t('Avviando il nuovo, quello si chiude il giorno prima della data di inizio.')}</div></div>`:''}
   <div class="row">
    <div class="field"><label>${t('Fase')}</label><select id="per-fase">${opzioniFase(faseAtt)}</select></div>
    <div class="field"><label>${t('Dal')}</label><input type="date" id="per-dal" value="${oggi}" max="${oggi}"></div></div>
   <div class="modal__actions"><button class="btn" onclick="closeModal()">${t('Annulla')}</button><button class="btn btn--ember" id="per-avvia">${ico('play')}${t('Avvia')}</button></div>`);
  document.getElementById('per-avvia').onclick=async()=>{
    const fase=document.getElementById('per-fase').value, dal=document.getElementById('per-dal').value;
    if(!dal){ avviso(t('Serve la data di inizio.')); return; }
    if(dal>dataOggi()){ avviso(t('La data di inizio non può essere nel futuro: se conosci già le date, usa «Registra il piano attuale come periodo…».')); return; }
    const foto=fotografiaPiano(fase);
    if(!foto.righe.length){ avviso(t('Il piano della fase')+' '+t(FASE_LAB[fase]||fase)+' '+t('è vuoto: niente da registrare.')); return; }
    if(!Array.isArray(DOC.alimentazione.periodi)) DOC.alimentazione.periodi=[];
    const P=DOC.alimentazione.periodi, aperto=periodoAperto();
    if(aperto && giornoPrima(dal)<aperto.dal){ avviso(t('Il periodo in corso è iniziato il')+' '+aperto.dal+': '+t('scegli una data di inizio successiva, oppure terminalo o eliminalo prima.')); return; }
    /* periodi chiusi che finiscono dopo l'inizio del nuovo: vale l'ultimo, ma lo si dice */
    const overlap=P.filter(p=>p!==aperto && periodoFine(p)>=dal);
    if(overlap.length && !await conferma(t('Le date si sovrappongono a')+' '+overlap.length+' '+t('periodo/i già registrati (nelle settimane in comune vale l\'ultimo registrato). Continuo?'))) return;
    if(aperto) aperto.al=giornoPrima(dal);
    P.push(Object.assign({id:Date.now().toString(36), fase:fase, dal:dal, al:'', righe:foto.righe}, foto.ricette.length?{ricette:foto.ricette}:{}));
    P.sort((a,b)=>a.dal<b.dal?-1:1);
    persist('alimentazione'); closeModal(); renderAlimentazione();
    avviso(t('Periodo avviato:')+' '+t(FASE_LAB[fase]||fase)+' '+t('dal')+' '+dal+'. '+t('Quando finisce, premi Termina nella tabella dei periodi.')+(aperto? ' '+t('Il periodo precedente è stato chiuso il')+' '+aperto.al+'.' : ''));
  };
}

/* ⏹ termina il periodo in corso: data di fine (oggi o passata) e, se il piano è cambiato, fotografia aggiornata */
function terminaPeriodo(i){
  const p=((DOC.alimentazione||{}).periodi||[])[i]; if(!periodoInCorso(p)) return;
  const oggi=dataOggi(), foto=fotografiaPiano(p.fase);
  const cambiato=foto.righe.length>0 && JSON.stringify(foto.righe)!==JSON.stringify(p.righe||[]);
  modal(`<h3>${t('Termina il periodo')}</h3>
   <div class="muted" style="margin-bottom:8px"><b>${esc(t(FASE_LAB[p.fase]||p.fase))}</b> ${t('dal')} ${esc(p.dal)} · ${t('in corso')} · ${esc(periodoDurata(p))}</div>
   <div class="row"><div class="field"><label>${t('Al')}</label><input type="date" id="per-al" value="${oggi}" min="${esc(p.dal)}" max="${oggi}"></div></div>
   ${cambiato?`<label class="optchk"><input type="checkbox" id="per-foto"> <span>${t('Il piano di questa fase è cambiato dall’avvio: aggiorna la fotografia del periodo con il piano di oggi')} (${nf(kcalPiano(p.righe,p.ricette),0)} → ${nf(kcalPiano(foto.righe,foto.ricette),0)} ${t('kcal/giorno')})</span></label>`:''}
   <div class="modal__actions"><button class="btn" onclick="closeModal()">${t('Annulla')}</button><button class="btn btn--ember" id="per-stop">${ico('stop','p')}${t('Termina')}</button></div>`);
  document.getElementById('per-stop').onclick=()=>{
    const al=document.getElementById('per-al').value;
    if(!al){ avviso(t('Serve la data di fine.')); return; }
    if(al<p.dal){ avviso(t('La data di inizio è dopo quella di fine.')); return; }
    if(al>dataOggi()){ avviso(t('La data di fine non può essere nel futuro.')); return; }
    p.al=al;
    const aggiorna=document.getElementById('per-foto');
    if(cambiato && aggiorna && aggiorna.checked){ p.righe=foto.righe; if(foto.ricette.length) p.ricette=foto.ricette; else delete p.ricette; }
    persist('alimentazione'); closeModal(); renderAlimentazione();
    avviso(t('Periodo terminato:')+' '+t(FASE_LAB[p.fase]||p.fase)+' '+p.dal+' → '+p.al+'.');
  };
}

/* registra il piano della fase scelta come PERIODO datato (fotografia per il tab Analisi) */
function registraPeriodo(){
  const faseAtt=(DOC.dati_utente&&DOC.dati_utente.faseAlim)||'bulk';
  const fmt=dataLocale;
  const oggi=new Date(), fa=new Date(); fa.setDate(fa.getDate()-28);
  modal(`<h3>${t('Registra periodo alimentare')}</h3>
   <div class="callout callout--info"><div>${t('Salva una <b>fotografia</b> del piano della fase scelta con le date in cui lo segui. I periodi alimentano i grafici del tab <b>Analisi</b>.')}</div></div>
   <div class="row">
    <div class="field"><label>${t('Fase')}</label><select id="per-fase">${['bulk','mant','cut'].map(f=>`<option value="${f}"${f===faseAtt?' selected':''}>${t(FASE_LAB[f]||f)}</option>`).join('')}</select></div>
    <div class="field"><label>${t('Dal')}</label><input type="date" id="per-dal" value="${fmt(fa)}"></div>
    <div class="field"><label>${t('Al')}</label><input type="date" id="per-al" value="${fmt(oggi)}"></div></div>
   <div class="modal__actions"><button class="btn" onclick="closeModal()">${t('Annulla')}</button><button class="btn btn--ember" id="per-ok">${t('Registra')}</button></div>`);
  document.getElementById('per-ok').onclick=async()=>{
    const fase=document.getElementById('per-fase').value;
    const dal=document.getElementById('per-dal').value, al=document.getElementById('per-al').value;
    if(!dal||!al){ avviso(t('Servono entrambe le date.')); return; }
    if(dal>al){ avviso(t('La data di inizio è dopo quella di fine.')); return; }
    const righe=((DOC.alimentazione||{})[fase]||[]).filter(r=>r&&r.alimento&&String(r.alimento).trim())
      .map(r=>({alimento:String(r.alimento).trim(), grammi:+r.grammi||0}));
    if(!righe.length){ avviso(t('Il piano della fase')+' '+t(FASE_LAB[fase]||fase)+' '+t('è vuoto: niente da registrare.')); return; }
    if(!Array.isArray(DOC.alimentazione.periodi)) DOC.alimentazione.periodi=[];
    /* safe check: sovrapposizione date con periodi già registrati */
    const overlap=DOC.alimentazione.periodi.filter(p=>!(al<p.dal || dal>periodoFine(p)));   /* in corso = fino a oggi */
    if(overlap.length && !await conferma(t('Le date si sovrappongono a')+' '+overlap.length+' '+t('periodo/i già registrati (nelle settimane in comune vale l\'ultimo registrato). Continuo?'))) return;
    const ricP=ricetteUsateIn(righe);   /* le ricette personali usate: copia, così il periodo resta una fotografia */
    DOC.alimentazione.periodi.push(Object.assign({id:Date.now().toString(36), fase:fase, dal:dal, al:al, righe:righe}, ricP.length?{ricette:ricP}:{}));
    DOC.alimentazione.periodi.sort((a,b)=>a.dal<b.dal?-1:1);
    persist('alimentazione'); closeModal(); renderAlimentazione();
    avviso(t('Periodo registrato:')+' '+t(FASE_LAB[fase]||fase)+' '+dal+' → '+al+' ('+righe.length+' '+t('alimenti,')+' '+nf(kcalPiano(righe),0)+' '+t('kcal/giorno).'));
  };
}
