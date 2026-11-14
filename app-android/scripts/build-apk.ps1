# build-apk.ps1 — costruisce l'APK di TMS Scheda (debug, firmato con la chiave del progetto).
# Lo lancia «Crea APK.bat» (doppio clic). Tutto ciò che serve è già sul PC: Node, Java 17,
# Android SDK. Il risultato va in app-android\dist\TMS-Scheda-<versione>.apk.
$ErrorActionPreference = 'Stop'
$QUI = Split-Path -Parent $PSScriptRoot          # cartella app-android
Set-Location $QUI

function Passo($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Assicura($codice, $msg) { if ($codice -ne 0) { throw $msg } }

Passo "Controlli"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Manca Node.js" }
# un .bat lanciato col doppio clic eredita l'ambiente di Esplora risorse: le variabili si
# rileggono dal registro, e se mancano si cercano Java e l'SDK nei posti soliti
if (-not $env:JAVA_HOME)    { $env:JAVA_HOME    = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'User') }
if (-not $env:JAVA_HOME)    { $env:JAVA_HOME    = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'Machine') }
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = [Environment]::GetEnvironmentVariable('ANDROID_HOME', 'User') }
if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
  $jdk = @("$env:ProgramFiles\Eclipse Adoptium", "$env:ProgramFiles\Java") | Where-Object { Test-Path $_ } |
    ForEach-Object { Get-ChildItem $_ -Directory } | Where-Object { Test-Path (Join-Path $_.FullName 'bin\java.exe') } |
    Sort-Object Name -Descending | Select-Object -First 1
  if (-not $jdk) { throw "Manca Java (JDK 17)" }
  $env:JAVA_HOME = $jdk.FullName
}
$env:Path = (Join-Path $env:JAVA_HOME 'bin') + ';' + $env:Path
$sdk = @($env:ANDROID_HOME, 'D:\Android-SDK', (Join-Path $env:LOCALAPPDATA 'Android\Sdk')) | Where-Object { $_ } |
  Where-Object { Test-Path (Join-Path $_ 'platforms\android-34') } | Select-Object -First 1
if (-not $sdk) { throw "Android SDK con la piattaforma 34 non trovato (guardato in ANDROID_HOME, D:\Android-SDK, AppData)" }
$env:ANDROID_HOME = $sdk
Write-Host "JAVA_HOME   : $env:JAVA_HOME"
Write-Host "ANDROID_HOME: $env:ANDROID_HOME"

# la chiave di firma NON si ricrea da sola: una chiave nuova renderebbe impossibile aggiornare
# l'app già installata sui telefoni (bisognerebbe disinstallarla, perdendo la bozza del cliente)
$firma = Join-Path $QUI 'firma\tms-scheda.keystore'
if (-not (Test-Path $firma)) {
  Write-Host ""
  Write-Host "MANCA la chiave di firma: $firma" -ForegroundColor Red
  Write-Host "Se l'APK è già sui telefoni dei clienti, recuperala (copia di OneDrive, cestino)."
  Write-Host "Solo se l'app non è MAI stata data a nessuno: powershell -File scripts\crea-firma.ps1"
  throw "chiave di firma mancante"
}

Passo "PWA dentro l'app (docs\app -> www)"
node scripts/prepara-www.js
Assicura $LASTEXITCODE "prepara-www.js fallito"

Passo "Dipendenze npm"
if (-not (Test-Path 'node_modules\@capacitor\android')) {
  npm install --no-audit --no-fund
  Assicura $LASTEXITCODE "npm install fallito"
} else { Write-Host "già presenti" }

Passo "Progetto Android"
if (-not (Test-Path 'android')) {
  npx cap add android
  Assicura $LASTEXITCODE "cap add android fallito"
} else { Write-Host "cartella android\ già presente, la riuso" }
node scripts/patch-android.js
Assicura $LASTEXITCODE "patch-android.js fallito"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\immagini.ps1 -Icona ..\docs\app\icon-512.png -Res android\app\src\main\res
Assicura $LASTEXITCODE "immagini.ps1 fallito"

Passo "Sync (www e plugin dentro il progetto Android)"
npx cap sync android
Assicura $LASTEXITCODE "cap sync fallito"
node scripts/patch-android.js
Assicura $LASTEXITCODE "patch-android.js (dopo sync) fallito"

Passo "Compilazione (Gradle)"
$build = (node scripts/cartella-build.js)
Write-Host "compilazione in: $build"
Push-Location android
.\gradlew.bat --no-daemon --project-cache-dir "$build\.gradle" assembleDebug
$codice = $LASTEXITCODE
if ($codice -ne 0) {
  # visto il 14/11/2026: subito dopo `cap sync` OneDrive può tenere occupato per qualche secondo un
  # file appena copiato in android\app\src\main\assets e Gradle si ferma. Un secondo giro basta.
  Write-Host "`nOneDrive teneva occupato un file: riprovo fra 10 secondi..." -ForegroundColor Yellow
  Start-Sleep -Seconds 10
  .\gradlew.bat --no-daemon --project-cache-dir "$build\.gradle" assembleDebug
  $codice = $LASTEXITCODE
}
Pop-Location
Assicura $codice "compilazione Gradle fallita"

$apk = Join-Path $build 'app\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path $apk)) { throw "APK non trovato in $apk" }
$versione = (Get-Content package.json -Raw | ConvertFrom-Json).version
$dest = Join-Path $QUI 'dist'
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$finale = Join-Path $dest "TMS-Scheda-$versione.apk"
Copy-Item $apk $finale -Force

Write-Host "`nFATTO." -ForegroundColor Green
Write-Host "APK pronto: $finale" -ForegroundColor Green
Write-Host "Mandalo al telefono (WhatsApp, email, cavo) e aprilo: Android chiede di consentire l'installazione."
