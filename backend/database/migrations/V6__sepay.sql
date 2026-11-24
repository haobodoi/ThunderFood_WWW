USE thunderfood;

CREATE TABLE IF NOT EXISTS sepay_payments (
  order_id BIGINT UNSIGNED NOT NULL,
  bank_bin CHAR(6) NOT NULL,
  bank_name VARCHAR(120) NOT NULL,
  account_number VARCHAR(19) NOT NULL,
  account_holder VARCHAR(120) NULL,
  sepay_transaction_id BIGINT NULL,
  bank_reference VARCHAR(190) NULL,
  transferred_at DATETIME NULL,
  PRIMARY KEY (order_id),
  UNIQUE KEY uq_sepay_transaction (sepay_transaction_id),
  CONSTRAINT fk_sepay_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
) ENGINE=InnoDB;
