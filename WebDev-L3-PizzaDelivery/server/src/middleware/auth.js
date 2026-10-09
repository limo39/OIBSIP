const User = require('../models/User');
const { AppError } = require('../utils/errors');
const { readToken, verifyJwt } = require('../utils/tokens');

async function protect(req, res, next) {
  try {
    const token = readToken(req);
    if (!token) throw new AppError('Login required', 401);
    const payload = verifyJwt(token);
    const user = await User.findById(payload.sub);
    if (!user) throw new AppError('Login required', 401);
    if (user.role !== 'admin' && !user.isVerified) {
      throw new AppError('Verify your email to continue', 403);
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError('Session expired. Log in again.', 401));
    }
    return next(err);
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return next(new AppError('You do not have access to this area', 403));
    }
    return next();
  };
}

module.exports = { protect, requireRole };
