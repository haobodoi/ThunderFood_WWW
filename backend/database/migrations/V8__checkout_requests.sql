USE thunderfood;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS checkout_request_id CHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS checkout_request_hash CHAR(64) NULL,
  ADD UNIQUE KEY IF NOT EXISTS uq_order_checkout_request (customer_id, checkout_request_id);
