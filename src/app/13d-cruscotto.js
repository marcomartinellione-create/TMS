/* ════════════════ CRUSCOTTO CLIENTI (triage multi-profilo, SOLA LETTURA) ════════════════
   In cima al tab Profilo: tutti i profili a colpo d'occhio con un semaforo di rischio
   (🟢 ok · 🟡 attenzione · 🔴 a rischio · ⚪ senza dati), ACWR, settimane dall'ultimo
   aggiornamento, monotonia (se il profilo ha gli RPE attivi) e PR recenti.
   NON scrive nulla: legge i file dei profili non attivi e riusa i calcoli esistenti
   (schedeAggr/ACWR, fosterWeek/monotonia, aggStatus) scambiando temporaneamente DOC,
   in modo sincrono e con ripristino garantito (nessuna await tra scambio e ripristino).
   Soglie del semaforo (documentate, decise con Marco il 2026-06-17):
     🔴 ACWR > 1.5  ·  scheda ferma da ≥ 3 settimane  ·  monotonia > 2 con carico acuto alto (ACWR > 1.3)
     🟡 ACWR 1.3–1.5 oppure < 0.8  ·  scheda ferma da 2 settimane  ·  monotonia > 2
     🟢 ACWR in zona 0.8–1.3, aggiornato (≤ 1 settimana), nessun segnale
   I PR recenti sono un badge positivo: non cambiano il colore. */

/* legge scheda+storico+corpo+alimentazione di un profilo qualsiasi (anche non attivo), senza toccare DOC */
async function readProfileFull(slug){
  if(slug===activeProfile) return docProfileData();
  if(dataDir){
    try{
      const pd=await dataDir.getDirectoryHandle(slug,{create:false});
      const sc=await readJson(pd,FILES.scheda), st=await readJson(pd,FILES.storico),
            co=await readJson(pd,FILES.corpo), al=await readJson(pd,FILES.alimentazione);
      return {scheda:sc||{settimanale:[],mensile:[]}, storico:st||[],
        storico_io:(co&&co.storico_io)||[], storico_rpe:(co&&co.storico_rpe)||[],
        cardio:(co&&co.cardio)||[], dati_utente:(co&&co.dati_utente)||{},
        alimentazione:al||{bulk:[],mant:[],cut:[]}};
    }catch(e){ return blankDOC(); }
  }
  let all={}; try{ all=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}'); }catch(e){}
  const d=(all.data||{})[slug]; return d? Object.assign(blankDOC(), d) : blankDOC();
}

/* quante settimane fa cade un codice-settimana YYYYWW rispetto a oggi (null se assente) */
function settimaneFa(code){ code=+code||0; if(!code) return null;
  const anno=Math.floor(code/100), sett=code%100; if(sett<1||sett>53) return null;
  const w=isoWeek(new Date());
  return Math.round((isoWeekMonday(w.anno,w.sett)-isoWeekMonday(anno,sett))/(7*86400000)); }

/* esercizi che nell'ultima settimana registrata battono il massimo peso delle settimane precedenti
   (richiede una settimana precedente: un primo carico in assoluto non è un «PR recente») */
function prUltimaSettimana(){
  const codes=DOC.storico.map(r=>+r.scheda||0).filter(x=>x>0); if(!codes.length) return [];
  const ultima=Math.max(...codes); const prima={}, ora={};
  DOC.storico.forEach(r=>{ if(r.test||!r.esercizio) return; const pe=+r.peso||0; if(pe<=0) return; const s=+r.scheda||0;
    if(s<ultima) prima[r.esercizio]=Math.max(prima[r.esercizio]||0, pe);
    else if(s===ultima) ora[r.esercizio]=Math.max(ora[r.esercizio]||0, pe); });
  const out=[]; Object.keys(ora).forEach(n=>{ if((prima[n]||0)>0 && ora[n]>prima[n]) out.push({nome:n, peso:ora[n]}); });
  return out.sort((a,b)=>b.peso-a.peso);
}

/* decisione del semaforo (pura, testabile): {hasData, acwr, stale, monoHigh} → livello */
function cruscottoLivello(t){
  t=t||{};
  if(!t.hasData) return 'none';
  const a=t.acwr, st=t.stale;
  if((a!=null && a>1.5) || (st!=null && st>=3) || (t.monoHigh && a!=null && a>1.3)) return 'danger';
  if((a!=null && (a>1.3 || a<0.8)) || (st!=null && st>=2) || t.monoHigh) return 'warn';
  return 'ok';
}

/* triage del profilo i cui dati sono ATTUALMENTE in DOC (sincrono, nessuna await) */
function triageCorrente(slug){
  const p=profili.find(x=>x.slug===slug)||{};
  const ag=schedeAggr();
  let acwr=null;
  if(ag.length){ const w=ag.slice(-4); const c=w.reduce((s,x)=>s+x.tl,0)/w.length; acwr=c? ag[ag.length-1].tl/c : null; }
  let mono=null, internal=0;
  if(ag.length){ const rpw=rpeByWeek(); const lc=ag[ag.length-1].scheda; const f=fosterWeek(rpw[lc]&&rpw[lc].day); mono=f.monotony; internal=f.load; }
  const hasRpe=useRpeActive() && internal>0;
  const monoHigh=hasRpe && mono!=null && mono>2;
  const st=aggStatus(DOC.storico), bo=aggStatus(DOC.storico_io);
  const stale=settimaneFa(st.last), staleBody=settimaneFa(bo.last);
  const prs=prUltimaSettimana();
  const hasData=ag.length>0 || st.last>0;
  return {slug, nome:p.nome||slug, level:cruscottoLivello({hasData,acwr,stale,monoHigh}),
    acwr, mono, hasRpe, monoHigh, stale, staleBody, prs, hasData};
}

/* raccoglie i triage di TUTTI i profili (read-only); ordina dal più critico al più tranquillo */
async function cruscottoDati(){
  const slugs=profili.map(p=>p.slug);
  const datas=await Promise.all(slugs.map(s=>readProfileFull(s).catch(()=>blankDOC())));
  const save=docProfileData();                 /* riferimenti ai dati del profilo attivo: da ripristinare */
  const out=[];
  try{ slugs.forEach((slug,i)=>{ applyProfileData(datas[i]); out.push(triageCorrente(slug)); }); }
  finally{ applyProfileData(save); }            /* DOC torna esattamente al profilo attivo */
  const peso={danger:0, warn:1, ok:2, none:3};
  return out.sort((a,b)=> (peso[a.level]-peso[b.level]) || ((b.stale||0)-(a.stale||0)) || String(a.nome).localeCompare(String(b.nome)));
}

const CR_COL={danger:'var(--danger)', warn:'#c9961f', ok:'var(--ok)', none:'var(--ink-3)'};
const CR_LED={danger:'🔴', warn:'🟡', ok:'🟢', none:'⚪'};
function cruscottoCardHTML(t){
  const acwrTxt=t.acwr==null?'—':nf(t.acwr,2);
  const acwrCol=t.acwr==null?'var(--ink-3)':(t.acwr>1.5?'var(--danger)':((t.acwr<0.8||t.acwr>1.3)?'#c9961f':'var(--ok)'));
  const stTxt=t.stale==null?'<b style="color:var(--ink-3)">mai</b>':(t.stale<=0?'<b style="color:var(--ok)">questa sett.</b>':(t.stale>=3?`<b style="color:var(--danger)">${t.stale} sett. fa</b>`:(t.stale===2?`<b style="color:#c9961f">2 sett. fa</b>`:'1 sett. fa')));
  const monoTxt=t.hasRpe?` · 📊 monotonia <b style="color:${t.monoHigh?'var(--danger)':'var(--ink)'}">${t.mono==null?'—':nf(t.mono,2)}</b>`:'';
  const prTxt=t.prs&&t.prs.length?`<span class="pill" title="${esc(t.prs.slice(0,5).map(p=>p.nome+' '+nf(p.peso,0)+' kg').join(' · '))}" style="border-color:var(--ok);color:var(--ok)">🎉 ${t.prs.length} PR</span>`:'';
  return `<div class="cr-card" style="border:1px solid var(--border);border-left:5px solid ${CR_COL[t.level]};border-radius:7px;padding:9px 12px;background:var(--paper-2)">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:14px">${CR_LED[t.level]}</span>
      <span style="font-family:var(--font-disp);font-size:16px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">👤 ${esc(t.nome)}</span>
      ${prTxt}
    </div>
    <div class="muted" style="font-size:12.5px;margin-top:6px;line-height:1.55">
      ⚖ ACWR <b style="color:${acwrCol}">${acwrTxt}</b> · 🏋 ${stTxt}${monoTxt}
    </div>
    <div class="bar no-print" style="margin-top:7px">
      <button class="btn" data-cropen="${esc(t.slug)}" style="font-size:12px;padding:4px 11px" title="Attiva ${esc(t.nome)} e apri i Progressi">Apri →</button>
    </div></div>`;
}
function cruscottoHTML(dati){
  if(!dati.length) return '';
  const head=`<div class="sec no-print" style="margin-top:0">▌ 🚦 Cruscotto clienti</div>
    <div class="callout callout--info no-print"><div>Stato di ogni cliente a colpo d'occhio, <b>sola lettura</b>: <b style="color:var(--ok)">🟢 ok</b> · <b style="color:#c9961f">🟡 attenzione</b> · <b style="color:var(--danger)">🔴 a rischio</b> (carico alto, monotonia o scheda ferma) · ⚪ senza dati. «Apri» attiva il cliente e mostra i Progressi. <a href="#" id="cr-refresh" style="color:var(--ember-2)">🔄 aggiorna</a></div></div>
    <div class="cards no-print" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));margin-bottom:8px">${dati.map(cruscottoCardHTML).join('')}</div>`;
  const nota=dati.length===1?`<div class="muted no-print" style="font-size:12px;margin:-2px 0 10px">Il cruscotto dà il meglio con più clienti: crea altri profili per vederli tutti qui.</div>`:'';
  return head+nota;
}
function wireCruscotto(box){
  box.querySelectorAll('[data-cropen]').forEach(b=>b.onclick=async()=>{ const slug=b.dataset.cropen;
    if(slug!==activeProfile){ await switchProfile(slug); } showTab('progressi'); });
  const r=box.querySelector('#cr-refresh'); if(r) r.onclick=ev=>{ ev.preventDefault(); renderCruscotto(true); };
}
let cruscottoCache=null, cruscottoTime=0, cruscottoGen=0;
function cruscottoInvalida(){ cruscottoCache=null; }   /* forza il ricalcolo al prossimo render (dati cambiati) */
async function renderCruscotto(force){
  const box=document.getElementById('cruscotto-box'); if(!box) return;
  if(cruscottoCache!=null){ box.innerHTML=cruscottoCache; wireCruscotto(box);
    if(!force && (Date.now()-cruscottoTime)<1500) return; }   /* paint istantaneo + niente riletture a raffica sui toggle */
  else box.innerHTML='<div class="muted no-print" style="padding:6px 2px">🚦 Cruscotto clienti — calcolo…</div>';
  const gen=++cruscottoGen;
  let dati; try{ dati=await cruscottoDati(); }catch(e){ logErrore('cruscotto', e); return; }
  if(gen!==cruscottoGen) return;                               /* un render più recente ha già preso il posto */
  const b2=document.getElementById('cruscotto-box'); if(!b2) return;
  cruscottoCache=cruscottoHTML(dati); cruscottoTime=Date.now();
  b2.innerHTML=cruscottoCache; wireCruscotto(b2);
}
