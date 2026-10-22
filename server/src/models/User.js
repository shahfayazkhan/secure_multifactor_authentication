const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

const BCRYPT_ROUNDS = 12;

const backupCodeSchema = new mongoose.Schema(
  {
    hash: { type: String, required: true },
    usedAt: { type: Date, default: null },
  },
  { _id: false }
);

const twoFactorSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    // AES-256-GCM encrypted base32 secret. Never returned by default.
    secret: { type: String, select: false },
    // Pending secret while the user is scanning the QR code.
    tempSecret: { type: String, select: false },
    tempSecretCreatedAt: { type: Date, select: false },
    enabledAt: Date,
    // Last accepted TOTP time-step — prevents replaying the same code.
    lastUsedStep: { type: Number, default: 0, select: false },
    backupCodes: { type: [backupCodeSchema], default: [], select: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    password: { type: String, required: true, select: false },
    passwordChangedAt: Date,

    twoFactor: { type: twoFactorSchema, default: () => ({}) },

    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },

    lastLoginAt: Date,
    lastLoginIp: String,
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
  if (!this.isNew) this.passwordChangedAt = new Date();
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isLocked = function isLocked() {
  return Boolean(this.lockUntil && this.lockUntil > Date.now());
};

/** Record a failed password attempt and lock the account when over the limit. */
userSchema.methods.registerFailedLogin = async function registerFailedLogin() {
  const attempts = (this.failedLoginAttempts || 0) + 1;
  const update = { $set: { failedLoginAttempts: attempts } };
  if (attempts >= env.security.maxLoginAttempts) {
    update.$set.lockUntil = new Date(Date.now() + env.security.lockoutMs);
    update.$set.failedLoginAttempts = 0;
  }
  await this.constructor.updateOne({ _id: this._id }, update);
  return { locked: Boolean(update.$set.lockUntil), lockUntil: update.$set.lockUntil };
};

userSchema.methods.resetLoginAttempts = function resetLoginAttempts() {
  return this.constructor.updateOne(
    { _id: this._id },
    { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: 1 } }
  );
};

/** Shape returned to the client — never includes secrets. */
userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    twoFactorEnabled: Boolean(this.twoFactor?.enabled),
    twoFactorEnabledAt: this.twoFactor?.enabledAt || null,
    lastLoginAt: this.lastLoginAt || null,
    passwordChangedAt: this.passwordChangedAt || null,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
