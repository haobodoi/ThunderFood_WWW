import React, { useState, useEffect } from 'react';
import Modal from './Modal.jsx';
import Alert from './Alert.jsx';

export default function CategoryModal({
  open,
  category = null,
  loading = false,
  error = '',
  onSave,
  onClose,
}) {
  const [name, setName] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [fieldError, setFieldError] = useState('');

  useEffect(() => {
    if (category) {
      setName(category.categoryName || '');
      setDisplayOrder(category.displayOrder ?? 0);
    } else {
      setName('');
      setDisplayOrder(0);
    }
    setFieldError('');
  }, [category, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFieldError('Vui lòng nhập tên nhóm món ăn');
      return;
    }
    onSave({
      categoryName: name.trim(),
      displayOrder: Number(displayOrder) || 0,
    });
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={category ? 'Chỉnh sửa nhóm món ăn' : 'Thêm nhóm món ăn mới'}
    >
      <form onSubmit={handleSubmit} className="tf-menu-item-form">
        {error && <Alert type="error">{error}</Alert>}

        <div className={`field ${fieldError ? 'field--error' : ''}`}>
          <label className="field__label" htmlFor="category-name-input">
            <span className="field__required">*</span>
            Tên nhóm thực đơn
          </label>
          <div className="field__control">
            <input
              id="category-name-input"
              type="text"
              className="field__input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldError) setFieldError('');
              }}
              placeholder="Ví dụ: Cơm trưa, Món chiên, Trà sữa..."
              disabled={loading}
              autoFocus
            />
          </div>
          {fieldError && <p className="field__error">{fieldError}</p>}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="category-order-input">
            Thứ tự hiển thị
          </label>
          <div className="field__control">
            <input
              id="category-order-input"
              type="number"
              min="0"
              className="field__input"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              disabled={loading}
              placeholder="0"
            />
          </div>
          <p className="field__hint">
            Số nhỏ hơn sẽ hiển thị trước trên thực đơn của khách hàng (mặc định 0).
          </p>
        </div>

        <div className="tf-form-actions">
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={onClose}
            disabled={loading}
          >
            Hủy
          </button>
          <button
            type="submit"
            className="btn btn--primary btn--sm"
            disabled={loading}
          >
            {loading ? 'Đang lưu...' : category ? 'Lưu thay đổi' : 'Thêm nhóm món'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
