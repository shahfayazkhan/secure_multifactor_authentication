require('dotenv').config();

const required = ['MONGO_URI', 'SESSION_SECRET', 'TOTP_ENCRYPTION_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[config] Missing required env var: ${key}`);
    process.exit(1);
  }
}

if (!/^[0-9a-fA-F]{64}$/.test(process.env.TOTP_ENCRYPTION_KEY)) {
  console.error('[config] TOTP_ENCRYPTION_KEY must be 64 hex chars (32 bytes). Run `npm run gen:keys`.');
  process.exit(1);
}

/**
 * CLIENT_ORIGIN may be a comma-separated list. In development we also accept the
 * localhost <-> 127.0.0.1 twin so opening either URL works.
 */
function parseOrigins(raw, isProd) {
  const list = String(raw || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  if (!isProd) {
    for (const o of [...list]) {
      if (o.includes('://localhost')) list.push(o.replace('://localhost', '://127.0.0.1'));
      else if (o.includes('://127.0.0.1')) list.push(o.replace('://127.0.0.1', '://localhost'));
    }
  }
  return [...new Set(list)];
}

const int = (v, d) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: int(process.env.PORT, 5050),
  clientOrigins: parseOrigins(process.env.CLIENT_ORIGIN, process.env.NODE_ENV === 'production'),
  mongoUri: process.env.MONGO_URI,

  session: {
    secret: process.env.SESSION_SECRET,
    name: process.env.SESSION_NAME || 'mfa.sid',
    idleMs: int(process.env.SESSION_IDLE_MINUTES, 60) * 60 * 1000,
    rememberMs: int(process.env.SESSION_REMEMBER_DAYS, 14) * 24 * 60 * 60 * 1000,
  },

  totp: {
    key: Buffer.from(process.env.TOTP_ENCRYPTION_KEY, 'hex'),
    issuer: process.env.TOTP_ISSUER || 'SFK Secure',
    pendingMs: int(process.env.MFA_PENDING_MINUTES, 5) * 60 * 1000,
  },

  security: {
    maxLoginAttempts: int(process.env.MAX_LOGIN_ATTEMPTS, 5),
    lockoutMs: int(process.env.LOCKOUT_MINUTES, 15) * 60 * 1000,
  },
};

module.exports = env;
