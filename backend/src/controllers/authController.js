const { readDb, writeDb } = require('../db/database');

exports.login = (req, res) => {
  const { username, password } = req.body;
  const db = readDb();

  if (username === db.admin.username && password === db.admin.passwordHash) {
    // Generate a simple token session
    const token = 'token_' + Buffer.from(`${username}_${Date.now()}`).toString('base64');
    return res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      admin: {
        username: db.admin.username,
        name: db.admin.name,
        email: db.admin.email
      }
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Tên đăng nhập hoặc mật khẩu không chính xác!'
  });
};

exports.getProfile = (req, res) => {
  const db = readDb();
  res.json({
    success: true,
    admin: {
      username: db.admin.username,
      name: db.admin.name,
      email: db.admin.email
    }
  });
};

exports.updateProfile = (req, res) => {
  const { name, email, currentPassword, newPassword } = req.body;
  const db = readDb();

  if (currentPassword && newPassword) {
    if (currentPassword !== db.admin.passwordHash) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng!' });
    }
    db.admin.passwordHash = newPassword;
  }

  if (name) db.admin.name = name;
  if (email) db.admin.email = email;

  writeDb(db);
  res.json({
    success: true,
    message: 'Cập nhật thông tin quản trị viên thành công!',
    admin: {
      username: db.admin.username,
      name: db.admin.name,
      email: db.admin.email
    }
  });
};
