const jwt = require('jsonwebtoken');
const User = require('../models/User');
const App = require('../models/App');

// Verify JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Check if user is super admin
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Super admin access required' });
  }
  next();
};

// Check if user is admin or super admin
const requireAdmin = (req, res, next) => {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Check app-specific permissions
const requireAppPermission = (permission = 'view') => {
  return async (req, res, next) => {
    try {
      const appId = req.params.appId || req.body.appId || req.query.appId;
      
      if (!appId) {
        return res.status(400).json({ message: 'App ID is required' });
      }
      
      // Super admin and admin have access to everything
      if (['super_admin', 'admin'].includes(req.user.role)) {
        return next();
      }
      
      // Check app-specific permissions
      const hasPermission = req.user.hasAppPermission(appId, permission);
      
      if (!hasPermission) {
        return res.status(403).json({ 
          message: `${permission} permission required for this app` 
        });
      }
      
      next();
    } catch (error) {
      console.error('App permission middleware error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
};

// Check if user can access specific app by role
const requireAppAccess = (appName) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    
    // Super admin and admin can access everything
    if (['super_admin', 'admin'].includes(userRole)) {
      return next();
    }
    
    // Check app-specific role access
    const appRoleMap = {
      'mydhl': ['mydhl_admin', 'mydhl_edit', 'mydhl_view'],
      'odd': ['odd_admin', 'odd_edit', 'odd_view']
    };
    
    const allowedRoles = appRoleMap[appName.toLowerCase()];
    
    if (!allowedRoles || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: `Access denied for ${appName} application` 
      });
    }
    
    next();
  };
};

// Check if user has edit permissions
const requireEditPermission = (req, res, next) => {
  const userRole = req.user.role;
  
  // Super admin and admin can edit everything
  if (['super_admin', 'admin'].includes(userRole)) {
    return next();
  }
  
  // Check if user has edit or admin role for their app
  const editRoles = ['mydhl_admin', 'mydhl_edit', 'odd_admin', 'odd_edit'];
  
  if (!editRoles.includes(userRole)) {
    return res.status(403).json({ 
      message: 'Edit permission required' 
    });
  }
  
  next();
};

// Check if user can manage users (admin roles only)
const requireUserManagement = (req, res, next) => {
  const userRole = req.user.role;
  
  const userManagementRoles = [
    'super_admin', 
    'admin', 
    'mydhl_admin', 
    'odd_admin'
  ];
  
  if (!userManagementRoles.includes(userRole)) {
    return res.status(403).json({ 
      message: 'User management permission required' 
    });
  }
  
  next();
};

// Validate form access based on user role and form ownership
const validateFormAccess = async (req, res, next) => {
  try {
    const formId = req.params.formId || req.params.id;
    const Form = require('../models/Form');
    
    const form = await Form.findById(formId);
    
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }
    
    // Check if user can access this form
    if (!form.canUserAccess(req.user, 'view')) {
      return res.status(403).json({ 
        message: 'Access denied to this form' 
      });
    }
    
    req.form = form;
    next();
  } catch (error) {
    console.error('Form access validation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Optional auth - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Rate limiting for sensitive operations
const sensitiveOperationLimit = (req, res, next) => {
  // This would typically use Redis or similar for production
  // For now, we'll just add a simple delay
  setTimeout(next, 100);
};

module.exports = {
  auth,
  requireSuperAdmin,
  requireAdmin,
  requireAppPermission,
  requireAppAccess,
  requireEditPermission,
  requireUserManagement,
  validateFormAccess,
  optionalAuth,
  sensitiveOperationLimit
};