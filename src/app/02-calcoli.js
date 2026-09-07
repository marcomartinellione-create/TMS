/* ════════════════ CALCOLI ════════════════ */
function e1rmFormula(){ return (DOC&&DOC.dati_utente&&DOC.dati_utente.e1rm)||'epley'; }
function rm1(peso,rip){ peso=+peso||0; rip=+rip||0; if(peso<=0||rip<=0) return 0;
  const ep=peso*(1+rip/30);
  const br=(rip<37)? peso*36/(37-rip) : ep;
  const lo=peso*Math.pow(rip,0.10);
  const f=e1rmFormula();
  if(f==='brzycki') return br; if(f==='lombardi') return lo; if(f==='media') return (ep+br+lo)/3; return ep; }
function pct1rm(peso,rip){ const m=rm1(peso,rip); return m>0? (peso/m)*100:0; }
/* nota: il Training Load (TL) si calcola con sTL(r) (RIR-aware via effRip); la vecchia
   tl(serie,rip,peso,nome) non-effort-aware è stata rimossa perché inutilizzata. */
function fascia(p){
  if(p>=90)return['Forza','f-forza']; if(p>=80)return['Forza+Iper','f-ipf'];
  if(p>=70)return['Ipertrofia','f-iper']; if(p>=60)return['Resistenza','f-res'];
  if(p>=50)return['Metabolico','f-met']; return['—','f-none'];
}
/* valori calcolati al volo. Se il profilo ha useRir attivo, le reps efficaci = rip + RIR (effort-aware) */
function useRirActive(){ return !!(DOC && DOC.dati_utente && DOC.dati_utente.useRir); }
function useRpeActive(){ return !!(DOC && DOC.dati_utente && DOC.dati_utente.useRpe); }
function effRip(r){ return (+r.rip||0) + (useRirActive()? (+r.rir||0) : 0); }
/* ── peso del corpo per gli esercizi a corpo libero (trazioni, dip) ───────────
   Per una riga dello STORICO si usa il peso dell'epoca, non quello di oggi: un
   massimale di due anni fa va valutato col corpo di allora. Si cerca la misura
   della stessa scheda, altrimenti la più vicina (preferendo quelle precedenti),
   e in mancanza di misure si ripiega sul peso in anagrafica. Se non c'è nulla
   torna 0: l'app si comporta come prima, senza inventare numeri. */
function pesoCorpoScheda(code){
  const io=(DOC&&Array.isArray(DOC.storico_io))?DOC.storico_io.filter(r=>r&&+r.peso>0):[];
  const c=+code||0;
  if(io.length){
    if(c){
      const esatta=io.find(r=>(+r.scheda||0)===c); if(esatta) return +esatta.peso;
      const prima=io.filter(r=>(+r.scheda||0)<=c).sort((a,b)=>(+b.scheda||0)-(+a.scheda||0))[0];
      if(prima) return +prima.peso;                       /* misura più recente PRIMA di quella scheda */
      const dopo=io.slice().sort((a,b)=>(+a.scheda||0)-(+b.scheda||0))[0];
      if(dopo) return +dopo.peso;                          /* scheda anteriore a ogni misura: la prima nota */
    }
    const ultima=io.slice().sort((a,b)=>(+a.scheda||0)-(+b.scheda||0))[io.length-1];
    if(ultima) return +ultima.peso;                        /* scheda in corso (senza codice): peso più recente */
  }
  return +((DOC&&DOC.dati_utente&&DOC.dati_utente.peso)||0);
}
/* carico realmente mosso: zavorra + corpo dove ha senso */
function caricoEff(r){ return (+r.peso||0) + (isCorpoLibero(r&&r.esercizio)? pesoCorpoScheda(r&&r.scheda) : 0); }
function sRM(r){ return rm1(caricoEff(r), effRip(r)); }
function sPct(r){ return pct1rm(caricoEff(r), effRip(r)); }
function sTL(r){ const w=caricoEff(r); const p=pct1rm(w, effRip(r)); return (+r.serie||0)*(+r.rip||0)*w*(p/100)*fattore(r.esercizio); }
function isoWeek(d){
  d=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const day=d.getUTCDay()||7; d.setUTCDate(d.getUTCDate()+4-day);
  const ys=new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return {anno:d.getUTCFullYear(), sett:Math.ceil((((d-ys)/86400000)+1)/7)};
}
function schedaCode(anno,sett){ return anno*100+sett; }
function isoWeekMonday(anno,sett){ const jan4=new Date(Date.UTC(anno,0,4)); const dow=(jan4.getUTCDay()+6)%7; const mon=new Date(jan4); mon.setUTCDate(jan4.getUTCDate()-dow+(sett-1)*7); return mon; }
function schedaLabel(code){ code=+code||0; const anno=Math.floor(code/100), sett=code%100; if(!anno||sett<1||sett>53) return String(code).slice(2); const d=isoWeekMonday(anno,sett), p=n=>String(n).padStart(2,'0'); return p(d.getUTCDate())+'/'+p(d.getUTCMonth()+1)+'/'+String(d.getUTCFullYear()).slice(2); }
function nf(v,dec){ if(v===''||v==null||isNaN(v))return'—'; return (+v).toLocaleString('it-IT',{minimumFractionDigits:dec||0,maximumFractionDigits:dec||0}); }
function nfk(v){ if(v===''||v==null||isNaN(v))return'—'; v=+v; if(Math.abs(v)>=1000) return (v/1000).toLocaleString('it-IT',{minimumFractionDigits:1,maximumFractionDigits:1})+'k'; return nf(v,0); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

