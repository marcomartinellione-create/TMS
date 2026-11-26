/* ════ 🔗 TELEFONO COLLEGATO: PERSONAL (questo TMS) ↔ CLIENTI (app TMS Scheda), ATTRAVERSO L'HUB ════
   17/11/2026, Marco: «Più che mandare al telefono la scheda vorrei linkarla: le modifiche di uno modificano
   l'altra e solo a Salva si cristallizza la scheda.»  Una scheda sola, due schermi.
   24/11/2026, Marco: l'app vale per più utenti. Due tipi: i PERSONAL (il TMS sul PC) e i CLIENTI (l'APK).
   Ogni personal ha uno o più clienti, ogni cliente un personal. Cloudflare fa da «hub di smistamento e
   non deposito»: lo storico vero resta sul PC del personal; pesate e foto il PC le scarica e le toglie
   subito dall'hub. Google Drive è tolto («sostituiamo direttamente drive»). Progetto in
   Doc/hub-cloudflare/PROGETTO.md; l'hub è hub/worker.js.

   Per ogni cliente collegato c'è un LEGAME sull'hub, coi suoi file:
     dal-pc/stato.json          profilo, settimana, ricevute                         (scrive SOLO il PC)
     dal-pc/scheda.json         la scheda collegata + dieta, riscaldamento, «ultima volta», catalogo (SOLO il PC)
     dal-pc/video.json          i video degli esercizi in scheda                     (SOLO il PC)
     dal-telefono/scheda.json   la scheda collegata vista dal telefono               (SOLO il telefono)
     dal-telefono/eventi/*      una pesata o una foto per file: il PC le salva e le toglie

   CODICI (24 e 20 segni dall'alfabeto senza I, O, 0, 1):
     · CODICE DI RECUPERO del personal: nasce qui all'attivazione (serve un codice d'invito di Marco) e
       basta lui per ritrovare tutto su un PC nuovo;
     · CODICE DEL CLIENTE, uno per profilo: lo si scrive una volta sul telefono del cliente.
   Da un codice, con HKDF-SHA256 (sale «tms-hub-v1»), si ricavano: l'id (pid o lid), il gettone d'accesso
   all'hub (l'hub ne tiene solo l'impronta) e la chiave AES-GCM. L'hub non vede mai codici né chiavi: ogni
   file è cifrato con la chiave del SUO cliente. L'etichetta del legame ({slug, nome, codice} del cliente)
   è cifrata con la chiave del personal: la legge solo lui, e serve al recupero su un PC nuovo.

   La SCHEDA COLLEGATA: ogni riga ha un id stabile (`uid`, anche nella scheda Pesi) e ogni campo l'ora
   dell'ultima modifica. A ogni giro ognuno: (1) confronta la sua scheda con l'ultima unita («ombra»)
   e data adesso i campi cambiati qui (una riga sparita lascia un segno di «tolta»); (2) legge il file
   dell'altro; (3) unisce campo per campo — VINCE L'ORA PIÙ RECENTE; (4) applica il risultato e scrive
   il suo file. Un solo scrittore per file, quindi niente file in conflitto, e i due arrivano allo
   stesso risultato. «💾 Salva nello Storico» CRISTALLIZZA: la settimana va nello Storico, il numero
   della settimana sale, fatica, durata e spunte ✔ si azzerano anche sul telefono; la scheda resta
   collegata e fa da base alla settimana dopo.
   File illeggibili: si saltano e si riprovano al giro dopo. Lo stato del collegamento (codici,
   settimana, ombra, ricevute) sta nel localStorage di questo computer, come le altre impostazioni. */

const TEL_KEY='tms-telefono';
const TEL_ALFA='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   /* 32 segni senza I, O, 0, 1: 5 bit a segno */
const TEL_SALE='tms-hub-v1';
const TEL_LUNGO_PERSONAL=24, TEL_LUNGO_CLIENTE=20;  /* 120 e 100 bit */
/* l'hub di Marco su Cloudflare (hub/pubblica-hub.cjs stampa l'indirizzo); window.TMS_HUB lo sostituisce nelle prove */
const TEL_HUB='https://tms-hub.marco-martinellione.workers.dev';
const TEL_OGNI=20000;                                /* un giro ogni 20 s a TMS aperto (e al ritorno sulla finestra) */
const TEL_CAMPI=['giorno','esercizio','serie','rip','peso','rir','note','rest','test','pos','del'];
const TEL_CAMPI_S=['rpe','min','fatto'];
const TEL_TOLTE_GIORNI=30;                           /* i segni delle righe tolte si tengono un mese */
let TEL=null, _telId={}, _telGiroIn=false, _telTimer=null, _telModT=null, _telUltimoGiro=null, _telErr='', _telInterno=false, _telMostraRec=false;
let _telSporco=false, _telChiudi=false, _telChiusuraIn=false;   /* modifiche non ancora mandate; chiusura della finestra */

function telHubUrl(){ return String(window.TMS_HUB||TEL_HUB||'').replace(/\/+$/,''); }
function telDisponibile(){ return !!(telHubUrl() && typeof fetch==='function' && window.crypto && crypto.subtle); }
function telStato(){
  if(TEL) return TEL;
  try{ TEL=JSON.parse(localStorage.getItem(TEL_KEY)||'null'); }catch(e){ TEL=null; }
  if(!TEL||typeof TEL!=='object') TEL={};
  if(!TEL.profili||typeof TEL.profili!=='object') TEL.profili={};
  /* fino al 24/11/2026 c'era un codice solo per tutti, con la cartella di Google Drive: i profili tengono
     settimana, ombra e ricevute, ma vanno ricollegati col loro codice nuovo */
  if(TEL.v!==2){ delete TEL.codice;
    Object.keys(TEL.profili).forEach(s=>{ const p=TEL.profili[s]; if(!p.lid){ delete p.codice; p.firmaScheda=''; p.firmaStato=''; p.videoFirma=''; } });
    TEL.v=2; }
  return TEL;
}
function telSalva(){ try{ localStorage.setItem(TEL_KEY, JSON.stringify(telStato())); }catch(e){ logErrore('telefono/salva', e); } }
function telProf(slug){ return telStato().profili[slug||activeProfile]||null; }
function telPersonal(){ const p=telStato().personal; return (p && p.codice && p.attivo)? p : null; }
function telCollegato(p){ return !!(p && p.codice && p.lid); }
function telNuovoCodice(n){ n=n||TEL_LUNGO_CLIENTE; const b=new Uint8Array(n); crypto.getRandomValues(b); let s=''; for(let i=0;i<n;i++) s+=TEL_ALFA[b[i]&31]; return s; }
function telCodicePulito(c){ return String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }
function telCodiceBello(c){ return telCodicePulito(c).replace(/(.{4})(?=.)/g,'$1-'); }
function telUid(){ return 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function telHash(s){ s=String(s); let h=0x811c9dc5; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,0x01000193)>>>0; } return h.toString(16)+':'+s.length; }

/* ── dal codice: id, gettone d'accesso all'hub e chiave AES-GCM (HKDF-SHA256). Identico nell'app del telefono. ── */
function telB64(u8){ let s=''; for(let i=0;i<u8.length;i+=0x8000) s+=String.fromCharCode.apply(null, Array.from(u8.subarray(i,i+0x8000))); return btoa(s); }
function telDaB64(s){ const bin=atob(String(s||'')); const out=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out; }
function telHex(u8){ return Array.from(u8, b=>b.toString(16).padStart(2,'0')).join(''); }
async function telIdentita(codice){
  const c=telCodicePulito(codice);
  if(!c) throw new Error(t('manca il codice di collegamento'));
  if(_telId[c]) return _telId[c];
  const enc=new TextEncoder(), sale=enc.encode(TEL_SALE);
  const base=await crypto.subtle.importKey('raw', enc.encode(c), 'HKDF', false, ['deriveBits','deriveKey']);
  const bits=async(scopo,n)=>new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF', hash:'SHA-256', salt:sale, info:enc.encode(scopo)}, base, n*8));
  const id=telHex(await bits('id',8));
  const gettone=telB64(await bits('gettone',32)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const chiave=await crypto.subtle.deriveKey({name:'HKDF', hash:'SHA-256', salt:sale, info:enc.encode('chiave')}, base, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
  return (_telId[c]={id:id, gettone:gettone, chiave:chiave});
}
async function telImpronta(s){ return telHex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s))))); }
async function telCifra(obj, codice){
  const iv=new Uint8Array(12); crypto.getRandomValues(iv);
  const enc=new TextEncoder();
  const ct=await crypto.subtle.encrypt({name:'AES-GCM', iv:iv, additionalData:enc.encode(TEL_SALE)}, (await telIdentita(codice)).chiave, enc.encode(JSON.stringify(obj)));
  return JSON.stringify({tms:'hub', v:1, iv:telB64(iv), dati:telB64(new Uint8Array(ct))});
}
/* → l'oggetto; lancia se il file è a metà, cifrato con un altro codice o non è nostro */
async function telDecifra(testo, codice){
  const env=JSON.parse(testo);
  if(!env || env.tms!=='hub' || env.v!==1 || !env.iv || !env.dati) throw new Error('non è un file di scambio del TMS');
  const pt=await crypto.subtle.decrypt({name:'AES-GCM', iv:telDaB64(env.iv), additionalData:new TextEncoder().encode(TEL_SALE)}, (await telIdentita(codice)).chiave, telDaB64(env.dati));
  return JSON.parse(new TextDecoder().decode(pt));
}

/* ── l'hub: chiamate col gettone del personal ── */
const TEL_ERRORI={gettone:'il codice di recupero non è valido su questo hub', invito:'codice d\'invito sconosciuto o già usato', legame:'il collegamento di questo profilo non c\'è più sull\'hub',
  pieno:'spazio del collegamento pieno sull\'hub', grande:'file troppo grande per l\'hub'};
async function telHub(metodo, percorso, opz){
  opz=opz||{};
  const h={}; if(opz.gettone) h.Authorization='Bearer '+opz.gettone;
  let body;
  if(opz.corpo!==undefined){ body=JSON.stringify(opz.corpo); h['Content-Type']='application/json'; }
  else if(opz.testo!==undefined){ body=String(opz.testo); h['Content-Type']='text/plain; charset=utf-8'; }
  let r;
  try{ r=await fetch(telHubUrl()+percorso, {method:metodo, headers:h, body:body, cache:'no-store'}); }
  catch(e){ throw new Error(t('hub del TMS non raggiungibile (rete?)')); }
  return r;
}
async function telErrHub(r){
  let c=''; try{ c=(await r.json()).errore||''; }catch(e){}
  const e=new Error(TEL_ERRORI[c]? t(TEL_ERRORI[c]) : t('l\'hub del TMS ha risposto con un errore')+' ('+r.status+(c?' '+c:'')+')');
  e.stato=r.status; e.codice=c; return e;
}
async function telGettone(){ const pe=telPersonal(); if(!pe) throw new Error(t('questo TMS non è ancora attivo come personal')); return (await telIdentita(pe.codice)).gettone; }
async function telScrivi(p, percorso, testo){ const r=await telHub('PUT', '/v1/f/'+p.lid+'/'+percorso, {gettone:await telGettone(), testo:testo}); if(!r.ok) throw await telErrHub(r); }
async function telTogli(p, percorso){ const r=await telHub('DELETE', '/v1/f/'+p.lid+'/'+percorso, {gettone:await telGettone()}); if(!r.ok && r.status!==404) throw await telErrHub(r); }
/* i file del telefono (scheda ed eventi), col contenuto, in una chiamata sola */
async function telLista(p){
  const r=await telHub('GET', '/v1/f/'+p.lid+'?dir=dal-telefono/&testo=1', {gettone:await telGettone()});
  if(!r.ok) throw await telErrHub(r);
  const j=await r.json(); return Array.isArray(j.file)? j.file : [];
}

/* ── attivazione come personal, recupero su un PC nuovo, legami coi clienti ── */
async function telAttiva(invito){
  if(telPersonal()) return telPersonal();
  const codice=telNuovoCodice(TEL_LUNGO_PERSONAL), id=await telIdentita(codice);
  const r=await telHub('POST', '/v1/personal', {gettone:id.gettone, corpo:{pid:id.id, invito:telCodicePulito(invito)}});
  if(!r.ok) throw await telErrHub(r);
  telStato().personal={codice:codice, pid:id.id, attivo:true, dal:new Date().toISOString()}; telSalva();
  _telMostraRec=true;
  return telPersonal();
}
/* il codice di recupero ridà questo personal e i suoi clienti (solo i profili che ci sono su questo PC) */
async function telRecupera(codice){
  codice=telCodicePulito(codice);
  if(codice.length!==TEL_LUNGO_PERSONAL) throw new Error(t('il codice di recupero ha 24 lettere e numeri'));
  const id=await telIdentita(codice);
  const r=await telHub('POST', '/v1/personal', {gettone:id.gettone, corpo:{pid:id.id}});
  if(!r.ok){ const e=await telErrHub(r); if(e.codice==='invito') throw new Error(t('codice di recupero sconosciuto su questo hub')); throw e; }
  const st=telStato(); st.personal={codice:codice, pid:id.id, attivo:true, dal:new Date().toISOString()};
  const rl=await telHub('GET', '/v1/legami', {gettone:id.gettone});
  if(!rl.ok) throw await telErrHub(rl);
  let n=0;
  for(const l of ((await rl.json()).legami||[])){
    let et; try{ et=await telDecifra(l.etichetta, codice); }catch(e){ continue; }
    if(!et || et.tipo!=='tms-etichetta' || !et.slug || !profili.some(x=>x.slug===et.slug)) continue;
    const p=st.profili[et.slug]=st.profili[et.slug]||{ricevute:[], settimana:1};
    Object.assign(p, {codice:et.codice, lid:l.lid, firmaScheda:'', firmaStato:'', videoFirma:''}); n++;
    try{ await telRiprendi(p); }catch(e){ logErrore('telefono/recupero', e); }
  }
  telSalva(); return n;
}
/* 24/11/2026, Marco: «miglioralo». Su un PC nuovo il collegamento torna col codice di recupero, ma settimana,
   ricevute e l'ultima scheda unita («ombra») stavano nelle impostazioni del PC vecchio: senza, la settimana
   ripartiva da 1 e il primo giro dava ragione al PC su ogni campo (con un backup vecchio, le ultime modifiche
   del telefono si perdevano). Si riprendono da quello che il PC vecchio aveva scritto sull'hub (dal-pc/stato.json
   e dal-pc/scheda.json, cifrati col codice del cliente); la scheda dei Pesi del profilo riparte da lì al suo
   primo giro (`riparti`, vedi telSincronizza). */
async function telRiprendi(p){
  const r=await telHub('GET', '/v1/f/'+p.lid+'?dir=dal-pc/&testo=1&salta=video.json', {gettone:await telGettone()});
  if(!r.ok) return false;
  const file=(await r.json()).file||[];
  const leggi=async nome=>{ const f=file.find(x=>x.nome===nome); if(!f || typeof f.testo!=='string') return null;
    try{ return await telDecifra(f.testo, p.codice); }catch(e){ return null; } };
  const st=await leggi('stato.json'), sc=await leggi('scheda.json');
  if(st && st.tipo==='tms-stato'){
    p.settimana=+st.settimana||+p.settimana||1;
    if(Array.isArray(st.ricevute)) p.ricevute=[...new Set((p.ricevute||[]).concat(st.ricevute.map(String)))].slice(-400);
  }
  if(sc && sc.tipo==='tms-collegata' && Array.isArray(sc.righe)){
    p.ombra={righe:sc.righe, sedute:sc.sedute||{}}; p.riparti=true;
    if(!(st && st.tipo==='tms-stato')) p.settimana=+sc.settimana||+p.settimana||1;
  }
  return true;
}
async function telRegistraLegame(slug, codiceCliente){
  const pe=telPersonal(); if(!pe) throw new Error(t('questo TMS non è ancora attivo come personal'));
  const idC=await telIdentita(codiceCliente);
  const nome=(profili.find(x=>x.slug===slug)||{}).nome||slug;
  const etichetta=await telCifra({tipo:'tms-etichetta', slug:slug, nome:nome, codice:telCodicePulito(codiceCliente)}, pe.codice);
  const r=await telHub('PUT', '/v1/legami/'+idC.id, {gettone:await telGettone(), corpo:{th:await telImpronta(idC.gettone), etichetta:etichetta}});
  if(!r.ok) throw await telErrHub(r);
  return idC.id;
}
async function telTogliLegame(lid){
  const r=await telHub('DELETE', '/v1/legami/'+lid, {gettone:await telGettone()});
  if(!r.ok && r.status!==404) throw await telErrHub(r);
}
/* collega il profilo a un telefono (codice nuovo). Con un collegamento già fatto è «Nuovo codice»: il telefono
   vecchio smette di funzionare, settimana, ombra e ricevute restano. */
async function telCollega(slug){
  slug=slug||activeProfile;
  const st=telStato(), vecchio=st.profili[slug]||null, lidVecchio=vecchio? vecchio.lid : '', codice=telNuovoCodice(TEL_LUNGO_CLIENTE);
  const lid=await telRegistraLegame(slug, codice);
  const p=st.profili[slug]=Object.assign(vecchio||{ricevute:[], settimana:1}, {codice:codice, lid:lid, firmaScheda:'', firmaStato:'', videoFirma:'', dal:new Date().toISOString()});
  delete p.ultimoTelefono;
  telSalva();
  if(lidVecchio && lidVecchio!==lid){ try{ await telTogliLegame(lidVecchio); }catch(e){ logErrore('telefono/legame-vecchio', e); } }
  return p;
}
async function telStacca(slug){
  slug=slug||activeProfile;
  const p=telProf(slug);
  if(p && p.lid) await telTogliLegame(p.lid);
  delete telStato().profili[slug]; telSalva();
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
/* 24/11/2026, Marco: «se aggiungo un esercizio dal telefono, quando lo importa crea un nuovo giorno con lo stesso
   nome, con solo quell'esercizio». Il telefono mette l'esercizio nuovo in fondo all'elenco (lui mostra per giorno),
   e la tabella dei Pesi fa un giorno per ogni blocco di righe consecutive: le righe di uno stesso giorno si
   tengono INSIEME, nell'ordine in cui i giorni compaiono la prima volta (pura: torna un elenco nuovo) */
function telRaggruppa(rows){
  const giorni=[], per=new Map();
  (rows||[]).forEach(r=>{ const g=String((r&&r.giorno)||''); if(!per.has(g)){ per.set(g, []); giorni.push(g); } per.get(g).push(r); });
  return [].concat(...giorni.map(g=>per.get(g)));
}
function telLocale(p){
  let riordinata=false;   /* un giorno spezzato in due blocchi (schede unite prima del 24/11/2026): si rimette insieme e si salva */
  if(DOC.scheda && Array.isArray(DOC.scheda.settimanale)){
    const g=telRaggruppa(DOC.scheda.settimanale);
    if(g.some((r,i)=>r!==DOC.scheda.settimanale[i])){ DOC.scheda.settimanale=g; riordinata=true; if(curTab==='allenamento') setTimeout(()=>{ if(curTab==='allenamento') renderAllenamento(); }, 0); }
  }
  const rows=(DOC.scheda && Array.isArray(DOC.scheda.settimanale))? DOC.scheda.settimanale : [];
  const visti=new Set(), righe=[]; let nuovi=riordinata;
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
  DOC.scheda.settimanale=telRaggruppa(nuove);
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
  await telScrivi(p, 'dal-pc/video.json', await telCifra({tipo:'tms-video', firma:firma, video:map}, p.codice));
  p.videoFirma=firma;
}
async function telScriviStato(slug, p){
  const s={tipo:'tms-stato', profilo:{slug:slug, nome:(profili.find(x=>x.slug===slug)||{}).nome||slug},
    settimana:+p.settimana||1, ricevute:(p.ricevute||[]).slice(-400), scritto:new Date().toISOString()};
  await telScrivi(p, 'dal-pc/stato.json', await telCifra(s, p.codice));
  p.firmaStato=telHash(JSON.stringify([s.settimana, s.ricevute, s.profilo.nome]));
}
/* giorni rinumerati sul PC (rinumeraGiorni, 06-allenamento.js): la seduta di ogni giorno (fatica, durata,
   «giorno fatto») segue il suo giorno anche nell'ombra, così non si perde e il telefono la riceve col nome
   nuovo; quella col nome vecchio, senza più righe, si svuota al giro dopo */
function telRinominaGiorni(mappa){ const p=telProf(); if(!p || !p.ombra || !p.ombra.sedute) return;
  const os=p.ombra.sedute, copia={};
  Object.keys(mappa||{}).forEach(v=>{ if(os[v]) copia[mappa[v]]=JSON.parse(JSON.stringify(os[v])); });
  Object.assign(os, copia); telSalva(); }
/* un giro sulla scheda: data le modifiche fatte qui, unisce quelle del telefono, applica, scrive */
async function telSincronizza(slug, p, lista){
  /* primo giro dopo il recupero su un PC nuovo: la scheda dei Pesi riparte dall'ultima unita (presa dall'hub),
     non dal backup, che può essere più vecchio */
  if(p.riparti && p.ombra){
    if(activeProfile!==slug) return false;
    telApplica(p.ombra); delete p.riparti;
    _telInterno=true; try{ persist('scheda'); } finally{ _telInterno=false; }
    if(curTab==='allenamento') renderAllenamento();
  }
  const adesso=Date.now(), loc=telLocale(p);
  const timbrata=telTimbra(loc.righe, loc.sedute, p.ombra, adesso);
  let remota=null;
  const f=(lista||[]).find(x=>x.nome==='scheda.json');
  if(f && typeof f.testo==='string'){ try{ const d=await telDecifra(f.testo, p.codice); if(d && d.tipo==='tms-collegata' && Array.isArray(d.righe)) remota=d; }catch(e){ /* illeggibile: al giro dopo */ } }
  if(remota && remota.aggiornata) p.ultimoTelefono=String(remota.aggiornata);
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
    await telScrivi(p, 'dal-pc/scheda.json', await telCifra({tipo:'tms-collegata', v:1,
      profilo:{slug:slug, nome:profNome()}, settimana:settimana, righe:unita.righe, sedute:unita.sedute, extra:ex.dati, aggiornata:new Date().toISOString()}, p.codice));
    p.firmaScheda=firma;
  }
  telSalva();
  return cambia && !!remota;
}

/* ogni modifica della scheda (o della dieta) fatta qui parte verso il telefono 2 s dopo l'ultima.
   La chiamano persist('scheda') e persist('alimentazione'). */
function telSchedaToccata(){
  if(_telInterno || !telDisponibile() || !telCollegato(telProf())) return;
  _telSporco=true;
  clearTimeout(_telModT); _telModT=setTimeout(()=>{ telGiro(); }, 2000);
}
/* 24/11/2026, Marco: «quando chiudo l'app da PC fa che si aggiorni con il server per non lasciare nessuna modifica
   in sospeso». Se alla chiusura della finestra c'è una modifica non ancora mandata (o un giro a metà), la chiusura
   si trattiene: ultimo giro con l'hub (al massimo 10 s, anche senza rete), poi la finestra si chiude da sola.
   Solo nell'app desktop (window.tmsFS): nel browser trattenere la chiusura mostrerebbe la domanda del browser. */
function telChiusura(e){
  if(_telChiudi || !window.tmsFS || !telDisponibile() || !telPersonal() || !telCollegato(telProf())) return false;
  if(!_telSporco && !_telGiroIn) return false;
  if(e){ e.preventDefault(); e.returnValue=false; }
  if(_telChiusuraIn) return true;
  _telChiusuraIn=true; clearTimeout(_telModT);
  telNotizia(t('Mando le ultime modifiche al telefono, poi chiudo…'));
  let chiusa=false;
  const fine=()=>{ if(chiusa) return; chiusa=true; _telChiudi=true; window.close(); };
  const tempo=setTimeout(fine, 10000);
  (async()=>{ while(_telGiroIn) await new Promise(r=>setTimeout(r,50)); await telGiro(); })().catch(()=>{}).then(()=>{ clearTimeout(tempo); fine(); });
  return true;
}
/* «💾 Salva nello Storico» CRISTALLIZZA: la settimana dopo riparte con fatica, durata e spunte vuote,
   anche sul telefono; la scheda resta collegata */
function telSettimanaSalvata(code){
  const p=telProf();
  if(!telDisponibile() || !telCollegato(p)) return;
  p.settimana=(+p.settimana||1)+1;
  p.ultimaSalvata={quando:new Date().toISOString(), codice:+code||0};
  const adesso=Date.now();
  if(p.ombra && p.ombra.sedute) Object.keys(p.ombra.sedute).forEach(g=>{
    p.ombra.sedute[g]={rpe:null, min:null, fatto:false, t:{rpe:adesso, min:adesso, fatto:adesso}}; });
  if(DOC.scheda && DOC.scheda.rpe) DOC.scheda.rpe.settimanale={};
  telSalva(); telAggiornaVista();
  _telSporco=true;
  clearTimeout(_telModT); _telModT=setTimeout(()=>{ telGiro(); }, 300);
}

/* ── pesate e foto dal telefono: si importano, si SALVANO, poi si tolgono dall'hub ── */
/* i file arrivati dal telefono (pesate, foto, giorni della dieta, sedute della fascia cardio), decifrati;
   quelli illeggibili restano sull'hub */
async function telEventi(p, lista){
  const pesate=[], foto=[], dieta=[], cardio=[], fatti=[];
  const arrivati=(lista||[]).filter(x=>/^eventi\//.test(x.nome) && typeof x.testo==='string');
  for(const f of arrivati.slice().sort((a,b)=>a.nome<b.nome?-1:1)){
    let ev; try{ ev=await telDecifra(f.testo, p.codice); }catch(e){ continue; }   /* illeggibile: si lascia */
    if(ev && ev.tipo==='tms-pesata' && ev.pesata && pulisciPesata(ev.pesata)){ pesate.push(ev.pesata); fatti.push({nome:f.nome, id:String(ev.pesata.id)}); }
    else if(ev && ev.tipo==='tms-foto' && ev.foto && ev.foto.id && /^data:image\//.test(String(ev.foto.img||''))){ foto.push(ev.foto); fatti.push({nome:f.nome, id:String(ev.foto.id)}); }
    else if(ev && ev.tipo==='tms-dieta' && ev.id && /^\d{4}-\d\d-\d\d$/.test(String(ev.data||''))){ dieta.push(ev); fatti.push({nome:f.nome, id:String(ev.id)}); }
    else if(ev && ev.tipo==='tms-cardio' && ev.seduta && pulisciCardioTel(ev.seduta)){ cardio.push(ev.seduta); fatti.push({nome:f.nome, id:String(ev.seduta.id)}); }
  }
  return {pesate, foto, dieta, cardio, fatti};
}
/* arrivati e salvati: il telefono li vede «al PC» e dall'hub se ne vanno */
async function telConfermaEventi(slug, p, fatti){
  const ric=new Set(p.ricevute||[]); fatti.forEach(f=>ric.add(f.id)); p.ricevute=[...ric].slice(-400); telSalva();
  await telScriviStato(slug, p);
  for(const f of fatti){ try{ await telTogli(p, 'dal-telefono/'+f.nome); }catch(e){ logErrore('telefono/togli', e); } }
}
async function telLeggiEventi(slug, p, lista){
  const {pesate, foto, dieta, cardio, fatti}=await telEventi(p, lista);
  if(!fatti.length || activeProfile!==slug) return null;
  let rp=null, nFoto=0, nDieta=0, nCardio=0;
  if(pesate.length) rp=await importaPesate(pesate);
  if(foto.length) nFoto=await importaFotoRientro(foto);
  if(dieta.length) nDieta=telDietaApplica(dieta);
  if(cardio.length) nCardio=importaCardioTel(cardio, new Set(p.ricevute||[]));   /* già ricevuta = non torna */
  /* salvataggio VERO su disco prima di togliere qualcosa dall'hub */
  clearTimeout(saveTimer); await flushSaves();
  if(activeProfile!==slug) return null;
  await telConfermaEventi(slug, p, fatti);                    /* il telefono vedrà ✔ «arrivata al PC» */
  if(curTab==='corpo') renderCorpo();
  if(nDieta && curTab==='alimentazione') renderAlimentazione();
  if(nCardio && curTab==='cardio') renderCardio();
  return {pesate:rp, foto:nFoto, dieta:nDieta, cardio:nCardio};
}
/* «dieta seguita» segnata dal cliente sul telefono: DOC.alimentazione.aderenza = {data: {v:'si'|'no'|'', t:ora
   del cambio}}. Vince il cambio più recente (uno più vecchio arrivato dopo non torna indietro); un giorno
   tolto resta con v vuoto, così un vecchio «sì» in ritardo non lo rimette. */
function telDietaApplica(lista){
  const n=telDietaUnisci(DOC.alimentazione=DOC.alimentazione||{bulk:[],mant:[],cut:[]}, lista);
  if(n){ _telInterno=true; try{ persist('alimentazione'); } finally{ _telInterno=false; } }
  return n;
}
function telDietaUnisci(A, lista){
  const ad=A.aderenza=(A.aderenza && typeof A.aderenza==='object' && !Array.isArray(A.aderenza))? A.aderenza : {};
  let n=0;
  lista.slice().sort((a,b)=>String(a.ora||'').localeCompare(String(b.ora||''))).forEach(e=>{
    const d=String(e.data), v=(e.valore==='si'||e.valore==='no')? e.valore : '', ora=String(e.ora||'');
    const c=ad[d]; if(c && c.t && ora && ora<c.t) return;
    ad[d]={v:v, t:ora}; n++; });
  return n;
}

/* ── i CLIENTI NON APERTI (25/11/2026, richiesta di Marco): il PC controlla anche i loro telefoni, uno alla
      volta, e salva pesate, foto e giorni della dieta direttamente nei file di quel profilo (corpo.json,
      alimentazione.json, foto/), senza aprirlo: così non aspettano sull'hub (dove scadono dopo 30 giorni) e
      lo storico resta completo. Regole di sicurezza: un file illeggibile non si riscrive mai; i valori dello
      Storico misure scritti a mano restano (le pesate si salvano comunque); se intanto apri o cambi profilo
      (profiloCambi) non si conferma niente, i file restano sull'hub e arrivano al giro dopo, senza doppioni
      (gli id). La scheda di un cliente non aperto si unisce quando apri il suo profilo (sull'hub non scade). ── */
const TEL_ALTRI_OGNI=90000;
let _telAltroIdx=0, _telAltriT=null;
const TEL_PANORAMICA={};   /* slug → {controllato, ultimo, arrivati} per la panoramica nelle Impostazioni */
function telAltriCollegati(){
  const st=telStato();
  return profili.map(x=>x.slug).filter(s=>s!==activeProfile && telCollegato(st.profili[s])); }
async function telGiroAltri(){
  if(_telGiroIn || !telDisponibile() || scrittureBloccate || !dataDir || !telPersonal()) return;
  const altri=telAltriCollegati(); if(!altri.length) return;
  const slug=altri[_telAltroIdx++ % altri.length], p=telProf(slug), cambi=profiloCambi;
  _telGiroIn=true;
  try{
    const lista=await telLista(p);
    const pan=TEL_PANORAMICA[slug]=TEL_PANORAMICA[slug]||{};
    pan.controllato=new Date().toISOString();
    const ore=lista.map(x=>+x.ora||0).filter(Boolean); if(ore.length) pan.ultimo=new Date(Math.max(...ore)).toISOString();
    const {pesate, foto, dieta, cardio, fatti}=await telEventi(p, lista);
    if(!fatti.length) return;
    const pd=await dataDir.getDirectoryHandle(slug, {create:false});
    const rc=await leggiJson(pd, FILES.corpo), ra=await leggiJson(pd, FILES.alimentazione);
    if(rc.stato==='illeggibile' || ra.stato==='illeggibile') return;      /* mai sopra un file che non si legge */
    if(profiloCambi!==cambi || activeProfile===slug) return;
    const co=(rc.stato==='ok' && rc.dati && typeof rc.dati==='object')? rc.dati : corpoFile({});
    const al=(ra.stato==='ok' && ra.dati && typeof ra.dati==='object')? ra.dati : {bulk:[],mant:[],cut:[]};
    const rp=await pesateUnisci(co, pesate, async()=>false);          /* i valori scritti a mano restano */
    const nFoto=await fotoUnisci(co, foto, async(fname, bytes)=>{ const fd=await pd.getDirectoryHandle('foto',{create:true});
      const fh=await fd.getFileHandle(fname,{create:true}); const wr=await fh.createWritable(); await wr.write(bytes); await wr.close(); });
    const nDieta=telDietaUnisci(al, dieta);
    const nCardio=cardioUnisci(co, cardio, new Set(p.ricevute||[]));
    if(profiloCambi!==cambi || activeProfile===slug) return;         /* aperto nel frattempo: ci pensa il suo giro */
    if(rp.nuove || nFoto || nCardio) await writeJson(pd, FILES.corpo, co);
    if(nDieta) await writeJson(pd, FILES.alimentazione, al);
    if(profiloCambi!==cambi || activeProfile===slug) return;         /* aperto mentre scrivevo: si rifà dopo */
    await telConfermaEventi(slug, p, fatti);
    pan.arrivati={ora:new Date().toISOString(), pesate:rp.nuove, foto:nFoto, dieta:nDieta, cardio:nCardio};
    const pz=[];
    if(rp.nuove) pz.push(rp.nuove+' '+(rp.nuove===1?t('pesata nuova'):t('pesate nuove')));
    if(nFoto) pz.push(nFoto+' '+t('foto'));
    if(nDieta) pz.push(nDieta===1? t('un giorno della dieta') : nDieta+' '+t('giorni della dieta'));
    if(nCardio) pz.push(nCardio===1? t('una seduta cardio') : nCardio+' '+t('sedute cardio'));
    const nome=(profili.find(x=>x.slug===slug)||{}).nome||slug;
    if(pz.length) telNotizia(t('Dal telefono di')+' '+nome+': '+pz.join(' · '));
  }catch(e){ logErrore('telefono/altri', e); }
  finally{ _telGiroIn=false; }
}
/* il QR del codice del cliente: il telefono lo inquadra (TMS Scheda › Collegamento › «Inquadra il QR») */
function telQrModal(indietro){
  const p=telProf(); if(!telCollegato(p)) return;
  modal(`${croceModal()}<h3>${t('Collega il telefono di')} «${esc(profNome())}»</h3>
    <div class="tel-qr">${qrSvg(qrTestoCodice(p.codice), 240)}</div>
    <div class="lat-nota" style="text-align:center">${t('Sul telefono del cliente: TMS Scheda › Collegamento e promemoria › «Inquadra il QR», e punta la fotocamera qui. Oppure scrivi il codice:')}<br><code class="tel-codice">${esc(telCodiceBello(p.codice))}</code></div>
    <div class="lat-nota tel-avviso" style="text-align:center">${t('Chi inquadra questo QR può leggere i dati di questo cliente: mostralo solo a lui.')}</div>
    <div class="modal__actions"><button class="btn" id="tel-qr-indietro">${ico('indietro','p')}${t('Torna alle Impostazioni')}</button></div>`);
  document.getElementById('tel-qr-indietro').onclick=()=>indietro();
  modalChiudibile();
}
/* panoramica dei clienti collegati (Impostazioni › Telefono collegato) */
function telPanoramicaHtml(){
  const st=telStato(), coll=profili.filter(x=>telCollegato(st.profili[x.slug]));
  if(coll.length<2) return '';
  const righe=coll.map(x=>{ const p=st.profili[x.slug], pan=TEL_PANORAMICA[x.slug]||{}, att=x.slug===activeProfile;
    const ultimo=att? p.ultimoTelefono : (pan.ultimo || p.ultimoTelefono);
    const arr=pan.arrivati, pz=[];
    if(arr){ if(arr.pesate) pz.push(arr.pesate+' '+t(arr.pesate===1?'pesata':'pesate')); if(arr.foto) pz.push(arr.foto+' '+t('foto')); if(arr.dieta) pz.push(arr.dieta+' '+t(arr.dieta===1?'giorno della dieta':'giorni della dieta')); if(arr.cardio) pz.push(arr.cardio+' '+t(arr.cardio===1?'seduta cardio':'sedute cardio')); }
    return `<div class="tel-cliente${att?' is-on':''}"><b>${esc(x.nome||x.slug)}</b><span>${ultimo? t('ultimo dal telefono')+' '+esc(telOra(ultimo)) : t('il telefono non ha ancora scritto niente')}${pz.length? ' · '+t('arrivate')+' '+esc(pz.join(', ')) : ''}</span>
      ${att? `<em>${t('aperto')}</em>` : `<button class="btn btn--sm" data-tel-apri="${esc(x.slug)}">${t('Apri')}</button>`}</div>`; }).join('');
  return `<div class="imp-etich" style="margin-top:10px">${t('Clienti collegati')}</div><div class="tel-clienti">${righe}</div>
    <div class="lat-nota">${t('Il TMS controlla anche i telefoni dei profili non aperti e ne salva pesate, foto, giorni della dieta e sedute cardio; le modifiche alla scheda si uniscono quando apri il profilo.')}</div>`;
}

/* ── il giro: pesate e foto, scheda, stato. Solo il profilo ATTIVO (gli altri al loro turno). ── */
async function telGiro(){
  if(_telGiroIn || !telDisponibile() || scrittureBloccate || !profileDir) return;
  const slug=activeProfile, p=telProf(slug);
  if(!telPersonal() || !telCollegato(p)) return;
  _telGiroIn=true; _telSporco=false;   /* una modifica fatta durante il giro lo rimette a true */
  try{
    const lista=await telLista(p);
    const ev=await telLeggiEventi(slug, p, lista);
    const sc=await telSincronizza(slug, p, lista);
    const fs=telHash(JSON.stringify([+p.settimana||1, (p.ricevute||[]).slice(-400), profNome()]));
    if(fs!==p.firmaStato) await telScriviStato(slug, p);
    _telUltimoGiro=new Date(); _telErr=''; telSalva();
    const pz=[];
    if(ev && ev.pesate && ev.pesate.nuove) pz.push(ev.pesate.nuove+' '+(ev.pesate.nuove===1?t('pesata nuova'):t('pesate nuove')));
    if(ev && ev.foto) pz.push(ev.foto+' '+t('foto nel tab Corpo'));
    if(ev && ev.dieta) pz.push(ev.dieta===1? t('un giorno della dieta') : ev.dieta+' '+t('giorni della dieta'));
    if(ev && ev.cardio) pz.push(ev.cardio===1? t('una seduta cardio') : ev.cardio+' '+t('sedute cardio'));
    if(sc) pz.push(t('scheda aggiornata dal telefono'));
    if(pz.length) telNotizia(t('Dal telefono:')+' '+pz.join(' · '));
  }catch(e){ _telSporco=true; _telErr=String((e&&e.message)||e); logErrore('telefono/giro', e); }
  finally{ _telGiroIn=false; telAggiornaVista(); }
}
function telAvvia(){
  if(!telDisponibile()) return;
  clearInterval(_telTimer); _telTimer=setInterval(()=>{ telGiro(); }, TEL_OGNI);
  clearInterval(_telAltriT); _telAltriT=setInterval(()=>{ telGiroAltri(); }, TEL_ALTRI_OGNI);
  setTimeout(()=>{ telGiroAltri(); }, 12000);
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
  const p=telProf(); if(!telCollegato(p)) return '';
  const s=t('Scheda collegata al telefono')+' · '+t('settimana')+' <b>'+(+p.settimana||1)+'</b>'+
    ' · '+(p.ultimoTelefono? t('ultimo dal telefono')+' <b>'+esc(telOra(p.ultimoTelefono))+'</b>' : t('il telefono non ha ancora scritto niente'))+
    '<br><span class="muted">'+t('Quello che cambi qui o sul telefono si allinea da solo. «Salva nello Storico» chiude la settimana anche sul telefono; la scheda resta collegata per la settimana dopo.')+'</span>';
  return `<div class="tel-riga no-print" id="tel-riga"><span>${s}</span></div>`;
}
/* riga nella finestra di «Salva nello Storico»: quanto è fresco quello che è arrivato dal telefono */
function telRigaSalva(){
  if(!telDisponibile()) return '';
  const p=telProf(); if(!telCollegato(p)) return '';
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
  if(!telCollegato(p)) return t('Il profilo attivo non è collegato.');
  const pz=[t('settimana')+' '+(+p.settimana||1)];
  if(p.ultimoTelefono) pz.push(t('ultimo dal telefono')+' '+telOra(p.ultimoTelefono));
  if(p.ultimaSalvata) pz.push(t('ultima settimana salvata il')+' '+telOra(p.ultimaSalvata.quando));
  if((p.ricevute||[]).length) pz.push((p.ricevute||[]).length+' '+t('pesate e foto ricevute'));
  if(_telUltimoGiro) pz.push(t('controllato alle')+' '+_telUltimoGiro.toLocaleTimeString(LANG==='en'?'en-GB':'it-IT',{hour:'2-digit',minute:'2-digit'}));
  if(_telErr) pz.push(_telErr);
  return t('Collegato')+' · '+esc(pz.join(' · '));
}
function telSezioneImpostazioni(){
  const intro=`<div class="lat-nota" style="margin:0 0 8px">${t('Il TMS (il personal) e l\'app TMS Scheda di ogni cliente condividono la scheda dei Pesi (si modifica da tutte e due le parti) e si passano dieta, pesate e foto attraverso l\'hub del TMS su internet. Ogni cliente ha il suo codice e i suoi file sono cifrati con quello: l\'hub vede solo file illeggibili e non tiene lo storico, che resta su questo PC.')}</div>`;
  if(!telDisponibile()) return `<div class="imp-sez" id="imp-tel"><h4>${t('Telefono collegato')}</h4>${intro}<div class="lat-nota">${t('L\'hub del TMS non è ancora configurato in questa versione.')}</div></div>`;
  const pe=telPersonal(), p=telProf(), nome=esc(profNome());
  if(!pe) return `<div class="imp-sez" id="imp-tel">
      <h4>${t('Telefono collegato')}</h4>${intro}
      <div class="imp-riga"><span>${t('Codice d\'invito')}</span><span class="gruppo"><input type="text" id="imp-tel-invito" class="imp-tel-campo" autocomplete="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX"><button class="btn btn--sm btn--ember" id="imp-tel-attiva">${t('Attiva')}</button></span></div>
      <div class="lat-nota">${t('Il codice d\'invito te lo dà chi gestisce l\'hub. Attivando, questo TMS diventa un personal: poi colleghi i telefoni dei tuoi clienti, un profilo alla volta.')}</div>
      <div class="imp-riga"><span>${t('Codice di recupero')}</span><span class="gruppo"><input type="text" id="imp-tel-recupero" class="imp-tel-campo" autocomplete="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"><button class="btn btn--sm" id="imp-tel-recupera">${t('Recupera')}</button></span></div>
      <div class="lat-nota">${t('Eri già personal su un altro PC? Scrivi il tuo codice di recupero: tornano i collegamenti dei profili che ci sono anche qui.')}</div>
    </div>`;
  const rec=_telMostraRec? `<div class="imp-riga imp-codice"><span>${t('Codice di recupero')}</span><code class="tel-codice" id="imp-tel-rec">${esc(telCodiceBello(pe.codice))}</code><span class="gruppo"><button class="btn btn--sm" id="imp-tel-copia-rec">${t('Copia')}</button></span></div>
      <div class="lat-nota tel-avviso">${t('Conservalo in un posto sicuro: serve per passare a un PC nuovo senza ricollegare i clienti. Chi lo ha può leggere i dati dei tuoi clienti sull\'hub.')}</div>`
    : `<div class="imp-riga"><span>${t('Personal attivo')}</span><span class="gruppo"><button class="btn btn--sm" id="imp-tel-mostra-rec">${t('Mostra il codice di recupero')}</button></span></div>`;
  const prof=telCollegato(p)? `<div class="imp-riga imp-codice"><span>${t('Codice del telefono di')} «${nome}»</span><code class="tel-codice" id="imp-tel-codice">${esc(telCodiceBello(p.codice))}</code><span class="gruppo"><button class="btn btn--sm" id="imp-tel-copia">${t('Copia')}</button><button class="btn btn--sm" id="imp-tel-qr">${t('QR')}</button><button class="btn btn--sm" id="imp-tel-nuovo">${t('Nuovo codice')}</button><button class="btn btn--sm" id="imp-tel-togli">${t('Stacca')}</button></span></div>
      <div class="lat-nota">${t('Sul telefono del cliente: TMS Scheda › Collegamento e promemoria › «Inquadra il QR» (pulsante QR qui sopra) o scrivi questo codice. Si fa una volta sola.')}</div>
      <div class="lat-nota" id="imp-tel-stato">${telTestoStato()}</div>`
    : `<div class="imp-riga"><span>${t('Profilo')} «${nome}»</span><span class="gruppo"><button class="btn btn--sm btn--ember" id="imp-tel-prof">${t('Collega un telefono')}</button></span></div>
      <div class="lat-nota">${t('Crea il codice da scrivere sul telefono di questo cliente (o sul tuo, se il profilo è il tuo).')}</div>`;
  return `<div class="imp-sez" id="imp-tel">
      <h4>${t('Telefono collegato')}</h4>${intro}${rec}${prof}${telPanoramicaHtml()}
    </div>`;
}
function telAgganciaImpostazioni(riapri){
  const m=document.getElementById('modal'); if(!m || !document.getElementById('imp-tel')) return;
  const su=(id,fn)=>{ const b=document.getElementById(id); if(b) b.onclick=async()=>{ try{ await fn(); }catch(e){ logErrore('telefono/impostazioni', e); avviso(String((e&&e.message)||e)); } riapri(); }; };
  const valore=id=>{ const el=document.getElementById(id); return el? el.value : ''; };
  su('imp-tel-attiva', async()=>{ await telAttiva(valore('imp-tel-invito')); });
  su('imp-tel-recupera', async()=>{ const n=await telRecupera(valore('imp-tel-recupero')); telNotizia(n? t('Personal ritrovato:')+' '+n+' '+t('profili ricollegati') : t('Personal ritrovato.')); await telGiro(); });
  su('imp-tel-mostra-rec', async()=>{ _telMostraRec=true; });
  { const b=document.getElementById('imp-tel-qr'); if(b) b.onclick=()=>telQrModal(riapri); }
  document.querySelectorAll('[data-tel-apri]').forEach(b=>{ b.onclick=async()=>{ closeModal(); await switchProfile(b.getAttribute('data-tel-apri')); }; });
  su('imp-tel-copia-rec', async()=>{ try{ await navigator.clipboard.writeText(telCodiceBello(telPersonal().codice)); telNotizia(t('Codice copiato.')); }catch(e){} });
  su('imp-tel-prof', async()=>{ await telCollega(activeProfile); await telGiro(); if(curTab==='allenamento') renderAllenamento(); });
  su('imp-tel-nuovo', async()=>{
    if(!await conferma(t('Con un codice nuovo il telefono di questo cliente smette di funzionare finché non ci scrivi il codice nuovo. Continuo?'))) return;
    await telCollega(activeProfile); await telGiro(); });
  su('imp-tel-copia', async()=>{ try{ await navigator.clipboard.writeText(telCodiceBello(telProf().codice)); telNotizia(t('Codice copiato.')); }catch(e){} });
  su('imp-tel-togli', async()=>{ if(!await conferma(t('La scheda di questo profilo non è più collegata al telefono: l\'hub cancella i suoi file e quello che il telefono manda non arriva più. Continuo?'))) return;
    await telStacca(activeProfile); if(curTab==='allenamento') renderAllenamento(); });
}
