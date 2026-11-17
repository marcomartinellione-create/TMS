/* ════ 🔗 TELEFONO COLLEGATO: SCAMBIO DIRETTO PC ↔ APP DEL TELEFONO (2026-11-17, richiesta di Marco) ════
   Come Movienaitor: PC e telefono non si parlano direttamente, si lasciano file in una CARTELLA
   CONDIVISA (sul PC una cartella di Google Drive per desktop, di solito «My Drive\6 - TMS»; sul
   telefono una cartella tenuta uguale da un'app di sincronizzazione). La cartella è solo una buca
   delle lettere: i dati veri restano in TMS_Dati sul PC e dentro l'app sul telefono.

     <cartella>/<profilo>/dal-pc/stato.json        com'è la settimana + ricevute    (scrive SOLO il PC)
     <cartella>/<profilo>/dal-pc/scheda.json       la scheda della settimana         (SOLO il PC)
     <cartella>/<profilo>/dal-telefono/bozza.json  l'allenamento compilato finora    (SOLO il telefono)
     <cartella>/<profilo>/dal-telefono/eventi/*    una pesata o una foto per file    (il telefono le
                                                   scrive, il PC le toglie DOPO averle salvate)

   Regole:
   · un solo scrittore per file: niente versioni in conflitto;
   · la PRESCRIZIONE (esercizi, previsto, recupero) la cambia solo il PC; quello che è stato FATTO
     solo il telefono, fino a «💾 Salva nello Storico», che chiude la settimana anche sul telefono;
   · ogni modifica della scheda fatta qui a settimana aperta alza la revisione (`rev`) e riparte
     verso il telefono; la bozza costruita su una revisione vecchia non si applica (aspetta che il
     telefono abbia la modifica: lì i valori già scritti restano);
   · file a metà o illeggibile: si salta e si riprova al giro dopo, MAI cancellato;
   · tutto cifrato (AES-GCM, chiave dal CODICE DI COLLEGAMENTO che si scrive una volta sul
     telefono): Google e l'app di sincronizzazione vedono solo file illeggibili. Il sigillo della
     cifratura scopre anche i file arrivati a metà.
   Lo stato del collegamento (codice, settimana mandata, revisione, ricevute) sta nel localStorage
   di questo computer, come le altre impostazioni; il percorso della cartella lo tiene electron/main.js. */

const TEL_KEY='tms-telefono';
const TEL_ALFA='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   /* 32 segni senza I, O, 0, 1: 16 segni = 80 bit */
const TEL_SALE='tms-scambio-v1', TEL_GIRI=150000;
const TEL_OGNI=20000;                                /* un giro ogni 20 s a TMS aperto (e al ritorno sulla finestra) */
let TEL=null, _telChiave=null, _telChiaveDi='', _telGiroIn=false, _telTimer=null, _telModT=null, _telUltimoGiro=null, _telErr='';

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
function telAperta(p){ return !!(p && p.id && !(p.chiusa && p.chiusa.id===p.id)); }
function telNuovoCodice(){ const b=new Uint8Array(16); crypto.getRandomValues(b); let s=''; for(let i=0;i<16;i++) s+=TEL_ALFA[b[i]&31]; return s; }
function telCodicePulito(c){ return String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }
function telCodiceBello(c){ return telCodicePulito(c).replace(/(.{4})(?=.)/g,'$1-'); }

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
/* impronta di ciò che il telefono riceve (senza video, data e «ultima volta»): se non cambia, non si rimanda */
function telImpronta(dati){
  const s=JSON.stringify({r:dati.righe, w:dati.riscaldamento, d:dati.dieta, c:dati.corpo, rpe:dati.rpe, m:dati.modificabile, k:dati.catalogo});
  let h=0x811c9dc5; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,0x01000193)>>>0; }
  return h.toString(16)+':'+s.length;
}
const telBase=slug=>String(slug)+'/';

/* ── scritture verso il telefono ── */
async function telScriviStato(slug, p){
  const s={tipo:'tms-stato', profilo:{slug:slug, nome:(profili.find(x=>x.slug===slug)||{}).nome||slug},
    scheda:p.id?{id:p.id, rev:+p.rev||1, esportata:p.esportata||''}:null, chiusa:p.chiusa||null,
    ricevute:(p.ricevute||[]).slice(-400), scritto:new Date().toISOString()};
  await window.tmsScambio.scrivi(telBase(slug)+'dal-pc/stato.json', await telCifra(s));
}
async function telScriviScheda(slug, p, videoMap){
  const dati=costruisciSchedaJSON(videoMap||{}, !!p.modificabile);
  dati.esportata=p.esportata; dati.sync={id:p.id, rev:+p.rev||1};
  await window.tmsScambio.scrivi(telBase(slug)+'dal-pc/scheda.json', await telCifra(dati));
  p.impronta=telImpronta(dati);
}

/* ── «🔗 Manda al telefono»: la scheda della settimana nuova ── */
async function telMandaScheda(){
  if(!telDisponibile()){ avviso(t('Il collegamento col telefono c\'è solo nell\'app del TMS sul PC.')); return; }
  const st=telStato();
  if(!st.codice || !(await window.tmsScambio.cartella())){ telImpostaModal(); return; }
  if(!righeSchedaCliente().length){ avviso(t('La scheda settimanale è vuota: niente da esportare.')); return; }
  const slug=activeProfile, prima=telProf(slug);
  if(telAperta(prima) && !await conferma(t('Sul telefono c\'è ancora la settimana mandata il')+' '+giornoPesata(prima.esportata)+', '+t('non salvata nello Storico.')+'\n'+
      t('Se mandi la scheda nuova, i valori di quella settimana restano sul telefono ma non arrivano più qui. Continuo?'),
      {titolo:t('🔗 Manda al telefono'), testoOk:t('Manda la nuova')})) return;
  const modo=await chiediModalitaScheda(); if(modo==null) return;
  let map={};
  const files=[...new Set(collectSchedaVideos().concat(collectRiscaldamentoVideos()).map(v=>v.file))];
  if(files.length && dirHandle && await conferma(t('Includere i')+' '+files.length+' '+t('video degli esercizi nel file? (più pesante, ma il cliente li vede offline nell\'app)'))) map=await embedVideoFiles(files);
  const oggi=new Date().toISOString().slice(0,10);
  const p=st.profili[slug]=Object.assign(prima||{}, {id:'S'+Date.now().toString(36), rev:1, esportata:oggi, inviata:new Date().toISOString(),
    modificabile:(modo==='modificabile'), chiusa:null, bozzaVista:'', bozzaAttesa:false, ultimaBozza:''});
  try{
    await telScriviScheda(slug, p, map);      /* prima la scheda, poi lo stato che la annuncia */
    await telScriviStato(slug, p);
  }catch(e){ logErrore('telefono/manda', e); avviso(t('Non riesco a scrivere nella cartella condivisa:')+' '+((e&&e.message)||e)); return; }
  telSalva(); telAggiornaVista();
  avviso(t('🔗 Scheda mandata al telefono')+' ('+(p.modificabile?t('scheda modificabile'):t('scheda fissa'))+').\n'+
    t('Quando la cartella si sincronizza, l\'app del telefono chiede di aprirla. Da lì quello che scrivi in palestra arriva qui da solo, nel tab Pesi; quando hai finito la settimana premi «💾 Salva nello Storico».'));
}

/* a settimana aperta ogni modifica della scheda fatta QUI riparte verso il telefono (4 s dopo
   l'ultima). La chiamano persist('scheda') e persist('alimentazione'). */
function telSchedaToccata(){
  if(!telDisponibile() || !telAperta(telProf())) return;
  clearTimeout(_telModT); _telModT=setTimeout(()=>{ telRimanda().catch(e=>logErrore('telefono/rimanda', e)); }, 4000);
}
async function telRimanda(){
  const slug=activeProfile, p=telProf(slug);
  if(!telAperta(p) || scrittureBloccate) return false;
  const dati=costruisciSchedaJSON({}, !!p.modificabile), imp=telImpronta(dati);
  if(imp===p.impronta) return false;
  p.rev=(+p.rev||1)+1; dati.esportata=p.esportata; dati.sync={id:p.id, rev:p.rev};
  await window.tmsScambio.scrivi(telBase(slug)+'dal-pc/scheda.json', await telCifra(dati));
  p.impronta=imp; telSalva();
  await telScriviStato(slug, p);
  telAggiornaVista();
  return true;
}
/* «💾 Salva nello Storico» chiude la settimana anche sul telefono */
function telSettimanaSalvata(code){
  const slug=activeProfile, p=telProf(slug);
  if(!telDisponibile() || !telAperta(p)) return;
  clearTimeout(_telModT);
  p.chiusa={id:p.id, quando:new Date().toISOString(), codice:+code||0}; telSalva();
  telScriviStato(slug, p).catch(e=>logErrore('telefono/chiudi', e));
  telAggiornaVista();
}

/* ── bozza dal telefono → scheda Pesi. Pura sui dati (vista e modalità restano dove sono).
   Ogni riga della bozza dice quali campi il telefono ha TOCCATO (`t`: s, r, p, rir, n): RIR e note
   non toccati restano quelli scritti qui (il telefono li mostra vuoti), recupero e note del coach
   non si perdono. Serie, ripetizioni e peso partono sul telefono dal previsto, quindi si prendono
   sempre. Le righe si abbinano per giorno + esercizio, nell'ordine (i ＋set ripetono lo stesso
   esercizio); quelle aggiunte o rinominate sul telefono entrano come sono, quelle tolte sul
   telefono (scheda modificabile) escono. ── */
function telApplicaBozza(b){
  if(!DOC.scheda || typeof DOC.scheda!=='object') DOC.scheda={settimanale:[],mensile:[]};
  const prima=Array.isArray(DOC.scheda.settimanale)? DOC.scheda.settimanale : [];
  const chiave=(g,e)=>String(g||'')+'|'+String(e||'').trim().toLowerCase();
  const usate=new Set();
  const nr=x=>(x===''||x==null)?'':+x;
  DOC.scheda.settimanale=(b.righe||[]).filter(r=>r&&String(r.esercizio||'').trim()).map(r=>{
    const k=chiave(r.giorno, r.esercizio), tocc=new Set(Array.isArray(r.t)? r.t : ['s','r','p','rir','n']);
    const i=prima.findIndex((x,j)=>!usate.has(j) && x && chiave(x.giorno, x.esercizio)===k);
    if(i>=0){ usate.add(i); const x=prima[i];
      return Object.assign({}, x, {serie:+r.serie||0, rip:+r.rip||0, peso:+r.peso||0,
        rir:tocc.has('rir')? nr(r.rir) : x.rir, note:tocc.has('n')? String(r.note||'') : x.note, test:!!r.test}); }
    return {giorno:String(r.giorno||giornoScheda(1)), esercizio:String(r.esercizio).trim(), note:String(r.note||''),
      serie:+r.serie||0, rip:+r.rip||0, peso:+r.peso||0, rest:String(r.rest||''), rir:nr(r.rir), test:!!r.test};
  });
  if(!DOC.scheda.rpe || typeof DOC.scheda.rpe!=='object') DOC.scheda.rpe={};
  const rpe={};
  (b.sedute||[]).forEach(s=>{ const g=String((s&&s.giorno)||''), rp=+((s&&s.rpe)||0), mn=+((s&&s.min)||0);
    if(g && (rp>0||mn>0)) rpe[g]={rpe:rp||'', min:mn||''}; });
  DOC.scheda.rpe.settimanale=rpe;
  return DOC.scheda.settimanale.length;
}
async function telLeggiBozza(slug, p){
  if(!telAperta(p)) return false;
  const r=await window.tmsScambio.leggi(telBase(slug)+'dal-telefono/bozza.json');
  if(!r || r.stato!=='ok') return false;
  let b; try{ b=await telDecifra(r.testo); }catch(e){ return false; }   /* a metà o cifrata con un altro codice: al giro dopo */
  if(!b || b.tipo!=='tms-bozza' || !b.sync || b.sync.id!==p.id || !Array.isArray(b.righe)) return false;
  p.ultimaBozza=String(b.aggiornata||'');
  if((+b.sync.rev||1)!==(+p.rev||1)){ p.bozzaAttesa=true; return false; }   /* il telefono non ha ancora la modifica fatta qui */
  p.bozzaAttesa=false;
  if(p.bozzaVista && String(b.aggiornata||'')<=p.bozzaVista) return false;
  if(!b.righe.some(x=>x&&String(x.esercizio||'').trim())) return false;
  /* si sta scrivendo nella tabella dei Pesi: si aspetta il giro dopo, per non togliere il campo sotto le dita */
  const ae=document.activeElement;
  if(ae && ae.closest && ae.closest('#panel-allenamento') && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return false;
  if(activeProfile!==slug) return false;
  telApplicaBozza(b);
  p.bozzaVista=String(b.aggiornata||'');
  p.impronta=telImpronta(costruisciSchedaJSON({}, !!p.modificabile));   /* è roba del telefono: non si rimanda indietro */
  persist('scheda');
  if(curTab==='allenamento') renderAllenamento();
  return true;
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

/* ── il giro: eventi, bozza, stato. Solo il profilo ATTIVO (gli altri al loro turno). ── */
async function telGiro(){
  if(_telGiroIn || !telDisponibile() || scrittureBloccate || !profileDir) return;
  const st=telStato(), slug=activeProfile, p=st.profili[slug];
  if(!st.codice || !p) return;
  _telGiroIn=true;
  try{
    if(!(await window.tmsScambio.cartella())) return;
    const ev=await telLeggiEventi(slug, p);
    const bz=await telLeggiBozza(slug, p);
    _telUltimoGiro=new Date(); _telErr=''; telSalva();
    const pz=[];
    if(ev && ev.pesate && ev.pesate.nuove) pz.push('⚖ '+ev.pesate.nuove+' '+(ev.pesate.nuove===1?t('pesata nuova'):t('pesate nuove')));
    if(ev && ev.foto) pz.push('📷 '+ev.foto+' '+t('foto nel tab Corpo'));
    if(bz) pz.push('🏋 '+t('allenamento aggiornato nel tab Pesi'));
    if(pz.length) telNotizia(t('🔗 Dal telefono:')+' '+pz.join(' · '));
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

/* riga nel tab Pesi: com'è la settimana col telefono */
function telRigaPesi(){
  if(!telDisponibile()) return '';
  const p=telProf(); if(!p) return '';
  let s;
  if(telAperta(p)) s=t('🔗 Settimana sul telefono, mandata il')+' <b>'+esc(giornoPesata(p.esportata))+'</b>'+((+p.rev>1)?' ('+t('aggiornata')+' '+(p.rev-1)+'×)':'')+
      ' · '+(p.ultimaBozza? t('ultimo dal telefono')+' <b>'+esc(telOra(p.ultimaBozza))+'</b>' : t('il telefono non ha ancora scritto niente'))+
      (p.bozzaAttesa? ' · <span class="muted">'+t('aspetto che il telefono riceva la modifica fatta qui')+'</span>' : '')+
      '<br><span class="muted">'+t('I valori fatti arrivano da soli; quando hai finito la settimana premi «💾 Salva nello Storico».')+'</span>';
  else if(p.chiusa) s=t('🔗 Telefono collegato · ultima settimana salvata nello Storico il')+' '+esc(telOra(p.chiusa.quando))+'. '+t('Prepara la scheda nuova e premi «🔗 Manda al telefono».');
  else s=t('🔗 Telefono collegato · nessuna scheda mandata. Prepara la scheda e premi «🔗 Manda al telefono».');
  return `<div class="tel-riga no-print" id="tel-riga"><span>${s}</span><button class="btn btn--sm" id="tel-manda">${t('🔗 Manda al telefono')}</button></div>`;
}
function telAggiornaVista(){
  const r=document.getElementById('tel-riga');
  if(r){ const tmp=document.createElement('div'); tmp.innerHTML=telRigaPesi(); const nuovo=tmp.firstElementChild; if(nuovo){ r.replaceWith(nuovo); telAggancia(); } }
  const s=document.getElementById('imp-tel-stato'); if(s) s.innerHTML=telTestoStato();
}
function telAggancia(){ const b=document.getElementById('tel-manda'); if(b) b.onclick=()=>telMandaScheda(); }

/* ── ⚙ Impostazioni › Telefono collegato ── */
function telTestoStato(){
  const p=telProf();
  if(!p) return t('Il profilo attivo non è collegato.');
  const pz=[];
  if(telAperta(p)) pz.push(t('settimana mandata il')+' '+giornoPesata(p.esportata)+((+p.rev>1)?' ('+t('aggiornata')+' '+(p.rev-1)+'×)':''));
  else if(p.chiusa) pz.push(t('ultima settimana salvata il')+' '+telOra(p.chiusa.quando));
  if(p.ultimaBozza) pz.push(t('ultimo dal telefono')+' '+telOra(p.ultimaBozza));
  if((p.ricevute||[]).length) pz.push((p.ricevute||[]).length+' '+t('pesate e foto ricevute'));
  if(_telUltimoGiro) pz.push(t('controllato alle')+' '+_telUltimoGiro.toLocaleTimeString(LANG==='en'?'en-GB':'it-IT',{hour:'2-digit',minute:'2-digit'}));
  if(_telErr) pz.push('⚠ '+_telErr);
  return '✔ '+t('Collegato')+(pz.length?' · '+esc(pz.join(' · ')):'');
}
function telSezioneImpostazioni(cartella){
  if(!telDisponibile()) return '';
  const st=telStato(), p=telProf(), nome=esc(profNome());
  return `<div class="imp-sez" id="imp-tel">
      <h4>${t('🔗 Telefono collegato')}</h4>
      <div class="lat-nota" style="margin:0 0 8px">${t('Il TMS e l\'app TMS Scheda del telefono si scambiano scheda, allenamento, pesate e foto attraverso una cartella condivisa (Google Drive per desktop qui, un\'app di sincronizzazione sul telefono). I file sono cifrati col codice qui sotto: Google vede solo file illeggibili.')}</div>
      <div class="imp-riga"><span>${t('Cartella condivisa')}</span><span class="gruppo"><button class="btn btn--sm" id="imp-tel-cartella">📁 ${cartella?t('Cambia…'):t('Scegli…')}</button>${cartella?`<button class="btn btn--sm" id="imp-tel-scollega">${t('Scollega')}</button>`:''}</span></div>
      <div class="lat-nota imp-tel-percorso">${cartella?esc(cartella):t('Nessuna cartella scelta (di solito «My Drive\\6 - TMS»).')}</div>
      ${cartella?`<div class="imp-riga"><span>${t('Codice di collegamento')}</span><span class="gruppo">${st.codice?`<code class="tel-codice" id="imp-tel-codice">${esc(telCodiceBello(st.codice))}</code><button class="btn btn--sm" id="imp-tel-copia">${t('Copia')}</button><button class="btn btn--sm" id="imp-tel-nuovo">${t('Nuovo codice')}</button>`:`<button class="btn btn--sm btn--ember" id="imp-tel-nuovo">${t('Crea il codice')}</button>`}</span></div>
      ${st.codice?`<div class="lat-nota">${t('Sul telefono: TMS Scheda › ⚙ Collegamento e promemoria › scegli la cartella sincronizzata con questa e scrivi il codice. Si fa una volta sola.')}</div>
      <div class="imp-riga"><span>${t('Profilo')} «${nome}»</span><span class="gruppo">${p?`<button class="btn btn--sm" id="imp-tel-togli">${t('Scollega il profilo')}</button>`:`<button class="btn btn--sm btn--ember" id="imp-tel-prof">${t('Collega questo profilo')}</button>`}</span></div>
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
    st.codice=telNuovoCodice(); _telChiave=null; telSalva();
    for(const slug of Object.keys(st.profili)) if(slug===activeProfile) await telScriviStato(slug, st.profili[slug]);
  });
  su('imp-tel-copia', async()=>{ try{ await navigator.clipboard.writeText(telCodiceBello(telStato().codice)); telNotizia(t('Codice copiato.')); }catch(e){} });
  su('imp-tel-prof', async()=>{ const st=telStato(); st.profili[activeProfile]=st.profili[activeProfile]||{ricevute:[]}; telSalva();
    await telScriviStato(activeProfile, st.profili[activeProfile]); if(curTab==='allenamento') renderAllenamento(); });
  su('imp-tel-togli', async()=>{ if(!await conferma(t('Il telefono non riceve più la scheda di questo profilo e quello che manda non viene più importato. Continuo?'))) return;
    delete telStato().profili[activeProfile]; telSalva(); if(curTab==='allenamento') renderAllenamento(); });
}
/* scorciatoia dal pulsante «🔗 Manda al telefono» quando manca qualcosa */
async function telImpostaModal(){ await impostazioniModal(); const s=document.getElementById('imp-tel'); if(s&&s.scrollIntoView) try{ s.scrollIntoView({block:'center'}); }catch(e){} }
