const express = require('express');
const router = express.Router();
const passport = require('passport');
const VolunteerOpportunity = require('../models/VolunteerOpportunity');

// Create volunteer opportunity
router.post('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      date,
      category,
      requiredSkills,
      maxVolunteers,
      impact
    } = req.body;

    const opportunity = new VolunteerOpportunity({
      organizer: req.user.id,
      title,
      description,
      location,
      date,
      category,
      requiredSkills,
      maxVolunteers,
      impact
    });

    await opportunity.save();
    await opportunity.populate('organizer', 'username profilePicture');
    res.status(201).json(opportunity);
  } catch (err) {
    res.status(500).json({ message: 'Error creating volunteer opportunity', error: err.message });
  }
});

// Get all volunteer opportunities
router.get('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const opportunities = await VolunteerOpportunity.find({ status: 'open' })
      .populate('organizer', 'username profilePicture')
      .populate('volunteers.user', 'username profilePicture')
      .sort('-createdAt');
    res.json(opportunities);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching opportunities', error: err.message });
  }
});

// Get volunteer opportunity by id
router.get('/:id', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const opportunity = await VolunteerOpportunity.findById(req.params.id)
      .populate('organizer', 'username profilePicture')
      .populate('volunteers.user', 'username profilePicture');
    
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }
    res.json(opportunity);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching opportunity', error: err.message });
  }
});

// Apply for volunteer opportunity
router.post('/:id/apply', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const opportunity = await VolunteerOpportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    if (opportunity.status !== 'open') {
      return res.status(400).json({ message: 'Opportunity is not open for applications' });
    }

    const existingApplication = opportunity.volunteers.find(v => v.user.equals(req.user.id));
    if (existingApplication) {
      return res.status(400).json({ message: 'Already applied to this opportunity' });
    }

    if (opportunity.volunteers.length >= opportunity.maxVolunteers) {
      return res.status(400).json({ message: 'Maximum volunteers reached' });
    }

    opportunity.volunteers.push({ user: req.user.id });
    await opportunity.save();
    await opportunity.populate('volunteers.user', 'username profilePicture');
    res.json(opportunity);
  } catch (err) {
    res.status(500).json({ message: 'Error applying for opportunity', error: err.message });
  }
});

// Update volunteer application status (for organizers)
router.put('/:id/volunteer/:userId', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const opportunity = await VolunteerOpportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    if (!opportunity.organizer.equals(req.user.id)) {
      return res.status(403).json({ message: 'Only organizer can update application status' });
    }

    const volunteer = opportunity.volunteers.find(v => v.user.equals(req.params.userId));
    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer application not found' });
    }

    volunteer.status = req.body.status;
    await opportunity.save();
    await opportunity.populate('volunteers.user', 'username profilePicture');
    res.json(opportunity);
  } catch (err) {
    res.status(500).json({ message: 'Error updating application status', error: err.message });
  }
});

// Update opportunity status
router.put('/:id/status', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const opportunity = await VolunteerOpportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    if (!opportunity.organizer.equals(req.user.id)) {
      return res.status(403).json({ message: 'Only organizer can update opportunity status' });
    }

    opportunity.status = req.body.status;
    await opportunity.save();
    res.json(opportunity);
  } catch (err) {
    res.status(500).json({ message: 'Error updating opportunity status', error: err.message });
  }
});

module.exports = router;
