package vn.edu.iuh.fit.thunderfood.dto;

import vn.edu.iuh.fit.thunderfood.entity.CartEntity;
import vn.edu.iuh.fit.thunderfood.entity.CartItemEntity;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

/** Dữ liệu giỏ rời server chỉ qua các record này; tổng tiền và tình trạng món luôn tính lại, không lưu trong giỏ. */
public final class CartResponses {
    private CartResponses() {}

    public record CartLine(long cartItemId, long itemId, String itemName, String imageUrl, BigDecimal unitPrice, BigDecimal lastSeenUnitPrice,
                           int quantity, String note, BigDecimal lineTotal, boolean available, String unavailableReason, boolean priceChanged) {
        static CartLine from(CartItemEntity line, String unavailableReason) {
            var item = line.getItem();
            BigDecimal price = item.getPrice();
            return new CartLine(line.getId(), line.getItemId(), item.getItemName(), item.getImageUrl(), price, line.getLastSeenUnitPrice(),
                    line.getQuantity(), line.getNote(), price.multiply(BigDecimal.valueOf(line.getQuantity())), unavailableReason.isEmpty(), unavailableReason,
                    price.compareTo(line.getLastSeenUnitPrice()) != 0);
        }
    }

    /** subtotal chỉ tính dòng còn đặt được; quantity đếm mọi dòng vì dòng tạm hết vẫn nằm trong giỏ. */
    public record CartResponse(long cartId, long restaurantId, String restaurantName, long version, List<CartLine> items, BigDecimal subtotal, long quantity) {
        public static CartResponse from(CartEntity cart, Function<CartItemEntity, String> unavailableReason) {
            var lines = new ArrayList<CartLine>();
            BigDecimal subtotal = BigDecimal.ZERO;
            long quantity = 0;
            for (var item : cart.getItems()) {
                var line = CartLine.from(item, unavailableReason.apply(item));
                lines.add(line);
                if (line.available()) subtotal = subtotal.add(line.lineTotal());
                quantity += line.quantity();
            }
            return new CartResponse(cart.getId(), cart.getRestaurantId(), cart.getRestaurant().getRestaurantName(), cart.getVersion(), List.copyOf(lines), subtotal, quantity);
        }
    }
}
