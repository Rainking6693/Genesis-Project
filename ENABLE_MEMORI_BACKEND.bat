@echo off
REM ================================================================================
REM ENABLE MEMORI BACKEND FOR WINDOWS
REM ================================================================================
REM
REM This script configures Genesis to use the Memori SQL backend instead of
REM vector databases, enabling 80-90% cost reduction and automatic mirroring.
REM
REM Created: November 11, 2025
REM ================================================================================

echo.
echo ================================================================================
echo ENABLING MEMORI BACKEND FOR GENESIS
echo ================================================================================
echo.

REM Set Memori backend as primary memory system
set GENESIS_MEMORY_BACKEND=memori
echo [1/4] Set GENESIS_MEMORY_BACKEND=memori

REM Set Memori database path
set MEMORI_DB_PATH=data/memori/genesis_memori.db
echo [2/4] Set MEMORI_DB_PATH=%MEMORI_DB_PATH%

REM Create data directory if it doesn't exist
if not exist "data\memori" mkdir data\memori
echo [3/4] Created data/memori directory

REM Enable automatic mirroring from TrajectoryPool
set DREAMGYM_AUTO_MIRROR=true
echo [4/4] Set DREAMGYM_AUTO_MIRROR=true

echo.
echo ================================================================================
echo MEMORI BACKEND ENABLED SUCCESSFULLY
echo ================================================================================
echo.
echo Environment Variables Set:
echo   - GENESIS_MEMORY_BACKEND=memori
echo   - MEMORI_DB_PATH=data/memori/genesis_memori.db
echo   - DREAMGYM_AUTO_MIRROR=true
echo.
echo Database Location:
echo   - %CD%\data\memori\genesis_memori.db
echo.
echo Next Steps:
echo   1. Run tests: pytest tests/test_dreamgym.py tests/test_memori_sql.py
echo   2. Migrate existing data: python scripts/migrate_memori_memory.py
echo   3. Verify automatic mirroring works
echo.
echo ================================================================================
