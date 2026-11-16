/* ════════════════ SPIEGAZIONI DEI GRAFICI (2026-11-13) ════════════════
   Richiesta di Marco: «per ogni singolo grafico un piccolo punto interrogativo cerchiato in
   alto a destra che apre un popup con la spiegazione completa, formule, dati, esempio, tutto,
   come se fosse un paper scientifico».
   Ogni voce di SPIEG è una nota metodologica: titolo, dove compare, sommario, sezioni
   (cosa mostra · dati · metodo e formule · esempio svolto · come leggerlo · limiti) e
   bibliografia. Le formule sono QUELLE DEL CODICE (02-calcoli.js, 08-progressi.js,
   06b-cardio.js, 09-corpo.js, 11-alimentazione.js, 11b-analisi.js, 01b-riferimenti.js):
   se un calcolo cambia, la sua nota va aggiornata insieme. La versione inglese sta in
   SPIEG_EN (05c-spiegazioni-en.js), stesse chiavi e stessa struttura; se una voce manca,
   in inglese si mostra quella italiana. Non passano da t(): sono documenti, come le guide.
   Il pulsante si crea con spiegaBtn(id) dentro l'h4 del grafico (o nel suo riquadro): un
   solo ascoltatore sul documento apre la nota, anche nei pannelli che si ridisegnano. */
const SPIEG={
'distribuzione':{t:'Distribuzione del lavoro fra i gruppi muscolari',
  dove:'Pesi (pannello laterale) · ⚖ Bilanciamento · Progressi · Report',
  a:`La ragnatela descrive la <b>forma</b> della settimana di allenamento coi pesi: quale quota delle serie va a ciascuno dei sei gruppi (Gambe, Pettorali, Schiena, Spalle, Braccia, Core). È una misura di <b>proporzione</b>, indipendente dal volume totale. La fascia verde è la forma tipica di un riferimento scelto per esperienza e tipo di allenamento; la didascalia dice su quante schede o studi si regge.`,
  s:[['Cosa mostra',`Ogni asse è la quota percentuale di un gruppo sul totale delle serie coi pesi. In <b>Pesi</b> e nel <b>⚖ Bilanciamento</b> si usa la scheda che stai scrivendo; in <b>Progressi</b> e nel <b>Report</b> l'ultima settimana salvata nello Storico. Il cardio non entra: cambierebbe la quota di tutti gli altri gruppi.`],
   ['Dati di partenza',`Per ogni riga: esercizio e numero di serie. Dal catalogo: muscoli primari e secondari dell'esercizio, ricondotti ai sei gruppi (17 muscoli → 6 gruppi). In alternativa, se scelto in ⚙ Riferimento, la mappa muscolare esterna (smyrdev, 1,0 diretto / 0,5 indiretto per schema di movimento).`],
   ['Metodo e formule',`Una serie è <b>diretta</b> sul gruppo di un muscolo primario, <b>indiretta</b> su quello di un muscolo solo secondario (un gruppo con un primario resta diretto). Con pesi <i>w</i><sub>d</sub> = 1,0 e <i>w</i><sub>i</sub> = 0,5 (predefiniti, provvisori):
     <div class="spf">S<sub>g</sub> = <i>w</i><sub>d</sub> · D<sub>g</sub> + <i>w</i><sub>i</sub> · I<sub>g</sub><span class="spn">(1)</span></div>
     <div class="spf">q<sub>g</sub> = <span class="fr"><i>S<sub>g</sub></i><i>Σ<sub>k</sub> S<sub>k</sub></i></span> × 100<span class="spn">(2)</span></div>
     dove D<sub>g</sub> e I<sub>g</sub> sono le serie dirette e indirette del gruppo <i>g</i>. Il riferimento si calcola con lo <b>stesso</b> conteggio sulle voci scelte (schede pubblicate o protocolli di studio): per ogni gruppo la fascia va dal 10° al 90° percentile delle quote (interpolazione lineare), arrotondata verso l'esterno. L'etichetta diventa rossa sotto ¾ del 10° percentile o sopra 5/4 del 90°. Con meno di 5 voci la fascia non si disegna; da 5 a 9 è tratteggiata.`],
   ['Esempio svolto',`Scheda: 4 serie di squat e 3 di panca piana. Squat: quadricipiti primario (Gambe diretto); lombari, glutei, femorali, polpacci secondari (Schiena indiretto). Panca: pettorali primario; spalle e tricipiti secondari.
     <div class="spf">Gambe 4 · Pettorali 3 · Schiena 4×0,5 = 2 · Spalle 3×0,5 = 1,5 · Braccia 1,5 · Core 0 &nbsp;→&nbsp; totale 12</div>
     Quote: Gambe 33%, Pettorali 25%, Schiena 17%, Spalle 12,5%, Braccia 12,5%, Core 0%. Col riferimento predefinito (Pettorali 6–13%, rosso oltre 16%) i Pettorali escono in rosso: la settimana è sbilanciata sulla spinta orizzontale.`],
   ['Come leggerlo',`Conta la forma, non la grandezza: una settimana leggera e una pesante distribuite allo stesso modo hanno lo stesso disegno. Il poligono arancione dovrebbe stare dentro l'anello verde, che non è regolare perché i gruppi raccolgono un numero diverso di muscoli e di lavoro indiretto. Per la quantità serve l'elenco «Serie per gruppo».`],
   ['Limiti',`I pesi 1,0 / 0,5 sono una convenzione (serie frazionarie), non una misura dell'attivazione muscolare. I riferimenti descrivono schede pubblicate o protocolli di studio, non l'ottimo per una persona: il livello delle schede è dichiarato dall'autore, l'esperienza degli studi è quella dei partecipanti. Tre gruppi (Gambe, Schiena, Braccia) sommano muscoli diversi: un 30% di Gambe può essere tutto quadricipiti. Con «Schede Fable» acceso, dove mancano schede reali la fascia viola viene da schede generate dal modello Fable: un’ipotesi, non un dato.`]],
  b:['Schoenfeld BJ, Grgic J, Haun C, Itagaki T, Helms ER (2019). Calculating set-volume for the limb muscles with the performance of multi-joint exercises. <i>Sports</i> 7(7):177.',
     'Pelland JC et al. (2025). The resistance training dose response: meta-regressions exploring the effects of weekly volume and frequency on hypertrophy and strength. <i>Sports Medicine</i>, doi:10.1007/s40279-025-02344-w.',
     'Hyndman RJ, Fan Y (1996). Sample quantiles in statistical packages. <i>The American Statistician</i> 50(4):361–365.',
     'Riferimenti TMS: schede StrengthLog, Muscle &amp; Strength, depot.fitness (CC BY 4.0), Liftosaur e altre schede pubbliche di 30 siti; corpus di protocolli v0.7 e articoli ad accesso aperto. Elenco completo in ⚙ Riferimento.']},

'serie-gruppo':{t:'Serie per gruppo muscolare e zona utile',
  dove:'Pesi (pannello laterale) · ⚖ Bilanciamento · Storico · Progressi',
  a:`L'elenco (e in Progressi il grafico a barre) dice la <b>quantità</b> di lavoro settimanale di ciascun gruppo, in serie, separando la parte diretta da quella indiretta, e la confronta con una zona utile ricavata da schede pubblicate equilibrate.`,
  s:[['Cosa mostra',`Per ogni gruppo le serie della settimana: in <b>Pesi</b> e nel <b>⚖ Bilanciamento</b> quelle della scheda in scrittura, nello <b>Storico</b> la media a settimana delle righe filtrate, in <b>Progressi</b> l'ultima settimana salvata, con in più il Cardio. La barra è piena per la parte diretta e chiara per l'indiretta; le tacche verdi segnano la zona utile del gruppo.`],
   ['Dati di partenza',`Esercizio e serie di ogni riga; muscoli primari e secondari dal catalogo; per il Cardio i minuti delle attività (tab Cardio) e del cardio di riscaldamento.`],
   ['Metodo e formule',`Stesso conteggio della ragnatela:
     <div class="spf">S<sub>g</sub> = <i>w</i><sub>d</sub> · D<sub>g</sub> + <i>w</i><sub>i</sub> · I<sub>g</sub>, &nbsp; <i>w</i><sub>d</sub> = 1,0 · <i>w</i><sub>i</sub> = 0,5<span class="spn">(1)</span></div>
     Per il Cardio (solo Progressi) i minuti diventano serie equivalenti:
     <div class="spf">S<sub>Cardio</sub> = <span class="fr"><i>minuti cardio + minuti cardio di riscaldamento</i><i>10</i></span><span class="spn">(2)</span></div>
     Zone utili (serie a settimana; tacche = min–max, rosso fuori da sotto/sopra): Gambe 20–40 (12/50), Pettorali 7–16 (4/20), Schiena 17–32 (9/40), Spalle 14–30 (8/38), Braccia 17–40 (9/50), Core 3–12 (0/16), Cardio 15–30 (8/45). Min = 25° percentile e max = 90° percentile di 60 schede pubblicate equilibrate; per il Cardio, linee guida OMS 150–300 minuti.`],
   ['Esempio svolto',`3 serie di panca piana: Pettorali 3 dirette; Spalle e Braccia 3 indirette ciascuna, cioè 3 × 0,5 = <b>1,5</b>. Nel suggerimento della riga si legge «0 dirette ×1 + 3 indirette ×0,5 = 1,5». Con 12 serie di panca a settimana i Pettorali arrivano a 12 (dentro 7–16) e Spalle e Braccia ricevono 6 serie «di striscio».`],
   ['Come leggerlo',`Il numero risponde a «basta il volume per questo gruppo?», la ragnatela a «è distribuito bene?». Una barra quasi tutta chiara vuol dire che il gruppo lavora quasi solo di riflesso agli esercizi multiarticolari. Il rosso compare solo quando si è nettamente fuori, non al confine.`],
   ['Limiti',`Le zone sono tarate col conteggio predefinito (catalogo TMS, 1,0 / 0,5): con altri pesi o con la mappa esterna vanno lette con prudenza. Sono fasce di gruppo, non di singolo muscolo: la letteratura ragiona per muscolo (circa 10–20 serie a settimana per la crescita), e un gruppo ne somma diversi. La conversione dei minuti di cardio in serie è una scelta di scala, non un'equivalenza fisiologica.`]],
  b:['Schoenfeld BJ, Ogborn D, Krieger JW (2017). Dose-response relationship between weekly resistance training volume and increases in muscle mass. <i>J Sports Sci</i> 35(11):1073–1082.',
     'Schoenfeld BJ et al. (2019). Calculating set-volume for the limb muscles with the performance of multi-joint exercises. <i>Sports</i> 7(7):177.',
     'World Health Organization (2020). <i>WHO guidelines on physical activity and sedentary behaviour</i>. Ginevra: WHO.',
     'Meta-analisi TMS (2026): circa 930 schede di StrengthLog e Muscle &amp; Strength, 60 equilibrate (spinta : trazione fra 0,7 e 1,4).']},

'carico-giorno':{t:'Carico per giorno della scheda',
  dove:'Pesi (pannello laterale)',
  a:`Ripartisce la scheda in scrittura fra i giorni della settimana: serie, esercizi diversi e Training Load di ogni seduta, per vedere se il carico è concentrato in un giorno solo.`,
  s:[['Cosa mostra',`Una riga per giorno: barra proporzionale al TL della seduta (il giorno più carico è la barra piena), numero di serie, numero di esercizi diversi e TL.`],
   ['Dati di partenza',`Le righe della scheda attiva (modalità settimanale o mensile): giorno, esercizio, serie, ripetizioni, peso, eventuale RIR.`],
   ['Metodo e formule',`Il TL di ogni riga è quello usato in tutta l'app:
     <div class="spf">TL = serie × rip × <i>C</i> × <span class="fr"><i>%1RM</i><i>100</i></span> × <i>f</i><span class="spn">(1)</span></div>
     con <i>C</i> carico effettivo (zavorra + peso corporeo × quota per trazioni, dip e leg raise), %1RM = <i>C</i> ÷ 1RM stimato × 100, <i>f</i> fattore dell'esercizio dal catalogo (0–1,05). Per ogni giorno si sommano TL e serie e si contano gli esercizi distinti; la barra è TL<sub>giorno</sub> ÷ TL<sub>max</sub> × 100.`],
   ['Esempio svolto',`Lunedì: squat 4 × 5 a 100 kg. 1RM (Epley) = 100 × (1 + 5/30) = 116,7 kg; %1RM = 85,7%; fattore 0,95.
     <div class="spf">TL = 4 × 5 × 100 × 0,857 × 0,95 = 1 629</div>
     Giovedì: panca 3 × 8 a 70 kg → 1RM 88,7 kg, %1RM 78,9%, TL = 3 × 8 × 70 × 0,789 × 0,95 = 1 260. Il lunedì è la barra piena, il giovedì arriva al 77%.`],
   ['Come leggerlo',`Giorni di lunghezza molto diversa indicano sedute sbilanciate: un giorno «pesante» con il doppio del TL degli altri concentra fatica e recupero. Non c'è una fascia giusta: dipende dallo schema (full body, split).`],
   ['Limiti',`Il TL è un indice relativo di volume per intensità, non un'unità fisiologica: serve a confrontare sedute e settimane dello stesso atleta, non atleti diversi. Il fattore per esercizio è una stima dell'impegno sistemico, non una misura.`]],
  b:['McBride JM, McCaulley GO, Cormie P, Nuzzo JL, Cavill MJ, Triplett NT (2009). Comparison of methods to quantify volume during resistance exercise. <i>J Strength Cond Res</i> 23(1):106–110.',
     'Epley B (1985). <i>Poundage chart</i>. Lincoln (NE): Boyd Epley Workout.']},

'intensita':{t:'Distribuzione dell’intensità per fasce di %1RM',
  dove:'Pesi (pannello laterale) · Progressi',
  a:`Classifica ogni serie secondo l'intensità relativa (%1RM) e mostra quante serie cadono in ciascuna fascia: forza, forza+ipertrofia, ipertrofia, resistenza, metabolico. Descrive l'enfasi dell'allenamento.`,
  s:[['Cosa mostra',`In <b>Pesi</b>: la quota delle serie della scheda in scrittura per fascia (barra a segmenti). In <b>Progressi</b>: le serie dell'ultima settimana salvata per fascia (barre).`],
   ['Dati di partenza',`Peso, ripetizioni, eventuale RIR e serie di ogni riga; per trazioni, dip e leg raise anche il peso corporeo.`],
   ['Metodo e formule',`Massimale stimato con la formula scelta nel profilo (predefinita Epley):
     <div class="spf">1RM<sub>Epley</sub> = <i>C</i> × (1 + <span class="fr"><i>r</i><i>30</i></span>) · 1RM<sub>Brzycki</sub> = <i>C</i> × <span class="fr"><i>36</i><i>37 − r</i></span> (r ≤ 10) · 1RM<sub>Lombardi</sub> = <i>C</i> × r<sup>0,10</sup><span class="spn">(1)</span></div>
     <div class="spf">%1RM = <span class="fr"><i>C</i><i>1RM</i></span> × 100<span class="spn">(2)</span></div>
     dove <i>r</i> = ripetizioni (+ RIR se «RIR nei calcoli» è attivo). Fasce: Forza ≥ 90%, Forza+Iper 80–89%, Ipertrofia 70–79%, Resistenza 60–69%, Metabolico 50–59%; sotto il 50% la serie non entra.`],
   ['Esempio svolto',`Squat 4 × 5 a 100 kg → %1RM 85,7% → <b>Forza+Iper</b>, 4 serie. Panca 3 × 8 a 70 kg → %1RM 78,9% → <b>Ipertrofia</b>, 3 serie. Quote: 57% e 43%. Con RIR 2 dichiarato sulla panca, <i>r</i> = 10 → 1RM 93,3 kg → %1RM 75%: resta Ipertrofia.`],
   ['Come leggerlo',`Una settimana tutta in una fascia è monotona; programmi di forza spostano il peso verso le prime due, programmi di ipertrofia verso il centro. Le fasce sono una lettura, non un obiettivo.`],
   ['Limiti',`%1RM è calcolata sul massimale stimato dalla stessa serie: con molte ripetizioni (oltre 10–12) le formule perdono precisione e tendono a sottostimare l'intensità. Il RIR è una stima soggettiva. Le soglie delle fasce sono convenzioni didattiche, con ampia sovrapposizione negli effetti.`]],
  b:['Epley B (1985). <i>Poundage chart</i>. Boyd Epley Workout.',
     'Brzycki M (1993). Strength testing — predicting a one-rep max from reps-to-fatigue. <i>J Phys Educ Recreat Dance</i> 64(1):88–90.',
     'Lombardi VP (1989). <i>Beginning weight training</i>. Dubuque: W.C. Brown.',
     'Zourdos MC et al. (2016). Novel resistance training-specific RPE scale measuring repetitions in reserve. <i>J Strength Cond Res</i> 30(1):267–275.',
     'Haff GG, Triplett NT (2016). <i>Essentials of Strength Training and Conditioning</i>, 4ª ed. Champaign: Human Kinetics.']},

'tl':{t:'Training Load totale e media mobile',
  dove:'Progressi',
  a:`Il Training Load (TL) riassume in un numero il lavoro coi pesi di una settimana, combinando volume e intensità relativa. La media mobile sulle ultime quattro settimane rappresenta il carico a cui l'atleta è abituato (carico cronico).`,
  s:[['Cosa mostra',`Una linea con il TL di ogni settimana salvata e una seconda linea con la media mobile di 4 settimane.`],
   ['Dati di partenza',`Le righe dello Storico (esclusi i test del massimale ★), filtrate per Training Set se scelto in «Dati da analizzare».`],
   ['Metodo e formule',`<div class="spf">TL<sub>sett</sub> = Σ<sub>righe</sub> serie × rip × <i>C</i> × <span class="fr"><i>%1RM</i><i>100</i></span> × <i>f</i><span class="spn">(1)</span></div>
     Poiché %1RM = <i>C</i>/1RM, il prodotto <i>C</i> × %1RM/100 vale <i>C</i>²/1RM: a parità di ripetizioni pesa di più il lavoro vicino al massimale.
     <div class="spf">Cronico<sub>t</sub> = <span class="fr"><i>Σ TL delle settimane t−3 … t</i><i>n</i></span><span class="spn">(2)</span></div>
     Le settimane sono di <b>calendario</b>: una settimana senza registrazioni vale zero; <i>n</i> = 4, ma all'inizio dello storico conta solo le settimane già trascorse. Chi registra con un ritmo diverso da quello settimanale (distanza mediana fra due salvataggi maggiore di 1), o filtra un Training Set, ottiene la media delle ultime 4 registrazioni.`],
   ['Esempio svolto',`Settimana con squat 4 × 5 a 100 kg (TL 1 629) e panca 3 × 8 a 70 kg (TL 1 260): TL = 2 889. Se le tre settimane precedenti valevano 2 700, 2 800 e 2 650, la media mobile è (2 700 + 2 800 + 2 650 + 2 889) / 4 = 2 760.`],
   ['Come leggerlo',`Conta l'andamento, non il valore assoluto: una crescita graduale con la media mobile che segue indica progressione sostenibile; un TL molto sopra la media è un salto di carico (vedi ACWR); un calo prolungato è scarico o interruzione.`],
   ['Limiti',`Il TL non distingue fra gruppi muscolari né misura la fatica percepita. Dipende dalla formula del 1RM e dal fattore dell'esercizio, che è una stima. Non è confrontabile fra atleti.`]],
  b:['Haff GG (2010). Quantifying workloads in resistance training: a brief review. <i>Professional Strength &amp; Conditioning</i> (UKSCA) 19:31–40.',
     'McBride JM et al. (2009). Comparison of methods to quantify volume during resistance exercise. <i>J Strength Cond Res</i> 23(1):106–110.']},

'acwr':{t:'Rapporto acuto:cronico (ACWR)',
  dove:'Progressi',
  a:`L'ACWR confronta il carico dell'ultima settimana con quello medio delle ultime quattro. Valori fra 0,8 e 1,3 indicano un carico coerente con l'abitudine; valori alti segnalano un aumento brusco, associato in letteratura a un rischio maggiore di sovraccarico.`,
  s:[['Cosa mostra',`Una linea con l'ACWR di ogni settimana e una fascia verde fra 0,8 e 1,3. Nei «Segnali» sopra i grafici: oltre 1,5 «carico molto alto», sotto 0,8 «carico basso».`],
   ['Dati di partenza',`Il TL settimanale dello Storico (vedi «Training Load totale»).`],
   ['Metodo e formule',`<div class="spf">ACWR<sub>t</sub> = <span class="fr"><i>TL<sub>t</sub></i><i>Cronico<sub>t</sub></i></span>, &nbsp; Cronico<sub>t</sub> = <span class="fr"><i>Σ<sub>k=t−3…t</sub> TL<sub>k</sub></i><i>n</i></span><span class="spn">(1)</span></div>
     Il carico cronico comprende la settimana corrente (modello «accoppiato») e conta le settimane di calendario: quelle senza allenamento valgono zero. Con ritmo di registrazione non settimanale, o filtrando un Training Set, si usano le ultime 4 registrazioni.`],
   ['Esempio svolto',`TL delle ultime quattro settimane: 10 000, 11 000, 10 500, 14 000. Cronico = 45 500 / 4 = 11 375; ACWR = 14 000 / 11 375 = <b>1,23</b> (in zona). Dopo tre settimane di stop (0, 0, 0) e un rientro a 14 000: cronico = 3 500, ACWR = <b>4,0</b> → segnale di carico molto alto, perché l'atleta non è più abituato a quel volume.`],
   ['Come leggerlo',`Con un filtro di periodo o di alimentazione l'ACWR resta calcolato su tutta la storia (il carico cronico di una settimana dipende da quelle prima, anche se escluse): si mostrano solo le settimane scelte. È un segnale di progressione troppo rapida, non una diagnosi. Sopra 1,5 conviene valutare uno scarico o un aumento più graduale; sotto 0,8 per più settimane il carico sta calando (voluto in uno scarico, altrimenti da rivedere).`],
   ['Limiti',`L'ACWR è stato criticato per motivi statistici (accoppiamento fra numeratore e denominatore, instabilità con carichi cronici bassi) e la relazione con gli infortuni è stata dimostrata soprattutto negli sport di squadra. Le soglie 0,8–1,3 e 1,5 sono indicative.`]],
  b:['Gabbett TJ (2016). The training–injury prevention paradox: should athletes be training smarter and harder? <i>Br J Sports Med</i> 50(5):273–280.',
     'Hulin BT, Gabbett TJ, Lawson DW, Caputi P, Sampson JA (2016). The acute:chronic workload ratio predicts injury. <i>Br J Sports Med</i> 50(4):231–236.',
     'Impellizzeri FM et al. (2020). Acute:chronic workload ratio: conceptual issues and fundamental pitfalls. <i>Int J Sports Physiol Perform</i> 15(6):907–913.']},

'tonnellaggio':{t:'Tonnellaggio settimanale',
  dove:'Progressi',
  a:`Il tonnellaggio (volume load) è la massa totale sollevata in una settimana: serie × ripetizioni × carico. È la misura di volume più semplice e diffusa.`,
  s:[['Cosa mostra',`Una linea con i chilogrammi totali sollevati in ogni settimana salvata.`],
   ['Dati di partenza',`Serie, ripetizioni e peso delle righe dello Storico (esclusi i test ★); per trazioni, dip e leg raise anche il peso corporeo della settimana.`],
   ['Metodo e formule',`<div class="spf">Tonnellaggio = Σ<sub>righe</sub> serie × rip × <i>C</i>, &nbsp; <i>C</i> = zavorra + peso corporeo × quota<span class="spn">(1)</span></div>
     La quota è 1 per trazioni e dip, 0,40 (uomo) o 0,42 (donna) per i leg raise a gambe tese, 0,25 a ginocchia piegate, 0 per gli altri esercizi. Il peso corporeo è quello misurato nella stessa settimana, altrimenti il più vicino.`],
   ['Esempio svolto',`Squat 4 × 5 a 100 kg = 2 000 kg; panca 3 × 8 a 70 kg = 1 680 kg; trazioni 3 × 8 con 10 kg di zavorra e corpo di 80 kg = 3 × 8 × 90 = 2 160 kg. Totale = <b>5 840 kg</b>.`],
   ['Come leggerlo',`Cresce con il volume e con il carico. A differenza del TL non tiene conto dell'intensità relativa: 10 ripetizioni leggere e 10 pesanti allo stesso peso totale valgono uguale. Utile per seguire il volume nelle fasi di accumulo.`],
   ['Limiti',`Somma esercizi molto diversi (una ripetizione di stacco e una di curl valgono per i chili sollevati), quindi va confrontato solo con sé stesso nel tempo.`]],
  b:['McBride JM et al. (2009). Comparison of methods to quantify volume during resistance exercise. <i>J Strength Cond Res</i> 23(1):106–110.',
     'de Leva P (1996). Adjustments to Zatsiorsky-Seluyanov’s segment inertia parameters. <i>J Biomech</i> 29(9):1223–1230.']},

'delta-tl':{t:'Variazione percentuale del Training Load',
  dove:'Progressi',
  a:`Misura di quanto cambia il TL da una settimana salvata alla precedente, in percentuale. Evidenzia salti e cali di carico più chiaramente della curva assoluta.`,
  s:[['Cosa mostra',`Una linea con la variazione percentuale del TL rispetto alla registrazione precedente.`],
   ['Dati di partenza',`Il TL settimanale (vedi «Training Load totale»).`],
   ['Metodo e formule',`<div class="spf">ΔTL%<sub>t</sub> = ( <span class="fr"><i>TL<sub>t</sub></i><i>TL<sub>t−1</sub></i></span> − 1 ) × 100<span class="spn">(1)</span></div>
     dove <i>t</i>−1 è la registrazione precedente (non necessariamente la settimana di calendario precedente). Il primo punto non ha confronto. Con un filtro di periodo o di alimentazione attivo, alla ripresa dopo uno stacco (settimane escluse dal filtro in mezzo) il punto manca: non si confronta con la settimana prima dello stacco.`],
   ['Esempio svolto',`TL 2 889 → 3 100: ΔTL% = (3 100 / 2 889 − 1) × 100 = <b>+7,3%</b>. TL 3 100 → 2 500: −19,4%.`],
   ['Come leggerlo',`Oscillazioni contenute (circa ±3–10%) indicano una progressione regolare; picchi positivi grandi sono salti di carico, picchi negativi scarichi o settimane incomplete.`],
   ['Limiti',`Se fra due registrazioni passano più settimane il confronto le ignora: in quel caso l'ACWR su settimane di calendario è più informativo.`]],
  b:['Gabbett TJ (2016). The training–injury prevention paradox. <i>Br J Sports Med</i> 50(5):273–280.']},

'srpe':{t:'Carico interno settimanale (session-RPE)',
  dove:'Progressi (con Session-RPE attivo nel profilo)',
  a:`Il carico interno stima lo sforzo percepito: per ogni seduta si moltiplica l'RPE (0–10) per la durata in minuti, ottenendo unità arbitrarie (AU). Complementa il carico esterno (TL), che misura il lavoro svolto.`,
  s:[['Cosa mostra',`Una linea con la somma settimanale delle AU delle sedute coi pesi.`],
   ['Dati di partenza',`RPE e minuti per giorno inseriti nella scheda Pesi e salvati nello Storico (abilitando «Session-RPE» nell'anagrafica).`],
   ['Metodo e formule',`<div class="spf">Carico<sub>seduta</sub> = RPE × minuti &nbsp;[AU] · Carico<sub>sett</sub> = Σ<sub>giorni</sub> Carico<sub>seduta</sub><span class="spn">(1)</span></div>`],
   ['Esempio svolto',`Lunedì RPE 7 per 60 min = 420 AU; mercoledì RPE 8 per 70 min = 560 AU; venerdì RPE 6 per 50 min = 300 AU. Settimana = <b>1 280 AU</b>.`],
   ['Come leggerlo',`Se il carico interno sale più del carico esterno, la stessa quantità di lavoro costa più fatica (stanchezza, poco recupero, stress). Si legge insieme a monotonia, strain e «Interno vs esterno».`],
   ['Limiti',`L'RPE è soggettivo e dipende dal momento in cui si raccoglie (Foster raccomanda circa 30 minuti dopo la seduta). Le AU non sono confrontabili fra persone diverse.`]],
  b:['Foster C, Florhaug JA, Franklin J et al. (2001). A new approach to monitoring exercise training. <i>J Strength Cond Res</i> 15(1):109–115.',
     'Haddad M, Stylianides G, Djaoui L, Dellal A, Chamari K (2017). Session-RPE method for training load monitoring: validity, ecological usefulness, and influencing factors. <i>Front Neurosci</i> 11:612.']},

'monotonia':{t:'Monotonia dell’allenamento',
  dove:'Progressi (con Session-RPE attivo)',
  a:`La monotonia di Foster misura quanto la settimana è uniforme: è il rapporto fra il carico medio giornaliero e la sua deviazione standard. Valori alti indicano giorni tutti uguali, con poco recupero alternato.`,
  s:[['Cosa mostra',`Una linea con la monotonia settimanale e una fascia verde fino a 2.`],
   ['Dati di partenza',`Il carico di ogni giorno (RPE × minuti) sui 7 giorni della settimana; i giorni senza allenamento valgono 0.`],
   ['Metodo e formule',`<div class="spf">Monotonia = <span class="fr"><i>x̄</i><i>σ</i></span>, &nbsp; x̄ = <span class="fr"><i>Σ<sub>d=1…7</sub> x<sub>d</sub></i><i>7</i></span>, &nbsp; σ = √( <span class="fr"><i>Σ (x<sub>d</sub> − x̄)²</i><i>7</i></span> )<span class="spn">(1)</span></div>
     Deviazione standard di popolazione sui 7 giorni, riposi compresi; se σ = 0 la monotonia non è definita.`],
   ['Esempio svolto',`Carichi [420, 0, 560, 0, 300, 0, 0]: x̄ = 182,9; σ = 222,3; monotonia = <b>0,82</b>. Cinque giorni quasi uguali (420, 400, 410, 430, 420) e due riposi: monotonia = <b>1,58</b>.`],
   ['Come leggerlo',`Sopra 2, soprattutto con carico alto, Foster ha osservato più episodi di malattia e sovrallenamento: conviene alternare giorni duri e leggeri o inserire un riposo. Nei «Segnali» l'app avvisa quando la monotonia supera 2.`],
   ['Limiti',`Con pochi giorni registrati la stima è instabile; la soglia 2 viene da osservazioni su atleti di resistenza e va presa come indicazione.`]],
  b:['Foster C (1998). Monitoring training in athletes with reference to overtraining syndrome. <i>Med Sci Sports Exerc</i> 30(7):1164–1168.',
     'Foster C et al. (2001). A new approach to monitoring exercise training. <i>J Strength Cond Res</i> 15(1):109–115.']},

'strain':{t:'Strain (carico × monotonia)',
  dove:'Progressi (con Session-RPE attivo)',
  a:`Lo strain di Foster combina quantità e uniformità del carico interno: una settimana pesante e monotona produce uno strain alto. È l'indice che Foster ha associato più direttamente a malattia e sovrallenamento.`,
  s:[['Cosa mostra',`Una linea con lo strain di ogni settimana.`],
   ['Dati di partenza',`Carico interno settimanale e monotonia (vedi le rispettive note).`],
   ['Metodo e formule',`<div class="spf">Strain = Carico<sub>sett</sub> × Monotonia<span class="spn">(1)</span></div>`],
   ['Esempio svolto',`Carico 1 280 AU, monotonia 0,82 → strain = <b>1 053</b>. Carico 2 080 AU su cinque giorni simili (monotonia 1,58) → strain = <b>3 285</b>: tre volte tanto con il 60% di carico in più.`],
   ['Come leggerlo',`Va seguito nel tempo: picchi isolati dopo settimane stabili segnalano accumulo di fatica. Non esiste una soglia universale.`],
   ['Limiti',`Eredita i limiti dell'RPE e della monotonia; le unità sono arbitrarie e individuali.`]],
  b:['Foster C (1998). Monitoring training in athletes with reference to overtraining syndrome. <i>Med Sci Sports Exerc</i> 30(7):1164–1168.']},

'interno-esterno':{t:'Carico interno contro carico esterno',
  dove:'Progressi (con Session-RPE attivo)',
  a:`Confronta l'andamento del carico interno (sRPE) e del carico esterno (TL) su una scala comune, ponendo entrambi a 100 nella prima settimana con dati. Se le due curve si separano, cambia il costo percepito del lavoro.`,
  s:[['Cosa mostra',`Due linee indicizzate: sRPE e TL.`],
   ['Dati di partenza',`Carico interno settimanale (RPE × minuti) e TL settimanale.`],
   ['Metodo e formule',`<div class="spf">Indice<sub>t</sub> = <span class="fr"><i>valore<sub>t</sub></i><i>valore<sub>base</sub></i></span> × 100<span class="spn">(1)</span></div>
     La base di ciascuna serie è il primo valore diverso da zero.`],
   ['Esempio svolto',`Prima settimana: sRPE 1 000 AU, TL 10 000 → entrambi 100. Quinta settimana: sRPE 1 300, TL 11 000 → 130 e 110: lo sforzo percepito è cresciuto il doppio del lavoro.`],
   ['Come leggerlo',`Interno sopra esterno: lo stesso lavoro pesa di più (fatica, sonno, stress, poco recupero). Interno sotto esterno: l'atleta tollera meglio il carico (adattamento).`],
   ['Limiti',`L'indice dipende dalla settimana base: se è anomala, tutta la curva ne risente.`]],
  b:['Impellizzeri FM, Marcora SM, Coutts AJ (2019). Internal and external training load: 15 years on. <i>Int J Sports Physiol Perform</i> 14(2):270–273.',
     'Foster C et al. (2001). A new approach to monitoring exercise training. <i>J Strength Cond Res</i> 15(1):109–115.']},

'tl-gruppo':{t:'Training Load per gruppo muscolare',
  dove:'Progressi',
  a:`Scompone il TL settimanale fra i gruppi muscolari, per vedere nel tempo quali distretti ricevono più carico e quali vengono trascurati.`,
  s:[['Cosa mostra',`Una linea per gruppo con il TL settimanale.`],
   ['Dati di partenza',`Le righe dello Storico con il loro gruppo (il gruppo principale dell'esercizio, salvato nella riga).`],
   ['Metodo e formule',`<div class="spf">TL<sub>g,sett</sub> = Σ<sub>righe del gruppo g</sub> TL<sub>riga</sub><span class="spn">(1)</span></div>
     Qui il TL va <b>tutto</b> al gruppo principale dell'esercizio: non si divide fra primari e secondari come le serie.`],
   ['Esempio svolto',`Squat (Gambe) TL 1 629, panca (Pettorali) TL 1 260: Gambe 1 629, Pettorali 1 260, nessun TL a Spalle e Braccia anche se lavorano di riflesso.`],
   ['Come leggerlo',`Una linea che scende per settimane indica un gruppo messo da parte; un gruppo che domina il TL totale indica una scheda sbilanciata. Per l'equilibrio fine usa la ragnatela.`],
   ['Limiti',`L'attribuzione a un solo gruppo sovrastima il gruppo principale degli esercizi multiarticolari e sottostima gli altri.`]],
  b:['Haff GG (2010). Quantifying workloads in resistance training: a brief review. <i>Professional Strength &amp; Conditioning</i> (UKSCA) 19:31–40.']},

'progressione':{t:'Progressione del massimale stimato',
  dove:'Progressi · Esercizi (scheda dell’esercizio)',
  a:`Segue nel tempo il massimale stimato (1RM) di un esercizio, ricavato dalle serie registrate, insieme al carico massimo usato. È l'indicatore più diretto della forza in quel gesto.`,
  s:[['Cosa mostra',`Per ogni settimana in cui l'esercizio è stato fatto: il 1RM stimato più alto e il peso più alto (in Esercizi solo il 1RM).`],
   ['Dati di partenza',`Peso, ripetizioni ed eventuale RIR delle righe dello Storico per quell'esercizio; il peso corporeo per gli esercizi a corpo libero.`],
   ['Metodo e formule',`<div class="spf">1RM = <i>C</i> × (1 + <span class="fr"><i>r</i><i>30</i></span>) &nbsp;(Epley; oppure Brzycki, Lombardi o media delle tre)<span class="spn">(1)</span></div>
     <i>C</i> = zavorra + peso corporeo × quota; <i>r</i> = ripetizioni (+ RIR se attivo). Per trazioni, dip e leg raise si <b>mostra</b> la zavorra: 1RM<sub>mostrato</sub> = 1RM − peso corporeo × quota. Per ogni settimana si prende il massimo fra le righe.`],
   ['Esempio svolto',`Trazioni 3 × 6 con 15 kg di zavorra, corpo 80 kg: <i>C</i> = 95 kg, 1RM = 95 × (1 + 6/30) = 114 kg; si legge <b>34 kg</b> («quanto potresti appenderti per una singola»). Squat 5 × 5 a 100 kg → 116,7 kg.`],
   ['Come leggerlo',`Una pendenza positiva indica guadagno di forza; se il Training Load dell'esercizio resta fermo per 3 o più schede, l'esercizio compare fra i «Segnali» come stallo. Settimane di scarico abbassano il punto senza che la forza sia calata.`],
   ['Limiti',`Le formule sono stime: sono più precise fra 2 e 10 ripetizioni; con serie lunghe l'errore cresce. Lo stile di esecuzione e la stanchezza cambiano il valore.`]],
  b:['Epley B (1985). <i>Poundage chart</i>. Boyd Epley Workout.',
     'Brzycki M (1993). Strength testing — predicting a one-rep max from reps-to-fatigue. <i>J Phys Educ Recreat Dance</i> 64(1):88–90.',
     'LeSuer DA, McCormick JH, Mayhew JL, Wasserstein RL, Arnold MD (1997). The accuracy of prediction equations for estimating 1-RM performance. <i>J Strength Cond Res</i> 11(4):211–213.']},

'progresso-reale':{t:'Progresso reale a parità di esercizi',
  dove:'Progressi (sezione «Forza e record»)',
  a:`Misura quanto cresci davvero senza farti ingannare dai cambi scheda. Il TL totale salta quando cambi esercizi, serie o ripetizioni, anche se la forza non è cambiata. Qui ogni settimana si confronta con la precedente <b>solo sugli esercizi che ci sono in tutte e due</b>, e le variazioni si mettono in fila a catena, con base 100 alla prima settimana.`,
  s:[['Cosa mostra',`Tre numeri e tre linee, tutte a 100 sulla prima settimana dei dati scelti:
     <ul><li><b>TL totale (grezzo)</b>, a puntini: il TL di sempre, coi suoi salti. Sotto il numero, il calo e la salita più grandi da una settimana all'altra.</li>
     <li><b>TL a parità di esercizi</b>, tratteggiata: il TL per serie degli esercizi ripetuti.</li>
     <li><b>Forza a parità di esercizi</b>, la linea piena: il massimale stimato (1RM) degli esercizi ripetuti. È la principale.</li></ul>
     Sopra ogni linea il numero grande è la variazione da inizio a fine periodo; sotto, la pendenza in % al mese degli ultimi 3 mesi (o di tutto il periodo, se è più corto). Il cerchietto vuoto segna le settimane di cambio scheda saltate.`],
   ['Dati di partenza',`Le righe dello Storico (esclusi i test del massimale ★): per ogni esercizio e settimana il TL, il numero di serie e il 1RM stimato più alto, calcolati come nel resto dell'app (corpo libero compreso). Segue il filtro «Dati da analizzare».`],
   ['Metodo e formule',`Per ogni coppia di settimane salvate consecutive, anche con una pausa in mezzo, si prendono gli esercizi <i>e</i> presenti in tutte e due. Per ognuno il rapporto:
     <div class="spf">r<sub>e</sub> = <span class="fr"><i>1RM<sub>e,t</sub></i><i>1RM<sub>e,t−1</sub></i></span> &nbsp;(forza) &nbsp;oppure&nbsp; r<sub>e</sub> = <span class="fr"><i>TL<sub>e,t</sub> / serie<sub>e,t</sub></i><i>TL<sub>e,t−1</sub> / serie<sub>e,t−1</sub></i></span> &nbsp;(TL)<span class="spn">(1)</span></div>
     Il passo della settimana è la media <b>geometrica</b> dei rapporti, pesata sul TL medio dell'esercizio nelle due settimane (<i>p<sub>e</sub></i>), e l'indice è il prodotto dei passi:
     <div class="spf">R<sub>t</sub> = exp( <span class="fr"><i>Σ<sub>e</sub> p<sub>e</sub> · ln r<sub>e</sub></i><i>Σ<sub>e</sub> p<sub>e</sub></i></span> ) &nbsp;&nbsp;&nbsp; I<sub>t</sub> = I<sub>t−1</sub> × R<sub>t</sub>, &nbsp; I<sub>0</sub> = 100<span class="spn">(2)</span></div>
     Tre regole:
     <ul><li><b>Cambio scheda</b>: se gli esercizi in comune sono meno di 3, o coprono meno di metà del TL di una delle due settimane, il passo non conta (R = 1) e l'indice riparte da lì.</li>
     <li><b>Fuori misura</b>: un esercizio con r<sub>e</sub> sopra 1,2 o sotto 1/1,2 (cioè oltre +20 % o −17 % in una settimana) non conta per quel passo: di solito è un'altra macchina o variante con lo stesso nome, o un errore di battitura.</li>
     <li><b>Pause</b>: contano. Il calo dopo uno stop è vero; toglierlo farebbe contare le risalite senza i cali e gonfierebbe il progresso.</li>
     <li><b>Stacchi</b>: con un filtro di periodo o di alimentazione (per esempio solo i Bulk), alla ripresa dopo le settimane escluse il passo non conta e l'indice riparte dal livello raggiunto; nel grafico lo stacco è lo spazio fra due linee tratteggiate.</li></ul>
     La % al mese è la pendenza della retta dei minimi quadrati su ln I<sub>t</sub> rispetto ai giorni, nelle settimane degli ultimi 91 giorni (almeno 3, distanti almeno 3 settimane), trasformata in mese da 30,44 giorni: (e<sup>b·30,44</sup> − 1) × 100.`],
   ['Esempio svolto',`Settimana 1: Squat 1RM 160 kg (TL 2 000), Panca 100 kg (TL 1 200), Rematore 90 kg (TL 800). Settimana 2: Squat 164, Panca 101, Rematore 90, più un Hip thrust nuovo e un Lat Pull Over passato da 20 a 60 kg perché cambia macchina.
     <div class="spf">r: Squat 1,025 · Panca 1,010 · Rematore 1,000 · Hip thrust escluso (non c'era) · Lat Pull Over escluso (×3)</div>
     <div class="spf">R = exp( (2 000 × ln 1,025 + 1 200 × ln 1,010 + 800 × ln 1) ÷ 4 000 ) = exp(0,0153) = 1,0155</div>
     L'indice passa da 100 a <b>101,5</b>: +1,5 %, anche se il TL totale, con l'esercizio nuovo e la macchina più pesante, magari è salito del 15 %. Se la settimana dopo la scheda cambia quasi tutta (in comune il 38 % del TL), quel passo si salta e l'indice resta 101,5.`],
   ['Come leggerlo',`Guarda la linea piena: se sale con regolarità, la forza cresce, qualunque scheda tu stia facendo. Se si appiattisce per settimane mentre il TL totale sale, stai aggiungendo volume senza diventare più forte. Se il TL a parità di esercizi sale molto più della forza, il progresso viene soprattutto da più ripetizioni. Dopo una pausa un calo di pochi punti è normale.`],
   ['Limiti',`Il 1RM è una stima, meno precisa oltre le 10 ripetizioni: sugli esercizi da 15–20 ripetizioni la forza si legge peggio. Il TL per serie cresce più del 1RM con le ripetizioni e cambia se la scheda cambia lo schema (da 3 × 11 a 3 × 6 cala anche se sei più forte). Le soglie (3 esercizi, metà del TL, ±20 %) sono scelte pratiche, provate su uno storico reale di 39 settimane. Un indice a catena accumula i piccoli errori di ogni passo: su molti mesi va letto come tendenza, non al decimale.`]],
  b:['International Labour Office, IMF, OECD, Eurostat, UNECE, World Bank (2004). <i>Consumer Price Index Manual: Theory and Practice</i>. Geneva: ILO — capitoli sugli indici a catena e sul confronto a parità di articoli (matched models).',
     'Epley B (1985). <i>Poundage chart</i>. Boyd Epley Workout.']},

'storico-carico':{t:'Carico per settimana nello Storico',
  dove:'Storico (pannello laterale)',
  a:`Riassume il Training Load delle righe attualmente filtrate nello Storico, settimana per settimana, per vedere a colpo d'occhio come si è distribuito il carico.`,
  s:[['Cosa mostra',`Le ultime 12 settimane (dalla più recente), ciascuna con una barra proporzionale al suo TL; in alto il numero di settimane e il TL medio.`],
   ['Dati di partenza',`Le righe dello Storico che passano i filtri della tabella (esercizio, gruppo, scheda), esclusi i test ★.`],
   ['Metodo e formule',`<div class="spf">TL<sub>sett</sub> = Σ<sub>righe filtrate</sub> TL<sub>riga</sub> · TL medio = <span class="fr"><i>Σ<sub>sett</sub> TL<sub>sett</sub></i><i>numero di settimane</i></span><span class="spn">(1)</span></div>
     La barra è TL<sub>sett</sub> ÷ TL<sub>max</sub> delle 12 mostrate.`],
   ['Esempio svolto',`Filtrando «Squat con bilanciere»: tre settimane con TL 1 629, 1 800, 1 700 → media 1 710; la seconda è la barra piena.`],
   ['Come leggerlo',`Con un filtro su un esercizio diventa il suo andamento di carico; senza filtri è il carico totale.`],
   ['Limiti',`Le settimane senza righe non compaiono (non valgono zero come nell'ACWR).`]],
  b:['McBride JM et al. (2009). Comparison of methods to quantify volume during resistance exercise. <i>J Strength Cond Res</i> 23(1):106–110.']},

'storico-esercizi':{t:'Esercizi che pesano di più sul carico',
  dove:'Storico (pannello laterale)',
  a:`Ordina gli esercizi delle righe filtrate per la quota del Training Load che portano, per capire su quali gesti si concentra il lavoro.`,
  s:[['Cosa mostra',`I 7 esercizi con più TL, con barra e percentuale sul TL totale delle righe filtrate.`],
   ['Dati di partenza',`Le righe filtrate dello Storico (esclusi i test).`],
   ['Metodo e formule',`<div class="spf">Quota<sub>es</sub> = <span class="fr"><i>Σ TL delle righe dell'esercizio</i><i>Σ TL di tutte le righe filtrate</i></span> × 100<span class="spn">(1)</span></div>`],
   ['Esempio svolto',`Su un TL totale di 30 000: squat 9 000 (30%), panca 6 000 (20%), stacco 4 500 (15%).`],
   ['Come leggerlo',`Un esercizio che supera da solo un terzo del carico domina la programmazione; utile per decidere varianti o ridistribuire.`],
   ['Limiti',`Il TL favorisce gli esercizi con carichi alti e fattore alto: gli isolamenti risultano sempre piccoli anche se importanti.`]],
  b:['Haff GG (2010). Quantifying workloads in resistance training: a brief review. <i>Professional Strength &amp; Conditioning</i> (UKSCA) 19:31–40.']},

'cardio-settimana':{t:'Minuti di attività cardio rispetto alle linee guida',
  dove:'Cardio (pannello laterale)',
  a:`Confronta i minuti di cardio della settimana in corso con le linee guida dell'Organizzazione Mondiale della Sanità per gli adulti: 150–300 minuti a settimana di attività aerobica moderata.`,
  s:[['Cosa mostra',`I minuti della settimana ISO corrente, una barra che arriva piena a 300 minuti con una tacca a 150, e la scritta «sotto», «nella» o «oltre la zona consigliata».`],
   ['Dati di partenza',`Durata delle attività registrate nel tab Cardio con data nella settimana corrente (da lunedì a domenica).`],
   ['Metodo e formule',`<div class="spf">Minuti<sub>sett</sub> = Σ durata · Barra = min(100, Minuti<sub>sett</sub> ÷ 300 × 100)<span class="spn">(1)</span></div>
     Stato: sotto 150 → sotto la zona; 150–300 → nella zona; oltre 300 → oltre.`],
   ['Esempio svolto',`Corsa 45 min, bici 60 min, nuoto 30 min = <b>135 min</b>: barra al 45%, prima della tacca, «sotto la zona consigliata». Con altri 20 minuti si entra nella zona.`],
   ['Come leggerlo',`La zona è un minimo per la salute, non un limite: oltre 300 minuti i benefici continuano, ma serve gestire il recupero.`],
   ['Limiti',`L'OMS indica in alternativa 75–150 minuti di attività vigorosa: l'app conta tutti i minuti come moderati, quindi sottostima chi fa allenamenti intensi.`]],
  b:['World Health Organization (2020). <i>WHO guidelines on physical activity and sedentary behaviour</i>. Ginevra: WHO.',
     'Bull FC et al. (2020). World Health Organization 2020 guidelines on physical activity and sedentary behaviour. <i>Br J Sports Med</i> 54(24):1451–1462.']},

'cardio-carico':{t:'Carico interno delle attività cardio (sRPE)',
  dove:'Cardio (pannello laterale) · Progressi (cardio per sport)',
  a:`Le attività cardio non hanno serie e carichi: il loro carico si misura come carico interno, RPE della seduta per la durata, in unità arbitrarie (AU), lo stesso metodo usato per le sedute coi pesi.`,
  s:[['Cosa mostra',`Nel pannello del Cardio: le ultime 8 settimane con AU e minuti. In Progressi: l'sRPE di ogni seduta dello sport scelto.`],
   ['Dati di partenza',`RPE (0–10) e durata in minuti di ogni attività.`],
   ['Metodo e formule',`<div class="spf">sRPE<sub>seduta</sub> = arrotondamento(RPE × minuti) &nbsp;[AU]<span class="spn">(1)</span></div>
     <div class="spf">sRPE<sub>sett</sub> = Σ sRPE<sub>seduta</sub><span class="spn">(2)</span></div>
     Nel pannello la barra è proporzionale alle AU (o ai minuti se mancano gli RPE).`],
   ['Esempio svolto',`Corsa 45 minuti a RPE 6 = <b>270 AU</b>; bici 60 minuti a RPE 4 = 240 AU; settimana = 510 AU su 105 minuti.`],
   ['Come leggerlo',`A parità di minuti, AU più alte vogliono dire sedute più dure. Utile per bilanciare sedute intense e leggere e per sommare mentalmente il carico del cardio a quello dei pesi.`],
   ['Limiti',`L'RPE è soggettivo; le AU del cardio non entrano nel TL né nell'ACWR dei pesi.`]],
  b:['Foster C et al. (2001). A new approach to monitoring exercise training. <i>J Strength Cond Res</i> 15(1):109–115.']},

'cardio-sport':{t:'Ripartizione dei minuti fra gli sport',
  dove:'Cardio (pannello laterale)',
  a:`Mostra come si dividono i minuti di tutte le attività cardio registrate fra i diversi sport.`,
  s:[['Cosa mostra',`Fino a 8 sport, con barra, ore e percentuale sui minuti totali.`],
   ['Dati di partenza',`Tipo e durata di tutte le attività del tab Cardio.`],
   ['Metodo e formule',`<div class="spf">Quota<sub>sport</sub> = <span class="fr"><i>Σ minuti dello sport</i><i>Σ minuti di tutte le attività</i></span> × 100<span class="spn">(1)</span></div>`],
   ['Esempio svolto',`Corsa 600 min, bici 300, nuoto 100: corsa 10,0 h (60%), bici 5,0 h (30%), nuoto 1,7 h (10%).`],
   ['Come leggerlo',`Aiuta a vedere la varietà dell'allenamento aerobico e quanto pesa lo sport principale.`],
   ['Limiti',`Considera tutto lo storico, non solo il periodo recente; non tiene conto dell'intensità.`]],
  b:['World Health Organization (2020). <i>WHO guidelines on physical activity and sedentary behaviour</i>. Ginevra: WHO.']},

'cardio-fc':{t:'Frequenza cardiaca media per seduta',
  dove:'Progressi (cardio per sport)',
  a:`Segue la frequenza cardiaca media delle sedute di uno sport. Con la frequenza a riposo e quella massima permette di stimare il carico cardiovascolare (TRIMP di Banister).`,
  s:[['Cosa mostra',`Una linea con la FC media (battiti al minuto) di ogni seduta dello sport scelto.`],
   ['Dati di partenza',`FC media della seduta (inserita o importata dal file dell'orologio); FC a riposo e FC massima dal profilo, oppure FC massima stimata dall'età.`],
   ['Metodo e formule',`Riserva cardiaca usata (Karvonen) e TRIMP (Banister), mostrati nella tabella delle attività:
     <div class="spf">HRr = <span class="fr"><i>FC<sub>media</sub> − FC<sub>riposo</sub></i><i>FC<sub>max</sub> − FC<sub>riposo</sub></i></span> (fra 0 e 1)<span class="spn">(1)</span></div>
     <div class="spf">TRIMP = minuti × HRr × <i>y</i>, &nbsp; <i>y</i> = 0,64·e<sup>1,92·HRr</sup> (uomo) · 0,86·e<sup>1,67·HRr</sup> (donna)<span class="spn">(2)</span></div>
     <div class="spf">FC<sub>max</sub> stimata = 208 − 0,7 × età (Tanaka)<span class="spn">(3)</span></div>
     FC a riposo predefinita 60 se non indicata. Il picco della seduta conta solo se supera la FC massima nota o stimata.`],
   ['Esempio svolto',`Uomo, corsa 45 minuti a FC media 150, riposo 60, massima 190: HRr = 90/130 = 0,692; <i>y</i> = 0,64 × e<sup>1,329</sup> = 2,418; TRIMP = 45 × 0,692 × 2,418 = <b>75</b>.`],
   ['Come leggerlo',`A parità di passo o velocità, una FC media che scende nel tempo indica migliore efficienza aerobica; che sale, fatica o caldo.`],
   ['Limiti',`La FC risente di temperatura, idratazione, caffeina e stress. La formula di Tanaka ha un errore di circa ±10 bpm: meglio inserire la FC massima misurata.`]],
  b:['Banister EW (1991). Modeling elite athletic performance. In: MacDougall JD, Wenger HA, Green HJ (a cura di), <i>Physiological Testing of the High-Performance Athlete</i>. Champaign: Human Kinetics, 403–424.',
     'Karvonen MJ, Kentala E, Mustala O (1957). The effects of training on heart rate: a longitudinal study. <i>Ann Med Exp Biol Fenn</i> 35(3):307–315.',
     'Tanaka H, Monahan KD, Seals DR (2001). Age-predicted maximal heart rate revisited. <i>J Am Coll Cardiol</i> 37(1):153–156.']},

'cardio-distanza':{t:'Distanza per seduta',
  dove:'Progressi (cardio per sport)',
  a:`Segue i chilometri percorsi in ogni seduta degli sport che hanno una distanza (corsa, camminata, bici, nuoto, vogatore, sci di fondo…).`,
  s:[['Cosa mostra',`Una linea con la distanza in km di ogni seduta dello sport scelto.`],
   ['Dati di partenza',`Il campo distanza della seduta, inserito a mano o importato dal file dell'orologio.`],
   ['Metodo e formule',`Valore registrato, senza trasformazioni: <div class="spf">y<sub>seduta</sub> = distanza [km]</div>`],
   ['Esempio svolto',`Corse da 5,0 – 6,2 – 7,5 – 8,0 km: la linea mostra l'aumento del volume delle uscite.`],
   ['Come leggerlo',`Per gli sport di resistenza la distanza è la misura di volume principale; aumenti settimanali graduali riducono il rischio di sovraccarico.`],
   ['Limiti',`La distanza da GPS ha errori di qualche punto percentuale; su tapis roulant dipende dalla taratura della macchina.`]],
  b:['Nielsen RO et al. (2014). Excessive progression in weekly running distance and risk of running-related injuries. <i>J Orthop Sports Phys Ther</i> 44(10):739–747.']},

'cardio-passo':{t:'Passo medio (minuti al chilometro)',
  dove:'Progressi (cardio per sport: corsa, tapis roulant, camminata)',
  a:`Il passo medio è il tempo impiegato per percorrere un chilometro. Più è basso, più si è veloci.`,
  s:[['Cosa mostra',`Una linea col passo medio di ogni seduta, in minuti al chilometro.`],
   ['Dati di partenza',`Durata e distanza della seduta.`],
   ['Metodo e formule',`<div class="spf">Passo = <span class="fr"><i>durata [min]</i><i>distanza [km]</i></span> &nbsp;[min/km]<span class="spn">(1)</span></div>
     Nelle tabelle si mostra in minuti e secondi (m:ss).`],
   ['Esempio svolto',`45 minuti per 7,5 km: 45 / 7,5 = 6,00 → <b>6:00 /km</b>. 42 minuti per 7,5 km → 5:36 /km.`],
   ['Come leggerlo',`Una linea che scende indica sedute più veloci; va letta insieme alla FC media e alla distanza (lo stesso passo su una distanza più lunga è un miglioramento).`],
   ['Limiti',`È un valore medio: non distingue lavori a intervalli, salite e pause.`]],
  b:['Daniels J (2013). <i>Daniels’ Running Formula</i>, 3ª ed. Champaign: Human Kinetics.']},

'cardio-velocita':{t:'Velocità media',
  dove:'Progressi (cardio per sport: bici, cyclette, sci di fondo)',
  a:`La velocità media è la distanza percorsa in un'ora: per gli sport in cui si ragiona in km/h invece che in passo.`,
  s:[['Cosa mostra',`Una linea con la velocità media di ogni seduta in km/h.`],
   ['Dati di partenza',`Durata e distanza della seduta.`],
   ['Metodo e formule',`<div class="spf">Velocità = <span class="fr"><i>distanza [km]</i><i>durata [min] ÷ 60</i></span> &nbsp;[km/h]<span class="spn">(1)</span></div>`],
   ['Esempio svolto',`30 km in 75 minuti: 30 / 1,25 = <b>24,0 km/h</b>.`],
   ['Come leggerlo',`Una velocità che sale a parità di percorso e FC indica miglioramento; va confrontata su uscite simili (vento e dislivello la cambiano molto).`],
   ['Limiti',`Media sull'intera seduta, soste comprese se registrate nel tempo totale.`]],
  b:['Jeukendrup AE, Martin J (2001). Improving cycling performance: how should we spend our time and money. <i>Sports Med</i> 31(7):559–569.']},

'cardio-dislivello':{t:'Dislivello positivo per seduta',
  dove:'Progressi (cardio per sport all’aperto)',
  a:`Il dislivello positivo (D+) è la somma dei metri di salita di una seduta: misura quanto il percorso è stato impegnativo in verticale.`,
  s:[['Cosa mostra',`Una linea con i metri di D+ di ogni seduta dello sport scelto.`],
   ['Dati di partenza',`Il campo dislivello della seduta (inserito o dal file GPS).`],
   ['Metodo e formule',`Valore registrato: <div class="spf">D+ = Σ salite [m]</div>`],
   ['Esempio svolto',`Corsa collinare di 10 km con 250 m di D+; uscita in bici di 40 km con 600 m.`],
   ['Come leggerlo',`Spiega perché sedute con D+ alto hanno passo più lento e FC più alta: va letto insieme a quei grafici.`],
   ['Limiti',`Il D+ da GPS barometrico o satellitare differisce anche del 10–20% fra dispositivi.`]],
  b:['Minetti AE et al. (2002). Energy cost of walking and running at extreme uphill and downhill slopes. <i>J Appl Physiol</i> 93(3):1039–1046.']},

'composizione':{t:'Composizione corporea',
  dove:'Corpo',
  a:`Scompone il peso corporeo attuale in massa muscolare, massa grassa, massa ossea e resto, a partire dalle misure inserite (tipicamente da una bilancia a bioimpedenza).`,
  s:[['Cosa mostra',`Una barra divisa in quattro parti e i valori in kg e percentuale; in fondo la variazione di peso dalla prima misura registrata.`],
   ['Dati di partenza',`Peso, frazione di massa grassa (es. 0,145), massa muscolare e massa ossea in kg, dal tab Corpo.`],
   ['Metodo e formule',`<div class="spf">Grassa = peso × frazione grassa · Resto = peso − grassa − muscolare − ossea (mai sotto zero)<span class="spn">(1)</span></div>
     Ogni parte in percentuale: valore ÷ peso × 100. La massa magra (in Corpo) è peso − massa grassa.`],
   ['Esempio svolto',`Peso 80 kg, grassa 0,15, muscolare 60 kg, ossea 3,2 kg: grassa = 12 kg (15%); muscolare 75%; ossea 4%; resto 4,8 kg (6%).`],
   ['Come leggerlo',`In una ricomposizione il peso può restare fermo mentre la massa grassa scende e quella muscolare sale: guarda le parti, non solo il totale.`],
   ['Limiti',`La bioimpedenza dipende da idratazione, pasti e ora della misura (errore di alcuni punti percentuali): confronta misure prese nelle stesse condizioni. La «massa muscolare» delle bilance include acqua e altri tessuti magri.`]],
  b:['Kyle UG et al. (2004). Bioelectrical impedance analysis — part I: review of principles and methods. <i>Clin Nutr</i> 23(5):1226–1243.']},

'peso':{t:'Andamento del peso corporeo',
  dove:'Corpo',
  a:`Segue il peso corporeo misura dopo misura. È il dato più semplice per seguire una fase di massa, mantenimento o definizione.`,
  s:[['Cosa mostra',`Una linea con il peso di ogni misura salvata nello storico delle misure, datata per settimana.`],
   ['Dati di partenza',`Il peso salvato con «💾 Salva misure nello Storico».`],
   ['Metodo e formule',`Valore registrato: <div class="spf">y<sub>sett</sub> = peso [kg]</div> Il peso di ogni settimana serve anche per il carico degli esercizi a corpo libero di quella settimana.`],
   ['Esempio svolto',`80,0 → 80,4 → 80,9 → 81,1 kg in 4 settimane: circa +0,37 kg a settimana, ritmo tipico di una fase di massa.`],
   ['Come leggerlo',`Contano le tendenze di più settimane: le oscillazioni giornaliere (acqua, glicogeno, sale) arrivano a 1–2 kg. Pesarsi nelle stesse condizioni (mattino, a digiuno).`],
   ['Limiti',`Il peso non distingue grasso da massa magra: leggilo con la composizione.`]],
  b:['Hall KD et al. (2011). Quantification of the effect of energy imbalance on bodyweight. <i>Lancet</i> 378(9793):826–837.']},

'bmi':{t:'Indice di massa corporea (BMI)',
  dove:'Corpo',
  a:`Il BMI rapporta il peso al quadrato della statura. È un indicatore di popolazione per classificare sottopeso, normopeso, sovrappeso e obesità.`,
  s:[['Cosa mostra',`Una linea con il BMI di ogni misura salvata; nella scheda in alto la classe attuale.`],
   ['Dati di partenza',`Peso della misura e altezza dal profilo.`],
   ['Metodo e formule',`<div class="spf">BMI = <span class="fr"><i>peso [kg]</i><i>altezza [m]²</i></span><span class="spn">(1)</span></div>
     Classi OMS: sotto 18,5 sottopeso; 18,5–24,9 normopeso; 25–29,9 sovrappeso; da 30 obesità.`],
   ['Esempio svolto',`80 kg e 1,80 m: 80 / 3,24 = <b>24,7</b> → normopeso.`],
   ['Come leggerlo',`Per chi si allena coi pesi il BMI sale con la massa muscolare: un BMI «sovrappeso» con massa grassa bassa non indica eccesso di grasso.`],
   ['Limiti',`Non distingue grasso e muscolo, né la distribuzione del grasso; non è adatto a valutare atleti muscolosi.`]],
  b:['World Health Organization (2000). <i>Obesity: preventing and managing the global epidemic</i>. WHO Technical Report Series 894. Ginevra: WHO.']},

'massa':{t:'Massa magra e massa muscolare nel tempo',
  dove:'Corpo',
  a:`Due linee seguono la massa magra (tutto ciò che non è grasso) e la massa muscolare stimata, per vedere se il peso guadagnato o perso è tessuto magro.`,
  s:[['Cosa mostra',`Massa magra e massa muscolare (kg) per ogni misura salvata.`],
   ['Dati di partenza',`Peso e frazione di massa grassa (per la magra); massa muscolare inserita.`],
   ['Metodo e formule',`<div class="spf">Massa magra = peso × (1 − frazione grassa)<span class="spn">(1)</span></div>
     La massa muscolare è il valore inserito (dalla bilancia), non calcolato.`],
   ['Esempio svolto',`80 kg con grassa 0,15 → magra 68,0 kg. Due mesi dopo 81 kg con grassa 0,14 → magra 69,7 kg: +1,7 kg di magra con +1 kg di peso.`],
   ['Come leggerlo',`In massa si cerca la magra in salita più del peso; in definizione la magra stabile mentre il peso scende.`],
   ['Limiti',`Gli stessi della bioimpedenza: variazioni piccole (sotto 1 kg) sono dentro l'errore di misura.`]],
  b:['Kyle UG et al. (2004). Bioelectrical impedance analysis — part I. <i>Clin Nutr</i> 23(5):1226–1243.']},

'energia':{t:'Energia del piano contro il fabbisogno',
  dove:'Alimentazione (pannello laterale)',
  a:`Confronta le calorie giornaliere del piano alimentare della fase attiva con il fabbisogno stimato, e ne ricava il surplus o il deficit.`,
  s:[['Cosa mostra',`Due barre (piano e fabbisogno) sulla stessa scala e la differenza in kcal al giorno: verde se entro ±50 kcal.`],
   ['Dati di partenza',`Alimenti e grammi del piano; valori nutritivi per 100 g dalla banca dati (USAV svizzera, Ciqual); metabolismo basale e livello di attività (PAL) dal tab Corpo.`],
   ['Metodo e formule',`<div class="spf">kcal<sub>alimento</sub> = kcal<sub>100 g</sub> × <span class="fr"><i>grammi</i><i>100</i></span> · Piano = Σ kcal<sub>alimento</sub><span class="spn">(1)</span></div>
     <div class="spf">Fabbisogno = metabolismo basale × PAL · Bilancio = Piano − Fabbisogno<span class="spn">(2)</span></div>`],
   ['Esempio svolto',`Basale 1 800 kcal × PAL 1,55 = 2 790 kcal; piano 2 500 kcal → <b>−290 kcal/giorno</b> (deficit).`],
   ['Come leggerlo',`Massa: surplus moderato (circa +200/+400); definizione: deficit (circa −300/−500); mantenimento: vicino a zero.`],
   ['Limiti',`Il fabbisogno è una stima (errore tipico ±10%); il PAL è approssimato. Il bilancio reale si verifica con l'andamento del peso (tab Analisi).`]],
  b:['FAO/WHO/UNU (2004). <i>Human energy requirements</i>. FAO Food and Nutrition Technical Report Series 1. Roma: FAO.',
     'Mifflin MD et al. (1990). A new predictive equation for resting energy expenditure in healthy individuals. <i>Am J Clin Nutr</i> 51(2):241–247.']},

'macro':{t:'Ripartizione dell’energia fra i macronutrienti',
  dove:'Alimentazione (pannello laterale)',
  a:`Mostra quale quota delle calorie del piano viene da proteine, carboidrati e grassi, con i grammi totali e i grammi per kg di peso corporeo.`,
  s:[['Cosa mostra',`Una barra divisa in tre colori e, per ogni macronutriente, grammi, percentuale dell'energia e g/kg; in fondo le fibre.`],
   ['Dati di partenza',`Grammi di proteine, carboidrati disponibili e grassi degli alimenti del piano; peso dal profilo.`],
   ['Metodo e formule',`Fattori di Atwater:
     <div class="spf">E<sub>P</sub> = 4 × g<sub>P</sub> · E<sub>C</sub> = 4 × g<sub>C</sub> · E<sub>G</sub> = 9 × g<sub>G</sub><span class="spn">(1)</span></div>
     <div class="spf">Quota<sub>x</sub> = <span class="fr"><i>E<sub>x</sub></i><i>E<sub>P</sub> + E<sub>C</sub> + E<sub>G</sub></i></span> × 100 · g/kg = <span class="fr"><i>g<sub>x</sub></i><i>peso</i></span><span class="spn">(2)</span></div>`],
   ['Esempio svolto',`160 g di proteine, 280 g di carboidrati, 70 g di grassi: 640 + 1 120 + 630 = 2 390 kcal → proteine 27%, carboidrati 47%, grassi 26%; a 80 kg le proteine sono 2,0 g/kg.`],
   ['Come leggerlo',`Per chi si allena coi pesi le proteine sono indicate fra circa 1,6 e 2,2 g/kg; la ripartizione fra carboidrati e grassi dipende da gusti e volume di allenamento.`],
   ['Limiti',`La somma 4/4/9 può differire leggermente dalle kcal di banca dati (alcol, polioli, arrotondamenti).`]],
  b:['Atwater WO, Bryant AP (1900). The availability and fuel value of food materials. <i>Storrs Agricultural Experiment Station Annual Report</i> 12:73–110.',
     'Morton RW et al. (2018). A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength. <i>Br J Sports Med</i> 52(6):376–384.']},

'energia-pasti':{t:'Energia per pasto',
  dove:'Alimentazione (pannello laterale)',
  a:`Ripartisce le calorie del piano fra i pasti della giornata.`,
  s:[['Cosa mostra',`Una riga per pasto con barra (il pasto più ricco è la barra piena), kcal e percentuale sul totale; in fondo quanti alimenti e ricette compongono il piano.`],
   ['Dati di partenza',`Pasto, alimento e grammi di ogni riga del piano della fase attiva.`],
   ['Metodo e formule',`<div class="spf">Quota<sub>pasto</sub> = <span class="fr"><i>Σ kcal degli alimenti del pasto</i><i>kcal totali del piano</i></span> × 100<span class="spn">(1)</span></div>`],
   ['Esempio svolto',`Colazione 500, pranzo 800, spuntino 300, cena 900 kcal su 2 500: 20%, 32%, 12%, 36%.`],
   ['Come leggerlo',`Utile per distribuire energia e proteine intorno all'allenamento e per evitare un pasto che concentra metà della giornata.`],
   ['Limiti',`Non dice nulla sulla composizione del singolo pasto: per quella c'è la tabella.`]],
  b:['Aragon AA, Schoenfeld BJ (2013). Nutrient timing revisited: is there a post-exercise anabolic window? <i>J Int Soc Sports Nutr</i> 10:5.']},

'nutrienti':{t:'Nutrienti fuori dai riferimenti OMS/FAO',
  dove:'Alimentazione (pannello laterale)',
  a:`Elenca i nutrienti del piano giornaliero che non raggiungono il riferimento (obiettivi) o che lo superano (limiti), secondo le raccomandazioni OMS/FAO per l'adulto.`,
  s:[['Cosa mostra',`Fino a 8 nutrienti con la percentuale del riferimento: rosso per i limiti superati e per gli obiettivi sotto il 60%, giallo per gli obiettivi fra 60% e 90%.`],
   ['Dati di partenza',`Nutrienti degli alimenti del piano; fabbisogno energetico e peso dal profilo.`],
   ['Metodo e formule',`<div class="spf">Indice = <span class="fr"><i>quantità giornaliera nel piano</i><i>riferimento</i></span> × 100<span class="spn">(1)</span></div>
     Riferimenti (E = fabbisogno, o 2 000 kcal se manca): energia E; proteine 0,83 g/kg; carboidrati 55% E; fibre 25 g (obiettivi, in regola da 90%); grassi totali ≤ 30% E; saturi ≤ 10% E; zuccheri ≤ 10% E; colesterolo ≤ 300 mg; sodio ≤ 2 000 mg (limiti, in regola fino a 100%); vitamine e minerali secondo i valori FAO/OMS.`],
   ['Esempio svolto',`Fibre 18 g su 25 → <b>72%</b> (giallo, sotto obiettivo); sodio 2 600 mg su 2 000 → <b>130%</b> (rosso, limite superato).`],
   ['Come leggerlo',`Sono riferimenti di popolazione per la salute, non obiettivi sportivi: le proteine a 0,83 g/kg sono il minimo per un adulto sedentario. Il 💡 accanto a un nutriente scarso elenca gli alimenti che ne sono più ricchi, per 100 g o per 100 kcal.`],
   ['Limiti',`Riferimenti indicativi, non un parere medico o nutrizionale; la qualità dei valori dipende dalla banca dati degli alimenti.`]],
  b:['WHO/FAO (2003). <i>Diet, nutrition and the prevention of chronic diseases</i>. WHO Technical Report Series 916. Ginevra: WHO.',
     'WHO/FAO/UNU (2007). <i>Protein and amino acid requirements in human nutrition</i>. WHO Technical Report Series 935.',
     'World Health Organization (2015). <i>Guideline: sugars intake for adults and children</i>. Ginevra: WHO.',
     'World Health Organization (2012). <i>Guideline: sodium intake for adults and children</i>. Ginevra: WHO.']},

'timeline':{t:'Timeline: periodi alimentari, carico e peso',
  dove:'Analisi',
  a:`Mette sullo stesso asse temporale le fasi alimentari registrate (massa, mantenimento, definizione), il Training Load e il peso corporeo, settimana per settimana.`,
  s:[['Cosa mostra',`Fasce colorate per le fasi (con le kcal giornaliere del piano), la linea del TL (asse sinistro) e quella del peso (asse destro).`],
   ['Dati di partenza',`Periodi alimentari (Alimentazione → Periodi: fase, date, piano); TL settimanale dello Storico; peso dello storico delle misure.`],
   ['Metodo e formule',`Le settimane sono l'unione di quelle con TL, peso o periodo. Ogni asse è scalato fra minimo e massimo dei valori, con il 10% di margine:
     <div class="spf">y = alto + altezza × (1 − <span class="fr"><i>v − (min − 0,1·Δ)</i><i>1,2·Δ</i></span>), &nbsp; Δ = max − min<span class="spn">(1)</span></div>
     Se due periodi si sovrappongono vale l'ultimo registrato; un periodo in corso (avviato e non ancora terminato) arriva fino a oggi.`],
   ['Esempio svolto',`8 settimane di massa a 3 000 kcal (fascia verde) con TL da 25 000 a 30 000 e peso da 78 a 80 kg, poi 6 settimane di definizione a 2 300 kcal con peso in discesa.`],
   ['Come leggerlo',`Serve a vedere insieme cause ed effetti: come cambiano carico e peso entrando in una fase.`],
   ['Limiti',`I due assi hanno scale diverse: l'incrocio delle linee non ha significato.`]],
  b:['Tufte ER (2001). <i>The Visual Display of Quantitative Information</i>, 2ª ed. Cheshire: Graphics Press.']},

'bilancio-peso':{t:'Variazione di peso contro bilancio calorico',
  dove:'Analisi',
  a:`Verifica sui propri dati quanto il bilancio calorico del piano si traduce in variazione di peso la settimana successiva, con correlazione di Pearson e retta di regressione.`,
  s:[['Cosa mostra',`Un punto per settimana: in ascissa il bilancio (kcal del piano − metabolismo), in ordinata la variazione di peso nella settimana dopo; colore per fase; retta di regressione e r.`],
   ['Dati di partenza',`Kcal giornaliere del periodo attivo, metabolismo e peso dello storico delle misure. Servono due settimane consecutive con dati completi; almeno 3 punti.`],
   ['Metodo e formule',`<div class="spf">x<sub>t</sub> = kcal<sub>piano,t</sub> − metabolismo<sub>t</sub> · y<sub>t</sub> = peso<sub>t+1</sub> − peso<sub>t</sub><span class="spn">(1)</span></div>
     <div class="spf">b = <span class="fr"><i>Σ (x − x̄)(y − ȳ)</i><i>Σ (x − x̄)²</i></span> · a = ȳ − b·x̄<span class="spn">(2)</span></div>
     <div class="spf">r = <span class="fr"><i>Σ (x − x̄)(y − ȳ)</i><i>√( Σ (x − x̄)² · Σ (y − ȳ)² )</i></span><span class="spn">(3)</span></div>
     Sotto il grafico: «ogni 100 kcal/g di surplus ≈ 100·b kg/settimana»; se |r| &lt; 0,3 la correlazione è segnalata come debole.`],
   ['Esempio svolto',`Cinque settimane con bilancio −400, −200, 0, +200, +400 kcal/g e Δpeso −0,35, −0,20, +0,05, +0,15, +0,40 kg: b = 0,000925 → <b>0,09 kg/settimana ogni 100 kcal/g</b>; r = 0,99. È coerente con la stima teorica: 700 kcal a settimana ≈ 0,09 kg di tessuto.`],
   ['Come leggerlo',`Una pendenza vicina a quella teorica conferma che metabolismo e piano sono stimati bene; una pendenza piatta o r basso indicano stime da rivedere o pochi dati.`],
   ['Limiti',`Il peso varia molto per acqua e glicogeno; la relazione fra bilancio e peso non è lineare nel lungo periodo (adattamento metabolico). Correlazione non è causalità.`]],
  b:['Hall KD et al. (2011). Quantification of the effect of energy imbalance on bodyweight. <i>Lancet</i> 378(9793):826–837.',
     'Pearson K (1895). Notes on regression and inheritance in the case of two parents. <i>Proc R Soc Lond</i> 58:240–242.']},

'ritardo':{t:'Correlazione con ritardo fra carico e peso',
  dove:'Analisi',
  a:`Misura con quanto ritardo il carico di allenamento di una settimana si riflette sulla variazione di peso: correlazione di Pearson fra TL della settimana N e Δpeso da 1 a 5 settimane dopo.`,
  s:[['Cosa mostra',`Cinque barre (+1 … +5 settimane) con il coefficiente r: verde se positivo, rosso se negativo. In alto quante coppie entrano nel primo calcolo.`],
   ['Dati di partenza',`TL settimanale e peso; le differenze di peso solo fra settimane consecutive.`],
   ['Metodo e formule',`<div class="spf">Δpeso<sub>k</sub> = peso<sub>k+1</sub> − peso<sub>k</sub> · r<sub>L</sub> = Pearson( TL<sub>i</sub> , Δpeso<sub>i+L</sub> ), L = 0…4<span class="spn">(1)</span></div>
     La barra «+1» corrisponde a L = 0 (peso della settimana dopo); servono almeno 3 coppie.`],
   ['Esempio svolto',`r = 0,10 a +1, 0,35 a +2, 0,52 a +3, 0,30 a +4, 0,05 a +5: il carico «si vede» sul peso soprattutto dopo circa tre settimane.`],
   ['Come leggerlo',`Il picco indica il ritardo tipico; valori tutti vicini a zero dicono che, nei tuoi dati, il carico non spiega le variazioni di peso.`],
   ['Limiti',`Con poche settimane r è instabile; dieta e carico cambiano insieme e si confondono; nessuna correzione per confronti multipli.`]],
  b:['Box GEP, Jenkins GM, Reinsel GC (2008). <i>Time Series Analysis: Forecasting and Control</i>, 4ª ed. Hoboken: Wiley.']},

'confronto-fasi':{t:'Confronto fra fasi alimentari (boxplot)',
  dove:'Analisi',
  a:`Confronta le fasi di massa, mantenimento e definizione per la variazione settimanale del Training Load (in %) e del peso (in kg), con un boxplot per fase.`,
  s:[['Cosa mostra',`Per ogni fase con almeno 3 settimane: scatola fra primo e terzo quartile, linea alla mediana, baffi fino a minimo e massimo; linea tratteggiata a zero.`],
   ['Dati di partenza',`Coppie di settimane consecutive dentro una fase, con TL (per il primo grafico) o peso (per il secondo).`],
   ['Metodo e formule',`<div class="spf">ΔTL%<sub>t</sub> = ( <span class="fr"><i>TL<sub>t</sub></i><i>TL<sub>t−1</sub></i></span> − 1 ) × 100 · Δpeso<sub>t</sub> = peso<sub>t</sub> − peso<sub>t−1</sub><span class="spn">(1)</span></div>
     Quantili con interpolazione lineare sui valori ordinati v<sub>0</sub> … v<sub>n−1</sub>:
     <div class="spf">Q(p) = v<sub>⌊h⌋</sub> + (h − ⌊h⌋)(v<sub>⌈h⌉</sub> − v<sub>⌊h⌋</sub>), &nbsp; h = (n − 1)·p<span class="spn">(2)</span></div>`],
   ['Esempio svolto',`ΔTL% in massa: −2, 3, 5, 6, 10 → Q1 = 3, mediana = 5, Q3 = 6, minimo −2, massimo 10. Δpeso in definizione: −0,6, −0,4, −0,3, −0,3, −0,1 kg → mediana −0,3 kg a settimana.`],
   ['Come leggerlo',`Scatole che non si sovrappongono indicano fasi davvero diverse; una scatola larga indica settimane molto variabili.`],
   ['Limiti',`Con poche settimane per fase i quartili sono poco stabili; il boxplot non mostra la sequenza temporale.`]],
  b:['Tukey JW (1977). <i>Exploratory Data Analysis</i>. Reading: Addison-Wesley.',
     'Hyndman RJ, Fan Y (1996). Sample quantiles in statistical packages. <i>The American Statistician</i> 50(4):361–365.']}
};
/* ── pulsante e popup ─────────────────────────────────────────────────────────── */
function spiegaBtn(id, dopo, inLinea){
  return `<button type="button" class="spieg-btn no-print${inLinea?' in-linea':''}" data-spieg="${esc(id)}"${dopo?` data-spieg-dopo="${esc(dopo)}"`:''} title="${esc(t('Come si legge questo grafico: metodo, formule ed esempio'))}" aria-label="${esc(t('Spiegazione del grafico'))}">?</button>`;
}
function spiegaVoce(id){ const en=(typeof SPIEG_EN!=='undefined')? SPIEG_EN : {}; return (LANG==='en' && en[id]) || SPIEG[id] || null; }
function spiegaModal(id, dopo){
  const D=spiegaVoce(id); if(!D) return;
  const sez=(D.s||[]).map((x,i)=>`<section><h5><span>${i+1}</span>${esc(t(x[0]))}</h5><div>${x[1]}</div></section>`).join('');
  const bib=(D.b||[]).map(x=>`<li>${x}</li>`).join('');
  modal(`<article class="spieg-doc">
     <div class="spieg-kicker">${t('Training Monitor System · nota metodologica')}</div>
     <h3>${esc(D.t)}</h3>
     <div class="spieg-dove">${t('Dove compare:')} ${esc(D.dove||'')}</div>
     <div class="spieg-abs"><b>${t('Sommario')}</b> — ${D.a}</div>
     ${sez}
     ${bib?`<section class="spieg-bib"><h5><span>§</span>${t('Bibliografia')}</h5><ol>${bib}</ol></section>`:''}
   </article>
   <div class="modal__actions"><button class="btn btn--ember" id="spieg-ok">${dopo?t('◂ Torna al grafico'):t('Chiudi')}</button></div>`);
  const m=document.getElementById('modal'); if(m){ m.style.maxWidth='780px'; m.scrollTop=0; }
  const ok=document.getElementById('spieg-ok');
  if(ok) ok.onclick=()=>{ if(dopo==='bilanciamento') bilanciamentoModal(); else closeModal(); };
}
/* un solo ascoltatore: i pannelli laterali si ridisegnano a ogni tasto */
document.addEventListener('click', ev=>{
  const b=ev.target && ev.target.closest && ev.target.closest('[data-spieg]');
  if(b){ ev.preventDefault(); ev.stopPropagation(); spiegaModal(b.dataset.spieg, b.dataset.spiegDopo||''); }
});
