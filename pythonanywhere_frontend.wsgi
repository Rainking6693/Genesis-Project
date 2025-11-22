"""
PythonAnywhere WSGI Configuration for Genesis Frontend Dashboard
File: /var/www/rainking632_frontend_pythonanywhere_com_wsgi.py
"""

import sys
import os

# Add project directory to path
project_home = '/home/rainking632/Claude-Clean-Code-Genesis'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Set working directory
os.chdir(project_home)

# Load environment variables
from dotenv import load_dotenv
load_dotenv(os.path.join(project_home, '.env'))

# Import Flask app from dashboard
sys.path.insert(0, os.path.join(project_home, 'dashboard'))
from app import app as flask_app

# WSGI application
application = flask_app

