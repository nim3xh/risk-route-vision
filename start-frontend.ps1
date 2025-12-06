# Start Frontend Development Server
# This script starts the Vite frontend on port 5173

Write-Host "Starting Risk Route Vision Frontend on port 5173..." -ForegroundColor Green
Write-Host ""

# Change to frontend directory
Set-Location -Path "$PSScriptRoot\front-end"

# Check if bun is available
$bunExists = Get-Command bun -ErrorAction SilentlyContinue

if ($bunExists) {
    Write-Host "Using Bun to start development server..." -ForegroundColor Yellow
    bun run dev
} else {
    Write-Host "Bun not found, using npm..." -ForegroundColor Yellow
    npm run dev
}
