const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sign in required.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

const requireAdmin = (req, res, next) =>
  req.user && req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Administrator access required.' });

const requireStaff = (req, res, next) =>
  req.user && ['staff', 'admin'].includes(req.user.role) ? next() : res.status(403).json({ error: 'Staff access required.' });

module.exports = { requireAuth, requireAdmin, requireStaff };