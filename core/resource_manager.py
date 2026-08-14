#!/usr/bin/env python3
"""
Resource Manager - Dynamic Memory Management for OppNDA
Implements bounded worker concurrency and multiprocessing memory consumption models
from the OppNDA research paper.

Mathematical Models Implemented:
1. Multiprocessing Memory Consumption Bound (Eq. 1):
   M(P) <= M_base + P * (gamma * S_max + M_overhead)
   where:
   - M_base: Baseline memory footprint of the OppNDA Engine (main process)
   - M_overhead: Fixed memory overhead associated with each worker process
   - P: Number of concurrent worker processes
   - gamma: In-memory data expansion factor (framework-level constant)
   - S_max: Maximum size of a simulation report processed in the batch (conservative bound)

2. Memory-Feasibility Condition (Eq. 2):
   M(P) <= eta * M_RAM
   where:
   - M_RAM: Total system memory budget / available RAM
   - eta: Fraction of system memory allocated to multiprocessing (0 < eta < 1)

3. Maximum Memory-Feasible Worker Count (Eq. 3):
   P_mem_max = floor((eta * M_RAM - M_base) / (gamma * S_max + M_overhead))

4. Maximum Feasible Worker Count (Eq. 4):
   P_max = min(P_CPU, P_mem_max, N_tasks)
   where:
   - P_CPU: Number of available processing cores
   - N_tasks: Number of independent visualization or analysis tasks

5. Theoretical Worker-Selection Formulation (Eq. 5 & 6):
   P* = argmin_{P in P_set} T_parallel(P)
   P_set = { P in Z+ | 1 <= P <= P_max }
"""

import os
import threading
from pathlib import Path
from typing import Optional, List, Tuple

# Try to import psutil, use fallback if not available
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    print("Warning: psutil not installed. Memory management will use fallback mode.")


class ResourceConfig:
    """Configuration for resource management parameters."""
    
    # Framework-level constants (Eq. 1 - Eq. 6)
    ETA = 0.85              # eta: RAM utilization threshold (85% budget)
    GAMMA = 2.5             # gamma: In-memory data expansion factor
    M_OVERHEAD_MB = 30      # M_overhead: Fixed per-worker memory overhead in MB
    DEFAULT_S_MAX_MB = 10   # Default S_max when file sizes are not explicitly measured
    MIN_WORKERS = 1         # Minimum worker count (feasible set lower bound)
    MAX_WORKERS = 64        # Maximum worker count (hard safety ceiling)
    
    # Use available CPU cores when psutil unavailable
    import os as _os
    FALLBACK_WORKERS = max(1, (_os.cpu_count() or 4))
    
    # Safety toggle
    SAFETY_ENABLED = True


class MemoryEstimator:
    """
    Estimates memory consumption for batch processing based on Eq. 1.
    
    M(P) <= M_base + P * (gamma * S_max + M_overhead)
    """
    
    def __init__(self, gamma: float = ResourceConfig.GAMMA, 
                 overhead_mb: float = ResourceConfig.M_OVERHEAD_MB):
        self.gamma = gamma
        self.overhead_bytes = int(overhead_mb * 1024 * 1024)
    
    def estimate_file_memory(self, file_size_bytes: int) -> int:
        """
        Estimate memory needed to process a single report file of size S (in bytes).
        Returns: gamma * S + M_overhead
        """
        return int(self.gamma * file_size_bytes + self.overhead_bytes)
    
    def estimate_memory_bound(self, p: int, s_max_bytes: int, m_base_bytes: int = 0) -> int:
        """
        Estimate instantaneous peak memory bound for P workers with report size bound S_max (Eq. 1).
        
        M(P) = M_base + P * (gamma * S_max + M_overhead)
        
        Args:
            p: Number of concurrent worker processes
            s_max_bytes: Maximum size of a simulation report (S_max in bytes)
            m_base_bytes: Baseline memory footprint of OppNDA Engine (M_base in bytes)
            
        Returns:
            Estimated upper bound of memory consumption in bytes
        """
        worker_footprint = self.estimate_file_memory(s_max_bytes)
        return int(m_base_bytes + p * worker_footprint)
    
    def estimate_batch_memory(self, file_sizes: List[int], num_workers: int, m_base_bytes: int = 0) -> int:
        """
        Estimate peak memory for a batch of files with given worker count.
        
        Args:
            file_sizes: List of file sizes in bytes
            num_workers: Number of concurrent workers
            m_base_bytes: Baseline memory in bytes
            
        Returns:
            Estimated peak memory in bytes
        """
        if not file_sizes:
            return m_base_bytes
        
        # Sort files by size (largest first) for worst-case estimation
        sorted_sizes = sorted(file_sizes, reverse=True)
        concurrent_files = sorted_sizes[:num_workers]
        peak_memory = m_base_bytes + sum(self.estimate_file_memory(size) for size in concurrent_files)
        return peak_memory
    
    def get_file_sizes(self, file_paths: List[str]) -> List[int]:
        """Get sizes of multiple files in bytes."""
        sizes = []
        for path in file_paths:
            try:
                sizes.append(os.path.getsize(path))
            except OSError:
                sizes.append(0)
        return sizes

    def get_s_max(self, file_paths: Optional[List[str]] = None, default_bytes: Optional[int] = None) -> int:
        """
        Get maximum file size S_max from list of files or default value.
        """
        if default_bytes is None:
            default_bytes = int(ResourceConfig.DEFAULT_S_MAX_MB * 1024 * 1024)
        if not file_paths:
            return default_bytes
        sizes = self.get_file_sizes(file_paths)
        valid_sizes = [s for s in sizes if s > 0]
        return max(valid_sizes) if valid_sizes else default_bytes


class DynamicSemaphore:
    """
    A semaphore that dynamically adjusts permits based on memory pressure.
    
    Maintains concurrency within the feasible set P in {1, ..., P_max}
    to prevent OS-level swap thrashing.
    """
    
    def __init__(self, initial_permits: int, 
                 eta: float = ResourceConfig.ETA,
                 safety_enabled: bool = True):
        self._lock = threading.Lock()
        self._current_permits = max(1, initial_permits)
        self._max_permits = max(1, initial_permits)
        self._eta = eta
        self._safety_enabled = safety_enabled
        self._active_workers = 0
    
    def acquire(self, blocking: bool = True) -> bool:
        """Acquire a permit, potentially waiting if none available."""
        with self._lock:
            if self._safety_enabled:
                self._adjust_permits()
            
            if self._active_workers < self._current_permits:
                self._active_workers += 1
                return True
            elif not blocking:
                return False
        
        # Blocking wait (simple spin with sleep)
        import time
        while True:
            time.sleep(0.01)
            with self._lock:
                if self._safety_enabled:
                    self._adjust_permits()
                if self._active_workers < self._current_permits:
                    self._active_workers += 1
                    return True
    
    def release(self):
        """Release a permit."""
        with self._lock:
            self._active_workers = max(0, self._active_workers - 1)
    
    def _adjust_permits(self):
        """Dynamically adjust permits based on memory pressure."""
        if not PSUTIL_AVAILABLE:
            return
        
        memory = psutil.virtual_memory()
        available_ratio = memory.available / memory.total
        
        # If available memory falls below (1 - eta), scale down permits
        if available_ratio < (1 - self._eta):
            pressure = (1 - self._eta - available_ratio) / (1 - self._eta)
            new_permits = max(1, int(self._max_permits * (1 - pressure)))
            self._current_permits = new_permits
        else:
            self._current_permits = self._max_permits
    
    @property
    def current_permits(self) -> int:
        return self._current_permits
    
    def __enter__(self):
        self.acquire()
        return self
    
    def __exit__(self, *args):
        self.release()


class ResourceManager:
    """
    Central resource manager for OppNDA's multiprocessing workload.
    
    Implements theoretical models from Eq. 1 through Eq. 6:
    - Conservative memory bound M(P) <= M_base + P * (gamma * S_max + M_overhead)
    - Memory feasibility condition M(P) <= eta * M_RAM
    - Memory-feasible worker bound P_mem_max = floor((eta * M_RAM - M_base) / (gamma * S_max + M_overhead))
    - Maximum feasible worker bound P_max = min(P_CPU, P_mem_max, N_tasks)
    - Concurrency optimization over feasible set P in {1, ..., P_max}
    
    Usage:
        rm = ResourceManager()
        workers = rm.get_optimal_workers(file_paths=files)
        
        # Or with safety disabled:
        rm = ResourceManager(safety_enabled=False)
    """
    
    def __init__(self, 
                 eta: float = ResourceConfig.ETA,
                 gamma: float = ResourceConfig.GAMMA,
                 overhead_mb: float = ResourceConfig.M_OVERHEAD_MB,
                 safety_enabled: bool = ResourceConfig.SAFETY_ENABLED):
        """
        Initialize the resource manager.
        
        Args:
            eta: RAM utilization threshold (0.0-1.0). Default 0.85
            gamma: DataFrame expansion factor. Default 2.5
            overhead_mb: Per-worker overhead in MB. Default 30
            safety_enabled: If False, disables memory checks and uses static fallback workers
        """
        self.eta = eta
        self.gamma = gamma
        self.overhead_mb = overhead_mb
        self.safety_enabled = safety_enabled
        
        self._estimator = MemoryEstimator(gamma, overhead_mb)
        
        # Cache system info
        self._cpu_count = os.cpu_count() or 1
        self._total_ram = self._get_total_ram()
    
    def _get_total_ram(self) -> int:
        """Get total system RAM in bytes (M_RAM)."""
        if PSUTIL_AVAILABLE:
            return psutil.virtual_memory().total
        # Fallback: assume 8GB
        return 8 * 1024 * 1024 * 1024
    
    def _get_available_ram(self) -> int:
        """Get available system RAM in bytes."""
        if PSUTIL_AVAILABLE:
            return psutil.virtual_memory().available
        # Fallback: assume 4GB available
        return 4 * 1024 * 1024 * 1024
    
    def _get_baseline_memory(self) -> int:
        """Get baseline memory footprint of OppNDA Engine (M_base)."""
        if PSUTIL_AVAILABLE:
            try:
                process = psutil.Process()
                return process.memory_info().rss
            except Exception:
                pass
        # Fallback: assume 100MB baseline
        return 100 * 1024 * 1024

    def get_memory_feasible_workers(self, 
                                    s_max: Optional[int] = None, 
                                    total_ram: Optional[int] = None, 
                                    m_base: Optional[int] = None) -> int:
        """
        Calculate maximum memory-feasible worker count (Eq. 3):
        P_mem_max = floor((eta * M_RAM - M_base) / (gamma * S_max + M_overhead))
        
        Args:
            s_max: Maximum report size S_max in bytes. If None, uses DEFAULT_S_MAX_MB.
            total_ram: System memory M_RAM in bytes. If None, queries system total RAM.
            m_base: Baseline memory M_base in bytes. If None, queries process RSS.
            
        Returns:
            Maximum memory-feasible workers (integer >= 1)
        """
        if s_max is None:
            s_max = int(ResourceConfig.DEFAULT_S_MAX_MB * 1024 * 1024)
        if total_ram is None:
            total_ram = self._get_total_ram()
        if m_base is None:
            m_base = self._get_baseline_memory()
            
        per_worker_mem = self._estimator.estimate_file_memory(s_max)
        memory_budget = self.eta * total_ram - m_base
        
        if memory_budget <= 0 or per_worker_mem <= 0:
            return ResourceConfig.MIN_WORKERS
            
        p_mem_max = int(memory_budget // per_worker_mem)
        return max(ResourceConfig.MIN_WORKERS, p_mem_max)

    def get_max_feasible_workers(self, 
                                 num_tasks: Optional[int] = None, 
                                 file_paths: Optional[List[str]] = None, 
                                 s_max: Optional[int] = None) -> int:
        """
        Calculate maximum feasible worker bound (Eq. 4):
        P_max = min(P_CPU, P_mem_max, N_tasks)
        
        Args:
            num_tasks: Number of independent tasks (N_tasks).
            file_paths: Optional list of simulation report paths to compute S_max and task count.
            s_max: Explicit maximum report size S_max in bytes.
            
        Returns:
            Maximum feasible worker count P_max (integer >= 1)
        """
        # If safety is disabled, bound only by CPU and task count
        if not self.safety_enabled:
            p_cpu = min(ResourceConfig.FALLBACK_WORKERS, self._cpu_count)
            if num_tasks is not None and num_tasks > 0:
                return max(1, min(p_cpu, num_tasks))
            if file_paths:
                return max(1, min(p_cpu, len(file_paths)))
            return max(1, p_cpu)
            
        # Determine S_max
        if s_max is None:
            s_max = self._estimator.get_s_max(file_paths)
            
        # Determine N_tasks
        n_tasks = num_tasks
        if n_tasks is None and file_paths is not None:
            n_tasks = len(file_paths)
            
        p_mem_max = self.get_memory_feasible_workers(s_max=s_max)
        p_cpu = self._cpu_count
        
        candidates = [p_cpu, p_mem_max, ResourceConfig.MAX_WORKERS]
        if n_tasks is not None and n_tasks > 0:
            candidates.append(n_tasks)
            
        p_max = min(candidates)
        return max(ResourceConfig.MIN_WORKERS, p_max)

    def get_optimal_workers(self, 
                            file_paths: Optional[List[str]] = None, 
                            num_tasks: Optional[int] = None, 
                            s_max: Optional[int] = None) -> int:
        """
        Calculate optimal worker count based on bounded worker concurrency (Eq. 4 - Eq. 6).
        
        P* in {1, ..., P_max} where P_max = min(P_CPU, P_mem_max, N_tasks)
        
        Args:
            file_paths: Optional list of file paths to process.
            num_tasks: Optional number of independent tasks (N_tasks).
            s_max: Optional maximum report size (S_max in bytes).
                        
        Returns:
            Optimal number of worker processes
        """
        return self.get_max_feasible_workers(num_tasks=num_tasks, file_paths=file_paths, s_max=s_max)
    
    def create_semaphore(self, initial_permits: Optional[int] = None) -> DynamicSemaphore:
        """
        Create a dynamic semaphore for worker pool management.
        
        Args:
            initial_permits: Starting permit count. If None, uses optimal workers.
            
        Returns:
            DynamicSemaphore instance
        """
        if initial_permits is None:
            initial_permits = self.get_optimal_workers()
        
        return DynamicSemaphore(
            initial_permits=initial_permits,
            eta=self.eta,
            safety_enabled=self.safety_enabled
        )
    
    def get_memory_status(self, file_paths: Optional[List[str]] = None, s_max: Optional[int] = None) -> dict:
        """
        Get current memory status and theoretical model metrics.
        
        Returns:
            Dictionary with memory statistics and theoretical parameters
        """
        if not PSUTIL_AVAILABLE:
            return {
                'psutil_available': False,
                'safety_enabled': self.safety_enabled,
                'fallback_workers': ResourceConfig.FALLBACK_WORKERS,
                'cpu_count': self._cpu_count,
                'recommended_workers': ResourceConfig.FALLBACK_WORKERS
            }
        
        mem = psutil.virtual_memory()
        m_base = self._get_baseline_memory()
        if s_max is None:
            s_max = self._estimator.get_s_max(file_paths)
            
        p_mem_max = self.get_memory_feasible_workers(s_max=s_max, total_ram=mem.total, m_base=m_base)
        p_max = self.get_max_feasible_workers(file_paths=file_paths, s_max=s_max)
        
        return {
            'psutil_available': True,
            'safety_enabled': self.safety_enabled,
            'total_ram_gb': mem.total / (1024**3),
            'available_ram_gb': mem.available / (1024**3),
            'used_percent': mem.percent,
            'm_base_mb': m_base / (1024**2),
            's_max_mb': s_max / (1024**2),
            'm_overhead_mb': self.overhead_mb,
            'eta': self.eta,
            'gamma': self.gamma,
            'memory_budget_gb': (self.eta * mem.total) / (1024**3),
            'p_mem_max': p_mem_max,
            'p_cpu': self._cpu_count,
            'p_max': p_max,
            'optimal_workers': p_max,
            'recommended_workers': p_max,
            'cpu_count': self._cpu_count
        }
    
    def log_status(self, file_paths: Optional[List[str]] = None):
        """Print current memory status and theoretical model parameters to console."""
        status = self.get_memory_status(file_paths=file_paths)
        
        if not status['psutil_available']:
            print("Memory Management: FALLBACK MODE (psutil not available)")
            print(f"  Workers: {status['fallback_workers']}")
            return
        
        if not status['safety_enabled']:
            print("Memory Management: DISABLED (using static workers)")
            print(f"  Workers: {status.get('fallback_workers', ResourceConfig.FALLBACK_WORKERS)}")
            return
        
        print("Memory Management: ACTIVE (Bounded Worker Concurrency)")
        print(f"  Total RAM (M_RAM): {status['total_ram_gb']:.2f} GB")
        print(f"  Available RAM: {status['available_ram_gb']:.2f} GB ({100 - status['used_percent']:.0f}% free)")
        print(f"  Baseline Footprint (M_base): {status['m_base_mb']:.1f} MB")
        print(f"  Report Size Bound (S_max): {status['s_max_mb']:.1f} MB")
        print(f"  Constants: eta={status['eta']:.2f}, gamma={status['gamma']:.1f}, M_overhead={status['m_overhead_mb']:.0f} MB")
        print(f"  Memory-Feasible Bound (P_mem_max): {status['p_mem_max']} workers")
        print(f"  Feasible Concurrency Bound (P_max): {status['p_max']} workers (P_CPU: {status['p_cpu']})")


# Convenience function for simple usage
def get_optimal_workers(safety_enabled: bool = True, 
                        file_paths: Optional[List[str]] = None,
                        num_tasks: Optional[int] = None,
                        s_max: Optional[int] = None) -> int:
    """
    Quick function to calculate feasible/optimal worker count (Eq. 4 - Eq. 6).
    
    Args:
        safety_enabled: If False, returns static fallback count
        file_paths: Optional file paths for size and task-based estimation
        num_tasks: Optional number of independent tasks (N_tasks)
        s_max: Optional maximum report size (S_max in bytes)
        
    Returns:
        Optimal worker count
    """
    rm = ResourceManager(safety_enabled=safety_enabled)
    return rm.get_optimal_workers(file_paths=file_paths, num_tasks=num_tasks, s_max=s_max)


if __name__ == "__main__":
    # Demo/test the resource manager
    print("=" * 60)
    print("OppNDA Resource Manager - Status Check")
    print("=" * 60)
    
    # Test with safety enabled
    print("\n[Safety ENABLED]")
    rm_safe = ResourceManager(safety_enabled=True)
    rm_safe.log_status()
    
    # Test with safety disabled
    print("\n[Safety DISABLED]")
    rm_unsafe = ResourceManager(safety_enabled=False)
    rm_unsafe.log_status()
    
    print("\n" + "=" * 60)
