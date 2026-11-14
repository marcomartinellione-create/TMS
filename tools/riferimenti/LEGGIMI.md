# Riferimenti della ragnatela «distribuzione fra i gruppi»

La fascia verde della ragnatela (Pesi, ⚖ Bilanciamento, Progressi, Report) è la forma
tipica di un **riferimento scelto** su due assi:

- l'**esperienza**: è dell'atleta, sta nell'anagrafica (`dati_utente.esperienza`);
- il **tipo di allenamento**: è della scheda, sta nel Training Set (`scheda.tipoAllenamento`).

Sesso, età, agonismo, attrezzatura e qualità della fonte sono solo filtri di contesto.

## Da dove vengono i dati

`npm run riferimenti` (cioè `python tools/genera-riferimenti.py`) rigenera
`src/dati/05-riferimenti-distribuzione.js` (`RIF_DISTR`) leggendo **solo** gli originali:

| origine | dove | licenza | uso |
|---|---|---|---|
| pacchetto Codex v0.7 (ZIP intatto) | `..\Documentazione\Esercizzi\Grafico Distribuzione fra i gruppi\01 Originali\` | vedi sotto | letto direttamente dallo ZIP |
| · corpus di evidenza (359 record, 37 fonti) | nello ZIP | raccolta privata; articoli citati voce per voce | raccolta «Protocolli di studio» |
| · depot.fitness 2026.10.13 (101 programmi) | nello ZIP | CC BY 4.0 | raccolta «Schede pubblicate» (solo i 5 programmi con le serie per esercizio) |
| · mappa smyrdev (1.324 esercizi) | nello ZIP | MIT | conteggio alternativo «mappa esterna» (proposta) |
| schede StrengthLog e Muscle & Strength | `Doc/meta-analisi/` (fuori da git) | nessuna dichiarata | raccolta «Schede pubblicate»: nell'app solo numeri derivati + indirizzo |
| programmi incorporati di Liftosaur (61) | `Doc/meta-analisi/liftosaur/` (fuori da git; versione in `COMMIT.txt`) | repository AGPL-3.0; programmi di autori terzi | raccolta «Schede pubblicate»: nell'app solo numeri derivati + indirizzo del programma |
| articoli ad accesso aperto (13) | testi in `Doc/riferimenti-distribuzione/studi-testi/` (fuori da git) | per lo più CC BY, una per una in `protocolli-studi.json` | raccolta «Protocolli di studio» |
| catalogo TMS e nomi inglesi | `TMS_Dati/esercizi.json`, `tools/esercizi-en.json` | free-exercise-db (Unlicense) | conteggio TMS |
| protocolli trascritti a mano | `protocolli-studi.json` (qui) | — | elenco esercizi → catalogo TMS, con stato |
| convalida della mappa esterna | `mappa-esterna-convalida.csv` (qui) | — | stato di ogni aggancio |

Dopo la rigenerazione: `npm run build` e `npm test`. Controllo senza scrivere:
`python tools/genera-riferimenti.py --verifica`. Altro ZIP: `--zip PERCORSO`. Il riepilogo
stampa anche la **copertura**: la tabella esperienza × tipo con le voci di ogni casella.

Le tabelle di controllo complete (voci usate, schede scartate, record del corpus esclusi,
ognuna col motivo) finiscono in `Doc/riferimenti-distribuzione/` (fuori da git).

### Riscaricare Liftosaur

I 61 file stanno in
[programs/builtin](https://github.com/astashov/liftosaur/tree/master/programs/builtin):
per riprenderli alla stessa versione si usa il commit scritto in `COMMIT.txt`
(`https://raw.githubusercontent.com/astashov/liftosaur/<commit>/programs/builtin/<file>.md`).

## Regole

- **Due raccolte che non si mescolano.** «Schede pubblicate»: una voce = una settimana di
  allenamento; il livello è quello **dichiarato dalla scheda**. «Protocolli di studio»: una
  voce = un protocollo con l'elenco completo degli esercizi (bracci con le stesse
  proporzioni = un protocollo); l'esperienza è **dei partecipanti** (codice del corpus, o
  lettura TMS del testo della popolazione, segnata come tale).
- **Nessun valore derivato nei dati.** Per ogni voce si salvano solo le serie dirette (`D`)
  e indirette (`I`) per gruppo, col catalogo TMS e con la mappa esterna (`eD`, `eI`).
  Quote e fasce (10°–90° percentile) si calcolano nell'app con lo stesso conteggio e gli
  stessi pesi dell'atleta. Ogni voce ha fonte, indirizzo e `stato` (come è stata letta).
- **Soglie.** Meno di 5 voci: dati insufficienti, nessuna fascia. Da 5 a 9: fascia
  tratteggiata (indicativa).
- **Stessi filtri della meta-analisi** per le schede: almeno l'85% degli esercizi
  riconosciuti, 25–130 serie a settimana, almeno 5 gruppi con 3 serie; «equilibrata» se
  spinta : trazione sta fra 0,7 e 1,4 (filtro attivo per impostazione predefinita).
- **Programmi che cambiano di settimana in settimana** (Liftosaur, studi periodizzati): si
  usa la **settimana media del ciclo**; per un intervallo di serie («4–6») il valore
  centrale. In Liftoscript una «settimana» può essere un ciclo di giorni da ripetere: le
  serie medie per giorno si moltiplicano per i giorni a settimana dichiarati (`frequency`).
- **Livello di Liftosaur** dal campo `age`: «meno di 3 mesi» = principiante, «3–12 mesi» =
  intermedio, «più di un anno» = avanzato. Tipo dal campo `goal` (strength = forza,
  hypertrophy = ipertrofia, entrambi = tutti e due); «powerlifting» se nome o descrizione
  lo dicono, come per StrengthLog.
- **Esperienza negli studi aggiunti** (regola approvata da Marco il 14/11/2026): avanzato se
  gli autori li dicono ben allenati o agonisti, oppure se dichiarano in media almeno 4 anni
  di allenamento; intermedio se allenati; principiante se non allenati.
- **Cosa non si conta**: pliometria, salti, trasporti, plank e circuiti di condizionamento
  (elenco `SKIP` nell'importatore), sia nelle schede sia nelle trascrizioni degli studi.

## Riconoscimento dei nomi

I nomi inglesi delle schede si riconducono al catalogo con la tabella `ALIAS_RAW`, poi col
nome inglese esatto del catalogo, poi per somiglianza delle parole (Jaccard ≥ 0,6). Prima
del confronto si tolgono la numerazione davanti al nome («1b.», «A2)»), i plurali («chin
ups») e le parole d'attrezzo («dumbbell», «cable»…); a parità di chiave vince la **prima**
voce di `ALIAS_RAW`, la più generica. Le corrispondenze per somiglianza sono le più a
rischio: quando se ne trova una sbagliata si aggiunge il nome giusto in `ALIAS_RAW`.

## Copertura (14/11/2026)

Schede pubblicate, solo equilibrate (il riferimento predefinito), **prima → dopo**:

| esperienza \ tipo | forza | ipertrofia | powerlifting | resistenza | potenza | generale | tutti |
|---|---|---|---|---|---|---|---|
| principiante | 3 → 6 | 20 → 25 | 0 | 0 | 0 | 7 → 8 | 27 → 35 |
| intermedio | 1 → 10 | 11 → 24 | 0 | 0 | 0 | 4 → 10 | 16 → 42 |
| avanzato | 0 → 7 | 3 → 9 | 0 → 3 | 0 | 1 | 0 → 2 | 4 → 15 |
| tutte | 16 → 35 | 43 → 67 | 0 → 3 | 0 | 1 | 11 → 20 | 63 → 109 |

Protocolli di studio, **prima → dopo**:

| esperienza \ tipo | forza | ipertrofia | powerlifting | resistenza | potenza | generale | tutti |
|---|---|---|---|---|---|---|---|
| principiante | 4 → 5 | 2 → 3 | 0 | 4 | 0 | 2 | 5 → 6 |
| intermedio | 2 → 5 | 2 → 4 | 0 | 1 → 2 | 0 | 0 | 2 → 6 |
| avanzato | 0 → 5 | 0 → 2 | 0 → 4 | 0 → 1 | 0 → 2 | 0 → 1 | 0 → 10 |
| tutte | 8 → 18 | 8 → 13 | 0 → 4 | 6 → 8 | 0 → 3 | 4 → 5 | 11 → 27 |

Schede in tutto (anche non equilibrate): da 114 a 216 (Muscle & Strength 86 → 137 col
riconoscimento migliorato, Liftosaur 51). Restano **senza dati sufficienti**: resistenza
muscolare e potenza nelle schede (nessuna fonte aperta trovata), powerlifting (3 schede
equilibrate, 5 togliendo il filtro; 4 protocolli). Il riferimento predefinito si sposta
fino a 4 punti: Gambe 16–37 (prima 18–33), Pettorali 6–14, Schiena 15–27, Spalle 13–24,
Braccia 16–27, Core 0–10.

## Convalidare la mappa esterna

`mappa-esterna-convalida.csv` (separatore `;`, si apre con Excel) ha una riga per esercizio
del catalogo: aggancio proposto (`id_esterno`, `nome_esterno`, `profilo_esterno`,
`punteggio` di somiglianza) e `stato`:

- `proposta` — calcolata dall'importatore, da controllare (stato iniziale di tutte);
- `convalidata` — controllata e giusta;
- `corretta` — `id_esterno` cambiato a mano con quello giusto;
- `rifiutata` — l'aggancio è sbagliato: l'esercizio si conta col catalogo TMS;
- `nessuna corrispondenza` — l'importatore non ha trovato nulla.

Le righe `convalidata`, `corretta` e `rifiutata` **si conservano** a ogni rigenerazione.
I punteggi 1,0 (diretto) e 0,5 (indiretto) della mappa sono del repository smyrdev e,
come i pesi delle serie nell'app, restano **provvisori** finché non sono convalidati.

## Trascrizioni dei protocolli

`protocolli-studi.json`: per ogni protocollo gli esercizi ricondotti al catalogo TMS e il
peso relativo delle serie; `stato` resta «trascrizione TMS da verificare» finché qualcuno
non confronta l'elenco con l'articolo. I protocolli con `record_ids` vengono dal corpus; quelli
con `studio` da articoli ad accesso aperto aggiunti dal TMS, descritti in `studi_aggiunti`
(citazione, DOI, indirizzo, licenza dell'articolo, popolazione, copia del testo). In `esclusi`
gli studi lasciati fuori, col motivo.
