const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema(
  {
    // ── Visitor Identity ──────────────────────────────────────
    visitorName: {
      type: String,
      required: [true, 'Visitor name is required'],
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },

    relationshipToTenant: {
      type: String,
      required: [true, 'Relationship to tenant is required'],
      trim: true,
    },

    // ── Linked Tenant & Room ──────────────────────────────────
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant is required'],
    },

    // Denormalised for fast lookup (auto-filled from tenant)
    tenantName: {
      type: String,
      trim: true,
    },

    roomNumber: {
      type: String,
      trim: true,
    },

    // ── Visit Details ─────────────────────────────────────────
    purposeOfVisit: {
      type: String,
      required: [true, 'Purpose of visit is required'],
      trim: true,
    },

    // ── ID Proof ──────────────────────────────────────────────
    idProofType: {
      type: String,
      enum: ['Aadhaar', 'PAN', 'Passport', 'Driving License', 'Voter ID', 'Other'],
    },

    idProofNumber: {
      type: String,
      trim: true,
    },

    // ── Timestamps ────────────────────────────────────────────
    checkInTime: {
      type: Date,
    },

    checkOutTime: {
      type: Date,
    },

    // ── Status ────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['Registered', 'Checked In', 'Checked Out'],
      default: 'Registered',
    },

    // ── Remarks ───────────────────────────────────────────────
    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Visitor = mongoose.model('Visitor', visitorSchema);
module.exports = Visitor;
