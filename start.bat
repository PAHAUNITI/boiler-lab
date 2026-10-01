@echo off
cd /d "%~dp0"
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    start "" python server.py
) else (
    start "" index.html
)
exit
