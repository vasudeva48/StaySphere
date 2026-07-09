const User = require('../models/User');

/**
 * @desc    Return the currently authenticated user (lightweight token check)
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    // req.user is already attached by the protect middleware
    res.status(200).json({
      success: true,
      data: {
        _id:         req.user._id,
        fullName:    req.user.fullName,
        email:       req.user.email,
        role:        req.user.role,
        phoneNumber: req.user.phoneNumber,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getMe };
