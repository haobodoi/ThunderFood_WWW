export const ORDER_STATUS = {
  PENDING: { label: 'Chờ xác nhận', tone: 'warning', icon: 'clock' },
  CONFIRMED: { label: 'Đã xác nhận', tone: 'neutral', icon: 'checkCircle' },
  PREPARING: { label: 'Đang chế biến', tone: 'neutral', icon: 'utensils' },
  DELIVERING: { label: 'Đang giao', tone: 'neutral', icon: 'mapPin' },
  COMPLETED: { label: 'Hoàn tất', tone: 'success', icon: 'checkCircle' },
  CANCELLED: { label: 'Đã hủy', tone: 'danger', icon: 'xCircle' },
  REJECTED: { label: 'Quán từ chối', tone: 'danger', icon: 'xCircle' },
};

export const PAYMENT_STATUS = {
  UNPAID: { label: 'Chưa thanh toán', tone: 'warning', icon: 'clock' },
  PAID: { label: 'Đã thanh toán', tone: 'success', icon: 'checkCircle' },
  FAILED: { label: 'Không thanh toán', tone: 'neutral', icon: 'xCircle' },
  REFUNDED: { label: 'Đã hoàn tiền', tone: 'neutral', icon: 'bank' },
};

export const PAYMENT_METHOD = { COD: 'Thanh toán khi nhận hàng', ONLINE: 'Chuyển khoản VietQR' };

export const ORDER_PROGRESS = ['PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERING', 'COMPLETED'];

/** Bước tiếp theo quán được thực hiện; khớp với luồng trạng thái ở OrderService. */
export const NEXT_ACTION = {
  CONFIRMED: { status: 'PREPARING', label: 'Bắt đầu chế biến' },
  PREPARING: { status: 'DELIVERING', label: 'Bắt đầu giao hàng' },
  DELIVERING: { status: 'COMPLETED', label: 'Hoàn tất đơn' },
};

export const awaitingTransfer = order =>
  order.paymentMethod === 'ONLINE' && order.orderStatus === 'PENDING' && order.paymentStatus === 'UNPAID';
