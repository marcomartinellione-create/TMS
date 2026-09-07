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
    <div class="sec" style="margin-top:12px">${t('Dove preferisci mandarmela')}</div>
    <div class="modal__actions" style="flex-wrap:wrap;justify-content:flex-start;margin-top:6px">
      <button class="btn btn--ember" id="sg-github">🐙 ${t('GitHub')}</button>
      <button class="btn btn--gold" id="sg-ig">📷 ${t('Instagram')}</button>
      <span style="flex:1"></span>
      <button class="btn" id="sg-copia">📋 ${t('Copia')}</button>
      <button class="btn" id="sg-file">💾 ${t('Salva come file')}</button>
      <button class="btn" onclick="closeModal()">${t('Annulla')}</button>
    </div>
    <div class="muted" style="font-size:11.5px;margin-top:8px">${t('Su <b>GitHub</b> la segnalazione parte già compilata (serve un account gratuito). Con <b>Instagram</b> si apre il profilo: il testo viene copiato negli appunti, incollalo nel messaggio.')}</div>`);
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
  /* Instagram non accetta un messaggio nell'indirizzo: si copia prima il testo, così
     l'utente deve solo incollarlo — altrimenti arriverebbe al profilo a mani vuote */
  $g('sg-ig').onclick=async()=>{ const b=$g('sg-ig');
    const ok=await copiaTesto($g('sg-testo').value);
    b.textContent=ok?('✔ '+t('Copiato, apro Instagram')):('📷 '+t('Instagram'));
    setTimeout(()=>window.open('https://instagram.com/marco_the_wander','_blank','noopener'), ok?450:0); };
}
/* ════════════════ TACCUINO (solo per l'autore) ════════════════
   Si apre con 5 click sul ✦ accanto al titolo — il log errori usa lo stesso idioma ma
   sulla versione nel footer, così i due gesti non si pestano. Non è una funzione per
   l'utente finale: è il quaderno di Marco mentre usa l'app.

   Due elenchi, tenuti separati apposta:
   · LE MIE NOTE — scritte al volo, salvate nella cartella dati (taccuino.json). Vivono
     offline: è il loro senso, appuntare mentre si lavora senza dipendere dalla rete.
   · DA GITHUB — le issue aperte del repo, in SOLA LETTURA. Lo stato (aperta/chiusa,
     etichette) si cambia su GitHub, non qui: un elenco che rispecchia e basta non può
     divergere dalla realtà, mentre due liste con stati propri divergono sempre.
   L'ultima lettura resta salvata, così l'elenco si vede anche senza rete. */
const TACC_FILE='taccuino.json';
let TACC={note:[], github:{aggiornato:'', issues:[]}};
function taccNormalizza(o){
  return { note:Array.isArray(o&&o.note)?o.note:[],
    github:{ aggiornato:String((o&&o.github&&o.github.aggiornato)||''),
      issues:Array.isArray(o&&o.github&&o.github.issues)?o.github.issues:[] } };
}
async function taccLeggi(){
  if(dataDir){ try{ TACC=taccNormalizza(await readJson(dataDir,TACC_FILE)); return TACC; }catch(e){} }
  try{ TACC=taccNormalizza(JSON.parse(localStorage.getItem('tms-taccuino')||'{}')); }catch(e){ TACC=taccNormalizza(null); }
  return TACC;
}
async function taccSalva(){
  if(dataDir){ try{ await writeJson(dataDir,TACC_FILE,TACC); return true; }catch(e){ logErrore('taccuino', e); } }
  try{ localStorage.setItem('tms-taccuino',JSON.stringify(TACC)); return true; }catch(e){ return false; }
}
/* le issue si leggono senza account: il repo è pubblico. Solo su richiesta, mai
   all'avvio — l'accensione dell'app non deve dipendere dalla rete. */
async function taccScaricaIssues(){
  const url='https://api.github.com/repos/'+GH_REPO_URL.split('github.com/')[1]+'/issues?state=open&per_page=50';
  const r=await fetch(url,{headers:{'Accept':'application/vnd.github+json'}});
  if(!r.ok) throw new Error('GitHub ha risposto '+r.status+(r.status===403?' (troppe letture ravvicinate: riprova fra un po\')':''));
  const dati=await r.json();
  TACC.github={ aggiornato:new Date().toISOString(),
    issues:(Array.isArray(dati)?dati:[]).filter(x=>x&&!x.pull_request).map(x=>({
      n:x.number, titolo:String(x.title||''), url:String(x.html_url||''),
      etichette:(x.labels||[]).map(l=>String((l&&l.name)||'')).filter(Boolean),
      aperta:String(x.created_at||'').slice(0,10) })) };
  await taccSalva();
  return TACC.github.issues.length;
}
function taccRigaNota(n){
  return `<div class="box" style="padding:9px 11px;margin-bottom:7px">
    <div style="display:flex;gap:8px;align-items:flex-start">
      <span class="pill" style="flex:0 0 auto">${n.tipo==='idea'?'✦':'⚠'} ${esc(n.data||'')}</span>
      <div style="flex:1;min-width:0;white-space:pre-wrap">${esc(n.testo||'')}</div>
      <button class="btn btn--sm no-print" data-tacc-gh="${esc(n.id)}" title="Aprila come issue su GitHub">↗</button>
      <button class="btn btn--sm btn--danger no-print" data-tacc-del="${esc(n.id)}" title="Elimina la nota">✕</button>
    </div></div>`;
}
function taccRigaIssue(i){
  const et=(i.etichette||[]).map(e=>`<span class="pill" style="font-size:10px">${esc(e)}</span>`).join(' ');
  return `<div class="box" style="padding:9px 11px;margin-bottom:7px">
    <div style="display:flex;gap:8px;align-items:center">
      <span class="mono muted" style="flex:0 0 auto">#${i.n}</span>
      <a href="${esc(i.url)}" target="_blank" rel="noopener" style="flex:1;min-width:0">${esc(i.titolo)}</a>
      ${et}<span class="muted mono" style="font-size:10.5px">${esc(i.aperta||'')}</span>
    </div></div>`;
}
/* interfaccia in italiano soltanto: è uno strumento personale dell'autore, non una
   funzione dell'app — tradurla sarebbe lavoro speso per un pubblico di una persona */
function taccModal(){
  const note=TACC.note.slice().reverse();
  const iss=TACC.github.issues||[];
  const quando=TACC.github.aggiornato? new Date(TACC.github.aggiornato).toLocaleString('it-IT') : 'mai';
  modal(`<h3>📓 Taccuino <span class="pill">${note.length} note</span></h3>
    <div class="muted" style="font-size:12px;margin-bottom:10px">Il tuo quaderno di lavoro, dentro la cartella dati. Le note restano qui e funzionano offline; le issue si aprono e si chiudono <b>su GitHub</b> — qui sono solo rispecchiate.</div>
    <div class="field"><label>Nuova nota</label>
      <textarea id="tacc-testo" rows="2" style="width:100%" placeholder="es. il grafico ACWR non si aggiorna cambiando Training Set"></textarea></div>
    <div class="bar" style="margin:8px 0 14px">
      <select id="tacc-tipo" style="width:auto"><option value="bug">⚠ Non funziona</option><option value="idea">✦ Idea</option></select>
      <button class="btn btn--ember" id="tacc-add">＋ Aggiungi</button>
    </div>
    <div class="sec" style="margin-top:4px">Le mie note</div>
    <div id="tacc-note" style="max-height:230px;overflow:auto">${note.length?note.map(taccRigaNota).join(''):'<div class="empty" style="padding:18px">Nessuna nota. Scrivine una qui sopra.</div>'}</div>
    <div class="sec" style="display:flex;align-items:center">Da GitHub
      <span class="pill" style="margin-left:auto;text-transform:none">${iss.length} aperte · letto: ${esc(quando)}</span></div>
    <div class="bar" style="margin:0 0 8px"><button class="btn" id="tacc-sync">⟳ Aggiorna da GitHub</button>
      <span class="muted" id="tacc-sync-msg" style="font-size:12px"></span></div>
    <div id="tacc-iss" style="max-height:230px;overflow:auto">${iss.length?iss.map(taccRigaIssue).join(''):'<div class="empty" style="padding:18px">Nessuna issue letta finora. Premi «Aggiorna da GitHub».</div>'}</div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">Chiudi</button></div>`);
  const m=document.getElementById('modal'); if(m) m.style.maxWidth='720px';
  const ri=()=>{ closeModal(); taccModal(); };
  { const b=document.getElementById('tacc-add'); if(b) b.onclick=async()=>{
      const el=document.getElementById('tacc-testo'); const testo=(el.value||'').trim();
      if(!testo) return;
      TACC.note.push({ id:'n'+Date.now()+'-'+Math.random().toString(36).slice(2,6),
        data:new Date().toISOString().slice(0,10), tipo:document.getElementById('tacc-tipo').value, testo:testo });
      await taccSalva(); ri(); }; }
  document.querySelectorAll('[data-tacc-del]').forEach(b=>{ b.onclick=async()=>{
    TACC.note=TACC.note.filter(n=>n.id!==b.dataset.taccDel); await taccSalva(); ri(); }; });
  /* dalla nota alla issue: il ponte fra il quaderno e la lista ufficiale */
  document.querySelectorAll('[data-tacc-gh]').forEach(b=>{ b.onclick=()=>{
    const n=TACC.note.find(x=>x.id===b.dataset.taccGh); if(!n) return;
    const cap=n.testo.split('\n')[0].slice(0,70);
    window.open(segnUrlGitHub((n.tipo==='idea'?'[idea] ':'[bug] ')+cap,
      segnTesto({tipo:n.tipo==='idea'?'idea':'bug', cosa:n.testo, passi:'', gravita:'fastidio'})),'_blank','noopener'); }; });
  { const b=document.getElementById('tacc-sync'); if(b) b.onclick=async()=>{
      const msg=document.getElementById('tacc-sync-msg'); msg.textContent='lettura in corso…';
      try{ const n=await taccScaricaIssues(); msg.textContent=n+' issue lette'; setTimeout(ri,500); }
      catch(e){ msg.textContent='non riuscito: '+e.message; logErrore('taccuino/github', e); } }; }
}
/* appunti: l'API moderna può non esserci (o essere negata); si ripiega sul vecchio metodo */
async function copiaTesto(testo){
  try{ await navigator.clipboard.writeText(testo); return true; }catch(e){}
  try{ const ta=document.createElement('textarea'); ta.value=testo;
    ta.style.cssText='position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta); ta.select();
    const ok=document.execCommand('copy'); ta.remove(); return ok; }catch(e){ return false; }
}
