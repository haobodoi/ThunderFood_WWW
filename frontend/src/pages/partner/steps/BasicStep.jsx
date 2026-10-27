import { useState } from 'react';
import { partnerRestaurantApi } from '../../../api/partnerRestaurantApi.js';
import { getErrorMessage, getFieldErrors } from '../../../api/baseApi.js';
import { CONTACT_PHONE_REGEX, buildRestaurantName, normalizePhone } from '../../../utils/restaurantUtils.js';
import FormRow from '../../../components/FormRow.jsx';
import Alert from '../../../components/Alert.jsx';
import Icon from '../../../components/Icon.jsx';

function validate(form, provinces) {
  const errors = {};
  if (!form.brandName.trim()) errors.brandName = 'Vui lòng nhập tên quán';
  else if (form.brandName.trim().length > 60) errors.brandName = 'Tên quán tối đa 60 ký tự';
  if (form.specialty.trim().length > 60) errors.specialty = 'Món đặc trưng tối đa 60 ký tự';
  if (form.areaName.trim().length > 60) errors.areaName = 'Tên đường/khu vực tối đa 60 ký tự';
  const phone = normalizePhone(form.phone);
  if (!phone) errors.phone = 'Vui lòng nhập số điện thoại liên hệ';
  else if (!CONTACT_PHONE_REGEX.test(phone)) errors.phone = 'Số điện thoại gồm 10–11 chữ số và bắt đầu bằng 0';
  if (!form.province) errors.province = 'Vui lòng chọn tỉnh/thành phố';
  else if (provinces.length && !provinces.includes(form.province)) errors.province = 'Tỉnh/thành phố không hợp lệ';
  if (!form.ward.trim()) errors.ward = 'Vui lòng nhập phường/xã';
  if (!form.streetAddress.trim()) errors.streetAddress = 'Vui lòng nhập số nhà và tên đường';
  return errors;
}

export default function BasicStep({ registration, options, onSaved }) {
  const basic = registration?.basic;
  const provinces = options?.provinces ?? [];
  const [form, setForm] = useState({
    brandName: basic?.brandName ?? '',
    specialty: basic?.specialty ?? '',
    areaName: basic?.areaName ?? '',
    phone: basic?.phone ?? '',
    province: basic?.province ?? '',
    ward: basic?.ward ?? '',
    streetAddress: basic?.streetAddress ?? '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const bind = (name) => ({
    id: name,
    name,
    value: form[name],
    onChange: (e) => {
      const { value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    },
    className: 'field__input',
    'aria-invalid': Boolean(errors[name]),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');
    const nextErrors = validate(form, provinces);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = {
      brandName: form.brandName.trim(),
      specialty: form.specialty.trim(),
      areaName: form.areaName.trim(),
      phone: normalizePhone(form.phone),
      province: form.province,
      ward: form.ward.trim(),
      streetAddress: form.streetAddress.trim(),
    };
    setSaving(true);
    try {
      const saved = registration
        ? await partnerRestaurantApi.updateBasic(registration.id, payload)
        : await partnerRestaurantApi.create(payload);
      onSaved(saved, 2);
    } catch (error) {
      setErrors(getFieldErrors(error));
      setServerError(getErrorMessage(error, 'Không lưu được thông tin, vui lòng thử lại.'));
      setSaving(false);
    }
  };

  const preview = buildRestaurantName(form.brandName, form.specialty, form.areaName);

  return (
    <form className="step-card" onSubmit={handleSubmit} noValidate>
      <h2 className="step-card__title">Thông tin quán cơ bản</h2>
      {serverError && <Alert type="error">{serverError}</Alert>}

      <FormRow label="Tên quán" htmlFor="brandName" required error={errors.brandName || errors.specialty || errors.areaName}>
        <div className="name-parts">
          <input {...bind('brandName')} placeholder="Tên quán" maxLength={60} />
          <span className="name-parts__dash">-</span>
          <input {...bind('specialty')} placeholder="Món đặc trưng" maxLength={60} />
          <span className="name-parts__dash">-</span>
          <input {...bind('areaName')} placeholder="Tên đường / khu vực" maxLength={60} />
        </div>
        <div className="tip">
          <Icon name="alert" size={16} />
          <span>
            Tên quán nên được đặt theo thứ tự: Tên quán, món đặc trưng của quán và tên đường. Ví dụ:{' '}
            <em>Bếp Nhà Bình - Cơm gà - Lê Lợi</em>
          </span>
        </div>
        {preview && (
          <p className="name-preview">
            Tên hiển thị: <strong>{preview}</strong>
          </p>
        )}
      </FormRow>

      <FormRow label="Số điện thoại liên hệ" htmlFor="phone" required error={errors.phone}>
        <input {...bind('phone')} type="tel" placeholder="Ví dụ: 0901234567" />
      </FormRow>

      <FormRow label="Tỉnh/Thành phố" htmlFor="province" required error={errors.province}>
        <select {...bind('province')}>
          <option value="">-- Chọn tỉnh/thành phố --</option>
          {provinces.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </select>
      </FormRow>

      <FormRow
        label="Phường/Xã"
        htmlFor="ward"
        required
        hint="Theo địa giới hành chính mới (2 cấp, từ 01/07/2025)"
        error={errors.ward}
      >
        <input {...bind('ward')} placeholder="Ví dụ: Phường Sài Gòn" maxLength={100} />
      </FormRow>

      <FormRow label="Số nhà và Đường/Phố" htmlFor="streetAddress" required error={errors.streetAddress}>
        <input {...bind('streetAddress')} placeholder="Ví dụ: 20 Lê Lợi" maxLength={255} />
      </FormRow>

      <div className="step-card__footer">
        <span />
        <button type="submit" className="btn btn--primary btn--lg" disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu & tiếp tục'}
        </button>
      </div>
    </form>
  );
}
