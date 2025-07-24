# MongoDB Collections Setup for Windows

This guide helps you set up MongoDB collections and sample data for the Survey Project on a new Windows laptop.

## Prerequisites

### Required Software
1. **Node.js** (v14 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **MongoDB Community Server**
   - Download from: https://www.mongodb.com/try/download/community
   - Or use MongoDB Atlas (cloud) with connection string

### MongoDB Installation Options

#### Option A: Local MongoDB (Recommended for Development)
1. Download MongoDB Community Server
2. Install with default settings
3. Start MongoDB service:
   ```cmd
   net start MongoDB
   ```
   Or manually:
   ```cmd
   mongod
   ```

#### Option B: MongoDB Atlas (Cloud)
1. Create account at https://cloud.mongodb.com/
2. Create a free cluster
3. Get connection string
4. Update `.env` file with your connection string

## Quick Setup

### Method 1: Batch File (Simple)
```cmd
# Navigate to project folder
cd path\to\survey\project

# Run setup script
setup-mongodb-collections.bat
```

### Method 2: PowerShell (Recommended)
```powershell
# Navigate to project folder
cd path\to\survey\project

# Run setup script
.\setup-mongodb-collections.ps1
```

### Method 3: Manual Setup
```cmd
# 1. Install dependencies
npm install

# 2. Create environment file
copy .env.example .env
# Edit .env with your MongoDB connection

# 3. Test database connection
node test-db.js

# 4. Create sample data
node create-dashboard-sample-data.js
node create-sample-data.js

# 5. Start server
npm start
```

## What Gets Created

### Collections
- **forms** - Survey forms and configurations
- **formtypes** - Form categories (Customer Feedback, Event Registration, Survey)
- **responses** - Sample user responses
- **users** - User accounts (if authentication is enabled)

### Sample Data
- 3 Form Types with icons and descriptions
- Multiple sample forms with various field types
- Test responses for analytics and reporting
- Dashboard data for overview statistics

## Configuration

### Environment Variables (.env)
```env
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/survey-forms

# MongoDB Atlas (replace with your connection string)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/survey-forms

# Server configuration
PORT=3001
NODE_ENV=development
```

## Verification

After setup, verify everything works:

1. **Start the server:**
   ```cmd
   npm start
   ```

2. **Check endpoints:**
   - Dashboard: http://localhost:3001/dashboard.html
   - Forms: http://localhost:3001/forms.html
   - API: http://localhost:3001/api/dashboard/overview

3. **Verify collections:**
   ```cmd
   node -e "require('./models/Form').countDocuments().then(count => console.log('Forms:', count))"
   ```

## Troubleshooting

### Common Issues

**MongoDB Connection Failed:**
- Ensure MongoDB service is running: `net start MongoDB`
- Check connection string in `.env` file
- For Atlas: verify IP whitelist and credentials

**Node.js Not Found:**
- Install Node.js from https://nodejs.org/
- Restart command prompt after installation
- Verify with: `node --version`

**Permission Errors:**
- Run PowerShell as Administrator
- Enable script execution: `Set-ExecutionPolicy RemoteSigned`

**Port Already in Use:**
- Change PORT in `.env` file
- Or stop existing Node.js processes: `taskkill /f /im node.exe`

### Manual Database Check

```cmd
# Connect to MongoDB shell
mongo

# Switch to database
use survey-forms

# Check collections
show collections

# Count documents
db.forms.count()
db.formtypes.count()
db.responses.count()
```

## File Structure After Setup

```
survey/
├── .env                              # Environment configuration
├── setup-mongodb-collections.bat     # Windows batch setup script
├── setup-mongodb-collections.ps1     # PowerShell setup script
├── create-dashboard-sample-data.js   # Creates form types
├── create-sample-data.js             # Creates forms and responses
├── test-db.js                        # Database connection test
├── models/                           # MongoDB schemas
│   ├── Form.js
│   ├── FormType.js
│   └── Response.js
└── public/                           # Frontend files
    ├── dashboard.html
    ├── forms.html
    └── js/
```

## Next Steps

After successful setup:
1. Customize form types in the database
2. Create your own forms using the form builder
3. Configure authentication if needed
4. Deploy to production environment

## Support

If you encounter issues:
1. Check the console output for error messages
2. Verify all prerequisites are installed
3. Ensure MongoDB is running and accessible
4. Check the `.env` file configuration

For development, you can always reset the database and run the setup scripts again.