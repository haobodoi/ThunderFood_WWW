import { useState } from 'react';
import { partnerRestaurantApi } from '../../../api/partnerRestaurantApi.js';
import { getErrorMessage, getFieldErrors } from '../../../api/baseApi.js';
import { MAX_CUISINES, MAX_SERVICE_TYPES, fieldErrorsFor } from '../../../utils/restaurantUtils.js';
import FormRow from '../../../components/FormRow.jsx';
import ImageUpload from '../../../components/ImageUpload.jsx';
import ChipSelect from '../../../components/ChipSelect.jsx';
import OpeningHoursEditor, {
  hoursToSchedule,
  scheduleToHours,
  validateSchedule,
} from '../../../components/OpeningHoursEditor.jsx';
import Alert from '../../../components/Alert.jsx';

export default function DetailsStep({ registration, options, onSaved, onBack }) {
  const details = registration.details;
  const [schedule, setSchedule] = useState(() => hoursToSchedule(details.openingHours));
  const [form, setForm] = useState({
    serviceTypeIds: details.serviceTypeIds ?? [],
    cuisineIds: details.cuisineIds ?? [],
    avatarImage: details.avatarImage ?? '',
    coverImage: details.coverImage ?? '',
    description: details.description ?? '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const setValue = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const next = {};
    const hoursError = validateSchedule(schedule);
    if (hoursError) next.openingHours = hoursError;
    if (form.serviceTypeIds.length === 0) next.serviceTypeIds = 'Vui lòng chọn loại hình dịch vụ';
    if (form.cuisineIds.length === 0) next.cuisineIds = 'Vui lòng chọn ẩm thực';
    if (!form.avatarImage) next.avatarImage = 'Vui lòng tải ảnh đại diện quán';
    if (!form.coverImage) next.coverImage = 'Vui lòng tải ảnh mặt tiền quán';
    if (form.description.length > 1000) next.description = 'Mô tả tối đa 1000 ký tự';
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = {
      openingHours: scheduleToHours(schedule),
      serviceTypeIds: form.serviceTypeIds,
      cuisineIds: form.cuisineIds,
      avatarImage: form.avatarImage,
      coverImage: form.coverImage,
      description: form.description.trim(),
    };
    setSaving(true);
    try {
      onSaved(await partnerRestaurantApi.updateDetails(registration.id, payload), 5);
    } catch (error) {
      setErrors(fieldErrorsFor(getFieldErrors(error), ['openingHours']));
      setServerError(getErrorMessage(error, 'Không lưu được thông tin, vui lòng thử lại.'));
      setSaving(false);
    }
  };

  return (
    <form className="step-card" onSubmit={handleSubmit} noValidate>
      <h2 className="step-card__title">Thông tin quán - Chi tiết</h2>
      {serverError && <Alert type="error">{serverError}</Alert>}

      <FormRow label="Thời gian mở cửa" required hint="Tối đa 3 khung giờ mỗi ngày" error={errors.openingHours}>
        <OpeningHoursEditor
          value={schedule}
          onChange={(next) => {
            setSchedule(next);
            setErrors((prev) => ({ ...prev, openingHours: undefined }));
          }}
        />
      </FormRow>

      <FormRow label="Ảnh đại diện quán" required hint="Logo hoặc món đặc trưng, tối đa 1MB" error={errors.avatarImage}>
        <ImageUpload kind="AVATAR" value={form.avatarImage} onChange={(url) => setValue('avatarImage', url)} />
      </FormRow>

      <FormRow label="Ảnh mặt tiền quán" required hint="Thấy rõ biển hiệu, tối đa 1MB" error={errors.coverImage}>
        <ImageUpload kind="COVER" wide value={form.coverImage} onChange={(url) => setValue('coverImage', url)} />
      </FormRow>

      <FormRow label="Loại hình dịch vụ" required hint={`Tối đa ${MAX_SERVICE_TYPES}`} error={errors.serviceTypeIds}>
        <ChipSelect
          name="Loại hình dịch vụ"
          options={options?.serviceTypes ?? []}
          value={form.serviceTypeIds}
          max={MAX_SERVICE_TYPES}
          onChange={(value) => setValue('serviceTypeIds', value)}
        />
      </FormRow>

      <FormRow label="Ẩm thực" required hint={`Tối đa ${MAX_CUISINES}`} error={errors.cuisineIds}>
        <ChipSelect
          name="Ẩm thực"
          options={options?.cuisines ?? []}
          value={form.cuisineIds}
          max={MAX_CUISINES}
          onChange={(value) => setValue('cuisineIds', value)}
        />
      </FormRow>

      <FormRow label="Mô tả quán" htmlFor="description" error={errors.description}>
        <textarea
          id="description"
          className="field__input field__textarea"
          rows={4}
          maxLength={1000}
          value={form.description}
          onChange={(e) => setValue('description', e.target.value)}
          placeholder="Giới thiệu ngắn về quán, món ngon, ưu đãi..."
        />
        <span className="char-count">{form.description.length}/1000</span>
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
