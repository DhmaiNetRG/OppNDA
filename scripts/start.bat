@echo off
REM ============================================================
REM OppNDA Launcher (Windows)
REM Activates virtual environment and starts the application
REM ============================================================

setlocal EnableDelayedExpansion

REM Store the script's directory safely using delayed expansion
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=!SCRIPT_DIR:~0,-1!"

REM Navigate to parent directory to get PROJECT_ROOT
for %%I in ("!SCRIPT_DIR!\..") do set "PROJECT_ROOT=%%~fI"

set "VENV_DIR=!PROJECT_ROOT!\venv"

echo Starting OppNDA...
echo.

REM Check if virtual environment exists
if not exist "!VENV_DIR!\Scripts\activate.bat" (
    echo Virtual environment not found!
    echo Please run setup.bat first to create the environment.
    pause
    exit /b 1
)

REM Activate virtual environment and run
call "!VENV_DIR!\Scripts\activate.bat"
echo Virtual environment activated.
echo.
echo Starting server at http://localhost:5001
echo Press Ctrl+C to stop the server.
echo.
python "!PROJECT_ROOT!\OppNDA.py"
