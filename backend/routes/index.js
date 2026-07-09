const express = require('express');
const router = express.Router();
const { getStatus } = require('../controllers/indexController');

// @route   GET /
// @desc    API health check
router.get('/', getStatus);

module.exports = router;
