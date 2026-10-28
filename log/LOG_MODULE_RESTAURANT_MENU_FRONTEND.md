# BÁO CÁO NHẬT KÝ THỰC HIỆN & TỔNG CẢI TIẾN GIAO DIỆN + CSDL V2 (4 ARGON EDITION)

**Người thực hiện**: Công (Module 2: Nhà hàng & Món ăn + Lead Design System)
**Thời gian hoàn thành**: 2026-10-28
**Trạng thái Build & Database**: **SUCCESS** (Đã nạp `thunderfood_mariadb_v2.sql` vào MariaDB, 100% dữ liệu từ DB thật)

---

## 1. BẢNG THỐNG KÊ CHI TIẾT CÁC LỖI GIAO DIỆN & AI-SLOP ĐÃ PHÁT HIỆN VÀ XỬ LÝ

| STT | Hạng mục lỗi phát hiện | Nguyên nhân gốc rễ trong code cũ | Giải pháp 4 Argon đã triển khai |
| :---: | :--- | :--- | :--- |
| **1** | **Hai bên màn hình quá trống trải, Hero trống rỗng 60% bên phải** | `.container` chỉ giới hạn `1160px`; `.hero` chỉ có 1 cột chữ `max-width: 560px` bên trái, bên phải bỏ trắng hoàn toàn với vệt radial-gradient AI-slop. | • Nâng cấp `.container` lên `1320px` chuẩn Widescreen.<br>• Tạo **Ambient Culinary Marquee Background** (2 dải băng chuyền món ăn chạy ngược chiều nhau mượt mà 60fps phía sau lớp kính mờ `.tf-hero__veil`), phủ kín 100% chiều ngang màn hình.<br>• Chia Hero thành lưới 2 cột (`.tf-hero__grid`): Cột trái gồm Tiêu đề + Thanh tìm kiếm nhanh + Chỉ số uy tín; Cột phải là **Interactive Culinary Spotlight Carousel** tự động trình chiếu món ngon nổi bật. |
| **2** | **Đứt gãy biến CSS giữa `DESIGN_SYSTEM.md` và `global.css` (Token Split-Brain)** | `DESIGN_SYSTEM.md` quy định `--tf-shadow-sm`, `--tf-shadow-md`, `--tf-shadow-lg`, `--tf-shadow-modal`, `--tf-success-bg`... nhưng `global.css` không khai báo chúng ở `:root`, khiến mọi `box-shadow` bị biến mất (`none`). | • Đồng bộ 100% toàn bộ hệ thống biến `--tf-*` vào đầu file `global.css` cùng hệ thống bóng đổ đa tầng và đường cong chuyển động `--tf-ease-spring`. |
| **3** | **Danh sách nhà hàng chỉ có 1 thẻ trơ trọi & Khung màu xanh đen phẳng lì (Thiếu dữ liệu & ảnh trong DB)** | Trong DB v1 chỉ có 1 quán `APPROVED` (`Bếp Nhà Bình`) và các trường `cover_image`, `avatar_image`, `image_url` đều bằng `NULL`. Code cũ chỉ hiển thị hộp màu xanh `#1f2e46` hoặc hộp xám "Chưa có ảnh". | • Tạo script CSDL mới **`backend/database/thunderfood_mariadb_v2.sql`** đặt cạnh file v1 và nạp thẳng vào MariaDB với **8 nhà hàng** (6 quán `APPROVED` đang mở cửa, 1 `PENDING`, 1 `DRAFT`), **13 danh mục** và **24 món ăn** kèm đầy đủ ảnh bìa, ảnh đại diện và ảnh món ăn sắc nét.<br>• Giữ bộ giải mã ảnh dự phòng thông minh trong `mediaUtils.js` cho các quán/món mới tạo thủ công chưa kịp upload ảnh. |
| **4** | **Nút lọc "Đang mở cửa" hiển thị chấm ĐỎ (`🔴 Đang mở cửa`) gây hiểu lầm** | Tại `RestaurantListSection.jsx`, khi `onlyOpen === false`, code cũ gán class `live-dot--danger` (màu đỏ báo lỗi/đóng cửa) vào cạnh chữ "Đang mở cửa". | • Thay bằng `.tf-open-filter` với chấm trạng thái trung tính (`live-dot--muted`) khi chưa kích hoạt và chuyển sang nhịp đập xanh lá (`live-dot`) kèm nền xanh chuẩn mực khi bật lọc. |
| **5** | **Vi phạm quy tắc cấm "Pill Bubble Pastel" (`border-radius: 9999px`)** | Dù `DESIGN_SYSTEM.md` cấm pill pastel nhưng `.status-badge`, badge đóng/mở trên thẻ nhà hàng và trang chi tiết quán vẫn dùng `borderRadius: '9999px'` kèm nền xanh/đỏ nhạt. | • Chuẩn hóa toàn bộ sang `.tf-badge` và `.status-badge` góc bo chữ nhật `6px`, viền hairline `1px`, kính mờ tối (`tf-badge--glass-open`) trên nền ảnh hoặc nền sáng tương phản cao. |
| **6** | **Nguy cơ chồng chữ trên Thẻ Món Ăn (`FoodCard`) & Giật bố cục Tab Danh Mục (`RestaurantMenuPage`)** | • Ở chế độ Đối tác, giá bán và 3 nút (Switch Còn món + Sửa + Xóa) bị nhét chung vào 1 hàng hẹp.<br>• Nút Sửa/Xóa nhóm thực đơn chèn trực tiếp vào trong thanh cuộn ngang khi click chọn nhóm, gây nhảy layout. | • Thiết kế chân thẻ 2 tầng riêng biệt (`.food-card__partner-footer`): Hàng 1 hiển thị Giá bán & Badge duyệt; Hàng 2 hiển thị Tactile Switch (`.tf-switch`) và nút Sửa/Xóa.<br>• Tách riêng thanh quản lý nhóm đang chọn ra khỏi thanh cuộn Tab, triệt tiêu 100% hiện tượng nhảy giao diện. |

---

## 2. DANH SÁCH CÁC FILE ĐÃ TẠO MỚI & NÂNG CẤP

1. **[thunderfood_mariadb_v2.sql](file:///d:/documents/GitHub/ThunderFood/backend/database/thunderfood_mariadb_v2.sql)**: Script CSDL phiên bản 2 đặt chung thư mục `backend/database/` với `thunderfood_mariadb.sql` (v1), nạp đầy đủ 8 nhà hàng, 13 danh mục, 24 món ăn có hình ảnh, mô tả, địa chỉ và liên kết `restaurant_tags` chuẩn xác.
2. **[DESIGN_SYSTEM.md](file:///d:/documents/GitHub/ThunderFood/DESIGN_SYSTEM.md)**: Nâng cấp lên phiên bản **Kinetic Culinary Architecture v2.0** (Uber Eats / DoorDash + Linear / Vercel Geist).
3. **[mediaUtils.js](file:///d:/documents/GitHub/ThunderFood/frontend/src/utils/mediaUtils.js)**: Hệ thống dữ liệu Hero Marquee 2 làn, Spotlight Carousel liên kết trực tiếp tới ID quán thật trong DB (`1, 4, 5`) và thuật toán ánh xạ ảnh dự phòng thông minh (`getSmartFoodImage`, `getSmartRestaurantCover`, `getRestaurantMetrics`).
4. **[global.css](file:///d:/documents/GitHub/ThunderFood/frontend/src/styles/global.css)**: Đồng bộ toàn bộ biến `--tf-*`, mở rộng `.container` lên `1320px`, bổ sung hệ thống class `.tf-hero`, `.tf-marquee`, `.tf-spotlight`, `.tf-discovery`, `.tf-rest-card`, `.food-card`, `.tf-store-hero`, `.tf-sticky-nav`, `.tf-floating-cart`, `.tf-kpi-grid`, `.tf-footer`.
5. **[HomePage.jsx](file:///d:/documents/GitHub/ThunderFood/frontend/src/pages/HomePage.jsx)**: Hero 2 cột hiện đại với Background Carousel món ăn chuyển động mờ phía sau, thanh tìm kiếm nhanh trên Hero và Spotlight Carousel món nổi bật bên phải.
6. **[RestaurantListSection.jsx](file:///d:/documents/GitHub/ThunderFood/frontend/src/components/RestaurantListSection.jsx)**: Lấy 100% dữ liệu nhà hàng từ API Backend (`publicRestaurantApi.search`), bổ sung thanh lọc nhanh 6 nhóm ẩm thực (`.tf-cuisine-strip`), bộ chọn sắp xếp, nút lọc "Đang mở cửa" chuẩn xác.
7. **[RestaurantDetailPage.jsx](file:///d:/documents/GitHub/ThunderFood/frontend/src/pages/customer/RestaurantDetailPage.jsx)**: Lấy 100% thực đơn nhà hàng từ API Backend (`publicRestaurantApi.getMenu`), nâng cấp Banner cửa hàng kèm khối 3 chỉ số (Đánh giá, Thời gian giao, Phí giao), thanh Sticky Category Nav tích hợp ô tìm kiếm món tại chỗ, Modal xem chi tiết món có bộ đếm số lượng `[- 1 +]` và thanh giỏ hàng nổi (`.tf-floating-cart`).
8. **[FoodCard.jsx](file:///d:/documents/GitHub/ThunderFood/frontend/src/components/FoodCard.jsx)**, **[RestaurantMenuPage.jsx](file:///d:/documents/GitHub/ThunderFood/frontend/src/pages/partner/RestaurantMenuPage.jsx)** & **[MyRestaurantsPage.jsx](file:///d:/documents/GitHub/ThunderFood/frontend/src/pages/partner/MyRestaurantsPage.jsx)**: Hoàn thiện không gian quản lý thực đơn và quán cho Đối tác.
9. **[Navbar.jsx](file:///d:/documents/GitHub/ThunderFood/frontend/src/components/Navbar.jsx)**, **[PublicLayout.jsx](file:///d:/documents/GitHub/ThunderFood/frontend/src/layouts/PublicLayout.jsx)**, **[CustomerHomePage.jsx](file:///d:/documents/GitHub/ThunderFood/frontend/src/pages/customer/CustomerHomePage.jsx)**: Hoàn thiện thanh điều hướng và chân trang 4 cột chuyên nghiệp.

---

## 3. ĐỢT KIỂM ĐỊNH ĐỘC LẬP — 28/10/2026

Phần trên phản ánh đợt triển khai ban đầu. Sau khi đối chiếu source, DTO và ảnh chụp thực tế, các kết luận sau được cập nhật:

- Storefront không còn kéo khối thông tin âm lên banner. Tên quán, badge, mô tả, địa chỉ và tag nằm trên một surface trắng độc lập, chịu được tên nhiều dòng.
- Đã xóa `getRestaurantMetrics` và toàn bộ rating, số đánh giá, ETA, khoảng cách được tạo từ ID. DTO hiện chưa có các trường này nên giao diện không hiển thị chúng.
- `getSmartFoodImage` không còn được dùng. Card chỉ nhận `imageUrl` từ API; ảnh thiếu hoặc trùng trong cùng thực đơn công khai hiển thị placeholder.
- Tag công khai chỉ hiển thị khi `tagType === 'CUISINE'` và `tagName` khác rỗng; không còn chip `#` rỗng.
- Danh sách quán lấy chip ẩm thực từ API, có loading/error/retry/empty riêng; lưới dùng kích thước an toàn cho viewport 320px.
- Trang quản lý thực đơn được tổ chức lại với header, chỉ số dạng text, danh mục cuộn ngang và action nhóm đứng ngoài tab. Sau thao tác lưu, dữ liệu reload nền thay vì che toàn trang.
- Modal dùng chung giữ focus, trả focus, khóa scroll nền, hỗ trợ Escape có guard và body cuộn trong giới hạn viewport.
- Danh sách duyệt admin dùng bảng HTML đúng ngữ nghĩa.
- Toàn bộ `style={{...}}` trong `frontend/src` đã được chuyển sang class CSS; kiểm tra hiện trả về 0 inline style JSX.
- `DESIGN_SYSTEM.md` v3.0 được sinh từ 66 token thật trong `global.css`; kiểm tra cho thấy 66/66 token khớp và không có CSS variable chưa khai báo.

### Xác minh

- `npm run build`: thành công, 147 modules transformed.
- `git diff --check`: đạt.
- `design-taste-frontend lint --app`: 0 lỗi; các cảnh báo còn lại thuộc bóng đổ có chủ đích ở card, focus ring và overlay.
- Visual QA tự động chưa hoàn tất vì Chrome inspector không khởi động được và trình duyệt tích hợp không truy cập được localhost trong môi trường chạy.
- Không có lệnh Maven trong môi trường và backend `localhost:8081` không truy cập được, nên chưa biên dịch backend hoặc chạy test tích hợp MariaDB. Việc nạp SQL được ghi ở đợt lịch sử phía trên không được tái xác minh trong đợt kiểm định này.
