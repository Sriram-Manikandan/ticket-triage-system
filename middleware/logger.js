// Middleware 1: logs every request with its status code and duration.
function logger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next(); // pass control to the next middleware
}

module.exports = logger;
