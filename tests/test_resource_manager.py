#!/usr/bin/env python3
"""
Tests for the Resource Manager module.
Verifies the bounded worker concurrency and multiprocessing memory consumption models
from the OppNDA research paper:
- Memory bound Eq. 1: M(P) <= M_base + P * (gamma * S_max + M_overhead)
- Feasibility condition Eq. 2: M(P) <= eta * M_RAM
- Memory-feasible bound Eq. 3: P_mem_max = floor((eta * M_RAM - M_base) / (gamma * S_max + M_overhead))
- Feasible worker bound Eq. 4: P_max = min(P_CPU, P_mem_max, N_tasks)
- Feasible set Eq. 6: P in {1, ..., P_max}
"""

import os
import sys
import math
import tempfile

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.resource_manager import (
    ResourceManager, 
    ResourceConfig,
    MemoryEstimator,
    DynamicSemaphore,
    get_optimal_workers,
    PSUTIL_AVAILABLE
)


class TestResourceConfig:
    """Tests for ResourceConfig defaults matching paper framework constants"""
    
    def test_default_eta(self):
        """Verify default RAM threshold eta is 0.85 (85%)"""
        assert ResourceConfig.ETA == 0.85
    
    def test_default_gamma(self):
        """Verify default expansion factor gamma is 2.5"""
        assert ResourceConfig.GAMMA == 2.5
    
    def test_default_overhead(self):
        """Verify default per-worker overhead M_overhead is 30MB"""
        assert ResourceConfig.M_OVERHEAD_MB == 30
    
    def test_safety_enabled_by_default(self):
        """Verify safety is enabled by default"""
        assert ResourceConfig.SAFETY_ENABLED is True

    def test_worker_bounds(self):
        """Verify worker bounds min and max"""
        assert ResourceConfig.MIN_WORKERS == 1
        assert ResourceConfig.MAX_WORKERS >= 32


class TestMemoryEstimator:
    """Tests for MemoryEstimator implementing Eq. 1"""
    
    def test_file_memory_estimate(self):
        """Test memory estimation for a single report: gamma * S + M_overhead"""
        gamma = 2.5
        overhead_mb = 30
        estimator = MemoryEstimator(gamma=gamma, overhead_mb=overhead_mb)
        
        file_size = 10 * 1024 * 1024  # 10MB
        estimated = estimator.estimate_file_memory(file_size)
        
        expected = int(gamma * file_size + overhead_mb * 1024 * 1024)
        assert estimated == expected
    
    def test_estimate_memory_bound_eq1(self):
        """
        Verify Eq. 1: M(P) <= M_base + P * (gamma * S_max + M_overhead)
        """
        gamma = 2.5
        overhead_mb = 30
        estimator = MemoryEstimator(gamma=gamma, overhead_mb=overhead_mb)
        
        p = 4
        s_max = 12 * 1024 * 1024   # 12 MB
        m_base = 150 * 1024 * 1024 # 150 MB
        
        bound = estimator.estimate_memory_bound(p=p, s_max_bytes=s_max, m_base_bytes=m_base)
        expected = int(m_base + p * (gamma * s_max + overhead_mb * 1024 * 1024))
        assert bound == expected
    
    def test_batch_memory_estimate(self):
        """Test peak memory estimation for batch processing"""
        estimator = MemoryEstimator(gamma=2.0, overhead_mb=10)
        
        file_sizes = [5 * 1024 * 1024, 10 * 1024 * 1024, 3 * 1024 * 1024]
        workers = 2
        m_base = 50 * 1024 * 1024
        
        peak = estimator.estimate_batch_memory(file_sizes, workers, m_base_bytes=m_base)
        
        overhead_bytes = 10 * 1024 * 1024
        expected = m_base + (2.0 * 10 * 1024 * 1024 + overhead_bytes) + \
                   (2.0 * 5 * 1024 * 1024 + overhead_bytes)
        
        assert peak == int(expected)
    
    def test_empty_batch(self):
        """Test empty file list returns baseline memory"""
        estimator = MemoryEstimator()
        m_base = 100 * 1024 * 1024
        assert estimator.estimate_batch_memory([], 4, m_base_bytes=m_base) == m_base
        assert estimator.estimate_batch_memory([], 4) == 0


class TestResourceManagerTheoreticalBounds:
    """Tests for ResourceManager theoretical formulations (Eq. 2 - Eq. 6)"""
    
    def test_initialization(self):
        """Test ResourceManager initializes with framework constants"""
        rm = ResourceManager()
        assert rm.eta == 0.85
        assert rm.gamma == 2.5
        assert rm.overhead_mb == 30
        assert rm.safety_enabled is True
    
    def test_custom_parameters(self):
        """Test ResourceManager with custom parameters"""
        rm = ResourceManager(eta=0.80, gamma=3.0, overhead_mb=50, safety_enabled=False)
        assert rm.eta == 0.80
        assert rm.gamma == 3.0
        assert rm.overhead_mb == 50
        assert rm.safety_enabled is False
    
    def test_memory_feasible_workers_eq3(self):
        """
        Verify Eq. 3: P_mem_max = floor((eta * M_RAM - M_base) / (gamma * S_max + M_overhead))
        """
        eta = 0.85
        gamma = 2.5
        overhead_mb = 30
        rm = ResourceManager(eta=eta, gamma=gamma, overhead_mb=overhead_mb)
        
        total_ram = 16 * 1024 * 1024 * 1024   # 16 GB
        m_base = 200 * 1024 * 1024            # 200 MB
        s_max = 20 * 1024 * 1024              # 20 MB
        
        p_mem_max = rm.get_memory_feasible_workers(s_max=s_max, total_ram=total_ram, m_base=m_base)
        
        numerator = eta * total_ram - m_base
        denominator = gamma * s_max + overhead_mb * 1024 * 1024
        expected_p = math.floor(numerator / denominator)
        
        assert p_mem_max == expected_p
        assert p_mem_max >= 1
    
    def test_max_feasible_workers_eq4(self):
        """
        Verify Eq. 4: P_max = min(P_CPU, P_mem_max, N_tasks)
        """
        rm = ResourceManager()
        
        # Test task bounding: when N_tasks is very small (e.g. 2 tasks)
        n_tasks = 2
        p_max = rm.get_max_feasible_workers(num_tasks=n_tasks)
        assert p_max <= n_tasks
        assert p_max >= 1
        
        # When N_tasks is 1
        assert rm.get_max_feasible_workers(num_tasks=1) == 1
    
    def test_feasible_worker_set_eq6(self):
        """
        Verify Eq. 6: P in P_set where 1 <= P <= P_max
        """
        rm = ResourceManager()
        workers = rm.get_optimal_workers()
        assert isinstance(workers, int)
        assert 1 <= workers <= ResourceConfig.MAX_WORKERS
        assert workers <= rm._cpu_count
    
    def test_safety_disabled_uses_fallback(self):
        """Test that disabling safety uses fallback worker count bound by CPU and tasks"""
        rm = ResourceManager(safety_enabled=False)
        workers = rm.get_optimal_workers()
        expected = min(ResourceConfig.FALLBACK_WORKERS, rm._cpu_count)
        assert workers == expected
        
        # With task count constraint
        workers_tasks = rm.get_optimal_workers(num_tasks=2)
        assert workers_tasks == min(expected, 2)
    
    def test_memory_status_contains_theoretical_metrics(self):
        """Test memory status returns all theoretical parameters and bounds"""
        rm = ResourceManager()
        status = rm.get_memory_status()
        assert isinstance(status, dict)
        assert 'safety_enabled' in status
        assert 'eta' in status
        assert 'gamma' in status
        assert 'p_mem_max' in status
        assert 'p_max' in status
        assert 'optimal_workers' in status
        assert status['eta'] == 0.85
        assert status['gamma'] == 2.5


class TestDynamicSemaphore:
    """Tests for DynamicSemaphore class"""
    
    def test_basic_acquire_release(self):
        """Test basic acquire and release functionality"""
        sem = DynamicSemaphore(initial_permits=3, safety_enabled=False)
        
        assert sem.acquire() is True
        assert sem._active_workers == 1
        
        sem.release()
        assert sem._active_workers == 0
    
    def test_context_manager(self):
        """Test semaphore as context manager"""
        sem = DynamicSemaphore(initial_permits=2, safety_enabled=False)
        
        with sem:
            assert sem._active_workers == 1
        
        assert sem._active_workers == 0
    
    def test_respects_permits(self):
        """Test non-blocking acquire respects permit limit"""
        sem = DynamicSemaphore(initial_permits=1, safety_enabled=False)
        
        assert sem.acquire(blocking=False) is True
        assert sem.acquire(blocking=False) is False  # Should fail
        
        sem.release()
        assert sem.acquire(blocking=False) is True


class TestConvenienceFunction:
    """Tests for get_optimal_workers convenience function"""
    
    def test_returns_positive_integer(self):
        """Test convenience function returns positive integer"""
        workers = get_optimal_workers()
        assert isinstance(workers, int)
        assert workers >= 1
    
    def test_safety_toggle_works(self):
        """Test safety_enabled parameter works"""
        workers_safe = get_optimal_workers(safety_enabled=True)
        workers_unsafe = get_optimal_workers(safety_enabled=False)
        
        assert workers_safe >= 1
        assert workers_unsafe >= 1

    def test_task_bounding_parameter(self):
        """Test passing num_tasks bounds worker count"""
        workers = get_optimal_workers(num_tasks=2)
        assert workers <= 2
        assert workers >= 1


class TestFileBasedEstimation:
    """Tests for file-based memory estimation and S_max derivation"""
    
    def test_with_temp_files(self):
        """Test estimation with actual temporary files"""
        rm = ResourceManager()
        
        with tempfile.TemporaryDirectory() as tmpdir:
            files = []
            for i, size in enumerate([1024, 2048, 4096]):  # 1KB, 2KB, 4KB
                path = os.path.join(tmpdir, f"test_{i}.txt")
                with open(path, 'w') as f:
                    f.write('x' * size)
                files.append(path)
            
            # S_max should be 4096 bytes
            estimator = MemoryEstimator()
            assert estimator.get_s_max(files) == 4096
            
            workers = rm.get_optimal_workers(file_paths=files)
            assert workers >= 1
            assert workers <= len(files)


def test_psutil_availability():
    """Test psutil import detection flag is boolean"""
    assert isinstance(PSUTIL_AVAILABLE, bool)


if __name__ == "__main__":
    # Run tests standalone
    print("=" * 60)
    print("RESOURCE MANAGER THEORETICAL MODEL TESTS")
    print("=" * 60)
    
    test_classes = [
        TestResourceConfig,
        TestMemoryEstimator,
        TestResourceManagerTheoreticalBounds,
        TestDynamicSemaphore,
        TestConvenienceFunction,
        TestFileBasedEstimation,
    ]
    
    passed = 0
    failed = 0
    
    for test_class in test_classes:
        instance = test_class()
        for method_name in dir(instance):
            if method_name.startswith('test_'):
                try:
                    getattr(instance, method_name)()
                    print(f"[PASS] {test_class.__name__}.{method_name}")
                    passed += 1
                except Exception as e:
                    print(f"[FAIL] {test_class.__name__}.{method_name}: {e}")
                    failed += 1
    
    try:
        test_psutil_availability()
        print("[PASS] test_psutil_availability")
        passed += 1
    except Exception as e:
        print(f"[FAIL] test_psutil_availability: {e}")
        failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")
