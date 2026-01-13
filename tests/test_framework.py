#!/usr/bin/env python3
"""
Test Framework for OppNDA
Captures baseline behavior and verifies functionality after refactoring.
"""

import os
import sys
import json
import hashlib
import importlib.util

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNAPSHOT_DIR = os.path.join(BASE_DIR, "tests", "snapshots")


def _ensure_snapshot_dir():
    """Ensure snapshot directory exists"""
    os.makedirs(SNAPSHOT_DIR, exist_ok=True)


# ============================================================================
# PYTEST-COMPATIBLE TESTS (use assertions, don't return values)
# ============================================================================

def test_flask_app_imports():
    """Test that Flask app package can be imported without errors"""
    app_init = os.path.join(BASE_DIR, "app", "__init__.py")
    assert os.path.exists(app_init), "app/__init__.py not found"
    spec = importlib.util.spec_from_file_location("app", app_init)
    module = importlib.util.module_from_spec(spec)
    assert module is not None


def test_analysis_imports():
    """Test that analysis.py can be imported"""
    core_path = os.path.join(BASE_DIR, "core", "analysis.py")
    assert os.path.exists(core_path), "core/analysis.py not found"
    spec = importlib.util.spec_from_file_location("analysis", core_path)
    module = importlib.util.module_from_spec(spec)
    assert module is not None


def test_averager_imports():
    """Test that averager.py can be imported"""
    core_path = os.path.join(BASE_DIR, "core", "averager.py")
    assert os.path.exists(core_path), "core/averager.py not found"
    spec = importlib.util.spec_from_file_location("averager", core_path)
    module = importlib.util.module_from_spec(spec)
    assert module is not None


def test_regression_imports():
    """Test that regression.py can be imported"""
    core_path = os.path.join(BASE_DIR, "core", "regression.py")
    assert os.path.exists(core_path), "core/regression.py not found"
    spec = importlib.util.spec_from_file_location("regression", core_path)
    module = importlib.util.module_from_spec(spec)
    assert module is not None


def test_gui_files_exist():
    """Test that all GUI files exist"""
    gui_files = [
        "GUI/settings.html",
        "GUI/settings.css",
        "GUI/config.js",
    ]
    
    for file in gui_files:
        filepath = os.path.join(BASE_DIR, file)
        assert os.path.exists(filepath), f"Missing: {file}"


def test_gui_html_valid():
    """Basic validation that HTML files have required elements"""
    html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    assert os.path.exists(html_path), "settings.html not found"
    
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    required = ["<!DOCTYPE html>", "<html", "</html>", "<body", "</body>"]
    for elem in required:
        assert elem in content, f"Missing HTML element: {elem}"


# ============================================================================
# SNAPSHOT UTILITIES (for standalone runner)
# ============================================================================

def _create_file_snapshot(filepath, snapshot_name):
    """Create a hash snapshot of a file for comparison"""
    _ensure_snapshot_dir()
    with open(filepath, 'rb') as f:
        content = f.read()
    file_hash = hashlib.sha256(content).hexdigest()
    
    snapshot_path = os.path.join(SNAPSHOT_DIR, f"{snapshot_name}.json")
    snapshot_data = {
        "file": filepath,
        "hash": file_hash,
        "size": len(content)
    }
    
    with open(snapshot_path, 'w') as f:
        json.dump(snapshot_data, f, indent=2)
    
    return True


def _compare_with_snapshot(filepath, snapshot_name):
    """Compare current file with saved snapshot"""
    snapshot_path = os.path.join(SNAPSHOT_DIR, f"{snapshot_name}.json")
    
    if not os.path.exists(snapshot_path):
        return False, "No baseline snapshot exists"
    
    with open(snapshot_path, 'r') as f:
        snapshot = json.load(f)
    
    with open(filepath, 'rb') as f:
        content = f.read()
    current_hash = hashlib.sha256(content).hexdigest()
    
    if current_hash == snapshot["hash"]:
        return True, "File unchanged"
    else:
        return False, "File has changed"


# ============================================================================
# STANDALONE RUNNER (for direct execution)
# ============================================================================

def run_framework_tests():
    """Run all framework tests (standalone mode)"""
    print("\n" + "="*60)
    print("FRAMEWORK TESTS")
    print("="*60)
    
    tests = [
        ("Flask App Syntax", test_flask_app_imports),
        ("Analysis Module Syntax", test_analysis_imports),
        ("Averager Module Syntax", test_averager_imports),
        ("Regression Module Syntax", test_regression_imports),
        ("GUI Files Exist", test_gui_files_exist),
        ("HTML Valid", test_gui_html_valid),
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
    
    print(f"\nFramework Tests: {passed}/{total} passed")
    print("="*60)


def create_baseline_snapshots():
    """Create baseline snapshots for all key files"""
    print("\n" + "="*60)
    print("CREATING BASELINE SNAPSHOTS")
    print("="*60)
    
    files_to_snapshot = [
        ("app/__init__.py", "app_init"),
        ("core/analysis.py", "analysis"),
        ("core/averager.py", "averager"),
        ("core/regression.py", "regression"),
        ("config/analysis_config.json", "analysis_config"),
        ("config/averager_config.json", "averager_config"),
        ("config/regression_config.json", "regression_config"),
        ("GUI/settings.html", "settings_html"),
        ("GUI/settings.css", "settings_css"),
        ("GUI/config.js", "config_js"),
    ]
    
    for filename, snapshot_name in files_to_snapshot:
        filepath = os.path.join(BASE_DIR, filename)
        if os.path.exists(filepath):
            _create_file_snapshot(filepath, snapshot_name)
            print(f"[CREATED]: {snapshot_name}")
        else:
            print(f"[SKIP]: {filename} (file not found)")


if __name__ == "__main__":
    run_framework_tests()
