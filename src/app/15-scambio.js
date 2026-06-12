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

  let corpo='';
  giorni.forEach((g,gi)=>{
    const dayRows=rows.filter(r=>r.giorno===g);
    corpo+=`<div class="giorno"><h2>▌ ${esc(g)}</h2><table><thead><tr><th class="l">Esercizio</th><th class="l">Previsto</th><th>Serie</th><th>Rip</th><th>Peso kg</th><th>RIR</th><th class="l">Note</th></tr></thead><tbody>`;
    dayRows.forEach(r=>{
      const prev=`${r.serie}×${r.rip} @${r.peso} kg${r.rir!=null?(' · RIR '+r.rir):''}${r.rest?(' · rest '+esc(r.rest)):''}`;
      const vb=(r.video&&videoMap[r.video])?`<button type="button" class="vbtn" data-v="${esc(r.video)}" title="Guarda il video">▶</button>`:'';
      corpo+=`<tr><td class="l">${esc(r.esercizio)}${vb}${r.note?`<div class="hint">${esc(r.note)}</div>`:''}</td><td class="l prev">${prev}</td>`+
        `<td><input id="s-${r.i}" type="number" min="0" step="1" value="${r.serie||''}"></td>`+
        `<td><input id="r-${r.i}" type="number" min="0" step="1" value="${r.rip||''}"></td>`+
        `<td><input id="p-${r.i}" type="number" min="0" step="0.5" value="${r.peso||''}"></td>`+
        `<td><input id="rir-${r.i}" type="number" min="0" max="9" step="1" value="${r.rir==null?'':r.rir}" placeholder="–"></td>`+
        `<td class="l"><input id="n-${r.i}" type="text" class="nota" placeholder="com'è andata?"></td></tr>`;
    });
    corpo+=`</tbody></table><div class="seduta">Fatica della seduta (RPE 0–10) <input id="rpe-${gi}" type="number" min="0" max="10" step="0.5" placeholder="–"> · Durata <input id="min-${gi}" type="number" min="0" step="1" placeholder="min"> min</div></div>`;
  });

  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Scheda — ${esc(profNome()||'allenamento')}</title>
<style>
 body{font-family:Georgia,'Times New Roman',serif;background:#f4ead8;color:#2b1d10;margin:0;padding:18px;max-width:980px;margin-inline:auto}
 h1{font-size:22px;margin:0 0 2px}.sub{color:#7a6648;font-size:13px;margin-bottom:14px}
 .giorno{background:#fbf4e6;border:1px solid #cdb889;border-radius:10px;padding:12px 14px;margin-bottom:14px}
 h2{font-size:15px;color:#9a5b1f;margin:2px 0 8px}
 table{width:100%;border-collapse:collapse;font-size:13px}
 th{font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;color:#7a6648;border-bottom:1px solid #cdb889;padding:4px 6px;text-align:center}
 td{border-bottom:1px solid #e6d9bd;padding:5px 6px;text-align:center;vertical-align:top}
 .l{text-align:left}.prev{color:#7a6648;font-size:12px;white-space:nowrap}.hint{color:#9a8a6a;font-size:11px}
 input[type=number]{width:58px;padding:4px;border:1px solid #cdb889;border-radius:5px;background:#fff;font:inherit;font-size:13px;text-align:center}
 input.nota{width:100%;min-width:110px;padding:4px 6px;border:1px solid #cdb889;border-radius:5px;background:#fff;font:inherit;font-size:12px}
 .seduta{margin-top:8px;font-size:13px;color:#5b4a30}
 .vbtn{margin-left:6px;border:1px solid #cdb889;background:#fff;border-radius:5px;cursor:pointer;font-size:11px;padding:1px 7px}
 .invia{display:block;margin:20px auto 6px;padding:12px 26px;font:inherit;font-size:16px;background:#9a5b1f;color:#fff;border:0;border-radius:9px;cursor:pointer}
 .invia:hover{background:#7e4a18}.fine{color:#7a6648;font-size:12px;text-align:center;margin-bottom:24px}
 .avviso{background:#fdf0d4;border:1px solid #d9b66a;border-radius:9px;padding:10px 13px;font-size:13px;margin:0 0 14px;color:#5b4a30}
 #bozza-stato{color:#7a6648;font-size:12px;text-align:center;margin:6px 0;min-height:15px}
 #vov{position:fixed;inset:0;background:rgba(20,10,2,.82);display:none;align-items:center;justify-content:center;z-index:9;padding:16px}
 #vov video{width:100%;max-width:760px;max-height:78vh;border-radius:10px;background:#000}
 #vclose{position:absolute;top:14px;right:18px;font-size:26px;color:#fff;background:none;border:0;cursor:pointer}
</style></head><body>
<h1>✦ Scheda di allenamento — ${esc(profNome()||'')}</h1>
<div class="sub">Esportata il ${esc(oggi)} da Training Monitor System. Compila ciò che hai fatto davvero (serie, ripetizioni, peso, RIR, note e fatica della seduta), poi premi il bottone in fondo e manda il file al tuo trainer.</div>
<div class="avviso">📱 <b>Salva questo file nella memoria del telefono</b> (es. cartella Download) e apri sempre quella copia — non l'anteprima della chat: così quello che scrivi <b>si salva da solo</b> anche se chiudi la pagina.<span id="bozza-nota"></span></div>
${corpo}
<div id="bozza-stato"></div>
<button type="button" class="invia" id="invia">📩 Crea il file per il trainer</button>
<div class="fine">Si scarica un piccolo file <b>Rientro_*.json</b>: rimandalo al trainer (chat o email). La bozza resta salvata su questo dispositivo anche dopo l'invio.</div>
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

/* applica il rientro allo Storico della settimana `code` — pura, senza dialoghi (testabile) */
function applicaRientro(dati, code){
  const righe=(dati&&Array.isArray(dati.righe))?dati.righe:[];
  if(!Array.isArray(DOC.storico)) DOC.storico=[];
  /* ogni giorno importato = una seduta; la numerazione continua da quelle già nella settimana */
  let base=0; DOC.storico.forEach(r=>{ if((+r.scheda)===code) base=Math.max(base,+r.seduta||1); });
  const giorni=[]; righe.forEach(r=>{ if(r&&r.giorno&&!giorni.includes(r.giorno)) giorni.push(r.giorno); });
  const sedutaDi={}; giorni.forEach((g,i)=>{ sedutaDi[g]=base+i+1; });
  let aggiunte=0;
  righe.forEach(r=>{
    const nome=String((r&&r.esercizio)||'').trim(); if(!nome) return;
    DOC.storico.push({scheda:code, esercizio:nome, seduta:sedutaDi[r.giorno]||(base+1), test:false,
      macro:gruppoOf(nome), serie:+r.serie||0, rip:+r.rip||0, peso:+r.peso||0, rest:String((r&&r.rest)||''),
      rir:(r.rir===''||r.rir==null)?null:+r.rir});
    aggiunte++;
  });
  let sedute=0;
  if(dati && Array.isArray(dati.sedute)){
    if(!Array.isArray(DOC.storico_rpe)) DOC.storico_rpe=[];
    dati.sedute.forEach(s=>{
      const rp=+((s&&s.rpe)||0), mn=+((s&&s.min)||0), g=String((s&&s.giorno)||'');
      if(!(rp>0&&mn>0)||!g) return;
      DOC.storico_rpe=DOC.storico_rpe.filter(x=>!((+x.scheda)===code && x.giorno===g));
      DOC.storico_rpe.push({scheda:code, giorno:g, rpe:rp, min:mn}); sedute++;
    });
  }
  return {aggiunte:aggiunte, sedute:sedute};
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
  if(sconosciuti.length && !confirm('⚠ Esercizi non presenti nel catalogo:\n• '+sconosciuti.join('\n• ')+'\n\nVerranno registrati lo stesso (senza fattore TL dedicato). Continuo?')) return;
  /* data di registrazione → settimana */
  const oggi=new Date().toISOString().slice(0,10);
  modal(`<h3>Importa allenamento dal cliente</h3>
    <div class="callout callout--info"><div>📥 <b>${dati.righe.length}</b> esercizi${(dati.sedute&&dati.sedute.length)?(' · <b>'+dati.sedute.length+'</b> sedute con RPE'):''} — scheda di <b>${esc(pn)}</b>${dati.compilata?(', compilata il '+esc(String(dati.compilata))):''}.</div></div>
    <div class="field"><label>In quale data registrare l'allenamento?</label><input type="date" id="imp-data" value="${oggi}"></div>
    <div class="muted" style="font-size:12px">La registrazione va nello Storico della settimana corrispondente alla data.</div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">Annulla</button><button class="btn btn--ember" id="imp-ok">Importa</button></div>`);
  document.getElementById('imp-ok').onclick=()=>{
    const v=document.getElementById('imp-data').value;
    if(!v){ alert('Scegli una data.'); return; }
    const w=isoWeek(new Date(v+'T12:00:00')), code=schedaCode(w.anno,w.sett);
    /* safe check 3: la settimana ha già registrazioni? */
    const exist=DOC.storico.filter(r=>(+r.scheda)===code).length;
    if(exist && !confirm(`⚠ Nella settimana ${code} (${schedaLabel(code)}) ci sono già ${exist} registrazioni.\nLe righe importate verranno AGGIUNTE. Procedo?`)) return;
    closeModal();
    const ris=applicaRientro(dati, code);
    persist('storico'); if(ris.sedute) persist('corpo'); saveCache();
    alert(`✔ Import completato — settimana ${code} (${schedaLabel(code)}):\n${ris.aggiunte} esercizi aggiunti allo Storico${ris.sedute?(' e '+ris.sedute+' sedute RPE'):''}.`);
    if(curTab==='storico') renderStorico(); else if(curTab==='profilo') renderProfilo();
    updateStatusDots();
  };
}
