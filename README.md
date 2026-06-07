# Training Monitor System (TMS)

> Diario di allenamento e nutrizione in un **singolo file HTML**, offline e locale. Tema *Elden Ring* (pergamena/ember), stile da manuale tecnico. — *by Wander*

![versione](https://img.shields.io/badge/versione-1.0.27-c2500a) ![offline](https://img.shields.io/badge/100%25-offline-2f7d4f) ![nessun%20cloud](https://img.shields.io/badge/dati-solo%20in%20locale-7a3ea8)

TMS è uno strumento amatoriale e gratuito per monitorare allenamento, progressi e alimentazione. È un unico file `.html`: nessuna installazione, nessun account, nessun server. I tuoi dati restano **sul tuo computer**, in una cartella che scegli tu.

---

## ✦ Cosa fa

- **Allenamento** — scheda settimanale/mensile con calcoli dal vivo: 1RM stimato, %1RM, Training Load (TL), ΔTL. Set multipli, seduta automatica (S2), test del massimale.
- **Storico** — archivio di tutte le schede salvate (codice `AAAASS`). I valori derivati sono ricalcolati, non salvati: se cambi una formula, anche lo storico si aggiorna.
- **Progressi** — dashboard con grafici (carico, media mobile, ACWR, volume per gruppo, intensità, progressione per esercizio, record reali) e segnali automatici (record, stallo, deload).
- **Corpo** — peso e composizione corporea, BMI, fabbisogno, grafici di ricomposizione.
- **Alimentazione** — fasi **Bulk / Mantenimento / Cut** (vedi solo quella attiva), banca dati di ~1190 alimenti con macro e micronutrienti, indice settimanale con riferimenti **OMS/FAO**.
- **Esercizi** — catalogo modificabile (gruppo, target, tipo, fattore di carico).
- **Report** — documento per il cliente, a sezioni selezionabili, stampabile in **A4 multipagina** → PDF.
- **Profili** — più atleti/clienti, ognuno con i propri dati; catalogo esercizi condiviso.

---

## ▸ Requisiti

Per salvare i dati su cartella serve un browser con **File System Access API**:

- ✅ **Chrome**, **Edge**, oppure l'app **Obsidian**
- ❌ Firefox e Safari non supportano il salvataggio su cartella (puoi comunque usare la modalità "in locale" nel browser)

---

## ▸ Installazione e uso

1. Scarica **`Training Monitor System.html`** da questo repository (pulsante *Code → Download*, oppure apri il file e *Download raw*).
2. Mettilo in una cartella sul tuo PC chiamata **`TMS`**.
3. Aprilo con doppio clic (Chrome/Edge/Obsidian).
4. Premi **Connetti la cartella** e scegli proprio la cartella `TMS`: l'app crea al suo interno `TMS_Dati/` con i tuoi file JSON. In alternativa, *Continua in locale* (i dati restano nel browser).
5. Dalle volte successive si **riconnette da sola**.

> Per **aggiornare** basta sostituire il file `.html` con la versione nuova: i dati nella cartella restano e vengono migrati in automatico.

---

## 🔄 Aggiornamenti automatici

All'avvio l'app controlla il file [`version.json`](version.json) di questo repository: se è disponibile una versione più recente, mostra un banner con il link per scaricarla. Se sei offline non succede nulla.

Il file `version.json`:

```json
{
  "version": "1.0.27",
  "nota": "Calendario settimanale, fasi alimentari (Bulk/Mantenimento/Cut), banca dati svizzera",
  "url": "https://raw.githubusercontent.com/UTENTE/REPO/main/Training%20Monitor%20System.html"
}
```

> Sostituisci `UTENTE/REPO` con il tuo nome utente e repository. A ogni rilascio: carica l'HTML aggiornato e alza il campo `version` (e aggiorna `nota`).

---

## 🔒 Dati e privacy

Tutto in **locale**, nessun cloud. I dati stanno in `TMS_Dati/<profilo>/` (`scheda.json`, `storico.json`, `corpo.json`, `alimentazione.json`) più `profili.json` ed `esercizi.json` condivisi. Backup/Ripristino dal tab **Profilo**; in alternativa copia la cartella `TMS_Dati`. Se la cartella è sincronizzata (es. cloud personale), i dati ti seguono su più PC: connetti una volta per dispositivo e non modificare in contemporanea su due.

---

## 📚 Fonti dati e basi scientifiche

- **Alimenti**: [Banca dati svizzera dei valori nutritivi](https://naehrwertdaten.ch/it/) (USAV/FSVO) — usata con citazione della fonte come da licenza.
- **Calcoli e metodi**: Training Load (Scott 2016), RIR/RPE (Zourdos 2016, Helms 2016), volume/ipertrofia (Schoenfeld 2010/2016), ACWR (Hulin 2015, Gabbett 2016). Riferimenti completi con DOI nella guida integrata dell'app (§ *Documentazione*).
- **Linee guida nutrizionali**: OMS/FAO (*Healthy diet*, fabbisogno energetico FAO/WHO/UNU).

---

## ⚠️ Disclaimer

Progetto **amatoriale**, creato per uso personale e condiviso gratuitamente da un appassionato — non da un professionista. È testato e funziona, ma usalo a tuo rischio e **fai backup**. I valori (calcoli e riferimenti nutrizionali) sono **indicativi** e **non sostituiscono** il parere di un medico, nutrizionista o preparatore.

---

## 📜 Licenza e crediti

Progetto aperto e gratuito: libero di usarlo, condividerlo e personalizzarlo. Si chiede solo di **mantenere i crediti** e di **non venderlo** a scopo di lucro.

*« Train hard, share knowledge. »* 💪 — **by Wander**

Codice sviluppato con l'assistenza di **Claude** (Anthropic).
