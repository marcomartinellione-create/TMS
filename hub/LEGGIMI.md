# TMS Hub

L'**ufficio smistamento** fra il TMS sul PC dei **personal** e l'app TMS Scheda (APK) dei loro **clienti**.
Gira su **Cloudflare Workers** con un database **D1**, sul piano gratuito. Progetto completo, con le
decisioni di Marco del 24/11/2026: `Doc/hub-cloudflare/PROGETTO.md` (fuori da git).

**Cosa fa:** passa i file cifrati fra il PC di un personal e il telefono di ogni suo cliente.
- Tiene solo l'ultima versione dei file di scambio: scheda collegata, piano alimentare, stato.
- Pesate e foto le toglie il PC appena le ha salvate. Quelle mai ritirate spariscono dopo 30 giorni,
  con la pulizia notturna.
- Lo storico vero sta solo sul PC del personal.

**Cosa non vede mai:** codici, chiavi, nomi o contenuti. Ogni file è cifrato (AES-GCM) con la chiave
del singolo cliente, ricavata dal suo codice. Dei personal e dei legami l'hub conosce solo un numero
e l'impronta SHA-256 del gettone d'accesso.

| file | cosa |
|---|---|
| `worker.js` | l'hub: API, regole d'accesso, file spezzati in più righe, pulizia notturna |
| `schema.sql` | le tabelle D1 (`personal`, `inviti`, `legami`, `file`) |
| `wrangler.toml` | la configurazione di Cloudflare (nome `tms-hub`, database, pulizia alle 3:17 UTC) |
| `pubblica-hub.cjs` | mette online l'hub (la prima volta crea anche database e primo invito) |
| `invito.cjs` | un codice d'invito nuovo per un personal |
| `comune.cjs` | funzioni comuni agli script (wrangler, inviti) |
| `d1-finto.cjs` | un D1 finto su `node:sqlite`, per le prove in locale (`tests/test-hub.js` e lo scenario T14 di `tests/test-app.js`) |

## Metterlo online (una volta)

1. Crea un account Cloudflare gratuito su [dash.cloudflare.com](https://dash.cloudflare.com/sign-up).
   Alla prima apertura di **Workers & Pages** Cloudflare ti fa scegliere il sottodominio `….workers.dev`.
2. Dalla cartella `hub/` lancia:
   ```
   node pubblica-hub.cjs
   ```
   Lo script scarica `wrangler` con `npx` e ti fa entrare in Cloudflare dal browser. Poi crea il
   database `tms-hub` (in Europa occidentale), le tabelle, pubblica l'hub e stampa **indirizzo** e
   **primo codice d'invito**.
3. L'indirizzo (`https://tms-hub.<sottodominio>.workers.dev`) va scritto in `TEL_HUB`
   (`src/app/15c-telefono.js`) e in `COL_HUB` (`app-android/web/index.html`). Finché sono vuoti, il
   collegamento nelle app resta spento. Dopo serve un APK nuovo (`app-android\Crea APK.bat`) e
   `PUBBLICA.bat`.
4. Nel TMS: **⚙ Impostazioni › Telefono collegato › Attiva** col codice d'invito. Conserva il
   **codice di recupero** che compare.

Per ripubblicare dopo una modifica a `worker.js`, rilancia `node pubblica-hub.cjs`. Lo schema si
riapplica senza toccare i dati.

## Un personal nuovo

```
node invito.cjs
```
Stampa un codice d'invito, valido una volta sola. Il personal lo scrive nel suo TMS.

## API

Le API sono descritte in testa a `worker.js`. Tutte le chiamate usano il gettone in `Authorization: Bearer …`:
- il gettone di un cliente apre solo il suo legame;
- quello del personal apre tutti e soli i legami suoi;
- `dal-pc/*` lo scrive solo il personal, `dal-telefono/*` solo il cliente.

## Codici e chiavi (identici nel TMS e nell'APK)

| | lunghezza | cosa sblocca |
|---|---|---|
| codice di recupero del personal | 24 segni (120 bit) | nasce nel TMS all'attivazione |
| codice del cliente | 20 segni (100 bit) | uno per profilo, si scrive una volta sul telefono |

Da ogni codice, con HKDF-SHA256 e sale `tms-hub-v1`, si ricavano:
- l'**id** (`info "id"`, 8 byte esadecimali);
- il **gettone** (`info "gettone"`, 32 byte in base64url);
- la **chiave AES-GCM 256** (`info "chiave"`).

La busta di ogni file è `{tms:'hub', v:1, iv, dati}`, con AAD `tms-hub-v1`. L'etichetta di ogni
legame (`{slug, nome, codice}` del cliente) è cifrata con la chiave del personal: col solo codice di
recupero, un PC nuovo ritrova i suoi clienti.

## Limiti del piano gratuito (novembre 2026)

- 100.000 richieste al giorno.
- D1: 5 GB di spazio e 100.000 righe scritte al giorno.
- Righe del database di circa 2 MB: `worker.js` spezza i file in parti da 1.000.000 caratteri.

Stima per 20 clienti: 15-20 mila richieste al giorno. Il PC fa un giro ogni 20 s, solo sul profilo
aperto; il telefono fa una chiamata al minuto ad app aperta. Oltre il limite non si paga: l'hub si
ferma fino a mezzanotte UTC e le app riprovano.
