const express = require('express');
const router = express.Router();
const { protect, authorise } = require('../middleware/authMiddleware');
const {
  checkIn,
  checkOut,
  getAllAttendance,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
  getAttendanceSummary,
} = require('../controllers/attendanceController');

const guard = [protect, authorise('Admin')];

// Summary route must be defined BEFORE `/:id` to avoid collision
router.get('/summary', ...guard, getAttendanceSummary);

router.post('/checkin', ...guard, checkIn);
router.post('/checkout', ...guard, checkOut);

router.route('/')
  .get(...guard, getAllAttendance);

router.route('/:id')
  .get(...guard, getAttendanceById)
  .put(...guard, updateAttendance)
  .delete(...guard, deleteAttendance);

module.exports = router;
