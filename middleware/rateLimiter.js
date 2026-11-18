// Middleware 3: rate limiter built with a CLOSURE.
// createRateLimiter runs once. The returned function keeps using `hits`,
// which is private: nothing outside can read or change it.
function createRateLimiter(maxRequests, windowMs) {
  const hits = {}; // private state, captured by the closure: { ip: { count, start } }

  return function rateLimiter(req, res, next) {
    const ip = req.ip;
    const now = Date.now();

    if (!hits[ip] || now - hits[ip].start > windowMs) {
      hits[ip] = { count: 0, start: now }; // new window
    }
    hits[ip].count++;

    if (hits[ip].count > maxRequests) {
      const err = new Error('Too many tickets submitted. Please wait a minute.');
      err.status = 429;
      return next(err);
    }
    next();
  };
}

module.exports = createRateLimiter;
