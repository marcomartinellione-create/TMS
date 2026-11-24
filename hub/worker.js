/* ════ TMS HUB — ufficio smistamento fra il TMS sul PC (PERSONAL) e l'app TMS Scheda (CLIENTE) ════
   Progetto del 24/11/2026 (Doc/hub-cloudflare/PROGETTO.md), approvato da Marco: «Cloudflare come hub di
   smistamento e non deposito». Gira su Cloudflare Workers (piano gratuito) con un database D1.

   Cosa sa l'hub, e basta:
     personal  pid (numero a caso) + impronta SHA-256 del suo gettone d'accesso
     legami    lid (numero a caso) + pid del suo personal + impronta del gettone del cliente + etichetta
               cifrata (la legge solo il personal: serve a ritrovare i clienti su un PC nuovo)
     file      i file in transito di ogni legame, CIFRATI dalle app (AES-GCM, chiave del singolo cliente,
               che l'hub non vede mai): dal-pc/* li scrive solo il personal, dal-telefono/* solo il cliente
     inviti    i codici d'invito per i personal nuovi (li crea Marco con hub/invito.js)
   Niente nomi, email, schede, pesate o foto in chiaro.

   Regole:
     · il gettone di un cliente apre solo il suo legame; quello del personal tutti e soli i legami suoi;
     · ogni file nuovo SOSTITUISCE il precedente (l'hub tiene solo l'ultima versione: lo storico vero è sul
       PC del personal); un file grande si spezza in più righe del database (D1: ~2 MB per riga);
     · pesate e foto (dal-telefono/eventi/*) le toglie il PC appena le ha salvate; quelle non ritirate
       scadono dopo 30 giorni (il telefono le rimanda finché il PC non conferma di averle ricevute);
     · un personal toglie un legame → spariscono anche tutti i suoi file.

   API (JSON, gettone in «Authorization: Bearer …»):
     GET    /v1/salute                         l'hub risponde (senza gettone)
     POST   /v1/personal      {pid, invito}    registra il personal (gettone nell'intestazione)
     GET    /v1/io                             chi sono: {ruolo:'personal', pid} | {ruolo:'cliente', lid}
     GET    /v1/legami                         (personal) i suoi legami con l'etichetta cifrata
     PUT    /v1/legami/<lid>  {th, etichetta}  (personal) crea o aggiorna un legame (th = impronta del
                                               gettone del cliente: il gettone vero l'hub non lo vede mai)
     DELETE /v1/legami/<lid>                   (personal) toglie il legame e i suoi file
     GET    /v1/f/<lid>?dir=…&testo=1&salta=a,b  elenco dei file sotto dir (col contenuto se testo=1,
                                               tranne quelli in salta)
     GET    /v1/f/<lid>/<percorso>             un file (404 se non c'è)
     PUT    /v1/f/<lid>/<percorso>             scrive un file (corpo = testo)
     DELETE /v1/f/<lid>/<percorso>             toglie un file
*/
const PARTE = 1000000;                      /* caratteri per riga del database */
const MAX_FILE = 25 * 1024 * 1024;          /* un file */
const MAX_LEGAME = 300 * 1024 * 1024;       /* tutti i file di un legame insieme */
const SCADENZA_EVENTI = 30 * 86400000;      /* pesate e foto non ritirate */
const EVENTI = 'dal-telefono/eventi/';
const RE_ID = /^[a-f0-9]{16}$/;
const RE_TH = /^[a-f0-9]{64}$/;
const RE_PERCORSO = /^(dal-pc|dal-telefono)(\/[A-Za-z0-9._-]+)+$/;
const RE_DIR = /^((dal-pc|dal-telefono)(\/[A-Za-z0-9._-]+)*\/)?$/;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Expose-Headers': 'X-Ver',
  'Access-Control-Max-Age': '86400'
};
function json(corpo, stato = 200) {
  return new Response(JSON.stringify(corpo), { status: stato, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, CORS) });
}
const errore = (stato, codice) => json({ errore: codice }, stato);

async function impronta(testo) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(testo)));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function corpoJson(req) { try { const o = await req.json(); return (o && typeof o === 'object') ? o : null; } catch (e) { return null; } }

/* chi sta chiedendo: dal gettone (se c'è) al ruolo */
async function chi(req, db) {
  const m = /^Bearer ([A-Za-z0-9_-]{20,128})$/.exec(req.headers.get('Authorization') || '');
  if (!m) return null;
  const th = await impronta(m[1]);
  const p = await db.prepare('SELECT pid FROM personal WHERE th = ?').bind(th).first();
  if (p) return { ruolo: 'personal', pid: p.pid, th };
  const l = await db.prepare('SELECT lid, pid FROM legami WHERE th = ?').bind(th).first();
  if (l) return { ruolo: 'cliente', lid: l.lid, pid: l.pid, th };
  return { ruolo: null, th };
}
async function suo(db, io, lid) {
  if (io.ruolo === 'cliente') return io.lid === lid;
  if (io.ruolo !== 'personal') return false;
  return !!(await db.prepare('SELECT 1 AS x FROM legami WHERE lid = ? AND pid = ?').bind(lid, io.pid).first());
}
/* chi può scrivere o togliere cosa */
function puoScrivere(io, percorso) { return io.ruolo === 'personal' ? percorso.startsWith('dal-pc/') : percorso.startsWith('dal-telefono/'); }
function puoTogliere(io, percorso) { return io.ruolo === 'personal' ? (percorso.startsWith('dal-pc/') || percorso.startsWith(EVENTI)) : percorso.startsWith('dal-telefono/'); }

async function registraPersonal(req, db, io) {
  if (!io) return errore(401, 'gettone');
  const b = await corpoJson(req); if (!b) return errore(400, 'corpo');
  const pid = String(b.pid || '');
  if (!RE_ID.test(pid)) return errore(400, 'pid');
  if (io.ruolo === 'personal') return io.pid === pid ? json({ ok: true, gia: true }) : errore(409, 'pid');
  if (io.ruolo === 'cliente') return errore(409, 'gettone');
  if (await db.prepare('SELECT 1 AS x FROM personal WHERE pid = ?').bind(pid).first()) return errore(409, 'pid');
  const invito = String(b.invito || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const ri = invito && await db.prepare('SELECT codice FROM inviti WHERE codice = ? AND usato IS NULL').bind(invito).first();
  if (!ri) return errore(403, 'invito');
  const ora = Date.now();
  await db.batch([
    db.prepare('INSERT INTO personal (pid, th, creato) VALUES (?, ?, ?)').bind(pid, io.th, ora),
    db.prepare('UPDATE inviti SET usato = ?, usato_da = ? WHERE codice = ?').bind(ora, pid, invito)
  ]);
  return json({ ok: true }, 201);
}

async function legami(req, db, io, lid) {
  if (io.ruolo !== 'personal') return errore(403, 'ruolo');
  if (lid == null) {
    if (req.method !== 'GET') return errore(405, 'metodo');
    const r = await db.prepare('SELECT lid, etichetta, creato FROM legami WHERE pid = ? ORDER BY creato').bind(io.pid).all();
    return json({ legami: r.results || [] });
  }
  if (!RE_ID.test(lid)) return errore(400, 'lid');
  const es = await db.prepare('SELECT pid FROM legami WHERE lid = ?').bind(lid).first();
  if (es && es.pid !== io.pid) return errore(409, 'lid');
  if (req.method === 'PUT') {
    const b = await corpoJson(req); if (!b) return errore(400, 'corpo');
    const th = String(b.th || ''), et = String(b.etichetta || '');
    if (!RE_TH.test(th) || th === io.th) return errore(400, 'th');
    if (et.length > 8000) return errore(400, 'etichetta');
    const altro = await db.prepare('SELECT lid FROM legami WHERE th = ?').bind(th).first();
    if ((altro && altro.lid !== lid) || await db.prepare('SELECT 1 AS x FROM personal WHERE th = ?').bind(th).first()) return errore(409, 'th');
    if (es) await db.prepare('UPDATE legami SET th = ?, etichetta = ? WHERE lid = ?').bind(th, et, lid).run();
    else await db.prepare('INSERT INTO legami (lid, pid, th, etichetta, creato) VALUES (?, ?, ?, ?, ?)').bind(lid, io.pid, th, et, Date.now()).run();
    return json({ ok: true }, es ? 200 : 201);
  }
  if (req.method === 'DELETE') {
    if (!es) return json({ ok: true, tolto: false });
    await db.batch([db.prepare('DELETE FROM file WHERE lid = ?').bind(lid), db.prepare('DELETE FROM legami WHERE lid = ?').bind(lid)]);
    return json({ ok: true, tolto: true });
  }
  return errore(405, 'metodo');
}

async function elenco(url, db, lid) {
  const dir = url.searchParams.get('dir') || '';
  if (!RE_DIR.test(dir)) return errore(400, 'dir');
  const conTesto = url.searchParams.get('testo') === '1';
  const salta = new Set(String(url.searchParams.get('salta') || '').split(',').map(s => s.trim()).filter(Boolean));
  const r = await db.prepare('SELECT percorso, MAX(ora) AS ora, SUM(LENGTH(testo)) AS dim FROM file WHERE lid = ? AND substr(percorso, 1, ?) = ? GROUP BY percorso ORDER BY percorso')
    .bind(lid, dir.length, dir).all();
  const file = (r.results || []).map(x => ({ nome: x.percorso.slice(dir.length), ora: x.ora, dim: x.dim }));
  if (conTesto) {
    const voglio = file.filter(f => !salta.has(f.nome));
    if (voglio.length) {
      const t = await db.prepare('SELECT percorso, testo FROM file WHERE lid = ? AND substr(percorso, 1, ?) = ? ORDER BY percorso, parte').bind(lid, dir.length, dir).all();
      const testi = new Map();
      (t.results || []).forEach(x => { const n = x.percorso.slice(dir.length); if (salta.has(n)) return; testi.set(n, (testi.get(n) || '') + x.testo); });
      voglio.forEach(f => { f.testo = testi.has(f.nome) ? testi.get(f.nome) : null; });
    }
  }
  return json({ file, ora: Date.now() });
}

async function unFile(req, db, io, lid, percorso) {
  if (!RE_PERCORSO.test(percorso) || percorso.length > 240) return errore(400, 'percorso');
  if (req.method === 'GET') {
    const r = await db.prepare('SELECT testo, ora FROM file WHERE lid = ? AND percorso = ? ORDER BY parte').bind(lid, percorso).all();
    const righe = r.results || [];
    if (!righe.length) return errore(404, 'assente');
    return new Response(righe.map(x => x.testo).join(''), { status: 200, headers: Object.assign({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Ver': String(righe[0].ora) }, CORS) });
  }
  if (req.method === 'PUT') {
    if (!puoScrivere(io, percorso)) return errore(403, 'percorso');
    const testo = await req.text();
    if (testo.length > MAX_FILE) return errore(413, 'grande');
    const occ = await db.prepare('SELECT SUM(LENGTH(testo)) AS tot FROM file WHERE lid = ? AND percorso <> ?').bind(lid, percorso).first();
    if (((occ && occ.tot) || 0) + testo.length > MAX_LEGAME) return errore(507, 'pieno');
    const ora = Date.now(), st = [db.prepare('DELETE FROM file WHERE lid = ? AND percorso = ?').bind(lid, percorso)];
    for (let i = 0, k = 0; i < Math.max(testo.length, 1); i += PARTE, k++)
      st.push(db.prepare('INSERT INTO file (lid, percorso, parte, testo, ora) VALUES (?, ?, ?, ?, ?)').bind(lid, percorso, k, testo.slice(i, i + PARTE), ora));
    await db.batch(st);
    return json({ ok: true, ora });
  }
  if (req.method === 'DELETE') {
    if (!puoTogliere(io, percorso)) return errore(403, 'percorso');
    const r = await db.prepare('DELETE FROM file WHERE lid = ? AND percorso = ?').bind(lid, percorso).run();
    return json({ ok: true, tolto: !!(r && r.meta && r.meta.changes) });
  }
  return errore(405, 'metodo');
}

async function gestisci(req, env) {
  const url = new URL(req.url), db = env.DB;
  const pz = url.pathname.split('/').filter(Boolean).map(s => { try { return decodeURIComponent(s); } catch (e) { return '\u0000'; } });
  if (pz[0] !== 'v1') return errore(404, 'percorso');
  if (pz[1] === 'salute' && pz.length === 2) return json({ ok: true, hub: 'tms', versione: 1 });
  const io = await chi(req, db);
  if (pz[1] === 'personal' && pz.length === 2 && req.method === 'POST') return registraPersonal(req, db, io);
  if (!io || !io.ruolo) return errore(401, 'gettone');
  if (pz[1] === 'io' && pz.length === 2) return json(io.ruolo === 'personal' ? { ruolo: 'personal', pid: io.pid } : { ruolo: 'cliente', lid: io.lid });
  if (pz[1] === 'legami' && pz.length <= 3) return legami(req, db, io, pz.length === 3 ? pz[2] : null);
  if (pz[1] === 'f' && pz.length >= 3) {
    const lid = pz[2];
    if (!RE_ID.test(lid)) return errore(400, 'lid');
    if (!(await suo(db, io, lid))) return errore(403, 'legame');
    if (pz.length === 3) return req.method === 'GET' ? elenco(url, db, lid) : errore(405, 'metodo');
    return unFile(req, db, io, lid, pz.slice(3).join('/'));
  }
  return errore(404, 'percorso');
}

/* pulizia notturna (Cron Trigger): pesate e foto mai ritirate */
async function pulizia(db, adesso) {
  await db.prepare('DELETE FROM file WHERE substr(percorso, 1, ?) = ? AND ora < ?').bind(EVENTI.length, EVENTI, adesso - SCADENZA_EVENTI).run();
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    try { return await gestisci(req, env); }
    catch (e) { return errore(500, 'interno'); }
  },
  async scheduled(ev, env) { await pulizia(env.DB, Date.now()); }
};
export { pulizia, PARTE, SCADENZA_EVENTI };
