const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Form = require('../models/Form');
const Response = require('../models/Response');
// Authentication middleware removed

const router = express.Router();

// @route   GET /api/forms
// @desc    Get forms with filtering and pagination
// @access  Private
router.get('/', [
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
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
    const { status, search, category, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build query
    let query = {};

    // App filtering removed - forms are now independent

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
router.get('/:id', async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Get form statistics
    const stats = await Response.getFormAnalytics(form._id);
    
    const formWithStats = {
      ...form.toJSON(),
      statistics: stats,
      canEdit: true, // Forms are now public and editable
      canDelete: true // Forms are now public and deletable
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

    let { title, description, formType, questions = [], settings = {}, category, tags = [] } = req.body;

    // App management removed - forms are now independent

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
      formType: formType || null,
      questions: processedQuestions,
      settings: {
        ...settings,
        customTheme: settings.customTheme || {
          primaryColor: '#3B82F6',
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

    // App management removed - no need to update app counts

    const savedForm = await Form.findById(form._id);

    res.status(201).json({
      message: 'Form created successfully',
      form: savedForm
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
  [
    body('title').optional().trim().notEmpty().isLength({ max: 200 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('formType').optional().isMongoId(),
    body('questions').optional().isArray(),
    body('settings').optional().isObject(),
    body('status').optional().isIn(['draft', 'published', 'closed', 'archived']),
    body('category').optional().trim().isLength({ max: 50 }),
    body('tags').optional().isArray(),
    // User assignment removed
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
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
    // User assignment removed

    // Generate shareable link if publishing for the first time
    if (status === 'published' && !form.sharing.shareableLink) {
      form.generateShareableLink();
      form.generateEmbedCode();
    }

    // Increment version
    form.version += 1;

    await form.save();

    const updatedForm = await Form.findById(form._id);

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
router.delete('/:id', async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Delete all responses associated with this form
    await Response.deleteMany({ formId: form._id });

    // App management removed

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
router.post('/:id/duplicate', async (req, res) => {
  try {
    const originalForm = await Form.findById(req.params.id);
    
    if (!originalForm) {
      return res.status(404).json({ message: 'Form not found' });
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
    // User authentication removed
    duplicateData.version = 1;

    const duplicateForm = new Form(duplicateData);
    await duplicateForm.save();

    // App management removed

    const savedForm = await Form.findById(duplicateForm._id);

    res.status(201).json({
      message: 'Form duplicated successfully',
      form: savedForm
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
      // User populate removed
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
router.get('/:id/analytics', async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }
    
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
router.get('/public/:shareableLink', async (req, res) => {
  try {
    const form = await Form.findOne({ 
      'sharing.shareableLink': req.params.shareableLink,
      status: 'published'
    });

    if (!form) {
      return res.status(404).json({ message: 'Form not found or not published' });
    }

    // Login requirement removed - forms are now publicly accessible

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
      // App reference removed
    };

    res.json(publicForm);
  } catch (error) {
    console.error('Get public form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;