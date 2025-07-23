# Survey Form Builder - Windows PowerShell Setup Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Survey Form Builder - Windows Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check if Node.js is installed
if (-not (Test-Command "node")) {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please download and install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "Then run this script again." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Node.js version:" -ForegroundColor Green
node --version
Write-Host ""

Write-Host "NPM version:" -ForegroundColor Green
npm --version
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host ""
    Write-Host "IMPORTANT: Please edit the .env file with your configuration:" -ForegroundColor Magenta
    Write-Host "- Update MONGODB_URI with your MongoDB connection string" -ForegroundColor White
    Write-Host "- Change JWT_SECRET to a secure random string" -ForegroundColor White
    Write-Host "- Update admin credentials if needed" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ".env file already exists." -ForegroundColor Green
    Write-Host ""
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
} catch {
    Write-Host "ERROR: Failed to install dependencies!" -ForegroundColor Red
    Write-Host "Please check your internet connection and try again." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Setup completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit the .env file with your configuration" -ForegroundColor White
Write-Host "2. Make sure MongoDB is running (local) or configured (Atlas)" -ForegroundColor White
Write-Host "3. Run 'npm start' to start the server" -ForegroundColor White
Write-Host "4. Open http://localhost:3001 in your browser" -ForegroundColor White
Write-Host ""
Write-Host "For development with auto-restart, use: npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "- npm start          : Start the server" -ForegroundColor White
Write-Host "- npm run dev        : Start with auto-restart" -ForegroundColor White
Write-Host "- npm install        : Install dependencies" -ForegroundColor White
Write-Host "- npm audit fix      : Fix security vulnerabilities" -ForegroundColor White
Write-Host ""

# Ask if user wants to start the server
$startServer = Read-Host "Would you like to start the server now? (y/N)"
if ($startServer -eq "y" -or $startServer -eq "Y") {
    Write-Host "Starting server..." -ForegroundColor Green
    npm start
} else {
    Write-Host "Setup complete. Run 'npm start' when ready to start the server." -ForegroundColor Green
}

Read-Host "Press Enter to exit"