#!/usr/bin/env python3
"""
Telemetry Recorder for OppNDA Research Paper
============================================
Runs Single Process (P=1) and Multi Processes (P=8) on the full dataset,
sampling real instantaneous CPU utilization and Memory RSS (MB) at 100ms intervals.
Records exact empirical metrics into `telemetry_data.json`.
"""

import os
import sys
import time
import json
import psutil
import subprocess
import numpy as np
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
PYTHON_EXE = sys.executable
OUTPUT_JSON = PROJECT_ROOT / "telemetry_data.json"


def monitor_process(proc, sample_rate=0.1):
    """Monitor CPU % and Memory RSS (MB) of a process tree until it finishes."""
    timestamps = []
    cpu_samples = []
    mem_samples = []
    
    start_time = time.time()
    num_cpus = psutil.cpu_count(logical=True) or 8
    
    try:
        parent = psutil.Process(proc.pid)
    except psutil.NoSuchProcess:
        return timestamps, cpu_samples, mem_samples

    # Prime CPU percent measurement
    try:
        parent.cpu_percent(interval=None)
    except Exception:
        pass

    while proc.poll() is None:
        try:
            t = time.time() - start_time
            children = parent.children(recursive=True)
            all_procs = [parent] + children
            
            # Aggregate Memory RSS in MB
            total_rss_mb = 0.0
            for p in all_procs:
                try:
                    total_rss_mb += p.memory_info().rss / (1024 * 1024)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            
            # Aggregate CPU Usage (normalized to 0-100% of full system)
            total_cpu = 0.0
            for p in all_procs:
                try:
                    total_cpu += p.cpu_percent(interval=None)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            normalized_cpu = min(100.0, total_cpu / num_cpus) if num_cpus > 0 else total_cpu

            timestamps.append(round(t, 2))
            cpu_samples.append(round(normalized_cpu, 1))
            mem_samples.append(round(total_rss_mb, 1))
            
            time.sleep(sample_rate)
        except psutil.NoSuchProcess:
            break
        except Exception:
            break

    return timestamps, cpu_samples, mem_samples


def run_stage(script_name, workers, label=""):
    """Run a script with specified workers and measure real telemetry."""
    print(f"  --> Running {script_name} ({label}, P={workers})...", flush=True)
    t0 = time.time()
    
    if script_name == "averager":
        cfg_path = PROJECT_ROOT / "config" / "averager_config.json"
        with open(cfg_path, 'r', encoding='utf-8') as f:
            cfg = json.load(f)
        cfg["num_processes"] = workers
        temp_cfg = PROJECT_ROOT / f"temp_avg_cfg_{workers}.json"
        with open(temp_cfg, 'w', encoding='utf-8') as f:
            json.dump(cfg, f, indent=2)
        cmd = [PYTHON_EXE, str(PROJECT_ROOT / "core" / "averager.py"), str(temp_cfg)]
    else:
        cfg_path = PROJECT_ROOT / "config" / "analysis_config.json"
        with open(cfg_path, 'r', encoding='utf-8') as f:
            cfg = json.load(f)
        cfg["num_processes"] = workers
        temp_cfg = PROJECT_ROOT / f"temp_vis_cfg_{workers}.json"
        with open(temp_cfg, 'w', encoding='utf-8') as f:
            json.dump(cfg, f, indent=2)
        cmd = [PYTHON_EXE, str(PROJECT_ROOT / "core" / "analysis.py"), str(temp_cfg)]

    # Use DEVNULL so stdout/stderr buffer never deadlocks on Windows
    proc = subprocess.Popen(
        cmd,
        cwd=str(PROJECT_ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    timestamps, cpus, mems = monitor_process(proc, sample_rate=0.15)
    proc.wait()
    elapsed = time.time() - t0
    
    # Cleanup temp config
    if temp_cfg.exists():
        temp_cfg.unlink()

    avg_cpu = float(np.mean(cpus)) if cpus else 0.0
    avg_mem = float(np.mean(mems)) if mems else 0.0
    peak_mem = float(np.max(mems)) if mems else 0.0
    
    print(f"      Finished in {elapsed:.2f}s | Avg CPU: {avg_cpu:.1f}% | Avg RAM: {avg_mem:.1f} MB | Peak: {peak_mem:.1f} MB", flush=True)
    
    return {
        "elapsed": elapsed,
        "avg_cpu": avg_cpu,
        "avg_mem": avg_mem,
        "peak_mem": peak_mem,
        "timeline_t": timestamps,
        "timeline_cpu": cpus,
        "timeline_mem": mems
    }


def main():
    print("=" * 70)
    print("  OPPNDA REAL TELEMETRY SAMPLER")
    print("=" * 70)
    
    # 1. Single Process (P=1)
    print("\n[1/2] Profiling SINGLE PROCESS (P=1)...", flush=True)
    sp_avg = run_stage("averager", 1, "Single Process")
    sp_vis = run_stage("analysis", 1, "Single Process")
    
    # 2. Multi Processes (P=8)
    print("\n[2/2] Profiling MULTI PROCESSES (P=8, Optimal)...", flush=True)
    mp_avg = run_stage("averager", 8, "Multi Processes")
    mp_vis = run_stage("analysis", 8, "Multi Processes")
    
    # Single Process total timeline
    sp_t = sp_avg["timeline_t"] + [t + sp_avg["elapsed"] for t in sp_vis["timeline_t"]]
    sp_cpu = sp_avg["timeline_cpu"] + sp_vis["timeline_cpu"]
    sp_mem = sp_avg["timeline_mem"] + sp_vis["timeline_mem"]
    
    # Multi Process total timeline
    mp_t = mp_avg["timeline_t"] + [t + mp_avg["elapsed"] for t in mp_vis["timeline_t"]]
    mp_cpu = mp_avg["timeline_cpu"] + mp_vis["timeline_cpu"]
    mp_mem = mp_avg["timeline_mem"] + mp_vis["timeline_mem"]
    
    telemetry_data = {
        "single_process": {
            "averaging": {
                "time": sp_avg["elapsed"],
                "avg_cpu": sp_avg["avg_cpu"],
                "avg_mem": sp_avg["avg_mem"],
                "peak_mem": sp_avg["peak_mem"]
            },
            "analyzing": {
                "time": sp_vis["elapsed"],
                "avg_cpu": sp_vis["avg_cpu"],
                "avg_mem": sp_vis["avg_mem"],
                "peak_mem": sp_vis["peak_mem"]
            },
            "total_time": sp_avg["elapsed"] + sp_vis["elapsed"],
            "timeline": {
                "time": sp_t,
                "cpu": sp_cpu,
                "memory": sp_mem
            }
        },
        "multi_process": {
            "averaging": {
                "time": mp_avg["elapsed"],
                "avg_cpu": mp_avg["avg_cpu"],
                "avg_mem": mp_avg["avg_mem"],
                "peak_mem": mp_avg["peak_mem"]
            },
            "analyzing": {
                "time": mp_vis["elapsed"],
                "avg_cpu": mp_vis["avg_cpu"],
                "avg_mem": mp_vis["avg_mem"],
                "peak_mem": mp_vis["peak_mem"]
            },
            "total_time": mp_avg["elapsed"] + mp_vis["elapsed"],
            "timeline": {
                "time": mp_t,
                "cpu": mp_cpu,
                "memory": mp_mem
            }
        }
    }
    
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(telemetry_data, f, indent=2)
        
    print("\n" + "=" * 70)
    print(f"  [SAVED] Telemetry data saved to {OUTPUT_JSON}")
    print("=" * 70)


if __name__ == '__main__':
    main()
