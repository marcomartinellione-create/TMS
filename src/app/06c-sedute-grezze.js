/* ════════════════ SEDUTE COL BATTITO E COL GPS: I DATI GREZZI (27/11/2026) ════════════════
   Regola di Marco: «tutti i dati vengono salvati come tali e non come risultato di calcoli». Dall'APK 1.10.0 il telefono
   manda le sedute (cardio, evento tms-cardio; pesi, evento tms-seduta-fc) col GREZZO: il battito al secondo e i punti GPS
   così come li ha dati il telefono. Qui il grezzo si conserva in un file per seduta e i valori (FC media e picco, battito
   ogni 5 s, distanza, dislivello, discesa, tempo in movimento, parziali al km, percorso sulla mappa) si CALCOLANO quando la
   seduta si carica, con lo STESSO codice del telefono (app-android/web/index.html: fcDaGrezzo, gpsPunto, gpsQuota,
   gpsRiassunto, gpsSemplifica; le prove controllano che i due diano gli stessi numeri). I valori si attaccano alla seduta in
   memoria come proprietà NON enumerabili: il resto dell'app li legge come sempre (s.fcMedia, s.distanza, s.percorso…), ma
   JSON.stringify non li vede, quindi non finiscono mai in corpo.json, nella copia nel browser o nei backup.
   Le sedute di prima (telefono ≤ 1.9.0, o scritte a mano) hanno i valori come campi normali e restano come sono.

   ── FILE ── TMS_Dati/<profilo>/sedute/<id pulito>.json = {formato:'tms-seduta-grezza', versione:1, id, inizio (ms),
      hr: base64, un byte per secondo dall'inizio (0 = niente), fix: [[ms dall'inizio, lat×1e6, lon×1e6, quota dm,
      precisione dm, velocità cm/s, pressione Pa]…] (null = niente)}. Nella seduta (corpo.json) restano grezzo:1 e inizio.
      Stanno nel backup e nel cliente esportato (PK_GREZZI). */
const SG_DIR='sedute', SG_FORMATO='tms-seduta-grezza', SG_PASSO=5;
const SG_CALCOLATI=['fcMedia','fcPicco','fc','fcPasso','distanza','quota','discesa','tempoMov','parziali','percorso'];
const SG_PREC=25, SG_PUNTI=400;
const SG_VMAX={Corsa:12, Camminata:6, Bici:30, Nuoto:4, Vogatore:8, 'Sci di fondo':15, Altro:30};
function sgNomeFile(id){ return String(id).replace(/[^\w-]+/g,'_').slice(0,100)+'.json'; }
function sgB64(s){ try{ const b=atob(String(s||'')), u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u; }catch(e){ return null; } }
/* il grezzo che arriva: controllato; null se non c'è o non va */
function sgPulisci(x){
  if(!x || typeof x!=='object') return null;
  const ini=Math.round(+x.inizio); if(!(ini>946684800000 && ini<4102444800000)) return null;   /* fra il 2000 e il 2100 */
  const out={inizio:ini};
  if(typeof x.hr==='string' && x.hr.length){ const u=sgB64(x.hr); if(u && u.length<=86400) out.hr=x.hr; }
  if(Array.isArray(x.fix)){ const f=x.fix.slice(0,200000).filter(p=>Array.isArray(p) && p.length===7 && isFinite(+p[0]) && +p[0]>=0 && +p[0]<=86400000 &&
      p.every((v,i)=>v===null || (isFinite(+v) && (i!==1 || Math.abs(+v)<=90e6) && (i!==2 || Math.abs(+v)<=180e6))))
    .map(p=>p.map(v=>v===null? null : Math.round(+v)));
    if(f.length) out.fix=f; }
  return (out.hr || out.fix)? out : null;
}
/* ── i calcoli, uguali a quelli del telefono ── */
function sgTraccia(){ return {pts:[], dist:0, salita:0, discesa:0, mov:0, hRif:null, hBuf:[], km:[], baro:null}; }
const sgRad=x=>x*Math.PI/180;
function sgDist(a1, o1, a2, o2){ const dA=sgRad(a2-a1), dO=sgRad(o2-o1);
  const s=Math.sin(dA/2)*Math.sin(dA/2)+Math.cos(sgRad(a1))*Math.cos(sgRad(a2))*Math.sin(dO/2)*Math.sin(dO/2);
  return 2*6371008.8*Math.asin(Math.min(1, Math.sqrt(s))); }
function sgQuotaBaro(hPa){ return 44330*(1-Math.pow(hPa/1013.25, 1/5.255)); }
function sgQuota(tr, h){
  if(h==null) return; const soglia=tr.baro? 3 : 8;
  if(tr.hRif==null){ tr.hRif=h; return; }
  if(h-tr.hRif>=soglia){ tr.salita+=h-tr.hRif; tr.hRif=h; }
  else if(tr.hRif-h>=soglia){ tr.discesa+=tr.hRif-h; tr.hRif=h; } }
/* un punto [ora ms, lat, lon, quota m, precisione m, velocità m/s, pressione hPa]: scarta imprecisi, fermi e salti impossibili */
function sgPunto(tr, p, disc){
  const t=+p[0], lat=+p[1], lon=+p[2], acc=(p[4]==null || !isFinite(+p[4]))? 99 : +p[4];
  if(!(t>0) || !isFinite(lat) || !isFinite(lon) || Math.abs(lat)>90 || Math.abs(lon)>180 || (lat===0 && lon===0)) return false;
  if(acc>SG_PREC) return false;
  if(tr.baro==null) tr.baro=(+p[6]>0);
  let h=tr.baro? ((+p[6]>0)? sgQuotaBaro(+p[6]) : null) : ((p[3]!=null && isFinite(+p[3]))? +p[3] : null);
  if(h!=null){ tr.hBuf.push(h); if(tr.hBuf.length>5) tr.hBuf.shift(); h=tr.hBuf.reduce((a,b)=>a+b, 0)/tr.hBuf.length; }
  const hq=(h==null)? null : Math.round(h*10)/10, u=tr.pts[tr.pts.length-1];
  if(!u){ tr.pts.push([t, lat, lon, hq]); sgQuota(tr, h); return true; }
  if(t<=u[0]) return false;
  const d=sgDist(u[1], u[2], lat, lon), dt=(t-u[0])/1000;
  if(d/dt>(SG_VMAX[disc]||30)) return false;
  if(d<Math.max(4, acc*0.5)){ sgQuota(tr, h); return false; }
  const prima=tr.dist;
  tr.pts.push([t, lat, lon, hq]); tr.dist+=d;
  if(dt<=20) tr.mov+=dt;
  for(let k=Math.floor(prima/1000)+1; k<=Math.floor(tr.dist/1000); k++) tr.km.push(Math.round(u[0]+(t-u[0])*(k*1000-prima)/d));
  sgQuota(tr, h); return true; }
/* Douglas-Peucker sui metri: al massimo «max» punti (solo per disegnare) */
function sgSemplifica(pts, max){
  if(pts.length<=max) return pts.slice();
  const lat0=pts[0][1], kx=Math.cos(sgRad(lat0))*111320, ky=110540;
  const xy=pts.map(p=>[p[2]*kx, p[1]*ky]);
  const dpl=(p, a, b)=>{ const dx=b[0]-a[0], dy=b[1]-a[1], l=dx*dx+dy*dy; if(!l) return Math.hypot(p[0]-a[0], p[1]-a[1]);
    let u=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l; u=Math.max(0, Math.min(1, u)); return Math.hypot(p[0]-a[0]-u*dx, p[1]-a[1]-u*dy); };
  let toll=3, tieni=null;
  for(let giro=0; giro<30; giro++){
    tieni=new Uint8Array(pts.length); tieni[0]=tieni[pts.length-1]=1;
    const pila=[[0, pts.length-1]];
    while(pila.length){ const [a, b]=pila.pop(); let m=0, im=-1;
      for(let i=a+1;i<b;i++){ const d=dpl(xy[i], xy[a], xy[b]); if(d>m){ m=d; im=i; } }
      if(im>=0 && m>toll){ tieni[im]=1; pila.push([a, im], [im, b]); } }
    if(tieni.reduce((s,x)=>s+x, 0)<=max) break; toll*=1.6; }
  return pts.filter((p,i)=>tieni[i]); }
function sgRiassunto(tr, inizio){
  const o={distanza:Math.round(tr.dist/10)/100, quota:Math.round(tr.salita), discesa:Math.round(tr.discesa), tempoMov:Math.round(tr.mov)};
  const km=[]; let prima=+inizio||((tr.pts[0]||[])[0]||0); tr.km.forEach(t=>{ km.push(Math.max(1, Math.round((t-prima)/1000))); prima=t; });
  if(km.length) o.parziali=km;
  if(tr.pts.length>1) o.percorso=sgSemplifica(tr.pts, SG_PUNTI).map(p=>[Math.round(p[1]*1e5)/1e5, Math.round(p[2]*1e5)/1e5, p[3]==null? null : Math.round(p[3])]);
  return o; }
/* la disciplina di una seduta per i salti impossibili (come fcDiscDi del telefono) */
const SG_DISC={'Camminata veloce':'Camminata', 'Tapis roulant':'Corsa', 'Cyclette':'Bici'};
function sgDisc(s){ if(s && s.disc) return s.disc; const t=s && s.tipo; return SG_DISC[t] || t || 'Altro'; }
/* i valori di una seduta dal suo grezzo */
function sgDaGrezzo(s, g){
  const out={}, hr=sgB64(g && g.hr)||new Uint8Array(0), n=hr.length;
  if(n){ const fc=[]; let somma=0, c=0, picco=0;
    for(let k=0;k*SG_PASSO<n;k++){ let a=0, b=0;
      for(let j=k*SG_PASSO;j<Math.min(n, (k+1)*SG_PASSO);j++) if(hr[j]){ a+=hr[j]; b++; if(hr[j]>picco) picco=hr[j]; }
      if(b){ const v=Math.round(a/b); fc.push(v); somma+=v; c++; } else fc.push(null); }
    while(fc.length && fc[fc.length-1]==null) fc.pop();
    out.fc=fc; out.fcPasso=SG_PASSO; out.fcMedia=c? Math.round(somma/c) : ''; out.fcPicco=picco||''; }
  if(g && Array.isArray(g.fix) && g.fix.length){ const tr=sgTraccia(), ini=+((g && g.inizio)||s.inizio)||0, disc=sgDisc(s), D=(v,k)=>v==null? null : v/k;
    g.fix.forEach(f=>{ sgPunto(tr, [ini+f[0], D(f[1],1e6), D(f[2],1e6), D(f[3],10), D(f[4],10), D(f[5],100), D(f[6],100)], disc); });
    Object.assign(out, sgRiassunto(tr, ini)); }
  return out; }
function sgAttacca(s, v){ SG_CALCOLATI.forEach(k=>{ if(v && v[k]!==undefined) Object.defineProperty(s, k, {value:v[k], enumerable:false, writable:true, configurable:true}); }); return s; }
/* ── i file ── */
async function sgScrivi(pd, id, g){
  const dir=await pd.getDirectoryHandle(SG_DIR, {create:true});
  await writeJson(dir, sgNomeFile(id), {formato:SG_FORMATO, versione:1, id:String(id), inizio:g.inizio, hr:g.hr||'', fix:g.fix||[]}); }
/* le sedute arrivate col grezzo: il grezzo nel suo file, nella seduta solo grezzo:1 e inizio. Restituisce gli id che non si
   sono potuti scrivere (chi chiama non le conferma: restano sull'hub) */
async function sgSalvaArrivate(pd, lista){
  const falliti=new Set();
  for(const x of (lista||[])){
    const g=sgPulisci(x); delete x.hr; delete x.fix;
    if(!g) continue;
    try{ if(!pd || scrittureBloccate) throw new Error('niente cartella'); await sgScrivi(pd, x.id, g); x.inizio=g.inizio; x.grezzo=1;
      if(pd===profileDir) sgCache().raw.set(String(x.id), g); }
    catch(e){ falliti.add(String(x.id)); logErrore('sedute/scrivi '+x.id, e); } }
  return falliti; }
/* ── il profilo aperto: il grezzo letto una volta, i valori attaccati alle sedute che non li hanno ── */
const SG_CACHE={slug:null, raw:new Map(), assenti:new Set()};
function sgCache(){ if(SG_CACHE.slug!==activeProfile){ SG_CACHE.slug=activeProfile; SG_CACHE.raw=new Map(); SG_CACHE.assenti=new Set(); } return SG_CACHE; }
function sgTutte(){
  const l=[].concat(DOC.cardio||[], DOC.storico_fc||[]), fs=(DOC.scheda && DOC.scheda.fcSedute)||{};
  Object.keys(fs).forEach(k=>{ const v=fs[k]; if(Array.isArray(v)) v.forEach(x=>l.push(x)); else if(v && typeof v==='object') l.push(v); });
  return l.filter(s=>s && s.grezzo && s.id); }
/* attacca i valori dove mancano; legge i file che servono. true se qualcosa è cambiato (chi chiama ridisegna) */
async function sgAssicura(){
  const C=sgCache(), slug=C.slug, pd=profileDir; let cambi=false;
  const manca=sgTutte().filter(s=>!Object.prototype.hasOwnProperty.call(s, 'fcPasso') && !Object.prototype.hasOwnProperty.call(s, 'distanza'));
  if(!manca.length) return false;
  let dir=null; if(pd){ try{ dir=await pd.getDirectoryHandle(SG_DIR, {create:false}); }catch(e){} }
  for(const s of manca){
    const id=String(s.id); let g=C.raw.get(id);
    if(!g && dir && !C.assenti.has(id)){ const r=await leggiJson(dir, sgNomeFile(id));
      if(r.stato==='ok' && r.dati){ g=sgPulisci(r.dati); if(g) C.raw.set(id, g); } else C.assenti.add(id); }
    if(SG_CACHE.slug!==slug) return false;
    if(g){ sgAttacca(s, sgDaGrezzo(s, g)); cambi=true; } }
  return cambi; }
/* dopo un disegno: se mancavano valori, li calcola e ridisegna la scheda aperta (una volta) */
function sgDopoDisegno(){
  sgAssicura().then(c=>{ if(c && typeof curTab!=='undefined' && RENDERERS[curTab]) RENDERERS[curTab](); }).catch(e=>logErrore('sedute/carica', e)); }
