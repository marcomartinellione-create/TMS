/* ════════════════ CORPO › RECUPERO: sonno e dati del giorno dal bracciale ════════════════
   2026-11-26, BOZZA da far approvare a Marco (studio del bracciale in Doc/bracciale/PROPOSTA.md, fasi 2–3).
   Il bracciale (Amazfit Helio Strap) calcola da sé sonno e fasi, HRV, SpO2, stress, temperatura della
   pelle, passi: l'app del telefono li legge e li manda al PC attraverso l'hub, come le pesate. Qui si
   conservano in DOC.recupero (corpo.json) e si mostrano in fondo alla colonna di destra del tab Corpo.
   Decisione di Marco (26/11/2026): sonno e recupero stanno nel tab Corpo, non in un tab nuovo.

   DOC.recupero = {notti:[notte…], giorni:[giorno…]}
   - notte (evento tms-sonno): una per giorno, id = giorno del RISVEGLIO 'AAAA-MM-GG'; se ne arriva una
     nuova per lo stesso giorno prende il posto della vecchia (il bracciale ricalcola la notte).
       {id, inizio:'AAAA-MM-GGTHH:MM', fine:'AAAA-MM-GGTHH:MM' (ora locale del telefono),
        fasi:[[da,a,tipo]…] in minuti dall'inizio, tipo 'leggero'|'profondo'|'rem'|'sveglio',
        punteggio 0–100 (quello del bracciale); facoltativi: sonnellini:[{inizio,fine}],
        spo2 (media della notte, %), resp (atti al minuto), hrv (RMSSD della notte, ms)}
   - giorno (evento tms-giorno): uno per data, i valori misurati di notte vanno al giorno del risveglio.
       {data, passi, fcRiposo, rmssd, sdnn (ms), spo2Min, spo2Med (%), stressMed, stressMax (0–100,
        indice di Zepp), tempPelle (°C della pelle, valore assoluto), resp, pai, batteria}. Solo data
        è obbligatoria.
   VALORI DERIVATI MAI SALVATI: minuti per fase, ore dormite, medie, «il suo solito» (media ± una
   deviazione standard dei 30 giorni prima), scarti e medie della settimana si ricalcolano a ogni disegno.
   Niente punteggio di «prontezza» inventato da noi: si mostrano i valori del bracciale e quanto si
   scostano dal solito di QUESTO cliente. */

const REC_FASI=['profondo','leggero','rem','sveglio'];   /* dal basso in alto nelle barre */
const REC_FASE={profondo:{nome:'Profondo', col:'var(--c-viola)'}, leggero:{nome:'Leggero', col:'var(--c-terra)'},
  rem:{nome:'REM', col:'var(--c-oro)'}, sveglio:{nome:'Sveglio', col:'var(--danger-b)'}};
/* intervalli accettati: un valore fuori (o non numerico) si scarta, il resto del giorno o della notte resta */
const REC_GIORNO_NUM={passi:[0,100000], fcRiposo:[25,120], rmssd:[3,300], sdnn:[3,400], spo2Min:[50,100], spo2Med:[70,100],
  stressMed:[0,100], stressMax:[0,100], tempPelle:[25,42], resp:[4,40], pai:[0,1000], batteria:[0,100]};
const REC_NOTTE_NUM={punteggio:[0,100], spo2:[70,100], resp:[4,40], hrv:[3,300]};

const recDue=n=>String(n).padStart(2,'0');
function recDataOk(s){ s=String(s==null?'':s).slice(0,10); return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s+'T12:00:00').getTime())? s : ''; }
function recOraOk(s){ s=String(s==null?'':s).slice(0,16); return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) && !isNaN(new Date(s).getTime())? s : ''; }
/* minuti davvero passati fra due ore locali (la notte del cambio d'ora dura un'ora in più o in meno) */
function recMinuti(a,b){ return Math.round((new Date(b)-new Date(a))/60000); }
function recYmd(d){ return d.getFullYear()+'-'+recDue(d.getMonth()+1)+'-'+recDue(d.getDate()); }
function recPiuGiorni(data,n){ const d=new Date(data+'T12:00:00'); d.setDate(d.getDate()+n); return recYmd(d); }
function recNumeri(src,regole,out){
  Object.keys(regole).forEach(k=>{ const v=+src[k], r=regole[k];
    if(src[k]!==''&&src[k]!=null&&isFinite(v)&&v>=r[0]&&v<=r[1]) out[k]=v; });
  return out;
}

/* MIGRAZIONE (idempotente, senza perdite): un corpo.json di prima non ha `recupero`; uno rovinato
   può averlo di un tipo sbagliato. Si garantisce solo la forma {notti:[], giorni:[]}: le voci restano
   come sono (le si controlla quando arrivano, in recuperoUnisci), le altre chiavi pure. */
function recuperoNorm(r){
  r=(r&&typeof r==='object'&&!Array.isArray(r))? r : {};
  const L=x=>Array.isArray(x)? x.filter(e=>e&&typeof e==='object'&&!Array.isArray(e)) : [];
  return Object.assign({}, r, {notti:L(r.notti), giorni:L(r.giorni)});
}
function pulisciNotte(n){
  if(!n||typeof n!=='object') return null;
  const inizio=recOraOk(n.inizio), fine=recOraOk(n.fine); if(!inizio||!fine) return null;
  const tot=recMinuti(inizio,fine); if(!(tot>=20&&tot<=20*60)) return null;
  const id=recDataOk(n.id)||fine.slice(0,10);
  /* fasi in minuti dall'inizio; un'ora di tolleranza in fondo per la notte del cambio d'ora */
  const fasi=(Array.isArray(n.fasi)?n.fasi:[]).map(f=>Array.isArray(f)? [Math.round(+f[0]),Math.round(+f[1]),String(f[2]||'')] : null)
    .filter(f=>f&&isFinite(f[0])&&isFinite(f[1])&&f[0]>=0&&f[1]>f[0]&&f[1]<=tot+60&&REC_FASI.indexOf(f[2])>=0)
    .sort((a,b)=>a[0]-b[0]);
  const out=recNumeri(n, REC_NOTTE_NUM, {id:id, inizio:inizio, fine:fine, fasi:fasi});
  if(Array.isArray(n.sonnellini)){
    const s=n.sonnellini.map(x=>x&&typeof x==='object'? {inizio:recOraOk(x.inizio), fine:recOraOk(x.fine)} : null)
      .filter(x=>x&&x.inizio&&x.fine&&recMinuti(x.inizio,x.fine)>0&&recMinuti(x.inizio,x.fine)<=240);
    if(s.length) out.sonnellini=s;
  }
  return out;
}
function pulisciGiorno(g){
  if(!g||typeof g!=='object') return null;
  const data=recDataOk(g.data); if(!data) return null;
  return recNumeri(g, REC_GIORNO_NUM, {data:data});
}
/* unione di notti e giorni arrivati dal telefono, su un profilo qualsiasi (T = DOC o il corpo.json di
   un cliente non aperto, come pesateUnisci). Stesso giorno = quello nuovo prende il posto del vecchio:
   il bracciale ricalcola la notte e il riassunto del giorno cresce man mano (i passi).
   Per ora la chiamano solo le prove e l'anteprima coi dati finti: la userà l'arrivo degli eventi
   tms-sonno e tms-giorno dal telefono (15c-telefono.js, prossima fase del bracciale). */
/* exported recuperoUnisci */
function recuperoUnisci(T, arrivati){
  const ris={notti:0, giorni:0, nonValidi:0};
  T.recupero=recuperoNorm(T.recupero); arrivati=arrivati||{};
  const unisci=(lista, nuovi, pulisci, chiave)=>{
    const M=new Map(lista.map(x=>[String(x[chiave]), x]));
    let n=0; (Array.isArray(nuovi)?nuovi:[]).forEach(x=>{ const p=pulisci(x); if(!p){ ris.nonValidi++; return; } M.set(p[chiave], p); n++; });
    return {lista:[...M.values()].sort((a,b)=>String(a[chiave]).localeCompare(String(b[chiave]))), n:n};
  };
  const a=unisci(T.recupero.notti, arrivati.notti, pulisciNotte, 'id'), b=unisci(T.recupero.giorni, arrivati.giorni, pulisciGiorno, 'data');
  T.recupero.notti=a.lista; T.recupero.giorni=b.lista; ris.notti=a.n; ris.giorni=b.n;
  return ris;
}

/* ── calcoli al volo (mai salvati) ── */
function notteMinuti(n){ const m={profondo:0, leggero:0, rem:0, sveglio:0};
  ((n&&n.fasi)||[]).forEach(f=>{ if(m[f[2]]!=null) m[f[2]]+=Math.max(0,f[1]-f[0]); }); return m; }
function notteALetto(n){ const ult=((n&&n.fasi)||[]).reduce((a,f)=>Math.max(a,f[1]),0); return Math.max(recMinuti(n.inizio,n.fine)||0, ult); }
/* tempo dormito = le tre fasi del sonno; senza fasi, il tempo a letto meno quello da svegli */
function notteDormito(n){ const m=notteMinuti(n), f=m.profondo+m.leggero+m.rem; return f>0? f : Math.max(0, notteALetto(n)-m.sveglio); }
/* un giorno per data: il riassunto del giorno (g) e la notte che finisce quel giorno (n) */
function recMappa(R){
  const M={}, voce=d=>M[d]||(M[d]={data:d, g:null, n:null});
  R.giorni.forEach(g=>{ const d=recDataOk(g.data); if(d) voce(d).g=g; });
  R.notti.forEach(n=>{ const d=recDataOk(n.id)||recDataOk(String(n.fine||'').slice(0,10)); if(d) voce(d).n=n; });
  return M;
}
/* il valore k di un giorno; HRV, SpO2 e respirazione della notte fanno da ripiego se il riassunto non li ha */
function recValore(x,k){
  if(!x) return null;
  const g=x.g||{}, n=x.n, P=(a,b)=>(a!=null&&a!=='')? a : b;
  const v= k==='rmssd'? P(g.rmssd, n&&n.hrv) : k==='spo2Med'? P(g.spo2Med, n&&n.spo2) : k==='resp'? P(g.resp, n&&n.resp)
    : k==='dormito'? (n? notteDormito(n)/60 : null) : k==='punteggio'? (n? n.punteggio : null) : g[k];
  return (v==null||v===''||!isFinite(+v))? null : +v;
}
/* «il suo solito»: media ± una deviazione standard dei valori dei 30 giorni PRIMA di `data` (quel giorno
   escluso, così non si confronta con sé stesso). Sotto i 7 valori non si dice niente. */
function recSolito(M,k,data,giorni){
  giorni=giorni||30; const v=[];
  for(let i=1;i<=giorni;i++){ const y=recValore(M[recPiuGiorni(data,-i)],k); if(y!=null) v.push(y); }
  if(v.length<7) return null;
  const m=v.reduce((a,b)=>a+b,0)/v.length, ds=Math.sqrt(v.reduce((a,b)=>a+(b-m)*(b-m),0)/(v.length-1));
  return {media:m, ds:ds, n:v.length, lo:m-ds, hi:m+ds};
}
function recMedia(v){ v=v.filter(x=>x!=null&&isFinite(x)); return v.length? v.reduce((a,b)=>a+b,0)/v.length : null; }

/* ── scritte ── */
function recDurata(min){ min=Math.round(min||0); const h=Math.floor(min/60), m=min%60; return h? h+' h'+(m?' '+recDue(m):'') : m+' min'; }
function recOraPiu(inizio,min){ const d=new Date(new Date(inizio).getTime()+min*60000); return recDue(d.getHours())+':'+recDue(d.getMinutes()); }
function recEtich(d){ return d.slice(8,10)+'/'+d.slice(5,7); }
/* lo scarto dal solito, detto in chiaro; colorato solo quando esce dalla fascia */
function recScarto(v,sol,dec,unita){
  if(v==null) return '';
  if(!sol) return `<span class="muted">${t('il suo solito dopo 7 giorni')}</span>`;
  const fascia=`${nf(sol.lo,dec)}–${nf(sol.hi,dec)}`, d=v-sol.media;
  if(v>=sol.lo && v<=sol.hi) return `${t('nel suo solito')} <span class="muted">(${fascia})</span>`;
  return `<span class="recu-fuori">${nf(Math.abs(d),dec)}${unita?' '+unita:''} ${d<0?t('sotto il suo solito'):t('sopra il suo solito')}</span> <span class="muted">(${fascia})</span>`;
}

/* ── disegni (stessi tratti dei grafici dell'app: assi, griglia, scritte .lbl) ── */
/* ipnogramma della notte: una corsia per fase, i blocchi nel tempo e la linea a gradini che li unisce */
function recIpnogramma(n){
  const tot=notteALetto(n);
  if(!(tot>0)||!(n.fasi||[]).length) return `<div class="empty">${t('Le fasi di questa notte non sono arrivate.')}</div>`;
  const W=560, H=136, P={l:60,r:12,t:4,b:22}, ordine=['sveglio','rem','leggero','profondo'], cor=(H-P.t-P.b)/4;
  const X=m=>P.l+(W-P.l-P.r)*m/tot, Yc=k=>P.t+cor*ordine.indexOf(k)+cor/2;
  let g='';
  ordine.forEach((k,i)=>{ const y=P.t+cor*i;
    g+=`<rect x="${P.l}" y="${(y+1.5).toFixed(1)}" width="${W-P.l-P.r}" height="${(cor-3).toFixed(1)}" rx="4" fill="var(--paper-3)" opacity=".6"/>`+
       `<text class="lbl" x="${P.l-7}" y="${(y+cor/2+3).toFixed(1)}" text-anchor="end">${esc(t(REC_FASE[k].nome))}</text>`; });
  let d=''; n.fasi.forEach((f,i)=>{ const y=Yc(f[2]).toFixed(1); d+=(i?' L':'M')+X(f[0]).toFixed(1)+' '+y+' L'+X(f[1]).toFixed(1)+' '+y; });
  g+=`<path d="${d}" fill="none" stroke="var(--ink-4)" stroke-width="1" opacity=".75"/>`;
  n.fasi.forEach(f=>{ const x=X(f[0]), w=Math.max(1.4,X(f[1])-x), y=Yc(f[2])-cor*0.32;
    g+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${(cor*0.64).toFixed(1)}" rx="1.5" fill="${REC_FASE[f[2]].col}"><title>${esc(t(REC_FASE[f[2]].nome)+' · '+recOraPiu(n.inizio,f[0])+'–'+recOraPiu(n.inizio,f[1])+' ('+recDurata(f[1]-f[0])+')')}</title></rect>`; });
  /* le ore piene sotto (ogni ora; ogni due se la notte è lunghissima) */
  const i0=new Date(n.inizio), passo=tot>600?120:60; let m0=(60-i0.getMinutes())%60;
  g+=`<line class="axis" x1="${P.l}" y1="${H-P.b}" x2="${W-P.r}" y2="${H-P.b}"/>`;
  for(let m=m0;m<=tot;m+=passo){ const x=X(m); if(x<P.l+8||x>W-P.r-8) continue;
    g+=`<line x1="${x.toFixed(1)}" y1="${H-P.b}" x2="${x.toFixed(1)}" y2="${H-P.b+3}" stroke="var(--border)"/><text class="lbl" x="${x.toFixed(1)}" y="${H-8}" text-anchor="middle">${recOraPiu(n.inizio,m)}</text>`; }
  return `<svg class="recu-ipno" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
}
/* ore di sonno per notte, a barre divise per fase (dal basso: profondo, leggero, REM, sveglio) */
function recBarreSonno(date,M){
  const W=560, H=214, FS=9, P={l:34,r:12,t:12,b:24}, n=date.length;
  const righe=date.map(d=>{ const nt=M[d]&&M[d].n; return {d:d, n:nt, m:nt? notteMinuti(nt) : null}; });
  const tot=righe.map(r=>r.m? REC_FASI.reduce((a,k)=>a+r.m[k],0) : 0);
  if(!tot.some(v=>v>0)) return `<div class="empty">${t('Nessuna notte in questo periodo.')}</div>`;
  const mxH=Math.max(8, Math.ceil(Math.max(...tot)/60)), Y=h=>P.t+(H-P.t-P.b)*(1-h/mxH);
  const gap=(W-P.l-P.r)/n, bw=Math.min(gap*0.68, 38), cx=i=>P.l+gap*i+gap/2;
  let g='';
  for(let h=0;h<=mxH;h+=2){ const y=Y(h);
    g+=`<line class="grid" x1="${P.l}" y1="${y.toFixed(1)}" x2="${W-P.r}" y2="${y.toFixed(1)}"/><text class="lbl" x="${P.l-5}" y="${(y+3).toFixed(1)}" text-anchor="end">${h} h</text>`; }
  /* la media del periodo, tratteggiata e SOTTO le barre (il valore sta nel titolo del riquadro: scritto qui
     copriva le barre, e sopra le barre la linea tagliava le ore scritte in cima) */
  const med=recMedia(righe.filter(r=>r.n).map(r=>notteDormito(r.n)/60));
  if(med!=null && righe.filter(r=>r.n).length>1){ const y=Y(med).toFixed(1);
    g+=`<line x1="${P.l}" y1="${y}" x2="${W-P.r}" y2="${y}" stroke="var(--ink-2)" stroke-width="1.2" stroke-dasharray="5 4"><title>${esc(t('media dormito')+' '+recDurata(med*60))}</title></line>`; }
  righe.forEach((r,i)=>{ if(!r.m) return; let acc=0, s='';
    REC_FASI.forEach(k=>{ const v=r.m[k]/60; if(v<=0) return; const y1=Y(acc+v), y0=Y(acc);
      s+=`<rect x="${(cx(i)-bw/2).toFixed(1)}" y="${y1.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0,y0-y1).toFixed(1)}" fill="${REC_FASE[k].col}"/>`; acc+=v; });
    const tip=giornoPesata(r.d)+' · '+t('dormito')+' '+recDurata(notteDormito(r.n))+REC_FASI.map(k=>' · '+t(REC_FASE[k].nome)+' '+recDurata(r.m[k])).join('')+(r.n.punteggio!=null? ' · '+t('punteggio')+' '+r.n.punteggio : '');
    g+=`<g class="recu-barra"><title>${esc(tip)}</title>${s}</g>`;
    /* le ore sopra la barra (solo con poche barre), con un alone del colore del fondo: la linea della media non le taglia */
    if(n<=10) g+=`<text class="lbl" x="${cx(i).toFixed(1)}" y="${(Y(acc)-4).toFixed(1)}" text-anchor="middle" style="paint-order:stroke;stroke:var(--paper);stroke-width:3px;stroke-linejoin:round">${esc(recDurata(notteDormito(r.n)))}</text>`; });
  g+=grafEtichX(date.map(recEtich), cx, W, FS, Math.ceil(n/8), H-8);
  const leg=`<div class="lat-leg">${REC_FASI.map(k=>`<span><i style="background:${REC_FASE[k].col}"></i>${esc(t(REC_FASE[k].nome))}</span>`).join('')}</div>`;
  return `<svg class="recu-barre" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet"><line class="axis" x1="${P.l}" y1="${Y(0).toFixed(1)}" x2="${W-P.r}" y2="${Y(0).toFixed(1)}"/>${g}</svg>${leg}`;
}
/* un valore del giorno nel tempo, con la fascia del suo solito (lineChart dei grafici dell'app) */
function recAndamento(date,M,k,nome,col,unita,dec,sol){
  const lab=date.map(recEtich), dati=date.map(d=>({x:recEtich(d), y:recValore(M[d],k)}));
  const vals=dati.map(p=>p.y).filter(v=>v!=null);
  if(vals.length<2) return `<div class="empty">${t('Servono almeno 2 giorni con questo dato.')}</div>`;
  const fmt=v=>nf(v,dec)+(unita?' '+unita:'');
  const serie=[{name:nome, color:col, data:dati}];
  const o={labels:lab, h:150, fmtTip:fmt};
  if(sol){
    /* la media del suo solito è una linea tratteggiata (si legge anche passandoci col mouse); la fascia
       si disegna fin dove arriva la scala, che lineChart prende dai dati */
    serie.push({name:t('il suo solito'), color:'var(--ink-3)', dash:'5 4', spess:1.2, punti:false, data:date.map(d=>({x:recEtich(d), y:sol.media}))});
    const tutti=vals.concat([sol.media]), mn0=Math.min(...tutti), mx0=Math.max(...tutti), pad=((mx0-mn0)||2)*0.08;
    const lo=Math.max(sol.lo, mn0-pad), hi=Math.min(sol.hi, mx0+pad);
    if(hi>lo) o.band=[lo, hi];
  }
  return lineChart(serie, o);
}

/* ── la sezione ── */
let recuperoPer=30;   /* giorni nei grafici dell'andamento: 7 o 30 (scelta di vista, uguale per tutti i profili) */
function htmlRecupero(){
  /* si disegna solo quello che passa i controlli (la migrazione lascia le voci come sono: una notte rovinata
     in un file non deve rompere il tab); la pulizia qui serve al disegno e non si salva */
  const R0=recuperoNorm(DOC.recupero), R={notti:R0.notti.map(pulisciNotte).filter(Boolean), giorni:R0.giorni.map(pulisciGiorno).filter(Boolean)};
  if(!R.notti.length && !R.giorni.length)
    return `<div class="sec recu-sec">${t('Recupero')}</div>
      <div class="recu-vuoto">${ico('luna')}<span>${t('Sonno, HRV e battito a riposo compaiono qui quando il cliente porta un bracciale collegato all’app del telefono.')}</span></div>`;
  const M=recMappa(R), tutte=Object.keys(M).sort(), ultimo=tutte[tutte.length-1];
  const date=[]; for(let i=recuperoPer-1;i>=0;i--) date.push(recPiuGiorni(ultimo,-i));
  const oggi=recYmd(new Date()), fa=Math.round((new Date(oggi+'T12:00:00')-new Date(ultimo+'T12:00:00'))/86400000);
  const quando= fa<=0? t('oggi') : fa===1? t('ieri') : fa+' '+t('giorni fa');
  const X=M[ultimo], V=k=>recValore(X,k), S=k=>recSolito(M,k,ultimo);

  /* riquadri dell'ultimo giorno */
  const hrv=V('rmssd'), fc=V('fcRiposo'), spo=V('spo2Med'), spoMin=V('spo2Min'), tp=V('tempPelle'), rsp=V('resp'), stM=V('stressMed'), stX=V('stressMax'), pas=V('passi');
  const solTp=S('tempPelle');
  const passi7=recMedia(Array.from({length:7},(_,i)=>recValore(M[recPiuGiorni(ultimo,-i)],'passi')));
  const tess=(cls,nome,val,unita,sub)=>`<div class="card ${cls}"><div class="card__k">${nome}</div><div class="card__v">${val}${unita&&val!=='—'?`<small> ${unita}</small>`:''}</div><div class="card__sub">${sub||''}</div></div>`;
  const tpScarto=(tp!=null&&solTp)? tp-solTp.media : null;
  const tessere=[
    tess('k--violet', t('HRV (RMSSD)'), nf(hrv,0), 'ms', recScarto(hrv,S('rmssd'),0,'ms')),
    tess('k--danger', t('FC a riposo'), nf(fc,0), 'bpm', recScarto(fc,S('fcRiposo'),0,'bpm')),
    tess('', t('SpO2 notturna'), nf(spo,0), '%', spoMin!=null? `${t('minima')} ${nf(spoMin,0)} %` : ''),
    tess('k--ember', t('Temperatura pelle'), tpScarto!=null? (tpScarto>=0.05?'+':tpScarto<=-0.05?'−':'')+nf(Math.abs(tpScarto),1) : nf(tp,1), '°C',
      tpScarto!=null? (Math.abs(tpScarto)<=solTp.ds? `${t('dal suo solito, nella fascia')} <span class="muted">(±${nf(solTp.ds,1)})</span>` : `<span class="recu-fuori">${t('fuori dal suo solito')}</span> <span class="muted">(±${nf(solTp.ds,1)})</span>`)
        : `<span class="muted">${t('lo scarto dal suo solito dopo 7 giorni')}</span>`),
    tess('', t('Respirazione'), nf(rsp,1), t('/min'), recScarto(rsp,S('resp'),1,'')),
    tess('', t('Stress medio'), nf(stM,0), '', stX!=null? `${t('massimo')} ${nf(stX,0)} <span class="muted">· ${t('scala 0–100')}</span>` : ''),
    tess('k--ok', t('Passi'), nf(pas,0), '', passi7!=null? `${t('media 7 giorni')} ${nf(passi7,0)}` : '')];

  /* ultima notte */
  const notti=R.notti.filter(n=>recDataOk(n.id)).slice().sort((a,b)=>a.id.localeCompare(b.id)), nt=notti[notti.length-1];
  let notteHtml='';
  if(nt){
    const m=notteMinuti(nt), dorm=notteDormito(nt), conFasi=(nt.fasi||[]).length>0;
    const sotto=REC_FASI.filter(k=>k!=='sveglio').reduce((a,k)=>a+m[k],0)||1;
    notteHtml=`<div class="lat recu-notte"><h4>${t('Ultima notte')} <span class="muted">${esc(giornoPesata(nt.inizio.slice(0,10)))} → ${esc(giornoPesata(nt.id))}</span></h4>
      <div class="recu-notte__num">
        <div><span>${t('Dormito')}</span><b>${esc(recDurata(dorm))}</b></div>
        <div><span>${t('A letto')}</span><b>${esc(nt.inizio.slice(11,16))} → ${esc(nt.fine.slice(11,16))}</b></div>
        <div><span>${t('Punteggio')}</span><b>${nt.punteggio!=null? nf(nt.punteggio,0) : '—'}</b><small>${nt.punteggio!=null? t('su 100, del bracciale') : ''}</small></div>
      </div>
      ${recIpnogramma(nt)}
      ${conFasi? `<div class="recu-fasi">${REC_FASI.map(k=>`<div><i style="background:${REC_FASE[k].col}"></i><span>${esc(t(REC_FASE[k].nome))}</span><b>${esc(recDurata(m[k]))}${k==='sveglio'? '' : ` <small>${nf(100*m[k]/sotto,0)} %</small>`}</b></div>`).join('')}</div>` : ''}
      ${(nt.sonnellini||[]).length? `<div class="lat-nota">${t('Sonnellino')}: ${nt.sonnellini.map(s=>esc(s.inizio.slice(11,16)+'–'+s.fine.slice(11,16))+' ('+esc(recDurata(recMinuti(s.inizio,s.fine)))+')').join(', ')}</div>` : ''}
    </div>`;
  }

  /* andamento */
  const solH=S('rmssd'), solF=S('fcRiposo');
  const dormPer=recMedia(date.map(d=>recValore(M[d],'dormito')));
  const sonno=`<div class="chart-box"><h4>${t('Sonno per fase')} <span class="muted">${t('ore per notte')}${dormPer!=null? ' · '+t('media')+' '+esc(recDurata(dormPer*60))+' <span class="recu-tratto"></span>' : ''}</span></h4>${recBarreSonno(date,M)}</div>`;
  const grHrv=`<div class="chart-box"><h4>${t('HRV (RMSSD)')} <span class="muted">ms</span></h4>${recAndamento(date,M,'rmssd','RMSSD','var(--violet)','ms',0,solH)}</div>`;
  const grFc=`<div class="chart-box"><h4>${t('FC a riposo')} <span class="muted">bpm</span></h4>${recAndamento(date,M,'fcRiposo',t('FC a riposo'),'var(--danger-b)','bpm',0,solF)}</div>`;

  /* media della settimana, accanto alle misure del Corpo (che ragionano a settimane) */
  const perSett={}; tutte.forEach(d=>{ const w=isoWeek(new Date(d+'T12:00:00')), c=schedaCode(w.anno,w.sett); (perSett[c]=perSett[c]||[]).push(d); });
  const io=DOC.storico_io||[];
  const settimane=Object.keys(perSett).map(Number).sort((a,b)=>b-a).slice(0,6).map(c=>{
    const ds=perSett[c], media=k=>recMedia(ds.map(d=>recValore(M[d],k))), r=io.find(x=>(+x.scheda)===c);
    return `<tr><td>${esc(schedaLabel(c))}</td><td class="num">${ds.filter(d=>M[d].n).length}</td>
      <td class="num">${media('dormito')!=null? esc(recDurata(media('dormito')*60)) : '—'}</td><td class="num">${nf(media('punteggio'),0)}</td>
      <td class="num">${nf(media('rmssd'),0)}</td><td class="num">${nf(media('fcRiposo'),0)}</td><td class="num">${nf(media('passi'),0)}</td>
      <td class="num recu-col-corpo">${r? nf(r.peso,1) : '—'}</td><td class="num">${r&&+r.massa_grassa? nf(r.massa_grassa*100,1) : '—'}</td></tr>`; }).join('');
  const tabella=`<div class="tbl-wrap"><table class="recu-sett"><thead>
      <tr><th rowspan="2">${t('Settimana del')}</th><th colspan="6" class="recu-gruppo">${t('Recupero · media dei giorni')}</th><th colspan="2" class="recu-gruppo recu-col-corpo">${t('Misure del Corpo')}</th></tr>
      <tr><th>${t('Notti')}</th><th>${t('Sonno')}</th><th>${t('Punteggio')}</th><th>${t('HRV ms')}</th><th>${t('FC riposo')}</th><th>${t('Passi')}</th><th class="recu-col-corpo">${t('Peso')}</th><th>${t('M.grassa%')}</th></tr>
    </thead><tbody>${settimane}</tbody></table></div>`;

  return `<div class="sec recu-sec">${t('Recupero')} <span class="pill">${t('dal bracciale')}</span>
      <span class="recu-agg${fa>2?' recu-fuori':''}">${t('ultimo dato')}: ${esc(giornoPesata(ultimo))} · ${esc(quando)}</span>
      <select id="recu-per" class="recu-per no-print" aria-label="${esc(t('Periodo dei grafici'))}"><option value="7"${recuperoPer===7?' selected':''}>${t('Ultimi 7 giorni')}</option><option value="30"${recuperoPer===30?' selected':''}>${t('Ultimi 30 giorni')}</option></select></div>
    <div class="cards recu-cards">${tessere.join('')}</div>
    <div class="recu-griglia">${notteHtml}${sonno}</div>
    <div class="recu-griglia">${grHrv}${grFc}</div>
    <h4 class="recu-tit">${t('Media della settimana')}</h4>
    ${tabella}
    <div class="lat-nota">${t('Tutti i valori sono quelli calcolati dal bracciale; il TMS non dà un voto al recupero. «Il suo solito» è la media ± una deviazione standard dei 30 giorni prima dell’ultimo dato (la fascia verde nei grafici); servono almeno 7 giorni. La temperatura della pelle si legge come scarto dal suo solito.')}</div>`;
}
function legaRecupero(){
  const s=document.getElementById('recu-per');
  if(s) s.onchange=()=>{ recuperoPer=(+s.value===7)? 7 : 30; const b=document.getElementById('recupero-box'); if(b){ b.innerHTML=htmlRecupero(); legaRecupero(); } };
}
