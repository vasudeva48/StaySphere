const express                = require('express');
const router                 = express.Router();
const {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  assignTenant,
  unassignTenant,
  getUnassignedTenants,
}                            = require('../controllers/roomController');
const { protect, authorise } = require('../middleware/authMiddleware');

// All routes Private – Admin only
router.use(protect, authorise('Admin'));

// @route   GET  /api/rooms/unassigned-tenants
// Must be defined BEFORE /:id to avoid route collision
router.get('/unassigned-tenants', getUnassignedTenants);

// @route   POST /api/rooms
// @route   GET  /api/rooms?search=&status=&roomType=
router.route('/')
  .post(createRoom)
  .get(getAllRooms);

// @route   GET    /api/rooms/:id
// @route   PUT    /api/rooms/:id
// @route   DELETE /api/rooms/:id
router.route('/:id')
  .get(getRoomById)
  .put(updateRoom)
  .delete(deleteRoom);

// @route   POST /api/rooms/:id/assign
router.post('/:id/assign', assignTenant);

// @route   POST /api/rooms/:id/unassign
router.post('/:id/unassign', unassignTenant);

module.exports = router;
