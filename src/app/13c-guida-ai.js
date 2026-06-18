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
  digita il nome o si scorre per gruppo muscolare; Invio sceglie il primo risultato). A
  ricerca vuota, in cima ci sono i **★ Preferiti** e i **🕐 Recenti** (gli esercizi usati di
  recente); la stellina ☆/★ accanto a ogni esercizio lo aggiunge/toglie dai preferiti.
  Campi per riga: Serie, Ripetizioni, Peso, RIR (opzionale), Note, recupero. Obbligatori
  solo esercizio/serie/ripetizioni/peso.

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
  «＋ Giorno» crea un nuovo giorno. Le frecce «▲▼» nella riga riordinano l'esercizio
  dentro il suo giorno.
- «＋set» aggiunge set extra alla riga; «↧ Dalla scorsa» ricompila coi valori
  dell'ultima registrazione; il «▶» accanto all'esercizio apre il video dimostrativo.
- Per ogni riga l'app mostra al volo: 1RM stimato, %1RM, TL (carico della riga) e il
  «Δ TL set» (questo set vs il set di pari posizione della scorsa scheda).
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
- **Foto progressi** (in fondo al tab Corpo): foto datate del cliente (es. fronte/lato),
  salvate IN LOCALE in TMS_Dati/<profilo>/foto/ (mai caricate online), metadati (file/data/
  tag) in corpo.json. Due modalità: «▶ Riproduzione» (timelapse con cursore tipo lettore
  video, play/pausa, una foto per volta in ordine di data) e «⚖ Confronto» (due date a
  scelta, vecchia sopra/recente sotto, con data e peso). Filtro per tag. I backup JSON
  includono solo i metadati, non le immagini (per quelle si copia la cartella TMS_Dati,
  come per i video). Si può inserire un confronto prima/dopo anche nel Report.

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

## 8 · Scambio scheda coach ↔ cliente

Il cliente NON deve avere il TMS: la scheda viaggia come file.
1. **Esporta** — tab «👤 Profilo», riga del cliente, bottone «📤 Esporta scheda»:
   nasce un file «Scheda_profilo_data.html», pagina autonoma con la scheda giorno per
   giorno e campi compilabili. Alla domanda sui video: includendoli il cliente vede le
   esecuzioni offline ma il file pesa di più.
2. **Il cliente compila** — apre il file in qualunque browser (la pagina è **ottimizzata
   per smartphone**: prima si sceglie il **giorno** da un elenco («Seleziona il giorno»),
   poi si compila solo quel giorno — un esercizio sotto l'altro, campi su una colonna e
   tastiera numerica, niente scroll laterale; una spunta ✔ segna i giorni già compilati),
   inserisce ciò che ha
   fatto davvero (serie, ripetizioni, peso, RIR, note per esercizio; fatica RPE 0-10
   e durata per seduta; gli esercizi non sono modificabili) e preme «📩 Crea il file
   per il trainer»: si scarica «Rientro_profilo_data.json» da rimandare al coach.
   IMPORTANTE per il cliente: meglio **salvare il file nella memoria del telefono**
   (es. cartella Download) e aprire sempre quella copia, non l'anteprima della chat:
   la pagina **salva da sola la bozza** sul dispositivo (si può chiudere e riprendere);
   se il salvataggio automatico non è possibile, la pagina lo segnala con un avviso.
3. **Importa** — riga del cliente, «📥 Importa rientro»: si sceglie il file e l'allenamento
   del cliente viene **caricato nella scheda 🏋 Pesi** (NON scritto subito nello Storico).
   Il coach lo rivede, eventualmente corregge, poi preme «💾 Salva nello Storico» scegliendo
   la settimana: solo allora entra nello Storico (con sedute e RPE) e alimenta TL/ACWR/grafici.
   Questo dà al coach un controllo manuale prima del salvataggio.
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
- «Correggere un dato sbagliato» → nella scheda corrente si corregge direttamente;
  nello storico: ↶ Annulla ultimo e risalvare.
- «Vedere i progressi / il rischio di sovraccarico» → Progressi (record, TL, ACWR).
- «Impostare la dieta» → Alimentazione (fase attiva scelta coi bottoni in cima al tab);
  per le analisi nel tempo registrare i Periodi.
- «Backup prima di formattare il PC» → Profilo → ⭳ Backup dati (un file JSON con
  tutti i profili); al ripristino ⭱ Ripristina.
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
    alert('✔ Scaricato '+a.download+'.\nCaricalo nella chat di un assistente AI (ChatGPT, Claude, Gemini…) e fagli le tue domande sul TMS.');
  }catch(e){ alert('Errore nel download: '+e.message); logErrore('guidaAI', e); }
}
