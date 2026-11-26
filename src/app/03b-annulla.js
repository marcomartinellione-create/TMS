/* ════════════════ ANNULLA / RIPRISTINA (Ctrl+Z · Ctrl+Y) ════════════════
   Ogni modifica ai dati passa da persist(quale): lì si confronta la parte toccata con
   com'era al salvataggio precedente e, se è cambiata, si mette da parte la versione di
   prima. Ctrl+Z la rimette (e la salva), Ctrl+Y rifà. Le modifiche ravvicinate alla stessa
   parte (le cifre di un numero, scritte una per volta) diventano un passo solo.
   - Solo il profilo aperto: cambiando profilo, o caricandone i dati, la pila si svuota.
   - Le foto restano fuori: annullare un'eliminazione rimetterebbe il riferimento a un file
     che non c'è più. Il cardio, le misure e i parametri del profilo invece ci sono.
   - Nelle finestre aperte e mentre si scrive in un campo di testo lungo o in una ricerca,
     Ctrl+Z resta quello normale del campo. */
const UNDO_MAX=40, UNDO_UNISCI_MS=1200;
let undoPila=[], redoPila=[], undoBase={}, undoUltimo={quale:null,ora:0}, undoInCorso=false;
const UNDO_PARTI={
  scheda:{ leggi:()=>DOC.scheda, scrivi:v=>{ DOC.scheda=v; }, nome:'la scheda Pesi' },
  storico:{ leggi:()=>DOC.storico, scrivi:v=>{ DOC.storico=v; }, nome:'lo Storico' },
  corpo:{ leggi:()=>({dati_utente:DOC.dati_utente,storico_io:DOC.storico_io,storico_rpe:DOC.storico_rpe,storico_risc:DOC.storico_risc,storico_fc:DOC.storico_fc,cardio:DOC.cardio,pesate:DOC.pesate,pesate_scartate:DOC.pesate_scartate}),
          scrivi:v=>{ DOC.dati_utente=v.dati_utente||{}; DOC.storico_io=v.storico_io||[]; DOC.storico_rpe=v.storico_rpe||[]; DOC.storico_risc=v.storico_risc||[]; DOC.storico_fc=v.storico_fc||[]; DOC.cardio=v.cardio||[]; DOC.pesate=v.pesate||[]; DOC.pesate_scartate=v.pesate_scartate||[]; },
          nome:'misure, cardio e profilo' },
  alimentazione:{ leggi:()=>DOC.alimentazione, scrivi:v=>{ DOC.alimentazione=v; }, nome:'l’alimentazione' },
  esercizi:{ leggi:()=>DOC.esercizi, scrivi:v=>{ DOC.esercizi=v; }, nome:'il catalogo esercizi' },
  ricette:{ leggi:()=>DOC.ricette, scrivi:v=>{ DOC.ricette=v; }, nome:'le ricette' },
};
function undoFoto(quale){ try{ return JSON.stringify(UNDO_PARTI[quale].leggi()); }catch(e){ return null; } }
/* punto di partenza: com'è ora ogni parte. Si chiama quando i dati arrivano da fuori
   (avvio, caricamento o cambio del profilo, ripristino di un backup) */
function undoAzzera(){ undoPila=[]; redoPila=[]; undoBase={}; undoUltimo={quale:null,ora:0};
  Object.keys(UNDO_PARTI).forEach(k=>{ undoBase[k]=undoFoto(k); }); }
/* chiamata da persist(): registra il «prima» della parte che è appena cambiata */
function undoRegistra(quale){
  const P=UNDO_PARTI[quale]; if(!P){ if(quale==='*') undoAzzera(); return; }
  const ora=undoFoto(quale), prima=undoBase[quale];
  if(ora==null||ora===prima) return;
  undoBase[quale]=ora;
  if(undoInCorso||prima==null) return;
  const adesso=Date.now();
  const unisci=undoPila.length && undoUltimo.quale===quale && adesso-undoUltimo.ora<UNDO_UNISCI_MS;
  undoUltimo={quale, ora:adesso};
  if(!unisci){ undoPila.push({quale, json:prima, profilo:activeProfile}); if(undoPila.length>UNDO_MAX) undoPila.shift(); }
  redoPila=[];
}
function undoPasso(da, verso, verbo){
  let p=da.pop(); while(p && p.profilo!==activeProfile) p=da.pop();
  if(!p) return false;
  const P=UNDO_PARTI[p.quale];
  verso.push({quale:p.quale, json:undoFoto(p.quale), profilo:activeProfile});
  P.scrivi(JSON.parse(p.json));
  undoUltimo={quale:null,ora:0};
  undoInCorso=true; try{ persist(p.quale); } finally { undoInCorso=false; }
  undoBase[p.quale]=p.json;
  try{
    if(p.quale==='esercizi'){ rebuildEs(); fillDatalists(); }
    cruscottoInvalida(); renderAll(); updateStatusDots();
  }catch(e){ logErrore('annulla/ridisegno', e); }
  undoAvviso(verbo+' '+t(P.nome));
  return true;
}
function annulla(){ return undoPasso(undoPila, redoPila, t('Annullata una modifica:')); }
function ripristina(){ return undoPasso(redoPila, undoPila, t('Rifatta una modifica:')); }
let undoAvvisoTimer=null;
function undoAvviso(testo){
  let el=document.getElementById('undo-avviso');
  if(!el){ el=document.createElement('div'); el.id='undo-avviso'; el.className='undo-avviso no-print'; el.setAttribute('role','status'); document.body.appendChild(el); }
  el.innerHTML=esc(testo)+' <span class="muted">· Ctrl+Z / Ctrl+Y</span>'; el.classList.add('on');
  clearTimeout(undoAvvisoTimer); undoAvvisoTimer=setTimeout(()=>el.classList.remove('on'), 2600);
}
/* Ctrl+Z / Ctrl+Y (anche Ctrl+Maiusc+Z) su tutta la pagina */
function undoTasti(e){
  if(!(e.ctrlKey||e.metaKey)||e.altKey) return;
  const k=String(e.key||'').toLowerCase();
  const indietro=k==='z'&&!e.shiftKey, avanti=k==='y'||(k==='z'&&e.shiftKey);
  if(!indietro&&!avanti) return;
  const bk=document.getElementById('modal-bk'); if(bk&&!bk.classList.contains('hidden')) return;
  const a=document.activeElement;
  if(a && (a.isContentEditable || a.tagName==='TEXTAREA' || (a.tagName==='INPUT' && (a.type==='search'||a.classList.contains('search'))))) return;
  if(!(indietro? undoPila : redoPila).some(p=>p.profilo===activeProfile)) return;
  e.preventDefault();
  if(a && a!==document.body && a.blur) a.blur();   /* chiude il campo: il suo valore viene registrato prima di tornare indietro */
  if(indietro) annulla(); else ripristina();
}
