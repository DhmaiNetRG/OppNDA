#!/bin/bash
# ============================================================
# OppNDA Setup Script (Unix/Linux/macOS)
# Creates virtual environment and installs dependencies
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VENV_DIR="${PROJECT_ROOT}/venv"
REQUIREMENTS_FILE="${PROJECT_ROOT}/requirements.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}       OppNDA Environment Setup${NC}"
echo -e "${BLUE}============================================${NC}"
echo

# Check Python version
echo -e "${YELLOW}[1/5] Checking Python version...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo -e "${RED}Error: Python is not installed or not in PATH${NC}"
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | cut -d' ' -f2)
MAJOR_VERSION=$(echo $PYTHON_VERSION | cut -d'.' -f1)
MINOR_VERSION=$(echo $PYTHON_VERSION | cut -d'.' -f2)

echo -e "  Found Python $PYTHON_VERSION"

if [ "$MAJOR_VERSION" -lt 3 ] || ([ "$MAJOR_VERSION" -eq 3 ] && [ "$MINOR_VERSION" -lt 8 ]); then
    echo -e "${RED}Error: Python 3.8 or higher is required${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Python version OK${NC}"

# Create virtual environment
echo
echo -e "${YELLOW}[2/5] Setting up virtual environment...${NC}"
if [ -d "$VENV_DIR" ]; then
    echo -e "  Virtual environment already exists at: $VENV_DIR"
    read -p "  Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "  Removing existing virtual environment..."
        rm -rf "$VENV_DIR"
        $PYTHON_CMD -m venv "$VENV_DIR"
        echo -e "${GREEN}  ✓ Virtual environment recreated${NC}"
    else
        echo -e "${GREEN}  ✓ Using existing virtual environment${NC}"
    fi
else
    $PYTHON_CMD -m venv "$VENV_DIR"
    echo -e "${GREEN}  ✓ Virtual environment created at: $VENV_DIR${NC}"
fi

# Activate virtual environment
echo
echo -e "${YELLOW}[3/5] Activating virtual environment...${NC}"
source "$VENV_DIR/bin/activate"
echo -e "${GREEN}  ✓ Virtual environment activated${NC}"

# Upgrade pip
echo
echo -e "${YELLOW}[4/5] Upgrading pip...${NC}"
pip install --upgrade pip --quiet
echo -e "${GREEN}  ✓ pip upgraded to $(pip --version | cut -d' ' -f2)${NC}"

# Install requirements
echo
echo -e "${YELLOW}[5/5] Installing requirements...${NC}"
if [ -f "$REQUIREMENTS_FILE" ]; then
    pip install -r "$REQUIREMENTS_FILE" --quiet
    echo -e "${GREEN}  ✓ Requirements installed${NC}"
else
    echo -e "${RED}  Warning: requirements.txt not found at $REQUIREMENTS_FILE${NC}"
fi

# Check for outdated packages
echo
echo -e "${YELLOW}Checking for outdated packages...${NC}"
OUTDATED=$(pip list --outdated --format=json 2>/dev/null)
if [ "$OUTDATED" = "[]" ] || [ -z "$OUTDATED" ]; then
    echo -e "${GREEN}  ✓ All packages are up to date!${NC}"
else
    echo -e "${YELLOW}  The following packages have updates available:${NC}"
    echo "$OUTDATED" | python3 -c "
import sys, json
packages = json.load(sys.stdin)
for pkg in packages:
    print(f\"    - {pkg['name']}: {pkg['version']} → {pkg['latest_version']}\")
"
    echo
    read -p "  Would you like to update all packages? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pip install -r "$REQUIREMENTS_FILE" --upgrade --quiet
        echo -e "${GREEN}  ✓ All packages updated${NC}"
    fi
fi

# Summary
echo
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}       Setup Complete!${NC}"
echo -e "${BLUE}============================================${NC}"
echo
echo -e "To activate the virtual environment in the future, run:"
echo -e "  ${YELLOW}source ../venv/bin/activate${NC}  (Unix/macOS)"
echo
echo -e "To start OppNDA, run:"
echo -e "  ${YELLOW}./start.sh${NC}"
echo
