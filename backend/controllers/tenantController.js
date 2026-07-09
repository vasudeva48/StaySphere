const Tenant = require('../models/Tenant');

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Create a new tenant
 * @route   POST /api/tenants
 * @access  Private – Admin
 */
const createTenant = async (req, res) => {
  const {
    fullName, email, phoneNumber, gender, dateOfBirth, address,
    emergencyContact, idProofType, idProofNumber,
    roomNumber, bedNumber, joiningDate, rentAmount, depositAmount, status,
  } = req.body;

  if (!fullName || !email || !phoneNumber || !gender) {
    return res.status(400).json({
      success: false,
      message: 'fullName, email, phoneNumber, and gender are required',
    });
  }

  try {
    const existing = await Tenant.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A tenant with this email already exists',
      });
    }

    const tenant = await Tenant.create({
      fullName, email, phoneNumber, gender, dateOfBirth, address,
      emergencyContact, idProofType, idProofNumber,
      roomNumber, bedNumber, joiningDate, rentAmount, depositAmount, status,
    });

    res.status(201).json({ success: true, message: 'Tenant created successfully', data: tenant });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get all tenants with optional search & status filter
 * @route   GET /api/tenants?search=&status=
 * @access  Private – Admin
 */
const getAllTenants = async (req, res) => {
  try {
    const { search = '', status } = req.query;

    const query = {};

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { fullName:    regex },
        { email:       regex },
        { phoneNumber: regex },
        { roomNumber:  regex },
      ];
    }

    if (status && ['Active', 'Vacated'].includes(status)) {
      query.status = status;
    }

    const tenants = await Tenant.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tenants.length,
      data: tenants,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get a single tenant by ID
 * @route   GET /api/tenants/:id
 * @access  Private – Admin
 */
const getTenantById = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    res.status(200).json({ success: true, data: tenant });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: 'Invalid tenant ID' });
    }
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Update a tenant
 * @route   PUT /api/tenants/:id
 * @access  Private – Admin
 */
const updateTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    res.status(200).json({ success: true, message: 'Tenant updated successfully', data: tenant });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: 'Invalid tenant ID' });
    }
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Delete a tenant
 * @route   DELETE /api/tenants/:id
 * @access  Private – Admin
 */
const deleteTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findByIdAndDelete(req.params.id);

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    res.status(200).json({ success: true, message: 'Tenant deleted successfully' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: 'Invalid tenant ID' });
    }
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

module.exports = { createTenant, getAllTenants, getTenantById, updateTenant, deleteTenant };
