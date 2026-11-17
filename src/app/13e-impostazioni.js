/* ════ ⚙ IMPOSTAZIONI GENERALI DELL'APP (2026-11-16, richiesta di Marco) ════
   L'ingranaggio in alto a destra, accanto al 📕, apre le impostazioni che valgono per tutta l'app
   (non per il profilo): stanno nel localStorage di questo computer, come la lingua. Per ora c'è
   l'aspetto: giorno o notte, e lo stile della notte fra tre. Il pulsante 🌙/☀ della barra resta
   la scorciatoia per passare da giorno a notte; di notte usa lo stile scelto qui. Dentro ci sono
   anche 📕 Guida e 🐞 Segnala, che prima avevano un'icona ciascuno nella barra: così in alto a
   destra restano tre comandi uguali — lingua, giorno/notte, ⚙ (Marco: «simmetrico»).
   Lo stile si scrive come data-notte sull'<html>: le palette stanno in 02-stili.css. */
const TEMI_NOTTE=[
  { id:'calda', nome:'Notte calda', desc:'Pergamena e brace su fondo scuro caldo: i colori di sempre del TMS.',
    c:{pag:'#151310', barra:'#100e0b', card:'#201c17', testo:'#eee6d7', acc:'#e57d3a', acc2:'#e3bb4c'} },
  { id:'grafite', nome:'Grafite', desc:'Grigio carbone neutro: gli accenti del TMS risaltano di più.',
    c:{pag:'#131415', barra:'#0d0e0f', card:'#1c1d1f', testo:'#ecebe7', acc:'#e8803c', acc2:'#e3bb4c'} },
  { id:'blu', nome:'Blu notte', desc:'Blu ardesia profondo, con titoli color crema.',
    c:{pag:'#10161d', barra:'#0b1016', card:'#18202a', testo:'#e8edf2', acc:'#ee8a45', acc2:'#e6c056'} }
];
/* 'erdtree' era il nome vecchio del tema chiaro: qualunque valore che non sia «notte» vale giorno */
function temaGet(){ try{ return localStorage.getItem('tms-theme')==='notte'? 'notte' : 'giorno'; }catch(e){ return 'giorno'; } }
function notteGet(){ try{ const v=localStorage.getItem('tms-notte'); return TEMI_NOTTE.some(x=>x.id===v)? v : 'calda'; }catch(e){ return 'calda'; } }
function applicaTema(md, stile){
  const h=document.documentElement, notte=(md==='notte');
  h.setAttribute('data-theme', notte? 'notte' : 'giorno');
  h.setAttribute('data-notte', stile||notteGet());
  const bt=document.getElementById('btn-theme');
  if(bt){ bt.textContent=notte? '☀' : '🌙'; bt.title=notte? t('Modalità giorno') : t('Modalità notte'); }
}
function temaSalva(md, stile){
  try{ localStorage.setItem('tms-theme', md==='notte'? 'notte' : 'giorno'); if(stile) localStorage.setItem('tms-notte', stile); }catch(e){}
  applicaTema(md, stile||notteGet());
}
/* anteprima in miniatura di uno stile: barra, riquadro con due righe di testo e quattro barrette */
function impAnteprima(c){
  return `<span class="imp-ant" style="background:${c.pag}" aria-hidden="true"><span class="imp-ant__barra" style="background:${c.barra}"></span>`+
    `<span class="imp-ant__card" style="background:${c.card}"><span class="imp-ant__riga" style="background:${c.testo}"></span><span class="imp-ant__riga imp-ant__riga--corta" style="background:${c.testo}"></span>`+
    `<span class="imp-ant__barre"><i style="background:${c.acc};height:62%"></i><i style="background:${c.acc2};height:88%"></i><i style="background:#62b483;height:46%"></i><i style="background:#b48fdc;height:72%"></i></span></span></span>`;
}
async function impostazioniModal(){
  /* telefono collegato: la cartella la sa il processo principale (solo app desktop) */
  let cartella=''; if(typeof telDisponibile==='function' && telDisponibile()){ try{ cartella=await window.tmsScambio.cartella(); }catch(e){} }
  /* si legge dall'<html>, cioè da ciò che si vede, non solo da ciò che è salvato */
  const h=document.documentElement, md=h.getAttribute('data-theme')==='notte'? 'notte' : 'giorno';
  const st=TEMI_NOTTE.some(x=>x.id===h.getAttribute('data-notte'))? h.getAttribute('data-notte') : notteGet();
  modal(`<h3>${t('⚙ Impostazioni')}</h3>
    <div class="muted" style="font-size:12.5px;margin:-6px 0 12px">${t('Valgono per tutta l\'app su questo computer, per tutti i profili.')}</div>
    <div class="imp-sez">
      <h4>${t('Aspetto')}</h4>
      <div class="imp-riga"><span>${t('Tema')}</span>
        <span class="gruppo"><button class="btn btn--sm${md==='giorno'?' is-on':''}" data-imp-tema="giorno">${t('☀ Giorno')}</button><button class="btn btn--sm${md==='notte'?' is-on':''}" data-imp-tema="notte">${t('🌙 Notte')}</button></span></div>
      <div class="imp-etich">${t('Stile della modalità notte')}</div>
      <div class="imp-temi">${TEMI_NOTTE.map(x=>`<button type="button" class="imp-tema${x.id===st?' is-on':''}" data-imp-notte="${x.id}">${impAnteprima(x.c)}<b>${esc(t(x.nome))}</b><span>${esc(t(x.desc))}</span></button>`).join('')}</div>
      <div class="lat-nota">${t('Il pulsante 🌙 in alto passa da giorno a notte; di notte usa lo stile scelto qui.')}</div>
    </div>
    ${telSezioneImpostazioni(cartella)}
    <div class="imp-sez">
      <h4>${t('Aiuto')}</h4>
      <div class="imp-aiuto">
        <button type="button" class="imp-voce" id="fab-guida" title="${t('Apri la guida')}"><i>📕</i><span><b>${t('Guida')}</b>${t('Come si usa l\'app, le formule e le fonti.')}</span></button>
        <button type="button" class="imp-voce" id="fab-segnala" title="${t('Segnala un problema o proponi un\'idea')}"><i>🐞</i><span><b>${t('Segnala')}</b>${t('Un problema o un\'idea: la scheda tecnica si allega da sola e vedi il testo prima di mandarlo.')}</span></button>
      </div>
    </div>
    <div class="modal__actions"><button class="btn btn--ember" id="imp-ok">${t('Chiudi')}</button></div>`);
  const m=document.getElementById('modal'); m.style.maxWidth='640px';
  m.querySelectorAll('[data-imp-tema]').forEach(b=>b.onclick=()=>{ temaSalva(b.dataset.impTema); impostazioniModal(); });
  /* scegliere uno stile della notte lo mostra subito: si passa alla notte con quello stile */
  m.querySelectorAll('[data-imp-notte]').forEach(b=>b.onclick=()=>{ temaSalva('notte', b.dataset.impNotte); impostazioniModal(); });
  document.getElementById('fab-guida').onclick=()=>{ closeModal(); showTab('guida'); };
  document.getElementById('fab-segnala').onclick=()=>segnalaModal();   /* prende il posto delle impostazioni */
  document.getElementById('imp-ok').onclick=closeModal;
  telAgganciaImpostazioni(()=>impostazioniModal());
}
