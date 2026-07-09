const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema(
  {
    // ── Personal Details ──────────────────────────────────────
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },

    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: [true, 'Gender is required'],
    },

    dateOfBirth: {
      type: Date,
    },

    address: {
      type: String,
      trim: true,
    },

    // ── Emergency Contact ─────────────────────────────────────
    emergencyContact: {
      name: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
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

    // ── Room Assignment ───────────────────────────────────────
    roomNumber: {
      type: String,
      trim: true,
    },

    bedNumber: {
      type: String,
      trim: true,
    },

    // ── Tenancy Details ───────────────────────────────────────
    joiningDate: {
      type: Date,
      default: Date.now,
    },

    rentAmount: {
      type: Number,
      default: 0,
    },

    depositAmount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ['Active', 'Vacated'],
      default: 'Active',
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
  }
);

const Tenant = mongoose.model('Tenant', tenantSchema);

module.exports = Tenant;
