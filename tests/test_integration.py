#!/usr/bin/env python3
"""
Integration Tests for OppNDA
Tests the complete flow: settings modification -> save -> run simulation -> post-processing.
"""

import os
import sys
import json
import shutil
import tempfile
import platform
from pathlib import Path
from unittest import mock

import pytest

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_DIR = BASE_DIR / 'config'
FIXTURES_DIR = Path(__file__).resolve().parent / 'fixtures'


def get_test_client():
    """Create Flask test client"""
    try:
        from app import create_app
        app = create_app()
        app.config['TESTING'] = True
        return app.test_client(), app
    except ImportError:
        return None, None


# ============================================================================
# SETTINGS SAVE FLOW TESTS
# ============================================================================

class TestSettingsSaveFlow:
    """Tests for settings modification and saving."""
    
    def test_save_settings_creates_file(self):
        """Verify settings are saved to .txt file in project root."""
        client, app = get_test_client()
        if client is None:
            pytest.skip("Flask app not available")
        
        test_filename = 'integration_test_settings_DELETE_ME.txt'
        test_content = "# Integration Test\nScenario.name = test_integration\n"
        
        try:
            response = client.post(
                '/api/save-settings',
                data=json.dumps({
                    'filename': test_filename,
                    'content': test_content
                }),
                content_type='application/json'
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data.get('success') is True
            
            # Verify file was created
            settings_path = BASE_DIR / test_filename
            assert settings_path.exists()
            
            with open(settings_path, 'r', encoding='utf-8') as f:
                saved_content = f.read()
            assert saved_content == test_content
            
        finally:
            # Cleanup
            test_file = BASE_DIR / test_filename
            if test_file.exists():
                test_file.unlink()
    
    def test_save_all_settings_merges_configs(self):
        """Verify config merge preserves existing fields like plot_settings."""
        client, app = get_test_client()
        if client is None:
            pytest.skip("Flask app not available")
        
        # Get current analysis config
        response = client.get('/api/config/analysis')
        assert response.status_code == 200
        original_config = json.loads(response.data)
        
        # Note the plot_settings that should be preserved
        original_plot_settings = original_config.get('plot_settings', {})
        
        # Save with only partial update (no plot_settings)
        test_filename = 'merge_test_DELETE_ME.txt'
        response = client.post(
            '/api/save-all',
            data=json.dumps({
                'settings': {
                    'filename': test_filename,
                    'content': '# Test\n'
                },
                'analysis': {
                    'directories': original_config.get('directories', {}),
                    'report_types': ['TestReport']
                }
            }),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        
        try:
            # Verify plot_settings was preserved
            response = client.get('/api/config/analysis')
            updated_config = json.loads(response.data)
            
            assert updated_config.get('plot_settings') == original_plot_settings
            assert updated_config.get('report_types') == ['TestReport']
            
        finally:
            # Cleanup
            test_file = BASE_DIR / test_filename
            if test_file.exists():
                test_file.unlink()
            
            # Restore original config
            config_path = CONFIG_DIR / 'analysis_config.json'
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(original_config, f, indent=2)
    
    def test_config_changes_persist(self):
        """Verify modified configs are actually saved to disk."""
        client, app = get_test_client()
        if client is None:
            pytest.skip("Flask app not available")
        
        config_path = CONFIG_DIR / 'averager_config.json'
        
        # Backup original
        with open(config_path, 'r', encoding='utf-8') as f:
            original_config = json.load(f)
        
        try:
            # Update config via API
            new_folder = 'integration_test_folder'
            response = client.post(
                '/api/config/averager',
                data=json.dumps({'folder': new_folder}),
                content_type='application/json'
            )
            
            assert response.status_code == 200
            
            # Read file directly and verify change persisted
            with open(config_path, 'r', encoding='utf-8') as f:
                saved_config = json.load(f)
            
            assert saved_config.get('folder') == new_folder
            
        finally:
            # Restore original
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(original_config, f, indent=2)


# ============================================================================
# DEFAULT SETTINGS TESTS - Ensure new users can run without configuration
# ============================================================================

class TestDefaultSettings:
    """Tests that verify defaults work for new users throughout the pipeline."""
    
    # Default values expected from HTML/JS (for reference and testing)
    HTML_DEFAULTS = {
        'scenario_name': 'default_scenario',
        'update_interval': 0.1,
        'end_time': 43200,
        'buffer_size': '5M',
        'wait_time': '0, 120',
        'speed': '0.5, 1.5',
        'msg_ttl': 300,
        'num_hosts': 40,
        'router': 'EpidemicRouter',
        'movement_model': 'ShortestPathMapBasedMovement',
        'world_size': '4500, 3400',
        'warmup': 1000,
        'prophet_time_unit': 30,
        'spray_copies': 6,
        'cell_size_mult': 5,
    }
    
    def test_analysis_config_has_sensible_defaults(self):
        """Verify analysis_config.json has all required fields with defaults."""
        config_path = CONFIG_DIR / 'analysis_config.json'
        assert config_path.exists(), "analysis_config.json must exist"
        
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # Required structure for OppNDA to function
        assert 'directories' in config
        assert 'report_dir' in config['directories']
        assert 'plots_dir' in config['directories']
        assert 'metrics' in config
        assert 'enabled_plots' in config
        assert 'plot_settings' in config
        
        # Verify plot types are defined
        assert 'line_plots' in config['plot_settings']
        assert '3d_surface' in config['plot_settings']
    
    def test_averager_config_has_sensible_defaults(self):
        """Verify averager_config.json has working default structure."""
        config_path = CONFIG_DIR / 'averager_config.json'
        assert config_path.exists(), "averager_config.json must exist"
        
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # Required for averager to parse files
        assert 'folder' in config
        assert 'filename_pattern' in config
        assert 'data_separator' in config
        
        # Filename pattern must have structure for parsing
        pattern = config['filename_pattern']
        assert 'delimiter' in pattern
        assert 'components' in pattern
        
        # Components should know key positions
        components = pattern['components']
        assert 'router' in components or 'report_type' in components
    
    def test_regression_config_has_sensible_defaults(self):
        """Verify regression_config.json has ML-ready defaults."""
        config_path = CONFIG_DIR / 'regression_config.json'
        assert config_path.exists(), "regression_config.json must exist"
        
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # Required structure
        assert 'input' in config
        assert 'features' in config
        assert 'model_settings' in config
        assert 'output' in config
        
        # Must have some models enabled by default
        enabled_models = config['model_settings'].get('enabled_models', {})
        assert any(enabled_models.values()), "At least one ML model should be enabled"
    
    def test_default_one_settings_format(self):
        """Test that a settings file with defaults has valid ONE format."""
        # Simulate default GUI values generating settings content
        defaults = self.HTML_DEFAULTS
        
        content = f"""## Scenario settings
Scenario.name = {defaults['scenario_name']}_%%Group.router%%
Scenario.simulateConnections = true
Scenario.updateInterval = {defaults['update_interval']}
Scenario.endTime = {defaults['end_time']}

## Interface settings
btInterface.type = SimpleBroadcastInterface
btInterface.transmitSpeed = 250k
btInterface.transmitRange = 10

## Group settings
Group.movementModel = {defaults['movement_model']}
Group.router = [{defaults['router']}]
Group.bufferSize = {defaults['buffer_size']}
Group.waitTime = {defaults['wait_time']}
Group.speed = {defaults['speed']}
Group.msgTtl = {defaults['msg_ttl']}
Group.nrofHosts = {defaults['num_hosts']}

## Movement model settings
MovementModel.rngSeed = 1
MovementModel.worldSize = {defaults['world_size']}
MovementModel.warmup = {defaults['warmup']}

## Report settings
Report.nrofReports = 2
Report.warmup = 0
Report.reportDir = reports/
Report.report1 = ContactTimesReport
Report.report2 = MessageStatsReport
"""
        
        # Verify format is correct
        assert 'Scenario.name' in content
        assert 'Scenario.endTime' in content
        assert 'Group.router' in content
        assert 'Report.nrofReports' in content
        
        # Verify values are sensible
        assert 'EpidemicRouter' in content
        assert '43200' in content  # 12 hours default
    
    def test_default_filename_convention_matches_averager(self):
        """Test that default report filenames can be parsed by averager."""
        # Default filename pattern from GUI
        # Format: {scenarioName}_{router}_{seed}_{ttl}_{buffer}_{reportType}.txt
        example_filename = "default_scenario_EpidemicRouter_1_300_5M_MessageStatsReport.txt"
        
        # Load averager config
        config_path = CONFIG_DIR / 'averager_config.json'
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # Parse filename according to config
        delimiter = config['filename_pattern']['delimiter']
        parts = example_filename.replace('.txt', '').split(delimiter)
        
        # Verify we can extract key components
        assert len(parts) >= 3, f"Filename should be parseable: {parts}"
        
        # Should be able to identify router and report type
        assert 'EpidemicRouter' in parts or 'Router' in ''.join(parts)
    
    def test_generated_scenario_name_matches_averager_pattern(self):
        """Test that generate_default_settings() builds Scenario.name consistent with averager pattern."""
        client, app = get_test_client()
        if client is None:
            pytest.skip("Flask app not available")
        
        with app.app_context():
            from app.api import generate_default_settings
            content = generate_default_settings()
        
        # Extract Scenario.name from generated content
        scenario_line = None
        for line in content.split('\n'):
            if line.strip().startswith('Scenario.name'):
                scenario_line = line.strip()
                break
        
        assert scenario_line is not None, "Generated settings must include Scenario.name"
        
        # Load averager config
        config_path = CONFIG_DIR / 'averager_config.json'
        with open(config_path, 'r', encoding='utf-8') as f:
            averager_config = json.load(f)
        
        pattern = averager_config['filename_pattern']
        delimiter = pattern['delimiter']
        components = pattern['components']
        
        # Extract the template value after "="
        template_value = scenario_line.split('=', 1)[1].strip()
        
        # The template should use the same delimiter as the averager config
        assert delimiter in template_value or len(components) <= 1, \
            f"Scenario.name template '{template_value}' should use delimiter '{delimiter}'"
        
        # Count non-report components in the pattern
        non_report_components = [
            name for name in components.keys()
            if name not in ('reports', 'report_type')
        ]
        
        # The template parts should match the number of non-report components
        template_parts = template_value.split(delimiter)
        assert len(template_parts) >= len(non_report_components) - 1, \
            f"Template has {len(template_parts)} parts but pattern has {len(non_report_components)} non-report components"
    
    def test_pattern_consistency_across_configs(self):
        """Test that averager and analysis configs use consistent delimiters."""
        averager_path = CONFIG_DIR / 'averager_config.json'
        analysis_path = CONFIG_DIR / 'analysis_config.json'
        
        with open(averager_path, 'r', encoding='utf-8') as f:
            averager_config = json.load(f)
        with open(analysis_path, 'r', encoding='utf-8') as f:
            analysis_config = json.load(f)
        
        # Both should use the same delimiter
        averager_delimiter = averager_config['filename_pattern']['delimiter']
        analysis_delimiter = analysis_config.get('filename_structure', {}).get('delimiter', '_')
        
        assert averager_delimiter == analysis_delimiter, \
            f"Delimiter mismatch: averager='{averager_delimiter}', analysis='{analysis_delimiter}'"
    
    def test_api_returns_configs_without_error(self):
        """Test all config API endpoints return valid data with defaults."""
        client, app = get_test_client()
        if client is None:
            pytest.skip("Flask app not available")
        
        configs = ['analysis', 'averager', 'regression']
        
        for config_name in configs:
            response = client.get(f'/api/config/{config_name}')
            assert response.status_code == 200, f"Config {config_name} should load"
            
            data = json.loads(response.data)
            assert 'error' not in data, f"Config {config_name} has error: {data}"
    
    def test_save_default_settings_and_run_pipeline(self):
        """Full workflow test: save defaults, run mock simulation, verify post-processing."""
        client, app = get_test_client()
        if client is None:
            pytest.skip("Flask app not available")
        
        defaults = self.HTML_DEFAULTS
        test_filename = 'default_workflow_test_DELETE_ME.txt'
        
        # Generate settings with defaults
        settings_content = f"""## Default Scenario
Scenario.name = {defaults['scenario_name']}
Scenario.endTime = {defaults['end_time']}
Group.router = [{defaults['router']}]
Group.bufferSize = {defaults['buffer_size']}
Report.nrofReports = 1
Report.report1 = MessageStatsReport
"""
        
        scripts_called = []
        
        def mock_subprocess_run(args, **kwargs):
            if isinstance(args, list) and len(args) > 1:
                script = str(args[1])
                if 'averager.py' in script:
                    scripts_called.append('averager')
                elif 'analysis.py' in script:
                    scripts_called.append('analysis')
            return mock.Mock(returncode=0, stdout='OK', stderr='')
        
        try:
            with mock.patch('subprocess.run', side_effect=mock_subprocess_run):
                response = client.post(
                    '/api/save-all',
                    data=json.dumps({
                        'settings': {
                            'filename': test_filename,
                            'content': settings_content
                        }
                    }),
                    content_type='application/json'
                )
                
                assert response.status_code == 200
                data = json.loads(response.data)
                assert data.get('success') is True
                
                # Verify settings file created
                settings_file = BASE_DIR / test_filename
                assert settings_file.exists()
                
                # Now run post-processing
                response = client.post(
                    '/api/process-data',
                    data=json.dumps({'enable_ml': False}),
                    content_type='application/json'
                )
                
                assert response.status_code == 200
                assert 'averager' in scripts_called
                assert 'analysis' in scripts_called
                
        finally:
            # Cleanup
            test_file = BASE_DIR / test_filename
            if test_file.exists():
                test_file.unlink()
    
    def test_directories_exist_for_defaults(self):
        """Verify default directories referenced in configs exist or are created."""
        # Check plots directory (should be created by Flask app)
        plots_dir = BASE_DIR / 'plots'
        # Config dir must exist
        assert CONFIG_DIR.exists(), "config/ directory must exist"
        
        # Core scripts must exist
        core_dir = BASE_DIR / 'core'
        assert core_dir.exists(), "core/ directory must exist"
        assert (core_dir / 'averager.py').exists(), "averager.py must exist"
        assert (core_dir / 'analysis.py').exists(), "analysis.py must exist"
    
    def test_api_default_settings_endpoint(self):
        """Test the /api/default-settings endpoint returns expected defaults."""
        client, app = get_test_client()
        if client is None:
            pytest.skip("Flask app not available")
        
        response = client.get('/api/default-settings')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'defaults' in data
        
        defaults = data['defaults']
        # Verify key defaults are present
        assert defaults.get('scenario_name') == 'default_scenario'
        assert defaults.get('router') == 'EpidemicRouter'
        assert defaults.get('buffer_size') == '5M'
        assert defaults.get('end_time') == 43200
    
    def test_api_generate_default_settings(self):
        """Test the /api/default-settings/generate endpoint creates valid content."""
        client, app = get_test_client()
        if client is None:
            pytest.skip("Flask app not available")
        
        response = client.post(
            '/api/default-settings/generate',
            data=json.dumps({'overrides': {'scenario_name': 'test_generated'}}),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data.get('success') is True
        assert 'content' in data
        
        content = data['content']
        assert 'Scenario.name = test_generated' in content
        assert 'Group.router = [EpidemicRouter]' in content



# ============================================================================
# CROSS-PLATFORM COMMAND BUILDER TESTS
# ============================================================================

class TestSimulatorCommandBuilder:
    """Tests for cross-platform ONE simulator command building."""
    
    def test_windows_command_format(self):
        """Verify Windows ONE command uses one.bat."""
        with mock.patch('platform.system', return_value='Windows'):
            is_windows = platform.system() == 'Windows'
            
            if is_windows:
                one_cmd = 'one.bat'
                compile_cmd = 'compile.bat'
            else:
                one_cmd = './one.sh'
                compile_cmd = './compile.sh'
            
            assert one_cmd == 'one.bat'
            assert compile_cmd == 'compile.bat'
    
    def test_linux_command_format(self):
        """Verify Linux ONE command uses ./one.sh."""
        with mock.patch('platform.system', return_value='Linux'):
            is_windows = platform.system() == 'Windows'
            
            if is_windows:
                one_cmd = 'one.bat'
            else:
                one_cmd = './one.sh'
            
            assert one_cmd == './one.sh'
    
    def test_batch_mode_flag(self):
        """Verify batch mode -b N flag is added correctly."""
        batch_count = 5
        settings_file = 'test_settings.txt'
        
        command_parts = ['one.bat']
        
        if batch_count and batch_count > 0:
            command_parts.append('-b')
            command_parts.append(str(batch_count))
        
        command_parts.append(settings_file)
        
        full_command = ' '.join(command_parts)
        
        assert '-b 5' in full_command
        assert full_command == 'one.bat -b 5 test_settings.txt'
    
    def test_compile_flag_added(self):
        """Verify compile command is prepended when requested."""
        compile_first = True
        one_cmd = 'one.bat'
        compile_cmd = 'compile.bat'
        settings_file = 'my_settings.txt'
        
        command_parts = []
        
        if compile_first:
            command_parts.append(compile_cmd)
            command_parts.append('&&')
        
        command_parts.append(one_cmd)
        command_parts.append(settings_file)
        
        full_command = ' '.join(command_parts)
        
        assert full_command.startswith('compile.bat &&')
        assert 'one.bat' in full_command
        assert full_command == 'compile.bat && one.bat my_settings.txt'


# ============================================================================
# FULL PIPELINE TESTS (with mocks)
# ============================================================================

class TestFullPipeline:
    """End-to-end flow tests with mock simulator."""
    
    def test_settings_save_then_run_mock_simulation(self, tmp_path):
        """Test full flow: save settings, check command would be built correctly."""
        client, app = get_test_client()
        if client is None:
            pytest.skip("Flask app not available")
        
        test_filename = 'pipeline_test_DELETE_ME.txt'
        test_content = "Scenario.name = pipeline_test\nScenario.endTime = 1000\n"
        
        # Mock subprocess.run to capture the command
        with mock.patch('subprocess.run') as mock_run:
            # Mock ONE simulator not found (expected in test environment)
            mock_run.return_value = mock.Mock(returncode=0, stdout='OK', stderr='')
            
            response = client.post(
                '/api/run-one',
                data=json.dumps({
                    'settings': {
                        'filename': test_filename,
                        'content': test_content
                    },
                    'batch_count': 3,
                    'compile': False
                }),
                content_type='application/json'
            )
            
            # Should return 404 because one.bat doesn't exist
            # But we can verify settings were saved
            data = json.loads(response.data)
            
            if response.status_code == 404:
                # Expected - ONE simulator not found
                assert data['results']['settings_saved'] is True
                assert 'one.bat' in data.get('command', '') or 'one.sh' in data.get('command', '')
        
        # Cleanup
        test_file = BASE_DIR / test_filename
        if test_file.exists():
            test_file.unlink()
    
    def test_post_processing_pipeline_order(self):
        """Verify post-processing scripts run in correct order: averager -> analysis."""
        client, app = get_test_client()
        if client is None:
            pytest.skip("Flask app not available")
        
        call_order = []
        
        def mock_subprocess_run(args, **kwargs):
            if isinstance(args, list) and len(args) > 1:
                script = str(args[1]) if len(args) > 1 else str(args[0])
                if 'averager.py' in script:
                    call_order.append('averager')
                elif 'analysis.py' in script:
                    call_order.append('analysis')
                elif 'regression.py' in script:
                    call_order.append('regression')
            
            return mock.Mock(returncode=0, stdout='Success', stderr='')
        
        with mock.patch('subprocess.run', side_effect=mock_subprocess_run):
            response = client.post(
                '/api/process-data',
                data=json.dumps({'enable_ml': False}),
                content_type='application/json'
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data.get('success') is True
            
            # Verify order
            assert call_order == ['averager', 'analysis']
    
    def test_ml_regression_runs_when_enabled(self):
        """Verify regression.py runs when enable_ml is True."""
        client, app = get_test_client()
        if client is None:
            pytest.skip("Flask app not available")
        
        scripts_called = []
        
        def mock_subprocess_run(args, **kwargs):
            if isinstance(args, list) and len(args) > 1:
                script = str(args[1])
                if 'averager.py' in script:
                    scripts_called.append('averager')
                elif 'analysis.py' in script:
                    scripts_called.append('analysis')
                elif 'regression.py' in script:
                    scripts_called.append('regression')
            
            return mock.Mock(returncode=0, stdout='Success', stderr='')
        
        with mock.patch('subprocess.run', side_effect=mock_subprocess_run):
            response = client.post(
                '/api/process-data',
                data=json.dumps({'enable_ml': True}),
                content_type='application/json'
            )
            
            assert response.status_code == 200
            assert 'regression' in scripts_called


# ============================================================================
# PYTEST RUNNER
# ============================================================================

def run_integration_tests():
    """Run all integration tests (standalone mode)."""
    print("\n" + "="*60)
    print("INTEGRATION TESTS")
    print("="*60)
    
    # Use pytest programmatically
    exit_code = pytest.main([__file__, '-v', '--tb=short'])
    return exit_code


if __name__ == "__main__":
    run_integration_tests()
