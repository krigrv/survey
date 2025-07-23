# Deployment Guide for Windows Users

This guide helps Windows users deploy the Survey Form Builder to various cloud platforms.

## 🚀 Deployment Options

### 1. Vercel (Recommended for Frontend + API)

**Prerequisites:**
- Vercel account ([vercel.com](https://vercel.com))
- Git repository (GitHub, GitLab, or Bitbucket)

**Steps:**

1. **Install Vercel CLI**
   ```cmd
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```cmd
   vercel login
   ```

3. **Deploy from project directory**
   ```cmd
   vercel
   ```

4. **Configure Environment Variables**
   - Go to Vercel dashboard
   - Select your project
   - Go to Settings → Environment Variables
   - Add all variables from your `.env` file

**Vercel Configuration (vercel.json):**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    },
    {
      "src": "public/**/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ]
}
```

### 2. Heroku

**Prerequisites:**
- Heroku account ([heroku.com](https://heroku.com))
- Heroku CLI ([devcenter.heroku.com/articles/heroku-cli](https://devcenter.heroku.com/articles/heroku-cli))

**Steps:**

1. **Install Heroku CLI**
   - Download from Heroku website
   - Or use chocolatey: `choco install heroku-cli`

2. **Login to Heroku**
   ```cmd
   heroku login
   ```

3. **Create Heroku app**
   ```cmd
   heroku create your-app-name
   ```

4. **Set environment variables**
   ```cmd
   heroku config:set MONGODB_URI="your-mongodb-uri"
   heroku config:set JWT_SECRET="your-jwt-secret"
   heroku config:set NODE_ENV="production"
   ```

5. **Deploy**
   ```cmd
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

### 3. Railway

**Prerequisites:**
- Railway account ([railway.app](https://railway.app))
- Git repository

**Steps:**

1. **Install Railway CLI**
   ```cmd
   npm install -g @railway/cli
   ```

2. **Login and deploy**
   ```cmd
   railway login
   railway init
   railway up
   ```

3. **Set environment variables**
   - Go to Railway dashboard
   - Select your project
   - Go to Variables tab
   - Add environment variables

### 4. DigitalOcean App Platform

**Prerequisites:**
- DigitalOcean account
- Git repository

**Steps:**

1. **Create App**
   - Go to DigitalOcean dashboard
   - Click "Create" → "Apps"
   - Connect your Git repository

2. **Configure Build Settings**
   - Build Command: `npm install`
   - Run Command: `npm start`
   - Environment: Node.js

3. **Set Environment Variables**
   - Add all variables from `.env` file
   - Set `NODE_ENV=production`

## 🗄️ Database Deployment

### MongoDB Atlas (Recommended)

1. **Create Atlas Account**
   - Go to [mongodb.com/atlas](https://mongodb.com/atlas)
   - Create free account

2. **Create Cluster**
   - Choose free tier (M0)
   - Select region closest to your deployment

3. **Configure Access**
   - Add IP addresses (0.0.0.0/0 for all IPs)
   - Create database user

4. **Get Connection String**
   - Click "Connect" → "Connect your application"
   - Copy connection string
   - Update `MONGODB_URI` in deployment environment

### Alternative Database Options

- **MongoDB Cloud Manager**
- **AWS DocumentDB**
- **Azure Cosmos DB**

## 🔧 Pre-deployment Checklist

### Code Preparation

- [ ] All dependencies in `package.json`
- [ ] Environment variables documented
- [ ] Database connection tested
- [ ] Static files in `public/` directory
- [ ] No hardcoded URLs or secrets
- [ ] Error handling implemented
- [ ] CORS configured for production

### Environment Variables

- [ ] `MONGODB_URI` - Database connection
- [ ] `JWT_SECRET` - Strong random string
- [ ] `NODE_ENV=production`
- [ ] `PORT` - Usually set by platform
- [ ] `CLIENT_URL` - Your domain URL
- [ ] Admin credentials configured

### Security

- [ ] Strong JWT secret
- [ ] Database access restricted
- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] No sensitive data in code

## 🌐 Domain Configuration

### Custom Domain Setup

1. **Purchase Domain**
   - Use providers like Namecheap, GoDaddy, etc.

2. **Configure DNS**
   - Add CNAME record pointing to your deployment URL
   - Or A record with deployment IP

3. **Platform-specific Setup**
   - **Vercel**: Add domain in project settings
   - **Heroku**: `heroku domains:add yourdomain.com`
   - **Railway**: Add domain in dashboard

### SSL Certificate

Most platforms provide automatic SSL certificates:
- Vercel: Automatic
- Heroku: Automatic with custom domains
- Railway: Automatic
- DigitalOcean: Automatic

## 📊 Monitoring and Logs

### Platform-specific Logging

**Vercel:**
```cmd
vercel logs
```

**Heroku:**
```cmd
heroku logs --tail
```

**Railway:**
```cmd
railway logs
```

### Monitoring Tools

- **Uptime monitoring**: UptimeRobot, Pingdom
- **Error tracking**: Sentry, LogRocket
- **Performance**: New Relic, DataDog

## 🔄 CI/CD Setup

### GitHub Actions (Windows-compatible)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Run tests
      run: npm run test:connection
      
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🚨 Troubleshooting Deployment

### Common Issues

**Build Failures:**
- Check Node.js version compatibility
- Verify all dependencies are in `package.json`
- Check for Windows-specific path issues

**Database Connection:**
- Verify MongoDB URI format
- Check IP whitelist in MongoDB Atlas
- Ensure database user has correct permissions

**Environment Variables:**
- Double-check variable names
- Ensure no extra spaces or quotes
- Verify all required variables are set

**CORS Issues:**
- Update `CLIENT_URL` to production domain
- Check CORS configuration in `server.js`

### Windows-specific Deployment Tips

1. **Use Git Bash or PowerShell** for better command compatibility
2. **Check line endings** - use `git config core.autocrlf true`
3. **Path separators** - Node.js handles this automatically
4. **Environment variables** - Use proper syntax for your shell

## 📱 Mobile Optimization

Ensure your deployment works well on mobile:

- Responsive design implemented
- Touch-friendly interface
- Fast loading times
- Proper viewport meta tags

## 🔐 Production Security

### Essential Security Measures

- [ ] HTTPS enabled
- [ ] Strong passwords and secrets
- [ ] Database access restricted
- [ ] Regular security updates
- [ ] Input validation
- [ ] Rate limiting enabled
- [ ] Security headers configured

### Security Headers (already in code)

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));
```

## 📈 Performance Optimization

### Frontend Optimization

- Minify CSS and JavaScript
- Optimize images
- Enable gzip compression
- Use CDN for static assets

### Backend Optimization

- Database indexing
- Connection pooling
- Caching strategies
- Load balancing (for high traffic)

---

**Need help?** 
- Check platform-specific documentation
- Test locally before deploying
- Use staging environment for testing
- Monitor logs after deployment

**Happy deploying! 🚀**