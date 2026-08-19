/* ════ BACKUP / RIPRISTINO ════ */
/* fotografia completa di TUTTI i profili (usata dal backup manuale e da quello automatico).
   Dal v1.0.72 include anche storico_rpe dei profili non attivi (prima andava perso). */
/* ── FOTO nel backup (2026-08-19) ────────────────────────────────────────────
   Lo snapshot ha sempre portato i METADATI delle foto (file, data, tag) ma non le
   immagini: ripristinando su un PC nuovo restavano voci che puntavano a file
   inesistenti. Con «backup completo» le immagini viaggiano dentro il JSON come
   data-URI, e il ripristino le riscrive nella cartella foto/ del profilo.
   I video NON entrano: pesano troppo e sono rigenerabili dal catalogo. ── */
function bytesToBase64(buf){
  let bin=''; const CH=8192;                     /* a blocchi: con file grandi
     un solo String.fromCharCode(...tuttiIByte) sfonda lo stack degli argomenti */
  for(let i=0;i<buf.length;i+=CH) bin+=String.fromCharCode.apply(null, buf.subarray(i,i+CH));
  return btoa(bin);
}
function mimeFoto(nome){
  const e=String(nome||'').toLowerCase().split('.').pop();
  return e==='png'?'image/png':e==='webp'?'image/webp':e==='gif'?'image/gif':'image/jpeg';
}
async function fotoLeggiDataUri(pd, nome){
  const fd=await pd.getDirectoryHandle('foto',{create:false});
  const fh=await fd.getFileHandle(String(nome),{create:false});
  const f=await fh.getFile();
  return 'data:'+(f.type||mimeFoto(nome))+';base64,'+bytesToBase64(new Uint8Array(await f.arrayBuffer()));
}
async function fotoScriviDataUri(pd, nome, dataUri){
  const m=String(dataUri||'').match(/^data:[^;]*;base64,(.+)$/);
  if(!m) return false;
  const bin=atob(m[1]); const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  const fd=await pd.getDirectoryHandle('foto',{create:true});
  const fh=await fd.getFileHandle(String(nome),{create:true});
  const wr=await fh.createWritable(); await wr.write(bytes); await wr.close();
  return true;
}
/* legge le immagini di un profilo e le allega al suo blocco dello snapshot */
async function allegaFoto(pd, blocco){
  const meta=(blocco&&blocco.foto)||[]; if(!meta.length) return;
  const files={};
  for(const f of meta){
    if(!f||!f.file||files[f.file]) continue;
    try{ files[f.file]=await fotoLeggiDataUri(pd, f.file); }
    catch(e){ logErrore('backupFoto:'+f.file, e); }   /* foto mancante: si salta, il resto del backup vale comunque */
  }
  if(Object.keys(files).length) blocco.fotoFiles=files;
}
async function costruisciSnapshot(conFoto){
  if(dataDir&&profileDir){ try{ await persistAll(); }catch(e){} } else { saveCache(); }
  const snap={_tms:'backup', version:APP_VERSION, date:new Date().toISOString(), profili:profili, esercizi:DOC.esercizi, profiles:{}};
  if(dataDir){
    for(const p of profili){
      if(p.slug===activeProfile){ snap.profiles[p.slug]=docProfileData();
        if(conFoto&&profileDir){ try{ await allegaFoto(profileDir, snap.profiles[p.slug]); }catch(e){ logErrore('backupFoto', e); } }
        continue; }
      try{ const pd=await dataDir.getDirectoryHandle(p.slug,{create:false});
        const sc=await readJson(pd,FILES.scheda), st=await readJson(pd,FILES.storico), co=await readJson(pd,FILES.corpo), al=await readJson(pd,FILES.alimentazione);
        snap.profiles[p.slug]={scheda:sc||{settimanale:[],mensile:[]},storico:st||[],storico_io:(co&&co.storico_io)||[],storico_rpe:(co&&co.storico_rpe)||[],storico_risc:(co&&co.storico_risc)||[],cardio:(co&&co.cardio)||[],foto:(co&&co.foto)||[],dati_utente:(co&&co.dati_utente)||{},alimentazione:al||{bulk:[],mant:[],cut:[]}};
        if(conFoto){ try{ await allegaFoto(pd, snap.profiles[p.slug]); }catch(e){ logErrore('backupFoto:'+p.slug, e); } }
      }catch(e){ snap.profiles[p.slug]=blankDOC(); logErrore('snapshot:'+p.slug, e); }
    }
  } else {
    let cache={}; try{ cache=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}'); }catch(e){}
    profili.forEach(p=>{ snap.profiles[p.slug]= p.slug===activeProfile? docProfileData() : ((cache.data&&cache.data[p.slug])||blankDOC()); });
  }
  return snap;
}
async function backupData(conFoto){
  try{
    const snap=await costruisciSnapshot(conFoto);
    const blob=new Blob([JSON.stringify(snap,null,2)],{type:'application/json'});
    if(conFoto){
      const nFoto=Object.keys(snap.profiles).reduce((n,s)=>n+Object.keys((snap.profiles[s]||{}).fotoFiles||{}).length,0);
      const mb=blob.size/1048576;
      if(!nFoto){ alert(t('Nessuna foto da includere: uso il backup normale.')); }
      else if(!confirm(t('Backup completo:')+' '+nFoto+' '+t('foto incluse, circa')+' '+mb.toFixed(1)+' MB.\n\n'+
        t('I file grandi sono più lenti da salvare e da ripristinare. Procedo?'))) return;
    }
    const url=URL.createObjectURL(blob); const a=document.createElement('a');
    a.download='TMS-backup'+(conFoto?'-completo':'')+'-'+(pslug(profNome())||activeProfile||'profilo')+'-'+new Date().toISOString().slice(0,10)+'.json';  /* nome del profilo attivo nel file: si capisce di chi è (il contenuto resta TUTTI i profili) */
    a.href=url;
    document.body.appendChild(a); a.click(); setTimeout(()=>{ try{URL.revokeObjectURL(url);}catch(e){} a.remove(); },600);
  }catch(e){ alert(t('Errore backup:')+' '+e.message); logErrore('backupData', e); }
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
  }catch(e){ alert(t('Backup automatico non leggibile:')+' '+e.message); logErrore('ripristinoAuto', e); }
}

/* ── aggiornamenti con l'interfaccia dell'app (v1.0.73): il wrapper manda gli eventi
      dell'updater via window.tmsUpdate, qui si mostrano i modali in stile pergamena ── */
function modalAggiornamento(d){
  const nota=String((d&&d.note)||'').trim();
  modal(`<h3>${d&&d.maggiore?t('⚠ Aggiornamento MAGGIORE'):t('✦ Aggiornamento disponibile')}</h3>
   <div class="callout ${d&&d.maggiore?'callout--ember':'callout--info'}"><div>${t('È pronta la versione')} <b>v${esc(d.versione)}</b> <span class="muted">(${t('hai la v')}${esc(d.attuale)})</span>. ${t('Confermando, il download prosegue in background: vedrai la <b>percentuale nel titolo</b> della finestra e sulla taskbar.')}</div></div>
   ${nota?`<div class="sec">${t('Novità di questa versione')}</div>
   <div style="max-height:240px;overflow:auto;white-space:pre-wrap;font-size:12.5px;line-height:1.55;color:var(--ink-2);border:1px solid var(--border);border-radius:var(--r-sm);padding:10px 12px;background:var(--paper-2)">${esc(nota)}</div>`:''}
   <div class="modal__actions"><button class="btn" id="upd-dopo">${t('Più tardi')}</button><button class="btn btn--ember" id="upd-vai">${t('⭳ Scarica e installa')}</button></div>`);
  { const b=document.getElementById('upd-vai'); if(b) b.onclick=()=>{ closeModal(); try{ window.tmsUpdate.rispondi('scarica'); }catch(e){} }; }
  { const b=document.getElementById('upd-dopo'); if(b) b.onclick=()=>{ closeModal(); try{ window.tmsUpdate.rispondi('dopo'); }catch(e){} }; }
  { const m=document.getElementById('modal'); if(m) m.style.maxWidth='620px'; }
}
function modalRiavvio(d){
  modal(`<h3>${t('✦ Aggiornamento pronto')}</h3>
   <div class="callout callout--info"><div>${t('La versione')} <b>v${esc(d.versione)}</b> ${t('è scaricata e pronta. Vuoi <b>riavviare ora</b> per installarla? Altrimenti si installa da sola alla prossima chiusura.')}</div></div>
   <div class="modal__actions"><button class="btn" id="upd-rdopo">${t('Più tardi')}</button><button class="btn btn--ember" id="upd-riavvia">${t('↻ Riavvia ora')}</button></div>`);
  { const b=document.getElementById('upd-riavvia'); if(b) b.onclick=()=>{ try{ window.tmsUpdate.rispondi('riavvia'); }catch(e){} }; }
  { const b=document.getElementById('upd-rdopo'); if(b) b.onclick=()=>{ closeModal(); try{ window.tmsUpdate.rispondi('dopo'); }catch(e){} }; }
}

/* log errori interni: modale di consultazione (5 click sulla versione nel footer) */
function mostraLogErrori(){
  const righe=LOG_ERRORI.slice().reverse().map(v=>v.t+'  ['+v.dove+']  '+v.msg).join('\n');
  modal(`<h3>🩺 ${t('Log errori interni')} <span class="pill">${LOG_ERRORI.length} ${t('voci')}</span></h3>
   <div class="muted" style="font-size:12px;margin-bottom:6px">${t('Diagnostica per l\'assistenza: se qualcosa non funziona, copia questo testo e invialo insieme alla segnalazione.')}</div>
   <textarea readonly style="width:100%;min-height:260px;font-family:var(--font-mono);font-size:11px">${esc(righe)||t('Nessun errore registrato in questa sessione. 👍')}</textarea>
   <div class="modal__actions"><button class="btn" id="log-copia">📋 ${t('Copia')}</button><button class="btn" onclick="closeModal()">${t('Chiudi')}</button></div>`);
  const c=document.getElementById('log-copia');
  if(c) c.onclick=()=>{ try{ navigator.clipboard.writeText(righe); c.textContent=t('✔ Copiato'); }catch(e){} };
}
async function restoreData(file){
  let snap; try{ snap=JSON.parse(await file.text()); }catch(e){ alert(t('File non leggibile.')); logErrore('ripristino', e); return; }
  if(!snap||snap._tms!=='backup'||!snap.profiles){ alert(t('Questo non è un backup TMS valido.')); return; }
  const np=Object.keys(snap.profiles).length;
  if(!confirm(t('Ripristinare il backup del')+' '+String(snap.date||'').slice(0,10)+'?\n'+t('Sostituirà i dati attuali (')+np+' '+t('profili).'))) return;
  profili=(snap.profili&&snap.profili.length)?snap.profili:Object.keys(snap.profiles).map(s=>({slug:s,nome:s,creato:''}));
  if(snap.esercizi&&snap.esercizi.length) DOC.esercizi=snap.esercizi; rebuildEs();
  activeProfile=(profili[0]&&profili[0].slug)||'wander';
  applyProfileData(snap.profiles[activeProfile]||blankDOC());
  let fotoRipristinate=0;
  if(dataDir){
    for(const slug of Object.keys(snap.profiles)){
      const pd=await dataDir.getDirectoryHandle(slug,{create:true}); const d=snap.profiles[slug]||blankDOC();
      await writeJson(pd,FILES.scheda,d.scheda||{settimanale:[],mensile:[]});
      await writeJson(pd,FILES.storico,d.storico||[]);
      await writeJson(pd,FILES.corpo,{dati_utente:d.dati_utente||{},storico_io:d.storico_io||[],storico_rpe:d.storico_rpe||[],storico_risc:d.storico_risc||[],cardio:d.cardio||[],foto:d.foto||[]});
      await writeJson(pd,FILES.alimentazione,d.alimentazione||{bulk:[],mant:[],cut:[]});
      /* backup completo: rimette anche le immagini nella cartella foto/ del profilo */
      const ff=d.fotoFiles||{};
      for(const nome of Object.keys(ff)){
        try{ if(await fotoScriviDataUri(pd, nome, ff[nome])) fotoRipristinate++; }
        catch(e){ logErrore('ripristinoFoto:'+nome, e); }
      }
    }
    await writeJson(dataDir,FILES.esercizi,DOC.esercizi);
    await writeJson(dataDir,FILES.profili,{list:profili,active:activeProfile});
    profileDir=await dataDir.getDirectoryHandle(activeProfile,{create:true});
  } else {
    const data={}; Object.keys(snap.profiles).forEach(s=>data[s]=snap.profiles[s]);
    try{ localStorage.setItem(CACHE_KEY,JSON.stringify({esercizi:DOC.esercizi,profili:profili,active:activeProfile,data:data})); }catch(e){}
  }
  saveCache(); alert(t('✔ Backup ripristinato (')+np+' '+t('profili).')+(fotoRipristinate?' '+fotoRipristinate+' '+t('foto rimesse al loro posto.'):'')); renderAll(); showTab('profilo');
}

