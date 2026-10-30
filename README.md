# ThunderFood – Website đặt đồ ăn trực tuyến (Nhóm 12)

Backend dùng **Spring Boot 3.5.6 (Java 21) + Spring Security + Spring Data JPA + MariaDB**, frontend dùng **React 18 + Vite**.

Đã có:
- **Tài khoản:** đăng ký, đăng nhập (email hoặc số điện thoại), đăng xuất, phân quyền theo 3 vai trò.
- **Đăng ký quán cho đối tác:** quy trình 5 bước giống ShopeeFood, lưu nháp theo từng bước.
- **Duyệt quán cho Admin:** duyệt hoặc từ chối hồ sơ kèm lý do.

```
ThunderFood/
├── backend/                               # Spring Boot REST API – cổng 8080
│   ├── database/thunderfood_mariadb.sql   # Tạo CSDL + dữ liệu mẫu (mật khẩu demo: 123456)
│   └── src/main/java/vn/edu/iuh/fit/thunderfood/
│       ├── config/       SecurityConfig, WebConfig (phục vụ ảnh công khai /uploads/public/**)
│       ├── controller/   AuthController, PartnerRestaurantController, AdminRestaurantController,
│       │                 FileController, MetaController
│       ├── dto/          RegisterRequestDto, UserResponseDto, AuthStatusDto, UserDetailsDto, ApiErrorDto,
│       │                 RestaurantBasicDto, RestaurantRepresentativeDto, RestaurantBankDto, RestaurantDetailsDto,
│       │                 OpeningHourDto, RestaurantRegistrationDto, RestaurantSummaryDto, TagDto, ...
│       ├── entity/       UserEntity, RoleEntity, RestaurantEntity, OpeningHourEntity, TagEntity
│       ├── enums/        AccountStatusEnum, RoleCodeEnum, AccountTypeEnum, RestaurantStatusEnum,
│       │                 BusinessTypeEnum, TagTypeEnum, UploadKindEnum
│       ├── exception/    FieldValidationException, BusinessException, ResourceNotFoundException
│       ├── handler/      GlobalExceptionHandler, SecurityHandler (trả JSON thay vì redirect)
│       ├── repository/   UserRepository, RoleRepository, RestaurantRepository, TagRepository
│       ├── service/      MyUserDetailsService, AuthService, RestaurantRegistrationService,
│       │                 RestaurantReviewService, FileStorageService, MetaService
│       └── util/         InputNormalizerUtil, ProvinceUtil (34 tỉnh/thành sau 01/07/2025)
└── frontend/                              # React + Vite – cổng 5173
    └── src/
        ├── api/          baseApi (axios + cookie + CSRF), authApi, partnerRestaurantApi,
        │                 adminRestaurantApi, fileApi, metaApi
        ├── components/   Navbar, Stepper, FormRow, ImageUpload, ChipSelect, OpeningHoursEditor,
        │                 RestaurantSummary, StatusBadge, Modal, ...
        ├── context/      AuthContext
        ├── hooks/        useRegistrationOptions
        ├── layouts/      PublicLayout, DashboardLayout
        ├── routes/       ProtectedRoute, GuestRoute
        ├── utils/        roleUtils, restaurantUtils, bankUtils
        └── pages/        HomePage, LoginPage, RegisterPage, customer/CustomerHomePage,
                          partner/MyRestaurantsPage, partner/RestaurantRegisterPage, partner/steps/*Step,
                          admin/AdminHomePage, admin/RestaurantReviewListPage, admin/RestaurantReviewDetailPage
```

## Chạy project

**Yêu cầu:** JDK 21, Maven (hoặc IntelliJ), Node.js 18+, MariaDB 10.6+.

1. **Tạo CSDL:** chạy `backend/database/thunderfood_mariadb_v4.sql` trong HeidiSQL/DBeaver (bản hiện tại có giỏ hàng và đánh giá).
   ⚠️ File bắt đầu bằng `DROP DATABASE IF EXISTS thunderfood` nên mỗi lần chạy sẽ xóa và tạo lại toàn bộ dữ liệu.
2. **Backend:** sửa user/mật khẩu MariaDB trong `backend/src/main/resources/application.properties` (mặc định `root` / `123456`), rồi chạy `ThunderFoodApplication`.
   Ảnh tải lên được lưu trong thư mục `uploads/`, nằm trong thư mục làm việc của backend.
3. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. Mở **http://localhost:5173**. Vite chuyển tiếp `/api` và `/uploads` sang cổng 8080.

## Tài khoản demo (mật khẩu `123456`)

| Email | Vai trò | Dữ liệu mẫu |
|---|---|---|
| admin@thunderfood.vn | ADMIN | Có 1 hồ sơ quán đang chờ duyệt |
| partner@example.com | RESTAURANT_PARTNER | 1 quán đã duyệt + 1 hồ sơ nháp |
| partner.pending@example.com | RESTAURANT_PARTNER | 1 hồ sơ đang chờ duyệt |
| customer@example.com | CUSTOMER | |
| customer.locked@example.com | CUSTOMER | Bị khóa, báo lỗi kèm lý do |

## Quy trình đăng ký quán (Đối tác)

1. Đối tác tạo tài khoản ở `/register` (chỉ tạo tài khoản), đăng nhập, rồi vào **Kênh đối tác → Đăng ký quán mới**.
2. Điền 5 bước. Mỗi bước bấm **Lưu & tiếp tục** sẽ lưu nháp vào CSDL, nên có thể thoát ra và quay lại làm tiếp.
   - **Bước 1 – Thông tin quán cơ bản:**
     - Tên quán gồm 3 phần (*Tên quán - Món đặc trưng - Tên đường*).
     - Số điện thoại liên hệ.
     - Địa chỉ gồm Tỉnh/Thành phố, Phường/Xã, Số nhà và đường (theo mô hình 2 cấp).
   - **Bước 2 – Người đại diện:**
     - Đăng ký dưới danh nghĩa Cá nhân, Hộ kinh doanh hoặc Doanh nghiệp. Hộ kinh doanh/Doanh nghiệp phải nhập thêm tên, mã số thuế và ảnh giấy phép.
     - Họ tên, email, số điện thoại.
     - CMND/CCCD/Hộ chiếu: số, ngày cấp, nơi cấp, ảnh mặt trước và mặt sau.
   - **Bước 3 – Ngân hàng:** ngân hàng, chi nhánh, số tài khoản, chủ tài khoản. Tên chủ tài khoản phải trùng với tên người đại diện (so sánh không dấu, không phân biệt hoa thường).
   - **Bước 4 – Chi tiết:**
     - Giờ mở cửa theo từng thứ, có công tắc bật/tắt và tối đa 3 khung giờ mỗi ngày.
     - Ảnh đại diện và ảnh mặt tiền (tối đa 1MB).
     - Loại hình dịch vụ (tối đa 2), ẩm thực (tối đa 3), mô tả.
   - **Bước 5 – Xác nhận:** xem lại toàn bộ thông tin (có nút Sửa từng phần), tick cam kết rồi **Gửi đăng ký**.
3. Trang **Đăng ký quán** có 2 tab:
   - **Quán của tôi:** các quán đã duyệt.
   - **Đăng ký quán:** hồ sơ nháp, chờ duyệt hoặc bị từ chối, kèm thanh tiến độ và trạng thái.
4. Admin vào **Duyệt quán**, xem hồ sơ (bao gồm ảnh CCCD) rồi **Duyệt** hoặc **Từ chối kèm lý do**. Hồ sơ bị từ chối được mở lại để đối tác sửa và gửi lại.

Trạng thái quán: `DRAFT` (đang soạn) → `PENDING` (chờ duyệt) → `APPROVED` (đang hoạt động) hoặc `REJECTED` (bị từ chối, sửa rồi gửi lại). Ngoài ra có `LOCKED` (bị khóa).

**Bảo mật ảnh:**
- Ảnh CCCD và giấy phép kinh doanh lưu ở `uploads/private/`. Chỉ chủ hồ sơ hoặc Admin xem được, qua `/api/files/private/...`.
- Ảnh đại diện và ảnh mặt tiền lưu ở `uploads/public/`.
- Backend kiểm tra dung lượng (≤ 1MB) và định dạng thật của file (JPG/PNG/WEBP), không chỉ dựa vào đuôi file.

## API

| API | Quyền | Mô tả |
|---|---|---|
| `GET /api/auth/csrf` · `GET /api/auth/me` | Mọi người | Cookie CSRF · phiên hiện tại |
| `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` | | Tài khoản |
| `GET /api/meta/registration-options` | Đã đăng nhập | Tỉnh/thành, loại hình dịch vụ, ẩm thực |
| `GET/POST /api/partner/restaurants` | RESTAURANT_PARTNER | Danh sách hồ sơ · tạo hồ sơ (bước 1) |
| `GET/DELETE /api/partner/restaurants/{id}` | RESTAURANT_PARTNER | Xem · xóa hồ sơ nháp |
| `PUT /api/partner/restaurants/{id}/basic\|representative\|bank\|details` | RESTAURANT_PARTNER | Lưu bước 1–4 |
| `POST /api/partner/restaurants/{id}/submit` | RESTAURANT_PARTNER | Gửi duyệt |
| `POST /api/partner/uploads?kind=AVATAR\|COVER\|ID_FRONT\|ID_BACK\|BUSINESS_LICENSE` | RESTAURANT_PARTNER | Tải ảnh (multipart `file`) |
| `GET /api/files/private/{ownerId}/{file}` | Chủ hồ sơ / ADMIN | Xem ảnh riêng tư |
| `GET /api/admin/restaurants?status=PENDING\|APPROVED\|REJECTED` | ADMIN | Danh sách hồ sơ |
| `GET /api/admin/restaurants/{id}` | ADMIN | Chi tiết hồ sơ |
| `POST /api/admin/restaurants/{id}/approve` · `/reject` (`{reason}`) | ADMIN | Duyệt · từ chối |

Mã lỗi: `400` khi dữ liệu không hợp lệ (có `errors` theo từng trường) hoặc sai quy trình, `401` khi chưa đăng nhập, `403` khi không đủ quyền hoặc lỗi CSRF, `404` khi không tìm thấy (kể cả khi truy cập hồ sơ của người khác).

## Giỏ hàng và đánh giá (schema v4)

- Khách hàng: trang `/customer/cart` lưu giỏ theo từng quán, thêm/tăng/giảm/xóa, ghi chú riêng từng dòng. Giỏ đồng bộ khi reload, đổi thiết bị hoặc quay lại tab. Không có nút đặt hàng/thanh toán.
- Giá và tình trạng phục vụ do server quyết định. Quán phải đang được duyệt, bật phục vụ và nằm trong giờ mở cửa; món phải được duyệt, chưa xóa, còn hàng để thêm/tăng. Món không khả dụng vẫn giữ trong giỏ để giảm/xóa và không tính vào tạm tính món khả dụng.
- Mỗi món tối đa 99 phần cộng tất cả ghi chú, tối đa 50 dòng/giỏ. Ghi chú cùng nội dung sau trim + chuẩn hóa Unicode sẽ gộp dòng; khác ghi chú thì tách dòng.
- Mỗi giỏ có version. Ghi bằng version cũ trả `409 STALE_VERSION`; frontend tải lại, không tự gửi lại thao tác có thể bị nhân đôi.
- Trang quán có đánh giá công khai, thống kê, lọc sao/ảnh, sắp xếp và phân trang. Khách chỉ gửi khi sở hữu đơn COMPLETED trong 30 ngày và chưa từng đánh giá đơn đó. Không thể tự khai “đã mua hàng”. Không tạo đơn giả qua API đánh giá.
- `/customer/reviews`: sửa trong 7 ngày, bổ sung tối đa 5 ảnh JPG/PNG (1MB/ảnh), xóa mềm. Đơn đã có review bị xóa vẫn không được đánh giá lần hai.
- `/partner/reviews`: chỉ chủ quán được tạo/sửa/xóa phản hồi; có thể báo cáo vi phạm, không được xóa review của khách.
- `/admin/review-reports`: xem báo cáo, ẩn/khôi phục review có lý do và lịch sử, ghi kết quả xử lý. Báo cáo không tự động ẩn review. Đánh giá ẩn/xóa không tính vào điểm; ảnh cũng bị chặn truy cập công khai và không cache.
- Tối đa 10 review hoặc 10 báo cáo trong 24 giờ/tài khoản. Backend kiểm tra lại role/trạng thái tài khoản cho mọi thao tác có quyền dù session đã đăng nhập trước đó.

API chính: `/api/customer/carts`, `/api/customer/reviews`, `/api/partner/reviews`, `/api/admin/review-reports`, GET `/api/restaurants/{id}/reviews`. Các thao tác cập nhật cần CSRF như API hiện có. DTO không nhận giá hoặc customerId từ client.

Chi tiết schema và quy tắc: [backend/database/thunderfood_mariadb_v4_NOTES.md](backend/database/thunderfood_mariadb_v4_NOTES.md).

### Kiểm thử tích hợp trên DB riêng

Script `backend/tests/customer_features_smoke.py` dùng Python standard library và MariaDB CLI, chạy qua HTTP API thật. Phải khởi tạo MariaDB riêng tại thư mục `.test-runtime/mariadb`, cổng **13317**, password thử nghiệm `local-test-only`. Không dùng DB làm việc.

Chạy backend với `SPRING_DATASOURCE_URL=jdbc:mariadb://127.0.0.1:13317/thunderfood`, `SPRING_DATASOURCE_PASSWORD=local-test-only`, `APP_UPLOAD_DIR` trỏ vào `.test-runtime/uploads` và `--server.port=18081`. Khởi tạo schema v4 trong instance thử nghiệm trước khi chạy backend lần đầu. Sau đó từ root project:

```bash
python backend/tests/customer_features_smoke.py --reset-disposable-db
```

Script kiểm tra datadir và cổng trước khi reset schema thử nghiệm. Bao gồm kiểm tra xung đột ghi đồng thời, ownership, CSRF, giới hạn số lượng, điều kiện đơn hàng, ảnh và kiểm duyệt. `MARIADB_CLIENT` cho phép cấu hình đường dẫn CLI; script mặc định đường dẫn MariaDB 12.2 trên Windows.
