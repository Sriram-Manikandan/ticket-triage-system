// Middleware 2: rejects bad input before it reaches the route handler or the LLM.
function validateTicket(req, res, next) {
  const { name, title, description } = req.body || {};

  const isBad = (v, max) => typeof v !== 'string' || v.trim() === '' || v.length > max;

  if (isBad(name, 100) || isBad(title, 200) || isBad(description, 2000)) {
    const err = new Error('name, title and description are required (max 100, 200, 2000 characters).');
    err.status = 400;
    return next(err); // jump to the error handler
  }
  next();
}

module.exports = validateTicket;
