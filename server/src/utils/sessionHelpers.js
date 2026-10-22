const env = require('../config/env');
const { getClientInfo } = require('./requestInfo');
const { issueCsrfToken } = require('../middleware/csrf');

const regenerate = (req) =>
  new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));

const save = (req) =>
  new Promise((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));

const destroy = (req) =>
  new Promise((resolve) => req.session.destroy(() => resolve()));

/**
 * Finalise sign-in: passport regenerates the session id (prevents session fixation),
 * then we attach device metadata, set the cookie lifetime and issue a fresh CSRF token.
 */
const completeLogin = (req, user, { remember = false, mfa = false } = {}) =>
  new Promise((resolve, reject) => {
    req.login(user, async (err) => {
      if (err) return reject(err);
      try {
        const now = new Date();
        req.session.meta = {
          ...getClientInfo(req),
          createdAt: now,
          authAt: now,
          lastSeenAt: now,
          remember: Boolean(remember),
          mfa: Boolean(mfa),
        };
        req.session.cookie.maxAge = remember ? env.session.rememberMs : env.session.idleMs;
        const csrfToken = issueCsrfToken(req);
        await save(req);
        resolve(csrfToken);
      } catch (e) {
        reject(e);
      }
    });
  });

/** Describe the current session for the client. */
const describeSession = (req) => ({
  expiresAt: req.session.cookie.expires,
  remember: Boolean(req.session.meta?.remember),
  idleTimeoutMs: req.session.meta?.remember ? env.session.rememberMs : env.session.idleMs,
});

module.exports = { regenerate, save, destroy, completeLogin, describeSession };
