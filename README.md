# OppNDA

**ONE Simulator Network Data Analyzer** — A web-based toolkit for configuring ONE Simulator scenarios and analyzing simulation results.

![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-2.0+-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)
[![CI](https://github.com/yourusername/oppnda/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/oppnda/actions)

## Features

- 🎛️ **Scenario Configuration** — Generate ONE Simulator configuration files through an intuitive web interface
- 📥 **Config Import** — Import existing ONE .txt config files directly into the GUI
- ▶️ **Run ONE Pipeline** — Complete simulation workflow: save config → run ONE → auto post-processing
- 📊 **Report Averaging** — Aggregate raw simulation reports with auto-grouping by router/TTL/buffer
- 📈 **Visualization Suite** — Generate 3D surfaces, line plots, violin plots, heatmaps, and pair plots
- 🤖 **Multi-Target ML** — Train regression models on multiple target variables simultaneously
- ⚙️ **Flexible Configuration** — JSON-based settings with automatic backup and deep-merge preservation
- 🧠 **Dynamic Memory Management** — Intelligent worker optimization to prevent swap-thrashing
- 🚀 **Quick Start Modal** — Guided onboarding with example scenarios (Urban/Campus)
- 📋 **Live Batch Preview** — Real-time batch count calculation as you configure parameters
- 💾 **Auto-Save** — Automatic config persistence when switching tabs
- 🖥️ **Cross-Platform** — Full support for Windows, Linux, and macOS

## Quick Start

### Windows
```batch
# First time setup
setup.bat

# Launch application
start.bat
```

### Linux/macOS
```bash
# First time setup
chmod +x setup.sh && ./setup.sh

# Launch application
./start.sh
```

The web interface will be available at `http://localhost:5000/settings`

### Manual Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Run application
python run.py
```

### Docker

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build manually
docker build -t oppnda .
docker run -p 5000:5000 oppnda
```

## Usage

### Scenario Configuration

Create ONE Simulator configuration files using the web GUI:

1. Open `http://localhost:5000/settings` in your browser
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

## Project Structure

```
oppnda/
├── app/                 # Flask application
│   ├── __init__.py      # App factory
│   ├── api.py           # REST API endpoints
│   └── routes.py        # Route definitions
├── core/                # Core processing modules
│   ├── averager.py      # Report averaging
│   ├── analysis.py      # Visualization engine
│   ├── regression.py    # ML regression
│   └── resource_manager.py  # Dynamic memory management
├── config/              # Configuration files
├── GUI/                 # Frontend assets
│   ├── settings.html    # Main settings interface
│   ├── settings.css     # Settings styles
│   ├── nda.html         # NDA generator interface
│   ├── nda.css          # NDA generator styles
│   └── config.js        # Frontend logic
├── examples/            # Example configurations
├── tests/               # Test suite
├── run.py               # Entry point
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
- GUI interactive tests

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
- **[tests/README.md](tests/README.md)** — Test suite documentation
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Contribution guidelines
- **[examples/](examples/)** — Example configuration files

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

© 2026 [DHMAI Network Research Group](https://dhmairg.net)

## Acknowledgments

- [ONE Simulator](https://github.com/akeranen/the-one) — The Opportunistic Network Environment simulator
- Built with [Flask](https://flask.palletsprojects.com/), [Matplotlib](https://matplotlib.org/), [Seaborn](https://seaborn.pydata.org/), [scikit-learn](https://scikit-learn.org/), and [psutil](https://github.com/giampaolo/psutil)
