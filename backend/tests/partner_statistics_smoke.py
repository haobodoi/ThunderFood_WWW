"""Final SQL + partner statistics acceptance tests against the disposable database.

Run: python backend/tests/partner_statistics_smoke.py --reset-disposable-db
Uses port 13317 / API 18081 and refuses any datadir outside .test-runtime.
"""
import concurrent.futures
import csv
from decimal import Decimal
import sys
import time
from customer_features_smoke import ROOT, DB_PORT, API_PORT, Session, check, sql


def run():
    assert '--reset-disposable-db' in sys.argv, 'Explicit reset flag required'
    guard=sql('SELECT @@port,@@datadir')
    assert DB_PORT in guard and '.test-runtime' in guard, 'Refusing non-disposable database'
    final=(ROOT/'backend/database/thunderfood_final.sql').read_text(encoding='utf-8')
    assert 'DROP DATABASE' not in '\n'.join(line for line in final.splitlines() if not line.lstrip().startswith('--'))
    sql('DROP DATABASE IF EXISTS thunderfood')
    started=time.perf_counter()
    sql(final)
    check(sql('USE thunderfood;SELECT COUNT(*) FROM orders')=='20001','standalone final SQL imports 20,001 orders')
    assert sql('USE thunderfood;SELECT COUNT(*) FROM order_items')=='60002'
    assert int(sql('USE thunderfood;SELECT COUNT(*) FROM order_history'))>90000
    assert int(sql('USE thunderfood;SELECT COUNT(*) FROM customer_reviews'))>2000
    check(True,f'large demo includes lines, payments, reviews and status history (import {time.perf_counter()-started:.1f}s)')
    invalid=sql("""USE thunderfood;SELECT COUNT(*) FROM orders o JOIN (SELECT order_id,SUM(line_total) AS amount FROM order_items GROUP BY order_id) i ON i.order_id=o.order_id
      JOIN payments p ON p.order_id=o.order_id WHERE o.subtotal<>i.amount OR o.total_amount<>o.subtotal+o.delivery_fee OR p.amount<>o.total_amount
      OR (o.order_status='COMPLETED' AND o.payment_status<>'PAID') OR (o.payment_status='REFUNDED' AND o.order_status<>'REJECTED');""")
    assert invalid=='0'
    assert sql("USE thunderfood;SELECT COUNT(*) FROM order_items i JOIN menu_items m ON m.item_id=i.item_id JOIN orders o ON o.order_id=i.order_id WHERE m.restaurant_id<>o.restaurant_id OR i.category_name IS NULL")=='0'
    assert sql('USE thunderfood;SELECT COUNT(*) FROM orders WHERE created_at>NOW()')=='0'
    check(True,'demo monetary totals, item ownership, snapshots, payment states and chronology are consistent')
    sql(final,success=False)
    assert sql('USE thunderfood;SELECT COUNT(*) FROM orders')=='20001'
    check(True,'re-import fails before modifying an existing database')

    admin=Session('admin@thunderfood.vn')
    partner=Session('partner@example.com')
    second=Session('partner.demo@example.com')
    empty=Session('partner.empty@example.com')
    staff=Session('staff@thunderfood.vn')
    customer=Session('customer@example.com')
    Session().call('GET','/partner/statistics/dashboard',expected=401)
    for session in [admin,staff,customer]:
        session.call('GET','/partner/statistics/dashboard',expected=403)
        session.call('GET','/partner/statistics/dashboard/export',expected=403)
    check(True,'all final demo accounts login; partner statistics reject other roles')
    from_day,to_day=sql("SET time_zone='+07:00';SELECT DATE_SUB(CURDATE(),INTERVAL 729 DAY),CURDATE()").split('\t')
    query=f'?from={from_day}&to={to_day}'
    def expected(owner,restaurant=None):
        extra=f' AND o.restaurant_id={restaurant}' if restaurant else ''
        data=sql(f"USE thunderfood;SELECT COUNT(*),COALESCE(SUM(CASE WHEN o.order_status='COMPLETED' AND o.payment_status='PAID' THEN o.subtotal ELSE 0 END),0),COUNT(DISTINCT o.customer_id) FROM orders o JOIN restaurants r ON r.restaurant_id=o.restaurant_id WHERE r.owner_user_id={owner} AND o.created_at>='{from_day}' AND o.created_at<DATE_ADD('{to_day}',INTERVAL 1 DAY){extra}").split('\t')
        return int(data[0]),Decimal(data[1]),int(data[2])
    start=time.perf_counter()
    reports=[]
    for owner,session in [(2,partner),(20,second)]:
        report=session.call('GET','/partner/statistics/dashboard'+query)
        count,revenue,customers=expected(owner)
        assert report['current']['orders']==count and Decimal(str(report['current']['revenue']))==revenue
        assert report['current']['customers']==customers
        assert 'restaurants' not in report['attention'] and 'reports' not in report['attention']
        owned={int(n) for n in sql(f'USE thunderfood;SELECT restaurant_id FROM restaurants WHERE owner_user_id={owner}').splitlines()}
        assert all(row['id'] in owned for row in report['byRestaurant'])
        assert sum(row['orders'] for row in report['byRestaurant'])==count
        order_ids={int(n) for n in sql(f'USE thunderfood;SELECT order_id FROM orders o JOIN restaurants r ON r.restaurant_id=o.restaurant_id WHERE r.owner_user_id={owner}').splitlines()}
        item_ids={int(n) for n in sql(f'USE thunderfood;SELECT item_id FROM menu_items m JOIN restaurants r ON r.restaurant_id=m.restaurant_id WHERE r.owner_user_id={owner}').splitlines()}
        assert all(row['orderId'] in order_ids for row in report['latest'])
        assert all(row['itemId'] in item_ids for row in report['topItems']+report['slowItems'])
        assert sum(row['orders'] for row in report['series'])==count
        assert sum(Decimal(str(row['revenue'])) for row in report['series'])==revenue
        reports.append(report)
    check(True,f'owner isolation and exact SQL totals across every report section ({time.perf_counter()-start:.2f}s for two 2-year reports)')
    global_report=admin.call('GET','/admin/dashboard'+query)
    assert global_report['current']['orders']==sum(r['current']['orders'] for r in reports)
    assert Decimal(str(global_report['current']['revenue']))==sum(Decimal(str(r['current']['revenue'])) for r in reports)
    check(True,'admin aggregation equals the sum of both partners without regression')

    filtered=partner.call('GET','/partner/statistics/dashboard'+query+'&restaurantId=1')
    count,revenue,customers=expected(2,1)
    assert filtered['current']['orders']==count and Decimal(str(filtered['current']['revenue']))==revenue
    assert filtered['current']['customers']==customers and len(filtered['byRestaurant'])==1
    for path in ['/partner/statistics/dashboard','/partner/statistics/dashboard/export']:
        partner.call('GET',path+query+'&restaurantId=5',expected=404)
        second.call('GET',path+query+'&restaurantId=1',expected=404)
    assert partner.call('GET','/partner/statistics/dashboard'+query+'&owner=20')['current']==reports[0]['current']
    check(True,'restaurant filter and CSV validate ownership; client cannot override owner')
    for group in ['week','month','year']:
        grouped=partner.call('GET','/partner/statistics/dashboard'+query+'&group='+group)
        assert sum(r['orders'] for r in grouped['series'])==reports[0]['current']['orders']
    partner.call('GET','/partner/statistics/dashboard'+query+'&group=wrong',expected=400)
    partner.call('GET','/partner/statistics/dashboard?from=not-a-date',expected=400)
    zero=empty.call('GET','/partner/statistics/dashboard'+query)
    assert zero['current']['orders']==0 and zero['current']['revenue']==0 and zero['current']['average']==0
    assert zero['latest']==[] and zero['byRestaurant']==[]
    assert empty.call('GET','/partner/statistics/restaurants')['items']==[]
    check(True,'day/week/month/year, invalid filters, and partner with no restaurants/orders')
    options=second.call('GET','/partner/statistics/restaurants')
    assert {r['id'] for r in options['items']}=={5,9}
    assert second.call('GET','/partner/statistics/restaurants?q=not-found')['total']==0
    second.call('GET','/partner/statistics/restaurants?page=-1',expected=400)
    response=second.opener.open(f'http://127.0.0.1:{API_PORT}/api/partner/statistics/dashboard/export'+query)
    content=response.read().decode('utf-8-sig')
    csv_revenue=next(row[1] for row in csv.reader(content.splitlines()) if row and row[0]=='revenue')
    assert 'text/csv' in response.headers['Content-Type'] and Decimal(csv_revenue)==Decimal(str(reports[1]['current']['revenue']))
    assert 'no-store' in response.headers['Cache-Control']
    check(True,'restaurant picker search/pagination and owned CSV download')
    with concurrent.futures.ThreadPoolExecutor(2) as pool:
        results=list(pool.map(lambda session:session.call('GET','/partner/statistics/dashboard'+query),[partner,second]))
    assert [r['current'] for r in results]==[r['current'] for r in reports]
    check(True,'parallel requests keep partner scopes isolated')
    print('Final SQL and partner statistics suite completed.')


if __name__=='__main__':
    run()
