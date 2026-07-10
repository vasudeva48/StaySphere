const Agreement = require('../models/Agreement');
const Tenant = require('../models/Tenant');
const Room = require('../models/Room');
const mongoose = require('mongoose');

/**
 * @desc    Create a new digital agreement
 * @route   POST /api/agreements
 * @access  Private – Admin
 */
const createAgreement = async (req, res) => {
  const {
    tenant,
    room,
    agreementNumber,
    startDate,
    endDate,
    monthlyRent,
    securityDeposit,
    agreementStatus,
    agreementFile,
    notes,
  } = req.body;

  if (!tenant || !room || !agreementNumber || !startDate || !endDate || monthlyRent === undefined || securityDeposit === undefined) {
    return res.status(400).json({
      success: false,
      message: 'tenant, room, agreementNumber, startDate, endDate, monthlyRent, and securityDeposit are required',
    });
  }

  try {
    // 1. Verify tenant exists
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

    // 2. Verify room exists
    let roomDoc;
    if (mongoose.Types.ObjectId.isValid(room)) {
      roomDoc = await Room.findById(room);
    }
    if (!roomDoc) {
      roomDoc = await Room.findOne({ roomNumber: { $regex: new RegExp(`^${room.toString().trim()}$`, 'i') } });
    }
    if (!roomDoc) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // 3. Verify unique agreement number
    const existing = await Agreement.findOne({ agreementNumber: agreementNumber.trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Agreement number ${agreementNumber} already exists`,
      });
    }

    const agreement = await Agreement.create({
      tenant: tenantDoc._id,
      room: roomDoc._id,
      agreementNumber: agreementNumber.trim(),
      startDate,
      endDate,
      monthlyRent,
      securityDeposit,
      agreementStatus: agreementStatus || 'Active',
      agreementFile,
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Agreement created successfully',
      data: agreement,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: msgs.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * @desc    Get all digital agreements with search / filter
 * @route   GET /api/agreements?search=&status=
 * @access  Private – Admin
 */
const getAllAgreements = async (req, res) => {
  // Sync expired statuses based on system clock
  await Agreement.refreshExpiredStatus();

  const { search, status } = req.query;

  const filter = {};
  if (status && status !== 'All') {
    filter.agreementStatus = status;
  }

  try {
    let populatedAgreements = [];
    
    // We can populate tenant and room and then filter if a search term is specified
    const agreementsQuery = Agreement.find(filter)
      .populate('tenant', 'fullName email phoneNumber')
      .populate('room', 'roomNumber roomType floorNumber')
      .sort({ createdAt: -1 });

    const agreements = await agreementsQuery;

    if (search) {
      const rx = new RegExp(search, 'i');
      populatedAgreements = agreements.filter((ag) => {
        const tenantMatch = ag.tenant && rx.test(ag.tenant.fullName);
        const numberMatch = rx.test(ag.agreementNumber);
        const roomMatch = ag.room && rx.test(ag.room.roomNumber);
        return tenantMatch || numberMatch || roomMatch;
      });
    } else {
      populatedAgreements = agreements;
    }

    res.status(200).json({
      success: true,
      count: populatedAgreements.length,
      data: populatedAgreements,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * @desc    Get a single agreement details
 * @route   GET /api/agreements/:id
 * @access  Private – Admin
 */
const getAgreementById = async (req, res) => {
  try {
    const agreement = await Agreement.findById(req.params.id)
      .populate('tenant', 'fullName email phoneNumber idProofType idProofNumber')
      .populate('room', 'roomNumber roomType floorNumber');

    if (!agreement) {
      return res.status(404).json({ success: false, message: 'Agreement not found' });
    }

    res.status(200).json({ success: true, data: agreement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * @desc    Update an agreement
 * @route   PUT /api/agreements/:id
 * @access  Private – Admin
 */
const updateAgreement = async (req, res) => {
  const {
    startDate,
    endDate,
    monthlyRent,
    securityDeposit,
    agreementStatus,
    agreementFile,
    notes,
  } = req.body;

  try {
    const agreement = await Agreement.findById(req.params.id);
    if (!agreement) {
      return res.status(404).json({ success: false, message: 'Agreement not found' });
    }

    // Assign properties (tenant, room, and agreementNumber cannot be changed post-creation for records integrity)
    if (startDate) agreement.startDate = startDate;
    if (endDate) agreement.endDate = endDate;
    if (monthlyRent !== undefined) agreement.monthlyRent = monthlyRent;
    if (securityDeposit !== undefined) agreement.securityDeposit = securityDeposit;
    if (agreementStatus) agreement.agreementStatus = agreementStatus;
    if (agreementFile !== undefined) agreement.agreementFile = agreementFile;
    if (notes !== undefined) agreement.notes = notes;

    await agreement.save(); // triggers pre-save hook for status expiration checks

    res.status(200).json({
      success: true,
      message: 'Agreement updated successfully',
      data: agreement,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: msgs.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * @desc    Delete an agreement record
 * @route   DELETE /api/agreements/:id
 * @access  Private – Admin
 */
const deleteAgreement = async (req, res) => {
  try {
    const agreement = await Agreement.findByIdAndDelete(req.params.id);
    if (!agreement) {
      return res.status(404).json({ success: false, message: 'Agreement not found' });
    }
    res.status(200).json({ success: true, message: 'Agreement deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

module.exports = {
  createAgreement,
  getAllAgreements,
  getAgreementById,
  updateAgreement,
  deleteAgreement,
};
