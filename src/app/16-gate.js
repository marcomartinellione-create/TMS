/* ════ GATE CONNESSIONE + CHECK PERCORSO ════ */
function gateShow(state){
  const ov=document.getElementById('overlay'); ov.classList.remove('hidden');
  const title=document.getElementById('ov-title'), sub=document.getElementById('overlay-sub'),
        btn=document.getElementById('overlay-btn'), note=document.getElementById('ov-note'),
        err=document.getElementById('ov-err');
  err.classList.remove('on'); err.textContent=''; btn.style.display='';
  if(state==='unsupported'){
    title.innerHTML='<span class="sigil">✦</span> Browser non supportato';
    sub.innerHTML='Questo browser non può salvare su cartella.<br>Usa <strong>Chrome</strong>, <strong>Edge</strong> o l\'app <strong>Obsidian</strong>.';
    btn.style.display='none'; note.textContent='Apri con Chrome, Edge o Obsidian per usare il TMS.';
  } else if(state==='reconnect'){
    title.innerHTML='<span class="sigil">✦</span> Ricollega la cartella';
    sub.innerHTML='Conferma l\'accesso alla cartella <strong>'+esc(dirHandle?dirHandle.name:EXPECTED_DIR)+'</strong><br>per riattivare il salvataggio automatico in <strong>TMS_Dati/</strong>.';
    btn.textContent='↻ Riconnetti '+(dirHandle?dirHandle.name:''); btn.onclick=reconnectDirectory;
    note.textContent='Richiesto a inizio sessione — un solo click';
  } else {
    title.innerHTML='<span class="sigil">✦</span> Connetti la cartella';
    sub.innerHTML='Per salvare e sincronizzare i dati, seleziona la cartella <strong>'+EXPECTED_DIR+'</strong>.<br>Verrà creata al suo interno la sottocartella <strong>TMS_Dati/</strong>.';
    btn.textContent='▲ Seleziona cartella…'; btn.onclick=pickDirectory;
    note.textContent='Richiesto una volta — poi si riconnette da solo';
  }
}
function gateHide(){ document.getElementById('overlay').classList.add('hidden'); }
function gateErr(msg){ const e=document.getElementById('ov-err'); e.textContent=msg; e.classList.add('on'); }
async function reconnectDirectory(){
  if(!dirHandle){ pickDirectory(); return; }
  try{ const rp=await dirHandle.requestPermission({mode:'readwrite'});
    if(rp==='granted'){ gateHide(); await connectFlow(); } else gateErr('Permesso negato. Riprova.');
  }catch(e){ gateErr('Errore: '+e.message); }
}

