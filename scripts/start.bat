@echo off
REM ============================================================
REM OppNDA Launcher (Windows)
REM Activates virtual environment and starts the application
REM ============================================================

setlocal

REM Navigate to script directory
pushd "%~dp0"

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%..\"
set "VENV_DIR=%PROJECT_ROOT%venv"

echo Starting OppNDA...
echo.

REM Check if virtual environment exists
if not exist "%VENV_DIR%\Scripts\activate.bat" (
    echo Virtual environment not found!
    echo Please run setup.bat first to create the environment.
    pause
    popd
    exit /b 1
)

REM Activate virtual environment and run
call "%VENV_DIR%\Scripts\activate.bat"
echo Virtual environment activated.
echo.
echo Starting server at http://localhost:5001
echo Press Ctrl+C to stop the server.
echo.
python "%PROJECT_ROOT%OppNDA.py"

popd
