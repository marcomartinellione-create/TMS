/* ════ SCAMBIO SCHEDA TRAINER ↔ CLIENTE ════
   Flusso (rinnovato su richiesta di Marco: app cliente PWA al posto dell'HTML, v1.0.85):
   1. il trainer esporta la scheda settimanale come FILE JSON (tipo 'tms-scheda', video
      inclusi come data-URI, stesso embed del Report digitale) e la manda via chat/email;
   2. il cliente la apre nell'app «TMS Scheda» (PWA su GitHub Pages, APP_CLIENTE_URL;
      installabile, offline, sorgente in docs/app/): compila ciò che ha fatto DAVVERO
      (serie/rip/peso/RIR, note, fatica sRPE e durata per seduta — gli esercizi non si
      cambiano) e genera il "file di rientro" (JSON tipo 'tms-rientro', INVARIATO);
   3. il trainer lo importa dal tab Profilo: safe check su profilo/catalogo, poi
      l'allenamento entra nella scheda Pesi per la revisione e il salvataggio manuale. */

function righeSchedaCliente(){ return ((DOC.scheda&&DOC.scheda.settimanale)||[]).filter(r=>r&&r.esercizio&&String(r.esercizio).trim()); }

/* file scheda per l'app del cliente: solo dati (niente markup). I video degli esercizi
   viaggiano come data-URI nella mappa `video` (nome file → URI), come nel Report digitale. */
function costruisciSchedaJSON(videoMap){
  videoMap=videoMap||{};
  const righe=righeSchedaCliente();
  const rows=righe.map(r=>({giorno:r.giorno, esercizio:String(r.esercizio).trim(),
    serie:+r.serie||0, rip:+r.rip||0, peso:+r.peso||0, rest:r.rest||'',
    rir:(r.rir===''||r.rir==null)?null:+r.rir, note:r.note||'', video:videoOf(r.esercizio)||''}));
  return {tipo:'tms-scheda', versione:1, app:APP_VERSION,
    profilo:{slug:activeProfile, nome:profNome()}, esportata:new Date().toISOString().slice(0,10),
    appCliente:APP_CLIENTE_URL, righe:rows, video:videoMap};
}

async function esportaSchedaCliente(){
  const righe=righeSchedaCliente();
  if(!righe.length){ alert('La scheda settimanale è vuota: niente da esportare.'); return; }
  let map={};
  const vids=collectSchedaVideos();
  if(vids.length && dirHandle && confirm(`Includere i ${vids.length} video degli esercizi nel file? (più pesante, ma il cliente li vede offline nell'app)`)){
    map=await embedVideoFiles(vids.map(v=>v.file));
  }
  const dati=costruisciSchedaJSON(map);
  const blob=new Blob([JSON.stringify(dati)],{type:'application/json'});
  const u=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=u; a.download='Scheda_'+(activeProfile||'cliente')+'_'+dati.esportata+'.json';
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(u); },800);
  const kb=blob.size/1024;
  alert('✔ Scheda esportata ('+(kb>1024?(kb/1024).toFixed(1)+' MB':kb.toFixed(0)+' KB')+').\n'+
    'Inviala al cliente: la apre nell\'app «TMS Scheda», compila e ti rimanda il file di rientro (da importare qui nel Profilo).\n\n'+
    'Prima volta? Il cliente apre questo link sul telefono e aggiunge l\'app alla schermata Home (poi funziona anche offline):\n'+APP_CLIENTE_URL);
}

/* carica il rientro del cliente nella SCHEDA PESI (settimanale) per la revisione del coach,
   prima del salvataggio manuale nello Storico (💾 Salva nello Storico). Pura, senza dialoghi. */
function caricaRientroInScheda(dati){
  schedaMode='settimanale';
  if(!DOC.scheda || typeof DOC.scheda!=='object') DOC.scheda={settimanale:[],mensile:[]};
  const righe=(dati&&Array.isArray(dati.righe))?dati.righe:[];
  DOC.scheda.settimanale=righe.filter(r=>r&&r.esercizio&&String(r.esercizio).trim()).map(r=>({
    giorno:String((r&&r.giorno)||'Lunedì'), esercizio:String(r.esercizio).trim(), note:String((r&&r.note)||''),
    serie:+r.serie||0, rip:+r.rip||0, peso:+r.peso||0, rest:'',
    rir:(r.rir===''||r.rir==null)?'':+r.rir }));
  if(!DOC.scheda.rpe||typeof DOC.scheda.rpe!=='object') DOC.scheda.rpe={};
  DOC.scheda.rpe.settimanale={};
  if(dati && Array.isArray(dati.sedute)) dati.sedute.forEach(s=>{ const g=String((s&&s.giorno)||''),
    rp=+((s&&s.rpe)||0), mn=+((s&&s.min)||0); if(g&&(rp>0||mn>0)) DOC.scheda.rpe.settimanale[g]={rpe:rp||'',min:mn||''}; });
  return {righe:DOC.scheda.settimanale.length, sedute:Object.keys(DOC.scheda.rpe.settimanale).length};
}

async function importaRientroFile(file){
  let dati=null;
  try{ dati=JSON.parse(await file.text()); }catch(e){ logErrore('importRientro', e); }
  if(!dati || dati.tipo!=='tms-rientro' || !Array.isArray(dati.righe) || !dati.righe.length){
    alert('File non valido: non è un "rientro scheda" del TMS (o non contiene esercizi).'); return; }
  /* safe check 1: il profilo del file corrisponde a quello attivo? */
  const pn=(dati.profilo&&dati.profilo.nome)||'?', ps=(dati.profilo&&dati.profilo.slug)||'';
  if(ps!==activeProfile && !confirm(`⚠ Il file è della scheda di «${pn}» ma il profilo attivo è «${profNome()}».\nImportare comunque in questo profilo?`)) return;
  /* safe check 2: esercizi fuori catalogo */
  const sconosciuti=[]; dati.righe.forEach(r=>{ const n=String((r&&r.esercizio)||'').trim(); if(n && !esLookup(n) && !sconosciuti.includes(n)) sconosciuti.push(n); });
  if(sconosciuti.length && !confirm('⚠ Esercizi non presenti nel catalogo:\n• '+sconosciuti.join('\n• ')+'\n\nVerranno caricati lo stesso (senza fattore TL dedicato). Continuo?')) return;
  /* safe check 3: la scheda Pesi corrente ha contenuto e verrà sostituita per la revisione */
  const piena=((DOC.scheda&&DOC.scheda.settimanale)||[]).some(r=>r&&r.esercizio&&String(r.esercizio).trim());
  if(piena && !confirm('La scheda Pesi corrente verrà sostituita con l\'allenamento del cliente, per controllarlo prima di salvarlo nello Storico. Procedo?')) return;
  /* nuovo flusso (richiesta Marco): NON si scrive subito nello Storico — l'allenamento del
     cliente entra nella scheda Pesi, il coach lo rivede e poi salva a mano (💾 Salva nello Storico). */
  const ris=caricaRientroInScheda(dati);
  persist('scheda');
  showTab('allenamento');
  alert(`📥 Allenamento di «${pn}» caricato nella scheda Pesi: ${ris.righe} esercizi${ris.sedute?(' · '+ris.sedute+' sedute con RPE'):''}.\n\nControlla i valori, poi premi «💾 Salva nello Storico» (scegli tu la settimana).`);
}
