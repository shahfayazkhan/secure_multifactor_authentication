const mongoose = require('mongoose');

const EVENT_TYPES = [
  'REGISTER',
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'ACCOUNT_LOCKED',
  'MFA_CHALLENGE',
  'MFA_SUCCESS',
  'MFA_FAILED',
  'BACKUP_CODE_USED',
  'MFA_ENABLED',
  'MFA_DISABLED',
  'BACKUP_CODES_REGENERATED',
  'LOGOUT',
  'SESSION_REVOKED',
  'SESSIONS_REVOKED_ALL',
  'PASSWORD_CHANGED',
  'PROFILE_UPDATED',
];

const securityEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    type: { type: String, enum: EVENT_TYPES, required: true },
    ip: String,
    browser: String,
    os: String,
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Keep the audit log for 90 days.
securityEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
module.exports.EVENT_TYPES = EVENT_TYPES;
