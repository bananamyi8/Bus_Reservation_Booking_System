const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
  app.use(express.json({ limit: '100kb' }));

  
app.use(cors({
  origin: "https://busbookandreserve.netlify.app",
  credentials: true
}));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    database: mongoose.connection.readyState === 1
      ? 'connected'
      : 'disconnected',
    time: new Date().toISOString()
  });
});

  app.use('/api/v1/auth', require('./routes/auth'));
  app.use('/api/v1/trips', require('./routes/trips'));
  app.use('/api/v1/bookings', require('./routes/bookings'));
  app.use('/api/v1/dashboard', require('./routes/dashboard'));
  app.use('/api/v1/account', require('./routes/account'));
  app.use('/api/v1/reports', require('./routes/reports'));

  app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof SyntaxError) return res.status(400).json({ error: 'Request body is not valid JSON.' });
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  });
  return app;
}

module.exports = { createApp };
