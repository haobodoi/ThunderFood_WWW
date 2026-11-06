import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let server, Charts;
test.before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  Charts = (await server.ssrLoadModule('/src/components/StatisticsCharts.jsx')).default;
});
test.after(async () => server?.close());
const range = { from: '2026-11-01', to: '2026-11-07', group: 'day' };
const render = props => renderToStaticMarkup(React.createElement(Charts, { range, ...props }));
const report = rows => ({ ...range, series: rows });

test('renders two equal-layout cards with the requested names', () => {
  const html = render({ report: report([]) });
  assert.equal((html.match(/statistics-card"/g) || []).length, 2);
  assert.ok(html.includes('Doanh thu gộp theo kỳ') && html.includes('Số đơn theo kỳ'));
  assert.equal((html.match(/Không có dữ liệu trong khoảng/g) || []).length, 2);
});
test('loading and error are separate states and errors expose retry', () => {
  const loading = render({ loading: true });
  assert.equal((loading.match(/Đang tải biểu đồ/g) || []).length, 2);
  assert.ok(!loading.includes('Không có dữ liệu'));
  const failure = render({ error: 'Mất kết nối' });
  assert.equal((failure.match(/Không tải được biểu đồ/g) || []).length, 2);
  assert.equal((failure.match(/Thử lại/g) || []).length, 2);
  assert.ok(!failure.includes('Đang tải'));
});
test('known zero values render zero markers and a zero total, not an empty state', () => {
  const rows = Array.from({ length: 7 }, (_, i) => ({ period: `2026-11-0${i + 1}`, revenue: 0, orders: 0 }));
  const html = render({ report: report(rows) });
  assert.ok(html.includes('0 ₫') && html.includes('0 đơn'));
  assert.ok(html.includes('statistics-chart__zero'));
  assert.ok(!html.includes('Không có dữ liệu'));
});
test('partial data has missing markers, hides uncertain totals, and keeps available values', () => {
  const html = render({ report: report([{ period: range.from, revenue: 12500000, orders: 35 }]) });
  assert.ok(html.includes('statistics-chart__missing'));
  assert.ok(!html.includes('statistics-card__total'));
  assert.ok(html.includes('12.500.000 ₫') && html.includes('35 đơn'));
});
test('displayed period and grouping follow the received dataset instead of unsubmitted filters', () => {
  const html = render({ range: { from: '2027-01-01', to: '2027-12-31', group: 'month' }, report: report([{ period: range.from, revenue: 10, orders: 1 }]) });
  assert.ok(html.includes('01/11/2026 – 07/11/2026'));
  assert.ok(!html.includes('2027'));
  assert.ok(html.includes('Theo ngày.'));
});
