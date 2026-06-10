# Training Monitor System (TMS)

App desktop Windows per la gestione completa di **allenamento e nutrizione**: scheda
settimanale/mensile, storico con carichi e RPE, progressi (1RM stimato, Training Load,
ACWR, monotonia), misure corporee, piani alimentari su banca dati USAV (~900 alimenti),
catalogo di 883 esercizi con video dimostrativi, report PDF A4 e report digitale per
mobile. Tema pergamena/ember, modalità notte. *By Wander.*

## Caratteristiche

- **Tutto in locale, zero cloud**: i dati restano sul tuo PC
  (`%APPDATA%\Training Monitor System\TMS`), nessun account, nessuna telemetria.
- **Multi-profilo**: più atleti/clienti, ciascuno con scheda, storico, misure e
  alimentazione propri; catalogo esercizi condiviso.
- **Valori derivati mai salvati**: 1RM, Training Load, ACWR ricalcolati al volo dai
  dati grezzi — niente numeri incoerenti.
- **Auto-update**: l'app controlla le release GitHub all'avvio e si aggiorna da sola.
- **Backup**: esporta/importa tutti i dati in un singolo file JSON.

## Installazione

1. Scarica `TMS-Setup-<versione>.exe` dall'ultima [Release](https://github.com/marcomartinellione-create/TMS/releases).
2. Eseguilo (installer assistito, percorso modificabile). SmartScreen può avvisare al
   primo avvio (eseguibile non firmato): **Ulteriori informazioni → Esegui comunque**.
3. L'app parte già pronta, con catalogo esercizi e video inclusi.

## Sviluppo

L'app è un **file HTML singolo** (niente dipendenze a runtime) incapsulato in un wrapper
Electron. Il sorgente vive decomposto in [`src/`](src/README.md) e gli artefatti HTML
sono **generati** dalla build:

```bash
npm install          # prima volta (jsdom per i test)
npm run build        # riassembla src/ → Training Monitor System.html + renderer Electron
npm test             # controllo sintassi + suite jsdom
npm run release      # release completa: build + test + note di rilascio + installer NSIS

cd electron
npm install          # prima volta
npm start            # avvia l'app in sviluppo
```

Struttura: `src/` sorgente (pagina, stili, dati, moduli app) · `tools/` build e release ·
`tests/` suite jsdom · `electron/` wrapper desktop (NSIS + auto-update) ·
`database/` catalogo esercizi (fonte del catalogo generato) · `Changelog/` registro modifiche.

## Crediti e fonti

- Banca dati alimenti: **USAV** (Ufficio federale svizzero della sicurezza alimentare),
  dati pubblici citati come fonte.
- Linee guida attività fisica: **OMS**.
- Rendering immagini report: [html2canvas](https://github.com/niklasvh/html2canvas) 1.4.1 (MIT).

---

*I report e i calcoli del TMS non sostituiscono il parere di un medico o di un
professionista dell'allenamento.*
