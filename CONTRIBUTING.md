# Contributing to OppNDA

Thank you for your interest in contributing to OppNDA! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Code Style](#code-style)

## Getting Started

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates. When filing a bug report, include:

- **Environment details**: OS, Python version, browser
- **Steps to reproduce**: Clear, numbered steps
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Screenshots/logs**: If applicable

### Suggesting Features

Feature suggestions are welcome! Please include:

- **Use case**: Why is this feature needed?
- **Proposed solution**: How do you envision it working?
- **Alternatives considered**: Other approaches you've thought about

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/yourusername/OppNDA.git
   cd OppNDA
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # Linux/macOS
   source .venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the development server**
   ```bash
   python OppNDA.py --debug
   ```

5. **Run tests**
   ```bash
   python tests/run_tests.py
   ```

## Code Style

### Python

- Follow [PEP 8](https://pep8.org/) style guidelines
- Use meaningful variable and function names
- Add docstrings to functions and classes
- Keep functions focused and small
- Use type hints where appropriate

```python
def calculate_metrics(data: pd.DataFrame, metrics: list[str]) -> dict:
    """
    Calculate specified metrics from simulation data.
    
    Args:
        data: DataFrame containing simulation results
        metrics: List of metric names to calculate
        
    Returns:
        Dictionary mapping metric names to calculated values
    """
    ...
```

### JavaScript

- Use consistent indentation (2 spaces)
- Add comments for complex logic
- Use descriptive variable names

### Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Keep the first line under 72 characters
- Reference issues when applicable

```
Add violin plot customization options

- Add palette selection for violin plots
- Add inner style configuration
- Fix line width parameter handling

Fixes #123
```

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make your changes**
   - Write clean, documented code
   - Add tests if applicable
   - Update documentation if needed

3. **Test your changes**
   ```bash
   python tests/run_tests.py
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "Add my new feature"
   git push origin feature/my-new-feature
   ```

5. **Create a Pull Request**
   - Fill out the PR template completely
   - Link related issues
   - Request review from maintainers

6. **Address review feedback**
   - Respond to comments
   - Make requested changes
   - Push updates to your branch

## Project Structure

When contributing, understand the project layout:

| Directory | Purpose |
|-----------|---------|
| `app/` | Flask application and API endpoints |
| `core/` | Core processing logic (analysis, averager, regression) |
| `config/` | Configuration JSON files |
| `GUI/` | Frontend HTML, CSS, JavaScript |
| `tests/` | Test suite and snapshots |
| `examples/` | Example configuration files |

## Questions?

Feel free to open an issue for any questions about contributing. We're happy to help!
