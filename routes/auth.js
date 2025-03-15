const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { ensureAuthenticated } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword, interests } = req.body;

    // Validation
    const errors = [];
    if (!username || !email || !password || !confirmPassword) {
      errors.push('Please fill in all fields');
    }
    if (password !== confirmPassword) {
      errors.push('Passwords do not match');
    }
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
    if (!interests || interests.length === 0) {
      errors.push('Please select at least one eco interest');
    }

    if (errors.length > 0) {
      errors.forEach(error => req.flash('error_msg', error));
      return res.redirect('/');
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      req.flash('error_msg', 'Email or username is already registered');
      return res.redirect('/');
    }

    // Create new user
    const newUser = new User({
      username,
      email,
      password,
      interests: Array.isArray(interests) ? interests : [interests]
    });

    await newUser.save();
    req.flash('success_msg', 'You are now registered! Please log in');
    res.redirect('/');
  } catch (err) {
    console.error('Registration error:', err);
    req.flash('error_msg', 'Error in registration. Please try again.');
    res.redirect('/');
  }
});

// Register page
router.get('/register', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/feed');
    } else {
        res.render('auth/register', {
            title: 'Register'
        });
    }
});

// Login
router.post('/login', (req, res, next) => {
  if (!req.body.email || !req.body.password) {
    req.flash('error_msg', 'Please provide both email and password');
    return res.redirect('/');
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Login error:', err);
      req.flash('error_msg', 'An error occurred during login');
      return res.redirect('/');
    }

    if (!user) {
      req.flash('error_msg', info.message || 'Invalid email or password');
      return res.redirect('/');
    }

    req.logIn(user, (err) => {
      if (err) {
        console.error('Login error:', err);
        req.flash('error_msg', 'An error occurred during login');
        return res.redirect('/');
      }

      req.flash('success_msg', 'Welcome back!');
      res.redirect('/feed');
    });
  })(req, res, next);
});

// Login page
router.get('/login', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/feed');
    } else {
        res.render('auth/login', {
            title: 'Login'
        });
    }
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      req.flash('error_msg', 'An error occurred during logout');
    } else {
      req.flash('success_msg', 'You have been logged out');
    }
    res.redirect('/');
  });
});

module.exports = router;
