package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.ai.chat.model.ToolContext;
import org.springframework.stereotype.Component;
import vn.edu.iuh.fit.thunderfood.service.AssistantTools.CartInfo;
import vn.edu.iuh.fit.thunderfood.service.AssistantTools.Collected;
import vn.edu.iuh.fit.thunderfood.service.AssistantTools.OrderInfo;
import vn.edu.iuh.fit.thunderfood.service.AssistantTools.PopularResult;
import vn.edu.iuh.fit.thunderfood.service.ShoppingAssistantService.AssistantReply;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Trả lời nhanh, không cần AI, khi dịch vụ AI chưa cấu hình, lỗi hoặc quá thời gian chờ.
 * Nhận diện các ý định thường gặp (các gợi ý nhanh trong widget) rồi gọi thẳng các công cụ sẵn có,
 * nên giao diện vẫn hiện thẻ quán/món như khi AI trả lời. Không bao giờ tự thêm món vào giỏ.
 */
@Component
public class AssistantFallback {
    static final String NOTICE = "(Trợ lý AI đang tạm gián đoạn nên mình trả lời nhanh từ dữ liệu của ThunderFood.)";
    /** Từ khóa món phổ biến, dài trước ngắn sau để "cơm tấm" thắng "cơm". */
    private static final List<String> FOODS = List.of("cơm tấm", "cơm gà", "cơm chiên", "bún bò", "bún chả", "bún thịt nướng",
            "bánh mì", "trà sữa", "gà rán", "hủ tiếu", "sinh tố", "cà phê", "bánh flan", "phở", "bún", "cơm", "lẩu", "chè",
            "pizza", "mì", "bánh", "gà", "vịt", "trà", "nước ép");
    private static final Pattern PRICE = Pattern.compile("(\\d{1,3}(?:[.,]\\d{3})+|\\d+)\\s*(k|nghin|ngan|trieu|tr)?");
    private static final Map<String, String> ORDER_STATUS = Map.of("PENDING", "chờ quán xác nhận", "CONFIRMED", "quán đã xác nhận",
            "PREPARING", "đang chế biến", "DELIVERING", "đang giao", "COMPLETED", "đã hoàn tất", "CANCELLED", "đã hủy",
            "REJECTED", "quán từ chối");

    private final AssistantTools tools;
    private final PolicyLibrary policies;

    public AssistantFallback(AssistantTools tools, PolicyLibrary policies) {
        this.tools = tools;
        this.policies = policies;
    }

    public AssistantReply reply(long customerId, String message) {
        String text = PolicyLibrary.normalize(message);
        var collected = new Collected();
        var context = new ToolContext(Map.of(AssistantTools.CUSTOMER_ID, customerId, AssistantTools.COLLECTED, collected));
        String food = food(text);
        Integer maxPrice = maxPrice(text);
        List<String> sources = List.of();
        String answer;

        if (has(text, "them vao gio", "vao gio", "them mon", "dat giup", "dat mon", "dat cho toi", "mua giup")) {
            if (food != null || maxPrice != null) tools.searchDishes(food, maxPrice, context);
            answer = collected.dishes().isEmpty()
                    ? "Lúc này mình chưa thể tự thêm món qua tin nhắn. Bạn mở trang quán và bấm **Thêm vào giỏ** ở món muốn đặt nhé."
                    : "Lúc này mình chưa thể tự thêm món qua tin nhắn. Bạn bấm **Thêm vào giỏ** hoặc **Đặt ngay** trên thẻ món bên dưới nhé.";
        } else if (maxPrice == null && isPolicyQuestion(text) && !policies.search(message, 2).isEmpty()) {
            var found = policies.search(message, 2);
            answer = "Theo chính sách của ThunderFood:\n\n" + PolicyLibrary.quote(found);
            sources = found.stream().map(PolicyLibrary.Section::source).distinct().toList();
        } else if (has(text, "gio hang", "gio cua toi", "trong gio")) {
            answer = cart(tools.viewCart(context));
        } else if (has(text, "don hang", "don gan", "don cua toi", "don toi dat", "trang thai don") && !has(text, "huy", "hoan tien")) {
            answer = orders(tools.myRecentOrders(context));
        } else if (has(text, "dat nhieu", "mon hot", "hot nhat", "ban chay", "pho bien", "nhieu nguoi", "noi bat")
                || (food == null && maxPrice == null && has(text, "goi y mon", "an gi", "mon gi"))) {
            answer = popular(tools.popularDishes(context));
        } else if (has(text, "quan") && (food != null || has(text, "gan toi", "gan day", "dang mo", "goi y quan"))) {
            tools.searchRestaurants(food, null, context);
            answer = collected.restaurants().isEmpty()
                    ? "Mình chưa tìm thấy quán phù hợp. Bạn thử gõ tên món hoặc tên quán cụ thể hơn nhé."
                    : "Đây là các quán" + (food == null ? "" : " có **" + food + "**") + " đang có trên ThunderFood, quán đang mở được xếp trước."
                    + (has(text, "gan toi", "gan day") ? " Mình chưa lọc được theo vị trí của bạn lúc này, bạn xem địa chỉ trên từng thẻ nhé." : "")
                    + " Bấm vào thẻ để xem quán.";
        } else if (food != null || maxPrice != null) {
            tools.searchDishes(food, maxPrice, context);
            answer = collected.dishes().isEmpty()
                    ? "Mình chưa tìm thấy món phù hợp" + (maxPrice == null ? "" : " trong mức giá " + money(BigDecimal.valueOf(maxPrice))) + ". Bạn thử từ khóa khác nhé."
                    : "Đây là vài món" + (food == null ? "" : " **" + food + "**")
                    + (maxPrice == null ? "" : " giá từ **" + money(BigDecimal.valueOf(maxPrice)) + "** trở xuống")
                    + ". Bạn có thể bấm **Thêm vào giỏ** hoặc **Đặt ngay** trên thẻ món.";
        } else {
            answer = "Mình chỉ hỗ trợ các câu hỏi về món ăn, quán, giỏ hàng, đơn hàng và chính sách của ThunderFood. "
                    + "Bạn thử hỏi: \"Món dưới 50.000đ\", \"Món hot hôm nay\" hoặc \"Chính sách hủy đơn\" nhé.";
        }
        return new AssistantReply(answer + "\n\n" + NOTICE, sources, false, collected.restaurants(), collected.dishes());
    }

    private static boolean isPolicyQuestion(String text) {
        return has(text, "chinh sach", "quy dinh", "huy don", "huy duoc", "hoan tien", "hoan lai", "thanh toan", "vietqr", "chuyen khoan",
                "cod", "phi giao", "phi ship", "danh gia", "dang ky quan", "mo quan", "toi da", "bao nhieu", "tu choi");
    }

    /** Khớp trọn cụm từ (không khớp nửa chừng, ví dụ "toi dang" không bị hiểu là "toi da"). */
    private static boolean has(String text, String... phrases) {
        String padded = " " + text.replaceAll("[^a-z0-9<]+", " ").trim() + " ";
        for (String phrase : phrases) if (padded.contains(" " + phrase + " ")) return true;
        return false;
    }

    private static String food(String text) {
        for (String food : FOODS) {
            String key = PolicyLibrary.normalize(food);
            if (Pattern.compile("(^|[^a-z])" + Pattern.quote(key) + "($|[^a-z])").matcher(text).find()) return food;
        }
        return null;
    }

    /** "dưới 50.000đ", "tối đa 50k", "không quá 50 nghìn" → 50000. Chỉ hiểu là ngân sách khi có từ chỉ giới hạn giá. */
    static Integer maxPrice(String text) {
        if (!has(text, "duoi", "toi da", "khong qua", "re hon", "nho hon", "tam gia", "<", "ngan sach")) return null;
        Matcher m = PRICE.matcher(text);
        while (m.find()) {
            long value = Long.parseLong(m.group(1).replaceAll("[.,]", ""));
            String unit = m.group(2);
            if ("tr".equals(unit) || "trieu".equals(unit)) value *= 1_000_000;
            else if (unit != null || value < 1000) value *= 1000;
            if (value >= 1000 && value <= 10_000_000) return (int) value;
        }
        return null;
    }

    private static String cart(Object result) {
        if (!(result instanceof List<?> list) || list.isEmpty()) return message(result, "Giỏ hàng của bạn đang trống.");
        StringBuilder out = new StringBuilder("Giỏ hàng hiện tại của bạn:\n");
        for (Object o : list) {
            if (!(o instanceof CartInfo c)) continue;
            out.append("- **").append(c.restaurantName()).append("**: ");
            out.append(String.join(", ", c.items().stream().map(i -> i.quantity() + " × " + i.name() + (i.available() ? "" : " (tạm hết)")).toList()));
            out.append(" — tạm tính **").append(money(c.subtotal())).append("**\n");
        }
        return out.append("Bạn mở **Giỏ hàng** để nhập địa chỉ và đặt hàng nhé.").toString();
    }

    private static String orders(Object result) {
        if (!(result instanceof List<?> list) || list.isEmpty()) return message(result, "Bạn chưa có đơn hàng nào.");
        StringBuilder out = new StringBuilder("Các đơn gần đây của bạn:\n");
        for (Object o : list) {
            if (!(o instanceof OrderInfo order)) continue;
            out.append("- **").append(order.orderCode()).append("** · ").append(order.restaurantName()).append(" · ")
                    .append(ORDER_STATUS.getOrDefault(order.status(), order.status())).append(" · **").append(money(order.total())).append("**\n");
        }
        return out.append("Xem chi tiết tại mục **Đơn hàng của tôi**.").toString();
    }

    private static String popular(Object result) {
        if (!(result instanceof PopularResult popular) || popular.dishes().isEmpty())
            return message(result, "Hôm nay chưa có món nào được đặt nhiều. Bạn thử hỏi \"Món dưới 50.000đ\" nhé.");
        return "Các món được đặt nhiều nhất " + popular.period() + " đang hiện ở thẻ bên dưới. Bấm **Thêm vào giỏ** hoặc **Đặt ngay** để chọn món.";
    }

    private static String message(Object result, String fallback) {
        if (result instanceof Map<?, ?> map) {
            Object error = map.get("error");
            if (error != null) return error.toString();
        }
        return fallback;
    }

    private static String money(BigDecimal value) {
        return NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN")).format(value == null ? 0 : value) + "đ";
    }
}
