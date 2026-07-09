const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * @desc  Verify JWT token and attach user to req.user
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorised – no token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorised – user no longer exists',
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorised – token invalid or expired',
    });
  }
};

/**
 * @desc  Restrict access to specific roles
 * @param {...string} roles  Allowed roles e.g. 'Admin'
 */
const authorise = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied – role '${req.user.role}' is not permitted`,
      });
    }
    next();
  };
};

module.exports = { protect, authorise };
