@echo off
rem Avvio in sviluppo: deve aprirsi l'app con il gate "Connetti la cartella"
cd /d "%~dp0"
where npm >nul 2>nul || (echo ERRORE: Node.js/npm non trovato. Installa Node.js LTS da nodejs.org & pause & exit /b 1)
if not exist node_modules (
  echo Prima installazione dipendenze ^(puo' richiedere qualche minuto^)...
  call npm install || (echo ERRORE: npm install fallito & pause & exit /b 1)
)
call npm start
pause
