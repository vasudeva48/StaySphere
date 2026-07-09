const Tenant = require('../models/Tenant');
const Room   = require('../models/Room');
const Rent   = require('../models/Rent');

/**
 * @desc    Get Owner Dashboard summary statistics
 * @route   GET /api/dashboard/stats
 * @access  Private – Admin only
 */
const getDashboardStats = async (req, res) => {
  try {
    // Refresh overdue rent statuses first
    await Rent.refreshOverdue();

    // ── Tenants ───────────────────────────────────────────────
    const totalTenants = await Tenant.countDocuments({ status: 'Active' });

    // ── Rooms ─────────────────────────────────────────────────
    const [totalRooms, occupiedRooms, vacantRooms] = await Promise.all([
      Room.countDocuments(),
      Room.countDocuments({ status: 'Full' }),
      Room.countDocuments({ status: 'Available' }),
    ]);

    // ── Rent ──────────────────────────────────────────────────
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [pendingRentPayments, paidThisMonthAgg] = await Promise.all([
      Rent.countDocuments({ status: { $in: ['Pending', 'Overdue'] } }),
      Rent.aggregate([
        { $match: { status: 'Paid', paymentDate: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const monthlyRentCollected = paidThisMonthAgg[0]?.total || 0;

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
        monthlyRentCollected,
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
