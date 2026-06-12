/* ════ BACKUP / RIPRISTINO ════ */
/* fotografia completa di TUTTI i profili (usata dal backup manuale e da quello automatico).
   Dal v1.0.72 include anche storico_rpe dei profili non attivi (prima andava perso). */
async function costruisciSnapshot(){
  if(dataDir&&profileDir){ try{ await persistAll(); }catch(e){} } else { saveCache(); }
  const snap={_tms:'backup', version:APP_VERSION, date:new Date().toISOString(), profili:profili, esercizi:DOC.esercizi, profiles:{}};
  if(dataDir){
    for(const p of profili){
      if(p.slug===activeProfile){ snap.profiles[p.slug]=docProfileData(); continue; }
      try{ const pd=await dataDir.getDirectoryHandle(p.slug,{create:false});
        const sc=await readJson(pd,FILES.scheda), st=await readJson(pd,FILES.storico), co=await readJson(pd,FILES.corpo), al=await readJson(pd,FILES.alimentazione);
        snap.profiles[p.slug]={scheda:sc||{settimanale:[],mensile:[]},storico:st||[],storico_io:(co&&co.storico_io)||[],storico_rpe:(co&&co.storico_rpe)||[],dati_utente:(co&&co.dati_utente)||{},alimentazione:al||{bulk:[],mant:[],cut:[]}};
      }catch(e){ snap.profiles[p.slug]=blankDOC(); logErrore('snapshot:'+p.slug, e); }
    }
  } else {
    let cache={}; try{ cache=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}'); }catch(e){}
    profili.forEach(p=>{ snap.profiles[p.slug]= p.slug===activeProfile? docProfileData() : ((cache.data&&cache.data[p.slug])||blankDOC()); });
  }
  return snap;
}
async function backupData(){
  try{
    const snap=await costruisciSnapshot();
    const blob=new Blob([JSON.stringify(snap,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a');
    a.download='TMS-backup-'+(pslug(profNome())||activeProfile||'profilo')+'-'+new Date().toISOString().slice(0,10)+'.json';  /* nome del profilo attivo nel file: si capisce di chi è (il contenuto resta TUTTI i profili) */
    a.href=url;
    document.body.appendChild(a); a.click(); setTimeout(()=>{ try{URL.revokeObjectURL(url);}catch(e){} a.remove(); },600);
  }catch(e){ alert('Errore backup: '+e.message); logErrore('backupData', e); }
}

/* ── backup AUTOMATICO (P-backup, v1.0.72): uno snapshot a settimana in
      TMS_Dati/backup_automatici/, rotazione ultime AUTOBK_MAX copie.
      Niente listing di directory nel ponte: l'elenco vive in indice.json. ── */
const AUTOBK_DIR='backup_automatici', AUTOBK_MAX=5, AUTOBK_GIORNI=7;
async function backupAutomaticoSeServe(){
  try{
    if(!dataDir) return false;
    const dir=await dataDir.getDirectoryHandle(AUTOBK_DIR,{create:true});
    let indice=null; try{ indice=await readJson(dir,'indice.json'); }catch(e){}
    if(!indice||!Array.isArray(indice.list)) indice={list:[]};
    const oggi=new Date().toISOString().slice(0,10);
    const ultimo=indice.list.length?indice.list[indice.list.length-1]:null;
    if(ultimo && ultimo.data && (Date.parse(oggi)-Date.parse(ultimo.data)) < AUTOBK_GIORNI*86400000) return false;
    const snap=await costruisciSnapshot();
    const nomeFile='TMS-auto-'+oggi+'.json';
    await writeJson(dir,nomeFile,snap);
    indice.list=indice.list.filter(x=>x&&x.file!==nomeFile);
    indice.list.push({file:nomeFile,data:oggi});
    while(indice.list.length>AUTOBK_MAX){ const vecchio=indice.list.shift(); try{ await dir.removeEntry(vecchio.file); }catch(e){} }
    await writeJson(dir,'indice.json',indice);
    return true;
  }catch(e){ logErrore('backupAutomatico', e); return false; }
}
async function listaBackupAutomatici(){
  try{
    if(!dataDir) return [];
    const dir=await dataDir.getDirectoryHandle(AUTOBK_DIR,{create:false});
    const ind=await readJson(dir,'indice.json');
    return (ind&&Array.isArray(ind.list))? ind.list.slice().reverse() : [];
  }catch(e){ return []; }
}
async function ripristinaBackupAutomatico(nomeFile){
  try{
    const dir=await dataDir.getDirectoryHandle(AUTOBK_DIR,{create:false});
    const fh=await dir.getFileHandle(String(nomeFile),{create:false});
    await restoreData(await fh.getFile());
  }catch(e){ alert('Backup automatico non leggibile: '+e.message); logErrore('ripristinoAuto', e); }
}

/* log errori interni: modale di consultazione (5 click sulla versione nel footer) */
function mostraLogErrori(){
  const righe=LOG_ERRORI.slice().reverse().map(v=>v.t+'  ['+v.dove+']  '+v.msg).join('\n');
  modal(`<h3>🩺 Log errori interni <span class="pill">${LOG_ERRORI.length} voci</span></h3>
   <div class="muted" style="font-size:12px;margin-bottom:6px">Diagnostica per l'assistenza: se qualcosa non funziona, copia questo testo e invialo insieme alla segnalazione.</div>
   <textarea readonly style="width:100%;min-height:260px;font-family:var(--font-mono);font-size:11px">${esc(righe)||'Nessun errore registrato in questa sessione. 👍'}</textarea>
   <div class="modal__actions"><button class="btn" id="log-copia">📋 Copia</button><button class="btn" onclick="closeModal()">Chiudi</button></div>`);
  const c=document.getElementById('log-copia');
  if(c) c.onclick=()=>{ try{ navigator.clipboard.writeText(righe); c.textContent='✔ Copiato'; }catch(e){} };
}
async function restoreData(file){
  let snap; try{ snap=JSON.parse(await file.text()); }catch(e){ alert('File non leggibile.'); logErrore('ripristino', e); return; }
  if(!snap||snap._tms!=='backup'||!snap.profiles){ alert('Questo non è un backup TMS valido.'); return; }
  const np=Object.keys(snap.profiles).length;
  if(!confirm('Ripristinare il backup del '+String(snap.date||'').slice(0,10)+'?\nSostituirà i dati attuali ('+np+' profili).')) return;
  profili=(snap.profili&&snap.profili.length)?snap.profili:Object.keys(snap.profiles).map(s=>({slug:s,nome:s,creato:''}));
  if(snap.esercizi&&snap.esercizi.length) DOC.esercizi=snap.esercizi; rebuildEs();
  activeProfile=(profili[0]&&profili[0].slug)||'wander';
  applyProfileData(snap.profiles[activeProfile]||blankDOC());
  if(dataDir){
    for(const slug of Object.keys(snap.profiles)){
      const pd=await dataDir.getDirectoryHandle(slug,{create:true}); const d=snap.profiles[slug]||blankDOC();
      await writeJson(pd,FILES.scheda,d.scheda||{settimanale:[],mensile:[]});
      await writeJson(pd,FILES.storico,d.storico||[]);
      await writeJson(pd,FILES.corpo,{dati_utente:d.dati_utente||{},storico_io:d.storico_io||[],storico_rpe:d.storico_rpe||[]});
      await writeJson(pd,FILES.alimentazione,d.alimentazione||{bulk:[],mant:[],cut:[]});
    }
    await writeJson(dataDir,FILES.esercizi,DOC.esercizi);
    await writeJson(dataDir,FILES.profili,{list:profili,active:activeProfile});
    profileDir=await dataDir.getDirectoryHandle(activeProfile,{create:true});
  } else {
    const data={}; Object.keys(snap.profiles).forEach(s=>data[s]=snap.profiles[s]);
    try{ localStorage.setItem(CACHE_KEY,JSON.stringify({esercizi:DOC.esercizi,profili:profili,active:activeProfile,data:data})); }catch(e){}
  }
  saveCache(); alert('✔ Backup ripristinato ('+np+' profili).'); renderAll(); showTab('profilo');
}

