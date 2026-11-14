/* Dove Gradle compila l'APK: FUORI da OneDrive. Dentro, OneDrive blocca i file appena scritti
   mentre li sincronizza e la compilazione muore (AccessDeniedException), come è già successo
   col Taccuino SustEner. Una sola fonte per il percorso: la usano patch-android.js
   (build.gradle) e build-apk.ps1 (`node scripts/cartella-build.js` lo stampa). */
'use strict';
const fs = require('fs');
const path = require('path');

const cartella = fs.existsSync('D:\\')
  ? 'D:\\Android-build\\TMS-Scheda'
  : path.join(process.env.LOCALAPPDATA || require('os').tmpdir(), 'TMS-Scheda-build');

module.exports = cartella;
if (require.main === module) process.stdout.write(cartella);
