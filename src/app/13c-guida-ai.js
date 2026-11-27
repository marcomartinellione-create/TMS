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
  la Guida interna dell'app (tab «Guida», versioni Rapida e Completa) o una
  segnalazione col pulsante in Impostazioni (vedi sotto).
- **Barra della finestra** (app per PC su Windows): la barra di sistema è nascosta e la barra scura in alto
  dell'app ne fa le veci (si trascina, doppio clic = ingrandisci); i pulsanti di Windows restano veri ma
  prendono il colore della barra in ogni tema (titleBarOverlay di Electron; colori dalla pagina con
  window.tmsFinestra, ultimi colori in userData/barra.json). Le finestre si aprono sotto la barra. La
  percentuale del download di un aggiornamento compare nella barra.
- **Impostazioni** (ingranaggio in alto a destra, in un blocco di tre comandi uguali con la
  lingua EN/IT e il pulsante luna/sole): impostazioni generali dell'app, valide su quel computer per
  tutti i profili (stanno nel localStorage, non nei dati del profilo). Dentro ci sono anche
  **Guida** e **Segnala** (sezione «Aiuto»). Oggi le impostazioni contengono l'aspetto: tema giorno o notte e lo stile della notte fra Notte calda
  (pergamena e brace, predefinito), Grafite (grigio neutro) e Blu notte (blu ardesia), ognuno con
  la sua anteprima; la scelta si applica subito. Il pulsante/della barra passa da giorno a
  notte e di notte usa lo stile scelto.
- **Pulsante Segnala** (in Impostazioni, sezione «Aiuto», accanto a Guida): apre un modulo per
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
  ravvicinati sul simbolo accanto al titolo aprono il quaderno di lavoro di Marco.
  Due elenchi separati: le sue note scritte a mano (salvate in TMS_Dati/taccuino.json,
  quindi funzionano offline) e le issue aperte del repo, lette da GitHub SOLO su
  richiesta e in sola lettura. Lo stato delle issue si cambia su GitHub, non nell app:
  un elenco che rispecchia e basta non può divergere dalla realtà. L ultima lettura
  resta salvata, così la lista si vede anche senza rete. Da ogni nota si può aprire la
  issue GitHub già compilata. Se un utente qualunque chiede del taccuino, spiega che è
  uno strumento dell autore e indirizzalo al pulsante Segnala.
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
stili (Notte calda, Grafite, Blu notte) da scegliere in Impostazioni.
Sito: https://marcomartinellione-create.github.io/TMS/ · Tutorial: canale YouTube
@TrainingMonitorSystem.

## 2 · Installazione, aggiornamenti, dove stanno i dati

- Si scarica «TMS-Setup-versione.exe» dalle Release GitHub (~90 MB, catalogo e video
  inclusi). L'eseguibile non è firmato: al primo avvio Windows SmartScreen può
  avvisare — «Ulteriori informazioni → Esegui comunque». È normale e atteso.
- **Aggiornamenti**: all'avvio l'app controlla le Release GitHub; se c'è una versione più nuova
  CHIEDE, mostrando le novità. Confermando scarica in background (percentuale nel titolo della
  finestra), controlla che l'installatore sia integro e propone di riavviare per installarla
  (altrimenti si installa da sola alla chiusura). Senza internet il controllo tace.
- **Dati**: in locale, nella cartella utente di Windows (percorso tipico
  «%APPDATA%\\Training Monitor System\\TMS»). Sopravvivono ad aggiornamenti e
  reinstallazioni. Niente account, niente telemetria.
- L'app esiste anche come singolo file HTML apribile in Chrome/Edge collegando una
  cartella dati (File System Access). Firefox e Safari NON sono supportati. Gli
  archivi della modalità browser e di quella desktop sono separati.

## 3 · Profili (tab Profilo)

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
  «Attiva», «Modifica parametri», «Rinomina», «Elimina» (quest'ultimo solo se
  esiste più di un profilo).
- In fondo alla pagina: «Backup (tutti i profili insieme)» con «Backup» e «Ripristina».
  **Backup** = un solo file TMS-backup-AAAA-MM-GG.tmsb con TUTTO quello che c'è nella cartella dei dati,
  copiato così com'è (anche un file che il TMS non conosce): ogni file di ogni profilo (scheda, storico,
  corpo, alimentazione, copie delle migrazioni) con le foto, profili.json, esercizi.json (catalogo),
  ricette.json, taccuino.json, i video personali (TMS_Dati/video), le cartelle rimaste fuori dall'elenco,
  le impostazioni (tema, stile della notte, lingua, video personali sì/no). È un archivio ZIP senza
  compressione come il .tms: tms.json (formato «tms-backup», versione, app, data, profili, conteggi),
  libreria/, profili/<slug>/, profili/<slug>/foto/, video/, orfani/<slug>/, impostazioni.json. Dopo averlo
  costruito il TMS lo rilegge (controllo CRC di ogni file). Password facoltativa (almeno 6 caratteri):
  tutto cifrato AES-GCM 256 con chiave PBKDF2-SHA256 (310.000 iterazioni), e SOLO in quel caso dentro c'è
  anche telefono.json (collegamenti dei telefoni e codice di recupero): ripristinato su un PC nuovo, i
  telefoni restano collegati. Senza password i collegamenti non entrano (servirà il codice di recupero).
  **Ripristina** apre un .tmsb (o un vecchio backup .json) e mostra data, profili, foto, video personali,
  profili fuori elenco, collegamenti sì/no e versione; poi «Ripristina tutto» (prima una copia di
  sicurezza completa fra i backup ripristinabili, poi i profili di adesso vanno nel cestino dei profili
  _eliminati/, poi si riscrivono file, foto, video, catalogo, ricette, taccuino e impostazioni; se la
  lingua del backup è diversa va riaperto il TMS) oppure «Riprendi solo un cliente…» (si sceglie quale;
  entra come un file .tms: gli altri profili non si toccano, se c'è già si sceglie nuovo o sostituisci).
  Nell'app per PC un .tmsb si apre anche col doppio clic e porta alla stessa scelta (l'installer registra
  l'estensione con la sua icona, electron/build/tmsb.ico: il foglio del .tms con altri due fogli dietro).
  Sotto, il pulsante **Backup automatici** (si apre e mostra le copie): l'app fa da sola un backup
  completo .tmsb a settimana (cartella «backup_automatici» dentro i dati) con link «ripristina» accanto
  a ciascuno. Si tengono le ultime 5 copie settimanali più la più vecchia di ogni mese (la prima copia di
  quel mese fra quelle presenti) per gli ultimi 12 mesi, quello in corso compreso; quelle tenute solo come
  copia del mese hanno l'etichetta «mensile». Non si fanno copie in più: si sceglie solo quali tenere. Le
  copie di sicurezza «prima del ripristino» hanno la loro regola (le ultime 3).
- **Profili fuori elenco**: se nella cartella dei dati c'è una cartella con i file di un profilo
  (scheda/storico/corpo/alimentazione.json) che profili.json non elenca, il tab Profilo lo segnala col
  nome del cliente: «Rimettili in elenco» oppure «Mettili nel cestino» (cestino dei profili).
- **Copia dei backup fuori dal PC** (⚙ Impostazioni › Copia dei backup, solo nell'app per PC): si sceglie
  una cartella col selettore di Windows (dentro OneDrive, Google Drive, MEGA o una chiavetta; non la
  cartella dei dati né un disco intero) e ogni settimana ci va il backup completo
  (TMS-backup-AAAA-MM-GG.tmsb; si tengono con la stessa regola dei backup automatici, le ultime 5 più la
  prima di ogni mese per 12 mesi, e i vecchi TMS-backup-AAAA-MM-GG.json contano come le altre; gli altri
  file della cartella non si toccano); «Copia adesso» la fa subito. La copia non è cifrata. Se la
  cartella non si raggiunge lo dice e riprova al prossimo avvio. Si riprende con Ripristina scegliendo il
  file. Finché non è scelta una cartella, nel tab Profilo una riga lo ricorda con «Scegli una cartella…».
  Se l'ultima copia riuscita ha più di 14 giorni (o, se non ne è mai riuscita una, sono passati 14 giorni
  da quando è stata scelta la cartella), nel tab Profilo una riga dice da quando non riesce, con la data
  e il motivo se è noto (per esempio «il TMS non trova più la cartella scelta»), e ha i pulsanti
  «Copia adesso» e «Scegli un'altra cartella…»; sparisce appena una copia riesce. Il percorso lo tiene il processo principale
  (ponte tmsScambio di electron/main.js, scritture chiuse in quella cartella, solo .json e .tmsb).
- **Versione dell'app**: ⚙ Impostazioni › Informazioni.
- **File .tms (un cliente in un file)**, tab Profilo: su ogni profilo «Esporta» (file «Nome.tms») e
  «Archivia» (esporta e poi, chiesto se il file è salvato, toglie il profilo dalla lista: la cartella va nel
  cestino dei profili); accanto a «Nuovo profilo» c'è «Importa cliente»; nell'app per PC si apre anche col
  doppio clic (l'installer registra l'estensione con la sua icona, electron/build/tms.ico: un foglio pergamena con la
  stella del TMS; una sola istanza del TMS: col TMS aperto il file va a quello).
  Il file è un archivio ZIP senza compressione: tms.json (formato «tms-cliente», versione, profilo, nomi degli
  esercizi personalizzati), dati/scheda.json, storico.json, corpo.json, alimentazione.json, le foto come
  immagini in foto/, catalogo/ricette.json con le ricette che usa, catalogo/esercizi.json con i suoi
  ESERCIZI PERSONALIZZATI (quelli che usa e che non ci sono nel catalogo dell'installazione o sono diversi:
  creati o cambiati dal personal; quelli dell'installazione chi riceve li ha già) e i loro video personali in
  video/. All'arrivo gli esercizi che mancano si aggiungono; se uno ha lo stesso nome ma è diverso si sceglie
  «Tieni i miei» o «Usa quelli del file» (il catalogo è unico per tutti i clienti); un video che c'è già non si
  sovrascrive, salvo «Usa quelli del file». Password facoltativa (almeno 6 caratteri): tutto il contenuto
  cifrato AES-GCM 256 con chiave PBKDF2-SHA256 (310.000 iterazioni); senza la password non si apre e non si
  recupera. All'importazione, se il profilo esiste già si sceglie «Aggiungilo come nuovo» (nome con
  «(importato)») o «Sostituisci» (prima una copia di sicurezza fra i backup ripristinabili, il vecchio nel
  cestino). I codici del telefono
  collegato non viaggiano: sul PC che riceve il cliente si ricollega col QR.
- **Correggere una riga già salvata**: nello **Storico** (tab Profilo, in cima alla pagina) ogni riga
  ha a destra una **matita**: apre un riquadro dove si cambiano serie, ripetizioni, peso,
  RIR e il segno di test, oppure si elimina quella riga soltanto. Esercizio e settimana non
  si cambiano da lì. 1RM, %1RM e TL si ricalcolano da soli.
- **Annulla / rifai**: Ctrl+Z annulla l'ultima modifica ai dati del profilo aperto (scheda, Storico,
  misure, cardio, alimentazione, catalogo esercizi) e Ctrl+Y (o Ctrl+Maiusc+Z) la rifà; un avviso in
  basso dice cosa è tornato indietro. Vale finché non si cambia profilo; le foto ne restano fuori.
  Dentro una finestra aperta o in un campo di ricerca Ctrl+Z annulla solo il testo scritto.
- **Eliminare una settimana già salvata**: nello **Storico** (tab Profilo, in cima alla pagina) ogni
  settimana ha la sua barra scura con, a destra, un pulsante **cestino rosso** che toglie tutte
  le righe di QUELLA settimana. Stesso pulsante su ogni rilevazione dello storico **Misure**.
  In entrambi i casi viene chiesta conferma con un riquadro dell'app (non la finestra di
  sistema) e l'operazione è definitiva. Si può togliere qualunque settimana, anche una in
  mezzo allo storico: non solo l'ultima.

- Per ogni profilo i file sono: scheda.json, storico.json, corpo.json (anagrafica, misure,
  cardio, foto, pesate della bilancia, recupero dal bracciale), alimentazione.json. I valori derivati (1RM, TL, ACWR…) NON vengono mai salvati:
  si ricalcolano al volo dai dati grezzi.

## 4 · Pesi (tab Pesi)

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
  ricerca vuota, in cima ci sono i **Preferiti** e i **Recenti** (gli esercizi usati di
  recente); la stellina accanto a ogni esercizio lo aggiunge/toglie dai preferiti.
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
- **Come sta venendo la scheda** (pannello accanto alla scheda dei Pesi; il vecchio pulsante
  «Bilanciamento» non c'è più): radar delle SERIE per gruppo muscolare della scheda che si sta scrivendo — non dell'ultima settimana
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
    FILTRI di contesto. Tutto si regola dal pulsante «Riferimento» sotto la ragnatela
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
  cambio. Il selettore è un menù a tendina disegnato dall'app (pulsante + riquadro, non un
  select di sistema; lo stesso menù serve «Dati da analizzare» nei Progressi): casella di ricerca
  per nome, i set con la spunta su quello aperto e il tipo di allenamento accanto, e in fondo,
  separate, le azioni: «Nuovo Training Set…» (chiede il nome, se partire da zero o copiare un set
  esistente e il gruppo, facoltativo), «Gestisci i gruppi…», «Rinomina», «Elimina» (solo se resta
  almeno un altro set). Da tastiera: freccia giù sul pulsante apre, frecce su/giù scorrono, Invio
  sceglie (con una ricerca scritta, il primo set trovato), Esc chiude; si chiude anche cliccando
  fuori. Dati: campo 'setAttivo' (nome attivo),
  'setsSalvati' (mappa nome→scheda dei set inattivi), 'setsOrdine' in scheda.json; le
  schede preesistenti diventano da sole il set «Base» al primo avvio dopo l'aggiornamento.
  Ogni Training Set ha anche il suo **tipo di allenamento** ('tipoAllenamento': forza,
  ipertrofia, powerlifting, resistenza, potenza, generale), scelto dal menù «Tipo di
  allenamento» accanto: viaggia col set nei cambi e nelle copie, e sceglie il riferimento
  della ragnatela insieme all'esperienza dell'anagrafica.
  **Gruppi di Training Set** (novembre 2026): etichette scelte dall'utente (es. «Palestra»,
  «Corpo libero») SOLO per ordinare, filtrare e cercare i set: nessun calcolo le legge (1RM, TL,
  volumi, riferimenti della ragnatela, Progressi, Analisi danno gli stessi numeri con e senza).
  Dati in scheda.json: campo facoltativo 'gruppo' dentro ogni set (nella radice per il set aperto,
  in setsSalvati[nome] per gli altri; viaggia col set nei cambi e nelle copie) e 'setsGruppi'
  (elenco ordinato dei gruppi, anche vuoti; c'è solo se esiste almeno un gruppo, quindi una scheda
  che non li usa resta identica). Un set senza gruppo sta in «Senza gruppo». Il menù Training Set ›
  «Gestisci i gruppi…» apre il riquadro «Training Set e gruppi»: ricerca per nome (parole, senza
  badare a maiuscole e accenti, in tutti i gruppi o in quello scelto), filtro per gruppo, set divisi
  per gruppo col loro tipo di allenamento, un menù su ogni riga per mettere il set in un gruppo
  (anche nuovo), «Nuovo gruppo», «Rinomina», «Togli il gruppo» (con conferma: i set restano e
  passano a «Senza gruppo»); un clic sul nome apre il set. Il riquadro «Nuovo Training Set» ha il
  campo Gruppo (propone quello scelto nel menù o quello del set copiato). Con almeno un gruppo il
  menù Training Set divide i set per gruppo e ha in cima i bottoni dei gruppi (Tutti, i gruppi col
  numero di set, Senza gruppo; un gruppo vuoto non compare): uno acceso mostra solo i suoi set e la
  ricerca cerca lì dentro; sul pulsante, accanto al set aperto, c'è il suo gruppo. Il filtro non si
  salva: riparte da «Tutti» all'avvio e per ogni profilo. Al telefono non va nulla dei gruppi (riceve solo la scheda del set aperto).

- **Riscaldamento** (dal v1.1.3, video+cardio dal v1.1.6): pulsante arancione accanto a
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

## 4-bis · Cardio (tab Cardio)

Le attività cardio (corsa, bici, nuoto, ellittica, vogatore, salto della corda…) non hanno
serie/ripetizioni/peso: si misurano col **carico interno**. Ogni seduta si registra con
«＋ Aggiungi attività»: data, **sport** (scelto da un elenco; con «Altro…» se ne aggiungono),
durata (min), fatica RPE (0–10) e, secondo lo sport, distanza, dislivello D+ e FC media.
**Lo sport scelto decide quali dati hanno senso**: per la corsa appaiono distanza, passo e
dislivello; per la bici distanza e velocità; per HIIT/salto corda niente distanza. L'app calcola:
- **sRPE (Foster)** = RPE × durata in minuti → unità arbitrarie (AU). Sempre disponibile.
- **TRIMP (Banister)** dalla **frequenza cardiaca** media: compare solo se inserisci la FC
  media. Per renderlo più preciso, in **Profilo → Modifica parametri** puoi impostare la
  **FC a riposo** e la **FC max** (se non le imposti, FC riposo = 60 bpm e FC max stimata
  dall'età con Tanaka 208 − 0,7×età). La tabella mostra anche il totale sRPE della settimana.

Due modi per registrare una seduta:
- **Semplice** (manuale): «＋ Aggiungi attività» — scrivi durata e RPE (FC media/max e distanza
  facoltative). Sempre possibile, senza attrezzatura.
- **Avanzato** (da dispositivo): «Importa attività» — carichi un file **.FIT, .TCX o .GPX**
  esportato da orologio/fascia (Garmin Connect, Polar Flow, Coros, Strava, app per Apple Watch…):
  l'app legge durata, FC media, FC max, distanza e **dislivello D+** e apre il modulo già
  compilato (resta solo da aggiungere la fatica RPE). Il **.FIT** è il formato binario nativo
  Garmin (dal messaggio «session»); .TCX/.GPX sono XML. Tutto in locale, offline, nessun account.
- **Dalla sezione Cardio del telefono** (automatico): nell'app del cliente, sezione «Cardio», si sceglie
  lo sport, «Avvia registrazione», poi «Fine» (chiede solo la fatica) e si salva una seduta (sport, minuti, RPE, FC media, picco e la traccia
  del battito ogni 5 s) che arriva da sola attraverso l'hub e diventa una voce del tab Cardio con
  la nota «registrata col telefono»: il TRIMP si calcola dalla FC media, il picco va in «picco in
  questa seduta». Accanto alla FC media c'è un pulsante che apre il modulo della seduta col
  **grafico del battito** (minuti in basso, la FC media tratteggiata). La stessa seduta arrivata
  due volte non si duplica; una seduta tolta a mano non torna.
- **Progressione per sport** (tab Progressi): in fondo c'è «Cardio · progressione per sport»
  con un selettore; per lo sport scelto mostra l'andamento nel tempo di sRPE, FC media e — dove
  ha senso — distanza, passo (min/km, più basso = meglio) o velocità, dislivello. Così vedi se
  in una specifica attività (es. la corsa) stai migliorando passo/distanza o calando di FC.
- Il cardio compare anche nelle barre **«Serie per gruppo»** (Progressi) come barra
  dedicata: i minuti diventano «serie-equivalenti» (min÷10), così ~2 h/settimana ≈ 12, in
  piena zona di volume equilibrato, per vedere a colpo d'occhio se il cardio è bilanciato
  rispetto al lavoro coi pesi.
- «＋ Esercizio» chiede in quale giorno aggiungerlo (lo inserisce in quel giorno);
  «＋ Giorno» crea un nuovo giorno (il primo numero libero dopo l'ultimo). Se i giorni non
  partono da 1 o hanno buchi, un avviso propone «Rinumera da 1»: 1, 2, 3… nello stesso ordine,
  col riscaldamento e la fatica delle sedute (legati al nome del giorno); il telefono collegato
  riceve i nomi nuovi da solo. Per riordinare si **trascina la riga dal manico ⠿**
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
  Soglie: verde da −5% a +10%; giallo +10%…+20%, oppure calo oltre −5%, oppure aumento con RIR≤1
  alla scorsa, oppure monotonia alta; rosso oltre +20% (probabile errore/troppo) oppure aumento
  con ACWR>1.5 (meglio scaricare). Niente pallino se manca lo storico del set o per i test.
  È SOLO un suggerimento visivo (tooltip col motivo): non modifica né scrive nulla.
- «Salva nello Storico» registra la settimana (anno + numero settimana ISO,
  proposti in automatico); se il Session-RPE è abilitato si registrano anche fatica
  (RPE 0-10) e durata in minuti per seduta. Un pallino/banner verde o rosso (qui, in Corpo e in cima al tab Profilo) avvisa se
  la settimana corrente non è ancora registrata.

## 5 · Progressi, Storico, Corpo (tab Progressi · Corpo; archivi dal tab Profilo)

- **Progressi**: grafici piccoli e affiancati in una griglia compatta (fino a quattro per
  riga su schermo largo, uno per riga in una finestra stretta), divisi per argomento in
  quest'ordine: «Segnali» automatici (record al salvataggio, esercizi in stallo con TL
  fermo da 3+ schede, suggerimento deload se ACWR alto, monotonia alta) · «Carico e
  volume» (TL totale con media mobile, ACWR con la zona sicura evidenziata, tonnellaggio,
  variazione % del TL) · «Carico interno · session-RPE» (se abilitato: carico interno sRPE,
  monotonia, strain, interno contro esterno) · «Forza e record»: a sinistra, grande, il
  «Progresso reale · a parità di esercizi» (tre linee a base 100 con i loro numeri sopra: TL
  totale grezzo coi salti, TL per serie a parità di esercizi, forza = 1RM stimato a parità di
  esercizi, la principale; la % al mese è la pendenza degli ultimi 3 mesi), a destra i record
  personali per esercizio (carico massimo) e sotto la progressione del singolo esercizio (1RM e
  peso max nel tempo; cliccando la card di un record il grafico passa a quell'esercizio) ·
  «Equilibrio e distribuzione» (ragnatela della distribuzione fra i gruppi con
  sotto la didascalia del riferimento e il pulsante Riferimento, serie per gruppo,
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
  salvate prima del v1.1.4 non ce l'hanno e compaiono solo in «Tutto il percorso». Il menù di
  «Dati da analizzare» ha in cima «Tutto il percorso», poi i set con le settimane salvate di ognuno e
  la ricerca; con i gruppi di Training Set i set sono divisi per gruppo e i bottoni dei gruppi
  restringono l'elenco (un set che c'è solo nello Storico sta in «Senza gruppo»), non i dati. **Eccezione
  (dal v1.1.6)**: i «Record personali · carico massimo» NON seguono questo filtro — un record
  è un record, sempre calcolato su TUTTO lo storico indipendentemente dal Training Set attivo;
  quando un filtro è impostato compare la pill «su tutto il percorso» accanto al titolo per
  spiegarlo. Le barre «Serie per gruppo» sommano sulla barra Cardio anche i
  minuti di cardio registrati nel Riscaldamento (oltre a quelli del tab Cardio), min÷10 —
  vedi §4 per i dettagli su cosa NON tocca (TL/ACWR/monotonia restano intatti).
- **Storico** (pulsante «Storico» in cima al tab Profilo): archivio completo delle registrazioni, in codici
  settimana ISO formato AAAASS (es. 202624 = settimana 24 del 2026).
- **Corpo**: peso e misure corporee con BMI e stime masse (anche Acqua %); lo storico misure
  è in un archivio dedicato (pulsante «Misure» in cima al tab Profilo), con le colonne
  «Acqua %» e «N. pesate».
- **Pesate della bilancia** (riquadro «Pesate della bilancia» nel tab Corpo, visibile solo
  se ce ne sono): pesate di una bilancia Bluetooth arrivate da sole dall'app del telefono
  collegata, salvate in corpo.json (DOC.pesate; gli id tolti a mano in DOC.pesate_scartate,
  così se arrivano di nuovo non tornano). Ogni pesata porta data, ora,
  peso e, se la bilancia ha misurato con le maniglie, la composizione già calcolata dal
  telefono (grasso %, acqua %, muscolo kg, ossa kg, proteine %, viscerale, metabolismo basale,
  età metabolica) più le impedenze grezze, che si conservano soltanto. All'import, per ogni
  settimana ISO con almeno una pesata NUOVA, la MEDIA va da sola nello Storico misure, senza
  «Salva misure»: una pesata al giorno, la prima (la prima completa, se quel giorno ce n'è
  una con la composizione); BMI dall'altezza del profilo, fabbisogno = basale medio × livello
  di attività del profilo; la riga porta 'n_pesate'. Se la settimana ha già una misura scritta
  a mano (senza 'n_pesate') il TMS chiede una volta sola («Sostituisci» / «Tienili»). I campi
  del tab Corpo prendono i valori dell'ultima pesata, se è la più recente. Le pesate già
  arrivate (stesso id) non si doppiano. Il su una pesata la toglie e ricalcola la media
  della sua settimana (una misura scritta a mano non viene mai toccata); Ctrl+Z la rimette.
  Il su ogni pesata (e «Rapporto dell'ultima» nel titolo del riquadro) apre il RAPPORTO DI
  COMPOSIZIONE CORPOREA: una pagina A4 (anteprima + «Scarica PDF», file
  Composizione_<nome>_<data>.pdf, fatto come il PDF del Report). Contiene: figura del corpo
  (disegno del TMS: sagoma maschile o femminile secondo il sesso del profilo, sfumata, con pochi
  dettagli leggeri e gli 8 elettrodi, e otto valori collegati da linee: peso,
  BMI, grasso, viscerale, acqua, massa muscolare, muscolo scheletrico, ossa), tabella della
  composizione in kg e % del peso con la differenza dalla pesata precedente, BMI e grasso su
  fasce (BMI dell'OMS; grasso di Gallagher e coll. 2000 per sesso ed età), tipo di corpo (BMI ×
  grasso), altri indicatori (viscerale, metabolismo basale, fabbisogno = basale × livello di
  attività, sottocutaneo, età metabolica, battito), andamento di peso e grasso, misure grezze
  della bilancia (tronco + 4 arti a 20 e 100 kHz) e le ultime medie settimanali dello Storico
  misure. Massa magra, acqua, proteine, muscolo scheletrico e sottocutaneo si ricavano dal
  grasso come fa FitDays. NON ci sono (calcoli interni di FitDays non pubblici): punteggio,
  intervalli «standard» con valutazioni, peso obiettivo, valori per singolo braccio o gamba, WHR.
- **Recupero** (tab Corpo, interruttore «Misure | Recupero» in cima alla colonna di destra; la
  scelta si ricorda per profilo, e il titolo della colonna diventa «Sonno e recupero»): sonno e
  dati del giorno che il bracciale del cliente calcola da sé e manda attraverso l'app del telefono
  collegata. Salvati in corpo.json come DOC.recupero = {notti, giorni}: una notte per giorno del
  risveglio (inizio, fine, fasi in minuti dall'inizio: leggero, profondo, REM, sveglio; punteggio
  0-100 del bracciale; facoltativi sonnellini, SpO2, respirazione, HRV della notte) e un riassunto
  per giorno (passi, battito a riposo, HRV RMSSD e SDNN, SpO2 media e minima, stress medio e
  massimo 0-100 di Zepp, temperatura della pelle in gradi, respirazione, PAI, batteria); se arriva
  di nuovo lo stesso giorno, la voce nuova prende il posto della vecchia. Senza dati c'è una riga
  sola. Con i dati: sette riquadri dell'ultimo giorno (HRV, battito a riposo, SpO2 della notte,
  temperatura della pelle come scarto dal solito, respirazione, stress, passi con la media di 7
  giorni), l'ultima notte (orari, ore dormite = profondo + leggero + REM, punteggio, ipnogramma
  con le quattro fasi nel tempo, minuti e % per fase, sonnellini), il sonno per fase a barre,
  l'andamento di HRV e battito a riposo con la fascia «il suo solito» e la media della settimana
  (ISO) accanto a peso e massa grassa dello Storico misure. Periodo dei grafici: ultimi 30 giorni
  (predefinito) o 7. «Il suo solito» = media ± 1,5 deviazioni standard dei valori dei 30 giorni
  PRIMA dell'ultimo dato (quel giorno escluso; almeno 7 valori, altrimenti non si dice); un valore
  fuori fascia si scrive in arancio con lo scarto. Ore dormite, medie, fasce e scarti si
  ricalcolano al volo e NON si salvano. Il TMS NON calcola un punteggio di prontezza o di recupero
  suo: mostra i valori del bracciale e gli scarti dal solito di quel cliente.
- **Foto progressi** (in fondo al tab Corpo): foto datate del cliente (es. fronte/lato),
  salvate IN LOCALE in TMS_Dati/<profilo>/foto/ (mai caricate online), metadati (file/data/
  tag) in corpo.json. Due modalità: «▶ Riproduzione» (timelapse con cursore tipo lettore
  video, play/pausa; con la vista «tutti» ogni passo è una data con le viste affiancate, con
  una vista specifica una foto per volta) e «Confronto» (due date scelte da un calendario,
  vecchia sopra/recente sotto, con data e peso; «tutti» = viste affiancate). Filtro per vista
  (tag), gestione raggruppata per data. Le immagini entrano nel Backup (.tmsb) e nel file .tms del cliente. Si può inserire un confronto prima/dopo anche nel Report.

## 6 · Alimentazione (tab Alimentazione)

- Tre **fasi**: Bulk, Mantenimento, Cut. La fase attiva si sceglie con i **bottoni in
  cima al tab** (Bulk / Mantenimento / Cut): si vede SOLO quella, le altre restano
  salvate ma nascoste. (Prima la fase stava nel Profilo: ora è qui.)
- Pasti personalizzabili e **riordinabili per trascinamento**: si prende il manico «⠿»
  accanto al nome del pasto e lo si rilascia su un altro pasto (si porta dietro tutti i
  suoi alimenti); allo stesso modo si trascina un singolo alimento, anche in un altro
  pasto. «matita» rinomina, «cestino» elimina. In ogni pasto «＋ scegli alimento…» apre la banca
  dati: oltre 4500 alimenti dalla banca svizzera USAV e dalla tabella francese Ciqual
  2025 (ANSES), coi nomi in italiano, divisi in tre categorie selezionabili in cima al
  riquadro — **alimenti semplici** (come si comprano o crudi), **ricette** (cucinati,
  conditi o composti: anche il semplice «pollo cotto») e **integratori** (proteine in
  polvere, coi valori dell'etichetta del prodotto). Valori per 100 g scalati sui
  grammi inseriti. Col «▸» si vedono tutti i micro e macro nutrienti.
- **Le mie ricette** (11c-ricette.js): quarta categoria del selettore (pulsante «Ricette»
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
- **Suggerimenti**: accanto ai nutrienti «obiettivo» sotto il riferimento (non ai limiti
  ne' all'energia), nel pannello «Fuori dai riferimenti» e nell'indice OMS/FAO. Apre i 20
  alimenti piu' ricchi per 100 g o per 100 kcal (con almeno 20 kcal); esclusi spezie, erbe e
  alghe secche, condimenti, lievito, te' in foglie, gomme, alimenti per l'infanzia; piatti e
  integratori su richiesta. «＋» aggiunge 100 g al pasto scelto della fase attiva.
- Nel selettore alimenti: la **ricerca è «a parole»** (digitando più parole le trova
  anche non contigue, in qualsiasi ordine). A ricerca vuota, in cima ci sono i
  **Preferiti** e i **Recenti** (alimenti già usati nel piano); la stellina
  accanto a ogni alimento lo aggiunge/toglie dai preferiti.
- **Indice settimanale OMS/FAO**: confronta l'intake (piano × 7) coi riferimenti per
  adulto — grassi ≤30% dell'energia, saturi ≤10%, zuccheri ≤10% (ideale <5%), sale
  <5 g/giorno, carboidrati ~55%, proteine 0,83 g/kg, micronutrienti sui valori
  OMS/FAO. I nutrienti marcati «(max)» sono limiti da non superare. Limiti noti:
  usa gli zuccheri TOTALI come proxy degli zuccheri liberi; i grassi trans non sono
  nel dataset (soglia indicata ma non calcolata).
- **Stampa dieta**: bottone «Stampa dieta» in cima al tab — apre a schermo intero lo
  **stesso motore a blocchi** del Report (13-report.js: repCtx, repImpagina, buildReportUnits),
  applicato al piano della fase attiva: un blocco fisso «Intestazione» (titolo, fase, data), un
  blocco per ogni **pasto** presente (trascinabile, nascondibile, con le stesse impostazioni dei
  blocchi del Report — titolo, nuova pagina, testo, colore — e modificabile sul posto con
  doppio clic), un blocco fisso «Totale giornaliero» con le schede dei valori del giorno.
  L'ordine e le impostazioni si salvano per profilo **e per fase** (DOC.alimentazione.stampa);
  i ritocchi a mano solo per il documento aperto. «Scarica PDF (A4 orizzontale)» genera il
  PDF **A4 orizzontale** (297×210mm) con la stessa impaginazione dell'anteprima; «← Chiudi»
  torna al tab Alimentazione. Lo fa l'app, senza la stampa del browser.
- **Dieta seguita** (pannello laterale, col telefono collegato o se ci sono giorni): calendario del mese,
  in sola lettura, dei giorni che il cliente segna ogni sera su TMS Scheda (verde sì, rosso no), con
  i conteggi e la percentuale rispettata; arriva dall'hub (telDietaApplica).
- **Periodi**: il piano di una fase seguito per un certo tempo, che alimenta il tab Analisi (dove
  c'è anche «Dieta seguita e peso», che non ha bisogno dei periodi: vedi il tab Analisi).
  «▶ Avvia un periodo…» lo fa partire (oggi o da una data passata) e resta IN CORSO, senza
  data di fine, finché non si preme «Termina» nella sua riga; nei grafici arriva fino a
  oggi. Uno solo in corso alla volta (avviandone un altro, il precedente si chiude il giorno
  prima). La fotografia del piano si prende all'avvio e terminando si può aggiornare.
  «Registra il piano attuale come periodo…» registra invece un periodo con inizio e fine.

## 7 · Analisi (tab Analisi)

«DIETA SEGUITA E PESO» (non servono i periodi; compare se ci sono giorni di dieta segnati dal cliente sul
telefono): ultime 12 settimane, il peso (una pesata al giorno, o la misura settimanale dello Storico misure)
con sotto un quadratino per giorno (verde dieta seguita, rosso no, chiaro non segnato), la percentuale di
ogni settimana e il confronto: variazione media del peso nella settimana dopo, per le settimane con la
dieta seguita (almeno l'80 % dei giorni segnati) e per le altre.
Il resto incrocia dieta e allenamento nel tempo (servono periodi alimentari registrati). I grafici
stanno in tre sezioni, su una griglia compatta, con accanto il pannello dei periodi:
«Quadro nel tempo» (timeline dei periodi con carico allenante e peso sovrapposti, a tutta
riga) · «Dieta e peso» (variazione di peso contro bilancio calorico stimato; confronto tra
fasi del peso, boxplot) · «Carico e correlazioni» (confronto tra fasi del TL, boxplot;
correlazione con ritardo temporale, lag). Tutto ricalcolato al volo dai dati, niente da
configurare.

## 8 · Le due app: TMS (principale) e TMS Scheda (taccuino) — la scheda collegata

CONCETTO CHIAVE da spiegare all'utente: il TMS desktop è l'**app principale** — il
centro di comando dove si CREA (scheda pesi, piano alimentare) e si ANALIZZA (storico,
grafici 1RM/TL/ACWR, misure, foto, report). **«TMS Scheda»** è l'app Android (APK) per il
telefono: un **taccuino digitale da palestra** che mostra scheda e dieta DURANTE l'allenamento
(esercizi coi video, grammi della dieta), raccoglie le annotazioni sul momento (serie, peso,
RIR, note, fatica), pesa con una bilancia Bluetooth e scatta le foto dei progressi. Il flusso
è un cerchio: il PC progetta → il telefono annota → tutto torna al PC DA SOLO e diventa
storico e grafici. Dal 17/11/2026 (richiesta dell'utente: «togliamo importa esporta scheda /
rientro») NON ci sono più file Scheda_….json / Rientro_….json da passare a mano: niente
«Esporta scheda», «Importa rientro», «Carica la scheda», «Crea il file per il coach» né
«Manda solo le pesate». Un telefono per profilo.
TMS Scheda si installa la prima volta toccando il file APK, scaricato dalle Release GitHub
(https://github.com/marcomartinellione-create/TMS/releases, allegato TMS-Scheda-x.y.z.apk)
oppure passato dal coach via WhatsApp, email o cavo; fuori dal Play Store va consentita
l'installazione da quella fonte. Dopo, gli aggiornamenti li trova da solo su GitHub, anche
senza collegamento (vedi sotto). Solo Android.

**COLLEGAMENTO** (TMS sul PC: modulo 15c-telefono.js; telefono: blocco «SCHEDA COLLEGATA» della
PWA): ci sono due ruoli, il PERSONAL (usa il TMS sul PC) e il CLIENTE (usa l'APK). Ogni personal ha
uno o più clienti (un profilo per cliente nel TMS), ogni cliente ha un solo personal; il personal
può essere anche cliente di se stesso (un suo profilo collegato al suo telefono). PC e app si
parlano attraverso l'HUB DEL TMS, un piccolo servizio su internet (Cloudflare): è uno smistamento,
non un archivio. Lo storico vero resta sul PC del personal (si salva ogni settimana con «💾 Salva
nello Storico»); sull'hub resta solo l'ultima versione di ogni file di scambio; pesate e foto sono
scaricate dal PC e cancellate dall'hub subito dopo il salvataggio, quelle mai ritirate scadono dopo
30 giorni (il telefono le tiene e le rimanda finché il PC non conferma).
Sul PC, in Impostazioni › Telefono collegato: (1) una volta sola «Attiva» con un CODICE D'INVITO
dato da chi gestisce l'hub: il TMS diventa personal e mostra il CODICE DI RECUPERO (24 caratteri)
da conservare; con quello, su un PC nuovo, si scrive nel campo «Codice di recupero» e si preme
«Recupera»: i collegamenti dei profili tornano senza ricollegare i clienti, con la settimana e
l'ultima scheda unita riprese dall'hub (i dati vanno portati prima con Backup e Ripristina; se il backup ha la password, i collegamenti tornano già con quello); (2) per ogni profilo
cliente «Collega un telefono» crea il CODICE DI QUEL CLIENTE (20 caratteri, a gruppi di 4) da
scrivere una volta sul suo telefono. Pulsanti: Copia; «Nuovo codice» (il vecchio telefono smette di
funzionare finché non si scrive il nuovo; settimana e dati restano); «Stacca» (scollega: l'hub
cancella i file di quel cliente); «QR» mostra il codice come QR (contenuto «TMS:» + il codice). Sul
telefono: «Impostazioni» → «Inquadra il QR» (lettore di codici di Android, BarcodeDetector;
il collegamento parte da solo) oppure si scrive il codice dato dal proprio personal → «Collega».
TUTTI I CLIENTI: oltre al profilo aperto, il PC controlla a turno (ogni 90 secondi uno) i telefoni dei
profili non aperti e salva pesate, foto, giorni della dieta e sedute della fascia cardio direttamente nei loro file (corpo.json,
alimentazione.json, foto/), senza aprirli: i valori dello Storico misure scritti a mano restano, un file
illeggibile non si riscrive, e se nel frattempo si cambia profilo non si conferma niente (i file restano
sull'hub e arrivano al giro dopo). La scheda di un cliente non aperto si unisce quando si apre il suo
profilo. In Impostazioni › Telefono collegato c'è la panoramica dei clienti collegati (ultimo dal
telefono, cosa è arrivato, «Apri»). Tutto quello che passa dall'hub è CIFRATO con AES-GCM, con
la chiave ricavata (HKDF-SHA256) dal codice di quel singolo cliente; dallo stesso codice nascono
anche l'id del collegamento e il gettone d'accesso all'hub, che ne tiene solo l'impronta. L'hub
vede solo file illeggibili, non vede mai codici né chiavi, e non ci sono nomi in chiaro; un file
illeggibile si salta e si riprova al giro dopo. Chiudendo il TMS con una modifica non ancora mandata,
la finestra fa l'ultimo giro con l'hub (al massimo 10 secondi) e poi si chiude. Il PC controlla l'hub ogni 20
secondi a TMS aperto e a profilo del cliente attivo (e 2 secondi dopo ogni modifica della scheda),
il telefono ogni minuto ad app aperta (e pochi secondi dopo ogni modifica). Senza collegamento il
telefono non riceve la scheda (nel browser la PWA mostra solo il benvenuto).

**SCHEDA COLLEGATA** (richiesta dell'utente: «le modifiche di uno modificano l'altra e solo a Salva
si cristallizza»): la scheda settimanale del tab Pesi e quella del telefono sono la stessa,
modificabile dalle due parti (serie, ripetizioni, peso, RIR, note, recupero, test, esercizi
aggiunti, tolti, rinominati o spostati di giorno, fatica e durata delle sedute). Ogni riga ha un id
stabile (campo uid, anche nella scheda Pesi; il ＋set ne fa uno nuovo) e ogni campo l'ora
dell'ultima modifica; a ogni giro ognuno data i campi cambiati da sé rispetto all'ultima scheda
unita, legge il file dell'altro e unisce campo per campo: VINCE L'ORA PIÙ RECENTE (una riga tolta
lascia un segno per un mese). Mentre si scrive in un campo l'unione aspetta il giro dopo. Le righe
del PC senza esercizio (giorno appena aggiunto) restano solo sul PC. La prima volta il telefono
prende la scheda del PC (se aveva una scheda caricata da file in una versione vecchia, chiede una
volta se sostituirla). «Salva nello Storico» CRISTALLIZZA: la settimana va nello Storico come
sempre (la finestra dice quando è arrivato l'ultimo aggiornamento dal telefono), il numero della
settimana sale, fatica, durata e spunte si azzerano anche sul telefono; la scheda resta
collegata e fa da base alla settimana dopo. Dieta (pasti, grammi, kcal e macro già calcolati: il
telefono non ha la banca alimenti), riscaldamento, «l'ultima volta», catalogo degli esercizi,
altezza/età/sesso per la bilancia, FC max e FC a riposo per le zone della fascia cardio e video vanno SOLO dal PC al telefono.

**SUL TELEFONO** l'app si apre su un menu: «Allenamento» (palestra e cardio), «Alimentazione» (piano in
sola lettura, grammi in evidenza; dall'ora dei promemoria, predefinita 21:00, in cima chiede «Oggi hai
seguito la dieta?» Sì/No, e prima di quell'ora chiede di ieri se è rimasto in sospeso; in fondo il CALENDARIO
DELLA DIETA del mese, verde sì, rosso no; toccando un giorno compare la matita e sotto la modifica con
«Seguita», «Non seguita» e, se è già segnato, «Togli la scelta»; ogni cambio va al PC
come le pesate, un file cifrato 'tms-dieta' sull'hub, e il PC lo salva in alimentazione.json
(DOC.alimentazione.aderenza: data → {v:'si'|'no'|'', t}, vince il cambio più recente) e lo toglie; nel menu la riga Alimentazione ricorda «segna la dieta di oggi»), «Foto progressi» (fronte/lato/retro, galleria oppure FOTOCAMERA DELL'APP con la
SAGOMA della vista: riquadro 3:4, testa sulla riga in alto al 30%, metà coscia su quella in basso al
78%, inquadratura ricavata dai selfie allo specchio dell'utente ma disegno generico; a richiesta la
foto di prima in trasparenza e l'autoscatto da 3 o 10 s; si salva esattamente il riquadro visto;
senza permesso della fotocamera si ripiega su quella del telefono; col tasto a quattro frecce su una foto fatta, e da
sola per quelle della galleria, si SPOSTA E RITAGLIA sulla sagoma (dito, due dita o barra; si parte
sempre dall'originale; se la foto era già arrivata al PC la nuova porta «sostituisce» e lì prende
il posto della vecchia, il file vecchio resta su disco); rimpicciolite a 1280 px JPEG), «Bilancia», «Cardio» (dentro «Allenamento», vedi sotto) e «Impostazioni» (collegamento col TMS, promemoria e fascia cardio, solo nell'APK; lingua IT/EN e i QR del sito, sempre: nella barra in alto non ci sono più, resta solo il battito). Il tasto indietro
del telefono risale nell'app (video/QR, giorno → lista giorni → menu; solo dal menu l'app si
chiude). Nella scheda si sceglie il **giorno**: aprendolo l'app CHIEDE «Inizio la seduta di oggi?» con «Inizia» e
«Solo guardare». «Inizia» avvia la seduta (inizio salvato sul telefono, resiste a un'app chiusa; uscire e rientrare
non la fa ripartire; una seduta aperta alla volta); «Solo guardare» lascia consultare la scheda senza seduta, per
quel giorno di calendario non lo richiede, e nella zona in alto resta «Inizia la seduta». Se una seduta è già aperta
non chiede niente; un giorno già chiuso in settimana non chiede, c'è «Nuova seduta». Una seduta avviata per sbaglio
si toglie con «annulla seduta» (sotto il tempo, distinto da «Fine seduta»), che chiede conferma e non salva NIENTE:
né durata, né fatica, né battito (la traccia si butta). SEDUTA ATTIVA ANCHE CON L'APP CHIUSA (solo nell'APK): con
una seduta coi pesi o una registrazione Cardio aperta gira un servizio in primo piano Android (notifica fissa con
battito e tempo, un tocco riapre l'app) che tiene un suo collegamento con la fascia o il bracciale (profilo
standard 0x180D) e conserva i battiti con l'ora anche quando Android ferma la pagina a schermo spento; quando la
pagina torna attiva (o prima della «Fine») li prende e riempie solo i tratti di 5 secondi rimasti vuoti, così la
traccia non ha buchi né doppioni. Il servizio parte con «Inizia» o «Avvia registrazione» e si ferma a «Fine» o
«Annulla». La prima volta l'app chiede, spiegandolo, di non ottimizzare la batteria per lei (una volta sola).
FINESTRA MOBILE (Picture-in-Picture, come YouTube): con una seduta o una registrazione aperta, uscendo dall'app col
tasto Home o col gesto, l'app diventa una piccola finestra con battito (colore della zona), esercizio in corso o
sport, recupero in corso e tempo della seduta; senza seduta aperta l'app si chiude come sempre, e sui telefoni senza
PiP resta la notifica. Sulle pagine dei giorni la barra in alto ha una seconda riga,
la ZONA DELLA SEDUTA: battito della fascia cardio colorato per zona (o «nessuna fascia» col tasto per collegarla),
tempo trascorso, «Fine seduta». «Fine seduta» compila da sola la durata e chiede la fatica RPE (1-10) nei campi di
fine giornata (senza Session-RPE spunta «Giorno completato»). Con la fascia collegata il battito della seduta si
registra da solo e alla chiusura va al PC (file 'tms-seduta-fc': FC media, picco, traccia ogni 5 s, dispositivo,
giorno e settimana); mentre una seduta coi pesi è aperta la sezione «Cardio» non avvia una registrazione a
parte, e con una registrazione cardio in corso la seduta coi pesi non parte. Seduta DIMENTICATA: dopo 3 ore senza attività (campi, timer, giorno aperto) l'app avvisa (anche al menu) e
propone di chiuderla con la durata fino all'ultima attività, oppure «È ancora in corso». Sul PC il battito della
seduta va nella scheda della settimana (DOC.scheda.fcSedute, per giorno: si vede nel tab Pesi accanto a RPE e
minuti, col grafico); «Salva nello Storico» lo sposta in DOC.storico_fc con il codice della settimana (si vede
sulla riga della settimana nello Storico; eliminando la settimana se ne va). NON entra nel tab Cardio né in TL,
ACWR, monotonia o sRPE. Un battito arrivato dopo il salvataggio della sua settimana va su quella settimana salvata;
quello di un cliente non aperto aspetta sull'hub che si apra il profilo. Ogni giornata è una **seduta in tre fasi** (tab):
Riscaldamento (solo se presente nel Training Set: SOLA LETTURA con video, stretching o cardio a
minuti), Esercizi, Fine. I campi di TUTTI gli esercizi sono **già visibili insieme**; i campi
SONO la scheda (RIR e note compresi, come la tabella del PC); sotto ogni esercizio compare
**«l'ultima volta»** (ultima prestazione dallo Storico). Una spunta e una barra di avanzamento
segnano gli esercizi toccati in settimana. Nella fase Fine: se il profilo usa il Session-RPE trova
fatica 0-10 e durata; se NON lo usa, solo una **casella «Giorno completato»**. Ogni esercizio ha un
**timer di recupero** (bottone che parte dal riposo della scheda, con pausa e +15/-15; conta dall'ora di
fine, quindi è giusto anche con l'app in secondo piano; nell'APK, se intanto il recupero finisce, arriva
la notifica «Recupero finito» al secondo giusto: sveglia esatta, permesso USE_EXACT_ALARM). Si
possono **aggiungere/eliminare/modificare** esercizi (il nome si sceglie dal catalogo del coach:
nel TMS si possono usare solo quelli; si salva il nome esatto) e segnare i **test del massimale
(stella)**.
**BILANCIA** (solo nell'APK, serve il Bluetooth): bilance a 8 elettrodi della famiglia
FitDays/iComon (Healthkeep FG2001B-A, Fitdays FG2202WB…). La bilancia manda solo peso e 10
impedenze (tronco, braccia, gambe a 20 e 100 kHz); la composizione la calcola l'app con la formula
WLA25 ricostruita da openScale (riscritta da zero), usando altezza, età e sesso che arrivano dal
PC. Grasso e muscolo per singolo braccio o gamba NON si calcolano (FitDays usa un algoritmo non
pubblico). Confrontata con un rapporto reale di FitDays, tutti i valori dopo il grasso seguono le
stesse derivazioni della WLA25, ma il grasso di FitDays era più alto di circa un punto: per quel
modello FitDays usa un'altra formula del grasso. Sotto l'ultima pesata c'è l'ANDAMENTO DEL PESO, come nei grafici di
borsa: una pesata al giorno (la prima, come nella media), variazione dal giorno prima in kg e %,
grafico ad area per 7 giorni, 1 mese, 3 mesi o tutto, una striscia di sfumature (una per variazione,
più carica se più grande) e la variazione del periodo; verde quando il peso va nella direzione della
fase del piano (cut: giù; bulk: su; mant o nessuna fase: su, come in borsa), rosso quando va contro;
nella lista ogni pesata che conta ha la sua variazione. La pesata si salva sul telefono (una lista per
profilo), si toglie col con conferma sulla riga, e va da sola al PC. L'app accetta solo un
risultato arrivato dopo il peso in diretta (non quello ripetuto al collegamento), conferma i
messaggi alla bilancia e si ricorda la bilancia trovata; fuori dalla pagina il Bluetooth si ferma.
Permessi: «Dispositivi nelle vicinanze» senza posizione (fino ad Android 11 Android pretende la
posizione accesa per cercare dispositivi Bluetooth).
**ALLENAMENTO** (la voce del menu): in alto due linguette, «Palestra» (i giorni della
scheda) e «Cardio» (gli sport, con le stesse schede dei giorni). **SEZIONE CARDIO**: PRIMA si tocca lo
sport (gli sport del tab Cardio del TMS più «Altro»; l'ultimo scelto si ricorda), POI «Avvia registrazione».
Durante la registrazione: battito grande con le zone, tempo, FC media, picco, «Fine» e «annulla registrazione»
(con conferma: non salva niente). A «Fine» chiede solo la fatica RPE (lo sport è già scelto); «Salva la seduta»
la tiene sul telefono e la manda al PC (file 'tms-cardio', tab Cardio, con lo sport scelto). Senza fascia registra
solo il tempo. Niente doppioni: con una seduta coi pesi aperta non si avvia, e con una registrazione cardio in corso
il giorno della scheda non propone la seduta coi pesi. Bozza salvata ogni 15 s: un'app chiusa a metà non la perde.
**IMPOSTAZIONI** in sezioni: «TMS sul PC» (collegamento), «Sensori» (fascia cardio e bracciale), «Promemoria», «App»
(lingua Italiano | English e i QR del sito); accanto ai titoli lo stato («collegato», «chiave salvata»…).
**BRACCIALE CON LA CHIAVE** (Impostazioni › Sensori › Bracciale, solo nell'APK): per i bracciali Zepp OS come
l'Amazfit Helio Strap. Si incolla la CHIAVE del bracciale (16 byte: «0x» + 32 caratteri esadecimali, o senza «0x»;
l'utente la recupera da solo dal suo account Zepp, per esempio col metodo descritto da Gadgetbridge); resta SOLO
sul telefono (non va all'hub, al PC, nei file .tms/.tmsb né nei messaggi), si vede mascherata (ultime 4 cifre) e si
può togliere. «Prova collegamento» cerca il bracciale, apre il canale cifrato sul servizio FEE0 (pezzi da 20 byte,
autenticazione ECDH sulla curva sect163r2 e AES-128 sull'endpoint 0x0082, poi messaggi cifrati con la chiave di
sessione, un contatore e il CRC-32), legge il firmware (180A/2A26) e la batteria (endpoint 0x0029) e mostra
«Collegato · firmware X · batteria Y %»; poi stacca. Messaggi chiari per: chiave sbagliata (0x25/0x26), serve
l'abbinamento con Zepp (0x81), bracciale non trovato o Zepp aperto, bracciale che non risponde. Un firmware non fra
quelli provati (3.11.0, 3.20.0.1, 3.25.0.3) dà un avviso ma non blocca. La crittografia è scritta da zero nella
pagina (protocollo studiato su Gadgetbridge e unstrap, vedi i crediti). C'è già la funzione di trasferimento dello
storico (START/TRANSFER/ACK sull'endpoint 0x004B, dati sulla caratteristica 0005), non ancora usata: sonno,
giorni e allenamenti del bracciale NON si scaricano ancora. Il battito in diretta resta quello della fascia (profilo
standard 0x180D, senza chiave).
**FASCIA CARDIO** (si collega in «Impostazioni»; solo nell'APK, serve il Bluetooth): qualunque fascia cardio Bluetooth standard
(Polar, Garmin, Wahoo, Coospo…) e i bracciali che condividono il battito col profilo standard
«Heart Rate» (servizio 0x180D, misura 0x2A37, specifica pubblica del Bluetooth SIG): per esempio
l'Amazfit Helio Strap con «Heart Rate Push» acceso in Zepp. La prima volta l'app elenca i
dispositivi vicini che dichiarano quel servizio o hanno il nome di una fascia nota e si tocca la
propria; poi la ritrova da sola. Mostra il battito grande, colorato per zona (5 zone dal 50 al
100 % della FC max: quella del Profilo se c'è, altrimenti stimata dall'età con Tanaka, come il TMS;
FC max e FC a riposo arrivano con la scheda). Il battito resta nella barra in alto su tutte le
schermate; durante la seduta coi pesi si vede nella zona della seduta e si registra con quella (vedi
sopra); la registrazione delle sedute di solo cardio è nella sezione «Cardio» (vedi sopra), con lo schermo
acceso. La pagina Cardio, aperta, ricollega da sola la fascia ricordata; senza fascia ricordata mostra «Collega la
fascia», che porta alle Impostazioni. Se il battito non arriva per 15 secondi, o la fascia rifiuta le notifiche senza abbinamento,
l'app lo dice in parole chiare (stringere la fascia; con l'Helio Strap accendere «Heart Rate Push» e
chiudere Zepp; altrimenti per quel bracciale servirà il collegamento con la sua chiave, non ancora
disponibile). Fuori dalla pagina la fascia resta collegata; con l'app in secondo piano si stacca e
poi si ricollega, tranne durante una registrazione. Allenamenti registrati sul bracciale, sonno e
gli altri dati del bracciale NON si leggono ancora.
**PESATE E FOTO** sono un file ciascuno: il PC le importa (pesate con 'importaPesate': la media di
ogni settimana va da sola nello Storico misure, vedi la voce «Pesate della bilancia»; foto con
'importaFotoRientro': file veri in TMS_Dati/<profilo>/foto/ + metadati in DOC.foto, tag
fronte/lato/retro, con un id che evita i doppioni), le segna fra le «ricevute» e sul telefono
compare «al PC». Le SEDUTE DELLA FASCIA CARDIO viaggiano allo stesso modo (file 'tms-cardio', una
seduta per file) ed entrano nel tab Cardio; una seduta già fra le ricevute non si importa di nuovo.
**AGGIORNAMENTO DELL'APK** (dalla 1.2.6): l'app legge scheda/versione.json dal sito su GitHub
Pages (https://marcomartinellione-create.github.io/TMS/scheda/versione.json: versione, file,
sha256 e url dell'allegato della Release; lo scrive «PUBBLICA.bat») all'avvio e poi al massimo
ogni 6 ore, anche senza collegamento; senza rete tace. Se la versione è più alta di
quella installata la propone, scarica l'APK dalla Release (solo da
github.com/marcomartinellione-create/TMS, via https), ne controlla l'impronta SHA-256 e lo
passa all'installer di Android (conferma dell'utente; la prima volta «Installa app
sconosciute»). Su GitHub viaggia solo l'APK: scheda, pesate e foto passano solo dall'hub.
**SCHERMATA D'ANALISI DELLA PESATA** (solo nell'APK): col primo peso in diretta si apre a tutto schermo,
con la grafica dell'app: la figura del corpo del PC, maschile o femminile secondo la scheda, si riempie
dal basso mentre il peso si stabilizza; a peso fermo gambe, braccia, tronco e testa si illuminano uno
alla volta, con righe di analisi, valori che scorrono, una percentuale scenica e una barra a blocchi.
Per tutta la misura suona musica-pesata.mp3 (data da Marco come libera da copyright; non si
personalizza). Al risultato: «Analisi completata», la musica si ferma, fanfara, vibrazione e una
notifica del telefono (id 7300), poi i valori; un tocco o il tasto indietro la chiudono. Se si scende
prima del risultato si chiude da sola.
**PROMEMORIA** (notifiche locali, in «Impostazioni»): ogni sera all'ora scelta
(predefinita 21:00) la pesata, il lunedì anche le foto, e la domanda sulla dieta (casella a parte,
accesa di serie: con un piano alimentare l'APK chiede una volta il permesso delle notifiche); si
programmano i 28 giorni successivi e si ricalcolano a ogni apertura, pesata, foto o dieta segnata: se
quel giorno la pesata (o le foto, o la dieta) c'è già, quello della sera non suona. Toccandolo si apre
la Bilancia, le Foto o l'Alimentazione.

## 9 · Esercizi e video (tab Esercizi)

- Catalogo di 883 esercizi per gruppo muscolare e sottocategoria (tendine chiuse di
  default, click per aprirle). «＋ Nuovo» aggiunge un esercizio personalizzato; «matita»
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
  - **⧉ Duplica** (nel pannello della matita): apre l'editor in modalità nuovo su una copia integrale
    dell'esercizio (muscoli, istruzioni, video), col nome «… (copia)»; l'originale resta
    intatto. Per creare un esercizio quasi uguale a uno esistente si parte da qui.
  - Gli esercizi creati dall'app portano il campo custom = true. Elimina chiede conferma in stile app.
- **Video**: ogni esercizio ha un video dimostrativo integrato. ATTENZIONE, limite
  noto: nelle versioni attuali la maggior parte dei video integrati è un segnaposto
  identico (882 su 883) — verranno sostituiti progressivamente con le registrazioni
  reali. Dal pannello della matita si possono caricare **video personali** che sostituiscono
  quelli integrati (toggle «Video personali»; fallback automatico al video integrato
  se il personale manca).

## 10 · Report (tab Report)

- **Sezioni personalizzabili**: nell'elenco «Blocchi» la casella decide QUALI blocchi
  entrano nel report (Profilo & corpo, Foto progressi, Riepilogo, Scheda, Andamento,
  Progressione, Record, Cardio, Alimentazione, Dieta × allenamento, Note del coach); il
  trascinamento o le frecce ▲▼ ne decidono l'ORDINE. La scelta si salva per profilo e vale sia
  per il PDF sia per il report digitale. Obiettivo, note del coach e foto prima/dopo si
  scrivono nel riquadro «Documento».
- **Foto prima/dopo nel report**: se ci sono foto (tab Corpo), due selettori nel riquadro «Documento» («Foto prima» e «Dopo»)
  scelgono la foto «Prima» e «Dopo»; con la sezione «Foto progressi» attiva entrano nel report
  (incorporate, quindi funzionano anche offline nel PDF e nel digitale).
- **PDF A4**: bottone «Scarica PDF (A4)» — l'app impagina e genera il PDF da sola
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
  sceglie: «▲ Su», «▼ Giù», «Togli elemento». Doppio clic o «Modifica testo» rende il blocco
  scrivibile nel foglio, con «＋ Riga sopra/sotto» e «Togli riga» per le tabelle. Questi
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
  "+28 kg (40%)": quanto corpo entra davvero e in che proporzione. E' un
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
- **Salva nello Storico su una settimana già salvata**: AGGIUNGE righe, non sostituisce
  quelle esistenti (l'app avvisa prima).
- **Telefono collegato**: ci vuole il TMS aperto sul PC, con attivo il profilo del
  cliente (il PC controlla l'hub ogni 20 secondi, il telefono ogni minuto ad app aperta).
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
- «Cambiare formula 1RM, RIR, session-RPE» → Profilo → tendina del profilo → 
  Modifica parametri.
- «Cambiare la fase alimentare (Bulk/Mant/Cut)» → Alimentazione → bottoni in cima al tab.
- «Avere la scheda sul telefono» → Impostazioni › Telefono collegato («Attiva» con il codice d'invito, poi
  «Collega un telefono» sul profilo del cliente) e, sul telefono, Impostazioni dove si scrive il codice. Da lì la
  scheda è la stessa sui due e quello che si scrive in palestra arriva da solo nei Pesi.
- «Salvare l'allenamento della settimana» → Pesi → Salva nello Storico.
- «Registrare una corsa / un'attività cardio» → Cardio → ＋ Aggiungi attività (data, tipo,
  durata, RPE; FC media facoltativa per il TRIMP).
- «Correggere un dato sbagliato» → nella scheda corrente si corregge direttamente; per una
  settimana già salvata si apre lo Storico e si usa la matita sulla riga sbagliata (serie,
  ripetizioni, peso, RIR, stella). Per rifare tutta la settimana: cestino rosso nella sua barra,
  poi si risalva.
- «Vedere i progressi / il rischio di sovraccarico» → Progressi (record, TL, ACWR).
- «Impostare la dieta» → Alimentazione (fase attiva scelta coi bottoni in cima al tab);
  per le analisi nel tempo registrare i Periodi.
- «Backup prima di formattare il PC» → Profilo → Backup (meglio con la password: tornano anche i
  collegamenti dei telefoni) e il file .tmsb fuori dal PC, o una cartella in Impostazioni › Copia dei
  backup; sul PC nuovo → Ripristina → Ripristina tutto.
- «Passare un cliente a un collega» → Profilo → Esporta sul profilo (file .tms, con i suoi esercizi
  personalizzati e i loro video); il collega fa Importa cliente o doppio clic sul file.
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
    avviso(t('Scaricato')+' '+a.download+'.\n'+t('Caricalo nella chat di un assistente AI (ChatGPT, Claude, Gemini…) e fagli le tue domande sul TMS.'));
  }catch(e){ avviso(t('Errore nel download:')+' '+e.message); logErrore('guidaAI', e); }
}
