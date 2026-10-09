const { ZodError } = require('zod');

function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({
        message: errors[0]?.message || 'Invalid input',
        errors,
      });
    }
    req.body = parsed.data;
    next();
  };
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(400).json({ message: errors[0]?.message || 'Invalid input', errors });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({ message: `That ${field} is already in use` });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid id' });
  }

  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
  }
  return res.status(status).json({
    message: status >= 500 ? 'Something went wrong' : err.message,
    code: err.code && typeof err.code === 'string' ? err.code : undefined,
  });
}

module.exports = { validate, errorHandler };
