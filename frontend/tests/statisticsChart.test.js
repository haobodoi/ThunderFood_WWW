import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChartModel, buildYAxis, chartRatio, formatAxisValue, formatChartValue, fullPeriod, parseDay, tickIndices, toChartUnits, tooltipPosition } from '../src/utils/statisticsChart.js';

const addDays = (day, n) => new Date(Date.parse(day) + n * 86400000).toISOString().slice(0, 10);
const fixture = (count, start = '2026-01-01') => Array.from({ length: count }, (_, i) => ({ period: addDays(start, i), revenue: (i + 1) * 125000, orders: i + 1 }));
const model = (data, money = true, extra = {}) => buildChartModel(data, money ? 'revenue' : 'orders', money, { from: data[0]?.period || '2026-01-01', to: data.at(-1)?.period || '2026-01-01', group: 'day', capacity: 50, ...extra });

for (const count of [1, 7, 30]) {
  test(`${count} daily values stay separate on desktop and mobile, including exact totals`, () => {
    const data = fixture(count);
    for (const capacity of [20, 60]) {
      const result = model(data, true, { capacity });
      assert.equal(result.points.length, count);
      assert.equal(result.total, BigInt(count * (count + 1) / 2 * 125000) * 100n);
      assert.equal(result.factor, 1);
      assert.equal(model(data, false, { capacity }).total, BigInt(count * (count + 1) / 2));
    }
  });
}
test('long ranges aggregate every day with the exact sum and correct partial last period', () => {
  const data = fixture(1096);
  const expected = data.reduce((sum, row) => sum + BigInt(row.revenue) * 100n, 0n);
  for (const capacity of [20, 40, 70]) {
    const result = model(data, true, { capacity });
    assert.ok(result.factor > 1);
    assert.ok(result.points.length <= capacity);
    assert.equal(result.points.reduce((sum, row) => sum + row.periods, 0), 1096);
    assert.equal(result.points.reduce((sum, row) => sum + row.units, 0n), expected);
    assert.equal(result.total, expected);
    assert.equal(result.points.at(-1).end, parseDay(data.at(-1).period));
  }
});
test('an absent day and an explicit null remain missing; zero is a known value', () => {
  const data = [{ period: '2026-01-01', revenue: 0 }, { period: '2026-01-03', revenue: null }, { period: '2026-01-04', revenue: '12500.50' }];
  const result = model(data);
  assert.deepEqual(result.points.map(p => p.units), [0n, null, null, 1250050n]);
  assert.equal(result.missing, 2);
  assert.equal(result.total, null);
});
test('a missing day inside a grouped column never becomes a full-period total', () => {
  const data = fixture(90).filter((_, i) => i !== 10);
  const result = model(data, true, { capacity: 15 });
  const incomplete = result.points.filter(p => p.missing);
  assert.equal(incomplete.length, 1);
  assert.equal(incomplete[0].units, null);
  assert.ok(incomplete[0].knownTotal > 0n);
  assert.equal(result.total, null);
});
test('empty series is distinct from a series of all zero values', () => {
  assert.equal(model([]).points.length, 0);
  const result = model(fixture(7).map(row => ({ ...row, revenue: 0 })));
  assert.equal(result.total, 0n);
  assert.ok(result.points.every(p => p.units === 0n));
  assert.equal(buildYAxis(result.points, true).ticks[0], 0n);
});
test('large currency strings and cent values retain their exact total and locale formatting', () => {
  const data = [{ period: '2026-01-01', revenue: '9007199254740991.11' }, { period: '2026-01-02', revenue: '0.89' }];
  const result = model(data);
  assert.equal(result.total, 900719925474099200n);
  assert.equal(formatChartValue(result.total, true), '9.007.199.254.740.992 ₫');
  assert.equal(formatChartValue(1250000000n, true), '12.500.000 ₫');
  assert.equal(formatChartValue(35n, false), '35 đơn');
  assert.equal(formatChartValue(1250050n, true), '12.500,50 ₫');
  const axis = buildYAxis(result.points, true);
  assert.ok(Number.isFinite(chartRatio(result.points[0].units, axis.top)));
});
test('invalid inputs, duplicate periods and fractional order counts are missing', () => {
  for (const value of [null, undefined, '', ' ', false, -1, NaN, Infinity, 'no-data']) assert.equal(toChartUnits(value, true), null);
  assert.equal(toChartUnits(1.5, false), null);
  assert.equal(toChartUnits(0, false), 0n);
  assert.equal(parseDay('2026-02-30'), null);
  const result = model([{ period: '2026-01-01', revenue: 10 }, { period: '2026-01-01', revenue: 20 }]);
  assert.equal(result.points[0].units, null);
});
test('order axes use integer ticks and start at zero across small and large counts', () => {
  for (const value of [0n, 1n, 7n, 35n, 100000000000000n]) {
    const axis = buildYAxis([{ units: value }], false);
    assert.equal(axis.ticks[0], 0n);
    assert.ok(axis.top >= value && axis.top > 0n);
    assert.ok(axis.ticks.every(tick => typeof tick === 'bigint'));
    assert.ok(axis.ticks.length <= 5);
  }
  assert.equal(formatAxisValue(2000000000n, true), '20 tr');
});
test('calendar groups honor partial weeks, leap days and month/year boundaries', () => {
  const week = model([{ period: '2026-10-26', revenue: 100 }, { period: '2026-11-02', revenue: 200 }], true, { from: '2026-11-01', to: '2026-11-04', group: 'week' });
  assert.equal(week.points.length, 2);
  assert.equal(fullPeriod(week.points[0]), '01/11/2026');
  assert.equal(fullPeriod(week.points[1]), '02/11/2026 – 04/11/2026');
  const leap = model([{ period: '2024-02-28', revenue: 10 }, { period: '2024-03-01', revenue: 20 }]);
  assert.equal(leap.points.length, 3);
  assert.equal(leap.points[1].period, '2024-02-29');
  assert.equal(model([{ period: '2025-12-01', revenue: 10 }, { period: '2026-01-01', revenue: 20 }], true, { from: '2025-12-10', to: '2026-01-20', group: 'month' }).total, 3000n);
});
test('tick density is bounded by available width and contains both ends without duplicates', () => {
  for (const width of [170, 240, 400, 650]) {
    const ticks = tickIndices(100, width);
    assert.equal(ticks[0], 0); assert.equal(ticks.at(-1), 99);
    assert.ok(ticks.length <= 7);
    assert.ok(ticks.length <= Math.max(2, Math.floor(width / 78)));
    assert.equal(new Set(ticks).size, ticks.length);
  }
  assert.deepEqual(tickIndices(1, 400), [0]);
});
test('tooltip stays inside narrow mobile and desktop viewports at every corner', () => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 1440, height: 900 }]) {
    const size = { width: 290, height: 106 };
    for (const anchor of [{ x: 0, y: 0 }, { x: viewport.width, y: viewport.height }, { x: viewport.width, y: 30 }, { x: 50, y: viewport.height - 20 }]) {
      const position = tooltipPosition(anchor, size, viewport);
      assert.ok(position.left >= 10 && position.left + size.width <= viewport.width - 10);
      assert.ok(position.top >= 10 && position.top + size.height <= viewport.height - 10);
    }
  }
});
