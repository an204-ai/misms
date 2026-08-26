const { readDb, writeDb } = require('../db/database');
const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.resolve(__dirname, '../../../frontend');

// List of supported editable HTML pages
const PAGE_FILES = {
  'index.html': '1. Trang Chủ (index.html)',
  'gioi-thieu.html': '2. Giới Thiệu (gioi-thieu.html)',
  'dich-vu-sms-brandname.html': '3. Dịch Vụ SMS Brandname (dich-vu-sms-brandname.html)',
  'giai-phap-gui-tin-nhan-cham-soc-khach-hang-zns.html': '4. Zalo ZNS (giai-phap-gui-tin-nhan-cham-soc-khach-hang-zns.html)',
  'bao-gia-sms.html': '5. Báo Giá SMS & ZNS (bao-gia-sms.html)',
  'dang-ky-va-quy-dinh-su-dung-sms.html': '6. Hướng Dẫn Đăng Ký (dang-ky-va-quy-dinh-su-dung-sms.html)',
  'lien-he.html': '7. Trang Liên Hệ (lien-he.html)'
};

// GET HTML of a specific file
exports.getPageHtml = (req, res) => {
  const { filename } = req.params;

  if (!PAGE_FILES[filename]) {
    return res.status(400).json({ success: false, message: 'Tệp trang không hợp lệ!' });
  }

  const filePath = path.join(FRONTEND_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy file trang!' });
  }

  try {
    const htmlContent = fs.readFileSync(filePath, 'utf-8');
    res.json({
      success: true,
      filename,
      name: PAGE_FILES[filename],
      content: htmlContent
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi đọc file: ' + err.message });
  }
};

// SAVE HTML directly to file
exports.savePageHtml = (req, res) => {
  const { filename } = req.params;
  const { content } = req.body;

  if (!PAGE_FILES[filename]) {
    return res.status(400).json({ success: false, message: 'Tệp trang không hợp lệ!' });
  }

  if (typeof content !== 'string') {
    return res.status(400).json({ success: false, message: 'Nội dung HTML không hợp lệ!' });
  }

  const filePath = path.join(FRONTEND_DIR, filename);

  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    res.json({
      success: true,
      message: `Đã lưu và cập nhật trực tiếp trang ${PAGE_FILES[filename]} thành công!`,
      filename,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi ghi file: ' + err.message });
  }
};

// Get List of all editable pages
exports.getPagesList = (req, res) => {
  const list = Object.keys(PAGE_FILES).map(fn => ({
    filename: fn,
    name: PAGE_FILES[fn]
  }));
  res.json({
    success: true,
    data: list
  });
};

// Legacy DB metadata endpoints
exports.getAllPages = (req, res) => {
  const db = readDb();
  res.json({ success: true, data: Object.values(db.pages || {}) });
};

exports.getPageById = (req, res) => {
  const { id } = req.params;
  const db = readDb();
  if (!db.pages[id]) return res.status(404).json({ success: false, message: 'Trang không tồn tại!' });
  res.json({ success: true, data: db.pages[id] });
};

exports.updatePage = (req, res) => {
  const { id } = req.params;
  const db = readDb();
  if (!db.pages[id]) return res.status(404).json({ success: false, message: 'Trang không tồn tại!' });
  db.pages[id] = { ...db.pages[id], ...req.body, updatedAt: new Date().toISOString() };
  writeDb(db);
  res.json({ success: true, message: `Cập nhật dữ liệu "${db.pages[id].title}" thành công!`, data: db.pages[id] });
};
