const MaintenanceRequest = require('../models/MaintenanceRequest');
const Tenant = require('../models/Tenant');
const Room = require('../models/Room');

// Helper to find tenant profile for authenticated user
const findTenantProfile = async (email) => {
  return await Tenant.findOne({ email: email.toLowerCase() });
};

// Helper to find room by roomNumber string
const findRoomByNumber = async (roomNumber) => {
  if (!roomNumber) return null;
  return await Room.findOne({ roomNumber: roomNumber.trim() });
};

/**
 * @desc    Create a new maintenance request
 * @route   POST /api/maintenance
 * @access  Private – Admin or Tenant
 */
const createRequest = async (req, res) => {
  const { requestTitle, category, priority, description, tenantId, roomId } = req.body;

  if (!requestTitle || !category || !priority || !description) {
    return res.status(400).json({
      success: false,
      message: 'requestTitle, category, priority, and description are required',
    });
  }

  try {
    let resolvedTenantId;
    let resolvedRoomId;

    if (req.user.role === 'Tenant') {
      // Find tenant associated with logged in user email
      const tenantDoc = await findTenantProfile(req.user.email);
      if (!tenantDoc) {
        return res.status(404).json({
          success: false,
          message: 'No tenant profile associated with your user account',
        });
      }

      if (!tenantDoc.roomNumber) {
        return res.status(400).json({
          success: false,
          message: 'You must be assigned to a room to submit maintenance requests',
        });
      }

      const roomDoc = await findRoomByNumber(tenantDoc.roomNumber);
      if (!roomDoc) {
        return res.status(404).json({
          success: false,
          message: `Your assigned Room ${tenantDoc.roomNumber} was not found in the database`,
        });
      }

      resolvedTenantId = tenantDoc._id;
      resolvedRoomId = roomDoc._id;
    } else {
      // Admin creating on behalf of a tenant
      if (!tenantId || !roomId) {
        return res.status(400).json({
          success: false,
          message: 'tenantId and roomId are required when creating as Admin',
        });
      }
      resolvedTenantId = tenantId;
      resolvedRoomId = roomId;
    }

    const request = await MaintenanceRequest.create({
      tenant: resolvedTenantId,
      room: resolvedRoomId,
      requestTitle,
      category,
      priority,
      description,
    });

    res.status(201).json({
      success: true,
      message: 'Maintenance request submitted successfully',
      data: request,
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
 * @desc    Get all maintenance requests with search / filter
 * @route   GET /api/maintenance?status=&category=&priority=&search=
 * @access  Private – Admin or Tenant
 */
const getAllRequests = async (req, res) => {
  const { status, category, priority, search } = req.query;

  const filter = {};
  if (status && status !== 'All') filter.status = status;
  if (category && category !== 'All') filter.category = category;
  if (priority && priority !== 'All') filter.priority = priority;

  try {
    if (req.user.role === 'Tenant') {
      const tenantDoc = await findTenantProfile(req.user.email);
      if (!tenantDoc) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      filter.tenant = tenantDoc._id;
    }

    const requests = await MaintenanceRequest.find(filter)
      .populate('tenant', 'fullName email phoneNumber roomNumber')
      .populate('room', 'roomNumber roomType floorNumber')
      .sort({ createdAt: -1 });

    let filteredRequests = requests;

    if (search) {
      const rx = new RegExp(search, 'i');
      filteredRequests = requests.filter((r) => {
        const tenantMatch = r.tenant && rx.test(r.tenant.fullName);
        const titleMatch = rx.test(r.requestTitle);
        const descMatch = rx.test(r.description);
        const roomMatch = r.tenant && rx.test(r.tenant.roomNumber);
        return tenantMatch || titleMatch || descMatch || roomMatch;
      });
    }

    res.status(200).json({
      success: true,
      count: filteredRequests.length,
      data: filteredRequests,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * @desc    Get single request details
 * @route   GET /api/maintenance/:id
 * @access  Private – Admin or Tenant
 */
const getRequestById = async (req, res) => {
  try {
    const request = await MaintenanceRequest.findById(req.params.id)
      .populate('tenant', 'fullName email phoneNumber roomNumber')
      .populate('room', 'roomNumber roomType floorNumber');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Maintenance request not found' });
    }

    // Tenant check: cannot view other tenants' requests
    if (req.user.role === 'Tenant') {
      const tenantDoc = await findTenantProfile(req.user.email);
      if (!tenantDoc || String(request.tenant._id) !== String(tenantDoc._id)) {
        return res.status(403).json({ success: false, message: 'Access denied to this request' });
      }
    }

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * @desc    Update a maintenance request
 * @route   PUT /api/maintenance/:id
 * @access  Private – Admin or Tenant
 */
const updateRequest = async (req, res) => {
  const {
    requestTitle,
    category,
    priority,
    description,
    status,
    assignedTo,
    resolutionNotes,
  } = req.body;

  try {
    const request = await MaintenanceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (req.user.role === 'Tenant') {
      const tenantDoc = await findTenantProfile(req.user.email);
      if (!tenantDoc || String(request.tenant) !== String(tenantDoc._id)) {
        return res.status(403).json({ success: false, message: 'Access denied to this request' });
      }

      // Tenant can only edit if Pending
      if (request.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          message: 'Cannot edit requests that are already In Progress or Resolved',
        });
      }

      if (requestTitle) request.requestTitle = requestTitle;
      if (category) request.category = category;
      if (priority) request.priority = priority;
      if (description) request.description = description;
    } else {
      // Admin update
      if (requestTitle) request.requestTitle = requestTitle;
      if (category) request.category = category;
      if (priority) request.priority = priority;
      if (description) request.description = description;
      if (status) request.status = status;
      if (assignedTo !== undefined) request.assignedTo = assignedTo;
      if (resolutionNotes !== undefined) request.resolutionNotes = resolutionNotes;
    }

    await request.save();

    res.status(200).json({
      success: true,
      message: 'Request updated successfully',
      data: request,
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
 * @desc    Delete a maintenance request
 * @route   DELETE /api/maintenance/:id
 * @access  Private – Admin or Tenant
 */
const deleteRequest = async (req, res) => {
  try {
    const request = await MaintenanceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (req.user.role === 'Tenant') {
      const tenantDoc = await findTenantProfile(req.user.email);
      if (!tenantDoc || String(request.tenant) !== String(tenantDoc._id)) {
        return res.status(403).json({ success: false, message: 'Access denied to this request' });
      }

      // Tenant can only delete if Pending
      if (request.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete requests that are already In Progress or Resolved',
        });
      }
    }

    await MaintenanceRequest.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Maintenance request deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

module.exports = {
  createRequest,
  getAllRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
};
