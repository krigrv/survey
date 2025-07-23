@echo off
echo ========================================
echo Survey Form Builder - Windows Setup
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please download and install Node.js from https://nodejs.org/
    echo Then run this script again.
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

echo NPM version:
npm --version
echo.

REM Check if .env file exists
if not exist ".env" (
    echo Creating .env file from template...
    copy ".env.example" ".env"
    echo.
    echo IMPORTANT: Please edit the .env file with your configuration:
    echo - Update MONGODB_URI with your MongoDB connection string
    echo - Change JWT_SECRET to a secure random string
    echo - Update admin credentials if needed
    echo.
) else (
    echo .env file already exists.
    echo.
)

REM Install dependencies
echo Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Edit the .env file with your configuration
echo 2. Make sure MongoDB is running (local) or configured (Atlas)
echo 3. Run 'npm start' to start the server
echo 4. Open http://localhost:3001 in your browser
echo.
echo For development with auto-restart, use: npm run dev
echo.
echo Press any key to exit...
pause >nul