const express    = require('express');
const router     = express.Router();
const { protect, authorise } = require('../middleware/authMiddleware');
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
