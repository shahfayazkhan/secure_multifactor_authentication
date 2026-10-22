const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const passport = require('./config/passport');
const buildSession = require('./config/session');
const { csrfProtection } = require('./middleware/csrf');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp(mongoClient) {
  const app = express();

  // Behind a reverse proxy (nginx, load balancer) in production so req.ip / secure cookies work.
  if (env.isProd) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin: env.clientOrigins,
      credentials: true,
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    })
  );
  app.use(express.json({ limit: '10kb' }));
  if (!env.isProd) app.use(morgan('dev'));

  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  app.use('/api', apiLimiter);
  app.use(buildSession(mongoClient));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use('/api', csrfProtection);

  // Never cache authenticated API responses.
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.use('/api/auth', require('./routes/auth.routes'));
  app.use('/api/2fa', require('./routes/twoFactor.routes'));
  app.use('/api/sessions', require('./routes/session.routes'));
  app.use('/api/account', require('./routes/account.routes'));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
