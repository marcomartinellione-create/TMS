/* ════════════════ MODAL ════════════════ */
function modal(html){ const bk=document.getElementById('modal-bk'); document.getElementById('modal').innerHTML=html; bk.classList.remove('hidden'); }
function closeModal(){ const m=document.getElementById('modal'); if(m){ const vid=m.querySelector('video'); if(vid){ vid.pause(); vid.currentTime=0; } m.style.maxWidth=''; } document.getElementById('modal-bk').classList.add('hidden'); }
/* input testuale via modale — sostituisce window.prompt(), che Electron NON supporta
   (i bottoni che lo usavano risultavano "morti" nell'app desktop). Annulla = nessuna azione. */
function chiediTesto(titolo, valore, cb){
  modal(`<h3>${esc(titolo)}</h3><div class="field" style="margin-top:8px"><input id="ct-in" value="${esc(valore||'')}" style="width:100%"></div>
   <div class="modal__actions"><button class="btn" onclick="closeModal()">Annulla</button><button class="btn btn--ember" id="ct-ok">OK</button></div>`);
  const i=document.getElementById('ct-in');
  const conferma=()=>{ const v=i.value; closeModal(); cb(v); };
  document.getElementById('ct-ok').onclick=conferma;
  i.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); conferma(); } };
  setTimeout(()=>{ try{ i.focus(); i.select(); }catch(e){} },0);
}

