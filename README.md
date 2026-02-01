# OppNDA v2.0 Modern UI


**ONE Simulator Network Data Analyzer** — A web-based toolkit for configuring ONE Simulator scenarios and analyzing simulation results.

![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-2.0+-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)
[![CI](https://github.com/nafisshahriar/oppnda/actions/workflows/ci.yml/badge.svg)](https://github.com/nafisshahriar/oppnda/actions)

## Features

- 🎛️ **Scenario Configuration** — Generate ONE Simulator configuration files through an intuitive web interface
- 📥 **Config Import** — Import existing ONE .txt config files directly into the GUI
- ▶️ **Run ONE Pipeline** — Complete simulation workflow: save config → run ONE → auto post-processing
- 📊 **Report Averaging** — Aggregate raw simulation reports with auto-grouping by router/TTL/buffer
- 📈 **Visualization Suite** — Generate 3D surfaces, line plots, violin plots, heatmaps, and pair plots
- 🚀 **Real-time Analysis** — Instant logging and progress feedback during visualization generation
- 💾 **Auto-Save** — Silent, automatic persistence of configuration changes
- 🛠️ **Pattern Builder** — Drag-and-drop interface for defining file naming conventions
- 🤖 **Multi-Target ML** — Train regression models on multiple target variables simultaneously
- ⚙️ **Flexible Configuration** — JSON-based settings with automatic backup and deep-merge preservation
- 🧠 **Dynamic Memory Management** — Intelligent worker optimization to prevent swap-thrashing
- 🖥️ **Cross-Platform** — Full support for Windows, Linux, and macOS

## Quick Start

### First Time Setup
- **Windows**: Run `scripts\setup.bat`
- **Unix/Linux**: Run `bash scripts/setup.sh`

### Launch Application
- **Windows**: Run `scripts\start.bat`
- **Unix/Linux**: Run `bash scripts/start.sh`

The web interface will be available at `http://localhost:5001/settings`

### Manual Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Run application
python OppNDA.py
```

### Docker

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build manually
docker build -t oppnda .
docker run -p 5001:5001 --name OppNDA oppnda
```

## Usage

### Scenario Configuration

Create ONE Simulator configuration files using the web GUI:

1. Open the web interface in your browser
2. Configure scenario settings (name, duration, world size, etc.)
3. Add interfaces, groups, events, and reports
4. Export the configuration file

> 📖 **See [ONE_PARAMETERS.md](ONE_PARAMETERS.md) for a complete reference of all ONE Simulator parameters and their OppNDA field mappings.**

### Report Averaging

Aggregate raw simulation reports across multiple seeds:

1. Place your raw report files in a directory (e.g., `reports/`)
2. Navigate to the **Post-Processing** section
3. Configure filename patterns to match your naming convention
4. Run the averager to generate averaged reports

### Analysis & Visualization

Generate publication-ready plots:

1. Select your averaged report directory and report types
2. Configure plot settings (sizes, fonts, color schemes)
3. Run analysis to generate 3D surfaces, line plots, violin plots, and more

### Regression Analysis

Build ML models to understand network performance:

1. Select input CSV files (generated from analysis)
2. Choose target variable and predictors
3. Train and compare multiple ML models (Linear, Ridge, Random Forest, etc.)

## Configuration

Configuration files in `config/`:

| File | Description |
|------|-------------|
| `averager_config.json` | Report averaging parameters |
| `analysis_config.json` | Visualization and plot settings |
| `regression_config.json` | ML model configurations |

See [`examples/`](examples/) for sample configurations.

## Performance Optimization

OppNDA implements **dynamic memory management** to efficiently process large datasets. The system automatically calculates optimal parallelism based on available RAM:

```python
from core.resource_manager import get_optimal_workers

# Automatic worker calculation (default)
workers = get_optimal_workers()  # Uses 75% RAM threshold

# With file-based estimation
workers = get_optimal_workers(file_paths=['report1.txt', 'report2.txt'])

# Disable safety for maximum performance (use with caution)
workers = get_optimal_workers(safety_enabled=False)
```

### Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `eta` (η) | 0.90 | Maximum RAM utilization threshold |
| `gamma` (γ) | 3.0 | DataFrame expansion factor |
| `safety_enabled` | True | Enable/disable memory management |

> 📖 **See [PERFORMANCE.md](PERFORMANCE.md) for mathematical models, API reference, benchmarks, and advanced configuration.**

## Project Structure

```
OppNDA/
├── OppNDA.py            # Application entry point
├── app/                 # Flask application
│   ├── __init__.py      # App factory
│   ├── api.py           # REST API endpoints
│   └── routes.py        # Route definitions
├── core/                # Core processing modules
│   ├── averager.py      # Report averaging
│   ├── analysis.py      # Visualization engine
│   ├── regression.py    # ML regression
│   ├── resource_manager.py  # Dynamic memory management
│   └── path_utils.py    # Cross-platform utilities
├── config/              # Configuration files
├── GUI/                 # Frontend assets
│   ├── settings.html    # Main settings interface
│   ├── settings.css     # Settings styles
│   ├── nda.html         # NDA generator interface
│   ├── nda.css          # NDA generator styles
│   ├── config.js        # Frontend logic
│   ├── pattern-builder.js # Drag-drop builder
│   ├── directory-browser.js # File navigation
│   ├── auto-save.js     # Auto-save manager
│   ├── settings-modern.css # Modern styling
│   └── directory-browser.css # Browser styling
└── scripts/             # Setup and launcher scripts
├── examples/            # Example configurations
└── requirements.txt     # Dependencies
```

## Testing

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app --cov=core
```

Tests include:
- Config validation tests
- Module import tests  
- Flask app integration tests
- Resource manager tests

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/run-one` | POST | Complete pipeline: save config → run ONE → post-processing |
| `/api/config/<name>` | GET/POST | Get or update configuration files |
| `/api/save-settings` | POST | Save simulation settings (.txt) |
| `/api/save-all` | POST | Save all configs with deep-merge preservation |
| `/api/run-averager` | POST | Run report averager only |
| `/api/run-analysis` | POST | Run visualization analysis only |
| `/api/run-regression` | POST | Run ML regression only |
| `/api/default-settings` | GET | Get default ONE simulator settings |
| `/api/default-settings/generate` | POST | Generate settings file with custom overrides |

## Documentation

- **[ONE_PARAMETERS.md](ONE_PARAMETERS.md)** — Complete ONE Simulator parameter reference
- **[PERFORMANCE.md](PERFORMANCE.md)** — Memory optimization and performance tuning
- **[tests/README.md](tests/README.md)** — Test suite documentation
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Contribution guidelines
- **[examples/](examples/)** — Example configuration files

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

[DHMAI Network Research Group](https://dhmairg.net) 2026

## Acknowledgments

- [ONE Simulator](https://github.com/akeranen/the-one) — The Opportunistic Network Environment simulator
- Built with [Flask](https://flask.palletsprojects.com/), [Matplotlib](https://matplotlib.org/), [Seaborn](https://seaborn.pydata.org/), [scikit-learn](https://scikit-learn.org/), and [psutil](https://github.com/giampaolo/psutil)
