/* ════ 🔗 TELEFONO COLLEGATO: SCHEDA COLLEGATA PC ↔ APP DEL TELEFONO (2026-11-17, richiesta di Marco) ════
   «Più che mandare al telefono la scheda vorrei linkarla: le modifiche di uno modificano l'altra e
   solo a Salva si cristallizza la scheda.»  Una scheda sola, due schermi.

   Come Movienaitor, PC e telefono non si parlano direttamente: si lasciano file in una CARTELLA
   CONDIVISA (sul PC una cartella di Google Drive per desktop, di solito «My Drive › 6 - TMS»; sul
   telefono una cartella tenuta uguale da un'app di sincronizzazione). I dati veri restano in TMS_Dati
   sul PC e dentro l'app sul telefono: la cartella è solo il posto dove si incontrano.

     <cartella>/<profilo>/dal-pc/stato.json         profilo, settimana, ricevute   (scrive SOLO il PC)
     <cartella>/<profilo>/dal-pc/scheda.json        la scheda collegata + quello che arriva solo dal
                                                    PC (dieta, riscaldamento, «ultima volta»…) (SOLO il PC)
     <cartella>/<profilo>/dal-pc/video.json         i video degli esercizi in scheda           (SOLO il PC)
     <cartella>/<profilo>/dal-telefono/scheda.json  la scheda collegata vista dal telefono   (SOLO il telefono)
     <cartella>/<profilo>/dal-telefono/eventi/*     una pesata o una foto per file (il telefono le
                                                    scrive, il PC le toglie DOPO averle salvate)

   La SCHEDA COLLEGATA: ogni riga ha un id stabile (`uid`, anche nella scheda Pesi) e ogni campo l'ora
   dell'ultima modifica. A ogni giro ognuno: (1) confronta la sua scheda con l'ultima unita («ombra»)
   e data adesso i campi cambiati qui (una riga sparita lascia un segno di «tolta»); (2) legge il file
   dell'altro; (3) unisce campo per campo — VINCE L'ORA PIÙ RECENTE; (4) applica il risultato e scrive
   il suo file. Un solo scrittore per file, quindi niente file in conflitto, e i due arrivano allo
   stesso risultato. «💾 Salva nello Storico» CRISTALLIZZA: la settimana va nello Storico, il numero
   della settimana sale, fatica, durata e spunte ✔ si azzerano anche sul telefono; la scheda resta
   collegata e fa da base alla settimana dopo.
   File a metà o illeggibili: si saltano e si riprovano al giro dopo, MAI cancellati. Tutto cifrato
   (AES-GCM, chiave dal CODICE DI COLLEGAMENTO che si scrive una volta sul telefono): Google e l'app di
   sincronizzazione vedono solo file illeggibili; il sigillo della cifratura scopre i file a metà.
   Lo stato del collegamento (codice, settimana, ombra, ricevute) sta nel localStorage di questo
   computer, come le altre impostazioni; il percorso della cartella lo tiene electron/main.js. */

const TEL_KEY='tms-telefono';
const TEL_ALFA='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   /* 32 segni senza I, O, 0, 1: 16 segni = 80 bit */
const TEL_SALE='tms-scambio-v1', TEL_GIRI=150000;
const TEL_OGNI=20000;                                /* un giro ogni 20 s a TMS aperto (e al ritorno sulla finestra) */
const TEL_CAMPI=['giorno','esercizio','serie','rip','peso','rir','note','rest','test','pos','del'];
const TEL_CAMPI_S=['rpe','min','fatto'];
const TEL_TOLTE_GIORNI=30;                           /* i segni delle righe tolte si tengono un mese */
let TEL=null, _telChiave=null, _telChiaveDi='', _telGiroIn=false, _telTimer=null, _telModT=null, _telUltimoGiro=null, _telErr='', _telInterno=false;

function telDisponibile(){ return !!(window.tmsScambio && typeof window.tmsScambio.leggi==='function'); }
function telStato(){
  if(TEL) return TEL;
  try{ TEL=JSON.parse(localStorage.getItem(TEL_KEY)||'null'); }catch(e){ TEL=null; }
  if(!TEL||typeof TEL!=='object') TEL={};
  if(!TEL.profili||typeof TEL.profili!=='object') TEL.profili={};
  return TEL;
}
function telSalva(){ try{ localStorage.setItem(TEL_KEY, JSON.stringify(telStato())); }catch(e){ logErrore('telefono/salva', e); } }
function telProf(slug){ return telStato().profili[slug||activeProfile]||null; }
function telNuovoCodice(){ const b=new Uint8Array(16); crypto.getRandomValues(b); let s=''; for(let i=0;i<16;i++) s+=TEL_ALFA[b[i]&31]; return s; }
function telCodicePulito(c){ return String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }
function telCodiceBello(c){ return telCodicePulito(c).replace(/(.{4})(?=.)/g,'$1-'); }
function telUid(){ return 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function telHash(s){ s=String(s); let h=0x811c9dc5; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,0x01000193)>>>0; } return h.toString(16)+':'+s.length; }
const telBase=slug=>String(slug)+'/';

/* ── cifratura: AES-GCM 256, chiave = PBKDF2(codice). Identica nell'app del telefono. ── */
async function telChiave(){
  const c=telCodicePulito(telStato().codice);
  if(!c) throw new Error(t('manca il codice di collegamento'));
  if(_telChiave && _telChiaveDi===c) return _telChiave;
  const enc=new TextEncoder();
  const base=await crypto.subtle.importKey('raw', enc.encode(c), 'PBKDF2', false, ['deriveKey']);
  _telChiave=await crypto.subtle.deriveKey({name:'PBKDF2', salt:enc.encode(TEL_SALE), iterations:TEL_GIRI, hash:'SHA-256'},
    base, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
  _telChiaveDi=c; return _telChiave;
}
function telB64(u8){ let s=''; for(let i=0;i<u8.length;i+=0x8000) s+=String.fromCharCode.apply(null, Array.from(u8.subarray(i,i+0x8000))); return btoa(s); }
function telDaB64(s){ const bin=atob(String(s||'')); const out=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out; }
async function telCifra(obj){
  const iv=new Uint8Array(12); crypto.getRandomValues(iv);
  const enc=new TextEncoder();
  const ct=await crypto.subtle.encrypt({name:'AES-GCM', iv:iv, additionalData:enc.encode(TEL_SALE)}, await telChiave(), enc.encode(JSON.stringify(obj)));
  return JSON.stringify({tms:'scambio', v:1, iv:telB64(iv), dati:telB64(new Uint8Array(ct))});
}
/* → l'oggetto; lancia se il file è a metà, cifrato con un altro codice o non è nostro */
async function telDecifra(testo){
  const env=JSON.parse(testo);
  if(!env || env.tms!=='scambio' || env.v!==1 || !env.iv || !env.dati) throw new Error('non è un file di scambio del TMS');
  const pt=await crypto.subtle.decrypt({name:'AES-GCM', iv:telDaB64(env.iv), additionalData:new TextEncoder().encode(TEL_SALE)}, await telChiave(), telDaB64(env.dati));
  return JSON.parse(new TextDecoder().decode(pt));
}

/* ── la scheda collegata: funzioni pure (le stesse nell'app del telefono, col prefisso col) ── */
function telNorm(c,v){
  if(c==='serie'||c==='rip'||c==='peso'||c==='pos') return +v||0;
  if(c==='rir') return (v===''||v==null||isNaN(+v))? null : +v;
  if(c==='test') return !!v;
  if(c==='del') return v? 1 : 0;
  return String(v==null?'':v).trim();
}
function telNormS(c,v){ return c==='fatto'? !!v : ((+v>0)? +v : null); }
/* data i campi cambiati rispetto all'ultima scheda unita (ombra); le righe sparite diventano «tolte» */
function telTimbra(righe, sedute, ombra, adesso){
  const om=new Map(((ombra&&ombra.righe)||[]).map(r=>[r.uid,r]));
  const out=[];
  righe.forEach((r,i)=>{ const o=om.get(r.uid), n={uid:r.uid, t:{}};
    TEL_CAMPI.forEach(c=>{ const v=(c==='pos')? i : (c==='del'? 0 : telNorm(c, r[c])); n[c]=v;
      n.t[c]=(o && o[c]===v)? ((o.t&&o.t[c])||0) : adesso; });
    om.delete(r.uid); out.push(n); });
  om.forEach(o=>{ out.push(o.del? o : Object.assign({}, o, {del:1, t:Object.assign({}, o.t, {del:adesso})})); });
  const os=(ombra&&ombra.sedute)||{}, s={};
  new Set(Object.keys(sedute||{}).concat(Object.keys(os))).forEach(g=>{ const x=(sedute||{})[g]||{}, o=os[g], n={t:{}};
    TEL_CAMPI_S.forEach(c=>{ const v=telNormS(c, x[c]); n[c]=v; n.t[c]=(o && o[c]===v)? ((o.t&&o.t[c])||0) : adesso; });
    s[g]=n; });
  return {righe:out, sedute:s};
}
/* unione campo per campo: vince l'ora più recente (a parità resta la propria) */
function telUnisci(a, b){
  if(!b) return {righe:a.righe.slice(), sedute:Object.assign({}, a.sedute)};
  const campo=(x,y,lista)=>{ const n={t:{}}; lista.forEach(c=>{ const tx=(x.t&&x.t[c])||0, ty=(y.t&&y.t[c])||0;
    n[c]=(ty>tx)? y[c] : x[c]; n.t[c]=Math.max(tx,ty); }); return n; };
  const mb=new Map((b.righe||[]).map(r=>[r.uid,r])), visti=new Set(), righe=[];
  a.righe.forEach(r=>{ visti.add(r.uid); const o=mb.get(r.uid); righe.push(o? Object.assign({uid:r.uid}, campo(r,o,TEL_CAMPI)) : r); });
  (b.righe||[]).forEach(r=>{ if(r && r.uid && !visti.has(r.uid)) righe.push(r); });
  const sedute={}, sb=b.sedute||{};
  new Set(Object.keys(a.sedute||{}).concat(Object.keys(sb))).forEach(g=>{ const x=(a.sedute||{})[g], y=sb[g];
    sedute[g]=(x&&y)? campo(x,y,TEL_CAMPI_S) : (x||y); });
  return {righe, sedute};
}
function telOrdine(a,b){ return ((+a.pos||0)-(+b.pos||0)) || String(a.uid).localeCompare(String(b.uid)); }
/* i soli valori (senza ore): serve a capire se c'è qualcosa da cambiare qui */
function telValori(d){
  return JSON.stringify([(d.righe||[]).filter(r=>!r.del).slice().sort(telOrdine).map(r=>[r.uid].concat(TEL_CAMPI.slice(0,9).map(c=>r[c]))),
    Object.keys(d.sedute||{}).sort().map(g=>[g].concat(TEL_CAMPI_S.map(c=>d.sedute[g][c])))]);
}
function telPota(d, adesso){ const lim=adesso-TEL_TOLTE_GIORNI*86400000; d.righe=d.righe.filter(r=>!(r.del && ((r.t&&r.t.del)||0)<lim)); return d; }

/* ── la scheda Pesi di questo PC ↔ scheda collegata ── */
function telLocale(p){
  const rows=(DOC.scheda && Array.isArray(DOC.scheda.settimanale))? DOC.scheda.settimanale : [];
  const visti=new Set(), righe=[]; let nuovi=false;
  rows.forEach(r=>{ if(!r || !String(r.esercizio||'').trim()) return;     /* un giorno appena aggiunto, ancora vuoto: resta qui */
    if(!r.uid || visti.has(r.uid)){ r.uid=telUid(); nuovi=true; }           /* ＋set copia la riga: l'id va rifatto */
    visti.add(r.uid); righe.push(r); });
  const rp=(DOC.scheda && DOC.scheda.rpe && DOC.scheda.rpe.settimanale)||{}, om=(p.ombra&&p.ombra.sedute)||{}, sedute={};
  new Set(righe.map(r=>String(r.giorno||'')).concat(Object.keys(rp), Object.keys(om))).forEach(g=>{ if(!g) return; const x=rp[g]||{};
    sedute[g]={rpe:x.rpe, min:x.min, fatto:!!(om[g] && om[g].fatto)}; });   /* «giorno fatto» si spunta solo sul telefono */
  return {righe, sedute, nuovi};
}
function telApplica(d){
  if(!DOC.scheda || typeof DOC.scheda!=='object') DOC.scheda={settimanale:[],mensile:[]};
  const prima=Array.isArray(DOC.scheda.settimanale)? DOC.scheda.settimanale : [];
  const perUid=new Map(prima.filter(r=>r && r.uid).map(r=>[r.uid,r]));
  const nuove=(d.righe||[]).filter(r=>!r.del).slice().sort(telOrdine).map(r=>Object.assign({}, perUid.get(r.uid)||{}, {uid:r.uid,
    giorno:r.giorno, esercizio:r.esercizio, serie:r.serie, rip:r.rip, peso:r.peso, rir:(r.rir==null? '' : r.rir), note:r.note, rest:r.rest, test:!!r.test}));
  prima.forEach(r=>{ if(r && !String(r.esercizio||'').trim()) nuove.push(r); });
  DOC.scheda.settimanale=nuove;
  if(!DOC.scheda.rpe || typeof DOC.scheda.rpe!=='object') DOC.scheda.rpe={};
  const rpe={}; Object.keys(d.sedute||{}).forEach(g=>{ const s=d.sedute[g]; if(s && (s.rpe||s.min)) rpe[g]={rpe:s.rpe||'', min:s.min||''}; });
  DOC.scheda.rpe.settimanale=rpe;
}
/* quello che va al telefono ma lì non si cambia: dieta, riscaldamento, «ultima volta», catalogo… */
function telExtra(p){
  const d=costruisciSchedaJSON({}, true), videoDi={};
  (d.righe||[]).forEach(r=>{ if(r.video) videoDi[r.esercizio]=r.video; });
  (d.riscaldamento||[]).forEach(r=>{ if(r.video) videoDi[r.esercizio]=r.video; });
  const dati={app:d.app, rpe:d.rpe, corpo:d.corpo, riscaldamento:d.riscaldamento, ultima:d.ultima, dieta:d.dieta, catalogo:d.catalogo,
    videoDi:videoDi, videoFirma:p.videoFirma||''};
  return {dati:dati, firma:telHash(JSON.stringify(dati))};
}
async function telVideo(slug, p){
  if(!dirHandle) return;
  const files=[...new Set(collectSchedaVideos().concat(collectRiscaldamentoVideos()).map(v=>v.file))].sort();
  const firma=telHash(files.join('|'));
  if(firma===p.videoFirma) return;
  const map=files.length? await embedVideoFiles(files) : {};
  await window.tmsScambio.scrivi(telBase(slug)+'dal-pc/video.json', await telCifra({tipo:'tms-video', firma:firma, video:map}));
  p.videoFirma=firma;
}
async function telScriviStato(slug, p){
  const s={tipo:'tms-stato', profilo:{slug:slug, nome:(profili.find(x=>x.slug===slug)||{}).nome||slug},
    settimana:+p.settimana||1, ricevute:(p.ricevute||[]).slice(-400), scritto:new Date().toISOString()};
  await window.tmsScambio.scrivi(telBase(slug)+'dal-pc/stato.json', await telCifra(s));
  p.firmaStato=telHash(JSON.stringify([s.settimana, s.ricevute, s.profilo.nome]));
}
/* tutte le copie di un file scritto dall'altra parte: «scheda.json», «scheda (1).json», «scheda (2).json»…
   (le crea la sincronizzazione quando su Google Drive finiscono due file con lo stesso nome). Torna i
   contenuti decifrati e validi; le copie a metà o illeggibili si saltano e si riprovano al giro dopo. */
function telNomeCopia(nome, base){ return new RegExp('^'+base+'(?: \\(\\d+\\))?\\.json$', 'i').test(String(nome||'')); }
async function telLeggiCopie(dir, base, valida){
  let nomi=[];
  try{ nomi=(await window.tmsScambio.elenca(dir)||[]).filter(n=>telNomeCopia(n, base)); }catch(e){ nomi=[]; }
  if(!nomi.length) nomi=[base+'.json'];
  const out=[];
  for(const n of nomi){
    const r=await window.tmsScambio.leggi(dir+'/'+n);
    if(!r || r.stato!=='ok') continue;
    try{ const d=await telDecifra(r.testo); if(valida(d)) out.push(d); }catch(e){ /* a metà: al giro dopo */ }
  }
  return out;
}
/* un giro sulla scheda: data le modifiche fatte qui, unisce quelle del telefono, applica, scrive */
async function telSincronizza(slug, p){
  const adesso=Date.now(), loc=telLocale(p);
  const timbrata=telTimbra(loc.righe, loc.sedute, p.ombra, adesso);
  /* COPIE DOPPIE (18/11/2026, la scheda del telefono non arrivava): Google Drive ammette due file con lo
     stesso nome nella stessa cartella e Drive per desktop chiama il secondo «scheda (1).json». Si leggono
     TUTTE le copie e si uniscono una dopo l'altra: l'unione è campo per campo e vince l'ora più recente,
     quindi una copia vecchia non cancella mai quella nuova. */
  const remote=await telLeggiCopie(telBase(slug)+'dal-telefono', 'scheda', d=>d && d.tipo==='tms-collegata' && Array.isArray(d.righe));
  const remota=remote.length? remote.reduce((acc,d)=>Object.assign(telUnisci(acc,d), {aggiornata:[acc.aggiornata,d.aggiornata].filter(Boolean).sort().pop()})) : null;
  if(remota && remota.aggiornata) p.ultimoTelefono=String(remota.aggiornata);
  p.copieTelefono=remote.length;
  const unita=telPota(telUnisci(timbrata, remota), adesso);
  const cambia=telValori(unita)!==telValori(timbrata);
  if(cambia){
    if(activeProfile!==slug) return false;
    /* si sta scrivendo nella tabella dei Pesi: si unisce al giro dopo, per non togliere il campo sotto le dita
       (e l'ombra resta com'era, così le modifiche del telefono non vengono scambiate per cancellazioni) */
    const ae=document.activeElement;
    if(ae && ae.closest && ae.closest('#panel-allenamento') && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return false;
    telApplica(unita);
  }
  p.ombra=unita;
  if(loc.nuovi || cambia){ _telInterno=true; try{ persist('scheda'); } finally{ _telInterno=false; } }
  if(cambia && curTab==='allenamento') renderAllenamento();
  try{ await telVideo(slug, p); }catch(e){ logErrore('telefono/video', e); }
  const ex=telExtra(p), settimana=+p.settimana||1;
  const firma=telHash(JSON.stringify([settimana, unita.righe, unita.sedute]))+'|'+ex.firma;
  if(firma!==p.firmaScheda){
    await window.tmsScambio.scrivi(telBase(slug)+'dal-pc/scheda.json', await telCifra({tipo:'tms-collegata', v:1,
      profilo:{slug:slug, nome:profNome()}, settimana:settimana, righe:unita.righe, sedute:unita.sedute, extra:ex.dati, aggiornata:new Date().toISOString()}));
    p.firmaScheda=firma;
  }
  telSalva();
  return cambia && !!remota;
}

/* ogni modifica della scheda (o della dieta) fatta qui parte verso il telefono 2 s dopo l'ultima.
   La chiamano persist('scheda') e persist('alimentazione'). */
function telSchedaToccata(){
  if(_telInterno || !telDisponibile() || !telProf()) return;
  clearTimeout(_telModT); _telModT=setTimeout(()=>{ telGiro(); }, 2000);
}
/* «💾 Salva nello Storico» CRISTALLIZZA: la settimana dopo riparte con fatica, durata e spunte vuote,
   anche sul telefono; la scheda resta collegata */
function telSettimanaSalvata(code){
  const p=telProf();
  if(!telDisponibile() || !p) return;
  p.settimana=(+p.settimana||1)+1;
  p.ultimaSalvata={quando:new Date().toISOString(), codice:+code||0};
  const adesso=Date.now();
  if(p.ombra && p.ombra.sedute) Object.keys(p.ombra.sedute).forEach(g=>{
    p.ombra.sedute[g]={rpe:null, min:null, fatto:false, t:{rpe:adesso, min:adesso, fatto:adesso}}; });
  if(DOC.scheda && DOC.scheda.rpe) DOC.scheda.rpe.settimanale={};
  telSalva(); telAggiornaVista();
  clearTimeout(_telModT); _telModT=setTimeout(()=>{ telGiro(); }, 300);
}

/* ── pesate e foto dal telefono: si importano, si SALVANO, poi si tolgono dalla cartella ── */
async function telLeggiEventi(slug, p){
  const dir=telBase(slug)+'dal-telefono/eventi';
  const nomi=await window.tmsScambio.elenca(dir);
  if(!Array.isArray(nomi) || !nomi.length) return null;
  const pesate=[], foto=[], fatti=[];
  for(const nome of nomi.slice().sort()){
    const r=await window.tmsScambio.leggi(dir+'/'+nome);
    if(!r || r.stato!=='ok') continue;                       /* già tolto, o illeggibile: si lascia */
    let ev; try{ ev=await telDecifra(r.testo); }catch(e){ continue; }
    if(ev && ev.tipo==='tms-pesata' && ev.pesata && pulisciPesata(ev.pesata)){ pesate.push(ev.pesata); fatti.push({nome:nome, id:String(ev.pesata.id)}); }
    else if(ev && ev.tipo==='tms-foto' && ev.foto && ev.foto.id && /^data:image\//.test(String(ev.foto.img||''))){ foto.push(ev.foto); fatti.push({nome:nome, id:String(ev.foto.id)}); }
  }
  if(!fatti.length || activeProfile!==slug) return null;
  let rp=null, nFoto=0;
  if(pesate.length) rp=await importaPesate(pesate);
  if(foto.length) nFoto=await importaFotoRientro(foto);
  /* salvataggio VERO su disco prima di togliere qualcosa dalla cartella */
  clearTimeout(saveTimer); await flushSaves();
  if(activeProfile!==slug) return null;
  const ric=new Set(p.ricevute||[]); fatti.forEach(f=>ric.add(f.id)); p.ricevute=[...ric].slice(-400); telSalva();
  await telScriviStato(slug, p);                             /* il telefono vedrà ✔ «arrivata al PC» */
  for(const f of fatti){ try{ await window.tmsScambio.togli(dir+'/'+f.nome); }catch(e){ logErrore('telefono/togli', e); } }
  if(curTab==='corpo') renderCorpo();
  return {pesate:rp, foto:nFoto};
}

/* ── il giro: pesate e foto, scheda, stato. Solo il profilo ATTIVO (gli altri al loro turno). ── */
async function telGiro(){
  if(_telGiroIn || !telDisponibile() || scrittureBloccate || !profileDir) return;
  const st=telStato(), slug=activeProfile, p=st.profili[slug];
  if(!st.codice || !p) return;
  _telGiroIn=true;
  try{
    if(!(await window.tmsScambio.cartella())) return;
    const ev=await telLeggiEventi(slug, p);
    const sc=await telSincronizza(slug, p);
    const fs=telHash(JSON.stringify([+p.settimana||1, (p.ricevute||[]).slice(-400), profNome()]));
    if(fs!==p.firmaStato) await telScriviStato(slug, p);
    _telUltimoGiro=new Date(); _telErr=''; telSalva();
    const pz=[];
    if(ev && ev.pesate && ev.pesate.nuove) pz.push(ev.pesate.nuove+' '+(ev.pesate.nuove===1?t('pesata nuova'):t('pesate nuove')));
    if(ev && ev.foto) pz.push(ev.foto+' '+t('foto nel tab Corpo'));
    if(sc) pz.push(t('scheda aggiornata dal telefono'));
    if(pz.length) telNotizia(t('Dal telefono:')+' '+pz.join(' · '));
  }catch(e){ _telErr=String((e&&e.message)||e); logErrore('telefono/giro', e); }
  finally{ _telGiroIn=false; telAggiornaVista(); }
}
function telAvvia(){
  if(!telDisponibile()) return;
  clearInterval(_telTimer); _telTimer=setInterval(()=>{ telGiro(); }, TEL_OGNI);
  window.addEventListener('focus', ()=>{ telGiro(); });
  setTimeout(()=>{ telGiro(); }, 2500);
}

/* ── avviso discreto in basso a destra (gli arrivi in automatico non fermano il lavoro) ── */
function telNotizia(testo){
  let el=document.getElementById('tel-notizia');
  if(!el){ el=document.createElement('div'); el.id='tel-notizia'; el.className='tel-notizia no-print'; el.setAttribute('role','status'); document.body.appendChild(el); }
  el.textContent=testo; el.classList.add('is-on');
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('is-on'), 7000);
}
function telOra(iso){ if(!iso) return ''; try{ const d=new Date(iso); return d.toLocaleString(LANG==='en'?'en-GB':'it-IT',{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); }catch(e){ return String(iso); } }

/* riga nel tab Pesi: la scheda è collegata al telefono */
function telRigaPesi(){
  if(!telDisponibile()) return '';
  const p=telProf(); if(!p) return '';
  const s=t('Scheda collegata al telefono')+' · '+t('settimana')+' <b>'+(+p.settimana||1)+'</b>'+
    ' · '+(p.ultimoTelefono? t('ultimo dal telefono')+' <b>'+esc(telOra(p.ultimoTelefono))+'</b>' : t('il telefono non ha ancora scritto niente'))+
    '<br><span class="muted">'+t('Quello che cambi qui o sul telefono si allinea da solo. «Salva nello Storico» chiude la settimana anche sul telefono; la scheda resta collegata per la settimana dopo.')+'</span>';
  return `<div class="tel-riga no-print" id="tel-riga"><span>${s}</span></div>`;
}
/* riga nella finestra di «Salva nello Storico»: quanto è fresco quello che è arrivato dal telefono */
function telRigaSalva(){
  if(!telDisponibile()) return '';
  const p=telProf(); if(!p) return '';
  return `<p class="muted" style="font-size:13px;margin:6px 0 0">${p.ultimoTelefono? t('Ultimo aggiornamento dal telefono:')+' <b>'+esc(telOra(p.ultimoTelefono))+'</b>' : t('Dal telefono non è ancora arrivato niente.')} ${t('Salvando, la settimana si chiude anche sul telefono.')}</p>`;
}
function telAggiornaVista(){
  const r=document.getElementById('tel-riga');
  if(r){ const tmp=document.createElement('div'); tmp.innerHTML=telRigaPesi(); const nuovo=tmp.firstElementChild; if(nuovo) r.replaceWith(nuovo); }
  const s=document.getElementById('imp-tel-stato'); if(s) s.innerHTML=telTestoStato();
}
function telAggancia(){ /* la riga dei Pesi non ha più comandi: la scheda è sempre collegata */ }

/* ── ⚙ Impostazioni › Telefono collegato ── */
function telTestoStato(){
  const p=telProf();
  if(!p) return t('Il profilo attivo non è collegato.');
  const pz=[t('settimana')+' '+(+p.settimana||1)];
  if(p.ultimoTelefono) pz.push(t('ultimo dal telefono')+' '+telOra(p.ultimoTelefono));
  if(p.ultimaSalvata) pz.push(t('ultima settimana salvata il')+' '+telOra(p.ultimaSalvata.quando));
  if((p.ricevute||[]).length) pz.push((p.ricevute||[]).length+' '+t('pesate e foto ricevute'));
  if(_telUltimoGiro) pz.push(t('controllato alle')+' '+_telUltimoGiro.toLocaleTimeString(LANG==='en'?'en-GB':'it-IT',{hour:'2-digit',minute:'2-digit'}));
  if(_telErr) pz.push(_telErr);
  return t('Collegato')+' · '+esc(pz.join(' · '));
}
function telSezioneImpostazioni(cartella){
  if(!telDisponibile()) return '';
  const st=telStato(), p=telProf(), nome=esc(profNome());
  return `<div class="imp-sez" id="imp-tel">
      <h4>${t('Telefono collegato')}</h4>
      <div class="lat-nota" style="margin:0 0 8px">${t('Il TMS e l\'app TMS Scheda del telefono condividono la scheda dei Pesi (si modifica da tutte e due le parti) e si passano pesate e foto, attraverso una cartella condivisa (Google Drive per desktop qui, un\'app di sincronizzazione sul telefono). I file sono cifrati col codice qui sotto: Google vede solo file illeggibili.')}</div>
      <div class="imp-riga"><span>${t('Cartella condivisa')}</span><span class="gruppo"><button class="btn btn--sm" id="imp-tel-cartella">${ico('cartella','p')}${cartella?t('Cambia…'):t('Scegli…')}</button>${cartella?`<button class="btn btn--sm" id="imp-tel-scollega">${t('Scollega')}</button>`:''}</span></div>
      <div class="lat-nota imp-tel-percorso">${cartella?esc(cartella):t('Nessuna cartella scelta (di solito «My Drive\\6 - TMS»).')}</div>
      ${cartella?`<div class="imp-riga"><span>${t('Codice di collegamento')}</span><span class="gruppo">${st.codice?`<code class="tel-codice" id="imp-tel-codice">${esc(telCodiceBello(st.codice))}</code><button class="btn btn--sm" id="imp-tel-copia">${t('Copia')}</button><button class="btn btn--sm" id="imp-tel-nuovo">${t('Nuovo codice')}</button>`:`<button class="btn btn--sm btn--ember" id="imp-tel-nuovo">${t('Crea il codice')}</button>`}</span></div>
      ${st.codice?`<div class="lat-nota">${t('Sul telefono: TMS Scheda › Collegamento e promemoria › scegli la cartella sincronizzata con questa e scrivi il codice. Si fa una volta sola.')}</div>
      <div class="imp-riga"><span>${t('Profilo')} «${nome}»</span><span class="gruppo">${p?`<button class="btn btn--sm" id="imp-tel-togli">${t('Scollega il profilo')}</button>`:`<button class="btn btn--sm btn--ember" id="imp-tel-prof">${t('Collega la scheda di questo profilo')}</button>`}</span></div>
      <div class="lat-nota" id="imp-tel-stato">${telTestoStato()}</div>`:''}`:''}
    </div>`;
}
function telAgganciaImpostazioni(riapri){
  const m=document.getElementById('modal'); if(!m || !document.getElementById('imp-tel')) return;
  const su=(id,fn)=>{ const b=document.getElementById(id); if(b) b.onclick=async()=>{ try{ await fn(); }catch(e){ logErrore('telefono/impostazioni', e); avviso(String((e&&e.message)||e)); } riapri(); }; };
  su('imp-tel-cartella', async()=>{ await window.tmsScambio.scegli(); });
  su('imp-tel-scollega', async()=>{ if(await conferma(t('Il TMS smette di guardare la cartella condivisa. I file che ci sono restano dove sono. Continuo?'))) await window.tmsScambio.scollega(); });
  su('imp-tel-nuovo', async()=>{
    const st=telStato();
    if(st.codice && !await conferma(t('Con un codice nuovo il telefono non legge più i file finché non lo scrivi anche lì. Continuo?'))) return;
    st.codice=telNuovoCodice(); _telChiave=null;
    Object.keys(st.profili).forEach(s=>{ const p=st.profili[s]; p.firmaScheda=''; p.firmaStato=''; });   /* si riscrivono col codice nuovo */
    telSalva(); await telGiro();
  });
  su('imp-tel-copia', async()=>{ try{ await navigator.clipboard.writeText(telCodiceBello(telStato().codice)); telNotizia(t('Codice copiato.')); }catch(e){} });
  su('imp-tel-prof', async()=>{ const st=telStato(); st.profili[activeProfile]=st.profili[activeProfile]||{ricevute:[], settimana:1}; telSalva();
    await telGiro(); if(curTab==='allenamento') renderAllenamento(); });
  su('imp-tel-togli', async()=>{ if(!await conferma(t('La scheda di questo profilo non è più collegata al telefono e quello che il telefono manda non viene più importato. Continuo?'))) return;
    delete telStato().profili[activeProfile]; telSalva(); if(curTab==='allenamento') renderAllenamento(); });
}
