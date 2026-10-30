# ThunderFood database v4

## Cách dùng

- File `thunderfood_mariadb_v4.sql` là bản khởi tạo đầy đủ cho MariaDB 10.6+, kế thừa dữ liệu quán, món, tài khoản từ v3.
- **Script có `DROP DATABASE IF EXISTS thunderfood`: chạy sẽ xóa toàn bộ database thunderfood hiện tại.** Sao lưu trước khi import nếu cần giữ dữ liệu.
- Không phải script migration. Không chạy cùng v3; chỉ import v4 cho lần tạo lại DB.
- Giữ tên database `thunderfood` để phù hợp application.properties. Không đổi entity/API hiện có.
- Các bảng orders, order_items, payments, complaints và đơn hoàn tất mẫu được giữ từ v3 để tích hợp về sau. Không triển khai nghiệp vụ tạo đơn/thanh toán trong thay đổi này.
- Bảng reviews cũ được thay bằng customer_reviews. RestaurantReviewService hiện tại vẫn là duyệt hồ sơ quán, không liên quan bảng này.

## Thay đổi và ràng buộc database

| Phần | Thiết kế |
| --- | --- |
| carts | Unique customer_id + restaurant_id; một khách lưu nhiều giỏ quán; version phục vụ optimistic locking |
| cart_items | FK kép bảo đảm món thuộc cùng quán với giỏ; quantity 1–99; note tối đa 300 ký tự; giá tham chiếu không âm |
| Gộp dòng | Unique cart_id + item_id + note; note rỗng dùng chuỗi rỗng, không dùng NULL; collation binary phân biệt nội dung ghi chú |
| customer_reviews | Một review/đơn kể cả đã xóa mềm; FK kép với đơn kiểm tra đúng khách/quán; sao 1–5; nội dung sau trim 10–1000 ký tự |
| review_images | Tối đa 5 slot ảnh/review, thứ tự 1–5, không trùng slot |
| review_replies | Một phản hồi/review; xóa mềm để có thể khôi phục/cập nhật dòng cũ |
| review_reports | Một báo cáo/người/review; khi xử lý xong phải có người xử lý, thời gian, kết quả |
| review_moderation_logs | Lưu admin, trạng thái trước/sau, lý do và thời gian |
| public_customer_reviews | Chỉ review PUBLISHED và chưa xóa; không chứa customer_id, order_id |
| restaurant_rating_summary | AVG sao chưa làm tròn, số review và phân bố sao; tự phản ánh sửa/ẩn/xóa, không lưu bộ đếm dễ lệch |

Giỏ giữ tham chiếu món bằng ON DELETE RESTRICT để không mất dòng âm thầm. Món nên được xóa mềm như entity hiện tại. Không lưu tổng tiền hoặc cờ còn hàng trong giỏ vì đó là dữ liệu thay đổi theo món/quán.

## Quy tắc bắt buộc ở backend khi triển khai

SQL chưa tự thực thi các quy tắc nghiệp vụ sau. Không xem việc import schema là đã hoàn thành các chức năng này.

### Giỏ hàng

1. Lấy user từ session, yêu cầu CUSTOMER đang hoạt động; mọi truy vấn ghi phải kiểm tra chủ giỏ. Không nhận userId/giá từ frontend.
2. Thêm/tăng: quán APPROVED và đang phục vụ theo cờ vận hành cùng giờ mở cửa; món APPROVED, chưa xóa, available. Quán đóng/món hết vẫn cho xem, giảm, xóa.
3. Chuẩn hóa note bằng trim và Unicode NFC trước khi tìm/gộp dòng. Không render HTML từ note.
4. Trong một transaction, khóa dòng carts rồi kiểm tra version; tổng quantity của cùng item qua mọi ghi chú không quá 99, tối đa 50 dòng/giỏ. CHECK quantity hiện chỉ bảo vệ từng dòng.
5. Mỗi thay đổi cart_items phải tăng carts.version và cập nhật carts.updated_at. Gắn @Version ở entity cart và bảo đảm thay đổi collection cũng cập nhật parent; SQL không tự tăng version. Version cũ trả 409.
6. Khi thêm/gộp dòng, lấy giá thật và lưu last_seen_unit_price. Khi GET giỏ, so sánh giá này với giá hiện tại, trả priceChanged; GET không tự ghi đè giá tham chiếu. Có thể cập nhật mốc giá khi khách chủ động sửa dòng hoặc xác nhận giá mới.
7. Tính tiền bằng BigDecimal theo giá hiện tại. Trả trạng thái và lý do không khả dụng từng dòng; chỉ tính món khả dụng vào tạm tính tương ứng, hiển thị rõ các dòng bị loại. Không giữ/trừ tồn kho, không tạo đơn.
8. Phiên đăng xuất chỉ xóa state frontend; giữ giỏ DB. Backend chưa có cơ chế số lượng tồn kho.

### Đánh giá

1. Quyền gửi: khách sở hữu đơn COMPLETED, completed_at hợp lệ, không quá 30 ngày từ lúc hoàn tất, không phải chủ quán. Kiểm tra phía server, không tin cờ verifiedPurchase từ frontend.
2. Khi module đơn hàng chưa có: API chỉ cho gửi nếu thực sự tìm thấy đơn COMPLETED đủ điều kiện trong DB; không có đơn thì danh sách quyền đánh giá rỗng và UI không mở form. Không tạo đơn hoặc giả lập quyền đã mua hàng. FK xác thực danh tính đơn; CustomerReviewService kiểm tra thêm trạng thái COMPLETED và thời hạn.
3. Cho sửa trong 7 ngày từ created_at; không đổi order_id/customer_id/restaurant_id; cập nhật edited_at và version. Khách không được sửa status hoặc tự khôi phục review đã xóa. Quyền xóa mềm có thể thực hiện sau hạn sửa.
4. Review bị ẩn vẫn bị ẩn sau khi khách sửa. Chủ quán chỉ phản hồi review của quán mình, không tự ẩn/xóa review của khách. Kiểm tra ownership cho partner_id.
5. Chỉ admin được đổi trạng thái và xử lý báo cáo. Đổi trạng thái và ghi moderation log trong cùng transaction. Bảng log cần được backend coi là append-only.
6. Báo cáo không tự ẩn review. Không cho tự báo cáo review của chính mình. Hạn chế tần suất gửi và chống spam theo tài khoản.
7. Ảnh: kiểm tra nội dung thật JPG/PNG/WEBP, giới hạn đề xuất 2MB/ảnh, chỉ cho đính kèm file thuộc phiên upload của khách; không tin file_key bất kỳ. Không công khai ảnh của review đã ẩn/xóa qua đường dẫn tĩnh không kiểm soát; phục vụ qua endpoint kiểm tra quyền/trạng thái.
8. Danh sách public phân trang và sort ổn định theo created_at + review_id. Lấy phản hồi/ảnh qua review public. Không trả dữ liệu đơn, email, điện thoại hoặc báo cáo nội bộ.
9. Summary không có dòng thì trả reviewCount=0, averageRating=null; UI hiển thị “Chưa có đánh giá”. Chỉ làm tròn điểm lúc hiển thị.

## Dữ liệu để kiểm tra

- Khách user_id=4 có hai giỏ của quán 1 và 4.
- Giỏ quán 1 có cùng món 1 với hai ghi chú khác nhau và món 3.
- Giá tham chiếu được lấy trực tiếp từ giá món khi seed.
- Giữ một đơn hoàn tất, payment và review mẫu từ v3; thêm phản hồi của đúng chủ quán. Đây là dữ liệu demo, không chứng minh module giao dịch đã hoạt động.
- Không tạo ảnh giả, báo cáo giả hoặc lịch sử admin giả.

```sql
SELECT * FROM carts;
SELECT * FROM cart_items;
SELECT * FROM public_customer_reviews;
SELECT * FROM restaurant_rating_summary;
```

Các ca cần thử khi có MariaDB: thêm món khác quán phải lỗi FK; trùng dòng cùng note phải lỗi unique; quantity=0/100, rating=0/6 phải lỗi CHECK; review sai khách/quán phải lỗi FK; review thứ hai cùng đơn phải lỗi unique; ảnh slot 6 phải lỗi CHECK. Dùng transaction và rollback cho các ca thử. Ẩn/xóa mềm review phải làm summary biến mất; khôi phục phải tính lại tự động.

## Trạng thái kiểm tra

Đã import thành công trên MariaDB 12.2.2 thử nghiệm riêng ở cổng 13317, không thay đổi DB hiện tại. Đã chạy kiểm thử tích hợp qua API Spring Boot cho quyền truy cập, CSRF, cập nhật giỏ đồng thời, giới hạn số lượng, giá thay đổi, giờ mở cửa, quyền đánh giá theo đơn hoàn tất, ảnh, phản hồi, báo cáo và kiểm duyệt. Script tái chạy nằm ở `backend/tests/customer_features_smoke.py`; chỉ chấp nhận DB có datadir chứa `.test-runtime` và cổng 13317.

Các quy tắc service ở trên đã được triển khai trong CartService, CustomerRules, CustomerReviewService và ReviewImageService. Khi chưa có module đơn hàng, khách không có đơn COMPLETED hợp lệ sẽ không được gửi đánh giá; đơn hoàn tất mẫu trong v4 vẫn đủ điều kiện theo cùng một bộ kiểm tra. Ảnh hiện hỗ trợ JPG/PNG tối đa 1MB, được giải mã và mã hóa lại thành PNG, lưu riêng ngoài public uploads.
