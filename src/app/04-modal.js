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
/* titolo di ogni colonna (resta fermo in cima mentre la colonna scorre, con una riga che la
   separa dal contenuto): [colonna principale, pannello laterale] per tab */
const TITOLI_PAG={
  profilo:['Profili','Profilo aperto e backup'], allenamento:['Scheda della settimana','Come sta venendo la scheda'],
  cardio:['Attività cardio','Settimana e carico'], storico:['Registrazioni salvate','Sintesi delle righe mostrate'],
  corpo:['Dati corporei e foto','Composizione e andamento'], alimentazione:['Piano alimentare','Sintesi del piano','Indice nutrienti settimanale OMS/FAO'],
  analisi:['Periodi, carico e peso','Periodi e lettura'], report:['Anteprima del PDF','Strumenti del report'], esercizi:['Catalogo esercizi','Scheda dell’esercizio'],
};
function adattaPag(){
  try{
    const largo=window.innerWidth>=PAG_LARGO;
    /* #panel-dieta non è un vero tab (non ha classe .panel, apposta: showTab() spegnerebbe il
       suo is-active cambiando tab sotto), ma quando la Stampa dieta è aperta va adattato uguale */
    document.querySelectorAll('.panel.is-active .pag, #panel-dieta .pag').forEach(p=>{
      const tab=(p.closest('.panel')||{id:''}).id.replace('panel-',''), tit=TITOLI_PAG[tab];
      if(tit){ ['.pag__main','.pag__side','.pag__terza'].forEach((c,i)=>{ const el=p.querySelector(':scope > '+c); if(el&&tit[i]) el.setAttribute('data-titolo', t(tit[i])); }); }
      /* le intestazioni delle tabelle restano ferme sotto il titolo: serve che il riquadro della
         tabella non scorra di lato per conto suo, quindi lo si «apre» solo se la tabella ci sta */
      p.querySelectorAll('.tbl-wrap').forEach(w=>{ const tb=w.querySelector('table');
        w.classList.toggle('tbl-wrap--ferma', largo && !!tb && tb.scrollWidth<=w.clientWidth+1); });
      if(!largo){ p.style.height=''; return; }
      const top=p.getBoundingClientRect().top+(window.scrollY||0);
      const wrap=p.closest('.wrap'), sotto=wrap? parseFloat(getComputedStyle(wrap).paddingBottom)||0 : 0;
      let h=Math.max(320, window.innerHeight-top-sotto);
      p.style.height=h+'px';
      /* la pagina intorno non deve scorrere: se avanza qualcosa sotto, la coppia si accorcia
         (prima la rotella, a fine colonna, faceva scendere tutta la pagina di un tratto e il
         fondo della colonna restava nascosto) */
      const avanzo=document.documentElement.scrollHeight-window.innerHeight;
      if(avanzo>0 && h-avanzo>=320){ h-=avanzo; p.style.height=h+'px'; }
    });
  }catch(e){}
}
/* avvolge un render di pagina: dopo il ridisegno le due colonne tornano dov'erano (senza,
   aggiungere una riga in fondo alla scheda riportava la colonna in cima) e l'altezza si riadatta */
function conColonne(tab, render){
  return function(){
    const p=document.getElementById('panel-'+tab), SEL='.pag__main,.pag__side,.pag__terza';
    const sc=p? [...p.querySelectorAll(SEL)].map(e=>e.scrollTop) : [];
    const scY=window.scrollY||document.documentElement.scrollTop||0;   /* schermi non larghi: scorre la pagina, non le colonne */
    const r=render.apply(this, arguments);
    /* adattaPag PRIMA: il foglio nuovo appena ricreato non ha ancora l'altezza giusta (quindi
       non c'è niente da scorrere) — rimettere scrollTop a questo punto verrebbe azzerato dal
       browser appena l'altezza si fissa. Prima l'altezza, poi lo scorrimento, altrimenti torna 0. */
    adattaPag();
    if(p){ const el=p.querySelectorAll(SEL); sc.forEach((v,i)=>{ if(el[i]&&v) el[i].scrollTop=v; }); }
    if(scY) window.scrollTo(0, scY);
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
/* ── MENÙ A TENDINA IN STILE APP (2026-11-23, Marco: «migliora lo stile del menù a tendina che
      appare quando si clicca sui Training Set») ─────────────────────────────────────────────
   Un <select> aperto mostra l'elenco di Windows: fondo bianco anche di notte, carattere di sistema,
   gruppi in grassetto, azioni mescolate alle scelte, e il CSS non lo raggiunge. Qui c'è un pulsante
   che sembra un campo come gli altri e, al clic, un riquadro dell'app appena sotto: casella di
   ricerca, gruppi a bottoni («Tutti · Palestra 4 · …»), le voci divise per gruppo con la spunta su
   quella scelta e una nota a destra, e in fondo, separate, le azioni. Da tastiera: freccia giù sul
   pulsante apre; nel riquadro frecce su/giù, Invio sceglie (con una ricerca scritta, la prima voce
   trovata), Esc chiude. Un solo riquadro per volta (#tnd-pop nel body, position:fixed sotto il
   pulsante, o sopra se sotto non c'è posto); si chiude cliccando fuori, scorrendo la pagina o
   ridimensionando la finestra.
   cfg (la ricrea chi apre, a ogni apertura):
     scelto          valore con la spunta
     testa           [{v,lab,info}] voci in cima, fuori dai gruppi (es. «Tutto il percorso»)
     blocchi(cerca)  → [{titolo|null, voci:[{v,lab,info}]}] le voci già filtrate (titolo null = senza intestazione)
     gruppi()        → null | {valore, voci:[{v,lab,n}]} i bottoni dei gruppi; onGruppo(v) quando se ne sceglie uno
     cerca           {ph} | null — la casella di ricerca
     vuoto(cerca)    testo quando non c'è nessuna voce
     azioni          [{v,lab,ico,pericolo}]
     onScegli(v)     dopo la chiusura del riquadro */
let _tnd=null;
function tendinaPulsante(id, valore, testo, nota, titolo){
  return `<button type="button" class="tnd" id="${id}" value="${esc(valore)}" aria-haspopup="listbox" aria-expanded="false"${titolo?` title="${esc(titolo)}"`:''}>`+
    `<span class="tnd__val">${esc(testo)}</span>${nota?`<span class="tnd__nota">${esc(nota)}</span>`:''}${ico('giu','p')}</button>`; }
/* collega il pulsante al suo riquadro; cfgFn() costruisce la configurazione al momento del clic */
function tendinaLega(btn, cfgFn){
  if(_tnd && !document.contains(_tnd.btn)) tendinaChiudi(false);   /* il pulsante è stato ridisegnato: via il riquadro rimasto orfano */
  if(!btn) return;
  btn.onclick=()=>{ if(_tnd && _tnd.btn===btn){ tendinaChiudi(true); return; } tendinaApri(btn, cfgFn()); };
  btn.onkeydown=e=>{ if(e.key==='ArrowDown' && !(_tnd && _tnd.btn===btn)){ e.preventDefault(); tendinaApri(btn, cfgFn()); } };
}
function tendinaApri(btn, cfg){
  tendinaChiudi(false);
  const pop=document.createElement('div'); pop.id='tnd-pop'; pop.className='tnd-pop'; pop.setAttribute('role','dialog');
  pop.innerHTML=(cfg.cerca? `<div class="tnd-cerca"><input type="search" autocomplete="off" spellcheck="false" placeholder="${esc(cfg.cerca.ph)}" aria-label="${esc(cfg.cerca.ph)}"></div>` : '')+
    `<div class="tnd-chips" hidden></div><div class="tnd-lista" role="listbox"></div><div class="tnd-azioni" hidden></div>`;
  document.body.appendChild(pop);
  _tnd={btn, cfg, pop, cerca:'', att:-1};
  btn.setAttribute('aria-expanded','true'); btn.classList.add('is-aperto');
  _tndDisegna(); _tndPosiziona();
  pop.onkeydown=_tndTasti;
  pop.addEventListener('focusout', e=>{ if(_tnd && _tnd.pop===pop && e.relatedTarget && !pop.contains(e.relatedTarget) && e.relatedTarget!==btn) tendinaChiudi(false); });
  const inp=pop.querySelector('.tnd-cerca input');
  if(inp) inp.oninput=()=>{ if(!_tnd) return; _tnd.cerca=inp.value; _tnd.att=-1; _tndDisegna(); };
  try{ (inp||pop.querySelector('[data-tnd-v]')||pop).focus({preventScroll:true}); }catch(e){}
  document.addEventListener('mousedown', _tndFuori, true);
  document.addEventListener('scroll', _tndScorre, true);
  window.addEventListener('resize', _tndRidim);
}
function tendinaChiudi(fuoco){
  const T=_tnd; if(!T) return; _tnd=null;
  document.removeEventListener('mousedown', _tndFuori, true);
  document.removeEventListener('scroll', _tndScorre, true);
  window.removeEventListener('resize', _tndRidim);
  try{ T.pop.remove(); }catch(e){}
  if(T.btn && document.contains(T.btn)){ T.btn.setAttribute('aria-expanded','false'); T.btn.classList.remove('is-aperto');
    if(fuoco){ try{ T.btn.focus({preventScroll:true}); }catch(e){} } }
}
function _tndFuori(e){ const T=_tnd; if(!T || T.pop.contains(e.target) || T.btn.contains(e.target)) return; tendinaChiudi(false); }
function _tndScorre(e){ const T=_tnd; if(T && !(e.target && e.target.nodeType===1 && T.pop.contains(e.target))) tendinaChiudi(false); }
function _tndRidim(){ tendinaChiudi(false); }
function _tndPosiziona(){
  const T=_tnd; if(!T) return; const r=T.btn.getBoundingClientRect(), p=T.pop, H=window.innerHeight, W=window.innerWidth;
  p.style.minWidth=Math.max(r.width, 280)+'px';
  const w=p.offsetWidth||Math.max(r.width,280);
  p.style.left=Math.max(8, Math.min(r.left, W-w-8))+'px';
  const sotto=H-r.bottom-14, sopra=r.top-14;
  if(sotto>=280 || sotto>=sopra){ p.style.top=(r.bottom+4)+'px'; p.style.bottom=''; p.style.maxHeight=Math.max(180,sotto)+'px'; }
  else { p.style.bottom=(H-r.top+4)+'px'; p.style.top=''; p.style.maxHeight=Math.max(180,sopra)+'px'; }
}
function _tndVoce(x, scelto, cls){
  const sel=x.v===scelto;
  return `<button type="button" class="tnd-voce${sel?' is-sel':''}${cls?' '+cls:''}" role="option" aria-selected="${sel}" data-tnd-v="${esc(x.v)}">`+
    `${sel? ico('check','p') : '<span class="tnd-spazio"></span>'}<span class="tnd-nome">${esc(x.lab)}</span>${x.info?`<span class="tnd-info">${esc(x.info)}</span>`:''}</button>`; }
function _tndDisegna(){
  const T=_tnd; if(!T) return; const c=T.cfg, P=T.pop;
  const chips=P.querySelector('.tnd-chips'), lista=P.querySelector('.tnd-lista'), az=P.querySelector('.tnd-azioni');
  const g=c.gruppi? c.gruppi() : null;
  chips.hidden=!g;
  chips.innerHTML=g? g.voci.map(x=>`<button type="button" class="tnd-chip${x.v===g.valore?' is-on':''}" aria-pressed="${x.v===g.valore}" data-tnd-gr="${esc(x.v)}">${esc(x.lab)}<span>${x.n}</span></button>`).join('') : '';
  const bl=c.blocchi(T.cerca);
  let h=(c.testa||[]).map(x=>_tndVoce(x, c.scelto, 'tnd-testa')).join('');
  bl.forEach(b=>{ if(!b.voci.length) return;
    if(b.titolo) h+=`<div class="tnd-gr" role="presentation"><span class="tnd-gr__nome">${esc(b.titolo)}</span><span>${b.voci.length}</span></div>`;
    h+=b.voci.map(x=>_tndVoce(x, c.scelto)).join(''); });
  if(!bl.some(b=>b.voci.length)) h+=`<div class="tnd-vuoto">${esc(c.vuoto? c.vuoto(T.cerca) : '')}</div>`;
  lista.innerHTML=h;
  const A=c.azioni||[]; az.hidden=!A.length;
  az.innerHTML=A.map(a=>`<button type="button" class="tnd-voce tnd-az${a.pericolo?' tnd-az--pericolo':''}" data-tnd-v="${esc(a.v)}">${ico(a.ico||'avanti','p')}<span class="tnd-nome">${esc(a.lab)}</span></button>`).join('');
  P.querySelectorAll('[data-tnd-v]').forEach(b=>{ b.onclick=()=>_tndScegli(b.dataset.tndV); });
  chips.querySelectorAll('[data-tnd-gr]').forEach(b=>{ b.onclick=()=>{ if(!_tnd) return; c.onGruppo(b.dataset.tndGr); _tnd.att=-1; _tndDisegna();
    const inp=P.querySelector('.tnd-cerca input'); try{ (inp||b).focus({preventScroll:true}); }catch(e){} }; });
}
function _tndScegli(v){ const T=_tnd; if(!T) return; tendinaChiudi(true); try{ T.cfg.onScegli(v); }catch(e){ logErrore('tendina', e); } }
function _tndTasti(e){
  const T=_tnd; if(!T) return;
  if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); tendinaChiudi(true); return; }
  const voci=[...T.pop.querySelectorAll('[data-tnd-v]')];
  if(e.key==='ArrowDown' || e.key==='ArrowUp'){ e.preventDefault(); if(!voci.length) return;
    T.att=e.key==='ArrowDown'? (T.att+1)%voci.length : (T.att<=0? voci.length-1 : T.att-1);
    voci.forEach((b,i)=>b.classList.toggle('is-att', i===T.att));
    try{ voci[T.att].scrollIntoView({block:'nearest'}); }catch(_){} return; }
  if(e.key==='Enter' && e.target && e.target.matches && e.target.matches('.tnd-cerca input')){ e.preventDefault();
    const b=voci[T.att] || (T.cerca.trim()? T.pop.querySelector('.tnd-lista [data-tnd-v]:not(.tnd-testa)') : null);
    if(b) _tndScegli(b.dataset.tndV); }
}

