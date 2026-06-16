let profOpen=null, profParamCache={};
function renderProfilo(){
  profParamCache[activeProfile]=DOC.dati_utente;
  const FL={epley:'Epley',brzycki:'Brzycki',lombardi:'Lombardi',media:'Media'};
  const items=profili.map(p=>{
    const isAct=p.slug===activeProfile, open=profOpen===p.slug, u=profParamCache[p.slug];
    let body='';
    if(open){
      if(u){
        body=`<div class="cards" style="margin-top:8px">
          <div class="card"><div class="card__k">Sesso</div><div class="card__v">${esc(u.sesso||'—')}</div></div>
          <div class="card"><div class="card__k">Data di nascita</div><div class="card__v" style="font-size:17px">${u.nascita?new Date(u.nascita).toLocaleDateString('it-IT'):'—'}</div><div class="card__sub">${etaOf(u)?etaOf(u)+' anni':''}</div></div>
          <div class="card"><div class="card__k">Altezza</div><div class="card__v">${u.altezza?nf(u.altezza,0):'—'}<small> cm</small></div></div>
          <div class="card ${u.useRir?'k--ember':''}"><div class="card__k">RIR nei calcoli</div><div class="card__v" style="font-size:18px">${u.useRir?'Sì':'No'}</div></div>
          <div class="card ${u.useRpe?'k--ember':''}"><div class="card__k">Session-RPE</div><div class="card__v" style="font-size:18px">${u.useRpe?'Sì':'No'}</div></div>
          <div class="card"><div class="card__k">Formula 1RM</div><div class="card__v" style="font-size:17px">${FL[u.e1rm||'epley']}</div></div>
          <div class="card"><div class="card__k">Fase alimentare</div><div class="card__v" style="font-size:17px">${FASE_LAB[u.faseAlim]||'Bulk'}</div></div>
        </div>
        <div class="bar no-print" style="margin-top:8px">
          ${isAct?'<span class="muted" style="align-self:center">profilo attivo</span>':`<button class="btn btn--ember" data-pact="${esc(p.slug)}">Attiva</button>`}
          <button class="btn" data-pedit="${esc(p.slug)}">✎ Modifica parametri</button>
          <button class="btn" data-pren="${esc(p.slug)}">✏ Rinomina</button>
          ${profili.length>1?`<button class="btn btn--danger" data-pdel="${esc(p.slug)}">✕ Elimina</button>`:''}
        </div>`;
      } else { body='<div class="muted" style="padding:8px">Caricamento parametri…</div>'; }
    }
    return `<div class="prof-item" style="border:1px solid var(--border);border-radius:7px;margin-bottom:8px;background:${isAct?'var(--gold-t)':'var(--paper-2)'}">
      <div data-popen="${esc(p.slug)}" style="display:flex;align-items:center;gap:10px;padding:11px 13px;cursor:pointer">
        <span style="font-family:var(--font-mono)">${open?'▾':'▸'}</span>
        <span style="font-family:var(--font-disp);font-size:17px">👤 ${esc(p.nome)}</span>
        ${isAct?'<span class="pill">attivo</span>':''}
        <span style="flex:1"></span>
        <button class="btn no-print" data-pexs="${esc(p.slug)}" style="font-size:12px;padding:4px 10px" title="Crea la pagina HTML con la scheda di ${esc(p.nome)} da inviare al cliente">📤 Esporta scheda</button>
        <label class="btn no-print" style="cursor:pointer;font-size:12px;padding:4px 10px" title="Importa nel profilo di ${esc(p.nome)} il file di rientro compilato dal cliente">📥 Importa rientro<input type="file" data-prin="${esc(p.slug)}" accept="application/json,.json" style="display:none"></label>
        <span class="muted mono" style="font-size:11px">${esc(p.creato||'')}</span>
      </div>${open?`<div style="padding:0 13px 12px">${body}</div>`:''}</div>`;
  }).join('');
  document.getElementById('panel-profilo').innerHTML=`
   <div class="bar"><div class="field" style="flex:1"><label>Profili</label>
     <div style="font-family:var(--font-disp);font-size:20px;color:var(--ember-2)">👤 ${profili.length} profil${profili.length===1?'o':'i'}</div></div>
     <button class="btn btn--ember no-print" id="prof-new">＋ Nuovo profilo</button></div>
   <div class="callout callout--info"><div>Clicca un profilo per vederne i <b>parametri</b> (✎ per cambiarli). I bottoni nella riga sono lo <b>scambio scheda ↔ cliente</b> di quel profilo — <b>📤 Esporta scheda</b> crea la pagina compilabile da mandargli, <b>📥 Importa rientro</b> registra il file che ti rimanda. ${dataDir?`Dati in <span class="mono">${esc(SUBDIR)}/&lt;profilo&gt;/</span>.`:'Connetti una cartella (in alto) per salvarli su disco.'}</div></div>
   ${items||'<div class="empty">Nessun profilo.</div>'}
   <div class="sec no-print" style="margin-top:14px">▌ Backup (tutti i profili insieme)</div>
   <div class="bar no-print"><button class="btn" id="prof-backup" title="Esporta i dati di TUTTI i profili in un file">⭳ Backup dati</button> <label class="btn" style="cursor:pointer" title="Importa un backup">⭱ Ripristina<input type="file" id="prof-restore" accept="application/json,.json" style="display:none"></label></div>
   <div class="muted no-print" id="prof-autobk" style="font-size:12px;margin-top:6px">🛟 …</div>`;
  { const pn=document.getElementById('prof-new'); if(pn) pn.onclick=()=>chiediTesto('Nuovo profilo (atleta/cliente)','',v=>{ const n=(v||'').trim(); if(!n)return; createProfile(n); }); }
  { const bk=document.getElementById('prof-backup'); if(bk) bk.onclick=backupData; }
  { const rs=document.getElementById('prof-restore'); if(rs) rs.onchange=e=>{ if(e.target.files&&e.target.files[0]){ restoreData(e.target.files[0]); e.target.value=''; } }; }
  /* scambio scheda nella riga del profilo: il click non apre/chiude la tendina e,
     se il profilo non è quello attivo, l'app lo attiva prima */
  document.querySelectorAll('#panel-profilo [data-pexs]').forEach(b=>b.onclick=async ev=>{ if(ev) ev.stopPropagation(); const slug=b.dataset.pexs; if(slug!==activeProfile){ await switchProfile(slug); } await esportaSchedaCliente(); });
  document.querySelectorAll('#panel-profilo [data-prin]').forEach(inp=>{ const lab=inp.closest('label'); if(lab) lab.onclick=ev=>ev.stopPropagation();
    inp.onchange=async e=>{ const f=e.target.files&&e.target.files[0]; if(!f) return; e.target.value=''; const slug=inp.dataset.prin; if(slug!==activeProfile){ await switchProfile(slug); } importaRientroFile(f); }; });
  { const ab=document.getElementById('prof-autobk');
    if(ab) listaBackupAutomatici().then(l=>{
      if(!ab.isConnected) return;
      if(!l.length){ ab.innerHTML='🛟 <b>Backup automatici</b>: l\'app ne crea uno a settimana da sola (ultime '+AUTOBK_MAX+' copie in <span class="mono">TMS_Dati/'+AUTOBK_DIR+'/</span>).'; return; }
      ab.innerHTML='🛟 <b>Backup automatici</b> (uno a settimana, ultime '+AUTOBK_MAX+' copie): '+
        l.map(x=>`<span class="pill">${esc(x.data||'?')} · <a href="#" data-autobk="${esc(x.file)}" style="color:var(--ember-2)">ripristina</a></span>`).join(' ');
      ab.querySelectorAll('[data-autobk]').forEach(a=>a.onclick=ev=>{ ev.preventDefault(); ripristinaBackupAutomatico(a.dataset.autobk); });
    }).catch(()=>{}); }
  document.querySelectorAll('#panel-profilo [data-popen]').forEach(h=>h.onclick=()=>{
    const slug=h.dataset.popen; profOpen = profOpen===slug ? null : slug; renderProfilo();
    if(profOpen && !profParamCache[profOpen]){ const want=profOpen;
      getProfileData(want).then(d=>{ profParamCache[want]=d.dati_utente||{}; if(profOpen===want) renderProfilo(); }).catch(()=>{ profParamCache[want]={}; if(profOpen===want) renderProfilo(); }); }
  });
  document.querySelectorAll('#panel-profilo [data-pact]').forEach(b=>b.onclick=()=>switchProfile(b.dataset.pact));
  document.querySelectorAll('#panel-profilo [data-pedit]').forEach(b=>b.onclick=async()=>{ const slug=b.dataset.pedit; if(slug!==activeProfile){ await switchProfile(slug); } anagraficaModal(); });
  document.querySelectorAll('#panel-profilo [data-pren]').forEach(b=>b.onclick=()=>renameProfile(b.dataset.pren));
  document.querySelectorAll('#panel-profilo [data-pdel]').forEach(b=>b.onclick=()=>deleteProfile(b.dataset.pdel));
}

function anagraficaModal(){
  const u=DOC.dati_utente; const act=profili.find(p=>p.slug===activeProfile)||{};
  modal(`<h3>Modifica anagrafica</h3>
    <div class="field"><label>Nome</label><input id="m-nome" value="${esc(u.nome||act.nome||'')}"></div>
    <div class="row"><div class="field"><label>Sesso</label><select id="m-sesso"><option value="M"${(u.sesso||'')==='M'?' selected':''}>M</option><option value="F"${(u.sesso||'')==='F'?' selected':''}>F</option></select></div>
      <div class="field"><label>Altezza (cm)</label><input id="m-altezza" type="number" value="${u.altezza??''}"></div></div>
    <div class="field"><label>Data di nascita</label><input id="m-nascita" type="date" value="${esc(u.nascita||'')}"></div>
    <div class="field"><label>Calcoli</label>
    <label class="optchk" style="display:flex;align-items:flex-start;gap:8px;cursor:pointer"><input type="checkbox" id="m-userir" style="width:auto;flex:0 0 auto;margin-top:2px" ${u.useRir?'checked':''}> <span>Considera il <b>RIR</b> nei calcoli (1RM / %1RM / TL effort-aware)</span></label>
    <label class="optchk" style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;margin-top:7px"><input type="checkbox" id="m-userpe" style="width:auto;flex:0 0 auto;margin-top:2px" ${u.useRpe?'checked':''}> <span>Abilita il <b>Session-RPE</b> / carico interno (RPE × durata per giorno · Foster)</span></label></div>
    <div class="field"><label>Formula 1RM stimato</label><select id="m-e1rm"><option value="epley"${(u.e1rm||'epley')==='epley'?' selected':''}>Epley (default)</option><option value="brzycki"${u.e1rm==='brzycki'?' selected':''}>Brzycki</option><option value="lombardi"${u.e1rm==='lombardi'?' selected':''}>Lombardi</option><option value="media"${u.e1rm==='media'?' selected':''}>Media delle 3</option></select></div>
    <div class="field"><label>Fase alimentare</label><select id="m-fase"><option value="bulk"${(u.faseAlim||'bulk')==='bulk'?' selected':''}>Bulk</option><option value="mant"${u.faseAlim==='mant'?' selected':''}>Mantenimento</option><option value="cut"${u.faseAlim==='cut'?' selected':''}>Cut</option></select></div>
    <div class="field"><label>Cardio · frequenza cardiaca <span class="muted" style="text-transform:none;font-family:var(--font-body)">— migliorano il TRIMP delle attività cardio</span></label>
      <div class="row" style="margin-top:4px"><div class="field"><label>FC a riposo (bpm)</label><input id="m-fcrip" type="number" min="0" value="${u.fcRiposo??''}" placeholder="60"></div>
        <div class="field"><label>FC max (bpm) <span class="muted" style="text-transform:none">vuota = stimata</span></label><input id="m-fcmax" type="number" min="0" value="${u.fcMax??''}" placeholder="${(()=>{const e=etaOf(u);return e?Math.round(208-0.7*e):'';})()}"></div></div></div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">Annulla</button><button class="btn btn--ember" id="m-ok">Salva</button></div>`);
  document.getElementById('m-ok').onclick=()=>{ const nome=document.getElementById('m-nome').value.trim();
    u.nome=nome; u.sesso=document.getElementById('m-sesso').value;
    u.altezza=document.getElementById('m-altezza').value===''?'':+document.getElementById('m-altezza').value;
    u.nascita=document.getElementById('m-nascita').value;
    u.useRir=document.getElementById('m-userir').checked;
    u.useRpe=document.getElementById('m-userpe').checked;
    u.e1rm=document.getElementById('m-e1rm').value;
    u.faseAlim=document.getElementById('m-fase').value;
    u.fcRiposo=document.getElementById('m-fcrip').value===''?'':+document.getElementById('m-fcrip').value;
    u.fcMax=document.getElementById('m-fcmax').value===''?'':+document.getElementById('m-fcmax').value;
    const p=profili.find(x=>x.slug===activeProfile); if(p&&nome)p.nome=nome;
    persist('corpo'); persist('profili'); closeModal(); renderProfilo(); };
}

