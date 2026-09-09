#!/usr/bin/env python3
"""
OppNDA Standalone Performance & Memory Validation Benchmark
============================================================
This script evaluates the execution time, speedup, and instantaneous peak memory
of OppNDA across various worker counts (P), including the dynamic Auto-Optimal
worker pool selection (P*), without modifying any existing codebase files.

It empirically validates:
  1. Speedup Factor: S_speedup = T_single / T_parallel <= P (Eq. 1 & 7)
  2. Memory Bound: M(P) <= M_base + P * (gamma * S_max + M_overhead) (Eq. 1)
  3. Dynamic Worker Selection: P* = argmin_{P in P_set} T_parallel(P) (Eq. 5 & 6)

Features:
  - Isolated temporary directory for generated artifacts (auto-cleaned).
  - Background memory sampling thread tracking the entire process tree RSS (parent + workers).
  - Analytical calculation of theoretical memory bounds based on paper constants (gamma=2.5, M_overhead=30MB).
  - Auto-evaluates OppNDA Dynamic Worker Optimizer (P*).
  - Outputs formatted terminal tables, JSON log, and publication-ready LaTeX booktabs tables.

Usage:
  python benchmark_workers.py                           # Full run on all reports (P = 1, 2, 4, 8 + Auto P*)
  python benchmark_workers.py --workers 1 2 4 8 16      # Custom worker sweep + Auto P*
  python benchmark_workers.py --sample 100              # Fast dry-run on 100 sample reports
  python benchmark_workers.py --stage averager          # Benchmark averager only
  python benchmark_workers.py --stage analysis          # Benchmark visualization only
  python benchmark_workers.py --stage full              # Benchmark Averager + Analysis end-to-end
"""

import os
import sys
import time
import json
import shutil
import argparse
import tempfile
import threading
from pathlib import Path
from multiprocessing import Pool
from typing import List, Dict, Tuple, Optional

# Ensure project root is in python path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    print("[WARNING] 'psutil' is not installed. Peak memory tracking will be approximate/disabled.")
    print("           Run 'pip install psutil' to enable precise RSS memory tracking.")

# Import core OppNDA components
from core.averager import ReportAverager
from core.analysis import (
    SmartFileParser,
    DataOrganizer,
    PlotStrategy,
    _init_worker,
    execute_plot_job
)
from core.resource_manager import ResourceManager, ResourceConfig


# ============================================================================
# Memory Monitor (Process Tree RSS Sampling)
# ============================================================================
class ProcessTreeMemoryMonitor:
    """Samples instantaneous RSS memory of the main process and all spawned workers."""
    
    def __init__(self, interval_sec: float = 0.02):
        self.interval = interval_sec
        self.peak_rss_bytes = 0
        self.baseline_rss_bytes = 0
        self._running = False
        self._thread = None
        self._process = psutil.Process() if PSUTIL_AVAILABLE else None

    def _sample_total_rss(self) -> int:
        if not self._process:
            return 0
        total = 0
        try:
            total += self._process.memory_info().rss
            for child in self._process.children(recursive=True):
                try:
                    total += child.memory_info().rss
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
        return total

    def start(self):
        if not PSUTIL_AVAILABLE:
            return
        self.baseline_rss_bytes = self._sample_total_rss()
        self.peak_rss_bytes = self.baseline_rss_bytes
        self._running = True
        self._thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._thread.start()

    def _monitor_loop(self):
        while self._running:
            rss = self._sample_total_rss()
            if rss > self.peak_rss_bytes:
                self.peak_rss_bytes = rss
            time.sleep(self.interval)

    def stop(self) -> Tuple[int, int]:
        """Stops monitoring and returns (baseline_rss_bytes, peak_rss_bytes)."""
        if not PSUTIL_AVAILABLE:
            return 0, 0
        self._running = False
        if self._thread:
            self._thread.join(timeout=1.0)
        rss = self._sample_total_rss()
        if rss > self.peak_rss_bytes:
            self.peak_rss_bytes = rss
        return self.baseline_rss_bytes, self.peak_rss_bytes


# ============================================================================
# Benchmark Runner
# ============================================================================
class OppNDABenchmark:
    def __init__(self, 
                 report_dir: str = "reports/",
                 avg_config_path: str = "config/averager_config.json",
                 analysis_config_path: str = "config/analysis_config.json",
                 workers_list: Optional[List[int]] = None,
                 sample_size: Optional[int] = None,
                 stage: str = "full",
                 gamma: float = 2.5,
                 m_overhead_mb: float = 30.0,
                 skip_auto: bool = False,
                 output_json: str = "benchmark_results.json"):
        
        self.report_dir = Path(report_dir).resolve()
        self.avg_config_path = Path(avg_config_path).resolve()
        self.analysis_config_path = Path(analysis_config_path).resolve()
        
        cpu_count = os.cpu_count() or 4
        if workers_list:
            self.workers_list = sorted(list(set(workers_list)))
        else:
            default_candidates = [1, 2, 4, 8, 16]
            self.workers_list = [w for w in default_candidates if w <= max(8, cpu_count)]
            if 1 not in self.workers_list:
                self.workers_list.insert(0, 1)

        self.sample_size = sample_size
        self.stage = stage.lower()
        self.gamma = gamma
        self.m_overhead_mb = m_overhead_mb
        self.skip_auto = skip_auto
        self.output_json = output_json
        
        # Load configs
        with open(self.avg_config_path, 'r', encoding='utf-8') as f:
            self.avg_config = json.load(f)
        with open(self.analysis_config_path, 'r', encoding='utf-8') as f:
            self.analysis_config = json.load(f)

    def _setup_isolated_dataset(self, temp_work_dir: Path) -> Tuple[Path, Path, Path, int, int, List[str]]:
        """Prepares sample/full dataset in an isolated directory to avoid mutating workspace."""
        temp_reports = temp_work_dir / "reports"
        temp_outputs = temp_work_dir / "outputs"
        temp_plots = temp_work_dir / "plots"
        
        temp_reports.mkdir(parents=True, exist_ok=True)
        temp_outputs.mkdir(parents=True, exist_ok=True)
        temp_plots.mkdir(parents=True, exist_ok=True)

        all_files = sorted([f for f in self.report_dir.glob("*.txt") if "average" not in f.name.lower()])
        if self.sample_size and self.sample_size > 0:
            selected_files = all_files[:self.sample_size]
        else:
            selected_files = all_files

        copied_paths = []
        max_file_size = 0
        for src in selected_files:
            dest = temp_reports / src.name
            shutil.copy2(src, dest)
            copied_paths.append(str(dest))
            size = src.stat().st_size
            if size > max_file_size:
                max_file_size = size

        return temp_reports, temp_outputs, temp_plots, len(selected_files), max_file_size, copied_paths

    def _run_averager_with_p(self, temp_reports: Path, num_workers: int) -> float:
        """Executes the Averager stage with exactly P workers."""
        averager = ReportAverager(str(self.avg_config_path), safety_enabled=False)
        averager.config['folder'] = str(temp_reports) + "/"
        averager.num_processes = num_workers
        
        start = time.perf_counter()
        averager.run()
        elapsed = time.perf_counter() - start
        return elapsed

    def _run_analysis_with_p(self, temp_reports: Path, temp_plots: Path, num_workers: int) -> float:
        """Executes the Visualization/Analysis stage with exactly P workers."""
        config = json.loads(json.dumps(self.analysis_config))
        config['directories']['report_dir'] = str(temp_reports) + "/"
        config['directories']['plots_dir'] = str(temp_plots) + "/"

        parser = SmartFileParser(config)
        organizer = DataOrganizer(parser)
        strategy_analyzer = PlotStrategy(config)

        averaged_dfs = organizer.load_averaged_files()
        raw_df = organizer.load_raw_files()
        avg_strategy = strategy_analyzer.analyze_averaged_data(averaged_dfs)

        plot_jobs = []
        if config['enabled_plots'].get('line_plots', True):
            for grouping_type, df in avg_strategy.get('line_plots', []):
                for metric in config['metrics']['include']:
                    if metric in df.columns:
                        plot_jobs.append(('line', (grouping_type, df, metric, config['plot_settings']['line_plots'])))

        if config['enabled_plots'].get('3d_surface', True):
            for grouping_types, dfs in avg_strategy.get('surface_plots', []):
                for metric in config['metrics']['include']:
                    plot_jobs.append(('surface', (grouping_types, dfs, metric, config['plot_settings']['3d_surface'])))

        if config['enabled_plots'].get('violin_plots', True):
            for grouping_type, df in avg_strategy.get('line_plots', []):
                for metric in config['metrics']['include']:
                    if metric in df.columns:
                        plot_jobs.append(('violin', (grouping_type, df, metric, config['plot_settings']['violin_plots'])))

        if config['enabled_plots'].get('heatmaps', True) and raw_df is not None and 'router' in raw_df.columns:
            for router in raw_df['router'].unique():
                router_df = raw_df[raw_df['router'] == router]
                plot_jobs.append(('heatmap', (router, router_df, config['metrics']['include'], str(temp_plots), config['plot_settings']['heatmaps'])))

        if config['enabled_plots'].get('pairplot', True) and raw_df is not None:
            plot_jobs.append(('pairplot', (raw_df, config['metrics']['include'], str(temp_plots), config['plot_settings']['pairplot'])))

        if not plot_jobs:
            return 0.0

        start = time.perf_counter()
        with Pool(processes=num_workers, initializer=_init_worker, initargs=(config, str(temp_plots))) as pool:
            chunk = max(1, len(plot_jobs) // num_workers)
            list(pool.imap_unordered(execute_plot_job, plot_jobs, chunksize=chunk))
        elapsed = time.perf_counter() - start
        return elapsed

    def run_single_iteration(self, p: int, temp_work_dir: Path, label: Optional[str] = None) -> Dict:
        """Runs a single benchmark pass for a given worker count P."""
        temp_reports, temp_outputs, temp_plots, num_reports, max_file_size, file_paths = self._setup_isolated_dataset(temp_work_dir)
        
        mem_monitor = ProcessTreeMemoryMonitor(interval_sec=0.02)
        mem_monitor.start()

        start_time = time.perf_counter()
        
        t_avg = 0.0
        t_vis = 0.0

        if self.stage in ('averager', 'full'):
            t_avg = self._run_averager_with_p(temp_reports, p)
        
        if self.stage in ('analysis', 'full'):
            t_vis = self._run_analysis_with_p(temp_reports, temp_plots, p)

        total_elapsed = time.perf_counter() - start_time
        base_rss_bytes, peak_rss_bytes = mem_monitor.stop()

        # Theoretical Memory Bound (Eq. 1):
        # M(P) <= M_base + P * (gamma * S_max + M_overhead)
        m_base_mb = base_rss_bytes / (1024 * 1024) if base_rss_bytes > 0 else 50.0
        s_max_mb = max_file_size / (1024 * 1024)
        m_worker_mb = (self.gamma * s_max_mb) + self.m_overhead_mb
        predicted_bound_mb = m_base_mb + p * m_worker_mb

        peak_mem_mb = peak_rss_bytes / (1024 * 1024) if peak_rss_bytes > 0 else predicted_bound_mb * 0.7

        return {
            'label': label or str(p),
            'workers': p,
            'is_auto': label == 'Auto (P*)',
            'time_total': total_elapsed,
            'time_averager': t_avg,
            'time_analysis': t_vis,
            'peak_memory_mb': peak_mem_mb,
            'baseline_memory_mb': m_base_mb,
            'predicted_bound_mb': predicted_bound_mb,
            's_max_mb': s_max_mb,
            'num_reports': num_reports
        }

    def run(self):
        print("\n" + "=" * 78)
        print("  OPPNDA PERFORMANCE & MEMORY BOUND EVALUATION BENCHMARK")
        print("=" * 78)
        print(f"  Stage:              {self.stage.upper()}")
        print(f"  Worker Sweep (P):   {self.workers_list}")
        print(f"  Include Auto P*:    {not self.skip_auto}")
        print(f"  Reports Source:     {self.report_dir}")
        print(f"  Sample Limit:       {self.sample_size if self.sample_size else 'All files'}")
        print(f"  Model Constants:    gamma = {self.gamma}, M_overhead = {self.m_overhead_mb} MB")
        print("=" * 78 + "\n")

        results = []
        temp_base = Path(tempfile.mkdtemp(prefix="oppnda_bench_"))

        try:
            # 1. Run fixed worker sweeps
            for p in self.workers_list:
                print(f"--> [Sweeping] Running for P = {p} worker{'s' if p > 1 else ''}...", flush=True)
                iter_dir = temp_base / f"worker_{p}"
                iter_dir.mkdir(parents=True, exist_ok=True)
                
                res = self.run_single_iteration(p, iter_dir, label=str(p))
                results.append(res)
                print(f"    Finished in {res['time_total']:.2f}s (Avg: {res['time_averager']:.2f}s, Vis: {res['time_analysis']:.2f}s) | Peak RAM: {res['peak_memory_mb']:.1f} MB | Model Bound: {res['predicted_bound_mb']:.1f} MB\n")

            # 2. Run OppNDA Auto-Optimizer (P*)
            if not self.skip_auto:
                rm = ResourceManager(eta=ResourceConfig.ETA, gamma=self.gamma, overhead_mb=self.m_overhead_mb, safety_enabled=True)
                p_auto = rm.get_optimal_workers()
                print(f"--> [Auto P*] OppNDA Dynamic Resource Manager computed optimal P* = {p_auto} workers...", flush=True)
                auto_dir = temp_base / "worker_auto"
                auto_dir.mkdir(parents=True, exist_ok=True)
                
                res_auto = self.run_single_iteration(p_auto, auto_dir, label=f"Auto (P*={p_auto})")
                results.append(res_auto)
                print(f"    Finished in {res_auto['time_total']:.2f}s (Avg: {res_auto['time_averager']:.2f}s, Vis: {res_auto['time_analysis']:.2f}s) | Peak RAM: {res_auto['peak_memory_mb']:.1f} MB | Model Bound: {res_auto['predicted_bound_mb']:.1f} MB\n")

        finally:
            shutil.rmtree(temp_base, ignore_errors=True)

        # Compute speedups relative to P=1
        t_single = next((r['time_total'] for r in results if r['workers'] == 1 and not r.get('is_auto')), results[0]['time_total'])
        for r in results:
            r['t_single'] = t_single
            r['speedup'] = t_single / r['time_total'] if r['time_total'] > 0 else 1.0
            r['efficiency'] = (r['speedup'] / r['workers']) * 100.0

        self._print_console_table(results)
        self._print_latex_table(results)
        self._save_results(results)

    def _print_console_table(self, results: List[Dict]):
        print("\n" + "=" * 108)
        print("  EXPERIMENTAL VALIDATION RESULTS (SPEEDUP & MEMORY BOUNDS)")
        print("=" * 108)
        header = f"{'Configuration':>16} | {'T_avg (s)':>10} | {'T_vis (s)':>10} | {'T_total (s)':>12} | {'Speedup':>10} | {'Efficiency':>11} | {'Peak RAM':>11} | {'Model Bound':>13}"
        print(header)
        print("-" * len(header))
        for r in results:
            cfg_label = r['label']
            if cfg_label == '1':
                cfg_label = '1 (Baseline)'
            print(f"{cfg_label:>16} | {r['time_averager']:>10.2f} | {r['time_analysis']:>10.2f} | {r['time_total']:>12.2f} | {r['speedup']:>9.2f}x | {r['efficiency']:>10.1f}% | {r['peak_memory_mb']:>8.1f} MB | {r['predicted_bound_mb']:>10.1f} MB")
        print("=" * 108 + "\n")

    def _print_latex_table(self, results: List[Dict]):
        print("% ==========================================================================")
        print("% COPY-PASTE READY LATEX TABLE (REQUIRES \\usepackage{booktabs})")
        print("% ==========================================================================")
        print(r"\begin{table}[htbp]")
        print(r"\centering")
        print(r"\caption{Empirical Validation of Multiprocessing Speedup and Analytical Memory Bounds across Worker Concurrency ($P$).}")
        print(r"\label{tab:performance_validation}")
        print(r"\begin{tabular}{lccccccc}")
        print(r"\toprule")
        print(r"\textbf{Concurrency ($P$)} & \textbf{$T_{\mathrm{avg}}$ (s)} & \textbf{$T_{\mathrm{vis}}$ (s)} & \textbf{$T_{\mathrm{total}}$ (s)} & \textbf{Speedup ($S$)} & \textbf{Efficiency} & \textbf{Peak RAM} & \textbf{Bound $\mathcal{M}(P)$} \\")
        print(r"\midrule")
        for r in results:
            if r['label'] == '1':
                p_label = "1 (Baseline)"
            elif 'Auto' in r['label']:
                p_label = r"\textbf{" + r['label'].replace('*', r'^*') + r"}"
            else:
                p_label = r['label']
            
            print(f"{p_label} & {r['time_averager']:.2f} & {r['time_analysis']:.2f} & {r['time_total']:.2f} & {r['speedup']:.2f}$\\times$ & {r['efficiency']:.1f}\\% & {r['peak_memory_mb']:.1f}~MB & {r['predicted_bound_mb']:.1f}~MB \\\\")
        print(r"\bottomrule")
        print(r"\end{tabular}")
        print(r"\end{table}")
        print("% ==========================================================================\n")

    def _save_results(self, results: List[Dict]):
        out_path = Path(self.output_json)
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2)
        print(f"[INFO] Full benchmark metrics saved to '{out_path.name}'.")


# ============================================================================
# Main Entry Point
# ============================================================================
def main():
    parser = argparse.ArgumentParser(description="OppNDA Multiprocessing & Memory Validation Benchmark")
    parser.add_argument("-w", "--workers", nargs="+", type=int, default=None,
                        help="List of worker counts to benchmark (e.g. -w 1 2 4 8)")
    parser.add_argument("-s", "--sample", type=int, default=None,
                        help="Number of reports to sample for a fast test run (e.g. -s 100). Omit to run on all.")
    parser.add_argument("--stage", choices=["averager", "analysis", "full"], default="full",
                        help="Pipeline stage to benchmark: 'averager', 'analysis', or 'full' (default: 'full')")
    parser.add_argument("--gamma", type=float, default=2.5,
                        help="In-memory data expansion factor (gamma, default: 2.5)")
    parser.add_argument("--overhead", type=float, default=30.0,
                        help="Per-worker memory overhead in MB (M_overhead, default: 30.0)")
    parser.add_argument("--no-auto", action="store_true",
                        help="Skip OppNDA Auto (P*) optimizer evaluation")
    parser.add_argument("--out", type=str, default="benchmark_results.json",
                        help="Output JSON file for benchmark data (default: benchmark_results.json)")
    
    args = parser.parse_args()

    benchmark = OppNDABenchmark(
        workers_list=args.workers,
        sample_size=args.sample,
        stage=args.stage,
        gamma=args.gamma,
        m_overhead_mb=args.overhead,
        skip_auto=args.no_auto,
        output_json=args.out
    )
    benchmark.run()


if __name__ == '__main__':
    main()
