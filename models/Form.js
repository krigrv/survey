const mongoose = require('mongoose');

// Question schema for different types of form fields
const questionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'text',
      'textarea',
      'email',
      'number',
      'phone',
      'date',
      'time',
      'datetime',
      'select',
      'radio',
      'checkbox',
      'file',
      'rating',
      'matrix',
      'section_break',
      'page_break'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  },
  options: [{
    id: String,
    label: String,
    value: String
  }],
  validation: {
    minLength: Number,
    maxLength: Number,
    min: Number,
    max: Number,
    pattern: String,
    customMessage: String
  },
  settings: {
    placeholder: String,
    helpText: String,
    allowMultiple: Boolean,
    maxFileSize: Number,
    allowedFileTypes: [String],
    ratingScale: Number,
    matrixRows: [String],
    matrixColumns: [String]
  },
  order: {
    type: Number,
    required: true
  },
  conditional: {
    dependsOn: String,
    condition: String,
    value: mongoose.Schema.Types.Mixed
  }
});

// Form schema
const formSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  // App references removed - no longer using app-based organization
  formType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FormType',
    default: null
  },
  // User references removed - forms are now public
  status: {
    type: String,
    enum: ['draft', 'published', 'closed', 'archived'],
    default: 'draft'
  },
  questions: [questionSchema],
  settings: {
    allowAnonymous: {
      type: Boolean,
      default: true
    },
    allowMultipleSubmissions: {
      type: Boolean,
      default: false
    },
    // Login requirement removed - forms are now public
    showProgressBar: {
      type: Boolean,
      default: true
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    collectEmail: {
      type: Boolean,
      default: false
    },
    sendConfirmationEmail: {
      type: Boolean,
      default: false
    },
    customTheme: {
      primaryColor: String,
      backgroundColor: String,
      fontFamily: String
    },
    submissionLimit: Number,
    expiryDate: Date,
    password: String
  },
  analytics: {
    totalViews: {
      type: Number,
      default: 0
    },
    totalSubmissions: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },
    averageTime: {
      type: Number,
      default: 0
    }
  },
  sharing: {
    isPublic: {
      type: Boolean,
      default: false
    },
    shareableLink: {
      type: String,
      unique: true,
      sparse: true
    },
    embedCode: String,
    qrCode: String
  },
  notifications: {
    emailOnSubmission: {
      type: Boolean,
      default: false
    },
    notificationEmails: [String],
    webhookUrl: String
  },
  // User assignment removed - forms are now public
  lastModified: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1
  },
  tags: [String],
  category: {
    type: String,
    default: 'general'
  }
}, {
  timestamps: true
});

// Indexes for better performance
formSchema.index({ status: 1 });
formSchema.index({ 'sharing.shareableLink': 1 });
formSchema.index({ title: 'text', description: 'text' });
formSchema.index({ createdAt: -1 });
formSchema.index({ tags: 1 });

// Pre-save middleware to update lastModified
formSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

// Generate shareable link
formSchema.methods.generateShareableLink = function() {
  const crypto = require('crypto');
  this.sharing.shareableLink = crypto.randomBytes(16).toString('hex');
  return this.sharing.shareableLink;
};

// Generate embed code
formSchema.methods.generateEmbedCode = function() {
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  this.sharing.embedCode = `<iframe src="${baseUrl}/embed/${this.sharing.shareableLink}" width="100%" height="600" frameborder="0"></iframe>`;
  return this.sharing.embedCode;
};

// Check if user can access this form
// User access control removed - forms are now public

// Get form statistics
formSchema.methods.getStatistics = function() {
  return {
    totalViews: this.analytics.totalViews,
    totalSubmissions: this.analytics.totalSubmissions,
    completionRate: this.analytics.completionRate,
    averageTime: this.analytics.averageTime,
    questionsCount: this.questions.length,
    lastModified: this.lastModified,
    status: this.status
  };
};

// Virtual for form URL
formSchema.virtual('formUrl').get(function() {
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  return `${baseUrl}/form/${this.sharing.shareableLink || this._id}`;
});

// Ensure virtual fields are serialized
formSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Form', formSchema);