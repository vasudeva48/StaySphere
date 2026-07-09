const express    = require('express');
const router     = express.Router();
const { protect, authorise } = require('../middleware/authMiddleware');
const Rent   = require('../models/Rent');
const Tenant = require('../models/Tenant');
const {
  createRent,
  getAllRent,
  getRentById,
  updateRent,
  deleteRent,
  markAsPaid,
  getRentMonths,
  getRentSummary,
} = require('../controllers/rentController');

const guard = [protect, authorise('Admin')];

// ── Tenant-accessible: GET /api/rent/my ──────────────────────────────────────
// Returns rent records belonging to the logged-in tenant (read-only).
router.get('/my', protect, async (req, res) => {
  try {
    const tenantDoc = await Tenant.findOne({ email: req.user.email.toLowerCase() });
    if (!tenantDoc) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }
    const records = await Rent.find({ tenant: tenantDoc._id }).sort({ dueDate: -1 });
    res.status(200).json({ success: true, count: records.length, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// Static sub-routes MUST come before /:id to avoid collision
router.get ('/months',     ...guard, getRentMonths);
router.get ('/summary',    ...guard, getRentSummary);

router.route('/')
  .get  (...guard, getAllRent)
  .post (...guard, createRent);

router.route('/:id')
  .get   (...guard, getRentById)
  .put   (...guard, updateRent)
  .delete(...guard, deleteRent);

router.post('/:id/pay', ...guard, markAsPaid);

module.exports = router;
