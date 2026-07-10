const Rent   = require('../models/Rent');
const Tenant = require('../models/Tenant');
const Room   = require('../models/Room');
const mongoose = require('mongoose');

// ── Helper ────────────────────────────────────────────────────────────────────
const fmtMonth = (d) =>
  new Date(d).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Create a new rent record
 * @route   POST /api/rent
 * @access  Private – Admin
 */
const createRent = async (req, res) => {
  const { tenant, amount, dueDate, paymentMethod, transactionId, remarks, rentMonth } = req.body;

  if (!tenant || !amount || !dueDate) {
    return res.status(400).json({
      success: false,
      message: 'tenant, amount, and dueDate are required',
    });
  }

  try {
    // Verify tenant exists and pull denormalised fields
    let tenantDoc;
    if (mongoose.Types.ObjectId.isValid(tenant)) {
      tenantDoc = await Tenant.findById(tenant);
    }
    if (!tenantDoc) {
      tenantDoc = await Tenant.findOne({ email: tenant.toString().toLowerCase() });
    }
    if (!tenantDoc) {
      tenantDoc = await Tenant.findOne({ fullName: { $regex: new RegExp(`^${tenant.toString().trim()}$`, 'i') } });
    }
    if (!tenantDoc) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    let resolvedRoomNumber = tenantDoc.roomNumber || '';
    if (resolvedRoomNumber) {
      const roomDoc = await Room.findOne({ roomNumber: { $regex: new RegExp(`^${resolvedRoomNumber.trim()}$`, 'i') } });
      if (roomDoc) {
        resolvedRoomNumber = roomDoc.roomNumber;
      }
    }

    const rent = await Rent.create({
      tenant: tenantDoc._id,
      tenantName:    tenantDoc.fullName,
      roomNumber:    resolvedRoomNumber,
      amount,
      dueDate,
      paymentMethod: paymentMethod || 'Cash',
      transactionId,
      remarks,
      rentMonth:     rentMonth || fmtMonth(dueDate),
    });

    res.status(201).json({ success: true, message: 'Rent record created', data: rent });
  } catch (error) {
    console.error('Error in createRent:', error);
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: msgs.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get all rent records with optional filters
 * @route   GET /api/rent?status=&search=&month=&page=&limit=
 * @access  Private – Admin
 */
const getAllRent = async (req, res) => {
  // Refresh overdue status on every list fetch
  await Rent.refreshOverdue();

  const { status, search, month, page = 1, limit = 50 } = req.query;

  const filter = {};
  if (status && status !== 'All') filter.status = status;
  if (month)  filter.rentMonth = month;
  if (search) {
    const rx = new RegExp(search, 'i');
    filter.$or = [{ tenantName: rx }, { roomNumber: rx }];
  }

  try {
    const skip  = (Number(page) - 1) * Number(limit);
    const [records, total] = await Promise.all([
      Rent.find(filter)
        .populate('tenant', 'fullName email phoneNumber roomNumber bedNumber')
        .sort({ dueDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Rent.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, count: records.length, total, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get a single rent record
 * @route   GET /api/rent/:id
 * @access  Private – Admin
 */
const getRentById = async (req, res) => {
  try {
    const rent = await Rent.findById(req.params.id)
      .populate('tenant', 'fullName email phoneNumber roomNumber bedNumber');
    if (!rent) return res.status(404).json({ success: false, message: 'Rent record not found' });
    res.status(200).json({ success: true, data: rent });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Update a rent record
 * @route   PUT /api/rent/:id
 * @access  Private – Admin
 */
const updateRent = async (req, res) => {
  try {
    const rent = await Rent.findById(req.params.id);
    if (!rent) return res.status(404).json({ success: false, message: 'Rent record not found' });

    // Don't allow changing tenant on an existing record
    const { tenant: _t, ...rest } = req.body;

    Object.assign(rent, rest);
    await rent.save(); // triggers pre-save overdue check

    res.status(200).json({ success: true, message: 'Rent record updated', data: rent });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: msgs.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Delete a rent record
 * @route   DELETE /api/rent/:id
 * @access  Private – Admin
 */
const deleteRent = async (req, res) => {
  try {
    const rent = await Rent.findByIdAndDelete(req.params.id);
    if (!rent) return res.status(404).json({ success: false, message: 'Rent record not found' });
    res.status(200).json({ success: true, message: 'Rent record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Mark a rent record as Paid
 * @route   POST /api/rent/:id/pay
 * @access  Private – Admin
 */
const markAsPaid = async (req, res) => {
  const { paymentMethod, transactionId, paymentDate, remarks } = req.body;

  try {
    const rent = await Rent.findById(req.params.id);
    if (!rent) return res.status(404).json({ success: false, message: 'Rent record not found' });
    if (rent.status === 'Paid') {
      return res.status(400).json({ success: false, message: 'Rent is already marked as Paid' });
    }

    rent.status        = 'Paid';
    rent.paymentDate   = paymentDate ? new Date(paymentDate) : new Date();
    rent.paymentMethod = paymentMethod || rent.paymentMethod;
    if (transactionId) rent.transactionId = transactionId;
    if (remarks)       rent.remarks       = remarks;

    await rent.save();
    res.status(200).json({ success: true, message: 'Rent marked as Paid', data: rent });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get distinct rent months (for filter dropdown)
 * @route   GET /api/rent/months
 * @access  Private – Admin
 */
const getRentMonths = async (req, res) => {
  try {
    const months = await Rent.distinct('rentMonth');
    res.status(200).json({ success: true, data: months });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get rent summary stats (for dashboard)
 * @route   GET /api/rent/summary
 * @access  Private – Admin
 */
const getRentSummary = async (req, res) => {
  try {
    await Rent.refreshOverdue();

    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [pendingCount, overdueCount, paidThisMonth] = await Promise.all([
      Rent.countDocuments({ status: 'Pending' }),
      Rent.countDocuments({ status: 'Overdue' }),
      Rent.aggregate([
        { $match: { status: 'Paid', paymentDate: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        pendingCount,
        overdueCount,
        collectedThisMonth: paidThisMonth[0]?.total || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createRent,
  getAllRent,
  getRentById,
  updateRent,
  deleteRent,
  markAsPaid,
  getRentMonths,
  getRentSummary,
};
