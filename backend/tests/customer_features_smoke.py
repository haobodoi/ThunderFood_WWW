"""Integration tests against a disposable MariaDB + running Spring API.

Fixed ports: DB 13317, API 18081. Refuses any DB outside .test-runtime.
Resets the disposable thunderfood schema. Never point the API at a real DB.
Run: python backend/tests/customer_features_smoke.py --reset-disposable-db
Requires MariaDB CLI in MARIADB_CLIENT or the Windows default below.
"""
import base64
import concurrent.futures
import http.cookiejar
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
CLIENT = os.environ.get('MARIADB_CLIENT', 'C:/Program Files/MariaDB 12.2/bin/mariadb.exe')
ENV = {**os.environ, 'MYSQL_PWD': os.environ.get('TEST_DB_PASSWORD', 'local-test-only')}
ARGS = [CLIENT, '--host=127.0.0.1', '--port=13317', '--user=root', '--default-character-set=utf8mb4', '--batch', '--skip-column-names']
checks = 0

def sql(statement, success=True):
    result = subprocess.run(ARGS, input=statement.encode(), env=ENV, capture_output=True)
    assert (result.returncode == 0) == success, result.stderr.decode(errors='replace')
    return result.stdout.decode('utf-8').strip()

def check(condition, label):
    global checks
    assert condition, label
    checks += 1
    print('PASS:', label)

class Session:
    def __init__(self, email=None):
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.call('GET', '/auth/csrf')
        if email:
            self.call('POST', '/auth/login', urllib.parse.urlencode({'username': email, 'password': '123456'}).encode(), content_type='application/x-www-form-urlencoded')
            self.call('GET', '/auth/csrf')

    def call(self, method, path, body=None, expected=200, content_type='application/json', csrf=True):
        headers = {}
        if body is not None:
            headers['Content-Type'] = content_type
            if not isinstance(body, bytes): body = json.dumps(body).encode()
        if csrf:
            token = next((c.value for c in self.jar if c.name == 'XSRF-TOKEN'), None)
            if token: headers['X-XSRF-TOKEN'] = urllib.parse.unquote(token)
        request = urllib.request.Request('http://127.0.0.1:18081/api' + path, body, headers, method=method)
        try:
            response = self.opener.open(request, timeout=15)
        except urllib.error.HTTPError as error:
            response = error
        raw = response.read()
        assert response.status == expected, (method, path, response.status, raw.decode(errors='replace'))
        if not raw: return None
        if response.headers.get('Content-Type', '').startswith('image/'): return raw
        return json.loads(raw)

def run():
    assert '--reset-disposable-db' in sys.argv, 'Explicit reset flag required'
    guard = sql('SELECT @@port, @@datadir;')
    assert '13317' in guard and '.test-runtime' in guard, 'Refusing non-disposable DB'
    sql((ROOT / 'backend/database/thunderfood_mariadb_v4.sql').read_text(encoding='utf-8'))
    # Full-day fixture makes service-hour tests independent of execution time.
    sql("USE thunderfood; UPDATE restaurant_opening_hours SET open_time='00:00:00',close_time='23:59:59';")
    anon = Session()
    anon.call('GET', '/customer/carts', expected=401)
    check(anon.call('GET', '/restaurants/1/reviews')['summary']['review_count'] == 1, 'v4 import and public review summary')
    customer = Session('customer@example.com')
    partner = Session('partner@example.com')
    admin = Session('admin@thunderfood.vn')
    customer.call('POST', '/customer/carts/items', {'itemId': 1, 'quantity': 1, 'version': 0}, expected=403, csrf=False)
    partner.call('GET', '/customer/carts', expected=403)
    check(True, 'authentication, role and CSRF protection')
    carts = customer.call('GET', '/customer/carts')
    check(len(carts) == 2, 'per-restaurant carts persisted')
    cart = customer.call('DELETE', '/customer/carts/1?version=0')
    customer.call('POST', '/customer/carts/items', {'itemId': 1, 'quantity': 1, 'version': 0}, expected=409)
    cart = customer.call('POST', '/customer/carts/items', {'itemId': 1, 'quantity': 2, 'note': '  Less rice  ', 'version': cart['version']})
    cart = customer.call('POST', '/customer/carts/items', {'itemId': 1, 'quantity': 1, 'note': 'Less rice', 'version': cart['version']})
    check(len(cart['items']) == 1 and cart['quantity'] == 3, 'normalized identical notes merge')
    cart = customer.call('POST', '/customer/carts/items', {'itemId': 1, 'quantity': 1, 'note': 'Normal rice', 'version': cart['version']})
    check(len(cart['items']) == 2 and cart['quantity'] == 4, 'different notes keep separate lines')
    customer.call('POST', '/customer/carts/items', {'itemId': 1, 'quantity': 96, 'note': 'another', 'version': cart['version']}, expected=400)
    customer.call('POST', '/customer/carts/items', {'itemId': 1, 'quantity': 0, 'version': cart['version']}, expected=400)
    check(True, 'aggregate per-dish quantity cap and input validation')
    # A second browser session of the same customer races an identical version.
    other_tab = Session('customer@example.com')
    def race(session):
        try:
            session.call('POST', '/customer/carts/items', {'itemId': 1, 'quantity': 1, 'note': 'race', 'version': cart['version']})
            return 200
        except AssertionError as error:
            assert error.args[0][2] == 409, error
            return 409
    with concurrent.futures.ThreadPoolExecutor(2) as pool:
        results = list(pool.map(race, [customer, other_tab]))
    check(sorted(results) == [200, 409], 'simultaneous cart writes reject stale version')
    cart = customer.call('GET', '/customer/carts/1')
    sql('USE thunderfood; UPDATE menu_items SET price=price+1000 WHERE item_id=1;')
    cart = customer.call('GET', '/customer/carts/1')
    check(all(i['price_changed'] for i in cart['items']), 'price changes detected without trusting client price')
    sql('USE thunderfood; UPDATE menu_items SET is_available=0 WHERE item_id=1;')
    cart = customer.call('GET', '/customer/carts/1')
    check(cart['subtotal'] == 0 and all(not i['available'] for i in cart['items']), 'unavailable lines retained and excluded from subtotal')
    line = cart['items'][0]
    customer.call('PUT', f"/customer/carts/1/items/{line['cart_item_id']}", {'quantity': line['quantity']+1, 'note': line['note'], 'version': cart['version']}, expected=400)
    cart = customer.call('PUT', f"/customer/carts/1/items/{line['cart_item_id']}", {'quantity': line['quantity']-1, 'note': line['note'], 'version': cart['version']})
    check(True, 'out-of-stock dish blocks increases but allows decreases')
    sql("USE thunderfood; UPDATE menu_items SET is_available=1 WHERE item_id=1; UPDATE restaurants SET is_open=0 WHERE restaurant_id=1;")
    customer.call('POST', '/customer/carts/items', {'itemId': 1, 'quantity': 1, 'version': cart['version']}, expected=400)
    sql("USE thunderfood; UPDATE restaurants SET is_open=1 WHERE restaurant_id=1; UPDATE restaurant_opening_hours SET open_time='00:00:00',close_time='00:00:01' WHERE restaurant_id=1;")
    customer.call('POST', '/customer/carts/items', {'itemId': 1, 'quantity': 1, 'version': cart['version']}, expected=400)
    check(True, 'manual close and opening schedule enforced on server')
    sql("USE thunderfood; UPDATE restaurant_opening_hours SET close_time='23:59:59' WHERE restaurant_id=1; INSERT INTO users(role_id,full_name,email,phone,password_hash) SELECT 1,'Other customer','reviewer.test@example.com','0900000099',password_hash FROM users WHERE user_id=4;")
    outsider = Session('reviewer.test@example.com')
    outsider.call('GET', '/customer/carts/1', expected=404)
    outsider.call('DELETE', f"/customer/carts/1?version={cart['version']}", expected=404)
    check(True, 'another customer cannot read or alter a cart')
    sql("USE thunderfood; INSERT INTO carts(customer_id,restaurant_id) VALUES(6,1);")
    sql("USE thunderfood; INSERT INTO cart_items(cart_id,restaurant_id,item_id,quantity,note,last_seen_unit_price) VALUES(3,1,1,0,'',1);", success=False)
    sql("USE thunderfood; INSERT INTO cart_items(cart_id,restaurant_id,item_id,quantity,note,last_seen_unit_price) SELECT 3,1,item_id,1,'',price FROM menu_items WHERE restaurant_id=4 LIMIT 1;", success=False)
    check(True, 'database CHECK and composite foreign key reject invalid cart lines')
    # Orders are fixtures only: this test does not implement checkout.
    for order_id, status, days, owner in [(2,'COMPLETED',1,4),(3,'PENDING',1,4),(4,'CANCELLED',1,4),(5,'COMPLETED',31,4),(6,'COMPLETED',1,6)]:
        sql(f"USE thunderfood; INSERT INTO orders(order_id,order_code,customer_id,restaurant_id,recipient_name,recipient_phone,delivery_address,order_status,payment_status,subtotal,delivery_fee,total_amount,completed_at) VALUES({order_id},'TEST-{order_id}',{owner},1,'Test','0900000004','Test address','{status}','PAID',55000,0,55000,NOW()-INTERVAL {days} DAY);")
    eligibility = customer.call('GET', '/customer/reviews/eligibility?restaurantId=1')
    check([o['order_id'] for o in eligibility['orders']] == [2], 'only unreviewed completed orders within 30 days are eligible')
    review_body = {'rating': 4, 'content': 'The food was delicious and packed well.'}
    for order_id, expected in [(1,400),(3,400),(4,400),(5,400),(6,404)]:
        customer.call('POST', '/customer/reviews', {**review_body,'orderId':order_id}, expected=expected)
    check(True, 'duplicate, pending, cancelled, expired and foreign orders cannot be reviewed')
    created = customer.call('POST', '/customer/reviews', {**review_body,'orderId':2})['reviewId']
    check(anon.call('GET', '/restaurants/1/reviews')['summary']['review_count'] == 2, 'eligible review updates public aggregate')
    outsider.call('PUT', f'/customer/reviews/{created}', {'rating':1,'content':'Attempted edit by another customer','version':0}, expected=404)
    customer.call('PUT', f'/customer/reviews/{created}', {'rating':3,'content':'Updated experience with the restaurant.','version':0})
    customer.call('PUT', f'/customer/reviews/{created}', {'rating':1,'content':'Stale update should be rejected.','version':0}, expected=409)
    check(True, 'review ownership and version enforced')
    partner.call('PUT', f'/partner/reviews/{created}/reply', {'content':'Thank you for your review.','version':0})
    partner.call('DELETE', f'/partner/reviews/{created}/reply?version=1')
    partner.call('PUT', f'/partner/reviews/{created}/reply', {'content':'We appreciate your feedback.','version':2})
    check(True, 'partner reply can be created, deleted and restored with version')
    # Upload a valid PNG and verify only authorized visibility after moderation.
    png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB1sAAAAASUVORK5CYII=')
    boundary = 'thunderfood-test-boundary'
    body = f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n'.encode()+png+f'\r\n--{boundary}--\r\n'.encode()
    customer.call('POST', f'/customer/reviews/{created}/images?version=1', body, content_type='multipart/form-data; boundary='+boundary)
    own = next(r for r in customer.call('GET','/customer/reviews')['items'] if r['review_id']==created)
    image_id = own['images'][0]['image_id']
    check(bool(anon.call('GET', f'/restaurants/review-images/{image_id}')), 'review image upload and public read')
    outsider.call('POST', f'/customer/reviews/{created}/reports', {'reasonCode':'SPAM','reason':'Suspicious repeated content.'})
    report = admin.call('GET','/admin/review-reports')['items'][0]
    admin.call('PATCH',f'/admin/reviews/{created}/visibility',{'status':'HIDDEN','reason':'Temporarily hidden for review.','version':own['version']})
    anon.call('GET',f'/restaurants/review-images/{image_id}',expected=404)
    check(anon.call('GET','/restaurants/1/reviews')['summary']['review_count']==1, 'hidden review excluded from summary and its image becomes private')
    check(bool(customer.call('GET',f'/restaurants/review-images/{image_id}')), 'author retains access to hidden review image')
    customer.call('PUT',f'/customer/reviews/{created}',{'rating':4,'content':'Edited while hidden, still awaiting moderation.','version':own['version']+1})
    check(anon.call('GET','/restaurants/1/reviews')['summary']['review_count']==1, 'editing hidden review does not republish')
    admin.call('PATCH',f'/admin/review-reports/{report["report_id"]}',{'status':'RESOLVED','note':'Reviewed the report and recorded the action.'})
    admin.call('PATCH',f'/admin/reviews/{created}/visibility',{'status':'PUBLISHED','reason':'Review restored after investigation.','version':own['version']+2})
    check(anon.call('GET','/restaurants/1/reviews')['summary']['review_count']==2, 'admin restore recalculates score')
    sql(f"USE thunderfood; UPDATE customer_reviews SET created_at=NOW()-INTERVAL 8 DAY WHERE review_id={created};")
    customer.call('PUT',f'/customer/reviews/{created}',{'rating':5,'content':'This edit is outside the allowed window.','version':own['version']+3},expected=400)
    customer.call('DELETE',f'/customer/reviews/{created}?version={own["version"]+3}')
    customer.call('POST','/customer/reviews',{**review_body,'orderId':2},expected=400)
    check(anon.call('GET','/restaurants/1/reviews')['summary']['review_count']==1, 'expired edit blocked; soft delete allowed; no second review for same order')
    sql("USE thunderfood; UPDATE users SET account_status='LOCKED' WHERE user_id=6;")
    outsider.call('GET','/customer/carts',expected=400)
    check(True, 'fresh account status checked after session login')
    print(f'All {checks} integration checks passed.')

if __name__ == '__main__':
    run()
