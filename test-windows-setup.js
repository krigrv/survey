#!/usr/bin/env node

/**
 * Windows Setup Test Script
 * Tests if the environment is properly configured for Windows
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🪟 Survey Form Builder - Windows Setup Test');
console.log('=' .repeat(50));
console.log();

// Test results
let tests = [];
let passed = 0;
let failed = 0;

function test(name, condition, message = '') {
    const result = condition;
    tests.push({ name, result, message });
    
    if (result) {
        console.log(`✅ ${name}`);
        passed++;
    } else {
        console.log(`❌ ${name}${message ? ` - ${message}` : ''}`);
        failed++;
    }
}

// System Information
console.log('📊 System Information:');
console.log(`   Platform: ${os.platform()}`);
console.log(`   Architecture: ${os.arch()}`);
console.log(`   Node.js Version: ${process.version}`);
console.log(`   Working Directory: ${process.cwd()}`);
console.log();

// Test 1: Check if running on Windows
test(
    'Running on Windows',
    os.platform() === 'win32',
    'This test is designed for Windows systems'
);

// Test 2: Check Node.js version
const nodeVersion = process.version.slice(1).split('.').map(Number);
test(
    'Node.js version >= 14.0.0',
    nodeVersion[0] >= 14,
    `Current version: ${process.version}`
);

// Test 3: Check if package.json exists
test(
    'package.json exists',
    fs.existsSync('package.json'),
    'Run this script from the project root directory'
);

// Test 4: Check if node_modules exists
test(
    'Dependencies installed (node_modules exists)',
    fs.existsSync('node_modules'),
    'Run "npm install" to install dependencies'
);

// Test 5: Check if .env file exists
test(
    '.env file exists',
    fs.existsSync('.env'),
    'Copy .env.example to .env and configure it'
);

// Test 6: Check if .env.example exists
test(
    '.env.example file exists',
    fs.existsSync('.env.example'),
    'Template file missing from project'
);

// Test 7: Check if server.js exists
test(
    'server.js exists',
    fs.existsSync('server.js'),
    'Main server file missing'
);

// Test 8: Check if public directory exists
test(
    'public directory exists',
    fs.existsSync('public') && fs.statSync('public').isDirectory(),
    'Static files directory missing'
);

// Test 9: Check if routes directory exists
test(
    'routes directory exists',
    fs.existsSync('routes') && fs.statSync('routes').isDirectory(),
    'API routes directory missing'
);

// Test 10: Check if models directory exists
test(
    'models directory exists',
    fs.existsSync('models') && fs.statSync('models').isDirectory(),
    'Database models directory missing'
);

// Test 11: Check environment variables (if .env exists)
if (fs.existsSync('.env')) {
    require('dotenv').config();
    
    test(
        'MONGODB_URI configured',
        !!process.env.MONGODB_URI && process.env.MONGODB_URI !== 'mongodb+srv://username:password@cluster.mongodb.net/survey-forms?retryWrites=true&w=majority',
        'Update MONGODB_URI in .env file'
    );
    
    test(
        'JWT_SECRET configured',
        !!process.env.JWT_SECRET && process.env.JWT_SECRET !== 'your-super-secret-jwt-key-here',
        'Update JWT_SECRET in .env file'
    );
    
    test(
        'PORT configured',
        !!process.env.PORT,
        'PORT should be set in .env file'
    );
}

// Test 12: Check if Windows setup scripts exist
test(
    'Windows PowerShell setup script exists',
    fs.existsSync('setup-windows.ps1'),
    'PowerShell setup script missing'
);

test(
    'Windows batch setup script exists',
    fs.existsSync('setup-windows.bat'),
    'Batch setup script missing'
);

// Test 13: Check if Windows documentation exists
test(
    'Windows setup documentation exists',
    fs.existsSync('WINDOWS_SETUP.md'),
    'Windows setup guide missing'
);

// Test 14: Check npm scripts
if (fs.existsSync('package.json')) {
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const scripts = packageJson.scripts || {};
        
        test(
            'Windows setup scripts configured',
            scripts['setup:windows'] && scripts['setup:windows-cmd'],
            'Windows setup scripts missing from package.json'
        );
        
        test(
            'Basic npm scripts exist',
            scripts.start && scripts.dev,
            'start or dev scripts missing from package.json'
        );
    } catch (error) {
        test(
            'package.json is valid JSON',
            false,
            'package.json contains invalid JSON'
        );
    }
}

// Test 15: Check if port is available (basic check)
const net = require('net');
const port = process.env.PORT || 3001;

const server = net.createServer();
server.listen(port, () => {
    test(
        `Port ${port} is available`,
        true
    );
    server.close();
    showResults();
});

server.on('error', (err) => {
    test(
        `Port ${port} is available`,
        false,
        `Port ${port} is already in use`
    );
    showResults();
});

function showResults() {
    console.log();
    console.log('📋 Test Results:');
    console.log('=' .repeat(50));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${tests.length}`);
    console.log();
    
    if (failed === 0) {
        console.log('🎉 All tests passed! Your Windows setup looks good.');
        console.log('   You can now run "npm start" to start the server.');
    } else {
        console.log('⚠️  Some tests failed. Please fix the issues above.');
        console.log('   Check WINDOWS_SETUP.md for detailed setup instructions.');
    }
    
    console.log();
    console.log('💡 Useful commands:');
    console.log('   npm start              - Start the server');
    console.log('   npm run dev            - Start with auto-restart');
    console.log('   npm run setup:windows  - Run Windows setup script');
    console.log('   npm run test:connection - Test database connection');
    console.log();
}