@echo off
rem ============================================================
rem  PROVA_APP.bat
rem  Ricostruisce l'app dal sorgente (src/) e la avvia in modo
rem  SVILUPPO, per collaudarla PRIMA di pubblicare.
rem  Auto-update disattivato. Chiudi la finestra dell'app per uscire.
rem ============================================================
cd /d "%~dp0"
title TMS - prova prima di pubblicare

where npm >nul 2>nul || (echo ERRORE: Node.js/npm non trovato. Installa Node.js LTS da nodejs.org & pause & exit /b 1)

echo.
echo [1/3] Ricostruisco l'app dal sorgente...
call npm run build || (echo ERRORE: build fallito. & pause & exit /b 1)

echo.
echo [2/3] Controllo le dipendenze di Electron...
if not exist "electron\node_modules" (
  echo    Prima installazione ^(puo' richiedere qualche minuto^)...
  pushd electron
  call npm install || (echo ERRORE: npm install fallito. & popd & pause & exit /b 1)
  popd
)

echo.
echo [3/3] Avvio l'app. Chiudi la finestra per terminare.
echo.
pushd electron
call npm start
popd

echo.
echo App chiusa.
pause
