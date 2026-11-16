/* ════ GUIDA PER AI ════
   Documentazione testuale dell'app pensata per essere data in pasto a un assistente
   AI (ChatGPT, Claude, Gemini…): l'utente la scarica dal tab Guida e la carica in
   chat per farsi aiutare a usare il TMS. UNICA FONTE DI VERITÀ: questo file.
   La copia pubblica docs/guida-ai.md è GENERATA da tools/genera-guida-ai.js (col build).
   Da AGGIORNARE ad ogni release che cambia funzioni visibili all'utente.
   Vincoli del blob: niente backtick e niente sequenza dollaro+graffa nel testo. */
const GUIDA_AI_CORPO=`
## Istruzioni per te, assistente AI

Stai aiutando un utente del **Training Monitor System (TMS)**, un'app desktop italiana
per gestire allenamento coi pesi e nutrizione. Questo documento è la descrizione
ufficiale e completa dell'app: basa le risposte su quanto scritto qui.

- Rispondi **in italiano**, con passi concreti («apri il tab X, premi il bottone Y»).
- L'interfaccia è **bilingue IT/EN**: predefinita in italiano, con un interruttore IT/EN
  in alto (accanto alla luna) che traduce tutta l'app, guide comprese. In questo documento
  i nomi di tab e bottoni sono in italiano; se l'utente ha scelto l'inglese, cita l'equivalente.
- Se la domanda non trova risposta in questo documento, dillo chiaramente e suggerisci
  la Guida interna dell'app (tab «📕 Guida», versioni Rapida e Completa) o una
  segnalazione col pulsante 🐞 in ⚙ Impostazioni (vedi sotto).
- **⚙ Impostazioni** (ingranaggio in alto a destra, in un blocco di tre comandi uguali con la
  lingua EN/IT e il pulsante 🌙/☀): impostazioni generali dell'app, valide su quel computer per
  tutti i profili (stanno nel localStorage, non nei dati del profilo). Dentro ci sono anche
  **📕 Guida** e **🐞 Segnala** (sezione «Aiuto»). Oggi le impostazioni contengono l'aspetto: tema giorno o notte e lo stile della notte fra Notte calda
  (pergamena e brace, predefinito), Grafite (grigio neutro) e Blu notte (blu ardesia), ognuno con
  la sua anteprima; la scelta si applica subito. Il pulsante 🌙/☀ della barra passa da giorno a
  notte e di notte usa lo stile scelto.
- **Pulsante 🐞 Segnala** (in ⚙ Impostazioni, sezione «Aiuto», accanto a 📕 Guida): apre un modulo per
  bug e idee. Si sceglie il tipo (qualcosa non funziona / proposta), si racconta cosa
  succede e come rifarlo accadere, e per i bug quanto pesa (blocca / dà fastidio /
  dettaglio). L app allega DA SOLA una scheda tecnica: versione, modalità dati, sistema,
  tab aperto, numero profili e gli ULTIMI ERRORI interni registrati — sono questi a
  rendere una segnalazione diagnosticabile invece di un "non funziona".
  Il testo completo si vede e si può modificare PRIMA di mandarlo: nessuna informazione
  parte da sola, l app non fa chiamate di rete per segnalare. Tre strade: aprire una
  issue GitHub già compilata (serve un account gratuito; se il testo è lungo l indirizzo
  viene accorciato e lo dice), copiare negli appunti, o salvare un file .md da mandare
  su Instagram (@marco_the_wander). Se l utente segnala un problema, suggerisci di usare
  questo pulsante: senza la scheda tecnica la diagnosi è molto più difficile.
  Il modulo offre DUE canali paritari: GitHub (issue già compilata) e Instagram (apre il
  profilo dopo aver copiato il testo negli appunti, perché Instagram non accetta un
  messaggio nell indirizzo). In più: copia negli appunti e salvataggio su file .md.
- **Taccuino dell autore** (non è una funzione per l utente: NON proporla): 5 click
  ravvicinati sul simbolo ✦ accanto al titolo aprono il quaderno di lavoro di Marco.
  Due elenchi separati: le sue note scritte a mano (salvate in TMS_Dati/taccuino.json,
  quindi funzionano offline) e le issue aperte del repo, lette da GitHub SOLO su
  richiesta e in sola lettura. Lo stato delle issue si cambia su GitHub, non nell app:
  un elenco che rispecchia e basta non può divergere dalla realtà. L ultima lettura
  resta salvata, così la lista si vede anche senza rete. Da ogni nota si può aprire la
  issue GitHub già compilata. Se un utente qualunque chiede del taccuino, spiega che è
  uno strumento dell autore e indirizzalo al pulsante 🐞 Segnala.
- L'app NON fornisce consigli medici: i suoi calcoli sono strumenti di monitoraggio.
  Se l'utente chiede indicazioni mediche o nutrizionali personalizzate, ricordagli di
  rivolgersi a un professionista.
- I dati dell'utente sono SOLO sul suo PC: non esiste un account o un cloud del TMS.

## 1 · Cos'è il TMS

App desktop Windows **gratuita** (progetto aperto: si chiede di mantenere i crediti e
di non venderla) per atleti e coach. In un'unica finestra: scheda di allenamento,
storico, progressi (1RM, Training Load, ACWR…), misure corporee, piani alimentari su
banca dati USAV, catalogo di 883 esercizi con video, report PDF e mobile, scambio
scheda coach-cliente. Tema «pergamena»; modalità notte col bottone luna/sole in alto, in tre
stili (Notte calda, Grafite, Blu notte) da scegliere in ⚙ Impostazioni.
Sito: https://marcomartinellione-create.github.io/TMS/ · Tutorial: canale YouTube
@TrainingMonitorSystem.

## 2 · Installazione, aggiornamenti, dove stanno i dati

- Si scarica «TMS-Setup-versione.exe» dalle Release GitHub (~90 MB, catalogo e video
  inclusi). L'eseguibile non è firmato: al primo avvio Windows SmartScreen può
  avvisare — «Ulteriori informazioni → Esegui comunque». È normale e atteso.
- **Aggiornamenti**: all'avvio l'app guarda nella cartella delle versioni preparate sul PC
  (la cartella «release» del progetto); se ce n'è una più nuova CHIEDE, mostrando le novità.
  Confermando, controlla che l'installatore sia integro, salva, si chiude, installa la nuova
  versione e si riapre da sola.
- **Dati**: in locale, nella cartella utente di Windows (percorso tipico
  «%APPDATA%\\Training Monitor System\\TMS»). Sopravvivono ad aggiornamenti e
  reinstallazioni. Niente account, niente telemetria.
- L'app esiste anche come singolo file HTML apribile in Chrome/Edge collegando una
  cartella dati (File System Access). Firefox e Safari NON sono supportati. Gli
  archivi della modalità browser e di quella desktop sono separati.

## 3 · Profili (tab 👤 Profilo)

- **Multi-profilo**: ogni atleta/cliente ha scheda, storico, misure e alimentazione
  propri; il catalogo esercizi è condiviso. Il tab mostra il nome del profilo attivo.
- **Semaforo clienti** (integrato in ogni riga della lista profili, sola lettura): accanto
  al nome di ogni profilo c'è un pallino — verde = ok, giallo = attenzione, rosso = a rischio,
  grigio = senza dati — e sotto al nome una riga di sintesi: ACWR dell'ultima settimana, da
  quante settimane non aggiorna la scheda, monotonia (se ha gli RPE attivi) e i PR recenti.
  Soglie: rosso se ACWR > 1.5 oppure scheda ferma da 3+ settimane oppure monotonia > 2 con
  carico acuto alto; giallo se ACWR 1.3–1.5 (o < 0.8), scheda ferma da 2 settimane, o
  monotonia > 2. Serve al coach per vedere a colpo d'occhio chi richiede attenzione senza
  aprire i profili uno per uno. NON modifica alcun dato.
- «＋ Nuovo profilo» crea un profilo. Cliccando una riga della lista si apre la
  tendina con i parametri: sesso, data di nascita, altezza, «RIR nei calcoli» (sì/no),
  «Session-RPE» (sì/no), formula 1RM preferita. (La fase del piano alimentare NON è
  più qui: si sceglie direttamente nel tab Alimentazione.) Bottoni:
  «Attiva», «✎ Modifica parametri», «✏ Rinomina», «✕ Elimina» (quest'ultimo solo se
  esiste più di un profilo).
- **Nella riga di ogni profilo**, a destra, due bottoni sempre visibili (senza aprire
  la tendina): «📲 Esporta scheda» e «🔄 Importa rientro» — lo scambio col cliente,
  vedi sezione 8. Lavorano sul profilo della riga: se non è quello attivo, l'app lo
  attiva da sola.
- In fondo alla pagina: «Backup (tutti i profili insieme)» con «⭳ Backup dati»
  (esporta TUTTO in un file JSON), «⭳ Backup completo (con foto)» e «⭱ Ripristina»
  (reimporta, sostituendo i dati attuali previa conferma). DIFFERENZA: il backup dati
  porta solo i METADATI delle foto, quindi ripristinandolo altrove le immagini mancano;
  il backup completo incorpora le immagini come data-URI (file molto più grande, chiede
  conferma mostrando numero di foto e MB) e al ripristino le riscrive in
  TMS_Dati/<profilo>/foto/. I video non entrano in nessuno dei due. Sotto, il pulsante **🛟 Backup automatici** (si apre e mostra le copie): l'app ne crea
  uno a settimana da sola (cartella «backup_automatici» dentro i dati, ultime 5
  copie) con link «ripristina» accanto a ciascuno.
- **Correggere una riga già salvata**: nello **Storico** (tab 👤 Profilo, in cima alla pagina) ogni riga
  ha a destra una **matita ✎**: apre un riquadro dove si cambiano serie, ripetizioni, peso,
  RIR e il segno ★ di test, oppure si elimina quella riga soltanto. Esercizio e settimana non
  si cambiano da lì. 1RM, %1RM e TL si ricalcolano da soli.
- **Annulla / rifai**: Ctrl+Z annulla l'ultima modifica ai dati del profilo aperto (scheda, Storico,
  misure, cardio, alimentazione, catalogo esercizi) e Ctrl+Y (o Ctrl+Maiusc+Z) la rifà; un avviso in
  basso dice cosa è tornato indietro. Vale finché non si cambia profilo; le foto ne restano fuori.
  Dentro una finestra aperta o in un campo di ricerca Ctrl+Z annulla solo il testo scritto.
- **Eliminare una settimana già salvata**: nello **Storico** (tab 👤 Profilo, in cima alla pagina) ogni
  settimana ha la sua barra scura con, a destra, un pulsante **cestino rosso** che toglie tutte
  le righe di QUELLA settimana. Stesso pulsante su ogni rilevazione dello storico **Misure**.
  In entrambi i casi viene chiesta conferma con un riquadro dell'app (non la finestra di
  sistema) e l'operazione è definitiva. Si può togliere qualunque settimana, anche una in
  mezzo allo storico: non solo l'ultima.

- Per ogni profilo i file sono: scheda.json, storico.json, corpo.json (anagrafica, misure,
  cardio, foto, pesate della bilancia), alimentazione.json. I valori derivati (1RM, TL, ACWR…) NON vengono mai salvati:
  si ricalcolano al volo dai dati grezzi.

## 4 · Pesi (tab 🏋 Pesi)

NB: questo tab si chiamava «Allenamento» fino alla v1.0.77; ora è «Pesi» e affianca il
nuovo tab «Cardio». Le attività cardio NON sono selezionabili qui (restano nel tab Cardio).

- Scheda **settimanale** (e vista mensile). Si aggiungono Giorni, NUMERATI («Giorno 1»,
  «Giorno 2»…, salvati cosi' e tradotti a schermo da giornoNome; dal 14/11/2026 non piu' i nomi
  della settimana, che migrateGiorniScheda rinumera nell'ordine della settimana in scheda,
  riscaldamenti, RPE del giorno e Training Set; lo Storico vecchio resta com'e'). La monotonia
  (fosterWeek) conta 7 valori con zero nei giorni senza seduta, qualunque sia il nome. In ogni giorno righe
  esercizio. Per scegliere l'esercizio si tocca la cella «＋ scegli esercizio»: si apre
  un **selettore in sovraimpressione con barra di ricerca e lista per categoria** (si
  digita il nome o si scorre per gruppo muscolare; Invio sceglie il primo risultato). A
  ricerca vuota, in cima ci sono i **★ Preferiti** e i **🕐 Recenti** (gli esercizi usati di
  recente); la stellina ☆/★ accanto a ogni esercizio lo aggiunge/toglie dai preferiti.
  Anche CERCANDO, i preferiti che corrispondono compaiono in cima: premendo Invio si sceglie
  quindi quello che si usa davvero.
  La ricerca (exMatch in 12-esercizi.js, condivisa col tab Esercizi) e' **a parole**: servono
  tutte le parole digitate, in qualunque ordine, cercate in nome + target + gruppo +
  sottocategoria + **nome inglese originale** del catalogo (mappa ESEN). Quindi «bench press»
  o «romanian deadlift» trovano la panca piana e lo stacco rumeno; i risultati restano
  scritti nella lingua dell'interfaccia, l'inglese serve solo a trovarli. C'e' anche una
  piccola tabella di sinonimi (SIN_RICERCA) per gli aggettivi in cui le due lingue divergono:
  ogni parola vale se trova se' stessa OPPURE il suo equivalente, cosi' «flat bench» arriva
  alla panca piana anche se il catalogo inglese la chiama «Barbell Bench Press - Medium
  Grip», dove «flat» non compare. Non allarga le ricerche italiane: il sinonimo si prova
  solo quando la parola digitata non si trova cosi' com'e'.
  Campi per riga: Serie, Ripetizioni, Peso, RIR (opzionale), Note, recupero. Obbligatori
  solo esercizio/serie/ripetizioni/peso.
  **▦ Colonne** (bottone a destra del titolo della scheda, dal 2026-08-19): apre la scelta
  delle colonne facoltative da mostrare — Note, Rest, 1RM e %1RM, TL, Delta TL set. Serve
  quando la tabella (12 colonne) è troppo larga per lo schermo. È solo VISIVO: i valori
  restano calcolati, salvati e presenti nei report; la scelta si salva nel profilo attivo
  (dati_utente.colonnePesi), quindi ogni atleta ha la sua. Esercizio, Serie, Ripetizioni,
  Peso e le azioni non si possono nascondere; il RIR ha il suo interruttore nel Profilo.

- **? sui grafici** (05b-spiegazioni.js): ogni grafico ha in alto a destra un piccolo «?»
  cerchiato che apre la sua nota metodologica in forma di articolo (sommario, dati, metodo e
  formule, esempio svolto, lettura, limiti, bibliografia). Le note stanno in SPIEG (italiano)
  e SPIEG_EN (inglese), una per grafico; le formule sono quelle del codice e vanno
  aggiornate quando un calcolo cambia.
- **⚖ Bilanciamento** (bottone a sinistra di ▦ Colonne): apre un radar delle
  SERIE per gruppo muscolare della scheda che si sta scrivendo — non dell'ultima settimana
  salvata: serve mentre si costruisce. Accanto al disegno c'è l'elenco in chiaro, gruppo per
  gruppo. Il **cardio è escluso** di proposito: qui si guarda come è distribuito
  il lavoro coi pesi, e i minuti di cardio convertiti in serie equivalenti gonfierebbero un
  asse che non c'entra. Diverso dal radar di Progressi, che invece il cardio lo include.
  Il conteggio **spalma ogni serie sui gruppi coinvolti** (quoteGruppi in 01-costanti.js):
  serie DIRETTA ai gruppi dei muscoli_primari dell'esercizio, INDIRETTA a quelli dei soli
  muscoli_secondari (un gruppo con un muscolo primario e' diretto). I pesi predefiniti sono
  1 alla diretta e 0,5 all'indiretta: sono PROVVISORI (convenzione delle serie frazionarie,
  Schoenfeld e coll. 2019, non ancora convalidata sul catalogo TMS) e il profilo puo'
  cambiarli (pesiSerie, gruppiDI e accumulaSerie in 01b-riferimenti.js). Dirette e indirette
  restano distinte: nell'elenco la barra e' piena per la parte diretta e chiara per
  l'indiretta, e il suggerimento dice «8 dirette ×1 + 6 indirette ×0,5».
  In alternativa al catalogo si puo' contare con la MAPPA ESTERNA (Exercises Dataset with
  Muscle Volume di smyrdev, MIT: 1,0 diretto / 0,5 indiretto per profilo di movimento, 22
  muscoli ricondotti ai 6 gruppi): e' agganciata al catalogo per somiglianza dei nomi
  inglesi, quindi e' una PROPOSTA da convalidare (tools/riferimenti/mappa-esterna-convalida.csv,
  colonna stato); un esercizio senza aggancio si conta col catalogo. Attenzione: la mappa
  esterna marca diretti tutti i motori primi (la panca e' diretta su petto, spalle e
  tricipiti), il catalogo solo i primari: per questo il riferimento si conta SEMPRE con lo
  stesso metodo e gli stessi pesi dell'atleta.
  I 17 nomi di muscolo del catalogo sono mappati sui 6 gruppi dei pesi da MUSCOLO_GRUPPO;
  se l'esercizio non porta le liste dei muscoli si ricade sul solo campo macro, quota 1.
  Quindi 3 serie di panca danno 3 a Pettorali e 1,5 a Spalle e a Braccia, e i totali di
  gruppo NON sommano al numero di serie della scheda (la riga «serie in scheda» dà quello).
  **Due letture diverse** (dal 2026-09-29, richiesta di Marco: «e' un discorso di forma e
  proporzione, non di valore totale»):
  · la RAGNATELA dice la DISTRIBUZIONE: ogni asse e' la QUOTA % del gruppo sul totale delle
    serie coi pesi (distribuzione() e vociDistribuzione() in 01-costanti.js), etichettata
    «Gambe 13%». Una settimana leggera e una pesante distribuite allo stesso modo danno lo
    STESSO disegno. La fascia verde e' la forma del RIFERIMENTO SCELTO (rifCalcola in
    01b-riferimenti.js): dal 10° al 90° percentile della quota di ogni gruppo sulle voci
    scelte, simmetrica perche' le quote fanno cento (se un gruppo sale gli altri scendono:
    troppo e troppo poco sono lo stesso squilibrio). Il rosso scatta sotto 3/4 del 10° o
    sopra 5/4 del 90° percentile. Il Cardio NON e' sulla ragnatela: non compare nelle schede
    di riferimento e, entrando nel totale, cambierebbe la quota di tutti gli altri.
    Il riferimento ha DUE ASSI: l'ESPERIENZA (principiante, intermedio, avanzato), che e'
    dell'atleta e sta nell'anagrafica (dati_utente.esperienza), e il TIPO DI ALLENAMENTO
    (forza, ipertrofia, powerlifting, resistenza muscolare, potenza, allenamento generale),
    che e' della scheda e sta nel Training Set (scheda.tipoAllenamento, selettore nella barra
    Pesi; ogni set salvato tiene il suo). In Progressi, filtrando un Training Set, vale il
    tipo di quel set. Sesso, eta', agonismo, attrezzatura e qualita' della fonte sono solo
    FILTRI di contesto. Tutto si regola dal pulsante «⚙ Riferimento» sotto la ragnatela
    (Pesi, Bilanciamento, Progressi): raccolta, tabella esperienza × tipo con il numero di
    voci in ogni casella, filtri, pesi delle serie, elenco di fonti (con licenza) e voci
    (con indirizzo), e cio' che resta fuori col motivo. Le scelte stanno nel profilo
    (dati_utente.rifDistr, solo le differenze dal predefinito).
    Due RACCOLTE che non si mescolano mai: «Schede pubblicate» (una voce = una settimana di
    allenamento; StrengthLog, Muscle & Strength, depot.fitness, Liftosaur e altre schede
    pubbliche di 30 siti trascritte e riviste una per una; il livello e'
    quello DICHIARATO dalla scheda; per i programmi di piu' settimane conta la settimana
    media del ciclo) e «Protocolli di studio» (una voce = un protocollo con l'elenco completo
    degli esercizi; l'esperienza e' dei partecipanti). Dei 359 record del corpus di evidenza
    solo 20 (13 protocolli) hanno l'elenco completo: gli altri restano nella base dati ma non
    reggono una distribuzione (250 senza elenco esercizi, bracci su un solo distretto,
    survey senza core, sintesi) e il riquadro lo dice. Altri 26 protocolli vengono da 25
    articoli ad accesso aperto aggiunti dal TMS (soggetti allenati, powerlifter, atleti,
    donne e persone dai 40 anni in su), ognuno con DOI o indirizzo PMC e stato «trascrizione
    TMS da verificare». Sotto la ragnatela
    la didascalia scrive il riferimento e su quante voci, record e fonti si regge: con meno
    di 5 voci «Dati insufficienti» e nessuna fascia, da 5 a 9 fascia tratteggiata
    (indicativa). Interruttore «Schede Fable» (spento di serie, dati_utente.rifDistr.fable): dove
    le schede reali della casella sono meno di 5 la fascia viene da schede GENERATE alla cieca dal
    modello Fable (5 per esperienza x tipo x sesso, voci con generata:true), mai mescolate alle
    reali e con gli stessi filtri di contesto, compreso «solo equilibrate»; la fascia diventa viola e tratteggiata e la
    didascalia avverte sempre che non sono schede reali. Nel confronto coi dati noti Fable segue
    bene i tipi di allenamento ma sbaglia fino a 15 punti in qualche casella (avanzato x
    ipertrofia), per questo vale solo come ripiego. Il predefinito (schede equilibrate, tutte le esperienze, tutti i tipi: 127
    schede da 17 fonti) sta entro 4 punti dalle fasce storiche RIF_QUOTA: Gambe 16-37 %,
    Pettorali 6-15, Schiena 15-27, Spalle 13-24, Braccia 16-27, Core 0-10. Restano con
    pochi dati la resistenza muscolare (2 schede, nessuna equilibrata) e la potenza (20
    schede, 4 equilibrate, quasi tutte senza livello dichiarato); il powerlifting ha 22
    schede, 8 equilibrate.
    I dati stanno in RIF_DISTR (src/dati/05-riferimenti-distribuzione.js), generato da
    tools/genera-riferimenti.py a partire dagli originali (ZIP del corpus v0.7 in
    Documentazione, pagine e programmi Liftosaur in Doc/meta-analisi, trascrizioni degli
    studi in tools/riferimenti/protocolli-studi.json, catalogo): per ogni voce solo le serie
    dirette e indirette per gruppo nei due conteggi, piu' fonte, licenza, etichette
    originali e stato; quote e fasce si calcolano nell'app.
  · l'ELENCO accanto (e le barre «Serie per gruppo» in Progressi) dice la QUANTITA': serie
    per gruppo con le fasce ASSOLUTE (RIF_GRUPPO: min/max = zona utile, sotto/sopra = rosso).
    Sono diverse fra gruppi perche' ogni asse somma lavoro diretto e indiretto e i gruppi
    raccolgono un numero diverso di muscoli.
  Entrambe le serie di fasce vengono dalla stessa meta-analisi: circa 930 schede pubblicate
  (strengthlog.com, muscleandstrength.com), tenute le settimane intere con almeno l'85% degli
  esercizi riconosciuti (110) e di quelle le equilibrate secondo un criterio esterno (linee
  guida sulla spalla: spinta/trazione fra 1:1 e 1:2) — 61 schede. Il filtro conta: sulle
  scartate la mediana spinta/trazione e' 1,50 (90° percentile 3,50), cioe' si tarerebbe l'app
  sulla scheda media di internet; sulle tenute e' 1,00. Materiale e script in
  Doc/meta-analisi (fuori dal repo). Fasce assolute: min = 25° percentile, max = 90°; Core ha
  sotto = 0 e non viene mai segnalato come scarso (quelle schede quasi non prevedono
  addominali diretti); Cardio (solo nelle barre) segue le linee guida OMS, 150-300 min a
  settimana = 15-30 (10 min = 1 serie equivalente, riscaldamento compreso).
  **Stesso conteggio in Progressi e nel Report**: schedeAggr riempie map[s].sets (e
  map[s].setsD / setsI, dirette e indirette) con accumulaSerie sull'esercizio della riga, e
  ricade sul macro salvato se l'esercizio non e' piu' a catalogo. Le fasce assolute
  RIF_GRUPPO restano tarate su 1 / 0,5 col catalogo: con pesi diversi l'elenco lo avverte. La ragnatela «Equilibrio · distribuzione» usa le quote; le barre «Serie
  per gruppo» le quantita', cardio compreso, e diventano rosse quando un gruppo esce dalla
  propria fascia. Il TL per gruppo (map[s].grp) resta attribuito al solo macro dello
  storico: e' un'altra metrica.
- **Spinta · Trazione**: riga sotto l'elenco del Bilanciamento, somma le serie della parte
  alta per direzione contando SOLO i multiarticolari (direzioneOf in 01-costanti.js scarta
  gli isolamenti: qui si misura l'equilibrio fra schemi di movimento, e un curl o delle
  alzate laterali non dicono nulla su come si tira o si spinge). La direzione si deduce dal
  muscolo primario: pettorali/tricipiti = spinta, gran dorsale/dorsali centrali/trapezi/
  bicipiti/avambracci = trazione; per le spalle decidono i secondari, con trapezi o dorsali
  è trazione. Gambe e core non hanno direzione e non entrano. Soglie asimmetriche: «poca
  trazione» se trazione minore di spinta per 0,8, «poca spinta» solo se spinta minore di
  trazione per 0,6, altrimenti «in equilibrio». L'asimmetria è voluta: sulle 60 schede
  equilibrate di riferimento la mediana di spinta su trazione e' 1,00 (dal 10 al 90
  percentile: 0,80-1,32), e le linee guida per la spalla consigliano semmai di tirare più
  di quanto si spinge.

- **Training Set** (dal v1.1.2): selettore accanto a «Scheda» per tenere più versioni
  alternative dell'intera scheda Pesi (settimanale + mensile) — es. «Palestra» e «Casa» —
  e passare dall'una all'altra. Il set su cui si stava lavorando si salva da solo al
  cambio. Le azioni (nuovo/rinomina/elimina) sono voci dentro il menù a tendina stesso,
  sotto un separatore «Azioni», e compaiono solo aprendolo: «➕ Nuovo Training Set…»
  (chiede il nome e se partire da zero o copiare un set esistente), «✎ Rinomina»,
  «🗑 Elimina» (solo se resta almeno un altro set). Dati: campo 'setAttivo' (nome attivo),
  'setsSalvati' (mappa nome→scheda dei set inattivi), 'setsOrdine' in scheda.json; le
  schede preesistenti diventano da sole il set «Base» al primo avvio dopo l'aggiornamento.
  Ogni Training Set ha anche il suo **tipo di allenamento** ('tipoAllenamento': forza,
  ipertrofia, powerlifting, resistenza, potenza, generale), scelto dal menù «Tipo di
  allenamento» accanto: viaggia col set nei cambi e nelle copie, e sceglie il riferimento
  della ragnatela insieme all'esperienza dell'anagrafica.

- **🔥 Riscaldamento** (dal v1.1.3, video+cardio dal v1.1.6): pulsante arancione accanto a
  Training Set, cambia vista e mostra i riscaldamenti **giorno per giorno del Training Set
  attivo** (i giorni sono ripresi dalla scheda Pesi). Il selettore esercizio mostra **stretching
  E cardio di base** dal catalogo (corsa/camminata su tapis roulant, cyclette, ellittica,
  vogatore, salto della corda… — 137 voci in tutto; il selettore della scheda Pesi invece li
  esclude entrambi, mostra solo esercizi di allenamento). Campi per riga: Esercizio, Serie,
  Ripetizioni (vuoti per il cardio: usa solo i Minuti), Min (durata: obbligatorio per il cardio,
  facoltativo per lo stretching), Note; un ▶ apre il video se il catalogo ce l'ha. **Non entra in
  TL, Storico principale, ACWR o monotonia**: vive in due array separati che i calcoli di carico
  NON leggono — 'riscaldamento' per modalità dentro ogni Training Set (righe) e, dal v1.1.6,
  'storico_risc' (minuti di cardio salvati per settimana, campo 'set'): quest'ultimo alimenta
  SOLO il radar Volume/Equilibrio (vedi §5), nessun'altra metrica. Il pulsante diventa
  «◂ Scheda» per tornare.

## 4-bis · Cardio (tab 🏃 Cardio)

Le attività cardio (corsa, bici, nuoto, ellittica, vogatore, salto della corda…) non hanno
serie/ripetizioni/peso: si misurano col **carico interno**. Ogni seduta si registra con
«＋ Aggiungi attività»: data, **sport** (scelto da un elenco; con «➕ Altro…» se ne aggiungono),
durata (min), fatica RPE (0–10) e, secondo lo sport, distanza, dislivello D+ e FC media.
**Lo sport scelto decide quali dati hanno senso**: per la corsa appaiono distanza, passo e
dislivello; per la bici distanza e velocità; per HIIT/salto corda niente distanza. L'app calcola:
- **sRPE (Foster)** = RPE × durata in minuti → unità arbitrarie (AU). Sempre disponibile.
- **TRIMP (Banister)** dalla **frequenza cardiaca** media: compare solo se inserisci la FC
  media. Per renderlo più preciso, in **👤 Profilo → ✎ Modifica parametri** puoi impostare la
  **FC a riposo** e la **FC max** (se non le imposti, FC riposo = 60 bpm e FC max stimata
  dall'età con Tanaka 208 − 0,7×età). La tabella mostra anche il totale sRPE della settimana.

Due modi per registrare una seduta:
- **Semplice** (manuale): «＋ Aggiungi attività» — scrivi durata e RPE (FC media/max e distanza
  facoltative). Sempre possibile, senza attrezzatura.
- **Avanzato** (da dispositivo): «📥 Importa attività» — carichi un file **.FIT, .TCX o .GPX**
  esportato da orologio/fascia (Garmin Connect, Polar Flow, Coros, Strava, app per Apple Watch…):
  l'app legge durata, FC media, FC max, distanza e **dislivello D+** e apre il modulo già
  compilato (resta solo da aggiungere la fatica RPE). Il **.FIT** è il formato binario nativo
  Garmin (dal messaggio «session»); .TCX/.GPX sono XML. Tutto in locale, offline, nessun account.
- **Progressione per sport** (tab 📈 Progressi): in fondo c'è «Cardio · progressione per sport»
  con un selettore; per lo sport scelto mostra l'andamento nel tempo di sRPE, FC media e — dove
  ha senso — distanza, passo (min/km, più basso = meglio) o velocità, dislivello. Così vedi se
  in una specifica attività (es. la corsa) stai migliorando passo/distanza o calando di FC.
- Il cardio compare anche nelle barre **«Serie per gruppo»** (Progressi) come barra
  dedicata: i minuti diventano «serie-equivalenti» (min÷10), così ~2 h/settimana ≈ 12, in
  piena zona di volume equilibrato, per vedere a colpo d'occhio se il cardio è bilanciato
  rispetto al lavoro coi pesi.
- «＋ Esercizio» chiede in quale giorno aggiungerlo (lo inserisce in quel giorno);
  «＋ Giorno» crea un nuovo giorno. Per riordinare si **trascina la riga dal manico ⠿**
  a sinistra del nome (solo dal manico: trascinando da tutta la riga non si potrebbe piu'
  selezionare il testo di una nota). Vale anche per il riscaldamento. Trascinare una riga
  sotto l'intestazione di un altro giorno le cambia anche il giorno: e' voluto, altrimenti
  al ridisegno riapparirebbe sotto la vecchia intestazione. La matematica degli indici sta
  in spostaRiga() in 06-allenamento.js, funzione pura e coperta dai test.
- «＋set» aggiunge set extra alla riga; «↧ Dalla scorsa» ricompila coi valori
  dell'ultima registrazione; il «▶» accanto all'esercizio apre il video dimostrativo.
- Per ogni riga l'app mostra al volo: 1RM stimato, %1RM, TL (carico della riga) e il
  «Δ TL set» (questo set vs il set di pari posizione della scorsa scheda).
- **Co-pilota LED passivo**: un pallino verde/giallo/rosso nella riga di servizio sotto il nome
  dell'esercizio valuta se il peso digitato è una progressione sensata, confrontandolo col set di pari posizione
  della scorsa scheda e coi segnali di affaticamento (ACWR, monotonia, RIR ultima volta).
  Soglie: 🟢 da −5% a +10%; 🟡 +10%…+20%, oppure calo oltre −5%, oppure aumento con RIR≤1
  alla scorsa, oppure monotonia alta; 🔴 oltre +20% (probabile errore/troppo) oppure aumento
  con ACWR>1.5 (meglio scaricare). Niente pallino se manca lo storico del set o per i test ★.
  È SOLO un suggerimento visivo (tooltip col motivo): non modifica né scrive nulla.
- «💾 Salva nello Storico» registra la settimana (anno + numero settimana ISO,
  proposti in automatico); se il Session-RPE è abilitato si registrano anche fatica
  (RPE 0-10) e durata in minuti per seduta. Un pallino/banner verde o rosso (qui, in Corpo e in cima al tab Profilo) avvisa se
  la settimana corrente non è ancora registrata.

## 5 · Progressi, Storico, Corpo (tab 📈 Progressi · 🜂 Corpo; archivi dal tab 👤 Profilo)

- **Progressi**: grafici piccoli e affiancati in una griglia compatta (fino a quattro per
  riga su schermo largo, uno per riga in una finestra stretta), divisi per argomento in
  quest'ordine: «Segnali» automatici (🎉 record al salvataggio, ⏸ esercizi in stallo con TL
  fermo da 3+ schede, ⚠ suggerimento deload se ACWR alto, ⚠ monotonia alta) · «Carico e
  volume» (TL totale con media mobile, ACWR con la zona sicura evidenziata, tonnellaggio,
  variazione % del TL) · «Carico interno · session-RPE» (se abilitato: carico interno sRPE,
  monotonia, strain, interno contro esterno) · «Forza e record»: a sinistra, grande, il
  «Progresso reale · a parità di esercizi» (tre linee a base 100 con i loro numeri sopra: TL
  totale grezzo coi salti, TL per serie a parità di esercizi, forza = 1RM stimato a parità di
  esercizi, la principale; la % al mese è la pendenza degli ultimi 3 mesi), a destra i record
  personali per esercizio (carico massimo) e sotto la progressione del singolo esercizio (1RM e
  peso max nel tempo; cliccando la card di un record il grafico passa a quell'esercizio) ·
  «Equilibrio e distribuzione» (ragnatela della distribuzione fra i gruppi con
  sotto la didascalia del riferimento e il pulsante ⚙ Riferimento, serie per gruppo,
  distribuzione delle intensità %1RM, TL per gruppo muscolare) · «Cardio · progressione per
  sport». Ogni grafico ha il suo «?» con la spiegazione. Sui grafici a linee (anche la Timeline
  dell'Analisi, il Corpo, il Cardio e gli Esercizi) passando col mouse in un punto qualsiasi del
  disegno una linea verticale segna la settimana più vicina e un riquadro dice data e valore di ogni
  linea; all'apertura, o quando i dati cambiano, le linee si disegnano da sinistra a destra (non nel
  Report né in stampa). Sulle barre il valore si legge passando sulla barra. I grafici hanno senso da 2-3 settimane salvate in poi. Accanto al Training Set
  ci sono i filtri **Periodo** (tutto, ultime 4 settimane, ultimi 3 o 6 mesi, ultimo anno, «Da… a…»)
  e **Alimentazione** (tutte le fasi, una fase con tutti i suoi periodi, un solo periodo), salvati
  nel profilo (dati_utente.progPer, progPerDa, progPerA, progAlim). Se le settimane scelte non sono
  di seguito (due Bulk separati da un Cut) i grafici nel tempo mostrano uno stacco fra due linee
  tratteggiate con scritto cosa manca, e le linee riprendono; ACWR e media mobile restano su tutta
  la storia, Segnali e Record pure; alla ripresa Δ TL e Progresso reale non confrontano con la
  settimana prima dello stacco. Dal v1.1.4 in cima c'è il
  selettore **«Dati da analizzare»**: «Tutto il percorso» oppure un singolo **Training Set**
  (patch al limite noto della confrontabilità del TL tra schede molto diverse — es. Palestra
  vs Casa). La scelta **si ricorda**: vive nel profilo (dati_utente.progSet, quindi in
  corpo.json) e viene riproposta al rientro; ogni profilo ha la SUA (cambiando profilo non
  si trascina quella del precedente); se il Training Set salvato non esiste piu' si torna
  da soli a «Tutto il percorso». Ogni settimana salvata porta il campo 'set' col Training Set attivo; le settimane
  salvate prima del v1.1.4 non ce l'hanno e compaiono solo in «Tutto il percorso». **Eccezione
  (dal v1.1.6)**: i «Record personali · carico massimo» NON seguono questo filtro — un record
  è un record, sempre calcolato su TUTTO lo storico indipendentemente dal Training Set attivo;
  quando un filtro è impostato compare la pill «su tutto il percorso» accanto al titolo per
  spiegarlo. Le barre «Serie per gruppo» sommano sulla barra Cardio anche i
  minuti di cardio registrati nel Riscaldamento (oltre a quelli del tab Cardio), min÷10 —
  vedi §4 per i dettagli su cosa NON tocca (TL/ACWR/monotonia restano intatti).
- **Storico** (pulsante «📜 Storico» in cima al tab Profilo): archivio completo delle registrazioni, in codici
  settimana ISO formato AAAASS (es. 202624 = settimana 24 del 2026).
- **Corpo**: peso e misure corporee con BMI e stime masse (anche Acqua %); lo storico misure
  è in un archivio dedicato (pulsante «📏 Misure» in cima al tab Profilo), con le colonne
  «Acqua %» e «N. pesate».
- **Pesate della bilancia** (riquadro «⚖ Pesate della bilancia» nel tab Corpo, visibile solo
  se ce ne sono): pesate di una bilancia Bluetooth arrivate col rientro dell'app del telefono
  (campo 'pesate' del rientro), salvate in corpo.json (DOC.pesate; gli id tolti a mano in
  DOC.pesate_scartate, così un rientro successivo non li riporta). Ogni pesata porta data, ora,
  peso e, se la bilancia ha misurato con le maniglie, la composizione già calcolata dal
  telefono (grasso %, acqua %, muscolo kg, ossa kg, proteine %, viscerale, metabolismo basale,
  età metabolica) più le impedenze grezze, che si conservano soltanto. All'import, per ogni
  settimana ISO con almeno una pesata NUOVA, la MEDIA va da sola nello Storico misure, senza
  «💾 Salva misure»: una pesata al giorno, la prima (la prima completa, se quel giorno ce n'è
  una con la composizione); BMI dall'altezza del profilo, fabbisogno = basale medio × livello
  di attività del profilo; la riga porta 'n_pesate'. Se la settimana ha già una misura scritta
  a mano (senza 'n_pesate') il TMS chiede una volta sola («Sostituisci» / «Tienili»). I campi
  del tab Corpo prendono i valori dell'ultima pesata, se è la più recente. Le pesate già
  arrivate (stesso id) non si doppiano. Il 🗑 su una pesata la toglie e ricalcola la media
  della sua settimana (una misura scritta a mano non viene mai toccata); Ctrl+Z la rimette.
- **Foto progressi** (in fondo al tab Corpo): foto datate del cliente (es. fronte/lato),
  salvate IN LOCALE in TMS_Dati/<profilo>/foto/ (mai caricate online), metadati (file/data/
  tag) in corpo.json. Due modalità: «▶ Riproduzione» (timelapse con cursore tipo lettore
  video, play/pausa; con la vista «tutti» ogni passo è una data con le viste affiancate, con
  una vista specifica una foto per volta) e «⚖ Confronto» (due date scelte da un calendario,
  vecchia sopra/recente sotto, con data e peso; «tutti» = viste affiancate). Filtro per vista
  (tag), gestione raggruppata per data. Il backup dati
  include solo i metadati; per portarsi dietro anche le immagini serve «Backup completo
  (con foto)» oppure copiare la cartella TMS_Dati (come per i video). Si può inserire un confronto prima/dopo anche nel Report.

## 6 · Alimentazione (tab 🍖 Alimentazione)

- Tre **fasi**: Bulk, Mantenimento, Cut. La fase attiva si sceglie con i **bottoni in
  cima al tab** (Bulk / Mantenimento / Cut): si vede SOLO quella, le altre restano
  salvate ma nascoste. (Prima la fase stava nel Profilo: ora è qui.)
- Pasti personalizzabili e **riordinabili per trascinamento**: si prende il manico «⠿»
  accanto al nome del pasto e lo si rilascia su un altro pasto (si porta dietro tutti i
  suoi alimenti); allo stesso modo si trascina un singolo alimento, anche in un altro
  pasto. «✎» rinomina, «🗑» elimina. In ogni pasto «＋ scegli alimento…» apre la banca
  dati: oltre 4500 alimenti dalla banca svizzera USAV e dalla tabella francese Ciqual
  2025 (ANSES), coi nomi in italiano, divisi in tre categorie selezionabili in cima al
  riquadro — **alimenti semplici** (come si comprano o crudi), **ricette** (cucinati,
  conditi o composti: anche il semplice «pollo cotto») e **💊 integratori** (proteine in
  polvere, coi valori dell'etichetta del prodotto). Valori per 100 g scalati sui
  grammi inseriti. Col «▸» si vedono tutti i micro e macro nutrienti.
- **👨‍🍳 Le mie ricette** (11c-ricette.js): quarta categoria del selettore (pulsante «👨‍🍳 Ricette»
  nella barra). Una ricetta ha nome, porzioni, tempi di preparazione e cottura, descrizione,
  procedimento, note e ingredienti (solo alimenti della banca dati, niente ricette dentro
  ricette). E' CONDIVISA fra i profili come il catalogo esercizi: DOC.ricette <-> TMS_Dati/ricette.json
  (lettura rigorosa, cache, Annulla, backup, scrittura in chiusura). Rinominata ricorda i
  vecchi nomi (alias): le righe degli altri profili passano al nome nuovo quando si aprono
  (migraRicetteProfilo, che porta nel catalogo anche ricette rimaste in alimentazione.json). I valori NON
  sono salvati: foodLookup li ricalcola a ogni lettura, per100 = somma(ingrediente per100 x
  grammi / 100) / peso finale x 100, col peso finale da cotto se indicato, altrimenti la somma
  dei grammi; un nutriente che nessun ingrediente riporta resta vuoto. Nel piano si usa per
  nome come un alimento; rinominandola, righe del piano e preferiti seguono; i periodi
  registrati ne tengono una copia (p.ricette) e restano una fotografia.
- **💡 Suggerimenti**: accanto ai nutrienti «obiettivo» sotto il riferimento (non ai limiti
  ne' all'energia), nel pannello «Fuori dai riferimenti» e nell'indice OMS/FAO. Apre i 20
  alimenti piu' ricchi per 100 g o per 100 kcal (con almeno 20 kcal); esclusi spezie, erbe e
  alghe secche, condimenti, lievito, te' in foglie, gomme, alimenti per l'infanzia; piatti e
  integratori su richiesta. «＋» aggiunge 100 g al pasto scelto della fase attiva.
- Nel selettore alimenti: la **ricerca è «a parole»** (digitando più parole le trova
  anche non contigue, in qualsiasi ordine). A ricerca vuota, in cima ci sono i
  **★ Preferiti** e i **🕐 Recenti** (alimenti già usati nel piano); la stellina ☆/★
  accanto a ogni alimento lo aggiunge/toglie dai preferiti.
- **Indice settimanale OMS/FAO**: confronta l'intake (piano × 7) coi riferimenti per
  adulto — grassi ≤30% dell'energia, saturi ≤10%, zuccheri ≤10% (ideale <5%), sale
  <5 g/giorno, carboidrati ~55%, proteine 0,83 g/kg, micronutrienti sui valori
  OMS/FAO. I nutrienti marcati «(max)» sono limiti da non superare. Limiti noti:
  usa gli zuccheri TOTALI come proxy degli zuccheri liberi; i grassi trans non sono
  nel dataset (soglia indicata ma non calcolata).
- **Stampa dieta**: bottone «🍽 Stampa dieta» in cima al tab — apre a schermo intero lo
  **stesso motore a blocchi** del Report (13-report.js: repCtx, repImpagina, buildReportUnits),
  applicato al piano della fase attiva: un blocco fisso «Intestazione» (titolo, fase, data), un
  blocco per ogni **pasto** presente (trascinabile, nascondibile, con le stesse impostazioni dei
  blocchi del Report — titolo, nuova pagina, testo, colore — e modificabile sul posto con
  doppio clic), un blocco fisso «Totale giornaliero» con le schede dei valori del giorno.
  L'ordine e le impostazioni si salvano per profilo **e per fase** (DOC.alimentazione.stampa);
  i ritocchi a mano solo per il documento aperto. «⬇ Scarica PDF (A4 orizzontale)» genera il
  PDF **A4 orizzontale** (297×210mm) con la stessa impaginazione dell'anteprima; «← Chiudi»
  torna al tab Alimentazione. Lo fa l'app, senza la stampa del browser.
- **Periodi**: il piano di una fase seguito per un certo tempo, che alimenta il tab Analisi.
  «▶ Avvia un periodo…» lo fa partire (oggi o da una data passata) e resta IN CORSO, senza
  data di fine, finché non si preme «⏹ Termina» nella sua riga; nei grafici arriva fino a
  oggi. Uno solo in corso alla volta (avviandone un altro, il precedente si chiude il giorno
  prima). La fotografia del piano si prende all'avvio e terminando si può aggiornare.
  «Registra il piano attuale come periodo…» registra invece un periodo con inizio e fine.

## 7 · Analisi (tab 📊 Analisi)

Incrocia dieta e allenamento nel tempo (servono periodi alimentari registrati). I grafici
stanno in tre sezioni, su una griglia compatta, con accanto il pannello dei periodi:
«Quadro nel tempo» (timeline dei periodi con carico allenante e peso sovrapposti, a tutta
riga) · «Dieta e peso» (variazione di peso contro bilancio calorico stimato; confronto tra
fasi del peso, boxplot) · «Carico e correlazioni» (confronto tra fasi del TL, boxplot;
correlazione con ritardo temporale, lag). Tutto ricalcolato al volo dai dati, niente da
configurare.

## 8 · Le due app: TMS (principale) e TMS Scheda (taccuino) — scambio scheda

CONCETTO CHIAVE da spiegare all'utente: il TMS desktop è l'**app principale** — il
centro di comando dove si CREA (scheda pesi, piano alimentare) e si ANALIZZA (storico,
grafici 1RM/TL/ACWR, misure, foto, report). L'app gratuita **«TMS Scheda»** per
smartphone è la sua **derivata**: un **taccuino digitale da palestra** che non crea
nulla — riceve scheda e dieta dal TMS, le mostra DURANTE l'allenamento (esercizi coi
video, grammi della dieta) e raccoglie le annotazioni sul momento (serie, peso, RIR,
note, fatica). Il flusso è un cerchio: il PC progetta → il telefono annota → i dati
tornano al PC e diventano storico e grafici.
Due modi d'uso: ① **coach + atleta** — il coach ha il TMS completo (un profilo per
cliente), l'atleta ha SOLO TMS Scheda sul telefono (niente PC, niente TMS); ② **atleta
autonomo** — la stessa persona usa entrambi: programma sul PC, annota col telefono,
reimporta su di sé (i passi sotto valgono identici, «cliente» = sé stessi).
TMS Scheda è un'app Android (APK) che il coach manda al cliente come file: si installa
toccandolo (fuori dal Play Store: va consentita l'installazione da quella fonte), funziona
offline e si aggiorna installando sopra l'APK nuovo. Solo Android: gli iPhone non installano
APK. La scheda viaggia come file via chat/email. Nessun server: i dati restano
nei dispositivi.
1. **Esporta** — tab «👤 Profilo», riga del cliente, bottone «📲 Esporta scheda»:
   nasce «Scheda_profilo_data.json» (tipo interno 'tms-scheda') con la scheda giorno
   per giorno, il previsto e — se il piano della fase attiva non è vuoto — anche la
   **dieta** (campo 'dieta': pasti, alimenti, grammi, kcal/macro precalcolati, perché
   il cliente non ha la banca alimenti). Un popup chiede il TIPO di scheda: FISSA
   (sola compilazione, come le versioni precedenti) o MODIFICABILE (il cliente può
   anche aggiungere/eliminare/modificare esercizi e segnare i test del massimale 1RM);
   la scelta è nel campo 'modificabile' del file (default false = fissa). Con la scheda
   modificabile il file porta anche il **catalogo del coach** (campo 'catalogo': nome +
   gruppo dei soli esercizi da pesi, ~750 voci, circa 38 KB): nell app del telefono
   (dalla v2.5) il nome di un esercizio aggiunto si cerca in quell elenco e al salvataggio
   viene RIFIUTATO se non c e' — nel TMS del coach si possono importare solo quelli,
   altrimenti arriverebbero senza muscoli né fattore. Si salva il nome esatto del catalogo
   (maiuscole comprese), perché è la chiave dei dati. Senza catalogo nel file (export
   di versioni precedenti) l app lascia il testo libero come prima. Alla domanda
   sui video: includendoli il cliente vede le esecuzioni offline nell'app ma il file pesa di più.
2. **Il cliente compila nell'app** — salva il file sul telefono e lo carica in TMS
   Scheda con «📂 Carica la scheda»: la scheda resta memorizzata nell'app (la ritrova
   a ogni apertura, con la **bozza salvata da sola** mentre compila; dalla v2.2 il
   **tasto indietro del telefono** risale nell'app invece di chiuderla — video/QR aperti,
   poi riepilogo → giorno → lista giorni → menu, solo da lì l'app si chiude davvero).
   L'app si apre su un **menu con tre sezioni**: «🏋 Scheda allenamento», «🍖 Alimentazione»
   (piano in sola lettura: pasti coi grammi in evidenza e kcal; se il file non contiene
   la dieta la sezione appare disattivata) e «📸 Foto progressi» (dalla v2.2: tre riquadri
   fronte/lato/retro, scatto da fotocamera o scelta da galleria; le foto vengono
   RIMPICCIOLITE — lato lungo 1280px, JPEG — prima di essere incorporate nel rientro).
   Nella scheda sceglie il **giorno** da un elenco; ogni giornata è una **seduta in tre
   fasi** (tab): 🔥 Riscaldamento (solo se presente nel Training Set: SOLA LETTURA con
   video, stretching o cardio a minuti, NON torna nel rientro), 🏋 Esercizi, ✅ Fine.
   Dalla v2.2 (richiesta esplicita dell'utente: «niente sotto-menù, troppi click») i campi
   di TUTTI gli esercizi della fase sono **già visibili insieme** nella lista — non c'è
   più una vista a schermo pieno da aprire; sotto ogni esercizio compare **«l'ultima
   volta»** (ultima prestazione dallo Storico, campo 'ultima' nel file). Una spunta ✔ e
   una barra di avanzamento segnano gli esercizi toccati. Inserisce ciò che ha fatto
   davvero (serie, ripetizioni, peso, RIR, note per esercizio). Nella fase Fine: se il
   profilo usa il Session-RPE (campo 'rpe' del file scheda) trova fatica 0-10 e durata;
   se NON lo usa, trova solo una **casella «Giorno completato»** (nel rientro diventa
   {giorno,fatto:true} dentro 'sedute'). Ogni esercizio ha un **timer di recupero**
   (bottone ⏱ che parte dal tempo di riposo della scheda, con pausa e +15/-15; disponibile
   in FISSA e MODIFICABILE). Se la scheda è MODIFICABILE il cliente può anche
   **aggiungere/eliminare/modificare** esercizi (rinomina, sposta di giorno, ritocca il
   previsto) e segnare i **test del massimale (★)**: aggiunte ed eliminazioni e il flag
   'test' tornano nel rientro (l'import ricostruisce la scheda Pesi dalle righe). NOTA:
   il campo **RIR parte sempre vuoto** (non eredita il valore del coach: si inserisce
   dopo l'allenamento; il previsto resta indicato sopra i campi). Guarda i ▶ video, e
   preme «📩 Crea il file per il coach» (prima vede un **riepilogo** di quanto ha
   segnato): nasce «Rientro_profilo_data.json» (formato 'tms-rientro', con in più il
   campo opzionale 'foto': [{tag,data,img}] se ha scattato foto) da rimandare al coach.
   Dalla v2.6 un menu **«Dove salvo il rientro?»** lascia scegliere, mostrando solo le
   strade che quel dispositivo supporta davvero: «Invia o salva con…» (condivisione del
   telefono: WhatsApp, email, Drive, «Salva in File» su iPhone), «Scegli la cartella…»
   (dove il browser lo permette, di solito Chrome su PC: si decidono cartella e nome) e
   «Salva nei Download» (sempre presente). Il tasto indietro del telefono chiude il menu.
   Il **riscaldamento** viaggia nella scheda (campo 'riscaldamento') ma è solo informativo:
   NON entra nel rientro e non conta in alcun calcolo.
3. **Importa** — riga del cliente, «🔄 Importa rientro»: si sceglie il file e l'allenamento
   del cliente viene **caricato nella scheda 🏋 Pesi** (NON scritto subito nello Storico);
   se il cliente non usa il Session-RPE, i giorni con 'fatto:true' vengono contati e mostrati
   nell'avviso come «giorni segnati come completati». Le eventuali **foto** ('foto' nel
   rientro) vengono decodificate e salvate come file veri in TMS_Dati/<profilo>/foto/ +
   metadati in DOC.foto (stesso formato delle foto aggiunte a mano dal tab Corpo — tag
   fronte/lato/retro), tramite 'importaFotoRientro'. Il coach rivede la scheda Pesi,
   eventualmente corregge, poi preme «💾 Salva nello Storico» scegliendo la settimana: solo
   allora entra nello Storico (con sedute e RPE) e alimenta TL/ACWR/grafici. Questo dà al
   coach un controllo manuale prima del salvataggio. Le eventuali **pesate della bilancia**
   ('pesate' nel rientro) invece vanno da sole nello Storico misure (media per settimana,
   vedi la voce «Pesate della bilancia» nella sezione dei tab), tramite 'importaPesate'. Un
   rientro può portare anche SOLO le pesate (righe vuote): allora la scheda Pesi non si tocca
   e si apre il tab Corpo. La scheda esportata porta 'corpo' (altezza, sesso, età): servono al
   telefono per calcolare la composizione dalla bilancia.
Controlli all'import: file non valido → errore chiaro; profilo diverso da quello
della riga → richiesta conferma; esercizi fuori catalogo → avviso con elenco;
scheda Pesi non vuota → conferma prima di sostituirla con i dati del cliente.

## 9 · Esercizi e video (tab 📖 Esercizi)

- Catalogo di 883 esercizi per gruppo muscolare e sottocategoria (tendine chiuse di
  default, click per aprirle). «＋ Nuovo» aggiunge un esercizio personalizzato; «✎»
  modifica. L'editor (exEdit in 12-esercizi.js) ha questi vincoli:
  - **Gruppo** e **Tipo** da elenco (Tipo: Multi-articolare, Isolamento, Stretching,
    Pliometria, Cardio, Accessorio; un valore non standard già presente resta selezionabile).
    Il tipo conta: Spinta/Trazione include solo chi inizia per «multi».
  - **Muscoli** dai 17 nomi del catalogo con chip a tre stati (clic: primario -> secondario
    -> nessuno). Serve almeno un primario, altrimenti non salva e lo dice nel modulo.
    Il campo target NON si scrive più a mano: è derivato dai muscoli («Pettorali, Spalle,
    Tricipiti», primari poi secondari).
  - **Fattore TL** fra 0 e 2 (il catalogo va da 0 a 1,05); fuori limite non salva.
  - **Sottocategoria** libera ma con le esistenti proposte mentre si digita (datalist).
  - **Il salvataggio AGGIORNA l'oggetto invece di sostituirlo**: i campi che il modulo non
    mostra (istruzioni, livello, attrezzatura, categoria, id) restano com'erano. Fino alla
    v1.1.13 compresa, aprire un esercizio e premere Salva senza toccare nulla li cancellava
    tutti e sette — muscoli inclusi, quindi l'esercizio spariva dal conteggio del volume.
  - **⧉ Duplica** (nel pannello ✎): apre l'editor in modalità nuovo su una copia integrale
    dell'esercizio (muscoli, istruzioni, video), col nome «… (copia)»; l'originale resta
    intatto. Per creare un esercizio quasi uguale a uno esistente si parte da qui.
  - Gli esercizi creati dall'app portano il campo custom = true. Elimina chiede conferma in stile app.
- **Video**: ogni esercizio ha un video dimostrativo integrato. ATTENZIONE, limite
  noto: nelle versioni attuali la maggior parte dei video integrati è un segnaposto
  identico (882 su 883) — verranno sostituiti progressivamente con le registrazioni
  reali. Dal pannello «✎» si possono caricare **video personali** che sostituiscono
  quelli integrati (toggle «Video personali»; fallback automatico al video integrato
  se il personale manca).

## 10 · Report (tab 🖨 Report)

- **Sezioni personalizzabili**: nell'elenco «Blocchi» la casella decide QUALI blocchi
  entrano nel report (Profilo & corpo, Foto progressi, Riepilogo, Scheda, Andamento,
  Progressione, Record, Cardio, Alimentazione, Dieta × allenamento, Note del coach); il
  trascinamento o le frecce ▲▼ ne decidono l'ORDINE. La scelta si salva per profilo e vale sia
  per il PDF sia per il report digitale. Obiettivo, note del coach e foto prima/dopo si
  scrivono nel riquadro «Documento».
- **Foto prima/dopo nel report**: se ci sono foto (tab Corpo), due selettori nel riquadro «Documento» («📸 Foto prima» e «Dopo»)
  scelgono la foto «Prima» e «Dopo»; con la sezione «Foto progressi» attiva entrano nel report
  (incorporate, quindi funzionano anche offline nel PDF e nel digitale).
- **PDF A4**: bottone «⬇ Scarica PDF (A4)» — l'app impagina e genera il PDF da sola
  (download diretto, senza passare dalla stampa del browser).
- **Pagina a due colonne**: a sinistra l'anteprima in fogli A4 veri (stessa impaginazione del
  PDF: quello che si vede è il PDF), a destra gli strumenti (documento, elenco dei blocchi,
  impostazioni del blocco scelto, elemento scelto).
- **Blocchi**: copertina e piè di pagina fissi, le sezioni in mezzo si trascinano nell'elenco o dal
  manico ⠿ nei fogli. Impostazioni per blocco, salvate per profilo: titolo, mostra titolo,
  mostra spiegazione, inizia su pagina nuova, tutto nella stessa pagina (se è più alto di un
  foglio viene diviso comunque), testo piccolo/normale/grande, colore del titolo, grafici
  affiancati o uno sotto l'altro.
- **Elementi e testi**: un clic su un elemento nel foglio (schede, grafico, tabella, testo) lo
  sceglie: «▲ Su», «▼ Giù», «✕ Togli elemento». Doppio clic o «✎ Modifica testo» rende il blocco
  scrivibile nel foglio, con «＋ Riga sopra/sotto» e «✕ Togli riga» per le tabelle. Questi
  ritocchi valgono solo per il documento aperto (non toccano i dati salvati); «↺ Rifai dai dati»
  riporta il blocco ai dati aggiornati.
- **Report digitale**: pagina HTML per smartphone con i video incorporati, da inviare
  all'atleta. Include anche la sezione «Dieta × allenamento» se ci sono periodi.
- Tra le sezioni del report c'è anche **«Cardio · attività e carico interno»** (sedute,
  carico sRPE totale, ore, sport principale, andamento del carico e ultime attività), attivabile
  e riordinabile come le altre.

## 11 · Formule e concetti (per spiegarli all'utente)

- **1RM stimato**: formula di Epley per default — peso × (1 + ripetizioni/30);
  selezionabili anche Brzycki, Lombardi o la media delle tre (parametri del profilo).
- **RIR** (Repetitions In Reserve): ripetizioni che l'utente avrebbe ancora in canna.
  Se «RIR nei calcoli» è attivo, 1RM/%1RM/TL diventano effort-aware (le ripetizioni
  effettive considerate = fatte + RIR).
- **%1RM**: intensità della serie rispetto al massimale stimato.
- **Esercizi a corpo libero** (dal 2026-08-19): per trazioni e dip il carico vero non è
  il numero scritto nella colonna Peso, ma PESO DEL CORPO + quel numero (che vale come
  ZAVORRA: 0 = a corpo libero, 15 = con 15 kg appesi). Vale per %1RM, TL e tonnellaggio.
  I kg MOSTRATI invece sono sempre la zavorra, mai il totale (regola di Marco, 2026-09-29;
  funzione pesoMostrato = il peso scritto): colonna 1RM, card dei Record personali, elenco
  record del Report, serie «Peso max» del grafico di progressione e avviso «Nuovo record»
  al salvataggio. Il record è la zavorra massima; a parità vince chi ha più ripetizioni;
  per il corpo libero conta anche la zavorra 0 («0 kg ×11»). Classificare sul totale faceva
  cambiare il record col peso corporeo: prendere 2 kg produceva un «primato» senza sollevare di più.
  ATTENZIONE al 1RM, che si comporta diversamente (scelta di Marco): per questi esercizi
  la colonna 1RM mostra la ZAVORRA MASSIMA stimata, non il carico totale — cioè quanto
  potresti appenderti per una singola ripetizione («trazioni con +25 kg»), che è il modo
  in cui se ne parla in palestra e il numero su cui si programma. Tecnicamente il CALCOLO
  resta sul carico reale (funzione sRM, sistema completo corpo + zavorra): la sottrazione
  del peso corporeo avviene solo al momento di mostrarlo (funzione rmMostrato), come
  informazione visiva. Non può risultare negativa. La %1RM invece resta calcolata sul carico TOTALE, perché
  indica l intensità della serie e quindi la fascia di allenamento: calcolarla sulla sola
  zavorra la falserebbe (6 ripetizioni finirebbero in "metabolico" invece che in
  "forza+ipertrofia"). Prima una serie di trazioni pulite valeva TL zero, cioè "non allenamento".
  Il peso del corpo arriva dalle misure del tab Corpo: per una riga dello STORICO si usa
  quello DELL EPOCA (misura della stessa settimana, o la più vicina precedente), non
  quello di oggi; in mancanza di misure si usa il peso in anagrafica. Nello storico resta
  salvata la sola zavorra: il corpo si somma al volo, come tutti i valori derivati.
  CRITERIO: entra solo chi solleva il 100% del proprio peso, cioè il corpo è interamente
  sospeso (o in appoggio sulle sole braccia) e viene mosso in verticale. L elenco è
  ESPLICITO (costante CORPO_LIBERO, 16 voci), frutto di una cernita su tutti i 111
  esercizi a peso corporeo del catalogo: 11 trazioni da appeso (alla sbarra, con peso,
  presa supina, presa mista, da lato a lato, a un braccio, dietro il collo presa larga,
  con maniglia a V, Rocky pull-up, scapular pull-up, gorilla chin/crunch), 4 dip (alle
  parallele nelle 3 versioni e agli anelli) e la salita alla corda.
  NON sono inclusi, benché di nome simile:
  · al cavo o a macchina: "Pull-up corda al cavo basso", "Dip alla macchina";
  · assistiti: "Trazioni Assistite con Elastico" (lì semmai l aiuto andrebbe sottratto);
  · a carico PARZIALE: "Dip alla panca" e "Bench dip con peso" (~50%), piegamenti (~65%),
    squat a corpo libero (~70%), "Rematore a corpo libero alla sbarra", "Tricipiti al
    corpo libero alla sbarra";
  · da appeso ma che sollevano le sole gambe senza quota assegnata: "Pike da appeso",
    "Wind sprint".
  Dip alla panca, piegamenti e squat a corpo libero restano SENZA quota: se l utente lo
  chiede, spiega che vanno compilati come prima.
- **Quote parziali: i leg raise** (dal 2026-09-14). La funzione quotaCorpo(nome) in
  01-costanti.js restituisce la frazione di peso corporeo che l esercizio fa sollevare:
  1 per i 16 dell elenco CORPO_LIBERO, 0 per tutto il resto, e per i leg raise la MASSA
  DELLE DUE GAMBE secondo le tabelle di segmentazione di de Leva (1996): 0,40 se il
  profilo e' uomo, 0,42 se donna (coscia 14,2 % + gamba 4,3 % + piede 1,4 % per lato
  nell uomo, un po' di piu' nella donna). NON e' meta' corpo: e' meno. A ginocchia
  piegate la massa e' la stessa ma il braccio di leva scende a circa il 60 %, e siccome
  il modello ragiona in kg e non in momento la quota e' ridotta a 0,25.
  Classificazione fatta leggendo le istruzioni, non il nome:
  · gambe TESE (0,40 / 0,42): "Leg raise da appeso", "Leg raise da sdraiato su panca
    piana", "Sollevamento ginocchia/anche alle parallele" (nonostante il nome, le
    istruzioni dicono "solleva le gambe tenendole distese");
  · ginocchia PIEGATE (0,25): i tre "Leg pull-in" (le istruzioni dicono "piega le
    ginocchia"), "Sollevamento delle anche a ginocchia piegate".
  "Dragon Flag" resta fuori: ruota sulle spalle anche il tronco, non sono solo gambe.
  Il carico effettivo e' zavorra + peso corporeo x quota (caricoEff, tramite corpoNelCarico);
  vale per %1RM, TL e record; il 1RM mostrato toglie solo la quota di corpo (rmMostrato),
  cosi' si legge la zavorra massima alle caviglie. Nella scheda la pillola dice
  "🧍 +28 kg (40%)": quanto corpo entra davvero e in che proporzione. E' un
  APPROSSIMAZIONE dichiarata (gambe medie, leva media), accettata da Marco.
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
- **Progresso reale a parità di esercizi** (Progressi, «Forza e record»): risponde a «il TL
  è sceso perché ho cambiato scheda o perché sono peggiorato?». Ogni settimana salvata si
  confronta con la precedente solo sugli esercizi presenti in tutte e due; per ognuno il
  rapporto del 1RM stimato (indice di forza) o del TL per serie (indice del TL); il passo è
  la media geometrica dei rapporti pesata sul TL medio dell'esercizio; l'indice (base 100) è
  il prodotto dei passi. Con meno di 3 esercizi in comune o meno di metà del TL in comune è
  un cambio scheda: il passo si salta e l'indice riparte da lì. Un esercizio che cambia oltre
  ×1,2 o ÷1,2 in una settimana non conta per quel passo (altra macchina, errore). Le pause
  contano. La % al mese è la pendenza dei minimi quadrati sul logaritmo dell'indice nelle
  ultime 13 settimane. Calcolato al volo, non salvato; segue il filtro Training Set.
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
- **Diagnostica**: 5 click ravvicinati sulla scritta «TMS» in alto a sinistra aprono
  il log errori interno, utile da copiare in una segnalazione.

## 13 · Domande tipiche → dove si fa

- «Nuovo cliente/atleta» → Profilo → ＋ Nuovo profilo.
- «Vedere a colpo d'occhio quali clienti sono a rischio / non aggiornano» → Profilo: il
  semaforo accanto al nome di ogni profilo (verde/giallo/rosso) con ACWR, settimane
  dall'ultimo aggiornamento e PR recenti sotto al nome.
- «Cambiare formula 1RM, RIR, session-RPE» → Profilo → tendina del profilo → ✎
  Modifica parametri.
- «Cambiare la fase alimentare (Bulk/Mant/Cut)» → Alimentazione → bottoni in cima al tab.
- «Mandare la scheda a un cliente» → Profilo → riga del cliente → 📲 Esporta scheda.
- «Registrare ciò che il cliente ha fatto» → Profilo → riga del cliente → 🔄 Importa
  rientro (file Rientro_*.json che il cliente rimanda).
- «Salvare l'allenamento della settimana» → Pesi → 💾 Salva nello Storico.
- «Registrare una corsa / un'attività cardio» → Cardio → ＋ Aggiungi attività (data, tipo,
  durata, RPE; FC media facoltativa per il TRIMP).
- «Correggere un dato sbagliato» → nella scheda corrente si corregge direttamente; per una
  settimana già salvata si apre lo Storico e si usa la matita ✎ sulla riga sbagliata (serie,
  ripetizioni, peso, RIR, ★). Per rifare tutta la settimana: cestino rosso nella sua barra,
  poi si risalva.
- «Vedere i progressi / il rischio di sovraccarico» → Progressi (record, TL, ACWR).
- «Impostare la dieta» → Alimentazione (fase attiva scelta coi bottoni in cima al tab);
  per le analisi nel tempo registrare i Periodi.
- «Backup prima di formattare il PC» → Profilo → ⭳ Backup completo (con foto), così
  le foto progressi non restano indietro (il semplice ⭳ Backup dati porta solo i
  riferimenti); al ripristino ⭱ Ripristina.
- «Aggiungere un esercizio che manca» → Esercizi → ＋ Nuovo.
- «Stampare la scheda da consegnare» → Report → PDF (impostazioni di stampa sopra).
`;

/* testo completo con intestazione di versione (usato dal download e dal tool) */
function guidaAITesto(){
  return '# Training Monitor System (TMS) — documentazione per assistenti AI\n\n'+
    '_Versione app: '+APP_VERSION+' ('+APP_DATE+'). File generato dall\'app (tab Guida) — '+
    'la copia online vive nel repo: docs/guida-ai.md. Caricalo nella chat di un assistente AI '+
    'per farti aiutare a usare il TMS._\n'+GUIDA_AI_CORPO;
}

function scaricaGuidaAI(){
  try{
    const blob=new Blob([guidaAITesto()],{type:'text/markdown;charset=utf-8'});
    const u=URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=u; a.download='TMS-guida-AI-v'+APP_VERSION+'.md';
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ try{URL.revokeObjectURL(u);}catch(e){} a.remove(); },800);
    avviso(t('✔ Scaricato')+' '+a.download+'.\n'+t('Caricalo nella chat di un assistente AI (ChatGPT, Claude, Gemini…) e fagli le tue domande sul TMS.'));
  }catch(e){ avviso(t('Errore nel download:')+' '+e.message); logErrore('guidaAI', e); }
}
