# OppNDA

**ONE Simulator Network Data Analyzer** — A web-based toolkit for configuring ONE Simulator scenarios and analyzing simulation results.

![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-2.0+-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)
![CI](https://img.shields.io/badge/CI-passing-brightgreen.svg)

## Features

- 🎛️ **Scenario Configuration** — Generate ONE Simulator configuration files through an intuitive web interface
- 📊 **Report Averaging** — Aggregate raw simulation reports across multiple seeds
- 📈 **Visualization Suite** — Generate 3D surfaces, line plots, violin plots, heatmaps, and pair plots
- 🤖 **Regression Analysis** — Machine learning models to predict network performance
- ⚙️ **Flexible Configuration** — JSON-based settings for all analysis parameters

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/oppnda.git
cd oppnda

# Install dependencies
pip install -r requirements.txt

# Run the application
python run.py
```

The web interface will be available at `http://127.0.0.1:5001`

### Docker

```bash
# Using Docker Compose
docker-compose up -d

# Or build manually
docker build -t oppnda .
docker run -p 5001:5001 oppnda
```

## Usage

### Scenario Configuration

Create ONE Simulator configuration files using the web GUI:

1. Open `http://127.0.0.1:5001` in your browser
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
│   └── regression.py    # ML regression
├── config/              # Configuration files
├── GUI/                 # Frontend assets
│   ├── settings.html    # Main interface
│   ├── settings.css     # Styles
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

## Documentation

- **[ONE_PARAMETERS.md](ONE_PARAMETERS.md)** — Complete ONE Simulator parameter reference
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Contribution guidelines
- **[examples/](examples/)** — Example configuration files

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

© 2026 [DHMAI Network Research Group](https://dhmairg.net)

## Acknowledgments

- [ONE Simulator](https://github.com/akeranen/the-one) — The Opportunistic Network Environment simulator
- Built with [Flask](https://flask.palletsprojects.com/), [Matplotlib](https://matplotlib.org/), [Seaborn](https://seaborn.pydata.org/), and [scikit-learn](https://scikit-learn.org/)
