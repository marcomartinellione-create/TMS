/* ════════════════ RENDER: STORICO CORPO (nascosto) ════════════════ */
function renderStoricoCorpo(){
  const io=DOC.storico_io;
  document.getElementById('panel-storicocorpo').innerHTML=`
   <div class="sec">▌ ${t('Storico misure corpo & peso')} <span class="pill">${io.length} ${t('rilevazioni')}</span></div>
   <div class="tbl-wrap"><table><thead><tr><th>${t('Scheda')}</th><th>${t('Peso')}</th><th>BMI</th><th>${t('M.grassa%')}</th><th>${t('M.magra')}</th><th>${t('M.musc.')}</th><th>${t('M.ossea')}</th><th>${t('Metab.bas.')}</th><th>${t('Fabbisogno')}</th><th>${t('Visc.')}</th></tr></thead>
     <tbody>${io.slice().reverse().map(r=>`<tr><td class="num">${r.scheda}</td><td class="num">${nf(r.peso,1)}</td><td class="num">${nf(r.bmi,1)}</td><td class="num">${nf((+r.massa_grassa||0)*100,1)}</td><td class="num">${nf(r.massa_magra,1)}</td><td class="num">${nf(r.massa_muscolare,1)}</td><td class="num">${nf(r.massa_ossea,1)}</td><td class="num">${nf(r.metab_basale,0)}</td><td class="num">${nf(r.metabolismo,0)}</td><td class="num">${nf(r.grasso_viscerale,1)}</td></tr>`).join('')||`<tr><td colspan="10" class="empty">${t('Nessuna misura salvata. Salvane dalla scheda «Corpo».')}</td></tr>`}</tbody></table></div>
   <div class="callout callout--info no-print"><div>${t('📜 Sezione nascosta. Salva nuove misure dalla scheda «Corpo»; qui trovi lo storico completo. Torna con un tab in alto.')}</div></div>`;
}

