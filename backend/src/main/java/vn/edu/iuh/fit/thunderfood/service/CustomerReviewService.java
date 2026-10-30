package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.iuh.fit.thunderfood.dto.CustomerRequests.*;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.repository.CustomerDataRepository;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;
import static vn.edu.iuh.fit.thunderfood.repository.CustomerDataRepository.number;
import static vn.edu.iuh.fit.thunderfood.service.CustomerRules.*;

@Service
@Transactional
public class CustomerReviewService {
    private final CustomerDataRepository db;
    private final CustomerRules rules;
    public CustomerReviewService(CustomerDataRepository db, CustomerRules rules) { this.db = db; this.rules = rules; }
    static LocalDateTime date(Object value) { return value instanceof Timestamp t ? t.toLocalDateTime() : (LocalDateTime) value; }
    private Map<String,Object> review(long id) { return db.one("SELECT * FROM customer_reviews WHERE review_id=? FOR UPDATE", id); }
    private void publicRestaurant(long id) { db.one("SELECT restaurant_id FROM restaurants WHERE restaurant_id=? AND status='APPROVED'", id); }
    public void editable(long customer, Map<String,Object> review) {
        if (number(review,"customer_id") != customer || review.get("deleted_at") != null)
            throw new vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException("Không tìm thấy đánh giá");
        if (rules.now().isAfter(date(review.get("created_at")).plusDays(7)))
            throw new BusinessException("Chỉ được sửa đánh giá trong 7 ngày sau khi gửi");
    }
    private void page(int page) { if (page < 0 || page > 10000) throw new BusinessException("Trang không hợp lệ"); }

    @Transactional(readOnly=true)
    public Map<String,Object> list(long restaurant, int page, Integer stars, boolean photos, String sort, Long viewer) {
        publicRestaurant(restaurant); page(page);
        if (stars != null && (stars < 1 || stars > 5)) throw new BusinessException("Số sao không hợp lệ");
        String order = switch (sort) { case "highest" -> "v.rating DESC,"; case "lowest" -> "v.rating ASC,"; case "newest" -> ""; default -> throw new BusinessException("Cách sắp xếp không hợp lệ"); };
        String where = " WHERE v.restaurant_id=? AND v.status='PUBLISHED' AND v.deleted_at IS NULL";
        List<Object> args = new ArrayList<>(); args.add(restaurant);
        if (stars != null) { where += " AND v.rating=?"; args.add(stars); }
        if (photos) where += " AND EXISTS (SELECT 1 FROM review_images i WHERE i.review_id=v.review_id)";
        long total = number(db.one("SELECT COUNT(*) AS total FROM customer_reviews v"+where, args.toArray()),"total");
        args.add(page*10);
        var rows = db.rows("SELECT v.review_id,v.customer_id,v.rating,v.content,v.created_at,v.edited_at,u.full_name AS author_name FROM customer_reviews v JOIN users u ON u.user_id=v.customer_id"+where+" ORDER BY "+order+" v.created_at DESC,v.review_id DESC LIMIT 10 OFFSET ?",args.toArray());
        rows.forEach(row -> { row.put("is_own", viewer != null && viewer == number(row,"customer_id")); row.remove("customer_id"); attachments(row); });
        var stats = db.rows("SELECT * FROM restaurant_rating_summary WHERE restaurant_id=?", restaurant);
        Map<String,Object> summary = stats.isEmpty() ? new LinkedHashMap<>() : stats.getFirst();
        if (stats.isEmpty()) { summary.put("review_count",0); summary.put("average_rating",null); for(int i=1;i<=5;i++) summary.put("stars_"+i,0); }
        return Map.of("items", rows, "total", total, "page", page, "summary", summary);
    }
    private void attachments(Map<String,Object> row) {
        long id = number(row,"review_id");
        var images = db.rows("SELECT image_id,display_order FROM review_images WHERE review_id=? ORDER BY display_order", id);
        images.forEach(i -> i.put("url", "/api/restaurants/review-images/"+i.get("image_id")));
        row.put("images", images);
        var replies = db.rows("SELECT reply_id,content,version,created_at,updated_at,deleted_at FROM review_replies WHERE review_id=?", id);
        row.put("reply_version", replies.isEmpty() ? 0 : replies.getFirst().get("version"));
        row.put("replies", replies.stream().filter(r -> r.get("deleted_at") == null).toList());
    }
    @Transactional(readOnly=true)
    public Map<String,Object> eligibility(long customer, long restaurant) {
        rules.actor(customer,"CUSTOMER",false); publicRestaurant(restaurant);
        var orders = db.rows("SELECT o.order_id,o.order_code,o.completed_at FROM orders o JOIN restaurants r ON r.restaurant_id=o.restaurant_id WHERE o.customer_id=? AND o.restaurant_id=? AND r.owner_user_id<>? AND o.order_status='COMPLETED' AND o.completed_at>=? AND o.completed_at<=? AND NOT EXISTS(SELECT 1 FROM customer_reviews v WHERE v.order_id=o.order_id) ORDER BY o.completed_at DESC,o.order_id DESC", customer,restaurant,customer,rules.now().minusDays(30),rules.now());
        return Map.of("orders",orders,"reason",orders.isEmpty()?"Bạn cần đơn đã hoàn tất trong 30 ngày và chưa đánh giá để viết đánh giá.":"");
    }
    public long create(long customer, Review request) {
        rules.actor(customer,"CUSTOMER",true);
        var order = db.one("SELECT o.*,r.owner_user_id,r.status AS restaurant_status FROM orders o JOIN restaurants r ON r.restaurant_id=o.restaurant_id WHERE o.order_id=? AND o.customer_id=? FOR UPDATE",request.orderId(),customer);
        Object completed = order.get("completed_at");
        if (!"COMPLETED".equals(order.get("order_status")) || completed == null || date(completed).isAfter(rules.now()) || date(completed).isBefore(rules.now().minusDays(30)) || number(order,"owner_user_id")==customer || !"APPROVED".equals(order.get("restaurant_status")))
            throw new BusinessException("Đơn hàng không đủ điều kiện đánh giá");
        if (!db.rows("SELECT review_id FROM customer_reviews WHERE order_id=?",request.orderId()).isEmpty()) throw new BusinessException("Đơn này đã được đánh giá");
        if (number(db.one("SELECT COUNT(*) AS total FROM customer_reviews WHERE customer_id=? AND created_at>=?",customer,rules.now().minusDays(1)),"total")>=10)
            throw new BusinessException("Bạn đã đạt giới hạn 10 đánh giá trong 24 giờ");
        return db.insert("INSERT INTO customer_reviews(order_id,customer_id,restaurant_id,rating,content,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",request.orderId(),customer,order.get("restaurant_id"),request.rating(),text(request.content(),10,1000),rules.now(),rules.now());
    }
    public void edit(long customer,long id,EditReview request) {
        rules.actor(customer,"CUSTOMER",true); var row=review(id); editable(customer,row); version(row,request.version());
        db.update("UPDATE customer_reviews SET rating=?,content=?,edited_at=?,updated_at=?,version=version+1 WHERE review_id=?",request.rating(),text(request.content(),10,1000),rules.now(),rules.now(),id);
    }
    public void delete(long customer,long id,long expected) {
        rules.actor(customer,"CUSTOMER",true); var row=review(id);
        if(number(row,"customer_id")!=customer || row.get("deleted_at")!=null) throw new vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException("Không tìm thấy đánh giá");
        version(row,expected);
        db.update("UPDATE customer_reviews SET deleted_at=?,updated_at=?,version=version+1 WHERE review_id=?",rules.now(),rules.now(),id);
    }
    @Transactional(readOnly=true)
    public Map<String,Object> own(long actor,String role,int page) {
        rules.actor(actor,role,false); page(page);
        String where = "CUSTOMER".equals(role) ? "v.customer_id=? AND v.deleted_at IS NULL" : "r.owner_user_id=? AND v.status='PUBLISHED' AND v.deleted_at IS NULL";
        var rows = db.rows("SELECT v.*,r.restaurant_name,r.owner_user_id,u.full_name AS author_name FROM customer_reviews v JOIN restaurants r ON r.restaurant_id=v.restaurant_id JOIN users u ON u.user_id=v.customer_id WHERE "+where+" ORDER BY v.created_at DESC,v.review_id DESC LIMIT 10 OFFSET ?",actor,page*10);
        rows.forEach(row -> { attachments(row); row.put("editable", "CUSTOMER".equals(role) && !rules.now().isAfter(date(row.get("created_at")).plusDays(7))); });
        long total = number(db.one("SELECT COUNT(*) AS total FROM customer_reviews v JOIN restaurants r ON r.restaurant_id=v.restaurant_id WHERE "+where,actor),"total");
        return Map.of("items",rows,"page",page,"total",total);
    }
    public void reply(long partner,long id,Reply request,boolean delete) {
        rules.actor(partner,"RESTAURANT_PARTNER",true); var row=review(id);
        db.one("SELECT restaurant_id FROM restaurants WHERE restaurant_id=? AND owner_user_id=?",row.get("restaurant_id"),partner);
        if(row.get("deleted_at")!=null || !"PUBLISHED".equals(row.get("status"))) throw new BusinessException("Đánh giá hiện không công khai");
        var replies=db.rows("SELECT * FROM review_replies WHERE review_id=? FOR UPDATE",id);
        if(replies.isEmpty()) {
            if(delete) throw new BusinessException("Chưa có phản hồi");
            if(request.version()!=0) throw new vn.edu.iuh.fit.thunderfood.exception.ConcurrentUpdateException();
            db.update("INSERT INTO review_replies(review_id,partner_id,content,version) VALUES (?,?,?,1)",id,partner,text(request.content(),1,1000));
        } else {
            version(replies.getFirst(),request.version());
            db.update("UPDATE review_replies SET content=?,partner_id=?,deleted_at=?,version=version+1,updated_at=? WHERE review_id=?",delete?replies.getFirst().get("content"):text(request.content(),1,1000),partner,delete?rules.now():null,rules.now(),id);
        }
    }
    public void report(long actor,long id,String role,Report request) {
        rules.actor(actor,role,true);
        if(!Set.of("SPAM","ABUSE","PERSONAL_DATA","IRRELEVANT","OTHER").contains(request.reasonCode())) throw new BusinessException("Lý do báo cáo không hợp lệ");
        var row=review(id);
        if(row.get("deleted_at")!=null || !"PUBLISHED".equals(row.get("status")) || number(row,"customer_id")==actor) throw new BusinessException("Không thể báo cáo đánh giá này");
        if(number(db.one("SELECT COUNT(*) AS total FROM review_reports WHERE reporter_id=? AND created_at>=?",actor,rules.now().minusDays(1)),"total")>=10) throw new BusinessException("Tối đa 10 báo cáo trong 24 giờ");
        db.update("INSERT INTO review_reports(review_id,reporter_id,reason_code,reason) VALUES (?,?,?,?)",id,actor,request.reasonCode(),text(request.reason(),5,500));
    }
    @Transactional(readOnly=true)
    public Map<String,Object> reports(long admin,int page) {
        rules.actor(admin,"ADMIN",false); page(page);
        var rows=db.rows("SELECT p.*,v.content AS review_content,v.rating,v.status AS review_status,v.version AS review_version,v.deleted_at,r.restaurant_name FROM review_reports p JOIN customer_reviews v ON v.review_id=p.review_id JOIN restaurants r ON r.restaurant_id=v.restaurant_id ORDER BY CASE WHEN p.status='OPEN' THEN 0 WHEN p.status='PROCESSING' THEN 1 ELSE 2 END,p.created_at DESC,p.report_id DESC LIMIT 10 OFFSET ?",page*10);
        rows.forEach(row -> row.put("history", db.rows("SELECT from_status,to_status,reason,created_at FROM review_moderation_logs WHERE review_id=? ORDER BY log_id DESC",row.get("review_id"))));
        return Map.of("items",rows,"total",number(db.one("SELECT COUNT(*) AS total FROM review_reports"),"total"),"page",page);
    }
    public void moderate(long admin,long id,Moderate request) {
        rules.actor(admin,"ADMIN",true); var row=review(id); version(row,request.version());
        if(!Set.of("PUBLISHED","HIDDEN").contains(request.status()) || request.status().equals(row.get("status"))) throw new BusinessException("Trạng thái không thay đổi hoặc không hợp lệ");
        if(row.get("deleted_at")!=null) throw new BusinessException("Không thể khôi phục đánh giá khách đã xóa");
        db.update("INSERT INTO review_moderation_logs(review_id,admin_id,from_status,to_status,reason,created_at) VALUES (?,?,?,?,?,?)",id,admin,row.get("status"),request.status(),text(request.reason(),5,500),rules.now());
        db.update("UPDATE customer_reviews SET status=?,updated_at=?,version=version+1 WHERE review_id=?",request.status(),rules.now(),id);
    }
    public void resolve(long admin,long id,ResolveReport request) {
        rules.actor(admin,"ADMIN",true); var row=db.one("SELECT * FROM review_reports WHERE report_id=? FOR UPDATE",id);
        if(!Set.of("RESOLVED","REJECTED").contains(request.status()) || !Set.of("OPEN","PROCESSING").contains(row.get("status"))) throw new BusinessException("Báo cáo đã xử lý hoặc trạng thái không hợp lệ");
        db.update("UPDATE review_reports SET status=?,handled_by=?,handled_at=?,resolution_note=? WHERE report_id=?",request.status(),admin,rules.now(),text(request.note(),1,500),id);
    }
}
