const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const handler = (message, code) => (req, res) =>
  res.status(429).json({ error: { message, code } });

/** General API limiter. */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProd ? 300 : 2000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: handler('Too many requests. Please slow down.', 'RATE_LIMITED'),
});

/**
 * Password login / register attempts per IP.
 * Only *failed* requests count, so normal use (and dev testing) never trips it;
 * per-account lockout in the Passport strategy handles targeted guessing.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: handler('Too many sign-in attempts. Try again in a few minutes.', 'RATE_LIMITED'),
});

/** OTP verification attempts per IP (failed attempts only). */
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 15,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: handler('Too many verification attempts. Wait a few minutes and try again.', 'RATE_LIMITED'),
});

module.exports = { apiLimiter, authLimiter, otpLimiter };
