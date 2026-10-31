package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import vn.edu.iuh.fit.thunderfood.dto.CustomerRequests.*;
import vn.edu.iuh.fit.thunderfood.dto.OrderResponses.*;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.FieldValidationException;
import vn.edu.iuh.fit.thunderfood.repository.CustomerDataRepository;
import vn.edu.iuh.fit.thunderfood.util.InputNormalizerUtil;
import vn.edu.iuh.fit.thunderfood.util.VietQrUtil;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.format.DateTimeFormatter;
import java.util.*;
import static vn.edu.iuh.fit.thunderfood.repository.CustomerDataRepository.number;
import static vn.edu.iuh.fit.thunderfood.service.CustomerRules.*;

/**
 * Luồng đơn: PENDING -> CONFIRMED -> PREPARING -> DELIVERING -> COMPLETED; PENDING -> CANCELLED (khách);
 * PENDING/CONFIRMED -> REJECTED (quán). Đơn VietQR chỉ rời PENDING khi quán xác nhận đã nhận tiền,
 * vì chuyển khoản thẳng vào tài khoản quán nên hệ thống không nhận được tín hiệu từ ngân hàng.
 */
@Service
@Transactional
public class OrderService {
    private static final String COD = "COD", ONLINE = "ONLINE", PARTNER = "RESTAURANT_PARTNER", CUSTOMER = "CUSTOMER";
    private static final String CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    private static final Map<String, String> NEXT_STATUS = Map.of("CONFIRMED", "PREPARING", "PREPARING", "DELIVERING", "DELIVERING", "COMPLETED");
    private static final Set<String> STATUSES = Set.of("PENDING", "CONFIRMED", "PREPARING", "DELIVERING", "COMPLETED", "CANCELLED", "REJECTED");
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String ORDER_COLUMNS = "o.order_id,o.order_code,o.restaurant_id,r.restaurant_name,r.phone AS restaurant_phone,o.recipient_name,o.recipient_phone,o.delivery_address,o.note,o.order_status,o.payment_method,o.payment_status,o.subtotal,o.delivery_fee,o.total_amount,o.cancel_reason,o.created_at,o.completed_at";
    private static final String ORDER_SOURCE = " FROM orders o JOIN restaurants r ON r.restaurant_id=o.restaurant_id";
    private static final String STATE_COLUMNS = "o.order_id,o.order_status,o.payment_method,o.payment_status";

    private final CustomerDataRepository db;
    private final CustomerRules rules;
    private final CartService carts;
    private final OrderEvents events;
    private final ApplicationEventPublisher publisher;
    public OrderService(CustomerDataRepository db, CustomerRules rules, CartService carts, OrderEvents events, ApplicationEventPublisher publisher) {
        this.db = db; this.rules = rules; this.carts = carts; this.events = events; this.publisher = publisher;
    }

    @Transactional(readOnly = true)
    public SseEmitter customerStream(long customer) { rules.actor(customer, CUSTOMER, false); return events.subscribe(customer); }
    @Transactional(readOnly = true)
    public SseEmitter partnerStream(long partner) { rules.actor(partner, PARTNER, false); return events.subscribe(partner); }

    @Transactional(readOnly = true)
    public CheckoutPreview preview(long customer, long cartId) {
        rules.actor(customer, CUSTOMER, false);
        var cart = carts.view(customer, cartId);
        var restaurant = restaurant(number(cart, "restaurant_id"));
        BigDecimal subtotal = (BigDecimal) cart.get("subtotal");
        BigDecimal fee = (BigDecimal) restaurant.get("delivery_fee");
        BigDecimal total = subtotal.add(fee);
        var lines = cartLines(cart).stream().map(line -> new CheckoutLine(number(line, "cart_item_id"), (String) line.get("item_name"),
                (int) number(line, "quantity"), (BigDecimal) line.get("line_total"), (String) line.get("note"), Boolean.TRUE.equals(line.get("available")))).toList();
        return new CheckoutPreview(cartId, number(cart, "version"), (String) cart.get("restaurant_name"), lines, subtotal, fee, total, qrBin(restaurant, total).isPresent());
    }

    public CustomerOrder checkout(long customer, Checkout request) {
        rules.actor(customer, CUSTOMER, true);
        // Khóa giỏ và kiểm tra version để bấm đặt hai lần hoặc hai tab chỉ tạo được một đơn.
        var locked = db.one("SELECT version FROM carts WHERE cart_id=? AND customer_id=? FOR UPDATE", request.cartId(), customer);
        version(locked, request.version());
        String method = request.paymentMethod();
        if (!Set.of(COD, ONLINE).contains(method)) throw new BusinessException("Phương thức thanh toán không hợp lệ");
        String name = InputNormalizerUtil.text(request.recipientName());
        String phone = InputNormalizerUtil.phone(request.recipientPhone());
        if (phone == null || !phone.matches("^0\\d{9}$"))
            throw new FieldValidationException("Dữ liệu chưa hợp lệ", Map.of("recipientPhone", "Số điện thoại gồm 10 chữ số và bắt đầu bằng 0"));
        String address = InputNormalizerUtil.text(request.deliveryAddress());
        String note = text(request.note(), 0, 1000);

        var cart = carts.view(customer, request.cartId());
        long restaurantId = number(cart, "restaurant_id");
        var lines = cartLines(cart).stream().filter(line -> Boolean.TRUE.equals(line.get("available"))).toList();
        if (lines.isEmpty()) throw new BusinessException("Giỏ không có món nào đặt được lúc này");
        var restaurant = restaurant(restaurantId);
        BigDecimal subtotal = (BigDecimal) cart.get("subtotal");
        BigDecimal fee = (BigDecimal) restaurant.get("delivery_fee");
        BigDecimal total = subtotal.add(fee);
        if (total.compareTo(request.expectedTotal()) != 0)
            throw new BusinessException("Giá món hoặc phí giao hàng vừa thay đổi. Vui lòng kiểm tra lại tổng tiền rồi đặt lại.");
        if (ONLINE.equals(method) && qrBin(restaurant, total).isEmpty())
            throw new BusinessException("Quán chưa hỗ trợ thanh toán VietQR cho đơn này. Vui lòng chọn thanh toán khi nhận hàng.");

        var now = rules.now();
        String code = "TF-" + now.format(DateTimeFormatter.BASIC_ISO_DATE) + "-" + randomCode();
        long orderId = db.insert("INSERT INTO orders(order_code,customer_id,restaurant_id,recipient_name,recipient_phone,delivery_address,note,payment_method,subtotal,delivery_fee,total_amount,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                code, customer, restaurantId, name, phone, address, note.isEmpty() ? null : note, method, subtotal, fee, total, now, now);
        for (var line : lines) {
            String lineNote = (String) line.get("note");
            db.update("INSERT INTO order_items(order_id,item_id,item_name,unit_price,quantity,line_total,note) VALUES (?,?,?,?,?,?,?)",
                    orderId, line.get("item_id"), line.get("item_name"), line.get("unit_price"), line.get("quantity"), line.get("line_total"), lineNote.isEmpty() ? null : lineNote);
            db.update("DELETE FROM cart_items WHERE cart_item_id=?", line.get("cart_item_id"));
        }
        db.update("INSERT INTO payments(order_id,provider,transaction_code,amount,created_at) VALUES (?,?,?,?,?)",
                orderId, ONLINE.equals(method) ? "VIETQR" : COD, transferContent(code), total, now);
        db.update("UPDATE carts SET version=version+1, updated_at=? WHERE cart_id=?", now, request.cartId());
        changed(orderId, true);
        return get(customer, orderId);
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderSummary> mine(long customer, int page) {
        rules.actor(customer, CUSTOMER, false); page(page);
        var rows = db.rows("SELECT " + ORDER_COLUMNS + ORDER_SOURCE + " WHERE o.customer_id=? ORDER BY o.created_at DESC,o.order_id DESC LIMIT 10 OFFSET ?", customer, page * 10);
        var items = rows.stream().map(row -> new OrderSummary(number(row, "order_id"), (String) row.get("order_code"), (String) row.get("restaurant_name"),
                (String) row.get("order_status"), (String) row.get("payment_method"), (String) row.get("payment_status"),
                (BigDecimal) row.get("total_amount"), CustomerReviewService.date(row.get("created_at")), lines(row))).toList();
        return new PageResponse<>(items, page, number(db.one("SELECT COUNT(*) AS total FROM orders WHERE customer_id=?", customer), "total"));
    }

    @Transactional(readOnly = true)
    public CustomerOrder get(long customer, long id) {
        rules.actor(customer, CUSTOMER, false);
        var row = db.one("SELECT " + ORDER_COLUMNS + ORDER_SOURCE + " WHERE o.order_id=? AND o.customer_id=?", id, customer);
        return new CustomerOrder(number(row, "order_id"), (String) row.get("order_code"), number(row, "restaurant_id"), (String) row.get("restaurant_name"), (String) row.get("restaurant_phone"),
                (String) row.get("recipient_name"), (String) row.get("recipient_phone"), (String) row.get("delivery_address"), (String) row.get("note"),
                (String) row.get("order_status"), (String) row.get("payment_method"), (String) row.get("payment_status"),
                (BigDecimal) row.get("subtotal"), (BigDecimal) row.get("delivery_fee"), (BigDecimal) row.get("total_amount"), (String) row.get("cancel_reason"),
                CustomerReviewService.date(row.get("created_at")), CustomerReviewService.date(row.get("completed_at")), lines(row), qr(row));
    }

    public CustomerOrder cancel(long customer, long id, OrderReason request) {
        rules.actor(customer, CUSTOMER, true);
        var order = db.one("SELECT " + STATE_COLUMNS + " FROM orders o WHERE o.order_id=? AND o.customer_id=? FOR UPDATE", id, customer);
        if (!"PENDING".equals(order.get("order_status")) || !"UNPAID".equals(order.get("payment_status")))
            throw new BusinessException("Đơn đã được quán tiếp nhận nên không thể tự hủy. Vui lòng liên hệ quán.");
        close(order, "CANCELLED", text(request.reason(), 5, 500));
        changed(id, false);
        return get(customer, id);
    }

    @Transactional(readOnly = true)
    public PageResponse<PartnerOrder> partnerOrders(long partner, String status, int page) {
        rules.actor(partner, PARTNER, false); page(page);
        if (status != null && !STATUSES.contains(status)) throw new BusinessException("Trạng thái đơn không hợp lệ");
        String where = " WHERE r.owner_user_id=?" + (status == null ? "" : " AND o.order_status=?");
        List<Object> args = new ArrayList<>(status == null ? List.of(partner) : List.of(partner, status));
        long total = number(db.one("SELECT COUNT(*) AS total" + ORDER_SOURCE + where, args.toArray()), "total");
        args.add(page * 10);
        var rows = db.rows("SELECT " + ORDER_COLUMNS + ",p.transaction_code AS transfer_content" + ORDER_SOURCE + " LEFT JOIN payments p ON p.order_id=o.order_id" + where + " ORDER BY o.created_at DESC,o.order_id DESC LIMIT 10 OFFSET ?", args.toArray());
        var items = rows.stream().map(row -> new PartnerOrder(number(row, "order_id"), (String) row.get("order_code"), (String) row.get("restaurant_name"),
                (String) row.get("recipient_name"), (String) row.get("recipient_phone"), (String) row.get("delivery_address"), (String) row.get("note"),
                (String) row.get("order_status"), (String) row.get("payment_method"), (String) row.get("payment_status"),
                (BigDecimal) row.get("subtotal"), (BigDecimal) row.get("delivery_fee"), (BigDecimal) row.get("total_amount"), (String) row.get("cancel_reason"),
                CustomerReviewService.date(row.get("created_at")), (String) row.get("transfer_content"), lines(row))).toList();
        return new PageResponse<>(items, page, total);
    }

    public void updateStatus(long partner, long id, OrderStatus request) {
        rules.actor(partner, PARTNER, true);
        var order = owned(partner, id);
        String current = (String) order.get("order_status"), target = request.status();
        var now = rules.now();
        if ("REJECTED".equals(target)) {
            if (!Set.of("PENDING", "CONFIRMED").contains(current)) throw new BusinessException("Chỉ từ chối được đơn chưa bắt đầu chế biến");
            close(order, "REJECTED", text(request.reason(), 5, 500));
        } else if ("CONFIRMED".equals(target)) {
            if (!"PENDING".equals(current)) throw new BusinessException("Đơn không còn ở trạng thái chờ xác nhận");
            if (ONLINE.equals(order.get("payment_method"))) throw new BusinessException("Đơn VietQR cần xác nhận đã nhận tiền trước");
            db.update("UPDATE orders SET order_status='CONFIRMED',confirmed_at=?,updated_at=? WHERE order_id=?", now, now, id);
        } else {
            if (!target.equals(NEXT_STATUS.get(current))) throw new BusinessException("Không thể chuyển đơn sang trạng thái này");
            db.update("UPDATE orders SET order_status=?,updated_at=? WHERE order_id=?", target, now, id);
            if ("COMPLETED".equals(target)) {
                db.update("UPDATE orders SET completed_at=? WHERE order_id=?", now, id);
                // Đơn COD thu tiền lúc giao; đơn VietQR đã PAID trước khi rời PENDING.
                if (COD.equals(order.get("payment_method"))) settle(id, "PAID", "SUCCESS", "COD");
            }
        }
        changed(id, false);
    }

    public void confirmPayment(long partner, long id) {
        rules.actor(partner, PARTNER, true);
        var order = owned(partner, id);
        if (!ONLINE.equals(order.get("payment_method")) || !"PENDING".equals(order.get("order_status")) || !"UNPAID".equals(order.get("payment_status")))
            throw new BusinessException("Đơn này không ở trạng thái chờ xác nhận thanh toán");
        var now = rules.now();
        settle(id, "PAID", "SUCCESS", "MANUAL");
        db.update("UPDATE orders SET order_status='CONFIRMED',confirmed_at=?,updated_at=? WHERE order_id=?", now, now, id);
        changed(id, false);
    }

    public void refund(long partner, long id) {
        rules.actor(partner, PARTNER, true);
        var order = owned(partner, id);
        if (!"REJECTED".equals(order.get("order_status")) || !"PAID".equals(order.get("payment_status")))
            throw new BusinessException("Chỉ hoàn tiền được đơn đã thanh toán và bị từ chối");
        settle(id, "REFUNDED", "REFUNDED", "MANUAL");
        changed(id, false);
    }

    private void changed(long orderId, boolean created) {
        var row = db.one("SELECT o.customer_id,r.owner_user_id FROM orders o JOIN restaurants r ON r.restaurant_id=o.restaurant_id WHERE o.order_id=?", orderId);
        publisher.publishEvent(new OrderEvents.OrderChanged(orderId, number(row, "customer_id"), number(row, "owner_user_id"), created));
    }
    /** Đơn đã nhận tiền giữ nguyên PAID để quán còn phải hoàn tiền, không ghi nhận là thanh toán thất bại. */
    private void close(Map<String, Object> order, String status, String reason) {
        long id = number(order, "order_id");
        var now = rules.now();
        db.update("UPDATE orders SET order_status=?,cancel_reason=?,cancelled_at=?,updated_at=? WHERE order_id=?", status, reason, now, now, id);
        if ("UNPAID".equals(order.get("payment_status"))) settle(id, "FAILED", "FAILED", status);
    }
    private void settle(long orderId, String orderPayment, String paymentRow, String responseCode) {
        var now = rules.now();
        db.update("UPDATE orders SET payment_status=?,updated_at=? WHERE order_id=?", orderPayment, now, orderId);
        db.update("UPDATE payments SET payment_status=?,response_code=?,paid_at=COALESCE(?,paid_at) WHERE order_id=?", paymentRow, responseCode, "SUCCESS".equals(paymentRow) ? now : null, orderId);
    }
    private Map<String, Object> owned(long partner, long id) {
        return db.one("SELECT " + STATE_COLUMNS + ORDER_SOURCE + " WHERE o.order_id=? AND r.owner_user_id=? FOR UPDATE", id, partner);
    }
    private Map<String, Object> restaurant(long id) {
        return db.one("SELECT delivery_fee,bank_name,bank_account_number,bank_account_holder FROM restaurants WHERE restaurant_id=?", id);
    }
    private List<OrderLine> lines(Map<String, Object> order) {
        return db.rows("SELECT order_item_id,item_id,item_name,unit_price,quantity,line_total,note FROM order_items WHERE order_id=? ORDER BY order_item_id", order.get("order_id")).stream()
                .map(line -> new OrderLine(number(line, "order_item_id"), line.get("item_id") == null ? null : number(line, "item_id"), (String) line.get("item_name"),
                        (BigDecimal) line.get("unit_price"), (int) number(line, "quantity"), (BigDecimal) line.get("line_total"), (String) line.get("note"))).toList();
    }
    /** Giỏ hàng chưa có kiểu riêng nên đây là chỗ duy nhất đọc dạng Map của CartService. */
    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> cartLines(Map<String, Object> cart) { return (List<Map<String, Object>>) cart.get("items"); }
    /** Mã QR chỉ tồn tại khi khách còn phải trả tiền; quán đổi sang tài khoản không hỗ trợ thì không có mã, đơn vẫn xem được. */
    private PaymentQr qr(Map<String, Object> order) {
        if (!ONLINE.equals(order.get("payment_method")) || !"PENDING".equals(order.get("order_status")) || !"UNPAID".equals(order.get("payment_status"))) return null;
        var restaurant = restaurant(number(order, "restaurant_id"));
        BigDecimal amount = (BigDecimal) order.get("total_amount");
        var bin = qrBin(restaurant, amount);
        if (bin.isEmpty()) return null;
        String account = (String) restaurant.get("bank_account_number");
        String content = transferContent((String) order.get("order_code"));
        return new PaymentQr(VietQrUtil.payload(bin.get(), account, amount, content), (String) restaurant.get("bank_name"), account, (String) restaurant.get("bank_account_holder"), amount, content);
    }
    private static Optional<String> qrBin(Map<String, Object> restaurant, BigDecimal amount) {
        String account = (String) restaurant.get("bank_account_number");
        if (account == null || !account.matches("\\d{6,19}") || !VietQrUtil.isPayableAmount(amount)) return Optional.empty();
        return VietQrUtil.binOf((String) restaurant.get("bank_name"));
    }
    /** Ứng dụng ngân hàng có thể bỏ ký tự đặc biệt, nên nội dung chỉ giữ chữ và số để quán còn đối soát được. */
    private static String transferContent(String orderCode) { return orderCode.replace("-", ""); }
    private static String randomCode() {
        var code = new StringBuilder();
        for (int i = 0; i < 6; i++) code.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        return code.toString();
    }
    private static void page(int page) { if (page < 0 || page > 10000) throw new BusinessException("Trang không hợp lệ"); }
}
