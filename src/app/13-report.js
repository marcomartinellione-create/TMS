/* ════════════════ RENDER: REPORT ════════════════
   Pagina a due colonne (2026-11-13): a sinistra l'ANTEPRIMA del PDF in fogli A4 veri (la stessa
   impaginazione che esce nel PDF: quello che si vede è il PDF), a destra gli STRUMENTI.
   Il report è fatto di BLOCCHI (copertina, profilo, riepilogo, scheda… piè di pagina) e ogni
   blocco di ELEMENTI (schede dei valori, grafici, tabelle, testi):
   - blocchi: si trascinano (nell'elenco o dal manico ⠿ nell'anteprima), si mostrano/nascondono,
     si tolgono, hanno impostazioni proprie (titolo, descrizione, pagina nuova, tutto in una
     pagina, grandezza del testo, colore della barra, grafici affiancati o in colonna). Ordine,
     visibilità e impostazioni si SALVANO per profilo (DOC.dati_utente.report);
   - elementi e testi: si selezionano nell'anteprima, si spostano su/giù, si tolgono, e con
     «✎ Modifica testo» si scrive direttamente nel foglio. Questi ritocchi valgono SOLO per il
     documento aperto (memoria, per profilo): «↺ Rifai dai dati» riporta il blocco ai dati. */
/* repCtx: QUALE dei due documenti a blocchi è aperto adesso (Report o Stampa dieta). Lo stesso
   motore (sotto) serve entrambi: repCtx dice dove scrivere (pre = prefisso degli id, pannello =
   contenitore), quali blocchi sono fissi (il primo e l'ultimo dell'elenco: copertina/piede per il
   Report, intro/totale per la dieta), quali diventano «big» (tabelle a tutta larghezza), come
   ridisegnare tutto (render) e come si chiama il documento per tenere separati i ritocchi a mano
   (chiave, usata da repEdits insieme al profilo). repCtx.documento()/collegaDocumento() generano
   e collegano il riquadro «Documento» in cima agli strumenti, diverso per i due casi. */
let repCtx=null;   /* diventa CTX_REPORT o CTX_DIETA appena parte un render */
function ID(s){ return repCtx.pre+'-'+s; }
const REP_DEF_IMP={titolo:'', mostraTitolo:true, mostraDescr:true, nuovaPagina:false, unito:false, testo:'n', colore:'', grafici:'affiancati'};
let repSel={blocco:null, el:null}, repInModifica=null, repEdit={chiave:null, blocchi:{}}, repGenerati={}, repNomi={};
function repEdits(){ const ch=activeProfile+'·'+repCtx.chiave(); if(repEdit.chiave!==ch) repEdit={chiave:ch, blocchi:{}}; return repEdit.blocchi; }
function repImp(R,k){ return Object.assign({}, REP_DEF_IMP, (R.blocchi||{})[k]||{}); }
function repSalvaImp(R,k,imp){ R.blocchi=R.blocchi||{}; const o={}; Object.keys(REP_DEF_IMP).forEach(x=>{ if(imp[x]!==REP_DEF_IMP[x]) o[x]=imp[x]; });
  if(Object.keys(o).length) R.blocchi[k]=o; else delete R.blocchi[k]; persist(repCtx.persist); }
/* prepara il blocco appena generato: titolo in <span class="rep-tit">, un numero a ogni elemento,
   le righe di spiegazione marcate come descrizione (si possono nascondere) */
function repPrepara(sec, k){
  const h=sec.querySelector(':scope > .sec');
  if(h && !h.querySelector('.rep-tit')){ const n=[...h.childNodes].find(x=>x.nodeType===3 && x.textContent.trim());
    if(n){ const s=document.createElement('span'); s.className='rep-tit'; s.textContent=n.textContent.trim(); h.replaceChild(s,n); } }
  let i=0; [...sec.children].forEach(c=>{ if(c.classList.contains('sec')) return; c.setAttribute('data-el', String(i++));
    if(k!==repCtx.fissi[repCtx.fissi.length-1] && c.classList.contains('muted') && (c.tagName==='P'||c.tagName==='DIV')) c.classList.add('rep-descr'); });
}
/* il blocco com'è da mostrare: ritoccato a mano se c'è, altrimenti dai dati; poi le impostazioni */
function repBloccoHTML(R, k, html){
  const box=document.createElement('div'); box.innerHTML=html||''; let sec=box.firstElementChild;
  if(!sec) return '';
  repPrepara(sec,k); repGenerati[k]=sec.outerHTML;
  const ed=repEdits()[k]; if(ed){ box.innerHTML=ed; sec=box.firstElementChild; }
  const imp=repImp(R,k);
  sec.className='rep-sec'+(repCtx.grandi.indexOf(k)>=0?' big':'');
  sec.setAttribute('data-blocco',k);
  if(!imp.mostraTitolo) sec.classList.add('rep-no-tit');
  if(!imp.mostraDescr) sec.classList.add('rep-no-descr');
  if(imp.testo!=='n') sec.classList.add('t-'+imp.testo);
  if(imp.colore) sec.classList.add('col-'+imp.colore);
  if(imp.grafici==='colonna') sec.classList.add('rep-graf-colonna');
  if(imp.nuovaPagina) sec.setAttribute('data-nuovapagina','1'); else sec.removeAttribute('data-nuovapagina');
  if(imp.unito||k===repCtx.fissi[0]) sec.setAttribute('data-unito','1'); else sec.removeAttribute('data-unito');
  if(imp.titolo){ const tt=sec.querySelector(':scope > .sec .rep-tit'); if(tt) tt.textContent=imp.titolo; }
  if(ed) sec.setAttribute('data-ritoccato','1');
  return sec.outerHTML;
}
/* i fondamentali del blocco «Progressione esercizi»: per ognuno il primo nome che lo Storico usa,
   prima quello del catalogo di oggi e poi i nomi di una volta (storici vecchi). Fino al 18/11/2026
   c'erano solo i nomi vecchi («Squat bilanciere»…) e il blocco restava sempre «senza dati». */
const FONDAMENTALI_REPORT=[
  ['Panca piana con bilanciere - presa media','Panca piana bilanciere'],
  ['Squat con bilanciere','Squat bilanciere'],
  ['Stacco da terra con bilanciere','Stacco da terra'],
  ['Military press in piedi','Military press / Overhead press'],
  ['Trazioni alla sbarra (pull-up)','Trazioni alla sbarra con peso','Trazioni alla sbarra']];
function fondamentaliReport(){ const usati=new Set((DOC.storico||[]).map(r=>r&&r.esercizio));
  return FONDAMENTALI_REPORT.map(nomi=>nomi.find(n=>usati.has(n))).filter(Boolean); }
function renderReport(){
  repCtx=CTX_REPORT;
  const u=DOC.dati_utente; const c=bodyCalc(u);
  const def={profilo:true,foto:false,riepilogo:true,scheda:true,andamento:true,progressione:true,record:true,cardio:true,alimentazione:true,analisi:true,note:true,obiettivo:(u.obiettivo||''),nota:'',fotoPrima:'',fotoDopo:''};
  u.report=Object.assign({},def,u.report||{}); const R=u.report;
  const ag=schedeAggr(); const last=ag.length?ag[ag.length-1]:null, prev=ag.length>1?ag[ag.length-2]:null;
  const labels=ag.map(a=>schedaLabel(a.scheda));
  const dTL=(last&&prev&&prev.tl)?(last.tl/prev.tl-1)*100:0;
  const lastPct=last&&last.pctN?last.pctSum/last.pctN:0;
  const acwr=acwrUltimo(ag);
  const prog=DOC.scheda.settimanale||[]; const smap=sedutaMap(prog);
  let progTL=0; prog.forEach(r=>{ if(r.esercizio) progTL+=sTL(r); });
  let progBody='',lastDay=null; prog.forEach(r=>{ if(!r.esercizio)return; if(r.giorno&&r.giorno!==lastDay){lastDay=r.giorno; progBody+=`<tr class="day-sep"><td colspan="6">▌ ${esc(giornoNome(r.giorno))}</td></tr>`;} const p=sPct(r),fa=fascia(p),sd=rowSeduta(smap,r),tgt=(esLookup(r.esercizio)||{}).target||''; progBody+=`<tr><td class="l">${esc(exName(r.esercizio))}${sd>1?` <span class="pill">S${sd}</span>`:''}</td><td class="l muted" style="font-size:11px">${esc(tgt)}</td><td class="num">${nf(r.serie,0)}×${nf(r.rip,0)}</td><td class="num">${nf(r.peso,1)}</td><td class="num">${esc(r.rest||'')}</td><td><span class="fascia ${fa[1]}">${t(fa[0])}</span></td></tr>`; });
  const A=DOC.alimentazione; const faseR=faseAlimActive(), tR=faseTot(A[faseR]||[]);
  const io=DOC.storico_io; const prs=prList().slice(0,8);
  const mainLifts=fondamentaliReport();
  const toggles=[['profilo','Profilo & corpo'],['foto','Foto progressi (prima/dopo)'],['riepilogo','Riepilogo allenamento'],['scheda','Scheda di allenamento'],['andamento','Grafici di andamento'],['progressione','Progressione esercizi'],['record','Record personali'],['cardio','Cardio (attività)'],['alimentazione','Alimentazione'],['analisi','Dieta × allenamento'],['note','Note del coach']].map(x=>[x[0],t(x[1])]);
  repNomi={copertina:t('Copertina'), piede:t('Piè di pagina')}; toggles.forEach(x=>{ repNomi[x[0]]=x[1]; });
  /* ordine personalizzabile delle sezioni (per profilo): parte dal default, completa con eventuali sezioni nuove */
  const KEYS=toggles.map(x=>x[0]);
  let ordine=(Array.isArray(R.ordine)?R.ordine:[]).filter(k=>KEYS.indexOf(k)>=0);
  KEYS.forEach(k=>{ if(ordine.indexOf(k)<0) ordine.push(k); });
  R.ordine=ordine;
  /* foto report: default prima=più vecchia, dopo=più recente (se ci sono foto) */
  const _fl=(DOC.foto||[]).slice().sort((a,b)=>String(a.data||'').localeCompare(String(b.data||'')));
  if(_fl.length){ if(!_fl.some(f=>f.file===R.fotoPrima)) R.fotoPrima=_fl[0].file; if(!_fl.some(f=>f.file===R.fotoDopo)) R.fotoDopo=_fl[_fl.length-1].file; }
  const B={};
  if(R.profilo){ B.profilo=`<div class="rep-sec"><div class="sec">${t('Profilo & composizione corporea')}</div>
     <div class="cards">
       <div class="card"><div class="card__k">${t('Età')}</div><div class="card__v">${nf(etaOf(u),0)}<small> ${t('anni')}</small></div></div>
       <div class="card"><div class="card__k">${t('Altezza')}</div><div class="card__v">${nf(u.altezza,0)}<small> cm</small></div></div>
       <div class="card k--ember"><div class="card__k">${t('Peso')}</div><div class="card__v">${io.length?nf(io[io.length-1].peso,1):nf(u.peso,1)}<small> kg</small></div></div>
       <div class="card"><div class="card__k">BMI</div><div class="card__v">${nf(c.bmi,1)}</div><div class="card__sub">${c.bmi<18.5?t('sottopeso'):c.bmi<25?t('normopeso'):c.bmi<30?t('sovrappeso'):t('obesità')}</div></div>
       <div class="card k--ok"><div class="card__k">${t('Massa magra')}</div><div class="card__v">${nf(c.magraKg,1)}<small> kg</small></div></div>
       <div class="card k--danger"><div class="card__k">${t('Massa grassa')}</div><div class="card__v">${nf(c.grassaKg,1)}<small> kg</small></div><div class="card__sub">${nf((u.massa_grassa||0)*100,1)}%</div></div>
       <div class="card k--violet"><div class="card__k">${t('Fabbisogno')}</div><div class="card__v">${nf(c.metab,0)}<small> kcal</small></div></div>
     </div>
     ${io.length>1?`<div class="chart-box" style="margin-top:10px"><h4>${t('Andamento peso')}</h4>${lineChart([{name:t('Peso'),color:'var(--orange-b)',data:io.map(r=>({x:schedaLabel(r.scheda),y:+r.peso}))}],{h:105})}</div>`:''}
     <p class="muted" style="font-size:12px">${t('Il <b>BMI</b> mette in rapporto peso e altezza; <b>massa magra/grassa</b> e <b>fabbisogno calorico</b> orientano l\'alimentazione.')}</p></div>`; }
  if(R.foto){ const fp=(DOC.foto||[]).find(x=>x.file===R.fotoPrima), fd=(DOC.foto||[]).find(x=>x.file===R.fotoDopo);
    if(fp||fd){ const cell=(f,lab)=>{ if(!f) return `<div style="flex:1;text-align:center"><div style="font-weight:700;color:var(--ember-2)">${lab}</div><div class="muted" style="padding:16px">—</div></div>`;
        const du=fotoReportUri[f.file], pz=fotoPeso(f.data);
        return `<div style="flex:1;text-align:center;min-width:0"><div style="font-weight:700;color:var(--ember-2)">${lab}</div>${du?`<img src="${du}" alt="${lab}" style="max-width:100%;max-height:240px;border-radius:var(--r-sm);border:1px solid var(--border)">`:`<div class="muted" style="padding:16px">${fotoReportMancanti[f.file]? t('foto non trovata') : t('(caricamento foto…)')}</div>`}<div class="muted" style="font-size:12px;margin-top:3px">${esc(fotoDataLabel(f))}${pz?' · '+nf(pz,1)+' kg':''}</div></div>`; };
      B.foto=`<div class="rep-sec"><div class="sec">${t('Foto progressi — prima / dopo')}</div>
       <div style="display:flex;gap:14px;align-items:flex-start">${cell(fp,t('Prima'))}${cell(fd,t('Dopo'))}</div></div>`; } }
  if(R.riepilogo && last){ B.riepilogo=`<div class="rep-sec"><div class="sec">${t('Riepilogo allenamento')}</div>
     <div class="cards">
       <div class="card k--ember"><div class="card__k">${t('Carico (TL) ultima scheda')}</div><div class="card__v">${nfk(last.tl)}</div></div>
       <div class="card ${dTL>=0?'k--ok':'k--danger'}"><div class="card__k">${t('Variazione vs prec.')}</div><div class="card__v">${dTL>=0?'▲':'▼'} ${nf(Math.abs(dTL),1)}%</div></div>
       <div class="card"><div class="card__k">${t('Intensità media')}</div><div class="card__v">${nf(lastPct,1)}%</div><div class="card__sub">${t(fascia(lastPct)[0])}</div></div>
       <div class="card ${acwr==null?'':(acwr>=0.8&&acwr<=1.3?'k--ok':'k--danger')}"><div class="card__k">${t('Sicurezza carico')}</div><div class="card__v">${acwr==null?'—':nf(acwr,2)}</div><div class="card__sub">ACWR · ${acwr==null?'':(acwr<0.8?t('scarico'):acwr<=1.3?t('ottimale'):t('alto'))}</div></div>
     </div>
     <p class="muted" style="font-size:12px">${t('Il <b>carico (TL)</b> riassume il lavoro svolto: più cresce nel tempo, più c\'è progressione. La <b>sicurezza carico (ACWR)</b> indica se l\'aumento è sostenibile (ideale 0.8–1.3).')}</p></div>`; }
  if(R.scheda && prog.some(r=>r.esercizio)){ B.scheda=`<div class="rep-sec big"><div class="sec">${t('Scheda di allenamento')} <span class="pill" style="margin-left:auto">${t('carico piano')} ${nfk(progTL)}</span></div>
     <div class="tbl-wrap"><table style="table-layout:fixed;width:100%"><colgroup><col style="width:24%"><col style="width:32%"><col style="width:12%"><col style="width:10%"><col style="width:9%"><col style="width:13%"></colgroup><thead><tr><th class="l">${t('Esercizio')}</th><th class="l">${t('Target muscolare')}</th><th>${t('Serie×Rip')}</th><th>${t('Peso')}</th><th>${t('Rec.')}</th><th>${t('Zona')}</th></tr></thead><tbody>${progBody}</tbody></table></div></div>`; }
  if(R.andamento && ag.length){ B.andamento=`<div class="rep-sec"><div class="sec">${t('Andamento del carico')}</div>
     <div class="chart-grid">
       <div class="chart-box"><h4>${t('Carico (TL) nel tempo')}</h4>${lineChart([{name:'TL',color:'var(--orange-b)',data:ag.map(a=>({x:schedaLabel(a.scheda),y:a.tl||null}))}],{labels,h:125,fmt:nfk})}</div>
       <div class="chart-box"><h4>${t('Equilibrio · distribuzione')}</h4>${(()=>{ const rc=rifCalcola(); return radarChart(vociDistribuzione(last.sets,{D:last.setsD,I:last.setsI},rc),{h:175})+rifDidascalia(rc); })()}</div>
     </div>
     <p class="muted" style="font-size:12px">${t('A sinistra la crescita del carico settimana dopo settimana; a destra quanto è bilanciato il lavoro tra i gruppi muscolari.')}</p></div>`; }
  if(R.progressione && mainLifts.length){ const cols=['#c2500a','#d4a017','#2f7d4f','#7a3ea8','#991b1b'];
     const series=mainLifts.map((n,idx)=>({name:exName(n.replace(' / Overhead press','')),color:cols[idx%cols.length],data:exProgression(n).map(p=>({x:schedaLabel(p.scheda),y:p.rm||null}))}));
     B.progressione=`<div class="rep-sec"><div class="sec">${t('Progressione di forza (1RM stimato)')}</div>
     <div class="chart-box">${lineChart(series,{h:150})}</div>
     <p class="muted" style="font-size:12px">${t('Massimale stimato sui principali esercizi: una linea che sale significa aumento di forza.')}</p></div>`; }
  if(R.record){ B.record=`<div class="rep-sec big"><div class="sec">${t('Record personali (carico massimo)')}</div>
     <div class="tbl-wrap"><table><thead><tr><th class="l">${t('Esercizio')}</th><th>${t('Carico max')}</th><th>${t('Rip.')}</th><th>${t('Scheda')}</th></tr></thead><tbody>${prs.map(p=>`<tr><td class="l">${esc(exName(p.nome))}</td><td class="num cell-out">${nf(p.peso,1)} kg</td><td class="num">${nf(p.rip,0)}</td><td class="num">${p.scheda}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">—</td></tr>'}</tbody></table></div></div>`; }
  if(R.cardio){ B.cardio=cardioReportBlock(); }
  if(R.alimentazione){ B.alimentazione=`<div class="rep-sec"><div class="sec">${t('Quadro alimentare · fase')} ${t(FASE_LAB[faseR]||faseR)} ${t('(piano giornaliero)')}</div>
     <div class="tbl-wrap"><table><thead><tr><th class="l">${t('Fase')}</th><th>Kcal</th><th>${t('Proteine')}</th><th>${t('Grassi')}</th><th>${t('Carboidrati')}</th><th>${t('Fibre')}</th></tr></thead><tbody>
       <tr><td class="l">${t(FASE_LAB[faseR]||faseR)}</td><td class="num cell-out">${nf(tR.kcal,0)}</td><td class="num">${nf(tR.proteine,1)}</td><td class="num">${nf(tR.grassi,1)}</td><td class="num">${nf(tR.zuccheri,1)}</td><td class="num">${nf(tR.fibre,1)}</td></tr>
     </tbody></table></div></div>`; }
  if(R.analisi){
    const periodiR=((DOC.alimentazione||{}).periodi)||[];
    if(periodiR.length){ const settR=serieSettimanali();
      B.analisi=`<div class="rep-sec"><div class="sec">${t('Dieta × allenamento — periodi, carico e peso')}</div>
       <div class="rep-graf">${timelineChart(settR)}</div>
       <div class="muted" style="font-size:11px;margin-top:4px">${t('Fasce colorate = periodi alimentari registrati (con le kcal/giorno del piano); linee = Training Load settimanale (asse sx) e peso corporeo (asse dx).')}</div></div>`; }
  }
  if(R.note){ B.note=`<div class="rep-sec"><div class="sec">${t('Note del coach')}</div>
     <div class="rep-nota" style="white-space:pre-wrap;font-size:13px">${esc(R.nota||'')||'<span class="muted">—</span>'}</div></div>`; }
  B.copertina=`<div class="rep-sec rep-copertina">
     <div><h1 style="font-size:20px;color:var(--ember-2);margin:0">${t('Report di Allenamento')}</h1>
       <div class="muted mono" style="font-size:12px">${esc(u.nome||profNome()||t('Atleta'))}${u.cognome?' '+esc(u.cognome):''} · ${new Date().toLocaleDateString(LANG==='en'?'en-GB':'it-IT')}${last?' · '+t('scheda')+' '+last.scheda:''}</div>
       <div class="rep-obiettivo${R.obiettivo?'':' rep-obiettivo--vuoto'}" style="margin-top:6px"><b>${t('Obiettivo:')}</b> <span class="rep-obiettivo-txt">${esc(R.obiettivo||'')}</span></div></div>
     <div style="text-align:right;font-family:var(--font-disp);color:var(--gold-2);font-size:13px;white-space:nowrap">✦ Training Monitor System</div></div>`;
  B.piede=`<div class="rep-sec rep-piede"><p class="muted" style="font-size:11px;margin-top:14px;border-top:1px solid var(--border);padding-top:8px">${t('Report generato dal Training Monitor System. Indici a scopo informativo, non sostituiscono un parere medico/professionale.')}</p></div>`;
  repGenerati={};
  const visibili=['copertina'].concat(ordine.filter(k=>R[k]&&B[k]),['piede']);
  const sorgente=visibili.map(k=>repBloccoHTML(R,k,B[k])).join('');
  if(repSel.blocco && visibili.indexOf(repSel.blocco)<0) repSel={blocco:null, el:null};
  if(repInModifica && visibili.indexOf(repInModifica)<0) repInModifica=null;
  document.getElementById(repCtx.pannello).innerHTML=`<div class="pag pag--report">
     <div class="pag__main" id="${ID('anteprima')}"><div class="rep-pagine" id="${ID('pagine')}"></div></div>
     <aside class="pag__side no-print" id="${ID('strumenti')}">${repStrumenti(R, ordine, B)}</aside></div>
   <div class="rep-doc" id="${ID('sorgente')}" hidden>${sorgente}</div>`;
  repUltimo={ordine, B};
  repImpaginaAnteprima();
  repCollega(R);
  if(R.foto && [R.fotoPrima,R.fotoDopo].some(f=>f && !fotoReportUri[f] && !fotoReportMancanti[f])) ensureReportFoto().then(()=>{ if(curTab==='report') renderReport(); });
}
/* cambia la selezione senza rifare i fogli: si aggiornano solo gli strumenti e i contorni */
let repUltimo=null;
function repAggiornaSel(){
  const R=repCtx.R(), side=document.getElementById(ID('strumenti'));
  if(!side||!repUltimo){ repCtx.render(); return; }
  const sc=side.scrollTop;   /* scegliere un blocco/elemento non deve far saltare in cima gli strumenti */
  side.innerHTML=repStrumenti(R, repUltimo.ordine, repUltimo.B);
  side.scrollTop=sc;
  const pagine=document.getElementById(ID('pagine'));
  pagine.querySelectorAll('.is-sel,.is-sel-el').forEach(x=>x.classList.remove('is-sel','is-sel-el'));
  pagine.querySelectorAll('.u[data-blocco="'+repSel.blocco+'"]').forEach(u=>{ u.classList.add('is-sel');
    if(repSel.el!=null) u.querySelectorAll('[data-el="'+repSel.el+'"]').forEach(x=>x.classList.add('is-sel-el')); });
  repCollega(R);
}
/* ── colonna destra: documento, blocchi, blocco scelto, elemento scelto ── */
function repStrumenti(R, ordine, B){
  const ed=repEdits(), k=repSel.blocco;
  const fissi=repCtx.fissi, primo=fissi[0], ultimo=fissi[fissi.length-1];
  const riga=(b,fisso)=>{ const sel=b===k?' is-sel':'', vuoto=!fisso&&R[b]&&!B[b];
    return `<div class="rep-li${sel}${fisso?' rep-li--fisso':''}${!fisso&&!R[b]?' rep-li--spento':''}"${fisso?'':` draggable="true" data-trascina="${b}"`} data-selblocco="${b}">
      <span class="rep-li__man" title="${fisso?t('Questo blocco resta al suo posto'):t('Trascina per spostare')}">${fisso?'·':'⠿'}</span>
      ${fisso?'':`<input type="checkbox" data-rep="${b}" ${R[b]?'checked':''} title="${t('Mostra o nascondi il blocco')}">`}
      <span class="rep-li__nome">${esc(repNomi[b]||b)}${vuoto?` <span class="muted" style="font-size:10.5px">${t('(senza dati)')}</span>`:''}</span>
      ${ed[b]?`<span class="pill pill--avviso" title="${t('Ritoccato a mano in questo documento')}">${ico('matita','p')}</span>`:''}
      ${fisso?'':`<button class="rep-li__mv" data-repmove="${b}" data-dir="-1" title="${t('Sposta su')}">${ico('su','p')}</button><button class="rep-li__mv" data-repmove="${b}" data-dir="1" title="${t('Sposta giù')}">${ico('giu','p')}</button>`}</div>`; };
  const lista=`<div class="lat"><h4>${t('Blocchi')} <span class="muted">${t('trascina per riordinare')}</span></h4>
     <div class="rep-lista" id="${ID('lista')}">${riga(primo,true)}${ordine.map(b=>riga(b,false)).join('')}${riga(ultimo,true)}</div>
     <div class="lat-nota">${t('Clicca un blocco (qui o nell\'anteprima) per le sue impostazioni; clicca un elemento nell\'anteprima per spostarlo o toglierlo.')}</div></div>`;
  return repCtx.documento(R)+lista+repPannelloBlocco(R)+repPannelloElemento();
}
function repPannelloBlocco(R){
  const k=repSel.blocco;
  if(!k) return `<div class="lat" id="${ID('imp')}"><h4>${t('Blocco')}</h4><div class="lat-nota">${t('Nessun blocco scelto.')}</div></div>`;
  const imp=repImp(R,k), ed=repEdits()[k];
  const gen=document.createElement('div'); gen.innerHTML=repGenerati[k]||'';
  const tit0=((gen.querySelector('.rep-tit')||{}).textContent)||'';
  const haDescr=!!gen.querySelector('.rep-descr'), haGraf=gen.querySelectorAll('.chart-box').length>1, haTit=!!tit0;
  const ck=(id,on,lab,tip)=>`<label class="rep-ck" title="${tip||''}"><input type="checkbox" data-imp="${id}" ${on?'checked':''}> ${lab}</label>`;
  const COL=[['',t('Arancio')],['gold',t('Oro')],['ok',t('Verde')],['violet',t('Viola')],['ink',t('Inchiostro')]];
  if(repInModifica===k) return `<div class="lat rep-imp--modifica" id="${ID('imp')}"><h4>${esc(repNomi[k]||k)} <span class="muted">${t('in modifica')}</span></h4>
     <div class="lat-nota" style="margin:0 0 8px">${t('Scrivi direttamente nel foglio a sinistra. Per le righe di una tabella metti prima il cursore nella riga.')}</div>
     <div class="bar" style="margin:0;gap:6px;flex-wrap:wrap">
       <span class="gruppo"><button class="btn" data-repop="riga-sopra">${t('＋ Riga sopra')}</button><button class="btn" data-repop="riga-sotto">${t('＋ Riga sotto')}</button><button class="btn" data-repop="riga-via">${ico('x')}${t('Togli riga')}</button></span>
       <button class="btn btn--ember" id="${ID('fine')}">${ico('check')}${t('Fine modifica')}</button></div></div>`;
  return `<div class="lat" id="${ID('imp')}"><h4>${esc(repNomi[k]||k)}${ed?` <span class="pill pill--avviso">${t('ritoccato')}</span>`:''}</h4>
     ${haTit?`<div class="field"><label>${t('Titolo')}</label><input id="${ID('imp-titolo')}" value="${esc(imp.titolo)}" placeholder="${esc(tit0)}" style="width:100%"></div>
     <div class="rep-cks">${ck('mostraTitolo',imp.mostraTitolo,t('mostra il titolo'))}${haDescr?ck('mostraDescr',imp.mostraDescr,t('mostra la spiegazione')):''}</div>`:''}
     <div class="sec-mini">${t('Impaginazione')}</div>
     <div class="rep-cks">${k===repCtx.fissi[0]?'':ck('nuovaPagina',imp.nuovaPagina,t('inizia su una pagina nuova'))}${k===repCtx.fissi[0]?'':ck('unito',imp.unito,t('tutto nella stessa pagina'),t('Se il blocco è più alto di una pagina viene comunque diviso'))}</div>
     <div class="sec-mini">${t('Aspetto')}</div>
     <div class="rep-opz"><span>${t('Testo')}</span><span class="gruppo">${[['p',t('piccolo')],['n',t('normale')],['g',t('grande')]].map(([v,l])=>`<button class="btn${imp.testo===v?' is-on':''}" data-imp-testo="${v}">${l}</button>`).join('')}</span></div>
     ${haTit?`<div class="rep-opz"><span>${t('Colore del titolo')}</span><span class="rep-colori">${COL.map(([v,l])=>`<button class="rep-col col-${v||'def'}${imp.colore===v?' is-on':''}" data-imp-colore="${v}" title="${l}"></button>`).join('')}</span></div>`:''}
     ${haGraf?`<div class="rep-opz"><span>${t('Grafici')}</span><span class="gruppo">${[['affiancati',t('affiancati')],['colonna',t('uno sotto l\'altro')]].map(([v,l])=>`<button class="btn${imp.grafici===v?' is-on':''}" data-imp-grafici="${v}">${l}</button>`).join('')}</span></div>`:''}
     <div class="bar" style="margin:10px 0 0;gap:6px;flex-wrap:wrap">
       <button class="btn" id="${ID('modifica')}" title="${t('Scrivi direttamente nel foglio: titoli, testi, celle')}">${ico('matita')}${t('Modifica testo')}</button>
       ${ed?`<button class="btn" id="${ID('rifai')}" title="${t('Toglie i ritocchi a mano e riprende i dati aggiornati')}">${ico('annulla')}${t('Rifai dai dati')}</button>`:''}
       ${repCtx.fissi.indexOf(k)<0?`<button class="btn btn--danger" id="${ID('togli')}" title="${t('Toglie il blocco dal report (lo rimetti spuntandolo nell\'elenco)')}">${ico('x')}${t('Togli dal report')}</button>`:''}
       <button class="btn" id="${ID('imp-reset')}" title="${t('Riporta le impostazioni del blocco a quelle iniziali')}">${t('Impostazioni iniziali')}</button></div></div>`;
}
function repNomeElemento(el){
  if(!el) return '';
  if(el.classList.contains('cards')) return t('Schede dei valori');
  if(el.classList.contains('chart-grid')) return t('Grafici');
  if(el.classList.contains('chart-box')){ const h=el.querySelector('h4'); return t('Grafico')+(h?' «'+h.textContent.trim()+'»':''); }
  if(el.classList.contains('tbl-wrap')) return t('Tabella');
  if(el.querySelector&&el.querySelector('img')) return t('Foto');
  if(el.querySelector&&el.querySelector('svg')) return t('Grafico');
  return t('Testo');
}
function repPannelloElemento(){
  const k=repSel.blocco, n=repSel.el; if(!k||n==null||repInModifica) return '';
  const el=document.createElement('div'); el.innerHTML=repBaseBlocco(k);
  const x=el.querySelector('[data-el="'+n+'"]'); if(!x) return '';
  return `<div class="lat" id="${ID('el')}"><h4>${esc(repNomeElemento(x))} <span class="muted">${t('elemento')}</span></h4>
     <div class="bar" style="margin:0;gap:6px;flex-wrap:wrap"><span class="gruppo"><button class="btn" data-elop="su">${ico('su')}${t('Su')}</button><button class="btn" data-elop="giu">${ico('giu')}${t('Giù')}</button></span>
       <button class="btn btn--danger" data-elop="via">${ico('x')}${t('Togli elemento')}</button></div>
     <div class="lat-nota">${t('Vale solo per questo documento: «↺ Rifai dai dati» sul blocco lo rimette.')}</div></div>`;
}
/* il blocco come base per le modifiche: il ritocco se c'è, altrimenti quello appena generato */
function repBaseBlocco(k){ return repEdits()[k] || repGenerati[k] || ''; }
function repElemento(op){
  const k=repSel.blocco, n=repSel.el; if(!k||n==null) return;
  const box=document.createElement('div'); box.innerHTML=repBaseBlocco(k); const sec=box.firstElementChild; if(!sec) return;
  const x=sec.querySelector(':scope > [data-el="'+n+'"]'); if(!x) return;
  const fratelli=[...sec.children].filter(c=>c.hasAttribute('data-el'));
  const i=fratelli.indexOf(x);
  if(op==='via'){ x.remove(); repSel.el=null; }
  else if(op==='su' && i>0) sec.insertBefore(x, fratelli[i-1]);
  else if(op==='giu' && i<fratelli.length-1) sec.insertBefore(fratelli[i+1], x);
  else return;
  repEdits()[k]=sec.outerHTML; repCtx.render();
}
/* ── colonna sinistra: i fogli A4 (stessa impaginazione del PDF) ── */
function repImpaginaAnteprima(){
  const cont=document.getElementById(ID('pagine')), src=document.getElementById(ID('sorgente')); if(!cont||!src) return;
  const probe=document.createElement('div'); probe.style.cssText='position:absolute;visibility:hidden;height:100mm;width:1px'; cont.appendChild(probe);
  const pxPerMm=(probe.offsetHeight||377.95)/100; cont.removeChild(probe);
  const pagine=repImpagina(cont, buildReportUnits(document, src), pxPerMm, 297);
  pagine.forEach((pg,i)=>{ pg.setAttribute('data-pagina', t('Pagina')+' '+(i+1)+' / '+pagine.length); });
  /* manico ⠿ sul primo pezzo di ogni blocco che si può spostare; selezione e modifica */
  const visti={};
  cont.querySelectorAll('.u[data-blocco]').forEach(u=>{ const k=u.dataset.blocco;
    if(k===repSel.blocco) u.classList.add('is-sel');
    if(k===repInModifica){ u.setAttribute('contenteditable','true'); u.classList.add('is-modifica'); }
    if(!visti[k]){ visti[k]=1; if(repCtx.fissi.indexOf(k)<0 && repInModifica!==k){
      const m=document.createElement('span'); m.className='rep-maniglia'; m.textContent='⠿'; m.title=t('Trascina per spostare il blocco'); m.setAttribute('draggable','true'); m.setAttribute('data-trascina',k); m.setAttribute('contenteditable','false'); u.insertBefore(m,u.firstChild); } }
    if(repSel.el!=null && k===repSel.blocco) u.querySelectorAll('[data-el="'+repSel.el+'"]').forEach(x=>x.classList.add('is-sel-el'));
  });
  /* i fogli si rimpiccioliscono se la colonna è più stretta di un A4 */
  const pg=cont.querySelector('.pg'), col=document.getElementById(ID('anteprima'));
  if(pg&&col&&col.clientWidth){ const z=Math.min(1,(col.clientWidth-24)/pg.offsetWidth); cont.style.zoom=z>0.3? String(z) : ''; }
}
/* impagina i pezzi del report in fogli A4 (anteprima e PDF usano QUESTA funzione: stesso risultato).
   altMm = altezza del foglio (297 verticale, 210 orizzontale). Un pezzo che deve stare tutto in una
   pagina (data-unito) ma è più alto di un foglio viene diviso nei suoi pezzi normali. */
function repImpagina(cont, units, pxPerMm, altMm){
  const PAD=13, limite=(altMm-PAD-4)*pxPerMm, utile=(altMm-PAD-PAD-4)*pxPerMm;
  const pagine=[]; let pg=null;
  const nuova=()=>{ pg=document.createElement('div'); pg.className='pg'; cont.appendChild(pg); pagine.push(pg); };
  nuova();
  const coda=units.slice();
  while(coda.length){ const node=coda.shift();
    if(node.getAttribute('data-nuovapagina')==='1' && pg.childElementCount) nuova();
    pg.appendChild(node);
    if(node._parti && node.offsetHeight>utile){ pg.removeChild(node); coda.unshift(...node._parti); continue; }
    const fondo=node.offsetTop+node.offsetHeight;
    if(fondo>limite && pg.childElementCount>1){ pg.removeChild(node); nuova(); pg.appendChild(node); }
  }
  return pagine;
}
/* ricostruisce il blocco dai pezzi dei fogli (dopo una modifica sul posto): rimette insieme le
   tabelle divise fra più pagine e toglie tutto ciò che serve solo all'anteprima */
function repBloccoDaFogli(k){
  const orig=document.querySelector('#'+ID('sorgente')+' [data-blocco="'+k+'"]'); if(!orig) return;
  const sec=orig.cloneNode(false);
  const pulisci=c=>{ c.removeAttribute('contenteditable'); c.querySelectorAll('[contenteditable]').forEach(x=>x.removeAttribute('contenteditable'));
    c.classList.remove('is-sel-el'); c.querySelectorAll('.is-sel-el').forEach(x=>x.classList.remove('is-sel-el')); c.querySelectorAll('.rep-maniglia').forEach(x=>x.remove()); return c; };
  const aggiungi=c=>{ if(c.classList.contains('rep-maniglia')) return; const cl=pulisci(c.cloneNode(true)); const ult=sec.lastElementChild;
    if(cl.classList.contains('tbl-wrap') && ult && ult.classList.contains('tbl-wrap') && ult.getAttribute('data-el')===cl.getAttribute('data-el')){
      const tb=ult.querySelector('tbody'), tb2=cl.querySelector('tbody'); if(tb&&tb2){ [...tb2.children].forEach(r=>tb.appendChild(r)); return; } }
    sec.appendChild(cl); };
  document.querySelectorAll('#'+ID('pagine')+' .u[data-blocco="'+k+'"]').forEach(u=>{ [...u.children].forEach(c=>{
    if(c.classList.contains('rep-sec')) [...c.children].forEach(aggiungi); else aggiungi(c); }); });
  /* un titolo riscritto a mano diventa il titolo del blocco anche nelle impostazioni */
  const R=repCtx.R(), imp=repImp(R,k), tt=sec.querySelector(':scope > .sec .rep-tit');
  if(tt && imp.titolo && tt.textContent.trim()!==imp.titolo){ imp.titolo=tt.textContent.trim(); repSalvaImp(R,k,imp); }
  repEdits()[k]=sec.outerHTML;
}
function repRigaOp(op){
  const sel=window.getSelection&&window.getSelection(); if(!sel||!sel.rangeCount){ avviso(t('Metti prima il cursore in una riga di una tabella del report.')); return; }
  let n=sel.getRangeAt(0).startContainer; if(n&&n.nodeType===3) n=n.parentNode;
  const tr=n&&n.closest&&n.closest('#'+ID('pagine')+' tbody tr');
  if(!tr){ avviso(t('Metti prima il cursore in una riga di una tabella del report.')); return; }
  const k=(tr.closest('.u')||{dataset:{}}).dataset.blocco;
  if(op==='riga-via') tr.remove();
  else { const nuova=tr.cloneNode(true); nuova.classList.remove('day-sep'); nuova.querySelectorAll('td').forEach(td=>{ td.innerHTML='&nbsp;'; td.removeAttribute('title'); });
    tr.parentNode.insertBefore(nuova, op==='riga-sopra'? tr : tr.nextSibling); }
  if(k){ repBloccoDaFogli(k); repCtx.render(); }
}
/* sposta il blocco k prima (o dopo) del blocco b */
function repSposta(R, k, b, dopo){
  if(!k||!b||k===b||repCtx.fissi.indexOf(k)>=0) return;
  const ord=R.ordine.filter(x=>x!==k);
  let i=repCtx.fissi.indexOf(b)>=0? (b===repCtx.fissi[0]? 0 : ord.length) : ord.indexOf(b)+(dopo?1:0);
  if(i<0) i=ord.length; ord.splice(i,0,k); R.ordine=ord; persist(repCtx.persist); repCtx.render();
}
/* aggiorna ALL'ISTANTE il testo di un campo semplice (obiettivo, note, titolo di un blocco) sia
   nei fogli visibili sia nel documento sorgente (da cui esce il PDF), senza aspettare il
   ridisegno completo: quello resta, più tardi e in sottofondo, solo per risistemare
   l'impaginazione (un testo più lungo può spostare dove cade il taglio di pagina). */
function repTestoLive(blocco, selettore, testo){
  document.querySelectorAll('#'+ID('pagine')+' .u[data-blocco="'+blocco+'"] '+selettore).forEach(el=>{ el.textContent=testo; });
  const sorg=document.querySelector('#'+ID('sorgente')+' [data-blocco="'+blocco+'"] '+selettore);
  if(sorg) sorg.textContent=testo;
}
function repCollega(R){
  const ctx=repCtx, P=document.getElementById(ctx.pannello); if(!P) return;
  let tmGoal=null;
  const tardi=(ms)=>{ clearTimeout(tmGoal); tmGoal=setTimeout(()=>ridisegnaConFuoco(ctx.pannello, ctx.render), ms); };
  if(ctx.collegaDocumento) ctx.collegaDocumento(R, P, tardi);
  /* elenco dei blocchi: spunta, frecce, scelta */
  P.querySelectorAll('[data-rep]').forEach(cb=>{ cb.onclick=e=>e.stopPropagation(); cb.onchange=()=>{ R[cb.dataset.rep]=cb.checked; persist(ctx.persist); ctx.render(); }; });
  P.querySelectorAll('[data-repmove]').forEach(b=>b.onclick=e=>{ e.stopPropagation();
    const ord=R.ordine.slice(), i=ord.indexOf(b.dataset.repmove), j=i+(+b.dataset.dir);
    if(i<0||j<0||j>=ord.length) return; const tmp=ord[i]; ord[i]=ord[j]; ord[j]=tmp; R.ordine=ord; persist(ctx.persist); ctx.render(); });
  P.querySelectorAll('#'+ID('lista')+' [data-selblocco]').forEach(li=>li.onclick=()=>{ const k=li.dataset.selblocco;
    if(!R[k] && ctx.fissi.indexOf(k)<0) return; repSel={blocco:k, el:null}; repAggiornaSel(); });
  /* anteprima: un clic sceglie il blocco (e l'elemento); doppio clic entra nella modifica del testo */
  const fogli=document.getElementById(ID('pagine'));
  if(fogli){
    fogli.onclick=e=>{ if(repInModifica) return; const u=e.target.closest('.u[data-blocco]'); if(!u) return;
      const elx=e.target.closest('[data-el]'); repSel={blocco:u.dataset.blocco, el:elx? elx.getAttribute('data-el') : null}; repAggiornaSel(); };
    fogli.ondblclick=e=>{ const u=e.target.closest('.u[data-blocco]'); if(!u||repInModifica) return; repSel={blocco:u.dataset.blocco, el:null}; repInModifica=u.dataset.blocco; ctx.render(); };
    if(repInModifica){ let tm=null; fogli.oninput=()=>{ clearTimeout(tm); tm=setTimeout(()=>repBloccoDaFogli(repInModifica), 250); }; }
  }
  /* impostazioni del blocco scelto */
  const k=repSel.blocco;
  if(k){ const imp=repImp(R,k), salva=()=>{ repSalvaImp(R,k,imp); ctx.render(); };
    P.querySelectorAll('[data-imp]').forEach(cb=>cb.onchange=()=>{ imp[cb.dataset.imp]=cb.checked; salva(); });
    P.querySelectorAll('[data-imp-testo]').forEach(b=>b.onclick=()=>{ imp.testo=b.dataset.impTesto; salva(); });
    P.querySelectorAll('[data-imp-colore]').forEach(b=>b.onclick=()=>{ imp.colore=b.dataset.impColore; salva(); });
    P.querySelectorAll('[data-imp-grafici]').forEach(b=>b.onclick=()=>{ imp.grafici=b.dataset.impGrafici; salva(); });
    const ti=document.getElementById(ID('imp-titolo')); if(ti) ti.oninput=()=>{ imp.titolo=ti.value.trim(); repSalvaImp(R,k,imp);
      const gen=document.createElement('div'); gen.innerHTML=repGenerati[k]||''; const tit0=((gen.querySelector('.rep-tit')||{}).textContent)||'';
      repTestoLive(k, '.rep-tit', imp.titolo||tit0);
      tardi(500); };
    const mo=document.getElementById(ID('modifica')); if(mo) mo.onclick=()=>{ repInModifica=k; ctx.render();
      const u=document.querySelector('#'+ID('pagine')+' .u[data-blocco="'+k+'"]'); if(u){ try{ u.focus(); u.scrollIntoView({block:'nearest'}); }catch(e){} } };
    const fi=document.getElementById(ID('fine')); if(fi) fi.onclick=()=>{ repBloccoDaFogli(k); repInModifica=null; ctx.render(); };
    const ri=document.getElementById(ID('rifai')); if(ri) ri.onclick=async()=>{
      if(!(await conferma(t('Il blocco torna com\'è dai dati e i ritocchi a mano si perdono.'), {titolo:t('Rifare dai dati?'), testoOk:t('Rifai dai dati'), pericolo:true}))) return;
      delete repEdits()[k]; ctx.render(); };
    const tg=document.getElementById(ID('togli')); if(tg) tg.onclick=()=>{ R[k]=false; persist(ctx.persist); repSel={blocco:null, el:null}; ctx.render(); };
    const rs=document.getElementById(ID('imp-reset')); if(rs) rs.onclick=()=>{ repSalvaImp(R,k,Object.assign({},REP_DEF_IMP)); ctx.render(); };
    P.querySelectorAll('[data-elop]').forEach(b=>b.onclick=()=>repElemento(b.dataset.elop));
    P.querySelectorAll('[data-repop]').forEach(b=>{ b.onmousedown=e=>e.preventDefault(); b.onclick=()=>repRigaOp(b.dataset.repop); });
  }
  /* trascinamento dei blocchi: dall'elenco o dal manico ⠿ nei fogli, su un altro blocco (sopra o sotto la sua metà) */
  let trascinato=null;
  P.querySelectorAll('[data-trascina]').forEach(x=>{
    x.ondragstart=e=>{ trascinato=x.getAttribute('data-trascina'); try{ e.dataTransfer.setData('text/plain', trascinato); e.dataTransfer.effectAllowed='move'; }catch(_){} };
    x.ondragend=()=>{ trascinato=null; P.querySelectorAll('.rep-drop-prima,.rep-drop-dopo').forEach(y=>y.classList.remove('rep-drop-prima','rep-drop-dopo')); }; });
  const bersaglio=e=>e.target.closest&&(e.target.closest('#'+ID('lista')+' [data-selblocco]')||e.target.closest('#'+ID('pagine')+' .u[data-blocco]'));
  const chiave=x=>x.getAttribute('data-selblocco')||x.getAttribute('data-blocco');
  P.ondragover=e=>{ const b=bersaglio(e); if(!trascinato||!b) return; e.preventDefault();
    const r=b.getBoundingClientRect(), dopo=e.clientY>r.top+r.height/2;
    P.querySelectorAll('.rep-drop-prima,.rep-drop-dopo').forEach(y=>y.classList.remove('rep-drop-prima','rep-drop-dopo'));
    b.classList.add(dopo?'rep-drop-dopo':'rep-drop-prima'); };
  P.ondrop=e=>{ const b=bersaglio(e); if(!trascinato||!b) return; e.preventDefault();
    const r=b.getBoundingClientRect(); repSposta(R, trascinato, chiave(b), e.clientY>r.top+r.height/2); };
}
/* ── CTX_REPORT: il riquadro «Documento» del Report (obiettivo, note, foto, PDF/digitale) ── */
const CTX_REPORT={pre:'rep', pannello:'panel-report', fissi:['copertina','piede'], grandi:['scheda','record'], persist:'corpo',
  R:()=>DOC.dati_utente.report, chiave:()=>'report', render:()=>renderReport(),
  documento(R){
    const fl=(DOC.foto||[]).slice().sort((a,b)=>String(a.data||'').localeCompare(String(b.data||'')));
    const opts=sel=>fl.map(f=>`<option value="${esc(f.file)}"${f.file===sel?' selected':''}>${esc(fotoDataLabel(f))}</option>`).join('');
    return `<div class="lat"><h4>${t('Documento')}</h4>
     <div class="bar" style="margin:0 0 8px;gap:6px;flex-wrap:wrap"><button class="btn btn--gold" id="rep-pdf-btn" onclick="printReport()">${ico('scarica')}${t('Scarica PDF (A4)')}</button>
       <button class="btn" id="rep-html-btn" onclick="exportDigitalReport()" title="${t('HTML per smartphone, con i video incorporati')}">${ico('telefono')}${t('Report digitale')}</button>
       <label class="pill" style="cursor:pointer;align-self:center;display:inline-flex;align-items:center;gap:5px" title="${t('Incorpora i video nel file (più pesante)')}"><input type="checkbox" id="rep-incl-vid" checked style="width:auto;flex:0 0 auto"> ${t('video')}</label></div>
     <div class="field"><label>${t('Obiettivo del cliente (in copertina)')}</label><input id="rep-goal" value="${esc(R.obiettivo||'')}" placeholder="${t('es. ricomposizione corporea, +forza panca…')}" style="width:100%"></div>
     <div class="field" style="margin-top:6px"><label>${t('Note del coach')}</label><textarea id="rep-nota" placeholder="${t('Commento, indicazioni, prossimi step…')}" style="width:100%;min-height:64px">${esc(R.nota||'')}</textarea></div>
     ${fl.length?`<div class="bar" style="margin:6px 0 0;gap:8px;align-items:flex-end"><div class="field"><label>${ico('camera')}${t('Foto prima')}</label><select id="rep-foto-a">${opts(R.fotoPrima)}</select></div><div class="field"><label>${t('Dopo')}</label><select id="rep-foto-b">${opts(R.fotoDopo)}</select></div></div>`:''}</div>`;
  },
  collegaDocumento(R, P, tardi){
    const goal=document.getElementById('rep-goal'); if(goal) goal.oninput=e=>{ R.obiettivo=e.target.value; DOC.dati_utente.obiettivo=e.target.value; persist('corpo');
      repTestoLive('copertina', '.rep-obiettivo-txt', e.target.value);
      document.querySelectorAll('#rep-pagine .u[data-blocco="copertina"] .rep-obiettivo, #rep-sorgente [data-blocco="copertina"] .rep-obiettivo').forEach(el=>el.classList.toggle('rep-obiettivo--vuoto', !e.target.value));
      tardi(700); };
    const nota=document.getElementById('rep-nota'); if(nota) nota.oninput=e=>{ R.nota=e.target.value; persist('corpo');
      repTestoLive('note', '.rep-nota', e.target.value);
      tardi(700); };
    const fa=document.getElementById('rep-foto-a'); if(fa) fa.onchange=e=>{ R.fotoPrima=e.target.value; fotoReportMancanti={}; persist('corpo'); ensureReportFoto().then(()=>{ if(curTab==='report') renderReport(); }); };
    const fb=document.getElementById('rep-foto-b'); if(fb) fb.onchange=e=>{ R.fotoDopo=e.target.value; fotoReportMancanti={}; persist('corpo'); ensureReportFoto().then(()=>{ if(curTab==='report') renderReport(); }); };
  }};

/* embedding base64 delle due foto del report (così entrano sia nel PDF sia nel report digitale) */
let fotoReportUri={};
/* foto scelte per il report ma assenti dal disco (backup senza immagini, file tolto a mano): si
   ricordano, così il report mostra «foto non trovata» invece di riprovare e ridisegnarsi senza fine.
   Si riprova quando nel riquadro «Documento» si sceglie di nuovo una foto. */
let fotoReportMancanti={};
async function fotoReportDataUri(file){
  if(fotoReportUri[file]) return fotoReportUri[file];
  const fh=await fotoHandle(file,false); const f=await fh.getFile();
  let du=await new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=()=>rej(fr.error); fr.readAsDataURL(f); });
  if(!/^data:image\//.test(du)){ const e=String(file).toLowerCase(); const t=e.endsWith('.png')?'image/png':e.endsWith('.webp')?'image/webp':e.endsWith('.gif')?'image/gif':'image/jpeg'; du=du.replace(/^data:[^;,]*/,'data:'+t); }
  fotoReportUri[file]=du; return du;
}
async function ensureReportFoto(){
  const R=(DOC.dati_utente&&DOC.dati_utente.report)||{};
  for(const file of [R.fotoPrima,R.fotoDopo]){ if(file && !fotoReportUri[file] && !fotoReportMancanti[file]){ try{ await fotoReportDataUri(file); }catch(e){ fotoReportMancanti[file]=true; } } }
}
function splitTable(D, tblWrap, headingEl){
  const table=tblWrap.querySelector('table');
  const mkU=(content)=>{ const d=D.createElement('div'); d.className='u'; if(headingEl)d.appendChild(D.importNode(headingEl,true)); d.appendChild(D.importNode(content,true)); return d; };
  if(!table) return [mkU(tblWrap)];
  const thead=table.querySelector('thead'), tfoot=table.querySelector('tfoot'), colgroup=table.querySelector('colgroup');
  const fixed=/table-layout\s*:\s*fixed/.test(table.getAttribute('style')||'');
  const rows=[...table.querySelectorAll('tbody tr')];
  const PER=22;
  if(rows.length<=PER) return [mkU(tblWrap)];           // sta in una pagina: tabella unica con intestazione
  // raggruppa: per GIORNO se ci sono day-sep, altrimenti a blocchi di PER. (Intestazione colonne solo nel 1° blocco)
  const hasDays=rows.some(r=>r.classList&&r.classList.contains('day-sep'));
  let groups=[];
  if(hasDays){ let cur=null; rows.forEach(r=>{ const isDay=r.classList&&r.classList.contains('day-sep'); if(isDay||!cur){ cur=[]; groups.push(cur); } cur.push(r); });
    const sp=[]; groups.forEach(g=>{ if(g.length<=PER) sp.push(g); else for(let i=0;i<g.length;i+=PER) sp.push(g.slice(i,i+PER)); }); groups=sp;
  } else { for(let i=0;i<rows.length;i+=PER) groups.push(rows.slice(i,i+PER)); }
  if(groups.length<=1) return [mkU(tblWrap)];
  const out=[];
  groups.forEach((g,gi)=>{
    const d=D.createElement('div'); d.className='u';
    if(headingEl&&gi===0) d.appendChild(D.importNode(headingEl,true));
    const wrap=D.createElement('div'); wrap.className='tbl-wrap'; if(tblWrap.hasAttribute('data-el')) wrap.setAttribute('data-el', tblWrap.getAttribute('data-el'));
    const t=D.createElement('table'); if(fixed) t.style.cssText='table-layout:fixed;width:100%';
    if(colgroup) t.appendChild(D.importNode(colgroup,true));     // colonne allineate fra i blocchi
    if(thead&&gi===0) t.appendChild(D.importNode(thead,true));   // intestazione SOLO nel primo blocco
    const tb=D.createElement('tbody'); g.forEach(r=>tb.appendChild(D.importNode(r,true)));
    t.appendChild(tb);
    if(tfoot&&gi===groups.length-1) t.appendChild(D.importNode(tfoot,true));
    wrap.appendChild(t); d.appendChild(wrap); out.push(d);
  });
  return out;
}
function buildReportUnits(D, src){
  const units=[];
  const wrapHead=(h,c)=>{ const d=D.createElement('div'); d.className='u'; if(h)d.appendChild(D.importNode(h,true)); d.appendChild(D.importNode(c,true)); return d; };
  const isHead=el=>el.nodeType===1&&(el.tagName==='H1'||(el.classList&&el.classList.contains('sec')));
  const pezzi=sec=>{ const out=[]; let pending=null;
    [...sec.children].forEach(ch=>{
      if(isHead(ch)){ pending=ch; return; }
      if(ch.classList&&ch.classList.contains('tbl-wrap')){ splitTable(D,ch,pending).forEach(u=>out.push(u)); pending=null; }
      else { out.push(wrapHead(pending,ch)); pending=null; }
    });
    if(pending){ const d=D.createElement('div'); d.className='u'; d.appendChild(D.importNode(pending,true)); out.push(d); }
    return out; };
  /* il blocco (data-blocco) e le sue impostazioni passano su ogni pezzo: i fogli li mostrano uguali */
  const marca=(lista,sec)=>{ const k=sec.getAttribute('data-blocco'); if(!k) return lista;
    const cls=[...sec.classList].filter(c=>c!=='rep-sec'&&c!=='big');
    lista.forEach((u,i)=>{ u.setAttribute('data-blocco',k); cls.forEach(c=>u.classList.add(c));
      /* niente classe 'u-'+k: per la dieta k è il nome del pasto (spazi/accenti compresi), e
         DOMTokenList.add() non accetta spazi in un token — data-blocco basta a identificarlo */
      if(i===0&&sec.getAttribute('data-nuovapagina')==='1') u.setAttribute('data-nuovapagina','1'); });
    return lista; };
  [...src.children].forEach(sec=>{
    if(!(sec.classList&&sec.classList.contains('rep-sec'))){ const d=D.createElement('div'); d.className='u'; d.appendChild(D.importNode(sec,true)); units.push(d); return; }
    if(sec.getAttribute('data-unito')==='1'){
      const d=D.createElement('div'); d.className='u'; d.appendChild(D.importNode(sec,true));
      marca([d],sec); d._parti=marca(pezzi(sec),sec); units.push(d); return; }
    marca(pezzi(sec),sec).forEach(u=>units.push(u));
  });
  return units;
}
function dataUrlToBytes(u){ const s=atob(u.slice(u.indexOf(',')+1)); const a=new Uint8Array(s.length); for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i)&255; return a; }
function imagesToPdf(images, landscape){
  /* A4 in punti: 595.2756 × 841.8898. landscape=true scambia larghezza/altezza (297×210mm). */
  const PT_W=landscape?841.8898:595.2756, PT_H=landscape?595.2756:841.8898;
  const enc=s=>{ const a=new Uint8Array(s.length); for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i)&255; return a; };
  const parts=[]; let off=0; const offsets=[];
  const push=u=>{ parts.push(u); off+=u.length; }; const pushS=s=>push(enc(s));
  pushS('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const N=images.length;
  const obj=(num,body)=>{ offsets[num]=off; pushS(num+' 0 obj\n'+body+'\nendobj\n'); };
  const kids=[]; for(let i=0;i<N;i++) kids.push((3+3*i)+' 0 R');
  obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  obj(2,'<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+N+' >>');
  for(let i=0;i<N;i++){
    const pageN=3+3*i, contN=4+3*i, imgN=5+3*i;
    const content='q\n'+PT_W.toFixed(4)+' 0 0 '+PT_H.toFixed(4)+' 0 0 cm\n/Im0 Do\nQ\n';
    obj(pageN,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+PT_W.toFixed(4)+' '+PT_H.toFixed(4)+'] /Resources << /XObject << /Im0 '+imgN+' 0 R >> >> /Contents '+contN+' 0 R >>');
    offsets[contN]=off; pushS(contN+' 0 obj\n<< /Length '+content.length+' >>\nstream\n'+content+'endstream\nendobj\n');
    const im=images[i]; offsets[imgN]=off;
    pushS(imgN+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+im.w+' /Height '+im.h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+im.bytes.length+' >>\nstream\n');
    push(im.bytes); pushS('\nendstream\nendobj\n');
  }
  const xrefOff=off, maxObj=2+3*N;
  let xref='xref\n0 '+(maxObj+1)+'\n0000000000 65535 f \n';
  for(let n=1;n<=maxObj;n++){ xref+=String(offsets[n]||0).padStart(10,'0')+' 00000 n \n'; }
  pushS(xref);
  pushS('trailer\n<< /Size '+(maxObj+1)+' /Root 1 0 R >>\nstartxref\n'+xrefOff+'\n%%EOF\n');
  let len=0; parts.forEach(p=>len+=p.length); const out=new Uint8Array(len); let p=0; parts.forEach(u=>{out.set(u,p);p+=u.length;});
  return out;
}
function buildVideoSection(items){
  if(!items || !items.length) return '';
  return '<div class="rep-sec"><div class="sec">▶ '+t('Video degli esercizi')+'</div>'+
    items.map(it=>'<div class="vid-item"><div class="vid-name">▶ '+esc(exName(it.nome))+'</div>'+
      '<video controls playsinline preload="none" style="width:100%;max-height:70vh;border-radius:var(--r-sm);background:#000"><source src="'+it.dataUri+'"></video></div>').join('')+
    '<p class="muted" style="font-size:12px">'+t('Tocca un video per riprodurlo. Funziona offline, direttamente da questo file.')+'</p></div>';
}
function collectSchedaVideos(){
  const seen={}, out=[];
  (DOC.scheda.settimanale||[]).forEach(r=>{ if(!r.esercizio)return; const file=videoOf(r.esercizio);
    if(file && !seen[file]){ seen[file]=1; out.push({file:file, nome:r.esercizio}); } });
  return out;
}
async function embedVideoFiles(files){
  const map={}; if(!dirHandle || !files.length) return map;
  for(const file of files){ if(map[file]) continue;
    try{ const s=await videoSorgente(file); const f=await s.fh.getFile();  /* personale se il toggle è attivo, altrimenti predefinito */
      let du=await new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=()=>rej(fr.error); fr.readAsDataURL(f); });
      /* senza un MIME video il tag <video> rifiuta il data-URI: normalizza dal nome file */
      if(!/^data:video\//.test(du)){ const tipo=String(file).toLowerCase().endsWith('.webm')?'video/webm':'video/mp4'; du=du.replace(/^data:[^;,]*/,'data:'+tipo); }
      map[file]=du;
    }catch(e){ /* file mancante: salta */ }
  }
  return map;
}
async function exportDigitalReport(){
  if(repInModifica){ repBloccoDaFogli(repInModifica); repInModifica=null; renderReport(); }
  if(DOC.dati_utente&&DOC.dati_utente.report&&DOC.dati_utente.report.foto){ try{ await ensureReportFoto(); }catch(e){} renderReport(); }
  const src=document.querySelector('#panel-report .rep-doc');
  if(!src){ avviso(t('Apri prima il Report.')); return; }
  const btn=document.getElementById('rep-html-btn'); const blab=btn?btn.innerHTML:''; if(btn){ btn.innerHTML=t('Genero…'); btn.disabled=true; }
  try{
    const inclEl=document.getElementById('rep-incl-vid'); const incl=inclEl?inclEl.checked:true;
    const vids=collectSchedaVideos();
    let map={};
    if(incl && vids.length){ if(!dirHandle){ avviso(t('Per includere i video collega la cartella TMS (i video stanno in TMS/database/video/). Genero il report senza video.')); } else { map=await embedVideoFiles(vids.map(v=>v.file)); } }
    const items=vids.filter(v=>map[v.file]).map(v=>({nome:v.nome, dataUri:map[v.file]}));
    const vidSec=buildVideoSection(items);
    const styleCSS=(document.querySelector('style')||{}).textContent||'';
    const mobileCSS=[
      'html,body{ background:var(--paper); margin:0; padding:14px; color:var(--ink); -webkit-text-size-adjust:100% }',
      '.rep-doc{ max-width:820px; margin:0 auto; background:var(--paper); border:none; box-shadow:none; padding:0 }',
      '.tbl-wrap{ overflow-x:auto; -webkit-overflow-scrolling:touch }',
      '.cards{ display:flex; flex-wrap:wrap; gap:8px }', '.card{ flex:1 1 150px }',
      '.chart-grid{ display:block }', '.chart-box{ box-shadow:none }', '.chart-box svg{ width:100%; height:auto }',
      '.vid-item{ margin:14px 0 } .vid-name{ font-weight:700; margin-bottom:5px; color:var(--ember-2) }',
      '@media (max-width:560px){ .card{ flex-basis:100% } table{ font-size:12px } h1{ font-size:22px!important } }'
    ].join('');
    const nome=String((DOC.dati_utente&&DOC.dati_utente.nome)||profNome()||'TMS').replace(/[^\w\-]+/g,'_')||'TMS';
    const body='<div class="rep-doc">'+src.innerHTML+vidSec+'</div>';
    const html='<!DOCTYPE html><html lang="'+(LANG==='en'?'en':'it')+'" data-theme="giorno"><head><meta charset="utf-8">'+
      '<meta name="viewport" content="width=device-width, initial-scale=1">'+
      '<title>'+t('Report')+' · '+esc(nome)+'</title><style>'+styleCSS+'</style><style>'+mobileCSS+'</style></head><body>'+body+'</body></html>';
    const blob=new Blob([html],{type:'text/html;charset=utf-8'}); const u=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=u; a.download='Report_'+nome+'.html'; document.body.appendChild(a); a.click();
    setTimeout(()=>{ try{ URL.revokeObjectURL(u); }catch(e){} a.remove(); },1500);
    const mb=(blob.size/1048576);
    if(mb>20) setTimeout(()=>avviso(t('Report digitale generato (')+mb.toFixed(0)+t(' MB). È pesante per via dei video: per inviarlo via chat potresti volerne meno o più corti.')),300);
  }catch(e){ avviso(t('Errore nel report digitale:')+' '+e.message); }
  finally{ if(btn){ btn.innerHTML=blab; btn.disabled=false; } }
}
async function printReport(){
  /* Esporta un PDF A4 generato da noi: impagina le unità del report, rasterizza ogni pagina con html2canvas
     (tema chiaro forzato via onclone, niente flash) e assembla il PDF (imagesToPdf). Niente stampa del browser. */
  if(repInModifica){ repBloccoDaFogli(repInModifica); repInModifica=null; renderReport(); }
  if(DOC.dati_utente&&DOC.dati_utente.report&&DOC.dati_utente.report.foto){ try{ await ensureReportFoto(); }catch(e){} renderReport(); }
  const src=document.querySelector('#panel-report .rep-doc');
  if(!src){ try{ window.print(); }catch(e){} return; }
  if(typeof html2canvas!=='function'){ avviso(t('Generatore PDF non disponibile in questa copia: uso la stampa del browser.')); try{ window.print(); }catch(e){} return; }
  const btn=document.getElementById('rep-pdf-btn'); const blab=btn?btn.innerHTML:''; if(btn){ btn.innerHTML=t('Genero PDF…'); btn.disabled=true; }
  const stage=document.createElement('div'); stage.id='pdf-stage';
  try{
    document.body.appendChild(stage);
    const units=buildReportUnits(document, src);
    const probe=document.createElement('div'); probe.style.cssText='position:absolute;visibility:hidden;height:100mm'; stage.appendChild(probe);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const pxPerMm=(probe.getBoundingClientRect().height||377.95)/100; stage.removeChild(probe);
    const pages=repImpagina(stage, units, pxPerMm, 297);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const images=[];
    for(const p of pages){
      const canvas=await html2canvas(p,{scale:2,backgroundColor:'#ffffff',logging:false,useCORS:true,
        onclone:(doc)=>{ try{ doc.documentElement.setAttribute('data-theme','giorno'); }catch(e){} }});
      const url=canvas.toDataURL('image/jpeg',0.92);
      images.push({bytes:dataUrlToBytes(url), w:canvas.width, h:canvas.height});
    }
    const pdf=imagesToPdf(images);
    const nome=String((DOC.dati_utente&&DOC.dati_utente.nome)||profNome()||'TMS').replace(/[^\w\-]+/g,'_')||'TMS';
    const blob=new Blob([pdf],{type:'application/pdf'}); const u=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=u; a.download='Report_'+nome+'.pdf'; document.body.appendChild(a); a.click();
    setTimeout(()=>{ try{ URL.revokeObjectURL(u); }catch(e){} a.remove(); }, 1500);
  }catch(e){ avviso(t('Errore nella generazione del PDF:')+' '+e.message); }
  finally{ try{ if(stage.parentNode) document.body.removeChild(stage); }catch(e){} if(btn){ btn.innerHTML=blab; btn.disabled=false; } }
}
