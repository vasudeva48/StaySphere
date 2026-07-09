const mongoose = require('mongoose');

// ── Rent Schema ───────────────────────────────────────────────────────────────
const rentSchema = new mongoose.Schema(
  {
    // ── Tenant & Room refs ────────────────────────────────────────────────────
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Tenant',
      required: [true, 'Tenant is required'],
    },

    // Denormalised for fast display without always populating
    tenantName:  { type: String, trim: true },
    roomNumber:  { type: String, trim: true },

    // ── Financials ────────────────────────────────────────────────────────────
    amount: {
      type:     Number,
      required: [true, 'Rent amount is required'],
      min:      [0, 'Amount cannot be negative'],
    },

    // ── Dates ─────────────────────────────────────────────────────────────────
    dueDate: {
      type:     Date,
      required: [true, 'Due date is required'],
    },

    paymentDate: {
      type: Date,   // set when marked Paid
    },

    // ── Payment info ──────────────────────────────────────────────────────────
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'],
      default: 'Cash',
    },

    transactionId: {
      type: String,
      trim: true,
    },

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['Pending', 'Paid', 'Overdue'],
      default: 'Pending',
    },

    // ── Month label for grouping (e.g. "July 2025") ───────────────────────────
    rentMonth: {
      type:    String,
      trim:    true,
    },

    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// ── Pre-save: auto-compute Overdue ────────────────────────────────────────────
rentSchema.pre('save', function () {
  if (this.status === 'Pending' && this.dueDate && new Date() > this.dueDate) {
    this.status = 'Overdue';
  }
});

// ── Static: refresh overdue status on all pending records ─────────────────────
rentSchema.statics.refreshOverdue = async function () {
  await this.updateMany(
    { status: 'Pending', dueDate: { $lt: new Date() } },
    { $set: { status: 'Overdue' } }
  );
};

const Rent = mongoose.model('Rent', rentSchema);
module.exports = Rent;
