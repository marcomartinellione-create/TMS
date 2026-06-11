/* ════════════════ RENDER: STORICO CORPO (nascosto) ════════════════ */
function renderStoricoCorpo(){
  const io=DOC.storico_io;
  document.getElementById('panel-storicocorpo').innerHTML=`
   <div class="sec">▌ Storico misure corpo & peso <span class="pill">${io.length} rilevazioni</span></div>
   <div class="tbl-wrap"><table><thead><tr><th>Scheda</th><th>Peso</th><th>BMI</th><th>M.grassa%</th><th>M.magra</th><th>M.musc.</th><th>M.ossea</th><th>Metab.bas.</th><th>Fabbisogno</th><th>Visc.</th></tr></thead>
     <tbody>${io.slice().reverse().map(r=>`<tr><td class="num">${r.scheda}</td><td class="num">${nf(r.peso,1)}</td><td class="num">${nf(r.bmi,1)}</td><td class="num">${nf((+r.massa_grassa||0)*100,1)}</td><td class="num">${nf(r.massa_magra,1)}</td><td class="num">${nf(r.massa_muscolare,1)}</td><td class="num">${nf(r.massa_ossea,1)}</td><td class="num">${nf(r.metab_basale,0)}</td><td class="num">${nf(r.metabolismo,0)}</td><td class="num">${nf(r.grasso_viscerale,1)}</td></tr>`).join('')||'<tr><td colspan="10" class="empty">Nessuna misura salvata. Salvane dalla scheda «Corpo».</td></tr>'}</tbody></table></div>
   <div class="callout callout--info no-print"><div>📜 Sezione nascosta. Salva nuove misure dalla scheda «Corpo»; qui trovi lo storico completo. Torna con un tab in alto.</div></div>`;
}

