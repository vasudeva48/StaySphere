const User = require('../models/User');
const Tenant = require('../models/Tenant');

/**
 * @desc    Return the currently authenticated user (lightweight token check)
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const data = {
      _id:         req.user._id,
      fullName:    req.user.fullName,
      email:       req.user.email,
      role:        req.user.role,
      phoneNumber: req.user.phoneNumber,
    };

    if (req.user.role === 'Tenant') {
      const tenantDoc = await Tenant.findOne({ email: req.user.email.toLowerCase() });
      if (tenantDoc) {
        data.roomNumber = tenantDoc.roomNumber;
        data.bedNumber  = tenantDoc.bedNumber;
      }
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getMe };
