@echo off
REM Stop script for Windows

set CONTAINER_NAME=pm-mvp

echo.
echo Stopping container...

for /f %%i in ('docker ps -a --format "{{.Names}}" ^| find /c "%CONTAINER_NAME%"') do set count=%%i

if %count% gtr 0 (
    docker stop %CONTAINER_NAME% >nul 2>&1
    docker rm %CONTAINER_NAME% >nul 2>&1
    echo Container stopped and removed
) else (
    echo Container not running
)
