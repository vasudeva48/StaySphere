const Notice = require('../models/Notice');

/**
 * @desc    Create a new notice
 * @route   POST /api/notices
 * @access  Private – Admin only
 */
const createNotice = async (req, res) => {
  const { title, description, category, priority, audience, publishDate, expiryDate, isActive } = req.body;

  if (!title || !description || !category || !priority || !audience) {
    return res.status(400).json({
      success: false,
      message: 'title, description, category, priority, and audience are required',
    });
  }

  try {
    const notice = await Notice.create({
      title,
      description,
      category,
      priority,
      audience,
      publishDate: publishDate ? new Date(publishDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Notice posted successfully',
      data: notice,
    });
  } catch (error) {
    console.error('Error in createNotice:', error);
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: msgs.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * @desc    Get all notices
 * @route   GET /api/notices
 * @access  Private – Admin only
 */
const getAllNotices = async (req, res) => {
  const { category, audience, search } = req.query;

  const query = {};

  if (category && category !== 'All') {
    query.category = category;
  }

  if (audience && audience !== 'All') {
    query.audience = audience;
  }

  if (search) {
    const rx = new RegExp(search, 'i');
    query.$or = [{ title: rx }, { category: rx }];
  }

  try {
    const notices = await Notice.find(query)
      .populate('createdBy', 'fullName email')
      .lean();

    // Sort by priority (High -> Medium -> Low) and publishDate (newest first)
    const priorityWeight = { High: 1, Medium: 2, Low: 3 };
    notices.sort((a, b) => {
      const wA = priorityWeight[a.priority] || 99;
      const wB = priorityWeight[b.priority] || 99;
      if (wA !== wB) return wA - wB;
      return new Date(b.publishDate) - new Date(a.publishDate);
    });

    res.status(200).json({
      success: true,
      count: notices.length,
      data: notices,
    });
  } catch (error) {
    console.error('Error in getAllNotices:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get active and non-expired notices
 * @route   GET /api/notices/active
 * @access  Private – Admin & Tenant
 */
const getActiveNotices = async (req, res) => {
  const { category, audience, search } = req.query;
  const now = new Date();

  const query = {
    isActive: true,
    publishDate: { $lte: now },
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gt: now } }
    ]
  };

  // Restrict by role - Tenants can only see All or Tenants
  if (req.user.role === 'Tenant') {
    query.audience = { $in: ['All', 'Tenants'] };
  } else if (audience && audience !== 'All') {
    query.audience = audience;
  }

  // Category filter
  if (category && category !== 'All') {
    query.category = category;
  }

  // Search filter
  if (search) {
    const rx = new RegExp(search, 'i');
    query.$or = [{ title: rx }, { category: rx }];
  }

  try {
    const notices = await Notice.find(query)
      .populate('createdBy', 'fullName email')
      .lean();

    // Sort by priority (High -> Medium -> Low) and publishDate (newest first)
    const priorityWeight = { High: 1, Medium: 2, Low: 3 };
    notices.sort((a, b) => {
      const wA = priorityWeight[a.priority] || 99;
      const wB = priorityWeight[b.priority] || 99;
      if (wA !== wB) return wA - wB;
      return new Date(b.publishDate) - new Date(a.publishDate);
    });

    res.status(200).json({
      success: true,
      count: notices.length,
      data: notices,
    });
  } catch (error) {
    console.error('Error in getActiveNotices:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get notice by ID
 * @route   GET /api/notices/:id
 * @access  Private – Admin & Tenant
 */
const getNoticeById = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .lean();

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found',
      });
    }

    // Role check for Tenant
    if (req.user.role === 'Tenant') {
      const now = new Date();
      const isExpired = notice.expiryDate && new Date(notice.expiryDate) <= now;
      const isPublished = new Date(notice.publishDate) <= now;
      const isAudienceAllowed = ['All', 'Tenants'].includes(notice.audience);

      if (!notice.isActive || isExpired || !isPublished || !isAudienceAllowed) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this notice',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: notice,
    });
  } catch (error) {
    console.error('Error in getNoticeById:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Update a notice
 * @route   PUT /api/notices/:id
 * @access  Private – Admin only
 */
const updateNotice = async (req, res) => {
  const { title, description, category, priority, audience, publishDate, expiryDate, isActive } = req.body;

  try {
    let notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found',
      });
    }

    if (title !== undefined) notice.title = title;
    if (description !== undefined) notice.description = description;
    if (category !== undefined) notice.category = category;
    if (priority !== undefined) notice.priority = priority;
    if (audience !== undefined) notice.audience = audience;
    if (publishDate !== undefined) notice.publishDate = new Date(publishDate);
    
    if (expiryDate !== undefined) {
      notice.expiryDate = expiryDate ? new Date(expiryDate) : null;
    }
    
    if (isActive !== undefined) notice.isActive = isActive;

    await notice.save();

    res.status(200).json({
      success: true,
      message: 'Notice updated successfully',
      data: notice,
    });
  } catch (error) {
    console.error('Error in updateNotice:', error);
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: msgs.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Delete a notice
 * @route   DELETE /api/notices/:id
 * @access  Private – Admin only
 */
const deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found',
      });
    }

    await Notice.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Notice deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteNotice:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createNotice,
  getAllNotices,
  getActiveNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
};
