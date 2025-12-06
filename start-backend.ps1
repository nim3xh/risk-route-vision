# Start Backend Server
# This script starts the FastAPI backend on port 8080

Write-Host "Starting Risk Route Vision Backend on port 8080..." -ForegroundColor Green
Write-Host ""

# Change to backend directory
Set-Location -Path "$PSScriptRoot\back-end"

# Check if virtual environment exists
if (Test-Path ".venv") {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    .\.venv\Scripts\Activate.ps1
} elseif (Test-Path "venv") {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    .\venv\Scripts\Activate.ps1
}

# Start uvicorn
Write-Host "Starting Uvicorn server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Backend will be available at:" -ForegroundColor Cyan
Write-Host "  - API: http://localhost:8080/api/v1" -ForegroundColor Cyan
Write-Host "  - Health: http://localhost:8080/health" -ForegroundColor Cyan
Write-Host "  - Docs: http://localhost:8080/docs" -ForegroundColor Cyan
Write-Host ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
