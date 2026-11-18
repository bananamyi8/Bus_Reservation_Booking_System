const crypto = require('crypto');

const PASSENGER_TYPES = ['Adult', 'Student', 'Senior', 'PWD'];
const BOOKING_TYPES = ['Walk-in', 'Advance reservation'];
const PAY_STATUSES = ['Unpaid', 'Partial', 'Paid'];

function validatePassenger(p = {}) {
  const e = [];
  if (String(p.name || '').trim().length < 2) e.push('Passenger name must be at least 2 characters.');
  if (!/^[0-9+\-\s]{7,15}$/.test(String(p.contact || '').trim())) e.push('Contact number must have 7 to 15 digits.');
  if (p.type && !PASSENGER_TYPES.includes(p.type)) e.push('Passenger type is not recognised.');
  return e;
}

function validatePayment(b = {}, fare = 0) {
  const raw = b.received;
  const n = Number(raw);
  if (raw === '' || raw === null || raw === undefined || typeof raw === 'boolean' || Number.isNaN(n) || n < 0) {
    return ['Amount received must be a number, 0 or more.'];
  }
  if (!PAY_STATUSES.includes(b.status)) return ['Payment status must be Unpaid, Partial or Paid.'];
  if (b.status === 'Paid' && n < fare) return ['Paid needs an amount of at least the fare.'];
  if (b.status === 'Unpaid' && n > 0) return ['Amount received is above 0, so choose Partial or Paid.'];
  return [];
}

function validateTrip(t = {}) {
  const e = [];
  const o = String(t.origin || '').trim(), d = String(t.destination || '').trim();
  if (!o || !d) e.push('Origin and destination are required.');
  else if (o.toLowerCase() === d.toLowerCase()) e.push('Origin and destination must be different.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(t.time || ''))) e.push('Departure time must be HH:MM.');
  const cap = Number(t.capacity);
  if (!Number.isInteger(cap) || cap < 1 || cap > 60) e.push('Capacity must be a whole number from 1 to 60.');
  const fare = Number(t.fare);
  if (t.fare === '' || t.fare === null || t.fare === undefined || Number.isNaN(fare) || fare < 0) e.push('Fare must be a number, 0 or more.');
  if (t.date && !isValidDate(t.date)) e.push('Trip date must be a valid date.');
  return e;
}

function isValidDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && !Number.isNaN(Date.parse(s));
}

function todayPH() {
  return new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
}

function makeReference(travelDate, suffix) {
  const s = suffix || crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
  return 'NB-' + travelDate.slice(2).replace(/-/g, '') + '-' + s;
}

function validateProfile(p = {}, role = 'staff') {
  const e = [];
  if (String(p.name || '').trim().length < 2) e.push('Enter your full name.');
  const c = String(p.contact || '').trim();
  if ((role === 'passenger' || c) && !/^[0-9+\-\s]{7,15}$/.test(c)) e.push('Contact number must have 7 to 15 digits.');
  return e;
}

function validateNewPassword(current, next) {
  const e = [];
  if (String(next || '').length < 10) e.push('New password must be at least 10 characters.');
  else if (next === current) e.push('New password must be different from the current one.');
  return e;
}

const seatsLeft = (capacity, taken) => capacity - taken;
const escapeRegex = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = {
  PASSENGER_TYPES, BOOKING_TYPES, PAY_STATUSES,
    validatePassenger, validatePayment, validateTrip, validateProfile, validateNewPassword, isValidDate, todayPH, makeReference, seatsLeft, escapeRegex
};
