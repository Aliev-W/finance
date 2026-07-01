@echo off
chcp 65001 > nul
echo Dastur ishlab chiqish rejimida ishga tushirilmoqda...
echo.
echo Server: http://localhost:3001
echo Client: http://localhost:5173
echo.
start cmd /k "node server.js"
cd client && npm run dev
