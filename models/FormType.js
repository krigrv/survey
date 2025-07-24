const mongoose = require('mongoose');

const formTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // createdBy removed - user references eliminated
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
formTypeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
formTypeSchema.index({ name: 1 });
formTypeSchema.index({ isActive: 1 });
// createdBy index removed

module.exports = mongoose.model('FormType', formTypeSchema);