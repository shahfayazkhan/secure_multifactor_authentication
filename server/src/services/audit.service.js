const SecurityEvent = require('../models/SecurityEvent');
const { getClientInfo } = require('../utils/requestInfo');

/** Fire-and-forget security log. Never throws into the request path. */
function logEvent(req, userId, type, meta) {
  if (!userId) return;
  const { ip, browser, os } = getClientInfo(req);
  SecurityEvent.create({ user: userId, type, ip, browser, os, meta }).catch((err) =>
    console.error('[audit] failed to write event', type, err.message)
  );
}

module.exports = { logEvent };
