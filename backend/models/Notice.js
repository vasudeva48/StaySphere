const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Notice title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Notice description is required'],
    },
    category: {
      type: String,
      required: [true, 'Notice category is required'],
      enum: ['General', 'Maintenance', 'Rent', 'Emergency', 'Holiday', 'Event', 'Announcement'],
    },
    priority: {
      type: String,
      required: [true, 'Notice priority is required'],
      enum: ['Low', 'Medium', 'High'],
    },
    audience: {
      type: String,
      required: [true, 'Target audience is required'],
      enum: ['All', 'Tenants', 'Staff'],
    },
    publishDate: {
      type: Date,
      required: [true, 'Publish date is required'],
      default: Date.now,
    },
    expiryDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Notice = mongoose.model('Notice', noticeSchema);

module.exports = Notice;
