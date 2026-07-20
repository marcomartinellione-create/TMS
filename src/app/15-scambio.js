/* ════ SCAMBIO SCHEDA TRAINER ↔ CLIENTE ════
   Flusso (rinnovato su richiesta di Marco: app cliente PWA al posto dell'HTML, v1.0.85):
   1. il trainer esporta la scheda settimanale come FILE JSON (tipo 'tms-scheda', video
      inclusi come data-URI, stesso embed del Report digitale) e la manda via chat/email;
   2. il cliente la apre nell'app «TMS Scheda» (PWA su GitHub Pages, APP_CLIENTE_URL;
      installabile, offline, sorgente in docs/app/): compila ciò che ha fatto DAVVERO
      (serie/rip/peso/RIR, note, fatica sRPE e durata per seduta) e, dal v1.5 della PWA,
      può anche aggiungere/eliminare/modificare esercizi e segnare i test 1RM (flag `test`);
      genera il "file di rientro" (JSON tipo 'tms-rientro', INVARIATO nel formato);
   3. il trainer lo importa dal tab Profilo: safe check su profilo/catalogo, poi
      l'allenamento entra nella scheda Pesi per la revisione e il salvataggio manuale. */

function righeSchedaCliente(){ return ((DOC.scheda&&DOC.scheda.settimanale)||[]).filter(r=>r&&r.esercizio&&String(r.esercizio).trim()); }

/* piano alimentare della fase ATTIVA per l'app del cliente, coi valori precalcolati
   (il cliente non ha la banca alimenti USAV): pasto, alimento, grammi, kcal e macro per
   riga + totale giornaliero. null se il piano è vuoto (l'app mostra «non inclusa»). */
function costruisciDietaJSON(){
  const fase=faseAlimActive(); const rows=((DOC.alimentazione&&DOC.alimentazione[fase])||[]).filter(r=>r&&r.alimento&&String(r.alimento).trim());
  if(!rows.length) return null;
  const righe=rows.map(r=>({pasto:String(r.pasto||'').trim(), alimento:String(r.alimento).trim(), grammi:+r.grammi||0,
    kcal:Math.round(foodVal(r.alimento,r.grammi,'kcal')),
    proteine:+foodVal(r.alimento,r.grammi,'proteine').toFixed(1),
    grassi:+foodVal(r.alimento,r.grammi,'grassi').toFixed(1),
    carboidrati:+foodVal(r.alimento,r.grammi,'zuccheri').toFixed(1),
    fibre:+foodVal(r.alimento,r.grammi,'fibre').toFixed(1)}));
  const t=faseTot(rows);
  return {fase:fase, label:FASE_LAB[fase]||fase,
    tot:{kcal:Math.round(t.kcal||0), proteine:+(t.proteine||0).toFixed(1), grassi:+(t.grassi||0).toFixed(1),
      carboidrati:+(t.zuccheri||0).toFixed(1), fibre:+(t.fibre||0).toFixed(1)}, righe:righe};
}

/* file scheda per l'app del cliente: solo dati (niente markup). I video degli esercizi
   viaggiano come data-URI nella mappa `video` (nome file → URI), come nel Report digitale;
   `dieta` è il piano alimentare della fase attiva (null se vuoto). */
/* `modificabile`: scelto dal coach all'export (popup). true = il cliente può
   aggiungere/eliminare/modificare esercizi e segnare i test 1RM nell'app; false =
   scheda "fissa", sola compilazione (il timer di recupero resta in entrambi i casi). */
function costruisciSchedaJSON(videoMap, modificabile){
  videoMap=videoMap||{};
  const righe=righeSchedaCliente();
  const rows=righe.map(r=>({giorno:r.giorno, esercizio:String(r.esercizio).trim(),
    serie:+r.serie||0, rip:+r.rip||0, peso:+r.peso||0, rest:r.rest||'',
    rir:(r.rir===''||r.rir==null)?null:+r.rir, test:!!r.test, note:r.note||'', video:videoOf(r.esercizio)||''}));
  return {tipo:'tms-scheda', versione:1, app:APP_VERSION, modificabile:!!modificabile,
    profilo:{slug:activeProfile, nome:profNome()}, esportata:new Date().toISOString().slice(0,10),
    appCliente:APP_CLIENTE_URL, righe:rows, video:videoMap, dieta:costruisciDietaJSON()};
}

/* popup all'export: scheda FISSA (sola compilazione, come prima) o MODIFICABILE (il
   cliente può anche cambiare gli esercizi + test 1RM). Ritorna una Promise con
   'fissa' | 'modificabile' | null (Annulla). */
function chiediModalitaScheda(){
  return new Promise(res=>{
    modal(`<h3>${t('Che tipo di scheda per il cliente?')}</h3>
      <p style="margin:8px 0;line-height:1.5">${t('Come potrà usare la scheda nell\'app del telefono:')}</p>
      <ul style="margin:6px 0 10px 18px;line-height:1.5;padding:0">
        <li><b>${t('🔒 Fissa')}</b> — ${t('compila solo ciò che ha fatto (serie, ripetizioni, peso, RIR, note). Non cambia gli esercizi.')}</li>
        <li><b>${t('✏️ Modificabile')}</b> — ${t('può anche aggiungere, eliminare e modificare esercizi e segnare i test del massimale (1RM).')}</li>
      </ul>
      <p style="margin:0 0 4px;color:var(--muted);font-size:.9em">${t('Il timer di recupero è disponibile in entrambe.')}</p>
      <div class="modal__actions"><button class="btn" id="ms-cancel">${t('Annulla')}</button>
        <button class="btn" id="ms-fissa">${t('🔒 Fissa')}</button>
        <button class="btn btn--ember" id="ms-mod">${t('✏️ Modificabile')}</button></div>`);
    document.getElementById('ms-cancel').onclick=()=>{ closeModal(); res(null); };
    document.getElementById('ms-fissa').onclick=()=>{ closeModal(); res('fissa'); };
    document.getElementById('ms-mod').onclick=()=>{ closeModal(); res('modificabile'); };
  });
}

async function esportaSchedaCliente(){
  const righe=righeSchedaCliente();
  if(!righe.length){ alert(t('La scheda settimanale è vuota: niente da esportare.')); return; }
  const modo=await chiediModalitaScheda();
  if(modo==null) return;  /* Annulla: nessun export */
  const modificabile=(modo==='modificabile');
  let map={};
  const vids=collectSchedaVideos();
  if(vids.length && dirHandle && confirm(t('Includere i')+' '+vids.length+' '+t('video degli esercizi nel file? (più pesante, ma il cliente li vede offline nell\'app)'))){
    map=await embedVideoFiles(vids.map(v=>v.file));
  }
  const dati=costruisciSchedaJSON(map, modificabile);
  const blob=new Blob([JSON.stringify(dati)],{type:'application/json'});
  const u=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=u; a.download='Scheda_'+(activeProfile||'cliente')+'_'+dati.esportata+'.json';
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(u); },800);
  const kb=blob.size/1024;
  alert(t('✔ Scheda esportata (')+(kb>1024?(kb/1024).toFixed(1)+' MB':kb.toFixed(0)+' KB')+')'+
    ' · '+(modificabile?t('scheda modificabile'):t('scheda fissa'))+(dati.dieta?' '+t('— incluso il piano alimentare della fase')+' '+t(dati.dieta.label||'')+'.':'.')+'\n'+
    t('Inviala al cliente: la apre nell\'app «TMS Scheda», compila e ti rimanda il file di rientro (da importare qui nel Profilo).')+'\n\n'+
    t('Prima volta? Il cliente apre questo link sul telefono e aggiunge l\'app alla schermata Home (poi funziona anche offline):')+'\n'+APP_CLIENTE_URL);
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
    rir:(r.rir===''||r.rir==null)?'':+r.rir, test:!!(r&&r.test) }));
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
    alert(t('File non valido: non è un "rientro scheda" del TMS (o non contiene esercizi).')); return; }
  /* safe check 1: il profilo del file corrisponde a quello attivo? */
  const pn=(dati.profilo&&dati.profilo.nome)||'?', ps=(dati.profilo&&dati.profilo.slug)||'';
  if(ps!==activeProfile && !confirm(t('⚠ Il file è della scheda di «')+pn+t('» ma il profilo attivo è «')+profNome()+'».\n'+t('Importare comunque in questo profilo?'))) return;
  /* safe check 2: esercizi fuori catalogo */
  const sconosciuti=[]; dati.righe.forEach(r=>{ const n=String((r&&r.esercizio)||'').trim(); if(n && !esLookup(n) && !sconosciuti.includes(n)) sconosciuti.push(n); });
  if(sconosciuti.length && !confirm(t('⚠ Esercizi non presenti nel catalogo:')+'\n• '+sconosciuti.join('\n• ')+'\n\n'+t('Verranno caricati lo stesso (senza fattore TL dedicato). Continuo?'))) return;
  /* safe check 3: la scheda Pesi corrente ha contenuto e verrà sostituita per la revisione */
  const piena=((DOC.scheda&&DOC.scheda.settimanale)||[]).some(r=>r&&r.esercizio&&String(r.esercizio).trim());
  if(piena && !confirm(t('La scheda Pesi corrente verrà sostituita con l\'allenamento del cliente, per controllarlo prima di salvarlo nello Storico. Procedo?'))) return;
  /* nuovo flusso (richiesta Marco): NON si scrive subito nello Storico — l'allenamento del
     cliente entra nella scheda Pesi, il coach lo rivede e poi salva a mano (💾 Salva nello Storico). */
  const ris=caricaRientroInScheda(dati);
  persist('scheda');
  showTab('allenamento');
  alert(t('📥 Allenamento di «')+pn+t('» caricato nella scheda Pesi:')+' '+ris.righe+' '+t('esercizi')+(ris.sedute?(' · '+ris.sedute+' '+t('sedute con RPE')):'')+'.\n\n'+t('Controlla i valori, poi premi «💾 Salva nello Storico» (scegli tu la settimana).'));
}
