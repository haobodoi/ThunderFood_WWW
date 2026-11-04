# ThunderFood — quản trị và thống kê

Bổ sung mới: thống kê đối tác và bản SQL cài mới gộp đầy đủ cùng dữ liệu mẫu lớn nằm trong [FINAL_SETUP.md](FINAL_SETUP.md). Docker trên volume mới hiện nạp một file `thunderfood_final.sql`; các hướng dẫn V5 bên dưới vẫn áp dụng cho database đang sử dụng.

## Phạm vi và trạng thái nghiệm thu

Giữ React 18/Vite, Spring Boot 3.5.6/Java 21, Spring Security session + CSRF, JPA và MariaDB. Không thay cơ chế đặt món, giá do server tính, COD hoặc VietQR. Dashboard đọc database đang kết nối, không có dữ liệu giả ở frontend.

| Nhóm yêu cầu | Đã triển khai | Xác minh / giới hạn |
| --- | --- | --- |
| Xác thực | Đăng nhập sẵn có, đăng xuất; bảo vệ route/API; kiểm tra lại trạng thái và vai trò mỗi request | API kiểm tra 401/403, CSRF, khóa tài khoản và đổi quyền làm mất hiệu lực phiên cũ |
| Phân quyền | ADMIN và STAFF; điều hướng và thao tác phù hợp vai trò | STAFF không được quản lý người dùng, duyệt hồ sơ, kiểm duyệt đánh giá, cấu hình quán, xem nhật ký, xác nhận nhận/hoàn tiền ngân hàng |
| Dashboard | Doanh thu, số đơn, khách mới/tổng khách, AOV, trạng thái đơn/thanh toán, COD/VietQR, tỷ lệ hủy, món/danh mục bán chạy, món bán chậm, đơn mới, việc cần xử lý | Bộ lọc ngày, nhóm ngày/tuần/tháng/năm, so kỳ trước, CSV UTF-8; số liệu kiểm tra bằng fixture DB có kết quả xác định |
| Đơn hàng | Danh sách/chi tiết; tìm mã/người nhận/tài khoản; lọc ngày/trạng thái/thanh toán/khách; sắp xếp; ghi chú nội bộ; lịch sử; chuyển trạng thái; ghi nhận hoàn tiền | Khóa dòng và kiểm tra trạng thái màn hình cũ. Giữ snapshot tên/giá của đơn cũ. Hoàn tiền thực hiện ngoài hệ thống |
| Thực đơn | Thêm/sửa/ẩn/hiện/xóa mềm món; giá, ảnh, mô tả, danh mục, còn/hết; CRUD và ẩn/hiện danh mục theo quán | Ẩn danh mục chặn đặt từ cả giỏ cũ; xóa danh mục chỉ khi không còn món chưa xóa. Upload dùng cơ chế sẵn có, giới hạn 1MB/JPG/PNG/WEBP |
| Người dùng | Tìm/lọc/phân trang, chi tiết và lịch sử đơn; tạo ADMIN/STAFF; khóa/mở; đổi quyền nội bộ | BCrypt; không trả hash qua API; không tự khóa/hạ quyền; giữ ít nhất một ADMIN hoạt động; giữ nguyên vai trò khách/đối tác để bảo toàn liên kết nghiệp vụ |
| Nhà hàng | Duyệt/từ chối sẵn có, bổ sung tìm kiếm/phân trang/khóa khi duyệt đồng thời; cấu hình phí giao và bật/tắt nhận đơn | Bật nhận đơn vẫn cần hồ sơ được duyệt và trong giờ mở cửa đã đăng ký |
| Đánh giá/phản hồi | Tái sử dụng kiểm duyệt, ẩn/khôi phục đánh giá, xử lý báo cáo; bổ sung nhật ký chung và xử lý bảng complaints | Không tạo luồng giả; mục complaints xử lý dữ liệu đã có, chưa bổ sung form gửi khiếu nại mới phía khách |
| Nhật ký | Người thực hiện, thời gian, đối tượng, hành động; tìm kiếm và phân trang | Bao gồm thao tác đơn, thực đơn, người dùng, quán, duyệt hồ sơ, kiểm duyệt và khiếu nại; không có API xóa nhật ký |
| Giao diện | Tiếng Việt, thiết kế theo token ThunderFood, responsive CSS, bảng cuộn, trạng thái loading/empty/error/success, modal, bàn phím/focus menu mobile | **Build đã kiểm tra; chưa hoàn tất nghiệm thu bằng trình duyệt/screenshot và ma trận kích thước 320/390/768/1280/1440.** Browser host không sẵn có, quyền điều khiển app hết thời gian chờ |
| Khuyến mãi, mã giảm giá | Chưa bổ sung | Schema/checkout hiện không có mã giảm giá hoặc chính sách giảm giá. Thêm cần chốt phạm vi nền tảng/quán, nguồn tài trợ, giới hạn dùng, điều kiện đơn và xử lý hủy. Không có menu/nút giả |
| Banner/CMS trang chủ | Chưa bổ sung | Trang chủ hiện dùng nội dung cố định, chưa có bảng/CMS hoặc luồng xuất bản. Không thêm trang quản trị không nối vào trang khách |
| Biến thể/topping/tồn kho | Giữ các thuộc tính hiện có | Hiện chỉ có giá và còn/hết; chưa có nghiệp vụ biến thể/topping/tồn kho số lượng |

## Cách tính thống kê

- Múi giờ nghiệp vụ: **Asia/Ho_Chi_Minh**; đơn vị **VND**.
- Lọc theo **ngày tạo đơn**, bao gồm từ 00:00 ngày đầu đến trước 00:00 ngày sau ngày cuối. Trạng thái đơn là trạng thái hiện tại lúc lập báo cáo. Đây là báo cáo nhóm đơn được tạo trong kỳ, không phải sổ kế toán ghi nhận doanh thu theo ngày hoàn tất.
- Đủ điều kiện doanh thu: `order_status = COMPLETED` và `payment_status = PAID`.
- Doanh thu món = tổng `subtotal` của đơn đủ điều kiện; phí giao = tổng `delivery_fee`; tổng thu = tổng `total_amount`.
- AOV = tổng thu / số đơn đủ điều kiện, gồm phí giao. Khi không có đơn đủ điều kiện, AOV = 0.
- Hệ thống hiện ràng buộc `total_amount = subtotal + delivery_fee`, chưa có trường giảm giá. Không giả lập giảm giá bằng 0 rồi coi là nghiệp vụ đã hỗ trợ.
- CANCELLED, REJECTED, UNPAID, FAILED và REFUNDED không vào doanh thu. REJECTED + PAID vẫn là khoản cần hoàn; không được cộng doanh thu.
- Tỷ lệ hủy = `(CANCELLED + REJECTED) / tất cả đơn tạo trong kỳ × 100`; không có đơn thì 0%.
- Khách hàng mới = tài khoản CUSTOMER được tạo trong kỳ; tổng khách là tổng tài khoản CUSTOMER hiện có, kể cả khóa. So sánh với kỳ liền trước có cùng số ngày.
- Tuần bắt đầu thứ Hai; bucket đầu/cuối chỉ tổng hợp phần nằm trong bộ lọc. Ngày/tuần/tháng/năm không phát sinh được điền 0.
- Top món/danh mục dùng số lượng và tiền dòng món trong các đơn đủ điều kiện. Tên món là snapshot lúc đặt, nên một món được đổi tên có thể xuất hiện thành nhiều dòng thống kê theo tên đã bán.
- Danh mục được snapshot bằng trigger cho đơn mới sau V5. Đơn cũ chưa lưu được gộp “Chưa lưu danh mục”; không đoán hoặc sửa dữ liệu lịch sử. Món không thuộc nhóm cũng nằm trong nhóm này.
- Món bán chậm liệt kê tối đa 10 món chưa xóa, được duyệt và đã tồn tại trước cuối kỳ, sắp theo số phần bán trong kỳ; gồm món bán 0 phần. Đây không phải dự báo tồn kho.
- Mục “Cần xử lý” là số hiện tại trên toàn hệ thống, không áp dụng bộ lọc ngày.

## Migration trên database hiện có

Migration: `backend/database/migrations/V5__admin.sql`. Bổ sung vai trò STAFF, cột hiển thị danh mục, snapshot danh mục, index, bảng lịch sử đơn và nhật ký; không xóa dữ liệu hiện có. Có thể chạy lại. Phải chạy V5 **trước khi khởi động mã mới** vì `ddl-auto=none`.

Từ thư mục gốc, mở MariaDB CLI với tài khoản có quyền ALTER/CREATE/TRIGGER:

```text
mariadb --host=127.0.0.1 --port=3306 --user=root -p --default-character-set=utf8mb4 thunderfood
```

Trong MariaDB CLI:

```sql
SOURCE backend/database/migrations/V5__admin.sql;
```

Nếu CLI không nằm trong PATH, dùng đường dẫn cài đặt MariaDB. Hãy sao lưu database theo quy trình đang dùng trước khi áp dụng thay đổi schema. **Không import lại file v4 vào database hiện có**: v4 có DROP DATABASE. V5 không tạo lại lịch sử trạng thái trước thời điểm migration.

Với Docker có volume dữ liệu cũ, nạp riêng V5 rồi rebuild:

```text
docker compose cp backend/database/migrations/V5__admin.sql db:/tmp/V5__admin.sql
docker compose exec db mariadb -uroot -p --default-character-set=utf8mb4 thunderfood
```

Trong CLI container: `SOURCE /tmp/V5__admin.sql;`, thoát CLI và chạy `docker compose up -d --build`. Với volume mới, compose tự chạy v4 rồi V5. Không dùng `docker compose down -v` để cập nhật.

## Khởi động và tài khoản

Backend đọc `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`; các biến Spring chuẩn `SPRING_DATASOURCE_*` vẫn có thể ghi đè. Đã bỏ mật khẩu máy cá nhân khỏi `application.properties`. Không lưu mật khẩu thật vào source.

Ví dụ PowerShell tại thư mục gốc, với JDK 21/Maven trong PATH:

```powershell
$dbSecret = Read-Host 'Mật khẩu MariaDB' -AsSecureString
$env:DB_PASSWORD = [System.Net.NetworkCredential]::new('', $dbSecret).Password
$env:DB_URL = 'jdbc:mariadb://127.0.0.1:3306/thunderfood'
$env:DB_USERNAME = 'root'
cd backend
mvn spring-boot:run
```

Ở terminal khác:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Truy cập **http://localhost:5173/login** rồi **http://localhost:5173/admin**. Trang chính: `/admin/orders`, `/admin/catalog`, `/admin/users`, `/admin/restaurants`, `/admin/review-reports`, `/admin/complaints`, `/admin/stores`, `/admin/activity`.

Trên database **mẫu v4**, tài khoản có sẵn `admin@thunderfood.vn` / `123456`. Migration không tạo, không đổi mật khẩu admin trên database hiện có. Chỉ dùng mật khẩu mẫu trong môi trường demo cách ly. Để tạo tài khoản vận hành, đăng nhập ADMIN → Người dùng & quyền → Tạo tài khoản nội bộ, tự chọn mật khẩu 12–72 ký tự (tối đa 72 byte UTF-8), bàn giao qua kênh riêng. Mật khẩu được băm BCrypt; không xuất hiện trong nhật ký.

## Kiểm thử và bàn giao mã

Các lệnh:

```text
cd backend
mvn test
mvn package
cd ../frontend
npm.cmd run build
```

Kiểm thử tích hợp chỉ dành cho MariaDB riêng trong `.test-runtime/mariadb`, cổng 13317 và backend cổng 18081, thông tin thử nghiệm theo README và `backend/tests/customer_features_smoke.py`. Backend thử nghiệm dùng `APP_UPLOAD_DIR` trỏ `.test-runtime/uploads`. Các script kiểm tra `@@port`/`@@datadir` trước khi reset database riêng; **không trỏ vào database làm việc**. Chạy tuần tự, vì mỗi script nạp lại fixture riêng:

```text
python backend/tests/customer_features_smoke.py --reset-disposable-db
python backend/tests/order_payment_smoke.py --reset-disposable-db
python backend/tests/admin_smoke.py --reset-disposable-db
```

Vite hỗ trợ `VITE_API_PROXY=http://127.0.0.1:18081` để mở giao diện với backend kiểm thử. Mặc định vẫn proxy tới 8080.

Kết quả đã quan sát:

- 13 unit test: 7 AdminRulesTest và 6 VietQrUtilTest đều đạt.
- Bộ tích hợp giỏ hàng/đánh giá: 25 nhóm kiểm tra đạt.
- Bộ tích hợp đặt hàng/thanh toán: toàn bộ nhóm kiểm tra đạt, gồm tranh chấp đồng thời và SSE.
- Bộ tích hợp admin mới nhất: **13 nhóm kiểm tra đạt**, gồm xác thực/CSRF/phân quyền, thống kê tiền/CSV, CRUD/snapshot, upload PNG hợp lệ và file bị từ chối, cấu hình/khiếu nại, thu hồi phiên/đăng xuất, tranh chấp đồng thời của đơn và duyệt quán/nhật ký.
- Frontend production build thành công; backend đã compile/test và đóng gói JAR thành công. Có lần package thất bại vì JAR bị backend thử nghiệm trên Windows giữ; đã dừng đúng tiến trình thử nghiệm và đóng gói lại thành công.
- Chưa xác minh trực quan toàn bộ responsive, contrast đo trên trình duyệt, keyboard và thao tác UI end-to-end; không coi build/API test là browser test.

Thành phần chính:

- Backend: `AdminController`, `AdminQueryService`, `AdminManagementService`, `AdminAuditService`, `AdminRequests`, `LiveAccountFilter`, `SecurityConfig`.
- Tái sử dụng và mở rộng: `OrderService` dùng chung state machine; `RestaurantReviewService`, `CustomerReviewService`; danh mục công khai và giỏ kiểm tra trạng thái ẩn.
- Frontend: `pages/admin/Admin*`, danh sách/chi tiết duyệt quán, `api/adminApi.js`, `styles/admin.css`, routing, sidebar theo quyền; tái sử dụng form/modal và các component đơn hàng.
- Migration, Docker init, unit/integration tests và cấu hình DB theo biến môi trường.

Giả định: ThunderFood là nền tảng nhiều quán; phí giao theo quán; nhân viên vận hành được xử lý đơn và thực đơn nhưng xác nhận tiền ngân hàng cần ADMIN hoặc chủ quán theo luồng sẵn có. Tất cả xác nhận/hoàn tiền VietQR là ghi nhận đối soát thủ công; chưa có tích hợp ngân hàng, webhook hoặc tự động chuyển/hoàn tiền. Không có hoàn tiền một phần hay hoàn đơn COMPLETED trong nghiệp vụ hiện tại.

Nguồn đối chiếu cơ chế filter/phân quyền: [Spring Security 6.5 — Authorize HTTP Requests](https://docs.spring.io/spring-security/reference/6.5/servlet/authorization/authorize-http-requests.html).
