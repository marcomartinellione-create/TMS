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
      win.TMS_HUB = opz.hub === false ? '' : 'https://hub.test';   /* l'hub del TMS: nell'APK vero è scritto nella pagina */
      try { Object.defineProperty(win, 'crypto', { value: require('crypto').webcrypto, configurable: true }); } catch (e) {}   /* come nella WebView: crypto.subtle */
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
          startNotifications: async o => { reg.ble.push(['startNotifications', o]); if (opz.bleNotificheNo) throw new Error('Insufficient authentication'); },
          write: async o => { reg.ble.push(['write', o]); }, disconnect: async o => { reg.ble.push(['disconnect', o]); },
          read: async o => { reg.ble.push(['read', o]); return { value: '33 2e 32 35 2e 30 2e 33' }; },
          addListener: async (ev, cb) => { reg.bleAscolti[ev] = cb; return { remove() { delete reg.bleAscolti[ev]; } }; }
        } } : {}),
        /* cartella condivisa finta (plugin TmsCartella): registra e risponde */
        ...(opz.cartella ? { TmsCartella: {
          scegli: async () => { reg.cart.push(['scegli']); return { uri: 'content://tree/6-TMS', nome: '6 - TMS' }; },
          leggi: async o => { reg.cart.push(['leggi', o]); return o.percorso === 'c/x.json' ? { data: 'TESTO' } : {}; },
          scrivi: async o => { reg.cart.push(['scrivi', o]); },
          elenca: async o => { reg.cart.push(['elenca', o]); return { voci: [{ nome: 'prova', cartella: true }] }; },
          scaricaApk: async o => { reg.cart.push(['scaricaApk', o]); return { permesso: true, avviato: true }; }
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
    const giorni = [...d.querySelectorAll('#days .day-card .day-name')].map(e => e.textContent);
    ok(giorni.join('|') === 'Giorno 1|Giorno 2', 'giorni: etichette prese dal file («Giorno 1», «Giorno 2»)');

    /* ── avvisi in stile app ── */
    w.alert('Prima riga\nseconda riga');
    ok(a.dlg() && /Prima riga/.test(a.testoDlg()) && a.dlg().querySelector('br'), 'alert → finestra in stile app (con gli a capo)');
    ok(a.bottoniDlg().length === 1 && a.bottoniDlg()[0].textContent === 'OK', 'avviso: un solo bottone OK');
    a.bottoniDlg()[0].click();
    ok(!a.dlg(), 'avviso: OK chiude la finestra');

    /* ── conferma in stile app: elimina esercizio ── */
    d.querySelector('#days .day-card').click();
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
  /* ── fascia cardio: lo stesso trasporto con servizio 0x180D e misura 0x2A37; la bilancia collegata non la stacca ── */
  { const a = await apri({ ble: true }); const { d, reg } = a;
    const HR = '0000180d-0000-1000-8000-00805f9b34fb', MIS = '00002a37-0000-1000-8000-00805f9b34fb', ID = 'C8:0F:10:00:00:02';
    d.getElementById('vai-scheda').click(); await attendi(30); d.querySelector('#home-fasi [data-hf="c"]').click(); await attendi(30);
    ok(d.querySelectorAll('#home-sport [data-fcvai]').length === 12, 'Allenamento › Cardio: gli sport da scegliere');
    a.w.eval('fcApri()'); await attendi(60); d.getElementById('fc-collega').click(); await attendi(120);   /* la fascia si sceglie in Impostazioni */
    reg.bleAscolti.onScanResult({ device: { deviceId: '11:22:33:44:55:66', name: 'Telefono di qualcuno' } });
    reg.bleAscolti.onScanResult({ device: { deviceId: ID, name: '' }, uuids: [HR], rssi: -60 }); await attendi(60);
    const bt = d.querySelectorAll('#fc-trovati [data-fcd]');
    ok(bt.length === 1 && bt[0].textContent.indexOf(ID) >= 0, 'fascia: tra i dispositivi vicini compare solo quella che dichiara il servizio 0x180D (anche senza nome)');
    bt[0].click(); await attendi(120);
    const sn = reg.ble.filter(x => x[0] === 'startNotifications');
    ok(reg.ble.some(x => x[0] === 'connect' && x[1].deviceId === ID) && sn.length === 1 && sn[0][1].service === HR && sn[0][1].characteristic === MIS,
       'fascia: collegamento e notifiche sulla misura 0x2A37 del servizio 0x180D (UUID interi)');
    reg.bleAscolti['notification|' + ID + '|' + HR + '|' + MIS]({ value: '16 8c 00 04' }); await attendi(60);
    ok(/^140/.test(d.getElementById('fc-bpm').textContent) && d.getElementById('fc-chip-v').textContent === '140', 'fascia: la misura in esadecimale diventa 140 bpm sulla pagina e nella barra');
    a.w.tmsIndietro(); await attendi(60);
    ok(d.getElementById('menu').hidden === false && !reg.ble.some(x => x[0] === 'disconnect'), 'tasto indietro: dalle Impostazioni si torna al menu e la fascia resta collegata');
    /* la bilancia si collega e si stacca: gli ascolti della fascia restano */
    d.getElementById('vai-bil').click(); await attendi(120);
    reg.bleAscolti.onScanResult({ device: { deviceId: '80:F4:16:00:00:01', name: 'HEALTHKEEP' } }); await attendi(120);
    a.w.tmsIndietro(); await attendi(60);
    ok(reg.ble.some(x => x[0] === 'disconnect' && x[1].deviceId === '80:F4:16:00:00:01') && !reg.ble.some(x => x[0] === 'disconnect' && x[1].deviceId === ID) &&
       typeof reg.bleAscolti['notification|' + ID + '|' + HR + '|' + MIS] === 'function', 'bilancia e fascia insieme: chiudendo la bilancia la fascia resta collegata e ascoltata');
    a.dom.window.close(); }
  { const a = await apri({ ble: true, bleNotificheNo: true }); const { d, reg } = a;
    a.w.eval('fcApri()'); await attendi(60); d.getElementById('fc-collega').click(); await attendi(120);   /* la fascia si sceglie in Impostazioni */
    reg.bleAscolti.onScanResult({ device: { deviceId: 'C8:0F:10:00:00:03', name: 'Amazfit Helio Strap' } }); await attendi(60);
    d.querySelector('#fc-trovati [data-fcd]').click(); await attendi(150);
    ok(reg.ble.some(x => x[0] === 'disconnect' && x[1].deviceId === 'C8:0F:10:00:00:03') && /Heart Rate Push/.test(d.getElementById('fc-stato').textContent),
       'bracciale che rifiuta le notifiche: si stacca e lo dice (Heart Rate Push o chiave)');
    /* bracciale con la chiave: lettura del firmware (180A/2A26) e caratteristiche Huami con l'UUID intero */
    const fw = await a.w.tmsBLE.leggi('C8:0F:10:00:00:03', '180a', '2a26'), rd = reg.ble.filter(x => x[0] === 'read').pop();
    ok(String.fromCharCode.apply(null, fw) === '3.25.0.3' && rd[1].service === '0000180a-0000-1000-8000-00805f9b34fb' && rd[1].characteristic === '00002a26-0000-1000-8000-00805f9b34fb',
       'bracciale: tmsBLE.leggi legge una caratteristica (firmware 180A/2A26) e restituisce i byte');
    await a.w.tmsBLE.scrivi('C8:0F:10:00:00:03', '00000016-0000-3512-2118-0009af100700', [1], '0000fee0-0000-1000-8000-00805f9b34fb');
    const wr = reg.ble.filter(x => x[0] === 'write').pop();
    ok(wr[1].service === '0000fee0-0000-1000-8000-00805f9b34fb' && wr[1].characteristic === '00000016-0000-3512-2118-0009af100700' && wr[1].value === '01',
       'bracciale: scrittura sulla caratteristica Huami 0016 del servizio FEE0 (UUID interi passano come sono)');
    a.dom.window.close(); }
  { const a = await apri({ ble: true, bleNegato: true }); a.d.getElementById('vai-bil').click(); await attendi(120);
    ok(/Dispositivi nelle vicinanze/.test(a.d.getElementById('bil-stato').textContent) && a.d.getElementById('bil-riprova').hidden === false, 'permesso negato: lo dice e offre «Riprova»');
    a.dom.window.close(); }
  { const a = await apri({ ble: true, bleSpento: true, sdk: 30 }); a.d.getElementById('vai-bil').click(); await attendi(120);
    ok(/spento/.test(a.d.getElementById('bil-stato').textContent) && a.reg.ble.some(x => x[0] === 'requestEnable'), 'Bluetooth spento: chiede di accenderlo e poi lo dice');
    a.dom.window.close(); }

  /* ── collegamento col PC del personal (dal 24/11/2026 passa dall'hub del TMS) e aggiornamento dell'APK ── */
  { const a = await apri({ cartella: true }), { w, d, reg } = a;
    ok(d.getElementById('vai-col').hidden === false && /Impostazioni/.test(d.getElementById('vai-col').textContent) && d.getElementById('col-box').hidden === false && d.getElementById('col').contains(d.getElementById('lang-btn')) && typeof w.tmsCartella === 'undefined' && !d.getElementById('col-cartella'),
       'collegamento: nel menu «⚙ Impostazioni» (con lingua e QR), senza cartella da scegliere (passa dall’hub)');
    ok(typeof w.tmsAggiorna === 'object', 'aggiornamento: il plugin TmsCartella serve solo a scaricare l’APK nuovo (window.tmsAggiorna)');
    /* versione.json su GitHub (fetch finto): più nuova → domanda in stile app → sì → il plugin scarica url + impronta */
    const VJ = { versione: '9.9.9', file: 'TMS-Scheda-9.9.9.apk', sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', url: 'https://github.com/marcomartinellione-create/TMS/releases/download/v9.9.9/TMS-Scheda-9.9.9.apk', pubblicata: '2026-11-18' };
    const chiesti = []; w.fetch = async (u) => { chiesti.push(String(u)); return { ok: true, json: async () => VJ }; };
    w.eval('colApk(true)'); await attendi(60);
    ok(chiesti.length === 1 && chiesti[0].indexOf('https://marcomartinellione-create.github.io/TMS/scheda/versione.json') === 0 && /9\.9\.9/.test(a.testoDlg()),
       'aggiornamento: legge versione.json da GitHub e chiede se installare la 9.9.9');
    a.bottoniDlg().find(b => /OK/.test(b.textContent)).click(); await attendi(60);
    const sa = reg.cart.find(x => x[0] === 'scaricaApk');
    ok(sa && sa[1].url === VJ.url && sa[1].sha256 === VJ.sha256, 'aggiornamento: al sì il plugin scarica l’APK dalla release, con l’impronta da controllare');
    w.eval('colApk()'); await attendi(30);
    ok(chiesti.length === 1, 'aggiornamento: non ricontrolla a ogni giro (al massimo ogni 6 ore)');
    w.fetch = async () => { throw new Error('offline'); };
    w.eval('COL.apk=null; COL.chiestoApk=""; colApk(true)'); await attendi(30);
    ok(!a.dlg() && w.eval('COL.apk') === null, 'aggiornamento: senza rete, silenzio');
    w.fetch = async () => ({ ok: true, json: async () => Object.assign({}, VJ, { url: 'https://altro.example/TMS-Scheda-9.9.9.apk' }) });
    w.eval('colApk(true)'); await attendi(30);
    ok(!a.dlg() && w.eval('COL.apk') === null, 'aggiornamento: un indirizzo che non è la release del TMS si ignora');
    ok(w.TMS_APK_VERSIONE === VERSIONE, 'aggiornamento: la pagina sa quale versione dell’APK è installata (' + VERSIONE + ')');
    a.dom.window.close(); }
  /* ── promemoria (plugin LocalNotifications) ── */
  { const a = await apri({ notifiche: true, ble: true }), { w, d, reg } = a;
    ok(d.getElementById('avv-box').hidden === false, 'promemoria: riquadro «🔔 Promemoria» nella schermata Collegamento');
    d.getElementById('avv-on').checked = true; d.getElementById('avv-on').dispatchEvent(new w.Event('change')); await attendi(700);
    const sch = reg.avv.find(x => x[0] === 'schedule'), canc = reg.avv.find(x => x[0] === 'cancel');
    /* 28 sere a partire da oggi; dopo le 21:00 (ora di serie) quella di stasera è già passata e non si programma */
    const sere = new Date().getHours() >= 21 ? 27 : 28;
    ok(reg.avv.some(x => x[0] === 'requestPermissions') && sch && sch[1].notifications.length === sere, 'promemoria: acceso, chiede il permesso e programma ' + sere + ' sere');
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
  /* ── dieta della sera (con un piano alimentare) e fine del recupero ── */
  { const conDieta = Object.assign({}, SCHEDA, { dieta: { fase: 'cut', label: 'Definizione', tot: { kcal: 2100 },
      righe: [{ pasto: 'Colazione', alimento: 'Avena', grammi: 80, kcal: 300 }] } });
    const a = await apri({ notifiche: true, scheda: conDieta }), { w, d, reg } = a;
    await attendi(600);
    ok(reg.avv.filter(x => x[0] === 'requestPermissions').length === 1, 'dieta: con un piano alimentare l’APK chiede una volta di poter mandare la domanda della sera');
    const sch = reg.avv.filter(x => x[0] === 'schedule').pop(), nn = sch ? sch[1].notifications : [];
    ok(nn.length >= 27 && nn.every(n => n.id >= 7050 && n.id < 7078 && n.extra.pagina === 'alim' && n.channelId === 'promemoria'),
       'dieta: ogni sera la domanda sulla dieta (id 7050+, apre l’Alimentazione), anche coi promemoria della pesata spenti');
    ok(d.getElementById('avv-dieta').checked === true, 'dieta: nel riquadro Promemoria la casella «domanda sulla dieta» è accesa di serie');
    reg.avvAscolti.localNotificationActionPerformed({ notification: { extra: { pagina: 'alim' } } }); await attendi(80);
    ok(d.getElementById('alim').hidden === false && d.getElementById('dieta-cal'), 'dieta: toccando la notifica si apre l’Alimentazione col calendario');
    /* timer: in secondo piano la notifica di fine recupero, tornando davanti si toglie */
    w.eval('startTimer("Panca", 90)');
    let nascosta = true; Object.defineProperty(d, 'hidden', { configurable: true, get: () => nascosta });
    d.dispatchEvent(new w.Event('visibilitychange')); await attendi(80);
    const rec = reg.avv.filter(x => x[0] === 'schedule').map(x => x[1].notifications[0]).find(n => n.id === 7200);
    ok(rec && rec.channelId === 'recupero' && rec.extra.pagina === 'timer' && Math.abs(new Date(rec.schedule.at).getTime() - w.eval('timerFine')) < 5 && /Panca/.test(rec.body),
       'timer: con l’app in secondo piano programma la notifica «Recupero finito» all’ora di fine (canale recupero)');
    ok(reg.avv.some(x => x[0] === 'createChannel' && x[1].id === 'recupero'), 'timer: il canale «Timer di recupero» si crea la prima volta');
    nascosta = false; const nc = reg.avv.length; d.dispatchEvent(new w.Event('visibilitychange')); await attendi(80);
    ok(reg.avv.slice(nc).some(x => x[0] === 'cancel' && JSON.stringify(x[1].notifications) === JSON.stringify([{ id: 7200 }])), 'timer: tornando nell’app la notifica di fine recupero si toglie');
    w.eval('mostra("home")');
    reg.avvAscolti.localNotificationActionPerformed({ notification: { extra: { pagina: 'timer' } } }); await attendi(80);
    ok(d.getElementById('home').hidden === false, 'timer: toccando la notifica di fine recupero si resta dove si era');
    a.dom.window.close(); }
  /* ── schermata d'analisi della pesata: notifica a fine misura e tasto indietro ── */
  { const a = await apri({ notifiche: true, ble: true, ls: { 'tms-timer-chiesto': '1' } }), { w, d, reg } = a;
    w.HTMLMediaElement.prototype.play = () => Promise.resolve(); w.HTMLMediaElement.prototype.pause = () => {};
    reg.permesso = true;
    w.eval('mostra("bil"); BIL.live=72.3; BIL.liveStato=2; bilStato("misura");');
    ok(d.getElementById('scan').hidden === false, 'pesata: col peso in diretta si apre la schermata d’analisi');
    ok(w.tmsIndietro() === true && d.getElementById('scan').hidden === true && w.eval('SCAN.via') === true, 'pesata: il tasto indietro chiude la schermata (non si riapre fino alla pesata dopo)');
    w.eval('bilStato("misura")');
    ok(d.getElementById('scan').hidden === true, 'pesata: chiusa a metà misura resta chiusa');
    w.eval('bilStato("cerco"); BIL.liveStato=2; bilStato("misura"); BIL.ultima={peso:72.3, grasso:14.2}; bilStato("fatto");'); await attendi(80);
    const fine = reg.avv.filter(x => x[0] === 'schedule').map(x => x[1].notifications[0]).find(n => n.id === 7300);
    ok(fine && /Pesata finita/.test(fine.title) && /72,3 kg/.test(fine.body) && fine.channelId === 'promemoria', 'pesata: a fine misura una notifica del telefono (si sente anche senza guardare lo schermo)');
    w.eval('scanChiudi()');
    ok(d.getElementById('col-qr').hidden === true, 'QR: senza il lettore di Android niente «Inquadra il QR» (si scrive il codice)');
    w.BarcodeDetector = function(){ this.detect = () => Promise.resolve([]); };
    Object.defineProperty(w.navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [] }) } });
    w.eval('colRender()');
    ok(d.getElementById('col-qr').hidden === false && d.getElementById('col-oppure').hidden === false, 'QR: col lettore di Android, nella schermata Collegamento compare «Inquadra il QR» (oppure il codice)');
    d.getElementById('qrscan').hidden = false;
    ok(w.tmsIndietro() === true && d.getElementById('qrscan').hidden === true, 'QR: il tasto indietro chiude il lettore del QR');
    a.dom.window.close(); }

  console.log((falliti ? '✗ ' : '✓ ') + passati + ' verifiche passate' + (falliti ? ', ' + falliti + ' FALLITE' : ''));
  process.exit(falliti ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
