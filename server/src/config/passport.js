const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Used to keep response time constant when the email doesn't exist (user enumeration defence).
const DUMMY_HASH = bcrypt.hashSync('timing-attack-dummy-password', 12);

const GENERIC = 'Invalid email or password.';

passport.use(
  'local',
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password', session: false },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select(
          '+password +failedLoginAttempts +lockUntil'
        );

        if (!user) {
          await bcrypt.compare(password, DUMMY_HASH);
          return done(null, false, { code: 'INVALID_CREDENTIALS', message: GENERIC });
        }

        if (user.isLocked()) {
          const minutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
          return done(null, false, {
            code: 'ACCOUNT_LOCKED',
            message: `Too many failed attempts. Account locked — try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
            lockUntil: user.lockUntil,
            user,
          });
        }

        const valid = await user.comparePassword(password);
        if (!valid) {
          const { locked } = await user.registerFailedLogin();
          return done(null, false, {
            code: locked ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS',
            message: locked
              ? 'Too many failed attempts. Your account has been temporarily locked.'
              : GENERIC,
            user,
            justLocked: locked,
          });
        }

        await user.resetLoginAttempts();
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Only the user id lives in the session.
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    // A deleted user simply ends the session.
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
