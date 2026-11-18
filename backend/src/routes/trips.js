const router = require('express').Router();
const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateTrip, isValidDate, escapeRegex } = require('../lib/validators');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { origin, destination, date, includeInactive } = req.query;
    if (date && !isValidDate(date)) return res.status(400).json({ error: 'Travel date must be YYYY-MM-DD.' });
    const f = {};
    if (!(req.user.role === 'admin' && includeInactive === '1')) f.active = true;
    if (origin) f.origin = new RegExp('^' + escapeRegex(String(origin).trim()) + '$', 'i');
    if (destination) f.destination = new RegExp('^' + escapeRegex(String(destination).trim()) + '$', 'i');
    if (date) f.$or = [{ date }, { date: '' }, { date: { $exists: false } }];
    const trips = await Trip.find(f).sort({ time: 1 }).lean();
    const out = await Promise.all(trips.map(async t => ({
      ...t,
      seatsLeft: date ? t.capacity - await Booking.countDocuments({ tripId: t._id, travelDate: date, status: 'Confirmed' }) : undefined
    })));
    res.json(out);
  } catch (e) { next(e); }
});

router.get('/:id/seats', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid trip id.' });
    if (!isValidDate(req.query.date)) return res.status(400).json({ error: 'Travel date must be YYYY-MM-DD.' });
    const t = await Trip.findById(req.params.id).lean();
    if (!t) return res.status(404).json({ error: 'Trip not found.' });
    const taken = (await Booking.find({ tripId: t._id, travelDate: req.query.date, status: 'Confirmed' }, 'seat').lean()).map(b => b.seat);
    res.json({ capacity: t.capacity, taken });
  } catch (e) { next(e); }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const errors = validateTrip(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });
    const { origin, destination, time, capacity, fare, date } = req.body;
    const t = await Trip.create({
      origin: origin.trim(),
      destination: destination.trim(),
      time,
      capacity: Number(capacity),
      fare: Number(fare),
      date: String(date || '').trim()
    });
    res.status(201).json(t);
  } catch (e) { next(e); }
});

router.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid trip id.' });
    const t = await Trip.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Trip not found.' });
    if (Object.keys(req.body).length === 1 && typeof req.body.active === 'boolean') {
      t.active = req.body.active;
    } else {
      const merged = { origin: t.origin, destination: t.destination, time: t.time, capacity: t.capacity, fare: t.fare, date: t.date, ...req.body };
      const errors = validateTrip(merged);
      if (errors.length) return res.status(400).json({ error: errors.join(' ') });
      const top = await Booking.findOne({ tripId: t._id, status: 'Confirmed' }).sort({ seat: -1 }).lean();
      if (top && Number(merged.capacity) < top.seat) return res.status(400).json({ error: 'Capacity is below a seat that is already booked.' });
      Object.assign(t, {
        origin: String(merged.origin).trim(),
        destination: String(merged.destination).trim(),
        time: merged.time,
        capacity: Number(merged.capacity),
        fare: Number(merged.fare),
        date: String(merged.date || '').trim()
      });
    }
    await t.save();
    res.json(t);
  } catch (e) { next(e); }
});

module.exports = router;