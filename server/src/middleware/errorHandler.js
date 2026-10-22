const AppError = require('../utils/AppError');
const env = require('../config/env');

function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err?.code === 11000) {
    err = new AppError('An account with this email already exists.', 409, 'EMAIL_TAKEN');
  }
  if (err?.type === 'entity.parse.failed') {
    err = new AppError('Malformed JSON body.', 400, 'BAD_JSON');
  }

  const status = err instanceof AppError ? err.status : 500;
  if (status >= 500) console.error('[error]', err);

  res.status(status).json({
    error: {
      message: status >= 500 && env.isProd ? 'Something went wrong.' : err.message,
      code: err.code && typeof err.code === 'string' ? err.code : 'SERVER_ERROR',
      ...(err.details ? { details: err.details } : {}),
    },
  });
}

module.exports = { notFound, errorHandler };
