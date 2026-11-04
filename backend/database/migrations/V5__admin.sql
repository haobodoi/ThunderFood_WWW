-- Additive, repeatable MariaDB migration. Run on the existing v4 database; NEVER reimport v4.
USE thunderfood;
SET NAMES utf8mb4;
INSERT IGNORE INTO roles (role_code, role_name) VALUES ('STAFF', 'Nhân viên vận hành');
ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS category_name VARCHAR(120) NULL;
CREATE INDEX IF NOT EXISTS idx_orders_admin_date ON orders(created_at, order_id);
CREATE INDEX IF NOT EXISTS idx_users_admin_date ON users(created_at, user_id);

CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(80) NOT NULL,
  target VARCHAR(120) NOT NULL,
  detail VARCHAR(1000) NOT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_admin_logs_date(created_at, id),
  KEY idx_admin_logs_actor(actor_id, created_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS order_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(20) NULL,
  to_status VARCHAR(20) NOT NULL,
  from_payment VARCHAR(20) NULL,
  to_payment VARCHAR(20) NOT NULL,
  reason VARCHAR(500) NULL,
  created_at DATETIME NOT NULL,
  KEY idx_order_history(order_id, id),
  CONSTRAINT fk_history_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- Database history captures customer, partner and admin transitions atomically.
-- CREATE OR REPLACE keeps this migration repeatable without deleting existing history.
DELIMITER //
CREATE OR REPLACE TRIGGER tf_order_insert AFTER INSERT ON orders FOR EACH ROW
BEGIN
  INSERT INTO order_history(order_id,to_status,to_payment,created_at)
  VALUES(NEW.order_id,NEW.order_status,NEW.payment_status,NEW.created_at);
END//
CREATE OR REPLACE TRIGGER tf_order_update AFTER UPDATE ON orders FOR EACH ROW
BEGIN
  IF OLD.order_status <> NEW.order_status OR OLD.payment_status <> NEW.payment_status THEN
    INSERT INTO order_history(order_id,from_status,to_status,from_payment,to_payment,reason,created_at)
    VALUES(NEW.order_id,OLD.order_status,NEW.order_status,OLD.payment_status,NEW.payment_status,NEW.cancel_reason,NEW.updated_at);
  END IF;
END//
CREATE OR REPLACE TRIGGER tf_item_category_snapshot BEFORE INSERT ON order_items FOR EACH ROW
BEGIN
  IF NEW.category_name IS NULL THEN
    SET NEW.category_name = (SELECT c.category_name FROM menu_items i LEFT JOIN menu_categories c ON c.category_id=i.category_id WHERE i.item_id=NEW.item_id LIMIT 1);
  END IF;
END//
DELIMITER ;
