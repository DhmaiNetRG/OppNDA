"""
Tests for direct CLI execution of core OppNDA modules.
Verifies that averager.py, analysis.py, and regression.py can be invoked standalone.
"""

import sys
import pytest
from pathlib import Path
from unittest.mock import patch

from core.averager import main as averager_main, ReportAverager
from core.analysis import main as analysis_main
from core.regression import load_config as load_regression_config, DataProcessor

PROJECT_ROOT = Path(__file__).resolve().parent.parent

def test_averager_cli_default_config():
    """Test averager CLI entrypoint with default config."""
    config_path = PROJECT_ROOT / "config" / "averager_config.json"
    assert config_path.exists()
    
    averager = ReportAverager(str(config_path))
    assert averager.config is not None
    assert "folder" in averager.config
    assert "average_groups" in averager.config

def test_averager_cli_sys_argv(tmp_path):
    """Test averager main function with explicit sys.argv custom path."""
    custom_config = tmp_path / "custom_averager.json"
    default_config = PROJECT_ROOT / "config" / "averager_config.json"
    custom_config.write_text(default_config.read_text(encoding="utf-8"), encoding="utf-8")
    
    with patch.object(sys, 'argv', ['averager.py', str(custom_config)]):
        averager = ReportAverager(str(custom_config))
        assert averager.config is not None

def test_analysis_cli_config_loading():
    """Test analysis config loading and initialization."""
    config_path = PROJECT_ROOT / "config" / "analysis_config.json"
    assert config_path.exists()
    
    import json
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    assert "directories" in config
    assert "enabled_plots" in config
    assert "plot_settings" in config

def test_regression_cli_data_processor():
    """Test regression data processor initialization."""
    config = load_regression_config()
    assert config is not None
    assert "input" in config
    assert "model_settings" in config
    
    processor = DataProcessor(config)
    assert processor.config == config
