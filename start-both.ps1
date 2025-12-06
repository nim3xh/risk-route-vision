# Start Both Backend and Frontend
# This script starts both servers in separate windows

Write-Host "Starting Risk Route Vision - Full Stack" -ForegroundColor Green
Write-Host ""

# Start Backend in new PowerShell window
Write-Host "Starting Backend in new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-File", "$PSScriptRoot\start-backend.ps1"

# Wait a moment for backend to initialize
Start-Sleep -Seconds 2

# Start Frontend in new PowerShell window
Write-Host "Starting Frontend in new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-File", "$PSScriptRoot\start-frontend.ps1"

Write-Host ""
Write-Host "Both servers are starting..." -ForegroundColor Green
Write-Host ""
Write-Host "Access the application at:" -ForegroundColor Cyan
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  - Backend API: http://localhost:8080/api/v1" -ForegroundColor Cyan
Write-Host "  - API Docs: http://localhost:8080/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
