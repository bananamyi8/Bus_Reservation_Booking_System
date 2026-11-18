require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { createApp } = require('./app');
const User = require('./models/User');
const Booking = require('./models/Booking');

async function ensureAdmin() {
  if (await User.estimatedDocumentCount() > 0) return;
  const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 10) {
    console.warn('No users exist. Set ADMIN_USERNAME and ADMIN_PASSWORD (10+ characters) to create the first administrator.');
    return;
  }
  await User.create({ username: ADMIN_USERNAME, name: 'Administrator', role: 'admin', passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10) });
  console.log('First administrator created.');
}

async function start() {
  for (const k of ['MONGODB_URI', 'JWT_SECRET']) {
    if (!process.env[k]) { console.error(`Missing environment variable ${k}`); process.exit(1); }
  }
  await mongoose.connect(process.env.MONGODB_URI);
  await Booking.syncIndexes();
  await ensureAdmin();
  const port = process.env.PORT || 5000;
  createApp().listen(port, () => console.log(`API listening on ${port}`));
}

start().catch(e => { console.error('Startup failed:', e.message); process.exit(1); });
