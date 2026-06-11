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
    if(r.scheda!==last){last=r.scheda; body+=`<tr class="day-sep"><td colspan="11">▌ Scheda ${r.scheda}</td></tr>`;}
    const [fl,fc]=fascia(sPct(r));
    body+=`<tr${r.test?' style="background:rgba(122,62,168,.06)"':''}><td class="l">${esc(r.esercizio)}</td><td>${esc(r.macro||'')}</td><td class="num">${(+r.seduta||1)}${r.test?' ★':''}</td>
      <td class="num">${nf(r.serie,0)}</td><td class="num">${nf(r.rip,0)}</td><td class="num">${nf(r.peso,1)}</td>
      <td class="num">${(r.rir==null||r.rir==='')?'–':r.rir}</td><td class="num cell-calc">${nf(sRM(r),1)}</td><td class="num cell-calc">${nf(sPct(r),1)}</td>
      <td class="num cell-out">${nfk(sTL(r))}</td><td><span class="fascia ${fc}">${fl}</span></td></tr>`;
  });
  document.getElementById('panel-storico').innerHTML=`
   <div class="bar">
     <div class="field"><label>Cerca esercizio</label><input class="search" id="st-es" value="${esc(stFilt.esercizio)}" placeholder="es. Squat…"></div>
     <div class="field"><label>Gruppo</label><select id="st-macro"><option value="">tutti</option>${GRUPPI.map(g=>`<option${stFilt.macro===g?' selected':''}>${g}</option>`).join('')}</select></div>
     <div class="field"><label>Scheda</label><select id="st-sched"><option value="">tutte</option>${schede.map(s=>`<option${(+stFilt.scheda)===s?' selected':''}>${s}</option>`).join('')}</select></div>
     <div class="spacer"></div><span class="pill">${rows.length} righe · TL ${nfk(totTL)}</span>
   </div>
   <div class="tbl-wrap"><table>
     <thead><tr><th class="l">Esercizio</th><th>Gruppo</th><th>Sed.</th><th>Serie</th><th>Rip.</th><th>Peso</th><th>RIR</th><th>1RM</th><th>%1RM</th><th>TL</th><th>Fascia</th></tr></thead>
     <tbody>${body||'<tr><td colspan="11" class="empty">Nessun record.</td></tr>'}</tbody></table></div>`;
  document.getElementById('st-es').oninput=e=>{stFilt.esercizio=e.target.value; renderStorico(); document.getElementById('st-es').focus();};
  document.getElementById('st-macro').onchange=e=>{stFilt.macro=e.target.value; renderStorico();};
  document.getElementById('st-sched').onchange=e=>{stFilt.scheda=e.target.value; renderStorico();};
}

