# Survey Form Builder

A comprehensive form builder web application with role-based access control, built with Node.js, Express, and MongoDB.

## 🚀 Quick Start

### Windows Users
**One-click setup for Windows:**
```cmd
# PowerShell (Recommended)
npm run setup:windows

# Or Command Prompt
npm run setup:windows-cmd
```

📖 **Detailed Windows Guide:** [WINDOWS_SETUP.md](./WINDOWS_SETUP.md) | [README-WINDOWS.md](./README-WINDOWS.md)

### All Platforms

1. **Prerequisites**
   - Node.js 14+ ([Download](https://nodejs.org/))
   - MongoDB (Local or [Atlas](https://www.mongodb.com/atlas))

2. **Installation**
   ```bash
   # Clone the repository
   git clone <repository-url>
   cd survey
   
   # Install dependencies
   npm install
   
   # Setup environment
   cp .env.example .env
   # Edit .env with your configuration
   
   # Start the server
   npm start
   ```

3. **Access the application**
   - Open http://localhost:3001 in your browser

## 📋 Features

- **Form Builder**: Drag-and-drop form creation
- **Role-based Access**: Admin, Manager, User roles
- **Dashboard**: Analytics and form management
- **Responsive Design**: Works on desktop and mobile
- **MongoDB Integration**: Secure data storage
- **Authentication**: JWT-based auth with bypass option
- **Cross-platform**: Windows, macOS, Linux support

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the production server |
| `npm run dev` | Start development server with auto-restart |
| `npm run setup:windows` | Windows PowerShell setup |
| `npm run setup:windows-cmd` | Windows batch setup |
| `npm run test:windows` | Test Windows setup |
| `npm run test:connection` | Test database connection |
| `npm run test:auth` | Test authentication |
| `npm run clean` | Clean node_modules |
| `npm run reinstall` | Clean and reinstall dependencies |

## 🔧 Configuration

### Environment Variables (.env)

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/survey-forms

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d

# Server
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:3001

# Admin
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=Admin123!

# App
APP_NAME=Survey Form Builder
APP_VERSION=1.0.0
```

### MongoDB Setup

**Option 1: MongoDB Atlas (Recommended)**
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

**Option 2: Local MongoDB**
1. Install MongoDB Community Server
2. Start MongoDB service
3. Use: `MONGODB_URI=mongodb://localhost:27017/survey-forms`

## 🏗️ Project Structure

```
survey/
├── models/              # Database models
│   ├── App.js
│   ├── Form.js
│   ├── FormType.js
│   ├── Response.js
│   └── User.js
├── routes/              # API routes
│   ├── apps.js
│   ├── auth.js
│   ├── dashboard.js
│   ├── formTypes.js
│   ├── forms.js
│   └── users.js
├── middleware/          # Custom middleware
│   └── auth.js
├── public/              # Static files
│   ├── css/
│   ├── js/
│   └── *.html
├── .env                 # Environment variables
├── server.js           # Main server file
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

## 🪟 Windows Support

This project is fully compatible with Windows and includes:

- **Automated Setup Scripts**: PowerShell and Batch files
- **Windows-specific Documentation**: Detailed guides and troubleshooting
- **Cross-platform Dependencies**: All packages work on Windows
- **Path Compatibility**: Automatic Windows path handling
- **Windows Testing**: Dedicated test script for Windows environments

### Windows Quick Commands
```cmd
# Test Windows setup
npm run test:windows

# Check if port is available
netstat -ano | findstr :3001

# Kill process on port
taskkill /PID <PID> /F

# Set environment variables
set NODE_ENV=development
```

## 🔍 Testing

```bash
# Test database connection
npm run test:connection

# Test authentication
npm run test:auth

# Test Windows setup (Windows only)
npm run test:windows
```

## 🚨 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find process using port
netstat -ano | findstr :3001  # Windows
lsof -ti:3001                 # macOS/Linux

# Kill process
taskkill /PID <PID> /F        # Windows
kill -9 <PID>                 # macOS/Linux
```

**MongoDB connection failed:**
- Check internet connection (Atlas)
- Verify MongoDB URI in `.env`
- Ensure MongoDB service is running (local)

**npm install fails:**
```bash
npm cache clean --force
npm run reinstall
```

**Windows PowerShell execution policy:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/bypass-login` - Get auth token
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Forms
- `GET /api/forms` - Get all forms
- `POST /api/forms` - Create form
- `GET /api/forms/:id` - Get form by ID
- `PUT /api/forms/:id` - Update form
- `DELETE /api/forms/:id` - Delete form

### Form Types
- `GET /api/form-types` - Get all form types
- `POST /api/form-types` - Create form type

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Apps
- `GET /api/apps` - Get all apps
- `POST /api/apps` - Create app

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## 🔒 Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing
- **JWT**: Secure authentication
- **Input Validation**: Express validator
- **Environment Variables**: Secure configuration

## 🌐 Browser Support

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## 📄 License

MIT License - see LICENSE file for details

## 👨‍💻 Author

Krishna Gaurav

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (especially on Windows)
5. Submit a pull request

---

**Need help?** Check the platform-specific guides:
- 🪟 [Windows Setup Guide](./WINDOWS_SETUP.md)
- 🪟 [Windows Quick Start](./README-WINDOWS.md)

**Happy coding! 🚀**