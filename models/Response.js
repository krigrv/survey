const mongoose = require('mongoose');

// Answer schema for individual question responses
const answerSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true
  },
  questionType: {
    type: String,
    required: true
  },
  questionTitle: {
    type: String,
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  textValue: String, // For search and display purposes
  fileUrls: [String], // For file uploads
  metadata: {
    timeSpent: Number, // Time spent on this question in seconds
    attempts: Number, // Number of times user changed the answer
    skipped: Boolean
  }
});

// Response schema
const responseSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
    required: true
  },
  formTitle: {
    type: String,
    required: true
  },
  formTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FormType'
  },
  formTypeName: {
    type: String
  },
  // App references removed - forms are now independent
  // respondentId removed - user references eliminated
  respondentEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  respondentName: {
    type: String,
    trim: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  answers: [answerSchema],
  status: {
    type: String,
    enum: ['draft', 'submitted', 'incomplete'],
    default: 'draft'
  },
  submissionData: {
    ipAddress: String,
    userAgent: String,
    referrer: String,
    location: {
      country: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    device: {
      type: String,
      os: String,
      browser: String
    }
  },
  timing: {
    startedAt: {
      type: Date,
      default: Date.now
    },
    submittedAt: Date,
    totalTime: Number, // Total time in seconds
    timePerPage: [{
      page: Number,
      timeSpent: Number
    }]
  },
  score: {
    total: Number,
    percentage: Number,
    passed: Boolean
  },
  flags: {
    isSpam: {
      type: Boolean,
      default: false
    },
    isFlagged: {
      type: Boolean,
      default: false
    },
    flagReason: String,
    // reviewedBy removed - user references eliminated
    reviewedAt: Date
  },
  notes: [{
    content: String,
    // addedBy removed - user references eliminated
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [String],
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for better performance
responseSchema.index({ formId: 1, createdAt: -1 });
responseSchema.index({ formTypeId: 1, createdAt: -1 });
// App index removed
// respondentId index removed
responseSchema.index({ respondentEmail: 1 });
responseSchema.index({ status: 1 });
responseSchema.index({ 'timing.submittedAt': -1 });
responseSchema.index({ 'flags.isSpam': 1 });
responseSchema.index({ 'flags.isFlagged': 1 });

// Text index for searching responses
responseSchema.index({
  formTitle: 'text',
  respondentName: 'text',
  respondentEmail: 'text',
  'answers.textValue': 'text'
});

// Pre-save middleware to calculate total time and set submission data
responseSchema.pre('save', function(next) {
  if (this.status === 'submitted' && !this.timing.submittedAt) {
    this.timing.submittedAt = new Date();
    
    if (this.timing.startedAt) {
      this.timing.totalTime = Math.floor(
        (this.timing.submittedAt - this.timing.startedAt) / 1000
      );
    }
  }
  
  // Update text values for search
  this.answers.forEach(answer => {
    if (typeof answer.value === 'string') {
      answer.textValue = answer.value;
    } else if (Array.isArray(answer.value)) {
      answer.textValue = answer.value.join(', ');
    } else if (typeof answer.value === 'object') {
      answer.textValue = JSON.stringify(answer.value);
    } else {
      answer.textValue = String(answer.value);
    }
  });
  
  next();
});

// Method to get answer by question ID
responseSchema.methods.getAnswer = function(questionId) {
  return this.answers.find(answer => answer.questionId === questionId);
};

// Method to calculate completion percentage
responseSchema.methods.getCompletionPercentage = function(totalQuestions) {
  const answeredQuestions = this.answers.filter(answer => 
    answer.value !== null && 
    answer.value !== undefined && 
    answer.value !== '' &&
    !answer.metadata?.skipped
  ).length;
  
  return totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
};

// Method to export response data
responseSchema.methods.exportData = function() {
  const data = {
    responseId: this._id,
    formTitle: this.formTitle,
    respondentName: this.respondentName || 'Anonymous',
    respondentEmail: this.respondentEmail || 'N/A',
    submittedAt: this.timing.submittedAt,
    totalTime: this.timing.totalTime,
    status: this.status
  };
  
  // Add answers
  this.answers.forEach(answer => {
    data[answer.questionTitle] = answer.textValue || answer.value;
  });
  
  return data;
};

// Static method to get analytics for a form
responseSchema.statics.getFormAnalytics = async function(formId) {
  const pipeline = [
    { $match: { formId: new mongoose.Types.ObjectId(formId), status: 'submitted' } },
    {
      $group: {
        _id: null,
        totalResponses: { $sum: 1 },
        averageTime: { $avg: '$timing.totalTime' },
        lastSubmission: { $max: '$timing.submittedAt' },
        firstSubmission: { $min: '$timing.submittedAt' }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalResponses: 0,
    averageTime: 0,
    lastSubmission: null,
    firstSubmission: null
  };
};

// Virtual for response summary
responseSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    respondent: this.respondentName || 'Anonymous',
    email: this.respondentEmail,
    submittedAt: this.timing.submittedAt,
    totalTime: this.timing.totalTime,
    status: this.status,
    answersCount: this.answers.length
  };
});

// Ensure virtual fields are serialized
responseSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Response', responseSchema);