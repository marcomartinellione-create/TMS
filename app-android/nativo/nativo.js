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
   · niente invito a installare (è già un'app) e link del sito nel browser.
   I dati restano dove li mette la PWA (localStorage e IndexedDB, dentro l'app): stesse chiavi,
   stesso formato del rientro. */
/* global TT, tt, esc, $, SCHEDA, navLivelli:writable, CVER, FOTO_LAB, fotoVistaAttesa,
   avvia, caricaFile, risali, chiudiDove, chiudiVideo, mostraInstallHint */
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
