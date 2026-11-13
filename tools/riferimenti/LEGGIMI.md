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
| catalogo TMS e nomi inglesi | `TMS_Dati/esercizi.json`, `tools/esercizi-en.json` | free-exercise-db (Unlicense) | conteggio TMS |
| protocolli trascritti a mano | `protocolli-studi.json` (qui) | — | elenco esercizi → catalogo TMS, con stato |
| convalida della mappa esterna | `mappa-esterna-convalida.csv` (qui) | — | stato di ogni aggancio |

Dopo la rigenerazione: `npm run build` e `npm test`. Controllo senza scrivere:
`python tools/genera-riferimenti.py --verifica`. Altro ZIP: `--zip PERCORSO`.

Le tabelle di controllo complete (voci usate, schede scartate, record del corpus esclusi,
ognuna col motivo) finiscono in `Doc/riferimenti-distribuzione/` (fuori da git).

## Regole

- **Due raccolte che non si mescolano.** «Schede pubblicate»: una voce = una settimana di
  allenamento; il livello è quello **dichiarato dalla scheda**. «Protocolli di studio»: una
  voce = un protocollo con l'elenco completo degli esercizi (bracci con le stesse
  proporzioni = un protocollo); l'esperienza è **dei partecipanti** (codice del corpus, o
  lettura TMS del testo della popolazione, segnata come tale).
- **Nessun valore derivato nei dati.** Per ogni voce si salvano solo le serie dirette (`D`)
  e indirette (`I`) per gruppo, col catalogo TMS e con la mappa esterna (`eD`, `eI`).
  Quote e fasce (10°–90° percentile) si calcolano nell'app con lo stesso conteggio e gli
  stessi pesi dell'atleta.
- **Soglie.** Meno di 5 voci: dati insufficienti, nessuna fascia. Da 5 a 9: fascia
  tratteggiata (indicativa).
- **Stessi filtri della meta-analisi** per le schede: almeno l'85% degli esercizi
  riconosciuti, 25–130 serie a settimana, almeno 5 gruppi con 3 serie; «equilibrata» se
  spinta : trazione sta fra 0,7 e 1,4 (filtro attivo per impostazione predefinita).

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
non confronta l'elenco con l'articolo. In `esclusi` gli studi lasciati fuori, col motivo.
