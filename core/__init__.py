"""
OppNDA Core Processing Package
Contains analysis, report averaging, and regression modules.
"""

from pathlib import Path

# Core directory path
CORE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CORE_DIR.parent
CONFIG_DIR = PROJECT_ROOT / 'config'


def get_config_path(config_name):
    """Get cross-platform path to a config file."""
    return CONFIG_DIR / config_name
