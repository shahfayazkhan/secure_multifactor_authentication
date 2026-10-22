const session = require('express-session');
const MongoStore = require('connect-mongo');
const env = require('./env');

function buildSession(mongoClient) {
  return session({
    name: env.session.name,
    secret: env.session.secret,
    resave: false,
    saveUninitialized: false, // no cookie until something is stored (CSRF token / login)
    rolling: true, // sliding expiration: every request extends the idle timeout
    store: MongoStore.create({
      client: mongoClient,
      collectionName: 'sessions',
      stringify: false, // store as object so we can query sessions by user
      touchAfter: 60, // seconds; limits writes for unchanged sessions
      autoRemove: 'native',
    }),
    cookie: {
      httpOnly: true,
      secure: env.isProd, // HTTPS only in production
      sameSite: 'lax',
      maxAge: env.session.idleMs,
    },
  });
}

module.exports = buildSession;
