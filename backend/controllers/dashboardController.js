/**
 * @desc    Get Owner Dashboard summary statistics
 * @route   GET /api/dashboard/stats
 * @access  Private – Admin only
 *
 * Modules not yet implemented return 0.
 * Each section is clearly marked so values can be replaced
 * with real DB queries as features are built out.
 */
const getDashboardStats = async (req, res) => {
  try {
    // ── Tenants ───────────────────────────────────────────────
    // TODO: replace with Tenant.countDocuments() when Tenant module is ready
    const totalTenants = 0;

    // ── Rooms ─────────────────────────────────────────────────
    // TODO: replace with Room.countDocuments() queries when Room module is ready
    const totalRooms    = 0;
    const occupiedRooms = 0;
    const vacantRooms   = 0;

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
