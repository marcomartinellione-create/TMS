/* ════════════════ RICETTE PERSONALI e SUGGERIMENTI DI ALIMENTI (2026-11-13) ════════════════
   Richiesta di Marco:
   1. accanto ai nutrienti «fuori dai riferimenti in negativo» un piccolo simbolo che suggerisce
      gli alimenti che spiccano per quel nutriente;
   2. ricette personalizzate, una categoria nuova della banca alimenti: ingredienti, descrizione,
      tempi, procedimento — e soprattutto gli ingredienti che si SOMMANO per dare i valori
      nutritivi della ricetta.

   RICETTE. Stanno nel profilo, in DOC.alimentazione.ricette (alimentazione.json): viaggiano con
   backup, Annulla e cestino dei profili come i preferiti, senza toccare la persistenza. Una
   ricetta è usata nel piano come un alimento qualunque, per nome. I suoi valori per 100 g NON
   sono salvati: si ricalcolano dagli ingredienti a ogni lettura (foodLookup), così cambiare un
   ingrediente cambia subito la ricetta ovunque.
       totale[k]  = Σ ingredienti valore100[k] × grammi / 100
       per100[k]  = totale[k] / pesoFinale × 100      (pesoFinale = peso da cotto se indicato,
                                                        altrimenti somma dei grammi)
   Un nutriente che nessun ingrediente riporta resta «—» (null), non zero. Gli ingredienti sono
   solo alimenti della banca dati: niente ricette dentro ricette (niente giri viziosi).
   I periodi registrati conservano una copia delle ricette usate (p.ricette): restano una
   fotografia anche se poi la ricetta cambia. */
const RIC_KEYS=['kcal','proteine','grassi','saturi','monoinsaturi','polinsaturi','zuccheri','zucch','fibre','colesterolo',
  'vitA','vitB1','vitB2','vitB6','vitB12','vitC','vitD','vitE','folati','calcio','ferro','magnesio','potassio','zinco','sodio','iodio','fosforo'];
const RIC_CATEGORIA='Le mie ricette';
function ricetteList(){ const A=DOC.alimentazione||(DOC.alimentazione={}); if(!Array.isArray(A.ricette)) A.ricette=[]; return A.ricette; }
function ricettaPerNome(nome, lista){ nome=String(nome==null?'':nome).trim(); if(!nome) return null;
  return (lista||ricetteList()).find(r=>r&&String(r.nome).trim()===nome) || null; }
function ricettaPesoIngredienti(r){ return (r.ingredienti||[]).reduce((a,x)=>a+(+x.grammi||0),0); }
function ricettaPesoFinale(r){ const pf=+r.pesoFinale||0; return pf>0? pf : ricettaPesoIngredienti(r); }
/* totali della ricetta intera, per nutriente (null se nessun ingrediente lo riporta) */
function ricettaTotali(r){ const out={};
  RIC_KEYS.forEach(k=>{ let s=0, noto=false;
    (r.ingredienti||[]).forEach(x=>{ const f=FOODBYNAME[String(x.alimento||'').trim()]; if(!f) return; const v=f.per100[k];
      if(v!=null){ s+=v*(+x.grammi||0)/100; noto=true; } });
    out[k]= noto? s : null; });
  return out; }
/* la ricetta vista come un alimento della banca dati (stessa forma: nome, categoria, tipo, per100) */
function ricettaAlimento(r){
  const tot=ricettaTotali(r), pf=ricettaPesoFinale(r), per100={};
  RIC_KEYS.forEach(k=>{ per100[k]= (tot[k]==null||pf<=0)? null : tot[k]/pf*100; });
  return {nome:String(r.nome).trim(), categoria:RIC_CATEGORIA, tipo:'M', fonte:'ricetta', densita:null, per100:per100, ricetta:r}; }
/* ricerca di un alimento: banca dati, poi le ricette del profilo (o quelle passate, per i periodi) */
function foodLookup(nome, ricette){
  const n=String(nome==null?'':nome).trim(); if(!n) return null;
  const f=FOODBYNAME[n]; if(f) return f;
  const r=(ricette&&ricettaPerNome(n, ricette)) || ricettaPerNome(n); return r? ricettaAlimento(r) : null; }
function ricetteComeAlimenti(){ return ricetteList().filter(r=>r&&String(r.nome||'').trim()).map(ricettaAlimento)
  .sort((a,b)=>a.nome.localeCompare(b.nome)); }
/* dove è usata una ricetta: righe dei piani (tre fasi) e periodi registrati */
function ricettaUsi(nome){ const A=DOC.alimentazione||{}; let righe=0, periodi=0;
  ['bulk','mant','cut'].forEach(f=>(A[f]||[]).forEach(r=>{ if(r&&String(r.alimento||'').trim()===nome) righe++; }));
  (A.periodi||[]).forEach(p=>{ if((p.righe||[]).some(r=>String(r.alimento||'').trim()===nome)) periodi++; });
  return {righe:righe, periodi:periodi}; }
/* le ricette usate in un elenco di righe, copiate (per la fotografia dei periodi) */
function ricetteUsateIn(righe){ const out=[];
  (righe||[]).forEach(x=>{ const r=ricettaPerNome(x.alimento); if(r && !out.some(o=>o.nome===r.nome)) out.push(JSON.parse(JSON.stringify(r))); });
  return out; }

/* ── EDITOR DELLA RICETTA ─────────────────────────────────────────────────────────
   Si lavora su una BOZZA: il riquadro si ridisegna quando si aggiunge un ingrediente (il
   selettore degli alimenti lo sostituisce per un momento), quindi i campi scritti si
   rileggono nella bozza prima di ogni cambio di vista. Si salva solo con «Salva». */
let ricBozza=null;            /* {r: copia di lavoro, orig: nome originale o '', dopo: funzione} */
function ricettaNuova(){ return {id:'ric-'+Date.now().toString(36), nome:'', descrizione:'', procedimento:'', note:'',
  porzioni:1, tempoPrep:'', tempoCottura:'', pesoFinale:'', ingredienti:[]}; }
function apriRicetta(nome, dopo){
  const r=nome? ricettaPerNome(nome) : null;
  ricBozza={r: r? JSON.parse(JSON.stringify(r)) : ricettaNuova(), orig: r? r.nome : '', dopo: dopo||null};
  disegnaRicetta();
}
function leggiCampiRicetta(){ if(!ricBozza) return; const g=id=>document.getElementById(id); const r=ricBozza.r;
  if(!g('ric-nome')) return;
  r.nome=g('ric-nome').value; r.descrizione=g('ric-desc').value; r.procedimento=g('ric-proc').value; r.note=g('ric-note').value;
  r.porzioni=g('ric-porz').value===''?'':+g('ric-porz').value; r.tempoPrep=g('ric-prep').value===''?'':+g('ric-prep').value;
  r.tempoCottura=g('ric-cott').value===''?'':+g('ric-cott').value; r.pesoFinale=g('ric-peso').value===''?'':+g('ric-peso').value;
  document.querySelectorAll('#modal [data-ring]').forEach(inp=>{ const i=+inp.dataset.ring; if(r.ingredienti[i]) r.ingredienti[i].grammi=inp.value===''?'':+inp.value; });
}
function disegnaRicetta(){
  const B=ricBozza; if(!B) return; const r=B.r;
  const tot=ricettaTotali(r), pIng=ricettaPesoIngredienti(r), pf=ricettaPesoFinale(r), porz=Math.max(1,+r.porzioni||1);
  const v=(x,d)=>x==null?'—':nf(x,d);
  const righe=(r.ingredienti||[]).map((x,i)=>{ const f=FOODBYNAME[String(x.alimento||'').trim()], g=+x.grammi||0, q=k=>f&&f.per100[k]!=null? f.per100[k]*g/100 : null;
    return `<tr><td class="l">${esc(x.alimento)}${f?'':` <span class="pill" style="color:var(--danger)">${t('non in banca dati')}</span>`}</td>
      <td><input class="cell-in" type="number" min="0" data-ring="${i}" value="${x.grammi??''}" style="width:64px"></td>
      <td class="num">${v(q('kcal'),0)}</td><td class="num">${v(q('proteine'),1)}</td><td class="num">${v(q('grassi'),1)}</td><td class="num">${v(q('zuccheri'),1)}</td><td class="num">${v(q('fibre'),1)}</td>
      <td><button class="btn btn--sm btn--danger" data-rdel="${i}" title="${t('togli ingrediente')}">✕</button></td></tr>`; }).join('');
  const riga=(lab,div,cl)=>`<tr class="${cl||''}"><td class="l"><b>${lab}</b></td><td class="num">${div===1?nf(pIng,0)+' g':''}</td>${['kcal','proteine','grassi','zuccheri','fibre'].map((k,j)=>`<td class="num"><b>${tot[k]==null?'—':nf(tot[k]/div,j?1:0)}</b></td>`).join('')}<td></td></tr>`;
  const per100=k=>tot[k]==null||pf<=0? null : tot[k]/pf*100;
  modal(`<h3>👨‍🍳 ${B.orig? t('Modifica ricetta') : t('Nuova ricetta')}</h3>
    <div class="row">
      <div class="field" style="flex:2"><label>${t('Nome della ricetta')}</label><input id="ric-nome" value="${esc(r.nome)}" placeholder="${t('es. Porridge proteico ai frutti rossi')}"></div>
      <div class="field"><label>${t('Porzioni')}</label><input id="ric-porz" type="number" min="1" step="1" value="${r.porzioni??1}"></div></div>
    <div class="row">
      <div class="field"><label>${t('Preparazione (min)')}</label><input id="ric-prep" type="number" min="0" value="${r.tempoPrep??''}"></div>
      <div class="field"><label>${t('Cottura (min)')}</label><input id="ric-cott" type="number" min="0" value="${r.tempoCottura??''}"></div>
      <div class="field"><label>${t('Peso finale da cotto (g)')}</label><input id="ric-peso" type="number" min="0" value="${r.pesoFinale??''}" placeholder="${nf(pIng,0)}"></div></div>
    <div class="lat-nota" style="margin:-4px 0 8px">${t('Il peso finale serve quando la cottura fa perdere o assorbire acqua (riso, pasta, carne): i valori per 100 g si calcolano su quello. Vuoto = somma degli ingredienti.')}</div>
    <div class="field"><label>${t('Descrizione')}</label><input id="ric-desc" value="${esc(r.descrizione||'')}" placeholder="${t('in una riga: cos’è e quando mangiarla')}"></div>
    <div class="sec" style="margin:12px 0 6px">${t('Ingredienti')} <span class="pill">${(r.ingredienti||[]).length}</span>
      <button class="btn btn--sm btn--ember" id="ric-add" style="margin-left:auto">${t('＋ Ingrediente')}</button></div>
    <div class="tbl-wrap"><table class="ric-tab"><thead><tr><th class="l">${t('Alimento')}</th><th>g</th><th>Kcal</th><th>Prot</th><th>${t('Grassi')}</th><th>Carbo</th><th>${t('Fibre')}</th><th></th></tr></thead>
      <tbody>${righe||`<tr><td colspan="8" class="empty">${t('Nessun ingrediente: aggiungine con «＋ Ingrediente».')}</td></tr>`}</tbody>
      ${righe?`<tfoot>${riga(t('Totale ricetta'),1,'ric-tot')}${porz>1?riga(t('Per porzione')+' ('+porz+')',porz,''):''}
        <tr><td class="l"><b>${t('Per 100 g')}</b> <span class="muted">(${t('su')} ${nf(pf,0)} g)</span></td><td></td>${['kcal','proteine','grassi','zuccheri','fibre'].map((k,j)=>`<td class="num"><b>${per100(k)==null?'—':nf(per100(k),j?1:0)}</b></td>`).join('')}<td></td></tr></tfoot>`:''}</table></div>
    <div class="field" style="margin-top:10px"><label>${t('Procedimento')}</label><textarea id="ric-proc" rows="5" placeholder="${t('un passaggio per riga')}">${esc(r.procedimento||'')}</textarea></div>
    <div class="field"><label>${t('Note')}</label><input id="ric-note" value="${esc(r.note||'')}" placeholder="${t('varianti, conservazione, consigli')}"></div>
    <div class="modal__actions">${B.orig?`<button class="btn btn--danger" id="ric-del">${t('🗑 Elimina')}</button>`:''}<span class="spacer"></span>
      <button class="btn" id="ric-no">${t('Annulla')}</button><button class="btn btn--ember" id="ric-ok">${t('Salva ricetta')}</button></div>`);
  const m=document.getElementById('modal'); if(m) m.style.maxWidth='820px';
  m.querySelectorAll('[data-ring]').forEach(inp=>{ inp.onchange=()=>{ leggiCampiRicetta(); disegnaRicetta(); }; });
  m.querySelectorAll('[data-rdel]').forEach(b=>b.onclick=()=>{ leggiCampiRicetta(); B.r.ingredienti.splice(+b.dataset.rdel,1); disegnaRicetta(); });
  document.getElementById('ric-add').onclick=()=>{ leggiCampiRicetta();
    apriSelettoreAlimenti({ senzaMie:true, titolo:t('Ingrediente per la ricetta'),
      scegli:nome=>{ B.r.ingredienti.push({alimento:nome, grammi:100}); disegnaRicetta(); },
      chiudi:()=>disegnaRicetta() }); };
  document.getElementById('ric-no').onclick=()=>{ ricBozza=null; chiudiRicetta(B.dopo); };
  document.getElementById('ric-ok').onclick=()=>{ leggiCampiRicetta(); salvaRicetta(); };
  const del=document.getElementById('ric-del'); if(del) del.onclick=()=>eliminaRicetta();
}
function chiudiRicetta(dopo){ if(typeof dopo==='function') dopo(); else { closeModal(); renderAlimentazione(); } }
function nomeRicettaValido(nome, orig){
  if(!nome) return t('Dai un nome alla ricetta.');
  if(FOODBYNAME[nome]) return t('C’è già un alimento della banca dati con questo nome: scegline un altro.');
  if(nome!==orig && ricettaPerNome(nome)) return t('Esiste già una ricetta con questo nome.');
  return ''; }
function salvaRicetta(){
  const B=ricBozza; if(!B) return; const r=B.r;
  r.nome=String(r.nome||'').trim();
  const err=nomeRicettaValido(r.nome, B.orig); if(err){ avviso(err); return; }
  if(!(r.ingredienti||[]).length){ avviso(t('Aggiungi almeno un ingrediente: i valori della ricetta sono la somma degli ingredienti.')); return; }
  r.ingredienti=r.ingredienti.filter(x=>x&&x.alimento).map(x=>({alimento:String(x.alimento).trim(), grammi:+x.grammi||0}));
  r.modificata=new Date().toISOString();
  const L=ricetteList(), i=B.orig? L.findIndex(x=>x.nome===B.orig) : -1;
  if(i>=0) L[i]=r; else { r.creata=r.modificata; L.push(r); }
  /* rinominata: il nome è la chiave nei piani e nei preferiti, va seguito (i periodi restano
     una fotografia: hanno la loro copia della ricetta col nome di allora) */
  if(B.orig && B.orig!==r.nome){ const A=DOC.alimentazione;
    ['bulk','mant','cut'].forEach(f=>(A[f]||[]).forEach(x=>{ if(x&&String(x.alimento||'').trim()===B.orig) x.alimento=r.nome; }));
    const fv=foodFavList(), k=fv.indexOf(B.orig); if(k>=0) fv[k]=r.nome; }
  persist('alimentazione'); ricBozza=null; chiudiRicetta(B.dopo);
}
async function eliminaRicetta(){
  const B=ricBozza; if(!B||!B.orig) return; const u=ricettaUsi(B.orig);
  const dove= u.righe? ' '+t('È usata in')+' '+u.righe+' '+t('righe del piano: resteranno col nome ma senza valori nutritivi.') : '';
  if(!await conferma(t('Eliminare la ricetta «')+B.orig+t('»?')+dove)) { disegnaRicetta(); return; }
  const L=ricetteList(), i=L.findIndex(x=>x.nome===B.orig); if(i>=0) L.splice(i,1);
  const fv=foodFavList(), k=fv.indexOf(B.orig); if(k>=0) fv.splice(k,1);
  persist('alimentazione'); ricBozza=null; chiudiRicetta(B.dopo);
}
/* scheda della ricetta dentro il dettaglio di una riga del piano */
function ricettaScheda(r){
  const tempi=[r.tempoPrep?t('preparazione')+' '+r.tempoPrep+' min':'', r.tempoCottura?t('cottura')+' '+r.tempoCottura+' min':''].filter(Boolean).join(' · ');
  const passi=String(r.procedimento||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);
  return `<div class="ric-scheda"><div class="ric-scheda__testa"><b>👨‍🍳 ${esc(r.nome)}</b>${r.descrizione?` — <span>${esc(r.descrizione)}</span>`:''}
      <button class="btn btn--sm" data-ricedit="${esc(r.nome)}" style="margin-left:auto">✎ ${t('Modifica ricetta')}</button></div>
    <div class="muted" style="font-size:12px">${[tempi, (+r.porzioni>1? r.porzioni+' '+t('porzioni'):''), t('peso finale')+' '+nf(ricettaPesoFinale(r),0)+' g'].filter(Boolean).join(' · ')}</div>
    <div class="ric-scheda__ing">${(r.ingredienti||[]).map(x=>`<span class="pill">${esc(x.alimento)} · ${nf(x.grammi,0)} g</span>`).join(' ')}</div>
    ${passi.length?`<ol class="ric-scheda__passi">${passi.map(p=>`<li>${esc(p)}</li>`).join('')}</ol>`:''}
    ${r.note?`<div class="muted" style="font-size:12px">${esc(r.note)}</div>`:''}</div>`;
}
/* elenco delle ricette (pulsante nella barra di Alimentazione) */
function ricetteModal(){
  const L=ricetteComeAlimenti();
  modal(`<h3>👨‍🍳 ${t('Le mie ricette')} <span class="pill" style="font-weight:400">${L.length}</span></h3>
    <div class="muted" style="font-size:12.5px;margin-bottom:8px">${t('Le ricette di questo profilo: si usano nel piano come un alimento (categoria «Le mie ricette» nel selettore) e i loro valori sono la somma degli ingredienti.')}</div>
    ${L.length?`<div class="tbl-wrap"><table><thead><tr><th class="l">${t('Ricetta')}</th><th>${t('ingredienti')}</th><th>${t('peso')}</th><th>Kcal/100 g</th><th>Prot/100 g</th><th>${t('usata')}</th><th></th></tr></thead><tbody>
      ${L.map(f=>{ const r=f.ricetta, u=ricettaUsi(f.nome); return `<tr><td class="l"><b>${esc(f.nome)}</b>${r.descrizione?`<div class="muted" style="font-size:11.5px">${esc(r.descrizione)}</div>`:''}</td>
        <td class="num">${(r.ingredienti||[]).length}</td><td class="num">${nf(ricettaPesoFinale(r),0)} g</td><td class="num">${f.per100.kcal==null?'—':nf(f.per100.kcal,0)}</td><td class="num">${f.per100.proteine==null?'—':nf(f.per100.proteine,1)}</td>
        <td class="num">${u.righe}</td><td><button class="btn btn--sm" data-riclist="${esc(f.nome)}">✎</button></td></tr>`; }).join('')}</tbody></table></div>`
      : `<div class="empty" style="padding:22px">${t('Nessuna ricetta. Creane una: scegli gli ingredienti dalla banca dati e i valori nutritivi si sommano da soli.')}</div>`}
    <div class="modal__actions"><button class="btn" onclick="closeModal()">${t('Chiudi')}</button><button class="btn btn--ember" id="ric-nuova">${t('＋ Nuova ricetta')}</button></div>`);
  document.getElementById('ric-nuova').onclick=()=>apriRicetta('', ricetteModal);
  document.querySelectorAll('#modal [data-riclist]').forEach(b=>b.onclick=()=>apriRicetta(b.dataset.riclist, ricetteModal));
}

/* ── SUGGERIMENTI: alimenti che spiccano per un nutriente scarso ────────────────────
   Ordinati per contenuto nel nutriente, per 100 g oppure per 100 kcal (densità). Restano
   fuori ciò che si mangia in quantità minime e falserebbe la classifica (spezie ed erbe
   essiccate, alghe secche, lievito, condimenti, tè in foglie, gomme da masticare, alimenti per
   l'infanzia) e gli integratori, salvo che si scelga di vederli. */
const SUGG_ESCLUSI=/^(Ingredienti e aiuti di cucina|Diversi|Acque e bevande|Bevande alcoliche|Alimenti per l.infanzia|Alimenti speciali|Integratori)|Erbe aromatiche|Dolciumi senza cioccolato|Sale, spezie/i;
/* erbe e alghe secche finite in altre categorie (es. «Rosmarino, secco» in Varie, «Alghe, Nori,
   secche» fra le verdure secche): restano fuori anche per nome. Legumi e frutta secchi restano. */
const SUGG_ERBE=/\b(alghe|nori|spirulina|wakame|kombu|agar|rosmarino|timo|basilico|origano|salvia|maggiorana|menta|prezzemolo|alloro|santoreggia|dragoncello|aneto|erba cipollina)\b/i;
function suggPocaQuantita(f){ const n=String(f.nome||''), c=String(f.categoria||'');
  return SUGG_ERBE.test(n) && (/secc|essiccat|polvere/i.test(n) || /Varie|Verdure secche|Erbe/i.test(c)); }
let suggStato={ordine:'g', ricette:false, integratori:false};
function suggerimenti(key, opz){ opz=opz||suggStato;
  const base=FOOD.filter(f=>{ const v=f.per100[key]; if(v==null||v<=0) return false;
    const tp=foodTipo(f); if(tp==='I') return !!opz.integratori; if(tp==='R' && !opz.ricette) return false;
    return !SUGG_ESCLUSI.test(String(f.categoria||'')) && !suggPocaQuantita(f); });
  const val=f=> opz.ordine==='kcal'? (f.per100.kcal>=20? f.per100[key]/f.per100.kcal*100 : -1) : f.per100[key];
  return base.filter(f=>val(f)>0).sort((a,b)=>val(b)-val(a)).slice(0,20).map(f=>({f:f, v:val(f)}));
}
function suggerisciAlimenti(key){
  const u=DOC.dati_utente||{}, fase=faseAlimActive(), rows=((DOC.alimentazione||{})[fase]||[]).filter(r=>r&&r.alimento);
  const ref=omsRef(u).find(x=>x[1]===key); if(!ref) return;
  const [lab,,,val,unit]=ref, giorno=rows.reduce((a,r)=>a+foodVal(r.alimento,r.grammi,key),0), manca=Math.max(0,val-giorno), dec=val<10?1:0;
  const pasti=[]; ((DOC.alimentazione||{})[fase]||[]).forEach(r=>{ const p=_pastoDi(r); if(!pasti.includes(p)) pasti.push(p); });
  const L=suggerimenti(key);
  modal(`<h3>💡 ${t('Alimenti ricchi di')} ${esc(t(lab))}</h3>
    <div class="callout callout--info" style="margin-top:4px"><div>${t('Nel piano')} <b>${esc(t(FASE_LAB[fase]||fase))}</b>: <b>${nf(giorno,dec)} ${unit}</b> ${t('al giorno su')} ${nf(val,dec)} ${unit} (${nf(val>0?giorno/val*100:0,0)}%). ${t('Mancano circa')} <b>${nf(manca,dec)} ${unit}</b>.</div></div>
    <div class="bar" style="margin:8px 0;gap:6px;flex-wrap:wrap">
      <button class="btn btn--sm${suggStato.ordine==='g'?' btn--ember':''}" data-sord="g">${t('per 100 g')}</button>
      <button class="btn btn--sm${suggStato.ordine==='kcal'?' btn--ember':''}" data-sord="kcal">${t('per 100 kcal')}</button>
      <label class="optchk" style="display:inline-flex;gap:5px;align-items:center;font-size:12.5px"><input type="checkbox" data-sopt="ricette"${suggStato.ricette?' checked':''} style="width:auto"> ${t('anche piatti e ricette')}</label>
      <label class="optchk" style="display:inline-flex;gap:5px;align-items:center;font-size:12.5px"><input type="checkbox" data-sopt="integratori"${suggStato.integratori?' checked':''} style="width:auto"> ${t('anche integratori')}</label>
      ${pasti.length?`<span class="spacer"></span><label style="font-size:12.5px">${t('Aggiungi a')} <select id="sugg-pasto">${pasti.map(p=>`<option value="${esc(p)}">${esc(t(p))}</option>`).join('')}</select></label>`:''}</div>
    <div class="tbl-wrap" style="max-height:52vh;overflow:auto"><table><thead><tr><th class="l">${t('Alimento')}</th><th>${esc(t(lab))} / 100 g</th><th>${t('% del riferimento')}</th><th>Kcal / 100 g</th>${suggStato.ordine==='kcal'?`<th>/ 100 kcal</th>`:''}${pasti.length?'<th></th>':''}</tr></thead><tbody>
      ${L.map(({f,v})=>`<tr><td class="l">${esc(f.nome)}<div class="muted" style="font-size:11px">${esc(f.categoria||'')}</div></td>
        <td class="num"><b>${nf(f.per100[key],dec)}</b> ${unit}</td><td class="num">${nf(val>0?f.per100[key]/val*100:0,0)}%</td><td class="num">${nf(f.per100.kcal,0)}</td>
        ${suggStato.ordine==='kcal'?`<td class="num">${nf(v,dec)} ${unit}</td>`:''}
        ${pasti.length?`<td><button class="btn btn--sm" data-sadd="${esc(f.nome)}" title="${t('aggiungi 100 g al pasto scelto')}">＋</button></td>`:''}</tr>`).join('')||`<tr><td colspan="6" class="empty">${t('Nessun alimento della banca dati riporta questo nutriente.')}</td></tr>`}
    </tbody></table></div>
    <div class="lat-nota">${t('Valori per 100 g dalla banca dati (Svizzera e Ciqual). Restano fuori spezie ed erbe essiccate, alghe secche, condimenti e simili, che si mangiano in quantità minime. «per 100 kcal» premia gli alimenti densi di quel nutriente rispetto alle calorie.')}</div>
    <div class="modal__actions"><button class="btn" onclick="closeModal()">${t('Chiudi')}</button></div>`);
  const m=document.getElementById('modal'); if(m) m.style.maxWidth='760px';
  m.querySelectorAll('[data-sord]').forEach(b=>b.onclick=()=>{ suggStato.ordine=b.dataset.sord; suggerisciAlimenti(key); });
  m.querySelectorAll('[data-sopt]').forEach(c=>c.onchange=()=>{ suggStato[c.dataset.sopt]=c.checked; suggerisciAlimenti(key); });
  m.querySelectorAll('[data-sadd]').forEach(b=>b.onclick=()=>{
    const sel=document.getElementById('sugg-pasto'), pasto=sel? sel.value : '';
    const rows2=DOC.alimentazione[fase]; let ult=-1; rows2.forEach((r,i)=>{ if(_pastoDi(r)===pasto) ult=i; });
    rows2.splice(ult+1,0,{pasto: pasto==='Senza pasto'?'':pasto, alimento:b.dataset.sadd, grammi:100});
    persist('alimentazione'); closeModal(); renderAlimentazione(); });
}
/* un solo ascoltatore per i pulsanti 💡 e ✎ ricetta: i pannelli si ridisegnano spesso */
document.addEventListener('click', ev=>{
  const el=ev.target && ev.target.closest && ev.target.closest('[data-sugg],[data-ricedit]');
  if(!el) return;
  if(el.dataset.sugg){ ev.preventDefault(); suggerisciAlimenti(el.dataset.sugg); }
  else if(el.dataset.ricedit){ ev.preventDefault(); apriRicetta(el.dataset.ricedit); }
});
