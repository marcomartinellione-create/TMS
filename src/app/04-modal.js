/* ════════════════ MODAL ════════════════ */
function modal(html){ const bk=document.getElementById('modal-bk'); document.getElementById('modal').innerHTML=html; bk.classList.remove('hidden'); }
function closeModal(){ const m=document.getElementById('modal'); if(m){ const vid=m.querySelector('video'); if(vid){ vid.pause(); vid.currentTime=0; } m.style.maxWidth=''; } document.getElementById('modal-bk').classList.add('hidden'); }
/* Conferma via modale, in stile pergamena — al posto del confirm() di sistema, che
   arriva come una finestra grigia di Windows e stona con tutto il resto.
   Differenza importante: confirm() è SINCRONO, questo no — quindi chi lo usa deve
   mettere il seguito dentro `onSi`, non dopo la chiamata.
   `pericolo` colora di rosso il tasto: le eliminazioni non si annullano. */
function chiediConferma(titolo, testo, onSi, opt){
  opt=opt||{};
  const ok=opt.testoOk||t('Conferma'), pericolo=opt.pericolo!==false;
  modal(`<h3>${esc(titolo)}</h3>
   <div class="callout ${pericolo?'callout--ember':'callout--info'}" style="margin-top:6px"><div>${testo}</div></div>
   <div class="modal__actions"><button class="btn" id="cc-no">${t('Annulla')}</button>
     <button class="btn ${pericolo?'btn--del':'btn--ember'}" id="cc-si">${esc(ok)}</button></div>`);
  const m=document.getElementById('modal'); if(m) m.style.maxWidth='480px';
  document.getElementById('cc-no').onclick=closeModal;
  document.getElementById('cc-si').onclick=()=>{ closeModal(); try{ onSi(); }catch(e){ logErrore('conferma', e); } };
  setTimeout(()=>{ try{ document.getElementById('cc-no').focus(); }catch(e){} },0);  /* il fuoco parte da Annulla: un Invio distratto non cancella nulla */
}
/* avviso in stile app — al posto di alert(). Solo per informare: un tasto solo. */
function avvisa(titolo, testo){
  modal(`<h3>${esc(titolo)}</h3>
   <div class="callout callout--info" style="margin-top:6px"><div>${testo}</div></div>
   <div class="modal__actions"><button class="btn btn--ember" onclick="closeModal()">${t('Ho capito')}</button></div>`);
  const m=document.getElementById('modal'); if(m) m.style.maxWidth='480px';
}
/* input testuale via modale — sostituisce window.prompt(), che Electron NON supporta
   (i bottoni che lo usavano risultavano "morti" nell'app desktop). Annulla = nessuna azione. */
function chiediTesto(titolo, valore, cb){
  modal(`<h3>${esc(titolo)}</h3><div class="field" style="margin-top:8px"><input id="ct-in" value="${esc(valore||'')}" style="width:100%"></div>
   <div class="modal__actions"><button class="btn" onclick="closeModal()">${t('Annulla')}</button><button class="btn btn--ember" id="ct-ok">OK</button></div>`);
  const i=document.getElementById('ct-in');
  const conferma=()=>{ const v=i.value; closeModal(); cb(v); };
  document.getElementById('ct-ok').onclick=conferma;
  i.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); conferma(); } };
  setTimeout(()=>{ try{ i.focus(); i.select(); }catch(e){} },0);
}

