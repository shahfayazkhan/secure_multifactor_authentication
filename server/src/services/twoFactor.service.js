const User = require('../models/User');
const { verifyTotp, findBackupCode } = require('./totp.service');

const SECRET_FIELDS = '+twoFactor.secret +twoFactor.lastUsedStep +twoFactor.backupCodes';

/** Load a user including the 2FA secret material. */
function loadWithSecrets(userId, extra = '') {
  return User.findById(userId).select(`${SECRET_FIELDS} ${extra}`.trim());
}

/**
 * Verify and *consume* a second factor (TOTP or one-time backup code).
 * Updates are atomic so the same code can never be accepted twice,
 * even under concurrent requests.
 *
 * @returns {Promise<{ ok: boolean, method?: 'totp'|'backup', reason?: string, backupCodesRemaining?: number }>}
 */
async function consumeSecondFactor(user, rawCode) {
  const code = String(rawCode || '').trim();
  const isTotp = /^\d{6}$/.test(code.replace(/\s+/g, ''));

  if (isTotp) {
    const result = verifyTotp(user.twoFactor.secret, code, user.twoFactor.lastUsedStep);
    if (!result.ok) return { ok: false, method: 'totp', reason: result.reason };

    const { modifiedCount } = await User.updateOne(
      { _id: user._id, 'twoFactor.lastUsedStep': { $not: { $gte: result.step } } },
      { $set: { 'twoFactor.lastUsedStep': result.step } }
    );
    if (modifiedCount !== 1) return { ok: false, method: 'totp', reason: 'REPLAY' };
    return { ok: true, method: 'totp' };
  }

  const idx = findBackupCode(user.twoFactor.backupCodes, code);
  if (idx === -1) return { ok: false, method: 'backup', reason: 'INVALID' };

  const path = `twoFactor.backupCodes.${idx}.usedAt`;
  const { modifiedCount } = await User.updateOne(
    { _id: user._id, [path]: null },
    { $set: { [path]: new Date() } }
  );
  if (modifiedCount !== 1) return { ok: false, method: 'backup', reason: 'REPLAY' };

  const remaining = user.twoFactor.backupCodes.filter((c, i) => i !== idx && !c.usedAt).length;
  return { ok: true, method: 'backup', backupCodesRemaining: remaining };
}

function countRemainingBackupCodes(user) {
  return (user.twoFactor?.backupCodes || []).filter((c) => !c.usedAt).length;
}

function reasonMessage(reason) {
  if (reason === 'REPLAY') return 'This code was already used. Wait for the next code and try again.';
  return 'That code is incorrect or has expired.';
}

module.exports = { loadWithSecrets, consumeSecondFactor, countRemainingBackupCodes, reasonMessage };
