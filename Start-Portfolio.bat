@echo off
title Aevon Digital Solutions - Portfolio Server
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel%==0 (
    echo Starting local portfolio server at http://localhost:8080 ...
    start "" "http://localhost:8080"
    python -m http.server 8080
) else (
    start "" "%~dp0index.html"
)
