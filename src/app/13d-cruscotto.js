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
/* riga di sintesi (grigia) sotto il nome del profilo: ACWR · aggiornamento · monotonia · PR */
function semaforoSummaryHTML(tg){
  if(!tg.hasData) return `<span style="color:var(--ink-3)">${t('nessun dato registrato')}</span>`;
  const acwrCol=tg.acwr==null?'var(--ink-3)':(tg.acwr>1.5?'var(--danger)':((tg.acwr<0.8||tg.acwr>1.3)?'#c9961f':'var(--ok)'));
  const acwrTxt=tg.acwr==null?'—':nf(tg.acwr,2);
  const stTxt=tg.stale==null?`<span style="color:var(--danger)">${t('mai aggiornata')}</span>`:(tg.stale<=0?`<span style="color:var(--ok)">${t('questa sett.')}</span>`:(tg.stale>=3?`<span style="color:var(--danger)">${tg.stale} ${t('sett. fa')}</span>`:(tg.stale===2?`<span style="color:#c9961f">2 ${t('sett. fa')}</span>`:`1 ${t('sett. fa')}`)));
  const monoTxt=tg.hasRpe?` · 📊 mono <b style="color:${tg.monoHigh?'var(--danger)':'inherit'}">${tg.mono==null?'—':nf(tg.mono,2)}</b>`:'';
  const prTxt=tg.prs&&tg.prs.length?` · <span style="color:var(--ok)" title="${esc(tg.prs.slice(0,5).map(p=>exName(p.nome)+' '+nf(p.peso,0)+' kg').join(' · '))}">🎉 ${tg.prs.length} PR</span>`:'';
  return `⚖ ACWR <b style="color:${acwrCol}">${acwrTxt}</b> · 🏋 ${stTxt}${monoTxt}${prTxt}`;
}
/* testo del tooltip sul pallino: perché è di quel colore */
function semaforoTitolo(tg){
  if(!tg.hasData) return t('⚪ Nessun dato registrato per questo profilo');
  const m=[];
  if(tg.level==='danger'){
    if(tg.acwr!=null&&tg.acwr>1.5) m.push(t('carico alto (ACWR')+' '+nf(tg.acwr,2)+')');
    if(tg.stale!=null&&tg.stale>=3) m.push(t('scheda ferma da')+' '+tg.stale+' '+t('settimane'));
    if(tg.monoHigh&&tg.acwr!=null&&tg.acwr>1.3) m.push(t('monotonia alta col carico elevato'));
    return t('🔴 A rischio:')+' '+(m.join(' · ')||t('segnali critici'));
  }
  if(tg.level==='warn'){
    if(tg.acwr!=null&&(tg.acwr>1.3||tg.acwr<0.8)) m.push(t('ACWR fuori zona (')+nf(tg.acwr,2)+')');
    if(tg.stale!=null&&tg.stale>=2) m.push(t('scheda ferma da')+' '+tg.stale+' '+t('settimane'));
    if(tg.monoHigh) m.push(t('monotonia alta'));
    return t('🟡 Attenzione:')+' '+(m.join(' · ')||t('da tenere d\'occhio'));
  }
  return t('🟢 Tutto in zona e aggiornato');
}
/* riempie i segnaposto (pallino + sintesi) già presenti in ogni riga profilo */
function applicaSemafori(dati){
  (dati||[]).forEach(tg=>{
    const led=document.getElementById('cr-led-'+tg.slug);
    if(led){ led.textContent=CR_LED[tg.level]; led.style.color=CR_COL[tg.level]; led.title=semaforoTitolo(tg); }
    const sum=document.getElementById('cr-sum-'+tg.slug);
    if(sum) sum.innerHTML=semaforoSummaryHTML(tg);
  });
}
let cruscottoCache=null, cruscottoTime=0, cruscottoGen=0;
function cruscottoInvalida(){ cruscottoCache=null; }   /* forza il ricalcolo al prossimo render (dati cambiati) */
/* calcola i triage e li dipinge sulle righe profilo (sola lettura). Cache breve per non
   rileggere il disco a ogni apertura/chiusura di una tendina; «force» salta la cache. */
async function aggiornaSemafori(force){
  if(cruscottoCache) applicaSemafori(cruscottoCache);             /* paint istantaneo dall'ultimo calcolo */
  if(!force && cruscottoCache && (Date.now()-cruscottoTime)<1500) return;
  const gen=++cruscottoGen;
  let dati; try{ dati=await cruscottoDati(); }catch(e){ logErrore('cruscotto', e); return; }
  if(gen!==cruscottoGen) return;                                 /* un render più recente ha già preso il posto */
  cruscottoCache=dati; cruscottoTime=Date.now();
  applicaSemafori(dati);
}
