const AppError = require('../utils/AppError');

/** Validate req.body against a zod schema; replaces body with the parsed value. */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    return next(new AppError(Object.values(fields)[0] || 'Invalid input.', 400, 'VALIDATION_ERROR', { fields }));
  }
  req.body = result.data;
  return next();
};

module.exports = validate;
