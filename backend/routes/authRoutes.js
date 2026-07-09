const express = require('express');
const router = express.Router();
const { registerUser } = require('../controllers/authController');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerUser);

module.exports = router;
