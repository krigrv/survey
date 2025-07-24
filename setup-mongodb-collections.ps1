# Survey Project - MongoDB Setup Script (PowerShell)
# This script sets up MongoDB collections and sample data for the survey project

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Survey Project - MongoDB Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check if Node.js is installed
if (-not (Test-Command "node")) {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

$nodeVersion = node --version
Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green

# Check if MongoDB is accessible
Write-Host "Checking MongoDB connection..." -ForegroundColor Yellow
try {
    $mongoTest = mongo --eval "db.runCommand('ping')" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "MongoDB connection successful!" -ForegroundColor Green
    } else {
        Write-Host "WARNING: MongoDB might not be running locally" -ForegroundColor Yellow
        Write-Host "Please ensure MongoDB is installed and running on localhost:27017" -ForegroundColor Yellow
        Write-Host "You can start MongoDB with: mongod" -ForegroundColor Yellow
        Write-Host "Continuing anyway..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "WARNING: Could not test MongoDB connection" -ForegroundColor Yellow
    Write-Host "Continuing anyway..." -ForegroundColor Yellow
}
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host ".env file created from template." -ForegroundColor Green
    } else {
        Write-Host "Creating default .env file..." -ForegroundColor Yellow
        @"
MONGODB_URI=mongodb://localhost:27017/survey-forms
PORT=3001
NODE_ENV=development
"@ | Out-File -FilePath ".env" -Encoding UTF8
        Write-Host "Default .env file created." -ForegroundColor Green
    }
    Write-Host "Please edit .env file with your MongoDB connection string if needed." -ForegroundColor Cyan
    Write-Host ""
}

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing project dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "Dependencies installed successfully!" -ForegroundColor Green
    Write-Host ""
}

# Test database connection
Write-Host "Testing database connection..." -ForegroundColor Yellow
node test-db.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Database connection failed" -ForegroundColor Red
    Write-Host "Please check your MongoDB installation and .env configuration" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Database connection successful!" -ForegroundColor Green
Write-Host ""

# Create dashboard sample data
Write-Host "Creating dashboard sample data (Form Types)..." -ForegroundColor Yellow
node create-dashboard-sample-data.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Dashboard sample data creation failed" -ForegroundColor Yellow
    Write-Host "This might be normal if data already exists" -ForegroundColor Gray
} else {
    Write-Host "Dashboard sample data created successfully!" -ForegroundColor Green
}
Write-Host ""

# Start server in background for API calls
Write-Host "Starting server temporarily for sample data creation..." -ForegroundColor Yellow
$serverJob = Start-Job -ScriptBlock { 
    Set-Location $using:PWD
    node server.js 
}

Write-Host "Waiting for server to start..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Create sample forms and responses
Write-Host "Creating sample forms and responses..." -ForegroundColor Yellow
node create-sample-data.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Sample forms creation failed" -ForegroundColor Yellow
    Write-Host "This might be normal if data already exists" -ForegroundColor Gray
} else {
    Write-Host "Sample forms and responses created successfully!" -ForegroundColor Green
}
Write-Host ""

# Stop the temporary server
Write-Host "Stopping temporary server..." -ForegroundColor Yellow
Stop-Job $serverJob -ErrorAction SilentlyContinue
Remove-Job $serverJob -ErrorAction SilentlyContinue
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node.exe" } | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host ""

# Verify collections were created
Write-Host "Verifying MongoDB collections..." -ForegroundColor Yellow
$verificationScript = @"
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Form = require('./models/Form');
    const FormType = require('./models/FormType');
    const Response = require('./models/Response');
    const formCount = await Form.countDocuments();
    const typeCount = await FormType.countDocuments();
    const responseCount = await Response.countDocuments();
    console.log('\n=== SETUP COMPLETE ===');
    console.log('Forms created:', formCount);
    console.log('Form types created:', typeCount);
    console.log('Responses created:', responseCount);
    console.log('\nYou can now start the server with: npm start');
    console.log('Or run: node server.js');
    console.log('Then visit: http://localhost:3001/dashboard.html');
    process.exit(0);
}).catch(err => {
    console.error('Verification failed:', err.message);
    process.exit(1);
});
"@

node -e $verificationScript

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Collection verification failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MongoDB Collections Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run 'npm start' or 'node server.js' to start the server" -ForegroundColor White
Write-Host "2. Open http://localhost:3001/dashboard.html in your browser" -ForegroundColor White
Write-Host "3. Explore the forms at http://localhost:3001/forms.html" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to exit"