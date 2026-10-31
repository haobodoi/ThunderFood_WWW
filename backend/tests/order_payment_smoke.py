"""Integration tests for checkout, VietQR payment and order processing.

Same disposable setup as customer_features_smoke.py: DB 13317, API 18081.
Resets the disposable thunderfood schema. Never point the API at a real DB.
Run: python backend/tests/order_payment_smoke.py --reset-disposable-db
"""
import binascii
import concurrent.futures
import json
import sys
import threading
import time
import urllib.error
import urllib.request

from customer_features_smoke import ROOT, Session, check, sql

ORDER = {'recipientName': 'Nguyễn An', 'recipientPhone': '0900000004', 'deliveryAddress': '12 Nguyễn Huệ, TP. Hồ Chí Minh', 'note': 'Gọi trước khi giao'}
RESTAURANT = 1
ITEM, OTHER_ITEM = 1, 3

def tlv(value):
    fields, i = {}, 0
    while i < len(value):
        length = int(value[i+2:i+4])
        fields[value[i:i+2]] = value[i+4:i+4+length]
        i += 4 + length
    return fields

def fill(session, *items):
    """Empties the customer's cart for the restaurant, then adds items; returns the checkout preview."""
    cart = next(c for c in session.call('GET', '/customer/carts') if c['restaurant_id'] == RESTAURANT)
    cart = session.call('DELETE', f"/customer/carts/{cart['cart_id']}?version={cart['version']}")
    for item in items:
        cart = session.call('POST', '/customer/carts/items', {'itemId': item, 'quantity': 2, 'version': cart['version']})
    return session.call('GET', f"/customer/orders/checkout?cartId={cart['cart_id']}")

def body(preview, method='ONLINE', **changes):
    return {**ORDER, 'cartId': preview['cart_id'], 'version': preview['version'], 'expectedTotal': preview['total_amount'], 'paymentMethod': method, **changes}

def payment(order_id):
    return sql(f"USE thunderfood; SELECT provider,payment_status,paid_at IS NOT NULL FROM payments WHERE order_id={order_id};").split('\t')

class Stream:
    """Reads an SSE stream in the background; `events` collects the named order events."""
    def __init__(self, session, path):
        self.events = []
        request = urllib.request.Request('http://127.0.0.1:18081/api' + path, headers={'Accept': 'text/event-stream'})
        self.response = session.opener.open(request, timeout=15)
        threading.Thread(target=self.read, daemon=True).start()
        time.sleep(0.3)

    def read(self):
        try:
            for raw in self.response:
                line = raw.decode().strip()
                if line.startswith('data:'):
                    self.events.append(json.loads(line[5:]))
        except (OSError, ValueError):
            pass

    def wait(self, order_id, created=False, seconds=5):
        deadline = time.time() + seconds
        while time.time() < deadline:
            if {'orderId': order_id, 'created': created} in self.events:
                return True
            time.sleep(0.05)
        return False

def stream_status(session, path):
    request = urllib.request.Request('http://127.0.0.1:18081/api' + path)
    try:
        return session.opener.open(request, timeout=5).status
    except urllib.error.HTTPError as error:
        return error.code

def run():
    assert '--reset-disposable-db' in sys.argv, 'Explicit reset flag required'
    guard = sql('SELECT @@port, @@datadir;')
    assert '13317' in guard and '.test-runtime' in guard, 'Refusing non-disposable DB'
    sql((ROOT / 'backend/database/thunderfood_mariadb_v4.sql').read_text(encoding='utf-8'))
    sql("USE thunderfood; UPDATE restaurant_opening_hours SET open_time='00:00:00',close_time='23:59:59';")
    anon = Session()
    customer = Session('customer@example.com')
    partner = Session('partner@example.com')
    other_partner = Session('partner.pending@example.com')
    sql("USE thunderfood; INSERT INTO users(role_id,full_name,email,phone,password_hash) SELECT 1,'Other customer','orders.test@example.com','0900000098',password_hash FROM users WHERE user_id=4;")
    outsider = Session('orders.test@example.com')

    preview = fill(customer, ITEM, OTHER_ITEM)
    check(preview['online_available'] and preview['total_amount'] == preview['subtotal'] + preview['delivery_fee'], 'preview total is subtotal plus delivery fee')
    anon.call('GET', '/customer/orders', expected=401)
    partner.call('GET', '/customer/orders', expected=403)
    customer.call('GET', '/partner/orders', expected=403)
    customer.call('POST', '/customer/orders', body(preview), expected=403, csrf=False)
    outsider.call('POST', '/customer/orders', body(preview), expected=404)
    outsider.call('GET', f"/customer/orders/checkout?cartId={preview['cart_id']}", expected=404)
    check(True, 'order APIs enforce authentication, role, CSRF and cart ownership')

    customer.call('POST', '/customer/orders', body(preview, expectedTotal=1000), expected=400)
    customer.call('POST', '/customer/orders', body(preview, version=preview['version'] + 1), expected=409)
    customer.call('POST', '/customer/orders', body(preview, recipientPhone='123'), expected=400)
    customer.call('POST', '/customer/orders', body(preview, recipientName=' '), expected=400)
    customer.call('POST', '/customer/orders', body(preview, paymentMethod='BITCOIN'), expected=400)
    check(sql('USE thunderfood; SELECT COUNT(*) FROM orders;') == '1' and customer.call('GET', f"/customer/carts/{preview['cart_id']}")['version'] == preview['version'], 'rejected checkouts create no order and leave the cart untouched')

    other_tab = Session('customer@example.com')
    def race(session):
        try:
            return session.call('POST', '/customer/orders', body(preview), expected=201)
        except AssertionError as error:
            assert error.args[0][2] == 409, error
            return None
    with concurrent.futures.ThreadPoolExecutor(2) as pool:
        results = list(pool.map(race, [customer, other_tab]))
    created = [r for r in results if r]
    check(len(created) == 1 and sql('USE thunderfood; SELECT COUNT(*) FROM orders;') == '2', 'double submit creates exactly one order')
    order = created[0]
    check(customer.call('GET', f"/customer/carts/{preview['cart_id']}")['items'] == [], 'ordered lines leave the cart')
    check(len(order['items']) == 2 and order['total_amount'] == preview['total_amount'] and order['payment_status'] == 'UNPAID' and order['order_status'] == 'PENDING', 'order snapshot keeps lines and server-computed total')

    qr = order['qr']
    fields = tlv(qr['payload'])
    merchant = tlv(fields['38'])
    beneficiary = tlv(merchant['01'])
    check((fields['00'], fields['01'], fields['53'], fields['58']) == ('01', '12', '704', 'VN'), 'QR header is a dynamic VND EMVCo code')
    check((merchant['00'], merchant['02'], beneficiary['00'], beneficiary['01']) == ('A000000727', 'QRIBFTTA', '970436', '0123456789'), 'QR targets the Vietcombank account the restaurant registered')
    check(int(fields['54']) == order['total_amount'] and tlv(fields['62'])['08'] == order['order_code'].replace('-', '') == qr['content'], 'QR amount and transfer content match the order')
    check(fields['63'] == '%04X' % binascii.crc_hqx(qr['payload'][:-4].encode(), 0xFFFF), 'QR CRC verified by an independent implementation')
    check(payment(order['order_id'])[:2] == ['VIETQR', 'PENDING'], 'VietQR payment row starts pending')

    oid = order['order_id']
    outsider.call('GET', f'/customer/orders/{oid}', expected=404)
    outsider.call('POST', f'/customer/orders/{oid}/cancel', {'reason': 'Not my order at all'}, expected=404)
    other_partner.call('POST', f'/partner/orders/{oid}/confirm-payment', expected=404)
    other_partner.call('PATCH', f'/partner/orders/{oid}/status', {'status': 'REJECTED', 'reason': 'Not my restaurant'}, expected=404)
    check(all(o['order_id'] != oid for o in other_partner.call('GET', '/partner/orders')['items']), 'other customers and partners cannot reach the order')

    partner.call('PATCH', f'/partner/orders/{oid}/status', {'status': 'CONFIRMED'}, expected=400)
    partner.call('PATCH', f'/partner/orders/{oid}/status', {'status': 'COMPLETED'}, expected=400)
    check(True, 'unpaid VietQR order cannot be confirmed or skipped ahead')
    listed = next(o for o in partner.call('GET', '/partner/orders?status=PENDING')['items'] if o['order_id'] == oid)
    check(listed['transfer_content'] == qr['content'], 'partner sees the transfer content to reconcile')
    partner.call('GET', '/partner/orders?status=NOPE', expected=400)
    partner.call('POST', f'/partner/orders/{oid}/confirm-payment')
    paid = customer.call('GET', f'/customer/orders/{oid}')
    check(paid['payment_status'] == 'PAID' and paid['order_status'] == 'CONFIRMED' and paid['qr'] is None and payment(oid) == ['VIETQR', 'SUCCESS', '1'], 'confirming receipt marks paid, accepts the order and retires the QR')
    partner.call('POST', f'/partner/orders/{oid}/confirm-payment', expected=400)
    customer.call('POST', f'/customer/orders/{oid}/cancel', {'reason': 'Changed my mind'}, expected=400)
    check(True, 'payment cannot be confirmed twice and a paid order cannot be self-cancelled')

    partner.call('PATCH', f'/partner/orders/{oid}/status', {'status': 'DELIVERING'}, expected=400)
    for status in ['PREPARING', 'DELIVERING', 'COMPLETED']:
        partner.call('PATCH', f'/partner/orders/{oid}/status', {'status': status})
    partner.call('PATCH', f'/partner/orders/{oid}/status', {'status': 'REJECTED', 'reason': 'Too late to reject'}, expected=400)
    check(customer.call('GET', f'/customer/orders/{oid}')['completed_at'] is not None, 'status moves one step at a time up to completed')
    eligible = customer.call('GET', f'/customer/reviews/eligibility?restaurantId={RESTAURANT}')['orders']
    check(any(o['order_id'] == oid for o in eligible), 'completed order unlocks the review flow')

    cod = customer.call('POST', '/customer/orders', body(fill(customer, ITEM), 'COD'), expected=201)
    check(cod['qr'] is None and payment(cod['order_id'])[:2] == ['COD', 'PENDING'], 'COD order has no QR')
    partner.call('PATCH', f"/partner/orders/{cod['order_id']}/status", {'status': 'CONFIRMED'})
    for status in ['PREPARING', 'DELIVERING', 'COMPLETED']:
        partner.call('PATCH', f"/partner/orders/{cod['order_id']}/status", {'status': status})
    check(customer.call('GET', f"/customer/orders/{cod['order_id']}")['payment_status'] == 'PAID' and payment(cod['order_id']) == ['COD', 'SUCCESS', '1'], 'COD is settled on completion')

    cancelled = customer.call('POST', '/customer/orders', body(fill(customer, ITEM)), expected=201)
    customer.call('POST', f"/customer/orders/{cancelled['order_id']}/cancel", {'reason': 'x'}, expected=400)
    result = customer.call('POST', f"/customer/orders/{cancelled['order_id']}/cancel", {'reason': 'Changed my mind'})
    check(result['order_status'] == 'CANCELLED' and result['qr'] is None and result['cancel_reason'] == 'Changed my mind' and payment(cancelled['order_id'])[1] == 'FAILED', 'customer cancel retires the QR and records the reason')
    customer.call('POST', f"/customer/orders/{cancelled['order_id']}/cancel", {'reason': 'Changed my mind'}, expected=400)
    partner.call('POST', f"/partner/orders/{cancelled['order_id']}/confirm-payment", expected=400)
    check(True, 'cancelled order cannot be cancelled again or paid')

    rejected = customer.call('POST', '/customer/orders', body(fill(customer, ITEM)), expected=201)
    rid = rejected['order_id']
    partner.call('POST', f'/partner/orders/{rid}/refund', expected=400)
    partner.call('POST', f'/partner/orders/{rid}/confirm-payment')
    partner.call('PATCH', f'/partner/orders/{rid}/status', {'status': 'REJECTED'}, expected=400)
    partner.call('PATCH', f'/partner/orders/{rid}/status', {'status': 'REJECTED', 'reason': 'Out of ingredients'})
    check(customer.call('GET', f'/customer/orders/{rid}')['payment_status'] == 'PAID', 'rejecting a paid order keeps it owing a refund')
    partner.call('POST', f'/partner/orders/{rid}/refund')
    check(customer.call('GET', f'/customer/orders/{rid}')['payment_status'] == 'REFUNDED' and payment(rid) == ['VIETQR', 'REFUNDED', '1'], 'refund is recorded and the payment time is kept')
    partner.call('POST', f'/partner/orders/{rid}/refund', expected=400)

    preview = fill(customer, ITEM, OTHER_ITEM)
    sql(f'USE thunderfood; UPDATE menu_items SET price=price+1000 WHERE item_id={ITEM};')
    customer.call('POST', '/customer/orders', body(preview), expected=400)
    check(True, 'price change after viewing the total blocks checkout')
    preview = customer.call('GET', f"/customer/orders/checkout?cartId={preview['cart_id']}")
    sql(f'USE thunderfood; UPDATE menu_items SET is_available=0 WHERE item_id={ITEM};')
    preview = customer.call('GET', f"/customer/orders/checkout?cartId={preview['cart_id']}")
    partial = customer.call('POST', '/customer/orders', body(preview, 'COD'), expected=201)
    remaining = customer.call('GET', f"/customer/carts/{preview['cart_id']}")['items']
    check([i['item_id'] for i in partial['items']] == [OTHER_ITEM] and [i['item_id'] for i in remaining] == [ITEM], 'unavailable lines stay in the cart and are not ordered')
    preview = customer.call('GET', f"/customer/orders/checkout?cartId={preview['cart_id']}")
    customer.call('POST', '/customer/orders', body(preview, 'COD'), expected=400)
    check(True, 'cart with nothing orderable cannot be checked out')
    sql(f'USE thunderfood; UPDATE menu_items SET is_available=1 WHERE item_id={ITEM};')

    preview = fill(customer, ITEM)
    sql(f'USE thunderfood; UPDATE restaurants SET is_open=0 WHERE restaurant_id={RESTAURANT};')
    customer.call('POST', '/customer/orders', body(customer.call('GET', f"/customer/orders/checkout?cartId={preview['cart_id']}")), expected=400)
    check(True, 'closed restaurant cannot receive orders')
    sql(f'USE thunderfood; UPDATE restaurants SET is_open=1 WHERE restaurant_id={RESTAURANT};')

    waiting = customer.call('POST', '/customer/orders', body(fill(customer, ITEM)), expected=201)
    sql(f"USE thunderfood; UPDATE restaurants SET bank_name='Ngân hàng lạ' WHERE restaurant_id={RESTAURANT};")
    preview = fill(customer, ITEM)
    check(not preview['online_available'], 'bank without a BIN disables VietQR at checkout')
    customer.call('POST', '/customer/orders', body(preview), expected=400)
    customer.call('POST', '/customer/orders', body(preview, 'COD'), expected=201)
    check(customer.call('GET', f"/customer/orders/{waiting['order_id']}")['qr'] is None, 'existing order stays readable without a QR after the bank changes')

    sql(f"USE thunderfood; UPDATE restaurants SET bank_name='Vietcombank' WHERE restaurant_id={RESTAURANT};")
    check((stream_status(anon, '/customer/orders/events'), stream_status(partner, '/customer/orders/events'), stream_status(customer, '/partner/orders/events')) == (401, 403, 403), 'event streams enforce authentication and role')
    customer_stream = Stream(customer, '/customer/orders/events')
    partner_stream = Stream(partner, '/partner/orders/events')
    other_customer_stream = Stream(outsider, '/customer/orders/events')
    other_partner_stream = Stream(other_partner, '/partner/orders/events')
    live = customer.call('POST', '/customer/orders', body(fill(customer, ITEM)), expected=201)
    lid = live['order_id']
    check(customer_stream.wait(lid, created=True) and partner_stream.wait(lid, created=True), 'new order reaches its customer and restaurant owner')
    partner.call('POST', f'/partner/orders/{lid}/confirm-payment')
    check(customer_stream.wait(lid) and partner_stream.wait(lid), 'payment confirmation is pushed to both sides')
    check(customer.call('GET', f'/customer/orders/{lid}')['order_status'] == 'CONFIRMED', 'event is sent after commit, so a reload sees the new status')
    count = len(customer_stream.events)
    partner.call('PATCH', f'/partner/orders/{lid}/status', {'status': 'COMPLETED'}, expected=400)
    time.sleep(0.5)
    check(len(customer_stream.events) == count, 'rejected change sends no event')
    partner.call('PATCH', f'/partner/orders/{lid}/status', {'status': 'REJECTED', 'reason': 'Out of ingredients'})
    partner.call('POST', f'/partner/orders/{lid}/refund')
    check(len(customer_stream.events) == count + 2, 'reject and refund are pushed')
    check(other_customer_stream.events == [] and other_partner_stream.events == [], 'other accounts receive no events')
    extra = [Stream(customer, '/customer/orders/events') for _ in range(5)]
    cancelled_live = customer.call('POST', '/customer/orders', body(fill(customer, ITEM)), expected=201)
    check(extra[-1].wait(cancelled_live['order_id'], created=True) and not customer_stream.wait(cancelled_live['order_id'], created=True, seconds=1), 'oldest stream is closed past the per-user limit')

    sql("USE thunderfood; UPDATE users SET account_status='LOCKED' WHERE email='orders.test@example.com';")
    outsider.call('GET', '/customer/orders', expected=400)
    check(True, 'fresh account status checked after session login')
    print('All order and payment checks passed.')

if __name__ == '__main__':
    run()
