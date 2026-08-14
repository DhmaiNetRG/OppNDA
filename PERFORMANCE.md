# Performance & Memory Optimization

OppNDA implements **dynamic resource management** and **bounded worker concurrency** to efficiently process large simulation datasets while preventing system instability and OS-level swap thrashing. This document details the mathematical formulations, framework-level configuration options, and usage patterns.

## Overview

Processing ONE Simulator reports involves reading, parsing, and aggregating numerous heterogeneous simulation outputs. In a parallel execution environment, unconstrained worker spawning can rapidly exhaust physical RAM and trigger swap thrashing. 

OppNDA manages memory consumption through:
1. **Conservative Memory Bounding** — Models instantaneous memory consumption across concurrent workers.
2. **Memory-Feasible Worker Derivation** — Analytically computes maximum safe worker concurrency.
3. **Multi-Constraint Bounding** — Bounds concurrency across available processing cores, memory limits, and independent task count.
4. **Adaptive Dynamic Semaphores** — Regulates real-time concurrency under system-level memory pressure.

---

## Mathematical Models

The resource management engine directly implements the mathematical framework established in the OppNDA research paper.

### 1. Multiprocessing Memory Consumption Model

Let $\mathcal{M}_{\mathrm{base}}$ denote the baseline memory footprint of the *OppNDA Engine* (main process), and let $\mathcal{M}_{\mathrm{overhead}}$ denote the fixed memory overhead associated with each worker process (e.g., Python runtime imports, execution buffers).

In a multiprocessing environment with $P$ workers, the instantaneous memory footprint is modeled as:

$$\mathcal{M}(P) \le \mathcal{M}_{\mathrm{base}} + P\left(\gamma S_{\max} + \mathcal{M}_{\mathrm{overhead}}\right) \tag{1}$$

Where:
- $\mathcal{M}_{\mathrm{base}}$ — Baseline memory footprint of the OppNDA Engine
- $\mathcal{M}_{\mathrm{overhead}}$ — Fixed memory overhead per worker process (default: $30\text{ MB}$)
- $P$ — Number of concurrent worker processes
- $\gamma$ — In-memory data expansion factor (default: $2.5\times$)
- $S_{\max}$ — Maximum size of a simulation report processed in the batch ($S_{\max} = \max_i \mathrm{size}(r_i)$)

> [!NOTE]
> The bound in Eq. (1) is **conservative** because it assumes that every concurrent worker concurrently processes a report of maximum size $S_{\max}$.

---

### 2. Memory-Feasibility Condition

Let $\eta M_{\mathrm{RAM}}$ denote the maximum memory budget allocated to the multiprocessing workload, where $0 < \eta < 1$ and $M_{\mathrm{RAM}}$ is total system RAM. The memory-feasibility condition is:

$$\mathcal{M}(P) \le \eta M_{\mathrm{RAM}} \tag{2}$$

---

### 3. Maximum Memory-Feasible Worker Count

Solving Eq. (2) under the bound in Eq. (1) for $P$ yields the maximum number of memory-feasible worker processes:

$$P_{\mathrm{mem}}^{\max} = \left\lfloor \frac{\eta M_{\mathrm{RAM}} - \mathcal{M}_{\mathrm{base}}}{\gamma S_{\max} + \mathcal{M}_{\mathrm{overhead}}} \right\rfloor \tag{3}$$

---

### 4. Maximum Feasible Worker Bound

In addition to memory availability, the number of workers cannot exceed the number of available processing cores or the number of independent tasks. Thus, the maximum feasible worker count is bounded by:

$$P_{\max} = \min \left\{ P_{\mathrm{CPU}}, P_{\mathrm{mem}}^{\max}, N_{\mathrm{tasks}} \right\} \tag{4}$$

Where:
- $P_{\mathrm{CPU}}$ — Number of available CPU cores (`os.cpu_count()`)
- $P_{\mathrm{mem}}^{\max}$ — Maximum memory-feasible workers from Eq. (3)
- $N_{\mathrm{tasks}}$ — Number of independent visualization or analysis tasks in the queue

---

### 5. Theoretical Worker-Selection Problem

The memory-feasible bound does not necessarily correspond to the execution-time-optimal worker count, since increasing worker concurrency can introduce inter-process communication (IPC), coordination, and disk I/O bottlenecks. Accordingly, the theoretical worker-selection problem is formulated as:

$$P^* = \underset{P \in \mathcal{P}}{\arg\min}\; T_{\mathrm{parallel}}(P) \tag{5}$$

Where the feasible worker set is:

$$\mathcal{P} = \left\{ P \in \mathbb{Z}^+ \mid 1 \le P \le P_{\max} \right\} \tag{6}$$

---

### Framework-Level Constants ($\eta$ and $\gamma$)

The parameters $\eta$ and $\gamma$ are framework-level constants and do not alter underlying simulation behavior or vary across individual experiments:
- **$\eta$ (RAM utilization threshold)**: Controls the fraction of system memory budget allocated to multiprocessing (default: `0.85`). Increasing $\eta$ permits a larger memory-feasible worker pool.
- **$\gamma$ (Data expansion factor)**: Represents the expansion ratio of report data during in-memory tabular processing (default: `2.5`). Increasing $\gamma$ conservatively reduces the number of concurrent workers allowed under the same memory budget.

---

## Configuration Parameters

### Default Parameter Values

| Parameter | Symbol | Default | Description |
|-----------|--------|---------|-------------|
| `ETA` | $\eta$ | `0.85` | Fraction of system RAM budget (85%) |
| `GAMMA` | $\gamma$ | `2.5` | In-memory report data expansion factor |
| `M_OVERHEAD_MB` | $\mathcal{M}_{\mathrm{overhead}}$ | `30 MB` | Fixed per-worker memory overhead |
| `DEFAULT_S_MAX_MB` | $S_{\max}$ | `10 MB` | Default report size when files not measured |
| `MIN_WORKERS` | — | `1` | Lower bound of feasible set $\mathcal{P}$ |
| `MAX_WORKERS` | — | `64` | Upper safety ceiling for worker concurrency |
| `FALLBACK_WORKERS` | — | Auto | CPU count fallback when `psutil` is unavailable |
| `SAFETY_ENABLED` | — | `True` | Enable/disable memory feasibility constraints |

---

## Usage and API Reference

### `get_optimal_workers()`

Convenience function to compute $P^* \in \mathcal{P}$ directly.

```python
from core.resource_manager import get_optimal_workers

# 1. Automatic estimation using default system parameters
workers = get_optimal_workers()

# 2. File-aware estimation (computes S_max and N_tasks from file list)
workers = get_optimal_workers(file_paths=['report1.txt', 'report2.txt', 'report3.txt'])

# 3. Explicit task bounding (Eq. 4: N_tasks)
workers = get_optimal_workers(num_tasks=8)

# 4. Disable safety bounds (uses CPU fallback)
workers = get_optimal_workers(safety_enabled=False)
```

---

### `ResourceManager` Class

Complete resource management interface with telemetry and monitoring.

```python
from core.resource_manager import ResourceManager

# Initialize with custom framework constants if needed
rm = ResourceManager(
    eta=0.85,          # RAM budget fraction
    gamma=2.5,         # Expansion factor
    overhead_mb=30,    # Per-worker overhead
    safety_enabled=True
)

# Calculate memory-feasible worker bound P_mem_max (Eq. 3)
p_mem = rm.get_memory_feasible_workers(s_max=15 * 1024 * 1024)

# Calculate maximum feasible workers P_max (Eq. 4)
p_max = rm.get_max_feasible_workers(num_tasks=12, file_paths=file_list)

# Retrieve comprehensive memory and model telemetry
status = rm.get_memory_status(file_paths=file_list)
print(f"Total RAM (M_RAM): {status['total_ram_gb']:.2f} GB")
print(f"Baseline Footprint (M_base): {status['m_base_mb']:.1f} MB")
print(f"Report Size Bound (S_max): {status['s_max_mb']:.1f} MB")
print(f"Feasible Workers (P_max): {status['p_max']} (CPU: {status['p_cpu']})")

# Log formatted status report to stdout
rm.log_status(file_paths=file_list)
```

---

### `MemoryEstimator` Class

Analytical estimation utilities implementing Eq. (1).

```python
from core.resource_manager import MemoryEstimator

estimator = MemoryEstimator(gamma=2.5, overhead_mb=30)

# Estimate single report footprint: gamma * S + M_overhead
single_file_mem = estimator.estimate_file_memory(file_size_bytes=10 * 1024 * 1024)

# Estimate upper memory bound M(P) for P workers (Eq. 1)
bound = estimator.estimate_memory_bound(
    p=4, 
    s_max_bytes=10 * 1024 * 1024, 
    m_base_bytes=150 * 1024 * 1024
)

# Extract maximum report size S_max from files
s_max = estimator.get_s_max(file_paths=['sim_1.txt', 'sim_2.txt'])
```

---

### `DynamicSemaphore` Class

Real-time concurrency throttle adjusting permits based on memory pressure.

```python
from core.resource_manager import DynamicSemaphore

sem = DynamicSemaphore(initial_permits=4, eta=0.85)

# Context manager usage
with sem:
    process_simulation_report(file_path)
```

---

## Integration in OppNDA Pipelines

### Analysis Engine (`core/analysis.py`)

```python
from core.resource_manager import ResourceManager

rm = ResourceManager(safety_enabled=True)
num_processes = rm.get_optimal_workers(num_tasks=len(plot_jobs))

with Pool(processes=num_processes, initializer=_init_worker, initargs=(config, plots_dir)) as pool:
    results = list(pool.imap_unordered(execute_plot_job, plot_jobs))
```

### Report Averager (`core/averager.py`)

```python
from core.resource_manager import ResourceManager

rm = ResourceManager(safety_enabled=safety_enabled)
num_processes = rm.get_optimal_workers(file_paths=filepaths, num_tasks=len(filepaths))

with Pool(processes=num_processes) as pool:
    results = pool.map(parse_report, filepaths)
```

---

## Troubleshooting & Tuning

### `Warning: psutil not installed`
Install `psutil` for dynamic RAM and process RSS detection:
```bash
pip install psutil
```
Without `psutil`, conservative fallbacks ($8\text{ GB total RAM}, 4\text{ GB available}, 100\text{ MB baseline}$) are applied.

### High Memory Pressure or Swapping
If simulation reports are unusually complex or system RAM is constrained:
1. Decrease $\eta$ (e.g., $\eta = 0.70$) to increase headroom:
   ```python
   rm = ResourceManager(eta=0.70)
   ```
2. Increase $\gamma$ (e.g., $\gamma = 3.5$) for high data-expansion formats:
   ```python
   rm = ResourceManager(gamma=3.5)
   ```
