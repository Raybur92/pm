@echo off
REM Start script for Windows - builds and runs full PM MVP application

setlocal enabledelayedexpansion
set PROJECT_DIR=%~dp0..
cd /d "%PROJECT_DIR%"

REM Check if .env file exists
if not exist .env (
    echo Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo WARNING: Please update .env with your OPENROUTER_API_KEY
)

REM Build the Docker image (multi-stage: frontend + backend)
echo.
echo Building Docker image (Frontend + Backend)...
docker build -t pm-mvp:latest .

REM Run the container
echo.
echo Starting container on http://localhost:8000...
docker run -d ^
    --name pm-mvp ^
    -p 8000:8000 ^
    --env-file .env ^
    pm-mvp:latest

echo.
echo Server started!
echo Kanban Board: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Health: http://localhost:8000/health
