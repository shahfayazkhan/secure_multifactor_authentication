const mongoose = require('mongoose');
const { sha256 } = require('../utils/crypto');

const COLLECTION = 'sessions';

const collection = () => mongoose.connection.collection(COLLECTION);

/** Public, non-reversible identifier for a session id (we never expose raw sids). */
const publicId = (sid) => sha256(sid).slice(0, 24);

/** Active sessions for a user, newest activity first. */
async function listUserSessions(userId, currentSid) {
  const docs = await collection()
    .find({ 'session.passport.user': String(userId), expires: { $gt: new Date() } })
    .toArray();

  return docs
    .map((d) => {
      const meta = d.session?.meta || {};
      return {
        id: publicId(d._id),
        current: d._id === currentSid,
        browser: meta.browser || 'Unknown browser',
        os: meta.os || 'Unknown OS',
        deviceType: meta.deviceType || 'desktop',
        ip: meta.ip || null,
        createdAt: meta.createdAt || null,
        lastSeenAt: meta.lastSeenAt || meta.createdAt || null,
        expiresAt: d.expires,
        remembered: Boolean(meta.remember),
        mfa: Boolean(meta.mfa),
      };
    })
    .sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt));
}

/** Revoke one session by its public id. Returns true if something was removed. */
async function revokeSession(userId, id) {
  const docs = await collection()
    .find({ 'session.passport.user': String(userId) }, { projection: { _id: 1 } })
    .toArray();
  const match = docs.find((d) => publicId(d._id) === id);
  if (!match) return false;
  await collection().deleteOne({ _id: match._id });
  return true;
}

/** Revoke every session of the user except (optionally) one. */
async function revokeAllSessions(userId, exceptSid) {
  const filter = { 'session.passport.user': String(userId) };
  if (exceptSid) filter._id = { $ne: exceptSid };
  const { deletedCount } = await collection().deleteMany(filter);
  return deletedCount;
}

module.exports = { listUserSessions, revokeSession, revokeAllSessions, publicId };
