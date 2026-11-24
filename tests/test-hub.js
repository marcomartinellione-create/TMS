/* test-hub.js — prove dell'hub (hub/worker.js) su un D1 finto (hub/d1-finto.cjs, node:sqlite).
   Gira con: node --no-warnings tests/test-hub.js  (dentro npm test) */
'use strict';
const path = require('path');
const { pathToFileURL } = require('url');
const { nuovoD1 } = require('../hub/d1-finto.cjs');

let okN = 0, failN = 0;
function ok(c, msg) { if (c) okN++; else { failN++; console.log('  FAIL ' + msg); } }

const HUB = 'https://hub.test';
async function impronta(t) { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return Buffer.from(h).toString('hex'); }
const gettone = n => 'g' + String(n).padEnd(42, 'x');

(async () => {
  const W = (await import(pathToFileURL(path.join(__dirname, '..', 'hub', 'worker.js')).href)).default;
  const { pulizia, PARTE, SCADENZA_EVENTI } = await import(pathToFileURL(path.join(__dirname, '..', 'hub', 'worker.js')).href);
  const env = { DB: nuovoD1() };
  const chiama = async (metodo, percorso, { tok, corpo, testo } = {}) => {
    const h = {}; if (tok) h.Authorization = 'Bearer ' + tok;
    let body; if (corpo !== undefined) { body = JSON.stringify(corpo); h['Content-Type'] = 'application/json'; } else if (testo !== undefined) body = testo;
    const r = await W.fetch(new Request(HUB + percorso, { method: metodo, headers: h, body }), env);
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
    return { stato: r.status, j, t, h: r.headers };
  };
  const sql = env.DB._sql;
  sql.prepare('INSERT INTO inviti (codice, creato) VALUES (?, ?)').run('INVITOUNO', 1);
  sql.prepare('INSERT INTO inviti (codice, creato) VALUES (?, ?)').run('INVITODUE', 1);

  console.log('--- H1: salute, CORS, gettoni ---');
  { const r = await chiama('GET', '/v1/salute'); ok(r.stato === 200 && r.j.hub === 'tms', 'salute: risponde senza gettone'); }
  { const r = await W.fetch(new Request(HUB + '/v1/io', { method: 'OPTIONS' }), env);
    ok(r.status === 204 && r.headers.get('Access-Control-Allow-Origin') === '*' && /Authorization/.test(r.headers.get('Access-Control-Allow-Headers')), 'CORS: l\'app del telefono e il TMS possono chiamare l\'hub'); }
  ok((await chiama('GET', '/v1/io')).stato === 401 && (await chiama('GET', '/v1/io', { tok: gettone('nessuno') })).stato === 401, 'senza gettone, o con uno sconosciuto: 401');
  ok((await chiama('GET', '/v1/altro', { tok: gettone('p1') })).stato === 401 && (await chiama('GET', '/v2/salute')).stato === 404, 'percorsi sconosciuti: niente');

  console.log('--- H2: personal e inviti ---');
  const P1 = gettone('p1'), PID1 = 'aaaaaaaaaaaaaaa1', P2 = gettone('p2'), PID2 = 'bbbbbbbbbbbbbbb2';
  ok((await chiama('POST', '/v1/personal', { tok: P1, corpo: { pid: PID1, invito: 'SBAGLIATO' } })).stato === 403, 'personal: senza un invito valido non entra');
  ok((await chiama('POST', '/v1/personal', { tok: P1, corpo: { pid: 'corto', invito: 'INVITOUNO' } })).stato === 400, 'personal: pid malformato rifiutato');
  { const r = await chiama('POST', '/v1/personal', { tok: P1, corpo: { pid: PID1, invito: 'invito-uno' } });
    ok(r.stato === 201, 'personal: con l\'invito (scritto come si vuole) si registra'); }
  ok((await chiama('POST', '/v1/personal', { tok: P2, corpo: { pid: PID2, invito: 'INVITOUNO' } })).stato === 403, 'invito: si usa una volta sola');
  ok((await chiama('POST', '/v1/personal', { tok: P1, corpo: { pid: PID1 } })).j.gia === true, 'personal: registrarsi di nuovo col proprio gettone (PC nuovo, codice di recupero) va bene');
  ok((await chiama('POST', '/v1/personal', { tok: P2, corpo: { pid: PID1, invito: 'INVITODUE' } })).stato === 409, 'personal: il pid di un altro non si prende');
  ok((await chiama('POST', '/v1/personal', { tok: P2, corpo: { pid: PID2, invito: 'INVITODUE' } })).stato === 201, 'secondo personal registrato');
  { const r = await chiama('GET', '/v1/io', { tok: P1 }); ok(r.j.ruolo === 'personal' && r.j.pid === PID1, 'io: il personal si riconosce'); }
  { const righe = sql.prepare('SELECT * FROM personal').all();
    ok(righe.length === 2 && righe.every(x => /^[a-f0-9]{64}$/.test(x.th)) && !JSON.stringify(righe).includes(P1), 'sull\'hub resta solo l\'impronta del gettone, non il gettone'); }

  console.log('--- H3: legami ---');
  const C1 = gettone('c1'), LID1 = 'cccccccccccccc01', C2 = gettone('c2'), LID2 = 'cccccccccccccc02';
  const th1 = await impronta(C1), th2 = await impronta(C2);
  ok((await chiama('PUT', '/v1/legami/' + LID1, { tok: P1, corpo: { th: th1, etichetta: 'CIFRATA' } })).stato === 201, 'legame: il personal crea il legame col cliente');
  ok((await chiama('PUT', '/v1/legami/' + LID1, { tok: P2, corpo: { th: th2, etichetta: 'X' } })).stato === 409, 'legame: un altro personal non può prendersi il legame');
  ok((await chiama('PUT', '/v1/legami/' + LID2, { tok: P2, corpo: { th: th1, etichetta: 'X' } })).stato === 409, 'legame: lo stesso gettone cliente non va su due legami');
  ok((await chiama('PUT', '/v1/legami/' + LID2, { tok: P2, corpo: { th: await impronta(P2), etichetta: 'X' } })).stato === 400, 'legame: il gettone del personal non può fare da cliente');
  ok((await chiama('PUT', '/v1/legami/' + LID2, { tok: P2, corpo: { th: th2, etichetta: 'ALTRA' } })).stato === 201, 'secondo legame (dell\'altro personal)');
  { const r = await chiama('GET', '/v1/legami', { tok: P1 }); ok(r.j.legami.length === 1 && r.j.legami[0].lid === LID1 && r.j.legami[0].etichetta === 'CIFRATA', 'legami: ogni personal vede solo i suoi (con l\'etichetta cifrata)'); }
  { const r = await chiama('GET', '/v1/io', { tok: C1 }); ok(r.j.ruolo === 'cliente' && r.j.lid === LID1, 'io: il cliente si riconosce col suo legame'); }
  ok((await chiama('GET', '/v1/legami', { tok: C1 })).stato === 403, 'legami: il cliente non li elenca');

  console.log('--- H4: file ---');
  const F = (lid, p) => '/v1/f/' + lid + (p ? '/' + p : '');
  ok((await chiama('PUT', F(LID1, 'dal-pc/scheda.json'), { tok: P1, testo: '{"cifrato":1}' })).stato === 200, 'personal: scrive in dal-pc');
  ok((await chiama('PUT', F(LID1, 'dal-telefono/scheda.json'), { tok: P1, testo: 'x' })).stato === 403, 'personal: in dal-telefono non scrive');
  ok((await chiama('PUT', F(LID1, 'dal-telefono/scheda.json'), { tok: C1, testo: '{"tel":1}' })).stato === 200, 'cliente: scrive in dal-telefono');
  ok((await chiama('PUT', F(LID1, 'dal-pc/scheda.json'), { tok: C1, testo: 'x' })).stato === 403, 'cliente: in dal-pc non scrive');
  { const r = await chiama('GET', F(LID1, 'dal-pc/scheda.json'), { tok: C1 }); ok(r.stato === 200 && r.t === '{"cifrato":1}' && +r.h.get('X-Ver') > 0, 'cliente: legge il file del personal'); }
  { const r = await chiama('GET', F(LID1, 'dal-telefono/scheda.json'), { tok: P1 }); ok(r.stato === 200 && r.t === '{"tel":1}', 'personal: legge il file del cliente'); }
  ok((await chiama('GET', F(LID1, 'dal-pc/manca.json'), { tok: P1 })).stato === 404, 'file che non c\'è: 404');
  ok((await chiama('GET', F(LID1, 'dal-pc/scheda.json'), { tok: P2 })).stato === 403 && (await chiama('GET', F(LID1, 'dal-pc/scheda.json'), { tok: C2 })).stato === 403,
     'ISOLAMENTO: un altro personal o un altro cliente non leggono i file di questo legame');
  ok((await chiama('GET', F(LID2), { tok: C1 })).stato === 403, 'ISOLAMENTO: un cliente non elenca i file di un altro legame');
  ok((await chiama('PUT', F(LID1, 'dal-pc/../x'), { tok: P1, testo: 'x' })).stato === 400 && (await chiama('PUT', F(LID1, 'altro/x.json'), { tok: P1, testo: 'x' })).stato === 400,
     'percorsi strani rifiutati');
  await chiama('PUT', F(LID1, 'dal-pc/scheda.json'), { tok: P1, testo: '{"cifrato":2}' });
  ok((await chiama('GET', F(LID1, 'dal-pc/scheda.json'), { tok: C1 })).t === '{"cifrato":2}' && sql.prepare("SELECT COUNT(*) AS n FROM file WHERE percorso='dal-pc/scheda.json'").get().n === 1,
     'un file nuovo sostituisce il vecchio: niente copie doppie, niente versioni vecchie');
  /* file grande: si spezza e si ricompone */
  { const grande = 'A'.repeat(PARTE * 2 + 123) + 'FINE';
    await chiama('PUT', F(LID1, 'dal-pc/video.json'), { tok: P1, testo: grande });
    const n = sql.prepare("SELECT COUNT(*) AS n FROM file WHERE percorso='dal-pc/video.json'").get().n;
    const r = await chiama('GET', F(LID1, 'dal-pc/video.json'), { tok: C1 });
    ok(n === 3 && r.t === grande, 'file grande (video): spezzato in 3 righe del database e ricomposto uguale'); }
  /* elenco */
  await chiama('PUT', F(LID1, 'dal-pc/stato.json'), { tok: P1, testo: 'S' });
  await chiama('PUT', F(LID1, 'dal-telefono/eventi/pesata-1.json'), { tok: C1, testo: 'P1' });
  await chiama('PUT', F(LID1, 'dal-telefono/eventi/foto-1.json'), { tok: C1, testo: 'F1' });
  { const r = await chiama('GET', F(LID1) + '?dir=dal-pc/&testo=1&salta=video.json', { tok: C1 });
    const per = Object.fromEntries(r.j.file.map(f => [f.nome, f]));
    ok(r.j.file.length === 3 && per['scheda.json'].testo === '{"cifrato":2}' && per['stato.json'].testo === 'S' && per['video.json'].testo === undefined && per['video.json'].dim > PARTE * 2,
       'elenco col contenuto in una chiamata sola, saltando il video (resta solo la grandezza)'); }
  { const r = await chiama('GET', F(LID1) + '?dir=dal-telefono/eventi/', { tok: P1 });
    ok(r.j.file.map(f => f.nome).join(',') === 'foto-1.json,pesata-1.json' && r.j.file.every(f => f.testo === undefined), 'elenco senza contenuto: solo nomi, ore e grandezze'); }
  ok((await chiama('GET', F(LID1) + '?dir=../', { tok: P1 })).stato === 400, 'elenco: cartella strana rifiutata');
  /* togliere */
  ok((await chiama('DELETE', F(LID1, 'dal-telefono/eventi/pesata-1.json'), { tok: P1 })).j.tolto === true, 'personal: toglie la pesata dopo averla salvata');
  ok((await chiama('DELETE', F(LID1, 'dal-telefono/scheda.json'), { tok: P1 })).stato === 403, 'personal: la scheda del telefono non la toglie');
  ok((await chiama('DELETE', F(LID1, 'dal-pc/stato.json'), { tok: C1 })).stato === 403, 'cliente: i file del personal non li toglie');

  console.log('--- H5: pulizia notturna e legame tolto ---');
  { const adesso = Date.now();
    sql.prepare("UPDATE file SET ora = ? WHERE percorso = 'dal-telefono/eventi/foto-1.json'").run(adesso - SCADENZA_EVENTI - 1000);
    sql.prepare("UPDATE file SET ora = ? WHERE percorso = 'dal-pc/stato.json'").run(adesso - SCADENZA_EVENTI - 1000);
    await pulizia(env.DB, adesso);
    ok(sql.prepare("SELECT COUNT(*) AS n FROM file WHERE percorso = 'dal-telefono/eventi/foto-1.json'").get().n === 0 &&
       sql.prepare("SELECT COUNT(*) AS n FROM file WHERE percorso = 'dal-pc/stato.json'").get().n === 1,
       'pulizia: la foto mai ritirata dopo 30 giorni sparisce; i file di scambio restano'); }
  await chiama('PUT', F(LID1, 'dal-pc/scheda.json'), { tok: C1, testo: 'x' });
  ok((await chiama('DELETE', '/v1/legami/' + LID1, { tok: P2 })).stato === 409, 'legame: un altro personal non lo toglie');
  ok((await chiama('DELETE', '/v1/legami/' + LID1, { tok: P1 })).j.tolto === true, 'legame: il personal lo toglie');
  ok(sql.prepare('SELECT COUNT(*) AS n FROM file WHERE lid = ?').get(LID1).n === 0 && (await chiama('GET', '/v1/io', { tok: C1 })).stato === 401,
     'legame tolto: spariscono i suoi file e il telefono di quel cliente non entra più');

  console.log('RISULTATO: ' + okN + ' OK, ' + failN + ' FAIL');
  process.exit(failN ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
