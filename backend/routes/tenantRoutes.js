const express                 = require('express');
const router                  = express.Router();
const {
  createTenant,
  getAllTenants,
  getTenantById,
  updateTenant,
  deleteTenant,
}                             = require('../controllers/tenantController');
const { protect, authorise }  = require('../middleware/authMiddleware');

// All routes are Private – Admin only
router.use(protect, authorise('Admin'));

// @route   POST   /api/tenants
// @route   GET    /api/tenants?search=&status=
router.route('/')
  .post(createTenant)
  .get(getAllTenants);

// @route   GET    /api/tenants/:id
// @route   PUT    /api/tenants/:id
// @route   DELETE /api/tenants/:id
router.route('/:id')
  .get(getTenantById)
  .put(updateTenant)
  .delete(deleteTenant);

module.exports = router;
