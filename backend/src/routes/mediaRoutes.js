const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Media management routes protected by admin authentication
router.get('/', verifyToken, mediaController.getAllMedia);
router.delete('/', verifyToken, mediaController.deleteMedia);

module.exports = router;
