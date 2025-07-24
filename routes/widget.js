const express = require('express');
const router = express.Router();
const Form = require('../models/Form');
const Response = require('../models/Response');

// Get form data for widget
router.get('/forms/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    
    // Find the form by ID
    const form = await Form.findById(formId)
      .populate('formType', 'name description');
      // User populate removed
    
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    // Return only the necessary data for the widget
    const widgetData = {
      id: form._id,
      title: form.title,
      description: form.description,
      questions: form.questions.map(question => ({
        id: question.id,
        type: question.type,
        title: question.title,
        description: question.description,
        required: question.required,
        options: question.options,
        order: question.order
      })),
      settings: form.settings
    };
    
    res.json({ success: true, widgetData });
  } catch (error) {
    console.error('Error fetching form for widget:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit form response from widget
router.post('/forms/:formId/submit', async (req, res) => {
  try {
    const { formId } = req.params;
    const { answers, respondentInfo } = req.body;
    
    // Verify form exists and populate form type
    const form = await Form.findById(formId).populate('formType', 'name');
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    // Process answers to match the Response model structure
    const processedAnswers = answers.map(answer => ({
      questionId: answer.questionId,
      questionType: answer.questionType,
      questionTitle: answer.questionTitle,
      value: answer.value,
      metadata: {
        timeSpent: answer.timeSpent || 0,
        attempts: answer.attempts || 1,
        skipped: answer.skipped || false
      }
    }));
    
    // Create response document with form type information
    const response = new Response({
      formId: formId,
      formTitle: form.title,
      formTypeId: form.formType ? form.formType._id : null,
      formTypeName: form.formType ? form.formType.name : null,
      // App references removed - forms are now independent
      respondentEmail: respondentInfo?.email,
      respondentName: respondentInfo?.name,
      isAnonymous: !respondentInfo?.email,
      answers: processedAnswers,
      status: 'submitted',
      submissionData: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referer')
      },
      timing: {
        submittedAt: new Date()
      }
    });
    
    await response.save();
    
    // Update form analytics
    await Form.findByIdAndUpdate(formId, {
      $inc: { 'analytics.totalSubmissions': 1 }
    });
    
    res.json({ 
      success: true, 
      responseId: response._id,
      message: 'Response submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting form response:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get widget embed code
router.get('/forms/:formId/embed', async (req, res) => {
  try {
    const { formId } = req.params;
    
    // Verify form exists
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    const embedCode = `<script type="text/javascript" src="${baseUrl}/popup/embed.js" data-form-id="${formId}"></script>`;
    
    res.json({ 
      embedCode,
      formId,
      formTitle: form.title,
      instructions: 'Copy and paste this code into your website where you want the survey widget to appear.'
    });
  } catch (error) {
    console.error('Error generating embed code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;