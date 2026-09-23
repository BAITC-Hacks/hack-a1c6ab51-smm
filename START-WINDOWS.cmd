@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.9 or newer from https://nodejs.org
  echo Then run this file again.
  pause
  exit /b 1
)
echo Starting Alem. Open the localhost URL printed below.
echo Keep this window open while using the website.
node start.mjs
pause
