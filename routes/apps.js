const express = require('express');
const { body, validationResult, query } = require('express-validator');
const App = require('../models/App');
const User = require('../models/User');
const Form = require('../models/Form');
const Response = require('../models/Response');
const { 
  auth, 
  requireSuperAdmin, 
  requireAdmin, 
  requireUserManagement 
} = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/apps
// @desc    Get all apps with user access information
// @access  Private
router.get('/', [
  auth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().trim(),
    query('isActive').optional().isBoolean()
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
    const { search, isActive } = req.query;

    // Build query
    let query = {};

    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // For non-admin users, only show apps they have access to
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      const userAppIds = req.user.appAccess.map(access => access.appId);
      query._id = { $in: userAppIds };
    }

    const apps = await App.find(query)
      .populate('createdBy', 'firstName lastName email')
      .populate('admins', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await App.countDocuments(query);

    // Add user permission information to each app
    const appsWithPermissions = apps.map(app => {
      const appObj = app.toObject();
      
      // Get user's permission for this app
      let userPermission = null;
      if (['super_admin', 'admin'].includes(req.user.role)) {
        userPermission = 'admin';
      } else {
        const access = req.user.appAccess.find(access => 
          access.appId.toString() === app._id.toString()
        );
        userPermission = access ? access.permissions : null;
      }
      
      return {
        ...appObj,
        userPermission,
        isUserAdmin: app.isUserAdmin(req.user._id)
      };
    });

    res.json({
      apps: appsWithPermissions,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error('Get apps error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/apps/:id
// @desc    Get app by ID with detailed information
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const app = await App.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .populate('admins', 'firstName lastName email');

    if (!app) {
      return res.status(404).json({ message: 'App not found' });
    }

    // Check if user has access to this app
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      const hasAccess = req.user.appAccess.some(access => 
        access.appId.toString() === app._id.toString()
      );
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this app' });
      }
    }

    // Get app statistics
    const formsCount = await Form.countDocuments({ appId: app._id });
    const responsesCount = await Response.countDocuments({ appId: app._id, status: 'submitted' });
    const usersCount = await User.countDocuments({ 'appAccess.appId': app._id });

    // Get recent forms
    const recentForms = await Form.find({ appId: app._id })
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status createdAt analytics.totalSubmissions');

    // Get user's permission for this app
    let userPermission = null;
    if (['super_admin', 'admin'].includes(req.user.role)) {
      userPermission = 'admin';
    } else {
      const access = req.user.appAccess.find(access => 
        access.appId.toString() === app._id.toString()
      );
      userPermission = access ? access.permissions : null;
    }

    const appWithStats = {
      ...app.toObject(),
      statistics: {
        totalForms: formsCount,
        totalResponses: responsesCount,
        totalUsers: usersCount
      },
      recentForms,
      userPermission,
      isUserAdmin: app.isUserAdmin(req.user._id)
    };

    res.json(appWithStats);
  } catch (error) {
    console.error('Get app error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/apps
// @desc    Create a new app
// @access  Private (Admin only)
router.post('/', [
  [
    body('name').trim().notEmpty().isLength({ max: 50 }).matches(/^[a-z0-9_-]+$/),
    body('displayName').trim().notEmpty().isLength({ max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('code').trim().notEmpty().isLength({ max: 10 }).matches(/^[A-Z0-9_-]+$/),
    body('icon').optional().trim(),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
    body('settings').optional().isObject()
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, displayName, description, code, icon, color, settings } = req.body;

    // Check if app name or code already exists
    const existingApp = await App.findOne({
      $or: [
        { name: name.toLowerCase() },
        { code: code.toUpperCase() }
      ]
    });

    if (existingApp) {
      return res.status(400).json({ 
        message: 'App with this name or code already exists' 
      });
    }

    // Create new app
    const app = new App({
      name: name.toLowerCase(),
      displayName,
      description,
      code: code.toUpperCase(),
      icon: icon || '📱',
      color: color || '#007bff',
      settings: {
        allowFormCreation: true,
        allowUserManagement: false,
        maxFormsPerUser: 100,
        formRetentionDays: 365,
        ...settings
      },
      createdBy: req.user._id,
      admins: [req.user._id]
    });

    await app.save();

    const populatedApp = await App.findById(app._id)
      .populate('createdBy', 'firstName lastName email')
      .populate('admins', 'firstName lastName email');

    res.status(201).json({
      message: 'App created successfully',
      app: populatedApp
    });
  } catch (error) {
    console.error('Create app error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/apps/:id
// @desc    Update app
// @access  Private (Super Admin or App Admin)
router.put('/:id', [
  auth,
  [
    body('displayName').optional().trim().notEmpty().isLength({ max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('icon').optional().trim(),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
    body('settings').optional().isObject(),
    body('isActive').optional().isBoolean()
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const app = await App.findById(req.params.id);
    if (!app) {
      return res.status(404).json({ message: 'App not found' });
    }

    // Check permissions
    const canEdit = req.user.role === 'super_admin' || 
                   req.user.role === 'admin' || 
                   app.isUserAdmin(req.user._id);
    
    if (!canEdit) {
      return res.status(403).json({ message: 'No permission to edit this app' });
    }

    const { displayName, description, icon, color, settings, isActive } = req.body;

    // Update app fields
    if (displayName) app.displayName = displayName;
    if (description !== undefined) app.description = description;
    if (icon) app.icon = icon;
    if (color) app.color = color;
    if (settings) app.settings = { ...app.settings, ...settings };
    if (isActive !== undefined) {
      // Only super admin can deactivate apps
      if (req.user.role === 'super_admin') {
        app.isActive = isActive;
      }
    }

    await app.save();

    const updatedApp = await App.findById(app._id)
      .populate('createdBy', 'firstName lastName email')
      .populate('admins', 'firstName lastName email');

    res.json({
      message: 'App updated successfully',
      app: updatedApp
    });
  } catch (error) {
    console.error('Update app error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/apps/:id
// @desc    Delete app
// @access  Private (Super Admin only)
router.delete('/:id', [
  auth,
  requireSuperAdmin
], async (req, res) => {
  try {
    const app = await App.findById(req.params.id);
    if (!app) {
      return res.status(404).json({ message: 'App not found' });
    }

    // Check if app has forms or users
    const formsCount = await Form.countDocuments({ appId: app._id });
    const usersCount = await User.countDocuments({ 'appAccess.appId': app._id });

    if (formsCount > 0 || usersCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete app with existing forms or users. Please remove them first.' 
      });
    }

    await App.findByIdAndDelete(app._id);

    res.json({ message: 'App deleted successfully' });
  } catch (error) {
    console.error('Delete app error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/apps/:id/users
// @desc    Get users with access to specific app
// @access  Private (App Admin)
router.get('/:id/users', [
  auth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('permission').optional().isIn(['view', 'edit', 'admin']),
    query('search').optional().trim()
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const appId = req.params.id;
    const app = await App.findById(appId);
    
    if (!app) {
      return res.status(404).json({ message: 'App not found' });
    }

    // Check permissions
    const canViewUsers = req.user.role === 'super_admin' || 
                        req.user.role === 'admin' || 
                        app.isUserAdmin(req.user._id);
    
    if (!canViewUsers) {
      return res.status(403).json({ message: 'No permission to view app users' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { permission, search } = req.query;

    // Build query
    let query = { 'appAccess.appId': appId };

    if (permission) {
      query['appAccess.permissions'] = permission;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    // Add app-specific permission info
    const usersWithPermissions = users.map(user => {
      const userObj = user.toObject();
      const appAccess = user.appAccess.find(access => 
        access.appId.toString() === appId
      );
      
      return {
        ...userObj,
        appPermission: appAccess ? appAccess.permissions : null
      };
    });

    res.json({
      users: usersWithPermissions,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error('Get app users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/apps/:id/users
// @desc    Add user to app
// @access  Private (App Admin)
router.post('/:id/users', [
  auth,
  [
    body('userId').isMongoId(),
    body('permissions').isIn(['view', 'edit', 'admin'])
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const appId = req.params.id;
    const { userId, permissions } = req.body;

    const app = await App.findById(appId);
    if (!app) {
      return res.status(404).json({ message: 'App not found' });
    }

    // Check permissions
    const canManageUsers = req.user.role === 'super_admin' || 
                          req.user.role === 'admin' || 
                          app.isUserAdmin(req.user._id);
    
    if (!canManageUsers) {
      return res.status(403).json({ message: 'No permission to manage app users' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already has access to this app
    const existingAccess = user.appAccess.find(access => 
      access.appId.toString() === appId
    );

    if (existingAccess) {
      // Update existing permission
      existingAccess.permissions = permissions;
    } else {
      // Add new app access
      user.appAccess.push({
        appId: appId,
        appName: app.name,
        permissions: permissions
      });
      
      // Update app user count
      await App.findByIdAndUpdate(appId, {
        $inc: { totalUsers: 1 }
      });
    }

    // If user is being made admin, add to app admins
    if (permissions === 'admin') {
      app.addAdmin(userId);
      await app.save();
    }

    await user.save();

    res.json({
      message: 'User access updated successfully',
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        appPermission: permissions
      }
    });
  } catch (error) {
    console.error('Add app user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/apps/:id/users/:userId
// @desc    Remove user from app
// @access  Private (App Admin)
router.delete('/:id/users/:userId', auth, async (req, res) => {
  try {
    const appId = req.params.id;
    const userId = req.params.userId;

    const app = await App.findById(appId);
    if (!app) {
      return res.status(404).json({ message: 'App not found' });
    }

    // Check permissions
    const canManageUsers = req.user.role === 'super_admin' || 
                          req.user.role === 'admin' || 
                          app.isUserAdmin(req.user._id);
    
    if (!canManageUsers) {
      return res.status(403).json({ message: 'No permission to manage app users' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove app access
    user.appAccess = user.appAccess.filter(access => 
      access.appId.toString() !== appId
    );

    // Remove from app admins if applicable
    app.removeAdmin(userId);

    await Promise.all([
      user.save(),
      app.save(),
      App.findByIdAndUpdate(appId, { $inc: { totalUsers: -1 } })
    ]);

    res.json({ message: 'User removed from app successfully' });
  } catch (error) {
    console.error('Remove app user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/apps/:id/analytics
// @desc    Get app analytics
// @access  Private (App Admin)
router.get('/:id/analytics', auth, async (req, res) => {
  try {
    const appId = req.params.id;
    const app = await App.findById(appId);
    
    if (!app) {
      return res.status(404).json({ message: 'App not found' });
    }

    // Check permissions
    const canViewAnalytics = req.user.role === 'super_admin' || 
                            req.user.role === 'admin' || 
                            app.isUserAdmin(req.user._id);
    
    if (!canViewAnalytics) {
      return res.status(403).json({ message: 'No permission to view app analytics' });
    }

    // Get basic counts
    const totalForms = await Form.countDocuments({ appId });
    const totalResponses = await Response.countDocuments({ appId, status: 'submitted' });
    const totalUsers = await User.countDocuments({ 'appAccess.appId': appId });

    // Get forms by status
    const formsByStatus = await Form.aggregate([
      { $match: { appId: app._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get responses over time
    const responsesOverTime = await Response.aggregate([
      { 
        $match: { 
          appId: app._id, 
          status: 'submitted',
          'timing.submittedAt': { $exists: true }
        } 
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$timing.submittedAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get top forms by responses
    const topForms = await Form.aggregate([
      { $match: { appId: app._id } },
      {
        $lookup: {
          from: 'responses',
          localField: '_id',
          foreignField: 'formId',
          as: 'responses'
        }
      },
      {
        $project: {
          title: 1,
          status: 1,
          responseCount: { $size: '$responses' }
        }
      },
      { $sort: { responseCount: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      totalForms,
      totalResponses,
      totalUsers,
      formsByStatus,
      responsesOverTime,
      topForms
    });
  } catch (error) {
    console.error('Get app analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;