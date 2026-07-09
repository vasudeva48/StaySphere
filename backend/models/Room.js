const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      unique: true,
      trim: true,
    },

    roomType: {
      type: String,
      enum: ['Single', 'Double', 'Triple', 'Dormitory'],
      required: [true, 'Room type is required'],
    },

    floorNumber: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    // ── Bed Tracking ──────────────────────────────────────────
    totalBeds: {
      type: Number,
      required: [true, 'Total beds is required'],
      min: [1, 'A room must have at least 1 bed'],
    },

    occupiedBeds: {
      type: Number,
      default: 0,
      min: 0,
    },

    availableBeds: {
      type: Number,
      default: function () { return this.totalBeds; },
      min: 0,
    },

    // ── Financials ────────────────────────────────────────────
    monthlyRent: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Status ────────────────────────────────────────────────
    // 'Available' – has free beds  |  'Full' – all beds taken  |  'Maintenance' – manual override
    status: {
      type: String,
      enum: ['Available', 'Full', 'Maintenance'],
      default: 'Available',
    },

    // ── Bed-to-Tenant map  ────────────────────────────────────
    // e.g. [{ bedLabel: 'A', tenantId: ObjectId }]
    beds: [
      {
        bedLabel:  { type: String, required: true },
        tenantId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
        isOccupied:{ type: Boolean, default: false },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ── Pre-save: keep availableBeds & status in sync ─────────────────────
roomSchema.pre('save', function () {
  this.availableBeds = this.totalBeds - this.occupiedBeds;
  if (this.status !== 'Maintenance') {
    this.status = this.availableBeds === 0 ? 'Full' : 'Available';
  }
});

// ── Static helper: build default bed labels ───────────────────────────
roomSchema.statics.buildBeds = function (total) {
  return Array.from({ length: total }, (_, i) => ({
    bedLabel:   String.fromCharCode(65 + i), // A, B, C …
    tenantId:   null,
    isOccupied: false,
  }));
};

const Room = mongoose.model('Room', roomSchema);
module.exports = Room;
