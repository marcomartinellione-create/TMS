let guidaMode='rapida';
function renderGuida(){
  const tog=`<div class="bar no-print">
     <div style="font-family:var(--font-disp);font-size:18px;color:var(--ember-2)">📕 Guida</div>
     <div style="display:flex;gap:6px;margin-left:14px">
       <button class="btn btn--sm ${guidaMode==='rapida'?'btn--ember':''}" data-gmode="rapida">⚡ Rapida</button>
       <button class="btn btn--sm ${guidaMode==='completa'?'btn--ember':''}" data-gmode="completa">📖 Completa</button>
       <button class="btn btn--sm" id="g-ai" title="Scarica un file di testo con tutte le funzioni e i limiti noti dell'app: caricalo su ChatGPT/Claude/Gemini e fagli le tue domande sul TMS">🤖 Scarica documentazione per AI</button>
     </div>
     <div class="spacer"></div>
     <button class="btn" onclick="showTab('allenamento')">← Torna all'app</button></div>`;
  document.getElementById('panel-guida').innerHTML=tog+(guidaMode==='rapida'?guidaRapida():guidaCompleta());
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
     <li><b>Compila la scheda.</b> In <b>⚔ Allenamento</b> aggiungi un Giorno e scegli gli esercizi dal menù. Inserisci serie, ripetizioni, peso (e <b>RIR</b> se vuoi): 1RM/%1RM/TL si calcolano da soli. Usa <b>＋set</b> per i set extra e <b>↧ Dalla scorsa</b> per ripartire dai valori dell'ultima volta. Il ▶ accanto all'esercizio mostra il video.</li>
     <li><b>Salva.</b> <b>💾 Salva nello Storico</b> (anno + settimana, di default quelli correnti) — con fatica (RPE) e durata della seduta, se le usi.</li>
     <li><b>Guarda i risultati.</b> <b>📈 Progressi</b> per grafici e record, <b>📊 Analisi</b> per incrociare dieta e allenamento, <b>🖨 Report</b> per il PDF da consegnare.</li>
   </ol>
   <div class="callout"><div>🔔 Un pallino/banner verde o rosso (in Allenamento, Corpo e nel footer) ti avvisa se non hai ancora registrato la settimana.</div></div>
   <div class="sec">▌ Coach ↔ cliente: la scheda che viaggia</div>
   <ol style="margin:0 0 6px 18px;line-height:1.9">
     <li><b>Esporta.</b> In <b>👤 Profilo</b>, nella riga del cliente, premi <b>📤 Esporta scheda</b>: crea una pagina HTML con la sua scheda (e i video, se vuoi). Inviala via chat o email.</li>
     <li><b>Il cliente compila.</b> Apre il file con un doppio click (niente da installare), inserisce ciò che ha fatto davvero — serie, ripetizioni, peso, RIR, note e fatica della seduta — e preme <b>📩 Crea il file per il trainer</b>: si scarica un piccolo file di rientro da rimandarti.</li>
     <li><b>Importa.</b> Sempre nella riga del cliente, <b>📥 Importa rientro</b>: scegli il file e la data — l'allenamento finisce nello Storico del profilo (con la fatica nelle sedute RPE), pronto per grafici e report. L'app ti avvisa se il profilo non corrisponde o se la settimana ha già registrazioni.</li>
   </ol>
   <div class="sec">▌ Le sezioni in breve</div>
   <div class="tbl-wrap"><table><tbody>
     <tr><td class="l"><b>👤 Profilo</b></td><td class="l">Atleta/cliente attivo e anagrafica (il tab mostra il nome del profilo attivo). Più profili = più clienti: nella riga di ognuno i bottoni dello <b>scambio scheda col cliente</b> (📤 esporta la scheda compilabile, 📥 importa il file di rientro). In fondo alla pagina il <b>Backup/Ripristino</b> di tutti i dati.</td></tr>
     <tr><td class="l"><b>⚔ Allenamento</b></td><td class="l">Crei la scheda e la salvi nello storico; ▶ per i video degli esercizi.</td></tr>
     <tr><td class="l"><b>📈 Progressi</b></td><td class="l">Record, grafici e andamento del carico (TL, ACWR, monotonia).</td></tr>
     <tr><td class="l"><b>🜂 Corpo</b></td><td class="l">Peso e misure (BMI, masse) nel tempo.</td></tr>
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

   <div class="sec" id="gc-flusso">▌ 3 · Flusso d'uso</div>
   <p><b>1 · Compila la scheda.</b> In <b>Allenamento</b> scegli la modalità (Settimanale/Mensile), aggiungi un Giorno e gli Esercizi (menù dal catalogo). Per i set incrementali dello stesso esercizio usa <b>＋set</b> (ripetere l'esercizio è il modo corretto: niente più «+1/+2»). Se un esercizio compare in un secondo giorno della settimana viene marcato in automatico come <b>S2</b> (2ª seduta). Sotto ogni esercizio compare <b>«ult: …»</b> (l'ultima registrazione) e con <b>↧ Dalla scorsa</b> riporti peso/rip/RIR dall'ultima volta. Il campo <b>RIR</b> (ripetizioni in riserva) è opzionale.</p>
   <p><b>2 · Leggi i calcoli dal vivo.</b> Mentre digiti, 1RM/%1RM/TL/fascia e il Δ TL del blocco si aggiornano in tempo reale. Il pulsante <b>★</b> marca una riga come test del massimale (escluso dalla progressione del TL).</p>
   <p><b>3 · Salva nello Storico.</b> <b>💾 Salva nello Storico</b> → anno e settimana (default correnti). Il codice scheda è <span class="mono">AAAASS</span> (anno×100 + settimana). <b>↶ Annulla ultimo</b> rimuove l'ultima scheda (irreversibile).</p>
   <p><b>4 · Misure corpo (facoltativo).</b> In <b>Corpo</b> aggiorni peso e composizione e premi <b>💾 Salva misure</b>: utile per i grafici di ricomposizione.</p>

   <div class="sec" id="gc-sezioni">▌ 4 · Le sezioni in dettaglio</div>
   <div class="tbl-wrap"><table><thead><tr><th class="l">Sezione</th><th class="l">A cosa serve</th></tr></thead><tbody>
     <tr><td class="l"><b>👤 Profilo</b></td><td class="l">Atleta attivo, gestione profili, anagrafica invariante, Backup/Ripristino dati.</td></tr>
     <tr><td class="l"><b>⚔ Allenamento</b></td><td class="l">Scheda settimanale/mensile per giorno; calcoli automatici; salva/annulla nello storico.</td></tr>
     <tr><td class="l"><b>📜 Storico</b> <span class="muted">(nascosto)</span></td><td class="l">Archivio di tutte le schede salvate (link nel footer). Sola lettura.</td></tr>
     <tr><td class="l"><b>📈 Progressi</b></td><td class="l">Record reali, carico (TL), ACWR, volume per gruppo, intensità, progressione per esercizio.</td></tr>
     <tr><td class="l"><b>🜂 Corpo</b></td><td class="l">Misure variabili con BMI/fabbisogno e grafici; salva le rilevazioni.</td></tr>
     <tr><td class="l"><b>📜 Misure</b> <span class="muted">(nascosto)</span></td><td class="l">Storico rilevazioni corporee (link nel footer).</td></tr>
     <tr><td class="l"><b>🍖 Alimentazione</b></td><td class="l">Piano della fase attiva (Bulk/Mantenimento/Cut, scelta nel Profilo), banca dati 1190 alimenti con micro/macro e indice OMS.</td></tr>
     <tr><td class="l"><b>📖 Esercizi</b></td><td class="l">Catalogo modificabile (nome, gruppo, target, tipo, fattore TL).</td></tr>
     <tr><td class="l"><b>🖨 Report</b></td><td class="l">Documento per il cliente, a sezioni selezionabili, stampa A4 multipagina.</td></tr>
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

   <p><b>6.5 · Δ TL di blocco e seduta automatica</b> — gli esercizi ripetuti nello stesso giorno (＋set) si sommano in un <b>blocco</b>; il Δ TL confronta il TL del blocco con quello della stessa seduta nell'ultima scheda salvata. Se un esercizio compare in un <b>secondo giorno</b> della settimana viene riconosciuto come <b>S2</b> (2ª seduta) in automatico dall'ordine dei giorni, così i confronti restano coerenti (S1 con S1, S2 con S2).</p>

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
   <p>L'alimentazione è divisa in tre <b>fasi</b> — <b>Bulk</b>, <b>Mantenimento</b>, <b>Cut</b> — ma ne vedi <b>solo quella attiva</b>, che scegli nel tab <b>Profilo</b> (le altre restano salvate, semplicemente non mostrate). Per ogni alimento premi <b>＋ scegli alimento…</b> e selezionalo dalla tabella (valori per 100 g, scalati sui grammi). Con <b>▸</b> vedi tutti i micro/macro. L'<b>indice settimanale OMS/FAO</b> confronta l'intake (piano × 7) coi riferimenti per adulto (energia e proteine personalizzate); i nutrienti <b>(max)</b> sono limiti da non superare. Valori indicativi, non un piano medico.</p>

   <p><b>Fonte dati alimenti:</b> Banca dati svizzera dei valori nutritivi (USAV/FSVO) — 1190 alimenti generici, valori per 100 g di parte edibile, usata con citazione della fonte come da licenza: <a href="https://naehrwertdaten.ch/it/" target="_blank">naehrwertdaten.ch</a>. Il campo <b>Carboidrati</b> sono i glucidi disponibili; <b>di cui zuccheri</b> sono gli zuccheri totali.</p>
   <p><b>Riferimenti OMS/FAO usati nell'indice</b> (adulto): grassi totali ≤30% E · grassi saturi ≤10% E · <b>zuccheri ≤10% E</b> (ideale &lt;5%) · sale &lt;5 g/die (≈ sodio &lt;2000 mg) · grassi <b>trans &lt;1% E</b> · carboidrati ~55% E · proteine 0,83 g/kg; micronutrienti sui valori di riferimento OMS/FAO. <span class="muted">L'indice usa gli <i>zuccheri totali</i> come proxy del limite OMS sugli zuccheri liberi; i grassi <i>trans</i> non sono nel dataset, quindi la soglia &lt;1% E è indicata ma non calcolata per alimento.</span></p>
   <p>Fonti OMS/FAO: <a href="https://www.who.int/news-room/fact-sheets/detail/healthy-diet" target="_blank">Healthy diet</a> · <a href="https://www.who.int/news/item/17-07-2023-who-updates-guidelines-on-fats-and-carbohydrates" target="_blank">Aggiornamento 2023 grassi/carboidrati</a> · <a href="https://www.fao.org/4/y5686e/y5686e00.htm" target="_blank">Fabbisogno energetico (FAO/WHO/UNU)</a> · <a href="https://www.fao.org/nutrition/requirements/archive/en/" target="_blank">Archivio fabbisogni FAO</a>.</p>

   <div class="sec" id="gc-dati">▌ 9 · Dati, profili e backup</div>
   <p>Tutto in locale, <b>nessun cloud</b>. Per profilo: <span class="mono">TMS_Dati/&lt;profilo&gt;/</span> con <span class="mono">scheda.json</span>, <span class="mono">storico.json</span>, <span class="mono">corpo.json</span>, <span class="mono">alimentazione.json</span>; condivisi alla root <span class="mono">profili.json</span> ed <span class="mono">esercizi.json</span>. Copia di sicurezza anche nel browser. Migrazioni automatiche con backup <span class="mono">storico.backup.json</span>. <b>Backup/Ripristino</b> (tab Profilo): <b>⭳ Backup</b> esporta tutti i dati in un file JSON, <b>⭱ Ripristina</b> li reimporta. In alternativa, backup manuale: copia la cartella <span class="mono">TMS_Dati</span>. <b>Cross-PC</b>: se la cartella è sincronizzata (es. cloud), i dati si spostano; connetti la cartella una volta per PC e non modificare in contemporanea su due dispositivi.</p>

   <div class="sec" id="gc-scambio">▌ 10 · Scheda ↔ cliente (per i coach)</div>
   <p>Per seguire un cliente a distanza non serve che lui abbia il TMS: la scheda <b>viaggia come file</b>.</p>
   <ol style="margin:0 0 6px 18px;line-height:1.8">
     <li><b>Esporta</b> — in <b>👤 Profilo</b>, nella riga del cliente, premi <b>📤 Esporta scheda</b> (se non è il profilo attivo, l'app lo attiva da sola). Nasce <span class="mono">Scheda_&lt;profilo&gt;_&lt;data&gt;.html</span>: una pagina autonoma con la scheda giorno per giorno, il previsto in chiaro e i campi compilabili; alla domanda sui video, includili se vuoi che il cliente veda le esecuzioni offline (file più pesante).</li>
     <li><b>Il cliente compila</b> — apre il file in qualunque browser, inserisce i valori effettivi (serie, ripetizioni, peso, RIR e note per esercizio; fatica RPE 0–10 e durata in minuti per seduta — gli esercizi non sono modificabili) e preme <b>📩 Crea il file per il trainer</b>: si scarica <span class="mono">Rientro_&lt;profilo&gt;_&lt;data&gt;.json</span> da rimandarti. Consiglio da girargli: <b>salvi il file nella memoria del telefono</b> e apra sempre quella copia (non l'anteprima della chat) — la <b>bozza si salva da sola</b> mentre compila, può chiudere e riprendere.</li>
     <li><b>Importa</b> — nella riga del cliente, <b>📥 Importa rientro</b>: scegli il file e la <b>data di registrazione</b> (l'app la converte nella settimana dello Storico). Le righe entrano nello Storico con le sedute numerate e la fatica in storico RPE: alimentano TL, ACWR, grafici e Report come una seduta registrata a mano.</li>
   </ol>
   <p><b>Controlli di sicurezza</b> all'import: file non valido → errore chiaro; <b>profilo diverso</b> da quello attivo → conferma esplicita; esercizi fuori catalogo → avviso con elenco; <b>settimana già popolata</b> → "le righe verranno AGGIUNTE, procedo?".</p>

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

