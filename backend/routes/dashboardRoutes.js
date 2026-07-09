const express                 = require('express');
const router                  = express.Router();
const { getDashboardStats }   = require('../controllers/dashboardController');
const { protect, authorise }  = require('../middleware/authMiddleware');

// @route   GET /api/dashboard/stats
// @desc    Owner Dashboard summary statistics
// @access  Private – Admin only
router.get('/stats', protect, authorise('Admin'), getDashboardStats);

module.exports = router;
