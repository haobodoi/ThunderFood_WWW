import { BUSINESS_TYPES, DAYS, formatDate, timeLabel } from '../utils/restaurantUtils.js';
import Icon from './Icon.jsx';

function Section({ title, step, onEdit, children }) {
  return (
    <section className="summary__section">
      <div className="summary__head">
        <h3>{title}</h3>
        {onEdit && (
          <button type="button" className="link-btn" onClick={() => onEdit(step)}>
            <Icon name="edit" size={14} />
            Sửa
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div className="summary__row">
      <dt>{label}</dt>
      <dd>{children || <span className="muted">—</span>}</dd>
    </div>
  );
}

function Thumb({ src, label }) {
  if (!src) {
    return (
      <div className="summary__thumb summary__thumb--empty">
        <Icon name="image" size={20} />
        <span>{label}: chưa có ảnh</span>
      </div>
    );
  }
  return (
    <a className="summary__thumb" href={src} target="_blank" rel="noreferrer" title={`Xem ${label}`}>
      <img src={src} alt={label} />
      <span>{label}</span>
    </a>
  );
}

export default function RestaurantSummary({ registration, options, onEdit }) {
  const { basic, representative: rep, bank, details } = registration;
  const tags = [...(options?.serviceTypes ?? []), ...(options?.cuisines ?? [])];
  const tagName = (id) => tags.find((tag) => tag.id === id)?.name ?? `#${id}`;
  const businessLabel = BUSINESS_TYPES.find((type) => type.value === rep.businessType)?.label;
  const isBusiness = rep.businessType && rep.businessType !== 'INDIVIDUAL';

  const hoursByDay = DAYS.map((day) => ({
    ...day,
    slots: details.openingHours.filter((hour) => hour.dayOfWeek === day.value),
  }));

  return (
    <div className="summary">
      <Section title="Thông tin quán - Cơ bản" step={1} onEdit={onEdit}>
        <dl className="summary__list">
          <Row label="Tên quán">{registration.restaurantName}</Row>
          <Row label="Số điện thoại liên hệ">{basic.phone}</Row>
          <Row label="Địa chỉ">{registration.address}</Row>
        </dl>
      </Section>

      <Section title="Thông tin người đại diện" step={2} onEdit={onEdit}>
        <dl className="summary__list">
          <Row label="Đăng ký dưới danh nghĩa">{businessLabel}</Row>
          {isBusiness && <Row label="Tên hộ KD / doanh nghiệp">{rep.businessName}</Row>}
          {isBusiness && <Row label="Mã số thuế">{rep.taxCode}</Row>}
          <Row label="Người đại diện">{rep.repFullName}</Row>
          <Row label="Email">{rep.repEmail}</Row>
          <Row label="Số điện thoại">
            {[rep.repPhone, rep.repPhoneAlt].filter(Boolean).join(' · ')}
          </Row>
          <Row label="CMND/CCCD/Hộ chiếu">{rep.idNumber}</Row>
          <Row label="Ngày cấp / Nơi cấp">
            {[formatDate(rep.idIssuedDate), rep.idIssuedPlace].filter(Boolean).join(' · ')}
          </Row>
        </dl>
        <div className="summary__thumbs">
          <Thumb src={rep.idFrontImage} label="CCCD mặt trước" />
          <Thumb src={rep.idBackImage} label="CCCD mặt sau" />
          {isBusiness && <Thumb src={rep.businessLicenseImage} label="Giấy phép kinh doanh" />}
        </div>
      </Section>

      <Section title="Thông tin ngân hàng" step={3} onEdit={onEdit}>
        <dl className="summary__list">
          <Row label="Ngân hàng">{[bank.bankName, bank.bankBranch].filter(Boolean).join(' – ')}</Row>
          <Row label="Số tài khoản">{bank.bankAccountNumber}</Row>
          <Row label="Chủ tài khoản">{bank.bankAccountHolder}</Row>
        </dl>
      </Section>

      <Section title="Thông tin quán - Chi tiết" step={4} onEdit={onEdit}>
        <dl className="summary__list">
          <Row label="Thời gian mở cửa">
            {details.openingHours.length > 0 && (
              <ul className="summary__hours">
                {hoursByDay.map((day) => (
                  <li key={day.value}>
                    <span>{day.label}</span>
                    <span>
                      {day.slots.length === 0
                        ? 'Đóng cửa'
                        : day.slots.map((s) => `${timeLabel(s.openTime)}–${timeLabel(s.closeTime)}`).join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Row>
          <Row label="Loại hình dịch vụ">{details.serviceTypeIds.map(tagName).join(', ')}</Row>
          <Row label="Ẩm thực">{details.cuisineIds.map(tagName).join(', ')}</Row>
          <Row label="Mô tả">{details.description}</Row>
        </dl>
        <div className="summary__thumbs">
          <Thumb src={details.avatarImage} label="Ảnh đại diện" />
          <Thumb src={details.coverImage} label="Ảnh mặt tiền" />
        </div>
      </Section>
    </div>
  );
}
