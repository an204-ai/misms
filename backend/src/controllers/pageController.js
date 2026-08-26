const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.resolve(__dirname, '../../../frontend');

// List of supported editable HTML pages
const PAGE_FILES = {
  'index.html': '1. Trang Chủ',
  'gioi-thieu.html': '2. Giới Thiệu',
  'sms-brandname.html': '3. Dịch Vụ SMS Brandname',
  'zalo-zns.html': '4. Zalo ZNS',
  'bao-gia.html': '5. Báo Giá SMS & ZNS',
  'huong-dan-dang-ky.html': '6. Hướng Dẫn Đăng Ký',
  'lien-he.html': '7. Trang Liên Hệ'
};

// GET List of all editable pages
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

// GET HTML of a specific file
exports.getPageHtml = (req, res) => {
  const { filename } = req.params;

  if (!PAGE_FILES[filename]) {
    return res.status(400).json({ success: false, message: 'Tệp trang không hợp lệ hoặc không được phép chỉnh sửa!' });
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
    return res.status(400).json({ success: false, message: 'Tệp trang không hợp lệ hoặc không được phép chỉnh sửa!' });
  }

  if (typeof content !== 'string' || content.trim().length === 0) {
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
