/* ════════════════ RENDER: CORPO ════════════════ */
function bodyCalc(u){
  const alt=+u.altezza||0, peso=+u.peso||0, mg=+u.massa_grassa||0;
  const bmi=alt>0? peso/Math.pow(alt/100,2):0;
  const metab=(+u.metab_basale||0)*(+u.livello_attivita||0);
  const grassaKg=peso*mg, magraKg=peso-grassaKg;
  return {bmi,metab,grassaKg,magraKg};
}
function etaOf(u){ if(u&&u.nascita){ const d=new Date(u.nascita); if(!isNaN(d)){ const t=new Date(); let a=t.getFullYear()-d.getFullYear(); const m=t.getMonth()-d.getMonth(); if(m<0||(m===0&&t.getDate()<d.getDate()))a--; return a>=0?a:0; } } return +(u&&u.eta)||0; }
function renderCorpo(){
  const u=DOC.dati_utente; const c=bodyCalc(u);
  const io=DOC.storico_io;
  const lbl=io.map(r=>schedaLabel(r.scheda));
  const wSeries=[{name:'Peso',color:'var(--orange-b)',data:io.map((r,i)=>({x:lbl[i],y:+r.peso}))}];
  const bmiSeries=[{name:'BMI',color:'var(--violet)',data:io.map((r,i)=>({x:lbl[i],y:+r.bmi}))}];
  const massSeries=[
    {name:'Massa magra',color:'var(--ok)',data:io.map((r,i)=>({x:lbl[i],y:+r.massa_magra}))},
    {name:'Massa musc.',color:'var(--orange)',data:io.map((r,i)=>({x:lbl[i],y:+r.massa_muscolare}))}];
  const F=(k,lab,step,suf)=>`<tr><td class="l">${lab}</td><td><input class="cell-in" type="number" step="${step||'any'}" data-u="${k}" value="${u[k]??''}" style="width:90px"></td><td class="muted l">${suf||''}</td></tr>`;
  document.getElementById('panel-corpo').innerHTML=`
   ${statusBanner(DOC.storico_io,'Storico misure')}
   <div class="cards">
     <div class="card k--ember"><div class="card__k">Peso</div><div class="card__v">${nf(u.peso,1)}<small> kg</small></div></div>
     <div class="card"><div class="card__k">BMI</div><div class="card__v">${nf(c.bmi,1)}</div><div class="card__sub">${c.bmi<18.5?'sottopeso':c.bmi<25?'normopeso':c.bmi<30?'sovrappeso':'obesità'}</div></div>
     <div class="card k--ok"><div class="card__k">Massa magra</div><div class="card__v">${nf(c.magraKg,1)}<small> kg</small></div></div>
     <div class="card k--danger"><div class="card__k">Massa grassa</div><div class="card__v">${nf(c.grassaKg,1)}<small> kg</small></div><div class="card__sub">${nf((u.massa_grassa||0)*100,1)}%</div></div>
     <div class="card k--violet"><div class="card__k">Fabbisogno</div><div class="card__v">${nf(c.metab,0)}<small> kcal</small></div><div class="card__sub">basale·PAL</div></div>
   </div>
   <div class="bar no-print"><div class="spacer"></div><button class="btn btn--ember" id="btn-save-io">💾 Salva misure nello Storico</button><button class="btn btn--danger" id="btn-undo-io">↶ Annulla ultimo</button></div>
   <div class="chart-grid">
     <div>
       <div class="sec">▌ Dati corporei</div>
       <div class="tbl-wrap"><table><tbody>
         ${F('peso','Peso','0.1','kg')}
         ${F('massa_grassa','Massa grassa','0.001','frazione (es. 0.145)')}
         ${F('massa_muscolare','Massa muscolare','0.1','kg')}${F('massa_ossea','Massa ossea','0.1','kg')}
         ${F('metab_basale','Metabolismo basale','1','kcal')}${F('livello_attivita','Livello attività (PAL)','0.05','1.2–2.5')}
         ${F('grasso_viscerale','Grasso viscerale','0.1','indice')}
         <tr><td colspan="3" class="muted" style="font-size:11px">Altezza, data di nascita, sesso e nome sono nel tab <b>Profilo</b> (dati invariati).</td></tr>
       </tbody></table></div>
     </div>
     <div>
       <div class="chart-box"><h4>⚖ Peso</h4>${lineChart(wSeries,{labels:lbl,h:150})}</div>
       <div class="chart-box"><h4>BMI</h4>${lineChart(bmiSeries,{labels:lbl,h:150})}</div>
       <div class="chart-box"><h4>Massa magra / muscolare</h4>${lineChart(massSeries,{labels:lbl,h:150})}</div>
     </div>
   </div>
   <div class="callout callout--info no-print"><div>📜 Lo storico completo delle misure (${io.length} rilevazioni) è nella sezione «Misure», raggiungibile dal link nel footer.</div></div>
   <div id="foto-box"></div>`;
  document.querySelectorAll('#panel-corpo [data-u]').forEach(inp=>inp.addEventListener('input',e=>{
    DOC.dati_utente[e.target.dataset.u]=e.target.value===''?'':+e.target.value; persist('corpo');
    clearTimeout(rerenderT); rerenderT=setTimeout(renderCorpo,600);
  }));
  document.getElementById('btn-save-io').onclick=saveIoModal;
  document.getElementById('btn-undo-io').onclick=()=>{ if(!io.length){alert('Vuoto.');return;}
    if(!confirm('Elimino l\'ultima misura salvata?'))return; DOC.storico_io.pop(); persist('corpo'); renderCorpo(); };
  renderFotoSezione();  /* sezione 📸 Foto progressi (async per le immagini; sola lettura del disco) */
  updateStatusDots();
}
function saveIoModal(){
  const w=isoWeek(new Date()); const u=DOC.dati_utente; const c=bodyCalc(u);
  modal(`<h3>💾 Salva misure</h3>
    <div class="row"><div class="field"><label>Anno</label><input id="m-anno" type="number" value="${w.anno}"></div>
      <div class="field"><label>Settimana</label><input id="m-sett" type="number" min="1" max="53" value="${w.sett}"></div></div>
    <p class="muted" style="font-size:12.5px">Verranno salvati: Peso ${nf(u.peso,1)} kg · BMI ${nf(c.bmi,1)} · Massa magra ${nf(c.magraKg,1)} kg.</p>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">Annulla</button><button class="btn btn--ember" id="m-ok">Salva</button></div>`);
  document.getElementById('m-ok').onclick=()=>{
    const anno=+document.getElementById('m-anno').value, sett=+document.getElementById('m-sett').value;
    const code=schedaCode(anno,sett);
    if(DOC.storico_io.some(r=>(+r.scheda)===code) && !confirm(`Esiste già la misura ${code}. Aggiungo comunque?`))return;
    DOC.storico_io.push({scheda:code,eta:etaOf(u),livello:+u.livello_attivita||'',peso:+u.peso||0,
      metabolismo:c.metab,bmi:c.bmi,massa_grassa:+u.massa_grassa||0,massa_magra:c.magraKg,
      massa_muscolare:+u.massa_muscolare||0,massa_ossea:+u.massa_ossea||0,metab_basale:+u.metab_basale||0,grasso_viscerale:+u.grasso_viscerale||0});
    persist('corpo'); closeModal(); renderCorpo();
  };
}

