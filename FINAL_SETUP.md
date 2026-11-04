# ThunderFood FINAL — cài đặt và thống kê đối tác

## Một file SQL để cài mới

File cần chạy: **`backend/database/thunderfood_final.sql`**.

File đã chứa schema v4, migration quản trị V5, vai trò STAFF, trigger lịch sử đơn/snapshot danh mục và toàn bộ dữ liệu mẫu. Không cần chạy thêm v4 hoặc V5 sau đó. File không có DROP DATABASE, không tự ghi đè DB đang có. Nếu `thunderfood` đã tồn tại, import sẽ dừng ở lệnh CREATE DATABASE; không bật tùy chọn bỏ qua lỗi/`--force`. Với DB đang làm việc, giữ nguyên dữ liệu và chỉ chạy migration V5 nếu chưa có. Muốn thử toàn bộ dữ liệu mẫu, dùng MariaDB riêng hoặc môi trường Docker mới.

Từ thư mục gốc dự án, mở MariaDB CLI:

```text
mariadb --host=127.0.0.1 --port=3306 --user=root -p --default-character-set=utf8mb4
```

Sau khi nhập mật khẩu:

```sql
SOURCE backend/database/thunderfood_final.sql;
```

Hoặc mở file này trong HeidiSQL/DBeaver, chạy toàn bộ script với chế độ dừng khi có lỗi. Nếu cần giữ DB cũ trên cùng server, có thể tạo bản sao của file và đổi các lệnh `CREATE DATABASE thunderfood` / `USE thunderfood` sang một tên mới, rồi trỏ `DB_URL` về tên đó.

## Chạy hệ thống

Cách nhanh với Docker, trên volume mới:

```text
docker compose up -d --build
```

Compose nạp duy nhất `thunderfood_final.sql`; mở **http://localhost:5173**. MariaDB Docker là `127.0.0.1:3307`, root và mật khẩu demo `123456` (hoặc `DB_PASSWORD` nếu bạn cấu hình). Volume cũ được giữ nguyên, compose không tự import thêm 20.000 đơn lên dữ liệu đang có.

Chạy IntelliJ: chọn **Backend** cho DB local; **Backend (DB Docker)** cho DB mẫu cổng 3307. Cấu hình Docker đã có mật khẩu demo phù hợp. Có thể ghi đè cấu hình bằng `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` trong Run Configuration. Backend cần JDK 21.

Hoặc dùng terminal, đặt `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` theo DB của bạn rồi chạy `mvn spring-boot:run` trong `backend`. Trong terminal khác, chạy `npm.cmd install` và `npm.cmd run dev` trong `frontend`. Nhập đúng mật khẩu MariaDB vào cấu hình local; không cần đặt thủ công Hibernate dialect để khắc phục lỗi kết nối.

## Tài khoản demo của bản FINAL

Tất cả tài khoản sau dùng mật khẩu **`123456`**, đã băm BCrypt trong DB. Chỉ dùng trên môi trường demo.

| Email | Quyền / mục đích |
| --- | --- |
| admin@thunderfood.vn | Admin, xem `/admin` |
| staff@thunderfood.vn | Nhân viên vận hành |
| partner@example.com | Đối tác Bình, nhiều quán và dữ liệu hai năm |
| partner.demo@example.com | Đối tác Mai, sở hữu quán 5 và 9, dữ liệu riêng để kiểm tra phân quyền |
| partner.pending@example.com | Đối tác có hồ sơ đang chờ duyệt |
| partner.empty@example.com | Đối tác mới chưa có quán/đơn, kiểm tra trạng thái trống |
| customer@example.com | Khách hàng sẵn có, thử giỏ/đặt món |
| customer0001@demo.thunderfood.test … customer1000@demo.thunderfood.test | 1.000 khách hàng tổng hợp |

Vào **Kênh đối tác → Thống kê kinh doanh**, hoặc **`/partner/statistics`**. Lọc tất cả quán của mình hoặc một quán, từ/đến ngày và nhóm ngày/tuần/tháng/năm; xuất CSV bằng cùng bộ lọc. Dashboard còn có so sánh doanh thu giữa các quán, món/danh mục bán chạy, món bán chậm, thanh toán và việc cần xử lý.

## Dữ liệu mẫu lớn

- 1.008 tài khoản tổng cộng, bao gồm 1.000 khách mới trong bộ dữ liệu.
- 20.001 đơn hàng và 60.002 dòng món, 20.001 bản ghi thanh toán.
- 92.427 bản ghi lịch sử trạng thái được tạo bằng luồng PENDING → CONFIRMED → PREPARING → DELIVERING → COMPLETED, hủy/từ chối và hoàn tiền.
- Hơn 2.000 đánh giá, cùng phản hồi của quán, báo cáo đánh giá và khiếu nại.
- Hai đối tác có quán/doanh thu riêng. Một đối tác không có quán để kiểm tra dữ liệu rỗng.
- Đơn trải khoảng hai năm tính ngược từ **thời điểm import**; mật độ tăng trong 90 ngày gần nhất. Dùng khoảng hai năm và nhóm tháng/năm để kiểm thử tổng hợp; kỳ 30 ngày gần nhất cũng có dữ liệu.
- Có COD/VietQR, đầy đủ trạng thái đơn, PAID/UNPAID/FAILED/REFUNDED. Tổng món bằng tổng dòng, tổng đơn bằng tiền món + phí giao, thanh toán bằng tổng đơn. Món cuối mỗi quán được để bán chậm/chưa bán.
- Các quán demo mở cả ngày để có thể thử đặt món. Lịch mở thực tế ở DB đang dùng không bị thay đổi.

Đây là dữ liệu tổng hợp phục vụ phát triển. Sau import, dashboard vẫn truy vấn dữ liệu thật trong database; frontend không dựng số liệu giả.

## Quy tắc thống kê và phân quyền

Dùng cùng bộ tính toán với admin: chỉ COMPLETED + PAID vào doanh thu món, phí giao tách riêng; AOV gồm phí giao; CANCELLED/REJECTED/REFUNDED không cộng doanh thu. Lọc theo ngày tạo đơn, trạng thái hiện tại, Asia/Ho_Chi_Minh và VND. So sánh kỳ trước có cùng số ngày.

Đối tác đếm số khách **đã đặt đơn trong kỳ tại quán của mình**, không phải số tài khoản mới trên nền tảng. Tổng khách đã đặt là distinct khách trong toàn bộ lịch sử các quán được chọn. ADMIN vẫn đếm khách đăng ký mới theo quy tắc đã ghi trong `ADMIN_HANDOVER.md`.

Backend lấy chủ quán từ phiên đăng nhập, không nhận owner từ client. Mọi phần dữ liệu (KPI, biểu đồ, món/danh mục, đơn mới, tổng từng quán, việc cần xử lý và CSV) đều áp dụng quyền sở hữu. Chọn quán người khác trả 404; tài khoản khách/admin/staff không được gọi API dành riêng cho đối tác. API đọc báo cáo đặt `Cache-Control: no-store`.

API: `GET /api/partner/statistics/dashboard`, `/dashboard/export`, `/restaurants`. Dashboard nhận `from`, `to`, `group`, `restaurantId` tùy chọn; danh sách quán có `q`/`page`.

## Tái tạo SQL và kiểm thử

Để tạo lại file final từ nguồn được bảo trì:

```text
python backend/database/build_final_sql.py
```

Nguồn gồm `thunderfood_mariadb_v4.sql`, `migrations/V5__admin.sql`, `seeds/statistics_demo.sql`. Người cài đặt chỉ cần file `thunderfood_final.sql` đã tạo; không cần Python.

Kiểm thử tích hợp trên DB riêng `.test-runtime/mariadb`, cổng 13317, API 18081, theo hướng dẫn trong `ADMIN_HANDOVER.md`:

```text
python backend/tests/partner_statistics_smoke.py --reset-disposable-db
```

Script kiểm tra datadir/cổng trước khi reset DB thử nghiệm, import duy nhất file final, kiểm tra tổng tiền, lịch sử/snapshot và dữ liệu mẫu; đối chiếu API với SQL cho hai chủ quán, lọc quán, các nhóm kỳ, trạng thái rỗng, CSV, gọi đồng thời và từ chối truy cập chéo. Chạy riêng với các smoke test khác vì mỗi script có fixture và reset DB thử nghiệm riêng.

Giao diện đã qua production build; kiểm thử trực quan responsive/keyboard trong trình duyệt vẫn là phần nghiệm thu riêng, như ghi trong bàn giao trước.

Kết quả chạy trên MariaDB thử nghiệm: import final khoảng 10 giây, đủ 20.001 đơn / 60.002 dòng món / 92.427 lịch sử; **11 nhóm kiểm thử final SQL và thống kê đối tác đạt**. Hai báo cáo hai năm cho hai đối tác hoàn thành khoảng 2 giây tổng cộng trên máy thử nghiệm. Backend build/package và 13 unit test đạt; frontend production build đạt. Đây là phép đo trên dữ liệu demo, không phải cam kết hiệu năng khi triển khai thực tế.
