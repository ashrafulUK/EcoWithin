const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');

// Send connection request
router.post('/request/:userId', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (targetUser.pendingConnections.includes(req.user.id)) {
      return res.status(400).json({ message: 'Connection request already sent' });
    }

    if (targetUser.connections.includes(req.user.id)) {
      return res.status(400).json({ message: 'Users are already connected' });
    }

    targetUser.pendingConnections.push(req.user.id);
    await targetUser.save();

    res.json({ message: 'Connection request sent' });
  } catch (err) {
    res.status(500).json({ message: 'Error sending connection request', error: err.message });
  }
});

// Accept/Reject connection request
router.put('/request/:userId', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { accept } = req.body;
    const currentUser = await User.findById(req.user.id);
    const requestingUser = await User.findById(req.params.userId);

    if (!requestingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const requestIndex = currentUser.pendingConnections.indexOf(req.params.userId);
    if (requestIndex === -1) {
      return res.status(400).json({ message: 'No pending request from this user' });
    }

    currentUser.pendingConnections.splice(requestIndex, 1);

    if (accept) {
      currentUser.connections.push(req.params.userId);
      requestingUser.connections.push(req.user.id);
      await requestingUser.save();
    }

    await currentUser.save();
    res.json({ message: accept ? 'Connection accepted' : 'Connection rejected' });
  } catch (err) {
    res.status(500).json({ message: 'Error processing connection request', error: err.message });
  }
});

// Remove connection
router.delete('/connection/:userId', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    const connectedUser = await User.findById(req.params.userId);

    if (!connectedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const connectionIndex = currentUser.connections.indexOf(req.params.userId);
    if (connectionIndex === -1) {
      return res.status(400).json({ message: 'Users are not connected' });
    }

    currentUser.connections.splice(connectionIndex, 1);
    const otherUserConnectionIndex = connectedUser.connections.indexOf(req.user.id);
    connectedUser.connections.splice(otherUserConnectionIndex, 1);

    await Promise.all([currentUser.save(), connectedUser.save()]);
    res.json({ message: 'Connection removed' });
  } catch (err) {
    res.status(500).json({ message: 'Error removing connection', error: err.message });
  }
});

// Get pending connection requests
router.get('/pending', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('pendingConnections', 'username profilePicture');
    res.json(user.pendingConnections);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching pending connections', error: err.message });
  }
});

// Get all connections
router.get('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('connections', 'username profilePicture');
    res.json(user.connections);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching connections', error: err.message });
  }
});

module.exports = router;
