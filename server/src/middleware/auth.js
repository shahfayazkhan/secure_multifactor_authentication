const AppError = require('../utils/AppError');

const ABSOLUTE_MAX_MS = 30 * 24 * 60 * 60 * 1000; // hard cap on any session: 30 days
const LAST_SEEN_THROTTLE_MS = 60 * 1000;

/**
 * Protect a route: requires a fully authenticated session
 * (password + 2FA when the user has it enabled).
 */
function requireAuth(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return next(new AppError('Please sign in to continue.', 401, 'UNAUTHENTICATED'));
  }

  const meta = req.session.meta || {};

  // Absolute session lifetime, regardless of activity.
  if (meta.createdAt && Date.now() - new Date(meta.createdAt).getTime() > ABSOLUTE_MAX_MS) {
    return req.session.destroy(() =>
      next(new AppError('Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED'))
    );
  }

  // Sessions created before a password change are invalid.
  const authAt = meta.authAt || meta.createdAt;
  if (req.user.passwordChangedAt && authAt && new Date(authAt) < req.user.passwordChangedAt) {
    return req.session.destroy(() =>
      next(new AppError('Your password was changed. Please sign in again.', 401, 'SESSION_EXPIRED'))
    );
  }

  // Track activity (throttled) for the "active sessions" screen.
  const last = meta.lastSeenAt ? new Date(meta.lastSeenAt).getTime() : 0;
  if (Date.now() - last > LAST_SEEN_THROTTLE_MS) {
    req.session.meta = { ...meta, lastSeenAt: new Date(), ip: req.ip };
  }
  return next();
}

/** Only for guests (e.g. register/login). */
function requireGuest(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next(new AppError('You are already signed in.', 409, 'ALREADY_AUTHENTICATED'));
  }
  return next();
}

module.exports = { requireAuth, requireGuest };
