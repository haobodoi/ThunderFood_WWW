-- Synthetic demo records ONLY, never import this fragment into a working database.
-- Included inline in thunderfood_final.sql by build_final_sql.py.
SET time_zone = '+07:00';
SET @seed_now = NOW();
SET @demo_hash = (SELECT password_hash FROM users WHERE user_id=4);

INSERT INTO users(user_id,role_id,full_name,email,phone,password_hash,created_at) VALUES
(6,(SELECT role_id FROM roles WHERE role_code='STAFF'),'Nhân viên Demo','staff@thunderfood.vn','0900000006',@demo_hash,@seed_now),
(20,2,'Nguyễn Mai — Đối tác Demo','partner.demo@example.com','0900000020',@demo_hash,DATE_SUB(@seed_now,INTERVAL 950 DAY)),
(21,2,'Đối tác mới chưa có đơn','partner.empty@example.com','0900000021',@demo_hash,@seed_now);
UPDATE restaurants SET owner_user_id=20,rep_full_name='Nguyễn Mai',rep_email='partner.demo@example.com',
  rep_phone='0900000020',bank_account_holder='NGUYEN MAI' WHERE restaurant_id IN (5,9);
UPDATE users SET created_at=DATE_SUB(@seed_now,INTERVAL 950 DAY) WHERE user_id IN (1,2,3,4,5);
UPDATE restaurants SET created_at=DATE_SUB(@seed_now,INTERVAL 900 DAY),
  submitted_at=DATE_SUB(@seed_now,INTERVAL 899 DAY),reviewed_at=DATE_SUB(@seed_now,INTERVAL 898 DAY)
  WHERE status='APPROVED';
UPDATE menu_items SET created_at=DATE_SUB(@seed_now,INTERVAL 897 DAY);
-- Demo can be ordered at any time; production keeps each restaurant's actual schedule.
UPDATE restaurant_opening_hours SET open_time='00:00:00',close_time='23:59:59';
INSERT IGNORE INTO restaurant_opening_hours(restaurant_id,day_of_week,open_time,close_time)
  VALUES(2,7,'00:00:00','23:59:59');

CREATE TEMPORARY TABLE tf_digits(n INT NOT NULL PRIMARY KEY);
INSERT INTO tf_digits VALUES(0),(1),(2),(3),(4),(5),(6),(7),(8),(9);
CREATE TEMPORARY TABLE tf_numbers(n INT NOT NULL PRIMARY KEY);
INSERT INTO tf_numbers
SELECT a.n+10*b.n+100*c.n+1000*d.n+10000*e.n
FROM tf_digits a CROSS JOIN tf_digits b CROSS JOIN tf_digits c CROSS JOIN tf_digits d CROSS JOIN tf_digits e
WHERE a.n+10*b.n+100*c.n+1000*d.n+10000*e.n<20000;

-- 1,000 customers: 800 with historical orders and 200 recently registered without orders.
INSERT INTO users(user_id,role_id,full_name,email,phone,password_hash,address,created_at)
SELECT 1000+n,1,CONCAT(ELT(MOD(n,8)+1,'Nguyễn An','Trần Bình','Lê Chi','Phạm Dũng','Hoàng Hà','Võ Linh','Đặng Minh','Bùi Ngọc'),' Demo ',LPAD(n+1,4,'0')),
 CONCAT('customer',LPAD(n+1,4,'0'),'@demo.thunderfood.test'),CONCAT('091',LPAD(n,7,'0')),@demo_hash,
 CONCAT(MOD(n,199)+1,' Đường Demo, Thành phố Hồ Chí Minh'),
 CASE WHEN n<800 THEN DATE_SUB(@seed_now,INTERVAL (950-MOD(n,100)) DAY)
      ELSE DATE_SUB(@seed_now,INTERVAL MOD(n,45) DAY) END
FROM tf_numbers WHERE n<1000;

CREATE TEMPORARY TABLE tf_shops AS
SELECT restaurant_id,ROW_NUMBER() OVER(ORDER BY restaurant_id)-1 AS slot FROM restaurants WHERE status='APPROVED';
SET @shop_count = (SELECT COUNT(*) FROM tf_shops);
CREATE TEMPORARY TABLE tf_menu AS
SELECT item_id,restaurant_id,category_id,item_name,price,
 ROW_NUMBER() OVER(PARTITION BY restaurant_id ORDER BY item_id) AS slot,
 COUNT(*) OVER(PARTITION BY restaurant_id) AS item_count
FROM menu_items WHERE approval_status='APPROVED' AND is_deleted=0;

CREATE TEMPORARY TABLE tf_demo_orders AS
SELECT n,10000+n AS id,1000+MOD(n*73,800) AS customer_id,s.restaurant_id,
 CASE WHEN MOD(n,3)=0 THEN 'COD' ELSE 'ONLINE' END AS method,
 CASE WHEN n<14000 THEN MOD(n*37+FLOOR(n/97),730) ELSE MOD(n*17+FLOOR(n/37),90) END AS days_ago,
 CASE WHEN MOD(n,20)=16 THEN 'CANCELLED'
      WHEN MOD(n,20) IN (17,18) THEN 'REJECTED'
      WHEN (CASE WHEN n<14000 THEN MOD(n*37+FLOOR(n/97),730) ELSE MOD(n*17+FLOOR(n/37),90) END)<=2 AND MOD(n,5)<>0
        THEN ELT(MOD(n,4)+1,'PENDING','CONFIRMED','PREPARING','DELIVERING')
      ELSE 'COMPLETED' END AS target_status,
 DATE_SUB(DATE_SUB(@seed_now,INTERVAL (CASE WHEN n<14000 THEN MOD(n*37+FLOOR(n/97),730) ELSE MOD(n*17+FLOOR(n/37),90) END) DAY),INTERVAL MOD(n*113,43200) SECOND) AS created_at
FROM tf_numbers JOIN tf_shops s ON s.slot=MOD(n,@shop_count);
ALTER TABLE tf_demo_orders ADD PRIMARY KEY(id),ADD INDEX(restaurant_id);

-- Start every order in PENDING; walk the same business states as the application.
START TRANSACTION;
INSERT INTO orders(order_id,order_code,customer_id,restaurant_id,recipient_name,recipient_phone,delivery_address,note,
 payment_method,subtotal,delivery_fee,total_amount,created_at,updated_at)
SELECT d.id,CONCAT('TF-DEMO-',LPAD(d.n+1,6,'0')),d.customer_id,d.restaurant_id,u.full_name,u.phone,u.address,
 'Dữ liệu mẫu để kiểm thử thống kê',d.method,0,r.delivery_fee,r.delivery_fee,d.created_at,d.created_at
FROM tf_demo_orders d JOIN users u ON u.user_id=d.customer_id JOIN restaurants r ON r.restaurant_id=d.restaurant_id;

-- Three different lines/order; popular dishes are weighted, last dish stays unsold for slow-item tests.
INSERT INTO order_items(order_id,item_id,item_name,unit_price,quantity,line_total,note)
SELECT d.id,m.item_id,m.item_name,m.price,1+MOD(d.n+k.n,3),m.price*(1+MOD(d.n+k.n,3)),
 CASE WHEN k.n=0 AND MOD(d.n,4)=0 THEN 'Ít cay, giao nóng' ELSE NULL END
FROM tf_demo_orders d CROSS JOIN (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2) k
JOIN tf_menu m ON m.restaurant_id=d.restaurant_id
 AND m.slot=1+MOD((CASE WHEN MOD(d.n,10)<7 THEN MOD(d.n,3) ELSE d.n*11 END)+k.n,GREATEST(3,m.item_count-1));
UPDATE orders o JOIN (SELECT order_id,SUM(line_total) AS subtotal FROM order_items WHERE order_id>=10000 GROUP BY order_id) x ON x.order_id=o.order_id
SET o.subtotal=x.subtotal,o.total_amount=x.subtotal+o.delivery_fee;

UPDATE orders o JOIN tf_demo_orders d ON d.id=o.order_id
SET o.order_status='CONFIRMED',o.confirmed_at=LEAST(DATE_ADD(d.created_at,INTERVAL 5 MINUTE),@seed_now),
 o.payment_status=IF(d.method='ONLINE','PAID','UNPAID'),o.updated_at=LEAST(DATE_ADD(d.created_at,INTERVAL 5 MINUTE),@seed_now)
WHERE d.target_status IN ('CONFIRMED','PREPARING','DELIVERING','COMPLETED')
 OR (d.target_status='REJECTED' AND d.method='ONLINE');
UPDATE orders o JOIN tf_demo_orders d ON d.id=o.order_id
SET o.order_status='PREPARING',o.updated_at=LEAST(DATE_ADD(d.created_at,INTERVAL 10 MINUTE),@seed_now)
WHERE d.target_status IN ('PREPARING','DELIVERING','COMPLETED');
UPDATE orders o JOIN tf_demo_orders d ON d.id=o.order_id
SET o.order_status='DELIVERING',o.updated_at=LEAST(DATE_ADD(d.created_at,INTERVAL 25 MINUTE),@seed_now)
WHERE d.target_status IN ('DELIVERING','COMPLETED');
UPDATE orders o JOIN tf_demo_orders d ON d.id=o.order_id
SET o.order_status='COMPLETED',o.payment_status='PAID',o.completed_at=LEAST(DATE_ADD(d.created_at,INTERVAL 45 MINUTE),@seed_now),
 o.updated_at=LEAST(DATE_ADD(d.created_at,INTERVAL 45 MINUTE),@seed_now) WHERE d.target_status='COMPLETED';
UPDATE orders o JOIN tf_demo_orders d ON d.id=o.order_id
SET o.order_status=d.target_status,o.payment_status=IF(o.payment_status='PAID','PAID','FAILED'),
 o.cancel_reason=IF(d.target_status='CANCELLED','Khách thay đổi kế hoạch (demo)','Quán hết món / quá tải (demo)'),
 o.cancelled_at=LEAST(DATE_ADD(d.created_at,INTERVAL 8 MINUTE),@seed_now),
 o.updated_at=LEAST(DATE_ADD(d.created_at,INTERVAL 8 MINUTE),@seed_now)
WHERE d.target_status IN ('CANCELLED','REJECTED');
UPDATE orders o JOIN tf_demo_orders d ON d.id=o.order_id
SET o.payment_status='REFUNDED',o.updated_at=LEAST(DATE_ADD(d.created_at,INTERVAL 60 MINUTE),@seed_now)
WHERE d.target_status='REJECTED' AND d.method='ONLINE' AND MOD(d.n,20)=18;

INSERT INTO payments(order_id,provider,transaction_code,amount,payment_status,response_code,paid_at,created_at)
SELECT o.order_id,IF(o.payment_method='COD','COD','VIETQR'),REPLACE(o.order_code,'-',''),o.total_amount,
 CASE o.payment_status WHEN 'PAID' THEN 'SUCCESS' WHEN 'FAILED' THEN 'FAILED' WHEN 'REFUNDED' THEN 'REFUNDED' ELSE 'PENDING' END,
 CASE WHEN o.payment_status='UNPAID' THEN NULL WHEN o.payment_status='FAILED' THEN o.order_status WHEN o.payment_method='COD' THEN 'COD' ELSE 'MANUAL' END,
 CASE WHEN o.payment_status IN ('PAID','REFUNDED') THEN IF(o.payment_method='COD',o.completed_at,o.confirmed_at) ELSE NULL END,o.created_at
FROM orders o WHERE o.order_id>=10000;

INSERT INTO customer_reviews(order_id,customer_id,restaurant_id,rating,content,created_at,updated_at)
SELECT o.order_id,o.customer_id,o.restaurant_id,CASE WHEN MOD(o.order_id,17)=0 THEN 2 WHEN MOD(o.order_id,7)=0 THEN 3 ELSE 4+MOD(o.order_id,2) END,
 ELT(MOD(o.order_id,4)+1,'Món ngon, đóng gói cẩn thận và giao đúng địa chỉ.','Khẩu phần vừa đủ, đồ ăn còn nóng khi nhận.','Quán chuẩn bị món nhanh, sẽ tiếp tục đặt lần sau.','Hương vị phù hợp, mong quán cải thiện thời gian giao hàng.'),
 LEAST(DATE_ADD(o.completed_at,INTERVAL 2 HOUR),@seed_now),LEAST(DATE_ADD(o.completed_at,INTERVAL 2 HOUR),@seed_now)
FROM orders o WHERE o.order_id>=10000 AND o.order_status='COMPLETED' AND MOD(o.order_id,5)=0;
INSERT INTO review_replies(review_id,partner_id,content,created_at,updated_at)
SELECT v.review_id,r.owner_user_id,'Cảm ơn bạn đã ủng hộ. Quán rất mong được phục vụ bạn lần sau!',v.created_at,v.created_at
FROM customer_reviews v JOIN restaurants r ON r.restaurant_id=v.restaurant_id WHERE v.order_id>=10000 AND MOD(v.review_id,3)=0;
INSERT INTO review_reports(review_id,reporter_id,reason_code,reason,status,created_at)
SELECT v.review_id,r.owner_user_id,'OTHER','Đề nghị kiểm tra nội dung đánh giá mẫu này.','OPEN',v.created_at
FROM customer_reviews v JOIN restaurants r ON r.restaurant_id=v.restaurant_id WHERE v.order_id>=10000 AND MOD(v.review_id,29)=0;
INSERT INTO complaints(customer_id,order_id,title,content,complaint_status,created_at,updated_at)
SELECT customer_id,order_id,'Phản hồi đơn hàng mẫu','Khách muốn được hỗ trợ kiểm tra thời gian và tình trạng giao hàng.','OPEN',updated_at,updated_at
FROM orders WHERE order_id>=10000 AND MOD(order_id,101)=0;
COMMIT;

-- Bring the small original fixture up to the final schema as well.
UPDATE order_items i JOIN menu_items m ON m.item_id=i.item_id LEFT JOIN menu_categories c ON c.category_id=m.category_id
SET i.category_name=c.category_name WHERE i.order_id=1;
INSERT INTO order_history(order_id,to_status,to_payment,created_at)
SELECT order_id,order_status,payment_status,created_at FROM orders WHERE order_id=1;
UPDATE payments SET provider='VIETQR',response_code='MANUAL' WHERE order_id=1;

DROP TEMPORARY TABLE tf_demo_orders;
DROP TEMPORARY TABLE tf_menu;
DROP TEMPORARY TABLE tf_shops;
DROP TEMPORARY TABLE tf_numbers;
DROP TEMPORARY TABLE tf_digits;
SELECT 'ThunderFood FINAL ready' AS result,
 (SELECT COUNT(*) FROM users) AS users,(SELECT COUNT(*) FROM orders) AS orders,
 (SELECT COUNT(*) FROM order_items) AS order_lines,(SELECT COUNT(*) FROM order_history) AS history_rows;
