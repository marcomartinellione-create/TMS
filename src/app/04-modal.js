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
/* ── RIDISEGNO SENZA PERDERE IL PUNTO DI SCRITTURA (2026-11-11) ───────────────────
   Diversi pannelli si ridisegnano mentre si digita (per aggiornare totali e grafici) e
   ricreano anche la casella in cui si sta scrivendo: il cursore spariva (Corpo,
   Alimentazione: bastava una pausa di mezzo secondo) o tornava all'inizio (ricerca nello
   Storico: «squat» diventava «tauqs»). Qui si ricorda quale casella aveva il fuoco e dove
   stava il cursore, si ridisegna, e li si rimette. Le caselle numeriche non espongono la
   posizione del cursore: lì lo si porta in fondo, che è dove si scrive. */
function ridisegnaConFuoco(pannello, render){
  const p=typeof pannello==='string'? document.getElementById(pannello) : pannello;
  const SEL='input,textarea,select';
  const a=document.activeElement; let idx=-1, pos=null;
  if(p && a && p.contains(a) && a.matches && a.matches(SEL)){
    idx=[...p.querySelectorAll(SEL)].indexOf(a);
    try{ if(a.selectionStart!=null) pos=[a.selectionStart,a.selectionEnd]; }catch(e){}
  }
  render();
  if(idx<0) return;
  const n=p.querySelectorAll(SEL)[idx];
  if(!n || n.tagName!==a.tagName || n.type!==a.type) return;   /* la struttura è cambiata: meglio non indovinare */
  try{ n.focus({preventScroll:true}); }catch(e){ try{ n.focus(); }catch(_){} }
  try{
    if(pos) n.setSelectionRange(pos[0],pos[1]);
    else if(n.tagName==='INPUT' && n.type==='number'){ n.type='text'; const L=n.value.length; n.setSelectionRange(L,L); n.type='number'; }
  }catch(e){ try{ if(n.type==='text'&&a.type==='number') n.type='number'; }catch(_){} }
}
/* ── AVVISI E CONFERME IN STILE APP (2026-11-11, richiesta di Marco) ──────────────
   Sostituiscono alert() e confirm() di sistema (le finestre grigie di Windows) in TUTTA
   l'app. Vivono in uno strato a parte, sopra il riquadro eventualmente aperto: così una
   conferma chiesta da dentro un riquadro (editor esercizio, salvataggio scheda) non lo
   sostituisce. Restituiscono una Promise, quindi si usano con await:
       if(!await conferma('Elimino?')) return;
       avviso('Fatto.');                 // senza await: il codice prosegue, come prima
   Il testo è testo semplice (viene protetto e gli a capo diventano righe). Più richieste
   ravvicinate si mettono in fila. Invio conferma l'avviso; nelle conferme il fuoco parte
   da Annulla ed Esc annulla: un Invio distratto non elimina nulla. */
let _dlgFila=Promise.resolve();
function _dlgTesto(s){ return esc(String(s==null?'':s)).replace(/\n/g,'<br>'); }
function _dlgApri(html, pronto){
  const turno=_dlgFila.then(()=>new Promise(res=>{
    const bk=document.getElementById('dlg-bk'), box=document.getElementById('dlg');
    if(!bk||!box){ res(undefined); return; }
    const prima=document.activeElement;
    box.innerHTML=html; bk.classList.remove('hidden');
    const chiudi=v=>{ bk.classList.add('hidden'); box.innerHTML=''; bk.onkeydown=null;
      try{ if(prima&&prima.focus&&document.contains(prima)) prima.focus({preventScroll:true}); }catch(e){}
      res(v); };
    pronto(box, chiudi, bk);
  }));
  _dlgFila=turno.then(()=>{},()=>{});
  return turno;
}
function avviso(testo, titolo){
  return _dlgApri(`${titolo?`<h3>${esc(titolo)}</h3>`:''}<div class="dlg-testo">${_dlgTesto(testo)}</div>
    <div class="modal__actions"><button class="btn btn--ember" id="dlg-ok">${t('Ho capito')}</button></div>`,
    (box,chiudi,bk)=>{ const ok=box.querySelector('#dlg-ok'); ok.onclick=()=>chiudi(undefined);
      bk.onkeydown=e=>{ if(e.key==='Escape'){ e.preventDefault(); chiudi(undefined); } };
      setTimeout(()=>{ try{ ok.focus(); }catch(e){} },0); });
}
function conferma(testo, opt){
  opt=opt||{};
  return _dlgApri(`<h3>${esc(opt.titolo||t('Conferma'))}</h3><div class="dlg-testo">${_dlgTesto(testo)}</div>
    <div class="modal__actions"><button class="btn" id="dlg-no">${esc(opt.testoNo||t('Annulla'))}</button><button class="btn ${opt.pericolo?'btn--del':'btn--ember'}" id="dlg-si">${esc(opt.testoOk||t('Conferma'))}</button></div>`,
    (box,chiudi,bk)=>{ const no=box.querySelector('#dlg-no'), si=box.querySelector('#dlg-si');
      no.onclick=()=>chiudi(false); si.onclick=()=>chiudi(true);
      bk.onkeydown=e=>{ if(e.key==='Escape'){ e.preventDefault(); chiudi(false); } };
      setTimeout(()=>{ try{ no.focus(); }catch(e){} },0); });
}
/* ── COLONNE A SCORRIMENTO INDIPENDENTE (2026-11-12) ──────────────────────────────
   Nelle pagine a due colonne (.pag) su schermo largo ogni colonna scorre per conto suo.
   Perché succeda la coppia deve avere un'altezza: quella che resta dalla sua posizione al
   fondo della finestra. Si ricalcola a ogni ridisegno, cambio di scheda e ridimensionamento. */
const PAG_LARGO=1320;
function adattaPag(){
  try{
    const largo=window.innerWidth>=PAG_LARGO;
    document.querySelectorAll('.panel.is-active .pag').forEach(p=>{
      if(!largo){ p.style.height=''; return; }
      const top=p.getBoundingClientRect().top+(window.scrollY||0);
      p.style.height=Math.max(320, window.innerHeight-top-12)+'px';
    });
  }catch(e){}
}
/* avvolge un render di pagina: dopo il ridisegno le due colonne tornano dov'erano (senza,
   aggiungere una riga in fondo alla scheda riportava la colonna in cima) e l'altezza si riadatta */
function conColonne(tab, render){
  return function(){
    const p=document.getElementById('panel-'+tab), SEL='.pag__main,.pag__side';
    const sc=p? [...p.querySelectorAll(SEL)].map(e=>e.scrollTop) : [];
    const r=render.apply(this, arguments);
    if(p){ const el=p.querySelectorAll(SEL); sc.forEach((v,i)=>{ if(el[i]&&v) el[i].scrollTop=v; }); }
    adattaPag();
    return r;
  };
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

