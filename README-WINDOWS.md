# Survey Form Builder - Windows Quick Start

🚀 **Quick setup for Windows users**

## One-Click Setup

### Option 1: PowerShell (Recommended)
```powershell
# Right-click and "Run as Administrator" (if needed)
powershell -ExecutionPolicy Bypass -File setup-windows.ps1
```

### Option 2: Command Prompt
```cmd
setup-windows.bat
```

### Option 3: Using npm
```cmd
npm run setup:windows
```

## Manual Setup

If the automated setup doesn't work:

1. **Install Node.js** (if not already installed)
   - Download from [nodejs.org](https://nodejs.org/)
   - Choose LTS version

2. **Clone/Download the project**
   ```cmd
   git clone <repository-url>
   cd survey
   ```

3. **Install dependencies**
   ```cmd
   npm install
   ```

4. **Setup environment**
   ```cmd
   copy .env.example .env
   ```
   Edit `.env` file with your MongoDB connection and other settings.

5. **Start the server**
   ```cmd
   npm start
   ```

## Windows-Specific Commands

| Command | Description |
|---------|-------------|
| `npm run setup:windows` | Run PowerShell setup script |
| `npm run setup:windows-cmd` | Run batch setup script |
| `npm start` | Start the server |
| `npm run dev` | Start with auto-restart |
| `npm run test:connection` | Test database connection |
| `npm run clean` | Clean node_modules |
| `npm run reinstall` | Clean and reinstall dependencies |

## Common Windows Issues

### 1. PowerShell Execution Policy
**Error:** "execution of scripts is disabled on this system"

**Solution:**
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 2. Port Already in Use
**Error:** "EADDRINUSE: address already in use :::3001"

**Solution:**
```cmd
# Find process using the port
netstat -ano | findstr :3001

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### 3. Node.js Not Found
**Error:** "'node' is not recognized as an internal or external command"

**Solution:**
- Restart Command Prompt/PowerShell after Node.js installation
- Add Node.js to PATH manually if needed

### 4. npm Install Fails
**Error:** Various npm installation errors

**Solution:**
```cmd
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
npm run reinstall
```

### 5. MongoDB Connection Issues
**Error:** "MongoNetworkError" or connection timeout

**Solutions:**
- Check internet connection (for MongoDB Atlas)
- Verify MongoDB URI in `.env` file
- Ensure MongoDB service is running (for local installation)
- Check Windows Firewall settings

## Environment Variables

### Setting in Command Prompt
```cmd
set NODE_ENV=development
set PORT=3001
```

### Setting in PowerShell
```powershell
$env:NODE_ENV="development"
$env:PORT="3001"
```

### Permanent Environment Variables
1. Open System Properties → Advanced → Environment Variables
2. Add new variables under "User variables" or "System variables"

## Development Tools for Windows

### Recommended
- **Windows Terminal** - Better terminal experience
- **Visual Studio Code** - Excellent Node.js support
- **Git for Windows** - Includes Git Bash
- **Postman** - API testing

### Optional
- **MongoDB Compass** - GUI for MongoDB
- **Nodemon** - Auto-restart server (included in devDependencies)

## File Paths

Windows uses backslashes (`\`) for file paths, but Node.js handles this automatically. The application will work correctly on Windows without any path modifications.

## Performance Tips

1. **Exclude from Windows Defender**
   - Add project folder to Windows Defender exclusions
   - Speeds up file operations and npm installs

2. **Use SSD**
   - Store project on SSD for better performance
   - Especially important for `node_modules` folder

3. **Close unnecessary applications**
   - Free up RAM and CPU for better development experience

## Troubleshooting Checklist

- [ ] Node.js installed and in PATH
- [ ] npm working (`npm --version`)
- [ ] `.env` file created and configured
- [ ] MongoDB connection string correct
- [ ] Port 3001 available (or changed in `.env`)
- [ ] Windows Firewall allows Node.js
- [ ] Internet connection working (for MongoDB Atlas)

## Getting Help

1. Check the main [WINDOWS_SETUP.md](./WINDOWS_SETUP.md) for detailed instructions
2. Run `npm run test:connection` to test database connectivity
3. Check console output for specific error messages
4. Ensure all prerequisites are installed correctly

---

**Happy coding on Windows! 🪟✨**