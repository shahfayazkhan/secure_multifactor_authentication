const User = require('../models/User');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { logEvent } = require('../services/audit.service');
const { createEnrollment, verifyTotp, generateBackupCodes } = require('../services/totp.service');
const twoFactor = require('../services/twoFactor.service');
const { revokeAllSessions } = require('../services/session.service');
const { save } = require('../utils/sessionHelpers');

const SETUP_TTL_MS = 15 * 60 * 1000;

/** GET /api/2fa/status */
exports.status = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+twoFactor.backupCodes');
  res.json({
    enabled: Boolean(user.twoFactor?.enabled),
    enabledAt: user.twoFactor?.enabledAt || null,
    backupCodesRemaining: twoFactor.countRemainingBackupCodes(user),
  });
});

/** POST /api/2fa/setup — create a pending secret and return the QR code. */
exports.setup = asyncHandler(async (req, res) => {
  if (req.user.twoFactor?.enabled) {
    throw new AppError('Two-factor authentication is already enabled.', 409, 'MFA_ALREADY_ENABLED');
  }

  const enrollment = await createEnrollment(req.user.email);
  await User.updateOne(
    { _id: req.user._id },
    {
      $set: {
        'twoFactor.tempSecret': enrollment.encryptedSecret,
        'twoFactor.tempSecretCreatedAt': new Date(),
      },
    }
  );

  res.json({
    qrCodeDataUrl: enrollment.qrCodeDataUrl,
    manualKey: enrollment.manualKey,
    otpauthUrl: enrollment.otpauthUrl,
    issuer: env.totp.issuer,
    account: req.user.email,
    expiresAt: new Date(Date.now() + SETUP_TTL_MS),
  });
});

/** POST /api/2fa/enable — confirm the first code from the authenticator app. */
exports.enable = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+twoFactor.tempSecret +twoFactor.tempSecretCreatedAt');
  if (user.twoFactor?.enabled) {
    throw new AppError('Two-factor authentication is already enabled.', 409, 'MFA_ALREADY_ENABLED');
  }
  const { tempSecret, tempSecretCreatedAt } = user.twoFactor || {};
  if (!tempSecret || !tempSecretCreatedAt || Date.now() - tempSecretCreatedAt > SETUP_TTL_MS) {
    throw new AppError('Setup expired. Start the setup again to get a new QR code.', 400, 'SETUP_EXPIRED');
  }

  const result = verifyTotp(tempSecret, req.body.code, 0);
  if (!result.ok) {
    throw new AppError('That code is incorrect. Check your authenticator app and try again.', 400, 'INVALID_CODE');
  }

  const { plain, hashed } = generateBackupCodes();
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        'twoFactor.enabled': true,
        'twoFactor.secret': tempSecret,
        'twoFactor.enabledAt': new Date(),
        'twoFactor.lastUsedStep': result.step,
        'twoFactor.backupCodes': hashed,
      },
      $unset: { 'twoFactor.tempSecret': 1, 'twoFactor.tempSecretCreatedAt': 1 },
    }
  );

  // Sessions that only passed a password check are signed out; this one is now 2FA-verified.
  const revoked = await revokeAllSessions(user._id, req.sessionID);
  req.session.meta = { ...req.session.meta, mfa: true };
  await save(req);

  logEvent(req, user._id, 'MFA_ENABLED', { otherSessionsRevoked: revoked });
  const fresh = await User.findById(user._id);

  res.json({ user: fresh.toPublic(), backupCodes: plain, otherSessionsRevoked: revoked });
});

/** POST /api/2fa/disable — requires password + current code (or backup code). */
exports.disable = asyncHandler(async (req, res) => {
  const user = await twoFactor.loadWithSecrets(req.user._id, '+password');
  if (!user.twoFactor?.enabled) {
    throw new AppError('Two-factor authentication is not enabled.', 400, 'MFA_NOT_ENABLED');
  }
  if (!(await user.comparePassword(req.body.password))) {
    throw new AppError('Your password is incorrect.', 401, 'INVALID_PASSWORD');
  }
  const result = await twoFactor.consumeSecondFactor(user, req.body.code);
  if (!result.ok) throw new AppError(twoFactor.reasonMessage(result.reason), 401, 'INVALID_CODE');

  await User.updateOne(
    { _id: user._id },
    {
      $set: { 'twoFactor.enabled': false, 'twoFactor.lastUsedStep': 0, 'twoFactor.backupCodes': [] },
      $unset: { 'twoFactor.secret': 1, 'twoFactor.enabledAt': 1 },
    }
  );
  logEvent(req, user._id, 'MFA_DISABLED');
  const fresh = await User.findById(user._id);
  res.json({ user: fresh.toPublic() });
});

/** POST /api/2fa/backup-codes — regenerate (invalidates the old set). */
exports.regenerateBackupCodes = asyncHandler(async (req, res) => {
  const user = await twoFactor.loadWithSecrets(req.user._id);
  if (!user.twoFactor?.enabled) {
    throw new AppError('Enable two-factor authentication first.', 400, 'MFA_NOT_ENABLED');
  }
  if (!/^\d{6}$/.test(String(req.body.code).replace(/\s+/g, ''))) {
    throw new AppError('Enter the 6-digit code from your authenticator app.', 400, 'VALIDATION_ERROR');
  }
  const result = await twoFactor.consumeSecondFactor(user, req.body.code);
  if (!result.ok) throw new AppError(twoFactor.reasonMessage(result.reason), 401, 'INVALID_CODE');

  const { plain, hashed } = generateBackupCodes();
  await User.updateOne({ _id: user._id }, { $set: { 'twoFactor.backupCodes': hashed } });
  logEvent(req, user._id, 'BACKUP_CODES_REGENERATED');
  res.json({ backupCodes: plain });
});
