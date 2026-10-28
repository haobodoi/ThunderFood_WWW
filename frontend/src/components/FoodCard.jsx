import Icon from './Icon.jsx';

export function formatVND(amount) {
  if (amount === null || amount === undefined || amount === '') return 'Chưa cập nhật';
  const value = Number(amount);
  return Number.isFinite(value) ? value.toLocaleString('vi-VN') + ' ₫' : 'Giá chưa cập nhật';
}

const APPROVAL_META = {
  APPROVED: { label: 'Đã duyệt', cls: 'status-badge--green' },
  PENDING: { label: 'Chờ duyệt', cls: 'status-badge--amber' },
  REJECTED: { label: 'Từ chối', cls: 'status-badge--red' },
  HIDDEN: { label: 'Đang ẩn', cls: 'status-badge--gray' },
};

export default function FoodCard({
  item, isPartner = false, quantityInCart = 0, orderable = true, onEdit, onDelete,
  onToggleAvailability, toggleLoading = false, onAddToCart, onClick,
}) {
  const isAvailable = Boolean(item.available);
  const imageUrl = item.displayImageUrl !== undefined ? item.displayImageUrl : item.imageUrl;
  const approval = APPROVAL_META[item.approvalStatus] || null;

  const media = imageUrl
    ? <img src={imageUrl} alt="" loading="lazy" />
    : <div className="food-card__placeholder"><Icon name="utensils" size={28} /><span>Chưa có ảnh món</span></div>;

  return (
    <article className={'food-card' + (!isAvailable ? ' food-card--unavailable' : '')}>
      <div className="food-card__media">
        {onClick ? <button type="button" className="food-card__media-button" onClick={onClick}
          aria-label={'Xem chi tiết ' + (item.itemName || 'món ăn')}>{media}</button> : media}
        {!isAvailable && <span className="food-card__soldout-tag">Tạm hết hàng</span>}
        {item.categoryName && <span className="food-card__cat-tag">{item.categoryName}</span>}
      </div>
      <div className="food-card__body">
        <div>
          <h3 className="food-card__title" title={item.itemName}>
            {onClick ? <button type="button" className="food-card__title-button" onClick={onClick}>
              {item.itemName || 'Món ăn'}
            </button> : item.itemName || 'Món ăn'}
          </h3>
          {item.description && <p className="food-card__desc">{item.description}</p>}
        </div>
        {isPartner ? (
          <div className="food-card__partner-footer">
            <div className="food-card__partner-row">
              <span className="food-card__price">{formatVND(item.price)}</span>
              {approval && <span className={'status-badge ' + approval.cls}>{approval.label}</span>}
            </div>
            <div className="food-card__partner-row">
              <button type="button" className="tf-switch" onClick={() => onToggleAvailability?.(item)}
                disabled={toggleLoading}
                aria-label={(isAvailable ? 'Tạm hết ' : 'Mở bán lại ') + (item.itemName || 'món ăn')}
                aria-pressed={isAvailable}>
                <span className={'tf-switch__track' + (isAvailable ? ' is-on' : '')}>
                  <span className="tf-switch__thumb" />
                </span>
                <span className={'tf-switch__label' + (isAvailable ? ' is-on' : '')}>
                  {isAvailable ? 'Còn món' : 'Tạm hết'}
                </span>
              </button>
              <div className="food-card__partner-actions">
                <button type="button" className="btn btn--outline btn--sm food-card__action"
                  onClick={() => onEdit?.(item)} aria-label={'Sửa ' + (item.itemName || 'món ăn')}>
                  <Icon name="edit" size={13} /><span>Sửa</span>
                </button>
                <button type="button" className="icon-btn icon-btn--ghost btn--danger-text food-card__icon-action"
                  onClick={() => onDelete?.(item)} aria-label={'Xóa ' + (item.itemName || 'món ăn')}>
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="food-card__footer">
            <span className="food-card__price">{formatVND(item.price)}</span>
            <button type="button" className={'btn btn--sm food-card__add' + (quantityInCart ? ' btn--outline food-card__add--selected' : ' btn--primary')}
              disabled={!isAvailable || !orderable} onClick={() => onAddToCart?.(item)}>
              <Icon name="plus" size={14} />
              <span>{!isAvailable ? 'Tạm hết' : !orderable ? 'Tạm đóng' : quantityInCart ? 'Đã chọn (' + quantityInCart + ')' : 'Thêm món'}</span>
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
