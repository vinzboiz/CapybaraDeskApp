@echo off
title Capy Desktop Pet
cd /d "%~dp0"
taskkill /f /im electron.exe >nul 2>&1
echo ======================================================
echo  Capybara Desktop Pet dang khoi dong...
echo  (Luu y: Cua so nay duy tri app, dung tat cua so nhe!)
echo ======================================================
npm start

