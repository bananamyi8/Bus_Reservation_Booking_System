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

  if (typeof module !== 'undefined' && module.exports) module.exports = Logic;
  else root.Logic = Logic;
})(typeof window !== 'undefined' ? window : this);
