const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Post = require('../models/Post');

// Create post
router.post('/create', ensureAuthenticated, async (req, res) => {
  try {
    const { content } = req.body;
    
    // Validate content
    if (!content || content.trim().length === 0) {
      req.flash('error_msg', 'Post content cannot be empty');
      return res.redirect('/feed');
    }

    // Create post with default category if not specified
    const post = new Post({
      author: req.user.id,
      content,
      category: req.body.category || 'General',
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : []
    });

    // Add media if provided
    if (req.body.mediaUrl) {
      post.media.push(req.body.mediaUrl);
    }

    await post.save();
    await post.populate('author', 'username profilePicture');
    req.flash('success_msg', 'Post created successfully');
    res.redirect('/feed');
  } catch (err) {
    console.error('Error creating post:', err);
    req.flash('error_msg', 'Error creating post');
    res.redirect('/feed');
  }
});

// Like/Unlike post
router.post('/:id/like', ensureAuthenticated, async (req, res) => {
  try {
    // Check if user has already liked the post
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const alreadyLiked = post.likes.some(id => id.toString() === req.user.id.toString());
    
    // Use atomic update operations to avoid concurrency issues
    let updatedPost;
    if (alreadyLiked) {
      // Remove like
      updatedPost = await Post.findByIdAndUpdate(
        req.params.id,
        { $pull: { likes: req.user.id } },
        { new: true } // Return the updated document
      );
    } else {
      // Add like
      updatedPost = await Post.findByIdAndUpdate(
        req.params.id,
        { $addToSet: { likes: req.user.id } }, // Use addToSet to prevent duplicate likes
        { new: true } // Return the updated document
      );
    }

    res.json({ 
      success: true, 
      liked: !alreadyLiked,
      likesCount: updatedPost.likes.length 
    });
  } catch (err) {
    console.error('Error liking post:', err);
    res.status(500).json({ success: false, message: 'Error processing like' });
  }
});

// Add comment
router.post('/:id/comment', ensureAuthenticated, async (req, res) => {
  try {
    const { content } = req.body;
    
    // Validate comment
    if (!content || content.trim().length === 0) {
      // Check if AJAX request
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(400).json({ success: false, message: 'Comment cannot be empty' });
      }
      req.flash('error_msg', 'Comment cannot be empty');
      return res.redirect('/feed');
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(404).json({ success: false, message: 'Post not found' });
      }
      req.flash('error_msg', 'Post not found');
      return res.redirect('/feed');
    }

    // Add the comment with the current user
    const newComment = {
      user: req.user.id,
      content: content.trim(),
      createdAt: new Date()
    };
    
    post.comments.push(newComment);
    await post.save();
    
    // Populate the comment with user data
    await post.populate('comments.user', 'username profilePicture');
    
    // Get the newly added comment (the last one)
    const addedComment = post.comments[post.comments.length - 1];
    
    // Check if AJAX request
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ 
        success: true, 
        message: 'Comment added successfully',
        comment: addedComment
      });
    }
    
    req.flash('success_msg', 'Comment added successfully');
    res.redirect('/feed');
  } catch (err) {
    console.error('Error adding comment:', err);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: 'Error adding comment' });
    }
    
    req.flash('error_msg', 'Error adding comment');
    res.redirect('/feed');
  }
});

// Get comments for a post
router.get('/:id/comments', ensureAuthenticated, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
                          .populate('comments.user', 'username profilePicture');
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    res.json({ success: true, comments: post.comments });
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ success: false, message: 'Error fetching comments' });
  }
});

// Delete post
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check if user is the author
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this post' });
    }

    await post.deleteOne();
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ success: false, message: 'Error deleting post' });
  }
});

module.exports = router;
