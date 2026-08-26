const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cLouDsMs_s3cur3_k3y_2026!@#$%^&*';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại!'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.adminUser = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ. Vui lòng đăng nhập lại!'
    });
  }
}

module.exports = {
  verifyToken,
  JWT_SECRET,
  JWT_EXPIRES_IN
};
