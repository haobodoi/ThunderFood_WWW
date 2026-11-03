package vn.edu.iuh.fit.thunderfood.exception;

public class ConcurrentUpdateException extends RuntimeException {
    public ConcurrentUpdateException() { super("Dữ liệu vừa thay đổi ở phiên khác. Vui lòng tải lại và thử lại."); }
}
