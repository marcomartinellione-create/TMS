/* ════════════════ RENDER: ALLENAMENTO ════════════════ */
let schedaMode='settimanale';
let pesiView='scheda';  /* 'scheda' | 'riscaldamento' — vista del tab Pesi (toggle col pulsante arancione) */
function schedaRows(){ return DOC.scheda[schedaMode] || (DOC.scheda[schedaMode]=[]); }

/* ── RIORDINO PER TRASCINAMENTO (sostituisce le frecce ▲▼, tolte in v1.1.12) ──
   spostaRiga è pura apposta: il trascinamento vero non si può provare in jsdom, la
   matematica degli indici sì — ed è lì che si sbaglia. `sotto` dice se il rilascio è
   avvenuto nella metà bassa della riga di arrivo, cioè «dopo» invece che «prima».
   Cambiare giorno è voluto: trascinando una riga sotto un altro giorno, quello diventa
   il suo giorno, altrimenti al ridisegno riapparirebbe sotto la vecchia intestazione. */
function spostaRiga(arr, from, to, sotto){
  if(!Array.isArray(arr)) return arr;
  if(from<0||from>=arr.length||to<0||to>=arr.length||from===to) return arr;
  const el=arr[from], dest=arr[to];
  if(el && dest && dest.giorno) el.giorno=dest.giorno;
  arr.splice(from,1);
  let ins=to+(sotto?1:0); if(from<ins) ins--;
  arr.splice(Math.max(0,Math.min(arr.length,ins)),0,el);
  return arr;
}
let _dragFrom=null;
function abilitaRiordino(chiave, getRows, ridisegna){
  const root=document.getElementById('panel-allenamento'); if(!root) return;
  const idxDi=tr=>{ const v=tr.dataset[chiave]; return v==null? null : +v; };
  root.querySelectorAll('tr['+(chiave==='i'?'data-i':'data-wi')+']').forEach(tr=>{
    const h=tr.querySelector('.drag-h'); if(!h) return;
    /* si trascina SOLO dal manico: altrimenti selezionare il testo di una nota
       farebbe partire un trascinamento a ogni gesto */
    h.onmousedown=()=>{ tr.draggable=true; };
    h.onmouseup=()=>{ tr.draggable=false; };
    tr.ondragstart=e=>{ _dragFrom=idxDi(tr); tr.classList.add('is-drag');
      try{ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',String(_dragFrom)); }catch(_){} };
    tr.ondragend=()=>{ tr.draggable=false; _dragFrom=null;
      root.querySelectorAll('.drop-t,.drop-b').forEach(x=>x.classList.remove('drop-t','drop-b'));
      root.querySelectorAll('.is-drag').forEach(x=>x.classList.remove('is-drag')); };
    tr.ondragover=e=>{ if(_dragFrom==null) return; e.preventDefault();
      const rc=tr.getBoundingClientRect(), sotto=(e.clientY-rc.top)>rc.height/2;
      tr.classList.toggle('drop-b',sotto); tr.classList.toggle('drop-t',!sotto); };
    tr.ondragleave=()=>{ tr.classList.remove('drop-t','drop-b'); };
    tr.ondrop=e=>{ e.preventDefault(); if(_dragFrom==null) return;
      const rc=tr.getBoundingClientRect(), sotto=(e.clientY-rc.top)>rc.height/2;
      const from=_dragFrom; _dragFrom=null;
      spostaRiga(getRows(), from, idxDi(tr), sotto);
      persist('scheda'); ridisegna(); };
  });
}
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
/* fotografia del set attivo (per metterlo fra i salvati) e caricamento di un set nel piano
   attivo: il TIPO DI ALLENAMENTO viaggia con la sua scheda (Marco, 2026-11-13: l'esperienza
   sta nell'anagrafica, il tipo nella scheda di riferimento) */
function tsFoto(s){ const f={settimanale:tsCopy(s.settimanale||[]), mensile:tsCopy(s.mensile||[]), riscaldamento:tsCopy(s.riscaldamento||{})};
  if(TIPI_ALLEN.includes(s.tipoAllenamento)) f.tipoAllenamento=s.tipoAllenamento;
  const g=tsGruppoNorm(s.gruppo); if(g) f.gruppo=g; return f; }
function tsCarica(s,src){ src=src||{}; s.settimanale=tsCopy(src.settimanale||[]); s.mensile=tsCopy(src.mensile||[]); s.riscaldamento=tsCopy(src.riscaldamento||{});
  if(TIPI_ALLEN.includes(src.tipoAllenamento)) s.tipoAllenamento=src.tipoAllenamento; else delete s.tipoAllenamento;
  const g=tsGruppoNorm(src.gruppo); if(g) s.gruppo=g; else delete s.gruppo; }
function ensureSets(){ const s=DOC.scheda; if(!s||typeof s!=='object') return s;
  if(typeof s.setAttivo!=='string'||!s.setAttivo) s.setAttivo='Base';
  if(!s.setsSalvati||typeof s.setsSalvati!=='object') s.setsSalvati={};
  if(!s.riscaldamento||typeof s.riscaldamento!=='object'||Array.isArray(s.riscaldamento)) s.riscaldamento={};
  let ord=Array.isArray(s.setsOrdine)?s.setsOrdine.filter(n=>n===s.setAttivo||s.setsSalvati[n]):[];
  [s.setAttivo].concat(Object.keys(s.setsSalvati)).forEach(n=>{ if(ord.indexOf(n)<0) ord.push(n); });
  s.setsOrdine=ord; tsGruppiPulisci(s); return s; }
/* ── GRUPPI DI TRAINING SET (2026-11-23, Marco: «raccogliere i Training Set in gruppi, per esempio
      Palestra e Corpo libero»). Un gruppo è SOLO un'etichetta per ordinare, filtrare e cercare i set:
      nessun calcolo la legge (1RM, TL, volumi, riferimenti della ragnatela, Progressi, Analisi danno
      gli stessi numeri con e senza gruppi). In scheda.json:
        · 'gruppo' dentro ogni set (in DOC.scheda per quello aperto, in setsSalvati[nome] per gli altri),
          facoltativo: un set senza gruppo sta sotto «Senza gruppo». Viaggia col set nei cambi e nelle
          copie (tsFoto/tsCarica), come il tipo di allenamento;
        · 'setsGruppi' = elenco ordinato dei nomi dei gruppi, anche di quelli ancora vuoti (un gruppo
          si può creare prima di metterci dei set). C'è solo se esiste almeno un gruppo: una scheda che
          non li usa resta identica, senza migrazioni.
      Al telefono non va niente: lì arriva solo la scheda del set aperto. ── */
const TS_TUTTI='__tutti__', TS_SENZA='__senza__';
function tsGruppoNorm(g){ return String(g==null?'':g).replace(/\s+/g,' ').trim(); }
function tsGruppi(){ const s=DOC.scheda; return (s && Array.isArray(s.setsGruppi))? s.setsGruppi.slice() : []; }
function tsOggettiSet(s){ const sv=(s&&s.setsSalvati)||{}; return [s].concat(Object.keys(sv).map(n=>sv[n])).filter(o=>o&&typeof o==='object'); }
/* elenco pulito (nomi unici e non vuoti) più i gruppi usati dai set ma non elencati; idempotente */
function tsGruppiPulisci(s){ const el=[], visti=new Set(), metti=g=>{ if(g && !visti.has(g)){ visti.add(g); el.push(g); } };
  if(Array.isArray(s.setsGruppi)) s.setsGruppi.forEach(g=>metti(tsGruppoNorm(g)));
  tsOggettiSet(s).forEach(o=>{ if(!('gruppo' in o)) return; const g=tsGruppoNorm(o.gruppo);
    if(g){ if(o.gruppo!==g) o.gruppo=g; metti(g); } else delete o.gruppo; });
  if(el.length) s.setsGruppi=el; else delete s.setsGruppi; }
function tsGruppoDi(nome){ const s=DOC.scheda||{}; const o=(nome===s.setAttivo)? s : (s.setsSalvati||{})[nome];
  return (o && typeof o==='object' && tsGruppoNorm(o.gruppo)) || ''; }
/* il gruppo che esiste già con questo nome, senza badare a maiuscole e minuscole ('' se non c'è) */
function tsGruppoEsistente(g){ g=tsGruppoNorm(g).toLowerCase(); return g? (tsGruppi().find(x=>x.toLowerCase()===g)||'') : ''; }
/* crea un gruppo (se c'è già, restituisce quello): il nome con cui il gruppo esiste, '' se non valido */
function tsNuovoGruppo(g){ const s=DOC.scheda; g=tsGruppoNorm(g); if(!g || !s || g===TS_TUTTI || g===TS_SENZA) return '';
  const c=tsGruppoEsistente(g); if(c) return c; s.setsGruppi=tsGruppi().concat(g); return g; }
/* mette il set «nome» nel gruppo g, esistente o nuovo; '' = Senza gruppo */
function tsAssegnaGruppo(nome, g){ const s=ensureSets(); const o=(nome===s.setAttivo)? s : s.setsSalvati[nome]; if(!o) return false;
  const c=tsGruppoNorm(g)? tsNuovoGruppo(g) : ''; if(c) o.gruppo=c; else delete o.gruppo; return true; }
/* rinomina un gruppo: i suoi set lo seguono; rifiuta un nome già usato da un altro gruppo */
function tsRinominaGruppo(vecchio, nuovo){ const s=ensureSets(), el=tsGruppi(); nuovo=tsGruppoNorm(nuovo);
  if(!nuovo || nuovo===TS_TUTTI || nuovo===TS_SENZA || el.indexOf(vecchio)<0) return false;
  const c=tsGruppoEsistente(nuovo); if(c && c!==vecchio) return false;
  s.setsGruppi=el.map(x=>x===vecchio? nuovo : x);
  tsOggettiSet(s).forEach(o=>{ if(o.gruppo===vecchio) o.gruppo=nuovo; });
  Object.keys(_tsFiltro).forEach(k=>{ if(_tsFiltro[k] && _tsFiltro[k].valore===vecchio) _tsFiltro[k].valore=nuovo; });
  return true; }
/* toglie un gruppo: i suoi set restano e passano a «Senza gruppo» */
function tsTogliGruppo(g){ const s=ensureSets(), el=tsGruppi(); if(el.indexOf(g)<0) return false;
  tsOggettiSet(s).forEach(o=>{ if(o.gruppo===g) delete o.gruppo; });
  const resto=el.filter(x=>x!==g); if(resto.length) s.setsGruppi=resto; else delete s.setsGruppi; return true; }
/* filtro e ricerca: TS_TUTTI, TS_SENZA o il nome di un gruppo; la ricerca guarda le parole del nome
   del set, senza badare a maiuscole e accenti, dentro il gruppo scelto o in tutti */
function tsPassa(g, filtro){ return !filtro || filtro===TS_TUTTI || (filtro===TS_SENZA? !g : g===filtro); }
function tsNormCerca(x){ return String(x==null?'':x).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); }
function tsCercaOk(nome, q){ const p=tsNormCerca(q).split(/\s+/).filter(Boolean); if(!p.length) return true;
  const h=tsNormCerca(nome); return p.every(x=>h.includes(x)); }
/* set divisi per gruppo: [{gruppo, nomi}], nell'ordine dei gruppi e poi «Senza gruppo» (gruppo '').
   opt: filtro, cerca, sempre (un nome da tenere comunque: il set aperto o scelto), vuoti (anche i
   gruppi senza set, per gestirli), gruppoDi (chi dice il gruppo di un nome: di base la scheda) */
function tsPerGruppo(nomi, opt){ opt=opt||{}; const gDi=opt.gruppoDi||tsGruppoDi, filtro=opt.filtro||TS_TUTTI, q=opt.cerca||'';
  const blocchi=tsGruppi().map(g=>({gruppo:g, nomi:[]})), senza={gruppo:'', nomi:[]};
  (nomi||[]).forEach(n=>{ const g=gDi(n);
    if(n!==opt.sempre && (!tsPassa(g,filtro) || !tsCercaOk(n,q))) return;
    (blocchi.find(b=>b.gruppo===g)||senza).nomi.push(n); });
  return blocchi.concat([senza]).filter(b=>b.nomi.length || (opt.vuoti && b.gruppo && !tsNormCerca(q).trim() && tsPassa(b.gruppo,filtro))); }
/* <option> dei set: divise in <optgroup> per gruppo quando ci sono gruppi, altrimenti in fila come sempre */
function tsOpzioni(nomi, filtro, scelto, prefisso, gruppoDi){
  const opt=n=>`<option value="${esc(n)}"${n===scelto?' selected':''}>${esc((prefisso||'')+n)}</option>`;
  const bl=tsPerGruppo(nomi,{filtro, sempre:scelto, gruppoDi});
  if(!tsGruppi().length) return bl.map(b=>b.nomi.map(opt).join('')).join('');
  return bl.map(b=>`<optgroup label="${esc(b.gruppo||t('Senza gruppo'))}">${b.nomi.map(opt).join('')}</optgroup>`).join(''); }
/* <option> del filtro per gruppo, col numero di set di ognuno */
function tsOpzioniFiltro(v, nomi, gruppoDi){ const gDi=gruppoDi||tsGruppoDi, n=g=>(nomi||[]).filter(x=>tsPassa(gDi(x),g)).length;
  const o=(val,lab)=>`<option value="${esc(val)}"${v===val?' selected':''}>${esc(lab)} (${n(val)})</option>`;
  return o(TS_TUTTI,t('Tutti'))+tsGruppi().map(g=>o(g,g)).join('')+o(TS_SENZA,t('Senza gruppo')); }
/* <option> per mettere un set in un gruppo: Senza gruppo, i gruppi, Nuovo gruppo… */
function tsOpzioniGruppo(v){ return `<option value=""${!v?' selected':''}>${t('Senza gruppo')}</option>`+
  tsGruppi().map(g=>`<option value="${esc(g)}"${g===v?' selected':''}>${esc(g)}</option>`).join('')+
  `<option value="__nuovo__">${t('Nuovo gruppo…')}</option>`; }
/* filtro per gruppo dei selettori: solo in memoria e legato al profilo. All'avvio e cambiando profilo
   si riparte da «Tutti» (un cliente non eredita la scelta fatta su un altro); se il gruppo non c'è
   più si torna a «Tutti» */
const _tsFiltro={};
function tsFiltroGet(dove){ const f=_tsFiltro[dove]; let v=(f && f.profilo===activeProfile)? f.valore : TS_TUTTI;
  const el=tsGruppi(); if(!el.length || (v!==TS_TUTTI && v!==TS_SENZA && el.indexOf(v)<0)) v=TS_TUTTI; return v; }
function tsFiltroSet(dove, v){ _tsFiltro[dove]={profilo:activeProfile, valore:v||TS_TUTTI}; }
/* ── i Training Set nel menù a tendina dell'app (04-modal.js, tendina*): il filtro per gruppo sono i
      bottoni in cima al riquadro, la ricerca la casella sopra, i set divisi per gruppo; usato dal
      menù Training Set dei Pesi e da «Dati da analizzare» dei Progressi ── */
/* bottoni dei gruppi: Tutti, i gruppi, Senza gruppo, ognuno col numero di set; un gruppo senza set
   non compare (non c'è niente da filtrare), salvo che sia quello scelto */
function tsVociFiltro(nomi, valore, gruppoDi){ const gDi=gruppoDi||tsGruppoDi, n=g=>(nomi||[]).filter(x=>tsPassa(gDi(x),g)).length;
  return [{v:TS_TUTTI, lab:t('Tutti'), n:n(TS_TUTTI)}].concat(tsGruppi().map(g=>({v:g, lab:g, n:n(g)})), [{v:TS_SENZA, lab:t('Senza gruppo'), n:n(TS_SENZA)}])
    .filter(x=>x.v===TS_TUTTI || x.n>0 || x.v===valore); }
/* le voci divise per gruppo, già filtrate e cercate; senza gruppi un solo blocco senza intestazione */
function tsBlocchiTendina(nomi, filtro, cerca, info, gruppoDi){ const con=tsGruppi().length>0;
  return tsPerGruppo(nomi,{filtro, cerca, gruppoDi}).map(b=>({titolo: con? (b.gruppo||t('Senza gruppo')) : null, voci:b.nomi.map(n=>({v:n, lab:n, info:info? info(n) : ''}))})); }
function tsVuotoTendina(cerca){ return tsNormCerca(cerca).trim()? t('Nessun Training Set con questo nome.') : t('Nessun Training Set in questo gruppo.'); }
/* menù Training Set della barra Pesi: set con il loro tipo di allenamento, e in fondo le azioni */
function tsTendinaCfg(){ const S=ensureSets(), att=S.setAttivo;
  const tipo=n=>{ const o=n===att? S : S.setsSalvati[n]; return o && TIPI_ALLEN.includes(o.tipoAllenamento)? t(TIPO_NOME[o.tipoAllenamento]) : ''; };
  return { scelto:att, cerca:{ph:t('Cerca un Training Set…')},
    gruppi:()=>tsGruppi().length? {valore:tsFiltroGet('pesi'), voci:tsVociFiltro(ensureSets().setsOrdine, tsFiltroGet('pesi'))} : null,
    onGruppo:v=>{ tsFiltroSet('pesi', v); },
    blocchi:q=>tsBlocchiTendina(ensureSets().setsOrdine, tsFiltroGet('pesi'), q, tipo),
    vuoto:tsVuotoTendina,
    azioni:[{v:'__new__', lab:t('Nuovo Training Set…'), ico:'piu'}, {v:'__cerca__', lab:t('Gestisci i gruppi…'), ico:'cartella'},
      {v:'__rename__', lab:t('Rinomina')+' «'+att+'»', ico:'matita'}].concat(S.setsOrdine.length>1? [{v:'__delete__', lab:t('Elimina')+' «'+att+'»', ico:'cestino', pericolo:true}] : []),
    onScegli:v=>{ if(v==='__new__') nuovoTrainingSetModal(); else if(v==='__cerca__') tsGruppiModal();
      else if(v==='__rename__') rinominaTrainingSet(); else if(v==='__delete__') eliminaTrainingSet(); else switchTrainingSet(v); } }; }
function switchTrainingSet(nome){ const s=ensureSets(); if(!nome||nome===s.setAttivo||!s.setsSalvati[nome]) return;
  s.setsSalvati[s.setAttivo]=tsFoto(s);  /* salva l'attivo */
  tsCarica(s, s.setsSalvati[nome]||{});                                                                /* carica il target */
  delete s.setsSalvati[nome]; s.setAttivo=nome; persist('scheda'); renderAllenamento(); }
/* gruppo: se manca il set nuovo prende quello dell'origine (copia) o nessuno (vuota); '' = Senza gruppo */
function creaTrainingSet(nome, sorgente, gruppo){ const s=ensureSets(); nome=String(nome||'').trim();
  if(!nome || nome===s.setAttivo || s.setsSalvati[nome]) return;
  s.setsSalvati[s.setAttivo]=tsFoto(s);  /* salva l'attivo */
  tsCarica(s, (sorgente && sorgente!=='__vuota__' && s.setsSalvati[sorgente])? s.setsSalvati[sorgente] : {});  /* copia (tipo e gruppo compresi) o vuota */
  if(gruppo!==undefined){ const g=tsGruppoNorm(gruppo)? tsNuovoGruppo(gruppo) : ''; if(g) s.gruppo=g; else delete s.gruppo; }
  s.setAttivo=nome;
  if(s.setsOrdine.indexOf(nome)<0) s.setsOrdine.push(nome);
  persist('scheda'); renderAllenamento(); }
function nuovoTrainingSetModal(){ const s=ensureSets(), fv=tsFiltroGet('pesi'), filtroGr=(fv!==TS_TUTTI && fv!==TS_SENZA)? fv : '';
  const opts='<option value="__vuota__">'+t('Scheda vuota (da zero)')+'</option>'+tsOpzioni(s.setsOrdine, TS_TUTTI, null, t('Copia da:')+' ');
  /* gruppo proposto: quello filtrato nella barra, altrimenti quello del set da cui si copia */
  const grDi=src=>filtroGr || (fv===TS_SENZA || src==='__vuota__'? '' : tsGruppoDi(src));
  modal(`<h3>${t('Nuovo Training Set')}</h3>
    <div class="field" style="margin-top:8px"><label>${t('Nome')}</label><input id="ts-nome" placeholder="${t('es. Casa, Palestra…')}" style="width:100%"></div>
    <div class="field" style="margin-top:8px"><label>${t('Punto di partenza')}</label><select id="ts-src" style="width:100%">${opts}</select></div>
    <div class="field" style="margin-top:8px"><label>${t('Gruppo (facoltativo)')}</label><select id="ts-gr" style="width:100%" title="${t('I gruppi servono solo a ordinare e cercare i Training Set: non cambiano nessun calcolo')}">${tsOpzioniGruppo(grDi(s.setAttivo))}</select>
      <input id="ts-gr-nuovo" placeholder="${t('Nome del gruppo nuovo, es. Corpo libero')}" style="width:100%;margin-top:6px" hidden></div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">${t('Annulla')}</button><button class="btn btn--ember" id="ts-ok">${t('Crea')}</button></div>`);
  const src=document.getElementById('ts-src'), gs=document.getElementById('ts-gr'), gn=document.getElementById('ts-gr-nuovo');
  let grToccato=false;
  if(src){ src.value=s.setAttivo; src.onchange=()=>{ if(!grToccato){ gs.value=grDi(src.value); } }; }
  gs.onchange=()=>{ grToccato=true; gn.hidden=gs.value!=='__nuovo__'; if(!gn.hidden){ try{ gn.focus(); }catch(e){} } };
  document.getElementById('ts-ok').onclick=()=>{ const nome=(document.getElementById('ts-nome').value||'').trim();
    if(!nome){ avviso(t('Dai un nome al Training Set.')); return; }
    if(nome===s.setAttivo||s.setsSalvati[nome]){ avviso(t('Esiste già un Training Set con questo nome.')); return; }
    let gruppo=gs.value;
    if(gruppo==='__nuovo__'){ gruppo=tsGruppoNorm(gn.value); if(!gruppo || gruppo===TS_TUTTI || gruppo===TS_SENZA){ avviso(t('Dai un nome al gruppo.')); return; } }
    const sorgente=document.getElementById('ts-src').value; closeModal(); creaTrainingSet(nome, sorgente, gruppo); };
  setTimeout(()=>{ try{ document.getElementById('ts-nome').focus(); }catch(e){} },0); }
function rinominaTrainingSet(){ const s=ensureSets(); const old=s.setAttivo;
  chiediTesto(t('Rinomina Training Set'), old, nome=>{ nome=(nome||'').trim(); if(!nome||nome===old) return;
    if(s.setsSalvati[nome]){ avviso(t('Esiste già un Training Set con questo nome.')); return; }
    s.setAttivo=nome; s.setsOrdine=s.setsOrdine.map(n=>n===old?nome:n); persist('scheda'); renderAllenamento(); }); }
async function eliminaTrainingSet(){ const s=ensureSets(); const nomi=s.setsOrdine;
  if(nomi.length<=1){ avviso(t('Deve restare almeno un Training Set.')); return; }
  const vitt=s.setAttivo;
  if(!await conferma(t('Eliminare il Training Set «')+vitt+t('» e la sua scheda? Operazione irreversibile.'))) return;
  const altro=nomi.find(n=>n!==vitt); tsCarica(s, s.setsSalvati[altro]||{});
  delete s.setsSalvati[altro]; delete s.setsSalvati[vitt];
  s.setAttivo=altro; s.setsOrdine=nomi.filter(n=>n!==vitt); persist('scheda'); renderAllenamento(); }
/* ── riquadro «Training Set e gruppi» (menù Training Set › Gestisci i gruppi…): cerca per nome,
      filtra per gruppo, apre un set, lo mette in un gruppo
      (esistente o nuovo), crea, rinomina e toglie i gruppi. Si ridisegna solo l'elenco, così la
      casella di ricerca non perde il punto di scrittura; nomi nuovi e rinomine si scrivono nella
      riga stessa (chiediTesto chiuderebbe il riquadro). Il filtro è quello della barra Pesi. ── */
let _tsm=null;   /* {cerca, ed}: ed = null | {tipo:'nuovo'} | {tipo:'rin', g} | {tipo:'set', n} */
function tsGruppiModal(){ ensureSets(); _tsm={cerca:'', ed:null};
  modal(`<h3>${t('Training Set e gruppi')}</h3>
    <div class="muted tsm-nota">${t('I gruppi servono solo a ordinare, filtrare e cercare i Training Set: non cambiano nessun calcolo. Un set senza gruppo sta in «Senza gruppo».')}</div>
    <div class="tsm-barra">
      <div class="field tsm-cerca"><label>${t('Cerca')}</label><input id="tsm-cerca" type="search" autocomplete="off" placeholder="${t('Nome del Training Set…')}"></div>
      <div class="field"><label>${t('Gruppo')}</label><select id="tsm-filtro"></select></div>
      <button class="btn" id="tsm-nuovo">${ico('piu')}${t('Nuovo gruppo')}</button>
    </div>
    <div id="tsm-lista" class="tsm-lista"></div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">${t('Chiudi')}</button></div>`);
  const m=document.getElementById('modal'); if(m) m.style.maxWidth='660px';
  const ce=document.getElementById('tsm-cerca');
  ce.oninput=()=>{ _tsm.cerca=ce.value; tsmDisegna(); };
  ce.onkeydown=e=>{ if(e.key!=='Enter') return; e.preventDefault();
    const trovati=[].concat(...tsPerGruppo(ensureSets().setsOrdine,{filtro:tsFiltroGet('pesi'), cerca:_tsm.cerca}).map(b=>b.nomi));
    if(trovati.length===1) tsmApri(trovati[0]); };
  document.getElementById('tsm-filtro').onchange=e=>{ tsFiltroSet('pesi', e.target.value); tsmDisegna(); renderAllenamento(); };
  document.getElementById('tsm-nuovo').onclick=()=>{ _tsm.ed={tipo:'nuovo'}; tsmDisegna(); };
  tsmDisegna();
  setTimeout(()=>{ try{ ce.focus(); }catch(e){} },0); }
function tsmApri(n){ closeModal(); _tsm=null; if(n!==ensureSets().setAttivo) switchTrainingSet(n); }
function tsmSalva(){ persist('scheda'); renderAllenamento(); tsmDisegna(); }
function tsmDisegna(){
  const box=document.getElementById('tsm-lista'); if(!box || !_tsm) return;
  const s=ensureSets(), fv=tsFiltroGet('pesi'), ed=_tsm.ed||{};
  const fs=document.getElementById('tsm-filtro'); if(fs) fs.innerHTML=tsOpzioniFiltro(fv, s.setsOrdine);
  const scrivi=(val,ph)=>`<span class="tsm-ed"><input id="tsm-in" value="${esc(val||'')}" placeholder="${esc(ph||'')}" autocomplete="off">`+
    `<button class="btn btn--sm btn--ember" data-tsm-ok>${t('OK')}</button><button class="btn btn--sm" data-tsm-annulla>${t('Annulla')}</button></span>`;
  const bl=tsPerGruppo(s.setsOrdine,{filtro:fv, cerca:_tsm.cerca, vuoti:true});
  let h=ed.tipo==='nuovo'? `<div class="tsm-gr"><div class="tsm-gr__tit">${scrivi('',t('Nome del gruppo nuovo, es. Corpo libero'))}</div></div>` : '';
  bl.forEach(b=>{
    const tit=(ed.tipo==='rin' && ed.g===b.gruppo)? scrivi(b.gruppo,'')
      : `<b>${esc(b.gruppo||t('Senza gruppo'))}</b><span class="pill">${b.nomi.length}</span>`+(b.gruppo?
        `<span class="spacer"></span><button class="btn btn--sm" data-tsm-rin="${esc(b.gruppo)}">${ico('matita','p')}${t('Rinomina')}</button>`+
        `<button class="btn btn--sm btn--danger" data-tsm-togli="${esc(b.gruppo)}" title="${t('I suoi Training Set restano e passano a «Senza gruppo»')}">${ico('x','p')}${t('Togli il gruppo')}</button>` : '');
    const righe=b.nomi.map(n=>{ const att=n===s.setAttivo, o=att? s : s.setsSalvati[n], tipo=o && TIPI_ALLEN.includes(o.tipoAllenamento)? t(TIPO_NOME[o.tipoAllenamento]) : '';
      const sp=(ed.tipo==='set' && ed.n===n)? scrivi('',t('Nome del gruppo nuovo, es. Corpo libero'))
        : `<select data-tsm-set="${esc(n)}" title="${t('Metti questo Training Set in un gruppo')}">${tsOpzioniGruppo(tsGruppoDi(n))}</select>`;
      return `<div class="tsm-riga${att?' is-att':''}"><button class="tsm-nome" data-tsm-apri="${esc(n)}" title="${att?t('È il Training Set aperto nella scheda Pesi'):t('Apri questo Training Set nella scheda Pesi')}">${esc(n)}</button>`+
        `${att?`<span class="pill">${t('aperto')}</span>`:''}${tipo?`<span class="tsm-tipo">${esc(tipo)}</span>`:''}<span class="spacer"></span>${sp}</div>`; }).join('')
      || `<div class="tsm-vuoto">${t('Nessun Training Set in questo gruppo: mettilo qui dal menù accanto a un set.')}</div>`;
    h+=`<div class="tsm-gr"><div class="tsm-gr__tit">${tit}</div>${righe}</div>`; });
  if(!bl.length) h+=`<div class="tsm-vuoto">${tsNormCerca(_tsm.cerca).trim()? t('Nessun Training Set con questo nome.') : t('Nessun Training Set in questo gruppo.')}</div>`;
  box.innerHTML=h;
  const q=sel=>box.querySelectorAll(sel);
  q('[data-tsm-apri]').forEach(b=>b.onclick=()=>tsmApri(b.dataset.tsmApri));
  q('[data-tsm-set]').forEach(sl=>sl.onchange=()=>{ const n=sl.dataset.tsmSet;
    if(sl.value==='__nuovo__'){ _tsm.ed={tipo:'set', n}; tsmDisegna(); return; }
    tsAssegnaGruppo(n, sl.value); tsmSalva(); });
  q('[data-tsm-rin]').forEach(b=>b.onclick=()=>{ _tsm.ed={tipo:'rin', g:b.dataset.tsmRin}; tsmDisegna(); });
  q('[data-tsm-togli]').forEach(b=>b.onclick=async()=>{ const g=b.dataset.tsmTogli, n=ensureSets().setsOrdine.filter(x=>tsGruppoDi(x)===g).length;
    if(!await conferma(t('Togliere il gruppo «')+g+'»? '+(n? (n+' '+(n===1? t('Training Set resta e passa a «Senza gruppo».') : t('Training Set restano e passano a «Senza gruppo».'))) : t('Il gruppo è vuoto.')), {titolo:t('Togli il gruppo'), testoOk:t('Togli il gruppo')})) return;
    tsTogliGruppo(g); tsmSalva(); });
  q('[data-tsm-annulla]').forEach(b=>b.onclick=()=>{ _tsm.ed=null; tsmDisegna(); });
  q('[data-tsm-ok]').forEach(b=>b.onclick=tsmConferma);
  const inp=document.getElementById('tsm-in');
  if(inp){ inp.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); tsmConferma(); } else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); _tsm.ed=null; tsmDisegna(); } };
    /* fuoco SUBITO, non in un setTimeout: chi scrive appena dopo il clic perdeva le prime lettere */
    try{ inp.focus(); inp.select(); }catch(e){} }
}
/* OK della riga in scrittura: gruppo nuovo, rinomina, o set messo in un gruppo nuovo */
function tsmConferma(){ if(!_tsm || !_tsm.ed) return; const ed=_tsm.ed, inp=document.getElementById('tsm-in');
  const g=tsGruppoNorm(inp? inp.value : '');
  if(!g || g===TS_TUTTI || g===TS_SENZA){ avviso(t('Dai un nome al gruppo.')); return; }
  if(ed.tipo==='nuovo'){ if(tsGruppoEsistente(g)){ avviso(t('Esiste già un gruppo con questo nome.')); return; } tsNuovoGruppo(g); }
  else if(ed.tipo==='rin'){ if(!tsRinominaGruppo(ed.g, g)){ avviso(t('Esiste già un gruppo con questo nome.')); return; } }
  else if(ed.tipo==='set'){ tsAssegnaGruppo(ed.n, g); }
  _tsm.ed=null; tsmSalva(); }
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
  if(!n){ avviso(t('Nessuno storico da cui precompilare.')); return; }
  persist('scheda'); renderAllenamento(); }
/* ── Co-pilota LED passivo: pallino 🟢/🟡/🔴 accanto al Peso digitato. Confronta il peso
   col set di pari posizione della scorsa scheda (come ΔTL set) e pesa i segnali di
   affaticamento (ACWR, monotonia, RIR). SOLO visivo: nessuna scrittura automatica.
   Soglie (concordate con Marco): 🟢 −5%…+10% · 🟡 +10%…+20% / calo oltre −5% / aumento con
   RIR≤1 / monotonia alta · 🔴 oltre +20% o aumento con ACWR>1.5 (meglio scaricare). */
const CARICO_COL={ok:'var(--ok)',warn:'var(--warn)',danger:'var(--danger)'};
function caricoSignals(){
  const ag=schedeAggr(); const acwr=acwrUltimo(ag);
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
/* pallino reso in fondo alla cella esercizio (flex con gap): niente margine */
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
       ${tendinaPulsante('training-set', S.setAttivo, S.setAttivo, tsGruppoDi(S.setAttivo), t('Loadout della scheda: crea più schede (es. Palestra, Casa) e passa dall\'una all\'altra. Apri il menù per crearne, cercarle, raggrupparle, rinominarle o eliminarle'))}</div>
     <div class="field"><label>${t('Tipo di allenamento')}</label>
       <select id="tipo-allen" title="${t('Tipo di allenamento di questo Training Set: sceglie il riferimento della ragnatela «distribuzione fra i gruppi»')}"><option value="">—</option>${TIPI_ALLEN.map(x=>`<option value="${x}"${S.tipoAllenamento===x?' selected':''}>${esc(t(TIPO_NOME[x]))}</option>`).join('')}</select></div>
     <button class="btn btn--ember" id="btn-warm" title="${t('Apri i riscaldamenti giorno per giorno di questo Training Set')}">${pesiView==='riscaldamento'?(ico('indietro')+t('Scheda')):(ico('fiamma')+t('Riscaldamento'))}</button>`; }
function wireBarSelettori(){
  const sm=document.getElementById('sched-mode'); if(sm) sm.onchange=e=>{schedaMode=e.target.value; renderAllenamento();};
  tendinaLega(document.getElementById('training-set'), tsTendinaCfg);
  { const ta=document.getElementById('tipo-allen');
    if(ta) ta.onchange=e=>{ const v=e.target.value; if(TIPI_ALLEN.includes(v)) DOC.scheda.tipoAllenamento=v; else delete DOC.scheda.tipoAllenamento;
      persist('scheda'); renderAllenamento(); }; }
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
        /* il ▶ sta ACCANTO al nome, non sotto: su una riga di riscaldamento la seconda
           riga faceva crescere la tabella per un solo bottoncino */
        `<td class="l"><div class="warm-cell"><span class="drag-h no-print" title="${t('trascina per spostare')}">⠿</span><button type="button" class="cell-in txt warm-pick" style="min-width:130px;flex:1;text-align:left;cursor:pointer">${r.esercizio?esc(exName(r.esercizio)):`<span class="muted">${t('＋ scegli esercizio')}</span>`} <span style="opacity:.55;display:inline-flex">${ico('giu','p')}</span></button>`+
          (videoOf(r.esercizio)?`<button class="vidbtn no-print" data-vid="${esc(r.esercizio)}" title="${t('Guarda il video')}">${ico('play','p')}</button>`:'')+`</div></td>`+
        `<td>${aTempo?`<span class="muted">—</span>`:`<input class="cell-in" data-wf="serie" type="number" min="0" step="1" value="${r.serie??''}" style="width:52px">`}</td>`+
        `<td>${aTempo?`<span class="muted">—</span>`:`<input class="cell-in" data-wf="rip" type="number" min="0" step="1" value="${r.rip??''}" style="width:56px">`}</td>`+
        `<td><input class="cell-in" data-wf="min" type="number" min="0" step="1" value="${r.min??''}" style="width:58px" placeholder="–" title="${t('Durata in minuti (per cardio e per gli esercizi a tempo)')}"></td>`+
        `<td><input class="cell-in" data-wf="note" value="${esc(r.note||'')}" style="width:100%"></td>`+
        `<td><button class="btn btn--sm btn--danger no-print" data-wdel="${i}" title="${t('elimina')}">${ico('x','p')}</button></td></tr>`; });
    content+=`<div class="sec">${esc(giornoNome(g))}</div>
      <div class="tbl-wrap"><table>
        <thead><tr><th class="l">${t('Esercizio')}</th><th>${t('Serie')}</th><th>${t('Rip.')}</th><th>${t('Min')}</th><th class="l">${t('Note')}</th><th></th></tr></thead>
        <tbody>${body||`<tr><td colspan="6" class="empty">${t('Nessun esercizio di riscaldamento per questo giorno.')}</td></tr>`}</tbody>
      </table></div>
      <button class="btn btn--sm no-print" data-waddday="${esc(g)}">${t('＋ riscaldamento')}</button>`;
  });
  document.getElementById('panel-allenamento').innerHTML=`
   <div class="bar bar--bottom no-print">${barSelettori(S)}<div class="spacer"></div></div>
   <div class="callout callout--info"><div>${t('<b>Riscaldamento</b> del Training Set «')}${esc(S.setAttivo)}${t('». Scegli esercizi di <b>stretching</b> oppure <b>cardio di base</b> (corsa sul tapis roulant, cyclette, ellittica, vogatore…): il cardio non ha serie e ripetizioni, solo i <b>minuti</b>. Il ▶ mostra il video. Serve a prepararsi: <b>non conta nel TL né in alcun calcolo</b>. I giorni sono ripresi dalla scheda.')}</div></div>
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
  abilitaRiordino('wi', riscaldaRows, ()=>renderRiscaldamento(ensureSets()));
}
/* ── COLONNE della scheda Pesi (2026-08-19) ──────────────────────────────────
   La tabella ha 12 colonne e su schermi piccoli si scorre in orizzontale. Qui si
   scelgono quelle da mostrare: la preferenza vive nel profilo (dati_utente), così
   ogni atleta ha la sua. Esercizio/Serie/Rip./Peso e le azioni restano SEMPRE
   visibili: senza quelle la scheda non si compila. Il RIR ha già il suo
   interruttore nel Profilo e non si duplica qui. Nascondere è solo visivo: i
   valori restano calcolati e salvati (e la stampa ha le sue regole). ── */
const COLONNE_PESI=[
  {k:'note', cls:'col-note', lab:'Note'},
  {k:'rest', cls:'col-rest', lab:'Rest'},
  {k:'rm',   cls:'col-rm',   lab:'1RM e %1RM'},
  {k:'tl',   cls:'col-tl',   lab:'TL'},
  {k:'dtl',  cls:'col-dtl',  lab:'Δ TL set'}
];
function colonnePesi(){
  const u=(DOC.dati_utente=DOC.dati_utente||{});
  if(!u.colonnePesi||typeof u.colonnePesi!=='object') u.colonnePesi={};
  return u.colonnePesi;
}
function colonnaPesiVisibile(k){ const v=colonnePesi()[k]; return v===undefined?true:!!v; }  /* di default si vede tutto, come prima */
function classiColonnePesi(){ return COLONNE_PESI.filter(c=>!colonnaPesiVisibile(c.k)).map(c=>'hide-'+c.k).join(' '); }
function colonnePesiModal(){
  modal(`<h3>${t('Colonne della scheda')}</h3>
   <div class="muted" style="font-size:12.5px;margin-bottom:10px">${t('Togli il segno di spunta alle colonne che non guardi: la tabella diventa più stretta e leggibile. I valori restano calcolati e salvati — cambia solo cosa vedi.')}</div>
   ${COLONNE_PESI.map(c=>`<label class="field optchk" style="display:flex;align-items:center;gap:8px;margin:7px 0"><input type="checkbox" data-col="${c.k}"${colonnaPesiVisibile(c.k)?' checked':''}><span>${t(c.lab)}</span></label>`).join('')}
   <div class="modal__actions"><button class="btn" id="col-tutte">${t('Mostra tutte')}</button><button class="btn btn--ember" onclick="closeModal()">${t('Fatto')}</button></div>`);
  const applica=()=>{ persist('corpo'); renderAllenamento(); };
  document.querySelectorAll('#modal [data-col]').forEach(ch=>{ ch.onchange=()=>{
    colonnePesi()[ch.dataset.col]=ch.checked; applica();
    const m=document.getElementById('modal'); if(m) colonnePesiModal();   /* ridisegna la scheda sotto, tenendo aperta la scelta */
  }; });
  { const b=document.getElementById('col-tutte'); if(b) b.onclick=()=>{ COLONNE_PESI.forEach(c=>colonnePesi()[c.k]=true); applica(); colonnePesiModal(); }; }
}
/* ── ⚖ BILANCIAMENTO della scheda in costruzione ──────────────────────────────
   Stesso radar di «🕸 Equilibrio volume» in Progressi, ma su ciò che si sta scrivendo
   ADESSO invece che sull'ultima settimana salvata: serve mentre si costruisce, non dopo.
   Il CARDIO è escluso di proposito (richiesta di Marco): qui si guarda come sono
   distribuite le serie coi pesi, e i minuti di cardio — convertiti in serie equivalenti —
   gonfierebbero un asse che non c'entra con l'equilibrio del lavoro in sala pesi.
   Le serie si spalmano sui gruppi con quoteGruppi(): piene ai muscoli primari, mezze ai
   secondari — altrimenti una scheda fatta di spinte e tirate sembra scoprire braccia e
   spalle, che invece lavorano a ogni serie. */
function bilanciamentoSerie(){
  const per={}, D={}, I={}; GRUPPI.filter(g=>g!=='Cardio').forEach(g=>{ per[g]=0; D[g]=0; I[g]=0; });
  const dir={spinta:0, trazione:0}; let tot=0;
  schedaRows().forEach(r=>{ if(!r.esercizio) return;
    if(gruppoOf(r.esercizio)==='Cardio') return;         /* qui si guardano i pesi */
    const ser=+r.serie||0; if(ser<=0) return;
    tot+=ser;
    const acc=accumulaSerie({}, r.esercizio, ser);
    Object.keys(acc.per).forEach(g=>{ if(g in per){ per[g]+=acc.per[g]; D[g]+=acc.D[g]||0; I[g]+=acc.I[g]||0; } });
    const d=direzioneOf(r.esercizio); if(d) dir[d]+=ser;
  });
  return {per:per, D:D, I:I, dir:dir, tot:tot};
}
/* mezze serie in giro: 12 resta «12», 12,5 non diventa «12.5» */
function bilNum(v){ const x=Math.round(v*10)/10; return x===Math.round(x)? String(x) : String(x).replace('.',','); }
/* righe «gruppo · barra sulla sua zona utile · serie», dalla più alla meno allenata (usate
   dal riquadro ⚖ e dai pannelli laterali). Con `di` ({D,I}: serie dirette e indirette) la
   barra si divide in due: piena la parte che viene dalle serie dirette, chiara quella che
   viene dalle indirette — così si vede quanto del numero è lavoro «di striscio». */
function bilRigheHTML(per, di){
  const p=pesiSerie();
  return Object.keys(per).sort((a,b)=>per[b]-per[a]).map(g=>{
    const v=per[g], rf=RIF_GRUPPO[g], scala=Math.max(v, rf.max)||1;
    const q=Math.round(v/scala*100), qmin=Math.round(rf.min/scala*100), qmax=Math.round(rf.max/scala*100);
    const fuori=(v<rf.sotto||v>rf.sopra);
    let barra=`<span class="bil-fill" style="width:${q}%;background:${v?'var(--orange)':'transparent'}"></span>`, tip=t('zona utile')+' '+rf.min+'-'+rf.max;
    if(di&&di.D){ const d=di.D[g]||0, i=di.I[g]||0, qd=v? (d*p.d)/v*q : 0;
      barra=`<span class="bil-fill" style="width:${qd.toFixed(1)}%;background:${v?'var(--orange)':'transparent'}"></span><span class="bil-fill bil-ind" style="width:${Math.max(q-qd,0).toFixed(1)}%"></span>`;
      tip=bilNum(d)+' '+t('dirette')+' ×'+nfPeso(p.d)+' + '+bilNum(i)+' '+t('indirette')+' ×'+nfPeso(p.i)+' = '+bilNum(v)+' · '+tip; }
    return `<div class="bil-riga${fuori?' is-fuori':''}" title="${esc(tip)}">
      <span class="bil-nome">${esc(t(g))}</span>
      <span class="bil-barra"><span class="bil-zona" style="left:${qmin}%;width:${Math.max(qmax-qmin,1)}%"></span>${barra}</span>
      <span class="bil-val mono">${bilNum(v)}</span></div>`; }).join('');
}
/* legenda della barra divisa e avviso se i pesi non sono quelli su cui sono tarate le zone */
function bilLegendaDI(){ const p=pesiSerie();
  return `<div class="bil-leg"><span><i class="bil-leg-d"></i>${t('dirette')} ×${nfPeso(p.d)}</span><span><i class="bil-leg-i"></i>${t('indirette')} ×${nfPeso(p.i)}</span><span class="pill rif-provv">${t('pesi provvisori')}</span></div>`+
    (pesiPredefiniti(p)? '' : `<div class="lat-nota">${t('Le zone utili sono tarate col conteggio predefinito (catalogo TMS, 1,0 / 0,5): con pesi diversi leggile con prudenza.')}</div>`); }
function verdettoDir(sp,tr){ return (!sp&&!tr) ? '' : (tr<sp*0.8 ? t('poca trazione') : sp<tr*0.6 ? t('poca spinta') : t('in equilibrio')); }
/* ── PANNELLO LATERALE DELLA SCHEDA (2026-11, schermo intero) ─────────────────────
   Mentre si scrive la scheda, a fianco si vede COME sta venendo: la forma (ragnatela della
   distribuzione fra i gruppi), la quantità (serie per gruppo sulla loro zona utile), spinta
   contro trazione, com'è ripartito il lavoro fra i giorni e in che fasce di intensità cade.
   Sono gli stessi calcoli del riquadro ⚖ Bilanciamento e dei Progressi, ma sulla scheda in
   scrittura e aggiornati a ogni tasto. Sola lettura: non salva e non cambia nulla. */
const FASCE_ORD=['Forza','Forza+Iper','Ipertrofia','Resistenza','Metabolico'];
const FASCE_COL={'Forza':'var(--c-rosso)','Forza+Iper':'var(--c-arancio)','Ipertrofia':'var(--c-oro)','Resistenza':'var(--c-verde)','Metabolico':'var(--c-viola)'};   /* variabili: di notte si schiariscono */
function pannelloCostruzione(){
  const bil=bilanciamentoSerie(), rows=schedaRows();
  if(!bil.tot) return `<div class="lat"><h4>${t('Come sta venendo la scheda')}</h4><div class="empty">${t('Aggiungi qualche esercizio: qui vedrai in tempo reale com’è distribuito il lavoro fra gruppi muscolari, giorni e intensità.')}</div></div>`;
  const sp=bil.dir.spinta, tr=bil.dir.trazione, totDir=sp+tr;
  /* per giorno: serie, esercizi diversi, TL */
  const gg=schedaDays(rows).map(g=>{ let s=0,tl=0; const n=new Set();
    rows.forEach(r=>{ if(r.giorno!==g||!r.esercizio) return; s+=+r.serie||0; tl+=sTL(r); n.add(r.esercizio); });
    return {g:g,s:s,tl:tl,n:n.size}; });
  const maxTL=Math.max(1,...gg.map(x=>x.tl)), totTL=gg.reduce((a,x)=>a+x.tl,0);
  /* per fascia di intensità: serie */
  const band={}; let conPct=0;
  rows.forEach(r=>{ if(!r.esercizio) return; const p=sPct(r), s=+r.serie||0; if(p&&s){ const fb=fascia(p)[0]; if(fb!=='—'){ band[fb]=(band[fb]||0)+s; conPct+=s; } } });
  const fasceBarra=FASCE_ORD.filter(b=>band[b]).map(b=>`<span style="width:${(band[b]/conPct*100).toFixed(1)}%;background:${FASCE_COL[b]}" title="${esc(t(b))}: ${bilNum(band[b])} ${t('serie')}"></span>`).join('');
  const fasceLeg=FASCE_ORD.filter(b=>band[b]).map(b=>`<span><i style="background:${FASCE_COL[b]}"></i>${esc(t(b))} ${Math.round(band[b]/conPct*100)}%</span>`).join('');
  const rc=rifCalcola();
  return `<div class="lat"><h4>${t('Distribuzione fra i gruppi')} <span class="muted">${t('verde = riferimento scelto')}</span>${spiegaBtn('distribuzione')}</h4>
      ${radarChart(vociDistribuzione(bil.per,bil,rc),{w:360,h:270})}${rifDidascalia(rc,{dopo:'tab'})}</div>
    <div class="lat"><h4>${t('Serie per gruppo')} <span class="muted">${bil.tot} ${t('serie in scheda')}</span>${spiegaBtn('serie-gruppo')}</h4>
      ${bilRigheHTML(bil.per,bil)}${bilLegendaDI()}
      ${totDir?`<div class="lat-num" style="margin-top:8px;border-top:1px solid var(--border);padding-top:7px"><span>${t('Spinta · Trazione')}</span><span><b>${bilNum(sp)} · ${bilNum(tr)}</b> <span class="muted">${esc(verdettoDir(sp,tr))}</span></span></div>
      <div class="lat-barra"><span style="width:${(sp/totDir*100).toFixed(1)}%;background:var(--orange)"></span><span style="width:${(tr/totDir*100).toFixed(1)}%;background:var(--violet)"></span></div>`:''}
      <div class="lat-nota">${t('Serie dirette sui muscoli principali, indirette su quelli coinvolti di striscio. La tacca verde è la zona utile del gruppo; in rosso chi ne è nettamente fuori.')}</div></div>
    <div class="lat"><h4>${t('Carico per giorno')} <span class="muted">TL ${nfk(totTL)}</span>${spiegaBtn('carico-giorno')}</h4>
      <div class="lat-giorni">${gg.map(x=>`<span>${esc(giornoNome(x.g))}</span><span class="lat-barra" style="margin:0"><span style="width:${(x.tl/maxTL*100).toFixed(1)}%;background:var(--orange)"></span></span><span class="mono">${bilNum(x.s)} ${t('serie')} · ${x.n} ${t('es.')} · ${nfk(x.tl)}</span>`).join('')}</div></div>
    ${conPct?`<div class="lat"><h4>${t('Intensità')} <span class="muted">${t('serie per fascia di %1RM')}</span>${spiegaBtn('intensita')}</h4>
      <div class="lat-barra">${fasceBarra}</div><div class="lat-leg">${fasceLeg}</div></div>`:''}`;
}
function bilanciamentoModal(){
  const bil=bilanciamentoSerie(), per=bil.per;
  /* la ragnatela dice la DISTRIBUZIONE (quote %), l'elenco accanto la QUANTITÀ */
  const rc=rifCalcola(), items=vociDistribuzione(per,bil,rc);
  /* la lettura a parole accanto al disegno: il radar dice "che forma ha", la riga
     dice "quante serie" — senza, bisogna stimare a occhio dalla ragnatela */
  /* larghezze fisse e niente a capo: con «21 serie» che si spezzava in due righe le voci
     avevano altezze diverse e le barre non si leggevano più in colonna */
  /* la barra si legge sulla fascia DEL SUO gruppo, non su una scala comune: piena a metà
     vuol dire «a metà della zona utile per questo gruppo», che è la domanda vera. Il
     tratto verde segna dove comincia la fascia. */
  const righe=bilRigheHTML(per,bil);
  /* spinta contro trazione: lo squilibrio più comune, e quello che il radar per gruppi
     non mostra (pettorali e schiena possono pareggiare mentre spalle e tricipiti no) */
  /* soglie asimmetriche: sulle 60 schede equilibrate di riferimento la mediana di spinta
     su trazione è 1,00 (dal 10° al 90° percentile: 0,80-1,32), e le linee guida per la
     spalla consigliano semmai di tirare PIÙ di quanto si spinge. Quindi si segnala presto
     chi spinge troppo, tardi il contrario. */
  const sp=bil.dir.spinta, tr=bil.dir.trazione;
  const verdetto = verdettoDir(sp,tr);
  /* fuori dalla griglia dell'elenco: la colonna dei numeri è larga 42px e la barra alta 9,
     due valori più il verdetto non ci stanno */
  const rigaDir = (sp||tr) ? `<div class="bil-dir">
      <span>${t('Spinta · Trazione')}</span>
      <span><b class="mono">${bilNum(sp)} · ${bilNum(tr)}</b> <span class="muted">${esc(verdetto)}</span></span></div>` : '';
  modal(`<h3>${t('Bilanciamento della settimana')}</h3>
    <div class="muted" style="font-size:12.5px;margin-bottom:8px">${t('Serie per gruppo muscolare nella scheda che stai scrivendo: <b>dirette</b> sui muscoli principali, <b>indirette</b> (mezza serie) su quelli coinvolti di striscio — la panca allena anche spalle e tricipiti. Il <b>cardio è escluso</b>: qui si guarda il lavoro coi pesi.')}</div>
    ${bil.tot? `<div class="bil-wrap">
        <div class="bil-radar">${spiegaBtn('distribuzione','bilanciamento')}${radarChart(items,{w:360,h:290})}${rifDidascalia(rc,{dopo:'bilanciamento'})}</div>
        <div class="bil-lista">
          <div class="bil-riga bil-testa"><span class="bil-nome">${t('Gruppo')}${spiegaBtn('serie-gruppo','bilanciamento',true)}</span><span class="bil-barra"></span><span class="bil-val">${t('serie')}</span></div>
          ${righe}
          ${bilLegendaDI()}
          ${rigaDir}
          <div class="bil-dir"><span>${t('serie in scheda')}</span><span class="mono"><b>${bil.tot}</b></span></div>
        </div>
      </div>
      <div class="bil-nota muted">${t('La <b>ragnatela</b> mostra la <b>distribuzione</b>: quanta parte del lavoro va a ogni gruppo, in percentuale. La fascia verde è il <b>riferimento scelto</b> (scritto sotto il disegno, con quante schede o studi lo reggono): si cambia con Riferimento, per esperienza e tipo di allenamento. Non dipende da quante serie fai: una settimana leggera e una pesante distribuite allo stesso modo hanno lo stesso disegno. L\u2019<b>elenco</b> accanto dice invece la <b>quantità</b>, con le tacche verdi della zona utile di ogni gruppo. In rosso chi ne sta nettamente fuori.')}</div>`
      : `<div class="empty" style="padding:26px">${t('Nessuna serie da mostrare: la scheda è vuota (o contiene solo cardio).')}</div>`}
    <div class="modal__actions"><button class="btn" onclick="closeModal()">${t('Chiudi')}</button></div>`);
  const m=document.getElementById('modal'); if(m) m.style.maxWidth='720px';
}
function renderAllenamento(){
  const S=ensureSets();
  if(pesiView==='riscaldamento'){ renderRiscaldamento(S); return; }
  const rows=schedaRows();
  const smap=sedutaMap(rows);
  /* il TL totale conta tutto; il Δ confronta lo STESSO perimetro sui due lati: i test ★
     sono esclusi dalla settimana salvata, quindi anche da quella in scrittura */
  let totTL=0, totTLnoTest=0; rows.forEach(r=>{ const x=sTL(r); totTL+=x; if(!r.test) totTLnoTest+=x; });
  const prevTotal=tlUltimaScheda();
  const deltaW=prevTotal>0? (totTLnoTest/prevTotal-1):null;
  let body='', lastDay=null; const blockSeen={}, setIdx={}, lastSetsCache={}, lastPesiCache={}, lpCache={};
  const sigCarico=caricoSignals();
  rows.forEach((r,i)=>{
    if(r.giorno && r.giorno!==lastDay){ lastDay=r.giorno;
      const fcS=(DOC.scheda.fcSedute||{})[r.giorno];
      body+=`<tr class="day-sep"><td colspan="12">▌ ${esc(giornoNome(r.giorno))}${useRpeActive()?rpeDayControls(r.giorno):''}${fcS?`<span class="fc-sed" style="float:right;display:inline-flex;gap:6px;align-items:center;font-weight:400;margin-right:10px">${sedutaFcPill(fcS, `data-fcsp="${esc(r.giorno)}"`)}</span>`:''}</td></tr>`; }
    const sd=rowSeduta(smap,r), bk=r.esercizio+'|'+sd;
    const firstOfBlock=r.esercizio && !blockSeen[bk]; if(r.esercizio) blockSeen[bk]=true;
    const m=rmMostrato(r), p=sPct(r), tl=sTL(r);
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
    /* esercizio a corpo libero: nella colonna Peso va SOLO la zavorra, il corpo lo somma
       l'app nei calcoli — va detto, altrimenti «Peso 0» con un TL alto sembra un errore */
    const clibQ=quotaCorpo(r.esercizio), clib=clibQ>0, clibKg=clib?pesoCorpoScheda(0)*clibQ:0;
    /* con quota parziale (leg raise) la pillola dice quanto corpo entra DAVVERO e in che
       proporzione, altrimenti «+29 kg» su un peso di 73 sembrerebbe un errore */
    const clibTip= clibQ>=1? t('A corpo libero: al peso scritto (la zavorra) si somma il tuo peso corporeo per 1RM, TL e record. Lo aggiorni dal tab Corpo.')
      : t('Solleva solo una parte del corpo: al peso scritto si somma il')+' '+Math.round(clibQ*100)+'% '+t('del tuo peso corporeo (massa delle gambe, tabelle di de Leva; a ginocchia piegate la leva conta meno). Lo aggiorni dal tab Corpo.');
    body+=`<tr data-i="${i}"${r.test?' style="background:rgba(122,62,168,.07)"':''}>
      <td class="l"><div class="ex-cell"><span class="drag-h no-print" title="${t('trascina per spostare')}">⠿</span><button type="button" class="cell-in txt ex-pick" style="min-width:150px;flex:1;text-align:left;cursor:pointer">${r.esercizio?esc(exName(r.esercizio)):`<span class="muted">${t('＋ scegli esercizio')}</span>`} <span style="opacity:.55;display:inline-flex">${ico('giu','p')}</span></button>${sdBadge}</div>
        <div class="ex-sub-row">${videoOf(r.esercizio)?`<button class="vidbtn no-print" data-vid="${esc(r.esercizio)}" title="${t('Guarda il video')}">${ico('play','p')}</button>`:''}${(()=>{const lp=lastPerf(r.esercizio);return lp?`<span class="muted" style="font-size:10px;line-height:1.2" title="${t('ultima registrazione (scheda')} ${lp.scheda})">${t('ult:')} ${nf(lp.peso,1)}×${nf(lp.rip,0)}${(lp.rir!==''&&lp.rir!=null)?(' · RIR '+lp.rir):''}</span>`:'';})()}${clib?`<span class="pill" style="font-size:9.5px;padding:1px 7px;white-space:nowrap" title="${esc(clibTip)}">${ico('corpo','p')} +${nf(clibKg,0)} kg${clibQ<1?` <span style="opacity:.7">(${Math.round(clibQ*100)}%)</span>`:''}</span>`:''}<span style="flex:1"></span>${caricoLedHTML(ledCarico)}</div></td>
      <td class="l col-note"><textarea class="cell-in txt note-area" data-f="note" placeholder="${t('note')}" style="min-width:90px">${esc(r.note||'')}</textarea></td>
      <td><input class="cell-in" type="number" min="0" value="${r.serie??''}" data-f="serie" style="width:48px"></td>
      <td><input class="cell-in" type="number" min="0" value="${r.rip??''}" data-f="rip" style="width:52px"></td>
      <td><input class="cell-in" type="number" min="0" step="0.5" value="${r.peso??''}" data-f="peso" style="width:60px"${clib?` placeholder="0" title="${esc(t('Solo la zavorra: 0 = a corpo libero. Il peso del corpo lo somma l’app nei calcoli.'))}"`:''}></td>
      <td class="rir-col"><input class="cell-in" type="number" min="0" max="10" value="${r.rir??''}" data-f="rir" style="width:42px" placeholder="–" title="Reps In Reserve · RPE=10−RIR"></td>
      <td class="col-rest"><input class="cell-in" value="${esc(r.rest||'')}" data-f="rest" style="width:54px" placeholder="m:ss"></td>
      <td class="cell-calc num col-rm"${clib?` title="${esc(t('Massimale stimato come ZAVORRA: quanto potresti appenderti per una ripetizione singola (il peso del corpo è già scontato).'))}"`:''}>${m?nf(m,1):'—'}</td>
      <td class="cell-calc num col-rm">${p?nf(p,1):'—'}</td>
      <td class="cell-out num col-tl">${tl?nfk(tl):'—'}</td>
      <td class="col-dtl num ${dperc==null?'muted':dperc>=0?'delta-up':'delta-dn'}" title="${t('Δ TL del set vs il set di pari posizione della scorsa scheda')}">${dperc==null?'—':(dperc>=0?'▲':'▼')+' '+nf(Math.abs(dperc)*100,1)+'%'}</td>
      <td style="white-space:nowrap"><span class="fascia ${fc}">${t(fl)}</span>
        <button class="btn btn--sm no-print" data-set="${i}" title="${t('aggiungi un set a questo esercizio')}">${t('＋set')}</button>
        <button class="btn btn--sm no-print" data-test="${i}" title="${t('segna/togli test 1RM (escluso dalla progressione)')}" style="${r.test?'color:var(--violet);border-color:var(--violet)':''}">${ico('stella',r.test?'p pieno':'p')}</button>
        <button class="btn btn--sm btn--danger no-print" data-del="${i}" title="${t('elimina')}">${ico('x','p')}</button></td>
    </tr>`;
  });
  document.getElementById('panel-allenamento').innerHTML=`
   <div class="bar bar--bottom no-print">${barSelettori(S)}
     <div class="spacer"></div>
     <button class="btn" id="btn-addrow">${t('＋ Esercizio')}</button>
     <button class="btn" id="btn-addday">${t('＋ Giorno')}</button>
     <button class="btn" id="btn-prefill" title="${t('Riprendi peso/rip/RIR dalla scorsa registrazione')}">${ico('copia')}${t('Dalla scorsa')}</button>
     <button class="btn btn--ember" id="btn-save-sched">${ico('salva')}${t('Salva nello Storico')}</button>
   </div>
   <div class="pag"><div class="pag__main">
   ${statusBanner(DOC.storico,'Storico allenamento')}
   ${telRigaPesi()}
   ${avvisoGiorni()}
   <div class="sec">${t('Scheda '+schedaMode)} <span class="pill">${rows.length} ${t('righe-set')}</span><span class="pill" id="hdr-tottl" style="margin-left:6px">${t('TL totale')} ${nfk(totTL)}</span><span id="hdr-delta">${deltaW==null?'':`<span class="pill" style="margin-left:6px;border-color:${deltaW>=0?'var(--ok)':'var(--danger)'};color:${deltaW>=0?'var(--ok)':'var(--danger)'}">Δ ${t(schedaMode==='mensile'?'mese':'settimana')} ${deltaW>=0?'▲':'▼'} ${nf(Math.abs(deltaW)*100,1)}%</span><span class="pill muted" style="margin-left:6px" title="${t('TL totale ultima scheda salvata')}">${t('ultima')} ${nfk(prevTotal)}</span>`}</span><button class="btn btn--sm no-print" id="btn-colonne" style="margin-left:auto" title="${t('Scegli quali colonne mostrare')}">${ico('colonne')}${t('Colonne')}</button></div>
   <div class="tbl-wrap"><table class="${useRirActive()?'':'hide-rir'} ${classiColonnePesi()}">
     <thead><tr><th class="l">${t('Esercizio')}</th><th class="l col-note">${t('Note')}</th><th>${t('Serie')}</th><th>${t('Rip.')}</th><th>${t('Peso')}</th><th class="rir-col" title="Reps In Reserve (RPE=10−RIR)">RIR</th><th class="col-rest">${t('Rest')}</th><th class="col-rm">1RM</th><th class="col-rm">%1RM</th><th class="col-tl">TL</th><th class="col-dtl" title="${t('Δ del carico del set vs lo stesso set (pari posizione) della scorsa scheda')}">Δ TL set</th><th>${t('Fascia / azioni')}</th></tr></thead>
     <tbody>${body||`<tr><td colspan="12" class="empty"><span class="empty__ico">${ico('manubrio')}</span>${t('<b>La scheda è vuota.</b><br>Aggiungi il primo esercizio: scegli il giorno e poi l\'esercizio dal catalogo.')}<br><button class="btn btn--ember" onclick="aggiungiEsercizioModal()">${t('＋ Aggiungi il primo esercizio')}</button></td></tr>`}</tbody>
   </table></div>
   <div class="callout callout--info"><div>${t('<b>1RM</b>=Peso·(1+Rip/30) · <b>%1RM</b>=Peso/1RM · <b>TL</b>=Serie·Rip·Peso·(%1RM/100)·Fattore · <b>ΔTL set</b>: ogni set confrontato col set di pari posizione (1° vs 1°, 2° vs 2°…) della stessa seduta nella scorsa scheda. Ripeti lo stesso esercizio con <b>＋set</b> per i set incrementali; se compare in un secondo giorno della settimana diventa automaticamente <b>S2</b>. <b></b>=test 1RM (escluso dalla progressione). Il <b>pallino</b> nella cella dell\'esercizio è un suggerimento del co-pilota sul Peso (<span style="color:var(--ok)"></span> progressione sensata · <span style="color:var(--warn)"></span> attenzione · <span style="color:var(--danger)"></span> salto troppo grande o meglio scaricare): passaci sopra per il perché. <b>Non scrive nulla</b>, decidi tu.')}</div></div>
   </div><aside class="pag__side no-print" id="pesi-side">${pannelloCostruzione()}</aside></div>`;
  wireBarSelettori();
  // auto-resize note textareas
  /* oninput (non addEventListener): il pannello resta lo stesso a ogni ridisegno, e con
     addEventListener si accumulava un ascoltatore in più a ogni render */
  document.getElementById('panel-allenamento').oninput=e=>{
    if(e.target.classList.contains('note-area')){
      e.target.style.height='auto';
      e.target.style.height=e.target.scrollHeight+'px';
    }
  };
  // init height on existing note textareas
  document.querySelectorAll('.note-area').forEach(t=>{ t.style.height='auto'; t.style.height=t.scrollHeight+'px'; });
  { const b=document.getElementById('btn-colonne'); if(b) b.onclick=colonnePesiModal; }
  { const b=document.getElementById('btn-rinumera'); if(b) b.onclick=()=>{ if(rinumeraGiorni()){ persist('scheda'); renderAllenamento(); } }; }
  document.getElementById('btn-addrow').onclick=aggiungiEsercizioModal;
  document.getElementById('btn-addday').onclick=addDay;
  { const pf=document.getElementById('btn-prefill'); if(pf) pf.onclick=async()=>{ if(await conferma(t('Precompilo peso/rip/RIR dalla scorsa registrazione di ogni esercizio? Sovrascrive i valori attuali della scheda.'))) prefillFromLast(); }; }
  document.getElementById('btn-save-sched').onclick=saveSchedaModal;
  telAggancia();
  /* anche le textarea: la Nota è una <textarea>, e con il solo selettore «input» ciò che
     si digitava lì non arrivava mai ai dati (restava a video fino al ridisegno successivo) */
  document.querySelectorAll('#panel-allenamento input, #panel-allenamento textarea').forEach(inp=>{
    inp.addEventListener('input',e=>{
      const tr=e.target.closest('tr'); if(!tr||tr.dataset.i==null)return; const i=+tr.dataset.i; const f=e.target.dataset.f;
      if(!f||!schedaRows()[i]) return;
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
  document.querySelectorAll('#panel-allenamento [data-fcsp]').forEach(b=>b.onclick=()=>sedutaFcModal((DOC.scheda.fcSedute||{})[b.dataset.fcsp], giornoNome(b.dataset.fcsp)));
  document.querySelectorAll('#panel-allenamento [data-vid]').forEach(b=>b.onclick=()=>playVideo(b.dataset.vid));
  document.querySelectorAll('#panel-allenamento .ex-pick').forEach(b=>b.onclick=()=>{
    const tr=b.closest('tr'); const i=+tr.dataset.i;
    pickExercise(schedaRows()[i].esercizio, nome=>{ schedaRows()[i].esercizio=nome; persist('scheda'); renderAllenamento(); }, e=>!isCardio(e)&&!isStretching(e)); });
  document.querySelectorAll('#panel-allenamento [data-set]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.set, r=schedaRows()[i];
    schedaRows().splice(i+1,0,{giorno:r.giorno,esercizio:r.esercizio,note:'',serie:r.serie,rip:r.rip,peso:r.peso,rest:r.rest}); persist('scheda'); renderAllenamento(); });
  document.querySelectorAll('#panel-allenamento [data-test]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.test; schedaRows()[i].test=!schedaRows()[i].test; persist('scheda'); renderAllenamento(); });
  document.querySelectorAll('#panel-allenamento [data-del]').forEach(b=>b.onclick=()=>{ schedaRows().splice(+b.dataset.del,1); persist('scheda'); renderAllenamento(); });
  abilitaRiordino('i', schedaRows, renderAllenamento);
  updateStatusDots();
  document.querySelectorAll('.note-area').forEach(t=>{ t.style.height='auto'; t.style.height=t.scrollHeight+'px'; });
}
let rerenderT=null; /* timer condiviso del re-render ritardato (usato da Pesi e Alimentazione) */
/* TL (senza test ★) dell'ultima settimana salvata: il termine di confronto del Δ settimana */
function tlUltimaScheda(){ let mx=0; DOC.storico.forEach(r=>{ const s=+r.scheda||0; if(s>mx) mx=s; });
  return mx? DOC.storico.filter(r=>(+r.scheda)===mx&&!r.test).reduce((a,r)=>a+sTL(r),0) : 0; }
/* settimana ISO precedente. Passa dalle date: l'anno ISO può avere 53 settimane (il 2026
   le ha), e «anno prima, settimana 52» saltava la 53 — a gennaio l'avviso «manca la
   settimana precedente» guardava quella sbagliata. */
function weekPrev(code){ code=+code||0; const a=Math.floor(code/100), s=code%100;
  if(!a||s<1||s>53) return code;
  const d=isoWeekMonday(a,s); d.setUTCDate(d.getUTCDate()-7);
  const w=isoWeek(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return schedaCode(w.anno,w.sett); }
function aggStatus(arr){ const codes=(arr||[]).map(r=>+r.scheda||0).filter(x=>x>0);
  const last=codes.length?Math.max(...codes):0; const w=isoWeek(new Date()); const cur=schedaCode(w.anno,w.sett); const prev=weekPrev(cur);
  return {ok:last>=prev, last, cur, prev}; }
/* «202619» da solo non dice quando: accanto al codice va la data del lunedì di quella settimana */
function settConData(code){ return code+' <span style="font-weight:400;opacity:.8">· '+esc(schedaLabel(code))+'</span>'; }
function statusBanner(arr,label){ const s=aggStatus(arr);
  if(s.ok) return `<div class="callout no-print" style="margin:0 0 12px;background:var(--ok-t);border-color:#bcdcc6">${ico('check','ok')}<div><b>${t(label)} ${t('aggiornato')}</b> · ${t('ultima registrazione: settimana')} <b>${settConData(s.last)}</b> (${t('corrente')} ${s.cur}).</div></div>`;
  const what=s.last?`${t('l\'ultima è la settimana')} <b>${settConData(s.last)}</b>`:t('non ci sono ancora registrazioni');
  return `<div class="callout no-print" style="margin:0 0 12px;background:var(--danger-t);border-color:#e6b8b8">${ico('attenzione','err')}<div><b>${t(label)} ${t('da aggiornare')}</b> · ${what}; ${t('manca almeno la settimana precedente')} (<b>${settConData(s.prev)}</b>). ${t('Ricordati di salvare.')}</div></div>`;
}
function updateStatusDots(){ const so=aggStatus(DOC.storico), bo=aggStatus(DOC.storico_io);
  const ds=document.getElementById('dot-storico'), dm=document.getElementById('dot-misure');
  if(ds){ ds.style.color=so.ok?'var(--ok-b)':'var(--danger-b)'; ds.title=so.ok?(t('Storico aggiornato (ultima')+' '+so.last+')'):(t('Storico da aggiornare — manca la settimana')+' '+so.prev); }
  if(dm){ dm.style.color=bo.ok?'var(--ok-b)':'var(--danger-b)'; dm.title=bo.ok?(t('Misure aggiornate (ultima')+' '+bo.last+')'):(t('Misure da aggiornare — manca la settimana')+' '+bo.prev); }
}
function refreshSchedaCalc(){
  const rows=schedaRows(), smap=sedutaMap(rows);
  let totTL=0, totTLnoTest=0; const setIdx={}, lastSetsCache={}, lastPesiCache={}, lpCache={};
  const sigCarico=caricoSignals();
  document.querySelectorAll('#panel-allenamento tbody tr[data-i]').forEach(tr=>{
    const i=+tr.dataset.i, r=rows[i]; if(!r)return; const c=tr.children;
    const m=rmMostrato(r), p=sPct(r), tl=sTL(r), fa=fascia(p);
    totTL+=tl; if(!r.test) totTLnoTest+=tl;
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
  const prevTotal=tlUltimaScheda();
  const deltaW=prevTotal>0?(totTLnoTest/prevTotal-1):null;
  const ht=document.getElementById('hdr-tottl'); if(ht)ht.textContent=t('TL totale')+' '+nfk(totTL);
  { const ps=document.getElementById('pesi-side'); if(ps) ps.innerHTML=pannelloCostruzione(); }   /* il pannello laterale segue ciò che si digita */
  const hd=document.getElementById('hdr-delta'); if(hd)hd.innerHTML=deltaW==null?'':`<span class="pill" style="margin-left:6px;border-color:${deltaW>=0?'var(--ok)':'var(--danger)'};color:${deltaW>=0?'var(--ok)':'var(--danger)'}">Δ ${t(schedaMode==='mensile'?'mese':'settimana')} ${deltaW>=0?'▲':'▼'} ${nf(Math.abs(deltaW)*100,1)}%</span><span class="pill muted" style="margin-left:6px">${t('ultima')} ${nfk(prevTotal)}</span>`;
}
/* ＋ Esercizio: chiede in quale giorno aggiungerlo e lo inserisce in fondo a quel giorno
   (se il giorno non esiste ancora, crea la sezione). */
function aggiungiEsercizioModal(){
  const rows=schedaRows(); const def=(rows.length?rows[rows.length-1].giorno:'')||giornoScheda(1);
  modal(`<h3>${t('Aggiungi esercizio')}</h3>
    <div class="field"><label>${t('In quale giorno?')}</label><select id="m-day">${opzioniGiorni(def)}</select></div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">${t('Annulla')}</button><button class="btn btn--ember" id="m-ok">${t('Aggiungi')}</button></div>`);
  document.getElementById('m-ok').onclick=()=>{ const g=document.getElementById('m-day').value; closeModal();
    const r=schedaRows(), nuova={giorno:g,esercizio:'',note:'',serie:3,rip:10,peso:0,rest:'1:30'};
    let last=-1; r.forEach((x,i)=>{ if(x.giorno===g) last=i; });
    if(last>=0) r.splice(last+1,0,nuova); else inserisciGiorno(r,nuova);
    persist('scheda'); renderAllenamento(); };
}
/* GIORNI CHE NON PARTONO DA 1 (Marco, 18/11/2026: «il numero dei giorni della mia scheda parte dal 6»).
   Succede con un Training Set copiato da uno di 5 giorni: i giorni nuovi prendono il numero dopo l'ultimo
   (6, 7…) e poi i vecchi si tolgono. Nei Pesi compare un avviso con «Rinumera da 1»: i giorni numerati
   diventano 1, 2, 3… nello stesso ordine, insieme al riscaldamento e alla fatica delle sedute (rpe), che
   sono legati al nome del giorno. Il telefono collegato riceve i nomi nuovi al giro successivo. */
function giorniDaRinumerare(md){ const s=DOC.scheda||{}; md=md||schedaMode;
  const righe=(s[md]||[]).concat((s.riscaldamento&&Array.isArray(s.riscaldamento[md]))? s.riscaldamento[md] : []);
  const nn=[...new Set(righe.map(r=>giornoNumero(r&&r.giorno)).filter(Boolean))].sort((a,b)=>a-b);
  return nn.some((n,i)=>n!==i+1)? nn : null; }
function rinumeraGiorni(md){ const s=DOC.scheda; md=md||schedaMode; const nn=giorniDaRinumerare(md); if(!nn) return null;
  const mappa={}; nn.forEach((n,i)=>{ mappa[giornoScheda(n)]=giornoScheda(i+1); });
  const righe=(s[md]||[]).concat((s.riscaldamento&&Array.isArray(s.riscaldamento[md]))? s.riscaldamento[md] : []);
  righe.forEach(r=>{ if(r && mappa[r.giorno]) r.giorno=mappa[r.giorno]; });
  const rp=s.rpe&&s.rpe[md];
  if(rp && typeof rp==='object'){ const arrivi=new Set(Object.values(mappa)), nuovo={};
    Object.keys(rp).forEach(g=>{ if(!mappa[g] && !arrivi.has(g)) nuovo[g]=rp[g]; });   /* un vecchio «Giorno 1» rimasto senza righe non copre quello nuovo */
    Object.keys(rp).forEach(g=>{ if(mappa[g]) nuovo[mappa[g]]=rp[g]; });
    s.rpe[md]=nuovo; }
  /* il battito delle sedute dal telefono segue il giorno rinumerato, come fatica e durata */
  if(md==='settimanale' && s.fcSedute && typeof s.fcSedute==='object'){ const fs=s.fcSedute, arrivi=new Set(Object.values(mappa)), nuovo={};
    Object.keys(fs).forEach(g=>{ if(!mappa[g] && !arrivi.has(g)) nuovo[g]=fs[g]; });
    Object.keys(fs).forEach(g=>{ if(mappa[g]) nuovo[mappa[g]]=Object.assign({}, fs[g], {giorno:mappa[g]}); });
    s.fcSedute=nuovo; }
  if(md==='settimanale' && typeof telRinominaGiorni==='function') telRinominaGiorni(mappa);
  return mappa; }
function avvisoGiorni(){ const nn=giorniDaRinumerare(); if(!nn) return '';
  return `<div class="callout no-print" id="giorni-avviso"><div>${t('I giorni di questa scheda sono numerati')} <b>${nn.join(', ')}</b>. ${t('Li rinumero 1, 2, 3… nello stesso ordine? Riscaldamento e fatica delle sedute seguono il loro giorno; il telefono collegato si aggiorna da solo.')} <button class="btn btn--sm btn--ember" id="btn-rinumera">${t('Rinumera da 1')}</button></div></div>`; }
/* giorni numerati: nel menù i giorni già in scheda più il successivo, «nuovo» */
function opzioniGiorni(def){
  const gg=schedaDays(schedaRows()), nuovo=giornoScheda(Math.max(0,...gg.map(giornoNumero))+1);
  return gg.concat([nuovo]).map(g=>`<option value="${esc(g)}"${g===def?' selected':''}>${esc(giornoNome(g))}${g===nuovo?' · '+t('nuovo'):''}</option>`).join(''); }
/* un giorno nuovo va al suo posto nella sequenza (il Giorno 3 prima del 4), non in fondo */
function inserisciGiorno(rows, riga){ const o=giornoOrdine(riga.giorno), i=rows.findIndex(x=>x&&giornoOrdine(x.giorno)>o);
  if(i>=0) rows.splice(i,0,riga); else rows.push(riga); }
function addDay(){
  const usati=new Set(schedaDays(schedaRows()).map(giornoNumero)), max=Math.max(schedaMode==='mensile'?28:7, ...usati);
  const liberi=[]; for(let n=1;n<=max+1;n++) if(!usati.has(n)) liberi.push(n);
  const def=liberi.find(n=>n>Math.max(0,...usati))||liberi[0];
  modal(`<h3>${t('Aggiungi giorno')}</h3>
    <div class="field"><label>${t('Giorno')}</label><select id="m-day">${liberi.map(n=>`<option value="${esc(giornoScheda(n))}"${n===def?' selected':''}>${esc(giornoNome(giornoScheda(n)))}</option>`).join('')}</select></div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">${t('Annulla')}</button>
    <button class="btn btn--ember" id="m-ok">${t('Aggiungi')}</button></div>`);
  document.getElementById('m-ok').onclick=()=>{ const g=document.getElementById('m-day').value;
    inserisciGiorno(schedaRows(), {giorno:g,esercizio:'',note:'',serie:3,rip:10,peso:0,rest:'1:30'}); persist('scheda'); closeModal(); renderAllenamento(); };
}
function saveSchedaModal(){
  const w=isoWeek(new Date());
  const _pad=n=>String(n).padStart(2,'0'); const wk=w.anno+'-W'+_pad(w.sett);
  modal(`<h3>${t('Salva scheda nello Storico')}</h3>
    <p class="muted" style="font-size:13px;margin:0 0 8px">${t('Scegli la <b>settimana</b> dal calendario (oppure regola Anno/Settimana). Codice = Anno·100 + Settimana.')}</p>
    <div class="field"><label>${t('Settimana (calendario)')}</label><input id="m-week" type="week" value="${wk}" style="width:100%"></div>
    <div class="row"><div class="field"><label>${t('Anno')}</label><input id="m-anno" type="number" value="${w.anno}"></div>
      <div class="field"><label>${t('Settimana ISO')}</label><input id="m-sett" type="number" min="1" max="53" value="${w.sett}"></div></div>
    <p class="muted" style="font-size:13px;margin:6px 0 0">${t('Codice scheda:')} <b id="m-codeprev">${schedaCode(w.anno,w.sett)}</b></p>
    ${telRigaSalva()}
    <div class="modal__actions"><button class="btn" onclick="closeModal()">${t('Annulla')}</button>
      <button class="btn btn--ember" id="m-ok">${t('Salva')}</button></div>`);
  const _upd=()=>{ const a=+document.getElementById('m-anno').value, st=+document.getElementById('m-sett').value; const cp=document.getElementById('m-codeprev'); if(cp&&a&&st>=1&&st<=53) cp.textContent=schedaCode(a,st); };
  { const wkEl=document.getElementById('m-week'); if(wkEl) wkEl.onchange=()=>{ const m=/^(\d{4})-W(\d{1,2})$/.exec(wkEl.value||''); if(m){ document.getElementById('m-anno').value=+m[1]; document.getElementById('m-sett').value=+m[2]; _upd(); } }; }
  ['m-anno','m-sett'].forEach(id=>{ const el=document.getElementById(id); if(el) el.oninput=()=>{ const a=+document.getElementById('m-anno').value, st=+document.getElementById('m-sett').value; const wkEl=document.getElementById('m-week'); if(wkEl&&a&&st>=1&&st<=53) wkEl.value=a+'-W'+_pad(st); _upd(); }; });
  document.getElementById('m-ok').onclick=async()=>{
    const anno=+document.getElementById('m-anno').value, sett=+document.getElementById('m-sett').value;
    if(!anno||sett<1||sett>53){avviso(t('Anno/settimana non validi'));return;}
    const code=schedaCode(anno,sett);
    const exist=DOC.storico.filter(r=>(+r.scheda)===code).length;
    if(exist && !await conferma(t('Esiste già la scheda')+' '+code+' ('+exist+' '+t('righe). Le nuove righe verranno AGGIUNTE. Procedo?'))) return;
    /* record: si confronta il peso SCRITTO — per trazioni, dip e leg raise la zavorra.
       Sul totale, prendere peso corporeo produceva «record» senza aver sollevato di più. */
    const preMax={}; DOC.storico.forEach(r=>{ if(r.esercizio)preMax[r.esercizio]=Math.max(preMax[r.esercizio]||0,pesoMostrato(r)); });
    let added=0; const smap=sedutaMap(schedaRows()); const prs={};
    schedaRows().forEach(r=>{ if(!r.esercizio||!String(r.esercizio).trim())return;
      const pe=pesoMostrato(r); if(pe>0 && pe>(preMax[r.esercizio]||0)) prs[r.esercizio]=Math.max(prs[r.esercizio]||0,pe);
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
    /* battito delle sedute coi pesi (dal telefono): resta con la settimana salvata, fuori dal carico */
    if(sedutaFcCristallizza(code, (ensureSets()||{}).setAttivo||'')) persist('corpo');
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
    telSettimanaSalvata(code);   /* telefono collegato: la settimana si chiude anche lì */
    const prk=Object.keys(prs);
    let _msg=t('Scheda')+' '+code+' '+t('salvata —')+' '+added+' '+t('esercizi aggiunti allo Storico.');
    if(prk.length) _msg+='\n\n'+t('Nuovo record:')+' '+prk.map(k=>exName(k)+' '+nf(prs[k],1)+' kg').join(', ');
    avviso(_msg);
    if(curTab==='storico')renderStorico(); else renderAllenamento(); updateStatusDots();
  };
}
/* Elimina una settimana salvata nello Storico. Prende il posto del vecchio
   «Annulla ultimo», che sapeva togliere solo l'ULTIMA scheda: se lo sbaglio era due
   settimane fa bisognava cancellare anche quella buona in mezzo. Ora si sceglie
   direttamente dalla riga della settimana nello Storico. */
/* toglie RPE×min e minuti di cardio del riscaldamento salvati per una settimana (quando
   la settimana non ha più righe nello Storico non devono restare a contare da soli) */
function togliCaricoInterno(code){
  code=+code||0; if(!code) return false;
  const nR=(DOC.storico_rpe||[]).length, nW=(DOC.storico_risc||[]).length, nF=(DOC.storico_fc||[]).length;
  DOC.storico_rpe=(DOC.storico_rpe||[]).filter(x=>(+x.scheda)!==code);
  DOC.storico_risc=(DOC.storico_risc||[]).filter(x=>(+x.scheda)!==code);
  DOC.storico_fc=(DOC.storico_fc||[]).filter(x=>(+x.scheda)!==code);   /* anche il battito delle sedute */
  const cambiato=DOC.storico_rpe.length!==nR||DOC.storico_risc.length!==nW||DOC.storico_fc.length!==nF;
  if(cambiato) persist('corpo');
  return cambiato;
}
function eliminaScheda(code){
  code=+code||0; if(!code) return;
  const n=DOC.storico.filter(r=>(+r.scheda)===code).length;
  if(!n){ avvisa(t('Niente da eliminare'), t('Non ci sono righe per questa settimana.')); return; }
  chiediConferma(t('Elimino la settimana')+' '+code+'?',
    t('Vengono tolte tutte le sue righe')+' (<b>'+n+'</b> '+t('righe')+'). '+t('L\'operazione non si può annullare.'),
    ()=>{
      DOC.storico=DOC.storico.filter(r=>(+r.scheda)!==code); persist('storico');
      /* con la settimana se ne vanno anche il carico interno (RPE×min) e i minuti di
         cardio del riscaldamento salvati insieme a lei: restando, la settimana eliminata
         continuava a contare in sRPE, monotonia e nell'asse Cardio */
      togliCaricoInterno(code);
      cruscottoInvalida();
      if(curTab==='storico') renderStorico(); else renderAllenamento(); updateStatusDots();
    }, {testoOk:t('Elimina')});
}

