// Pure helpers with no DOM access, so they can be unit tested.
(function (root) {
  const Logic = {};

  Logic.validatePassenger = function (p) {
    const errors = [];
    if (!p || String(p.name || '').trim().length < 2) errors.push('Enter the passenger’s full name.');
    if (!/^[0-9+\-\s]{7,15}$/.test(String((p && p.contact) || '').trim())) errors.push('Enter a valid contact number (7 to 15 digits).');
    return errors;
  };

  Logic.validateSearch = function (q, today) {
    const errors = [];
    if (!q.origin || !q.origin.trim() || !q.destination || !q.destination.trim()) errors.push('Enter both origin and destination.');
    else if (q.origin.trim().toLowerCase() === q.destination.trim().toLowerCase()) errors.push('Origin and destination must be different.');
    if (!q.date) errors.push('Choose a travel date.');
    else if (q.date < today) errors.push('Travel date cannot be in the past.');
    return errors;
  };

  Logic.formatPeso = function (n) {
    return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  Logic.buildSeatMap = function (capacity, taken) {
    return Array.from({ length: capacity }, (_, i) => ({ n: i + 1, taken: taken.includes(i + 1) }));
  };

  Logic.defaultBookingType = function (travelDate, today) {
    return travelDate > today ? 'Advance reservation' : 'Walk-in';
  };

  Logic.maxTickets = function () { return 60; };

  Logic.validateQuantity = function (q, max) {
    const n = Number(q);
    if (!Number.isInteger(n) || n < 1) return 'Enter how many tickets, at least 1.';
    if (n > max) return 'You can book at most ' + max + ' tickets at a time.';
    return '';
  };

  // Turns "5, 6 12" into [5, 6, 12] and checks the numbers fit the bus.
  Logic.parseSeatList = function (text, capacity) {
    const parts = String(text || '').split(/[\s,]+/).filter(Boolean);
    if (!parts.length) return { seats: [], error: 'Type at least one seat number.' };
    const seats = parts.map(Number);
    if (seats.some(n => !Number.isInteger(n) || n < 1 || n > capacity)) return { seats: [], error: 'Seat numbers must be whole numbers from 1 to ' + capacity + '.' };
    if (new Set(seats).size !== seats.length) return { seats: [], error: 'Each seat can only be listed once.' };
    return { seats, error: '' };
  };

  // Top-down bus plan: front on the left. Lanes 1-2 and 4-5 hold seats, lane 3 is the aisle.
  // c is the grid column (column 1 is the driver), r is the lane. A 5-seat back bench is used when the capacity fits.
  Logic.layoutSeats = function (capacity, taken) {
    taken = taken || [];
    const bench = capacity >= 9 && (capacity - 5) % 4 === 0;
    const regular = bench ? capacity - 5 : capacity;
    const lanes = [1, 2, 4, 5];
    const seats = [];
    for (let i = 0; i < regular; i++) {
      seats.push({ n: i + 1, c: 2 + Math.floor(i / 4), r: lanes[i % 4], taken: taken.includes(i + 1) });
    }
    if (bench) {
      const c = 2 + Math.ceil(regular / 4);
      for (let k = 0; k < 5; k++) seats.push({ n: regular + k + 1, c, r: k + 1, taken: taken.includes(regular + k + 1) });
    }
    return { seats, cols: Math.ceil(regular / 4) + (bench ? 1 : 0) };
  };

    Logic.validateBookingEdit = function (f, today) {
    const errors = Logic.validatePassenger({ name: f.name, contact: f.contact });
    if (!f.date) errors.push('Choose a travel date.');
    else if (f.date < today) errors.push('Travel date cannot be in the past.');
    if (!Number.isInteger(f.seat) || f.seat < 1) errors.push('Choose a seat.');
    return errors;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Logic;
  else root.Logic = Logic;
})(typeof window !== 'undefined' ? window : this);