import { useState } from 'react';
import { partnerRestaurantApi } from '../../../api/partnerRestaurantApi.js';
import { getErrorMessage, getFieldErrors } from '../../../api/baseApi.js';
import { BANKS } from '../../../utils/bankUtils.js';
import { BANK_ACCOUNT_REGEX, foldName } from '../../../utils/restaurantUtils.js';
import FormRow from '../../../components/FormRow.jsx';
import Alert from '../../../components/Alert.jsx';

export default function BankStep({ registration, onSaved, onBack }) {
  const { bank, representative: rep } = registration;
  const isBusiness = rep.businessType && rep.businessType !== 'INDIVIDUAL';
  const suggestedHolder = foldName(rep.repFullName || '');
  const [form, setForm] = useState({
    bankName: bank.bankName ?? '',
    bankBranch: bank.bankBranch ?? '',
    bankAccountNumber: bank.bankAccountNumber ?? '',
    bankAccountHolder: bank.bankAccountHolder ?? suggestedHolder,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const bankOptions = form.bankName && !BANKS.includes(form.bankName) ? [form.bankName, ...BANKS] : BANKS;

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

  const validate = () => {
    const next = {};
    if (!form.bankName) next.bankName = 'Vui lòng chọn ngân hàng';
    if (!form.bankAccountNumber.trim()) next.bankAccountNumber = 'Vui lòng nhập số tài khoản';
    else if (!BANK_ACCOUNT_REGEX.test(form.bankAccountNumber.trim())) next.bankAccountNumber = 'Số tài khoản gồm 6–20 chữ số';
    const holder = foldName(form.bankAccountHolder);
    if (!holder) next.bankAccountHolder = 'Vui lòng nhập tên chủ tài khoản';
    else if (holder !== suggestedHolder && !(isBusiness && holder === foldName(rep.businessName || ''))) {
      next.bankAccountHolder = isBusiness
        ? 'Tên chủ tài khoản phải trùng với tên người đại diện hoặc tên hộ kinh doanh/doanh nghiệp'
        : 'Tên chủ tài khoản phải trùng với tên người đại diện';
    }
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = {
      bankName: form.bankName,
      bankBranch: form.bankBranch.trim(),
      bankAccountNumber: form.bankAccountNumber.trim(),
      bankAccountHolder: foldName(form.bankAccountHolder),
    };
    setSaving(true);
    try {
      onSaved(await partnerRestaurantApi.updateBank(registration.id, payload), 4);
    } catch (error) {
      setErrors(getFieldErrors(error));
      setServerError(getErrorMessage(error, 'Không lưu được thông tin, vui lòng thử lại.'));
      setSaving(false);
    }
  };

  return (
    <form className="step-card" onSubmit={handleSubmit} noValidate>
      <h2 className="step-card__title">Thông tin ngân hàng</h2>
      <p className="step-card__subtitle">Tài khoản nhận thanh toán doanh thu từ ThunderFood.</p>
      {serverError && <Alert type="error">{serverError}</Alert>}

      <FormRow label="Ngân hàng" htmlFor="bankName" required error={errors.bankName}>
        <select {...bind('bankName')}>
          <option value="">-- Chọn ngân hàng --</option>
          {bankOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </FormRow>

      <FormRow label="Chi nhánh" htmlFor="bankBranch" error={errors.bankBranch}>
        <input {...bind('bankBranch')} maxLength={120} placeholder="Không bắt buộc" />
      </FormRow>

      <FormRow label="Số tài khoản" htmlFor="bankAccountNumber" required error={errors.bankAccountNumber}>
        <input {...bind('bankAccountNumber')} inputMode="numeric" placeholder="Chỉ gồm chữ số" />
      </FormRow>

      <FormRow
        label="Tên chủ tài khoản"
        htmlFor="bankAccountHolder"
        required
        hint="Viết in hoa không dấu, trùng với tên người đại diện"
        error={errors.bankAccountHolder}
      >
        <input
          {...bind('bankAccountHolder')}
          onBlur={() => setForm((prev) => ({ ...prev, bankAccountHolder: foldName(prev.bankAccountHolder) }))}
          maxLength={120}
          placeholder={suggestedHolder || 'NGUYEN VAN A'}
        />
        {suggestedHolder && form.bankAccountHolder !== suggestedHolder && (
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setForm((prev) => ({ ...prev, bankAccountHolder: suggestedHolder }));
              setErrors((prev) => ({ ...prev, bankAccountHolder: undefined }));
            }}
          >
            Dùng tên người đại diện: {suggestedHolder}
          </button>
        )}
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
