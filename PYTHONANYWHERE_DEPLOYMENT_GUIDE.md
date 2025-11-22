# PythonAnywhere Deployment Guide

## Quick Setup

### 1. API Token & Database Info
- **API Token:** `d96e5e35ee2070fd3d41f83ddb856859a7f4ea7d`
- **Username:** `rainking632`
- **Database Host:** `rainking632.mysql.pythonanywhere-services.com`
- **Database Username:** `rainking632`

### 2. Create Web Apps

#### Backend (A2A FastAPI Service)
- **Domain:** `rainking632.pythonanywhere.com`
- **WSGI File:** `pythonanywhere_backend.wsgi`
- **Source Code:** Upload entire repo to `/home/rainking632/Claude-Clean-Code-Genesis`

#### Frontend (Dashboard)
- **Domain:** `rainking632-frontend.pythonanywhere.com` (or use subdirectory)
- **WSGI File:** `pythonanywhere_frontend.wsgi`
- **Source Code:** Same repo (dashboard/ directory)

### 3. Database Configuration

Update `.env` with PythonAnywhere MySQL:
```bash
MONGODB_URI=mysql://rainking632:PASSWORD@rainking632.mysql.pythonanywhere-services.com/rainking632$genesis
```

### 4. Environment Variables

Set in PythonAnywhere web app configuration:
- All secrets from `.env` file
- `GENESIS_ENV=production`
- `PYTHONUNBUFFERED=1`

### 5. WSGI Files

**Backend WSGI:** `/var/www/rainking632_pythonanywhere_com_wsgi.py`
```python
# Copy content from pythonanywhere_backend.wsgi
```

**Frontend WSGI:** `/var/www/rainking632_frontend_pythonanywhere_com_wsgi.py`
```python
# Copy content from pythonanywhere_frontend.wsgi
```

### 6. Upload Code

**Option 1: Git (Recommended)**
```bash
# In PythonAnywhere Bash console
cd ~
git clone https://github.com/yourusername/genesis.git Claude-Clean-Code-Genesis
cd Claude-Clean-Code-Genesis
pip3.10 install --user -r requirements_production.txt
```

**Option 2: Files Tab**
- Upload entire repo via PythonAnywhere Files tab
- Extract to `/home/rainking632/Claude-Clean-Code-Genesis`

### 7. Install Dependencies

```bash
# In PythonAnywhere Bash console
cd ~/Claude-Clean-Code-Genesis
pip3.10 install --user fastapi uvicorn[standard] python-dotenv
pip3.10 install --user -r requirements_production.txt
```

### 8. Configure Web Apps

**Backend:**
1. Go to Web tab
2. Click "Add a new web app"
3. Choose domain: `rainking632.pythonanywhere.com`
4. Python version: 3.10
5. WSGI file: `/var/www/rainking632_pythonanywhere_com_wsgi.py`
6. Source code: `/home/rainking632/Claude-Clean-Code-Genesis`
7. Add environment variables (all from .env)

**Frontend:**
1. Go to Web tab
2. Click "Add a new web app"
3. Choose domain: `rainking632-frontend.pythonanywhere.com` (or subdirectory)
4. Python version: 3.10
5. WSGI file: `/var/www/rainking632_frontend_pythonanywhere_com_wsgi.py`
6. Source code: `/home/rainking632/Claude-Clean-Code-Genesis`
7. Add environment variables

### 9. Reload Apps

Click "Reload" button for each web app after configuration.

### 10. Test

- Backend: https://rainking632.pythonanywhere.com/health
- Frontend: https://rainking632-frontend.pythonanywhere.com/

## Files Created

- `pythonanywhere_deploy.py` - API deployment script
- `pythonanywhere_backend.wsgi` - Backend WSGI config
- `pythonanywhere_frontend.wsgi` - Frontend WSGI config

## Notes

- PythonAnywhere free tier: 1 web app, 512MB storage
- Paid tier: Multiple web apps, more storage
- Database: MySQL available, configure in Databases tab
- Static files: Serve from `/static/` directory
- Logs: View in Web tab > Log files

