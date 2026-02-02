@echo off
REM ============================================================
REM OppNDA Setup Script (Windows)
REM Creates virtual environment and installs dependencies
REM ============================================================

setlocal EnableDelayedExpansion

REM Store the script's directory safely using delayed expansion
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=!SCRIPT_DIR:~0,-1!"

REM Navigate to parent directory to get PROJECT_ROOT
for %%I in ("!SCRIPT_DIR!\..") do set "PROJECT_ROOT=%%~fI"

set "VENV_DIR=!PROJECT_ROOT!\venv"
set "REQUIREMENTS_FILE=!PROJECT_ROOT!\requirements.txt"

echo ============================================
echo        OppNDA Environment Setup
echo ============================================
echo.
echo Project Root: !PROJECT_ROOT!
echo Virtual Env:  !VENV_DIR!
echo.

REM Check Python version
echo [1/5] Checking Python version...
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo   Found Python !PYTHON_VERSION!

for /f "tokens=1,2 delims=." %%a in ("!PYTHON_VERSION!") do (
    set MAJOR=%%a
    set MINOR=%%b
)

if !MAJOR! lss 3 (
    echo Error: Python 3.8 or higher is required
    pause
    exit /b 1
)
if !MAJOR! equ 3 if !MINOR! lss 8 (
    echo Error: Python 3.8 or higher is required
    pause
    exit /b 1
)
echo   [OK] Python version OK
echo.

REM Create virtual environment
echo [2/5] Setting up virtual environment...
if exist "!VENV_DIR!" (
    echo   Virtual environment already exists at: !VENV_DIR!
    set /p RECREATE="  Do you want to recreate it? (y/N): "
    if /i "!RECREATE!"=="y" (
        echo   Removing existing virtual environment...
        rmdir /s /q "!VENV_DIR!"
        python -m venv "!VENV_DIR!"
        echo   [OK] Virtual environment recreated
    ) else (
        echo   [OK] Using existing virtual environment
    )
) else (
    python -m venv "!VENV_DIR!"
    echo   [OK] Virtual environment created at: !VENV_DIR!
)
echo.

REM Activate virtual environment
echo [3/5] Activating virtual environment...
call "!VENV_DIR!\Scripts\activate.bat"
echo   [OK] Virtual environment activated
echo.

REM Upgrade pip
echo [4/5] Upgrading pip...
python -m pip install --upgrade pip --quiet
echo   [OK] pip upgraded
echo.

REM Install requirements
echo [5/5] Installing requirements...
if exist "!REQUIREMENTS_FILE!" (
    pip install -r "!REQUIREMENTS_FILE!" --quiet
    echo   [OK] Requirements installed
) else (
    echo   Warning: requirements.txt not found at !REQUIREMENTS_FILE!
)
echo.

REM Check for outdated packages
echo Checking for outdated packages...
pip list --outdated --format=columns 2>nul
if %ERRORLEVEL% equ 0 (
    echo.
    set /p UPDATE="Would you like to update all packages? (y/N): "
    if /i "!UPDATE!"=="y" (
        pip install -r "!REQUIREMENTS_FILE!" --upgrade --quiet
        echo   [OK] All packages updated
    )
) else (
    echo   [OK] All packages are up to date!
)
echo.

REM Summary
echo ============================================
echo        Setup Complete!
echo ============================================
echo.
echo To activate the virtual environment in the future, run:
echo   ..\venv\Scripts\activate
echo.
echo To start OppNDA, run:
echo   start.bat
echo.

pause
