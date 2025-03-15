const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const MarketplaceItem = require('../models/MarketplaceItem');

// Get all marketplace items
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const { category, condition, minPrice, maxPrice } = req.query;
    let query = { status: 'available' };

    if (category) query.category = category;
    if (condition) query.condition = condition;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const items = await MarketplaceItem.find(query)
      .populate('seller', 'username profilePicture')
      .sort('-createdAt');

    res.render('marketplace', {
      title: 'Eco-Friendly Marketplace',
      user: req.user,
      items: items,
      filters: { category, condition, minPrice, maxPrice }
    });
  } catch (err) {
    console.error('Error fetching marketplace items:', err);
    req.flash('error_msg', 'Error loading marketplace items');
    res.redirect('/');
  }
});

// Create marketplace item
router.post('/create', ensureAuthenticated, async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      category,
      sustainabilityFeatures,
      condition,
      stock
    } = req.body;

    // Handle image uploads here when implementing multer
    const images = [];

    const item = new MarketplaceItem({
      seller: req.user.id,
      title,
      description,
      price: Number(price),
      category,
      images,
      sustainabilityFeatures: sustainabilityFeatures.split(',').map(f => f.trim()),
      condition,
      stock: Number(stock)
    });

    await item.save();
    req.flash('success_msg', 'Item listed successfully');
    res.redirect('/marketplace');
  } catch (err) {
    console.error('Error creating marketplace item:', err);
    req.flash('error_msg', 'Error creating marketplace item');
    res.redirect('/marketplace');
  }
});

// Get marketplace item by id
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const item = await MarketplaceItem.findById(req.params.id)
      .populate('seller', 'username profilePicture')
      .populate('reviews.user', 'username profilePicture');
    
    if (!item) {
      req.flash('error_msg', 'Item not found');
      return res.redirect('/marketplace');
    }

    res.render('marketplace-item', {
      title: item.title,
      user: req.user,
      item: item
    });
  } catch (err) {
    console.error('Error fetching item:', err);
    req.flash('error_msg', 'Error loading item');
    res.redirect('/marketplace');
  }
});

// Update marketplace item
router.post('/:id/update', ensureAuthenticated, async (req, res) => {
  try {
    const item = await MarketplaceItem.findById(req.params.id);
    if (!item) {
      req.flash('error_msg', 'Item not found');
      return res.redirect('/marketplace');
    }

    if (!item.seller.equals(req.user.id)) {
      req.flash('error_msg', 'Only the seller can update this item');
      return res.redirect(`/marketplace/${item._id}`);
    }

    const updateFields = [
      'title', 'description', 'price', 'category',
      'sustainabilityFeatures', 'condition', 'stock', 'status'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'price' || field === 'stock') {
          item[field] = Number(req.body[field]);
        } else if (field === 'sustainabilityFeatures') {
          item[field] = req.body[field].split(',').map(f => f.trim());
        } else {
          item[field] = req.body[field];
        }
      }
    });

    await item.save();
    req.flash('success_msg', 'Item updated successfully');
    res.redirect(`/marketplace/${item._id}`);
  } catch (err) {
    console.error('Error updating item:', err);
    req.flash('error_msg', 'Error updating item');
    res.redirect('/marketplace');
  }
});

// Add review to marketplace item
router.post('/:id/reviews', ensureAuthenticated, async (req, res) => {
  try {
    const item = await MarketplaceItem.findById(req.params.id);
    if (!item) {
      req.flash('error_msg', 'Item not found');
      return res.redirect('/marketplace');
    }

    const existingReview = item.reviews.find(r => r.user.equals(req.user.id));
    if (existingReview) {
      req.flash('error_msg', 'You have already reviewed this item');
      return res.redirect(`/marketplace/${item._id}`);
    }

    const { rating, comment } = req.body;
    item.reviews.push({
      user: req.user.id,
      rating: Number(rating),
      comment
    });

    await item.save();
    req.flash('success_msg', 'Review added successfully');
    res.redirect(`/marketplace/${item._id}`);
  } catch (err) {
    console.error('Error adding review:', err);
    req.flash('error_msg', 'Error adding review');
    res.redirect('/marketplace');
  }
});

// Get seller's items
router.get('/seller/:userId', ensureAuthenticated, async (req, res) => {
  try {
    const items = await MarketplaceItem.find({ seller: req.params.userId })
      .populate('seller', 'username profilePicture')
      .sort('-createdAt');

    const seller = items[0]?.seller || null;
    
    res.render('seller-items', {
      title: seller ? `${seller.username}'s Items` : 'Seller Items',
      user: req.user,
      items: items,
      seller: seller
    });
  } catch (err) {
    console.error('Error fetching seller items:', err);
    req.flash('error_msg', 'Error loading seller items');
    res.redirect('/marketplace');
  }
});

module.exports = router;
