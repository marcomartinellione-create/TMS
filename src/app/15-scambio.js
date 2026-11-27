/* ════ LA SCHEDA COME LA VEDE IL TELEFONO ════
   Dal 17/11/2026 (Marco: «togliamo importa esporta scheda / rientro») PC e app del telefono non si
   passano più file a mano: la scheda è COLLEGATA attraverso l'hub del TMS (15c-telefono.js).
   Qui restano i pezzi che servono a quel collegamento: le righe della scheda settimanale, il piano
   alimentare coi valori già calcolati (il telefono non ha la banca alimenti), il riscaldamento e i
   suoi video, «l'ultima volta» dallo Storico, il catalogo degli esercizi, altezza/età/sesso per la
   bilancia, e le foto che arrivano dal telefono. */

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
     prima di misurare. Solo questi tre dati; 0 o '' se il profilo non li ha.
     Dal 26/11/2026 (fascia cardio nell'app del telefono) anche FC max e FC a riposo del Profilo, se
     scritte: servono alle zone del battito (senza FC max il telefono la stima dall'età, come il TMS).
     Dal 27/11/2026 anche peso e massa grassa (frazione): servono alla stima delle calorie bruciate del telefono */
  const u=DOC.dati_utente||{};
  return {tipo:'tms-scheda', versione:1, app:APP_VERSION, modificabile:!!modificabile, rpe:useRpeActive(),
    profilo:{slug:activeProfile, nome:profNome()}, esportata:new Date().toISOString().slice(0,10),
    corpo:{altezza:+u.altezza||0, sesso:(u.sesso==='F'||u.sesso==='M')?u.sesso:'', eta:etaOf(u)||0, fcMax:+u.fcMax||0, fcRiposo:+u.fcRiposo||0,
      peso:+u.peso||0, massa_grassa:+u.massa_grassa||0},   /* peso e grasso: per la stima delle calorie del telefono (1.10.0) */
    righe:rows, riscaldamento:warm, ultima:ultimaPerEsercizio(rows),
    video:videoMap, dieta:costruisciDietaJSON(), catalogo:catalogo};
}

/* FOTO dal telefono → file binari in TMS_Dati/<profilo>/foto/ + metadati in corpo.json, identici alle
   foto aggiunte a mano dal tab Corpo (così Riproduzione e Confronto le leggono senza sapere da dove
   arrivano). Ritorna quante ne ha salvate. */
async function importaFotoRientro(foto){
  if(!Array.isArray(foto) || !foto.length || !profileDir) return 0;
  const n=await fotoUnisci(DOC, foto, async(fname, bytes)=>{ const fh=await fotoHandle(fname,true); const wr=await fh.createWritable(); await wr.write(bytes); await wr.close(); });
  if(n) persist('corpo');
  return n;
}
/* il cuore, su un profilo qualsiasi (T = DOC, o il corpo.json di un profilo non aperto): `scrivi(nome, byte)`
   mette il file nella cartella foto/ di quel profilo */
async function fotoUnisci(T, foto, scrivi){
  let n=0;
  /* `id` (dal telefono collegato, 2026-11-17): la stessa foto arrivata due volte non si duplica */
  const gia=new Set((T.foto||[]).map(x=>x&&x.id).filter(Boolean));
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
    try{ await scrivi(fname, bytes); }
    catch(e){ logErrore('importFoto', e); continue; }
    /* `sostituisce` (2026-11-17): la foto è stata spostata o ritagliata sul telefono dopo che la vecchia era
       già partita. Prende il posto della vecchia (stessa data e vista), senza aggiungersi; il file vecchio
       resta su disco, non si cancella niente. */
    const sost=String((f&&f.sostituisce)||'').slice(0,80);
    const vecchia=sost? (T.foto||[]).find(x=>x&&x.id===sost) : null;
    if(vecchia){ vecchia.file=fname; if(fid){ vecchia.id=fid; gia.add(fid); } n++; continue; }
    const voce={file:fname,
      data:String((f&&f.data)||'').slice(0,10)||new Date().toISOString().slice(0,10),
      tag:String((f&&f.tag)||'').trim()};
    if(fid){ voce.id=fid; gia.add(fid); }
    (T.foto=T.foto||[]).push(voce);
    n++;
  }
  return n;
}
