const express = require('express');
const router = express.Router();
const {
  createNotice,
  getAllNotices,
  getActiveNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
} = require('../controllers/noticeController');
const { protect, authorise } = require('../middleware/authMiddleware');

// Get active notices (Admin & Tenant)
router.get('/active', protect, getActiveNotices);

// Get specific notice by ID (Admin & Tenant)
router.get('/:id', protect, getNoticeById);

// Admin notices CRUD
router.post('/', protect, authorise('Admin'), createNotice);
router.get('/', protect, authorise('Admin'), getAllNotices);
router.put('/:id', protect, authorise('Admin'), updateNotice);
router.delete('/:id', protect, authorise('Admin'), deleteNotice);

module.exports = router;
