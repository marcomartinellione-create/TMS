/* prova-nativo.js — prova automatica dello strato nativo dell'APK (nativo.js + modifiche di
   prepara-www.js) sulla PWA vera, in jsdom, con un plugin Android FINTO che registra le chiamate.
   Non prova Android (file veri, fotocamera, condivisione): quello si prova sull'emulatore o sul
   telefono. Prova che la pagina chieda le cose giuste, nel formato giusto.
   Uso (da app-android/): node scripts/prepara-www.js && node test/prova-nativo.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const WWW = path.join(__dirname, '..', 'www');
const VERSIONE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version;
let passati = 0, falliti = 0;
function ok(cond, nome) { if (cond) { passati++; } else { falliti++; console.log('  ✗ ' + nome); } }
const attendi = (ms = 60) => new Promise(r => setTimeout(r, ms));
/* IndexedDB finto (una Map che sopravvive ai «riavvii» dell'app): put/get/openCursor, la
   transazione finisce quando non ha più richieste in sospeso */
function fintoIDB(m) {
  const transaction = () => { const tx = {}; let pend = 0, chiusa = false;
    const dopo = fn => { pend++; setTimeout(() => { fn(); pend--; if (!pend && !chiusa) { chiusa = true; setTimeout(() => tx.oncomplete && tx.oncomplete(), 0); } }, 0); };
    const st = {
      put(v, k) { const q = {}; dopo(() => { m.set(k, v); q.onsuccess && q.onsuccess(); }); return q; },
      get(k) { const q = {}; dopo(() => { q.result = m.get(k); q.onsuccess && q.onsuccess(); }); return q; },
      openCursor(r) { const q = {}, ks = [...m.keys()].filter(k => k >= r.lower && k <= r.upper).sort(); let i = 0;
        const passo = () => { q.result = i < ks.length ? { key: ks[i], value: m.get(ks[i]), continue() { i++; dopo(passo); } } : null; q.onsuccess && q.onsuccess(); };
        dopo(passo); return q; } };
    tx.objectStore = () => st; return tx; };
  return { open() { const r = {}; setTimeout(() => { r.result = { transaction, close() {}, createObjectStore() {} }; r.onsuccess && r.onsuccess(); }, 0); return r; } };
}

const SCHEDA = {
  tipo: 'tms-scheda', versione: 1, app: '1.1.21', modificabile: true, rpe: true,
  profilo: { slug: 'prova', nome: 'Cliente Prova' }, esportata: '2026-11-14',
  righe: [
    { giorno: 'Giorno 1', esercizio: 'Panca piana con bilanciere', serie: 4, rip: 8, peso: 60, rest: '2:00', rir: 2, test: false, note: '', video: '' },
    { giorno: 'Giorno 1', esercizio: 'Rematore con bilanciere', serie: 3, rip: 10, peso: 50, rest: '1:30', rir: null, test: false, note: 'schiena dritta', video: '' },
    { giorno: 'Giorno 2', esercizio: 'Squat con bilanciere', serie: 5, rip: 5, peso: 80, rest: '3:00', rir: 1, test: false, note: '', video: '' }
  ],
  riscaldamento: [], ultima: {}, video: {}, dieta: null,
  catalogo: [{ n: 'Panca piana con bilanciere', g: 'Petto' }, { n: 'Squat con bilanciere', g: 'Gambe' }]
};

/* carica www/index.html con nativo.js in linea (jsdom non scarica gli script esterni) */
async function apri(opz = {}) {
  let html = fs.readFileSync(path.join(WWW, 'index.html'), 'utf8');
  const nativo = fs.readFileSync(path.join(WWW, 'nativo.js'), 'utf8');
  if (html.split('<script src="nativo.js"></script>').length !== 2) throw new Error('www/index.html senza nativo.js: lancia prima scripts/prepara-www.js');
  html = html.replace('<script src="nativo.js"></script>', () => '<script>' + nativo + '</script>');
  const reg = { chiamate: [], ascolti: {}, file: {}, ble: [], bleAscolti: {}, cart: [], avv: [], avvAscolti: {}, pendenti: [{ id: 5 }, { id: 7003 }] };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://localhost/index.html', pretendToBeVisual: true,
    beforeParse(win) {
      win.localStorage.setItem('tms-scheda-lang', opz.lingua || 'it');
      if (opz.scheda !== null) win.localStorage.setItem('tms-scheda-corrente', JSON.stringify(opz.scheda || SCHEDA));
      Object.entries(opz.ls || {}).forEach(([k, v]) => win.localStorage.setItem(k, v));
      if (opz.idb) { win.indexedDB = opz.idb; win.IDBKeyRange = { bound: (a, b) => ({ lower: a, upper: b }) }; }
      win.scrollTo = () => {};
      win.Capacitor = {
        convertFileSrc: p => 'https://localhost/_capacitor_file_' + p,
        Plugins: { TmsFile: {
          info: async () => ({ sdk: opz.sdk || 34, versione: '1.0.0' }),
          addListener: (ev, cb) => { reg.ascolti[ev] = cb; return { remove() {} }; }
        },
        /* plugin Bluetooth finto: registra chiamate e ascolti (nome dell'evento → funzione) */
        ...(opz.ble ? { BluetoothLe: {
          initialize: async o => { reg.ble.push(['initialize', o]); if (opz.bleNegato) throw new Error('Permission denied.'); },
          isEnabled: async () => ({ value: !opz.bleSpento }), requestEnable: async () => { reg.ble.push(['requestEnable']); },
          isLocationEnabled: async () => ({ value: false }),
          requestLEScan: async o => { reg.ble.push(['requestLEScan', o]); }, stopLEScan: async () => { reg.ble.push(['stopLEScan']); },
          connect: async o => { reg.ble.push(['connect', o]); },
          startNotifications: async o => { reg.ble.push(['startNotifications', o]); },
          write: async o => { reg.ble.push(['write', o]); }, disconnect: async o => { reg.ble.push(['disconnect', o]); },
          addListener: async (ev, cb) => { reg.bleAscolti[ev] = cb; return { remove() { delete reg.bleAscolti[ev]; } }; }
        } } : {}),
        /* cartella condivisa finta (plugin TmsCartella): registra e risponde */
        ...(opz.cartella ? { TmsCartella: {
          scegli: async () => { reg.cart.push(['scegli']); return { uri: 'content://tree/6-TMS', nome: '6 - TMS' }; },
          leggi: async o => { reg.cart.push(['leggi', o]); return o.percorso === 'apk/versione.json' ? {} : (o.percorso === 'c/x.json' ? { data: 'TESTO' } : {}); },
          scrivi: async o => { reg.cart.push(['scrivi', o]); },
          elenca: async o => { reg.cart.push(['elenca', o]); return { voci: [{ nome: 'prova', cartella: true }] }; },
          installaApk: async o => { reg.cart.push(['installaApk', o]); return { permesso: true, avviato: true }; }
        } } : {}),
        /* promemoria finti (plugin LocalNotifications) */
        ...(opz.notifiche ? { LocalNotifications: {
          checkPermissions: async () => ({ display: reg.permesso ? 'granted' : 'prompt' }),
          requestPermissions: async () => { reg.avv.push(['requestPermissions']); reg.permesso = !opz.notificheNegate; return { display: reg.permesso ? 'granted' : 'denied' }; },
          getPending: async () => ({ notifications: reg.pendenti }),
          cancel: async o => { reg.avv.push(['cancel', o]); },
          createChannel: async o => { reg.avv.push(['createChannel', o]); },
          schedule: async o => { reg.avv.push(['schedule', o]); },
          addListener: (ev, cb) => { reg.avvAscolti[ev] = cb; return { remove() {} }; }
        } } : {}) }
      };
      win.fetch = async url => {
        if (!(url in reg.file)) return { ok: false, status: 404 };
        return { ok: true, status: 200, blob: async () => new win.Blob([reg.file[url]], { type: 'application/json' }) };
      };
    }
  });
  await attendi(150);
  const w = dom.window, d = w.document;
  return { dom, w, d, reg,
    dlg: () => d.querySelector('.tms-dlg'),
    testoDlg: () => (d.querySelector('.tms-dlg .tms-dlg-msg') || {}).textContent || '',
    bottoniDlg: () => [...d.querySelectorAll('.tms-dlg .tms-dlg-az button')] };
}

(async () => {
  console.log('Prova dello strato nativo dell\'APK (jsdom, plugin finto)');

  /* ── avvio, piede, inviti ── */
  { const a = await apri();
    const { d, w } = a;
    ok(d.getElementById('menu').hidden === false, 'avvio: scheda salvata → menu');
    ok(d.getElementById('install-hint').hidden && d.getElementById('install-hint-2').hidden, 'niente invito a installare (è già un\'app)');
    ok(d.getElementById('cver').textContent.includes('APK ' + VERSIONE) && /v\d+\.\d/.test(d.getElementById('cver').textContent), 'piede: versione della PWA + versione dell\'APK');
    { const l = d.querySelector('footer a'); ok(l.href === 'https://marcomartinellione-create.github.io/TMS/' && l.target === '_blank', 'piede: il link al sito si apre nel browser'); }
    ok(!d.getElementById('file-scheda') && !d.getElementById('invia') && !d.getElementById('doveov') && !d.getElementById('bil-invia'), 'niente più file Scheda/Rientro: né «Carica la scheda», né «Crea il file per il coach», né «Manda solo le pesate»');
    ok(w.eval('typeof navigator.serviceWorker === "undefined" || true') && !/serviceWorker\.register/.test(d.documentElement.innerHTML), 'niente service worker nell\'APK');
    /* giorni con etichette libere (Giorno 1, Giorno 2…) */
    d.getElementById('vai-scheda').click();
    const giorni = [...d.querySelectorAll('.day-card .day-name')].map(e => e.textContent);
    ok(giorni.join('|') === 'Giorno 1|Giorno 2', 'giorni: etichette prese dal file («Giorno 1», «Giorno 2»)');

    /* ── avvisi in stile app ── */
    w.alert('Prima riga\nseconda riga');
    ok(a.dlg() && /Prima riga/.test(a.testoDlg()) && a.dlg().querySelector('br'), 'alert → finestra in stile app (con gli a capo)');
    ok(a.bottoniDlg().length === 1 && a.bottoniDlg()[0].textContent === 'OK', 'avviso: un solo bottone OK');
    a.bottoniDlg()[0].click();
    ok(!a.dlg(), 'avviso: OK chiude la finestra');

    /* ── conferma in stile app: elimina esercizio ── */
    d.querySelector('.day-card').click();
    await attendi();
    const prima = w.eval('WROWS.length');
    d.querySelector('[data-del="1"]').click();
    await attendi();
    ok(a.dlg() && /eliminare questo esercizio/.test(a.testoDlg()), 'elimina: chiede conferma in stile app');
    ok(a.bottoniDlg().map(b => b.textContent).join('|') === 'Annulla|OK', 'conferma: bottoni Annulla e OK');
    a.bottoniDlg()[0].click(); await attendi();
    ok(w.eval('WROWS.length') === prima && d.getElementById('ex-1'), 'elimina: Annulla lascia l\'esercizio');
    d.querySelector('[data-del="1"]').click(); await attendi();
    a.bottoniDlg()[1].click(); await attendi();
    ok(w.eval('WROWS.length') === prima - 1 && !d.getElementById('ex-1'), 'elimina: OK toglie l\'esercizio');
    { const bozza = JSON.parse(w.localStorage.getItem('tms-bozza-prova-2026-11-14') || '{}');
      ok(Array.isArray(bozza._wrows) && bozza._wrows.length === prima - 1, 'elimina: la bozza (stessa chiave della PWA) registra la struttura'); }
    /* tocco fuori dalla finestra = Annulla */
    d.querySelector('[data-del="0"]').click(); await attendi();
    a.dlg().click(); await attendi();
    ok(!a.dlg() && d.getElementById('ex-0'), 'conferma: toccare fuori vale Annulla');

    /* ── tasto indietro ── */
    d.querySelector('[data-del="0"]').click(); await attendi();
    ok(w.tmsIndietro() === true && !a.dlg() && d.getElementById('ex-0'), 'indietro: chiude prima la finestra (vale Annulla)');
    ok(w.tmsIndietro() === true, 'indietro: dal giorno risale (gestito dall\'app)');
    await attendi();
    ok(d.getElementById('home').hidden === false, 'indietro: dal giorno ai giorni');
    w.tmsIndietro(); await attendi();
    ok(d.getElementById('menu').hidden === false, 'indietro: dai giorni al menu');
    d.getElementById('qr-btn').click();
    ok(w.tmsIndietro() === true && d.getElementById('qrov').style.display === 'none', 'indietro: chiude il riquadro QR');
    ok(w.tmsIndietro() === false, 'indietro: al menu lascia fare ad Android (chiude l\'app)');

    /* ── foto: scatta o galleria ── */
    d.getElementById('vai-foto').click();
    let passato = null;
    d.getElementById('foto-file').addEventListener('click', e => { passato = !e.defaultPrevented; });
    d.querySelector('[data-foto="lato"]').click(); await attendi();
    ok(passato === false && a.dlg() && /Lato/.test(a.dlg().textContent), 'foto: prima di aprire il selettore chiede da dove (titolo = la vista)');
    ok(a.bottoniDlg().length === 3 && /Scatta una foto/.test(a.bottoniDlg()[0].textContent) && /galleria/.test(a.bottoniDlg()[1].textContent), 'foto: Scatta · Galleria · Annulla');
    ok(/sagoma/.test(a.bottoniDlg()[0].textContent), 'foto: «Scatta una foto» con la sagoma, sempre inquadrata uguale');
    a.bottoniDlg()[0].click(); await attendi(120);
    ok(/permesso della fotocamera/.test(a.testoDlg()) && passato === true && d.getElementById('foto-file').getAttribute('capture') === 'environment',
       'foto: senza fotocamera nell\'app (o senza permesso) lo dice e ripiega sulla fotocamera del telefono');
    a.bottoniDlg()[0].click(); await attendi();
    passato = null; d.querySelector('[data-foto="fronte"]').click(); await attendi();
    a.bottoniDlg()[1].click(); await attendi();
    ok(passato === true && !d.getElementById('foto-file').hasAttribute('capture'), 'foto: «Galleria» apre il selettore delle immagini');
    passato = null; d.querySelector('[data-foto="retro"]').click(); await attendi();
    a.bottoniDlg()[2].click(); await attendi();
    ok(passato === false && !a.dlg(), 'foto: Annulla non apre niente');
    w.tmsIndietro(); await attendi();

    a.dom.window.close(); }

  /* ── telefono senza scheda: il benvenuto porta al collegamento col PC ── */
  { const a = await apri({ scheda: null, cartella: true });
    ok(a.d.getElementById('benvenuto').hidden === false && a.d.getElementById('col-da-ben').hidden === false && a.d.getElementById('ben-solo-apk').hidden === true,
       'senza scheda: benvenuto con «🔗 Collega al TMS sul PC»');
    ok(typeof a.reg.ascolti.fileRicevuto === 'undefined', 'niente più «Apri con»: la pagina non ascolta file in arrivo');
    a.dom.window.close(); }

  /* ── fotocamera dentro l'app con la sagoma (getUserMedia finto) ── */
  { const a = await apri(), { w, d } = a;
    const fermate = [];
    Object.defineProperty(w.navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async vincoli => {
      a.reg.vincoli = vincoli; return { getTracks: () => [{ stop: () => fermate.push(1) }] }; } } });
    w.HTMLMediaElement.prototype.play = async function(){};
    d.getElementById('vai-foto').click();
    d.querySelector('[data-foto="lato"]').click(); await attendi();
    a.bottoniDlg()[0].click(); await attendi(150);
    ok(d.getElementById('cam').hidden === false && /Lato/.test(d.getElementById('cam-titolo').textContent) && d.querySelector('#cam-sagoma svg use[href="#sg-lato-cam"]'),
       'fotocamera: si apre dentro l\'app con la sagoma della vista (lato)');
    ok(a.reg.vincoli && a.reg.vincoli.video.facingMode === 'environment' && !a.dlg(), 'fotocamera: parte quella posteriore, nessun avviso');
    ok(d.getElementById('cam-prima-btn').disabled === true, 'fotocamera: senza una foto di prima, il pulsante «foto di prima» è spento');
    d.getElementById('cam-timer').click(); ok(/3 s/.test(d.getElementById('cam-timer').textContent), 'fotocamera: autoscatto 0 → 3 s');
    d.getElementById('cam-timer').click(); d.getElementById('cam-timer').click();
    ok(JSON.stringify(w.eval('camRitaglio(1920,1080)')) === JSON.stringify({ x: 555, y: 0, w: 810, h: 1080 }) && JSON.stringify(w.eval('camRitaglio(1080,1920)')) === JSON.stringify({ x: 0, y: 240, w: 1080, h: 1440 }),
       'fotocamera: si salva il riquadro 3:4 al centro, lo stesso che si vede');
    w.tmsIndietro(); await attendi(80);
    ok(d.getElementById('cam').hidden === true && fermate.length >= 1 && d.getElementById('foto').hidden === false, 'tasto indietro: chiude la fotocamera (spenta) e torna alle foto');
    w.eval('FOTO.fronte={img:"data:image/jpeg;base64,AAAA",data:"2026-11-16"}');
    await w.eval('camApri("fronte")'); await attendi();
    d.getElementById('cam-prima-btn').click();
    ok(d.getElementById('cam-prima').hidden === false && /AAAA/.test(d.getElementById('cam-prima').src), 'fotocamera: «foto di prima» la mostra in trasparenza per allinearsi');
    w.tmsIndietro(); await attendi(80);
    a.dom.window.close(); }

  /* ── sposta e ritaglia sulla sagoma ── */
  { const a = await apri(), { w, d } = a;
    w.HTMLCanvasElement.prototype.getContext = function(){ const c = this; c.__op = []; return { fillStyle: '', fillRect(){ c.__op.push('fill'); }, drawImage(...x){ c.__op.push(['draw'].concat(x.slice(1))); } }; };
    w.HTMLCanvasElement.prototype.toDataURL = function(){ return 'data:image/jpeg;base64,RITAGLIO'; };
    w.eval('FOTO.fronte={id:"fvecchia", img:"data:image/jpeg;base64,AAAA", data:"2026-11-10", pc:true}; renderFoto();');
    d.getElementById('vai-foto').click();
    ok(d.querySelector('[data-fotoed="fronte"]') && !d.querySelector('[data-fotoed="lato"]'), 'ritaglio: il ✥ c\'è solo sulle foto già fatte');
    d.querySelector('[data-fotoed="fronte"]').click(); await attendi(20);
    d.getElementById('rit-img').dispatchEvent(new w.Event('load')); await attendi(40);
    ok(d.getElementById('rit').hidden === false && d.querySelector('#rit-sagoma svg use[href="#sg-fronte-rit"]') && /Fronte/.test(d.getElementById('rit-titolo').textContent),
       'ritaglio: si apre con la foto e la sagoma della vista');
    ok(w.eval('RIT.z') === 1 && Math.abs(w.eval('RIT.x')) < 1e-9 && Math.abs(w.eval('RIT.y')) < 1e-9, 'ritaglio: parte con la foto che riempie il riquadro, al centro');
    w.eval('RIT.x=-30; RIT.y=12; ritZoomA(2, 150, 200);');
    ok(Math.abs(w.eval('RIT.x') - (150 - 180 * 2)) < 1e-9 && Math.abs(w.eval('RIT.y') - (200 - 188 * 2)) < 1e-9, 'ritaglio: ingrandire tiene fermo il punto toccato');
    { const p = JSON.parse(w.eval('JSON.stringify(ritParametri(RIT, 960, 1280))'));
      ok(Math.abs(p.dx - (-210 * 3.2)) < 1e-6 && Math.abs(p.dw - 960 * 2 * 3.2 * (300 / 960)) < 1e-6, 'ritaglio: si salva esattamente quello che si vede (riquadro 960×1280)'); }
    d.getElementById('rit-ok').click(); await attendi(120);
    const f = JSON.parse(w.eval('JSON.stringify(FOTO.fronte)'));
    ok(d.getElementById('rit').hidden === true && f.img === 'data:image/jpeg;base64,RITAGLIO' && f.orig === 'data:image/jpeg;base64,AAAA' && f.data === '2026-11-10' && f.sostituisce === 'fvecchia' && f.id !== 'fvecchia' && f.taglio && f.taglio.z === 2,
       'ritaglio: salvata la foto nuova, tiene l\'originale e la data dello scatto, e sostituisce sul PC quella già arrivata');
    d.querySelector('[data-fotoed="fronte"]').click(); await attendi(20);
    d.getElementById('rit-img').dispatchEvent(new w.Event('load')); await attendi(40);
    ok(/AAAA/.test(d.getElementById('rit-img').src) && w.eval('RIT.z') === 2, 'ritaglio di nuovo: riparte dall\'originale con lo spostamento di prima');
    w.tmsIndietro(); await attendi(60);
    ok(d.getElementById('rit').hidden === true && w.eval('FOTO.fronte.img') === 'data:image/jpeg;base64,RITAGLIO', 'tasto indietro: chiude senza salvare');
    a.dom.window.close(); }

  /* ── dati durevoli: Android, chiudendo l'app di forza, perde localStorage ma non IndexedDB ── */
  { const m = new Map();
    let a = await apri({ idb: fintoIDB(m), ls: { 'tms-col': '{"slug":"wander"}' } }); await attendi(150);
    ok(m.get('ls:tms-col') === '{"slug":"wander"}' && m.get('ls:tms-durevole') === '1' && !m.has('ls:tms-scheda-corrente'),
       "durevole: al primo avvio copia in IndexedDB le impostazioni che c'erano (la scheda no: sta già lì)");
    a.w.localStorage.setItem('tms-avvisi', '{"on":true,"ora":"21:00"}'); a.w.localStorage.setItem('tms-bozza-wander-collegata', '{"x":1}');
    a.w.localStorage.removeItem('tms-col'); a.w.sessionStorage.setItem('tms-prova', '1'); await attendi(80);
    ok(m.get('ls:tms-avvisi') === '{"on":true,"ora":"21:00"}' && m.get('ls:tms-bozza-wander-collegata') === '{"x":1}' && m.get('ls:tms-col') === null && !m.has('ls:tms-prova'),
       'durevole: ogni scrittura o cancellazione va subito anche in IndexedDB');
    a.dom.window.close();
    a = await apri({ idb: fintoIDB(m), ls: { 'tms-col': '{"slug":"vecchio"}' } }); await attendi(150);
    ok(a.w.localStorage.getItem('tms-avvisi') === '{"on":true,"ora":"21:00"}' && a.w.localStorage.getItem('tms-bozza-wander-collegata') === '{"x":1}' && a.w.localStorage.getItem('tms-col') === null,
       "durevole: dopo una chiusura forzata l'app riparte con le impostazioni giuste (e senza quelle tolte)");
    a.dom.window.close(); }

  /* ── inglese ── */
  { const a = await apri({ sdk: 28, lingua: 'en' });
    a.d.getElementById('vai-foto').click();
    a.d.querySelector('[data-foto="fronte"]').click(); await attendi();
    ok(/Take a photo/.test(a.dlg().textContent) && /Choose from the gallery/.test(a.dlg().textContent) && /Front/.test(a.dlg().textContent), 'inglese: menu foto tradotto');
    a.bottoniDlg()[2].click(); await attendi();
    a.w.eval('delEsercizio(0)'); await attendi();
    ok(a.bottoniDlg().map(b => b.textContent).join('|') === 'Cancel|OK' && /Remove this exercise/.test(a.testoDlg()), 'inglese: conferma tradotta');
    a.dom.window.close(); }

  /* ── bilancia Bluetooth: il trasporto (nativo.js) col plugin finto ── */
  { const a = await apri();
    ok(a.d.getElementById('vai-bil').hidden === true && typeof a.w.tmsBLE === 'undefined', 'senza il plugin Bluetooth: niente voce Bilancia'); a.dom.window.close(); }
  { const a = await apri({ ble: true }); const { d, reg } = a;
    ok(d.getElementById('vai-bil').hidden === false, 'con il plugin Bluetooth: la voce «⚖ Bilancia» c\'è');
    d.getElementById('vai-bil').click(); await attendi(120);
    const ini = reg.ble.find(x => x[0] === 'initialize');
    ok(ini && ini[1].androidNeverForLocation === true, 'Bluetooth: si chiede «Dispositivi nelle vicinanze» senza posizione (androidNeverForLocation)');
    ok(reg.ble.some(x => x[0] === 'requestLEScan') && typeof reg.bleAscolti.onScanResult === 'function', 'Bluetooth: parte la ricerca');
    reg.bleAscolti.onScanResult({ device: { deviceId: '11:22:33:44:55:66', name: 'Telefono di qualcuno' } });
    reg.bleAscolti.onScanResult({ device: { deviceId: '80:F4:16:00:00:01', name: 'HEALTHKEEP' } }); await attendi(120);
    const con = reg.ble.filter(x => x[0] === 'connect');
    ok(con.length === 1 && con[0][1].deviceId === '80:F4:16:00:00:01', 'Bluetooth: si collega alla bilancia, non al dispositivo vicino');
    const SERV = '0000ffb0-0000-1000-8000-00805f9b34fb';
    const n2 = 'notification|80:F4:16:00:00:01|' + SERV + '|0000ffb2-0000-1000-8000-00805f9b34fb', n3 = n2.replace('ffb2-', 'ffb3-');
    ok(typeof reg.bleAscolti[n2] === 'function' && typeof reg.bleAscolti[n3] === 'function' && typeof reg.bleAscolti['disconnected|80:F4:16:00:00:01'] === 'function',
       'Bluetooth: ascolta peso in diretta (FFB2), risultati (FFB3) e lo stacco, coi nomi giusti degli eventi');
    /* un messaggio informativo A1 (valori di prova): la PWA lo conferma, nativo.js lo scrive in esadecimale su FFB1 */
    const b = new Array(20).fill(0); b[1] = 0x0a; b[3] = 0xA1; b[4] = 0x33; let s = 0; for (let i = 3; i <= 18; i++) s += b[i]; b[19] = s & 0x1F;
    reg.bleAscolti[n3]({ value: b.map(x => ('0' + x.toString(16)).slice(-2)).join(' ') }); await attendi(60);
    const wr = reg.ble.find(x => x[0] === 'write');
    ok(wr && wr[1].characteristic === '0000ffb1-0000-1000-8000-00805f9b34fb' && /^00 03 00 b0 00( 00)+ [0-9a-f]{2}$/.test(wr[1].value) && wr[1].value.split(' ').length === 20,
       'Bluetooth: la conferma va su FFB1 come testo esadecimale a 20 byte («00 03 00 b0 …»)');
    a.w.tmsIndietro(); await attendi(60);
    ok(reg.ble.some(x => x[0] === 'disconnect') && d.getElementById('menu').hidden === false, 'tasto indietro: dalla Bilancia si torna al menu e il collegamento si chiude');
    a.dom.window.close(); }
  { const a = await apri({ ble: true, bleNegato: true }); a.d.getElementById('vai-bil').click(); await attendi(120);
    ok(/Dispositivi nelle vicinanze/.test(a.d.getElementById('bil-stato').textContent) && a.d.getElementById('bil-riprova').hidden === false, 'permesso negato: lo dice e offre «Riprova»');
    a.dom.window.close(); }
  { const a = await apri({ ble: true, bleSpento: true, sdk: 30 }); a.d.getElementById('vai-bil').click(); await attendi(120);
    ok(/spento/.test(a.d.getElementById('bil-stato').textContent) && a.reg.ble.some(x => x[0] === 'requestEnable'), 'Bluetooth spento: chiede di accenderlo e poi lo dice');
    a.dom.window.close(); }

  /* ── cartella condivisa col PC (plugin TmsCartella) ── */
  { const a = await apri({ cartella: true }), { w, d, reg } = a;
    ok(d.getElementById('vai-col').hidden === false && typeof w.tmsCartella === 'object' && w.tmsCartella.pronta() === false, 'cartella: nel menu «⚙ Collegamento e promemoria»; nessuna cartella scelta all’inizio');
    await w.tmsCartella.scegli();
    ok(w.tmsCartella.pronta() && w.tmsCartella.nome() === '6 - TMS' && JSON.parse(w.localStorage.getItem('tms-col-cartella')).uri === 'content://tree/6-TMS', 'cartella: scelta una volta, il suo indirizzo resta nell’app');
    ok(await w.tmsCartella.leggi('c/x.json') === 'TESTO' && await w.tmsCartella.leggi('c/manca.json') === null, 'cartella: lettura (null se il file non c’è)');
    await w.tmsCartella.scrivi('prova/dal-telefono/bozza.json', 'X');
    const sc = reg.cart.find(x => x[0] === 'scrivi');
    ok(sc && sc[1].uri === 'content://tree/6-TMS' && sc[1].percorso === 'prova/dal-telefono/bozza.json' && sc[1].data === 'X', 'cartella: scrittura col percorso relativo alla cartella scelta');
    ok(JSON.stringify(await w.tmsCartella.elenca('')) === JSON.stringify([{ nome: 'prova', cartella: true }]), 'cartella: elenco di file e sottocartelle');
    await w.tmsCartella.installaApk('apk/TMS-Scheda-9.9.9.apk', 'ab12');
    const ia = reg.cart.find(x => x[0] === 'installaApk');
    ok(ia && ia[1].percorso === 'apk/TMS-Scheda-9.9.9.apk' && ia[1].sha256 === 'ab12' && ia[1].uri === 'content://tree/6-TMS', 'aggiornamento: l’APK si passa al plugin con l’impronta da controllare');
    ok(w.TMS_APK_VERSIONE === VERSIONE, 'aggiornamento: la pagina sa quale versione dell’APK è installata (' + VERSIONE + ')');
    a.dom.window.close(); }
  /* ── promemoria (plugin LocalNotifications) ── */
  { const a = await apri({ notifiche: true, ble: true }), { w, d, reg } = a;
    ok(d.getElementById('avv-box').hidden === false, 'promemoria: riquadro «🔔 Promemoria» nella schermata Collegamento');
    d.getElementById('avv-on').checked = true; d.getElementById('avv-on').dispatchEvent(new w.Event('change')); await attendi(700);
    const sch = reg.avv.find(x => x[0] === 'schedule'), canc = reg.avv.find(x => x[0] === 'cancel');
    ok(reg.avv.some(x => x[0] === 'requestPermissions') && sch && sch[1].notifications.length === 28, 'promemoria: acceso, chiede il permesso e programma 28 sere');
    const n0 = sch && sch[1].notifications[0];
    ok(n0 && n0.channelId === 'promemoria' && n0.smallIcon === 'ic_stat_tms' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(n0.schedule.at) && n0.schedule.allowWhileIdle === true && n0.extra && n0.extra.pagina,
       'promemoria: canale, icona, ora nel formato che legge Android, pagina da aprire');
    ok(canc && JSON.stringify(canc[1].notifications) === JSON.stringify([{ id: 7003 }]), 'promemoria: prima di riprogrammare toglie solo i suoi (non altri)');
    reg.avvAscolti.localNotificationActionPerformed({ notification: { extra: { pagina: 'foto' } } }); await attendi(80);
    ok(d.getElementById('foto').hidden === false, 'promemoria: toccandolo si apre la pagina giusta (Foto progressi)');
    a.dom.window.close(); }
  { const a = await apri({ notifiche: true, notificheNegate: true }), { w, d } = a;
    d.getElementById('avv-on').checked = true; d.getElementById('avv-on').dispatchEvent(new w.Event('change')); await attendi(200);
    ok(d.getElementById('avv-on').checked === false && /notifiche/.test(a.testoDlg()), 'promemoria: se Android li nega restano spenti e lo spiega');
    a.dom.window.close(); }

  console.log((falliti ? '✗ ' : '✓ ') + passati + ' verifiche passate' + (falliti ? ', ' + falliti + ' FALLITE' : ''));
  process.exit(falliti ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
