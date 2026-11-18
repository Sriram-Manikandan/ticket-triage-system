// Middleware 4: central error handler. It has 4 parameters, which is how Express recognises it.
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status === 500) console.error(err); // log unexpected errors only
  res.status(status).json({ error: status === 500 ? 'Something went wrong on the server.' : err.message });
}

module.exports = errorHandler;
