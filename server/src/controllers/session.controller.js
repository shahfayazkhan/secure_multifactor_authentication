const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { logEvent } = require('../services/audit.service');
const sessions = require('../services/session.service');

/** GET /api/sessions */
exports.list = asyncHandler(async (req, res) => {
  const list = await sessions.listUserSessions(req.user._id, req.sessionID);
  res.json({ sessions: list });
});

/** DELETE /api/sessions/:id */
exports.revoke = asyncHandler(async (req, res) => {
  if (req.params.id === sessions.publicId(req.sessionID)) {
    throw new AppError('Use “Sign out” to end your current session.', 400, 'CURRENT_SESSION');
  }
  const removed = await sessions.revokeSession(req.user._id, req.params.id);
  if (!removed) throw new AppError('Session not found or already ended.', 404, 'NOT_FOUND');
  logEvent(req, req.user._id, 'SESSION_REVOKED');
  res.status(204).end();
});

/** DELETE /api/sessions — sign out everywhere else. */
exports.revokeOthers = asyncHandler(async (req, res) => {
  const count = await sessions.revokeAllSessions(req.user._id, req.sessionID);
  logEvent(req, req.user._id, 'SESSIONS_REVOKED_ALL', { count });
  res.json({ revoked: count });
});
