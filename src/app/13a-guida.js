let guidaMode='rapida';
function renderGuida(){
  const tog=`<div class="bar no-print">
     <div style="font-family:var(--font-disp);font-size:18px;color:var(--ember-2)">📕 ${t('Guida')}</div>
     <div style="display:flex;gap:6px;margin-left:14px">
       <button class="btn btn--sm ${guidaMode==='rapida'?'btn--ember':''}" data-gmode="rapida">${t('⚡ Rapida')}</button>
       <button class="btn btn--sm ${guidaMode==='completa'?'btn--ember':''}" data-gmode="completa">${t('📖 Completa')}</button>
       <button class="btn btn--sm" id="g-ai" title="${t('Scarica un file di testo con tutte le funzioni e i limiti noti dell\'app: caricalo su ChatGPT/Claude/Gemini e fagli le tue domande sul TMS')}">${t('🤖 Scarica documentazione per AI')}</button>
     </div>
     <div class="spacer"></div>
     <button class="btn" onclick="showTab('allenamento')">${t('← Torna all\'app')}</button></div>`;
  document.getElementById('panel-guida').innerHTML=tog+(LANG==='en'?(guidaMode==='rapida'?guidaRapidaEN():guidaCompletaEN()):(guidaMode==='rapida'?guidaRapida():guidaCompleta()));
  { const g=document.getElementById('g-ai'); if(g) g.onclick=scaricaGuidaAI; }
  document.querySelectorAll('#panel-guida [data-gmode]').forEach(b=>b.onclick=()=>{ guidaMode=b.dataset.gmode; renderGuida(); try{window.scrollTo(0,0);}catch(e){} });
  document.querySelectorAll('#panel-guida [data-gjump]').forEach(b=>b.onclick=()=>{ const el=document.getElementById(b.dataset.gjump); if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'}); });
}
function guidaRapida(){
  return `
   <div class="callout callout--ember"><div>⚡ <b>Guida rapida</b> — il minimo per usarlo subito. Per formule e dettagli tecnici passa a <span data-gmode="completa" style="color:var(--ember-2);font-weight:700;text-decoration:underline;cursor:pointer" title="Apri la Guida completa">📖 Completa</span>.</div></div>
   <div class="sec">▌ In 4 passi</div>
   <ol style="margin:0 0 6px 18px;line-height:1.9">
     <li><b>Apri l'app: è già pronta.</b> Su desktop non serve collegare niente — i dati vivono in locale sul tuo PC (niente cloud, niente account) e sopravvivono agli aggiornamenti. Trovi il profilo dimostrativo <b>Atleta Template</b> già compilato per esplorare; il tuo lo crei dal tab <b>👤 Profilo → ＋ Nuovo profilo</b>.</li>
     <li><b>Compila la scheda.</b> In <b>🏋 Pesi</b> aggiungi un Giorno e scegli gli esercizi: tocca <b>＋ scegli esercizio</b> e usa la <b>barra di ricerca</b> o scorri la <b>lista per categoria</b>. Inserisci serie, ripetizioni, peso (e <b>RIR</b> se vuoi): 1RM/%1RM/TL si calcolano da soli. Usa <b>＋set</b> per i set extra e <b>↧ Dalla scorsa</b> per ripartire dai valori dell'ultima volta. Il ▶ accanto all'esercizio mostra il video. Le attività <b>cardio</b> (corsa, bici, nuoto…) vanno nel tab <b>🏃 Cardio</b>, separato.</li>
     <li><b>Salva.</b> <b>💾 Salva nello Storico</b> (anno + settimana, di default quelli correnti) — con fatica (RPE) e durata della seduta, se le usi.</li>
     <li><b>Guarda i risultati.</b> <b>📈 Progressi</b> per grafici e record, <b>📊 Analisi</b> per incrociare dieta e allenamento, <b>🖨 Report</b> per il PDF da consegnare.</li>
   </ol>
   <div class="callout"><div>🔔 Un pallino/banner verde o rosso (in Pesi, Corpo e nel footer) ti avvisa se non hai ancora registrato la settimana.</div></div>
   <div class="sec">▌ Le due app: il TMS e il taccuino da palestra</div>
   <p style="margin:4px 0 8px">Questo TMS è l'<b>app principale</b>: qui si <b>crea</b> (scheda e dieta) e si <b>analizza</b> (storico, grafici, report). <b>TMS Scheda</b>, l'app per smartphone, è la sua <b>derivata</b>: un <b>taccuino digitale</b> per annotare l'allenamento in palestra — scheda coi video sotto gli occhi, dieta da seguire, e ciò che fai davvero scritto sul momento. Il flusso è un cerchio: <b>il PC progetta → il telefono annota → i dati tornano al PC</b> e diventano storico e grafici. Funziona in due modi: <b>coach + atleta</b> (tu hai il TMS completo, il cliente solo il taccuino sul telefono) oppure <b>atleta autonomo</b> (usi entrambi gli strumenti: programmi qui, annoti col telefono, reimporti su di te).</p>
   <div class="sec">▌ Coach ↔ cliente: la scheda che viaggia</div>
   <ol style="margin:0 0 6px 18px;line-height:1.9">
     <li><b>Esporta.</b> In <b>👤 Profilo</b>, nella riga del cliente (o del tuo profilo, se ti alleni da solo), premi <b>📤 Esporta scheda</b>: crea il file della sua scheda (con i video, se vuoi). Invialo via chat o email — o passalo al tuo stesso telefono.</li>
     <li><b>Il cliente compila.</b> Apre il file nell'app <b>TMS Scheda</b> sul telefono (gratis, la installa una volta dal link che le esportazioni gli mostrano; funziona anche offline), inserisce ciò che ha fatto davvero — serie, ripetizioni, peso, RIR, note e fatica della seduta — e preme <b>📩 Crea il file per il coach</b>: nasce un piccolo file di rientro da rimandarti.</li>
     <li><b>Importa.</b> Sempre nella riga del cliente, <b>📥 Importa rientro</b>: scegli il file — l'allenamento del cliente viene <b>caricato nella scheda 🏋 Pesi</b>, dove lo controlli (e correggi se serve). Quando sei pronto, <b>💾 Salva nello Storico</b> scegliendo la settimana: da lì alimenta TL, ACWR, grafici e Report.</li>
   </ol>
   <div class="sec">▌ Le sezioni in breve</div>
   <div class="tbl-wrap"><table><tbody>
     <tr><td class="l"><b>👤 Profilo</b></td><td class="l">Atleta/cliente attivo e anagrafica (il tab mostra il nome del profilo attivo). Ogni profilo nella lista ha un <b>semaforo</b> accanto al nome (🟢 ok · 🟡 attenzione · 🔴 a rischio) con sotto ACWR, da quanto non aggiorna e i PR recenti — un colpo d'occhio sullo stato, sola lettura. Più profili = più clienti: nella riga di ognuno i bottoni dello <b>scambio scheda col cliente</b> (📤 esporta la scheda compilabile, 📥 importa il file di rientro). In fondo alla pagina il <b>Backup/Ripristino</b> di tutti i dati.</td></tr>
     <tr><td class="l"><b>🏋 Pesi</b></td><td class="l">Crei la scheda dei pesi e la salvi nello storico; ▶ per i video degli esercizi. Accanto alle frecce ▲▼ dell'esercizio un <b>pallino</b> 🟢/🟡/🔴 (co-pilota) ti dice se il Peso che digiti è sensato: solo un suggerimento, non scrive nulla.</td></tr>
     <tr><td class="l"><b>🏃 Cardio</b></td><td class="l">Attività cardio (corsa, bici, nuoto…): durata + fatica → carico interno sRPE (e TRIMP con la frequenza cardiaca).</td></tr>
     <tr><td class="l"><b>📈 Progressi</b></td><td class="l">Record, grafici e andamento del carico (TL, ACWR, monotonia).</td></tr>
     <tr><td class="l"><b>🜂 Corpo</b></td><td class="l">Peso e misure (BMI, masse) nel tempo + <b>📸 Foto progressi</b> (fronte/lato datate, ▶ riproduzione e ⚖ confronto prima/dopo). Tutto sul tuo PC.</td></tr>
     <tr><td class="l"><b>🍖 Alimentazione</b></td><td class="l">Pasti Bulk/Mantenimento/Cut, banca dati di 1190 alimenti, indice OMS. Qui registri i <b>Periodi</b> (piano + date) per le analisi.</td></tr>
     <tr><td class="l"><b>📊 Analisi</b></td><td class="l">Dieta × allenamento: timeline dei periodi con carico e peso, Δpeso vs bilancio calorico, correlazioni, confronto fasi.</td></tr>
     <tr><td class="l"><b>📖 Esercizi</b></td><td class="l">Catalogo modificabile, raggruppato per gruppo muscolare e sottocategoria (menù a tendina). Da ✎ puoi caricare <b>video personali</b> al posto degli integrati (toggle "Video personali").</td></tr>
     <tr><td class="l"><b>🖨 Report</b></td><td class="l">Documento stampabile (PDF A4) e <b>Report digitale</b> per smartphone con video.</td></tr>
     <tr><td class="l"><b>📜 Storico / Misure</b></td><td class="l">Archivi completi (link nel footer).</td></tr>
   </tbody></table></div>
   <div class="sec">▌ Indicatori in breve</div>
   <div class="tbl-wrap"><table><tbody>
     <tr><td class="l"><b>1RM</b></td><td class="l">Massimale stimato (forza).</td></tr>
     <tr><td class="l"><b>%1RM</b></td><td class="l">Intensità: quanto pesante lavori (dipende dalle ripetizioni).</td></tr>
     <tr><td class="l"><b>TL</b></td><td class="l">Carico allenante (volume·intensità): conta soprattutto la crescita nel tempo.</td></tr>
     <tr><td class="l"><b>ACWR</b></td><td class="l">Sicurezza del carico: zona ideale 0.8–1.3.</td></tr>
   </tbody></table></div>
   <div class="callout callout--info"><div>Vuoi sapere come si calcola tutto e come leggere ogni grafico? → <span data-gmode="completa" style="color:var(--ember-2);font-weight:700;text-decoration:underline;cursor:pointer" title="Apri la Guida completa">📖 Completa</span>.</div></div>`;
}
function guidaCompleta(){
  const bd=p=>{const fset=fascia(p);return '<span class="fascia '+fset[1]+'">'+fset[0]+'</span>';};
  const nav=[['gc-avvio','Avvio'],['gc-profili','Profili'],['gc-flusso','Flusso'],['gc-sezioni','Le sezioni'],['gc-ind','Indicatori & formule'],['gc-calc','Logica dei calcoli'],['gc-graf','Lettura grafici'],['gc-nutri','Alimentazione & OMS'],['gc-dati','Dati & backup'],['gc-scambio','Scheda ↔ cliente'],['gc-faq','FAQ & problemi'],['gc-sci','Basi scientifiche'],['gc-doc','Documentazione'],['gc-lic','Licenza']];
  return `
   <div class="callout callout--ember"><div>📖 <b>Guida completa.</b> Manuale tecnico del Training Monitor System, erede dell'omonimo Excel/VBA «by Wander». <span class="pill">v${APP_VERSION} · ${APP_DATE}</span></div></div>
   <div class="bar" style="flex-wrap:wrap">${nav.map(n=>`<button class="btn btn--sm" data-gjump="${n[0]}">${n[1]}</button>`).join(' ')}</div>

   <div class="callout"><div>⚠️ <b>Progetto amatoriale.</b> Creato per uso personale e condiviso gratuitamente, da un appassionato di fitness e non da un professionista. Funziona ed è testato, ma usalo a tuo rischio e fai backup dei dati. Codice sviluppato con l'assistenza di Claude (Anthropic).</div></div>

   <div class="sec" id="gc-avvio">▌ 1 · Avvio e salvataggio</div>
   <p>L'app è un singolo file HTML: aprilo con doppio clic (consigliati <b>Chrome</b>, <b>Edge</b> o l'app <b>Obsidian</b>). Al primo avvio compare il <b>gate di connessione</b>:</p>
   <ol style="margin:0 0 6px 18px;line-height:1.7">
     <li><b>Connetti la cartella</b> (consigliata: una cartella chiamata <span class="mono">TMS</span>). L'app crea al suo interno <span class="mono">TMS_Dati/</span> con i JSON dei dati. <b>È obbligatorio</b>: senza cartella collegata l'app non si usa.</li>
     <li>Dalle volte successive si <b>riconnette da sola</b> (un clic di conferma se il browser lo richiede).</li>
   </ol>
   <div class="callout callout--info"><div>🔎 Se colleghi una cartella con nome diverso da <span class="mono">TMS</span> compare un avviso non bloccante: serve solo a ricordarti dove finiscono i dati. Per <b>aggiornare</b> l'app basta sostituire l'HTML: i dati nella cartella restano e vengono migrati in automatico.</div></div>

   <div class="sec" id="gc-profili">▌ 2 · Profili (multi-atleta)</div>
   <p>Nel tab <b>👤 Profilo</b> gestisci più atleti/clienti (crea, attiva, rinomina, elimina). Ogni profilo ha <b>scheda, storico, misure e alimentazione propri</b>; il <b>catalogo Esercizi è condiviso</b>. I dati per profilo stanno in <span class="mono">TMS_Dati/&lt;profilo&gt;/</span>. L'anagrafica invariante (sesso, data di nascita, altezza) si imposta qui col pulsante ✎: l'<b>età è calcolata</b> dalla data di nascita.</p>
   <p>Ogni profilo nella lista ha un <b>semaforo</b> accanto al nome, così vedi <b>chi sta bene e chi no senza aprirli uno per uno</b>: 🟢 ok, 🟡 attenzione, 🔴 a rischio, ⚪ senza dati. Sotto al nome, una riga riassume i numeri che contano: <b>ACWR</b> (sicurezza del carico), da <b>quante settimane non aggiorna</b> la scheda, la <b>monotonia</b> (se hai attivato il Session-RPE) e i <b>🎉 PR recenti</b>. Il semaforo è rosso se il carico è troppo alto (ACWR sopra 1.5), se la scheda è ferma da 3+ settimane o se la monotonia è alta con carico elevato; giallo per gli stessi segnali più lievi. È solo uno specchio dello stato del cliente: <b>non modifica nulla</b>; per i dettagli apri il profilo o vai nei suoi Progressi.</p>

   <div class="sec" id="gc-flusso">▌ 3 · Flusso d'uso</div>
   <p><b>1 · Compila la scheda.</b> In <b>🏋 Pesi</b> scegli la modalità (Settimanale/Mensile), aggiungi un Giorno e gli Esercizi (dal selettore con barra di ricerca e lista per categoria; le attività cardio sono nel tab <b>🏃 Cardio</b> a parte). Per i set incrementali dello stesso esercizio usa <b>＋set</b> (ripetere l'esercizio è il modo corretto: niente più «+1/+2»). Se un esercizio compare in un secondo giorno della settimana viene marcato in automatico come <b>S2</b> (2ª seduta). Sotto ogni esercizio compare <b>«ult: …»</b> (l'ultima registrazione) e con <b>↧ Dalla scorsa</b> riporti peso/rip/RIR dall'ultima volta. Il campo <b>RIR</b> (ripetizioni in riserva) è opzionale.</p>
   <p><b>2 · Leggi i calcoli dal vivo.</b> Mentre digiti, 1RM/%1RM/TL/fascia e il Δ TL di ogni set si aggiornano in tempo reale. Il pulsante <b>★</b> marca una riga come test del massimale (escluso dalla progressione del TL).</p>
   <p><b>3 · Salva nello Storico.</b> <b>💾 Salva nello Storico</b> → anno e settimana (default correnti). Il codice scheda è <span class="mono">AAAASS</span> (anno×100 + settimana). <b>↶ Annulla ultimo</b> rimuove l'ultima scheda (irreversibile).</p>
   <p><b>4 · Misure corpo (facoltativo).</b> In <b>Corpo</b> aggiorni peso e composizione e premi <b>💾 Salva misure</b>: utile per i grafici di ricomposizione. Sotto, le <b>📸 Foto progressi</b>: carichi le foto datate (anteriore/laterale/posteriore), le scorri come un timelapse (<b>▶ Riproduzione</b>: con la vista «tutti» vedi le viste della stessa data <b>affiancate</b>) o le metti a confronto <b>prima/dopo</b> (<b>⚖ Confronto</b>, scegliendo le due date da un <b>calendario</b>). La gestione è raggruppata per data. Le foto restano <b>sul tuo PC</b> (in <span class="mono">TMS_Dati/&lt;profilo&gt;/foto/</span>), non vengono caricate da nessuna parte; il backup salva le date/etichette, non le immagini (per quelle copia la cartella TMS_Dati). Puoi anche inserire un <b>prima/dopo</b> nel <b>Report</b>.</p>

   <div class="sec" id="gc-sezioni">▌ 4 · Le sezioni in dettaglio</div>
   <div class="tbl-wrap"><table><thead><tr><th class="l">Sezione</th><th class="l">A cosa serve</th></tr></thead><tbody>
     <tr><td class="l"><b>👤 Profilo</b></td><td class="l">Atleta attivo, gestione profili, anagrafica invariante, Backup/Ripristino dati.</td></tr>
     <tr><td class="l"><b>🏋 Pesi</b></td><td class="l">Scheda settimanale/mensile per giorno; calcoli automatici; salva/annulla nello storico. <b>Pallino co-pilota</b> accanto alle frecce ▲▼ dell'esercizio (sul Peso): 🟢 progressione sensata · 🟡 attenzione (aumento deciso, calo, RIR basso o monotonia alta) · 🔴 salto troppo grande o ACWR alto (meglio scaricare). Solo suggerimento, decidi tu.</td></tr>
     <tr><td class="l"><b>🏃 Cardio</b></td><td class="l">Sedute cardio datate con durata e RPE → sRPE (Foster); TRIMP (Banister) quando inserisci la FC media.</td></tr>
     <tr><td class="l"><b>📜 Storico</b> <span class="muted">(nascosto)</span></td><td class="l">Archivio di tutte le schede salvate (link nel footer). Sola lettura.</td></tr>
     <tr><td class="l"><b>📈 Progressi</b></td><td class="l">Record reali, carico (TL), ACWR, volume per gruppo, intensità, progressione per esercizio.</td></tr>
     <tr><td class="l"><b>🜂 Corpo</b></td><td class="l">Misure variabili con BMI/fabbisogno e grafici; salva le rilevazioni.</td></tr>
     <tr><td class="l"><b>📜 Misure</b> <span class="muted">(nascosto)</span></td><td class="l">Storico rilevazioni corporee (link nel footer).</td></tr>
     <tr><td class="l"><b>🍖 Alimentazione</b></td><td class="l">Piano della fase attiva (Bulk/Mantenimento/Cut, scelta coi bottoni in cima al tab), banca dati 1190 alimenti con micro/macro e indice OMS.</td></tr>
     <tr><td class="l"><b>📖 Esercizi</b></td><td class="l">Catalogo modificabile (nome, gruppo, target, tipo, fattore TL).</td></tr>
     <tr><td class="l"><b>🖨 Report</b></td><td class="l">Documento per il cliente: scegli con le caselle <b>quali sezioni</b> includere e con le frecce <b>▲▼ il loro ordine</b> (vale per PDF A4 multipagina e report digitale). La scelta si salva per profilo.</td></tr>
   </tbody></table></div>

   <div class="sec" id="gc-ind">▌ 5 · Indicatori & formule</div>
   <div class="tbl-wrap"><table><thead><tr><th class="l">Indicatore</th><th class="l">Formula</th><th class="l">Significato</th></tr></thead><tbody>
     <tr><td class="l"><b>1RM</b></td><td class="l mono">Peso · (1 + Rip/30)</td><td class="l">Massimale stimato; formula scegliibile nel Profilo (Epley default, Brzycki, Lombardi, Media), ±5%. Nei <b>record</b> mostriamo invece il <b>carico reale</b> più alto sollevato.</td></tr>
     <tr><td class="l"><b>%1RM</b></td><td class="l mono">Peso / 1RM · 100 = 100/(1+Rip/30)</td><td class="l">Intensità relativa. Dipende solo dalle ripetizioni: a parità di reps non cambia col peso.</td></tr>
     <tr><td class="l"><b>TL</b></td><td class="l mono">Serie · Rip · Peso · (%1RM/100) · Fattore</td><td class="l">Carico allenante. Conta la <b>crescita nel tempo</b>, non il valore assoluto.</td></tr>
     <tr><td class="l"><b>Δ TL %</b></td><td class="l mono">(TL attuale / TL prec. − 1)·100</td><td class="l">Variazione vs ultima scheda, per blocco esercizio (somma dei set della seduta).</td></tr>
     <tr><td class="l"><b>Tonnellaggio</b></td><td class="l mono">Σ Serie · Rip · Peso</td><td class="l">Volume grezzo in kg.</td></tr>
     <tr><td class="l"><b>Fattore</b></td><td class="l mono">0.45 – 1.10</td><td class="l">Peso dell'esercizio nel TL. È un valore <b>indicativo e soggettivo</b>, legato alla <b>fatica percepita</b> dell'esercizio (multiarticolare &gt; isolamento): quindi <b>individuale</b> — taralo nel catalogo sulla tua esperienza.</td></tr>
     <tr><td class="l"><b>RIR / RPE</b></td><td class="l mono">RPE = 10 − RIR</td><td class="l">Ripetizioni in riserva (Zourdos 2016): quanto vicino al cedimento. RIR 2 ≈ RPE 8. Campo opzionale; attivando «RIR nei calcoli» nel Profilo, entra in 1RM/%1RM/TL (reps efficaci = rip + RIR).</td></tr>
     <tr><td class="l"><b>Carico interno (sRPE)</b></td><td class="l mono">RPE · durata(min)</td><td class="l">Session-RPE (Foster 2001): carico <b>interno</b> della seduta in AU. Si abilita nel Profilo; RPE 0–10 + minuti per giorno. <b>Settimanale</b> = somma giorni.</td></tr>
     <tr><td class="l"><b>Monotonia / Strain</b></td><td class="l mono">media7÷SD7 · sett.×monotonia</td><td class="l">Monotonia = quanto è uniforme la settimana (riposi inclusi); >2 = poco variata. Strain = carico settimanale pesato per la monotonia (Foster).</td></tr>
   </tbody></table></div>
   <p style="margin-top:10px"><b>Fasce di %1RM</b> — stimolo prevalente:</p>
   <div class="tbl-wrap"><table><thead><tr><th>%1RM</th><th class="l">Stimolo</th><th>Etichetta</th></tr></thead><tbody>
     <tr><td class="num">≥ 90%</td><td class="l">Forza massimale</td><td>${bd(92)}</td></tr>
     <tr><td class="num">80–90%</td><td class="l">Forza + Ipertrofia</td><td>${bd(85)}</td></tr>
     <tr><td class="num">70–80%</td><td class="l">Ipertrofia</td><td>${bd(75)}</td></tr>
     <tr><td class="num">60–70%</td><td class="l">Resistenza</td><td>${bd(65)}</td></tr>
     <tr><td class="num">50–60%</td><td class="l">Metabolico</td><td>${bd(55)}</td></tr>
   </tbody></table></div>
   <div class="callout callout--info"><div>⚖️ <b>ACWR</b> (acuto:cronico): carico dell'ultima settimana ÷ media delle ultime 4. Zona produttiva e sicura ≈ <b>0.8–1.3</b>; sopra 1.5 cresce il rischio di sovraccarico/infortunio.</div></div>

   <div class="sec" id="gc-calc">▌ 6 · Logica dei calcoli (in dettaglio)</div>
   <p>Tutti i numeri derivati (1RM, %1RM, TL, Δ, ACWR, fasce) sono <b>ricalcolati dai dati grezzi</b> a ogni apertura: nello storico salviamo solo Serie/Rip/Peso/RIR e il Fattore dell'esercizio. Così, se cambi una formula o il Fattore, anche lo storico si allinea da solo.</p>

   <p><b>6.1 · Massimale stimato (1RM)</b> — quattro formule selezionabili nel Profilo. Con r = ripetizioni, w = peso:</p>
   <div class="tbl-wrap"><table><thead><tr><th class="l">Formula</th><th class="l">Espressione</th><th class="l">Nota</th></tr></thead><tbody>
     <tr><td class="l">Epley (default)</td><td class="l mono">w · (1 + r/30)</td><td class="l">La più usata; andamento lineare.</td></tr>
     <tr><td class="l">Brzycki</td><td class="l mono">w · 36 / (37 − r)</td><td class="l">Più conservativa ad alte reps; oltre 36 reps ripiega su Epley.</td></tr>
     <tr><td class="l">Lombardi</td><td class="l mono">w · r^0.10</td><td class="l">Curva di potenza.</td></tr>
     <tr><td class="l">Media</td><td class="l mono">(Epley + Brzycki + Lombardi)/3</td><td class="l">Compromesso fra le tre.</td></tr>
   </tbody></table></div>
   <p class="muted" style="font-size:13px">Esempio: 100 kg × 8 rip → Epley 126,7 · Brzycki 124,1 · Lombardi 125,9. Sono stime: oltre le ~10–12 reps l'errore cresce. Per questo nei <b>Record</b> mostriamo il <b>carico reale</b> più alto sollevato, non il 1RM stimato.</p>

   <p><b>6.2 · Intensità relativa (%1RM)</b></p>
   <p class="mono">%1RM = w / 1RM · 100 = 100 / (1 + r/30)   (con Epley)</p>
   <p>Dipende <b>solo dalle ripetizioni</b>: 8 reps ≈ 79% del massimale a prescindere dal peso. È ciò che colloca la serie in una <b>fascia</b> di stimolo.</p>

   <p><b>6.3 · RIR e calcoli «effort-aware»</b> — il RIR (Reps In Reserve, Zourdos 2016) misura quanto sei lontano dal cedimento; RPE = 10 − RIR. Di default è <b>solo informativo</b>. Attivando «<b>RIR nei calcoli</b>» nel Profilo, le ripetizioni efficaci diventano:</p>
   <p class="mono">rip_efficaci = rip + RIR</p>
   <p>e sostituiscono r in 1RM, %1RM e TL. Razionale: 8 reps con 2 in riserva equivalgono, come sforzo, a una serie portata a ~10. Disattivando il toggle, la colonna RIR sparisce dalla scheda e i calcoli tornano alle reps pure (comportamento di default, retro-compatibile).</p>

   <p><b>6.4 · Training Load (TL)</b> — il cuore del monitoraggio (Scott 2016: proxy del carico esterno pesato per intensità):</p>
   <p class="mono">TL = Serie · Rip · Peso · (%1RM/100) · Fattore</p>
   <p>Il <b>Fattore</b> (0.45–1.10, modificabile nel catalogo Esercizi) pesa il contributo dell'esercizio: i multiarticolari pesanti (Squat, Stacco) contano più degli isolamenti. È un valore <b>indicativo e soggettivo</b>: riflette la <b>fatica percepita</b> dell'esercizio (impegno sistemico e locale), perciò è <b>individuale</b> — puoi tararlo nel catalogo Esercizi sulla tua esperienza, non è una costante fisica. Esempio: 4×6×120 su Squat (Fattore 1.0, %1RM≈82%) → 4·6·120·0,82·1,0 ≈ <b>2.360</b>. Conta la <b>tendenza nel tempo</b>, non il valore assoluto. Il <b>Tonnellaggio</b> (Σ Serie·Rip·Peso) è invece il volume grezzo in kg, senza pesi di intensità o esercizio.</p>

   <p><b>6.5 · Δ TL per set e seduta automatica</b> — quando ripeti lo stesso esercizio nello stesso giorno (＋set), ogni set ha il suo <b>Δ TL</b> confrontato col <b>set di pari posizione</b> (1° con 1°, 2° con 2°…) della stessa seduta nell'ultima scheda salvata: così vedi la progressione set per set, non solo del blocco. Se un esercizio compare in un <b>secondo giorno</b> della settimana viene riconosciuto come <b>S2</b> (2ª seduta) in automatico dall'ordine dei giorni, così i confronti restano coerenti (S1 con S1, S2 con S2).</p>

   <p><b>6.6 · Stallo (plateau)</b> — un esercizio è segnalato in stallo quando il suo <b>TL non cresce per ≥3 schede consecutive</b>. Usiamo il TL (non il solo peso) perché cattura anche i progressi ottenuti aumentando ripetizioni o serie a parità di carico. I test del massimale (★) sono esclusi.</p>

   <p><b>6.7 · ACWR (Acute:Chronic Workload Ratio)</b></p>
   <p class="mono">ACWR = TL settimana corrente / media TL ultime 4 settimane</p>
   <p>Segnala se stai aumentando il carico troppo in fretta. Zona indicativa <b>0.8–1.3</b> (produttiva); &lt;0.8 = scarico, &gt;1.5 = rischio sovraccarico. <b>Da leggere come spia, non come verdetto</b>: dopo il 2016 l'indice è stato criticato (medie «accoppiate», soglie arbitrarie, scarsa riproducibilità — vedi §12). Utile come segnale, non come regola assoluta.</p>

   <p><b>6.8 · Fasce di %1RM</b> — la %1RM media della serie la colloca in una fascia di stimolo prevalente (forza ≥90%, forza+ipertrofia 80–90%, ipertrofia 70–80%, resistenza 60–70%, metabolico 50–60%); base in Schoenfeld 2010.</p>

   <p><b>6.9 · Corpo: BMI e fabbisogno</b> — BMI = peso / altezza², con le fasce OMS. Il fabbisogno energetico e proteico stimato (da sesso, età, altezza, peso e obiettivo Bulk/Cut) alimenta l'indice OMS in Alimentazione. Valori indicativi, non un piano medico.</p>

   <p><b>6.10 · Carico interno · session-RPE (Foster 2001)</b> — misura il carico <b>interno</b> (sforzo percepito), complementare al TL che stima il carico <b>esterno</b>. Si abilita dal <b>Profilo</b> (come il RIR). Per ogni giorno della scheda inserisci un <b>RPE 0–10</b> della seduta intera e la <b>durata in minuti</b>:</p>
   <p class="mono">carico seduta = RPE × durata(min)   ·   settimanale = Σ giorni   ·   monotonia = media7gg ÷ SD7gg (riposi inclusi)   ·   strain = settimanale × monotonia</p>
   <p>I valori RPE/durata sono una <b>bozza autosalvata</b> nella scheda: persistono mentre lavori e si <b>azzerano quando salvi la scheda nello Storico</b> (il carico interno dei giorni allenati viene archiviato per quella settimana). <b>Monotonia</b> alta (&gt;2) segnala una settimana poco variata; secondo Foster <b>monotonia e carico entrambi elevati</b> aumentano il rischio di sovraccarico/malattia. Riferimento in §12.</p>

   <div class="sec" id="gc-graf">▌ 7 · Lettura dei grafici (Progressi)</div>
   <p>Tutti i valori si <b>ricalcolano</b> dai dati grezzi; le settimane senza dati vengono saltate.</p>
   <div class="tbl-wrap"><table><thead><tr><th class="l">Grafico</th><th class="l">Cosa mostra e come si legge</th></tr></thead><tbody>
     <tr><td class="l"><b>Record (carico max)</b></td><td class="l">In cima: il <b>peso reale più alto</b> sollevato su Squat, Stacco, Panca, Military, Trazioni.</td></tr>
     <tr><td class="l"><b>TL + media mobile</b></td><td class="l">Carico per scheda; la linea grigia (media 4 sett.) ripulisce il rumore. Sale = progredisci.</td></tr>
     <tr><td class="l"><b>ACWR</b></td><td class="l">Zona verde 0.8–1.3 = progressione sicura; &lt;0.8 scarichi; &gt;1.3 troppo in fretta.</td></tr>
     <tr><td class="l"><b>Tonnellaggio</b></td><td class="l">Kg totali sollevati per scheda.</td></tr>
     <tr><td class="l"><b>Δ Variazione TL %</b></td><td class="l">Oscillazioni ~ −3%/+3% = carico/recupero equilibrati.</td></tr>
     <tr><td class="l"><b>Radar equilibrio (volume)</b></td><td class="l">Distribuzione delle <b>serie</b> per gruppo (non il TL, che è falsato dai grandi esercizi). Poligono regolare = bilanciato.</td></tr>
     <tr><td class="l"><b>Serie per gruppo</b></td><td class="l">Serie per gruppo nell'ultima settimana, con riferimento alla zona ipertrofia 10–20.</td></tr>
     <tr><td class="l"><b>Andamento TL per gruppo</b></td><td class="l">Carico di ciascun gruppo nel tempo: scopri i distretti trascurati.</td></tr>
     <tr><td class="l"><b>Distribuzione intensità</b></td><td class="l">Quante serie in ogni fascia di %1RM: l'enfasi dell'allenamento.</td></tr>
     <tr><td class="l"><b>Carico interno (sRPE)</b> <span class="muted">(se abilitato)</span></td><td class="l">Carico interno settimanale (RPE×min) accanto al TL esterno; l'indice base 100 confronta i due trend. Richiede il Session-RPE attivo nel Profilo.</td></tr>
     <tr><td class="l"><b>Monotonia / Strain</b> <span class="muted">(se abilitato)</span></td><td class="l">Monotonia in zona ≤2 = settimana variata; Strain alto = carico monotono e pesante. Segnali Foster, non verdetti.</td></tr>
     <tr><td class="l"><b>Progressione per esercizio</b></td><td class="l">Per l'esercizio scelto: 1RM stimato e peso massimo nel tempo.</td></tr>
     <tr><td class="l"><b>Segnali</b></td><td class="l">Avvisi automatici: 🎉 record al salvataggio, ⏸ esercizi in stallo (TL fermo da ≥3 schede), ⚠️ deload se ACWR alto, ⚠️ monotonia alta (Foster).</td></tr>
   </tbody></table></div>

   <div class="sec" id="gc-nutri">▌ 8 · Alimentazione & indice OMS</div>
   <p>L'alimentazione è divisa in tre <b>fasi</b> — <b>Bulk</b>, <b>Mantenimento</b>, <b>Cut</b> — ma ne vedi <b>solo quella attiva</b>, che scegli coi <b>bottoni in cima al tab</b> (le altre restano salvate, semplicemente non mostrate). I <b>pasti</b> sono riordinabili: le frecce <b>▲▼</b> accanto al nome spostano il pasto (e i suoi alimenti) su/giù; <b>✎</b> rinomina, <b>🗑</b> elimina. Per ogni alimento premi <b>＋ scegli alimento…</b> e selezionalo dalla tabella (valori per 100 g, scalati sui grammi): la <b>ricerca è «a parole»</b> (più parole, anche non vicine) e a campo vuoto trovi in cima i <b>★ Preferiti</b> e i <b>🕐 Recenti</b>, con la <b>stellina</b> ☆/★ per gestire i preferiti. Con <b>▸</b> vedi tutti i micro/macro. Il bottone <b>⬇ Stampa dieta (PDF A4)</b> in cima genera un <b>PDF A4 orizzontale</b> del piano della fase attiva (alimenti, grammi, kcal e macro, totali per pasto e giornaliero) da dare al cliente. L'<b>indice settimanale OMS/FAO</b> confronta l'intake (piano × 7) coi riferimenti per adulto (energia e proteine personalizzate); i nutrienti <b>(max)</b> sono limiti da non superare. Valori indicativi, non un piano medico.</p>

   <p><b>Fonte dati alimenti:</b> Banca dati svizzera dei valori nutritivi (USAV/FSVO) — 1190 alimenti generici, valori per 100 g di parte edibile, usata con citazione della fonte come da licenza: <a href="https://naehrwertdaten.ch/it/" target="_blank">naehrwertdaten.ch</a>. Il campo <b>Carboidrati</b> sono i glucidi disponibili; <b>di cui zuccheri</b> sono gli zuccheri totali.</p>
   <p><b>Riferimenti OMS/FAO usati nell'indice</b> (adulto): grassi totali ≤30% E · grassi saturi ≤10% E · <b>zuccheri ≤10% E</b> (ideale &lt;5%) · sale &lt;5 g/die (≈ sodio &lt;2000 mg) · grassi <b>trans &lt;1% E</b> · carboidrati ~55% E · proteine 0,83 g/kg; micronutrienti sui valori di riferimento OMS/FAO. <span class="muted">L'indice usa gli <i>zuccheri totali</i> come proxy del limite OMS sugli zuccheri liberi; i grassi <i>trans</i> non sono nel dataset, quindi la soglia &lt;1% E è indicata ma non calcolata per alimento.</span></p>
   <p>Fonti OMS/FAO: <a href="https://www.who.int/news-room/fact-sheets/detail/healthy-diet" target="_blank">Healthy diet</a> · <a href="https://www.who.int/news/item/17-07-2023-who-updates-guidelines-on-fats-and-carbohydrates" target="_blank">Aggiornamento 2023 grassi/carboidrati</a> · <a href="https://www.fao.org/4/y5686e/y5686e00.htm" target="_blank">Fabbisogno energetico (FAO/WHO/UNU)</a> · <a href="https://www.fao.org/nutrition/requirements/archive/en/" target="_blank">Archivio fabbisogni FAO</a>.</p>

   <div class="sec" id="gc-dati">▌ 9 · Dati, profili e backup</div>
   <p>Tutto in locale, <b>nessun cloud</b>. Per profilo: <span class="mono">TMS_Dati/&lt;profilo&gt;/</span> con <span class="mono">scheda.json</span>, <span class="mono">storico.json</span>, <span class="mono">corpo.json</span>, <span class="mono">alimentazione.json</span>; condivisi alla root <span class="mono">profili.json</span> ed <span class="mono">esercizi.json</span>. Copia di sicurezza anche nel browser. Migrazioni automatiche con backup <span class="mono">storico.backup.json</span>. <b>Backup/Ripristino</b> (tab Profilo): <b>⭳ Backup</b> esporta tutti i dati in un file JSON, <b>⭱ Ripristina</b> li reimporta. In alternativa, backup manuale: copia la cartella <span class="mono">TMS_Dati</span>. <b>Cross-PC</b>: se la cartella è sincronizzata (es. cloud), i dati si spostano; connetti la cartella una volta per PC e non modificare in contemporanea su due dispositivi.</p>

   <div class="sec" id="gc-scambio">▌ 10 · Scheda ↔ cliente: le due app (TMS + taccuino)</div>
   <p><b>Il concetto.</b> Il TMS che stai usando è l'<b>app principale</b>: il centro di comando dove si <b>crea</b> (scheda pesi, piano alimentare) e si <b>analizza</b> (storico, grafici 1RM/TL/ACWR, misure, foto, report). L'app gratuita <b>TMS Scheda</b> (<a href="${APP_CLIENTE_URL}" target="_blank" rel="noopener">${APP_CLIENTE_URL}</a>) è la sua <b>derivata</b> per smartphone: un <b>taccuino digitale da palestra</b> che non crea nulla — riceve la scheda e la dieta dal TMS, le mostra durante l'allenamento (esercizi coi video, grammi della dieta) e raccoglie le annotazioni sul momento. Poi il taccuino «si consegna»: il rientro torna al TMS, che lo trasforma in storico e grafici. <b>Il PC progetta → il telefono annota → i dati tornano al PC.</b></p>
   <p><b>Due modi d'uso.</b> ① <b>Coach + atleta</b>: il coach ha il TMS completo (un profilo per cliente), l'atleta ha <b>solo TMS Scheda</b> sul telefono — non gli serve un PC né installare il TMS. ② <b>Atleta autonomo</b>: la stessa persona usa entrambi gli strumenti — programma e analizza sul PC, annota in palestra col telefono, reimporta su di sé (i passi sotto valgono uguali: esporti dal tuo profilo e mandi il file al tuo stesso telefono). La scheda <b>viaggia come file</b> — via chat o email, senza cloud.</p>
   <ol style="margin:0 0 6px 18px;line-height:1.8">
     <li><b>Prima volta: il cliente installa l'app</b> — apre il link qui sopra sul telefono e la aggiunge alla schermata Home (su Android: menu ⋮ → «Installa app»; su iPhone: Condividi → «Aggiungi alla schermata Home»). Da lì ha un'icona come una vera app e funziona <b>anche offline</b>; si aggiorna da sola. I suoi dati restano <b>solo sul suo telefono</b>.</li>
     <li><b>Esporta</b> — in <b>👤 Profilo</b>, nella riga del cliente, premi <b>📤 Esporta scheda</b> (se non è il profilo attivo, l'app lo attiva da sola). Nasce <span class="mono">Scheda_&lt;profilo&gt;_&lt;data&gt;.json</span> con la scheda giorno per giorno, il previsto in chiaro e — se il piano della fase attiva non è vuoto — anche l'<b>alimentazione</b> (pasti, grammi, kcal); alla domanda sui video, includili se vuoi che il cliente veda le esecuzioni offline (file più pesante). Invialo al cliente.</li>
     <li><b>Il cliente compila</b> — salva il file sul telefono e lo carica nell'app con <b>📂 Carica la scheda</b> (resta memorizzata: la ritrova a ogni apertura, con la <b>bozza salvata da sola</b> mentre compila). L'app ha due sezioni: <b>🏋 Scheda allenamento</b> e <b>🍖 Alimentazione</b> (il piano in sola lettura, coi grammi in evidenza). Nella scheda sceglie il <b>giorno</b> da un elenco, compila i valori effettivi (serie, ripetizioni, peso, RIR e note per esercizio; fatica RPE 0–10 e durata in minuti per seduta — gli esercizi non sono modificabili; il <b>RIR parte vuoto</b>: lo inserisce dopo l'allenamento, il previsto resta indicato sopra), guarda i ▶ video, e preme <b>📩 Crea il file per il coach</b>: nasce <span class="mono">Rientro_&lt;profilo&gt;_&lt;data&gt;.json</span> da rimandarti (dove possibile con la condivisione diretta su WhatsApp).</li>
     <li><b>Importa</b> — nella riga del cliente, <b>📥 Importa rientro</b>: scegli il file e l'allenamento del cliente viene <b>caricato nella scheda 🏋 Pesi</b> (esercizi, valori effettivi e fatica/durata delle sedute). Lì fai un <b>controllo generale</b>, correggi se necessario, poi <b>💾 Salva nello Storico</b> scegliendo tu la settimana: solo allora entra nello Storico (con sedute e RPE) e alimenta TL, ACWR, grafici e Report. Niente viene scritto automaticamente.</li>
   </ol>
   <p class="muted" style="font-size:12px">Nota privacy: il sito ospita solo l'app (il «guscio»); schede e rientri non passano da nessun server — viaggiano solo nella chat tra te e il cliente e vivono nei rispettivi dispositivi. I vecchi file <span class="mono">Rientro_*.json</span> generati dalle schede HTML delle versioni precedenti restano importabili.</p>
   <p><b>Controlli di sicurezza</b> all'import: file non valido → errore chiaro; <b>profilo diverso</b> da quello attivo → conferma esplicita; esercizi fuori catalogo → avviso con elenco; <b>scheda Pesi non vuota</b> → conferma prima di sostituirla con i dati del cliente (così non perdi una scheda in corso per sbaglio).</p>

   <div class="sec" id="gc-faq">▌ 11 · FAQ & risoluzione problemi</div>
   <p><b>Campi obbligatori?</b> Solo Esercizio, Serie, Ripetizioni, Peso. Note e recupero facoltativi.</p>
   <p><b>Nuovo esercizio?</b> Tab <b>Esercizi</b> → ＋ Nuovo (nome, gruppo, target, tipo, fattore). Compare subito nei menù.</p>
   <p><b>Dato sbagliato?</b> Nella scheda corrente correggi diretto; nello storico usa «↶ Annulla ultimo» e risalva.</p>
   <p><b>Mi alleno 4 giorni invece di 5?</b> Nessun problema: aggiungi/togli giorni a piacere.</p>
   <p><b>Non salva su cartella.</b> Usa Chrome/Edge/Obsidian (Firefox/Safari non supportano l'accesso alle cartelle).</p>
   <p><b>Grafici vuoti.</b> Servono almeno 2–3 schede salvate.</p>
   <p><b>La stampa taglia?</b> Usa il pulsante 🖨 (apre la finestra impaginata), poi nel dialogo: A4, Margini «Nessuno», Scala 100%, Grafica di sfondo attiva.</p>

   <div class="sec" id="gc-sci">▌ 12 · Basi scientifiche</div>
   <ol style="margin:0 0 4px 18px;line-height:1.7;font-size:13px">
     <li>Scott B.R. et al., <i>Training Monitoring for Resistance Exercise…</i>, Sports Medicine, 2016 — base del Training Load.</li>
     <li>Gabbett T.J., <i>The training-injury prevention paradox</i>, BJSM, 2016 — fondamento dell'ACWR.</li>
     <li>Schoenfeld B.J., <i>The mechanisms of muscle hypertrophy…</i>, JSCR, 2010 — range di %1RM e volume.</li>
     <li>Epley B., 1985 — massimale stimato.</li>
     <li>OMS/FAO — <i>Human energy requirements</i> e <i>Vitamin and mineral requirements</i>.</li>
   </ol>

   <div class="sec" id="gc-doc">▌ 13 · Documentazione di riferimento</div>
   <p>I modelli del TMS si basano sui paper elencati qui sotto. I paper <b>non vengono distribuiti</b> con l'app (sono soggetti a copyright): <b>DOI</b> porta alla pagina ufficiale dell'editore e <b>Scholar</b> alla ricerca — spesso si trovano copie open-access legali, preprint o la versione caricata dagli autori; molte università danno accesso istituzionale.</p>
   <div class="tbl-wrap"><table><thead><tr><th class="l">Paper</th><th>DOI</th><th>Scholar</th></tr></thead><tbody>
     <tr><td class="l">Scott 2016 — Training Load (base)</td><td><a href="https://doi.org/10.1007/s40279-015-0454-0" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Training+Monitoring+for+Resistance+Exercise+Theory+and+Applications" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Foster 2001 — Carico interno / session-RPE</td><td><a href="https://doi.org/10.1519/1533-4287(2001)015%3C0109:ANATME%3E2.0.CO;2" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=A+New+Approach+to+Monitoring+Exercise+Training+Foster" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Zourdos 2016 — Scala RIR/RPE</td><td><a href="https://doi.org/10.1519/JSC.0000000000001049" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Novel+Resistance+Training+Specific+Rating+of+Perceived+Exertion+Scale+Repetitions+in+Reserve" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Helms 2016 — RIR/RPE applicazione</td><td><a href="https://doi.org/10.1519/SSC.0000000000000218" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Application+of+the+Repetitions+in+Reserve+Based+RPE+Scale+for+Resistance+Training" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Schoenfeld 2010 — Meccanismi ipertrofia</td><td><a href="https://doi.org/10.1519/JSC.0b013e3181e840f3" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Mechanisms+of+Muscle+Hypertrophy+and+Their+Application+to+Resistance+Training" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Schoenfeld 2017 — Volume dose-response</td><td><a href="https://doi.org/10.1080/02640414.2016.1210197" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Dose-response+relationship+between+weekly+resistance+training+volume+and+increases+in+muscle+mass" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Hulin 2016 — ACWR (evidenza)</td><td><a href="https://doi.org/10.1136/bjsports-2015-094817" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=acute+chronic+workload+ratio+predicts+injury+rugby+league" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Gabbett 2016 — ACWR (paradosso)</td><td><a href="https://doi.org/10.1136/bjsports-2015-095788" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=training+injury+prevention+paradox+training+smarter+and+harder" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">González-Badillo 2010 — VBT (carico-velocità)</td><td><a href="https://doi.org/10.1055/s-0030-1248333" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Movement+Velocity+as+a+Measure+of+Loading+Intensity+in+Resistance+Training" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Sánchez-Medina 2011 — VBT (perdita velocità)</td><td><a href="https://doi.org/10.1249/MSS.0b013e318213f880" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Velocity+Loss+as+an+Indicator+of+Neuromuscular+Fatigue+during+Resistance+Training" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Weakley 2021 — VBT (sintesi pratica)</td><td><a href="https://doi.org/10.1519/SSC.0000000000000560" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Velocity-Based+Training+From+Theory+to+Application" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Plews 2013 — HRV / readiness</td><td><a href="https://doi.org/10.1007/s40279-013-0071-8" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Training+adaptation+and+heart+rate+variability+in+elite+endurance+athletes" target="_blank">Scholar</a></td></tr>
        </tbody></table></div>

   <div class="sec" id="gc-lic">▌ 14 · Licenza & crediti</div>
   <div class="callout callout--ember"><div>📢 <b>Progetto aperto e gratuito.</b> Liberi di usarlo, condividerlo e personalizzarlo. Si chiede solo di <b>mantenere i crediti</b> e di <b>non venderlo</b> a scopo di lucro. «Train hard, share knowledge.» 💪 — by Wander</div></div>
   <div class="tbl-wrap"><table><tbody>
     <tr><td class="l"><b>Catalogo esercizi</b></td><td class="l">derivato da <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener">free-exercise-db</a> di yuhonas (licenza Unlicense, pubblico dominio) — 800+ esercizi, tradotti e adattati per il TMS.</td></tr>
     <tr><td class="l"><b>Banca dati alimenti</b></td><td class="l">Banca dati svizzera dei valori nutritivi (<b>USAV</b>), dati pubblici citati come fonte.</td></tr>
     <tr><td class="l"><b>Riferimenti nutrizionali</b></td><td class="l">linee guida <b>OMS/FAO</b>.</td></tr>
     <tr><td class="l"><b>Rendering report</b></td><td class="l"><a href="https://github.com/niklasvh/html2canvas" target="_blank" rel="noopener">html2canvas</a> 1.4.1 (MIT).</td></tr>
   </tbody></table></div>`;
}
/* ══════════ GUIDA — versione inglese (mostrata quando LANG==='en') ══════════ */
function guidaRapidaEN(){
  return `
   <div class="callout callout--ember"><div>⚡ <b>Quick guide</b> — the minimum to start right away. For formulas and technical details switch to <span data-gmode="completa" style="color:var(--ember-2);font-weight:700;text-decoration:underline;cursor:pointer" title="Open the Full guide">📖 Full</span>.</div></div>
   <div class="sec">▌ In 4 steps</div>
   <ol style="margin:0 0 6px 18px;line-height:1.9">
     <li><b>Open the app: it's ready.</b> On desktop you don't need to connect anything — data lives locally on your PC (no cloud, no account) and survives updates. There's a demo profile <b>Atleta Template</b> already filled in to explore; create yours from <b>👤 Profile → ＋ New profile</b>.</li>
     <li><b>Fill in the program.</b> In <b>🏋 Weights</b> add a Day and pick the exercises: tap <b>＋ pick exercise</b> and use the <b>search bar</b> or scroll the <b>list by category</b>. Enter sets, reps, weight (and <b>RIR</b> if you like): 1RM/%1RM/TL are computed for you. Use <b>＋set</b> for extra sets and <b>↧ From last</b> to start from last time's values. The ▶ next to the exercise shows the video. <b>Cardio</b> activities (running, cycling, swimming…) go in the separate <b>🏃 Cardio</b> tab.</li>
     <li><b>Save.</b> <b>💾 Save to History</b> (year + week, current ones by default) — with session effort (RPE) and duration, if you use them.</li>
     <li><b>See the results.</b> <b>📈 Progress</b> for charts and records, <b>📊 Analysis</b> to cross diet and training, <b>🖨 Report</b> for the PDF to hand over.</li>
   </ol>
   <div class="callout"><div>🔔 A green or red dot/banner (in Weights, Body and the footer) warns you if you haven't recorded the week yet.</div></div>
   <div class="sec">▌ The two apps: TMS and the gym notebook</div>
   <p style="margin:4px 0 8px">This TMS is the <b>main app</b>: here you <b>create</b> (program and diet) and <b>analyze</b> (history, charts, reports). <b>TMS Scheda</b>, the smartphone app, is its <b>derivative</b>: a <b>digital notebook</b> to record training at the gym — program with videos in front of you, diet to follow, and what you actually do written down on the spot. The flow is a circle: <b>the PC designs → the phone records → the data returns to the PC</b> and becomes history and charts. It works in two ways: <b>coach + athlete</b> (you have the full TMS, the client only the notebook on the phone) or <b>solo athlete</b> (you use both tools: program here, record on the phone, re-import on yourself).</p>
   <div class="sec">▌ Coach ↔ client: the program that travels</div>
   <ol style="margin:0 0 6px 18px;line-height:1.9">
     <li><b>Export.</b> In <b>👤 Profile</b>, on the client's row (or your own, if you train alone), press <b>📤 Export program</b>: it creates the file of their program (with videos, if you want). Send it via chat or email — or pass it to your own phone.</li>
     <li><b>The client fills it in.</b> They open the file in the <b>TMS Scheda</b> app on their phone (free, installed once from the link the exports show them; works offline too), enter what they actually did — sets, reps, weight, RIR, notes and session effort — and press <b>📩 Create the file for the coach</b>: a small log file to send back to you.</li>
     <li><b>Import.</b> Still on the client's row, <b>📥 Import log</b>: pick the file — the client's workout is <b>loaded into the 🏋 Weights program</b>, where you review it (and fix it if needed). When you're ready, <b>💾 Save to History</b> choosing the week: from there it feeds TL, ACWR, charts and Report.</li>
   </ol>
   <div class="sec">▌ The sections in brief</div>
   <div class="tbl-wrap"><table><tbody>
     <tr><td class="l"><b>👤 Profile</b></td><td class="l">Active athlete/client and details (the tab shows the active profile's name). Each profile in the list has a <b>traffic light</b> next to the name (🟢 ok · 🟡 caution · 🔴 at risk) with ACWR, time since last update and recent PRs below — a read-only glance at the status. More profiles = more clients: on each row the buttons for the <b>program exchange with the client</b> (📤 export the fillable program, 📥 import the log file). At the bottom of the page, <b>Backup/Restore</b> of all data.</td></tr>
     <tr><td class="l"><b>🏋 Weights</b></td><td class="l">You build the weights program and save it to history; ▶ for the exercise videos. Next to the exercise's ▲▼ arrows a <b>dot</b> 🟢/🟡/🔴 (co-pilot) tells you whether the Weight you type is sensible: just a hint, it writes nothing.</td></tr>
     <tr><td class="l"><b>🏃 Cardio</b></td><td class="l">Cardio activities (running, cycling, swimming…): duration + effort → internal load sRPE (and TRIMP with heart rate).</td></tr>
     <tr><td class="l"><b>📈 Progress</b></td><td class="l">Records, charts and load trend (TL, ACWR, monotony).</td></tr>
     <tr><td class="l"><b>🜂 Body</b></td><td class="l">Weight and measurements (BMI, masses) over time + <b>📸 Progress photos</b> (dated front/side, ▶ playback and ⚖ before/after compare). All on your PC.</td></tr>
     <tr><td class="l"><b>🍖 Nutrition</b></td><td class="l">Bulk/Maintenance/Cut meals, database of 1190 foods, WHO index. Here you record the <b>Periods</b> (plan + dates) for the analyses.</td></tr>
     <tr><td class="l"><b>📊 Analysis</b></td><td class="l">Diet × training: timeline of periods with load and weight, Δweight vs calorie balance, correlations, phase comparison.</td></tr>
     <tr><td class="l"><b>📖 Exercises</b></td><td class="l">Editable catalog, grouped by muscle group and subcategory (dropdown). From ✎ you can upload <b>personal videos</b> instead of the built-in ones (toggle "Personal videos").</td></tr>
     <tr><td class="l"><b>🖨 Report</b></td><td class="l">Printable document (A4 PDF) and <b>Digital report</b> for smartphone with videos.</td></tr>
     <tr><td class="l"><b>📜 History / Measurements</b></td><td class="l">Full archives (links in the footer).</td></tr>
   </tbody></table></div>
   <div class="sec">▌ Indicators in brief</div>
   <div class="tbl-wrap"><table><tbody>
     <tr><td class="l"><b>1RM</b></td><td class="l">Estimated one-rep max (strength).</td></tr>
     <tr><td class="l"><b>%1RM</b></td><td class="l">Intensity: how heavy you work (depends on reps).</td></tr>
     <tr><td class="l"><b>TL</b></td><td class="l">Training load (volume·intensity): what matters most is the growth over time.</td></tr>
     <tr><td class="l"><b>ACWR</b></td><td class="l">Load safety: ideal zone 0.8–1.3.</td></tr>
   </tbody></table></div>
   <div class="callout callout--info"><div>Want to know how everything is computed and how to read each chart? → <span data-gmode="completa" style="color:var(--ember-2);font-weight:700;text-decoration:underline;cursor:pointer" title="Open the Full guide">📖 Full</span>.</div></div>`;
}
function guidaCompletaEN(){
  const bd=p=>{const fset=fascia(p);return '<span class="fascia '+fset[1]+'">'+t(fset[0])+'</span>';};
  const nav=[['gc-avvio','Start'],['gc-profili','Profiles'],['gc-flusso','Flow'],['gc-sezioni','Sections'],['gc-ind','Indicators & formulas'],['gc-calc','Calculation logic'],['gc-graf','Reading charts'],['gc-nutri','Nutrition & WHO'],['gc-dati','Data & backup'],['gc-scambio','Program ↔ client'],['gc-faq','FAQ & problems'],['gc-sci','Scientific basis'],['gc-doc','Documentation'],['gc-lic','License']];
  return `
   <div class="callout callout--ember"><div>📖 <b>Full guide.</b> Technical manual of the Training Monitor System, heir to the Excel/VBA «by Wander». <span class="pill">v${APP_VERSION} · ${APP_DATE}</span></div></div>
   <div class="bar" style="flex-wrap:wrap">${nav.map(n=>`<button class="btn btn--sm" data-gjump="${n[0]}">${n[1]}</button>`).join(' ')}</div>

   <div class="callout"><div>⚠️ <b>Amateur project.</b> Created for personal use and shared for free, by a fitness enthusiast and not a professional. It works and is tested, but use it at your own risk and back up your data. Code developed with the assistance of Claude (Anthropic).</div></div>

   <div class="sec" id="gc-avvio">▌ 1 · Start and saving</div>
   <p>The app is a single HTML file: open it with a double click (recommended <b>Chrome</b>, <b>Edge</b> or the <b>Obsidian</b> app). On first launch the <b>connection gate</b> appears:</p>
   <ol style="margin:0 0 6px 18px;line-height:1.7">
     <li><b>Connect the folder</b> (recommended: a folder named <span class="mono">TMS</span>). The app creates <span class="mono">TMS_Dati/</span> inside it with the data JSONs. <b>It is required</b>: without a connected folder the app cannot be used.</li>
     <li>From then on it <b>reconnects by itself</b> (one confirmation click if the browser asks).</li>
   </ol>
   <div class="callout callout--info"><div>🔎 If you connect a folder with a name other than <span class="mono">TMS</span> a non-blocking notice appears: it just reminds you where the data goes. To <b>update</b> the app just replace the HTML: the data in the folder stays and is migrated automatically.</div></div>

   <div class="sec" id="gc-profili">▌ 2 · Profiles (multi-athlete)</div>
   <p>In the <b>👤 Profile</b> tab you manage several athletes/clients (create, activate, rename, delete). Each profile has <b>its own program, history, measurements and nutrition</b>; the <b>Exercises catalog is shared</b>. Per-profile data is in <span class="mono">TMS_Dati/&lt;profile&gt;/</span>. The invariant details (sex, date of birth, height) are set here with the ✎ button: <b>age is computed</b> from the date of birth.</p>
   <p>Each profile in the list has a <b>traffic light</b> next to the name, so you see <b>who's fine and who's not without opening them one by one</b>: 🟢 ok, 🟡 caution, 🔴 at risk, ⚪ no data. Below the name, a line sums up the numbers that matter: <b>ACWR</b> (load safety), <b>how many weeks since the last update</b> of the program, <b>monotony</b> (if you enabled Session-RPE) and the <b>🎉 recent PRs</b>. The light is red if the load is too high (ACWR above 1.5), if the program has been stalled for 3+ weeks or if monotony is high with high load; yellow for the same, milder signals. It's only a mirror of the client's status: <b>it changes nothing</b>; for details open the profile or go to their Progress.</p>

   <div class="sec" id="gc-flusso">▌ 3 · Usage flow</div>
   <p><b>1 · Fill in the program.</b> In <b>🏋 Weights</b> choose the mode (Weekly/Monthly), add a Day and the Exercises (from the picker with search bar and list by category; cardio activities are in the separate <b>🏃 Cardio</b> tab). For incremental sets of the same exercise use <b>＋set</b> (repeating the exercise is the correct way: no more «+1/+2»). If an exercise appears on a second day of the week it is automatically marked as <b>S2</b> (2nd session). Under each exercise appears <b>«last: …»</b> (the last record) and with <b>↧ From last</b> you bring back weight/reps/RIR from last time. The <b>RIR</b> field (reps in reserve) is optional.</p>
   <p><b>2 · Read the live calculations.</b> As you type, 1RM/%1RM/TL/zone and each set's Δ TL update in real time. The <b>★</b> button marks a row as a 1RM test (excluded from TL progression).</p>
   <p><b>3 · Save to History.</b> <b>💾 Save to History</b> → year and week (current by default). The program code is <span class="mono">YYYYWW</span> (year×100 + week). <b>↶ Undo last</b> removes the last program (irreversible).</p>
   <p><b>4 · Body measurements (optional).</b> In <b>Body</b> you update weight and composition and press <b>💾 Save measurements</b>: useful for recomposition charts. Below, the <b>📸 Progress photos</b>: you upload dated photos (front/side/back), scroll them like a timelapse (<b>▶ Playback</b>: with the «all» view you see the views of the same date <b>side by side</b>) or compare <b>before/after</b> (<b>⚖ Compare</b>, picking the two dates from a <b>calendar</b>). Management is grouped by date. Photos stay <b>on your PC</b> (in <span class="mono">TMS_Dati/&lt;profile&gt;/foto/</span>), they are not uploaded anywhere; the backup saves the dates/labels, not the images (for those copy the TMS_Dati folder). You can also add a <b>before/after</b> to the <b>Report</b>.</p>

   <div class="sec" id="gc-sezioni">▌ 4 · The sections in detail</div>
   <div class="tbl-wrap"><table><thead><tr><th class="l">Section</th><th class="l">What it's for</th></tr></thead><tbody>
     <tr><td class="l"><b>👤 Profile</b></td><td class="l">Active athlete, profile management, invariant details, data Backup/Restore.</td></tr>
     <tr><td class="l"><b>🏋 Weights</b></td><td class="l">Weekly/monthly program by day; automatic calculations; save/undo to history. <b>Co-pilot dot</b> next to the exercise's ▲▼ arrows (on the Weight): 🟢 sensible progression · 🟡 caution (strong increase, drop, low RIR or high monotony) · 🔴 jump too big or high ACWR (better to deload). Hint only, you decide.</td></tr>
     <tr><td class="l"><b>🏃 Cardio</b></td><td class="l">Dated cardio sessions with duration and RPE → sRPE (Foster); TRIMP (Banister) when you enter the average HR.</td></tr>
     <tr><td class="l"><b>📜 History</b> <span class="muted">(hidden)</span></td><td class="l">Archive of all saved programs (link in the footer). Read-only.</td></tr>
     <tr><td class="l"><b>📈 Progress</b></td><td class="l">Real records, load (TL), ACWR, volume per group, intensity, progression per exercise.</td></tr>
     <tr><td class="l"><b>🜂 Body</b></td><td class="l">Variable measurements with BMI/needs and charts; save the readings.</td></tr>
     <tr><td class="l"><b>📜 Measurements</b> <span class="muted">(hidden)</span></td><td class="l">History of body readings (link in the footer).</td></tr>
     <tr><td class="l"><b>🍖 Nutrition</b></td><td class="l">Active phase plan (Bulk/Maintenance/Cut, chosen with the buttons at the top of the tab), database of 1190 foods with micro/macro and WHO index.</td></tr>
     <tr><td class="l"><b>📖 Exercises</b></td><td class="l">Editable catalog (name, group, target, type, TL factor).</td></tr>
     <tr><td class="l"><b>🖨 Report</b></td><td class="l">Document for the client: choose with the checkboxes <b>which sections</b> to include and with the <b>▲▼</b> arrows <b>their order</b> (applies to multi-page A4 PDF and digital report). The choice is saved per profile.</td></tr>
   </tbody></table></div>

   <div class="sec" id="gc-ind">▌ 5 · Indicators & formulas</div>
   <div class="tbl-wrap"><table><thead><tr><th class="l">Indicator</th><th class="l">Formula</th><th class="l">Meaning</th></tr></thead><tbody>
     <tr><td class="l"><b>1RM</b></td><td class="l mono">Weight · (1 + Reps/30)</td><td class="l">Estimated max; formula selectable in the Profile (Epley default, Brzycki, Lombardi, Average), ±5%. In <b>records</b> we show the <b>highest actual load</b> lifted instead.</td></tr>
     <tr><td class="l"><b>%1RM</b></td><td class="l mono">Weight / 1RM · 100 = 100/(1+Reps/30)</td><td class="l">Relative intensity. It depends only on reps: at equal reps it doesn't change with weight.</td></tr>
     <tr><td class="l"><b>TL</b></td><td class="l mono">Sets · Reps · Weight · (%1RM/100) · Factor</td><td class="l">Training load. What counts is the <b>growth over time</b>, not the absolute value.</td></tr>
     <tr><td class="l"><b>Δ TL %</b></td><td class="l mono">(current TL / prev. TL − 1)·100</td><td class="l">Change vs last program, per exercise block (sum of the session's sets).</td></tr>
     <tr><td class="l"><b>Tonnage</b></td><td class="l mono">Σ Sets · Reps · Weight</td><td class="l">Raw volume in kg.</td></tr>
     <tr><td class="l"><b>Factor</b></td><td class="l mono">0.45 – 1.10</td><td class="l">Weight of the exercise in the TL. It's an <b>indicative and subjective</b> value, tied to the <b>perceived effort</b> of the exercise (multi-joint &gt; isolation): so <b>individual</b> — tune it in the catalog based on your experience.</td></tr>
     <tr><td class="l"><b>RIR / RPE</b></td><td class="l mono">RPE = 10 − RIR</td><td class="l">Reps in reserve (Zourdos 2016): how close to failure. RIR 2 ≈ RPE 8. Optional field; enabling «RIR in calculations» in the Profile makes it enter 1RM/%1RM/TL (effective reps = reps + RIR).</td></tr>
     <tr><td class="l"><b>Internal load (sRPE)</b></td><td class="l mono">RPE · duration(min)</td><td class="l">Session-RPE (Foster 2001): <b>internal</b> load of the session in AU. Enabled in the Profile; RPE 0–10 + minutes per day. <b>Weekly</b> = sum of days.</td></tr>
     <tr><td class="l"><b>Monotony / Strain</b></td><td class="l mono">mean7÷SD7 · week×monotony</td><td class="l">Monotony = how uniform the week is (rests included); >2 = low variety. Strain = weekly load weighted by monotony (Foster).</td></tr>
   </tbody></table></div>
   <p style="margin-top:10px"><b>%1RM zones</b> — prevailing stimulus:</p>
   <div class="tbl-wrap"><table><thead><tr><th>%1RM</th><th class="l">Stimulus</th><th>Label</th></tr></thead><tbody>
     <tr><td class="num">≥ 90%</td><td class="l">Maximal strength</td><td>${bd(92)}</td></tr>
     <tr><td class="num">80–90%</td><td class="l">Strength + Hypertrophy</td><td>${bd(85)}</td></tr>
     <tr><td class="num">70–80%</td><td class="l">Hypertrophy</td><td>${bd(75)}</td></tr>
     <tr><td class="num">60–70%</td><td class="l">Endurance</td><td>${bd(65)}</td></tr>
     <tr><td class="num">50–60%</td><td class="l">Metabolic</td><td>${bd(55)}</td></tr>
   </tbody></table></div>
   <div class="callout callout--info"><div>⚖️ <b>ACWR</b> (acute:chronic): last week's load ÷ average of the last 4. Productive and safe zone ≈ <b>0.8–1.3</b>; above 1.5 the risk of overload/injury grows.</div></div>

   <div class="sec" id="gc-calc">▌ 6 · Calculation logic (in detail)</div>
   <p>All derived numbers (1RM, %1RM, TL, Δ, ACWR, zones) are <b>recomputed from raw data</b> at every opening: in history we save only Sets/Reps/Weight/RIR and the exercise's Factor. So if you change a formula or the Factor, history realigns by itself.</p>

   <p><b>6.1 · Estimated max (1RM)</b> — four formulas selectable in the Profile. With r = reps, w = weight:</p>
   <div class="tbl-wrap"><table><thead><tr><th class="l">Formula</th><th class="l">Expression</th><th class="l">Note</th></tr></thead><tbody>
     <tr><td class="l">Epley (default)</td><td class="l mono">w · (1 + r/30)</td><td class="l">The most used; linear behavior.</td></tr>
     <tr><td class="l">Brzycki</td><td class="l mono">w · 36 / (37 − r)</td><td class="l">More conservative at high reps; above 36 reps it falls back to Epley.</td></tr>
     <tr><td class="l">Lombardi</td><td class="l mono">w · r^0.10</td><td class="l">Power curve.</td></tr>
     <tr><td class="l">Average</td><td class="l mono">(Epley + Brzycki + Lombardi)/3</td><td class="l">Compromise of the three.</td></tr>
   </tbody></table></div>
   <p class="muted" style="font-size:13px">Example: 100 kg × 8 reps → Epley 126.7 · Brzycki 124.1 · Lombardi 125.9. They are estimates: beyond ~10–12 reps the error grows. That's why in <b>Records</b> we show the <b>highest actual load</b> lifted, not the estimated 1RM.</p>

   <p><b>6.2 · Relative intensity (%1RM)</b></p>
   <p class="mono">%1RM = w / 1RM · 100 = 100 / (1 + r/30)   (with Epley)</p>
   <p>It depends <b>only on the reps</b>: 8 reps ≈ 79% of the max regardless of weight. It's what places the set in a <b>stimulus zone</b>.</p>

   <p><b>6.3 · RIR and «effort-aware» calculations</b> — RIR (Reps In Reserve, Zourdos 2016) measures how far you are from failure; RPE = 10 − RIR. By default it's <b>informational only</b>. Enabling «<b>RIR in calculations</b>» in the Profile, effective reps become:</p>
   <p class="mono">effective_reps = reps + RIR</p>
   <p>and replace r in 1RM, %1RM and TL. Rationale: 8 reps with 2 in reserve are, as effort, equivalent to a set taken to ~10. Turning the toggle off, the RIR column disappears from the program and calculations return to pure reps (default, backward-compatible behavior).</p>

   <p><b>6.4 · Training Load (TL)</b> — the heart of the monitoring (Scott 2016: proxy of external load weighted by intensity):</p>
   <p class="mono">TL = Sets · Reps · Weight · (%1RM/100) · Factor</p>
   <p>The <b>Factor</b> (0.45–1.10, editable in the Exercises catalog) weights the exercise's contribution: heavy multi-joint lifts (Squat, Deadlift) count more than isolations. It's an <b>indicative and subjective</b> value: it reflects the <b>perceived effort</b> of the exercise (systemic and local demand), so it's <b>individual</b> — you can tune it in the Exercises catalog based on your experience, it's not a physical constant. Example: 4×6×120 on Squat (Factor 1.0, %1RM≈82%) → 4·6·120·0.82·1.0 ≈ <b>2,360</b>. What counts is the <b>trend over time</b>, not the absolute value. <b>Tonnage</b> (Σ Sets·Reps·Weight) is instead the raw volume in kg, without intensity or exercise weights.</p>

   <p><b>6.5 · Δ TL per set and automatic session</b> — when you repeat the same exercise on the same day (＋set), each set has its <b>Δ TL</b> compared with the <b>set in the same position</b> (1st with 1st, 2nd with 2nd…) of the same session in the last saved program: so you see progression set by set, not just of the block. If an exercise appears on a <b>second day</b> of the week it is recognized as <b>S2</b> (2nd session) automatically from the order of the days, so comparisons stay consistent (S1 with S1, S2 with S2).</p>

   <p><b>6.6 · Plateau</b> — an exercise is flagged as stalled when its <b>TL doesn't grow for ≥3 consecutive programs</b>. We use TL (not weight alone) because it also captures progress from increasing reps or sets at the same load. 1RM tests (★) are excluded.</p>

   <p><b>6.7 · ACWR (Acute:Chronic Workload Ratio)</b></p>
   <p class="mono">ACWR = current week TL / average TL of the last 4 weeks</p>
   <p>It signals whether you're increasing load too fast. Indicative zone <b>0.8–1.3</b> (productive); &lt;0.8 = deload, &gt;1.5 = overload risk. <b>To be read as a warning light, not a verdict</b>: after 2016 the index was criticized (coupled averages, arbitrary thresholds, poor reproducibility — see §12). Useful as a signal, not an absolute rule.</p>

   <p><b>6.8 · %1RM zones</b> — the set's average %1RM places it in a prevailing stimulus zone (strength ≥90%, strength+hypertrophy 80–90%, hypertrophy 70–80%, endurance 60–70%, metabolic 50–60%); basis in Schoenfeld 2010.</p>

   <p><b>6.9 · Body: BMI and needs</b> — BMI = weight / height², with the WHO ranges. The estimated energy and protein needs (from sex, age, height, weight and Bulk/Cut goal) feed the WHO index in Nutrition. Indicative values, not a medical plan.</p>

   <p><b>6.10 · Internal load · session-RPE (Foster 2001)</b> — it measures the <b>internal</b> load (perceived effort), complementary to the TL that estimates the <b>external</b> load. It's enabled from the <b>Profile</b> (like RIR). For each day of the program you enter an <b>RPE 0–10</b> for the whole session and the <b>duration in minutes</b>:</p>
   <p class="mono">session load = RPE × duration(min)   ·   weekly = Σ days   ·   monotony = mean7d ÷ SD7d (rests included)   ·   strain = weekly × monotony</p>
   <p>The RPE/duration values are an <b>auto-saved draft</b> in the program: they persist while you work and <b>reset when you save the program to History</b> (the internal load of trained days is archived for that week). High <b>monotony</b> (&gt;2) signals a low-variety week; according to Foster <b>high monotony and high load together</b> increase the risk of overload/illness. Reference in §12.</p>

   <div class="sec" id="gc-graf">▌ 7 · Reading the charts (Progress)</div>
   <p>All values are <b>recomputed</b> from raw data; weeks without data are skipped.</p>
   <div class="tbl-wrap"><table><thead><tr><th class="l">Chart</th><th class="l">What it shows and how to read it</th></tr></thead><tbody>
     <tr><td class="l"><b>Records (max load)</b></td><td class="l">At the top: the <b>highest actual weight</b> lifted on Squat, Deadlift, Bench, Military, Pull-ups.</td></tr>
     <tr><td class="l"><b>TL + moving average</b></td><td class="l">Load per program; the gray line (4-week average) cleans up the noise. Rising = you progress.</td></tr>
     <tr><td class="l"><b>ACWR</b></td><td class="l">Green zone 0.8–1.3 = safe progression; &lt;0.8 you deload; &gt;1.3 too fast.</td></tr>
     <tr><td class="l"><b>Tonnage</b></td><td class="l">Total kg lifted per program.</td></tr>
     <tr><td class="l"><b>Δ TL change %</b></td><td class="l">Swings ~ −3%/+3% = balanced load/recovery.</td></tr>
     <tr><td class="l"><b>Balance radar (volume)</b></td><td class="l">Distribution of <b>sets</b> per group (not TL, which is skewed by the big lifts). Regular polygon = balanced.</td></tr>
     <tr><td class="l"><b>Sets per group</b></td><td class="l">Sets per group in the last week, with the 10–20 hypertrophy zone reference.</td></tr>
     <tr><td class="l"><b>TL trend by group</b></td><td class="l">Load of each group over time: find the neglected areas.</td></tr>
     <tr><td class="l"><b>Intensity distribution</b></td><td class="l">How many sets in each %1RM zone: the training's emphasis.</td></tr>
     <tr><td class="l"><b>Internal load (sRPE)</b> <span class="muted">(if enabled)</span></td><td class="l">Weekly internal load (RPE×min) next to the external TL; the base-100 index compares the two trends. Requires Session-RPE enabled in the Profile.</td></tr>
     <tr><td class="l"><b>Monotony / Strain</b> <span class="muted">(if enabled)</span></td><td class="l">Monotony in the ≤2 zone = varied week; high Strain = monotonous and heavy load. Foster signals, not verdicts.</td></tr>
     <tr><td class="l"><b>Progression per exercise</b></td><td class="l">For the chosen exercise: estimated 1RM and max weight over time.</td></tr>
     <tr><td class="l"><b>Signals</b></td><td class="l">Automatic alerts: 🎉 record on save, ⏸ stalled exercises (TL flat for ≥3 programs), ⚠️ deload if ACWR high, ⚠️ high monotony (Foster).</td></tr>
   </tbody></table></div>

   <div class="sec" id="gc-nutri">▌ 8 · Nutrition & WHO index</div>
   <p>Nutrition is split into three <b>phases</b> — <b>Bulk</b>, <b>Maintenance</b>, <b>Cut</b> — but you see <b>only the active one</b>, which you choose with the <b>buttons at the top of the tab</b> (the others stay saved, simply not shown). The <b>meals</b> are reorderable: the <b>▲▼</b> arrows next to the name move the meal (and its foods) up/down; <b>✎</b> renames, <b>🗑</b> deletes. For each food press <b>＋ pick food…</b> and select it from the table (values per 100 g, scaled to the grams): the <b>search is «by words»</b> (multiple words, even non-adjacent) and with an empty field you find at the top the <b>★ Favorites</b> and the <b>🕐 Recent</b>, with the <b>star</b> ☆/★ to manage favorites. With <b>▸</b> you see all micros/macros. The <b>⬇ Print diet (A4 PDF)</b> button at the top generates a <b>landscape A4 PDF</b> of the active phase plan (foods, grams, kcal and macros, per-meal and daily totals) to give to the client. The <b>weekly WHO/FAO index</b> compares the intake (plan × 7) with adult references (energy and protein personalized); the <b>(max)</b> nutrients are limits not to exceed. Indicative values, not a medical plan.</p>

   <p><b>Food data source:</b> Swiss Food Composition Database (USAV/FSVO) — 1190 generic foods, values per 100 g of edible part, used with attribution as per license: <a href="https://naehrwertdaten.ch/it/" target="_blank">naehrwertdaten.ch</a>. The <b>Carbs</b> field is available carbohydrates; <b>of which sugars</b> is total sugars.</p>
   <p><b>WHO/FAO references used in the index</b> (adult): total fat ≤30% E · saturated fat ≤10% E · <b>sugars ≤10% E</b> (ideally &lt;5%) · salt &lt;5 g/day (≈ sodium &lt;2000 mg) · <b>trans fat &lt;1% E</b> · carbs ~55% E · protein 0.83 g/kg; micronutrients on WHO/FAO reference values. <span class="muted">The index uses <i>total sugars</i> as a proxy for the WHO limit on free sugars; <i>trans</i> fats are not in the dataset, so the &lt;1% E threshold is indicated but not computed per food.</span></p>
   <p>WHO/FAO sources: <a href="https://www.who.int/news-room/fact-sheets/detail/healthy-diet" target="_blank">Healthy diet</a> · <a href="https://www.who.int/news/item/17-07-2023-who-updates-guidelines-on-fats-and-carbohydrates" target="_blank">2023 fats/carbs update</a> · <a href="https://www.fao.org/4/y5686e/y5686e00.htm" target="_blank">Energy requirements (FAO/WHO/UNU)</a> · <a href="https://www.fao.org/nutrition/requirements/archive/en/" target="_blank">FAO requirements archive</a>.</p>

   <div class="sec" id="gc-dati">▌ 9 · Data, profiles and backup</div>
   <p>All local, <b>no cloud</b>. Per profile: <span class="mono">TMS_Dati/&lt;profile&gt;/</span> with <span class="mono">scheda.json</span>, <span class="mono">storico.json</span>, <span class="mono">corpo.json</span>, <span class="mono">alimentazione.json</span>; shared at the root <span class="mono">profili.json</span> and <span class="mono">esercizi.json</span>. Safety copy also in the browser. Automatic migrations with backup <span class="mono">storico.backup.json</span>. <b>Backup/Restore</b> (Profile tab): <b>⭳ Backup</b> exports all data to a JSON file, <b>⭱ Restore</b> re-imports them. Alternatively, manual backup: copy the <span class="mono">TMS_Dati</span> folder. <b>Cross-PC</b>: if the folder is synced (e.g. cloud), the data moves; connect the folder once per PC and don't edit on two devices at the same time.</p>

   <div class="sec" id="gc-scambio">▌ 10 · Program ↔ client: the two apps (TMS + notebook)</div>
   <p><b>The concept.</b> The TMS you're using is the <b>main app</b>: the command center where you <b>create</b> (weights program, nutrition plan) and <b>analyze</b> (history, 1RM/TL/ACWR charts, measurements, photos, reports). The free <b>TMS Scheda</b> app (<a href="${APP_CLIENTE_URL}" target="_blank" rel="noopener">${APP_CLIENTE_URL}</a>) is its <b>derivative</b> for smartphone: a <b>digital gym notebook</b> that creates nothing — it receives the program and the diet from the TMS, shows them during training (exercises with videos, diet grams) and collects the notes on the spot. Then the notebook is «handed in»: the log returns to the TMS, which turns it into history and charts. <b>The PC designs → the phone records → the data returns to the PC.</b></p>
   <p><b>Two ways to use it.</b> ① <b>Coach + athlete</b>: the coach has the full TMS (one profile per client), the athlete has <b>only TMS Scheda</b> on the phone — no PC needed, no TMS install. ② <b>Solo athlete</b>: the same person uses both tools — programs and analyzes on the PC, records at the gym on the phone, re-imports on themselves (the steps below are the same: export from your profile and send the file to your own phone). The program <b>travels as a file</b> — via chat or email, no cloud.</p>
   <ol style="margin:0 0 6px 18px;line-height:1.8">
     <li><b>First time: the client installs the app</b> — they open the link above on the phone and add it to the Home screen (on Android: ⋮ menu → «Install app»; on iPhone: Share → «Add to Home Screen»). From there they have an icon like a real app and it works <b>offline too</b>; it updates by itself. Their data stays <b>only on their phone</b>.</li>
     <li><b>Export</b> — in <b>👤 Profile</b>, on the client's row, press <b>📤 Export program</b> (if it's not the active profile, the app activates it by itself). It creates <span class="mono">Scheda_&lt;profile&gt;_&lt;date&gt;.json</span> with the program day by day, the plan in clear text and — if the active phase plan is not empty — also the <b>nutrition</b> (meals, grams, kcal); when asked about videos, include them if you want the client to see the executions offline (heavier file). Send it to the client.</li>
     <li><b>The client fills it in</b> — they save the file on the phone and load it into the app with <b>📂 Load the program</b> (it stays stored: they find it at every opening, with the <b>draft auto-saved</b> while filling in). The app has two sections: <b>🏋 Training program</b> and <b>🍖 Nutrition</b> (the read-only plan, with grams highlighted). In the program they pick the <b>day</b> from a list, fill in the actual values (sets, reps, weight, RIR and notes per exercise; RPE effort 0–10 and duration in minutes per session — exercises can't be changed; the <b>RIR starts empty</b>: they enter it after training, the plan stays shown above), watch the ▶ videos, and press <b>📩 Create the file for the coach</b>: it creates <span class="mono">Rientro_&lt;profile&gt;_&lt;date&gt;.json</span> to send back to you (where possible with direct WhatsApp sharing).</li>
     <li><b>Import</b> — on the client's row, <b>📥 Import log</b>: pick the file and the client's workout is <b>loaded into the 🏋 Weights program</b> (exercises, actual values and session effort/duration). There you do a <b>general check</b>, fix if needed, then <b>💾 Save to History</b> choosing the week yourself: only then it enters History (with sessions and RPE) and feeds TL, ACWR, charts and Report. Nothing is written automatically.</li>
   </ol>
   <p class="muted" style="font-size:12px">Privacy note: the site hosts only the app (the «shell»); programs and logs never pass through a server — they travel only in the chat between you and the client and live on the respective devices. Old <span class="mono">Rientro_*.json</span> files generated by the HTML programs of previous versions remain importable.</p>
   <p><b>Safety checks</b> on import: invalid file → clear error; <b>profile different</b> from the active one → explicit confirmation; exercises outside the catalog → notice with list; <b>Weights program not empty</b> → confirmation before replacing it with the client's data (so you don't lose an in-progress program by mistake).</p>

   <div class="sec" id="gc-faq">▌ 11 · FAQ & troubleshooting</div>
   <p><b>Required fields?</b> Only Exercise, Sets, Reps, Weight. Notes and rest optional.</p>
   <p><b>New exercise?</b> <b>Exercises</b> tab → ＋ New (name, group, target, type, factor). It appears in the menus right away.</p>
   <p><b>Wrong data?</b> In the current program fix it directly; in history use «↶ Undo last» and save again.</p>
   <p><b>I train 4 days instead of 5?</b> No problem: add/remove days as you like.</p>
   <p><b>It doesn't save to a folder.</b> Use Chrome/Edge/Obsidian (Firefox/Safari don't support folder access).</p>
   <p><b>Empty charts.</b> You need at least 2–3 saved programs.</p>
   <p><b>Printing cuts off?</b> Use the 🖨 button (opens the paginated window), then in the dialog: A4, Margins «None», Scale 100%, Background graphics on.</p>

   <div class="sec" id="gc-sci">▌ 12 · Scientific basis</div>
   <ol style="margin:0 0 4px 18px;line-height:1.7;font-size:13px">
     <li>Scott B.R. et al., <i>Training Monitoring for Resistance Exercise…</i>, Sports Medicine, 2016 — basis of the Training Load.</li>
     <li>Gabbett T.J., <i>The training-injury prevention paradox</i>, BJSM, 2016 — foundation of the ACWR.</li>
     <li>Schoenfeld B.J., <i>The mechanisms of muscle hypertrophy…</i>, JSCR, 2010 — %1RM ranges and volume.</li>
     <li>Epley B., 1985 — estimated max.</li>
     <li>WHO/FAO — <i>Human energy requirements</i> and <i>Vitamin and mineral requirements</i>.</li>
   </ol>

   <div class="sec" id="gc-doc">▌ 13 · Reference documentation</div>
   <p>The TMS models are based on the papers listed below. The papers are <b>not distributed</b> with the app (they are copyrighted): <b>DOI</b> leads to the publisher's official page and <b>Scholar</b> to the search — legal open-access copies, preprints or the author-uploaded version are often available; many universities give institutional access.</p>
   <div class="tbl-wrap"><table><thead><tr><th class="l">Paper</th><th>DOI</th><th>Scholar</th></tr></thead><tbody>
     <tr><td class="l">Scott 2016 — Training Load (basis)</td><td><a href="https://doi.org/10.1007/s40279-015-0454-0" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Training+Monitoring+for+Resistance+Exercise+Theory+and+Applications" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Foster 2001 — Internal load / session-RPE</td><td><a href="https://doi.org/10.1519/1533-4287(2001)015%3C0109:ANATME%3E2.0.CO;2" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=A+New+Approach+to+Monitoring+Exercise+Training+Foster" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Zourdos 2016 — RIR/RPE scale</td><td><a href="https://doi.org/10.1519/JSC.0000000000001049" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Novel+Resistance+Training+Specific+Rating+of+Perceived+Exertion+Scale+Repetitions+in+Reserve" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Helms 2016 — RIR/RPE application</td><td><a href="https://doi.org/10.1519/SSC.0000000000000218" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Application+of+the+Repetitions+in+Reserve+Based+RPE+Scale+for+Resistance+Training" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Schoenfeld 2010 — Hypertrophy mechanisms</td><td><a href="https://doi.org/10.1519/JSC.0b013e3181e840f3" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Mechanisms+of+Muscle+Hypertrophy+and+Their+Application+to+Resistance+Training" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Schoenfeld 2017 — Volume dose-response</td><td><a href="https://doi.org/10.1080/02640414.2016.1210197" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Dose-response+relationship+between+weekly+resistance+training+volume+and+increases+in+muscle+mass" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Hulin 2016 — ACWR (evidence)</td><td><a href="https://doi.org/10.1136/bjsports-2015-094817" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=acute+chronic+workload+ratio+predicts+injury+rugby+league" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Gabbett 2016 — ACWR (paradox)</td><td><a href="https://doi.org/10.1136/bjsports-2015-095788" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=training+injury+prevention+paradox+training+smarter+and+harder" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">González-Badillo 2010 — VBT (load-velocity)</td><td><a href="https://doi.org/10.1055/s-0030-1248333" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Movement+Velocity+as+a+Measure+of+Loading+Intensity+in+Resistance+Training" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Sánchez-Medina 2011 — VBT (velocity loss)</td><td><a href="https://doi.org/10.1249/MSS.0b013e318213f880" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Velocity+Loss+as+an+Indicator+of+Neuromuscular+Fatigue+during+Resistance+Training" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Weakley 2021 — VBT (practical synthesis)</td><td><a href="https://doi.org/10.1519/SSC.0000000000000560" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Velocity-Based+Training+From+Theory+to+Application" target="_blank">Scholar</a></td></tr>
     <tr><td class="l">Plews 2013 — HRV / readiness</td><td><a href="https://doi.org/10.1007/s40279-013-0071-8" target="_blank">DOI</a></td><td><a href="https://scholar.google.com/scholar?q=Training+adaptation+and+heart+rate+variability+in+elite+endurance+athletes" target="_blank">Scholar</a></td></tr>
        </tbody></table></div>

   <div class="sec" id="gc-lic">▌ 14 · License & credits</div>
   <div class="callout callout--ember"><div>📢 <b>Open and free project.</b> Free to use, share and customize. You are only asked to <b>keep the credits</b> and <b>not sell it</b> for profit. «Train hard, share knowledge.» 💪 — by Wander</div></div>
   <div class="tbl-wrap"><table><tbody>
     <tr><td class="l"><b>Exercise catalog</b></td><td class="l">derived from <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener">free-exercise-db</a> by yuhonas (Unlicense, public domain) — 800+ exercises, translated and adapted for the TMS.</td></tr>
     <tr><td class="l"><b>Food database</b></td><td class="l">Swiss Food Composition Database (<b>USAV</b>), public data cited as source.</td></tr>
     <tr><td class="l"><b>Nutritional references</b></td><td class="l"><b>WHO/FAO</b> guidelines.</td></tr>
     <tr><td class="l"><b>Report rendering</b></td><td class="l"><a href="https://github.com/niklasvh/html2canvas" target="_blank" rel="noopener">html2canvas</a> 1.4.1 (MIT).</td></tr>
   </tbody></table></div>`;
}

