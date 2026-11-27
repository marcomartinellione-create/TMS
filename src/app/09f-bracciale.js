/* ════════════════ CAMPIONI GREZZI DEL BRACCIALE (27/11/2026) ════════════════
   Regola di Marco: «tutti i dati vengono salvati come tali e non come risultato di calcoli … se un giorno dovesse
   cambiare una formula, tutto lo storico sarebbe aggiornato». Dall'APK 1.10.0 il telefono non manda più le MEDIE del
   giorno (evento tms-giorno) ma i CAMPIONI del bracciale (evento tms-bracciale, uno per giorno); qui si conservano così
   come sono e da qui si calcolano, ogni volta che si mostrano, i valori del Recupero (09e-recupero.js) e le calorie
   (09g-calorie.js). I giorni arrivati prima (solo medie, telefoni ≤ 1.9.0) restano in DOC.recupero.giorni e si usano
   dove non ci sono i campioni.

   ── FILE ── TMS_Dati/<profilo>/bracciale/AAAA-MM.json = {formato:'tms-bracciale', versione:1, giorni:{'AAAA-MM-GG': giorno}}
   Un file al mese (~350 KB con il bracciale portato sempre): corpo.json resta piccolo e si legge solo il mese che serve.
   Stanno nel backup completo e nel cliente esportato (14c-backup-tmsb.js, 14b-pacchetto.js), non nella copia nel browser.

   ── GIORNO (formato dell'evento, scritto dal telefono in zpGiornoGrezzo) ──
     {data:'AAAA-MM-GG', n: minuti del giorno locale (1440; 1380 o 1500 nel giorno del cambio d'ora),
      att: base64 di n×3 byte, per minuto [passi u16 LE (0xFFFF = minuto senza dati), battito u8 (0 = niente)] (tipo 1),
      str: base64 di n byte, stress al minuto 0–100 (0xFF = niente) (tipo 19),
      pel: base64 di n×2 byte, temperatura della pelle in centesimi di °C, i16 LE (0x7FFF = niente) (tipo 46),
      s18 stress singolo, hrv RMSSD ms, sdnn ms, spo SpO2 %, spn SpO2 nel sonno %, res respiri al minuto,
      rip battito a riposo calcolato dal bracciale: [[secondi dalla mezzanotte, valore]…],
      bat: batteria %}
   Arrivato di nuovo lo stesso giorno, i due si FONDONO minuto per minuto (il nuovo vince dove ha un dato, il vecchio resta
   dove il nuovo non ne ha): un invio più povero non cancella niente. */
const BR_DIR='bracciale', BR_FORMATO='tms-bracciale';
const BR_SPARSI={s18:[0,100], hrv:[3,300], sdnn:[3,400], spo:[50,100], spn:[50,100], res:[4,40], rip:[25,120]};
const BR_DENSI={att:3, str:1, pel:2};   /* byte per minuto */
const brMese=d=>String(d).slice(0,7);
function brB64(s){ try{ const b=atob(String(s||'')), u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u; }catch(e){ return null; } }
function brA64(u){ let s=''; for(let i=0;i<u.length;i+=0x8000) s+=String.fromCharCode.apply(null, u.subarray(i, i+0x8000)); return btoa(s); }
/* controllo di quello che arriva: una data vera, n plausibile, i blocchi della misura giusta; il resto si toglie */
function pulisciBracciale(g){
  if(!g || typeof g!=='object') return null;
  const data=recDataOk(g.data); if(!data) return null;
  const n=Math.round(+g.n); if(!(n>=1380 && n<=1500)) return null;
  const out={data:data, n:n};
  Object.keys(BR_DENSI).forEach(k=>{ if(typeof g[k]!=='string') return; const u=brB64(g[k]); if(u && u.length===n*BR_DENSI[k]) out[k]=g[k]; });
  Object.keys(BR_SPARSI).forEach(k=>{ if(!Array.isArray(g[k])) return; const r=BR_SPARSI[k];
    const l=g[k].filter(x=>Array.isArray(x) && x[0]!==''&&x[0]!=null && isFinite(+x[0]) && +x[0]>=0 && +x[0]<n*60 && x[1]!==''&&x[1]!=null && isFinite(+x[1]) && +x[1]>=r[0] && +x[1]<=r[1])
      .map(x=>[Math.round(+x[0]), +x[1]]);
    if(l.length) out[k]=l.slice(0, 20000); });
  if(g.bat!==''&&g.bat!=null && isFinite(+g.bat) && +g.bat>=0 && +g.bat<=100) out.bat=+g.bat;
  return out;
}
/* due invii dello stesso giorno: minuto per minuto (densi) e campione per campione (sparsi, per secondo) */
function brFondi(vecchio, nuovo){
  if(!vecchio || vecchio.n!==nuovo.n) return nuovo;
  const out=Object.assign({}, vecchio, {data:nuovo.data, n:nuovo.n});
  const vuoto={att:(u,k)=>u[3*k]===0xFF&&u[3*k+1]===0xFF&&u[3*k+2]===0, str:(u,k)=>u[k]===0xFF, pel:(u,k)=>u[2*k]===0xFF&&u[2*k+1]===0x7F};
  Object.keys(BR_DENSI).forEach(k=>{
    if(!nuovo[k]) return; if(!vecchio[k]){ out[k]=nuovo[k]; return; }
    const a=brB64(vecchio[k]), b=brB64(nuovo[k]), w=BR_DENSI[k]; if(!a || !b){ out[k]=nuovo[k]; return; }
    for(let m=0;m<nuovo.n;m++) if(!vuoto[k](b,m)) for(let j=0;j<w;j++) a[w*m+j]=b[w*m+j];
    out[k]=brA64(a); });
  Object.keys(BR_SPARSI).forEach(k=>{
    if(!nuovo[k]) return; const M=new Map((vecchio[k]||[]).map(x=>[x[0], x])); nuovo[k].forEach(x=>M.set(x[0], x));
    out[k]=[...M.values()].sort((a,b)=>a[0]-b[0]); });
  if(nuovo.bat!=null) out.bat=nuovo.bat;
  return out;
}
/* ── i file ── */
async function brCartella(pd, crea){ try{ return await pd.getDirectoryHandle(BR_DIR, {create:!!crea}); }catch(e){ return null; } }
/* i giorni arrivati nei file dei loro mesi, su un profilo qualsiasi (pd = la sua cartella). Un mese che non si legge non
   si tocca: i suoi giorni finiscono in `falliti` e chi chiama non li conferma (restano sull'hub e riprovano) */
async function braccialeUnisci(pd, arrivati){
  const ris={giorni:0, nonValidi:0, falliti:new Set()}, perMese={};
  (arrivati||[]).forEach(x=>{ const g=pulisciBracciale(x); if(!g){ ris.nonValidi++; return; } (perMese[brMese(g.data)]=perMese[brMese(g.data)]||[]).push(g); });
  const mesi=Object.keys(perMese).sort(); if(!mesi.length) return ris;
  const dir=pd? await brCartella(pd, true) : null;
  if(!dir || scrittureBloccate){ mesi.forEach(m=>perMese[m].forEach(g=>ris.falliti.add(g.data))); return ris; }
  for(const m of mesi){
    const r=await leggiJson(dir, m+'.json');
    if(r.stato==='illeggibile'){ perMese[m].forEach(g=>ris.falliti.add(g.data)); logErrore('bracciale/'+m, (r.errore||new Error('illeggibile'))); continue; }
    const f=(r.stato==='ok' && r.dati && typeof r.dati==='object' && r.dati.giorni && typeof r.dati.giorni==='object' && !Array.isArray(r.dati.giorni))?
      r.dati : {formato:BR_FORMATO, versione:1, giorni:{}};
    perMese[m].forEach(g=>{ f.giorni[g.data]=brFondi(f.giorni[g.data], g); });
    try{ await writeJson(dir, m+'.json', f); ris.giorni+=perMese[m].length; if(pd===profileDir) brCacheMetti(m, f); }
    catch(e){ perMese[m].forEach(g=>ris.falliti.add(g.data)); logErrore('bracciale/scrivi '+m, e); }
  }
  return ris;
}
/* ── i mesi letti del profilo aperto (solo in memoria; cambiando profilo si ricomincia) ── */
const BR_CACHE={slug:null, mesi:{}, attesa:{}};
function brCache(){ if(BR_CACHE.slug!==activeProfile){ BR_CACHE.slug=activeProfile; BR_CACHE.mesi={}; BR_CACHE.attesa={}; } return BR_CACHE; }
/* i giorni di un mese già controllati (si controllano una volta, quando si leggono) */
function brPuliti(giorni){ const out={}; Object.keys(giorni||{}).forEach(d=>{ const g=pulisciBracciale(giorni[d]); if(g && g.data===d) out[d]=g; }); return out; }
function brCacheMetti(m, f){ const C=brCache(); C.mesi[m]=brPuliti(f && f.giorni); }
function brMesiTra(da, a){ const out=[]; let y=+da.slice(0,4), mo=+da.slice(5,7); const yA=+a.slice(0,4), mA=+a.slice(5,7);
  while(y<yA || (y===yA && mo<=mA)){ out.push(y+'-'+recDue(mo)); if(++mo>12){ mo=1; y++; } } return out; }
/* legge i mesi che mancano; true se è arrivato qualcosa di nuovo (chi chiama ridisegna) */
async function brCarica(mesi){
  const C=brCache(), slug=C.slug, pd=profileDir; let nuovo=false;
  const da=mesi.filter(m=>!(m in C.mesi));
  if(!da.length || !pd) return false;
  const dir=await brCartella(pd, false);
  for(const m of da){
    if(C.attesa[m]) continue; C.attesa[m]=true;
    let giorni={};
    if(dir){ const r=await leggiJson(dir, m+'.json'); if(r.stato==='ok' && r.dati && r.dati.giorni && typeof r.dati.giorni==='object') giorni=r.dati.giorni;
      else if(r.stato==='illeggibile') logErrore('bracciale/leggi '+m, (r.errore||new Error('illeggibile'))); }
    if(BR_CACHE.slug!==slug) return false;   /* cambiato profilo nel frattempo */
    C.mesi[m]=brPuliti(giorni); delete C.attesa[m]; if(Object.keys(C.mesi[m]).length) nuovo=true; }
  return nuovo;
}
/* i mesi degli ultimi `giorni` giorni fino a oggi (e quello prima, per la notte a cavallo) */
function brMesiRecenti(giorni){ const oggi=recYmd(new Date()); return brMesiTra(recPiuGiorni(oggi, -(giorni+1)), oggi); }
function brGiorno(data){ return (brCache().mesi[brMese(data)]||{})[data] || null; }
function brDateCaricate(){ const C=brCache(), out=[]; Object.keys(C.mesi).forEach(m=>Object.keys(C.mesi[m]||{}).forEach(d=>{ if(recDataOk(d)) out.push(d); })); return out.sort(); }
/* ── lettura dei campioni (decodifica tenuta in memoria per oggetto) ── */
const BR_DEC=new WeakMap();
function brDecod(g){
  let x=BR_DEC.get(g); if(x) return x;
  const n=g.n, passi=new Int32Array(n).fill(-1), bpm=new Uint8Array(n), str=new Int16Array(n).fill(-1), pel=new Float64Array(n).fill(NaN);
  const a=g.att? brB64(g.att) : null; if(a) for(let k=0;k<n;k++){ const p=a[3*k]|(a[3*k+1]<<8); passi[k]=p===0xFFFF? -1 : p; bpm[k]=a[3*k+2]; }
  const s=g.str? brB64(g.str) : null; if(s) for(let k=0;k<n;k++) if(s[k]!==0xFF) str[k]=s[k];
  const p=g.pel? brB64(g.pel) : null; if(p) for(let k=0;k<n;k++){ const u=p[2*k]|(p[2*k+1]<<8); if(u!==0x7FFF) pel[k]=(u>32767? u-65536 : u)/100; }
  x={d0:new Date(g.data+'T00:00:00').getTime(), passi:passi, bpm:bpm, str:str, pel:pel}; BR_DEC.set(g, x); return x;
}
/* i valori di un tipo fra due istanti (ms), anche a cavallo di più giorni: [[ms, valore]…] */
function brCampioni(k, da, a){
  const out=[]; let d=recYmd(new Date(da)); const fine=recYmd(new Date(a-1));
  for(let i=0;i<40 && d<=fine;i++, d=recPiuGiorni(d,1)){
    const g=brGiorno(d); if(!g) continue; const x=brDecod(g);
    if(k==='str' || k==='pel'){ const arr=x[k]; for(let m=0;m<g.n;m++){ const t=x.d0+m*60000, v=arr[m]; if(t>=da && t<a && (k==='str'? v>=0 : v===v)) out.push([t, v]); } }
    else (g[k]||[]).forEach(c=>{ const t=x.d0+c[0]*1000; if(t>=da && t<a) out.push([t, c[1]]); }); }
  return out;
}
const brMedia=v=>v.length? v.reduce((a,b)=>a+b,0)/v.length : null;
const brTond=(v,d)=>v==null? undefined : Math.round(v*Math.pow(10,d))/Math.pow(10,d);
function brMin(v){ let m=Infinity; for(const x of v) if(x<m) m=x; return m; }
function brMax(v){ let m=-Infinity; for(const x of v) if(x>m) m=x; return m; }
/* la finestra della notte che finisce in `data` (per pelle e respirazione), in ms; null se non c'è */
function brFinestraNotte(data, notti){
  const n=(notti||[]).find(x=>x && (recDataOk(x.id)||String(x.fine||'').slice(0,10))===data && x.inizio && x.fine);
  return n? [new Date(n.inizio).getTime(), new Date(n.fine).getTime()] : null; }
/* ── i valori del giorno DAI CAMPIONI (gli stessi che prima calcolava il telefono; ora si calcolano qui, ogni volta) ── */
function brGiornoValori(data, notti){
  const g=brGiorno(data); if(!g) return null;
  const x=brDecod(g), d0=x.d0, d1=d0+g.n*60000, out={data:data}, s=(k,v)=>{ if(v!==undefined && v!==null && isFinite(v)) out[k]=v; };
  let ps=0, conP=false; for(let m=0;m<g.n;m++) if(x.passi[m]>=0){ ps+=x.passi[m]; conP=true; } if(conP) out.passi=ps;
  const rip=brCampioni('rip', d0, d1); if(rip.length) s('fcRiposo', rip[rip.length-1][1]);
  s('rmssd', brTond(brMedia(brCampioni('hrv', d0, d1).map(c=>c[1])), 0));
  s('sdnn', brTond(brMedia(brCampioni('sdnn', d0, d1).map(c=>c[1])), 1));
  const sp=brCampioni('spo', d0, d1).map(c=>c[1]).filter(v=>v>=50); if(sp.length){ s('spo2Min', brMin(sp)); s('spo2Med', brTond(brMedia(sp), 0)); }
  const st=brCampioni('str', d0, d1).concat(brCampioni('s18', d0, d1)).map(c=>c[1]).filter(v=>v<=100);
  if(st.length){ s('stressMed', brTond(brMedia(st), 0)); s('stressMax', brMax(st)); }
  const w=brFinestraNotte(data, notti);
  let tp=w? brCampioni('pel', w[0], w[1]) : []; if(!tp.length) tp=brCampioni('pel', d0, d1);
  s('tempPelle', brTond(brMedia(tp.map(c=>c[1]).filter(v=>v>=25 && v<=42)), 2));
  let rs=w? brCampioni('res', w[0], w[1]) : []; if(!rs.length) rs=brCampioni('res', d0, d1);
  s('resp', brTond(brMedia(rs.map(c=>c[1]).filter(v=>v>=4 && v<=40)), 1));
  if(g.bat!=null) out.batteria=g.bat;
  return out;
}
/* SpO2, respirazione e HRV della notte dai campioni della sua finestra (null se non ce ne sono) */
function brNotteValori(n){
  if(!n || !n.inizio || !n.fine) return null;
  const da=new Date(n.inizio).getTime(), a=new Date(n.fine).getTime(), out={};
  const sp=brCampioni('spn', da, a).map(c=>c[1]).filter(v=>v>=70 && v<=100); if(sp.length) out.spo2=Math.round(brMedia(sp));
  const rs=brCampioni('res', da, a).map(c=>c[1]).filter(v=>v>=4 && v<=40); if(rs.length) out.resp=brTond(brMedia(rs), 1);
  const hv=brCampioni('hrv', da, a).map(c=>c[1]); if(hv.length) out.hrv=Math.round(brMedia(hv));
  return Object.keys(out).length? out : null;
}
/* minuto per minuto di un giorno, per le calorie: {d0, n, passi (−1 = niente), bpm (0 = niente)}; null senza campioni */
function brMinuti(data){ const g=brGiorno(data); if(!g || !g.att) return null; const x=brDecod(g); return {d0:x.d0, n:g.n, passi:x.passi, bpm:x.bpm}; }
