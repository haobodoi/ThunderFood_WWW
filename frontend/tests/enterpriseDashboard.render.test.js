import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let server, Donut, Metric, Breakdown, Settlement;
test.before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  ({ Donut, Metric } = await server.ssrLoadModule('/src/pages/admin/AdminHomePage.jsx'));
  ({ Breakdown, Settlement } = await server.ssrLoadModule('/src/pages/admin/ReportSections.jsx'));
});
test.after(async () => server?.close());

test('donut exposes exact counts and percentages without chart data for an empty period', () => {
  const render = entries => renderToStaticMarkup(React.createElement(Donut, { title: 'Thanh toán', entries }));
  const result = render([{ label: 'COD', count: 3 }, { label: 'VietQR', count: 1 }]);
  assert.match(result, /75,0%/);
  assert.match(result, /25,0%/);
  assert.match(result, /aria-hidden="true"/);
  const empty = render([{ label: 'COD', count: 0 }, { label: 'VietQR', count: 0 }]);
  assert.ok(!empty.includes('NaN'));
  assert.match(empty, /0%/);
});
test('metrics describe the value and handle a zero comparison or percentage-point change', () => {
  const icon = () => React.createElement('svg');
  const render = props => renderToStaticMarkup(React.createElement(Metric, { label: 'Chỉ số', icon, description: 'Giải thích chỉ số', ...props }));
  assert.match(render({ value: 20, previous: 0 }), /Kỳ trước: 0/);
  assert.match(render({ value: 20, previous: 10 }), /\+100,0%/);
  assert.match(render({ value: 20, previous: 10, points: true }), /\+10,0 điểm %/);
  assert.match(render({ value: 1 }), /Giải thích chỉ số/);
  assert.ok(!render({ value: 15.05, previous: 15.06, points: true }).includes('-0,0'));
});

test('order and payment breakdowns use order counts, with completed orders in green', () => {
  const html = renderToStaticMarkup(React.createElement(Breakdown, { report: {
    statuses: [{ status: 'COMPLETED', count: 3 }, { status: 'CANCELLED', count: 1 }],
    paymentMethods: [{ method: 'COD', count: 3, receipts: 999999 }, { method: 'ONLINE', count: 1, receipts: 1 }],
  } }));
  assert.match(html, /#168466/);
  assert.equal((html.match(/75,0%/g) || []).length, 2);
  assert.ok(!html.includes('999.999'));
  assert.match(html, /bao gồm đơn chưa thanh toán/);
});

test('settlement keeps food revenue, delivery fees and receipts separately labeled', () => {
  const html = renderToStaticMarkup(React.createElement(Settlement, { report: {
    current: { revenue: '90000.50', deliveryFees: '10000', receipts: '100000.50' },
    payments: [{ status: 'PAID', count: 2 }],
  } }));
  assert.match(html, /Doanh thu món<\/dt><dd>90\.000,5/);
  assert.match(html, /Phí giao hàng<\/dt><dd>10\.000/);
  assert.match(html, /Tổng thu đơn đã trả<\/dt><dd>100\.000,5/);
  assert.match(html, /Không gồm phí giao hàng/);
});
