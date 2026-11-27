/* ════ BACKUP COMPLETO (.tmsb) — 26/11/2026, richiesta di Marco: «che il backup sia completo, tutto, che si
   possa ricostruire tutti i dati inseriti nel tempo» ════
   Un archivio dello stesso tipo del file .tms (ZIP senza compressione, 14b-pacchetto.js) con dentro TUTTO quello che
   sta nella cartella dei dati, copiato così com'è (anche un file che non si legge si salva, non si perde):
     tms.json                    {formato:'tms-backup', versione, app, creato, profili:[{slug,nome}], conta, telefono}
     libreria/<file>             profili.json, esercizi.json, ricette.json, taccuino.json
     profili/<slug>/<file>       OGNI file di ogni profilo (scheda, storico, corpo, alimentazione, copie delle migrazioni…)
     profili/<slug>/foto/<file>  tutte le foto
     profili/<slug>/bracciale/<AAAA-MM>.json   i campioni grezzi del bracciale (PK_GREZZI: le sottocartelle dei dati grezzi)
     video/<file>                i video personali degli esercizi
     orfani/<slug>/…             cartelle di profili rimaste fuori dall'elenco (al ripristino tornano come cartelle)
     impostazioni.json           tema, stile della notte, lingua, video personali sì/no
     telefono.json               SOLO col backup protetto da password: collegamenti dei telefoni e codice di recupero
                                 (danno accesso ai dati dei clienti sull'hub); così su un PC nuovo tornano da soli
   Con la password tutto è cifrato come il .tms. Dopo averlo costruito lo si rilegge (controllo d'integrità). È lo stesso
   per il backup che scarichi, quello automatico di ogni settimana, la copia nella cartella scelta e la copia di
   sicurezza prima di un ripristino. Il ripristino legge anche i vecchi backup .json (14-backup.js, restoreDataJson). */
/* BK_VERSIONE = la versione più alta che questa app sa LEGGERE; il backup completo si scrive ancora come versione 1 (lo
   aprono anche le app di prima), quello «a deposito» come versione 2 (un'app di prima lo rifiuta invece di riprenderlo a metà) */
const BK_FORMATO='tms-backup', BK_VERSIONE=2, BK_V_COMPLETO=1, BK_V_DEPOSITO=2, BK_SPECIALI=['_eliminati','backup_automatici','video'];
const BK_IMPOSTAZIONI=['tms-theme','tms-notte','tms-lang','tms-video-pers'];
async function bkElenco(dh){ try{ if(dh && typeof dh.elenca==='function'){ const l=await dh.elenca(); if(Array.isArray(l)) return l; } }catch(e){}
  /* cartella del browser (File System Access): si scorre */
  try{ if(dh && typeof dh.values==='function'){ const l=[]; for await (const h of dh.values()) l.push({nome:h.name, cartella:h.kind==='directory'}); return l; } }catch(e){}
  return null; }
async function bkLeggiFile(dh, nome){ const fh=await dh.getFileHandle(nome,{create:false}); return new Uint8Array(await (await fh.getFile()).arrayBuffer()); }
/* scrive un file (anche in sottocartelle: «foto/x.jpg»); i nomi strani non passano */
function bkNomeSicuro(nome){ const p=String(nome||'').split('/'); return p.length && p.every(x=>x && x!=='.' && x!=='..' && !/[\\:*?"<>|]/.test(x)); }
async function bkScriviBin(dh, nome, dati){
  if(!bkNomeSicuro(nome)) throw new Error('nome non consentito: '+nome);
  const p=nome.split('/'); for(let i=0;i<p.length-1;i++) dh=await dh.getDirectoryHandle(p[i],{create:true});
  const fh=await dh.getFileHandle(p[p.length-1],{create:true}), w=await fh.createWritable(); await w.write(dati); await w.close(); }
/* tutti i file di una cartella di profilo (con l'elenco; senza, quelli che si conoscono) e le sue foto */
/* le voci si LEGGONO quando servono (leggi), una alla volta: il backup a deposito non tiene in memoria tutto insieme.
   Una voce che non si legge si salta, col suo errore nel registro, come prima (`assente` = non c'è e basta) */
async function bkCartellaProfilo(pd, base, voci){
  let foto=0;
  const el=await bkElenco(pd);
  const files=el? el.filter(x=>!x.cartella).map(x=>x.nome) : [FILES.scheda, FILES.storico, FILES.corpo, FILES.alimentazione, 'storico.backup.json'];
  for(const f of files) voci.push({nome:base+f, leggi:()=>bkLeggiFile(pd, f), assenteOk:true});
  let fd=null; try{ fd=await pd.getDirectoryHandle('foto',{create:false}); }catch(e){}
  if(fd){
    let nomi=null; const ef=await bkElenco(fd); if(ef) nomi=ef.filter(x=>!x.cartella).map(x=>x.nome);
    if(!nomi){ nomi=[]; try{ const co=await readJson(pd, FILES.corpo); nomi=((co&&co.foto)||[]).map(x=>x&&x.file).filter(Boolean); }catch(e){} }
    for(const f of nomi){ voci.push({nome:base+'foto/'+f, leggi:()=>bkLeggiFile(fd, f), foto:true}); foto++; } }
  /* le sottocartelle dei dati grezzi (campioni del bracciale, sedute): ogni file così com'è */
  for(const sub of PK_GREZZI){ let sd=null; try{ sd=await pd.getDirectoryHandle(sub,{create:false}); }catch(e){}
    if(!sd) continue; const el=await bkElenco(sd); if(!el) continue;
    for(const x of el.filter(v=>!v.cartella)) voci.push({nome:base+sub+'/'+x.nome, leggi:()=>bkLeggiFile(sd, x.nome)}); }
  return foto; }
/* i dati di una voce (null se non si legge: errore nel registro, tranne «non c'è») */
async function bkDati(v){
  if(v.dati) return v.dati;
  try{ return await v.leggi(); }catch(e){ if(!(v.muto || (v.assenteOk && e && e.name==='NotFoundError'))) logErrore('backup:'+v.nome, e); return null; } }
/* tutte le voci del backup (lette dopo, una alla volta) e i conteggi; la password decide se va anche telefono.json */
async function bkEnumera(password){
  if(!dataDir) throw new Error(t('Il TMS non è collegato ai dati.'));
  if(profileDir){ clearTimeout(saveTimer); try{ await persistAll(); }catch(e){ logErrore('backup/salva', e); } }   /* le ultime modifiche, su disco */
  const voci=[], conta={profili:0, foto:0, video:0, orfani:0};
  for(const f of [FILES.profili, FILES.esercizi, FILES.ricette, 'taccuino.json']) voci.push({nome:'libreria/'+f, leggi:()=>bkLeggiFile(dataDir, f), muto:true});
  for(const p of profili){
    let pd; try{ pd=await dataDir.getDirectoryHandle(p.slug,{create:false}); }catch(e){ continue; }
    conta.foto+=await bkCartellaProfilo(pd, 'profili/'+p.slug+'/', voci); conta.profili++; }
  const radice=await bkElenco(dataDir);
  if(radice) for(const d of radice.filter(x=>x.cartella && !x.seme && !BK_SPECIALI.includes(x.nome) && !x.nome.startsWith('_') && !profili.some(p=>p.slug===x.nome))){
    try{ const pd=await dataDir.getDirectoryHandle(d.nome,{create:false}), prima=voci.length; await bkCartellaProfilo(pd, 'orfani/'+d.nome+'/', voci);   /* si salva ogni cartella; si contano quelle di profilo */
      if(voci.slice(prima).some(v=>/^orfani\/[^/]+\/(scheda|storico|corpo|alimentazione)\.json$/.test(v.nome))) conta.orfani++; }catch(e){} }
  let vd=null; try{ vd=await dataDir.getDirectoryHandle('video',{create:false}); }catch(e){}
  if(vd){
    let nomi=null; const ev=await bkElenco(vd); if(ev) nomi=ev.filter(x=>!x.cartella).map(x=>x.nome);
    if(!nomi) nomi=[...new Set((DOC.esercizi||[]).map(e=>String((e&&e.video)||'').replace(/^video\//,'')).filter(Boolean))];
    for(const f of nomi){ voci.push({nome:'video/'+f, leggi:()=>bkLeggiFile(vd, f), muto:true}); conta.video++; } }
  const imp={}; BK_IMPOSTAZIONI.forEach(k=>{ try{ const v=localStorage.getItem(k); if(v!=null) imp[k]=v; }catch(e){} });
  voci.push({nome:'impostazioni.json', dati:pkTesto(imp)});
  let tel=false;
  if(password){ try{ const v=localStorage.getItem(TEL_KEY); if(v){ voci.push({nome:'telefono.json', dati:new TextEncoder().encode(v)}); tel=true; } }catch(e){} }
  return {voci, conta, telefono:tel}; }
/* il backup COMPLETO (scaricato a mano, anche con la password): tutte le voci dentro, versione 1 */
async function backupCostruisci(password){
  const E=await bkEnumera(password), voci=[];
  for(const v of E.voci){ const d=await bkDati(v); if(d) voci.push({nome:v.nome, dati:d}); else if(v.foto) E.conta.foto--; else if(v.muto && /^video\//.test(v.nome)) E.conta.video--; }
  const man={formato:BK_FORMATO, versione:BK_V_COMPLETO, app:APP_VERSION, creato:new Date().toISOString(), profili:profili.map(p=>({slug:p.slug, nome:p.nome})), conta:E.conta, telefono:E.telefono};
  const interno=zipScrivi([{nome:'tms.json', dati:pkTesto(man)}].concat(voci));
  zipLeggi(interno);   /* si rilegge tutto, coi controlli d'integrità, prima di consegnarlo */
  return {bytes:password? await pkCifraArchivio(interno, password, BK_FORMATO) : interno, conta:E.conta, man}; }

/* ── BACKUP «A DEPOSITO» (27/11/2026; Marco: «sì, fallo» alla proposta di Doc/coordinamento/DIMENSIONI_DATI.md) ──────────
   I backup automatici di ogni settimana, la copia fuori dal PC e la copia di sicurezza prima di un ripristino non ripetono
   più i file grandi: un file da BK_SOGLIA in su va UNA volta sola nella cartella «deposito», col nome della sua impronta
   SHA-256, e il backup (.tmsb, versione 2, deposito:true) porta i file piccoli più l'elenco deposito.json [{nome, sha,
   dim}]. Una foto che non cambia, un mese chiuso del bracciale, una seduta finita si salvano una volta per sempre: lo
   spazio resta circa quello dei dati invece di 17 volte tanto, e il backup si fa un file alla volta, senza tenere tutto
   in memoria. Ogni file nuovo nel deposito si rilegge e se ne ricontrolla l'impronta.
   deposito/indice.json = {versione:1, backup:{<nome del backup>:[impronte]}}: il backup si segna PRIMA di scriverlo; tolto
   un backup vecchio, le impronte che nessun backup tenuto usa più si cancellano (bkDepPulisci). Se l'indice non si legge
   o manca mentre nel deposito ci sono già file, non si cancella niente (meglio un po' di spazio che un backup monco).
   Locale: backup_automatici/deposito/<sha>.bin, binario (ponte dei dati). Fuori dal PC: <cartella>/deposito/<sha>.json =
   {sha, dim, b64} (il ponte della cartella scelta, electron/main.js, accetta solo .json e .tmsb e legge testo).
   Il backup scaricato a mano resta COMPLETO (backupCostruisci). Il ripristino di un backup a deposito prende i file dal
   deposito di questo PC o da quello della cartella scelta in Impostazioni › Copia dei backup (bkRisolvi), controllando
   l'impronta di ognuno; se ne manca anche uno, non ripristina niente e lo dice. ── */
const BK_SOGLIA=32*1024, BK_DEP_DIR='deposito';
async function bkSha(u8){ const h=new Uint8Array(await crypto.subtle.digest('SHA-256', u8)); let s=''; for(let i=0;i<h.length;i++) s+=(h[i]<16?'0':'')+h[i].toString(16); return s; }
function bkB64(u8){ let s=''; for(let i=0;i<u8.length;i+=0x8000) s+=String.fromCharCode.apply(null, u8.subarray(i, i+0x8000)); return btoa(s); }
const BK_SHA_RE=/^[0-9a-f]{64}$/;
/* il deposito di questo PC (backup_automatici/deposito) */
async function bkDepLocale(){
  const dir=await dataDir.getDirectoryHandle(AUTOBK_DIR,{create:true}), dd=await dir.getDirectoryHandle(BK_DEP_DIR,{create:true});
  const leggi=sha=>bkLeggiFile(dd, sha+'.bin');
  return {nome:'locale',
    async elenco(){ const l=(await bkElenco(dd))||[]; return new Set(l.filter(x=>!x.cartella && /^[0-9a-f]{64}\.bin$/.test(x.nome)).map(x=>x.nome.slice(0,64))); },
    async scrivi(sha, u8){ await bkScriviBin(dd, sha+'.bin', u8); if(await bkSha(await leggi(sha))!==sha) throw new Error('deposito: il file scritto non torna ('+sha.slice(0,12)+')'); },
    leggi, async togli(sha){ await dd.removeEntry(sha+'.bin'); },
    async indice(){ return leggiJson(dd, 'indice.json'); }, async salvaIndice(o){ await writeJson(dd, 'indice.json', o); } }; }
/* il deposito della cartella fuori dal PC (window.tmsScambio) */
function bkDepEsterno(){
  const S=window.tmsScambio, nome=sha=>BK_DEP_DIR+'/'+sha+'.json';
  const leggi=async sha=>{ const r=await S.leggi(nome(sha)); if(!r || r.stato!=='ok') return null; const o=JSON.parse(r.testo); return (o && o.sha===sha)? pkDaB64(o.b64) : null; };
  return {nome:'esterno',
    async elenco(){ const l=(await S.elenca(BK_DEP_DIR))||[]; return new Set(l.filter(n=>/^[0-9a-f]{64}\.json$/.test(n)).map(n=>n.slice(0,64))); },
    async scrivi(sha, u8){ await S.scrivi(nome(sha), JSON.stringify({sha:sha, dim:u8.length, b64:bkB64(u8)}));
      const r=await leggi(sha); if(!r || await bkSha(r)!==sha) throw new Error('deposito: il file scritto non torna ('+sha.slice(0,12)+')'); },
    leggi, async togli(sha){ await S.togli(nome(sha)); },
    async indice(){ let r=null; try{ r=await S.leggi(BK_DEP_DIR+'/indice.json'); }catch(e){ return {stato:'illeggibile'}; }
      if(!r || r.stato!=='ok') return {stato:(r && r.stato) || 'assente'}; try{ return {stato:'ok', dati:JSON.parse(r.testo)}; }catch(e){ return {stato:'illeggibile'}; } },
    async salvaIndice(o){ await S.scrivi(BK_DEP_DIR+'/indice.json', JSON.stringify(o)); } }; }
/* l'indice del deposito: {dati, sicuro}. sicuro=false (indice illeggibile, o mancante con file già nel deposito): si scrive
   ma non si cancella niente */
async function bkDepIndice(dep, presenti){
  const r=await dep.indice();
  if(r && r.stato==='ok' && r.dati && typeof r.dati==='object' && r.dati.backup && typeof r.dati.backup==='object')
    return {dati:r.dati, sicuro:!r.dati.incompleto};
  const vuoto={versione:1, backup:{}};
  if(r && r.stato==='illeggibile') return {dati:vuoto, sicuro:false, nonSalvare:true};
  if(presenti.size) vuoto.incompleto=true;   /* l'indice è sparito con dei file già dentro: da qui non si cancella più */
  return {dati:vuoto, sicuro:!presenti.size}; }
/* un backup a deposito chiamato `nomeFile`: i file grandi nel deposito (una volta), il resto nel .tmsb. Torna i byte del
   .tmsb e l'indice da aggiornare dopo averlo scritto */
async function bkCostruisciDeposito(dep, nomeFile){
  const E=await bkEnumera(null), presenti=await dep.elenco(), ind=await bkDepIndice(dep, presenti);
  const piccoli=[], lista=[], usati=new Set();
  for(const v of E.voci){
    const d=await bkDati(v);
    if(!d){ if(v.foto) E.conta.foto--; else if(v.muto && /^video\//.test(v.nome)) E.conta.video--; continue; }
    if(d.length<BK_SOGLIA){ piccoli.push({nome:v.nome, dati:d}); continue; }
    const sha=await bkSha(d);
    if(!presenti.has(sha)){ await dep.scrivi(sha, d); presenti.add(sha); }
    lista.push({nome:v.nome, sha:sha, dim:d.length}); usati.add(sha); }
  /* il backup si segna nell'indice PRIMA di esistere: un'interruzione dopo non lascia un backup senza le sue impronte */
  ind.dati.backup[nomeFile]=[...usati];
  if(!ind.nonSalvare) await dep.salvaIndice(ind.dati);
  const man={formato:BK_FORMATO, versione:BK_V_DEPOSITO, deposito:true, app:APP_VERSION, creato:new Date().toISOString(), profili:profili.map(p=>({slug:p.slug, nome:p.nome})), conta:E.conta, telefono:false};
  const interno=zipScrivi([{nome:'tms.json', dati:pkTesto(man)}].concat(piccoli, [{nome:'deposito.json', dati:pkTesto(lista)}]));
  zipLeggi(interno);
  return {bytes:interno, conta:E.conta, man, ind}; }
/* dopo la rotazione: le impronte che nessun backup tenuto usa più se ne vanno (solo con un indice sicuro) */
async function bkDepPulisci(dep, ind, tenuti){
  const tieni=new Set(tenuti.map(String)), vivi=new Set();
  Object.keys(ind.dati.backup).forEach(n=>{ if(!tieni.has(n)) delete ind.dati.backup[n]; else (ind.dati.backup[n]||[]).forEach(s=>vivi.add(s)); });
  if(!ind.nonSalvare) await dep.salvaIndice(ind.dati);
  if(!ind.sicuro) return 0;
  let n=0;
  for(const sha of await dep.elenco()){ if(vivi.has(sha)) continue; try{ await dep.togli(sha); n++; }catch(e){ logErrore('deposito/togli', e); } }
  return n; }
/* un file del deposito per il ripristino: prima quello di questo PC, poi quello della cartella fuori dal PC */
async function bkRisolvi(sha){
  if(!BK_SHA_RE.test(String(sha))) return null;
  try{ if(dataDir){ const dd=await (await dataDir.getDirectoryHandle(AUTOBK_DIR,{create:false})).getDirectoryHandle(BK_DEP_DIR,{create:false}); return await bkLeggiFile(dd, sha+'.bin'); } }catch(e){}
  try{ if(bkEstDisponibile() && bkEstStato().scelta) return await bkDepEsterno().leggi(sha); }catch(e){}
  return null; }

/* ── lettura: il contenuto del backup, e la stessa «fotografia» dei vecchi backup .json (snap) ── */
async function backupLeggi(bytes, chiediPw){
  let voci; try{ voci=zipLeggi(bytes); }catch(e){ throw new Error(t('Questo file non è un backup del TMS (o è rovinato).')); }
  let man; try{ man=pkJson(voci, 'tms.json'); }catch(e){ man=null; }
  if(!man || man.formato!==BK_FORMATO) throw new Error(t('Questo file non è un backup del TMS (o è rovinato).'));
  if(+man.versione>BK_VERSIONE) throw new Error(t('Il file viene da una versione più nuova del TMS: aggiorna l’app e riprova.'));
  if(man.cifrato){ const pw=await chiediPw(); if(pw==null) return null; return backupLeggi(await pkDecifraArchivio(voci, man, pw), async()=>null); }
  /* backup a deposito: i file grandi dal deposito, ognuno con la sua impronta controllata; ne manca uno = niente ripristino */
  if(man.deposito){
    let lista=null; try{ lista=pkJson(voci, 'deposito.json'); }catch(e){}
    if(!Array.isArray(lista)) throw new Error(t('Questo backup è rovinato: manca l’elenco del deposito.'));
    const mancano=[];
    for(const it of lista){ if(!it || !it.nome || !BK_SHA_RE.test(String(it.sha))){ mancano.push(String(it && it.nome)); continue; }
      let d=null; try{ d=await bkRisolvi(it.sha); }catch(e){}
      if(!d || await bkSha(d)!==it.sha){ mancano.push(it.nome); continue; }
      voci.push({nome:String(it.nome), dati:d}); }
    if(mancano.length) throw new Error(t('Questo backup tiene i file grandi (foto, video, dati del bracciale…) nel suo deposito, e ne mancano')+' '+mancano.length+'. '+
      t('Se è una copia fuori dal PC, scegli la sua cartella in Impostazioni › Copia dei backup e riprova.')); }
  const dec=new TextDecoder(), js=v=>{ if(!v) return undefined; try{ return JSON.parse(dec.decode(v.dati)); }catch(e){ return undefined; } };
  const voce=n=>voci.find(x=>x.nome===n);
  const raccogli=pref=>{ const r={}; voci.forEach(v=>{ if(!v.nome.startsWith(pref)) return; const m=v.nome.slice(pref.length).match(/^([^/]+)\/(.+)$/);
    if(m && bkNomeSicuro(m[2])) (r[m[1]]=r[m[1]]||[]).push({nome:m[2], dati:v.dati}); }); return r; };
  const file=raccogli('profili/'), orfani=raccogli('orfani/');
  const pl=js(voce('libreria/'+FILES.profili))||{list:man.profili||[], active:((man.profili||[])[0]||{}).slug};
  const profiles={};
  Object.keys(file).forEach(slug=>{ const get=n=>js(file[slug].find(x=>x.nome===n));
    profiles[slug]=Object.assign({scheda:get(FILES.scheda)||{settimanale:[],mensile:[]}, storico:get(FILES.storico)||[], alimentazione:get(FILES.alimentazione)||{bulk:[],mant:[],cut:[]}}, corpoFile(corpoDaFile(get(FILES.corpo)))); });
  const video=voci.filter(v=>/^video\/[^/]+$/.test(v.nome) && bkNomeSicuro(v.nome)).map(v=>({nome:v.nome.slice(6), dati:v.dati}));
  const tv=voce('telefono.json');
  return {man, file, orfani, video, libreria:voci.filter(v=>/^libreria\/[^/]+$/.test(v.nome)).map(v=>({nome:v.nome.slice(9), dati:v.dati})),
    impostazioni:js(voce('impostazioni.json'))||{}, telefono:tv? dec.decode(tv.dati) : null, attivo:pl.active,
    snap:{_tms:'backup', version:man.app, date:man.creato, profili:Array.isArray(pl.list)? pl.list : [], esercizi:js(voce('libreria/'+FILES.esercizi))||[], ricette:js(voce('libreria/'+FILES.ricette))||[], profiles}}; }

/* ── ripristino di tutto: i profili di adesso vanno nel cestino (e prima c'è la copia di sicurezza) ── */
async function backupRipristinaTutto(bk){
  if(!dataDir){ avviso(t('Il TMS non è collegato ai dati.')); return false; }
  try{ await salvaCopiaDiSicurezza(); }catch(e){ logErrore('copiaDiSicurezza', e); }
  clearTimeout(saveTimer); pendingSaves.clear(); sbloccaScritture();
  try{
    if(typeof dataDir.cestina==='function') for(const p of profili.slice()){ try{ await dataDir.cestina(p.slug); }catch(e){ logErrore('ripristino/cestino:'+p.slug, e); } }
    for(const slug of Object.keys(bk.file)){ const pd=await dataDir.getDirectoryHandle(slug,{create:true}); for(const f of bk.file[slug]) await bkScriviBin(pd, f.nome, f.dati); }
    for(const slug of Object.keys(bk.orfani)){ if(bk.file[slug]) continue; const pd=await dataDir.getDirectoryHandle(slug,{create:true}); for(const f of bk.orfani[slug]) await bkScriviBin(pd, f.nome, f.dati); }
    for(const f of bk.libreria) await bkScriviBin(dataDir, f.nome, f.dati);
    if(bk.video.length){ const vd=await dataDir.getDirectoryHandle('video',{create:true}); for(const v of bk.video) await bkScriviBin(vd, v.nome, v.dati); }
    const linguaPrima=LANG;
    Object.keys(bk.impostazioni).forEach(k=>{ if(BK_IMPOSTAZIONI.includes(k)) try{ localStorage.setItem(k, String(bk.impostazioni[k])); }catch(e){} });
    if(bk.telefono){ try{ localStorage.setItem(TEL_KEY, bk.telefono); TEL=null; }catch(e){} }
    profili=bk.snap.profili.length? bk.snap.profili : Object.keys(bk.file).map(s=>({slug:s, nome:s, creato:''}));
    if(bk.snap.esercizi.length){ DOC.esercizi=bk.snap.esercizi; rebuildEs(); }
    DOC.ricette=bk.snap.ricette||[];
    activeProfile=(profili.some(p=>p.slug===bk.attivo)? bk.attivo : (profili[0]||{}).slug)||PROFILO_DEMO.slug;
    if(!bk.libreria.some(f=>f.nome===FILES.profili)) await writeJson(dataDir, FILES.profili, {list:profili, active:activeProfile});
    profileDir=await dataDir.getDirectoryHandle(activeProfile,{create:true});
    await loadProfile();
    try{ TACC=taccNormalizza(await readJson(dataDir, TACC_FILE)); }catch(e){}
    applicaTema(temaGet(), notteGet());
    saveCache(); cruscottoInvalida(); undoAzzera(); renderAll(); showTab('profilo');
    const c=bk.man.conta||{}, cambiaLingua=bk.impostazioni['tms-lang'] && bk.impostazioni['tms-lang']!==linguaPrima;
    avviso(t('Backup ripristinato:')+' '+profili.length+' '+t(profili.length===1?'profilo':'profili')+(c.foto? ', '+c.foto+' '+t('foto') : '')+(c.video? ', '+c.video+' '+t('video') : '')+'.'+
      (bk.telefono? ' '+t('Collegamenti dei telefoni ripristinati.') : '')+(cambiaLingua? ' '+t('Riapri il TMS per la lingua del backup.') : ''));
    return true;
  }catch(e){ logErrore('ripristino', e); avviso(t('Ripristino non riuscito:')+' '+(e.message||e)+'. '+t('I dati di prima sono nel cestino dei profili e fra i backup ripristinabili.')); return false; } }
/* ── riprendere un solo cliente da un backup (gli altri profili non si toccano) ── */
async function backupRiprendiCliente(bk, slug){
  const f=bk.file[slug]; if(!f) return false;
  const js=n=>{ const x=f.find(v=>v.nome===n); if(!x) return undefined; try{ return JSON.parse(new TextDecoder().decode(x.dati)); }catch(e){ return undefined; } };
  const dati={scheda:js(FILES.scheda)||{settimanale:[],mensile:[]}, storico:js(FILES.storico)||[], corpo:js(FILES.corpo)||corpoFile({}), alimentazione:js(FILES.alimentazione)||{bulk:[],mant:[],cut:[]}};
  const ne=pkNomiEsercizi(dati.scheda, dati.storico), na=pkNomiAlimenti(dati.alimentazione);
  const esercizi=(bk.snap.esercizi||[]).filter(e=>e && ne.has(String(e.nome||'').trim()));
  const nomiVideo=new Set(esercizi.map(e=>String((e&&e.video)||'').replace(/^video\//,'')).filter(Boolean));
  return pacchettoImportaPk({man:{profilo:(bk.snap.profili||[]).find(p=>p.slug===slug)||{slug, nome:slug}}, dati,
    foto:f.filter(x=>/^foto\/[^/]+$/.test(x.nome)).map(x=>({nome:x.nome.slice(5), dati:x.dati})), esercizi,
    ricette:(bk.snap.ricette||[]).filter(r=>r && na.has(String(r.nome||'').trim())), video:bk.video.filter(v=>nomiVideo.has(v.nome))}); }

/* ── aprire un backup: cosa c'è dentro, poi «Ripristina tutto» o «Riprendi solo un cliente» ── */
async function backupApri(bytes){
  let bk; try{ bk=await backupLeggi(bytes, ()=>chiediPassword(t('Backup protetto da password'), t('Scrivi la password con cui è stato fatto.'))); }
  catch(e){ avviso(String(e.message||e)); return false; }
  if(!bk) return false;
  const c=bk.man.conta||{}, quando=(()=>{ try{ return new Date(bk.man.creato).toLocaleString(LANG==='en'?'en-GB':'it-IT',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}); }catch(e){ return String(bk.man.creato||''); } })();
  const nomi=(bk.snap.profili||[]).map(p=>'«'+esc(p.nome||p.slug)+'»').join(', ');
  const riga=(l,v)=>`<div class="lat-num"><span>${esc(l)}</span><b>${v}</b></div>`;
  const sc=await sceltaModal(t('Backup del')+' '+quando,
    `<div class="bk-info">${riga(t('Profili'), (bk.snap.profili||[]).length+(nomi? ' · '+nomi : ''))}${riga(t('Foto'), c.foto||0)}${riga(t('Video personali'), c.video||0)}
      ${c.orfani? riga(t('Profili fuori elenco'), c.orfani) : ''}${riga(t('Collegamenti dei telefoni'), bk.telefono? t('sì') : t('no (servirà il codice di recupero)'))}${riga(t('Versione del TMS'), esc(bk.man.app||'?'))}</div>`,
    [{id:'cliente', testo:t('Riprendi solo un cliente…')}, {id:'tutto', testo:t('Ripristina tutto'), pericolo:true}]);
  if(sc==='tutto'){
    if(!await conferma(t('Ripristino tutto il backup? I profili di adesso vanno nel cestino dei profili e resta una copia di sicurezza fra i backup ripristinabili.'))) return false;
    return backupRipristinaTutto(bk); }
  if(sc==='cliente'){
    const lista=(bk.snap.profili||[]).filter(p=>bk.file[p.slug]); if(!lista.length){ avviso(t('Nel backup non ci sono clienti da riprendere.')); return false; }
    const quale=await sceltaModal(t('Quale cliente riprendo?'), t('Gli altri profili non si toccano.'), lista.map(p=>({id:p.slug, testo:p.nome||p.slug})));
    if(quale) return backupRiprendiCliente(bk, quale); }
  return false; }

/* ── il pulsante «Backup» (tab Profilo): password facoltativa, file TMS-backup-AAAA-MM-GG.tmsb ── */
async function backupScarica(){
  const sc=await modalConPassword(t('Backup di tutto il TMS'),
    t('Tutti i profili con le foto, il catalogo degli esercizi, le ricette, i video personali, le impostazioni e il taccuino, in un file .tmsb. Si riprende con «Ripristina», tutto o un cliente alla volta.'),
    t('Fai il backup'), t('Con la password nel backup vanno anche i collegamenti dei telefoni: su un PC nuovo tornano da soli. Senza la password il file non si apre: non c’è modo di recuperarla.'));
  if(!sc) return;
  try{ const r=await backupCostruisci(sc.password); pkScarica(r.bytes, 'TMS-backup-'+dataOggi()+'.tmsb'); }
  catch(e){ logErrore('backup', e); avviso(t('Errore backup:')+' '+(e.message||e)); } }

/* ── PROFILI FUORI ELENCO (D): cartelle con dati di profilo che l'elenco non conosce più
   (non quelle che stanno solo nei dati dell'installazione, «seme»: lì non si scrive e non si cestina) ── */
async function profiliFuoriElenco(){
  if(!dataDir) return [];
  const radice=await bkElenco(dataDir); if(!radice) return [];
  const out=[];
  for(const d of radice.filter(x=>x.cartella && !x.seme && !BK_SPECIALI.includes(x.nome) && !x.nome.startsWith('_') && !profili.some(p=>p.slug===x.nome))){
    try{ const pd=await dataDir.getDirectoryHandle(d.nome,{create:false}), el=await bkElenco(pd)||[];
      if(!el.some(x=>[FILES.scheda, FILES.storico, FILES.corpo, FILES.alimentazione].includes(x.nome))) continue;
      let nome=d.nome; try{ const co=await readJson(pd, FILES.corpo); if(co && co.dati_utente && co.dati_utente.nome) nome=String(co.dati_utente.nome); }catch(e){}
      out.push({slug:d.nome, nome}); }catch(e){} }
  return out; }
async function orfaniRimetti(lista){
  lista.forEach(o=>{ if(!profili.some(p=>p.slug===o.slug)) profili.push({slug:o.slug, nome:o.nome, creato:''}); });
  await writeJson(dataDir, FILES.profili, {list:profili, active:activeProfile}); saveCache(); cruscottoInvalida(); renderProfilo(); }
async function orfaniCestina(lista){
  if(typeof dataDir.cestina!=='function') return;
  for(const o of lista){ try{ await dataDir.cestina(o.slug); }catch(e){ logErrore('orfani/cestino:'+o.slug, e); } }
  renderProfilo(); }
async function orfaniRiquadro(box){
  const l=await profiliFuoriElenco(); if(!box) return;
  if(!l.length){ box.innerHTML=''; return; }
  box.innerHTML=`<div class="callout callout--warn" style="margin-top:8px"><div>${t('Ho trovato')} ${l.length} ${t(l.length===1?'profilo non in elenco':'profili non in elenco')}: ${l.map(o=>'<b>'+esc(o.nome)+'</b>').join(', ')}. ${t('I dati ci sono, ma il TMS non li mostra.')}
    <div class="bar" style="margin-top:8px"><button class="btn btn--sm btn--ember" id="orf-rimetti">${t('Rimettili in elenco')}</button><button class="btn btn--sm" id="orf-cestina">${t('Mettili nel cestino')}</button></div></div></div>`;
  document.getElementById('orf-rimetti').onclick=()=>orfaniRimetti(l);
  document.getElementById('orf-cestina').onclick=async()=>{ if(await conferma(t('Metto nel cestino dei profili')+' '+l.map(o=>'«'+o.nome+'»').join(', ')+'? '+t('Da lì si possono ancora recuperare a mano.'))) orfaniCestina(l); }; }
/* ── PROMEMORIA della copia fuori dal PC (E): una riga, non una notifica. Senza cartella lo ricorda; con la
      cartella, avvisa se da più di BKEST_AVVISO_GIORNI giorni la copia non riesce (OneDrive scollegato,
      chiavetta tolta…): da quando, il motivo se è noto, «Copia adesso» e «Scegli un'altra cartella…». ── */
function copiaFuoriRiquadro(){
  if(!bkEstDisponibile()) return '';
  if(!bkEstStato().scelta) return `<div class="callout callout--warn no-print" id="prof-copia-fuori" style="margin-top:8px"><div>${t('Nessuna copia dei backup fuori da questo PC: se il disco si rompe, lo storico dei clienti si perde.')}
    <div class="bar" style="margin-top:8px"><button class="btn btn--sm btn--ember" id="prof-copia-scegli">${t('Scegli una cartella…')}</button></div></div></div>`;
  const r=bkEstRitardo(); if(!r) return '';
  let quando=r.dal; try{ quando=new Date(r.dal).toLocaleDateString(LANG==='en'?'en-GB':'it-IT',{day:'numeric',month:'long',year:'numeric'}); }catch(e){}
  return `<div class="callout callout--warn no-print" id="prof-copia-ko" style="margin-top:8px"><div>${t(r.mai? 'Nessuna copia dei backup è ancora riuscita nella cartella fuori da questo PC, scelta il' : 'La copia dei backup fuori da questo PC non riesce dal')} <b>${esc(quando)}</b>${r.motivo? ' ('+esc(r.motivo)+')' : ''}. ${t('Se la cartella è su OneDrive o su un disco esterno, controlla che sia collegato.')}
    <div class="bar" style="margin-top:8px"><button class="btn btn--sm btn--ember" id="prof-copia-ora">${t('Copia adesso')}</button><button class="btn btn--sm" id="prof-copia-scegli">${t('Scegli un’altra cartella…')}</button></div></div></div>`; }
async function copiaFuoriScegli(){ if(await bkEstScegli()) await bkEstCopia(true); renderProfilo(); }
async function copiaFuoriAdesso(b){
  if(b){ b.disabled=true; b.textContent=t('Copia in corso…'); }
  const ok=await bkEstCopia(true);
  renderProfilo();
  if(!ok){ const st=bkEstStato(); await avviso(t('La copia non è riuscita.')+(st.errore? ' '+st.errore : '')); }
  return ok; }
