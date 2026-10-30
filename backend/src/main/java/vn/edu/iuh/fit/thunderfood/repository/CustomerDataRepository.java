package vn.edu.iuh.fit.thunderfood.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;

import java.sql.Statement;
import java.util.List;
import java.util.Map;

/** Parameterized SQL for transactional aggregate operations and paginated projections. */
@Repository
public class CustomerDataRepository {
    private final JdbcTemplate jdbc;
    public CustomerDataRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public List<Map<String, Object>> rows(String sql, Object... args) { return jdbc.queryForList(sql, args); }
    public Map<String, Object> one(String sql, Object... args) {
        var rows = rows(sql, args);
        if (rows.isEmpty()) throw new ResourceNotFoundException("Không tìm thấy dữ liệu");
        return rows.getFirst();
    }
    public int update(String sql, Object... args) { return jdbc.update(sql, args); }
    public long insert(String sql, Object... args) {
        var keys = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            for (int i = 0; i < args.length; i++) statement.setObject(i + 1, args[i]);
            return statement;
        }, keys);
        return keys.getKey().longValue();
    }
    public static long number(Map<String, Object> row, String key) { return ((Number) row.get(key)).longValue(); }
}
