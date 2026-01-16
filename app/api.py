"""
REST API Endpoints for OppNDA
Handles configuration file management and script execution.
"""

import os
import sys
import json
import platform
import subprocess
from pathlib import Path
from flask import Blueprint, jsonify, request, current_app

api_bp = Blueprint('api', __name__)

# Configuration file mapping
CONFIG_FILES = {
    'analysis': 'analysis_config.json',
    'averager': 'averager_config.json',
    'regression': 'regression_config.json'
}


def get_config_path(config_name):
    """Get the cross-platform path to a config file."""
    config_dir = current_app.config['CONFIG_DIR']
    return config_dir / CONFIG_FILES.get(config_name, '')


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
    """Complete simulation pipeline: Save config → Run ONE → Post-processing.
    
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
        # STEP 4: Run ONE simulator
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
        
        # Run ONE synchronously and wait for completion
        sim_result = subprocess.run(
            full_command,
            shell=shell_needed,
            cwd=str(base_dir),
            capture_output=True,
            text=True
        )
        
        results['simulation'] = {
            'command': full_command,
            'success': sim_result.returncode == 0,
            'output': sim_result.stdout if sim_result.returncode == 0 else sim_result.stderr
        }
        
        if sim_result.returncode != 0:
            return jsonify({
                'success': False,
                'message': 'ONE simulation failed',
                'results': results
            }), 500
        
        # ============================================================
        # STEP 5: Auto-run post-processing pipeline
        # ============================================================
        # Run averager.py
        averager_script = core_dir / 'averager.py'
        if averager_script.exists():
            result = subprocess.run(
                [sys.executable, str(averager_script)],
                cwd=str(base_dir),
                capture_output=True,
                text=True
            )
            results['post_processing'].append({
                'script': 'averager.py',
                'success': result.returncode == 0,
                'output': result.stdout if result.returncode == 0 else result.stderr
            })
        
        # Run analysis.py
        analysis_script = core_dir / 'analysis.py'
        if analysis_script.exists():
            result = subprocess.run(
                [sys.executable, str(analysis_script)],
                cwd=str(base_dir),
                capture_output=True,
                text=True
            )
            results['post_processing'].append({
                'script': 'analysis.py',
                'success': result.returncode == 0,
                'output': result.stdout if result.returncode == 0 else result.stderr
            })
        
        # Run regression.py if ML enabled
        if enable_ml:
            regression_script = core_dir / 'regression.py'
            if regression_script.exists():
                result = subprocess.run(
                    [sys.executable, str(regression_script)],
                    cwd=str(base_dir),
                    capture_output=True,
                    text=True
                )
                results['post_processing'].append({
                    'script': 'regression.py',
                    'success': result.returncode == 0,
                    'output': result.stdout if result.returncode == 0 else result.stderr
                })
        
        return jsonify({
            'success': True,
            'message': 'Complete pipeline executed successfully',
            'results': results
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500


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


def deep_merge(base: dict, updates: dict) -> dict:
    """Deep merge updates into base dict, preserving non-updated nested fields.
    
    This ensures fields not exposed in the UI (like plot_settings) are preserved
    when saving config changes from the GUI.
    """
    import copy
    result = copy.deepcopy(base)  # Deep copy to preserve all nested structures
    
    for key, value in updates.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            # Recursively merge nested dicts
            result[key] = deep_merge(result[key], value)
        else:
            # Overwrite with new value (including lists, primitives, etc.)
            result[key] = value
    
    return result
