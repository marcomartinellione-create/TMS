/* ════════════════ CARDIO (carico interno: sRPE + TRIMP) ════════════════
   Le attività cardio non hanno serie/rip/peso: si misurano col CARICO INTERNO.
   - sRPE (Foster 2001): RPE(0–10) × durata(min) = unità arbitrarie (AU). Sempre disponibile.
   - TRIMP (Banister 1991): durata × HRr × coeff, HRr=(FCmedia−FCriposo)/(FCmax−FCriposo);
     calcolato SOLO se è inserita la FC media (i dati della fascia cardiaca arriveranno).
   Le sedute vivono in DOC.cardio (salvate in corpo.json, accanto a storico_rpe dei pesi). */
/* Catalogo sport cardio con METADATI: dicono quali dati hanno senso per quello sport.
   dist=ha distanza · ritmo='passo'(min/km) | 'velocita'(km/h) | '' · quota=dislivello (outdoor GPS).
   L'utente può aggiungerne altri (basta digitarne il nome): i custom rientrano nell'elenco e
   valgono come generici (distanza opzionale, niente ritmo/dislivello dedicati). */
const CARDIO_SPORT=[
  {nome:'Corsa',             dist:true,  ritmo:'passo',    quota:true },
  {nome:'Tapis roulant',     dist:true,  ritmo:'passo',    quota:false},
  {nome:'Camminata veloce',  dist:true,  ritmo:'passo',    quota:true },
  {nome:'Bici',              dist:true,  ritmo:'velocita', quota:true },
  {nome:'Cyclette',          dist:true,  ritmo:'velocita', quota:false},
  {nome:'Nuoto',             dist:true,  ritmo:'',         quota:false},
  {nome:'Vogatore',          dist:true,  ritmo:'',         quota:false},
  {nome:'Ellittica',         dist:false, ritmo:'',         quota:false},
  {nome:'Sci di fondo',      dist:true,  ritmo:'velocita', quota:true },
  {nome:'Salto della corda', dist:false, ritmo:'',         quota:false},
  {nome:'HIIT',              dist:false, ritmo:'',         quota:false},
];
function sportInfo(nome){ const n=String(nome||'').trim().toLowerCase();
  return CARDIO_SPORT.find(s=>s.nome.toLowerCase()===n) || {nome:String(nome||''),dist:true,ritmo:'',quota:false}; }
function cardioSportDisponibili(){ const out=CARDIO_SPORT.map(s=>s.nome);
  cardioList().forEach(s=>{ const t=String(s.tipo||'').trim(); if(t && !out.some(x=>x.toLowerCase()===t.toLowerCase())) out.push(t); }); return out; }
function passoMinKm(s){ const d=+s.distanza||0,m=+s.durata||0; return (d>0&&m>0)? m/d : null; }
function velocitaKmh(s){ const d=+s.distanza||0,m=+s.durata||0; return (d>0&&m>0)? d/(m/60) : null; }
function fmtPasso(mk){ if(mk==null||!isFinite(mk)) return '—'; const t=Math.round(mk*60); return Math.floor(t/60)+':'+((t%60)<10?'0':'')+(t%60); }
function cardioRitmo(s){ const inf=sportInfo(s.tipo);
  if(inf.ritmo==='passo'){ const p=passoMinKm(s); return p==null?'—':fmtPasso(p)+'/km'; }
  if(inf.ritmo==='velocita'){ const v=velocitaKmh(s); return v==null?'—':nf(v,1)+' km/h'; }
  return '—'; }
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
      <td class="num">${cardioRitmo(s)}</td>
      <td class="num">${s.fcMedia?nf(s.fcMedia,0):'—'}</td>
      <td class="num">${tr==null?'<span class="muted">—</span>':tr}</td>
      <td class="num">${s.quota?nf(s.quota,0):'—'}</td>
      <td class="l muted" style="font-size:11px">${esc(s.note||'')}</td>
      <td class="no-print" style="white-space:nowrap"><button class="btn btn--sm" data-ced="${idx}" title="modifica">✎</button> <button class="btn btn--sm btn--danger" data-cdel="${idx}" title="elimina">✕</button></td>
    </tr>`; }).join('');
  document.getElementById('panel-cardio').innerHTML=`
   <div class="bar no-print"><div class="field" style="flex:1"><label>Cardio</label>
     <div style="font-family:var(--font-disp);font-size:20px;color:var(--ember-2)">🏃 ${list.length} attività · settimana ${nfk(cardioWeekAU())} AU</div></div>
     <label class="btn no-print" style="cursor:pointer" title="Importa un file .tcx o .gpx esportato da orologio/fascia (Garmin Connect, Polar Flow, Strava…)">📥 Importa attività<input type="file" id="cardio-imp" accept=".tcx,.gpx,.xml,application/xml,application/gpx+xml" style="display:none"></label>
     <button class="btn btn--ember" id="cardio-add">＋ Aggiungi attività</button></div>
   <div class="callout callout--info"><div>🫀 Le attività cardio si misurano col <b>carico interno</b>, non con serie/peso. <b>sRPE</b> (Foster) = RPE × minuti. <b>TRIMP</b> (Banister) usa la <b>frequenza cardiaca</b> media e compare quando la inserisci ${fcMaxStimata()?`(FC max stimata ≈ <b>${fcMaxStimata()}</b> bpm dall'età, FC riposo ${fcRiposoUtente()} bpm)`:`(imposta l'età nel Profilo per la FC max stimata)`}. Con <b>📥 Importa attività</b> carichi un file <b>.tcx/.gpx</b> dall'orologio o dalla fascia: durata e FC si compilano da sole.</div></div>
   <div class="tbl-wrap"><table><thead><tr><th class="l">Data</th><th class="l">Attività</th><th>Min</th><th>RPE</th><th>sRPE (AU)</th><th>km</th><th>Ritmo</th><th>FC media</th><th>TRIMP</th><th title="Dislivello positivo">D+ (m)</th><th class="l">Note</th><th class="no-print"></th></tr></thead>
     <tbody>${rows||'<tr><td colspan="12" class="empty">Nessuna attività cardio registrata. Aggiungine una col bottone ＋.</td></tr>'}</tbody></table></div>`;
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
  const s= idx>=0? cardioList()[idx] : Object.assign({data:new Date().toISOString().slice(0,10),tipo:'',durata:'',rpe:'',distanza:'',quota:'',fcMedia:'',fcMax:'',note:''}, preset||{});
  const opts=cardioSportDisponibili().map(t=>`<option value="${esc(t)}"${String(s.tipo||'').toLowerCase()===t.toLowerCase()?' selected':''}>${esc(t)}</option>`).join('');
  modal(`<h3>${idx>=0?'Modifica attività':'Nuova attività cardio'}</h3>
    ${preset?'<div class="callout callout--info" style="margin:0 0 10px"><div>📥 Dati letti dal file. Controlla, aggiungi la <b>fatica RPE</b> e salva.</div></div>':''}
    <div class="row"><div class="field"><label>Data</label><input id="c-data" type="date" value="${esc(s.data||'')}"></div>
      <div class="field"><label>Sport</label><select id="c-tipo">${opts}<option value="__altro__">➕ Altro…</option></select>
        <input id="c-tipo-altro" placeholder="nome dello sport" value="${esc(cardioSportDisponibili().some(t=>t.toLowerCase()===String(s.tipo||'').toLowerCase())?'':(s.tipo||''))}" style="margin-top:5px;display:none"></div></div>
    <div class="row"><div class="field"><label>Durata (min)</label><input id="c-min" type="number" min="0" value="${s.durata??''}"></div>
      <div class="field"><label>Fatica RPE (0–10)</label><input id="c-rpe" type="number" min="0" max="10" step="0.5" value="${s.rpe??''}" placeholder="–"></div></div>
    <div class="row"><div class="field" id="c-dist-wrap"><label>Distanza (km) <span class="muted" style="text-transform:none">facolt.</span></label><input id="c-dist" type="number" min="0" step="0.1" value="${s.distanza??''}"></div>
      <div class="field" id="c-quota-wrap"><label>Dislivello D+ (m) <span class="muted" style="text-transform:none">facolt.</span></label><input id="c-quota" type="number" min="0" value="${s.quota??''}"></div></div>
    <div class="row"><div class="field"><label>FC media (bpm) <span class="muted" style="text-transform:none">per il TRIMP</span></label><input id="c-fc" type="number" min="0" value="${s.fcMedia??''}" placeholder="–"></div>
      <div class="field"><label>FC max <span class="muted" style="text-transform:none">facolt.</span></label><input id="c-fcmax" type="number" min="0" value="${s.fcMax??''}" placeholder="da età"></div></div>
    <div class="field"><label>Note</label><input id="c-note" value="${esc(s.note||'')}"></div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">Annulla</button><button class="btn btn--ember" id="c-ok">Salva</button></div>`);
  const sel=document.getElementById('c-tipo'), altro=document.getElementById('c-tipo-altro');
  /* se il tipo non è tra le opzioni (preset/import con sport nuovo), apri "Altro…" precompilato */
  if(s.tipo && !cardioSportDisponibili().some(t=>t.toLowerCase()===String(s.tipo).toLowerCase())){ sel.value='__altro__'; altro.value=s.tipo; }
  const tipoCorrente=()=> sel.value==='__altro__'? altro.value.trim() : sel.value;
  const applyCampi=()=>{ const inf=sportInfo(tipoCorrente());
    altro.style.display = sel.value==='__altro__'?'':'none';
    document.getElementById('c-dist-wrap').style.display = inf.dist?'':'none';
    document.getElementById('c-quota-wrap').style.display = inf.quota?'':'none'; };
  sel.onchange=applyCampi; altro.oninput=applyCampi; applyCampi();
  document.getElementById('c-ok').onclick=()=>{
    const tipo=tipoCorrente(); const inf=sportInfo(tipo);
    const obj={data:document.getElementById('c-data').value||new Date().toISOString().slice(0,10),
      tipo:tipo,
      durata:+document.getElementById('c-min').value||0,
      rpe:document.getElementById('c-rpe').value===''?'':+document.getElementById('c-rpe').value,
      distanza:(inf.dist&&document.getElementById('c-dist').value!=='')?+document.getElementById('c-dist').value:'',
      quota:(inf.quota&&document.getElementById('c-quota').value!=='')?+document.getElementById('c-quota').value:'',
      fcMedia:document.getElementById('c-fc').value===''?'':+document.getElementById('c-fc').value,
      fcMax:document.getElementById('c-fcmax').value===''?'':+document.getElementById('c-fcmax').value,
      note:document.getElementById('c-note').value.trim()};
    if(!obj.tipo){ alert('Scegli o indica lo sport.'); return; }
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
  /* dislivello positivo (D+): GPX <ele>, TCX <AltitudeMeters>; soglia 0,5 m contro il rumore GPS */
  let quota=''; { const eles=[]; all('ele').forEach(e=>{ const v=nm(tx(e)); if(v!=null) eles.push(v); }); all('altitudemeters').forEach(e=>{ const v=nm(tx(e)); if(v!=null) eles.push(v); });
    if(eles.length>1){ let up=0; for(let i=1;i<eles.length;i++){ const d=eles[i]-eles[i-1]; if(d>0.5) up+=d; } if(up>0) quota=Math.round(up); } }
  let data=''; const id=all('id')[0]; const dRaw= id? tx(id) : (times.length?new Date(times[0]).toISOString():'');
  if(dRaw){ const t=Date.parse(dRaw); if(!isNaN(t)) data=new Date(t).toISOString().slice(0,10); }
  if(!data) data=new Date().toISOString().slice(0,10);
  if(!hrs.length && !durata) return null;  /* niente di utile: non è un'attività valida */
  const fcMedia= hrs.length? Math.round(hrs.reduce((a,b)=>a+b,0)/hrs.length):'';
  const fcMax= hrs.length? hrs.reduce((a,b)=>Math.max(a,b),0):'';
  return {data:data, tipo:tipo||'', durata:durata||'', rpe:'', distanza:distanza||'', quota:quota||'', fcMedia:fcMedia, fcMax:fcMax, note:'importata da file'};
}

/* ── Progressi cardio per sport (in renderProgressi): scegli lo sport e vedi l'andamento
      dei dati che hanno senso per quello sport — passo/velocità, distanza, FC media, sRPE. ── */
let progCardioSport=null;
function cardioProgressBlock(){
  const list=cardioList().filter(s=>s&&s.data&&String(s.tipo||'').trim());
  if(!list.length) return '';
  const cnt={}; list.forEach(s=>{ const t=String(s.tipo).trim(); cnt[t]=(cnt[t]||0)+1; });
  const sports=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);
  if(!progCardioSport || !sports.some(x=>x.toLowerCase()===progCardioSport.toLowerCase())) progCardioSport=sports[0];
  const sel=progCardioSport, inf=sportInfo(sel);
  const ses=list.filter(s=>String(s.tipo).toLowerCase()===sel.toLowerCase()).slice().sort((a,b)=>String(a.data).localeCompare(String(b.data)));
  const lab=ses.map(s=>s.data);
  const charts=[];
  charts.push(`<div class="chart-box"><h4>🔥 Carico sRPE (AU)</h4>${lineChart([{name:'sRPE',color:'var(--gold-2)',data:ses.map(s=>({x:s.data,y:srpeCardio(s)||null}))}],{labels:lab,fmt:nfk})}</div>`);
  if(ses.some(s=>+s.fcMedia>0)) charts.push(`<div class="chart-box"><h4>❤ FC media (bpm)</h4>${lineChart([{name:'FC media',color:'var(--danger-b)',data:ses.map(s=>({x:s.data,y:+s.fcMedia||null}))}],{labels:lab})}</div>`);
  if(inf.dist && ses.some(s=>+s.distanza>0)) charts.push(`<div class="chart-box"><h4>📏 Distanza (km)</h4>${lineChart([{name:'km',color:'var(--orange-b)',data:ses.map(s=>({x:s.data,y:+s.distanza||null}))}],{labels:lab})}</div>`);
  if(inf.ritmo==='passo' && ses.some(s=>passoMinKm(s)!=null)) charts.push(`<div class="chart-box"><h4>⏱ Passo (min/km) <span class="muted" style="font-size:11px">più basso = meglio</span></h4>${lineChart([{name:'passo',color:'var(--violet)',data:ses.map(s=>({x:s.data,y:passoMinKm(s)}))}],{labels:lab,fmt:fmtPasso})}</div>`);
  else if(inf.ritmo==='velocita' && ses.some(s=>velocitaKmh(s)!=null)) charts.push(`<div class="chart-box"><h4>🚀 Velocità media (km/h)</h4>${lineChart([{name:'km/h',color:'var(--violet)',data:ses.map(s=>({x:s.data,y:velocitaKmh(s)}))}],{labels:lab})}</div>`);
  if(inf.quota && ses.some(s=>+s.quota>0)) charts.push(`<div class="chart-box"><h4>⛰ Dislivello D+ (m)</h4>${lineChart([{name:'D+',color:'var(--ink-3)',data:ses.map(s=>({x:s.data,y:+s.quota||null}))}],{labels:lab})}</div>`);
  let grid=''; for(let i=0;i<charts.length;i+=2){ grid+=`<div class="chart-grid">${charts[i]}${charts[i+1]||''}</div>`; }
  const selHtml=`<select id="prog-cardio-sport" style="margin-left:auto;font-size:13px">${sports.map(sp=>`<option${sp.toLowerCase()===sel.toLowerCase()?' selected':''}>${esc(sp)}</option>`).join('')}</select>`;
  return `<div class="sec">▌ Cardio · progressione per sport ${selHtml}</div>
    ${ses.length<2?'<div class="callout callout--info"><div>Servono almeno 2 sedute di <b>'+esc(sel)+'</b> per vedere un andamento.</div></div>':''}
    ${grid}`;
}
function bindCardioProgress(){ const s=document.getElementById('prog-cardio-sport'); if(s) s.onchange=()=>{ progCardioSport=s.value; renderProgressi(); }; }

/* ── Sezione Cardio per il Report (PDF + report digitale): riassunto + andamento sRPE +
      ultime attività. Statico (niente controlli interattivi), si impagina come le altre. ── */
function cardioReportBlock(){
  const list=cardioList().filter(s=>s&&s.data);
  if(!list.length) return '';
  const sorted=list.slice().sort((a,b)=>String(a.data).localeCompare(String(b.data)));
  const nSed=list.length, auTot=list.reduce((t,s)=>t+srpeCardio(s),0), minTot=list.reduce((t,s)=>t+(+s.durata||0),0);
  const cnt={}; list.forEach(s=>{ const t=String(s.tipo||'').trim(); if(t) cnt[t]=(cnt[t]||0)+1; });
  const sportPrinc=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0]||'—';
  const lab=sorted.map(s=>s.data);
  const auChart=lineChart([{name:'sRPE',color:'var(--gold-2)',data:sorted.map(s=>({x:s.data,y:srpeCardio(s)||null}))}],{labels:lab,h:160,fmt:nfk});
  const recent=list.slice().sort((a,b)=>String(b.data).localeCompare(String(a.data))).slice(0,10);
  const rows=recent.map(s=>{ const tr=trimpCardio(s); return `<tr><td class="l">${esc(s.data)}</td><td class="l">${esc(s.tipo||'')}</td><td class="num">${nf(s.durata,0)}</td><td class="num">${s.distanza?nf(s.distanza,1):'—'}</td><td class="num">${cardioRitmo(s)}</td><td class="num">${s.fcMedia?nf(s.fcMedia,0):'—'}</td><td class="num cell-out">${srpeCardio(s)||'—'}</td><td class="num">${tr==null?'—':tr}</td></tr>`; }).join('');
  return `<div class="rep-sec"><div class="sec">▌ Cardio · attività e carico interno</div>
     <div class="cards">
       <div class="card k--ember"><div class="card__k">Sedute</div><div class="card__v">${nSed}</div></div>
       <div class="card"><div class="card__k">Carico interno sRPE</div><div class="card__v">${nfk(auTot)}<small> AU</small></div></div>
       <div class="card"><div class="card__k">Tempo totale</div><div class="card__v">${nf(minTot/60,1)}<small> h</small></div></div>
       <div class="card k--violet"><div class="card__k">Sport principale</div><div class="card__v" style="font-size:16px">${esc(sportPrinc)}</div></div>
     </div>
     <div class="chart-box" style="margin-top:8px"><h4>Carico cardio (sRPE) nel tempo</h4>${auChart}</div>
     <div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th class="l">Data</th><th class="l">Sport</th><th>Min</th><th>km</th><th>Ritmo</th><th>FC media</th><th>sRPE</th><th>TRIMP</th></tr></thead><tbody>${rows}</tbody></table></div>
     <p class="muted" style="font-size:12px">Carico interno delle attività cardio: <b>sRPE</b> = RPE×min (Foster), <b>TRIMP</b> dalla frequenza cardiaca (Banister). Passo/velocità e distanza dove rilevati.</p></div>`;
}
