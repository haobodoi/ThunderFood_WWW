import test from 'node:test';
import assert from 'node:assert/strict';
import { reportRangeError } from '../src/utils/reportRange.js';

test('report dates must be present, real, ordered and within the API year limits', () => {
  for (const range of [
    { from: '', to: '2026-11-19' },
    { from: '2026-02-30', to: '2026-03-01' },
    { from: '2026-11-19', to: '2026-11-18' },
    { from: '1799-12-31', to: '1800-01-01' },
    { from: '2200-12-31', to: '2201-01-01' },
  ]) assert.ok(reportRangeError(range));
  assert.equal(reportRangeError({ from: '2026-11-19', to: '2026-11-19' }), '');
});

test('the inclusive 1096-day limit counts leap days correctly', () => {
  assert.equal(reportRangeError({ from: '2024-01-01', to: '2026-12-31' }), '');
  assert.match(reportRangeError({ from: '2024-01-01', to: '2027-01-01' }), /1\.096/);
});

test('a valid current period also needs a supported previous comparison period', () => {
  assert.ok(reportRangeError({ from: '1800-01-01', to: '1800-01-01' }));
  assert.ok(reportRangeError({ from: '1800-01-02', to: '1800-01-03' }));
  assert.equal(reportRangeError({ from: '1800-01-02', to: '1800-01-02' }), '');
  assert.equal(reportRangeError({ from: '1800-01-03', to: '1800-01-04' }), '');
});
