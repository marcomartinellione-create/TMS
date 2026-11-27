/* patch-android.js — adatta il progetto Android generato da `npx cap add android`.
   Si lancia dalla cartella app-android/ (lo fa build-apk.ps1, prima e dopo `cap sync`).
   Ogni modifica è idempotente: rilanciarlo non duplica niente.

   1. local.properties: dove sta l'Android SDK (sennò Gradle lo cerca nelle variabili d'ambiente,
      che un .bat lanciato col doppio clic può non vedere);
   2. sorgenti nativi (MainActivity + plugin TmsFile, TmsCartella e TmsSeduta + servizio TmsSedutaService +
      ricevitore TmsAvvioReceiver) da nativo/;
   3. AndroidManifest: permesso di vibrare (timer), niente più «Apri con» per i .json,
      fotocamera visibile all'app (per «Scatta una foto»), Bluetooth della bilancia senza posizione,
      installazione dell'APK nuovo dalla cartella condivisa; icona bianca dei promemoria;
   4. stile: barra di stato scura come la PWA, schermata d'avvio nera con la stella
      (le immagini le fa scripts/immagini.ps1);
   5. build.gradle: versione dall'package.json, firma con la chiave del progetto (firma/),
      compilazione fuori da OneDrive. */
'use strict';
const fs = require('fs');
const path = require('path');

const QUI = path.join(__dirname, '..');
const AND = path.join(QUI, 'android');
const APP = path.join(AND, 'app');
const MAIN = path.join(APP, 'src', 'main');
const RES = path.join(MAIN, 'res');
const PKG = 'com.trainingmonitorsystem.scheda';
const BUILD = require('./cartella-build');
const FIRMA = path.join(QUI, 'firma', 'tms-scheda.keystore');

function must(f) { if (!fs.existsSync(f)) { console.error('patch-android: MANCA ' + f); process.exit(1); } }
function leggi(f) { must(f); return fs.readFileSync(f, 'utf8'); }
function scrivi(f, s) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s, 'utf8'); }
const avanti = p => String(p).replace(/\\/g, '/');

must(AND);
const pkg = JSON.parse(leggi(path.join(QUI, 'package.json')));
const cap = JSON.parse(leggi(path.join(QUI, 'capacitor.config.json')));
if (cap.appId !== PKG) { console.error('patch-android: appId diverso da ' + PKG + ' in capacitor.config.json'); process.exit(1); }

/* 1) local.properties */
{
  const candidati = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, 'D:\\Android-SDK',
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk')]
    .filter(Boolean).map(p => String(p).trim().replace(/^"|"$/g, ''));
  const sdk = candidati.find(p => fs.existsSync(path.join(p, 'platforms', 'android-34'))) ||
              candidati.find(p => fs.existsSync(path.join(p, 'platform-tools'))) || candidati[0];
  if (!sdk) { console.error('patch-android: non so dove sia l\'Android SDK'); process.exit(1); }
  scrivi(path.join(AND, 'local.properties'), 'sdk.dir=' + avanti(sdk) + '\n');
  console.log('local.properties → sdk.dir = ' + sdk);
}

/* 2) sorgenti nativi */
{
  const dest = path.join(MAIN, 'java', ...PKG.split('.'));
  fs.mkdirSync(dest, { recursive: true });
  for (const f of ['MainActivity.java', 'TmsFilePlugin.java', 'TmsCartellaPlugin.java', 'TmsSedutaPlugin.java', 'TmsSedutaService.java', 'TmsAvvioReceiver.java']) {
    fs.copyFileSync(path.join(QUI, 'nativo', f), path.join(dest, f));
  }
  console.log('sorgenti nativi copiati in ' + path.relative(QUI, dest));
}

/* 3) AndroidManifest */
{
  const f = path.join(MAIN, 'AndroidManifest.xml');
  let s = leggi(f);
  /* «Apri con» / «Condividi» per i .json: tolti dal 17/11/2026 (la scheda arriva solo dalla cartella
     condivisa, niente più file Scheda/Rientro). Un progetto Android già generato li ha ancora: si
     tolgono, così TMS Scheda non compare più fra le app che aprono i .json */
  { const a = s.indexOf('            <!-- TMS: apri con -->'), fine = '            <!-- TMS: fine -->\n', b = s.indexOf(fine);
    if (a >= 0 && b > a) s = s.slice(0, a) + s.slice(b + fine.length); }
  if (!s.includes('android.permission.VIBRATE')) {
    s = s.replace('<uses-permission android:name="android.permission.INTERNET" />',
      '<uses-permission android:name="android.permission.INTERNET" />\n    <!-- TMS: vibrazione a fine recupero (timer) -->\n    <uses-permission android:name="android.permission.VIBRATE" />');
    if (!s.includes('android.permission.VIBRATE')) { console.error('patch-android: non trovo dove aggiungere il permesso VIBRATE'); process.exit(1); }
  }
  /* bilancia Bluetooth (plugin @capacitor-community/bluetooth-le): da Android 12 basta «Dispositivi
     nelle vicinanze» SENZA posizione (neverForLocation: l'app non ricava dove sei dalle ricerche);
     la posizione la dichiara il plugin, qui la si limita ai telefoni fino ad Android 11
     (maxSdkVersion 30), dove Android la pretende per cercare dispositivi Bluetooth */
  if (!s.includes('<!-- TMS: bilancia Bluetooth -->')) {
    const ble = '    <!-- TMS: bilancia Bluetooth -->\n' +
      '    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />\n' +
      '    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" android:maxSdkVersion="30" />\n' +
      '    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />\n';
    if (s.split('</manifest>').length !== 2) { console.error('patch-android: AndroidManifest inatteso (</manifest>)'); process.exit(1); }
    s = s.replace('</manifest>', ble + '</manifest>');
  }
  /* GPS DELLE ATTIVITÀ ALL'APERTO (APK 1.9.0): la posizione serve davvero (percorso, distanza, dislivello), anche
     da Android 12 in poi: si toglie il limite a Android 11 dalle due righe qui sopra (la ricerca Bluetooth resta
     «neverForLocation»: dalle ricerche l'app non ricava dove sei). Il servizio della seduta diventa anche di tipo
     «location» (con FOREGROUND_SERVICE_LOCATION) così il GPS continua a schermo spento; GPS non obbligatorio per
     installare l'app */
  s = s.replace('<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" android:maxSdkVersion="30" />', '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />')
       .replace('<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />', '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />')
       .replace('android:name=".TmsSedutaService" android:exported="false" android:foregroundServiceType="connectedDevice" />', 'android:name=".TmsSedutaService" android:exported="false" android:foregroundServiceType="connectedDevice|location" />');
  if (!s.includes('android.permission.FOREGROUND_SERVICE_LOCATION')) {
    s = s.replace('</manifest>', '    <!-- TMS: GPS delle attività all\'aperto (anche a schermo spento) -->\n' +
      '    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />\n' +
      '    <uses-feature android:name="android.hardware.location.gps" android:required="false" />\n</manifest>');
  }
  /* da Android 11 un'app «vede» le altre solo se lo dichiara: senza questa riga Capacitor non
     trova l'app Fotocamera e «Scatta una foto» ripiega sulla galleria (visto sull'emulatore) */
  if (!s.includes('android.media.action.IMAGE_CAPTURE')) {
    const q = '    <!-- TMS: «Scatta una foto» apre la fotocamera -->\n    <queries>\n        <intent>\n            <action android:name="android.media.action.IMAGE_CAPTURE" />\n        </intent>\n    </queries>\n\n';
    if (s.split('    <application').length !== 2) { console.error('patch-android: AndroidManifest inatteso (<application>)'); process.exit(1); }
    s = s.replace('    <application', q + '    <application');
  }
  /* aggiornamento dalla cartella condivisa: l'app passa l'APK nuovo all'installer di Android
     (che chiede sempre conferma; la prima volta va concesso «Installa app sconosciute») */
  if (!s.includes('android.permission.REQUEST_INSTALL_PACKAGES')) {
    s = s.replace('</manifest>', '    <!-- TMS: aggiornamento dell\'APK dalla cartella condivisa -->\n    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />\n</manifest>');
  }
  /* foto progressi con la sagoma: la fotocamera si apre DENTRO l'app (getUserMedia della pagina), e
     Android la concede solo se l'app dichiara la fotocamera; non obbligatoria per installare l'app */
  if (!s.includes('android.permission.CAMERA')) {
    s = s.replace('</manifest>', '    <!-- TMS: fotocamera dentro l\'app (foto progressi con la sagoma) -->\n    <uses-permission android:name="android.permission.CAMERA" />\n    <uses-feature android:name="android.hardware.camera" android:required="false" />\n</manifest>');
  }
  /* timer di recupero: la notifica «Recupero finito» deve arrivare al secondo giusto anche con l'app in
     secondo piano (senza sveglia esatta Android la può ritardare di minuti). Da Android 13 basta
     USE_EXACT_ALARM, concessa da sé alle app che fanno da timer; su Android 12 SCHEDULE_EXACT_ALARM */
  if (!s.includes('android.permission.USE_EXACT_ALARM')) {
    s = s.replace('</manifest>', '    <!-- TMS: notifica di fine recupero al secondo giusto -->\n    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" android:maxSdkVersion="32" />\n    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />\n</manifest>');
  }
  /* SEDUTA IN PRIMO PIANO (27/11/2026): durante una seduta o una registrazione il servizio TmsSedutaService
     tiene il collegamento Bluetooth del battito e la notifica fissa. Android 14 vuole il tipo del servizio
     (connectedDevice) e il suo permesso; CHANGE_NETWORK_STATE (permesso normale) è uno dei prerequisiti di
     connectedDevice e vale anche quando l'utente non ha mai collegato una fascia (seduta senza battito);
     WAKE_LOCK per non perdere i battiti col telefono in tasca; la richiesta di non ottimizzare la batteria
     la fa la pagina una volta sola, spiegata prima */
  if (!s.includes('<!-- TMS: seduta in primo piano -->')) {
    s = s.replace('</manifest>', '    <!-- TMS: seduta in primo piano -->\n' +
      '    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />\n' +
      '    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE" />\n' +
      '    <uses-permission android:name="android.permission.CHANGE_NETWORK_STATE" />\n' +
      '    <uses-permission android:name="android.permission.WAKE_LOCK" />\n' +
      '    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />\n</manifest>');
  }
  if (!s.includes('android:name=".TmsSedutaService"')) {
    if (s.split('</application>').length !== 2) { console.error('patch-android: AndroidManifest inatteso (</application>)'); process.exit(1); }
    s = s.replace('</application>', '    <!-- TMS: seduta in primo piano (battito a schermo spento, notifica fissa) -->\n' +
      '        <service android:name=".TmsSedutaService" android:exported="false" android:foregroundServiceType="connectedDevice|location" />\n    </application>');
  }
  /* SEMPRE COLLEGATO (APK 1.8.1): il servizio riparte all'accensione del telefono e dopo un aggiornamento dell'app
     (TmsAvvioReceiver, esportato perché BOOT_COMPLETED e MY_PACKAGE_REPLACED arrivano dal sistema: sono trasmissioni
     protette, nessun'altra app può mandarle, e il ricevitore ignora tutto il resto) */
  if (!s.includes('android.permission.RECEIVE_BOOT_COMPLETED')) {
    s = s.replace('</manifest>', '    <!-- TMS: sempre collegato, riavvio all\'accensione del telefono -->\n    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />\n</manifest>');
  }
  if (!s.includes('android:name=".TmsAvvioReceiver"')) {
    if (s.split('</application>').length !== 2) { console.error('patch-android: AndroidManifest inatteso (</application>)'); process.exit(1); }
    s = s.replace('</application>', '    <!-- TMS: sempre collegato (riavvio all\'accensione e dopo un aggiornamento) -->\n' +
      '        <receiver android:name=".TmsAvvioReceiver" android:exported="true">\n' +
      '            <intent-filter>\n' +
      '                <action android:name="android.intent.action.BOOT_COMPLETED" />\n' +
      '                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />\n' +
      '                <action android:name="android.intent.action.QUICKBOOT_POWERON" />\n' +
      '            </intent-filter>\n' +
      '        </receiver>\n    </application>');
  }
  /* FINESTRA MOBILE (Picture-in-Picture, come YouTube): l'attività la dichiara; entra e esce la MainActivity */
  if (!s.includes('android:supportsPictureInPicture')) {
    if (s.split('<activity').length !== 2) { console.error('patch-android: AndroidManifest inatteso (<activity>)'); process.exit(1); }
    s = s.replace('<activity', '<activity\n            android:supportsPictureInPicture="true"\n            android:resizeableActivity="true"');
  }
  scrivi(f, s);
  console.log('AndroidManifest: vibrazione, bilancia Bluetooth senza posizione, aggiornamento dell\'APK, fotocamera, sveglie esatte, seduta in primo piano, sempre collegato, finestra mobile');
  /* icona dei promemoria (barra delle notifiche): una sagoma bianca, Android la colora da sé */
  scrivi(path.join(RES, 'drawable', 'ic_stat_tms.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n<!-- TMS Scheda: icona dei promemoria (bilancia). Generato da scripts/patch-android.js -->\n' +
    '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">\n' +
    '    <path android:fillColor="#FFFFFFFF" android:fillType="evenOdd" android:pathData="M6,3h12a3,3 0,0 1,3 3v12a3,3 0,0 1,-3 3H6a3,3 0,0 1,-3 -3V6a3,3 0,0 1,3 -3zM12,6a5,5 0,0 0,-4.6 3h2.3l1.3,-1.5 0.8,0.6 -0.8,0.9h3.6a5,5 0,0 0,-2.6 -3zM7,14v4h10v-4z" />\n' +
    '</vector>\n');
}

/* 4) stile, colori, schermata d'avvio */
{
  scrivi(path.join(RES, 'values', 'tms_colori.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n<!-- TMS Scheda: colori della PWA (theme-color e icona). Generato da scripts/patch-android.js -->\n<resources>\n' +
    '    <color name="tms_scuro">#2B1D10</color>\n    <color name="tms_nero">#0D0B08</color>\n    <color name="tms_pergamena">#F4EAD8</color>\n' +
    '    <color name="colorPrimary">#2B1D10</color>\n    <color name="colorPrimaryDark">#2B1D10</color>\n    <color name="colorAccent">#9A5B1F</color>\n</resources>\n');
  scrivi(path.join(RES, 'values', 'styles.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n<!-- TMS Scheda. Generato da scripts/patch-android.js -->\n<resources>\n\n' +
    '    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">\n' +
    '        <item name="colorPrimary">@color/colorPrimary</item>\n' +
    '        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>\n' +
    '        <item name="colorAccent">@color/colorAccent</item>\n' +
    '    </style>\n\n' +
    '    <!-- la pagina: chiara come la PWA (che non ha un tema notte), barre di sistema scure -->\n' +
    '    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.Light.NoActionBar">\n' +
    '        <item name="windowActionBar">false</item>\n' +
    '        <item name="windowNoTitle">true</item>\n' +
    '        <item name="android:background">@null</item>\n' +
    '        <item name="android:windowBackground">@color/tms_pergamena</item>\n' +
    '        <item name="android:statusBarColor">@color/tms_scuro</item>\n' +
    '        <item name="android:navigationBarColor">@color/tms_scuro</item>\n' +
    '    </style>\n\n' +
    '    <!-- avvio: nero con la stella, come l\'icona -->\n' +
    '    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">\n' +
    '        <item name="android:background">@drawable/splash</item>\n' +
    '        <item name="windowSplashScreenBackground">@color/tms_nero</item>\n' +
    '        <item name="windowSplashScreenAnimatedIcon">@mipmap/ic_launcher_foreground</item>\n' +
    '        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>\n' +
    '    </style>\n</resources>\n');
  /* via le schermate d'avvio col logo di Capacitor: al loro posto un disegno (nero + stella) */
  for (const d of fs.readdirSync(RES)) {
    if (!/^drawable/.test(d)) continue;
    const png = path.join(RES, d, 'splash.png');
    if (fs.existsSync(png)) fs.rmSync(png);
    if (fs.existsSync(path.join(RES, d)) && !fs.readdirSync(path.join(RES, d)).length) fs.rmdirSync(path.join(RES, d));
  }
  scrivi(path.join(RES, 'drawable', 'splash.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n<!-- TMS Scheda: avvio nero con la stella. Generato da scripts/patch-android.js -->\n' +
    '<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n' +
    '    <item android:drawable="@color/tms_nero" />\n' +
    '    <item><bitmap android:gravity="center" android:src="@drawable/tms_logo" /></item>\n' +
    '</layer-list>\n');
  console.log('stile: barre scure, pagina chiara, avvio nero con la stella');
}

/* 5) build.gradle: versione, firma, compilazione fuori da OneDrive */
{
  const f = path.join(APP, 'build.gradle');
  let s = leggi(f);
  const [ma, mi, pa] = String(pkg.version).split('.').map(n => parseInt(n, 10) || 0);
  const codice = ma * 10000 + mi * 100 + pa;
  s = s.replace(/versionCode \d+/, 'versionCode ' + codice).replace(/versionName "[^"]*"/, 'versionName "' + pkg.version + '"');
  /* la cartella condivisa (TmsCartellaPlugin) si gira con DocumentFile */
  if (!s.includes('androidx.documentfile')) {
    if (!/dependencies \{\n/.test(s)) { console.error('patch-android: app/build.gradle senza dependencies'); process.exit(1); }
    s = s.replace(/dependencies \{\n/, 'dependencies {\n    implementation "androidx.documentfile:documentfile:1.0.1"   // TMS: cartella condivisa\n');
  }
  if (!s.includes('// TMS: firma')) {
    const firma =
      '    // TMS: firma — SEMPRE la stessa chiave (firma/tms-scheda.keystore, fuori da git): con una chiave\n' +
      '    // diversa il telefono rifiuta l\'aggiornamento e bisognerebbe disinstallare, perdendo la bozza.\n' +
      '    signingConfigs {\n' +
      '        debug {\n' +
      '            storeFile file("' + avanti(FIRMA) + '")\n' +
      '            storePassword "android"\n' +
      '            keyAlias "tms-scheda"\n' +
      '            keyPassword "android"\n' +
      '        }\n' +
      '    }\n';
    if (!/android \{\n/.test(s)) { console.error('patch-android: app/build.gradle inatteso'); process.exit(1); }
    s = s.replace(/android \{\n/, 'android {\n' + firma);
  }
  scrivi(f, s);
  const r = path.join(AND, 'build.gradle');
  let t = leggi(r);
  if (!t.includes('// >>> TMS: compila fuori da OneDrive')) {
    t += '\n// >>> TMS: compila fuori da OneDrive (scripts/cartella-build.js): dentro, OneDrive blocca i file\n' +
      'allprojects {\n    layout.buildDirectory.set(file("' + avanti(BUILD) + '/" + project.name))\n}\n// <<< TMS\n';
    scrivi(r, t);
  }
  console.log('build.gradle: versione ' + pkg.version + ' (codice ' + codice + '), firma ' + path.relative(QUI, FIRMA) + ', compilazione in ' + BUILD);
}
