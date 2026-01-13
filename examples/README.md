# Example Configurations

This directory contains example configuration files for OppNDA. Copy these to the `config/` directory and modify as needed.

## Configuration Files

### Report Averaging

| File | Purpose |
|------|---------|
| `averager_config.json` | Average raw ONE reports across seeds |

### Analysis Examples

| File | Description |
|------|-------------|
| `analysis_epidemic.json` | Basic Epidemic router analysis |
| `analysis_multi_router.json` | Compare multiple routing protocols |

### Regression

| File | Description |
|------|-------------|
| `regression_model.json` | ML regression for performance prediction |

## Usage

1. Copy the example file to `config/`:
   ```bash
   cp examples/averager_config.json config/averager_config.json
   ```

2. Modify settings through the web interface or edit the JSON directly

3. Run the corresponding module

## File Naming Convention

OppNDA expects simulation output files to follow a naming convention:

```
{prefix}_{router}_{seed}_{param1}_{param2}_{reportType}.txt
```

For example:
```
sim_EpidemicRouter_1_3600_5_CCNApplicationReport.txt
```

Configure the `filename_pattern` in averager config to match your naming scheme.
