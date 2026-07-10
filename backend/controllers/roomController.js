const Room   = require('../models/Room');
const Tenant = require('../models/Tenant');
const { syncTenantRoom, handleRoomNumberChange } = require('./syncHelper');

// ── Helper: auto-compute status ──────────────────────────────────────────────
const syncStatus = (room) => {
  if (room.status !== 'Maintenance') {
    room.status = room.availableBeds === 0 ? 'Full' : 'Available';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Create a new room
 * @route   POST /api/rooms
 * @access  Private – Admin
 */
const createRoom = async (req, res) => {
  const { roomNumber, roomType, floorNumber, totalBeds, monthlyRent, description, status } = req.body;

  if (!roomNumber || !roomType || !totalBeds) {
    return res.status(400).json({
      success: false,
      message: 'roomNumber, roomType, and totalBeds are required',
    });
  }

  try {
    const existing = await Room.findOne({ roomNumber: { $regex: new RegExp(`^${roomNumber.trim()}$`, 'i') } });
    if (existing) {
      return res.status(409).json({ success: false, message: `Room ${roomNumber} already exists` });
    }

    // Generate labelled bed slots
    const beds = Room.buildBeds(Number(totalBeds));

    const room = await Room.create({
      roomNumber, roomType, floorNumber, totalBeds, monthlyRent, description,
      status: status || 'Available',
      occupiedBeds:  0,
      availableBeds: Number(totalBeds),
      beds,
    });

    res.status(201).json({ success: true, message: 'Room created successfully', data: room });
  } catch (error) {
    console.error('Error in createRoom:', error);
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: msgs.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message || 'Server error. Please try again later.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get all rooms with optional search / filter
 * @route   GET /api/rooms?search=&status=&roomType=
 * @access  Private – Admin
 */
const getAllRooms = async (req, res) => {
  try {
    const { search = '', status, roomType } = req.query;
    const query = {};

    if (search) {
      const re = new RegExp(search, 'i');
      query.$or = [{ roomNumber: re }, { floorNumber: re }, { roomType: re }];
    }
    if (status) {
      if (status === 'Vacant') {
        query.occupiedBeds = 0;
      } else if (status === 'Occupied') {
        query.occupiedBeds = { $gt: 0 };
      } else if (['Available', 'Full', 'Maintenance'].includes(status)) {
        query.status = status;
      }
    }
    if (roomType && ['Single', 'Double', 'Triple', 'Dormitory'].includes(roomType)) query.roomType = roomType;

    const rooms = await Room.find(query)
      .populate('beds.tenantId', 'fullName phoneNumber')
      .sort({ roomNumber: 1 });

    res.status(200).json({ success: true, count: rooms.length, data: rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get a single room by ID
 * @route   GET /api/rooms/:id
 * @access  Private – Admin
 */
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('beds.tenantId', 'fullName phoneNumber email');

    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    res.status(200).json({ success: true, data: room });
  } catch (error) {
    if (error.kind === 'ObjectId') return res.status(400).json({ success: false, message: 'Invalid room ID' });
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Update room details (does NOT directly change bed occupancy — use assign/unassign)
 * @route   PUT /api/rooms/:id
 * @access  Private – Admin
 */
const updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    const { roomNumber, roomType, floorNumber, monthlyRent, description, status, totalBeds } = req.body;

    const oldRoomNumber = room.roomNumber;
    let roomNumberChanged = false;

    if (roomNumber !== undefined && roomNumber.trim().toLowerCase() !== oldRoomNumber.trim().toLowerCase()) {
      const existing = await Room.findOne({ roomNumber: { $regex: new RegExp(`^${roomNumber.trim()}$`, 'i') } });
      if (existing && existing._id.toString() !== room._id.toString()) {
        return res.status(409).json({ success: false, message: `Room ${roomNumber} already exists` });
      }
      room.roomNumber = roomNumber.trim();
      roomNumberChanged = true;
    }
    if (roomType   !== undefined) room.roomType    = roomType;
    if (floorNumber!== undefined) room.floorNumber = floorNumber;
    if (monthlyRent!== undefined) room.monthlyRent = monthlyRent;
    if (description!== undefined) room.description = description;

    // If total beds changed, resize the beds array (only add/remove unoccupied slots)
    if (totalBeds !== undefined && Number(totalBeds) !== room.totalBeds) {
      const newTotal = Number(totalBeds);
      if (newTotal < room.occupiedBeds) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce totalBeds to ${newTotal} — ${room.occupiedBeds} bed(s) are currently occupied`,
        });
      }
      // Rebuild beds array preserving occupied entries
      const occupied = room.beds.filter((b) => b.isOccupied);
      const newBeds  = Room.buildBeds(newTotal);
      // Re-inject occupied beds into the new array (match by bedLabel or slot order)
      occupied.forEach((ob) => {
        const slot = newBeds.find((nb) => nb.bedLabel === ob.bedLabel);
        if (slot) {
          slot.tenantId   = ob.tenantId;
          slot.isOccupied = true;
        }
      });
      room.beds         = newBeds;
      room.totalBeds    = newTotal;
      room.occupiedBeds = occupied.length;
    }

    // Status can be manually set to Maintenance; Available/Full are auto-computed
    if (status !== undefined) room.status = status;

    await room.save(); // pre-save hook re-syncs availableBeds + status

    if (roomNumberChanged) {
      await handleRoomNumberChange(oldRoomNumber, room.roomNumber);
    }

    await room.populate('beds.tenantId', 'fullName phoneNumber');
    res.status(200).json({ success: true, message: 'Room updated successfully', data: room });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: msgs.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Delete a room (only if all beds are empty)
 * @route   DELETE /api/rooms/:id
 * @access  Private – Admin
 */
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    if (room.occupiedBeds > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete room ${room.roomNumber} — ${room.occupiedBeds} tenant(s) are still assigned`,
      });
    }

    await room.deleteOne();
    res.status(200).json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    if (error.kind === 'ObjectId') return res.status(400).json({ success: false, message: 'Invalid room ID' });
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Assign a tenant to a specific bed
 * @route   POST /api/rooms/:id/assign
 * @body    { tenantId, bedLabel }
 * @access  Private – Admin
 */
const assignTenant = async (req, res) => {
  const { tenantId, bedLabel } = req.body;

  if (!tenantId || !bedLabel) {
    return res.status(400).json({ success: false, message: 'tenantId and bedLabel are required' });
  }

  try {
    const [room, tenant] = await Promise.all([
      Room.findById(req.params.id),
      Tenant.findById(tenantId),
    ]);

    if (!room)   return res.status(404).json({ success: false, message: 'Room not found' });
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

    // Prevent over-allocation
    if (room.availableBeds <= 0 || room.status === 'Full') {
      return res.status(400).json({ success: false, message: `Room ${room.roomNumber} is fully occupied` });
    }

    if (room.status === 'Maintenance') {
      return res.status(400).json({ success: false, message: `Room ${room.roomNumber} is under maintenance` });
    }

    // Find the target bed slot
    const bed = room.beds.find((b) => b.bedLabel === bedLabel);
    if (!bed) {
      return res.status(404).json({ success: false, message: `Bed ${bedLabel} not found in room ${room.roomNumber}` });
    }
    if (bed.isOccupied) {
      return res.status(400).json({ success: false, message: `Bed ${bedLabel} is already occupied` });
    }

    // Check tenant isn't already in another room
    if (tenant.roomNumber && tenant.roomNumber !== room.roomNumber) {
      return res.status(400).json({
        success: false,
        message: `Tenant is already assigned to room ${tenant.roomNumber}. Unassign them first.`,
      });
    }

    // Assign
    bed.tenantId   = tenant._id;
    bed.isOccupied = true;
    room.occupiedBeds += 1;
    await room.save(); // triggers pre-save sync

    // Sync tenant record
    tenant.roomNumber = room.roomNumber;
    tenant.bedNumber  = bedLabel;
    tenant.rentAmount = room.monthlyRent || tenant.rentAmount;
    await tenant.save();

    // Sync across other modules
    await syncTenantRoom(tenant, undefined, undefined);

    await room.populate('beds.tenantId', 'fullName phoneNumber email');
    res.status(200).json({
      success: true,
      message: `Tenant ${tenant.fullName} assigned to Room ${room.roomNumber} – Bed ${bedLabel}`,
      data: room,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') return res.status(400).json({ success: false, message: 'Invalid ID provided' });
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Unassign a tenant from their bed
 * @route   POST /api/rooms/:id/unassign
 * @body    { tenantId }
 * @access  Private – Admin
 */
const unassignTenant = async (req, res) => {
  const { tenantId } = req.body;

  if (!tenantId) {
    return res.status(400).json({ success: false, message: 'tenantId is required' });
  }

  try {
    const [room, tenant] = await Promise.all([
      Room.findById(req.params.id),
      Tenant.findById(tenantId),
    ]);

    if (!room)   return res.status(404).json({ success: false, message: 'Room not found' });
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

    // Find the bed occupied by this tenant
    const bed = room.beds.find((b) => b.tenantId?.toString() === tenantId);
    if (!bed) {
      return res.status(400).json({
        success: false,
        message: `Tenant ${tenant.fullName} is not assigned to any bed in room ${room.roomNumber}`,
      });
    }

    const oldRoomNumber = room.roomNumber;
    const oldBedLabel = bed.bedLabel;

    // Unassign
    bed.tenantId   = null;
    bed.isOccupied = false;
    room.occupiedBeds = Math.max(0, room.occupiedBeds - 1);
    await room.save(); // triggers pre-save sync

    // Clear tenant's room assignment
    tenant.roomNumber = undefined;
    tenant.bedNumber  = undefined;
    await tenant.save();

    // Sync across other modules
    await syncTenantRoom(tenant, oldRoomNumber, oldBedLabel);

    await room.populate('beds.tenantId', 'fullName phoneNumber email');
    res.status(200).json({
      success: true,
      message: `Tenant ${tenant.fullName} unassigned from Room ${room.roomNumber}`,
      data: room,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') return res.status(400).json({ success: false, message: 'Invalid ID provided' });
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get all unassigned (active) tenants for the assign dropdown
 * @route   GET /api/rooms/unassigned-tenants
 * @access  Private – Admin
 */
const getUnassignedTenants = async (req, res) => {
  try {
    const tenants = await Tenant.find({
      status: 'Active',
      $or: [{ roomNumber: { $exists: false } }, { roomNumber: '' }, { roomNumber: null }],
    }).select('fullName email phoneNumber');

    res.status(200).json({ success: true, data: tenants });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

module.exports = {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  assignTenant,
  unassignTenant,
  getUnassignedTenants,
};
