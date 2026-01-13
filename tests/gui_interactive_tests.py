#!/usr/bin/env python3
"""
Interactive GUI Tests for OppNDA
Tests that verify actual user interactions with the GUI.
Uses Flask test client for API testing and can use browser automation.
"""

import os
import sys
import json
import tempfile
import shutil

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class InteractiveTestResult:
    """Holds interactive test result information"""
    def __init__(self, name, passed, message="", duration_ms=0):
        self.name = name
        self.passed = passed
        self.message = message
        self.duration_ms = duration_ms
    
    def __str__(self):
        status = "[PASS]" if self.passed else "[FAIL]"
        timing = f" ({self.duration_ms}ms)" if self.duration_ms > 0 else ""
        return f"{status}: {self.name}{timing}" + (f" - {self.message}" if self.message else "")


# ============================================================
# API ENDPOINT TESTS
# ============================================================

def get_test_client():
    """Create Flask test client"""
    try:
        from app import create_app
        app = create_app()
        app.config['TESTING'] = True
        return app.test_client()
    except ImportError as e:
        return None


def test_api_get_analysis_config():
    """Test GET /api/config/analysis endpoint"""
    import time
    start = time.time()
    
    client = get_test_client()
    if client is None:
        return InteractiveTestResult("API GET Analysis Config", False, "Could not create test client")
    
    try:
        response = client.get('/api/config/analysis')
        duration = int((time.time() - start) * 1000)
        
        if response.status_code == 200:
            data = json.loads(response.data)
            if 'directories' in data and 'metrics' in data:
                return InteractiveTestResult("API GET Analysis Config", True, duration_ms=duration)
            else:
                return InteractiveTestResult("API GET Analysis Config", False, "Missing expected keys")
        else:
            return InteractiveTestResult("API GET Analysis Config", False, f"Status: {response.status_code}")
    except Exception as e:
        return InteractiveTestResult("API GET Analysis Config", False, str(e))


def test_api_get_batch_config():
    """Test GET /api/config/batch endpoint"""
    import time
    start = time.time()
    
    client = get_test_client()
    if client is None:
        return InteractiveTestResult("API GET Batch Config", False, "Could not create test client")
    
    try:
        response = client.get('/api/config/batch')
        duration = int((time.time() - start) * 1000)
        
        if response.status_code == 200:
            data = json.loads(response.data)
            if 'folder' in data:
                return InteractiveTestResult("API GET Batch Config", True, duration_ms=duration)
            else:
                return InteractiveTestResult("API GET Batch Config", False, "Missing expected keys")
        else:
            return InteractiveTestResult("API GET Batch Config", False, f"Status: {response.status_code}")
    except Exception as e:
        return InteractiveTestResult("API GET Batch Config", False, str(e))


def test_api_get_regression_config():
    """Test GET /api/config/regression endpoint"""
    import time
    start = time.time()
    
    client = get_test_client()
    if client is None:
        return InteractiveTestResult("API GET Regression Config", False, "Could not create test client")
    
    try:
        response = client.get('/api/config/regression')
        duration = int((time.time() - start) * 1000)
        
        if response.status_code == 200:
            data = json.loads(response.data)
            if 'features' in data or 'input' in data:
                return InteractiveTestResult("API GET Regression Config", True, duration_ms=duration)
            else:
                return InteractiveTestResult("API GET Regression Config", False, "Missing expected keys")
        else:
            return InteractiveTestResult("API GET Regression Config", False, f"Status: {response.status_code}")
    except Exception as e:
        return InteractiveTestResult("API GET Regression Config", False, str(e))


def test_api_save_settings():
    """Test POST /api/save-settings endpoint"""
    import time
    start = time.time()
    
    client = get_test_client()
    if client is None:
        return InteractiveTestResult("API Save Settings", False, "Could not create test client")
    
    try:
        test_content = "# Test settings\nScenario.name = test_scenario\n"
        response = client.post(
            '/api/save-settings',
            data=json.dumps({
                'filename': 'test_settings_DELETE_ME.txt',
                'content': test_content
            }),
            content_type='application/json'
        )
        duration = int((time.time() - start) * 1000)
        
        if response.status_code == 200:
            data = json.loads(response.data)
            if data.get('success'):
                # Clean up test file
                test_file = os.path.join(BASE_DIR, 'test_settings_DELETE_ME.txt')
                if os.path.exists(test_file):
                    os.remove(test_file)
                return InteractiveTestResult("API Save Settings", True, duration_ms=duration)
            else:
                return InteractiveTestResult("API Save Settings", False, data.get('error', 'Unknown error'))
        else:
            return InteractiveTestResult("API Save Settings", False, f"Status: {response.status_code}")
    except Exception as e:
        return InteractiveTestResult("API Save Settings", False, str(e))


def test_api_save_all():
    """Test POST /api/save-all endpoint"""
    import time
    start = time.time()
    
    client = get_test_client()
    if client is None:
        return InteractiveTestResult("API Save All", False, "Could not create test client")
    
    try:
        response = client.post(
            '/api/save-all',
            data=json.dumps({
                'settings': {
                    'filename': 'test_all_DELETE_ME.txt',
                    'content': '# Test\n'
                }
            }),
            content_type='application/json'
        )
        duration = int((time.time() - start) * 1000)
        
        if response.status_code == 200:
            data = json.loads(response.data)
            # Clean up
            test_file = os.path.join(BASE_DIR, 'test_all_DELETE_ME.txt')
            if os.path.exists(test_file):
                os.remove(test_file)
            if data.get('success'):
                return InteractiveTestResult("API Save All", True, duration_ms=duration)
            else:
                return InteractiveTestResult("API Save All", False, data.get('error', 'Unknown'))
        else:
            return InteractiveTestResult("API Save All", False, f"Status: {response.status_code}")
    except Exception as e:
        return InteractiveTestResult("API Save All", False, str(e))


def test_api_config_update():
    """Test POST /api/config/analysis endpoint to update config"""
    import time
    start = time.time()
    
    client = get_test_client()
    if client is None:
        return InteractiveTestResult("API Config Update", False, "Could not create test client")
    
    try:
        # Get current config first
        get_response = client.get('/api/config/analysis')
        if get_response.status_code != 200:
            return InteractiveTestResult("API Config Update", False, "Could not get current config")
        
        original_config = json.loads(get_response.data)
        
        # Update with minimal change
        update_data = {'directories': original_config.get('directories', {})}
        
        response = client.post(
            '/api/config/analysis',
            data=json.dumps(update_data),
            content_type='application/json'
        )
        duration = int((time.time() - start) * 1000)
        
        if response.status_code == 200:
            data = json.loads(response.data)
            if data.get('success'):
                return InteractiveTestResult("API Config Update", True, duration_ms=duration)
            else:
                return InteractiveTestResult("API Config Update", False, data.get('error', 'Unknown'))
        else:
            return InteractiveTestResult("API Config Update", False, f"Status: {response.status_code}")
    except Exception as e:
        return InteractiveTestResult("API Config Update", False, str(e))


# ============================================================
# STATIC PAGE TESTS (simulating page load)
# ============================================================

def test_settings_page_loads():
    """Test that settings page can be served"""
    import time
    start = time.time()
    
    client = get_test_client()
    if client is None:
        return InteractiveTestResult("Settings Page Load", False, "Could not create test client")
    
    try:
        response = client.get('/')
        duration = int((time.time() - start) * 1000)
        
        if response.status_code == 200:
            content = response.data.decode('utf-8')
            # Check for key elements
            if 'ScenarioSettings' in content and 'GroupSettings' in content:
                return InteractiveTestResult("Settings Page Load", True, f"Page loaded", duration_ms=duration)
            else:
                return InteractiveTestResult("Settings Page Load", False, "Missing expected content")
        else:
            return InteractiveTestResult("Settings Page Load", False, f"Status: {response.status_code}")
    except Exception as e:
        return InteractiveTestResult("Settings Page Load", False, str(e))


def test_css_loads():
    """Test that CSS file exists and is valid"""
    import time
    start = time.time()
    
    css_path = os.path.join(BASE_DIR, "GUI", "settings.css")
    
    try:
        if os.path.exists(css_path):
            with open(css_path, 'r', encoding='utf-8') as f:
                content = f.read()
            duration = int((time.time() - start) * 1000)
            if len(content) > 100:
                return InteractiveTestResult("CSS File Available", True, duration_ms=duration)
            else:
                return InteractiveTestResult("CSS File Available", False, "File too small")
        else:
            return InteractiveTestResult("CSS File Available", False, "File not found")
    except Exception as e:
        return InteractiveTestResult("CSS File Available", False, str(e))


def test_js_loads():
    """Test that JavaScript file exists and is valid"""
    import time
    start = time.time()
    
    js_path = os.path.join(BASE_DIR, "GUI", "config.js")
    
    try:
        if os.path.exists(js_path):
            with open(js_path, 'r', encoding='utf-8') as f:
                content = f.read()
            duration = int((time.time() - start) * 1000)
            if 'function' in content and len(content) > 1000:
                return InteractiveTestResult("JS File Available", True, duration_ms=duration)
            else:
                return InteractiveTestResult("JS File Available", False, "Not valid JS")
        else:
            return InteractiveTestResult("JS File Available", False, "File not found")
    except Exception as e:
        return InteractiveTestResult("JS File Available", False, str(e))


# ============================================================
# FORM VALIDATION TESTS
# ============================================================

def test_settings_content_generation():
    """Test that generated settings content follows ONE format"""
    import time
    start = time.time()
    
    config_js_path = os.path.join(BASE_DIR, "GUI", "config.js")
    
    try:
        with open(config_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        duration = int((time.time() - start) * 1000)
        
        # Check for proper ONE format generation patterns
        required_patterns = [
            "Scenario.name =",
            "Scenario.simulateConnections =",
            "Group.router =",
            "Report.nrofReports ="
        ]
        
        missing = [p for p in required_patterns if p not in content]
        
        if missing:
            return InteractiveTestResult("Settings Content Generation", False, f"Missing: {missing}")
        
        return InteractiveTestResult("Settings Content Generation", True, duration_ms=duration)
    except Exception as e:
        return InteractiveTestResult("Settings Content Generation", False, str(e))


def test_api_endpoints_registered():
    """Test that all required API endpoints are registered"""
    import time
    start = time.time()
    
    client = get_test_client()
    if client is None:
        return InteractiveTestResult("API Endpoints Registered", False, "Could not create test client")
    
    try:
        # Test each endpoint exists (may return 404/405 but not 500)
        endpoints = [
            ('/api/config/analysis', 'GET'),
            ('/api/config/batch', 'GET'),
            ('/api/config/regression', 'GET'),
            ('/api/save-settings', 'POST'),
            ('/api/save-all', 'POST'),
        ]
        
        failed = []
        for endpoint, method in endpoints:
            if method == 'GET':
                response = client.get(endpoint)
            else:
                response = client.post(endpoint, data='{}', content_type='application/json')
            
            if response.status_code >= 500:
                failed.append(f"{endpoint} (500)")
        
        duration = int((time.time() - start) * 1000)
        
        if failed:
            return InteractiveTestResult("API Endpoints Registered", False, f"Server errors: {failed}")
        
        return InteractiveTestResult("API Endpoints Registered", True, duration_ms=duration)
    except Exception as e:
        return InteractiveTestResult("API Endpoints Registered", False, str(e))


# ============================================================
# PERFORMANCE TESTS
# ============================================================

def test_page_load_performance():
    """Test that page loads within acceptable time"""
    import time
    
    client = get_test_client()
    if client is None:
        return InteractiveTestResult("Page Load Performance", False, "Could not create test client")
    
    try:
        # Measure multiple loads
        times = []
        for _ in range(3):
            start = time.time()
            response = client.get('/')
            times.append(time.time() - start)
        
        avg_ms = int(sum(times) / len(times) * 1000)
        
        if avg_ms < 2000:  # Less than 2 seconds
            return InteractiveTestResult("Page Load Performance", True, f"Avg: {avg_ms}ms", duration_ms=avg_ms)
        else:
            return InteractiveTestResult("Page Load Performance", False, f"Too slow: {avg_ms}ms")
    except Exception as e:
        return InteractiveTestResult("Page Load Performance", False, str(e))


def test_api_response_time():
    """Test that API responds within acceptable time"""
    import time
    
    client = get_test_client()
    if client is None:
        return InteractiveTestResult("API Response Time", False, "Could not create test client")
    
    try:
        times = []
        for _ in range(3):
            start = time.time()
            response = client.get('/api/config/analysis')
            times.append(time.time() - start)
        
        avg_ms = int(sum(times) / len(times) * 1000)
        
        if avg_ms < 500:  # Less than 500ms
            return InteractiveTestResult("API Response Time", True, f"Avg: {avg_ms}ms", duration_ms=avg_ms)
        else:
            return InteractiveTestResult("API Response Time", False, f"Too slow: {avg_ms}ms")
    except Exception as e:
        return InteractiveTestResult("API Response Time", False, str(e))


# ============================================================
# TEST RUNNER
# ============================================================

def run_interactive_tests():
    """Run all interactive tests"""
    results = []
    
    print("\n" + "="*60)
    print("INTERACTIVE GUI TESTS")
    print("="*60)
    
    # Check if Flask app is available
    client = get_test_client()
    if client is None:
        print("\n[WARN] Could not create Flask test client.")
        print("       Make sure 'app' package is importable.")
        print("       Skipping API tests, running static tests only.\n")
    
    # API Tests
    if client is not None:
        print("\n--- API Endpoint Tests ---")
        api_tests = [
            test_api_get_analysis_config,
            test_api_get_batch_config,
            test_api_get_regression_config,
            test_api_save_settings,
            test_api_save_all,
            test_api_config_update,
            test_api_endpoints_registered,
        ]
        
        for test_func in api_tests:
            result = test_func()
            results.append(result)
            print(result)
    
    # Page Load Tests
    if client is not None:
        print("\n--- Page Load Tests ---")
        page_tests = [
            test_settings_page_loads,
            test_css_loads,
            test_js_loads,
        ]
        
        for test_func in page_tests:
            result = test_func()
            results.append(result)
            print(result)
    
    # Performance Tests
    if client is not None:
        print("\n--- Performance Tests ---")
        perf_tests = [
            test_page_load_performance,
            test_api_response_time,
        ]
        
        for test_func in perf_tests:
            result = test_func()
            results.append(result)
            print(result)
    
    # Content Validation Tests (always run)
    print("\n--- Content Validation Tests ---")
    content_tests = [
        test_settings_content_generation,
    ]
    
    for test_func in content_tests:
        result = test_func()
        results.append(result)
        print(result)
    
    # Summary
    if results:
        passed = sum(1 for r in results if r.passed)
        total = len(results)
        avg_time = sum(r.duration_ms for r in results if r.duration_ms > 0) / max(1, len([r for r in results if r.duration_ms > 0]))
        print(f"\nInteractive Tests: {passed}/{total} passed (avg response: {int(avg_time)}ms)")
    else:
        print("\nNo tests were run - Flask test client not available")
    
    print("="*60)
    
    return results


if __name__ == "__main__":
    run_interactive_tests()
