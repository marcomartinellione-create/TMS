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
   La composizione (grasso, acqua, muscolo…) la calcola il telefono dalle impedenze; qui
   arrivano i valori già calcolati e le impedenze grezze, che si conservano soltanto.

   Pesata: {id, data 'AAAA-MM-GG' (ora locale del telefono), ora 'HH:MM[:SS]', peso kg,
   grasso %, acqua %, muscolo kg, ossa kg, proteine %, visc (indice), bmr kcal, eta_met,
   bmi, bpm, imp:[ohm…]}. Solo id/data/peso sono obbligatori. */

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
  Object.keys(PESATA_NUM).forEach(k=>{ const v=+p[k], r=PESATA_NUM[k];
    if(p[k]!==''&&p[k]!=null&&isFinite(v)&&v>=r[0]&&v<=r[1]) out[k]=v; });
  if(Array.isArray(p.imp)){ const imp=p.imp.slice(0,12).map(Number);
    if(imp.length&&imp.every(x=>isFinite(x)&&x>=0&&x<100000)) out.imp=imp; }
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
function rigaIoDaPesate(r){ return !!r && (+r.n_pesate>0); }
/* riscrive la riga di una settimana dalle sue pesate (o la toglie, se non ne restano). Una
   misura scritta a mano non si tocca. */
function ricalcolaSettimanaPesate(code){
  const io=Array.isArray(DOC.storico_io)?DOC.storico_io:[];
  const r=io.find(x=>(+x.scheda)===code);
  if(r && !rigaIoDaPesate(r)) return false;
  const riga=rigaDaPesate(code, pesateDellaSettimana(code), DOC.dati_utente||{});
  DOC.storico_io=io.filter(x=>(+x.scheda)!==code);
  if(riga) DOC.storico_io.push(riga);
  DOC.storico_io.sort((a,b)=>(+a.scheda||0)-(+b.scheda||0));
  return true;
}
/* i campi del tab Corpo all'ultima pesata (solo i valori che la pesata porta) */
function applicaUltimaPesata(p, u){
  u.peso=p.peso;
  if(p.grasso!=null) u.massa_grassa=+(p.grasso/100).toFixed(4);
  if(p.muscolo!=null) u.massa_muscolare=p.muscolo;
  if(p.ossa!=null) u.massa_ossea=p.ossa;
  if(p.bmr!=null) u.metab_basale=Math.round(p.bmr);
  if(p.visc!=null) u.grasso_viscerale=p.visc;
  if(p.acqua!=null) u.acqua=p.acqua;
}
/* import delle pesate arrivate dal telefono. Chiede SOLO se una settimana ha già una misura scritta a
   mano (una domanda per tutte). Restituisce il riepilogo per il messaggio finale. */
async function importaPesate(arrivate){
  const ris={nuove:0, gia:0, scartate:0, nonValide:0, settimane:[], tenute:[]};
  if(!Array.isArray(arrivate)||!arrivate.length) return ris;
  if(!Array.isArray(DOC.pesate)) DOC.pesate=[];
  if(!Array.isArray(DOC.pesate_scartate)) DOC.pesate_scartate=[];
  if(!Array.isArray(DOC.storico_io)) DOC.storico_io=[];
  const note=new Set(DOC.pesate.map(p=>p.id)), via=new Set(DOC.pesate_scartate), nuove=[];
  arrivate.forEach(x=>{ const p=pulisciPesata(x);
    if(!p){ ris.nonValide++; return; }
    if(via.has(p.id)){ ris.scartate++; return; }
    if(note.has(p.id)){ ris.gia++; return; }
    note.add(p.id); nuove.push(p); });
  if(!nuove.length) return ris;
  ris.nuove=nuove.length;
  DOC.pesate=DOC.pesate.concat(nuove).sort(ordinePesate);
  const settimane=[...new Set(nuove.map(settimanaPesata))].sort((a,b)=>a-b);
  const aMano=settimane.filter(c=>DOC.storico_io.some(r=>(+r.scheda)===c && !rigaIoDaPesate(r)));
  let sostituisci=true;
  if(aMano.length) sostituisci=await conferma(
    t('Nello Storico misure ci sono già valori scritti a mano per:')+'\n• '+aMano.map(c=>t('settimana del')+' '+schedaLabel(c)).join('\n• ')+'\n\n'+
    t('Li sostituisco con la media delle pesate? Se scegli «Tienili», le pesate restano salvate ma lo Storico di quelle settimane non cambia.'),
    {titolo:t('Pesate della bilancia'), testoOk:t('Sostituisci'), testoNo:t('Tienili')});
  settimane.forEach(c=>{
    if(!sostituisci && aMano.indexOf(c)>=0){ ris.tenute.push(c); return; }
    const riga=rigaDaPesate(c, pesateDellaSettimana(c), DOC.dati_utente||{}); if(!riga) return;
    DOC.storico_io=DOC.storico_io.filter(r=>(+r.scheda)!==c); DOC.storico_io.push(riga);
    ris.settimane.push({code:c, n:riga.n_pesate}); });
  DOC.storico_io.sort((a,b)=>(+a.scheda||0)-(+b.scheda||0));
  const ultima=DOC.pesate[DOC.pesate.length-1];
  if(ultima && nuove.indexOf(ultima)>=0) applicaUltimaPesata(ultima, DOC.dati_utente||(DOC.dati_utente={}));
  persist('corpo');
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
