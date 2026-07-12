const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');

// ── Helper: sign a JWT ────────────────────────────────────────────────────────
const generateToken = (userId, role) =>
  jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  const { fullName, email, password, role, phoneNumber } = req.body;

  // ── 1. Validate required fields ───────────────────────────
  if (!fullName || !email || !password || !phoneNumber) {
    return res.status(400).json({
      success: false,
      message: 'Please provide fullName, email, password, and phoneNumber',
    });
  }

  try {
    // ── Check if Admin account already exists ──────────────────
    if (role === 'Admin') {
      const adminExists = await User.findOne({ role: 'Admin' });
      if (adminExists) {
        return res.status(400).json({
          success: false,
          message: 'An Admin account already exists.',
        });
      }
    }

    // ── 2. Check for duplicate email ──────────────────────
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // ── 3. Hash password ──────────────────────────────────
    const salt           = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ── 4. Persist the new user ───────────────────────────
    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      role,
      phoneNumber,
    });

    // If the registered user is a Tenant, ensure a Tenant profile exists
    if (role === 'Tenant') {
      const Tenant = require('../models/Tenant');
      const existingTenant = await Tenant.findOne({ email: email.toLowerCase() });
      if (!existingTenant) {
        await Tenant.create({
          fullName,
          email: email.toLowerCase(),
          phoneNumber,
          gender: 'Other',
          status: 'Active',
        });
      }
    }

    // ── 5. Issue JWT ──────────────────────────────────────
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      data: {
        _id:         user._id,
        fullName:    user.fullName,
        email:       user.email,
        role:        user.role,
        phoneNumber: user.phoneNumber,
        createdAt:   user.createdAt,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Login an existing user
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // ── 1. Validate required fields ───────────────────────────
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password',
    });
  }

  try {
    // ── 2. Find user (explicitly select password field) ───
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // ── 3. Compare passwords ──────────────────────────────
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // ── 4. Issue JWT ──────────────────────────────────────
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: {
        _id:         user._id,
        fullName:    user.fullName,
        email:       user.email,
        role:        user.role,
        phoneNumber: user.phoneNumber,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

module.exports = { registerUser, loginUser };
