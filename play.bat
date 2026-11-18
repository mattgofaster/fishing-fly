@echo off
title Fishing Fly
cd /d "%~dp0"
if not exist node_modules call npm install
echo.
echo  Fishing Fly is starting. Your browser will open by itself.
echo  On your iPhone: use the "Network" address below (same Wi-Fi).
echo  Keep this window open while you play. Close it to stop.
echo.
call npm run dev -- --open
echo.
echo  The game server stopped. If you did not close it, the text above says why.
pause
