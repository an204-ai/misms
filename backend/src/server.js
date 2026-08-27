const path = require('path');
const dotenv = require('dotenv');

// Load environment variables (supports backend/.env and root .env)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting setup
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều yêu cầu từ IP của bạn! Vui lòng thử lại sau.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 login attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Bạn đã thử đăng nhập quá nhiều lần! Vui lòng đợi 15 phút trước khi thử lại.' }
});

const contactSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Bạn gửi yêu cầu quá thường xuyên. Vui lòng thử lại sau ít phút!' }
});

// Configure CORS for local development, VPS IP, and custom domains
app.use(cors({
  origin: true, // Cho phép tự động nhận diện Domain/IP của máy chủ VPS
  credentials: true
}));

// Apply global rate limiting
app.use('/api', globalLimiter);

// Apply specific rate limits
app.use('/api/auth/login', authLimiter);
app.post('/api/contacts', contactSubmitLimiter);

// Parse JSON and urlencoded data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve frontend static assets
const FRONTEND_DIR = path.resolve(__dirname, '../../frontend');
app.use(express.static(FRONTEND_DIR));

// Mount API routes
app.use('/api', apiRoutes);

// Root homepage fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 CloudSms Backend Server running on http://localhost:${PORT}`);
  console.log(`📋 Admin Dashboard: http://localhost:${PORT}/admin/`);
  console.log(`🔌 API Base Endpoint: http://localhost:${PORT}/api`);
  console.log(`🔒 Security: JWT Protected Routes & Rate Limiting Active`);
  console.log(`====================================================`);
});
