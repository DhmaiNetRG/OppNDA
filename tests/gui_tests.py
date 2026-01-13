#!/usr/bin/env python3
"""
GUI Tests for OppNDA
Comprehensive tests for all frontend components in settings.html and config.js.
"""

import os
import sys
import re

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class GUITestResult:
    """Holds GUI test result information"""
    def __init__(self, name, passed, message=""):
        self.name = name
        self.passed = passed
        self.message = message
    
    def __str__(self):
        status = "[PASS]" if self.passed else "[FAIL]"
        return f"{status}: {self.name}" + (f" - {self.message}" if self.message else "")


# ============================================================
# SETTINGS.HTML TESTS
# ============================================================

def test_html_tabs_exist():
    """Test that all required tabs exist in settings.html"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_tabs = [
            "ScenarioSettings",
            "InterfaceSettings", 
            "GroupSettings",
            "ReportSettings",
            "EventSettings",
            "OverlayMovement",
            "UpdateConfiguration",
            "DataAnalysis",
            "PostProcessing"
        ]
        
        missing = [tab for tab in required_tabs if f'id="{tab}"' not in content]
        
        if missing:
            return GUITestResult("HTML Tabs Exist", False, f"Missing tabs: {missing}")
        return GUITestResult("HTML Tabs Exist", True)
    except Exception as e:
        return GUITestResult("HTML Tabs Exist", False, str(e))


def test_scenario_settings_fields():
    """Test that Scenario Settings tab has all required fields"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_fields = [
            'id="scenarioName"',
            'id="simulateConnections"',
            'id="updateInterval"',
            'id="endTime"'
        ]
        
        missing = [field for field in required_fields if field not in content]
        
        if missing:
            return GUITestResult("Scenario Settings Fields", False, f"Missing: {missing}")
        return GUITestResult("Scenario Settings Fields", True)
    except Exception as e:
        return GUITestResult("Scenario Settings Fields", False, str(e))


def test_interface_settings_fields():
    """Test that Interface Settings tab has all required fields"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_fields = [
            'id="interfaceName"',
            'id="interfaceType"',
            'id="transmitSpeed"',
            'id="transmitRange"'
        ]
        
        missing = [field for field in required_fields if field not in content]
        
        if missing:
            return GUITestResult("Interface Settings Fields", False, f"Missing: {missing}")
        return GUITestResult("Interface Settings Fields", True)
    except Exception as e:
        return GUITestResult("Interface Settings Fields", False, str(e))


def test_group_settings_fields():
    """Test that Group Settings tab has all required fields"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_fields = [
            'id="commonMovementModel"',
            'id="commonRouter"',
            'id="commonBufferSize"',
            'id="commonWaitTime"',
            'id="commonSpeed"',
            'id="commonTtl"',
            'id="groupID"',
            'id="numberOfHosts"',
            'id="router"'
        ]
        
        missing = [field for field in required_fields if field not in content]
        
        if missing:
            return GUITestResult("Group Settings Fields", False, f"Missing: {missing}")
        return GUITestResult("Group Settings Fields", True)
    except Exception as e:
        return GUITestResult("Group Settings Fields", False, str(e))


def test_event_settings_fields():
    """Test that Event Settings tab has all required fields"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_fields = [
            'id="eventClass"',
            'id="eventIntervalMin"',
            'id="eventIntervalMax"',
            'id="eventSizeMin"',
            'id="eventSizeMax"',
            'id="eventHostsMin"',
            'id="eventHostsMax"',
            'id="eventPrefix"'
        ]
        
        missing = [field for field in required_fields if field not in content]
        
        if missing:
            return GUITestResult("Event Settings Fields", False, f"Missing: {missing}")
        return GUITestResult("Event Settings Fields", True)
    except Exception as e:
        return GUITestResult("Event Settings Fields", False, str(e))


def test_report_settings_fields():
    """Test that Report Settings tab has required fields"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_fields = [
            'id="reportClass"',
            'id="reportWarmup"',
            'id="reportDir"'
        ]
        
        missing = [field for field in required_fields if field not in content]
        
        if missing:
            return GUITestResult("Report Settings Fields", False, f"Missing: {missing}")
        return GUITestResult("Report Settings Fields", True)
    except Exception as e:
        return GUITestResult("Report Settings Fields", False, str(e))


def test_movement_settings_fields():
    """Test that Map Based Movement tab has required fields"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_fields = [
            'id="rngSeed"',
            'id="warmup"',
            'id="worldSize"',
            'id="mapFiles"'
        ]
        
        missing = [field for field in required_fields if field not in content]
        
        if missing:
            return GUITestResult("Movement Settings Fields", False, f"Missing: {missing}")
        return GUITestResult("Movement Settings Fields", True)
    except Exception as e:
        return GUITestResult("Movement Settings Fields", False, str(e))


def test_router_whitelist():
    """Test that router whitelist contains all expected routers"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        expected_routers = [
            "EpidemicRouter", "ProphetRouter", "SprayAndWaitRouter", "PassiveRouter",
            "DirectDeliveryRouter", "FirstContactRouter", "MaxPropRouter"
        ]
        
        missing = [r for r in expected_routers if r not in content]
        
        if missing:
            return GUITestResult("Router Whitelist", False, f"Missing routers: {missing}")
        return GUITestResult("Router Whitelist", True)
    except Exception as e:
        return GUITestResult("Router Whitelist", False, str(e))


def test_router_dropdown_options():
    """Test that router dropdown contains all expected options"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        expected_options = [
            'value="EpidemicRouter"',
            'value="ProphetRouter"',
            'value="SprayAndWaitRouter"',
            'value="MaxPropRouter"',
            'value="DirectDeliveryRouter"',
            'value="FirstContactRouter"'
        ]
        
        missing = [opt for opt in expected_options if opt not in content]
        
        if missing:
            return GUITestResult("Router Dropdown Options", False, f"Missing: {missing}")
        return GUITestResult("Router Dropdown Options", True)
    except Exception as e:
        return GUITestResult("Router Dropdown Options", False, str(e))


def test_movement_models_dropdown():
    """Test that movement models dropdown has expected options"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        expected_models = [
            "RandomWaypoint",
            "ShortestPathMapBasedMovement",
            "MapRouteMovement",
            "StationaryMovement"
        ]
        
        missing = [m for m in expected_models if m not in content]
        
        if missing:
            return GUITestResult("Movement Models Dropdown", False, f"Missing: {missing}")
        return GUITestResult("Movement Models Dropdown", True)
    except Exception as e:
        return GUITestResult("Movement Models Dropdown", False, str(e))


def test_report_classes_dropdown():
    """Test that report classes dropdown has expected options"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        expected_reports = [
            "MessageStatsReport",
            "ContactTimesReport",
            "DeliveredMessagesReport",
            "BufferOccupancyReport"
        ]
        
        missing = [r for r in expected_reports if r not in content]
        
        if missing:
            return GUITestResult("Report Classes Dropdown", False, f"Missing: {missing}")
        return GUITestResult("Report Classes Dropdown", True)
    except Exception as e:
        return GUITestResult("Report Classes Dropdown", False, str(e))


def test_post_processing_fields():
    """Test that Post-Processing tab has required fields"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_fields = [
            'id="batchFolder"',
            'id="analysisReportDir"',
            'id="analysisPlotsDir"',
            'id="enableML"'
        ]
        
        missing = [field for field in required_fields if field not in content]
        
        if missing:
            return GUITestResult("Post-Processing Fields", False, f"Missing: {missing}")
        return GUITestResult("Post-Processing Fields", True)
    except Exception as e:
        return GUITestResult("Post-Processing Fields", False, str(e))


# ============================================================
# CONFIG.JS TESTS
# ============================================================

def test_config_js_functions():
    """Test that all required JavaScript functions exist in config.js"""
    config_js_path = os.path.join(BASE_DIR, "GUI", "config.js")
    
    try:
        with open(config_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for function declarations (both 'function name' and 'const name = ')
        required_functions = [
            "saveAllSettings",
            "saveDefaultSettings",
            "openTab",
            "addInterface",
            "populateInterfaceTable",
            "populateGroupTable",
            "renderReports",  # Changed from addReport - this is the actual function name
            "runONE",
            "collectAnalysisConfig",
            "collectBatchConfig",
            "collectRegressionConfig"
        ]
        
        missing = []
        for fn in required_functions:
            # Check for 'function name' or 'const name =' patterns
            if f"function {fn}" not in content and f"const {fn}" not in content:
                missing.append(fn)
        
        if missing:
            return GUITestResult("Config.js Functions", False, f"Missing: {missing}")
        return GUITestResult("Config.js Functions", True)
    except Exception as e:
        return GUITestResult("Config.js Functions", False, str(e))


def test_config_js_event_handlers():
    """Test that config.js has required event handlers"""
    config_js_path = os.path.join(BASE_DIR, "GUI", "config.js")
    
    try:
        with open(config_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_handlers = [
            'addEventListener("DOMContentLoaded"',
            'addEventListener("submit"',
            'addEventListener("change"'
        ]
        
        missing = [h for h in required_handlers if h not in content]
        
        if missing:
            return GUITestResult("Config.js Event Handlers", False, f"Missing: {missing}")
        return GUITestResult("Config.js Event Handlers", True)
    except Exception as e:
        return GUITestResult("Config.js Event Handlers", False, str(e))


def test_config_js_api_calls():
    """Test that config.js has required API calls"""
    config_js_path = os.path.join(BASE_DIR, "GUI", "config.js")
    
    try:
        with open(config_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_apis = [
            "fetch('/api/save-all'",
            "fetch('/api/config/"
        ]
        
        missing = [api for api in required_apis if api not in content]
        
        if missing:
            return GUITestResult("Config.js API Calls", False, f"Missing: {missing}")
        return GUITestResult("Config.js API Calls", True)
    except Exception as e:
        return GUITestResult("Config.js API Calls", False, str(e))


def test_config_js_default_interfaces():
    """Test that default interfaces are defined in config.js"""
    config_js_path = os.path.join(BASE_DIR, "GUI", "config.js")
    
    try:
        with open(config_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required = [
            "btInterface",
            "highspeedInterface",
            "SimpleBroadcastInterface"
        ]
        
        missing = [r for r in required if r not in content]
        
        if missing:
            return GUITestResult("Default Interfaces", False, f"Missing: {missing}")
        return GUITestResult("Default Interfaces", True)
    except Exception as e:
        return GUITestResult("Default Interfaces", False, str(e))


def test_config_js_default_groups():
    """Test that default groups are defined in config.js"""
    config_js_path = os.path.join(BASE_DIR, "GUI", "config.js")
    
    try:
        with open(config_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if "const groupSettings" not in content:
            return GUITestResult("Default Groups", False, "groupSettings not defined")
        
        if "groupID" not in content:
            return GUITestResult("Default Groups", False, "groupID property missing")
        
        return GUITestResult("Default Groups", True)
    except Exception as e:
        return GUITestResult("Default Groups", False, str(e))


def test_settings_export_format():
    """Test that settings export generates correct ONE format"""
    config_js_path = os.path.join(BASE_DIR, "GUI", "config.js")
    
    try:
        with open(config_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for ONE simulator format strings
        required_patterns = [
            "Scenario.name =",
            "Scenario.simulateConnections =",
            "Scenario.updateInterval =",
            "Scenario.endTime =",
            "Group.movementModel =",
            "Group.router =",
            "Group.bufferSize =",
            "Report.nrofReports =",
            "Events.nrof ="
        ]
        
        missing = [p for p in required_patterns if p not in content]
        
        if missing:
            return GUITestResult("Settings Export Format", False, f"Missing: {missing}")
        return GUITestResult("Settings Export Format", True)
    except Exception as e:
        return GUITestResult("Settings Export Format", False, str(e))


# ============================================================
# CSS TESTS
# ============================================================

def test_css_file_valid():
    """Test that settings.css exists and has content"""
    css_path = os.path.join(BASE_DIR, "GUI", "settings.css")
    
    try:
        with open(css_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if len(content) < 100:
            return GUITestResult("CSS File Valid", False, "CSS file too small")
        
        # Check for common CSS patterns
        if '{' not in content or '}' not in content:
            return GUITestResult("CSS File Valid", False, "Invalid CSS syntax")
        
        return GUITestResult("CSS File Valid", True)
    except Exception as e:
        return GUITestResult("CSS File Valid", False, str(e))


def test_css_button_classes():
    """Test that required button classes exist in CSS"""
    css_path = os.path.join(BASE_DIR, "GUI", "settings.css")
    
    try:
        with open(css_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_classes = [
            ".add-button",
            ".remove-button",
            ".edit-button"
        ]
        
        missing = [c for c in required_classes if c not in content]
        
        if missing:
            return GUITestResult("CSS Button Classes", False, f"Missing: {missing}")
        return GUITestResult("CSS Button Classes", True)
    except Exception as e:
        return GUITestResult("CSS Button Classes", False, str(e))


# ============================================================
# INPUT VALIDATION TESTS
# ============================================================

def test_required_fields_have_required_attribute():
    """Test that mandatory fields have 'required' attribute"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fields that should be required
        required_fields_patterns = [
            ('interfaceName', r'id="interfaceName"[^>]*required'),
            ('interfaceType', r'id="interfaceType"[^>]*required'),
            ('transmitSpeed', r'id="transmitSpeed"[^>]*required'),
            ('transmitRange', r'id="transmitRange"[^>]*required'),
        ]
        
        missing = []
        for field_name, pattern in required_fields_patterns:
            if not re.search(pattern, content, re.IGNORECASE):
                missing.append(field_name)
        
        if missing:
            return GUITestResult("Required Field Attributes", False, f"Missing required attr: {missing}")
        return GUITestResult("Required Field Attributes", True)
    except Exception as e:
        return GUITestResult("Required Field Attributes", False, str(e))


def test_number_inputs_have_constraints():
    """Test that number inputs have min, max, or step attributes where appropriate"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Number fields that should have constraints
        constrained_fields = [
            ('updateInterval', 'min'),   # Should have min="0"
            ('updateInterval', 'step'),  # Should have step for decimals
            ('endTime', 'min'),          # Should have min="0"
            ('transmitSpeed', 'min'),    # Should have min="1"
            ('transmitRange', 'min'),    # Should have min="1"
        ]
        
        missing = []
        for field_name, attr in constrained_fields:
            pattern = rf'id="{field_name}"[^>]*{attr}='
            if not re.search(pattern, content, re.IGNORECASE):
                missing.append(f"{field_name}.{attr}")
        
        if missing:
            return GUITestResult("Number Input Constraints", False, f"Missing: {missing}")
        return GUITestResult("Number Input Constraints", True)
    except Exception as e:
        return GUITestResult("Number Input Constraints", False, str(e))


def test_input_types_correct():
    """Test that inputs use correct HTML5 input types"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fields and their expected types
        type_checks = [
            ('updateInterval', 'number'),
            ('endTime', 'number'),
            ('transmitSpeed', 'number'),
            ('transmitRange', 'number'),
            ('commonNumberOfHost', 'number'),
            ('simulateConnections', 'checkbox'),
            ('commonRouteFile', 'file'),
        ]
        
        incorrect = []
        for field_id, expected_type in type_checks:
            pattern = rf'id="{field_id}"[^>]*type="{expected_type}"'
            # Also check reverse order
            pattern2 = rf'type="{expected_type}"[^>]*id="{field_id}"'
            if not re.search(pattern, content) and not re.search(pattern2, content):
                incorrect.append(f"{field_id}:{expected_type}")
        
        if incorrect:
            return GUITestResult("Input Types Correct", False, f"Wrong types: {incorrect}")
        return GUITestResult("Input Types Correct", True)
    except Exception as e:
        return GUITestResult("Input Types Correct", False, str(e))


def test_file_input_accepts_correct_extensions():
    """Test that file inputs have correct accept attributes"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check route file accepts .wkt
        if 'accept=".wkt"' not in content:
            return GUITestResult("File Input Accept", False, "Route file should accept .wkt")
        
        return GUITestResult("File Input Accept", True)
    except Exception as e:
        return GUITestResult("File Input Accept", False, str(e))


def test_select_elements_have_options():
    """Test that select elements have at least one option"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Select elements that must have options
        selects_to_check = [
            'interfaceType',
            'commonMovementModel',
            'router',
            'reportClass',
        ]
        
        empty_selects = []
        for select_id in selects_to_check:
            # Find the select element
            pattern = rf'<select[^>]*id="{select_id}"[^>]*>.*?</select>'
            match = re.search(pattern, content, re.DOTALL)
            if match:
                select_html = match.group()
                if '<option' not in select_html:
                    empty_selects.append(select_id)
            else:
                empty_selects.append(f"{select_id}(not found)")
        
        if empty_selects:
            return GUITestResult("Select Elements Have Options", False, f"Empty: {empty_selects}")
        return GUITestResult("Select Elements Have Options", True)
    except Exception as e:
        return GUITestResult("Select Elements Have Options", False, str(e))


def test_js_addinterface_validation():
    """Test that addInterface function has input validation"""
    config_js_path = os.path.join(BASE_DIR, "GUI", "config.js")
    
    try:
        with open(config_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for validation patterns in addInterface
        validation_patterns = [
            'interfaceName',
            'transmitSpeed',
            'transmitRange',
            'alert',  # Should show alert on error
        ]
        
        # Find the addInterface function
        if 'function addInterface' not in content:
            return GUITestResult("JS Interface Validation", False, "addInterface not found")
        
        # Simple check - validation should include checking if fields are filled
        if 'Please fill' not in content and '!interfaceName' not in content:
            return GUITestResult("JS Interface Validation", False, "No input validation found")
        
        return GUITestResult("JS Interface Validation", True)
    except Exception as e:
        return GUITestResult("JS Interface Validation", False, str(e))


def test_js_batch_syntax_validation():
    """Test that batch syntax (semicolon-separated) is validated"""
    config_js_path = os.path.join(BASE_DIR, "GUI", "config.js")
    
    try:
        with open(config_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Batch mode uses semicolons - check if there's validation
        if 'includes(";")' in content or 'includes(",")' in content:
            return GUITestResult("JS Batch Syntax Validation", True)
        
        return GUITestResult("JS Batch Syntax Validation", False, "No batch syntax validation found")
    except Exception as e:
        return GUITestResult("JS Batch Syntax Validation", False, str(e))


def test_js_form_prevent_default():
    """Test that form submissions use preventDefault"""
    config_js_path = os.path.join(BASE_DIR, "GUI", "config.js")
    
    try:
        with open(config_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Forms should prevent default submission
        if 'event.preventDefault()' not in content and 'e.preventDefault()' not in content:
            return GUITestResult("JS Form Prevent Default", False, "No preventDefault found")
        
        return GUITestResult("JS Form Prevent Default", True)
    except Exception as e:
        return GUITestResult("JS Form Prevent Default", False, str(e))


def test_default_values_set():
    """Test that important fields have default values"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fields that should have default values
        defaults_to_check = [
            ('scenarioName', 'default_scenario'),
            ('updateInterval', '0.1'),
            ('endTime', '43200'),
            ('commonBufferSize', '5M'),
        ]
        
        missing_defaults = []
        for field_id, expected_value in defaults_to_check:
            pattern = rf'id="{field_id}"[^>]*value="{expected_value}"'
            pattern2 = rf'value="{expected_value}"[^>]*id="{field_id}"'
            if not re.search(pattern, content) and not re.search(pattern2, content):
                missing_defaults.append(field_id)
        
        if missing_defaults:
            return GUITestResult("Default Values Set", False, f"Missing defaults: {missing_defaults}")
        return GUITestResult("Default Values Set", True)
    except Exception as e:
        return GUITestResult("Default Values Set", False, str(e))


def test_output_format_one_simulator():
    """Test that generated output follows ONE simulator format"""
    config_js_path = os.path.join(BASE_DIR, "GUI", "config.js")
    
    try:
        with open(config_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # ONE simulator format patterns
        required_formats = [
            "Scenario.nrofHostGroups =",
            "Group.nrofInterfaces =",
            "Group.interface1 =",
            "MapBasedMovement.nrofMapFiles =",
            "ProphetRouter.secondsInTimeUnit =",
            "SprayAndWaitRouter.nrofCopies =",
            "Optimization.cellSizeMult =",
        ]
        
        missing = [f for f in required_formats if f not in content]
        
        if missing:
            return GUITestResult("ONE Output Format", False, f"Missing: {missing}")
        return GUITestResult("ONE Output Format", True)
    except Exception as e:
        return GUITestResult("ONE Output Format", False, str(e))


# ============================================================
# PHASE 2 TESTS - Energy, POI, Multi-Interface, Import/Export
# ============================================================

def test_energy_settings_fields():
    """Test that Energy Model Settings section has all required fields"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_fields = [
            'id="enableEnergyModel"',
            'id="energyFields"',
            'id="initialEnergy"',
            'id="scanEnergy"',
            'id="transmitEnergy"',
            'id="baseEnergy"'
        ]
        
        missing = [field for field in required_fields if field not in content]
        
        if missing:
            return GUITestResult("Energy Settings Fields", False, f"Missing: {missing}")
        return GUITestResult("Energy Settings Fields", True)
    except Exception as e:
        return GUITestResult("Energy Settings Fields", False, str(e))


def test_poi_configuration_fields():
    """Test that POI Configuration section has all required fields"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_fields = [
            'id="poiEnabled"',
            'id="poiConfiguration"',
            'id="poiTableBody"',
            'id="poiPreview"'
        ]
        
        missing = [field for field in required_fields if field not in content]
        
        if missing:
            return GUITestResult("POI Configuration Fields", False, f"Missing: {missing}")
        return GUITestResult("POI Configuration Fields", True)
    except Exception as e:
        return GUITestResult("POI Configuration Fields", False, str(e))


def test_multi_interface_support():
    """Test that interface field supports multi-selection via Tagify"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    config_js_path = os.path.join(BASE_DIR, "GUI", "config.js")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        with open(config_js_path, 'r', encoding='utf-8') as f:
            js_content = f.read()
        
        # Check that commonInterface is an input (not select) for Tagify
        if 'id="commonInterface"' not in html_content:
            return GUITestResult("Multi-Interface Support", False, "commonInterface not found")
        
        # Check for Tagify initialization function
        if 'initInterfaceTagify' not in js_content:
            return GUITestResult("Multi-Interface Support", False, "initInterfaceTagify function not found")
        
        # Check for whitelist update function
        if 'updateInterfaceTagifyWhitelist' not in js_content:
            return GUITestResult("Multi-Interface Support", False, "updateInterfaceTagifyWhitelist not found")
        
        return GUITestResult("Multi-Interface Support", True)
    except Exception as e:
        return GUITestResult("Multi-Interface Support", False, str(e))


def test_import_config_section():
    """Test that Import ONE Configuration section exists"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_fields = [
            'id="importConfigFile"',
            'importONEConfig'
        ]
        
        missing = [field for field in required_fields if field not in content]
        
        if missing:
            return GUITestResult("Import Config Section", False, f"Missing: {missing}")
        return GUITestResult("Import Config Section", True)
    except Exception as e:
        return GUITestResult("Import Config Section", False, str(e))


def test_import_export_functions():
    """Test that import/export functions exist in config.js"""
    config_js_path = os.path.join(BASE_DIR, "GUI", "config.js")
    
    try:
        with open(config_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_functions = [
            'importONEConfig',
            'parseONEConfig',
            'applyConfigToForm'
        ]
        
        missing = []
        for fn in required_functions:
            if f"function {fn}" not in content:
                missing.append(fn)
        
        if missing:
            return GUITestResult("Import/Export Functions", False, f"Missing: {missing}")
        return GUITestResult("Import/Export Functions", True)
    except Exception as e:
        return GUITestResult("Import/Export Functions", False, str(e))


def test_poi_functions():
    """Test that POI management functions exist in config.js"""
    config_js_path = os.path.join(BASE_DIR, "GUI", "config.js")
    
    try:
        with open(config_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_functions = [
            'addPOIRow',
            'removePOIRow',
            'updatePOIPreview'
        ]
        
        missing = []
        for fn in required_functions:
            if f"function {fn}" not in content:
                missing.append(fn)
        
        if missing:
            return GUITestResult("POI Functions", False, f"Missing: {missing}")
        return GUITestResult("POI Functions", True)
    except Exception as e:
        return GUITestResult("POI Functions", False, str(e))


def test_energy_export_format():
    """Test that energy settings are exported in correct ONE format"""
    config_js_path = os.path.join(BASE_DIR, "GUI", "config.js")
    
    try:
        with open(config_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_patterns = [
            'Group.initialEnergy =',
            'Group.scanEnergy =',
            'Group.transmitEnergy =',
            'Group.baseEnergy ='
        ]
        
        missing = [p for p in required_patterns if p not in content]
        
        if missing:
            return GUITestResult("Energy Export Format", False, f"Missing: {missing}")
        return GUITestResult("Energy Export Format", True)
    except Exception as e:
        return GUITestResult("Energy Export Format", False, str(e))


def test_poi_export_format():
    """Test that POI settings are exported in correct ONE format"""
    config_js_path = os.path.join(BASE_DIR, "GUI", "config.js")
    
    try:
        with open(config_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if 'Group.pois =' not in content:
            return GUITestResult("POI Export Format", False, "Group.pois = not found")
        
        return GUITestResult("POI Export Format", True)
    except Exception as e:
        return GUITestResult("POI Export Format", False, str(e))


def test_css_form_hint_class():
    """Test that form-hint CSS class exists"""
    css_path = os.path.join(BASE_DIR, "GUI", "settings.css")
    
    try:
        with open(css_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if '.form-hint' not in content:
            return GUITestResult("CSS Form Hint Class", False, ".form-hint class not found")
        
        return GUITestResult("CSS Form Hint Class", True)
    except Exception as e:
        return GUITestResult("CSS Form Hint Class", False, str(e))


def test_tooltip_css_exists():
    """Test that data-tooltip CSS styling exists"""
    css_path = os.path.join(BASE_DIR, "GUI", "settings.css")
    
    try:
        with open(css_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required = [
            'data-tooltip',
            '::before',
            '::after'
        ]
        
        missing = [r for r in required if r not in content]
        
        if missing:
            return GUITestResult("Tooltip CSS", False, f"Missing: {missing}")
        return GUITestResult("Tooltip CSS", True)
    except Exception as e:
        return GUITestResult("Tooltip CSS", False, str(e))


def test_tooltips_on_scenario_settings():
    """Test that Scenario Settings fields have tooltips"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        fields_with_tooltips = [
            'for="scenarioName"',
            'for="updateInterval"',
            'for="endTime"',
            'for="simulateConnections"'
        ]
        
        missing_tooltips = []
        for field in fields_with_tooltips:
            # Check if the label has data-tooltip
            pattern = f'{field}[^>]*data-tooltip='
            if not re.search(pattern, content):
                missing_tooltips.append(field)
        
        if missing_tooltips:
            return GUITestResult("Scenario Settings Tooltips", False, f"Missing tooltips: {missing_tooltips}")
        return GUITestResult("Scenario Settings Tooltips", True)
    except Exception as e:
        return GUITestResult("Scenario Settings Tooltips", False, str(e))


def test_tooltips_on_group_settings():
    """Test that Group Settings fields have tooltips"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        fields_with_tooltips = [
            'for="commonMovementModel"',
            'for="commonRouter"',
            'for="commonBufferSize"',
            'for="commonInterface"'
        ]
        
        missing_tooltips = []
        for field in fields_with_tooltips:
            pattern = f'{field}[^>]*data-tooltip='
            if not re.search(pattern, content):
                missing_tooltips.append(field)
        
        if missing_tooltips:
            return GUITestResult("Group Settings Tooltips", False, f"Missing tooltips: {missing_tooltips}")
        return GUITestResult("Group Settings Tooltips", True)
    except Exception as e:
        return GUITestResult("Group Settings Tooltips", False, str(e))


def test_tooltips_on_energy_settings():
    """Test that Energy Settings fields have tooltips"""
    settings_html_path = os.path.join(BASE_DIR, "GUI", "settings.html")
    
    try:
        with open(settings_html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        fields_with_tooltips = [
            'for="enableEnergyModel"',
            'for="initialEnergy"',
            'for="scanEnergy"'
        ]
        
        missing_tooltips = []
        for field in fields_with_tooltips:
            pattern = f'{field}[^>]*data-tooltip='
            if not re.search(pattern, content):
                missing_tooltips.append(field)
        
        if missing_tooltips:
            return GUITestResult("Energy Settings Tooltips", False, f"Missing tooltips: {missing_tooltips}")
        return GUITestResult("Energy Settings Tooltips", True)
    except Exception as e:
        return GUITestResult("Energy Settings Tooltips", False, str(e))


# ============================================================
# TEST RUNNER
# ============================================================

def run_gui_tests():
    """Run all GUI tests"""
    results = []
    
    print("\n" + "="*60)
    print("GUI TESTS")
    print("="*60)
    
    # HTML Structure Tests
    print("\n--- HTML Structure Tests ---")
    html_tests = [
        test_html_tabs_exist,
        test_scenario_settings_fields,
        test_interface_settings_fields,
        test_group_settings_fields,
        test_event_settings_fields,
        test_report_settings_fields,
        test_movement_settings_fields,
        test_post_processing_fields,
    ]
    
    for test_func in html_tests:
        result = test_func()
        results.append(result)
        print(result)
    
    # Dropdown/Selection Tests
    print("\n--- Dropdown/Selection Tests ---")
    dropdown_tests = [
        test_router_whitelist,
        test_router_dropdown_options,
        test_movement_models_dropdown,
        test_report_classes_dropdown,
    ]
    
    for test_func in dropdown_tests:
        result = test_func()
        results.append(result)
        print(result)
    
    # JavaScript Tests
    print("\n--- JavaScript Tests ---")
    js_tests = [
        test_config_js_functions,
        test_config_js_event_handlers,
        test_config_js_api_calls,
        test_config_js_default_interfaces,
        test_config_js_default_groups,
        test_settings_export_format,
    ]
    
    for test_func in js_tests:
        result = test_func()
        results.append(result)
        print(result)
    
    # CSS Tests
    print("\n--- CSS Tests ---")
    css_tests = [
        test_css_file_valid,
        test_css_button_classes,
    ]
    
    for test_func in css_tests:
        result = test_func()
        results.append(result)
        print(result)
    
    # Input Validation Tests
    print("\n--- Input Validation Tests ---")
    validation_tests = [
        test_required_fields_have_required_attribute,
        test_number_inputs_have_constraints,
        test_input_types_correct,
        test_file_input_accepts_correct_extensions,
        test_select_elements_have_options,
        test_js_addinterface_validation,
        test_js_batch_syntax_validation,
        test_js_form_prevent_default,
        test_default_values_set,
        test_output_format_one_simulator,
    ]
    
    for test_func in validation_tests:
        result = test_func()
        results.append(result)
        print(result)
    
    # Phase 2 Tests - Energy, POI, Multi-Interface, Import/Export
    print("\n--- Phase 2 Tests (Energy, POI, Multi-Interface) ---")
    phase2_tests = [
        test_energy_settings_fields,
        test_poi_configuration_fields,
        test_multi_interface_support,
        test_import_config_section,
        test_import_export_functions,
        test_poi_functions,
        test_energy_export_format,
        test_poi_export_format,
        test_css_form_hint_class,
    ]
    
    for test_func in phase2_tests:
        result = test_func()
        results.append(result)
        print(result)
    
    # Phase 3 Tests - Tooltips/Usability
    print("\n--- Phase 3 Tests (Tooltips/Usability) ---")
    phase3_tests = [
        test_tooltip_css_exists,
        test_tooltips_on_scenario_settings,
        test_tooltips_on_group_settings,
        test_tooltips_on_energy_settings,
    ]
    
    for test_func in phase3_tests:
        result = test_func()
        results.append(result)
        print(result)
    
    # Summary
    passed = sum(1 for r in results if r.passed)
    total = len(results)
    print(f"\nGUI Tests: {passed}/{total} passed")
    print("="*60)
    
    return results


if __name__ == "__main__":
    run_gui_tests()
