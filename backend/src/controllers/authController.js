const jwt = require('jsonwebtoken');
const { readDb, writeDb, hashPassword, comparePassword } = require('../db/database');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../middlewares/authMiddleware');

exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập tên đăng nhập và mật khẩu!'
    });
  }

  const db = readDb();

  if (username !== db.admin.username) {
    return res.status(401).json({
      success: false,
      message: 'Tên đăng nhập hoặc mật khẩu không chính xác!'
    });
  }

  const isMatch = await comparePassword(password, db.admin.passwordHash);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Tên đăng nhập hoặc mật khẩu không chính xác!'
    });
  }

  const token = jwt.sign(
    { username: db.admin.username, role: 'admin' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return res.json({
    success: true,
    message: 'Đăng nhập thành công!',
    token,
    admin: {
      username: db.admin.username
    }
  });
};

exports.getProfile = (req, res) => {
  const db = readDb();
  res.json({
    success: true,
    admin: {
      username: db.admin.username
    }
  });
};

exports.updateProfile = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const db = readDb();

  if (!currentPassword) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu hiện tại!' });
  }

  const isMatch = await comparePassword(currentPassword, db.admin.passwordHash);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không chính xác!' });
  }

  if (!newPassword || newPassword.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu mới!' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự!' });
  }

  if (confirmPassword && newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Xác nhận mật khẩu mới không trùng khớp!' });
  }

  if (newPassword === currentPassword) {
    return res.status(400).json({ success: false, message: 'Mật khẩu mới không được trùng với mật khẩu cũ!' });
  }

  db.admin.passwordHash = await hashPassword(newPassword);
  const saved = writeDb(db);

  if (!saved) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lưu mật khẩu mới!' });
  }

  res.json({
    success: true,
    message: 'Đổi mật khẩu đăng nhập thành công! Vui lòng ghi nhớ mật khẩu mới.',
    admin: {
      username: db.admin.username
    }
  });
};
