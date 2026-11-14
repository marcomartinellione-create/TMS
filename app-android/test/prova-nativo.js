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
let passati = 0, falliti = 0;
function ok(cond, nome) { if (cond) { passati++; } else { falliti++; console.log('  ✗ ' + nome); } }
const attendi = (ms = 60) => new Promise(r => setTimeout(r, ms));

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
  const reg = { chiamate: [], ascolti: {}, file: {} };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://localhost/index.html', pretendToBeVisual: true,
    beforeParse(win) {
      win.localStorage.setItem('tms-scheda-lang', opz.lingua || 'it');
      if (opz.scheda !== null) win.localStorage.setItem('tms-scheda-corrente', JSON.stringify(opz.scheda || SCHEDA));
      win.scrollTo = () => {};
      win.Capacitor = {
        convertFileSrc: p => 'https://localhost/_capacitor_file_' + p,
        Plugins: { TmsFile: {
          info: async () => ({ sdk: opz.sdk || 34, download: (opz.sdk || 34) >= 29, versione: '1.0.0' }),
          condividi: async o => { reg.chiamate.push(['condividi', o]); },
          salvaInCartella: async o => { reg.chiamate.push(['cartella', o]);
            if (opz.annulla) { const e = new Error('annullato'); e.code = 'ANNULLATO'; throw e; }
            return { nome: 'Scelto.json' }; },
          salvaInDownload: async o => { reg.chiamate.push(['download', o]); return { nome: o.nome }; },
          addListener: (ev, cb) => { reg.ascolti[ev] = cb; return { remove() {} }; }
        } }
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

  /* ── avvio, piede, inviti, selettori di file ── */
  { const a = await apri();
    const { d, w } = a;
    ok(d.getElementById('menu').hidden === false, 'avvio: scheda salvata → menu');
    ok(d.getElementById('install-hint').hidden && d.getElementById('install-hint-2').hidden, 'niente invito a installare (è già un\'app)');
    ok(/APK 1\.0\.0/.test(d.getElementById('cver').textContent) && /v2\.\d/.test(d.getElementById('cver').textContent), 'piede: versione della PWA + versione dell\'APK');
    { const l = d.querySelector('footer a'); ok(l.href === 'https://marcomartinellione-create.github.io/TMS/' && l.target === '_blank', 'piede: il link al sito si apre nel browser'); }
    ok(!d.getElementById('file-scheda').hasAttribute('accept') && !d.getElementById('file-scheda-2').hasAttribute('accept'), 'carica scheda: il selettore mostra tutti i file');
    ok(/Apri con TMS Scheda/.test(d.getElementById('benvenuto').textContent), 'benvenuto: spiega «Apri con TMS Scheda»');
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
    a.bottoniDlg()[0].click(); await attendi();
    ok(passato === true && d.getElementById('foto-file').getAttribute('capture') === 'environment', 'foto: «Scatta» apre la fotocamera (capture)');
    passato = null; d.querySelector('[data-foto="fronte"]').click(); await attendi();
    a.bottoniDlg()[1].click(); await attendi();
    ok(passato === true && !d.getElementById('foto-file').hasAttribute('capture'), 'foto: «Galleria» apre il selettore delle immagini');
    passato = null; d.querySelector('[data-foto="retro"]').click(); await attendi();
    a.bottoniDlg()[2].click(); await attendi();
    ok(passato === false && !a.dlg(), 'foto: Annulla non apre niente');
    w.tmsIndietro(); await attendi();

    /* ── rientro: le tre strade, fatte da Android ── */
    d.getElementById('vai-scheda').click();
    d.querySelector('.day-card').click();
    const s0 = d.getElementById('s-0'); s0.value = '5'; s0.dispatchEvent(new w.Event('input', { bubbles: true }));
    const n0 = d.getElementById('n-0'); n0.value = 'bene'; n0.dispatchEvent(new w.Event('input', { bubbles: true }));
    d.getElementById('invia').click();
    d.getElementById('invia-ok').click(); await attendi();
    const vie = [...d.querySelectorAll('#dove-lista [data-via]')].map(b => b.getAttribute('data-via'));
    ok(vie.join('|') === 'condividi|cartella|download', 'rientro: menu con condividi, cartella, Download');
    d.querySelector('[data-via="condividi"]').click(); await attendi();
    const [, opC] = a.reg.chiamate.find(c => c[0] === 'condividi') || [];
    ok(opC && /^Rientro_prova_\d{4}-\d{2}-\d{2}\.json$/.test(opC.nome), 'condividi: nome del file come nella PWA (Rientro_<cliente>_<data>.json)');
    { let r = null; try { r = JSON.parse(opC.testo); } catch (e) { /* r resta null */ }
      ok(r && r.tipo === 'tms-rientro' && r.versione === 1 && r.profilo.slug === 'prova' && r.esportata === '2026-11-14', 'condividi: il contenuto è un rientro tms-rientro (formato invariato)');
      ok(r && r.righe[0].serie === 5 && r.righe[0].note === 'bene' && r.righe[0].giorno === 'Giorno 1', 'condividi: il rientro porta ciò che il cliente ha scritto'); }
    ok(d.getElementById('doveov').style.display === 'none', 'condividi: il menu si chiude');
    d.getElementById('invia-ok').click(); await attendi();
    d.querySelector('[data-via="cartella"]').click(); await attendi();
    ok(/File salvato: Scelto\.json/.test(a.testoDlg()), 'cartella: avviso col nome scelto dal cliente');
    a.bottoniDlg()[0].click();
    d.getElementById('invia-ok').click(); await attendi();
    d.querySelector('[data-via="download"]').click(); await attendi();
    ok(/File creato: Rientro_prova_/.test(a.testoDlg()) && /Download/.test(a.testoDlg()), 'Download: avviso «lo trovi nei Download»');
    a.bottoniDlg()[0].click();

    /* ── file in arrivo («Apri con»): sostituzione con conferma ── */
    ok(typeof a.reg.ascolti.fileRicevuto === 'function', '«Apri con»: la pagina ascolta i file in arrivo');
    const nuova = JSON.parse(JSON.stringify(SCHEDA)); nuova.esportata = '2026-11-21';
    a.reg.file['https://localhost/_capacitor_file_/cache/in/Scheda_prova.json'] = JSON.stringify(nuova);
    a.reg.ascolti.fileRicevuto({ nome: 'Scheda_prova.json', percorso: '/cache/in/Scheda_prova.json' }); await attendi(120);
    ok(a.dlg() && /già una scheda caricata/.test(a.testoDlg()), '«Apri con»: c\'è già una scheda → chiede se sostituirla');
    a.bottoniDlg()[1].click(); await attendi(120);
    ok(w.eval('SCHEDA.esportata') === '2026-11-21' && /2026-11-21/.test(d.getElementById('scheda-info').textContent) && d.getElementById('menu').hidden === false, '«Apri con»: OK carica la scheda nuova e torna al menu');
    ok(JSON.parse(w.localStorage.getItem('tms-bozza-prova-2026-11-14') || '{}')['s-0'] === '5', '«Apri con»: la bozza della scheda vecchia resta salvata');
    ok(w.eval('navLivelli') === 0 && w.tmsIndietro() === false, '«Apri con»: dopo la scheda nuova il tasto indietro riparte dal menu');
    a.reg.file['https://localhost/_capacitor_file_/cache/in/foto.json'] = '{"tipo":"altro"}';
    a.reg.ascolti.fileRicevuto({ nome: 'foto.json', percorso: '/cache/in/foto.json' }); await attendi(120);
    ok(/non è una scheda del TMS/.test(a.testoDlg()), '«Apri con»: un file che non è una scheda viene rifiutato con un avviso');
    a.bottoniDlg()[0].click();
    a.reg.ascolti.fileRicevuto({ errore: 'permesso negato' }); await attendi();
    ok(/Non riesco ad aprire questo file: permesso negato/.test(a.testoDlg()), '«Apri con»: errore di lettura → avviso');
    a.bottoniDlg()[0].click();
    a.dom.window.close(); }

  /* ── telefono senza scheda: il file in arrivo si carica subito; salvataggio annullato ── */
  { const a = await apri({ scheda: null, annulla: true });
    ok(a.d.getElementById('benvenuto').hidden === false, 'senza scheda: benvenuto');
    a.reg.file['https://localhost/_capacitor_file_/x/Scheda.json'] = JSON.stringify(SCHEDA);
    a.reg.ascolti.fileRicevuto({ nome: 'Scheda.json', percorso: '/x/Scheda.json' }); await attendi(150);
    ok(!a.dlg() && a.d.getElementById('menu').hidden === false && a.w.eval('SCHEDA.profilo.nome') === 'Cliente Prova', 'senza scheda: «Apri con» la carica subito, senza domande');
    a.d.getElementById('vai-scheda').click();
    a.d.getElementById('invia').click();
    a.d.getElementById('invia-ok').click(); await attendi();
    a.d.querySelector('[data-via="cartella"]').click(); await attendi();
    ok(!a.dlg(), 'cartella annullata dal cliente: nessun messaggio');
    a.dom.window.close(); }

  /* ── telefono vecchio (Android 9): niente Download; inglese ── */
  { const a = await apri({ sdk: 28, lingua: 'en' });
    a.d.getElementById('vai-scheda').click();
    a.d.getElementById('invia').click();
    a.d.getElementById('invia-ok').click(); await attendi();
    const vie = [...a.d.querySelectorAll('#dove-lista [data-via]')].map(b => b.getAttribute('data-via'));
    ok(vie.join('|') === 'condividi|cartella', 'Android 9: solo condividi e cartella (i Download liberi arrivano con Android 10)');
    a.w.tmsIndietro();
    a.w.tmsIndietro(); await attendi();
    a.w.tmsIndietro(); await attendi();
    a.d.getElementById('vai-foto').click();
    a.d.querySelector('[data-foto="fronte"]').click(); await attendi();
    ok(/Take a photo/.test(a.dlg().textContent) && /Choose from the gallery/.test(a.dlg().textContent) && /Front/.test(a.dlg().textContent), 'inglese: menu foto tradotto');
    a.bottoniDlg()[2].click(); await attendi();
    a.w.eval('delEsercizio(0)'); await attendi();
    ok(a.bottoniDlg().map(b => b.textContent).join('|') === 'Cancel|OK' && /Remove this exercise/.test(a.testoDlg()), 'inglese: conferma tradotta');
    ok(/Open with TMS Scheda/.test(a.d.getElementById('benvenuto').textContent), 'inglese: «Apri con» tradotto');
    a.dom.window.close(); }

  console.log((falliti ? '✗ ' : '✓ ') + passati + ' verifiche passate' + (falliti ? ', ' + falliti + ' FALLITE' : ''));
  process.exit(falliti ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
