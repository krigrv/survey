const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const App = require('../models/App');
const { auth, requireSuperAdmin, requireAdmin, sensitiveOperationLimit } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Private (Admin only)
router.post('/register', [
  auth,
  requireAdmin,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('role').isIn([
      'admin',
      'mydhl_admin',
      'mydhl_edit', 
      'mydhl_view',
      'odd_admin',
      'odd_edit',
      'odd_view'
    ])
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role, appAccess } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Validate role permissions
    if (req.user.role !== 'super_admin' && role === 'admin') {
      return res.status(403).json({ message: 'Only super admin can create admin users' });
    }

    // Create new user
    user = new User({
      email,
      password,
      firstName,
      lastName,
      role,
      appAccess: appAccess || [],
      createdBy: req.user._id
    });

    await user.save();

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(201).json({
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  sensitiveOperationLimit,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).populate('appAccess.appId');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({ message: 'Account is deactivated' });
    }

    // Validate password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('appAccess.appId')
      .select('-password');
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  auth,
  [
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail()
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, profileImage } = req.body;
    const userId = req.user._id;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: userId } 
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (profileImage !== undefined) updateData.profileImage = profileImage;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', [
  auth,
  sensitiveOperationLimit,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/refresh-token
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh-token', auth, async (req, res) => {
  try {
    const token = generateToken(req.user._id);
    res.json({ token });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', auth, (req, res) => {
  // In a more sophisticated setup, you might want to blacklist the token
  res.json({ message: 'Logged out successfully' });
});

// @route   POST /api/auth/bypass-login
// @desc    Bypass authentication for development/testing
// @access  Public
router.post('/bypass-login', async (req, res) => {
  try {
    // Find any admin user or create a temporary one
    let user = await User.findOne({ role: 'admin' }).populate('appAccess.appId');
    
    if (!user) {
      // Create a temporary admin user if none exists
      user = new User({
        email: 'admin@bypass.local',
        password: 'bypass123',
        firstName: 'Bypass',
        lastName: 'Admin',
        role: 'admin',
        isActive: true,
        appAccess: []
      });
      await user.save();
    }

    // Ensure there's at least one app and user has access to it
    let apps = await App.find({ isActive: true });
    
    if (apps.length === 0) {
      // Create a default app if none exist
      const defaultApp = new App({
        name: 'default',
        displayName: 'Default App',
        description: 'Default application for form builder',
        code: 'DEFAULT',
        icon: '📝',
        color: '#007bff',
        createdBy: user._id,
        admins: [user._id]
      });
      await defaultApp.save();
      apps = [defaultApp];
    }

    // Ensure user has access to all apps
    const userAppIds = user.appAccess.map(access => access.appId.toString());
    const appsToAdd = apps.filter(app => !userAppIds.includes(app._id.toString()));
    
    if (appsToAdd.length > 0) {
      for (const app of appsToAdd) {
        user.appAccess.push({
          appId: app._id,
          permissions: 'admin'  // Single string instead of array
        });
        
        // Add user as admin to the app if not already
        if (!app.admins.includes(user._id)) {
          app.admins.push(user._id);
          await app.save();
        }
      }
      await user.save();
    }

    // Reload user with populated app access
    user = await User.findById(user._id).populate('appAccess.appId');

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      token,
      user: userResponse,
      message: 'Bypass login successful'
    });
  } catch (error) {
    console.error('Bypass login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/setup-super-admin
// @desc    Setup initial super admin (only if no super admin exists)
// @access  Public (one-time setup)
router.post('/setup-super-admin', [
  sensitiveOperationLimit,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('setupKey').notEmpty()
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      return res.status(400).json({ message: 'Super admin already exists' });
    }

    const { email, password, firstName, lastName, setupKey } = req.body;

    // Validate setup key (you should set this in environment variables)
    if (setupKey !== process.env.SUPER_ADMIN_SETUP_KEY) {
      return res.status(400).json({ message: 'Invalid setup key' });
    }

    // Create super admin
    const superAdmin = new User({
      email,
      password,
      firstName,
      lastName,
      role: 'super_admin'
    });

    await superAdmin.save();

    // Create default apps
    const defaultApps = App.getDefaultApps();
    for (const appData of defaultApps) {
      const app = new App({
        ...appData,
        createdBy: superAdmin._id,
        admins: [superAdmin._id]
      });
      await app.save();
    }

    const token = generateToken(superAdmin._id);
    const userResponse = superAdmin.toJSON();
    delete userResponse.password;

    res.status(201).json({
      message: 'Super admin created successfully',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Super admin setup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/setup-status
// @desc    Check if setup is required
// @access  Public
router.get('/setup-status', async (req, res) => {
  try {
    const superAdminExists = await User.findOne({ role: 'super_admin' });
    res.json({ 
      setupRequired: !superAdminExists,
      hasUsers: !!superAdminExists
    });
  } catch (error) {
    console.error('Setup status check error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/setup
// @desc    Complete initial setup
// @access  Public (one-time setup)
router.post('/setup', [
  sensitiveOperationLimit,
  [
    body('admin.email').isEmail().normalizeEmail(),
    body('admin.password').isLength({ min: 8 }),
    body('admin.firstName').trim().notEmpty(),
    body('admin.lastName').trim().notEmpty(),
    body('system.organizationName').trim().notEmpty(),
    body('system.timezone').notEmpty()
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      return res.status(400).json({ message: 'Setup already completed' });
    }

    const { admin, system } = req.body;

    // Create super admin
    const superAdmin = new User({
      email: admin.email,
      password: admin.password,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: 'super_admin'
    });

    await superAdmin.save();

    // Create default apps if App model has getDefaultApps method
    try {
      if (App.getDefaultApps) {
        const defaultApps = App.getDefaultApps();
        for (const appData of defaultApps) {
          const app = new App({
            ...appData,
            createdBy: superAdmin._id,
            admins: [superAdmin._id]
          });
          await app.save();
        }
      }
    } catch (appError) {
      console.log('Default apps creation skipped:', appError.message);
    }

    const token = generateToken(superAdmin._id);
    const userResponse = superAdmin.toJSON();
    delete userResponse.password;

    res.status(201).json({
      message: 'Setup completed successfully',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;