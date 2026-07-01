@echo off
chcp 65001 > nul
echo.
echo ╔════════════════════════════════════════╗
echo ║     OYLIK BOSHQARUV TIZIMI             ║
echo ║     O'rnatish bosqichi...              ║
echo ╚════════════════════════════════════════╝
echo.

echo [1/3] Server paketlari o'rnatilmoqda...
npm install
if errorlevel 1 (
    echo XATOLIK: Server paketlari o'rnatilmadi
    pause
    exit /b 1
)

echo.
echo [2/3] Client paketlari o'rnatilmoqda...
cd client
npm install
if errorlevel 1 (
    echo XATOLIK: Client paketlari o'rnatilmadi
    pause
    exit /b 1
)

echo.
echo [3/3] Dastur qurilmoqda...
npm run build
if errorlevel 1 (
    echo XATOLIK: Build muvaffaqiyatsiz
    pause
    exit /b 1
)
cd ..

echo.
echo ╔════════════════════════════════════════╗
echo ║  O'rnatish tayyor! start.bat bosing.   ║
echo ╚════════════════════════════════════════╝
echo.
pause
