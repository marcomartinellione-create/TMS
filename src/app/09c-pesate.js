/* ════════════════ PESATE DELLA BILANCIA (dal telefono collegato) ════════════════
   2026-11-15, richiesta di Marco: la bilancia Bluetooth (famiglia FitDays/iComon) parla con
   l'app «TMS Scheda» sul telefono, che registra ogni pesata e la manda da sola al PC
   attraverso l'hub del TMS (15c-telefono.js). Quando arriva, qui:
   - ogni pesata entra in DOC.pesate (corpo.json). Quelle già arrivate (stesso id) non si
     doppiano; quelle tolte col 🗑 (id in DOC.pesate_scartate) non tornano più;
   - per ogni settimana ISO con almeno una pesata nuova si scrive nello Storico misure
     (storico_io) la MEDIA della settimana, senza passare da «💾 Salva misure»: una pesata per
     giorno, la prima (la prima completa, se quel giorno ce n'è una con la composizione). La
     riga porta `n_pesate`, che la distingue da una misura scritta a mano: quella si
     sostituisce solo dopo una domanda;
   - i campi del tab Corpo prendono i valori dell'ultima pesata, se è la più recente.
   REGOLA DEI DATI GREZZI (Marco, 27/11/2026: «tutti i dati vengono salvati come tali e non come risultato di calcoli»):
   della pesata si salvano peso, impedenze (imp), battito e il contesto della misura (altezza, età e sesso che la bilancia
   ha usato, dal telefono 1.10.0); la COMPOSIZIONE (grasso, acqua, muscolo, ossa, proteine, viscerale, metabolismo, età
   metabolica, BMI) si calcola qui dalle impedenze con la formula WLA25 (la stessa del telefono, copiata da lì) ogni volta
   che serve, e si attacca alla pesata in memoria come proprietà NON enumerabili (pesateAttacca): JSON.stringify non le
   vede, quindi in corpo.json non vanno. Così la taratura del grasso (prevista a metà dicembre) varrà per tutte le pesate.
   Le pesate senza impedenze (solo il peso, o arrivate così da telefoni vecchi) tengono i valori che hanno.
   Lo Storico misure non tiene più le medie della bilancia: una settimana con le pesate è una riga {scheda, pesate:1} e
   i suoi valori (medie della settimana) si calcolano dalle pesate; BMI, massa magra e fabbisogno di ogni riga si calcolano
   (ioAttacca). Il profilo non copia più la composizione dell'ultima pesata: con la bilancia attiva la si legge da lì
   (corpoProfiloAttacca, 09-corpo.js); si copia solo il peso, che è una misura.

   Pesata: {id, data 'AAAA-MM-GG' (ora locale del telefono), ora 'HH:MM[:SS]', peso kg, bpm, imp:[ohm…],
   altezza cm, eta anni, sesso 'M'|'F' (contesto, facoltativi); da telefoni vecchi o senza impedenze anche grasso %,
   acqua %, muscolo kg, ossa kg, proteine %, visc, bmr kcal, eta_met, bmi}. Solo id/data/peso sono obbligatori. */

/* ── formula WLA25 delle bilance FitDays a 8 elettrodi (copiata dal telefono, app-android/web/index.html: r1, wla25ImpOk,
      wla25, etaMetabolica, pesComponi; ricostruita da openScale, GPL-3.0, riscritta da zero). Arrotondamenti in virgola
      mobile a 32 bit come la libreria originale. ── */
function pesR1(x){
  const F=Math.fround, v=F(x), whole=Math.trunc(v);
  const dec=F(F(v%1)*10), port=(F(dec%1)>0.5)? F(dec+1) : dec;
  return F(F(Math.trunc(port)/10)+whole); }
function pesImpOk(imp){ return Array.isArray(imp) && imp.length===10 && imp.every((x,i)=>isFinite(x) && ((i===0||i===5)? x>=1 : x>=100)); }
function pesWla25(altezza, pesoKg, imp){
  if(!(altezza>=100) || !(pesoKg>0) || !pesImpOk(imp)) return null;
  const peso=pesR1(pesoKg), bmi=peso*10000/(altezza*altezza);
  const s0=imp[0]*0.826, s5=imp[5]<=imp[0]? imp[5]*0.826 : s0-3;
  const fat=peso*-0.138+altezza*0.164+pesR1(bmi)*2.657+imp[2]*-0.053+imp[1]*-0.000491+s0*-0.03+imp[4]*-0.127+imp[3]*-0.052
    +imp[7]*0.07+imp[6]*0.019+s5*0.439+imp[9]*0.153+imp[8]*0.07-88.052;
  const pct=Math.min(60,Math.max(3,fat/peso*100)), grKg=pesR1(pct/100*peso), ffm=peso-grKg, acquaKg=ffm*0.733;
  const bfr=pesR1(pct), musc=pesR1((ffm*0.733+ffm*0.2)/peso*100);
  return {bmi:pesR1(bmi), grasso:bfr, acqua:pesR1(acquaKg/peso*100), muscolo:pesR1(musc/100*peso), ossa:pesR1(ffm*0.067),
    proteine:pesR1(ffm*0.2/peso*100), visc:Math.min(20,Math.max(1,Math.trunc(ffm*-0.029+grKg*0.502-0.477))),
    bmr:Math.trunc(ffm*21.6+370)}; }
function pesEtaMetabolica(eta, sesso, grasso){
  if(!(eta>=10)) return eta||null;
  const M=[[14,-3],[19,-2],[24,-1],[27,1],[30,2],[33,3],[36,4]], D=[[24,-3],[28,-2],[32,-1],[35,1],[38,2],[42,3],[45,4],[46,0]];
  const f=(sesso==='F'?D:M).find(x=>grasso<x[0]); return eta+(f?f[1]:5); }
const PES_CALCOLATI=['grasso','acqua','muscolo','ossa','proteine','visc','bmr','eta_met','bmi'];
function pesEtaAl(u, data){ const d=u&&u.nascita? new Date(u.nascita) : null; if(!d || isNaN(d)) return +(u&&u.eta)||0;
  const g=new Date(data+'T12:00:00'); let a=g.getFullYear()-d.getFullYear(); const m=g.getMonth()-d.getMonth();
  if(m<0 || (m===0 && g.getDate()<d.getDate())) a--; return a>0? a : 0; }
/* la composizione di ogni pesata con le impedenze, calcolata e attaccata in memoria (non enumerabile). Il contesto è quello
   della pesata (altezza, età, sesso che aveva il telefono); se manca, quello del profilo (età al giorno della pesata) */
function pesateAttacca(lista, u){
  u=u||{};
  (lista||[]).forEach(p=>{ if(!p || !pesImpOk(p.imp)) return;
    const alt=+p.altezza||+u.altezza||0, eta=+p.eta||pesEtaAl(u, p.data), sesso=p.sesso||u.sesso||'';
    const firma=alt+'|'+eta+'|'+sesso+'|'+p.peso+'|'+p.imp.join(',');
    if(p._pk===firma) return;
    const w=pesWla25(alt, +p.peso, p.imp), v={};
    const d1=x=>Math.round(x*10)/10;
    if(w){ ['grasso','acqua','muscolo','ossa','proteine','bmi'].forEach(k=>{ v[k]=d1(w[k]); }); v.visc=w.visc; v.bmr=w.bmr;
      const em=pesEtaMetabolica(eta, sesso, w.grasso); if(em) v.eta_met=em; }
    else if(alt>=100) v.bmi=d1(+p.peso*10000/(alt*alt));
    PES_CALCOLATI.forEach(k=>{ if(v[k]!==undefined) Object.defineProperty(p, k, {value:v[k], enumerable:false, writable:true, configurable:true});
      else if(Object.prototype.hasOwnProperty.call(p, k) && w) delete p[k]; });
    Object.defineProperty(p, '_pk', {value:firma, enumerable:false, writable:true, configurable:true}); });
  return lista; }

/* intervalli accettati: un valore fuori (o non numerico) si scarta, la pesata resta */
const PESATA_NUM={grasso:[1,75], acqua:[20,85], muscolo:[5,200], ossa:[0.3,12], proteine:[3,40],
  visc:[1,60], bmr:[400,5000], eta_met:[5,120], bmi:[8,80], bpm:[25,250]};
function pulisciPesata(p){
  if(!p||typeof p!=='object') return null;
  const data=String(p.data||'').slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data) || isNaN(new Date(data+'T12:00:00').getTime())) return null;
  const peso=+p.peso; if(!isFinite(peso)||peso<10||peso>400) return null;
  let ora=String(p.ora||'').trim(); if(!/^\d{2}:\d{2}(:\d{2})?$/.test(ora)) ora='';
  const out={id:String(p.id||'').trim().slice(0,80)||(data+'T'+(ora||'00:00')+'|'+peso), data:data, ora:ora, peso:+peso.toFixed(2)};
  if(Array.isArray(p.imp)){ const imp=p.imp.slice(0,12).map(Number);
    if(imp.length&&imp.every(x=>isFinite(x)&&x>=0&&x<100000)) out.imp=imp; }
  /* con le impedenze la composizione si CALCOLA (pesateAttacca): quella arrivata non si tiene; senza, è tutto quello che c'è */
  const conImp=pesImpOk(out.imp);
  Object.keys(PESATA_NUM).forEach(k=>{ const v=+p[k], r=PESATA_NUM[k];
    if((k==='bpm' || !conImp) && p[k]!==''&&p[k]!=null&&isFinite(v)&&v>=r[0]&&v<=r[1]) out[k]=v; });
  /* il contesto della misura (telefono 1.10.0) */
  if(+p.altezza>=100 && +p.altezza<=250) out.altezza=+p.altezza;
  if(+p.eta>=5 && +p.eta<=120) out.eta=Math.round(+p.eta);
  if(p.sesso==='M' || p.sesso==='F') out.sesso=p.sesso;
  return out;
}
function ordinePesate(a,b){ return (a.data+' '+(a.ora||'')).localeCompare(b.data+' '+(b.ora||'')); }
function settimanaPesata(p){ const w=isoWeek(new Date(p.data+'T12:00:00')); return schedaCode(w.anno,w.sett); }
/* una per giorno: la prima, o la prima con la composizione se quel giorno ce n'è una
   (salire senza tenere le maniglie dà il solo peso) */
function pesateContate(lista){
  const perGiorno={};
  (lista||[]).slice().sort(ordinePesate).forEach(p=>{ (perGiorno[p.data]=perGiorno[p.data]||[]).push(p); });
  return Object.keys(perGiorno).sort().map(g=>{ const l=perGiorno[g]; return l.find(p=>p.grasso!=null)||l[0]; });
}
function mediaPesate(lista,k){ const v=lista.map(p=>p[k]).filter(x=>x!=null&&isFinite(x)); return v.length? v.reduce((a,b)=>a+b,0)/v.length : null; }
/* riga dello Storico misure con la media della settimana. Stessi campi di «💾 Salva misure»
   (massa grassa in frazione, fabbisogno = basale × livello di attività del profilo); un
   valore che nessuna pesata porta resta quello del profilo, come nel salvataggio a mano. */
function rigaDaPesate(code, lista, u){
  u=u||{}; const sc=pesateContate(lista); if(!sc.length) return null;
  const R=(x,d)=>+(+x).toFixed(d), M=k=>mediaPesate(sc,k);
  const peso=M('peso'), gr=M('grasso'), mu=M('muscolo'), os=M('ossa'), bmr=M('bmr'), vi=M('visc'), ac=M('acqua'), bmiT=M('bmi');
  const alt=+u.altezza||0, livello=+u.livello_attivita||0;
  const mg=gr!=null? R(gr/100,4) : (+u.massa_grassa||0);
  const basale=bmr!=null? Math.round(bmr) : (+u.metab_basale||0);
  return {scheda:code, eta:etaOf(u), livello:livello||'', peso:R(peso,2), metabolismo:basale*livello,
    bmi:alt>0? R(peso/Math.pow(alt/100,2),2) : (bmiT!=null? R(bmiT,2) : 0),
    massa_grassa:mg, massa_magra:R(peso*(1-mg),2),
    massa_muscolare:mu!=null? R(mu,2) : (+u.massa_muscolare||0),
    massa_ossea:os!=null? R(os,2) : (+u.massa_ossea||0),
    metab_basale:basale, grasso_viscerale:vi!=null? R(vi,1) : (+u.grasso_viscerale||0),
    acqua:ac!=null? R(ac,1) : '', n_pesate:sc.length};
}
function pesateDellaSettimana(code){ return (DOC.pesate||[]).filter(p=>settimanaPesata(p)===code); }
function rigaIoDaPesate(r){ return !!r && (r.pesate===1 || +r.n_pesate>0); }
/* rifà la riga di una settimana dalle sue pesate (o la toglie, se non ne restano). Una misura scritta a mano non si tocca. */
function ricalcolaSettimanaPesate(code){
  const io=Array.isArray(DOC.storico_io)?DOC.storico_io:[];
  const r=io.find(x=>(+x.scheda)===code);
  if(r && !rigaIoDaPesate(r)) return false;
  DOC.storico_io=io.filter(x=>(+x.scheda)!==code);
  if(pesateDellaSettimana(code).length) DOC.storico_io.push({scheda:code, pesate:1});
  DOC.storico_io.sort((a,b)=>(+a.scheda||0)-(+b.scheda||0));
  ioAttacca(DOC);
  return true;
}
/* il profilo prende dall'ultima pesata il solo PESO (una misura); la composizione si legge dalle pesate (09-corpo.js) */
function applicaUltimaPesata(p, u){ u.peso=p.peso; }
/* ── STORICO MISURE: i valori calcolati di ogni riga, attaccati in memoria (non enumerabili) ──
   · settimana della bilancia ({scheda, pesate:1}): peso, massa grassa, muscolo, ossa, basale, viscerale, acqua = medie delle
     pesate della settimana (rigaDaPesate), livello di attività del profilo, n_pesate;
   · ogni riga: BMI (peso / altezza² del profilo), massa magra (peso × (1 − massa grassa)), fabbisogno (basale × livello).
   Righe di prima: quelle col n_pesate e le medie dentro diventano {scheda, pesate:1} se le pesate di quella settimana ci
   sono ancora (se no restano come misure scritte); i valori che si possono ricalcolare non si salvano più; `eta` (mai
   letta) si toglie. Idempotente; T = DOC o il corpo.json di un altro profilo (cruscotto). */
const IO_DA_PESATE=['peso','massa_grassa','massa_muscolare','massa_ossea','metab_basale','grasso_viscerale','acqua','livello','n_pesate'];
function ioAttacca(T){
  if(!T || !Array.isArray(T.storico_io)) return T;
  const u=T.dati_utente||{}, alt=+u.altezza||0, nascosto=(r,k,v)=>Object.defineProperty(r, k, {value:v, enumerable:false, writable:true, configurable:true});
  pesateAttacca(T.pesate, u);
  const perSett={}; (T.pesate||[]).forEach(p=>{ const c=settimanaPesata(p); (perSett[c]=perSett[c]||[]).push(p); });
  T.storico_io=T.storico_io.filter(r=>r && typeof r==='object').map(r=>{
    if(+r.n_pesate>0 && r.pesate!==1){ if(perSett[+r.scheda]) return {scheda:+r.scheda, pesate:1}; delete r.n_pesate; }
    if('eta' in r && Object.prototype.propertyIsEnumerable.call(r, 'eta')) delete r.eta;
    return r; });
  T.storico_io.forEach(r=>{
    if(r.pesate===1){ const v=rigaDaPesate(+r.scheda, perSett[+r.scheda]||[], u);
      if(v) IO_DA_PESATE.forEach(k=>{ if(v[k]!==undefined) nascosto(r, k, v[k]); }); }
    const peso=+r.peso||0, mg=+r.massa_grassa||0, bas=+r.metab_basale||0, liv=+r.livello||0;
    if(alt>0 && peso>0) nascosto(r, 'bmi', +(peso/Math.pow(alt/100,2)).toFixed(2));
    if(peso>0 && mg>0) nascosto(r, 'massa_magra', +(peso*(1-mg)).toFixed(2));
    if(bas>0 && liv>0) nascosto(r, 'metabolismo', bas*liv); });
  return T; }
/* import delle pesate arrivate dal telefono. Chiede SOLO se una settimana ha già una misura scritta a
   mano (una domanda per tutte). Restituisce il riepilogo per il messaggio finale. */
/* il cuore dell'unione delle pesate, su un profilo qualsiasi: T è DOC (profilo aperto) oppure il corpo.json
   di un altro profilo (telefono collegato, giro sui clienti non aperti, 15c-telefono.js). `aMano(settimane)`
   decide se i valori scritti a mano nello Storico misure si sostituiscono con la media delle pesate. */
async function pesateUnisci(T, arrivate, aManoFn){
  const ris={nuove:0, gia:0, scartate:0, nonValide:0, settimane:[], tenute:[]};
  if(!Array.isArray(arrivate)||!arrivate.length) return ris;
  if(!Array.isArray(T.pesate)) T.pesate=[];
  if(!Array.isArray(T.pesate_scartate)) T.pesate_scartate=[];
  if(!Array.isArray(T.storico_io)) T.storico_io=[];
  const note=new Set(T.pesate.map(p=>p.id)), via=new Set(T.pesate_scartate), nuove=[];
  arrivate.forEach(x=>{ const p=pulisciPesata(x);
    if(!p){ ris.nonValide++; return; }
    if(via.has(p.id)){ ris.scartate++; return; }
    if(note.has(p.id)){ ris.gia++; return; }
    note.add(p.id); nuove.push(p); });
  if(!nuove.length) return ris;
  ris.nuove=nuove.length;
  T.pesate=T.pesate.concat(nuove).sort(ordinePesate);
  const settimane=[...new Set(nuove.map(settimanaPesata))].sort((a,b)=>a-b);
  const aMano=settimane.filter(c=>T.storico_io.some(r=>(+r.scheda)===c && !rigaIoDaPesate(r)));
  let sostituisci=true;
  if(aMano.length) sostituisci=await aManoFn(aMano);
  pesateAttacca(T.pesate, T.dati_utente||{});
  settimane.forEach(c=>{
    if(!sostituisci && aMano.indexOf(c)>=0){ ris.tenute.push(c); return; }
    const riga=rigaDaPesate(c, T.pesate.filter(p=>settimanaPesata(p)===c), T.dati_utente||{}); if(!riga) return;
    T.storico_io=T.storico_io.filter(r=>(+r.scheda)!==c); T.storico_io.push({scheda:c, pesate:1});   /* i valori si calcolano */
    ris.settimane.push({code:c, n:riga.n_pesate}); });
  T.storico_io.sort((a,b)=>(+a.scheda||0)-(+b.scheda||0));
  ioAttacca(T);
  const ultima=T.pesate[T.pesate.length-1];
  if(ultima && nuove.indexOf(ultima)>=0) applicaUltimaPesata(ultima, T.dati_utente||(T.dati_utente={}));
  return ris;
}
async function importaPesate(arrivate){
  const ris=await pesateUnisci(DOC, arrivate, aMano=>conferma(
    t('Nello Storico misure ci sono già valori scritti a mano per:')+'\n• '+aMano.map(c=>t('settimana del')+' '+schedaLabel(c)).join('\n• ')+'\n\n'+
    t('Li sostituisco con la media delle pesate? Se scegli «Tienili», le pesate restano salvate ma lo Storico di quelle settimane non cambia.'),
    {titolo:t('Pesate della bilancia'), testoOk:t('Sostituisci'), testoNo:t('Tienili')}));
  if(ris.nuove){ corpoProfiloAttacca(); persist('corpo'); }   /* la composizione dell'ultima pesata nei campi del tab Corpo */
  return ris;
}
/* ── riquadro «Pesate della bilancia» nel tab Corpo (solo se ce ne sono) ── */
let pesateTutte=false;
function giornoPesata(data){ try{ return new Date(data+'T12:00:00').toLocaleDateString(LANG==='en'?'en-GB':'it-IT',{weekday:'short',day:'2-digit',month:'2-digit'}); }catch(e){ return data; } }
function htmlPesate(){
  const tutte=DOC.pesate||[]; if(!tutte.length) return '';
  const perSett={}; tutte.forEach(p=>{ const c=settimanaPesata(p); (perSett[c]=perSett[c]||[]).push(p); });
  const codici=Object.keys(perSett).map(Number).sort((a,b)=>b-a), mostra=pesateTutte?codici:codici.slice(0,4);
  const io=DOC.storico_io||[], N=(v,d)=>v!=null?nf(v,d):'—';
  const corpo=mostra.map(c=>{
    const lista=perSett[c].slice().sort(ordinePesate), contate=pesateContate(lista), ids=new Set(contate.map(p=>p.id));
    const r=io.find(x=>(+x.scheda)===c);
    const stato=!r? t('non è nello Storico misure') : rigaIoDaPesate(r)? t('media nello Storico misure') : t('nello Storico c’è la misura scritta a mano');
    const M=k=>mediaPesate(contate,k);
    return `<tr class="pesate-sett"><td colspan="7"><b>${t('Settimana del')} ${esc(schedaLabel(c))}</b> <span class="muted">· ${stato}</span></td></tr>`+
      lista.map(p=>`<tr${ids.has(p.id)?'':' class="pesata-fuori"'}><td>${esc(giornoPesata(p.data))}</td><td class="num">${esc((p.ora||'').slice(0,5))}</td><td class="num">${N(p.peso,1)}</td><td class="num">${N(p.grasso,1)}</td><td class="num">${N(p.muscolo,1)}</td><td class="num">${N(p.acqua,1)}</td>
        <td class="no-print" style="white-space:nowrap"><button class="btn btn--sm" data-reppes="${esc(p.id)}" title="${esc(t('Rapporto di questa pesata'))}" aria-label="${esc(t('Rapporto di questa pesata'))}">${ico('documento','p')}</button> <button class="btn btn--sm btn--del" data-delpes="${esc(p.id)}" title="${esc(t('Togli questa pesata'))}" aria-label="${esc(t('Togli questa pesata'))}">${ico('cestino','p')}</button></td></tr>`).join('')+
      `<tr class="pesate-media"><td colspan="2"><b>${t('Media')}</b> <span class="muted">(${contate.length})</span></td><td class="num"><b>${N(M('peso'),1)}</b></td><td class="num"><b>${N(M('grasso'),1)}</b></td><td class="num"><b>${N(M('muscolo'),1)}</b></td><td class="num"><b>${N(M('acqua'),1)}</b></td><td></td></tr>`;
  }).join('');
  return `<div class="sec">${t('Pesate della bilancia')} <span class="pill">${tutte.length}</span><button class="btn btn--sm no-print" style="margin-left:auto" data-reppes="${esc(tutte.slice().sort(ordinePesate).pop().id)}">${ico('documento')}${t('Rapporto dell’ultima')}</button></div>
    <div class="tbl-wrap"><table class="tbl-pesate"><thead><tr><th>${t('Giorno')}</th><th>${t('Ora')}</th><th>${t('Peso')}</th><th>${t('Grasso %')}</th><th>${t('Muscolo')}</th><th>${t('Acqua %')}</th><th class="no-print"></th></tr></thead>
    <tbody>${corpo}</tbody></table></div>
    <div class="muted" style="font-size:11px;margin-top:4px">${t('Arrivano da sole dall’app del telefono collegata e la media di ogni settimana va da sola nello Storico misure. Nella media conta una pesata al giorno, la prima: le altre sono in grigio.')}</div>
    ${codici.length>4?`<button class="btn btn--sm no-print" id="pesate-tutte" style="margin-top:6px">${pesateTutte?t('Mostra solo le ultime 4 settimane'):t('Mostra tutte le settimane')+' ('+codici.length+')'}</button>`:''}`;
}
function legaPesate(){
  document.querySelectorAll('#panel-corpo [data-reppes]').forEach(b=>{ b.onclick=()=>apriRapportoCorpo(b.dataset.reppes); });
  document.querySelectorAll('#panel-corpo [data-delpes]').forEach(b=>{ b.onclick=()=>eliminaPesata(b.dataset.delpes); });
  const tt=document.getElementById('pesate-tutte'); if(tt) tt.onclick=()=>{ pesateTutte=!pesateTutte; renderCorpo(); };
}
/* togliere una pesata (salita sbagliata, un'altra persona): non tornerà coi rientri dopo e la
   media della sua settimana si ricalcola. Ctrl+Z la rimette. */
async function eliminaPesata(id){
  const p=(DOC.pesate||[]).find(x=>x.id===id); if(!p) return;
  if(!await conferma(t('Tolgo la pesata di')+' '+giornoPesata(p.data)+(p.ora?' '+p.ora.slice(0,5):'')+' ('+nf(p.peso,1)+' kg)?\n'+
    t('Non tornerà con i prossimi rientri, e la media della sua settimana nello Storico misure si ricalcola.'),
    {titolo:t('Pesate della bilancia'), testoOk:t('Togli'), pericolo:true})) return;
  DOC.pesate=DOC.pesate.filter(x=>x.id!==id);
  if(!Array.isArray(DOC.pesate_scartate)) DOC.pesate_scartate=[];
  if(DOC.pesate_scartate.indexOf(id)<0) DOC.pesate_scartate.push(id);
  ricalcolaSettimanaPesate(settimanaPesata(p));
  persist('corpo'); renderCorpo(); updateStatusDots();
}
