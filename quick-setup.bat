@echo off
setlocal enabledelayedexpansion

REM Survey Project - Complete Setup Script
REM This script sets up everything needed to run the survey project on Windows

color 0A
echo.
echo  ███████╗██╗   ██╗██████╗ ██╗   ██╗███████╗██╗   ██╗
echo  ██╔════╝██║   ██║██╔══██╗██║   ██║██╔════╝╚██╗ ██╔╝
echo  ███████╗██║   ██║██████╔╝██║   ██║█████╗   ╚████╔╝ 
echo  ╚════██║██║   ██║██╔══██╗╚██╗ ██╔╝██╔══╝    ╚██╔╝  
echo  ███████║╚██████╔╝██║  ██║ ╚████╔╝ ███████╗   ██║   
echo  ╚══════╝ ╚═════╝ ╚═╝  ╚═╝  ╚═══╝  ╚══════╝   ╚═╝   
echo.
echo            Complete Windows Setup Script
echo ========================================================
color 07
echo.

REM Step 1: Check Node.js
echo [1/8] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Node.js is not installed
    echo.
    echo Please install Node.js first:
    echo 1. Go to https://nodejs.org/
    echo 2. Download the LTS version
    echo 3. Install with default settings
    echo 4. Restart this script
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo ✅ Node.js !NODE_VERSION! found
)
echo.

REM Step 2: Check npm
echo [2/8] Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: npm is not available
    echo Please reinstall Node.js
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo ✅ npm !NPM_VERSION! found
)
echo.

REM Step 3: Check MongoDB
echo [3/8] Checking MongoDB...
mongo --eval "db.runCommand('ping')" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  MongoDB not detected or not running
    echo.
    echo MongoDB Setup Options:
    echo 1. Install MongoDB Community Server locally
    echo    - Download: https://www.mongodb.com/try/download/community
    echo    - Start service: net start MongoDB
    echo.
    echo 2. Use MongoDB Atlas (cloud)
    echo    - Create account: https://cloud.mongodb.com/
    echo    - Get connection string
    echo    - Update .env file
    echo.
    echo 3. Continue anyway (if using Atlas)
    echo.
    choice /c 123 /m "Choose option"
    if !errorlevel!==1 (
        echo Please install MongoDB and restart this script
        pause
        exit /b 1
    )
    if !errorlevel!==2 (
        echo Please set up Atlas and update .env file manually
    )
    echo Continuing with setup...
) else (
    echo ✅ MongoDB connection successful
)
echo.

REM Step 4: Environment setup
echo [4/8] Setting up environment...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo ✅ Created .env from template
    ) else (
        echo MONGODB_URI=mongodb://localhost:27017/survey-forms > .env
        echo PORT=3001 >> .env
        echo NODE_ENV=development >> .env
        echo ✅ Created default .env file
    )
    echo ⚠️  Please edit .env file if using MongoDB Atlas
) else (
    echo ✅ .env file already exists
)
echo.

REM Step 5: Install dependencies
echo [5/8] Installing dependencies...
if not exist "node_modules" (
    echo Installing npm packages...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ ERROR: Failed to install dependencies
        echo Try running: npm install --force
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed
) else (
    echo ✅ Dependencies already installed
)
echo.

REM Step 6: Test database
echo [6/8] Testing database connection...
node test-db.js
if %errorlevel% neq 0 (
    echo ❌ ERROR: Database connection failed
    echo.
    echo Troubleshooting:
    echo 1. Check if MongoDB is running: net start MongoDB
    echo 2. Verify .env file has correct MONGODB_URI
    echo 3. For Atlas: check connection string and IP whitelist
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Database connection successful
)
echo.

REM Step 7: Create sample data
echo [7/8] Creating sample data...
echo Creating form types...
node create-dashboard-sample-data.js
if %errorlevel% neq 0 (
    echo ⚠️  Form types creation had issues (might already exist)
) else (
    echo ✅ Form types created
)

echo Starting temporary server...
start /b node server.js
timeout /t 3 /nobreak >nul

echo Creating sample forms...
node create-sample-data.js
if %errorlevel% neq 0 (
    echo ⚠️  Sample forms creation had issues (might already exist)
) else (
    echo ✅ Sample forms created
)

echo Stopping temporary server...
taskkill /f /im node.exe >nul 2>&1
echo.

REM Step 8: Verification
echo [8/8] Verifying setup...
node -e "const mongoose = require('mongoose'); require('dotenv').config(); mongoose.connect(process.env.MONGODB_URI).then(async () => { const Form = require('./models/Form'); const FormType = require('./models/FormType'); const Response = require('./models/Response'); const formCount = await Form.countDocuments(); const typeCount = await FormType.countDocuments(); const responseCount = await Response.countDocuments(); console.log('✅ Setup verification complete'); console.log('📊 Collections created:'); console.log('   - Forms: ' + formCount); console.log('   - Form Types: ' + typeCount); console.log('   - Responses: ' + responseCount); process.exit(0); }).catch(err => { console.error('❌ Verification failed:', err.message); process.exit(1); });"

if %errorlevel% neq 0 (
    echo ❌ Setup verification failed
    pause
    exit /b 1
)

REM Success message
color 0A
echo.
echo ========================================================
echo 🎉 SETUP COMPLETE! 🎉
echo ========================================================
color 07
echo.
echo Your survey project is ready to use!
echo.
echo 🚀 Quick Start:
echo    npm start                    # Start the server
echo    node server.js               # Alternative start method
echo.
echo 🌐 URLs to visit:
echo    http://localhost:3001/dashboard.html    # Main dashboard
echo    http://localhost:3001/forms.html        # Forms management
echo    http://localhost:3001/form-builder.html # Create new forms
echo.
echo 📁 Important files:
echo    .env                         # Environment configuration
echo    MONGODB-SETUP-README.md      # Detailed setup guide
echo.
echo 🔧 Troubleshooting:
echo    - Check console for any error messages
echo    - Ensure MongoDB is running
echo    - Verify .env file configuration
echo.
echo Would you like to start the server now?
choice /c YN /m "Start server"
if !errorlevel!==1 (
    echo.
    echo Starting server...
    echo Visit http://localhost:3001/dashboard.html when ready
    echo Press Ctrl+C to stop the server
    echo.
    node server.js
) else (
    echo.
    echo You can start the server later with: npm start
    echo.
)

echo.
echo Thank you for using the Survey Project!
pause