-- ============================================================================
-- THUNDERFOOD DATABASE SCRIPT - VERSION 3.0 (100% EXACT DISH-TO-IMAGE EDITION)
-- Kế thừa 100% cấu trúc 14 bảng của v1 (thunderfood_mariadb.sql) và v2 (thunderfood_mariadb_v2.sql)
-- Nâng cấp toàn diện dữ liệu lên quy mô lớn & chuẩn xác tuyệt đối:
--   • 11 Nhà hàng (9 quán APPROVED đang mở cửa lấp đầy lưới 3x3 + 1 PENDING + 1 DRAFT)
--   • 30 Nhóm thực đơn (phân loại theo món chính, món phụ, canh, tráng miệng và đồ uống)
--   • 109 Món ăn (không ép món khác loại vào cùng nhóm chỉ để đủ số lượng,
--     100% hình ảnh khớp chính xác tuyệt đối với tên món ăn ngoài đời thực)
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
-- 3. SEED RESTAURANTS (9 QUÁN APPROVED ĐANG MỞ CỬA + 1 PENDING + 1 DRAFT)
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
 'Cơm gà Hải Nam, gà nướng mật ong rừng, gà xối mỡ da giòn, bún thịt nướng và canh nhà nấu nóng hổi mỗi ngày.',
 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Hainanese_Chicken_Rice.jpg/960px-Hainanese_Chicken_Rice.jpg',
 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=1200&q=80',
 15000, 1, 4, 'APPROVED',
 NOW() - INTERVAL 10 DAY, 1, NOW() - INTERVAL 9 DAY),

(2, 3, 'Trà Sữa Lan', 'Trà sữa', 'Lê Thánh Tôn', 'Trà Sữa Lan - Trà sữa - Lê Thánh Tôn', '0280000002',
 'Thành phố Hồ Chí Minh', 'Phường Bến Thành', '5 Lê Thánh Tôn',
 '5 Lê Thánh Tôn, Phường Bến Thành, Thành phố Hồ Chí Minh',
 'HOUSEHOLD', 'Hộ kinh doanh Trà Sữa Lan', '0312345678',
 'Võ Lan', 'partner.pending@example.com', '0900000003', '0911111111', '079200000003', '2022-03-20', 'Cục Cảnh sát QLHC về TTXH',
 'Techcombank', 'Chi nhánh Bến Thành', '1903000000001', 'VO LAN',
 'Trà sữa truyền thống và ăn vặt tuổi thơ',
 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=300&q=80',
 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=1200&q=80',
 10000, 0, 4, 'PENDING',
 NOW() - INTERVAL 1 DAY, NULL, NULL),

(4, 2, 'Phở Thìn Bờ Hồ', 'Phở & Bún bò', 'Nguyễn Huệ', 'Phở Thìn Gia Truyền - Nguyễn Huệ', '0283822119',
 'Thành phố Hồ Chí Minh', 'Phường Sài Gòn', '68 Nguyễn Huệ',
 '68 Nguyễn Huệ, Phường Sài Gòn, Thành phố Hồ Chí Minh',
 'INDIVIDUAL', NULL, NULL,
 'Trần Bình', 'partner@example.com', '0900000002', NULL, '079200000002', '2021-06-15', 'Cục Cảnh sát QLHC về TTXH',
 'Vietcombank', 'Chi nhánh Sài Gòn', '0123456789', 'TRAN BINH',
 'Nước dùng ninh xương ống bò 18 tiếng trong vắt ngọt thanh, thịt bò tái lăn dậy mùi gừng tỏi truyền thống Hà Thành.',
 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Ph%E1%BB%9F_b%C3%B2%2C_C%E1%BA%A7u_Gi%E1%BA%A5y%2C_H%C3%A0_N%E1%BB%99i.jpg/960px-Ph%E1%BB%9F_b%C3%B2%2C_C%E1%BA%A7u_Gi%E1%BA%A5y%2C_H%C3%A0_N%E1%BB%99i.jpg',
 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=1200&q=80',
 12000, 1, 4, 'APPROVED',
 NOW() - INTERVAL 8 DAY, 1, NOW() - INTERVAL 7 DAY),

(5, 2, 'The Tea House', 'Trà sữa & Đồ uống', 'Đồng Khởi', 'Tiệm Trà Đào & Trà Sữa Oolong - Đồng Khởi', '0283829445',
 'Thành phố Hồ Chí Minh', 'Phường Sài Gòn', '115 Đồng Khởi',
 '115 Đồng Khởi, Phường Sài Gòn, Thành phố Hồ Chí Minh',
 'INDIVIDUAL', NULL, NULL,
 'Trần Bình', 'partner@example.com', '0900000002', NULL, '079200000002', '2021-06-15', 'Cục Cảnh sát QLHC về TTXH',
 'Vietcombank', 'Chi nhánh Sài Gòn', '0123456789', 'TRAN BINH',
 'Trà nguyên lá vùng cao ủ lạnh kết hợp trái cây nhiệt đới tươi mới và trân châu hoàng kim nấu ấm mỗi 2 giờ.',
 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=300&q=80',
 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1200&q=80',
 10000, 1, 4, 'APPROVED',
 NOW() - INTERVAL 7 DAY, 1, NOW() - INTERVAL 6 DAY),

(6, 2, 'Bánh Mì Hội An', 'Bánh mì & Ăn vặt', 'Pasteur', 'Bánh Mì Phố Cổ & Gỏi Cuốn - Pasteur', '0283823998',
 'Thành phố Hồ Chí Minh', 'Phường Bến Thành', '142 Pasteur',
 '142 Pasteur, Phường Bến Thành, Thành phố Hồ Chí Minh',
 'INDIVIDUAL', NULL, NULL,
 'Trần Bình', 'partner@example.com', '0900000002', NULL, '079200000002', '2021-06-15', 'Cục Cảnh sát QLHC về TTXH',
 'Vietcombank', 'Chi nhánh Sài Gòn', '0123456789', 'TRAN BINH',
 'Bánh mì vỏ giòn nóng hổi nướng lò than, pate gan nhà làm béo mịn và gỏi cuốn tôm thịt tươi rói chấm tương đậu phộng.',
 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Summer_roll.jpg/960px-Summer_roll.jpg',
 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=1200&q=80',
 12000, 1, 4, 'APPROVED',
 NOW() - INTERVAL 6 DAY, 1, NOW() - INTERVAL 5 DAY),

(7, 2, 'Cơm Tấm Sài Gòn Xưa', 'Cơm tấm sườn bì chả', 'Võ Văn Tần', 'Cơm Tấm Sườn Nướng Than Hoa - Võ Văn Tần', '0283930556',
 'Thành phố Hồ Chí Minh', 'Phường Bến Thành', '88 Võ Văn Tần',
 '88 Võ Văn Tần, Phường Bến Thành, Thành phố Hồ Chí Minh',
 'INDIVIDUAL', NULL, NULL,
 'Trần Bình', 'partner@example.com', '0900000002', NULL, '079200000002', '2021-06-15', 'Cục Cảnh sát QLHC về TTXH',
 'Vietcombank', 'Chi nhánh Sài Gòn', '0123456789', 'TRAN BINH',
 'Sườn cốt lết bản to ướp mật ong nướng lửa than hồng, hạt tấm dẻo thơm kèm mỡ hành tóp mỡ giòn tan.',
 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/C%C6%A1m_T%E1%BA%A5m%2C_Da_Nang%2C_Vietnam.jpg/960px-C%C6%A1m_T%E1%BA%A5m%2C_Da_Nang%2C_Vietnam.jpg',
 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/C%C6%A1m_T%E1%BA%A5m%2C_Da_Nang%2C_Vietnam.jpg/960px-C%C6%A1m_T%E1%BA%A5m%2C_Da_Nang%2C_Vietnam.jpg',
 15000, 1, 4, 'APPROVED',
 NOW() - INTERVAL 5 DAY, 1, NOW() - INTERVAL 4 DAY),

(8, 2, 'Thunder BBQ & Hotpot', 'Lẩu & Nướng BBQ', 'Bến Thành', 'Lẩu Thái Tomyum & Bò Nướng Sấm Sét - Bến Thành', '0283825779',
 'Thành phố Hồ Chí Minh', 'Phường Bến Thành', '25 Lý Tự Trọng',
 '25 Lý Tự Trọng, Phường Bến Thành, Thành phố Hồ Chí Minh',
 'INDIVIDUAL', NULL, NULL,
 'Trần Bình', 'partner@example.com', '0900000002', NULL, '079200000002', '2021-06-15', 'Cục Cảnh sát QLHC về TTXH',
 'Vietcombank', 'Chi nhánh Sài Gòn', '0123456789', 'TRAN BINH',
 'Combo lẩu Thái Tomyum hải sản chua cay và thịt bò Mỹ nướng than hoa tại gia, đóng gói giữ nhiệt chuyên dụng giao nhanh.',
 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Tom_yam_kung_maenam.jpg/960px-Tom_yam_kung_maenam.jpg',
 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
 18000, 1, 4, 'APPROVED',
 NOW() - INTERVAL 4 DAY, 1, NOW() - INTERVAL 3 DAY),

(9, 2, 'Seoul Crispy Chicken', 'Gà rán Hàn Quốc & Burger', 'Hai Bà Trưng', 'Gà Rán Giòn Cay & Burger Phô Mai - Hai Bà Trưng', '0283824668',
 'Thành phố Hồ Chí Minh', 'Phường Sài Gòn', '156 Hai Bà Trưng',
 '156 Hai Bà Trưng, Phường Sài Gòn, Thành phố Hồ Chí Minh',
 'INDIVIDUAL', NULL, NULL,
 'Trần Bình', 'partner@example.com', '0900000002', NULL, '079200000002', '2021-06-15', 'Cục Cảnh sát QLHC về TTXH',
 'Vietcombank', 'Chi nhánh Sài Gòn', '0123456789', 'TRAN BINH',
 'Gà rán lắc phô mai tuyết, gà sốt cay ngọt chuẩn vị Seoul và Burger bò Mỹ nướng phô mai tan chảy.',
 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Korean_fried_chicken_2.jpg/960px-Korean_fried_chicken_2.jpg',
 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
 14000, 1, 4, 'APPROVED',
 NOW() - INTERVAL 3 DAY, 1, NOW() - INTERVAL 2 DAY),

(10, 2, 'Sakura Kitchen', 'Sushi & Ramen Nhật Bản', 'Thảo Điền', 'Sushi Cá Hồi & Mì Ramen Nhật Bản Sakura - Thảo Điền', '0283744889',
 'Thành phố Hồ Chí Minh', 'Phường Thảo Điền', '42 Xuân Thủy',
 '42 Xuân Thủy, Phường Thảo Điền, Thành phố Hồ Chí Minh',
 'INDIVIDUAL', NULL, NULL,
 'Trần Bình', 'partner@example.com', '0900000002', NULL, '079200000002', '2021-06-15', 'Cục Cảnh sát QLHC về TTXH',
 'Vietcombank', 'Chi nhánh Sài Gòn', '0123456789', 'TRAN BINH',
 'Cá hồi Na Uy tươi nhập khẩu mỗi sáng, cơm cuộn Maki chuẩn vị Tokyo và mì Ramen hầm xương Tonkotsu 16 giờ.',
 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Sushi_platter.jpg/960px-Sushi_platter.jpg',
 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80',
 16000, 1, 4, 'APPROVED',
 NOW() - INTERVAL 2 DAY, 1, NOW() - INTERVAL 1 DAY),

(11, 2, 'Bún Đậu Phố Hàng Khay', 'Bún đậu mắm tôm & Đặc sản Bắc', 'Võ Thị Sáu', 'Bún Đậu Mắm Tôm & Đặc Sản Hà Nội - Võ Thị Sáu', '0283932118',
 'Thành phố Hồ Chí Minh', 'Phường Võ Thị Sáu', '108 Võ Thị Sáu',
 '108 Võ Thị Sáu, Phường Võ Thị Sáu, Thành phố Hồ Chí Minh',
 'INDIVIDUAL', NULL, NULL,
 'Trần Bình', 'partner@example.com', '0900000002', NULL, '079200000002', '2021-06-15', 'Cục Cảnh sát QLHC về TTXH',
 'Vietcombank', 'Chi nhánh Sài Gòn', '0123456789', 'TRAN BINH',
 'Mẹt bún đậu mắm tôm đầy đặn, bún chả thịt nướng than hoa, nem rán Hà Nội, dồi sụn nướng và lòng non luộc giòn ngọt.',
 'https://upload.wikimedia.org/wikipedia/commons/1/11/B%C3%BAn_%C4%91%E1%BA%ADu_m%E1%BA%AFm_t%C3%B4m_%282019%29.jpg',
 'https://upload.wikimedia.org/wikipedia/commons/1/11/B%C3%BAn_%C4%91%E1%BA%ADu_m%E1%BA%AFm_t%C3%B4m_%282019%29.jpg',
 12000, 1, 4, 'APPROVED',
 NOW() - INTERVAL 2 DAY, 1, NOW() - INTERVAL 1 DAY);

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
(1, 4, '08:00:00', '22:00:00'), (1, 5, '08:00:00', '22:00:00'), (1, 6, '08:00:00', '22:00:00'), (1, 7, '09:00:00', '21:00:00'),
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
(8, 4, '10:00:00', '23:00:00'), (8, 5, '10:00:00', '23:30:00'), (8, 6, '10:00:00', '23:30:00'), (8, 7, '10:00:00', '23:30:00'),
(9, 1, '09:00:00', '22:30:00'), (9, 2, '09:00:00', '22:30:00'), (9, 3, '09:00:00', '22:30:00'),
(9, 4, '09:00:00', '22:30:00'), (9, 5, '09:00:00', '23:00:00'), (9, 6, '09:00:00', '23:00:00'), (9, 7, '09:00:00', '23:00:00'),
(10, 1, '10:00:00', '22:00:00'), (10, 2, '10:00:00', '22:00:00'), (10, 3, '10:00:00', '22:00:00'),
(10, 4, '10:00:00', '22:00:00'), (10, 5, '10:00:00', '22:30:00'), (10, 6, '10:00:00', '22:30:00'), (10, 7, '10:00:00', '22:30:00'),
(11, 1, '09:00:00', '21:30:00'), (11, 2, '09:00:00', '21:30:00'), (11, 3, '09:00:00', '21:30:00'),
(11, 4, '09:00:00', '21:30:00'), (11, 5, '09:00:00', '22:00:00'), (11, 6, '09:00:00', '22:00:00'), (11, 7, '09:00:00', '22:00:00');

INSERT INTO restaurant_tags (restaurant_id, tag_id) VALUES
(1, 2), (1, 8), (1, 20), (1, 23),
(2, 3), (2, 30), (2, 31),
(4, 1), (4, 8), (4, 20), (4, 21),
(5, 3), (5, 8), (5, 30), (5, 31),
(6, 2), (6, 4), (6, 20), (6, 32),
(7, 2), (7, 8), (7, 20), (7, 23),
(8, 1), (8, 8), (8, 27), (8, 33),
(9, 1), (9, 8), (9, 24), (9, 28),
(10, 1), (10, 8), (10, 25),
(11, 2), (11, 4), (11, 20), (11, 21);

-- ============================================================================
-- 5. SEED MENU CATEGORIES (30 NHÓM THỰC ĐƠN CHO 9 QUÁN APPROVED)
-- ============================================================================
INSERT INTO menu_categories (category_id, restaurant_id, category_name, display_order) VALUES
-- Quán 1: Bếp Nhà Bình - Cơm gà - Lê Lợi
(1,  1, 'Cơm Gà, Vịt & Thịt Nướng', 1),
(2,  1, 'Bún, Mì & Cơm Gọi Món', 2),
(3,  1, 'Canh & Món Nhẹ Nhà Nấu', 3),
(28, 1, 'Đồ Uống Giải Nhiệt', 4),

-- Quán 4: Phở Thìn Gia Truyền - Nguyễn Huệ
(4,  4, 'Phở Bò Gia Truyền Hà Thành', 1),
(5,  4, 'Bún, Hủ Tiếu & Mì Đặc Sản', 2),
(6,  4, 'Quẩy Nóng & Bánh Cuốn', 3),
(29, 4, 'Đồ Uống Giải Khát', 4),

-- Quán 5: Tiệm Trà Đào & Trà Sữa Oolong - Đồng Khởi
(7,  5, 'Trà Trái Cây Nhiệt Đới Tươi Mát', 1),
(8,  5, 'Trà Sữa Trân Châu & Cà Phê Kem Béo', 2),
(9,  5, 'Bánh Ngọt Pháp & Tráng Miệng Tươi', 3),

-- Quán 6: Bánh Mì Phố Cổ & Gỏi Cuốn - Pasteur
(10, 6, 'Bánh Mì Đặc Sản & Bánh Mì Chảo', 1),
(11, 6, 'Gỏi Cuốn, Chả Giò & Bánh Xèo Miền Nam', 2),
(12, 6, 'Cà Phê Phin & Nước Ép Trái Cây Tươi', 3),

-- Quán 7: Cơm Tấm Sườn Nướng Than Hoa - Võ Văn Tần
(13, 7, 'Cơm Tấm & Cơm Thịt Nướng', 1),
(14, 7, 'Món Ăn Kèm Cơm Tấm Gọi Thêm', 2),
(15, 7, 'Canh Nóng Gọi Thêm', 3),
(30, 7, 'Tráng Miệng & Thức Uống', 4),

-- Quán 8: Lẩu Thái Tomyum & Bò Nướng Sấm Sét - Bến Thành
(16, 8, 'Lẩu Thái Tomyum & Lẩu Bò Nhúng', 1),
(17, 8, 'Thịt Bò Mỹ & Sườn Nướng BBQ Than Hoa', 2),
(18, 8, 'Hải Sản Nướng & Món Ăn Kèm BBQ', 3),

-- Quán 9: Gà Rán Giòn Cay & Burger Phô Mai - Hai Bà Trưng
(19, 9, 'Gà Rán Giòn Cay Hàn Quốc', 1),
(20, 9, 'Burger Bò Mỹ & Bánh Kẹp Nóng Hổi', 2),
(21, 9, 'Khoai Tây Chiên, Phô Mai Que & Ăn Vặt', 3),

-- Quán 10: Sushi Cá Hồi & Mì Ramen Nhật Bản Sakura - Thảo Điền
(22, 10, 'Sushi, Sashimi & Cơm Lươn Nhật Bản', 1),
(23, 10, 'Mì Ramen, Udon & Cơm Cà Ri Nhật', 2),
(24, 10, 'Món Chiên & Khai Vị Nhật Bản', 3),

-- Quán 11: Bún Đậu Mắm Tôm & Đặc Sản Hà Nội - Võ Thị Sáu
(25, 11, 'Bún Đậu & Các Món Bún Hà Nội', 1),
(26, 11, 'Nem Rán, Dồi & Lòng Phố Cổ', 2),
(27, 11, 'Đồ Uống Giải Khát Phố Cổ', 3);

-- ============================================================================
-- 6. SEED MENU ITEMS (109 MÓN ĂN — 100% ĐỒNG BỘ TÊN MÓN VÀ HÌNH ẢNH THỰC TẾ)
-- ============================================================================
INSERT INTO menu_items
(item_id, restaurant_id, category_id, item_name, description, price, image_url,
 is_available, approval_status, reviewed_by, reviewed_at)
VALUES
-- ============================================================================
-- QUÁN 1: BẾP NHÀ BÌNH - CƠM GÀ - LÊ LỢI (item_id 1..13)
-- ============================================================================
-- Nhóm 1 (category_id = 1): Cơm Gà & Cơm Thịt Nướng Đặc Sắc
(1, 1, 1, 'Cơm Gà Nướng Mật Ong Nguyên Đùi',
 'Đùi gà góc tư ướp mật ong rừng nướng da vàng giòn, ăn kèm cơm hạt dẻo, dưa góp và nước mắm tỏi ớt.',
 55000, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(2, 1, 2, 'Bún Thịt Nướng Chả Giò Sài Gòn',
 'Thịt nạc vai nướng than hoa thơm lừng, chả giò tôm thịt giòn rụm, rau sống tươi và nước mắm chua ngọt.',
 50000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Bun_thit_nuong.jpg/960px-Bun_thit_nuong.jpg',
 1, 'APPROVED', 1, NOW()),
(3, 1, 28, 'Trà Tắc Cam Sả Đá Lạnh Giải Nhiệt',
 'Trà xanh nhài ủ lạnh kết hợp tắc tươi vắt tay, lát cam vàng và mật ong nguyên chất thanh mát.',
 18000, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(4, 1, 1, 'Cơm Vịt Quay Bắc Kinh Da Giòn (Chờ Duyệt)',
 'Vịt quay da giòn bóng bẩy chặt miếng vừa ăn, dùng kèm cơm nóng và nước sốt tương ngọt gia truyền.',
 65000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Peking_Duck%2C_2014_%2802%29.jpg/960px-Peking_Duck%2C_2014_%2802%29.jpg',
 1, 'PENDING', NULL, NULL),
(5, 1, 1, 'Cơm Gà Hải Nam Luộc Da Giòn Nước Mắm Gừng',
 'Thịt gà ta luộc chín tới da giòn vàng ươm, cơm nấu bằng nước luộc gà béo thơm kèm chén súp và mắm gừng.',
 56000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Hainanese_Chicken_Rice.jpg/960px-Hainanese_Chicken_Rice.jpg',
 1, 'APPROVED', 1, NOW()),
(6, 1, 1, 'Cơm Gà Xối Mỡ Da Giòn Sài Gòn',
 'Đùi gà chiên xối mỡ da nổ giòn rụm, dùng kèm cơm chiên tỏi trứng thơm nức và sốt tương ớt.',
 58000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Fried-Chicken-Set.jpg/960px-Fried-Chicken-Set.jpg',
 1, 'APPROVED', 1, NOW()),
(7, 1, 1, 'Cơm Thịt Xá Xíu Heo Quay Mật Ong',
 'Thịt thăn heo ướp sốt xá xíu mật ong nướng đỏ au mềm mọng, rưới nước sốt đậm đà trên cơm trắng.',
 55000, 'https://upload.wikimedia.org/wikipedia/commons/9/95/Charsiu.jpg',
 1, 'APPROVED', 1, NOW()),

-- Nhóm 2 (category_id = 2): Bún Thịt Nướng & Món Cơm Chiên (thêm 3 món khớp ảnh 100%)
(8, 1, 2, 'Cơm Chiên Dương Châu Tôm Thịt Trứng',
 'Hạt cơm săn dẻo chiên lửa lớn cùng tôm tươi, thịt xá xíu, đậu Hà Lan, cà rốt và trứng gà thơm phức.',
 55000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Chinese_fried_rice_by_stu_spivack_in_Cleveland%2C_OH.jpg/960px-Chinese_fried_rice_by_stu_spivack_in_Cleveland%2C_OH.jpg',
 1, 'APPROVED', 1, NOW()),
(9, 1, 2, 'Cơm Bò Lúc Lắc Sốt Tiêu Đen & Rau Củ',
 'Thịt bò thăn cắt vuông áp chảo lửa lớn mềm ngọt cùng ớt chuông, hành tây và sốt tiêu đen đậm vị.',
 65000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Product_Shots_of_Food-Bo_Luc_Lac.jpg/960px-Product_Shots_of_Food-Bo_Luc_Lac.jpg',
 1, 'APPROVED', 1, NOW()),
(10, 1, 2, 'Mì Quảng Tôm Thịt Trứng Cút Xứ Quảng',
 'Sợi mì Quảng vàng nghệ ăn cùng tôm sú, thịt heo, trứng cút, bánh đa nướng giòn và đậu phộng rang.',
 52000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/M%C3%AC_Qu%E1%BA%A3ng%2C_Da_Nang%2C_Vietnam.jpg/960px-M%C3%AC_Qu%E1%BA%A3ng%2C_Da_Nang%2C_Vietnam.jpg',
 1, 'APPROVED', 1, NOW()),

-- Nhóm 3 (category_id = 3): Canh & Món Nhẹ Nhà Nấu
(11, 1, 3, 'Canh Rong Biển Thịt Bò Nấu Thanh Ngọt',
 'Canh rong biển nấu cùng thịt bò băm mềm ngọt, bổ dưỡng, dùng nóng kèm các món cơm.',
 22000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Miyeok-guk.jpg/960px-Miyeok-guk.jpg',
 1, 'APPROVED', 1, NOW()),
(12, 1, 3, 'Canh Chua Tôm Cá Miền Nam Nóng Hổi',
 'Nước canh chua thanh vị me chín nấu cùng tôm, cá, bạc hà, cà chua, giá đỗ và ngò gai thơm lừng.',
 28000, 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Canhchua2.jpg',
 1, 'APPROVED', 1, NOW()),
(13, 1, 3, 'Hoành Thánh Tôm Thịt Hấp Nóng (6 Viên)',
 'Vỏ hoành thánh mềm mỏng gói nhân tôm tươi và thịt nạc vai băm nhuyễn chấm xì dầu ớt.',
 32000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Pork_Steamed_Wontons.jpg/960px-Pork_Steamed_Wontons.jpg',
 1, 'APPROVED', 1, NOW()),

-- ============================================================================
-- QUÁN 4: PHỞ THÌN GIA TRUYỀN - NGUYỄN HUỆ (item_id 14..25 — 12 MÓN KHỚP ẢNH 100%)
-- ============================================================================
-- Nhóm 4: Phở Bò Gia Truyền Hà Thành (4 món)
(14, 4, 4, 'Phở Bò Tái Nạm Gia Truyền Hà Nội',
 'Bánh phở mềm mướt, thịt bò tái nạm thái mỏng chan nước dùng ninh xương ống bò 18 giờ trong vắt.',
 65000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Ph%E1%BB%9F_b%C3%B2%2C_C%E1%BA%A7u_Gi%E1%BA%A5y%2C_H%C3%A0_N%E1%BB%99i.jpg/960px-Ph%E1%BB%9F_b%C3%B2%2C_C%E1%BA%A7u_Gi%E1%BA%A5y%2C_H%C3%A0_N%E1%BB%99i.jpg',
 1, 'APPROVED', 1, NOW()),
(15, 4, 4, 'Phở Bò Tái Lăn Hành Hoa Đặc Biệt',
 'Thịt bò thăn xào lăn lửa lớn dậy hương tỏi gừng, phủ đầy hành hoa xanh mướt chuẩn vị Phở Thìn.',
 70000, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(16, 4, 4, 'Phở Bò Viên Gân & Bắp Bò Thượng Hạng',
 'Sự kết hợp giữa bò viên gân dai giòn sần sật và bắp bò hoa thái lát mỏng trong nước phở nóng hổi.',
 68000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Bowl_of_Meatball_pho.jpg/960px-Bowl_of_Meatball_pho.jpg',
 1, 'APPROVED', 1, NOW()),
(17, 4, 4, 'Phở Bò Kho Hầm Ngũ Vị Cà Rốt',
 'Thịt nạm bò gân hầm mềm rục cùng sả, quế, hồi, cà rốt ăn cùng bánh phở dai ngon.',
 72000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Bo_kho_mien_Bac.jpg/960px-Bo_kho_mien_Bac.jpg',
 1, 'APPROVED', 1, NOW()),

-- Nhóm 5: Bún, Hủ Tiếu & Mì Đặc Sản (4 món)
(18, 4, 5, 'Bún Bò Huế Giò Heo Chả Cua Cố Đô',
 'Sợi bún to chuẩn vị Huế, bắp bò, giò heo rút xương và chả cua vàng ươm trong nước dùng sả ruốc.',
 68000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/B%C3%BAn_b%C3%B2_Hu%E1%BA%BF_-_Ch%E1%BB%A3_%C4%90%C3%B4ng_Ba_%282024%29_-_img_02.jpg/960px-B%C3%BAn_b%C3%B2_Hu%E1%BA%BF_-_Ch%E1%BB%A3_%C4%90%C3%B4ng_Ba_%282024%29_-_img_02.jpg',
 1, 'APPROVED', 1, NOW()),
(19, 4, 5, 'Hủ Tiếu Nam Vang Tôm Sú Trứng Cút',
 'Sợi hủ tiếu dai ngon chan nước súp xương heo ngọt lịm, tôm sú tươi, thịt bằm và trứng cút.',
 62000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Hu_Tieu_Nam_Vang.jpg/960px-Hu_Tieu_Nam_Vang.jpg',
 1, 'APPROVED', 1, NOW()),
(20, 4, 5, 'Bún Mọc Sườn Non Giò Sống Hà Nội',
 'Nước dùng xương thanh ngọt ăn cùng viên mọc nấm hương, sườn non hầm mềm và dọc mùng giòn.',
 58000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Bun_Moc_Ha_Noi.jpg/960px-Bun_Moc_Ha_Noi.jpg',
 1, 'APPROVED', 1, NOW()),
(21, 4, 5, 'Cao Lầu Thịt Xá Xíu Phố Cổ Hội An',
 'Sợi mì Cao Lầu vàng ươm trộn thịt xá xíu mềm, tóp mỡ giòn tan, giá trụng và rau sống Trà Quế.',
 60000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Cao_l%E1%BA%A7u_H%E1%BB%99i_An_%282024%29.jpg/960px-Cao_l%E1%BA%A7u_H%E1%BB%99i_An_%282024%29.jpg',
 1, 'APPROVED', 1, NOW()),

-- Nhóm 6: Quẩy Nóng & Bánh Cuốn (2 món)
(22, 4, 6, 'Quẩy Nóng Giòn Ăn Kèm Phở (Đĩa 5 Chiếc)',
 'Quẩy chiên mới vàng ươm giòn rụm, chấm ngập trong nước phở béo ngậy cực hợp.',
 15000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Youtiao.jpg/960px-Youtiao.jpg',
 1, 'APPROVED', 1, NOW()),
(23, 4, 6, 'Bánh Cuốn Nóng Thanh Trì Chả Quế',
 'Bánh cuốn tráng mỏng mịn rắc hành phi vàng giòn, ăn kèm chả quế Hà Nội và nước mắm tinh dầu cà cuống.',
 42000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/B%C3%A1nh_cu%E1%BB%91n_Thanh_Tr%C3%AC.jpg/960px-B%C3%A1nh_cu%E1%BB%91n_Thanh_Tr%C3%AC.jpg',
 1, 'APPROVED', 1, NOW()),
(24, 4, 29, 'Sữa Đậu Nành Nấu Lá Dứa Nguyên Chất',
 'Sữa đậu nành quê xay mới mỗi sáng nấu cùng lá dứa thơm dịu, dùng nóng hoặc đá.',
 20000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/001-soymilk.jpg/960px-001-soymilk.jpg',
 1, 'APPROVED', 1, NOW()),
(25, 4, 29, 'Trà Đá Thảo Mộc Pha Chanh Tươi',
 'Ly trà đá mát lạnh giải nhiệt thanh khiết sau bát phở nóng hổi.',
 12000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Qu%C3%A1n_m%C3%AC_qu%E1%BA%A3ng_Th%E1%BA%A3o_%E1%BB%9F_Q_T%C3%A2n_B%C3%ACnh_ng9th9n2022_%28ly_tr%C3%A0_%C4%91%C3%A1%29.jpg/960px-Qu%C3%A1n_m%C3%AC_qu%E1%BA%A3ng_Th%E1%BA%A3o_%E1%BB%9F_Q_T%C3%A2n_B%C3%ACnh_ng9th9n2022_%28ly_tr%C3%A0_%C4%91%C3%A1%29.jpg',
 1, 'APPROVED', 1, NOW()),

-- ============================================================================
-- QUÁN 5: TIỆM TRÀ ĐÀO & TRÀ SỮA OOLONG - ĐỒNG KHỞI (item_id 26..37 — 12 MÓN KHỚP ẢNH 100%)
-- ============================================================================
-- Nhóm 7: Trà Trái Cây Nhiệt Đới Tươi Mát (4 món)
(26, 5, 7, 'Trà Đào Cam Sả Đá Lạnh Nhiệt Đới',
 'Hồng trà ủ lạnh kết hợp đào miếng giòn ngọt, cam vàng tươi và hương sả thơm mát.',
 42000, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(27, 5, 7, 'Trà Hoa Atiso Đỏ Hibiscus & Quả Mọng',
 'Trà hoa Hibiscus đỏ thẫm giàu vitamin C kết hợp mứt dâu tằm chua ngọt thanh mát.',
 45000, 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Hibiscus_tea.jpg',
 1, 'APPROVED', 1, NOW()),
(28, 5, 7, 'Trà Chanh Vàng Tươi Mật Ong Bạc Hà',
 'Nước cốt chanh vàng tươi lắc cùng mật ong rừng, lục trà nhài và lá bạc hà the mát.',
 39000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Lemonade_-_27682817724.jpg/960px-Lemonade_-_27682817724.jpg',
 1, 'APPROVED', 1, NOW()),
(29, 5, 7, 'Hồng Trà Đá Lát Chanh Vàng Truyền Thống',
 'Hồng trà Ceylon ủ chuẩn nhiệt độ kết hợp lát chanh vàng tươi giải khát tức thì.',
 38000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Iced_Tea_from_flickr.jpg/960px-Iced_Tea_from_flickr.jpg',
 1, 'APPROVED', 1, NOW()),

-- Nhóm 8: Trà Sữa Trân Châu & Cà Phê Kem Béo (4 món)
(30, 5, 8, 'Trà Sữa Oolong Nướng Trân Châu Đường Đen',
 'Trà Oolong rang đậm vị kết hợp sữa tươi thanh trùng và trân châu đường đen nấu ấm.',
 48000, 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(31, 5, 8, 'Trà Sữa Truyền Thống Trân Châu Đen Đài Loan',
 'Vị hồng trà sữa béo thơm cổ điển đầy ắp trân châu đen dẻo dai.',
 45000, 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Bubble_Tea.png',
 1, 'APPROVED', 1, NOW()),
(32, 5, 8, 'Matcha Latte Trà Xanh Nhật Bản Kem Sữa',
 'Bột trà xanh Uji Nhật Bản đánh bông cùng sữa tươi thanh trùng béo mịn.',
 52000, 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(33, 5, 8, 'Cappuccino Ý Kem Sữa Nóng Bọt Mịn',
 'Cà phê Espresso đậm đà quyện lớp bọt sữa đánh bông mịn màng chuẩn phong cách Ý.',
 49000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Cappuccino_in_original.jpg/960px-Cappuccino_in_original.jpg',
 1, 'APPROVED', 1, NOW()),

-- Nhóm 9: Bánh Ngọt Pháp & Tráng Miệng Tươi (4 món)
(34, 5, 9, 'Bánh Sừng Bò Croissant Bơ Pháp Giòn Xốp',
 'Vỏ bánh ngàn lớp nướng bơ Pháp thơm lừng, giòn xốp bên ngoài mềm ẩm bên trong.',
 42000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Croissant-Petr_Kratochvil.jpg/960px-Croissant-Petr_Kratochvil.jpg',
 1, 'APPROVED', 1, NOW()),
(35, 5, 9, 'Bánh Tiramisu Cà Phê Ca Cao Ý',
 'Cốt bánh Ladyfinger thấm đẫm Espresso, phủ kem phô mai Mascarpone và bột ca cao nguyên chất.',
 49000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Tiramisu_-_Raffaele_Diomede.jpg/960px-Tiramisu_-_Raffaele_Diomede.jpg',
 1, 'APPROVED', 1, NOW()),
(36, 5, 9, 'Bánh Cheesecake Nướng Sốt Dâu Rừng Việt Quất',
 'Bánh phô mai nướng béo ngậy dùng kèm quả mâm xôi và việt quất tươi chua ngọt.',
 55000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Baked_cheesecake_with_raspberries_and_blueberries.jpg/960px-Baked_cheesecake_with_raspberries_and_blueberries.jpg',
 1, 'APPROVED', 1, NOW()),
(37, 5, 9, 'Bánh Flan Caramel Trứng Sữa Nhà Làm',
 'Bánh flan trứng gà ta hấp cách thủy mềm mịn, rưới sốt đường thắng caramel thơm ngọt.',
 25000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Homemade_Flan.jpg/960px-Homemade_Flan.jpg',
 1, 'APPROVED', 1, NOW()),

-- ============================================================================
-- QUÁN 6: BÁNH MÌ PHỐ CỔ & GỎI CUỐN - PASTEUR (item_id 38..49 — 12 MÓN KHỚP ẢNH 100%)
-- ============================================================================
-- Nhóm 10: Bánh Mì Đặc Sản & Bánh Mì Chảo (4 món)
(38, 6, 10, 'Bánh Mì Thịt Nướng Đặc Biệt Phố Cổ',
 'Ổ bánh mì nóng giòn kẹp đầy thịt heo nướng than hoa, đồ chua, dưa leo, ngò rí và sốt bơ pate.',
 38000, 'https://upload.wikimedia.org/wikipedia/commons/0/0c/B%C3%A1nh_m%C3%AC_th%E1%BB%8Bt_n%C6%B0%E1%BB%9Bng.png',
 1, 'APPROVED', 1, NOW()),
(39, 6, 10, 'Bánh Mì Thập Cẩm Pate Chả Lụa Rau Thơm',
 'Bánh mì nướng giòn rụm kẹp thịt nguội, chả lụa, pate gan truyền thống và rau dưa tươi.',
 40000, 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(40, 6, 10, 'Bánh Mì Chảo Bò Né Xúc Xích Trứng Ốp La',
 'Chảo gang nóng hổi gồm bít tết bò mềm, xúc xích, pate, trứng ốp la lòng đào kèm ổ bánh mì giòn.',
 58000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/B%C3%B2_b%C3%ADt_t%E1%BA%BFt_ki%E1%BB%83u_Vi%E1%BB%87t_Nam_%28c%C3%B3_x%C3%BAc_x%C3%ADch%29_%E1%BB%9F_B%C3%ACnh_H%C6%B0ng_H%C3%B2a_A_%284%29.jpg/960px-B%C3%B2_b%C3%ADt_t%E1%BA%BFt_ki%E1%BB%83u_Vi%E1%BB%87t_Nam_%28c%C3%B3_x%C3%BAc_x%C3%ADch%29_%E1%BB%9F_B%C3%ACnh_H%C6%B0ng_H%C3%B2a_A_%284%29.jpg',
 1, 'APPROVED', 1, NOW()),
(41, 6, 10, 'Bánh Sandwich Kẹp Gà Nướng & Rau Tươi',
 'Bánh mì lát nướng giòn kẹp thịt gà áp chảo, xà lách, cà chua và sốt Mayonnaise béo dịu.',
 45000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Club_sandwich_at_Caf%C3%A9_Picnic.jpg/960px-Club_sandwich_at_Caf%C3%A9_Picnic.jpg',
 1, 'APPROVED', 1, NOW()),

-- Nhóm 11: Gỏi Cuốn, Chả Giò & Bánh Xèo Miền Nam (4 món)
(42, 6, 11, 'Gỏi Cuốn Tôm Thịt Tươi Chấm Tương Đậu (3 Cuốn)',
 'Tôm sú tươi đỏ au, thịt ba chỉ luộc, bún tươi và rau sống chấm tương đen đậu phộng rang.',
 45000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Summer_roll.jpg/960px-Summer_roll.jpg',
 1, 'APPROVED', 1, NOW()),
(43, 6, 11, 'Chả Giò Tôm Thịt Chiên Vàng Giòn (Phần 6 Cuốn)',
 'Chả giò nhân tôm thịt, nấm mèo và miến chiên vàng rụm, kèm rau sống và nước mắm chua ngọt.',
 48000, 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Cha_gio.jpg',
 1, 'APPROVED', 1, NOW()),
(44, 6, 11, 'Nem Nướng Nha Trang Cuốn Bánh Tráng Rau Sống',
 'Nem thịt nướng than hoa thơm phức kèm bánh tráng, xoài xanh, dưa leo và sốt tương chấm đặc trưng.',
 58000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Nem_n%C6%B0%E1%BB%9Bng_by_Baoothersks.jpg/960px-Nem_n%C6%B0%E1%BB%9Bng_by_Baoothersks.jpg',
 1, 'APPROVED', 1, NOW()),
(45, 6, 11, 'Bánh Xèo Tôm Thịt Vỏ Giòn Kèm Rau Rừng',
 'Bánh xèo miền Nam tráng mỏng vành giòn rụm, nhân tôm đất, thịt ba chỉ và giá đỗ kèm nước mắm tỏi ớt.',
 55000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/B%C3%A1nh_x%C3%A8o_with_n%C6%B0%E1%BB%9Bc_m%E1%BA%AFm.jpg/960px-B%C3%A1nh_x%C3%A8o_with_n%C6%B0%E1%BB%9Bc_m%E1%BA%AFm.jpg',
 1, 'APPROVED', 1, NOW()),

-- Nhóm 12: Cà Phê Phin & Nước Ép Trái Cây Tươi (4 món)
(46, 6, 12, 'Cà Phê Sữa Đá Sài Gòn Pha Phin Truyền Thống',
 'Cà phê Robusta rang mộc pha phin truyền thống quyện sữa đặc béo thơm đậm đà.',
 25000, 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Viet-coffee.jpg',
 1, 'APPROVED', 1, NOW()),
(47, 6, 12, 'Nước Mía Tắc Tươi Ép Nguyên Chất',
 'Nước mía ép tươi ngọt mát kết hợp chút tắc thơm giải nhiệt ngày nắng.',
 20000, 'https://upload.wikimedia.org/wikipedia/commons/6/63/Sugarcanejuice.jpg',
 1, 'APPROVED', 1, NOW()),
(48, 6, 12, 'Nước Cam Vàng Vắt Tươi Nguyên Chất',
 'Cam sành mọng nước vắt tươi 100% giàu vitamin C tăng sức đề kháng.',
 32000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Orangejuice.jpg/960px-Orangejuice.jpg',
 1, 'APPROVED', 1, NOW()),
(49, 6, 12, 'Dừa Xiêm Bến Tre Ướp Lạnh Nguyên Trái',
 'Dừa xiêm xanh Bến Tre nước ngọt thanh tự nhiên, cùi dừa non mềm dẻo.',
 28000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Young_Coconut_Drink.jpg/960px-Young_Coconut_Drink.jpg',
 1, 'APPROVED', 1, NOW()),

-- ============================================================================
-- QUÁN 7: CƠM TẤM SƯỜN NƯỚNG THAN HOA - VÕ VĂN TẦN (item_id 50..61 — 12 MÓN KHỚP ẢNH 100%)
-- ============================================================================
-- Nhóm 13: Cơm Tấm Sườn Nướng & Cơm Thịt Nướng (4 món)
(50, 7, 13, 'Cơm Tấm Sườn Bì Chả Trứng Ốp La Đặc Biệt',
 'Sườn cốt lết bản to ướp mật ong nướng than hồng, bì thính, chả trứng hấp và ốp la lòng đào.',
 62000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/C%C6%A1m_T%E1%BA%A5m%2C_Da_Nang%2C_Vietnam.jpg/960px-C%C6%A1m_T%E1%BA%A5m%2C_Da_Nang%2C_Vietnam.jpg',
 1, 'APPROVED', 1, NOW()),
(51, 7, 13, 'Cơm Thịt Heo Nướng Than Hoa & Đồ Chua',
 'Thịt nạc vai heo ướp sả mật ong nướng lửa than hồng, ăn kèm cơm nóng, dưa góp và nước mắm kẹo.',
 55000, 'https://www.themealdb.com/images/media/meals/f0cdwk1782688162.jpg',
 1, 'APPROVED', 1, NOW()),
(52, 7, 13, 'Cơm Sườn Cốt Lết Rim Sốt Đậm Đà',
 'Hai miếng sườn cốt lết rim sốt hành tỏi đậm vị, dùng kèm cơm dẻo và rau củ luộc.',
 60000, 'https://www.themealdb.com/images/media/meals/087fu71783802698.jpg',
 1, 'APPROVED', 1, NOW()),
(53, 7, 13, 'Cơm Đùi Gà Nướng Ngũ Vị & Salad Tươi',
 'Đùi gà ướp gia vị nướng vàng ươm thơm nức, ăn kèm cơm hạt dẻo và dưa leo cà chua.',
 58000, 'https://www.themealdb.com/images/media/meals/020z181619788503.jpg',
 1, 'APPROVED', 1, NOW()),

-- Nhóm 14: Món Ăn Kèm Cơm Tấm Gọi Thêm (4 món)
(54, 7, 14, 'Sườn Heo Nướng Than Hoa Gọi Thêm (Đĩa Lớn)',
 'Đĩa sườn heo nướng mới nóng hổi trên vỉ than hồng, thịt mềm thấm vị.',
 38000, 'https://upload.wikimedia.org/wikipedia/commons/e/eb/S%C6%B0%E1%BB%9Dn_n%C6%B0%E1%BB%9Bng.jpg',
 1, 'APPROVED', 1, NOW()),
(55, 7, 14, 'Lạp Xưởng Tươi Miền Tây Nướng (Phần 2 Cây)',
 'Lạp xưởng tươi Cai Lậy nạc nhiều ít mỡ, nướng than thơm lừng dùng kèm cơm tấm.',
 22000, 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Chinesesausageunpackaged.jpg',
 1, 'APPROVED', 1, NOW()),
(56, 7, 14, 'Chả Giò Chiếc Nhỏ Chiên Giòn Ăn Kèm (4 Cuốn)',
 'Chả giò nhân thịt chiên vàng giòn rụm gọi thêm cho dĩa cơm tấm thêm đầy đặn.',
 25000, 'https://www.themealdb.com/images/media/meals/grhn401765687086.jpg',
 1, 'APPROVED', 1, NOW()),
(57, 7, 14, 'Kim Chi Cải Thảo Muối Chua Ngọt Giải Ngấy',
 'Đĩa kim chi cải thảo giòn cay nhẹ ăn kèm cơm sườn nướng cực kỳ bắt vị.',
 15000, 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Various_kimchi.jpg',
 1, 'APPROVED', 1, NOW()),

-- Nhóm 15: Canh Nóng Gọi Thêm (2 món)
(58, 7, 15, 'Canh Chua Tôm Cá Nấu Dọc Mùng Thơm Ngọt',
 'Chén canh chua miền Nam nấu me tươi, cà chua, dọc mùng và giá đỗ ngọt thanh.',
 25000, 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Canhchua2.jpg',
 1, 'APPROVED', 1, NOW()),
(59, 7, 15, 'Canh Kim Chi Đậu Hũ Non Thịt Heo Nóng Hổi',
 'Canh kim chi hầm xương chua cay dịu nhẹ cùng đậu hũ non mềm mịn.',
 25000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Korean_stew_dish_-_Kimchi-jjigae_Kimchi_Stew_2019_%2801%29.jpg/960px-Korean_stew_dish_-_Kimchi-jjigae_Kimchi_Stew_2019_%2801%29.jpg',
 1, 'APPROVED', 1, NOW()),
(60, 7, 30, 'Bánh Kem Trứng Nướng Caramel Mềm Mịn',
 'Lớp kem trứng sữa béo ngậy phủ đường nướng caramel vàng óng tráng miệng sau bữa ăn.',
 28000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/2014_0531_Cr%C3%A8me_br%C3%BBl%C3%A9e_Doi_Mae_Salong_%28cropped%29.jpg/960px-2014_0531_Cr%C3%A8me_br%C3%BBl%C3%A9e_Doi_Mae_Salong_%28cropped%29.jpg',
 1, 'APPROVED', 1, NOW()),
(61, 7, 30, 'Sinh Tố Kiwi & Táo Xanh Mát Lạnh',
 'Sinh tố trái cây tươi xay nhuyễn giàu vitamin giúp thanh lọc và tiêu hóa tốt.',
 32000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Kiwi_Smoothie.jpg/960px-Kiwi_Smoothie.jpg',
 1, 'APPROVED', 1, NOW()),

-- ============================================================================
-- QUÁN 8: LẨU THÁI TOMYUM & BÒ NƯỚNG SẤM SÉT - BẾN THÀNH (item_id 62..73 — 12 MÓN KHỚP ẢNH 100%)
-- ============================================================================
-- Nhóm 16: Lẩu Thái Tomyum & Lẩu Bò Nhúng (4 món)
(62, 8, 16, 'Set Lẩu Thái Tomyum Tôm Sú Hải Sản Chua Cay',
 'Nồi lẩu Tomyum Kung chuẩn vị Thái Lan với tôm sú lớn, nấm rơm, sả, lá chúc và nước cốt dừa béo cay.',
 189000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Tom_yam_kung_maenam.jpg/960px-Tom_yam_kung_maenam.jpg',
 1, 'APPROVED', 1, NOW()),
(63, 8, 16, 'Set Lẩu Bò Mỹ Nhúng Shabu-Shabu & Rau Nấm',
 'Khay thịt ba chỉ bò Mỹ thái lát mỏng nhúng nước lẩu thanh ngọt cùng cải thảo, nấm đông cô và đậu hũ.',
 199000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Shabu-shabu-01.jpg/960px-Shabu-shabu-01.jpg',
 1, 'APPROVED', 1, NOW()),
(64, 8, 16, 'Set Lẩu Bò Sukiyaki Nấm Kim Châm & Đậu Hũ',
 'Thịt bò vân mỡ mềm ngọt nấu trong nước sốt Sukiyaki đậm đà cùng nấm kim châm, hành boa-rô và mì Udon.',
 209000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Sukiyaki_01.jpg/960px-Sukiyaki_01.jpg',
 1, 'APPROVED', 1, NOW()),
(65, 8, 16, 'Set Đại Tiệc Lẩu Nhúng Tổng Hợp (Dành Cho 3–4 Người)',
 'Đầy đủ thịt bò Mỹ, hải sản tươi, viên thả lẩu phô mai, nấm tươi các loại và rau xanh theo mùa.',
 269000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Day177lilybday.JPG/960px-Day177lilybday.JPG',
 1, 'APPROVED', 1, NOW()),

-- Nhóm 17: Thịt Bò Mỹ & Sườn Nướng BBQ Than Hoa (4 món)
(66, 8, 17, 'Dẻ Sườn Bò Mỹ Nướng Sốt Galbi Hàn Quốc (250g)',
 'Dẻ sườn bò Mỹ cắt khía ướp sốt Galbi nướng trên vỉ than hồng thơm phức, kèm xà lách và kim chi.',
 145000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Korean.food-Galbi-03.jpg/960px-Korean.food-Galbi-03.jpg',
 1, 'APPROVED', 1, NOW()),
(67, 8, 17, 'Sườn Cây BBQ Nướng Sốt Mật Ong Cháy Cạnh',
 'Tảng sườn heo nướng chậm phết sốt BBQ mật ong óng ánh, thịt mềm róc xương kèm dưa chuột muối.',
 135000, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(68, 8, 17, 'Bò Mỹ Nướng Bulgogi Sốt Lê Tỏi Thơm Mềm',
 'Thịt bò thái mỏng ướp nước ép lê Hàn Quốc, dầu mè và tỏi nướng xèo xèo rắc mè rang.',
 125000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Bulgogi_2.jpg/960px-Bulgogi_2.jpg',
 1, 'APPROVED', 1, NOW()),
(69, 8, 17, 'Thăn Nội Bò Bít Tết Áp Chảo Sốt Nấm Tiêu Đen',
 'Miếng thăn bò dày mọng áp chảo medium-rare dùng kèm sốt nấm hương kem tươi và bông cải xanh.',
 159000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Beef_fillet_steak_with_mushrooms.jpg/960px-Beef_fillet_steak_with_mushrooms.jpg',
 1, 'APPROVED', 1, NOW()),

-- Nhóm 18: Hải Sản Nướng & Món Ăn Kèm BBQ (4 món)
(70, 8, 18, 'Tôm Sú Nướng Sốt Hành Xanh Bơ Tỏi',
 'Tôm sú biển cỡ lớn nướng vỏ giòn phủ sốt hành lá bơ tỏi thơm lừng.',
 115000, 'https://www.themealdb.com/images/media/meals/jg4r991779916649.jpg',
 1, 'APPROVED', 1, NOW()),
(71, 8, 18, 'Xiên Thịt Nướng BBQ Than Hồng Rau Củ (6 Xiên)',
 'Những xiên thịt heo, bò và ớt chuông nướng xém cạnh trên than hoa dậy mùi khói thơm.',
 95000, 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(72, 8, 18, 'Cơm Trộn Hàn Quốc Bibimbap Bò Nướng Trứng Lòng Đào',
 'Cơm thố đá nóng trộn thịt bò nướng, nấm, cà rốt, giá đỗ, trứng ốp la và tương ớt Gochujang.',
 68000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Dolsot-bibimbap.jpg/960px-Dolsot-bibimbap.jpg',
 1, 'APPROVED', 1, NOW()),
(73, 8, 18, 'Miến Trộn Hàn Quốc Japchae Bò & Rau Nấm',
 'Sợi miến khoai lang Hàn Quốc dai trong suốt xào cùng thịt bò, nấm hương, ớt chuông và dầu mè.',
 65000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Polish_Korean_Cuisine_and_Culture_Exchanges_Gradmother%E2%80%99s_Recipes_05.jpg/960px-Polish_Korean_Cuisine_and_Culture_Exchanges_Gradmother%E2%80%99s_Recipes_05.jpg',
 1, 'APPROVED', 1, NOW()),

-- ============================================================================
-- QUÁN 9: GÀ RÁN GIÒN CAY & BURGER PHÔ MAI - HAI BÀ TRƯNG (item_id 74..85 — 12 MÓN KHỚP ẢNH 100%)
-- ============================================================================
-- Nhóm 19: Gà Rán Giòn Cay Hàn Quốc (4 món)
(74, 9, 19, 'Gà Rán Sốt Cay Ngọt Hàn Quốc Yangnyeom',
 'Gà tươi tẩm bột chiên giòn 2 lửa áo đẫm sốt Gochujang mật ong cay ngọt và hạt mè rang.',
 89000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Korean_fried_chicken_2.jpg/960px-Korean_fried_chicken_2.jpg',
 1, 'APPROVED', 1, NOW()),
(75, 9, 19, 'Đùi & Cánh Gà Rán Giòn Rụm Truyền Thống',
 'Lớp vỏ bột vảy giòn tan vàng ươm bọc lấy phần thịt gà nóng hổi mọng nước bên trong.',
 79000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Kentucky_Fried_Chicken_2_Piece_Extra_Cripsy_Deal_%2841436749840%29.jpg/960px-Kentucky_Fried_Chicken_2_Piece_Extra_Cripsy_Deal_%2841436749840%29.jpg',
 1, 'APPROVED', 1, NOW()),
(76, 9, 19, 'Cánh Gà Chiên Sốt Cay Buffalo Đậm Vị (6 Chiếc)',
 'Cánh gà chiên giòn lắc sốt ớt bơ Buffalo chua cay kích thích vị giác.',
 82000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Buffalo_wings-01.jpg/960px-Buffalo_wings-01.jpg',
 1, 'APPROVED', 1, NOW()),
(77, 9, 19, 'Gà Viên Giòn Rụm Chicken Nuggets (Hộp 9 Viên)',
 'Thịt ức gà phi lê xay nhuyễn bọc lớp vỏ giòn tan, chấm sốt tương cà hoặc mù tạt mật ong.',
 55000, 'https://upload.wikimedia.org/wikipedia/commons/6/64/Chicken_Nuggets.jpg',
 1, 'APPROVED', 1, NOW()),

-- Nhóm 20: Burger Bò Mỹ & Bánh Kẹp Nóng Hổi (4 món)
(78, 9, 20, 'Burger Bò Mỹ Nướng Phô Mai Cheddar Tan Chảy',
 'Bánh Burger mềm kẹp thịt bò Mỹ nướng lửa hồng, phô mai Cheddar, cà chua, xà lách và hành tây.',
 62000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Cheeseburger.jpg/960px-Cheeseburger.jpg',
 1, 'APPROVED', 1, NOW()),
(79, 9, 20, 'Burger Bò Mỹ 2 Tầng Thịt Xông Khói Sốt BBQ',
 'Nhân đôi thịt bò nướng và phô mai kết hợp ba chỉ xông khói giòn rụm và sốt BBQ khói.',
 79000, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(80, 9, 20, 'Burger Đùi Gà Rán Giòn Kẹp Dưa Chuột Muối',
 'Miếng phi lê đùi gà chiên giòn dày dặn kẹp bơ sốt Mayo và dưa chuột muối chua dịu.',
 59000, 'https://www.themealdb.com/images/media/meals/sbx7n71587673021.jpg',
 1, 'APPROVED', 1, NOW()),
(81, 9, 20, 'Bánh Cuộn Thịt Nướng Shawarma Sốt Bơ Tỏi',
 'Vỏ bánh mì dẹt nướng ấm cuộn đầy thịt nướng thái lát, rau tươi và sốt bơ tỏi béo mịn.',
 55000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Shawarma_2.jpg/960px-Shawarma_2.jpg',
 1, 'APPROVED', 1, NOW()),

-- Nhóm 21: Khoai Tây Chiên, Phô Mai Que & Ăn Vặt (4 món)
(82, 9, 21, 'Khoai Tây Chiên Giòn Vàng Ươm (Cỡ Lớn)',
 'Khoai tây cắt sợi chiên vàng giòn rắc muối biển, giữ độ giòn lâu khi giao hàng.',
 35000, 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(83, 9, 21, 'Phô Mai Que Mozzarella Chiên Xù (Hộp 5 Thanh)',
 'Phô mai Mozzarella kéo sợi bọc bột xù thảo mộc chiên vàng giòn kèm sốt cà chua.',
 45000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Fried_Mozzarella_Sticks_at_Millers_Pub_%28301456962%29.jpg/960px-Fried_Mozzarella_Sticks_at_Millers_Pub_%28301456962%29.jpg',
 1, 'APPROVED', 1, NOW()),
(84, 9, 21, 'Bánh Gạo Cay Hàn Quốc Tteokbokki Chả Cá',
 'Bánh gạo dẻo mềm nấu cùng chả cá Hàn Quốc, trứng luộc và sốt ớt cay ngọt đậm đà.',
 49000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Tteokbokki.JPG/960px-Tteokbokki.JPG',
 1, 'APPROVED', 1, NOW()),
(85, 9, 21, 'Xúc Xích Phô Mai Hàn Quốc Chiên Xù Corn Dog',
 'Xúc xích và phô mai xiên que bọc bột ngô chiên phồng giòn rụm, rưới tương ớt và mù tạt vàng.',
 39000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/CornDog.jpg/960px-CornDog.jpg',
 1, 'APPROVED', 1, NOW()),

-- ============================================================================
-- QUÁN 10: SUSHI CÁ HỒI & MÌ RAMEN NHẬT BẢN SAKURA - THẢO ĐIỀN (item_id 86..97 — 12 MÓN KHỚP ẢNH 100%)
-- ============================================================================
-- Nhóm 22: Sushi, Sashimi & Cơm Lươn Nhật Bản (4 món)
(86, 10, 22, 'Set Sushi & Cơm Cuộn Nhật Bản Tổng Hợp (12 Miếng)',
 'Khay Sushi đa dạng gồm Nigiri cá hồi, cá ngừ, tôm ngọt, thanh cua và các loại Maki cuộn rong biển.',
 165000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Sushi_platter.jpg/960px-Sushi_platter.jpg',
 1, 'APPROVED', 1, NOW()),
(87, 10, 22, 'Cơm Cuộn Cá Hồi Na Uy & Bơ Sáp (Salmon Roll)',
 'Cơm Nhật trộn giấm cuộn cá hồi tươi béo mịn, bơ sáp và dưa leo phủ mè rang.',
 115000, 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(88, 10, 22, 'Đĩa Sashimi Hải Sản Tươi Sống Thượng Hạng',
 'Những lát cá hồi, cá ngừ đại dương và bạch tuộc tươi rói đặt trên đá bào kèm củ cải trắng và Wasabi.',
 175000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/%E5%88%BA%E8%BA%AB%E6%8B%BC%E7%9B%A4_%283253764826%29.jpg/960px-%E5%88%BA%E8%BA%AB%E6%8B%BC%E7%9B%A4_%283253764826%29.jpg',
 1, 'APPROVED', 1, NOW()),
(89, 10, 22, 'Cơm Lươn Nhật Nướng Sốt Kabayaki (Unagi Don)',
 'Thịt lươn Nhật nướng than phết sốt ngọt Kabayaki vàng óng đặt trên cơm nóng dẻo thơm.',
 149000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/%E5%B0%8F%E5%B7%9D%E8%8F%8A%E9%B0%BB%E9%AD%9A%E9%A3%AF_%2849287165332%29.jpg/960px-%E5%B0%8F%E5%B7%9D%E8%8F%8A%E9%B0%BB%E9%AD%9A%E9%A3%AF_%2849287165332%29.jpg',
 1, 'APPROVED', 1, NOW()),

-- Nhóm 23: Mì Ramen, Udon & Cơm Cà Ri Nhật (4 món)
(90, 10, 23, 'Mì Ramen Tonkotsu Hầm Xương Trứng Lòng Đào',
 'Nước dùng xương heo hầm trắng sữa 16 giờ, thịt xá xíu Chashu mềm tan, mộc nhĩ và trứng ngâm tương.',
 95000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Tonkotsu_ramen.JPG/960px-Tonkotsu_ramen.JPG',
 1, 'APPROVED', 1, NOW()),
(91, 10, 23, 'Mì Ramen Shoyu Xá Xíu Nhật Bản Truyền Thống',
 'Nước súp tương Nhật Shoyu trong thanh đậm đà ăn cùng mì tươi, thịt xá xíu, măng khô Menma và lá rong biển.',
 92000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Shoyu_Ramen.jpg/960px-Shoyu_Ramen.jpg',
 1, 'APPROVED', 1, NOW()),
(92, 10, 23, 'Mì Udon Nóng Nước Dùng Cá Bào Dashi',
 'Sợi mì Udon tươi to tròn dai mềm trong nước súp Dashi ngọt dịu rắc hành lá xanh.',
 79000, 'https://upload.wikimedia.org/wikipedia/commons/9/97/Kakeudon.jpg',
 1, 'APPROVED', 1, NOW()),
(93, 10, 23, 'Cơm Cà Ri Nhật Bản Sánh Mịn Truyền Thống',
 'Cơm trắng Nhật dùng kèm sốt cà ri hầm thịt bò, khoai tây và cà rốt sánh mịn thơm dịu.',
 85000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Beef_curry_rice_003.jpg/960px-Beef_curry_rice_003.jpg',
 1, 'APPROVED', 1, NOW()),

-- Nhóm 24: Món Chiên & Khai Vị Nhật Bản (4 món)
(94, 10, 24, 'Bánh Bạch Tuộc Nướng Takoyaki Sốt Cá Bào (6 Viên)',
 'Viên bánh nướng nhân bạch tuộc giòn sần sật, phủ sốt Takoyaki, Mayo Nhật và cá bào Katsuobushi.',
 52000, 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Takoyaki_by_yomi955.jpg',
 1, 'APPROVED', 1, NOW()),
(95, 10, 24, 'Tôm & Rau Củ Chiên Giòn Tempura Nhật Bản',
 'Tôm sú và rau củ tẩm lớp bột Tempura mỏng nhẹ chiên vàng giòn chấm nước sốt củ cải mài.',
 75000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Tempura_01.jpg/960px-Tempura_01.jpg',
 1, 'APPROVED', 1, NOW()),
(96, 10, 24, 'Thịt Heo Chiên Xù Tonkatsu Giòn Rụm Kèm Bắp Cải',
 'Miếng thăn heo dày tẩm bột Panko chiên xù vàng ươm, thái lát dùng kèm bắp cải thái chỉ và sốt Tonkatsu.',
 88000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Tonkatsu_of_Kimukatsu.jpg/960px-Tonkatsu_of_Kimukatsu.jpg',
 1, 'APPROVED', 1, NOW()),
(97, 10, 24, 'Súp Tương Miso Đậu Hũ Non Rong Biển',
 'Chén súp Miso truyền thống ấm bụng với đậu hũ non mềm mượt và rong biển Wakame.',
 25000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Miso_Soup_001.jpg/960px-Miso_Soup_001.jpg',
 1, 'APPROVED', 1, NOW()),

-- ============================================================================
-- QUÁN 11: BÚN ĐẬU MẮM TÔM & ĐẶC SẢN HÀ NỘI - VÕ THỊ SÁU (item_id 98..109 — 12 MÓN KHỚP ẢNH 100%)
-- ============================================================================
-- Nhóm 25: Bún Đậu & Các Món Bún Hà Nội (5 món)
(98, 11, 25, 'Mẹt Bún Đậu Mắm Tôm Thập Cẩm Phố Cổ',
 'Mẹt lá chuối đầy đủ bún lá, đậu mơ rán giòn, thịt chân giò luộc, chả cốm, nem rán, dồi sụn và mắm tôm tắc ớt.',
 65000, 'https://upload.wikimedia.org/wikipedia/commons/1/11/B%C3%BAn_%C4%91%E1%BA%ADu_m%E1%BA%AFm_t%C3%B4m_%282019%29.jpg',
 1, 'APPROVED', 1, NOW()),
(99, 11, 25, 'Bún Chả Thịt Nướng Than Hoa Hà Nội',
 'Chả viên và thịt ba chỉ nướng xém cạnh trên than hoa ngâm trong bát nước chấm đu đủ xanh chua ngọt kèm bún tươi.',
 60000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/B%C3%BAn_ch%E1%BA%A3_Th%E1%BB%A5y_Khu%C3%AA.jpg/960px-B%C3%BAn_ch%E1%BA%A3_Th%E1%BB%A5y_Khu%C3%AA.jpg',
 1, 'APPROVED', 1, NOW()),
(100, 11, 25, 'Bún Thang Gà Xé Trứng Giò Lụa Phố Cổ',
 'Tinh hoa ẩm thực Hà Thành với sợi bún nhỏ, thịt gà ta xé, trứng tráng mỏng thái chỉ, giò lụa và nước dùng tôm khô.',
 62000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/B%C3%BAn_thang.JPG/960px-B%C3%BAn_thang.JPG',
 1, 'APPROVED', 1, NOW()),
(101, 11, 25, 'Bún Riêu Cua Đồng Đậu Rán Giò Tai',
 'Nước riêu cua đồng chưng hành phi thơm nức, đậu hũ rán phồng, cà chua, giò tai và rau sống.',
 58000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/B%C3%BAn_ri%C3%AAu_%C4%91%E1%BA%B7c_bi%E1%BB%87t.jpg/960px-B%C3%BAn_ri%C3%AAu_%C4%91%E1%BA%B7c_bi%E1%BB%87t.jpg',
 1, 'APPROVED', 1, NOW()),
(106, 11, 25, 'Bún Ốc Nóng Nước Dùng Dấm Bỗng Chua Thanh',
 'Ốc nhồi tươi giòn sần sật, đậu phụ rán, cà chua và nước dùng dấm bỗng dậy mùi tía tô hành hoa.',
 55000, 'https://upload.wikimedia.org/wikipedia/commons/3/37/B%C3%BAn_%E1%BB%91c.jpg',
 1, 'APPROVED', 1, NOW()),

-- Nhóm 26: Nem Rán, Dồi & Lòng Phố Cổ (4 món)
(102, 11, 26, 'Nem Rán Hà Nội Nhân Thịt Mộc Nhĩ (Hộp 6 Cuốn)',
 'Nem rán truyền thống vỏ giòn rụm, nhân thịt heo, miến, mộc nhĩ, nấm hương chấm nước mắm chua ngọt.',
 45000, 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Cha_gio.jpg',
 1, 'APPROVED', 1, NOW()),
(103, 11, 26, 'Dồi Sụn & Lòng Rán Thơm Lừng Phố Cổ',
 'Đĩa dồi sụn heo trộn rau thơm, tiết và lạc rang luộc chín rồi rán sém cạnh thơm nức.',
 42000, 'https://upload.wikimedia.org/wikipedia/commons/3/34/D%E1%BB%93i.jpg',
 1, 'APPROVED', 1, NOW()),
(104, 11, 26, 'Đĩa Lòng Non & Tràng Luộc Chấm Mắm Tôm',
 'Lòng non và tràng heo tươi làm sạch luộc trắng giòn sần sật, ăn kèm rau húng láng và mắm tôm chanh ớt.',
 55000, 'https://upload.wikimedia.org/wikipedia/commons/4/49/Tr%C3%A0ng_l%E1%BB%A3n_lu%E1%BB%99c.jpg',
 1, 'APPROVED', 1, NOW()),
(105, 11, 26, 'Bánh Gối Hà Nội Nhân Thịt Trứng Cút (2 Chiếc)',
 'Vỏ bánh xếp nếp chiên vàng giòn tan, nhân thịt băm, mộc nhĩ, miến và trứng cút kèm nước chấm đu đủ.',
 40000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Karipap_Chiang_Mai.jpg/960px-Karipap_Chiang_Mai.jpg',
 1, 'APPROVED', 1, NOW()),

-- Nhóm 27: Đồ Uống Giải Khát Phố Cổ (3 món)
(107, 11, 27, 'Trà Chanh Tươi Mật Ong Phố Nhà Thờ',
 'Trà xanh pha chanh tươi và mật ong chua ngọt mát lạnh giải ngấy sau khi ăn bún đậu.',
 22000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Lemonade_-_27682817724.jpg/960px-Lemonade_-_27682817724.jpg',
 1, 'APPROVED', 1, NOW()),
(108, 11, 27, 'Trà Tắc Cam Sả Đá Lạnh Giải Nhiệt',
 'Trà ủ lạnh pha tắc tươi và cam vàng thơm dịu.',
 22000, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=700&q=80',
 1, 'APPROVED', 1, NOW()),
(109, 11, 27, 'Sữa Đậu Nành Lạnh Nhà Nấu Thanh Mát',
 'Sữa đậu nành nguyên chất nấu lá dứa ngọt dịu.',
 20000, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/001-soymilk.jpg/960px-001-soymilk.jpg',
 1, 'APPROVED', 1, NOW());

-- ============================================================================
-- 7. SEED CART, ORDERS, PAYMENTS, REVIEWS & COMPLAINTS
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
(1, 1, 'Cơm Gà Nướng Mật Ong Nguyên Đùi', 55000, 1, 55000),
(1, 3, 'Trà Tắc Cam Sả Đá Lạnh Giải Nhiệt', 18000, 1, 18000);

INSERT INTO payments
(order_id, provider, transaction_code, amount, payment_status, response_code, paid_at)
VALUES
(1, 'VNPAY', 'DEMO-TXN-0001', 88000, 'SUCCESS', '00', NOW() - INTERVAL 2 DAY);

INSERT INTO reviews (order_id, customer_id, restaurant_id, rating, content) VALUES
(1, 4, 1, 5, 'Món ăn ngon, giao hàng nhanh.');

INSERT INTO complaints (customer_id, order_id, title, content, complaint_status) VALUES
(4, 1, 'Giao hàng hơi trễ', 'Đơn giao trễ khoảng 15 phút.', 'OPEN');
