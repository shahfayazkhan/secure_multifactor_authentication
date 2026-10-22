const UAParser = require('ua-parser-js');

function getClientInfo(req) {
  const ua = req.get('user-agent') || '';
  const r = new UAParser(ua).getResult();
  const browser = [r.browser.name, r.browser.major].filter(Boolean).join(' ') || 'Unknown browser';
  const os = [r.os.name, r.os.version].filter(Boolean).join(' ') || 'Unknown OS';
  const deviceType = r.device.type || 'desktop';
  return {
    ip: req.ip,
    userAgent: ua.slice(0, 400),
    browser,
    os,
    deviceType,
  };
}

module.exports = { getClientInfo };
