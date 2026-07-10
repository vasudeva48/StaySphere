const Attendance = require('../models/Attendance');
const Tenant = require('../models/Tenant');

// Helper to get start and end of day in local/server time
const getDayRange = (dateInput) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/**
 * @desc    Record Check-In for a tenant
 * @route   POST /api/attendance/checkin
 * @access  Private - Admin only
 */
const checkIn = async (req, res) => {
  const { tenant, remarks, date, status } = req.body;

  if (!tenant) {
    return res.status(400).json({
      success: false,
      message: 'Tenant ID is required',
    });
  }

  try {
    const tenantDoc = await Tenant.findById(tenant);
    if (!tenantDoc) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    if (tenantDoc.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot record attendance for inactive/vacated tenant',
      });
    }

    // Determine the target date
    const targetDate = date ? new Date(date) : new Date();
    const { start: dayStart } = getDayRange(targetDate);

    // Prevent duplicate check-ins for the same tenant on the same day
    const existingRecord = await Attendance.findOne({
      tenant: tenantDoc._id,
      date: dayStart,
    });

    if (existingRecord) {
      return res.status(400).json({
        success: false,
        message: `Attendance/Check-In is already recorded for this tenant on ${dayStart.toLocaleDateString()}`,
      });
    }

    const attendanceStatus = status || 'Checked In';

    const attendance = await Attendance.create({
      tenant: tenantDoc._id,
      tenantName: tenantDoc.fullName,
      roomNumber: tenantDoc.roomNumber || '',
      bedNumber: tenantDoc.bedNumber || '',
      date: dayStart,
      checkInTime: new Date(),
      status: attendanceStatus,
      remarks: remarks || '',
    });

    res.status(201).json({
      success: true,
      message: `${tenantDoc.fullName} checked in successfully`,
      data: attendance,
    });
  } catch (error) {
    console.error('Error in checkIn:', error);
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: msgs.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * @desc    Record Check-Out for a tenant
 * @route   POST /api/attendance/checkout
 * @access  Private - Admin only
 */
const checkOut = async (req, res) => {
  const { tenant, remarks, date } = req.body;

  if (!tenant) {
    return res.status(400).json({
      success: false,
      message: 'Tenant ID is required',
    });
  }

  try {
    const tenantDoc = await Tenant.findById(tenant);
    if (!tenantDoc) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    // Determine target date
    const targetDate = date ? new Date(date) : new Date();
    const { start: dayStart } = getDayRange(targetDate);

    // Find the check-in record for today
    const attendance = await Attendance.findOne({
      tenant: tenantDoc._id,
      date: dayStart,
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'Cannot check out before checking in (no check-in record found for today)',
      });
    }

    if (attendance.status === 'Checked Out') {
      return res.status(400).json({
        success: false,
        message: 'Tenant has already checked out today',
      });
    }

    if (attendance.status === 'Absent') {
      return res.status(400).json({
        success: false,
        message: 'Cannot check out a tenant marked as Absent',
      });
    }

    attendance.status = 'Checked Out';
    attendance.checkOutTime = new Date();
    if (remarks !== undefined) {
      attendance.remarks = remarks;
    }

    await attendance.save();

    res.status(200).json({
      success: true,
      message: `${tenantDoc.fullName} checked out successfully`,
      data: attendance,
    });
  } catch (error) {
    console.error('Error in checkOut:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * @desc    Get all attendance records with query filters
 * @route   GET /api/attendance
 * @access  Private - Admin only
 */
const getAllAttendance = async (req, res) => {
  const { search, status, date } = req.query;
  const filter = {};

  if (status && status !== 'All') {
    filter.status = status;
  }

  if (date) {
    const { start, end } = getDayRange(date);
    filter.date = { $gte: start, $lte: end };
  }

  try {
    let records = await Attendance.find(filter)
      .populate('tenant', 'fullName email phoneNumber roomNumber bedNumber')
      .sort({ date: -1, createdAt: -1 });

    if (search) {
      const rx = new RegExp(search, 'i');
      records = records.filter(
        (r) =>
          rx.test(r.tenantName) ||
          rx.test(r.roomNumber) ||
          rx.test(r.bedNumber) ||
          (r.remarks && rx.test(r.remarks))
      );
    }

    res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    console.error('Error in getAllAttendance:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get a single attendance record by ID
 * @route   GET /api/attendance/:id
 * @access  Private - Admin only
 */
const getAttendanceById = async (req, res) => {
  try {
    const record = await Attendance.findById(req.params.id).populate(
      'tenant',
      'fullName email phoneNumber roomNumber bedNumber'
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('Error in getAttendanceById:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: 'Invalid attendance ID' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Update an attendance record
 * @route   PUT /api/attendance/:id
 * @access  Private - Admin only
 */
const updateAttendance = async (req, res) => {
  const { status, remarks, checkInTime, checkOutTime, date, roomNumber, bedNumber } = req.body;

  try {
    const record = await Attendance.findById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    if (status) record.status = status;
    if (remarks !== undefined) record.remarks = remarks;
    if (checkInTime) record.checkInTime = new Date(checkInTime);
    if (checkOutTime) record.checkOutTime = new Date(checkOutTime);
    if (roomNumber !== undefined) record.roomNumber = roomNumber;
    if (bedNumber !== undefined) record.bedNumber = bedNumber;

    if (date) {
      const { start } = getDayRange(date);
      record.date = start;
    }

    await record.save();

    res.status(200).json({
      success: true,
      message: 'Attendance record updated successfully',
      data: record,
    });
  } catch (error) {
    console.error('Error in updateAttendance:', error);
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: msgs.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Delete an attendance record
 * @route   DELETE /api/attendance/:id
 * @access  Private - Admin only
 */
const deleteAttendance = async (req, res) => {
  try {
    const record = await Attendance.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteAttendance:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get attendance summary statistics for today
 * @route   GET /api/attendance/summary
 * @access  Private - Admin only
 */
const getAttendanceSummary = async (req, res) => {
  try {
    const { start, end } = getDayRange();

    const [
      totalCheckedIn,
      totalCheckedOut,
      totalPresent,
      totalAbsent,
      totalActiveTenants,
    ] = await Promise.all([
      Attendance.countDocuments({ date: { $gte: start, $lte: end }, status: 'Checked In' }),
      Attendance.countDocuments({ date: { $gte: start, $lte: end }, status: 'Checked Out' }),
      Attendance.countDocuments({ date: { $gte: start, $lte: end }, status: 'Present' }),
      Attendance.countDocuments({ date: { $gte: start, $lte: end }, status: 'Absent' }),
      Tenant.countDocuments({ status: 'Active' }),
    ]);

    // Active tenants today that haven't checked in yet or don't have records can be counted
    const totalRecorded = await Attendance.countDocuments({ date: { $gte: start, $lte: end } });
    const pendingCheckIn = Math.max(0, totalActiveTenants - totalRecorded);

    res.status(200).json({
      success: true,
      data: {
        checkedIn: totalCheckedIn,
        checkedOut: totalCheckedOut,
        present: totalPresent,
        absent: totalAbsent,
        pending: pendingCheckIn,
        totalActiveTenants,
        todayTotalRecords: totalRecorded,
      },
    });
  } catch (error) {
    console.error('Error in getAttendanceSummary:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getAllAttendance,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
  getAttendanceSummary,
};
