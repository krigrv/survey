const express = require('express');
const router = express.Router();
const FormType = require('../models/FormType');
const auth = require('../middleware/auth');

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
    
    // For now, use a default user ID since we're bypassing auth
    // In a real scenario, you'd get this from req.user.id
    const defaultUserId = '507f1f77bcf86cd799439011'; // MongoDB ObjectId format
    
    const formType = new FormType({
      name: name.trim(),
      description: description ? description.trim() : '',
      createdBy: defaultUserId
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

module.exports = router;