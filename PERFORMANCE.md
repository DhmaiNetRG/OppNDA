# Performance & Memory Optimization

OppNDA implements **dynamic resource management** to efficiently process large simulation datasets while preventing system instability. This document describes the mathematical models, configuration options, and usage patterns.

## Overview

Processing ONE Simulator reports involves reading, parsing, and aggregating thousands of files. Without careful memory management, parallel processing can exhaust RAM and cause OS-level swap thrashing. OppNDA addresses this with:

1. **Memory-aware worker allocation** — Dynamically calculates optimal parallelism
2. **Predictive memory estimation** — Estimates peak RAM usage before processing
3. **Adaptive semaphore control** — Adjusts concurrency based on real-time memory pressure

---

## Mathematical Models

### Memory Estimation Model

For a batch of files, peak memory consumption is estimated as:

$$M(t) \approx M_{base} + \sum_{i=1}^{P} \left( \gamma \cdot size(r_i) + M_{overhead} \right)$$

Where:
- $M_{base}$ — Baseline memory of the Python process
- $P$ — Number of concurrent worker processes
- $\gamma$ — DataFrame expansion factor (empirically ~3.0×)
- $size(r_i)$ — File size of the i-th largest file being processed
- $M_{overhead}$ — Per-worker overhead (imports, buffers, etc.)

### Optimal Worker Calculation

The optimal worker count is the largest integer satisfying the memory constraint:

$$P_{opt} = \max\{p \in \mathbb{Z}^+ \mid M(t)|_{P=p} \leq \eta \cdot M_{RAM}\}$$

Where:
- $\eta$ — RAM utilization threshold (default: 0.75)
- $M_{RAM}$ — Total system RAM

This ensures the system never exceeds 75% RAM usage, leaving headroom for the OS and other processes.

---

## Configuration Parameters

### Default Values

| Parameter | Symbol | Default | Description |
|-----------|--------|---------|-------------|
| `ETA` | η | 0.75 | Maximum RAM utilization (75%) |
| `GAMMA` | γ | 3.0 | DataFrame expansion factor |
| `M_OVERHEAD_MB` | $M_{overhead}$ | 50 MB | Per-worker memory overhead |
| `MIN_WORKERS` | — | 1 | Minimum worker processes |
| `MAX_WORKERS` | — | 16 | Maximum worker processes |
| `FALLBACK_WORKERS` | — | 4 | Default when psutil unavailable |
| `SAFETY_ENABLED` | — | True | Enable/disable memory management |

### Modifying Parameters

#### Method 1: Environment Variables (Recommended)

```bash
# Linux/macOS
export OPPNDA_ETA=0.85
export OPPNDA_GAMMA=2.5
export OPPNDA_SAFETY=false
python run.py

# Windows PowerShell
$env:OPPNDA_ETA = "0.85"
$env:OPPNDA_SAFETY = "false"
python run.py
```

#### Method 2: Programmatic Override

```python
from core.resource_manager import ResourceManager

# Custom configuration
rm = ResourceManager(
    eta=0.85,           # Use up to 85% RAM
    gamma=2.5,          # Lower expansion factor
    overhead_mb=30,     # Reduced per-worker overhead
    safety_enabled=True
)

workers = rm.get_optimal_workers(file_paths=my_files)
```

#### Method 3: Modify ResourceConfig Class

Edit `core/resource_manager.py`:

```python
class ResourceConfig:
    ETA = 0.80              # Increase to 80%
    GAMMA = 2.5             # Adjust for your data
    M_OVERHEAD_MB = 40      # Reduce overhead
    MIN_WORKERS = 2         # Ensure at least 2 workers
    MAX_WORKERS = 32        # Allow more on high-end systems
    SAFETY_ENABLED = True
```

---

## Toggling Safety Features

### Disable Memory Management (Maximum Performance)

For systems with abundant RAM or when processing small files:

```python
from core.resource_manager import get_optimal_workers

# Disable safety — uses FALLBACK_WORKERS (4) or CPU count
workers = get_optimal_workers(safety_enabled=False)
```

**⚠️ Warning**: Disabling safety may cause:
- Memory exhaustion on large datasets
- OS swap thrashing
- System unresponsiveness

### Enable Safety (Default)

```python
workers = get_optimal_workers(safety_enabled=True)
```

---

## API Reference

### `get_optimal_workers()`

Convenience function for quick worker count calculation.

```python
from core.resource_manager import get_optimal_workers

# Basic usage
workers = get_optimal_workers()

# With file-based estimation
workers = get_optimal_workers(file_paths=['report1.txt', 'report2.txt'])

# Disable safety
workers = get_optimal_workers(safety_enabled=False)
```

**Returns**: `int` — Optimal number of worker processes

### `ResourceManager` Class

Full-featured resource manager with monitoring capabilities.

```python
from core.resource_manager import ResourceManager

rm = ResourceManager(eta=0.75, gamma=3.0, overhead_mb=50)

# Get optimal workers
workers = rm.get_optimal_workers(file_paths=files)

# Get memory status
status = rm.get_memory_status()
print(f"Available RAM: {status['available_ram_mb']:.0f} MB")
print(f"Recommended workers: {status['recommended_workers']}")

# Log status to console
rm.log_status()
```

### `MemoryEstimator` Class

Low-level memory estimation.

```python
from core.resource_manager import MemoryEstimator

estimator = MemoryEstimator(gamma=3.0, overhead_mb=50)

# Estimate single file
file_mem = estimator.estimate_file_memory(file_size_bytes=10_000_000)

# Estimate batch peak
file_sizes = [5_000_000, 10_000_000, 3_000_000]
peak_mem = estimator.estimate_batch_memory(file_sizes, num_workers=4)
```

### `DynamicSemaphore` Class

Adaptive concurrency control.

```python
from core.resource_manager import DynamicSemaphore

sem = DynamicSemaphore(initial_permits=4, eta=0.75)

# Use as context manager
with sem:
    # Protected code runs here
    process_file(file)

# Manual acquire/release
if sem.acquire(blocking=False):
    try:
        process_file(file)
    finally:
        sem.release()
```

---

## Integration Examples

### In Report Averager

```python
from core.resource_manager import get_optimal_workers
from multiprocessing import Pool

files = get_report_files()
workers = get_optimal_workers(file_paths=files)

with Pool(processes=workers) as pool:
    results = pool.map(process_file, files)
```

### In Analysis Engine

```python
from core.resource_manager import ResourceManager

rm = ResourceManager()
rm.log_status()  # Print current memory state

workers = rm.get_optimal_workers()
print(f"Using {workers} workers for plot generation")
```

---

## Benchmarks

Performance measurements on a test system (16GB RAM, 8 cores):

| Files | File Size | Safety ON | Safety OFF | Memory Peak |
|-------|-----------|-----------|------------|-------------|
| 100 | 1 MB each | 6 workers | 8 workers | 4.2 GB |
| 500 | 1 MB each | 4 workers | 8 workers | 6.8 GB |
| 100 | 10 MB each | 2 workers | 8 workers | 5.1 GB |
| 500 | 10 MB each | 1 worker | 8 workers | 12.4 GB* |

*Safety OFF: System entered swap, processing time 3× slower

---

## Troubleshooting

### "Warning: psutil not installed"

Install psutil for full functionality:
```bash
pip install psutil
```

Without psutil, the system uses conservative fallback values.

### Processing is too slow

1. Increase `ETA` to allow more RAM usage:
   ```python
   rm = ResourceManager(eta=0.85)
   ```

2. Reduce `GAMMA` if your files are simple text:
   ```python
   rm = ResourceManager(gamma=2.0)
   ```

3. Disable safety (use with caution):
   ```python
   workers = get_optimal_workers(safety_enabled=False)
   ```

### System runs out of memory

1. Decrease `ETA`:
   ```python
   rm = ResourceManager(eta=0.60)
   ```

2. Increase `GAMMA` for complex files:
   ```python
   rm = ResourceManager(gamma=4.0)
   ```

3. Close other applications to free RAM

---

## References

The memory management approach is inspired by:

1. **Dynamic Process Pool Sizing** — Adapting multiprocessing to available resources
2. **Memory-Aware Scheduling** — Common in HPC batch schedulers (SLURM, PBS)
3. **Backpressure Mechanisms** — Preventing producer-consumer imbalance

---

## Contributing

To improve the memory models:

1. Profile your specific workload using:
   ```python
   rm = ResourceManager()
   rm.log_status()
   ```

2. Adjust `GAMMA` based on observed memory/file-size ratios

3. Submit improvements via pull request with benchmark data
