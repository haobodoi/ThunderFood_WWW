package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.iuh.fit.thunderfood.dto.CustomerRequests.*;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.repository.CustomerDataRepository;

import java.math.BigDecimal;
import java.util.*;
import static vn.edu.iuh.fit.thunderfood.repository.CustomerDataRepository.number;
import static vn.edu.iuh.fit.thunderfood.service.CustomerRules.*;

@Service
@Transactional
public class CartService {
    private final CustomerDataRepository db;
    private final CustomerRules rules;
    public CartService(CustomerDataRepository db, CustomerRules rules) { this.db = db; this.rules = rules; }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(long customer) {
        rules.actor(customer, "CUSTOMER", false);
        return db.rows("SELECT cart_id FROM carts WHERE customer_id=? ORDER BY updated_at DESC, cart_id DESC", customer)
                .stream().map(c -> view(customer, number(c, "cart_id"))).toList();
    }
    @Transactional(readOnly = true)
    public Map<String, Object> get(long customer, long cart) {
        rules.actor(customer, "CUSTOMER", false);
        return view(customer, cart);
    }
    private Map<String, Object> cart(long customer, long id, boolean lock) {
        return db.one("SELECT * FROM carts WHERE cart_id=? AND customer_id=?" + (lock ? " FOR UPDATE" : ""), id, customer);
    }
    private Map<String, Object> item(long id) {
        return db.one("SELECT m.*, r.status AS restaurant_status, r.is_open FROM menu_items m JOIN restaurants r ON r.restaurant_id=m.restaurant_id WHERE m.item_id=? FOR UPDATE", id);
    }
    private String unavailable(Map<String, Object> item) {
        if (!"APPROVED".equals(item.get("restaurant_status"))) return "Quán hiện không hoạt động";
        if (flag(item.get("is_deleted")) || !"APPROVED".equals(item.get("approval_status"))) return "Món không còn phục vụ";
        if (!flag(item.get("is_available"))) return "Món tạm hết hàng";
        if (!rules.open(number(item, "restaurant_id"), flag(item.get("is_open")))) return "Quán đang đóng cửa";
        return "";
    }
    private void requireAvailable(Map<String, Object> item) {
        String reason = unavailable(item);
        if (!reason.isEmpty()) throw new BusinessException(reason);
    }
    private void quantityLimit(long cart, long item, int target, long excludedLine) {
        var row = db.one("SELECT COALESCE(SUM(quantity),0) AS total FROM cart_items WHERE cart_id=? AND item_id=? AND cart_item_id<>?", cart, item, excludedLine);
        if (target + number(row, "total") > 99) throw new BusinessException("Mỗi món tối đa 99 phần trong một giỏ, tính cả các ghi chú khác nhau");
    }
    private void touch(long cart) { db.update("UPDATE carts SET version=version+1, updated_at=? WHERE cart_id=?", rules.now(), cart); }

    public Map<String, Object> add(long customer, AddItem request) {
        rules.actor(customer, "CUSTOMER", true);
        // Lock the customer before creating the first cart; other cart operations use the same order.
        var menu = db.one("SELECT restaurant_id FROM menu_items WHERE item_id=?", request.itemId());
        long restaurant = number(menu, "restaurant_id");
        db.update("INSERT INTO carts(customer_id,restaurant_id) VALUES (?,?) ON DUPLICATE KEY UPDATE cart_id=cart_id", customer, restaurant);
        var cart = db.one("SELECT * FROM carts WHERE customer_id=? AND restaurant_id=? FOR UPDATE", customer, restaurant);
        version(cart, request.version());
        long cartId = number(cart, "cart_id");
        var dish = item(request.itemId());
        requireAvailable(dish);
        String note = text(request.note(), 0, 300);
        quantityLimit(cartId, request.itemId(), request.quantity(), 0);
        var existing = db.rows("SELECT cart_item_id FROM cart_items WHERE cart_id=? AND item_id=? AND note=?", cartId, request.itemId(), note);
        if (existing.isEmpty()) {
            if (number(db.one("SELECT COUNT(*) AS total FROM cart_items WHERE cart_id=?", cartId), "total") >= 50)
                throw new BusinessException("Một giỏ tối đa 50 dòng món");
            db.update("INSERT INTO cart_items(cart_id,restaurant_id,item_id,quantity,note,last_seen_unit_price) VALUES (?,?,?,?,?,?)",
                    cartId, restaurant, request.itemId(), request.quantity(), note, dish.get("price"));
        } else db.update("UPDATE cart_items SET quantity=quantity+?, last_seen_unit_price=? WHERE cart_item_id=?", request.quantity(), dish.get("price"), existing.getFirst().get("cart_item_id"));
        touch(cartId);
        return view(customer, cartId);
    }

    public Map<String, Object> change(long customer, long cartId, long lineId, ChangeItem request) {
        rules.actor(customer, "CUSTOMER", true);
        var cart = cart(customer, cartId, true); version(cart, request.version());
        var line = db.one("SELECT * FROM cart_items WHERE cart_id=? AND cart_item_id=?", cartId, lineId);
        var dish = item(number(line, "item_id"));
        if (request.quantity() > number(line, "quantity")) requireAvailable(dish);
        String note = text(request.note(), 0, 300);
        quantityLimit(cartId, number(line, "item_id"), request.quantity(), lineId);
        var duplicate = db.rows("SELECT * FROM cart_items WHERE cart_id=? AND item_id=? AND note=? AND cart_item_id<>?", cartId, line.get("item_id"), note, lineId);
        if (!duplicate.isEmpty()) {
            var target = duplicate.getFirst();
            db.update("DELETE FROM cart_items WHERE cart_item_id=?", lineId);
            db.update("UPDATE cart_items SET quantity=quantity+?, last_seen_unit_price=? WHERE cart_item_id=?", request.quantity(), dish.get("price"), target.get("cart_item_id"));
        } else db.update("UPDATE cart_items SET quantity=?, note=?, last_seen_unit_price=? WHERE cart_item_id=?", request.quantity(), note, dish.get("price"), lineId);
        touch(cartId);
        return view(customer, cartId);
    }

    public Map<String, Object> remove(long customer, long cartId, Long lineId, long expected) {
        rules.actor(customer, "CUSTOMER", true);
        var cart = cart(customer, cartId, true); version(cart, expected);
        if (lineId == null) db.update("DELETE FROM cart_items WHERE cart_id=?", cartId);
        else {
            db.one("SELECT cart_item_id FROM cart_items WHERE cart_id=? AND cart_item_id=?", cartId, lineId);
            db.update("DELETE FROM cart_items WHERE cart_id=? AND cart_item_id=?", cartId, lineId);
        }
        touch(cartId); // Keep the empty aggregate/version to reject delayed requests from another tab.
        return view(customer, cartId);
    }

    private Map<String, Object> view(long customer, long id) {
        var result = new LinkedHashMap<>(cart(customer, id, false));
        var restaurant = db.one("SELECT restaurant_name FROM restaurants WHERE restaurant_id=?", result.get("restaurant_id"));
        result.putAll(restaurant);
        var lines = db.rows("SELECT c.*, m.item_name, m.image_url, m.price AS unit_price, m.is_available, m.is_deleted, m.approval_status, r.status AS restaurant_status, r.is_open FROM cart_items c JOIN menu_items m ON m.item_id=c.item_id JOIN restaurants r ON r.restaurant_id=c.restaurant_id WHERE c.cart_id=? ORDER BY c.cart_item_id", id);
        BigDecimal subtotal = BigDecimal.ZERO;
        long count = 0;
        for (var line : lines) {
            String reason = unavailable(line);
            BigDecimal price = (BigDecimal) line.get("unit_price");
            BigDecimal amount = price.multiply(BigDecimal.valueOf(number(line, "quantity")));
            line.put("available", reason.isEmpty()); line.put("unavailable_reason", reason);
            line.put("price_changed", price.compareTo((BigDecimal) line.get("last_seen_unit_price")) != 0);
            line.put("line_total", amount);
            if (reason.isEmpty()) subtotal = subtotal.add(amount);
            count += number(line, "quantity");
        }
        result.put("items", lines); result.put("subtotal", subtotal); result.put("quantity", count);
        return result;
    }
}
