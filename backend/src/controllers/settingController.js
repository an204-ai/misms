const { readDb, writeDb } = require('../db/database');
const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.resolve(__dirname, '../../../frontend');

exports.getSettings = (req, res) => {
  const db = readDb();
  res.json({
    success: true,
    data: db.settings
  });
};

exports.updateSettings = (req, res) => {
  const db = readDb();
  const newSettings = { ...db.settings, ...req.body };
  db.settings = newSettings;
  writeDb(db);

  // Sync basic info across frontend HTML files if requested
  syncHtmlHeaderFooter(newSettings);

  res.json({
    success: true,
    message: 'Cập nhật cấu hình website thành công!',
    data: newSettings
  });
};

function syncHtmlHeaderFooter(settings) {
  try {
    const htmlFiles = fs.readdirSync(FRONTEND_DIR).filter(f => f.endsWith('.html'));
    for (const file of htmlFiles) {
      const filePath = path.join(FRONTEND_DIR, file);
      let content = fs.readFileSync(filePath, 'utf-8');

      // Update hotline
      if (settings.hotline) {
        content = content.replace(/(?:Tel|Hotline|Điện thoại):\s*[\+\d\s\.\-]+/gi, `Hotline: ${settings.hotline}`);
      }
      // Update email
      if (settings.email) {
        content = content.replace(/[a-zA-Z0-9._%+-]+@mediatoday\.com\.vn/g, settings.email);
      }
      // Update address
      if (settings.address) {
        content = content.replace(/285-287 Bach Dang Street[^<]*/g, settings.address);
      }

      fs.writeFileSync(filePath, content, 'utf-8');
    }
  } catch (err) {
    console.error('Error syncing HTML header/footer:', err);
  }
}
