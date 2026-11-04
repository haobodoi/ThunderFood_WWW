package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.iuh.fit.thunderfood.dto.OrderResponses.PageResponse;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.sql.Timestamp;
import java.util.*;

/** Bounded, parameterized SQL. Aggregate in MariaDB, never load the full order table. */
@Service
@Transactional(readOnly=true)
public class AdminQueryService {
    public static final String ELIGIBLE = "o.order_status='COMPLETED' AND o.payment_status='PAID'";
    private static final String ORDER_COLUMNS = "o.order_id AS orderId,o.order_code AS orderCode,o.customer_id AS customerId,r.restaurant_name AS restaurantName,o.recipient_name AS recipientName,o.recipient_phone AS recipientPhone,o.order_status AS orderStatus,o.payment_method AS paymentMethod,o.payment_status AS paymentStatus,o.subtotal,o.delivery_fee AS deliveryFee,o.total_amount AS totalAmount,o.created_at AS createdAt";
    private final NamedParameterJdbcTemplate db;
    private final CustomerRules rules;
    public AdminQueryService(NamedParameterJdbcTemplate db, CustomerRules rules) { this.db=db; this.rules=rules; }

    public record Range(LocalDate from, LocalDate to) {
        public Range {
            if (from == null || to == null || from.getYear()<1800 || to.getYear()>2200 || to.isBefore(from) || ChronoUnit.DAYS.between(from,to)>1095) throw new BusinessException("Khoảng ngày không hợp lệ (năm 1800–2200, tối đa 1096 ngày)");
        }
        public Map<String,Object> params() { return new HashMap<>(Map.of("from",from.atStartOfDay(),"until",to.plusDays(1).atStartOfDay())); }
        public Range previous() { long days=ChronoUnit.DAYS.between(from,to)+1; return new Range(from.minusDays(days),from.minusDays(1)); }
    }
    public Range range(LocalDate from, LocalDate to) {
        LocalDate end=to==null?rules.now().toLocalDate():to;
        return new Range(from==null?end.minusDays(29):from,end);
    }
    public List<Map<String,Object>> rows(String sql, Map<String,?> params) {
        var result=db.queryForList(sql,params);
        result.forEach(row -> row.replaceAll((key,value) -> value instanceof Timestamp timestamp ? timestamp.toLocalDateTime() : value));
        return result;
    }
    public Map<String,Object> one(String sql, Map<String,?> params) {
        var result=rows(sql,params);
        if (result.isEmpty()) throw new ResourceNotFoundException("Không tìm thấy dữ liệu");
        return result.getFirst();
    }
    private static String keyword(String value) {
        String text=CustomerRules.text(value,0,150);
        return "%"+text.replace("!","!!").replace("%","!%").replace("_","!_")+"%";
    }
    private PageResponse<Map<String,Object>> page(String select, String source, String where, Map<String,Object> params, int page, String order) {
        if (page<0 || page>10000) throw new BusinessException("Trang không hợp lệ");
        params.put("limit",20); params.put("offset",page*20);
        long total=Objects.requireNonNull(db.queryForObject("SELECT COUNT(*) "+source+where,params,Long.class));
        return new PageResponse<>(rows(select+source+where+" ORDER BY "+order+" LIMIT :limit OFFSET :offset",params),page,total);
    }
    private record DashboardScope(Long owner,Long restaurant) {
        String orders() { return owner==null?"":" AND EXISTS (SELECT 1 FROM restaurants sr WHERE sr.restaurant_id=o.restaurant_id AND sr.owner_user_id=:owner)"+(restaurant==null?"":" AND o.restaurant_id=:restaurant"); }
        String menu() { return owner==null?"":" AND r.owner_user_id=:owner"+(restaurant==null?"":" AND m.restaurant_id=:restaurant"); }
        Map<String,Object> params(Range range) { var p=range.params(); if(owner!=null)p.put("owner",owner);if(restaurant!=null)p.put("restaurant",restaurant);return p; }
    }
    private Map<String,Object> metrics(Range range,DashboardScope scope) {
        var p=scope.params(range);
        var result=one("SELECT COUNT(*) AS orders,COALESCE(SUM(CASE WHEN "+ELIGIBLE+" THEN o.subtotal ELSE 0 END),0) AS revenue,COALESCE(SUM(CASE WHEN "+ELIGIBLE+" THEN o.total_amount ELSE 0 END),0) AS receipts,COALESCE(SUM(CASE WHEN "+ELIGIBLE+" THEN o.delivery_fee ELSE 0 END),0) AS deliveryFees,COALESCE(SUM("+ELIGIBLE+"),0) AS completed,COALESCE(SUM(o.order_status IN ('CANCELLED','REJECTED')),0) AS cancelled,COALESCE(SUM(o.order_status='PENDING'),0) AS pending FROM orders o WHERE o.created_at>=:from AND o.created_at<:until"+scope.orders()+"",p);
        if(scope.owner()==null) result.put("customers",db.queryForObject("SELECT COUNT(*) FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_code='CUSTOMER' AND u.created_at>=:from AND u.created_at<:until",p,Long.class));
        if(scope.owner()!=null) result.put("customers",db.queryForObject("SELECT COUNT(DISTINCT o.customer_id) FROM orders o WHERE o.created_at>=:from AND o.created_at<:until"+scope.orders(),p,Long.class));
        long count=((Number)result.get("completed")).longValue(), orders=((Number)result.get("orders")).longValue();
        result.put("average",count==0?BigDecimal.ZERO:((BigDecimal)result.get("receipts")).divide(BigDecimal.valueOf(count),2,RoundingMode.HALF_UP));
        if(scope.owner()==null) result.put("totalCustomers",db.queryForObject("SELECT COUNT(*) FROM users u JOIN roles r ON r.role_id=u.role_id WHERE r.role_code='CUSTOMER'",Map.of(),Long.class));
        if(scope.owner()!=null) result.put("totalCustomers",db.queryForObject("SELECT COUNT(DISTINCT o.customer_id) FROM orders o WHERE 1=1"+scope.orders(),p,Long.class));
        result.put("cancellationRate",orders==0?BigDecimal.ZERO:BigDecimal.valueOf(((Number)result.get("cancelled")).longValue()*100).divide(BigDecimal.valueOf(orders),2,RoundingMode.HALF_UP));
        return result;
    }
    public Map<String,Object> dashboard(Range range,String group) { return dashboard(range,group,new DashboardScope(null,null)); }
    public Map<String,Object> partnerDashboard(long owner,Long restaurant,Range range,String group) {
        rules.actor(owner,"RESTAURANT_PARTNER",false);
        if(restaurant!=null) one("SELECT restaurant_id FROM restaurants WHERE restaurant_id=:id AND owner_user_id=:owner",Map.of("id",restaurant,"owner",owner));
        return dashboard(range,group,new DashboardScope(owner,restaurant));
    }
    private Map<String,Object> dashboard(Range range,String group,DashboardScope scope) {
        String bucket=switch(group) {case "day" -> "DATE(o.created_at)";case "week" -> "DATE_SUB(DATE(o.created_at),INTERVAL WEEKDAY(o.created_at) DAY)";case "month" -> "DATE_FORMAT(o.created_at,'%Y-%m-01')";case "year" -> "DATE_FORMAT(o.created_at,'%Y-01-01')";default -> throw new BusinessException("Cách nhóm không hợp lệ");};
        var p=scope.params(range);
        Map<String,Object> result=new LinkedHashMap<>();
        result.put("from",range.from()); result.put("to",range.to()); result.put("timezone","Asia/Ho_Chi_Minh"); result.put("currency","VND"); result.put("group",group);
        result.put("current",metrics(range,scope)); result.put("previous",metrics(range.previous(),scope));
        result.put("previousFrom",range.previous().from()); result.put("previousTo",range.previous().to());
        var series=rows("SELECT "+bucket+" AS period,COUNT(*) AS orders,COALESCE(SUM(CASE WHEN "+ELIGIBLE+" THEN o.subtotal ELSE 0 END),0) AS revenue FROM orders o WHERE o.created_at>=:from AND o.created_at<:until"+scope.orders()+" GROUP BY period ORDER BY period",p);
        Map<String,Map<String,Object>> indexed=new HashMap<>(); series.forEach(row -> indexed.put(row.get("period").toString().substring(0,10),row));
        List<Map<String,Object>> filled=new ArrayList<>();
        LocalDate cursor=switch(group) {case "week" -> range.from().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));case "month" -> range.from().withDayOfMonth(1);case "year" -> range.from().withDayOfYear(1);default -> range.from();};
        while (!cursor.isAfter(range.to())) {
            String key=cursor.toString(); filled.add(indexed.getOrDefault(key,Map.of("period",key,"orders",0,"revenue",BigDecimal.ZERO)));
            cursor=switch(group) {case "week" -> cursor.plusWeeks(1);case "month" -> cursor.plusMonths(1);case "year" -> cursor.plusYears(1);default -> cursor.plusDays(1);};
        }
        result.put("series",filled);
        result.put("statuses",rows("SELECT o.order_status AS status,COUNT(*) AS count FROM orders o WHERE o.created_at>=:from AND o.created_at<:until"+scope.orders()+" GROUP BY o.order_status",p));
        result.put("paymentMethods",rows("SELECT o.payment_method AS method,COUNT(*) AS count,COALESCE(SUM(CASE WHEN "+ELIGIBLE+" THEN o.total_amount ELSE 0 END),0) AS receipts FROM orders o WHERE o.created_at>=:from AND o.created_at<:until"+scope.orders()+" GROUP BY o.payment_method",p));
        result.put("payments",rows("SELECT o.payment_status AS status,COUNT(*) AS count FROM orders o WHERE o.created_at>=:from AND o.created_at<:until"+scope.orders()+" GROUP BY o.payment_status",p));
        String sold=" FROM order_items i JOIN orders o ON o.order_id=i.order_id WHERE "+ELIGIBLE+" AND o.created_at>=:from AND o.created_at<:until"+scope.orders()+" ";
        result.put("topItems",rows("SELECT i.item_id AS itemId,i.item_name AS name,SUM(i.quantity) AS quantity,SUM(i.line_total) AS revenue"+sold+"GROUP BY i.item_id,i.item_name ORDER BY quantity DESC,name LIMIT 10",p));
        result.put("topCategories",rows("SELECT COALESCE(i.category_name,'Chưa lưu danh mục') AS name,SUM(i.quantity) AS quantity,SUM(i.line_total) AS revenue"+sold+"GROUP BY i.category_name ORDER BY quantity DESC,name LIMIT 10",p));
        result.put("slowItems",rows("SELECT m.item_id AS itemId,m.item_name AS name,r.restaurant_name AS restaurantName,COALESCE(s.quantity,0) AS quantity FROM menu_items m JOIN restaurants r ON r.restaurant_id=m.restaurant_id LEFT JOIN (SELECT i.item_id,SUM(i.quantity) AS quantity"+sold+"GROUP BY i.item_id) s ON s.item_id=m.item_id WHERE m.is_deleted=0 AND m.approval_status='APPROVED' AND m.created_at<:until"+scope.menu()+" ORDER BY quantity,m.item_id LIMIT 10",p));
        result.put("latest",rows("SELECT "+ORDER_COLUMNS+" FROM orders o JOIN restaurants r ON r.restaurant_id=o.restaurant_id WHERE o.created_at>=:from AND o.created_at<:until"+scope.orders()+" ORDER BY o.created_at DESC,o.order_id DESC LIMIT 8",p));
        if(scope.owner()==null) {
        result.put("attention",one("SELECT (SELECT COUNT(*) FROM orders WHERE order_status='PENDING') AS pending,(SELECT COUNT(*) FROM orders WHERE order_status='REJECTED' AND payment_status='PAID') AS refunds,(SELECT COUNT(*) FROM restaurants WHERE status='PENDING') AS restaurants,(SELECT COUNT(*) FROM review_reports WHERE status IN ('OPEN','PROCESSING')) AS reports",Map.of()));
        } else {
            result.put("attention",one("SELECT (SELECT COUNT(*) FROM orders o WHERE o.order_status='PENDING'"+scope.orders()+") AS pending,(SELECT COUNT(*) FROM orders o WHERE o.order_status='REJECTED' AND o.payment_status='PAID'"+scope.orders()+") AS refunds",p));
        }
        result.put("scope",scope.owner()==null?"admin":"partner");
        result.put("restaurantId",scope.restaurant());
        if(scope.owner()!=null) result.put("byRestaurant",rows("SELECT r.restaurant_id AS id,r.restaurant_name AS name,COUNT(*) AS orders,COALESCE(SUM(CASE WHEN "+ELIGIBLE+" THEN o.subtotal ELSE 0 END),0) AS revenue FROM orders o JOIN restaurants r ON r.restaurant_id=o.restaurant_id WHERE o.created_at>=:from AND o.created_at<:until"+scope.orders()+" GROUP BY r.restaurant_id,r.restaurant_name ORDER BY revenue DESC,r.restaurant_id",p));
        return result;
    }
    public PageResponse<Map<String,Object>> orders(String q, String status, String payment, LocalDate from, LocalDate to, Long customer, int page, String sort) {
        Map<String,Object> p=new HashMap<>(); p.put("q",keyword(q));
        String where=" WHERE (o.order_code LIKE :q ESCAPE '!' OR o.recipient_name LIKE :q ESCAPE '!' OR o.recipient_phone LIKE :q ESCAPE '!' OR EXISTS(SELECT 1 FROM users u WHERE u.user_id=o.customer_id AND (u.full_name LIKE :q ESCAPE '!' OR u.email LIKE :q ESCAPE '!')))";
        if(status!=null&&!status.isEmpty()){ validate(status,Set.of("PENDING","CONFIRMED","PREPARING","DELIVERING","COMPLETED","CANCELLED","REJECTED")); where+=" AND o.order_status=:status";p.put("status",status); }
        if(payment!=null&&!payment.isEmpty()){validate(payment,Set.of("UNPAID","PAID","FAILED","REFUNDED"));where+=" AND o.payment_status=:payment";p.put("payment",payment);}
        if(from!=null&&to!=null&&to.isBefore(from)) throw new BusinessException("Ngày kết thúc phải sau ngày bắt đầu");
        if(from!=null){where+=" AND o.created_at>=:from";p.put("from",from.atStartOfDay());}
        if(to!=null){where+=" AND o.created_at<:until";p.put("until",to.plusDays(1).atStartOfDay());}
        if(customer!=null){where+=" AND o.customer_id=:customer";p.put("customer",customer);}
        String ordering=switch(sort){case "oldest"->"o.created_at,o.order_id";case "total"->"o.total_amount DESC,o.order_id DESC";case "newest"->"o.created_at DESC,o.order_id DESC";default->throw new BusinessException("Sắp xếp không hợp lệ");};
        return page("SELECT "+ORDER_COLUMNS," FROM orders o JOIN restaurants r ON r.restaurant_id=o.restaurant_id",where,p,page,ordering);
    }
    public Map<String,Object> order(long id) {
        var p=Map.of("id",id);
        var row=one("SELECT "+ORDER_COLUMNS+",o.delivery_address AS deliveryAddress,o.note,o.cancel_reason AS cancelReason FROM orders o JOIN restaurants r ON r.restaurant_id=o.restaurant_id WHERE o.order_id=:id",p);
        row.put("items",rows("SELECT order_item_id AS id,item_id AS itemId,item_name AS itemName,unit_price AS unitPrice,quantity,line_total AS lineTotal,note FROM order_items WHERE order_id=:id ORDER BY order_item_id",p));
        row.put("history",rows("SELECT from_status AS fromStatus,to_status AS toStatus,from_payment AS fromPayment,to_payment AS toPayment,reason,created_at AS createdAt FROM order_history WHERE order_id=:id ORDER BY id",p));
        row.put("notes",rows("SELECT a.id,u.full_name AS actor,a.detail,a.created_at AS createdAt FROM admin_activity_logs a LEFT JOIN users u ON u.user_id=a.actor_id WHERE a.target=CONCAT('order:',:id) ORDER BY a.id DESC",p));
        row.put("payments",rows("SELECT provider,transaction_code AS transactionCode,amount,payment_status AS status FROM payments WHERE order_id=:id ORDER BY payment_id",p));
        return row;
    }
    public PageResponse<Map<String,Object>> users(String q,String role,String status,int page) {
        var p=new HashMap<String,Object>();p.put("q",keyword(q));
        String where=" WHERE (u.full_name LIKE :q ESCAPE '!' OR u.email LIKE :q ESCAPE '!' OR u.phone LIKE :q ESCAPE '!')";
        if(role!=null&&!role.isEmpty()){validate(role,Set.of("ADMIN","STAFF","CUSTOMER","RESTAURANT_PARTNER"));where+=" AND r.role_code=:role";p.put("role",role);}
        if(status!=null&&!status.isEmpty()){validate(status,Set.of("ACTIVE","LOCKED"));where+=" AND u.account_status=:status";p.put("status",status);}
        return page("SELECT u.user_id AS id,u.full_name AS fullName,u.email,u.phone,r.role_code AS role,u.account_status AS status,u.lock_reason AS lockReason,u.created_at AS createdAt"," FROM users u JOIN roles r ON r.role_id=u.role_id",where,p,page,"u.created_at DESC,u.user_id DESC");
    }
    public Map<String,Object> user(long id) {
        return one("SELECT u.user_id AS id,u.full_name AS fullName,u.email,u.phone,u.address,r.role_code AS role,u.account_status AS status,u.lock_reason AS lockReason,u.created_at AS createdAt,u.last_login_at AS lastLoginAt,(SELECT COUNT(*) FROM orders o WHERE o.customer_id=u.user_id) AS orderCount FROM users u JOIN roles r ON r.role_id=u.role_id WHERE u.user_id=:id",Map.of("id",id));
    }
    public PageResponse<Map<String,Object>> catalog(String kind,long restaurant,String q,int page,String status,Long category,String sort) {
        var p=new HashMap<String,Object>();p.put("restaurant",restaurant);p.put("q",keyword(q));
        if(kind.equals("categories")) return page("SELECT c.category_id AS id,c.category_name AS categoryName,c.display_order AS displayOrder,c.is_visible AS visible,(SELECT COUNT(*) FROM menu_items i WHERE i.category_id=c.category_id AND i.is_deleted=0) AS itemCount"," FROM menu_categories c"," WHERE c.restaurant_id=:restaurant AND c.category_name LIKE :q ESCAPE '!'",p,page,"c.display_order,c.category_id");
        String where=" WHERE m.restaurant_id=:restaurant AND m.is_deleted=0 AND m.item_name LIKE :q ESCAPE '!'";
        if(category!=null){where+=" AND m.category_id=:category";p.put("category",category);}
        if(status!=null&&!status.isEmpty()){validate(status,Set.of("available","unavailable","hidden"));where+=switch(status){case "available"->" AND m.is_available=1 AND m.approval_status='APPROVED'";case "hidden"->" AND m.approval_status='HIDDEN'";default->" AND m.is_available=0";};}
        String order=switch(sort){case "price"->"m.price,m.item_id";case "name"->"m.item_name,m.item_id";case "newest"->"m.created_at DESC,m.item_id DESC";default->throw new BusinessException("Sắp xếp không hợp lệ");};
        return page("SELECT m.item_id AS id,m.item_name AS itemName,m.category_id AS categoryId,c.category_name AS categoryName,m.price,m.description,m.image_url AS imageUrl,m.is_available AS available,m.approval_status AS approvalStatus"," FROM menu_items m LEFT JOIN menu_categories c ON c.category_id=m.category_id",where,p,page,order);
    }
    public PageResponse<Map<String,Object>> restaurants(String q,int page) {
        return page("SELECT restaurant_id AS id,restaurant_name AS name,owner_user_id AS ownerId,status,delivery_fee AS deliveryFee,is_open AS open"," FROM restaurants"," WHERE status<>'DRAFT' AND restaurant_name LIKE :q ESCAPE '!'",new HashMap<>(Map.of("q",keyword(q))),page,"restaurant_id DESC");
    }
    public PageResponse<Map<String,Object>> partnerRestaurants(long owner,String q,int page) {
        rules.actor(owner,"RESTAURANT_PARTNER",false);
        return page("SELECT restaurant_id AS id,restaurant_name AS name,status"," FROM restaurants"," WHERE owner_user_id=:owner AND restaurant_name LIKE :q ESCAPE '!'",new HashMap<>(Map.of("owner",owner,"q",keyword(q))),page,"restaurant_id DESC");
    }
    public PageResponse<Map<String,Object>> restaurantReviews(String q,String status,int page) {
        validate(status,Set.of("PENDING","APPROVED","REJECTED","LOCKED"));
        return page("SELECT r.restaurant_id AS id,r.restaurant_name AS restaurantName,CONCAT_WS(', ',r.street_address,r.ward,r.province) AS address,u.full_name AS ownerName,u.email AS ownerEmail,r.submitted_at AS submittedAt,r.status",
                " FROM restaurants r JOIN users u ON u.user_id=r.owner_user_id",
                " WHERE r.status=:status AND (r.restaurant_name LIKE :q ESCAPE '!' OR u.full_name LIKE :q ESCAPE '!' OR u.email LIKE :q ESCAPE '!')",new HashMap<>(Map.of("q",keyword(q),"status",status)),page,"r.submitted_at,r.restaurant_id");
    }
    public PageResponse<Map<String,Object>> logs(String q,int page) {
        return page("SELECT a.id,u.full_name AS actor,a.action,a.target,a.detail,a.created_at AS createdAt"," FROM admin_activity_logs a LEFT JOIN users u ON u.user_id=a.actor_id"," WHERE (a.action LIKE :q ESCAPE '!' OR a.target LIKE :q ESCAPE '!' OR u.full_name LIKE :q ESCAPE '!')",new HashMap<>(Map.of("q",keyword(q))),page,"a.id DESC");
    }
    public PageResponse<Map<String,Object>> complaints(String status,int page) {
        var p=new HashMap<String,Object>();String where=" WHERE 1=1";
        if(status!=null&&!status.isEmpty()){validate(status,Set.of("OPEN","PROCESSING","RESOLVED","REJECTED"));where+=" AND c.complaint_status=:status";p.put("status",status);}
        return page("SELECT c.complaint_id AS id,c.order_id AS orderId,u.full_name AS customer,c.title,c.content,c.complaint_status AS status,c.response,c.created_at AS createdAt"," FROM complaints c JOIN users u ON u.user_id=c.customer_id",where,p,page,"c.created_at DESC,c.complaint_id DESC");
    }
    private static void validate(String value,Set<String> allowed){if(!allowed.contains(value))throw new BusinessException("Giá trị bộ lọc không hợp lệ");}
    public String csv(Range range,String group) { return csv(dashboard(range,group)); }
    public String partnerCsv(long owner,Long restaurant,Range range,String group) { return csv(partnerDashboard(owner,restaurant,range,group)); }
    private String csv(Map<String,Object> report) {
        var out=new StringBuilder("\uFEFFThunderFood,VND,Asia/Ho_Chi_Minh\r\nTừ,"+report.get("from")+",Đến,"+report.get("to")+"\r\nQuy tắc,Đơn tạo trong kỳ và hiện COMPLETED + PAID; doanh thu món không gồm phí giao hàng\r\nKỳ,Số đơn,Doanh thu món (VND)\r\n");
        @SuppressWarnings("unchecked") var series=(List<Map<String,Object>>)report.get("series");
        for(var row:series)out.append(row.get("period")).append(',').append(row.get("orders")).append(',').append(row.get("revenue")).append("\r\n");
        out.append("\r\nChỉ số,Giá trị\r\n");
        @SuppressWarnings("unchecked") var current=(Map<String,Object>)report.get("current");
        for(String key:List.of("revenue","receipts","deliveryFees","orders","completed","customers","average","cancelled","cancellationRate"))out.append(key).append(',').append(current.get(key)).append("\r\n");
        return out.toString();
    }
}
