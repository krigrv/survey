const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const FormType = require('../models/FormType');
const Form = require('../models/Form');
const Response = require('../models/Response');
// Authentication middleware removed

// Question type mapping from frontend to backend
const questionTypeMapping = {
  'multiple-choice': 'radio',
  'checkboxes': 'checkbox',
  'dropdown': 'select',
  'short-answer': 'text',
  'paragraph': 'textarea',
  'date': 'date',
  'time': 'time',
  'number': 'number',
  'email': 'email',
  'url': 'text',
  'file-upload': 'file'
};

// Helper function to map question types
function mapQuestionType(frontendType) {
  return questionTypeMapping[frontendType] || 'text';
}

// @route   GET /api/form-types
// @desc    Get all active form types
// @access  Public (since we're removing auth validation)
router.get('/', async (req, res) => {
  try {
    const formTypes = await FormType.find({ isActive: true })
      .select('name description')
      .sort({ name: 1 });
    
    res.json(formTypes);
  } catch (error) {
    console.error('Get form types error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/form-types/direct-save
// @desc    Save form data directly to MongoDB without authentication
// @access  Public
router.post('/direct-save', async (req, res) => {
  try {
    const { title, description, category } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Project title is required' });
    }
    
    // Create form type entry directly in survey.formtypes collection
    // User references removed - forms are now independent
    
    const formTypeData = {
      name: title.trim(),
      description: description ? description.trim() : '',
      category: category || 'general',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const formType = new FormType(formTypeData);
    await formType.save();
    
    res.status(201).json({
      message: 'Project data saved successfully to survey.formtypes',
      data: {
        id: formType._id,
        title: formType.name,
        description: formType.description,
        category: formType.category
      }
    });
  } catch (error) {
    console.error('Direct save error:', error);
    res.status(500).json({ message: 'Failed to save project data', error: error.message });
  }
});

// @route   POST /api/form-types
// @desc    Create a new form type
// @access  Public (since we're removing auth validation)
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Form type name is required' });
    }
    
    // Check if form type already exists
    const existingFormType = await FormType.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    
    if (existingFormType) {
      return res.status(400).json({ message: 'Form type already exists' });
    }
    
    // User references removed - forms are now independent
    
    const formType = new FormType({
      name: name.trim(),
      description: description ? description.trim() : ''
    });
    
    await formType.save();
    
    res.status(201).json({
      id: formType._id,
      name: formType.name,
      description: formType.description
    });
  } catch (error) {
    console.error('Create form type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/form-types/:id
// @desc    Update a form type
// @access  Public (since we're removing auth validation)
router.put('/:id', async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    
    const formType = await FormType.findById(req.params.id);
    
    if (!formType) {
      return res.status(404).json({ message: 'Form type not found' });
    }
    
    // Check if new name already exists (excluding current form type)
    if (name && name !== formType.name) {
      const existingFormType = await FormType.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      
      if (existingFormType) {
        return res.status(400).json({ message: 'Form type name already exists' });
      }
    }
    
    // Update fields
    if (name) formType.name = name.trim();
    if (description !== undefined) formType.description = description.trim();
    if (isActive !== undefined) formType.isActive = isActive;
    
    await formType.save();
    
    res.json({
      id: formType._id,
      name: formType.name,
      description: formType.description,
      isActive: formType.isActive
    });
  } catch (error) {
    console.error('Update form type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/form-types/:id
// @desc    Delete (deactivate) a form type
// @access  Public (since we're removing auth validation)
router.delete('/:id', async (req, res) => {
  try {
    const formType = await FormType.findById(req.params.id);
    
    if (!formType) {
      return res.status(404).json({ message: 'Form type not found' });
    }
    
    // Soft delete by setting isActive to false
    formType.isActive = false;
    await formType.save();
    
    res.json({ message: 'Form type deleted successfully' });
  } catch (error) {
    console.error('Delete form type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/form-types/save-form
// @desc    Save a form under a specific form type
// @access  Public
router.post('/save-form', async (req, res) => {
  try {
    const { 
      title, 
      description, 
      formTypeId, 
      questions, 
      settings, 
      // assignedUsers removed, 
      category, 
      tags 
    } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Form title is required' });
    }
    
    if (!formTypeId) {
      return res.status(400).json({ message: 'Form type is required' });
    }
    
    // Verify form type exists
    const formType = await FormType.findById(formTypeId);
    if (!formType) {
      return res.status(404).json({ message: 'Form type not found' });
    }
    
    // Map question types from frontend to backend format
    const mappedQuestions = (questions || []).map(question => ({
      ...question,
      type: mapQuestionType(question.type),
      options: question.options ? question.options.map(option => ({
        id: option.id,
        label: option.text,
        value: option.value
      })) : []
    }));

    const formData = {
      title: title.trim(),
      description: description ? description.trim() : '',
      // App and user references removed - forms are now independent
      formType: formTypeId,
      questions: mappedQuestions,
      settings: settings || {},
      // assignedUsers removed
      category: category || 'general',
      tags: tags || []
    };
    
    const form = new Form(formData);
    await form.save();
    
    res.status(201).json({
      message: 'Form saved successfully',
      data: {
        id: form._id,
        title: form.title,
        description: form.description,
        formTypeId: form.formTypeId,
        settings: form.settings,
        category: form.category,
        createdAt: form.createdAt
      }
    });
  } catch (error) {
    console.error('Save form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/form-types/:id/forms
// @desc    Get all forms for a specific form type
// @access  Public
router.get('/:id/forms', async (req, res) => {
  try {
    const formTypeId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    
    // Verify form type exists
    const formType = await FormType.findById(formTypeId);
    if (!formType) {
      return res.status(404).json({ message: 'Form type not found' });
    }
    
    // Build query
    let query = { formType: formTypeId };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Get total count for pagination
    const totalForms = await Form.countDocuments(query);
    const totalPages = Math.ceil(totalForms / limit);
    const skip = (page - 1) * limit;
    
    const forms = await Form.find(query)
      .select('title description createdAt updatedAt status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    res.json({
      forms,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalForms,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get forms by type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/form-types/forms/:id
// @desc    Get a specific form by ID
// @access  Public
router.get('/forms/:id', async (req, res) => {
  try {
    const formId = req.params.id;
    
    const form = await Form.findById(formId).populate('formType', 'name description');
    
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }
    
    res.json(form);
  } catch (error) {
    console.error('Get form by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/form-types/:formTypeId/responses
// @desc    Get all responses for a specific form type
// @access  Public
router.get('/:formTypeId/responses', async (req, res) => {
  try {
    const { formTypeId } = req.params;
    const { page = 1, limit = 10, status = 'all' } = req.query;
    
    // Build query filter
    const filter = { formTypeId };
    if (status !== 'all') {
      filter.status = status;
    }
    
    // Get responses with pagination
    const responses = await Response.find(filter)
      .select('formTitle respondentName respondentEmail timing.submittedAt status answers')
      .sort({ 'timing.submittedAt': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    // Get total count for pagination
    const total = await Response.countDocuments(filter);
    
    // Get form type name
    const formType = await FormType.findById(formTypeId).select('name');
    
    res.json({
      success: true,
      data: {
        responses,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        },
        formTypeName: formType ? formType.name : 'Unknown'
      }
    });
  } catch (error) {
    console.error('Get responses by form type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/form-types/responses/summary
// @desc    Get response summary grouped by form type
// @access  Public
router.get('/responses/summary', async (req, res) => {
  try {
    const summary = await Response.aggregate([
      {
        $group: {
          _id: '$formTypeId',
          formTypeName: { $first: '$formTypeName' },
          totalResponses: { $sum: 1 },
          latestResponse: { $max: '$timing.submittedAt' },
          forms: { $addToSet: { formId: '$formId', formTitle: '$formTitle' } }
        }
      },
      {
        $sort: { totalResponses: -1 }
      }
    ]);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get response summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/form-types/responses/:responseId
// @desc    Get detailed response by ID
// @access  Public
router.get('/responses/:responseId', async (req, res) => {
  try {
    const { responseId } = req.params;
    
    const response = await Response.findById(responseId);
    
    if (!response) {
      return res.status(404).json({ message: 'Response not found' });
    }
    
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Get response by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;