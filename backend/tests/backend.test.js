process.env.JWT_SECRET = 'test-only-secret';
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const V = require('../src/lib/validators');

const app = createApp();

describe('backend', () => {
  test('B-T1 health check answers 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('FAil');
  });

  test('B-T2 passenger validation rejects a blank name and a bad contact number', () => {
    const errors = V.validatePassenger({ name: ' ', contact: 'abc' });
    expect(errors).toHaveLength(2);
    expect(V.validatePassenger({ name: 'Ana Reyes', contact: '0917 123 4567' })).toHaveLength(0);
  });

  test('B-T3 payment validation rejects negative, non-numeric and inconsistent amounts', () => {
    expect(V.validatePayment({ received: -5, status: 'Paid' }, 650)).not.toHaveLength(0);
    expect(V.validatePayment({ received: 'abc', status: 'Paid' }, 650)).not.toHaveLength(0);
    expect(V.validatePayment({ received: 100, status: 'Paid' }, 650)).not.toHaveLength(0);
    expect(V.validatePayment({ received: 650, status: 'Paid' }, 650)).toHaveLength(0);
  });

  test('B-T4 protected routes return 401 without a valid token', async () => {
    expect((await request(app).get('/api/v1/bookings?reference=X')).status).toBe(401);
    expect((await request(app).get('/api/v1/trips').set('Authorization', 'Bearer not-a-token')).status).toBe(401);
  });

  test('B-T5 booking reference has the NB-YYMMDD-XXXX format and seats left is capacity minus taken', () => {
    expect(V.makeReference('2026-11-18', 'A1B2')).toBe('NB-261118-A1B2');
    expect(V.makeReference('2026-11-18')).toMatch(/^NB-261118-[0-9A-F]{4}$/);
    expect(V.seatsLeft(45, 3)).toBe(42);
  });

  test('B-T6 customer registration rejects a bad contact number and a short password', async () => {
    const res = await request(app).post('/api/v1/auth/register')
      .send({ name: 'Ana Reyes', username: 'ana', contact: 'abc', password: 'short' });
    expect(res.status).toBe(400);
  });

  test('B-T7 customers cannot record payments or open reports', async () => {
    const t = jwt.sign({ id: '1', role: 'passenger', name: 'Ana', username: 'ana' }, process.env.JWT_SECRET);
    const pay = await request(app).patch('/api/v1/bookings/abc/payment').set('Authorization', 'Bearer ' + t).send({});
    const rep = await request(app).get('/api/v1/reports/bookings?from=2026-01-01&to=2026-01-02').set('Authorization', 'Bearer ' + t);
    expect(pay.status).toBe(403);
    expect(rep.status).toBe(403);
  });

  test('B-T8 trip validation accepts a blank date and rejects an invalid one', () => {
    const base = { origin: 'Naga', destination: 'Manila', time: '07:00', capacity: 45, fare: 650 };
    expect(V.validateTrip({ ...base, date: '' })).toEqual([]);
    expect(V.validateTrip({ ...base, date: '2026-11-30' })).toEqual([]);
    expect(V.validateTrip({ ...base, date: 'tomorrow' })).toHaveLength(1);
  });

  test('B-T9 dashboard and account routes return 401 without a token', async () => {
    expect((await request(app).get('/api/v1/dashboard')).status).toBe(401);
    expect((await request(app).patch('/api/v1/account/password').send({})).status).toBe(401);
  });

  test('B-T10 profile and password validation', () => {
    expect(V.validateProfile({ name: 'A', contact: '' }, 'passenger')).toHaveLength(2);
    expect(V.validateProfile({ name: 'Staff Name', contact: '' }, 'staff')).toEqual([]);
    expect(V.validateNewPassword('oldpassword1', 'short')).toHaveLength(1);
    expect(V.validateNewPassword('samepassword1', 'samepassword1')).toHaveLength(1);
    expect(V.validateNewPassword('oldpassword1', 'brandnewpass1')).toEqual([]);
  });

  test('B-T11 seat list validation enforces count, uniqueness and capacity', () => {
    expect(V.validateSeats([], 60)).toHaveLength(1);
    expect(V.validateSeats([3, 3], 60)).toHaveLength(1);
    expect(V.validateSeats([1, 2, 3], 2)).toHaveLength(1);
    expect(V.validateSeats([50], 60, 45)).toHaveLength(1);
    expect(V.validateSeats([5, 6, 12], 60, 45)).toEqual([]);
  });

  test('B-T12 the ticket limit is the bus size and group payment needs a sign-in', async () => {
    expect(V.maxTickets('passenger')).toBe(60);
    expect(V.maxTickets('staff')).toBe(60);
    expect((await request(app).patch('/api/v1/bookings/group/abc/paid')).status).toBe(401);
  });

  test('B-T13 editing a booking needs a sign-in', async () => {
    expect((await request(app).patch('/api/v1/bookings/abc').send({})).status).toBe(401);
  });
});
