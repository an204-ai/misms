const fs = require('fs');
const path = require('path');
const { ensureEidAssigned } = require('../utils/ensureEid');

const FRONTEND_DIR = path.resolve(__dirname, '../../../frontend');

// Tên hiển thị tuỳ chỉnh cho các trang đã biết (ưu tiên thứ tự và tên tiếng Việt chuẩn)
const KNOWN_PAGE_LABELS = {
  'index.html': '1. Trang Chủ',
  'gioi-thieu.html': '2. Giới Thiệu',
  'sms-brandname.html': '3. Dịch Vụ SMS Brandname',
  'zalo-zns.html': '4. Zalo ZNS',
  'bao-gia.html': '5. Báo Giá SMS & ZNS',
  'huong-dan-dang-ky.html': '6. Hướng Dẫn Đăng Ký',
  'lien-he.html': '7. Trang Liên Hệ'
};

function humanizeFilename(filename) {
  const base = filename.replace(/\.html$/i, '');
  return base
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Trả về danh sách file .html hợp lệ, nằm TRỰC TIẾP trong FRONTEND_DIR (không đệ quy vào subfolder như admin)
function listEditablePages() {
  if (!fs.existsSync(FRONTEND_DIR)) return [];
  const entries = fs.readdirSync(FRONTEND_DIR, { withFileTypes: true });
  return entries
    .filter(e => e.isFile() && /\.html$/i.test(e.name))
    .map(e => e.name)
    .sort((a, b) => {
      const aKnown = KNOWN_PAGE_LABELS[a] ? 0 : 1;
      const bKnown = KNOWN_PAGE_LABELS[b] ? 0 : 1;
      if (aKnown !== bKnown) return aKnown - bKnown; // file đã biết lên trước
      return (KNOWN_PAGE_LABELS[a] || a).localeCompare(KNOWN_PAGE_LABELS[b] || b, 'vi');
    });
}

function isEditableFilename(filename) {
  // Chặn path traversal: filename gửi lên phải khớp y hệt basename, không chứa dấu / hay ..
  if (!filename || filename !== path.basename(filename) || !/\.html$/i.test(filename)) return false;
  return listEditablePages().includes(filename);
}

// GET List of all editable pages
exports.getPagesList = (req, res) => {
  const list = listEditablePages().map(fn => ({
    filename: fn,
    name: KNOWN_PAGE_LABELS[fn] || humanizeFilename(fn)
  }));
  res.json({
    success: true,
    data: list
  });
};

// GET HTML of a specific file
exports.getPageHtml = (req, res) => {
  const { filename } = req.params;

  if (!isEditableFilename(filename)) {
    return res.status(400).json({ success: false, message: 'Tệp trang không hợp lệ hoặc không được phép chỉnh sửa!' });
  }

  const filePath = path.join(FRONTEND_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy file trang!' });
  }

  try {
    const rawHtml = fs.readFileSync(filePath, 'utf-8');
    const { html: taggedHtml, changed } = ensureEidAssigned(rawHtml);

    // Nếu có eid mới được gắn (file mới hoặc phần tử mới thêm tay chưa có eid)
    // -> Ghi lại ngay để lần sau không phải tính lại và giữ eid ổn định vĩnh viễn.
    if (changed) {
      fs.writeFileSync(filePath, taggedHtml, 'utf-8');
    }

    res.json({
      success: true,
      filename,
      name: KNOWN_PAGE_LABELS[filename] || humanizeFilename(filename),
      content: taggedHtml
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi đọc file: ' + err.message });
  }
};

// SAVE HTML directly to file
exports.savePageHtml = (req, res) => {
  const { filename } = req.params;
  const { content } = req.body;

  if (!isEditableFilename(filename)) {
    return res.status(400).json({ success: false, message: 'Tệp trang không hợp lệ hoặc không được phép chỉnh sửa!' });
  }

  if (typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Nội dung HTML không hợp lệ!' });
  }

  const filePath = path.join(FRONTEND_DIR, filename);

  try {
    const { html: safeContent } = ensureEidAssigned(content);
    fs.writeFileSync(filePath, safeContent, 'utf-8');
    const displayName = KNOWN_PAGE_LABELS[filename] || humanizeFilename(filename);
    res.json({
      success: true,
      message: `Đã lưu và cập nhật trực tiếp trang ${displayName} thành công!`,
      filename,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi ghi file: ' + err.message });
  }
};
