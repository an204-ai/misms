const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Public route for landing page visitors to send inquiries
router.post('/', contactController.createContact);

// Protected routes for admin management
router.get('/', verifyToken, contactController.getAllContacts);
router.put('/:id', verifyToken, contactController.updateContactStatus);
router.delete('/:id', verifyToken, contactController.deleteContact);

module.exports = router;
