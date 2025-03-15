const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Post = require('../models/Post');
const User = require('../models/User');
const Group = require('../models/Group');

// Welcome Page
router.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/feed');
    } else {
        res.render('welcome', {
            title: 'Welcome to EcoConnect'
        });
    }
});

// Feed Page
router.get('/feed', ensureAuthenticated, async (req, res) => {
    try {
        // Get posts with populated data
        const posts = await Post.find()
            .populate('author', 'username profilePicture')
            .populate('likes', 'username')
            .populate('comments.user', 'username profilePicture')
            .sort('-createdAt');

        // Get suggested users with similar interests
        const suggestedUsers = await User.find({
            _id: { $ne: req.user._id },
            interests: { $in: req.user.interests }
        })
        .select('username profilePicture interests')
        .limit(5);

        res.render('feed', {
            title: 'Feed',
            user: req.user,
            posts: posts,
            suggestedUsers: suggestedUsers
        });
    } catch (err) {
        console.error('Error loading feed:', err);
        req.flash('error_msg', 'Error loading feed');
        res.redirect('/');
    }
});

// Groups Page
router.get('/groups', ensureAuthenticated, async (req, res) => {
    try {
        const groups = await Group.find()
            .populate('creator', 'username profilePicture')
            .populate('members.user', 'username profilePicture')
            .sort('-createdAt');

        res.render('groups', {
            title: 'Environmental Groups',
            user: req.user,
            groups: groups
        });
    } catch (err) {
        console.error('Error loading groups:', err);
        req.flash('error_msg', 'Error loading groups');
        res.redirect('/feed');
    }
});

// Marketplace Page
router.get('/marketplace', ensureAuthenticated, (req, res) => {
    res.render('marketplace', {
        title: 'Eco Marketplace',
        user: req.user
    });
});

// Volunteers Page
router.get('/volunteers', ensureAuthenticated, (req, res) => {
    res.render('volunteers', {
        title: 'Volunteer Opportunities',
        user: req.user
    });
});

// Chat Page
router.get('/chat', ensureAuthenticated, (req, res) => {
    res.render('chat', {
        title: 'Chat',
        user: req.user
    });
});

module.exports = router;
