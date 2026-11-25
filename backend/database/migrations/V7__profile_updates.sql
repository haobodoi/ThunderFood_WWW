-- Approved restaurants keep serving with their current profile while a proposed update is reviewed.
CREATE TABLE restaurant_profile_updates (
  update_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id BIGINT UNSIGNED NOT NULL,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(16) NOT NULL,
  profile_json LONGTEXT NOT NULL,
  status_reason VARCHAR(500) NULL,
  version BIGINT NOT NULL DEFAULT 0,
  submitted_at DATETIME NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (update_id),
  KEY idx_profile_update_queue (status, submitted_at),
  KEY idx_profile_update_restaurant (restaurant_id, update_id),
  CONSTRAINT fk_profile_update_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id) ON DELETE RESTRICT,
  CONSTRAINT fk_profile_update_owner FOREIGN KEY (owner_user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_profile_update_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT chk_profile_update_status CHECK (status IN ('DRAFT','PENDING','APPROVED','REJECTED'))
) ENGINE=InnoDB;

CREATE TABLE restaurant_profile_update_review_logs (
  log_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  update_id BIGINT UNSIGNED NOT NULL,
  admin_id BIGINT UNSIGNED NOT NULL,
  decision VARCHAR(16) NOT NULL,
  reason VARCHAR(500) NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (log_id),
  KEY idx_profile_update_log (update_id, created_at),
  CONSTRAINT fk_profile_update_log_update FOREIGN KEY (update_id) REFERENCES restaurant_profile_updates(update_id) ON DELETE CASCADE,
  CONSTRAINT fk_profile_update_log_admin FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB;
