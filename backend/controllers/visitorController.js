const Visitor = require('../models/Visitor');
const Tenant  = require('../models/Tenant');

// ── Helper ────────────────────────────────────────────────────────────────────
const todayRange = () => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end   = new Date(); end.setHours(23, 59, 59, 999);
  return { start, end };
};

/**
 * @desc    Create a new visitor record
 * @route   POST /api/visitors
 * @access  Private – Admin
 */
const createVisitor = async (req, res) => {
  const {
    visitorName, phoneNumber, relationshipToTenant, tenant,
    purposeOfVisit, idProofType, idProofNumber, remarks,
  } = req.body;

  if (!visitorName || !phoneNumber || !relationshipToTenant || !tenant || !purposeOfVisit) {
    return res.status(400).json({
      success: false,
      message: 'visitorName, phoneNumber, relationshipToTenant, tenant, and purposeOfVisit are required',
    });
  }

  try {
    const tenantDoc = await Tenant.findById(tenant);
    if (!tenantDoc) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const visitor = await Visitor.create({
      visitorName, phoneNumber, relationshipToTenant,
      tenant: tenantDoc._id,
      tenantName:  tenantDoc.fullName,
      roomNumber:  tenantDoc.roomNumber || '',
      purposeOfVisit, idProofType, idProofNumber, remarks,
    });

    res.status(201).json({ success: true, message: 'Visitor registered successfully', data: visitor });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: msgs.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * @desc    Get all visitors with optional search / filter
 * @route   GET /api/visitors?search=&status=&date=
 * @access  Private – Admin
 */
const getAllVisitors = async (req, res) => {
  const { search, status, date } = req.query;

  const filter = {};
  if (status && status !== 'All') filter.status = status;

  if (date) {
    const d = new Date(date);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end   = new Date(d); end.setHours(23, 59, 59, 999);
    filter.createdAt = { $gte: start, $lte: end };
  }

  try {
    let visitors = await Visitor.find(filter)
      .populate('tenant', 'fullName email phoneNumber roomNumber')
      .sort({ createdAt: -1 });

    if (search) {
      const rx = new RegExp(search, 'i');
      visitors = visitors.filter(v =>
        rx.test(v.visitorName) ||
        rx.test(v.phoneNumber) ||
        rx.test(v.tenantName) ||
        rx.test(v.roomNumber)
      );
    }

    res.status(200).json({ success: true, count: visitors.length, data: visitors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * @desc    Get a single visitor by ID
 * @route   GET /api/visitors/:id
 * @access  Private – Admin
 */
const getVisitorById = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id)
      .populate('tenant', 'fullName email phoneNumber roomNumber');
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }
    res.status(200).json({ success: true, data: visitor });
  } catch (error) {
    if (error.kind === 'ObjectId') return res.status(400).json({ success: false, message: 'Invalid visitor ID' });
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * @desc    Update a visitor record
 * @route   PUT /api/visitors/:id
 * @access  Private – Admin
 */
const updateVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ success: false, message: 'Visitor not found' });

    const {
      visitorName, phoneNumber, relationshipToTenant, tenant,
      purposeOfVisit, idProofType, idProofNumber, remarks,
    } = req.body;

    if (visitorName)            visitor.visitorName            = visitorName;
    if (phoneNumber)            visitor.phoneNumber            = phoneNumber;
    if (relationshipToTenant)   visitor.relationshipToTenant   = relationshipToTenant;
    if (purposeOfVisit)         visitor.purposeOfVisit         = purposeOfVisit;
    if (idProofType !== undefined) visitor.idProofType         = idProofType;
    if (idProofNumber !== undefined) visitor.idProofNumber     = idProofNumber;
    if (remarks !== undefined)  visitor.remarks                = remarks;

    // Re-sync tenant info if tenant changed
    if (tenant && tenant !== String(visitor.tenant)) {
      const tenantDoc = await Tenant.findById(tenant);
      if (!tenantDoc) return res.status(404).json({ success: false, message: 'Tenant not found' });
      visitor.tenant     = tenantDoc._id;
      visitor.tenantName = tenantDoc.fullName;
      visitor.roomNumber = tenantDoc.roomNumber || '';
    }

    await visitor.save();
    res.status(200).json({ success: true, message: 'Visitor updated successfully', data: visitor });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: msgs.join(', ') });
    }
    if (error.kind === 'ObjectId') return res.status(400).json({ success: false, message: 'Invalid ID' });
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * @desc    Delete a visitor record
 * @route   DELETE /api/visitors/:id
 * @access  Private – Admin
 */
const deleteVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndDelete(req.params.id);
    if (!visitor) return res.status(404).json({ success: false, message: 'Visitor not found' });
    res.status(200).json({ success: true, message: 'Visitor record deleted successfully' });
  } catch (error) {
    if (error.kind === 'ObjectId') return res.status(400).json({ success: false, message: 'Invalid visitor ID' });
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * @desc    Check in a visitor
 * @route   POST /api/visitors/:id/checkin
 * @access  Private – Admin
 */
const checkIn = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ success: false, message: 'Visitor not found' });

    if (visitor.status === 'Checked In') {
      return res.status(400).json({ success: false, message: 'Visitor is already checked in' });
    }
    if (visitor.status === 'Checked Out') {
      return res.status(400).json({ success: false, message: 'Visitor has already checked out. Create a new visit record.' });
    }

    visitor.status      = 'Checked In';
    visitor.checkInTime = new Date();
    await visitor.save();

    res.status(200).json({ success: true, message: `${visitor.visitorName} checked in successfully`, data: visitor });
  } catch (error) {
    if (error.kind === 'ObjectId') return res.status(400).json({ success: false, message: 'Invalid visitor ID' });
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * @desc    Check out a visitor
 * @route   POST /api/visitors/:id/checkout
 * @access  Private – Admin
 */
const checkOut = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ success: false, message: 'Visitor not found' });

    if (visitor.status === 'Registered') {
      return res.status(400).json({ success: false, message: 'Cannot check out before checking in' });
    }
    if (visitor.status === 'Checked Out') {
      return res.status(400).json({ success: false, message: 'Visitor has already checked out' });
    }

    visitor.status       = 'Checked Out';
    visitor.checkOutTime = new Date();
    await visitor.save();

    res.status(200).json({ success: true, message: `${visitor.visitorName} checked out successfully`, data: visitor });
  } catch (error) {
    if (error.kind === 'ObjectId') return res.status(400).json({ success: false, message: 'Invalid visitor ID' });
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * @desc    Get visitor stats for dashboard
 * @route   GET /api/visitors/stats
 * @access  Private – Admin
 */
const getVisitorStats = async (req, res) => {
  try {
    const { start, end } = todayRange();
    const [todayTotal, checkedIn, checkedOutToday] = await Promise.all([
      Visitor.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Visitor.countDocuments({ status: 'Checked In' }),
      Visitor.countDocuments({ status: 'Checked Out', checkOutTime: { $gte: start, $lte: end } }),
    ]);
    const recent = await Visitor.find({ createdAt: { $gte: start, $lte: end } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('visitorName tenantName roomNumber status checkInTime checkOutTime createdAt');

    res.status(200).json({ success: true, data: { todayTotal, checkedIn, checkedOutToday, recent } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

module.exports = {
  createVisitor,
  getAllVisitors,
  getVisitorById,
  updateVisitor,
  deleteVisitor,
  checkIn,
  checkOut,
  getVisitorStats,
};
