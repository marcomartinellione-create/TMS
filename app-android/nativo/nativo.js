/* ════ TMS Scheda (APK) — strato nativo della pagina ════
   L'APK contiene una COPIA della pagina di app-android/web/ (stesse funzioni, stesso codice): questo file
   si carica subito DOPO il suo script e cambia solo ciò che dentro un'app Android va fatto in
   un altro modo:
   · avvisi e conferme in stile app (mai le finestre di sistema): window.alert e tmsConferma,
     che scripts/prepara-www.js mette al posto dei confirm() della PWA;
   · foto progressi: si sceglie se scattarla (fotocamera dell'app con la sagoma) o prenderla dalla galleria;
   · tasto indietro del telefono (window.tmsIndietro, chiamata dal plugin);
   · Bluetooth: window.tmsBLE, il trasporto generico delle pagine «⚖ Bilancia» e «Fascia cardio» della PWA;
   · aggiornamento dell'APK da GitHub: window.tmsAggiorna (plugin TmsCartella, che dal 24/11/2026 serve
     solo a questo: la scheda col PC del personal passa dall'hub del TMS, con fetch, nella pagina);
   · promemoria della sera e fine del recupero: window.tmsAvvisi (plugin LocalNotifications);
   · niente invito a installare (è già un'app) e link del sito nel browser.
   I dati restano dove li mette la PWA (localStorage e IndexedDB, dentro l'app). La scheda collegata
   passa dall'hub del TMS (dal 24/11/2026; prima da una cartella di Google Drive). */
/* global TT, tt, esc, $, SCHEDA, navLivelli:writable, CVER, FOTO_LAB, fotoVistaAttesa, scanAperta, scanChiudi, qrAperto, qrChiudi,
   avvia, risali, chiudiVideo, mostraInstallHint, camApri, bilAggiornaMenu, fcAggiornaMenu, colRender,
   avvRender, avvPianifica, natAggiorna, sempreRender, natSempreAvvio, ZP */
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
  'Pesata della sera, foto del lunedì e dieta':'Evening weigh-in, Monday photos and diet',
  'Timer di recupero':'Rest timer',
  'Avvisa quando il recupero è finito':'Tells you when the rest is over'
});

/* ── finestre in stile app: una alla volta, si chiudono anche toccando fuori o col tasto indietro ── */
{ const st=document.createElement('style');
  st.textContent='.tms-dlg{position:fixed;inset:0;background:rgba(20,10,2,.6);display:flex;align-items:center;justify-content:center;z-index:30;padding:20px}'+
    '.tms-dlg-box{max-width:440px}'+
    '.tms-dlg-msg{font-size:16px;line-height:1.5;color:var(--ink,#1c1208);margin:2px 2px 14px;word-break:break-word}'+
    '.tms-dlg-titolo{margin:0 0 4px;font-family:var(--serif,Georgia,serif);font-size:19px;color:var(--ink,#1c1208);text-align:center}'+
    '.tms-dlg-az{display:flex;flex-wrap:wrap;gap:0 10px}'+
    '.tms-dlg-az>button{flex:1 1 0;margin:4px 0 0}'+
    '.tms-dlg-az>.dove-btn{flex:1 1 100%;margin:0 0 10px}'+
    '.tms-dlg-az>.dove-btn+.btn-lite{margin-top:2px}';
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
    const voce=(ic,t1,t2)=>'<span class="icbox">'+ico(ic)+'</span><span>'+esc(t1)+'<small>'+esc(t2)+'</small></span>';
    finestra('<h3 class="tms-dlg-titolo">'+esc(tt(FOTO_LAB[fotoVistaAttesa]||'Foto progressi'))+'</h3>',[
      {cls:'dove-btn',html:voce('camera',tt('Scatta una foto'),tt('con la sagoma, sempre inquadrata uguale')),valore:'camera'},
      {cls:'dove-btn',html:voce('immagine',tt('Scegli dalla galleria'),tt('una foto che hai già')),valore:'galleria'},
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

/* ── BLUETOOTH: il TRASPORTO generico per le pagine «⚖ Bilancia» e «Fascia cardio» della PWA (che fa
      tutto il resto: messaggi dei sensori, formule, pesate, sedute). Plugin @capacitor-community/bluetooth-le
      chiamato direttamente (niente bundler): i dati viaggiano come testo esadecimale «00 a2 …»,
      gli eventi si chiamano 'onScanResult', 'disconnected|<id>', 'notification|<id>|<serv>|<car>'.
      Servizio e caratteristiche li passa la pagina (forma breve «ffb0», «180d», o UUID intero);
      senza, valgono quelli della bilancia. Gli ascolti sono tenuti PER DISPOSITIVO: la fascia
      cardio resta collegata mentre si apre la bilancia.
      Su Android 12 e più recenti si chiede solo «Dispositivi nelle vicinanze», mai la posizione
      (androidNeverForLocation + flag nel manifest, scripts/patch-android.js); fino ad Android 11
      Android pretende la posizione per cercare dispositivi Bluetooth. ── */
const BLE=(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.BluetoothLe)||null;
if(BLE){
  const UUID=c=>{ const s=String(c||'').toLowerCase(); return /^[0-9a-f]{4}$/.test(s)? '0000'+s+'-0000-1000-8000-00805f9b34fb' : s; };
  const BREVE=u=>{ const m=/^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/.exec(String(u||'').toLowerCase()); return m? m[1] : String(u||'').toLowerCase(); };
  const BIL={servizio:'ffb0', notifiche:['ffb2','ffb3']};   /* la bilancia, se la pagina non dice altro */
  const inHex=bytes=>bytes.map(n=>('0'+((n&255).toString(16))).slice(-2)).join(' ');
  const daHex=s=>{ const h=String(s||'').replace(/[^0-9a-f]/gi,''), out=[];
    for(let i=0;i+1<h.length;i+=2) out.push(parseInt(h.slice(i,i+2),16)); return out; };
  const togli=a=>{ try{ if(a&&a.remove) a.remove(); }catch(e){} };
  let ascoltoScan=null;
  const ascolti={};   /* id del dispositivo → ascolti di quel collegamento */
  const via=id=>{ (ascolti[id]||[]).forEach(togli); delete ascolti[id]; };
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
    /* filtro(disp) sceglie, trovato(disp) riceve: disp = {id, nome, servizi:['180d',…] (forma breve), rssi} */
    async cerca(filtro, trovato){
      await this.fermaRicerca();
      ascoltoScan=await BLE.addListener('onScanResult', r=>{
        const d=(r&&r.device)||{}, disp={id:d.deviceId||'', nome:d.name||(r&&r.localName)||'',
          servizi:((r&&r.uuids)||[]).map(BREVE), rssi:(r&&r.rssi!=null)? +r.rssi : null};
        if(disp.id && filtro(disp)) trovato(disp); });
      await BLE.requestLEScan({allowDuplicates:false});
    },
    async fermaRicerca(){ togli(ascoltoScan); ascoltoScan=null; try{ await BLE.stopLEScan(); }catch(e){} },
    /* opz = {servizio, notifiche:[caratteristiche]}; cb.onDati(caratteristica in forma breve, byte) */
    async collega(id, cb, opz){
      const o=opz||BIL, serv=UUID(o.servizio);
      via(id); const lista=ascolti[id]=[];
      lista.push(await BLE.addListener('disconnected|'+id, ()=>{ via(id); if(cb.onStaccato) cb.onStaccato(); }));
      await BLE.connect({deviceId:id, timeout:10000});
      try{
        for(const c of (o.notifiche||[])){
          const nome=BREVE(UUID(c));
          lista.push(await BLE.addListener('notification|'+id+'|'+serv+'|'+UUID(c), ev=>{ if(cb.onDati) cb.onDati(nome, daHex(ev&&ev.value)); }));
          await BLE.startNotifications({deviceId:id, service:serv, characteristic:UUID(c)});
        }
      }catch(e){   /* il dispositivo rifiuta (per esempio vuole l'abbinamento): si stacca e lo si dice alla pagina */
        via(id); try{ await BLE.disconnect({deviceId:id}); }catch(e2){}
        const err=new Error((e&&e.message)||String(e)); err.motivo='notifiche'; throw err; }
    },
    /* senzaRisposta: scrittura «senza risposta» (Write Command), come fanno Zepp, unstrap e Gadgetbridge sul canale
       del bracciale Zepp OS; se la caratteristica non la accetta si riprova con la scrittura normale */
    async scrivi(id, c, bytes, servizio, senzaRisposta){
      const o={deviceId:id, service:UUID(servizio||BIL.servizio), characteristic:UUID(c), value:inHex(bytes)};
      if(senzaRisposta && BLE.writeWithoutResponse){ try{ return await BLE.writeWithoutResponse(o); }catch(e){} }
      return BLE.write(o); },
    /* lettura di una caratteristica (per esempio il firmware del bracciale, 180A/2A26): restituisce i byte */
    async leggi(id, servizio, c){ const r=await BLE.read({deviceId:id, service:UUID(servizio), characteristic:UUID(c)}); return daHex(r && r.value); },
    async stacca(id){ via(id); try{ await BLE.disconnect({deviceId:id}); }catch(e){} }
  };
  try{ bilAggiornaMenu(); }catch(e){}     /* le voci «⚖ Bilancia» e «Fascia cardio» del menu compaiono solo adesso */
  try{ fcAggiornaMenu(); }catch(e){}
}

/* ── ⬆ AGGIORNAMENTO dell'app (plugin TmsCartella: dal 24/11/2026 serve solo a questo; la scheda col PC
      del personal passa dall'hub del TMS, nella pagina) ── */
const CART=(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.TmsCartella)||null;
if(CART){
  /* ── ⬆ AGGIORNAMENTO dell'app (dal 18/11/2026 da GitHub, non più dalla cartella): il plugin scarica l'APK
        dall'indirizzo della release (solo github.com/marcomartinellione-create/TMS, redirect compresi),
        controlla l'impronta SHA-256 e lo passa all'installer di Android. Non serve la cartella. ── */
  window.tmsAggiorna={
    scarica(url, sha256){ return CART.scaricaApk({url:String(url||''), sha256:String(sha256||'')}); }
  };
  try{ colRender(); }catch(e){}
}

/* ── 🏋 SEDUTA IN PRIMO PIANO, SEMPRE COLLEGATO e FINESTRA MOBILE (plugin TmsSeduta, TmsSedutaService,
      MainActivity): il servizio Android che tiene viva la seduta (notifica fissa, battiti a schermo spento) e,
      dalla 1.8.1, il collegamento col bracciale anche ad app chiusa, e il Picture-in-Picture. La pagina decide
      quando (natAggiorna, natSempre) e riceve gli eventi «pip» (window.tmsInPip), «sempre» (stato del
      collegamento, window.tmsSempreStato) e «sincronizza» (sono passati 30 minuti, window.tmsSincServizio).
      window.tmsPonte = il bracciale tenuto dal servizio (scrivi, leggi, notifiche; dati con l'evento «bleDati»). ── */
const SEDP=(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.TmsSeduta)||null;
if(SEDP){
  window.tmsSeduta={
    avvia:o=>SEDP.avvia(o), ferma:()=>SEDP.ferma(), campioni:o=>SEDP.campioni(o||{}),
    pip:a=>SEDP.pip({attivo:!!a}), batteria:()=>SEDP.batteria(), chiediBatteria:()=>SEDP.chiediBatteria(),
    sempre:o=>SEDP.sempre(o||{attivo:false}), stato:()=>SEDP.stato(), sincFatta:o=>SEDP.sincFatta(o||{}),
    /* GPS delle attività all'aperto (1.9.0): punti presi dal servizio, permesso della posizione */
    posizioni:o=>SEDP.posizioni(o||{}), permessoPosizione:()=>SEDP.permessoPosizione(),
    /* widget della giornata (1.10.0): i numeri al widget; aperta dal widget? (una volta sola) */
    widget:o=>SEDP.widget(o||{}), widgetAperto:()=>SEDP.widgetAperto()
  };
  const inHex=b=>Array.from(b||[]).map(n=>('0'+((n&255).toString(16))).slice(-2)).join(' ');
  const daHex=v=>{ const h=String(v||'').replace(/[^0-9a-f]/gi,''), o=[]; for(let i=0;i+1<h.length;i+=2) o.push(parseInt(h.slice(i,i+2),16)); return o; };
  let ascolto=null;
  window.tmsPonte={
    stato:()=>SEDP.bleStato(),
    notifiche:(serv, car, on)=>SEDP.bleNotifiche({servizio:serv, caratteristiche:car, on:!!on}),
    scrivi:(serv, car, b)=>SEDP.bleScrivi({servizio:serv, caratteristica:car, valore:inHex(b)}),
    leggi:(serv, car)=>SEDP.bleLeggi({servizio:serv, caratteristica:car}).then(r=>daHex(r && r.valore)),
    ascolta:cb=>{ ascolto=cb; }
  };
  try{ SEDP.addListener('bleDati', ev=>{ if(ascolto && ev) ascolto(String(ev.car||''), daHex(ev.valore)); }); }catch(e){}
  try{ SEDP.addListener('pip', ev=>{ try{ if(window.tmsInPip) window.tmsInPip(!!(ev && ev.attivo)); }catch(e){} }); }catch(e){}
  try{ SEDP.addListener('sempre', ev=>{ try{ if(window.tmsSempreStato) window.tmsSempreStato(ev||{}); }catch(e){} }); }catch(e){}
  try{ SEDP.addListener('sincronizza', ()=>{ try{ if(window.tmsSincServizio) window.tmsSincServizio(); }catch(e){} }); }catch(e){}
  try{ SEDP.addListener('widget', ()=>{ try{ if(window.tmsDaWidget) window.tmsDaWidget(); }catch(e){} }); }catch(e){}
  try{ natAggiorna(); }catch(e){}     /* una seduta già aperta all'avvio: servizio e finestra mobile subito */
  try{ sempreRender(); if(ZP.pronta) natSempreAvvio(); }catch(e){}   /* chiave già letta: il servizio subito */
}

/* ── 🔔 PROMEMORIA (@capacitor/local-notifications): il TRASPORTO dei promemoria della PWA, che
      decide quando (ogni sera la pesata e la dieta, il lunedì anche le foto), e la notifica di fine
      recupero del timer (id 7200), programmata quando l'app va in secondo piano. Le sveglie sono
      esatte (permesso USE_EXACT_ALARM, scripts/patch-android.js): il recupero finisce al secondo
      giusto. Toccandone una si apre la pagina giusta (quella del timer lascia dove si era). ── */
const LN=(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.LocalNotifications)||null;
if(LN){
  let canale=false, canaleRec=false;
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
      if(!canale){ try{ await LN.createChannel({id:'promemoria', name:tt('Promemoria'), description:tt('Pesata della sera, foto del lunedì e dieta'), importance:4, visibility:1, vibration:true}); }catch(e){} canale=true; }
      await LN.schedule({notifications:lista.map(x=>({id:x.id, title:x.titolo, body:x.testo, channelId:'promemoria',
        smallIcon:'ic_stat_tms', iconColor:'#9A5B1F', schedule:{at:x.at, allowWhileIdle:true}, extra:{pagina:x.pagina}}))});
      return lista.length;
    },
    /* fine del recupero: una sola notifica alla volta (id 7200), suono e vibrazione */
    async recupero(at, titolo, testo){
      try{ await LN.cancel({notifications:[{id:7200}]}); }catch(e){}
      if(!(await this.permesso(false))) return false;
      if(!canaleRec){ try{ await LN.createChannel({id:'recupero', name:tt('Timer di recupero'), description:tt('Avvisa quando il recupero è finito'), importance:4, visibility:1, vibration:true}); }catch(e){} canaleRec=true; }
      await LN.schedule({notifications:[{id:7200, title:titolo, body:testo, channelId:'recupero',
        smallIcon:'ic_stat_tms', iconColor:'#9A5B1F', schedule:{at:new Date(at), allowWhileIdle:true}, extra:{pagina:'timer'}}]});
      return true;
    },
    async recuperoVia(){ try{ await LN.cancel({notifications:[{id:7200}]}); }catch(e){} },
    /* fine della pesata: una notifica subito (id 7300), così il suono arriva anche senza guardare lo schermo */
    async subito(titolo, testo){
      if(!(await this.permesso(false))) return false;
      if(!canale){ try{ await LN.createChannel({id:'promemoria', name:tt('Promemoria'), description:tt('Pesata della sera, foto del lunedì e dieta'), importance:4, visibility:1, vibration:true}); }catch(e){} canale=true; }
      await LN.schedule({notifications:[{id:7300, title:titolo, body:testo, channelId:'promemoria',
        smallIcon:'ic_stat_tms', iconColor:'#9A5B1F', schedule:{at:new Date(Date.now()+300), allowWhileIdle:true}, extra:{pagina:'bil'}}]});
      return true;
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
  if(typeof scanAperta==='function' && scanAperta()){ scanChiudi(); return true; }   /* schermata d'analisi della pesata */
  if(typeof qrAperto==='function' && qrAperto()){ qrChiudi(); return true; }        /* lettore del QR del collegamento */
  try{ if(document.fullscreenElement){ document.exitFullscreen(); return true; } }catch(e){}
  const aperto=id=>{ const o=$(id); return !!o && o.style.display==='flex'; };
  if(aperto('vov')||aperto('qrov')){ risali(); return true; }
  if(navLivelli>0){ history.back(); return true; }
  return !!risali();
};
})();
