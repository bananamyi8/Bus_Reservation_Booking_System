const Logic = require('../js/logic');

describe('frontend', () => {
  test('F-T1 passenger form validation reports each problem and accepts valid input', () => {
    expect(Logic.validatePassenger({ name: '', contact: '12' })).toHaveLength(2);
    expect(Logic.validatePassenger({ name: 'Ana Reyes', contact: '0917 123 4567' })).toEqual([]);
  });

  test('F-T2 prices are shown in pesos with two decimals', () => {
    expect(Logic.formatPeso(650)).toBe('₱650.00');
    expect(Logic.formatPeso(undefined)).toBe('₱0.00');
  });

  test('F-T3 seat map marks taken seats and keeps the bus capacity', () => {
    const map = Logic.buildSeatMap(5, [2, 4]);
    expect(map).toHaveLength(5);
    expect(map.filter(s => s.taken).map(s => s.n)).toEqual([2, 4]);
    expect(map[0]).toEqual({ n: 1, taken: false });
  });
});

  test('F-T6 bus plan places every seat once, with a back bench when it fits', () => {
    const lay = Logic.layoutSeats(45, [3]);
    expect(lay.seats).toHaveLength(45);
    expect(new Set(lay.seats.map(s => s.c + '-' + s.r)).size).toBe(45);
    expect(lay.seats.every(s => s.r >= 1 && s.r <= 5 && s.c >= 2)).toBe(true);
    expect(lay.seats.find(s => s.n === 3).taken).toBe(true);
    const last = Math.max(...lay.seats.map(s => s.c));
    expect(lay.seats.filter(s => s.c === last)).toHaveLength(5);
    expect(Logic.layoutSeats(36).seats).toHaveLength(36);
  });