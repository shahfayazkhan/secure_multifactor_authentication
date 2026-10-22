const env = require('../config/env');
const User = require('../models/User');
const SecurityEvent = require('../models/SecurityEvent');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { logEvent } = require('../services/audit.service');
const { revokeAllSessions } = require('../services/session.service');
const twoFactor = require('../services/twoFactor.service');
const { save, destroy } = require('../utils/sessionHelpers');

/** GET /api/account/activity?limit=50&before=<ISO date> */
exports.activity = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
  const filter = { user: req.user._id };
  if (req.query.before) filter.createdAt = { $lt: new Date(req.query.before) };

  const events = await SecurityEvent.find(filter).sort({ createdAt: -1 }).limit(limit + 1).lean();
  const hasMore = events.length > limit;
  res.json({
    events: events.slice(0, limit).map((e) => ({
      id: e._id,
      type: e.type,
      ip: e.ip,
      browser: e.browser,
      os: e.os,
      meta: e.meta,
      createdAt: e.createdAt,
    })),
    hasMore,
  });
});

/** PATCH /api/account/profile */
exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user._id, { name: req.body.name }, { new: true });
  logEvent(req, user._id, 'PROFILE_UPDATED');
  res.json({ user: user.toPublic() });
});

/** POST /api/account/password — change password and sign out other devices. */
exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw new AppError('Your current password is incorrect.', 401, 'INVALID_PASSWORD');
  }
  user.password = req.body.newPassword;
  await user.save();

  const revoked = await revokeAllSessions(user._id, req.sessionID);
  req.session.meta = { ...req.session.meta, authAt: new Date() };
  await save(req);

  logEvent(req, user._id, 'PASSWORD_CHANGED', { otherSessionsRevoked: revoked });
  res.json({ user: user.toPublic(), otherSessionsRevoked: revoked });
});

/** DELETE /api/account — permanently delete the account. */
exports.deleteAccount = asyncHandler(async (req, res) => {
  const user = await twoFactor.loadWithSecrets(req.user._id, '+password');
  if (!(await user.comparePassword(req.body.password))) {
    throw new AppError('Your password is incorrect.', 401, 'INVALID_PASSWORD');
  }
  if (user.twoFactor?.enabled) {
    if (!req.body.code) throw new AppError('Enter your authentication code.', 400, 'CODE_REQUIRED');
    const result = await twoFactor.consumeSecondFactor(user, req.body.code);
    if (!result.ok) throw new AppError(twoFactor.reasonMessage(result.reason), 401, 'INVALID_CODE');
  }

  await revokeAllSessions(user._id, req.sessionID);
  await SecurityEvent.deleteMany({ user: user._id });
  await User.deleteOne({ _id: user._id });

  req.logout(() => {
    destroy(req).then(() => {
      res.clearCookie(env.session.name, { httpOnly: true, sameSite: 'lax', secure: env.isProd });
      res.status(204).end();
    });
  });
});
