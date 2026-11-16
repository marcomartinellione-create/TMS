/* ════ TMS Scheda (APK) — strato nativo della pagina ════
   L'APK contiene una COPIA della PWA di docs/app/ (stesse funzioni, stesso codice): questo file
   si carica subito DOPO il suo script e cambia solo ciò che dentro un'app Android va fatto in
   un altro modo:
   · avvisi e conferme in stile app (mai le finestre di sistema): window.alert e tmsConferma,
     che scripts/prepara-www.js mette al posto dei confirm() della PWA;
   · file in arrivo con «Apri con» / «Condividi» da WhatsApp, email, File… (plugin TmsFile);
   · «Carica la scheda»: il selettore mostra tutti i file (il controllo lo fa già la PWA);
   · foto progressi: si sceglie se scattarla o prenderla dalla galleria;
   · rientro per il coach: condividi, scegli la cartella, Download, fatti da Android;
   · tasto indietro del telefono (window.tmsIndietro, chiamata dal plugin);
   · bilancia Bluetooth: window.tmsBLE, il trasporto della pagina «⚖ Bilancia» della PWA;
   · niente invito a installare (è già un'app) e link del sito nel browser.
   I dati restano dove li mette la PWA (localStorage e IndexedDB, dentro l'app): stesse chiavi,
   stesso formato del rientro. */
/* global TT, tt, esc, $, SCHEDA, navLivelli:writable, CVER, FOTO_LAB, fotoVistaAttesa,
   avvia, caricaFile, risali, chiudiDove, chiudiVideo, mostraInstallHint, bilAggiornaMenu */
(function(){
'use strict';
const N=(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.TmsFile)||null;
const VERSIONE_APK=String(window.TMS_APK_VERSIONE||'');
const SITO='https://marcomartinellione-create.github.io/TMS/';

/* ── testi nuovi (la chiave è l'italiano, come nella PWA) ── */
Object.assign(TT.en,{
  'OK':'OK',
  'Scatta una foto':'Take a photo',
  'con la fotocamera del telefono':'with the phone’s camera',
  'Scegli dalla galleria':'Choose from the gallery',
  'una foto che hai già':'a photo you already have',
  'Non riesco ad aprire questo file:':'I can’t open this file:',
  'Oppure tocca il file <b>Scheda_….json</b> in WhatsApp, nell’email o in File e scegli <b>«Apri con TMS Scheda»</b>.':'Or tap the <b>Scheda_….json</b> file in WhatsApp, in the email or in Files and choose <b>«Open with TMS Scheda»</b>.'
});

/* ── finestre in stile app: una alla volta, si chiudono anche toccando fuori o col tasto indietro ── */
{ const st=document.createElement('style');
  st.textContent='.tms-dlg{position:fixed;inset:0;background:rgba(20,10,2,.82);display:flex;align-items:center;justify-content:center;z-index:30;padding:16px}'+
    '.tms-dlg-box{max-width:440px}'+
    '.tms-dlg-msg{font-size:15px;line-height:1.45;color:#2b1d10;margin:4px 2px 10px;word-break:break-word}'+
    '.tms-dlg-az{display:flex;flex-wrap:wrap;gap:0 9px}'+
    '.tms-dlg-az>button{flex:1 1 0;margin:6px 0 0}'+
    '.tms-dlg-az>.dove-btn{flex:1 1 100%;margin:0 0 9px}';
  document.head.appendChild(st); }
let DLG=null;
function finestra(corpoHtml, bottoni, valoreAnnulla){
  return new Promise(res=>{
    if(DLG) DLG.chiudi(DLG.annulla);      /* ne resta una sola: la precedente vale come annullata */
    const ov=document.createElement('div'); ov.className='tms-dlg';
    ov.innerHTML='<div class="qr-panel tms-dlg-box" role="dialog" aria-modal="true"><div class="tms-dlg-msg"></div><div class="tms-dlg-az"></div></div>';
    ov.querySelector('.tms-dlg-msg').innerHTML=corpoHtml;
    const az=ov.querySelector('.tms-dlg-az');
    const d={annulla:valoreAnnulla, chiudi(v){ if(DLG!==d) return; DLG=null; ov.remove(); res(v); }};
    bottoni.forEach(b=>{ const el=document.createElement('button'); el.type='button'; el.className=b.cls;
      el.innerHTML=b.html; el.onclick=()=>d.chiudi(b.valore); az.appendChild(el); });
    ov.onclick=e=>{ if(e.target===ov) d.chiudi(valoreAnnulla); };
    DLG=d; document.body.appendChild(ov);
  });
}
const testoHtml=m=>esc(m==null?'':String(m)).replace(/\n/g,'<br>');
function tmsAvviso(m){ return finestra(testoHtml(m),[{cls:'btn-big',html:esc(tt('OK')),valore:true}],true); }
function tmsConferma(m){ return finestra(testoHtml(m),[
  {cls:'btn-lite',html:esc(tt('Annulla')),valore:false},
  {cls:'btn-big',html:esc(tt('OK')),valore:true}],false); }
window.tmsAvviso=tmsAvviso;
window.tmsConferma=tmsConferma;
window.alert=m=>{ tmsAvviso(m); };

/* ── è già un'app: niente invito a installarla; il link del sito si apre nel browser ── */
window.isStandalone=()=>true;
try{ mostraInstallHint(); }catch(e){}
{ const a=document.querySelector('footer a'); if(a){ a.href=SITO; a.target='_blank'; a.rel='noopener'; }
  const v=$('cver'); if(v&&VERSIONE_APK) v.textContent='v'+CVER+' · APK '+VERSIONE_APK; }

/* ── «Carica la scheda»: si vedono tutti i file. Con il filtro «solo .json» Android nasconde
      i file che WhatsApp o l'email salvano con un tipo generico; se il file non è una
      scheda lo dice già la PWA. ── */
['file-scheda','file-scheda-2'].forEach(id=>{ const inp=$(id); if(inp) inp.removeAttribute('accept'); });
{ const lab=document.querySelector('#benvenuto label.btn-big');
  if(lab){ const p=document.createElement('div'); p.className='fine'; p.style.margin='2px 0 4px';
    p.innerHTML=tt('Oppure tocca il file <b>Scheda_….json</b> in WhatsApp, nell’email o in File e scegli <b>«Apri con TMS Scheda»</b>.');
    lab.insertAdjacentElement('afterend',p); } }

/* ── foto progressi: Android non offre la fotocamera nel selettore dei file, quindi si chiede
      prima da dove prenderla; poi lavora la PWA come sempre (rimpicciolisce e salva) ── */
{ const ff=$('foto-file'); let libero=false;
  if(ff) ff.addEventListener('click',e=>{
    if(libero){ libero=false; return; }
    e.preventDefault();
    const voce=(ic,t1,t2)=>'<span class="ic">'+ic+'</span><span>'+esc(t1)+'<small>'+esc(t2)+'</small></span>';
    finestra('<h3 style="margin:2px 0 4px;color:#9a5b1f;text-align:center">'+esc(tt(FOTO_LAB[fotoVistaAttesa]||'Foto progressi'))+'</h3>',[
      {cls:'dove-btn',html:voce('📷',tt('Scatta una foto'),tt('con la fotocamera del telefono')),valore:'camera'},
      {cls:'dove-btn',html:voce('🖼',tt('Scegli dalla galleria'),tt('una foto che hai già')),valore:'galleria'},
      {cls:'btn-lite',html:esc(tt('Annulla')),valore:null}],null)
    .then(via=>{ if(!via) return;
      if(via==='camera') ff.setAttribute('capture','environment'); else ff.removeAttribute('capture');
      libero=true; ff.click(); });
  }); }

/* ── avvio: la PWA legge la scheda salvata e chiama avvia(); i file in arrivo aspettano quel
      momento, così la domanda «la sostituisco?» vede la scheda che c'è già ── */
let prontoOk; const pronto=new Promise(r=>{ prontoOk=r; });
{ const avviaPWA=avvia;
  window.avvia=function(){ const r=avviaPWA.apply(this,arguments); prontoOk(); return r; };
  if(!$('benvenuto').hidden || !$('menu').hidden) prontoOk(); }   /* avvio già avvenuto */

function srcFile(percorso){ const C=window.Capacitor;
  return (C&&typeof C.convertFileSrc==='function')? C.convertFileSrc(percorso) : percorso; }
function chiudiRiquadri(){
  try{ const v=$('vov'); if(v&&v.style.display==='flex') chiudiVideo(); }catch(e){}
  const q=$('qrov'); if(q) q.style.display='none';
  try{ chiudiDove(); }catch(e){}
}
async function apriFileRicevuto(ev){
  await pronto;
  if(!ev || ev.errore || !ev.percorso){ tmsAvviso(tt('Non riesco ad aprire questo file:')+' '+((ev&&ev.errore)||'?')); return; }
  let file;
  try{ const r=await fetch(srcFile(ev.percorso)); if(!r.ok) throw new Error('HTTP '+r.status);
    file=new File([await r.blob()], ev.nome||'Scheda.json', {type:'application/json'}); }
  catch(e){ tmsAvviso(tt('Non riesco ad aprire questo file:')+' '+((e&&e.message)||e)); return; }
  chiudiRiquadri();
  const prima=SCHEDA;
  await caricaFile(file);
  if(SCHEDA!==prima) navLivelli=0;   /* scheda nuova: si riparte dal menu */
}
if(N) N.addListener('fileRicevuto', ev=>{ apriFileRicevuto(ev); });

/* ── rientro per il coach: le stesse tre strade della PWA, fatte da Android ── */
let INFO={download:true};
if(N){ N.info().then(i=>{ if(i) INFO=i; }).catch(()=>{});
  window.stradeSalvataggio=function(){ const v=['condividi','cartella']; if(INFO.download!==false) v.push('download'); return v; };
  window.salvaRientroCome=async function(via, nome, testo){
    chiudiDove();
    try{
      if(via==='condividi'){ await N.condividi({nome:nome, testo:testo, titolo:tt('Invia o salva con…')}); return true; }
      if(via==='cartella'){ const r=await N.salvaInCartella({nome:nome, testo:testo});
        tmsAvviso(tt('File salvato:')+' '+((r&&r.nome)||nome)); return true; }
      const r=await N.salvaInDownload({nome:nome, testo:testo});
      tmsAvviso(tt('File creato:')+' '+((r&&r.nome)||nome)+'\n'+tt('Lo trovi nei Download — rimandalo al tuo coach.'));
      return true;
    }catch(e){
      if(e && (e.code==='ANNULLATO' || e.message==='annullato')) return false;   /* annullato dal cliente: nessun messaggio */
      tmsAvviso(tt('Salvataggio non riuscito:')+' '+((e&&e.message)||e)); return false;
    }
  };
}

/* ── BILANCIA Bluetooth: il TRASPORTO per la pagina «⚖ Bilancia» della PWA (che fa tutto il
      resto: messaggi della bilancia, formula, pesate). Plugin @capacitor-community/bluetooth-le
      chiamato direttamente (niente bundler): i dati viaggiano come testo esadecimale «00 a2 …»,
      gli eventi si chiamano 'onScanResult', 'disconnected|<id>', 'notification|<id>|<serv>|<car>'.
      Su Android 12 e più recenti si chiede solo «Dispositivi nelle vicinanze», mai la posizione
      (androidNeverForLocation + flag nel manifest, scripts/patch-android.js); fino ad Android 11
      Android pretende la posizione per cercare dispositivi Bluetooth. ── */
const BLE=(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.BluetoothLe)||null;
if(BLE){
  const SERV='0000ffb0-0000-1000-8000-00805f9b34fb';
  const CAR=c=>'0000'+c+'-0000-1000-8000-00805f9b34fb';
  const inHex=bytes=>bytes.map(n=>('0'+((n&255).toString(16))).slice(-2)).join(' ');
  const daHex=s=>{ const h=String(s||'').replace(/[^0-9a-f]/gi,''), out=[];
    for(let i=0;i+1<h.length;i+=2) out.push(parseInt(h.slice(i,i+2),16)); return out; };
  const togli=a=>{ try{ if(a&&a.remove) a.remove(); }catch(e){} };
  let ascoltoScan=null, ascolti=[];
  window.tmsBLE={
    async prepara(){
      try{ await BLE.initialize({androidNeverForLocation:true}); }
      catch(e){ return {ok:false, motivo:'permesso', msg:(e&&e.message)||String(e)}; }
      try{ let r=await BLE.isEnabled();
        if(!r||!r.value){ try{ await BLE.requestEnable(); }catch(e){} r=await BLE.isEnabled(); }
        if(!r||!r.value) return {ok:false, motivo:'spento'}; }catch(e){}
      if((+INFO.sdk||34)<31){ try{ const l=await BLE.isLocationEnabled(); if(l&&l.value===false) return {ok:false, motivo:'posizione'}; }catch(e){} }
      return {ok:true};
    },
    async cerca(filtro, trovato){
      await this.fermaRicerca();
      ascoltoScan=await BLE.addListener('onScanResult', r=>{
        const d=(r&&r.device)||{}, disp={id:d.deviceId||'', nome:d.name||(r&&r.localName)||''};
        if(disp.id && filtro(disp)) trovato(disp); });
      await BLE.requestLEScan({allowDuplicates:false});
    },
    async fermaRicerca(){ togli(ascoltoScan); ascoltoScan=null; try{ await BLE.stopLEScan(); }catch(e){} },
    async collega(id, cb){
      ascolti.forEach(togli); ascolti=[];
      ascolti.push(await BLE.addListener('disconnected|'+id, ()=>{ ascolti.forEach(togli); ascolti=[]; if(cb.onStaccato) cb.onStaccato(); }));
      await BLE.connect({deviceId:id, timeout:10000});
      for(const c of ['ffb2','ffb3']){
        ascolti.push(await BLE.addListener('notification|'+id+'|'+SERV+'|'+CAR(c), ev=>{ if(cb.onDati) cb.onDati(c, daHex(ev&&ev.value)); }));
        await BLE.startNotifications({deviceId:id, service:SERV, characteristic:CAR(c)});
      }
    },
    scrivi(id, c, bytes){ return BLE.write({deviceId:id, service:SERV, characteristic:CAR(c), value:inHex(bytes)}); },
    async stacca(id){ const a=ascolti; ascolti=[]; a.forEach(togli); try{ await BLE.disconnect({deviceId:id}); }catch(e){} }
  };
  try{ bilAggiornaMenu(); }catch(e){}     /* la voce «⚖ Bilancia» del menu compare solo adesso */
}

/* ── tasto INDIETRO del telefono (lo chiama il plugin): true = gestito qui, false = Android
      fa il suo (al menu chiude l'app). Stesso percorso della PWA: prima i riquadri aperti,
      poi si risale di una schermata ── */
window.tmsIndietro=function(){
  if(DLG){ DLG.chiudi(DLG.annulla); return true; }
  try{ if(document.fullscreenElement){ document.exitFullscreen(); return true; } }catch(e){}
  const aperto=id=>{ const o=$(id); return !!o && o.style.display==='flex'; };
  if(aperto('vov')||aperto('qrov')||aperto('doveov')){ risali(); return true; }
  if(navLivelli>0){ history.back(); return true; }
  return !!risali();
};
})();
