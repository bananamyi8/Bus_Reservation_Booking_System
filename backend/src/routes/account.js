const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { validateProfile, validateNewPassword } = require('../lib/validators');

const publicUser = u => ({ id: u._id, username: u.username, name: u.name, role: u.role, contact: u.contact });
const issue = u => jwt.sign(publicUser(u), process.env.JWT_SECRET, { expiresIn: '8h' });

router.use(requireAuth);

router.patch('/profile', async (req, res, next) => {
  try {
    const u = await User.findById(req.user.id);
    if (!u) return res.status(404).json({ error: 'Account not found.' });
    const errors = validateProfile(req.body, u.role);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });
    u.name = String(req.body.name).trim();
    u.contact = String(req.body.contact || '').trim();
    await u.save();
    res.json({ token: issue(u), user: publicUser(u) });
  } catch (e) { next(e); }
});

router.patch('/password', async (req, res, next) => {
  try {
    const { current, next: newPass } = req.body;
    const u = await User.findById(req.user.id);
    if (!u) return res.status(404).json({ error: 'Account not found.' });
    if (!current || !(await bcrypt.compare(String(current), u.passwordHash))) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
    const errors = validateNewPassword(String(current), String(newPass || ''));
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });
    u.passwordHash = await bcrypt.hash(String(newPass), 10);
    await u.save();
    res.json({ message: 'Password changed.' });
  } catch (e) { next(e); }
});

module.exports = router;