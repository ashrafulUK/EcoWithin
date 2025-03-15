const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    select: false,
    minlength: 6
  },
  profilePicture: {
    type: String,
    default: '/images/default-avatar.png'
  },
  bio: {
    type: String,
    maxLength: 500,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  interests: [{
    type: String,
    enum: [
      'Renewable Energy',
      'Sustainable Living',
      'Wildlife Conservation',
      'Zero Waste',
      'Organic Farming',
      'Climate Action',
      'Ocean Conservation',
      'Green Technology'
    ]
  }],
  connections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  pendingConnections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  volunteering: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VolunteerOpportunity'
  }],
  ecoPoints: {
    type: Number,
    default: 0
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Remove password from JSON responses
UserSchema.set('toJSON', {
  transform: function(doc, ret, opt) {
    delete ret.password;
    return ret;
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    throw new Error('Error comparing passwords');
  }
};

module.exports = mongoose.model('User', UserSchema);
