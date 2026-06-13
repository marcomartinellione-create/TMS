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
/* minuti cardio per settimana ISO (codice AAAASS), per i grafici di equilibrio del volume */
function cardioMinByWeek(){ const m={}; cardioList().forEach(s=>{ if(!s.data)return; const w=isoWeek(new Date(s.data+'T12:00:00')); const code=schedaCode(w.anno,w.sett); m[code]=(m[code]||0)+(+s.durata||0); }); return m; }
/* Cardio sul radar "Equilibrio volume": i minuti diventano "serie-equivalenti" così che
   ~2 h/settimana (120 min) ≈ 12, in piena zona di volume equilibrato (10–20). Min÷10. */
const CARDIO_RADAR_PER_MIN=1/10;
function cardioEquivSets(code){ return Math.round(((cardioMinByWeek()[code]||0)*CARDIO_RADAR_PER_MIN)*10)/10; }
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
     <label class="btn no-print" style="cursor:pointer" title="Importa un file .tcx o .gpx esportato da orologio/fascia (Garmin Connect, Polar Flow, Strava…)">📥 Importa attività<input type="file" id="cardio-imp" accept=".tcx,.gpx,.xml,application/xml,application/gpx+xml" style="display:none"></label>
     <button class="btn btn--ember" id="cardio-add">＋ Aggiungi attività</button></div>
   <div class="callout callout--info"><div>🫀 Le attività cardio si misurano col <b>carico interno</b>, non con serie/peso. <b>sRPE</b> (Foster) = RPE × minuti. <b>TRIMP</b> (Banister) usa la <b>frequenza cardiaca</b> media e compare quando la inserisci ${fcMaxStimata()?`(FC max stimata ≈ <b>${fcMaxStimata()}</b> bpm dall'età, FC riposo ${fcRiposoUtente()} bpm)`:`(imposta l'età nel Profilo per la FC max stimata)`}. Con <b>📥 Importa attività</b> carichi un file <b>.tcx/.gpx</b> dall'orologio o dalla fascia: durata e FC si compilano da sole.</div></div>
   <div class="tbl-wrap"><table><thead><tr><th class="l">Data</th><th class="l">Attività</th><th>Min</th><th>RPE</th><th>sRPE (AU)</th><th>km</th><th>FC media</th><th>TRIMP</th><th class="l">Note</th><th class="no-print"></th></tr></thead>
     <tbody>${rows||'<tr><td colspan="10" class="empty">Nessuna attività cardio registrata. Aggiungine una col bottone ＋.</td></tr>'}</tbody></table></div>`;
  document.getElementById('cardio-add').onclick=()=>cardioModal(-1);
  { const imp=document.getElementById('cardio-imp'); if(imp) imp.onchange=async e=>{ const f=e.target.files&&e.target.files[0]; if(!f) return; e.target.value='';
      let txt=''; try{ txt=await f.text(); }catch(err){ alert('File non leggibile.'); return; }
      const p=parseAttivitaCardio(txt);
      if(!p){ alert('Non riconosco questo file. Esporta l\'attività come .TCX o .GPX dal tuo dispositivo o app (Garmin Connect, Polar Flow, Strava…) e riprova.'); return; }
      cardioModal(-1, p); }; }
  document.querySelectorAll('#panel-cardio [data-ced]').forEach(b=>b.onclick=()=>cardioModal(+b.dataset.ced));
  document.querySelectorAll('#panel-cardio [data-cdel]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.cdel, s=cardioList()[i];
    if(!confirm('Eliminare l\'attività «'+((s&&s.tipo)||'')+'» del '+((s&&s.data)||'')+'?')) return;
    cardioList().splice(i,1); persist('corpo'); renderCardio(); });
}
function cardioModal(idx, preset){
  const s= idx>=0? cardioList()[idx] : Object.assign({data:new Date().toISOString().slice(0,10),tipo:'',durata:'',rpe:'',distanza:'',fcMedia:'',fcMax:'',note:''}, preset||{});
  modal(`<h3>${idx>=0?'Modifica attività':'Nuova attività cardio'}</h3>
    ${preset?'<div class="callout callout--info" style="margin:0 0 10px"><div>📥 Dati letti dal file. Controlla, aggiungi la <b>fatica RPE</b> e salva.</div></div>':''}
    <div class="row"><div class="field"><label>Data</label><input id="c-data" type="date" value="${esc(s.data||'')}"></div>
      <div class="field"><label>Attività</label><input id="c-tipo" list="dl-cardio" value="${esc(s.tipo||'')}" placeholder="es. Corsa"><datalist id="dl-cardio">${CARDIO_TIPI.map(t=>`<option value="${esc(t)}">`).join('')}</datalist></div></div>
    <div class="row"><div class="field"><label>Durata (min)</label><input id="c-min" type="number" min="0" value="${s.durata??''}"></div>
      <div class="field"><label>Fatica RPE (0–10)</label><input id="c-rpe" type="number" min="0" max="10" step="0.5" value="${s.rpe??''}" placeholder="–"></div></div>
    <div class="row"><div class="field"><label>Distanza (km) <span class="muted" style="text-transform:none">facolt.</span></label><input id="c-dist" type="number" min="0" step="0.1" value="${s.distanza??''}"></div>
      <div class="field"><label>FC media (bpm) <span class="muted" style="text-transform:none">per il TRIMP</span></label><input id="c-fc" type="number" min="0" value="${s.fcMedia??''}" placeholder="–"></div>
      <div class="field"><label>FC max <span class="muted" style="text-transform:none">facolt.</span></label><input id="c-fcmax" type="number" min="0" value="${s.fcMax??''}" placeholder="da età"></div></div>
    <div class="field"><label>Note</label><input id="c-note" value="${esc(s.note||'')}"></div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">Annulla</button><button class="btn btn--ember" id="c-ok">Salva</button></div>`);
  document.getElementById('c-ok').onclick=()=>{
    const obj={data:document.getElementById('c-data').value||new Date().toISOString().slice(0,10),
      tipo:document.getElementById('c-tipo').value.trim(),
      durata:+document.getElementById('c-min').value||0,
      rpe:document.getElementById('c-rpe').value===''?'':+document.getElementById('c-rpe').value,
      distanza:document.getElementById('c-dist').value===''?'':+document.getElementById('c-dist').value,
      fcMedia:document.getElementById('c-fc').value===''?'':+document.getElementById('c-fc').value,
      fcMax:document.getElementById('c-fcmax').value===''?'':+document.getElementById('c-fcmax').value,
      note:document.getElementById('c-note').value.trim()};
    if(!obj.tipo){ alert('Indica il tipo di attività.'); return; }
    if(!obj.durata){ alert('Indica la durata in minuti.'); return; }
    if(idx>=0) cardioList()[idx]=obj; else cardioList().push(obj);
    persist('corpo'); closeModal(); renderCardio();
  };
}
/* ── Import «avanzato»: file attività .TCX / .GPX da orologio o fascia cardiaca ──
   Estrae durata, FC media/max, distanza e tipo, poi apre il modale precompilato (l'RPE
   lo aggiunge l'utente). Parsing XML nativo (DOMParser), nessuna dipendenza. Funziona offline. */
function _tipoFromSport(sp){ sp=String(sp||'').toLowerCase();
  if(/run|corsa/.test(sp)) return 'Corsa'; if(/bik|cycl|bici/.test(sp)) return 'Bici'; if(/swim|nuoto/.test(sp)) return 'Nuoto';
  if(/walk|hik|cammin/.test(sp)) return 'Camminata veloce'; if(/row|voga/.test(sp)) return 'Vogatore';
  return sp? sp.charAt(0).toUpperCase()+sp.slice(1) : ''; }
function parseAttivitaCardio(text){
  let doc; try{ doc=new DOMParser().parseFromString(String(text||''),'application/xml'); }catch(e){ return null; }
  if(!doc || doc.getElementsByTagName('parsererror').length) return null;
  const tx=el=>el?(el.textContent||'').trim():''; const nm=s=>{ const v=parseFloat(s); return isNaN(v)?null:v; };
  const all=name=>{ const o=[],els=doc.getElementsByTagName('*'); name=name.toLowerCase(); for(let i=0;i<els.length;i++){ if((els[i].localName||'').toLowerCase()===name) o.push(els[i]); } return o; };
  const hrs=[];
  all('heartratebpm').forEach(e=>{ const v=nm(tx(e.getElementsByTagName('*')[0]||e))||nm(tx(e)); if(v) hrs.push(v); });
  all('hr').forEach(e=>{ const v=nm(tx(e)); if(v) hrs.push(v); });
  const times=all('time').map(e=>Date.parse(tx(e))).filter(t=>!isNaN(t)).sort((a,b)=>a-b);
  let tipo=''; const act=all('activity')[0]; if(act&&act.getAttribute) tipo=_tipoFromSport(act.getAttribute('Sport'));
  if(!tipo){ const ty=all('type')[0]; if(ty) tipo=_tipoFromSport(tx(ty)); }
  let secs=0; all('totaltimeseconds').forEach(e=>{ const v=nm(tx(e)); if(v) secs+=v; });
  if(!secs && times.length>=2) secs=(times[times.length-1]-times[0])/1000;
  const durata=secs? Math.round(secs/60):'';
  let distM=0; all('distancemeters').forEach(e=>{ const v=nm(tx(e)); if(v&&v>distM) distM=v; });
  let distanza= distM? Math.round(distM/100)/10 : '';
  if(!distanza){ const pts=all('trkpt').map(e=>[e.getAttribute&&nm(e.getAttribute('lat')),e.getAttribute&&nm(e.getAttribute('lon'))]).filter(p=>p[0]!=null&&p[1]!=null);
    if(pts.length>1){ let m=0; const R=6371000, rad=x=>x*Math.PI/180; for(let i=1;i<pts.length;i++){ const a=pts[i-1],b=pts[i],dLa=rad(b[0]-a[0]),dLo=rad(b[1]-a[1]); const h=Math.sin(dLa/2)*Math.sin(dLa/2)+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLo/2)*Math.sin(dLo/2); m+=2*R*Math.asin(Math.min(1,Math.sqrt(h))); } distanza=Math.round(m/100)/10; } }
  let data=''; const id=all('id')[0]; const dRaw= id? tx(id) : (times.length?new Date(times[0]).toISOString():'');
  if(dRaw){ const t=Date.parse(dRaw); if(!isNaN(t)) data=new Date(t).toISOString().slice(0,10); }
  if(!data) data=new Date().toISOString().slice(0,10);
  if(!hrs.length && !durata) return null;  /* niente di utile: non è un'attività valida */
  const fcMedia= hrs.length? Math.round(hrs.reduce((a,b)=>a+b,0)/hrs.length):'';
  const fcMax= hrs.length? hrs.reduce((a,b)=>Math.max(a,b),0):'';
  return {data:data, tipo:tipo||'', durata:durata||'', rpe:'', distanza:distanza||'', fcMedia:fcMedia, fcMax:fcMax, note:'importata da file'};
}
