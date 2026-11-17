/* ════ SCAMBIO SCHEDA TRAINER ↔ CLIENTE ════
   Flusso (rinnovato su richiesta di Marco: app cliente al posto dell'HTML, v1.0.85; dal 16/11/2026 solo APK):
   1. il trainer esporta la scheda settimanale come FILE JSON (tipo 'tms-scheda', video
      inclusi come data-URI, stesso embed del Report digitale) e la manda via chat/email;
   2. il cliente la apre nell'app «TMS Scheda» (app Android, APK creato da app-android/ a
      partire dal sorgente in docs/app/; offline): compila ciò che ha fatto DAVVERO
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
/* riscaldamento del Training Set attivo (modalità settimanale) per l'app del cliente:
   sola lettura, NON torna nel rientro e non entra in nessun calcolo — solo informativo. */
function righeRiscaldamentoCliente(){
  const w=(DOC.scheda&&DOC.scheda.riscaldamento&&DOC.scheda.riscaldamento.settimanale)||[];
  return w.filter(r=>r&&r.esercizio&&String(r.esercizio).trim());
}
/* video degli esercizi di riscaldamento (separati da collectSchedaVideos, che serve
   anche al Report: lì gli stretching non c'entrano). */
function collectRiscaldamentoVideos(){
  const seen={}, out=[];
  righeRiscaldamentoCliente().forEach(r=>{ const file=videoOf(r.esercizio);
    if(file && !seen[file]){ seen[file]=1; out.push({file:file, nome:r.esercizio}); } });
  return out;
}
/* «l'ultima volta»: per ogni esercizio della scheda, l'ultima prestazione registrata
   nello Storico (peso/rip/RIR). Il cliente la vede sotto il previsto, per capire dove
   ripartire. Mappa nome esercizio → valori; assente se non c'è storico. */
function ultimaPerEsercizio(righe){
  const out={};
  righe.forEach(r=>{ const n=String(r.esercizio||'').trim(); if(!n||out[n]) return;
    const lp=lastPerf(n); if(!lp) return;
    out[n]={peso:+lp.peso||0, rip:+lp.rip||0, rir:(lp.rir===''||lp.rir==null)?null:+lp.rir}; });
  return out;
}
function costruisciSchedaJSON(videoMap, modificabile){
  videoMap=videoMap||{};
  const righe=righeSchedaCliente();
  const rows=righe.map(r=>({giorno:r.giorno, esercizio:String(r.esercizio).trim(),
    serie:+r.serie||0, rip:+r.rip||0, peso:+r.peso||0, rest:r.rest||'',
    rir:(r.rir===''||r.rir==null)?null:+r.rir, test:!!r.test, note:r.note||'', video:videoOf(r.esercizio)||''}));
  const warm=righeRiscaldamentoCliente().map(r=>({giorno:String(r.giorno||''), esercizio:String(r.esercizio).trim(),
    serie:+r.serie||0, rip:+r.rip||0, min:+r.min||0, note:r.note||'', video:videoOf(r.esercizio)||''}));
  /* `rpe`: il profilo usa il Session-RPE? Se no, l'app del cliente non mostra fatica e
     durata — resta solo una casella per spuntare il giorno come completato. */
  /* scheda MODIFICABILE: il cliente può aggiungere esercizi dal telefono, e devono essere
     quelli che il coach ha davvero a catalogo, altrimenti all'import il TMS li carica senza
     muscoli né fattore (safe check 2). Quindi si allega l'elenco: nome + gruppo, solo gli
     esercizi da pesi (cardio e stretching non vanno nella scheda). ~30 KB, meno dei video. */
  const catalogo = modificabile ? (DOC.esercizi||[]).filter(e=>e&&e.nome&&!isCardio(e)&&!isStretching(e))
    .map(e=>({n:String(e.nome).trim(), g:String(e.macro||e.gruppo||'')})) : undefined;
  /* `corpo` (2026-11-15, bilancia Bluetooth nell'app del telefono): la formula della
     composizione corporea usa altezza, età e sesso, e alcune bilance li vogliono ricevere
     prima di misurare. Solo questi tre dati; 0 o '' se il profilo non li ha. */
  const u=DOC.dati_utente||{};
  return {tipo:'tms-scheda', versione:1, app:APP_VERSION, modificabile:!!modificabile, rpe:useRpeActive(),
    profilo:{slug:activeProfile, nome:profNome()}, esportata:new Date().toISOString().slice(0,10),
    corpo:{altezza:+u.altezza||0, sesso:(u.sesso==='F'||u.sesso==='M')?u.sesso:'', eta:etaOf(u)||0},
    righe:rows, riscaldamento:warm, ultima:ultimaPerEsercizio(rows),
    video:videoMap, dieta:costruisciDietaJSON(), catalogo:catalogo};
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
  if(!righe.length){ avviso(t('La scheda settimanale è vuota: niente da esportare.')); return; }
  const modo=await chiediModalitaScheda();
  if(modo==null) return;  /* Annulla: nessun export */
  const modificabile=(modo==='modificabile');
  let map={};
  /* video di allenamento + riscaldamento (il cliente li guarda offline nell'app) */
  const vids=collectSchedaVideos(), vidsW=collectRiscaldamentoVideos();
  const files=[...new Set(vids.concat(vidsW).map(v=>v.file))];
  if(files.length && dirHandle && await conferma(t('Includere i')+' '+files.length+' '+t('video degli esercizi nel file? (più pesante, ma il cliente li vede offline nell\'app)'))){
    map=await embedVideoFiles(files);
  }
  const dati=costruisciSchedaJSON(map, modificabile);
  const blob=new Blob([JSON.stringify(dati)],{type:'application/json'});
  const u=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=u; a.download='Scheda_'+(activeProfile||'cliente')+'_'+dati.esportata+'.json';
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(u); },800);
  const kb=blob.size/1024;
  avviso(t('✔ Scheda esportata (')+(kb>1024?(kb/1024).toFixed(1)+' MB':kb.toFixed(0)+' KB')+')'+
    ' · '+(modificabile?t('scheda modificabile'):t('scheda fissa'))+(dati.dieta?' '+t('— incluso il piano alimentare della fase')+' '+t(dati.dieta.label||'')+'.':'.')+'\n'+
    t('Inviala al cliente: la apre nell\'app «TMS Scheda», compila e ti rimanda il file di rientro (da importare qui nel Profilo).')+'\n\n'+
    t('Prima volta? Il cliente installa l’app «TMS Scheda» per Android: mandagli il file TMS-Scheda-….apk (cartella app-android › dist del progetto); sul telefono lo tocca e conferma l’installazione.'));
}

/* carica il rientro del cliente nella SCHEDA PESI (settimanale) per la revisione del coach,
   prima del salvataggio manuale nello Storico (💾 Salva nello Storico). Pura, senza dialoghi. */
function caricaRientroInScheda(dati){
  schedaMode='settimanale'; pesiView='scheda';
  if(!DOC.scheda || typeof DOC.scheda!=='object') DOC.scheda={settimanale:[],mensile:[]};
  /* il tempo di recupero è la prescrizione del coach: NON deve andare perso all'import.
     Lo si prende dal rientro se il cliente l'ha rimandato (app recenti), altrimenti si
     conserva quello della scheda attuale abbinando giorno+esercizio (rientri più vecchi). */
  const prima=(DOC.scheda && Array.isArray(DOC.scheda.settimanale))?DOC.scheda.settimanale:[];
  const restPrec=(g,e)=>{ const k=String(e||'').trim().toLowerCase();
    const m=prima.find(x=>x && String(x.giorno)===g && String(x.esercizio||'').trim().toLowerCase()===k);
    return (m&&m.rest)||''; };
  const righe=(dati&&Array.isArray(dati.righe))?dati.righe:[];
  DOC.scheda.settimanale=righe.filter(r=>r&&r.esercizio&&String(r.esercizio).trim()).map(r=>{
    const giorno=String((r&&r.giorno)||giornoScheda(1)), esercizio=String(r.esercizio).trim();
    return { giorno:giorno, esercizio:esercizio, note:String((r&&r.note)||''),
    serie:+r.serie||0, rip:+r.rip||0, peso:+r.peso||0,
    rest:String((r&&r.rest)||'')||restPrec(giorno,esercizio),
    rir:(r.rir===''||r.rir==null)?'':+r.rir, test:!!(r&&r.test) }; });
  if(!DOC.scheda.rpe||typeof DOC.scheda.rpe!=='object') DOC.scheda.rpe={};
  DOC.scheda.rpe.settimanale={};
  let fatti=0;
  if(dati && Array.isArray(dati.sedute)) dati.sedute.forEach(s=>{ const g=String((s&&s.giorno)||''),
    rp=+((s&&s.rpe)||0), mn=+((s&&s.min)||0);
    if(g&&(rp>0||mn>0)){ DOC.scheda.rpe.settimanale[g]={rpe:rp||'',min:mn||''}; return; }
    if(g&&s&&s.fatto) fatti++;   /* cliente senza Session-RPE: ha solo spuntato il giorno */ });
  return {righe:DOC.scheda.settimanale.length, sedute:Object.keys(DOC.scheda.rpe.settimanale).length, fatti:fatti};
}

/* FOTO dal rientro del cliente → file binari in TMS_Dati/<profilo>/foto/ + metadati in
   corpo.json, identici alle foto aggiunte a mano dal tab Corpo (così Riproduzione e
   Confronto le leggono senza sapere da dove arrivano). Ritorna quante ne ha salvate. */
async function importaFotoRientro(foto){
  if(!Array.isArray(foto) || !foto.length || !profileDir) return 0;
  let n=0;
  /* `id` (dal telefono collegato, 2026-11-17): la stessa foto arrivata due volte non si duplica */
  const gia=new Set((DOC.foto||[]).map(x=>x&&x.id).filter(Boolean));
  for(const f of foto){
    const fid=String((f&&f.id)||'').slice(0,80);
    if(fid && gia.has(fid)) continue;
    const m=String((f&&f.img)||'').match(/^data:image\/([a-z0-9+]+);base64,(.+)$/i);
    if(!m) continue;
    let ext=m[1].toLowerCase(); if(ext==='jpeg') ext='jpg';
    if(['jpg','png','webp','gif'].indexOf(ext)<0) ext='jpg';
    let bytes;
    try{ const bin=atob(m[2]); bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i); }
    catch(e){ logErrore('importFoto/base64', e); continue; }   /* immagine corrotta: si salta, ma resta tracciata */
    const fname='f'+Date.now()+'-'+Math.random().toString(36).slice(2,6)+'.'+ext;
    try{ const fh=await fotoHandle(fname,true); const wr=await fh.createWritable(); await wr.write(bytes); await wr.close(); }
    catch(e){ logErrore('importFoto', e); continue; }
    const voce={file:fname,
      data:String((f&&f.data)||'').slice(0,10)||new Date().toISOString().slice(0,10),
      tag:String((f&&f.tag)||'').trim()};
    if(fid){ voce.id=fid; gia.add(fid); }
    (DOC.foto=DOC.foto||[]).push(voce);
    n++;
  }
  if(n) persist('corpo');
  return n;
}

async function importaRientroFile(file){
  let dati=null;
  try{ dati=JSON.parse(await file.text()); }catch(e){ logErrore('importRientro', e); }
  /* il rientro può portare l'allenamento, le pesate della bilancia (`pesate`, dal 2026-11-15)
     o entrambi: «📤 Manda solo le pesate» sul telefono lo manda senza esercizi */
  const righe=(dati&&Array.isArray(dati.righe))?dati.righe:[], pesate=(dati&&Array.isArray(dati.pesate))?dati.pesate:[];
  if(!dati || dati.tipo!=='tms-rientro' || (!righe.length && !pesate.length)){
    avviso(t('File non valido: non è un "rientro scheda" del TMS (o non contiene né esercizi né pesate).')); return; }
  const conAllenamento=righe.length>0;
  /* safe check 1: il profilo del file corrisponde a quello attivo? */
  const pn=(dati.profilo&&dati.profilo.nome)||'?', ps=(dati.profilo&&dati.profilo.slug)||'';
  if(ps!==activeProfile && !await conferma(t('⚠ Il file è della scheda di «')+pn+t('» ma il profilo attivo è «')+profNome()+'».\n'+t('Importare comunque in questo profilo?'))) return;
  if(conAllenamento){
  /* safe check 2: esercizi fuori catalogo */
  const sconosciuti=[]; righe.forEach(r=>{ const n=String((r&&r.esercizio)||'').trim(); if(n && !esLookup(n) && !sconosciuti.includes(n)) sconosciuti.push(n); });
  if(sconosciuti.length && !await conferma(t('⚠ Esercizi non presenti nel catalogo:')+'\n• '+sconosciuti.join('\n• ')+'\n\n'+t('Verranno caricati lo stesso (senza fattore TL dedicato). Continuo?'))) return;
  /* safe check 3: la scheda Pesi corrente ha contenuto e verrà sostituita per la revisione */
  const piena=((DOC.scheda&&DOC.scheda.settimanale)||[]).some(r=>r&&r.esercizio&&String(r.esercizio).trim());
  if(piena && !await conferma(t('La scheda Pesi corrente verrà sostituita con l\'allenamento del cliente, per controllarlo prima di salvarlo nello Storico. Procedo?'))) return;
  }
  /* nuovo flusso (richiesta Marco): NON si scrive subito nello Storico — l'allenamento del
     cliente entra nella scheda Pesi, il coach lo rivede e poi salva a mano (💾 Salva nello Storico). */
  let ris=null;
  if(conAllenamento){ ris=caricaRientroInScheda(dati); persist('scheda'); }
  /* foto progressi scattate dal cliente col telefono: entrano nel tab Corpo */
  let nFoto=0; try{ nFoto=await importaFotoRientro(dati.foto); }catch(e){ logErrore('importFoto', e); }
  /* pesate della bilancia: la media di ogni settimana va DA SOLA nello Storico misure, senza
     «💾 Salva misure» (richiesta di Marco, 2026-11-15). Chiede solo prima di sostituire una
     misura scritta a mano. */
  let rp=null; try{ rp=await importaPesate(pesate); }catch(e){ logErrore('importPesate', e); }
  const tp=testoImportPesate(rp);
  if(!conAllenamento){
    showTab('corpo');
    avviso(t('📥 Pesate di «')+pn+'»'+(nFoto?(' · '+nFoto+' '+t('foto salvate nel tab Corpo')):'')+'\n\n'+(tp||t('Nessuna pesata nuova.')));
    return;
  }
  showTab('allenamento');
  avviso(t('📥 Allenamento di «')+pn+t('» caricato nella scheda Pesi:')+' '+ris.righe+' '+t('esercizi')+
    (ris.sedute?(' · '+ris.sedute+' '+t('sedute con RPE')):'')+
    (ris.fatti?(' · '+ris.fatti+' '+t('giorni segnati come completati')):'')+
    (nFoto?(' · '+nFoto+' '+t('foto salvate nel tab Corpo')):'')+'.\n\n'+
    (tp?tp+'\n\n':'')+
    t('Controlla i valori, poi premi «💾 Salva nello Storico» (scegli tu la settimana).'));
}
