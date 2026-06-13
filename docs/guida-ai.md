# Training Monitor System (TMS) — documentazione per assistenti AI

_Versione app: 1.0.77 (2026-06-13). File generato dall'app (tab Guida) — la copia online vive nel repo: docs/guida-ai.md. Caricalo nella chat di un assistente AI per farti aiutare a usare il TMS._

## Istruzioni per te, assistente AI

Stai aiutando un utente del **Training Monitor System (TMS)**, un'app desktop italiana
per gestire allenamento coi pesi e nutrizione. Questo documento è la descrizione
ufficiale e completa dell'app: basa le risposte su quanto scritto qui.

- Rispondi **in italiano**, con passi concreti («apri il tab X, premi il bottone Y»).
- L'interfaccia è SOLO in italiano; i nomi di tab e bottoni vanno citati come sono qui.
- Se la domanda non trova risposta in questo documento, dillo chiaramente e suggerisci
  la Guida interna dell'app (tab «📕 Guida», versioni Rapida e Completa) o una
  segnalazione su GitHub (https://github.com/marcomartinellione-create/TMS).
- L'app NON fornisce consigli medici: i suoi calcoli sono strumenti di monitoraggio.
  Se l'utente chiede indicazioni mediche o nutrizionali personalizzate, ricordagli di
  rivolgersi a un professionista.
- I dati dell'utente sono SOLO sul suo PC: non esiste un account o un cloud del TMS.

## 1 · Cos'è il TMS

App desktop Windows **gratuita** (progetto aperto: si chiede di mantenere i crediti e
di non venderla) per atleti e coach. In un'unica finestra: scheda di allenamento,
storico, progressi (1RM, Training Load, ACWR…), misure corporee, piani alimentari su
banca dati USAV, catalogo di 883 esercizi con video, report PDF e mobile, scambio
scheda coach-cliente. Tema «pergamena»; modalità notte col bottone luna/sole in alto.
Sito: https://marcomartinellione-create.github.io/TMS/ · Tutorial: canale YouTube
@TrainingMonitorSystem.

## 2 · Installazione, aggiornamenti, dove stanno i dati

- Si scarica «TMS-Setup-versione.exe» dalle Release GitHub (~90 MB, catalogo e video
  inclusi). L'eseguibile non è firmato: al primo avvio Windows SmartScreen può
  avvisare — «Ulteriori informazioni → Esegui comunque». È normale e atteso.
- **Auto-update**: all'avvio l'app controlla le release; se ce n'è una nuova CHIEDE
  prima di scaricare mostrando le novità. Durante il download la percentuale appare
  nel titolo della finestra e sulla taskbar; chiudere la finestra a download in corso
  fa comparire un avviso. A fine download propone il riavvio.
- **Dati**: in locale, nella cartella utente di Windows (percorso tipico
  «%APPDATA%\\Training Monitor System\\TMS»). Sopravvivono ad aggiornamenti e
  reinstallazioni. Niente account, niente telemetria.
- L'app esiste anche come singolo file HTML apribile in Chrome/Edge collegando una
  cartella dati (File System Access). Firefox e Safari NON sono supportati. Gli
  archivi della modalità browser e di quella desktop sono separati.

## 3 · Profili (tab 👤 Profilo)

- **Multi-profilo**: ogni atleta/cliente ha scheda, storico, misure e alimentazione
  propri; il catalogo esercizi è condiviso. Il tab mostra il nome del profilo attivo.
- «＋ Nuovo profilo» crea un profilo. Cliccando una riga della lista si apre la
  tendina con i parametri: sesso, data di nascita, altezza, «RIR nei calcoli» (sì/no),
  «Session-RPE» (sì/no), formula 1RM preferita, fase alimentare attiva. Bottoni:
  «Attiva», «✎ Modifica parametri», «✏ Rinomina», «✕ Elimina» (quest'ultimo solo se
  esiste più di un profilo).
- **Nella riga di ogni profilo**, a destra, due bottoni sempre visibili (senza aprire
  la tendina): «📤 Esporta scheda» e «📥 Importa rientro» — lo scambio col cliente,
  vedi sezione 8. Lavorano sul profilo della riga: se non è quello attivo, l'app lo
  attiva da sola.
- In fondo alla pagina: «▌ Backup (tutti i profili insieme)» con «⭳ Backup dati»
  (esporta TUTTO in un file JSON) e «⭱ Ripristina» (reimporta, sostituendo i dati
  attuali previa conferma). Sotto, la riga dei **backup automatici**: l'app ne crea
  uno a settimana da sola (cartella «backup_automatici» dentro i dati, ultime 5
  copie) con link «ripristina» accanto a ciascuno.
- Per ogni profilo i file sono: scheda.json, storico.json, corpo.json,
  alimentazione.json. I valori derivati (1RM, TL, ACWR…) NON vengono mai salvati:
  si ricalcolano al volo dai dati grezzi.

## 4 · Pesi (tab 🏋 Pesi)

NB: questo tab si chiamava «Allenamento» fino alla v1.0.77; ora è «Pesi» e affianca il
nuovo tab «Cardio». Le attività cardio NON sono selezionabili qui (restano nel tab Cardio).

- Scheda **settimanale** (e vista mensile). Si aggiungono Giorni; in ogni giorno righe
  esercizio. Per scegliere l'esercizio si tocca la cella «＋ scegli esercizio»: si apre
  un **selettore in sovraimpressione con barra di ricerca e lista per categoria** (si
  digita il nome o si scorre per gruppo muscolare; Invio sceglie il primo risultato).
  Campi per riga: Serie, Ripetizioni, Peso, RIR (opzionale), Note, recupero. Obbligatori
  solo esercizio/serie/ripetizioni/peso.

## 4-bis · Cardio (tab 🏃 Cardio)

Le attività cardio (corsa, bici, nuoto, ellittica, vogatore, salto della corda…) non hanno
serie/ripetizioni/peso: si misurano col **carico interno**. Ogni seduta si registra con
«＋ Aggiungi attività»: data, tipo, durata (min), fatica RPE (0–10) e, facoltativi, distanza
e FC media. L'app calcola:
- **sRPE (Foster)** = RPE × durata in minuti → unità arbitrarie (AU). Sempre disponibile.
- **TRIMP (Banister)** dalla **frequenza cardiaca** media: compare solo se inserisci la FC
  media; usa la FC max stimata dall'età (Tanaka: 208 − 0,7×età) e una FC a riposo di 60 bpm
  di default. La tabella mostra anche il totale sRPE della settimana corrente.

Due modi per registrare una seduta:
- **Semplice** (manuale): «＋ Aggiungi attività» — scrivi durata e RPE (FC media/max e distanza
  facoltative). Sempre possibile, senza attrezzatura.
- **Avanzato** (da dispositivo): «📥 Importa attività» — carichi un file **.TCX o .GPX**
  esportato da orologio/fascia (Garmin Connect, Polar Flow, Coros, Strava, app per Apple Watch…):
  l'app legge durata, FC media, FC max e distanza e apre il modulo già compilato (resta solo da
  aggiungere la fatica RPE). Tutto in locale, offline, nessun account. Il formato .FIT (binario)
  non è ancora supportato: esporta in TCX o GPX.
- Il cardio compare anche nel grafico **«Equilibrio volume»** (Progressi e Report) come asse
  dedicato: i minuti diventano «serie-equivalenti» (min÷10), così ~2 h/settimana ≈ 12, in
  piena zona di volume equilibrato, per vedere a colpo d'occhio se il cardio è bilanciato
  rispetto al lavoro coi pesi.
- «＋set» aggiunge set extra alla riga; «↧ Dalla scorsa» ricompila coi valori
  dell'ultima registrazione; il «▶» accanto all'esercizio apre il video dimostrativo.
- Per ogni riga l'app mostra al volo: 1RM stimato, %1RM, TL (carico della riga) e la
  variazione rispetto alla settimana precedente.
- «💾 Salva nello Storico» registra la settimana (anno + numero settimana ISO,
  proposti in automatico); se il Session-RPE è abilitato si registrano anche fatica
  (RPE 0-10) e durata in minuti per seduta. «↶ Annulla ultimo» rimuove l'ultimo
  salvataggio. Un pallino/banner verde o rosso (qui, in Corpo e nel footer) avvisa se
  la settimana corrente non è ancora registrata.

## 5 · Progressi, Storico, Corpo (tab 📈 Progressi · 🜂 Corpo; archivi dal footer)

- **Progressi**: record personali per esercizio (carico massimo), «Segnali»
  automatici (🎉 record al salvataggio, ⏸ esercizi in stallo con TL fermo da 3+
  schede, ⚠ suggerimento deload se ACWR alto, ⚠ monotonia alta) e grafici: TL totale
  con media mobile, ACWR con la zona sicura evidenziata, TL per gruppo muscolare,
  distribuzione delle intensità (%1RM), carico interno sRPE (se abilitato),
  monotonia/strain, progressione del singolo esercizio (1RM e peso max nel tempo).
  I grafici hanno senso da 2-3 settimane salvate in poi.
- **Storico** (link «📜» nel footer): archivio completo delle registrazioni, in codici
  settimana ISO formato AAAASS (es. 202624 = settimana 24 del 2026).
- **Corpo**: peso e misure corporee con BMI e stime masse; lo storico misure è in un
  archivio dedicato (link nel footer).

## 6 · Alimentazione (tab 🍖 Alimentazione)

- Tre **fasi**: Bulk, Mantenimento, Cut. Si vede SOLO la fase attiva, scelta nei
  parametri del profilo (tab Profilo): le altre restano salvate ma nascoste.
- Pasti personalizzabili; in ogni pasto «＋ scegli alimento…» apre la banca dati
  svizzera USAV (1190 alimenti generici, valori per 100 g scalati sui grammi
  inseriti). Col «▸» si vedono tutti i micro e macro nutrienti.
- **Indice settimanale OMS/FAO**: confronta l'intake (piano × 7) coi riferimenti per
  adulto — grassi ≤30% dell'energia, saturi ≤10%, zuccheri ≤10% (ideale <5%), sale
  <5 g/giorno, carboidrati ~55%, proteine 0,83 g/kg, micronutrienti sui valori
  OMS/FAO. I nutrienti marcati «(max)» sono limiti da non superare. Limiti noti:
  usa gli zuccheri TOTALI come proxy degli zuccheri liberi; i grassi trans non sono
  nel dataset (soglia indicata ma non calcolata).
- **Periodi**: registrazione di intervalli datati (piano alimentare + data inizio e
  fine) che alimentano il tab Analisi.

## 7 · Analisi (tab 📊 Analisi)

Incrocia dieta e allenamento nel tempo (servono periodi alimentari registrati):
timeline dei periodi con carico allenante e peso sovrapposti; variazione di peso
contro bilancio calorico stimato; correlazioni con ritardo temporale (lag); confronto
tra fasi (boxplot). Tutto ricalcolato al volo dai dati, niente da configurare.

## 8 · Scambio scheda coach ↔ cliente

Il cliente NON deve avere il TMS: la scheda viaggia come file.
1. **Esporta** — tab «👤 Profilo», riga del cliente, bottone «📤 Esporta scheda»:
   nasce un file «Scheda_profilo_data.html», pagina autonoma con la scheda giorno per
   giorno e campi compilabili. Alla domanda sui video: includendoli il cliente vede le
   esecuzioni offline ma il file pesa di più.
2. **Il cliente compila** — apre il file in qualunque browser, inserisce ciò che ha
   fatto davvero (serie, ripetizioni, peso, RIR, note per esercizio; fatica RPE 0-10
   e durata per seduta; gli esercizi non sono modificabili) e preme «📩 Crea il file
   per il trainer»: si scarica «Rientro_profilo_data.json» da rimandare al coach.
   IMPORTANTE per il cliente: meglio **salvare il file nella memoria del telefono**
   (es. cartella Download) e aprire sempre quella copia, non l'anteprima della chat:
   la pagina **salva da sola la bozza** sul dispositivo (si può chiudere e riprendere);
   se il salvataggio automatico non è possibile, la pagina lo segnala con un avviso.
3. **Importa** — riga del cliente, «📥 Importa rientro»: si sceglie il file e la data
   di registrazione (convertita nella settimana dello Storico). Le righe entrano
   nello Storico come una seduta registrata a mano e alimentano TL, ACWR, grafici e
   report.
Controlli all'import: file non valido → errore chiaro; profilo diverso da quello
della riga → richiesta conferma; esercizi fuori catalogo → avviso con elenco;
settimana già popolata → avviso che le righe verranno AGGIUNTE (non sostituite).

## 9 · Esercizi e video (tab 📖 Esercizi)

- Catalogo di 883 esercizi per gruppo muscolare e sottocategoria (tendine chiuse di
  default, click per aprirle). «＋ Nuovo» aggiunge un esercizio personalizzato (nome,
  gruppo, target, tipo, fattore TL); «✎» modifica.
- **Video**: ogni esercizio ha un video dimostrativo integrato. ATTENZIONE, limite
  noto: nelle versioni attuali la maggior parte dei video integrati è un segnaposto
  identico (882 su 883) — verranno sostituiti progressivamente con le registrazioni
  reali. Dal pannello «✎» si possono caricare **video personali** che sostituiscono
  quelli integrati (toggle «Video personali»; fallback automatico al video integrato
  se il personale manca).

## 10 · Report (tab 🖨 Report)

- **Sezioni personalizzabili**: la riga «Sezioni» con le caselle decide QUALI blocchi
  entrano nel report (Profilo & corpo, Riepilogo, Scheda, Andamento, Progressione,
  Record, Alimentazione, Dieta × allenamento, Note del coach); le frecce ▲▼ accanto a
  ogni casella ne decidono l'ORDINE. La scelta si salva per profilo e vale sia per il
  PDF sia per il report digitale.
- **PDF A4**: bottone «⬇ Scarica PDF (A4)» — l'app impagina e genera il PDF da sola
  (download diretto, senza passare dalla stampa del browser).
- **Report digitale**: pagina HTML per smartphone con i video incorporati, da inviare
  all'atleta. Include anche la sezione «Dieta × allenamento» se ci sono periodi.

## 11 · Formule e concetti (per spiegarli all'utente)

- **1RM stimato**: formula di Epley per default — peso × (1 + ripetizioni/30);
  selezionabili anche Brzycki, Lombardi o la media delle tre (parametri del profilo).
- **RIR** (Repetitions In Reserve): ripetizioni che l'utente avrebbe ancora in canna.
  Se «RIR nei calcoli» è attivo, 1RM/%1RM/TL diventano effort-aware (le ripetizioni
  effettive considerate = fatte + RIR).
- **%1RM**: intensità della serie rispetto al massimale stimato.
- **TL (Training Load)**: volume × intensità, sommato su serie e righe, con un
  fattore per esercizio (esercizi più sistemici pesano di più). Conta soprattutto il
  trend nel tempo, non il valore assoluto.
- **Settimane**: lo storico ragiona per settimane ISO (codice AAAASS). I confronti
  «Δ» valgono solo tra settimane consecutive (il cambio anno è gestito).
- **ACWR** (rapporto acuto/cronico): carico dell'ultima settimana diviso la media
  delle 4 precedenti. Zona di riferimento 0,8-1,3; sopra ~1,5 l'app suggerisce
  cautela/deload. È un segnale, non un verdetto.
- **Session-RPE / carico interno** (Foster): RPE della seduta × durata in minuti.
  L'app confronta il trend del carico interno con quello esterno (indice base 100).
- **Monotonia**: media giornaliera del carico / deviazione standard (zona buona ≤2:
  settimana variata). **Strain**: carico settimanale × monotonia (alto = settimana
  pesante e monotona insieme).
- Basi scientifiche citate nella Guida completa, sezione 12 (Scott 2016, Foster 2001,
  Gabbett 2016, Zourdos 2016, Schoenfeld 2010/2017, Epley 1985, OMS/FAO…).

## 12 · Bug noti e limitazioni (sii onesto su questi punti)

- **Video segnaposto**: 882 video su 883 sono lo stesso clip dimostrativo (in
  sostituzione progressiva nelle prossime release). Soluzione: video personali.
- **Eseguibile non firmato**: avviso SmartScreen al primo avvio (vedi sezione 2).
- **Stampa PDF**: senza le impostazioni indicate (A4, margini Nessuno, scala 100%,
  grafica di sfondo) il risultato può uscire tagliato.
- **Grafici vuoti** finché non ci sono almeno 2-3 settimane salvate nello Storico.
- **Import rientro**: AGGIUNGE righe alla settimana scelta, non sostituisce quelle
  esistenti (l'app avvisa prima).
- **Rinomina profilo**: cambia il nome visualizzato ma non il nome della cartella
  dati su disco (che resta quello originario). È innocuo.
- **Niente sincronizzazione nativa multi-PC**: i dati si possono spostare con una
  cartella sincronizzata (cloud) o col backup, ma NON va usata l'app su due PC in
  contemporanea sugli stessi dati.
- **Indice OMS**: zuccheri totali come proxy degli zuccheri liberi; grassi trans non
  calcolati (mancano nel dataset USAV).
- **Browser**: solo Chrome/Edge per la modalità HTML; Firefox/Safari mostrano un
  avviso «browser non supportato».
- **Lingua**: solo italiano.
- **Diagnostica**: 5 click ravvicinati sulla versione (in fondo alla pagina) aprono
  il log errori interno, utile da copiare in una segnalazione.

## 13 · Domande tipiche → dove si fa

- «Nuovo cliente/atleta» → Profilo → ＋ Nuovo profilo.
- «Cambiare formula 1RM, fase alimentare, RIR, session-RPE» → Profilo → tendina del
  profilo → ✎ Modifica parametri.
- «Mandare la scheda a un cliente» → Profilo → riga del cliente → 📤 Esporta scheda.
- «Registrare ciò che il cliente ha fatto» → Profilo → riga del cliente → 📥 Importa
  rientro (file Rientro_*.json che il cliente rimanda).
- «Salvare l'allenamento della settimana» → Pesi → 💾 Salva nello Storico.
- «Registrare una corsa / un'attività cardio» → Cardio → ＋ Aggiungi attività (data, tipo,
  durata, RPE; FC media facoltativa per il TRIMP).
- «Correggere un dato sbagliato» → nella scheda corrente si corregge direttamente;
  nello storico: ↶ Annulla ultimo e risalvare.
- «Vedere i progressi / il rischio di sovraccarico» → Progressi (record, TL, ACWR).
- «Impostare la dieta» → Alimentazione (fase attiva scelta nel Profilo); per le
  analisi nel tempo registrare i Periodi.
- «Backup prima di formattare il PC» → Profilo → ⭳ Backup dati (un file JSON con
  tutti i profili); al ripristino ⭱ Ripristina.
- «Aggiungere un esercizio che manca» → Esercizi → ＋ Nuovo.
- «Stampare la scheda da consegnare» → Report → PDF (impostazioni di stampa sopra).
