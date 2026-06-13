/* ════════════════ CARDIO (carico interno: sRPE + TRIMP) ════════════════
   Le attività cardio non hanno serie/rip/peso: si misurano col CARICO INTERNO.
   - sRPE (Foster 2001): RPE(0–10) × durata(min) = unità arbitrarie (AU). Sempre disponibile.
   - TRIMP (Banister 1991): durata × HRr × coeff, HRr=(FCmedia−FCriposo)/(FCmax−FCriposo);
     calcolato SOLO se è inserita la FC media (i dati della fascia cardiaca arriveranno).
   Le sedute vivono in DOC.cardio (salvate in corpo.json, accanto a storico_rpe dei pesi). */
const CARDIO_TIPI=['Corsa','Camminata veloce','Bici','Cyclette','Ellittica','Vogatore','Nuoto','Salto della corda','Tapis roulant','HIIT','Sci di fondo','Altro'];
function cardioList(){ if(!Array.isArray(DOC.cardio)) DOC.cardio=[]; return DOC.cardio; }
function srpeCardio(s){ return Math.round((+s.rpe||0)*(+s.durata||0)); }
function fcMaxStimata(){ const e=etaOf(DOC.dati_utente||{}); return e? Math.round(208-0.7*e) : null; }  /* Tanaka 2001 */
function fcRiposoUtente(){ return +((DOC.dati_utente||{}).fcRiposo)||60; }
function trimpCardio(s){
  const fcm=+s.fcMedia||0; if(!fcm) return null;
  const fcMax=+s.fcMax||fcMaxStimata(); const fcRest=fcRiposoUtente();
  if(!fcMax||fcMax<=fcRest) return null;
  let hrr=(fcm-fcRest)/(fcMax-fcRest); if(hrr<0)hrr=0; if(hrr>1)hrr=1;
  const donna=String((DOC.dati_utente||{}).sesso||'').toUpperCase()==='F';
  const y=donna?0.86*Math.exp(1.67*hrr):0.64*Math.exp(1.92*hrr);
  return Math.round((+s.durata||0)*hrr*y);
}
function cardioWeekAU(){  /* sRPE totale della settimana corrente (ISO) */
  const w=isoWeek(new Date()), code=schedaCode(w.anno,w.sett); let au=0;
  cardioList().forEach(s=>{ if(!s.data)return; const ww=isoWeek(new Date(s.data+'T12:00:00')); if(schedaCode(ww.anno,ww.sett)===code) au+=srpeCardio(s); });
  return au;
}
function renderCardio(){
  const list=cardioList().slice().sort((a,b)=>String(b.data||'').localeCompare(String(a.data||'')));
  const rows=list.map(s=>{ const idx=cardioList().indexOf(s); const au=srpeCardio(s), tr=trimpCardio(s);
    return `<tr>
      <td class="l mono" style="font-size:12px">${esc(s.data||'—')}</td>
      <td class="l">${esc(s.tipo||'—')}</td>
      <td class="num">${nf(s.durata,0)}</td>
      <td class="num">${s.rpe===''||s.rpe==null?'—':nf(s.rpe,1)}</td>
      <td class="num cell-out">${au||'—'}</td>
      <td class="num">${s.distanza?nf(s.distanza,1):'—'}</td>
      <td class="num">${s.fcMedia?nf(s.fcMedia,0):'—'}</td>
      <td class="num">${tr==null?'<span class="muted">—</span>':tr}</td>
      <td class="l muted" style="font-size:11px">${esc(s.note||'')}</td>
      <td class="no-print" style="white-space:nowrap"><button class="btn btn--sm" data-ced="${idx}" title="modifica">✎</button> <button class="btn btn--sm btn--danger" data-cdel="${idx}" title="elimina">✕</button></td>
    </tr>`; }).join('');
  document.getElementById('panel-cardio').innerHTML=`
   <div class="bar no-print"><div class="field" style="flex:1"><label>Cardio</label>
     <div style="font-family:var(--font-disp);font-size:20px;color:var(--ember-2)">🏃 ${list.length} attività · settimana ${nfk(cardioWeekAU())} AU</div></div>
     <button class="btn btn--ember" id="cardio-add">＋ Aggiungi attività</button></div>
   <div class="callout callout--info"><div>🫀 Le attività cardio si misurano col <b>carico interno</b>, non con serie/peso. <b>sRPE</b> (Foster) = RPE × minuti. <b>TRIMP</b> (Banister) usa la <b>frequenza cardiaca</b> media e compare quando la inserisci ${fcMaxStimata()?`(FC max stimata ≈ <b>${fcMaxStimata()}</b> bpm dall'età, FC riposo ${fcRiposoUtente()} bpm)`:`(imposta l'età nel Profilo per la FC max stimata)`}.</div></div>
   <div class="tbl-wrap"><table><thead><tr><th class="l">Data</th><th class="l">Attività</th><th>Min</th><th>RPE</th><th>sRPE (AU)</th><th>km</th><th>FC media</th><th>TRIMP</th><th class="l">Note</th><th class="no-print"></th></tr></thead>
     <tbody>${rows||'<tr><td colspan="10" class="empty">Nessuna attività cardio registrata. Aggiungine una col bottone ＋.</td></tr>'}</tbody></table></div>`;
  document.getElementById('cardio-add').onclick=()=>cardioModal(-1);
  document.querySelectorAll('#panel-cardio [data-ced]').forEach(b=>b.onclick=()=>cardioModal(+b.dataset.ced));
  document.querySelectorAll('#panel-cardio [data-cdel]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.cdel, s=cardioList()[i];
    if(!confirm('Eliminare l\'attività «'+((s&&s.tipo)||'')+'» del '+((s&&s.data)||'')+'?')) return;
    cardioList().splice(i,1); persist('corpo'); renderCardio(); });
}
function cardioModal(idx){
  const s= idx>=0? cardioList()[idx] : {data:new Date().toISOString().slice(0,10),tipo:'',durata:'',rpe:'',distanza:'',fcMedia:'',note:''};
  modal(`<h3>${idx>=0?'Modifica attività':'Nuova attività cardio'}</h3>
    <div class="row"><div class="field"><label>Data</label><input id="c-data" type="date" value="${esc(s.data||'')}"></div>
      <div class="field"><label>Attività</label><input id="c-tipo" list="dl-cardio" value="${esc(s.tipo||'')}" placeholder="es. Corsa"><datalist id="dl-cardio">${CARDIO_TIPI.map(t=>`<option value="${esc(t)}">`).join('')}</datalist></div></div>
    <div class="row"><div class="field"><label>Durata (min)</label><input id="c-min" type="number" min="0" value="${s.durata??''}"></div>
      <div class="field"><label>Fatica RPE (0–10)</label><input id="c-rpe" type="number" min="0" max="10" step="0.5" value="${s.rpe??''}" placeholder="–"></div></div>
    <div class="row"><div class="field"><label>Distanza (km) <span class="muted" style="text-transform:none">facolt.</span></label><input id="c-dist" type="number" min="0" step="0.1" value="${s.distanza??''}"></div>
      <div class="field"><label>FC media (bpm) <span class="muted" style="text-transform:none">per il TRIMP</span></label><input id="c-fc" type="number" min="0" value="${s.fcMedia??''}" placeholder="–"></div></div>
    <div class="field"><label>Note</label><input id="c-note" value="${esc(s.note||'')}"></div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">Annulla</button><button class="btn btn--ember" id="c-ok">Salva</button></div>`);
  document.getElementById('c-ok').onclick=()=>{
    const obj={data:document.getElementById('c-data').value||new Date().toISOString().slice(0,10),
      tipo:document.getElementById('c-tipo').value.trim(),
      durata:+document.getElementById('c-min').value||0,
      rpe:document.getElementById('c-rpe').value===''?'':+document.getElementById('c-rpe').value,
      distanza:document.getElementById('c-dist').value===''?'':+document.getElementById('c-dist').value,
      fcMedia:document.getElementById('c-fc').value===''?'':+document.getElementById('c-fc').value,
      note:document.getElementById('c-note').value.trim()};
    if(!obj.tipo){ alert('Indica il tipo di attività.'); return; }
    if(!obj.durata){ alert('Indica la durata in minuti.'); return; }
    if(idx>=0) cardioList()[idx]=obj; else cardioList().push(obj);
    persist('corpo'); closeModal(); renderCardio();
  };
}
