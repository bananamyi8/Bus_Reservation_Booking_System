const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.post('/login', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!username || !password) return res.status(400).json({ error: 'Enter both username and password.' });
    const u = await User.findOne({ username });
    if (!u || !(await bcrypt.compare(password, u.passwordHash))) {
      return res.status(401).json({ error: 'Incorrect username or password.' });
    }
    const user = { id: u._id, username: u.username, name: u.name, role: u.role, contact: u.contact };
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user });
  } catch (e) { next(e); }
});

router.post('/register', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const name = String(req.body.name || '').trim();
    const contact = String(req.body.contact || '').trim();
    const password = String(req.body.password || '');
    if (name.length < 2) return res.status(400).json({ error: 'Enter your full name.' });
    if (!/^[0-9+\-\s]{7,15}$/.test(contact)) return res.status(400).json({ error: 'Enter a valid contact number (7 to 15 digits).' });
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) return res.status(400).json({ error: 'Username must be 3 to 30 letters, digits, dot, dash or underscore.' });
    if (password.length < 10) return res.status(400).json({ error: 'Password must be at least 10 characters.' });
    if (await User.findOne({ username })) return res.status(409).json({ error: 'That username is already taken.' });
    await User.create({ username, name, contact, role: 'passenger', passwordHash: await bcrypt.hash(password, 10) });
    res.status(201).json({ message: 'Account created.' });
  } catch (e) { next(e); }
});

router.post('/staff', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const name = String(req.body.name || '').trim();
    const password = String(req.body.password || '');
    const role = req.body.role === 'admin' ? 'admin' : 'staff';
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) return res.status(400).json({ error: 'Username must be 3 to 30 letters, digits, dot, dash or underscore.' });
    if (name.length < 2) return res.status(400).json({ error: 'Enter the staff member’s name.' });
    if (password.length < 10) return res.status(400).json({ error: 'Password must be at least 10 characters.' });
    if (await User.findOne({ username })) return res.status(409).json({ error: 'That username is already taken.' });
    const u = await User.create({ username, name, role, passwordHash: await bcrypt.hash(password, 10) });
    res.status(201).json({ id: u._id, username: u.username, name: u.name, role: u.role });
  } catch (e) { next(e); }
});

module.exports = router;
