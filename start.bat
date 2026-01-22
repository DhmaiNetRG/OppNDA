@echo off
REM ============================================================
REM OppNDA Launcher (Windows)
REM Activates virtual environment and starts the application
REM ============================================================

set "SCRIPT_DIR=%~dp0"
set "VENV_DIR=%SCRIPT_DIR%venv"

echo Starting OppNDA...
echo.

REM Check if virtual environment exists
if not exist "%VENV_DIR%\Scripts\activate.bat" (
    echo Virtual environment not found!
    echo Please run setup.bat first to create the environment.
    pause
    exit /b 1
)

REM Activate virtual environment and run
call "%VENV_DIR%\Scripts\activate.bat"
echo Virtual environment activated.
echo.
echo Starting server at http://localhost:5000
echo Press Ctrl+C to stop the server.
echo.
python "%SCRIPT_DIR%run.py"
