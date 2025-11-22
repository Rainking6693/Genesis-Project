"""
PythonAnywhere WSGI Configuration for Genesis Backend
File: /var/www/rainking632_pythonanywhere_com_wsgi.py
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

# Import the FastAPI app
from a2a_fastapi import app

# WSGI application
application = app

