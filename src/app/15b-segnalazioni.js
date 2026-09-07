/* ════════════════ SEGNALAZIONI (bug e idee) ════════════════
   Pulsante 🐞 fisso in basso a sinistra (la Guida sta a destra). Nasce dall'idea usata
   in Movienaitor, ma qui il destinatario è diverso: il TMS è un progetto pubblico su
   GitHub, non una cartella condivisa fra amici. Quindi la segnalazione si può aprire
   come issue GitHub già compilata, copiare negli appunti o salvare come file — chi non
   ha un account GitHub non resta a piedi.

   Il valore vero non è il modulo: è la SCHEDA TECNICA che l'app allega da sola
   (versione, sistema, modalità dati, tab aperto, ultimi errori interni). Senza, le
   segnalazioni arrivano come «non funziona» e non sono diagnosticabili.

   PRIVACY: il testo completo si vede PRIMA di inviarlo, in un riquadro modificabile.
   Non si spedisce niente da soli: nessuna chiamata di rete parte da qui. */

const SEGN_TIPI=[
  {k:'bug',  ic:'⚠', lab:'Qualcosa non funziona'},
  {k:'idea', ic:'✦', lab:'Proposta o idea'}
];
const SEGN_GRAVITA=[
  {k:'blocca',   lab:'Mi blocca: non posso proseguire'},
  {k:'fastidio', lab:'Dà fastidio ma si aggira'},
  {k:'dettaglio',lab:'Dettaglio minore'}
];

/* dove sono i dati e come: serve a capire subito se è desktop o browser */
function segnModalita(){
  if(typeof window!=='undefined' && window.tmsFS) return 'desktop (dati locali)';
  if(typeof dirHandle!=='undefined' && dirHandle) return 'browser (cartella collegata)';
  return 'browser (nessuna cartella)';
}
function segnTabAttivo(){
  const b=document.querySelector('.tab.is-active');
  return b? b.textContent.trim().replace(/\s+/g,' ') : '—';
}
/* ultimi errori interni: la parte che rende una segnalazione diagnosticabile */
function segnUltimiErrori(n){
  const v=LOG_ERRORI.slice(-(n||5));
  if(!v.length) return t('nessuno registrato in questa sessione');
  return '\n'+v.map(x=>'  · '+x.t+'  ['+x.dove+']  '+x.msg).join('\n');
}
function segnSchedaTecnica(){
  const nav=(typeof navigator!=='undefined'&&navigator)||{};
  return [
    'TMS v'+APP_VERSION+' ('+APP_DATE+')',
    t('Modalità')+': '+segnModalita(),
    t('Sistema')+': '+String(nav.platform||'?')+' · '+String(nav.language||'?'),
    t('Tab aperto')+': '+segnTabAttivo(),
    t('Profili')+': '+((typeof profili!=='undefined'&&profili)?profili.length:'?'),
    t('Ultimi errori interni')+': '+segnUltimiErrori(5)
  ].join('\n');
}
/* il testo che l'utente vede, controlla e manda */
function segnTesto(d){
  const tipo=(SEGN_TIPI.find(x=>x.k===d.tipo)||SEGN_TIPI[0]);
  const grav=SEGN_GRAVITA.find(x=>x.k===d.gravita);
  return [
    '### '+tipo.ic+' '+t(tipo.lab),
    '',
    '**'+t('Cosa succede')+'**',
    d.cosa||t('(non descritto)'),
    '',
    '**'+t('Come farlo succedere di nuovo')+'**',
    d.passi||t('(non indicato)'),
    ...(d.tipo==='bug'&&grav? ['', '**'+t('Quanto pesa')+'**: '+t(grav.lab)] : []),
    '',
    '---',
    '```',
    segnSchedaTecnica(),
    '```'
  ].join('\n');
}
/* GitHub accetta title/body nell'indirizzo, ma l'indirizzo ha un limite pratico:
   oltre ~6000 caratteri alcuni browser lo troncano in silenzio. Meglio accorciare noi
   e dirlo, che spedire una segnalazione mutilata senza accorgersene. */
const SEGN_URL_MAX=6000;
function segnUrlGitHub(titolo, corpo){
  const base=GH_REPO_URL+'/issues/new';
  let c=corpo;
  for(let g=0; g<6; g++){
    const u=base+'?title='+encodeURIComponent(titolo)+'&body='+encodeURIComponent(c);
    if(u.length<=SEGN_URL_MAX) return u;
    c=c.slice(0, Math.max(200, Math.floor(c.length*0.7)))+'\n…'+t('(testo accorciato: incolla il resto a mano)');
  }
  return base+'?title='+encodeURIComponent(titolo);
}
function segnalaModal(){
  /* flex-direction:row esplicito: .field impone la colonna e il pallino finirebbe
     SOPRA l'etichetta invece che di fianco */
  const opzTipo=SEGN_TIPI.map(x=>`<label class="field optchk" style="display:flex;flex-direction:row;align-items:center;gap:8px;margin:5px 0">
      <input type="radio" name="sg-tipo" value="${x.k}"${x.k==='bug'?' checked':''} style="width:auto;flex:0 0 auto"><span>${x.ic} ${t(x.lab)}</span></label>`).join('');
  const opzGrav=SEGN_GRAVITA.map(x=>`<option value="${x.k}">${t(x.lab)}</option>`).join('');
  modal(`<h3>🐞 ${t('Segnala')}</h3>
    <div class="muted" style="font-size:12.5px;margin-bottom:10px">${t('Serve a migliorare il TMS. L\'app allega da sola versione, sistema e ultimi errori: sono quelli che permettono di capire il problema. Vedi il testo completo prima di mandarlo — <b>niente parte da solo</b>.')}</div>
    ${opzTipo}
    <div class="field" style="margin-top:10px"><label>${t('Cosa succede')}</label>
      <textarea id="sg-cosa" rows="3" style="width:100%" placeholder="${esc(t('es. Salvo la scheda nello Storico e il TL della settimana resta a zero'))}"></textarea></div>
    <div class="field" style="margin-top:8px"><label>${t('Come farlo succedere di nuovo')}</label>
      <textarea id="sg-passi" rows="2" style="width:100%" placeholder="${esc(t('es. tab Pesi → compilo 3 righe → 💾 Salva nello Storico'))}"></textarea></div>
    <div class="field" id="sg-grav-box" style="margin-top:8px"><label>${t('Quanto pesa')}</label>
      <select id="sg-gravita" style="width:100%">${opzGrav}</select></div>
    <div class="field" style="margin-top:10px"><label>${t('Testo che verrà mandato (puoi modificarlo)')}</label>
      <textarea id="sg-testo" rows="9" style="width:100%;font-family:var(--font-mono);font-size:11px"></textarea></div>
    <div class="modal__actions" style="flex-wrap:wrap">
      <button class="btn" onclick="closeModal()">${t('Annulla')}</button>
      <button class="btn" id="sg-file">💾 ${t('Salva come file')}</button>
      <button class="btn" id="sg-copia">📋 ${t('Copia')}</button>
      <button class="btn btn--ember" id="sg-github">${t('Apri su GitHub ↗')}</button>
    </div>
    <div class="muted" style="font-size:11.5px;margin-top:8px">${t('Su GitHub serve un account (gratuito). Senza, copia il testo o salvalo e mandamelo su Instagram:')} <a href="https://instagram.com/marco_the_wander" target="_blank" rel="noopener">@marco_the_wander</a></div>`);
  const m=document.getElementById('modal'); if(m) m.style.maxWidth='640px';
  const $g=id=>document.getElementById(id);
  const leggi=()=>({
    tipo:(document.querySelector('input[name="sg-tipo"]:checked')||{}).value||'bug',
    cosa:($g('sg-cosa').value||'').trim(),
    passi:($g('sg-passi').value||'').trim(),
    gravita:$g('sg-gravita').value
  });
  /* l'anteprima si riscrive da sola finché l'utente non la modifica a mano:
     da lì in poi comanda lui, altrimenti gli si cancellerebbe quello che scrive */
  let toccato=false;
  const aggiorna=()=>{ if(!toccato) $g('sg-testo').value=segnTesto(leggi());
    const d=leggi(); $g('sg-grav-box').style.display=(d.tipo==='bug')?'':'none'; };
  ['sg-cosa','sg-passi','sg-gravita'].forEach(id=>{ const e=$g(id); if(e) e.oninput=e.onchange=aggiorna; });
  document.querySelectorAll('input[name="sg-tipo"]').forEach(r=>{ r.onchange=aggiorna; });
  $g('sg-testo').oninput=()=>{ toccato=true; };
  aggiorna();
  const titolo=()=>{ const d=leggi(); const cap=(d.cosa||t('Segnalazione')).split('\n')[0].trim();
    return (d.tipo==='bug'?'[bug] ':'[idea] ')+(cap.length>70?cap.slice(0,70)+'…':cap); };
  $g('sg-copia').onclick=async()=>{ const b=$g('sg-copia');
    const ok=await copiaTesto($g('sg-testo').value);
    b.textContent=ok?('✔ '+t('Copiato')):('⚠ '+t('Copia a mano dal riquadro')); };
  $g('sg-file').onclick=()=>{
    const blob=new Blob([$g('sg-testo').value],{type:'text/markdown'});
    const u=URL.createObjectURL(blob), a=document.createElement('a');
    a.download='TMS-segnalazione-'+new Date().toISOString().slice(0,10)+'.md'; a.href=u;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ try{URL.revokeObjectURL(u);}catch(e){} a.remove(); },600);
  };
  $g('sg-github').onclick=()=>{ window.open(segnUrlGitHub(titolo(), $g('sg-testo').value),'_blank','noopener'); };
}
/* appunti: l'API moderna può non esserci (o essere negata); si ripiega sul vecchio metodo */
async function copiaTesto(testo){
  try{ await navigator.clipboard.writeText(testo); return true; }catch(e){}
  try{ const ta=document.createElement('textarea'); ta.value=testo;
    ta.style.cssText='position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta); ta.select();
    const ok=document.execCommand('copy'); ta.remove(); return ok; }catch(e){ return false; }
}
