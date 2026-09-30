const express = require('express');
const router = express.Router();
const { 
  getAllInspections, 
  clearAllInspections,
  loginAdmin,
  checkAuth,
  requireAdminAuth
} = require('../controllers/adminController');

// ── ADMIN AUTHENTICATION ENDPOINTS ──
router.post('/admin/login', loginAdmin);
router.get('/admin/check-auth', requireAdminAuth, checkAuth);

// ── PROTECTED ADMIN DATA & ACTIONS ──
router.get('/admin/inspections', requireAdminAuth, getAllInspections);
router.post('/admin/clear-all', requireAdminAuth, clearAllInspections);

/* LEGACY / UNPROTECTED ROUTES - PRESERVED AS COMMENT FOR REFERENCE
router.get('/admin/inspections', getAllInspections);
router.post('/admin/clear-all', clearAllInspections);
*/

module.exports = router;

