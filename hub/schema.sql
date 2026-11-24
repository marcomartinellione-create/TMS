-- TMS Hub: database D1 (vedi worker.js). Si applica con
--   npx wrangler d1 execute tms-hub --remote --file schema.sql
-- Ripeterlo non fa danni (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS personal (
  pid     TEXT PRIMARY KEY,          -- numero a caso del personal (16 cifre esadecimali)
  th      TEXT NOT NULL UNIQUE,      -- impronta SHA-256 del suo gettone d'accesso
  creato  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS inviti (
  codice   TEXT PRIMARY KEY,         -- codice d'invito per un personal nuovo (hub/invito.js)
  creato   INTEGER NOT NULL,
  usato    INTEGER,
  usato_da TEXT
);

CREATE TABLE IF NOT EXISTS legami (
  lid       TEXT PRIMARY KEY,        -- numero a caso del legame personal ↔ cliente
  pid       TEXT NOT NULL,           -- il suo personal
  th        TEXT NOT NULL UNIQUE,    -- impronta del gettone del cliente
  etichetta TEXT,                    -- cifrata col codice del personal (la legge solo lui)
  creato    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS legami_pid ON legami (pid);

CREATE TABLE IF NOT EXISTS file (
  lid      TEXT NOT NULL,
  percorso TEXT NOT NULL,            -- dal-pc/… (scrive il personal) · dal-telefono/… (scrive il cliente)
  parte    INTEGER NOT NULL,         -- i file grandi si spezzano in più righe
  testo    TEXT NOT NULL,            -- contenuto CIFRATO dalle app
  ora      INTEGER NOT NULL,
  PRIMARY KEY (lid, percorso, parte)
);
CREATE INDEX IF NOT EXISTS file_ora ON file (ora);
