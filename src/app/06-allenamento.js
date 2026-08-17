/* ════════════════ RENDER: ALLENAMENTO ════════════════ */
let schedaMode='settimanale';
let pesiView='scheda';  /* 'scheda' | 'riscaldamento' — vista del tab Pesi (toggle col pulsante arancione) */
function schedaRows(){ return DOC.scheda[schedaMode] || (DOC.scheda[schedaMode]=[]); }
/* righe di RISCALDAMENTO del Training Set attivo, per modalità (settimanale/mensile).
   Solo {giorno,esercizio,serie,rip,note}: NON entrano in TL, Storico o alcun calcolo —
   vivono in un array separato (DOC.scheda.riscaldamento), che nessun calcolo legge. */
function riscaldaRows(){ const s=DOC.scheda; if(!s.riscaldamento||typeof s.riscaldamento!=='object'||Array.isArray(s.riscaldamento)) s.riscaldamento={};
  if(!Array.isArray(s.riscaldamento[schedaMode])) s.riscaldamento[schedaMode]=[]; return s.riscaldamento[schedaMode]; }

/* ── Training Set (loadout della scheda Pesi): il piano ATTIVO resta in DOC.scheda.settimanale/
      mensile (canonico, tutto il resto lo legge da lì); i set INATTIVI stanno in
      DOC.scheda.setsSalvati {nome→{settimanale,mensile}}; DOC.scheda.setAttivo = nome attivo;
      DOC.scheda.setsOrdine = ordine per il menù. Cambiare set = salva l'attivo tra i salvati e
      carica l'altro (copie profonde: nessun riferimento condiviso → nessun bug di sincronia).
      Idempotente e retro-compatibile: le schede esistenti diventano il set "Base". ── */
function tsCopy(o){ try{ return JSON.parse(JSON.stringify(o||[])); }catch(e){ return []; } }
function ensureSets(){ const s=DOC.scheda; if(!s||typeof s!=='object') return s;
  if(typeof s.setAttivo!=='string'||!s.setAttivo) s.setAttivo='Base';
  if(!s.setsSalvati||typeof s.setsSalvati!=='object') s.setsSalvati={};
  if(!s.riscaldamento||typeof s.riscaldamento!=='object'||Array.isArray(s.riscaldamento)) s.riscaldamento={};
  let ord=Array.isArray(s.setsOrdine)?s.setsOrdine.filter(n=>n===s.setAttivo||s.setsSalvati[n]):[];
  [s.setAttivo].concat(Object.keys(s.setsSalvati)).forEach(n=>{ if(ord.indexOf(n)<0) ord.push(n); });
  s.setsOrdine=ord; return s; }
function switchTrainingSet(nome){ const s=ensureSets(); if(!nome||nome===s.setAttivo||!s.setsSalvati[nome]) return;
  s.setsSalvati[s.setAttivo]={settimanale:tsCopy(s.settimanale||[]), mensile:tsCopy(s.mensile||[]), riscaldamento:tsCopy(s.riscaldamento||{})};  /* salva l'attivo */
  const tgt=s.setsSalvati[nome]||{};                                                                   /* carica il target */
  s.settimanale=tsCopy(tgt.settimanale||[]); s.mensile=tsCopy(tgt.mensile||[]); s.riscaldamento=tsCopy(tgt.riscaldamento||{});
  delete s.setsSalvati[nome]; s.setAttivo=nome; persist('scheda'); renderAllenamento(); }
function creaTrainingSet(nome, sorgente){ const s=ensureSets(); nome=String(nome||'').trim();
  if(!nome || nome===s.setAttivo || s.setsSalvati[nome]) return;
  s.setsSalvati[s.setAttivo]={settimanale:tsCopy(s.settimanale||[]), mensile:tsCopy(s.mensile||[]), riscaldamento:tsCopy(s.riscaldamento||{})};  /* salva l'attivo */
  let base={settimanale:[], mensile:[], riscaldamento:{}};
  if(sorgente && sorgente!=='__vuota__' && s.setsSalvati[sorgente]){ const src=s.setsSalvati[sorgente];
    base={settimanale:tsCopy(src.settimanale||[]), mensile:tsCopy(src.mensile||[]), riscaldamento:tsCopy(src.riscaldamento||{})}; }
  s.settimanale=base.settimanale; s.mensile=base.mensile; s.riscaldamento=base.riscaldamento; s.setAttivo=nome;
  if(s.setsOrdine.indexOf(nome)<0) s.setsOrdine.push(nome);
  persist('scheda'); renderAllenamento(); }
function nuovoTrainingSetModal(){ const s=ensureSets();
  const opts='<option value="__vuota__">'+t('Scheda vuota (da zero)')+'</option>'+
    s.setsOrdine.map(n=>'<option value="'+esc(n)+'">'+t('Copia da:')+' '+esc(n)+'</option>').join('');
  modal(`<h3>${t('Nuovo Training Set')}</h3>
    <div class="field" style="margin-top:8px"><label>${t('Nome')}</label><input id="ts-nome" placeholder="${t('es. Casa, Palestra…')}" style="width:100%"></div>
    <div class="field" style="margin-top:8px"><label>${t('Punto di partenza')}</label><select id="ts-src" style="width:100%">${opts}</select></div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">${t('Annulla')}</button><button class="btn btn--ember" id="ts-ok">${t('Crea')}</button></div>`);
  const src=document.getElementById('ts-src'); if(src) src.value=s.setAttivo;
  document.getElementById('ts-ok').onclick=()=>{ const nome=(document.getElementById('ts-nome').value||'').trim();
    if(!nome){ alert(t('Dai un nome al Training Set.')); return; }
    if(nome===s.setAttivo||s.setsSalvati[nome]){ alert(t('Esiste già un Training Set con questo nome.')); return; }
    const sorgente=document.getElementById('ts-src').value; closeModal(); creaTrainingSet(nome, sorgente); };
  setTimeout(()=>{ try{ document.getElementById('ts-nome').focus(); }catch(e){} },0); }
function rinominaTrainingSet(){ const s=ensureSets(); const old=s.setAttivo;
  chiediTesto(t('Rinomina Training Set'), old, nome=>{ nome=(nome||'').trim(); if(!nome||nome===old) return;
    if(s.setsSalvati[nome]){ alert(t('Esiste già un Training Set con questo nome.')); return; }
    s.setAttivo=nome; s.setsOrdine=s.setsOrdine.map(n=>n===old?nome:n); persist('scheda'); renderAllenamento(); }); }
function eliminaTrainingSet(){ const s=ensureSets(); const nomi=s.setsOrdine;
  if(nomi.length<=1){ alert(t('Deve restare almeno un Training Set.')); return; }
  const vitt=s.setAttivo;
  if(!confirm(t('Eliminare il Training Set «')+vitt+t('» e la sua scheda? Operazione irreversibile.'))) return;
  const altro=nomi.find(n=>n!==vitt); const tgt=s.setsSalvati[altro]||{};
  s.settimanale=tsCopy(tgt.settimanale||[]); s.mensile=tsCopy(tgt.mensile||[]); s.riscaldamento=tsCopy(tgt.riscaldamento||{});
  delete s.setsSalvati[altro]; delete s.setsSalvati[vitt];
  s.setAttivo=altro; s.setsOrdine=nomi.filter(n=>n!==vitt); persist('scheda'); renderAllenamento(); }
/* Bozza RPE/durata per-giorno (Foster): vive in scheda.json (autosave), azzerata al salvataggio nello Storico */
function schedaRpe(){ const s=DOC.scheda; if(!s.rpe||typeof s.rpe!=='object')s.rpe={}; if(!s.rpe[schedaMode])s.rpe[schedaMode]={}; return s.rpe[schedaMode]; }
function dayRpe(g){ const d=schedaRpe()[g]; return d||{}; }
function dayLoad(g){ const d=dayRpe(g); const r=+d.rpe||0,m=+d.min||0; return r>0&&m>0? r*m:0; }
function schedaDays(rows){ const seen=[]; (rows||schedaRows()).forEach(r=>{ if(r.giorno&&!seen.includes(r.giorno))seen.push(r.giorno); }); return seen; }
function lastPerf(nome){ if(!nome)return null; const rows=DOC.storico.filter(r=>r.esercizio===nome); if(!rows.length)return null;
  const maxS=Math.max(...rows.map(r=>+r.scheda||0)); const last=rows.filter(r=>(+r.scheda)===maxS);
  let best=last[0]; last.forEach(r=>{ if((+r.peso||0)>(+best.peso||0)) best=r; });
  return {peso:+best.peso||0, rip:+best.rip||0, rir:(best.rir==null?'':best.rir), scheda:maxS}; }
function prefillFromLast(){ const rows=schedaRows(); let n=0;
  rows.forEach(r=>{ if(!r.esercizio)return; const lp=lastPerf(r.esercizio); if(lp){ r.peso=lp.peso; r.rip=lp.rip; if(lp.rir!==''&&lp.rir!=null) r.rir=lp.rir; n++; } });
  if(!n){ alert(t('Nessuno storico da cui precompilare.')); return; }
  persist('scheda'); renderAllenamento(); }
/* ── Co-pilota LED passivo: pallino 🟢/🟡/🔴 accanto al Peso digitato. Confronta il peso
   col set di pari posizione della scorsa scheda (come ΔTL set) e pesa i segnali di
   affaticamento (ACWR, monotonia, RIR). SOLO visivo: nessuna scrittura automatica.
   Soglie (concordate con Marco): 🟢 −5%…+10% · 🟡 +10%…+20% / calo oltre −5% / aumento con
   RIR≤1 / monotonia alta · 🔴 oltre +20% o aumento con ACWR>1.5 (meglio scaricare). */
const CARICO_COL={ok:'var(--ok)',warn:'#c9961f',danger:'var(--danger)'};
function caricoSignals(){
  const ag=schedeAggr(); let acwr=null;
  if(ag.length){ const w=ag.slice(-4); const c=w.reduce((s,x)=>s+x.tl,0)/w.length; acwr=c?ag[ag.length-1].tl/c:null; }
  let monoHigh=false;
  if(useRpeActive() && ag.length){ const rpw=rpeByWeek(); const lc=ag[ag.length-1].scheda; const f=fosterWeek(rpw[lc]&&rpw[lc].day); monoHigh=(f.monotony!=null && f.monotony>2 && f.load>0); }
  return {acwr, monoHigh, sovraccarico:(acwr!=null&&acwr>1.5)};
}
function caricoLED(pesoNuovo, pvPeso, lastRir, sig){
  const p=+pesoNuovo||0; if(p<=0 || !(pvPeso>0)) return null;
  const d=(p-pvPeso)/pvPeso, pc=Math.round(d*100);
  let level, msg;
  if(d>0.20){ level='danger'; msg=t('Salto molto grande')+' (+'+pc+'% '+t('vs scorsa): di solito si sale di poco, ricontrolla'); }
  else if(d>0.10){ level='warn'; msg=t('Aumento deciso')+' (+'+pc+'%): '+t('ok se la tecnica regge'); }
  else if(d>=-0.05){ level='ok'; msg=(d>0.001?(t('Progressione sensata')+' (+'+pc+'%)'):(d<-0.001?(t('Lieve scarico')+' ('+pc+'%)'):t('Stesso carico della scorsa'))); }
  else if(d>=-0.15){ level='warn'; msg=t('Calo del')+' '+(-pc)+'%: '+t('scarico voluto?'); }
  else { level='warn'; msg=t('Calo marcato')+' ('+(-pc)+'%): '+t('deload/scarico?'); }
  if(level==='ok' && d>0.05 && lastRir!=null && lastRir<=1){ level='warn'; msg=t('Aumenti, ma la scorsa eri al limite (RIR')+' '+lastRir+'): '+t('occhio'); }
  if(sig && sig.sovraccarico && d>0.02){ level='danger'; msg=t('Carico settimanale già alto (ACWR')+' '+nf(sig.acwr,2)+'): '+t('meglio non aumentare, valuta uno scarico'); }
  else if(level==='ok' && sig && sig.monoHigh && d>0.05){ level='warn'; msg=t('Settimana poco variata (monotonia alta): aumento ok, ma varia i carichi'); }
  return {level, msg};
}
/* pallino reso accanto alle frecce ▲▼ nella cella esercizio (flex con gap): niente margine */
function caricoLedHTML(led){
  if(!led) return '<span class="carico-led no-print" style="display:none"></span>';
  return '<span class="carico-led no-print" title="'+esc(led.msg)+'" style="display:inline-block;width:10px;height:10px;flex:0 0 auto;border-radius:50%;background:'+CARICO_COL[led.level]+'"></span>';
}
function caricoLedApply(span, led){
  if(!span) return;
  if(!led){ span.style.display='none'; span.title=''; return; }
  span.style.cssText='display:inline-block;width:10px;height:10px;flex:0 0 auto;border-radius:50%;background:'+CARICO_COL[led.level];
  span.title=led.msg;
}
function rpeDayControls(g){ const d=dayRpe(g), ld=dayLoad(g);
  return `<span class="rpe-ctl no-print" style="float:right;display:inline-flex;gap:6px;align-items:center;font-weight:400">`+
    `<label style="font-size:11px;color:var(--ink-3)">RPE</label><input class="cell-in rpe-in" type="number" min="0" max="10" step="0.5" data-rpe-day="${esc(g)}" data-rpe-f="rpe" value="${d.rpe??''}" style="width:46px" placeholder="0–10" title="${t('RPE della seduta intera (Foster) · 0–10')}">`+
    `<label style="font-size:11px;color:var(--ink-3)">min</label><input class="cell-in rpe-in" type="number" min="0" step="1" data-rpe-day="${esc(g)}" data-rpe-f="min" value="${d.min??''}" style="width:54px" placeholder="min" title="${t('Durata della seduta in minuti')}">`+
    `<span class="pill" data-rpe-load="${esc(g)}" title="${t('Carico interno seduta = RPE × min (AU)')}">${ld?nfk(ld)+' AU':'—'}</span></span>`; }
/* selettori condivisi della barra Pesi (Scheda + Training Set + pulsante 🔥 Riscaldamento/◂ Scheda),
   usati sia dalla vista scheda sia da quella riscaldamento */
function barSelettori(S){ return `
     <div class="field"><label>${t('Scheda')}</label>
       <select id="sched-mode">
         <option value="settimanale"${schedaMode==='settimanale'?' selected':''}>${t('Settimanale')}</option>
         <option value="mensile"${schedaMode==='mensile'?' selected':''}>${t('Mensile')}</option>
       </select></div>
     <div class="field"><label>Training Set</label>
       <select id="training-set" title="${t('Loadout della scheda: crea più schede (es. Palestra, Casa) e passa dall\'una all\'altra. Apri il menù per crearne, rinominarle o eliminarle')}">${S.setsOrdine.map(n=>`<option value="${esc(n)}"${n===S.setAttivo?' selected':''}>${esc(n)}</option>`).join('')}<optgroup label="${t('Azioni')}"><option value="__new__">${t('➕ Nuovo Training Set…')}</option><option value="__rename__">${t('✎ Rinomina')} «${esc(S.setAttivo)}»</option>${S.setsOrdine.length>1?`<option value="__delete__">${t('🗑 Elimina')} «${esc(S.setAttivo)}»</option>`:''}</optgroup></select></div>
     <button class="btn btn--ember" id="btn-warm" title="${t('Apri i riscaldamenti giorno per giorno di questo Training Set')}">${pesiView==='riscaldamento'?('◂ '+t('Scheda')):('🔥 '+t('Riscaldamento'))}</button>`; }
function wireBarSelettori(){
  const sm=document.getElementById('sched-mode'); if(sm) sm.onchange=e=>{schedaMode=e.target.value; renderAllenamento();};
  { const ts=document.getElementById('training-set');
    if(ts) ts.onchange=e=>{ const v=e.target.value; e.target.value=DOC.scheda.setAttivo;  /* le voci Azioni non restano selezionate */
      if(v==='__new__') nuovoTrainingSetModal();
      else if(v==='__rename__') rinominaTrainingSet();
      else if(v==='__delete__') eliminaTrainingSet();
      else switchTrainingSet(v); }; }
  const bw=document.getElementById('btn-warm'); if(bw) bw.onclick=()=>{ pesiView=(pesiView==='riscaldamento'?'scheda':'riscaldamento'); renderAllenamento(); };
}
/* ── Vista RISCALDAMENTO: i giorni sono quelli della scheda (modalità corrente), per ogni giorno
      le righe di riscaldamento del Training Set attivo. Fuori da TL/Storico/calcoli. ── */
function renderRiscaldamento(S){
  const days=schedaDays(schedaRows()), warm=riscaldaRows();
  let content='';
  if(!days.length){
    content=`<div class="callout callout--info"><div>${t('Per prima cosa aggiungi dei giorni nella scheda Pesi: i giorni del riscaldamento sono ripresi da lì.')}</div></div>`;
  } else days.forEach(g=>{
    let body='';
    warm.forEach((r,i)=>{ if(r.giorno!==g) return;
      /* le attività cardio (corsa sul tapis roulant, cyclette, ellittica…) non hanno serie e
         ripetizioni: si misurano col TEMPO. Per quelle righe serie/rip non si compilano. */
      const aTempo=isCardio(esLookup(r.esercizio));
      body+=`<tr data-wi="${i}">`+
        `<td class="l"><button type="button" class="cell-in txt warm-pick" style="min-width:150px;width:100%;text-align:left;cursor:pointer">${r.esercizio?esc(exName(r.esercizio)):`<span class="muted">${t('＋ scegli esercizio')}</span>`} <span style="opacity:.5">▾</span></button>`+
          (videoOf(r.esercizio)?`<div style="margin-top:3px"><button class="vidbtn no-print" data-vid="${esc(r.esercizio)}" title="${t('Guarda il video')}">▶</button></div>`:'')+`</td>`+
        `<td>${aTempo?`<span class="muted">—</span>`:`<input class="cell-in" data-wf="serie" type="number" min="0" step="1" value="${r.serie??''}" style="width:52px">`}</td>`+
        `<td>${aTempo?`<span class="muted">—</span>`:`<input class="cell-in" data-wf="rip" type="number" min="0" step="1" value="${r.rip??''}" style="width:56px">`}</td>`+
        `<td><input class="cell-in" data-wf="min" type="number" min="0" step="1" value="${r.min??''}" style="width:58px" placeholder="–" title="${t('Durata in minuti (per cardio e per gli esercizi a tempo)')}"></td>`+
        `<td><input class="cell-in" data-wf="note" value="${esc(r.note||'')}" style="width:100%"></td>`+
        `<td><button class="btn btn--sm btn--danger no-print" data-wdel="${i}" title="${t('elimina')}">✕</button></td></tr>`; });
    content+=`<div class="sec">${esc(t(g))}</div>
      <div class="tbl-wrap"><table>
        <thead><tr><th class="l">${t('Esercizio')}</th><th>${t('Serie')}</th><th>${t('Rip.')}</th><th>${t('Min')}</th><th class="l">${t('Note')}</th><th></th></tr></thead>
        <tbody>${body||`<tr><td colspan="6" class="empty">${t('Nessun esercizio di riscaldamento per questo giorno.')}</td></tr>`}</tbody>
      </table></div>
      <button class="btn btn--sm no-print" data-waddday="${esc(g)}">${t('＋ riscaldamento')}</button>`;
  });
  document.getElementById('panel-allenamento').innerHTML=`
   <div class="bar bar--bottom no-print">${barSelettori(S)}<div class="spacer"></div></div>
   <div class="callout callout--info"><div>${t('🔥 <b>Riscaldamento</b> del Training Set «')}${esc(S.setAttivo)}${t('». Scegli esercizi di <b>stretching</b> oppure <b>cardio di base</b> (corsa sul tapis roulant, cyclette, ellittica, vogatore…): il cardio non ha serie e ripetizioni, solo i <b>minuti</b>. Il ▶ mostra il video. Serve a prepararsi: <b>non conta nel TL né in alcun calcolo</b>. I giorni sono ripresi dalla scheda.')}</div></div>
   ${content}`;
  wireBarSelettori();
  document.querySelectorAll('#panel-allenamento [data-vid]').forEach(b=>b.onclick=()=>playVideo(b.dataset.vid));
  /* nel riscaldamento si scelgono gli esercizi di STRETCHING e le attività CARDIO di base
     (corsa sul tapis roulant, cyclette, ellittica, vogatore…): niente esercizi coi pesi. */
  document.querySelectorAll('#panel-allenamento .warm-pick').forEach(b=>b.onclick=()=>{ const i=+b.closest('tr').dataset.wi;
    pickExercise(riscaldaRows()[i].esercizio, nome=>{ const w=riscaldaRows(); if(!w[i]) return;
      w[i].esercizio=nome;
      if(isCardio(esLookup(nome))){ w[i].serie=0; w[i].rip=0; if(!(+w[i].min)) w[i].min=10; }  /* cardio: solo tempo */
      else if(!(+w[i].serie)){ w[i].serie=1; w[i].rip=10; }
      persist('scheda'); renderRiscaldamento(ensureSets()); }, e=>isStretching(e)||isCardio(e)); });
  document.querySelectorAll('#panel-allenamento [data-wf]').forEach(inp=>inp.oninput=()=>{
    const tr=inp.closest('tr'); if(!tr) return; const i=+tr.dataset.wi, w=riscaldaRows(); if(!w[i]) return;
    const f=inp.dataset.wf; w[i][f]=(f==='serie'||f==='rip'||f==='min')?(+inp.value||0):inp.value; persist('scheda'); });
  document.querySelectorAll('#panel-allenamento [data-wdel]').forEach(b=>b.onclick=()=>{ riscaldaRows().splice(+b.dataset.wdel,1); persist('scheda'); renderRiscaldamento(ensureSets()); });
  document.querySelectorAll('#panel-allenamento [data-waddday]').forEach(b=>b.onclick=()=>{ riscaldaRows().push({giorno:b.dataset.waddday,esercizio:'',serie:1,rip:10,min:0,note:''}); persist('scheda'); renderRiscaldamento(ensureSets()); });
}
function renderAllenamento(){
  const S=ensureSets();
  if(pesiView==='riscaldamento'){ renderRiscaldamento(S); return; }
  const rows=schedaRows();
  const smap=sedutaMap(rows);
  let totTL=0; rows.forEach(r=>{ totTL+=sTL(r); });
  let prevTotal=0; if(DOC.storico.length){ const mx=Math.max(...DOC.storico.map(r=>+r.scheda||0)); prevTotal=DOC.storico.filter(r=>(+r.scheda)===mx&&!r.test).reduce((a,r)=>a+sTL(r),0); }
  const deltaW=prevTotal>0? (totTL/prevTotal-1):null;
  let body='', lastDay=null; const blockSeen={}, setIdx={}, lastSetsCache={}, lastPesiCache={}, lpCache={};
  const sigCarico=caricoSignals();
  rows.forEach((r,i)=>{
    if(r.giorno && r.giorno!==lastDay){ lastDay=r.giorno;
      body+=`<tr class="day-sep"><td colspan="12">▌ ${esc(t(r.giorno))}${useRpeActive()?rpeDayControls(r.giorno):''}</td></tr>`; }
    const sd=rowSeduta(smap,r), bk=r.esercizio+'|'+sd;
    const firstOfBlock=r.esercizio && !blockSeen[bk]; if(r.esercizio) blockSeen[bk]=true;
    const m=sRM(r), p=sPct(r), tl=sTL(r);
    /* Δ TL per SET: questo set vs il set di pari posizione (stessa seduta) della scorsa scheda */
    let dperc=null, ledCarico=null;
    if(r.esercizio && !r.test){ const ix=setIdx[bk]||0; setIdx[bk]=ix+1;
      const prevSets=lastSetsCache[bk]||(lastSetsCache[bk]=lastBlockSets(r.esercizio,sd)); const pv=prevSets[ix]||0; if(pv>0) dperc=tl/pv-1;
      const prevPesi=lastPesiCache[bk]||(lastPesiCache[bk]=lastBlockPesi(r.esercizio,sd));
      const lp=lpCache[r.esercizio]||(lpCache[r.esercizio]=lastPerf(r.esercizio));
      const lastRir=(lp&&lp.rir!==''&&lp.rir!=null)? +lp.rir : null;
      ledCarico=caricoLED(r.peso, prevPesi[ix]||0, lastRir, sigCarico); }
    const [fl,fc]=fascia(p);
    const sdBadge=(r.esercizio && sd>1 && firstOfBlock)? ` <span class="pill" style="padding:0 6px" title="${t('Seduta')} ${sd} ${t('della settimana (auto)')}">S${sd}</span>`:'';
    const canUp=i>0 && rows[i-1] && rows[i-1].giorno===r.giorno, canDown=i<rows.length-1 && rows[i+1] && rows[i+1].giorno===r.giorno;
    body+=`<tr data-i="${i}"${r.test?' style="background:rgba(122,62,168,.07)"':''}>
      <td class="l"><button type="button" class="cell-in txt ex-pick" style="min-width:170px;width:100%;text-align:left;cursor:pointer">${r.esercizio?esc(exName(r.esercizio)):`<span class="muted">${t('＋ scegli esercizio')}</span>`} <span style="opacity:.5">▾</span></button>${sdBadge}
        <div style="display:flex;align-items:center;gap:5px;margin-top:3px">${videoOf(r.esercizio)?`<button class="vidbtn no-print" data-vid="${esc(r.esercizio)}" title="${t('Guarda il video')}">▶</button>`:''}${(()=>{const lp=lastPerf(r.esercizio);return lp?`<span class="muted" style="font-size:10px;line-height:1.2" title="${t('ultima registrazione (scheda')} ${lp.scheda})">${t('ult:')} ${nf(lp.peso,1)}×${nf(lp.rip,0)}${(lp.rir!==''&&lp.rir!=null)?(' · RIR '+lp.rir):''}</span>`:'';})()}<span style="flex:1"></span>${caricoLedHTML(ledCarico)}<button class="btn btn--sm no-print" data-mvup="${i}" title="${t('sposta su (nel giorno)')}"${canUp?'':' disabled'}>▲</button><button class="btn btn--sm no-print" data-mvdn="${i}" title="${t('sposta giù (nel giorno)')}"${canDown?'':' disabled'}>▼</button></div></td>
      <td class="l"><textarea class="cell-in txt note-area" data-f="note" placeholder="${t('note')}" style="min-width:90px">${esc(r.note||'')}</textarea></td>
      <td><input class="cell-in" type="number" min="0" value="${r.serie??''}" data-f="serie" style="width:48px"></td>
      <td><input class="cell-in" type="number" min="0" value="${r.rip??''}" data-f="rip" style="width:52px"></td>
      <td><input class="cell-in" type="number" min="0" step="0.5" value="${r.peso??''}" data-f="peso" style="width:60px"></td>
      <td class="rir-col"><input class="cell-in" type="number" min="0" max="10" value="${r.rir??''}" data-f="rir" style="width:42px" placeholder="–" title="Reps In Reserve · RPE=10−RIR"></td>
      <td><input class="cell-in" value="${esc(r.rest||'')}" data-f="rest" style="width:54px" placeholder="m:ss"></td>
      <td class="cell-calc num">${m?nf(m,1):'—'}</td>
      <td class="cell-calc num">${p?nf(p,1):'—'}</td>
      <td class="cell-out num">${tl?nfk(tl):'—'}</td>
      <td class="num ${dperc==null?'muted':dperc>=0?'delta-up':'delta-dn'}" title="${t('Δ TL del set vs il set di pari posizione della scorsa scheda')}">${dperc==null?'—':(dperc>=0?'▲':'▼')+' '+nf(Math.abs(dperc)*100,1)+'%'}</td>
      <td style="white-space:nowrap"><span class="fascia ${fc}">${t(fl)}</span>
        <button class="btn btn--sm no-print" data-set="${i}" title="${t('aggiungi un set a questo esercizio')}">${t('＋set')}</button>
        <button class="btn btn--sm no-print" data-test="${i}" title="${t('segna/togli test 1RM (escluso dalla progressione)')}" style="${r.test?'color:var(--violet);border-color:var(--violet)':''}">★</button>
        <button class="btn btn--sm btn--danger no-print" data-del="${i}" title="${t('elimina')}">✕</button></td>
    </tr>`;
  });
  document.getElementById('panel-allenamento').innerHTML=`
   <div class="bar bar--bottom no-print">${barSelettori(S)}
     <div class="spacer"></div>
     <button class="btn" id="btn-addrow">${t('＋ Esercizio')}</button>
     <button class="btn" id="btn-addday">${t('＋ Giorno')}</button>
     <button class="btn" id="btn-prefill" title="${t('Riprendi peso/rip/RIR dalla scorsa registrazione')}">${t('↧ Dalla scorsa')}</button>
     <button class="btn btn--ember" id="btn-save-sched">${t('💾 Salva nello Storico')}</button>
     <button class="btn btn--danger" id="btn-undo-sched">${t('↶ Annulla ultimo')}</button>
   </div>
   ${statusBanner(DOC.storico,'Storico allenamento')}
   <div class="sec">${t('Scheda '+schedaMode)} <span class="pill">${rows.length} ${t('righe-set')}</span><span class="pill" id="hdr-tottl" style="margin-left:6px">${t('TL totale')} ${nfk(totTL)}</span><span id="hdr-delta">${deltaW==null?'':`<span class="pill" style="margin-left:6px;border-color:${deltaW>=0?'var(--ok)':'var(--danger)'};color:${deltaW>=0?'var(--ok)':'var(--danger)'}">Δ ${t(schedaMode==='mensile'?'mese':'settimana')} ${deltaW>=0?'▲':'▼'} ${nf(Math.abs(deltaW)*100,1)}%</span><span class="pill muted" style="margin-left:6px" title="${t('TL totale ultima scheda salvata')}">${t('ultima')} ${nfk(prevTotal)}</span>`}</span></div>
   <div class="tbl-wrap"><table class="${useRirActive()?'':'hide-rir'}">
     <thead><tr><th class="l">${t('Esercizio')}</th><th class="l">${t('Note')}</th><th>${t('Serie')}</th><th>${t('Rip.')}</th><th>${t('Peso')}</th><th class="rir-col" title="Reps In Reserve (RPE=10−RIR)">RIR</th><th>${t('Rest')}</th><th>1RM</th><th>%1RM</th><th>TL</th><th title="${t('Δ del carico del set vs lo stesso set (pari posizione) della scorsa scheda')}">Δ TL set</th><th>${t('Fascia / azioni')}</th></tr></thead>
     <tbody>${body||`<tr><td colspan="12" class="empty">${t('Nessun esercizio. Aggiungine uno o un giorno.')}</td></tr>`}</tbody>
   </table></div>
   <div class="callout callout--info"><div>${t('🧮 <b>1RM</b>=Peso·(1+Rip/30) · <b>%1RM</b>=Peso/1RM · <b>TL</b>=Serie·Rip·Peso·(%1RM/100)·Fattore · <b>ΔTL set</b>: ogni set confrontato col set di pari posizione (1° vs 1°, 2° vs 2°…) della stessa seduta nella scorsa scheda. Ripeti lo stesso esercizio con <b>＋set</b> per i set incrementali; se compare in un secondo giorno della settimana diventa automaticamente <b>S2</b>. <b>★</b>=test 1RM (escluso dalla progressione). Il <b>pallino</b> accanto alle frecce ▲▼ dell\'esercizio è un suggerimento del co-pilota sul Peso (<span style="color:var(--ok)">🟢</span> progressione sensata · <span style="color:#c9961f">🟡</span> attenzione · <span style="color:var(--danger)">🔴</span> salto troppo grande o meglio scaricare): passaci sopra per il perché. <b>Non scrive nulla</b>, decidi tu.')}</div></div>`;
  wireBarSelettori();
  // auto-resize note textareas
  document.getElementById('panel-allenamento').addEventListener('input', e=>{
    if(e.target.classList.contains('note-area')){
      e.target.style.height='auto';
      e.target.style.height=e.target.scrollHeight+'px';
    }
  });
  // init height on existing note textareas
  document.querySelectorAll('.note-area').forEach(t=>{ t.style.height='auto'; t.style.height=t.scrollHeight+'px'; });
  document.getElementById('btn-addrow').onclick=aggiungiEsercizioModal;
  document.getElementById('btn-addday').onclick=addDay;
  { const pf=document.getElementById('btn-prefill'); if(pf) pf.onclick=()=>{ if(confirm(t('Precompilo peso/rip/RIR dalla scorsa registrazione di ogni esercizio? Sovrascrive i valori attuali della scheda.'))) prefillFromLast(); }; }
  document.getElementById('btn-save-sched').onclick=saveSchedaModal;
  document.getElementById('btn-undo-sched').onclick=undoScheda;
  document.querySelectorAll('#panel-allenamento input').forEach(inp=>{
    inp.addEventListener('input',e=>{
      const tr=e.target.closest('tr'); if(!tr||tr.dataset.i==null)return; const i=+tr.dataset.i; const f=e.target.dataset.f;
      let v=e.target.value; if(['serie','rip','peso','rir'].includes(f)) v=v===''?'':+v;
      schedaRows()[i][f]=v; persist('scheda');
      if(['serie','rip','peso','rir'].includes(f)) refreshSchedaCalc();  /* aggiornamento dal vivo, mantiene il focus */
    });
  });
  document.querySelectorAll('#panel-allenamento [data-rpe-day]').forEach(inp=>inp.addEventListener('input',e=>{
    const g=e.target.dataset.rpeDay, fld=e.target.dataset.rpeF, m=schedaRpe();
    if(!m[g])m[g]={}; m[g][fld]=e.target.value===''?'':+e.target.value; persist('scheda');
    const badge=document.querySelector('#panel-allenamento [data-rpe-load="'+g+'"]'); if(badge){ const ld=dayLoad(g); badge.textContent=ld?nfk(ld)+' AU':'—'; }
  }));
  document.querySelectorAll('#panel-allenamento [data-vid]').forEach(b=>b.onclick=()=>playVideo(b.dataset.vid));
  document.querySelectorAll('#panel-allenamento .ex-pick').forEach(b=>b.onclick=()=>{
    const tr=b.closest('tr'); const i=+tr.dataset.i;
    pickExercise(schedaRows()[i].esercizio, nome=>{ schedaRows()[i].esercizio=nome; persist('scheda'); renderAllenamento(); }, e=>!isCardio(e)&&!isStretching(e)); });
  document.querySelectorAll('#panel-allenamento [data-set]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.set, r=schedaRows()[i];
    schedaRows().splice(i+1,0,{giorno:r.giorno,esercizio:r.esercizio,note:'',serie:r.serie,rip:r.rip,peso:r.peso,rest:r.rest}); persist('scheda'); renderAllenamento(); });
  document.querySelectorAll('#panel-allenamento [data-test]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.test; schedaRows()[i].test=!schedaRows()[i].test; persist('scheda'); renderAllenamento(); });
  document.querySelectorAll('#panel-allenamento [data-del]').forEach(b=>b.onclick=()=>{ schedaRows().splice(+b.dataset.del,1); persist('scheda'); renderAllenamento(); });
  /* riordino esercizi dentro il giorno (scambia con la riga adiacente dello stesso giorno) */
  document.querySelectorAll('#panel-allenamento [data-mvup]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.mvup, r=schedaRows(); if(i>0&&r[i-1].giorno===r[i].giorno){ const t=r[i-1]; r[i-1]=r[i]; r[i]=t; persist('scheda'); renderAllenamento(); } });
  document.querySelectorAll('#panel-allenamento [data-mvdn]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.mvdn, r=schedaRows(); if(i<r.length-1&&r[i+1].giorno===r[i].giorno){ const t=r[i+1]; r[i+1]=r[i]; r[i]=t; persist('scheda'); renderAllenamento(); } });
  updateStatusDots();
  document.querySelectorAll('.note-area').forEach(t=>{ t.style.height='auto'; t.style.height=t.scrollHeight+'px'; });
}
let rerenderT=null; /* timer condiviso del re-render ritardato (usato da Pesi e Alimentazione) */
function weekPrev(code){ let a=Math.floor(code/100), s=code%100; return s>1? a*100+(s-1) : (a-1)*100+52; }
function aggStatus(arr){ const codes=(arr||[]).map(r=>+r.scheda||0).filter(x=>x>0);
  const last=codes.length?Math.max(...codes):0; const w=isoWeek(new Date()); const cur=schedaCode(w.anno,w.sett); const prev=weekPrev(cur);
  return {ok:last>=prev, last, cur, prev}; }
function statusBanner(arr,label){ const s=aggStatus(arr);
  if(s.ok) return `<div class="callout no-print" style="margin:0 0 12px;background:var(--ok-t);border-color:#bcdcc6;border-left-color:var(--ok)"><div>✓ <b>${t(label)} ${t('aggiornato')}</b> · ${t('ultima registrazione: settimana')} <b>${s.last}</b> (${t('corrente')} ${s.cur}).</div></div>`;
  const what=s.last?`${t('l\'ultima è la settimana')} <b>${s.last}</b>`:t('non ci sono ancora registrazioni');
  return `<div class="callout no-print" style="margin:0 0 12px;background:var(--danger-t);border-color:#e6b8b8;border-left-color:var(--danger)"><div>⚠ <b>${t(label)} ${t('da aggiornare')}</b> · ${what}; ${t('manca almeno la settimana precedente')} (<b>${s.prev}</b>). ${t('Ricordati di salvare.')}</div></div>`;
}
function updateStatusDots(){ const so=aggStatus(DOC.storico), bo=aggStatus(DOC.storico_io);
  const ds=document.getElementById('dot-storico'), dm=document.getElementById('dot-misure');
  if(ds){ ds.style.color=so.ok?'var(--ok-b)':'var(--danger-b)'; ds.title=so.ok?(t('Storico aggiornato (ultima')+' '+so.last+')'):(t('Storico da aggiornare — manca la settimana')+' '+so.prev); }
  if(dm){ dm.style.color=bo.ok?'var(--ok-b)':'var(--danger-b)'; dm.title=bo.ok?(t('Misure aggiornate (ultima')+' '+bo.last+')'):(t('Misure da aggiornare — manca la settimana')+' '+bo.prev); }
}
function refreshSchedaCalc(){
  const rows=schedaRows(), smap=sedutaMap(rows);
  let totTL=0; const setIdx={}, lastSetsCache={}, lastPesiCache={}, lpCache={};
  const sigCarico=caricoSignals();
  document.querySelectorAll('#panel-allenamento tbody tr[data-i]').forEach(tr=>{
    const i=+tr.dataset.i, r=rows[i]; if(!r)return; const c=tr.children;
    const m=sRM(r), p=sPct(r), tl=sTL(r), fa=fascia(p);
    totTL+=tl;
    if(c[7])c[7].textContent=m?nf(m,1):'—';
    if(c[8])c[8].textContent=p?nf(p,1):'—';
    if(c[9])c[9].textContent=tl?nfk(tl):'—';
    const fsp=c[11]&&c[11].querySelector('.fascia'); if(fsp){fsp.className='fascia '+fa[1]; fsp.textContent=t(fa[0]);}
    const sd=rowSeduta(smap,r), bk=r.esercizio+'|'+sd;
    let dperc=null, ledCarico=null;
    if(r.esercizio && !r.test){ const ix=setIdx[bk]||0; setIdx[bk]=ix+1;
      const prevSets=lastSetsCache[bk]||(lastSetsCache[bk]=lastBlockSets(r.esercizio,sd)); const pv=prevSets[ix]||0; if(pv>0) dperc=tl/pv-1;
      const prevPesi=lastPesiCache[bk]||(lastPesiCache[bk]=lastBlockPesi(r.esercizio,sd));
      const lp=lpCache[r.esercizio]||(lpCache[r.esercizio]=lastPerf(r.esercizio));
      const lastRir=(lp&&lp.rir!==''&&lp.rir!=null)? +lp.rir : null;
      ledCarico=caricoLED(r.peso, prevPesi[ix]||0, lastRir, sigCarico); }
    if(c[10]){ c[10].className='num '+(dperc==null?'muted':dperc>=0?'delta-up':'delta-dn'); c[10].textContent=dperc==null?'—':(dperc>=0?'▲':'▼')+' '+nf(Math.abs(dperc)*100,1)+'%'; }
    caricoLedApply(tr.querySelector('.carico-led'), ledCarico);
  });
  let prevTotal=0; if(DOC.storico.length){ const mx=Math.max(...DOC.storico.map(r=>+r.scheda||0)); prevTotal=DOC.storico.filter(r=>(+r.scheda)===mx&&!r.test).reduce((a,r)=>a+sTL(r),0); }
  const deltaW=prevTotal>0?(totTL/prevTotal-1):null;
  const ht=document.getElementById('hdr-tottl'); if(ht)ht.textContent=t('TL totale')+' '+nfk(totTL);
  const hd=document.getElementById('hdr-delta'); if(hd)hd.innerHTML=deltaW==null?'':`<span class="pill" style="margin-left:6px;border-color:${deltaW>=0?'var(--ok)':'var(--danger)'};color:${deltaW>=0?'var(--ok)':'var(--danger)'}">Δ ${t(schedaMode==='mensile'?'mese':'settimana')} ${deltaW>=0?'▲':'▼'} ${nf(Math.abs(deltaW)*100,1)}%</span><span class="pill muted" style="margin-left:6px">${t('ultima')} ${nfk(prevTotal)}</span>`;
}
/* ＋ Esercizio: chiede in quale giorno aggiungerlo e lo inserisce in fondo a quel giorno
   (se il giorno non esiste ancora, crea la sezione). */
function aggiungiEsercizioModal(){
  const rows=schedaRows(); const def=(rows.length?rows[rows.length-1].giorno:'')||'Lunedì';
  modal(`<h3>${t('Aggiungi esercizio')}</h3>
    <div class="field"><label>${t('In quale giorno?')}</label><select id="m-day">${GIORNI.map(g=>`<option value="${g}"${g===def?' selected':''}>${t(g)}</option>`).join('')}</select></div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">${t('Annulla')}</button><button class="btn btn--ember" id="m-ok">${t('Aggiungi')}</button></div>`);
  document.getElementById('m-ok').onclick=()=>{ const g=document.getElementById('m-day').value; closeModal();
    const r=schedaRows(), nuova={giorno:g,esercizio:'',note:'',serie:3,rip:10,peso:0,rest:'1:30'};
    let last=-1; r.forEach((x,i)=>{ if(x.giorno===g) last=i; });
    if(last>=0) r.splice(last+1,0,nuova); else r.push(nuova);
    persist('scheda'); renderAllenamento(); };
}
function addDay(){
  modal(`<h3>${t('Aggiungi giorno')}</h3>
    <div class="field"><label>${t('Giorno')}</label><select id="m-day">${GIORNI.map(g=>`<option value="${g}">${t(g)}</option>`).join('')}</select></div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">${t('Annulla')}</button>
    <button class="btn btn--ember" id="m-ok">${t('Aggiungi')}</button></div>`);
  document.getElementById('m-ok').onclick=()=>{ const g=document.getElementById('m-day').value;
    schedaRows().push({giorno:g,esercizio:'',note:'',serie:3,rip:10,peso:0,rest:'1:30'}); persist('scheda'); closeModal(); renderAllenamento(); };
}
function saveSchedaModal(){
  const w=isoWeek(new Date());
  const _pad=n=>String(n).padStart(2,'0'); const wk=w.anno+'-W'+_pad(w.sett);
  modal(`<h3>${t('💾 Salva scheda nello Storico')}</h3>
    <p class="muted" style="font-size:13px;margin:0 0 8px">${t('Scegli la <b>settimana</b> dal calendario (oppure regola Anno/Settimana). Codice = Anno·100 + Settimana.')}</p>
    <div class="field"><label>${t('Settimana (calendario)')}</label><input id="m-week" type="week" value="${wk}" style="width:100%"></div>
    <div class="row"><div class="field"><label>${t('Anno')}</label><input id="m-anno" type="number" value="${w.anno}"></div>
      <div class="field"><label>${t('Settimana ISO')}</label><input id="m-sett" type="number" min="1" max="53" value="${w.sett}"></div></div>
    <p class="muted" style="font-size:13px;margin:6px 0 0">${t('Codice scheda:')} <b id="m-codeprev">${schedaCode(w.anno,w.sett)}</b></p>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">${t('Annulla')}</button>
      <button class="btn btn--ember" id="m-ok">${t('Salva')}</button></div>`);
  const _upd=()=>{ const a=+document.getElementById('m-anno').value, st=+document.getElementById('m-sett').value; const cp=document.getElementById('m-codeprev'); if(cp&&a&&st>=1&&st<=53) cp.textContent=schedaCode(a,st); };
  { const wkEl=document.getElementById('m-week'); if(wkEl) wkEl.onchange=()=>{ const m=/^(\d{4})-W(\d{1,2})$/.exec(wkEl.value||''); if(m){ document.getElementById('m-anno').value=+m[1]; document.getElementById('m-sett').value=+m[2]; _upd(); } }; }
  ['m-anno','m-sett'].forEach(id=>{ const el=document.getElementById(id); if(el) el.oninput=()=>{ const a=+document.getElementById('m-anno').value, st=+document.getElementById('m-sett').value; const wkEl=document.getElementById('m-week'); if(wkEl&&a&&st>=1&&st<=53) wkEl.value=a+'-W'+_pad(st); _upd(); }; });
  document.getElementById('m-ok').onclick=()=>{
    const anno=+document.getElementById('m-anno').value, sett=+document.getElementById('m-sett').value;
    if(!anno||sett<1||sett>53){alert(t('Anno/settimana non validi'));return;}
    const code=schedaCode(anno,sett);
    const exist=DOC.storico.filter(r=>(+r.scheda)===code).length;
    if(exist && !confirm(t('Esiste già la scheda')+' '+code+' ('+exist+' '+t('righe). Le nuove righe verranno AGGIUNTE. Procedo?'))) return;
    const preMax={}; DOC.storico.forEach(r=>{ if(r.esercizio)preMax[r.esercizio]=Math.max(preMax[r.esercizio]||0,+r.peso||0); });
    let added=0; const smap=sedutaMap(schedaRows()); const prs={};
    schedaRows().forEach(r=>{ if(!r.esercizio||!String(r.esercizio).trim())return;
      const pe=+r.peso||0; if(pe>0 && pe>(preMax[r.esercizio]||0)) prs[r.esercizio]=Math.max(prs[r.esercizio]||0,pe);
      /* `set`: Training Set con cui è stata svolta la settimana — serve al selettore dei
         Progressi per analizzare un percorso alla volta (righe più vecchie: campo assente). */
      DOC.storico.push({scheda:code,esercizio:r.esercizio,seduta:rowSeduta(smap,r),test:!!r.test,
        macro:gruppoOf(r.esercizio),serie:+r.serie||0,rip:+r.rip||0,peso:+r.peso||0,rest:r.rest||'',
        rir:(r.rir===''||r.rir==null)?null:+r.rir,set:(ensureSets()||{}).setAttivo||''}); added++; });
    /* Foster: committa il carico interno dei giorni allenati in storico_rpe e azzera la bozza RPE della modalità salvata */
    if(useRpeActive()){ const days=schedaDays(schedaRows()), draft=schedaRpe();
      if(!Array.isArray(DOC.storico_rpe)) DOC.storico_rpe=[];
      days.forEach(g=>{ const d=draft[g]||{}, rp=+d.rpe||0, mn=+d.min||0;
        DOC.storico_rpe=DOC.storico_rpe.filter(x=>!((+x.scheda)===code && x.giorno===g));
        if(rp>0&&mn>0) DOC.storico_rpe.push({scheda:code,giorno:g,rpe:rp,min:mn,set:(ensureSets()||{}).setAttivo||''}); });
      DOC.scheda.rpe[schedaMode]={}; persist('corpo'); }
    /* minuti di CARDIO del riscaldamento della settimana (scelta di Marco 2026-08-15):
       entrano SOLO nel radar «Volume ed equilibrio», MAI in TL, ACWR, monotonia o sRPE —
       per questo vivono in un array a parte (storico_risc) che nessun calcolo di carico legge. */
    { if(!Array.isArray(DOC.storico_risc)) DOC.storico_risc=[];
      DOC.storico_risc=DOC.storico_risc.filter(x=>(+x.scheda)!==code);
      const gg=schedaDays(schedaRows()), setNome=(ensureSets()||{}).setAttivo||'';
      riscaldaRows().forEach(r=>{ const mn=+r.min||0;
        if(mn>0 && gg.indexOf(r.giorno)>=0 && isCardio(esLookup(r.esercizio)))
          DOC.storico_risc.push({scheda:code,giorno:String(r.giorno||''),esercizio:String(r.esercizio||''),min:mn,set:setNome}); });
      persist('corpo'); }
    persist('scheda'); persist('storico'); closeModal();
    const prk=Object.keys(prs);
    let _msg=t('✔ Scheda')+' '+code+' '+t('salvata —')+' '+added+' '+t('esercizi aggiunti allo Storico.');
    if(prk.length) _msg+='\n\n'+t('🎉 Nuovo record:')+' '+prk.map(k=>exName(k)+' '+nf(prs[k],1)+' kg').join(', ');
    alert(_msg);
    if(curTab==='storico')renderStorico(); else renderAllenamento(); updateStatusDots();
  };
}
function undoScheda(){
  if(!DOC.storico.length){alert(t('Storico vuoto.'));return;}
  const maxS=Math.max(...DOC.storico.map(r=>+r.scheda||0));
  const n=DOC.storico.filter(r=>(+r.scheda)===maxS).length;
  if(!confirm(t('Elimino l\'ultima scheda salvata (')+maxS+', '+n+' '+t('righe)? Operazione non annullabile.')))return;
  DOC.storico=DOC.storico.filter(r=>(+r.scheda)!==maxS); persist('storico');
  alert(t('✔ Scheda')+' '+maxS+' '+t('eliminata (')+n+' '+t('righe).')); if(curTab==='storico')renderStorico(); else renderAllenamento(); updateStatusDots();
}

