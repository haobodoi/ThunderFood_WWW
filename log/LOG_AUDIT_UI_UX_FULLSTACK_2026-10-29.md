# Nhật ký audit UI/UX & logic ThunderFood

Ngày thực hiện: 29/10/2026
Phạm vi: toàn bộ `frontend/src`, luồng công khai trang chủ → khám phá → chi tiết quán → chọn món; audit tĩnh các màn hình đối tác/quản trị; đối chiếu API và service liên quan ở backend.

## 1. Tóm tắt

| Mức độ | Phát hiện | Đã sửa | Còn theo dõi |
| :--- | ---: | ---: | ---: |
| Nghiêm trọng | 0 | 0 | 0 |
| Cao | 1 | 1 | 0 |
| Trung bình | 6 | 6 | 0 |
| Thấp / nợ kỹ thuật | 2 | 0 | 2 |
| **Tổng** | **9** | **7** | **2** |

Không phát hiện lỗi console mức `error`, cuộn ngang ở các viewport đã kiểm tra hoặc lỗi build frontend.

## 2. Phát hiện và thay đổi

### UI/UX công khai

1. **[Cao · Đã sửa] Carousel làm thay đổi chiều cao trang.** Trước sửa, tên quán một dòng tạo card cao `458.47px`, tên Sushi hai dòng tạo card cao `483.16px`; hero và `scrollHeight` cùng tăng khoảng `24.69px`, khiến vị trí đọc bị dịch chuyển. Tiêu đề và mô tả nay có khung hai dòng ổn định; đo lại 8 slide mobile cho cùng card `447.31px`, hero `1055.77px`.
2. **[Trung bình · Đã sửa] Dữ liệu nổi bật bị cắt cứng còn 3 quán.** Carousel nay lấy tối đa 8 quán từ API, đủ đa dạng nhưng không làm điều hướng quá dài.
3. **[Trung bình · Đã sửa] Điều hướng carousel không mở rộng tốt và chu kỳ tự chạy không được đặt lại sau thao tác tay.** Dãy dấu ngắn được thay bằng bộ đếm `vị trí / tổng` cùng progress tuyến tính; nút trước/sau vẫn là button có nhãn truy cập. Chu kỳ 5 giây được khởi động lại sau khi người dùng đổi slide; hover/focus tiếp tục tạm dừng.
4. **[Trung bình · Đã sửa] Metadata “Ẩm thực” xuống dòng ngẫu nhiên.** Flex-wrap tự do được thay bằng grid hai cột `nhãn | giá trị`; dưới 420px chuyển có chủ đích thành hai hàng. Nhãn và giá trị không còn lệch tùy độ dài.
5. **[Trung bình · Đã sửa] Nút đặt lại tìm kiếm món thiếu `type="button"`.** Đã khai báo rõ để không vô tình submit nếu component được đặt trong form về sau.

### Logic thao tác đối tác và quản trị

6. **[Trung bình · Đã sửa] Xóa hồ sơ nháp có thể gửi lặp khi bấm nhiều lần.** Thêm khóa `deleteBusy`, chặn gọi lặp, vô hiệu hóa đóng/hủy/xóa trong khi request chạy và hiện “Đang xóa...”.
7. **[Trung bình · Đã sửa] Dialog từ chối hồ sơ có thể đóng giữa request.** Escape/backdrop/hủy được khóa khi đang xử lý; CTA hiển thị trạng thái tiến trình.

### Nợ kỹ thuật còn theo dõi

8. **[Thấp] React Router 6.28 phát 2 cảnh báo future flag** (`v7_startTransition`, `v7_relativeSplatPath`). Không ảnh hưởng chức năng hiện tại; nên xử lý cùng kế hoạch nâng React Router để có regression test route/redirect.
9. **[Thấp] Chưa có test runner frontend và Maven không có trong PATH của máy kiểm thử.** Build frontend đã chạy; backend được audit tĩnh nhưng không thể chạy `mvn test` trong môi trường hiện tại.

## 3. Kiểm thử đã thực hiện

### Browser / responsive

- Desktop/tablet: trang chủ và chi tiết quán, không overflow ngang.
- Mobile `390 × 844`: trang chủ, 8/8 slide; chi tiết quán; taxonomy; sticky category; card món; modal chi tiết; danh sách chọn món.
- Tìm kiếm hero truyền đúng từ khóa xuống khu khám phá.
- Bộ lọc “Chỉ quán đang mở” cập nhật `aria-pressed`; “Xem tất cả nhà hàng” xóa từ khóa và bộ lọc, trả về 9 quán.
- Modal món mở đúng, CTA thêm món đóng modal, hiện toast và cập nhật danh sách tạm với tổng `60.000 ₫`.
- Console: 0 lỗi, 2 loại cảnh báo nâng phiên bản React Router.

### Tự động / static

- `npm run build`: đạt, 147 modules transformed.
- TasteSkill lint: `0 FAIL`, còn 39 cảnh báo thiết kế cũ (1 backdrop blur, 38 shadow) ngoài phạm vi thay đổi; không phát sinh pattern mới bị cấm.
- `git diff --check`: đạt.
- Kiểm tra inline style: không có `style={` trong `frontend/src`.
- Impeccable detector: lệnh yêu cầu CDP khi dùng `--target`; không có phiên CDP trong môi trường, nên không có kết quả detector hợp lệ.
- `mvn test`: chưa chạy được vì Maven không tồn tại trong PATH.

## 4. File liên quan

- `frontend/src/pages/HomePage.jsx`
- `frontend/src/pages/customer/RestaurantDetailPage.jsx`
- `frontend/src/pages/partner/MyRestaurantsPage.jsx`
- `frontend/src/pages/admin/RestaurantReviewDetailPage.jsx`
- `frontend/src/styles/global.css`
- `DESIGN_SYSTEM.md` (nâng hợp đồng lên 3.4, bổ sung quy tắc carousel ổn định)

Không tạo/xóa dữ liệu nghiệp vụ, không thay backend/API, không xóa file dự án.
