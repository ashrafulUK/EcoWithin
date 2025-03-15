const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Group = require('../models/Group');

// Get all groups
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const groups = await Group.find({ isPrivate: false })
      .populate('creator', 'username profilePicture')
      .populate('members.user', 'username profilePicture')
      .sort('-createdAt');
    
    res.render('groups', {
      title: 'Environmental Groups',
      user: req.user,
      groups: groups
    });
  } catch (err) {
    console.error('Error fetching groups:', err);
    req.flash('error_msg', 'Error loading groups');
    res.redirect('/');
  }
});

// Create group
router.post('/create', ensureAuthenticated, async (req, res) => {
  try {
    const { name, description, category, isPrivate } = req.body;
    const group = new Group({
      name,
      description,
      category,
      isPrivate: isPrivate === 'on',
      creator: req.user.id,
      members: [{ user: req.user.id, role: 'admin' }]
    });
    await group.save();
    req.flash('success_msg', 'Group created successfully');
    res.redirect('/groups');
  } catch (err) {
    console.error('Error creating group:', err);
    req.flash('error_msg', 'Error creating group');
    res.redirect('/groups');
  }
});

// Get group by id
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('creator', 'username profilePicture')
      .populate('members.user', 'username profilePicture')
      .populate('projects.participants', 'username profilePicture')
      .populate('discussions.author', 'username profilePicture');
    
    if (!group) {
      req.flash('error_msg', 'Group not found');
      return res.redirect('/groups');
    }

    if (group.isPrivate && !group.members.some(m => m.user.equals(req.user.id))) {
      req.flash('error_msg', 'Access denied: This is a private group');
      return res.redirect('/groups');
    }

    res.render('group-detail', {
      title: group.name,
      user: req.user,
      group: group
    });
  } catch (err) {
    console.error('Error fetching group:', err);
    req.flash('error_msg', 'Error loading group');
    res.redirect('/groups');
  }
});

// Join/Leave group
router.post('/:id/membership', ensureAuthenticated, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      req.flash('error_msg', 'Group not found');
      return res.redirect('/groups');
    }

    const memberIndex = group.members.findIndex(m => m.user.equals(req.user.id));
    if (memberIndex > -1) {
      if (group.members[memberIndex].role === 'admin' && group.members.filter(m => m.role === 'admin').length === 1) {
        req.flash('error_msg', 'Cannot leave group as sole admin');
        return res.redirect(`/groups/${group._id}`);
      }
      group.members.splice(memberIndex, 1);
      req.flash('success_msg', 'Left the group successfully');
    } else {
      group.members.push({ user: req.user.id, role: 'member' });
      req.flash('success_msg', 'Joined the group successfully');
    }

    await group.save();
    res.redirect(`/groups/${group._id}`);
  } catch (err) {
    console.error('Error updating membership:', err);
    req.flash('error_msg', 'Error updating group membership');
    res.redirect('/groups');
  }
});

// Create project
router.post('/:id/projects', ensureAuthenticated, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      req.flash('error_msg', 'Group not found');
      return res.redirect('/groups');
    }

    const member = group.members.find(m => m.user.equals(req.user.id));
    if (!member) {
      req.flash('error_msg', 'Must be a group member to create projects');
      return res.redirect(`/groups/${group._id}`);
    }

    const { title, description, startDate, endDate } = req.body;
    group.projects.push({
      title,
      description,
      startDate,
      endDate,
      participants: [req.user.id]
    });

    await group.save();
    req.flash('success_msg', 'Project created successfully');
    res.redirect(`/groups/${group._id}`);
  } catch (err) {
    console.error('Error creating project:', err);
    req.flash('error_msg', 'Error creating project');
    res.redirect('/groups');
  }
});

// Add discussion
router.post('/:id/discussions', ensureAuthenticated, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      req.flash('error_msg', 'Group not found');
      return res.redirect('/groups');
    }

    const member = group.members.find(m => m.user.equals(req.user.id));
    if (!member) {
      req.flash('error_msg', 'Must be a group member to participate in discussions');
      return res.redirect(`/groups/${group._id}`);
    }

    group.discussions.push({
      author: req.user.id,
      content: req.body.content
    });

    await group.save();
    req.flash('success_msg', 'Discussion added successfully');
    res.redirect(`/groups/${group._id}`);
  } catch (err) {
    console.error('Error adding discussion:', err);
    req.flash('error_msg', 'Error adding discussion');
    res.redirect('/groups');
  }
});

module.exports = router;
