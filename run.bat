@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Pasang Node.js 22.12 atau lebih baru, di bawah versi 25.
 pause
 exit /b 1
)
node scripts\launch.mjs
if errorlevel 1 (
 echo Startup gagal. Baca pesan di atas.
 pause
 exit /b 1
)
endlocal
