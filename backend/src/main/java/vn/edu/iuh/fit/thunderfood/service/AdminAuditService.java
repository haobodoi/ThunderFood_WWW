package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminAuditService {
    private final JdbcTemplate jdbc;
    private final CustomerRules rules;
    public AdminAuditService(JdbcTemplate jdbc, CustomerRules rules) { this.jdbc=jdbc; this.rules=rules; }
    @Transactional public void record(long actor, String action, String target, String detail) {
        jdbc.update("INSERT INTO admin_activity_logs(actor_id,action,target,detail,created_at) VALUES(?,?,?,?,?)", actor, action, target, detail, rules.now());
    }
}
