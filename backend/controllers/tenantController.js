const Tenant = require('../models/Tenant');
const Room = require('../models/Room');
const { syncTenantRoom, unassignTenantOnDelete } = require('./syncHelper');

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

    // Validate room and bed slots
    if (roomNumber) {
      if (!bedNumber) {
        return res.status(400).json({ success: false, message: 'bedNumber is required if roomNumber is specified' });
      }
      const room = await Room.findOne({ roomNumber: { $regex: new RegExp(`^${roomNumber.trim()}$`, 'i') } });
      if (!room) {
        return res.status(404).json({ success: false, message: `Room ${roomNumber} not found` });
      }
      const bed = room.beds.find(b => b.bedLabel === bedNumber.trim());
      if (!bed) {
        return res.status(404).json({ success: false, message: `Bed ${bedNumber} not found in Room ${roomNumber}` });
      }
      if (bed.isOccupied) {
        return res.status(400).json({ success: false, message: `Bed ${bedNumber} in Room ${roomNumber} is already occupied` });
      }
    }

    const tenant = await Tenant.create({
      fullName, email, phoneNumber, gender, dateOfBirth, address,
      emergencyContact, idProofType, idProofNumber,
      roomNumber: roomNumber ? roomNumber.trim() : undefined,
      bedNumber: bedNumber ? bedNumber.trim() : undefined,
      joiningDate, rentAmount, depositAmount, status,
    });

    if (tenant.roomNumber && tenant.bedNumber && tenant.status === 'Active') {
      await syncTenantRoom(tenant, undefined, undefined);
    }

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
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const oldRoomNumber = tenant.roomNumber;
    const oldBedNumber = tenant.bedNumber;

    // Handle Vacated status or clearing room
    const willBeVacated = req.body.status === 'Vacated';

    if (willBeVacated || req.body.roomNumber === '' || req.body.roomNumber === null) {
      req.body.roomNumber = undefined;
      req.body.bedNumber = undefined;
    }

    // Determine target room/bed
    const targetRoomNumber = req.body.roomNumber !== undefined ? req.body.roomNumber : tenant.roomNumber;
    const targetBedNumber = req.body.bedNumber !== undefined ? req.body.bedNumber : tenant.bedNumber;

    if (targetRoomNumber && !willBeVacated) {
      if (!targetBedNumber) {
        return res.status(400).json({ success: false, message: 'bedNumber is required if roomNumber is specified' });
      }
      const newRoom = await Room.findOne({ roomNumber: { $regex: new RegExp(`^${targetRoomNumber.trim()}$`, 'i') } });
      if (!newRoom) {
        return res.status(404).json({ success: false, message: `Room ${targetRoomNumber} not found` });
      }
      const newBed = newRoom.beds.find(b => b.bedLabel === targetBedNumber.trim());
      if (!newBed) {
        return res.status(404).json({ success: false, message: `Bed ${targetBedNumber} not found in Room ${targetRoomNumber}` });
      }
      if (newBed.isOccupied && newBed.tenantId?.toString() !== tenant._id.toString()) {
        return res.status(400).json({ success: false, message: `Bed ${targetBedNumber} in Room ${targetRoomNumber} is already occupied` });
      }

      // Auto-update rentAmount if room changed and rentAmount not explicitly provided
      if ((targetRoomNumber !== oldRoomNumber) && req.body.rentAmount === undefined) {
        req.body.rentAmount = newRoom.monthlyRent || tenant.rentAmount;
      }
    }

    // Apply the update
    Object.keys(req.body).forEach(key => {
      if (key === 'emergencyContact' && req.body.emergencyContact) {
        tenant.emergencyContact = {
          name: req.body.emergencyContact.name !== undefined ? req.body.emergencyContact.name : tenant.emergencyContact?.name,
          phone: req.body.emergencyContact.phone !== undefined ? req.body.emergencyContact.phone : tenant.emergencyContact?.phone
        };
      } else {
        tenant.set(key, req.body[key]);
      }
    });

    if (willBeVacated || req.body.roomNumber === undefined && (req.body.roomNumber === '' || req.body.roomNumber === null)) {
      tenant.roomNumber = undefined;
      tenant.bedNumber = undefined;
    }

    await tenant.save();

    // Call sync helper to free old bed slot and occupy new one
    await syncTenantRoom(tenant, oldRoomNumber, oldBedNumber);

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
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    // Free up the bed slot in Room document before deletion
    await unassignTenantOnDelete(tenant);

    await tenant.deleteOne();

    res.status(200).json({ success: true, message: 'Tenant deleted successfully' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: 'Invalid tenant ID' });
    }
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

module.exports = { createTenant, getAllTenants, getTenantById, updateTenant, deleteTenant };
