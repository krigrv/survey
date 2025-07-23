# Windows Setup Guide for Survey Form Builder

This guide will help you set up and run the Survey Form Builder project on a Windows laptop.

## Prerequisites

### 1. Install Node.js
- Download Node.js from [https://nodejs.org/](https://nodejs.org/)
- Choose the LTS version (recommended)
- Run the installer and follow the setup wizard
- Verify installation by opening Command Prompt or PowerShell and running:
  ```cmd
  node --version
  npm --version
  ```

### 2. Install Git (Optional but recommended)
- Download Git from [https://git-scm.com/download/win](https://git-scm.com/download/win)
- Run the installer with default settings
- Verify installation:
  ```cmd
  git --version
  ```

### 3. Code Editor
- Install Visual Studio Code from [https://code.visualstudio.com/](https://code.visualstudio.com/)
- Or use any preferred code editor

## Project Setup

### 1. Download/Clone the Project

**Option A: Using Git (if installed)**
```cmd
git clone <repository-url>
cd survey
```

**Option B: Download ZIP**
- Download the project as a ZIP file
- Extract to a folder (e.g., `C:\Projects\survey`)
- Open Command Prompt or PowerShell in that folder

### 2. Install Dependencies
```cmd
npm install
```

### 3. Environment Configuration

1. Copy the example environment file:
   ```cmd
   copy .env.example .env
   ```

2. Edit the `.env` file with your configuration:
   ```env
   # Database Configuration
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/survey-forms?retryWrites=true&w=majority
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=7d
   
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   CLIENT_URL=http://localhost:3001
   
   # Admin Configuration
   SUPER_ADMIN_EMAIL=admin@example.com
   SUPER_ADMIN_PASSWORD=Admin123!
   
   # Application Settings
   APP_NAME=Survey Form Builder
   APP_VERSION=1.0.0
   ```

### 4. MongoDB Setup

**Option A: MongoDB Atlas (Cloud - Recommended)**
1. Go to [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free account
3. Create a new cluster
4. Get your connection string and update `MONGODB_URI` in `.env`

**Option B: Local MongoDB**
1. Download MongoDB Community Server from [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Install with default settings
3. Update `.env` with: `MONGODB_URI=mongodb://localhost:27017/survey-forms`

## Running the Application

### 1. Start the Server
```cmd
npm start
```

Or for development with auto-restart:
```cmd
npm run dev
```

### 2. Access the Application
Open your web browser and go to:
- `http://localhost:3001` (or the port specified in your `.env` file)

## Windows-Specific Considerations

### 1. Path Separators
The application uses Node.js `path` module which automatically handles Windows path separators (`\` vs `/`), so no changes needed.

### 2. Environment Variables
- Use `set` command in Command Prompt: `set NODE_ENV=production`
- Use `$env:` in PowerShell: `$env:NODE_ENV="production"`

### 3. Port Configuration
If port 3001 is already in use:
1. Change `PORT` in `.env` file to another port (e.g., 3002, 8000)
2. Or find and stop the process using the port:
   ```cmd
   netstat -ano | findstr :3001
   taskkill /PID <process_id> /F
   ```

### 4. Firewall Settings
Windows Defender might prompt to allow Node.js through the firewall. Click "Allow" to enable network access.

## Troubleshooting

### Common Issues

**1. "npm is not recognized"**
- Restart Command Prompt/PowerShell after Node.js installation
- Add Node.js to PATH manually if needed

**2. "Cannot find module" errors**
- Delete `node_modules` folder and `package-lock.json`
- Run `npm install` again

**3. MongoDB connection issues**
- Check your internet connection (for Atlas)
- Verify MongoDB URI in `.env` file
- Ensure MongoDB service is running (for local installation)

**4. Port already in use**
- Change the PORT in `.env` file
- Or stop the conflicting process

**5. Permission errors**
- Run Command Prompt/PowerShell as Administrator
- Or use `npm config set prefix` to change npm global directory

### Development Tools

**Install nodemon globally (optional):**
```cmd
npm install -g nodemon
```

**Useful npm scripts:**
- `npm start` - Start the server
- `npm run dev` - Start with nodemon (auto-restart)
- `npm test` - Run tests (if available)

## Project Structure
```
survey/
├── models/          # Database models
├── routes/          # API routes
├── middleware/      # Custom middleware
├── public/          # Static files (HTML, CSS, JS)
├── .env            # Environment variables
├── server.js       # Main server file
└── package.json    # Dependencies and scripts
```

## Additional Windows Tools

### 1. Windows Terminal (Recommended)
- Install from Microsoft Store
- Better terminal experience than Command Prompt

### 2. Git Bash (Alternative terminal)
- Comes with Git installation
- Unix-like commands on Windows

### 3. Postman (API Testing)
- Download from [https://www.postman.com/](https://www.postman.com/)
- Test API endpoints

## Security Notes

1. Never commit `.env` file to version control
2. Use strong passwords for admin accounts
3. Keep dependencies updated: `npm audit fix`
4. Use HTTPS in production

## Support

If you encounter issues:
1. Check this troubleshooting guide
2. Verify all prerequisites are installed
3. Check the console for error messages
4. Ensure all environment variables are set correctly

---

**Happy coding! 🚀**