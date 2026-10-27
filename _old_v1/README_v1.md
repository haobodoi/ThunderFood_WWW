# ThunderFood – Website đặt đồ ăn trực tuyến (Nhóm 12)

Khung project gồm **Spring Boot 3.5.6 (Java 21) + Spring Security + Spring Data JPA + MariaDB** cho backend và **React 18 + Vite** cho frontend. Giai đoạn này đã có: trang chủ, đăng ký, đăng nhập, đăng xuất và 3 màn hình theo vai trò (Khách hàng / Đối tác nhà hàng / Quản trị viên).

```
ThunderFood/
├── database/thunderfood_mariadb.sql   # Tạo CSDL + dữ liệu mẫu (mật khẩu demo: 123456)
├── backend/                           # Spring Boot REST API – cổng 8080
│   └── src/main/java/vn/edu/iuh/fit/thunderfood/
│       ├── config/       SecurityConfig (SecurityFilterChain, BCrypt, formLogin, logout, CSRF)
│       ├── controller/   AuthController, CustomerController, PartnerController, AdminController, GlobalExceptionHandler
│       ├── dto/          RegisterRequest, UserResponse, ...
│       ├── entity/       User, Role, Restaurant, AccountStatus, RestaurantStatus
│       ├── repository/   UserRepository, RoleRepository, RestaurantRepository
│       ├── security/     CustomUserDetails, JsonAuthHandlers (trả JSON thay vì redirect)
│       ├── service/      MyUserDetailsService, AuthService, DashboardService
│       └── util/         InputNormalizer
└── frontend/                          # React + Vite – cổng 5173
    └── src/
        ├── api/          axiosClient (cookie + CSRF), authApi, dashboardApi
        ├── context/      AuthContext (user hiện tại, login, logout, register)
        ├── routes/       ProtectedRoute (chặn theo role), GuestRoute
        ├── components/   Navbar, UserMenu, DashboardLayout, TextField, ...
        └── pages/        HomePage, LoginPage, RegisterPage, customer/, partner/, admin/
```

## Chạy project

**Yêu cầu:** JDK 21, Maven (hoặc IntelliJ), Node.js 18+, MariaDB 10.6+.

1. **Tạo CSDL**: chạy file `database/thunderfood_mariadb.sql` trong HeidiSQL/DBeaver.
   ⚠️ File bắt đầu bằng `DROP DATABASE IF EXISTS thunderfood` nên mỗi lần chạy sẽ xóa và tạo lại toàn bộ dữ liệu.
2. **Backend**: sửa user/mật khẩu MariaDB trong `backend/src/main/resources/application.properties` (mặc định `root` / `123456`), rồi chạy `ThunderFoodApplication` trong IntelliJ hoặc:
   ```bash
   cd backend
   mvn spring-boot:run
   ```
3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. Mở **http://localhost:5173**. Luôn mở qua cổng 5173: Vite chuyển tiếp `/api` sang `localhost:8080`, nên cookie đăng nhập và cookie CSRF hoạt động mà không cần cấu hình CORS.

## Tài khoản demo (mật khẩu `123456`)

| Email | SĐT | Vai trò | Ghi chú |
|---|---|---|---|
| admin@thunderfood.vn | 0900000001 | ADMIN | Vào `/admin` |
| partner@example.com | 0900000002 | RESTAURANT_PARTNER | Nhà hàng đã duyệt → `/partner` |
| partner.pending@example.com | 0900000003 | RESTAURANT_PARTNER | Nhà hàng chờ duyệt |
| customer@example.com | 0900000004 | CUSTOMER | Vào `/customer` |
| customer.locked@example.com | 0900000005 | CUSTOMER | Bị khóa → báo lỗi kèm lý do |

Khi chạy `npm run dev`, trang đăng nhập có sẵn các nút điền nhanh những tài khoản này. Bản build production sẽ không hiển thị các nút đó.

## Luồng đăng nhập (đúng kiến thức Spring Security tuần 08–09)

- **Đăng nhập**: dùng `formLogin` của Spring Security với `loginProcessingUrl("/api/auth/login")`. React gửi form `username` + `password`, trong đó `username` là **email hoặc số điện thoại**.
  Luồng xử lý: `UsernamePasswordAuthenticationFilter` → `AuthenticationManager` → `DaoAuthenticationProvider` → `MyUserDetailsService` (đọc bảng `users` + `roles`) → so khớp BCrypt → lưu `SecurityContext` vào session (cookie `JSESSIONID`, HttpOnly).
- **Phân quyền**: role lưu trong bảng `roles` (`CUSTOMER`, `RESTAURANT_PARTNER`, `ADMIN`) và được chuyển thành `ROLE_xxx`.
  - Backend chặn theo URL bằng `hasRole(...)` trong `SecurityConfig`, và chặn thêm trên controller bằng `@PreAuthorize`.
  - Frontend dùng `ProtectedRoute` chặn theo `user.role`. Đây chỉ là để hiển thị, bảo mật thật nằm ở backend.
- **Tài khoản bị khóa**: chỉ báo "bị khóa" (kèm `lock_reason`) **sau khi nhập đúng mật khẩu**. Nhờ vậy người khác không dò được tài khoản nào đang bị khóa.
- **CSRF vẫn bật** (theo bài học): token nằm trong cookie `XSRF-TOKEN`, axios tự gửi lại qua header `X-XSRF-TOKEN`. Nếu token hết hạn, client tự lấy token mới và gửi lại request một lần.
- **Đăng ký**: chỉ được chọn Khách hàng hoặc Đối tác (không tự đăng ký Admin).
  - Đối tác phải nhập thêm thông tin nhà hàng. Hệ thống tạo nhà hàng ở trạng thái `PENDING` để chờ Admin duyệt.
  - Dữ liệu được kiểm tra ở cả frontend lẫn backend (Bean Validation, trùng email/SĐT, mật khẩu nhập lại).
- **Đăng xuất**: `POST /api/auth/logout` hủy session, xóa cookie, rồi quay về trang chủ.

| API | Quyền | Mô tả |
|---|---|---|
| `GET /api/auth/csrf` | Mọi người | Lấy/tạo cookie CSRF |
| `GET /api/auth/me` | Mọi người | `{authenticated, user}`: kiểm tra phiên hiện tại |
| `POST /api/auth/register` | Mọi người | Đăng ký (JSON) |
| `POST /api/auth/login` | Mọi người | Đăng nhập (form: `username`, `password`) |
| `POST /api/auth/logout` | Đã đăng nhập | Đăng xuất |
| `GET /api/customer/dashboard` | CUSTOMER | Dữ liệu màn hình khách hàng |
| `GET /api/partner/dashboard` | RESTAURANT_PARTNER | Trạng thái nhà hàng của đối tác |
| `GET /api/admin/dashboard` | ADMIN | Số liệu tổng quan |

Mã lỗi trả về: `401` khi chưa đăng nhập hoặc sai thông tin, `403` khi không đủ quyền hoặc lỗi CSRF, `400` khi dữ liệu không hợp lệ (có `errors` theo từng trường).
