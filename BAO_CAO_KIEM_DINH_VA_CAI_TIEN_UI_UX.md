# Báo cáo kiểm định và cải tiến UI/UX ThunderFood

Ngày: 28/10/2026
Phạm vi: `frontend/src`, hợp đồng DTO nhà hàng/thực đơn, dữ liệu mẫu `thunderfood_mariadb_v2.sql` và hai ảnh người dùng cung cấp.

## Kết quả chính

Đợt kiểm định này sửa cấu trúc storefront để chữ không còn đè banner, loại bỏ các chỉ số được tạo từ ID quán, ổn định card/lưới với dữ liệu dài hoặc thiếu, chuyển toàn bộ style inline JSX sang class CSS, hoàn thiện hành vi modal và tổ chức lại màn hình đối tác, khách hàng và quản trị.

`DESIGN_SYSTEM.md` đã được viết lại từ chính `:root` của `global.css`. Tài liệu và CSS hiện cùng có 66 token; không còn biến CSS được dùng mà chưa khai báo.

Các pha giỏ hàng thật, đánh giá, đặt hàng và thanh toán chưa có API/route hoàn chỉnh. Danh sách chọn món ở trang quán vẫn là dữ liệu tạm thời trong phiên và giao diện nói rõ giới hạn này.

## Bản đồ lỗi và cách xử lý

| Mức độ | Bằng chứng và tác động | Thay đổi đã thực hiện |
| :--- | :--- | :--- |
| P1 | Hai ảnh kiểm tra cho thấy tên quán và badge nằm trên banner tối; vị trí thay đổi theo chiều dài tên. CSS cũ dùng `margin-top: -56px`. | Tách `.tf-store-hero__banner` và `.tf-store-hero__surface`. Tên, trạng thái, địa chỉ và tag luôn nằm trên nền trắng; tên dùng `overflow-wrap`, badge không co. |
| P1 | `getRestaurantMetrics` sinh rating, số đánh giá, ETA và khoảng cách từ ID; DTO không có các trường này. | Xóa số liệu tự tạo khỏi card, storefront và spotlight. Chỉ hiển thị trạng thái, số món tính từ menu và phí giao từ DTO. |
| P1 | Ảnh món được suy đoán theo từ khóa, làm hai món khác nhau dùng cùng ảnh. SQL v2 cũng lặp nhiều URL ảnh seed. | Card chỉ dùng `imageUrl` từ API. Ảnh thiếu hoặc URL lặp trong cùng thực đơn công khai dùng placeholder “Chưa có ảnh món”. |
| P1 | Tag rỗng tạo chip chỉ có dấu `#`. | Chỉ render tag `CUISINE` có `tagName` là chuỗi khác rỗng; bỏ tiền tố `#`. |
| P1 | Nút thêm món vẫn hoạt động khi quán đóng. | `FoodCard` nhận `orderable`; nút ở card và modal bị vô hiệu khi quán đóng hoặc món hết. |
| P2 | Chip ẩm thực hardcode thành từ khóa, có thể không khớp dữ liệu thật. | Tạo bộ lọc từ `tags` trả về bởi API; tách lọc ẩm thực khỏi tìm kiếm server. |
| P2 | Lỗi API bị hiển thị như danh sách rỗng. | Thêm error state, retry và skeleton đúng hình học card. |
| P2 | Tên/mô tả/giá dài ép footer; lưới tối thiểu 300px có nguy cơ tràn màn hình 320px. | Lưới dùng `minmax(min(100%, ...), 1fr)`, tên/mô tả khóa dòng, footer wrap, giá được phép xuống dòng. |
| P2 | Trang quản lý thực đơn có nhiều style inline, tab thay đổi kích thước và empty state sai ngữ cảnh. | Dùng `.tf-partner-menu`; tab cuộn ngang, action nhóm đứng ngoài tab, empty state đặt lại bộ lọc khi đã có món. |
| P2 | Modal chưa giữ/trả focus, body dài có thể vượt viewport; Escape có thể gọi callback rỗng lúc đang lưu. | Trap Tab, trả focus, khóa scroll nền, guard Escape, body cuộn và giới hạn `90dvh`. |
| P2 | Danh sách duyệt dùng `div` giả bảng. | Chuyển sang `table` ngữ nghĩa, thêm loading/error/retry/empty và cuộn ngang ở màn hình nhỏ. |
| P2 | Trang chủ có số `150+`, `12.000+`, `4.9` và ETA hardcode. | Spotlight lấy quán từ API; bỏ mọi tuyên bố không có nguồn. Ảnh marquee chỉ còn vai trò trang trí. |
| P3 | Footer có hotline/email và link quán ID 1 chưa xác minh; trang khách ghi “gần bạn” dù không có vị trí. | Đổi sang nội dung/đường dẫn hiện có; bỏ thông tin liên hệ và lời hứa định vị không có nguồn. |
| P3 | 181 dòng `style={{...}}` trong 15 file làm vỡ tính nhất quán. | Quét toàn bộ `frontend/src`: còn 0 inline style JSX. |

## Theo luồng người dùng

### Khách hàng

Trang chủ tìm quán thật và dùng spotlight từ API. Danh sách cho phép tìm, lọc theo tag ẩm thực, lọc quán mở và sắp theo phí. Storefront tách ảnh khỏi chữ, tìm món theo nhóm, xử lý ảnh thiếu, mô tả trống, giá dài và trạng thái quán đóng. Thanh nổi mở được danh sách món đã chọn và chỉnh số lượng; chưa tạo đơn hàng trên backend.

### Đối tác

Trang “Quán của tôi” xử lý ảnh thiếu, tiến độ hồ sơ và trạng thái nhận đơn. Trang thực đơn có header ổn định với tên dài, chỉ số dạng text, danh mục cuộn ngang, bộ lọc, tìm kiếm, thêm/sửa/xóa. Sau khi lưu, dữ liệu được cập nhật mà không che toàn bộ trang; switch món khóa trong lúc request đang chạy.

### Quản trị viên

Danh sách duyệt dùng bảng đúng ngữ nghĩa, có retry và empty state. Trang chi tiết tiếp tục dùng dữ liệu API hiện có; không thêm KPI hoặc biểu đồ giả khi backend chưa cung cấp hợp đồng thống kê.

## Design system

`DESIGN_SYSTEM.md` hiện quy định lớp banner/surface, badge, grid, khóa dòng, responsive, trạng thái, bàn phím và hợp đồng DTO. Blueprint cho giỏ hàng, đánh giá, checkout, admin và hồ sơ đã có class nền tảng; những phần chưa có route/API được ghi rõ là blueprint.

Màu nền nút cam có chữ trắng chuyển sang màu tương phản cao hơn; màu semantic cho chữ nhỏ được làm đậm. Focus ring và `prefers-reduced-motion` đã được thêm.

## Kiểm định đã thực hiện

- `npm run build` trong `frontend`: thành công, 147 modules transformed.
- `git diff --check`: không có lỗi whitespace.
- `rg -n 'style=\{' frontend/src`: 0 kết quả.
- Đối chiếu `var(...)` trong CSS: 0 biến tham chiếu thiếu trong `:root`.
- Bảng token `DESIGN_SYSTEM.md`: 66/66 token khớp `global.css`.
- `design-taste-frontend lint --app`: 0 lỗi; còn cảnh báo có chủ đích cho bóng đổ ở card, focus ring và overlay.

## Giới hạn còn lại

- Browser inspector không khởi động được Chrome trong môi trường hiện tại; trình duyệt tích hợp cũng không kết nối được `localhost:5173`. Chưa thể xác nhận pixel sau sửa ở 320/390/768/1440px.
- Môi trường không có lệnh Maven và backend `localhost:8081` bị chặn, nên chưa biên dịch backend hoặc chạy test tích hợp MariaDB trong phiên này.
- SQL seed vẫn chứa ảnh stock và URL lặp. Frontend tránh lặp trong một thực đơn, nhưng ảnh sản phẩm thật vẫn cần đối tác cung cấp.
- DTO chưa có rating, ETA hay vị trí khách hàng; các chỉ số này được ẩn. Giỏ hàng/checkout chưa persist qua API.
- QA thủ công tiếp theo cần thử tên quán ngắn/ba dòng, 1/15 nhóm, ảnh lỗi/thiếu, mô tả 300 ký tự, giá hàng triệu, quán đóng, món hết, bàn phím và các breakpoint trong design system.
