const mongoose = require('mongoose');

const maintenanceRequestSchema = new mongoose.Schema(
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
    requestTitle: {
      type: String,
      required: [true, 'Request title is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['Electrical', 'Plumbing', 'Cleaning', 'Furniture', 'Internet', 'Other'],
      required: [true, 'Category is required'],
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      required: [true, 'Priority is required'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved'],
      default: 'Pending',
    },
    assignedTo: {
      type: String,
      trim: true,
    },
    resolutionNotes: {
      type: String,
      trim: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save: Auto-set resolvedAt if status is transitioned to Resolved
maintenanceRequestSchema.pre('save', function () {
  if (this.status === 'Resolved' && !this.resolvedAt) {
    this.resolvedAt = new Date();
  } else if (this.status !== 'Resolved') {
    this.resolvedAt = undefined;
  }
});

const MaintenanceRequest = mongoose.model('MaintenanceRequest', maintenanceRequestSchema);

module.exports = MaintenanceRequest;
