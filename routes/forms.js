const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Form = require('../models/Form');
const Response = require('../models/Response');
const App = require('../models/App');
const { 
  auth, 
  requireAppPermission, 
  requireEditPermission,
  validateFormAccess,
  optionalAuth 
} = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/forms
// @desc    Get forms with filtering and pagination
// @access  Private
router.get('/', [
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('appId').optional().isMongoId(),
    query('appCode').optional().trim(),
    query('status').optional().isIn(['draft', 'published', 'closed', 'archived']),
    query('search').optional().trim(),
    query('category').optional().trim(),
    query('sortBy').optional().isIn(['createdAt', 'title', 'totalSubmissions', 'lastModified']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
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
    const { appId, appCode, status, search, category, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build query
    let query = {};

    // Filter by appId if provided
    if (appId) {
      query.appId = appId;
    }

    // Filter by app code if provided
    if (appCode) {
      const app = await App.findOne({ code: appCode });
      if (app) {
        query.appId = app._id;
      } else {
        return res.status(404).json({ message: 'App not found with the specified code' });
      }
    }

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const forms = await Form.find(query)
      .populate('appId', 'name displayName')
      .populate('createdBy', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Form.countDocuments(query);

    // Add form statistics
    const formsWithStats = await Promise.all(forms.map(async (form) => {
      const responseCount = await Response.countDocuments({ 
        formId: form._id, 
        status: 'submitted' 
      });
      
      return {
        ...form,
        responseCount,
        canEdit: form.canUserAccess ? form.canUserAccess(req.user, 'edit') : false
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
    console.error('Get forms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/forms/:id
// @desc    Get form by ID
// @access  Private
router.get('/:id', [
  auth,
  validateFormAccess
], async (req, res) => {
  try {
    const form = await Form.findById(req.params.id)
      .populate('appId', 'name displayName')
      .populate('createdBy', 'firstName lastName email');

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Get form statistics
    const stats = await Response.getFormAnalytics(form._id);
    
    const formWithStats = {
      ...form.toJSON(),
      statistics: stats,
      canEdit: form.canUserAccess(req.user, 'edit'),
      canDelete: form.canUserAccess(req.user, 'admin') || form.createdBy._id.toString() === req.user._id.toString()
    };

    res.json(formWithStats);
  } catch (error) {
    console.error('Get form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/forms
// @desc    Create a new form
// @access  Private (Edit permission required)
router.post('/', [
  [
    body('title').trim().notEmpty().isLength({ max: 200 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('appId').optional().isMongoId(),
    body('formType').optional().isMongoId(),
    body('questions').optional().isArray(),
    body('settings').optional().isObject(),
    body('category').optional().trim().isLength({ max: 50 })
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { title, description, appId, formType, questions = [], settings = {}, category, tags = [] } = req.body;

    // If no appId provided, create or find a default app
    let app;
    if (appId) {
      app = await App.findById(appId);
      if (!app) {
        return res.status(404).json({ message: 'App not found' });
      }
    } else {
      // Try to find existing default app or create one
      app = await App.findOne({ name: 'default-app' });
      if (!app) {
        app = new App({
          name: 'default-app',
          displayName: 'Default App',
          description: 'Default application for forms',
          code: 'DEFAULT',
          color: '#3B82F6',
          isActive: true
        });
        await app.save();
      }
      appId = app._id;
    }

    // Process questions to ensure proper structure
    const processedQuestions = questions.map((question, index) => ({
      id: question.id || `question_${Date.now()}_${index}`,
      type: question.type || 'text',
      title: question.title || 'Untitled Question',
      description: question.description || '',
      required: question.required || false,
      options: question.options || [],
      validation: question.validation || {},
      settings: question.settings || {},
      order: question.order || index,
      conditional: question.conditional || {}
    }));

    // Create form
    const form = new Form({
      title,
      description,
      appId,
      appName: app.name,
      formType: formType || null,
      createdBy: req.user ? req.user._id : null,
      questions: processedQuestions,
      settings: {
        ...settings,
        customTheme: settings.customTheme || {
          primaryColor: app.color,
          backgroundColor: '#ffffff',
          fontFamily: 'Inter, sans-serif'
        }
      },
      category: category || 'general',
      tags
    });

    // Generate shareable link if form is published
    if (form.status === 'published') {
      form.generateShareableLink();
      form.generateEmbedCode();
    }

    await form.save();

    // Update app form count
    await App.findByIdAndUpdate(appId, {
      $inc: { totalForms: 1 }
    });

    const populatedForm = await Form.findById(form._id)
      .populate('appId', 'name displayName')
      .populate('createdBy', 'firstName lastName email');

    res.status(201).json({
      message: 'Form created successfully',
      form: populatedForm
    });
  } catch (error) {
    console.error('Create form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/forms/:id
// @desc    Update form
// @access  Private (Edit permission required)
router.put('/:id', [
  auth,
  validateFormAccess,
  [
    body('title').optional().trim().notEmpty().isLength({ max: 200 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('formType').optional().isMongoId(),
    body('questions').optional().isArray(),
    body('settings').optional().isObject(),
    body('status').optional().isIn(['draft', 'published', 'closed', 'archived']),
    body('category').optional().trim().isLength({ max: 50 }),
    body('tags').optional().isArray()
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const form = req.form; // From validateFormAccess middleware
    
    // Check edit permission
    if (!form.canUserAccess(req.user, 'edit')) {
      return res.status(403).json({ message: 'No permission to edit this form' });
    }

    const { title, description, formType, questions, settings, status, category, tags } = req.body;

    // Update form fields
    if (title) form.title = title;
    if (description !== undefined) form.description = description;
    if (formType !== undefined) form.formType = formType;
    if (questions) {
      // Process questions to ensure proper structure
      const processedQuestions = questions.map((question, index) => ({
        id: question.id || `question_${Date.now()}_${index}`,
        type: question.type || 'text',
        title: question.title || 'Untitled Question',
        description: question.description || '',
        required: question.required || false,
        options: question.options || [],
        validation: question.validation || {},
        settings: question.settings || {},
        order: question.order || index,
        conditional: question.conditional || {}
      }));
      form.questions = processedQuestions;
    }
    if (settings) form.settings = { ...form.settings, ...settings };
    if (status) form.status = status;
    if (category) form.category = category;
    if (tags) form.tags = tags;

    // Generate shareable link if publishing for the first time
    if (status === 'published' && !form.sharing.shareableLink) {
      form.generateShareableLink();
      form.generateEmbedCode();
    }

    // Increment version
    form.version += 1;

    await form.save();

    const updatedForm = await Form.findById(form._id)
      .populate('appId', 'name displayName')
      .populate('createdBy', 'firstName lastName email');

    res.json({
      message: 'Form updated successfully',
      form: updatedForm
    });
  } catch (error) {
    console.error('Update form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/forms/:id
// @desc    Delete form
// @access  Private (Admin permission or form owner)
router.delete('/:id', [
  auth,
  validateFormAccess
], async (req, res) => {
  try {
    const form = req.form;
    
    // Check delete permission (admin or form creator)
    const canDelete = form.canUserAccess(req.user, 'admin') || 
                     form.createdBy.toString() === req.user._id.toString();
    
    if (!canDelete) {
      return res.status(403).json({ message: 'No permission to delete this form' });
    }

    // Delete all responses associated with this form
    await Response.deleteMany({ formId: form._id });

    // Update app form count
    await App.findByIdAndUpdate(form.appId, {
      $inc: { totalForms: -1 }
    });

    // Delete form
    await Form.findByIdAndDelete(form._id);

    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/forms/:id/duplicate
// @desc    Duplicate form
// @access  Private (Edit permission required)
router.post('/:id/duplicate', [
  auth,
  validateFormAccess,
  requireEditPermission
], async (req, res) => {
  try {
    const originalForm = req.form;
    
    // Check if user can create forms in this app
    if (!originalForm.canUserAccess(req.user, 'edit')) {
      return res.status(403).json({ message: 'No permission to duplicate this form' });
    }

    // Create duplicate
    const duplicateData = originalForm.toObject();
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    delete duplicateData.sharing;
    delete duplicateData.analytics;
    
    duplicateData.title = `${duplicateData.title} (Copy)`;
    duplicateData.status = 'draft';
    duplicateData.createdBy = req.user._id;
    duplicateData.version = 1;

    const duplicateForm = new Form(duplicateData);
    await duplicateForm.save();

    // Update app form count
    await App.findByIdAndUpdate(originalForm.appId, {
      $inc: { totalForms: 1 }
    });

    const populatedForm = await Form.findById(duplicateForm._id)
      .populate('appId', 'name displayName')
      .populate('createdBy', 'firstName lastName email');

    res.status(201).json({
      message: 'Form duplicated successfully',
      form: populatedForm
    });
  } catch (error) {
    console.error('Duplicate form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/forms/:id/responses
// @desc    Get form responses
// @access  Private
router.get('/:id/responses', [
  auth,
  validateFormAccess,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['draft', 'submitted', 'incomplete']),
    query('search').optional().trim(),
    query('sortBy').optional().isIn(['createdAt', 'submittedAt', 'respondentName']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const form = req.form;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build query
    let query = { formId: form._id };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { respondentName: { $regex: search, $options: 'i' } },
        { respondentEmail: { $regex: search, $options: 'i' } },
        { 'answers.textValue': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const responses = await Response.find(query)
      .populate('respondentId', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Response.countDocuments(query);

    res.json({
      responses,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error('Get form responses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/forms/:id/analytics
// @desc    Get form analytics
// @access  Private
router.get('/:id/analytics', [
  auth,
  validateFormAccess
], async (req, res) => {
  try {
    const form = req.form;
    
    // Get detailed analytics
    const analytics = await Response.getFormAnalytics(form._id);
    
    // Get response distribution by date
    const responsesByDate = await Response.aggregate([
      { 
        $match: { 
          formId: form._id, 
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

    // Get question analytics
    const questionAnalytics = await Response.aggregate([
      { $match: { formId: form._id, status: 'submitted' } },
      { $unwind: '$answers' },
      {
        $group: {
          _id: '$answers.questionId',
          questionTitle: { $first: '$answers.questionTitle' },
          questionType: { $first: '$answers.questionType' },
          totalAnswers: { $sum: 1 },
          averageTime: { $avg: '$answers.metadata.timeSpent' }
        }
      }
    ]);

    res.json({
      ...analytics,
      responsesByDate,
      questionAnalytics,
      formStats: form.getStatistics()
    });
  } catch (error) {
    console.error('Get form analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/forms/public/:shareableLink
// @desc    Get public form by shareable link
// @access  Public
router.get('/public/:shareableLink', optionalAuth, async (req, res) => {
  try {
    const form = await Form.findOne({ 
      'sharing.shareableLink': req.params.shareableLink,
      status: 'published'
    }).populate('appId', 'name displayName');

    if (!form) {
      return res.status(404).json({ message: 'Form not found or not published' });
    }

    // Check if form requires login
    if (form.settings.requireLogin && !req.user) {
      return res.status(401).json({ message: 'Login required to access this form' });
    }

    // Check if form has expired
    if (form.settings.expiryDate && new Date() > form.settings.expiryDate) {
      return res.status(410).json({ message: 'Form has expired' });
    }

    // Increment view count
    await Form.findByIdAndUpdate(form._id, {
      $inc: { 'analytics.totalViews': 1 }
    });

    // Return form without sensitive data
    const publicForm = {
      _id: form._id,
      title: form.title,
      description: form.description,
      questions: form.questions,
      settings: {
        allowAnonymous: form.settings.allowAnonymous,
        allowMultipleSubmissions: form.settings.allowMultipleSubmissions,
        showProgressBar: form.settings.showProgressBar,
        shuffleQuestions: form.settings.shuffleQuestions,
        collectEmail: form.settings.collectEmail,
        customTheme: form.settings.customTheme
      },
      appId: form.appId
    };

    res.json(publicForm);
  } catch (error) {
    console.error('Get public form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;