const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createRequest,
  getAllRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
} = require('../controllers/maintenanceController');

router.use(protect);

router.route('/')
  .get(getAllRequests)
  .post(createRequest);

router.route('/:id')
  .get(getRequestById)
  .put(updateRequest)
  .delete(deleteRequest);

module.exports = router;
