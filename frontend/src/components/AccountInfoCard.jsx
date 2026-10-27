import { ROLE_LABEL, initialsOf } from '../utils/roleUtils.js';

export default function AccountInfoCard({ user }) {
  const rows = [
    { label: 'Họ và tên', value: user.fullName },
    { label: 'Email', value: user.email },
    { label: 'Số điện thoại', value: user.phone },
    { label: 'Vai trò', value: ROLE_LABEL[user.role] },
  ];

  return (
    <section className="account-card">
      <div className="account-card__head">
        <span className="avatar avatar--xl">{initialsOf(user.fullName)}</span>
        <div className="account-card__title">
          <strong>Thông tin tài khoản</strong>
          <span className="muted">Bạn đang đăng nhập bằng tài khoản này</span>
        </div>
      </div>
      <dl className="account-card__list">
        {rows.map((row) => (
          <div key={row.label} className="account-card__row">
            <dt>{row.label}</dt>
            <dd>{row.value || '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
