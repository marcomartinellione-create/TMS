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
  segnalazione col pulsante 🐞 Segnala in basso a sinistra (vedi sotto).
- **Pulsante 🐞 Segnala** (in basso a sinistra, accanto al 📕 Guida): apre un modulo per
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
  la tendina): «📤 Esporta scheda» e «📥 Importa rientro» — lo scambio col cliente,
  vedi sezione 8. Lavorano sul profilo della riga: se non è quello attivo, l'app lo
  attiva da sola.
- In fondo alla pagina: «Backup (tutti i profili insieme)» con «⭳ Backup dati»
  (esporta TUTTO in un file JSON), «⭳ Backup completo (con foto)» e «⭱ Ripristina»
  (reimporta, sostituendo i dati attuali previa conferma). DIFFERENZA: il backup dati
  porta solo i METADATI delle foto, quindi ripristinandolo altrove le immagini mancano;
  il backup completo incorpora le immagini come data-URI (file molto più grande, chiede
  conferma mostrando numero di foto e MB) e al ripristino le riscrive in
  TMS_Dati/<profilo>/foto/. I video non entrano in nessuno dei due. Sotto, la riga dei **backup automatici**: l'app ne crea
  uno a settimana da sola (cartella «backup_automatici» dentro i dati, ultime 5
  copie) con link «ripristina» accanto a ciascuno.
- **Eliminare una settimana già salvata**: nello **Storico** (link in fondo alla pagina) ogni
  settimana ha la sua barra scura con, a destra, un pulsante **cestino rosso** che toglie tutte
  le righe di QUELLA settimana. Stesso pulsante su ogni rilevazione dello storico **Misure**.
  In entrambi i casi viene chiesta conferma con un riquadro dell'app (non la finestra di
  sistema) e l'operazione è definitiva. Si può togliere qualunque settimana, anche una in
  mezzo allo storico: non solo l'ultima.

- Per ogni profilo i file sono: scheda.json, storico.json, corpo.json,
  alimentazione.json. I valori derivati (1RM, TL, ACWR…) NON vengono mai salvati:
  si ricalcolano al volo dai dati grezzi.

## 4 · Pesi (tab 🏋 Pesi)

NB: questo tab si chiamava «Allenamento» fino alla v1.0.77; ora è «Pesi» e affianca il
nuovo tab «Cardio». Le attività cardio NON sono selezionabili qui (restano nel tab Cardio).

- Scheda **settimanale** (e vista mensile). Si aggiungono Giorni; in ogni giorno righe
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

- **⚖ Bilanciamento** (bottone a sinistra di ▦ Colonne): apre un radar delle
  SERIE per gruppo muscolare della scheda che si sta scrivendo — non dell'ultima settimana
  salvata: serve mentre si costruisce. Accanto al disegno c'è l'elenco in chiaro, gruppo per
  gruppo. Il **cardio è escluso** di proposito: qui si guarda come è distribuito
  il lavoro coi pesi, e i minuti di cardio convertiti in serie equivalenti gonfierebbero un
  asse che non c'entra. Diverso dal radar di Progressi, che invece il cardio lo include.
  Il conteggio **spalma ogni serie sui gruppi coinvolti** (quoteGruppi in 01-costanti.js):
  quota 1 ai gruppi dei muscoli_primari dell'esercizio, quota 0,5 a quelli dei
  muscoli_secondari, un muscolo presente in entrambe le liste vale 1 (si tiene il massimo).
  I 17 nomi di muscolo del catalogo sono mappati sui 6 gruppi dei pesi da MUSCOLO_GRUPPO;
  se l'esercizio non porta le liste dei muscoli si ricade sul solo campo macro, quota 1.
  Quindi 3 serie di panca danno 3 a Pettorali e 1,5 a Spalle e a Braccia, e i totali di
  gruppo NON sommano al numero di serie della scheda (la riga «serie in scheda» dà quello).
  La ragnatela usa una **scala assoluta** con una fascia di riferimento PER GRUPPO
  (RIF_GRUPPO in 01-costanti.js: min/max delimitano la zona utile, sotto/sopra sono le
  soglie che accendono il rosso sull'etichetta). Le fasce non sono uguali fra loro perché
  ogni asse somma lavoro diretto e indiretto e i gruppi raccolgono un numero diverso di
  muscoli: i valori sono ricavati passando questo stesso conteggio su circa 930 schede
  pubblicate (strengthlog.com, muscleandstrength.com), tenendo le 109 settimane intere con
  almeno l'85% degli esercizi riconosciuti e, di quelle, le 60 equilibrate secondo un
  criterio esterno (linee guida sulla spalla: spinta/trazione fra 1:1 e 1:2). Min = 25esimo
  percentile di quella distribuzione, max = 90esimo. Il filtro conta: sulle schede scartate
  la mediana spinta/trazione e' 1,50 con novantesimo percentile 3,50, cioe' si tarerebbe
  l'app sulla scheda media di internet; sulle 60 tenute la mediana e' 1,00. Core ha sotto = 0 e non viene mai segnalato come scarso, perché quei
  programmi quasi non prevedono addominali diretti; Cardio segue le linee guida OMS,
  150-300 min a settimana = 15-30 sull'asse. Un poligono regolare NON è l'obiettivo: la
  forma da avvicinare è la fascia.
  **Lo stesso conteggio e le stesse fasce valgono anche per il radar di Progressi e del
  Report**: schedeAggr riempie map[s].sets con quoteGruppi sull'esercizio della riga, e
  ricade sul macro salvato se l'esercizio non è più a catalogo. Il TL per gruppo
  (map[s].grp) resta invece attribuito al solo macro dello storico: è un'altra metrica.
  Il grafico a barre «Serie per gruppo» non ha più le soglie fisse 10/20 — la barra
  diventa rossa quando quel gruppo esce dalla propria fascia.
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
- Il cardio compare anche nel grafico **«Equilibrio volume»** (Progressi e Report) come asse
  dedicato: i minuti diventano «serie-equivalenti» (min÷10), così ~2 h/settimana ≈ 12, in
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
  (RPE 0-10) e durata in minuti per seduta. Un pallino/banner verde o rosso (qui, in Corpo e nel footer) avvisa se
  la settimana corrente non è ancora registrata.

## 5 · Progressi, Storico, Corpo (tab 📈 Progressi · 🜂 Corpo; archivi dal footer)

- **Progressi**: record personali per esercizio (carico massimo), «Segnali»
  automatici (🎉 record al salvataggio, ⏸ esercizi in stallo con TL fermo da 3+
  schede, ⚠ suggerimento deload se ACWR alto, ⚠ monotonia alta) e grafici: TL totale
  con media mobile, ACWR con la zona sicura evidenziata, TL per gruppo muscolare,
  distribuzione delle intensità (%1RM), carico interno sRPE (se abilitato),
  monotonia/strain, progressione del singolo esercizio (1RM e peso max nel tempo).
  I grafici hanno senso da 2-3 settimane salvate in poi. Dal v1.1.4 in cima c'è il
  selettore **«Dati da analizzare»**: «Tutto il percorso» oppure un singolo **Training Set**
  (patch al limite noto della confrontabilità del TL tra schede molto diverse — es. Palestra
  vs Casa). La scelta **si ricorda**: vive nel profilo (dati_utente.progSet, quindi in
  corpo.json) e viene riproposta al rientro; se il Training Set salvato non esiste piu' si
  torna da soli a «Tutto il percorso». Ogni settimana salvata porta il campo 'set' col Training Set attivo; le settimane
  salvate prima del v1.1.4 non ce l'hanno e compaiono solo in «Tutto il percorso». **Eccezione
  (dal v1.1.6)**: i «Record personali · carico massimo» NON seguono questo filtro — un record
  è un record, sempre calcolato su TUTTO lo storico indipendentemente dal Training Set attivo;
  quando un filtro è impostato compare la pill «su tutto il percorso» accanto al titolo per
  spiegarlo. Il radar «Volume ed equilibrio · serie per gruppo» somma sull'asse Cardio anche i
  minuti di cardio registrati nel Riscaldamento (oltre a quelli del tab Cardio), min÷10 —
  vedi §4 per i dettagli su cosa NON tocca (TL/ACWR/monotonia restano intatti).
- **Storico** (link «📜» nel footer): archivio completo delle registrazioni, in codici
  settimana ISO formato AAAASS (es. 202624 = settimana 24 del 2026).
- **Corpo**: peso e misure corporee con BMI e stime masse; lo storico misure è in un
  archivio dedicato (link nel footer).
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
- Pasti personalizzabili e **riordinabili**: le frecce «▲▼» accanto al nome del pasto
  lo spostano su/giù nella fase (insieme a tutti i suoi alimenti); «✎» rinomina, «🗑»
  elimina. In ogni pasto «＋ scegli alimento…» apre la banca dati svizzera USAV
  (1190 alimenti generici, valori per 100 g scalati sui grammi inseriti). Col «▸» si
  vedono tutti i micro e macro nutrienti.
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
- **Stampa dieta (PDF A4)**: bottone «⬇ Stampa dieta (PDF A4)» in cima al tab — genera un
  PDF **A4 orizzontale** del piano della fase attiva (pasti, grammi, kcal e macro per
  alimento, totali per pasto e totale giornaliero) da dare al cliente. Lo fa l'app, senza
  la stampa del browser (stesso motore del Report).
- **Periodi**: registrazione di intervalli datati (piano alimentare + data inizio e
  fine) che alimentano il tab Analisi.

## 7 · Analisi (tab 📊 Analisi)

Incrocia dieta e allenamento nel tempo (servono periodi alimentari registrati):
timeline dei periodi con carico allenante e peso sovrapposti; variazione di peso
contro bilancio calorico stimato; correlazioni con ritardo temporale (lag); confronto
tra fasi (boxplot). Tutto ricalcolato al volo dai dati, niente da configurare.

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
TMS Scheda è una PWA su https://marcomartinellione-create.github.io/TMS/app/ — si
installa dal browser con «Aggiungi alla schermata Home», funziona offline, si aggiorna
da sola. La scheda viaggia come file via chat/email. Nessun server: i dati restano
nei dispositivi.
1. **Esporta** — tab «👤 Profilo», riga del cliente, bottone «📤 Esporta scheda»:
   nasce «Scheda_profilo_data.json» (tipo interno 'tms-scheda') con la scheda giorno
   per giorno, il previsto e — se il piano della fase attiva non è vuoto — anche la
   **dieta** (campo 'dieta': pasti, alimenti, grammi, kcal/macro precalcolati, perché
   il cliente non ha la banca alimenti). Un popup chiede il TIPO di scheda: FISSA
   (sola compilazione, come le versioni precedenti) o MODIFICABILE (il cliente può
   anche aggiungere/eliminare/modificare esercizi e segnare i test del massimale 1RM);
   la scelta è nel campo 'modificabile' del file (default false = fissa). Alla domanda
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
   campo opzionale 'foto': [{tag,data,img}] se ha scattato foto) da rimandare al coach,
   dove possibile con la condivisione diretta (WhatsApp ecc.).
   Il **riscaldamento** viaggia nella scheda (campo 'riscaldamento') ma è solo informativo:
   NON entra nel rientro e non conta in alcun calcolo.
3. **Importa** — riga del cliente, «📥 Importa rientro»: si sceglie il file e l'allenamento
   del cliente viene **caricato nella scheda 🏋 Pesi** (NON scritto subito nello Storico);
   se il cliente non usa il Session-RPE, i giorni con 'fatto:true' vengono contati e mostrati
   nell'avviso come «giorni segnati come completati». Le eventuali **foto** ('foto' nel
   rientro) vengono decodificate e salvate come file veri in TMS_Dati/<profilo>/foto/ +
   metadati in DOC.foto (stesso formato delle foto aggiunte a mano dal tab Corpo — tag
   fronte/lato/retro), tramite 'importaFotoRientro'. Il coach rivede la scheda Pesi,
   eventualmente corregge, poi preme «💾 Salva nello Storico» scegliendo la settimana: solo
   allora entra nello Storico (con sedute e RPE) e alimenta TL/ACWR/grafici. Questo dà al
   coach un controllo manuale prima del salvataggio.
Controlli all'import: file non valido → errore chiaro; profilo diverso da quello
della riga → richiesta conferma; esercizi fuori catalogo → avviso con elenco;
scheda Pesi non vuota → conferma prima di sostituirla con i dati del cliente.

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
  entrano nel report (Profilo & corpo, Foto progressi, Riepilogo, Scheda, Andamento,
  Progressione, Record, Alimentazione, Dieta × allenamento, Note del coach); le frecce ▲▼
  accanto a ogni casella ne decidono l'ORDINE. La scelta si salva per profilo e vale sia per
  il PDF sia per il report digitale.
- **Foto prima/dopo nel report**: se ci sono foto (tab Corpo), due selettori «📸 Foto report»
  scelgono la foto «Prima» e «Dopo»; con la sezione «Foto progressi» attiva entrano nel report
  (incorporate, quindi funzionano anche offline nel PDF e nel digitale).
- **PDF A4**: bottone «⬇ Scarica PDF (A4)» — l'app impagina e genera il PDF da sola
  (download diretto, senza passare dalla stampa del browser).
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
  ZAVORRA: 0 = a corpo libero, 15 = con 15 kg appesi). Vale per %1RM, TL, record e
  tonnellaggio.
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
  · da appeso ma che sollevano le sole gambe, non il corpo: "Leg raise da appeso",
    "Pike da appeso", "Sollevamento ginocchia/anche alle parallele", "Wind sprint".
  Gli esercizi a carico parziale entreranno quando si gestiranno le percentuali di peso
  corporeo: se l utente lo chiede, spiega che per ora vanno compilati come prima.
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
- «Vedere a colpo d'occhio quali clienti sono a rischio / non aggiornano» → Profilo: il
  semaforo accanto al nome di ogni profilo (verde/giallo/rosso) con ACWR, settimane
  dall'ultimo aggiornamento e PR recenti sotto al nome.
- «Cambiare formula 1RM, RIR, session-RPE» → Profilo → tendina del profilo → ✎
  Modifica parametri.
- «Cambiare la fase alimentare (Bulk/Mant/Cut)» → Alimentazione → bottoni in cima al tab.
- «Mandare la scheda a un cliente» → Profilo → riga del cliente → 📤 Esporta scheda.
- «Registrare ciò che il cliente ha fatto» → Profilo → riga del cliente → 📥 Importa
  rientro (file Rientro_*.json che il cliente rimanda).
- «Salvare l'allenamento della settimana» → Pesi → 💾 Salva nello Storico.
- «Registrare una corsa / un'attività cardio» → Cardio → ＋ Aggiungi attività (data, tipo,
  durata, RPE; FC media facoltativa per il TRIMP).
- «Correggere un dato sbagliato» → nella scheda corrente si corregge direttamente; per una
  settimana già salvata si apre lo Storico, si elimina quella settimana col cestino rosso
  nella sua barra e si risalva.
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
    alert(t('✔ Scaricato')+' '+a.download+'.\n'+t('Caricalo nella chat di un assistente AI (ChatGPT, Claude, Gemini…) e fagli le tue domande sul TMS.'));
  }catch(e){ alert(t('Errore nel download:')+' '+e.message); logErrore('guidaAI', e); }
}
