/* invito.cjs — un codice d'invito nuovo per un personal (si usa una volta sola).
   Uso, dalla cartella hub/:   node invito.cjs */
'use strict';
const { creaInvito, bello } = require('./comune.cjs');
try {
  const c = creaInvito();
  console.log('\nCodice d\'invito: ' + bello(c));
  console.log('Il personal lo scrive nel suo TMS: ⚙ Impostazioni › Telefono collegato › Attiva.\n');
} catch (e) { console.error('\n✖ ' + e.message + '\n'); process.exit(1); }
