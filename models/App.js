const mongoose = require('mongoose');

const appSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  icon: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#007bff'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    allowFormCreation: {
      type: Boolean,
      default: true
    },
    allowUserManagement: {
      type: Boolean,
      default: false
    },
    maxFormsPerUser: {
      type: Number,
      default: 100
    },
    formRetentionDays: {
      type: Number,
      default: 365
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  totalUsers: {
    type: Number,
    default: 0
  },
  totalForms: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better performance
appSchema.index({ name: 1 });
appSchema.index({ code: 1 });
appSchema.index({ isActive: 1 });
appSchema.index({ createdBy: 1 });

// Pre-save middleware to ensure code is uppercase
appSchema.pre('save', function(next) {
  if (this.code) {
    this.code = this.code.toUpperCase();
  }
  next();
});

// Static method to get default apps
appSchema.statics.getDefaultApps = function() {
  return [
    {
      name: 'mydhl',
      displayName: 'MyDHL+',
      description: 'MyDHL+ application forms and surveys',
      code: 'MYDHL',
      icon: '📦',
      color: '#ff6b35'
    },
    {
      name: 'odd',
      displayName: 'ODD',
      description: 'ODD application forms and surveys',
      code: 'ODD',
      icon: '🚚',
      color: '#4ecdc4'
    }
  ];
};

// Instance method to check if user is admin of this app
appSchema.methods.isUserAdmin = function(userId) {
  return this.admins.some(adminId => adminId.toString() === userId.toString());
};

// Instance method to add admin
appSchema.methods.addAdmin = function(userId) {
  if (!this.isUserAdmin(userId)) {
    this.admins.push(userId);
  }
};

// Instance method to remove admin
appSchema.methods.removeAdmin = function(userId) {
  this.admins = this.admins.filter(adminId => adminId.toString() !== userId.toString());
};

module.exports = mongoose.model('App', appSchema);