/* ════════════════ RENDER: STORICO ════════════════ */
let stFilt={esercizio:'',macro:'',scheda:''};
function renderStorico(){
  const schede=[...new Set(DOC.storico.map(r=>+r.scheda))].sort((a,b)=>b-a);
  let rows=DOC.storico.filter(r=>
    (!stFilt.esercizio||String(r.esercizio||'').toLowerCase().includes(stFilt.esercizio.toLowerCase()))&&
    (!stFilt.macro||r.macro===stFilt.macro)&&
    (!stFilt.scheda||(+r.scheda)===(+stFilt.scheda)));
  const totTL=rows.reduce((a,r)=>a+sTL(r),0);
  let body='',last=null;
  rows.slice().reverse().forEach(r=>{
    if(r.scheda!==last){last=r.scheda; body+=`<tr class="day-sep"><td colspan="11">▌ ${t('Scheda')} ${r.scheda}</td></tr>`;}
    const [fl,fc]=fascia(sPct(r));
    body+=`<tr${r.test?' style="background:rgba(122,62,168,.06)"':''}><td class="l">${esc(exName(r.esercizio))}</td><td>${esc(t(r.macro)||'')}</td><td class="num">${(+r.seduta||1)}${r.test?' ★':''}</td>
      <td class="num">${nf(r.serie,0)}</td><td class="num">${nf(r.rip,0)}</td><td class="num">${nf(r.peso,1)}</td>
      <td class="num">${(r.rir==null||r.rir==='')?'–':r.rir}</td><td class="num cell-calc">${nf(sRM(r),1)}</td><td class="num cell-calc">${nf(sPct(r),1)}</td>
      <td class="num cell-out">${nfk(sTL(r))}</td><td><span class="fascia ${fc}">${t(fl)}</span></td></tr>`;
  });
  document.getElementById('panel-storico').innerHTML=`
   <div class="bar">
     <div class="field"><label>${t('Cerca esercizio')}</label><input class="search" id="st-es" value="${esc(stFilt.esercizio)}" placeholder="${t('es. Squat…')}"></div>
     <div class="field"><label>${t('Gruppo')}</label><select id="st-macro"><option value="">${t('tutti')}</option>${GRUPPI.map(g=>`<option value="${g}"${stFilt.macro===g?' selected':''}>${t(g)}</option>`).join('')}</select></div>
     <div class="field"><label>${t('Scheda')}</label><select id="st-sched"><option value="">${t('tutte')}</option>${schede.map(s=>`<option${(+stFilt.scheda)===s?' selected':''}>${s}</option>`).join('')}</select></div>
     <div class="spacer"></div><span class="pill">${rows.length} ${t('righe · TL')} ${nfk(totTL)}</span>
   </div>
   <div class="tbl-wrap"><table>
     <thead><tr><th class="l">${t('Esercizio')}</th><th>${t('Gruppo')}</th><th>${t('Sed.')}</th><th>${t('Serie')}</th><th>${t('Rip.')}</th><th>${t('Peso')}</th><th>RIR</th><th>1RM</th><th>%1RM</th><th>TL</th><th>${t('Fascia')}</th></tr></thead>
     <tbody>${body||`<tr><td colspan="11" class="empty">${t('Nessun record.')}</td></tr>`}</tbody></table></div>`;
  document.getElementById('st-es').oninput=e=>{stFilt.esercizio=e.target.value; renderStorico(); document.getElementById('st-es').focus();};
  document.getElementById('st-macro').onchange=e=>{stFilt.macro=e.target.value; renderStorico();};
  document.getElementById('st-sched').onchange=e=>{stFilt.scheda=e.target.value; renderStorico();};
}

