/* ════ FILE .TMS — un cliente in un file solo (26/11/2026, richiesta di Marco) ════
   Il lavoro di tutti i giorni resta nella libreria (cartelle in TMS_Dati, salvataggio automatico, telefoni,
   backup). Il file .tms serve a SCAMBIARE e ARCHIVIARE: si esporta un cliente, lo si passa a un collega o
   su un altro PC, lo si archivia quando smette e lo si riprende quando torna.
   Formato (documentato, «proprietario» solo nel nome): un archivio ZIP senza compressione, come .docx e .xlsx:
     tms.json                {formato:'tms-cliente', versione, app, creato, profilo:{slug, nome, …}, foto}
     dati/scheda.json, dati/storico.json, dati/corpo.json, dati/alimentazione.json   (gli stessi file della libreria)
     foto/<file>             le foto progressi come immagini vere
     catalogo/esercizi.json, catalogo/ricette.json   esercizi e ricette che il cliente usa (all'arrivo si
                             aggiungono solo quelli che mancano: il catalogo di chi riceve non si tocca)
   Con la password: tms.json dice solo {formato, versione, cifrato:true, kdf, iv} e contenuto.bin è l'archivio
   di sopra cifrato (AES-GCM 256, chiave PBKDF2-SHA256 dalla password). I codici del telefono collegato NON
   viaggiano: sul PC che riceve, il cliente si ricollega col QR. */
const TMS_FORMATO='tms-cliente', TMS_VERSIONE=1, TMS_PBKDF2=310000, TMS_AAD='tms-cliente-v1';

/* ── ZIP senza compressione (metodo 0, nomi in UTF-8) ── */
const ZIP_CRC=(()=>{ const tb=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=(c&1)? (0xEDB88320^(c>>>1)) : (c>>>1); tb[n]=c>>>0; } return tb; })();
function zipCrc(b){ let c=0xFFFFFFFF; for(let i=0;i<b.length;i++) c=ZIP_CRC[(c^b[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function zipUnisci(pezzi){ const n=pezzi.reduce((a,p)=>a+p.length,0), out=new Uint8Array(n); let o=0; pezzi.forEach(p=>{ out.set(p,o); o+=p.length; }); return out; }
function zipScrivi(voci){
  const enc=new TextEncoder(), parti=[], centrale=[], d=new Date(); let off=0;
  const ora=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF, giorno=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;
  for(const v of voci){
    const nome=enc.encode(v.nome), dati=v.dati, crc=zipCrc(dati);
    const h=new DataView(new ArrayBuffer(30));
    h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x0800,true); h.setUint16(8,0,true); h.setUint16(10,ora,true); h.setUint16(12,giorno,true);
    h.setUint32(14,crc,true); h.setUint32(18,dati.length,true); h.setUint32(22,dati.length,true); h.setUint16(26,nome.length,true); h.setUint16(28,0,true);
    parti.push(new Uint8Array(h.buffer), nome, dati);
    const c=new DataView(new ArrayBuffer(46));
    c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x0800,true); c.setUint16(10,0,true); c.setUint16(12,ora,true); c.setUint16(14,giorno,true);
    c.setUint32(16,crc,true); c.setUint32(20,dati.length,true); c.setUint32(24,dati.length,true); c.setUint16(28,nome.length,true); c.setUint32(42,off,true);
    centrale.push(new Uint8Array(c.buffer), nome);
    off+=30+nome.length+dati.length; }
  const lungC=centrale.reduce((a,p)=>a+p.length,0), e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true); e.setUint16(8,voci.length,true); e.setUint16(10,voci.length,true); e.setUint32(12,lungC,true); e.setUint32(16,off,true);
  return zipUnisci(parti.concat(centrale, [new Uint8Array(e.buffer)])); }
function zipLeggi(b){
  if(!(b instanceof Uint8Array)) b=new Uint8Array(b);
  const dv=new DataView(b.buffer, b.byteOffset, b.byteLength), dec=new TextDecoder();
  let fine=-1; for(let i=b.length-22; i>=Math.max(0, b.length-65557); i--) if(dv.getUint32(i,true)===0x06054b50){ fine=i; break; }
  if(fine<0) throw new Error('non è un archivio');
  const n=dv.getUint16(fine+10,true); let p=dv.getUint32(fine+16,true); const voci=[];
  for(let k=0;k<n;k++){
    if(dv.getUint32(p,true)!==0x02014b50) throw new Error('indice dell\'archivio rovinato');
    const metodo=dv.getUint16(p+10,true), crc=dv.getUint32(p+16,true), dim=dv.getUint32(p+20,true), lnome=dv.getUint16(p+28,true), lextra=dv.getUint16(p+30,true), lcomm=dv.getUint16(p+32,true), loc=dv.getUint32(p+42,true);
    const nome=dec.decode(b.subarray(p+46, p+46+lnome));
    if(metodo!==0) throw new Error('archivio compresso: non è un file del TMS');
    if(dv.getUint32(loc,true)!==0x04034b50) throw new Error('voce dell\'archivio rovinata');
    const inizio=loc+30+dv.getUint16(loc+26,true)+dv.getUint16(loc+28,true), dati=b.subarray(inizio, inizio+dim);
    if(dati.length!==dim || zipCrc(dati)!==crc) throw new Error('il file è rovinato ('+nome+')');
    voci.push({nome, dati});
    p+=46+lnome+lextra+lcomm; }
  return voci; }
const pkTesto=o=>new TextEncoder().encode(JSON.stringify(o));
function pkJson(voci, nome){ const v=voci.find(x=>x.nome===nome); if(!v) return undefined; return JSON.parse(new TextDecoder().decode(v.dati)); }
function pkB64(u8){ let s=''; for(let i=0;i<u8.length;i++) s+=String.fromCharCode(u8[i]); return btoa(s); }
function pkDaB64(s){ const bin=atob(String(s||'')), u8=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i); return u8; }
/* cifratura dell'archivio intero (file .tms e backup .tmsb): fuori restano solo formato, versione e i parametri */
async function pkCifraArchivio(interno, password, formato){
  const sale=crypto.getRandomValues(new Uint8Array(16)), iv=crypto.getRandomValues(new Uint8Array(12));
  const cif=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData:new TextEncoder().encode(TMS_AAD)}, await pkChiave(password, sale), interno));
  return zipScrivi([{nome:'tms.json', dati:pkTesto({formato, versione:1, cifrato:true, kdf:{nome:'PBKDF2-SHA256', iterazioni:TMS_PBKDF2, sale:pkB64(sale)}, iv:pkB64(iv)})},
    {nome:'contenuto.bin', dati:cif}]); }
async function pkDecifraArchivio(voci, man, pw){
  const cont=voci.find(v=>v.nome==='contenuto.bin'); if(!cont || !man.kdf || !man.iv) throw new Error(t('Il file è rovinato:')+' contenuto.bin');
  try{ return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM', iv:pkDaB64(man.iv), additionalData:new TextEncoder().encode(TMS_AAD)},
    await pkChiave(pw, pkDaB64(man.kdf.sale)), cont.dati)); }
  catch(e){ throw new Error(t('Password sbagliata.')); } }
/* un esercizio «personalizzato»: non c'è nel catalogo che arriva con l'installazione, oppure è stato cambiato */
function pkStabile(o){ return JSON.stringify(o, (k,v)=>(v && typeof v==='object' && !Array.isArray(v))? Object.keys(v).sort().reduce((a,x)=>{ a[x]=v[x]; return a; }, {}) : v); }
function pkPersonalizzato(e){ const n=String((e&&e.nome)||'').trim(), r=((typeof REF!=='undefined' && REF.esercizi)||[]).find(x=>String((x&&x.nome)||'').trim()===n);
  return !r || pkStabile(r)!==pkStabile(e); }
async function pkChiave(password, sale){
  const k=await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', salt:sale, iterations:TMS_PBKDF2, hash:'SHA-256'}, k, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']); }

/* ── costruzione: i file di un profilo (anche non aperto), letti dal disco ── */
function pkNomiEsercizi(scheda, storico){
  const s=new Set(), metti=r=>{ const n=String((r&&r.esercizio)||'').trim(); if(n) s.add(n); };
  ['settimanale','mensile'].forEach(k=>((scheda||{})[k]||[]).forEach(metti));
  const ri=(scheda||{}).riscaldamento||{}; ['settimanale','mensile'].forEach(k=>(Array.isArray(ri[k])? ri[k] : []).forEach(metti));
  (storico||[]).forEach(metti); return s; }
function pkNomiAlimenti(al){
  const s=new Set(), metti=r=>{ const n=String((r&&r.alimento)||'').trim(); if(n) s.add(n); };
  ['bulk','mant','cut'].forEach(k=>((al||{})[k]||[]).forEach(metti));
  ((al||{}).periodi||[]).forEach(p=>(p.righe||[]).forEach(metti)); return s; }
async function pacchettoCostruisci(slug, password){
  if(!dataDir) throw new Error(t('Il TMS non è collegato ai dati.'));
  const p=profili.find(x=>x.slug===slug); if(!p) throw new Error(t('Profilo sconosciuto.'));
  if(slug===activeProfile){ clearTimeout(saveTimer); await flushSaves(); }   /* le ultime modifiche, su disco */
  const pd=await dataDir.getDirectoryHandle(slug, {create:false});
  const parti={};
  for(const k of ['scheda','storico','corpo','alimentazione']){
    const r=await leggiJson(pd, FILES[k]);
    if(r.stato==='illeggibile') throw new Error(t('Non riesco a leggere')+' '+FILES[k]+': '+t('non esporto un cliente a metà.'));
    parti[k]=r.stato==='ok'? r.dati : null; }
  parti.scheda=parti.scheda||{settimanale:[],mensile:[]}; parti.storico=parti.storico||[]; parti.corpo=parti.corpo||corpoFile({}); parti.alimentazione=parti.alimentazione||{bulk:[],mant:[],cut:[]};
  const voci=[{nome:'dati/scheda.json', dati:pkTesto(parti.scheda)}, {nome:'dati/storico.json', dati:pkTesto(parti.storico)},
    {nome:'dati/corpo.json', dati:pkTesto(parti.corpo)}, {nome:'dati/alimentazione.json', dati:pkTesto(parti.alimentazione)}];
  let nFoto=0;
  for(const f of (parti.corpo.foto||[])){
    const nome=String((f&&f.file)||''); if(!nome || /[\\/]/.test(nome)) continue;
    try{ const fd=await pd.getDirectoryHandle('foto',{create:false}); const fh=await fd.getFileHandle(nome,{create:false});
      voci.push({nome:'foto/'+nome, dati:new Uint8Array(await (await fh.getFile()).arrayBuffer())}); nFoto++; }
    catch(e){ logErrore('pacchetto/foto:'+nome, e); }   /* una foto mancante non ferma l'esportazione */
  }
  /* gli esercizi che il cliente usa e che non sono quelli dell'installazione (creati o cambiati da te), coi loro
     video personali: chi riceve il file non deve rifarli. Gli esercizi dell'installazione li ha già. */
  const ne=pkNomiEsercizi(parti.scheda, parti.storico), na=pkNomiAlimenti(parti.alimentazione);
  const pers=(DOC.esercizi||[]).filter(e=>e && ne.has(String(e.nome||'').trim()) && pkPersonalizzato(e));
  voci.push({nome:'catalogo/esercizi.json', dati:pkTesto(pers)});
  voci.push({nome:'catalogo/ricette.json', dati:pkTesto((DOC.ricette||[]).filter(r=>r && na.has(String(r.nome||'').trim())))});
  let nVideo=0, vd=null; try{ vd=await dataDir.getDirectoryHandle('video',{create:false}); }catch(e){}
  if(vd) for(const v of [...new Set(pers.map(e=>String((e&&e.video)||'').replace(/^video\//,'')).filter(x=>x && !/[\\/]/.test(x)))]){
    try{ const fh=await vd.getFileHandle(v,{create:false}); voci.push({nome:'video/'+v, dati:new Uint8Array(await (await fh.getFile()).arrayBuffer())}); nVideo++; }catch(e){} }
  const man={formato:TMS_FORMATO, versione:TMS_VERSIONE, app:APP_VERSION, creato:new Date().toISOString(), profilo:Object.assign({}, p), foto:nFoto,
    personalizzati:pers.map(e=>e.nome), video:nVideo};
  const interno=zipScrivi([{nome:'tms.json', dati:pkTesto(man)}].concat(voci));
  return {bytes:password? await pkCifraArchivio(interno, password, TMS_FORMATO) : interno, nFoto, nPers:pers.length, nVideo}; }

/* ── lettura: archivio → contenuto verificato (password se serve). Errori con un messaggio da mostrare ── */
async function pacchettoLeggi(bytes, chiediPw){
  let voci; try{ voci=zipLeggi(bytes); }catch(e){ throw new Error(t('Questo file non è un cliente del TMS (o è rovinato).')); }
  let man; try{ man=pkJson(voci, 'tms.json'); }catch(e){ man=null; }
  if(!man || man.formato!==TMS_FORMATO) throw new Error(t('Questo file non è un cliente del TMS (o è rovinato).'));
  if(+man.versione>TMS_VERSIONE) throw new Error(t('Il file viene da una versione più nuova del TMS: aggiorna l’app e riprova.'));
  if(man.cifrato){ const pw=await chiediPw(); if(pw==null) return null; return pacchettoLeggi(await pkDecifraArchivio(voci, man, pw), async()=>null); }
  const dati={};
  for(const k of ['scheda','storico','corpo','alimentazione']){
    try{ dati[k]=pkJson(voci, 'dati/'+k+'.json'); }catch(e){ throw new Error(t('Il file è rovinato:')+' dati/'+k+'.json'); }
    if(dati[k]===undefined) throw new Error(t('Il file è incompleto: manca')+' dati/'+k+'.json'); }
  let esercizi=[], ricette=[]; try{ esercizi=pkJson(voci,'catalogo/esercizi.json')||[]; ricette=pkJson(voci,'catalogo/ricette.json')||[]; }catch(e){}
  const foto=voci.filter(v=>/^foto\/[^/\\]+$/.test(v.nome)).map(v=>({nome:v.nome.slice(5), dati:v.dati}));
  const video=voci.filter(v=>/^video\/[^/\\]+$/.test(v.nome)).map(v=>({nome:v.nome.slice(6), dati:v.dati}));
  return {man, dati, foto, video, esercizi:Array.isArray(esercizi)? esercizi : [], ricette:Array.isArray(ricette)? ricette : []}; }

/* ── importazione: un cliente nuovo, oppure al posto di quello che c'è già (il vecchio va nel cestino) ── */
async function pacchettoImporta(bytes){
  if(!dataDir){ avviso(t('Il TMS non è collegato ai dati.')); return false; }
  if(scrittureBloccate){ mostraBloccoScritture(); return false; }
  let pk; try{ pk=await pacchettoLeggi(bytes, ()=>chiediPassword(t('Cliente protetto da password'), t('Scrivi la password con cui è stato esportato.'))); }
  catch(e){ avviso(String(e.message||e)); return false; }
  if(!pk) return false;
  return pacchettoImportaPk(pk); }
/* il cliente già letto (da un file .tms o da un backup .tmsb, «Riprendi solo un cliente») entra nella libreria */
async function pacchettoImportaPk(pk){
  if(!dataDir){ avviso(t('Il TMS non è collegato ai dati.')); return false; }
  if(scrittureBloccate){ mostraBloccoScritture(); return false; }
  pk.video=pk.video||[];
  const pr=pk.man.profilo||{}, nome=String(pr.nome||pr.slug||t('Cliente')).trim().slice(0,80);
  let slug=pslug(pr.slug||nome), sostituisci=false;
  const gia=profili.find(x=>x.slug===slug);
  if(gia){
    const sc=await sceltaModal(t('Cliente già presente'), t('C’è già un profilo')+' «'+esc(gia.nome)+'». '+t('Cosa faccio con quello nel file?'),
      [{id:'nuovo', testo:t('Aggiungilo come nuovo')}, {id:'sostituisci', testo:t('Sostituisci quello che c’è'), pericolo:true}]);
    if(!sc) return false;
    if(sc==='sostituisci'){
      if(!await conferma(t('Sostituisco')+' «'+gia.nome+'» '+t('con quello del file? Quello di adesso va nel cestino dei profili e resta anche fra i backup ripristinabili.'))) return false;
      sostituisci=true; }
    else { const base=slug; let i=2; while(profili.some(x=>x.slug===slug)) slug=base+'-'+(i++); } }
  try{
    if(sostituisci){ try{ await salvaCopiaDiSicurezza(); }catch(e){ logErrore('pacchetto/copia', e); }
      if(slug===activeProfile){ clearTimeout(saveTimer); pendingSaves.clear(); }
      if(typeof dataDir.cestina==='function'){ try{ await dataDir.cestina(slug); }catch(e){ logErrore('pacchetto/cestino', e); } } }
    const pd=await dataDir.getDirectoryHandle(slug, {create:true});
    if(sostituisci && slug===activeProfile) profileDir=pd;
    await writeJson(pd, FILES.scheda, pk.dati.scheda||{settimanale:[],mensile:[]});
    await writeJson(pd, FILES.storico, pk.dati.storico||[]);
    await writeJson(pd, FILES.corpo, pk.dati.corpo||corpoFile({}));
    await writeJson(pd, FILES.alimentazione, pk.dati.alimentazione||{bulk:[],mant:[],cut:[]});
    if(pk.foto.length){ const fd=await pd.getDirectoryHandle('foto',{create:true});
      for(const f of pk.foto){ try{ const fh=await fd.getFileHandle(f.nome,{create:true}); const w=await fh.createWritable(); await w.write(f.dati); await w.close(); }
        catch(e){ logErrore('pacchetto/foto:'+f.nome, e); } } }
    /* catalogo: si aggiungono gli esercizi che mancano; quelli con lo stesso nome ma diversi si chiede quali tenere */
    const conNome=n=>(DOC.esercizi||[]).find(e=>String((e&&e.nome)||'').trim()===n);
    const nuovi=[], diversi=[];
    pk.esercizi.forEach(e=>{ const n=String((e&&e.nome)||'').trim(); if(!n) return; const c=conNome(n); if(!c) nuovi.push(e); else if(pkStabile(c)!==pkStabile(e)) diversi.push(e); });
    let usaFile=false;
    if(diversi.length){
      const sc=await sceltaModal(t('Esercizi con lo stesso nome ma diversi'),
        t('Nel file ci sono esercizi che hai anche tu, ma con muscoli, istruzioni o video diversi:')+' '+diversi.map(e=>'<b>'+esc(e.nome)+'</b>').join(', ')+'. '+t('Il catalogo è unico per tutti i clienti.'),
        [{id:'miei', testo:t('Tieni i miei')}, {id:'file', testo:t('Usa quelli del file')}]);
      usaFile=(sc==='file'); }
    nuovi.forEach(e=>DOC.esercizi.push(e));
    if(usaFile) diversi.forEach(e=>{ const i=DOC.esercizi.findIndex(x=>String((x&&x.nome)||'').trim()===String(e.nome).trim()); if(i>=0) DOC.esercizi[i]=e; });
    const nEs=nuovi.length, nCambiati=usaFile? diversi.length : 0;
    if(nEs || nCambiati){ rebuildEs(); await writeJson(dataDir, FILES.esercizi, DOC.esercizi); }
    /* i video personali degli esercizi arrivati (un tuo video non si sovrascrive, salvo «Usa quelli del file») */
    let nVideo=0;
    if(pk.video.length){
      const daFile=new Set((usaFile? diversi : []).concat(nuovi).map(e=>String((e&&e.video)||'').replace(/^video\//,'')));
      const vd=await dataDir.getDirectoryHandle('video',{create:true});
      for(const v of pk.video){ if(!bkNomeSicuro(v.nome)) continue;
        let c=false; try{ await vd.getFileHandle(v.nome,{create:false}); c=true; }catch(e){}
        if(c && !daFile.has(v.nome)) continue;
        try{ await bkScriviBin(vd, v.nome, v.dati); nVideo++; }catch(e){ logErrore('pacchetto/video:'+v.nome, e); } } }
    const nomiRic=new Set((DOC.ricette||[]).map(r=>String((r&&r.nome)||'').trim())); let nRic=0;
    pk.ricette.forEach(r=>{ const n=String((r&&r.nome)||'').trim(); if(n && !nomiRic.has(n)){ (DOC.ricette=DOC.ricette||[]).push(r); nomiRic.add(n); nRic++; } });
    if(nRic) await writeJson(dataDir, FILES.ricette, DOC.ricette);
    if(!sostituisci){ profili.push(Object.assign({}, pr, {slug, nome:gia? nome+' ('+t('importato')+')' : nome, creato:pr.creato||new Date().toISOString().slice(0,10)})); }
    await writeJson(dataDir, FILES.profili, {list:profili, active:activeProfile});
    saveCache(); cruscottoInvalida();
    if(sostituisci && slug===activeProfile){ await loadProfile(); undoAzzera(); renderAll(); }
    else renderProfilo();
    avviso(t('Cliente importato:')+' «'+(profili.find(x=>x.slug===slug)||{}).nome+'»'+(pk.foto.length? ' · '+pk.foto.length+' '+t('foto') : '')+
      (nEs? ' · '+nEs+' '+t(nEs===1?'esercizio aggiunto al catalogo':'esercizi aggiunti al catalogo') : '')+(nCambiati? ' · '+nCambiati+' '+t(nCambiati===1?'esercizio aggiornato':'esercizi aggiornati') : '')+
      (nVideo? ' · '+nVideo+' '+t('video') : '')+'. '+t('Per il telefono, ricollegalo col QR.'));
    return slug;
  }catch(e){ logErrore('pacchetto/importa', e); avviso(t('Importazione non riuscita:')+' '+(e.message||e)); return false; } }

/* ── esportazione e archiviazione (tab Profilo) ── */
function pkScarica(bytes, nome){
  const url=URL.createObjectURL(new Blob([bytes], {type:'application/octet-stream'})), a=document.createElement('a');
  a.href=url; a.download=nome; document.body.appendChild(a); a.click();
  setTimeout(()=>{ try{ URL.revokeObjectURL(url); }catch(e){} a.remove(); }, 1500); }
function pkNomeFile(p){ return (String(p.nome||p.slug).replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim()||'cliente')+'.tms'; }
async function pacchettoEsporta(slug, archivia){
  const p=profili.find(x=>x.slug===slug); if(!p) return;
  if(archivia && profili.length<=1){ avviso(t('Deve restare almeno un profilo.')); return; }
  const scelta=await esportaModal(p, archivia); if(!scelta) return;
  let r; try{ r=await pacchettoCostruisci(slug, scelta.password); }
  catch(e){ logErrore('pacchetto/esporta', e); avviso(String(e.message||e)); return; }
  pkScarica(r.bytes, pkNomeFile(p));
  if(!archivia) return;
  if(!await conferma(t('Hai salvato')+' «'+pkNomeFile(p)+'»? '+t('Tolgo')+' «'+p.nome+'» '+t('dalla lista: la cartella va nel cestino dei profili, e lo riprendi quando vuoi da quel file con «Importa cliente».'))) return;
  await deleteProfile(slug, {confermato:true}); }
/* la finestra dell'esportazione: password facoltativa */
function esportaModal(p, archivia){
  return modalConPassword(t(archivia? 'Archivia' : 'Esporta')+' «'+p.nome+'»',
    archivia? t('Il cliente diventa un file .tms con scheda, storico, misure, alimentazione, foto ed esercizi personalizzati; poi lo tolgo dalla lista. Lo riprendi quando vuoi con «Importa cliente».')
      : t('Un file .tms con scheda, storico, misure, alimentazione, foto ed esercizi personalizzati (coi loro video), da passare a un collega o su un altro PC. Il telefono non viaggia col file: lì si ricollega col QR.'),
    t(archivia? 'Archivia' : 'Esporta'), t('Senza la password il file non si apre: non c’è modo di recuperarla.')); }
/* finestra con la password facoltativa (file .tms e backup .tmsb): torna {password} oppure null */
function modalConPassword(titolo, testo, bottone, notaPw){
  return new Promise(ok=>{
    modal(`${croceModal()}<h3>${esc(titolo)}</h3>
      <div class="lat-nota" style="margin:0 0 10px">${esc(testo)}</div>
      <label class="optchk"><input type="checkbox" id="pk-pw-on"> <span>${t('Proteggi con una password (consigliato se lo mandi per email: dentro ci sono dati sulla salute)')}</span></label>
      <div id="pk-pw-box" hidden><div class="field" style="margin-top:8px"><input id="pk-pw" type="password" autocomplete="new-password" placeholder="${t('Password')}" style="width:100%"></div>
        <div class="field" style="margin-top:6px"><input id="pk-pw2" type="password" autocomplete="new-password" placeholder="${t('Ripeti la password')}" style="width:100%"></div>
        <div class="lat-nota">${esc(notaPw)}</div></div>
      <div class="modal__actions"><button class="btn btn--ember" id="pk-ok">${ico('scarica','p')}${esc(bottone)}</button></div>`);
    modalChiudibile();
    let finito=false; const fine=v=>{ if(finito) return; finito=true; ok(v); };
    const chk=document.getElementById('pk-pw-on'), box=document.getElementById('pk-pw-box');
    chk.onchange=()=>{ box.hidden=!chk.checked; if(chk.checked) document.getElementById('pk-pw').focus(); };
    document.getElementById('pk-ok').onclick=()=>{
      let password='';
      if(chk.checked){ password=document.getElementById('pk-pw').value; const p2=document.getElementById('pk-pw2').value;
        if(password.length<6){ avviso(t('La password deve avere almeno 6 caratteri.')); return; }
        if(password!==p2){ avviso(t('Le due password non sono uguali.')); return; } }
      closeModal(); fine({password}); };
    /* chiusa con la ✕ o con Esc: niente */
    const bk=document.getElementById('modal-bk'), oss=new MutationObserver(()=>{ if(bk.classList.contains('hidden')){ oss.disconnect(); fine(null); } });
    oss.observe(bk, {attributes:true, attributeFilter:['class']}); }); }
function chiediPassword(titolo, testo){
  return new Promise(ok=>{
    modal(`${croceModal()}<h3>${esc(titolo)}</h3><div class="lat-nota" style="margin:0 0 8px">${esc(testo)}</div>
      <div class="field"><input id="pk-pwi" type="password" autocomplete="off" style="width:100%"></div>
      <div class="modal__actions"><button class="btn btn--ember" id="pk-pwi-ok">${t('Apri')}</button></div>`);
    modalChiudibile();
    let finito=false; const fine=v=>{ if(finito) return; finito=true; ok(v); };
    const inp=document.getElementById('pk-pwi'); inp.focus();
    const via=()=>{ const v=inp.value; closeModal(); fine(v); };
    document.getElementById('pk-pwi-ok').onclick=via; inp.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); via(); } };
    const bk=document.getElementById('modal-bk'), oss=new MutationObserver(()=>{ if(bk.classList.contains('hidden')){ oss.disconnect(); fine(null); } });
    oss.observe(bk, {attributes:true, attributeFilter:['class']}); }); }
function sceltaModal(titolo, testoHtml, scelte){
  return new Promise(ok=>{
    modal(`${croceModal()}<h3>${esc(titolo)}</h3><div class="lat-nota" style="margin:0 0 6px">${testoHtml}</div>
      <div class="modal__actions">${scelte.map(s=>`<button class="btn${s.pericolo?' btn--danger':' btn--ember'}" data-pk-scelta="${esc(s.id)}">${esc(s.testo)}</button>`).join('')}</div>`);
    modalChiudibile();
    let finito=false; const fine=v=>{ if(finito) return; finito=true; ok(v); };
    document.querySelectorAll('[data-pk-scelta]').forEach(b=>{ b.onclick=()=>{ const v=b.getAttribute('data-pk-scelta'); closeModal(); fine(v); }; });
    const bk=document.getElementById('modal-bk'), oss=new MutationObserver(()=>{ if(bk.classList.contains('hidden')){ oss.disconnect(); fine(null); } });
    oss.observe(bk, {attributes:true, attributeFilter:['class']}); }); }
/* un file .tms o .tmsb aperto col doppio clic (app per PC): si aspetta che i dati siano pronti, poi si importa il cliente o si apre il backup */
async function pacchettoDaFile(f){
  if(!f || !f.dati) return;
  for(let k=0;k<150 && !dataDir;k++) await new Promise(r=>setTimeout(r,100));
  const dati=f.dati instanceof Uint8Array? f.dati : new Uint8Array(f.dati);
  if(/\.tmsb$/i.test(String(f.nome||''))) await backupApri(dati);   /* un backup (.tmsb): Ripristina tutto o un cliente solo */
  else await pacchettoImporta(dati); }
