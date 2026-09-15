const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const os = require('os');
const { connectToDatabase } = require('./config/db');
const apiRoutes = require('./routes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Global CORS Middleware (Vercel Serverless & Local Dev compatible)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// JSON Body Parser for base64 images
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Static uploads directory
const uploadsDir = process.env.VERCEL ? os.tmpdir() : path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// Root Health Check Endpoint
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    service: 'CarsInsure AI Vision Inspection API',
    status: 'online',
    version: '2.0.0'
  });
});

// Mount All Modular API Routes under /api
app.use('/api', apiRoutes);

// Initial database connection boot
connectToDatabase().catch(err => {
  console.warn('Initial MongoDB boot connection notice:', err.message);
});

// Local dev server listener
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 CarsInsure Modular Backend running on http://localhost:${PORT}`);
  });
  server.timeout = 180000;
  server.keepAliveTimeout = 180000;
  server.headersTimeout = 185000;
}

module.exports = app;
