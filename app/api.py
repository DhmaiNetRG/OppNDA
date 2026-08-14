"""
REST API Module for OppNDA
==========================

This module provides RESTful API endpoints for the OppNDA GUI application.
It handles configuration management, settings persistence, and execution
of post-processing scripts.

Endpoints Summary:
    Configuration:
        - GET/POST ``/api/config/<name>`` - Read/write config files
        - POST ``/api/save-all`` - Save all configurations
        - POST ``/api/save-settings`` - Save ONE simulator settings
    
    Execution:
        - POST ``/api/run-one`` - Run complete simulation pipeline
        - POST ``/api/run-averager`` - Run report averaging
        - POST ``/api/run-analysis`` - Run visualization generation
        - POST ``/api/run-regression`` - Run ML regression
    
    Streaming (SSE):
        - GET ``/api/stream-averager`` - Stream averager output
        - GET ``/api/stream-analysis`` - Stream analysis output
        - GET ``/api/stream-regression`` - Stream regression output

Example:
    Starting the API server::
    
        from flask import Flask
        from app.api import api_bp
        
        app = Flask(__name__)
        app.register_blueprint(api_bp, url_prefix='/api')
        app.run(port=5001)

Attributes:
    api_bp (Blueprint): Flask Blueprint for API routes.
    CONFIG_FILES (dict): Mapping of config names to filenames.
    DEFAULT_ONE_SETTINGS (dict): Default simulator settings.

Note:
    All endpoints return JSON responses with 'success' and optional 'message' keys.
    Streaming endpoints use Server-Sent Events (SSE) format.
"""

import os
import sys
import json
import copy
import platform
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Tuple, Any
from flask import Blueprint, jsonify, request, current_app, Response
from werkzeug.utils import secure_filename

# Import path utilities
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from core.path_utils import resolve_absolute_path, validate_path

api_bp = Blueprint('api', __name__)

# Track active subprocesses for termination support
_active_processes = {}

# ============================================================================
# CONSTANTS
# ============================================================================
CONFIG_FILES = {
    'analysis': 'analysis_config.json',
    'averager': 'averager_config.json',
    'regression': 'regression_config.json',
    'gui_options': 'gui_options.json'
}

DEFAULT_SCENARIO_NAME = 'default_scenario'
DEFAULT_UPDATE_INTERVAL = 0.1  # seconds
DEFAULT_END_TIME = 43200  # 12 hours in seconds
DEFAULT_BATCH_COUNT = 0
DEFAULT_SETTINGS_FILE = 'default_settings.txt'
DEFAULT_COMPILE_FIRST = False

# ============================================================================
# DEFAULT SETTINGS - Enable new users to run simulations immediately
# ============================================================================

DEFAULT_ONE_SETTINGS = {
    # Scenario
    'scenario_name': 'default_scenario',
    'simulate_connections': True,
    'update_interval': 0.1,
    'end_time': 43200,  # 12 hours
    
    # Interface
    'interface_name': 'btInterface',
    'interface_type': 'SimpleBroadcastInterface',
    'transmit_speed': '250k',
    'transmit_range': 10,
    
    # Group/Node
    'movement_model': 'ShortestPathMapBasedMovement',
    'router': 'EpidemicRouter',
    'buffer_size': '5M',
    'wait_time': '0, 120',
    'speed': '0.5, 1.5',
    'msg_ttl': 300,
    'num_hosts': 40,
    
    # Movement
    'rng_seed': '[1;5]',
    'world_size': '4500, 3400',
    'warmup': 1000,
    
    # Reports
    'report_warmup': 0,
    'report_dir': 'reports/',
    'default_reports': ['MessageStatsReport', 'ContactTimesReport'],
    
    # Map files
    'map_files': ['roads.wkt', 'main_roads.wkt', 'pedestrian_paths.wkt', 'shops.wkt'],
    
    # Router-specific
    'prophet_time_unit': 30,
    'spray_copies': 6,
    'spray_binary_mode': True,
    
    # Optimization
    'cell_size_mult': 5,
    'randomize_update_order': True,
}


def generate_default_settings(overrides: Optional[Dict[str, Any]] = None) -> str:
    """Generate a complete ONE simulator settings file content with sensible defaults.
    
    Args:
        overrides: Dict of values to override defaults (e.g., {'scenario_name': 'my_sim'})
    
    Returns:
        Complete ONE settings file content ready to save
    """
    config = DEFAULT_ONE_SETTINGS.copy()
    if overrides:
        config.update(overrides)
    
    # Generate timestamp for unique scenario names
    scenario_name = config.get('scenario_name', DEFAULT_SCENARIO_NAME)
    
    # Build Scenario.name from the filename_pattern in averager config
    # This ensures the simulator output filenames match what the averager expects
    try:
        gui_opts = _load_gui_options()
        placeholders = gui_opts.get('one_placeholders', {})
    except Exception:
        placeholders = {}
    
    try:
        averager_cfg = _load_averager_config()
        pattern = averager_cfg.get('filename_pattern', {})
        pattern_delimiter = pattern.get('delimiter', '_')
        components = pattern.get('components', {})
    except Exception:
        pattern_delimiter = '_'
        components = {}
    
    if components:
        # Sort components by position to get the correct order
        ordered = sorted(components.items(), key=lambda x: x[1])
        parts = []
        for name, _ in ordered:
            if name in ('scenario', 'scenario_name'):
                parts.append(scenario_name)
            elif name in ('reports', 'report_type'):
                # Report type is auto-appended by ONE simulator — skip
                continue
            elif name in placeholders:
                parts.append(placeholders[name])
            else:
                # Unknown component — include as literal text
                parts.append(name)
        scenario_name_template = pattern_delimiter.join(parts) if parts else scenario_name
    elif placeholders:
        # Fallback: use placeholders in their dict order
        placeholder_parts = [f'{p}' for p in placeholders.values()]
        scenario_name_template = scenario_name + '_' + '_'.join(placeholder_parts)
    else:
        # Last resort fallback
        scenario_name_template = f"{scenario_name}_%%Group.router%%_%%MovementModel.rngSeed%%"
    
    content = f"""#
# OppNDA Default Simulation Settings
# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
#

## Scenario settings
Scenario.name = {scenario_name_template}
Scenario.simulateConnections = {'true' if config['simulate_connections'] else 'false'}
Scenario.updateInterval = {config['update_interval']}
Scenario.endTime = {config['end_time']}

## Interface settings
{config['interface_name']}.type = {config['interface_type']}
{config['interface_name']}.transmitSpeed = {config['transmit_speed']}
{config['interface_name']}.transmitRange = {config['transmit_range']}

Scenario.nrofHostGroups = 1

## Common settings for all groups
Group.movementModel = {config['movement_model']}
Group.router = [{config['router']}]
Group.bufferSize = {config['buffer_size']}
Group.waitTime = {config['wait_time']}
Group.nrofInterfaces = 1
Group.interface1 = {config['interface_name']}
Group.speed = {config['speed']}
Group.msgTtl = {config['msg_ttl']}
Group.nrofHosts = {config['num_hosts']}

## Group 1 settings
Group1.groupID = p
Group1.nrofHosts = {config['num_hosts']}

## Event settings
Events.nrof = 1
Events1.class = MessageEventGenerator
Events1.interval = 25, 35
Events1.size = 500k, 1M
Events1.hosts = 0, {config['num_hosts'] - 1}
Events1.prefix = M

## Movement model settings
MovementModel.rngSeed = {config['rng_seed']}
MovementModel.worldSize = {config['world_size']}
MovementModel.warmup = {config['warmup']}

## Map based movement settings
MapBasedMovement.nrofMapFiles = {len(config['map_files'])}
"""
    
    for i, map_file in enumerate(config['map_files'], 1):
        content += f"MapBasedMovement.mapFile{i} = data/{map_file}\n"
    
    content += f"""
## Report settings
Report.nrofReports = {len(config['default_reports'])}
Report.warmup = {config['report_warmup']}
Report.reportDir = {config['report_dir']}
"""
    
    for i, report in enumerate(config['default_reports'], 1):
        content += f"Report.report{i} = {report}\n"
    
    content += f"""
## Router settings
ProphetRouter.secondsInTimeUnit = {config['prophet_time_unit']}
SprayAndWaitRouter.nrofCopies = {config['spray_copies']}
SprayAndWaitRouter.binaryMode = {'true' if config['spray_binary_mode'] else 'false'}

## Optimization settings
Optimization.cellSizeMult = {config['cell_size_mult']}
Optimization.randomizeUpdateOrder = {'true' if config['randomize_update_order'] else 'false'}

## GUI settings
GUI.UnderlayImage.fileName = data/helsinki_underlay.png
GUI.UnderlayImage.offset = 64, 20
GUI.UnderlayImage.scale = 4.75
GUI.UnderlayImage.rotate = -0.015
GUI.EventLogPanel.nrofEvents = 100
"""
    
    return content


def get_config_path(config_name: str) -> Path:
    """Get the cross-platform path to a config file.
    
    Args:
        config_name: Name of the configuration
        
    Returns:
        Path object pointing to the configuration file
    """
    config_dir = current_app.config['CONFIG_DIR']
    return config_dir / CONFIG_FILES.get(config_name, '')


def _load_gui_options():
    """Load gui_options.json from the config directory.
    
    Returns:
        dict: The GUI options config, or empty dict if not found.
    """
    try:
        config_dir = current_app.config['CONFIG_DIR']
        gui_options_path = config_dir / CONFIG_FILES.get('gui_options', 'gui_options.json')
        if gui_options_path.exists():
            with open(gui_options_path, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception:
        pass
    return {}


def _load_averager_config():
    """Load averager_config.json from the config directory.
    
    Returns:
        dict: The averager config, or empty dict if not found.
    """
    try:
        config_dir = current_app.config['CONFIG_DIR']
        averager_path = config_dir / CONFIG_FILES.get('averager', 'averager_config.json')
        if averager_path.exists():
            with open(averager_path, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception:
        pass
    return {}


@api_bp.route('/gui-options', methods=['GET'])
def get_gui_options():
    """Return the centralized GUI options config.
    
    The frontend uses this to populate dropdowns, Tagify whitelists,
    and other dynamic UI elements instead of hardcoding them.
    """
    options = _load_gui_options()
    if not options:
        return jsonify({'error': 'gui_options.json not found'}), 404
    return jsonify(options)


# ============================================================================
# DEFAULT SETTINGS API ENDPOINTS
# ============================================================================

@api_bp.route('/default-settings', methods=['GET'])
def get_default_settings() -> Tuple[Dict[str, Any], int]:
    """Return the default ONE simulator settings as JSON.
    
    New users can use this to understand what defaults will be used.
    
    Returns:
        JSON response with defaults and message
    """
    return jsonify({
        'defaults': DEFAULT_ONE_SETTINGS,
        'message': 'These defaults will be used if not overridden'
    })


@api_bp.route('/default-settings/generate', methods=['POST'])
def generate_default_settings_endpoint() -> Tuple[Dict[str, Any], int]:
    """Generate a default ONE settings file with optional overrides.
    
    Request body:
        {
            "overrides": {"scenario_name": "my_sim", "router": "ProphetRouter"},
            "save": true,
            "filename": "my_settings.txt"
        }
    
    Returns:
        Settings content and optionally saves to file
    """
    try:
        data = request.get_json() or {}
        overrides = data.get('overrides', {})
        should_save = data.get('save', False)
        filename = data.get('filename', DEFAULT_SETTINGS_FILE)
        
        # Generate settings content
        content = generate_default_settings(overrides)
        
        result = {
            'success': True,
            'content': content
        }
        
        # Optionally save to file
        if should_save:
            base_dir = current_app.config['BASE_DIR']
            filename = Path(filename).name
            if not filename.endswith('.txt'):
                filename += '.txt'
            
            settings_path = base_dir / filename
            with open(settings_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            result['saved'] = True
            result['path'] = str(settings_path)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500



@api_bp.route('/config/<config_name>', methods=['GET'])
def get_config(config_name):
    """Read a configuration file and return its contents."""
    if config_name not in CONFIG_FILES:
        return jsonify({'error': f'Unknown config: {config_name}'}), 404
    
    config_path = get_config_path(config_name)
    
    if not config_path.exists():
        return jsonify({'error': f'Config file not found: {config_path}'}), 404
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
        return jsonify(config_data)
    except json.JSONDecodeError as e:
        return jsonify({'error': f'Invalid JSON: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/config/<config_name>', methods=['POST'])
def update_config(config_name):
    """Update a configuration file with new data.
    
    Uses deep_merge to preserve fields not sent from the UI.
    """
    if config_name not in CONFIG_FILES:
        return jsonify({'error': f'Unknown config: {config_name}'}), 404
    
    config_path = get_config_path(config_name)
    
    try:
        new_config = request.get_json()
        if new_config is None:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Load existing config first for merge
        existing_config = {}
        if config_path.exists():
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    existing_config = json.load(f)
            except json.JSONDecodeError:
                existing_config = {}
            
            # Create backup before writing
            backup_path = config_path.with_suffix('.json.backup')
            backup_path.write_text(config_path.read_text(encoding='utf-8'), encoding='utf-8')
        
        # Deep merge: preserve fields not in the incoming update
        merged_config = deep_merge(existing_config, new_config)
        
        # Write merged config
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(merged_config, f, indent=2)
        
        return jsonify({'success': True, 'message': f'{config_name} config updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/config/<config_name>/field', methods=['POST'])
def update_config_field(config_name):
    """Update a specific field in a configuration file."""
    if config_name not in CONFIG_FILES:
        return jsonify({'error': f'Unknown config: {config_name}'}), 404
    
    config_path = get_config_path(config_name)
    
    try:
        data = request.get_json()
        field_path = data.get('path')
        value = data.get('value')
        
        if field_path is None:
            return jsonify({'error': 'Missing field path'}), 400
        
        # Load existing config
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # Navigate to the field and update
        keys = field_path.split('.')
        target = config
        for key in keys[:-1]:
            if key not in target:
                target[key] = {}
            target = target[key]
        target[keys[-1]] = value
        
        # Save updated config
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)
        
        return jsonify({'success': True, 'message': f'Updated {field_path}'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/run-one', methods=['POST'])
def run_one_simulator():
    """Complete simulation pipeline: Save config -> Run ONE -> Post-processing.
    
    This endpoint handles the entire workflow:
    1. Saves simulation settings file (.txt)
    2. Saves post-processing configs (JSON)
    3. Detects OS and builds appropriate command
    4. Runs ONE simulator with correct settings file and batch count
    5. Auto-triggers post-processing when simulation completes
    """
    try:
        data = request.get_json() or {}
        
        base_dir = current_app.config['BASE_DIR']
        config_dir = current_app.config['CONFIG_DIR']
        core_dir = current_app.config['CORE_DIR']
        
        results = {
            'settings_saved': False,
            'configs_saved': [],
            'simulation': None,
            'post_processing': []
        }
        
        # ============================================================
        # STEP 1: Save simulation settings file
        # ============================================================
        settings_filename = None
        if 'settings' in data:
            settings = data['settings']
            filename = settings.get('filename', 'default_settings.txt')
            content = settings.get('content', '')
            
            # Sanitize filename
            filename = Path(filename).name
            if not filename.endswith('.txt'):
                filename += '.txt'
            
            settings_path = base_dir / filename
            with open(settings_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            settings_filename = filename
            results['settings_saved'] = True
            results['settings_file'] = str(settings_path)
        
        # ============================================================
        # STEP 2: Save post-processing configs
        # ============================================================
        for config_name in ['analysis', 'averager', 'regression']:
            if config_name in data:
                config_path = config_dir / CONFIG_FILES[config_name]
                
                # Load existing config for merge
                existing_config = {}
                if config_path.exists():
                    try:
                        with open(config_path, 'r', encoding='utf-8') as f:
                            existing_config = json.load(f)
                    except json.JSONDecodeError:
                        existing_config = {}
                    
                    # Create backup
                    backup_path = config_path.with_suffix('.json.backup')
                    backup_path.write_text(config_path.read_text(encoding='utf-8'), encoding='utf-8')
                
                # Deep merge
                merged_config = deep_merge(existing_config, data[config_name])
                
                with open(config_path, 'w', encoding='utf-8') as f:
                    json.dump(merged_config, f, indent=2)
                
                results['configs_saved'].append(config_name)
        
        # ============================================================
        # STEP 3: Build ONE simulator command
        # ============================================================
        batch_count = data.get('batch_count', 0)
        compile_first = data.get('compile', False)
        enable_ml = data.get('enable_ml', False)
        
        # Detect OS
        is_windows = platform.system() == 'Windows'
        
        if is_windows:
            one_cmd = 'one.bat'
            compile_cmd = 'compile.bat'
            shell_needed = True
        else:
            one_cmd = './one.sh'
            compile_cmd = './compile.sh'
            shell_needed = True
        
        # Build command with settings file
        command_parts = []
        
        # Add compile step if requested
        if compile_first:
            command_parts.append(compile_cmd)
            command_parts.append('&&')
        
        # Add ONE command
        command_parts.append(one_cmd)
        
        # Add batch mode if batch_count > 0
        if batch_count and batch_count > 0:
            command_parts.append('-b')
            command_parts.append(str(batch_count))
        
        # Add settings file
        if settings_filename:
            command_parts.append(settings_filename)
        
        full_command = ' '.join(command_parts)
        
        # ============================================================
        # STEP 4: Return streaming response for ONE simulator
        # ============================================================
        # Check if ONE exists
        one_path = base_dir / (one_cmd.replace('./', ''))
        if not one_path.exists():
            return jsonify({
                'success': False,
                'message': f'ONE simulator not found: {one_path}',
                'results': results,
                'command': full_command
            }), 404
        
        # Store the results for the streaming generator
        save_results = {
            'settings_file': results.get('settings_file'),
            'configs_saved': results['configs_saved'],
            'command': full_command,
            'batch_count': batch_count,
            'enable_ml': enable_ml,
            'core_dir': core_dir,
            'base_dir': base_dir
        }
        
        def generate_simulation_stream():
            """Generator that yields SSE events for the simulation."""
            import time
            
            # Helper function to create SSE data line
            def sse_event(event_type, message, level=None, success=None):
                data = {'type': event_type, 'message': message}
                if level is not None:
                    data['level'] = level
                if success is not None:
                    data['success'] = success
                return f"data: {json.dumps(data)}\n\n"
            
            # First, send the save results
            settings_file = save_results['settings_file']
            yield sse_event('info', f'Settings saved: {settings_file}')
            
            if save_results['configs_saved']:
                configs = ', '.join(save_results['configs_saved'])
                yield sse_event('info', f'Configs saved: {configs}')
            
            yield sse_event('step', 'Starting ONE simulator...')
            yield sse_event('info', f"Command: {save_results['command']}")
            
            batch_count = save_results['batch_count']
            if batch_count > 0:
                yield sse_event('info', f'Batch mode: {batch_count} simulations')
            
            sim_success = False
            try:
                # Start simulation with streaming output
                process = subprocess.Popen(
                    full_command,
                    shell=shell_needed,
                    cwd=str(base_dir),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                    universal_newlines=True
                )
                
                # Track process for termination support
                _active_processes['simulation'] = process
                
                # Track progress
                sim_count = 0
                start_time = time.time()
                
                # Stream each line as it's produced
                for line in iter(process.stdout.readline, ''):
                    if line:
                        line = line.rstrip('\n\r')
                        
                        # Detect simulation completion
                        if 'Simulation done' in line or 'Starting batch' in line:
                            sim_count += 1
                            if batch_count > 0:
                                line = f"[{sim_count}/{batch_count}] {line}"
                        
                        # Determine log type based on content
                        log_level = 'info'
                        if 'error' in line.lower() or 'exception' in line.lower():
                            log_level = 'error'
                        elif 'warning' in line.lower():
                            log_level = 'warning'
                        elif 'done' in line.lower() or 'completed' in line.lower() or 'finished' in line.lower():
                            log_level = 'success'
                        elif 'starting' in line.lower() or 'running' in line.lower():
                            log_level = 'step'
                        
                        yield sse_event('log', line, level=log_level)
                
                process.stdout.close()
                return_code = process.wait()
                
                # Clean up process tracking
                _active_processes.pop('simulation', None)
                
                elapsed = time.time() - start_time
                if elapsed > 60:
                    elapsed_str = f"{elapsed/60:.1f} minutes"
                else:
                    elapsed_str = f"{elapsed:.1f} seconds"
                
                if return_code == 0:
                    yield sse_event('complete', f'Simulation completed in {elapsed_str}', success=True)
                    sim_success = True
                else:
                    yield sse_event('complete', f'Simulation failed with exit code {return_code}', success=False)
                    
            except Exception as e:
                _active_processes.pop('simulation', None)
                yield sse_event('error', str(e))
            
            # ============================================================
            # STEP 5: Run post-processing pipeline after simulation
            # ============================================================
            if sim_success:
                pp_core_dir = save_results['core_dir']
                pp_base_dir = save_results['base_dir']
                pp_enable_ml = save_results['enable_ml']
                
                # Build post-processing steps from gui_options config
                gui_opts = _load_gui_options()
                pipeline_config = gui_opts.get('pipeline_steps', [])
                
                pp_steps = []
                if pipeline_config:
                    for i, step_cfg in enumerate(pipeline_config, 1):
                        if not step_cfg.get('enabled', True):
                            continue
                        if step_cfg.get('requires_ml', False) and not pp_enable_ml:
                            continue
                        step_name = step_cfg['name']
                        step_script = pp_core_dir / step_cfg['script']
                        step_label = step_cfg.get('label', f'Step {i}: {step_name}')
                        pp_steps.append((step_name, step_script, step_label))
                else:
                    # Fallback: hardcoded default pipeline
                    pp_steps = [
                        ('averager', pp_core_dir / 'averager.py', '📊 Step 1: Data Averaging'),
                        ('analysis', pp_core_dir / 'analysis.py', '📈 Step 2: Data Analysis'),
                    ]
                    if pp_enable_ml:
                        pp_steps.append(
                            ('regression', pp_core_dir / 'regression.py', '🤖 Step 3: Regression Models')
                        )
                
                yield sse_event('step', '🔄 Starting OppNDA Post-Processing Pipeline...')
                
                all_pp_success = True
                for step_name, script_path, label in pp_steps:
                    if not script_path.exists():
                        yield sse_event('log', f'{step_name}.py not found, skipping', level='warning')
                        continue
                    
                    yield sse_event('step', label)
                    
                    try:
                        pp_process = subprocess.Popen(
                            [sys.executable, '-u', str(script_path)],
                            cwd=str(pp_base_dir),
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            text=True,
                            bufsize=1,
                            universal_newlines=True
                        )
                        
                        # Track for termination
                        _active_processes['post_processing'] = pp_process
                        
                        for pp_line in iter(pp_process.stdout.readline, ''):
                            if pp_line:
                                pp_line = pp_line.rstrip('\n\r')
                                pp_level = 'info'
                                if 'error' in pp_line.lower() or 'exception' in pp_line.lower():
                                    pp_level = 'error'
                                elif 'warning' in pp_line.lower():
                                    pp_level = 'warning'
                                elif 'success' in pp_line.lower() or 'completed' in pp_line.lower():
                                    pp_level = 'success'
                                elif 'processing' in pp_line.lower() or 'starting' in pp_line.lower():
                                    pp_level = 'step'
                                yield sse_event('log', pp_line, level=pp_level)
                        
                        pp_process.stdout.close()
                        pp_rc = pp_process.wait()
                        _active_processes.pop('post_processing', None)
                        
                        if pp_rc == 0:
                            yield sse_event('log', f'{step_name} completed successfully', level='success')
                        else:
                            yield sse_event('log', f'{step_name} failed with exit code {pp_rc}', level='error')
                            all_pp_success = False
                    
                    except Exception as pp_e:
                        _active_processes.pop('post_processing', None)
                        yield sse_event('log', f'{step_name} error: {str(pp_e)}', level='error')
                        all_pp_success = False
                
                if all_pp_success:
                    yield sse_event('complete', '🎉 Full pipeline completed: Simulation + Post-Processing', success=True)
                else:
                    yield sse_event('complete', 'Pipeline completed with post-processing errors', success=False)
            
            yield 'data: {"type": "end"}\n\n'
        
        return Response(
            generate_simulation_stream(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            }
        )
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500


@api_bp.route('/terminate', methods=['POST'])
def terminate_process():
    """Terminate a running simulation or post-processing subprocess.
    
    Request JSON:
        - target: (optional) 'simulation', 'post_processing', or 'all' (default: 'all')
    
    Returns:
        { 'success': bool, 'message': str, 'terminated': list }
    """
    try:
        data = request.get_json() or {}
        target = data.get('target', 'all')
        terminated = []
        
        targets_to_kill = []
        if target == 'all':
            targets_to_kill = list(_active_processes.keys())
        elif target in _active_processes:
            targets_to_kill = [target]
        
        for proc_name in targets_to_kill:
            process = _active_processes.get(proc_name)
            if process and process.poll() is None:  # Still running
                try:
                    # On Windows, use taskkill to terminate the entire process tree
                    if platform.system() == 'Windows':
                        subprocess.run(
                            ['taskkill', '/F', '/T', '/PID', str(process.pid)],
                            capture_output=True
                        )
                    else:
                        import signal
                        os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                    terminated.append(proc_name)
                except Exception as e:
                    # Fallback: direct kill
                    try:
                        process.kill()
                        terminated.append(proc_name)
                    except Exception:
                        pass
                finally:
                    _active_processes.pop(proc_name, None)
        
        if terminated:
            return jsonify({
                'success': True,
                'message': f'Terminated: {", ".join(terminated)}',
                'terminated': terminated
            })
        else:
            return jsonify({
                'success': True,
                'message': 'No active processes to terminate',
                'terminated': []
            })
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@api_bp.route('/run', methods=['POST'])
def run_analysis():
    """Execute analysis scripts (cross-platform compatible)."""
    try:
        data = request.get_json() or {}
        command = data.get('command')
        
        base_dir = current_app.config['BASE_DIR']
        core_dir = current_app.config['CORE_DIR']
        config_dir = current_app.config['CONFIG_DIR']
        
        # Run report averaging (cross-platform) - auto-resolves config
        averager_script = core_dir / 'averager.py'
        subprocess.Popen(
            [sys.executable, str(averager_script)],
            cwd=str(base_dir)
        )
        
        # Run analysis (cross-platform)
        analysis_script = core_dir / 'analysis.py'
        subprocess.Popen(
            [sys.executable, str(analysis_script)],
            cwd=str(base_dir)
        )
        
        # Run additional command if provided
        if command:
            subprocess.run(command, shell=True, check=True, cwd=str(base_dir))
        
        return jsonify({'message': 'Analysis scripts started successfully'})
    except subprocess.CalledProcessError as e:
        return jsonify({'message': f'Error executing command: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@api_bp.route('/process-data', methods=['POST'])
def process_data():
    """Execute post-processing pipeline: averager -> analysis -> regression (optional)."""
    try:
        data = request.get_json() or {}
        enable_ml = data.get('enable_ml', False)
        
        base_dir = current_app.config['BASE_DIR']
        core_dir = current_app.config['CORE_DIR']
        
        results = []
        
        # Step 1: Run averager.py
        averager_script = core_dir / 'averager.py'
        if averager_script.exists():
            result = subprocess.run(
                [sys.executable, str(averager_script)],
                cwd=str(base_dir),
                capture_output=True,
                text=True
            )
            results.append({
                'script': 'averager.py',
                'success': result.returncode == 0,
                'output': result.stdout if result.returncode == 0 else result.stderr
            })
            if result.returncode != 0:
                return jsonify({
                    'success': False,
                    'message': 'Report averaging failed',
                    'results': results
                }), 500
        else:
            results.append({'script': 'averager.py', 'success': False, 'output': 'Script not found'})
        
        # Step 2: Run analysis.py
        analysis_script = core_dir / 'analysis.py'
        if analysis_script.exists():
            result = subprocess.run(
                [sys.executable, str(analysis_script)],
                cwd=str(base_dir),
                capture_output=True,
                text=True
            )
            results.append({
                'script': 'analysis.py',
                'success': result.returncode == 0,
                'output': result.stdout if result.returncode == 0 else result.stderr
            })
            if result.returncode != 0:
                return jsonify({
                    'success': False,
                    'message': 'Analysis failed',
                    'results': results
                }), 500
        else:
            results.append({'script': 'analysis.py', 'success': False, 'output': 'Script not found'})
        
        # Step 3: Run regression.py (if ML enabled)
        if enable_ml:
            regression_script = core_dir / 'regression.py'
            if regression_script.exists():
                result = subprocess.run(
                    [sys.executable, str(regression_script)],
                    cwd=str(base_dir),
                    capture_output=True,
                    text=True
                )
                results.append({
                    'script': 'regression.py',
                    'success': result.returncode == 0,
                    'output': result.stdout if result.returncode == 0 else result.stderr
                })
                if result.returncode != 0:
                    return jsonify({
                        'success': False,
                        'message': 'Regression analysis failed',
                        'results': results
                    }), 500
            else:
                results.append({'script': 'regression.py', 'success': False, 'output': 'Script not found'})
        
        return jsonify({
            'success': True,
            'message': 'Data processing completed successfully',
            'results': results
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500


@api_bp.route('/save-settings', methods=['POST'])
def save_settings():
    """Save simulation settings to a .txt file in the project directory."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        filename = data.get('filename', 'default_settings.txt')
        content = data.get('content', '')
        
        # Sanitize filename (remove path components for security)
        filename = Path(filename).name
        if not filename.endswith('.txt'):
            filename += '.txt'
        
        # Save to project root
        base_dir = current_app.config['BASE_DIR']
        settings_path = base_dir / filename
        
        # Write the settings file
        with open(settings_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return jsonify({
            'success': True, 
            'message': f'Settings saved to {filename}',
            'path': str(settings_path)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/save-all', methods=['POST'])
def save_all_settings():
    """Save both simulation settings (.txt) and all post-processing configs (JSON).
    
    IMPORTANT: This function MERGES incoming config with existing config,
    preserving any fields not exposed in the UI (like plot_settings).
    """
    results = {
        'settings_file': None,
        'configs': {}
    }
    errors = []
    
    try:
        data = request.get_json() or {}
        base_dir = current_app.config['BASE_DIR']
        config_dir = current_app.config['CONFIG_DIR']
        
        # 1. Save simulation settings file
        if 'settings' in data:
            filename = data['settings'].get('filename', 'default_settings.txt')
            content = data['settings'].get('content', '')
            
            filename = Path(filename).name
            if not filename.endswith('.txt'):
                filename += '.txt'
            
            settings_path = base_dir / filename
            with open(settings_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            results['settings_file'] = str(settings_path)
        
        # 2. Save each config file - MERGE with existing config to preserve non-UI fields
        for config_name in ['analysis', 'averager', 'regression']:
            if config_name in data:
                config_path = config_dir / CONFIG_FILES[config_name]
                
                # Load existing config first
                existing_config = {}
                if config_path.exists():
                    try:
                        with open(config_path, 'r', encoding='utf-8') as f:
                            existing_config = json.load(f)
                    except json.JSONDecodeError:
                        existing_config = {}
                    
                    # Create backup
                    backup_path = config_path.with_suffix('.json.backup')
                    backup_path.write_text(config_path.read_text(encoding='utf-8'), encoding='utf-8')
                
                # Deep merge: update existing with new values, preserving unexposed fields
                merged_config = deep_merge(existing_config, data[config_name])
                
                # Save merged config
                with open(config_path, 'w', encoding='utf-8') as f:
                    json.dump(merged_config, f, indent=2)
                
                results['configs'][config_name] = str(config_path)
        
        if errors:
            return jsonify({'success': False, 'errors': errors, 'results': results}), 500
        
        return jsonify({
            'success': True,
            'message': 'All settings saved successfully',
            'results': results
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# INDIVIDUAL POST-PROCESSING ENDPOINTS
# ============================================================================

@api_bp.route('/run-averager', methods=['POST'])
def run_averager_only():
    """Run only the report averager script."""
    try:
        base_dir = current_app.config['BASE_DIR']
        core_dir = current_app.config['CORE_DIR']
        
        averager_script = core_dir / 'averager.py'
        if not averager_script.exists():
            return jsonify({
                'success': False,
                'message': 'averager.py not found'
            }), 404
        
        result = subprocess.run(
            [sys.executable, str(averager_script)],
            cwd=str(base_dir),
            capture_output=True,
            text=True
        )
        
        return jsonify({
            'success': result.returncode == 0,
            'message': 'Report averaging completed' if result.returncode == 0 else 'Report averaging failed',
            'output': result.stdout if result.returncode == 0 else result.stderr
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500


@api_bp.route('/run-analysis', methods=['POST'])
def run_analysis_only():
    """Run only the analysis/visualization script."""
    try:
        base_dir = current_app.config['BASE_DIR']
        core_dir = current_app.config['CORE_DIR']
        
        analysis_script = core_dir / 'analysis.py'
        if not analysis_script.exists():
            return jsonify({
                'success': False,
                'message': 'analysis.py not found'
            }), 404
        
        result = subprocess.run(
            [sys.executable, str(analysis_script)],
            cwd=str(base_dir),
            capture_output=True,
            text=True
        )
        
        return jsonify({
            'success': result.returncode == 0,
            'message': 'Analysis completed' if result.returncode == 0 else 'Analysis failed',
            'output': result.stdout if result.returncode == 0 else result.stderr
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500


@api_bp.route('/run-regression', methods=['POST'])
def run_regression_only():
    """Run only the ML regression script."""
    try:
        base_dir = current_app.config['BASE_DIR']
        core_dir = current_app.config['CORE_DIR']
        
        regression_script = core_dir / 'regression.py'
        if not regression_script.exists():
            return jsonify({
                'success': False,
                'message': 'regression.py not found'
            }), 404
        
        result = subprocess.run(
            [sys.executable, str(regression_script)],
            cwd=str(base_dir),
            capture_output=True,
            text=True
        )
        
        return jsonify({
            'success': result.returncode == 0,
            'message': 'Regression analysis completed' if result.returncode == 0 else 'Regression failed',
            'output': result.stdout if result.returncode == 0 else result.stderr
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500


# ============================================================================
# REAL-TIME STREAMING ENDPOINTS (Server-Sent Events)
# ============================================================================

def stream_subprocess(command, cwd):
    """Generator that yields SSE events from subprocess output line by line."""
    import time
    
    yield f"data: {json.dumps({'type': 'start', 'message': f'Starting: {command}'})}\n\n"
    
    try:
        # Start process with line-buffered output
        process = subprocess.Popen(
            command,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,  # Line buffered
            universal_newlines=True
        )
        
        # Track process for termination support
        _active_processes['post_processing'] = process
        
        # Stream each line as it's produced
        for line in iter(process.stdout.readline, ''):
            if line:
                line = line.rstrip('\n\r')
                # Determine log type based on content
                log_type = 'info'
                if 'error' in line.lower() or 'exception' in line.lower() or 'traceback' in line.lower():
                    log_type = 'error'
                elif 'warning' in line.lower() or 'warn' in line.lower():
                    log_type = 'warning'
                elif 'success' in line.lower() or 'completed' in line.lower() or '✓' in line:
                    log_type = 'success'
                elif 'processing' in line.lower() or 'running' in line.lower() or 'starting' in line.lower():
                    log_type = 'step'
                
                yield f"data: {json.dumps({'type': 'log', 'level': log_type, 'message': line})}\n\n"
        
        process.stdout.close()
        return_code = process.wait()
        _active_processes.pop('post_processing', None)
        
        if return_code == 0:
            yield f"data: {json.dumps({'type': 'complete', 'success': True, 'message': 'Process completed successfully'})}\n\n"
        else:
            yield f"data: {json.dumps({'type': 'complete', 'success': False, 'message': f'Process exited with code {return_code}'})}\n\n"
            
    except Exception as e:
        _active_processes.pop('post_processing', None)
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    yield "data: {\"type\": \"end\"}\n\n"


@api_bp.route('/stream-averager', methods=['GET'])
def stream_averager():
    """Stream averager output in real-time using SSE."""
    base_dir = current_app.config['BASE_DIR']
    core_dir = current_app.config['CORE_DIR']
    
    averager_script = core_dir / 'averager.py'
    if not averager_script.exists():
        return jsonify({'success': False, 'message': 'averager.py not found'}), 404
    
    command = [sys.executable, '-u', str(averager_script)]  # -u for unbuffered
    
    return Response(
        stream_subprocess(command, str(base_dir)),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    )


@api_bp.route('/stream-analysis', methods=['GET'])
def stream_analysis():
    """Stream analysis output in real-time using SSE."""
    base_dir = current_app.config['BASE_DIR']
    core_dir = current_app.config['CORE_DIR']
    
    analysis_script = core_dir / 'analysis.py'
    if not analysis_script.exists():
        return jsonify({'success': False, 'message': 'analysis.py not found'}), 404
    
    command = [sys.executable, '-u', str(analysis_script)]  # -u for unbuffered
    
    return Response(
        stream_subprocess(command, str(base_dir)),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    )


@api_bp.route('/stream-regression', methods=['GET'])
def stream_regression():
    """Stream regression output in real-time using SSE."""
    base_dir = current_app.config['BASE_DIR']
    core_dir = current_app.config['CORE_DIR']
    
    regression_script = core_dir / 'regression.py'
    if not regression_script.exists():
        return jsonify({'success': False, 'message': 'regression.py not found'}), 404
    
    command = [sys.executable, '-u', str(regression_script)]  # -u for unbuffered
    
    return Response(
        stream_subprocess(command, str(base_dir)),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    )


def deep_merge(base: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
    """Deep merge updates into base dict, preserving non-updated nested fields.
    
    This ensures fields not exposed in the UI (like plot_settings) are preserved
    when saving config changes from the GUI.
    
    Args:
        base: Base configuration dictionary
        updates: Updates to apply to base
        
    Returns:
        Merged configuration dictionary
    """
    result = copy.deepcopy(base)  # Deep copy to preserve all nested structures
    
    for key, value in updates.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            # Recursively merge nested dicts
            result[key] = deep_merge(result[key], value)
        else:
            # Overwrite with new value (including lists, primitives, etc.)
            result[key] = value
    
    return result


@api_bp.route('/upload-data-files', methods=['POST'])
def upload_data_files():
    """Upload map/route/overlay assets into the project's data directory."""
    try:
        data_dir = current_app.config.get('DATA_DIR')
        if not data_dir:
            return jsonify({
                'success': False,
                'error': 'Data directory not configured'
            }), 500

        data_dir = Path(data_dir)
        data_dir.mkdir(exist_ok=True)

        uploaded_files = []
        seen_names = set()

        for storage in request.files.getlist('files'):
            if not storage or not storage.filename:
                continue

            safe_name = secure_filename(Path(storage.filename).name)
            if not safe_name or safe_name in seen_names:
                continue

            target_path = data_dir / safe_name
            storage.save(target_path)
            uploaded_files.append({
                'name': safe_name,
                'relative_path': f'data/{safe_name}',
                'absolute_path': str(target_path)
            })
            seen_names.add(safe_name)

        return jsonify({
            'success': True,
            'uploaded': uploaded_files
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ============================================================================
# DIRECTORY BROWSING & PATH UTILITIES
# ============================================================================

@api_bp.route('/browse-directory', methods=['POST'])
def browse_directory():
    """Browse and list directories for modern UI path selection.
    
    Request JSON:
        - path: (optional) Directory to browse. If empty, returns home/project dirs
        - filter_type: (optional) 'dirs', 'files', or 'all'
    
    Returns:
        {
            'success': bool,
            'current_path': str (absolute path),
            'directories': [{'name': str, 'path': str}, ...],
            'files': [{'name': str, 'path': str, 'size': int}, ...],
            'parent_path': str or null
        }
    """
    try:
        data = request.get_json() or {}
        browse_path = data.get('path', '')
        filter_type = data.get('filter_type', 'dirs')  # 'dirs', 'files', or 'all'
        
        # Resolve path - handle relative and absolute
        if not browse_path or browse_path == '.':
            # Return home/project directories
            if platform.system() == 'Windows':
                root_dirs = [
                    os.path.expanduser('~'),  # Home
                    'C:\\',  # C: drive
                ]
            else:
                root_dirs = [
                    os.path.expanduser('~'),  # Home
                    '/home',
                    '/tmp',
                ]
            current_path = os.path.expanduser('~')
        else:
            # Resolve absolute path
            current_path = os.path.abspath(os.path.expanduser(browse_path))
        
        # Security: Ensure path exists and is accessible
        if not os.path.exists(current_path):
            return jsonify({
                'success': False,
                'error': f'Path does not exist: {current_path}'
            }), 400
        
        if not os.path.isdir(current_path):
            return jsonify({
                'success': False,
                'error': f'Path is not a directory: {current_path}'
            }), 400
        
        # List directories and files
        directories = []
        files = []
        
        try:
            for item in sorted(os.listdir(current_path)):
                item_path = os.path.join(current_path, item)
                
                # Skip hidden files/dirs
                if item.startswith('.'):
                    continue
                
                try:
                    if os.path.isdir(item_path):
                        if filter_type in ['dirs', 'all']:
                            directories.append({
                                'name': item,
                                'path': item_path
                            })
                    else:
                        if filter_type in ['files', 'all']:
                            try:
                                size = os.path.getsize(item_path)
                            except (OSError, PermissionError):
                                # Cannot get file size, use 0
                                size = 0
                            files.append({
                                'name': item,
                                'path': item_path,
                                'size': size
                            })
                except (PermissionError, OSError):
                    # Skip inaccessible items
                    pass
        except PermissionError:
            return jsonify({
                'success': False,
                'error': f'Permission denied accessing: {current_path}'
            }), 403
        
        # Get parent path
        parent_path = os.path.dirname(current_path)
        if parent_path == current_path:
            parent_path = None  # Root directory
        
        return jsonify({
            'success': True,
            'current_path': current_path,
            'directories': directories,
            'files': files,
            'parent_path': parent_path
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api_bp.route('/resolve-path', methods=['POST'])
def resolve_path():
    """Resolve a relative or absolute path to its absolute form.
    
    Request JSON:
        - path: (required) Path to resolve (can be relative or absolute)
    
    Returns:
        {
            'success': bool,
            'absolute_path': str,
            'exists': bool,
            'is_dir': bool,
            'is_file': bool
        }
    """
    try:
        data = request.get_json() or {}
        path = data.get('path', '').strip()
        
        if not path:
            return jsonify({
                'success': False,
                'error': 'Path is required'
            }), 400
        
        # Expand user home (~) and resolve to absolute
        absolute_path = os.path.abspath(os.path.expanduser(path))
        
        return jsonify({
            'success': True,
            'absolute_path': absolute_path,
            'exists': os.path.exists(absolute_path),
            'is_dir': os.path.isdir(absolute_path),
            'is_file': os.path.isfile(absolute_path)
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api_bp.route('/save-config', methods=['POST'])
def auto_save_config():
    """Auto-save configuration changes (silent endpoint for auto-save manager).
    
    This endpoint handles incremental config saves from the UI without
    user notifications. It merges changes with existing config to preserve
    non-UI fields.
    
    Request JSON:
        - config: Config name ('analysis', 'averager', or 'regression')
        - changes: Dict of field name -> value pairs
    
    Returns:
        { 'success': bool, 'message': str }
    """
    try:
        data = request.get_json() or {}
        config_name = data.get('config', '').strip()
        changes = data.get('changes', {})
        
        if not config_name:
            return jsonify({
                'success': False,
                'error': 'Config name is required'
            }), 400
        
        if config_name not in ['analysis', 'averager', 'regression']:
            return jsonify({
                'success': False,
                'error': f'Invalid config: {config_name}'
            }), 400
        
        if not isinstance(changes, dict):
            return jsonify({
                'success': False,
                'error': 'Changes must be a dictionary'
            }), 400
        
        config_dir = current_app.config.get('CONFIG_DIR')
        if not config_dir:
            return jsonify({
                'success': False,
                'error': 'Configuration directory not set'
            }), 500
        
        config_file = CONFIG_FILES.get(config_name)
        if not config_file:
            return jsonify({
                'success': False,
                'error': f'Unknown config file for {config_name}'
            }), 400
        
        config_path = os.path.join(config_dir, config_file)
        
        # Load existing config
        existing_config = {}
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    existing_config = json.load(f)
            except json.JSONDecodeError:
                existing_config = {}
        
        # Merge changes with existing config
        updated_config = deep_merge(existing_config, changes)
        
        # Write updated config back
        try:
            with open(config_path, 'w') as f:
                json.dump(updated_config, f, indent=2)
        except IOError as e:
            return jsonify({
                'success': False,
                'error': f'Failed to write config file: {str(e)}'
            }), 500
        
        return jsonify({
            'success': True,
            'message': f'{config_name} config auto-saved'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ============================================================================
# WKT PROXY ENDPOINTS (to avoid CORS issues)
# ============================================================================

@api_bp.route('/wkt/test_city', methods=['POST'])
def proxy_wkt_test_city():
    """Proxy requests to WKT generator's test_city endpoint.
    
    This avoids CORS issues when the GUI on port 5001 needs to
    access the WKT generator service on port 5000.
    """
    import requests
    
    try:
        data = request.get_json() or {}
        
        # Forward request to WKT generator
        response = requests.post(
            'http://localhost:5000/test_city',
            json=data,
            timeout=10
        )
        
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        return jsonify({
            'available': False,
            'message': 'WKT Generator service not running. Start it with: python -m tools.wktGenerator.wkt_app'
        }), 503
    except requests.exceptions.Timeout:
        return jsonify({
            'available': False,
            'message': 'WKT Generator service timed out'
        }), 504
    except Exception as e:
        return jsonify({
            'available': False,
            'message': f'Error contacting WKT Generator: {str(e)}'
        }), 500
