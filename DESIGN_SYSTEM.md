# ThunderFood Design System

Phiên bản 3.5 · 29/10/2026 · Nguồn chuẩn: `frontend/src/styles/global.css`

Tài liệu này là hợp đồng giao diện cho năm phân hệ. Thành phần đang dùng được nêu rõ; các blueprint cho pha tiếp theo chỉ là CSS và quy tắc, chưa đại diện cho chức năng đã hoàn tất.

## 0. Cách đọc trạng thái

- **CURRENT:** đã tồn tại trong source hiện tại và có thể tái sử dụng theo contract trong tài liệu này.
- **PROPOSED:** thay đổi có căn cứ nhưng chưa triển khai hoặc chưa đủ kiểm thử; phải được review trước khi áp dụng.
- **BLUEPRINT:** quy tắc định hướng cho module tương lai, không được mô tả như chức năng đang hoạt động.
- Source đang chạy là bằng chứng cuối cùng. Nếu tài liệu và code lệch nhau, xác minh code, sửa lỗi rồi cập nhật tài liệu trong cùng thay đổi.
- V3.5 là refinement của V3.4: giữ brand, font, layout và component hiện hành; không phải một đợt redesign hoặc migration framework.

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

### Spacing, kích thước và responsive

- Scale ưu tiên cho code mới: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px`. Giá trị trung gian chỉ dùng khi giải quyết một ràng buộc layout cụ thể.
- Radius hiện hành: `--radius-sm: 8px`, `--radius: 14px`; card dùng 10–14px tùy bề mặt. Không biến metadata hoặc status thành pill mặc định.
- Chiều cao hiện hành: `.btn` 40px, `.btn--sm` 34px, `.btn--lg` 48px. Trên mobile, hành động chính và icon button đứng độc lập phải hướng tới vùng chạm ít nhất 44×44px; ngoại lệ inline cần đủ khoảng cách với target kế bên.
- Container có `max-width: 1320px` và padding ngang `clamp(16px, 3vw, 36px)`. Không cộng `width: 100%` với margin ngang cố định làm phát sinh overflow.
- Breakpoint layout hiện hành là 1100px, 720px và 420px; QA tối thiểu ở 320, 390, 768, 1280 và 1440px.

## 4. Component contracts

| Component | CURRENT trong repo | Contract bắt buộc |
| :--- | :--- | :--- |
| Button | `.btn`, `--primary`, `--outline`, `--ghost`, `--danger`, `--sm`, `--lg`, `--block` | Chọn variant theo mức ưu tiên; button không submit phải có `type="button"`; loading/disabled khóa thao tác lặp; icon-only có accessible name; giữ focus-visible. |
| Input / TextField | `TextField.jsx`, `.field`, `.field__input` | Label thật luôn tồn tại; placeholder không thay label. Lỗi nối bằng `aria-describedby` và `aria-invalid` khi giá trị không hợp lệ; hint có id riêng; không xóa input khi request lỗi. |
| File / URL image input | `ImageUpload.jsx`, khối ảnh trong `MenuItemModal.jsx` | File và URL có accessible name; định dạng/kích thước được nói trước; lỗi upload dùng live region và được control liên quan tham chiếu; disabled trong lúc upload để tránh request lặp. |
| Modal / Dialog | `Modal.jsx`, `.modal__panel` | `role="dialog"`, `aria-modal`, tiêu đề qua `aria-labelledby`; trap Tab, trả focus, khóa body scroll. Escape/backdrop chỉ đóng khi callback close được cấp; body cuộn độc lập. |
| Confirm dialog | `ConfirmModal.jsx` | Nêu đối tượng và hậu quả; hành động destructive có nhãn cụ thể; khi xử lý phải khóa confirm và cancel phù hợp. |
| Restaurant Card | `RestaurantListSection.jsx`, `.tf-rest-card` | Ảnh/placeholder → trạng thái phục vụ → tên → specialty/địa chỉ → phí giao → link thực đơn. Không bịa rating/ETA; tên dài được wrap; loading/error/empty giữ đúng anatomy và có recovery. |
| Food Card | `FoodCard.jsx`, `.food-card` | Ảnh/placeholder → tên/mô tả → giá → hành động. Tên/mô tả tối đa hai dòng ở card; giá được wrap cả cụm; footer được wrap; món hết hoặc quán đóng phải disabled bằng logic và có chữ giải thích. |
| StatusLabel | `StatusLabel.jsx`, `.status-label` | Chỉ dùng cho trạng thái duyệt; icon + chữ, không nền/viền/pill. Màu không phải tín hiệu duy nhất. |
| Service status | `.service-status`, `.tf-rest-card__availability`, `.tf-spotlight__availability` | Chỉ biểu diễn đang nhận đơn/tạm ngưng. Trên ảnh dùng bảng phẳng tối; trên nền sáng dùng icon + chữ; không dùng dot “live”. |
| Switch | `.tf-switch` trong `FoodCard.jsx`, `MenuItemModal.jsx` | CURRENT dùng button + `aria-pressed`. Nếu chuyển sang `role="switch"`, phải đổi đồng bộ sang `aria-checked` và regression-test; không trộn hai mô hình. Label trạng thái phải đọc được. |
| Tabs / Filter | `.tf-cuisine-tab`, `.tf-open-filter`, `.tf-cat-tab`, `.tf-sticky-nav` | Filter/toggle dùng button + `aria-pressed`; nút cuộn tới section không được giả làm ARIA tab. Dải dài cuộn ngang, active vẫn nhìn thấy; nút quản trị nhóm nằm ngoài dải category. |
| Alert / Empty / Skeleton | `Alert.jsx`, `.empty-state`, `.skeleton` | Error dùng `role="alert"`; trạng thái thông tin dùng `role="status"`. Lỗi có recovery, empty có next action, skeleton cùng kích thước nội dung thật để tránh layout shift. |
| Stepper | `Stepper.jsx`, `.stepper` | Bước hiện tại dùng `aria-current="step"`; bước chưa tới không giả làm link hoạt động; validation gắn đúng bước. |
| Table | `.tf-admin-table`, `RestaurantReviewListPage.jsx` | Dùng table/th/td thật; header mô tả cột; số căn phải với `data-numeric`; wrapper cho phép cuộn ngang ở màn nhỏ; dữ liệu thiếu hiển thị trung thực. |

Không tạo component mới trùng contract trên. Thay đổi shared component hoặc token nền tảng phải có ảnh regression và kiểm tra keyboard ở các phân hệ dùng chung.

## 5. Trạng thái theo phân hệ

| Chủ sở hữu | Đang dùng | Quy tắc và class dùng chung |
| :--- | :--- | :--- |
| Công — Nhà hàng & thực đơn | HomePage, RestaurantListSection, RestaurantDetailPage, RestaurantMenuPage, FoodCard, MenuItemModal, CategoryModal | .tf-hero, .tf-discovery, .tf-rest-card, .tf-store-hero, .tf-sticky-nav, .tf-food-grid, .food-card, .tf-partner-menu. Ảnh thiếu dùng placeholder; giá/nhóm/trạng thái theo API. |
| Hảo — Quản trị | AdminHomePage, RestaurantReviewListPage, RestaurantReviewDetailPage | .dash, .tf-admin-table, .review-actions, .status-label. Bảng dùng th/td, số căn phải bằng data-numeric, hàng thiếu dữ liệu hiển thị dấu hoặc mô tả. Không bịa KPI, biểu đồ hay xu hướng. |
| Minh — Giỏ hàng & đánh giá | **CURRENT:** danh sách chọn món tạm thời tại RestaurantDetailPage. **BLUEPRINT:** giỏ/đánh giá tích hợp. | `.tf-floating-cart`, `.tf-cart-drawer`, `.tf-rating-input`, `.tf-review-card`. Drawer tương lai phải giữ focus, có đóng/mở bàn phím, danh sách cuộn độc lập, tổng tiền tính từ dòng món. Chỉ hiện đánh giá từ API. |
| Hoàng — Đặt hàng & thanh toán | CheckoutPage, OrdersPage, OrderDetailPage, PartnerOrdersPage, VietQrPayment, OrderParts | `.tf-checkout`, `.tf-order-stepper`, `.tf-checkout__summary`, `.tf-order-card`, `.tf-order-status`, `.tf-qr`. Bước hiện tại dùng `aria-current=step`; giá/phí/tổng đối soát từ đơn. Trạng thái đơn và thanh toán dùng `.tf-order-status` (icon + chữ, không nền/viền/pill), không dùng `StatusLabel`. |
| QAnh — Tài khoản & hồ sơ | LoginPage, RegisterPage, AccountInfoCard | .auth-page, .auth-card, .field, .field__input, .tf-profile-panel. Lỗi gắn với trường, focus đến lỗi đầu tiên, không in thông tin nhạy cảm vào log. |

## 6. Hợp đồng dữ liệu và imagery

- RestaurantPublicDto: id, restaurantName, specialty, address, phone, avatarImage, coverImage, deliveryFee, open, tags. TagDto dùng tagName và tagType; ở storefront chỉ hiển thị tag có tagType=CUISINE và tagName khác rỗng. Nếu thiếu ảnh, phí hoặc mô tả thì hiển thị trạng thái thiếu dữ liệu trung thực.
- RestaurantMenuResponseDto chứa restaurant và menu; mỗi nhóm có categoryId, categoryName, items. MenuItemResponseDto dùng itemName, description, price, imageUrl, available, approvalStatus. Frontend kiểm tra menu/items là mảng trước khi map.
- DTO hiện chưa có rating, reviewCount, delivery ETA hoặc vị trí khách hàng. Không hiển thị các chỉ số này cho tới khi backend cung cấp giá trị có nguồn và định nghĩa rõ.
- Dữ liệu seed trong thunderfood_mariadb_v3.sql là mẫu. Ảnh sản phẩm thật vẫn cần đối tác xác nhận trước khi dùng như catalog thương mại.
- Sort “Phí giao thấp nhất” phải đặt `null`, chuỗi rỗng, số âm và giá trị không chuyển được thành số sau mọi phí hợp lệ; `0` vẫn là một giá trị hợp lệ. Khi hiển thị dữ liệu thiếu, dùng “Chưa cập nhật”, không ngầm biến thành `0 ₫`.
- **CURRENT:** trang chi tiết đang ẩn URL ảnh bị lặp trong cùng thực đơn bằng placeholder. **PROPOSED:** không ẩn tự động chỉ vì URL trùng; thay vào đó gắn cờ biên tập hoặc xử lý tại dữ liệu. Chỉ đổi khi có chính sách nội dung và regression test cho ảnh trùng hợp lệ.
- Ảnh nền hero trong `mediaUtils.js` là trang trí; không được dùng như bằng chứng ảnh thật của món trong menu.

## 7. Motion và khả năng truy cập

- Timing CURRENT: fast 140ms, base 240ms, slow 420ms. Motion chỉ hỗ trợ nhận biết thao tác hoặc chuyển ngữ cảnh; ưu tiên transform/opacity và không kéo dài task.
- CURRENT ở V3.5: `prefers-reduced-motion: reduce` dừng marquee, skeleton, spinner, floating cart entrance, transition card/switch; CSS đổi smooth scroll thành `auto`; các lời gọi `scrollIntoView` dùng `getMotionSafeScrollBehavior()`.
- Carousel tự chạy phải dừng khi hover/focus và không auto-slide khi reduced-motion. Điều hướng thủ công giữ nội dung trong khung có chiều cao ổn định.
- Focus bàn phím dùng outline 3px; kiểm tra icon button, category strip, upload, modal, menu tài khoản và stepper.
- Error form nằm gần trường, có thông điệp cách khắc phục và live announcement khi cần. Với lỗi validation, ưu tiên đưa focus tới trường lỗi đầu tiên; không chỉ đổi màu viền.
- Modal giữ focus trong dialog và trả focus sau khi đóng. Loading/disabled/error/success phải có chữ đọc được, không chỉ animation hoặc màu.

## 8. Teamwork và quyền sở hữu

1. Trước khi code, tìm component/tokens tương đương. Chỉ thêm variant khi có khác biệt nghiệp vụ, không vì sở thích thị giác.
2. Thay shared UI (`Navbar`, `Sidebar`, `Modal`, `FoodCard`, token và `global.css`) cần reviewer của module liên quan, ảnh desktop/mobile và kiểm tra keyboard.
3. Call API phải đối chiếu chữ ký hàm, thứ tự tham số, loading/error và dữ liệu null. Build không chứng minh upload/submit hoạt động.
4. Không mass-rename alias cũ. **PROPOSED:** hợp nhất `--success`/`--danger` với `--tf-*` trong một thay đổi riêng có screenshot regression.
5. `--tf-text-muted` trên nền ngà ở sát ngưỡng AA theo tính toán tài liệu audit. **PROPOSED:** đo lại trên browser/font thật rồi mới cân nhắc đổi token; không chỉnh một vài màn hình riêng lẻ.
6. Báo cáo kiểm thử theo nhóm STATIC / BUILD / BROWSER / API / BACKEND. Không suy diễn “pass” từ log cũ.

## 9. Release gate V3.5

Trước khi hợp nhất thay đổi giao diện:

- Chạy `npm run build` trong `frontend`, `git diff --check`, rà style inline và token mới so với bảng CURRENT.
- Dùng bàn phím qua tìm kiếm, filter, card, modal, upload và thêm/bớt món; xác minh focus quay lại đúng chỗ.
- Thử tên quán/món một từ và ba dòng, mô tả trống và 300 ký tự, giá 0 và số dài, ảnh thiếu/lỗi/trùng, 1 và 15 category, 0/nhiều món.
- Kiểm tra loading, empty, error, disabled và success; không bịa state không có từ API.
- Kiểm tra 320, 390, 768, 1280 và 1440px; không có horizontal overflow, layout shift hoặc target chồng nhau.
- Kiểm tra reduced-motion ở CSS và JavaScript. Khi backend chạy, thử upload file hợp lệ, file quá lớn và lỗi API; khi không chạy phải ghi rõ chưa xác minh API/BACKEND.
- Thay đổi visual cần ảnh trước/sau. Nếu chỉ thay logic/semantics mà không đổi hình học, ghi rõ không có visual redesign.
