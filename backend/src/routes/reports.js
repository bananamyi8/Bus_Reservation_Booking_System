const router = require('express').Router();
const Booking = require('../models/Booking');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { isValidDate } = require('../lib/validators');

router.get('/bookings', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!isValidDate(from) || !isValidDate(to)) return res.status(400).json({ error: 'Provide from and to dates as YYYY-MM-DD.' });
    if (from > to) return res.status(400).json({ error: 'The start date must come before the end date.' });
    const rows = await Booking.find({ travelDate: { $gte: from, $lte: to } }, 'travelDate status received').lean();
    const byDay = {};
    for (const b of rows) {
      const d = (byDay[b.travelDate] = byDay[b.travelDate] || { date: b.travelDate, active: 0, cancelled: 0, collected: 0 });
      if (b.status === 'Cancelled') d.cancelled++;
      else { d.active++; d.collected += b.received; }
    }
    const days = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
    const totals = days.reduce((t, d) => ({ active: t.active + d.active, cancelled: t.cancelled + d.cancelled, collected: t.collected + d.collected }), { active: 0, cancelled: 0, collected: 0 });
    res.json({ days, totals });
  } catch (e) { next(e); }
});

module.exports = router;
