"""
OppNDA Flask Application Package
Cross-platform compatible web interface for network research analysis.
"""

import os
from pathlib import Path
from flask import Flask
from flask_cors import CORS

# Base directory (project root)
BASE_DIR = Path(__file__).resolve().parent.parent


def create_app():
    """Application factory for Flask app."""
    app = Flask(
        'OppNDA',
        static_folder=str(BASE_DIR / 'GUI'),
        template_folder=str(BASE_DIR / 'GUI')
    )
    
    # Enable CORS for WKT generator and other cross-origin requests
    CORS(app, resources={
        r"/api/*": {"origins": "*"},
        r"/*": {"origins": ["http://localhost:5001", "http://127.0.0.1:5001"]}
    })
    
    # Configuration
    app.config['BASE_DIR'] = BASE_DIR
    app.config['CONFIG_DIR'] = BASE_DIR / 'config'
    app.config['PLOTS_DIR'] = BASE_DIR / 'plots'
    app.config['CORE_DIR'] = BASE_DIR / 'core'
    
    # Ensure output directories exist
    app.config['PLOTS_DIR'].mkdir(exist_ok=True)
    
    # Register blueprints
    from app.routes import main_bp
    from app.api import api_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix='/api')
    
    return app
