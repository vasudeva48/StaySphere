const express = require('express');
const router = express.Router();
const { protect, authorise } = require('../middleware/authMiddleware');
const Agreement = require('../models/Agreement');
const Tenant    = require('../models/Tenant');
const {
  createAgreement,
  getAllAgreements,
  getAgreementById,
  updateAgreement,
  deleteAgreement,
} = require('../controllers/agreementController');

const guard = [protect, authorise('Admin')];

// ── Tenant-accessible: GET /api/agreements/my ──────────────────────────────
// Returns the agreement(s) linked to the logged-in tenant (read-only).
router.get('/my', protect, async (req, res) => {
  try {
    const tenantDoc = await Tenant.findOne({ email: req.user.email.toLowerCase() });
    if (!tenantDoc) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }
    const agreements = await Agreement.find({ tenant: tenantDoc._id })
      .populate('tenant', 'fullName email phoneNumber roomNumber')
      .populate('room',   'roomNumber roomType floorNumber')
      .sort({ startDate: -1 });
    res.status(200).json({ success: true, count: agreements.length, data: agreements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

router.route('/')
  .get(...guard, getAllAgreements)
  .post(...guard, createAgreement);

router.route('/:id')
  .get(...guard, getAgreementById)
  .put(...guard, updateAgreement)
  .delete(...guard, deleteAgreement);

module.exports = router;
