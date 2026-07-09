const Tenant = require('../models/Tenant');
const Room   = require('../models/Room');

/**
 * @desc    Get Owner Dashboard summary statistics
 * @route   GET /api/dashboard/stats
 * @access  Private – Admin only
 */
const getDashboardStats = async (req, res) => {
  try {
    // ── Tenants ───────────────────────────────────────────────
    const totalTenants = await Tenant.countDocuments({ status: 'Active' });

    // ── Rooms ─────────────────────────────────────────────────
    const [totalRooms, occupiedRooms, vacantRooms] = await Promise.all([
      Room.countDocuments(),
      Room.countDocuments({ status: 'Full' }),
      Room.countDocuments({ status: 'Available' }),
    ]);

    // ── Rent ──────────────────────────────────────────────────
    // TODO: replace with RentPayment.countDocuments({ status: 'Pending' })
    const pendingRentPayments = 0;

    // ── Maintenance ───────────────────────────────────────────
    // TODO: replace with MaintenanceRequest.countDocuments({ status: 'Open' })
    const openMaintenanceRequests = 0;

    // ── Visitors ──────────────────────────────────────────────
    // TODO: replace with Visitor.countDocuments({ checkInDate: today })
    const todaysVisitorCheckIns = 0;

    // ── Expenses ──────────────────────────────────────────────
    // TODO: replace with Expense aggregate sum for current month
    const monthlyExpenses = 0;

    res.status(200).json({
      success: true,
      data: {
        totalTenants,
        totalRooms,
        occupiedRooms,
        vacantRooms,
        pendingRentPayments,
        openMaintenanceRequests,
        todaysVisitorCheckIns,
        monthlyExpenses,
        admin: {
          name:  req.user.fullName,
          email: req.user.email,
          role:  req.user.role,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error. Could not fetch dashboard stats.',
    });
  }
};

module.exports = { getDashboardStats };
