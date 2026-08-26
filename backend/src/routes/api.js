const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');

const authController = require('../controllers/authController');
const settingController = require('../controllers/settingController');
const pageController = require('../controllers/pageController');
const contactController = require('../controllers/contactController');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.resolve(__dirname, '../../../frontend/images/upload');
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E4);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});
const upload = multer({ storage: storage });

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Auth Routes
router.post('/auth/login', authController.login);
router.get('/auth/profile', authController.getProfile);
router.put('/auth/profile', authController.updateProfile);

// Settings Routes
router.get('/settings', settingController.getSettings);
router.put('/settings', settingController.updateSettings);

// Direct Live HTML Page Editor Routes (43toWeb Standard)
router.get('/html-pages', pageController.getPagesList);
router.get('/html-pages/:filename', pageController.getPageHtml);
router.put('/html-pages/:filename', pageController.savePageHtml);

// Page Content Routes (Legacy DB Metadata)
router.get('/pages', pageController.getAllPages);
router.get('/pages/:id', pageController.getPageById);
router.put('/pages/:id', pageController.updatePage);

// Customer Contacts & Leads Routes
router.get('/contacts', contactController.getAllContacts);
router.post('/contacts', contactController.createContact);
router.put('/contacts/:id', contactController.updateContactStatus);
router.delete('/contacts/:id', contactController.deleteContact);

// File Upload Route
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Chưa có file nào được tải lên!' });
  }
  const relativePath = 'images/upload/' + req.file.filename;
  res.json({
    success: true,
    message: 'Tải ảnh lên thành công!',
    url: relativePath,
    filename: req.file.filename
  });
});

module.exports = router;
