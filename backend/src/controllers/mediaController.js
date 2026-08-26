const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.resolve(__dirname, '../../../frontend');
const IMAGES_DIR = path.join(FRONTEND_DIR, 'images');

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico']);

// Helper to format bytes to human readable string
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Recursively scan images directory
function scanImages(dir, baseDir = IMAGES_DIR) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      results = results.concat(scanImages(fullPath, baseDir));
    } else if (stat.isFile()) {
      const ext = path.extname(item).toLowerCase();
      if (ALLOWED_EXTENSIONS.has(ext)) {
        const relativeFromFrontend = path.relative(FRONTEND_DIR, fullPath).replace(/\\/g, '/');
        const relativeFromImages = path.relative(IMAGES_DIR, fullPath).replace(/\\/g, '/');
        const folderName = path.dirname(relativeFromImages);
        const category = folderName === '.' ? 'root' : folderName;

        results.push({
          id: Buffer.from(relativeFromFrontend).toString('base64'),
          filename: item,
          relativePath: relativeFromFrontend,
          url: '/' + relativeFromFrontend,
          category: category,
          size: stat.size,
          sizeFormatted: formatBytes(stat.size),
          modifiedAt: stat.mtime.toISOString()
        });
      }
    }
  }
  return results;
}

// GET /api/media
exports.getAllMedia = (req, res) => {
  try {
    const mediaList = scanImages(IMAGES_DIR);

    // Sort newest first
    mediaList.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

    let totalBytes = 0;
    const categoriesMap = { 'all': mediaList.length };

    mediaList.forEach(m => {
      totalBytes += m.size;
      categoriesMap[m.category] = (categoriesMap[m.category] || 0) + 1;
    });

    res.json({
      success: true,
      data: mediaList,
      meta: {
        totalFiles: mediaList.length,
        totalSizeBytes: totalBytes,
        totalSizeFormatted: formatBytes(totalBytes),
        categories: categoriesMap
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi nạp thư viện ảnh: ' + err.message });
  }
};

// DELETE /api/media
exports.deleteMedia = (req, res) => {
  try {
    const { relativePath } = req.body;
    if (!relativePath) {
      return res.status(400).json({ success: false, message: 'Thiếu đường dẫn file cần xóa!' });
    }

    const targetPath = path.resolve(FRONTEND_DIR, relativePath);

    // Security check: Target path MUST strictly stay inside IMAGES_DIR
    if (!targetPath.startsWith(IMAGES_DIR)) {
      return res.status(403).json({ success: false, message: 'Thao tác không hợp lệ: Không thể xóa ngoài thư mục images!' });
    }

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy file ảnh để xóa!' });
    }

    fs.unlinkSync(targetPath);
    res.json({
      success: true,
      message: 'Đã xóa file ảnh thành công!'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi khi xóa ảnh: ' + err.message });
  }
};
