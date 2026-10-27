DROP DATABASE IF EXISTS thunderfood;

CREATE DATABASE thunderfood
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE thunderfood;

SET NAMES utf8mb4;

CREATE TABLE roles (
  role_id     TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_code   VARCHAR(30)  NOT NULL,
  role_name   VARCHAR(100) NOT NULL,
  PRIMARY KEY (role_id),
  UNIQUE KEY uq_roles_code (role_code)
) ENGINE=InnoDB;

CREATE TABLE users (
  user_id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_id         TINYINT UNSIGNED NOT NULL,
  full_name       VARCHAR(120) NOT NULL,
  email           VARCHAR(190) NOT NULL,
  phone           VARCHAR(15)  NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  avatar_url      VARCHAR(1000) NULL,
  address         VARCHAR(500) NULL,
  account_status  ENUM('ACTIVE','LOCKED') NOT NULL DEFAULT 'ACTIVE',
  lock_reason     VARCHAR(500) NULL,
  locked_by       BIGINT UNSIGNED NULL,
  locked_at       DATETIME NULL,
  last_login_at   DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone),
  KEY idx_users_role_status (role_id, account_status),
  KEY idx_users_name (full_name),
  CONSTRAINT chk_users_email CHECK (email LIKE '%_@_%._%'),
  CONSTRAINT chk_users_phone CHECK (phone REGEXP '^0[0-9]{9}$'),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id)
    REFERENCES roles(role_id) ON DELETE RESTRICT,
  CONSTRAINT fk_users_locked_by FOREIGN KEY (locked_by)
    REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE restaurants (
  restaurant_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_user_id    BIGINT UNSIGNED NOT NULL,
  restaurant_name  VARCHAR(180) NOT NULL,
  description      TEXT NULL,
  phone            VARCHAR(15)  NOT NULL,
  address          VARCHAR(500) NOT NULL,
  image_url        VARCHAR(1000) NULL,
  opening_time     TIME NULL,
  closing_time     TIME NULL,
  delivery_fee     DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_open          TINYINT(1) NOT NULL DEFAULT 0,
  status           ENUM('PENDING','APPROVED','REJECTED','LOCKED')
                     NOT NULL DEFAULT 'PENDING',
  status_reason    VARCHAR(500) NULL,
  reviewed_by      BIGINT UNSIGNED NULL,
  reviewed_at      DATETIME NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                     ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (restaurant_id),
  UNIQUE KEY uq_restaurants_owner (owner_user_id),
  KEY idx_restaurants_status_open (status, is_open),
  KEY idx_restaurants_name (restaurant_name),
  CONSTRAINT chk_restaurants_fee CHECK (delivery_fee >= 0),
  CONSTRAINT fk_restaurants_owner FOREIGN KEY (owner_user_id)
    REFERENCES users(user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_restaurants_reviewer FOREIGN KEY (reviewed_by)
    REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE menu_categories (
  category_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id  BIGINT UNSIGNED NOT NULL,
  category_name  VARCHAR(120) NOT NULL,
  display_order  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_category_name (restaurant_id, category_name),
  CONSTRAINT fk_categories_restaurant FOREIGN KEY (restaurant_id)
    REFERENCES restaurants(restaurant_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE menu_items (
  item_id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id    BIGINT UNSIGNED NOT NULL,
  category_id      BIGINT UNSIGNED NULL,
  item_name        VARCHAR(180) NOT NULL,
  description      TEXT NULL,
  price            DECIMAL(12,2) NOT NULL,
  image_url        VARCHAR(1000) NULL,
  is_available     TINYINT(1) NOT NULL DEFAULT 1,
  approval_status  ENUM('PENDING','APPROVED','REJECTED','HIDDEN')
                     NOT NULL DEFAULT 'PENDING',
  status_reason    VARCHAR(500) NULL,
  reviewed_by      BIGINT UNSIGNED NULL,
  reviewed_at      DATETIME NULL,
  is_deleted       TINYINT(1) NOT NULL DEFAULT 0,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                     ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (item_id),
  KEY idx_items_browse (restaurant_id, is_deleted, approval_status, is_available),
  KEY idx_items_category (category_id),
  KEY idx_items_name (item_name),
  KEY idx_items_approval (approval_status, created_at),
  CONSTRAINT chk_items_price CHECK (price >= 0),
  CONSTRAINT fk_items_restaurant FOREIGN KEY (restaurant_id)
    REFERENCES restaurants(restaurant_id) ON DELETE RESTRICT,
  CONSTRAINT fk_items_category FOREIGN KEY (category_id)
    REFERENCES menu_categories(category_id) ON DELETE SET NULL,
  CONSTRAINT fk_items_reviewer FOREIGN KEY (reviewed_by)
    REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE cart_items (
  cart_item_id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  item_id       BIGINT UNSIGNED NOT NULL,
  quantity      SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  note          VARCHAR(500) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                  ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (cart_item_id),
  UNIQUE KEY uq_cart_user_item (user_id, item_id),
  KEY idx_cart_item (item_id),
  CONSTRAINT chk_cart_quantity CHECK (quantity BETWEEN 1 AND 99),
  CONSTRAINT fk_cart_user FOREIGN KEY (user_id)
    REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_item FOREIGN KEY (item_id)
    REFERENCES menu_items(item_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE orders (
  order_id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_code        VARCHAR(32) NOT NULL,
  customer_id       BIGINT UNSIGNED NOT NULL,
  restaurant_id     BIGINT UNSIGNED NOT NULL,
  recipient_name    VARCHAR(120) NOT NULL,
  recipient_phone   VARCHAR(15)  NOT NULL,
  delivery_address  VARCHAR(500) NOT NULL,
  note              VARCHAR(1000) NULL,
  order_status      ENUM('PENDING','CONFIRMED','PREPARING','DELIVERING',
                         'COMPLETED','CANCELLED','REJECTED')
                      NOT NULL DEFAULT 'PENDING',
  payment_method    ENUM('COD','ONLINE') NOT NULL DEFAULT 'COD',
  payment_status    ENUM('UNPAID','PAID','FAILED','REFUNDED')
                      NOT NULL DEFAULT 'UNPAID',
  subtotal          DECIMAL(12,2) NOT NULL,
  delivery_fee      DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount      DECIMAL(12,2) NOT NULL,
  cancel_reason     VARCHAR(500) NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at      DATETIME NULL,
  completed_at      DATETIME NULL,
  cancelled_at      DATETIME NULL,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                      ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id),
  UNIQUE KEY uq_orders_code (order_code),
  UNIQUE KEY uq_orders_owner (order_id, customer_id, restaurant_id),
  KEY idx_orders_customer (customer_id, created_at),
  KEY idx_orders_restaurant (restaurant_id, order_status, created_at),
  KEY idx_orders_status_date (order_status, created_at),
  CONSTRAINT chk_orders_amounts CHECK (
    subtotal >= 0 AND delivery_fee >= 0
    AND total_amount = subtotal + delivery_fee
  ),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id)
    REFERENCES users(user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_restaurant FOREIGN KEY (restaurant_id)
    REFERENCES restaurants(restaurant_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE order_items (
  order_item_id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id       BIGINT UNSIGNED NOT NULL,
  item_id        BIGINT UNSIGNED NULL,
  item_name      VARCHAR(180) NOT NULL,
  unit_price     DECIMAL(12,2) NOT NULL,
  quantity       SMALLINT UNSIGNED NOT NULL,
  line_total     DECIMAL(12,2) NOT NULL,
  note           VARCHAR(500) NULL,
  PRIMARY KEY (order_item_id),
  KEY idx_order_items_order (order_id),
  KEY idx_order_items_item (item_id),
  CONSTRAINT chk_order_items CHECK (
    unit_price >= 0 AND quantity > 0 AND line_total = unit_price * quantity
  ),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id)
    REFERENCES orders(order_id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_item FOREIGN KEY (item_id)
    REFERENCES menu_items(item_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE payments (
  payment_id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id          BIGINT UNSIGNED NOT NULL,
  provider          VARCHAR(30) NOT NULL,
  transaction_code  VARCHAR(190) NULL,
  amount            DECIMAL(12,2) NOT NULL,
  payment_status    ENUM('PENDING','SUCCESS','FAILED','REFUNDED')
                      NOT NULL DEFAULT 'PENDING',
  response_code     VARCHAR(50) NULL,
  paid_at           DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  UNIQUE KEY uq_payments_tx (provider, transaction_code),
  KEY idx_payments_order (order_id, payment_status),
  CONSTRAINT chk_payments_amount CHECK (amount >= 0),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id)
    REFERENCES orders(order_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE reviews (
  review_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id       BIGINT UNSIGNED NOT NULL,
  customer_id    BIGINT UNSIGNED NOT NULL,
  restaurant_id  BIGINT UNSIGNED NOT NULL,
  rating         TINYINT UNSIGNED NOT NULL,
  content        TEXT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                   ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (review_id),
  UNIQUE KEY uq_reviews_order (order_id),
  KEY idx_reviews_restaurant (restaurant_id, created_at),
  KEY idx_reviews_customer (customer_id),
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_reviews_order FOREIGN KEY (order_id, customer_id, restaurant_id)
    REFERENCES orders(order_id, customer_id, restaurant_id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_customer FOREIGN KEY (customer_id)
    REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_restaurant FOREIGN KEY (restaurant_id)
    REFERENCES restaurants(restaurant_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE complaints (
  complaint_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id       BIGINT UNSIGNED NOT NULL,
  order_id          BIGINT UNSIGNED NULL,
  title             VARCHAR(180) NOT NULL,
  content           TEXT NOT NULL,
  complaint_status  ENUM('OPEN','PROCESSING','RESOLVED','REJECTED')
                      NOT NULL DEFAULT 'OPEN',
  response          TEXT NULL,
  handled_by        BIGINT UNSIGNED NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                      ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (complaint_id),
  KEY idx_complaints_customer (customer_id, created_at),
  KEY idx_complaints_status (complaint_status, created_at),
  KEY idx_complaints_order (order_id),
  CONSTRAINT fk_complaints_customer FOREIGN KEY (customer_id)
    REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_complaints_order FOREIGN KEY (order_id)
    REFERENCES orders(order_id) ON DELETE SET NULL,
  CONSTRAINT fk_complaints_handler FOREIGN KEY (handled_by)
    REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO roles (role_id, role_code, role_name) VALUES
(1, 'CUSTOMER',           'Khách hàng'),
(2, 'RESTAURANT_PARTNER', 'Đối tác nhà hàng'),
(3, 'ADMIN',              'Quản trị viên');

INSERT INTO users
(user_id, role_id, full_name, email, phone, password_hash, address,
 account_status, lock_reason, locked_by, locked_at)
VALUES
(1, 3, 'Lê Minh',   'admin@thunderfood.vn',        '0900000001', '$2a$10$/U7MF4Gkby5kE7UZrkMrvuEBs4IWO4B0P8jpeDtpf5n8ZqDHm4xi.', NULL,
 'ACTIVE', NULL, NULL, NULL),
(2, 2, 'Trần Bình', 'partner@example.com',         '0900000002', '$2a$10$riULf1bSJaJRyvrwoySAtuwttI2SbOEEhCXO3LeBZJbJzlX3TzUNm', NULL,
 'ACTIVE', NULL, NULL, NULL),
(3, 2, 'Võ Lan',    'partner.pending@example.com', '0900000003', '$2a$10$.VRMwLVE7u07.eBmyhSY5.ONhwiYgRhbuuODJhOGLKD8YHKtcBxje', NULL,
 'ACTIVE', NULL, NULL, NULL),
(4, 1, 'Nguyễn An', 'customer@example.com',        '0900000004', '$2a$10$5OLGXDa/niLtE2vSaG/dxezF6ZGxW40RsZYpsjz9GgUbcbyBgjsMm',
 '12 Nguyễn Huệ, Phường Sài Gòn, TP. Hồ Chí Minh', 'ACTIVE', NULL, NULL, NULL),
(5, 1, 'Hồ Tâm',    'customer.locked@example.com', '0900000005', '$2a$10$kVGvSL2Apdc7j9BGtcr.E.7c2unKOY6IglDCSGc5ZGQMqvG1PeHhS', NULL,
 'LOCKED', 'Spam đánh giá', 1, NOW());

INSERT INTO restaurants
(restaurant_id, owner_user_id, restaurant_name, description, phone, address,
 opening_time, closing_time, delivery_fee, is_open, status, reviewed_by, reviewed_at)
VALUES
(1, 2, 'Bếp Nhà Bình', 'Món ăn Việt Nam nấu trong ngày', '0280000001',
 '20 Lê Lợi, Phường Sài Gòn, TP. Hồ Chí Minh', '08:00:00', '22:00:00',
 15000, 1, 'APPROVED', 1, NOW()),
(2, 3, 'Trà Sữa Lan', 'Trà sữa và ăn vặt', '0280000002',
 '5 Lê Thánh Tôn, Phường Bến Thành, TP. Hồ Chí Minh', '09:00:00', '21:00:00',
 10000, 0, 'PENDING', NULL, NULL);

INSERT INTO menu_categories (category_id, restaurant_id, category_name, display_order) VALUES
(1, 1, 'Món chính', 1),
(2, 1, 'Đồ uống', 2);

INSERT INTO menu_items
(item_id, restaurant_id, category_id, item_name, description, price,
 is_available, approval_status, reviewed_by, reviewed_at)
VALUES
(1, 1, 1, 'Cơm gà nướng',   'Cơm gà nướng ăn kèm rau',      55000, 1, 'APPROVED', 1, NOW()),
(2, 1, 1, 'Bún thịt nướng', 'Bún, thịt nướng và nước mắm', 50000, 1, 'APPROVED', 1, NOW()),
(3, 1, 2, 'Trà tắc',        'Trà tắc mát lạnh',            18000, 1, 'APPROVED', 1, NOW()),
(4, 1, 1, 'Cơm sườn',       'Món mới chờ duyệt',           50000, 1, 'PENDING',  NULL, NULL);

INSERT INTO cart_items (user_id, item_id, quantity, note) VALUES
(4, 1, 2, 'Ít cơm'),
(4, 3, 1, 'Ít đá');

INSERT INTO orders
(order_id, order_code, customer_id, restaurant_id, recipient_name, recipient_phone,
 delivery_address, note, order_status, payment_method, payment_status,
 subtotal, delivery_fee, total_amount, created_at, confirmed_at, completed_at)
VALUES
(1, 'TF-20261024-0001', 4, 1, 'Nguyễn An', '0900000004',
 '12 Nguyễn Huệ, Phường Sài Gòn, TP. Hồ Chí Minh', 'Gọi trước khi giao',
 'COMPLETED', 'ONLINE', 'PAID', 73000, 15000, 88000,
 NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 2 DAY);

INSERT INTO order_items (order_id, item_id, item_name, unit_price, quantity, line_total) VALUES
(1, 1, 'Cơm gà nướng', 55000, 1, 55000),
(1, 3, 'Trà tắc',      18000, 1, 18000);

INSERT INTO payments
(order_id, provider, transaction_code, amount, payment_status, response_code, paid_at)
VALUES
(1, 'VNPAY', 'DEMO-TXN-0001', 88000, 'SUCCESS', '00', NOW() - INTERVAL 2 DAY);

INSERT INTO reviews (order_id, customer_id, restaurant_id, rating, content) VALUES
(1, 4, 1, 5, 'Món ăn ngon, giao hàng nhanh.');

INSERT INTO complaints (customer_id, order_id, title, content, complaint_status) VALUES
(4, 1, 'Giao hàng hơi trễ', 'Đơn giao trễ khoảng 15 phút.', 'OPEN');
