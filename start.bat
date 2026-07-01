@echo off
chcp 65001 > nul
title Oylik Boshqaruv Tizimi

echo.
echo ================================================
echo    OYLIK BOSHQARUV TIZIMI
echo ================================================
echo.

:: Node.js borligini tekshirish
where node > nul 2>&1
if %errorlevel% neq 0 (
    echo [XATOLIK] Node.js topilmadi!
    echo.
    echo Yechim: https://nodejs.org dan yuklab o'rnating
    pause
    exit /b 1
)

cd /d "%~dp0"

:: Paketlar o'rnatilganmi?
if not exist "node_modules\" (
    echo [!] Birinchi marta o'rnatilmoqda...
    call npm install
    cd client
    call npm install
    call npm run build
    cd ..
)

:: Build qilinganmi?
if not exist "client\dist\" (
    echo [!] Build qilinmoqda...
    cd client
    call npm run build
    cd ..
)

:: Eski serverni to'xtatish
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F > nul 2>&1
)

echo [OK] Server ishga tushirilmoqda...
echo.
echo  Kompyuter:  http://localhost:3001
echo  Telefon:    Quyidagi manzilni ishlating
echo.

timeout /t 2 /nobreak > nul
start "" "http://localhost:3001"

node server.js

echo.
echo [!] Server to'xtatildi.
pause
