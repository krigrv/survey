const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const App = require('../models/App');
const { 
  auth, 
  requireSuperAdmin, 
  requireAdmin, 
  requireUserManagement,
  sensitiveOperationLimit 
} = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users with filtering and pagination
// @access  Private (Admin)
router.get('/', [
  auth,
  requireUserManagement,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('role').optional().isIn([
      'admin',
      'mydhl_admin',
      'mydhl_edit',
      'mydhl_view',
      'odd_admin',
      'odd_edit',
      'odd_view'
    ]),
    query('appId').optional().isMongoId(),
    query('search').optional().trim()
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { role, appId, search, isActive } = req.query;

    // Build query
    let query = {};

    // Role-based filtering for non-super-admin users
    if (req.user.role !== 'super_admin') {
      // Admin can see all users except super_admin
      if (req.user.role === 'admin') {
        query.role = { $ne: 'super_admin' };
      } else {
        // App admins can only see users in their apps
        const userAppIds = req.user.appAccess
          .filter(access => access.permissions === 'admin')
          .map(access => access.appId);
        
        query['appAccess.appId'] = { $in: userAppIds };
      }
    }

    if (role) {
      query.role = role;
    }

    if (appId) {
      query['appAccess.appId'] = appId;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .populate('appAccess.appId', 'name displayName')
      .populate('createdBy', 'firstName lastName email')
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Admin)
router.get('/:id', [
  auth,
  requireUserManagement
], async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('appAccess.appId')
      .populate('createdBy', 'firstName lastName email')
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if current user can view this user
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      const userAppIds = req.user.appAccess
        .filter(access => access.permissions === 'admin')
        .map(access => access.appId.toString());
      
      const targetUserAppIds = user.appAccess.map(access => access.appId.toString());
      const hasCommonApp = userAppIds.some(appId => targetUserAppIds.includes(appId));
      
      if (!hasCommonApp) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users
// @desc    Create a new user
// @access  Private (Admin)
router.post('/', [
  auth,
  requireUserManagement,
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
    ]),
    body('appAccess').optional().isArray()
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role, appAccess } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Validate role permissions
    if (req.user.role !== 'super_admin' && role === 'admin') {
      return res.status(403).json({ message: 'Only super admin can create admin users' });
    }

    // Validate app access permissions
    if (appAccess && appAccess.length > 0) {
      for (const access of appAccess) {
        const app = await App.findById(access.appId);
        if (!app) {
          return res.status(400).json({ message: `App ${access.appId} not found` });
        }

        // Check if current user can assign access to this app
        if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
          const hasAppAccess = req.user.hasAppPermission(access.appId, 'admin');
          if (!hasAppAccess) {
            return res.status(403).json({ 
              message: `Cannot assign access to app ${app.name}` 
            });
          }
        }
      }
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      role,
      appAccess: appAccess || [],
      createdBy: req.user._id
    });

    await user.save();

    // Update app user counts
    if (appAccess && appAccess.length > 0) {
      for (const access of appAccess) {
        await App.findByIdAndUpdate(access.appId, {
          $inc: { totalUsers: 1 }
        });
      }
    }

    const userResponse = await User.findById(user._id)
      .populate('appAccess.appId')
      .select('-password');

    res.status(201).json({
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin)
router.put('/:id', [
  auth,
  requireUserManagement,
  [
    body('email').optional().isEmail().normalizeEmail(),
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('role').optional().isIn([
      'admin',
      'mydhl_admin',
      'mydhl_edit',
      'mydhl_view',
      'odd_admin',
      'odd_edit',
      'odd_view'
    ]),
    body('appAccess').optional().isArray(),
    body('isActive').optional().isBoolean()
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.params.id;
    const { email, firstName, lastName, role, appAccess, isActive } = req.body;

    // Get current user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent users from modifying super admin
    if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Cannot modify super admin' });
    }

    // Prevent non-super-admin from creating admin users
    if (role === 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only super admin can assign admin role' });
    }

    // Check email uniqueness
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    // Validate app access changes
    if (appAccess) {
      for (const access of appAccess) {
        const app = await App.findById(access.appId);
        if (!app) {
          return res.status(400).json({ message: `App ${access.appId} not found` });
        }

        // Check permissions
        if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
          const hasAppAccess = req.user.hasAppPermission(access.appId, 'admin');
          if (!hasAppAccess) {
            return res.status(403).json({ 
              message: `Cannot modify access to app ${app.name}` 
            });
          }
        }
      }
    }

    // Update user
    const updateData = {};
    if (email) updateData.email = email;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (role) updateData.role = role;
    if (appAccess !== undefined) updateData.appAccess = appAccess;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).populate('appAccess.appId').select('-password');

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin)
router.delete('/:id', [
  auth,
  requireUserManagement,
  sensitiveOperationLimit
], async (req, res) => {
  try {
    const userId = req.params.id;

    // Get user to delete
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deletion of super admin
    if (user.role === 'super_admin') {
      return res.status(403).json({ message: 'Cannot delete super admin' });
    }

    // Prevent users from deleting themselves
    if (userId === req.user._id.toString()) {
      return res.status(403).json({ message: 'Cannot delete yourself' });
    }

    // Check permissions
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      const userAppIds = req.user.appAccess
        .filter(access => access.permissions === 'admin')
        .map(access => access.appId.toString());
      
      const targetUserAppIds = user.appAccess.map(access => access.appId.toString());
      const hasCommonApp = userAppIds.some(appId => targetUserAppIds.includes(appId));
      
      if (!hasCommonApp) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Update app user counts
    for (const access of user.appAccess) {
      await App.findByIdAndUpdate(access.appId, {
        $inc: { totalUsers: -1 }
      });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id/reset-password
// @desc    Reset user password
// @access  Private (Admin)
router.put('/:id/reset-password', [
  auth,
  requireUserManagement,
  sensitiveOperationLimit,
  [
    body('newPassword').isLength({ min: 6 })
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.params.id;
    const { newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent password reset for super admin by non-super-admin
    if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Cannot reset super admin password' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private (Admin)
router.get('/stats/overview', [
  auth,
  requireUserManagement
], async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: ['$isActive', 1, 0] }
          }
        }
      }
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    res.json({
      totalUsers,
      activeUsers,
      recentUsers,
      roleDistribution: stats
    });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;