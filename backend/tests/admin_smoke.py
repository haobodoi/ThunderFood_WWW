"""Admin end-to-end regression against a disposable MariaDB and Spring API.

Requires the same isolated setup as customer_features_smoke.py, port 13317/18081.
Run: python backend/tests/admin_smoke.py --reset-disposable-db
Refuses reset unless @@datadir contains .test-runtime and @@port matches.
"""
import concurrent.futures
import base64
import json
import sys
import urllib.parse
from decimal import Decimal
from customer_features_smoke import ROOT, DB_PORT, API_PORT, Session, check, sql


def login(email, password):
    session = Session()
    session.call('POST', '/auth/login', urllib.parse.urlencode({'username': email, 'password': password}).encode(), content_type='application/x-www-form-urlencoded')
    session.call('GET', '/auth/csrf')
    return session


def run():
    assert '--reset-disposable-db' in sys.argv, 'Explicit reset flag required'
    guard = sql('SELECT @@port,@@datadir;')
    assert DB_PORT in guard and '.test-runtime' in guard, 'Refusing non-disposable database'
    sql((ROOT / 'backend/database/thunderfood_mariadb_v4.sql').read_text(encoding='utf-8'))
    migration = (ROOT / 'backend/database/migrations/V5__admin.sql').read_text(encoding='utf-8')
    sql(migration)
    sql(migration)
    check(sql("USE thunderfood; SELECT COUNT(*) FROM roles WHERE role_code='STAFF'") == '1', 'V5 is repeatable without duplicating roles')
    admin = Session('admin@thunderfood.vn')
    customer = Session('customer@example.com')
    partner = Session('partner@example.com')
    Session().call('GET', '/admin/dashboard', expected=401)
    for session in [customer, partner]:
        for path in ['/admin/dashboard', '/admin/orders', '/admin/users', '/admin/catalog/1/items', '/admin/activity', '/admin/restaurant-reviews']:
            session.call('GET', path, expected=403)
    admin.call('POST', '/admin/orders/1/notes', {'reason': 'Missing CSRF rejected'}, csrf=False, expected=403)
    check(True, 'authentication, all admin read boundaries, and CSRF enforced')
    staff_body = {'fullName': 'Nhân viên kiểm thử', 'email': 'staff.admin-test@example.com', 'phone': '0901234501', 'password': 'Strong-test-only-2026!', 'role': 'STAFF'}
    staff_id = admin.call('POST', '/admin/users/staff', staff_body, expected=201)['id']
    staff = login(staff_body['email'], staff_body['password'])
    admin.call('POST', '/admin/users/staff', staff_body, expected=400)
    admin.call('POST', '/admin/users/staff', {**staff_body, 'password': 'short'}, expected=400)
    assert sql(f'USE thunderfood; SELECT password_hash FROM users WHERE user_id={staff_id}').startswith('$2')
    for path in ['/admin/dashboard', '/admin/orders', '/admin/catalog/restaurants', '/admin/catalog/1/items']:
        staff.call('GET', path)
    for path in ['/admin/users', '/admin/activity', '/admin/complaints', '/admin/restaurants', '/admin/review-reports']:
        staff.call('GET', path, expected=403)
    staff.call('POST', '/admin/orders/1/confirm-payment', {'expectedStatus': 'PENDING', 'expectedPayment': 'UNPAID'}, expected=403)
    staff.call('POST', '/admin/orders/1/refund', {'expectedStatus': 'REJECTED', 'expectedPayment': 'PAID'}, expected=403)
    staff.call('POST', '/admin/users/staff', staff_body, expected=403)
    check(True, 'staff operational permissions and restricted financial/account functions; BCrypt stored')
    for path in ['/admin/users', '/admin/users/4', '/admin/catalog/restaurants', '/admin/catalog/1/items', '/admin/catalog/1/categories', '/admin/activity', '/admin/complaints']:
        result = admin.call('GET', path)
        assert 'password' not in json.dumps(result).lower()
    admin.call('GET', '/admin/orders?status=INVALID', expected=400)
    admin.call('GET', '/admin/orders?page=-1', expected=400)
    admin.call('GET', '/admin/dashboard?from=2026-11-03&to=2026-11-01', expected=400)
    admin.call('GET', '/admin/dashboard?group=INVALID', expected=400)
    admin.call('GET', '/admin/dashboard?from=2000-01-01&to=2026-01-01', expected=400)
    assert admin.call('GET', '/admin/orders?q=' + urllib.parse.quote("%' OR 1=1 --"))['total'] == 0
    check(True, 'all list/detail queries execute; sensitive fields excluded, filters validated and parameterized')
    pending = admin.call('GET', '/admin/restaurant-reviews?status=PENDING')
    assert pending['total'] >= 1
    restaurant_id = pending['items'][0]['id']
    other_admin = Session('admin@thunderfood.vn')
    def approve(session):
        try:
            session.call('POST', f'/admin/restaurants/{restaurant_id}/approve')
            return 200
        except AssertionError as error:
            assert error.args[0][2] == 400, error
            return 400
    with concurrent.futures.ThreadPoolExecutor(2) as pool:
        assert sorted(pool.map(approve, [admin, other_admin])) == [200, 400]
    assert admin.call('GET', '/admin/activity?q=RESTAURANT_APPROVE')['total'] == 1
    check(True, 'restaurant review pagination and locking; concurrent approval records one audit event')

    # Fixed cohort exercises paid completed, rejected paid, refunded, unpaid and boundary exclusion.
    insert = """USE thunderfood; INSERT INTO orders(order_code,customer_id,restaurant_id,recipient_name,recipient_phone,delivery_address,order_status,payment_method,payment_status,subtotal,delivery_fee,total_amount,created_at,updated_at)
      VALUES {values};"""
    fixture = [('ADMIN-A','COMPLETED','PAID',100000,15000,'2026-02-01 00:00:00'), ('ADMIN-B','COMPLETED','PAID',50000,10000,'2026-02-01 23:59:59'), ('ADMIN-C','REJECTED','PAID',80000,12000,'2026-02-01 12:00:00'), ('ADMIN-D','REJECTED','REFUNDED',20000,5000,'2026-02-01 12:00:00'), ('ADMIN-E','PENDING','UNPAID',10000,0,'2026-02-01 12:00:00'), ('ADMIN-F','COMPLETED','PAID',99999,0,'2026-02-02 00:00:00')]
    values = ','.join(f"('{code}',4,1,'Admin fixture','0900000004','Test address','{status}','COD','{payment}',{subtotal},{fee},{subtotal+fee},'{date}','{date}')" for code,status,payment,subtotal,fee,date in fixture)
    sql(insert.format(values=values))
    d = admin.call('GET', '/admin/dashboard?from=2026-02-01&to=2026-02-01')
    assert Decimal(str(d['current']['revenue'])) == 150000, d
    assert Decimal(str(d['current']['receipts'])) == 175000
    assert Decimal(str(d['current']['deliveryFees'])) == 25000
    assert Decimal(str(d['current']['average'])) == 87500
    assert d['current']['orders'] == 5 and d['current']['completed'] == 2
    assert d['current']['cancellationRate'] == 40
    assert d['previousFrom'] == '2026-01-31' and d['previousTo'] == '2026-01-31'
    assert len(d['series']) == 1 and d['series'][0]['orders'] == 5
    for group in ['week','month','year']:
        grouped = admin.call('GET', f'/admin/dashboard?from=2026-02-01&to=2026-02-02&group={group}')
        assert sum(s['orders'] for s in grouped['series']) == 6
    empty = admin.call('GET', '/admin/dashboard?from=2020-01-01&to=2020-01-03')
    assert len(empty['series']) == 3 and empty['current']['revenue'] == 0 and empty['current']['average'] == 0
    response = admin.opener.open(f'http://127.0.0.1:{API_PORT}/api/admin/dashboard/export?from=2026-02-01&to=2026-02-01')
    content = response.read().decode('utf-8-sig')
    assert 'text/csv' in response.headers['Content-Type'] and '150000' in content and 'Asia/Ho_Chi_Minh' in content
    check(True, 'exact revenue/fees/AOV/cancellation/previous-period/boundary/empty/grouped statistics and CSV')

    oid = int(sql("USE thunderfood; SELECT order_id FROM orders WHERE order_code='ADMIN-E'"))
    base = {'expectedStatus': 'PENDING', 'expectedPayment': 'UNPAID'}
    staff.call('POST', f'/admin/orders/{oid}/status', {**base, 'status': 'COMPLETED'}, expected=400)
    staff.call('POST', f'/admin/orders/{oid}/status', {**base, 'status': 'CONFIRMED'})
    staff.call('POST', f'/admin/orders/{oid}/status', {**base, 'status': 'CONFIRMED'}, expected=409)
    for before, after in [('CONFIRMED','PREPARING'), ('PREPARING','DELIVERING'), ('DELIVERING','COMPLETED')]:
        staff.call('POST', f'/admin/orders/{oid}/status', {'expectedStatus': before, 'expectedPayment': 'UNPAID', 'status': after})
    detail = admin.call('GET', f'/admin/orders/{oid}')
    assert detail['paymentStatus'] == 'PAID' and detail['orderStatus'] == 'COMPLETED' and len(detail['history']) >= 5
    admin.call('POST', f'/admin/orders/{oid}/notes', {'reason': 'Ghi chú chỉ dùng nội bộ'})
    assert any('nội bộ' in n['detail'] for n in admin.call('GET', f'/admin/orders/{oid}')['notes'])
    rid = int(sql("USE thunderfood; SELECT order_id FROM orders WHERE order_code='ADMIN-C'"))
    admin.call('POST', f'/admin/orders/{rid}/refund', {'expectedStatus': 'REJECTED', 'expectedPayment': 'PAID'})
    admin.call('POST', f'/admin/orders/{rid}/refund', {'expectedStatus': 'REJECTED', 'expectedPayment': 'PAID'}, expected=409)
    check(True, 'admin/staff share valid order state machine; stale requests, COD settlement, history, notes, refund')
    sql(insert.format(values="('ADMIN-RACE',4,1,'Admin race','0900000004','Test address','PENDING','COD','UNPAID',10000,0,10000,'2026-02-03 12:00:00','2026-02-03 12:00:00')"))
    race_id = int(sql("USE thunderfood; SELECT order_id FROM orders WHERE order_code='ADMIN-RACE'"))
    def confirm(session):
        try:
            session.call('POST', f'/admin/orders/{race_id}/status', {**base, 'status': 'CONFIRMED'})
            return 200
        except AssertionError as error:
            assert error.args[0][2] == 409, error
            return 409
    with concurrent.futures.ThreadPoolExecutor(2) as pool:
        assert sorted(pool.map(confirm, [admin, other_admin])) == [200, 409]
    check(True, 'simultaneous admin order updates apply once and reject stale state')

    category = staff.call('POST', '/admin/catalog/1/categories', {'categoryName': 'Nhóm kiểm thử admin', 'displayOrder': 10}, expected=201)
    cid = category['id']
    body = {'itemName': 'Món kiểm thử admin', 'description': 'Mô tả tiếng Việt', 'price': 25000, 'categoryId': cid, 'imageUrl': '', 'available': True}
    item = staff.call('POST', '/admin/catalog/1/items', body, expected=201)
    iid = item['id']
    staff.call('PUT', f'/admin/catalog/1/items/{iid}', {**body, 'categoryId': 999999}, expected=400)
    staff.call('PUT', f'/admin/catalog/1/items/{iid}', {**body, 'price': -1}, expected=400)
    staff.call('PUT', f'/admin/catalog/1/items/{iid}', {**body, 'imageUrl': 'javascript:alert(1)'}, expected=400)
    staff.call('DELETE', f'/admin/catalog/1/categories/{cid}', expected=400)
    sql("USE thunderfood; UPDATE restaurants SET is_open=1 WHERE restaurant_id=1; UPDATE restaurant_opening_hours SET open_time='00:00:00',close_time='23:59:59' WHERE restaurant_id=1;")
    cart = customer.call('GET', '/customer/carts/1')
    cart = customer.call('POST', '/customer/carts/items', {'itemId': iid, 'quantity': 1, 'version': cart['version']})
    staff.call('PATCH', f'/admin/catalog/1/categories/{cid}/visibility', {'visible': False})
    menu = Session().call('GET', '/restaurants/1/menu')
    assert all(c['categoryId'] != cid for c in menu['menu'])
    hidden_cart = customer.call('GET', '/customer/carts/1')
    assert any(i['itemId'] == iid and not i['available'] for i in hidden_cart['items'])
    customer.call('POST', '/customer/carts/items', {'itemId': iid, 'quantity': 1, 'version': hidden_cart['version']}, expected=400)
    staff.call('PATCH', f'/admin/catalog/1/categories/{cid}/visibility', {'visible': True})
    sql(f"USE thunderfood; INSERT INTO order_items(order_id,item_id,item_name,unit_price,quantity,line_total) VALUES({oid},{iid},'Món snapshot',25000,1,25000);")
    assert sql(f'USE thunderfood; SELECT category_name FROM order_items WHERE order_id={oid} AND item_id={iid}') == 'Nhóm kiểm thử admin'
    staff.call('PUT', f'/admin/catalog/1/items/{iid}', {**body, 'itemName': 'Đổi tên', 'price': 30000})
    staff.call('PATCH', f'/admin/catalog/1/items/{iid}/visibility', {'visible': False})
    staff.call('DELETE', f'/admin/catalog/1/items/{iid}')
    assert sql(f'USE thunderfood; SELECT item_name,unit_price FROM order_items WHERE order_id={oid} AND item_id={iid}') == 'Món snapshot\t25000.00'
    staff.call('DELETE', f'/admin/catalog/1/categories/{cid}')
    check(True, 'catalog CRUD, validation, soft delete, category visibility enforced in public menu and cart; historical snapshots preserved')

    # Upload validates actual format and size using existing storage service.
    for payload in [b'not an image', b'x'*(1024*1024+1)]:
        boundary='AdminTestBoundary'
        multipart=(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n'.encode()+payload+f'\r\n--{boundary}--\r\n'.encode())
        staff.call('POST','/admin/uploads',multipart,expected=400,content_type=f'multipart/form-data; boundary={boundary}')
    png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=')
    multipart=(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="valid.png"\r\nContent-Type: image/png\r\n\r\n'.encode()+png+f'\r\n--{boundary}--\r\n'.encode())
    uploaded=staff.call('POST','/admin/uploads',multipart,content_type=f'multipart/form-data; boundary={boundary}')
    assert uploaded['url'].startswith('/uploads/public/')
    check(True, 'admin upload accepts PNG and rejects forged file and oversized image')
    admin.call('PUT', '/admin/stores/1', {'deliveryFee': 17000, 'open': True})
    assert sql('USE thunderfood; SELECT delivery_fee FROM restaurants WHERE restaurant_id=1') == '17000.00'
    admin.call('PUT', '/admin/stores/1', {'deliveryFee': -1, 'open': True}, expected=400)
    sql("USE thunderfood; INSERT INTO complaints(customer_id,order_id,title,content) VALUES(4,1,'Test complaint','Món giao bị thiếu');")
    complaint_id = int(sql('USE thunderfood; SELECT MAX(complaint_id) FROM complaints'))
    admin.call('PATCH', f'/admin/complaints/{complaint_id}', {'status': 'RESOLVED', 'response': 'Đã liên hệ và xử lý cho khách'})
    admin.call('PATCH', f'/admin/complaints/{complaint_id}', {'status': 'PROCESSING', 'response': 'Không mở lại'}, expected=400)
    check(True, 'store configuration and complaint workflow persist with validation')
    admin.call('PATCH', '/admin/users/1/access', {'role': 'ADMIN', 'status': 'LOCKED', 'reason': 'Không được tự khóa'}, expected=400)
    admin.call('PATCH', '/admin/users/4/access', {'role': 'ADMIN', 'status': 'ACTIVE', 'reason': 'Không nâng quyền khách hàng'}, expected=400)
    admin.call('PATCH', f'/admin/users/{staff_id}/access', {'role': 'STAFF', 'status': 'LOCKED', 'reason': 'Tạm khóa kiểm thử bảo mật'})
    staff.call('GET', '/admin/orders', expected=401)
    admin.call('PATCH', f'/admin/users/{staff_id}/access', {'role': 'STAFF', 'status': 'ACTIVE', 'reason': 'Mở khóa sau khi kiểm thử'})
    staff = login(staff_body['email'], staff_body['password'])
    admin.call('PATCH', f'/admin/users/{staff_id}/access', {'role': 'ADMIN', 'status': 'ACTIVE', 'reason': 'Thay đổi quyền để kiểm tra phiên'})
    staff.call('GET', '/admin/users', expected=401)
    logs = admin.call('GET', '/admin/activity')
    assert logs['total'] >= 15 and all('password' not in l['detail'].lower() for l in logs['items'])
    check(True, 'self-lock/privilege-escalation defenses, immediate locked/changed-role session revocation and audit trail')
    admin.call('POST', '/auth/logout')
    admin.call('GET', '/admin/orders', expected=401)
    check(True, 'logout invalidates the authenticated admin session')
    print('Admin integration suite completed.')


if __name__ == '__main__':
    run()
