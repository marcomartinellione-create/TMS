/* ════════════════ RIFERIMENTI DELLA DISTRIBUZIONE (2026-11-13) ════════════════
   La fascia verde della ragnatela «distribuzione fra i gruppi» non è più una sola, fissa:
   si sceglie CON CHI confrontarsi, su due assi distinti — l'ESPERIENZA di allenamento e il
   TIPO di allenamento (forza, ipertrofia, powerlifting, resistenza muscolare, potenza,
   allenamento generale). Sesso, età, agonismo, attrezzatura e qualità della fonte sono
   FILTRI di contesto: restringono le voci, non sostituiscono i due assi.

   I dati stanno in RIF_DISTR (src/dati/05-riferimenti-distribuzione.js, generato da
   tools/genera-riferimenti.py a partire dagli originali, mai a mano). Due RACCOLTE che non
   si mescolano, perché contano cose diverse:
   · «schede»: schede pubblicate (StrengthLog, Muscle & Strength, depot.fitness, Liftosaur), un
     elemento = una settimana di allenamento; il livello è quello DICHIARATO dalla scheda;
   · «studi»: protocolli di studio con l'elenco completo degli esercizi, un elemento = un
     protocollo (uno o più bracci con le stesse proporzioni); l'esperienza è quella dei
     partecipanti. Vengono dal corpus di evidenza (ogni protocollo porta i suoi record:
     record_ids) o da articoli ad accesso aperto aggiunti dal TMS (record_ids vuoto): la
     didascalia li conta separatamente. I record del corpus senza elenco completo non entrano
     e lo si dice.
   Per ogni voce sono salvate solo le serie DIRETTE e INDIRETTE per gruppo: quote e fasce si
   calcolano qui, con lo STESSO conteggio usato per l'atleta (catalogo TMS o mappa esterna,
   con gli stessi pesi). Così il confronto resta coerente anche cambiando i pesi.

   Fascia = dal 10° al 90° percentile della quota di ogni gruppo sulle voci scelte (arrotondata
   verso l'esterno); il rosso scatta sotto 3/4 del 10° o sopra 5/4 del 90°. Con meno di
   RIF_MIN_VOCI voci la fascia NON si disegna («dati insufficienti»); fino a RIF_VOCI_SOLIDE
   si disegna tratteggiata («indicativa»). Il riferimento predefinito (schede equilibrate,
   tutte le esperienze e tutti i tipi) regge su 109 schede da 4 fonti (14/11/2026): le fasce
   stanno entro 4 punti da RIF_QUOTA (Gambe 16–37 invece di 19–33), scelta accettata da Marco.

   Dove stanno i due assi (Marco, 2026-11-13): l'ESPERIENZA è dell'atleta e sta nell'anagrafica
   (DOC.dati_utente.esperienza, accanto a sesso e data di nascita); il TIPO è della scheda e sta
   nel Training Set (DOC.scheda.tipoAllenamento, e in ogni set salvato). Il riferimento li segue
   da soli («come il profilo», «come la scheda»), oppure si fissano a mano nel riquadro.
   Le altre scelte stanno nel profilo aperto (DOC.dati_utente.rifDistr), lette ogni volta:
   niente copie in memoria che sopravvivano al cambio di profilo.

   SCHEDE FABLE (Marco, 15/11/2026). Nella raccolta «schede» ci sono anche schede GENERATE alla cieca
   dal modello Fable (voci con generata:true, fonte «fable»): 5 per combinazione esperienza × tipo ×
   sesso. Il confronto coi dati noti non le ha date per buone ovunque (tools/riferimenti/confronta-fable.js),
   quindi valgono solo come ripiego: con l'interruttore «Schede Fable» acceso (spento di serie) e SOLO
   dove le voci reali della casella sono meno di RIF_MIN_VOCI. Mai mescolate alle reali; la fascia
   che ne viene è viola e tratteggiata (fasce[g].generata) e la didascalia lo dice sempre. Seguono gli
   stessi filtri di contesto delle reali, compreso «solo equilibrate» (Marco, 15/11/2026). */
const RIF_MIN_VOCI=5, RIF_VOCI_SOLIDE=10;
const ESPERIENZE=['principiante','intermedio','avanzato'];
const TIPI_ALLEN=['forza','ipertrofia','powerlifting','resistenza','potenza','generale'];
const ESP_NOME={principiante:'Principiante', intermedio:'Intermedio', avanzato:'Avanzato'};
const TIPO_NOME={forza:'Forza', ipertrofia:'Ipertrofia', powerlifting:'Powerlifting', resistenza:'Resistenza muscolare', potenza:'Potenza', generale:'Allenamento generale'};
const RACCOLTA_NOME={schede:'Schede pubblicate', studi:'Protocolli di studio'};
const RIF_DEF={raccolta:'schede', esperienza:'profilo', tipo:'scheda', sesso:'', eta:'', agonismo:'', attrezzatura:'', qualita:'',
  soloEquilibrate:true, fable:false, metodo:'tms', diretta:1, indiretta:QUOTA_SECONDARI};
function rifDati(){ return (typeof RIF_DISTR!=='undefined' && RIF_DISTR && Array.isArray(RIF_DISTR.voci)) ? RIF_DISTR : null; }
function numPeso(v,d){ const x=+String(v==null?'':v).replace(',','.'); return (String(v==null?'':v).trim()!=='' && isFinite(x) && x>=0 && x<=2)? x : d; }
/* impostazioni normalizzate: un valore strano nel file non rompe il grafico, torna al predefinito */
function rifImpost(src){
  const u=(typeof DOC!=='undefined'&&DOC&&DOC.dati_utente)||{};
  const s=src || ((u.rifDistr&&typeof u.rifDistr==='object')? u.rifDistr : {});
  const o=Object.assign({}, RIF_DEF, s);
  if(o.raccolta!=='studi') o.raccolta='schede';
  if(o.metodo!=='esterna') o.metodo='tms';
  if(o.esperienza!=='profilo' && o.esperienza!=='' && !ESPERIENZE.includes(o.esperienza)) o.esperienza='profilo';
  if(o.tipo!=='scheda' && o.tipo!=='' && !TIPI_ALLEN.includes(o.tipo)) o.tipo='scheda';
  o.soloEquilibrate=o.soloEquilibrate!==false;
  o.fable=o.fable===true;
  o.diretta=numPeso(o.diretta,1); o.indiretta=numPeso(o.indiretta,QUOTA_SECONDARI);
  return o;
}
function pesiSerie(){ const o=rifImpost(); return {d:o.diretta, i:o.indiretta, metodo:o.metodo}; }
function pesiPredefiniti(p){ p=p||pesiSerie(); return p.d===1 && p.i===QUOTA_SECONDARI && p.metodo==='tms'; }
/* tipo di allenamento di un Training Set (quello attivo se il nome manca o è l'attivo) */
function tipoScheda(nomeSet){ const s=(typeof DOC!=='undefined'&&DOC&&DOC.scheda)||{};
  const x=(!nomeSet || nomeSet===s.setAttivo)? s.tipoAllenamento : ((s.setsSalvati||{})[nomeSet]||{}).tipoAllenamento;
  return TIPI_ALLEN.includes(x)? x : ''; }
/* 'profilo' = l'esperienza scritta nell'anagrafica; 'scheda' = il tipo del Training Set di
   riferimento (ctx.set: quello filtrato in Progressi, altrimenti l'attivo); '' = tutti */
function rifEsperienza(o){ o=o||rifImpost(); const e=o.esperienza==='profilo'? ((DOC.dati_utente||{}).esperienza||'') : o.esperienza; return ESPERIENZE.includes(e)? e : ''; }
function rifTipo(o,ctx){ o=o||rifImpost(); const x=o.tipo==='scheda'? tipoScheda(ctx&&ctx.set) : o.tipo; return TIPI_ALLEN.includes(x)? x : ''; }

/* ── CONTEGGIO DELLE SERIE: dirette e indirette ─────────────────────────────────
   Catalogo TMS: dirette sui gruppi dei muscoli primari, indirette su quelli dei soli
   secondari. Mappa esterna (smyrdev, MIT): 1,0 = diretta, 0,5 = indiretta per profilo di
   movimento, agganciata al catalogo per somiglianza del nome inglese — una PROPOSTA da
   convalidare (tools/riferimenti/mappa-esterna-convalida.csv); un esercizio senza aggancio
   si conta col catalogo TMS. I pesi (1,0 / 0,5) sono provvisori e modificabili. */
function mappaEsternaDI(nome){
  const R=rifDati(); const M=R&&R.mappa_esterna&&R.mappa_esterna.esercizi; if(!M) return null;
  const e=esLookup(nome), nomi=[String(nome==null?'':nome).trim()];
  if(e){ nomi.push(String(e.nome).trim()); if(Array.isArray(e.alias)) e.alias.forEach(a=>nomi.push(String(a).trim())); }
  for(const n of nomi){ const m=M[n]; if(m&&m.g) return {D:m.g[0].slice(), I:m.g[1].slice(), esterna:m}; }
  return null;
}
function gruppiDI(nome, metodo){
  metodo=metodo||pesiSerie().metodo;
  if(metodo==='esterna'){ const m=mappaEsternaDI(nome); if(m) return m; }
  const e=esLookup(nome), D=[], I=[];
  if(e){ (e.muscoli_primari||[]).forEach(m=>{ const g=MUSCOLO_GRUPPO[normMuscolo(m)]; if(g && !D.includes(g)) D.push(g); });
         (e.muscoli_secondari||[]).forEach(m=>{ const g=MUSCOLO_GRUPPO[normMuscolo(m)]; if(g && !D.includes(g) && !I.includes(g)) I.push(g); }); }
  if(!D.length && !I.length){ const g=gruppoOf(nome); if(g) D.push(g); }
  return {D:D, I:I};
}
/* somma `ser` serie dell'esercizio nei contatori: per = pesato (ciò che si disegna),
   D e I = serie dirette e indirette così come sono (ciò che si spiega) */
function accumulaSerie(acc, nome, ser, ripiego){
  const p=pesiSerie(); let di=gruppiDI(nome,p.metodo), q=quoteGruppi(nome);
  if(!di.D.length && !di.I.length && ripiego){ di={D:[ripiego], I:[]}; q={}; q[ripiego]=p.d; }
  acc.per=acc.per||{}; acc.D=acc.D||{}; acc.I=acc.I||{};
  Object.keys(q).forEach(g=>{ acc.per[g]=(acc.per[g]||0)+ser*q[g]; });
  di.D.forEach(g=>{ acc.D[g]=(acc.D[g]||0)+ser; });
  di.I.forEach(g=>{ acc.I[g]=(acc.I[g]||0)+ser; });
  return acc;
}

/* ── FILTRI E FASCE ───────────────────────────────────────────────────────────── */
function rifPassaContesto(v,o){
  if(o.raccolta==='schede' && o.soloEquilibrate && !v.equilibrata) return false;
  if(o.sesso && !(v.sesso===o.sesso || v.sesso==='misto')) return false;
  if(o.eta && v.eta!==o.eta) return false;
  if(o.agonismo==='si' && !v.agonismo) return false;
  if(o.attrezzatura && v.attrezzatura!==o.attrezzatura) return false;
  if(o.qualita==='pubblicati' && v.qualita==='preprint') return false;
  return true;
}
/* voci REALI della raccolta che passano i filtri di contesto, prima dei due assi (per la tabella) */
function rifVociContesto(o){ const R=rifDati(); if(!R) return []; return R.voci.filter(v=>v.raccolta===o.raccolta && !v.generata && rifPassaContesto(v,o)); }
/* schede generate da Fable che passano gli stessi filtri: solo con l'interruttore acceso */
function rifVociFable(o){ const R=rifDati(); if(!R || !o.fable || o.raccolta!=='schede') return []; return R.voci.filter(v=>v.generata && rifPassaContesto(v,o)); }
function rifFiltraAssi(voci, esp, tipo){ return voci.filter(v=>(!esp || v.esperienza===esp) && (!tipo || (v.tipi||[]).includes(tipo))); }
function rifQuoteVoce(v,p){
  const D=p.metodo==='esterna'? v.eD : v.D, I=p.metodo==='esterna'? v.eI : v.I;
  const per=GRUPPI_PESI.map((g,j)=>(+(D||[])[j]||0)*p.d + (+(I||[])[j]||0)*p.i), tot=per.reduce((a,b)=>a+b,0);
  return tot>0? per.map(x=>100*x/tot) : null;
}
function percentile(v,p){ v=v.slice().sort((a,b)=>a-b); if(!v.length) return 0;
  const i=(v.length-1)*p/100, lo=Math.floor(i), hi=Math.min(lo+1,v.length-1); return v[lo]+(v[hi]-v[lo])*(i-lo); }
/* il riferimento da disegnare: fasce per gruppo (o null), quante voci, record e fonti lo reggono.
   Negli studi `record` conta i soli record del corpus; `aggiunti` i protocolli presi da articoli
   ad accesso aperto fuori dal corpus (record_ids vuoto), che di record non ne hanno. */
function rifCalcola(src, ctx){
  const o=rifImpost(src), R=rifDati(), esp=rifEsperienza(o), tipo=rifTipo(o,ctx);
  if(!R) return {o:o, esp:esp, tipo:tipo, voci:[], n:0, record:0, aggiunti:0, fonti:[], fasce:RIF_QUOTA, stato:'storico'};
  const p={d:o.diretta, i:o.indiretta, metodo:o.metodo};
  let voci=rifFiltraAssi(rifVociContesto(o), esp, tipo), fable=false;
  const nReali=voci.length;
  /* Fable solo come ripiego: dove le voci reali non bastano, e solo se ne ha abbastanza lui */
  if(nReali<RIF_MIN_VOCI){ const vf=rifFiltraAssi(rifVociFable(o), esp, tipo); if(vf.length>=RIF_MIN_VOCI){ voci=vf; fable=true; } }
  const quote=voci.map(v=>rifQuoteVoce(v,p)).filter(Boolean), n=quote.length;
  const fonti=[...new Set(voci.map(v=>v.fonte))];
  const studi=o.raccolta==='studi';
  const record=studi? voci.reduce((a,v)=>a+(v.record_ids||[]).length,0) : n;
  const aggiunti=studi? voci.filter(v=>!(v.record_ids||[]).length).length : 0;
  let fasce=null, stato='insufficiente';
  if(n>=RIF_MIN_VOCI){
    stato= n>=RIF_VOCI_SOLIDE? 'solido' : 'indicativo'; fasce={};
    GRUPPI_PESI.forEach((g,j)=>{ const col=quote.map(q=>q[j]), p10=percentile(col,10), p90=percentile(col,90);
      fasce[g]={min:Math.floor(p10), max:Math.ceil(p90), sotto:Math.floor(0.75*p10), sopra:Math.ceil(1.25*p90)};
      if(stato==='indicativo' || fable) fasce[g].indicativa=true;
      if(fable) fasce[g].generata=true; });
  }
  return {o:o, ctx:ctx||{}, esp:esp, tipo:tipo, voci:voci, n:n, nReali:nReali, fable:fable, record:record, aggiunti:aggiunti, fonti:fonti, fasce:fasce, stato:stato};
}

/* ── TESTI ────────────────────────────────────────────────────────────────────── */
function rifUnita(raccolta, n){ return raccolta==='studi'? (n===1? t('protocollo') : t('protocolli')) : (n===1? t('scheda') : t('schede')); }
function nfPeso(x){ return String(Math.round(x*100)/100).replace('.', LANG==='en'?'.':','); }
/* da dove vengono i protocolli di studio: «20 record del corpus + 14 da articoli ad accesso aperto» */
function rifOrigineStudi(rc){
  const parti=[];
  if(rc.record) parti.push(rc.record+' '+t('record del corpus'));
  if(rc.aggiunti) parti.push(rc.aggiunti+' '+t('da articoli ad accesso aperto'));
  return parti.join(' + ');
}
/* «Schede pubblicate · Principiante · Ipertrofia» */
function rifNome(rc){
  return t(RACCOLTA_NOME[rc.o.raccolta])+' · '+(rc.esp? t(ESP_NOME[rc.esp]) : t('tutte le esperienze'))+' · '+(rc.tipo? t(TIPO_NOME[rc.tipo]) : t('tutti i tipi'));
}
/* riga sotto la ragnatela: con chi ci si confronta, su quanti dati, e se bastano */
function rifDidascalia(rc, opt){
  opt=opt||{}; rc=rc||rifCalcola();
  const btn=opt.dopo? ` <button class="btn btn--sm rif-cambia no-print" data-rif-apri="${esc(opt.dopo)}" data-rif-set="${esc((rc.ctx&&rc.ctx.set)||'')}">${ico('ingranaggio')}${t('Riferimento')}</button>` : '';
  if(rc.stato==='storico') return `<div class="rif-nota">${t('Riferimento: schede equilibrate pubblicate (fascia storica).')}${btn}</div>`;
  const fonti=rc.fonti.length+' '+(rc.fonti.length===1? t('fonte') : t('fonti'));
  const orig=rc.o.raccolta==='studi'? rifOrigineStudi(rc) : '';
  const base=rc.n+' '+rifUnita(rc.o.raccolta,rc.n)+(orig? ' ('+orig+')' : '')+' · '+fonti;
  const pesi=pesiPredefiniti({d:rc.o.diretta,i:rc.o.indiretta,metodo:rc.o.metodo})? '' :
    `<div class="rif-pesi">${rc.o.metodo==='esterna'? t('Conteggio con la mappa esterna (proposta da convalidare)') : t('Conteggio col catalogo TMS')} · ${t('dirette')} ×${nfPeso(rc.o.diretta)} · ${t('indirette')} ×${nfPeso(rc.o.indiretta)} <span class="pill rif-provv">${t('provvisori')}</span></div>`;
  /* fascia presa dalle schede Fable: l'avvertimento c'è SEMPRE, ovunque si disegni la ragnatela */
  if(rc.fable)
    return `<div class="rif-nota is-fable"><b>${t('Fascia ipotizzata da Fable: schede generate, non reali')}</b> · ${esc(rifNome(rc))}: ${rc.nReali} ${t('voci reali')} (${t('ne servono almeno')} ${RIF_MIN_VOCI}), ${t('fascia viola tratteggiata da')} ${rc.n} ${t('schede generate da Fable')}.${btn}${pesi}</div>`;
  if(rc.stato==='insufficiente')
    return `<div class="rif-nota is-poco"><b>${t('Dati insufficienti')}</b> ${t('per')} ${esc(rifNome(rc))}: ${esc(base)} (${t('ne servono almeno')} ${RIF_MIN_VOCI}). ${t('Nessuna fascia disegnata.')}${btn}${pesi}</div>`;
  const avv=rc.stato==='indicativo'? ` <span class="rif-indic">${t('pochi dati: fascia indicativa, tratteggiata')}</span>` : '';
  return `<div class="rif-nota">${t('Riferimento')}: <b>${esc(rifNome(rc))}</b> · <span class="mono">${esc(base)}</span>${avv}${btn}${pesi}</div>`;
}
/* i pulsanti «⚙ Riferimento» stanno in pannelli che si ridisegnano a ogni tasto: un solo
   ascoltatore sul documento li serve tutti. `data-rif-apri` dice cosa ridisegnare dopo. */
document.addEventListener('click', ev=>{
  const b=ev.target && ev.target.closest && ev.target.closest('[data-rif-apri]');
  if(b){ ev.preventDefault(); rifDistrModal(b.dataset.rifApri, b.dataset.rifSet? {set:b.dataset.rifSet} : null); }
});
function rifRidisegna(dopo){
  if(dopo==='bilanciamento'){ bilanciamentoModal(); return; }
  closeModal(); renderAll();
}

/* ── RIQUADRO DI SCELTA ───────────────────────────────────────────────────────── */
function rifValoriPresenti(voci, campo){ const s=new Set(); voci.forEach(v=>{ if(v[campo]) s.add(v[campo]); }); return s; }
function rifDistrModal(dopo, ctx){
  const R=rifDati();
  if(!R){ avviso(t('I dati dei riferimenti non sono disponibili in questa versione: resta la fascia storica.')); return; }
  const u=DOC.dati_utente||(DOC.dati_utente={});
  let bozza=rifImpost(); /* copia di lavoro: si salva solo con «Applica» */
  const opz=(val,lab,sel)=>`<option value="${esc(val)}"${val===sel?' selected':''}>${esc(lab)}</option>`;
  const disegna=()=>{
    const rc=rifCalcola(bozza,ctx), base=rifVociContesto(bozza);
    const espP=ESPERIENZE.includes(u.esperienza)? t(ESP_NOME[u.esperienza]) : t('non indicata');
    const tS=tipoScheda(ctx&&ctx.set), tipoP=tS? t(TIPO_NOME[tS]) : t('non indicato');
    const nomeSet=(ctx&&ctx.set)||((DOC.scheda||{}).setAttivo)||'';
    /* tabella esperienza × tipo: quante voci reggerebbero ogni scelta */
    const righe=[''].concat(ESPERIENZE), colonne=[''].concat(TIPI_ALLEN);
    /* con «Schede Fable» acceso, una casella con meno di 5 voci reali può essere coperta da Fable: «+F10» */
    const baseF=rifVociFable(bozza);
    const cella=(e,x)=>{ const n=rifFiltraAssi(base,e,x).length, sel=(e===rc.esp && x===rc.tipo);
      const nf=n<RIF_MIN_VOCI? rifFiltraAssi(baseF,e,x).length : 0, usaF=nf>=RIF_MIN_VOCI;
      const cl=usaF? 'is-fable' : n<RIF_MIN_VOCI? 'is-poco' : n<RIF_VOCI_SOLIDE? 'is-indic' : 'is-ok';
      const tit=(e?t(ESP_NOME[e]):t('Tutte'))+' · '+(x?t(TIPO_NOME[x]):t('Tutti'))+(usaF? ' · '+nf+' '+t('schede generate da Fable') : '');
      return `<td class="rif-cella ${cl}${sel?' is-sel':''}" data-e="${e}" data-x="${x}" title="${esc(tit)}">${n}${usaF?`<span class="rif-f">+F${nf}</span>`:''}</td>`; };
    const matrice=`<div class="tbl-wrap"><table class="rif-matrice"><thead><tr><th class="l">${t('Esperienza')} \\ ${t('Tipo')}</th>${colonne.map(x=>`<th>${esc(x? t(TIPO_NOME[x]) : t('Tutti'))}</th>`).join('')}</tr></thead>
      <tbody>${righe.map(e=>`<tr><th class="l">${esc(e? t(ESP_NOME[e]) : t('Tutte'))}</th>${colonne.map(x=>cella(e,x)).join('')}</tr>`).join('')}</tbody></table></div>`;
    const senzaEsp=base.filter(v=>!v.esperienza).length;
    /* filtri di contesto: solo quelli che in questa raccolta distinguono davvero qualcosa */
    const tutteVoci=R.voci.filter(v=>v.raccolta===bozza.raccolta);
    const f=[];
    if(rifValoriPresenti(tutteVoci,'sesso').size>1) f.push(`<div class="field"><label>${t('Sesso')}</label><select data-k="sesso">${opz('',t('Tutti'),bozza.sesso)}${opz('M',t('Uomini (e voci miste)'),bozza.sesso)}${opz('F',t('Donne (e voci miste)'),bozza.sesso)}</select></div>`);
    if(rifValoriPresenti(tutteVoci,'eta').size>1) f.push(`<div class="field"><label>${t('Età')}</label><select data-k="eta">${opz('',t('Tutte'),bozza.eta)}${opz('giovani',t('Giovani adulti'),bozza.eta)}${opz('over40',t('Dai 40 anni in su'),bozza.eta)}</select></div>`);
    if(rifValoriPresenti(tutteVoci,'agonismo').size>0) f.push(`<div class="field"><label>${t('Agonismo')}</label><select data-k="agonismo">${opz('',t('Tutti'),bozza.agonismo)}${opz('si',t('Solo sportivi o agonisti'),bozza.agonismo)}</select></div>`);
    if(rifValoriPresenti(tutteVoci,'attrezzatura').size>1) f.push(`<div class="field"><label>${t('Attrezzatura')}</label><select data-k="attrezzatura">${opz('',t('Tutte'),bozza.attrezzatura)}${opz('palestra',t('Palestra'),bozza.attrezzatura)}${opz('manubri',t('Manubri'),bozza.attrezzatura)}${opz('corpo libero',t('Corpo libero'),bozza.attrezzatura)}</select></div>`);
    if(rifValoriPresenti(tutteVoci,'qualita').size>1) f.push(`<div class="field"><label>${t('Qualità della fonte')}</label><select data-k="qualita">${opz('',t('Tutte'),bozza.qualita)}${opz('pubblicati',t('Solo articoli pubblicati (niente preprint)'),bozza.qualita)}</select></div>`);
    const fabChk=bozza.raccolta==='schede'? `<label class="optchk rif-chk rif-fable-chk"><input type="checkbox" data-k="fable"${bozza.fable?' checked':''}> <span><b>${t('Schede Fable')}</b> · ${t('dove le schede reali sono meno di 5, usa schede generate da Fable (non reali): la fascia diventa viola e tratteggiata, sempre con l’avvertimento')}</span></label>` : '';
    const eqChk=bozza.raccolta==='schede'? `<label class="optchk rif-chk"><input type="checkbox" data-k="soloEquilibrate"${bozza.soloEquilibrate?' checked':''}> <span>${t('Solo schede equilibrate (spinta : trazione fra 0,7 e 1,4, come le linee guida sulla spalla)')}</span></label>` : '';
    const contestoAttivo=['sesso','eta','agonismo','attrezzatura','qualita'].some(k=>bozza[k]) || (bozza.raccolta==='schede'&&!bozza.soloEquilibrate);
    const me=R.mappa_esterna||{}, nConv=Object.values(me.esercizi||{}).filter(m=>m.st==='convalidata'||m.st==='corretta').length;
    const info=R.raccolte[bozza.raccolta]||{};
    const esclusi=Object.keys(info.esclusi||{}).filter(k=>info.esclusi[k]).sort((a,b)=>info.esclusi[b]-info.esclusi[a]).map(k=>`<li><span class="mono">${info.esclusi[k]}</span> ${esc(k)}</li>`).join('');
    const fontiUsate=R.fonti.filter(x=>rc.fonti.includes(x.id));
    const elencoFonti=fontiUsate.map(x=>`<li><b>${esc(x.nome)}</b>${x.url?` · <a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url.replace(/^https?:\/\//,'').slice(0,60))}</a>`:''}${x.doi?` · DOI ${esc(x.doi)}`:''}<div class="muted">${esc(x.licenza||'')}</div></li>`).join('');
    const elencoVoci=rc.voci.map(v=>`<li>${v.url?`<a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.titolo)}</a>`:esc(v.titolo)}${v.generata?` <span class="pill rif-fable">${t('generata da Fable')}</span>`:''} <span class="muted">· ${esc(v.esperienza? t(ESP_NOME[v.esperienza]) : t('esperienza non indicata'))} · ${esc((v.tipi||[]).map(x=>t(TIPO_NOME[x])).join(', '))}${v.stato?' · '+esc(v.stato):''}</span></li>`).join('');
    const riepilogo= rc.fable
      ? `<div class="callout rif-fable-box">${ico('attenzione')}<div><b>${t('Schede generate da Fable, non reali')}</b>: ${t('qui le schede reali sono')} ${rc.nReali} (${t('ne servono almeno')} ${RIF_MIN_VOCI}), ${t('quindi la fascia viene da')} <b>${rc.n} ${t('schede generate alla cieca da Fable')}</b>. ${t('Sono un’ipotesi, non dati: dove i dati reali ci sono, Fable li segue bene per tipo di allenamento, ma in qualche casella sbaglia fino a 15 punti.')}</div></div>`
      : rc.stato==='insufficiente'
      ? `<div class="callout" style="background:var(--danger-t);border-color:var(--danger-bd);border-left-color:var(--danger)"><div><b>${t('Dati insufficienti')}</b>: ${rc.n} ${rifUnita(bozza.raccolta,rc.n)} ${t('da')} ${rc.fonti.length} ${rc.fonti.length===1?t('fonte'):t('fonti')} (${t('ne servono almeno')} ${RIF_MIN_VOCI}). ${t('La ragnatela non disegnerà la fascia: scegli una casella con più voci o allarga i filtri.')}</div></div>`
      : `<div class="callout ${rc.stato==='solido'?'callout--info':''}"><div>${t('Il confronto si regge su')} <b>${rc.n} ${rifUnita(bozza.raccolta,rc.n)}</b>${bozza.raccolta==='studi'&&rifOrigineStudi(rc)?` (${rifOrigineStudi(rc)})`:''} ${t('da')} <b>${rc.fonti.length} ${rc.fonti.length===1?t('fonte'):t('fonti')}</b>.${rc.stato==='indicativo'?' '+t('Sono pochi: la fascia sarà tratteggiata, da leggere come indicativa.'):''}</div></div>`;
    const fasceTab=rc.fasce? `<div class="rif-fasce">${GRUPPI_PESI.map(g=>`<span><b>${esc(t(g))}</b> ${rc.fasce[g].min}–${rc.fasce[g].max}%</span>`).join('')}</div>` : '';
    document.getElementById('rif-corpo').innerHTML=`
      <div class="row">
        <div class="field"><label>${t('Raccolta')}</label><select data-k="raccolta">${opz('schede',t('Schede pubblicate'),bozza.raccolta)}${opz('studi',t('Protocolli di studio'),bozza.raccolta)}</select></div>
        <div class="field"><label>${t('Esperienza')}</label><select data-k="esperienza">${opz('profilo',t('Come il profilo')+' ('+espP+')',bozza.esperienza)}${opz('',t('Tutte'),bozza.esperienza)}${ESPERIENZE.map(e=>opz(e,t(ESP_NOME[e]),bozza.esperienza)).join('')}</select></div>
        <div class="field"><label>${t('Tipo di allenamento')}</label><select data-k="tipo">${opz('scheda',t('Come la scheda')+(nomeSet?' «'+nomeSet+'»':'')+' ('+tipoP+')',bozza.tipo)}${opz('',t('Tutti'),bozza.tipo)}${TIPI_ALLEN.map(x=>opz(x,t(TIPO_NOME[x]),bozza.tipo)).join('')}</select></div>
      </div>
      ${fabChk}
      <div class="rif-unita muted">${bozza.raccolta==='studi'
        ? t('Un elemento = un protocollo di studio con l’elenco completo degli esercizi. L’esperienza è quella dei partecipanti (codice del corpus o testo della popolazione); il tipo viene dagli obiettivi dello studio.')
        : t('Un elemento = una settimana di una scheda pubblicata. Il livello è quello dichiarato dalla scheda (principiante, intermedio, avanzato), non un’esperienza misurata; il tipo viene dall’obiettivo dichiarato.')}</div>
      ${matrice}
      <div class="rif-leg muted"><span class="rif-cella is-ok">≥${RIF_VOCI_SOLIDE}</span> ${t('fascia piena')} <span class="rif-cella is-indic">${RIF_MIN_VOCI}–${RIF_VOCI_SOLIDE-1}</span> ${t('indicativa')} <span class="rif-cella is-poco">&lt;${RIF_MIN_VOCI}</span> ${t('dati insufficienti')}${baseF.length?` <span class="rif-cella is-fable">+F</span> ${t('coperta da schede generate da Fable')}`:''}${senzaEsp?` · ${senzaEsp} ${t('voci senza esperienza indicata contano solo in «Tutte»')}`:''}</div>
      ${riepilogo}${fasceTab}
      <details class="rif-det"${contestoAttivo?' open':''}><summary>${t('Filtri di contesto')}${contestoAttivo?' · '+t('attivi'):''}</summary>
        <div class="row">${f.join('')||`<div class="muted">${t('In questa raccolta non ci sono altri filtri utili.')}</div>`}</div>${eqChk}</details>
      <details class="rif-det"><summary>${t('Come si contano le serie')}${pesiPredefiniti({d:bozza.diretta,i:bozza.indiretta,metodo:bozza.metodo})?'':' · '+t('modificato')}</summary>
        <div class="row">
          <div class="field"><label>${t('Mappa dei muscoli')}</label><select data-k="metodo">${opz('tms',t('Catalogo TMS (muscoli principali e secondari)'),bozza.metodo)}${opz('esterna',t('Mappa esterna smyrdev (proposta da convalidare)'),bozza.metodo)}</select></div>
          <div class="field"><label>${t('Serie diretta')}</label><input data-k="diretta" type="number" min="0" max="2" step="0.05" value="${bozza.diretta}"></div>
          <div class="field"><label>${t('Serie indiretta')}</label><input data-k="indiretta" type="number" min="0" max="2" step="0.05" value="${bozza.indiretta}"></div>
        </div>
        <div class="lat-nota"><span class="pill rif-provv">${t('provvisori')}</span> ${t('1,0 alla serie diretta e 0,5 all’indiretta è la convenzione delle serie frazionarie (Schoenfeld e coll., 2019): non è ancora convalidata sul catalogo del TMS. Il riferimento si ricalcola con gli stessi pesi, così il confronto resta coerente. Le zone utili dell’elenco «Serie per gruppo» restano tarate su 1,0 / 0,5 col catalogo TMS.')}
        ${bozza.metodo==='esterna'?`<br>${t('Mappa esterna:')} ${me.con_volume||0} ${t('esercizi del catalogo agganciati a un profilo di movimento')}, ${nConv} ${t('convalidati')}. ${t('Gli altri si contano col catalogo TMS. La mappa è una proposta del repository smyrdev (licenza MIT), non un risultato sperimentale.')}`:''}</div></details>
      <details class="rif-det"><summary>${t('Fonti e voci usate')} (${rc.n})</summary>
        <ul class="rif-fonti">${elencoFonti||`<li class="muted">${t('nessuna')}</li>`}</ul>
        ${elencoVoci?`<ul class="rif-voci">${elencoVoci}</ul>`:''}
        ${esclusi?`<div class="lat-nota">${t('Non entrano in questa raccolta')}:</div><ul class="rif-esclusi">${esclusi}</ul>`:''}</details>`;
    const corpo=document.getElementById('rif-corpo');
    corpo.querySelectorAll('[data-k]').forEach(el=>{
      const k=el.dataset.k;
      const leggi=()=>{ bozza[k]= el.type==='checkbox'? el.checked : el.value; if(k==='raccolta'){ bozza.qualita=''; } disegna(); };
      el.onchange=leggi; if(el.type==='number') el.oninput=()=>{ bozza[k]=el.value; };
    });
    corpo.querySelectorAll('.rif-cella[data-e]').forEach(td=>{ td.onclick=()=>{ bozza.esperienza=td.dataset.e; bozza.tipo=td.dataset.x; disegna(); }; });
  };
  modal(`<h3>${t('Riferimento della distribuzione')}</h3>
    <div class="muted" style="font-size:12.5px;margin-bottom:8px">${t('La fascia verde della ragnatela è la forma tipica (dal 10° al 90° percentile) delle voci scelte qui. Due assi: l’esperienza (dall’anagrafica dell’atleta) e il tipo di allenamento (dal Training Set); il resto sono filtri di contesto. La scelta vale per questo profilo.')}</div>
    <div id="rif-corpo"></div>
    <div class="modal__actions"><button class="btn" id="rif-def">${t('Ripristina predefiniti')}</button><span class="spacer"></span><button class="btn" id="rif-no">${t('Annulla')}</button><button class="btn btn--ember" id="rif-ok">${t('Applica')}</button></div>`);
  const m=document.getElementById('modal'); if(m) m.style.maxWidth='860px';
  disegna();
  document.getElementById('rif-def').onclick=()=>{ bozza=rifImpost({}); disegna(); };
  document.getElementById('rif-no').onclick=()=>rifRidisegna(dopo);
  document.getElementById('rif-ok').onclick=()=>{
    const o=rifImpost(bozza), salva={};
    Object.keys(RIF_DEF).forEach(k=>{ if(o[k]!==RIF_DEF[k]) salva[k]=o[k]; });   /* solo ciò che cambia: il file resta pulito */
    if(Object.keys(salva).length) u.rifDistr=salva; else delete u.rifDistr;
    persist('corpo'); rifRidisegna(dopo);
  };
}
