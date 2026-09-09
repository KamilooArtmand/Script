@echo off
chcp 65001 >nul
title Font-FIX Pro - Dual Engine (Folders and Individual Files)
cd /d "%~dp0"

echo ==============================================================================
echo    Font-FIX Pro - Dual Engine (Folders and Individual Files)
echo ==============================================================================
echo [*] Working Directory: %~dp0
echo.

if not exist "%~dp0Font-FIX.ps1" (
    echo [ERROR] "Font-FIX.ps1" was not found in:
    echo         %~dp0
    echo.
    echo Please ensure both "Font-FIX.bat" and "Font-FIX.ps1" are in the same folder.
    echo Download both files together and place them in: %~dp0
    echo.
    echo ==============================================================================
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo [*] Starting automatic processing on root and all subfolders...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Font-FIX.ps1" -TargetDirectory "%~dp0"

echo.
echo ==============================================================================
echo [*] Batch execution finished.
echo ==============================================================================
echo Press any key to close this window...
pause >nul
