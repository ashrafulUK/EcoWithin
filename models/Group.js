const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    }
  }],
  category: {
    type: String,
    required: true
  },
  projects: [{
    title: String,
    description: String,
    status: {
      type: String,
      enum: ['planning', 'in-progress', 'completed'],
      default: 'planning'
    },
    startDate: Date,
    endDate: Date,
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  discussions: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPrivate: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Group', groupSchema);
