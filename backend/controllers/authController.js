const User = require('../models/User');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  const { fullName, email, password, role, phoneNumber } = req.body;

  // ── 1. Validate required fields ──────────────────────────
  if (!fullName || !email || !password || !phoneNumber) {
    return res.status(400).json({
      success: false,
      message: 'Please provide fullName, email, password, and phoneNumber',
    });
  }

  try {
    // ── 2. Check if email is already registered ───────────
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // ── 3. Create the new user ────────────────────────────
    const user = await User.create({
      fullName,
      email,
      password,   // plain-text for now; hashing added when auth is implemented
      role,
      phoneNumber,
    });

    // ── 4. Return the created user (omit password) ────────
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    // Mongoose validation errors (e.g. invalid role enum)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }

    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
    });
  }
};

module.exports = { registerUser };
