const env = require('../config/env');
const AppError = require('../utils/AppError');
const { randomToken, safeEqual } = require('../utils/crypto');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Get (or lazily create) the synchronizer token stored in the session. */
function issueCsrfToken(req) {
  if (!req.session.csrfToken) req.session.csrfToken = randomToken(32);
  return req.session.csrfToken;
}

/**
 * Synchronizer-token CSRF protection + Origin check for all state-changing requests.
 * The SPA fetches the token from GET /api/auth/csrf and sends it in `X-CSRF-Token`.
 */
function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  if (origin && !env.clientOrigins.includes(origin)) {
    return next(
      new AppError(
        `Request origin ${origin} is not allowed. Add it to CLIENT_ORIGIN in server/.env.`,
        403,
        'BAD_ORIGIN'
      )
    );
  }

  const sent = req.get('x-csrf-token');
  if (!sent || !req.session?.csrfToken || !safeEqual(sent, req.session.csrfToken)) {
    return next(new AppError('Invalid or missing CSRF token. Refresh and try again.', 403, 'CSRF_INVALID'));
  }
  return next();
}

module.exports = { csrfProtection, issueCsrfToken };
