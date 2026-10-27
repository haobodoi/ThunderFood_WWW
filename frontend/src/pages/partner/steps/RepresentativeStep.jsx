import { useState } from 'react';
import { partnerRestaurantApi } from '../../../api/partnerRestaurantApi.js';
import { getErrorMessage, getFieldErrors } from '../../../api/baseApi.js';
import {
  BUSINESS_TYPES,
  EMAIL_REGEX,
  ID_NUMBER_REGEX,
  PHONE_REGEX,
  TAX_CODE_REGEX,
  normalizePhone,
} from '../../../utils/restaurantUtils.js';
import FormRow from '../../../components/FormRow.jsx';
import ImageUpload from '../../../components/ImageUpload.jsx';
import Alert from '../../../components/Alert.jsx';

const today = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};

function validate(form) {
  const errors = {};
  const business = form.businessType !== 'INDIVIDUAL';
  if (business) {
    if (!form.businessName.trim()) errors.businessName = 'Vui lòng nhập tên hộ kinh doanh/doanh nghiệp';
    if (!form.taxCode.trim()) errors.taxCode = 'Vui lòng nhập mã số thuế';
    else if (!TAX_CODE_REGEX.test(form.taxCode.trim())) errors.taxCode = 'Mã số thuế gồm 10 số (hoặc 10 số kèm -3 số chi nhánh)';
    if (!form.businessLicenseImage) errors.businessLicenseImage = 'Vui lòng tải ảnh giấy phép kinh doanh';
  }
  if (!form.repFullName.trim()) errors.repFullName = 'Vui lòng nhập họ tên người đại diện';
  if (!form.repEmail.trim()) errors.repEmail = 'Vui lòng nhập email';
  else if (!EMAIL_REGEX.test(form.repEmail.trim())) errors.repEmail = 'Email không hợp lệ';
  const phone = normalizePhone(form.repPhone);
  if (!phone) errors.repPhone = 'Vui lòng nhập số điện thoại';
  else if (!PHONE_REGEX.test(phone)) errors.repPhone = 'Số điện thoại gồm 10 chữ số và bắt đầu bằng 0';
  const alt = normalizePhone(form.repPhoneAlt);
  if (alt && !PHONE_REGEX.test(alt)) errors.repPhoneAlt = 'Số điện thoại gồm 10 chữ số và bắt đầu bằng 0';
  if (!form.idNumber.trim()) errors.idNumber = 'Vui lòng nhập số CMND/CCCD/Hộ chiếu';
  else if (!ID_NUMBER_REGEX.test(form.idNumber.trim())) {
    errors.idNumber = 'CMND gồm 9 số, CCCD gồm 12 số, hộ chiếu gồm 1 chữ cái và 7 số';
  }
  if (!form.idIssuedDate) errors.idIssuedDate = 'Vui lòng chọn ngày cấp';
  else if (form.idIssuedDate > today()) errors.idIssuedDate = 'Ngày cấp không được ở tương lai';
  if (!form.idIssuedPlace.trim()) errors.idIssuedPlace = 'Vui lòng nhập nơi cấp';
  if (!form.idFrontImage) errors.idFrontImage = 'Vui lòng tải ảnh mặt trước';
  if (!form.idBackImage) errors.idBackImage = 'Vui lòng tải ảnh mặt sau';
  return errors;
}

export default function RepresentativeStep({ registration, user, onSaved, onBack }) {
  const rep = registration.representative;
  const [form, setForm] = useState({
    businessType: rep.businessType ?? 'INDIVIDUAL',
    businessName: rep.businessName ?? '',
    taxCode: rep.taxCode ?? '',
    businessLicenseImage: rep.businessLicenseImage ?? '',
    repFullName: rep.repFullName ?? user.fullName ?? '',
    repEmail: rep.repEmail ?? user.email ?? '',
    repPhone: rep.repPhone ?? user.phone ?? '',
    repPhoneAlt: rep.repPhoneAlt ?? '',
    idNumber: rep.idNumber ?? '',
    idIssuedDate: rep.idIssuedDate ?? '',
    idIssuedPlace: rep.idIssuedPlace ?? '',
    idFrontImage: rep.idFrontImage ?? '',
    idBackImage: rep.idBackImage ?? '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const isBusiness = form.businessType !== 'INDIVIDUAL';

  const setValue = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const bind = (name) => ({
    id: name,
    name,
    value: form[name],
    onChange: (e) => setValue(name, e.target.value),
    className: 'field__input',
    'aria-invalid': Boolean(errors[name]),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = {
      businessType: form.businessType,
      businessName: isBusiness ? form.businessName.trim() : null,
      taxCode: isBusiness ? form.taxCode.trim() : null,
      businessLicenseImage: isBusiness ? form.businessLicenseImage : null,
      repFullName: form.repFullName.trim(),
      repEmail: form.repEmail.trim().toLowerCase(),
      repPhone: normalizePhone(form.repPhone),
      repPhoneAlt: normalizePhone(form.repPhoneAlt),
      idNumber: form.idNumber.trim().toUpperCase(),
      idIssuedDate: form.idIssuedDate,
      idIssuedPlace: form.idIssuedPlace.trim(),
      idFrontImage: form.idFrontImage,
      idBackImage: form.idBackImage,
    };
    setSaving(true);
    try {
      onSaved(await partnerRestaurantApi.updateRepresentative(registration.id, payload), 3);
    } catch (error) {
      setErrors(getFieldErrors(error));
      setServerError(getErrorMessage(error, 'Không lưu được thông tin, vui lòng thử lại.'));
      setSaving(false);
    }
  };

  return (
    <form className="step-card" onSubmit={handleSubmit} noValidate>
      <h2 className="step-card__title">Thông tin người đại diện</h2>
      <p className="step-card__subtitle">Vui lòng điền đúng thông tin theo giấy tờ tùy thân / giấy phép kinh doanh.</p>
      {serverError && <Alert type="error">{serverError}</Alert>}

      <FormRow label="Đăng ký dưới danh nghĩa" required>
        <div className="segmented" role="radiogroup" aria-label="Đăng ký dưới danh nghĩa">
          {BUSINESS_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              role="radio"
              aria-checked={form.businessType === type.value}
              className={`segmented__option ${form.businessType === type.value ? 'is-active' : ''}`}
              onClick={() => setValue('businessType', type.value)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </FormRow>

      {isBusiness && (
        <>
          <FormRow
            label={form.businessType === 'HOUSEHOLD' ? 'Tên hộ kinh doanh' : 'Tên doanh nghiệp'}
            htmlFor="businessName"
            required
            error={errors.businessName}
          >
            <input {...bind('businessName')} maxLength={200} placeholder="Theo giấy chứng nhận đăng ký kinh doanh" />
          </FormRow>
          <FormRow label="Mã số thuế" htmlFor="taxCode" required error={errors.taxCode}>
            <input {...bind('taxCode')} placeholder="Ví dụ: 0312345678" />
          </FormRow>
          <FormRow label="Giấy phép kinh doanh" required hint="Ảnh chụp rõ nét, tối đa 1MB" error={errors.businessLicenseImage}>
            <ImageUpload
              kind="BUSINESS_LICENSE"
              value={form.businessLicenseImage}
              onChange={(url) => setValue('businessLicenseImage', url)}
            />
          </FormRow>
        </>
      )}

      <FormRow
        label="Tên đầy đủ người đại diện"
        htmlFor="repFullName"
        required
        hint="Tên của người đăng ký phải trùng với tên chủ tài khoản ngân hàng nhận thanh toán doanh thu"
        error={errors.repFullName}
      >
        <input {...bind('repFullName')} maxLength={120} placeholder="Nguyễn Văn A" />
      </FormRow>

      <FormRow label="Email" htmlFor="repEmail" required hint="Nhập email nhận báo cáo doanh thu" error={errors.repEmail}>
        <input {...bind('repEmail')} type="email" placeholder="ban@email.com" />
      </FormRow>

      <FormRow label="Số điện thoại" htmlFor="repPhone" required hint="Nhập SĐT đăng ký thanh toán tự động" error={errors.repPhone}>
        <input {...bind('repPhone')} type="tel" placeholder="0901234567" />
      </FormRow>

      <FormRow label="Số điện thoại khác" htmlFor="repPhoneAlt" error={errors.repPhoneAlt}>
        <input {...bind('repPhoneAlt')} type="tel" placeholder="Không bắt buộc" />
      </FormRow>

      <FormRow label="Số CMND/CCCD/Hộ chiếu" htmlFor="idNumber" required error={errors.idNumber}>
        <input {...bind('idNumber')} placeholder="CCCD gồm 12 số" />
      </FormRow>

      <FormRow label="Ngày cấp" htmlFor="idIssuedDate" required error={errors.idIssuedDate}>
        <input {...bind('idIssuedDate')} type="date" max={today()} />
      </FormRow>

      <FormRow label="Nơi cấp" htmlFor="idIssuedPlace" required error={errors.idIssuedPlace}>
        <input {...bind('idIssuedPlace')} maxLength={150} placeholder="Ví dụ: Cục Cảnh sát QLHC về TTXH" />
      </FormRow>

      <FormRow
        label="Ảnh chụp CMND/CCCD/Hộ chiếu"
        required
        hint="Chỉ quản trị viên và bạn xem được ảnh này"
        error={errors.idFrontImage || errors.idBackImage}
      >
        <div className="upload-pair">
          <ImageUpload kind="ID_FRONT" caption="Mặt trước" value={form.idFrontImage} onChange={(url) => setValue('idFrontImage', url)} />
          <ImageUpload kind="ID_BACK" caption="Mặt sau" value={form.idBackImage} onChange={(url) => setValue('idBackImage', url)} />
        </div>
      </FormRow>

      <div className="step-card__footer">
        <button type="button" className="btn btn--outline btn--lg" onClick={onBack}>
          Quay lại
        </button>
        <button type="submit" className="btn btn--primary btn--lg" disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu & tiếp tục'}
        </button>
      </div>
    </form>
  );
}
