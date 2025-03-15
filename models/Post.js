const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  media: [{
    type: String
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String
  }],
  category: {
    type: String,
    enum: ['General', 'Sustainability', 'Conservation', 'Climate Action', 'Education', 'Practice', 'practice'],
    default: 'General'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Method to properly populate comments with user data
postSchema.methods.populateComments = async function() {
  return this.populate('comments.user', 'username profilePicture');
};

module.exports = mongoose.model('Post', postSchema);
