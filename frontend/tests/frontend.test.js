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
