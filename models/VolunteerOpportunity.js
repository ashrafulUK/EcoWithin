const mongoose = require('mongoose');

const volunteerOpportunitySchema = new mongoose.Schema({
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  date: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    }
  },
  category: {
    type: String,
    required: true
  },
  requiredSkills: [{
    type: String
  }],
  volunteers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  maxVolunteers: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'completed'],
    default: 'open'
  },
  impact: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('VolunteerOpportunity', volunteerOpportunitySchema);
