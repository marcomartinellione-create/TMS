/* ════════════════ COSTANTI / LOOKUP ════════════════ */
/* icone disegnate (simboli SVG in cima al <body>, 03-corpo.html): ico('utente'), ico('check','p') = piccola */
function ico(n,c){ return '<svg class="ic'+(c?' '+c:'')+'" aria-hidden="true"><use href="#i-'+n+'"/></svg>'; }
const GIORNI = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
/* GIORNI DELLA SCHEDA (2026-11-14, Marco: «i giorni segnati in maniera progressiva, 1 2 3»):
   la scheda non è legata al calendario, i suoi giorni sono «Giorno 1», «Giorno 2»… — salvati
   così, in italiano come gli altri dati, e tradotti a schermo da giornoNome. I nomi della
   settimana (GIORNI) restano validi per lo Storico già salvato e per le schede vecchie, che
   migrateGiorniScheda rinumera una volta sola nell'ordine della settimana. */
const GIORNO_RE=/^Giorno (\d+)$/;
function giornoScheda(n){ return 'Giorno '+n; }
function giornoNumero(g){ const m=GIORNO_RE.exec(String(g==null?'':g).trim()); return m? +m[1] : 0; }
function giornoNome(g){ const n=giornoNumero(g); return n? t('Giorno')+' '+n : t(g); }
function giornoOrdine(g){ const n=giornoNumero(g); if(n) return n; const i=GIORNI.indexOf(g); return i>=0? 100+i : 999; }
const GRUPPI = ['Gambe','Pettorali','Schiena','Spalle','Braccia','Core','Cardio'];
const APP_VERSION='1.1.28', APP_DATE='2026-11-17';
const RELEASE_NOTE='Novità: Dizionario inglese del PC: tolte 48 voci vecchie con emoji non più usate; App del PC, rifinitura grafica (tappa 3): via le emoji anche dalla Guida, dalla guida per l’AI e dalle note dei grafici; App del PC, rifinitura grafica (tappa 2): via le emoji da pulsanti, titoli, avvisi e tabelle di tutti i tab; App del PC, rifinitura grafica (tappa 1): caratteri, icone disegnate nella barra e nei tab, pulsanti, campi e riquadri più puliti; App del telefono (APK 1.2.5): grafica rifatta da capo, più pulita e della stessa famiglia del TMS sul PC.'; /* mini-changelog della versione; aggiornala a ogni release */
const GH_REPO_URL='https://github.com/marcomartinellione-create/TMS';
/* L'app del cliente «TMS Scheda» è SOLO l'APK Android (Marco, 16/11/2026): niente più link alla PWA.
   Il sorgente sta in app-android/web/ e lo impacchetta app-android (vedi app-android/LEGGIMI.md). */
/* ── mini-log errori interni (P4): ring buffer in memoria + scrittura best-effort in
      TMS_Dati/log_errori.json. Si consulta con 5 click sulla scritta «TMS» in alto. ── */
const LOG_ERRORI=[], LOG_ERRORI_MAX=200; let _logT=null;
function logErrore(dove, e){
  try{
    LOG_ERRORI.push({t:new Date().toISOString(), dove:String(dove), msg:String((e&&e.message)||e||'?')});
    while(LOG_ERRORI.length>LOG_ERRORI_MAX) LOG_ERRORI.shift();
    clearTimeout(_logT);
    _logT=setTimeout(()=>{ try{ if(dataDir) writeJson(dataDir,'log_errori.json',{aggiornato:new Date().toISOString(),voci:LOG_ERRORI}).catch(()=>{}); }catch(_){} }, 2000);
  }catch(_){}
}
const MAINLIFTS=[{label:'Squat',nome:'Squat con bilanciere'},{label:'Stacco',nome:'Stacco da terra con bilanciere'},{label:'Panca',nome:'Panca piana con bilanciere - presa media'},{label:'Military',nome:'Military press in piedi'},{label:'Trazioni',nome:'Trazioni alla sbarra (pull-up)'}];
/* ── ESERCIZI A CORPO LIBERO AL 100% (cernita del 2026-09-07) ─────────────────
   Qui il carico vero non è quello scritto nella colonna Peso: è il PESO DEL CORPO
   più l'eventuale zavorra (0 = a corpo libero, 15 = con 15 kg appesi). Senza questo
   una serie di trazioni pulite valeva TL zero, cioè "non allenamento".

   CRITERIO (deciso con Marco): entra SOLO chi solleva il 100% del proprio peso, cioè
   il corpo è interamente sospeso o in appoggio sulle sole braccia e viene mosso in
   verticale. Chi ne carica una frazione resta fuori finché non gestiremo le percentuali
   (piegamenti ~65%, dip alla panca ~50%, squat a corpo libero ~70%…).

   È un ELENCO ESPLICITO, non una regola sul nome: passati in rassegna tutti i 111
   esercizi a peso corporeo del catalogo più ogni voce con trazioni/dip/sbarra/anelli.
   ESCLUSI di proposito, benché di nome simile:
   · al cavo o a macchina — «Pull-up corda al cavo basso», «Dip alla macchina»
   · assistiti — «Trazioni Assistite con Elastico» (lì semmai l'aiuto va sottratto)
   · a carico parziale — «Dip alla panca», «Bench dip con peso», «Rematore a corpo
     libero alla sbarra», «Tricipiti al corpo libero alla sbarra», piegamenti, squat
   · da appeso ma che sollevano le sole gambe, non il corpo — «Pike da appeso»,
     «Wind sprint» (i leg raise hanno invece la loro quota parziale, vedi sotto) */
const CORPO_LIBERO=[
  /* trazioni: corpo appeso alla sbarra/anelli e tirato su per intero */
  'Trazioni alla sbarra (pull-up)','Trazioni alla sbarra con peso','Trazioni presa supina (chin-up)',
  'Trazioni a presa mista','Trazioni da lato a lato','Trazione a un braccio (chin-up)',
  'Trazione dietro il collo presa larga','Trazione con maniglia a V','Rocky pull-up / pulldown',
  'Scapular pull-up','Gorilla chin/crunch',
  /* dip: corpo sospeso sulle braccia fra parallele o anelli */
  'Dip alle parallele','Dip alle parallele - versione petto','Dip alle parallele - versione tricipiti',
  'Dip agli anelli',
  /* arrampicata: il corpo intero sale lungo la corda */
  'Salita alla corda'
];
const CORPO_LIBERO_SET={}; CORPO_LIBERO.forEach(n=>{ CORPO_LIBERO_SET[n.trim().toLowerCase()]=true; });
/* ── QUOTE PARZIALI (2026-09-14): chi solleva una FRAZIONE del corpo ──────────
   I leg raise muovono le sole gambe. La massa delle due gambe viene dalle tabelle di
   segmentazione di de Leva (1996), le stesse usate in biomeccanica: coscia 14,2 % +
   gamba 4,3 % + piede 1,4 % per lato nell'uomo, un po' di più nella donna — in tutto
   39,7 % (M) e 41,8 % (F) del peso corporeo. NON è metà corpo: è meno.
   A ginocchia piegate la massa è la stessa ma il braccio di leva scende a circa il 60 %:
   il modello del TMS ragiona in kg, non in momento, quindi per distinguere i due gesti
   la quota del ginocchia-piegate è ridotta a 0,25. È un'APPROSSIMAZIONE dichiarata
   (gambe medie, leva media), accettata da Marco.
   Classificati leggendo le ISTRUZIONI, non il nome: «Sollevamento ginocchia/anche alle
   parallele» dice «solleva le gambe tenendole distese» ed è a gambe tese; i tre
   «Leg pull-in» dicono «piega le ginocchia» e sono a ginocchia piegate.
   Dragon Flag resta fuori: ruota sulle spalle anche il tronco, è un altro discorso. */
const QUOTA_GAMBE_TESE={M:0.40, F:0.42}, QUOTA_GINOCCHIA=0.25;
const CORPO_LIBERO_PARZIALE={
  'Leg raise da appeso':'gambe', 'Leg raise da sdraiato su panca piana':'gambe',
  'Sollevamento ginocchia/anche alle parallele':'gambe',
  'Leg pull-in':'ginocchia', 'Leg pull-in da seduto su panca piana':'ginocchia',
  'Leg pull-in su panca piana':'ginocchia', 'Sollevamento delle anche a ginocchia piegate':'ginocchia'
};
const CORPO_LIBERO_PARZ_SET={}; Object.keys(CORPO_LIBERO_PARZIALE).forEach(n=>{ CORPO_LIBERO_PARZ_SET[n.trim().toLowerCase()]=CORPO_LIBERO_PARZIALE[n]; });
/* quota del peso corporeo che l'esercizio fa sollevare: 1 per trazioni e dip, una frazione
   per i leg raise, 0 per tutto il resto. Il sesso lo legge dal profilo attivo (M se manca).
   Il nome può portare i suffissi di variante/seduta (-N2, -MAX): si confronta la base. */
function quotaCorpo(nome){ if(!nome) return 0;
  /* un esercizio rinominato dall'utente resta ciò che era: si prova anche coi suoi vecchi nomi */
  const pv=parseVariante(nome).nome.trim(), e=esLookup(pv);
  const nomi=[pv].concat((e&&Array.isArray(e.alias))? e.alias : []).map(n=>String(n).trim().toLowerCase());
  if(nomi.some(n=>CORPO_LIBERO_SET[n])) return 1;
  const base=nomi.find(n=>CORPO_LIBERO_PARZ_SET[n]);
  const k=base? CORPO_LIBERO_PARZ_SET[base] : null; if(!k) return 0;
  if(k==='ginocchia') return QUOTA_GINOCCHIA;
  const sesso=(typeof DOC!=='undefined'&&DOC&&DOC.dati_utente&&DOC.dati_utente.sesso)==='F'?'F':'M';
  return QUOTA_GAMBE_TESE[sesso]; }
function isCorpoLibero(nome){ return quotaCorpo(nome)>0; }
let ESBYNAME = {};
const FOODBYNAME = {}; FOOD.forEach(f=>FOODBYNAME[String(f.nome).trim()]=f);
function esLookup(n){ return ESBYNAME[String(n==null?'':n).trim()]; }
function fattore(n){ const e=esLookup(n); return (e && e.fattore) || 1; }
function gruppoOf(n){ const e=esLookup(n); return (e && (e.macro||e.gruppo)) || ''; }
function videoOf(n){ const e=esLookup(n); return (e && e.video) ? String(e.video).trim() : ''; }

/* -- VOLUME PER GRUPPO: anche il lavoro INDIRETTO ------------------------------
   La panca sta in «Pettorali», ma allena pure spalle e tricipiti: contarla tutta su
   un gruppo solo fa sembrare scoperte le braccia di una scheda che le allena eccome.
   Il catalogo porta muscoli_primari/muscoli_secondari (vocabolario chiuso di 17 voci,
   qui mappate sui gruppi dei pesi): i primari valgono una serie piena, i secondari
   mezza — la convenzione d'uso nel conteggio del volume settimanale.
   Cataloghi vecchi senza le liste ricadono sul solo macro, cioè sul conteggio di prima. */
const MUSCOLO_GRUPPO = {
  'quadricipiti':'Gambe', 'ischiocrurali':'Gambe', 'glutei':'Gambe', 'polpacci':'Gambe',
  'adduttori':'Gambe', 'abduttori':'Gambe',
  'pettorali':'Pettorali',
  'gran dorsale':'Schiena', 'dorsali centrali':'Schiena', 'trapezi':'Schiena', 'lombari':'Schiena',
  'spalle':'Spalle', 'collo':'Spalle',
  'bicipiti':'Braccia', 'tricipiti':'Braccia', 'avambracci':'Braccia',
  'addominali':'Core'
};
const QUOTA_SECONDARI = 0.5;   /* peso PREDEFINITO della serie indiretta: il profilo può cambiarlo (01b-riferimenti.js) */
function normMuscolo(m){ return String(m==null?'':m).toLowerCase().trim(); }
/* {gruppo: quota} per UNA serie dell'esercizio. Un muscolo elencato sia fra i primari
   sia fra i secondari (capita nei gesti olimpici) vale come diretto, non diretto più
   indiretto: un gruppo con un muscolo primario è DIRETTO. Quali gruppi sono diretti e quali
   indiretti lo dice gruppiDI (catalogo TMS, o mappa esterna se il profilo la sceglie); il
   peso di ciascuno (1,0 e 0,5 salvo modifiche, provvisori) lo dice pesiSerie. */
function quoteGruppi(nome){
  const p=pesiSerie(), di=gruppiDI(nome,p.metodo), out={};
  di.D.forEach(g=>{ out[g]=p.d; }); di.I.forEach(g=>{ out[g]=p.i; });
  return out;
}

/* -- FASCE DI VOLUME per gruppo ------------------------------------------------
   La letteratura ragiona per MUSCOLO (10-20 serie a settimana è la zona che fa crescere),
   ma qui gli assi sono i sei gruppi dei pesi e ogni asse somma lavoro diretto E indiretto:
   «Braccia» tiene bicipiti e tricipiti più mezza serie da ogni spinta e ogni tirata,
   «Gambe» quadricipiti, femorali/glutei e polpacci. Su quegli assi la fascia del singolo
   muscolo segnala come eccessivo ciò che sono due o tre muscoli messi insieme, ciascuno
   nella norma: quindi ogni gruppo ha la sua fascia.
   I valori NON sono stimati a occhio. Sono ricavati passando questo stesso conteggio su
   circa 930 schede pubblicate (strengthlog.com e muscleandstrength.com): 308 avevano
   tabelle esercizio/serie leggibili, 109 erano settimane intere con almeno l'85% degli
   esercizi riconosciuti, e di quelle 60 risultano equilibrate secondo un criterio ESTERNO
   — le linee guida sulla spalla, che raccomandano da 1:1 a 1:2 fra spinta e trazione.
   Il filtro serve: sulle schede non selezionate la mediana spinta/trazione è 1,50 e il
   novantesimo percentile 3,50, cioè si finirebbe per tarare l'app sulla scheda media di
   internet invece che su una equilibrata. Sulle 60 rimaste la mediana è esattamente 1,00.
   Da quella distribuzione: min = 25° percentile, max = 90°, «sotto» e «sopra» stanno più
   fuori ancora e sono le uniche soglie che accendono il rosso.
   Core: quelle schede quasi non programmano addominali diretti (mediana 1,5 serie), quindi
   la fascia è volutamente larga e «sotto» è 0 — l'asse non viene mai segnalato come scarso.
   Cardio: linee guida OMS, 150-300 min a settimana, cioè 15-30 sull'asse (10 min = 1). */
const RIF_GRUPPO = {
  'Gambe':     {min:20, max:40, sotto:12, sopra:50},
  'Pettorali': {min:7,  max:16, sotto:4,  sopra:20},
  'Schiena':   {min:17, max:32, sotto:9,  sopra:40},
  'Spalle':    {min:14, max:30, sotto:8,  sopra:38},
  'Braccia':   {min:17, max:40, sotto:9,  sopra:50},
  'Core':      {min:3,  max:12, sotto:0,  sopra:16},
  'Cardio':    {min:15, max:30, sotto:8,  sopra:45}
};

/* -- FASCE DI DISTRIBUZIONE (2026-09-29) ---------------------------------------
   La ragnatela «Equilibrio» dice COME è distribuito il lavoro fra i gruppi, non quanto
   (Marco: «è un discorso di forma e proporzione, non di valore totale»). Ogni asse è la
   QUOTA % del gruppo sul totale delle serie coi pesi: una settimana leggera e una pesante
   con la stessa distribuzione hanno lo stesso disegno. Le QUANTITÀ restano dove servono a
   dire se il volume basta — elenco del ⚖ Bilanciamento e barre «Serie per gruppo» — con le
   fasce assolute RIF_GRUPPO.
   Fasce ricavate dalle stesse schede equilibrate (Doc/meta-analisi, 61 schede, 2026-09-29):
   dal 10° al 90° percentile della quota di ogni gruppo (arrotondate verso l'esterno).
   Simmetriche, a differenza di quelle assolute: le quote fanno cento, quindi se un gruppo
   sale gli altri scendono — troppo e troppo poco sono lo stesso squilibrio. «sotto» e
   «sopra» (il rosso) stanno a 3/4 del 10° e a 5/4 del 90°.
   Il Cardio non c'è: non compare nelle schede di riferimento e, entrando nel totale,
   cambierebbe la quota di tutti gli altri gruppi.
   Dal 2026-11-13 la fascia si calcola dal riferimento scelto (rifCalcola, 01b-riferimenti.js:
   esperienza × tipo di allenamento, con fonti e conteggi). Il predefinito — schede equilibrate,
   tutti i profili — sulle sole 61 schede di qui ridà questi stessi min/max; con le 2 schede
   complete di depot.fitness si sposta di un punto al più (Gambe 18-33, Spalle 14-24). RIF_QUOTA
   resta come fascia storica se i dati dei riferimenti mancano. */
const RIF_QUOTA = {
  'Gambe':     {min:19, max:33, sotto:14, sopra:41},
  'Pettorali': {min:6,  max:13, sotto:5,  sopra:16},
  'Schiena':   {min:17, max:26, sotto:13, sopra:32},
  'Spalle':    {min:14, max:23, sotto:10, sopra:29},
  'Braccia':   {min:17, max:27, sotto:12, sopra:33},
  'Core':      {min:0,  max:8,  sotto:0,  sopra:10}
};
const GRUPPI_PESI = ['Gambe','Pettorali','Schiena','Spalle','Braccia','Core'];
/* {gruppo: quota %} sui soli gruppi dei pesi; tutto a zero se non c'è lavoro */
function distribuzione(per){ per=per||{};
  const tot=GRUPPI_PESI.reduce((a,g)=>a+(+per[g]||0),0), out={};
  GRUPPI_PESI.forEach(g=>{ out[g]= tot>0? 100*(+per[g]||0)/tot : 0; });
  return out; }
/* voci pronte per radarChart: etichetta col «%», valore = quota, fascia del riferimento
   scelto (null se i dati non bastano: la ragnatela non la disegna). `di` = {D,I} serie
   dirette e indirette per gruppo, facoltativo: finisce nel suggerimento dell'etichetta. */
function vociDistribuzione(per, di, rc){ const q=distribuzione(per); rc=rc||rifCalcola(); const p=pesiSerie();
  return GRUPPI_PESI.map(g=>{ const f=rc.fasce? rc.fasce[g] : null;
    let tip=t(g)+': '+Math.round(q[g])+'%';
    if(di&&di.D) tip+=' · '+bilNum(di.D[g]||0)+' '+t('dirette')+' + '+bilNum(di.I[g]||0)+' '+t('indirette')+' ×'+nfPeso(p.i);
    if(f) tip+=' · '+t(f.generata? 'riferimento Fable (schede generate)' : 'riferimento')+' '+f.min+'–'+f.max+'%';
    return {label:t(g)+' '+Math.round(q[g])+'%', value:q[g], rif:f, tip:tip}; }); }

/* -- SPINTA / TRAZIONE (parte alta) --------------------------------------------
   Lo squilibrio che conta di più e che le schede sbagliano più spesso: quanto si
   spinge contro quanto si tira. Si deduce dal muscolo primario; per le spalle decide
   la compagnia (con trapezi o dorsali è lavoro posteriore, quindi trazione). Gambe e
   core non hanno una direzione utile in questa lettura e restano fuori dal conto.
   Contano SOLO i multiarticolari: qui si misura l'equilibrio fra schemi di movimento,
   e gli isolamenti lo sporcano senza dire nulla su come tiri o spingi — le alzate
   laterali non sono una spinta, e un curl è flessione del gomito, non una trazione. */
const SPINTA_PRIM   = {'pettorali':1, 'tricipiti':1};
const TRAZIONE_PRIM = {'gran dorsale':1, 'dorsali centrali':1, 'trapezi':1, 'bicipiti':1, 'avambracci':1};
const MUSCOLI_POST  = {'trapezi':1, 'dorsali centrali':1, 'gran dorsale':1};
function isMultiarticolare(e){ return /^multi/i.test(String((e&&e.tipo)||'')); }
function direzioneOf(nome){
  const e=esLookup(nome); if(!e||!isMultiarticolare(e)) return '';
  const p=normMuscolo((e.muscoli_primari||[])[0]);
  if(SPINTA_PRIM[p]) return 'spinta';
  if(TRAZIONE_PRIM[p]) return 'trazione';
  if(p==='spalle') return (e.muscoli_secondari||[]).some(m=>MUSCOLI_POST[normMuscolo(m)]) ? 'trazione' : 'spinta';
  return '';
}

/* -- VARIANTI / SEDUTE (sostituiscono i suffissi +1/+2/-N2/-MAX) -- */
const VAR_RE=/(?:\s*-\s*MAX|\s*-\s*N\s*\d+|\s*\+\s*\d+)\s*$/i;
function parseVariante(name){
  let n=String(name==null?'':name).trim(), seduta=1, test=false;
  let m=n.match(/^(.*?)\s*-\s*MAX\s*$/i); if(m){ n=m[1].trim(); test=true; }
  m=n.match(/^(.*?)\s*-\s*N\s*(\d+)\s*$/i); if(m){ n=m[1].trim(); seduta=+m[2]||1; }
  m=n.match(/^(.*?)\s*\+\s*\d+\s*$/); if(m){ n=m[1].trim(); }
  return {nome:n, seduta:seduta, test:test};
}
function isVariante(name){ return VAR_RE.test(String(name||'')); }
let EX_BASE=[];
/* ── ALIAS (2026-11-11): il nome dell'esercizio è la chiave dei dati ──────────────
   Rinominando un esercizio dal catalogo, storico e schede restavano col nome vecchio e
   si staccavano: niente muscoli, fattore 1, progressione spezzata in due. Ora la voce di
   catalogo ricorda i suoi vecchi nomi (`alias`): esLookup li riconosce, e le righe dei
   profili vengono portate al nome nuovo — subito per il profilo aperto, al caricamento
   per gli altri (il catalogo è condiviso, i dati no). Un nome vero vince sempre su un
   alias: se poi si crea un esercizio col vecchio nome, quello è un esercizio nuovo. */
let ALIAS_NOME={};
function rebuildEs(){ ESBYNAME={}; ALIAS_NOME={};
  (DOC.esercizi||[]).forEach(e=>{ if(e&&e.nome) ESBYNAME[String(e.nome).trim()]=e; });
  (DOC.esercizi||[]).forEach(e=>{ if(!e||!e.nome||!Array.isArray(e.alias)) return;
    e.alias.forEach(a=>{ a=String(a||'').trim(); if(a && !ESBYNAME[a]){ ALIAS_NOME[a]=String(e.nome).trim(); } }); });
  Object.keys(ALIAS_NOME).forEach(a=>{ ESBYNAME[a]=ESBYNAME[ALIAS_NOME[a]]; });
  EX_BASE=DOC.esercizi||[]; }
/* nome attuale di un esercizio (segue gli alias); invariato se non è stato rinominato */
function nomeAttuale(n){ n=String(n==null?'':n).trim(); return ALIAS_NOME[n]||n; }
/* tutti gli elenchi di righe della scheda del profilo aperto: i due piani attivi, i
   riscaldamenti e tutto ciò che sta nei Training Set salvati */
function elenchiScheda(){
  const out=[], s=DOC.scheda||{};
  const piano=p=>{ if(!p) return; ['settimanale','mensile'].forEach(md=>{ if(Array.isArray(p[md])) out.push(p[md]); });
    const w=p.riscaldamento; if(w&&typeof w==='object'&&!Array.isArray(w)) Object.keys(w).forEach(md=>{ if(Array.isArray(w[md])) out.push(w[md]); }); };
  piano(s); if(s.setsSalvati&&typeof s.setsSalvati==='object') Object.keys(s.setsSalvati).forEach(n=>piano(s.setsSalvati[n]));
  return out;
}
function sedutaMap(rows){
  const byEx={};
  rows.forEach(r=>{ if(!r.esercizio)return; const g=r.giorno||'·'; (byEx[r.esercizio]=byEx[r.esercizio]||new Set()).add(g); });
  const out={};
  Object.keys(byEx).forEach(ex=>{ const days=[...byEx[ex]].sort((a,b)=>giornoOrdine(a)-giornoOrdine(b));
    out[ex]={}; days.forEach((d,i)=>out[ex][d]=i+1); });
  return out;
}
function rowSeduta(map,r){ return (r.esercizio && map[r.esercizio] && map[r.esercizio][r.giorno||'·']) || 1; }
function migrateStorico(){
  let changed=false;
  DOC.storico.forEach(r=>{ if(r.seduta==null){ const v=parseVariante(r.esercizio);
    r.esercizio=v.nome; r.seduta=v.seduta; if(v.test)r.test=true; r.macro=r.macro||gruppoOf(v.nome); changed=true; }
    /* nuova logica: rimuovi i valori calcolati salvati (1RM/%1RM/TL/fascia) — ora si ricalcolano */
    if(!r.macro){ r.macro=gruppoOf(r.esercizio); changed=true; }
    if(('rm1' in r)||('pct1rm' in r)||('tl' in r)||('fascia' in r)){ delete r.rm1; delete r.pct1rm; delete r.tl; delete r.fascia; changed=true; }
  });
  return changed;
}
function normalizeAlim(){
  try{ if(localStorage.getItem('tms-alim-norm')) return; }catch(e){}
  ['bulk','mant','cut'].forEach(fase=>{ let last=''; ((DOC.alimentazione||{})[fase]||[]).forEach(r=>{
    const p=(r.pasto||'').trim(); if(p) last=p; else if(r.alimento && last) r.pasto=last; }); });
  try{ localStorage.setItem('tms-alim-norm','1'); }catch(e){}
}
function migrateScheda(){
  let changed=false;
  ['settimanale','mensile'].forEach(md=>{ (DOC.scheda[md]||[]).forEach(r=>{ if(r.esercizio){
    const v=parseVariante(r.esercizio); if(v.nome!==r.esercizio){ r.esercizio=v.nome; if(v.test)r.test=true; changed=true; } }}); });
  return changed;
}
/* da «Lunedì, Mercoledì, Venerdì» a «Giorno 1, 2, 3» in un piano (scheda attiva o Training
   Set salvato), per ogni modalità: righe, riscaldamenti e bozza RPE del giorno seguono insieme.
   Solo i nomi della settimana cambiano; un giorno già numerato tiene il suo numero. */
function migraGiorniPiano(p, rpe){ let ch=false;
  ['settimanale','mensile'].forEach(md=>{
    const righe=Array.isArray(p[md])? p[md] : [];
    const warm=(p.riscaldamento&&typeof p.riscaldamento==='object'&&!Array.isArray(p.riscaldamento)&&Array.isArray(p.riscaldamento[md]))? p.riscaldamento[md] : [];
    const tutte=righe.concat(warm), vecchi=[];
    tutte.forEach(r=>{ const g=r&&r.giorno; if(g && GIORNI.indexOf(g)>=0 && vecchi.indexOf(g)<0) vecchi.push(g); });
    if(!vecchi.length) return;
    vecchi.sort((a,b)=>GIORNI.indexOf(a)-GIORNI.indexOf(b));
    const usati=new Set(tutte.map(r=>giornoNumero(r&&r.giorno)).filter(Boolean)), mappa={}; let n=1;
    vecchi.forEach(g=>{ while(usati.has(n)) n++; mappa[g]=giornoScheda(n); usati.add(n); });
    tutte.forEach(r=>{ if(r && mappa[r.giorno]) r.giorno=mappa[r.giorno]; });
    if(rpe && rpe[md] && typeof rpe[md]==='object') Object.keys(mappa).forEach(g=>{ if(rpe[md][g]!==undefined){ rpe[md][mappa[g]]=rpe[md][g]; delete rpe[md][g]; } });
    ch=true; });
  return ch; }
function migrateGiorniScheda(){ const s=DOC.scheda; if(!s||typeof s!=='object') return false;
  let ch=migraGiorniPiano(s, s.rpe);
  if(s.setsSalvati&&typeof s.setsSalvati==='object') Object.keys(s.setsSalvati).forEach(k=>{ if(s.setsSalvati[k] && migraGiorniPiano(s.setsSalvati[k], null)) ch=true; });
  return ch; }
/* ── Migrazione nomi esercizio: vecchio catalogo -> database (una tantum, con backup) ── */
const EX_RENAME={
  "Squat bilanciere":"Squat con bilanciere",
  "Stacco da terra":"Stacco da terra con bilanciere",
  "Front squat":"Front squat con bilanciere",
  "Panca piana bilanciere":"Panca piana con bilanciere - presa media",
  "Panca inclinata con manubri":"Distensioni su panca inclinata con manubri",
  "Croci ai manubri su panca piana":"Croci con manubri",
  "Arnold press":"Arnold Press con Manubri",
  "Military press / Overhead press":"Military press in piedi",
  "Rematore bilanciere":"Rematore con bilanciere busto in avanti",
  "Trazioni alla sbarra":"Trazioni alla sbarra (pull-up)",
  "Lat Pulldown unilaterale":"Lat pulldown a un braccio",
  "Curl manubri alternati":"Curl alternato con manubri",
  "Hammer Curl cavo basso":"Hammer curl ai cavi con corda",
  "Curl cavo basso":"Curl in piedi ai cavi",
  "Push-down tricipiti":"Pushdown per tricipiti",
  "Hip thrust":"Hip thrust con bilanciere",
  "Calf raise":"Calf in piedi alla macchina",
  "Crunch Cavo Alto":"Crunch ai cavi",
  "Pulley basso presa stretta":"Rematore seduto ai cavi"
};
function _renameRows(rows){ let ch=false; (rows||[]).forEach(r=>{ if(!r||!r.esercizio) return;
    /* prima la tabella storica (vecchio catalogo → database), poi gli alias dell'utente;
       un nome che esiste davvero a catalogo non si tocca */
    let n=EX_RENAME[r.esercizio]||r.esercizio; n=ALIAS_NOME[String(n).trim()]||n;
    if(n!==r.esercizio){ r.esercizio=n; const g=gruppoOf(n); if(g && ('macro' in r)) r.macro=g; ch=true; } }); return ch; }
function migrateExNames(){
  let ch=false;
  ch = _renameRows(DOC.storico) || ch;
  if(DOC.scheda){ elenchiScheda().forEach(el=>{ ch=_renameRows(el)||ch; }); }
  return ch;
}
/* TL dei singoli set (in ordine) di un esercizio+seduta nell'ultima scheda salvata,
   per il confronto Δ TL set-per-set (set 1 vs set 1, set 2 vs set 2…). Esclude i test (★). */
/* «Ultima scheda» = l'ultima settimana in cui QUELL'esercizio è stato fatto in quella
   seduta, non l'ultima settimana salvata in assoluto: con due Training Set alternati, o
   saltando un esercizio per una settimana, il confronto spariva proprio quando serviva. */
function ultimaSchedaCon(nome,seduta){
  let mx=0; DOC.storico.forEach(r=>{ if(r.esercizio===nome && !r.test && (+(r.seduta||1))===seduta){ const s=+r.scheda||0; if(s>mx) mx=s; } });
  return mx;
}
function lastBlockSets(nome,seduta){
  const maxS=ultimaSchedaCon(nome,seduta); if(!maxS) return [];
  return DOC.storico.filter(r=>r.esercizio===nome && (+r.scheda)===maxS && (+(r.seduta||1))===seduta && !r.test).map(r=>sTL(r));
}
/* pesi dei singoli set (in ordine) dell'ultima scheda salvata: per il LED del co-pilota
   (confronto del peso digitato col set di pari posizione). Esclude i test (★). */
function lastBlockPesi(nome,seduta){
  const maxS=ultimaSchedaCon(nome,seduta); if(!maxS) return [];
  return DOC.storico.filter(r=>r.esercizio===nome && (+r.scheda)===maxS && (+(r.seduta||1))===seduta && !r.test).map(r=>+r.peso||0);
}

