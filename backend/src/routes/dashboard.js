const router = require('express').Router();
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const { requireAuth } = require('../middleware/auth');
const { todayPH } = require('../lib/validators');

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const today = todayPH();

    if (req.user.role === 'passenger') {
      const mine = await Booking.find({ userId: req.user.id }).populate('tripId', 'origin destination time').sort({ travelDate: 1 }).lean();
      const active = mine.filter(b => b.status === 'Confirmed');
      const upcoming = active.filter(b => b.travelDate >= today);
      return res.json({
        role: 'passenger',
        upcoming: upcoming.length,
        unpaid: upcoming.filter(b => b.payStatus !== 'Paid').length,
        cancelled: mine.length - active.length,
        next: upcoming.slice(0, 5)
      });
    }

    const active = await Booking.find({ status: 'Confirmed' }, 'tripId travelDate received payStatus').lean();
    const cancelled = await Booking.countDocuments({ status: 'Cancelled' });
    const todays = active.filter(b => b.travelDate === today);
    const trips = await Trip.find({ active: true, $or: [{ date: today }, { date: '' }, { date: { $exists: false } }] }).sort({ time: 1 }).lean();
    res.json({
      role: req.user.role,
      today,
      bookingsToday: todays.length,
      active: active.length,
      cancelled,
      unpaid: active.filter(b => b.travelDate >= today && b.payStatus !== 'Paid').length,
      collected: req.user.role === 'admin' ? active.reduce((s, b) => s + b.received, 0) : undefined,
      departures: trips.map(t => ({
        _id: t._id, origin: t.origin, destination: t.destination, time: t.time, fare: t.fare, capacity: t.capacity,
        seatsLeft: t.capacity - todays.filter(b => String(b.tripId) === String(t._id)).length
      }))
    });
  } catch (e) { next(e); }
});

module.exports = router;