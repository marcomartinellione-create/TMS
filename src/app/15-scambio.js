/* ════ SCAMBIO SCHEDA TRAINER ↔ CLIENTE ════
   Flusso (richiesto da Marco, v1.0.66):
   1. il trainer esporta la scheda settimanale come pagina HTML autonoma (video inclusi,
      stesso meccanismo del Report digitale); la manda al cliente via chat/email;
   2. il cliente apre il file, compila ciò che ha fatto DAVVERO (serie/rip/peso/RIR,
      note, fatica sRPE e durata per seduta — gli esercizi non si cambiano) e con un
      click genera il "file di rientro" (JSON tipo 'tms-rientro') da rimandare;
   3. il trainer lo importa dal tab Profilo: l'app chiede la data di registrazione e
      avvisa se il profilo non corrisponde, se la settimana ha già registrazioni o se
      ci sono esercizi fuori catalogo. Le righe finiscono nello Storico (+ sRPE). */

function righeSchedaCliente(){ return ((DOC.scheda&&DOC.scheda.settimanale)||[]).filter(r=>r&&r.esercizio&&String(r.esercizio).trim()); }

function costruisciSchedaCliente(videoMap){
  videoMap=videoMap||{};
  const righe=righeSchedaCliente();
  const giorni=GIORNI.filter(g=>righe.some(r=>r.giorno===g));
  const oggi=new Date().toISOString().slice(0,10);
  const rows=righe.map((r,i)=>({i:i, giorno:r.giorno, esercizio:String(r.esercizio).trim(),
    serie:+r.serie||0, rip:+r.rip||0, peso:+r.peso||0, rest:r.rest||'',
    rir:(r.rir===''||r.rir==null)?null:+r.rir, note:r.note||'', video:videoOf(r.esercizio)}));
  const meta={tipo:'tms-rientro', versione:1, app:APP_VERSION,
    profilo:{slug:activeProfile, nome:profNome()}, esportata:oggi};
  const js=o=>JSON.stringify(o).replace(/</g,'\\u003c');

  /* HOME = schermata «Seleziona il giorno» con una card per ogni giorno della scheda */
  let home=`<div id="home"><div class="pick-title">📋 Seleziona il giorno da compilare</div><div class="days">`;
  giorni.forEach((g,gi)=>{ const cnt=rows.filter(r=>r.giorno===g).length;
    home+=`<button type="button" class="day-card" data-go="${gi}">`+
      `<span class="day-l"><span class="day-name">${esc(g)}</span><span class="day-meta">${cnt} eserciz${cnt===1?'io':'i'}</span></span>`+
      `<span class="day-r"><span class="day-done" id="stato-${gi}"></span><span class="chev">›</span></span></button>`;
  });
  home+=`</div><div id="bozza-stato"></div>`+
    `<button type="button" class="invia" id="invia">📩 Crea il file per il trainer</button>`+
    `<div class="fine">Quando hai compilato i giorni torna qui e premi il bottone: si scarica un file <b>Rientro_*.json</b> da rimandare al trainer. La bozza resta salvata su questo dispositivo anche dopo l'invio.</div></div>`;

  /* una PAGINA-GIORNO per ciascun giorno: visibile una alla volta, campi su una sola colonna */
  let pagine='';
  giorni.forEach((g,gi)=>{
    const dayRows=rows.filter(r=>r.giorno===g);
    let exs='';
    dayRows.forEach(r=>{
      const prev=`${r.serie}×${r.rip} @${r.peso} kg${r.rir!=null?(' · RIR '+r.rir):''}${r.rest?(' · rest '+esc(r.rest)):''}`;
      const vb=(r.video&&videoMap[r.video])?`<button type="button" class="vbtn" data-v="${esc(r.video)}" title="Guarda il video">▶ video</button>`:'';
      exs+=`<div class="ex"><div class="ex-top"><span class="ex-name">${esc(r.esercizio)}</span>${vb}</div>`+
        (r.note?`<div class="ex-coach">${esc(r.note)}</div>`:'')+
        `<div class="ex-prev"><b>Previsto:</b> ${prev}</div>`+
        `<div class="f"><label>Serie</label><input id="s-${r.i}" type="number" inputmode="numeric" min="0" step="1" value="${r.serie||''}"></div>`+
        `<div class="f"><label>Ripetizioni</label><input id="r-${r.i}" type="number" inputmode="numeric" min="0" step="1" value="${r.rip||''}"></div>`+
        `<div class="f"><label>Peso (kg)</label><input id="p-${r.i}" type="number" inputmode="decimal" min="0" step="0.5" value="${r.peso||''}"></div>`+
        `<div class="f"><label>RIR</label><input id="rir-${r.i}" type="number" inputmode="numeric" min="0" max="9" step="1" value="${r.rir==null?'':r.rir}" placeholder="–"></div>`+
        `<div class="f note"><label>Note</label><input id="n-${r.i}" type="text" class="nota" placeholder="com'è andata?"></div></div>`;
    });
    pagine+=`<div class="day-page" id="day-${gi}" hidden>`+
      `<button type="button" class="back" data-back>‹ Tutti i giorni</button>`+
      `<h2>▌ ${esc(g)}</h2>${exs}`+
      `<div class="seduta"><div class="seduta-t">Fine giornata</div>`+
      `<div class="f"><label>Fatica seduta (RPE 0–10)</label><input id="rpe-${gi}" type="number" inputmode="decimal" min="0" max="10" step="0.5" placeholder="–"></div>`+
      `<div class="f"><label>Durata (min)</label><input id="min-${gi}" type="number" inputmode="numeric" min="0" step="1" placeholder="–"></div></div>`+
      `<button type="button" class="back back-bottom" data-back>‹ Tutti i giorni</button></div>`;
  });
  const corpo=home+pagine;

  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Scheda — ${esc(profNome()||'allenamento')}</title>
<style>
 /* ── Pagina del cliente, mobile-first: due schermate (lista giorni → giorno scelto), campi
       su UNA colonna (mai larghi); input a 16px così iOS non zooma al focus. ── */
 *{box-sizing:border-box}
 [hidden]{display:none!important}
 body{font-family:Georgia,'Times New Roman',serif;background:#f4ead8;color:#2b1d10;margin:0;padding:14px 12px;max-width:620px;margin-inline:auto;-webkit-text-size-adjust:100%}
 h1{font-size:20px;margin:0 0 2px}
 .sub{color:#7a6648;font-size:13px;margin-bottom:12px;line-height:1.4}
 .avviso{background:#fdf0d4;border:1px solid #d9b66a;border-radius:9px;padding:9px 12px;font-size:12.5px;margin:0 0 16px;color:#5b4a30;line-height:1.4}
 .pick-title{font-size:15px;color:#9a5b1f;font-weight:bold;margin:4px 0 9px}
 .days{display:flex;flex-direction:column;gap:9px;margin-bottom:20px}
 .day-card{display:flex;align-items:center;justify-content:space-between;width:100%;background:#fbf4e6;border:1px solid #cdb889;border-radius:12px;padding:15px 16px;font:inherit;color:inherit;cursor:pointer;text-align:left}
 .day-card:active{background:#f1e6cd}
 .day-l{display:flex;flex-direction:column;gap:2px}
 .day-name{font-size:17px;font-weight:bold;color:#2b1d10}
 .day-meta{color:#7a6648;font-size:12.5px}
 .day-r{display:flex;align-items:center;gap:8px}
 .day-done{color:#2f7d4f;font-size:18px;font-weight:bold;min-width:14px;text-align:right}
 .chev{font-size:22px;color:#9a5b1f;line-height:1}
 .day-page h2{font-size:17px;color:#9a5b1f;margin:8px 0 12px}
 .back{background:none;border:0;color:#9a5b1f;font:inherit;font-size:15px;font-weight:bold;cursor:pointer;padding:6px 2px}
 .back-bottom{margin-top:8px;font-size:16px}
 .ex{background:#fbf4e6;border:1px solid #cdb889;border-radius:12px;padding:12px 14px;margin-bottom:11px}
 .ex-top{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
 .ex-name{font-size:15.5px;font-weight:bold;color:#2b1d10}
 .ex-coach{color:#9a8a6a;font-size:12px;margin-top:3px;font-style:italic}
 .ex-prev{color:#7a6648;font-size:13px;border-bottom:1px dashed #e6d9bd;padding-bottom:8px;margin:6px 0 2px}
 .f{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid #f0e6cf}
 .f:last-child{border-bottom:0}
 .f label{color:#5b4a30;font-size:14px;font-weight:bold}
 .f input{height:42px;font:inherit;font-size:16px;border:1px solid #cdb889;border-radius:7px;background:#fff;text-align:center;padding:2px 8px;width:110px}
 .f.note{flex-direction:column;align-items:stretch;gap:5px}
 .f.note label{font-size:13px}
 .f.note input.nota{width:100%;text-align:left}
 .seduta{background:#f6ecd6;border:1px solid #cdb889;border-radius:12px;padding:12px 14px;margin:14px 0 6px}
 .seduta-t{font-size:12px;color:#9a5b1f;font-weight:bold;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px}
 .vbtn{border:1px solid #cdb889;background:#fff;border-radius:6px;cursor:pointer;font-size:12.5px;padding:3px 11px;color:#9a5b1f}
 .invia{display:block;width:100%;margin:8px 0;padding:15px;font:inherit;font-size:17px;font-weight:bold;background:#9a5b1f;color:#fff;border:0;border-radius:10px;cursor:pointer}
 .invia:active{background:#7e4a18}
 .fine{color:#7a6648;font-size:12px;text-align:center;margin-bottom:20px;line-height:1.4}
 #bozza-stato{color:#7a6648;font-size:12px;text-align:center;margin:8px 0;min-height:15px}
 #vov{position:fixed;inset:0;background:rgba(20,10,2,.82);display:none;align-items:center;justify-content:center;z-index:9;padding:16px}
 #vov video{width:100%;max-width:760px;max-height:78vh;border-radius:10px;background:#000}
 #vclose{position:absolute;top:14px;right:18px;font-size:30px;color:#fff;background:none;border:0;cursor:pointer}
</style></head><body>
<h1>✦ Scheda di allenamento — ${esc(profNome()||'')}</h1>
<div class="sub">Esportata il ${esc(oggi)} da Training Monitor System. Scegli un giorno, compila ciò che hai fatto davvero (serie, ripetizioni, peso, RIR, note e fatica della seduta), poi torna e premi «Crea il file per il trainer».</div>
<div class="avviso">📱 <b>Salva questo file nella memoria del telefono</b> (es. cartella Download) e apri sempre quella copia — non l'anteprima della chat: così quello che scrivi <b>si salva da solo</b> anche se chiudi la pagina.<span id="bozza-nota"></span></div>
${corpo}
<div id="vov"><button id="vclose" type="button">✕</button><video controls playsinline></video></div>
<script>
var META=${js(meta)};
var RIGHE=${js(rows.map(r=>({i:r.i,giorno:r.giorno,esercizio:r.esercizio})))};
var GIORNI=${js(giorni)};
var VIDEO=${js(videoMap)};
function $(id){return document.getElementById(id);}
document.querySelectorAll('.vbtn').forEach(function(b){ b.onclick=function(){
  var ov=$('vov'), v=ov.querySelector('video'); v.src=VIDEO[b.getAttribute('data-v')]||''; ov.style.display='flex'; v.play(); }; });
$('vclose').onclick=function(){ var ov=$('vov'), v=ov.querySelector('video'); v.pause(); v.removeAttribute('src'); ov.style.display='none'; };
/* navigazione a due schermate: lista giorni <-> giorno selezionato (mostra uno alla volta) */
function mostra(id){ $('home').hidden=(id!=='home');
  document.querySelectorAll('.day-page').forEach(function(p){ p.hidden=(p.id!==id); });
  try{ window.scrollTo(0,0); }catch(e){} }
document.querySelectorAll('[data-go]').forEach(function(b){ b.onclick=function(){ mostra('day-'+b.getAttribute('data-go')); }; });
document.querySelectorAll('[data-back]').forEach(function(b){ b.onclick=function(){ aggiornaStato(); mostra('home'); }; });
/* spunta verde sui giorni in cui hai già scritto qualcosa */
function dayIds(gi){ var ids=[]; RIGHE.forEach(function(r){ if(r.giorno===GIORNI[gi]){ ['s-','r-','p-','rir-','n-'].forEach(function(p){ ids.push(p+r.i); }); } }); ids.push('rpe-'+gi); ids.push('min-'+gi); return ids; }
function aggiornaStato(){ GIORNI.forEach(function(g,gi){ var fatto=dayIds(gi).some(function(id){ var el=$(id); return el && el.value!==''; }); var s=$('stato-'+gi); if(s) s.textContent=fatto?'✔':''; }); }
function num(id){ var v=$(id)?$(id).value:''; return v===''?null:+v; }
/* bozza autosalvata sul dispositivo: niente dati persi se la pagina si chiude */
var BK='tms-bozza-'+(META.profilo.slug||'cliente')+'-'+META.esportata;
var stOk=false; try{ localStorage.setItem(BK+'-t','1'); localStorage.removeItem(BK+'-t'); stOk=true; }catch(e){}
function idsCampi(){ var ids=[]; RIGHE.forEach(function(r){ ['s-','r-','p-','rir-','n-'].forEach(function(p){ ids.push(p+r.i); }); }); GIORNI.forEach(function(g,gi){ ids.push('rpe-'+gi); ids.push('min-'+gi); }); return ids; }
function salvaBozza(){ if(!stOk) return; var o={}; idsCampi().forEach(function(id){ var el=$(id); if(el&&el.value!=='') o[id]=el.value; });
  try{ localStorage.setItem(BK, JSON.stringify(o)); var n=$('bozza-stato'); if(n) n.textContent='💾 bozza salvata '+new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}); }catch(e){} }
(function(){ var nota=$('bozza-nota');
  if(!stOk){ if(nota) nota.innerHTML=' <b>⚠ Qui il salvataggio automatico NON funziona</b> (probabilmente stai guardando una anteprima): salva il file sul telefono e riaprilo da li, oppure compila e invia senza chiudere questa pagina.'; return; }
  var rawB=null; try{ rawB=localStorage.getItem(BK); }catch(e){}
  if(rawB){ try{ var o=JSON.parse(rawB); Object.keys(o).forEach(function(id){ var el=$(id); if(el) el.value=o[id]; }); if(nota) nota.innerHTML=' <b>✔ Bozza ritrovata</b>: ho ricaricato quello che avevi scritto.'; }catch(e){} }
  document.addEventListener('input', salvaBozza);
})();
/* la spunta dei giorni si aggiorna mentre compili e all'apertura (anche se l'autosalvataggio è off) */
document.addEventListener('input', aggiornaStato);
aggiornaStato();
$('invia').onclick=function(){
  var righe=RIGHE.map(function(r){ return {giorno:r.giorno, esercizio:r.esercizio,
    serie:num('s-'+r.i)||0, rip:num('r-'+r.i)||0, peso:num('p-'+r.i)||0,
    rir:num('rir-'+r.i), note:($('n-'+r.i)&&$('n-'+r.i).value||'').trim()}; });
  var sedute=[]; GIORNI.forEach(function(g,gi){ var rp=num('rpe-'+gi), mn=num('min-'+gi);
    if(rp&&mn) sedute.push({giorno:g, rpe:rp, min:mn}); });
  var out={tipo:META.tipo, versione:META.versione, app:META.app, profilo:META.profilo,
    esportata:META.esportata, compilata:new Date().toISOString().slice(0,10), righe:righe, sedute:sedute};
  var blob=new Blob([JSON.stringify(out,null,1)],{type:'application/json'});
  var u=URL.createObjectURL(blob); var a=document.createElement('a');
  a.href=u; a.download='Rientro_'+(META.profilo.slug||'cliente')+'_'+out.compilata+'.json';
  document.body.appendChild(a); a.click();
  setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(u); },800);
  alert('File creato: '+a.download+'\\nLo trovi nei Download — rimandalo al tuo trainer.');
};
<\/script></body></html>`;
}

async function esportaSchedaCliente(){
  const righe=righeSchedaCliente();
  if(!righe.length){ alert('La scheda settimanale è vuota: niente da esportare.'); return; }
  let map={};
  const vids=collectSchedaVideos();
  if(vids.length && dirHandle && confirm(`Includere i ${vids.length} video degli esercizi nel file? (più pesante, ma il cliente li vede offline)`)){
    map=await embedVideoFiles(vids.map(v=>v.file));
  }
  const html=costruisciSchedaCliente(map);
  const blob=new Blob([html],{type:'text/html;charset=utf-8'}); const u=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=u; a.download='Scheda_'+(activeProfile||'cliente')+'_'+new Date().toISOString().slice(0,10)+'.html';
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(u); },800);
  const kb=blob.size/1024;
  alert('✔ Scheda esportata ('+(kb>1024?(kb/1024).toFixed(1)+' MB':kb.toFixed(0)+' KB')+').\nInviala al cliente: la apre con doppio click, compila e ti rimanda il file di rientro (da importare qui nel Profilo).\n\nConsiglio da girare al cliente: salvi il file nella memoria del telefono e apra sempre quella copia — la bozza si salva da sola mentre compila.');
}

/* carica il rientro del cliente nella SCHEDA PESI (settimanale) per la revisione del coach,
   prima del salvataggio manuale nello Storico (💾 Salva nello Storico). Pura, senza dialoghi. */
function caricaRientroInScheda(dati){
  schedaMode='settimanale';
  if(!DOC.scheda || typeof DOC.scheda!=='object') DOC.scheda={settimanale:[],mensile:[]};
  const righe=(dati&&Array.isArray(dati.righe))?dati.righe:[];
  DOC.scheda.settimanale=righe.filter(r=>r&&r.esercizio&&String(r.esercizio).trim()).map(r=>({
    giorno:String((r&&r.giorno)||'Lunedì'), esercizio:String(r.esercizio).trim(), note:String((r&&r.note)||''),
    serie:+r.serie||0, rip:+r.rip||0, peso:+r.peso||0, rest:'',
    rir:(r.rir===''||r.rir==null)?'':+r.rir }));
  if(!DOC.scheda.rpe||typeof DOC.scheda.rpe!=='object') DOC.scheda.rpe={};
  DOC.scheda.rpe.settimanale={};
  if(dati && Array.isArray(dati.sedute)) dati.sedute.forEach(s=>{ const g=String((s&&s.giorno)||''),
    rp=+((s&&s.rpe)||0), mn=+((s&&s.min)||0); if(g&&(rp>0||mn>0)) DOC.scheda.rpe.settimanale[g]={rpe:rp||'',min:mn||''}; });
  return {righe:DOC.scheda.settimanale.length, sedute:Object.keys(DOC.scheda.rpe.settimanale).length};
}

async function importaRientroFile(file){
  let dati=null;
  try{ dati=JSON.parse(await file.text()); }catch(e){ logErrore('importRientro', e); }
  if(!dati || dati.tipo!=='tms-rientro' || !Array.isArray(dati.righe) || !dati.righe.length){
    alert('File non valido: non è un "rientro scheda" del TMS (o non contiene esercizi).'); return; }
  /* safe check 1: il profilo del file corrisponde a quello attivo? */
  const pn=(dati.profilo&&dati.profilo.nome)||'?', ps=(dati.profilo&&dati.profilo.slug)||'';
  if(ps!==activeProfile && !confirm(`⚠ Il file è della scheda di «${pn}» ma il profilo attivo è «${profNome()}».\nImportare comunque in questo profilo?`)) return;
  /* safe check 2: esercizi fuori catalogo */
  const sconosciuti=[]; dati.righe.forEach(r=>{ const n=String((r&&r.esercizio)||'').trim(); if(n && !esLookup(n) && !sconosciuti.includes(n)) sconosciuti.push(n); });
  if(sconosciuti.length && !confirm('⚠ Esercizi non presenti nel catalogo:\n• '+sconosciuti.join('\n• ')+'\n\nVerranno caricati lo stesso (senza fattore TL dedicato). Continuo?')) return;
  /* safe check 3: la scheda Pesi corrente ha contenuto e verrà sostituita per la revisione */
  const piena=((DOC.scheda&&DOC.scheda.settimanale)||[]).some(r=>r&&r.esercizio&&String(r.esercizio).trim());
  if(piena && !confirm('La scheda Pesi corrente verrà sostituita con l\'allenamento del cliente, per controllarlo prima di salvarlo nello Storico. Procedo?')) return;
  /* nuovo flusso (richiesta Marco): NON si scrive subito nello Storico — l'allenamento del
     cliente entra nella scheda Pesi, il coach lo rivede e poi salva a mano (💾 Salva nello Storico). */
  const ris=caricaRientroInScheda(dati);
  persist('scheda');
  showTab('allenamento');
  alert(`📥 Allenamento di «${pn}» caricato nella scheda Pesi: ${ris.righe} esercizi${ris.sedute?(' · '+ris.sedute+' sedute con RPE'):''}.\n\nControlla i valori, poi premi «💾 Salva nello Storico» (scegli tu la settimana).`);
}
