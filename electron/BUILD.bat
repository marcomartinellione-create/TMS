@echo off
rem Build dell'installer auto-aggiornante: dist\TMS-Setup-<versione>.exe + latest.yml
cd /d "%~dp0"
where npm >nul 2>nul || (echo ERRORE: Node.js/npm non trovato. Installa Node.js LTS da nodejs.org & pause & exit /b 1)
echo Aggiornamento dipendenze...
call npm install || (echo ERRORE: npm install fallito & pause & exit /b 1)
call npm run dist
if errorlevel 1 (
  echo ERRORE: build fallito. Controlla i messaggi sopra.
) else (
  echo.
  echo OK: file creati in dist\ — per la release su GitHub servono ENTRAMBI:
  dir /b dist\*.exe dist\latest.yml 2>nul
)
pause
