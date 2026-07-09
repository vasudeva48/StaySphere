const mongoose = require('mongoose');

const agreementSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant is required'],
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room is required'],
    },
    agreementNumber: {
      type: String,
      required: [true, 'Agreement number is required'],
      unique: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    monthlyRent: {
      type: Number,
      required: [true, 'Monthly rent is required'],
      min: [0, 'Monthly rent cannot be negative'],
    },
    securityDeposit: {
      type: Number,
      required: [true, 'Security deposit is required'],
      min: [0, 'Security deposit cannot be negative'],
    },
    agreementStatus: {
      type: String,
      enum: ['Active', 'Expired', 'Terminated'],
      default: 'Active',
    },
    agreementFile: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save: automatically set status to Expired if current date is past endDate and status is Active
agreementSchema.pre('save', function () {
  if (this.agreementStatus === 'Active' && this.endDate && new Date() > this.endDate) {
    this.agreementStatus = 'Expired';
  }
});

// Static helper to auto-expire agreements whose endDates are in the past
agreementSchema.statics.refreshExpiredStatus = async function () {
  await this.updateMany(
    { agreementStatus: 'Active', endDate: { $lt: new Date() } },
    { $set: { agreementStatus: 'Expired' } }
  );
};

const Agreement = mongoose.model('Agreement', agreementSchema);

module.exports = Agreement;
