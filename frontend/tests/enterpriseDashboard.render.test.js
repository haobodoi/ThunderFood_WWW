import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let server, Donut, Metric;
test.before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  ({ Donut, Metric } = await server.ssrLoadModule('/src/pages/admin/AdminHomePage.jsx'));
});
test.after(async () => server?.close());

test('donut exposes exact counts and percentages without chart data for an empty period', () => {
  const render = entries => renderToStaticMarkup(React.createElement(Donut, { title: 'Thanh toán', entries }));
  const result = render([{ label: 'COD', count: 3 }, { label: 'VietQR', count: 1 }]);
  assert.match(result, /75\.0%/);
  assert.match(result, /25\.0%/);
  assert.match(result, /aria-hidden="true"/);
  const empty = render([{ label: 'COD', count: 0 }, { label: 'VietQR', count: 0 }]);
  assert.ok(!empty.includes('NaN'));
  assert.match(empty, /0%/);
});
test('metrics describe the value and handle a zero comparison or percentage-point change', () => {
  const icon = () => React.createElement('svg');
  const render = props => renderToStaticMarkup(React.createElement(Metric, { label: 'Chỉ số', icon, description: 'Giải thích chỉ số', ...props }));
  assert.match(render({ value: 20, previous: 0 }), /Kỳ trước: 0/);
  assert.match(render({ value: 20, previous: 10 }), /\+100\.0%/);
  assert.match(render({ value: 20, previous: 10, points: true }), /\+10\.0 điểm %/);
  assert.match(render({ value: 1 }), /Giải thích chỉ số/);
});
