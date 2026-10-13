const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes: verify JWT from HttpOnly cookie or Authorization header
const protect = async (req, res, next) => {
  let token = null;

  // Prefer HttpOnly cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no session token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dzs_erp_secret_fallback');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, invalid or expired token',
    });
  }
};

// Check module-level action permission or Admin/CEO role
const checkPermission = (moduleName, action = 'view') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    // Main Admin & CEO have full access to all modules
    if (req.user.role === 'Main Admin' || req.user.role === 'CEO') {
      return next();
    }

    // Check Employee specific permissions
    if (req.user.role === 'Employee') {
      const modulePerms = req.user.permissions?.[moduleName];
      if (modulePerms && modulePerms[action]) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. You do not have '${action}' permission for ${moduleName}.`,
    });
  };
};

// Check role directly (e.g. for user management)
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user ? req.user.role : 'Guest'}' is not authorized to access this resource`,
      });
    }
    next();
  };
};

module.exports = { protect, checkPermission, authorizeRoles };
