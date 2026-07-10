const Tenant = require('../models/Tenant');
const Room   = require('../models/Room');
const Rent   = require('../models/Rent');
const Agreement = require('../models/Agreement');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const Visitor = require('../models/Visitor');
const Expense = require('../models/Expense');
const Attendance = require('../models/Attendance');

/**
 * @desc    Get Owner Dashboard summary statistics
 * @route   GET /api/dashboard/stats
 * @access  Private – Admin only
 */
const getDashboardStats = async (req, res) => {
  try {
    // Refresh overdue rent and expired agreements statuses first
    await Promise.all([
      Rent.refreshOverdue(),
      Agreement.refreshExpiredStatus()
    ]);

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

    // ── Agreements ────────────────────────────────────────────
    const activeAgreements = await Agreement.countDocuments({ agreementStatus: 'Active' });

    // ── Maintenance ───────────────────────────────────────────
    const [openMaintenanceRequests, resolvedMaintenanceRequests] = await Promise.all([
      MaintenanceRequest.countDocuments({ status: { $in: ['Pending', 'In Progress'] } }),
      MaintenanceRequest.countDocuments({ status: 'Resolved' })
    ]);

    // ── Visitors ───────────────────────────────────────────────
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const [todaysVisitorCheckIns, currentlyCheckedIn, checkedOutToday] = await Promise.all([
      Visitor.countDocuments({ createdAt:    { $gte: todayStart, $lte: todayEnd } }),
      Visitor.countDocuments({ status: 'Checked In' }),
      Visitor.countDocuments({ status: 'Checked Out', checkOutTime: { $gte: todayStart, $lte: todayEnd } }),
    ]);

    // ── Expenses ──────────────────────────────────────────────
    const [totalExpensesAgg, monthlyExpensesAgg] = await Promise.all([
      Expense.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: { expenseDate: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const totalExpenses = totalExpensesAgg[0]?.total || 0;
    const monthlyExpenses = monthlyExpensesAgg[0]?.total || 0;

    // ── Attendance ─────────────────────────────────────────────
    const [todaysCheckIns, todaysCheckOuts, currentlyPresent] = await Promise.all([
      Attendance.countDocuments({ checkInTime: { $gte: todayStart, $lte: todayEnd } }),
      Attendance.countDocuments({ checkOutTime: { $gte: todayStart, $lte: todayEnd } }),
      Attendance.countDocuments({ status: { $in: ['Present', 'Checked In'] }, date: { $gte: todayStart, $lte: todayEnd } }),
    ]);

    const recentAttendance = await Attendance.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('tenantName roomNumber status checkInTime checkOutTime updatedAt date');

    res.status(200).json({
      success: true,
      data: {
        totalTenants,
        totalRooms,
        occupiedRooms,
        vacantRooms,
        pendingRentPayments,
        monthlyRentCollected,
        activeAgreements,
        openMaintenanceRequests,
        resolvedMaintenanceRequests,
        todaysVisitorCheckIns,
        currentlyCheckedIn,
        checkedOutToday,
        monthlyExpenses,
        totalExpenses,
        todaysCheckIns,
        todaysCheckOuts,
        currentlyPresent,
        recentAttendance,
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
