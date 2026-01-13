# OppNDA

**ONE Simulator Network Data Analyzer** - A web-based analysis toolkit for processing and visualizing simulation results from the [ONE Simulator](https://github.com/akeranen/the-one).

![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-2.0+-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## Features

- 📊 **Report Averaging** - Aggregate raw simulation reports across multiple seeds to produce averaged metrics
- 📈 **Visualization Suite** - Generate 3D surfaces, line plots, violin plots, heatmaps, and pair plots
- 🤖 **Regression Analysis** - Machine learning models to predict network performance
- 🌐 **Web Interface** - Modern, responsive GUI for configuration and analysis
- ⚙️ **Flexible Configuration** - JSON-based settings for all analysis parameters

## Quick Start

### Prerequisites

- Python 3.9 or higher
- pip package manager

### Installation

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

### Docker Installation

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t oppnda .
docker run -p 5001:5001 oppnda
```

## Usage

### 1. Report Averaging

Average raw ONE Simulator reports across multiple simulation seeds:

1. Place your raw report files in a directory (e.g., `reports/`)
2. Open the web interface and navigate to **Report Averaging**
3. Configure the filename pattern to match your file naming convention
4. Run the averager to generate averaged reports

### 2. Analysis & Visualization

Generate publication-ready plots from averaged data:

1. Navigate to **Analysis** tab
2. Select your report directory and report types
3. Configure plot settings (sizes, fonts, color schemes)
4. Run analysis to generate visualizations

### 3. Regression Analysis

Build machine learning models to understand network performance:

1. Navigate to **Regression** tab
2. Select input CSV files (generated from analysis)
3. Choose target variable and predictors
4. Train and evaluate multiple ML models

## Configuration

Configuration files are located in the `config/` directory:

| File | Description |
|------|-------------|
| `averager_config.json` | Report averaging parameters |
| `analysis_config.json` | Visualization and analysis settings |
| `regression_config.json` | ML model configurations |

See the [`examples/`](examples/) directory for sample configurations.

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
├── run.py               # Application entry point
└── requirements.txt     # Python dependencies
```

## API Reference

OppNDA provides a REST API for programmatic access:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/averager/run` | POST | Execute report averaging |
| `/api/analysis/run` | POST | Run visualization analysis |
| `/api/regression/run` | POST | Execute regression analysis |
| `/api/config/<type>` | GET/POST | Get/set configuration |

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [ONE Simulator](https://github.com/akeranen/the-one) - The Opportunistic Network Environment simulator
- Built with [Flask](https://flask.palletsprojects.com/), [Matplotlib](https://matplotlib.org/), [Seaborn](https://seaborn.pydata.org/), and [scikit-learn](https://scikit-learn.org/)
