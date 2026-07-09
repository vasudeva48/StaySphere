const express  = require('express');
const router   = express.Router();
const { protect, authorise } = require('../middleware/authMiddleware');
const {
  createVisitor,
  getAllVisitors,
  getVisitorById,
  updateVisitor,
  deleteVisitor,
  checkIn,
  checkOut,
  getVisitorStats,
} = require('../controllers/visitorController');

const guard = [protect, authorise('Admin')];

// Stats MUST be declared before /:id to avoid route collision
router.get('/stats', ...guard, getVisitorStats);

router.route('/')
  .get (...guard, getAllVisitors)
  .post(...guard, createVisitor);

router.route('/:id')
  .get   (...guard, getVisitorById)
  .put   (...guard, updateVisitor)
  .delete(...guard, deleteVisitor);

router.post('/:id/checkin',  ...guard, checkIn);
router.post('/:id/checkout', ...guard, checkOut);

module.exports = router;
