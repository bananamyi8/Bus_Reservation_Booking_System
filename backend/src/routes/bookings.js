const router = require('express').Router();
const crypto = require('crypto');
const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const { requireAuth, requireStaff } = require('../middleware/auth');
const V = require('../lib/validators');

router.use(requireAuth);
const badId = (req, res) => !mongoose.isValidObjectId(req.params.id) && res.status(400).json({ error: 'Invalid booking id.' });
const notYours = (req, b) => req.user.role === 'passenger' && String(b.userId) !== String(req.user.id);

router.post('/', async (req, res, next) => {
  try {
    const { tripId, travelDate } = req.body;
    const isCustomer = req.user.role === 'passenger';
    const body = req.body.passenger || {};
    const passenger = isCustomer
      ? { name: body.name || req.user.name, contact: body.contact || req.user.contact, type: body.type, idVerified: false }
      : body;
    const type = isCustomer ? 'Advance reservation' : req.body.type;
    const seats = Array.isArray(req.body.seats) ? req.body.seats : [];

    const errors = V.validatePassenger(passenger);
    if (!mongoose.isValidObjectId(tripId)) errors.push('Choose a trip.');
    if (!V.isValidDate(travelDate)) errors.push('Travel date must be YYYY-MM-DD.');
    else if (travelDate < V.todayPH()) errors.push('Travel date cannot be in the past.');
    if (!V.BOOKING_TYPES.includes(type)) errors.push('Choose walk-in or advance reservation.');
    errors.push(...V.validateSeats(seats, V.maxTickets(req.user.role)));
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });

    const trip = await Trip.findById(tripId);
    if (!trip || !trip.active) return res.status(404).json({ error: 'Trip not found or no longer active.' });
    if (trip.date && trip.date !== travelDate) return res.status(400).json({ error: `This trip only runs on ${trip.date}.` });
    if (seats.some(s => s > trip.capacity)) return res.status(400).json({ error: 'One of those seats does not exist on this bus.' });

    const nameKey = passenger.name.trim().toLowerCase();
    const dup = await Booking.findOne({ tripId, travelDate, status: 'Confirmed', 'passenger.nameKey': nameKey, 'passenger.contact': passenger.contact.trim() });
    if (dup) return res.status(409).json({ error: `Possible duplicate: ${passenger.name.trim()} already has booking ${dup.reference} on this trip. Cancel it first or ask staff.` });

    const groupId = crypto.randomUUID();
    const made = [];
    try {
      for (const seat of seats) {
        let created = null;
        for (let attempt = 0; attempt < 3 && !created; attempt++) {
          try {
            created = await Booking.create({
              reference: V.makeReference(travelDate), groupId, tripId, travelDate, seat, type, fare: trip.fare,
              createdBy: req.user.username,
              userId: isCustomer ? req.user.id : undefined,
              passenger: { name: passenger.name.trim(), nameKey, contact: passenger.contact.trim(), type: passenger.type || 'Adult', idVerified: passenger.idVerified === true }
            });
          } catch (e) {
            if (e.code !== 11000) throw e;
            if (!(e.keyPattern && e.keyPattern.reference)) {
              const err = new Error(`Seat ${seat} is already reserved or sold. Choose another seat.`);
              err.status = 409;
              throw err;
            }
          }
        }
        if (!created) throw new Error('Could not create a reference. Try again.');
        made.push(created);
      }
    } catch (e) {
      if (made.length) await Booking.deleteMany({ _id: { $in: made.map(b => b._id) } });
      if (e.status === 409) return res.status(409).json({ error: e.message });
      throw e;
    }
    res.status(201).json({ groupId, tickets: made, total: made.reduce((s, b) => s + b.fare, 0) });
  } catch (e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    const today = V.todayPH();

    if (req.user.role === 'passenger') {
      const mine = await Booking.find({ userId: req.user.id }).populate('tripId', 'origin destination time').sort({ travelDate: -1, createdAt: -1 }).limit(200).lean();
      const active = mine.filter(b => b.status === 'Confirmed');
      const upcoming = active.filter(b => b.travelDate >= today);
      return res.json({
        role: 'passenger',
        upcoming: upcoming.length,
        unpaid: upcoming.filter(b => b.payStatus !== 'Paid').length,
        cancelled: mine.length - active.length,
        bookings: mine
      });
    }

    const { reference, name } = req.query;
    let f;
    if (reference) f = { reference: String(reference).trim().toUpperCase() };
    else if (name && String(name).trim().length >= 2) f = { 'passenger.nameKey': new RegExp(V.escapeRegex(String(name).trim().toLowerCase())) };
    else return res.status(400).json({ error: 'Provide a booking reference or at least 2 letters of a passenger name.' });
    res.json(await Booking.find(f).populate('tripId', 'origin destination time').sort({ createdAt: -1 }).limit(50).lean());
  } catch (e) { next(e); }
});

router.patch('/group/:groupId/paid', requireStaff, async (req, res, next) => {
  try {
    const list = await Booking.find({ groupId: req.params.groupId, status: 'Confirmed' });
    if (!list.length) return res.status(404).json({ error: 'No active tickets found for this purchase.' });
    for (const b of list) { b.received = b.fare; b.payStatus = 'Paid'; await b.save(); }
    res.json({ tickets: list });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (badId(req, res)) return;
    const b = await Booking.findById(req.params.id).populate('tripId', 'origin destination time').lean();
    if (!b || notYours(req, b)) return res.status(404).json({ error: 'Booking not found.' });
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
    if (!b || notYours(req, b)) return res.status(404).json({ error: 'Booking not found.' });
    if (b.status === 'Cancelled') return res.status(400).json({ error: 'This booking is already cancelled.' });
    b.status = 'Cancelled';
    b.cancelReason = reason;
    await b.save();
    res.json(b);
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    if (badId(req, res)) return;
    const b = await Booking.findById(req.params.id);
    if (!b || notYours(req, b)) return res.status(404).json({ error: 'Booking not found.' });
    if (b.status === 'Cancelled') return res.status(400).json({ error: 'A cancelled booking cannot be edited.' });
    if (b.travelDate < V.todayPH()) return res.status(400).json({ error: 'This trip has already passed, so it cannot be edited.' });

    const name = String(req.body.name || '').trim();
    const contact = String(req.body.contact || '').trim();
    const ptype = req.body.type || 'Adult';
    const seat = Number(req.body.seat);
    const travelDate = req.body.travelDate;
    const errors = V.validatePassenger({ name, contact, type: ptype });
    if (!Number.isInteger(seat) || seat < 1) errors.push('Choose a seat.');
    if (!V.isValidDate(travelDate)) errors.push('Travel date must be YYYY-MM-DD.');
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });

    if (seat !== b.seat || travelDate !== b.travelDate) {
      if (travelDate < V.todayPH()) return res.status(400).json({ error: 'Travel date cannot be in the past.' });
      const trip = await Trip.findById(b.tripId);
      if (!trip || !trip.active) return res.status(404).json({ error: 'This trip is no longer active.' });
      if (trip.date && trip.date !== travelDate) return res.status(400).json({ error: `This trip only runs on ${trip.date}.` });
      if (seat > trip.capacity) return res.status(400).json({ error: 'That seat does not exist on this bus.' });
      const clash = await Booking.findOne({ _id: { $ne: b._id }, tripId: b.tripId, travelDate, seat, status: 'Confirmed' });
      if (clash) return res.status(409).json({ error: `Seat ${seat} is already taken on that date. Pick another seat.` });
    }

    b.passenger.name = name;
    b.passenger.nameKey = name.toLowerCase();
    b.passenger.contact = contact;
    b.passenger.type = ptype;
    b.seat = seat;
    b.travelDate = travelDate;
    try { await b.save(); } catch (e) {
      if (e.code === 11000) return res.status(409).json({ error: `Seat ${seat} is already taken on that date. Pick another seat.` });
      throw e;
    }
    if (req.body.applyAll === true && b.groupId) {
      await Booking.updateMany({ groupId: b.groupId, status: 'Confirmed' }, { $set: { 'passenger.name': name, 'passenger.nameKey': name.toLowerCase(), 'passenger.contact': contact, 'passenger.type': ptype } });
    }
    res.json(b);
  } catch (e) { next(e); }
});

module.exports = router;