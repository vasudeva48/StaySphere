const express                = require('express');
const router                 = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');
const { getMe }              = require('../controllers/meController');
const { protect }            = require('../middleware/authMiddleware');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerUser);

// @route   POST /api/auth/login
// @desc    Authenticate user and return JWT
// @access  Public
router.post('/login', loginUser);

// @route   GET /api/auth/me
// @desc    Verify token and return current user (used by frontend auth guards)
// @access  Private
router.get('/me', protect, getMe);

module.exports = router;
