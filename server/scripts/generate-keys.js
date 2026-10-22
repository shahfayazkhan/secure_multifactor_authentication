const crypto = require('crypto');

console.log('SESSION_SECRET=' + crypto.randomBytes(48).toString('base64url'));
console.log('TOTP_ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('hex'));
