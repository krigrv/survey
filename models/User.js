const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: [
      'super_admin',
      'admin',
      'mydhl_admin',
      'mydhl_edit',
      'mydhl_view',
      'odd_admin',
      'odd_edit',
      'odd_view'
    ],
    required: true
  },
  appAccess: [{
    appId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'App'
    },
    appName: String,
    permissions: {
      type: String,
      enum: ['view', 'edit', 'admin'],
      default: 'view'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastLogin: {
    type: Date
  },
  profileImage: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'appAccess.appId': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get user permissions for a specific app
userSchema.methods.getAppPermissions = function(appId) {
  const appAccess = this.appAccess.find(access => 
    access.appId.toString() === appId.toString()
  );
  return appAccess ? appAccess.permissions : null;
};

// Check if user has permission for an app
userSchema.methods.hasAppPermission = function(appId, requiredPermission) {
  const permissions = this.getAppPermissions(appId);
  if (!permissions) return false;
  
  const permissionLevels = { view: 1, edit: 2, admin: 3 };
  const userLevel = permissionLevels[permissions];
  const requiredLevel = permissionLevels[requiredPermission];
  
  return userLevel >= requiredLevel;
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);