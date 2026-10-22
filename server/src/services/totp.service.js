const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const env = require('../config/env');
const { encrypt, decrypt, sha256 } = require('../utils/crypto');

const STEP_SECONDS = 30;
const WINDOW = 1; // accept codes from the previous/next 30s step to absorb clock drift
const BACKUP_CODE_COUNT = 10;
const BACKUP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I confusion

/**
 * Create a new TOTP secret and QR code for enrollment.
 * Returns the encrypted secret (to store) plus what the user needs to see.
 */
async function createEnrollment(email) {
  const secret = speakeasy.generateSecret({ length: 20 });
  const otpauthUrl = speakeasy.otpauthURL({
    secret: secret.base32,
    encoding: 'base32',
    label: `${env.totp.issuer}:${email}`,
    issuer: env.totp.issuer,
    algorithm: 'sha1',
    digits: 6,
    period: STEP_SECONDS,
  });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 240,
    color: { dark: '#0f172a', light: '#ffffff' },
  });

  return {
    encryptedSecret: encrypt(secret.base32),
    manualKey: secret.base32.match(/.{1,4}/g).join(' '),
    otpauthUrl,
    qrCodeDataUrl,
  };
}

/**
 * Verify a 6-digit TOTP code.
 * @returns {{ ok: boolean, step?: number, reason?: string }}
 */
function verifyTotp(encryptedSecret, token, lastUsedStep = 0) {
  const code = String(token || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) return { ok: false, reason: 'FORMAT' };

  const result = speakeasy.totp.verifyDelta({
    secret: decrypt(encryptedSecret),
    encoding: 'base32',
    token: code,
    window: WINDOW,
    step: STEP_SECONDS,
  });
  if (!result) return { ok: false, reason: 'INVALID' };

  const step = Math.floor(Date.now() / 1000 / STEP_SECONDS) + result.delta;
  if (step <= (lastUsedStep || 0)) return { ok: false, reason: 'REPLAY' };

  return { ok: true, step };
}

function normalizeBackupCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Generate a fresh set of one-time backup codes. */
function generateBackupCodes() {
  const plain = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i += 1) {
    let raw = '';
    const bytes = crypto.randomBytes(10);
    for (let j = 0; j < 10; j += 1) raw += BACKUP_ALPHABET[bytes[j] % BACKUP_ALPHABET.length];
    plain.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  const hashed = plain.map((c) => ({ hash: sha256(normalizeBackupCode(c)), usedAt: null }));
  return { plain, hashed };
}

/** Returns the index of a matching unused backup code, or -1. */
function findBackupCode(backupCodes = [], code) {
  const normalized = normalizeBackupCode(code);
  if (normalized.length !== 10) return -1;
  const hash = sha256(normalized);
  return backupCodes.findIndex((c) => !c.usedAt && c.hash === hash);
}

module.exports = {
  createEnrollment,
  verifyTotp,
  generateBackupCodes,
  findBackupCode,
};
