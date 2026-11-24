/* d1-finto.cjs — un database D1 finto sopra node:sqlite, per provare hub/worker.js in locale (tests/test-hub.js
   e lo scenario PC ↔ hub ↔ telefono di tests/test-app.js). Stesse istruzioni SQL del D1 vero; imita solo la
   parte di API che l'hub usa: prepare().bind().first()/all()/run() e batch() (in una transazione). */
'use strict';
const fs = require('fs');
const path = require('path');

function nuovoD1() {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  const stmt = (sql, args) => ({
    bind: (...a) => stmt(sql, a),
    async first() { const r = db.prepare(sql).get(...(args || [])); return r === undefined ? null : Object.assign({}, r); },
    async all() { return { results: db.prepare(sql).all(...(args || [])).map(r => Object.assign({}, r)), success: true }; },
    async run() { const r = db.prepare(sql).run(...(args || [])); return { success: true, meta: { changes: Number(r.changes) } }; },
    _esegui() { return db.prepare(sql).run(...(args || [])); }
  });
  return {
    prepare: sql => stmt(sql, []),
    async batch(lista) {
      db.exec('BEGIN');
      try { const out = lista.map(s => { const r = s._esegui(); return { success: true, meta: { changes: Number(r.changes) } }; }); db.exec('COMMIT'); return out; }
      catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    _sql: db
  };
}
module.exports = { nuovoD1 };
