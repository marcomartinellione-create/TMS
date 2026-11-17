let profOpen=null, profParamCache={}, profBkAperto=false;
/* quanto c'è nel profilo aperto, a colpo d'occhio (pannello laterale del tab Profilo) */
function riepilogoProfiloAperto(){
  const st=DOC.storico||[], sett=new Set(st.map(r=>+r.scheda).filter(Boolean));
  const ult=sett.size? Math.max(...sett) : 0, io=DOC.storico_io||[], S=(DOC.scheda&&DOC.scheda.setsOrdine)||[];
  const R=(a,b)=>`<div class="lat-num"><span>${a}</span><b>${b}</b></div>`;
  return `<div class="lat"><h4>${esc(profNome()||'—')} <span class="muted">${t('profilo aperto')}</span></h4>
    ${R(t('Settimane di allenamento salvate'), sett.size)}
    ${ult? R(t('Ultima settimana salvata'), esc(schedaLabel(ult))) : ''}
    ${R(t('Righe nello Storico'), st.length)}
    ${R(t('Misure corporee'), io.length+(io.length? ' <span class="muted" style="font-weight:400">· '+esc(schedaLabel(io[io.length-1].scheda))+'</span>' : ''))}
    ${R(t('Attività cardio'), (DOC.cardio||[]).length)}
    ${R(t('Foto progressi'), (DOC.foto||[]).length)}
    ${R('Training Set', S.length? esc(S.join(', ')) : '—')}
    ${R(t('Periodi alimentari'), (((DOC.alimentazione||{}).periodi)||[]).length)}</div>`;
}
function renderProfilo(){
  profParamCache[activeProfile]=DOC.dati_utente;
  const FL={epley:'Epley',brzycki:'Brzycki',lombardi:'Lombardi',media:t('Media')};
  const items=profili.map(p=>{
    const isAct=p.slug===activeProfile, open=profOpen===p.slug, u=profParamCache[p.slug];
    let body='';
    if(open){
      if(u){
        body=`<div class="cards" style="margin-top:8px">
          <div class="card"><div class="card__k">${t('Sesso')}</div><div class="card__v">${esc(u.sesso||'—')}</div></div>
          <div class="card"><div class="card__k">${t('Data di nascita')}</div><div class="card__v" style="font-size:17px">${u.nascita?new Date(u.nascita).toLocaleDateString(LANG==='en'?'en-GB':'it-IT'):'—'}</div><div class="card__sub">${etaOf(u)?etaOf(u)+' '+t('anni'):''}</div></div>
          <div class="card"><div class="card__k">${t('Altezza')}</div><div class="card__v">${u.altezza?nf(u.altezza,0):'—'}<small> cm</small></div></div>
          <div class="card"><div class="card__k">${t('Esperienza')}</div><div class="card__v" style="font-size:17px">${ESPERIENZE.includes(u.esperienza)?esc(t(ESP_NOME[u.esperienza])):'—'}</div></div>
          <div class="card ${u.useRir?'k--ember':''}"><div class="card__k">${t('RIR nei calcoli')}</div><div class="card__v" style="font-size:18px">${u.useRir?t('Sì'):t('No')}</div></div>
          <div class="card ${u.useRpe?'k--ember':''}"><div class="card__k">Session-RPE</div><div class="card__v" style="font-size:18px">${u.useRpe?t('Sì'):t('No')}</div></div>
          <div class="card"><div class="card__k">${t('Formula 1RM')}</div><div class="card__v" style="font-size:17px">${FL[u.e1rm||'epley']}</div></div>
        </div>
        <div class="bar no-print" style="margin-top:8px">
          ${isAct?`<span class="muted" style="align-self:center">${t('profilo attivo')}</span>`:`<button class="btn btn--ember" data-pact="${esc(p.slug)}">${t('Attiva')}</button>`}
          <button class="btn" data-pedit="${esc(p.slug)}">${ico('matita')}${t('Modifica parametri')}</button>
          <button class="btn" data-pren="${esc(p.slug)}">${ico('matita')}${t('Rinomina')}</button>
          ${profili.length>1?`<button class="btn btn--danger" data-pdel="${esc(p.slug)}">${ico('x')}${t('Elimina')}</button>`:''}
        </div>`;
      } else { body=`<div class="muted" style="padding:8px">${t('Caricamento parametri…')}</div>`; }
    }
    return `<div class="prof-item" style="border:1px solid var(--border);border-radius:var(--r-sm);margin-bottom:8px;background:${isAct?'var(--gold-t)':'var(--paper-2)'}">
      <div data-popen="${esc(p.slug)}" style="display:flex;align-items:center;gap:10px;padding:11px 13px;cursor:pointer">
        <span style="display:inline-flex;color:var(--ink-3)">${ico(open?'giu':'avanti','p')}</span>
        <span class="cr-led" id="cr-led-${esc(p.slug)}" style="font-size:13px;color:var(--ink-4);flex:0 0 auto" title="Stato in calcolo…">●</span>
        <div style="flex:1;min-width:0">
          <div style="font-family:var(--font-disp);font-size:17px;display:flex;align-items:center;gap:7px">${ico('utente')}${esc(p.nome)}${isAct?` <span class="pill">${t('attivo')}</span>`:''}</div>
          <div class="muted" id="cr-sum-${esc(p.slug)}" style="font-size:11.5px;margin-top:2px">…</div>
          ${p.creato?`<div class="muted mono" style="font-size:10.5px;margin-top:1px">${t('creato il')} ${esc(p.creato)}</div>`:''}
        </div>
        <span class="gruppo no-print" title="${t('Archivi del profilo')}">
          <button class="btn" data-parch="storico" data-pslug="${esc(p.slug)}" ${isAct?'id="lnk-storico"':''} title="${t('Tutte le settimane di allenamento salvate')}">${isAct?'<span id="dot-storico" class="prof-dot">●</span> ':''}${ico('rotolo','p')}${t('Storico')}</button>
          <button class="btn" data-parch="storicocorpo" data-pslug="${esc(p.slug)}" ${isAct?'id="lnk-misure"':''} title="${t('Tutte le misure corporee salvate')}">${isAct?'<span id="dot-misure" class="prof-dot">●</span> ':''}${ico('corpo','p')}${t('Misure')}</button>
        </span>
      </div>${open?`<div style="padding:0 13px 12px">${body}</div>`:''}</div>`;
  }).join('');
  document.getElementById('panel-profilo').innerHTML=`
   <div class="bar"><div class="field" style="flex:1"><label>${t('Profili')}</label>
     <div style="font-family:var(--font-disp);font-size:20px;color:var(--ember-2);display:flex;align-items:center;gap:8px">${ico('utente')}${profili.length} ${t(profili.length===1?'profilo':'profili')}</div></div>
     <button class="btn btn--ember no-print" id="prof-new">${t('＋ Nuovo profilo')}</button></div>
   <div class="pag"><div class="pag__main">
   ${items||`<div class="empty">${t('Nessun profilo.')}</div>`}
   </div><aside class="pag__side no-print">${riepilogoProfiloAperto()}
   <div class="sec no-print" style="margin-top:4px">${t('Backup (tutti i profili insieme)')}</div>
   <div class="bar no-print"><button class="btn" id="prof-backup" title="${t('Esporta i dati di TUTTI i profili in un file')}">${ico('scarica')}${t('Backup dati')}</button> <button class="btn" id="prof-backup-full" title="${t('Come il backup dati, ma con dentro anche le immagini delle foto progressi')}">${ico('scarica')}${t('Backup completo (con foto)')}</button> <label class="btn" style="cursor:pointer" title="${t('Importa un backup')}">${ico('carica')}${t('Ripristina')}<input type="file" id="prof-restore" accept="application/json,.json" style="display:none"></label></div>
   <div class="callout callout--info no-print" style="margin-top:8px"><div>${t('Il <b>Backup dati</b> contiene schede, storico, misure e alimentazione, ma delle foto progressi porta solo i riferimenti: ripristinandolo su un altro PC le immagini mancherebbero. Usa il <b>Backup completo</b> per portarti dietro anche le foto (file più grande). I <b>video</b> non entrano in nessuno dei due: si riscaricano con l\'app.')}</div></div>
   <div class="no-print" id="prof-autobk" style="margin-top:8px"></div>
   </aside></div>`;
  /* Storico e Misure nella riga di ogni profilo: se non è quello attivo, prima lo si attiva */
  document.querySelectorAll('#panel-profilo [data-parch]').forEach(b=>b.onclick=async ev=>{ if(ev) ev.stopPropagation();
    const slug=b.dataset.pslug, dove=b.dataset.parch; if(slug!==activeProfile){ await switchProfile(slug); } showTab(dove); });
  updateStatusDots();   /* i pallini verde/rosso accanto a Storico e Misure */
  { const pn=document.getElementById('prof-new'); if(pn) pn.onclick=()=>chiediTesto(t('Nuovo profilo (atleta/cliente)'),'',v=>{ const n=(v||'').trim(); if(!n)return; createProfile(n); }); }
  { const bk=document.getElementById('prof-backup'); if(bk) bk.onclick=()=>backupData(false); }
  { const bf=document.getElementById('prof-backup-full'); if(bf) bf.onclick=()=>backupData(true); }
  { const rs=document.getElementById('prof-restore'); if(rs) rs.onchange=e=>{ if(e.target.files&&e.target.files[0]){ restoreData(e.target.files[0]); e.target.value=''; } }; }
  /* backup automatici (e copie fatte prima di un ripristino): un solo pulsante; aperto, mostra
     tutte le copie con il loro «ripristina». Resta aperto/chiuso fra un ridisegno e l'altro. */
  { const ab=document.getElementById('prof-autobk');
    if(ab) Promise.all([listaBackupAutomatici().catch(()=>[]), listaCopieDiSicurezza().catch(()=>[])]).then(([l,ls])=>{
      if(!ab.isConnected) return;
      l=l||[]; ls=ls||[];
      const voce=(x,ora)=>`<span class="pill">${esc(x.data||'?')}${ora&&x.ora?' '+esc(x.ora):''} · <a href="#" data-autobk="${esc(x.file)}" style="color:var(--ember-2)">${t('ripristina')}</a></span>`;
      ab.innerHTML=`<button class="btn" id="prof-autobk-btn" aria-expanded="${profBkAperto?'true':'false'}">${ico('salva','p')}${t('Backup automatici')} <span class="pill">${l.length+ls.length}</span><span class="bk-freccia">${ico(profBkAperto?'su':'giu','p')}</span></button>
        <div id="prof-autobk-lista" class="prof-bk-lista"${profBkAperto?'':' hidden'}>
          <div class="muted" style="font-size:11.5px;margin-bottom:2px;flex-basis:100%">${t('Uno a settimana, fatti dall\'app da sola (ultime')} ${AUTOBK_MAX} ${t('copie in')} <span class="mono">TMS_Dati/${AUTOBK_DIR}/</span>).</div>
          ${l.length? l.map(x=>voce(x,false)).join(' ') : `<span class="muted" style="font-size:12px">${t('Ancora nessuna copia.')}</span>`}
          ${ls.length?`<div style="margin-top:7px;font-size:12px;flex-basis:100%">${t('<b>Prima dell\'ultimo ripristino</b> (per tornare indietro):')} ${ls.map(x=>voce(x,true)).join(' ')}</div>`:''}
        </div>`;
      const bt=document.getElementById('prof-autobk-btn'), li=document.getElementById('prof-autobk-lista');
      bt.onclick=()=>{ profBkAperto=!profBkAperto; li.hidden=!profBkAperto; bt.setAttribute('aria-expanded', profBkAperto?'true':'false');
        { const fr=bt.querySelector('.bk-freccia'); if(fr) fr.innerHTML=ico(profBkAperto?'su':'giu','p'); } };
      ab.querySelectorAll('[data-autobk]').forEach(a=>a.onclick=ev=>{ ev.preventDefault(); ripristinaBackupAutomatico(a.dataset.autobk); });
    }); }
  document.querySelectorAll('#panel-profilo [data-popen]').forEach(h=>h.onclick=()=>{
    const slug=h.dataset.popen; profOpen = profOpen===slug ? null : slug; renderProfilo();
    if(profOpen && !profParamCache[profOpen]){ const want=profOpen;
      getProfileData(want).then(d=>{ profParamCache[want]=d.dati_utente||{}; if(profOpen===want) renderProfilo(); }).catch(()=>{ profParamCache[want]={}; if(profOpen===want) renderProfilo(); }); }
  });
  document.querySelectorAll('#panel-profilo [data-pact]').forEach(b=>b.onclick=()=>switchProfile(b.dataset.pact));
  document.querySelectorAll('#panel-profilo [data-pedit]').forEach(b=>b.onclick=async()=>{ const slug=b.dataset.pedit; if(slug!==activeProfile){ await switchProfile(slug); } anagraficaModal(); });
  document.querySelectorAll('#panel-profilo [data-pren]').forEach(b=>b.onclick=()=>renameProfile(b.dataset.pren));
  document.querySelectorAll('#panel-profilo [data-pdel]').forEach(b=>b.onclick=()=>deleteProfile(b.dataset.pdel));
  aggiornaSemafori();  /* dipinge il semaforo di rischio su ogni riga profilo (async, sola lettura) */
}

function anagraficaModal(){
  const u=DOC.dati_utente; const act=profili.find(p=>p.slug===activeProfile)||{};
  modal(`<h3>${t('Modifica anagrafica')}</h3>
    <div class="field"><label>${t('Nome')}</label><input id="m-nome" value="${esc(u.nome||act.nome||'')}"></div>
    <div class="row"><div class="field"><label>${t('Sesso')}</label><select id="m-sesso"><option value="M"${(u.sesso||'')==='M'?' selected':''}>M</option><option value="F"${(u.sesso||'')==='F'?' selected':''}>F</option></select></div>
      <div class="field"><label>${t('Altezza (cm)')}</label><input id="m-altezza" type="number" value="${u.altezza??''}"></div></div>
    <div class="field"><label>${t('Data di nascita')}</label><input id="m-nascita" type="date" value="${esc(u.nascita||'')}"></div>
    <div class="field"><label>${t('Esperienza di allenamento')}</label><select id="m-esperienza"><option value="">—</option>${ESPERIENZE.map(e=>`<option value="${e}"${u.esperienza===e?' selected':''}>${esc(t(ESP_NOME[e]))}</option>`).join('')}</select>
      <div class="lat-nota" style="margin-top:4px">${t('Sceglie il riferimento della ragnatela «distribuzione fra i gruppi», insieme al tipo di allenamento del Training Set (barra Pesi).')}</div></div>
    <div class="field"><label>${t('Calcoli')}</label>
    <label class="optchk" style="display:flex;align-items:flex-start;gap:8px;cursor:pointer"><input type="checkbox" id="m-userir" style="width:auto;flex:0 0 auto;margin-top:2px" ${u.useRir?'checked':''}> <span>${t('Considera il <b>RIR</b> nei calcoli (1RM / %1RM / TL effort-aware)')}</span></label>
    <label class="optchk" style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;margin-top:7px"><input type="checkbox" id="m-userpe" style="width:auto;flex:0 0 auto;margin-top:2px" ${u.useRpe?'checked':''}> <span>${t('Abilita il <b>Session-RPE</b> / carico interno (RPE × durata per giorno · Foster)')}</span></label></div>
    <div class="field"><label>${t('Formula 1RM stimato')}</label><select id="m-e1rm"><option value="epley"${(u.e1rm||'epley')==='epley'?' selected':''}>${t('Epley (default)')}</option><option value="brzycki"${u.e1rm==='brzycki'?' selected':''}>Brzycki</option><option value="lombardi"${u.e1rm==='lombardi'?' selected':''}>Lombardi</option><option value="media"${u.e1rm==='media'?' selected':''}>${t('Media delle 3')}</option></select></div>
    <div class="field"><label>${t('Cardio · frequenza cardiaca')} <span class="muted" style="text-transform:none;font-family:var(--font-body)">${t('— migliorano il TRIMP delle attività cardio')}</span></label>
      <div class="row" style="margin-top:4px"><div class="field"><label>${t('FC a riposo (bpm)')}</label><input id="m-fcrip" type="number" min="0" value="${u.fcRiposo??''}" placeholder="60"></div>
        <div class="field"><label>${t('FC max (bpm)')} <span class="muted" style="text-transform:none">${t('vuota = stimata')}</span></label><input id="m-fcmax" type="number" min="0" value="${u.fcMax??''}" placeholder="${(()=>{const e=etaOf(u);return e?Math.round(208-0.7*e):'';})()}"></div></div></div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">${t('Annulla')}</button><button class="btn btn--ember" id="m-ok">${t('Salva')}</button></div>`);
  document.getElementById('m-ok').onclick=()=>{ const nome=document.getElementById('m-nome').value.trim();
    u.nome=nome; u.sesso=document.getElementById('m-sesso').value;
    u.altezza=document.getElementById('m-altezza').value===''?'':+document.getElementById('m-altezza').value;
    u.nascita=document.getElementById('m-nascita').value;
    { const e=document.getElementById('m-esperienza').value; if(ESPERIENZE.includes(e)) u.esperienza=e; else delete u.esperienza; }
    u.useRir=document.getElementById('m-userir').checked;
    u.useRpe=document.getElementById('m-userpe').checked;
    u.e1rm=document.getElementById('m-e1rm').value;
    u.fcRiposo=document.getElementById('m-fcrip').value===''?'':+document.getElementById('m-fcrip').value;
    u.fcMax=document.getElementById('m-fcmax').value===''?'':+document.getElementById('m-fcmax').value;
    const p=profili.find(x=>x.slug===activeProfile); if(p&&nome)p.nome=nome;
    persist('corpo'); persist('profili'); closeModal(); renderProfilo(); };
}

