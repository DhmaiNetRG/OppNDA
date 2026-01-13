#!/usr/bin/env python3
"""
Report Averager - A flexible tool for averaging multiple report files
Optimized with multiprocessing for enhanced performance
"""

import os
import json
import numpy as np
from collections import defaultdict
import re
import sys
from pathlib import Path
from multiprocessing import Pool, Manager
import traceback
import time

# Cross-platform path resolution
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
CONFIG_DIR = PROJECT_ROOT / 'config'

def read_and_parse_file_parallel(args):
    """Worker function for parallel file reading and parsing"""
    filepath, separator, ignore_fields = args
    
    try:
        data = {}
        with open(filepath, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or separator not in line:
                    continue
                
                field, value = line.split(separator, 1)
                field = field.strip()
                value = value.strip()
                
                if field in ignore_fields:
                    continue
                
                try:
                    data[field] = float(value) if value.lower() != 'nan' else np.nan
                except ValueError:
                    continue
        
        return filepath, data
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return filepath, None

def average_group_data(aggregated):
    """Calculate averages from aggregated data"""
    averaged = {}
    for field, values in aggregated.items():
        averaged[field] = np.nanmean(values)
    return averaged

class ReportAverager:
    def __init__(self, config_path):
        self.config = self.load_config(config_path)
        self.validate_config()
        self.num_processes = min(4, os.cpu_count() or 1)  # Use up to 4 processes
        
    def load_config(self, config_path):
        """Load and parse configuration file"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"ERROR: Config file '{config_path}' not found")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"ERROR: Invalid JSON in config file: {e}")
            sys.exit(1)
    
    def validate_config(self):
        """Validate required configuration fields"""
        required = ['folder', 'filename_pattern', 'average_groups']
        for field in required:
            if field not in self.config:
                print(f"ERROR: Missing required field '{field}' in config")
                sys.exit(1)
        
        # Validate average_groups structure
        if not isinstance(self.config['average_groups'], list) or len(self.config['average_groups']) == 0:
            print("ERROR: 'average_groups' must be a non-empty list")
            sys.exit(1)
    
    def parse_filename(self, filename):
        """Extract components from filename based on pattern"""
        pattern = self.config['filename_pattern']
        
        # Remove extension
        name = filename.rsplit('.', 1)[0]
        
        # Split by delimiter
        delimiter = pattern['delimiter']
        parts = name.split(delimiter)
        
        # Debug output for first file
        if not hasattr(self, '_debug_shown'):
            print(f"\n  Debug - First file parsing:")
            print(f"    Original: {filename}")
            print(f"    After removing extension: {name}")
            print(f"    Split into {len(parts)} parts: {parts}")
            print(f"    Expected components: {list(pattern['components'].keys())}")
            self._debug_shown = True
        
        # Extract components
        components = {}
        for comp_name, position in pattern['components'].items():
            try:
                value = parts[position]
                
                # Apply extraction if specified
                if 'extract' in pattern and comp_name in pattern['extract']:
                    extract_pattern = pattern['extract'][comp_name]
                    match = re.search(extract_pattern, value)
                    if match:
                        value = match.group(1)
                
                components[comp_name] = value
            except IndexError:
                if not hasattr(self, '_parse_error_shown'):
                    print(f"    ERROR: Position {position} for '{comp_name}' not found (only have {len(parts)} parts)")
                    self._parse_error_shown = True
                return None
        
        return components
    
    def read_report_file(self, filepath):
        """Read and parse a report file (legacy, kept for compatibility)"""
        separator = self.config.get('data_separator', ':')
        ignore_fields = set(self.config.get('ignore_fields', []))
        
        try:
            with open(filepath, 'r') as f:
                for line in f:
                    line = line.strip()
                    if not line or separator not in line:
                        continue
                    
                    field, value = line.split(separator, 1)
                    field = field.strip()
                    value = value.strip()
                    
                    if field in ignore_fields:
                        continue
                    
                    try:
                        data[field] = float(value) if value.lower() != 'nan' else np.nan
                    except ValueError:
                        continue
            
            return data
        except Exception as e:
            print(f"Warning: Error reading {filepath}: {e}")
            return None
    
    def group_files(self, files, group_by):
        """Group files according to specified grouping fields"""
        groups = defaultdict(list)
        skipped = 0
        
        for filepath in files:
            filename = os.path.basename(filepath)
            components = self.parse_filename(filename)
            
            if components is None:
                skipped += 1
                continue
            
            # Create grouping key
            key_values = tuple(components.get(field, 'unknown') for field in group_by)
            groups[key_values].append((filepath, components))
        
        if skipped > 0:
            print(f"  Skipped {skipped} files (parsing failed)")
        
        return groups
    
    def average_group(self, file_list):
        """Average data from multiple files using multiprocessing"""
        separator = self.config.get('data_separator', ':')
        ignore_fields = set(self.config.get('ignore_fields', []))
        
        # Extract filepaths for parallel processing
        filepaths = [filepath for filepath, _ in file_list]
        
        # Prepare arguments for parallel processing
        args_list = [(fp, separator, ignore_fields) for fp in filepaths]
        
        aggregated = defaultdict(list)
        
        # Use multiprocessing to read files in parallel
        if len(filepaths) > 1 and self.num_processes > 1:
            try:
                with Pool(processes=self.num_processes) as pool:
                    results = pool.map(read_and_parse_file_parallel, args_list)
                
                for filepath, data in results:
                    if data is None:
                        continue
                    
                    for field, value in data.items():
                        aggregated[field].append(value)
            except Exception as e:
                print(f"Error in parallel reading: {e}")
                traceback.print_exc()
                # Fallback to single-threaded
                for filepath, _ in file_list:
                    data = self.read_report_file(filepath)
                    if data is None:
                        continue
                    for field, value in data.items():
                        aggregated[field].append(value)
        else:
            # Single file or sequential processing
            for filepath, _ in file_list:
                data = self.read_report_file(filepath)
                if data is None:
                    continue
                for field, value in data.items():
                    aggregated[field].append(value)
        
        # Calculate averages
        averaged = average_group_data(dict(aggregated))
        return averaged
    
    def generate_output_filename(self, group_key, components):
        """Generate output filename from template"""
        template = self.config['output']['filename_template']
        group_by = self.config['grouping']['group_by']
        
        # Create substitution dict from group_by fields
        subs = dict(zip(group_by, group_key))
        
        # Add all other components from the first file in group
        subs.update(components)
        
        # Replace placeholders
        output_name = template
        for field, value in subs.items():
            output_name = output_name.replace(f'{{{field}}}', str(value))
        
        return output_name
    
    def save_averaged_data(self, data, output_path):
        """Save averaged data to file"""
        separator = self.config.get('data_separator', ':')
        precision = self.config.get('output', {}).get('precision', 4)
        
        with open(output_path, 'w') as f:
            for field in sorted(data.keys()):
                value = data[field]
                f.write(f"{field}{separator} {value:.{precision}f}\n")
    
    def run(self):
        """Main execution method with multiprocessing optimization"""
        start_time = time.time()
        
        print("="*70)
        print("REPORT AVERAGER - MULTIPROCESSING ENABLED")
        print(f"Processes: {self.num_processes}")
        print("="*70)
        
        # Get folder and file filter
        folder = self.config['folder']
        file_filter = self.config.get('file_filter', {})
        extension = file_filter.get('extension', '.txt')
        
        # Get report types - support both new array format and legacy single string
        report_types = self.config.get('report_types', [])
        if not report_types:
            # Backward compatibility: use file_filter.contains as single report type
            legacy_contains = file_filter.get('contains', '')
            if legacy_contains:
                report_types = [legacy_contains]
            else:
                # No filter specified - process all files as single batch
                report_types = ['']
        
        print(f"\nReport types to process: {report_types if report_types[0] else ['All files']}")
        
        # Validate folder
        if not os.path.exists(folder):
            print(f"ERROR: Folder '{folder}' not found")
            return
        
        # Collect all output templates from grouping strategies to exclude them
        exclude_patterns = []
        for avg_config in self.config.get('average_groups', []):
            template = avg_config.get('output_template', '')
            if template and '{' in template:
                # Extract prefix before first placeholder
                prefix = template.split('{')[0]
                if prefix:
                    exclude_patterns.append(prefix)
        
        # Track overall stats
        total_processed = 0
        total_skipped = 0
        
        # Process each report type
        for report_type in report_types:
            print(f"\n{'#'*70}")
            print(f"# REPORT TYPE: {report_type if report_type else 'All Files'}")
            print(f"{'#'*70}")
            
            # Reset debug flag for each report type
            if hasattr(self, '_debug_shown'):
                delattr(self, '_debug_shown')
            if hasattr(self, '_parse_error_shown'):
                delattr(self, '_parse_error_shown')
            
            # Find matching files for this report type
            all_files = []
            
            for file in os.listdir(folder):
                # Skip if doesn't match extension
                if not file.endswith(extension):
                    continue
                
                # Skip if doesn't contain report type (if specified)
                if report_type and report_type not in file:
                    continue
                
                # Skip previously generated average files
                if "average" in file.lower():
                    continue
                
                # Skip files matching any output template prefix
                skip = False
                for prefix in exclude_patterns:
                    if file.startswith(prefix):
                        skip = True
                        break
                
                if skip:
                    continue
                    
                all_files.append(os.path.join(folder, file))
            
            if not all_files:
                print(f"No files found for report type '{report_type}' in {folder}")
                continue
            
            print(f"\nFolder: {folder}")
            print(f"Files found: {len(all_files)}")
            
            # Process each group independently for this report type
            processed = 0
            skipped = 0
            
            for avg_config in self.config.get('average_groups', []):
                group_name = avg_config['name']
                group_by = avg_config['group_by']
                min_files = avg_config.get('min_files', 2)
                
                print(f"\n{'='*70}")
                print(f"PROCESSING: {group_name}")
                print(f"Grouping by: {', '.join(group_by)}")
                print(f"Minimum files: {min_files}")
                print(f"{'='*70}")
                
                # Group files for this specific grouping strategy
                current_groups = self.group_files(all_files, group_by)
                
                # Process groups for this strategy
                for group_key, file_list in sorted(current_groups.items()):
                    group_dict = dict(zip(group_by, group_key))
                    
                    # Count unique files
                    unique_files = set(filepath for filepath, _ in file_list)
                    num_files = len(unique_files)
                    
                    if num_files < min_files:
                        print(f"⊗ SKIP {group_dict} ({num_files} files < {min_files} minimum)")
                        skipped += 1
                        continue
                    
                    print(f"\n✓ PROCESS {group_dict}")
                    print(f"  Files: {num_files}")
                    
                    # Average the data
                    averaged_data = self.average_group(file_list)
                    
                    if not averaged_data:
                        print(f"  Warning: No data to average")
                        continue
                    
                    # Generate output filename using this strategy's template
                    _, first_components = file_list[0]
                    output_template = avg_config['output_template']
                    
                    # Create substitution dict
                    subs = dict(zip(group_by, group_key))
                    subs.update(first_components)
                    
                    # Replace placeholders
                    output_name = output_template
                    for field, value in subs.items():
                        output_name = output_name.replace(f'{{{field}}}', str(value))
                    
                    output_path = os.path.join(folder, output_name)
                    
                    # Save results
                    self.save_averaged_data(averaged_data, output_path)
                    
                    print(f"  Metrics: {len(averaged_data)}")
                    print(f"  Output: {output_name}")
                    
                    processed += 1
            
            # Update totals for this report type
            total_processed += processed
            total_skipped += skipped
            print(f"\n--- {report_type}: {processed} groups processed, {skipped} skipped ---")
        
        # Calculate elapsed time
        elapsed_time = time.time() - start_time
        
        # Summary
        print("\n" + "="*70)
        print("SUMMARY")
        print("="*70)
        print(f"Report types processed: {len([rt for rt in report_types if rt])}")
        print(f"Total groups processed: {total_processed}")
        print(f"Total groups skipped: {total_skipped}")
        print(f"Output files created: {total_processed}")
        print(f"Total time: {elapsed_time:.2f}s")
        print(f"Avg per group: {elapsed_time/max(total_processed, 1):.2f}s")
        print("="*70)

def main():
    # Auto-resolve config path if not provided
    if len(sys.argv) >= 2:
        config_path = Path(sys.argv[1])
    else:
        config_path = CONFIG_DIR / 'averager_config.json'
    
    if not config_path.exists():
        print(f"ERROR: Config file not found: {config_path}")
        sys.exit(1)
    
    averager = ReportAverager(str(config_path))
    averager.run()


if __name__ == "__main__":
    main()