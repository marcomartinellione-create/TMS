@echo off
rem Crea l'APK di TMS Scheda (app Android del cliente) dalla PWA di docs\app.
rem Risultato: app-android\dist\TMS-Scheda-<versione>.apk
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-apk.ps1"
echo.
pause
