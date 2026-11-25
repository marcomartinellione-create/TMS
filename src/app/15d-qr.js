/* ════ QR del codice di collegamento (25/11/2026, richiesta di Marco: «collegare il telefono con un QR») ════
   Il PC mostra il codice del cliente come QR; TMS Scheda lo inquadra con la fotocamera e si collega da solo.
   Codificatore scritto qui, senza librerie: modo ALFANUMERICO (maiuscole, cifre, spazio e $%*+-./:),
   correzione M, versioni 1–3 (fino a 61 caratteri, un blocco solo), maschera scelta con le penalità dello
   standard (ISO/IEC 18004). Il contenuto è «TMS:» + il codice a gruppi di 4: TMS Scheda accetta solo quello.
   tests/test-app.js lo confronta modulo per modulo con la libreria Python qrcode (tools/verifica-qr.py). */
const QR_ALFA='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const QR_VER=[null, {dati:16, ec:10}, {dati:28, ec:16}, {dati:44, ec:26}];   /* correzione M, un blocco */
/* campo di Galois GF(256), polinomio 0x11d */
const QR_EXP=new Array(512), QR_LOG=new Array(256);
(function(){ let x=1; for(let i=0;i<255;i++){ QR_EXP[i]=x; QR_LOG[x]=i; x<<=1; if(x&256) x^=0x11d; } for(let i=255;i<512;i++) QR_EXP[i]=QR_EXP[i-255]; })();
function qrMul(a,b){ return (a&&b)? QR_EXP[QR_LOG[a]+QR_LOG[b]] : 0; }
function qrResto(dati, n){
  let gen=[1]; for(let i=0;i<n;i++){ const g=new Array(gen.length+1).fill(0);
    gen.forEach((c,j)=>{ g[j]^=c; g[j+1]^=qrMul(c, QR_EXP[i]); }); gen=g; }
  const r=dati.concat(new Array(n).fill(0));
  for(let i=0;i<dati.length;i++){ const c=r[i]; if(c) for(let j=0;j<gen.length;j++) r[i+j]^=qrMul(gen[j], c); }
  return r.slice(dati.length); }
/* i byte dei dati (con la correzione d'errore), per la versione v */
function qrCodewords(testo, v){
  const bit=[], metti=(val,n)=>{ for(let i=n-1;i>=0;i--) bit.push((val>>i)&1); };
  metti(2,4); metti(testo.length,9);
  for(let i=0;i<testo.length;i+=2){ const a=QR_ALFA.indexOf(testo[i]);
    if(i+1<testo.length) metti(a*45+QR_ALFA.indexOf(testo[i+1]),11); else metti(a,6); }
  const cap=QR_VER[v].dati*8;
  metti(0, Math.min(4, cap-bit.length)); while(bit.length%8) bit.push(0);
  const dati=[]; for(let i=0;i<bit.length;i+=8) dati.push(parseInt(bit.slice(i,i+8).join(''),2));
  for(let k=0; dati.length<QR_VER[v].dati; k++) dati.push(k%2? 0x11 : 0xEC);
  return dati.concat(qrResto(dati, QR_VER[v].ec)); }
function qrBitsFormato(mask){   /* correzione M = 00 */
  const d=(0<<3)|mask; let r=d<<10; for(let i=14;i>=10;i--) if(r&(1<<i)) r^=0x537<<(i-10);
  return ((d<<10)|r)^0x5412; }
const QR_MASCHERE=[(r,c)=>(r+c)%2===0, r=>r%2===0, (r,c)=>c%3===0, (r,c)=>(r+c)%3===0,
  (r,c)=>(Math.floor(r/2)+Math.floor(c/3))%2===0, (r,c)=>(r*c)%2+(r*c)%3===0, (r,c)=>((r*c)%2+(r*c)%3)%2===0, (r,c)=>((r+c)%2+(r*c)%3)%2===0];
/* la matrice (true = modulo scuro). mascheraFissa: 0–7 per forzarla (le prove), altrimenti la migliore */
function qrMatrice(testo, mascheraFissa){
  testo=String(testo||'');
  if(![...testo].every(ch=>QR_ALFA.indexOf(ch)>=0)) throw new Error('QR: carattere non alfanumerico');
  const lung=4+9+Math.floor(testo.length/2)*11+(testo.length%2)*6;
  const v=[1,2,3].find(x=>lung<=QR_VER[x].dati*8); if(!v) throw new Error('QR: testo troppo lungo');
  const N=17+4*v, M=[...Array(N)].map(()=>new Array(N).fill(false)), fisso=[...Array(N)].map(()=>new Array(N).fill(false));
  const set=(r,c,s)=>{ if(r>=0&&r<N&&c>=0&&c<N){ M[r][c]=s; fisso[r][c]=true; } };
  const mirino=(r0,c0)=>{ for(let r=-1;r<=7;r++) for(let c=-1;c<=7;c++){
    const dentro=r>=0&&r<=6&&c>=0&&c<=6, bordo=r===0||r===6||c===0||c===6, cuore=r>=2&&r<=4&&c>=2&&c<=4;
    set(r0+r, c0+c, dentro&&(bordo||cuore)); } };
  mirino(0,0); mirino(0,N-7); mirino(N-7,0);
  for(let i=8;i<N-8;i++){ set(6,i,i%2===0); set(i,6,i%2===0); }
  if(v>=2){ const a=N-7; for(let r=-2;r<=2;r++) for(let c=-2;c<=2;c++) set(a+r, a+c, Math.max(Math.abs(r),Math.abs(c))!==1); }
  /* posti del formato: riga 8 e colonna 8 vicino ai mirini (si scrivono dopo, con la maschera) */
  for(let i=0;i<9;i++){ if(!fisso[8][i]) set(8,i,false); if(!fisso[i][8]) set(i,8,false); }
  for(let i=0;i<8;i++) set(8,N-1-i,false);
  for(let i=0;i<7;i++) set(N-1-i,8,false);
  set(N-8, 8, true);   /* il modulo scuro fisso */
  /* i dati, a zig-zag dal basso a destra */
  const cw=qrCodewords(testo, v), bit=[]; cw.forEach(b=>{ for(let i=7;i>=0;i--) bit.push((b>>i)&1); });
  const posto=[]; let su=true;
  for(let c=N-1;c>0;c-=2){ if(c===6) c=5;
    for(let k=0;k<N;k++){ const r=su? N-1-k : k; for(const cc of [c, c-1]) if(!fisso[r][cc]) posto.push([r,cc]); }
    su=!su; }
  const prova=m=>{ const X=M.map(riga=>riga.slice());
    posto.forEach(([r,c],i)=>{ const b=i<bit.length? bit[i]===1 : false; X[r][c]=QR_MASCHERE[m](r,c)? !b : b; });
    const f=qrBitsFormato(m);
    for(let i=0;i<15;i++){ const b=((f>>i)&1)===1;
      /* in alto a sinistra */
      if(i<6) X[i][8]=b; else if(i<8) X[i+1][8]=b; else X[N-15+i][8]=b;
      /* l'altra copia */
      if(i<8) X[8][N-1-i]=b; else if(i===8) X[8][7]=b; else X[8][14-i]=b; }
    return X; };
  if(mascheraFissa!=null) return prova(mascheraFissa);
  let meglio=null, pen=Infinity;
  for(let m=0;m<8;m++){ const X=prova(m), p=qrPenalita(X); if(p<pen){ pen=p; meglio=X; } }
  return meglio; }
function qrPenalita(X){
  const N=X.length; let p=0;
  for(let dir=0;dir<2;dir++) for(let i=0;i<N;i++){ let run=1;
    for(let j=1;j<N;j++){ const a=dir? X[j][i] : X[i][j], b=dir? X[j-1][i] : X[i][j-1];
      if(a===b){ run++; if(run===5) p+=3; else if(run>5) p++; } else run=1; } }
  for(let r=0;r<N-1;r++) for(let c=0;c<N-1;c++){ const s=X[r][c]; if(s===X[r][c+1] && s===X[r+1][c] && s===X[r+1][c+1]) p+=3; }
  const pat=[true,false,true,true,true,false,true,false,false,false,false], tap=pat.slice().reverse();
  for(let i=0;i<N;i++) for(let j=0;j<=N-11;j++){
    let h1=true, h2=true, v1=true, v2=true;
    for(let k=0;k<11;k++){ if(X[i][j+k]!==pat[k]) h1=false; if(X[i][j+k]!==tap[k]) h2=false; if(X[j+k][i]!==pat[k]) v1=false; if(X[j+k][i]!==tap[k]) v2=false; }
    p+=40*((h1?1:0)+(h2?1:0)+(v1?1:0)+(v2?1:0)); }
  let scuri=0; X.forEach(r=>r.forEach(s=>{ if(s) scuri++; }));
  p+=Math.floor(Math.abs(scuri*100/(N*N)-50)/5)*10;
  return p; }
/* il QR come SVG (bordo bianco di 4 moduli, come vuole lo standard) */
function qrSvg(testo, lato){
  const X=qrMatrice(testo), N=X.length, Q=4, T=N+2*Q; let d='';
  X.forEach((r,i)=>r.forEach((s,j)=>{ if(s) d+='M'+(j+Q)+' '+(i+Q)+'h1v1h-1z'; }));
  return `<svg class="qr-svg" viewBox="0 0 ${T} ${T}" width="${lato||220}" height="${lato||220}" shape-rendering="crispEdges" role="img" aria-label="QR"><rect width="${T}" height="${T}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`; }
/* il contenuto del QR di un cliente */
function qrTestoCodice(codice){ return 'TMS:'+telCodiceBello(codice); }
