#!/usr/bin/env python3
"""
Config File Validation Tests
Tests that all JSON config files are valid and have expected structure.
"""

import os
import sys
import json

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Expected schema structures (required keys)
ANALYSIS_CONFIG_SCHEMA = {
    "directories": ["report_dir", "plots_dir"],
    "metrics": ["include", "ignore"],
    "enabled_plots": [],
    "plot_settings": []
}

AVERAGER_CONFIG_SCHEMA = {
    "folder": None,
    "filename_pattern": ["delimiter", "components"],
    "average_groups": []
}

REGRESSION_CONFIG_SCHEMA = {
    "input": ["csv_directory"],
    "features": ["target", "predictors"],
    "model_settings": ["enabled_models"],
    "output": ["directory"]
}


def _check_json_valid(filepath):
    """Helper: Check that a JSON file is valid"""
    with open(filepath, 'r') as f:
        return json.load(f)


def _check_schema(config, schema):
    """Helper: Check that a config has required keys"""
    missing_keys = []
    for key, subkeys in schema.items():
        if key not in config:
            missing_keys.append(key)
        elif subkeys and isinstance(subkeys, list):
            for subkey in subkeys:
                if subkey not in config[key]:
                    missing_keys.append(f"{key}.{subkey}")
    return missing_keys


# ============================================================================
# PYTEST-COMPATIBLE TESTS (no fixtures, work standalone too)
# ============================================================================

def test_analysis_config_json_valid():
    """Test that analysis_config.json is valid JSON"""
    config_path = os.path.join(BASE_DIR, "config", "analysis_config.json")
    config = _check_json_valid(config_path)
    assert config is not None


def test_analysis_config_schema():
    """Test that analysis_config.json has required keys"""
    config_path = os.path.join(BASE_DIR, "config", "analysis_config.json")
    config = _check_json_valid(config_path)
    missing = _check_schema(config, ANALYSIS_CONFIG_SCHEMA)
    assert len(missing) == 0, f"Missing keys: {missing}"


def test_analysis_config_read_write(tmp_path):
    """Test that analysis config can be read and written"""
    config_path = os.path.join(BASE_DIR, "config", "analysis_config.json")
    config = _check_json_valid(config_path)
    temp_file = tmp_path / "test_config.json"
    with open(temp_file, 'w') as f:
        json.dump(config, f, indent=2)
    with open(temp_file, 'r') as f:
        reloaded = json.load(f)
    assert config == reloaded


def test_averager_config_json_valid():
    """Test that averager_config.json is valid JSON"""
    config_path = os.path.join(BASE_DIR, "config", "averager_config.json")
    config = _check_json_valid(config_path)
    assert config is not None


def test_averager_config_schema():
    """Test that averager_config.json has required keys"""
    config_path = os.path.join(BASE_DIR, "config", "averager_config.json")
    config = _check_json_valid(config_path)
    missing = _check_schema(config, AVERAGER_CONFIG_SCHEMA)
    assert len(missing) == 0, f"Missing keys: {missing}"


def test_averager_config_read_write(tmp_path):
    """Test that averager config can be read and written"""
    config_path = os.path.join(BASE_DIR, "config", "averager_config.json")
    config = _check_json_valid(config_path)
    temp_file = tmp_path / "test_config.json"
    with open(temp_file, 'w') as f:
        json.dump(config, f, indent=2)
    with open(temp_file, 'r') as f:
        reloaded = json.load(f)
    assert config == reloaded


def test_regression_config_json_valid():
    """Test that regression_config.json is valid JSON"""
    config_path = os.path.join(BASE_DIR, "config", "regression_config.json")
    config = _check_json_valid(config_path)
    assert config is not None


def test_regression_config_schema():
    """Test that regression_config.json has required keys"""
    config_path = os.path.join(BASE_DIR, "config", "regression_config.json")
    config = _check_json_valid(config_path)
    missing = _check_schema(config, REGRESSION_CONFIG_SCHEMA)
    assert len(missing) == 0, f"Missing keys: {missing}"


def test_regression_config_read_write(tmp_path):
    """Test that regression config can be read and written"""
    config_path = os.path.join(BASE_DIR, "config", "regression_config.json")
    config = _check_json_valid(config_path)
    temp_file = tmp_path / "test_config.json"
    with open(temp_file, 'w') as f:
        json.dump(config, f, indent=2)
    with open(temp_file, 'r') as f:
        reloaded = json.load(f)
    assert config == reloaded


# ============================================================================
# STANDALONE RUNNER
# ============================================================================

def run_config_tests():
    """Run all config file tests (standalone mode)"""
    print("\n" + "="*60)
    print("CONFIG FILE TESTS")
    print("="*60)
    
    tests = [
        ("Analysis JSON Valid", test_analysis_config_json_valid),
        ("Analysis Schema Valid", test_analysis_config_schema),
        ("Averager JSON Valid", test_averager_config_json_valid),
        ("Averager Schema Valid", test_averager_config_schema),
        ("Regression JSON Valid", test_regression_config_json_valid),
        ("Regression Schema Valid", test_regression_config_schema),
    ]
    
    passed = 0
    total = len(tests)
    
    for name, test_func in tests:
        try:
            test_func()
            print(f"[PASS]: {name}")
            passed += 1
        except AssertionError as e:
            print(f"[FAIL]: {name} - {e}")
        except Exception as e:
            print(f"[FAIL]: {name} - {e}")
    
    print(f"\nConfig Tests: {passed}/{total} passed")
    print("="*60)


if __name__ == "__main__":
    run_config_tests()
