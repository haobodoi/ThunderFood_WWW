import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../api/baseApi.js';
import TextField from '../components/TextField.jsx';
import Alert from '../components/Alert.jsx';

const DEMO_ACCOUNTS = [
  { label: 'Quản trị viên', identifier: 'admin@thunderfood.vn' },
  { label: 'Đối tác nhà hàng', identifier: 'partner@example.com' }, // taste-skill-ignore: exact seeded demo account.
  { label: 'Khách hàng', identifier: 'customer@example.com' }, // taste-skill-ignore: exact seeded demo account.
  { label: 'Khách bị khóa', identifier: 'customer.locked@example.com' }, // taste-skill-ignore: exact seeded demo account.
];

export default function LoginPage() {
  const { login } = useAuth();
  const location = useLocation();
  const registered = location.state?.registered;
  const registeredAs = location.state?.accountType;

  const [identifier, setIdentifier] = useState(location.state?.identifier ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next = {};
    if (!identifier.trim()) next.identifier = 'Vui lòng nhập email hoặc số điện thoại';
    if (!password) next.password = 'Vui lòng nhập mật khẩu';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      await login(identifier.trim(), password);
    } catch (error) {
      setServerError(getErrorMessage(error, 'Đăng nhập thất bại, vui lòng thử lại.'));
      setPassword('');
      setSubmitting(false);
    }
  };

  const fillDemo = (value) => {
    setIdentifier(value);
    setPassword('123456');
    setErrors({});
    setServerError('');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__head">
          <h1>Đăng nhập</h1>
          <p>Dùng email hoặc số điện thoại đã đăng ký.</p>
        </div>

        {registered && (
          <Alert type="success" title="Đăng ký thành công!">
            {registeredAs === 'RESTAURANT_PARTNER'
              ? 'Hãy đăng nhập để bắt đầu đăng ký quán của bạn.'
              : 'Hãy đăng nhập để khám phá thực đơn.'}
          </Alert>
        )}
        {serverError && <Alert type="error">{serverError}</Alert>}

        <form className="form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Email hoặc số điện thoại"
            name="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            error={errors.identifier}
            placeholder="vd: ban@email.com hoặc 0901234567"
            autoComplete="username"
            autoFocus={!identifier}
          />
          <TextField
            label="Mật khẩu"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
            autoFocus={Boolean(identifier)}
          />
          <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={submitting}>
            {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="auth-card__switch">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </p>

        {import.meta.env.DEV && (
          <div className="demo-box">
            <span className="demo-box__title">Tài khoản demo (mật khẩu 123456)</span>
            <div className="demo-box__list">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.identifier}
                  type="button"
                  className="demo-box__item"
                  onClick={() => fillDemo(account.identifier)}
                >
                  {account.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
