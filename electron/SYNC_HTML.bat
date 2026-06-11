@echo off
rem Ricopia l'HTML aggiornato del TMS (cartella padre) in renderer\index.html
cd /d "%~dp0"
if not exist renderer mkdir renderer
copy /y "..\Training Monitor System.html" "renderer\index.html"
if errorlevel 1 (
  echo ERRORE: copia fallita. Verifica il percorso ..\Training Monitor System.html
) else (
  echo OK: renderer\index.html aggiornato.
)
pause
