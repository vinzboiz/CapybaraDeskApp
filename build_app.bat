@echo off
title Dong goi Capybara Desktop Pet thanh file .EXE
cd /d "%~dp0"

echo ================================================================
echo   DONG GOI CAPYBARA DESKTOP PET THANH FILE .EXE
echo   (File .exe doc lap, chia se cho ban be chi can bam chay ngay)
echo ================================================================
echo.

echo [1/2] Dang kiem tra va cai dat electron-builder (neu chua co)...
call npm install electron-builder --save-dev

echo.
echo [2/2] Dang dong goi thanh file .exe (Portable va Setup)...
call npm run dist

echo.
echo ================================================================
echo   HOAN TAT! File .exe da duoc tao trong thu muc "dist\":
echo   1. "Capybara Desktop Pet 1.0.0.exe" (Ban Portable chay ngay)
echo   2. "Capybara Desktop Pet Setup 1.0.0.exe" (Ban cai dat)
echo.
echo   Ban chi can gui file .exe nay cho bat ky ai, ho bam chay la duoc!
echo ================================================================
pause
