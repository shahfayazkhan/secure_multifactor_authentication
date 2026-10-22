const passport = require('passport');
const env = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { logEvent } = require('../services/audit.service');
const { issueCsrfToken } = require('../middleware/csrf');
const twoFactor = require('../services/twoFactor.service');
const { regenerate, save, destroy, completeLogin, describeSession } = require('../utils/sessionHelpers');

const MAX_MFA_ATTEMPTS = 5;

const pendingMfa = (req) => {
  const p = req.session?.mfa;
  if (!p) return null;
  if (Date.now() > p.expiresAt) {
    delete req.session.mfa;
    return null;
  }
  return p;
};

/** GET /api/auth/csrf */
exports.csrf = asyncHandler(async (req, res) => {
  const csrfToken = issueCsrfToken(req);
  await save(req);
  res.json({ csrfToken });
});

/** GET /api/auth/session — bootstrap call for the SPA. */
exports.session = asyncHandler(async (req, res) => {
  const csrfToken = issueCsrfToken(req);
  const authenticated = req.isAuthenticated();
  const pending = authenticated ? null : pendingMfa(req);
  await save(req);
  res.json({
    authenticated,
    user: authenticated ? req.user.toPublic() : null,
    session: authenticated ? describeSession(req) : null,
    mfaPending: pending ? { expiresAt: new Date(pending.expiresAt) } : null,
    csrfToken,
  });
});

/** POST /api/auth/register */
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await User.exists({ email });
  if (exists) throw new AppError('An account with this email already exists.', 409, 'EMAIL_TAKEN');

  const user = await User.create({ name, email, password, lastLoginAt: new Date(), lastLoginIp: req.ip });
  const csrfToken = await completeLogin(req, user, { remember: false });
  logEvent(req, user._id, 'REGISTER');

  res.status(201).json({ user: user.toPublic(), session: describeSession(req), csrfToken });
});

/** POST /api/auth/login — step 1: email + password (Passport local strategy). */
exports.login = (req, res, next) => {
  passport.authenticate('local', async (err, user, info) => {
    try {
      if (err) return next(err);

      if (!user) {
        if (info?.user) {
          logEvent(req, info.user._id, info.justLocked ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED', {
            reason: info.code,
          });
        }
        const status = info?.code === 'ACCOUNT_LOCKED' ? 423 : 401;
        return next(
          new AppError(info?.message || 'Invalid email or password.', status, info?.code || 'INVALID_CREDENTIALS',
            info?.lockUntil ? { lockUntil: info.lockUntil } : undefined)
        );
      }

      const { remember } = req.body;

      // Step 2 required: park the user in a short-lived "pending MFA" session.
      if (user.twoFactor?.enabled) {
        await regenerate(req);
        const expiresAt = Date.now() + env.totp.pendingMs;
        req.session.mfa = { userId: user.id, remember: Boolean(remember), expiresAt, attempts: 0 };
        const csrfToken = issueCsrfToken(req);
        await save(req);
        logEvent(req, user._id, 'MFA_CHALLENGE');
        return res.json({ mfaRequired: true, expiresAt: new Date(expiresAt), csrfToken });
      }

      const csrfToken = await completeLogin(req, user, { remember });
      await User.updateOne({ _id: user._id }, { lastLoginAt: new Date(), lastLoginIp: req.ip });
      logEvent(req, user._id, 'LOGIN_SUCCESS', { mfa: false });
      return res.json({ mfaRequired: false, user: user.toPublic(), session: describeSession(req), csrfToken });
    } catch (e) {
      return next(e);
    }
  })(req, res, next);
};

/** POST /api/auth/2fa/verify — step 2: TOTP or backup code. */
exports.verifyMfa = asyncHandler(async (req, res) => {
  const pending = pendingMfa(req);
  if (!pending) {
    await save(req);
    throw new AppError('Your sign-in attempt expired. Please sign in again.', 401, 'MFA_EXPIRED');
  }

  const user = await twoFactor.loadWithSecrets(pending.userId);
  if (!user || !user.twoFactor?.enabled) {
    delete req.session.mfa;
    await save(req);
    throw new AppError('Please sign in again.', 401, 'MFA_EXPIRED');
  }

  const result = await twoFactor.consumeSecondFactor(user, req.body.code);

  if (!result.ok) {
    pending.attempts += 1;
    logEvent(req, user._id, 'MFA_FAILED', { method: result.method, reason: result.reason });

    if (pending.attempts >= MAX_MFA_ATTEMPTS) {
      delete req.session.mfa;
      await save(req);
      throw new AppError('Too many incorrect codes. Please sign in again.', 401, 'MFA_TOO_MANY_ATTEMPTS');
    }
    req.session.mfa = pending;
    await save(req);
    throw new AppError(twoFactor.reasonMessage(result.reason), 401, 'INVALID_CODE', {
      attemptsRemaining: MAX_MFA_ATTEMPTS - pending.attempts,
    });
  }

  const csrfToken = await completeLogin(req, user, { remember: pending.remember, mfa: true });
  await User.updateOne({ _id: user._id }, { lastLoginAt: new Date(), lastLoginIp: req.ip });

  logEvent(req, user._id, 'MFA_SUCCESS', { method: result.method });
  if (result.method === 'backup') {
    logEvent(req, user._id, 'BACKUP_CODE_USED', { remaining: result.backupCodesRemaining });
  }

  res.json({
    user: user.toPublic(),
    session: describeSession(req),
    csrfToken,
    usedBackupCode: result.method === 'backup',
    backupCodesRemaining: result.method === 'backup' ? result.backupCodesRemaining : undefined,
  });
});

/** POST /api/auth/2fa/cancel — abandon the pending MFA step. */
exports.cancelMfa = asyncHandler(async (req, res) => {
  delete req.session.mfa;
  await save(req);
  res.status(204).end();
});

/** GET /api/auth/me */
exports.me = (req, res) => {
  res.json({ user: req.user.toPublic(), session: describeSession(req) });
};

/** POST /api/auth/logout */
exports.logout = (req, res, next) => {
  const userId = req.user?._id;
  req.logout((err) => {
    if (err) return next(err);
    destroy(req).then(() => {
      if (userId) logEvent(req, userId, 'LOGOUT');
      res.clearCookie(env.session.name, { httpOnly: true, sameSite: 'lax', secure: env.isProd });
      res.status(204).end();
    });
  });
};
