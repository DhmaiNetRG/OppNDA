# OppNDA Test Suite

Comprehensive testing framework for the ONE Simulator Network Data Analyzer.

## Quick Start

```bash
# Run all tests with pytest
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app --cov=core

# Run specific test module
pytest tests/test_configs.py -v

# Run standalone test runner
python tests/run_tests.py --all
```

## Test Structure

| File | Lines | Purpose | Priority |
|------|-------|---------|----------|
| `test_configs.py` | 180 | Config file validation & schema | **High** |
| `test_framework.py` | 201 | Module imports & file existence | **High** |
| `test_integration.py` | 666 | Full API & pipeline testing | **Critical** |
| `test_resource_manager.py` | 244 | Memory management & workers | **High** |
| `gui_tests.py` | 1263 | Static GUI component checks | Medium |
| `gui_interactive_tests.py` | ~500 | Live page & API tests | Medium |

## Test Modules

### `test_configs.py` — Config Validation

Tests that all JSON configuration files are valid and follow expected schemas.

**Tests:**
- `test_analysis_config_json_valid` — Validates `analysis_config.json` syntax
- `test_analysis_config_schema` — Checks required keys exist
- `test_averager_config_json_valid` — Validates `averager_config.json` syntax
- `test_averager_config_schema` — Checks required keys exist
- `test_regression_config_json_valid` — Validates `regression_config.json` syntax
- `test_regression_config_schema` — Checks required keys exist

---

### `test_framework.py` — Framework Integrity

Tests that core modules import successfully and required files exist.

**Tests:**
- `test_flask_app_imports` — Verifies Flask app can be imported
- `test_analysis_imports` — Verifies `core/analysis.py` imports
- `test_averager_imports` — Verifies `core/averager.py` imports
- `test_regression_imports` — Verifies `core/regression.py` imports
- `test_gui_files_exist` — Checks GUI files are present
- `test_gui_html_valid` — Basic HTML structure validation

---

### `test_integration.py` — Integration Testing ⭐

End-to-end tests for the complete application workflow.

**Test Classes:**

#### `TestSettingsSaveFlow`
- `test_save_settings_creates_file` — Verifies `.txt` files are created
- `test_save_all_settings_merges_configs` — Tests deep-merge preserves fields
- `test_config_changes_persist` — Validates disk persistence

#### `TestDefaultSettings`
- `test_analysis_config_has_sensible_defaults`
- `test_averager_config_has_sensible_defaults`
- `test_regression_config_has_sensible_defaults`
- `test_default_one_settings_format` — Validates ONE format
- `test_default_filename_convention_matches_averager`
- `test_api_returns_configs_without_error`
- `test_save_default_settings_and_run_pipeline` — Full workflow
- `test_directories_exist_for_defaults`
- `test_api_default_settings_endpoint`
- `test_api_generate_default_settings`

#### `TestSimulatorCommandBuilder`
- `test_windows_command_format` — Verifies `one.bat` on Windows
- `test_linux_command_format` — Verifies `./one.sh` on Linux
- `test_batch_mode_flag` — Tests `-b N` flag
- `test_compile_flag_added` — Tests compile step

#### `TestFullPipeline`
- `test_settings_save_then_run_mock_simulation`
- `test_post_processing_pipeline_order` — averager → analysis
- `test_ml_regression_runs_when_enabled`

---

### `test_resource_manager.py` — Memory Management

Tests for dynamic worker optimization and memory estimation.

**Test Classes:**

#### `TestResourceConfig`
- Default parameter validation (η=0.75, γ=3.0, overhead=50MB)

#### `TestMemoryEstimator`
- `test_file_memory_estimate` — Single file estimation
- `test_batch_memory_estimate` — Batch peak estimation
- `test_empty_batch` — Edge case handling

#### `TestResourceManager`
- Initialization and parameter validation
- `test_optimal_workers_returns_positive`
- `test_optimal_workers_respects_max`
- `test_safety_disabled_uses_fallback`

#### `TestDynamicSemaphore`
- `test_basic_acquire_release`
- `test_context_manager`
- `test_respects_permits`

---

### `gui_tests.py` — Static GUI Analysis

Parses HTML/JS/CSS files without running a browser.

**Categories:**
- **HTML Tab Tests** — Verify all tabs exist
- **Form Field Tests** — Check required input fields
- **Dropdown Tests** — Validate select options
- **JavaScript Function Tests** — Verify functions exist
- **CSS Validation** — Check required classes
- **Input Validation Tests** — Verify HTML5 constraints

---

### `gui_interactive_tests.py` — Live GUI Tests

Tests requiring Flask app to be running.

**Categories:**
- API endpoint response validation
- Page load verification
- Performance benchmarks

---

## Running Tests

### pytest (Recommended)

```bash
# Verbose output
pytest tests/ -v

# Stop on first failure
pytest tests/ -x

# Run only integration tests
pytest tests/test_integration.py -v

# With coverage report
pytest tests/ --cov=app --cov=core --cov-report=html
```

### Standalone Runner

```bash
# All tests
python tests/run_tests.py --all

# Individual suites
python tests/run_tests.py --config
python tests/run_tests.py --framework
python tests/run_tests.py --gui
python tests/run_tests.py --interactive

# Create baseline snapshots
python tests/run_tests.py --snapshot
```

## Fixtures

Located in `tests/fixtures/`:
- Sample config files for testing
- Mock report data

## Snapshots

Located in `tests/snapshots/`:
- Baseline file hashes for regression detection
- Created with `python tests/run_tests.py --snapshot`

## CI Integration

Tests run automatically via GitHub Actions on:
- Push to `main` or `develop`
- Pull requests

See `.github/workflows/ci.yml` for configuration.

## Adding New Tests

1. Create test functions prefixed with `test_`
2. Use pytest fixtures for setup/teardown
3. Add to appropriate test file or create new module
4. Update `run_tests.py` if adding new module

## Test Guidelines

- **Fast tests first** — Config and import tests run quickly
- **Mock external calls** — Use `unittest.mock` for subprocess/network
- **Cleanup after tests** — Remove created files in `finally` blocks
- **Skip gracefully** — Use `pytest.skip()` when dependencies unavailable
