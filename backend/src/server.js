const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend and admin
app.use(cors());

// Parse JSON and urlencoded data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve frontend static assets if accessed via backend
app.use(express.static(path.resolve(__dirname, '../../frontend')));

// Mount API routes
app.use('/api', apiRoutes);

// Root fallback
app.get('/', (req, res) => {
  res.redirect('/admin/');
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 CloudSms Backend Server running on http://localhost:${PORT}`);
  console.log(`📋 Admin Dashboard: http://localhost:${PORT}/admin/`);
  console.log(`🔌 API Base Endpoint: http://localhost:${PORT}/api`);
  console.log(`====================================================`);
});
