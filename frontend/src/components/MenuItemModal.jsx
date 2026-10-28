import React, { useState, useEffect } from 'react';
import Modal from './Modal.jsx';
import Alert from './Alert.jsx';
import Icon from './Icon.jsx';
import { fileApi } from '../api/fileApi.js';
import { getErrorMessage } from '../api/baseApi.js';

export default function MenuItemModal({
  open,
  item = null,
  categories = [],
  loading = false,
  error = '',
  onSave,
  onClose,
}) {
  const [itemName, setItemName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [available, setAvailable] = useState(true);

  const [fieldErrors, setFieldErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (item) {
      setItemName(item.itemName || '');
      setCategoryId(item.categoryId ? String(item.categoryId) : '');
      setPrice(item.price != null ? String(item.price) : '');
      setDescription(item.description || '');
      setImageUrl(item.imageUrl || '');
      setAvailable(item.available ?? true);
    } else {
      setItemName('');
      setCategoryId(categories.length > 0 ? String(categories[0].id) : '');
      setPrice('');
      setDescription('');
      setImageUrl('');
      setAvailable(true);
    }
    setFieldErrors({});
    setUploadError('');
  }, [item, open, categories]);

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setUploadError('Ảnh không được vượt quá 1MB.');
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      const res = await fileApi.upload(file, 'FOOD_IMAGE');
      setImageUrl(res.url);
    } catch (err) {
      setUploadError(getErrorMessage(err, 'Tải ảnh thất bại.'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = {};
    if (!itemName.trim()) {
      errors.itemName = 'Vui lòng nhập tên món ăn';
    }
    if (!price || isNaN(Number(price)) || Number(price) < 0) {
      errors.price = 'Vui lòng nhập giá bán hợp lệ (≥ 0 ₫)';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    onSave({
      itemName: itemName.trim(),
      categoryId: categoryId ? Number(categoryId) : null,
      price: Number(price),
      description: description.trim() || null,
      imageUrl: imageUrl.trim() || null,
      available: Boolean(available),
    });
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={loading || uploading ? undefined : onClose}
      title={item ? 'Chỉnh sửa món ăn' : 'Thêm món ăn mới vào thực đơn'}
    >
      <form onSubmit={handleSubmit} className="tf-menu-item-form">
        {error && <Alert type="error">{error}</Alert>}
        {uploadError && <Alert type="error">{uploadError}</Alert>}

        {/* Tên Món Ăn */}
        <div className={`field ${fieldErrors.itemName ? 'field--error' : ''}`}>
          <label className="field__label" htmlFor="menu-item-name">
            <span className="field__required">*</span>
            Tên món ăn
          </label>
          <div className="field__control">
            <input
              id="menu-item-name"
              name="itemName"
              type="text"
              className="field__input"
              value={itemName}
              onChange={(e) => {
                setItemName(e.target.value);
                if (fieldErrors.itemName) setFieldErrors({ ...fieldErrors, itemName: '' });
              }}
              placeholder="Ví dụ: Cơm gà nướng sốt cay, Trà đào cam sả..."
              disabled={loading}
              autoFocus
            />
          </div>
          {fieldErrors.itemName && <p className="field__error">{fieldErrors.itemName}</p>}
        </div>

        {/* Nhóm Danh Mục & Giá Tiền (2 Cột cân đối) */}
        <div className="tf-menu-item-form__row">
          <div className="field">
            <label className="field__label" htmlFor="menu-item-category">
              Nhóm thực đơn
            </label>
            <div className="field__control">
              <select
                id="menu-item-category"
                name="categoryId"
                className="field__input"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Chưa phân nhóm --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.categoryName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={`field ${fieldErrors.price ? 'field--error' : ''}`}>
            <label className="field__label" htmlFor="menu-item-price">
              <span className="field__required">*</span>
              Giá bán
            </label>
            <div className="field__control tf-menu-item-form__price">
              <input
                id="menu-item-price"
                name="price"
                type="number"
                min="0"
                step="1000"
                className="field__input tf-menu-item-form__price-input"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (fieldErrors.price) setFieldErrors({ ...fieldErrors, price: '' });
                }}
                placeholder="45000"
                disabled={loading}
              />
              <span className="tf-menu-item-form__currency">
                ₫
              </span>
            </div>
            {fieldErrors.price && <p className="field__error">{fieldErrors.price}</p>}
          </div>
        </div>

        {/* Mô Tả Món */}
        <div className="field">
          <label className="field__label" htmlFor="menu-item-desc">
            Mô tả món ăn <span className="field__optional">(tùy chọn)</span>
          </label>
          <div className="field__control">
            <textarea
              id="menu-item-desc"
              name="description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Thành phần, độ cay, hương vị đặc sắc..."
              disabled={loading}
              className="field__input tf-menu-item-form__description"
            />
          </div>
        </div>

        {/* Hình Ảnh Món Ăn */}
        <div className="field">
          <label className="field__label">Hình ảnh món ăn</label>
          <div className="tf-menu-item-form__image-row">
            <div className="tf-menu-item-form__preview">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Xem trước"
                  className="tf-menu-item-form__preview-img"
                />
              ) : (
                <div className="tf-menu-item-form__preview-empty">
                  <Icon name="image" size={22} />
                  <div>Chưa có</div>
                </div>
              )}
            </div>

            <div className="tf-menu-item-form__upload">
              <div className="tf-menu-item-form__upload-actions">
                <label
                  className={'btn btn--outline btn--sm tf-menu-item-form__file-label' + (uploading || loading ? ' is-disabled' : '')}
                >
                  <Icon name="image" size={15} />
                  <span>{uploading ? 'Đang tải lên...' : 'Chọn file ảnh'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageFileChange}
                    disabled={uploading || loading}
                    className="tf-visually-hidden"
                  />
                </label>

                {imageUrl && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm btn--danger-text"
                    onClick={() => setImageUrl('')}
                    disabled={uploading || loading}
                  >
                    Xóa ảnh
                  </button>
                )}
              </div>

              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Hoặc dán URL ảnh trực tiếp..."
                disabled={uploading || loading}
                className="field__input tf-menu-item-form__url"
              />
              <span className="tf-menu-item-form__hint">
                JPG, PNG, WEBP (tối đa 1MB).
              </span>
            </div>
          </div>
        </div>

        {/* Trạng Thái Còn Món / Hết Món */}
        <div className="tf-menu-item-form__status">
          <div>
            <div className="tf-menu-item-form__status-title">
              Trạng thái phục vụ
            </div>
            <div className="tf-menu-item-form__status-hint">
              {available ? 'Món đang sẵn sàng nhận đơn' : 'Món đang tạm hết, khách không thể chọn'}
            </div>
          </div>

          <button
            type="button"
            className="tf-switch"
            onClick={() => setAvailable(!available)}
            aria-pressed={available}
            disabled={loading}
          >
            <span className={`tf-switch__track ${available ? 'is-on' : ''}`}>
              <span className="tf-switch__thumb" />
            </span>
            <span className={`tf-switch__label ${available ? 'is-on' : ''}`}>
              {available ? 'Còn món' : 'Tạm hết'}
            </span>
          </button>
        </div>

        {/* Footer Modal */}
        <div className="tf-form-actions">
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={onClose}
            disabled={loading || uploading}
          >
            Hủy
          </button>
          <button
            type="submit"
            className="btn btn--primary btn--sm"
            disabled={loading || uploading}
          >
            {loading ? 'Đang lưu món...' : item ? 'Lưu thay đổi' : 'Thêm vào thực đơn'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
