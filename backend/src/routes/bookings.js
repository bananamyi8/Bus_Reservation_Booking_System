const router = require('express').Router();
const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const { requireAuth, requireStaff } = require('../middleware/auth');
const V = require('../lib/validators');


router.use(requireAuth);
const badId = (req, res) => !mongoose.isValidObjectId(req.params.id) && res.status(400).json({ error: 'Invalid booking id.' });

router.post('/', async (req, res, next) => {
  try {
    const { tripId, travelDate, seat } = req.body;
    const isCustomer = req.user.role === 'passenger';
    const passenger = isCustomer
    ? { name: req.user.name, contact: req.user.contact, type: (req.body.passenger || {}).type, idVerified: false }
    : (req.body.passenger || {});
    const type = isCustomer ? 'Advance reservation' : req.body.type;
    const errors = V.validatePassenger(passenger);
    if (!mongoose.isValidObjectId(tripId)) errors.push('Choose a trip.');
    if (!V.isValidDate(travelDate)) errors.push('Travel date must be YYYY-MM-DD.');
    else if (travelDate < V.todayPH()) errors.push('Travel date cannot be in the past.');
    if (!Number.isInteger(seat) || seat < 1) errors.push('Choose a seat.');
    if (!V.BOOKING_TYPES.includes(type)) errors.push('Choose walk-in or advance reservation.');
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });

    const trip = await Trip.findById(tripId);
    if (!trip || !trip.active) return res.status(404).json({ error: 'Trip not found or no longer active.' });
    if (seat > trip.capacity) return res.status(400).json({ error: 'That seat does not exist on this bus.' });
    if (trip.date && trip.date !== travelDate) return res.status(400).json({ error: `This trip only runs on ${trip.date}.` });
    
    const nameKey = passenger.name.trim().toLowerCase();
    const dup = await Booking.findOne({ tripId, travelDate, status: 'Confirmed', 'passenger.nameKey': nameKey, 'passenger.contact': passenger.contact.trim() });
    if (dup) return res.status(409).json({ error: `Possible duplicate: ${passenger.name.trim()} already has booking ${dup.reference} on this trip.` });

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const b = await Booking.create({
          reference: V.makeReference(travelDate), tripId, travelDate, seat, type, fare: trip.fare, createdBy: req.user.username, userId: isCustomer ? req.user.id : undefined,
          passenger: { name: passenger.name.trim(), nameKey, contact: passenger.contact.trim(), type: passenger.type || 'Adult', idVerified: passenger.idVerified === true }
        });
        return res.status(201).json(b);
      } catch (e) {
        if (e.code !== 11000) throw e;
        if (e.keyPattern && e.keyPattern.reference) continue;
        return res.status(409).json({ error: 'Seat already reserved or sold. Choose another seat.' });
      }
    }
    res.status(500).json({ error: 'Could not create a reference. Try again.' });
  } catch (e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    if (req.user.role === 'passenger') {
    return res.json(await Booking.find({ userId: req.user.id }).populate('tripId', 'origin destination time').sort({ createdAt: -1 }).limit(50).lean());
    }
    const { reference, name } = req.query;
    let f;
    if (reference) f = { reference: String(reference).trim().toUpperCase() };
    else if (name && String(name).trim().length >= 2) f = { 'passenger.nameKey': new RegExp(V.escapeRegex(String(name).trim().toLowerCase())) };
    else return res.status(400).json({ error: 'Provide a booking reference or at least 2 letters of a passenger name.' });
    res.json(await Booking.find(f).populate('tripId', 'origin destination time').sort({ createdAt: -1 }).limit(50).lean());
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (badId(req, res)) return;
    const b = await Booking.findById(req.params.id).populate('tripId', 'origin destination time').lean();
    if (!b) return res.status(404).json({ error: 'Booking not found.' });
    if (req.user.role === 'passenger' && String(b.userId) !== String(req.user.id)) return res.status(404).json({ error: 'Booking not found.' });
    res.json(b);
  } catch (e) { next(e); }
});

router.patch('/:id/payment', requireStaff, async (req, res, next) => {
  try {
    if (badId(req, res)) return;
    const b = await Booking.findById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Booking not found.' });
    if (b.status === 'Cancelled') return res.status(400).json({ error: 'A cancelled booking cannot take payment.' });
    const errors = V.validatePayment(req.body, b.fare);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });
    b.received = Number(req.body.received);
    b.payStatus = req.body.status;
    await b.save();
    res.json(b);
  } catch (e) { next(e); }
});

router.patch('/:id/cancel', async (req, res, next) => {
  try {
    if (badId(req, res)) return;
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 3) return res.status(400).json({ error: 'Enter a reason for the cancellation.' });
    const b = await Booking.findById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Booking not found.' });
    if (req.user.role === 'passenger' && String(b.userId) !== String(req.user.id)) return res.status(404).json({ error: 'Booking not found.' });
    if (b.status === 'Cancelled') return res.status(400).json({ error: 'This booking is already cancelled.' });
    b.status = 'Cancelled';
    b.cancelReason = reason;
    await b.save();
    res.json(b);
  } catch (e) { next(e); }
});

module.exports = router;
