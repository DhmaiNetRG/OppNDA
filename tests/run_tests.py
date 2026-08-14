#!/usr/bin/env python3
"""
OppNDA Test Runner
Run all tests: python tests/run_tests.py --all
"""

import os
import sys
import argparse
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.test_configs import run_config_tests
from tests.test_framework import run_framework_tests, create_baseline_snapshots
from tests.gui_tests import run_gui_tests

try:
    from tests.gui_interactive_tests import run_interactive_tests
except ImportError:
    def run_interactive_tests():
        """Fallback when interactive GUI tests are not available."""
        print("\nInteractive GUI tests are not available in this checkout.")
        return []


def print_banner():
    """Print test suite banner"""
    print("\n" + "="*60)
    print("   OppNDA TEST SUITE")
    print("   " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("="*60)


def run_all_tests():
    """Run all test suites"""
    all_results = []
    
    # Framework tests (syntax, file existence)
    results = run_framework_tests()
    if results:
        all_results.extend(results)
    
    # Config file tests
    results = run_config_tests()
    if results:
        all_results.extend(results)
    
    # GUI tests (frontend components - static)
    results = run_gui_tests()
    if results:
        all_results.extend(results)
    
    # Interactive GUI tests (API, page loads, performance)
    results = run_interactive_tests()
    if results:
        all_results.extend(results)
    
    return all_results


def print_summary(results):
    """Print test summary"""
    if not results:
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print("No structured test results were collected by this runner.")
        print("Check the per-suite output above for pass/fail details.")
        print("="*60)
        return True

    passed = sum(1 for r in results if r.passed)
    failed = sum(1 for r in results if not r.passed)
    total = len(results)
    
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"Total:  {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed > 0:
        print("\nFailed Tests:")
        for r in results:
            if not r.passed:
                print(f"  - {r.name}: {r.message}")
    
    print("="*60)
    
    return failed == 0


def main():
    parser = argparse.ArgumentParser(description="OppNDA Test Suite")
    parser.add_argument("--all", action="store_true", help="Run all tests")
    parser.add_argument("--config", action="store_true", help="Run config file tests only")
    parser.add_argument("--framework", action="store_true", help="Run framework tests only")
    parser.add_argument("--gui", action="store_true", help="Run static GUI tests only")
    parser.add_argument("--interactive", action="store_true", help="Run interactive GUI tests only")
    parser.add_argument("--snapshot", action="store_true", help="Create baseline snapshots")
    
    args = parser.parse_args()
    
    print_banner()
    
    if args.snapshot:
        create_baseline_snapshots()
        return
    
    if args.config:
        results = run_config_tests()
    elif args.framework:
        results = run_framework_tests()
    elif args.gui:
        results = run_gui_tests()
    elif args.interactive:
        results = run_interactive_tests()
    else:
        # Default: run all tests
        results = run_all_tests()
    
    success = print_summary(results)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
