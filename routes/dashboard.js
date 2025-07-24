const express = require('express');
const { query, validationResult } = require('express-validator');
const Form = require('../models/Form');
const Response = require('../models/Response');
const FormType = require('../models/FormType');
const mongoose = require('mongoose');

const router = express.Router();

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview data
// @access  Public
router.get('/overview', async (req, res) => {
  try {
    // Get total counts
    const totalForms = await Form.countDocuments();
    const totalResponses = await Response.countDocuments({ status: 'submitted' });
    const activeForms = await Form.countDocuments({ status: 'published' });
    const totalFormTypes = await FormType.countDocuments();

    // Get recent activity count
    const recentFormsCount = await Form.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const recentResponsesCount = await Response.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      status: 'submitted'
    });

    res.json({
      totalForms,
      totalResponses,
      activeForms,
      totalFormTypes,
      recentFormsCount,
      recentResponsesCount
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics with period filtering
// @access  Public
router.get('/stats', [
  query('period').optional().isIn(['7', '30', '90', '365']),
  query('appId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const period = parseInt(req.query.period) || 30;
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

    // Build query filters
    const formQuery = { createdAt: { $gte: startDate } };
    const responseQuery = { 
      createdAt: { $gte: startDate },
      status: 'submitted'
    };

    // Get statistics
    const formsCreated = await Form.countDocuments(formQuery);
    const responsesReceived = await Response.countDocuments(responseQuery);
    
    // Get average response time
    const avgResponseTime = await Response.aggregate([
      { $match: responseQuery },
      { $group: {
        _id: null,
        avgTime: { $avg: '$timing.totalTime' }
      }}
    ]);

    // Get completion rate
    const totalStarted = await Response.countDocuments({
      createdAt: { $gte: startDate }
    });
    const totalCompleted = await Response.countDocuments(responseQuery);
    const completionRate = totalStarted > 0 ? (totalCompleted / totalStarted) * 100 : 0;

    // Get form status distribution
    const formStatusDistribution = await Form.aggregate([
      { $match: formQuery },
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }}
    ]);

    res.json({
      period,
      formsCreated,
      responsesReceived,
      averageResponseTime: avgResponseTime[0]?.avgTime || 0,
      completionRate,
      formStatusDistribution: formStatusDistribution.map(item => ({
        status: item._id,
        count: item.count
      }))
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/activity
// @desc    Get recent activity
// @access  Public
router.get('/activity', [
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const limit = parseInt(req.query.limit) || 10;

    // Get recent forms
    const recentForms = await Form.find()
      .sort({ createdAt: -1 })
      .limit(Math.ceil(limit / 2))
      .select('title createdAt status')
      .lean();

    // Get recent responses
    const recentResponses = await Response.find({ status: 'submitted' })
      .sort({ createdAt: -1 })
      .limit(Math.ceil(limit / 2))
      .select('formTitle createdAt respondentName')
      .lean();

    // Combine and format activities
    const activities = [];

    recentForms.forEach(form => {
      activities.push({
        type: 'form_created',
        title: `Form "${form.title}" was created`,
        timestamp: form.createdAt,
        metadata: {
          formId: form._id,
          formTitle: form.title,
          status: form.status
        }
      });
    });

    recentResponses.forEach(response => {
      activities.push({
        type: 'response_submitted',
        title: `New response to "${response.formTitle}"`,
        timestamp: response.createdAt,
        metadata: {
          responseId: response._id,
          formTitle: response.formTitle,
          respondentName: response.respondentName || 'Anonymous'
        }
      });
    });

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivities = activities.slice(0, limit);

    res.json({
      activities: limitedActivities,
      total: limitedActivities.length
    });
  } catch (error) {
    console.error('Dashboard activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/forms
// @desc    Get user's forms for dashboard
// @access  Public
router.get('/forms', [
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const limit = parseInt(req.query.limit) || 5;

    const forms = await Form.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Add response counts
    const formsWithStats = await Promise.all(forms.map(async (form) => {
      const responseCount = await Response.countDocuments({ 
        formId: form._id, 
        status: 'submitted' 
      });
      
      return {
        ...form,
        responseCount
      };
    }));

    res.json({
      forms: formsWithStats,
      total: formsWithStats.length
    });
  } catch (error) {
    console.error('Dashboard forms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/analytics
// @desc    Get analytics summary for dashboard
// @access  Public
router.get('/analytics', [
  query('period').optional().isIn(['7', '30', '90', '365']),
  query('appId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const period = parseInt(req.query.period) || 30;
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

    // Get forms over time
    const formsOverTime = await Form.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Get responses over time
    const responsesOverTime = await Response.aggregate([
      { $match: { 
        createdAt: { $gte: startDate },
        status: 'submitted'
      }},
      { $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Get form status distribution
    const formStatusDistribution = await Form.aggregate([
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }}
    ]);

    // Get top performing forms
    const topForms = await Response.aggregate([
      { $match: { status: 'submitted' } },
      { $group: {
        _id: '$formId',
        formTitle: { $first: '$formTitle' },
        responseCount: { $sum: 1 }
      }},
      { $sort: { responseCount: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      formsOverTime: formsOverTime.map(item => ({
        date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
        count: item.count
      })),
      responsesOverTime: responsesOverTime.map(item => ({
        date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
        count: item.count
      })),
      formStatusDistribution: formStatusDistribution.map(item => ({
        status: item._id,
        count: item.count
      })),
      topForms: topForms.map(item => ({
        formId: item._id,
        formTitle: item.formTitle,
        responseCount: item.responseCount
      }))
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;