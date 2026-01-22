#!/bin/bash
# ============================================================
# OppNDA Launcher (Unix/Linux/macOS)
# Activates virtual environment and starts the application
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${SCRIPT_DIR}/venv"

echo "Starting OppNDA..."
echo

# Check if virtual environment exists
if [ ! -f "${VENV_DIR}/bin/activate" ]; then
    echo "Virtual environment not found!"
    echo "Please run ./setup.sh first to create the environment."
    exit 1
fi

# Activate virtual environment and run
source "${VENV_DIR}/bin/activate"
echo "Virtual environment activated."
echo
echo "Starting server at http://localhost:5000"
echo "Press Ctrl+C to stop the server."
echo
python "${SCRIPT_DIR}/run.py"
