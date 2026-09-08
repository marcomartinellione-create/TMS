/* ════════════════ COSTANTI / LOOKUP ════════════════ */
const GIORNI = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
const GRUPPI = ['Gambe','Pettorali','Schiena','Spalle','Braccia','Core','Cardio'];
const APP_VERSION='1.1.12', APP_DATE='2026-09-08';
const RELEASE_NOTE='Nello Storico ogni settimana ha ora il suo cestino: puoi eliminare qualunque registrazione sbagliata, anche una di due mesi fa, senza toccare quelle buone — lo stesso vale per le misure. Le richieste di conferma non sono più le finestre grigie di Windows ma riquadri dell’app, col pulsante Annulla già selezionato. Nella scheda arriva «⚖ Bilanciamento», che mostra come sono distribuite le serie fra i gruppi muscolari mentre la stai scrivendo (senza contare il cardio). Cercando un esercizio, i tuoi preferiti compaiono in cima ai risultati. La finestra si apre più larga, così i pulsanti Guida e Segnala non coprono più la scheda, e la riga sotto il nome dell’esercizio non va più a capo storta.'; /* mini-changelog della versione; aggiornala a ogni release */
const QR_GH_SRC='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAXIAAAFyCAIAAABnRsZeAAAGbElEQVR42u3dwY7bMAxF0arw///ydNdlNgznUfQ5+0xsxb2QAUI9Pz8/fwC+568lAGQFkBVAVgBkBZAVQFYAZAWQFUBWAGQFkBVAVgBZAZAVQFYAWQGQFUBWgH2eyofPOcuWo3Kyb2U1+r535h1Zq93/FuxWAC9BgKwAsgIgK4CsALICICuArAALPH1/ujKl1+fGacjKNc+8374Z3L45Wv8W7FYAL0GArADICiArgKwAyAogK4CsAK/ypL64b8Kvb6IxNbFamUlNfbbyl/tmcGe68d+C3QogK4CsAMgKICuArACyAiArgKwA6z2WYILUTGrfZ/tWY+avgN0KICuArACyAiArgKwAsgIgK4CsAMuYsv2amVOnqTnamWfZ7jsH124FkBUAWQFkBZAVAFkBZAWQFQBZAZrEpmz3nQzaN7FamTq9cSb1bWfK7rsjuxVAVgBZAWQFQFYAWQFkBUBWAFkBFmicsn3buaF9p8bu+2zqqZt5sq/dCoCsALICyAqArACyAsgKICsAsgIMdPado9m4WCNnJfumP9/2l7FbAWQFkBUAWQFkBZAVAFkBZAWQFYD/Tmre0cTq137CtpVMnfx65T+kdc+z3QrgJQiQFQBZAWQFkBUAWQFkBZAV4OWe1Bf3zbOmvvfGO+q739TU6Y2TwamV7FsNuxXASxAgK4CsAMgKICuArADICiArwAJn5pmj5jvnr/ONv+DM3yi1Vn13ZLcCyAogK4CsAMgKICuArADICiArwAInNTuYcuNZtqlTcvtWsu+ab1yrG38juxVAVgBZAZAVQFYAWQFkBUBWAFkB1ht6lm3jDZtnHb8aM88qnnnNM0+6tVsBvAQBsgLICoCsALICyAqArACyAixwUiewzvyf7mfe0b5Tgft+hbc9sZX77btmuxXASxAgK4CsAMgKICuArADICiArwAJP6osrE42pWcnUHfV9776ze2c+GxU3npFstwLICiArgKwAyAogK4CsAMgKICvAAufGc2FT1/xZaja08eF42YRu6tm4cTXsVgBZAWQFQFYAWQFkBZAVAFkBZAVYr3SW7b6zP2fOaM7UN4N741m2qb888xe0WwG8BAGyAsgKgKwAsgLICoCsALICLPDMvKzUjOZnTrr9nbWq3G/qjOS3TejarQCyAsgKgKwAsgLICiArALICyAqw3rlxsnDmVGLfNe/7bN9zlXrqZv5L6Xva7VYAL0GArADICiArgKwAsgIgK4CsAOudG09+nTlZOHMy+MZZ2D4zn/Yb79duBZAVQFYAZAWQFUBWAFkBkBVAVoD1zo1zln0TqykzT/atXPONT07lmmf+Cql5dLsVwEsQICuArADICiArgKwAyAogK8ACT+qLU/OOKX1zlm+b4Kx8b+XJmXkaceov260AXoIAWQGQFUBWAFkBZAVAVgBZAdZrnLKdedZpajY0db+VOcuZc7SpKep9s91912y3AsgKICuArADICiArgKwAyAogK8ACJzUNmZorLS3WhdOfM1cydb83PpMz58LtVgBZAWQFQFYAWQFkBZAVAFkBZAVY79x45uiN05D7Jlb7VrLvjlJTtjeupN0KICuArADICiArgKwAyAogK4CsAC93bpzhiy1WaCZ15vf2XfONV9X3XKVWo3K/diuAlyBAVgBZAZAVQFYAWQGQFUBWgAWeyodnnv1Z8XmysO+k29T0Z+oXTE1/9pl5zamrslsBZAWQFUBWAGQFkBVAVgBkBZAVYIGn70/fOA1Z+WzlfitTp6mrSv36M2e733a/diuArACyAiArgKwAsgLICoCsALICrPekvrhvdnDmdG9lNfpmcGf+vqmTbmeuZN9a2a0AXoIAWQGQFUBWAFkBkBVAVgBZAfjgsQTf0jcpW5Ga0O2bdu37y33rnLqq1DrbrQBeggBZAWQFQFYAWQFkBUBWAFkBFjBlO0JlojH12YrUHG3f/aYmkmf+vnYrgKwAsgLICoCsALICyAqArACyAiwQm7JNzf/NvObUaaaVk273rUblqvadsGu3AngJAmQFQFYAWQFkBUBWAFkBZAV4ucYp25mzkn13VJlYrUidhNo3ddo3sZp6JmfOK/d9r90KICuArACyAiArgKwAsgIgK4CsAAucG8+UBexWAFkBkBVAVgBZAZAVQFYAWQGQFUBWAFkBZAVAVgBZAWQFQFYAWQFkBUBWgF/1D3cO6AdwG5DOAAAAAElFTkSuQmCC'; /* QR del repo GitHub (offline) */
const GH_REPO_URL='https://github.com/marcomartinellione-create/TMS';
const APP_CLIENTE_URL='https://marcomartinellione-create.github.io/TMS/app/';  /* PWA «TMS Scheda» per il cliente */
/* ── mini-log errori interni (P4): ring buffer in memoria + scrittura best-effort in
      TMS_Dati/log_errori.json. Si consulta con 5 click sulla versione nel footer. ── */
const LOG_ERRORI=[], LOG_ERRORI_MAX=200; let _logT=null;
function logErrore(dove, e){
  try{
    LOG_ERRORI.push({t:new Date().toISOString(), dove:String(dove), msg:String((e&&e.message)||e||'?')});
    while(LOG_ERRORI.length>LOG_ERRORI_MAX) LOG_ERRORI.shift();
    clearTimeout(_logT);
    _logT=setTimeout(()=>{ try{ if(dataDir) writeJson(dataDir,'log_errori.json',{aggiornato:new Date().toISOString(),voci:LOG_ERRORI}).catch(()=>{}); }catch(_){} }, 2000);
  }catch(_){}
}
const YT_URL='https://www.youtube.com/@TrainingMonitorSystem';  /* canale YouTube dei video tutorial; vuoto = riquadro QR nascosto */
const QR_YT_SRC='data:image/png;base64,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';  /* QR del canale (data URI base64) — generato da tools/genera-qr.py, non scriverlo a mano */
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
   · da appeso ma che sollevano le sole gambe, non il corpo — «Leg raise da appeso»,
     «Pike da appeso», «Sollevamento ginocchia/anche alle parallele», «Wind sprint» */
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
/* il nome può portare i suffissi di variante/seduta (-N2, -MAX): si confronta la base */
function isCorpoLibero(nome){ if(!nome) return false;
  const base=parseVariante(nome).nome.trim().toLowerCase();
  return !!CORPO_LIBERO_SET[base]; }
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
const QUOTA_SECONDARI = 0.5;
function normMuscolo(m){ return String(m==null?'':m).toLowerCase().trim(); }
/* {gruppo: quota} per UNA serie dell'esercizio. Un muscolo elencato sia fra i primari
   sia fra i secondari (capita nei gesti olimpici) vale 1, non 1,5: si tiene il massimo. */
function quoteGruppi(nome){
  const e=esLookup(nome), out={};
  const add=(m,q)=>{ const g=MUSCOLO_GRUPPO[normMuscolo(m)]; if(g) out[g]=Math.max(out[g]||0,q); };
  if(e){ (e.muscoli_primari||[]).forEach(m=>add(m,1));
         (e.muscoli_secondari||[]).forEach(m=>add(m,QUOTA_SECONDARI)); }
  if(!Object.keys(out).length){ const g=gruppoOf(nome); if(g) out[g]=1; }
  return out;
}

/* -- SPINTA / TRAZIONE (parte alta) --------------------------------------------
   Lo squilibrio che conta di più e che le schede sbagliano più spesso: quanto si
   spinge contro quanto si tira. Si deduce dal muscolo primario; per le spalle decide
   la compagnia (con trapezi o dorsali è lavoro posteriore, quindi trazione). Gambe e
   core non hanno una direzione utile in questa lettura e restano fuori dal conto. */
const SPINTA_PRIM   = {'pettorali':1, 'tricipiti':1};
const TRAZIONE_PRIM = {'gran dorsale':1, 'dorsali centrali':1, 'trapezi':1, 'bicipiti':1, 'avambracci':1};
const MUSCOLI_POST  = {'trapezi':1, 'dorsali centrali':1, 'gran dorsale':1};
function direzioneOf(nome){
  const e=esLookup(nome); if(!e) return '';
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
function rebuildEs(){ ESBYNAME={}; (DOC.esercizi||[]).forEach(e=>{ if(e&&e.nome) ESBYNAME[String(e.nome).trim()]=e; }); EX_BASE=DOC.esercizi||[]; }
function sedutaMap(rows){
  const byEx={};
  rows.forEach(r=>{ if(!r.esercizio)return; const g=r.giorno||'·'; (byEx[r.esercizio]=byEx[r.esercizio]||new Set()).add(g); });
  const out={};
  Object.keys(byEx).forEach(ex=>{ const days=[...byEx[ex]].sort((a,b)=>GIORNI.indexOf(a)-GIORNI.indexOf(b));
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
function _renameRows(rows){ let ch=false; (rows||[]).forEach(r=>{ if(r&&r.esercizio&&EX_RENAME[r.esercizio]){ r.esercizio=EX_RENAME[r.esercizio]; const g=gruppoOf(r.esercizio); if(g) r.macro=g; ch=true; } }); return ch; }
function migrateExNames(){
  let ch=false;
  ch = _renameRows(DOC.storico) || ch;
  if(DOC.scheda){ ['settimanale','mensile'].forEach(md=>{ ch=_renameRows(DOC.scheda[md])||ch; }); }
  return ch;
}
/* TL dei singoli set (in ordine) di un esercizio+seduta nell'ultima scheda salvata,
   per il confronto Δ TL set-per-set (set 1 vs set 1, set 2 vs set 2…). Esclude i test (★). */
function lastBlockSets(nome,seduta){
  if(!DOC.storico.length) return [];
  const maxS=Math.max(...DOC.storico.map(r=>+r.scheda||0));
  return DOC.storico.filter(r=>r.esercizio===nome && (+r.scheda)===maxS && (+(r.seduta||1))===seduta && !r.test).map(r=>sTL(r));
}
/* pesi dei singoli set (in ordine) dell'ultima scheda salvata: per il LED del co-pilota
   (confronto del peso digitato col set di pari posizione). Esclude i test (★). */
function lastBlockPesi(nome,seduta){
  if(!DOC.storico.length) return [];
  const maxS=Math.max(...DOC.storico.map(r=>+r.scheda||0));
  return DOC.storico.filter(r=>r.esercizio===nome && (+r.scheda)===maxS && (+(r.seduta||1))===seduta && !r.test).map(r=>+r.peso||0);
}

