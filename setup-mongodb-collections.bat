@echo off
echo ========================================
echo Survey Project - MongoDB Setup Script
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if MongoDB is running
echo Checking MongoDB connection...
mongo --eval "db.runCommand('ping')" >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: MongoDB might not be running locally
    echo Please ensure MongoDB is installed and running on localhost:27017
    echo You can start MongoDB with: mongod
    echo.
    echo Continuing anyway...
    echo.
)

REM Check if .env file exists
if not exist ".env" (
    echo Creating .env file from template...
    if exist ".env.example" (
        copy ".env.example" ".env"
        echo .env file created. Please edit it with your MongoDB connection string if needed.
    ) else (
        echo Creating default .env file...
        echo MONGODB_URI=mongodb://localhost:27017/survey-forms > .env
        echo PORT=3001 >> .env
        echo NODE_ENV=development >> .env
    )
    echo.
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing project dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

REM Test database connection
echo Testing database connection...
node test-db.js
if %errorlevel% neq 0 (
    echo ERROR: Database connection failed
    echo Please check your MongoDB installation and .env configuration
    pause
    exit /b 1
)
echo Database connection successful!
echo.

REM Create dashboard sample data
echo Creating dashboard sample data (Form Types)...
node create-dashboard-sample-data.js
if %errorlevel% neq 0 (
    echo WARNING: Dashboard sample data creation failed
    echo This might be normal if data already exists
else
    echo Dashboard sample data created successfully!
)
echo.

REM Start server in background for API calls
echo Starting server temporarily for sample data creation...
start /b node server.js
echo Waiting for server to start...
timeout /t 5 /nobreak >nul

REM Create sample forms and responses
echo Creating sample forms and responses...
node create-sample-data.js
if %errorlevel% neq 0 (
    echo WARNING: Sample forms creation failed
    echo This might be normal if data already exists
else
    echo Sample forms and responses created successfully!
)
echo.

REM Stop the temporary server
echo Stopping temporary server...
taskkill /f /im node.exe >nul 2>&1
echo.

REM Verify collections were created
echo Verifying MongoDB collections...
node -e "const mongoose = require('mongoose'); require('dotenv').config(); mongoose.connect(process.env.MONGODB_URI).then(async () => { const Form = require('./models/Form'); const FormType = require('./models/FormType'); const Response = require('./models/Response'); const formCount = await Form.countDocuments(); const typeCount = await FormType.countDocuments(); const responseCount = await Response.countDocuments(); console.log('\n=== SETUP COMPLETE ==='); console.log('Forms created:', formCount); console.log('Form types created:', typeCount); console.log('Responses created:', responseCount); console.log('\nYou can now start the server with: npm start'); console.log('Or run: node server.js'); console.log('Then visit: http://localhost:3001/dashboard.html'); process.exit(0); }).catch(err => { console.error('Verification failed:', err.message); process.exit(1); });"

if %errorlevel% neq 0 (
    echo ERROR: Collection verification failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo MongoDB Collections Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Run 'npm start' or 'node server.js' to start the server
echo 2. Open http://localhost:3001/dashboard.html in your browser
echo 3. Explore the forms at http://localhost:3001/forms.html
echo.
echo Press any key to exit...
pause >nul