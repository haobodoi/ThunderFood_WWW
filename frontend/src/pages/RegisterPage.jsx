import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage, getFieldErrors } from '../api/baseApi.js';
import { ROLES } from '../utils/roleUtils.js';
import TextField from '../components/TextField.jsx';
import Alert from '../components/Alert.jsx';
import Icon from '../components/Icon.jsx';

const PHONE_REGEX = /^0\d{9}$/;
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const INITIAL_FORM = {
  accountType: ROLES.CUSTOMER,
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

const ACCOUNT_TYPES = [
  {
    value: ROLES.CUSTOMER,
    icon: 'user',
    title: 'Khách hàng',
    description: 'Tìm món, đặt hàng và theo dõi đơn',
  },
  {
    value: ROLES.RESTAURANT_PARTNER,
    icon: 'store',
    title: 'Đối tác nhà hàng',
    description: 'Đưa nhà hàng của bạn lên ThunderFood',
  },
];

const normalizePhone = (value) => value.replace(/[\s.\-()]/g, '');

function validate(form) {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = 'Vui lòng nhập họ tên';
  else if (form.fullName.trim().length > 120) errors.fullName = 'Họ tên tối đa 120 ký tự';

  if (!form.email.trim()) errors.email = 'Vui lòng nhập email';
  else if (!EMAIL_REGEX.test(form.email.trim())) errors.email = 'Email không hợp lệ';

  const phone = normalizePhone(form.phone);
  if (!phone) errors.phone = 'Vui lòng nhập số điện thoại';
  else if (!PHONE_REGEX.test(phone)) errors.phone = 'Số điện thoại gồm 10 chữ số và bắt đầu bằng 0';

  if (!form.password) errors.password = 'Vui lòng nhập mật khẩu';
  else if (form.password.length < 6 || form.password.length > 64) errors.password = 'Mật khẩu phải từ 6 đến 64 ký tự';

  if (!form.confirmPassword) errors.confirmPassword = 'Vui lòng nhập lại mật khẩu';
  else if (form.confirmPassword !== form.password) errors.confirmPassword = 'Mật khẩu nhập lại không khớp';

  return errors;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isPartner = form.accountType === ROLES.RESTAURANT_PARTNER;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const chooseType = (accountType) => {
    setForm((prev) => ({ ...prev, accountType }));
    setServerError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      accountType: form.accountType,
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: normalizePhone(form.phone),
      password: form.password,
      confirmPassword: form.confirmPassword,
    };

    setSubmitting(true);
    try {
      await register(payload);
      navigate('/login', {
        replace: true,
        state: { registered: true, identifier: payload.email, accountType: payload.accountType },
      });
    } catch (error) {
      setErrors(getFieldErrors(error));
      setServerError(getErrorMessage(error, 'Đăng ký thất bại, vui lòng thử lại.'));
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <div className="auth-card__head">
          <h1>Tạo tài khoản</h1>
          <p>Chọn loại tài khoản phù hợp với bạn.</p>
        </div>

        <div className="type-picker" role="radiogroup" aria-label="Loại tài khoản">
          {ACCOUNT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              role="radio"
              aria-checked={form.accountType === type.value}
              className={`type-picker__option ${form.accountType === type.value ? 'is-active' : ''}`}
              onClick={() => chooseType(type.value)}
            >
              <span className="type-picker__icon">
                <Icon name={type.icon} size={20} />
              </span>
              <span>
                <strong>{type.title}</strong>
                <small>{type.description}</small>
              </span>
            </button>
          ))}
        </div>

        {serverError && <Alert type="error">{serverError}</Alert>}

        <form className="form" onSubmit={handleSubmit} noValidate>
          <h2 className="form__section">Thông tin tài khoản</h2>
          <TextField
            label="Họ và tên"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            error={errors.fullName}
            placeholder="Nguyễn Văn A"
            autoComplete="name"
          />
          <div className="form__row">
            <TextField
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="ban@email.com"
              autoComplete="email"
            />
            <TextField
              label="Số điện thoại"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              error={errors.phone}
              placeholder="0901234567"
              autoComplete="tel"
            />
          </div>
          <div className="form__row">
            <TextField
              label="Mật khẩu"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              hint="Từ 6 đến 64 ký tự"
              autoComplete="new-password"
            />
            <TextField
              label="Nhập lại mật khẩu"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />
          </div>

          {isPartner && (
            <Alert type="info" title="Đăng ký quán sau khi tạo tài khoản">
              Sau khi đăng nhập, vào Kênh đối tác và chọn &quot;Đăng ký quán mới&quot; để điền thông tin quán, người
              đại diện, tài khoản ngân hàng và gửi duyệt.
            </Alert>
          )}

          <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={submitting}>
            {submitting ? 'Đang tạo tài khoản...' : isPartner ? 'Đăng ký đối tác' : 'Đăng ký'}
          </button>
        </form>

        <p className="auth-card__switch">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
