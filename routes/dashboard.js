const express = require('express');
const { query, validationResult } = require('express-validator');
const User = require('../models/User');
const App = require('../models/App');
const Form = require('../models/Form');
const Response = require('../models/Response');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview based on user role
// @access  Private
router.get('/overview', auth, async (req, res) => {
  try {
    const userRole = req.user.role;
    let dashboardData = {};

    if (userRole === 'super_admin') {
      // Super Admin Dashboard
      dashboardData = await getSuperAdminDashboard();
    } else if (userRole === 'admin') {
      // Admin Dashboard
      dashboardData = await getAdminDashboard();
    } else {
      // App-specific user dashboard
      dashboardData = await getAppUserDashboard(req.user);
    }

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/stats
// @desc    Get detailed statistics
// @access  Private
router.get('/stats', [
  auth,
  [
    query('period').optional().isIn(['7d', '30d', '90d', '1y']),
    query('appId').optional().isMongoId()
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { period = '30d', appId } = req.query;
    const userRole = req.user.role;

    // Calculate date range
    const periodDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays[period]);

    let stats = {};

    if (['super_admin', 'admin'].includes(userRole)) {
      stats = await getAdminStats(startDate, appId);
    } else {
      stats = await getAppUserStats(req.user, startDate, appId);
    }

    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/recent-activity
// @desc    Get recent activity feed
// @access  Private
router.get('/recent-activity', [
  auth,
  [
    query('limit').optional().isInt({ min: 1, max: 50 })
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const limit = parseInt(req.query.limit) || 20;
    const userRole = req.user.role;

    let activities = [];

    if (['super_admin', 'admin'].includes(userRole)) {
      activities = await getAdminRecentActivity(limit);
    } else {
      activities = await getAppUserRecentActivity(req.user, limit);
    }

    res.json({ activities });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/my-forms
// @desc    Get user's forms with quick stats
// @access  Private
router.get('/my-forms', [
  auth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('status').optional().isIn(['draft', 'published', 'closed', 'archived']),
    query('appId').optional().isMongoId()
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
    const { status, appId } = req.query;

    // Build query
    let query = {};

    // For non-admin users, only show forms they created or have access to
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      const userAppIds = req.user.appAccess.map(access => access.appId);
      query.$or = [
        { createdBy: req.user._id },
        { appId: { $in: userAppIds } }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (appId) {
      // Check if user has access to this app
      if (!['super_admin', 'admin'].includes(req.user.role)) {
        const hasAccess = req.user.appAccess.some(access => 
          access.appId.toString() === appId
        );
        if (!hasAccess) {
          return res.status(403).json({ message: 'Access denied to this app' });
        }
      }
      query.appId = appId;
    }

    const forms = await Form.find(query)
      .populate('appId', 'name displayName color')
      .populate('createdBy', 'firstName lastName')
      .sort({ lastModified: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Form.countDocuments(query);

    // Add response counts and user permissions
    const formsWithStats = await Promise.all(forms.map(async (form) => {
      const responseCount = await Response.countDocuments({ 
        formId: form._id, 
        status: 'submitted' 
      });
      
      const recentResponseCount = await Response.countDocuments({
        formId: form._id,
        status: 'submitted',
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      return {
        ...form,
        responseCount,
        recentResponseCount,
        isOwner: form.createdBy._id.toString() === req.user._id.toString(),
        canEdit: form.createdBy._id.toString() === req.user._id.toString() || 
                ['super_admin', 'admin'].includes(req.user.role) ||
                req.user.hasAppPermission(form.appId, 'edit')
      };
    }));

    res.json({
      forms: formsWithStats,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error('My forms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/analytics-summary
// @desc    Get analytics summary for charts
// @access  Private
router.get('/analytics-summary', [
  auth,
  [
    query('appId').optional().isMongoId(),
    query('period').optional().isIn(['7d', '30d', '90d'])
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { appId, period = '30d' } = req.query;
    const userRole = req.user.role;

    // Calculate date range
    const periodDays = { '7d': 7, '30d': 30, '90d': 90 };
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays[period]);

    let matchQuery = {
      createdAt: { $gte: startDate }
    };

    // Apply app filtering based on user role
    if (!['super_admin', 'admin'].includes(userRole)) {
      const userAppIds = req.user.appAccess.map(access => access.appId);
      matchQuery.appId = { $in: userAppIds };
    } else if (appId) {
      matchQuery.appId = mongoose.Types.ObjectId(appId);
    }

    // Get forms created over time
    const formsOverTime = await Form.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get responses over time
    const responsesOverTime = await Response.aggregate([
      { 
        $match: {
          ...matchQuery,
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

    // Get form status distribution
    const formStatusDistribution = await Form.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get top performing forms
    const topForms = await Form.aggregate([
      { $match: matchQuery },
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
          appId: 1,
          responseCount: {
            $size: {
              $filter: {
                input: '$responses',
                cond: { $eq: ['$$this.status', 'submitted'] }
              }
            }
          }
        }
      },
      { $sort: { responseCount: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      formsOverTime,
      responsesOverTime,
      formStatusDistribution,
      topForms
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper Functions

async function getSuperAdminDashboard() {
  const [totalUsers, totalApps, totalForms, totalResponses] = await Promise.all([
    User.countDocuments(),
    App.countDocuments(),
    Form.countDocuments(),
    Response.countDocuments({ status: 'submitted' })
  ]);

  // Recent activity counts
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [recentUsers, recentForms, recentResponses] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: last30Days } }),
    Form.countDocuments({ createdAt: { $gte: last30Days } }),
    Response.countDocuments({ 
      status: 'submitted',
      'timing.submittedAt': { $gte: last30Days }
    })
  ]);

  // App statistics
  const appStats = await App.aggregate([
    {
      $lookup: {
        from: 'forms',
        localField: '_id',
        foreignField: 'appId',
        as: 'forms'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: 'appAccess.appId',
        as: 'users'
      }
    },
    {
      $project: {
        name: 1,
        displayName: 1,
        color: 1,
        formsCount: { $size: '$forms' },
        usersCount: { $size: '$users' }
      }
    },
    { $sort: { formsCount: -1 } }
  ]);

  return {
    overview: {
      totalUsers,
      totalApps,
      totalForms,
      totalResponses,
      recentUsers,
      recentForms,
      recentResponses
    },
    appStats,
    userRole: 'super_admin'
  };
}

async function getAdminDashboard() {
  const [totalForms, totalResponses, totalUsers] = await Promise.all([
    Form.countDocuments(),
    Response.countDocuments({ status: 'submitted' }),
    User.countDocuments({ role: { $ne: 'super_admin' } })
  ]);

  // Recent activity
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [recentForms, recentResponses] = await Promise.all([
    Form.countDocuments({ createdAt: { $gte: last30Days } }),
    Response.countDocuments({ 
      status: 'submitted',
      'timing.submittedAt': { $gte: last30Days }
    })
  ]);

  // App overview
  const apps = await App.find({ isActive: true })
    .select('name displayName color totalForms totalUsers')
    .sort({ totalForms: -1 });

  return {
    overview: {
      totalForms,
      totalResponses,
      totalUsers,
      recentForms,
      recentResponses
    },
    apps,
    userRole: 'admin'
  };
}

async function getAppUserDashboard(user) {
  const userAppIds = user.appAccess.map(access => access.appId);
  
  // Get user's accessible apps
  const apps = await App.find({ _id: { $in: userAppIds } })
    .select('name displayName color');

  // Count forms user can access
  const totalForms = await Form.countDocuments({
    $or: [
      { createdBy: user._id },
      { appId: { $in: userAppIds } }
    ]
  });

  // Count forms user created
  const myForms = await Form.countDocuments({ createdBy: user._id });

  // Count responses to user's forms
  const myFormsResponses = await Response.countDocuments({
    formId: { 
      $in: await Form.find({ createdBy: user._id }).distinct('_id')
    },
    status: 'submitted'
  });

  // Recent activity on user's forms
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentResponses = await Response.countDocuments({
    formId: { 
      $in: await Form.find({ createdBy: user._id }).distinct('_id')
    },
    status: 'submitted',
    'timing.submittedAt': { $gte: last7Days }
  });

  return {
    overview: {
      totalForms,
      myForms,
      myFormsResponses,
      recentResponses
    },
    apps,
    userRole: user.role,
    permissions: user.appAccess
  };
}

async function getAdminStats(startDate, appId) {
  let matchQuery = { createdAt: { $gte: startDate } };
  if (appId) {
    matchQuery.appId = mongoose.Types.ObjectId(appId);
  }

  const [formStats, responseStats, userStats] = await Promise.all([
    Form.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          published: {
            $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
          },
          draft: {
            $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
          }
        }
      }
    ]),
    Response.aggregate([
      { 
        $match: {
          ...matchQuery,
          status: 'submitted'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgTime: { $avg: '$timing.totalTime' }
        }
      }
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  return {
    forms: formStats[0] || { total: 0, published: 0, draft: 0 },
    responses: responseStats[0] || { total: 0, avgTime: 0 },
    users: userStats
  };
}

async function getAppUserStats(user, startDate, appId) {
  const userAppIds = user.appAccess.map(access => access.appId);
  
  let matchQuery = {
    createdAt: { $gte: startDate },
    $or: [
      { createdBy: user._id },
      { appId: { $in: userAppIds } }
    ]
  };

  if (appId) {
    matchQuery.appId = mongoose.Types.ObjectId(appId);
  }

  const [formStats, responseStats] = await Promise.all([
    Form.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          myForms: {
            $sum: { 
              $cond: [{ $eq: ['$createdBy', user._id] }, 1, 0] 
            }
          }
        }
      }
    ]),
    Response.aggregate([
      { 
        $match: {
          formId: { 
            $in: await Form.find({ createdBy: user._id }).distinct('_id')
          },
          status: 'submitted',
          'timing.submittedAt': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 }
        }
      }
    ])
  ]);

  return {
    forms: formStats[0] || { total: 0, myForms: 0 },
    responses: responseStats[0] || { total: 0 }
  };
}

async function getAdminRecentActivity(limit) {
  const activities = [];

  // Recent forms
  const recentForms = await Form.find()
    .populate('createdBy', 'firstName lastName')
    .populate('appId', 'name displayName')
    .sort({ createdAt: -1 })
    .limit(limit / 2);

  recentForms.forEach(form => {
    activities.push({
      type: 'form_created',
      title: `New form "${form.title}" created`,
      user: form.createdBy,
      app: form.appId,
      timestamp: form.createdAt,
      metadata: { formId: form._id }
    });
  });

  // Recent responses
  const recentResponses = await Response.find({ status: 'submitted' })
    .populate('formId', 'title')
    .populate('respondentId', 'firstName lastName')
    .sort({ 'timing.submittedAt': -1 })
    .limit(limit / 2);

  recentResponses.forEach(response => {
    activities.push({
      type: 'response_submitted',
      title: `New response to "${response.formId.title}"`,
      user: response.respondentId || { firstName: 'Anonymous', lastName: 'User' },
      timestamp: response.timing.submittedAt,
      metadata: { responseId: response._id, formId: response.formId._id }
    });
  });

  return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
}

async function getAppUserRecentActivity(user, limit) {
  const userAppIds = user.appAccess.map(access => access.appId);
  const activities = [];

  // Recent forms in user's apps
  const recentForms = await Form.find({
    $or: [
      { createdBy: user._id },
      { appId: { $in: userAppIds } }
    ]
  })
    .populate('createdBy', 'firstName lastName')
    .populate('appId', 'name displayName')
    .sort({ createdAt: -1 })
    .limit(limit);

  recentForms.forEach(form => {
    activities.push({
      type: 'form_created',
      title: `Form "${form.title}" ${form.createdBy._id.toString() === user._id.toString() ? 'created by you' : 'created'}`,
      user: form.createdBy,
      app: form.appId,
      timestamp: form.createdAt,
      metadata: { formId: form._id }
    });
  });

  return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
}

module.exports = router;