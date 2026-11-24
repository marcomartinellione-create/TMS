/* collaudo-electron.js — prova sull'app Electron VERA ciò che la suite jsdom non può vedere:
 * il ponte dati di main.js (scritture, cestino dei profili) e il salvataggio alla chiusura
 * della finestra.
 *
 * Avvia l'app in sviluppo con una userData TEMPORANEA: i dati reali in
 * %APPDATA%\Training Monitor System non vengono toccati (TMS_Dati/ del progetto è letta
 * come seed di sola lettura, le scritture vanno nella cartella temporanea).
 *
 * Uso (dalla root del progetto, dopo `npm run build`):
 *   electron\node_modules\.bin\electron.cmd tools\collaudo-electron.js
 * Esce con codice 0 se tutto passa. La finestra compare per qualche secondo: è normale.
 */
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const tmpData = fs.mkdtempSync(path.join(os.tmpdir(), 'tms-collaudo-'));
app.setPath('userData', tmpData);            // PRIMA di caricare il main: scritture solo qui
const DATI = path.join(tmpData, 'TMS', 'TMS_Dati');
const RAPPORTO = process.env.TMS_COLLAUDO_OUT || '';

/* stato della finestra salvato «da una sessione precedente»: massimizzata */
fs.writeFileSync(path.join(tmpData, 'finestra.json'), JSON.stringify({ bounds: { x: 60, y: 40, width: 1100, height: 720 }, massimizzata: true, schermoIntero: false }));
/* cartella condivisa col telefono «già scelta» (il selettore di sistema non si può cliccare da qui):
   una cartella temporanea accanto alla userData, che il collaudo poi toglie */
const tmpScambio = fs.mkdtempSync(path.join(os.tmpdir(), 'tms-collaudo-scambio-'));
fs.writeFileSync(path.join(tmpData, 'scambio.json'), JSON.stringify({ cartella: tmpScambio }));

require(path.join(__dirname, '..', 'electron', 'main.js'));

const esiti = [];
const ok = (c, l) => { esiti.push([!!c, l]); console.log((c ? '  OK   ' : '  FAIL ') + l); };
const attendi = ms => new Promise(r => setTimeout(r, ms));
const leggi = rel => { try { return fs.readFileSync(path.join(DATI, rel), 'utf8'); } catch (e) { return null; } };
let chiusuraAttesa = false;

function chiudi() {
  const falliti = esiti.filter(e => !e[0]).length;
  const testo = esiti.map(e => (e[0] ? 'OK   ' : 'FAIL ') + e[1]).join('\n') + '\nRISULTATO: ' + (esiti.length - falliti) + ' OK, ' + falliti + ' FAIL\n';
  if (RAPPORTO) { try { fs.writeFileSync(RAPPORTO, testo); } catch (e) {} }
  console.log('RISULTATO collaudo Electron: ' + (esiti.length - falliti) + ' OK, ' + falliti + ' FAIL');
  try { fs.rmSync(tmpData, { recursive: true, force: true }); } catch (e) {}
  try { fs.rmSync(tmpScambio, { recursive: true, force: true }); } catch (e) {}
  process.exitCode = falliti || !esiti.length ? 1 : 0;
}

/* l'ultima verifica avviene DOPO che l'app ha deciso di uscire: è il momento in cui, senza
   l'attesa delle scritture in main.js, il file restava indietro */
app.on('quit', () => {
  if (chiusuraAttesa) {
    const s = leggi('prova-collaudo/scheda.json') || '';
    ok(s.includes('CHIUSURA-TEST'), 'chiusura immediata della finestra: la modifica fatta un istante prima è su disco');
    let valido = false; try { JSON.parse(s); valido = true; } catch (e) {}
    ok(valido, 'chiusura immediata: il file scritto è JSON integro (scrittura atomica completata)');
    ok(!fs.readdirSync(path.join(DATI, 'prova-collaudo')).some(n => n.includes('.tmp-')), 'chiusura immediata: nessun file temporaneo lasciato a metà');
    { let s = null; try { s = JSON.parse(fs.readFileSync(path.join(tmpData, 'finestra.json'), 'utf8')); } catch (e) {}
      ok(s && s.massimizzata === true && s.bounds && s.bounds.width > 0, 'finestra: alla chiusura lo stato (massimizzata) è su disco'); }
  }
  chiudi();
});

const guardia = setTimeout(() => { ok(false, 'collaudo non concluso entro 90 secondi'); app.exit(1); }, 90000);

app.whenReady().then(async () => {
  try {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) throw new Error('finestra non creata');
    const js = code => win.webContents.executeJavaScript(code, true);
    if (win.webContents.isLoading()) await new Promise(r => win.webContents.once('did-finish-load', r));
    let pronto = false;
    for (let k = 0; k < 150 && !pronto; k++) {
      await attendi(200);
      pronto = await js('typeof dataDir!=="undefined" && !!dataDir && !!profileDir && typeof scrittureBloccate!=="undefined" && !scrittureBloccate').catch(() => false);
    }
    ok(pronto, 'app avviata e collegata ai dati locali');
    /* ── finestra che si ricorda ── */
    ok(win.isMaximized(), 'finestra: si riapre massimizzata, come era stata chiusa');
    { const nb = win.getNormalBounds(); ok(Math.abs(nb.width - 1100) <= 2 && Math.abs(nb.height - 720) <= 2, 'finestra: ricorda anche la dimensione «normale» (1100×720)'); }
    win.unmaximize(); await attendi(900);
    { let s = null; try { s = JSON.parse(fs.readFileSync(path.join(tmpData, 'finestra.json'), 'utf8')); } catch (e) {}
      ok(s && s.massimizzata === false, 'finestra: tolta la massimizzazione, lo stato viene salvato'); }
    win.maximize(); await attendi(300);
    if (!pronto) throw new Error('avvio non riuscito');
    await js('conferma=function(){return Promise.resolve(true);}; avviso=function(){return Promise.resolve();}; var _d=document.getElementById("disc-ok"); if(_d) _d.click(); true');
    ok(await js('typeof window.tmsFS.cestina==="function"'), 'ponte dati: canale «cestina» esposto al renderer');

    /* ── cartella condivisa col telefono (window.tmsScambio) ── */
    ok(await js('window.tmsScambio.cartella()') === tmpScambio, 'cartella condivisa: il percorso scelto lo sa solo il processo principale');
    await js('window.tmsScambio.scrivi("prova/dal-pc/stato.json", "{\\"a\\":1}")');
    ok(fs.readFileSync(path.join(tmpScambio, 'prova', 'dal-pc', 'stato.json'), 'utf8') === '{"a":1}' &&
       !fs.readdirSync(path.join(tmpScambio, 'prova', 'dal-pc')).some(n => n.includes('.tmp-')), 'cartella condivisa: scrittura (atomica, crea le sottocartelle)');
    ok(JSON.stringify(await js('window.tmsScambio.leggi("prova/dal-pc/stato.json")')) === JSON.stringify({ stato: 'ok', testo: '{"a":1}' }) &&
       (await js('window.tmsScambio.leggi("prova/manca.json")')).stato === 'assente', 'cartella condivisa: lettura, e «assente» distinto da «illeggibile»');
    fs.mkdirSync(path.join(tmpScambio, 'prova', 'dal-telefono', 'eventi'), { recursive: true });
    fs.writeFileSync(path.join(tmpScambio, 'prova', 'dal-telefono', 'eventi', 'pesata-1.json'), '{}');
    fs.writeFileSync(path.join(tmpScambio, 'prova', 'dal-telefono', 'eventi', 'nota.txt'), 'x');
    ok(JSON.stringify(await js('window.tmsScambio.elenca("prova/dal-telefono/eventi")')) === '["pesata-1.json"]', 'cartella condivisa: elenco dei soli .json');
    await js('window.tmsScambio.togli("prova/dal-telefono/eventi/pesata-1.json")');
    ok(!fs.existsSync(path.join(tmpScambio, 'prova', 'dal-telefono', 'eventi', 'pesata-1.json')), 'cartella condivisa: un file arrivato si toglie');
    const rifiutato = async code => { try { await js(code); return false; } catch (e) { return true; } };
    ok(await rifiutato('window.tmsScambio.scrivi("../fuori.json", "x")') && !fs.existsSync(path.join(path.dirname(tmpScambio), 'fuori.json')) &&
       await rifiutato('window.tmsScambio.leggi("../../x.json")'), 'cartella condivisa: niente uscite dalla cartella');
    ok(await rifiutato('window.tmsScambio.scrivi("prova/x.exe", "x")') && await rifiutato('window.tmsScambio.togli("prova/dal-telefono/eventi/nota.txt")') &&
       fs.existsSync(path.join(tmpScambio, 'prova', 'dal-telefono', 'eventi', 'nota.txt')), 'cartella condivisa: si scrivono e si tolgono solo file .json');
    ok(await js('(async function(){ var c=await telCifra({prova:"Squat"}, "K7QM3XRPA9TB4WZCHN5D"); var r=await telDecifra(c, "K7QM3XRPA9TB4WZCHN5D");' +
      ' return r.prova==="Squat" && c.indexOf("Squat")<0; })()'), 'cifratura dello scambio (HKDF + AES-GCM) disponibile nella pagina dell\'app');
    /* l'hub del TMS su Cloudflare: la pagina (origine app://tms) lo raggiunge con fetch (CORS) */
    { const r = await js('(async function(){ try{ var x=await fetch(telHubUrl()+"/v1/salute",{cache:"no-store"}); var j=await x.json();' +
        ' var y=await fetch(telHubUrl()+"/v1/io",{headers:{Authorization:"Bearer "+"x".repeat(43)}}); return [telDisponibile(), j.hub, y.status].join("|"); }catch(e){ return "errore: "+e.message; } })()');
      ok(r === 'true|tms|401', 'hub del TMS: la pagina dell\'app lo raggiunge dal processo vero di Electron (salute, e 401 con un gettone sconosciuto) → ' + r); }

    /* ── profilo di prova: creato, scritto, eliminato, ricreato ── */
    await js('createProfile("Prova Collaudo")');
    await js('DOC.storico.push({scheda:202601,esercizio:"Squat con bilanciere",seduta:1,test:false,macro:"Gambe",serie:3,rip:5,peso:100}); DOC.foto=[]; persistAll()');
    ok((leggi('prova-collaudo/storico.json') || '').includes('"peso": 100'), 'scrittura dal renderer: storico del profilo di prova su disco');
    fs.mkdirSync(path.join(DATI, 'prova-collaudo', 'foto'), { recursive: true });
    fs.writeFileSync(path.join(DATI, 'prova-collaudo', 'foto', 'f1.jpg'), 'x');   /* cartella NON vuota, con una sottocartella */
    await js('deleteProfile("prova-collaudo")');
    await attendi(300);
    ok(!fs.existsSync(path.join(DATI, 'prova-collaudo', 'storico.json')), 'elimina profilo: la cartella non resta al suo posto');
    const cestino = fs.existsSync(path.join(DATI, '_eliminati')) ? fs.readdirSync(path.join(DATI, '_eliminati')) : [];
    const voce = cestino.find(n => n.startsWith('prova-collaudo-'));
    ok(!!voce && fs.existsSync(path.join(DATI, '_eliminati', voce, 'storico.json')) && fs.existsSync(path.join(DATI, '_eliminati', voce, 'foto', 'f1.jpg')), 'elimina profilo: dati e foto conservati in TMS_Dati/_eliminati/');
    ok(!((leggi('profili.json') || '').includes('prova-collaudo')), 'elimina profilo: tolto dall\'elenco dei profili');
    await js('createProfile("Prova Collaudo")');
    ok(await js('activeProfile==="prova-collaudo" && DOC.storico.length===0'), 'profilo ricreato con lo stesso nome: parte vuoto');
    ok((leggi('prova-collaudo/storico.json') || '').trim() === '[]', 'profilo ricreato: storico vuoto anche su disco');

    /* ── modifica e chiusura immediata (dentro i 350 ms di attesa del salvataggio) ── */
    await js('DOC.scheda.settimanale.push({giorno:"Lunedì",esercizio:"Squat con bilanciere",note:"CHIUSURA-TEST",serie:1,rip:1,peso:1,rest:""}); persist("scheda"); pendingSaves.size');
    ok(!((leggi('prova-collaudo/scheda.json') || '').includes('CHIUSURA-TEST')), 'prima della chiusura la modifica è ancora in attesa (non su disco)');
    chiusuraAttesa = true;
    clearTimeout(guardia);
    win.close();   /* → beforeunload → scaricaSubito → main aspetta le scritture → quit */
  } catch (e) {
    ok(false, 'errore durante il collaudo: ' + (e && e.message));
    clearTimeout(guardia);
    app.quit();
  }
});
