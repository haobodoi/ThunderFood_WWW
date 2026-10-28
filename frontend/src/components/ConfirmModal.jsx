import React from 'react';
import Modal from './Modal.jsx';
import Icon from './Icon.jsx';

export default function ConfirmModal({
  open,
  title = 'Xác nhận hành động',
  message = 'Bạn có chắc chắn muốn thực hiện thao tác này? Thao tác này không thể hoàn tác.',
  confirmText = 'Xác nhận xóa',
  cancelText = 'Hủy bỏ',
  isDanger = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <Modal open={open} onClose={loading ? undefined : onCancel} title={title}>
      <div className="tf-confirm">
        <div className="tf-confirm__message">
          {isDanger && (
            <div className="tf-confirm__icon">
              <Icon name="alert" size={20} />
            </div>
          )}
          <p>
            {message}
          </p>
        </div>

        <div className="tf-form-actions">
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn btn--sm ${isDanger ? 'btn--danger' : 'btn--primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
