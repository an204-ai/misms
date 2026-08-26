const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { verifyToken } = require('../middlewares/authMiddleware');

const ALLOWED_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico'];
const ALLOWED_MIMES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'image/x-icon',
  'image/vnd.microsoft.icon'
];

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.resolve(__dirname, '../../../frontend/images/upload');
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E4);
    // Sanitize extension
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  }
});

// File filter for security
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTS.includes(ext) && (ALLOWED_MIMES.includes(file.mimetype) || file.mimetype.startsWith('image/'))) {
    cb(null, true);
  } else {
    cb(new Error('Định dạng tệp không hợp lệ! Chỉ cho phép tải lên file hình ảnh (PNG, JPG, WEBP, SVG, GIF, ICO).'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Max 10MB
  }
});

// Protected upload endpoint with error handling wrapper
router.post('/', verifyToken, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Dung lượng tệp quá lớn! Tối đa 10MB cho mỗi hình ảnh.' });
      }
      return res.status(400).json({ success: false, message: 'Lỗi tải lên: ' + err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

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
});

module.exports = router;
