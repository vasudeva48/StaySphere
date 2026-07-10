const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant is required'],
    },
    tenantName: {
      type: String,
      required: [true, 'Tenant name is required'],
      trim: true,
    },
    roomNumber: {
      type: String,
      trim: true,
      default: '',
    },
    bedNumber: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required'],
    },
    checkInTime: {
      type: Date,
    },
    checkOutTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['Present', 'Checked In', 'Checked Out', 'Absent'],
      default: 'Checked In',
      required: [true, 'Attendance status is required'],
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index to help with querying by date and preventing duplicate check-ins
attendanceSchema.index({ tenant: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
