const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Direct Live HTML Page Editor Routes (Protected)
router.get('/html-pages', verifyToken, pageController.getPagesList);
router.get('/html-pages/:filename', verifyToken, pageController.getPageHtml);
router.put('/html-pages/:filename', verifyToken, pageController.savePageHtml);

module.exports = router;
