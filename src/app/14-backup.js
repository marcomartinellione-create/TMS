/* ════ BACKUP / RIPRISTINO ════ */
async function backupData(){
  if(dataDir&&profileDir){ try{ await persistAll(); }catch(e){} } else { saveCache(); }
  const snap={_tms:'backup', version:APP_VERSION, date:new Date().toISOString(), profili:profili, esercizi:DOC.esercizi, profiles:{}};
  if(dataDir){
    for(const p of profili){
      if(p.slug===activeProfile){ snap.profiles[p.slug]=docProfileData(); continue; }
      try{ const pd=await dataDir.getDirectoryHandle(p.slug,{create:false});
        const sc=await readJson(pd,FILES.scheda), st=await readJson(pd,FILES.storico), co=await readJson(pd,FILES.corpo), al=await readJson(pd,FILES.alimentazione);
        snap.profiles[p.slug]={scheda:sc||{settimanale:[],mensile:[]},storico:st||[],storico_io:(co&&co.storico_io)||[],dati_utente:(co&&co.dati_utente)||{},alimentazione:al||{bulk:[],mant:[],cut:[]}};
      }catch(e){ snap.profiles[p.slug]=blankDOC(); }
    }
  } else {
    let cache={}; try{ cache=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}'); }catch(e){}
    profili.forEach(p=>{ snap.profiles[p.slug]= p.slug===activeProfile? docProfileData() : ((cache.data&&cache.data[p.slug])||blankDOC()); });
  }
  try{
    const blob=new Blob([JSON.stringify(snap,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a');
    a.download='TMS-backup-'+(pslug(profNome())||activeProfile||'profilo')+'-'+new Date().toISOString().slice(0,10)+'.json';  /* nome del profilo attivo nel file: si capisce di chi è (il contenuto resta TUTTI i profili) */
    a.href=url;
    document.body.appendChild(a); a.click(); setTimeout(()=>{ try{URL.revokeObjectURL(url);}catch(e){} a.remove(); },600);
  }catch(e){ alert('Errore backup: '+e.message); }
}
async function restoreData(file){
  let snap; try{ snap=JSON.parse(await file.text()); }catch(e){ alert('File non leggibile.'); return; }
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
      await writeJson(pd,FILES.corpo,{dati_utente:d.dati_utente||{},storico_io:d.storico_io||[]});
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

