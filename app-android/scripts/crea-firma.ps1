# crea-firma.ps1 — crea la chiave di firma dell'APK (UNA VOLTA SOLA, il 14/11/2026).
# Tutte le versioni dell'APK vanno firmate con QUESTA chiave: con una chiave diversa il telefono
# rifiuta l'aggiornamento, e disinstallare l'app cancella la bozza del cliente.
# La chiave sta in app-android\firma\ (fuori da git, salvata da OneDrive). NON rilanciare questo
# script se l'app è già stata data a qualcuno: si ferma da solo se la chiave c'è già.
$ErrorActionPreference = 'Stop'
$QUI = Split-Path -Parent $PSScriptRoot
$firma = Join-Path $QUI 'firma\tms-scheda.keystore'
if (Test-Path $firma) { throw "La chiave esiste già: $firma (non la sovrascrivo)" }
New-Item -ItemType Directory -Force -Path (Split-Path $firma) | Out-Null
$kt = 'keytool'
if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\keytool.exe'))) { $kt = Join-Path $env:JAVA_HOME 'bin\keytool.exe' }
& $kt -genkeypair -v -keystore $firma -storetype PKCS12 -alias tms-scheda -keyalg RSA -keysize 2048 -validity 36500 `
  -storepass android -keypass android -dname "CN=TMS Scheda, OU=Training Monitor System, O=Wander, C=IT"
if ($LASTEXITCODE -ne 0) { throw "keytool non è riuscito a creare la chiave" }
Write-Host "Chiave creata: $firma" -ForegroundColor Green
