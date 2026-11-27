/* ════════════════ RENDER: CORPO ════════════════ */
function bodyCalc(u){
  const alt=+u.altezza||0, peso=+u.peso||0, mg=+u.massa_grassa||0;
  const bmi=alt>0? peso/Math.pow(alt/100,2):0;
  const metab=(+u.metab_basale||0)*(+u.livello_attivita||0);
  const grassaKg=peso*mg, magraKg=peso-grassaKg;
  return {bmi,metab,grassaKg,magraKg};
}
function etaOf(u){ if(u&&u.nascita){ const d=new Date(u.nascita); if(!isNaN(d)){ const t=new Date(); let a=t.getFullYear()-d.getFullYear(); const m=t.getMonth()-d.getMonth(); if(m<0||(m===0&&t.getDate()<d.getDate()))a--; return a>=0?a:0; } } return +(u&&u.eta)||0; }
/* composizione corporea in una barra: quanta parte del peso è massa grassa, muscolare, ossea, altro */
function composizioneLat(u,c){
  const peso=+u.peso||0; if(!peso) return '';
  const gr=c.grassaKg||0, mu=+u.massa_muscolare||0, os=+u.massa_ossea||0, al=Math.max(0,peso-gr-mu-os);
  const P=x=>(x/peso*100).toFixed(1);
  return `<div class="lat"><h4>${t('Composizione')} <span class="muted">${nf(peso,1)} kg</span>${spiegaBtn('composizione')}</h4>
    <div class="lat-barra"><span style="width:${P(mu)}%;background:var(--orange)"></span><span style="width:${P(gr)}%;background:var(--danger)"></span><span style="width:${P(os)}%;background:var(--ink-4)"></span><span style="width:${P(al)}%;background:var(--paper-3)"></span></div>
    <div class="lat-num"><span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--orange);margin-right:5px"></i>${t('Massa muscolare')}</span><span><b>${nf(mu,1)} kg</b> · ${nf(mu/peso*100,0)}%</span></div>
    <div class="lat-num"><span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--danger);margin-right:5px"></i>${t('Massa grassa')}</span><span><b>${nf(gr,1)} kg</b> · ${nf(gr/peso*100,1)}%</span></div>
    <div class="lat-num"><span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--ink-4);margin-right:5px"></i>${t('Massa ossea')}</span><span><b>${nf(os,1)} kg</b></span></div>
    ${(DOC.storico_io||[]).length>1?(()=>{ const io=DOC.storico_io, a=io[0], b=io[io.length-1], d=(+b.peso||0)-(+a.peso||0);
      return `<div class="lat-num" style="border-top:1px solid var(--border);margin-top:6px;padding-top:6px"><span>${t('Dalla prima misura')} <span class="muted">(${esc(schedaLabel(a.scheda))})</span></span><b>${d>=0?'+':'−'}${nf(Math.abs(d),1)} kg</b></div>`; })():''}</div>`;
}
function renderCorpo(){
  const u=DOC.dati_utente; const c=bodyCalc(u), vista=corpoVista();
  const io=DOC.storico_io;
  const lbl=io.map(r=>schedaLabel(r.scheda));
  const wSeries=[{name:t('Peso'),color:'var(--orange-b)',data:io.map((r,i)=>({x:lbl[i],y:+r.peso}))}];
  const bmiSeries=[{name:'BMI',color:'var(--violet)',data:io.map((r,i)=>({x:lbl[i],y:+r.bmi}))}];
  const massSeries=[
    {name:t('Massa magra'),color:'var(--ok)',data:io.map((r,i)=>({x:lbl[i],y:+r.massa_magra}))},
    {name:t('Massa musc.'),color:'var(--orange)',data:io.map((r,i)=>({x:lbl[i],y:+r.massa_muscolare}))}];
  /* campo compatto (etichetta sopra, casella e unità affiancate sotto): in griglia 2x per riga
     nella colonna stretta, così i 7 campi stanno in 4 righe invece di 7 (2026-11-13, richiesta
     di Marco: più respiro ai grafici, dati corporei compatti e in orizzontale) */
  const bil=corpoBilanciaAttiva(), blocco=!!bil && corpoSblocco!==activeProfile;
  const F=(k,lab,step,suf)=>`<div class="field corpo-campo"><label>${t(lab)}</label><div class="corpo-campo__in"><input class="cell-in" type="number" step="${step||'any'}" data-u="${k}" value="${u[k]??''}"${blocco&&CORPO_DA_BILANCIA.includes(k)?` disabled title="${esc(t('Arriva dalla bilancia'))}"`:''}><span class="muted">${suf?t(suf):''}</span></div></div>`;
  document.getElementById('panel-corpo').innerHTML=`
   ${statusBanner(DOC.storico_io,'Storico misure')}
   <div class="cards">
     <div class="card k--ember"><div class="card__k">${t('Peso')}</div><div class="card__v">${nf(u.peso,1)}<small> kg</small></div></div>
     <div class="card"><div class="card__k">BMI</div><div class="card__v">${nf(c.bmi,1)}</div><div class="card__sub">${!c.bmi?'':c.bmi<18.5?t('sottopeso'):c.bmi<25?t('normopeso'):c.bmi<30?t('sovrappeso'):t('obesità')}</div></div>
     <div class="card k--ok"><div class="card__k">${t('Massa magra')}</div><div class="card__v">${nf(c.magraKg,1)}<small> kg</small></div></div>
     <div class="card k--danger"><div class="card__k">${t('Massa grassa')}</div><div class="card__v">${nf(c.grassaKg,1)}<small> kg</small></div><div class="card__sub">${nf((u.massa_grassa||0)*100,1)}%</div></div>
     <div class="card k--violet"><div class="card__k">${t('Fabbisogno')}</div><div class="card__v">${nf(c.metab,0)}<small> kcal</small></div><div class="card__sub">${t('basale·PAL')}</div></div>
   </div>
   <div class="pag pag--corpo"><div class="pag__main">
       <div class="sec">${t('Dati corporei')}${bil?(blocco?`<button class="btn btn--sm no-print corpo-bil-btn" id="btn-sblocca-io">${ico('matita')}${t('Modifica a mano')}</button>`
                      :`<button class="btn btn--sm no-print corpo-bil-btn" id="btn-blocca-io">${ico('lucchetto')}${t('Usa i dati della bilancia')}</button>`):''}</div>
       <div class="corpo-form">
         ${F('peso','Peso','0.1','kg')}${F('massa_grassa','Massa grassa','0.001','frazione (es. 0.145)')}
         ${F('massa_muscolare','Massa muscolare','0.1','kg')}${F('massa_ossea','Massa ossea','0.1','kg')}
         ${F('metab_basale','Metabolismo basale','1','kcal')}${F('livello_attivita','Livello attività (PAL)','0.05','1.2–2.5')}
         ${F('grasso_viscerale','Grasso viscerale','0.1','indice')}${F('acqua','Acqua','0.1','%')}
       </div>
       ${bil?`<div class="corpo-bil muted">${ico(blocco?'lucchetto':'matita','p')} ${blocco
         ? t('I valori arrivano dalla bilancia (ultima pesata:')+' '+esc(giornoPesata(bil.data))+(bil.ora?' '+esc(bil.ora.slice(0,5)):'')+t(') e la media di ogni settimana va da sola nello Storico misure. Il livello di attività resta da scegliere qui.')
         : t('Campi aperti a mano: quello che scrivi resta finché non arriva la prossima pesata.')}</div>`:''}
       <div class="bar no-print corpo-azioni">
         <div class="spacer"></div>
         <button class="btn btn--ember btn--sm" id="btn-save-io"${blocco?` disabled title="${esc(t('Con la bilancia lo Storico misure si aggiorna da solo'))}"`:''}>${ico('salva')}${t('Salva misure nello Storico')}</button>
         <button class="btn btn--danger btn--sm" id="btn-undo-io"${blocco?` disabled title="${esc(t('Con la bilancia lo Storico misure si aggiorna da solo'))}"`:''}>${ico('annulla')}${t('Annulla ultimo')}</button>
       </div>
       <div class="muted" style="font-size:11px;margin-top:6px">${t('Altezza, data di nascita, sesso e nome sono nel tab <b>Profilo</b> (dati invariati).')}</div>
   <div class="callout callout--info no-print" style="margin-top:8px"><div>${t('Lo storico completo delle misure (')}${io.length}${t(' rilevazioni) è nella sezione «Misure», che si apre dal tab Profilo.')}</div></div>
   <div id="pesate-box">${htmlPesate()}</div>
   <div id="foto-box"></div>
     </div>
     <aside class="pag__side">
      ${htmlCorpoVista(vista)}
      <div class="corpo-graf"${vista==='recupero'?' hidden':''}>
       <div class="chart-grid chart-grid--corpo">
         ${composizioneLat(u,c)}
         <div class="chart-box"><h4>${t('Peso')}${spiegaBtn('peso')}</h4>${lineChart(wSeries,{labels:lbl,h:130})}</div>
         <div class="chart-box"><h4>BMI${spiegaBtn('bmi')}</h4>${lineChart(bmiSeries,{labels:lbl,h:130})}</div>
         <div class="chart-box"><h4>${t('Massa magra / muscolare')}${spiegaBtn('massa')}</h4>${lineChart(massSeries,{labels:lbl,h:130})}</div>
       </div>
       ${tipoCorpoLat(u)}
      </div>
      <div id="recupero-box"${vista==='recupero'?'':' hidden'}>${htmlRecupero()}</div>
     </aside>
   </div>`;
  document.querySelectorAll('#panel-corpo [data-u]').forEach(inp=>inp.addEventListener('input',e=>{
    let v=e.target.value===''?'':+e.target.value;
    /* la massa grassa si salva come frazione (0,145): chi scrive «14.5» intende il 14,5 % */
    if(e.target.dataset.u==='massa_grassa' && v!=='' && v>1) v=v/100;
    /* scritto a mano = una misura: si salva (via il valore calcolato dalla bilancia attaccato in memoria, se c'era) */
    delete DOC.dati_utente[e.target.dataset.u]; DOC.dati_utente[e.target.dataset.u]=v; persist('corpo');
    clearTimeout(rerenderT); rerenderT=setTimeout(()=>ridisegnaConFuoco('panel-corpo', renderCorpo),600);
  }));
  legaPesate();   /* 🗑 sulle pesate della bilancia (09c-pesate.js) */
  legaRecupero(); /* sonno e dati del giorno dal bracciale (09e-recupero.js) */
  legaCorpoVista();
  document.getElementById('btn-save-io').onclick=saveIoModal;
  document.getElementById('btn-undo-io').onclick=async()=>{ if(!io.length){avviso(t('Vuoto.'));return;}
    if(!await conferma(t('Elimino l\'ultima misura salvata?')))return; DOC.storico_io.pop(); persist('corpo'); renderCorpo(); };
  const sb=document.getElementById('btn-sblocca-io'); if(sb) sb.onclick=()=>{ corpoSblocco=activeProfile; ridisegnaConFuoco('panel-corpo', renderCorpo); };
  const rb=document.getElementById('btn-blocca-io'); if(rb) rb.onclick=()=>{ corpoSblocco='';
    const p=corpoBilanciaAttiva();
    if(p){ applicaUltimaPesata(p, DOC.dati_utente); CORPO_COMPOSIZIONE.forEach(k=>{ delete DOC.dati_utente[k]; }); corpoProfiloAttacca(); persist('corpo'); }
    ridisegnaConFuoco('panel-corpo', renderCorpo); };
  renderFotoSezione();  /* sezione 📸 Foto progressi (async per le immagini; sola lettura del disco) */
  updateStatusDots();
}
/* ── DATI CORPOREI DALLA BILANCIA (27/11/2026, Marco: «la sezione dati corporei viene "bloccata" se connessa una
   bilancia, dato che i dati si prendono da lì») ──
   Se dal telefono collegato è arrivata una pesata negli ultimi CORPO_BIL_GIORNI giorni, i campi che la bilancia porta
   (peso, grasso, muscolo, ossa, basale, viscerale, acqua) sono in sola lettura: li scrive l'ultima pesata
   (applicaUltimaPesata, 09c-pesate.js) e lo Storico misure prende da solo la media di ogni settimana, quindi «Salva
   misure» e «Annulla ultimo» restano spenti. Il livello di attività (PAL) resta libero: la bilancia non lo misura.
   «Modifica a mano» apre i campi di quel profilo finché l'app resta aperta (un valore da correggere, una misura presa altrove);
   «Usa i dati della bilancia» li richiude e rimette i valori dell'ultima pesata. Una bilancia ferma da più di due
   mesi non blocca più niente. */
const CORPO_BIL_GIORNI=60;
const CORPO_DA_BILANCIA=['peso','massa_grassa','massa_muscolare','massa_ossea','metab_basale','grasso_viscerale','acqua'];
let corpoSblocco='';   /* slug del profilo coi campi aperti a mano (non si salva: riaprendo l'app si riparte bloccati) */
/* con la bilancia attiva (e i campi non aperti a mano) la composizione del profilo è quella dell'ULTIMA pesata che la porta,
   calcolata dalle sue impedenze: si attacca in memoria (non enumerabile), così non si salva una copia di un calcolo */
const CORPO_COMPOSIZIONE=['massa_grassa','massa_muscolare','massa_ossea','metab_basale','grasso_viscerale','acqua'];
function corpoProfiloAttacca(){
  const u=DOC.dati_utente; if(!u || !corpoBilanciaAttiva() || corpoSblocco===activeProfile) return;
  pesateAttacca(DOC.pesate, u);
  const l=(DOC.pesate||[]).filter(p=>p && p.grasso!=null).sort(ordinePesate), p=l[l.length-1]; if(!p) return;
  const v={massa_grassa:+(p.grasso/100).toFixed(4), massa_muscolare:p.muscolo, massa_ossea:p.ossa,
    metab_basale:p.bmr!=null? Math.round(p.bmr) : undefined, grasso_viscerale:p.visc, acqua:p.acqua};
  CORPO_COMPOSIZIONE.forEach(k=>{ if(v[k]!=null) Object.defineProperty(u, k, {value:v[k], enumerable:false, writable:true, configurable:true}); }); }
function corpoBilanciaAttiva(){
  const l=DOC.pesate||[]; if(!l.length) return null;
  const p=l.slice().sort(ordinePesate).pop(), giorni=(Date.now()-new Date(p.data+'T12:00:00').getTime())/86400000;
  return giorni<=CORPO_BIL_GIORNI? p : null; }
/* ── «Misure | Recupero» in cima alla colonna di destra (26/11/2026, scelta di Marco) ──
   La colonna mostra o composizione e grafici delle misure, o il recupero dal bracciale (09e-recupero.js).
   La scelta si ricorda PER PROFILO in localStorage ('tms-corpo-vista' = {slug:'recupero'}; senza voce vale
   «Misure») e si rilegge ogni volta: niente copie in memoria, cambiando profilo vale quella del profilo
   nuovo. Il titolo fermo della colonna segue la vista (TITOLI_PAG in 04-modal.js). */
const CORPO_VISTA_KEY='tms-corpo-vista';
function corpoVisteSalvate(){ try{ const m=JSON.parse(localStorage.getItem(CORPO_VISTA_KEY)||'{}'); return (m&&typeof m==='object'&&!Array.isArray(m))? m : {}; }catch(e){ return {}; } }
function corpoVista(){ return corpoVisteSalvate()[activeProfile]==='recupero'? 'recupero' : 'misure'; }
function corpoVistaImposta(v){ const m=corpoVisteSalvate();
  if(v==='recupero') m[activeProfile]='recupero'; else delete m[activeProfile];
  try{ localStorage.setItem(CORPO_VISTA_KEY, JSON.stringify(m)); }catch(e){} }
function htmlCorpoVista(v){
  const B=(k,ic,lab)=>`<button class="btn btn--sm${v===k?' is-on':''}" data-corpo-vista="${k}" aria-pressed="${v===k}">${ico(ic)}${t(lab)}</button>`;
  return `<div class="corpo-vista no-print"><span class="gruppo" role="group" aria-label="${esc(t('Cosa mostra la colonna'))}">${B('misure','corpo','Misure')}${B('recupero','luna','Recupero')}</span></div>`;
}
function mostraCorpoVista(v){
  const p=document.getElementById('panel-corpo'); if(!p) return;
  const g=p.querySelector('.corpo-graf'), r=document.getElementById('recupero-box'), side=p.querySelector('.pag__side');
  if(g) g.hidden=(v==='recupero'); if(r) r.hidden=(v!=='recupero');
  p.querySelectorAll('[data-corpo-vista]').forEach(b=>{ const on=b.dataset.corpoVista===v; b.classList.toggle('is-on',on); b.setAttribute('aria-pressed',String(on)); });
  if(side) side.scrollTop=0;
  if(typeof adattaPag==='function') adattaPag();   /* il titolo fermo della colonna cambia con la vista */
}
function legaCorpoVista(){
  document.querySelectorAll('#panel-corpo [data-corpo-vista]').forEach(b=>{ b.onclick=()=>{
    const v=b.dataset.corpoVista==='recupero'? 'recupero' : 'misure'; if(v===corpoVista()) return;
    corpoVistaImposta(v); mostraCorpoVista(v); }; });
}
function saveIoModal(){
  const w=isoWeek(new Date()); const u=DOC.dati_utente; const c=bodyCalc(u);
  modal(`<h3>${t('Salva misure')}</h3>
    <div class="row"><div class="field"><label>${t('Anno')}</label><input id="m-anno" type="number" value="${w.anno}"></div>
      <div class="field"><label>${t('Settimana')}</label><input id="m-sett" type="number" min="1" max="53" value="${w.sett}"></div></div>
    <p class="muted" style="font-size:12.5px">${t('Verranno salvati: Peso')} ${nf(u.peso,1)} kg · BMI ${nf(c.bmi,1)} · ${t('Massa magra')} ${nf(c.magraKg,1)} kg.</p>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">${t('Annulla')}</button><button class="btn btn--ember" id="m-ok">${t('Salva')}</button></div>`);
  document.getElementById('m-ok').onclick=async()=>{
    const anno=+document.getElementById('m-anno').value, sett=+document.getElementById('m-sett').value;
    if(!anno||sett<1||sett>53){ avviso(t('Anno/settimana non validi')); return; }
    const code=schedaCode(anno,sett);
    /* una misura per settimana: due rilevazioni con lo stesso codice non hanno senso per
       nessun calcolo (chi leggeva la prima, chi l'ultima). Quella nuova prende il posto. */
    if(DOC.storico_io.some(r=>(+r.scheda)===code)){
      if(!await conferma(t('Esiste già la misura')+' '+code+t('. La sostituisco con i valori attuali?'))) return;
      DOC.storico_io=DOC.storico_io.filter(r=>(+r.scheda)!==code); }
    /* solo le misure (regola dei dati grezzi): BMI, massa magra e fabbisogno si calcolano (ioAttacca, 09c-pesate.js) */
    DOC.storico_io.push({scheda:code,livello:+u.livello_attivita||'',peso:+u.peso||0,massa_grassa:+u.massa_grassa||0,
      massa_muscolare:+u.massa_muscolare||0,massa_ossea:+u.massa_ossea||0,metab_basale:+u.metab_basale||0,grasso_viscerale:+u.grasso_viscerale||0,
      acqua:(u.acqua===''||u.acqua==null)?'':+u.acqua});
    ioAttacca(DOC);
    DOC.storico_io.sort((a,b)=>(+a.scheda||0)-(+b.scheda||0));   /* sempre in ordine di tempo: i grafici seguono l'elenco */
    persist('corpo'); closeModal(); renderCorpo();
  };
}

