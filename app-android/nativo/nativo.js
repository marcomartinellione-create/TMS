/* ════ TMS Scheda (APK) — strato nativo della pagina ════
   L'APK contiene una COPIA della PWA di docs/app/ (stesse funzioni, stesso codice): questo file
   si carica subito DOPO il suo script e cambia solo ciò che dentro un'app Android va fatto in
   un altro modo:
   · avvisi e conferme in stile app (mai le finestre di sistema): window.alert e tmsConferma,
     che scripts/prepara-www.js mette al posto dei confirm() della PWA;
   · foto progressi: si sceglie se scattarla (fotocamera dell'app con la sagoma) o prenderla dalla galleria;
   · tasto indietro del telefono (window.tmsIndietro, chiamata dal plugin);
   · bilancia Bluetooth: window.tmsBLE, il trasporto della pagina «⚖ Bilancia» della PWA;
   · cartella condivisa col TMS sul PC e aggiornamento dell'APK: window.tmsCartella (plugin TmsCartella);
   · promemoria della sera: window.tmsAvvisi (plugin LocalNotifications);
   · niente invito a installare (è già un'app) e link del sito nel browser.
   I dati restano dove li mette la PWA (localStorage e IndexedDB, dentro l'app). Dal 17/11/2026 la
   scheda arriva solo dalla cartella condivisa (scheda collegata): niente più file Scheda/Rientro. */
/* global TT, tt, esc, $, SCHEDA, navLivelli:writable, CVER, FOTO_LAB, fotoVistaAttesa,
   avvia, risali, chiudiVideo, mostraInstallHint, camApri, bilAggiornaMenu, colRender,
   avvRender, avvPianifica */
(function(){
'use strict';
const N=(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.TmsFile)||null;
const VERSIONE_APK=String(window.TMS_APK_VERSIONE||'');
const SITO='https://marcomartinellione-create.github.io/TMS/';

/* ── testi nuovi (la chiave è l'italiano, come nella PWA) ── */
Object.assign(TT.en,{
  'OK':'OK',
  'Scatta una foto':'Take a photo',
  'con la sagoma, sempre inquadrata uguale':'with the silhouette, always framed the same',
  'Senza il permesso della fotocamera non posso mostrare la sagoma: apro la fotocamera del telefono.':'Without camera permission I can’t show the silhouette: opening the phone’s camera.',
  'Scegli dalla galleria':'Choose from the gallery',
  'una foto che hai già':'a photo you already have',
  'le notifiche di TMS Scheda sono spente nelle impostazioni del telefono':'TMS Scheda notifications are turned off in the phone settings',
  'Promemoria':'Reminders',
  'Pesata della sera e foto del lunedì':'Evening weigh-in and Monday photos'
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

/* ── foto progressi: si chiede prima da dove prenderla. «Scatta» apre la fotocamera DENTRO l'app con
      la sagoma della vista (camApri, nella PWA), così le foto sono sempre inquadrate uguali; se la
      fotocamera non si apre (permesso negato) si ripiega su quella del telefono. La galleria resta
      com'era: poi lavora la PWA (rimpicciolisce e salva) ── */
{ const ff=$('foto-file'); let libero=false;
  if(ff) ff.addEventListener('click',e=>{
    if(libero){ libero=false; return; }
    e.preventDefault();
    const voce=(ic,t1,t2)=>'<span class="ic">'+ic+'</span><span>'+esc(t1)+'<small>'+esc(t2)+'</small></span>';
    finestra('<h3 style="margin:2px 0 4px;color:#9a5b1f;text-align:center">'+esc(tt(FOTO_LAB[fotoVistaAttesa]||'Foto progressi'))+'</h3>',[
      {cls:'dove-btn',html:voce('📷',tt('Scatta una foto'),tt('con la sagoma, sempre inquadrata uguale')),valore:'camera'},
      {cls:'dove-btn',html:voce('🖼',tt('Scegli dalla galleria'),tt('una foto che hai già')),valore:'galleria'},
      {cls:'btn-lite',html:esc(tt('Annulla')),valore:null}],null)
    .then(async via=>{ if(!via) return;
      if(via==='camera' && typeof window.camApri==='function'){
        let aperta=false; try{ aperta=await window.camApri(fotoVistaAttesa); }catch(e2){ aperta=false; }
        if(aperta) return;
        tmsAvviso(tt('Senza il permesso della fotocamera non posso mostrare la sagoma: apro la fotocamera del telefono.')); }
      if(via==='camera') ff.setAttribute('capture','environment'); else ff.removeAttribute('capture');
      libero=true; ff.click(); });
  }); }

/* ── avvio: la PWA legge la scheda salvata e chiama avvia(); chi tocca un promemoria aspetta
      quel momento per aprire la pagina giusta ── */
let prontoOk; const pronto=new Promise(r=>{ prontoOk=r; });
{ const avviaPWA=avvia;
  window.avvia=function(){ const r=avviaPWA.apply(this,arguments); prontoOk(); return r; };
  if(!$('benvenuto').hidden || !$('menu').hidden) prontoOk(); }   /* avvio già avvenuto */

/* ── quale Android è (serve alla bilancia: fino ad Android 11 vuole la posizione accesa) ── */
let INFO={sdk:34};
if(N){ N.info().then(i=>{ if(i) INFO=i; }).catch(()=>{}); }

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

/* ── CARTELLA CONDIVISA col TMS sul PC (plugin TmsCartella): il TRASPORTO del «🔗 Collegamento»
      della PWA, che fa tutto il resto (cifratura, scheda, bozza, pesate, foto). La cartella si
      sceglie una volta; il suo indirizzo (con il permesso persistente di Android) resta qui. ── */
const CART=(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.TmsCartella)||null;
if(CART){
  const K='tms-col-cartella';
  const conf=()=>{ try{ return JSON.parse(localStorage.getItem(K)||'{}')||{}; }catch(e){ return {}; } };
  const uri=()=>conf().uri||'';
  window.tmsCartella={
    pronta(){ return !!uri(); },
    nome(){ return conf().nome||''; },
    async scegli(){ const r=await CART.scegli(); if(!r||!r.uri) return null;
      localStorage.setItem(K, JSON.stringify({uri:r.uri, nome:r.nome||''})); return {nome:r.nome||''}; },
    dimentica(){ try{ localStorage.removeItem(K); }catch(e){} },
    async leggi(percorso){ const r=await CART.leggi({uri:uri(), percorso:percorso}); return (r&&typeof r.data==='string')? r.data : null; },
    async scrivi(percorso, testo){ await CART.scrivi({uri:uri(), percorso:percorso, data:String(testo)}); },
    async elenca(cartella){ const r=await CART.elenca({uri:uri(), cartella:cartella||''}); return (r&&Array.isArray(r.voci))? r.voci : []; },
    installaApk(percorso, sha256){ return CART.installaApk({uri:uri(), percorso:percorso, sha256:sha256||''}); }
  };
  try{ colRender(); }catch(e){}
}

/* ── 🔔 PROMEMORIA (@capacitor/local-notifications): il TRASPORTO dei promemoria della PWA, che
      decide quando (ogni sera la pesata, il lunedì anche le foto). Niente sveglie «esatte»: Android
      li fa suonare all'ora giusta o pochi minuti dopo. Toccandone uno si apre la pagina giusta. ── */
const LN=(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.LocalNotifications)||null;
if(LN){
  let canale=false;
  window.tmsAvvisi={
    async permesso(chiedi){ let p=await LN.checkPermissions();
      if((!p||p.display!=='granted') && chiedi) p=await LN.requestPermissions();
      return !!(p && p.display==='granted'); },
    async pianifica(lista){
      const pend=await LN.getPending();
      const nostri=((pend&&pend.notifications)||[]).filter(n=>+n.id>=7000 && +n.id<7100).map(n=>({id:+n.id}));
      if(nostri.length) await LN.cancel({notifications:nostri});
      if(!lista || !lista.length) return 0;
      if(!(await this.permesso(false))) throw new Error(tt('le notifiche di TMS Scheda sono spente nelle impostazioni del telefono'));
      if(!canale){ try{ await LN.createChannel({id:'promemoria', name:tt('Promemoria'), description:tt('Pesata della sera e foto del lunedì'), importance:4, visibility:1, vibration:true}); }catch(e){} canale=true; }
      await LN.schedule({notifications:lista.map(x=>({id:x.id, title:x.titolo, body:x.testo, channelId:'promemoria',
        smallIcon:'ic_stat_tms', iconColor:'#9A5B1F', schedule:{at:x.at, allowWhileIdle:true}, extra:{pagina:x.pagina}}))});
      return lista.length;
    }
  };
  LN.addListener('localNotificationActionPerformed', ev=>{
    const pg=ev && ev.notification && ev.notification.extra && ev.notification.extra.pagina;
    pronto.then(()=>{ try{ window.apriDaAvviso(pg); }catch(e){} }); });
  try{ avvRender(); avvPianifica(); colRender(); }catch(e){}
}

/* ── tasto INDIETRO del telefono (lo chiama il plugin): true = gestito qui, false = Android
      fa il suo (al menu chiude l'app). Stesso percorso della PWA: prima i riquadri aperti,
      poi si risale di una schermata ── */
window.tmsIndietro=function(){
  if(DLG){ DLG.chiudi(DLG.annulla); return true; }
  try{ if(document.fullscreenElement){ document.exitFullscreen(); return true; } }catch(e){}
  const aperto=id=>{ const o=$(id); return !!o && o.style.display==='flex'; };
  if(aperto('vov')||aperto('qrov')){ risali(); return true; }
  if(navLivelli>0){ history.back(); return true; }
  return !!risali();
};
})();
