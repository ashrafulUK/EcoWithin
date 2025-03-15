const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post'); // Add missing Post model import
const { ensureAuthenticated } = require('../middleware/auth');

// @route   GET /profile/search
// @desc    Search users
// @access  Private
router.get('/search', ensureAuthenticated, async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.json([]);
        }

        const users = await User.find({
            $or: [
                { username: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ],
            _id: { $ne: req.user._id } // Exclude current user
        })
        .select('username email profilePicture interests')
        .limit(10)
        .lean();

        res.json(users);
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: 'Search failed' });
    }
});

// @route   GET /profile/:id
// @desc    View user profile
// @access  Private
router.get('/:id', ensureAuthenticated, async (req, res) => {
    try {
        // First find the viewed user
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate({
                path: 'groups'
            })
            .populate({
                path: 'volunteering'
            })
            .lean();

        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/feed');
        }
        
        // Separately find posts by this user
        const posts = await Post.find({ author: req.params.id })
            .sort('-createdAt')
            .populate('author', 'username profilePicture')
            .lean();
        
        // Add posts to user object
        user.posts = posts;

        // Check if users are connected
        const currentUser = await User.findById(req.user._id);
        const isConnected = currentUser.connections && currentUser.connections.includes(user._id);

        // Set locals for the navbar
        res.locals.currentUser = req.user;
        res.locals.isAuthenticated = true;

        res.render('profile', {
            title: `${user.username}'s Profile`,
            user: user,
            isOwnProfile: req.user._id.toString() === req.params.id,
            isConnected: isConnected,
            currentUser: req.user,
            isAuthenticated: true
        });
    } catch (err) {
        console.error('Error loading profile:', err);
        req.flash('error_msg', 'Error loading profile');
        res.redirect('/feed');
    }
});

// @route   GET /profile
// @desc    Get own profile
// @access  Private
router.get('/', ensureAuthenticated, async (req, res) => {
    res.redirect(`/profile/${req.user._id}`);
});

// @route   POST /profile/connect/:id
// @desc    Connect with user
// @access  Private
router.post('/connect/:id', ensureAuthenticated, async (req, res) => {
    try {
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ error: 'Cannot connect with yourself' });
        }

        const userToConnect = await User.findById(req.params.id);
        if (!userToConnect) {
            return res.status(404).json({ error: 'User not found' });
        }

        const currentUser = await User.findById(req.user._id);
        
        // Check if already connected
        if (currentUser.connections.includes(req.params.id)) {
            // Remove connection (disconnect)
            currentUser.connections = currentUser.connections.filter(
                id => id.toString() !== req.params.id
            );
            userToConnect.connections = userToConnect.connections.filter(
                id => id.toString() !== req.user._id.toString()
            );
        } else {
            // Add connection
            currentUser.connections.push(req.params.id);
            userToConnect.connections.push(req.user._id);
        }

        await Promise.all([currentUser.save(), userToConnect.save()]);
        res.json({ success: true });
    } catch (err) {
        console.error('Connection error:', err);
        res.status(500).json({ error: 'Failed to update connection' });
    }
});

// @route   POST /profile
// @desc    Update user profile
// @access  Private
router.post('/', ensureAuthenticated, async (req, res) => {
    try {
        const {
            name,
            email,
            bio,
            location,
            interests
        } = req.body;

        // Ensure user can only update their own profile
        const user = await User.findById(req.user.id);
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/profile');
        }

        // Update fields
        if (name) user.username = name;
        if (email) user.email = email;
        if (bio) user.bio = bio;
        if (location) user.location = location;
        if (interests) {
            // Convert comma-separated string to array and trim whitespace
            user.interests = interests.split(',').map(interest => interest.trim());
        }

        await user.save();
        req.flash('success_msg', 'Profile updated successfully');
        res.redirect('/profile');
    } catch (err) {
        console.error('Error updating profile:', err);
        req.flash('error_msg', 'Error updating profile');
        res.redirect('/profile');
    }
});

module.exports = router;
