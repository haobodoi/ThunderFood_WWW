# ThunderFood Design System

Phiên bản 3.4 · 29/10/2026 · Nguồn chuẩn: frontend/src/styles/global.css

Tài liệu này là hợp đồng giao diện cho năm phân hệ. Thành phần đang dùng được nêu rõ; các blueprint cho pha tiếp theo chỉ là CSS và quy tắc, chưa đại diện cho chức năng đã hoàn tất.

## 1. Nguyên tắc sản phẩm

- Thông tin về quán, món, trạng thái, giá và phí phải lấy từ API. Không tạo điểm đánh giá, số lượt đánh giá, thời gian giao hay số quán bằng ID hoặc hằng số quảng cáo.
- Ảnh thực đơn lấy từ imageUrl. Ảnh thiếu hoặc trùng trong cùng thực đơn dùng khung “Chưa có ảnh món”. Ảnh chạy nền trang chủ chỉ mang tính trang trí và không được gắn tên/giá một món cụ thể.
- Mỗi màn hình phải trả lời việc chính: khách tìm quán và xem món; đối tác quản lý thực đơn; quản trị viên duyệt hồ sơ.
- Thành phần dùng HTML đúng nghĩa: link để điều hướng, button để thao tác, table cho dữ liệu bảng, dialog cho modal. Trạng thái thao tác thể hiện bằng chữ và biểu tượng, không chỉ màu.

## 2. Luật hình học và chống chồng lớp

1. Banner và bề mặt thông tin là hai khối độc lập. .tf-store-hero__banner chỉ chứa ảnh và nút quay lại. .tf-store-hero__surface chứa avatar, tiêu đề, trạng thái, mô tả và chỉ số. Không dùng margin âm kéo chữ lên ảnh.
2. Tên quán dùng min-width: 0 và overflow-wrap: anywhere. Badge là phần tử flex không co và bám hàng đầu; tên dài có thể nhiều dòng mà badge không đè ảnh hoặc nhảy lên trên. Avatar có kích thước cố định trong luồng bố cục.
3. Tên món trong thẻ tối đa hai dòng, mô tả tối đa hai dòng; nội dung chi tiết trong modal không khóa dòng. Giá dài được phép xuống dòng. Footer và thanh thao tác được phép wrap; không ghép giá, switch và nút xóa vào một hàng cứng.
4. Lưới nhà hàng: repeat(auto-fill, minmax(min(100%, 300px), 1fr)). Lưới món: repeat(auto-fill, minmax(min(100%, 265px), 1fr)). Card dùng chiều cao 100% trong hàng, ảnh món 4:3, ảnh quán cao 176px. Một món duy nhất vẫn lấp đầy cột hợp lệ mà không vượt viewport.
5. Danh mục nhiều mục cuộn ngang; nút quản lý nhóm nằm ngoài dải tab để bấm chọn không làm thay đổi chiều rộng tab. Section có scroll-margin-top bù navbar và thanh sticky.
6. Breakpoint hiện hành: 1100px chuyển chỉ số storefront xuống hàng mới; 720px xếp lại storefront, tìm kiếm và lưới; 420px thu gọn navbar, xếp thông tin quán và hành động modal thành một cột. Không được cộng `width: 100%` với margin ngang cố định; mọi breakpoint phải có `scrollWidth === clientWidth`. Kiểm tra thêm ở 320px, 390px, 768px, 1280px và 1440px khi sửa bố cục.
7. Carousel thay nội dung trong cùng một khung phải giữ nguyên chiều cao giữa các slide. Tiêu đề và mô tả có số dòng dự trữ cố định; điều hướng thủ công phải đặt lại chu kỳ tự chạy; danh sách nổi bật giới hạn ở một tập đủ đa dạng thay vì cắt còn ba mục. Bộ đếm tiến trình dùng số và thanh tuyến tính, không dùng dãy pill trang trí.

## 3. Token CSS chuẩn

Bảng dưới được lấy trực tiếp từ :root của global.css. Thay đổi token tại CSS trước, rồi đồng bộ bảng này trong cùng thay đổi. Tên không có tiền tố tf là alias tương thích các màn hình cũ; không tạo alias mới nếu không có nhu cầu.

| Token | Giá trị trong CSS |
| :--- | :--- |
| --tf-navy-950 | #060d1a |
| --tf-navy-900 | #081120 |
| --tf-navy-800 | #0e1e38 |
| --tf-navy-700 | #182b4c |
| --tf-navy-100 | #e8eef8 |
| --tf-orange-600 | #d93d0c |
| --tf-orange-700 | #b9340b |
| --tf-orange-500 | #ff5520 |
| --tf-orange-400 | #ff6f42 |
| --tf-orange-100 | #fff1eb |
| --tf-orange-50 | #fff8f5 |
| --tf-bg-app | #faf8f5 |
| --tf-bg-surface | #ffffff |
| --tf-bg-subtle | #f3efe8 |
| --tf-border | #e6e1d6 |
| --tf-border-strong | #cfc8b8 |
| --tf-border-subtle | #f0ece3 |
| --tf-text-title | #0e1e38 |
| --tf-text-body | #2d3748 |
| --tf-text-muted | #64748b |
| --tf-text-inverted | #ffffff |
| --tf-success | #047857 |
| --tf-success-bg | #ecfdf5 |
| --tf-success-border | #a7f3d0 |
| --tf-danger | #b91c1c |
| --tf-danger-bg | #fef2f2 |
| --tf-danger-border | #fecaca |
| --tf-warning | #92400e |
| --tf-warning-bg | #fffbeb |
| --tf-warning-border | #fde68a |
| --tf-info | #0e7490 |
| --tf-info-bg | #eff6ff |
| --tf-info-border | #bfdbfe |
| --tf-shadow-xs | 0 1px 2px rgba(14, 30, 56, 0.04) |
| --tf-shadow-sm | 0 2px 6px -1px rgba(14, 30, 56, 0.05), 0 1px 3px -1px rgba(14, 30, 56, 0.03) |
| --tf-shadow-md | 0 8px 20px -4px rgba(14, 30, 56, 0.07), 0 2px 6px -1px rgba(14, 30, 56, 0.04) |
| --tf-shadow-lg | 0 16px 32px -6px rgba(14, 30, 56, 0.11), 0 4px 12px -2px rgba(14, 30, 56, 0.05) |
| --tf-shadow-modal | 0 24px 48px -12px rgba(14, 30, 56, 0.22), 0 8px 16px -4px rgba(14, 30, 56, 0.08) |
| --tf-ease-emphasis | cubic-bezier(0.22, 1, 0.36, 1) |
| --tf-ease-out | cubic-bezier(0.16, 1, 0.3, 1) |
| --tf-duration-fast | 140ms |
| --tf-duration-base | 240ms |
| --tf-duration-slow | 420ms |
| --primary | var(--tf-orange-600) |
| --primary-dark | var(--tf-orange-700) |
| --primary-soft | var(--tf-orange-100) |
| --ink | var(--tf-navy-800) |
| --text | var(--tf-text-body) |
| --muted | var(--tf-text-muted) |
| --border | var(--tf-border) |
| --bg | var(--tf-bg-app) |
| --surface | var(--tf-bg-surface) |
| --sidebar | var(--tf-navy-800) |
| --sidebar-text | #e2e8f0 |
| --success | #15803d |
| --success-soft | #f0fdf4 |
| --warning | #b45309 |
| --warning-soft | #fffbeb |
| --danger | #dc2626 |
| --danger-soft | #fef2f2 |
| --info | #0e7490 |
| --info-soft | #eff6ff |
| --radius | 14px |
| --radius-sm | 8px |
| --shadow | var(--tf-shadow-md) |
| --font | 'Baloo 2', 'Nunito', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif |
| --tf-font-heading | 'Baloo 2', 'Nunito', cursive, sans-serif |
| --tf-font-body | 'Nunito', 'Baloo 2', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif |

### Typography, tương phản và ngôn ngữ trạng thái theo ngữ cảnh

- Hệ thống Font chuẩn Việt hóa (Combo #4 F&B): `--font` và `--tf-font-heading` dùng `Baloo 2` (kết hợp `Nunito` cho đoạn văn bản mô tả `--tf-font-body`). Body `15.5px / 1.55` (weight `500–600`). Tiêu đề, thanh điều hướng (`Trang chủ`, `Khám phá quán ngon`), nút bấm và tab danh mục dùng `Baloo 2` (weight `700–800`), `line-height: 1.22`, `letter-spacing: -0.01em`.
- Hero title dùng clamp(34px, 4.4vw, 54px); tên quán dùng clamp(22px, 2.5vw, 30px); tên món 16px / 1.35; nội dung mô tả món 13px / 1.45; nút 14.5px.
- Chữ chính dùng --tf-text-title và --tf-text-body. Chữ phụ dùng --tf-text-muted. Nền CTA có chữ trắng dùng --tf-orange-600; hover dùng --tf-orange-700. --tf-orange-500 là điểm nhấn đồ họa, không dùng làm nền nút chữ trắng.
- **Không có một “badge vạn năng”.** Trạng thái, phân loại, bộ lọc, vai trò và thông báo là năm loại thông tin khác nhau; không được gom tất cả thành pill có chấm tròn, nền tint hoặc viền cùng màu.
- **Trạng thái duyệt** dùng `.status-label`: icon nét (`checkCircle`, `clock`, `xCircle`, `lock`) + chữ, không nền, không viền, không pill. Màu chỉ hỗ trợ ý nghĩa; icon và chữ phải tự diễn đạt trạng thái.
- **Trạng thái vận hành** dùng `.service-status` trong bề mặt sáng. Trên ảnh dùng bảng phẳng tối `.tf-rest-card__availability` hoặc `.tf-spotlight__availability`, bo tối đa `4px`, icon rõ nghĩa, không chấm “live”.
- **Phân loại ẩm thực** là metadata: icon món ăn + chuỗi giá trị ngăn bằng dấu `·`. Không bọc từng giá trị vào chip. Nhãn danh mục trên ảnh món chỉ dùng như caption ảnh, không dùng làm trạng thái.
- **Bộ lọc** là điều khiển. Dải ẩm thực dùng tab chữ và gạch chỉ thị; lựa chọn nhị phân có thể dùng nút nền đặc Navy. Chip trong form dùng góc `8px`, chỉ nền đặc khi được chọn; pill chỉ dành cho điều khiển rất ngắn cần hình học con nhộng.
- **Vai trò người dùng** là ngữ cảnh điều hướng. Topbar dùng breadcrumb `.dash__context`; menu tài khoản dùng `.user-menu__role` dạng icon + chữ. Không hiển thị vai trò như badge.
- **Alert, callout và ghi chú** dùng viền trung tính hoặc nền trung tính, icon mang màu ngữ nghĩa. Cấm viền màu bốn cạnh, cấm thanh màu dọc dày hơn `1px`, cấm icon lặp trong ô pastel.
- **Card quán đối tác** chỉ hiện `<progress>` ở trạng thái `DRAFT`. Quán đã duyệt dùng `.restaurant-card__open-inline` với icon vận hành và chữ trên dòng metadata.
- **Danh sách cấm**: nền pastel + viền cùng màu; dot + pill lặp lại; pill cho metadata không tương tác; gradient/glow trang trí; màu semantic là dấu hiệu duy nhất; cùng một anatomy cho mọi loại trạng thái.
- Mọi focus bàn phím có outline 3px. Hiệu ứng chuyển động phải tắt ở prefers-reduced-motion: reduce.

## 4. Blueprint theo phân hệ

| Chủ sở hữu | Đang dùng | Quy tắc và class dùng chung |
| :--- | :--- | :--- |
| Công — Nhà hàng & thực đơn | HomePage, RestaurantListSection, RestaurantDetailPage, RestaurantMenuPage, FoodCard, MenuItemModal, CategoryModal | .tf-hero, .tf-discovery, .tf-rest-card, .tf-store-hero, .tf-sticky-nav, .tf-food-grid, .food-card, .tf-partner-menu. Ảnh thiếu dùng placeholder; giá/nhóm/trạng thái theo API. |
| Hảo — Quản trị | AdminHomePage, RestaurantReviewListPage, RestaurantReviewDetailPage | .dash, .tf-admin-table, .review-actions, .status-label. Bảng dùng th/td, số căn phải bằng data-numeric, hàng thiếu dữ liệu hiển thị dấu hoặc mô tả. Không bịa KPI, biểu đồ hay xu hướng. |
| Minh — Giỏ hàng & đánh giá | Danh sách chọn món tạm thời tại RestaurantDetailPage | .tf-floating-cart, .tf-cart-drawer, .tf-rating-input, .tf-review-card. Drawer tương lai phải giữ focus, có đóng/mở bàn phím, danh sách cuộn độc lập, tổng tiền tính từ dòng món. Chỉ hiện đánh giá từ API. |
| Hoàng — Đặt hàng & thanh toán | Chưa có route đặt hàng/thanh toán | .tf-checkout, .tf-order-stepper, .tf-checkout__summary, .stepper. Bước hiện tại dùng aria-current=step; giá/phí/tổng đối soát từ đơn. Không hiển thị form thanh toán chưa có backend. |
| QAnh — Tài khoản & hồ sơ | LoginPage, RegisterPage, AccountInfoCard | .auth-page, .auth-card, .field, .field__input, .tf-profile-panel. Lỗi gắn với trường, focus đến lỗi đầu tiên, không in thông tin nhạy cảm vào log. |

### Cấu trúc và trạng thái của component

- Restaurant card: ảnh hoặc placeholder → bảng trạng thái vận hành trên ảnh → tên → metadata đặc trưng/địa chỉ → phí giao và link thực đơn. Loading dùng skeleton cùng tỷ lệ; lỗi API có nút Thử lại; rỗng có nút đặt lại bộ lọc. Carousel trang chủ giữ chiều cao card ổn định ở mọi slide và dừng khi hover/focus.
- Food card: ảnh hoặc placeholder → tên/mô tả → giá → hành động. Khi quán đóng hoặc món hết, nút chọn món disabled và có nhãn chữ. Đối tác có hai hàng riêng; trạng thái duyệt dùng icon + text, không dùng badge.
- Modal: tiêu đề, nút đóng, body cuộn độc lập và footer. Escape chỉ đóng khi không bận; Tab ở trong dialog; đóng xong trả focus về điều khiển trước đó.
- Toast: role=status, không lấy focus, tự biến mất sau phản hồi ngắn; lỗi quan trọng dùng Alert còn hiện để người dùng sửa.
- Bộ lọc: trạng thái được hiển thị qua aria-pressed. Khi không có kết quả, hành động đặt lại chỉ xóa bộ lọc, không mở modal thêm món.

## 5. Hợp đồng dữ liệu

- RestaurantPublicDto: id, restaurantName, specialty, address, phone, avatarImage, coverImage, deliveryFee, open, tags. TagDto dùng tagName và tagType; ở storefront chỉ hiển thị tag có tagType=CUISINE và tagName khác rỗng. Nếu thiếu ảnh, phí hoặc mô tả thì hiển thị trạng thái thiếu dữ liệu trung thực.
- RestaurantMenuResponseDto chứa restaurant và menu; mỗi nhóm có categoryId, categoryName, items. MenuItemResponseDto dùng itemName, description, price, imageUrl, available, approvalStatus. Frontend kiểm tra menu/items là mảng trước khi map.
- DTO hiện chưa có rating, reviewCount, delivery ETA hoặc vị trí khách hàng. Không hiển thị các chỉ số này cho tới khi backend cung cấp giá trị có nguồn và định nghĩa rõ.
- Dữ liệu seed trong thunderfood_mariadb_v3.sql là mẫu. Ảnh sản phẩm thật vẫn cần đối tác xác nhận trước khi dùng như catalog thương mại.

## 6. Cổng kiểm định

Trước khi hợp nhất thay đổi giao diện: chạy npm run build trong frontend, kiểm tra git diff --check, kiểm tra style inline bằng rg -n 'style=\{' frontend/src, và rà token mới với bảng ở trên. Dùng bàn phím qua tìm kiếm, tab bộ lọc, card, modal, thêm/bớt món; thử tên quán một từ và ba dòng, 1 và 15 danh mục, mô tả trống và 300 ký tự, giá từ 0 đến hàng triệu, ảnh thiếu, API lỗi, mobile 320px và laptop 1280px. Khi backend không chạy, ghi rõ kiểm định chỉ là build và static review.
