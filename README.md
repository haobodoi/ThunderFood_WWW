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

1. **Tạo CSDL:** chạy `backend/database/thunderfood_mariadb.sql` trong HeidiSQL/DBeaver.
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
