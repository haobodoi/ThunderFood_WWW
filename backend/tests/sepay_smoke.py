"""Verify signed SePay callbacks against the disposable order API and MariaDB."""
import concurrent.futures
import hashlib
import hmac
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from customer_features_smoke import API_PORT, DB_PORT, ROOT, Session, check, sql
from order_payment_smoke import ITEM, Stream, body, fill

ACCOUNT = '0123456789'
SECRET = os.environ.get('SEPAY_WEBHOOK_SECRET', '').encode()


def transaction(order, transaction_id):
    return {
        'id': transaction_id,
        'gateway': 'MBBank',
        'transactionDate': datetime.now(ZoneInfo('Asia/Ho_Chi_Minh')).strftime('%Y-%m-%d %H:%M:%S'),
        'accountNumber': ACCOUNT,
        'subAccount': '',
        'code': None,
        'content': f"Thanh toán {order['qr']['content']} qua ngân hàng",
        'transferType': 'in',
        'transferAmount': order['totalAmount'],
        'referenceCode': 'TEST-' + str(transaction_id),
    }


def webhook(payload, expected=200, key=SECRET, seconds_ago=0):
    raw = json.dumps(payload, ensure_ascii=False, indent=2).encode()
    timestamp = str(int(time.time()) - seconds_ago)
    headers = {'Content-Type': 'application/json'}
    if key is not None:
        digest = hmac.new(key, timestamp.encode() + b'.' + raw, hashlib.sha256).hexdigest()
        headers.update({'X-SePay-Timestamp': timestamp, 'X-SePay-Signature': 'sha256=' + digest})
    request = urllib.request.Request(f'http://127.0.0.1:{API_PORT}/api/webhooks/sepay', raw, headers)
    try:
        response = urllib.request.urlopen(request, timeout=15)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        result = json.load(response)
        assert response.status == expected and result == {'success': expected == 200}, (response.status, result)


def run():
    assert '--reset-disposable-db' in sys.argv and SECRET, 'Disposable DB flag and SePay test secret required'
    guard = sql('SELECT @@port, @@datadir;')
    assert DB_PORT in guard and '.test-runtime' in guard, 'Refusing non-disposable DB'
    for migration in ['thunderfood_mariadb_v4.sql', 'migrations/V5__admin.sql', 'migrations/V6__sepay.sql']:
        sql((ROOT / 'backend/database' / migration).read_text(encoding='utf-8'))
    sql("""USE thunderfood;
        UPDATE restaurant_opening_hours SET open_time='00:00:00',close_time='23:59:59';
        UPDATE restaurants SET bank_name='MB Bank',bank_account_number='0123456789' WHERE restaurant_id=1;
        """)
    customer = Session('customer@example.com')
    partner = Session('partner@example.com')
    admin = Session('admin@thunderfood.vn')

    def checkout(method='ONLINE'):
        return customer.call('POST', '/customer/orders', body(fill(customer, ITEM), method), expected=201)

    def get(order):
        return customer.call('GET', f"/customer/orders/{order['orderId']}")

    order = checkout()
    check(order['qr']['automatic'] and order['qr']['accountNumber'] == ACCOUNT, 'checkout designates the linked account for SePay')
    payload = transaction(order, 10001)
    webhook(payload, expected=401, key=None)
    webhook(payload, expected=401, key=b'wrong-key')
    webhook(payload, expected=401, seconds_ago=301)
    webhook({**payload, 'id': None}, expected=400)
    check(get(order)['paymentStatus'] == 'UNPAID', 'callback requires a valid signature, fresh timestamp and valid JSON data')

    earlier = datetime.now(ZoneInfo('Asia/Ho_Chi_Minh')) - timedelta(days=1)
    for changes in [
        {'transferType': 'out'}, {'transferAmount': payload['transferAmount'] - 1}, {'gateway': 'ACB'},
        {'accountNumber': '1234567890'}, {'subAccount': 'NOT-THE-MAIN-ACCOUNT'},
        {'transactionDate': earlier.strftime('%Y-%m-%d %H:%M:%S')}, {'code': 'TF20260101234567'},
    ]:
        webhook({**payload, **changes})
    check(get(order)['paymentStatus'] == 'UNPAID', 'mismatched bank, account, amount, direction, timestamp and ambiguous references are ignored')

    # The issued QR and matching account remain stable if the restaurant changes its bank details.
    sql("USE thunderfood; UPDATE restaurants SET bank_account_number='1234567890' WHERE restaurant_id=1;")
    check(get(order)['qr']['accountNumber'] == ACCOUNT, 'an issued SePay QR keeps its original recipient')
    unlinked = checkout()
    check(unlinked['qr']['automatic'] is False, 'a newly unlinked account keeps manual VietQR')
    webhook({**transaction(unlinked, 10002), 'accountNumber': '1234567890'})
    check(get(unlinked)['paymentStatus'] == 'UNPAID', 'callbacks cannot settle manual VietQR orders')
    partner.call('POST', f"/partner/orders/{unlinked['orderId']}/confirm-payment")
    sql("USE thunderfood; UPDATE restaurants SET bank_account_number='0123456789' WHERE restaurant_id=1;")

    stream = Stream(customer, '/customer/orders/events')
    webhook(payload)
    paid = get(order)
    check(paid['paymentStatus'] == 'PAID' and paid['orderStatus'] == 'CONFIRMED' and paid['qr'] is None
          and stream.wait(order['orderId']), 'a valid transfer confirms the order and publishes an update')
    webhook(payload)
    payment = admin.call('GET', f"/admin/orders/{order['orderId']}")['payments'][0]
    check(payment['provider'] == 'SEPAY' and payment['sepayTransactionId'] == 10001
          and payment['bankReference'] == 'TEST-10001', 'replayed delivery preserves one stored receipt available to admin')

    first, second = checkout(), checkout()
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(webhook, [transaction(first, 10003), transaction(second, 10003)]))
    check(sorted(get(o)['paymentStatus'] for o in (first, second)) == ['PAID', 'UNPAID'],
          'the same SePay transaction cannot credit two simultaneous orders')

    cod = checkout('COD')
    webhook({**payload, 'id': 10004, 'content': cod['orderCode'].replace('-', '')})
    check(get(cod)['paymentStatus'] == 'UNPAID', 'COD remains independent of SePay callbacks')

    late = checkout()
    customer.call('POST', f"/customer/orders/{late['orderId']}/cancel", {'reason': 'Thay đổi kế hoạch đặt món'})
    webhook(transaction(late, 10005))
    result = get(late)
    check(result['orderStatus'] == 'CANCELLED' and result['paymentStatus'] == 'PAID', 'late transfer is recorded without reopening a cancelled order')
    for session, path in [(admin, '/admin/orders'), (partner, '/partner/orders')]:
        check(any(o['orderId'] == late['orderId'] for o in session.call('GET', path + '?refunds=true')['items']),
              'late payment appears in the refund queue')
    partner.call('POST', f"/partner/orders/{late['orderId']}/refund")
    webhook(transaction(late, 10005))
    check(get(late)['paymentStatus'] == 'REFUNDED', 'late payment can be refunded and stays refunded on replay')

    rejected = checkout()
    partner.call('PATCH', f"/partner/orders/{rejected['orderId']}/status",
                 {'status': 'REJECTED', 'reason': 'Quán tạm hết nguyên liệu'})
    webhook({**transaction(rejected, 10006), 'code': rejected['qr']['content'], 'content': None})
    result = get(rejected)
    check(result['orderStatus'] == 'REJECTED' and result['paymentStatus'] == 'PAID',
          'SePay payment code matches a late transfer for a rejected order')
    print('SePay integration suite completed.')


if __name__ == '__main__':
    run()
