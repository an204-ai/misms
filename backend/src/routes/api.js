const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const pageRoutes = require('./pageRoutes');
const contactRoutes = require('./contactRoutes');
const mediaRoutes = require('./mediaRoutes');
const uploadRoutes = require('./uploadRoutes');

// Health Check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Mount modular sub-routes
router.use('/auth', authRoutes);
router.use('/', pageRoutes); // Handles /html-pages and /pages
router.use('/contacts', contactRoutes);
router.use('/media', mediaRoutes);
router.use('/upload', uploadRoutes);

module.exports = router;
