-- ============================================================================
-- THUNDERFOOD DATABASE SCRIPT - VERSION 2.0 (FULL SCHEMA + RICH MENU & STORE SEED)
-- Kế thừa 100% cấu trúc 14 bảng của v1 (thunderfood_mariadb.sql)
-- Bổ sung đầy đủ hình ảnh (avatar_image, cover_image, image_url), 6 nhà hàng APPROVED
-- và 24 món ăn thực tế phân theo danh mục phục vụ Module 2 (Nhà hàng & Món ăn - Công)
-- ============================================================================

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
  restaurant_id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_user_id           BIGINT UNSIGNED NOT NULL,
  brand_name              VARCHAR(60)  NOT NULL,
  specialty               VARCHAR(60)  NULL,
  area_name               VARCHAR(60)  NULL,
  restaurant_name         VARCHAR(200) NOT NULL,
  phone                   VARCHAR(15)  NOT NULL,
  province                VARCHAR(100) NOT NULL,
  ward                    VARCHAR(100) NOT NULL,
  street_address          VARCHAR(255) NOT NULL,
  address                 VARCHAR(500) NOT NULL,
  business_type           ENUM('INDIVIDUAL','HOUSEHOLD','COMPANY') NULL,
  business_name           VARCHAR(200) NULL,
  tax_code                VARCHAR(20)  NULL,
  business_license_image  VARCHAR(500) NULL,
  rep_full_name           VARCHAR(120) NULL,
  rep_email               VARCHAR(190) NULL,
  rep_phone               VARCHAR(15)  NULL,
  rep_phone_alt           VARCHAR(15)  NULL,
  id_number               VARCHAR(20)  NULL,
  id_issued_date          DATE NULL,
  id_issued_place         VARCHAR(150) NULL,
  id_front_image          VARCHAR(500) NULL,
  id_back_image           VARCHAR(500) NULL,
  bank_name               VARCHAR(120) NULL,
  bank_branch             VARCHAR(120) NULL,
  bank_account_number     VARCHAR(30)  NULL,
  bank_account_holder     VARCHAR(120) NULL,
  description             VARCHAR(1000) NULL,
  avatar_image            VARCHAR(500) NULL,
  cover_image             VARCHAR(500) NULL,
  delivery_fee            DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_open                 TINYINT(1) NOT NULL DEFAULT 0,
  registration_step       TINYINT UNSIGNED NOT NULL DEFAULT 1,
  status                  ENUM('DRAFT','PENDING','APPROVED','REJECTED','LOCKED')
                            NOT NULL DEFAULT 'DRAFT',
  status_reason           VARCHAR(500) NULL,
  submitted_at            DATETIME NULL,
  reviewed_by             BIGINT UNSIGNED NULL,
  reviewed_at             DATETIME NULL,
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                            ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (restaurant_id),
  KEY idx_restaurants_owner (owner_user_id, status),
  KEY idx_restaurants_status (status, submitted_at),
  KEY idx_restaurants_status_open (status, is_open),
  KEY idx_restaurants_name (restaurant_name),
  KEY idx_restaurants_province (province, ward),
  CONSTRAINT chk_restaurants_fee CHECK (delivery_fee >= 0),
  CONSTRAINT chk_restaurants_step CHECK (registration_step BETWEEN 1 AND 4),
  CONSTRAINT fk_restaurants_owner FOREIGN KEY (owner_user_id)
    REFERENCES users(user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_restaurants_reviewer FOREIGN KEY (reviewed_by)
    REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE restaurant_opening_hours (
  opening_hour_id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id    BIGINT UNSIGNED NOT NULL,
  day_of_week      TINYINT UNSIGNED NOT NULL,
  open_time        TIME NOT NULL,
  close_time       TIME NOT NULL,
  PRIMARY KEY (opening_hour_id),
  KEY idx_opening_hours_restaurant (restaurant_id, day_of_week),
  CONSTRAINT chk_opening_hours_day CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT chk_opening_hours_time CHECK (close_time > open_time),
  CONSTRAINT fk_opening_hours_restaurant FOREIGN KEY (restaurant_id)
    REFERENCES restaurants(restaurant_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE tags (
  tag_id         SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tag_type       ENUM('SERVICE_TYPE','CUISINE') NOT NULL,
  tag_name       VARCHAR(100) NOT NULL,
  display_order  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tag_id),
  UNIQUE KEY uq_tags_type_name (tag_type, tag_name)
) ENGINE=InnoDB;

CREATE TABLE restaurant_tags (
  restaurant_id  BIGINT UNSIGNED NOT NULL,
  tag_id         SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (restaurant_id, tag_id),
  KEY idx_restaurant_tags_tag (tag_id),
  CONSTRAINT fk_restaurant_tags_restaurant FOREIGN KEY (restaurant_id)
    REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
  CONSTRAINT fk_restaurant_tags_tag FOREIGN KEY (tag_id)
    REFERENCES tags(tag_id) ON DELETE CASCADE
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

-- ============================================================================
-- 1. SEED ROLES & USERS
-- ============================================================================
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

-- ============================================================================
-- 2. SEED TAGS
-- ============================================================================
INSERT INTO tags (tag_id, tag_type, tag_name, display_order) VALUES
(1,  'SERVICE_TYPE', 'Nhà hàng', 1),
(2,  'SERVICE_TYPE', 'Quán ăn', 2),
(3,  'SERVICE_TYPE', 'Cà phê / Trà sữa', 3),
(4,  'SERVICE_TYPE', 'Ăn vặt / Vỉa hè', 4),
(5,  'SERVICE_TYPE', 'Tiệm bánh', 5),
(6,  'SERVICE_TYPE', 'Quán nhậu', 6),
(7,  'SERVICE_TYPE', 'Buffet', 7),
(8,  'SERVICE_TYPE', 'Giao hàng tận nơi', 8),
(20, 'CUISINE', 'Món Việt', 1),
(21, 'CUISINE', 'Món Bắc', 2),
(22, 'CUISINE', 'Món miền Trung', 3),
(23, 'CUISINE', 'Món miền Nam', 4),
(24, 'CUISINE', 'Món Hàn', 5),
(25, 'CUISINE', 'Món Nhật', 6),
(26, 'CUISINE', 'Món Hoa', 7),
(27, 'CUISINE', 'Món Thái', 8),
(28, 'CUISINE', 'Món Âu', 9),
(29, 'CUISINE', 'Món chay', 10),
(30, 'CUISINE', 'Đồ uống', 11),
(31, 'CUISINE', 'Tráng miệng / Chè', 12),
(32, 'CUISINE', 'Bánh mì', 13),
(33, 'CUISINE', 'Lẩu / Nướng', 14);

-- ============================================================================
-- 3. SEED RESTAURANTS (6 QUÁN APPROVED + 1 QUÁN PENDING + 1 QUÁN DRAFT)
-- ============================================================================
INSERT INTO restaurants
(restaurant_id, owner_user_id, brand_name, specialty, area_name, restaurant_name, phone,
 province, ward, street_address, address,
 business_type, business_name, tax_code,
 rep_full_name, rep_email, rep_phone, rep_phone_alt, id_number, id_issued_date, id_issued_place,
 bank_name, bank_branch, bank_account_number, bank_account_holder,
 description, avatar_image, cover_image, delivery_fee, is_open, registration_step, status, submitted_at, reviewed_by, reviewed_at)
VALUES
(1, 2, 'Bếp Nhà Bình', 'Cơm gà', 'Lê Lợi', 'Bếp Nhà Bình - Cơm gà - Lê Lợi', '0280000001',
 'Thành phố Hồ Chí Minh', 'Phường Sài Gòn', '20 Lê Lợi',
 '20 Lê Lợi, Phường Sài Gòn, Thành phố Hồ Chí Minh',
 'INDIVIDUAL', NULL, NULL,
 'Trần Bình', 'partner@example.com', '0900000002', NULL, '079200000002', '2021-06-15', 'Cục Cảnh sát QLHC về TTXH',
 'Vietcombank', 'Chi nhánh Sài Gòn', '0123456789', 'TRAN BINH',
 'Cơm gà nướng mật ong, bún thịt nướng than hoa và món Việt nấu mới trong ngày.',
 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=300&q=80',
 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=1000&q=80',
 15000, 1, 4, 'APPROVED',
 NOW() - INTERVAL 10 DAY, 1, NOW() - INTERVAL 9 DAY),

(2, 3, 'Trà Sữa Lan', 'Trà sữa', 'Lê Thánh Tôn', 'Trà Sữa Lan - Trà sữa - Lê Thánh Tôn', '0280000002',
 'Thành phố Hồ Chí Minh', 'Phường Bến Thành', '5 Lê Thánh Tôn',
 '5 Lê Thánh Tôn, Phường Bến Thành, Thành phố Hồ Chí Minh',
 'HOUSEHOLD', 'Hộ kinh doanh Trà Sữa Lan', '0312345678',
 'Võ Lan', 'partner.pending@example.com', '0900000003', '0911111111', '079200000003', '2022-03-20', 'Cục Cảnh sát QLHC về TTXH',
 'Techcombank', 'Chi nhánh Bến Thành', '1903000000001', 'VO LAN',
 'Trà sữa và ăn vặt',
 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=300&q=80',
 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=1000&q=80',
 10000, 0, 4, 'PENDING',
 NOW() - INTERVAL 1 DAY, NULL, NULL),

(4, 2, 'Phở Thìn Bờ Hồ', 'Phở & Bún bò', 'Nguyễn Huệ', 'Phở Thìn Gia Truyền - Nguyễn Huệ', '0283822119',
 'Thành phố Hồ Chí Minh', 'Phường Sài Gòn', '68 Nguyễn Huệ',
 '68 Nguyễn Huệ, Phường Sài Gòn, Thành phố Hồ Chí Minh',
 'INDIVIDUAL', NULL, NULL,
 'Trần Bình', 'partner@example.com', '0900000002', NULL, '079200000002', '2021-06-15', 'Cục Cảnh sát QLHC về TTXH',
 'Vietcombank', 'Chi nhánh Sài Gòn', '0123456789', 'TRAN BINH',
 'Nước dùng ninh xương bò 18 tiếng, thịt bò tái lăn dậy mùi gừng tỏi truyền thống.',
 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=300&q=80',
 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=1000&q=80',
 12000, 1, 4, 'APPROVED',
 NOW() - INTERVAL 8 DAY, 1, NOW() - INTERVAL 7 DAY),

(5, 2, 'The Tea House', 'Trà sữa & Đồ uống', 'Đồng Khởi', 'Tiệm Trà Đào & Trà Sữa Oolong - Đồng Khởi', '0283829445',
 'Thành phố Hồ Chí Minh', 'Phường Sài Gòn', '115 Đồng Khởi',
 '115 Đồng Khởi, Phường Sài Gòn, Thành phố Hồ Chí Minh',
 'INDIVIDUAL', NULL, NULL,
 'Trần Bình', 'partner@example.com', '0900000002', NULL, '079200000002', '2021-06-15', 'Cục Cảnh sát QLHC về TTXH',
 'Vietcombank', 'Chi nhánh Sài Gòn', '0123456789', 'TRAN BINH',
 'Trà nguyên lá ủ lạnh kết hợp trái cây nhiệt đới tươi mới và trân châu hoàng kim nấu mỗi 2 giờ.',
 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=300&q=80',
 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1000&q=80',
 10000, 1, 4, 'APPROVED',
 NOW() - INTERVAL 7 DAY, 1, NOW() - INTERVAL 6 DAY),

(6, 2, 'Bánh Mì Hội An', 'Bánh mì & Ăn vặt', 'Pasteur', 'Bánh Mì Phố Cổ & Gỏi Cuốn - Pasteur', '0283823998',
 'Thành phố Hồ Chí Minh', 'Phường Bến Thành', '142 Pasteur',
 '142 Pasteur, Phường Bến Thành, Thành phố Hồ Chí Minh',
 'INDIVIDUAL', NULL, NULL,
 'Trần Bình', 'partner@example.com', '0900000002', NULL, '079200000002', '2021-06-15', 'Cục Cảnh sát QLHC về TTXH',
 'Vietcombank', 'Chi nhánh Sài Gòn', '0123456789', 'TRAN BINH',
 'Bánh mì vỏ giòn nóng hổi, pate gan nhà làm béo mịn và gỏi cuốn tôm thịt tươi rói.',
 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=300&q=80',
 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=1000&q=80',
 12000, 1, 4, 'APPROVED',
 NOW() - INTERVAL 6 DAY, 1, NOW() - INTERVAL 5 DAY),

(7, 2, 'Cơm Tấm Sài Gòn Xưa', 'Cơm tấm sườn bì chả', 'Võ Văn Tần', 'Cơm Tấm Sườn Nướng Than Hoa - Võ Văn Tần', '0283930556',
 'Thành phố Hồ Chí Minh', 'Phường Bến Thành', '88 Võ Văn Tần',
 '88 Võ Văn Tần, Phường Bến Thành, Thành phố Hồ Chí Minh',
 'INDIVIDUAL', NULL, NULL,
 'Trần Bình', 'partner@example.com', '0900000002', NULL, '079200000002', '2021-06-15', 'Cục Cảnh sát QLHC về TTXH',
 'Vietcombank', 'Chi nhánh Sài Gòn', '0123456789', 'TRAN BINH',
 'Sườn cốt lết ướp mật ong nướng lửa than hồng, hạt tấm dẻo thơm kèm mỡ hành tóp mỡ giòn tan.',
 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=300&q=80',
 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1000&q=80',
 15000, 1, 4, 'APPROVED',
 NOW() - INTERVAL 5 DAY, 1, NOW() - INTERVAL 4 DAY),

(8, 2, 'Thunder BBQ & Hotpot', 'Lẩu & Nướng BBQ', 'Bến Thành', 'Lẩu Thái Tomyum & Bò Nướng Sấm Sét - Bến Thành', '0283825779',
 'Thành phố Hồ Chí Minh', 'Phường Bến Thành', '25 Lý Tự Trọng',
 '25 Lý Tự Trọng, Phường Bến Thành, Thành phố Hồ Chí Minh',
 'INDIVIDUAL', NULL, NULL,
 'Trần Bình', 'partner@example.com', '0900000002', NULL, '079200000002', '2021-06-15', 'Cục Cảnh sát QLHC về TTXH',
 'Vietcombank', 'Chi nhánh Sài Gòn', '0123456789', 'TRAN BINH',
 'Combo lẩu nướng tại gia chuẩn vị nhà hàng, đóng gói giữ nhiệt chuyên dụng giao nhanh.',
 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=300&q=80',
 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80',
 18000, 1, 4, 'APPROVED',
 NOW() - INTERVAL 4 DAY, 1, NOW() - INTERVAL 3 DAY);

INSERT INTO restaurants
(restaurant_id, owner_user_id, brand_name, specialty, area_name, restaurant_name, phone,
 province, ward, street_address, address, registration_step, status)
VALUES
(3, 2, 'Bếp Nhà Bình', 'Bún bò', 'Thủ Đức', 'Bếp Nhà Bình - Bún bò - Thủ Đức', '0280000003',
 'Thành phố Hồ Chí Minh', 'Phường Thủ Đức', '12 Võ Văn Ngân',
 '12 Võ Văn Ngân, Phường Thủ Đức, Thành phố Hồ Chí Minh', 1, 'DRAFT');

-- ============================================================================
-- 4. SEED OPENING HOURS & TAGS
-- ============================================================================
INSERT INTO restaurant_opening_hours (restaurant_id, day_of_week, open_time, close_time) VALUES
(1, 1, '08:00:00', '22:00:00'), (1, 2, '08:00:00', '22:00:00'), (1, 3, '08:00:00', '22:00:00'),
(1, 4, '08:00:00', '22:00:00'), (1, 5, '08:00:00', '22:00:00'), (1, 6, '08:00:00', '22:00:00'),
(1, 7, '09:00:00', '21:00:00'),
(2, 1, '09:00:00', '13:00:00'), (2, 1, '16:00:00', '21:00:00'),
(2, 2, '09:00:00', '21:00:00'), (2, 3, '09:00:00', '21:00:00'), (2, 4, '09:00:00', '21:00:00'),
(2, 5, '09:00:00', '21:00:00'), (2, 6, '09:00:00', '22:00:00'),
(4, 1, '06:30:00', '22:00:00'), (4, 2, '06:30:00', '22:00:00'), (4, 3, '06:30:00', '22:00:00'),
(4, 4, '06:30:00', '22:00:00'), (4, 5, '06:30:00', '22:00:00'), (4, 6, '06:30:00', '22:30:00'), (4, 7, '06:30:00', '22:30:00'),
(5, 1, '08:00:00', '22:30:00'), (5, 2, '08:00:00', '22:30:00'), (5, 3, '08:00:00', '22:30:00'),
(5, 4, '08:00:00', '22:30:00'), (5, 5, '08:00:00', '23:00:00'), (5, 6, '08:00:00', '23:00:00'), (5, 7, '08:00:00', '23:00:00'),
(6, 1, '06:30:00', '21:30:00'), (6, 2, '06:30:00', '21:30:00'), (6, 3, '06:30:00', '21:30:00'),
(6, 4, '06:30:00', '21:30:00'), (6, 5, '06:30:00', '21:30:00'), (6, 6, '07:00:00', '22:00:00'), (6, 7, '07:00:00', '22:00:00'),
(7, 1, '07:00:00', '21:30:00'), (7, 2, '07:00:00', '21:30:00'), (7, 3, '07:00:00', '21:30:00'),
(7, 4, '07:00:00', '21:30:00'), (7, 5, '07:00:00', '21:30:00'), (7, 6, '07:00:00', '22:00:00'), (7, 7, '07:00:00', '22:00:00'),
(8, 1, '10:00:00', '23:00:00'), (8, 2, '10:00:00', '23:00:00'), (8, 3, '10:00:00', '23:00:00'),
(8, 4, '10:00:00', '23:00:00'), (8, 5, '10:00:00', '23:30:00'), (8, 6, '10:00:00', '23:30:00'), (8, 7, '10:00:00', '23:30:00');

INSERT INTO restaurant_tags (restaurant_id, tag_id) VALUES
(1, 2), (1, 8), (1, 20), (1, 23),
(2, 3), (2, 30), (2, 31),
(4, 1), (4, 8), (4, 20), (4, 21),
(5, 3), (5, 8), (5, 30), (5, 31),
(6, 2), (6, 4), (6, 20), (6, 32),
(7, 2), (7, 8), (7, 20), (7, 23),
(8, 1), (8, 8), (8, 27), (8, 33);

-- ============================================================================
-- 5. SEED MENU CATEGORIES & MENU ITEMS (100% TRONG DATABASE KÈM ẢNH SẮC NÉT)
-- ============================================================================
INSERT INTO menu_categories (category_id, restaurant_id, category_name, display_order) VALUES
-- Quán 1: Bếp Nhà Bình
(1,  1, 'Món chính đặc sắc', 1),
(2,  1, 'Đồ uống giải nhiệt', 2),
(3,  1, 'Món thêm & Canh', 3),
-- Quán 4: Phở Thìn Gia Truyền
(4,  4, 'Phở Bò Gia Truyền', 1),
(5,  4, 'Món Ăn Kèm & Giải Khát', 2),
-- Quán 5: Tiệm Trà Đào & Trà Sữa Oolong
(6,  5, 'Trà Trái Cây Nhiệt Đới', 1),
(7,  5, 'Trà Sữa & Macchiato', 2),
-- Quán 6: Bánh Mì Phố Cổ & Gỏi Cuốn
(8,  6, 'Bánh Mì Đặc Sản Hội An', 1),
(9,  6, 'Gỏi Cuốn & Ăn Vặt', 2),
-- Quán 7: Cơm Tấm Sườn Nướng Than Hoa
(10, 7, 'Cơm Tấm Sườn Nướng', 1),
(11, 7, 'Canh & Đồ Chua Thêm', 2),
-- Quán 8: Lẩu Thái Tomyum & Bò Nướng Sấm Sét
(12, 8, 'Lẩu Thái & Hải Sản', 1),
(13, 8, 'Thịt Nướng BBQ Sốt Tiêu', 2);

INSERT INTO menu_items
(item_id, restaurant_id, category_id, item_name, description, price, image_url,
 is_available, approval_status, reviewed_by, reviewed_at)
VALUES
-- Quán 1: Bếp Nhà Bình (item_id 1..6)
(1, 1, 1, 'Cơm gà nướng mật ong',
 'Đùi gà góc tư ướp mật ong rừng nướng da giòn, ăn kèm cơm hạt dẻo, dưa góp và nước mắm tỏi ớt.',
 55000, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(2, 1, 1, 'Bún thịt nướng than hoa chả giò',
 'Thịt nạc vai nướng than hoa thơm lừng, chả giò tôm thịt giòn rụm, rau sống tươi và nước mắm chua ngọt.',
 50000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(3, 1, 2, 'Trà tắc mật ong rừng',
 'Trà xanh nhài ủ lạnh kết hợp tắc tươi và mật ong nguyên chất thanh mát.',
 18000, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(4, 1, 1, 'Cơm sườn non nướng ngũ vị',
 'Sườn non heo ướp ngũ vị hương nướng mềm mọng, kèm trứng ốp la lòng đào.',
 50000, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=700&q=80',
 1, 'PENDING', NULL, NULL),
(5, 1, 1, 'Cơm gà xối mỡ da giòn Sài Gòn',
 'Gà ta xối mỡ vàng ươm giòn rụm, dùng kèm cơm chiên tỏi trứng thơm nức.',
 58000, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(6, 1, 3, 'Canh rong biển thịt bằm',
 'Canh rong biển Hàn Quốc nấu thịt nạc băm ngọt thanh, dùng nóng kèm cơm.',
 20000, 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),

-- Quán 4: Phở Thìn Gia Truyền (item_id 7..10)
(7, 4, 4, 'Phở Bò Tái Lăn Đặc Biệt',
 'Thịt bò thăn xào lăn lửa lớn dậy hương tỏi gừng, nước dùng ninh xương 18 giờ đậm đà.',
 65000, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(8, 4, 4, 'Phở Tái Nạm Gầu Giòn',
 'Kết hợp thịt tái mềm ngọt, nạm bò chín tới và gầu bò giòn sần sật.',
 70000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(9, 4, 5, 'Quẩy Nóng Giòn (Đĩa 5 chiếc)',
 'Quẩy chiên giòn nóng hổi dùng kèm nước phở.',
 15000, 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(10, 4, 5, 'Trà Đá Thảo Mộc Hoa Cúc',
 'Trà hoa cúc nấu đường phèn thanh nhiệt dịu ngọt.',
 18000, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),

-- Quán 5: Tiệm Trà Đào & Trà Sữa Oolong (item_id 11..14)
(11, 5, 6, 'Trà Đào Cam Sả Hạt Chia',
 'Hồng trà ủ lạnh kết hợp đào miếng giòn ngọt, cam vàng tươi và hương sả thơm mát.',
 42000, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(12, 5, 6, 'Trà Vải Hoa Hồng Nhiệt Đới',
 'Trà lài thanh tao quyện cùng trái vải ngâm giòn mọng và hương hoa hồng nhẹ nhàng.',
 45000, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(13, 5, 7, 'Trà Sữa Oolong Nướng Trân Châu Đường Đen',
 'Trà Oolong rang đậm vị kết hợp sữa tươi thanh trùng và trân châu đường đen nấu ấm.',
 48000, 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(14, 5, 7, 'Matcha Latte Kem Phô Mai Béo Mặn',
 'Bột trà xanh Uji Nhật Bản đánh bông cùng sữa tươi và lớp kem macchiato phô mai.',
 52000, 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),

-- Quán 6: Bánh Mì Phố Cổ & Gỏi Cuốn (item_id 15..18)
(15, 6, 8, 'Bánh Mì Thập Cẩm Đặc Biệt Sốt Bơ Pate',
 'Bánh mì nướng giòn rụm kẹp thịt nướng, chả lụa, jambon, pate gan truyền thống và rau dưa.',
 38000, 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(16, 6, 8, 'Bánh Mì Gà Nướng Sả Ớt Phô Mai',
 'Gà phi lê ướp sả ớt áp chảo thơm nồng kèm sốt phô mai béo ngậy.',
 40000, 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(17, 6, 9, 'Gỏi Cuốn Tôm Thịt Sốt Đậu Phộng (3 Cuốn)',
 'Tôm sú tươi, thịt ba chỉ luộc, bún tươi và rau sống chấm tương đen đậu phộng rang.',
 45000, 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(18, 6, 9, 'Chả Giò Hải Sản Giòn Rụm (Phần 6 cuốn)',
 'Nhân tôm mực tươi và khoai môn chiên vàng giòn, kèm rau sống và nước mắm chua ngọt.',
 48000, 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),

-- Quán 7: Cơm Tấm Sườn Nướng Than Hoa (item_id 19..21)
(19, 7, 10, 'Cơm Tấm Sườn Bì Chả Trứng Ốp La',
 'Sườn cốt lết bản to ướp mật ong nướng than hồng, bì thính, chả trứng hấp và ốp la.',
 62000, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(20, 7, 10, 'Cơm Tấm Ba Chỉ Nướng Muối Ớt',
 'Thịt ba chỉ heo rút sườn nướng muối ớt giòn bì, ăn kèm đồ chua và mỡ hành tóp mỡ.',
 55000, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(21, 7, 11, 'Canh Khổ Qua Nhồi Thịt Chả Cá',
 'Khổ qua hầm mềm nhồi thịt nạc và chả cá thác lác dai ngon, nước canh ngọt thanh.',
 25000, 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),

-- Quán 8: Lẩu Thái Tomyum & Bò Nướng Sấm Sét (item_id 22..24)
(22, 8, 12, 'Set Lẩu Thái Tomyum Hải Sản Tươi (2–3 Người)',
 'Nước lẩu Tomyum chua cay cốt dừa kèm tôm sú, mực ống, nghêu, bò Mỹ, nấm kim châm và bún tươi.',
 189000, 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(23, 8, 13, 'Dẻ Sườn Bò Mỹ Nướng Sốt Tiêu Đen (250g)',
 'Dẻ sườn bò Mỹ nướng sẵn trên than hồng, đóng hộp giữ nhiệt kèm kim chi, xà lách và sốt chấm.',
 135000, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(24, 8, 13, 'Ba Chỉ Bò Mỹ Cuộn Nấm Kim Châm Nướng Sốt Cay',
 'Ba chỉ bò Mỹ mềm ngọt cuộn nấm kim châm nướng sốt cay Hàn Quốc đậm đà.',
 115000, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW());

-- ============================================================================
-- 6. SEED CART, ORDERS, PAYMENTS, REVIEWS & COMPLAINTS
-- ============================================================================
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
(1, 1, 'Cơm gà nướng mật ong', 55000, 1, 55000),
(1, 3, 'Trà tắc mật ong rừng', 18000, 1, 18000);

INSERT INTO payments
(order_id, provider, transaction_code, amount, payment_status, response_code, paid_at)
VALUES
(1, 'VNPAY', 'DEMO-TXN-0001', 88000, 'SUCCESS', '00', NOW() - INTERVAL 2 DAY);

INSERT INTO reviews (order_id, customer_id, restaurant_id, rating, content) VALUES
(1, 4, 1, 5, 'Món ăn ngon, giao hàng nhanh.');

INSERT INTO complaints (customer_id, order_id, title, content, complaint_status) VALUES
(4, 1, 'Giao hàng hơi trễ', 'Đơn giao trễ khoảng 15 phút.', 'OPEN');
