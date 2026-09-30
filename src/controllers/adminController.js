const crypto = require('crypto');
const { connectToDatabase } = require('../config/db');
const Inspection = require('../models/Inspection');

// Generate a secure HMAC session token
function generateAdminToken() {
  const secret = process.env.ADMIN_PASSWORD || 'CarInsuRent2026!';
  const timestamp = Date.now().toString();
  const signature = crypto.createHmac('sha256', secret).update(timestamp).digest('hex');
  return `${timestamp}.${signature}`;
}

// Verify HMAC session token
function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [timestampStr, signature] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  // 7-day session validity
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - timestamp > maxAge || timestamp > Date.now() + 60000) {
    return false;
  }

  const secret = process.env.ADMIN_PASSWORD || 'CarInsuRent2026!';
  const expectedSig = crypto.createHmac('sha256', secret).update(timestampStr).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'));
  } catch (e) {
    return false;
  }
}

// Authentication middleware
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  const token = bearerToken || req.headers['x-admin-token'] || req.query.token;

  if (verifyAdminToken(token)) {
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized: Valid admin session required. Please sign in.'
  });
}

// Admin login action
async function loginAdmin(req, res) {
  try {
    const { password } = req.body || {};
    const expectedPassword = process.env.ADMIN_PASSWORD || 'CarInsuRent2026!';

    if (!password || password.trim() !== expectedPassword.trim()) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password. Please check your credentials and try again.'
      });
    }

    const token = generateAdminToken();
    return res.json({
      success: true,
      token,
      message: 'Authenticated successfully'
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Auth status check
async function checkAuth(req, res) {
  return res.json({ success: true, authenticated: true });
}

async function getAllInspections(req, res) {
  try {
    await connectToDatabase();
    const list = await Inspection.find().sort({ created_at: -1 }).lean();
    res.json({ success: true, count: list.length, inspections: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function clearAllInspections(req, res) {
  try {
    await connectToDatabase();
    await Inspection.deleteMany({});
    res.json({ success: true, message: 'All inspections cleared from database.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getAllInspections,
  clearAllInspections,
  loginAdmin,
  checkAuth,
  requireAdminAuth,
};

