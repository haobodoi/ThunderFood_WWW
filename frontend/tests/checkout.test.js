import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import test from 'node:test';
import api from '../src/api/baseApi.js';
import { prepareCheckout } from '../src/api/orderApi.js';

globalThis.crypto ??= webcrypto;

const preview = {
  cartId: 1,
  version: 2,
  totalAmount: 45000,
  items: [{ available: true, id: 3, lineTotal: 45000 }],
};

test('automatic and manual checkout retries reuse the original key and quote', async t => {
  const requests = [];
  const adapter = api.defaults.adapter;
  t.after(() => { api.defaults.adapter = adapter; });
  api.defaults.adapter = async config => {
    requests.push({ key: config.headers.get('Idempotency-Key'), body: JSON.parse(config.data) });
    if (requests.length < 3) throw new Error('connection lost');
    return { data: { orderId: 9 }, status: 201, headers: {}, config };
  };

  const form = { paymentMethod: 'COD', recipientName: 'Hoàng' };
  const checkout = prepareCheckout(preview, form);
  await assert.rejects(checkout(), /connection lost/);
  form.recipientName = 'New name';
  assert.deepEqual(await checkout(), { orderId: 9 });
  assert.match(requests[0].key, /^[0-9a-f-]{36}$/);
  assert.equal(requests[0].body.recipientName, 'Hoàng');
  assert.deepEqual(requests, [requests[0], requests[0], requests[0]]);
});

test('checkout leaves definitive errors for the caller to handle', async t => {
  const adapter = api.defaults.adapter;
  t.after(() => { api.defaults.adapter = adapter; });
  let requests = 0;
  const rejected = { response: { status: 409 } };
  api.defaults.adapter = async () => { requests++; throw rejected; };

  const checkout = prepareCheckout(preview, { paymentMethod: 'COD' });
  await assert.rejects(checkout(), error => error === rejected);
  assert.equal(requests, 1);
});
