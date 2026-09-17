const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'admin_token';

function requireAdmin(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.redirect('/admin/login');

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    res.clearCookie(COOKIE_NAME);
    return res.redirect('/admin/login');
  }
}

function signAdminToken(email) {
  return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '12h' });
}

module.exports = { requireAdmin, signAdminToken, COOKIE_NAME };
