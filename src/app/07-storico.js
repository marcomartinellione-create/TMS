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
  const posizione=new Map(); DOC.storico.forEach((r,i)=>posizione.set(r,i));   /* indice vero nello Storico (la tabella è filtrata e capovolta) */
  rows.slice().reverse().forEach(r=>{
    /* nella barra della settimana, a destra, il tasto che elimina QUELLA registrazione:
       prende il posto del vecchio «Annulla ultimo», che sapeva togliere solo l'ultima */
    if(r.scheda!==last){last=r.scheda; body+=`<tr class="day-sep"><td colspan="12"><div style="display:flex;align-items:center;gap:10px">
      <span>▌ ${t('Scheda')} ${r.scheda} <span style="opacity:.7;font-weight:400">· ${esc(schedaLabel(r.scheda))}</span></span><span style="flex:1"></span>
      <button class="btn btn--sm btn--del no-print" data-delsched="${r.scheda}" title="${esc(t('Elimina tutte le righe di questa settimana'))}" aria-label="${esc(t('Elimina tutte le righe di questa settimana'))}">🗑</button></div></td></tr>`;}
    const [fl,fc]=fascia(sPct(r));
    body+=`<tr${r.test?' style="background:rgba(122,62,168,.06)"':''}><td class="l">${esc(exName(r.esercizio))}</td><td>${esc(t(r.macro)||'')}</td><td class="num">${(+r.seduta||1)}${r.test?' ★':''}</td>
      <td class="num">${nf(r.serie,0)}</td><td class="num">${nf(r.rip,0)}</td><td class="num">${nf(r.peso,1)}</td>
      <td class="num">${(r.rir==null||r.rir==='')?'–':r.rir}</td><td class="num cell-calc">${nf(rmMostrato(r),1)}</td><td class="num cell-calc">${nf(sPct(r),1)}</td>
      <td class="num cell-out">${nfk(sTL(r))}</td><td><span class="fascia ${fc}">${t(fl)}</span></td>
      <td class="no-print"><button class="btn btn--sm" data-edrow="${posizione.get(r)}" title="${esc(t('correggi questa riga'))}" aria-label="${esc(t('correggi questa riga'))}">✎</button></td></tr>`;
  });
  document.getElementById('panel-storico').innerHTML=`
   <div class="bar">
     <div class="field"><label>${t('Cerca esercizio')}</label><input class="search" id="st-es" value="${esc(stFilt.esercizio)}" placeholder="${t('es. Squat…')}"></div>
     <div class="field"><label>${t('Gruppo')}</label><select id="st-macro"><option value="">${t('tutti')}</option>${GRUPPI.map(g=>`<option value="${g}"${stFilt.macro===g?' selected':''}>${t(g)}</option>`).join('')}</select></div>
     <div class="field"><label>${t('Scheda')}</label><select id="st-sched"><option value="">${t('tutte')}</option>${schede.map(s=>`<option${(+stFilt.scheda)===s?' selected':''}>${s}</option>`).join('')}</select></div>
     <div class="spacer"></div><span class="pill">${rows.length} ${t('righe · TL')} ${nfk(totTL)}</span>
   </div>
   <div class="tbl-wrap"><table>
     <thead><tr><th class="l">${t('Esercizio')}</th><th>${t('Gruppo')}</th><th>${t('Sed.')}</th><th>${t('Serie')}</th><th>${t('Rip.')}</th><th>${t('Peso')}</th><th>RIR</th><th>1RM</th><th>%1RM</th><th>TL</th><th>${t('Fascia')}</th><th class="no-print"></th></tr></thead>
     <tbody>${body||`<tr><td colspan="12" class="empty">${t('Nessun record.')}</td></tr>`}</tbody></table></div>`;
  document.getElementById('st-es').oninput=e=>{stFilt.esercizio=e.target.value; ridisegnaConFuoco('panel-storico', renderStorico);};
  document.getElementById('st-macro').onchange=e=>{stFilt.macro=e.target.value; renderStorico();};
  document.getElementById('st-sched').onchange=e=>{stFilt.scheda=e.target.value; renderStorico();};
  document.querySelectorAll('#panel-storico [data-delsched]').forEach(b=>{ b.onclick=()=>eliminaScheda(+b.dataset.delsched); });
  document.querySelectorAll('#panel-storico [data-edrow]').forEach(b=>{ b.onclick=()=>modificaRigaStorico(+b.dataset.edrow); });
}
/* ── CORREGGERE UNA RIGA GIÀ SALVATA (2026-11-11, richiesta di Marco) ─────────────
   Prima un peso sbagliato in una settimana salvata si sistemava solo eliminando l'INTERA
   settimana e risalvandola. Ora ogni riga ha il suo ✎: si correggono serie, ripetizioni,
   peso, RIR e il segno ★ di test, oppure si toglie quella riga soltanto. Esercizio e
   settimana non si cambiano da qui: sono ciò che identifica la riga. 1RM, %1RM, TL e
   tutto il resto non sono salvati, quindi si riallineano da soli. */
function modificaRigaStorico(i){
  const r=DOC.storico[i]; if(!r) return;
  const clib=isCorpoLibero(r.esercizio);
  modal(`<h3>✎ ${t('Correggi una riga dello Storico')}</h3>
    <div class="muted" style="font-size:12.5px;margin-bottom:8px"><b>${esc(exName(r.esercizio))}</b> · ${t('Scheda')} ${esc(r.scheda)} · ${esc(schedaLabel(r.scheda))}</div>
    <div class="row">
      <div class="field"><label>${t('Serie')}</label><input id="rs-serie" type="number" min="0" step="1" value="${r.serie??''}"></div>
      <div class="field"><label>${t('Rip.')}</label><input id="rs-rip" type="number" min="0" step="1" value="${r.rip??''}"></div>
      <div class="field"><label>${t('Peso')}${clib?' <span class="muted" style="text-transform:none">('+t('zavorra')+')</span>':''}</label><input id="rs-peso" type="number" min="0" step="0.5" value="${r.peso??''}"></div>
      <div class="field"><label>RIR</label><input id="rs-rir" type="number" min="0" max="10" value="${r.rir??''}" placeholder="–"></div>
    </div>
    <label class="optchk" style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:4px"><input type="checkbox" id="rs-test" style="width:auto;flex:0 0 auto"${r.test?' checked':''}> <span>${t('★ Test del massimale (escluso dalla progressione)')}</span></label>
    <div class="ex-err" id="rs-err" hidden></div>
    <div class="modal__actions"><button class="btn btn--danger" id="rs-del">${t('🗑 Elimina riga')}</button><span style="flex:1"></span>
      <button class="btn" onclick="closeModal()">${t('Annulla')}</button><button class="btn btn--ember" id="rs-ok">${t('Salva')}</button></div>`);
  const m=document.getElementById('modal'); if(m) m.style.maxWidth='560px';
  const num=id=>{ const v=document.getElementById(id).value; return v===''? null : +v; };
  const dopo=()=>{ cruscottoInvalida(); if(curTab==='storico') renderStorico(); else renderAll(); updateStatusDots(); };
  document.getElementById('rs-ok').onclick=()=>{
    const se=num('rs-serie'), ri=num('rs-rip'), pe=num('rs-peso'), rr=num('rs-rir');
    if([se,ri,pe].some(v=>v==null||!isFinite(v)||v<0) || (rr!=null&&(!isFinite(rr)||rr<0))){
      const e=document.getElementById('rs-err'); e.textContent=t('Serie, ripetizioni e peso devono essere numeri da zero in su.'); e.hidden=false; return; }
    r.serie=se; r.rip=ri; r.peso=pe; r.rir=rr; r.test=document.getElementById('rs-test').checked;
    persist('storico'); closeModal(); dopo();
  };
  document.getElementById('rs-del').onclick=()=>{
    chiediConferma(t('Elimino questa riga?'),
      `<b>${esc(exName(r.esercizio))}</b> · ${nf(r.serie,0)}×${nf(r.rip,0)} · ${nf(r.peso,1)} kg<br>${t('Viene tolta solo questa riga; il resto della settimana resta.')} ${t('L\'operazione non si può annullare.')}`,
      ()=>{ const k=DOC.storico.indexOf(r); if(k<0) return;
        DOC.storico.splice(k,1); persist('storico');
        if(!DOC.storico.some(x=>(+x.scheda)===(+r.scheda))) togliCaricoInterno(r.scheda);   /* era l'ultima riga di quella settimana */
        dopo(); }, {testoOk:t('Elimina')});
    const no=document.getElementById('cc-no'); if(no) no.onclick=()=>modificaRigaStorico(DOC.storico.indexOf(r));   /* Annulla riporta alla correzione */
  };
  setTimeout(()=>{ try{ const p=document.getElementById('rs-peso'); p.focus(); p.select(); }catch(e){} },0);
}

